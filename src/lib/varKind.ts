/* ============================================================
   varKind.ts — 변수 종류 · 용도 판정 (IA v4 §4.6 · §4.7 · §4.8 · §4.9, 순수 — figma 의존 없음)
   ============================================================ */

/** 변수 탭 그룹 순서 · 클릭 연결 속성 목록의 종류. */
export type VarKind = 'gap' | 'radius' | 'size' | 'stroke' | 'opacity' | 'color' | 'text' | 'other';
/** 그룹 순서(§4.6): 간격 → 반경 → 크기 → 선 두께 → 투명도 → 색 → 글자 → 기타. */
export const VAR_KIND_ORDER: readonly VarKind[] = ['gap', 'radius', 'size', 'stroke', 'opacity', 'color', 'text', 'other'];

export interface KindInput {
  name: string;
  type: string; // COLOR · FLOAT · STRING · BOOLEAN
  scopes?: readonly string[];
}

const FIRST_FLOAT: Record<string, VarKind> = {
  spacing: 'gap', radius: 'radius', size: 'size', 'stroke-width': 'stroke', opacity: 'opacity',
  'font-size': 'text', 'line-height': 'text', 'letter-spacing': 'text',
};
const DIRS = ['top', 'right', 'bottom', 'left'];
const CORNERS = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
function lastFloatKind(seg: string): VarKind | null {
  if (['gap', 'row-gap', 'column-gap', 'spacing', 'padding', 'padding-x', 'padding-y'].includes(seg)) return 'gap';
  if (DIRS.some((d) => seg === `padding-${d}`)) return 'gap';
  if (seg === 'radius' || CORNERS.some((c) => seg === `radius-${c}`)) return 'radius';
  if (['size', 'width', 'height'].includes(seg)) return 'size';
  if (seg === 'stroke-width' || DIRS.some((d) => seg === `stroke-width-${d}`)) return 'stroke';
  if (seg === 'opacity') return 'opacity';
  if (['font-size', 'line-height', 'letter-spacing'].includes(seg)) return 'text';
  return null;
}
const SCOPE_KIND: Record<string, VarKind> = {
  GAP: 'gap', CORNER_RADIUS: 'radius', WIDTH_HEIGHT: 'size', STROKE_FLOAT: 'stroke', OPACITY: 'opacity',
  FONT_SIZE: 'text', LINE_HEIGHT: 'text', LETTER_SPACING: 'text', FONT_FAMILY: 'text',
};

/** 종류 판정(§4.6, 위에서부터 처음 맞는 것). */
export function varKind(v: KindInput): VarKind {
  if (v.type === 'COLOR') return 'color';
  if (v.type === 'BOOLEAN') return 'other';
  const segs = v.name.split('/').map((s) => s.trim().toLowerCase());
  const first = segs[0] ?? '';
  const last = segs[segs.length - 1] ?? '';
  if (v.type === 'FLOAT' && FIRST_FLOAT[first]) return FIRST_FLOAT[first];
  if (v.type === 'STRING' && first === 'font-family') return 'text';
  if (v.type === 'FLOAT') { const k = lastFloatKind(last); if (k) return k; }
  if (v.type === 'STRING' && last === 'font-family') return 'text';
  if (v.type === 'FLOAT' || v.type === 'STRING') {
    const kinds = new Set((v.scopes ?? []).map((s) => SCOPE_KIND[s]).filter(Boolean));
    if (kinds.size === 1) return [...kinds][0] as VarKind;
  }
  return 'other';
}

/** 글자 속성 이름 → 용도(§4.9). 이름 끝 마디 · 첫 마디로 찾는다. */
function textScope(name: string): string | null {
  const segs = name.split('/').map((s) => s.trim().toLowerCase());
  for (const s of [segs[segs.length - 1], segs[0]]) {
    if (s === 'font-size') return 'FONT_SIZE';
    if (s === 'line-height') return 'LINE_HEIGHT';
    if (s === 'letter-spacing') return 'LETTER_SPACING';
    if (s === 'font-family') return 'FONT_FAMILY';
  }
  return null;
}
/**
 * 새 변수의 용도(§4.9) — 최종 이름의 종류(판정 1~3, 용도 판정 4는 쓰지 않는다)로.
 * undefined = 용도를 설정하지 않음(피그마 기본값 ALL_SCOPES — 기타 · 참거짓 · 글자 속성을 못 정함).
 */
