/* ============================================================
   usageRoles.ts — 쓰임 이름 역할(§2.12, 순수 · figma 의존 없음)
   레이어에는 역할(Semantic)만 붙인다. 같은 값의 역할이 없으면 "어디에 쓰였나"로 이름을 짓는다.
   - 숫자 · 글자: `{그룹}/{주인}/{속성}` (12.3)
   - 색: `color/{쓰임}/{밝기}` (12.4)
   - 꼬리: 같은 이름에 다른 값이 오면 뜻이 읽히는 꼬리(`-sm` · `-lg`, `brand-red` · `-subtle`, `subtler`, `-a8`), 모자라면 `-n` (12.5)
   만들기(createUsageRoles)와 연결(bind.ts)이 같은 함수를 쓴다 — 두 경로의 이름이 어긋나지 않게.
   ============================================================ */
import { hexToOklch } from './color';
import { LOW_CHROMA } from './palette';
import { VECTOR_TYPES } from './nodePaint';
import { alphaPct, colorKey } from './tokens';
import { classifyColor } from './colorName';

/** 주인으로 쓰지 않는 구조 폴백 역할(12.3 ①). */
const STRUCTURAL = new Set(['container', 'wrapper', 'shape', 'group', 'content', 'body']);

/**
 * 레이어의 주인(역할) — ① 이름 정리가 남긴 역할(어휘 안 · 구조 폴백 아님) ② 고신뢰 판정 ③ 없음.
 * `known`은 역할 어휘 판정(naming.isKnownRole)을 넘겨받는다(순수 모듈이 naming을 끌어오지 않게).
 */
export function pickOwner(dsRole: string | undefined, highConfidence: string | null | undefined, known: (r: string) => boolean): string | undefined {
  if (dsRole && known(dsRole) && !STRUCTURAL.has(dsRole)) return dsRole;
  return highConfidence ?? undefined;
}

