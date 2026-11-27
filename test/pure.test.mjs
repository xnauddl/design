/* 순수 로직 단위 테스트 — `npm test`가 build 후 dist/pure.mjs를 불러온다.
   figma 의존 코드는 대상이 아니다(값/로직만). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  fieldKind,
  cardCounts,
  linkPlacesForMake,
  placeGroupKey,
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
  tidyNumberTokens,
  scaleLadder,
  kebab,
  pascalCase,
  capitalize,
  layerNameFromToken,
  layerNameFromRole,
  isDefaultName,
  isTokenEchoName,
  parseTokenName,
  pickScope,
  isKnownRole,
  EMITTED_ROLES,
  RECOGNIZED_ROLES,
  ROLE_VOCAB,
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
  semanticMapToText,
  textToSemanticMap,
  exportTokens,
  exportHasTokens,
  resolveExportTokens,
  exportClashes,
  exportClashNotice,
  exportGlobalDupes,
  exportDupNotice,
  exportStatusTail,
  resolveExportModes,
  exportModeKey,
  splitWeightStyle,
  nameKeyFor,
  clusterTextStyles,
  nameTextStyles,
  nameTextStylesWithRowLabels,
  pairHorizontalRowLabel,
  isRowLabelNameLike,
  fontStyleForWeight,
  rampToSpecs,
  DEFAULT_TYPE_RAMP,
  weightOf,
  krdsCategory,
  krdsStep,
  KRDS_STEPS,
  nameKrdsStyles,
  commitUndo,
  explainError,
  nextTabIndex,
  // roles (전 토큰 역할 어휘)
  tshirtRoles,
  radiusRoles,
  spacingRoles,
  strokeRoles,
  fontSizeRoles,
  weightRole,
  familyRole,
  suggestTokenRoles,
  mergeTokenRoles,
  t,
  scopesForTypeList,
  hexToOklch,
  darkStepFor,
  lightStepOf,
  scaleStepColor,
  stepRefL,
  classifyColor,

  isIntegerSize,
  splitDecimalClusters,
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

test('parseTokenName — Object.prototype 키가 역할로 새지 않음(리네임 크래시 방지)', () => {
  // 토큰 세그먼트는 디자이너가 정한다. 역할 맵이 객체 리터럴이면 'constructor'가
  // 함수로 해석돼 kebab(role)에서 TypeError가 나고 리네임 실행 전체가 죽는다.
  for (const key of ['constructor', 'toString', 'hasOwnProperty', 'valueOf']) {
    assert.equal(parseTokenName(`brand/${key}`).roleLeaf, null, `'${key}'가 역할로 해석됨`);
  }
});

test('역할 어휘 — 출력용/인식용 분리, 겹치지 않고 합집합이 ROLE_VOCAB', () => {
  const emitted = new Set(EMITTED_ROLES);
  const recognized = new Set(RECOGNIZED_ROLES);
  assert.equal(emitted.size, EMITTED_ROLES.length); // 중복 없음
  assert.equal(recognized.size, RECOGNIZED_ROLES.length);
  for (const r of RECOGNIZED_ROLES) assert.equal(emitted.has(r), false, `'${r}'이 양쪽에 있다`);
  assert.deepEqual([...ROLE_VOCAB], [...EMITTED_ROLES, ...RECOGNIZED_ROLES]);
  for (const r of ROLE_VOCAB) assert.ok(isKnownRole(r), `'${r}'을 isKnownRole이 모른다`);
});

test('역할 어휘 — 검출기가 내는 이름은 출력용에 있다(어휘 어긋남 회귀 방지)', () => {
  // resolveRole()이 폴백으로 내는 이름들 — 어휘에서 빠지면 맥락 인식이 조용히 깨진다.
  for (const r of ['shape', 'container', 'wrapper', 'input', 'thumbnail', 'overlay', 'modal', 'progress', 'indicator', 'status']) {
    assert.ok(EMITTED_ROLES.includes(r), `'${r}'이 EMITTED_ROLES에 없다`);
  }
  // aside가 출력 캐논, sidebar는 인식 전용 별칭(둘 다 맥락으로는 인식).
  assert.ok(EMITTED_ROLES.includes('aside'));
  assert.ok(RECOGNIZED_ROLES.includes('sidebar'));
  assert.equal(pickScope('sidebar'), 'sidebar');
  // 시트·드로어류는 출력하지 않고 인식만 — 페이지 랜드마크 오검출 방지.
  for (const r of ['sheet', 'drawer', 'dialog', 'popup']) {
    assert.ok(RECOGNIZED_ROLES.includes(r), `'${r}'이 RECOGNIZED_ROLES에 없다`);
    assert.equal(pickScope(r), r);
  }
});

test('parseTokenName — 새 leaf 역할 매핑(thumbnail/indicator/overlay…)', () => {
  assert.equal(parseTokenName('card/thumb').roleLeaf, 'thumbnail');
  assert.equal(parseTokenName('card/thumbnail').roleLeaf, 'thumbnail');
  assert.equal(parseTokenName('track/indicator').roleLeaf, 'indicator');
  assert.equal(parseTokenName('ui/progress').roleLeaf, 'progress');
  assert.equal(parseTokenName('avatar/status').roleLeaf, 'status');
  assert.equal(parseTokenName('modal/scrim').roleLeaf, 'overlay');
  assert.equal(parseTokenName('field/input').roleLeaf, 'input');
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
  assert.equal(hasEntitlement('free', 'textStyles'), false);
  assert.equal(hasEntitlement('paid', 'tokens'), true);
  assert.equal(hasEntitlement('paid', 'semantics'), true);
  assert.equal(hasEntitlement('paid', 'textStyles'), true);
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
  // 서버가 붙인 code도 함께 넘긴다(화면 줄은 license.err.server.{code}, 원문은 툴팁 — 결정 5-(b)).
  assert.deepEqual(extractSignedToken({ valid: false, error: 'activation limit reached', code: 'limit' }), {
    ok: false,
    error: 'activation limit reached',
    code: 'limit',
  });
  // 모르는 code는 넘기지 않는다 — 키 이름이 화면에 그대로 나오지 않게(license.verifyFailed로 간다).
  assert.deepEqual(extractSignedToken({ valid: false, error: '새 사유', code: 'weird' }), { ok: false, error: '새 사유' });
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

/* ================= roles.ts — 시맨틱 매핑 입력 변환 ================= */
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

