/* ============================================================
   selCards.ts — 선택 탭 카드의 숫자 (IA v4 §4.1, 순수 — figma 의존 없음)
   - 속성(field) → 종류. 카드 1 · 연결 화면 · ④가 같은 표를 쓴다.
   - 카드 1의 m · k · s · n: 찾기 결과(자리 단위)로 센다.
   ============================================================ */

/** §4.1 "속성 → 종류" 순서. 텍스트 스타일은 B.2에서 더한다. */
export const SEL_KINDS = ['gap', 'radius', 'size', 'stroke', 'opacity', 'color', 'text'] as const;
export type SelKind = (typeof SEL_KINDS)[number] | 'other';

const PADDING = new Set(['paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom']);
const RADIUS = new Set(['cornerRadius', 'topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius']);
const STROKE = new Set(['strokeWeight', 'strokeTopWeight', 'strokeRightWeight', 'strokeBottomWeight', 'strokeLeftWeight']);
const TEXT = new Set(['fontSize', 'lineHeight', 'letterSpacing', 'fontFamily']);
const COLOR = new Set(['fills', 'strokes', 'effects']);

/** 찾기 결과의 속성 이름 → 종류. 모르는 속성은 'other'(카드 숫자에는 넣지만 종류별 줄에는 없음). */
export function fieldKind(field: string | undefined): SelKind {
  if (!field) return 'other';
  if (field === 'itemSpacing' || field === 'counterAxisSpacing' || PADDING.has(field) || field.startsWith('grid')) return 'gap';
  if (RADIUS.has(field)) return 'radius';
  if (field === 'width' || field === 'height') return 'size';
  if (STROKE.has(field)) return 'stroke';
  if (field === 'opacity') return 'opacity';
  if (COLOR.has(field)) return 'color';
  if (TEXT.has(field)) return 'text';
  return 'other';
}

/** k = 변수가 없는 값(§4.1). */
export const NO_VAR_REASONS: readonly string[] = ['no-match', 'size-fraction'];
/** s = 자리 단위 건너뜀만(§4.1). 레이어 단위(instance-children · hidden · no-autolayout · size-free-layout · font)와 already-bound는 뺀다. */
export const PLACE_SKIP_REASONS: readonly string[] = ['styled', 'hug-fill', 'translucent', 'space-between', 'fraction', 'empty-text', 'deleted-var'];

/** 사유 × 종류별 자리 수(APPLY_RESULT.counts). */
export type ReasonCounts = Record<string, Partial<Record<SelKind, number>>>;

export interface CardCounts {
  /** 연결할 수 있는 곳. */
  m: number;
  /** 변수가 없는 값. */
  k: number;
  /** 자리 단위 건너뜀. */
  s: number;
  /** m + k. */
  n: number;
  /** 종류별 곳 수(m + k, SEL_KINDS 순서, 0은 뺌). */
  byKind: { kind: SelKind; n: number }[];
  /** 종류별 변수가 없는 값(④ 둘째 줄). */
  noVarByKind: { kind: SelKind; n: number }[];
}

const sumKinds = (r: Partial<Record<SelKind, number>> | undefined): number => Object.values(r ?? {}).reduce((a, b) => a + (b ?? 0), 0);

/** 카드 1 숫자 — candidates = 미리보기 후보의 속성 목록, counts = 사유 × 종류. */
export function cardCounts(candidateFields: readonly string[], counts: ReasonCounts | undefined): CardCounts {
  const byKind = new Map<SelKind, number>();
  const noVar = new Map<SelKind, number>();
  const add = (map: Map<SelKind, number>, k: SelKind, n: number): void => { map.set(k, (map.get(k) ?? 0) + n); };
  for (const f of candidateFields) add(byKind, fieldKind(f), 1);
  let k = 0;
  for (const r of NO_VAR_REASONS) {
    for (const [kind, n] of Object.entries(counts?.[r] ?? {})) {
      if (!n) continue;
      k += n;
      add(byKind, kind as SelKind, n);
      add(noVar, kind as SelKind, n);
    }
  }
  let s = 0;
  for (const r of PLACE_SKIP_REASONS) s += sumKinds(counts?.[r]);
  const order = (map: Map<SelKind, number>): { kind: SelKind; n: number }[] =>
    [...SEL_KINDS, 'other' as const].map((kind) => ({ kind, n: map.get(kind) ?? 0 })).filter((x) => x.n > 0);
  const m = candidateFields.length;
  return { m, k, s, n: m + k, byKind: order(byKind), noVarByKind: order(noVar) };
}
