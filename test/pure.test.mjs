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
  unitDescription,
  stringValueForUnit,
  toPx,
  colorTokenName,
  numberTokenName,
  kebab,
  pascalCase,
  capitalize,
  layerNameFromToken,
  layerNameFromRole,
  isDefaultName,
  isTokenEchoName,
  parseTokenName,
  pickScope,
  dedupeName,
  hasEntitlement,
  isTier,
  normalizeLegacyTier,
  normalizeLicenseCache,
  evaluateLicense,
  cacheFromVerify,
  extractSignedToken,
  pickInstanceId,
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
  exportTokens,
  splitWeightStyle,
  parseVariantName,
  formatVariant,
  classifyVariants,
  missingVariants,
  variantGrid,
  inferProp,
  inferComponentProperties,
  scanComponentCandidates,
  groupByExactName,
  recognizeComponentName,
  extractNameProps,
  distinguishingTokens,
  deriveVariants,
  highConfidenceComponentRole,
  isHighConfidenceComponent,
  shouldCollapseToProperties,
  inferVaryingComponentProperties,
  pickCollapseMasterIndex,
  propValuesFromStruct,
  colorAxisLabels,
  commonBaseName,
  clusterTextStyles,
  nameTextStyles,
  fontStyleForWeight,
  rampToSpecs,
  RAMP_NAMES,
  commitUndo,
  explainError,
  nextTabIndex,
  isLargeText,
  requiredRatio,
  checkPair,
  evaluateSample,
  checkContrast,
  suggestContrastFix,
  contrastRatio,
  // roles (전 토큰 역할 어휘)
  tshirtRoles,
  radiusRoles,
  fontSizeRoles,
  weightRole,
  familyRole,
  suggestTokenRoles,
  pipelineSteps,
  t,
  parseVarValue,
  displayVarValue,
  validateVarName,
  sanitizeScopes,
  scopesForTypeList,
  aliasSelfReference,
  findAliasReferers,
  hexToOklch,
  darkValueForLight,
  darkGlobalName,
  isDarkGlobalName,
  DARK_L_MIN,
  DARK_L_MAX,
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
  assert.deepEqual(scopesFor('strokeWidth'), ['STROKE_FLOAT']);
  assert.deepEqual(scopesFor('opacity'), ['OPACITY']);
});

