/* ============================================================
   licenseConfig.ts — 라이선스 검증 설정(자리표시). UI(검증 수행)·code(식별자) 공용.
   배포 시 실제 검증 서버 URL·공개키로 교체하고 manifest.allowedDomains와 일치시킨다.
   ============================================================ */

export const PLUGIN_ID = 'design-system-linker';

/** 검증 서버 엔드포인트(미배포 자리표시). manifest.networkAccess.allowedDomains와 일치해야 함. */
export const VERIFY_URL = 'https://license.example.com/verify';

/** 서명 토큰(JWT) 발급자/대상 — 클레임 검증용(자리표시). */
export const LICENSE_ISS = 'design-system-linker-license';
export const LICENSE_AUD = PLUGIN_ID;

/** 서명 알고리즘. */
export const LICENSE_ALG = 'ES256';

/** 검증 서버 공개키(JWK, ES256/P-256) — 자리표시. 배포 시 실제 공개키로 교체. */
export const LICENSE_PUBLIC_JWK = { kty: 'EC', crv: 'P-256', x: 'PLACEHOLDER', y: 'PLACEHOLDER' };

/** 구매(체크아웃) 페이지 — LemonSqueezy 결제 링크(자리표시). 배포 시 교체. */
export const PURCHASE_URL = 'https://example.lemonsqueezy.com/buy/PLACEHOLDER';

/** 구독·결제·기기 관리(LemonSqueezy Customer Portal, 자리표시). 배포 시 교체. */
export const PORTAL_URL = 'https://app.lemonsqueezy.com/my-orders';

/**
 * 아직 자리표시자인가 — 결제 링크를 눌러도 없는 페이지로 가는 상태.
 * UI가 이걸로 구독 버튼을 숨긴다(배포 시 URL을 갈아끼우면 자동으로 다시 노출).
 */
export function licenseLinksConfigured(): boolean {
  return !PURCHASE_URL.includes('PLACEHOLDER') && !PURCHASE_URL.includes('example.');
}

/** 검증 서버·공개키가 실제 값으로 교체됐는가 — 미설정이면 키 검증이 항상 실패한다. */
export function licenseVerifyConfigured(): boolean {
  return !VERIFY_URL.includes('example.') && LICENSE_PUBLIC_JWK.x !== 'PLACEHOLDER';
}
