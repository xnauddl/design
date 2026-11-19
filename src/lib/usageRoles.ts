/* ============================================================
   usageRoles.ts — 쓰임 이름 역할(§2.12, 순수 · figma 의존 없음)
   레이어에는 역할(Semantic)만 붙인다. 같은 값의 역할이 없으면 "어디에 쓰였나"로 이름을 짓는다.
   - 숫자 · 글자: `{그룹}/{주인}/{속성}` (12.3)
   - 색: `color/{쓰임}/{밝기}` (12.4)
   - 꼬리: 같은 이름에 다른 값이 오면 뜻이 읽히는 꼬리(`-sm` · `-lg`, `brand-red` · `-subtle`, `subtler`, 같은 색 투명도만 다르면 `-subtle` · `-strong`), 모자라면 `-n` (12.5)
   만들기(createUsageRoles)와 연결(bind.ts)이 같은 함수를 쓴다 — 두 경로의 이름이 어긋나지 않게.
   ============================================================ */
import { hexToOklch } from './color';
import { LOW_CHROMA } from './palette';
import { VECTOR_TYPES } from './nodePaint';
import { colorKey } from './tokens';
import { classifyColor } from './colorName';
import { KRDS_STEPS, krdsStepDef, type KrdsCategory } from './krdsType';

/**
 * 텍스트 스타일 label 판정(`dsRoleOwner` — docs/text-style-krds.md §3.2-1)이 건너뛰는 구조 역할.
 * 6-2(§2.12 N1): 쓰임 이름에는 주인이 없다 — 이 목록은 label 판정용으로만 남는다.
 * 세분화 1차 · 2차 역할(ia-v4 §4.4)도 구조 이름이라 건너뛴다(label 판정이 지금과 같게).
 */
const STRUCTURAL = new Set([
  'container',
  'wrapper',
  'shape',
  'group',
  'content',
  'body',
  'row',
  'text-group',
  'media',
  // 6-2 세분화 2차(ia-v4 §4.4 "역할 세분화 2차" C1–C6 · D)
  'profile',
  'title-group',
  'links',
  'pagination',
  'icon-group',
  'button-group',
  'hstack',
  'vstack',
  'grid',
  'zstack',
]);

/** 구조 역할인가(label 판정이 건너뛰는 이름 — §2.12 N1). */
export function isStructuralRole(role: string): boolean {
  return STRUCTURAL.has(role);
}

/**
 * 숫자 · 글자 필드의 속성 종류 `K`(§2.12 6-2 N2) — 쓰임 이름의 기본 이름(단계 앞).
 * 여백 네 방향 = `spacing/padding`, 간격 넷 = `spacing/gap`, 모서리 = `radius`, 선 두께 = `stroke-width`,
 * 크기 = `size/icon` · `size/avatar`(아이콘 · 아바타만), 투명도 = `opacity`, 줄 높이 · 자간 = `line-height` · `letter-spacing`.
 * 주인(레이어 역할)은 넣지 않는다(N1). 모르는 필드는 null.
 */
export function numericKind(field: string, sizeKind?: 'icon' | 'avatar' | null): string | null {
  switch (field) {
    case 'paddingLeft':
    case 'paddingRight':
    case 'paddingTop':
    case 'paddingBottom':
      return 'spacing/padding';
    case 'itemSpacing':
    case 'counterAxisSpacing':
    case 'gridRowGap':
    case 'gridColumnGap':
      return 'spacing/gap';
    case 'cornerRadius':
    case 'topLeftRadius':
    case 'topRightRadius':
    case 'bottomLeftRadius':
    case 'bottomRightRadius':
      return 'radius';
    case 'strokeWeight':
    case 'strokeTopWeight':
    case 'strokeRightWeight':
    case 'strokeBottomWeight':
    case 'strokeLeftWeight':
      return 'stroke-width';
    case 'opacity':
      return 'opacity';
    case 'width':
    case 'height':
      return sizeKind ? `size/${sizeKind}` : null;
    case 'lineHeight':
      return 'line-height';
    case 'letterSpacing':
      return 'letter-spacing';
    default:
      return null;
  }
}