test('exportTokens — 텍스트 스타일은 typography로, 행간·자간 %는 그대로(변수 아님)', () => {
  const styles = [
    { name: 'body', fontFamily: 'Inter', fontStyle: 'Regular', fontSize: 16, lineHeight: { unit: 'percent', value: 150 }, letterSpacing: { unit: 'percent', value: -2 } },
    { name: 'heading/h1', fontFamily: 'Inter', fontStyle: 'Semi Bold Italic', fontSize: 32, lineHeight: { unit: 'px', value: 40 }, letterSpacing: { unit: 'px', value: 0 } },
    { name: 'auto', fontFamily: 'Inter', fontStyle: 'Regular', fontSize: 14, lineHeight: { unit: 'auto', value: 0 }, letterSpacing: { unit: 'px', value: 0 } },
  ];
  const tokens = [{ name: 'font-size/16', collection: 'Global', type: 'FLOAT', kind: 'fontSize', value: 16 }];
  const css = exportTokens(tokens, OPTS, styles);
  assert.ok(css.includes('--typography-body-line-height: 150%;'));
  assert.ok(css.includes('--typography-body-letter-spacing: -2%;'));
  assert.ok(css.includes('--typography-heading-h1-line-height: 40px;'));
  assert.ok(css.includes('--typography-heading-h1-font-weight: 600;'));
  assert.ok(css.includes('--typography-heading-h1-font-style: italic;'));
  assert.ok(css.includes('--typography-auto-line-height: normal;'));
  assert.ok(css.trim().endsWith('}'));
  assert.ok(css.includes('--font-size-16: 16px;')); // 기존 토큰도 그대로

  const W3C = { ...OPTS, format: 'w3c' };
  const json = JSON.parse(exportTokens(tokens, W3C, styles));
  assert.equal(json.typography.body.$type, 'typography');
  assert.deepEqual(json.typography.body.$value, { fontFamily: 'Inter', fontSize: '16px', fontWeight: 400, lineHeight: '150%', letterSpacing: '-2%' });
  assert.equal(json.typography.heading.h1.$value.fontStyle, 'italic');
  assert.equal(json.typography.heading.h1.$value.lineHeight, '40px');
  assert.equal(json['font-size']['16'].$value, '16px');
  // 스타일 없이 호출하면 예전과 동일
  assert.equal(exportTokens(tokens, OPTS), exportTokens(tokens, OPTS, []));
  assert.equal(exportTokens(tokens, W3C), exportTokens(tokens, W3C, []));
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

test('exportTokens CSS — 계층 블록 · 종류 묶음 · 머리 주석(ia-v3 §4.4 "CSS 파일 모양")', () => {
  const R = '='.repeat(74);
  // 섞인 순서로 넣는다 — 묶음 안 이름순은 exporters가 정한다
  const tokens = [
    { name: 'spacing/card-gap', collection: 'Semantic', type: 'FLOAT', kind: 'spacing', aliasOf: 'spacing/16' },
    { name: 'spacing/16', collection: 'Global', type: 'FLOAT', kind: 'spacing', value: 16 },
    { name: 'color/gray/50', collection: 'Global', type: 'COLOR', kind: 'color', value: '#f9fafb' },
    { name: 'font-size/16', collection: 'Global', type: 'FLOAT', kind: 'fontSize', value: 16 },
    { name: 'color/background/brand', collection: 'Semantic', type: 'COLOR', kind: 'color', aliasOf: 'color/blue/500' },
    { name: 'color/blue/500', collection: 'Global', type: 'COLOR', kind: 'color', value: '#2e90fa' },
  ];
  const styles = [
    { name: 'body/medium', fontFamily: 'Pretendard', fontStyle: 'Regular', fontSize: 16, lineHeight: { unit: 'percent', value: 150 }, letterSpacing: { unit: 'px', value: 0 } },
  ];
  const expected = [
    `/* ${R}`,
    '   GLOBAL (Primitive) — raw values. Do not use directly in components.',
    `   ${R} */`,
    ':root {',
    '  /* Color */',
    '  --color-blue-500: #2e90fa;',
    '  --color-gray-50: #f9fafb;',
    '',
    '  /* Typography */',
    '  --font-size-16: 16px;',
    '',
    '  /* Spacing */',
    '  --spacing-16: 16px;',
    '}',
    '',
    `/* ${R}`,
    '   SEMANTIC — UI roles mapped to Global. Use these in components.',
    `   ${R} */`,
    ':root {',
    '  /* Color */',
    '  --color-background-brand: var(--color-blue-500);',
    '',
    '  /* Spacing */',
    '  --spacing-card-gap: var(--spacing-16);',
    '}',
    '',
    `/* ${R}`,
    '   TEXT STYLES',
    `   ${R} */`,
    ':root {',
    '  --typography-body-medium-font-family: Pretendard;',
    '  --typography-body-medium-font-size: 16px;',
    '  --typography-body-medium-font-weight: 400;',
    '  --typography-body-medium-line-height: 150%;',
    '  --typography-body-medium-letter-spacing: 0px;',
    '}',
  ].join('\n');
  assert.equal(exportTokens(tokens, OPTS, styles), expected); // 시안과 같은 모양 · 파일 끝 줄바꿈 없음
  // 받은 순서와 무관
  assert.equal(exportTokens([...tokens].reverse(), OPTS, styles), expected);
});

test('exportTokens CSS — 빈 블록 · 빈 묶음 생략, 묶음 하나여도 종류 주석', () => {
  const g = [{ name: 'radius/8', collection: 'Global', type: 'FLOAT', kind: 'radius', value: 8 }];
  const css = exportTokens(g, OPTS);
  assert.match(css, /GLOBAL \(Primitive\)/);
  assert.doesNotMatch(css, /SEMANTIC|TEXT STYLES|\/\* Color \*\//);
  assert.ok(css.includes(':root {\n  /* Radius */\n  --radius-8: 8px;\n}'));
  assert.ok(!css.endsWith('\n'));

  const sem = [{ name: 'radius/default', collection: 'Semantic', type: 'FLOAT', kind: 'radius', aliasOf: 'radius/8' }];
  const sc = exportTokens(sem, OPTS);
  assert.doesNotMatch(sc, /GLOBAL/);
  assert.match(sc, /SEMANTIC — UI roles/);

  const st = [{ name: 'a', fontFamily: 'Inter', fontStyle: 'Regular', fontSize: 14, lineHeight: { unit: 'auto', value: 0 }, letterSpacing: { unit: 'px', value: 0 } }];
  const tc = exportTokens([], OPTS, st);
  assert.doesNotMatch(tc, /GLOBAL|SEMANTIC/);
  assert.match(tc, /TEXT STYLES/);
  assert.equal(exportHasTokens(tc, 'css'), true);
});

test('exportTokens CSS — 종류 묶음 순서 · Other · italic 짝 줄 · 같은 이름은 GLOBAL에만', () => {
  const tokens = [
    { name: 'opacity/0_5', collection: 'Global', type: 'FLOAT', kind: 'opacity', value: 0.5 },
    { name: 'shadow-blur/4', collection: 'Global', type: 'FLOAT', kind: 'effectFloat', value: 4 },
    { name: 'misc/x', collection: 'Global', type: 'FLOAT', kind: 'other', value: 3 },
    { name: 'stroke-width/1', collection: 'Global', type: 'FLOAT', kind: 'strokeWidth', value: 1 },
    { name: 'size/24', collection: 'Global', type: 'FLOAT', kind: 'size', value: 24 },
    { name: 'font-weight/heading', collection: 'Global', type: 'STRING', kind: 'fontWeight', value: 'Bold Italic' },
    { name: 'color/x', collection: 'Semantic', type: 'COLOR', kind: 'color', aliasOf: 'color/x' },
    { name: 'color/x', collection: 'Global', type: 'COLOR', kind: 'color', value: '#000000' },
  ];
  const css = exportTokens(tokens, OPTS);
  const heads = [...css.matchAll(/\/\* (\w+) \*\//g)].map((m) => m[1]);
  assert.deepEqual(heads, ['Color', 'Typography', 'Size', 'Stroke', 'Opacity', 'Other']);
  assert.ok(css.includes('  --font-weight-heading: 700;\n  --font-weight-heading-style: italic;'));
  assert.ok(css.includes('  /* Other */\n  --misc-x: 3;\n  --shadow-blur-4: 4px;'));
  assert.doesNotMatch(css, /SEMANTIC/); // 같은 이름 Semantic 미러는 dedupe로 빠져 블록이 없다
});

test('exportTokens CSS — 묶음 안 이름순은 코드 단위 비교(언어 설정과 무관 · #162 리뷰)', () => {
  // 정렬은 CSS 이름이 아니라 Figma 이름 기준 — 순서는 값으로 확인한다
  const tokens = [
    { name: 'color/b', collection: 'Global', type: 'COLOR', kind: 'color', value: '#000003' },
    { name: 'color/Z', collection: 'Global', type: 'COLOR', kind: 'color', value: '#000001' },
    { name: 'color/a-2', collection: 'Global', type: 'COLOR', kind: 'color', value: '#000002' },
  ];
  const values = [...exportTokens(tokens, OPTS).matchAll(/: (#0000\d\d);/g)].map((m) => m[1]);
  // 대문자 Z(0x5A) < 소문자 a(0x61) < b — localeCompare라면 언어 설정에 따라 Z가 뒤로 갈 수 있다
  assert.deepEqual(values, ['#000001', '#000002', '#000003']);
});

/* ---- 별칭 풀기 · 같은 이름 알림 (ia-v3 §4.4 · A.23) ---- */
const EV = (id, name, tier, extra = {}) => ({ id, name, tier, type: 'COLOR', kind: 'color', ...extra });
const byN = (toks) => Object.fromEntries(toks.map((x) => [`${x.collection}:${x.name}`, x]));

test('resolveExportTokens — ① 남는 변수는 가리키고 ② 내보내지 않는 대상은 값으로 푼다', () => {
  const toks = byN(resolveExportTokens([
    EV('g1', 'color/gray/900', 1, { value: '#101828' }),
    EV('x1', 'brand/ink', 0, { value: '#1d2939', description: 'ink' }), // 계층 아님
    EV('x2', 'brand/mid', 0, { alias: 'x1' }), // 2단
    EV('x3', 'brand/to-g', 0, { alias: 'g1' }), // 중간에 남는 변수
    EV('c1', 'comp/btn', 3, { value: '#ff0000' }), // Component 계층
    EV('s1', 'color/text/default', 2, { alias: 'x1', description: '안내 글' }),
    EV('s2', 'color/text/two', 2, { alias: 'x2' }),
    EV('s3', 'color/text/via', 2, { alias: 'x3' }),
    EV('s4', 'color/text/comp', 2, { alias: 'c1' }),
    EV('s5', 'color/text/g', 2, { alias: 'g1', description: 'keep' }),
  ]));
  assert.equal(toks['Semantic:color/text/default'].value, '#1d2939');
  assert.equal(toks['Semantic:color/text/default'].description, 'ink'); // 값을 준 변수의 설명(원래 변수 설명은 안 씀)
  assert.equal(toks['Semantic:color/text/two'].value, '#1d2939');
  assert.equal(toks['Semantic:color/text/via'].aliasOf, 'color/gray/900'); // 남는 변수를 만나면 가리킴
  assert.equal(toks['Semantic:color/text/comp'].value, '#ff0000');
  assert.equal(toks['Semantic:color/text/g'].aliasOf, 'color/gray/900');
  assert.equal(toks['Semantic:color/text/g'].description, 'keep'); // ①이면 원래 변수 설명
  assert.ok(!('Global:brand/ink' in toks) && !('Global:comp/btn' in toks)); // 계층 0 · 3은 내보내지 않음
});

test('resolveExportTokens — ③ 없는 대상 · 순환 · 12번 초과는 빠지고, ⓪ 뒤에 남는 변수를 정한다', () => {
  const chain = [];
  for (let i = 0; i < 12; i++) chain.push(EV(`k${i}`, `x/k${i}`, 0, i === 11 ? { value: '#000000' } : { alias: `k${i + 1}` }));
  const out = resolveExportTokens([
    EV('a', 'color/gone', 2, { alias: 'nope' }),
    EV('l1', 'loop/a', 0, { alias: 'l2' }),
    EV('l2', 'loop/b', 0, { alias: 'l1' }),
    EV('b', 'color/loop', 2, { alias: 'l1' }),
    ...chain,
    EV('ok11', 'color/eleven', 2, { alias: 'k1' }), // 자신 + k1..k11 = 12번 읽기 → 닿음
    EV('far', 'color/far', 2, { alias: 'k0' }), // 자신 + 12개 = 13번 → 빠짐
    // ⓪ 예: 끊긴 Global A · 값 Semantic A · B → Global A
    EV('gA', 'color/A', 1, { alias: 'nope' }),
    EV('sA', 'color/A', 2, { value: '#123456' }),
    EV('sB', 'color/B', 2, { alias: 'gA' }),
  ]);
  const names = out.map((x) => `${x.collection}:${x.name}`);
  assert.ok(!names.includes('Semantic:color/gone'));
  assert.ok(!names.includes('Semantic:color/loop'));
  assert.ok(names.includes('Semantic:color/eleven'));
  assert.ok(!names.includes('Semantic:color/far'));
  assert.ok(!names.includes('Global:color/A') && !names.includes('Semantic:color/B'));
  assert.equal(out.find((x) => x.name === 'color/A').value, '#123456'); // Semantic A가 남는 변수
});

test('resolveExportTokens — dedupe에서 진 변수를 가리키면 값으로 푼다(이름이 같은 다른 값으로 풀리지 않게)', () => {
  const out = resolveExportTokens([
    EV('g', 'color/p', 1, { value: '#0000ff' }),
    EV('s', 'color/p', 2, { value: '#ff0000' }), // Global에 져서 남지 않음
    EV('r', 'color/role', 2, { alias: 's' }),
  ]);
  assert.equal(out.find((x) => x.name === 'color/role').value, '#ff0000');
  assert.equal(out.find((x) => x.name === 'color/role').aliasOf, undefined);
});

test('exportClashes — 거울(자기 이름 별칭 · 같은 대상 별칭 · 같은 값 쌍)은 세지 않고, 이름 단위 · 이름순', () => {
  const G = (name, extra) => ({ name, collection: 'Global', type: 'COLOR', kind: 'color', ...extra });
  const S = (name, extra) => ({ name, collection: 'Semantic', type: 'COLOR', kind: 'color', ...extra });
  const toks = [
    G('m/self', { value: '#000000' }), S('m/self', { aliasOf: 'm/self' }), // ⓐ
    G('m/same', { value: '#111111' }), S('m/same', { value: '#111111' }), // 값 쌍 같음
    G('m/alias', { aliasOf: 't' }), S('m/alias', { aliasOf: 't', description: '다른 설명' }), // 별칭 쌍 — 설명은 안 봄
    G('z/val', { value: '#000000' }), S('z/val', { value: '#ffffff' }), // 다른 값
    G('c/desc', { value: '#000000', description: 'a' }), S('c/desc', { value: '#000000', description: 'b' }), // 값 쌍 설명 다름
    G('b/one', { value: '#000000' }), S('b/one', { aliasOf: 'other' }), // 한쪽만 별칭
    G('a/multi', { value: '#000000' }), S('a/multi', { aliasOf: 'a/multi' }), S('a/multi', { value: '#999999' }), // 여럿 중 하나 겹침 → 이름 1개
    S('only/sem', { value: '#000000' }), S('only/sem', { value: '#ffffff' }), // 같은 계층 겹침은 안 셈
    G('g/dup', { value: '#000000' }), G('g/dup', { value: '#ffffff' }),
  ];
  assert.deepEqual(exportClashes(toks), ['a/multi', 'b/one', 'c/desc', 'z/val']);
});

test('exportClashNotice — 앞 3개 · 넘치면 "외 {n}개" · 없으면 빈 글', () => {
  assert.equal(exportClashNotice([]), '');
  assert.equal(exportClashNotice(['color/primary', 'spacing/md']), 'Global과 이름이 같은 Semantic 2개는 Global 값만 냈어요: color/primary, spacing/md');
  assert.equal(exportClashNotice(['a', 'b', 'c', 'd']), 'Global과 이름이 같은 Semantic 4개는 Global 값만 냈어요: a, b, c 외 1개');
  assert.equal(exportClashNotice(['a', 'b', 'c', 'd', 'e']), 'Global과 이름이 같은 Semantic 5개는 Global 값만 냈어요: a, b, c 외 2개');
});

/* ---- 같은 이름 Global끼리 · ②′ (ia-v3 §4.4 · A.26) ---- */
test('②′ — 진 Global의 값이 남은 Global과 같으면 var, 다르면 값', () => {
  const toks = byN(resolveExportTokens([
    EV('u1', 'color/gray/0', 1, { value: '#ffffff', collectionName: 'DSL UI 재확인' }), // 사용자 컬렉션(앞)
    EV('u2', 'color/blue/500', 1, { value: '#0000ff', collectionName: 'DSL UI 재확인' }),
    EV('p1', 'color/gray/0', 1, { value: '#ffffff', collectionName: 'Global' }), // 진 것 — 값 같음
    EV('p2', 'color/blue/500', 1, { value: '#3366ff', collectionName: 'Global' }), // 진 것 — 값 다름
    EV('s1', 'color/background/default', 2, { alias: 'p1', description: 'bg' }),
    EV('s2', 'color/text/brand', 2, { alias: 'p2' }),
  ]));
  assert.equal(toks['Semantic:color/background/default'].aliasOf, 'color/gray/0');
  assert.equal(toks['Semantic:color/background/default'].description, 'bg'); // ①의 설명 규칙
  assert.equal(toks['Semantic:color/text/brand'].aliasOf, undefined);
  assert.equal(toks['Semantic:color/text/brand'].value, '#3366ff');
});

test('②′ — 별칭끼리는 대상으로, 설명이 다르면 값, 한쪽만 별칭이면 값', () => {
  const toks = byN(resolveExportTokens([
    EV('base', 'color/base', 1, { value: '#111111' }),
    EV('u1', 'color/a', 1, { alias: 'base' }),
    EV('p1', 'color/a', 1, { alias: 'base' }), // 같은 대상 → var(--color-a)
    EV('u2', 'color/b', 1, { value: '#222222', description: '메모' }),
    EV('p2', 'color/b', 1, { value: '#222222' }), // 설명 다름 → 값
    EV('u3', 'color/c', 1, { alias: 'base' }),
    EV('p3', 'color/c', 1, { value: '#111111' }), // 한쪽만 별칭 → 값
    EV('s1', 'sem/a', 2, { alias: 'p1' }),
    EV('s2', 'sem/b', 2, { alias: 'p2' }),
    EV('s3', 'sem/c', 2, { alias: 'p3' }),
  ]));
  assert.equal(toks['Semantic:sem/a'].aliasOf, 'color/a');
  assert.equal(toks['Semantic:sem/b'].value, '#222222');
  assert.equal(toks['Semantic:sem/c'].value, '#111111');
});

test('②′ — 대상이 Semantic이면 하지 않고, 서로 엇갈린 두 쌍도 끝난다', () => {
  const all = resolveExportTokens([
    EV('sa', 'sem/x', 2, { value: '#123456' }),
    EV('sb', 'sem/x', 2, { value: '#123456' }), // 진 Semantic
    EV('s1', 'sem/ref', 2, { alias: 'sb' }),
    // 엇갈림: 사용자 a → 플러그인 b, 사용자 b → 플러그인 a (진 쪽끼리 가리킴)
    EV('ua', 'g/a', 1, { alias: 'pb' }),
    EV('ub', 'g/b', 1, { alias: 'pa' }),
    EV('pa', 'g/a', 1, { alias: 'pb' }),
    EV('pb', 'g/b', 1, { value: '#abcdef' }),
    EV('s2', 'sem/cross', 2, { alias: 'pa' }),
  ]);
  const toks = byN(all);
  const id = (x) => all.find((t) => t.id === x);
  assert.equal(toks['Semantic:sem/ref'].value, '#123456'); // Semantic 대상은 ②′ 없음
  // 남는 것: g/a = ua · g/b = ub. pa · ua를 ②′ 없이 풀면 둘 다 pb의 값 #abcdef → 같음 → var(--g-a)
  assert.equal(toks['Semantic:sem/cross'].aliasOf, 'g/a');
  // ua → pb(진 · S = ub)와 ub → pa(진 · S = ua)는 ②′로 서로 가리키는 고리가 된다 → 둘 다 값으로 되돌림
  assert.equal(id('ua').value, '#abcdef');
  assert.equal(id('ub').value, '#abcdef');
  assert.equal(id('ua').aliasOf, undefined);
});

test('②′ — 모드 블록에서 모드마다 견주고, S가 그 모드에서만 ③이면 값', () => {
  const vars = [
    MV('u1', 'color/gray/0', 1, 'U', { value: '#ffffff' }, { ud: { value: '#000000' } }),
    MV('p1', 'color/gray/0', 1, 'P', { value: '#ffffff' }, { pd: { value: '#111111' } }), // Dark에서 다름
    MV('u2', 'color/gray/1', 1, 'U', { value: '#eeeeee' }, { ud: { alias: 'nope' } }), // Dark에서 ③
    MV('p2', 'color/gray/1', 1, 'P', { value: '#eeeeee' }, { pd: { value: '#eeeeee' } }),
    MV('s1', 'color/bg', 2, 'S', { alias: 'p1' }),
    MV('s2', 'color/bg2', 2, 'S', { alias: 'p2' }),
  ];
  const cols = [COL('U', 1, [['ul', 'Light'], ['ud', 'Dark']]), COL('P', 1, [['pl', 'Light'], ['pd', 'Dark']]), COL('S', 2, [['sm', 'Mode 1']])];
  const base = byN(resolveExportTokens(vars));
  assert.equal(base['Semantic:color/bg'].aliasOf, 'color/gray/0');
  assert.equal(base['Semantic:color/bg2'].aliasOf, 'color/gray/1');
  const dark = byN(resolveExportModes(vars, cols).find((m) => m.key === 'dark').tokens);
  assert.equal(dark['Semantic:color/bg'].value, '#111111');
  assert.equal(dark['Semantic:color/bg2'].value, '#eeeeee');
});

test('exportGlobalDupes — 값이 같아도 세고, 컬렉션 이름이 하나일 때만 from', () => {
  const one = exportGlobalDupes([
    EV('u1', 'color/gray/0', 1, { value: '#fff', collectionName: 'DSL UI 재확인' }),
    EV('u2', 'color/blue/500', 1, { value: '#00f', collectionName: 'DSL UI 재확인' }),
    EV('p1', 'color/gray/0', 1, { value: '#fff', collectionName: 'Global' }),
    EV('p2', 'color/blue/500', 1, { value: '#36f', collectionName: 'Global' }),
    EV('s1', 'color/gray/0', 2, { value: '#fff', collectionName: 'Semantic' }), // Semantic은 세지 않음
    EV('x1', 'color/x', 1, { alias: 'nope', collectionName: 'Global' }),
    EV('x2', 'color/x', 1, { value: '#000', collectionName: 'Global' }), // ⓪에서 빠진 것과는 겹침 아님
  ]);
  assert.deepEqual(one, { names: ['color/blue/500', 'color/gray/0'], from: 'DSL UI 재확인' });
  const mixed = exportGlobalDupes([
    EV('a1', 'a', 1, { value: 1, collectionName: 'A' }),
    EV('b1', 'b', 1, { value: 1, collectionName: 'B' }),
    EV('a2', 'a', 1, { value: 1, collectionName: 'G' }),
    EV('b2', 'b', 1, { value: 1, collectionName: 'G' }),
  ]);
  assert.deepEqual(mixed, { names: ['a', 'b'] });
  const noName = exportGlobalDupes([EV('a1', 'a', 1, { value: 1 }), EV('a2', 'a', 1, { value: 1, collectionName: 'G' })]);
  assert.deepEqual(noName, { names: ['a'] });
  assert.deepEqual(exportGlobalDupes([EV('a1', 'a', 1, { value: 1 })]), { names: [] });
});

test('exportStatusTail — 겹침만 · Global끼리만 · 둘 다 · 없음', () => {
  assert.equal(exportStatusTail([], []), '');
  assert.equal(exportStatusTail(['color/primary'], []), 'Global과 이름이 같은 Semantic 1개는 Global 값만 냈어요: color/primary');
  assert.equal(exportStatusTail([], ['color/blue/500', 'color/gray/0'], 'DSL UI 재확인'), 'Global끼리 이름이 같은 2개는 "DSL UI 재확인" 것만 냈어요: color/blue/500, color/gray/0');
  assert.equal(exportDupNotice(['a', 'b', 'c', 'd', 'e']), 'Global끼리 이름이 같은 5개는 앞 컬렉션 것만 냈어요: a, b, c 외 2개');
  assert.equal(exportStatusTail(['p'], ['a'], 'G'), 'Global과 이름이 같은 Semantic 1개는 Global 값만 냈어요: p Global끼리 이름이 같은 1개는 "G" 것만 냈어요: a');
});

/* ---- 모드 블록 (ia-v3 §4.4 "모드 블록" · A.24) ---- */
const MV = (id, name, tier, col, def, modes = {}, extra = {}) => ({ id, name, tier, type: 'COLOR', kind: 'color', collectionId: col, ...def, modeValues: modes, ...extra });
const COL = (id, tier, modes, def = modes[0][0]) => ({ id, tier, defaultModeId: def, modes: modes.map(([modeId, name]) => ({ modeId, name })) });
const modeCss = (vars, cols) => {
  const toks = resolveExportTokens(vars);
  const modes = resolveExportModes(vars, cols);
  return { css: exportTokens(toks, OPTS, [], modes), toks, modes };
};

test('모드 블록 — D-T1: Global만 Dark → GLOBAL 뒤 [data-theme="dark"], SEMANTIC은 :root 한 블록', () => {
  const R = '='.repeat(74);
  const { css } = modeCss(
    [
      MV('g9', 'color/gray/900', 1, 'G', { value: '#101828' }, { gd: { value: '#f2f4f7' } }),
      MV('g5', 'color/gray/50', 1, 'G', { value: '#f9fafb' }, { gd: { value: '#f9fafb' } }), // 값이 같으면 빠짐
      MV('s1', 'color/text/default', 2, 'S', { alias: 'g9' }),
    ],
    [COL('G', 1, [['gl', 'Light'], ['gd', 'Dark']]), COL('S', 2, [['sm', 'Mode 1']])],
  );
  const expected = [
    `/* ${R}`, '   GLOBAL (Primitive) — raw values. Do not use directly in components.', `   ${R} */`,
    ':root {', '  /* Color */', '  --color-gray-50: #f9fafb;', '  --color-gray-900: #101828;', '}', '',
    `/* ${R}`, '   GLOBAL — Dark mode (only values that differ)', `   ${R} */`,
    '[data-theme="dark"] {', '  /* Color */', '  --color-gray-900: #f2f4f7;', '}', '',
    `/* ${R}`, '   SEMANTIC — UI roles mapped to Global. Use these in components.', `   ${R} */`,
    ':root {', '  /* Color */', '  --color-text-default: var(--color-gray-900);', '}',
  ].join('\n');
  assert.equal(css, expected);
});

test('모드 블록 — 옛 구조(Semantic Dark → dark/…)는 SEMANTIC 뒤 블록', () => {
  const { css } = modeCss(
    [
      MV('g9', 'color/gray/900', 1, 'G', { value: '#101828' }),
      MV('d9', 'dark/color/gray/900', 1, 'G', { value: '#f2f4f7' }),
      MV('s1', 'color/text/default', 2, 'S', { alias: 'g9' }, { sd: { alias: 'd9' } }),
    ],
    [COL('G', 1, [['gm', 'Mode 1']]), COL('S', 2, [['sl', 'Light'], ['sd', 'Dark']])],
  );
  assert.doesNotMatch(css, /GLOBAL — Dark/);
  assert.ok(css.includes('SEMANTIC — Dark mode (only values that differ)'));
  assert.ok(css.includes('[data-theme="dark"] {\n  /* Color */\n  --color-text-default: var(--dark-color-gray-900);\n}'));
  assert.ok(css.indexOf('SEMANTIC — UI roles') < css.indexOf('SEMANTIC — Dark mode'));
});

test('모드 블록 — 계층 밖 컬렉션의 모드로 값을 푼 Semantic도 바뀌면 들어감 · 모드별 거울 판정', () => {
  const vars = [
    MV('x', 'brand/ink', 0, 'X', { value: '#111111' }, { xd: { value: '#eeeeee' } }), // 계층 밖, Dark 있음
    MV('s', 'color/text/brand', 2, 'S', { alias: 'x' }),
    MV('g', 'color/p', 1, 'G', { value: '#000000' }),
    MV('sp', 'color/p', 2, 'S', { value: '#000000' }, {}), // 기본 모드는 거울(같은 값)
  ];
  const cols = [COL('X', 0, [['xl', 'Light'], ['xd', 'Dark']]), COL('G', 1, [['gm', 'Mode 1']]), COL('S', 2, [['sm', 'Mode 1']])];
  const { css, toks, modes } = modeCss(vars, cols);
  assert.ok(css.includes('SEMANTIC — Dark mode'));
  assert.ok(css.includes('--color-text-brand: #eeeeee;'));
  assert.deepEqual(exportClashes(toks, modes), []); // 거울은 모드에서도 거울
  // Semantic 쪽만 Dark가 다르면(모드에서 거울 아님) 겹침으로 셈
  const vars2 = [MV('g', 'color/p', 1, 'G', { value: '#000000' }), MV('sp', 'color/p', 2, 'S', { value: '#000000' }, { sd: { value: '#ffffff' } })];
  const cols2 = [COL('G', 1, [['gm', 'Mode 1']]), COL('S', 2, [['sl', 'Light'], ['sd', 'Dark']])];
  const r2 = modeCss(vars2, cols2);
  assert.deepEqual(exportClashes(r2.toks), []);
  assert.deepEqual(exportClashes(r2.toks, r2.modes), ['color/p']);
});

test('모드 블록 — 키(대소문자 · 공백 · 한글 · 따옴표) · 같은 키 묶기 · 키 순 · 머리 이름은 그 계층 먼저 · 빈 키', () => {
  assert.equal(exportModeKey('  High   Contrast '), 'high-contrast');
  assert.equal(exportModeKey('다크'), '다크');
  const vars = [
    MV('a', 'color/a', 1, 'G1', { value: '#000000' }, { g1d: { value: '#111111' }, g1q: { value: '#222222' } }),
    MV('b', 'color/b', 1, 'G2', { value: '#000000' }, { g2d: { value: '#333333' } }),
    MV('c', 'color/c', 1, 'G1', { value: '#000000' }, { g1s: { value: '#444444' } }),
  ];
  const cols = [
    COL('C', 3, [['cm', 'Mode 1'], ['cd', 'DARK']]), // Component — 머리 이름에 쓰지 않음(그 계층 먼저)
    COL('G1', 1, [['g1l', 'Light'], ['g1d', 'Dark'], ['g1q', 'say "hi"'], ['g1s', '   ']]),
    COL('G2', 1, [['g2l', 'Light'], ['g2d', 'dark ']]),
  ];
  const { css, modes } = modeCss(vars, cols);
  assert.deepEqual(modes.map((m) => m.key), ['dark', 'say-"hi"']); // 빈 키(공백뿐)는 없음 · 키 순
  assert.ok(css.includes('GLOBAL — Dark mode')); // Component의 "DARK"가 아니라 Global 첫 컬렉션의 이름
  assert.ok(css.includes('[data-theme="dark"] {\n  /* Color */\n  --color-a: #111111;\n  --color-b: #333333;\n}')); // 두 컬렉션 묶음
  assert.ok(css.includes('[data-theme="say-\\"hi\\""]'));
  assert.ok(css.indexOf('[data-theme="dark"]') < css.indexOf('[data-theme="say'));
});

test('모드 블록 — 자기 기본 모드와 같은 키는 기본으로 읽음 · ③은 그 블록에서만 빠짐 · W3C는 그대로', () => {
  const vars = [
    MV('a', 'color/a', 1, 'G', { value: '#000000' }, { gx: { value: '#ffffff' } }),
    MV('s', 'color/s', 2, 'S', { alias: 'a' }, { sd: { alias: 'nope' } }), // Dark에서는 끊김
  ];
  const cols = [COL('G', 1, [['gd', 'Dark'], ['gx', 'dark ']]), COL('S', 2, [['sl', 'Light'], ['sd', 'Dark']])];
  const { css, toks, modes } = modeCss(vars, cols);
  // G는 기본 모드가 Dark라 키 dark를 기본으로 읽음 → GLOBAL Dark 블록 없음, S의 Dark는 끊겨 빠짐 → SEMANTIC 블록 없음
  assert.doesNotMatch(css, /\[data-theme/);
  assert.ok(css.includes('--color-s: var(--color-a);')); // 기본 :root에는 그대로
  assert.equal(exportTokens(toks, { ...OPTS, format: 'w3c' }, [], modes), exportTokens(toks, { ...OPTS, format: 'w3c' }));
});

test('exportHasTokens — 껍데기만 있는 결과는 저장 대상이 아님(#8)', () => {
  // 변수 0개 → 형식별 껍데기. 파일로 떨어뜨리면 안 된다.
  assert.equal(exportHasTokens(exportTokens([], OPTS), 'css'), false);
  assert.equal(exportHasTokens(exportTokens([], { ...OPTS, format: 'w3c' }), 'w3c'), false);
  // 토큰이 하나라도 있으면 저장한다.
  const tokens = [{ name: 'primary', collection: 'Global', type: 'COLOR', kind: 'color', value: '#2563eb' }];
  assert.equal(exportHasTokens(exportTokens(tokens, OPTS), 'css'), true);
  assert.equal(exportHasTokens(exportTokens(tokens, { ...OPTS, format: 'w3c' }), 'w3c'), true);
  // 깨진 JSON은 저장하지 않는다(파싱 실패 = 내용 확인 불가).
  assert.equal(exportHasTokens('{nope', 'w3c'), false);
});

test('B.22 nameKeyFor — dsNameKey가 -{지금 이름}으로 끝날 때만(대소문자 정확) ⑬', () => {
  assert.equal(nameKeyFor('image', 'dsl-image'), 'dsl-image');
  assert.equal(nameKeyFor('Image', 'dsl-image'), undefined, '컴포넌트가 된 원본(대문자)은 지금 이름');
  assert.equal(nameKeyFor('image', 'image'), undefined);
  assert.equal(nameKeyFor('card-image', 'dsl-image'), undefined, '사용자가 이름을 바꿨으면 지금 이름');
  assert.equal(nameKeyFor('image', ''), undefined);
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

/* ================= roles.ts (전 토큰 역할 어휘) ================= */
test('tshirtRoles — 센터(md) 정렬 티셔츠', () => {
  assert.deepEqual(tshirtRoles([16]), ['md']);
  assert.deepEqual(tshirtRoles([8, 16, 24]), ['sm', 'md', 'lg']);
  assert.deepEqual(tshirtRoles([4, 8, 16, 24, 32]), ['xs', 'sm', 'md', 'lg', 'xl']);
  assert.deepEqual(tshirtRoles([4, 8, 16, 24, 32, 48]), ['xs', 'sm', 'md', 'lg', 'xl', '2xl']);
});

test('radiusRoles — 고정 사다리(2 xs·4 sm·8 md·12 lg·16 xl·24 2xl) · 0→none · 큰값→full · 사다리 밖은 역할 없음', () => {
  assert.deepEqual(radiusRoles([0, 4, 8]), ['none', 'sm', 'md']); // 파일에 몇 개가 있든 같은 값=같은 역할
  assert.deepEqual(radiusRoles([0, 8, 9999]), ['none', 'md', 'full']);
  assert.deepEqual(radiusRoles([6, 12, 58]), ['', 'lg', '']); // 6·58은 척도 밖 → Global만
});

test('spacingRoles/strokeRoles — Lightning·Atlassian 고정 사다리, 척도 밖 값은 역할 없음', () => {
  assert.deepEqual(spacingRoles([4, 8, 16, 24, 32]), ['2xs', 'xs', 'md', 'lg', 'xl']);
  assert.deepEqual(spacingRoles([13, 16, 51]), ['', 'md', '']);
  assert.deepEqual(strokeRoles([0.5, 1, 2, 4]), ['', 'thin', 'thick', '']); // 정수만 — hairline 없음(2026-11-04)
});

test('suggestTokenRoles — 간격 · 반경 · 선 두께는 고정 칸 이름을 채우지 않는다(쓰임 역할은 만들기가 만든다, §2.12 12.10)', () => {
  const map = suggestTokenRoles([
    { name: 'spacing/16', category: 'gap', value: 16, sources: ['gap'] },
    { name: 'spacing/13', category: 'gap', value: 13, sources: ['gap'] },
    { name: 'radius/8', category: 'radius', value: 8, sources: ['radius'] },
    { name: 'stroke-width/1', category: 'strokeWidth', value: 1, sources: ['strokeWidth'] },
  ]);
  assert.deepEqual(map, {});
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
  // 글자 역할만(§2.12 12.10) — 색 4개 · 고정 칸 이름은 채우지 않는다(채우면 옛 이름이 계속 생긴다).
  assert.deepEqual(map, {
    'font-size/body': 'font-size/16',
    'font-size/title': 'font-size/24',
    'font-weight/bold': 'font-weight/700',
    'font-family/sans': 'font-family/Inter',
  });
});

test('mergeTokenRoles — 부분 맵을 덮어쓰되 빠진 카테고리는 자동 추천을 남긴다', () => {
  const tokens = [
    { name: 'color/0066ff', category: 'color', sources: ['fill'], value: '#0066ff' },
    { name: 'font-size/16', category: 'fontSize', sources: ['fontSize'], value: 16 },
  ];
  // 색 목록 화면이 주는 건 색 역할뿐 — 이걸로 통째 교체하면 글자 역할이 사라진다.
  const merged = mergeTokenRoles(tokens, 16, { primary: 'color/0066ff', accent: 'color/0066ff' });
  assert.equal(merged['primary'], 'color/0066ff'); // 사용자가 정한 것 우선
  assert.equal(merged['accent'], 'color/0066ff'); // 자동 추천에 없던 역할도 그대로
  assert.equal(merged['font-size/body'], 'font-size/16'); // 색만 왔어도 글자 역할은 유지
  // 덮어쓸 게 없으면 자동 추천 그대로.
  assert.deepEqual(mergeTokenRoles(tokens, 16, {}), suggestTokenRoles(tokens, 16));
  assert.deepEqual(mergeTokenRoles(tokens, 16), suggestTokenRoles(tokens, 16));
});

/* ================= i18n.ts (런타임 문자열 외부화) ================= */
test('t — 키 조회·보간·폴백', () => {
  assert.equal(t('rename.none'), '바꿀 이름이 없어요');
  assert.equal(t('rename.doneStatus', { k: 3 }), '이름 3개 바꿈 · ⌘Z로 되돌리기');
  assert.equal(t('export.saved', { format: 'CSS', file: 'tokens.css' }), 'CSS — tokens.css로 저장했어요.');
  // 누락 변수는 자리표시자 유지
  assert.equal(t('rename.doneStatus', {}), '이름 {k}개 바꿈 · ⌘Z로 되돌리기');
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

test('nameTextStyles — KRDS 이름({분류}/{단계}) · 크기 내림차순 스펙 순서', () => {
  const clusters = [
    { fontSize: 16, lineHeight: 24, letterSpacing: 0, family: 'Inter', style: 'Regular', count: 5, sample: 'b', styleIds: [] },
    { fontSize: 48, lineHeight: 72, letterSpacing: 0, family: 'Inter', style: 'Bold', count: 1, sample: 'd', styleIds: [] },
    { fontSize: 32, lineHeight: 48, letterSpacing: 0, family: 'Inter', style: 'Bold', count: 1, sample: 'h', styleIds: [] },
  ];
  const specs = nameTextStyles(clusters);
  assert.deepEqual(specs.map((s) => [s.name, s.fontSize]), [
    ['display/medium', 48],
    ['heading/large', 32],
    ['body/medium', 16],
  ]);
  // 분류 · 단계는 값만으로 정해진다 — 크기가 많아도 text-N 같은 순위 이름이 없다.
  const many = Array.from({ length: 9 }, (_, i) => ({
    fontSize: 20 - i, lineHeight: (20 - i) * 1.5, letterSpacing: 0, family: 'Inter', style: 'Regular', count: 1, sample: '', styleIds: [],
  }));
  const names = nameTextStyles(many).map((s) => s.name);
  assert.equal(new Set(names).size, names.length);
  assert.ok(names.every((n) => n.startsWith('body/')));
});

test('nameTextStyles — 같은 단계 다중 스타일은 꼬리로 분기(병합 금지)', () => {
  const byWeight = nameTextStyles([
    { fontSize: 16, lineHeight: 24, letterSpacing: 0, family: 'Inter', style: 'Regular', count: 5, sample: '', styleIds: [] },
    { fontSize: 16, lineHeight: 24, letterSpacing: 0, family: 'Inter', style: 'Medium', count: 2, sample: '', styleIds: [] },
    { fontSize: 16, lineHeight: 24, letterSpacing: 0, family: 'Inter', style: 'Bold', count: 2, sample: '', styleIds: [] },
  ]).map((s) => s.name);
  assert.deepEqual(byWeight, ['body/medium', 'body/medium-w500', 'heading/xsmall']);

  // 같은 16px·같은 굵기, 패밀리만 다름 → 쓰인 곳 많은 글꼴이 그대로, 나머지 글꼴 slug
  const byFamily = nameTextStyles([
    { fontSize: 16, lineHeight: 24, letterSpacing: 0, family: 'Inter', style: 'Regular', count: 2, sample: '', styleIds: [] },
    { fontSize: 16, lineHeight: 24, letterSpacing: 0, family: 'Noto Sans KR', style: 'Regular', count: 1, sample: '', styleIds: [] },
  ]).map((s) => s.name);
  assert.deepEqual(byFamily, ['body/medium', 'body/medium-noto-sans-kr']);

  // 같은 크기·굵기·패밀리, 행간만 다름(별도 군집) → 줄 높이 꼬리
  const byLh = nameTextStyles([
    { fontSize: 16, lineHeight: 24, letterSpacing: 0, family: 'Inter', style: 'Regular', count: 1, sample: '', styleIds: [] },
    { fontSize: 16, lineHeight: 28, letterSpacing: 0, family: 'Inter', style: 'Regular', count: 1, sample: '', styleIds: [] },
  ]).map((s) => s.name).sort();
  assert.deepEqual(byLh, ['body/medium', 'body/medium-175']);
});

test('nameTextStyles — UI 역할 표본이 절반 이상이면 label(uiCount)', () => {
  const cl = clusterTextStyles([
    { fontSize: 15, lineHeight: 22.5, letterSpacing: 0, family: 'Inter', style: 'Bold', layerName: 'a', styleId: '', uiRole: true },
    { fontSize: 15, lineHeight: 22.5, letterSpacing: 0, family: 'Inter', style: 'Bold', layerName: 'b', styleId: '' },
    { fontSize: 17, lineHeight: 25.5, letterSpacing: 0, family: 'Inter', style: 'Regular', layerName: 'c', styleId: '', uiRole: true },
    { fontSize: 17, lineHeight: 25.5, letterSpacing: 0, family: 'Inter', style: 'Regular', layerName: 'd', styleId: '', uiRole: false },
    { fontSize: 17, lineHeight: 25.5, letterSpacing: 0, family: 'Inter', style: 'Regular', layerName: 'e', styleId: '' },
  ]);
  assert.equal(cl.find((c) => c.fontSize === 15).uiCount, 1);
  assert.equal(cl.find((c) => c.fontSize === 17).uiCount, 1);
  const names = nameTextStyles(cl).map((s) => s.name);
  // 15 Bold: 1/2 → label(굵은 버튼 글자만 → 굵기 꼬리), 17 Regular: 1/3 → body
  assert.deepEqual(names, ['body/medium', 'label/small-w700']);
});

test('nameTextStyles — 앵커 안 된 군집은 기존 스타일 이름을 피한다(예약 · 강제 꼬리)', () => {
  const clusters = clusterTextStyles([
    { fontSize: 16, lineHeight: 24, letterSpacing: 0, family: 'Inter', style: 'Regular', layerName: 'p', styleId: '' },
    { fontSize: 32, lineHeight: 48, letterSpacing: 0, family: 'Inter', style: 'Bold', layerName: 'h', styleId: '' },
  ]);
  // body/medium은 값이 다른 관계없는 스타일 · heading/large는 시그니처가 같아 앵커
  const existing = [
    { id: 'S:x', name: 'body/medium', fontSize: 17, lineHeight: 26, letterSpacing: 0, family: 'Inter', style: 'Regular' },
    { id: 'S:h', name: 'heading/large', fontSize: 32, lineHeight: 48, letterSpacing: 0, family: 'Inter', style: 'Bold' },
  ];
  const specs = nameTextStyles(clusters, existing);
  const s16 = specs.find((s) => s.fontSize === 16);
  const s32 = specs.find((s) => s.fontSize === 32);
  assert.equal(s16.name, 'body/medium-16-w400-150');
  assert.equal(s16.boundStyleId, undefined);
  assert.equal(s32.name, 'heading/large');
  assert.equal(s32.boundStyleId, 'S:h');
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

test('clusterTextStyles / nameTextStyles — 군집 노드 id와 개수를 스펙까지 나른다(#17 ×N)', () => {
  const cl = clusterTextStyles([
    { fontSize: 16, lineHeight: 24, letterSpacing: 0, family: 'Inter', style: 'Regular', layerName: 'b1', styleId: '', id: 'N:1' },
    { fontSize: 16, lineHeight: 24, letterSpacing: 0, family: 'Inter', style: 'Regular', layerName: 'b2', styleId: '', id: 'N:2' },
    { fontSize: 32, lineHeight: 40, letterSpacing: 0, family: 'Inter', style: 'Bold', layerName: 'h', styleId: '', id: 'N:3' },
  ]);
  const body = cl.find((c) => c.fontSize === 16);
  assert.equal(body.count, 2);
  assert.deepEqual(body.nodeIds, ['N:1', 'N:2']);

  const specs = nameTextStyles(cl);
  const bodySpec = specs.find((x) => x.fontSize === 16);
  assert.equal(bodySpec.count, 2);
  assert.deepEqual(bodySpec.nodeIds, ['N:1', 'N:2']); // ×N 배지가 이 id들을 선택한다
  // id 없는 샘플(손으로 만든 군집)은 nodeIds를 만들지 않는다 — 배지 대신 삭제 버튼이 나온다.
  const noIds = nameTextStyles(clusterTextStyles([
    { fontSize: 14, lineHeight: 20, letterSpacing: 0, family: 'Inter', style: 'Regular', layerName: 'x', styleId: '' },
  ]));
  assert.equal(noIds[0].nodeIds, undefined);
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

test('isRowLabelNameLike / pairHorizontalRowLabel — 왼쪽 라벨·크기 역전·모호', () => {
  assert.equal(isRowLabelNameLike('H1'), true);
  assert.equal(isRowLabelNameLike('a'.repeat(25)), false);
  assert.equal(isRowLabelNameLike('body/bold'), true);
  // 긴 이름도 KRDS 분류 · 옛 램프 이름 패턴이면 이름성(§3.9)
  assert.equal(isRowLabelNameLike('heading/medium-26_7-w600-120-ls0_5'), true);
  assert.equal(isRowLabelNameLike('label/medium-w700-noto-sans-kr-2'), true);
  assert.equal(isRowLabelNameLike('h1/inter-semi-bold-extra-long-x'), true);
  assert.equal(isRowLabelNameLike('subtitle/inter-semi-bold-extra-long'), false);
  assert.equal(isRowLabelNameLike('line1\nline2'), false);

  const row = (items) =>
    items.map((it, indexInParent) => ({
      fontSize: it.fontSize,
      lineHeight: it.fontSize + 8,
      letterSpacing: 0,
      family: 'Inter',
      style: 'Regular',
      layerName: 't',
      styleId: '',
      characters: it.characters,
      id: it.id,
      rowId: 'row1',
      indexInParent,
    }));

  // 작은 라벨 + 큰 표본
  const p1 = pairHorizontalRowLabel(row([
    { id: 'L', characters: '제목', fontSize: 12 },
    { id: 'S', characters: 'The quick', fontSize: 32 },
  ]));
  assert.equal(p1?.labelName, '제목');
  assert.equal(p1?.specimen.id, 'S');

  // 왼쪽이 더 커도 짧은 이름성 → 라벨
  const p2 = pairHorizontalRowLabel(row([
    { id: 'L', characters: 'H1', fontSize: 40 },
    { id: 'S', characters: 'sample', fontSize: 16 },
  ]));
  assert.equal(p2?.labelName, 'H1');

  // 왼쪽이 크고 이름성 없음 → 실패
  const p3 = pairHorizontalRowLabel(row([
    { id: 'L', characters: 'This is a long heading text that exceeds twenty four', fontSize: 40 },
    { id: 'S', characters: 'x', fontSize: 16 },
  ]));
  assert.equal(p3, null);
});

test('nameTextStylesWithRowLabels — 라벨 이름·우측 제외·unique·앵커 우선', () => {
  const base = (o) => ({
    lineHeight: o.fontSize + 8,
    letterSpacing: 0,
    family: 'Inter',
    style: 'Regular',
    layerName: 't',
    styleId: o.styleId ?? '',
    ...o,
  });

  // 행1: 라벨+표본+우측 / 행2: 다른 라벨+표본
  const samples = [
    base({ id: 'a1', rowId: 'r1', indexInParent: 0, characters: 'Display', fontSize: 12 }),
    base({ id: 'a2', rowId: 'r1', indexInParent: 1, characters: 'Ag', fontSize: 48 }),
    base({ id: 'a3', rowId: 'r1', indexInParent: 2, characters: '48/56', fontSize: 11 }),
    base({ id: 'b1', rowId: 'r2', indexInParent: 0, characters: 'Body', fontSize: 12 }),
    base({ id: 'b2', rowId: 'r2', indexInParent: 1, characters: 'hello', fontSize: 16 }),
  ];
  const r = nameTextStylesWithRowLabels(samples);
  assert.equal(r.labeled, 2);
  assert.equal(r.fallback, 0);
  assert.deepEqual(r.styles.map((s) => s.name).sort(), ['Body', 'Display']);
  assert.ok(!r.styles.some((s) => s.fontSize === 11)); // 우측 제외
  assert.ok(!r.styles.some((s) => s.fontSize === 12 && s.name === 'caption')); // 라벨 타이포 행 없음

  // 동일 라벨 문자열·다른 시그니처 → unique
  const dup = nameTextStylesWithRowLabels([
    base({ id: 'c1', rowId: 'r3', indexInParent: 0, characters: 'Title', fontSize: 12 }),
    base({ id: 'c2', rowId: 'r3', indexInParent: 1, characters: 'A', fontSize: 20 }),
    base({ id: 'd1', rowId: 'r4', indexInParent: 0, characters: 'Title', fontSize: 12 }),
    base({ id: 'd2', rowId: 'r4', indexInParent: 1, characters: 'B', fontSize: 18 }),
  ]);
  assert.deepEqual(dup.styles.map((s) => s.name).sort(), ['Title', 'Title-2']);

  // 앵커 있으면 기존 이름 유지
  const anchored = nameTextStylesWithRowLabels(
    [
      base({ id: 'e1', rowId: 'r5', indexInParent: 0, characters: 'FromLabel', fontSize: 12 }),
      base({
        id: 'e2', rowId: 'r5', indexInParent: 1, characters: 'Ag', fontSize: 16,
        styleId: 'S:body',
      }),
    ],
    [{ id: 'S:body', name: 'body', fontSize: 16, lineHeight: 24, letterSpacing: 0, family: 'Inter', style: 'Regular' }],
  );
  assert.equal(anchored.styles[0].boundStyleId, 'S:body');
  assert.equal(anchored.styles[0].name, 'body');
});

test('nameTextStylesWithRowLabels — 라벨 이름도 예약 이름(관계없는 기존 스타일)을 피한다', () => {
  const base = (o) => ({ lineHeight: o.fontSize * 1.5, letterSpacing: 0, family: 'Inter', style: 'Regular', layerName: 't', styleId: '', ...o });
  const r = nameTextStylesWithRowLabels(
    [
      base({ id: 'l', rowId: 'r', indexInParent: 0, characters: 'Body', fontSize: 12 }),
      base({ id: 's', rowId: 'r', indexInParent: 1, characters: 'Ag', fontSize: 16 }),
    ],
    [{ id: 'S:o', name: 'Body', fontSize: 40, lineHeight: 60, letterSpacing: 0, family: 'Inter', style: 'Bold' }],
  );
  assert.equal(r.labeled, 1);
  assert.equal(r.styles[0].boundStyleId, undefined);
  assert.equal(r.styles[0].name, 'Body-2'); // 'Body'는 남의 스타일 이름 — 덮어쓰지 않게
});

test('fontStyleForWeight — 굵기/italic → Figma style', () => {
  assert.equal(fontStyleForWeight(400), 'Regular');
  assert.equal(fontStyleForWeight(700), 'Bold');
  assert.equal(fontStyleForWeight(600), 'SemiBold');
  assert.equal(fontStyleForWeight(400, true), 'Italic');
  assert.equal(fontStyleForWeight(700, true), 'Bold Italic');
  assert.equal(fontStyleForWeight(123), 'Regular'); // 미지정 → Regular
});

test('rampToSpecs — KRDS 기본 램프(값 · 이름) + 패밀리 주입', () => {
  const specs = rampToSpecs('Pretendard');
  assert.deepEqual(specs.map((s) => [s.name, s.fontSize, s.style]), [
    ['display/large', 60, 'Bold'],
    ['heading/large', 32, 'Bold'],
    ['heading/medium', 24, 'Bold'],
    ['heading/small', 19, 'Bold'],
    ['body/medium', 17, 'Regular'],
    ['body/small', 15, 'Regular'],
  ]);
  assert.deepEqual(specs.map((s) => s.name), DEFAULT_TYPE_RAMP.map((r) => r.name)); // 표의 이름 = 규칙이 짓는 이름
  assert.ok(specs.every((s) => s.family === 'Pretendard'));
  assert.ok(specs.every((s) => s.lineHeightPercent === 150 && s.lineHeight === s.fontSize * 1.5 && s.letterSpacing === 0));
  assert.ok(!specs.some((s) => s.name.startsWith('label/'))); // label 줄은 넣지 않는다
});

test('rampToSpecs — 예약 이름(로컬 스타일)과 같은 줄은 강제 꼬리', () => {
  const specs = rampToSpecs('Inter', ['body/medium', 'heading/large', 'heading/large-32-w700-150']);
  const names = specs.map((s) => s.name);
  assert.deepEqual(names, [
    'display/large',
    'heading/large-32-w700-150-2',
    'heading/medium',
    'heading/small',
    'body/medium-17-w400-150',
    'body/small',
  ]);
  // Set도 받는다
  assert.equal(rampToSpecs('Inter', new Set(['body/small']))[5].name, 'body/small-15-w400-150');
});

/* ================= tidyNumberTokens (스케일 사다리) ================= */
const numTok = (name, category, value, count, unit) => ({
  name, category, sources: [category === 'gap' ? 'gap' : 'size'], value, count, ...(unit ? { unit } : {}),
});

test('scaleLadder — 기준 미만은 반분할, 기준 이상은 배수', () => {
  assert.deepEqual(scaleLadder(8, 40), [1, 2, 4, 8, 16, 24, 32, 40, 48]);
  assert.deepEqual(scaleLadder(4, 12), [1, 2, 4, 8, 12, 16]);
  assert.deepEqual(scaleLadder(0, 40), []);
});

test('tidyNumberTokens — 8px 사다리·15%: 근사값만 옮기고 2·4는 보존', () => {
  const vals = [2, 3, 4, 5, 7, 10, 12, 14, 15, 17, 20, 24, 30];
  const r = tidyNumberTokens(vals.map((v) => numTok('spacing/' + v, 'gap', v, 3)), { base: 8, ratio: 0.15 });
  const got = r.tokens.map((t) => t.value).sort((a, b) => a - b);
  // 7→8 · 14·15·17→16 · 30→32 만 이동. 2·3·4·5·10·12·20·24는 사다리에서 멀거나 이미 칸 위.
  assert.deepEqual(got, [2, 3, 4, 5, 8, 10, 12, 16, 20, 24, 32]);
  assert.equal(r.snapped, 5);
  assert.equal(r.merged, 2); // 14·15·17 → 16 한 칸으로
});

test('tidyNumberTokens — 이동 한계가 비율이라 작은 값일수록 보수적', () => {
  // 4와 36 모두 사다리 칸에서 4px 떨어져 있지만, 비율은 100% vs 11%로 다르다.
  const r = tidyNumberTokens([numTok('spacing/4', 'gap', 4, 3), numTok('spacing/36', 'gap', 36, 3)], { base: 8, ratio: 0.15 });
  const byName = new Map(r.tokens.map((t) => [t.name, t]));
  assert.equal(byName.get('spacing/4').value, 4); // 유지 — 8까지 100%
  assert.equal(byName.get('spacing/32').value, 32); // 36 → 32 (11%)
});

test('tidyNumberTokens — 같은 칸에 놓이면 사용 수와 무관하게 병합', () => {
  const r = tidyNumberTokens(
    [numTok('spacing/15', 'gap', 15, 5), numTok('spacing/17', 'gap', 17, 5)],
    { base: 8, ratio: 0.15 },
  );
  assert.equal(r.snapped, 2);
  assert.equal(r.merged, 1);
  assert.equal(r.tokens.length, 1);
  assert.equal(r.tokens[0].value, 16);
  // count는 '서로 다른 레이어 수'라 합산하면 과대계상이 된다(한 레이어가 두 값을 함께 쓸 수 있다).
  // 겹침을 알 수 없으므로 하한인 최댓값을 쓴다.
  assert.equal(r.tokens[0].count, 5);
  assert.deepEqual(r.tokens[0].sources, ['gap']);
});

test('tidyNumberTokens — 한 레이어가 낸 1× 두 값이 합쳐져도 1×로 남는다', () => {
  // 한 카드의 paddingTop 15 · itemSpacing 17 → 둘 다 16으로 스냅. 실제 레이어는 하나뿐이므로
  // 합산해서 2×가 되면 '1× 해제'가 이 토큰을 더 이상 걸러내지 못한다.
  const r = tidyNumberTokens(
    [numTok('spacing/15', 'gap', 15, 1), numTok('spacing/17', 'gap', 17, 1)],
    { base: 8, ratio: 0.15 },
  );
  assert.equal(r.merged, 1);
  assert.equal(r.tokens[0].count, 1);
});

test('tidyNumberTokens — 병합 대표는 가장 많이 쓰인 값(배열 순서 아님)', () => {
  // 개명한 희소 값이 앞에 있어도 정규 값의 이름이 살아남아야 한다.
  const rare = { name: 'spacing/gutter', category: 'gap', sources: ['gap'], value: 15, count: 2 };
  const canonical = numTok('spacing/16', 'gap', 16, 40);
  const r = tidyNumberTokens([rare, canonical], { base: 8, ratio: 0.15 });
  assert.equal(r.merged, 1);
  assert.equal(r.tokens.length, 1);
  assert.equal(r.tokens[0].name, 'spacing/16');
  assert.equal(r.tokens[0].count, 40);
});

test('tidyNumberTokens — 사다리에서 먼 값은 서로 가까워도 합치지 않는다', () => {
  // 12·13은 1px 차이지만 둘 다 8px 사다리에서 멀다 → 의도된 예외로 보고 그대로 둔다.
  const r = tidyNumberTokens(
    [numTok('spacing/12', 'gap', 12, 40), numTok('spacing/13', 'gap', 13, 2)],
    { base: 8, ratio: 0.15 },
  );
  assert.equal(r.snapped, 0);
  assert.equal(r.merged, 0);
  assert.equal(r.tokens.length, 2);
});

test('tidyNumberTokens — 여백만 대상(크기·폰트 크기·선 두께·반경·색 제외)', () => {
  const tokens = [
    numTok('size/14', 'size', 14, 6), // 아이콘 · 아바타 크기는 의도된 값 — 옮기지 않는다(§2.11)
    numTok('size/28', 'size', 28, 6),
    numTok('font-size/15', 'fontSize', 15, 30),
    numTok('stroke-width/1_5', 'strokeWidth', 1.5, 12),
    numTok('radius/6', 'radius', 6, 8),
    { name: 'color/0066ff', category: 'color', sources: ['fill'], value: '#0066ff', count: 9 },
    { name: 'opacity/0_5', category: 'opacity', sources: ['opacity'], value: 0.5, count: 9 },
    numTok('spacing/15', 'gap', 15, 4),
  ];
  const r = tidyNumberTokens(tokens, { base: 8, ratio: 0.15 });
  assert.equal(r.before, 1); // 대상은 spacing 하나뿐
  assert.equal(r.snapped, 1);
  const byName = new Map(r.tokens.map((t) => [t.name, t]));
  assert.equal(byName.get('size/14').value, 14);
  assert.equal(byName.get('size/28').value, 28);
  assert.equal(byName.get('font-size/15').value, 15);
  assert.equal(byName.get('stroke-width/1_5').value, 1.5);
  assert.equal(byName.get('radius/6').value, 6);
  assert.equal(byName.get('spacing/16').value, 16);
});

test('tidyNumberTokens — 비-px 단위는 사다리와 무관', () => {
  const t = numTok('spacing/15pct', 'gap', 15, 3, 'percent');
  const r = tidyNumberTokens([t], { base: 8, ratio: 0.15 });
  assert.equal(r.before, 0);
  assert.equal(r.snapped, 0);
  assert.equal(r.tokens[0].value, 15);
});

test('tidyNumberTokens — 개명한 토큰은 값만 바꾸고 이름은 보존', () => {
  const t = { name: 'spacing/inline-sm', category: 'gap', sources: ['gap'], value: 15, count: 3 };
  const r = tidyNumberTokens([t], { base: 8, ratio: 0.15 });
  assert.equal(r.snapped, 1);
  assert.equal(r.tokens[0].value, 16);
  assert.equal(r.tokens[0].name, 'spacing/inline-sm');
});

test('tidyNumberTokens — 입력 배열을 변형하지 않는다(되돌리기 스냅샷 보호)', () => {
  const tokens = [numTok('spacing/15', 'gap', 15, 3), numTok('spacing/17', 'gap', 17, 1)];
  const snapshot = JSON.stringify(tokens);
  tidyNumberTokens(tokens, { base: 8, ratio: 0.15 });
  assert.equal(JSON.stringify(tokens), snapshot);
});

test('tidyNumberTokens — base 0 또는 허용 0이면 그대로', () => {
  const tokens = [numTok('spacing/15', 'gap', 15, 3)];
  assert.equal(tidyNumberTokens(tokens, { base: 0, ratio: 0.15 }).snapped, 0);
  assert.equal(tidyNumberTokens(tokens, { base: 8, ratio: 0 }).snapped, 0);
});

/* ---------- 행간 원본 단위(%) 보존 — 파일 끝에 모아 둠(동시 작업 브랜치와의 충돌 최소화) ---------- */

test('clusterTextStyles — px 노드와 % 노드가 한 군집이면 원본은 %가 이긴다', () => {
  const base = { fontSize: 16, lineHeight: 24, letterSpacing: 0, family: 'Inter', style: 'Regular', styleId: '' };
  // px 먼저 → % 가 나중에 들어와도 승격된다
  const pxFirst = clusterTextStyles([
    { ...base, lineHeightPercent: 0, layerName: 'A' },
    { ...base, lineHeightPercent: 150, layerName: 'B' },
  ]);
  assert.equal(pxFirst.length, 1); // 시그니처는 px 기준이라 한 군집
  assert.equal(pxFirst[0].count, 2);
  assert.equal(pxFirst[0].lineHeightPercent, 150);

  // % 먼저 → px 가 뒤에 와도 강등되지 않는다
  const pctFirst = clusterTextStyles([
    { ...base, lineHeightPercent: 150, layerName: 'B' },
    { ...base, lineHeightPercent: 0, layerName: 'A' },
  ]);
  assert.equal(pctFirst[0].lineHeightPercent, 150);

  // 전부 px면 0(= px로 등록)
  const allPx = clusterTextStyles([{ ...base, lineHeightPercent: 0, layerName: 'A' }]);
  assert.equal(allPx[0].lineHeightPercent, 0);
});

test('nameTextStyles — 군집의 행간 %는 스펙으로 전달되고, px 군집엔 필드가 없다', () => {
  const cl = clusterTextStyles([
    { fontSize: 16, lineHeight: 24, lineHeightPercent: 150, letterSpacing: 0, family: 'Inter', style: 'Regular', layerName: 'b', styleId: '' },
    { fontSize: 32, lineHeight: 40, lineHeightPercent: 0, letterSpacing: 0, family: 'Inter', style: 'Bold', layerName: 't', styleId: '' },
  ]);
  const specs = nameTextStyles(cl);
  const pct = specs.find((s) => s.fontSize === 16);
  const px = specs.find((s) => s.fontSize === 32);
  assert.equal(pct.lineHeightPercent, 150);
  assert.equal(pct.lineHeight, 24); // px 환산값은 그대로 유지(시맨틱 변수·시그니처 기준)
  assert.equal(px.lineHeightPercent, undefined);
});

test('clusterTextStyles — px 자간과 % 자간이 한 군집이면 원본은 %가 이긴다', () => {
  const base = { fontSize: 16, lineHeight: 24, letterSpacing: 0.32, lineHeightPercent: 0, family: 'Inter', style: 'Regular', styleId: '' };
  const pxFirst = clusterTextStyles([
    { ...base, letterSpacingPercent: 0, layerName: 'A' },
    { ...base, letterSpacingPercent: 2, layerName: 'B' },
  ]);
  assert.equal(pxFirst.length, 1);
  assert.equal(pxFirst[0].letterSpacingPercent, 2);

  const neg = clusterTextStyles([
    { ...base, letterSpacing: -0.32, letterSpacingPercent: 0, layerName: 'A' },
    { ...base, letterSpacing: -0.32, letterSpacingPercent: -2, layerName: 'B' },
  ]);
  assert.equal(neg[0].letterSpacingPercent, -2);
});

test('nameTextStyles — 군집의 자간 %는 스펙으로 전달되고, px 군집엔 필드가 없다', () => {
  const cl = clusterTextStyles([
    { fontSize: 16, lineHeight: 24, lineHeightPercent: 0, letterSpacing: 0.32, letterSpacingPercent: 2, family: 'Inter', style: 'Regular', layerName: 'b', styleId: '' },
    { fontSize: 32, lineHeight: 40, lineHeightPercent: 0, letterSpacing: 0.4, letterSpacingPercent: 0, family: 'Inter', style: 'Bold', layerName: 't', styleId: '' },
  ]);
  const specs = nameTextStyles(cl);
  const pct = specs.find((s) => s.fontSize === 16);
  const px = specs.find((s) => s.fontSize === 32);
  assert.equal(pct.letterSpacingPercent, 2);
  assert.equal(pct.letterSpacing, 0.32);
  assert.equal(px.letterSpacingPercent, undefined);
});

/* ---------- 스코프 목록(R1)·다크 테마 생성(R2) 순수 헬퍼 ---------- */

test('scopesForTypeList — 타입별 유효 스코프 노출', () => {
  const color = scopesForTypeList('COLOR');
  assert.ok(color.includes('ALL_FILLS'));
  assert.ok(!color.includes('GAP')); // FLOAT 전용
  const float = scopesForTypeList('FLOAT');
  assert.ok(float.includes('GAP'));
  assert.ok(!float.includes('TEXT_FILL'));
});

test('DK-2 darkStepFor — 역할별 규칙 1–6 경계(ia-v3 13.7 D-T2)', () => {
  const g = (use, step, extra = {}) => darkStepFor({ use, alpha: 1, achromatic: true, step, ...extra });
  const c = (use, step) => darkStepFor({ use, alpha: 1, achromatic: false, step });
  // 1 그림자 · 반투명
  assert.equal(g('shadow', 900), null);
  assert.equal(g('background', 0, { alpha: 0.5 }), null);
  // 2 회색 배경 — 대칭에서 가운데로 한 자리
  assert.deepEqual([0, 50, 100, 500, 900, 1000].map((s) => g('background', s)), [950, 900, 800, 500, 200, 50]);
  // 3 회색 그 밖(inverse 포함 — 같은 쓰임 규칙)
  assert.deepEqual([0, 200, 600, 900, 1000].map((s) => g('text', s)), [950, 800, 400, 100, 50]);
  assert.equal(g(undefined, 900), 100, '모르는 쓰임은 규칙 3');
  // 4 연한 강조색 · 5 짙은 끝 · 6 강조색
  assert.deepEqual([50, 100, 200].map((s) => c('background', s)), [900, 800, 700]);
  assert.equal(c('text', 100), 800, '연한 강조색은 쓰임과 상관없이');
  assert.deepEqual([800, 900, 950].map((s) => c('text', s)), [200, 100, 50]);
  assert.deepEqual([300, 400, 500, 600, 700].map((s) => c('background', s)), [300, 300, 400, 400, 500]);
});

test('DK-2 lightStepOf — 세 마디 단계 이름 · 꼴만 맞는 이름(분류 단계) · 그 밖(분류 계열 · 단계) · 유채색은 값으로', () => {
  assert.deepEqual(lightStepOf('color/gray/900', '#171717'), { family: 'gray', step: 900, achromatic: true });
  assert.equal(lightStepOf('color/gray/900', '#101828').achromatic, false, '푸른 회색(C 0.034)은 값으로 유채색');
  assert.deepEqual(lightStepOf('color/blue-2/500', '#3366ff'), { family: 'blue-2', step: 500, achromatic: false });
  assert.equal(lightStepOf('color/gray/0', '#ffffff').step, 0);
  const mid = lightStepOf('color/indigo/500-2', '#5576ee');
  assert.equal(mid.family, 'indigo');
  assert.equal(mid.step, classifyColor('#5576ee').step);
  const flat = lightStepOf('color/0066ff', '#0066ff');
  assert.equal(flat.family, classifyColor('#0066ff').family);
  assert.equal(lightStepOf('color/neutral/500', '#737373').achromatic, true, '이름이 gray가 아니어도 값이 무채색이면 회색');
});

test('DK-2 scaleStepColor — L = 단계 기준 L · 유채색은 기준 H 유지 · 회색은 채도 0.02 이하', () => {
  const blue = scaleStepColor(100, [{ step: 600, hex: '#1570ef', name: 'color/blue/600' }]);
  const o = hexToOklch(blue);
  assert.ok(Math.abs(o.l - stepRefL(100)) < 0.01, `L ${o.l}`);
  assert.ok(Math.abs(o.h - hexToOklch('#1570ef').h) < 8, `H ${o.h}`);
  const gray = hexToOklch(scaleStepColor(500, [{ step: 900, hex: '#171717', name: 'g' }, { step: 600, hex: '#52525b', name: 'h' }]));
  assert.ok(gray.c <= 0.0205, `C ${gray.c}`);
  assert.ok(Math.abs(gray.l - stepRefL(500)) < 0.01);
  assert.equal(scaleStepColor(500, []).length, 7, '기준이 없으면 무채색');
});

test('normalizeUiSize — mini만 최소화, 예전 large·{h}·깨진 값은 전부 기본', async () => {
  const { normalizeUiSize, uiHeight, uiWidth, UI_WIDTH, UI_HEIGHT } = await import('../dist/pure.mjs');
  assert.equal(normalizeUiSize('mini'), 'mini');
  assert.equal(normalizeUiSize('default'), 'default');
  // 예전 높이 전환이 저장한 값은 v3에서 기본으로 돌아간다.
  for (const v of ['large', { h: 1200 }, { h: 760 }, undefined, null, '', 'huge', 42, NaN, {}]) {
    assert.equal(normalizeUiSize(v), 'default', String(v));
  }
  assert.equal(uiHeight('default'), 510);
  assert.equal(uiHeight('mini'), 104);
  assert.equal(uiWidth('default'), 560);
  assert.equal(uiWidth('mini'), 140); // 최소화는 폭도 줄인다(Tokens Studio처럼 작은 사각형)
  assert.ok(uiWidth('mini') >= 70); // 피그마 창 최소 폭
  assert.equal(UI_WIDTH, 560); // #17: 가로 고정
  assert.deepEqual(Object.keys(UI_HEIGHT).sort(), ['default', 'mini']); // 크게(860)는 없다
});

/* ---------- IA v3 §4.1: 창 다시 들어옴 반영(reread.ts) ---------- */
function fakeClock() {
  let now = 0;
  let seq = 0;
  const timers = new Map();
  return {
    now: () => now,
    set: (fn, ms) => { const id = ++seq; timers.set(id, { at: now + ms, fn }); return id; },
    clear: (id) => timers.delete(id),
    advance(ms) {
      const end = now + ms;
      for (;;) {
        let next = null;
        for (const [id, tm] of timers) if (tm.at <= end && (!next || tm.at < next[1].at)) next = [id, tm];
        if (!next) break;
        timers.delete(next[0]);
        now = next[1].at;
        next[1].fn();
      }
      now = end;
    },
  };
}
test('createReentryScheduler — 두 신호를 400ms로 합쳐 1번', async () => {
  const { createReentryScheduler } = await import('../dist/pure.mjs');
  const c = fakeClock();
  let runs = 0;
  const s = createReentryScheduler(() => runs++, () => false, c);
  s.signal(); // 포인터 들어옴
  c.advance(100);
  s.signal(); // 창 포커스 회복
  c.advance(399);
  assert.equal(runs, 0);
  c.advance(1);
  assert.equal(runs, 1);
  assert.equal(s.pending(), false);
});
test('createReentryScheduler — 2초 안 재진입은 버리지 않고 간격 끝에 1번만', async () => {
  const { createReentryScheduler } = await import('../dist/pure.mjs');
  const c = fakeClock();
  let runs = 0;
  const s = createReentryScheduler(() => runs++, () => false, c);
  s.signal();
  c.advance(400); // t=400 반영
  assert.equal(runs, 1);
  s.signal();
  c.advance(400); // t=800 — 간격(2초) 안: 미룬다
  assert.equal(runs, 1);
  s.signal();
  c.advance(400); // t=1200 — 여러 번 들어와도 미룬 반영은 1번
  assert.equal(runs, 1);
  c.advance(1200); // t=2400 — 간격이 찬 때(직전 반영 400 + 2000)
  assert.equal(runs, 2);
  c.advance(5000);
  assert.equal(runs, 2);
});
test('createReentryScheduler — 보류 중이면 미루고 풀리면 1번, cancel은 모두 버림', async () => {
  const { createReentryScheduler } = await import('../dist/pure.mjs');
  const c = fakeClock();
  let runs = 0;
  let held = true;
  const s = createReentryScheduler(() => runs++, () => held, c);
  s.signal();
  c.advance(400);
  assert.equal(runs, 0);
  assert.equal(s.pending(), true);
  held = false;
  s.release();
  assert.equal(runs, 1);
  s.release(); // 미뤄 둔 것이 없으면 아무것도 안 한다
  assert.equal(runs, 1);
  c.advance(3000);
  s.signal();
  s.cancel(); // 최소화
  c.advance(3000);
  assert.equal(runs, 1);
});
test('selectionSummary — 하위 수는 선택 자신을 뺀 수, capped면 +', async () => {
  const { selectionSummary } = await import('../dist/pure.mjs');
  assert.deepEqual(selectionSummary(0, 0, false), { kind: 'none', sub: '' });
  assert.deepEqual(selectionSummary(1, 43, false), { kind: 'one', sub: '42' });
  assert.deepEqual(selectionSummary(3, 3, false), { kind: 'many', sub: '0' });
  assert.deepEqual(selectionSummary(1, 5000, true), { kind: 'one', sub: '4999+' });
});

/* ---------- 일괄 교체: 후보 판정(scopes.ts) ---------- */
test('scopeFitsField — 스코프 판정 단위', async () => {
  const { scopeFitsField } = await import('../dist/pure.mjs');
  // 스코프 판정 단위
  assert.equal(scopeFitsField('effects', ['EFFECT_COLOR']), true);
  assert.equal(scopeFitsField('effects', ['ALL_FILLS']), false);
  assert.equal(scopeFitsField('fontFamily', ['FONT_FAMILY']), true);
  assert.equal(scopeFitsField('fontFamily', []), false);
});

/* ---------- 컬렉션 계층 판정(tiers.ts) ---------- */
test('tiers — 사용자 컬렉션은 내용으로 판단(§2.13 13.3): 판단할 변수 0개 → 이름 component → 별칭 비율(정수 경계)', async () => {
  const { judgeUserTier, hasComponentWord } = await import('../dist/pure.mjs');
  const S = (n, alias, target = 'other') => Array.from({ length: n }, (_, i) => (i < alias ? { alias: true, targetCollection: target } : { alias: false }));
  // 경계: 5a ≥ 4n → Semantic, 5a ≤ n → Global, 그 사이 계층 아님
  assert.deepEqual(judgeUserTier('Tokens', 'c', S(250, 200)), { tier: 2, why: { kind: 'ratio', alias: 200, counted: 250 } });
  assert.equal(judgeUserTier('Tokens', 'c', S(250, 199)).tier, 0);
  assert.equal(judgeUserTier('Prim', 'c', S(250, 50)).tier, 1);
  assert.equal(judgeUserTier('Prim', 'c', S(250, 51)).tier, 0);
  assert.equal(judgeUserTier('Primitives', 'c', S(40, 0)).tier, 1);
  assert.equal(judgeUserTier('Brand', 'c', S(10, 5)).tier, 0);
  // 라이브러리 · 삭제된 대상(null)도 별칭으로 센다
  assert.equal(judgeUserTier('Lib', 'c', S(10, 10, null)).tier, 2);
  // 같은 컬렉션 안을 가리키는 별칭은 세지 않는다 — Primitives 안 바로가기 때문에 흔들리지 않게
  const prim = [...S(8, 0), { alias: true, targetCollection: 'c' }, { alias: true, targetCollection: 'c' }, { alias: true, targetCollection: 'c' }];
  assert.deepEqual(judgeUserTier('Primitives', 'c', prim), { tier: 1, why: { kind: 'ratio', alias: 0, counted: 8 } });
  // 판단할 변수 0개가 이름보다 먼저 — 빈 Components는 계층 아님
  assert.deepEqual(judgeUserTier('Components', 'c', []), { tier: 0, why: { kind: 'empty', alias: 0, counted: 0 } });
  assert.equal(judgeUserTier('Components', 'c', [{ alias: true, targetCollection: 'c' }]).why.kind, 'empty');
  assert.deepEqual(judgeUserTier('Components', 'c', S(4, 0)), { tier: 3, why: { kind: 'name', alias: 0, counted: 4 } });
  assert.equal(judgeUserTier('Component', 'c', S(4, 4)).tier, 3);
  assert.equal(hasComponentWord('Button components'), true);
  assert.equal(hasComponentWord('Componentry'), false);
});

test('pickOwned — 표시 먼저, 없으면 표시 없는 정확한 이름(첫 번째), 한 컬렉션은 두 역할을 맡지 않음(§2.13 13.2)', async () => {
  const { pickOwned } = await import('../dist/pure.mjs');
  const m = (pairs) => (c) => pairs[c.id] ?? '';
  const cols = [{ id: 'g1', name: 'Global' }, { id: 'g2', name: 'Global' }, { id: 's', name: 'Semantic' }];
  let r = pickOwned(cols, m({}));
  assert.equal(r.global.id, 'g1'); // 같은 이름이면 첫 번째
  assert.equal(r.semantic.id, 's');
  // 표시가 있으면 이름과 관계없이 그것
  r = pickOwned([...cols, { id: 'x', name: 'Foundation' }], m({ x: 'global' }));
  assert.equal(r.global.id, 'x');
  // 이름을 Global로 바꾼 플러그인 Semantic은 global로 이어받지 않는다
  r = pickOwned([{ id: 'ps', name: 'Global' }], m({ ps: 'semantic' }));
  assert.equal(r.global, undefined);
  assert.equal(r.semantic.id, 'ps');
  // 같은 역할 표시가 둘이면 첫 번째만
  r = pickOwned([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }], m({ a: 'semantic', b: 'semantic' }));
  assert.equal(r.semantic.id, 'a');
});

/* ---------- 연결 목록 표시(bindDisplay.ts) ---------- */
test('groupBindLines — 같은 변수의 네 방향 여백·모서리를 한 줄로, 다른 변수는 따로, 순서 유지', async () => {
  const { groupBindLines, isHexColor } = await import('../dist/pure.mjs');
  const it = (field, variableId, index) => ({ field, index, variableId, variableName: variableId, currentValue: '8' });
  const lines = groupBindLines([
    it('fills', 'bg', 0),
    it('paddingLeft', 'lg'), it('paddingRight', 'lg'), // 좌우
    it('paddingTop', 'sm'), it('paddingBottom', 'sm'), // 위아래(다른 변수)
    it('itemSpacing', 'md'),
    it('topLeftRadius', 'r'), it('topRightRadius', 'r'), it('bottomRightRadius', 'r'), it('bottomLeftRadius', 'r'),
    it('strokes', 'line', 0),
  ]);
  assert.deepEqual(lines.map((l) => [l.label, l.variableId, l.fields.length]), [
    ['fills', 'bg', 1],
    ['paddingX', 'lg', 2],
    ['paddingY', 'sm', 2],
    ['itemSpacing', 'md', 1],
    ['radius', 'r', 4],
    ['strokes', 'line', 1],
  ]);
  // 네 방향 같은 변수 → '여백', 한 방향 → 그 방향, 세 방향 → '일부'
  assert.equal(groupBindLines(['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'].map((f) => it(f, 'x')))[0].label, 'padding');
  assert.equal(groupBindLines([it('paddingLeft', 'x')])[0].label, 'paddingLeft');
  assert.equal(groupBindLines(['paddingTop', 'paddingRight', 'paddingLeft'].map((f) => it(f, 'x')))[0].label, 'paddingSome');
  assert.equal(groupBindLines([it('topLeftRadius', 'x'), it('bottomLeftRadius', 'x')])[0].label, 'radiusSome');
  // 같은 필드라도 페인트 순번이 다르면 따로(채움 두 겹)
  assert.equal(groupBindLines([it('fills', 'a', 0), it('fills', 'a', 1)]).length, 2);
  // 합쳐진 줄은 원래 항목을 모두 들고 있다(체크·교체 대상)
  assert.equal(lines[1].items.length, 2);
  assert.equal(isHexColor('#2563eb'), true);
  assert.equal(isHexColor('24'), false);
});

/* ---------- 변수 관리 표(varTable.ts) ---------- */
test('varTable — 그룹 경로·복사 문자열', async () => {
  const { groupPath, leafName, cssVarName } = await import('../dist/pure.mjs');
  assert.equal(groupPath('color/background/default'), 'color/background');
  assert.equal(leafName('color/background/default'), 'default');
  assert.equal(groupPath('primary'), '');
  // 복사 문자열
  assert.equal(cssVarName('color/background/default'), '--color-background-default');
});

/* ---------- IA v3 §4.4 변수 목록(varTable.ts) ---------- */
const V = (id, name, collectionId, values = {}) => ({ id, name, collectionId, type: 'FLOAT', values, scopes: [], description: '' });
const COLS = [
  { id: 'g', name: 'Global', tier: 1, modes: [{ modeId: 'm', name: 'Mode 1' }] },
  { id: 'x', name: 'Misc', tier: 0, modes: [{ modeId: 'm', name: 'Mode 1' }] },
  { id: 's', name: 'Semantic', tier: 2, modes: [{ modeId: 'm', name: 'Mode 1' }] },
  { id: 'c', name: 'Comp', tier: 3, modes: [{ modeId: 'm', name: 'Mode 1' }] },
  { id: 'q', name: 'Other', tier: 0, modes: [{ modeId: 'm', name: 'Mode 1' }] },
];
test('orderCollections · tierBadge — C → S → G → 계층 없음(피그마 순서), 배지 G/S/C/–("?" 없음)', async () => {
  const { orderCollections, tierBadge } = await import('../dist/pure.mjs');
  assert.deepEqual(orderCollections(COLS).map((c) => c.id), ['c', 's', 'g', 'x', 'q']);
  assert.deepEqual(COLS.map(tierBadge), ['G', '–', 'S', 'C', '–']);
});
test('tierWhyText — 배지 툴팁 다섯 문구(§4.4), 근거 없으면 undefined', async () => {
  const { tierWhyText } = await import('../dist/pure.mjs');
  assert.equal(tierWhyText({ tier: 1, tierWhy: { kind: 'owned' } }), '플러그인 컬렉션');
  assert.equal(tierWhyText({ tier: 0, tierWhy: { kind: 'empty', alias: 0, counted: 0 } }), '판단할 변수 없음 · 계층 아님');
  assert.equal(tierWhyText({ tier: 3, tierWhy: { kind: 'name', alias: 0, counted: 4 } }), '이름 · Component');
  assert.equal(tierWhyText({ tier: 2, tierWhy: { kind: 'ratio', alias: 45, counted: 48 } }), '별칭 45/48 · Semantic');
  assert.equal(tierWhyText({ tier: 0, tierWhy: { kind: 'ratio', alias: 5, counted: 10 } }), '별칭 5/10 · 계층 아님');
  assert.equal(tierWhyText({ tier: 1, tierWhy: { kind: 'ratio', alias: 0, counted: 40 } }), '직접 값 40/40 · Global');
  assert.equal(tierWhyText({ tier: 1 }), undefined);
});
test('groupKey · matchesQuery — 키는 컬렉션+경로, 검색은 전체 경로 부분 일치·대소문자 무시', async () => {
  const { groupKey, matchesQuery } = await import('../dist/pure.mjs');
  assert.equal(groupKey('g', 'color/gray/500'), 'g|color/gray');
  assert.notEqual(groupKey('g', 'color/gray/500'), groupKey('s', 'color/gray/500'));
  assert.equal(groupKey('g', 'radius'), 'g|');
  assert.equal(matchesQuery('color/Text/default', 'text/DEF'), true);
  assert.equal(matchesQuery('color/text/default', 'blue'), false);
  assert.equal(matchesQuery('anything', '  '), true);
});
test('buildList — 사용 판정 있음: 쓰는 행만, 안 쓰는 그룹은 구역 끝 한 줄', async () => {
  const { buildList } = await import('../dist/pure.mjs');
  const vars = [V('a', 'space/1', 'g'), V('b', 'space/2', 'g'), V('c', 'radius/1', 'g'), V('d', 'text/default', 's'), V('e', 'solo', 's')];
  const e = buildList({ collections: COLS, vars, chip: 'all', query: '', direct: new Map([['d', 3]]), indirect: new Set(['a']), userExpanded: new Map(), showUnusedIn: new Set(), showUnusedGroups: new Set() });
  const kinds = e.map((x) => x.kind === 'row' ? `row:${x.v.id}:${x.state}` : x.kind === 'group' ? `group:${x.label}:${x.used}/${x.total}:+${x.unused}` : x.kind === 'section' ? `section:${x.collection.id}:${x.used}/${x.total}` : `unused:${x.collectionId}:${x.count}`);
  assert.deepEqual(kinds, [
    'section:c:0/0', 'section:s:1/2', 'group:text:1/1:+0', 'row:d:direct', 'unused:s:1',
    'section:g:1/3', 'group:space:1/2:+1', 'row:a:indirect', 'unused:g:1',
    'section:x:0/0', 'section:q:0/0',
  ]);
});
test('buildList — 안 씀 펼치기·안 쓰는 그룹 펼치기·사용자 접기', async () => {
  const { buildList } = await import('../dist/pure.mjs');
  const vars = [V('a', 'space/1', 'g'), V('b', 'space/2', 'g'), V('c', 'radius/1', 'g')];
  const base = { collections: COLS.filter((c) => c.id === 'g'), vars, chip: 'all', query: '', direct: new Map([['a', 1]]), indirect: new Set(), userExpanded: new Map(), showUnusedIn: new Set(), showUnusedGroups: new Set() };
  const rows = (e) => e.filter((x) => x.kind === 'row').map((x) => `${x.v.id}:${x.state}`);
  assert.deepEqual(rows(buildList({ ...base, showUnusedIn: new Set(['g|space']) })), ['a:direct', 'b:unused']);
  const reveal = buildList({ ...base, showUnusedGroups: new Set(['g']) });
  assert.ok(reveal.some((x) => x.kind === 'group' && x.label === 'radius' && !x.expanded));
  assert.deepEqual(rows(buildList({ ...base, showUnusedGroups: new Set(['g']), userExpanded: new Map([['g|radius', true]]) })), ['a:direct', 'c:unused']);
  assert.deepEqual(rows(buildList({ ...base, userExpanded: new Map([['g|space', false]]) })), []);
});
test('buildList — 판정 없음: 그룹 10개 이하 펼침 / 넘으면 접힘, 검색은 모두 보임, "(그룹 없음)"', async () => {
  const { buildList, NO_GROUP } = await import('../dist/pure.mjs');
  const few = [V('a', 'space/1', 'g'), V('b', 'solo', 'g')];
  const base = { collections: COLS.filter((c) => c.id === 'g'), chip: 'all', query: '', direct: null, indirect: new Set(), userExpanded: new Map(), showUnusedIn: new Set(), showUnusedGroups: new Set() };
  const e = buildList({ ...base, vars: few });
  assert.deepEqual(e.filter((x) => x.kind === 'row').map((x) => x.state), ['none', 'none']);
  assert.ok(e.some((x) => x.kind === 'group' && x.label === NO_GROUP));
  const many = Array.from({ length: 11 }, (_, i) => V(`v${i}`, `grp${i}/x`, 'g'));
  assert.equal(buildList({ ...base, vars: many }).filter((x) => x.kind === 'row').length, 0);
  const found = buildList({ ...base, vars: many, query: 'GRP3/' });
  assert.deepEqual(found.filter((x) => x.kind === 'row').map((x) => x.v.id), ['v3']);
  // 검색 중에는 판정이 있어도 안 쓰는 행까지 보인다
  const s2 = buildList({ ...base, vars: few, direct: new Map(), query: 'space' });
  assert.deepEqual(s2.filter((x) => x.kind === 'row').map((x) => x.state), ['unused']);
  // 칩: 다른 컬렉션은 빠진다
  assert.equal(buildList({ ...base, collections: COLS, vars: few, chip: 's' }).filter((x) => x.kind === 'section').length, 1);
});

test('groupByVariable — 변수별 묶음 · 곳 수 많은 순 · 네 방향 여백 한 줄 · 변수 값', async () => {
  const { groupByVariable, placeKey } = await import('../dist/pure.mjs');
  const c = (nodeId, field, variableId, variableName, currentValue, extra = {}) => ({ nodeId, field, variableId, variableName, currentValue, ...extra });
  const groups = groupByVariable([
    c('card', 'fills', 'vC', 'color/bg/surface', '#ffffff', { index: 0 }),
    c('card', 'topLeftRadius', 'vR', 'radius/4', '4', { variableValue: '4' }),
    c('badge', 'paddingLeft', 'v16', 'spacing/16', '16'),
    c('badge', 'paddingRight', 'v16', 'spacing/16', '16'),
    c('title', 'fills', 'vC', 'color/bg/surface', '#ffffff', { index: 0 }),
    c('footer', 'fills', 'vC', 'color/bg/surface', '#ffffff', { index: 0 }),
  ]);
  assert.deepEqual(groups.map((g) => [g.variableName, g.count]), [['color/bg/surface', 3], ['spacing/16', 2], ['radius/4', 1]]);
  assert.deepEqual(groups[0].lines.map((l) => l.nodeId), ['card', 'title', 'footer'], '자리 줄은 들어온 순서');
  assert.equal(groups[1].lines.length, 1, '좌우 여백은 한 줄');
  assert.equal(groups[1].lines[0].label, 'paddingX');
  assert.equal(groups[1].lines[0].keys.length, 2, '한 줄이 2곳');
  assert.equal(groups[2].variableValue, '4', '변수 값은 variableValue');
  assert.equal('distance' in groups[2].lines[0], false, '허용오차 삭제 — 차이 표시 없음');
  assert.equal(groups[0].variableValue, '#ffffff', '변수 값이 없으면 후보의 값');
  assert.equal(groups[0].keys[0], placeKey({ nodeId: 'card', field: 'fills', index: 0, variableId: 'vC' }));
  // 곳 수가 같으면 이름 순
  const tie = groupByVariable([c('a', 'width', 'v2', 'size/b', '8'), c('a', 'height', 'v1', 'size/a', '8')]);
  assert.deepEqual(tie.map((g) => g.variableName), ['size/a', 'size/b']);
});

test('carryChecks — 체크는 변수 단위로 이어받음: 푼 변수의 새 곳은 체크 안 함, 새 변수는 체크, 추가·제외는 곳 단위', async () => {
  const { carryChecks, placeKey } = await import('../dist/pure.mjs');
  const c = (nodeId, field, variableId) => ({ nodeId, field, variableId, variableName: variableId, currentValue: '1' });
  const prev = [c('a', 'width', 'v8'), c('b', 'width', 'v8'), c('a', 'height', 'v4'), c('x', 'width', 'v2')];
  const prevChecked = new Set([placeKey(c('a', 'height', 'v4'))]); // v8 전부 풀림, v2 풀림
  const next = [
    c('a', 'width', 'v8'), // 같은 곳(풀림 유지)
    c('c', 'width', 'v8'), // 새 곳 — v8은 전부 풀려 있었다 → 체크 안 함
    c('a', 'height', 'v4'), // 같은 곳(체크 유지)
    c('d', 'height', 'v4'), // 새 곳 — v4는 체크가 있었다 → 체크
    c('e', 'width', 'v99'), // 새 묶음 → 체크
    c('b', 'width', 'v4'), // b.width의 변수가 v8 → v4로 바뀜: 추가 1 + 제외 1
  ];
  const r = carryChecks(prev, prevChecked, next);
  assert.deepEqual([...r.checked].sort(), [placeKey(c('a', 'height', 'v4')), placeKey(c('b', 'width', 'v4')), placeKey(c('d', 'height', 'v4')), placeKey(c('e', 'width', 'v99'))].sort());
  assert.equal(r.added, 4);
  assert.equal(r.removed, 2, 'b.width(v8) · x.width(v2)');
});

test('fieldIcon — 자리 줄 속성 아이콘(§4.6 표), 표에 없는 필드는 "·"', async () => {
  const { fieldIcon } = await import('../dist/pure.mjs');
  const cases = {
    fills: '▣', strokes: '▢', strokeWeight: '┃', strokeLeftWeight: '┃', cornerRadius: '◰', topLeftRadius: '◰',
    paddingTop: '⇔', itemSpacing: '⇔', counterAxisSpacing: '⇔', gridRowGap: '⇔', gridColumnGap: '⇔',
    width: '↔', height: '↔', minWidth: '↔', maxHeight: '↔', opacity: '◑',
    fontSize: 'T', lineHeight: 'T', letterSpacing: 'T', fontFamily: 'T', paragraphSpacing: 'T', effects: '◐', somethingNew: '·',
  };
  for (const [f, ic] of Object.entries(cases)) assert.equal(fieldIcon(f), ic, f);
});





/* ---------- 변수 고치기(§4.4 고치기 · PR 3.5) ---------- */
const edCols = [
  { id: 'g', name: 'Global', tier: 1, modes: [{ modeId: 'm', name: 'Mode 1' }], defaultModeId: 'm' },
  { id: 's', name: 'Semantic', tier: 2, modes: [{ modeId: 'l', name: 'Light' }, { modeId: 'd', name: 'Dark' }], defaultModeId: 'l' },
  { id: 'c', name: 'Component', tier: 3, modes: [{ modeId: 'c1', name: 'Mode 1' }], defaultModeId: 'c1' },
  { id: 'x', name: 'Misc', tier: 0, modes: [{ modeId: 'x1', name: 'Mode 1' }], defaultModeId: 'x1' },
];
const ev = (id, name, collectionId, type, values) => ({ id, name, collectionId, type, values, scopes: [], description: '' });
const edVars = [
  ev('g0', 'gray/0', 'g', 'COLOR', { m: { kind: 'color', hex: '#FFFFFF' } }),
  ev('g9', 'gray/900', 'g', 'COLOR', { m: { kind: 'color', hex: '#111111', alpha: 0.5 } }),
  ev('sp', 'space/8', 'g', 'FLOAT', { m: { kind: 'number', text: '8' } }),
  ev('tx', 'color/text/default', 's', 'COLOR', { l: { kind: 'alias', aliasId: 'g9', aliasName: 'gray/900' }, d: { kind: 'alias', aliasId: 'g0', aliasName: 'gray/0' } }),
  ev('tm', 'color/text/muted', 's', 'COLOR', { l: { kind: 'alias', aliasId: 'g9', aliasName: 'gray/900' } }),
  ev('bt', 'button/bg', 'c', 'COLOR', { c1: { kind: 'alias', aliasId: 'tx', aliasName: 'color/text/default' } }),
  ev('xa', 'a', 'x', 'COLOR', { x1: { kind: 'alias', aliasId: 'xb', aliasName: 'b' } }),
  ev('xb', 'b', 'x', 'COLOR', { x1: { kind: 'color', hex: '#FF0000' } }),
  ev('xl', 'lib', 'x', 'COLOR', { x1: { kind: 'alias', aliasId: 'R', aliasName: 'core/x', remote: true } }),
];

test('normalizeVarName · nameError — 토막 공백 정리, 빈 토막, 같은 컬렉션 같은 이름(대소문자까지)', async () => {
  const { normalizeVarName, nameError } = await import('../dist/pure.mjs');
  assert.equal(normalizeVarName('  color/ text /default '), 'color/text/default');
  const self = edVars[3];
  assert.equal(nameError('', self, edVars), 'emptySegment');
  assert.equal(nameError('a//b', self, edVars), 'emptySegment');
  assert.equal(nameError('/a', self, edVars), 'emptySegment');
  assert.equal(nameError('a/', self, edVars), 'emptySegment');
  assert.equal(nameError('color/ text/muted', self, edVars), 'duplicate', '정리한 이름으로 검사');
  assert.equal(nameError('color/text/Muted', self, edVars), null, '대소문자가 다르면 같은 이름이 아니다');
  assert.equal(nameError('gray/0', self, edVars), null, '다른 컬렉션은 상관없다');
  assert.equal(nameError('color/text/default', self, edVars), null, '자기 자신');
});

test('groupMove · cssRename — 그룹 이동(새 그룹 · 비는 그룹), CSS 이름이 다를 때만 + 같아지는 변수', async () => {
  const { groupMove, cssRename, cssVarName } = await import('../dist/pure.mjs');
  const self = edVars[3];
  assert.equal(groupMove(self.name, 'color/text/primary', self, edVars), null, '그룹이 같으면 없음');
  assert.deepEqual(groupMove(self.name, 'color/fg/default', self, edVars), { from: 'color/text', to: 'color/fg', newGroup: true, emptied: false });
  const lone = edVars[4];
  assert.deepEqual(groupMove(lone.name, 'color/fg/muted', lone, edVars.filter((v) => v.id !== 'tx')), { from: 'color/text', to: 'color/fg', newGroup: true, emptied: true });
  assert.deepEqual(groupMove(self.name, 'default', self, edVars), { from: 'color/text', to: '(그룹 없음)', newGroup: true, emptied: false });
  assert.equal(groupMove(self.name, 'color/text/x', self, edVars), null);
  assert.equal(cssRename('a/b', 'a/b', 'z', edVars, cssVarName), null);
  assert.deepEqual(cssRename(self.name, 'color/fg/default', 'tx', edVars, cssVarName), { from: '--color-text-default', to: '--color-fg-default' });
  assert.deepEqual(cssRename(self.name, 'gray/0', 'tx', edVars, cssVarName), { from: '--color-text-default', to: '--gray-0', clash: 'gray/0' }, '다른 컬렉션도 본다');
});

test('입력 검사 · 비교 — #RRGGBB(AA), 숫자, 정규화한 값 비교', async () => {
  const { parseColorInput, parseNumberInput, colorText, cellInputText, sameCell } = await import('../dist/pure.mjs');
  assert.deepEqual(parseColorInput('#ffffff'), { hex: '#FFFFFF', alpha: 1 });
  assert.deepEqual(parseColorInput(' 112233 '), { hex: '#112233', alpha: 1 });
  assert.equal(Math.round(parseColorInput('#11223380').alpha * 255), 128);
  assert.equal(parseColorInput('#FFFFF'), null);
  assert.equal(parseColorInput('#GGGGGG'), null);
  assert.equal(parseNumberInput('1.0'), 1);
  assert.equal(parseNumberInput(''), null);
  assert.equal(parseNumberInput('abc'), null);
  assert.equal(colorText('#ffffff'), '#FFFFFF');
  assert.equal(colorText('#000000', 128 / 255), '#00000080');
  assert.equal(cellInputText({ kind: 'color', hex: '#abcdef', alpha: 0.5 }), '#ABCDEF80');
  assert.equal(cellInputText({ kind: 'number', text: '8' }), '8');
  assert.ok(sameCell({ kind: 'color', hex: '#ffffff' }, { kind: 'color', hex: '#FFFFFF', alpha: 1 }), '#ffffff = #FFFFFF');
  assert.ok(!sameCell({ kind: 'color', hex: '#FFFFFF' }, { kind: 'color', hex: '#FFFFFF', alpha: 0.5 }));
  assert.ok(sameCell({ kind: 'color', hex: '#000000', alpha: 128 / 255 }, { kind: 'color', hex: '#000000', alpha: 0.5 }), '투명도는 0–255 정수로');
  assert.ok(sameCell({ kind: 'number', text: '1' }, { kind: 'number', value: 1.0 }), '1 = 1.0');
  assert.ok(sameCell({ kind: 'bool', text: 'true' }, { kind: 'bool', value: true }));
  assert.ok(sameCell({ kind: 'alias', aliasId: 'a', aliasName: 'x' }, { kind: 'alias', aliasId: 'a', aliasName: 'renamed' }), '별칭은 대상 id');
  assert.ok(sameCell(undefined, null));
  assert.ok(!sameCell(undefined, { kind: 'string', text: '' }));
});

test('resolveEditValue — 별칭은 대상 컬렉션 기본 모드, 로컬만 최대 5단계', async () => {
  const { resolveEditValue } = await import('../dist/pure.mjs');
  assert.deepEqual(resolveEditValue({ kind: 'alias', aliasId: 'tx' }, edCols, edVars), { kind: 'color', hex: '#111111', alpha: 0.5 }, 'tx의 기본 모드(Light) → g9');
  assert.equal(resolveEditValue({ kind: 'alias', aliasId: 'R' }, edCols, edVars), null, '라이브러리');
  assert.equal(resolveEditValue({ kind: 'alias', aliasId: 'gone' }, edCols, edVars), null, '삭제됨');
  assert.deepEqual(resolveEditValue({ kind: 'number', text: '4' }, edCols, edVars), { kind: 'number', text: '4' });
  const chain = Array.from({ length: 7 }, (_, i) => ev(`k${i}`, `k${i}`, 'x', 'FLOAT', { x1: i === 6 ? { kind: 'number', text: '1' } : { kind: 'alias', aliasId: `k${i + 1}` } }));
  assert.deepEqual(resolveEditValue({ kind: 'alias', aliasId: 'k2' }, edCols, chain), { kind: 'number', text: '1' }, '5단계');
  assert.equal(resolveEditValue({ kind: 'alias', aliasId: 'k0' }, edCols, chain), null, '6단계는 따라가지 않는다');
});

test('aliasCandidates — 같은 타입 · 계층 규칙 · 자기/순환 제외 · Global 없음 · 계층 없음은 전부 · 검색', async () => {
  const { aliasCandidates } = await import('../dist/pure.mjs');
  const ids = (r) => r.groups.flatMap((g) => g.rows.map((x) => x.id));
  const byId = (id) => edVars.find((v) => v.id === id);
  const s = aliasCandidates(byId('tx'), edCols, edVars);
  assert.deepEqual(ids(s), ['g0', 'g9'], 'Semantic → Global 색만(숫자 · 같은 계층 · 계층 없음 제외)');
  assert.deepEqual(s.groups.map((g) => g.label), ['G Global › gray']);
  assert.deepEqual(ids(aliasCandidates(byId('bt'), edCols, edVars)), ['tx', 'tm', 'g0', 'g9'], 'Component → Semantic · Global(사이드바 순서)');
  const g = aliasCandidates(byId('g0'), edCols, edVars);
  assert.ok(g.global && !g.groups.length, 'Global은 후보 없음');
  const x = aliasCandidates(byId('xb'), edCols, edVars);
  assert.ok(x.allTiers);
  assert.deepEqual(ids(x).sort(), ['bt', 'g0', 'g9', 'tm', 'tx', 'xl'].sort(), '계층 없음 → 모든 컬렉션, 자기(xb) · 순환(xa→xb) 제외');
  assert.ok(!ids(aliasCandidates(byId('g9'), edCols, edVars)).length);
  // tx를 고칠 때 bt(→tx)는 순환 — 계층 없는 컬렉션에서 확인
  const cyc = [...edVars, ev('xc', 'c', 'x', 'COLOR', { x1: { kind: 'alias', aliasId: 'bt' } })];
  assert.ok(ids(aliasCandidates(byId('xa'), edCols, cyc)).includes('xb') && ids(aliasCandidates(byId('xa'), edCols, cyc)).includes('xc'), '지금 대상(xb)을 다시 고르는 것은 순환이 아니다');
  assert.ok(!ids(aliasCandidates({ ...byId('tx'), collectionId: 'x' }, edCols, cyc)).includes('xc'), 'xc → bt → tx: 순환');
  assert.deepEqual(ids(aliasCandidates(byId('bt'), edCols, edVars, 'GRAY/9')), ['g9'], '검색은 전체 경로 · 대소문자 무시');
});

/* ---------- IA v4 §4.1 — 선택 탭 카드 숫자 ---------- */
test('fieldKind — 찾기 속성 → 종류', () => {
  assert.equal(fieldKind('itemSpacing'), 'gap');
  assert.equal(fieldKind('paddingLeft'), 'gap');
  assert.equal(fieldKind('topLeftRadius'), 'radius');
  assert.equal(fieldKind('width'), 'size');
  assert.equal(fieldKind('strokeTopWeight'), 'stroke');
  assert.equal(fieldKind('opacity'), 'opacity');
  assert.equal(fieldKind('effects'), 'color');
  assert.equal(fieldKind('fontFamily'), 'text');
  assert.equal(fieldKind(undefined), 'other');
});
// S-2(ia-v4 §2.9 S2-P7)로 고쳐 씀: k · u · noVarByKind는 없어지고, n = 새로 만들 값의 수(값 단위 — `make` 목록) · q = 그 자리 수다.
// 사유 수(`no-match` — 글자 자리 포함)로는 n을 세지 않는다.
test('cardCounts — m · s · n · q: n · q는 make 목록에서만, 레이어 단위 사유와 already-bound는 s에서 뺀다', () => {
  const counts = {
    'no-match': { color: 2, gap: 1, text: 4 },
    'size-fraction': { size: 1 },
    styled: { color: 1 },
    'already-bound': { color: 5 },
    'instance-children': { other: 9 },
    font: { other: 2 },
  };
  const make = [
    { kind: 'color', value: '#111111', by: { 'ALL_FILLS|FRAME_FILL': 1, STROKE_COLOR: 1 } }, // 칠 · 선이 한 값
    { kind: 'gap', value: 16, by: { GAP: 1 } },
  ];
  const c = cardCounts(['fills', 'fills', 'itemSpacing'], counts, make);
  assert.equal(c.m, 3);
  assert.equal(c.n, 2); // 값 단위 — 자리 3곳이 값 2개
  assert.equal(c.q, 3);
  assert.equal(c.s, 1); // styled(스타일 사용 중)는 s에 넣지 않는다 — 칩으로만(§4.1 · §4.2 INFO_SKIP_REASONS)
  assert.deepEqual(c.byKind, [{ kind: 'gap', n: 1 }, { kind: 'color', n: 2 }]); // 연결할 곳만
  assert.deepEqual(cardCounts([], undefined), { m: 0, s: 0, n: 0, q: 0, byKind: [] });
  // make가 없으면 no-match 사유가 있어도 n = 0(후보 없는 글자 자리만 남은 선택 — SC-D32 ⑥)
  assert.equal(cardCounts([], { 'no-match': { text: 4 } }).n, 0);
  assert.equal('k' in c || 'u' in c || 'noVarByKind' in c, false);
});

test('cardCounts — 라이브러리 같은 값: 같은 값 · 그 묶음 용도를 받는 라이브러리 변수가 있는 묶음은 q에서 빼고, 묶음이 안 남는 값은 n에서 뺀다(S2-P7)', () => {
  const make = [
    { kind: 'color', value: '#111111', by: { 'ALL_FILLS|FRAME_FILL': 3, STROKE_COLOR: 2 } },
    { kind: 'radius', value: 8, by: { CORNER_RADIUS: 4 } },
    { kind: 'gap', value: 8, by: { GAP: 2 } },
  ];
  const libs = [
    { type: 'COLOR', value: { kind: 'color', hex: '#111111' }, scopes: ['ALL_FILLS'] }, // 칠 묶음만 받음
    { type: 'FLOAT', value: { kind: 'number', text: '8' }, scopes: ['CORNER_RADIUS'] }, // 반경 8 — 간격 8은 받지 않음
  ];
  const c = cardCounts([], undefined, make, libs);
  assert.equal(c.n, 2); // 색(선 묶음이 남음) · 간격 8. 반경 8은 묶음이 다 빠져 n에서 빠짐
  assert.equal(c.q, 4); // 선 2 + 간격 2
  assert.equal(cardCounts([], undefined, make).q, 11);
});

test('linkPlacesForMake — 카드 p의 "연결할 곳" 몫: 글자 · 라이브러리 같은 값 묶음 · 추출이 토큰을 내지 않는 자리를 뺀다(S2-P7 · M5 · N1)', () => {
  const cands = [
    { nodeId: 'f', field: 'fills', currentValue: '#111111' },
    { nodeId: 't', field: 'fills', currentValue: '#111111' },
    { nodeId: 'f', field: 'paddingLeft', currentValue: '0' }, // 여백 0 + 사용자 0 변수 — m에는 들고 p에서는 빠짐
    { nodeId: 'f', field: 'itemSpacing', currentValue: '12.5' }, // 소수 간격
    { nodeId: 'f', field: 'itemSpacing', currentValue: '-4' },
    { nodeId: 'f', field: 'topLeftRadius', currentValue: '12.5', pillFrom: 12.5 }, // 알약으로 판정된 자리 — 값은 9999라 든다
    { nodeId: 'f', field: 'topRightRadius', currentValue: '12.5' }, // 알약이 아닌 것으로 판정된 소수 반경
    { nodeId: 'f', field: 'opacity', currentValue: '0.5' },
    { nodeId: 't', field: 'fontSize', currentValue: '14' }, // 글자 종류는 처음부터 p에 없다
    { nodeId: 'f', field: 'width', currentValue: '24' },
  ];
  const typeOf = (id) => (id === 't' ? 'TEXT' : 'FRAME');
  assert.equal(linkPlacesForMake(cands, typeOf), 5); // 칠 2 · 알약 1 · 투명도 1 · 크기 1
  // 프레임 칠 묶음만 받는 라이브러리 같은 값 → 프레임의 칠 자리만 빠진다(글자 칠은 TEXT_FILL 묶음)
  const libs = [{ type: 'COLOR', value: { kind: 'color', hex: '#111111' }, scopes: ['FRAME_FILL'] }];
  assert.equal(linkPlacesForMake(cands, typeOf, libs), 4);
  assert.equal(placeGroupKey('fills', 'TEXT'), 'ALL_FILLS|TEXT_FILL');
  assert.equal(placeGroupKey('strokes', 'FRAME'), 'STROKE_COLOR');
  assert.equal(placeGroupKey('topLeftRadius', 'FRAME'), 'CORNER_RADIUS');
});

test('groupByVarKind · carryRowChecks — (변수, 종류) 줄 · 종류 순서 · 줄 단위 스위치 이어받기(IA v4 §4.2)', async () => {
  const { groupByVarKind, carryRowChecks, placeKey } = await import('../dist/pure.mjs');
  const c = (nodeId, field, variableId, extra = {}) => ({ nodeId, field, variableId, variableName: variableId, currentValue: '8', ...extra });
  const cands = [
    c('a', 'fills', 'vC', { index: 0, currentValue: '#ffffff' }),
    c('a', 'itemSpacing', 'v8'),
    c('b', 'itemSpacing', 'v8'),
    c('a', 'topLeftRadius', 'v8'), // 같은 변수가 다른 종류 → 줄이 따로
  ];
  const rows = groupByVarKind(cands);
  assert.deepEqual(rows.map((r) => [r.kind, r.variableId, r.count]), [['gap', 'v8', 2], ['radius', 'v8', 1], ['color', 'vC', 1]]);
  assert.notEqual(rows[0].rowKey, rows[1].rowKey);
  // radius 줄만 끔 → 다시 찾아도 radius 줄은 꺼진 채, gap 줄의 새 곳은 켬, 새 변수는 켬
  const prevChecked = new Set([...rows[0].keys, ...rows[2].keys]);
  const next = [...cands, c('c', 'itemSpacing', 'v8'), c('b', 'topLeftRadius', 'v8'), c('a', 'strokeWeight', 'v1')];
  const r = carryRowChecks(cands, prevChecked, next);
  assert.ok(r.checked.has(placeKey(c('c', 'itemSpacing', 'v8'))));
  assert.ok(!r.checked.has(placeKey(c('b', 'topLeftRadius', 'v8'))));
  assert.ok(!r.checked.has(placeKey(c('a', 'topLeftRadius', 'v8'))));
  assert.ok(r.checked.has(placeKey(c('a', 'strokeWeight', 'v1'))));
  assert.equal(r.added, 3);
  assert.equal(r.removed, 0);
});

test('varKind — 종류 판정 1~5(IA v4 §4.6)', async () => {
  const { varKind } = await import('../dist/pure.mjs');
  const k = (name, type, scopes = []) => varKind({ name, type, scopes });
  assert.equal(k('color/bg', 'COLOR'), 'color');
  assert.equal(k('flag', 'BOOLEAN'), 'other');
  assert.equal(k('spacing/16', 'FLOAT'), 'gap');
  assert.equal(k('radius/120', 'FLOAT'), 'radius');
  assert.equal(k('font-family/body', 'STRING'), 'text');
  assert.equal(k('button/padding-x', 'FLOAT'), 'gap', '판정 3 — 끝 마디');
  assert.equal(k('button/font-size', 'FLOAT'), 'text');
  assert.equal(k('avatar/size', 'FLOAT'), 'size');
  assert.equal(k('card/radius-top-left', 'FLOAT'), 'radius');
  assert.equal(k('foo/bar', 'FLOAT', ['CORNER_RADIUS']), 'radius', '판정 4 — 용도 한 종류');
  assert.equal(k('foo/bar', 'FLOAT', ['GAP', 'CORNER_RADIUS']), 'other', '용도가 둘이면 기타');
  assert.equal(k('foo/bar', 'FLOAT', ['FONT_SIZE', 'LINE_HEIGHT']), 'text', '글자 용도 여럿은 한 종류');
});

test('scopeFits · targetAllowed — 피그마 뜻(ALL_SCOPES = 모두, [] = 없음, ALL_FILLS 펼침, §4.7 · §4.8)', async () => {
  const { scopeFits, targetAllowed } = await import('../dist/pure.mjs');
  assert.equal(scopeFits(['CORNER_RADIUS'], ['CORNER_RADIUS']), true);
  assert.equal(scopeFits(['CORNER_RADIUS'], ['FONT_SIZE']), false);
  assert.equal(scopeFits(['CORNER_RADIUS'], ['ALL_SCOPES']), true, '후보 ALL_SCOPES는 맞음');
  assert.equal(scopeFits(['CORNER_RADIUS'], []), false, '후보 빈 용도는 안 맞음');
  assert.equal(scopeFits([], ['FONT_SIZE']), true, '자기 용도가 비면 거르지 않음');
  assert.equal(scopeFits(['ALL_SCOPES'], []), true, '자기 ALL_SCOPES면 거르지 않음');
  assert.equal(scopeFits(['TEXT_FILL'], ['ALL_FILLS']), true, 'ALL_FILLS 펼침');
  assert.equal(scopeFits(['ALL_FILLS'], ['STROKE_COLOR']), false);
  assert.equal(targetAllowed(['ALL_SCOPES'], 'shadow'), true);
  assert.equal(targetAllowed([], 'fill'), false);
  assert.equal(targetAllowed(['ALL_FILLS'], 'text'), true);
  assert.equal(targetAllowed(['ALL_FILLS'], 'stroke'), false);
  assert.equal(targetAllowed(['GAP'], 'padding-left'), true);
});

test('scopesForNew · duplicateName — 새 변수 용도 · 복제 이름(§4.9)', async () => {
  const { scopesForNew, duplicateName } = await import('../dist/pure.mjs');
  assert.deepEqual(scopesForNew('spacing/8', 'FLOAT'), ['GAP']);
  assert.deepEqual(scopesForNew('brand/primary', 'COLOR'), ['ALL_FILLS', 'STROKE_COLOR', 'EFFECT_COLOR']);
  assert.deepEqual(scopesForNew('body/line-height', 'FLOAT'), ['LINE_HEIGHT']);
  assert.equal(scopesForNew('misc/thing', 'FLOAT'), undefined, '기타 — 용도 설정 안 함');
  assert.equal(scopesForNew('flag', 'BOOLEAN'), undefined);
  assert.equal(duplicateName('a/b', new Set(['a/b'])), 'a/b-copy');
  assert.equal(duplicateName('a/b', new Set(['a/b', 'a/b-copy'])), 'a/b-copy-2');
  assert.equal(duplicateName('a/b', new Set(['a/b', 'a/b-copy', 'a/b-copy-2', 'A/B-COPY-3'])), 'a/b-copy-3', '대소문자까지 같을 때만 겹침');
});

test('paletteGroups — 종류 순서 · 피그마 순서 · "/" 없는 변수 맨 위 · 검색은 모든 컬렉션(§4.6)', async () => {
  const { paletteGroups } = await import('../dist/pure.mjs');
  const cols = [
    { id: 'g', name: 'Global', tier: 1, modes: [{ modeId: 'm', name: 'M' }], defaultModeId: 'm' },
    { id: 's', name: 'Semantic', tier: 2, modes: [{ modeId: 'm2', name: 'M' }], defaultModeId: 'm2' },
  ];
  const v = (id, name, type, col = 'g') => ({ id, name, type, collectionId: col, values: {}, scopes: [], description: '' });
  const vars = [v('1', 'color/gray/0', 'COLOR'), v('2', 'radius/4', 'FLOAT'), v('3', 'spacing/8', 'FLOAT'), v('4', 'base', 'FLOAT'), v('5', 'color/gray/9', 'COLOR'), v('6', 'color/text', 'COLOR', 's')];
  const gs = paletteGroups(cols, vars, 'g');
  assert.deepEqual(gs.map((g) => [g.label, g.head, g.rows.map((r) => r.id)]), [['', false, ['4']], ['spacing', true, ['3']], ['radius', true, ['2']], ['color/gray', true, ['1', '5']]]);
  const sr = paletteGroups(cols, vars, 'g', 'color');
  assert.deepEqual(sr.map((g) => g.label), ['S Semantic › color', 'G Global › color/gray'], '검색 — 사이드바 순서(Component → Semantic → Global)');
});

test('paletteTree — 경로 마디마다 단 · 키 · 깊이 · 순서 · 막대(V-D6 — §4.6 "그룹 — 경로 마디마다 머리")', async () => {
  const { paletteTree, flattenPaletteTree, varAncestorKeys } = await import('../dist/pure.mjs');
  const cols = [
    { id: 'g', name: 'Global', tier: 1, modes: [{ modeId: 'm', name: 'M' }], defaultModeId: 'm' },
    { id: 's', name: 'Semantic', tier: 2, modes: [{ modeId: 'm2', name: 'M' }], defaultModeId: 'm2' },
  ];
  const v = (id, name, type, col = 'g') => ({ id, name, type, collectionId: col, values: {}, scopes: [], description: '' });
  const vars = [
    v('1', 'color/gray/0', 'COLOR'), v('2', 'radius/4', 'FLOAT'), v('3', 'color/blue/500', 'COLOR'), v('4', 'base', 'FLOAT'),
    v('5', 'color/accent', 'COLOR'), v('6', 'spacing/8', 'FLOAT'), v('7', 'color/gray/9', 'COLOR'), v('x', 'color/text', 'COLOR', 's'),
    v('8', 'a/b/c/d/deep', 'COLOR'), v('9', 'color/blue/sub/inner/x', 'COLOR'),
  ];
  const flat = flattenPaletteTree(paletteTree(cols, vars, 'g'));
  assert.deepEqual(flat.map((n) => [n.key, n.label, n.depth, n.rows.map((r) => r.id), n.bar]), [
    ['g|', '', 0, ['4'], false],
    ['g|spacing', 'spacing', 1, ['6'], false],
    ['g|radius', 'radius', 1, ['2'], false],
    ['g|color', 'color', 1, ['5'], true],
    ['g|color/gray', 'gray', 2, ['1', '7'], true],
    ['g|color/blue', 'blue', 2, ['3'], true],
    ['g|color/blue/sub', 'sub', 3, [], true],
    ['g|color/blue/sub/inner', 'inner', 4, ['9'], true],
    ['g|a', 'a', 1, [], true],
    ['g|a/b', 'b', 2, [], true],
    ['g|a/b/c', 'c', 3, [], true],
    ['g|a/b/c/d', 'd', 4, ['8'], true],
  ], '맨 위 "/" 없음 → 단 1(종류 순서 · 피그마 순서) · 단 안은 바로 든 변수 → 아래 단 · 하나뿐이어도 합치지 않음 · 깊이 제한 없음 · 안쪽 단 있는 나무만 막대');
  const deep = flat.find((n) => n.key === 'g|color/blue/sub/inner');
  assert.equal(deep.path, 'color/blue/sub/inner', '툴팁용 경로 전체');
  assert.deepEqual(deep.ancestors, ['g|color', 'g|color/blue', 'g|color/blue/sub'], '윗단 키(바깥 → 안)');
  // 아래 단끼리 종류 순서 — 그 단 아래 피그마 순서 첫 변수의 종류(색보다 간격이 앞)
  const kinds = flattenPaletteTree(paletteTree(cols, [v('a', 'x/c/1', 'COLOR'), v('b', 'x/s/gap', 'FLOAT')].map((r) => (r.id === 'b' ? { ...r, scopes: ['GAP'] } : r)), 'g'));
  assert.deepEqual(kinds.map((n) => n.key), ['g|x', 'g|x/s', 'g|x/c'], '아래 단 종류 순서(간격 → 색)');
  assert.deepEqual(paletteTree(cols, vars, null), [], '컬렉션 없음 → 빈 나무');
  assert.deepEqual(varAncestorKeys({ collectionId: 'g', name: 'color/gray/0' }), ['g|color', 'g|color/gray']);
  assert.deepEqual(varAncestorKeys({ collectionId: 'g', name: 'base' }), []);
});

test('사이드바 — sidebarCollections 계층 순서 · 수(IA v4 §4.6)', async () => {
  const { sidebarCollections } = await import('../dist/pure.mjs');
  const cols = [
    { id: 'G', name: 'Global', tier: 1, modes: [{ modeId: 'm', name: 'Light' }], defaultModeId: 'm' },
    { id: 'S', name: 'Semantic', tier: 2, modes: [{ modeId: 'm', name: 'Light' }], defaultModeId: 'm' },
  ];
  const v = (id, collectionId, name) => ({ id, collectionId, name, type: 'COLOR', values: {}, scopes: [], description: '' });
  const vars = [v('g1', 'G', 'gray/0'), v('g2', 'G', 'gray/100'), v('t1', 'S', 'color/text/default'), v('b1', 'S', 'color/bg/surface'), v('x', 'S', 'flat')];
  const side = sidebarCollections(cols, vars, null, new Set());
  assert.deepEqual(side.map((s) => [s.collection.id, s.total]), [['S', 3], ['G', 2]], '계층 순서(Semantic → Global) · 전체 수');
});

test('exportColorHex — 변수 탭 colorText와 같은 기준(1/255), 소문자 #rrggbbaa (ia-v3 §2.11)', async () => {
  const { exportColorHex } = await import('../dist/pure.mjs');
  assert.equal(exportColorHex({ r: 0, g: 0, b: 0, a: 1 }), '#000000');
  assert.equal(exportColorHex({ r: 0, g: 0, b: 0 }), '#000000', 'a 없음 = 불투명');
  assert.equal(exportColorHex({ r: 0, g: 0, b: 0, a: 0.996 }), '#000000fe', '2자리 반올림이면 1이지만 255 단위로는 254 — 투명도를 잃지 않는다');
  assert.equal(exportColorHex({ r: 1, g: 1, b: 1, a: 0.5 }), '#ffffff80');
  assert.equal(exportColorHex({ r: 0, g: 0, b: 0, a: 0.999 }), '#000000', '255로 반올림되면 꼬리 없음');
});

test('skipRowCounts — 줄 수 = 칩 수와 같은 셈: 스타일 후보 레이어의 글자 항목은 자리 단위 줄 · [선택 ›] 항목에서 뺀다 (ia-v4 §4.2)', async () => {
  const { skipRowCounts } = await import('../dist/pure.mjs');
  const ts = new Set(['T1']);
  // 스타일 후보 레이어의 글자 fraction만 → 줄 없음(칩 숨김 · 건너뛴 곳 모습 아님)
  let r = skipRowCounts({ fraction: 1 }, [{ nodeId: 'T1', name: 'Title', reason: 'fraction', field: 'fontSize' }], ts);
  assert.deepEqual(r, { fix: [], keep: [] });
  // 다른 레이어의 fraction은 남고, 뺀 레이어는 항목에서도 빠진다
  r = skipRowCounts(
    { fraction: 3, hidden: 2, styled: 1 },
    [
      { nodeId: 'T1', name: 'Title', reason: 'fraction', field: 'fontSize' },
      { nodeId: 'F1', name: 'Box', reason: 'fraction', field: 'paddingLeft' },
      { nodeId: 'T1', name: 'Title', reason: 'hidden' },
      { nodeId: 'H2', name: 'Hid', reason: 'hidden' },
      { nodeId: 'T1', name: 'Title', reason: 'styled', field: 'fontSize' },
    ],
    ts,
  );
  assert.deepEqual(r.fix.map((x) => [x.key, x.n, x.items.map((i) => i.nodeId)]), [['fraction', 2, ['F1']]]);
  assert.deepEqual(r.keep.map((x) => [x.key, x.n, x.layer]), [['hidden', 2, true]], 'styled는 뺀 뒤 0이라 없음, 레이어 단위 줄은 빼지 않음');
  assert.equal(r.keep[0].items.length, 2, '레이어 단위 줄의 항목은 그대로');
  // 텍스트 스타일만 모습이면 변수 사유 줄 없음
  assert.deepEqual(skipRowCounts({ fraction: 1 }, [], new Set(), true), { fix: [], keep: [] });
  // 레이어 단위 줄의 수는 상한 전 레이어 수(skipLayers) — 목록이 200에서 잘려도 실제 수
  const big = skipRowCounts({ hidden: 300 }, [{ nodeId: 'h1', name: 'H', reason: 'hidden' }], new Set(), false, { hidden: 300 });
  assert.equal(big.keep[0].n, 300);
  assert.equal(big.keep[0].items.length, 1, '레이어 단위 줄 항목은 실어 온 목록 그대로');
  // 손볼 곳 잘림(A.18 — [선택 ›]은 손볼 곳 줄에만): 곳 수는 상한 전, 항목은 실어 온 목록 그대로(그래서 ui가 잘림 꼬리를 붙인다)
  const fixBig = skipRowCounts({ fraction: 300 }, [{ nodeId: 'f1', name: 'F', reason: 'fraction', field: 'paddingLeft' }], new Set(), false, { fraction: 300 });
  assert.equal(fixBig.fix[0].n, 300);
  assert.equal(fixBig.fix[0].items.length, 1, '손볼 곳 [선택 ›] 항목은 실어 온 목록 그대로');
});

/* ---------- krdsType.ts — KRDS 텍스트 스타일 이름(docs/text-style-krds.md) ---------- */

const kin = (o) => ({
  fontSize: 16, lineHeight: 24, letterSpacing: 0, family: 'Inter', style: 'Regular', count: 0, uiCount: 0, ...o,
});
/** 크기 · 줄 높이 % → 입력(px 줄 높이). */
const kpx = (size, pct, style, o = {}) => kin({ fontSize: size, lineHeight: (size * pct) / 100, style, ...o });

test('krdsType — weightOf: 폭 · 광학 수식어를 떼고 읽는다, 모르는 이름은 400', () => {
  assert.deepEqual(weightOf('SemiBold Condensed'), { weight: 600, italic: false });
  assert.deepEqual(weightOf('Book'), { weight: 400, italic: false });
  assert.deepEqual(weightOf('Bold Italic'), { weight: 700, italic: true });
  assert.deepEqual(weightOf('SemiCondensed Bold'), { weight: 700, italic: false }); // semi가 굵기로 읽히지 않음
  assert.deepEqual(weightOf('Display Medium'), { weight: 500, italic: false });
  assert.deepEqual(weightOf('Text Light Italic'), { weight: 300, italic: true });
  assert.deepEqual(weightOf('ExtraBold Extended'), { weight: 800, italic: false });
  assert.deepEqual(weightOf('Condensed'), { weight: 400, italic: false });
  assert.deepEqual(weightOf('Regular'), { weight: 400, italic: false });
});

test('krdsType — 분류: label(경로별) → display(600↑ · 42↑) → heading(21.5↑) → heading(600↑ · 16↑) → body', () => {
  assert.equal(krdsCategory(kin({ style: 'Bold', fontSize: 42 })), 'display');
  assert.equal(krdsCategory(kin({ style: 'Bold', fontSize: 41.96 })), 'display'); // 표기값 42.0
  assert.equal(krdsCategory(kin({ style: 'Bold', fontSize: 41.94 })), 'heading'); // 표기값 41.9
  assert.equal(krdsCategory(kin({ style: 'SemiBold', fontSize: 36 })), 'heading'); // display small(36)은 나오지 않음
  assert.equal(krdsCategory(kin({ style: 'Medium', fontSize: 60 })), 'heading'); // 21.5 이상은 굵기와 관계없이 heading(T1) — display는 600 이상만
  // T1: 21.5 이상은 굵기와 관계없이 heading(표기값)
  assert.equal(krdsCategory(kin({ style: 'Regular', fontSize: 24 })), 'heading');
  assert.equal(krdsCategory(kin({ style: 'Light', fontSize: 22 })), 'heading');
  assert.equal(krdsCategory(kin({ style: 'Regular', fontSize: 21.46 })), 'heading'); // 표기값 21.5
  assert.equal(krdsCategory(kin({ style: 'Regular', fontSize: 21.44 })), 'body'); // 표기값 21.4
  assert.equal(krdsCategory(kin({ style: 'Regular', fontSize: 18 })), 'body');
  // T4: 굵은 글자는 16 이상만 heading
  assert.equal(krdsCategory(kin({ style: 'Bold', fontSize: 16 })), 'heading');
  assert.equal(krdsCategory(kin({ style: 'SemiBold', fontSize: 15.96 })), 'heading'); // 표기값 16.0
  assert.equal(krdsCategory(kin({ style: 'Bold', fontSize: 15.9 })), 'body');
  assert.equal(krdsCategory(kin({ style: 'Bold', fontSize: 14 })), 'body');
  assert.equal(krdsCategory(kin({ style: 'Medium', fontSize: 18 })), 'body'); // 500은 굵은 글자가 아님
  // label이 먼저(큰 크기 · 굵은 글자여도)
  assert.equal(krdsCategory(kin({ count: 3, uiCount: 3, fontSize: 24 }), 'scan'), 'label');
  assert.equal(krdsCategory(kin({ name: 'button/lg', fontSize: 24, style: 'Bold' }), 'rename'), 'label');
  // 스캔: uiCount × 2 ≥ count
  assert.equal(krdsCategory(kin({ count: 4, uiCount: 2 }), 'scan'), 'label');
  assert.equal(krdsCategory(kin({ count: 5, uiCount: 2 }), 'scan'), 'body');
  assert.equal(krdsCategory(kin({ count: 0, uiCount: 0 }), 'scan'), 'body'); // 쓰인 곳 0은 label 아님
  assert.equal(krdsCategory(kin({ count: 2, uiCount: 2, style: 'Bold', fontSize: 60 }), 'scan'), 'label');
  // 이름 다시 짓기: 이름 조각이 정확히 같을 때(대소문자 무시)
  assert.equal(krdsCategory(kin({ name: 'Button/Primary' }), 'rename'), 'label');
  assert.equal(krdsCategory(kin({ name: 'btn_text' }), 'rename'), 'label');
  assert.equal(krdsCategory(kin({ name: 'form input-sm' }), 'rename'), 'label');
  assert.equal(krdsCategory(kin({ name: 'table/body' }), 'rename'), 'body');
  assert.equal(krdsCategory(kin({ name: 'tablet' }), 'rename'), 'body');
  assert.equal(krdsCategory(kin({ name: 'labels', uiCount: 9, count: 9 }), 'rename'), 'body'); // uiCount는 보지 않음
});

test('krdsType — 단계 경계(중간점 · 표기값)', () => {
  assert.equal(krdsStep('display', 52), 'large');
  assert.equal(krdsStep('display', 51.99), 'large'); // 표기값 52.0
  assert.equal(krdsStep('display', 51.9), 'medium');
  assert.equal(krdsStep('display', 42), 'medium');
  const h = [[40, 'xlarge'], [36, 'xlarge'], [35.9, 'large'], [28, 'large'], [27.9, 'medium'], [21.5, 'medium'],
    [21.4, 'small'], [18, 'small'], [17.9, 'xsmall'], [16, 'xsmall'], [15.9, 'xsmall'], [10, 'xsmall']]; // 16 미만은 heading이 되지 않음(§3.2) — 마지막 단계로 떨어질 뿐
  assert.ok(!KRDS_STEPS.heading.some((d) => d.step === 'xxsmall'), 'heading xxsmall 단계 없음(2026-11-19 T4)');
  for (const [sz, st] of h) assert.equal(krdsStep('heading', sz), st, `heading ${sz}`);
  const b = [[60, 'large'], [18, 'large'], [17.9, 'medium'], [16, 'medium'], [15.9, 'small'], [14, 'small'], [13.9, 'xsmall'], [8, 'xsmall']];
  for (const [sz, st] of b) {
    assert.equal(krdsStep('body', sz), st, `body ${sz}`);
    assert.equal(krdsStep('label', sz), st, `label ${sz}`);
  }
});

test('krdsType — 크기 꼬리: 기준값 거리 → 쓰인 곳 → 큰 크기', () => {
  // 20 · 18은 기준 19와 같은 거리 → 큰 20이 그대로
  assert.deepEqual(nameKrdsStyles([kpx(18, 150, 'Regular'), kpx(20, 150, 'Regular')]), ['body/large-18', 'body/large']);
  // 쓰인 곳이 많으면 18이 그대로
  assert.deepEqual(
    nameKrdsStyles([kpx(18, 150, 'Regular', { count: 3 }), kpx(20, 150, 'Regular', { count: 1 })]),
    ['body/large', 'body/large-20'],
  );
  // 거리가 먼저 — 19는 쓰인 곳이 적어도 그대로
  assert.deepEqual(
    nameKrdsStyles([kpx(19, 150, 'Regular'), kpx(21, 150, 'Regular', { count: 9 })]),
    ['body/large', 'body/large-21'],
  );
  // 크기별 쓰인 곳은 그 크기 스타일들의 합
  assert.deepEqual(
    nameKrdsStyles([
      kpx(18, 150, 'Regular', { count: 2 }), kpx(18, 120, 'Regular', { count: 2 }), kpx(20, 150, 'Regular', { count: 3 }),
    ]),
    ['body/large', 'body/large-120', 'body/large-20'],
  );
  // 소수 크기 표기
  assert.deepEqual(nameKrdsStyles([kpx(24, 150, 'Bold'), kpx(26.67, 150, 'Bold')]), ['heading/medium', 'heading/medium-26_7']);
});

test('krdsType — 굵기 꼬리: 기본 묶음 1등만 꼬리 없이 · 정렬 동점', () => {
  // 쓰인 곳 0 → 기본값(700)에 가까운 순: 600 · 800 같은 거리 → 작은 숫자 600
  assert.deepEqual(
    nameKrdsStyles([kpx(24, 150, 'ExtraBold'), kpx(24, 150, 'SemiBold')]),
    ['heading/medium-w800', 'heading/medium'],
  );
  // 기울임 아님 먼저
  assert.deepEqual(
    nameKrdsStyles([kpx(24, 150, 'Bold Italic'), kpx(24, 150, 'Bold')]),
    ['heading/medium-w700i', 'heading/medium'],
  );
  // 쓰인 곳이 먼저
  assert.deepEqual(
    nameKrdsStyles([kpx(17, 150, 'Regular', { count: 1 }), kpx(17, 150, 'Medium', { count: 5 })]),
    ['body/medium-w400', 'body/medium'],
  );
  // 400과 400 기울임은 다른 굵기
  assert.deepEqual(nameKrdsStyles([kpx(17, 150, 'Regular'), kpx(17, 150, 'Italic')]), ['body/medium', 'body/medium-w400i']);
  // 기본 묶음 밖(body 300)은 꼬리
  assert.deepEqual(nameKrdsStyles([kpx(17, 150, 'Light'), kpx(17, 150, 'Regular')]), ['body/medium-w300', 'body/medium']);
  // 기본 묶음에 드는 굵기가 없으면 전부 꼬리
  assert.deepEqual(nameKrdsStyles([kpx(17, 150, 'Bold', { count: 2, uiCount: 2 })]), ['label/medium-w700']);
});

test('krdsType — 줄 높이 꼬리 · 꼬리 순서(크기 → 굵기 → 줄 높이)', () => {
  assert.deepEqual(nameKrdsStyles([kin({ fontSize: 17, lineHeight: 0 })]), ['body/medium-auto']);
  assert.deepEqual(nameKrdsStyles([kin({ fontSize: 17, lineHeight: 25.43 })]), ['body/medium']); // 149.6 → 150
  assert.deepEqual(nameKrdsStyles([kin({ fontSize: 17, lineHeight: 20, lineHeightPercent: 120 })]), ['body/medium-120']); // %가 있으면 그 값
  assert.deepEqual(
    nameKrdsStyles([kpx(17, 150, 'Regular'), kpx(16, 130, 'Medium'), kpx(16, 150, 'Regular')]),
    ['body/medium', 'body/medium-16-w500-130', 'body/medium-16'],
  );
});

test('krdsType — 2026-11-19 T1 · T4: 보통 굵기 큰 글자는 heading, 16 미만 굵은 글자는 body', () => {
  // T1 — 보통 굵기는 heading 기본 묶음(600 이상) 밖이라 굵기 꼬리
  assert.deepEqual(nameKrdsStyles([kpx(24, 150, 'Regular')]), ['heading/medium-w400']);
  assert.deepEqual(nameKrdsStyles([kpx(24, 145, 'Regular')]), ['heading/medium-w400-145']);
  assert.deepEqual(nameKrdsStyles([kpx(36, 150, 'Regular')]), ['heading/xlarge-w400']);
  // 44 보통 굵기는 display가 아니라 heading xlarge — 기준 40에 먼 크기는 크기 꼬리
  assert.deepEqual(nameKrdsStyles([kpx(40, 150, 'Bold'), kpx(44, 150, 'Regular')]), ['heading/xlarge', 'heading/xlarge-44-w400']);
  assert.deepEqual(nameKrdsStyles([kpx(44, 150, 'Bold')]), ['display/medium']); // display는 그대로
  // 같은 단계의 굵은 글자가 꼬리 없이, 보통 굵기가 -w400
  assert.deepEqual(nameKrdsStyles([kpx(24, 150, 'Regular', { count: 9 }), kpx(24, 150, 'Bold')]), ['heading/medium-w400', 'heading/medium']);
  // T4 — 16 미만 굵은 글자는 body(기본 묶음 500 이하 밖이라 -w700)
  assert.deepEqual(nameKrdsStyles([kpx(14, 150, 'Bold')]), ['body/small-w700']);
  assert.deepEqual(nameKrdsStyles([kpx(15, 150, 'Bold')]), ['body/small-w700']);
  assert.deepEqual(nameKrdsStyles([kpx(14, 150, 'Regular'), kpx(14, 150, 'Bold')]), ['body/small', 'body/small-w700']);
  assert.deepEqual(nameKrdsStyles([kpx(15, 150, 'Regular'), kpx(15, 150, 'Bold')]), ['body/small', 'body/small-w700']);
  assert.deepEqual(nameKrdsStyles([kpx(16, 150, 'Bold')]), ['heading/xsmall']);
  // label이 먼저
  assert.deepEqual(nameKrdsStyles([kpx(24, 150, 'Regular', { count: 2, uiCount: 2 })]), ['label/large']);
  assert.deepEqual(nameKrdsStyles([kpx(14, 150, 'Bold', { count: 2, uiCount: 2 })]), ['label/small-w700']);
});

test('krdsType — 마지막 수단: 자간 → 글꼴 → -2 · -3 (§3.8, 문자 코드 순)', () => {
  // 자간 0이 그대로, 음수 · 소수 표기
  assert.deepEqual(
    nameKrdsStyles([kin({ letterSpacing: -0.3 }), kin({ letterSpacing: 0 }), kin({ letterSpacing: 0.5 })]),
    ['body/medium-lsm0_3', 'body/medium', 'body/medium-ls0_5'],
  );
  // 0이 없으면 쓰인 곳 → 절댓값 작은 순 → 작은 값
  assert.deepEqual(nameKrdsStyles([kin({ letterSpacing: 0.5 }), kin({ letterSpacing: -0.3 })]), ['body/medium-ls0_5', 'body/medium']);
  assert.deepEqual(nameKrdsStyles([kin({ letterSpacing: 0.3 }), kin({ letterSpacing: -0.3 })]), ['body/medium-ls0_3', 'body/medium']);
  assert.deepEqual(
    nameKrdsStyles([kin({ letterSpacing: 0.5, count: 3 }), kin({ letterSpacing: -0.3, count: 1 })]),
    ['body/medium', 'body/medium-lsm0_3'],
  );
  // 표기가 같아지는 자간(-0.04 → 0)은 같은 것 → 다음 단계(-2)
  // 시그니처 문자열 순: '16|24|-0.04|…' < '16|24|0|…'('-' 45 < '0' 48) → -0.04가 1등
  assert.deepEqual(
    nameKrdsStyles([kin({ id: 'b', letterSpacing: -0.04 }), kin({ id: 'a', letterSpacing: 0 })]),
    ['body/medium', 'body/medium-2'],
  );
  // 글꼴: 쓰인 곳 많은 글꼴 → 같으면 글꼴 이름 순(문자 코드 — 대문자가 앞)
  assert.deepEqual(nameKrdsStyles([kin({ family: 'Inter' }), kin({ family: 'Arial' })]), ['body/medium-inter', 'body/medium']);
  assert.deepEqual(nameKrdsStyles([kin({ family: 'alpha' }), kin({ family: 'Zeta' })]), ['body/medium-alpha', 'body/medium']);
  assert.deepEqual(
    nameKrdsStyles([kin({ family: 'Arial', count: 1 }), kin({ family: 'Noto Sans KR', count: 2 })]),
    ['body/medium-arial', 'body/medium'],
  );
  // 자간 꼬리와 글꼴 꼬리가 함께
  assert.deepEqual(
    nameKrdsStyles([kin({ family: 'Inter', letterSpacing: 0.5 }), kin({ family: 'Arial', letterSpacing: 0.5 }), kin({ family: 'Inter' })]),
    ['body/medium-ls0_5-inter', 'body/medium-ls0_5', 'body/medium'],
  );
  // 값이 완전히 같으면 쓰인 곳 → 지금 이름 순 → id 순
  assert.deepEqual(
    nameKrdsStyles([kin({ name: 'b', id: '1' }), kin({ name: 'a', id: '2' }), kin({ name: 'a', id: '0' })]),
    ['body/medium-3', 'body/medium-2', 'body/medium'],
  );
  assert.deepEqual(nameKrdsStyles([kin({ name: 'z' }), kin({ name: 'a', count: 0 }), kin({ name: 'q', count: 4 })]),
    ['body/medium-3', 'body/medium-2', 'body/medium']);
});

test('krdsType — 앵커는 그대로 · 꼬리 계산에서 빠짐 · 예약 이름은 강제 꼬리(§3.4)', () => {
  // 앵커된 18은 계산에서 빠져 20이 꼬리 없이
  assert.deepEqual(
    nameKrdsStyles([kpx(18, 150, 'Regular'), kpx(20, 150, 'Regular')], { anchored: new Map([[0, 'old/name']]) }),
    ['old/name', 'body/large'],
  );
  // 앵커 이름과 겹치면 강제 꼬리
  assert.deepEqual(
    nameKrdsStyles([kpx(18, 150, 'Regular'), kpx(20, 150, 'Regular')], { anchored: new Map([[0, 'body/large']]) }),
    ['body/large', 'body/large-20-w400-150'],
  );
  // 예약 → 강제 꼬리(크기 · 굵기 · 줄 높이를 생략 없이, 자동 · 기울임)
  const reserved = new Set(['body/medium', 'body/medium-auto', 'heading/medium-w700i']);
  assert.deepEqual(nameKrdsStyles([kin({})], { reserved }), ['body/medium-16-w400-150']);
  assert.deepEqual(
    nameKrdsStyles([kin({}), kin({ fontSize: 17, lineHeight: 0 })], { reserved }),
    ['body/medium-16', 'body/medium-17-w400-auto'], // body/medium-16은 예약이 아님
  );
  assert.deepEqual(
    nameKrdsStyles([kpx(24, 150, 'Bold'), kpx(24, 150, 'Bold Italic')], { reserved }),
    ['heading/medium', 'heading/medium-24-w700i-150'],
  );
  // §3.8 자간 · 글꼴 꼬리는 강제 꼬리 뒤에 그대로
  assert.deepEqual(
    nameKrdsStyles([kin({}), kin({ letterSpacing: 0.5 })], { reserved: new Set(['body/medium-ls0_5']) }),
    ['body/medium', 'body/medium-16-w400-150-ls0_5'],
  );
  // §3.8-3 -2가 예약과 겹치면 -2를 떼고 강제 꼬리
  assert.deepEqual(
    nameKrdsStyles([kin({ name: 'a' }), kin({ name: 'b' })], { reserved: new Set(['body/medium-2']) }),
    ['body/medium', 'body/medium-16-w400-150'],
  );
  // 강제 이름끼리 · 예약과 또 겹치면 §3.8-3 순서대로 -2 · -3
  assert.deepEqual(
    nameKrdsStyles([kin({ name: 'b' }), kin({ name: 'a' })], {
      reserved: new Set(['body/medium', 'body/medium-2', 'body/medium-16-w400-150']),
    }),
    ['body/medium-16-w400-150-3', 'body/medium-16-w400-150-2'],
  );
});

test('krdsType — §7 예(이름 다시 짓기 경로 · 쓰인 곳 0)', () => {
  const rows = [
    ['display/inter-semi-bold', 52, 150, 'SemiBold', 'display/large'],
    ['display/inter-semi-bold-2', 52, 120, 'SemiBold', 'display/large-120'],
    ['display/inter-semi-bold-3', 52, 125, 'SemiBold', 'display/large-125'],
    ['h1', 28, 120, 'SemiBold', 'heading/large-120'],
    ['h3/inter-semi-bold', 24, 150, 'SemiBold', 'heading/medium'],
    ['h3/inter-semi-bold-2', 24, 120, 'SemiBold', 'heading/medium-120'],
    ['h2', 26.67, 150, 'SemiBold', 'heading/medium-26_7'],
    ['title/semi-bold', 20, 120, 'SemiBold', 'heading/small-120'],
    ['body/inter-semi-bold', 18, 125, 'SemiBold', 'heading/small-18-125'],
    ['body/inter-semi-bold-2', 18, 120, 'SemiBold', 'heading/small-18-120'],
    ['title/regular', 20, 150, 'Regular', 'body/large'],
    ['body/inter-regular', 18, 180, 'Regular', 'body/large-18-180'],
    ['body/inter-regular-2', 18, 150, 'Regular', 'body/large-18'],
    ['body/inter-regular-3', 18, 120, 'Regular', 'body/large-18-120'],
    ['body/inter-regular-4', 18, 120, 'Regular', 'body/large-18-120-2'],
    ['body/inter-medium', 18, 120, 'Medium', 'body/large-18-w500-120'],
    ['body/inter-medium-2', 18, 120, 'Medium', 'body/large-18-w500-120-2'],
    ['body/inter-medium-3', 18, 125, 'Medium', 'body/large-18-w500-125'],
    ['caption/inter-regular', 16, 125, 'Regular', 'body/medium-125'],
    ['caption/inter-medium', 16, 125, 'Medium', 'body/medium-w500-125'],
    ['caption/inter-medium-2', 16, 120, 'Medium', 'body/medium-w500-120'],
    ['caption/inter-semi-bold', 16, 120, 'SemiBold', 'heading/xsmall-120'],
    ['caption/inter-semi-bold-2', 16, 125, 'SemiBold', 'heading/xsmall-125'],
    ['overline', 14, 120, 'Regular', 'body/small-120'],
    ['text-9', 12, 120, 'Regular', 'body/xsmall-120'],
    ['text-9-2', 12, 120, 'Regular', 'body/xsmall-120-ls0_5', { letterSpacing: 0.5 }],
    ['text-10', 10, 120, 'Regular', 'body/xsmall-10-120'],
  ];
  // 입력 순서를 뒤집어도 결과는 같다(순서 무관)
  for (const order of [rows, [...rows].reverse()]) {
    const inputs = order.map(([name, size, pct, style, , extra], i) =>
      kpx(size, pct, style, { name, id: `S:${i}`, ...(extra ?? {}) }));
    const names = nameKrdsStyles(inputs, { path: 'rename' });
    assert.deepEqual(names, order.map((r) => r[4]));
  }
});

/* ---------- A.18 결함 4 — 소수 크기 후보 나누기 ---------- */
test('A.18 isIntegerSize · splitDecimalClusters — 앵커 없는 소수만 decimalRows, 앵커된 소수 · 정수는 이름 짓기로', () => {
  assert.equal(isIntegerSize(24), true);
  assert.equal(isIntegerSize(24.001), true, '소수 둘째 자리 반올림');
  assert.equal(isIntegerSize(26.67), false);
  const cl = (fontSize, extra = {}) => ({ fontSize, lineHeight: 40, lineHeightPercent: 0, letterSpacing: 0, letterSpacingPercent: 0, family: 'Inter', style: 'Regular', count: 1, uiCount: 0, sample: 't', styleIds: [], ...extra });
  const c24 = cl(24);
  const c2667 = cl(26.67);
  {
    const { rest, decimalRows } = splitDecimalClusters([c24, c2667], []);
    assert.deepEqual(rest, [c24]);
    assert.deepEqual(decimalRows, [c2667]);
  }
  const existing = [{ id: 'S:1', name: 'old/large', fontSize: 26.67, lineHeight: 40, letterSpacing: 0, family: 'Inter', style: 'Regular' }];
  {
    const { rest, decimalRows } = splitDecimalClusters([c24, c2667], existing);
    assert.deepEqual(rest, [c24, c2667]);
    assert.deepEqual(decimalRows, []);
    const specs = nameTextStyles(rest, existing);
    assert.equal(specs.find((s) => s.fontSize === 26.67).name, 'old/large', '앵커 이름 그대로');
  }
});

test('A.18 이름 짓기 — 소수 크기 군집을 빼면 정수 스타일 이름에 소수 줄 때문에 생기던 꼬리가 없다', () => {
  const cl = (fontSize) => ({ fontSize, lineHeight: Math.round(fontSize * 1.5), lineHeightPercent: 0, letterSpacing: 0, letterSpacingPercent: 0, family: 'Inter', style: 'Bold', count: 1, uiCount: 0, sample: 't', styleIds: [] });
  const withDec = nameTextStyles([cl(26), cl(26.67)]);
  const { rest } = splitDecimalClusters([cl(26), cl(26.67)], []);
  const without = nameTextStyles(rest);
  assert.equal(without.length, 1);
  assert.ok(!/-/.test(without[0].name.split('/').pop()), `꼬리 없음: ${without[0].name}`);
  assert.notEqual(withDec.find((s) => s.fontSize === 26).name, undefined);
});

test('A.18 nameTextStylesWithRowLabels — decimalRows를 돌려주고, 라벨뿐인 소수 크기 표본은 빠지며 다른 스타일 이름은 그대로', () => {
  const s = (id, fontSize, characters, rowId, indexInParent) => ({ id, layerName: id, fontSize, lineHeight: Math.round(fontSize * 1.5), letterSpacing: 0, family: 'Inter', style: 'Regular', characters, rowId, indexInParent });
  // 행: 왼쪽 라벨 "H2"(26.67 — 라벨) + 표본 32
  const samples = [s('l1', 26.67, 'H2', 'r1', 0), s('sp1', 32, 'Specimen text here', 'r1', 1), s('body', 16, 'body text long enough to not be a label', undefined, undefined)];
  const r = nameTextStylesWithRowLabels(samples, []);
  assert.deepEqual(r.decimalRows, [], '라벨뿐인 소수 크기 줄은 빠진다');
  assert.equal(r.styles.find((x) => x.fontSize === 32).name, 'H2');
  // 표본(오른쪽 아닌 남은 글자)으로 있는 26.67은 decimalRows에
  const r2 = nameTextStylesWithRowLabels([...samples, s('dec', 26.67, 'free standing decimal sample text', undefined, undefined)], []);
  assert.equal(r2.decimalRows.length, 1);
  assert.equal(r2.decimalRows[0].fontSize, 26.67);
  assert.deepEqual(r2.styles.map((x) => x.name), r.styles.map((x) => x.name), '다른 스타일 이름은 바뀌지 않는다');
});

/* ---------- 변수 탭 목록 줄(ia-v4 §4.6 "목록 줄 — V1 뒤" · V-D2 · V-D5 · B.17) ---------- */
test('varValueText · lastTwo · varTypeMark — 값 글 "#RRGGBB {p}%" · 칩 끝 두 마디 · 종류 표시', async () => {
  const { varValueText, lastTwo, varTypeMark } = await import('../dist/pure.mjs');
  assert.equal(varValueText({ kind: 'color', hex: '#ffffff' }), '#FFFFFF');
  assert.equal(varValueText({ kind: 'color', hex: '#101828', alpha: 128 / 255 }), '#101828 50%');
  assert.equal(varValueText({ kind: 'color', hex: '#101828', alpha: 20 / 255 }), '#101828 8%');
  assert.equal(varValueText({ kind: 'color', hex: '#101828', alpha: 254 / 255 }), '#101828'); // 반올림해 100%면 꼬리 없음
  assert.equal(varValueText(undefined), '—');
  assert.equal(varValueText(null), '—');
  assert.equal(varValueText({ kind: 'number', text: '1.456' }), '1.46');
  assert.equal(varValueText({ kind: 'string', text: 'Inter' }), 'Inter');
  assert.equal(varValueText({ kind: 'bool', text: 'false' }), 'false');
  assert.equal(lastTwo('color/gray/0'), 'gray/0');
  assert.equal(lastTwo('Brand/color/accent'), 'color/accent');
  assert.equal(lastTwo('(삭제된 변수)'), '(삭제된 변수)');
  assert.deepEqual(['FLOAT', 'STRING', 'BOOLEAN', 'COLOR'].map(varTypeMark), ['#', 'Aa', '✓', '']);
});

test('B.35 tokenGroups · libSameGroups · onlyItems — 묶음 · 라이브러리 같은 값 묶음 뺌 · 묶음 0개 토큰 뺌', async () => {
  const { tokenGroups, libSameGroups, onlyItems } = await import('../dist/pure.mjs');
  const fill = { name: 'color/blue/500', category: 'color', value: '#3B82F6', freeBy: { 'ALL_FILLS|FRAME_FILL': 10, 'ALL_FILLS|TEXT_FILL': 3 } };
  const bound = { name: 'color/green/500', category: 'color', value: '#00AA00', freeBy: {} }; // 모두 붙음
  const fs = { name: 'font-size/16', category: 'fontSize', value: 16 };
  const fam = { name: 'font-family/Inter', category: 'fontFamily', value: 'Inter' };
  const old = { name: 'spacing/8', category: 'gap', value: 8 }; // freeBy 없는 옛 토큰
  assert.deepEqual(tokenGroups(fill), ['ALL_FILLS|FRAME_FILL', 'ALL_FILLS|TEXT_FILL']);
  assert.deepEqual(tokenGroups(bound), []);
  assert.deepEqual(tokenGroups(fs), ['FONT_SIZE']);
  assert.deepEqual(tokenGroups(fam), ['FONT_FAMILY']);
  assert.deepEqual(tokenGroups(old), ['GAP']);
  // 라이브러리 #3B82F6 — FRAME_FILL만 받음 → 프레임 칠 묶음만 같은 값
  const libs = [{ type: 'COLOR', value: { kind: 'color', hex: '#3b82f6' }, scopes: ['FRAME_FILL'] }, { type: 'FLOAT', value: { kind: 'number', text: '16' }, scopes: ['GAP'] }];
  assert.deepEqual(libSameGroups(fill, libs), ['ALL_FILLS|FRAME_FILL']);
  assert.deepEqual(libSameGroups(fs, libs), [], '라이브러리 spacing 16(GAP)은 글자 크기 묶음과 무관');
  const items = onlyItems([fill, bound, fs, fam, old], libs);
  assert.deepEqual(items, [
    { value: '#3B82F6', groups: ['ALL_FILLS|TEXT_FILL'] },
    { value: 16, groups: ['FONT_SIZE'] },
    { value: 'Inter', groups: ['FONT_FAMILY'] },
    { value: 8, groups: ['GAP'] },
  ]);
  assert.deepEqual(onlyItems([{ ...fill, freeBy: { 'ALL_FILLS|FRAME_FILL': 10 } }], libs), [], '묶음이 모두 라이브러리 같은 값이면 토큰을 뺀다');
  assert.deepEqual(onlyItems([{ name: 'x', category: 'color', value: '#000000', alpha: 0.1, freeBy: { EFFECT_COLOR: 1 } }], []), [{ value: '#000000', alpha: 0.1, groups: ['EFFECT_COLOR'] }]);
});

test('B.41 pillOrder — 숫자 작은 순 → 숫자 아님(글자 · 값 없음) → 별칭, 같은 값은 들어온 순서', async () => {
  const { pillOrder } = await import('../dist/pure.mjs');
  const rows = [
    { id: 'a', c: { kind: 'number', text: '14' } },
    { id: 'b', c: { kind: 'number', text: '2' } },
    { id: 'al', c: { kind: 'alias', aliasId: 'x', name: 'x' } },
    { id: 's', c: { kind: 'string', text: '16px' } },
    { id: 'c', c: { kind: 'number', text: '4' } },
    { id: 'none', c: undefined },
    { id: 'd', c: { kind: 'number', text: '4' } },
    { id: 'e', c: { kind: 'number', text: '1.5' } },
  ];
  assert.deepEqual(pillOrder(rows, (r) => r.c).map((r) => r.id), ['e', 'b', 'c', 'd', 'a', 's', 'none', 'al']);
});

/* ============================================================
   S-2 "같은 값" 함수 하나 — sameValue.ts (ia-v4 §2.9 S2-P1–S2-P8 · B.39)
   ============================================================ */
const sv = await import('../dist/pure.mjs');
let svSeq = 0;
/** VarInfo 하나 — 기본은 사용자 컬렉션의 원시값 · ALL_SCOPES. */
const vi = (name, type, key, over = {}) => ({
  id: `v${++svSeq}`, name, type, key, scopes: ['ALL_SCOPES'], hops: 0, collection: 'user', autoRole: false, manual: false, mirror: false, user: true, colIdx: 0, ...over,
});
const alias = (name, type, key, over = {}) => vi(name, type, key, { hops: 1, ...over });
const pg = (name, type, key, over = {}) => vi(name, type, key, { collection: 'pluginGlobal', user: false, colIdx: 9, ...over });
const role = (name, type, key, over = {}) => vi(name, type, key, { hops: 1, collection: 'pluginSemantic', user: false, autoRole: true, colIdx: 8, ...over });
const fillPlace = (key = '#111111', over = {}) => ({ type: 'COLOR', key, allowed: ['ALL_FILLS', 'FRAME_FILL'], usage: 'color/background/default', ...over });
const radPlace = (key = '16', over = {}) => ({ type: 'FLOAT', key, allowed: ['CORNER_RADIUS'], usage: 'radius/default', tokenName: `radius/${key}`, ...over });

test('S-2 valueKeyOf — 색은 소문자 hex + 투명도(소수 둘째 자리 · 1이면 없음), 숫자는 소수 둘째 자리, 글꼴은 그대로(S2-P2)', () => {
  const { valueKeyOf, sameNumber, round2 } = sv;
  assert.equal(valueKeyOf('color', '#AABBCC'), '#aabbcc');
  assert.equal(valueKeyOf('color', '#AABBCC', 1), '#aabbcc');
  assert.equal(valueKeyOf('color', '#000000', 0.084), valueKeyOf('color', '#000000', 0.08));
  assert.notEqual(valueKeyOf('color', '#000000', 0.08), valueKeyOf('color', '#000000'));
  assert.equal(valueKeyOf('color', '#000000@0.08'), valueKeyOf('color', '#000000', 0.08)); // 이미 값 키면 그대로
  assert.equal(valueKeyOf('num', 12.004), '12');
  assert.equal(valueKeyOf('num', 12.5), '12.5');
  assert.notEqual(valueKeyOf('num', 12.01), valueKeyOf('num', 12)); // 허용오차 없음
  assert.equal(valueKeyOf('text', 'Inter'), 'Inter');
  assert.notEqual(valueKeyOf('text', 'inter'), valueKeyOf('text', 'Inter'));
  assert.equal(sameNumber(8, 8.004), true);
  assert.equal(sameNumber(8, 8.01), false);
  assert.equal(round2(1.005 * 100) > 0, true);
});

test('S-2 pickCandidate — 별칭이 원시값보다 먼저 → 홉 수 작은 것 → 이름 오름차순(코드 단위) → 같은 이름이면 사용자 컬렉션 먼저 · 컬렉션 목록 순(S2-P5)', () => {
  const { pickCandidate } = sv;
  const raw = vi('a/raw', 'COLOR', '#111111');
  const far = alias('a/far', 'COLOR', '#111111', { hops: 2 });
  const near = alias('z/near', 'COLOR', '#111111');
  assert.equal(pickCandidate(fillPlace(), [raw, far, near]).variable, near); // 별칭 먼저 · 홉 1 < 2
  assert.equal(pickCandidate(fillPlace(), [raw, far, near]).alias, true);
  assert.equal(pickCandidate(fillPlace(), [raw, far]).variable, far); // 원시값 이름이 앞서도 별칭이 먼저
  const b = alias('b/x', 'COLOR', '#111111');
  const B = alias('B/x', 'COLOR', '#111111');
  assert.equal(pickCandidate(fillPlace(), [b, B]).variable, B); // 코드 단위 — 대문자가 먼저
  // 원시값 후보끼리도 이름 오름차순 → 사용자 컬렉션 먼저(SC-D32 ②)
  const pgA = pg('ink/900', 'COLOR', '#111111');
  const usZ = vi('zinc/900', 'COLOR', '#111111');
  assert.equal(pickCandidate(fillPlace(), [usZ, pgA]).variable, pgA);
  assert.equal(pickCandidate(fillPlace(), [usZ, pgA]).alias, false);
  const same1 = pg('ink/900', 'COLOR', '#111111');
  const same2 = vi('ink/900', 'COLOR', '#111111', { colIdx: 3 });
  const same3 = vi('ink/900', 'COLOR', '#111111', { colIdx: 1 });
  assert.equal(pickCandidate(fillPlace(), [same1, same2, same3]).variable, same3);
  // 직접 만든 변수는 같은 이름일 때 플러그인 컬렉션 쪽 순서(user: false — SC-D38 (a))
  const manual = pg('ink/900', 'COLOR', '#111111', { manual: true });
  assert.equal(pickCandidate(fillPlace(), [manual, same2]).variable, same2);
  // 값 · 타입이 다르거나 값을 모르는 변수는 후보가 아니다
  assert.equal(pickCandidate(fillPlace(), [vi('x', 'COLOR', '#222222'), vi('y', 'FLOAT', '#111111'), vi('z', 'COLOR', null)]), null);
});

test('S-2 pickCandidate — 용도: 사용자 변수는 용도가 맞을 때만 · 빈 배열은 어느 자리의 후보도 아님 · 용도는 변수 자신의 것(S2-P3)', () => {
  const { pickCandidate, scopeFitsPlace } = sv;
  const strokeOnly = vi('ink', 'COLOR', '#111111', { scopes: ['STROKE_COLOR'] });
  const hidden = vi('ink2', 'COLOR', '#111111', { scopes: [] });
  const frame = vi('ink3', 'COLOR', '#111111', { scopes: ['FRAME_FILL'] });
  assert.equal(pickCandidate(fillPlace(), [strokeOnly, hidden]), null);
  assert.equal(pickCandidate(fillPlace(), [strokeOnly, hidden, frame]).variable, frame);
  assert.equal(scopeFitsPlace(['ALL_SCOPES'], ['GAP']), true);
  assert.equal(scopeFitsPlace([], ['GAP']), false);
});

test('S-2 pickCandidate — 플러그인이 만든 역할은 그 자리 쓰임 이름의 가족일 때만 · 여럿이면 가족 순서 첫 번째 하나 · 표시 없는 옛 색 이름 넷도 역할(S2-P4 · S2-P5 ①)', () => {
  const { pickCandidate } = sv;
  const fam2 = role('color/background/default-2', 'COLOR', '#111111');
  const fam = role('color/background/default', 'COLOR', '#111111');
  const other = role('color/text/default', 'COLOR', '#111111'); // 값 · 용도는 맞지만 가족이 아니다
  assert.equal(pickCandidate(fillPlace(), [other]), null);
  assert.equal(pickCandidate(fillPlace(), [fam2, other, fam]).variable, fam); // 기본 이름 → -n
  // 쓰임 이름을 모르면(색 자리 이름을 아직 안 정함) 플러그인이 만든 역할은 후보가 아니다
  assert.equal(pickCandidate(fillPlace('#111111', { usage: undefined }), [fam]), null);
  // 사용자 별칭 + 역할 하나 → S2-P5 ② 순서(이름 오름차순) — "디자이너가 만든 것이 먼저"는 없다
  const user = alias('surface/strong', 'COLOR', '#111111');
  assert.equal(pickCandidate(fillPlace(), [user, fam]).variable, fam); // 'c' < 's'
  const user2 = alias('brand/bg', 'COLOR', '#111111');
  assert.equal(pickCandidate(fillPlace(), [user2, fam]).variable, user2);
  // 역할이 여럿이어도 남는 것은 하나 — 가족 뒤쪽 이름이 사용자 별칭보다 앞서도 뽑히지 않는다
  const fam3 = role('color/background/default-3', 'COLOR', '#111111');
  const mid = alias('color/background/default-25', 'COLOR', '#111111');
  assert.equal(pickCandidate(fillPlace(), [fam2, fam3, mid]).variable, fam2);
  // 표시 없는 옛 색 이름(color/background/default) — 가족일 때만
  const old = alias('color/background/default', 'COLOR', '#111111', { collection: 'pluginSemantic', user: false });
  assert.equal(pickCandidate(fillPlace(), [old]).variable, old);
  assert.equal(pickCandidate(fillPlace('#111111', { usage: 'color/text/default', allowed: ['ALL_FILLS', 'TEXT_FILL'] }), [old]), null);
  // 숫자 역할 — `radius/default`의 가족은 radius/default · 크기 말(radius/sm …), radius/full · radius/top-left는 아니다
  const rd = role('radius/sm', 'FLOAT', '16');
  const full = role('radius/full', 'FLOAT', '16');
  assert.equal(pickCandidate(radPlace(), [full]), null);
  assert.equal(pickCandidate(radPlace(), [full, rd]).variable, rd);
});

test('S-2 pickCandidate — 거울 · 표시 없는 옛 단계 이름의 별칭은 뺀다(같은 값이어도 붙이지 않는다 — S2-P4 "뺀다")', () => {
  const { pickCandidate } = sv;
  const mirror = alias('color/gray/950', 'COLOR', '#111111', { mirror: true });
  const raw = pg('color/gray/950', 'COLOR', '#111111');
  assert.equal(pickCandidate(fillPlace(), [mirror, raw]).variable, raw);
  const oldStep = alias('radius/md', 'FLOAT', '16', { collection: 'pluginSemantic', user: false });
  assert.equal(pickCandidate(radPlace(), [oldStep]), null);
  // 원시값 변수는 이름이 옛 단계여도 후보다(별칭만 뺀다)
  const rawStep = vi('radius/md', 'FLOAT', '16');
  assert.equal(pickCandidate(radPlace(), [rawStep]).variable, rawStep);
  // 플러그인 Global 컬렉션 안의 별칭 변수는 스스로 거울이 아니다 — 사용자 변수 갈래의 후보
  const inG = alias('a/shortcut', 'COLOR', '#111111', { collection: 'pluginGlobal', user: false });
  assert.equal(pickCandidate(fillPlace(), [inG, raw]).variable, inG);
});

test('S-2 pickCandidate — 글자 자리의 별칭 후보는 그룹 접두사 이름일 때만(사용자 변수도) · 원시값은 이름과 상관없이(S2-P4 · SC-D32 ⑨)', () => {
  const { pickCandidate } = sv;
  const place = { type: 'FLOAT', key: '16', allowed: ['FONT_SIZE'], usage: 'font-size/text', textGroup: 'font-size' };
  const spacing = alias('spacing/md', 'FLOAT', '16');
  const body = alias('font-size/body', 'FLOAT', '16');
  const r2 = role('font-size/text-2', 'FLOAT', '16');
  const r1 = role('font-size/text', 'FLOAT', '16');
  assert.equal(pickCandidate(place, [spacing]), null); // 이름이 다른 숫자 변수가 글자에 붙지 않는다
  assert.equal(pickCandidate(place, [spacing, body]).variable, body);
  assert.equal(pickCandidate(place, [r2, r1]).variable, r1); // 역할은 이름 오름차순 첫 번째
  const raw = pg('font-size/16', 'FLOAT', '16', { scopes: ['FONT_SIZE'] });
  assert.equal(pickCandidate(place, [raw]).variable, raw);
  // 글자 자리에는 용도 예외가 없다
  assert.equal(pickCandidate({ ...place, tokenName: 'font-size/16' }, [pg('font-size/16', 'FLOAT', '16', { scopes: ['GAP'] })]), null);
});

test('S-2 pickCandidate — 색 용도 예외: 용도가 맞는 후보가 하나도 없을 때만 · 플러그인 Global의 직접 값 변수 · 값만 본다 · 직접 만든 변수도(SC-D38)', () => {
  const { pickCandidate } = sv;
  const g = pg('color/gray/950', 'COLOR', '#111111', { scopes: ['STROKE_COLOR'] });
  const r = pickCandidate(fillPlace(), [g]);
  assert.equal(r.variable, g);
  assert.equal(r.scopeAdd, 'ALL_FILLS'); // 자리 allowed의 첫째
  assert.equal(r.alias, false);
  // 이름을 보지 않는다 — 이름을 바꾼 플러그인 Global도
  assert.equal(pickCandidate(fillPlace(), [pg('whatever', 'COLOR', '#111111', { scopes: [] })]).scopeAdd, 'ALL_FILLS');
  // 직접 만든 변수(dsl.manual)도 똑같이
  const m = pg('color/gray/950', 'COLOR', '#111111', { scopes: ['STROKE_COLOR'], manual: true });
  assert.equal(pickCandidate(fillPlace(), [m]).scopeAdd, 'ALL_FILLS');
  // 용도가 맞는 후보(원시값이든 별칭이든)가 하나라도 있으면 예외는 쓰지 않는다
  const ok = vi('zzz', 'COLOR', '#111111', { scopes: ['FRAME_FILL'] });
  const p2 = pickCandidate(fillPlace(), [g, ok]);
  assert.equal(p2.variable, ok);
  assert.equal(p2.scopeAdd, undefined);
  // 사용자 컬렉션의 변수 · 플러그인 Global 안의 별칭에는 예외가 없다
  assert.equal(pickCandidate(fillPlace(), [vi('ink', 'COLOR', '#111111', { scopes: ['STROKE_COLOR'] })]), null);
  assert.equal(pickCandidate(fillPlace(), [alias('ink', 'COLOR', '#111111', { scopes: ['STROKE_COLOR'], collection: 'pluginGlobal', user: false })]), null);
  // 여럿이면 이름 오름차순
  const g2 = pg('color/gray/900', 'COLOR', '#111111', { scopes: ['STROKE_COLOR'] });
  assert.equal(pickCandidate(fillPlace(), [g, g2]).variable, g2);
});

test('S-2 pickCandidate — 숫자 용도 예외는 같은 이름 · 같은 값일 때만(SC-D34): radius/16 ↔ 반경 16, spacing/16은 섞이지 않는다 · 직접 만든 변수도', () => {
  const { pickCandidate } = sv;
  const r16 = pg('radius/16', 'FLOAT', '16', { scopes: ['GAP'] });
  const s16 = pg('spacing/16', 'FLOAT', '16', { scopes: ['GAP'] });
  const p = pickCandidate(radPlace(), [s16, r16]);
  assert.equal(p.variable, r16);
  assert.equal(p.scopeAdd, 'CORNER_RADIUS');
  assert.equal(pickCandidate(radPlace(), [s16]), null);
  assert.equal(pickCandidate(radPlace(), [pg('radius/16', 'FLOAT', '16', { scopes: ['GAP'], manual: true })]).scopeAdd, 'CORNER_RADIUS');
  // 토큰 이름을 모르는 자리(tokenName 없음)는 숫자 예외가 없다
  assert.equal(pickCandidate(radPlace('16', { tokenName: undefined }), [r16]), null);
  // 같은 이름 · 다른 값은 아니다
  assert.equal(pickCandidate(radPlace('12', { tokenName: 'radius/12' }), [r16]), null);
});

test('S-2 splitPlaces — 한 자리는 한쪽에만 · 새로 만들 값은 값 단위(종류, 값 키) · 글자 자리는 make에 없음(S2-P7)', () => {
  const { splitPlaces } = sv;
  const vars = [vi('ink', 'COLOR', '#111111')];
  const mk = (kind, value, alpha) => ({ make: { kind, value, ...(alpha != null ? { alpha } : {}) } });
  const places = [
    { ...fillPlace('#111111'), ...mk('color', '#111111') }, // 후보 있음
    { ...fillPlace('#222222'), ...mk('color', '#222222') },
    { ...fillPlace('#222222', { allowed: ['STROKE_COLOR'] }), ...mk('color', '#222222') }, // 같은 값 · 다른 묶음(선)
    { ...fillPlace('#222222'), ...mk('color', '#222222') },
    { ...radPlace('16'), ...mk('radius', 16) },
    { type: 'FLOAT', key: '16', allowed: ['GAP'], usage: 'spacing/gap', tokenName: 'spacing/16', ...mk('gap', 16) }, // 간격 16과 반경 16은 다른 값
    { type: 'FLOAT', key: '14', allowed: ['FONT_SIZE'], usage: 'font-size/text', textGroup: 'font-size' }, // 글자 no-match — make 없음
    { type: 'FLOAT', key: '12.5', allowed: ['GAP'], usage: 'spacing/gap' }, // 소수 — 손볼 곳
  ];
  const r = splitPlaces(places, vars);
  assert.equal(r.link.length, 1);
  assert.equal(r.link[0].place, places[0]);
  assert.equal(r.made.length, 5);
  assert.equal(r.none.length, 2);
  assert.equal(r.link.length + r.made.length + r.none.length, places.length); // 한쪽에만
  assert.deepEqual(r.make, [
    { kind: 'color', value: '#222222', by: { 'ALL_FILLS|FRAME_FILL': 2, STROKE_COLOR: 1 } },
    { kind: 'radius', value: 16, by: { CORNER_RADIUS: 1 } },
    { kind: 'gap', value: 16, by: { GAP: 1 } },
  ]);
  assert.equal(r.make.some((m) => m.kind === 'text'), false);
  // 반투명은 다른 값
  const r2 = splitPlaces([{ ...fillPlace('#222222@0.5'), ...mk('color', '#222222', 0.5) }, { ...fillPlace('#222222'), ...mk('color', '#222222') }], []);
  assert.equal(r2.make.length, 2);
  assert.equal(r2.make[0].alpha, 0.5);
});

test('S-2 tokenReuse — 묶음마다 pickCandidate, 모두 있으면 재사용 · 하나라도 없거나 묶음 0개면 null(S2-P8)', () => {
  const { tokenReuse } = sv;
  const fillOnly = vi('ink', 'COLOR', '#111111', { scopes: ['ALL_FILLS'] });
  const groups = [fillPlace('#111111', { usage: undefined }), { type: 'COLOR', key: '#111111', allowed: ['STROKE_COLOR'] }];
  assert.equal(tokenReuse(groups, [fillOnly]), null); // 선 묶음에 후보 없음 → 새로 만듦
  assert.equal(tokenReuse([groups[0]], [fillOnly])[0].variable, fillOnly);
  assert.equal(tokenReuse([], [fillOnly]), null); // "묶음이 없으니 모두 후보가 있다"로 읽지 않는다
  const strokeToo = alias('line', 'COLOR', '#111111', { scopes: ['STROKE_COLOR'], rawId: 'raw1' });
  const picks = tokenReuse(groups, [fillOnly, strokeToo]);
  assert.deepEqual(picks.map((p) => p.variable.name), ['ink', 'line']); // 묶음마다 다른 변수를 골라도 된다
  // 이름을 바꾼 플러그인 Global도 값이 같으면 다시 쓴다(7-13의 11번)
  assert.equal(tokenReuse([groups[0]], [pg('renamed/brand', 'COLOR', '#111111', { scopes: ['ALL_FILLS'] })])[0].variable.name, 'renamed/brand');
});

test('S-2 userRadiusKeys — 플러그인 Global 컬렉션 밖 · 역할 아님 · CORNER_RADIUS를 직접 켬(ALL_SCOPES · [] 아님) · 별칭은 자신의 용도(SC-D37 · SC-D39)', () => {
  const { userRadiusKeys } = sv;
  const R = ['CORNER_RADIUS'];
  const keys = (vars) => [...userRadiusKeys(vars)].sort();
  assert.deepEqual(keys([vi('corner/12', 'FLOAT', '12', { scopes: R })]), ['12']);
  assert.deepEqual(keys([vi('corner/12', 'FLOAT', '12', { scopes: ['GAP', 'CORNER_RADIUS'] })]), ['12']); // 다른 용도가 함께 있어도
  assert.deepEqual(keys([vi('spacing/12', 'FLOAT', '12')]), []); // ALL_SCOPES — 알약을 가져가지 못한다
  assert.deepEqual(keys([vi('corner/12', 'FLOAT', '12', { scopes: [] })]), []);
  assert.deepEqual(keys([vi('corner/12', 'FLOAT', null, { scopes: R })]), []); // 값을 모름
  assert.deepEqual(keys([vi('c', 'COLOR', '12', { scopes: R })]), []);
  // 플러그인 Global 컬렉션의 변수는 직접 만들었든 · 별칭이든 넣지 않는다
  assert.deepEqual(keys([pg('radius/12', 'FLOAT', '12', { scopes: R })]), []);
  assert.deepEqual(keys([pg('radius/12', 'FLOAT', '12', { scopes: R, manual: true })]), []);
  assert.deepEqual(keys([alias('radius/chip', 'FLOAT', '12', { scopes: R, collection: 'pluginGlobal', user: false })]), []);
  // 플러그인이 만든 역할은 넣지 않고, 플러그인 Semantic의 표시 없는 변수는 넣는다
  assert.deepEqual(keys([role('radius/default', 'FLOAT', '12', { scopes: R })]), []);
  assert.deepEqual(keys([alias('radius/chip', 'FLOAT', '12', { scopes: R, collection: 'pluginSemantic', user: false })]), ['12']);
  // 별칭의 용도는 그 변수 자신의 scopes
  assert.deepEqual(keys([alias('radius/chip', 'FLOAT', '12')]), []); // ALL_SCOPES 별칭(가리키는 원시값이 CORNER_RADIUS여도)
  assert.deepEqual(keys([alias('radius/chip', 'FLOAT', '12', { scopes: R })]), ['12']);
  // 거울 · 옛 단계 이름의 별칭은 아니다(원시값은 든다)
  assert.deepEqual(keys([alias('radius/12', 'FLOAT', '12', { scopes: R, mirror: true }), alias('radius/md', 'FLOAT', '8', { scopes: R })]), []);
  assert.deepEqual(keys([vi('radius/md', 'FLOAT', '8', { scopes: R })]), ['8']);
  // 집합에 든 변수는 그 값의 반경 자리에서 늘 후보다
  const c12 = vi('corner/12', 'FLOAT', '12', { scopes: R });
  assert.equal(sv.pickCandidate(radPlace('12'), [c12]).variable, c12);
});

test('S-2 pillCorners(keep) — 판정 집합에 원래 값이 있는 모서리는 알약이 아니다 · 모서리마다 판정 · 넘기지 않으면 지금 동작(SC-D36 ①)', () => {
  const { pillCorners } = sv;
  assert.deepEqual(pillCorners([12, 12, 12, 12], 80, 24), [9999, 9999, 9999, 9999]);
  assert.deepEqual(pillCorners([12, 12, 12, 12], 80, 24, new Set(['12'])), [12, 12, 12, 12]);
  assert.deepEqual(pillCorners([12, 12, 12, 12], 80, 24, new Set()), [9999, 9999, 9999, 9999]);
  assert.deepEqual(pillCorners([20, 150, 20, 150], 120, 40, new Set(['20'])), [20, 9999, 20, 9999]);
  assert.deepEqual(pillCorners([20, 8, 20, 8], 120, 40, new Set(['20'])), [20, 8, 20, 8]);
  assert.deepEqual(pillCorners([20, 8, 20, 8], 120, 40), [9999, 8, 9999, 8]);
  assert.deepEqual(pillCorners([12.5, 12.5, 12.5, 12.5], 80, 25, new Set(['12.5'])), [12.5, 12.5, 12.5, 12.5]); // 소수 알약
  assert.deepEqual(pillCorners([12, 12, 12, 12], 80, 80, new Set()), [12, 12, 12, 12]); // 알약 모양이 아니면 판정과 무관
});

test('S-2 tokenable — 투명도 · 색은 참, Spacing · Radius · Size · Stroke는 반올림한 값이 0보다 큰 정수일 때(S2-P7 표 · N1)', () => {
  const { tokenable } = sv;
  for (const k of ['gap', 'radius', 'size', 'stroke']) {
    assert.equal(tokenable(k, 16), true, k);
    assert.equal(tokenable(k, 0), false, k);
    assert.equal(tokenable(k, -4), false, k);
    assert.equal(tokenable(k, 12.5), false, k);
    assert.equal(tokenable(k, 16.004), true, k); // 소수 둘째 자리로 반올림하면 정수
    assert.equal(tokenable(k, 0.004), false, k); // 반올림 뒤 0(6회차 — 0 이하 판정도 반올림 뒤 값으로)
  }
  assert.equal(tokenable('radius', 9999), true);
  assert.equal(tokenable('opacity', 0.5), true);
  assert.equal(tokenable('color', '#111111'), true);
});

test('S-2 aliasCovers — 값 키가 같고 역할 용도를 모두 덮는 별칭이 있으면 Semantic을 세지도 만들지도 않는다(S2-P8 "Semantic 수 r")', () => {
  const { aliasCovers } = sv;
  const q = { type: 'COLOR', key: '#111111', need: ['FRAME_FILL', 'SHAPE_FILL'], base: 'color/background/default' };
  assert.equal(aliasCovers([alias('surface/strong', 'COLOR', '#111111')], q), true); // 사용자 별칭은 이름과 상관없이
  assert.equal(aliasCovers([alias('surface/strong', 'COLOR', '#111111', { scopes: ['FRAME_FILL'] })], q), false); // 일부만 덮음 → 만든다
  assert.equal(aliasCovers([alias('surface/strong', 'COLOR', '#111111', { scopes: ['FRAME_FILL', 'SHAPE_FILL', 'TEXT_FILL'] })], q), true);
  assert.equal(aliasCovers([vi('ink/900', 'COLOR', '#111111')], q), false); // 원시값은 아니다
  assert.equal(aliasCovers([alias('x', 'COLOR', '#222222')], q), false);
  assert.equal(aliasCovers([role('color/text/default', 'COLOR', '#111111')], q), false); // 플러그인이 만든 역할은 가족일 때만
  assert.equal(aliasCovers([role('color/background/default-2', 'COLOR', '#111111')], q), true);
  assert.equal(aliasCovers([alias('color/gray/950', 'COLOR', '#111111', { mirror: true })], q), false);
});

test('S-2 SC-D46 withoutLibGroups — 라이브러리 같은 값 묶음의 몫을 쓰임(free · keys · by)에서 뺀다 · freeBy는 그대로 · 라이브러리 없음 · 옛 토큰은 그대로', async () => {
  const { withoutLibGroups } = await import('../dist/pure.mjs');
  const F = 'ALL_FILLS|FRAME_FILL';
  const T = 'ALL_FILLS|TEXT_FILL';
  const tk = {
    name: 'color/blue/500', category: 'color', value: '#3B82F6', freeBy: { [F]: 10, [T]: 3 },
    uses: [
      { name: 'color/background', count: 12, free: 10, keys: [F], by: { [F]: 10 } },
      { name: 'color/text', count: 3, free: 3, keys: [T], by: { [T]: 3 } },
    ],
  };
  const libs = [{ type: 'COLOR', value: { kind: 'color', hex: '#3b82f6' }, scopes: ['FRAME_FILL'] }];
  const [out] = withoutLibGroups([tk], libs);
  assert.deepEqual(out.uses, [
    { name: 'color/background', count: 12, free: 0, keys: [], by: {} }, // 연결 단계가 붙이지 않는 묶음 — 역할 · 밝기에서 빠진다
    { name: 'color/text', count: 3, free: 3, keys: [T], by: { [T]: 3 } },
  ]);
  assert.deepEqual(out.freeBy, tk.freeBy);
  assert.equal(tk.uses[0].free, 10, '원래 토큰은 바꾸지 않는다');
  assert.equal(withoutLibGroups([tk], [])[0], tk);
  const old = { name: 'color/blue/500', category: 'color', value: '#3B82F6', freeBy: { [F]: 10 }, uses: [{ name: 'color/background', count: 10 }] };
  assert.equal(withoutLibGroups([old], libs)[0], old);
});
