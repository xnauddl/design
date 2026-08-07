/* ============================================================
   extract.ts — 선택 노드에서 원시 토큰 수집·중복 제거 (bottom-up)
   ============================================================ */
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
   * 토큰 키 → 마지막으로 집계한 노드 id. walk가 한 노드를 끝까지 처리한 뒤 자식으로 내려가므로,
   * 같은 노드에서 온 연속 add는 이 비교로 걸러진다(padding 4방향이 count 4가 되지 않게).
   */
  lastNode: Map<string, string>;
}

const round = (n: number, p = 2) => Math.round(n * 10 ** p) / 10 ** p;

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
    if (p.type !== 'SOLID') continue; // GRADIENT / IMAGE / VIDEO — 변수 바인딩 불가, 조용히 스킵
    const hex = rgbToHex(p.color);
    add(acc, { name: colorTokenName(hex), category: 'color', value: hex }, source, nodeId);
    if (p.opacity != null && p.opacity < 1) {
      const o = round(p.opacity);
      add(acc, { name: numberTokenName('opacity', o), category: 'opacity', value: o }, 'opacity', node.id);
    }
  }
}

/* ---------- typography ---------- */
function collectText(acc: Accumulator, node: TextNode): void {
  if (node.fontSize !== figma.mixed) {
    const v = round(node.fontSize);
    add(acc, { name: numberTokenName('font-size', v), category: 'fontSize', value: v }, 'fontSize', node.id);
  }
  if (node.fontName !== figma.mixed) {
    const fam = node.fontName.family;
    add(acc, { name: `font-family/${fam}`, category: 'fontFamily', value: fam }, 'fontFamily', node.id);
  }
  if (node.lineHeight !== figma.mixed && node.lineHeight.unit !== 'AUTO') {
    const lh = node.lineHeight;
    const unit: Unit = lh.unit === 'PERCENT' ? 'percent' : 'px';
    const v = round(lh.value);
    add(acc, { name: numberTokenName('line-height', v), category: 'lineHeight', value: v, unit }, 'lineHeight', node.id);
  }
  if (node.letterSpacing !== figma.mixed) {
    const ls = node.letterSpacing;
    const unit: Unit = ls.unit === 'PERCENT' ? 'percent' : 'px';
    const v = round(ls.value);
    add(acc, { name: numberTokenName('letter-spacing', v), category: 'letterSpacing', value: v, unit }, 'letterSpacing', node.id);
  }
}

/* ---------- auto-layout spacing/padding ---------- */
function collectSpacing(acc: Accumulator, node: FrameNode | ComponentNode | InstanceNode): void {
  if (node.layoutMode === 'NONE') return;
  const gaps: number[] = [node.paddingLeft, node.paddingRight, node.paddingTop, node.paddingBottom];
  if (node.layoutMode === 'GRID') {
    // 그리드 오토레이아웃의 간격은 gridRowGap/gridColumnGap — itemSpacing/counterAxisSpacing은
    // HORIZONTAL/VERTICAL 전용이라 그리드에서는 의미 있는 값을 주지 않는다.
    gaps.push(node.gridRowGap, node.gridColumnGap);
  } else {
    gaps.push(node.itemSpacing);
    if (typeof node.counterAxisSpacing === 'number') gaps.push(node.counterAxisSpacing); // 줄바꿈(wrap) 오토레이아웃의 교차축 간격
  }
  for (const g of gaps) {
    if (typeof g === 'number' && g > 0) {
      const v = round(g);
      add(acc, { name: numberTokenName('spacing', v), category: 'gap', value: v }, 'gap', node.id);
    }
  }
}

/* ---------- size ---------- */
function collectSize(acc: Accumulator, node: SceneNode): void {
  // 프레임류만 사이즈 후보로(노이즈 방지)
  if (node.type !== 'FRAME' && node.type !== 'COMPONENT' && node.type !== 'INSTANCE') return;
  // 오토레이아웃 맥락에서만. Figma에서 HUG는 오토레이아웃 프레임/텍스트에만, FILL은 오토레이아웃 자식에만
  // 유효하므로, 자유 배치 프레임의 layoutSizing*는 **언제나 'FIXED'** 다. Fixed 검사만으로는 화면 프레임·
  // 장식 박스까지 전부 통과하므로, 디자이너가 Fixed를 '선택'할 수 있었던 노드로 좁힌다.
  const parent = node.parent;
  // 절대 배치 자식은 오토레이아웃 흐름 밖이라 Hug/Fill을 고를 수 없고 항상 FIXED다 —
  // 부모가 오토레이아웃이어도 '디자이너가 Fixed를 선택했다'가 성립하지 않는다.
  const absolute = 'layoutPositioning' in node && (node as FrameNode).layoutPositioning === 'ABSOLUTE';
  const inAutoLayout =
    !absolute &&
    (node.layoutMode !== 'NONE' ||
      (parent != null && 'layoutMode' in parent && (parent as FrameNode).layoutMode !== 'NONE'));
  if (!inAutoLayout) return;
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
      add(acc, { name: numberTokenName('radius', v), category: 'radius', value: v }, 'radius', node.id);
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
      add(acc, { name: numberTokenName('stroke-width', v), category: 'strokeWidth', value: v }, 'strokeWidth', node.id);
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
        add(acc, { name: numberTokenName(g, v), category: 'effectFloat', value: v }, 'effectFloat', node.id);
      }
    } else if (e.type === 'LAYER_BLUR' || e.type === 'BACKGROUND_BLUR') {
      const v = round(e.radius);
      add(acc, { name: numberTokenName('blur', v), category: 'effectFloat', value: v }, 'effectFloat', node.id);
    }
  }
}

function walk(acc: Accumulator, node: SceneNode): void {
  // 숨긴 레이어는 화면에 없는 값이라 토큰 후보에서 제외(하위까지 통째로).
  if (node.visible === false) return;
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
  if (node.type === 'INSTANCE') return;
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
  const acc: Accumulator = { map: new Map(), warnings: new Set(), lastNode: new Map() };
  for (const node of selection) {
    if (!isEffectivelyVisible(node)) continue;
    walk(acc, node);
  }
  const tokens = [...acc.map.values()].sort((a, b) => a.name.localeCompare(b.name));
  return { tokens, warnings: [...acc.warnings] };
}
