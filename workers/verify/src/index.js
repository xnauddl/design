/* ============================================================
   Cloudflare Worker — 라이선스 검증기 (수익화 검증 방식 C)
   POST /verify { key, instanceName?, instanceId?, action? }
     · action='verify'(기본): instanceId 있으면 해당 기기로 validate, 없으면 activate(activation_limit으로 기기 수 제한).
       → 유효하면 ES256 서명 JWT와 기기 instanceId를 반환({ token, instanceId? }).
     · action='deactivate': 해당 instanceId의 활성화를 LS에서 반납 → { deactivated: true }.
     CORS: 플러그인 UI iframe에서 호출하므로 모든 응답에 CORS 헤더 + OPTIONS 프리플라이트 처리.
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
const LS_DEACTIVATE = 'https://api.lemonsqueezy.com/v1/licenses/deactivate';
const DAY_MS = 24 * 60 * 60 * 1000;

// 플러그인 UI는 별도 출처(브라우저 iframe)에서 호출하므로 CORS가 필요하다.
// application/x-www-form-urlencoded가 아닌 JSON 본문은 프리플라이트(OPTIONS)를 유발 → 응답마다 CORS 헤더 부여.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', ...CORS } });

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

/** 토큰 발급: tier=paid, exp=min(라이선스 만료, now+TTL).
 *  licenseExpiryMs: 0/유한하지 않음 = 만료 없음(평생 라이선스) → TTL만 적용.
 *  과거 시각이면 그대로 캡 → 토큰이 즉시 만료되어 플러그인이 거부(만료 구독 방어). */
async function issueToken(env, licenseExpiryMs) {
  const ttlDays = Number(env.TOKEN_TTL_DAYS || 30);
  const now = Date.now();
  let exp = now + ttlDays * DAY_MS;
  if (Number.isFinite(licenseExpiryMs) && licenseExpiryMs > 0 && licenseExpiryMs < exp) exp = licenseExpiryMs;
  const payload = {
    tier: 'paid',
    iss: env.LICENSE_ISS,
    aud: env.LICENSE_AUD,
    iat: Math.floor(now / 1000),
    exp: Math.floor(exp / 1000),
  };
  return signJwt(payload, JSON.parse(env.LICENSE_PRIVATE_JWK));
}

async function lsCall(url, params) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params),
  });
  return r.json();
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
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
    // 이전 활성화에서 받아 플러그인이 보관한 instance_id(있으면 해당 기기로 바인딩 재검증/반납).
    const instanceId = typeof req.instanceId === 'string' && req.instanceId ? req.instanceId : '';
    const action = typeof req.action === 'string' ? req.action : 'verify';

    // 해제(deactivate): 이 기기의 활성화 슬롯을 LS에서 반납 → 같은/다른 기기 재활성화 가능.
    if (action === 'deactivate') {
      if (!instanceId) return json({ deactivated: false, error: 'instanceId 없음' }, 400);
      try {
        const data = await lsCall(LS_DEACTIVATE, { license_key: key, instance_id: instanceId });
        if (data.deactivated === true) return json({ deactivated: true });
        return json({ deactivated: false, error: data.error || '비활성화 실패' }, 200);
      } catch (e) {
        return json({ deactivated: false, error: `검증 서버 오류: ${e && e.message ? e.message : e}` }, 502);
      }
    }

    // 오너 관리자 키(선택) — LS 없이 장기 paid 토큰(스모크 테스트용).
    const adminKeys = (env.ADMIN_KEYS || '').split(',').map((s) => s.trim()).filter(Boolean);
    if (adminKeys.includes(key)) {
      const token = await issueToken(env, Date.now() + 365 * DAY_MS);
      return json({ token });
    }

    try {
      // 1) 기존 기기: 저장된 instance_id로 validate(특정 활성 인스턴스에 바인딩).
      let data = null;
      if (instanceId) data = await lsCall(LS_VALIDATE, { license_key: key, instance_id: instanceId });

      // 2) 신규/무효 기기: activate로 인스턴스 등록(LS activation_limit으로 기기 수 제한).
      //    ⚠ instance 없는 validate로 폴백하지 않는다 — 그랬다간 activation_limit이 무력화됨(기기 한도 우회).
      let newInstanceId = instanceId;
      if (!data || data.valid !== true) {
        data = await lsCall(LS_ACTIVATE, { license_key: key, instance_name: instanceName });
        if (data.activated === true && data.instance && typeof data.instance.id === 'string') {
          newInstanceId = data.instance.id;
        }
      }

      const lk = data.license_key || {};
      // 활성 판정은 인스턴스에 바인딩된 신호만 신뢰: validate(instance_id) 성공 또는 activate 성공.
      // lk.status==='active'만으로 통과시키지 않는다(한도 초과 응답에도 status가 active일 수 있음).
      const active = data.valid === true || data.activated === true;
      if (!active) {
        const msg = data.error || (lk.status === 'expired' ? '구독이 만료되었습니다.' : '유효하지 않은 라이선스 키이거나 기기 활성화 한도를 초과했습니다.');
        return json({ valid: false, error: msg }, 200);
      }
      // 라이선스 만료(구독 종료일). 형식 불량(NaN)은 0(만료 없음)으로 처리해 토큰 시각이 오염되지 않게 한다.
      const parsedExpiry = lk.expires_at ? Date.parse(lk.expires_at) : 0;
      const expiryMs = Number.isNaN(parsedExpiry) ? 0 : parsedExpiry;
      const token = await issueToken(env, expiryMs);
      // 플러그인은 instanceId를 캐시에 보관 → 다음 재검증 때 되돌려보내 같은 기기로 validate.
      return json(newInstanceId ? { token, instanceId: newInstanceId } : { token });
    } catch (e) {
      return json({ valid: false, error: `검증 서버 오류: ${e && e.message ? e.message : e}` }, 502);
    }
  },
};
