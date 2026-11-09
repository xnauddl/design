/* ============================================================
   tiers.ts — 변수 컬렉션 ↔ 3계층(Global/Semantic/Component) 판정 (순수, figma 의존 없음)
   §2.13(2026-11-06 사용자 결정 B): 계층은 사용자가 지정하지 않는다.
   - 플러그인 컬렉션(표시 `dsl.owned` 또는 이름 `Global`·`Semantic` 이어받기)은 그 역할 — collectionRoles.ts가 정한다.
   - 사용자 컬렉션은 내용으로 판단한다(13.3): 판단할 변수 0개 → 계층 아님, 이름에 component → Component,
     별칭 80% 이상 → Semantic, 직접 값 80% 이상 → Global, 그 사이 → 계층 아님.
   ============================================================ */

export type TierRole = 'global' | 'semantic' | 'component';
/** 플러그인 컬렉션 역할 — Component 역할의 플러그인 컬렉션은 없다(13.1). */
export type OwnedRole = 'global' | 'semantic';

export const TIER_ROLES: readonly TierRole[] = ['global', 'semantic', 'component'];
export const TIER_NUM: Record<TierRole, number> = { global: 1, semantic: 2, component: 3 };
/** 플러그인 컬렉션 이름(이어받기 · 새로 만들 때). */
export const CANONICAL_NAME: Record<OwnedRole, string> = { global: 'Global', semantic: 'Semantic' };

/** 계층 판단 근거 — 사이드바 배지 툴팁(§4.4)이 문구를 만든다. */
export type TierWhy = { kind: 'owned' } | { kind: 'empty' | 'name' | 'ratio'; alias: number; counted: number };
export interface TierInfo {
  tier: number;
  why: TierWhy;
}

/** 판단할 변수 한 개의 기본 모드 값 요약 — 별칭이면 대상 컬렉션 id(로컬이 아니면 null = 라이브러리 · 삭제된 대상). */
export interface TierSample {
  alias: boolean;
  targetCollection?: string | null;
}

/** 이름에 단어 component · components가 있나(대소문자 무시, 13.3-2). */
export function hasComponentWord(name: string): boolean {
  return /\bcomponents?\b/i.test(name);
}

/**
 * 사용자 컬렉션의 계층(13.3). samples = 그 컬렉션 변수들의 기본 모드 값.
 * 같은 컬렉션 안을 가리키는 별칭은 세지 않는다(원시값 컬렉션 안의 바로가기 때문에 흔들리지 않게).
 * 경계는 정수로: 5a ≥ 4n → Semantic, 5a ≤ n → Global.
 */
export function judgeUserTier(name: string, collectionId: string, samples: readonly TierSample[]): TierInfo {
  let counted = 0;
  let alias = 0;
  for (const s of samples) {
    if (s.alias && s.targetCollection === collectionId) continue;
    counted++;
    if (s.alias) alias++;
  }
  if (counted === 0) return { tier: 0, why: { kind: 'empty', alias, counted } };
  if (hasComponentWord(name)) return { tier: 3, why: { kind: 'name', alias, counted } };
  const tier = 5 * alias >= 4 * counted ? 2 : 5 * alias <= counted ? 1 : 0;
  return { tier, why: { kind: 'ratio', alias, counted } };
}

/**
 * 플러그인 컬렉션 고르기(13.2) — 순수 판정. marker = 컬렉션의 `dsl.owned` 값('' = 없음).
 * 1. 그 역할 표시가 있는 첫 컬렉션. 2. 없으면 어떤 표시도 없고 이름이 정확히 Global · Semantic인 첫 컬렉션(이어받기).
 * 한 컬렉션이 두 역할을 맡지 않는다(표시가 있으면 그 표시의 역할만).
 */
export function pickOwned<T extends { id: string; name: string }>(cols: readonly T[], marker: (c: T) => string): Record<OwnedRole, T | undefined> {
  const out: Record<OwnedRole, T | undefined> = { global: undefined, semantic: undefined };
  for (const role of ['global', 'semantic'] as const) {
    out[role] = cols.find((c) => marker(c) === role) ?? cols.find((c) => !marker(c) && c.name === CANONICAL_NAME[role]);
  }
  return out;
}
