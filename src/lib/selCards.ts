/* ============================================================
   selCards.ts — 선택 탭 카드의 숫자 (IA v4 §4.1, 순수 — figma 의존 없음)
   - 속성(field) → 종류. 카드 1 · 연결 화면 · ④가 같은 표를 쓴다.
   - 카드 1의 m · k · s · n: 찾기 결과(자리 단위)로 센다.
   ============================================================ */
import { valueKeyOf, tokenable } from './sameValue'; // 값 키 · 추출이 토큰을 내는 자리(IA v4 §2.9)
import { FIELD_SCOPE, STROKE_SCOPES, EFFECT_SCOPES, fillScopesFor } from './scopes';

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

/** 후보가 없고 만들 수 있는 값의 사유(§2.9 S2-P7 — 카드의 n · q는 `make` 목록에서 낸다. 이 사유 수에는 글자 자리도 든다). */
export const NO_VAR_REASONS: readonly string[] = ['no-match'];
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

/** 새로 만들 값 하나(`APPLY_RESULT.make` — §2.9 S2-P7). */
export interface MakeItem {
  kind: string;
  value: string | number;
  alpha?: number;
  by: Record<string, number>;
}

export interface CardCounts {
  /** 연결할 곳(자리 — 같은 값 변수가 있음). */
  m: number;
  /** 자리 단위 건너뜀(손볼 곳). */
  s: number;
  /** 새로 만들 값의 수(값 단위 — 글자 종류 제외, 라이브러리 같은 값 묶음만 남은 값 제외). */
  n: number;
  /** 그 값들의 자리 수(라이브러리 같은 값 묶음 제외). */
  q: number;
  /** 종류별 연결할 곳 수(합 = m, 연결 화면 종류 머리 수와 같다. SEL_KINDS 순서, 0은 뺌). */
  byKind: { kind: SelKind; n: number }[];
}

const sumKinds = (r: Partial<Record<SelKind, number>> | undefined): number => Object.values(r ?? {}).reduce((a, b) => a + (b ?? 0), 0);

/**
 * 카드 1 숫자(§2.9 S2-P7) — candidates = 미리보기 후보의 속성 목록(m), counts = 사유 × 종류(s), make = 새로 만들 값 목록(n · q).
 * libs(직접 쓰는 라이브러리 변수)가 있으면 같은 값 · 그 묶음 용도를 받는 라이브러리 변수가 있는 묶음은 q에서 빼고,
 * 묶음이 하나도 남지 않는 값은 n에서 뺀다(`libSameGroups` — 만들기 실행이 그 자리를 붙이지 않는 것과 맞춘다).
 */
export function cardCounts(candidateFields: readonly string[], counts: ReasonCounts | undefined, make: readonly MakeItem[] = [], libs: readonly LibSameVar[] = []): CardCounts {
  const byKind = new Map<SelKind, number>();
  for (const f of candidateFields) byKind.set(fieldKind(f), (byKind.get(fieldKind(f)) ?? 0) + 1);
  let s = 0;
  for (const r of FIX_SKIP_REASONS) s += sumKinds(counts?.[r]);
  let n = 0;
  let q = 0;
  for (const mv of make) {
    if (mv.kind === 'text') continue; // 글자 종류는 세지 않는다(찾기가 싣지 않지만 한 번 더 막는다)
    const lib = libs.length ? new Set(libSameGroups(makeToken(mv), libs)) : null;
    let left = 0;
    for (const [g, places] of Object.entries(mv.by)) if (places > 0 && !lib?.has(g)) left += places;
    if (left > 0) {
      n++;
      q += left;
    }
  }
  const order = (map: Map<SelKind, number>): { kind: SelKind; n: number }[] =>
    [...SEL_KINDS, 'other' as const].map((kind) => ({ kind, n: map.get(kind) ?? 0 })).filter((x) => x.n > 0);
  return { m: candidateFields.length, s, n, q, byKind: order(byKind) };
}

