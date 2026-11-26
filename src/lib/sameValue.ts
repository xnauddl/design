/* ============================================================
   sameValue.ts — "같은 값" · 후보 고르기 · 자리 가르기 (IA v4 §2.9 S2-P1, 순수 — figma 의존 없음)
   찾기(카드 숫자 · 연결 화면) · 실제 연결 · 연결 직전 다시 확인 · 만들기 미리보기 · 만들기 실행이 모두 이 모듈을 부른다.
   같은 판정을 다른 곳에 따로 적지 않는다(docs/invariants.md §2 · §3).
   ============================================================ */
import { colorKey } from './tokens';
import { byFamilyOrder, familyRe, isOldColorName, isOldLadderName, nameKindOf } from './usageRoles';

/** 숫자의 "같은 값" — 소수 둘째 자리까지 같으면 같다. 허용오차는 없다(S2-P2). */
export const round2 = (n: number): number => Math.round(n * 100) / 100;
export function sameNumber(a: number, b: number): boolean {
  return round2(a) === round2(b);
}

export type ValueKind = 'color' | 'num' | 'text';

/**
 * 값 키(S2-P2) — 값 키가 같으면 같은 값이다.
 * 색: 소문자 hex + 투명도(소수 둘째 자리, 1이면 없음 — `colorKey`). 이미 값 키(`#rrggbb@0.08`)면 그대로 소문자로.
 * 숫자: 소수 둘째 자리로 반올림한 값. 글꼴: 글꼴 이름 그대로.
 */
export function valueKeyOf(kind: ValueKind, value: string | number, alpha?: number): string {
  if (kind === 'color') {
    const s = String(value);
    return s.includes('@') ? s.toLowerCase() : colorKey(s, alpha);
  }
  if (kind === 'num') return String(round2(Number(value)));
  return String(value);
}

/** 변수 하나(S2-P4 후보 풀의 원소). 값은 기본 모드에서 별칭을 끝까지 따라간 값이다. */
export interface VarInfo {
  id: string;
  name: string;
  /** 변수 타입(COLOR · FLOAT · STRING · BOOLEAN). */
  type: string;
  /** 별칭을 따라간 값 키 — 못 읽으면 null(12홉 안에 직접 값에 닿지 않음 · 대상이 라이브러리 · 삭제된 변수). 후보가 아니다. */
  key: string | null;
  /** 그 변수 자신의 용도(별칭이 가리키는 원시값의 용도가 아니다). */
  scopes: readonly string[];
  /** 직접 값에 닿기까지 따라간 별칭 수 — 원시값 변수는 0. */
  hops: number;
  collection: 'pluginGlobal' | 'pluginSemantic' | 'user';
  /** 플러그인이 만든 역할(`dsl.autoRole`). */
  autoRole: boolean;
  /** 직접 만든 변수(`dsl.manual` — 플러그인 Global 컬렉션 안). 판정에 쓰지 않는다 — 만들기의 "값이 다른 직접 만든 변수는 고치지 않음"에만. */
  manual: boolean;
  /** 거울 — 플러그인 Global 컬렉션 밖의 별칭 변수가 플러그인 Global 컬렉션의 변수와 이름이 같음. */
  mirror: boolean;
  /** 플러그인 컬렉션(Global · Semantic)이 아닌 컬렉션의 변수인가(같은 이름이면 사용자 컬렉션 먼저). */
  user: boolean;
  /** 컬렉션 목록 순서. */
  colIdx: number;
  /** 별칭이 닿는 원시값 변수 id(원시값 변수면 자기 id) — 만들기의 가리킬 원시값(`globalOf`). */
  rawId?: string;
}

