/* ============================================================
   roles.ts — 전 토큰 역할(Semantic) 어휘 추천 (순수, figma 의존 없음)
   원칙(#3·패턴 C): Global=원시값, 역할은 Semantic 별칭으로만. 색은 hue→역할(palette),
   수치/타이포는 값→역할(여기). 추천 결과는 `역할이름 → Global변수이름` 맵.
   - 수치(spacing/radius/size): 값 오름차순 → 센터(md) 정렬 티셔츠 스케일.
   - fontSize: base(16) 기준 type 스케일(body 중심, 위 title…display / 아래 caption·overline).
   - fontWeight: 값 → 가중치 이름(regular/medium/semibold/bold…).
   - fontFamily: 키워드(mono/serif/sans) 또는 순서(body/heading).
   결정에 따라 opacity·letterSpacing·effects는 추천 대상 제외(약함/후순위).
   ============================================================ */
import type { DraftToken, TokenCategory } from './tokens';
import { suggestSemanticMap } from './palette';

/** 센터(md)에 맞춘 티셔츠 사다리. */
const TSHIRT = ['3xs', '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl'];
const TSHIRT_MID = TSHIRT.indexOf('md'); // 4

/** 오름차순 값 → 센터(md) 정렬 티셔츠 역할. 값 개수에 맞춰 md를 중심으로 배치. */
export function tshirtRoles(values: number[]): string[] {
  const n = values.length;
  if (!n) return [];
  let start = TSHIRT_MID - Math.floor((n - 1) / 2);
  start = Math.max(0, Math.min(start, Math.max(0, TSHIRT.length - n)));
  return values.map((_, i) => {
    const idx = start + i;
    return idx < TSHIRT.length ? TSHIRT[idx] : `${TSHIRT[TSHIRT.length - 1]}-${idx - TSHIRT.length + 2}`;
  });
}

/**
 * 고정 사다리 — 값이 사다리 칸에 있을 때만 역할을 준다(없으면 '' = Global만 남김).
 * 상대 순위(tshirtRoles)는 파일에 13·51·109px만 있어도 sm/md/lg를 나눠 줘, 역할 이름이
 * 파일마다 다른 값을 가리켰다. Lightning(xxx-small 2 … x-large 32)·Atlassian(space.025=2 …
 * space.1000=80)·Material(4/8dp 격자)이 모두 **고정 척도**를 쓴다 — 역할은 척도 위의 값에만.
 */
export function ladderRoles(values: number[], ladder: ReadonlyMap<number, string>): string[] {
  return values.map((v) => ladder.get(v) ?? '');
}

/** 간격 사다리(px) — Lightning 티셔츠 이름 × Atlassian 칸(2·4·8·12·16·24·32·48·64·80). */
export const SPACING_LADDER: ReadonlyMap<number, string> = new Map([
  [0, 'none'], [2, '3xs'], [4, '2xs'], [8, 'xs'], [12, 'sm'], [16, 'md'], [24, 'lg'], [32, 'xl'], [48, '2xl'], [64, '3xl'], [80, '4xl'],
]);
/** 반경 사다리(px) — Atlassian radius.xsmall 2 … xxlarge 16 + Lightning large 8, pill=full. */
export const RADIUS_LADDER: ReadonlyMap<number, string> = new Map([
  [0, 'none'], [2, 'xs'], [4, 'sm'], [8, 'md'], [12, 'lg'], [16, 'xl'], [24, '2xl'],
]);
/** 선 두께 — Lightning borderWidthThin 1 / Thick 2, Atlassian border.width 1 / selected 2. */
export const STROKE_LADDER: ReadonlyMap<number, string> = new Map([
  [0.5, 'hairline'], [1, 'thin'], [2, 'thick'],
]);

export function spacingRoles(values: number[]): string[] {
  return ladderRoles(values, SPACING_LADDER);
}
export function strokeRoles(values: number[]): string[] {
  return ladderRoles(values, STROKE_LADDER);
}
/** radius: 고정 사다리 + 큰 값(≥999, 알약형)→full. */
export function radiusRoles(values: number[]): string[] {
  return values.map((v) => (v >= 999 ? 'full' : RADIUS_LADDER.get(v) ?? ''));
}

const FS_UP = ['title', 'h3', 'h2', 'h1', 'display']; // body 위(큰 글자)
const FS_DOWN = ['caption', 'overline']; // body 아래(작은 글자)

/** fontSize: base에 가장 가까운 값=body, 위로 title…display, 아래로 caption·overline. */
export function fontSizeRoles(values: number[], base = 16): string[] {
  const n = values.length;
  if (!n) return [];
  let bodyI = 0;
  let bd = Infinity;
  values.forEach((v, i) => {
    const d = Math.abs(v - base);
    if (d < bd) {
      bd = d;
      bodyI = i;
    }
  });
  return values.map((_, i) => {
    if (i === bodyI) return 'body';
    if (i > bodyI) return FS_UP[i - bodyI - 1] ?? `display-${i - bodyI - FS_UP.length + 1}`;
    return FS_DOWN[bodyI - i - 1] ?? `overline-${bodyI - i - FS_DOWN.length + 1}`;
  });
}