/** 새로 만들 값 · 연결할 곳을 라이브러리 같은 값 판정에 넘기는 모양(토큰의 필요한 부분). */
const makeToken = (mv: { kind: string; value: string | number; alpha?: number; by: Record<string, number> }): LibSameToken => ({
  name: '',
  category: mv.kind === 'color' ? 'color' : mv.kind,
  value: mv.value,
  ...(mv.alpha != null ? { alpha: mv.alpha } : {}),
  freeBy: mv.by,
});

/** 연결할 곳 하나(`BindCandidate`의 필요한 부분). */
export interface LinkPlace {
  nodeId: string;
  field: string;
  currentValue: string;
  currentAlpha?: number;
  /** 9999로 붙이는 알약 자리(찾을 때 읽은 원래 값) — 자리의 값은 9999다. */
  pillFrom?: number;
}

/** 자리의 허용 용도 묶음 키(연결 찾기 자리의 `allowed.join('|')` — 칠은 레이어 종류를 따른다). */
export function placeGroupKey(field: string, nodeType: string): string {
  if (field === 'fills') return fillScopesFor(nodeType).join('|');
  if (field === 'strokes') return STROKE_SCOPES.join('|');
  if (field === 'effects') return EFFECT_SCOPES.join('|');
  if (field === 'fontFamily') return 'FONT_FAMILY';
  return FIELD_SCOPE[field] ?? 'ALL_SCOPES';
}

/**
 * 카드 p의 "연결할 곳" 몫(§2.9 S2-P7) — 만들기를 실행하면 붙는 연결할 곳: 글자 종류가 아닌 변수 자리 가운데
 * 라이브러리 같은 값 묶음의 자리와 추출이 토큰을 내지 않는 자리(`!tokenable` — 소수 값 · 0 이하 값)를 뺀 수.
 * 자리의 값은 판정 뒤의 값이다 — 9999로 붙이는 알약 자리는 9999, 그 밖은 `currentValue`. 제목 m은 이 뺄셈을 하지 않는다.
 */
