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
  structuralSignature,
  groupByStructure,
  groupByComponentName,
  groupByExactName,
  fullSignature,
  membersIdentical,
  recognizeComponentName,
  extractNameProps,
  distinguishingTokens,
  deriveVariants,
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
  // maxDepth: 앞쪽 맥락을 자르고 로컬 역할 보존
  assert.equal(layerNameFromToken('a/b/c/d/e', { maxDepth: 3 }), 'c-d-e');
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

test('scanComponentCandidates(#1) — 영향(FRAME/GROUP)+조상만, 잠금/인스턴스/텍스트 제외', () => {
  // page(FRAME) > card(FRAME, 잠금) ... 실제로는: root(FRAME) > [text, btn(FRAME), inst(INSTANCE), grp(GROUP, 잠금)]
  const text = { id: 't', name: 'Label', type: 'TEXT' };
  const icon = { id: 'i', name: 'Vector', type: 'VECTOR' };
  const btn = { id: 'b', name: 'btn', type: 'FRAME', children: [icon] }; // eligible
  const inst = { id: 'in', name: 'Inst', type: 'INSTANCE' }; // 제외
  const lockedGrp = { id: 'g', name: 'grp', type: 'GROUP', locked: true }; // 잠금 → 제외
  const root = { id: 'r', name: 'root', type: 'FRAME', children: [text, btn, inst, lockedGrp] }; // eligible

  const out = scanComponentCandidates([root]);
  const byId = new Map(out.map((c) => [c.id, c]));

  // 유지: root(컨테이너 맥락) + btn(eligible). icon은 비-eligible 말단이지만 btn의 자식이라 잡음 → 제외.
  assert.deepEqual(out.map((c) => c.id).sort(), ['b', 'r']);
  // 단일 선택의 최상위(컨테이너)는 등록 대상 제외 → eligible=false(회색 맥락).
  assert.equal(byId.get('r').eligible, false);
  assert.equal(byId.get('b').eligible, true);
  // 계층 보존
  assert.equal(byId.get('r').parentId, null);
  assert.equal(byId.get('r').depth, 0);
  assert.equal(byId.get('b').parentId, 'r');
  assert.equal(byId.get('b').depth, 1);
});

test('scanComponentCandidates(#1) — 깊은 eligible의 조상 체인은 맥락으로 보존', () => {
  // 엄격 필터: 깊은 노드도 인식된 컴포넌트명('card')이라야 eligible.
  const deep = { id: 'd', name: 'card', type: 'FRAME' }; // eligible(깊음·컴포넌트명)
  const mid = { id: 'm', name: 'mid', type: 'GROUP', locked: true, children: [deep] }; // 잠금(비-eligible)이지만 조상
  const top = { id: 'top', name: 'top', type: 'TEXT', children: [mid] }; // 텍스트(비-eligible)이지만 조상

  const out = scanComponentCandidates([top]);
  // deep이 eligible이라 그 조상(top, mid)도 맥락으로 유지
  assert.deepEqual(out.map((c) => c.id), ['top', 'm', 'd']);
  assert.equal(out.find((c) => c.id === 'd').eligible, true);
  assert.equal(out.find((c) => c.id === 'm').eligible, false);
  assert.equal(out.find((c) => c.id === 'top').eligible, false);
});

test('scanComponentCandidates(#1) — 게이트 없음: 모든 FRAME/GROUP이 eligible(임의 이름 포함)', () => {
  const btn = { id: 'b', name: 'btn', type: 'FRAME' };
  const blob = { id: 'x', name: 'Frame 12', type: 'FRAME' }; // 임의 이름도 이제 eligible
  const wrap = { id: 'w', name: 'row-container', type: 'FRAME' }; // 명사 사전에 없어도 eligible
  const txt = { id: 't', name: 'Label', type: 'TEXT' }; // 텍스트는 비-eligible(프레임/그룹 아님)
  const root = { id: 'r', name: 'root', type: 'FRAME', children: [btn, blob, wrap, txt] };

  const out = scanComponentCandidates([root]);
  const byId = new Map(out.map((c) => [c.id, c]));
  assert.equal(byId.get('b').eligible, true);
  assert.equal(byId.get('x').eligible, true); // 임의 이름 프레임도 선택 가능
  assert.equal(byId.get('w').eligible, true); // container/wrapper류도 후보
  assert.equal(byId.has('t'), false); // 텍스트는 후보 아님(비-eligible + 비-조상 → 제외)
});