/** `{그룹}/{주인}/{속성}` — 빠진 칸은 줄이고, 둘 다 없으면 `{그룹}/default`. */
export function composeName(group: string, owner: string | undefined, prop: string | undefined): string {
  if (owner && prop) return `${group}/${owner}/${prop}`;
  if (prop) return `${group}/${prop}`;
  if (owner) return `${group}/${owner}`;
  return `${group}/default`;
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

/** 모서리 이름 — 연결되는 모서리가 모두 같으면 `radius/{주인}`, 아니면 모서리마다. */
export function radiusName(field: string, owner: string | undefined, corners: readonly number[]): string {
  if (allSame(corners)) return composeName('radius', owner, undefined);
  const suf = CORNER_SUFFIX[field] ?? 'default';
  return owner ? `radius/${owner}-${suf}` : `radius/${suf}`;
}

/** 선 두께 이름 — strokeWeight 하나거나 방향별이 모두 같으면 `stroke-width/{주인}`, 아니면 방향마다. */
export function strokeName(field: string, owner: string | undefined, sides: readonly number[]): string {
  if (field === 'strokeWeight' || allSame(sides)) return composeName('stroke-width', owner, undefined);
  const suf = SIDE_SUFFIX[field] ?? 'default';
  return owner ? `stroke-width/${owner}-${suf}` : `stroke-width/${suf}`;
}

/** 여백 · 간격 · 불투명도 · 크기처럼 속성 이름이 고정인 필드. */
export function simpleNumericName(field: string, owner: string | undefined, sizeKind?: 'icon' | 'avatar' | null): string | null {
  switch (field) {
    case 'itemSpacing':
      return composeName('spacing', owner, 'gap');
    case 'counterAxisSpacing':
    case 'gridRowGap':
      return composeName('spacing', owner, 'row-gap');
    case 'gridColumnGap':
      return composeName('spacing', owner, 'column-gap');
    case 'opacity':
      return composeName('opacity', owner, undefined);
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
 * 밝기 판정은 hex로만 — 같은 hex · 다른 투명도는 같은 이름을 받고 assignNames가 투명도 꼬리(-a{%})를 붙인다(§2.11 "반투명 색 토큰").
 * 기준색: `existingDefaultHex`(`color/{쓰임}/default`가 이미 있으면 그 색), 없으면 hex별 곳 수 합이 가장 많은 색
 * (같으면 hex 순). 판정 순서: default → inverse(합친 판정) → brand(유채) → subtle · strong.
 * inverse(12.4 합친 판정, `use`가 text · icon · border일 때만 — 없으면 판정한다):
 *   1. 기준색이 극단(L < 0.35 또는 ≥ 0.85) 2. 그 색이 반대쪽 극단 3. 배경 종류가 있고 chroma이거나 기준과 같은 쪽.
 * 같은 이름 후보가 여럿이면 번호는 assignNames가 붙인다.
 */
/** 12.4 기준색 hex — 이미 있는 default 값(색 값 키여도 hex만), 없으면 hex별 곳 수 합이 가장 많은 색(같으면 hex 순). 12.5 사다리의 기준. */
export function colorRoleRef(colors: readonly ColorCount[], existingDefaultHex?: string): string | undefined {
  const totals = new Map<string, number>();
  for (const c of colors) totals.set(c.hex.toLowerCase(), (totals.get(c.hex.toLowerCase()) ?? 0) + c.count);
  const top = [...totals].map(([hex, count]) => ({ hex, count })).sort(byCountThenHex)[0];
  return (existingDefaultHex?.split('@')[0] ?? top?.hex)?.toLowerCase();
}

export function colorRoleBases(colors: readonly ColorCount[], existingDefaultHex?: string, use?: string): Map<string, string> {
  const out = new Map<string, string>();
  const refHex = colorRoleRef(colors, existingDefaultHex);
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
 * 기본 이름의 종류(12.5 표). number = 숫자 쓰임, plain = 크기 없는 값(글꼴), chroma = `…/brand`,
 * ladder = `…/subtle` · `…/strong`, inverse = `…/inverse`, default = `…/default`.
 */
export type NameKind = 'number' | 'plain' | 'chroma' | 'ladder' | 'inverse' | 'default';

/** 기본 이름 · 값 모양으로 종류를 정한다. */
export function nameKindOf(base: string, value: string): NameKind {
  if (base.startsWith('color/')) {
    const last = base.slice(base.lastIndexOf('/') + 1);
    if (last === 'brand') return 'chroma';
    if (last === 'subtle' || last === 'strong') return 'ladder';
    if (last === 'inverse') return 'inverse';
    return 'default';
  }
  return value !== '' && !Number.isNaN(Number(value)) ? 'number' : 'plain';
}

const SIZE_SMALL = ['sm', 'xs', '2xs'];
const SIZE_LARGE = ['lg', 'xl', '2xl'];
const LIGHTER = ['subtle', 'subtler', 'subtlest'];
const DARKER = ['strong', 'stronger', 'strongest'];
const LADDER_WORDS = [...LIGHTER, ...DARKER];
const FAMILIES = ['red', 'orange', 'yellow', 'green', 'teal', 'blue', 'indigo', 'purple', 'pink'];

const esc = (x: string): string => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * 가족 판정(12.5 "가족") — 그 기본 이름에서 문법 `{기본}{-꼬리}{-a%}{-n}`으로 만들 수 있는 이름만.
 * 표 밖의 말(`padding-x` · `-top-left` · `brand-bold`)은 가족이 아니다.
 */
export function familyRe(base: string, kind: NameKind): RegExp {
  const tail = '(?:-a\\d+)?(?:-\\d+)?$';
  const lad = LADDER_WORDS.join('|');
  switch (kind) {
    case 'number':
      return new RegExp(`^${esc(base)}(?:-(?:${[...SIZE_SMALL, ...SIZE_LARGE].join('|')}))?(?:-\\d+)?$`);
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
    if (g.kind === 'number') assignNumbers(base, g.values, left, taken, assign, fallback);
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

function assignNumbers(base: string, counts: ReadonlyMap<string, number>, left: string[], taken: Taken, assign: (v: string, n: string) => void, fallback: (n: string) => string): void {
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
      const free = words.map((w) => `${base}-${w}`).find((n) => !taken.has(n));
      assign(v, free ?? fallback(`${base}-${words[words.length - 1]}`));
    }
  };
  const same = rest.filter((v) => Math.abs(Number(v) - ref) < 0.005);
  for (const v of same) assign(v, fallback(base)); // 기준과 같은 값 · 재사용 불가 → {기본}-n
  side(rest.filter((v) => Number(v) < ref - 0.0049), SIZE_SMALL);
  side(rest.filter((v) => Number(v) > ref + 0.0049), SIZE_LARGE);
}

/**
 * 색 종류(chroma · ladder · inverse · default)의 이름 — hex마다 자리 이름을 정하고 투명도 꼬리를 붙인다(12.5).
 * 자리 N이 비었나: N이 다른 hex의 값으로 있거나 값을 못 읽거나 이번에 다른 hex가 받았으면 차 있다.
 */
function assignColors(base: string, kind: NameKind, refHex: string | undefined, counts: ReadonlyMap<string, number>, left: string[], taken: Taken, assign: (v: string, n: string) => void, fallback: (n: string) => string): void {
  const slotOf = new Map<string, string>(); // hex → 자리 이름
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
  const pick = (hex: string, cands: string[]): void => {
    const free = cands.find((n) => slotFree(n, hex));
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
  // 값마다: 불투명 = 자리 이름, 반투명 = 자리 이름 + -a{%}. 차 있으면 -n.
  for (const v of sortByCount(left, counts)) {
    const hex = hexOfKey(v);
    const slot = slotOf.get(hex) ?? base;
    const a = alphaOfKey(v);
    const want = a != null && a < 1 ? `${slot}-a${alphaPct(a)}` : slot;
    assign(v, taken.has(want) ? fallback(want) : want);
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
