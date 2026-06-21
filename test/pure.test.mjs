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
  pushHistory,
  formatHistory,
  formatTime,
  HISTORY_CAP,
  exportTokens,
  splitWeightStyle,
  parseVariantName,
  formatVariant,
  classifyVariants,
  missingVariants,
  variantGrid,
  inferProp,
  inferComponentProperties,
  commitUndo,
  explainError,
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

/* ================= history.ts (M3.1 Team) ================= */
test('pushHistory — 최신 앞 + cap', () => {
  let list = [];
  list = pushHistory(list, { at: 1, action: 'create', summary: 'a' });
  list = pushHistory(list, { at: 2, action: 'bind', summary: 'b' });
  assert.deepEqual(list.map((e) => e.summary), ['b', 'a']); // 최신 앞
  // cap 적용
  let big = [];
  for (let i = 0; i < HISTORY_CAP + 10; i++) big = pushHistory(big, { at: i, action: 'create', summary: String(i) });
  assert.equal(big.length, HISTORY_CAP);
  assert.equal(big[0].summary, String(HISTORY_CAP + 9)); // 가장 최신
});

test('formatTime / formatHistory — 결정적(UTC)', () => {
  const at = Date.UTC(2026, 5, 21, 9, 5); // 2026-06-21 09:05 UTC
  assert.equal(formatTime(at), '2026-06-21 09:05');
  assert.equal(formatHistory({ at, action: 'bind', summary: '바인딩 3' }), '2026-06-21 09:05 · 바인딩 · 바인딩 3');
});

/* ================= exporters.ts (코드 내보내기) ================= */
const OPTS = { format: 'css', fontSizeUnit: 'px', base: 16, includeSnapshots: false };

test('splitWeightStyle — weight/italic 분리', () => {
  assert.deepEqual(splitWeightStyle(600), { weight: 600, italic: false });
  assert.deepEqual(splitWeightStyle('Bold'), { weight: 700, italic: false });
  assert.deepEqual(splitWeightStyle('Semi Bold Italic'), { weight: 600, italic: true });
  assert.deepEqual(splitWeightStyle('Italic'), { weight: 400, italic: true });
});

