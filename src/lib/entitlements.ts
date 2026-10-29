/* ============================================================
   entitlements.ts — 요금제 티어·기능 게이팅 (순수, figma 의존 없음)
   수익화: Free / Paid 2단계. 기능 기반 게이팅(회당 횟수 제한 없음).
   - Free(무제한 사용): 추출·바인딩·리네임·변수 편집·닮은 프레임 스캔·코드 내보내기.
   - Paid: 위 전부 + 팔레트 생성/적용·토큰(3계층 변수) 생성·시맨틱 매핑·컴포넌트/베리언트·
     닮은 프레임 컴포넌트화·텍스트 스타일·다크 테마 생성·공유 프리셋.
   원칙(ROADMAP §5): 유료 카드는 미리보기까지 함께 잠근다(닮은 프레임 스캔만 예외).
   ============================================================ */

export type Tier = 'free' | 'paid';

/** Paid에서 해금되는 유료 기능. (게이팅 메시지 라우팅 키로도 사용) */
export type Feature =
  | 'tokens' // 토큰(3계층 변수) 생성
  | 'semantics' // 시맨틱 매핑
  | 'components' // 컴포넌트 등록·베리언트(Phase 3/4/4.1)
  | 'textStyles' // 텍스트 스타일 등록·적용
  | 'presets'; // 공유 프리셋

export const TIERS: Tier[] = ['free', 'paid'];

/** 해당 티어가 기능을 사용할 수 있는가. 모든 유료 기능은 Paid에서 해금. */
export function hasEntitlement(tier: Tier, _feature: Feature): boolean {
  return tier === 'paid';
}

/** 런타임 값이 유효한 Tier인지(저장소/메시지/토큰 클레임 입력 검증용). */
export function isTier(v: unknown): v is Tier {
  return v === 'free' || v === 'paid';
}

/** 구 3티어(pro/team) → Paid 2티어. 알 수 없는 값은 null. */
export function normalizeLegacyTier(v: unknown): Tier | null {
  if (v === 'free' || v === 'paid') return v;
  if (v === 'pro' || v === 'team') return 'paid';
  return null;
}
