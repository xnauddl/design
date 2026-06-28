/* ============================================================
   license.ts — 라이선스 캐시 평가 / 검증 응답 파싱 (순수, figma·network 의존 없음)
   M2: 외부 키 검증의 "두뇌". 실제 fetch·clientStorage는 code.ts(부수효과)에서.
   원칙: 만료 전이면 적용, 오프라인이면 grace 동안 유지, grace 초과 시 강등(free).
   ============================================================ */
import { Tier, isTier } from './entitlements';

export interface LicenseCache {
  /** 사용자 라이선스 키. */
  key: string;
  /** 검증 서버가 부여한 티어. */
  tier: Tier;
  /** 구독 만료 시각(ms epoch). */
  expiresAt: number;
  /** 마지막 성공 검증 시각(ms epoch). */
  lastVerified: number;
  /** LS 기기 인스턴스 식별자 — 재검증 시 같은 기기로 validate하기 위해 보관(없을 수 있음). */
  instanceId?: string;
}

/** 이 주기보다 오래되면 온라인 시 재검증 권장. */
export const REVERIFY_MS = 24 * 60 * 60 * 1000; // 24시간
/** 재검증 실패(오프라인) 시 캐시 티어를 유지하는 최대 기간. */
export const GRACE_MS = 14 * 24 * 60 * 60 * 1000; // 14일

export type LicenseStatus = 'active' | 'grace' | 'expired' | 'none';

export interface LicenseEval {
  /** 실제 적용할 티어. */
  tier: Tier;
  status: LicenseStatus;
  /** 온라인 시 재검증이 필요한가. */
  stale: boolean;
}

/**
 * 캐시 + 현재시각 → 적용 티어/상태.
 * - 캐시 없음 → free/none
 * - 구독 만료(now>expiresAt) → free/expired
 * - 만료 전 & 최근 검증 → active
 * - 만료 전 & 검증 오래됨(≤grace) → grace(티어 유지, 재검증 필요)
 * - 만료 전 & grace 초과 → free/expired(장기 미검증 강등)
 */
export function evaluateLicense(cache: LicenseCache | null, now: number): LicenseEval {
  if (!cache) return { tier: 'free', status: 'none', stale: false };
  if (now > cache.expiresAt) return { tier: 'free', status: 'expired', stale: true };

  const age = now - cache.lastVerified;
  if (age <= REVERIFY_MS) return { tier: cache.tier, status: 'active', stale: false };
  if (age <= GRACE_MS) return { tier: cache.tier, status: 'grace', stale: true };
  return { tier: 'free', status: 'expired', stale: true };
}

export interface VerifyOk {
  ok: true;
  tier: Tier;
  expiresAt: number;
  /** 검증 서버가 돌려준 기기 인스턴스 식별자(있으면 캐시에 보관해 재검증 때 되돌려보냄). */
  instanceId?: string;
}
export interface VerifyErr {
  ok: false;
  error: string;
}

/** UI(검증 수행) → code(캐시·적용)로 전달되는 검증 결과. offline은 grace 폴백 신호. */
export type VerifyResult = VerifyOk | (VerifyErr & { offline?: boolean });

/**
 * 검증 서버 응답(JSON) 파싱. 기대 형식:
 *   성공: { valid:true, tier:'paid', expiresAt: <ms> }
 *   실패: { valid:false, error:'...' }
 * 위변조 방지를 위해 실제 운영에서는 서명(JWT 등) 검증을 추가한다(M2.1).
 */
export function parseVerifyResponse(json: unknown): VerifyOk | VerifyErr {
  if (!json || typeof json !== 'object') return { ok: false, error: '잘못된 응답 형식' };
  const o = json as Record<string, unknown>;
  if (o.valid === false) {
    return { ok: false, error: typeof o.error === 'string' ? o.error : '유효하지 않은 라이선스 키' };
  }
  if (!isTier(o.tier)) return { ok: false, error: '응답에 알 수 없는 티어' };
  const expiresAt = typeof o.expiresAt === 'number' ? o.expiresAt : 0;
  if (!expiresAt) return { ok: false, error: '응답에 만료 시각 없음' };
  return { ok: true, tier: o.tier, expiresAt };
}

/** 성공 응답 + 키 + 현재시각 → 저장할 캐시. */
export function cacheFromVerify(key: string, v: VerifyOk, now: number): LicenseCache {
  const cache: LicenseCache = { key, tier: v.tier, expiresAt: v.expiresAt, lastVerified: now };
  if (v.instanceId) cache.instanceId = v.instanceId; // 없으면 키 자체를 두지 않음(캐시 형태 안정).
  return cache;
}