test('exportTokens CSS — 색·별칭·단위·italic·스냅샷 제외', () => {
  const tokens = [
    { name: 'color/primary/500', collection: 'Global', type: 'COLOR', kind: 'color', value: '#2563eb' },
    { name: 'primary', collection: 'Semantic', type: 'COLOR', kind: 'color', aliasOf: 'color/primary/500' },
    { name: 'font-size/16', collection: 'Global', type: 'FLOAT', kind: 'fontSize', value: 16 },
    { name: 'line-height/150', collection: 'Global', type: 'STRING', kind: 'lineHeight', value: '150%' },
    { name: 'line-height/150-percent-px', collection: 'Global', type: 'FLOAT', kind: 'lineHeight', value: 24 },
    { name: 'weight/heading', collection: 'Global', type: 'STRING', kind: 'fontWeight', value: 'Bold Italic' },
  ];
  const css = exportTokens(tokens, OPTS);
  assert.match(css, /--color-primary-500: #2563eb;/);
  assert.match(css, /--primary: var\(--color-primary-500\);/);
  assert.match(css, /--font-size-16: 16px;/); // px
  assert.match(css, /--line-height-150: 150%;/); // 단위 보존
  assert.doesNotMatch(css, /150-percent-px/); // 스냅샷 제외(기본)
  assert.match(css, /--weight-heading: 700;/);
  assert.match(css, /--weight-heading-style: italic;/); // italic 동반

  // 폰트 크기 rem 옵션
  const remCss = exportTokens(tokens, { ...OPTS, fontSizeUnit: 'rem' });
  assert.match(remCss, /--font-size-16: 1rem;/);
  // 스냅샷 포함 옵션
  const withSnap = exportTokens(tokens, { ...OPTS, includeSnapshots: true });
  assert.match(withSnap, /--line-height-150-percent-px: 24px;/);
});

test('exportTokens W3C — 중첩·$type·별칭 참조', () => {
  const tokens = [
    { name: 'color/primary/500', collection: 'Global', type: 'COLOR', kind: 'color', value: '#2563eb' },
    { name: 'primary', collection: 'Semantic', type: 'COLOR', kind: 'color', aliasOf: 'color/primary/500' },
    { name: 'spacing/16', collection: 'Global', type: 'FLOAT', kind: 'spacing', value: 16 },
  ];
  const json = JSON.parse(exportTokens(tokens, { ...OPTS, format: 'w3c' }));
  assert.deepEqual(json.color.primary['500'], { $type: 'color', $value: '#2563eb' });
  assert.equal(json.primary.$value, '{color.primary.500}'); // 별칭 참조
  assert.deepEqual(json.spacing['16'], { $type: 'dimension', $value: '16px' });
});

test('exportTokens — 동일 이름 Semantic 미러 제거(Global 우선)', () => {
  // Global 리터럴 + 같은 이름 Semantic 미러 → 미러 제외(충돌/자기참조 방지)
  const tokens = [
    { name: 'color/primary/500', collection: 'Semantic', type: 'COLOR', kind: 'color', aliasOf: 'color/primary/500' },
    { name: 'color/primary/500', collection: 'Global', type: 'COLOR', kind: 'color', value: '#2563eb' },
    { name: 'primary', collection: 'Semantic', type: 'COLOR', kind: 'color', aliasOf: 'color/primary/500' }, // 고유 역할 → 유지
  ];
  const css = exportTokens(tokens, OPTS);
  // 리터럴 1줄만(자기참조 var(...) 미러 없음)
  assert.match(css, /--color-primary-500: #2563eb;/);
  assert.doesNotMatch(css, /--color-primary-500: var\(--color-primary-500\);/);
  assert.match(css, /--primary: var\(--color-primary-500\);/); // 고유 역할은 유지

  const j = JSON.parse(exportTokens(tokens, { ...OPTS, format: 'w3c' }));
  assert.equal(j.color.primary['500'].$value, '#2563eb'); // 자기참조 아님
  assert.equal(j.primary.$value, '{color.primary.500}');
});

test('exportTokens — 빈 입력', () => {
  assert.equal(exportTokens([], OPTS), ':root {\n}');
  assert.equal(exportTokens([], { ...OPTS, format: 'w3c' }), '{}');
});

/* ================= components.ts (Phase 3) ================= */
test('inferProp / parseVariantName — 어휘·경로·명시형', () => {
  assert.equal(inferProp('hover'), 'state');
  assert.equal(inferProp('lg'), 'size');
  assert.equal(inferProp('primary'), 'type');
  assert.equal(inferProp('zzz'), null);
  // 경로형: 어휘 추론
  assert.deepEqual(parseVariantName('button/primary/hover'), {
    base: 'button',
    props: { type: 'primary', state: 'hover' },
  });
  // 미지정 값 → variant
  assert.deepEqual(parseVariantName('chip/foo'), { base: 'chip', props: { variant: 'foo' } });
  // 명시형 prop=value
  assert.deepEqual(parseVariantName('button, size=lg, state=hover'), {
    base: 'button',
    props: { size: 'lg', state: 'hover' },
  });
});

test('formatVariant — 속성명 정렬', () => {
  assert.equal(formatVariant({ type: 'primary', state: 'hover' }), 'state=hover, type=primary');
});

test('classifyVariants — 그룹/속성/빈 조합/단일', () => {
  const r = classifyVariants([
    'button/primary/default',
    'button/primary/hover',
    'button/secondary/default',
    'card', // 단일
  ]);
  assert.deepEqual(r.singles, ['card']);
  assert.equal(r.groups.length, 1);
  const g = r.groups[0];
  assert.equal(g.base, 'button');
  assert.deepEqual(g.properties, { type: ['primary', 'secondary'], state: ['default', 'hover'] });
  assert.equal(g.members.length, 3);
  // 빈 조합: secondary + hover 없음
  assert.deepEqual(g.missing, ['state=hover, type=secondary']);
});

test('classifyVariants — 멤버 1개 베이스는 단일', () => {
  const r = classifyVariants(['icon/sm', 'badge/lg']);
  // 서로 다른 베이스, 각 1개 → 모두 단일
  assert.deepEqual(r.groups, []);
  assert.deepEqual(r.singles.sort(), ['badge/lg', 'icon/sm']);
});

test('variantGrid — 2속성 매트릭스 좌표(행=첫 속성, 열=둘째)', () => {
  const cells = variantGrid([
    'state=default, type=primary',
    'state=hover, type=primary',
    'state=default, type=secondary',
    'state=disabled, type=secondary',
  ]);
  const at = (n) => cells.find((c) => c.name === n);
  // keys 정렬: state(행), type(열). state: default,disabled,hover / type: primary,secondary
  assert.deepEqual(at('state=default, type=primary'), { name: 'state=default, type=primary', row: 0, col: 0 });
  assert.deepEqual(at('state=hover, type=primary'), { name: 'state=hover, type=primary', row: 2, col: 0 });
  assert.deepEqual(at('state=disabled, type=secondary'), { name: 'state=disabled, type=secondary', row: 1, col: 1 });
});

test('variantGrid — 1속성은 한 축, 속성 없으면 한 줄', () => {
  const single = variantGrid(['size=sm', 'size=lg']);
  assert.deepEqual(single.map((c) => [c.row, c.col]).sort(), [[0, 0], [0, 1]].sort());
  assert.deepEqual(variantGrid([]), []);
});

test('inferComponentProperties — 레이어 → 속성 계획(Phase 4.1)', () => {
  const plan = inferComponentProperties([
    { name: 'label', type: 'TEXT' },
    { name: 'icon', type: 'INSTANCE' },
    { name: 'badge?', type: 'FRAME' }, // 가시성 토글
    { name: 'label', type: 'TEXT' }, // 이름 충돌 → -2
  ]);
  assert.deepEqual(plan, [
    { propName: 'label', type: 'TEXT', layerName: 'label', field: 'characters' },
    { propName: 'icon', type: 'INSTANCE_SWAP', layerName: 'icon', field: 'mainComponent' },
    { propName: 'badge', type: 'BOOLEAN', layerName: 'badge?', field: 'visible' },
    { propName: 'label-2', type: 'TEXT', layerName: 'label', field: 'characters' },
  ]);
  // 텍스트가 ?로 끝나면 BOOLEAN 우선
  assert.equal(inferComponentProperties([{ name: 'caption?', type: 'TEXT' }])[0].type, 'BOOLEAN');
});

test('missingVariants — 베리언트 자식 이름에서 빠진 조합(Phase 4)', () => {
  const names = ['state=default, type=primary', 'state=hover, type=primary', 'state=default, type=secondary'];
  assert.deepEqual(missingVariants(names), ['state=hover, type=secondary']);
  // 완전한 매트릭스 → 없음
  assert.deepEqual(missingVariants([...names, 'state=hover, type=secondary']), []);
  // 멤버 1개 → 없음
  assert.deepEqual(missingVariants(['state=default, type=primary']), []);
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

/* ================= undo.ts (UX2) ================= */
test('commitUndo — 지원 시 호출, 미지원 시 무시', () => {
  let n = 0;
  commitUndo({ commitUndo: () => (n += 1) });
  assert.equal(n, 1);
  // commitUndo 없는 환경(구버전 Figma) — 예외 없이 무시
  assert.doesNotThrow(() => commitUndo({}));
  assert.doesNotThrow(() => commitUndo({ commitUndo: undefined }));
});

/* ================= errors.ts (UX7) ================= */
test('explainError — 패턴별 친절 메시지 + 재시도 가능 여부', () => {
  const font = explainError('in loadFontAsync: font has not been loaded');
  assert.match(font.message, /글꼴/);
  assert.equal(font.retryable, true);

  const scope = explainError('Invalid scope for this variable type');
  assert.match(scope.message, /스코프/);
  assert.equal(scope.retryable, true);

  // 권한/읽기전용·미발행 호환 오류는 재시도로 해결 불가
  assert.equal(explainError('The document is read-only').retryable, false);
  assert.equal(explainError('Property value is incompatible').retryable, false);

  // 알 수 없는 오류는 원문 보존 + 재시도 허용
  const unknown = explainError('totally weird boom');
  assert.match(unknown.message, /totally weird boom/);
  assert.equal(unknown.retryable, true);
});