/** 자리 하나(판정이 끝난 뒤 — 값은 `key` 하나다. 알약 전용 필드는 없다). */
export interface PlaceInfo {
  /** 필요한 변수 타입(COLOR · FLOAT · STRING). */
  type: string;
  key: string;
  /** 허용 용도(첫째 = 용도 예외로 더할 용도). */
  allowed: readonly string[];
  /** 쓰임 이름 — 플러그인이 만든 역할의 가족 판정(없으면 플러그인이 만든 역할은 후보가 아니다). */
  usage?: string;
  /** 쓰임 이름 대신 쓰는 가족 판정(만들기의 재사용 — 토큰의 쓰임이 여럿일 때). */
  roleOk?: (name: string) => boolean;
  /** 숫자 자리의 토큰 이름 `{그룹}/{값}` — 숫자 용도 예외는 이 이름과 같은 플러그인 Global만(SC-D34). */
  tokenName?: string;
  /** 글자 자리의 그룹 접두사(`font-size` …) — 별칭 후보는 `{그룹}/…` 이름만. */
  textGroup?: string;
}

/** 고른 것 — alias면 그대로 붙이고, 원시값이면 유료는 새 Semantic으로 감싸고 무료는 바로 붙인다(S2-P6). */
export interface CandidatePick {
  variable: VarInfo;
  alias: boolean;
  /** 용도 예외(S2-P3) — 연결할 때 이 용도를 그 플러그인 Global에 더한다. */
  scopeAdd?: string;
}

/** 용도가 맞다 = 변수 용도에 `ALL_SCOPES`가 있거나 자리의 허용 용도 가운데 하나가 있다(S2-P3). */
export function scopeFitsPlace(scopes: readonly string[], allowed: readonly string[]): boolean {
  return scopes.includes('ALL_SCOPES') || allowed.some((s) => scopes.includes(s));
}

/** 플러그인이 만든 역할인가 — 표시(`dsl.autoRole`) 또는 표시 없는 옛 색 이름 넷(별칭일 때). */
const isRole = (v: VarInfo): boolean => v.hops > 0 && (v.autoRole || isOldColorName(v.name));
/** 후보에서 빼는 별칭 — 거울 · 표시 없는 옛 단계 이름(S2-P4 "뺀다"). */
const droppedAlias = (v: VarInfo): boolean => v.hops > 0 && (v.mirror || (!v.autoRole && isOldLadderName(v.name)));

const cmpName = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
/** 이름까지 같으면 사용자 컬렉션 먼저, 그 안에서 컬렉션 목록 순. */
const cmpSameName = (a: VarInfo, b: VarInfo): number => Number(b.user) - Number(a.user) || a.colIdx - b.colIdx;
/** S2-P5 ② — 별칭 먼저 → 홉 수 작은 것 → 이름 오름차순(코드 단위) → 사용자 컬렉션 먼저 → 컬렉션 목록 순. */
export function candidateOrder(a: VarInfo, b: VarInfo): number {
  return Number(b.hops > 0) - Number(a.hops > 0) || a.hops - b.hops || cmpName(a.name, b.name) || cmpSameName(a, b);
}

/** 값 · 타입이 같은 변수를 갈래별로 나눈다(S2-P4) — 용도가 맞는 것만. `roles`는 가족 판정 전이다. */
export function candidatePool(place: PlaceInfo, vars: readonly VarInfo[]): { aliases: VarInfo[]; raws: VarInfo[]; roles: VarInfo[] } {
  const aliases: VarInfo[] = [];
  const raws: VarInfo[] = [];
  const roles: VarInfo[] = [];
  for (const v of vars) {
    if (v.key == null || v.key !== place.key || v.type !== place.type) continue;
    if (!scopeFitsPlace(v.scopes, place.allowed)) continue;
    if (v.hops === 0) raws.push(v);
    else if (droppedAlias(v)) continue;
    else if (isRole(v)) roles.push(v);
    else if (!place.textGroup || v.name.startsWith(`${place.textGroup}/`)) aliases.push(v);
  }
  return { aliases, raws, roles };
}

/**
 * 한 자리에 붙일 변수 하나(S2-P3–S2-P5). 없으면 null.
 * ① 플러그인이 만든 역할은 그 자리 쓰임 이름의 가족일 때만 후보이고, 여럿이면 가족 순서(글자 자리는 이름 순) 첫 번째 하나만 남긴다
 * ② 남은 후보를 `candidateOrder`로 줄 세워 첫 번째 ③ 용도가 맞는 후보가 하나도 없을 때만 플러그인 Global 예외 — 값이 같고 용도만 맞지 않는
 *    플러그인 Global 컬렉션의 직접 값 변수(직접 만든 변수 포함 — SC-D38): 색은 값만, 숫자는 이름이 `tokenName`과 같을 때만(SC-D34). 글자는 없다.
 */
