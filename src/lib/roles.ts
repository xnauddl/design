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
import { clusterColorTokens } from './colorCluster';

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

/** radius: 티셔츠 + 0→none · 큰 값(≥999, 알약형)→full 오버라이드. */
export function radiusRoles(values: number[]): string[] {
  const base = tshirtRoles(values);
  return values.map((v, i) => (v === 0 ? 'none' : v >= 999 ? 'full' : base[i]));
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

  // 색 — ΔE 군집(와이어프레임 '정리(군집)')으로 비슷한 색을 대표색으로 묶은 뒤,
  // 역할은 대표색에만 추천(무채→surface/text/border, 채도최고→primary). 단색은 그대로 대표색.
  const { clusters } = clusterColorTokens(tokens);
  Object.assign(map, suggestSemanticMap(clusters.map((cl) => cl.representative)));

  // 수치 — 티셔츠/타입 스케일. prefix는 Semantic 폴더 그룹.
  const scale = (category: TokenCategory, prefix: string, roleFn: (vals: number[]) => string[]): void => {
    const entries = numericEntries(tokens, category);
    const roles = roleFn(entries.map((e) => e.value));
    entries.forEach((e, i) => {
      map[`${prefix}/${roles[i]}`] = e.name;
    });
  };
  scale('gap', 'spacing', tshirtRoles);
  scale('radius', 'radius', radiusRoles);
  scale('size', 'size', tshirtRoles);
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
