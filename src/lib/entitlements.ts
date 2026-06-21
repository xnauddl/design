/* ============================================================
   entitlements.ts — 요금제 티어·기능 게이팅·사용량 한도 (순수, figma 의존 없음)
   M1 스캐폴드: 결제 없음. 티어는 개발용 토글로 설정(code.ts가 clientStorage에 보관).
   원칙(README 유료화): 무료 비차단 / 유료·한도초과는 미리보기 허용·적용만 잠금.
   ============================================================ */

export type Tier = 'free' | 'pro' | 'team';

/** 상위 티어에서 해금되는 유료 기능 플래그. (대상 기능 일부는 추후 구현) */
export type Feature =
  | 'unlimited' // 사용량 한도 해제
  | 'components' // 컴포넌트 등록·베리언트 분류 (Phase 3)
  | 'publish' // 라이브러리 발행
  | 'multiMode' // 멀티모드/테마
  | 'aiNaming' // AI 네이밍 제안
  | 'teamPresets'; // 팀 공유 프리셋·이력·시트

export const TIERS: Tier[] = ['free', 'pro', 'team'];

const TIER_RANK: Record<Tier, number> = { free: 0, pro: 1, team: 2 };

/** 각 기능을 해금하는 최소 티어. */
const FEATURE_MIN_TIER: Record<Feature, Tier> = {
  unlimited: 'pro',
  components: 'pro',
  publish: 'pro',
  multiMode: 'pro',
  aiNaming: 'pro',
  teamPresets: 'team',
};

/** 해당 티어가 기능을 사용할 수 있는가. */
export function hasEntitlement(tier: Tier, feature: Feature): boolean {
  return TIER_RANK[tier] >= TIER_RANK[FEATURE_MIN_TIER[feature]];
}

/** 1회 실행 사용량 한도. 무제한은 Infinity. */
export interface Limits {
  nodes: number;
  tokens: number;
  bindings: number;
}

/** Free 기본 한도(자리표시 — 추후 조정). */
export const FREE_LIMITS: Limits = { nodes: 50, tokens: 100, bindings: 200 };
const UNLIMITED: Limits = { nodes: Infinity, tokens: Infinity, bindings: Infinity };

/** 티어별 사용량 한도. Pro 이상은 무제한. */
export function limitsForTier(tier: Tier): Limits {
  return hasEntitlement(tier, 'unlimited') ? UNLIMITED : FREE_LIMITS;
}

export interface Clamp {
  /** 한도 내에서 적용 가능한 수. */
  allowed: number;
  /** 요청이 한도를 초과했는가. */
  limited: boolean;
  /** 한도 초과로 잘려나간 수. */
  overflow: number;
}

/** 요청 수를 한도까지 자른다. 비파괴 게이팅(초과분은 적용 안 함)의 기본 계산. */
export function clampCount(requested: number, limit: number): Clamp {
  const allowed = Math.min(requested, limit);
  return { allowed, limited: requested > limit, overflow: Math.max(0, requested - allowed) };
}

/** 런타임 값이 유효한 Tier인지(저장소/메시지 입력 검증용). */
export function isTier(v: unknown): v is Tier {
  return typeof v === 'string' && (TIERS as string[]).includes(v);
}
