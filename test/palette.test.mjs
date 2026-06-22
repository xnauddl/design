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
  paletteSemanticMap,
  suggestSemanticMap,
  isPaletteColorName,
  mod360,
  scopeForSemanticRole,
  // colorName (#3)
  classifyColor,
  hueName,
  stepForL,
  nameColorsByHue,
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

test('paletteSemanticMap(#3) — Global=hue, 역할은 Semantic, 동일 hue 충돌 접미사', () => {
  const p = generatePalette({ brand: { primary: '#3366ff' }, includeNeutral: true, includeStatus: true });
  const pf = classifyColor('#3366ff').family;
  const map = paletteSemanticMap(p);
  assert.equal(map['primary'], `color/${pf}/500`);
  assert.equal(map['primary/strong'], `color/${pf}/700`);
  assert.equal(map['primary/subtle'], `color/${pf}/100`);
  assert.equal(map['surface'], 'color/gray/50'); // neutral(저채도) → gray
  assert.equal(map['text'], 'color/gray/900');
  assert.equal(map['border'], 'color/gray/200');
  assert.equal(map['success'], 'color/green/500');
  assert.equal(map['error'], 'color/red/500');
  assert.equal(map['secondary'], undefined); // 미생성
  // primary가 blue면 info(h250)도 blue → 충돌 접미사
  if (pf === 'blue') assert.equal(map['info'], 'color/blue-2/500');
  // 모든 Global 토큰은 hue 패밀리 이름
  for (const t of paletteToDraftTokens(p)) assert.equal(isPaletteColorName(t.name), true);

  // neutral/status 제외 시 역할도 빠짐
  const map2 = paletteSemanticMap(generatePalette({ brand: { primary: '#3366ff' } }));
  assert.equal(map2['surface'], undefined);
  assert.equal(map2['success'], undefined);
  assert.equal(map2['primary'], `color/${pf}/500`);
});

test('suggestSemanticMap(#10) — 임의 색에서 역할 추천(실제 이름 지시)', () => {
  const map = suggestSemanticMap([
    { name: 'color/0066ff', hex: '#0066ff' }, // 유채(채도 최고) → primary
    { name: 'color/f8f8f8', hex: '#f8f8f8' }, // 무채 밝음 → surface
    { name: 'color/111111', hex: '#111111' }, // 무채 어둠 → text
    { name: 'color/888888', hex: '#888888' }, // 무채 중간 → border
  ]);
  assert.equal(map['primary'], 'color/0066ff');
  assert.equal(map['surface'], 'color/f8f8f8');
  assert.equal(map['text'], 'color/111111');
  assert.equal(map['border'], 'color/888888');
});

test('nameColorsByHue(#3) — hue-Global 이름 + 동일 (hue,step) 충돌 접미사', () => {
  // 같은 파랑 두 개(거의 같은 명도) → blue/500, blue/500-2. 빨강·무채는 독립.
  const names = nameColorsByHue(['#3366ff', '#3366fe', '#ff0000', '#808080']);
  assert.equal(names[0], `color/${classifyColor('#3366ff').family}/${classifyColor('#3366ff').step}`);
  assert.match(names[1], /-2$/); // 충돌 → 접미사
  assert.equal(names[0].replace(/\/\d+$/, ''), names[1].replace(/\/\d+(-\d+)?$/, '')); // 같은 hue 패밀리
  assert.equal(names[2], `color/red/${classifyColor('#ff0000').step}`);
  assert.equal(names[3].startsWith('color/gray/'), true);
  // 모든 결과는 팔레트(hue) 이름으로 인식
  for (const n of names) assert.equal(isPaletteColorName(n), true);
});

test('isPaletteColorName — hue 패밀리(+충돌 접미사)만 정리 대상', () => {
  assert.equal(isPaletteColorName('color/blue/500'), true);
  assert.equal(isPaletteColorName('color/blue-2/700'), true);
  assert.equal(isPaletteColorName('color/gray/50'), true);
  assert.equal(isPaletteColorName('color/brandish/500'), false); // 사용자 패밀리
  assert.equal(isPaletteColorName('color/0066ff'), false); // 추출 hex 색(2토막)
  assert.equal(isPaletteColorName('spacing/16'), false); // 비색
});

test('classifyColor / hueName / stepForL (#3) — hue·스텝·무채색', () => {
  assert.equal(classifyColor('#ff0000').family, 'red');
  assert.equal(classifyColor('#00ff00').family, 'green');
  assert.equal(classifyColor('#0000ff').family, 'blue');
  const g = classifyColor('#808080');
  assert.equal(g.family, 'gray');
  assert.equal(g.achromatic, true);
  // 밝기 → 스텝(밝을수록 작은 step)
  assert.equal(classifyColor('#ffffff').step, 50);
  assert.equal(classifyColor('#000000').step, 950);
  assert.ok(stepForL(0.5) >= 400 && stepForL(0.5) <= 600);
  assert.equal(typeof hueName(250), 'string');
});
