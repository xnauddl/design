/* ============================================================
   selCards.ts — 선택 탭 카드의 숫자 (IA v4 §4.1, 순수 — figma 의존 없음)
   - 속성(field) → 종류. 카드 1 · 연결 화면 · ④가 같은 표를 쓴다.
   - 카드 1의 m · k · s · n: 찾기 결과(자리 단위)로 센다.
   ============================================================ */
import { colorKey } from './tokens';

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
export const NO_VAR_REASONS: readonly string[] = ['no-match'];
/** u = 용도 맞출 값(§4.1 — 같은 값 플러그인 Global의 용도만 꺼진 색 자리, 만들기가 용도를 더해 연결). 건너뛴 곳 목록에는 줄이 없다. */
export const SCOPE_ADD_REASONS: readonly string[] = ['scope-add'];
/** s = 손볼 곳(§4.1) — 디자인을 고치면 연결할 수 있게 되는 자리 단위 사유만. */
export const FIX_SKIP_REASONS: readonly string[] = ['fraction', 'size-fraction', 'deleted-var'];
/** 그대로 둬도 되는 자리 단위 사유(§4.2) — s에 넣지 않고 건너뛴 곳 목록에만. 이 순서가 목록 줄 순서. */
export const INFO_SKIP_REASONS: readonly string[] = ['styled', 'space-between', 'hug-fill', 'empty-text'];
/** 레이어 단위 건너뜀(§4.2 — 건너뜀 칩 안에만 사유로 보인다). */
export const LAYER_SKIP_REASONS: readonly string[] = ['instance-children', 'hidden', 'no-autolayout', 'size-free-layout', 'font', 'library-main'];

/** 건너뜀 목록 항목(`BindSkip`의 필요한 부분). */
export interface SkipItem {
  nodeId: string;
  name: string;
  reason: string;
  field?: string;
}
/** 건너뛴 곳 목록의 줄 하나(변수 사유). */
export interface SkipRow {
  key: string;
  /** 자리 단위는 곳 수, 레이어 단위는 레이어 수(상한 전 `skipLayers`, 없으면 사유 수). */
  n: number;
  layer: boolean;
  /** [선택 ›] · 툴팁에 쓰는 항목 — 뺀 항목은 없다. */
  items: SkipItem[];
}
/**
 * 건너뛴 곳 목록의 변수 사유 줄(§4.2 "줄 수 = 칩 수와 같은 셈") — 칩 · 목록 · 건너뛴 곳 모습이 함께 쓴다.
 * 자리 단위 사유(FIX · INFO)는 텍스트 스타일 후보 레이어의 글자 종류 항목을 뺀다(카드 1의 `ds`와 같은 근사 — 건너뜀 목록 기준).
 * 레이어 단위 사유는 빼지 않는다. 0인 줄은 없다. 텍스트 스타일만 모습이면 변수 사유 줄은 없다.
 */
export function skipRowCounts(
  reasons: Readonly<Record<string, number>>,
  skips: readonly SkipItem[],
  tsNodes: ReadonlySet<string>,
  tsOnly = false,
  /** 사유별 레이어 수(상한 전 — `APPLY_RESULT.skipLayers`). 레이어 단위 줄의 수로 쓴다. */
  layers?: Readonly<Record<string, number>>,
): { fix: SkipRow[]; keep: SkipRow[] } {
  if (tsOnly) return { fix: [], keep: [] };
  const rowOf = (key: string, layer: boolean): SkipRow | null => {
    const all = skips.filter((x) => x.reason === key);
    const items = layer ? all : all.filter((x) => !(tsNodes.has(x.nodeId) && fieldKind(x.field) === 'text'));
    const n = layer ? layers?.[key] ?? reasons[key] ?? 0 : Math.max(0, (reasons[key] ?? 0) - (all.length - items.length));
    return n > 0 ? { key, n, layer, items } : null;
  };
  const pick = (keys: readonly string[], layer: boolean): SkipRow[] => keys.map((k) => rowOf(k, layer)).filter((r): r is SkipRow => r != null);
  return { fix: pick(FIX_SKIP_REASONS, false), keep: [...pick(INFO_SKIP_REASONS, false), ...pick(LAYER_SKIP_REASONS, true)] };
}

/** 사유 × 종류별 자리 수(APPLY_RESULT.counts). */
export type ReasonCounts = Record<string, Partial<Record<SelKind, number>>>;

