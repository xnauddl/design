/* ============================================================
   extract.ts — 선택 노드에서 원시 토큰 수집·중복 제거 (bottom-up)
   ============================================================ */
import { t } from './i18n';
import { VECTOR_TYPES, hasImageFill } from './nodePaint';
import {
  DraftToken,
  SourceField,
  TokenCategory,
  Unit,
  rgbToHex,
  colorTokenName,
  numberTokenName,
} from './tokens';

interface Accumulator {
  map: Map<string, DraftToken>;
  warnings: Set<string>;
  /**
   * 지나친 이유. 성공한 추출에서는 말하지 않는다 — 매번 뜨는 경고가 성가셔서 걷어냈다(114393d).
   * 다만 한 개도 못 뽑았을 때는 이야기가 다르다: 아무 말이 없으면 버튼이 고장 난 것처럼 보인다.
   * 그래서 모으기만 하고, 결과가 빈 경우에만 extractFromSelection이 warnings로 올린다.
   */
  skipped: Set<string>;
  /**
   * 토큰 키 → 마지막으로 집계한 노드 id. walk가 한 노드를 끝까지 처리한 뒤 자식으로 내려가므로,
   * 같은 노드에서 온 연속 add는 이 비교로 걸러진다(padding 4방향이 count 4가 되지 않게).
   */
  lastNode: Map<string, string>;
}

/* 결과가 비었을 때만 쓰는 스킵 사유 — 왜 아무것도 안 나왔는지, 무엇을 바꾸면 되는지까지 말한다. */
const SKIP_HIDDEN = t('extract.skipHidden');
const SKIP_INSTANCE = t('extract.skipInstance');
const SKIP_GRADIENT = t('extract.skipGradient');

const round = (n: number, p = 2) => Math.round(n * 10 ** p) / 10 ** p;

const SKIP_FRACTION = t('extract.skipFraction');
/**
 * 척도 값인가 — 변수는 소수점을 갖지 않는다: 폰트 크기·간격·반경·행간·자간·그림자 수치는 정수,
 * 선 두께도 예외 없이 정수(2026-11-04 사용자 결정 — 예전 0.5 단위 허용을 없앰, §2.11). 불투명도(0~1)는 본질이 소수라 이 규칙 밖(collectOpacity).
 * 26.67·13.33·58.29 같은 값은 그룹 스케일(×1.333)이 남긴 잔값이지 디자이너가 정한 척도가 아니다.
 * (크기 size도 같은 규칙 — addSize의 Number.isInteger. 크기는 아이콘 · 아바타 레이어에서만 뽑는다 — isIconOrAvatar.) 토큰으로 만들면 변수 목록이
 * `font-size/26_67`로 지저분해지고, 바인딩은 허용오차로 근처 정수에 붙여 디자인을 바꾼다.
 */
function onScale(acc: Accumulator, v: number, step = 1): boolean {
  const ok = Math.abs(v / step - Math.round(v / step)) < 1e-6;
  if (!ok) acc.skipped.add(SKIP_FRACTION);
  return ok;
}

function keyOf(category: TokenCategory, value: string | number, unit?: Unit): string {
  return `${category}|${value}|${unit ?? ''}`;
}

function add(
  acc: Accumulator,
  token: Omit<DraftToken, 'sources'>,
  source: SourceField,
  nodeId: string,
): void {
  const k = keyOf(token.category, token.value, token.unit);
  const existing = acc.map.get(k);
  if (existing) {
    if (!existing.sources.includes(source)) existing.sources.push(source);
    if (acc.lastNode.get(k) !== nodeId) existing.count = (existing.count ?? 1) + 1;
  } else {
    acc.map.set(k, { ...token, sources: [source], count: 1 });
  }
  acc.lastNode.set(k, nodeId);
}

