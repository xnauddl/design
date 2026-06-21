/* 순수 로직 단위 테스트 — `npm test`가 build 후 dist/pure.mjs를 불러온다.
   figma 의존 코드는 대상이 아니다(값/로직만). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  rgbToHex,
  hexToRgb,
  scopesFor,
  scopesForSources,
  scopesForType,
  resolvedTypeForToken,
  stringValueForUnit,
  toPx,
  colorTokenName,
  numberTokenName,
  kebab,
  layerNameFromToken,
  layerNameFromRole,
  dedupeName,
  hasEntitlement,
  limitsForTier,
  clampCount,
  isTier,
  evaluateLicense,
  parseVerifyResponse,
  cacheFromVerify,
  REVERIFY_MS,
  GRACE_MS,
  base64UrlToString,
  decodeJwt,
  validateLicenseClaims,
  verifyLicenseToken,
  serializePreset,
  parsePreset,
  upsertPreset,
  semanticMapToText,
  textToSemanticMap,
} from '../dist/pure.mjs';

test('rgbToHex / hexToRgb 라운드트립', () => {
  assert.equal(rgbToHex({ r: 0, g: 0.4, b: 1 }), '#0066ff');
  const { r, g, b } = hexToRgb('#0066ff');
  assert.equal(rgbToHex({ r, g, b }), '#0066ff');
  assert.throws(() => hexToRgb('xyz'));
});

test('scopesFor — 속성별 스코프', () => {
  assert.deepEqual(scopesFor('fill'), ['ALL_FILLS']);
  assert.deepEqual(scopesFor('radius'), ['CORNER_RADIUS']);
  assert.deepEqual(scopesFor('gap'), ['GAP']);
  assert.deepEqual(scopesFor('size'), ['WIDTH_HEIGHT']);
  assert.deepEqual(scopesFor('opacity'), ['OPACITY']);
});

test('scopesForType — 타입에 유효한 스코프만 통과', () => {
  // STRING은 FLOAT 전용 스코프(LINE_HEIGHT/LETTER_SPACING) 거부, FONT_FAMILY는 통과
  assert.deepEqual(scopesForType(['LINE_HEIGHT'], 'STRING'), []);
  assert.deepEqual(scopesForType(['FONT_FAMILY'], 'STRING'), ['FONT_FAMILY']);
  // FLOAT은 LINE_HEIGHT 유지, COLOR 스코프는 제거
  assert.deepEqual(scopesForType(['LINE_HEIGHT', 'ALL_FILLS'], 'FLOAT'), ['LINE_HEIGHT']);
  // COLOR는 fill/stroke 유지, FONT_SIZE 제거
  assert.deepEqual(scopesForType(['ALL_FILLS', 'FONT_SIZE'], 'COLOR'), ['ALL_FILLS']);
});

test('scopesForSources — union 중복 제거', () => {
  assert.deepEqual(scopesForSources(['fill', 'stroke', 'fill']), ['ALL_FILLS', 'STROKE_COLOR']);
});

test('resolvedTypeForToken — 비-px lineHeight는 STRING', () => {
  assert.equal(resolvedTypeForToken({ category: 'lineHeight', unit: 'px' }), 'FLOAT');
  assert.equal(resolvedTypeForToken({ category: 'lineHeight', unit: 'percent' }), 'STRING');
  assert.equal(resolvedTypeForToken({ category: 'color' }), 'COLOR');
  assert.equal(resolvedTypeForToken({ category: 'fontFamily' }), 'STRING');
  assert.equal(resolvedTypeForToken({ category: 'gap' }), 'FLOAT');
});

test('stringValueForUnit', () => {
  assert.equal(stringValueForUnit(150, 'percent'), '150%');
  assert.equal(stringValueForUnit(1.5, 'rem'), '1.5rem');
  assert.equal(stringValueForUnit(1.5, 'ratio'), '1.5');
});

test('toPx — 단위 환산', () => {
  assert.equal(toPx(1.5, 'rem', { base: 16 }), 24);
  assert.equal(toPx(2, 'em', { fontSize: 10 }), 20);
  assert.equal(toPx(150, 'percent', { fontSize: 16 }), 24);
  assert.equal(toPx(1.5, 'ratio', { fontSize: 16 }), 24);
  assert.equal(toPx(8, 'px'), 8);
});

test('토큰 자동 이름', () => {
  assert.equal(colorTokenName('#0066FF'), 'color/0066ff');
  assert.equal(numberTokenName('spacing', 16), 'spacing/16');
  assert.equal(numberTokenName('line-height', 1.5), 'line-height/1_5');
});

test('kebab 정규화', () => {
  assert.equal(kebab('Button Primary'), 'button-primary');
  assert.equal(kebab('buttonPrimary'), 'button-primary');
  assert.equal(kebab('button/primary/background'), 'button-primary-background');
  assert.equal(kebab('  Card__Header '), 'card-header');
});

test('layerNameFromToken — 전체 경로 kebab', () => {
  assert.equal(layerNameFromToken('button/primary/background'), 'button-primary-background');
  // 스타일 말단 제거 옵션
  assert.equal(layerNameFromToken('card/title/fill', { stripStyleLeaf: true }), 'card-title');
  // maxDepth: 앞쪽 맥락을 자르고 로컬 역할 보존
  assert.equal(layerNameFromToken('a/b/c/d/e', { maxDepth: 3 }), 'c-d-e');
});

test('layerNameFromRole — 상위 맥락 + 역할', () => {
  assert.equal(layerNameFromRole('button-primary', 'icon'), 'button-primary-icon');
  assert.equal(layerNameFromRole(null, 'container'), 'container');
  assert.equal(layerNameFromRole('a-b-c', 'icon', { maxDepth: 2 }), 'c-icon');
});

test('dedupeName — 형제 충돌 -2/-3', () => {
  const taken = new Set();
  assert.equal(dedupeName('button-primary', taken), 'button-primary');
  assert.equal(dedupeName('button-primary', taken), 'button-primary-2');
  assert.equal(dedupeName('button-primary', taken), 'button-primary-3');
});

test('멱등성 — 같은 입력은 같은 출력', () => {
  assert.equal(
    layerNameFromToken('button/primary/background'),
    layerNameFromToken('button/primary/background'),
  );
});

/* ================= entitlements.ts ================= */
test('hasEntitlement — 티어 위계로 기능 해금', () => {
  assert.equal(hasEntitlement('free', 'components'), false);
  assert.equal(hasEntitlement('pro', 'components'), true);
  assert.equal(hasEntitlement('free', 'unlimited'), false);
  assert.equal(hasEntitlement('pro', 'unlimited'), true);
  // teamPresets는 team에서만
  assert.equal(hasEntitlement('pro', 'teamPresets'), false);
  assert.equal(hasEntitlement('team', 'teamPresets'), true);
});

