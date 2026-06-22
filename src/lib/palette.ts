/* ============================================================
   palette.ts — 브랜드 색 → 톤 스케일·하모니·중립·상태색 생성 (순수, figma 의존 없음)
   출력은 기존 DraftToken[] 형식 → variables.ts(createTokens)로 그대로 커밋.
   ============================================================ */
import { Oklch, hexToOklch, oklchToHex, clampToGamut, mod360 } from './color';
import { classifyColor, HUE_FAMILIES } from './colorName';
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
/** 역할(role) → hue 패밀리 매핑(#3: Global=hue, 역할은 Semantic만). */
export interface PaletteRole {
  role: string;
  family: string;
}
export interface PaletteResult {
  /** Global 스케일 — family는 hue 패밀리(`blue`·`gray`…, 충돌 시 `blue-2`). */
  scales: ColorScale[];
  /** 역할 → hue 패밀리(시맨틱 별칭 산출용). */
  roles: PaletteRole[];
  warnings: string[];
}

/** 스케일의 hue 패밀리를 500 스텝(없으면 중앙)에서 결정. */
function scaleHue(scale: ColorScale): string {
  const mid = scale.swatches.find((s) => s.step === 500) ?? scale.swatches[Math.floor(scale.swatches.length / 2)];
  return classifyColor(mid.hex).family;
}

/**
 * 브랜드 입력 → 전체 팔레트. Global 이름은 **hue 패밀리**(`color/blue/500`),
 * 역할(primary·surface…)은 Semantic 별칭으로만(#3). 동일 hue 충돌은 결정적
 * 접미사 인덱스(`blue`, `blue-2`; 역할 생성 순서 우선).
 */
export function generatePalette(input: PaletteInput): PaletteResult {
  const warnings: string[] = [];
  const base = hexToOklch(input.brand.primary);
  if (base.c < LOW_CHROMA) {
    warnings.push('브랜드색의 채도가 매우 낮아 hue가 불안정합니다 — 중립(neutral) 스케일로 다루는 것을 권장합니다.');
  }

  // 1) 역할별 스케일 생성(스케일 형태는 그대로, family는 임시로 역할명).
  const built: Array<{ role: string; scale: ColorScale }> = [];
  built.push({ role: 'primary', scale: buildScale('primary', input.brand.primary, { anchor: true }) });
  if (input.brand.secondary) built.push({ role: 'secondary', scale: buildScale('secondary', input.brand.secondary, { anchor: true }) });
  if (input.harmony) {
    harmonyHexes(input.brand.primary, input.harmony).forEach((hex, i) => {
      built.push({ role: `accent-${i + 1}`, scale: buildScale(`accent-${i + 1}`, hex) });
    });
  }
  if (input.includeNeutral) built.push({ role: 'neutral', scale: neutralScale(input.brand.primary) });
  if (input.includeStatus) for (const s of statusScales()) built.push({ role: roleForStatusHue(s), scale: s });

  // 2) hue 패밀리 결정 + 충돌 접미사 인덱스(생성 순서대로 우선권).
  const used = new Map<string, number>();
  const scales: ColorScale[] = [];
  const roles: PaletteRole[] = [];
  for (const b of built) {
    const hue = scaleHue(b.scale);
    const n = (used.get(hue) ?? 0) + 1;
    used.set(hue, n);
    const family = n === 1 ? hue : `${hue}-${n}`;
    scales.push({ family, swatches: b.scale.swatches });
    roles.push({ role: b.role, family });
  }

  return { scales, roles, warnings };
}

/** 상태 스케일(success/warning/error/info)의 역할명 복원(statusScales가 family=역할로 만든다). */
function roleForStatusHue(scale: ColorScale): string {
  return scale.family; // statusScales는 family를 'success'… 역할명으로 둔다(여기서 역할로 사용)
}

/** 팔레트가 만든 색 변수 이름인지(재적용 시 이전 색 정리 대상 판별). hue 패밀리(`color/blue/500`, 충돌 `color/blue-2/500`). 추출 hex명(`color/0066ff`)은 제외. */
export function isPaletteColorName(name: string): boolean {
  if (!name.startsWith('color/')) return false;
  const parts = name.split('/');
  if (parts.length !== 3) return false; // hex 평면명(parts 2) 제외
  const base = parts[1].replace(/-\d+$/, ''); // 'blue-2' → 'blue'
  return HUE_FAMILIES.includes(base);
}

/** 이름에서 hue 패밀리 추출(`color/blue-2/500` → `blue-2`), 아니면 null. */
export function paletteFamilyOf(name: string): string | null {
  if (!isPaletteColorName(name)) return null;
  return name.split('/')[1];
}

/**
 * #3: 생성 팔레트의 **역할 → hue Global** 별칭 맵(정확). Global은 hue, 역할은 Semantic만.
 * 예: primary가 blue면 `primary → color/blue/500`.
 */
export function paletteSemanticMap(p: PaletteResult): Record<string, string> {
  const byRole = new Map(p.roles.map((r) => [r.role, r.family]));
  const map: Record<string, string> = {};
  const primary = byRole.get('primary');
  if (primary) {
    map['primary'] = `color/${primary}/500`;
    map['primary/strong'] = `color/${primary}/700`;
    map['primary/subtle'] = `color/${primary}/100`;
  }
  const secondary = byRole.get('secondary');
  if (secondary) map['secondary'] = `color/${secondary}/500`;
  for (const r of p.roles) if (r.role.startsWith('accent-')) map[r.role] = `color/${r.family}/500`;
  const neutral = byRole.get('neutral');
  if (neutral) {
    map['surface'] = `color/${neutral}/50`;
    map['surface/muted'] = `color/${neutral}/100`;
    map['text'] = `color/${neutral}/900`;
    map['text/muted'] = `color/${neutral}/600`;
    map['border'] = `color/${neutral}/200`;
  }
  for (const role of ['success', 'warning', 'error', 'info']) {
    const f = byRole.get(role);
    if (f) map[role] = `color/${f}/500`;
  }
  return map;
}

/**
 * #10: 임의 색 목록(추출·기존 Global)에서 시맨틱 역할 → **실제 변수 이름** 추천(휴리스틱).
 * 색 소스(생성/추출/기존)와 무관하게 매핑 가능. 무채색 → surface/text/border(밝기 순),
 * 채도 최고 유채색 → primary. 이름은 입력의 실제 이름을 그대로 가리킨다.
 */
export function suggestSemanticMap(colors: ReadonlyArray<{ name: string; hex: string }>): Record<string, string> {
  const classed = colors.map((c) => ({ name: c.name, o: hexToOklch(c.hex), achromatic: hexToOklch(c.hex).c < LOW_CHROMA }));
  const map: Record<string, string> = {};

  const neutrals = classed.filter((c) => c.achromatic).sort((a, b) => b.o.l - a.o.l); // 밝은→어두운
  if (neutrals.length) {
    map['surface'] = neutrals[0].name;
    map['text'] = neutrals[neutrals.length - 1].name;
    if (neutrals.length >= 3) map['border'] = neutrals[Math.floor(neutrals.length / 2)].name;
  }
  const chroma = classed.filter((c) => !c.achromatic).sort((a, b) => b.o.c - a.o.c); // 채도 높은 순
  if (chroma.length) map['primary'] = chroma[0].name;
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
