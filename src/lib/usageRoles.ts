/* ============================================================
   usageRoles.ts — 쓰임 이름 역할(§2.12, 순수 · figma 의존 없음)
   레이어에는 역할(Semantic)만 붙인다. 같은 값의 역할이 없으면 "어디에 쓰였나"로 이름을 짓는다.
   - 숫자 · 글자: `{그룹}/{속성}` — 주인(레이어 역할)은 쓰지 않는다(12.12 N-D1). 속성이 없으면 `{그룹}/default`
   - 색: `color/{쓰임}/{밝기}` (12.4)
   - 꼬리: 같은 이름에 다른 값이 오면 뜻이 읽히는 꼬리(`-sm` · `-lg`, `brand-red` · `-subtle`, `subtler`, 같은 색 투명도만 다르면 `-subtle` · `-strong`), 모자라면 `-n` (12.5)
   만들기(createUsageRoles)와 연결(bind.ts)이 같은 함수를 쓴다 — 두 경로의 이름이 어긋나지 않게.
   ============================================================ */
import { hexToOklch } from './color';
import { LOW_CHROMA } from './palette';
import { VECTOR_TYPES } from './nodePaint';
import { colorKey } from './tokens';
import { classifyColor } from './colorName';

/** 주인으로 쓰지 않는 구조 폴백 역할(12.3 ①). */
const STRUCTURAL = new Set(['container', 'wrapper', 'stack-x', 'stack-y', 'shape', 'group', 'content', 'body', 'row', 'text-group', 'media']); // 세분화 1차 역할 · 오토레이아웃 묶음(12.12 N-D6)도 주인 아님(ia-v4 §4.4)

/**
 * 레이어의 주인(역할) — ① 이름 정리가 남긴 역할(어휘 안 · 구조 폴백 아님) ② 고신뢰 판정 ③ 없음.
 * 쓰임 이름에는 쓰지 않는다(12.12 N-D1) — 텍스트 스타일 label 판정(`inUiRole`)이 쓴다.
 * `known`은 역할 어휘 판정(naming.isKnownRole)을 넘겨받는다(순수 모듈이 naming을 끌어오지 않게).
 */
export function pickOwner(dsRole: string | undefined, highConfidence: string | null | undefined, known: (r: string) => boolean): string | undefined {
  if (dsRole && known(dsRole) && !STRUCTURAL.has(dsRole)) return dsRole;
  return highConfidence ?? undefined;
}

/** `{그룹}/{속성}` — 속성이 없으면 `{그룹}/default`(12.12 N-D1 — 주인을 쓰지 않는다). */
export function composeName(group: string, prop: string | undefined): string {
  return prop ? `${group}/${prop}` : `${group}/default`;
}

/** 알약 반경 값(12.12 N-D5) — 알약 모서리는 이 값으로 세고 이름 짓고(`radius/full`) 붙인다. */
export const PILL_RADIUS = 9999;

/** 알약 모서리인가 — 반경이 레이어 짧은 변의 절반 이상(화면에서 모두 같은 알약 모양, 12.12 N-D5). 0은 아니다. */
export function isPillRadius(v: number, width: number, height: number): boolean {
  const short = Math.min(width, height);
  return v > 0 && Number.isFinite(short) && v >= short / 2;
}

/** 모서리 값 → 알약 모서리를 9999로 바꾼 값(12.12 N-D5 — 이름은 바꾼 뒤의 값으로 정한다). */
export function pillCorners(values: readonly number[], width: number, height: number): number[] {
  return values.map((v) => (isPillRadius(v, width, height) ? PILL_RADIUS : v));
}

const near = (a: number, b: number): boolean => Math.abs(a - b) < 0.005;