export function pickCandidate(place: PlaceInfo, vars: readonly VarInfo[]): CandidatePick | null {
  const pool = candidatePool(place, vars);
  let role: VarInfo | undefined;
  if (pool.roles.length) {
    if (place.textGroup) {
      role = pool.roles.filter((v) => v.name.startsWith(`${place.textGroup}/`)).sort((a, b) => cmpName(a.name, b.name) || cmpSameName(a, b))[0];
    } else if (place.roleOk) {
      const ok = place.roleOk;
      role = pool.roles.filter((v) => ok(v.name)).sort((a, b) => cmpName(a.name, b.name) || cmpSameName(a, b))[0];
    } else if (place.usage) {
      const re = familyRe(place.usage, nameKindOf(place.usage, place.key));
      const ord = byFamilyOrder(place.usage);
      role = pool.roles.filter((v) => re.test(v.name)).sort((a, b) => ord(a.name, b.name) || cmpSameName(a, b))[0];
    }
  }
  const all = [...pool.aliases, ...pool.raws, ...(role ? [role] : [])].sort(candidateOrder);
  if (all.length) return { variable: all[0], alias: all[0].hops > 0 };
  // 용도 예외(S2-P3) — 용도가 맞는 후보가 하나도 없을 때만
  if (place.type !== 'COLOR' && !(place.type === 'FLOAT' && place.tokenName && !place.textGroup)) return null;
  const ex = vars
    .filter((v) => v.collection === 'pluginGlobal' && v.hops === 0 && v.key === place.key && v.type === place.type && (place.type === 'COLOR' || v.name === place.tokenName))
    .sort((a, b) => cmpName(a.name, b.name) || cmpSameName(a, b))[0];
  return ex ? { variable: ex, alias: false, scopeAdd: place.allowed[0] } : null;
}

/** 새로 만들 값 하나(S2-P7) — 값 단위 = (종류, 값 키). `by` = 허용 용도 묶음 키 → 자리 수(토큰 `freeBy`와 같은 키). */
export interface MakeValue {
  kind: string;
  value: string | number;
  alpha?: number;
  by: Record<string, number>;
}

/** 가를 자리 — 후보가 없을 때 새로 만들 값이면 `make`(종류 · 값)를 싣는다. 글자 · 소수 · 버릴 값은 싣지 않는다. */
export interface SplitPlace extends PlaceInfo {
  make?: { kind: string; value: string | number; alpha?: number };
}

/**
 * 자리 가르기(S2-P7) — 한 자리는 한쪽에만 속한다. 후보가 있으면 `link`(연결할 곳), 없고 만들 수 있는 값이면 그 값이 `make`
 * (값 단위로 묶음 — `made`는 그 자리들), 그 밖(후보 없는 글자 자리 · 소수 · 버릴 값)은 `none`.
 */
export function splitPlaces<P extends SplitPlace>(places: readonly P[], vars: readonly VarInfo[]): { link: { place: P; pick: CandidatePick }[]; make: MakeValue[]; made: P[]; none: P[] } {
  const link: { place: P; pick: CandidatePick }[] = [];
  const made: P[] = [];
  const none: P[] = [];
  const byValue = new Map<string, MakeValue>();
  const memo = new Map<string, CandidatePick | null>();
  for (const p of places) {
    // 같은 (타입 · 값 · 용도 · 쓰임 · 이름 조건)이면 같은 답 — 큰 선택에서 변수 목록을 자리마다 다시 훑지 않는다.
    const mk = p.roleOk ? '' : `${p.type}\u0000${p.key}\u0000${p.allowed.join('|')}\u0000${p.usage ?? ''}\u0000${p.tokenName ?? ''}\u0000${p.textGroup ?? ''}`;
    let pick = mk ? memo.get(mk) : undefined;
    if (pick === undefined) {
      pick = pickCandidate(p, vars);
      if (mk) memo.set(mk, pick);
    }
    if (pick) {
      link.push({ place: p, pick });
      continue;
    }
    if (!p.make) {
      none.push(p);
      continue;
    }
    made.push(p);
    const k = `${p.make.kind}\u0000${p.key}`;
    let mv = byValue.get(k);
    if (!mv) {
      mv = { kind: p.make.kind, value: p.make.value, ...(p.make.alpha != null && p.make.alpha < 1 ? { alpha: p.make.alpha } : {}), by: {} };
      byValue.set(k, mv);
    }
    const g = p.allowed.join('|');
    mv.by[g] = (mv.by[g] ?? 0) + 1;
  }
  return { link, make: [...byValue.values()], made, none };
}

