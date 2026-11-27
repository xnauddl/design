/* ============================================================
   themeGen.ts — 라이트→다크 값 변환 (순수, figma 의존 없음 → node --test)
   OKLCH에서 회색은 밝기를 뒤집고(곡선 — 밝은 단계 간격을 넓힘) 푸른 기를 줄이며,
   강조색은 중간 밝기를 지켜 조금 밝게 한다. 끝(연한 배경 · 짙은 글자)만 뒤집는다.
   색상(hue)은 그대로. 명세 ia-v3 13.7 "Dark 값 공식"(DK-D1–DK-D4 · A.29).
   ============================================================ */
import { hexToOklch, oklchToHex, clampToGamut } from './color';

/**
 * 다크 표면·전경이 쓰는 명도 대역(OKLCH L).
 * 하한 0.18 ≈ #121212(Material)·#0d1117(GitHub) — 순수 검정 표면을 피하는 관례.
 * 상한 0.97 ≈ #f7f7f7 — 순수 흰 전경의 헤일레이션을 줄이는 관례.
 */
export const DARK_L_MIN = 0.18;
export const DARK_L_MAX = 0.97;
/** 회색 곡선 지수 — 1보다 작아 밝은 쪽(흰색 · 50 · 100 · 200) 간격을 넓힌다(DK-D4). */
export const DARK_GRAY_EXP = 0.7;
/** 끝 경계 — 이 밑(짙은 끝)과 이 위(밝은 끝)만 뒤집는다(DK-D3). */
export const DARK_END_LOW = 0.4;
export const DARK_END_HIGH = 0.85;
/** 중간 대역 — 강조색의 중간 밝기(0.40–0.85)를 이 대역으로 살짝 올린다. */
export const DARK_MID_MIN = 0.55;
export const DARK_MID_MAX = 0.85;
/** 강조색 무게 w(중간 밝기)의 채도 구간. */
export const DARK_CHROMA_LOW = 0.04;
export const DARK_CHROMA_HIGH = 0.1;
/** 밝은 끝 무게 wₕ의 채도 구간 — 연한 배경(C < 0.09)은 뒤집고 밝은 강조색(C ≥ 0.14)은 지킨다. */
export const DARK_BRIGHT_CHROMA_LOW = 0.09;
export const DARK_BRIGHT_CHROMA_HIGH = 0.14;
/** 회색 채도 줄임 — 회색(w = 0)일수록 이만큼까지 줄인다. */
export const DARK_GRAY_DESAT = 0.4;

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** 회색 곡선 N(L) — 흰색 → 0.18 · 검정 → 0.97. L이 커지면 엄격히 작아진다(순서 보존). */
export function darkGrayCurve(l: number): number {
  return DARK_L_MIN + (DARK_L_MAX - DARK_L_MIN) * Math.pow(Math.max(0, 1 - l), DARK_GRAY_EXP);
}

/** 중간 대역 M(L) — 0.40 → 0.55 · 0.85 → 0.85. */
function darkMid(l: number): number {
  return DARK_MID_MIN + (l - DARK_END_LOW) * ((DARK_MID_MAX - DARK_MID_MIN) / (DARK_END_HIGH - DARK_END_LOW));
}

/**
 * 라이트 모드 색 → 다크 모드 색(ia-v3 13.7 "Dark 값 공식" 1–5).
 * 1 회색 곡선 N · 2 무게 w(중간) · wₕ(밝은 끝) · 3 짙은 끝 N / 중간 N·M 섞기 / 밝은 끝 N·L 섞기 ·
 * 4 회색 채도 줄임 · 5 sRGB 게멋 클램프. 색상 H는 그대로, 투명도는 부르는 쪽이 지킨다.
 * 회색은 순서가 보존되고(N이 단조), 강조색은 끝만 뒤집어 계열 안 단계 순서가 바뀔 수 있다(받아들임 ①).
 */
export function darkValueForLight(hex: string): string {
  const { l, c, h } = hexToOklch(hex);
  const w = smoothstep(DARK_CHROMA_LOW, DARK_CHROMA_HIGH, c);
  const n = darkGrayCurve(l);
  let lOut: number;
  if (l <= DARK_END_LOW) lOut = n;
  else if (l >= DARK_END_HIGH) {
    const wh = smoothstep(DARK_BRIGHT_CHROMA_LOW, DARK_BRIGHT_CHROMA_HIGH, c);
    lOut = n * (1 - wh) + l * wh;
  } else lOut = n * (1 - w) + darkMid(l) * w;
  const cOut = c * (1 - DARK_GRAY_DESAT * (1 - w));
  return oklchToHex(clampToGamut({ l: lOut, c: cOut, h }));
}

/** 옛 구조(D-T1 전)의 Global 다크 복사본 그룹 접두 — 옮기기 ⑤와 채우기 · 수의 건너뛰기에만 쓴다(ia-v3 13.7). */
export const DARK_PREFIX = 'dark/';

/** 옛 `dark/…` 복사본 이름인지 — 채우기 · 수에서 건너뛰어 "다크의 다크"를 막는다. */
export function isDarkGlobalName(name: string): boolean {
  return name.startsWith(DARK_PREFIX);
}
