/* 워커(라이선스 검증기) 테스트 — CORS·activate/validate·기기 한도 우회 차단·deactivate·만료 캡.
   globalThis.fetch를 목으로 가로채 LemonSqueezy 응답을 시나리오별로 주입한다.
   서명은 즉석 생성한 P-256 키쌍으로 검증한다(env.LICENSE_PRIVATE_JWK 주입). */
import { test, before, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto as crypto } from 'node:crypto';
import worker from '../workers/verify/src/index.js';

const LS = {
  activate: 'https://api.lemonsqueezy.com/v1/licenses/activate',
  validate: 'https://api.lemonsqueezy.com/v1/licenses/validate',
  deactivate: 'https://api.lemonsqueezy.com/v1/licenses/deactivate',
};
const DAY = 24 * 60 * 60 * 1000;

let env; // 워커 환경(개인키 포함)
let publicKey; // 토큰 서명 검증용
let handlers; // { activate?, validate?, deactivate? } → LS 응답(JSON 본문) 또는 그 함수
let calls; // 호출된 LS 엔드포인트 기록(순서)
const realFetch = globalThis.fetch;

before(async () => {
  const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  publicKey = kp.publicKey;
  const priv = await crypto.subtle.exportKey('jwk', kp.privateKey);
  env = {
    LICENSE_PRIVATE_JWK: JSON.stringify(priv),
    LICENSE_ISS: 'design-system-linker-license',
    LICENSE_AUD: 'design-system-linker',
    TOKEN_TTL_DAYS: '30',
  };
});