test('scopesForType — STROKE_FLOAT은 FLOAT만 허용(COLOR 거부)', () => {
  assert.deepEqual(scopesForType(['STROKE_FLOAT'], 'FLOAT'), ['STROKE_FLOAT']);
  assert.deepEqual(scopesForType(['STROKE_FLOAT'], 'COLOR'), []);
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

test('resolvedTypeForToken(#16) — lineHeight/letterSpacing은 단위 무관 FLOAT', () => {
  assert.equal(resolvedTypeForToken({ category: 'lineHeight', unit: 'px' }), 'FLOAT');
  assert.equal(resolvedTypeForToken({ category: 'lineHeight', unit: 'percent' }), 'FLOAT'); // 더는 STRING 아님
  assert.equal(resolvedTypeForToken({ category: 'letterSpacing', unit: 'em' }), 'FLOAT');
  assert.equal(resolvedTypeForToken({ category: 'color' }), 'COLOR');
  assert.equal(resolvedTypeForToken({ category: 'fontFamily' }), 'STRING');
  assert.equal(resolvedTypeForToken({ category: 'gap' }), 'FLOAT');
});

test('unitDescription(#16) — 비-px lh/ls만 원본 단위 문자열', () => {
  assert.equal(unitDescription({ category: 'lineHeight', unit: 'percent', value: 160 }), '160%');
  assert.equal(unitDescription({ category: 'letterSpacing', unit: 'em', value: 0.02 }), '0.02em');
  assert.equal(unitDescription({ category: 'lineHeight', unit: 'px', value: 24 }), undefined); // px는 없음
  assert.equal(unitDescription({ category: 'gap', unit: 'percent', value: 50 }), undefined); // 대상 아님
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
  // 숫자 사이 '_'(소수점 표기)는 보존, 그 외 '_'는 '-'
  assert.equal(kebab('line-height/1_5'), 'line-height-1_5');
  assert.equal(kebab('a_1'), 'a-1'); // 비-숫자 경계는 '-'
  assert.equal(kebab('1_5_2'), '1_5_2'); // 연속 소수 표기도 보존
});

test('pascalCase / capitalize — 컴포넌트·속성명 관례', () => {
  assert.equal(pascalCase('btn'), 'Button'); // 약어 펼침
  assert.equal(pascalCase('card-header'), 'CardHeader');
  assert.equal(pascalCase('img wrapper'), 'ImageWrapper');
  assert.equal(pascalCase('Button'), 'Button'); // 멱등
  assert.equal(pascalCase(''), ''); // 빈 입력 보존
  assert.equal(capitalize('size'), 'Size');
  assert.equal(capitalize('Color'), 'Color'); // 멱등
  assert.equal(capitalize(''), '');
});

test('layerNameFromToken — 전체 경로 kebab', () => {
  assert.equal(layerNameFromToken('button/primary/background'), 'button-primary-background');
  // 스타일 말단 제거 옵션
  assert.equal(layerNameFromToken('card/title/fill', { stripStyleLeaf: true }), 'card-title');
  // 'border'는 유효 역할이라 stripStyleLeaf로도 보존(스타일 말단 아님)
  assert.equal(layerNameFromToken('card/border', { stripStyleLeaf: true }), 'card-border');
  // maxDepth: 앞쪽 맥락을 자르고 로컬 역할 보존
  assert.equal(layerNameFromToken('a/b/c/d/e', { maxDepth: 3 }), 'c-d-e');
  // 소수 토큰: 변수명 'line-height/1_5'과 동일 표기로 레이어명에 보존(1-5로 뭉개지지 않음)
  assert.equal(layerNameFromToken('line-height/1_5'), 'line-height-1_5');
});

test('layerNameFromRole — 상위 맥락 + 역할', () => {
  assert.equal(layerNameFromRole('button-primary', 'icon'), 'button-primary-icon');
  assert.equal(layerNameFromRole(null, 'container'), 'container');
  assert.equal(layerNameFromRole('a-b-c', 'icon', { maxDepth: 2 }), 'c-icon');
});

test('isDefaultName — Figma 기본명만 교체 대상', () => {
  // 기본/자동 생성명 → 교체 대상
  for (const n of ['Frame 12', 'Frame', 'Rectangle', 'Ellipse 3', 'Vector 7', 'Group 5 copy', 'Group 5 copy 2', 'Union', 'Line 2', '', '   ']) {
    assert.equal(isDefaultName(n), true, n);
  }
  // 사람이 지은 의미 있는 이름 → 보존
  for (const n of ['button', 'card-header', 'Root', 'icon', 'OriginalName', 'frame-wrapper', 'rectangle-bg']) {
    assert.equal(isDefaultName(n), false, n);
  }
});

test('isTokenEchoName — 구 리네임의 원시 토큰 베낌 이름만 교체 대상', () => {
  // 원시 토큰 경로를 그대로 베낀 이름(스냅샷 단위 포함) → 교체 대상
  for (const n of [
    'color-121210', 'color-0066ff', 'spacing-16', 'line-height-1-5', 'opacity-50', 'radius-9999',
    'letter-spacing-0-percent-px', 'line-height-150-percent-px', 'line-height-1-5-em',
  ]) {
    assert.equal(isTokenEchoName(n), true, n);
  }
  // 같은 네임스페이스라도 값이 단어면 사람 이름 → 보존
  for (const n of ['color-picker', 'size-large', 'radius-full', 'spacing-control', 'button-primary', 'card-header']) {
    assert.equal(isTokenEchoName(n), false, n);
  }
});

test('pickScope — 깨끗한 맥락 1단계(숫자·단위·일반구조어 제거)', () => {
  assert.equal(pickScope('card-header'), 'header'); // 알려진 역할 마지막
  assert.equal(pickScope('button-primary'), 'button'); // 역할만 채택, primary 무시
  assert.equal(pickScope('primary-button'), 'button');
  assert.equal(pickScope('wrapper-2'), null); // 숫자 제거 후 일반구조어만 → null
  assert.equal(pickScope('container'), null); // 일반 구조어는 맥락 안 됨
  assert.equal(pickScope('letter-spacing-0-percent-px'), 'spacing'); // 단위·숫자 제거
  assert.equal(pickScope('hero'), 'hero');
  assert.equal(pickScope(''), null);
});

test('parseTokenName — 역할 말단/맥락 접두사/원시 토큰', () => {
  // 시맨틱: 말단 background가 역할, 접두사가 맥락
  assert.deepEqual(parseTokenName('button/primary/background'), {
    roleLeaf: 'background', context: 'button-primary', primitive: false,
  });
  // 말단 별칭(fill→background, stroke→border)
  assert.equal(parseTokenName('card/title/fill').roleLeaf, 'background');
  assert.equal(parseTokenName('field/outline/stroke').roleLeaf, 'border');
  assert.equal(parseTokenName('nav/avatar').roleLeaf, 'avatar');
  // 역할 아닌 말단 → roleLeaf 없음, 전체 경로가 맥락
  assert.deepEqual(parseTokenName('text/heading'), {
    roleLeaf: null, context: 'text-heading', primitive: false,
  });
  // 원시(Global) 토큰 → 신호 없음
  assert.deepEqual(parseTokenName('color/blue-500'), { roleLeaf: null, context: null, primitive: true });
  assert.deepEqual(parseTokenName('spacing/16'), { roleLeaf: null, context: null, primitive: true });
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
test('hasEntitlement — Paid에서만 유료 기능 해금', () => {
  assert.equal(hasEntitlement('free', 'tokens'), false);
  assert.equal(hasEntitlement('free', 'components'), false);
  assert.equal(hasEntitlement('paid', 'tokens'), true);
  assert.equal(hasEntitlement('paid', 'semantics'), true);
  assert.equal(hasEntitlement('paid', 'components'), true);
  assert.equal(hasEntitlement('paid', 'presets'), true);
});

test('isTier — 유효 티어 검증(free|paid)', () => {
  assert.equal(isTier('free'), true);
  assert.equal(isTier('paid'), true);
  assert.equal(isTier('pro'), false); // 구 3티어 값은 무효
  assert.equal(isTier('enterprise'), false);
  assert.equal(isTier(undefined), false);
});

test('normalizeLegacyTier — pro/team → paid 승격', () => {
  assert.equal(normalizeLegacyTier('pro'), 'paid');
  assert.equal(normalizeLegacyTier('team'), 'paid');
  assert.equal(normalizeLegacyTier('paid'), 'paid');
  assert.equal(normalizeLegacyTier('free'), 'free');
  assert.equal(normalizeLegacyTier('enterprise'), null);
});

test('normalizeLicenseCache — 구 pro/team 캐시를 paid로 정규화', () => {
  const base = { key: 'KEY-1', expiresAt: 9_999, lastVerified: 1_000 };
  assert.deepEqual(normalizeLicenseCache({ ...base, tier: 'pro' }), { ...base, tier: 'paid' });
  assert.deepEqual(normalizeLicenseCache({ ...base, tier: 'team', instanceId: 'inst-1' }), {
    ...base,
    tier: 'paid',
    instanceId: 'inst-1',
  });
  assert.equal(normalizeLicenseCache({ ...base, tier: 'enterprise' }), null);
  assert.equal(normalizeLicenseCache({ key: 'k' }), null);
});

/* ================= license.ts ================= */
test('evaluateLicense — 캐시 없음/만료/활성', () => {
  const now = 1_000_000_000_000;
  assert.deepEqual(evaluateLicense(null, now), { tier: 'free', status: 'none', stale: false });
  // 만료(now > expiresAt) → free/expired
  assert.deepEqual(
    evaluateLicense({ key: 'k', tier: 'paid', expiresAt: now - 1, lastVerified: now }, now),
    { tier: 'free', status: 'expired', stale: true },
  );
  // 만료 전 + 최근 검증 → active
  assert.deepEqual(
    evaluateLicense({ key: 'k', tier: 'paid', expiresAt: now + GRACE_MS, lastVerified: now }, now),
    { tier: 'paid', status: 'active', stale: false },
  );
});

test('evaluateLicense — 오프라인 grace 유지 후 강등', () => {
  const now = 2_000_000_000_000;
  const base = { key: 'k', tier: 'paid', expiresAt: now + GRACE_MS * 2 };
  // 검증이 REVERIFY 경과·grace 이내 → 티어 유지(grace, stale)
  assert.deepEqual(
    evaluateLicense({ ...base, lastVerified: now - (REVERIFY_MS + 1000) }, now),
    { tier: 'paid', status: 'grace', stale: true },
  );
  // grace 초과(장기 미검증) → 강등 free
  assert.deepEqual(
    evaluateLicense({ ...base, lastVerified: now - (GRACE_MS + 1000) }, now),
    { tier: 'free', status: 'expired', stale: true },
  );
});

test('extractSignedToken — 서명 토큰만 수용(평문 응답은 페이월 우회라 거부)', () => {
  assert.deepEqual(extractSignedToken({ token: 'a.b.c' }), { ok: true, token: 'a.b.c' });
  // 서명 없는 평문 성공 응답을 절대 통과시키면 안 된다.
  assert.equal(extractSignedToken({ valid: true, tier: 'paid', expiresAt: 9e12 }).ok, false);
  assert.equal(extractSignedToken({ token: '' }).ok, false);
  // 서버가 명시적으로 거부한 사유는 그대로 전달(만료·기기 한도 등) — 실패는 실패로 두되 문구만 살린다.
  assert.deepEqual(extractSignedToken({ valid: false, error: '구독이 만료되었습니다.' }), {
    ok: false,
    error: '구독이 만료되었습니다.',
  });
  // 사유가 있어도 절대 성공으로 승격되지 않는다.
  assert.equal(extractSignedToken({ valid: false, error: '한도 초과', tier: 'paid' }).ok, false);
  // valid:true인데 토큰이 없으면 여전히 거부(페일오픈 방지) — error가 있어도 마찬가지.
  assert.equal(extractSignedToken({ valid: true, tier: 'paid', error: '무시' }).ok, false);
  assert.equal(extractSignedToken({ token: 123 }).ok, false);
  assert.equal(extractSignedToken(null).ok, false);
  assert.equal(extractSignedToken('nope').ok, false);
});

test('pickInstanceId — 응답값 우선, 없으면 기존 유지', () => {
  assert.equal(pickInstanceId({ instanceId: 'new' }, 'old'), 'new');
  assert.equal(pickInstanceId({}, 'old'), 'old');
  assert.equal(pickInstanceId({ instanceId: '' }, 'old'), 'old');
  assert.equal(pickInstanceId({ instanceId: 7 }, 'old'), 'old');
  assert.equal(pickInstanceId(null, undefined), undefined);
});

test('cacheFromVerify — 응답+키+now → 캐시', () => {
  const v = { ok: true, tier: 'paid', expiresAt: 999 };
  assert.deepEqual(cacheFromVerify('KEY-1', v, 500), {
    key: 'KEY-1',
    tier: 'paid',
    expiresAt: 999,
    lastVerified: 500,
  });
});

test('cacheFromVerify — instanceId 있으면 보관, 없으면 키 자체 없음', () => {
  const withId = cacheFromVerify('KEY-1', { ok: true, tier: 'paid', expiresAt: 999, instanceId: 'inst-9' }, 500);
  assert.equal(withId.instanceId, 'inst-9');
  const withoutId = cacheFromVerify('KEY-1', { ok: true, tier: 'paid', expiresAt: 999 }, 500);
  assert.ok(!('instanceId' in withoutId)); // undefined 키조차 두지 않음(캐시 형태 안정)
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
  const t = makeToken({ alg: 'ES256', typ: 'JWT' }, { tier: 'paid', exp: 42 });
  const jwt = decodeJwt(t);
  assert.equal(jwt.header.alg, 'ES256');
  assert.equal(jwt.payload.tier, 'paid');
  assert.equal(jwt.signatureB64, 'SIG');
  assert.equal(jwt.signingInput, t.slice(0, t.lastIndexOf('.')));
  assert.throws(() => decodeJwt('a.b')); // 형식 오류
});

test('validateLicenseClaims — 만료·iss·aud·tier', () => {
  const now = 1_000_000;
  const exp = (now + 60_000) / 1000; // 초 단위
  const base = { tier: 'paid', exp, iss: 'srv', aud: 'plugin' };
  assert.deepEqual(validateLicenseClaims(base, now, { issuer: 'srv', audience: 'plugin' }), {
    ok: true,
    tier: 'paid',
    expiresAt: exp * 1000,
  });
  assert.equal(validateLicenseClaims({ tier: 'paid', exp: (now - 1) / 1000 }, now).ok, false); // 만료
  assert.equal(validateLicenseClaims(base, now, { issuer: 'other' }).ok, false); // iss 불일치
  assert.equal(validateLicenseClaims({ tier: 'gold', exp }, now).ok, false); // 알 수 없는 티어
  assert.equal(validateLicenseClaims({ tier: 'paid' }, now).ok, false); // exp 없음
});

/* ================= presets.ts (M3 Paid) ================= */
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
  assert.deepEqual(def, { ok: true, preset: { name: 'x', base: 16, tolerance: 0.5, maxDepth: 8, semanticMap: {} } });
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

/* ================= exporters.ts (코드 내보내기) ================= */
const OPTS = { format: 'css', fontSizeUnit: 'px', base: 16 };

test('splitWeightStyle — weight/italic 분리', () => {
  assert.deepEqual(splitWeightStyle(600), { weight: 600, italic: false });
  assert.deepEqual(splitWeightStyle('Bold'), { weight: 700, italic: false });
  assert.deepEqual(splitWeightStyle('Semi Bold Italic'), { weight: 600, italic: true });
  assert.deepEqual(splitWeightStyle('Italic'), { weight: 400, italic: true });
});

test('exportTokens — strokeWidth/effectFloat는 px 치수로 출력', () => {
  const tokens = [
    { name: 'stroke-width/2', collection: 'Global', type: 'FLOAT', kind: 'strokeWidth', value: 2 },
    { name: 'shadow-blur/4', collection: 'Global', type: 'FLOAT', kind: 'effectFloat', value: 4 },
  ];
  const css = exportTokens(tokens, OPTS);
  assert.match(css, /--stroke-width-2: 2px;/);
  assert.match(css, /--shadow-blur-4: 4px;/); // effectFloat가 'other'로 새지 않고 px
});

test('exportTokens CSS — 색·별칭·단위(description #16)·italic', () => {
  const tokens = [
    { name: 'color/primary/500', collection: 'Global', type: 'COLOR', kind: 'color', value: '#2563eb' },
    { name: 'primary', collection: 'Semantic', type: 'COLOR', kind: 'color', aliasOf: 'color/primary/500' },
    { name: 'font-size/16', collection: 'Global', type: 'FLOAT', kind: 'fontSize', value: 16 },
    // #16: px FLOAT 단일 + 원본 단위는 description
    { name: 'line-height/150', collection: 'Global', type: 'FLOAT', kind: 'lineHeight', value: 24, description: '150%' },
    { name: 'line-height/24', collection: 'Global', type: 'FLOAT', kind: 'lineHeight', value: 24 }, // description 없음 → px
    { name: 'weight/heading', collection: 'Global', type: 'STRING', kind: 'fontWeight', value: 'Bold Italic' },
  ];
  const css = exportTokens(tokens, OPTS);
  assert.match(css, /--color-primary-500: #2563eb;/);
  assert.match(css, /--primary: var\(--color-primary-500\);/);
  assert.match(css, /--font-size-16: 16px;/); // px
  assert.match(css, /--line-height-150: 150%;/); // #16: description 우선
  assert.match(css, /--line-height-24: 24px;/); // description 없으면 px
  assert.match(css, /--weight-heading: 700;/);
  assert.match(css, /--weight-heading-style: italic;/); // italic 동반

  // 폰트 크기 rem 옵션
  const remCss = exportTokens(tokens, { ...OPTS, fontSizeUnit: 'rem' });
  assert.match(remCss, /--font-size-16: 1rem;/);
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
  // 추론 속성명은 Capitalize(관례)
  assert.equal(inferProp('hover'), 'State');
  assert.equal(inferProp('lg'), 'Size');
  assert.equal(inferProp('primary'), 'Type');
  assert.equal(inferProp('zzz'), null);
  // selected는 state 어휘가 아니라 불리언 축(아래 별도 테스트)
  assert.equal(inferProp('selected'), null);
  // 경로형: 어휘 추론 → Capitalize
  assert.deepEqual(parseVariantName('button/primary/hover'), {
    base: 'button',
    props: { Type: 'primary', State: 'hover' },
  });
  // 미지정 값 → Variant
  assert.deepEqual(parseVariantName('chip/foo'), { base: 'chip', props: { Variant: 'foo' } });
  // 명시형 prop=value는 사용자 지정이라 그대로 보존(기존 세트 호환)
  assert.deepEqual(parseVariantName('button, size=lg, state=hover'), {
    base: 'button',
    props: { size: 'lg', state: 'hover' },
  });
});

test('parseVariantName — selected 불리언 축(A)', () => {
  // 경로형: 값이 곧 속성명(Capitalize), 값은 true
  assert.deepEqual(parseVariantName('card/selected'), {
    base: 'card',
    props: { Selected: 'true' },
  });
  // 다른 어휘와 공존
  assert.deepEqual(parseVariantName('chip/primary/selected'), {
    base: 'chip',
    props: { Type: 'primary', Selected: 'true' },
  });
  // 명시형 true/false는 사용자 지정이라 그대로
  assert.deepEqual(parseVariantName('toggle, selected=false'), {
    base: 'toggle',
    props: { selected: 'false' },
  });
});

test('formatVariant — 속성명 정렬', () => {
  assert.equal(formatVariant({ type: 'primary', state: 'hover' }), 'state=hover, type=primary');
});

test('highConfidenceComponentRole — button/chip/card/list/field/nav/progress/figure(+heading은 별도)', () => {
  const solid = [{ type: 'SOLID', visible: true }];
  const txt = (id) => ({ id, name: 't', type: 'TEXT', characters: 'x' });
  // button
  const btn = {
    id: 'b', name: 'Frame', type: 'FRAME', layoutMode: 'HORIZONTAL', cornerRadius: 8,
    width: 120, height: 40, fills: solid, children: [txt('bt')],
  };
  assert.equal(highConfidenceComponentRole(btn), 'button');
  assert.equal(isHighConfidenceComponent(btn), true);
  // chip (작은 알약)
  const chip = {
    id: 'c', name: 'Frame', type: 'FRAME', layoutMode: 'HORIZONTAL', cornerRadius: 12,
    width: 60, height: 24, fills: solid, children: [txt('ct')],
  };
  assert.equal(highConfidenceComponentRole(chip), 'chip');
  // card
  const card = {
    id: 'cd', name: 'Frame', type: 'FRAME', cornerRadius: 12, fills: solid,
    children: [txt('a'), { id: 'v', name: 'Vector', type: 'VECTOR' }],
  };
  assert.equal(highConfidenceComponentRole(card), 'card');
  // list
  const row = (id) => ({ id, name: id, type: 'FRAME', width: 200, height: 40, children: [txt(id + 't')] });
  const list = {
    id: 'L', name: 'Frame', type: 'FRAME', layoutMode: 'VERTICAL',
    children: [row('r1'), row('r2'), row('r3')],
  };
  assert.equal(highConfidenceComponentRole(list), 'list');
  // field
  const input = {
    id: 'in', name: 'in', type: 'FRAME', width: 200, height: 36,
    strokes: solid, fills: solid,
  };
  const field = {
    id: 'f', name: 'Frame', type: 'FRAME', layoutMode: 'VERTICAL',
    children: [txt('lb'), input],
  };
  assert.equal(highConfidenceComponentRole(field), 'field');
  // nav
  const link = (id) => ({ id, name: id, type: 'FRAME', width: 60, height: 32, children: [txt(id + 't')] });
  const nav = {
    id: 'n', name: 'Frame', type: 'FRAME', layoutMode: 'HORIZONTAL', width: 400, height: 40,
    children: [link('l1'), link('l2'), link('l3')],
  };
  assert.equal(highConfidenceComponentRole(nav), 'nav');
  // progress
  const bar = { id: 'bar', name: 'bar', type: 'RECTANGLE', width: 80, height: 8, fills: solid };
  const progress = {
    id: 'p', name: 'Frame', type: 'FRAME', width: 200, height: 8, cornerRadius: 4, fills: solid,
    children: [bar],
  };
  assert.equal(highConfidenceComponentRole(progress), 'progress');
  // figure
  const img = { id: 'im', name: 'im', type: 'RECTANGLE', width: 100, height: 80, fills: [{ type: 'IMAGE', visible: true }] };
  const figure = { id: 'fg', name: 'Frame', type: 'FRAME', children: [img, txt('cap')] };
  assert.equal(highConfidenceComponentRole(figure), 'figure');
  // 일반 컨테이너는 null
  const box = { id: 'x', name: 'Frame 12', type: 'FRAME', children: [txt('a'), txt('b')] };
  assert.equal(highConfidenceComponentRole(box), null);
  assert.equal(isHighConfidenceComponent(box), false);
});

test('highConfidenceComponentRole — heading(빡센 슬롯, 액션 optional)', () => {
  const txt = (id, name = 'Label') => ({ id, name, type: 'TEXT', characters: name });
  const num = {
    id: 'num', name: 'Num', type: 'FRAME', layoutMode: 'HORIZONTAL', width: 80, height: 24,
    children: [txt('nl', 'Label'), txt('c1', 'count'), txt('c2', 'count')],
  };
  // Label + Num (buttonGroup 없음)
  const h1 = {
    id: 'h1', name: 'heading', type: 'FRAME', layoutMode: 'HORIZONTAL', width: 800, height: 40,
    children: [txt('t1'), num],
  };
  assert.equal(highConfidenceComponentRole(h1), 'heading');
  // Label + buttonGroup + Num
  const h2 = {
    id: 'h2', name: 'heading', type: 'FRAME', layoutMode: 'HORIZONTAL', width: 800, height: 40,
    children: [
      txt('t2'),
      { id: 'bg', name: 'buttonGroup', type: 'INSTANCE' },
      { ...num, id: 'num2' },
    ],
  };
  assert.equal(highConfidenceComponentRole(h2), 'heading');
  // 이름만 heading — 구조 없으면 null
  assert.equal(highConfidenceComponentRole({
    id: 'n', name: 'heading', type: 'FRAME', children: [{ id: 'v', type: 'VECTOR' }],
  }), null);
  // 높이 큰 섹션
  assert.equal(highConfidenceComponentRole({
    id: 'sec', name: 'heading', type: 'FRAME', layoutMode: 'HORIZONTAL', width: 800, height: 200,
    children: [txt('t')],
  }), null);
  // 채움+라운드면 heading 게이트 탈락(button/card 등 상위 역할로 가거나 null)
  const solid = [{ type: 'SOLID', visible: true }];
  assert.notEqual(highConfidenceComponentRole({
    id: 'cd', name: 'heading', type: 'FRAME', layoutMode: 'HORIZONTAL', cornerRadius: 12, fills: solid,
    width: 400, height: 40, children: [txt('a'), { id: 'v', type: 'VECTOR' }],
  }), 'heading');
  // Table 인스턴스 형제면 화이트리스트 밖
  assert.equal(highConfidenceComponentRole({
    id: 'bad', name: 'heading', type: 'FRAME', layoutMode: 'HORIZONTAL', width: 800, height: 40,
    children: [txt('t'), { id: 'tbl', name: 'Table', type: 'INSTANCE' }, { id: 'extra', type: 'RECTANGLE', width: 10, height: 10 }],
  }), null);
});

test('scanComponentCandidates(#1) — heading은 eligible', () => {
  const heading = {
    id: 'h', name: 'heading', type: 'FRAME', layoutMode: 'HORIZONTAL', width: 600, height: 36,
    children: [
      { id: 't', name: 'Label', type: 'TEXT', characters: '제목' },
      {
        id: 'num', name: 'Num', type: 'FRAME', layoutMode: 'HORIZONTAL', width: 60, height: 20,
        children: [
          { id: 'c1', name: 'count', type: 'TEXT', characters: '1' },
          { id: 'c2', name: 'count', type: 'TEXT', characters: '1' },
        ],
      },
    ],
  };
  const root = { id: 'r', name: 'sec', type: 'FRAME', children: [heading] };
  const out = scanComponentCandidates([root]);
  assert.equal(out.find((c) => c.id === 'h')?.eligible, true);
});

test('scanComponentCandidates(#1) — 고신뢰만 eligible, 잠금/인스턴스/텍스트 제외', () => {
  const solid = [{ type: 'SOLID', visible: true }];
  const text = { id: 't', name: 'Label', type: 'TEXT' };
  const icon = { id: 'i', name: 'Vector', type: 'VECTOR' };
  const btn = {
    id: 'b', name: 'btn', type: 'FRAME', layoutMode: 'HORIZONTAL', cornerRadius: 8,
    width: 100, height: 36, fills: solid, children: [{ id: 'bt', name: 't', type: 'TEXT' }],
  };
  const bare = { id: 'bare', name: 'Frame 9', type: 'FRAME', children: [icon] }; // 고신뢰 아님
  const inst = { id: 'in', name: 'Inst', type: 'INSTANCE' };
  const lockedGrp = { id: 'g', name: 'grp', type: 'GROUP', locked: true };
  const root = { id: 'r', name: 'root', type: 'FRAME', children: [text, btn, bare, inst, lockedGrp] };

  const out = scanComponentCandidates([root]);
  const byId = new Map(out.map((c) => [c.id, c]));
  assert.deepEqual(out.map((c) => c.id).sort(), ['b', 'r']);
  assert.equal(byId.get('r').eligible, false); // 단일 선택 컨테이너
  assert.equal(byId.get('b').eligible, true);
  assert.equal(byId.has('bare'), false);
});

test('scanComponentCandidates(#1) — 숨김(visible=false) 프레임은 후보·하위 스캔 제외', () => {
  const solid = [{ type: 'SOLID', visible: true }];
  const mkBtn = (id, visible) => ({
    id, name: id, type: 'FRAME', layoutMode: 'HORIZONTAL', cornerRadius: 8,
    width: 80, height: 32, fills: solid, visible,
    children: [{ id: id + 't', name: 't', type: 'TEXT' }],
  });
  const shown = mkBtn('shown', true);
  const hidden = mkBtn('hid', false);
  // 숨긴 부모 안의 ‘보이는’ 자식도 실효 비가시 → 스캔 안 함
  const nested = mkBtn('nest', true);
  const hiddenWrap = { id: 'wrap', name: 'wrap', type: 'FRAME', visible: false, children: [nested] };
  const root = { id: 'r', name: 'root', type: 'FRAME', children: [shown, hidden, hiddenWrap] };

  const out = scanComponentCandidates([root]);
  const ids = out.map((c) => c.id).sort();
  assert.deepEqual(ids, ['r', 'shown']);
  assert.equal(out.find((c) => c.id === 'shown').eligible, true);
  assert.equal(out.some((c) => c.id === 'hid' || c.id === 'nest' || c.id === 'wrap'), false);
});

test('scanComponentCandidates(#1) — INSTANCE/COMPONENT/SET 안은 서브트리째 스킵', () => {
  const solid = [{ type: 'SOLID', visible: true }];
  const mkBtn = (id) => ({
    id, name: id, type: 'FRAME', layoutMode: 'HORIZONTAL', cornerRadius: 8,
    width: 80, height: 32, fills: solid, children: [{ id: id + 't', name: 't', type: 'TEXT' }],
  });
  const nested = mkBtn('nest'); // 인스턴스 안 — 고신뢰여도 스킵
  const inst = { id: 'in', name: 'Button', type: 'INSTANCE', children: [nested] };
  const mainInner = mkBtn('mi');
  const main = { id: 'mc', name: 'Icon/Primary', type: 'COMPONENT', children: [mainInner] };
  const setKid = mkBtn('sk');
  const set = { id: 'cs', name: 'Row', type: 'COMPONENT_SET', children: [setKid] };
  const free = mkBtn('free');
  const root = { id: 'r', name: 'page', type: 'FRAME', children: [inst, main, set, free] };

  const out = scanComponentCandidates([root]);
  const ids = out.map((c) => c.id).sort();
  assert.deepEqual(ids, ['free', 'r']);
  assert.equal(out.find((c) => c.id === 'free').eligible, true);
});

test('scanComponentCandidates(#1) — 깊은 eligible의 조상 체인은 맥락으로 보존', () => {
  const solid = [{ type: 'SOLID', visible: true }];
  const deep = {
    id: 'd', name: 'card', type: 'FRAME', cornerRadius: 12, fills: solid,
    children: [
      { id: 'dt', name: 't', type: 'TEXT' },
      { id: 'dv', name: 'v', type: 'VECTOR' },
    ],
  };
  const mid = { id: 'm', name: 'mid', type: 'GROUP', locked: true, children: [deep] };
  const top = { id: 'top', name: 'top', type: 'TEXT', children: [mid] };

  const out = scanComponentCandidates([top]);
  assert.deepEqual(out.map((c) => c.id), ['top', 'm', 'd']);
  assert.equal(out.find((c) => c.id === 'd').eligible, true);
  assert.equal(out.find((c) => c.id === 'm').eligible, false);
  assert.equal(out.find((c) => c.id === 'top').eligible, false);
});

test('scanComponentCandidates(#1) — 고신뢰 게이트: 임의/container 프레임은 eligible 아님', () => {
  const solid = [{ type: 'SOLID', visible: true }];
  const btn = {
    id: 'b', name: 'btn', type: 'FRAME', layoutMode: 'HORIZONTAL', cornerRadius: 8,
    width: 100, height: 36, fills: solid, children: [{ id: 'bt', name: 't', type: 'TEXT' }],
  };
  const blob = { id: 'x', name: 'Frame 12', type: 'FRAME', children: [{ id: 'xv', name: 'v', type: 'VECTOR' }] };
  const wrap = { id: 'w', name: 'row-container', type: 'FRAME', children: [{ id: 'wv', name: 'v', type: 'VECTOR' }] };
  const txt = { id: 't', name: 'Label', type: 'TEXT' };
  const root = { id: 'r', name: 'root', type: 'FRAME', children: [btn, blob, wrap, txt] };

  const out = scanComponentCandidates([root]);
  const byId = new Map(out.map((c) => [c.id, c]));
  assert.equal(byId.get('b').eligible, true);
  assert.equal(byId.has('x'), false); // 임의 프레임 — 고신뢰 아님
  assert.equal(byId.has('w'), false); // container류 — 고신뢰 아님
  assert.equal(byId.has('t'), false);
});

test('scanComponentCandidates(#1) — 단일 선택 컨테이너 제외 vs 다중 선택 루트 포함', () => {
  const solid = [{ type: 'SOLID', visible: true }];
  const mkBtn = (id) => ({
    id, name: 'btn', type: 'FRAME', layoutMode: 'HORIZONTAL', cornerRadius: 8,
    width: 80, height: 32, fills: solid, children: [{ id: id + 't', name: 't', type: 'TEXT' }],
  });
  const childA = mkBtn('a');
  const childB = mkBtn('b');
  const container = { id: 'box', name: 'box', type: 'FRAME', children: [childA, childB] };

  const single = scanComponentCandidates([container]);
  const sById = new Map(single.map((c) => [c.id, c]));
  assert.equal(sById.get('box').eligible, false);
  assert.equal(sById.get('a').eligible, true);
  assert.equal(sById.get('b').eligible, true);

  const multi = scanComponentCandidates([childA, childB]);
  assert.equal(multi.find((c) => c.id === 'a').eligible, true);
  assert.equal(multi.find((c) => c.id === 'b').eligible, true);
});

test('shouldCollapseToProperties — 텍스트/스왑/불리언만 다르면 접힘, 구조·크기만은 세트', () => {
  const mkBtn = (id, opts = {}) => ({
    id,
    name: 'button',
    type: 'FRAME',
    layoutMode: 'HORIZONTAL',
    width: opts.width ?? 100,
    height: opts.height ?? 36,
    fillHex: opts.fillHex ?? '#111111',
    children: [
      {
        id: id + '-t',
        name: 'label',
        type: 'TEXT',
        characters: opts.text ?? 'OK',
      },
      {
        id: id + '-i',
        name: 'icon',
        type: 'INSTANCE',
        mainComponentKey: opts.icon ?? 'icon-a',
        children: [],
      },
      {
        id: id + '-b',
        name: 'badge?',
        type: 'FRAME',
        visible: opts.badge ?? true,
        children: [],
      },
    ],
  });

  // 텍스트만 다름 → 접힘
  assert.equal(shouldCollapseToProperties([mkBtn('a', { text: '확인' }), mkBtn('b', { text: '취소' })]), true);
  // 아이콘 스왑만 → 접힘
  assert.equal(shouldCollapseToProperties([mkBtn('a', { icon: 'a' }), mkBtn('b', { icon: 'b' })]), true);
  // badge? 가시성만 → 접힘
  assert.equal(shouldCollapseToProperties([mkBtn('a', { badge: true }), mkBtn('b', { badge: false })]), true);
  // 완전 동일 → 접힘(단품+인스턴스)
  assert.equal(shouldCollapseToProperties([mkBtn('a'), mkBtn('b')]), true);
  // 텍스트+크기(오토레이아웃) → 접힘
  assert.equal(
    shouldCollapseToProperties([mkBtn('a', { text: 'OK', width: 80 }), mkBtn('b', { text: '확인합니다', width: 160 })]),
    true,
  );
  // 크기만 다름(카피 동일) → 세트
  assert.equal(shouldCollapseToProperties([mkBtn('a', { width: 80 }), mkBtn('b', { width: 160 })]), false);
  // fill 다름 → 세트
  assert.equal(shouldCollapseToProperties([mkBtn('a', { fillHex: '#111' }), mkBtn('b', { fillHex: '#f00' })]), false);
  // 자식 구성 다름 → 세트
  const noIcon = {
    id: 'x',
    name: 'button',
    type: 'FRAME',
    layoutMode: 'HORIZONTAL',
    width: 100,
    height: 36,
    fillHex: '#111111',
    children: [{ id: 'xt', name: 'label', type: 'TEXT', characters: 'OK' }],
  };
  assert.equal(shouldCollapseToProperties([mkBtn('a'), noIcon]), false);
  // 멤버 1개 → false
  assert.equal(shouldCollapseToProperties([mkBtn('a')]), false);
  // TEXT 레이어명이 카피마다 달라도(확인/취소) 같은 슬롯 → 접힘
  const named = (id, text) => ({
    id,
    name: 'button',
    type: 'FRAME',
    layoutMode: 'HORIZONTAL',
    width: 100,
    height: 36,
    fillHex: '#111111',
    children: [{ id: id + '-t', name: text, type: 'TEXT', characters: text }],
  });
  assert.equal(shouldCollapseToProperties([named('a', '확인'), named('b', '취소')]), true);
});

test('shouldCollapseToProperties — heading 액션(buttonGroup) optional이면 접힘', () => {
  const txt = (id, chars) => ({ id, name: 'Label', type: 'TEXT', characters: chars });
  const num = (id, n) => ({
    id, name: 'Num', type: 'FRAME', layoutMode: 'HORIZONTAL', width: 60, height: 24,
    children: [
      { id: id + 'c1', name: 'count', type: 'TEXT', characters: String(n) },
      { id: id + 'c2', name: 'count', type: 'TEXT', characters: String(n) },
    ],
  });
  const without = {
    id: 'h1', name: 'heading', type: 'FRAME', layoutMode: 'HORIZONTAL',
    width: 800, height: 40,
    children: [txt('t1', '제목'), num('n1', 1)],
  };
  const withAction = {
    id: 'h2', name: 'heading', type: 'FRAME', layoutMode: 'HORIZONTAL',
    width: 800, height: 40,
    children: [
      txt('t2', '다른제목'),
      { id: 'bg', name: 'buttonGroup', type: 'INSTANCE', mainComponentKey: 'bg-key' },
      num('n2', 2),
    ],
  };
  assert.equal(shouldCollapseToProperties([without, withAction]), true);
  assert.equal(pickCollapseMasterIndex([without, withAction]), 1);

  const plan = inferVaryingComponentProperties([without, withAction]);
  assert.ok(plan.some((p) => p.type === 'BOOLEAN' && p.headingSlot?.kind === 'action'));
  assert.ok(plan.some((p) => p.type === 'TEXT')); // 제목·count 차이
  const valsNo = propValuesFromStruct(without, plan);
  const valsYes = propValuesFromStruct(withAction, plan);
  const boolProp = plan.find((p) => p.type === 'BOOLEAN');
  assert.equal(valsNo[boolProp.propName], false);
  assert.equal(valsYes[boolProp.propName], true);

  // 버튼 아이콘 결손은 여전히 세트(heading 아님)
  const mkBtn = (id, kids) => ({
    id, name: 'button', type: 'FRAME', layoutMode: 'HORIZONTAL',
    width: 100, height: 36, fillHex: '#111111', children: kids,
  });
  assert.equal(shouldCollapseToProperties([
    mkBtn('a', [
      { id: 'at', name: 'label', type: 'TEXT', characters: 'OK' },
      { id: 'ai', name: 'icon', type: 'INSTANCE', mainComponentKey: 'i' },
    ]),
    mkBtn('b', [{ id: 'bt', name: 'label', type: 'TEXT', characters: 'OK' }]),
  ]), false);
});

test('inferVaryingComponentProperties — 다른 텍스트 슬롯만 TEXT 속성 1개', () => {
  const mk = (id, label, shared = '공통') => ({
    id,
    name: 'button',
    type: 'FRAME',
    layoutMode: 'HORIZONTAL',
    children: [
      { id: id + '-s', name: 'hint', type: 'TEXT', characters: shared },
      { id: id + '-t', name: label, type: 'TEXT', characters: label },
    ],
  });
  const plan = inferVaryingComponentProperties([mk('a', '확인'), mk('b', '취소')]);
  assert.equal(plan.length, 1);
  assert.equal(plan[0].type, 'TEXT');
  assert.equal(plan[0].propName, 'Text'); // 레이어명=카피 → 중립 Text
  assert.equal(plan[0].layerPath, '1'); // 두 번째 자식(다른 라벨)
  // 공통 hint는 속성에 없음
  assert.ok(!plan.some((p) => p.layerPath === '0'));
});

test('inferVaryingComponentProperties — 두 슬롯 모두 다르면 TEXT 2개', () => {
  const mk = (id, a, b) => ({
    id,
    name: 'card',
    type: 'FRAME',
    children: [
      { id: id + '-a', name: 'title', type: 'TEXT', characters: a },
      { id: id + '-b', name: 'body', type: 'TEXT', characters: b },
    ],
  });
  const plan = inferVaryingComponentProperties([mk('a', 'A1', 'B1'), mk('b', 'A2', 'B2')]);
  assert.equal(plan.length, 2);
  assert.deepEqual(plan.map((p) => p.propName).sort(), ['Body', 'Title']);
});

test('recognizeComponentName — 마지막 명사 우선(접두어는 맥락)', () => {
  assert.equal(recognizeComponentName('btn'), 'Button'); // 약어
  assert.equal(recognizeComponentName('button-primary'), 'Button');
  assert.equal(recognizeComponentName('nav-button'), 'Button'); // 끝 명사 = button(nav는 맥락)
  assert.equal(recognizeComponentName('card-item'), 'Item'); // 끝 명사 = item
  assert.equal(recognizeComponentName('card-header'), 'Header'); // 둘 다 명사 → 마지막(header)
  assert.equal(recognizeComponentName('Frame 12'), null); // 미인식
  assert.equal(recognizeComponentName('hero-banner'), 'Banner'); // hero 미인식, banner 인식
});

test('extractNameProps — 명사 제외 + 보편 속성 추출', () => {
  assert.deepEqual(extractNameProps('button-primary'), { Type: 'primary' });
  assert.deepEqual(extractNameProps('button-primary-hover'), { Type: 'primary', State: 'hover' });
  assert.deepEqual(extractNameProps('btn-lg'), { Size: 'lg' });
  assert.deepEqual(extractNameProps('chip-selected'), { Selected: 'true' });
  assert.deepEqual(extractNameProps('card'), {}); // 명사만 → 속성 없음
});

test('deriveVariants — 이름 우선: type/state는 이름에서, 기하는 무시', () => {
  const m = (id, name) => ({ id, name, type: 'FRAME', width: 100, height: 40, fillHex: '#2d7ff9' });
  // 이름이 구분 → 기하(같은 크기/색) 보완 안 함
  const d = deriveVariants([m('a', 'button-primary'), m('b', 'button-secondary')]);
  assert.deepEqual(d.map((x) => x.variant), ['Type=primary', 'Type=secondary']);
});

test('deriveVariants — 이름+기하 보완: 같은 type, 크기 다르면 Size 추가', () => {
  const m = (id, name, w) => ({ id, name, type: 'FRAME', width: w, height: 40, fillHex: '#2d7ff9' });
  const d = deriveVariants([m('a', 'button-primary', 80), m('b', 'button-primary', 160)]);
  // 이름만으로는 둘 다 Type=primary(충돌) → 면적으로 Size 보완(2값은 md 중심 → md·lg)
  assert.deepEqual(d.map((x) => x.variant), ['Size=md, Type=primary', 'Size=lg, Type=primary']);
});

test('deriveVariants — 크기만 다름 → Size 등급', () => {
  const m = (id, w) => ({ id, name: 'btn', type: 'FRAME', width: w, height: 40, fillHex: '#2d7ff9' });
  const d = deriveVariants([m('a', 80), m('b', 120), m('c', 160)]);
  assert.deepEqual(d.map((x) => x.variant), ['Size=sm', 'Size=md', 'Size=lg']);
});

test('deriveVariants — 색만 다름 → Color 이름', () => {
  const m = (id, hex) => ({ id, name: 'chip', type: 'FRAME', width: 100, height: 40, fillHex: hex });
  const d = deriveVariants([m('a', '#2d7ff9'), m('b', '#e5484d')]);
  assert.ok(d.every((x) => x.variant.startsWith('Color=')));
  assert.notEqual(d[0].variant, d[1].variant);
});

test('deriveVariants — 크기+색 → 두 축(키 정렬: Color, Size)', () => {
  const m = (id, w, hex) => ({ id, name: 'btn', type: 'FRAME', width: w, height: 40, fillHex: hex });
  const d = deriveVariants([m('a', 80, '#2d7ff9'), m('b', 160, '#e5484d')]);
  assert.match(d[0].variant, /^Color=.*, Size=/);
});

test('deriveVariants — 크기·색·이름 동일 → Variant=N fallback / 단일은 빈 변형', () => {
  // 이름도 'btn'으로 동일(구별 토큰 없음) → 마지막 수단 인덱스.
  const same = (id) => ({ id, name: 'btn', type: 'FRAME', width: 100, height: 40, fillHex: '#2d7ff9' });
  assert.deepEqual(deriveVariants([same('a'), same('b')]).map((x) => x.variant), ['Variant=1', 'Variant=2']);
  assert.deepEqual(deriveVariants([same('a')]), [{ id: 'a', name: 'btn', props: {}, variant: '' }]);
});

test('distinguishingTokens — 컴포넌트 명사·어휘 제외한 구별 토큰', () => {
  assert.equal(distinguishingTokens('nav-left'), 'left'); // nav=명사 제외
  assert.equal(distinguishingTokens('nav links'), 'links');
  assert.equal(distinguishingTokens('artist-button'), 'artist'); // button=명사 제외
  assert.equal(distinguishingTokens('button-primary'), ''); // primary=Type 어휘 제외 → 남는 토큰 없음
  assert.equal(distinguishingTokens('btn'), ''); // 명사뿐
});

test('deriveVariants — 어휘로 안 갈리면 구별 토큰을 Variant 값으로(의미 보존)', () => {
  const m = (id, name) => ({ id, name, type: 'FRAME', width: 100, height: 40, fillHex: '#2d7ff9' });
  // nav-left/right/links: 어휘 없음 → 구별 토큰으로(Variant=1/2/3 아님).
  const nav = deriveVariants([m('a', 'nav-left'), m('b', 'nav-right'), m('c', 'nav links')]);
  assert.deepEqual(nav.map((x) => x.variant), ['Variant=left', 'Variant=right', 'Variant=links']);
  // like/artist button: 끝명사 button으로 묶이고 구별 토큰 like/artist 보존.
  const btn = deriveVariants([m('a', 'like button'), m('b', 'artist-button')]);
  assert.deepEqual(btn.map((x) => x.variant), ['Variant=like', 'Variant=artist']);
});

test('deriveVariants — 혼합(무속성 + 속성): 균일 키 + 빈 이름 없음(Figma 세트 유효)', () => {
  const m = (id, name) => ({ id, name, type: 'FRAME', width: 100, height: 40, fillHex: '#2d7ff9' });
  // nav-button(무속성) + button-primary(Type) → 끝명사 button으로 묶임. 무속성 멤버는 Type=default로 채워
  // 모든 변형이 같은 속성 키(Type)를 갖는다(키가 섞이면 Figma 세트 오류).
  const d = deriveVariants([m('a', 'nav-button'), m('b', 'button-primary')]);
  assert.ok(d.every((x) => x.variant.length > 0), '빈 변형 이름 없음');
  assert.equal(new Set(d.map((x) => x.variant)).size, 2, '변형 이름 고유');
  const keysOf = (v) => v.split(', ').map((s) => s.split('=')[0]).sort().join(',');
  assert.equal(new Set(d.map((x) => keysOf(x.variant))).size, 1, '모든 변형이 동일 속성 키');
  assert.deepEqual(d.map((x) => x.variant).sort(), ['Type=default', 'Type=primary']);
});

test('colorAxisLabels / commonBaseName(PascalCase·약어 펼침)', () => {
  const labels = colorAxisLabels(['#2d7ff9', '#e5484d']);
  assert.notEqual(labels[0], labels[1]);
  assert.equal(commonBaseName(['Button Large', 'Button Small']), 'Button');
  assert.equal(commonBaseName(['btn-primary', 'btn-secondary']), 'Button'); // btn → Button
  assert.equal(commonBaseName(['card', 'card']), 'Card');
  assert.equal(commonBaseName(['nav-button', 'nav-button-active']), 'NavButton'); // 공통 접두 유지
  // 공통 접두 없음 → 인식 명사(마지막)로 폴백
  assert.equal(commonBaseName(['nav-button', 'button-primary']), 'Button');
  assert.equal(commonBaseName(['primary-button', 'secondary-button']), 'Button');
});

test('groupByExactName — 정확한 이름끼리만 묶음(머리명사 병합 안 함)', () => {
  const mk = (id, name) => ({ id, name, type: 'FRAME', width: 100, height: 40, children: [] });
  // Like Button×2 + artist-button×1: 정확한 이름이 다르므로 별도 그룹(머리명사면 'Button'으로 합쳐짐).
  const groups = groupByExactName([mk('a', 'Like Button'), mk('b', 'Like Button'), mk('c', 'artist-button')]);
  assert.equal(groups.length, 2);
  assert.deepEqual(groups[0].members.map((m) => m.id), ['a', 'b']); // like-button 그룹
  assert.deepEqual(groups[1].members.map((m) => m.id), ['c']); // artist-button 단독
});

test('groupByExactName — 명사 사전에 없는 이름도 묶음(row-container/preview-container)', () => {
  const mk = (id, name) => ({ id, name, type: 'FRAME', width: 280, height: 397, children: [] });
  const groups = groupByExactName([
    mk('a', 'row-container'), mk('b', 'row-container'), mk('c', 'row-container'),
    mk('d', 'preview-container'), mk('e', 'preview-container'),
  ]);
  assert.equal(groups.length, 2);
  assert.equal(groups[0].members.length, 3); // row-container ×3
  assert.equal(groups[1].members.length, 2); // preview-container ×2
});

test('groupByExactName — 대소문자·여백은 관대, 구두점은 구분(kebab 오병합 방지)', () => {
  const mk = (id, name) => ({ id, name, type: 'FRAME', width: 100, height: 40, children: [] });
  // 구두점만 다른 서로 다른 이름은 합쳐지면 안 됨(kebab이면 둘 다 'card-large'로 오병합).
  const split = groupByExactName([mk('a', 'Card (Large)'), mk('b', 'Card Large')]);
  assert.equal(split.length, 2);
  // 대소문자·여백만 다른 같은 이름은 한 그룹.
  const merged = groupByExactName([mk('c', 'Like Button'), mk('d', 'like  button')]);
  assert.equal(merged.length, 1);
  assert.deepEqual(merged[0].members.map((m) => m.id), ['c', 'd']);
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
  // 경로형 추론 → 속성명 Capitalize
  assert.deepEqual(g.properties, { Type: ['primary', 'secondary'], State: ['default', 'hover'] });
  assert.equal(g.members.length, 3);
  // 빈 조합: secondary + hover 없음(키 정렬: State < Type)
  assert.deepEqual(g.missing, ['State=hover, Type=secondary']);
});

test('classifyVariants — 멤버 1개 베이스는 단일', () => {
  const r = classifyVariants(['icon/sm', 'badge/lg']);
  // 서로 다른 베이스, 각 1개 → 모두 단일
  assert.deepEqual(r.groups, []);
  assert.deepEqual(r.singles.sort(), ['badge/lg', 'icon/sm']);
});

test('classifyVariants — selected 불리언 축(A)', () => {
  const r = classifyVariants(['switch, selected=true', 'switch, selected=false']);
  assert.equal(r.groups.length, 1);
  const g = r.groups[0];
  assert.equal(g.base, 'switch');
  assert.deepEqual(g.properties, { selected: ['false', 'true'] });
  assert.deepEqual(g.missing, []); // true/false 둘 다 존재
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
    { name: 'label', type: 'TEXT', characters: 'A' },
    { name: 'icon', type: 'INSTANCE' },
    { name: 'badge?', type: 'FRAME' }, // 가시성 토글
    { name: 'label', type: 'TEXT', characters: 'B' }, // 동명·다른 카피 → Label-2
  ]);
  assert.deepEqual(plan, [
    { propName: 'Label', type: 'TEXT', layerName: 'label', layerPath: undefined, field: 'characters' },
    { propName: 'Icon', type: 'INSTANCE_SWAP', layerName: 'icon', layerPath: undefined, field: 'mainComponent' },
    { propName: 'Badge', type: 'BOOLEAN', layerName: 'badge?', layerPath: undefined, field: 'visible' },
    { propName: 'Label-2', type: 'TEXT', layerName: 'label', layerPath: undefined, field: 'characters' },
  ]);
  // 텍스트가 ?로 끝나면 BOOLEAN 우선
  assert.equal(inferComponentProperties([{ name: 'caption?', type: 'TEXT' }])[0].type, 'BOOLEAN');
});

test('inferComponentProperties — 동명·동일 카피 TEXT는 속성 1개만(Count/Count-2 고아 방지)', () => {
  const plan = inferComponentProperties([
    { name: 'Label', type: 'TEXT', path: '0', characters: '전체' },
    { name: 'Count', type: 'TEXT', path: '1', characters: '1' },
    { name: 'Count', type: 'TEXT', path: '2', characters: '1' }, // 동일 카피 → 스킵
  ]);
  assert.equal(plan.length, 2);
  assert.deepEqual(plan.map((p) => p.propName), ['Label', 'Count']);
  assert.equal(plan[1].layerPath, '1'); // 첫 Count만
});

test('inferVaryingComponentProperties — 이름? TEXT도 BOOLEAN 우선(전체 노출과 동일)', () => {
  const mk = (id, visible) => ({
    id,
    name: 'chip',
    type: 'FRAME',
    children: [
      { id: id + '-b', name: 'badge?', type: 'TEXT', characters: 'N', visible },
    ],
  });
  const plan = inferVaryingComponentProperties([mk('a', true), mk('b', false)]);
  assert.equal(plan.length, 1);
  assert.equal(plan[0].type, 'BOOLEAN');
  assert.equal(plan[0].propName, 'Badge');
  assert.equal(plan[0].field, 'visible');
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
  const tok = makeToken({ alg: 'ES256' }, { tier: 'paid', exp });
  const yes = async () => true;
  const no = async () => false;

  const ok = await verifyLicenseToken(tok, now, {}, yes);
  assert.deepEqual(ok, { ok: true, tier: 'paid', expiresAt: exp * 1000 });

  // 서명 실패 → 거부
  assert.equal((await verifyLicenseToken(tok, now, {}, no)).ok, false);
  // alg=none → 서명 검증 호출 없이 거부
  const none = makeToken({ alg: 'none' }, { tier: 'paid', exp });
  assert.equal((await verifyLicenseToken(none, now, {}, yes)).ok, false);
  // 서명 OK라도 만료면 거부
  const expired = makeToken({ alg: 'ES256' }, { tier: 'paid', exp: (now - 1) / 1000 });
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

/* ================= a11y.ts (UX8) ================= */
test('nextTabIndex — 화살표 순환 + Home/End, 그 외 -1', () => {
  assert.equal(nextTabIndex('ArrowRight', 0, 3), 1);
  assert.equal(nextTabIndex('ArrowRight', 2, 3), 0); // 순환
  assert.equal(nextTabIndex('ArrowDown', 1, 3), 2);
  assert.equal(nextTabIndex('ArrowLeft', 0, 3), 2); // 순환
  assert.equal(nextTabIndex('ArrowUp', 2, 3), 1);
  assert.equal(nextTabIndex('Home', 2, 3), 0);
  assert.equal(nextTabIndex('End', 0, 3), 2);
  assert.equal(nextTabIndex('Enter', 0, 3), -1); // 내비 키 아님
  assert.equal(nextTabIndex('ArrowRight', 0, 0), -1); // 빈 목록
});

/* ================= contrast.ts (명도 대비 점검) ================= */
test('isLargeText — 24px↑ 또는 18.66px↑ + 볼드', () => {
  assert.equal(isLargeText(24, false), true);
  assert.equal(isLargeText(23.9, false), false);
  assert.equal(isLargeText(19, true), true); // 14pt 볼드
  assert.equal(isLargeText(19, false), false); // 볼드 아니면 미달
  assert.equal(isLargeText(18, true), false); // 18.66px 미만
});

test('requiredRatio — level·large 매트릭스', () => {
  assert.equal(requiredRatio('AA', false), 4.5);
  assert.equal(requiredRatio('AA', true), 3);
  assert.equal(requiredRatio('AAA', false), 7);
  assert.equal(requiredRatio('AAA', true), 4.5);
});

test('checkPair — 흑/백 21(AA·AAA 통과), 회색쌍 미달', () => {
  const bw = checkPair('#000000', '#ffffff');
  assert.equal(bw.ratio, 21);
  assert.equal(bw.aa, true);
  assert.equal(bw.aaa, true);
  const gray = checkPair('#888888', '#777777');
  assert.equal(gray.aa, false);
  assert.equal(gray.aaa, false);
});

test('evaluateSample — 큰 글자는 완화된 기준(AA 3) 적용', () => {
  // 대비 ~3.x인 쌍: 일반 텍스트는 미달(4.5), 큰 글자는 통과(3).
  const small = evaluateSample({ id: '1', name: 't', fg: '#767676', bg: '#ffffff', fontSize: 16, bold: false }, 'AA');
  assert.equal(small.large, false);
  assert.equal(small.required, 4.5);
  assert.equal(small.pass, true); // #767676 on white ≈ 4.54
  const big = evaluateSample({ id: '2', name: 't', fg: '#949494', bg: '#ffffff', fontSize: 30, bold: false }, 'AA');
  assert.equal(big.large, true);
  assert.equal(big.required, 3);
  assert.equal(big.pass, true); // ≈3.1, 큰 글자 기준 통과
  const bigSmallFail = evaluateSample({ id: '3', name: 't', fg: '#949494', bg: '#ffffff', fontSize: 16, bold: false }, 'AA');
  assert.equal(bigSmallFail.pass, false); // 같은 색이라도 일반 텍스트면 미달
});

test('checkContrast — 집계 + 실패 우선·대비 낮은 순 정렬', () => {
  const samples = [
    { id: 'pass', name: '통과', fg: '#000000', bg: '#ffffff', fontSize: 16, bold: false }, // 21
    { id: 'bad', name: '심각', fg: '#cccccc', bg: '#ffffff', fontSize: 16, bold: false }, // ≈1.6
    { id: 'mid', name: '경계', fg: '#999999', bg: '#ffffff', fontSize: 16, bold: false }, // ≈2.8
  ];
  const r = checkContrast(samples, 'AA');
  assert.equal(r.checked, 3);
  assert.equal(r.passed, 1);
  assert.equal(r.failed, 2);
  // 실패가 앞으로, 실패 안에서는 대비 낮은(bad) 것이 먼저, 통과(pass)는 맨 뒤.
  assert.deepEqual(r.findings.map((f) => f.id), ['bad', 'mid', 'pass']);
  assert.equal(r.findings[2].pass, true);
});

test('suggestContrastFix(#2) — 보정색이 required 충족(텍스트·배경 둘 다)', () => {
  const fg = '#999999';
  const bg = '#ffffff';
  const required = 4.5; // 원래 ≈2.8 미달
  const { suggestedFg, suggestedBg } = suggestContrastFix(fg, bg, required);
  assert.ok(contrastRatio(hexToRgb(suggestedFg), hexToRgb(bg)) >= required - 0.05); // 텍스트색 보정
  assert.ok(contrastRatio(hexToRgb(fg), hexToRgb(suggestedBg)) >= required - 0.05); // 배경색 보정
  // 보정 fg는 원본보다 대비가 크다(흰 배경 → 더 어둡게).
  assert.ok(contrastRatio(hexToRgb(suggestedFg), hexToRgb(bg)) > contrastRatio(hexToRgb(fg), hexToRgb(bg)));
});

test('suggestContrastFix(#2) — 어두운 배경이면 텍스트색을 밝혀 통과', () => {
  const { suggestedFg } = suggestContrastFix('#444444', '#222222', 4.5);
  assert.ok(contrastRatio(hexToRgb(suggestedFg), hexToRgb('#222222')) >= 4.5 - 0.05);
});

test('evaluateSample — 미달은 보정 제안 첨부, 통과는 없음', () => {
  const fail = evaluateSample({ id: '1', name: 't', fg: '#aaaaaa', bg: '#ffffff', fontSize: 16, bold: false }, 'AA');
  assert.equal(fail.pass, false);
  assert.ok(fail.suggestedFg && fail.suggestedBg);
  assert.ok(contrastRatio(hexToRgb(fail.suggestedFg), hexToRgb('#ffffff')) >= fail.required - 0.05);
  const ok = evaluateSample({ id: '2', name: 't', fg: '#000000', bg: '#ffffff', fontSize: 16, bold: false }, 'AA');
  assert.equal(ok.pass, true);
  assert.equal(ok.suggestedFg, undefined);
});

/* ================= roles.ts (전 토큰 역할 어휘) ================= */
test('tshirtRoles — 센터(md) 정렬 티셔츠', () => {
  assert.deepEqual(tshirtRoles([16]), ['md']);
  assert.deepEqual(tshirtRoles([8, 16, 24]), ['sm', 'md', 'lg']);
  assert.deepEqual(tshirtRoles([4, 8, 16, 24, 32]), ['xs', 'sm', 'md', 'lg', 'xl']);
  assert.deepEqual(tshirtRoles([4, 8, 16, 24, 32, 48]), ['xs', 'sm', 'md', 'lg', 'xl', '2xl']);
});

test('radiusRoles — 0→none · 큰값→full · 나머지 티셔츠', () => {
  assert.deepEqual(radiusRoles([0, 4, 8]), ['none', 'md', 'lg']);
  assert.deepEqual(radiusRoles([0, 8, 9999]), ['none', 'md', 'full']);
});

test('fontSizeRoles — base(16) 중심 type 스케일', () => {
  assert.deepEqual(fontSizeRoles([12, 16, 24], 16), ['caption', 'body', 'title']);
  assert.deepEqual(fontSizeRoles([16, 20, 24, 32], 16), ['body', 'title', 'h3', 'h2']);
});

test('weightRole / familyRole', () => {
  assert.equal(weightRole(400), 'regular');
  assert.equal(weightRole(700), 'bold');
  assert.equal(weightRole(500), 'medium');
  assert.equal(familyRole('Roboto Mono', 0), 'mono');
  assert.equal(familyRole('Inter', 0), 'sans');
  assert.equal(familyRole('Custom Serif', 0), 'serif');
  assert.equal(familyRole('Foo', 0), 'body');
  assert.equal(familyRole('Bar', 1), 'heading');
});

test('suggestTokenRoles — 전 카테고리 역할→Global 이름', () => {
  const tokens = [
    { name: 'color/0066ff', category: 'color', sources: ['fill'], value: '#0066ff' },
    { name: 'spacing/8', category: 'gap', sources: ['gap'], value: 8 },
    { name: 'spacing/16', category: 'gap', sources: ['gap'], value: 16 },
    { name: 'spacing/24', category: 'gap', sources: ['gap'], value: 24 },
    { name: 'radius/0', category: 'radius', sources: ['radius'], value: 0 },
    { name: 'radius/8', category: 'radius', sources: ['radius'], value: 8 },
    { name: 'font-size/16', category: 'fontSize', sources: ['fontSize'], value: 16 },
    { name: 'font-size/24', category: 'fontSize', sources: ['fontSize'], value: 24 },
    { name: 'font-weight/700', category: 'fontWeight', sources: ['fontWeight'], value: 700 },
    { name: 'font-family/Inter', category: 'fontFamily', sources: ['fontFamily'], value: 'Inter' },
    { name: 'stroke-width/1', category: 'strokeWidth', sources: ['strokeWidth'], value: 1 },
    { name: 'stroke-width/2', category: 'strokeWidth', sources: ['strokeWidth'], value: 2 },
    { name: 'stroke-width/4', category: 'strokeWidth', sources: ['strokeWidth'], value: 4 },
  ];
  const map = suggestTokenRoles(tokens, 16);
  assert.equal(map['primary'], 'color/0066ff'); // 색(유일 유채) → primary
  assert.equal(map['spacing/md'], 'spacing/16'); // 센터
  assert.equal(map['spacing/sm'], 'spacing/8');
  assert.equal(map['spacing/lg'], 'spacing/24');
  assert.equal(map['radius/none'], 'radius/0');
  assert.equal(map['font-size/body'], 'font-size/16');
  assert.equal(map['font-size/title'], 'font-size/24');
  assert.equal(map['font-weight/bold'], 'font-weight/700');
  assert.equal(map['font-family/sans'], 'font-family/Inter');
  assert.equal(map['stroke-width/md'], 'stroke-width/2'); // 티셔츠 센터
});

/* ================= pipeline.ts (진행 안내 §3) ================= */
test('pipelineSteps — 전제에 따른 단계 상태', () => {
  // 변수 없음: 토큰=ready, 시맨틱/바인딩=blocked(+안내)
  const empty = pipelineSteps({ hasGlobal: false, hasBindable: false });
  assert.deepEqual(empty.map((s) => [s.id, s.status]), [
    ['tokens', 'ready'], ['semantics', 'blocked'], ['bind', 'blocked'],
  ]);
  assert.ok(empty[1].hint && empty[2].hint); // blocked엔 안내

  // Global만: 토큰=done, 시맨틱=ready, 바인딩=blocked
  const g = pipelineSteps({ hasGlobal: true, hasBindable: false });
  assert.deepEqual(g.map((s) => s.status), ['done', 'ready', 'blocked']);

  // 둘 다: 토큰=done, 시맨틱/바인딩=ready(안내 없음)
  const both = pipelineSteps({ hasGlobal: true, hasBindable: true });
  assert.deepEqual(both.map((s) => s.status), ['done', 'ready', 'ready']);
  assert.equal(both[1].hint, undefined);
  assert.equal(both[2].hint, undefined);
});

/* ================= i18n.ts (런타임 문자열 외부화) ================= */
test('t — 키 조회·보간·폴백', () => {
  assert.equal(t('rename.none'), '변경할 이름이 없습니다.');
  assert.equal(t('rename.applied', { count: 3 }), '3개 이름 적용 완료.');
  assert.equal(t('preset.applied', { name: 'A' }), '‘A’ 적용됨 — 아래 단계에서 실행하세요.');
  // 누락 변수는 자리표시자 유지
  assert.equal(t('rename.applied', {}), '{count}개 이름 적용 완료.');
  // 누락 키는 key 그대로 폴백
  assert.equal(t('no.such.key'), 'no.such.key');
  assert.equal(t('no.such.key', { a: 1 }), 'no.such.key');
});

/* ================= textStyles.ts (Phase C) ================= */
test('clusterTextStyles — 동일 시그니처 dedupe + 빈도', () => {
  const samples = [
    { fontSize: 16, lineHeight: 24, letterSpacing: 0, family: 'Inter', style: 'Regular', layerName: 'a' },
    { fontSize: 16, lineHeight: 24, letterSpacing: 0, family: 'Inter', style: 'Regular', layerName: 'b' },
    { fontSize: 32, lineHeight: 40, letterSpacing: 0, family: 'Inter', style: 'Bold', layerName: 'h' },
  ];
  const cl = clusterTextStyles(samples);
  assert.equal(cl.length, 2);
  const body = cl.find((c) => c.fontSize === 16);
  assert.equal(body.count, 2);
  // 굵기만 달라도 별개 군집
  const samples2 = [
    { fontSize: 16, lineHeight: 24, letterSpacing: 0, family: 'Inter', style: 'Regular', layerName: 'a' },
    { fontSize: 16, lineHeight: 24, letterSpacing: 0, family: 'Inter', style: 'Bold', layerName: 'b' },
  ];
  assert.equal(clusterTextStyles(samples2).length, 2);
});

test('nameTextStyles — 크기 내림차순 램프 명명 + 초과분 text-N', () => {
  const clusters = [
    { fontSize: 16, lineHeight: 24, letterSpacing: 0, family: 'Inter', style: 'Regular', count: 5, sample: 'b' },
    { fontSize: 48, lineHeight: 56, letterSpacing: 0, family: 'Inter', style: 'Bold', count: 1, sample: 'd' },
    { fontSize: 32, lineHeight: 40, letterSpacing: 0, family: 'Inter', style: 'Bold', count: 1, sample: 'h' },
  ];
  const specs = nameTextStyles(clusters);
  assert.deepEqual(specs.map((s) => [s.name, s.fontSize]), [
    ['display', 48],
    ['h1', 32],
    ['h2', 16],
  ]);
  // 램프 길이 초과 → text-N
  const many = Array.from({ length: 9 }, (_, i) => ({
    fontSize: 100 - i,
    lineHeight: 120,
    letterSpacing: 0,
    family: 'Inter',
    style: 'Regular',
    count: 1,
    sample: '',
  }));
  const names = nameTextStyles(many).map((s) => s.name);
  assert.equal(names[RAMP_NAMES.length], 'text-9');
});

test('nameTextStyles — 같은 크기 다중 스타일은 base/weight로 분기(병합 금지)', () => {
  // 크기 2종(32,16) → 32=display, 16=h1. 16px에 Regular/Bold 둘 → h1/regular, h1/bold
  const byWeight = nameTextStyles([
    { fontSize: 16, lineHeight: 24, letterSpacing: 0, family: 'Inter', style: 'Regular', count: 5, sample: '' },
    { fontSize: 16, lineHeight: 24, letterSpacing: 0, family: 'Inter', style: 'Bold', count: 2, sample: '' },
    { fontSize: 32, lineHeight: 40, letterSpacing: 0, family: 'Inter', style: 'Bold', count: 1, sample: '' },
  ]).map((s) => s.name);
  assert.equal(new Set(byWeight).size, byWeight.length); // 전부 유일
  assert.ok(byWeight.includes('display')); // 32px 단독
  assert.ok(byWeight.includes('h1/regular') && byWeight.includes('h1/bold'));

  // 같은 16px·같은 굵기, 패밀리만 다름 → base/family-weight (크기 1종 → base=display)
  const byFamily = nameTextStyles([
    { fontSize: 16, lineHeight: 24, letterSpacing: 0, family: 'Inter', style: 'Bold', count: 2, sample: '' },
    { fontSize: 16, lineHeight: 24, letterSpacing: 0, family: 'Roboto', style: 'Bold', count: 1, sample: '' },
  ]).map((s) => s.name);
  assert.ok(byFamily.includes('display/inter-bold') && byFamily.includes('display/roboto-bold'));

  // 같은 크기·굵기·패밀리, 행간만 다름(별도 군집) → 유일성 보강으로 둘 다 보존
  const byLh = nameTextStyles([
    { fontSize: 16, lineHeight: 24, letterSpacing: 0, family: 'Inter', style: 'Regular', count: 1, sample: '' },
    { fontSize: 16, lineHeight: 28, letterSpacing: 0, family: 'Inter', style: 'Regular', count: 1, sample: '' },
  ]).map((s) => s.name);
  assert.equal(new Set(byLh).size, 2);
});

test('clusterTextStyles — 바인딩된 styleId를 군집별로 수집(중복 제거)', () => {
  const samples = [
    { fontSize: 32, lineHeight: 40, letterSpacing: 0, family: 'Inter', style: 'Bold', layerName: 'h', styleId: 'S:1' },
    { fontSize: 32, lineHeight: 40, letterSpacing: 0, family: 'Inter', style: 'Bold', layerName: 'h2', styleId: 'S:1' },
    { fontSize: 16, lineHeight: 24, letterSpacing: 0, family: 'Inter', style: 'Regular', layerName: 'b', styleId: '' },
  ];
  const cl = clusterTextStyles(samples);
  assert.deepEqual(cl.find((c) => c.fontSize === 32).styleIds, ['S:1']); // 같은 스타일 → 1개로
  assert.deepEqual(cl.find((c) => c.fontSize === 16).styleIds, []); // 미바인딩(빈 id) → 없음
});

test('nameTextStyles — 이미 바인딩된 군집은 기존 이름 유지 + boundStyleId(재스캔 rename)', () => {
  const clusters = clusterTextStyles([
    { fontSize: 32, lineHeight: 40, letterSpacing: 0, family: 'Inter', style: 'Bold', layerName: 'h', styleId: 'S:1' },
    { fontSize: 16, lineHeight: 24, letterSpacing: 0, family: 'Inter', style: 'Regular', layerName: 'b', styleId: '' },
  ]);
  const existing = [{ id: 'S:1', name: '제목-강조', fontSize: 32, lineHeight: 40, letterSpacing: 0, family: 'Inter', style: 'Bold' }];
  const specs = nameTextStyles(clusters, existing);
  const s32 = specs.find((s) => s.fontSize === 32);
  const s16 = specs.find((s) => s.fontSize === 16);
  assert.equal(s32.name, '제목-강조'); // 자동 이름(display) 대신 기존 이름 유지
  assert.equal(s32.boundStyleId, 'S:1'); // rename 앵커 부여
  assert.equal(s16.boundStyleId, undefined); // 미바인딩·미존재는 앵커 없음
  assert.ok(s16.name.length > 0); // 미바인딩은 자동 이름

  // existing 미전달(기존 호출부) → 종전과 동일: 전부 자동 이름·앵커 없음
  assert.ok(nameTextStyles(clusters).every((s) => s.boundStyleId === undefined));
});

test('nameTextStyles — 바인딩 안 됐어도 시그니처가 같은 기존 스타일이 있으면 앵커(타프레임 중복 방지)', () => {
  // 다른 프레임의 생 텍스트: styleId 없음(''). 하지만 시그니처가 기존 'body'와 동일 → 그 스타일로 인식.
  const clusters = clusterTextStyles([
    { fontSize: 16, lineHeight: 24, letterSpacing: 0, family: 'Inter', style: 'Regular', layerName: 'p', styleId: '' },
  ]);
  const existing = [{ id: 'S:body', name: 'body', fontSize: 16, lineHeight: 24, letterSpacing: 0, family: 'Inter', style: 'Regular' }];
  const specs = nameTextStyles(clusters, existing);
  assert.equal(specs[0].name, 'body'); // 자동 이름 아니라 기존 이름
  assert.equal(specs[0].boundStyleId, 'S:body'); // 시그니처 매칭으로 앵커 → 등록 시 중복 생성 X
});

test('nameTextStyles — 같은 시그니처 기존 스타일이 2개면 모호 → 시그니처 앵커 안 함', () => {
  const clusters = clusterTextStyles([
    { fontSize: 16, lineHeight: 24, letterSpacing: 0, family: 'Inter', style: 'Regular', layerName: 'p', styleId: '' },
  ]);
  const existing = [
    { id: 'S:a', name: 'body', fontSize: 16, lineHeight: 24, letterSpacing: 0, family: 'Inter', style: 'Regular' },
    { id: 'S:b', name: 'label', fontSize: 16, lineHeight: 24, letterSpacing: 0, family: 'Inter', style: 'Regular' },
  ];
  assert.equal(nameTextStyles(clusters, existing)[0].boundStyleId, undefined); // 모호 → 앵커 보류, 자동 이름
});

test('nameTextStyles — 한 군집이 여러 스타일에 걸치면 모호 → 앵커 안 함', () => {
  const clusters = clusterTextStyles([
    { fontSize: 20, lineHeight: 28, letterSpacing: 0, family: 'Inter', style: 'Regular', layerName: 'a', styleId: 'S:1' },
    { fontSize: 20, lineHeight: 28, letterSpacing: 0, family: 'Inter', style: 'Regular', layerName: 'b', styleId: 'S:2' },
  ]);
  assert.equal(clusters.length, 1);
  assert.equal(clusters[0].styleIds.length, 2);
  // 노드 바인딩이 2개라 모호하고, 시그니처도 두 스타일이 같아 모호 → 앵커 안 함.
  const existing = [
    { id: 'S:1', name: 'x', fontSize: 20, lineHeight: 28, letterSpacing: 0, family: 'Inter', style: 'Regular' },
    { id: 'S:2', name: 'y', fontSize: 20, lineHeight: 28, letterSpacing: 0, family: 'Inter', style: 'Regular' },
  ];
  assert.equal(nameTextStyles(clusters, existing)[0].boundStyleId, undefined);
});

test('nameTextStyles — styleId 바인딩이어도 시그니처 불일치(오버라이드)면 앵커 안 함', () => {
  // 스타일 body(16/24)가 붙어 있지만 노드가 fontSize 18로 오버라이드 → 시그니처 어긋남.
  const clusters = clusterTextStyles([
    { fontSize: 18, lineHeight: 24, letterSpacing: 0, family: 'Inter', style: 'Regular', layerName: 'p', styleId: 'S:body' },
  ]);
  const existing = [
    { id: 'S:body', name: 'body', fontSize: 16, lineHeight: 24, letterSpacing: 0, family: 'Inter', style: 'Regular' },
  ];
  const specs = nameTextStyles(clusters, existing);
  assert.equal(specs[0].boundStyleId, undefined); // 오버라이드 → rename 앵커 보류
  assert.notEqual(specs[0].name, 'body'); // 자동 이름(크기 램프)
});

test('fontStyleForWeight — 굵기/italic → Figma style', () => {
  assert.equal(fontStyleForWeight(400), 'Regular');
  assert.equal(fontStyleForWeight(700), 'Bold');
  assert.equal(fontStyleForWeight(600), 'SemiBold');
  assert.equal(fontStyleForWeight(400, true), 'Italic');
  assert.equal(fontStyleForWeight(700, true), 'Bold Italic');
  assert.equal(fontStyleForWeight(123), 'Regular'); // 미지정 → Regular
});

test('rampToSpecs — 기본 램프에 패밀리 주입', () => {
  const specs = rampToSpecs('Pretendard');
  assert.ok(specs.length >= 6);
  assert.ok(specs.every((s) => s.family === 'Pretendard'));
  assert.ok(specs.some((s) => s.name === 'body' && s.fontSize === 16));
});

/* ---------- 변수 편집기(R1)·다크 테마 생성(R2) 순수 헬퍼 ---------- */

test('parseVarValue — 타입별 파싱/검증', () => {
  // COLOR
  assert.deepEqual(parseVarValue('COLOR', '#ffffff'), { ok: true, value: { r: 1, g: 1, b: 1 } });
  assert.deepEqual(parseVarValue('COLOR', '000000'), { ok: true, value: { r: 0, g: 0, b: 0 } });
  assert.equal(parseVarValue('COLOR', 'nope').ok, false);
  assert.equal(parseVarValue('COLOR', '#fff').ok, false); // 3자리 거부
  // FLOAT
  assert.deepEqual(parseVarValue('FLOAT', '16'), { ok: true, value: 16 });
  assert.deepEqual(parseVarValue('FLOAT', '-1.5'), { ok: true, value: -1.5 });
  assert.equal(parseVarValue('FLOAT', '').ok, false);
  assert.equal(parseVarValue('FLOAT', 'abc').ok, false);
  // STRING
  assert.deepEqual(parseVarValue('STRING', 'Inter'), { ok: true, value: 'Inter' });
  assert.deepEqual(parseVarValue('STRING', '  Inter  '), { ok: true, value: 'Inter' }); // 앞뒤 공백 트림
  assert.equal(parseVarValue('STRING', '   ').ok, false);
  // BOOLEAN
  assert.deepEqual(parseVarValue('BOOLEAN', 'true'), { ok: true, value: true });
  assert.deepEqual(parseVarValue('BOOLEAN', 'FALSE'), { ok: true, value: false });
  assert.equal(parseVarValue('BOOLEAN', 'yes').ok, false);
});

test('displayVarValue — 색은 hex, 그 외 문자열', () => {
  assert.equal(displayVarValue('COLOR', { r: 1, g: 1, b: 1 }), '#ffffff');
  assert.equal(displayVarValue('FLOAT', 16), '16');
  assert.equal(displayVarValue('STRING', 'Inter'), 'Inter');
});

test('validateVarName — 빈 이름·중복 거부', () => {
  assert.equal(validateVarName('surface', ['bg', 'text']), null);
  assert.match(validateVarName('', []), /이름/);
  assert.match(validateVarName('  ', []), /이름/);
  assert.match(validateVarName('bg', ['bg', 'text']), /중복|이름/);
});

test('sanitizeScopes — 타입 무효 스코프 제거 + 중복 제거', () => {
  // COLOR에 FLOAT 전용 스코프(GAP)는 제거, 중복은 1개로
  const out = sanitizeScopes(['ALL_FILLS', 'GAP', 'ALL_FILLS', 'STROKE_COLOR'], 'COLOR');
  assert.deepEqual(out.sort(), ['ALL_FILLS', 'STROKE_COLOR']);
});

test('scopesForTypeList — 타입별 유효 스코프 노출', () => {
  const color = scopesForTypeList('COLOR');
  assert.ok(color.includes('ALL_FILLS'));
  assert.ok(!color.includes('GAP')); // FLOAT 전용
  const float = scopesForTypeList('FLOAT');
  assert.ok(float.includes('GAP'));
  assert.ok(!float.includes('TEXT_FILL'));
});

test('aliasSelfReference — 자기참조만 차단', () => {
  assert.equal(aliasSelfReference('a', 'a'), true);
  assert.equal(aliasSelfReference('a', 'b'), false);
});

test('findAliasReferers — varId를 별칭하는 변수 수집(자기 제외, R2-C)', () => {
  const vars = [
    { id: 'g1', name: 'color/blue/500', values: { m: { kind: 'literal' } } },
    { id: 's1', name: 'primary', values: { m: { kind: 'alias', aliasId: 'g1' } } },
    { id: 's2', name: 'surface', values: { light: { kind: 'alias', aliasId: 'g1' }, dark: { kind: 'literal' } } },
    { id: 's3', name: 'text', values: { m: { kind: 'alias', aliasId: 'other' } } },
  ];
  const refs = findAliasReferers('g1', vars);
  assert.deepEqual(refs.map((r) => r.name).sort(), ['primary', 'surface']);
  // 어느 모드든 한 번이라도 별칭하면 1회만(중복 없음)
  assert.equal(refs.length, 2);
  assert.deepEqual(findAliasReferers('none', vars), []);
});

test('darkValueForLight — OKLCH 명도 반전(밝음↔어두움)', () => {
  // 흰색 → 어두운 색(L 낮아짐), 검정 → 밝은 색(L 높아짐)
  const fromWhite = hexToOklch(darkValueForLight('#ffffff'));
  const fromBlack = hexToOklch(darkValueForLight('#000000'));
  assert.ok(fromWhite.l < 0.5, `흰색 반전 L=${fromWhite.l}`);
  assert.ok(fromBlack.l > 0.5, `검정 반전 L=${fromBlack.l}`);
  // 유효 hex 반환
  assert.match(darkValueForLight('#2563eb'), /^#[0-9a-f]{6}$/);
  // hue 보존(유채색) — 파랑 계열 유지
  const lightH = hexToOklch('#2563eb').h;
  const darkH = hexToOklch(darkValueForLight('#2563eb')).h;
  assert.ok(Math.abs(lightH - darkH) < 15, `hue 보존 ${lightH}→${darkH}`);
});

test('darkValueForLight — 밝은 표면 위계가 검정으로 붕괴하지 않는다', () => {
  // 단순 1-L이면 L>0.94 구간이 sRGB에서 전부 #000000이 되어 surface/surface-2가 한 색이 된다.
  // 대역 압축 후에는 회색 램프 전체가 서로 다른 색으로 남아야 한다.
  const ramp = ['#ffffff', '#f8f9fa', '#e9ecef', '#dee2e6', '#ced4da', '#adb5bd', '#6c757d', '#495057', '#343a40', '#212529', '#000000'];
  const darks = ramp.map(darkValueForLight);
  assert.equal(new Set(darks).size, ramp.length, `붕괴: ${darks.join(' ')}`);
  assert.ok(!darks.includes('#000000'), `순수 검정 표면 생성: ${darks.join(' ')}`);
  // 라이트가 어두워질수록 다크는 밝아진다(반전) — 순서 뒤집힘 없이 단조.
  const ls = darks.map((h) => hexToOklch(h).l);
  for (let i = 1; i < ls.length; i++) {
    assert.ok(ls[i] > ls[i - 1], `단조 위반 ${ramp[i - 1]}→${ramp[i]}: ${ls[i - 1]} → ${ls[i]}`);
  }
  // 결과 L은 다크 대역 안(게멋 클램프는 c만 줄이므로 L은 그대로).
  // 여유 0.005는 hex 8비트 양자화 왕복 오차(예: L 0.97 → #f5f5f5 → 0.97015) 몫.
  const eps = 0.005;
  for (const l of ls) assert.ok(l >= DARK_L_MIN - eps && l <= DARK_L_MAX + eps, `대역 이탈 L=${l}`);
});

test('darkGlobalName — dark/ 그룹 접두 · 멱등', () => {
  assert.equal(darkGlobalName('color/blue/500'), 'dark/color/blue/500');
  // 다크 모드를 출처로 재실행해도 dark/dark/…가 생기지 않는다.
  assert.equal(darkGlobalName('dark/color/blue/500'), 'dark/color/blue/500');
  assert.equal(darkGlobalName(darkGlobalName('color/blue/500')), 'dark/color/blue/500');
  assert.equal(isDarkGlobalName('dark/color/blue/500'), true);
  assert.equal(isDarkGlobalName('color/blue/500'), false);
});
