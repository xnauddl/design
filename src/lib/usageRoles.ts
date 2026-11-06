/* ============================================================
   usageRoles.ts — 쓰임 이름 역할(§2.12, 순수 · figma 의존 없음)
   레이어에는 역할(Semantic)만 붙인다. 같은 값의 역할이 없으면 "어디에 쓰였나"로 이름을 짓는다.
   - 숫자 · 글자: `{그룹}/{주인}/{속성}` (12.3)
   - 색: `color/{쓰임}/{밝기}` (12.4)
   - 번호: 같은 이름에 다른 값이 오면 `-2` · `-3` (12.5)
   만들기(createUsageRoles)와 연결(bind.ts)이 같은 함수를 쓴다 — 두 경로의 이름이 어긋나지 않게.
   ============================================================ */
import { hexToOklch } from './color';
import { LOW_CHROMA } from './palette';
import { VECTOR_TYPES } from './nodePaint';

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
}

/** 색 하나의 배경 종류(유채색이면 chroma, 아니면 L 0.5 기준). */
export function bgKindOf(hex: string): BgKind {
  const o = hexToOklch(hex);
  if (o.c >= LOW_CHROMA) return 'chroma';
  return o.l < 0.5 ? 'dark' : 'light';
}

/** colorRoleBases 결과의 찾기 키 — (hex, 배경 종류). 배경을 모르면 hex만. */
export function colorSlotKey(hex: string, bg?: BgKind): string {
  return bg ? `${hex.toLowerCase()}|${bg}` : hex.toLowerCase();
}

/** inverse가 있는 쓰임(배경 위에 놓이는 색). */
const INVERSE_USES = new Set(['text', 'icon', 'border']);

const byCountThenHex = (a: { hex: string; count: number }, b: { hex: string; count: number }): number =>
  b.count - a.count || (a.hex < b.hex ? -1 : a.hex > b.hex ? 1 : 0);

/**
 * 한 쓰임의 색들 → 번호 없는 밝기 이름(default · subtle · strong · inverse · brand), 키는 `colorSlotKey(hex, bg)`.
 * 기준색: `existingDefaultHex`(`color/{쓰임}/default`가 이미 있으면 그 색), 없으면 hex별 곳 수 합이 가장 많은 색
 * (같으면 hex 순). 판정 순서: default → inverse(합친 판정) → brand(유채) → subtle · strong.
 * inverse(12.4 합친 판정, `use`가 text · icon · border일 때만 — 없으면 판정한다):
 *   1. 기준색이 극단(L < 0.35 또는 ≥ 0.85) 2. 그 색이 반대쪽 극단 3. 배경 종류가 있고 chroma이거나 기준과 같은 쪽.
 * 같은 이름 후보가 여럿이면 번호는 assignNames가 붙인다.
 */
export function colorRoleBases(colors: readonly ColorCount[], existingDefaultHex?: string, use?: string): Map<string, string> {
  const out = new Map<string, string>();
  const totals = new Map<string, number>();
  for (const c of colors) totals.set(c.hex.toLowerCase(), (totals.get(c.hex.toLowerCase()) ?? 0) + c.count);
  const top = [...totals].map(([hex, count]) => ({ hex, count })).sort(byCountThenHex)[0];
  const refHex = (existingDefaultHex ?? top?.hex)?.toLowerCase();
  if (!refHex) return out;
  const ref = hexToOklch(refHex);
  const refDark = ref.l < 0.35;
  const refExtreme = refDark || ref.l >= 0.85;
  const sameSide: BgKind = ref.l < 0.5 ? 'dark' : 'light';
  const inverseUse = use == null || INVERSE_USES.has(use);
  for (const c of colors) {
    const hex = c.hex.toLowerCase();
    const key = colorSlotKey(hex, c.bg);
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

/* ---------- 번호 (12.5) ---------- */

export interface NameRequest {
  /** 번호 없는 이름(예: spacing/card/gap). */
  base: string;
  /** 값 비교 키(숫자는 소수 둘째 자리 문자열, 색은 소문자 hex, 글꼴은 이름). */
  value: string;
  /** 곳 수 — 같은 이름 안에서 번호 없는 이름을 갖는 순서. */
  count: number;
}

const suffixRe = (base: string): RegExp => new RegExp(`^${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:-(\\d+))?$`);

/**
 * 요청마다 최종 이름을 정한다. `existing`: 이미 있는 Semantic 이름 → 값 키.
 * - 번호 없는 이름이나 그 `-n` 중 같은 값이 있으면 그 이름(재사용).
 * - 없으면 번호 없는 이름이 비어 있으면 그것, 아니면 `-2`부터 비어 있는 첫 번호.
 * - 같은 이름에 새 값이 둘 이상이면 곳 수가 많은 값부터(같으면 값 오름차순).
 * 반환 키는 `${base}\u0000${value}`.
 */
export function assignNames(requests: readonly NameRequest[], existing: ReadonlyMap<string, string>): Map<string, string> {
  const out = new Map<string, string>();
  const byBase = new Map<string, Map<string, number>>();
  for (const r of requests) {
    let m = byBase.get(r.base);
    if (!m) byBase.set(r.base, (m = new Map()));
    m.set(r.value, (m.get(r.value) ?? 0) + r.count);
  }
  const taken = new Map(existing); // 이름 → 값(이번에 정한 이름도 더한다)
  for (const [base, values] of byBase) {
    const re = suffixRe(base);
    const order = [...values.entries()].sort((a, b) => b[1] - a[1] || cmpValue(a[0], b[0]));
    for (const [value] of order) {
      let name: string | undefined;
      for (const [n, v] of taken) if (v === value && re.test(n)) { name = pick(name, n, base); }
      if (!name) {
        if (!taken.has(base)) name = base;
        else for (let i = 2; ; i++) if (!taken.has(`${base}-${i}`)) { name = `${base}-${i}`; break; }
        taken.set(name, value);
      }
      out.set(`${base}\u0000${value}`, name);
    }
  }
  return out;
}

/** 같은 값의 이름이 여럿이면 번호가 작은 쪽(번호 없는 이름이 가장 먼저). */
function pick(cur: string | undefined, next: string, base: string): string {
  if (!cur) return next;
  const num = (n: string): number => (n === base ? 1 : Number(n.slice(base.length + 1)) || Infinity);
  return num(next) < num(cur) ? next : cur;
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

/** 값 키 — 숫자는 소수 둘째 자리, 색은 소문자 hex. */
export function valueKey(v: number | string): string {
  return typeof v === 'number' ? String(Math.round(v * 100) / 100) : v.toLowerCase();
}

/** 플러그인이 만든 역할에 남기는 변수 플러그인 데이터 키(12.6). */
export const AUTO_ROLE_KEY = 'dsl.autoRole';