/** 여백 네 방향 값(연결 판단은 화면 값 기준). */
export interface Padding {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/** 여백 필드의 속성 이름 — 넷이 같으면 padding, 짝이 같으면 padding-x · padding-y, 아니면 방향별. */
export function paddingProp(field: string, p: Padding): string {
  if (near(p.left, p.right) && near(p.top, p.bottom) && near(p.left, p.top)) return 'padding';
  if (field === 'paddingLeft' || field === 'paddingRight') return near(p.left, p.right) ? 'padding-x' : field === 'paddingLeft' ? 'padding-left' : 'padding-right';
  return near(p.top, p.bottom) ? 'padding-y' : field === 'paddingTop' ? 'padding-top' : 'padding-bottom';
}

const CORNER_SUFFIX: Record<string, string> = {
  topLeftRadius: 'top-left',
  topRightRadius: 'top-right',
  bottomLeftRadius: 'bottom-left',
  bottomRightRadius: 'bottom-right',
};
const SIDE_SUFFIX: Record<string, string> = {
  strokeTopWeight: 'top',
  strokeRightWeight: 'right',
  strokeBottomWeight: 'bottom',
  strokeLeftWeight: 'left',
};

/** 연결되는 값(> 0)끼리 모두 같은가. */
function allSame(values: readonly number[]): boolean {
  const live = values.filter((v) => v > 0);
  return live.every((v) => near(v, live[0]));
}

/**
 * 모서리 이름 — 연결되는 모서리가 모두 같으면 `radius/default`(모두 알약 9999면 `radius/full`), 아니면 모서리마다.
 * `corners`는 알약 모서리를 9999로 바꾼 값(`pillCorners`, 12.12 N-D5).
 */
export function radiusName(field: string, corners: readonly number[]): string {
  if (allSame(corners)) {
    const live = corners.filter((v) => v > 0);
    return live.length && near(live[0], PILL_RADIUS) ? 'radius/full' : composeName('radius', undefined);
  }
  return `radius/${CORNER_SUFFIX[field] ?? 'default'}`;
}

/** 선 두께 이름 — strokeWeight 하나거나 방향별이 모두 같으면 `stroke-width/default`, 아니면 방향마다. */
export function strokeName(field: string, sides: readonly number[]): string {
  if (field === 'strokeWeight' || allSame(sides)) return composeName('stroke-width', undefined);
  return `stroke-width/${SIDE_SUFFIX[field] ?? 'default'}`;
}

/** 여백 · 간격 · 불투명도 · 크기처럼 속성 이름이 고정인 필드. */
export function simpleNumericName(field: string, sizeKind?: 'icon' | 'avatar' | null): string | null {
  switch (field) {
    case 'itemSpacing':
      return composeName('spacing', 'gap');
    case 'counterAxisSpacing':
    case 'gridRowGap':
      return composeName('spacing', 'row-gap');
    case 'gridColumnGap':
      return composeName('spacing', 'column-gap');
    case 'opacity':
      return composeName('opacity', undefined);
    case 'width':
    case 'height':
      return sizeKind ? `size/${sizeKind}` : null;
    default:
      return null;
  }
}

/** 글자 필드 → 그룹(12.3). */
export const TEXT_GROUP: Record<string, string> = {
  fontSize: 'font-size',
  lineHeight: 'line-height',
  letterSpacing: 'letter-spacing',
  fontFamily: 'font-family',
};

/** 글자 필드의 쓰임 이름 — 주인은 쓰지 않는다(이름 정리가 TEXT에 역할을 남기지 않음). */
export function textUsageName(field: string): string | null {
  const g = TEXT_GROUP[field];
  return g ? `${g}/text` : null;
}

export type ColorUse = 'text' | 'icon' | 'background' | 'border' | 'shadow';

/**
 * 색 쓰임(12.4). TEXT 채움 → text, 벡터의 채움 · 선과 아이콘 틀 안 도형(RECTANGLE · ELLIPSE)의 채움 · 선 → icon,
 * 그 밖 채움 → background, 그 밖 선 → border, 효과 → shadow. 프레임류는 아이콘 틀 자신이어도 background · border.
 */
export function colorUse(nodeType: string, field: 'fills' | 'strokes' | 'effects', insideIconFrame: boolean): ColorUse {
  if (field === 'effects') return 'shadow';
  if (nodeType === 'TEXT' && field === 'fills') return 'text';
  if (VECTOR_TYPES.has(nodeType)) return 'icon';
  if (insideIconFrame && (nodeType === 'RECTANGLE' || nodeType === 'ELLIPSE')) return 'icon';
  return field === 'fills' ? 'background' : 'border';
}

/* ---------- 색 밝기 이름 (12.4) ---------- */

/** 배경 종류(12.4) — 유채색 · 어두움(L < 0.5) · 밝음. 모르면 없음. */
export type BgKind = 'chroma' | 'dark' | 'light';

export interface ColorCount {
  hex: string;
  count: number;
  /** 그 자리의 배경 종류(`backgroundOf`). 모르면 없음. */
  bg?: BgKind;
  /** 색 투명도(소수 둘째 자리) — 1이면 없음. 밝기는 hex로만, 키는 투명도까지 나눈다. */
  alpha?: number;
}

/** 색 하나의 배경 종류(유채색이면 chroma, 아니면 L 0.5 기준). */
export function bgKindOf(hex: string): BgKind {
  const o = hexToOklch(hex);
  if (o.c >= LOW_CHROMA) return 'chroma';
  return o.l < 0.5 ? 'dark' : 'light';
}

/** colorRoleBases 결과의 찾기 키 — (색 값 키, 배경 종류). 배경을 모르면 색 값 키만. 투명도 1이면 키는 hex. */
export function colorSlotKey(hex: string, bg?: BgKind, alpha?: number): string {
  const k = colorKey(hex, alpha);
  return bg ? `${k}|${bg}` : k;
}

/** inverse가 있는 쓰임(배경 위에 놓이는 색). */
const INVERSE_USES = new Set(['text', 'icon', 'border']);

const byCountThenHex = (a: { hex: string; count: number }, b: { hex: string; count: number }): number =>
  b.count - a.count || (a.hex < b.hex ? -1 : a.hex > b.hex ? 1 : 0);

/**
 * 한 쓰임의 색들 → 번호 없는 밝기 이름(default · subtle · strong · inverse · brand), 키는 `colorSlotKey(hex, bg, alpha)`.
 * 밝기 판정은 hex로만 — 같은 hex · 다른 투명도는 같은 자리를 받고 assignNames가 투명도 단계(-subtle · -strong)로 가른다(§2.11 "반투명 색 토큰").
 * 기준색: `existingDefaultHex`(`color/{쓰임}/default`가 이미 있으면 그 색), 없으면 쓰임별 기준값(`colorRoleRef` — 12.12 N-D4).
 * 판정 순서: default → inverse(합친 판정) → brand(유채) → subtle · strong.
 * inverse(12.4 합친 판정, `use`가 text · icon · border일 때만 — 없으면 판정한다):
 *   1. 기준색이 극단(L < 0.35 또는 ≥ 0.85) 2. 그 색이 반대쪽 극단 3. 배경 종류가 있고 chroma이거나 기준과 같은 쪽.
 * 같은 이름 후보가 여럿이면 번호는 assignNames가 붙인다.
 */
/**
 * 12.4 기준색 hex — 이미 있는 default 값(색 값 키여도 hex만), 없으면 쓰임별 기준값(12.12 N-D4):
 * background = 불투명 무채색 중 가장 밝은 색(OKLCH L 최대), text · icon = 불투명 무채색 중 가장 진한 색(L 최소) — 같으면 곳 수 · hex 순.
 * 그 밖의 쓰임(border · shadow · 모름)이나 불투명 무채색이 없으면 hex별 곳 수 합이 가장 많은 색(같으면 hex 순). 12.5 사다리의 기준.
 */
export function colorRoleRef(colors: readonly ColorCount[], existingDefaultHex?: string, use?: string): string | undefined {
  if (existingDefaultHex) return existingDefaultHex.split('@')[0].toLowerCase();
  const totals = new Map<string, number>();
  const opaque = new Set<string>(); // 불투명(투명도 1)으로 쓰인 hex
  for (const c of colors) {
    const hex = c.hex.toLowerCase();
    totals.set(hex, (totals.get(hex) ?? 0) + c.count);
    if (c.alpha == null || c.alpha >= 1) opaque.add(hex);
  }
  const all = [...totals].map(([hex, count]) => ({ hex, count }));
  if (use === 'background' || use === 'text' || use === 'icon') {
    const neutral = all.filter((x) => opaque.has(x.hex) && hexToOklch(x.hex).c < LOW_CHROMA);
    if (neutral.length) {
      const sign = use === 'background' ? -1 : 1; // 배경은 L 큰 쪽, 글자 · 아이콘은 L 작은 쪽
      return neutral.sort((a, b) => sign * (lOf(a.hex) - lOf(b.hex)) || byCountThenHex(a, b))[0].hex;
    }
  }
  return all.sort(byCountThenHex)[0]?.hex;
}

export function colorRoleBases(colors: readonly ColorCount[], existingDefaultHex?: string, use?: string): Map<string, string> {
  const out = new Map<string, string>();
  const refHex = colorRoleRef(colors, existingDefaultHex, use);
  if (!refHex) return out;
  const ref = hexToOklch(refHex);
  const refDark = ref.l < 0.35;
  const refExtreme = refDark || ref.l >= 0.85;
  const sameSide: BgKind = ref.l < 0.5 ? 'dark' : 'light';
  const inverseUse = use == null || INVERSE_USES.has(use);
  for (const c of colors) {
    const hex = c.hex.toLowerCase();
    const key = colorSlotKey(hex, c.bg, c.alpha);
    if (hex === refHex) {
      out.set(key, 'default');
      continue;
    }
    const o = hexToOklch(hex);
    const opposite = refDark ? o.l >= 0.85 : o.l < 0.35;
    if (inverseUse && refExtreme && opposite && c.bg && (c.bg === 'chroma' || c.bg === sameSide)) {
      out.set(key, 'inverse');
      continue;
    }
    if (o.c >= LOW_CHROMA) {
      out.set(key, 'brand');
      continue;
    }
    out.set(key, o.l > ref.l ? 'subtle' : 'strong');
  }
  return out;
}

/* ---------- 이름 꼬리 (12.5) ---------- */

/**
 * 기본 이름의 종류(12.5 표). number = 숫자 쓰임, leading = 줄 높이 · 자간(꼬리 `-tight` · `-loose`, 12.12 N-D3),
 * plain = 크기 없는 값(글꼴 · `radius/full` — 12.12 N-D5), chroma = `…/brand`,
 * ladder = `…/subtle` · `…/strong`, inverse = `…/inverse`, default = `…/default`.
 */
export type NameKind = 'number' | 'leading' | 'plain' | 'chroma' | 'ladder' | 'inverse' | 'default';

/** 기본 이름 · 값 모양으로 종류를 정한다. */
export function nameKindOf(base: string, value: string): NameKind {
  if (base.startsWith('color/')) {
    const last = base.slice(base.lastIndexOf('/') + 1);
    if (last === 'brand') return 'chroma';
    if (last === 'subtle' || last === 'strong') return 'ladder';
    if (last === 'inverse') return 'inverse';
    return 'default';
  }
  if (base === 'radius/full') return 'plain'; // 값이 언제나 9999 하나(12.12 N-D5)
  if (value === '' || Number.isNaN(Number(value))) return 'plain';
  return base.startsWith('line-height/') || base.startsWith('letter-spacing/') ? 'leading' : 'number';
}

const SIZE_SMALL = ['sm', 'xs', '2xs'];
const SIZE_LARGE = ['lg', 'xl', '2xl'];
/** 줄 높이 · 자간 꼬리(12.12 N-D3). */
const TIGHT = ['tight', 'tighter', 'tightest'];
const LOOSE = ['loose', 'looser', 'loosest'];
/** `{그룹}/default` 숫자 이름 — 꼬리는 마지막 마디를 바꾼다(`radius/sm`, 12.12 N-D1). 그 밖은 끝에 붙인다. */
const isDefaultTail = (base: string): boolean => base.endsWith('/default');
/** 숫자 꼬리 후보 이름 — `{그룹}/default`면 `{그룹}/{말}`, 아니면 `{기본}-{말}`. */
const tailName = (base: string, word: string): string => (isDefaultTail(base) ? `${base.slice(0, base.lastIndexOf('/'))}/${word}` : `${base}-${word}`);
const LIGHTER = ['subtle', 'subtler', 'subtlest'];
const DARKER = ['strong', 'stronger', 'strongest'];
const LADDER_WORDS = [...LIGHTER, ...DARKER];
const FAMILIES = ['red', 'orange', 'yellow', 'green', 'teal', 'blue', 'indigo', 'purple', 'pink'];

const esc = (x: string): string => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * 가족 판정(12.5 "가족") — 그 기본 이름에서 문법 `{기본}{-꼬리}{-투명도 단계}{-n}`으로 만들 수 있는 이름만(예전 `-a{%}`도 포함 — 새로 만들지는 않음).
 * 표 밖의 말(`padding-x` · `-top-left` · `brand-bold`)은 가족이 아니다.
 */
export function familyRe(base: string, kind: NameKind): RegExp {
  const lad = LADDER_WORDS.join('|');
  // 투명도 단계(12.5, 한 번) 또는 예전 구현의 -a{%}(재사용 · 차지 판정만), 그 뒤 -n
  const tail = `(?:-(?:${lad})|-a\\d+)?(?:-\\d+)?$`;
  switch (kind) {
    case 'number':
    case 'leading': {
      const words = (kind === 'leading' ? [...TIGHT, ...LOOSE] : [...SIZE_SMALL, ...SIZE_LARGE]).join('|');
      // `{그룹}/default`의 가족은 `{그룹}/{default · 크기 말}`과 그 -n(12.12 N-D1 — `radius/full` · `radius/top-left`는 아님)
      if (isDefaultTail(base)) return new RegExp(`^${esc(base.slice(0, base.lastIndexOf('/')))}/(?:default|${words})(?:-\\d+)?$`);
      return new RegExp(`^${esc(base)}(?:-(?:${words}))?(?:-\\d+)?$`);
    }
    case 'plain':
      return new RegExp(`^${esc(base)}(?:-\\d+)?$`);
    case 'default':
      return new RegExp(`^${esc(base)}${tail}`);
    case 'inverse':
      return new RegExp(`^${esc(base)}(?:-(?:${lad}))?${tail}`);
    case 'chroma':
      return new RegExp(`^${esc(base)}(?:-(?:${FAMILIES.join('|')})(?:-(?:${lad}))?|-(?:${lad}))?${tail}`);
    case 'ladder': {
      const i = base.lastIndexOf('/');
      const words = base.slice(i + 1) === 'strong' ? DARKER : LIGHTER;
      return new RegExp(`^${esc(base.slice(0, i))}/(?:${words.join('|')})${tail}`);
    }
  }
}

/** 가족 순서(12.5) — 기본 이름 → 꼬리 이름(이름 순) → `-n` 이름(번호 작은 순). */
export function familyRank(name: string, base: string): [number, number, string] {
  if (name === base) return [0, 0, ''];
  const m = /-(\d+)$/.exec(name);
  return m ? [2, Number(m[1]), name] : [1, 0, name];
}
export function byFamilyOrder(base: string): (a: string, b: string) => number {
  return (a, b) => {
    const x = familyRank(a, base);
    const y = familyRank(b, base);
    return x[0] - y[0] || x[1] - y[1] || (x[2] < y[2] ? -1 : x[2] > y[2] ? 1 : 0);
  };
}

export interface NameRequest {
  /** 기본 이름(예: spacing/card/gap). */
  base: string;
  /** 값 키(숫자는 소수 둘째 자리 문자열, 색은 색 값 키 `#rrggbb` · `#rrggbb@0.08`, 글꼴은 이름). */
  value: string;
  /** 곳 수 — 누가 기본 이름(기준)을 받나만 정한다. */
  count: number;
  /** 종류(없으면 nameKindOf). */
  kind?: NameKind;
  /** 사다리의 기준색 hex(12.4 default). */
  refHex?: string;
}

export interface AssignOptions {
  /** false면 재사용하지 않는다(연결 순서 4 — 차지 판정만). 기본 true. */
  reuse?: boolean;
  /** 이 이름의 같은 값 변수를 재사용해도 되나(같은 값 · 맞는 용도 · 거울 아님). 없으면 된다. */
  canReuse?: (name: string, value: string, base: string) => boolean;
}

const hexOfKey = (v: string): string => v.split('@')[0].toLowerCase();
const alphaOfKey = (v: string): number | undefined => (v.includes('@') ? Number(v.split('@')[1]) : undefined);
const lOf = (hex: string): number => hexToOklch(hex).l;
const famOf = (hex: string): string => classifyColor(hex).family;
const cmpStr = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/**
 * 요청마다 최종 이름을 정한다(§2.12 12.5). `existing`: 이미 있는 Semantic 이름 → 값 키(못 읽으면 빈 배열, 13.5 순서).
 * - 먼저 재사용: 가족 안 같은 값(canReuse) → 가족 순서 첫 이름.
 * - 없으면 후보 목록의 비어 있는 첫 이름, 다 차면 되돌림(마지막 후보 + `-n`).
 * 반환 키는 `${base}\u0000${value}`.
 */
export function assignNames(requests: readonly NameRequest[], existing: ReadonlyMap<string, string | readonly string[]>, opts: AssignOptions = {}): Map<string, string> {
  const out = new Map<string, string>();
  const groups = new Map<string, { kind: NameKind; refHex?: string; values: Map<string, number> }>();
  for (const r of requests) {
    let g = groups.get(r.base);
    if (!g) groups.set(r.base, (g = { kind: r.kind ?? nameKindOf(r.base, r.value), refHex: r.refHex, values: new Map() }));
    if (r.refHex && !g.refHex) g.refHex = r.refHex;
    g.values.set(r.value, (g.values.get(r.value) ?? 0) + r.count);
  }
  const taken = new Map<string, readonly string[]>([...existing].map(([n, v]) => [n, typeof v === 'string' ? (v ? [v] : []) : v]));
  const canReuse = opts.canReuse ?? ((): boolean => true);
  for (const [base, g] of groups) {
    const fam = familyRe(base, g.kind);
    const left: string[] = [];
    // 재사용(12.5 "먼저")
    for (const value of g.values.keys()) {
      if (opts.reuse !== false) {
        const names = [...taken].filter(([n, v]) => fam.test(n) && v.includes(value) && canReuse(n, value, base)).map(([n]) => n).sort(byFamilyOrder(base));
        if (names.length) {
          out.set(`${base}\u0000${value}`, names[0]);
          continue;
        }
      }
      left.push(value);
    }
    if (!left.length) continue;
    const assign = (value: string, name: string): void => {
      out.set(`${base}\u0000${value}`, name);
      const arr = taken.get(name);
      taken.set(name, arr ? [...arr, value] : [value]);
    };
    const fallback = (name: string): string => {
      for (let i = 2; ; i++) if (!taken.has(`${name}-${i}`)) return `${name}-${i}`;
    };
    if (g.kind === 'number' || g.kind === 'leading') assignNumbers(base, g.kind, g.values, left, taken, assign, fallback);
    else if (g.kind === 'plain') {
      for (const value of sortByCount(left, g.values)) assign(value, taken.has(base) ? fallback(base) : base);
    } else assignColors(base, g.kind, g.refHex, g.values, left, taken, assign, fallback);
  }
  return out;
}

function sortByCount(values: readonly string[], counts: ReadonlyMap<string, number>): string[] {
  return [...values].sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0) || cmpValue(a, b));
}

