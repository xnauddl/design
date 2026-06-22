/* ============================================================
   palette.ts — 브랜드 색 → 톤 스케일·하모니·중립·상태색 생성 (순수, figma 의존 없음)
   출력은 기존 DraftToken[] 형식 → variables.ts(createTokens)로 그대로 커밋.
   ============================================================ */
import { Oklch, hexToOklch, oklchToHex, clampToGamut, mod360 } from './color';
import type { DraftToken } from './tokens';

/** 토큰 스텝(머티리얼/테일윈드 관례). */
export const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;

export interface Swatch {
  step: number;
  hex: string;
  oklch: Oklch;
}
export interface ColorScale {
  family: string;
  swatches: Swatch[];
}

export interface ScaleOptions {
  /** 브랜드색을 가장 가까운 명도 스텝에 그대로 고정. 기본 false. */
  anchor?: boolean;
  /** [밝은 끝 L, 어두운 끝 L]. 기본 [0.97, 0.16]. */
  lightRange?: [number, number];
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** 채도가 가장자리로 갈수록 감쇠하는 정도(피크 대비). */
const CHROMA_FALLOFF = 0.6;
/** 거의 무채색으로 보는 채도 임계(이하면 hue 불안정). */
export const LOW_CHROMA = 0.03;

/** 한 스텝의 스와치 생성(게멋 보장). */
function swatchAt(step: number, l: number, c: number, h: number): Swatch {
  const lch = clampToGamut({ l, c, h });
  return { step, hex: oklchToHex(lch), oklch: lch };
}

/**
 * 톤 스케일 생성 — hue 고정, 스텝별 목표 L 적용, c는 피크에서 멀수록 감쇠 + 게멋 클램프.
 * anchor 시 브랜드색 원본을 피크 스텝에 그대로 넣고 다른 스텝의 채도가 그보다 높지 않도록 감쇠
 * → 한 스텝만 튀는 채도 스파이크 없이 매끄러운 램프.
 * 예: buildScale('primary', '#3366ff') → primary/50…primary/950.
 */
export function buildScale(family: string, brandHex: string, opts: ScaleOptions = {}): ColorScale {
  const base = hexToOklch(brandHex);
  const [lLight, lDark] = opts.lightRange ?? [0.97, 0.16];
  const n = STEPS.length;
  const targetL = STEPS.map((_, i) => lerp(lLight, lDark, i / (n - 1)));

  // 채도 피크 위치: anchor면 브랜드 L에 가장 가까운 스텝, 아니면 중앙.
  let peak = Math.round((n - 1) / 2);
  if (opts.anchor) {
    peak = 0;
    for (let i = 1; i < n; i++) {
      if (Math.abs(targetL[i] - base.l) < Math.abs(targetL[peak] - base.l)) peak = i;
    }
  }

  const swatches: Swatch[] = STEPS.map((step, i) => {
    if (opts.anchor && i === peak) return { step, hex: brandHex.toLowerCase(), oklch: base };
    const falloff = 1 - CHROMA_FALLOFF * (Math.abs(i - peak) / (n - 1));
    return swatchAt(step, targetL[i], base.c * falloff, base.h);
  });

  return { family, swatches };
}

export type Harmony = 'complementary' | 'analogous' | 'triadic' | 'split' | 'tetradic';

const HARMONY_OFFSETS: Record<Harmony, number[]> = {
  complementary: [180],
  analogous: [-30, 30],
  triadic: [120, 240],
  split: [150, 210],
  tetradic: [90, 180, 270],
};

const rotate = (lch: Oklch, deg: number): Oklch => ({ l: lch.l, c: lch.c, h: mod360(lch.h + deg) });

/** 브랜드색 기준 조화 색(베이스 hue 회전). 베이스는 제외하고 파생색만 반환. */
export function harmonyHexes(brandHex: string, scheme: Harmony): string[] {
  const base = hexToOklch(brandHex);
  return HARMONY_OFFSETS[scheme].map((deg) => oklchToHex(clampToGamut(rotate(base, deg))));
}

/** 중립(gray) 스케일 — 브랜드 hue를 아주 살짝 머금은 회색 램프. */
export function neutralScale(brandHex: string, tint = 0.008): ColorScale {
  const base = hexToOklch(brandHex);
  const [lLight, lDark] = [0.985, 0.15];
  const n = STEPS.length;
  const swatches: Swatch[] = STEPS.map((step, i) =>
    swatchAt(step, lerp(lLight, lDark, i / (n - 1)), tint, base.h),
  );
  return { family: 'neutral', swatches };
}

/** 상태색 — 고정 hue 앵커(OKLCH 기준)에서 각각 스케일 생성. */
export function statusScales(): ColorScale[] {
  const anchors: Array<{ family: string; h: number }> = [
    { family: 'success', h: 150 },
    { family: 'warning', h: 85 },
    { family: 'error', h: 28 },
    { family: 'info', h: 250 },
  ];
  return anchors.map(({ family, h }) => {
    const seed = oklchToHex(clampToGamut({ l: 0.62, c: 0.16, h }));
    return buildScale(family, seed);
  });
}

export interface PaletteInput {
  brand: { primary: string; secondary?: string };
  harmony?: Harmony;
  includeNeutral?: boolean;
  includeStatus?: boolean;
}
export interface PaletteResult {
  scales: ColorScale[];
  warnings: string[];
}

/** 브랜드 입력 → 전체 팔레트(스케일 묶음) + 경고. */
export function generatePalette(input: PaletteInput): PaletteResult {
  const scales: ColorScale[] = [];
  const warnings: string[] = [];

  const base = hexToOklch(input.brand.primary);
  if (base.c < LOW_CHROMA) {
    warnings.push('브랜드색의 채도가 매우 낮아 hue가 불안정합니다 — 중립(neutral) 스케일로 다루는 것을 권장합니다.');
  }

  scales.push(buildScale('primary', input.brand.primary, { anchor: true }));
  if (input.brand.secondary) scales.push(buildScale('secondary', input.brand.secondary, { anchor: true }));

  if (input.harmony) {
    harmonyHexes(input.brand.primary, input.harmony).forEach((hex, i) => {
      scales.push(buildScale(`accent-${i + 1}`, hex));
    });
  }
  if (input.includeNeutral) scales.push(neutralScale(input.brand.primary));
  if (input.includeStatus) scales.push(...statusScales());

  return { scales, warnings };
}

/**
 * 생성된 팔레트로부터 시맨틱 역할 → Global 변수 이름 매핑 제안(Phase 2 입력).
 * 존재하는 패밀리에 대해서만 역할을 배정한다.
 */
export function suggestSemanticMap(p: PaletteResult): Record<string, string> {
  const families = new Set(p.scales.map((s) => s.family));
  const map: Record<string, string> = {};
  if (families.has('primary')) {
    map['primary'] = 'color/primary/500';
    map['primary/strong'] = 'color/primary/700';
    map['primary/subtle'] = 'color/primary/100';
  }
  if (families.has('secondary')) map['secondary'] = 'color/secondary/500';
  for (const f of families) if (f.startsWith('accent-')) map[f] = `color/${f}/500`;
  if (families.has('neutral')) {
    map['surface'] = 'color/neutral/50';
    map['surface/muted'] = 'color/neutral/100';
    map['text'] = 'color/neutral/900';
    map['text/muted'] = 'color/neutral/600';
    map['border'] = 'color/neutral/200';
  }
  for (const f of ['success', 'warning', 'error', 'info']) {
    if (families.has(f)) map[f] = `color/${f}/500`;
  }
  return map;
}

/** 팔레트 → DraftToken[]. 이름 `color/{family}/{step}`, 카테고리 color, scope는 채움(fill). */
export function paletteToDraftTokens(p: PaletteResult): DraftToken[] {
  const tokens: DraftToken[] = [];
  for (const scale of p.scales) {
    for (const sw of scale.swatches) {
      tokens.push({
        name: colorScaleName(scale.family, sw.step),
        category: 'color',
        value: sw.hex,
        sources: ['fill'],
      });
    }
  }
  return tokens;
}

/* ---------- 색 스케일 명칭 (팔레트·추출 공용) ---------- */

/** 색 스케일 변수 이름 — 팔레트 생성과 추출이 동일 체계를 쓰도록 공유. 예: colorScaleName('primary',500)='color/primary/500'. */
export function colorScaleName(family: string, step: number): string {
  return `color/${family}/${step}`;
}

/** OKLCH hue(도) 기준 명명 버킷 중심. 가장 가까운 중심의 이름을 family로 채택(pure 색의 OKLCH hue 근사). */
const HUE_FAMILIES: ReadonlyArray<{ name: string; h: number }> = [
  { name: 'red', h: 29 },
  { name: 'orange', h: 60 },
  { name: 'yellow', h: 100 },
  { name: 'green', h: 142 },
  { name: 'teal', h: 195 },
  { name: 'blue', h: 264 },
  { name: 'purple', h: 310 },
  { name: 'pink', h: 350 },
];

/** 표준 명도 램프(buildScale 기본 [0.97,0.16])의 스텝별 목표 L. 추출 색의 step 매칭에 사용. */
const STEP_L: ReadonlyArray<{ step: number; l: number }> = STEPS.map((step, i) => ({
  step,
  l: lerp(0.97, 0.16, i / (STEPS.length - 1)),
}));

/** 두 hue(도) 사이 원형 거리(0~180). */
function hueDist(a: number, b: number): number {
  const d = Math.abs(mod360(a) - mod360(b));
  return Math.min(d, 360 - d);
}

/**
 * 추출한 임의 색 → 팔레트와 동일한 {family, step}.
 * - 채도가 매우 낮으면(LOW_CHROMA 미만) family='neutral' (hue 불안정 → 회색 취급).
 * - 그 외에는 OKLCH hue를 가장 가까운 명명 버킷에, L을 가장 가까운 스텝에 매칭.
 */
export function classifyColorScale(hex: string): { family: string; step: number } {
  const { l, c, h } = hexToOklch(hex);
  const family =
    c < LOW_CHROMA
      ? 'neutral'
      : HUE_FAMILIES.reduce((best, f) => (hueDist(h, f.h) < hueDist(h, best.h) ? f : best)).name;
  const step = STEP_L.reduce((best, s) => (Math.abs(l - s.l) < Math.abs(l - best.l) ? s : best)).step;
  return { family, step };
}
