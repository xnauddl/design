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
}

const round = (n: number, p = 2) => Math.round(n * 10 ** p) / 10 ** p;

function keyOf(category: TokenCategory, value: string | number, unit?: Unit): string {
  return `${category}|${value}|${unit ?? ''}`;
}

function add(
  acc: Accumulator,
  token: Omit<DraftToken, 'sources'>,
  source: SourceField,
): void {
  const k = keyOf(token.category, token.value, token.unit);
  const existing = acc.map.get(k);
  if (existing) {
    if (!existing.sources.includes(source)) existing.sources.push(source);
  } else {
    acc.map.set(k, { ...token, sources: [source] });
  }
}

/* ---------- paint ---------- */
function collectPaints(
  acc: Accumulator,
  paints: readonly Paint[] | typeof figma.mixed,
  source: 'fill' | 'stroke',
): void {
  if (paints === figma.mixed || !Array.isArray(paints)) return;
  for (const p of paints) {
    if (p.visible === false) continue;
    if (p.type === 'SOLID') {
      const hex = rgbToHex(p.color);
      add(acc, { name: colorTokenName(hex), category: 'color', value: hex }, source);
      if (p.opacity != null && p.opacity < 1) {
        const o = round(p.opacity);
        add(acc, { name: numberTokenName('opacity', o), category: 'opacity', value: o }, 'opacity');
      }
    } else if (p.type.startsWith('GRADIENT') || p.type === 'IMAGE' || p.type === 'VIDEO') {
      acc.warnings.add('그라디언트/이미지 채움은 변수 바인딩 불가 — 스킵했습니다.');
    }
  }
}

/* ---------- typography ---------- */
function collectText(acc: Accumulator, node: TextNode): void {
  if (node.fontSize !== figma.mixed) {
    const v = round(node.fontSize);
    add(acc, { name: numberTokenName('font-size', v), category: 'fontSize', value: v }, 'fontSize');
  }
  if (node.fontName !== figma.mixed) {
    const fam = node.fontName.family;
    add(acc, { name: `font-family/${fam}`, category: 'fontFamily', value: fam }, 'fontFamily');
  }
  if (node.lineHeight !== figma.mixed && node.lineHeight.unit !== 'AUTO') {
    const lh = node.lineHeight;
    const unit: Unit = lh.unit === 'PERCENT' ? 'percent' : 'px';
    const v = round(lh.value);
    add(acc, { name: numberTokenName('line-height', v), category: 'lineHeight', value: v, unit }, 'lineHeight');
  }
  if (node.letterSpacing !== figma.mixed) {
    const ls = node.letterSpacing;
    const unit: Unit = ls.unit === 'PERCENT' ? 'percent' : 'px';
    const v = round(ls.value);
    add(acc, { name: numberTokenName('letter-spacing', v), category: 'letterSpacing', value: v, unit }, 'letterSpacing');
  }
}

/* ---------- auto-layout spacing/padding ---------- */
function collectSpacing(acc: Accumulator, node: FrameNode | ComponentNode | InstanceNode): void {
  if (node.layoutMode === 'NONE') return;
  const gaps: number[] = [node.itemSpacing, node.paddingLeft, node.paddingRight, node.paddingTop, node.paddingBottom];
  if (typeof node.counterAxisSpacing === 'number') gaps.push(node.counterAxisSpacing);
  for (const g of gaps) {
    if (typeof g === 'number' && g > 0) {
      const v = round(g);
      add(acc, { name: numberTokenName('spacing', v), category: 'gap', value: v }, 'gap');
    }
  }
}

/* ---------- size ---------- */
function collectSize(acc: Accumulator, node: SceneNode): void {
  // 프레임류만 사이즈 후보로(노이즈 방지)
  if (node.type !== 'FRAME' && node.type !== 'COMPONENT' && node.type !== 'INSTANCE') return;
  for (const v of [round(node.width), round(node.height)]) {
    if (v > 0) add(acc, { name: numberTokenName('size', v), category: 'size', value: v }, 'size');
  }
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
      add(acc, { name: numberTokenName('radius', v), category: 'radius', value: v }, 'radius');
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
      add(acc, { name: numberTokenName('stroke-width', v), category: 'strokeWidth', value: v }, 'strokeWidth');
    }
  }
}

/* ---------- layer opacity ---------- */
function collectOpacity(acc: Accumulator, node: SceneNode): void {
  if (!('opacity' in node)) return;
  const o = (node as { opacity: number }).opacity;
  if (typeof o !== 'number' || o >= 1 || o <= 0) return; // 1(불투명)·0(숨김 동등)은 토큰화 안 함
  const v = round(o);
  add(acc, { name: numberTokenName('opacity', v), category: 'opacity', value: v }, 'opacity');
}

/* ---------- effects ---------- */
function collectEffects(acc: Accumulator, node: SceneNode): void {
  if (!('effects' in node)) return;
  for (const e of (node as { effects: readonly Effect[] }).effects) {
    if (e.visible === false) continue;
    if (e.type === 'DROP_SHADOW' || e.type === 'INNER_SHADOW') {
      const hex = rgbToHex(e.color);
      add(acc, { name: colorTokenName(hex), category: 'effectColor', value: hex }, 'effectColor');
      for (const [g, val] of [
        ['shadow-blur', e.radius],
        ['shadow-spread', e.spread ?? 0],
        ['shadow-x', e.offset.x],
        ['shadow-y', e.offset.y],
      ] as const) {
        const v = round(val);
        add(acc, { name: numberTokenName(g, v), category: 'effectFloat', value: v }, 'effectFloat');
      }
    } else if (e.type === 'LAYER_BLUR' || e.type === 'BACKGROUND_BLUR') {
      const v = round(e.radius);
      add(acc, { name: numberTokenName('blur', v), category: 'effectFloat', value: v }, 'effectFloat');
    }
  }
}

function walk(acc: Accumulator, node: SceneNode): void {
  if ('fills' in node) collectPaints(acc, node.fills, 'fill');
  if ('strokes' in node) collectPaints(acc, node.strokes, 'stroke');
  if (node.type === 'TEXT') collectText(acc, node);
  if (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE') {
    collectSpacing(acc, node);
  }
  collectSize(acc, node);
  collectRadius(acc, node);
  collectStroke(acc, node);
  collectOpacity(acc, node);
  collectEffects(acc, node);
  if ('children' in node) for (const child of node.children) walk(acc, child);
}

export interface ExtractResult {
  tokens: DraftToken[];
  warnings: string[];
}

/** 현재 선택(자식 포함)에서 토큰 후보를 추출. */
export function extractFromSelection(selection: readonly SceneNode[]): ExtractResult {
  const acc: Accumulator = { map: new Map(), warnings: new Set() };
  for (const node of selection) walk(acc, node);
  const tokens = [...acc.map.values()].sort((a, b) => a.name.localeCompare(b.name));
  return { tokens, warnings: [...acc.warnings] };
}
