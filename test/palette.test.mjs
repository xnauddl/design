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
