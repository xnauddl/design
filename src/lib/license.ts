/* ============================================================
   license.ts — 라이선스 캐시 평가 / 검증 응답 파싱 (순수, figma·network 의존 없음)
   M2: 외부 키 검증의 "두뇌". 실제 fetch·clientStorage는 code.ts(부수효과)에서.
   원칙: 만료 전이면 적용, 오프라인이면 grace 동안 유지, grace 초과 시 강등(free).
   ============================================================ */
import { Tier, normalizeLegacyTier } from './entitlements';

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

/**
 * UI(검증 수행) → code(캐시·적용)로 전달되는 검증 결과.
 * `offline: true`는 **캐시 티어를 grace로 유지하라**는 신호이므로, 서버에 도달한 뒤의 실패
 * (서명 불일치·클레임 오류·5xx·비JSON 응답)에는 절대 붙이지 않는다 — 페이월 페일오픈이 된다.
 * 오직 fetch 자체가 실패(연결 불가)했을 때만 붙인다.
 */
export type VerifyResult = VerifyOk | (VerifyErr & { offline?: boolean });

/**
 * 검증 서버 응답에서 서명 토큰(JWT)을 꺼낸다.
 * 서명 없는 평문 응답(`{valid:true,tier:'paid'}`)은 페이월 우회 경로이므로 수용하지 않는다(M2.1).
 *
 * 다만 서버가 **명시적으로 거부**한 경우(`{valid:false,error}`)엔 그 사유를 그대로 전한다.
 * Worker는 만료·기기 활성화 한도 초과를 이 형태(status 200)로 알려주는데, 뭉뚱그려
 * "서명 토큰이 없는 응답"이라고만 하면 사용자가 무엇을 해야 할지 알 수 없다.
 * 실패 문구만 바꿀 뿐 `ok:true`로 승격시키지 않으므로 서명 없는 응답을 수용하는 것과 무관하다.
 */
export function extractSignedToken(json: unknown): { ok: true; token: string } | { ok: false; error: string } {
  if (!json || typeof json !== 'object') return { ok: false, error: '응답 본문을 해석할 수 없습니다' };
  const o = json as { token?: unknown; valid?: unknown; error?: unknown };
  if (typeof o.token === 'string' && o.token) return { ok: true, token: o.token };
  if (o.valid === false && typeof o.error === 'string' && o.error) return { ok: false, error: o.error };
  return { ok: false, error: '서명 토큰이 없는 응답' };
}

/** 응답의 기기 instanceId(문자열일 때만) — 없으면 기존 캐시 값을 유지. */
export function pickInstanceId(json: unknown, prev?: string): string | undefined {
  if (json && typeof json === 'object') {
    const v = (json as { instanceId?: unknown }).instanceId;
    if (typeof v === 'string' && v) return v;
  }
  return prev;
}

/** 성공 응답 + 키 + 현재시각 → 저장할 캐시. */
export function cacheFromVerify(key: string, v: VerifyOk, now: number): LicenseCache {
  const cache: LicenseCache = { key, tier: v.tier, expiresAt: v.expiresAt, lastVerified: now };
  if (v.instanceId) cache.instanceId = v.instanceId; // 없으면 키 자체를 두지 않음(캐시 형태 안정).
  return cache;
}

/**
 * clientStorage에서 읽은 캐시 정규화. 구 3티어(pro/team)는 paid로 승격.
 * 필수 필드가 없거나 tier를 알 수 없으면 null(손상 캐시 무시).
 */
export function normalizeLicenseCache(raw: unknown): LicenseCache | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.key !== 'string') return null;
  const tier = normalizeLegacyTier(o.tier);
  if (!tier) return null;
  if (typeof o.expiresAt !== 'number' || typeof o.lastVerified !== 'number') return null;
  const cache: LicenseCache = { key: o.key, tier, expiresAt: o.expiresAt, lastVerified: o.lastVerified };
  if (typeof o.instanceId === 'string' && o.instanceId) cache.instanceId = o.instanceId;
  return cache;
}