export function linkPlacesForMake(cands: readonly LinkPlace[], nodeTypeOf: (nodeId: string) => string | undefined, libs: readonly LibSameVar[] = []): number {
  let p = 0;
  const libMemo = new Map<string, boolean>();
  for (const c of cands) {
    const kind = fieldKind(c.field);
    if (kind === 'text' || kind === 'other') continue;
    const isColor = kind === 'color';
    const value: string | number = isColor ? c.currentValue : c.pillFrom != null ? 9999 : Number(c.currentValue);
    if (!tokenable(kind, value)) continue;
    if (libs.length) {
      const g = placeGroupKey(c.field, nodeTypeOf(c.nodeId) ?? '');
      const mk = `${kind}\u0000${value}\u0000${c.currentAlpha ?? 1}\u0000${g}`;
      let same = libMemo.get(mk);
      if (same === undefined) {
        same = libSameGroups(makeToken({ kind, value, ...(c.currentAlpha != null ? { alpha: c.currentAlpha } : {}), by: { [g]: 1 } }), libs).length > 0;
        libMemo.set(mk, same);
      }
      if (same) continue;
    }
    p++;
  }
  return p;
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
/** 값이 같은가 — 색 ↔ COLOR, 숫자 ↔ FLOAT(값 키 `valueKeyOf` — IA v4 §2.9 S2-P2). 별칭 · 값 없음 · 그 밖 타입은 비교하지 않는다. */
function libValueSame(tk: LibSameToken, v: LibSameVar): boolean {
  const val = v.value;
  if (!val || val.kind === 'alias') return false;
  if (COLOR_CATS.has(tk.category)) {
    if (v.type !== 'COLOR' || val.kind !== 'color' || typeof val.hex !== 'string' || typeof tk.value !== 'string') return false;
    return valueKeyOf('color', tk.value, tk.alpha) === valueKeyOf('color', val.hex, val.alpha); // hex 대소문자 무시 · 투명도 소수 둘째 자리(없으면 1)
  }
  if (typeof tk.value !== 'number' || v.type !== 'FLOAT' || val.kind !== 'number') return false;
  const x = Number(val.text);
  return Number.isFinite(x) && valueKeyOf('num', x) === valueKeyOf('num', tk.value);
}
/** 스코프가 그 묶음을 받는가 — `ALL_SCOPES`면 통과(bind.ts scopeOk). 변수 scopes가 없으면(옛 응답) 통과 · 묶음 키가 ''이면(freeBy 없음) 통과. */
function libScopeOk(v: LibSameVar, key: string): boolean {
  if (!v.scopes || !key) return true;
  return v.scopes.includes('ALL_SCOPES') || key.split('|').some((s) => v.scopes!.includes(s));
}

/** 글자 토큰의 용도 묶음 키(freeBy가 없는 종류 — 연결 글자 자리의 `allowed`와 같다, §4.3 B.35 ①). */
const TEXT_GROUP: Record<string, string> = { fontSize: 'FONT_SIZE', lineHeight: 'LINE_HEIGHT', letterSpacing: 'LETTER_SPACING', fontFamily: 'FONT_FAMILY' };

/** freeBy가 없는 옛 토큰의 종류별 묶음(연결 자리의 `allowed.join('|')` — 칠은 레이어 종류마다 셋, `scopes.ts`). */
const KIND_GROUPS: Record<string, string[]> = {
  color: ['ALL_FILLS|TEXT_FILL', 'ALL_FILLS|FRAME_FILL', 'ALL_FILLS|SHAPE_FILL', 'STROKE_COLOR'],
  effectColor: ['EFFECT_COLOR'],
  gap: ['GAP'],
  radius: ['CORNER_RADIUS'],
  size: ['WIDTH_HEIGHT'],
  strokeWidth: ['STROKE_FLOAT'],
  opacity: ['OPACITY'],
};

/**
 * 토큰의 용도 묶음 키 — freeBy가 있으면 남은 자리가 1곳 이상인 묶음, 글자는 종류 묶음 하나.
 * freeBy가 없는 옛 토큰(추출이 자리를 싣기 전)은 종류에서 정한 묶음(KIND_GROUPS).
 */
export function tokenGroups(tk: LibSameToken): string[] {
  if (tk.freeBy) return Object.entries(tk.freeBy).filter(([, n]) => n > 0).map(([k]) => k);
  const g = TEXT_GROUP[tk.category];
  return g ? [g] : [...(KIND_GROUPS[tk.category] ?? [])];
}

/** 같은 값 · 그 묶음 스코프를 받는 라이브러리 변수가 있는 묶음 키(§4.3 B.35 ② — libSameSplit과 같은 판정). */
export function libSameGroups(tk: LibSameToken, libs: readonly LibSameVar[]): string[] {
  return tokenGroups(tk).filter((key) => libs.some((v) => libValueSame(tk, v) && libScopeOk(v, key)));
}

/** 만들기 연결 단계의 거름 항목(§4.3 B.35 ①②) — 묶음에서 라이브러리 같은 값 묶음을 빼고, 묶음이 0개인 토큰은 뺀다. */
export function onlyItems(tokens: readonly LibSameToken[], libs: readonly LibSameVar[]): { value: string | number; alpha?: number; groups: string[] }[] {
  const out: { value: string | number; alpha?: number; groups: string[] }[] = [];
  for (const tk of tokens) {
    const lib = new Set(libSameGroups(tk, libs));
    const groups = tokenGroups(tk).filter((k) => !lib.has(k));
    if (!groups.length) continue;
    out.push({ value: tk.value, ...(tk.alpha != null && tk.alpha < 1 ? { alpha: tk.alpha } : {}), groups });
  }
  return out;
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