/* ---------- paint ---------- */
function collectPaints(
  acc: Accumulator,
  node: SceneNode,
  paints: readonly Paint[] | typeof figma.mixed,
  source: 'fill' | 'stroke',
): void {
  const nodeId = node.id;
  if (paints === figma.mixed || !Array.isArray(paints)) return;
  for (const p of paints) {
    if (p.visible === false) continue;
    if (p.type !== 'SOLID') {
      acc.skipped.add(SKIP_GRADIENT); // GRADIENT / IMAGE / VIDEO — 변수 바인딩 불가, 조용히 스킵
      continue;
    }
    const hex = rgbToHex(p.color);
    add(acc, { name: colorTokenName(hex), category: 'color', value: hex }, source, nodeId);
    // 페인트 불투명도(p.opacity)는 토큰화하지 않는다 — Figma에는 페인트 opacity에 붙는 변수가 없다
    // (OPACITY 스코프는 **레이어** 불투명도 전용, collectOpacity가 따로 모은다). 만들어 봐야
    // 어디에도 연결되지 않는 `opacity/0.08` 변수만 남았다. 반투명 색 자체는 bind가 건너뛴다(bind.ts).
  }
}

/* ---------- typography ---------- */
function collectText(acc: Accumulator, node: TextNode): void {
  if (node.fontSize !== figma.mixed) {
    const v = round(node.fontSize);
    if (onScale(acc, v)) add(acc, { name: numberTokenName('font-size', v), category: 'fontSize', value: v }, 'fontSize', node.id);
  }
  if (node.fontName !== figma.mixed) {
    const fam = node.fontName.family;
    add(acc, { name: `font-family/${fam}`, category: 'fontFamily', value: fam }, 'fontFamily', node.id);
  }
  // 행간·자간은 **px로 직접 입력된 정수 값만** 변수 후보다. %는 변수로 만들지 않는다(A안, 2026-10-28):
  // Figma는 행간·자간 변수를 px로만 바인딩하므로 150%를 변수로 두려면 글자 크기마다 다른 px가
  // 필요하다 — `line-height/150 = 24`(16px 기준)는 28px 제목의 150%(42)와 안 맞아 한 번도
  // 바인딩되지 않았고, 2%×16 = 0.32 같은 소수만 남겼다. %는 텍스트 스타일이 보관한다
  // (Lightning은 비율, Atlassian은 폰트 스타일에 묶음 — 둘 다 px 행간 변수가 없다).
  if (node.lineHeight !== figma.mixed && node.lineHeight.unit === 'PIXELS') {
    const v = round(node.lineHeight.value);
    const unit: Unit = 'px';
    if (v > 0 && onScale(acc, v)) add(acc, { name: numberTokenName('line-height', v), category: 'lineHeight', value: v, unit }, 'lineHeight', node.id);
  }
  if (node.letterSpacing !== figma.mixed && node.letterSpacing.unit === 'PIXELS') {
    const v = round(node.letterSpacing.value);
    const unit: Unit = 'px';
    if (v !== 0 && onScale(acc, v)) add(acc, { name: numberTokenName('letter-spacing', v), category: 'letterSpacing', value: v, unit }, 'letterSpacing', node.id);
  }
}

/* ---------- auto-layout spacing/padding ---------- */
/**
 * 이 간격 필드를 피그마가 쓰지 않는가 — 만들기 추출 · 연결 찾기 · 연결 직전 다시 확인이 함께 쓰는 판정(§2.11).
 * - `'no-wrap'`: `counterAxisSpacing`인데 줄바꿈이 아니다(`layoutWrap !== 'WRAP'`). 피그마는 줄바꿈일 때만
 *   줄 사이 간격을 쓴다. 이 레이어에 없는 값이므로 건너뜀으로도 세지 않는다(그리드의 itemSpacing과 같다).
 * - `'space-between'`: 사이 간격 자동(Space between) — `itemSpacing`은 주 축 정렬
 *   `primaryAxisAlignItems === 'SPACE_BETWEEN'`, `counterAxisSpacing`은 줄 정렬 `counterAxisAlignContent === 'SPACE_BETWEEN'`.
 *   붙이면 피그마가 정렬을 MIN으로 바꿔 레이어가 바뀐다. 사유 "사이 간격 자동".
 * - `null`: 쓰는 값(뽑고 붙인다).
 * 줄바꿈 아님이 먼저다 — 줄바꿈이 아니면 줄 정렬도 쓰이지 않는다.
 */
