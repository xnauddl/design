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