const WEIGHTS: Array<{ v: number; role: string }> = [
  { v: 100, role: 'thin' }, { v: 200, role: 'extralight' }, { v: 300, role: 'light' },
  { v: 400, role: 'regular' }, { v: 500, role: 'medium' }, { v: 600, role: 'semibold' },
  { v: 700, role: 'bold' }, { v: 800, role: 'extrabold' }, { v: 900, role: 'black' },
];

/** fontWeight 값 → 가장 가까운 가중치 이름. */
export function weightRole(value: number): string {
  let best = WEIGHTS[0];
  let bd = Infinity;
  for (const w of WEIGHTS) {
    const d = Math.abs(w.v - value);
    if (d < bd) {
      bd = d;
      best = w;
    }
  }
  return best.role;
}

/** fontFamily 이름 → 역할(키워드 우선, 아니면 순서로 body/heading). */
export function familyRole(name: string, index: number): string {
  const lower = name.toLowerCase();
  if (/\bmono|mononoki|consol|courier|menlo|code\b/.test(lower)) return 'mono';
  if (/serif/.test(lower) && !/sans/.test(lower)) return 'serif';
  if (/sans|inter|roboto|helvetica|arial|pretendard/.test(lower)) return 'sans';
  return index === 0 ? 'body' : 'heading';
}

/** 카테고리의 (값 오름차순·중복 제거) → {value, name} 목록. */
function numericEntries(tokens: DraftToken[], category: TokenCategory): Array<{ value: number; name: string }> {
  const byVal = new Map<number, string>();
  for (const t of tokens) {
    if (t.category === category && typeof t.value === 'number' && !byVal.has(t.value)) byVal.set(t.value, t.name);
  }
  return [...byVal.keys()].sort((a, b) => a - b).map((value) => ({ value, name: byVal.get(value) as string }));
}

/**
 * 전 토큰 역할 추천 — `역할이름 → Global변수이름` 맵.
 * 색은 palette.suggestSemanticMap(휴리스틱) 재사용, 수치/타이포는 위 스케일/어휘.
 */
export function suggestTokenRoles(tokens: DraftToken[], base = 16): Record<string, string> {
  const map: Record<string, string> = {};

  // 색 — 기존 휴리스틱(무채→surface/text/border, 채도최고→primary).
  const colors = tokens
    .filter((t) => t.category === 'color' && typeof t.value === 'string')
    .map((t) => ({ name: t.name, hex: t.value as string }));
  Object.assign(map, suggestSemanticMap(colors));

  // 수치 — 티셔츠/타입 스케일. prefix는 Semantic 폴더 그룹.
  const scale = (category: TokenCategory, prefix: string, roleFn: (vals: number[]) => string[]): void => {
    const entries = numericEntries(tokens, category);
    const roles = roleFn(entries.map((e) => e.value));
    entries.forEach((e, i) => {
      if (roles[i]) map[`${prefix}/${roles[i]}`] = e.name; // 사다리 밖 값은 역할 없음(Global만)
    });
  };
  scale('gap', 'spacing', spacingRoles);
  scale('radius', 'radius', radiusRoles);
  // 크기(width/height)는 역할을 주지 않는다 — 화면에 20~1440px 임의 값이 30개쯤 나오면 상대 순위가
  // `size/4xl-20`까지 번호만 늘어났다. 세 시스템 모두 임의 치수에 의미 토큰을 두지 않는다(Global만).
  scale('strokeWidth', 'stroke-width', strokeRoles);
  scale('fontSize', 'font-size', (vals) => fontSizeRoles(vals, base));

  // fontWeight — 값→이름.
  for (const e of numericEntries(tokens, 'fontWeight')) map[`font-weight/${weightRole(e.value)}`] = e.name;

  // fontFamily — 키워드/순서.
  const families = tokens.filter((t) => t.category === 'fontFamily' && typeof t.value === 'string');
  families.forEach((t, i) => {
    map[`font-family/${familyRole(String(t.value), i)}`] = t.name;
  });

  return map;
}

/**
 * 자동 추천 위에 사용자가 정한 역할을 덮어쓴다.
 * 색만 담긴 부분 맵이 와도 간격·크기·타이포 역할이 딸려 빠지지 않게 하는 게 요점 —
 * 색 목록에서 역할을 고르는 화면은 색밖에 모른다(그 맵으로 통째 교체하면 나머지가 사라진다).
 */
export function mergeTokenRoles(
  tokens: DraftToken[],
  base = 16,
  overrides?: Record<string, string>,
): Record<string, string> {
  const auto = suggestTokenRoles(tokens, base);
  if (!overrides || !Object.keys(overrides).length) return auto;
  return { ...auto, ...overrides };
}

/* 시맨틱 매핑 입력(`역할 = 변수` 줄 단위 텍스트) ↔ 맵 변환.
   위 추천 맵과 같은 모양이라 여기 둔다(프리셋 제거 전에는 presets.ts에 있었다). */

export function semanticMapToText(map: Record<string, string>): string {
  return Object.entries(map)
    .map(([role, global]) => `${role} = ${global}`)
    .join('\n');
}

export function textToSemanticMap(text: string): Record<string, string> {
  const map: Record<string, string> = {};
  for (const line of text.split('\n')) {
    const m = /^\s*([^=]+?)\s*=\s*(.+?)\s*$/.exec(line);
    if (m) map[m[1]] = m[2];
  }
  return map;
}