export function gapSkip(node: unknown, field: string): 'no-wrap' | 'space-between' | null {
  const n = node as { primaryAxisAlignItems?: string; counterAxisAlignContent?: string; layoutWrap?: string };
  if (field === 'itemSpacing') return n.primaryAxisAlignItems === 'SPACE_BETWEEN' ? 'space-between' : null;
  if (field === 'counterAxisSpacing') {
    if (n.layoutWrap !== 'WRAP') return 'no-wrap';
    return n.counterAxisAlignContent === 'SPACE_BETWEEN' ? 'space-between' : null;
  }
  return null;
}

function collectSpacing(acc: Accumulator, node: FrameNode | ComponentNode | InstanceNode): void {
  if (node.layoutMode === 'NONE') return;
  const gaps: number[] = [node.paddingLeft, node.paddingRight, node.paddingTop, node.paddingBottom];
  if (node.layoutMode === 'GRID') {
    // 그리드 오토레이아웃의 간격은 gridRowGap/gridColumnGap — itemSpacing/counterAxisSpacing은
    // HORIZONTAL/VERTICAL 전용이라 그리드에서는 의미 있는 값을 주지 않는다.
    gaps.push(node.gridRowGap, node.gridColumnGap);
  } else {
    // 사이 간격 자동(Space between)이면 피그마가 간격을 계산한다 — 저장된 숫자는 화면 값이 아니라
    // 토큰으로 뽑으면 쓰레기(spacing/33·109…)가 된다(IA v3 §2.11, QA #3 불합격 1). padding은 그대로.
    if (!gapSkip(node, 'itemSpacing')) gaps.push(node.itemSpacing);
    // 줄 사이 간격 — 줄바꿈일 때만 쓰이고, 줄 정렬이 Space between이면 같은 이유로 뺀다.
    if (typeof node.counterAxisSpacing === 'number' && !gapSkip(node, 'counterAxisSpacing')) gaps.push(node.counterAxisSpacing);
  }
  for (const g of gaps) {
    if (typeof g === 'number' && g > 0) {
      const v = round(g);
      if (onScale(acc, v)) add(acc, { name: numberTokenName('spacing', v), category: 'gap', value: v }, 'gap', node.id);
    }
  }
}

/* ---------- size ---------- */


/**
 * 아이콘 자손 조건 — 자식들이 벡터 · ELLIPSE · RECTANGLE, 그것을 담은 GROUP · FRAME,
 * 안쪽이 같은 조건을 만족하는 INSTANCE뿐인가. 만족하면 보이는 벡터 수(중첩 안까지 합침), 아니면 -1.
 * 타입 조건과 TEXT · 이미지 탈락은 숨긴 자식까지 보고, 벡터 수만 숨긴 레이어 자신과 그 아래를 빼고 센다(§2.11).
 */
function iconVectorCount(children: readonly SceneNode[], visible = true): number {
  let vectors = 0;
  for (const c of children) {
    if (hasImageFill(c)) return -1;
    const shown = visible && c.visible !== false;
    if (VECTOR_TYPES.has(c.type)) {
      if (shown) vectors++;
      continue;
    }
    if (c.type === 'ELLIPSE' || c.type === 'RECTANGLE') continue;
    if (c.type === 'GROUP' || c.type === 'FRAME' || c.type === 'INSTANCE') {
      // 중첩 INSTANCE는 크기 조건을 보지 않고 안쪽 자식만 본다.
      const n = iconVectorCount('children' in c ? c.children : [], shown);
      if (n < 0) return -1;
      vectors += n;
      continue;
    }
    return -1; // TEXT · 그 밖의 타입
  }
  return vectors;
}

type SizeTarget = FrameNode | ComponentNode | InstanceNode;

/** 대상 타입(FRAME · COMPONENT · INSTANCE)이고 두 축을 소수 둘째 자리로 반올림해 정사각형 · 64 이하인가. */
function isSmallSquare(node: BaseNode): node is SizeTarget {
  if (node.type !== 'FRAME' && node.type !== 'COMPONENT' && node.type !== 'INSTANCE') return false;
  const w = round(node.width);
  return w > 0 && w === round(node.height) && w <= 64;
}