type Taken = Map<string, readonly string[]>;

/** 기본 이름의 읽을 수 있는 첫 값(13.5 순서) — 없으면 undefined. */
function holderValue(taken: Taken, name: string): string | undefined {
  const v = taken.get(name);
  return v && v.length ? v[0] : undefined;
}

function assignNumbers(base: string, kind: NameKind, counts: ReadonlyMap<string, number>, left: string[], taken: Taken, assign: (v: string, n: string) => void, fallback: (n: string) => string): void {
  let rest = sortByCount(left, counts);
  let ref: number;
  const held = holderValue(taken, base);
  if (held != null && !Number.isNaN(Number(held))) ref = Number(held);
  else {
    const first = rest[0];
    rest = rest.slice(1);
    ref = Number(first);
    assign(first, taken.has(base) ? fallback(base) : base);
  }
  const side = (vals: string[], words: string[]): void => {
    const sorted = [...vals].sort((a, b) => Math.abs(Number(a) - ref) - Math.abs(Number(b) - ref) || Number(a) - Number(b));
    for (const v of sorted) {
      const free = words.map((w) => tailName(base, w)).find((n) => !taken.has(n));
      assign(v, free ?? fallback(tailName(base, words[words.length - 1])));
    }
  };
  const same = rest.filter((v) => Math.abs(Number(v) - ref) < 0.005);
  for (const v of same) assign(v, fallback(base)); // 기준과 같은 값 · 재사용 불가 → {기본}-n
  const lead = kind === 'leading';
  side(rest.filter((v) => Number(v) < ref - 0.0049), lead ? TIGHT : SIZE_SMALL);
  side(rest.filter((v) => Number(v) > ref + 0.0049), lead ? LOOSE : SIZE_LARGE);
}