test('limitsForTier — Free는 한도, Pro/Team은 무제한', () => {
  assert.deepEqual(limitsForTier('free'), { nodes: 50, tokens: 100, bindings: 200 });
  assert.equal(limitsForTier('pro').tokens, Infinity);
  assert.equal(limitsForTier('team').nodes, Infinity);
});

test('clampCount — 한도까지 자르고 초과 보고', () => {
  assert.deepEqual(clampCount(120, 100), { allowed: 100, limited: true, overflow: 20 });
  assert.deepEqual(clampCount(80, 100), { allowed: 80, limited: false, overflow: 0 });
  assert.deepEqual(clampCount(5, Infinity), { allowed: 5, limited: false, overflow: 0 });
});

test('isTier — 유효 티어 검증', () => {
  assert.equal(isTier('pro'), true);
  assert.equal(isTier('enterprise'), false);
  assert.equal(isTier(undefined), false);
});

/* ================= license.ts ================= */
test('evaluateLicense — 캐시 없음/만료/활성', () => {
  const now = 1_000_000_000_000;
  assert.deepEqual(evaluateLicense(null, now), { tier: 'free', status: 'none', stale: false });
  // 만료(now > expiresAt) → free/expired
  assert.deepEqual(
    evaluateLicense({ key: 'k', tier: 'pro', expiresAt: now - 1, lastVerified: now }, now),
    { tier: 'free', status: 'expired', stale: true },
  );
  // 만료 전 + 최근 검증 → active
  assert.deepEqual(
    evaluateLicense({ key: 'k', tier: 'pro', expiresAt: now + GRACE_MS, lastVerified: now }, now),
    { tier: 'pro', status: 'active', stale: false },
  );
});

test('evaluateLicense — 오프라인 grace 유지 후 강등', () => {
  const now = 2_000_000_000_000;
  const base = { key: 'k', tier: 'team', expiresAt: now + GRACE_MS * 2 };
  // 검증이 REVERIFY 경과·grace 이내 → 티어 유지(grace, stale)
  assert.deepEqual(
    evaluateLicense({ ...base, lastVerified: now - (REVERIFY_MS + 1000) }, now),
    { tier: 'team', status: 'grace', stale: true },
  );
  // grace 초과(장기 미검증) → 강등 free
  assert.deepEqual(
    evaluateLicense({ ...base, lastVerified: now - (GRACE_MS + 1000) }, now),
    { tier: 'free', status: 'expired', stale: true },
  );
});

test('parseVerifyResponse — 성공/실패/형식오류', () => {
  const ok = parseVerifyResponse({ valid: true, tier: 'pro', expiresAt: 123 });
  assert.deepEqual(ok, { ok: true, tier: 'pro', expiresAt: 123 });
  assert.equal(parseVerifyResponse({ valid: false, error: '만료됨' }).error, '만료됨');
  assert.equal(parseVerifyResponse({ tier: 'gold', expiresAt: 1 }).ok, false); // 알 수 없는 티어
  assert.equal(parseVerifyResponse({ valid: true, tier: 'pro' }).ok, false); // 만료시각 없음
  assert.equal(parseVerifyResponse('nope').ok, false);
});