/** 아이콘 자체 조건(가장 바깥 틀 규칙은 빼고) — 조상 판정에 쓴다. */
function isIconSelf(node: SizeTarget): boolean {
  return !hasImageFill(node) && iconVectorCount('children' in node ? node.children : []) > 0;
}

/** 아바타 조건 — ① 둥근 모서리 ≥ 절반 + 루트 채움이나 두 단계 안의 보이는 레이어에 이미지 ② 같은 크기의 보이는 사진 ELLIPSE 자식. */
function isAvatarSelf(node: SizeTarget): boolean {
  const w = round(node.width);
  const r = (node as { cornerRadius?: number | typeof figma.mixed }).cornerRadius;
  let radii: number[] = [];
  if (r === figma.mixed) {
    for (const corner of ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius'] as const) {
      const cv = (node as unknown as Record<string, unknown>)[corner];
      radii.push(typeof cv === 'number' ? cv : 0);
    }
  } else if (typeof r === 'number') radii = [r];
  if (radii.length > 0 && radii.every((cv) => round(cv) >= w / 2)) {
    // 루트 채움은 루트가 숨었는지와 상관없이, 아래 레이어는 보이는 것만(§2.11 "숨김의 기준점").
    const imageWithin = (n: SceneNode, depth: number): boolean => {
      if (hasImageFill(n)) return true;
      if (depth >= 2 || !('children' in n)) return false;
      return n.children.some((c) => c.visible !== false && imageWithin(c, depth + 1));
    };
    if (imageWithin(node, 0)) return true;
  }
  const children: readonly SceneNode[] = 'children' in node ? node.children : [];
  return children.some(
    (c) =>
      c.visible !== false &&
      c.type === 'ELLIPSE' &&
      hasImageFill(c) &&
      Math.abs(c.width - node.width) <= 0.5 &&
      Math.abs(c.height - node.height) <= 0.5,
  );
}

/** 조상(페이지 바로 아래까지, 선택 밖 포함) 중 아이콘 틀이 있는가. GROUP 등 대상 타입이 아닌 조상은 건너뛴다. */
function hasIconAncestor(node: SceneNode): boolean {
  for (let p = node.parent; p && p.type !== 'PAGE' && p.type !== 'DOCUMENT'; p = p.parent) {
    if (isSmallSquare(p) && isIconSelf(p)) return true;
  }
  return false;
}

/**
 * 크기 변수를 만들고 붙이는 레이어인가 — 아이콘 · 아바타만(2026-11-06 사용자 결정, §2.11 "크기는 아이콘 · 아바타만").
 * 만들기 추출(collectSize) · 연결 찾기 · 연결 직전 다시 확인이 함께 쓴다.
 * - 대상: FRAME · COMPONENT · INSTANCE. 정사각형 · 64 이하(isSmallSquare).
 * - 아이콘(isIconSelf) 또는 아바타(isAvatarSelf).
 * - 가장 바깥 틀만: 조상에 아이콘 틀이 있으면 아니다(자기 자신이 통과할 때만 조상을 본다).
 * §4.7 "묶기"의 iconFrameKeyOf · isIconLike(상한 96)와는 따로다.
 */
export function isIconOrAvatar(node: SceneNode): node is SizeTarget {
  if (!isSmallSquare(node)) return false;
  if (!isIconSelf(node) && !isAvatarSelf(node)) return false;
  return !hasIconAncestor(node);
}

/**
 * 디자이너가 크기 방식(Fixed · Hug · Fill)을 고를 수 있었던 노드인가 — 오토레이아웃 맥락(자신 또는 부모)이고 절대 배치가 아님.
 * Figma에서 HUG는 오토레이아웃 프레임/텍스트에만, FILL은 오토레이아웃 자식에만 유효하므로, 자유 배치 프레임의
 * layoutSizing*는 **언제나 'FIXED'** 다. 절대 배치 자식도 흐름 밖이라 항상 FIXED다 — 둘 다 'Fixed를 선택했다'가 성립하지 않는다.
 * 만들기(collectSize)와 연결 찾기(bind.ts bindFrame)가 같이 쓴다.
 */
