/* ============================================================
   palette.ts — 브랜드 색 → 톤 스케일·하모니·중립·상태색 생성 (순수, figma 의존 없음)
   출력은 기존 DraftToken[] 형식 → variables.ts(createTokens)로 그대로 커밋.
   ============================================================ */
import { Oklch, hexToOklch, oklchToHex, clampToGamut } from './color';
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
/** 거의 무채색으로 보는 채도 임계(이하면 hue 불안정). */
export const LOW_CHROMA = 0.03;

/**
 * 톤 스케일 생성 — hue 고정, 스텝별 목표 L 적용, c는 게멋 클램프로 양끝에서 자연 감쇠.
 * 예: buildScale('primary', '#3366ff') → primary/50…primary/950.
 */
export function buildScale(family: string, brandHex: string, opts: ScaleOptions = {}): ColorScale {
  const base = hexToOklch(brandHex);
  const [lLight, lDark] = opts.lightRange ?? [0.97, 0.16];
  const n = STEPS.length;

  const swatches: Swatch[] = STEPS.map((step, i) => {
    const l = lerp(lLight, lDark, i / (n - 1));
    const lch = clampToGamut({ l, c: base.c, h: base.h });
    return { step, hex: oklchToHex(lch), oklch: lch };
  });

  if (opts.anchor) {
    // 브랜드색 L에 가장 가까운 스텝을 브랜드색 원본으로 교체(신뢰: 내 색이 그대로 있다).
    let best = 0;
    for (let i = 1; i < swatches.length; i++) {
      if (Math.abs(swatches[i].oklch.l - base.l) < Math.abs(swatches[best].oklch.l - base.l)) best = i;
    }
    swatches[best] = { step: swatches[best].step, hex: brandHex.toLowerCase(), oklch: base };
  }

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

const rotate = (lch: Oklch, deg: number): Oklch => ({ l: lch.l, c: lch.c, h: (((lch.h + deg) % 360) + 360) % 360 });

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
  const swatches: Swatch[] = STEPS.map((step, i) => {
    const l = lerp(lLight, lDark, i / (n - 1));
    const lch = clampToGamut({ l, c: tint, h: base.h });
    return { step, hex: oklchToHex(lch), oklch: lch };
  });
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
        name: `color/${scale.family}/${sw.step}`,
        category: 'color',
        value: sw.hex,
        sources: ['fill'],
      });
    }
  }
  return tokens;
}
