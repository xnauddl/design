/* ============================================================
   uiSize.ts — 플러그인 창 크기 (순수, figma 의존 없음)
   IA v3: 400 × 510 고정 + 최소화(140 × 104, 가운데 펼치기 버튼만 — Tokens Studio처럼 창 자체가 작은 사각형).
   높이 전환(660 ↔ 860)과 넓은 창(760)은 없앴다.
   최소화는 기억하지 않는다 — 다시 열면 늘 펼친 크기다(§4.9).
   드래그 리사이즈는 #14에서 철회(iframe 밖으로 포인터가 나가면 pointermove가 끊긴다).
   ============================================================ */

export type UiSizeMode = 'default' | 'mini';

export const UI_WIDTH = 400;
/** 모드별 폭 — 최소화는 폭도 줄인다(피그마 창 최소 폭 70 이상). */
export const UI_WIDTHS: Record<UiSizeMode, number> = { default: UI_WIDTH, mini: 140 };
export const UI_HEIGHT: Record<UiSizeMode, number> = { default: 510, mini: 104 };
/** 예전 높이 전환이 쓰던 clientStorage 키 — v3에서는 읽지 않고 시작할 때 지운다. */
export const UI_SIZE_KEY = 'dsl.uiSize';

/** 요청값 → 모드. 'mini'만 최소화, 그 밖(예전 'large' 포함)은 전부 기본. */
export function normalizeUiSize(v: unknown): UiSizeMode {
  return v === 'mini' ? 'mini' : 'default';
}

export function uiWidth(mode: UiSizeMode): number {
  return UI_WIDTHS[mode];
}

export function uiHeight(mode: UiSizeMode): number {
  return UI_HEIGHT[mode];
}
