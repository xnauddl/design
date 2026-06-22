/* 팔레트 생성 순수 로직 테스트 — `npm test`가 build 후 dist/pure.mjs를 불러온다.
   color.ts(색공간·대비) + palette.ts(스케일·하모니·중립·상태색). figma 의존 없음. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  hexToRgb,
  // color
  rgbToOklch,
  oklchToRgb,
  hexToOklch,
  oklchToHex,
  contrastRatio,
  bestOnColor,
  meetsAA,
  meetsAAA,
  clampToGamut,
  // palette
  STEPS,
  LOW_CHROMA,
  buildScale,
  harmonyHexes,
  neutralScale,
  statusScales,
  generatePalette,
  paletteToDraftTokens,
  suggestSemanticMap,
  colorScaleName,
  classifyColorScale,
  isPaletteColorName,
  mod360,
  scopeForSemanticRole,
} from '../dist/pure.mjs';

const close = (a, b, tol = 0.01) => Math.abs(a - b) <= tol;
const inUnit = (rgb) => [rgb.r, rgb.g, rgb.b].every((c) => c >= 0 && c <= 1);
const isHex = (s) => /^#[0-9a-f]{6}$/.test(s);

/* ================= color.ts ================= */
test('rgbToOklch ↔ oklchToRgb 라운드트립(인-게멋)', () => {
  for (const rgb of [
    { r: 0.2, g: 0.4, b: 1 },
    { r: 1, g: 0, b: 0 },
    { r: 0.5, g: 0.5, b: 0.5 },
  ]) {
    const back = oklchToRgb(rgbToOklch(rgb));
    assert.ok(close(back.r, rgb.r, 0.01) && close(back.g, rgb.g, 0.01) && close(back.b, rgb.b, 0.01));
  }
});

test('hexToOklch ↔ oklchToHex 라운드트립', () => {
  for (const hex of ['#3366ff', '#ff5722', '#10b981']) {
    assert.equal(oklchToHex(hexToOklch(hex)), hex);
  }
});

test('contrastRatio — 흑/백 = 21, 동색 = 1', () => {
  assert.ok(close(contrastRatio(hexToRgb('#000000'), hexToRgb('#ffffff')), 21, 0.05));
  assert.ok(close(contrastRatio(hexToRgb('#777777'), hexToRgb('#777777')), 1, 0.001));
});

test('bestOnColor / meetsAA / meetsAAA', () => {
  assert.equal(bestOnColor('#ffffff'), '#000000');
  assert.equal(bestOnColor('#000000'), '#ffffff');
  assert.equal(meetsAA('#000000', '#ffffff'), true);
  assert.equal(meetsAA('#888888', '#777777'), false);
  assert.equal(meetsAAA('#000000', '#ffffff'), true);
});

test('clampToGamut — 과채도는 c를 줄여 sRGB 안으로', () => {
  const wild = { l: 0.6, c: 0.5, h: 250 }; // sRGB 밖
  const fixed = clampToGamut(wild);
  assert.ok(fixed.c < wild.c);
  assert.ok(inUnit(oklchToRgb(fixed)));
  assert.equal(fixed.h, wild.h); // hue 보존
});

/* ================= palette.ts ================= */
test('buildScale — 스텝 수·hex 유효·L 단조감소·인게멋', () => {
  const sc = buildScale('primary', '#3366ff', { anchor: false });
  assert.equal(sc.family, 'primary');
  assert.equal(sc.swatches.length, STEPS.length);
  for (let i = 0; i < sc.swatches.length; i++) {
    const sw = sc.swatches[i];
    assert.ok(isHex(sw.hex));
    assert.ok(inUnit(oklchToRgb(hexToOklch(sw.hex))));
    if (i > 0) assert.ok(sw.oklch.l < sc.swatches[i - 1].oklch.l); // 밝→어두
  }
});

test('buildScale — anchor면 브랜드색 원본 포함', () => {
  const sc = buildScale('primary', '#3366ff', { anchor: true });
  assert.ok(sc.swatches.some((s) => s.hex === '#3366ff'));
});

test('buildScale — anchor 채도 스파이크 없음(브랜드가 최대 채도)', () => {
  // 어둡고 진한 브랜드: 이웃 스텝이 과채도였다면 한 스텝만 튐 → 브랜드가 유일 최대여야 정상
  const sc = buildScale('primary', '#1a00ff', { anchor: true });
  const cmax = Math.max(...sc.swatches.map((s) => s.oklch.c));
  const brand = sc.swatches.find((s) => s.hex === '#1a00ff');
  assert.equal(brand.oklch.c, cmax);
});

test('mod360 — 음수·360+ 래핑', () => {
  assert.equal(mod360(370), 10);
  assert.equal(mod360(-30), 330);
  assert.equal(mod360(0), 0);
});

test('scopeForSemanticRole — 역할별 스코프(미지정은 undefined)', () => {
  assert.deepEqual(scopeForSemanticRole('text'), ['TEXT_FILL']);
  assert.deepEqual(scopeForSemanticRole('text/muted'), ['TEXT_FILL']);
  assert.deepEqual(scopeForSemanticRole('border'), ['STROKE_COLOR']);
  assert.deepEqual(scopeForSemanticRole('surface/muted'), ['FRAME_FILL']);
  assert.equal(scopeForSemanticRole('primary'), undefined);
});

