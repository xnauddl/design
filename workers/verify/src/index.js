/* ============================================================
   Cloudflare Worker — 라이선스 검증기 (수익화 검증 방식 C)
   POST /verify { key, instanceName? }
     → LemonSqueezy 라이선스 활성화/검증 → 유효하면 ES256 서명 JWT({ token }) 반환.
   플러그인은 공개키로 토큰을 검증하고 clientStorage에 캐시(오프라인 grace).
   비밀(개인키·LS 설정)은 Worker secret/vars로만 보관 — 디자인 데이터는 다루지 않음.

   환경(Settings → Variables/Secrets):
     LICENSE_PRIVATE_JWK  (secret) P-256 개인키 JWK(JSON 문자열). scripts/gen-license-keys.mjs로 생성.
     LICENSE_ISS          (var)    licenseConfig.LICENSE_ISS 와 동일.
     LICENSE_AUD          (var)    licenseConfig.LICENSE_AUD 와 동일(= pluginId).
     ADMIN_KEYS           (secret, 선택) 쉼표 구분 오너 관리자 키 — LS 없이 장기 paid 토큰 발급(테스트용).
     TOKEN_TTL_DAYS       (var, 선택) 토큰 수명(기본 30). 플러그인이 주기적으로 재검증.
   ============================================================ */

const LS_VALIDATE = 'https://api.lemonsqueezy.com/v1/licenses/validate';
const LS_ACTIVATE = 'https://api.lemonsqueezy.com/v1/licenses/activate';
const DAY_MS = 24 * 60 * 60 * 1000;

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });

function b64urlFromString(s) {
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlFromBytes(bytes) {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return b64urlFromString(bin);
}

/** ES256(JWT) 서명 — P-256 개인키 JWK. */
async function signJwt(payload, privateJwk) {
  const header = { alg: 'ES256', typ: 'JWT' };
  const signingInput = `${b64urlFromString(JSON.stringify(header))}.${b64urlFromString(JSON.stringify(payload))}`;
  const key = await crypto.subtle.importKey('jwk', privateJwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(signingInput));
  return `${signingInput}.${b64urlFromBytes(new Uint8Array(sig))}`;
}

/** 토큰 발급: tier=paid, exp=min(라이선스 만료, now+TTL). */
async function issueToken(env, licenseExpiryMs) {
  const ttlDays = Number(env.TOKEN_TTL_DAYS || 30);
  const now = Date.now();
  let exp = now + ttlDays * DAY_MS;
  if (licenseExpiryMs && licenseExpiryMs < exp) exp = licenseExpiryMs; // 라이선스 만료를 넘지 않음
  const payload = {
    tier: 'paid',
    iss: env.LICENSE_ISS,
    aud: env.LICENSE_AUD,
    iat: Math.floor(now / 1000),
    exp: Math.floor(exp / 1000),
  };
  return signJwt(payload, JSON.parse(env.LICENSE_PRIVATE_JWK));
}

async function lsCall(url, key, instanceName) {
  const body = new URLSearchParams({ license_key: key });
  if (instanceName) body.set('instance_name', instanceName);
  const r = await fetch(url, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  return r.json();
}

export default {
  async fetch(request, env) {
    if (request.method !== 'POST') return json({ valid: false, error: 'POST만 허용' }, 405);

    let req;
    try {
      req = await request.json();
    } catch {
      return json({ valid: false, error: '잘못된 요청 본문' }, 400);
    }
    const key = typeof req.key === 'string' ? req.key.trim() : '';
    if (!key) return json({ valid: false, error: '라이선스 키 없음' }, 400);
    const instanceName = typeof req.instanceName === 'string' ? req.instanceName : (env.LICENSE_AUD || 'plugin');

    // 오너 관리자 키(선택) — LS 없이 장기 paid 토큰(스모크 테스트용).
    const adminKeys = (env.ADMIN_KEYS || '').split(',').map((s) => s.trim()).filter(Boolean);
    if (adminKeys.includes(key)) {
      const token = await issueToken(env, Date.now() + 365 * DAY_MS);
      return json({ token });
    }

    try {
      // 1) 활성화 시도(미등록 기기 등록 — LS activation_limit으로 기기 수 제한). 이미 활성화면 validate로.
      let data = await lsCall(LS_ACTIVATE, key, instanceName);
      if (!data.activated && !data.valid) data = await lsCall(LS_VALIDATE, key, instanceName);

      const lk = data.license_key || {};
      const active = data.valid === true || data.activated === true || lk.status === 'active';
      if (!active) {
        const msg = data.error || (lk.status === 'expired' ? '구독이 만료되었습니다.' : '유효하지 않은 라이선스 키입니다.');
        return json({ valid: false, error: msg }, 200);
      }
      const expiryMs = lk.expires_at ? Date.parse(lk.expires_at) : 0;
      const token = await issueToken(env, expiryMs);
      return json({ token });
    } catch (e) {
      return json({ valid: false, error: `검증 서버 오류: ${e && e.message ? e.message : e}` }, 502);
    }
  },
};
