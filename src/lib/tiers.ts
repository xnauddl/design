/* ============================================================
   tiers.ts — 변수 컬렉션 ↔ 3계층(Global/Semantic/Component) 판정 (순수, figma 의존 없음)
   예전엔 컬렉션 **이름이 정확히** Global/Semantic/Component여야 계층으로 읽었다. 그래서
   남이 만든 'Primitives'·'Tokens' 컬렉션은 바인딩 우선순위·역할 추천·내보내기에서 빠졌다.
   이제 파일에 저장한 지정(역할 맵)을 먼저 보고, 지정이 없으면 예전처럼 정확한 이름으로 읽는다
   — 지정을 안 하면 동작이 그대로라 기존 파일에 영향이 없다.
   ============================================================ */

export type TierRole = 'global' | 'semantic' | 'component';
/** 역할 맵 값 — 'none'은 정확한 이름(예: 'Global')이어도 계층에서 빼라는 명시적 지정. */
export type RoleValue = TierRole | 'none';
/** 컬렉션 id → 지정. 파일(figma.root pluginData)에 JSON으로 저장된다. */
export type RoleMap = Record<string, RoleValue>;

export const TIER_ROLES: readonly TierRole[] = ['global', 'semantic', 'component'];
export const TIER_NUM: Record<TierRole, number> = { global: 1, semantic: 2, component: 3 };
/** 지정이 없을 때 계층으로 읽는 정확한 이름(그리고 새로 만들 때 쓰는 이름). */
export const CANONICAL_NAME: Record<TierRole, string> = { global: 'Global', semantic: 'Semantic', component: 'Component' };

const isRoleValue = (v: unknown): v is RoleValue => v === 'none' || TIER_ROLES.includes(v as TierRole);

/** 저장된 문자열 → 역할 맵. 깨졌거나 비었으면 빈 맵(= 예전 동작). 알 수 없는 값은 버린다. */
export function parseRoleMap(raw: string | null | undefined): RoleMap {
  if (!raw) return {};
  try {
    const o = JSON.parse(raw) as unknown;
    if (!o || typeof o !== 'object' || Array.isArray(o)) return {};
    const out: RoleMap = {};
    for (const [k, v] of Object.entries(o as Record<string, unknown>)) if (isRoleValue(v)) out[k] = v;
    return out;
  } catch {
    return {};
  }
}

/** 컬렉션의 역할 — 지정 우선, 없으면 정확한 이름. 'none' 지정이나 해당 없음은 null. */
export function roleOfCollection(col: { id: string; name: string }, map: RoleMap): TierRole | null {
  const set = map[col.id];
  if (set) return set === 'none' ? null : set;
  return TIER_ROLES.find((r) => CANONICAL_NAME[r] === col.name) ?? null;
}

/** 컬렉션의 계층 번호(Global 1 · Semantic 2 · Component 3 · 해당 없음 0). */
export function tierOfCollection(col: { id: string; name: string }, map: RoleMap): number {
  const r = roleOfCollection(col, map);
  return r ? TIER_NUM[r] : 0;
}

/**
 * 역할을 맡을 컬렉션 하나 — 쓰기(토큰 생성·별칭)의 대상.
 * 명시적으로 지정된 컬렉션이 정확한 이름의 컬렉션보다 먼저다('Primitives'를 Global로 지정했으면
 * 예전에 만든 'Global'이 남아 있어도 'Primitives'에 쓴다). 같은 순위 안에서는 목록 순서.
 */
export function pickCollection<T extends { id: string; name: string }>(cols: readonly T[], map: RoleMap, role: TierRole): T | undefined {
  return cols.find((c) => map[c.id] === role) ?? cols.find((c) => !map[c.id] && c.name === CANONICAL_NAME[role]);
}

/**
 * 지정 바꾸기 — 한 역할은 한 컬렉션만 맡는다(다른 컬렉션의 같은 역할 지정은 지운다).
 * role=null은 '지정 해제'(정확한 이름이면 다시 이름으로 읽힘), 'none'은 '계층 아님'으로 못 박기.
 */
export function assignRole(map: RoleMap, colId: string, role: RoleValue | null): RoleMap {
  const out: RoleMap = {};
  for (const [k, v] of Object.entries(map)) {
    if (k === colId) continue;
    if (role && role !== 'none' && v === role) continue; // 같은 역할은 하나만
    out[k] = v;
  }
  if (role) out[colId] = role;
  return out;
}

/** 이름으로 역할 추측 — 설정 화면의 '추천' 표시용일 뿐, 자동으로 적용하지 않는다. */
export function guessRole(name: string): TierRole | null {
  const n = name.toLowerCase();
  if (/\bcomponents?\b/.test(n)) return 'component';
  if (/semantic|alias|theme|role|system|^tokens?$/.test(n)) return 'semantic';
  if (/global|primitive|core|base|palette|foundation|raw|ref(erence)?s?\b/.test(n)) return 'global';
  return null;
}