/**
 * 만들기의 재사용(S2-P8 ①) — 토큰(값)의 빈 자리가 있는 용도 묶음마다 `pickCandidate`. 모든 묶음에 후보가 있으면 그 고른 것들(묶음 순서),
 * 하나라도 없거나 묶음이 0개면 null(재사용 판정을 하지 않는다 — "묶음이 없으니 모두 후보가 있다"로 읽지 않는다).
 */
export function tokenReuse(groups: readonly PlaceInfo[], vars: readonly VarInfo[]): CandidatePick[] | null {
  if (!groups.length) return null;
  const out: CandidatePick[] = [];
  for (const g of groups) {
    const p = pickCandidate(g, vars);
    if (!p) return null;
    out.push(p);
  }
  return out;
}

/**
 * 알약 반경 판정 집합(S2-P2 · SC-D36 ① · SC-D37 · SC-D39) — 모서리의 원래 값 키가 이 집합에 있으면 알약이 아니다.
 * 드는 변수: 플러그인 Global 컬렉션 밖 · 플러그인이 만든 역할이 아님 · FLOAT · 값을 앎 · 용도에 `CORNER_RADIUS`를 직접 켬
 * (`ALL_SCOPES`가 없고 `CORNER_RADIUS`가 있음 — 빈 배열 아님, 별칭은 그 변수 자신의 용도) · 별칭이면 거울 · 옛 단계 이름이 아님.
 */
export function userRadiusKeys(vars: readonly VarInfo[]): Set<string> {
  const out = new Set<string>();
  for (const v of vars) {
    if (v.collection === 'pluginGlobal' || v.autoRole || v.type !== 'FLOAT' || v.key == null) continue;
    if (v.scopes.includes('ALL_SCOPES') || !v.scopes.includes('CORNER_RADIUS')) continue;
    if (droppedAlias(v)) continue;
    out.add(v.key);
  }
  return out;
}

/**
 * 추출이 그 자리에서 토큰을 내는가(S2-P7 표) — 투명도 · 색은 참, 그 밖의 숫자 종류(Spacing · Radius · Size · Stroke)는
 * 소수 둘째 자리로 반올림한 값이 0보다 큰 정수일 때 참. 추출(`extract.ts`)과 카드의 p가 함께 쓴다.
 */
export function tokenable(kind: string, value: string | number): boolean {
  if (kind === 'color' || kind === 'opacity') return true;
  const v = round2(Number(value));
  return v > 0 && Number.isInteger(v);
}

/**
 * Semantic 수 r(S2-P8) — 값 키가 같고 그 용도를 모두 덮는(또는 `ALL_SCOPES`) 별칭 후보가 있는가. 있으면 그 역할은 세지도 만들지도 않는다.
 * 사용자 별칭은 이름과 상관없이, 플러그인이 만든 역할은 `base`의 가족일 때. 거울 · 옛 단계 이름 제외.
 */
export function aliasCovers(vars: readonly VarInfo[], q: { type: string; key: string; need: readonly string[]; base: string }): boolean {
  let re: RegExp | undefined;
  return vars.some((v) => {
    if (v.hops === 0 || v.key !== q.key || v.type !== q.type || droppedAlias(v)) return false;
    if (!v.scopes.includes('ALL_SCOPES') && !q.need.every((s) => v.scopes.includes(s))) return false;
    if (!isRole(v)) return true;
    re ??= familyRe(q.base, nameKindOf(q.base, q.key));
    return re.test(v.name);
  });
}
