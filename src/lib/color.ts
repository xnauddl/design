/* ============================================================
   color.ts — 색공간 변환 + 접근성 대비 (figma.* 의존 없음 → node --test 가능)
   sRGB ↔ 선형 sRGB ↔ OKLab ↔ OKLCH, WCAG 대비비.
   OKLCH를 쓰는 이유: L(명도)을 균등히 움직여도 지각적으로 균일한 스케일이 나온다.
   ============================================================ */
import { hexToRgb, rgbToHex } from './tokens';

export interface Rgb {
  r: number;
  g: number;
  b: number;
} // 각 채널 0~1

export interface Oklch {
  l: number; // 0~1
  c: number; // 0~ (대략 0.4)
  h: number; // 도(degree) 0~360
}

interface Oklab {
  L: number;
  a: number;
  b: number;
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const mod360 = (h: number) => ((h % 360) + 360) % 360;

/* ---------- 감마(sRGB) ↔ 선형 ---------- */
export function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
export function linearToSrgb(c: number): number {
  return c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

/* ---------- 선형 sRGB ↔ OKLab (Björn Ottosson) ---------- */
function linearRgbToOklab(r: number, g: number, b: number): Oklab {
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);
  return {
    L: 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  };
}
function oklabToLinearRgb(lab: Oklab): Rgb {
  const l_ = lab.L + 0.3963377774 * lab.a + 0.2158037573 * lab.b;
  const m_ = lab.L - 0.1055613458 * lab.a - 0.0638541728 * lab.b;
  const s_ = lab.L - 0.0894841775 * lab.a - 1.291485548 * lab.b;
  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;
  return {
    r: 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    g: -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    b: -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  };
}

/* ---------- OKLab ↔ OKLCH ---------- */
function oklabToOklch(lab: Oklab): Oklch {
  const c = Math.sqrt(lab.a * lab.a + lab.b * lab.b);
  const h = c < 1e-7 ? 0 : mod360((Math.atan2(lab.b, lab.a) * 180) / Math.PI);
  return { l: lab.L, c, h };
}
function oklchToOklab(lch: Oklch): Oklab {
  const hr = (lch.h * Math.PI) / 180;
  return { L: lch.l, a: lch.c * Math.cos(hr), b: lch.c * Math.sin(hr) };
}

/* ---------- 공개 변환 ---------- */
export function rgbToOklch(rgb: Rgb): Oklch {
  return oklabToOklch(linearRgbToOklab(srgbToLinear(rgb.r), srgbToLinear(rgb.g), srgbToLinear(rgb.b)));
}
export function oklchToRgb(lch: Oklch): Rgb {
  const lin = oklabToLinearRgb(oklchToOklab(lch));
  return { r: clamp01(linearToSrgb(lin.r)), g: clamp01(linearToSrgb(lin.g)), b: clamp01(linearToSrgb(lin.b)) };
}

export function hexToOklch(hex: string): Oklch {
  return rgbToOklch(hexToRgb(hex));
}
export function oklchToHex(lch: Oklch): string {
  return rgbToHex(oklchToRgb(lch));
}

/* ---------- 게멋(sRGB) 클램프 — h/L 유지, c만 줄여 표현 가능 범위로 ---------- */
function inGamut(lch: Oklch): boolean {
  const lin = oklabToLinearRgb(oklchToOklab(lch));
  const eps = 1e-4;
  return (
    lin.r >= -eps && lin.r <= 1 + eps &&
    lin.g >= -eps && lin.g <= 1 + eps &&
    lin.b >= -eps && lin.b <= 1 + eps
  );
}
export function clampToGamut(lch: Oklch): Oklch {
  if (inGamut(lch)) return lch;
  let lo = 0;
  let hi = lch.c;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (inGamut({ l: lch.l, c: mid, h: lch.h })) lo = mid;
    else hi = mid;
  }
  return { l: lch.l, c: lo, h: lch.h };
}

/* ---------- 접근성 (WCAG 2.x) ---------- */
export function relativeLuminance(rgb: Rgb): number {
  const r = srgbToLinear(rgb.r);
  const g = srgbToLinear(rgb.g);
  const b = srgbToLinear(rgb.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}
/** 배경색 위에 얹을 텍스트(검정/흰색) 중 대비가 큰 쪽. */
export function bestOnColor(bgHex: string): '#000000' | '#ffffff' {
  const bg = hexToRgb(bgHex);
  const onBlack = contrastRatio(bg, { r: 0, g: 0, b: 0 });
  const onWhite = contrastRatio(bg, { r: 1, g: 1, b: 1 });
  return onWhite >= onBlack ? '#ffffff' : '#000000';
}
export function meetsAA(fgHex: string, bgHex: string, large = false): boolean {
  return contrastRatio(hexToRgb(fgHex), hexToRgb(bgHex)) >= (large ? 3 : 4.5);
}
export function meetsAAA(fgHex: string, bgHex: string, large = false): boolean {
  return contrastRatio(hexToRgb(fgHex), hexToRgb(bgHex)) >= (large ? 4.5 : 7);
}
