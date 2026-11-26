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
  roundAlpha,
  alphaPct,
} from './tokens';
import { bgKindOf, colorUse, composeName, paddingProp, pillCorners, radiusName, simpleNumericName, strokeName, type BgKind, type Padding } from './usageRoles'; // 쓰임 이름(§2.12)
import { aspectLocked, colorState, hasStyleId, lockedSizeState, nodeFieldState, numAllowed, sameAsMain, textFieldState, type SlotState } from './bind'; // 자리 연결 상태 — 연결 찾기와 같은 판정(IA v4 §4.1 "만들기 카드 — 상태 5" · §2.9 S2-P7)
import { STROKE_SCOPES, EFFECT_SCOPES, FIELD_SCOPE, fillScopesFor } from './scopes';
import { tokenable } from './sameValue'; // 추출이 그 자리에서 토큰을 내는가 — 카드의 p와 같은 술어(IA v4 §2.9 S2-P7)

interface Accumulator {
  map: Map<string, DraftToken>;
  warnings: Set<string>;
  /**
   * 지나친 이유. 성공한 추출에서는 말하지 않는다 — 매번 뜨는 경고가 성가셔서 걷어냈다(114393d).
   * 다만 한 개도 못 뽑았을 때는 이야기가 다르다: 아무 말이 없으면 버튼이 고장 난 것처럼 보인다.
   * 그래서 모으기만 하고, 결과가 빈 경우에만 extractFromSelection이 warnings로 올린다.
   */
  skipped: Set<string>;
  /** 메인을 함께 읽는 인스턴스 id(ia-v3 §2.11 11번). */
  covered?: ReadonlySet<string>;
  /** 알약 반경 판정 집합(ia-v4 §2.9 S2-P2 — `userRadiusKeys`). 없으면 알약 모양 모서리는 모두 알약이다. */
  radiusKeys?: ReadonlySet<string>;
  /** 인스턴스 id → 쓰는 메인(함께 걷는 것만) — 인스턴스 루트에서 메인 루트와 같은 값인 자리는 빈 자리로 세지 않는다(S2-P7). */
  mainOf?: ReadonlyMap<string, SceneNode>;
  /** 텍스트 스타일 후보 글자인가 — 그 글자의 글자 자리는 빈 자리가 아니다(스타일 몫, S2-P7). */
  textStyleNode?: (node: TextNode) => boolean;
  /** 지금 걷는 노드가 메인을 함께 걷는 인스턴스면 그 메인. */
  curMain?: SceneNode;
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
/**
 * 만들기 카드 종류(Spacing · Radius · Size · Stroke)의 자리에서 토큰을 내는가 — `tokenable`(소수 둘째 자리로 반올림한 값이 0보다 큰 정수)로 모은다
 * (IA v4 §2.9 S2-P7 · B.39 6회차 — 0 이하 판정도 반올림 뒤 값으로). 0보다 큰 소수면 "소수 값" 사유를 남긴다(onScale과 같음).
 */
function tokenOk(acc: Accumulator, kind: string, raw: number): boolean {
  if (tokenable(kind, raw)) return true;
  if (round(raw) > 0) acc.skipped.add(SKIP_FRACTION);
  return false;
}

function keyOf(category: TokenCategory, value: string | number, unit?: Unit, alpha?: number): string {
  return `${category}|${value}|${unit ?? ''}|${alpha ?? 1}`; // 같은 hex라도 투명도가 다르면 다른 토큰
}

/** 색 토큰 — 투명도 1이면 alpha 없음, 아니면 이름에 `-a{%}`(§2.11 "반투명 색 토큰"). */
function colorToken(category: 'color' | 'effectColor', hex: string, alpha: number): Omit<DraftToken, 'sources'> {
  return alpha < 1
    ? { name: `${colorTokenName(hex)}-a${alphaPct(alpha)}`, category, value: hex, alpha }
    : { name: colorTokenName(hex), category, value: hex };
}

/**
 * 이 add가 나타내는 자리(IA v4 §4.1 "만들기 카드 — 상태 5") — 연결 찾기(bind.ts)가 자리를 만드는 단위로 센다.
 * key = 허용 스코프 묶음 키, free = 그 가운데 변수가 안 붙은 자리 수(0이면 묶음만 만들지 않고 freeBy만 연다).
 */
interface Place {
  key: string;
  free: number;
}
/** 허용 스코프 묶음 키 — 스코프를 `|`로 잇는다(DraftToken.freeBy의 키). */
const scopeKey = (allowed: readonly string[]): string => allowed.join('|');
/** 붙은 자리인가 — 어떤 변수든(라이브러리 · 삭제된 변수) 붙어 있으면 bound · deleted. */
const isFree = (st: SlotState): boolean => st === 'none';
/** 한 값 속성 자리 하나(간격 · 여백 · 선 두께 · 투명도 · 크기 축) — 스코프는 필드별 numAllowed. */
const fieldPlace = (acc: Accumulator, node: SceneNode, field: string, places = 1): Place => ({ key: scopeKey(numAllowed(field)), free: isFree(nodeFieldState(node, field)) && !followsMain(acc, node, field) ? places : 0 });
/** 메인을 함께 걷는 인스턴스의 루트 자리가 메인 루트와 같은 값인가 — 연결 찾기가 버리는 자리(`bind.ts` sameAsMain, S2-P7). */
const followsMain = (acc: Accumulator, node: SceneNode, field: string, index?: number): boolean => !!acc.curMain && sameAsMain(node, acc.curMain, field, index);

function add(
  acc: Accumulator,
  token: Omit<DraftToken, 'sources'>,
  source: SourceField,
  nodeId: string,
  /** 쓰임 이름(§2.12 12.10) — 숫자는 `spacing/gap` 같은 이름(주인 없음 — 12.12 N-D1), 색은 `color/{쓰임}`. 글자는 없음. */
  use?: string,
  /** 색 쓰임의 배경 종류(12.4) — 같은 쓰임이라도 배경 종류가 다르면 따로 센다. */
  bg?: BgKind,
  /** 자리(freeBy) — 만들기 카드 종류(색 · 간격 · 반경 · 크기 · 선 두께 · 투명도)만 준다. 글자 · 그림자 수치는 없음. */
  place?: Place,
): void {
  const k = keyOf(token.category, token.value, token.unit, token.alpha);
  let existing = acc.map.get(k);
  if (existing) {
    if (!existing.sources.includes(source)) existing.sources.push(source);
    if (acc.lastNode.get(k) !== nodeId) existing.count = (existing.count ?? 1) + 1;
  } else {
    existing = { ...token, sources: [source], count: 1 };
    acc.map.set(k, existing);
  }
  acc.lastNode.set(k, nodeId);
  if (place) {
    const fb = (existing.freeBy ??= {});
    if (place.free > 0) fb[place.key] = (fb[place.key] ?? 0) + place.free;
  }
  if (use) {
    const uses = (existing.uses ??= []);
    let u = uses.find((x) => x.name === use && x.bg === bg);
    if (u) u.count++;
    else uses.push((u = bg ? { name: use, count: 1, bg } : { name: use, count: 1 }));
    // 이 쓰임의 빈 자리가 있는 용도 묶음(만들기의 재사용이 쓰임 × 묶음마다 가족 판정 — ia-v4 §2.9 S2-P8 · SC-D41)
    if (place && place.free > 0 && !(u.keys ??= []).includes(place.key)) u.keys.push(place.key);
  }
}

/* ---------- paint ---------- */
/**
 * 레이어 뒤의 배경색(§2.12 12.4) — 조상을 위로 올라가며 처음 만나는 보이는 채움. 그 맨 위 보이는 칠하기가
 * 불투명 SOLID면 그 색(소문자 hex), 이미지 · 그라데이션 · 반투명이면 모름. 페이지까지 채움이 없어도 모름.
 * 레이어 자신의 채움은 보지 않는다(글자 · 아이콘 · 테두리는 뒤의 배경 위에 있다). 형제 레이어도 보지 않는다(한계).
 */
export function backgroundOf(node: SceneNode): string | undefined {
  let p: BaseNode | null = node.parent;
  while (p && p.type !== 'PAGE' && p.type !== 'DOCUMENT') {
    const fills = (p as { fills?: readonly Paint[] | typeof figma.mixed }).fills;
    if (Array.isArray(fills)) {
      const vis = fills.filter((f) => f.visible !== false && f.opacity !== 0);
      if (vis.length) {
        const top = vis[vis.length - 1]; // 칠하기 배열은 아래 → 위 순
        if (top.type === 'SOLID' && (top.opacity ?? 1) >= 1) return rgbToHex(top.color);
        return undefined;
      }
    }
    p = p.parent;
  }
  return undefined;
}

function collectPaints(
  acc: Accumulator,
  node: SceneNode,
  paints: readonly Paint[] | typeof figma.mixed,
  source: 'fill' | 'stroke',
): void {
  const nodeId = node.id;
  if (paints === figma.mixed || !Array.isArray(paints)) return;
  const key = scopeKey(source === 'fill' ? fillScopesFor(node.type) : STROKE_SCOPES);
  const field = source === 'fill' ? 'fills' : 'strokes';
  // 색 스타일이 붙은 칠 · 선은 빈 자리가 아니다 — 연결 찾기가 `styled`로 건너뛴다(S2-P7).
  const styled = hasStyleId(node, source === 'fill' ? 'fillStyleId' : 'strokeStyleId');
  for (let i = 0; i < paints.length; i++) {
    const p = paints[i];
    if (p.visible === false) continue;
    if (p.type !== 'SOLID') {
      acc.skipped.add(SKIP_GRADIENT); // GRADIENT / IMAGE / VIDEO — 변수 바인딩 불가, 조용히 스킵
      continue;
    }
    const alpha = roundAlpha(p.opacity);
    if (alpha === 0) continue; // 보이지 않는 칠 — 사유 없이 건너뜀
    const hex = rgbToHex(p.color);
    const cu = colorUse(node.type, source === 'fill' ? 'fills' : 'strokes', isInsideIconFrame(node));
    const bgHex = cu === 'text' || cu === 'icon' || cu === 'border' ? backgroundOf(node) : undefined;
    // 자리 = 페인트 하나(연결 찾기 bindPaints와 같은 단위) — 그 페인트 · 노드 배열 어느 쪽이든 변수가 붙었으면 붙은 자리.
    const free = !styled && isFree(colorState(p, node, field, i)) && !followsMain(acc, node, field, i) ? 1 : 0;
    add(acc, colorToken('color', hex, alpha), source, nodeId, `color/${cu}`, bgHex ? bgKindOf(bgHex) : undefined, { key, free });
    // 페인트 불투명도(p.opacity)는 따로 `opacity/…` 토큰으로 만들지 않는다 — OPACITY 스코프는 **레이어** 불투명도 전용.
    // 대신 색 토큰의 투명도(alpha)로 담는다: 색 변수를 붙이면 피그마가 칠 불투명도를 변수 alpha로 맞춘다(§2.11 "색").
  }
}

/* ---------- typography ---------- */
function collectText(acc: Accumulator, node: TextNode): void {
  // 글자 자리(S2-P7) — 변수도 텍스트 스타일도 붙지 않았고 빈 글자가 아니며 텍스트 스타일 후보 레이어가 아닌 글자 속성 하나.
  // 연결 찾기(bindText)와 같은 조건: 글꼴이 섞인 글자 · 빈 글자 · 스타일이 붙은 글자는 자리가 없다.
  const open = node.fontName !== figma.mixed && node.characters.length > 0 && !hasStyleId(node, 'textStyleId') && !acc.textStyleNode?.(node);
  const place = (field: VariableBindableTextField): Place => ({
    key: field === 'fontFamily' ? 'FONT_FAMILY' : (FIELD_SCOPE[field] as string),
    free: open && isFree(textFieldState(node, field)) ? 1 : 0,
  });
  if (node.fontSize !== figma.mixed) {
    const v = round(node.fontSize);
    if (onScale(acc, v)) add(acc, { name: numberTokenName('font-size', v), category: 'fontSize', value: v }, 'fontSize', node.id, undefined, undefined, place('fontSize'));
  }
  if (node.fontName !== figma.mixed) {
    const fam = node.fontName.family;
    add(acc, { name: `font-family/${fam}`, category: 'fontFamily', value: fam }, 'fontFamily', node.id, undefined, undefined, place('fontFamily'));
  }
  // 행간·자간은 **px로 직접 입력된 정수 값만** 변수 후보다. %는 변수로 만들지 않는다(A안, 2026-10-28):
  // Figma는 행간·자간 변수를 px로만 바인딩하므로 150%를 변수로 두려면 글자 크기마다 다른 px가
  // 필요하다 — `line-height/150 = 24`(16px 기준)는 28px 제목의 150%(42)와 안 맞아 한 번도
  // 바인딩되지 않았고, 2%×16 = 0.32 같은 소수만 남겼다. %는 텍스트 스타일이 보관한다
  // (Lightning은 비율, Atlassian은 폰트 스타일에 묶음 — 둘 다 px 행간 변수가 없다).
  if (node.lineHeight !== figma.mixed && node.lineHeight.unit === 'PIXELS') {
    const v = round(node.lineHeight.value);
    const unit: Unit = 'px';
    if (v > 0 && onScale(acc, v)) add(acc, { name: numberTokenName('line-height', v), category: 'lineHeight', value: v, unit }, 'lineHeight', node.id, undefined, undefined, place('lineHeight'));
  }
  if (node.letterSpacing !== figma.mixed && node.letterSpacing.unit === 'PIXELS') {
    const v = round(node.letterSpacing.value);
    const unit: Unit = 'px';
    if (v !== 0 && onScale(acc, v)) add(acc, { name: numberTokenName('letter-spacing', v), category: 'letterSpacing', value: v, unit }, 'letterSpacing', node.id, undefined, undefined, place('letterSpacing'));
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
  const pad: Padding = { left: node.paddingLeft, right: node.paddingRight, top: node.paddingTop, bottom: node.paddingBottom };
  const gaps: [number, string, string][] = (['paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom'] as const).map((f) => [
    node[f],
    composeName('spacing', paddingProp(f, pad)),
    f,
  ]);
  if (node.layoutMode === 'GRID') {
    // 그리드 오토레이아웃의 간격은 gridRowGap/gridColumnGap — itemSpacing/counterAxisSpacing은
    // HORIZONTAL/VERTICAL 전용이라 그리드에서는 의미 있는 값을 주지 않는다.
    gaps.push([node.gridRowGap, simpleNumericName('gridRowGap') as string, 'gridRowGap'], [node.gridColumnGap, simpleNumericName('gridColumnGap') as string, 'gridColumnGap']);
  } else {
    // 사이 간격 자동(Space between)이면 피그마가 간격을 계산한다 — 저장된 숫자는 화면 값이 아니라
    // 토큰으로 뽑으면 쓰레기(spacing/33·109…)가 된다(IA v3 §2.11, QA #3 불합격 1). padding은 그대로.
    if (!gapSkip(node, 'itemSpacing')) gaps.push([node.itemSpacing, simpleNumericName('itemSpacing') as string, 'itemSpacing']);
    // 줄 사이 간격 — 줄바꿈일 때만 쓰이고, 줄 정렬이 Space between이면 같은 이유로 뺀다.
    if (typeof node.counterAxisSpacing === 'number' && !gapSkip(node, 'counterAxisSpacing')) gaps.push([node.counterAxisSpacing, simpleNumericName('counterAxisSpacing') as string, 'counterAxisSpacing']);
  }
  for (const [g, use, field] of gaps) {
    if (typeof g === 'number' && tokenOk(acc, 'gap', g)) {
      const v = round(g);
      add(acc, { name: numberTokenName('spacing', v), category: 'gap', value: v }, 'gap', node.id, use, undefined, fieldPlace(acc, node, field));
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
 * `componentLike.ts` `isIconLike`(상한 96)와는 따로다.
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

/** 크기 역할 이름에 쓰는 구분(§2.12 12.3) — 아이콘 판정을 통과하면 icon, 아바타면 avatar, 아니면 null. */
export function iconOrAvatarKind(node: SceneNode): 'icon' | 'avatar' | null {
  if (!isIconOrAvatar(node)) return null;
  return isIconSelf(node) ? 'icon' : 'avatar';
}

/** 아이콘 틀(정사각형 · 64 이하 · 아이콘 조건) 안의 레이어인가 — 그 안 도형의 색 쓰임은 icon(§2.12 12.4). */
export function isInsideIconFrame(node: SceneNode): boolean {
  for (let p = node.parent; p && p.type !== 'PAGE' && p.type !== 'DOCUMENT'; p = p.parent) {
    if (isSmallSquare(p) && isIconSelf(p)) return true;
  }
  return false;
}

function collectSize(acc: Accumulator, node: SceneNode): void {
  // 아이콘 · 아바타 레이어의 크기만 토큰 후보로(§2.11). 카드 · 화면 폭 같은 크기는 뽑지 않는다.
  if (!isIconOrAvatar(node)) return;
  if (!inAutoLayoutFlow(node)) return;
  // Fixed인 축만 토큰화 — HUG/FILL은 계산된 동적 크기라 디자인 토큰이 아님.
  // 정수만 — 343.5처럼 자유 리사이즈로 남은 소수 값은 의도된 척도가 아님.
  // 자리 = 축 하나. 비율이 잠긴 레이어는 한 자리(연결 찾기 bindFrame — lockedSizeState): 첫 FIXED 축만 자리로 센다.
  const locked = aspectLocked(node);
  let lockedTaken = false;
  const addSize = (v: number, field: 'width' | 'height') => {
    const rv = round(v);
    if (!tokenable('size', v)) return;
    let place: Place;
    if (!locked) place = fieldPlace(acc, node, field);
    else {
      place = { key: scopeKey(numAllowed(field)), free: !lockedTaken && isFree(lockedSizeState(node).state) && !followsMain(acc, node, field) ? 1 : 0 };
      lockedTaken = true;
    }
    add(acc, { name: numberTokenName('size', rv), category: 'size', value: rv }, 'size', node.id, `size/${isIconSelf(node) ? 'icon' : 'avatar'}`, undefined, place);
  };
  if (node.layoutSizingHorizontal === 'FIXED') addSize(node.width, 'width');
  if (node.layoutSizingVertical === 'FIXED') addSize(node.height, 'height');
}

/* ---------- radius ---------- */
function collectRadius(acc: Accumulator, node: SceneNode): void {
  if (!('cornerRadius' in node)) return;
  const r = (node as { cornerRadius: number | typeof figma.mixed }).cornerRadius;
  const corners = ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius'] as const;
  if (r !== figma.mixed && typeof r !== 'number') return;
  const values = corners.map((c) => (r !== figma.mixed ? (r as number) : Number((node as unknown as Record<string, unknown>)[c]) || 0));
  // 알약 모서리(반경 ≥ 짧은 변 / 2)는 원래 값이 아니라 9999 하나로 센다 — Global `radius/9999` · Semantic `radius/full`(12.12 N-D5).
  // 연결 찾기와 같은 판정(ia-v4 §2.9 S2-P2): 판정 집합에 원래 값이 있는 모서리는 알약이 아니다 — `radius/{원래 값}` 토큰 · 보통 쓰임 이름.
  const { width, height } = node as unknown as { width: number; height: number };
  const named = pillCorners(values, width, height, acc.radiusKeys);
  // 연결이 모서리마다 붙이므로 쓰임도 모서리마다 센다(같으면 한 이름 — radiusName).
  const list = r === figma.mixed ? corners.map((c, i) => [c, named[i]] as const) : [[corners[0], named[0]] as const];
  for (const [c, rv] of list) {
    if (tokenOk(acc, 'radius', rv)) {
      const v = round(rv);
      // 자리 = 모서리 하나(연결 찾기 bindRadius는 같은 반경이어도 모서리 4자리) — 하나로 셀 때는 안 붙은 모서리 수.
      const place: Place = r === figma.mixed ? fieldPlace(acc, node, c) : { key: scopeKey(numAllowed(c)), free: corners.filter((cc) => isFree(nodeFieldState(node, cc)) && !followsMain(acc, node, cc)).length };
      add(acc, { name: numberTokenName('radius', v), category: 'radius', value: v }, 'radius', node.id, radiusName(c, named), undefined, place);
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
  const sides = ['strokeTopWeight', 'strokeRightWeight', 'strokeBottomWeight', 'strokeLeftWeight'] as const;
  const sideValues = sides.map((sd) => Number((node as unknown as Record<string, unknown>)[sd]) || 0);
  const widths: [string, number][] = [];
  if (w === figma.mixed) sides.forEach((sd, i) => widths.push([sd, sideValues[i]]));
  else if (typeof w === 'number') widths.push(['strokeWeight', w]);
  for (const [field, wv] of widths) {
    if (tokenOk(acc, 'stroke', wv)) {
      const v = round(wv);
      // 자리 = strokeWeight 하나 또는 방향별 하나씩(연결 찾기 bindStroke — strokeWeight는 한 방향이라도 붙었으면 붙음).
      add(acc, { name: numberTokenName('stroke-width', v), category: 'strokeWidth', value: v }, 'strokeWidth', node.id, strokeName(field, sideValues), undefined, fieldPlace(acc, node, field));
    }
  }
}

/* ---------- layer opacity ---------- */
function collectOpacity(acc: Accumulator, node: SceneNode): void {
  if (!('opacity' in node)) return;
  const o = (node as { opacity: number }).opacity;
  if (typeof o !== 'number' || o >= 1 || o <= 0) return; // 1(불투명)·0(숨김 동등)은 토큰화 안 함
  const v = round(o);
  add(acc, { name: numberTokenName('opacity', v), category: 'opacity', value: v }, 'opacity', node.id, simpleNumericName('opacity') as string, undefined, fieldPlace(acc, node, 'opacity'));
}

/* ---------- effects ---------- */
function collectEffects(acc: Accumulator, node: SceneNode): void {
  if (!('effects' in node)) return;
  const effects = (node as { effects: readonly Effect[] }).effects;
  const styled = hasStyleId(node, 'effectStyleId'); // 효과 스타일이 붙은 효과는 빈 자리가 아니다(S2-P7)
  for (let i = 0; i < effects.length; i++) {
    const e = effects[i];
    if (e.visible === false) continue;
    if (e.type === 'DROP_SHADOW' || e.type === 'INNER_SHADOW') {
      const alpha = roundAlpha(e.color.a);
      if (alpha === 0) continue; // 보이지 않는 그림자 — 숨긴 효과처럼 건너뜀
      const hex = rgbToHex(e.color);
      // 자리 = 효과 하나(연결 찾기 bindEffects). 그림자 수치(effectFloat)는 만들기 카드 종류가 아니라 자리를 세지 않는다.
      const free = !styled && isFree(colorState(e, node, 'effects', i)) && !followsMain(acc, node, 'effects', i) ? 1 : 0;
      add(acc, colorToken('effectColor', hex, alpha), 'effectColor', node.id, 'color/shadow', undefined, { key: scopeKey(EFFECT_SCOPES), free });
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
  // 메인을 함께 걷는 인스턴스의 루트 — 메인 루트와 같은 값인 자리는 빈 자리로 세지 않는다(토큰 · 쓰임은 그대로 모은다, S2-P7).
  acc.curMain = node.type === 'INSTANCE' ? acc.mainOf?.get(node.id) : undefined;
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
    if ('children' in node && node.children.length && !acc.covered?.has(node.id)) acc.skipped.add(SKIP_INSTANCE); // 메인이 더해지지 않은 인스턴스만(라이브러리 · 메인 없음)
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

export interface ExtractOptions {
  /** 알약 반경 판정 집합(`sameValue.ts` userRadiusKeys — `EXTRACT` 처리가 찾기와 같은 변수 읽기에서 낸다). */
  userRadiusKeys?: ReadonlySet<string>;
  /** 인스턴스 id → 쓰는 메인(함께 걷는 것 — `collectLocalMains().mainOf`). */
  mainOf?: ReadonlyMap<string, SceneNode>;
  /** 텍스트 스타일 후보 글자 판정(`textStyleCandidateTest`). */
  textStyleNode?: (node: TextNode) => boolean;
}

/** 현재 선택(자식 포함)에서 토큰 후보를 추출. */
export function extractFromSelection(
  selection: readonly SceneNode[],
  /** 메인을 함께 읽는 인스턴스 id(ia-v3 §2.11 11번) — 이 인스턴스는 "인스턴스 안쪽 건너뜀"을 남기지 않는다. */
  coveredInstances?: ReadonlySet<string>,
  /** 연결 찾기와 같은 자리 판정에 쓰는 것(ia-v4 §2.9 S2-P2 · S2-P7) — 넘기지 않으면 알약 모양 모서리는 모두 알약이고 자리는 추출 혼자 센다. */
  opts: ExtractOptions = {},
): ExtractResult {
  const acc: Accumulator = { map: new Map(), warnings: new Set(), lastNode: new Map(), skipped: new Set(), covered: coveredInstances, radiusKeys: opts.userRadiusKeys, mainOf: opts.mainOf, textStyleNode: opts.textStyleNode };
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
