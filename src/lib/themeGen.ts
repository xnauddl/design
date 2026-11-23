/* ============================================================
   themeGen.ts — 라이트→다크 값 변환 (순수, figma 의존 없음 → node --test)
   OKLCH 명도(L) 반전 + 게멋 클램프. 색상(hue)·채도(chroma)는 보존해
   브랜드 정체성을 유지하면서 명암만 뒤집는다. R2-A.
   ============================================================ */
import { hexToOklch, oklchToHex, clampToGamut } from './color';

/**
 * 다크 표면·전경이 쓰는 명도 대역(OKLCH L).
 * 하한 0.18 ≈ #121212(Material)·#0d1117(GitHub) — 순수 검정 표면을 피하는 관례.
 * 상한 0.97 ≈ #f7f7f7 — 순수 흰 전경의 헤일레이션을 줄이는 관례.
 */
export const DARK_L_MIN = 0.18;
export const DARK_L_MAX = 0.97;

/**
 * 라이트 모드 색 → 다크 모드 색. OKLCH에서 L을 반전한 뒤 다크 대역으로 아핀 압축하고
 * sRGB 게멋으로 클램프. hue/chroma는 유지(브랜드색 정체성 보존).
 *
 * 단순 `1-L`을 쓰지 않는 이유: L>0.94 구간이 sRGB에서 전부 #000000으로 뭉개져
 * 라이트에서 구분되던 표면 위계가 다크에서 한 색으로 붕괴한다
 * (#ffffff·#f8f9fa·#e9ecef → 모두 검정). 대역 압축은 단조 증가라
 * 입력의 순서와 간격이 보존돼 붕괴가 생기지 않는다.
 */
export function darkValueForLight(hex: string): string {
  const lch = hexToOklch(hex);
  const l = DARK_L_MIN + (1 - lch.l) * (DARK_L_MAX - DARK_L_MIN);
  return oklchToHex(clampToGamut({ l, c: lch.c, h: lch.h }));
}

/** 옛 구조(D-T1 전)의 Global 다크 복사본 그룹 접두 — 옮기기 ⑤와 채우기 · 수의 건너뛰기에만 쓴다(ia-v3 13.7). */
export const DARK_PREFIX = 'dark/';

/** 옛 `dark/…` 복사본 이름인지 — 채우기 · 수에서 건너뛰어 "다크의 다크"를 막는다. */
export function isDarkGlobalName(name: string): boolean {
  return name.startsWith(DARK_PREFIX);
}