/**
 * 색 종류(chroma · ladder · inverse · default)의 이름 — hex마다 자리 이름을 먼저 정하고, 한 자리의 투명도 값들은 투명도 단계(-subtle · -strong)로 가른다(12.5).
 * 자리 N이 비었나: N이 다른 hex의 값으로 있거나 값을 못 읽거나 이번에 다른 hex가 받았으면 차 있다.
 */
function assignColors(base: string, kind: NameKind, refHex: string | undefined, counts: ReadonlyMap<string, number>, left: string[], taken: Taken, assign: (v: string, n: string) => void, fallback: (n: string) => string): void {
  const slotOf = new Map<string, string>(); // hex → 자리 이름
  const slotAssigned = new Set<string>(); // 이번에 값 이름으로 실제 받은 자리 이름
  const slotOwner = new Map<string, string>(); // 자리 이름 → hex(이번에 정함)
  const slotFree = (name: string, hex: string): boolean => {
    const own = slotOwner.get(name);
    if (own) return own === hex;
    const v = taken.get(name);
    if (!v) return true;
    return v.length > 0 && v.every((x) => hexOfKey(x) === hex);
  };
  const setSlot = (hex: string, name: string): void => {
    slotOf.set(hex, name);
    slotOwner.set(name, hex);
  };
  // hex별 곳 수(투명도 합침)
  const hexCount = new Map<string, number>();
  for (const v of left) hexCount.set(hexOfKey(v), (hexCount.get(hexOfKey(v)) ?? 0) + (counts.get(v) ?? 0));
  const hexes = [...hexCount.keys()].sort((a, b) => (hexCount.get(b) ?? 0) - (hexCount.get(a) ?? 0) || cmpStr(a, b));
  const fellBack = new Set<string>(); // 자리가 되돌림인 hex(후보가 다 차서 마지막 후보를 나눠 씀)
  const pick = (hex: string, cands: string[]): void => {
    const free = cands.find((n) => slotFree(n, hex));
    if (!free) fellBack.add(hex);
    setSlot(hex, free ?? cands[cands.length - 1]); // 다 차면 마지막 후보(아래에서 -n)
  };
  const ladderSide = (list: string[], refL: number, prefix: string): void => {
    const lighter = list.filter((h) => lOf(h) > refL).sort((a, b) => Math.abs(lOf(a) - refL) - Math.abs(lOf(b) - refL) || cmpStr(a, b));
    const darker = list.filter((h) => lOf(h) <= refL).sort((a, b) => Math.abs(lOf(a) - refL) - Math.abs(lOf(b) - refL) || cmpStr(a, b));
    for (const h of lighter) pick(h, LIGHTER.map((w) => `${prefix}-${w}`));
    for (const h of darker) pick(h, DARKER.map((w) => `${prefix}-${w}`));
  };
  if (kind === 'ladder') {
    const i = base.lastIndexOf('/');
    const words = base.slice(i + 1) === 'strong' ? DARKER : LIGHTER;
    const refL = refHex ? lOf(refHex) : 0;
    const sorted = [...hexes].sort((a, b) => Math.abs(lOf(a) - refL) - Math.abs(lOf(b) - refL) || cmpStr(a, b));
    for (const h of sorted) pick(h, words.map((w) => `${base.slice(0, i)}/${w}`));
  } else if (kind === 'default') {
    for (const h of hexes) pick(h, [base]);
  } else {
    // 기준(chroma · inverse): 기본 이름의 값 → 없으면 곳 수 첫 hex
    const held = holderValue(taken, base);
    let rest = hexes;
    let refH: string;
    if (held) refH = hexOfKey(held);
    else {
      refH = hexes[0];
      rest = hexes.slice(1);
      pick(refH, [base]);
    }
    if (kind === 'inverse') ladderSide(rest.filter((h) => h !== refH), lOf(refH), base);
    else {
      const refFam = famOf(refH);
      ladderSide(rest.filter((h) => h !== refH && famOf(h) === refFam), lOf(refH), base);
      const byFam = new Map<string, string[]>();
      for (const h of rest) {
        if (h === refH || famOf(h) === refFam) continue;
        const f = famOf(h);
        byFam.set(f, [...(byFam.get(f) ?? []), h]);
      }
      for (const [f, list] of byFam) {
        const famName = `${base}-${f}`;
        const famHeld = holderValue(taken, famName);
        let famRef: string;
        let others = list;
        if (famHeld) famRef = hexOfKey(famHeld);
        else {
          famRef = list[0]; // hexes가 곳 수 순이라 첫 값
          others = list.slice(1);
          pick(famRef, [famName]);
        }
        ladderSide(others.filter((h) => h !== famRef), lOf(famRef), famName);
      }
    }
    // 기준과 같은 hex인데 재사용 못 한 값: 자리는 기본 이름(같은 hex)
    if (held && rest.includes(refH) && !slotOf.has(refH)) setSlot(refH, base);
  }
  // 값마다(12.5 "투명도 단계"): 자리 기준이 자리 이름, 더 투명 -subtle…, 덜 투명 -strong…, 다 차면 -n.
  const alphaOf = (v: string): number => alphaOfKey(v) ?? 1;
  const byHex = new Map<string, string[]>();
  for (const v of left) byHex.set(hexOfKey(v), [...(byHex.get(hexOfKey(v)) ?? []), v]);
  const nameFree = (n: string, hex: string): boolean => !taken.has(n) && (!slotOwner.has(n) || slotOwner.get(n) === hex);
  for (const [hex, vals] of byHex) {
    const slot = slotOf.get(hex) ?? base;
    const fb = fellBack.has(hex);
    const order = [...vals].sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0) || alphaOf(b) - alphaOf(a) || cmpValue(a, b));
    // 자리 기준: 파일의 자리 이름이 같은 hex면 그 값(되돌림 자리는 보지 않음), 아니면 곳 수 첫 값
    const fileVals = !fb ? taken.get(slot) : undefined;
    const held = fileVals && fileVals.length && fileVals.every((x) => hexOfKey(x) === hex) && !slotAssigned.has(slot) ? fileVals[0] : undefined;
    let refA: number;
    let rest = order;
    if (held != null) refA = alphaOf(held);
    else {
      const first = order[0];
      rest = order.slice(1);
      refA = alphaOf(first);
      assign(first, fb || taken.has(slot) ? fallback(slot) : slot);
      slotAssigned.add(slot);
    }
    const side = (list: string[], words: string[]): void => {
      const sorted = [...list].sort((a, b) => Math.abs(alphaOf(a) - refA) - Math.abs(alphaOf(b) - refA) || alphaOf(a) - alphaOf(b));
      sorted.forEach((v, i) => {
        const cands = words.map((w) => `${slot}-${w}`);
        if (fb) {
          assign(v, fallback(cands[Math.min(i, cands.length - 1)]));
          return;
        }
        const free = cands.find((n) => nameFree(n, hex));
        assign(v, free ?? fallback(cands[cands.length - 1]));
      });
    };
    for (const v of rest.filter((x) => Math.abs(alphaOf(x) - refA) < 0.005)) assign(v, fallback(slot)); // 자리 기준과 같은 값 · 재사용 불가 → N-n
    side(rest.filter((x) => alphaOf(x) < refA - 0.0049), LIGHTER);
    side(rest.filter((x) => alphaOf(x) > refA + 0.0049), DARKER);
  }
}

