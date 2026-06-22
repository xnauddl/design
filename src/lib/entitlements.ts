/* ============================================================
   entitlements.ts — 요금제 티어·기능 게이팅 (순수, figma 의존 없음)
   수익화: Free / Paid 2단계. 기능 기반 게이팅(회당 횟수 제한 없음).
   - Free(무제한 사용): 팔레트·리네임·바인딩·토큰 미리보기·대비점검·코드 내보내기.
   - Paid: 위 전부 + 토큰(3계층 변수) 생성·시맨틱 매핑·컴포넌트/베리언트·공유 프리셋/이력.
   원칙(README 유료화): 무료 비차단 / 유료는 미리보기 허용·생성만 잠금.
   ============================================================ */

export type Tier = 'free' | 'paid';

/** Paid에서 해금되는 유료 기능. (게이팅 메시지 라우팅 키로도 사용) */
export type Feature =
  | 'tokens' // 토큰(3계층 변수) 생성
  | 'semantics' // 시맨틱 매핑
  | 'components' // 컴포넌트 등록·베리언트(Phase 3/4/4.1)
  | 'presets'; // 공유 프리셋·변경 이력

export const TIERS: Tier[] = ['free', 'paid'];

/** 해당 티어가 기능을 사용할 수 있는가. 모든 유료 기능은 Paid에서 해금. */
export function hasEntitlement(tier: Tier, _feature: Feature): boolean {
  return tier === 'paid';
}

/** 유료 사용자 여부(가독성 헬퍼). */
export function isPaid(tier: Tier): boolean {
  return tier === 'paid';
}

/** 런타임 값이 유효한 Tier인지(저장소/메시지/토큰 클레임 입력 검증용). */
export function isTier(v: unknown): v is Tier {
  return v === 'free' || v === 'paid';
}