test('cacheFromVerify — 응답+키+now → 캐시', () => {
  const v = { ok: true, tier: 'pro', expiresAt: 999 };
  assert.deepEqual(cacheFromVerify('KEY-1', v, 500), {
    key: 'KEY-1',
    tier: 'pro',
    expiresAt: 999,
    lastVerified: 500,
  });
});

/* ================= licenseToken.ts (M2.1 서명 검증 코어) ================= */
const b64url = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
const makeToken = (header, payload) => `${b64url(header)}.${b64url(payload)}.SIG`;

test('base64UrlToString — base64url 디코드(ASCII JSON)', () => {
  const json = '{"tier":"pro","exp":123}';
  const enc = Buffer.from(json).toString('base64url');
  assert.equal(base64UrlToString(enc), json);
});

test('decodeJwt — 헤더/페이로드/서명 분해', () => {
  const t = makeToken({ alg: 'ES256', typ: 'JWT' }, { tier: 'team', exp: 42 });
  const jwt = decodeJwt(t);
  assert.equal(jwt.header.alg, 'ES256');
  assert.equal(jwt.payload.tier, 'team');
  assert.equal(jwt.signatureB64, 'SIG');
  assert.equal(jwt.signingInput, t.slice(0, t.lastIndexOf('.')));
  assert.throws(() => decodeJwt('a.b')); // 형식 오류
});

test('validateLicenseClaims — 만료·iss·aud·tier', () => {
  const now = 1_000_000;
  const exp = (now + 60_000) / 1000; // 초 단위
  const base = { tier: 'pro', exp, iss: 'srv', aud: 'plugin' };
  assert.deepEqual(validateLicenseClaims(base, now, { issuer: 'srv', audience: 'plugin' }), {
    ok: true,
    tier: 'pro',
    expiresAt: exp * 1000,
  });
  assert.equal(validateLicenseClaims({ tier: 'pro', exp: (now - 1) / 1000 }, now).ok, false); // 만료
  assert.equal(validateLicenseClaims(base, now, { issuer: 'other' }).ok, false); // iss 불일치
  assert.equal(validateLicenseClaims({ tier: 'gold', exp }, now).ok, false); // 알 수 없는 티어
  assert.equal(validateLicenseClaims({ tier: 'pro' }, now).ok, false); // exp 없음
});

/* ================= presets.ts (M3 Team) ================= */
test('serializePreset / parsePreset — 라운드트립 + 검증', () => {
  const p = { name: 'mobile', base: 16, tolerance: 0.5, maxDepth: 3, semanticMap: { surface: 'color/neutral/50' } };
  const round = parsePreset(serializePreset(p));
  assert.deepEqual(round, { ok: true, preset: p });
  // name 누락 → 에러
  assert.equal(parsePreset(JSON.stringify({ base: 16 })).ok, false);
  // 깨진 JSON → 에러
  assert.equal(parsePreset('{nope').ok, false);
  // 누락 필드는 기본값으로 정규화
  const def = parsePreset(JSON.stringify({ name: 'x' }));
  assert.deepEqual(def, { ok: true, preset: { name: 'x', base: 16, tolerance: 0.5, maxDepth: 3, semanticMap: {} } });
});

test('upsertPreset — 이름 키 교체(최신 앞)', () => {
  const a = { name: 'a', base: 16, tolerance: 0.5, maxDepth: 3, semanticMap: {} };
  const a2 = { ...a, base: 10 };
  const b = { name: 'b', base: 16, tolerance: 0.5, maxDepth: 3, semanticMap: {} };
  const list = upsertPreset(upsertPreset([], a), b); // [b, a]
  const next = upsertPreset(list, a2); // a 교체 → [a2, b]
  assert.deepEqual(next, [a2, b]);
});

test('semanticMap 텍스트 ↔ 객체', () => {
  const map = { surface: 'color/neutral/50', text: 'color/neutral/900' };
  assert.deepEqual(textToSemanticMap(semanticMapToText(map)), map);
  // 공백 포함 값 보존
  assert.deepEqual(textToSemanticMap('a = b c'), { a: 'b c' });
});

test('verifyLicenseToken — 서명 검증 주입 + alg=none 거부', async () => {
  const now = 1_000_000;
  const exp = (now + 60_000) / 1000;
  const tok = makeToken({ alg: 'ES256' }, { tier: 'pro', exp });
  const yes = async () => true;
  const no = async () => false;

  const ok = await verifyLicenseToken(tok, now, {}, yes);
  assert.deepEqual(ok, { ok: true, tier: 'pro', expiresAt: exp * 1000 });

  // 서명 실패 → 거부
  assert.equal((await verifyLicenseToken(tok, now, {}, no)).ok, false);
  // alg=none → 서명 검증 호출 없이 거부
  const none = makeToken({ alg: 'none' }, { tier: 'pro', exp });
  assert.equal((await verifyLicenseToken(none, now, {}, yes)).ok, false);
  // 서명 OK라도 만료면 거부
  const expired = makeToken({ alg: 'ES256' }, { tier: 'pro', exp: (now - 1) / 1000 });
  assert.equal((await verifyLicenseToken(expired, now, {}, yes)).ok, false);
});
