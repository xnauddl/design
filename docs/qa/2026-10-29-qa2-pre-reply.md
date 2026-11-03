# QA #2 사전 회신 — 2026-10-29 (Claude Code)

대상: Claude Docs "DSL QA 핸드오프" › QA #2 사전 작업 › 요청 1(플러그인 창 리사이즈)

## 결정 — 요청 1을 C안(높이 2단계 전환 버튼)으로 대체 (사용자 확정)
요청서의 드래그 리사이즈(pointermove 델타 · 360×520~900×1200)는 이 브랜치에서 이미 한 번 붙였다가
`da94971`(#14)에서 철회한 방식이다. 플러그인 iframe 밖으로 포인터가 나가면 `pointermove`가 끊겨
실기에서 멎었고, 헤드리스에선 재현되지 않아 이 환경에서 검증할 수 없다. 가로 확장도 #17(가로 400 고정)과 충돌.
→ 사용자와 합의해 **드래그 없이 높이만 버튼으로 전환**(포인터 추적 없음 → 실기 결과가 헤드리스와 같음).

## 바뀐 동작
탭 바 오른쪽 끝 ↕ 버튼으로 창 높이 660 ↔ 860 전환, 가로 400 유지. 마지막 단계는 `clientStorage`
`dsl.uiSize`에 기억해 다음 실행에 복원(철회 전 `{ h }` 저장값도 760 기준으로 읽음).

- `src/lib/uiSize.ts`(순수): `normalizeUiSize` · `uiHeight` · `UI_WIDTH=400` · `UI_HEIGHT={660, 860}`
- `src/code.ts`: 시작 시 복원 · `GET_UI_SIZE` / `SET_UI_SIZE` → `figma.ui.resize(400, h)` · `UI_SIZE` 회신
- `src/ui.html`·`src/ui.ts`: `#btnUiSize`(aria-pressed, 툴팁 i18n `ui.sizeGrow`/`ui.sizeShrink`)
- `test/pure.test.mjs`: 정식 값 · 옛 `{h}` 경계(759/760) · 깨진 값 9종 → default · 폭 400

## 검증
- `npm test`: tests 387 · pass 387 · fail 0 (typecheck 통과)
- `verify:i18n`: 누락 0 · 드리프트 0 · 미참조 0
- 헤드리스(400×660·400×860): 버튼 표시 · 탭 바 한 줄(32px) · 가로 스크롤 없음 · 클릭 시 `SET_UI_SIZE{large}` 전송 · `UI_SIZE` 회신으로 표시 확정

## 미검증
- Figma 실기에서 버튼 클릭 → 창 높이 변경, 닫았다 열었을 때 860 복원 (사용자 확인 필요)
- 860이 작은 화면(예: 노트북 768px 높이)에서 화면 밖으로 넘치는지
- dist: 커밋은 prod 빌드(관례). 워킹트리 dev 빌드는 실기 확인 전 `npm run build:dev`로 다시 만들 것.
