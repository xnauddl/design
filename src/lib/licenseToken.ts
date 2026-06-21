/* ============================================================
   licenseToken.ts — 서명된 라이선스 토큰(JWT) 검증 코어 (순수, crypto 의존 없음)
   M2.1: 위변조 방지. 서명 검증 원시연산은 호스트(WebCrypto)에서 주입(verifySig).
   - 서버는 비대칭 서명(예: ES256/EdDSA) JWT를 발급, 플러그인은 공개키로 검증.
   - 클레임(만료·발급자·대상·티어)은 여기서 순수 검사 → node --test로 검증.
   - 페이로드는 ASCII JSON 가정(라이선스 클레임: tier·날짜·식별자).
   ============================================================ */
import { isTier, Tier } from './entitlements';
import type { VerifyOk, VerifyErr } from './license';

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const LOOKUP: Record<string, number> = {};
for (let i = 0; i < B64.length; i++) LOOKUP[B64[i]] = i;

/** base64url → 바이트의 latin1 문자열(ASCII JSON 가정). atob/Buffer 비의존 — 어디서나 동작. */
export function base64UrlToString(input: string): string {
  let b64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const rem = b64.length % 4;
  if (rem === 1) throw new Error('잘못된 base64url 길이');
  if (rem === 2) b64 += '==';
  else if (rem === 3) b64 += '=';
  let out = '';
  for (let i = 0; i < b64.length; i += 4) {
    const c0 = LOOKUP[b64[i]];
    const c1 = LOOKUP[b64[i + 1]];
    const e2 = b64[i + 2];
    const e3 = b64[i + 3];
    const c2 = e2 === '=' ? -1 : LOOKUP[e2];
    const c3 = e3 === '=' ? -1 : LOOKUP[e3];
    if (c0 === undefined || c1 === undefined || (e2 !== '=' && c2 === undefined) || (e3 !== '=' && c3 === undefined)) {
      throw new Error('잘못된 base64url 문자');
    }
    out += String.fromCharCode((c0 << 2) | (c1 >> 4));
    if (c2 !== -1) out += String.fromCharCode(((c1 & 15) << 4) | (c2 >> 2));
    if (c3 !== -1) out += String.fromCharCode(((c2 & 3) << 6) | c3);
  }
  return out;
}

export interface Jwt {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  /** 서명 대상: `${headerB64}.${payloadB64}`. */
  signingInput: string;
  /** base64url 서명. */
  signatureB64: string;
}

/** JWT 문자열 → 구조 분해(서명 검증 전). 형식·디코드 오류는 throw. */
export function decodeJwt(token: string): Jwt {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('JWT 형식 아님(점 3분할 필요)');
  const [h, p, s] = parts;
  const header = JSON.parse(base64UrlToString(h)) as Record<string, unknown>;
  const payload = JSON.parse(base64UrlToString(p)) as Record<string, unknown>;
  return { header, payload, signingInput: `${h}.${p}`, signatureB64: s };
}

export interface ClaimOpts {
  issuer?: string;
  audience?: string;
}

/** 서명과 별개로 클레임 정책 검사(만료·nbf·iss·aud·tier). exp/nbf는 초 단위(JWT 표준). */
export function validateLicenseClaims(
  payload: Record<string, unknown>,
  now: number,
  opts: ClaimOpts = {},
): VerifyOk | VerifyErr {
  if (typeof payload.exp !== 'number') return { ok: false, error: 'exp 클레임 없음' };
  const expiresAt = payload.exp * 1000;
  if (now >= expiresAt) return { ok: false, error: '토큰 만료됨' };
  if (typeof payload.nbf === 'number' && now < payload.nbf * 1000) {
    return { ok: false, error: '아직 유효하지 않은 토큰(nbf)' };
  }
  if (opts.issuer && payload.iss !== opts.issuer) return { ok: false, error: '발급자(iss) 불일치' };
  if (opts.audience && payload.aud !== opts.audience) return { ok: false, error: '대상(aud) 불일치' };
  if (!isTier(payload.tier)) return { ok: false, error: '알 수 없는 티어' };
  return { ok: true, tier: payload.tier as Tier, expiresAt };
}

/** 서명 검증 원시연산(호스트 WebCrypto 등에서 주입). signingInput/서명/alg → 유효 여부. */
export type SignatureVerifier = (signingInput: string, signatureB64: string, alg: string) => Promise<boolean>;

/**
 * 서명 검증 + 클레임 검사 통합. alg=none은 거부(다운그레이드 공격 방지).
 * verifySig가 false면 즉시 실패 — 위변조 토큰을 신뢰하지 않는다.
 */
export async function verifyLicenseToken(
  token: string,
  now: number,
  opts: ClaimOpts,
  verifySig: SignatureVerifier,
): Promise<VerifyOk | VerifyErr> {
  let jwt: Jwt;
  try {
    jwt = decodeJwt(token);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '토큰 디코드 실패' };
  }
  const alg = typeof jwt.header.alg === 'string' ? jwt.header.alg : '';
  if (!alg || alg.toLowerCase() === 'none') return { ok: false, error: '서명 알고리즘 없음(alg=none 거부)' };

  let sigOk = false;
  try {
    sigOk = await verifySig(jwt.signingInput, jwt.signatureB64, alg);
  } catch {
    sigOk = false;
  }
  if (!sigOk) return { ok: false, error: '서명 검증 실패' };

  return validateLicenseClaims(jwt.payload, now, opts);
}