test('scanComponentCandidates(#1) — 단일 선택 컨테이너 제외 vs 다중 선택 루트 포함', () => {
  const childA = { id: 'a', name: 'btn', type: 'FRAME' };
  const childB = { id: 'b', name: 'btn', type: 'FRAME' };
  const container = { id: 'box', name: 'box', type: 'FRAME', children: [childA, childB] };

  // 단일 선택: 컨테이너(box)는 등록 대상 아님 → eligible=false, 자식만 eligible.
  const single = scanComponentCandidates([container]);
  const sById = new Map(single.map((c) => [c.id, c]));
  assert.equal(sById.get('box').eligible, false);
  assert.equal(sById.get('a').eligible, true);
  assert.equal(sById.get('b').eligible, true);

  // 다중 선택: 선택 각각이 등록 단위 → 최상위도 eligible.
  const multi = scanComponentCandidates([childA, childB]);
  assert.equal(multi.find((c) => c.id === 'a').eligible, true);
  assert.equal(multi.find((c) => c.id === 'b').eligible, true);
});

test('structuralSignature — 골격(자식 타입트리+방향)만 비교, 변형값(크기·색·이름·여백)은 무시', () => {
  const mk = (over = {}) => ({
    id: 'x', name: 'btn-' + (over.width ?? 100), type: 'FRAME', width: over.width ?? 100, height: 40,
    paddingTop: 8, paddingRight: 12, paddingBottom: 8, paddingLeft: 12, itemSpacing: 4, layoutMode: 'HORIZONTAL',
    fillHex: over.fillHex ?? '#2d7ff9',
    children: [{ id: 'c', name: over.childName ?? 'Label', type: over.childType ?? 'TEXT' }],
    ...over,
  });
  const base = structuralSignature(mk());
  // 크기·색·루트이름이 달라도 같은 시그니처(변형으로 흡수)
  assert.equal(base, structuralSignature(mk({ width: 200, fillHex: '#ff0000' })));
  // 자식 레이어 이름이 달라도 같은 시그니처(이름은 변형마다 제각각 → 무시)
  assert.equal(base, structuralSignature(mk({ childName: 'Icon' })));
  // 패딩·간격이 달라도 같은 시그니처(size 변형이 흔히 다른 곳 → 무시) ← 핵심 수정
  assert.equal(base, structuralSignature(mk({ paddingTop: 99, itemSpacing: 24 })));
  // 자식 타입이 다르면 다른 시그니처(골격 차이)
  assert.notEqual(base, structuralSignature(mk({ childType: 'VECTOR' })));
  // 레이아웃 방향이 다르면 다른 시그니처
  assert.notEqual(base, structuralSignature(mk({ layoutMode: 'VERTICAL' })));
});

test('groupByStructure — 구조 같은 자식끼리 묶기(순서 보존)', () => {
  const btn = (id, w) => ({ id, name: 'btn', type: 'FRAME', width: w, height: 40, paddingTop: 8, paddingLeft: 8, layoutMode: 'HORIZONTAL', fillHex: '#111111', children: [{ id: id + '-t', name: 'Label', type: 'TEXT' }] });
  const card = (id) => ({ id, name: 'card', type: 'FRAME', width: 200, height: 120, paddingTop: 16, layoutMode: 'VERTICAL', fillHex: '#ffffff', children: [{ id: id + '-t', name: 'Title', type: 'TEXT' }] });
  const groups = groupByStructure([btn('a', 100), card('b'), btn('c', 200)]);
  assert.equal(groups.length, 2);
  assert.deepEqual(groups[0].members.map((m) => m.id), ['a', 'c']);
  assert.deepEqual(groups[1].members.map((m) => m.id), ['b']);
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

test('groupByComponentName — 컴포넌트명 기준: 내부 구조 달라도 같은 이름이면 한 세트 + 미인식 제외', () => {
  // 같은 'Button'이지만 자식 구조가 제각각(아이콘 유무·줄 수). 구조는 게이트가 아니므로 한 세트로.
  const plain = (id, name) => ({ id, name, type: 'FRAME', layoutMode: 'HORIZONTAL', children: [{ id: id + '-t', name: 'label', type: 'TEXT' }] });
  const withIcon = (id, name) => ({ id, name, type: 'FRAME', layoutMode: 'HORIZONTAL', children: [{ id: id + '-i', name: 'icon', type: 'FRAME', children: [] }, { id: id + '-t', name: 'label', type: 'TEXT' }] });
  const twoLine = (id, name) => ({ id, name, type: 'FRAME', layoutMode: 'VERTICAL', children: [{ id: id + '-t', name: 'label', type: 'TEXT' }, { id: id + '-s', name: 'sub', type: 'TEXT' }] });
  const card = (id, name) => ({ id, name, type: 'FRAME', layoutMode: 'VERTICAL', children: [{ id: id + '-t', name: 'title', type: 'TEXT' }] });
  const blob = { id: 'x', name: 'Frame 9', type: 'FRAME', layoutMode: 'NONE', children: [] }; // 미인식 → 제외
  const groups = groupByComponentName([plain('a', 'primary-button'), withIcon('b', 'icon-button'), twoLine('c', 'stacked-button'), card('d', 'card-item'), blob]);
  // Button 3개(구조 달라도) 한 세트, Item(card-item) 별도, Frame 9 제외.
  assert.equal(groups.length, 2);
  assert.equal(groups[0].key, 'Button');
  assert.deepEqual(groups[0].members.map((m) => m.id), ['a', 'b', 'c']);
  assert.equal(groups[1].key, 'Item');
  assert.deepEqual(groups[1].members.map((m) => m.id), ['d']);
});

test('groupByComponentName — 자식 레이어명만 다른 변형도 한 세트(회귀: 과거엔 쪼개짐)', () => {
  // 같은 골격(FRAME>TEXT)·같은 컴포넌트명(Button)이지만 자식 이름이 label/text로 다른 변형.
  const btn = (id, name, childName) => ({ id, name, type: 'FRAME', width: 100, height: 40, paddingTop: 8, layoutMode: 'HORIZONTAL', fillHex: '#111', children: [{ id: id + '-c', name: childName, type: 'TEXT' }] });
  const groups = groupByComponentName([btn('a', 'primary-button', 'label'), btn('b', 'secondary-button', 'text')]);
  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0].members.map((m) => m.id), ['a', 'b']);
});