function cmpValue(a: string, b: string): number {
  const na = Number(a);
  const nb = Number(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
  return a < b ? -1 : a > b ? 1 : 0;
}

/* ---------- 옛 이름 (12.7) ---------- */
/** 단계 이름(12.7) — 사다리 · 상대 순위(tshirtRoles)가 만든 이름과 그 `-N` 변형. */
const OLD_LADDER = /^(spacing|radius|size|stroke-width)\/(none|3xs|2xs|xs|sm|md|lg|xl|2xl|3xl|4xl|full|thin|thick)(-\d+)?$/;
const OLD_COLOR = new Set(['color/background/default', 'color/text/default', 'color/border/default', 'color/background/brand']);

/** 옛 플러그인 이름인가(순서 3 "디자이너가 만든 것"에서 뺀다). 옛 색 4개는 순서 2에서는 쓴다. */
export function isOldPluginName(name: string): boolean {
  return OLD_LADDER.test(name) || OLD_COLOR.has(name);
}

/** 값 키 — 숫자는 소수 둘째 자리, 색은 소문자 hex(반투명은 색 값 키 `#rrggbb@0.08` 그대로). */
export function valueKey(v: number | string): string {
  return typeof v === 'number' ? String(Math.round(v * 100) / 100) : v.toLowerCase();
}

/** 플러그인이 만든 역할에 남기는 변수 플러그인 데이터 키(12.6). */
export const AUTO_ROLE_KEY = 'dsl.autoRole';

/**
 * 텍스트 스타일 등록이 크기 단계(`step`)로 지은 역할 변수의 표시(12.12 N-D2) — 값 = 그 크기 단계 이름(예 `body/large-18`).
 * 옛 규칙 변수(스타일 이름 전체 · 표시 없음)와 이름이 같을 수 있어 옛 · 새는 이 표시로 가른다.
 */
export const TEXT_STEP_KEY = 'dsl.textStep';