test('harmonyHexes — complementary는 hue ≈ +180', () => {
  const baseH = hexToOklch('#3366ff').h;
  const [comp] = harmonyHexes('#3366ff', 'complementary');
  const diff = ((hexToOklch(comp).h - baseH) % 360 + 360) % 360;
  assert.ok(close(diff, 180, 12));
  assert.equal(harmonyHexes('#3366ff', 'triadic').length, 2);
  assert.equal(harmonyHexes('#3366ff', 'tetradic').length, 3);
});

test('neutralScale — 전 스텝 저채도', () => {
  const sc = neutralScale('#3366ff');
  assert.equal(sc.family, 'neutral');
  for (const sw of sc.swatches) assert.ok(sw.oklch.c <= LOW_CHROMA);
});

test('statusScales — success/warning/error/info', () => {
  const fams = statusScales().map((s) => s.family);
  assert.deepEqual(fams, ['success', 'warning', 'error', 'info']);
});

test('generatePalette — 무채색 브랜드는 경고', () => {
  const p = generatePalette({ brand: { primary: '#808080' } });
  assert.ok(p.warnings.length >= 1);
  assert.match(p.warnings[0], /채도/);
});

test('generatePalette + paletteToDraftTokens — DraftToken 형식', () => {
  const p = generatePalette({
    brand: { primary: '#3366ff', secondary: '#ff5722' },
    harmony: 'complementary',
    includeNeutral: true,
    includeStatus: true,
  });
  const tokens = paletteToDraftTokens(p);
  assert.ok(tokens.length > 0);
  // primary + secondary + accent-1 + neutral + 상태색 4 = 8 패밀리 × 11 스텝
  assert.equal(tokens.length, 8 * STEPS.length);
  for (const t of tokens) {
    assert.equal(t.category, 'color');
    assert.deepEqual(t.sources, ['fill']);
    assert.match(t.name, /^color\/[a-z0-9-]+\/\d+$/);
    assert.match(String(t.value), /^#[0-9a-f]{6}$/);
  }
});

test('suggestSemanticMap — 존재 패밀리에만 역할 배정', () => {
  const p = generatePalette({ brand: { primary: '#3366ff' }, includeNeutral: true, includeStatus: true });
  const map = suggestSemanticMap(p);
  assert.equal(map['primary'], 'color/primary/500');
  assert.equal(map['surface'], 'color/neutral/50');
  assert.equal(map['text'], 'color/neutral/900');
  assert.equal(map['success'], 'color/success/500');
  // secondary 미생성 → 매핑 없음
  assert.equal(map['secondary'], undefined);

  // neutral/status 제외 시 역할도 빠짐
  const p2 = generatePalette({ brand: { primary: '#3366ff' } });
  const map2 = suggestSemanticMap(p2);
  assert.equal(map2['surface'], undefined);
  assert.equal(map2['success'], undefined);
  assert.equal(map2['primary'], 'color/primary/500');
});

test('classifyColorScale — 추출 색을 팔레트와 동일한 family/step로 분류', () => {
  assert.equal(colorScaleName('primary', 500), 'color/primary/500');

  // 무채색(채도 낮음) → neutral, 양 끝 명도
  assert.deepEqual(classifyColorScale('#ffffff'), { family: 'neutral', step: 50 });
  assert.deepEqual(classifyColorScale('#000000'), { family: 'neutral', step: 950 });
  assert.equal(classifyColorScale('#121210').family, 'neutral'); // 거의 검정

  // 유채색 → hue 버킷
  assert.equal(classifyColorScale('#ff0000').family, 'red');
  assert.equal(classifyColorScale('#3366ff').family, 'blue');
  assert.equal(classifyColorScale('#00ff00').family, 'green');

  // step은 항상 STEPS 중 하나
  for (const hex of ['#ff0000', '#3366ff', '#00ff00']) {
    assert.ok(STEPS.includes(classifyColorScale(hex).step));
  }

  // 팔레트 생성과 추출이 같은 변수 이름을 산출(동일 체계) — primary/500 스와치를 다시 분류하면 blue 계열
  const draft = paletteToDraftTokens(generatePalette({ brand: { primary: '#3366ff' } }));
  const p500 = draft.find((t) => t.name === 'color/primary/500');
  assert.ok(p500); // 팔레트가 colorScaleName으로 명명
});

test('isPaletteColorName — 팔레트 색만 정리 대상', () => {
  assert.equal(isPaletteColorName('color/primary/500'), true);
  assert.equal(isPaletteColorName('color/secondary/50'), true);
  assert.equal(isPaletteColorName('color/accent-2/700'), true);
  assert.equal(isPaletteColorName('color/success/500'), true);
  assert.equal(isPaletteColorName('color/brandish/500'), false); // 사용자 패밀리
  assert.equal(isPaletteColorName('color/0066ff'), false); // 추출 hex 색
  assert.equal(isPaletteColorName('spacing/16'), false); // 비색
});
