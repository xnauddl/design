# Claude Code — 와이어프레임 기준 구현 프롬프트

아래 블록을 Claude Code에 그대로 붙여 넣으세요.  
스펙 원본: [`REDESIGN.md`](../REDESIGN.md) · [`wireframe-plugin-ia.html`](wireframe-plugin-ia.html)

---

## 프롬프트 (복사용)

```
당신은 Design System Linker(Figma 플러그인) 코드베이스에서 UX 재설계를 구현한다.

## 스펙 (필수 읽기)
1. REDESIGN.md — ✅ 결정·제거 항목·우선순위 §5가 진실의 원천
2. docs/wireframe-plugin-ia.html — 제안 UX(탭·단계 레일·CTA·없앨 UI). 목업이며 픽셀 복제가 목표가 아님
3. 기존 src/ 엔진(bind·variables·rename 등)은 유지·확장. UI/IA/삭제 위주

## 제품 원칙
- 플러그인은 “변수 CRUD 앱”이 아니다. 흐름은 화면 → 토큰/변수(upsert) → 연결(바인딩).
- 변수 값·이름 미세 수정은 Figma Variables에 맡긴다.
- 이미 있는 변수는 만들기 upsert + 적용 바인딩으로 쓴다.

## 반드시 제거 (다시 만들지 말 것)
| 대상 | ID | 비고 |
|------|-----|------|
| 명도 대비 | #2 | contrast·마법사 단계 포함 |
| 변경 이력 | #9 | history.ts·record() 호출부까지 |
| 공유 프리셋 | #20 | presets.ts·UI·메시지·Paid 배지 |
| 변수 편집기 | #8b | varEditCard·GET/EDIT_VARIABLE·사용처 |
| 내보내기 textarea + 다운로드 이원화 | #8 | 「내보내기」1버튼 → 즉시 파일 저장 |
| 바인딩 허용오차 칩 | #6 | UI 숨김, 엔진 tolerance=0.5 고정 |
| 토큰 사다리/정리 입력 | #19 | 격자 8 내부 고정, UI 비표시 |

## IA (와이어 그대로)
- 4탭: 시작(마법사) · 만들기 · 적용 · 관리
- 만들기 단계 레일: 색 → 토큰 → 테마 → 타이포 (한 화면·한 단계)
- 적용 단계 레일: 바인딩 · 리네임 · 구조(컴포넌트·닮은 프레임)
- 관리만 노출: base · tolerance(0.5 고정 표시) · maxDepth + 내보내기 + 라이선스
- 만들기/적용 단계에 base·tol·depth 입력 노출 금지. clientStorage에 설정 자동 유지

## UX 패턴
- 쓰기 작업(바인딩·리네임·컴포넌트·토큰 적용): 미리보기 → 선택 → 적용 (패턴 A)
- 바인딩 적용: WYSIWYG — dry-run 후보 중 체크된 것만 APPLY_SELECTED, 재매칭 없음 (#6)
- CTA는 상단 툴바. 결과 리스트 max-height 전용 박스·sticky footer 없음 — 패널 body 스크롤 (#18)
- 결과 행 = 얇은 카드(r-card). 텍스트 스타일 표 폐기 → 리스트 + ×N (#17)
- 긴 hint/불릿 축약 (#15). 가로 리사이즈로 표 버티기 비채택
- 색 단계: 추출 → 역할 → 「색 변수 만들기」(Global hue + Semantic). 다음 토큰 단계는 색 외만

## 구현 규칙
1. REDESIGN §5 순서를 따른다. 한 PR에 IA+삭제+패턴A를 몰지 말 것
2. 권장 첫 PR들: 삭제(#9→#20→#8b→#2) → 게이트(#11+#12) → IA 셸(#4+#5)+설정 이동(#19) → 목록(#18)+타이포(#17) → 패턴 A(#7→#6…) → 색(#3+#10)
3. 순수 로직은 node --test. Figma API는 수동 검증
4. record()/프리셋/대비/변수편집 제거 시 import·메시지·i18n·호출부 누락으로 빌드가 깨지지 않게 할 것
5. 와이어/REDESIGN에 없는 기능·설정 화면·미리보기를 “있으면 좋겠다”로 추가하지 말 것
6. 변경 후 npm test(또는 프로젝트 테스트 스크립트)와 빌드(build.mjs) 확인

## 아직 열린 결정 (임의로 고르지 말 것 — Compact+×N으로 진행)
- #17: 와이어프레임의 Compact 리스트 + ×N 배지 채택. 펼침형은 보류

## 이번 세션 작업


#9 변경 이력 제거만

시작 전 REDESIGN.md와 wireframe-plugin-ia.html을 읽고, 이번 작업 범위·건드릴 파일·하지 않을 것을 짧게 요약한 뒤 구현하라.
```

---

## 사용 팁

1. **한 세션 = 한 PR 단위**로 `이번 세션 작업`만 바꿔 붙인다.
2. 첫 세션 추천: `#9 변경 이력 제거만` → 빌드 통과 확인.
3. 와이어 HTML은 브라우저에서 `제안 UX` / `관리`·단계 레일을 같이 보면서 대조한다.  
   로컬: `docs`에서 `python3 -m http.server 8765` →  
   `http://127.0.0.1:8765/wireframe-plugin-ia.html#settings`
4. dark-mode 등 **다른 브랜치/worktree**와 섞지 말 것. 이 스펙은 `design` 리포 UX 재설계용이다.

## 수정사항
1. 색 - 팔레트 생성과 추출.색정리가 개별 카드형태가 아닌 한곳에 모여있어야 한다
2. 적용 버튼 상단
미리보기·적용·다음을 제목 바로 아래 툴바에. sticky footer·하단 예약 영역 불필요.
3. 