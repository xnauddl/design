/* ============================================================
   colorName.ts — 색 → hue 패밀리·스텝 분류 (순수, figma 의존 없음)
   원칙(#3): Global=원시 정체성(hue) `color/{hue}/{step}`, 역할은 Semantic 별칭으로만.
   OKLCH hue 각 → hue 이름(가장 가까운 중심), L → 스텝(50…950), 저채도 → gray.
   ============================================================ */
import { hexToOklch } from './color';

/** 토큰 스텝(머티리얼/테일윈드 관례) — palette.STEPS와 동일 값(독립 정의로 순환 방지). */
const STEP_LIST = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
/** 스텝별 기준 L(밝은 0.97 → 어두운 0.16, buildScale과 동일 램프). */
const STEP_L = STEP_LIST.map((_, i) => 0.97 + (0.16 - 0.97) * (i / (STEP_LIST.length - 1)));

/** 거의 무채색으로 보는 채도 임계(이하면 hue 불안정 → gray). */
export const ACHROMATIC_C = 0.03;

/** OKLCH hue 중심(도) → 이름. 가장 가까운 중심을 채택(각거리, wrap-around). */
const HUE_CENTERS: ReadonlyArray<{ name: string; h: number }> = [
  { name: 'red', h: 25 },
  { name: 'orange', h: 65 },
  { name: 'yellow', h: 100 },
  { name: 'green', h: 145 },
  { name: 'teal', h: 190 },
  { name: 'blue', h: 250 },
  { name: 'indigo', h: 285 },
  { name: 'purple', h: 320 },
  { name: 'pink', h: 355 },
];

/** 팔레트/분류가 만드는 hue 패밀리 목록(+무채색 gray). */
export const HUE_FAMILIES: readonly string[] = [...HUE_CENTERS.map((c) => c.name), 'gray'];

/** 두 각(0–360)의 최소 각거리. */
function angularDist(a: number, b: number): number {
  const d = Math.abs(((a - b) % 360 + 360) % 360);
  return Math.min(d, 360 - d);
}

/** OKLCH hue 각 → 가장 가까운 hue 이름(결정적, 동률은 목록 순서 우선). */
export function hueName(h: number): string {
  let best = HUE_CENTERS[0];
  let bestD = Infinity;
  for (const c of HUE_CENTERS) {
    const d = angularDist(h, c.h);
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best.name;
}

/** L(0–1) → 가장 가까운 스텝(50…950). */
export function stepForL(l: number): number {
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < STEP_LIST.length; i++) {
    const d = Math.abs(STEP_L[i] - l);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return STEP_LIST[best];
}

export interface ColorClass {
  /** hue 패밀리('blue'…) 또는 무채색 'gray'. */
  family: string;
  /** 톤 스텝(50…950). */
  step: number;
  /** 무채색 여부(채도 < 임계). */
  achromatic: boolean;
}

/** hex → hue 패밀리·스텝 분류(저채도는 gray). */
export function classifyColor(hex: string): ColorClass {
  const o = hexToOklch(hex);
  const achromatic = o.c < ACHROMATIC_C;
  return { family: achromatic ? 'gray' : hueName(o.h), step: stepForL(o.l), achromatic };
}

/**
 * 색 목록 → hue-Global 이름(`color/{hue}/{step}`). 같은 (hue,step)에 서로 다른 색이
 * 겹치면 결정적 접미사 인덱스(`color/blue/500`, `color/blue/500-2`; 입력 순서 우선).
 * 입력과 같은 순서로 반환(토큰 매핑 보존).
 */
export function nameColorsByHue(hexes: readonly string[]): string[] {
  const seen = new Map<string, number>(); // 'family/step' → 다음 인덱스
  return hexes.map((hex) => {
    const { family, step } = classifyColor(hex);
    const base = `${family}/${step}`;
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return n === 1 ? `color/${base}` : `color/${family}/${step}-${n}`;
  });
}
