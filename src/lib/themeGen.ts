/* ============================================================
   themeGen.ts — 라이트→다크 값 변환 (순수, figma 의존 없음 → node --test)
   OKLCH 명도(L) 반전 + 게멋 클램프. 색상(hue)·채도(chroma)는 보존해
   브랜드 정체성을 유지하면서 명암만 뒤집는다. R2-A.
   ============================================================ */
import { hexToOklch, oklchToHex, clampToGamut } from './color';

/**
 * 라이트 모드 색 → 다크 모드 색. OKLCH에서 L을 반전(1-L)하고 sRGB 게멋으로 클램프.
 * hue/chroma는 유지(브랜드색 정체성 보존). 무채색(흰↔검)도 자연히 반전된다.
 */
export function darkValueForLight(hex: string): string {
  const lch = hexToOklch(hex);
  return oklchToHex(clampToGamut({ l: 1 - lch.l, c: lch.c, h: lch.h }));
}

/**
 * 다크용 Global 프리미티브 이름 — 라이트 Global 이름을 `dark/` 그룹 아래로.
 * 예: 'color/blue/500' → 'dark/color/blue/500'. (Semantic 다크 모드가 이 변수를 재-별칭)
 */
export function darkGlobalName(lightName: string): string {
  return `dark/${lightName}`;
}