export function inAutoLayoutFlow(node: SizeTarget): boolean {
  if ('layoutPositioning' in node && node.layoutPositioning === 'ABSOLUTE') return false;
  const parent = node.parent;
  return node.layoutMode !== 'NONE' || (parent != null && 'layoutMode' in parent && (parent as FrameNode).layoutMode !== 'NONE');
}

function collectSize(acc: Accumulator, node: SceneNode): void {
  // 아이콘 · 아바타 레이어의 크기만 토큰 후보로(§2.11). 카드 · 화면 폭 같은 크기는 뽑지 않는다.
  if (!isIconOrAvatar(node)) return;
  if (!inAutoLayoutFlow(node)) return;
  // Fixed인 축만 토큰화 — HUG/FILL은 계산된 동적 크기라 디자인 토큰이 아님.
  // 정수만 — 343.5처럼 자유 리사이즈로 남은 소수 값은 의도된 척도가 아님.
  const addSize = (v: number) => {
    const rv = round(v);
    if (rv > 0 && Number.isInteger(rv)) add(acc, { name: numberTokenName('size', rv), category: 'size', value: rv }, 'size', node.id);
  };
  if (node.layoutSizingHorizontal === 'FIXED') addSize(node.width);
  if (node.layoutSizingVertical === 'FIXED') addSize(node.height);
}

/* ---------- radius ---------- */
function collectRadius(acc: Accumulator, node: SceneNode): void {
  if (!('cornerRadius' in node)) return;
  const r = (node as { cornerRadius: number | typeof figma.mixed }).cornerRadius;
  const values: number[] = [];
  if (r === figma.mixed) {
    for (const corner of ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius'] as const) {
      const cv = (node as unknown as Record<string, unknown>)[corner];
      if (typeof cv === 'number') values.push(cv);
    }
  } else if (typeof r === 'number') {
    values.push(r);
  }
  for (const rv of values) {
    if (rv > 0) {
      const v = round(rv);
      if (onScale(acc, v)) add(acc, { name: numberTokenName('radius', v), category: 'radius', value: v }, 'radius', node.id);
    }
  }
}

/* ---------- stroke width (border) ---------- */
function collectStroke(acc: Accumulator, node: SceneNode): void {
  if (!('strokes' in node) || !('strokeWeight' in node)) return;
  const strokes = (node as { strokes: readonly Paint[] | typeof figma.mixed }).strokes;
  // 보이는 선이 있을 때만 두께를 토큰 후보로(선 없는 노드의 strokeWeight는 무의미).
  if (strokes === figma.mixed || !Array.isArray(strokes) || !strokes.some((p) => p.visible !== false)) return;
  const w = (node as { strokeWeight: number | typeof figma.mixed }).strokeWeight;
  const widths: number[] = [];
  if (w === figma.mixed) {
    for (const side of ['strokeTopWeight', 'strokeRightWeight', 'strokeBottomWeight', 'strokeLeftWeight'] as const) {
      const sv = (node as unknown as Record<string, unknown>)[side];
      if (typeof sv === 'number') widths.push(sv);
    }
  } else if (typeof w === 'number') {
    widths.push(w);
  }
  for (const wv of widths) {
    if (wv > 0) {
      const v = round(wv);
      if (onScale(acc, v)) add(acc, { name: numberTokenName('stroke-width', v), category: 'strokeWidth', value: v }, 'strokeWidth', node.id);
    }
  }
}

/* ---------- layer opacity ---------- */
function collectOpacity(acc: Accumulator, node: SceneNode): void {
  if (!('opacity' in node)) return;
  const o = (node as { opacity: number }).opacity;
  if (typeof o !== 'number' || o >= 1 || o <= 0) return; // 1(불투명)·0(숨김 동등)은 토큰화 안 함
  const v = round(o);
  add(acc, { name: numberTokenName('opacity', v), category: 'opacity', value: v }, 'opacity', node.id);
}