test('groupByComponentName — size 변형(패딩만 다름)도 한 세트(회귀: 과거엔 쪼개짐)', () => {
  // 같은 골격·같은 이름(Button), size 변형이라 패딩만 다름 → 반드시 한 세트로.
  const btn = (id, name, pad) => ({ id, name, type: 'FRAME', width: 100, height: 40, paddingTop: pad, paddingBottom: pad, paddingLeft: pad * 2, paddingRight: pad * 2, layoutMode: 'HORIZONTAL', fillHex: '#111', children: [{ id: id + '-c', name: 'label', type: 'TEXT' }] });
  const groups = groupByComponentName([btn('a', 'button-small', 6), btn('b', 'button-medium', 10), btn('c', 'button-large', 14)]);
  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0].members.map((m) => m.id), ['a', 'b', 'c']);
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

test('groupByComponentName — 마지막 명사로 묶음(접두어 달라도 같은 세트)', () => {
  const mk = (id, name) => ({ id, name, type: 'FRAME', width: 100, height: 40, paddingTop: 8, layoutMode: 'HORIZONTAL', fillHex: '#111', children: [{ id: id + '-c', name: 'Label', type: 'TEXT' }] });
  // nav-button·button-primary·primary-button → 모두 끝 명사 button + 같은 구조 → 한 세트.
  const groups = groupByComponentName([mk('a', 'nav-button'), mk('b', 'button-primary'), mk('c', 'primary-button')]);
  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0].members.map((m) => m.id), ['a', 'b', 'c']);
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

test('fullSignature/membersIdentical — 구조+크기+색 완전 동일 판정', () => {
  const mk = (over = {}) => ({
    id: 'x', name: 'card', type: 'FRAME', width: over.width ?? 300, height: 200,
    layoutMode: 'VERTICAL', fillHex: over.fillHex ?? '#fff',
    children: [{ id: 'c', name: 'Title', type: 'TEXT', width: 100, height: 20 }],
  });
  assert.equal(membersIdentical([mk(), mk()]), true); // 완전 동일
  assert.notEqual(fullSignature(mk()), fullSignature(mk({ width: 400 }))); // 크기 다르면 다른 시그니처
  assert.equal(membersIdentical([mk(), mk({ width: 400 })]), false); // 크기 차이 → 비동일
  assert.equal(membersIdentical([mk(), mk({ fillHex: '#000' })]), false); // 색 차이 → 비동일
  assert.equal(membersIdentical([mk()]), false); // 1개는 비동일(중복 제거 대상 아님)
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
    { name: 'label', type: 'TEXT' },
    { name: 'icon', type: 'INSTANCE' },
    { name: 'badge?', type: 'FRAME' }, // 가시성 토글
    { name: 'label', type: 'TEXT' }, // 이름 충돌 → -2
  ]);
  assert.deepEqual(plan, [
    { propName: 'Label', type: 'TEXT', layerName: 'label', field: 'characters' },
    { propName: 'Icon', type: 'INSTANCE_SWAP', layerName: 'icon', field: 'mainComponent' },
    { propName: 'Badge', type: 'BOOLEAN', layerName: 'badge?', field: 'visible' },
    { propName: 'Label-2', type: 'TEXT', layerName: 'label', field: 'characters' },
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