export interface CardCounts {
  /** 연결할 수 있는 곳. */
  m: number;
  /** 변수가 없는 값. */
  k: number;
  /** 용도 맞출 값(§4.1 u). */
  u: number;
  /** 자리 단위 건너뜀. */
  s: number;
  /** m + k + u. */
  n: number;
  /** 종류별 연결할 곳 수(m만 — 합 = m, 연결 화면 종류 머리 수와 같다. SEL_KINDS 순서, 0은 뺌). k는 noVarByKind. */
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
      add(noVar, kind as SelKind, n);
    }
  }
  let u = 0;
  for (const r of SCOPE_ADD_REASONS) u += sumKinds(counts?.[r]);
  let s = 0;
  for (const r of FIX_SKIP_REASONS) s += sumKinds(counts?.[r]);
  const order = (map: Map<SelKind, number>): { kind: SelKind; n: number }[] =>
    [...SEL_KINDS, 'other' as const].map((kind) => ({ kind, n: map.get(kind) ?? 0 })).filter((x) => x.n > 0);
  const m = candidateFields.length;
  return { m, k, u, s, n: m + k + u, byKind: order(byKind), noVarByKind: order(noVar) };
}

/* ---------- 상태 5 만들기 카드 — 라이브러리와 같은 값(IA v4 §4.1 "만들기 카드 — 상태 5") ---------- */

/** 같은 값 판정에 쓰는 토큰 필드(DraftToken의 일부). */
export interface LibSameToken {
  name: string;
  category: string;
  value: string | number;
  alpha?: number;
  count?: number;
  freeBy?: Record<string, number>;
}
/** 같은 값 판정에 쓰는 라이브러리 변수 필드(LibraryVar의 일부). */
export interface LibSameVar {
  type: string;
  value?: { kind: string; hex?: string; alpha?: number; text?: string };
  scopes?: readonly string[];
}
export interface LibSameSplit<T> {
  /** 남은 값 — 남은 자리가 1곳 이상인 토큰(들어온 순서). */
  left: T[];
  /** 토큰 이름 → 남은 자리 수(남은 값만). */
  leftPlaces: Record<string, number>;
  /** n = 남은 자리 수의 합(제목). */
  n: number;
  /** L = 같은 값 자리 수의 합(안내 카드 둘째 줄). */
  L: number;
}

const COLOR_CATS = new Set(['color', 'effectColor']);
/** 값이 같은가 — 색 ↔ COLOR(colorKey), 숫자 ↔ FLOAT(소수 둘째 자리 — sameLiteral과 같은 판정). 별칭 · 값 없음 · 그 밖 타입은 비교하지 않는다. */
function libValueSame(tk: LibSameToken, v: LibSameVar): boolean {
  const val = v.value;
  if (!val || val.kind === 'alias') return false;
  if (COLOR_CATS.has(tk.category)) {
    if (v.type !== 'COLOR' || val.kind !== 'color' || typeof val.hex !== 'string' || typeof tk.value !== 'string') return false;
    return colorKey(tk.value, tk.alpha) === colorKey(val.hex, val.alpha); // hex 대소문자 무시 · 투명도 소수 둘째 자리(없으면 1)
  }
  if (typeof tk.value !== 'number' || v.type !== 'FLOAT' || val.kind !== 'number') return false;
  const x = Number(val.text);
  return Number.isFinite(x) && Math.round(x * 100) === Math.round(tk.value * 100);
}
/** 스코프가 그 묶음을 받는가 — `ALL_SCOPES`면 통과(bind.ts scopeOk). 변수 scopes가 없으면(옛 응답) 통과 · 묶음 키가 ''이면(freeBy 없음) 통과. */
function libScopeOk(v: LibSameVar, key: string): boolean {
  if (!v.scopes || !key) return true;
  return v.scopes.includes('ALL_SCOPES') || key.split('|').some((s) => v.scopes!.includes(s));
}

/**
 * 토큰마다 변수가 안 붙은 자리(freeBy)를 묶음별로 "같은 값 자리"(값이 같고 그 묶음의 스코프를 받는 라이브러리 변수가 있음)와
 * "남은 자리"로 가른다. 한 토큰이 둘을 함께 가질 수 있다. freeBy가 없으면 free = count, 묶음 하나(스코프 비교 없음).
 * free = 0인 토큰은 어디에도 세지 않는다.
 */
export function libSameSplit<T extends LibSameToken>(tokens: readonly T[], libs: readonly LibSameVar[]): LibSameSplit<T> {
  const left: T[] = [];
  const leftPlaces: Record<string, number> = {};
  let n = 0;
  let L = 0;
  for (const tk of tokens) {
    const groups: Record<string, number> = tk.freeBy ?? { '': tk.count ?? 0 };
    let rest = 0;
    for (const [key, places] of Object.entries(groups)) {
      if (!(places > 0)) continue;
      if (libs.some((v) => libValueSame(tk, v) && libScopeOk(v, key))) L += places;
      else rest += places;
    }
    if (rest > 0) {
      left.push(tk);
      leftPlaces[tk.name] = rest;
      n += rest;
    }
  }
  return { left, leftPlaces, n, L };
}