/* ---------- effects ---------- */
function collectEffects(acc: Accumulator, node: SceneNode): void {
  if (!('effects' in node)) return;
  for (const e of (node as { effects: readonly Effect[] }).effects) {
    if (e.visible === false) continue;
    if (e.type === 'DROP_SHADOW' || e.type === 'INNER_SHADOW') {
      const hex = rgbToHex(e.color);
      add(acc, { name: colorTokenName(hex), category: 'effectColor', value: hex }, 'effectColor', node.id);
      for (const [g, val] of [
        ['shadow-blur', e.radius],
        ['shadow-spread', e.spread ?? 0],
        ['shadow-x', e.offset.x],
        ['shadow-y', e.offset.y],
      ] as const) {
        const v = round(val);
        if (onScale(acc, v)) add(acc, { name: numberTokenName(g, v), category: 'effectFloat', value: v }, 'effectFloat', node.id);
      }
    } else if (e.type === 'LAYER_BLUR' || e.type === 'BACKGROUND_BLUR') {
      const v = round(e.radius);
      if (onScale(acc, v)) add(acc, { name: numberTokenName('blur', v), category: 'effectFloat', value: v }, 'effectFloat', node.id);
    }
  }
}

function walk(acc: Accumulator, node: SceneNode): void {
  // 숨긴 레이어는 화면에 없는 값이라 토큰 후보에서 제외(하위까지 통째로).
  if (node.visible === false) {
    acc.skipped.add(SKIP_HIDDEN);
    return;
  }
  if ('fills' in node) collectPaints(acc, node, node.fills, 'fill');
  if ('strokes' in node) collectPaints(acc, node, node.strokes, 'stroke');
  if (node.type === 'TEXT') collectText(acc, node);
  if (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE') {
    collectSpacing(acc, node);
  }
  collectSize(acc, node);
  collectRadius(acc, node);
  collectStroke(acc, node);
  collectOpacity(acc, node);
  collectEffects(acc, node);
  // 인스턴스 내부는 마스터의 복사본이라 디자이너가 이 화면에서 결정한 값이 아니다 —
  // 인스턴스 자체 속성(크기·채움·효과)만 읽고 하위로는 내려가지 않는다.
  if (node.type === 'INSTANCE') {
    if ('children' in node && node.children.length) acc.skipped.add(SKIP_INSTANCE);
    return;
  }
  if ('children' in node) for (const child of node.children) walk(acc, child);
}

export interface ExtractResult {
  tokens: DraftToken[];
  warnings: string[];
}

/**
 * 조상까지 실제로 보이는가. walk의 자체 visible 검사는 **선택 루트가 숨긴 그룹 안에 있는 경우**를
 * 못 거른다(루트 자신은 visible=true). 레이어 패널에서 숨긴 그룹의 자식을 직접 고르는 흔한 경우다.
 */
function isEffectivelyVisible(node: SceneNode): boolean {
  let p: BaseNode | null = node;
  while (p) {
    if ('visible' in p && (p as SceneNode).visible === false) return false;
    p = p.parent;
  }
  return true;
}

/** 현재 선택(자식 포함)에서 토큰 후보를 추출. */
export function extractFromSelection(selection: readonly SceneNode[]): ExtractResult {
  const acc: Accumulator = { map: new Map(), warnings: new Set(), lastNode: new Map(), skipped: new Set() };
  for (const node of selection) {
    if (!isEffectivelyVisible(node)) {
      acc.skipped.add(SKIP_HIDDEN); // 숨긴 그룹 안의 자식을 직접 고른 경우 — walk가 못 거른다
      continue;
    }
    walk(acc, node);
  }
  const tokens = [...acc.map.values()].sort((a, b) => a.name.localeCompare(b.name));
  // 하나라도 뽑았으면 조용히 넘어간다. 빈손일 때만 지나친 이유를 올려, 사용자가
  // ‘버튼이 안 먹는다’가 아니라 ‘무엇을 바꿔야 하는지’를 보게 한다.
  const warnings = tokens.length ? [...acc.warnings] : [...acc.warnings, ...acc.skipped];
  return { tokens, warnings };
}