beforeEach(() => {
  handlers = {};
  calls = [];
  globalThis.fetch = async (url) => {
    const u = String(url);
    const name = Object.keys(LS).find((k) => LS[k] === u) || u;
    calls.push(name);
    const h = handlers[name];
    const body = typeof h === 'function' ? h() : h;
    return new Response(JSON.stringify(body ?? {}), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

const req = (body, method = 'POST') =>
  new Request('https://worker.example/verify', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: method === 'POST' ? JSON.stringify(body) : undefined,
  });

function decodePayload(token) {
  return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
}
async function verifySig(token) {
  const [h, p, s] = token.split('.');
  const data = new TextEncoder().encode(`${h}.${p}`);
  return crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, publicKey, Buffer.from(s, 'base64url'), data);
}
const iso = (ms) => new Date(ms).toISOString();

/* ---------------- CORS ---------------- */
test('OPTIONS 프리플라이트 → 204 + CORS 헤더', async () => {
  const res = await worker.fetch(req(null, 'OPTIONS'), env);
  assert.equal(res.status, 204);
  assert.equal(res.headers.get('access-control-allow-origin'), '*');
  assert.match(res.headers.get('access-control-allow-headers') || '', /content-type/i);
});

test('비-POST(GET) → 405지만 CORS 헤더 유지', async () => {
  const res = await worker.fetch(req(null, 'GET'), env);
  assert.equal(res.status, 405);
  assert.equal(res.headers.get('access-control-allow-origin'), '*');
});

test('성공 응답에도 CORS 헤더가 붙는다', async () => {
  handlers.activate = { activated: true, instance: { id: 'i' }, license_key: { status: 'active' } };
  const res = await worker.fetch(req({ key: 'K' }), env);
  assert.equal(res.headers.get('access-control-allow-origin'), '*');
});

/* ---------------- 검증: activate / validate ---------------- */
test('최초 활성화(instanceId 없음) → activate → 서명 토큰 + instanceId', async () => {
  handlers.activate = {
    activated: true,
    instance: { id: 'inst-1' },
    license_key: { status: 'active', expires_at: iso(Date.now() + 365 * DAY) },
  };
  const res = await worker.fetch(req({ key: 'K' }), env);
  const json = await res.json();
  assert.equal(json.instanceId, 'inst-1');
  assert.ok(json.token, '토큰 발급');
  assert.ok(await verifySig(json.token), '서명이 공개키로 검증되어야 함');
  const pl = decodePayload(json.token);
  assert.equal(pl.tier, 'paid');
  assert.equal(pl.iss, env.LICENSE_ISS);
  assert.equal(pl.aud, env.LICENSE_AUD);
  assert.deepEqual(calls, ['activate'], 'validate는 호출되지 않아야');
});

test('기존 기기(instanceId) → validate 성공 → activate 미호출', async () => {
  handlers.validate = { valid: true, license_key: { status: 'active', expires_at: iso(Date.now() + 200 * DAY) } };
  const res = await worker.fetch(req({ key: 'K', instanceId: 'inst-1' }), env);
  const json = await res.json();
  assert.ok(json.token);
  assert.equal(json.instanceId, 'inst-1', '같은 instanceId 유지');
  assert.deepEqual(calls, ['validate']);
});

test('무효 instanceId → validate 실패 → activate로 재등록(새 instanceId)', async () => {
  handlers.validate = { valid: false, error: 'instance not found' };
  handlers.activate = { activated: true, instance: { id: 'inst-2' }, license_key: { status: 'active' } };
  const res = await worker.fetch(req({ key: 'K', instanceId: 'stale' }), env);
  const json = await res.json();
  assert.ok(json.token);
  assert.equal(json.instanceId, 'inst-2');
  assert.deepEqual(calls, ['validate', 'activate']);
});

/* ---------------- 기기 한도 우회 차단(회귀 방어) ---------------- */
test('한도 초과 2번째 기기(instanceId 없음) → instance 없는 validate 폴백 없이 거부', async () => {
  handlers.activate = { activated: false, error: 'activation limit reached', license_key: { status: 'active' } };
  const res = await worker.fetch(req({ key: 'K' }), env);
  const json = await res.json();
  assert.equal(json.valid, false);
  assert.ok(!json.token, '한도 초과인데 토큰을 발급하면 안 됨');
  assert.ok(!calls.includes('validate'), 'instance 없는 validate로 폴백하면 우회가 열림');
});

/* ---------------- 해제(deactivate) ---------------- */
test('deactivate → LS 반납 → { deactivated:true }', async () => {
  handlers.deactivate = { deactivated: true };
  const res = await worker.fetch(req({ action: 'deactivate', key: 'K', instanceId: 'inst-1' }), env);
  const json = await res.json();
  assert.equal(json.deactivated, true);
  assert.deepEqual(calls, ['deactivate']);
});

test('deactivate에 instanceId 없으면 400', async () => {
  const res = await worker.fetch(req({ action: 'deactivate', key: 'K' }), env);
  assert.equal(res.status, 400);
  assert.equal((await res.json()).deactivated, false);
});

/* ---------------- 만료 캡(issueToken) ---------------- */
test('라이선스 만료가 TTL보다 가까우면 토큰 exp를 만료에 캡', async () => {
  const expMs = Date.now() + 5 * DAY;
  handlers.activate = { activated: true, instance: { id: 'i' }, license_key: { status: 'active', expires_at: iso(expMs) } };
  const pl = decodePayload((await (await worker.fetch(req({ key: 'K' }), env)).json()).token);
  assert.ok(pl.exp * 1000 <= expMs + 1000, '만료를 넘지 않아야');
  assert.ok(pl.exp * 1000 < Date.now() + 29 * DAY, 'TTL(30일)보다 분명히 짧아야');
});

test('형식 불량 expires_at(NaN) → TTL 적용(토큰 시각 오염 없음)', async () => {
  handlers.activate = { activated: true, instance: { id: 'i' }, license_key: { status: 'active', expires_at: 'not-a-date' } };
  const pl = decodePayload((await (await worker.fetch(req({ key: 'K' }), env)).json()).token);
  assert.ok(Number.isFinite(pl.exp));
  const days = (pl.exp * 1000 - Date.now()) / DAY;
  assert.ok(days > 29 && days <= 30, `TTL ~30일이어야: ${days}`);
});

test('과거 만료 → 토큰 exp도 과거(즉시 무효)', async () => {
  const past = Date.now() - DAY;
  handlers.validate = { valid: true, license_key: { status: 'active', expires_at: iso(past) } };
  const pl = decodePayload((await (await worker.fetch(req({ key: 'K', instanceId: 'i' }), env)).json()).token);
  assert.ok(pl.exp * 1000 <= past + 1000, '과거 만료로 캡되어야');
});

/* ---------------- 입력 검증 ---------------- */
test('키 없음 → 400', async () => {
  const res = await worker.fetch(req({ key: '' }), env);
  assert.equal(res.status, 400);
  assert.equal((await res.json()).valid, false);
});

test('잘못된 JSON 본문 → 400', async () => {
  const res = await worker.fetch(
    new Request('https://worker.example/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{bad' }),
    env,
  );
  assert.equal(res.status, 400);
});

test('ADMIN_KEYS는 LS 없이 장기 토큰 발급', async () => {
  const res = await worker.fetch(req({ key: 'OWNER-1' }), { ...env, ADMIN_KEYS: 'OWNER-1, OWNER-2' });
  const json = await res.json();
  assert.ok(json.token);
  assert.deepEqual(calls, [], 'LS를 호출하지 않아야');
  const pl = decodePayload(json.token);
  assert.equal(pl.tier, 'paid');
});