/** 반경 자리가 알약인가(§2.12 N2 "알약") — 반경 ≥ 짧은 변(소수 둘째 자리 반올림)의 절반. */
export function isPillRadius(radius: number, width: number, height: number): boolean {
  const short = Math.round(Math.min(width, height) * 100) / 100;
  return short > 0 && radius >= short / 2;
}

/** 글자 필드 → 그룹(12.3). */
export const TEXT_GROUP: Record<string, string> = {
  fontSize: 'font-size',
  lineHeight: 'line-height',
  letterSpacing: 'letter-spacing',
  fontFamily: 'font-family',
};

/**
 * 글자 필드의 쓰임(연결 자리 `usage` — §2.12 N4 · N5). 글자 크기 = `font-size`(이름은 `assignFontSizeNames`),
 * 줄 높이 · 자간 = 종류 `K`(이름은 단계 — `assignSteps`), 글꼴 = `font-family/text`(크기 없는 값 — 12.5 `plain`, 그대로).
 */
export function textUsageName(field: string): string | null {
  if (field === 'fontFamily') return 'font-family/text';
  return TEXT_GROUP[field] ?? null;
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
      return stepFamilyRe(base);
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

/** 가족 순서(12.5) — 기본 이름 → 꼬리 이름(이름 순) → `-n` 이름(번호 작은 순). 숫자 종류 `K`의 가족은 N3 순서(stepFamilyRank). */
export function familyRank(name: string, base: string): [number, number, string] {
  if (name.startsWith(base + '/')) return stepFamilyRank(name, base);
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
  /** 반경: 이 요청의 곳 수 가운데 알약 자리 수(§2.12 N2). */
  pill?: number;
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
  const groups = new Map<string, { kind: NameKind; refHex?: string; values: Map<string, number>; pills: Map<string, number> }>();
  for (const r of requests) {
    let g = groups.get(r.base);
    if (!g) groups.set(r.base, (g = { kind: r.kind ?? nameKindOf(r.base, r.value), refHex: r.refHex, values: new Map(), pills: new Map() }));
    if (r.refHex && !g.refHex) g.refHex = r.refHex;
    g.values.set(r.value, (g.values.get(r.value) ?? 0) + r.count);
    if (r.pill) g.pills.set(r.value, (g.pills.get(r.value) ?? 0) + r.pill);
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
    if (g.kind === 'number') stepLadder(base, [...g.values].map(([value, count]) => ({ value, count, pill: g.pills.get(value) ?? 0 })), left, taken, assign, fallback);
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

/* ---------- 크기 단계 (§2.12 6-2 N3 — 숫자 꼬리 12.5를 대신함) ---------- */

/** 사다리 칸 → 단계 이름. 0 `md`, −1 `sm`, −2 `xs`, −k `{k−1}xs`, +1 `lg`, +2 `xl`, +k `{k−1}xl`(끝이 없다). */
export function stepName(offset: number): string {
  if (offset === 0) return 'md';
  if (offset === -1) return 'sm';
  if (offset === -2) return 'xs';
  if (offset === 1) return 'lg';
  if (offset === 2) return 'xl';
  return offset < 0 ? `${-offset - 1}xs` : `${offset - 1}xl`;
}

const STEP_RE_SRC = '(?:md|sm|xs|lg|xl|(?:[2-9]|[1-9]\\d+)x[sl])';

/** 단계 이름 → 칸(단계가 아니면 null). `2xs` → −3, `3xl` → +4. */
export function stepOffset(step: string): number | null {
  switch (step) {
    case 'md':
      return 0;
    case 'sm':
      return -1;
    case 'xs':
      return -2;
    case 'lg':
      return 1;
    case 'xl':
      return 2;
  }
  const m = /^([2-9]|[1-9]\d+)x([sl])$/.exec(step);
  if (!m) return null;
  const k = Number(m[1]) + 1;
  return m[2] === 's' ? -k : k;
}

/** 종류 `K`의 가족(N3) — `K/{단계}` · `K/{단계}-{n}`, 반경은 `radius/full` · `radius/full-{n}`도. */
export function stepFamilyRe(kind: string): RegExp {
  const full = kind === 'radius' ? `|full` : '';
  return new RegExp(`^${esc(kind)}\\/(?:${STEP_RE_SRC}${full})(?:-\\d+)?$`);
}

/** 가족 이름을 읽는다 — 단계 칸(`full`이면 'full') · `-n` 번호(없으면 0). 가족이 아니면 null. */
function parseStepName(name: string, kind: string): { off: number | 'full'; n: number } | null {
  if (!name.startsWith(kind + '/')) return null;
  const rest = name.slice(kind.length + 1);
  const m = /^([a-z0-9]+?)(?:-(\d+))?$/.exec(rest);
  if (!m) return null;
  const n = m[2] ? Number(m[2]) : 0;
  if (m[1] === 'full') return kind === 'radius' ? { off: 'full', n } : null;
  const off = stepOffset(m[1]);
  return off == null ? null : { off, n };
}

/** 가족 순서(N3) — 단계 이름(`md`에 가까운 칸 먼저, 같으면 작은 쪽) → `radius/full` → `-n` 이름(번호 작은 순). */
export function stepFamilyRank(name: string, kind: string): [number, number, string] {
  const p = parseStepName(name, kind);
  if (!p) return [3, 0, name];
  if (p.n) return [2, p.n, name];
  if (p.off === 'full') return [1, 0, ''];
  // 같은 거리면 작은 쪽(음수 칸) 먼저 — 2·|off| (작은 쪽) · 2·|off|+1 (큰 쪽)
  return [0, Math.abs(p.off) * 2 + (p.off > 0 ? 1 : 0), ''];
}

/** 사다리 입력 — 값(값 키) · 곳 수 · 알약 자리 수(반경만). */
export interface StepValue {
  value: string;
  count: number;
  pill?: number;
}

/**
 * 한 종류 `K`의 남은 값(`left`)에 단계 이름을 준다(N3 ② · ③ · 알약). 재사용(①)은 부르는 쪽이 이미 했다.
 * `all` = 사다리를 정하는 값 전부(곳 수 · 알약 수 — 만들기는 꺼진 값도 칸을 차지한다). `taken` = 이미 있는 이름 → 값 키(이번에 받은 이름도 `assign`이 더한다).
 */
function stepLadder(
  kind: string,
  all: readonly StepValue[],
  left: readonly string[],
  taken: Taken,
  assign: (v: string, n: string) => void,
  fallback: (n: string) => string,
): void {
  const info = new Map<string, StepValue>();
  for (const x of all) {
    const cur = info.get(x.value);
    if (cur) info.set(x.value, { value: x.value, count: cur.count + x.count, pill: (cur.pill ?? 0) + (x.pill ?? 0) });
    else info.set(x.value, { value: x.value, count: x.count, pill: x.pill ?? 0 });
  }
  const leftSet = new Set(left);
  const num = (v: string): number => Number(v);
  const isPill = (v: string): boolean => {
    if (kind !== 'radius') return false;
    const x = info.get(v);
    return !!x && x.count > 0 && (x.pill ?? 0) >= x.count;
  };
  // 사다리 값 = 알약이 아닌 값(left에 든 것 + 꺼진 값 — all에만 있는 값도 칸을 차지한다).
  // 이 함수가 이름을 주는 것은 left만이지만 칸 계산은 all 전부로 한다.
  const allValues = [...new Set([...info.keys(), ...left])];
  for (const v of left) if (!info.has(v)) info.set(v, { value: v, count: 0, pill: 0 });
  const out = new Map<string, string>(); // 이번 계산의 값 → 이름(left 밖 값은 assign하지 않는다)
  const give = (v: string, name: string): void => {
    out.set(v, name);
    if (leftSet.has(v)) assign(v, name);
    else {
      // 꺼진 값 — 이름을 실제로 받지는 않지만 그 칸은 이번 계산에서 차지한다.
      const arr = taken.get(name);
      taken.set(name, arr ? [...arr, v] : [v]);
    }
  };
  const nameOf = (off: number): string => `${kind}/${stepName(off)}`;
  // 이미 있는 이름이 값을 가진 칸 — 재사용으로 이름이 정해진 값(left에 없는 all 값 중 기존 가족과 같은 값)은 이름을 받지 않는다.
  const reusedValues = new Set<string>();
  for (const v of allValues) {
    if (leftSet.has(v)) continue;
    // all에만 있고 이미 같은 값의 가족 이름이 있으면 그 값은 재사용 쪽 — 칸을 새로 차지하지 않는다
    for (const [n, vals] of taken) if (vals.includes(v) && parseStepName(n, kind)) reusedValues.add(v);
  }

  // 알약(N2) — 곳 수가 많은 값(같으면 작은 값)부터 `radius/full` → `-2` → `-3` …(사다리 칸이 아니다)
  const pills = allValues.filter((v) => isPill(v) && !reusedValues.has(v)).sort((a, b) => (info.get(b)!.count - info.get(a)!.count) || num(a) - num(b));
  for (const v of pills) {
    const base = `${kind}/full`;
    give(v, taken.has(base) ? fallback(base) : base);
  }

  const ladder = allValues.filter((v) => !isPill(v) && !reusedValues.has(v));
  if (!ladder.length) return;
  // 이미 있는 단계 칸(값을 읽을 수 있는 `K/{단계}` — `-n` · `full` 아님). 한 값에 이름이 둘 이상이면 가족 순서 첫 이름의 칸.
  const slots = new Map<number, number>(); // 칸 → 값(이미 있는 것 + 이번에 받은 것)
  const byValue = new Map<string, { off: number; rank: [number, number, string] }>();
  for (const [n, vals] of taken) {
    const p = parseStepName(n, kind);
    if (!p || p.n || p.off === 'full' || !vals.length) continue;
    const v = vals[0];
    if (Number.isNaN(Number(v))) continue;
    if (!slots.has(p.off)) slots.set(p.off, Number(v));
    const r = stepFamilyRank(n, kind);
    const cur = byValue.get(v);
    if (!cur || r[1] < cur.rank[1]) byValue.set(v, { off: p.off, rank: r });
  }
  const free = (off: number): boolean => !taken.has(nameOf(off));
  if (!slots.size) {
    // ② 단계 이름이 없다 — 곳 수가 가장 많은 값(같으면 작은 값)이 md, 작은 값은 큰 값부터 sm · xs …, 큰 값은 작은 값부터 lg · xl …
    const md = [...ladder].sort((a, b) => info.get(b)!.count - info.get(a)!.count || num(a) - num(b))[0];
    give(md, free(0) ? nameOf(0) : fallback(nameOf(0)));
    const small = ladder.filter((v) => num(v) < num(md)).sort((a, b) => num(b) - num(a));
    const large = ladder.filter((v) => num(v) > num(md)).sort((a, b) => num(a) - num(b));
    let off = 0;
    for (const v of small) {
      do off--;
      while (!free(off));
      give(v, nameOf(off));
    }
    off = 0;
    for (const v of large) {
      do off++;
      while (!free(off));
      give(v, nameOf(off));
    }
    return;
  }
  // ③ 단계 이름이 있다 — 이미 있는 이름은 옮기지 않고 남은 값을 작은 값부터 하나씩.
  const existingVals = new Set([...byValue.keys()]);
  const order = [...slots].sort((a, b) => a[0] - b[0]);
  const monotonic = order.every(([, v], i) => i === 0 || v > order[i - 1][1]);
  const firstFree = (from: number, to: number | null, dir: 1 | -1): number | null => {
    for (let o = from; to == null ? true : dir > 0 ? o <= to : o >= to; o += dir) if (free(o) && !slots.has(o)) return o;
    return null;
  };
  const nearestTail = (v: number, lower: [number, number] | undefined, upper: [number, number] | undefined): string => {
    const pick = !upper ? lower! : !lower ? upper : Math.abs(v - lower[1]) <= Math.abs(upper[1] - v) ? lower : upper;
    return fallback(nameOf(pick[0]));
  };
  for (const v of ladder.filter((x) => leftSet.has(x) || !existingVals.has(x)).sort((a, b) => num(a) - num(b))) {
    const x = num(v);
    const known = [...slots].map(([o, val]) => [o, val] as [number, number]);
    const same = known.find(([, val]) => Math.abs(val - x) < 0.005);
    if (same) {
      give(v, fallback(nameOf(same[0]))); // 같은 값 · 재사용 불가 → 그 칸 이름 + -n
      continue;
    }
    if (monotonic) {
      const lower = known.filter(([, val]) => val < x).sort((a, b) => b[1] - a[1])[0];
      const upper = known.filter(([, val]) => val > x).sort((a, b) => a[1] - b[1])[0];
      let off: number | null;
      if (lower && upper) off = firstFree(lower[0] + 1, upper[0] - 1, 1);
      else if (upper) off = firstFree(upper[0] - 1, null, -1);
      else off = firstFree(lower![0] + 1, null, 1);
      if (off == null) give(v, nearestTail(x, lower, upper));
      else {
        give(v, nameOf(off));
        slots.set(off, x);
      }
      continue;
    }
    // 이미 있는 단계 값이 크기 순서와 어긋남 — 이웃을 찾지 않는다(가장 작은 칸 아래 · 가장 큰 칸 위 · 그 사이는 가까운 값 + -n)
    const vals = known.map(([, val]) => val);
    const offs = known.map(([o]) => o);
    if (x < Math.min(...vals)) {
      const off = firstFree(Math.min(...offs) - 1, null, -1) as number;
      give(v, nameOf(off));
      slots.set(off, x);
    } else if (x > Math.max(...vals)) {
      const off = firstFree(Math.max(...offs) + 1, null, 1) as number;
      give(v, nameOf(off));
      slots.set(off, x);
    } else {
      const near = [...known].sort((a, b) => Math.abs(a[1] - x) - Math.abs(b[1] - x) || a[1] - b[1])[0];
      give(v, fallback(nameOf(near[0])));
    }
  }
}

/**
 * 한 종류 `K`의 값마다 단계 이름(§2.12 6-2 N3) — 만들기(`createUsageRoles`)와 연결(`bind.ts` 순서 4)이 함께 쓴다.
 * ① 재사용(가족 안 같은 값 · `canReuse` — 가족 순서 첫 이름) → ② 가족에 단계 이름이 없으면 최다 값 = md, 양쪽 사다리
 * → ③ 있으면 작은 값부터 하나씩 이웃 사이 첫 빈 칸(모자라면 가까운 이웃 + `-n`). 반경 알약(모든 자리가 알약)은 `radius/full` · `-n`.
 * `values` = 사다리를 정하는 값 전부(꺼진 값 포함). `want`를 주면 그 값만 이름을 돌려준다(나머지는 칸만 차지).
 * 반환 = 값 키 → 이름.
 */
export function assignSteps(
  kind: string,
  values: readonly StepValue[],
  existing: ReadonlyMap<string, string | readonly string[]>,
  opts: AssignOptions & { want?: readonly string[] } = {},
): Map<string, string> {
  const taken: Taken = new Map([...existing].map(([n, v]) => [n, typeof v === 'string' ? (v ? [v] : []) : v]));
  const out = new Map<string, string>();
  const fam = stepFamilyRe(kind);
  const canReuse = opts.canReuse ?? ((): boolean => true);
  const uniq = [...new Set(values.map((x) => x.value))];
  const want = new Set(opts.want ?? uniq);
  const left: string[] = [];
  for (const value of uniq) {
    if (opts.reuse !== false) {
      const names = [...taken].filter(([n, v]) => fam.test(n) && v.includes(value) && canReuse(n, value, kind)).map(([n]) => n).sort(byFamilyOrder(kind));
      if (names.length) {
        if (want.has(value)) out.set(value, names[0]);
        continue;
      }
    }
    if (want.has(value)) left.push(value);
  }
  const assign = (value: string, name: string): void => {
    out.set(value, name);
    const arr = taken.get(name);
    taken.set(name, arr ? [...arr, value] : [value]);
  };
  const fallback = (name: string): string => {
    for (let i = 2; ; i++) if (!taken.has(`${name}-${i}`)) return `${name}-${i}`;
  };
  // 재사용된 값은 칸 계산에서 빠진다(이미 이름이 있다) — 남은 값 + 꺼진 값(want 밖)으로 사다리를 정한다.
  const reused = new Set(uniq.filter((v) => !left.includes(v) && want.has(v)));
  stepLadder(kind, values.filter((x) => !reused.has(x.value)), left, taken, assign, fallback);
  return out;
}

/* ---------- 글자 크기 (§2.12 6-2 N4) · 글자 새 모양 (N5) ---------- */

/** N4 모양 이름을 읽는다 — `font-size/{분류}/{단계}[-{px}[-{n}]]`. 분류 · 단계가 KRDS 표에 없으면 null. */
function parseFontSizeName(name: string): { cat: KrdsCategory; step: string; px?: string; n?: number } | null {
  const m = /^font-size\/(display|heading|body|label)\/([a-z]+)(?:-(\d+))?(?:-(\d+))?$/.exec(name);
  if (!m) return null;
  const cat = m[1] as KrdsCategory;
  if (!KRDS_STEPS[cat].some((d) => d.step === m[2])) return null;
  return { cat, step: m[2], ...(m[3] ? { px: m[3] } : {}), ...(m[4] ? { n: Number(m[4]) } : {}) };
}

/**
 * 글자 크기 N4 모양인가 — `font-size/{display · heading · body · label}/{단계}` 또는 그 뒤 `-{px}`(꼬리 숫자 = 값일 때만).
 * 6-2가 지은 `-{px}-{n}`(③ 겹침의 마지막 수단)도 같은 모양으로 본다(구현 메모 — 같은 값이면 다시 쓰게).
 */
export function isFontSizeShape(name: string, value: string): boolean {
  const p = parseFontSizeName(name);
  if (!p) return false;
  if (p.px == null) return p.n == null;
  return p.px === value;
}

/**
 * 글자 연결 순서 2의 새 모양 판정(§2.12 N5 "글자 순서 2") — 글자 크기 = N4 모양, 줄 높이 · 자간 = `{그룹}/{단계}` · `-n`.
 * `group` = `font-size` · `line-height` · `letter-spacing`. 그 밖 그룹(`font-family`)은 false.
 */
export function isTextRoleShape(group: string, name: string, value: string): boolean {
  if (group === 'font-size') return isFontSizeShape(name, value);
  if (group === 'line-height' || group === 'letter-spacing') return stepFamilyRe(group).test(name);
  return false;
}

/** 텍스트 스타일 하나의 분류 · 곳 수(N4 ② 입력). */
export interface FontSizeStyle {
  category: KrdsCategory;
  count: number;
}

/**
 * 텍스트 스타일 등록의 글자 크기 분류(§2.12 N4 ②) — px ≥ 21.5면 heading(단 ≥ 42이고 display 스타일의 곳 수 합이 heading보다 크면 display),
 * px < 21.5면 곳 수 합이 가장 큰 분류(같으면 body → label → heading → display).
 * 곳 수가 모두 0이면(기본 램프 · 쓰인 곳을 세지 않는 경로) 스타일 하나를 1로 센다(구현 메모 — 0끼리 비기면 display가 나오지 않음).
 */
export function fontSizeCategory(px: number, styles: readonly FontSizeStyle[]): KrdsCategory {
  const allZero = styles.every((s) => !(s.count > 0));
  const sum = (c: KrdsCategory): number => styles.filter((s) => s.category === c).reduce((a, s) => a + (allZero ? 1 : Math.max(0, s.count)), 0);
  if (px >= 21.5) return px >= 42 && sum('display') > sum('heading') ? 'display' : 'heading';
  const order: KrdsCategory[] = ['body', 'label', 'heading', 'display'];
  let best: KrdsCategory = 'body';
  for (const c of order) if (sum(c) > sum(best)) best = c;
  return best;
}

/** 글자 크기 요청 하나 — 정수 px · 분류 · 곳 수. */
export interface FontSizeReq {
  px: number;
  category: KrdsCategory;
  count: number;
}

/**
 * 글자 크기 Semantic 이름(§2.12 6-2 N4) — px마다 하나. 텍스트 스타일 등록과 연결의 새 역할(순서 4)이 함께 쓴다.
 * ① 그 px의 N4 모양 이름이 같은 값 · `canReuse`로 있으면 그것(분류와 상관없이, 꼬리 없는 이름 → 이름 순)
 * ② 아니면 `font-size/{분류}/{단계}` ③ 다른 px가 같은 분류 · 단계면 기준값 거리 → 곳 수 → 큰 크기 1등만 꼬리 없이, 나머지 `-{px}`.
 * 받으려는 이름이 다른 값으로 있으면 `-{px}`, 그것도 차 있으면 `-{px}-2` · `-3`. 반환 = 값 키(px) → 이름.
 */
export function assignFontSizeNames(reqs: readonly FontSizeReq[], existing: ReadonlyMap<string, string | readonly string[]>, opts: AssignOptions = {}): Map<string, string> {
  const taken: Taken = new Map([...existing].map(([n, v]) => [n, typeof v === 'string' ? (v ? [v] : []) : v]));
  const canReuse = opts.canReuse ?? ((): boolean => true);
  const out = new Map<string, string>();
  const merged = new Map<string, FontSizeReq>();
  for (const r of reqs) {
    const k = valueKey(r.px);
    const cur = merged.get(k);
    if (cur) cur.count += r.count;
    else merged.set(k, { ...r });
  }
  const left: FontSizeReq[] = [];
  for (const [k, r] of merged) {
    if (opts.reuse !== false) {
      const names = [...taken]
        .filter(([n, v]) => isFontSizeShape(n, k) && v.includes(k) && canReuse(n, k, 'font-size'))
        .map(([n]) => n)
        .sort((a, b) => Number(/-\d+$/.test(a)) - Number(/-\d+$/.test(b)) || cmpStr(a, b));
      if (names.length) {
        out.set(k, names[0]);
        continue;
      }
    }
    left.push(r);
  }
  // ③ 같은 분류 · 단계끼리 묶어 1등만 꼬리 없이
  const groups = new Map<string, { ref: number; items: FontSizeReq[] }>();
  for (const r of left) {
    const d = krdsStepDef(r.category, r.px);
    const base = `font-size/${r.category}/${d.step}`;
    const g = groups.get(base);
    if (g) g.items.push(r);
    else groups.set(base, { ref: d.ref, items: [r] });
  }
  const holds = (name: string): boolean => taken.has(name);
  for (const [base, g] of groups) {
    const sorted = [...g.items].sort((a, b) => Math.abs(a.px - g.ref) - Math.abs(b.px - g.ref) || b.count - a.count || b.px - a.px);
    sorted.forEach((r, i) => {
      const k = valueKey(r.px);
      const tail = `${base}-${k}`;
      let name: string;
      if (i === 0 && !holds(base)) name = base;
      else if (!holds(tail)) name = tail;
      else {
        let n = 2;
        while (holds(`${tail}-${n}`)) n++;
        name = `${tail}-${n}`;
      }
      out.set(k, name);
      const arr = taken.get(name);
      taken.set(name, arr ? [...arr, k] : [k]);
    });
  }
  return out;
}

/* ---------- 옛 이름 (12.7) ---------- */
/** 단계 이름(12.7) — 사다리 · 상대 순위(tshirtRoles)가 만든 이름과 그 `-N` 변형. */
// 6-2 N7: `radius/{단계}` · `stroke-width/{단계}`(+ `-n`)는 새 이름(N3)과 모양이 같아 옛 이름에서 뺐다 — `radius/none` · `stroke-width/{none · thin · thick}`만 남는다.
const OLD_LADDER = /^(?:(?:spacing|size)\/(?:none|3xs|2xs|xs|sm|md|lg|xl|2xl|3xl|4xl|full|thin|thick)|radius\/none|stroke-width\/(?:none|thin|thick))(-\d+)?$/;
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
