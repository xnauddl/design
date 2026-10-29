/* ============================================================
   uiSize.ts — 플러그인 창 크기 2단계(기본/크게) (순수, figma 의존 없음)
   QA #2 ① 팝업 크기: 드래그 리사이즈는 #14에서 철회(iframe 밖으로 포인터가 나가면
   pointermove가 끊겨 실기에서 멎음). 대신 버튼으로 높이만 두 단계 전환한다 —
   포인터 추적이 없어 실기에서도 같은 결과. 가로는 #17대로 400 고정.
   ============================================================ */

export type UiSizeMode = 'default' | 'large';

export const UI_WIDTH = 400;
export const UI_HEIGHT: Record<UiSizeMode, number> = { default: 660, large: 860 };
/** clientStorage 키 — 철회 전 드래그 리사이즈가 `{ h }`로 쓰던 키와 같다(옛 값도 읽는다). */
export const UI_SIZE_KEY = 'dsl.uiSize';

/** 저장값 → 모드. 'large'/'default' 문자열이 정식, 옛 `{ h }`는 큰 쪽에 가까우면 large. 그 밖은 default. */
export function normalizeUiSize(v: unknown): UiSizeMode {
  if (v === 'large' || v === 'default') return v;
  if (v && typeof v === 'object') {
    const h = (v as { h?: unknown }).h;
    if (typeof h === 'number' && isFinite(h)) {
      const mid = (UI_HEIGHT.default + UI_HEIGHT.large) / 2;
      return h >= mid ? 'large' : 'default';
    }
  }
  return 'default';
}

export function uiHeight(mode: UiSizeMode): number {
  return UI_HEIGHT[mode];
}