export function scopesForNew(name: string, type: string): string[] | undefined {
  const k = varKind({ name, type });
  switch (k) {
    case 'gap': return ['GAP'];
    case 'radius': return ['CORNER_RADIUS'];
    case 'size': return ['WIDTH_HEIGHT'];
    case 'stroke': return ['STROKE_FLOAT'];
    case 'opacity': return ['OPACITY'];
    case 'color': return ['ALL_FILLS', 'STROKE_COLOR', 'EFFECT_COLOR'];
    case 'text': { const s = textScope(name); return s ? [s] : undefined; }
    default: return undefined;
  }
}

const FILL_SUB = ['FRAME_FILL', 'SHAPE_FILL', 'TEXT_FILL'];
function expand(scopes: readonly string[]): Set<string> {
  const out = new Set<string>();
  for (const s of scopes) {
    if (s === 'ALL_FILLS') FILL_SUB.forEach((x) => out.add(x));
    else out.add(s);
  }
  return out;
}
/**
 * 별칭 고르개 용도 거르기(§4.8). 피그마 뜻: ALL_SCOPES = 모든 곳, [] = 어느 고르개에도 안 나옴.
 * 1 자기 용도가 ALL_SCOPES를 포함하거나 비었으면 모두 맞음 · 2 후보가 ALL_SCOPES면 맞음 · 3 후보가 비었으면 안 맞음 · 4 펼쳐서 겹치면 맞음.
 */
export function scopeFits(selfScopes: readonly string[], candScopes: readonly string[]): boolean {
  if (!selfScopes.length || selfScopes.includes('ALL_SCOPES')) return true;
  if (candScopes.includes('ALL_SCOPES')) return true;
  if (!candScopes.length) return false;
  const a = expand(selfScopes);
  for (const s of expand(candScopes)) if (a.has(s)) return true;
  return false;
}

/** 다른 곳에 연결(§4.7) — target 값. */
export type ApplyTarget =
  | 'fill' | 'stroke' | 'text' | 'shadow'
  | 'gap' | 'padding' | 'padding-top' | 'padding-right' | 'padding-bottom' | 'padding-left'
  | 'radius' | 'radius-tl' | 'radius-tr' | 'radius-bl' | 'radius-br';
/** 종류별 "다른 곳에 연결" 항목(§4.7). 그 밖의 종류는 없음. */
export const APPLY_TARGETS: Partial<Record<VarKind, readonly ApplyTarget[]>> = {
  color: ['fill', 'stroke', 'text', 'shadow'],
  gap: ['gap', 'padding', 'padding-top', 'padding-bottom', 'padding-left', 'padding-right'],
  radius: ['radius', 'radius-tl', 'radius-tr', 'radius-bl', 'radius-br'],
};
/** target이 쓰는 용도(그중 하나만 있으면 된다). */
const TARGET_SCOPES: Record<ApplyTarget, readonly string[]> = {
  fill: ['FRAME_FILL', 'SHAPE_FILL'], text: ['TEXT_FILL'], stroke: ['STROKE_COLOR'], shadow: ['EFFECT_COLOR'],
  gap: ['GAP'], padding: ['GAP'], 'padding-top': ['GAP'], 'padding-right': ['GAP'], 'padding-bottom': ['GAP'], 'padding-left': ['GAP'],
  radius: ['CORNER_RADIUS'], 'radius-tl': ['CORNER_RADIUS'], 'radius-tr': ['CORNER_RADIUS'], 'radius-bl': ['CORNER_RADIUS'], 'radius-br': ['CORNER_RADIUS'],
};
/** 변수 용도가 그 target을 허용하나(§4.7 — ALL_SCOPES = 모두, [] = 없음). */
export function targetAllowed(scopes: readonly string[], target: ApplyTarget): boolean {
  if (scopes.includes('ALL_SCOPES')) return true;
  const ex = expand(scopes);
  return TARGET_SCOPES[target].some((s) => ex.has(s));
}

/** 무료의 새 변수 · 복제 개수 제한(§4.9 · §9) — 사용자 기준 누적 20개(2026-11-09 결정). */
export const FREE_MANUAL_CREATE_LIMIT = 20;
/** 직접 만든 변수 표시(§4.9). */
export const MANUAL_KEY = 'dsl.manual';

/** 복제 이름(§4.9) — `{이름}-copy`, 있으면 `-copy-2` · `-copy-3`(대소문자까지 같을 때 겹침). */
export function duplicateName(name: string, taken: ReadonlySet<string>): string {
  const base = `${name}-copy`;
  if (!taken.has(base)) return base;
  for (let i = 2; ; i++) if (!taken.has(`${base}-${i}`)) return `${base}-${i}`;
}
