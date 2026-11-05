# PR 4 문구 전후 표 (확정 2026-11-04)

> 코드 기준 `5c61c6f`(= 브랜치 `2714765`, 코드 변경 없음) · 명세 `docs/ia-v3.md` §2.9 · §9 · 부록 A.4
> 2026-11-04 사용자 결정으로 이 표의 “바꿀 문구”는 **확정**이다. PR 4는 이 표대로 i18n 키를 만들고 문구를 바꾼다.

## 요약

| | 개수 |
|---|---|
| 전체 행 | **277** |
| 문구를 바꾸는 행 | **146** (그중 기존 STRINGS 10번 묶음 50) |
| i18n으로 옮기기만(문구 그대로) | **123** |
| 삭제(화면 밖이거나 지우는 조각) | **8** |

묶음별: 공통 5(바꿈 1) · 변수 탭 11(바꿈 3) · 레이어 › 연결 14(바꿈 5 · 삭제 1) · 레이어 › 이름 2(바꿈 1) · 레이어 › 컴포넌트 45(바꿈 7) · 만들기 · 마법사 43(바꿈 20) · 설정 · 라이선스 33(바꿈 28) · 오류 · 상태 줄 15(바꿈 8) · 플러그인 쪽(code.ts · lib) 메시지 59(바꿈 23 · 삭제 7) · 기존 STRINGS 50(바꿈 50)

- 한 행 = i18n 키 하나. 같은 문구를 여러 줄이 쓰면 위치에 줄을 함께 적었다(예: `code.ts` 1471 · 1649 · 1701).
- 기존 키 17개(A.4 “i18n 변경” 표)도 문구가 바뀌므로 함께 넣었다. 10번 묶음은 표에 없던 기존 STRINGS(합니다체 · “토큰을 생성” · 라이트/다크)다(결정 (a) · (d)).
- **자리표시자는 ASCII 이름만** 쓴다(`{reason}`, `{name}` …). `t()`의 정규식 `/\{(\w+)\}/`는 ASCII만 잡는다. 앞뒤가 붙었다 떨어지는 조건부 조각(“ — 첫 경고”, “ 외”, “ · 상태”)은 따로 키를 둔다(`similar.failedWarn` · `create.sumBaseMore` · `license.srcKeyStatus`).
- **조각을 받는 자리표시자는 이름 끝에 `Part`를 붙여** 값 자리표시자와 나눈다: `license.srcKey`의 `{statusPart}`(← `license.srcKeyStatus` “ · {status}”), `similar.failed`의 `{warnPart}`(← `similar.failedWarn` “ — {warning}”), `create.sumBase`의 `{morePart}`(← `create.sumBaseMore`), `create.tidySummary`의 `{mergedPart}` · `{gapPart}`, `dark.done`의 `{modePart}` · `{skipPart}`, `dark.fillFailed`의 `{modePart}`, `similar.scanned`의 `{openPart}` · `{skipPart}`, `license.current`의 `{expPart}`, `component.registered` · `component.variants`의 `{extraPart}`. 값(숫자 · 이름 · 사유 문장)을 받는 자리는 `Part`를 붙이지 않는다(`{why}` · `{source}` 등).
- **같은 글자의 키:** 문맥이 다르면 따로 둬도 된다(예: `rename.count`와 `component.count`의 “후보 {total}”). 같은 자리 · 같은 뜻이면 기존 키를 쓴다(`list.searchClear` · `list.noGroup` · `edit.deletedTarget`).
- `ui.html`의 aria-label은 지금 i18n이 덮지 않는다(정적 i18n은 글자 · title · placeholder만). 새 속성 `data-i18n-aria-label`로 옮긴다. title과 글자가 같은 것은 같은 키를 쓴다.
- 말투(결정 ①): 모든 문장을 해요체로 쓴다. 합니다체(“…했습니다”, “…없습니다”)와 “…됨”으로 끝나는 알림 문장은 해요체로 바꿨다. 안내의 “…하세요”는 해요체이므로 그대로 둔다(§2.9 “레이어를 선택하세요”). 숫자 · 라벨 · 진단 조각(“구조 불일치”, “… 실패({이름}): {오류}”, “(원본 표기 생략)”)은 문장이 아니라서 “(그대로)”다.

## 사용자 결정 (2026-11-04, 확정)

1차 결정 1~11 뒤에 2차 결정 (a)~(d)가 나왔다. 둘이 다르면 2차가 앞선다(2 · 6 · 11은 2차로 바뀜).

1. **말투** — 이번 PR에서 해요체로 통일한다. “그대로”였던 행 중 31행을 해요체로 바꿨다(이유 “§9 해요체 통일”).
2. **유료 사유 문구 8곳**(9번) — ~~키 하나에 기능 이름~~ → **2차 (c)로 바뀜: 지운다**(화면 밖). 마법사 단계 실패 줄은 `PREMIUM_REQUIRED`면 `status.paid`를 쓴다.
3. **찾기를 취소했을 때**(3번 `apply.cancelled`) — 상태 줄에 “찾기를 취소했어요”를 띄운다.
4. **레이어 선택 결과 문구 통일**(3번 2163~2167) — 변수 탭의 `list.select*` 3개와 합쳐 `select.*`로 쓴다. “미리보기를 다시 실행하세요” 꼬리는 버린다.
5. **라이선스 “현재” 줄**(7번 2280) — FREE / PAID를 **그대로** 둔다(무료/유료로 바꾸지 않음). i18n으로 옮기기만 한다.
6. **라이선스 검증 실패**(7번) — **2차 (b)로 바뀜:** 서버가 보내는 알려진 사유는 `license.err.server.*` 키로 화면 줄에, 모르는 사유와 플러그인 쪽 기술 사유 14개(`license.err.*`)는 `license.verifyFailed` 한 줄 + 툴팁. “검증 실패:” 머리말 중복 버그(license.ts 84 · 87 · 88 경로)도 고친다.
7. **오프라인 grace 문구**(9번 `license.noteGrace`) — “오프라인이에요 — 이 기기에 저장된 라이선스로 계속 써요”.
8. **“토큰 생성” → “토큰 만들기”**(1번 `prereq.gotoCreate`, 6번 1635 · 1810, 8번 `err.scopeAction`) — 바꾼다.
9. **컴포넌트 처리 중 문제(진단) 16개**(9번 `component.fail.*`) — 내부 말(“속성접힘”, “결합”, “정렬”)은 그대로 둔다. 문장으로 끝나는 2개(`iconFallback` · `photoNoSlot`)만 해요체로 바꿨다.
10. **만들기 › 다크 결과의 “연결”**(6번 `dark.done`) — 그대로 둔다.
11. **모드 이름 맞추기**(6번 1816 · 1854) — **2차 (d)로 바뀜:** “밝은 모드”가 아니라 “라이트”로 맞춘다 — “컬렉션과 라이트 모드를 고르세요.”

### 2차 결정 (2026-11-04, 검토 1회차 뒤)

- (a) **해요체 범위 넓힘** — 표에 없던 기존 STRINGS의 합니다체와 “토큰을 생성”도 이번 PR에서 바꾼다 — 10번 묶음 50행.
- (b) **라이선스 사유** — 서버가 보내는 알려진 사유(구독 만료 · 잘못된 키 · 기기 한도 · 서버 오류, `workers/verify/src/index.js` 138 · 148)는 서버가 `code`를 붙여 보내고 플러그인은 `license.err.server.*` 해요체 키로 화면 줄에 띄운다. 모르는 사유와 플러그인 쪽 기술 사유는 `license.verifyFailed` 한 줄 + 원문 툴팁. 상태값 active/grace/expired → “사용 중 / 유예 기간 / 만료”(`license.status.*`). FREE/PAID는 그대로.
- (c) **유료 사유 8곳 삭제** — `paid.feature`는 화면에 안 나오므로 만들지 않는다. `requirePaid`는 `message` 인자를 지우고 `feature`만 보낸다(9번 묶음 “삭제”). `scanBindings`도 함수 · 테스트 · export를 지운다.
- (d) **모드 표기 “라이트 · 다크”** — 칸 이름은 “라이트” · “다크”, 문장 속 모드는 “다크 모드”. “밝은 모드” · “어두운 모드” · “Dark 모드” 표기를 없앤다(만들 모드의 실제 이름 “Dark”만 남김).

## 화면에 안 나오는 문구 (표에서 뺌)

i18n.ts 머리 주석(“화면에 보이는 한국어는 전부 여기에 있다”)을 지키는 데는 상관없지만, A.4의 새 검사(“i18n.ts 밖 문자열 리터럴에 한글 0”)를 통과하려면 함께 정리해야 한다.

| 위치 | 지금 | 처리 |
|---|---|---|
| `lib/bind.ts` 343 · 486 · 513 · 596 · 606 · 612 | `APPLY_RESULT.flags` 안내 6종(“…바인딩…”) | 지운다(A.4 “삭제”의 기존 항목) |
| `lib/bind.ts` 1033 | `scanBindings`의 “(삭제된 변수)” | `code.ts`가 부르지 않는다 → 함수째 지운다(`figma-lib.ts` 19 export, `figma.test.mjs` 18 import · 1425 테스트 · 4059 사용) — 결정 (c) |
| `ui.ts` 1544 | “검증 서버 연결 실패(오프라인)” | `offline: true`면 `code.ts`가 자기 문구(1214 · 1215)를 쓰므로 안 보인다 → 문구를 지운다(`offline: true`만 넘김) |
| `workers/verify/src/index.js` 101 · 105 · 107 | 해제(deactivate) 실패 사유 | UI가 읽지 않는다(해제는 best-effort) → 그대로(서버 파일은 검사 범위 밖) |
| `lib/variables.ts` 937 · 940 · 941 · 942 | `TEXT_STYLES_APPLIED.missing`(“적용 실패 …” · “적용 대상 없음 …” · “미등록 …” · “모호 …”) | UI가 `missing`을 읽지 않는다(결과 줄은 `bind.tsDone` + 사유 툴팁) → 필드와 문구를 지운다 |

## 1. 공통

| # | 위치(file:line) | i18n 키(기존/새) | 지금 문구 | 바꿀 문구(확정) | 이유 |
|---|---|---|---|---|---|
| 1-1 | `i18n.ts 509` | 기존 `prereq.gotoCreate` | 토큰 생성으로 → | **토큰 만들기로 →** | 버튼·단계 이름과 맞춤(§3.1 · §4.5 · §4.6) |
| 1-2 | `ui.html 759` | 새 `tab.listAria` | 작업 탭 (aria-label) | (그대로) | i18n 이동만 |
| 1-3 | `ui.html 764` | 기존 `ui.minimize` | 최소화 (aria-label) | (그대로) | i18n 이동만(title은 이미 키 — aria-label도 같은 키) |
| 1-4 | `ui.html 1007` | 새 `rail.layerAria` | 레이어 작업 (aria-label) | (그대로) | i18n 이동만 |
| 1-5 | `ui.html 1182` | 기존 `ui.expand` | 펼치기 (aria-label, `data-i18n-aria-label` 붙임) | (그대로) | i18n 이동만(⑤ 폴백도 verify-i18n이 보게) |

## 2. 변수 탭

| # | 위치(file:line) | i18n 키(기존/새) | 지금 문구 | 바꿀 문구(확정) | 이유 |
|---|---|---|---|---|---|
| 2-1 | `i18n.ts 228` | 기존 `vm.detail` | 상세 보기… | **상세** | 본문 §4.4 행 메뉴 문구 |
| 2-2 | `i18n.ts 350 · ui.html 796` | 기존 `list.findUnboundTip` | 선택에서 변수로 바꿀 수 있는 색·간격을 찾아 연결 미리보기를 엽니다 | **선택에서 변수로 바꿀 수 있는 색·간격을 레이어 › 연결에서 찾아요** | §2.9 연결은 “찾기”(미리보기 없음) |
| 2-3 | `i18n.ts 479` | 기존 `colRoles.saved` | {name} → {role}. 바인딩·역할 추천·내보내기가 이 지정을 따릅니다. | **{name} → {role}. 연결·역할 추천·내보내기가 이 지정을 따라요** | 금지 용어(바인딩) |
| 2-4 | `ui.html 798` | 기존 `list.addTip` | 선택한 프레임에서 변수 만들기(색·토큰·테마·타이포) (aria-label) | (그대로) | i18n 이동만(title과 같은 키) |
| 2-5 | `ui.html 799` | 기존 `list.moreTip` | 더 보기 (aria-label) | (그대로) | i18n 이동만(title과 같은 키) |
| 2-6 | `ui.html 800` | 기존 `list.refreshTip` | 다시 읽기 (aria-label) | (그대로) | i18n 이동만(title과 같은 키) |
| 2-7 | `ui.html 805` | 새 `list.sideAria` | 변수 컬렉션 (aria-label) | (그대로) | i18n 이동만 |
| 2-8 | `ui.html 811` | 기존 `list.searchTip` | 검색 (aria-label) | (그대로) | i18n 이동만(title과 같은 키) |
| 2-9 | `ui.html 812` | 기존 `list.searchClear`(i18n.ts 393 — 지금 `ui.html`·`varTable.ts`가 키를 안 씀) | 검색 지우기 (aria-label) | (그대로) | i18n 이동만(같은 글자의 기존 키를 씀) |
| 2-10 | `ui.html 814` | 새 `list.gridAria` | 변수 목록 (aria-label) | (그대로) | i18n 이동만 |
| 2-11 | `lib/varTable.ts 97` | 기존 `list.noGroup`(i18n.ts 381 — 지금 `ui.html`·`varTable.ts`가 키를 안 씀) | (그룹 없음) | (그대로) | i18n 이동만(같은 글자의 기존 키를 씀) |

## 3. 레이어 › 연결

| # | 위치(file:line) | i18n 키(기존/새) | 지금 문구 | 바꿀 문구(확정) | 이유 |
|---|---|---|---|---|---|
| 3-1 | `i18n.ts 46` | 기존 `apply.cancelRequested` | 취소 요청됨 — 다음 지점에서 중단합니다. | **취소하는 중…** | §9 짧게 · 해요체 |
| 3-2 | `i18n.ts 47` | 기존 `apply.cancelled` | 취소됨 — {bound}곳만 연결{detail} | **찾기를 취소했어요** | 취소는 찾기에서만 일어남(§4.6 “찾기 취소됨 = 찾기 전”) — “0곳만 연결”이 틀림 |
| 3-3 | `ui.ts 2104` | (지움 — `apply.cancelled`의 {detail}) |  · 스킵 {n} — {reason} | **(삭제 — 지움)** | 금지 용어(스킵) · 찾기 취소에는 건너뜀 수가 없음 |
| 3-4 | `ui.ts 1124` | 새 `bind.linking` | 연결 중… | (그대로) | i18n 이동만 — 이때 [취소]는 숨김(2026-11-04 결정) |
| 3-5 | `ui.ts 3341` | 새 `bind.progressOf` | {done} / {total} 처리 중… ({pct}%) | (그대로) | i18n 이동만 |
| 3-6 | `ui.ts 3341` | 새 `bind.progressCount` | {done}개 처리 중… | (그대로) | i18n 이동만 |
| 3-7 | `ui.ts 3257` | 새 `bind.skipSelected` | {reason} 레이어 {n}개 선택 | (그대로) | i18n 이동만 |
| 3-8 | `ui.ts 2163 · 2156 · i18n.ts 404` | 기존 `list.selectCapped` → `select.capped` | 연결: 레이어 {found}개만 선택 — 한 번에 보여줄 수 있는 상한({requested}개 중)입니다. / 변수 탭(i18n.ts 404): 레이어 200개만 선택했어요(전체 {n}개) | **레이어 {found}개만 선택했어요(전체 {requested}개)** | 같은 상황은 같은 문구 · 자리표시자 `{n}` → `{found}`·`{requested}`(호출부 ui.ts 2156 · 2163 고침) |
| 3-9 | `ui.ts 2166 · 2158 · i18n.ts 406` | 기존 `list.selectPartial` → `select.partial` | 연결: 레이어 {found}개 선택 — {missing}개는 삭제됐거나 다른 페이지입니다. / 변수 탭(i18n.ts 406): 레이어 {found}개 선택 — {missing}개는 삭제됐거나 다른 페이지예요 | **레이어 {found}개 선택 — {missing}개는 삭제됐거나 다른 페이지예요** | 같은 상황은 같은 문구 · 자리표시자 그대로(호출부 ui.ts 2158 · 2166) |
| 3-10 | `ui.ts 2167 · 2157 · i18n.ts 405` | 기존 `list.selectNone` → `select.none` | 연결: 레이어를 찾지 못했습니다 — 삭제됐거나 다른 페이지입니다. 미리보기를 다시 실행하세요. / 변수 탭(i18n.ts 405): 선택할 레이어를 찾지 못했어요 — 삭제됐거나 다른 페이지예요 | **선택할 레이어를 찾지 못했어요 — 삭제됐거나 다른 페이지예요** | §2.9 연결은 “찾기” · 텍스트 스타일 배지에서도 뜨므로 꼬리 안내를 뺌(호출부 ui.ts 2157 · 2167) |
| 3-11 | `ui.html 1019` | 기존 `bind.stepsAria` | 연결 단계 (aria-label, `data-i18n-aria-label` 붙임) | (그대로) | i18n 이동만(⑤ 폴백도 verify-i18n이 보게) |
| 3-12 | `ui.html 1024` | 기존 `bind.find` | 찾기 (`#btnApplyLabel`에 `data-i18n` 붙임) | (그대로) | i18n 이동만(⑤ 폴백도 verify-i18n이 보게) |
| 3-13 | `ui.html 1025` | 기존 `bind.link` | 연결 (`#btnApplyConfirmLabel`에 `data-i18n` 붙임) | (그대로) | i18n 이동만(⑤ 폴백도 verify-i18n이 보게) |
| 3-14 | `ui.html 1046` | 기존 `bind.filterBtn` | 변수 이름 필터 (aria-label, `data-i18n-aria-label` 붙임) | (그대로) | i18n 이동만(⑤ 폴백도 verify-i18n이 보게) |

## 4. 레이어 › 이름

| # | 위치(file:line) | i18n 키(기존/새) | 지금 문구 | 바꿀 문구(확정) | 이유 |
|---|---|---|---|---|---|
| 4-1 | `i18n.ts 88` | 기존 `rename.previewCount` | {total}개 변경 예정 · {sel}개 선택 — ‘이름 적용’. | **{total}개 변경 예정 · {sel}개 체크 — ‘이름 적용’** | §2.9 체크로 고른 것은 “체크한” (“선택”은 캔버스만) |
| 4-2 | `ui.ts 2661` | 새 `rename.count` | 후보 {total} | (그대로) | i18n 이동만 |

## 5. 레이어 › 컴포넌트

| # | 위치(file:line) | i18n 키(기존/새) | 지금 문구 | 바꿀 문구(확정) | 이유 |
|---|---|---|---|---|---|
| 5-1 | `i18n.ts 99` | 기존 `component.noChecked` | 체크된 후보가 없습니다 — 트리에서 묶을 항목을 선택하세요. | **체크한 후보가 없어요 — 묶을 항목을 체크하세요** | §2.9 “선택”은 캔버스만 |
| 5-2 | `i18n.ts 100` | 기존 `component.candidates` | 등록 후보 {total}개 · {sel}개 선택 | **등록 후보 {total}개 · {sel}개 체크** | §2.9 “선택”은 캔버스만 |
| 5-3 | `ui.ts 2324` | 새 `component.extraSkipped` |  · 스킵 {n} | ** · 건너뜀 {n}** | 금지 용어(스킵) |
| 5-4 | `ui.ts 2324 · 2332` | 새 `component.extraSingles` |  · 단일 {n} | (그대로) | i18n 이동만 |
| 5-5 | `ui.ts 2324` | 새 `component.extraProps` |  · 속성 {n} | (그대로) | i18n 이동만 |
| 5-6 | `ui.ts 2324` | 새 `component.extraIcons` |  · 아이콘 {n} | (그대로) | i18n 이동만 |
| 5-7 | `ui.ts 2332` | 새 `component.extraMissing` |  · 빈 조합 있음 | (그대로) | i18n 이동만 |
| 5-8 | `ui.ts 2337` | 새 `component.tagAdded` | 생성 | (그대로) | i18n 이동만 |
| 5-9 | `ui.ts 3102` | 새 `component.variantFallback` | 베리언트 | (그대로) | i18n 이동만 |
| 5-10 | `ui.ts 3102` | 새 `component.badgeSet` | 세트 | (그대로) | i18n 이동만 |
| 5-11 | `ui.ts 3105` | 새 `component.changeProps` | {name} · 속성 | (그대로) | i18n 이동만 |
| 5-12 | `ui.ts 3105` | 새 `component.badgeProps` | 속성 | (그대로) | i18n 이동만 |
| 5-13 | `ui.ts 3105 · 3107` | 새 `component.nameFallback` | 컴포넌트 | (그대로) | i18n 이동만 |
| 5-14 | `ui.ts 3107` | 새 `component.badgeSingle` | 단독 | (그대로) | i18n 이동만 |
| 5-15 | `ui.ts 3126` | 새 `component.count` | 후보 {total} | (그대로) | i18n 이동만 |
| 5-16 | `ui.ts 3186` | 새 `component.tagMissing` | 빈 조합 | (그대로) | i18n 이동만 |
| 5-17 | `ui.ts 3186` | 새 `component.headMissing` | 빈 조합(미생성): | (그대로) | i18n 이동만 |
| 5-18 | `ui.ts 3187` | 새 `component.tagIssue` | 문제 | (그대로) | i18n 이동만 |
| 5-19 | `ui.ts 3187` | 새 `component.headIssue` | 처리 중 문제 {n}건: | (그대로) | i18n 이동만 |
| 5-20 | `ui.ts 3195` | 새 `component.tagCount` | {tag} {n}개 | (그대로) | i18n 이동만 |
| 5-21 | `ui.ts 1872` | 새 `similar.scanning` | 닮은 프레임을 찾는 중… | (그대로) | i18n 이동만 |
| 5-22 | `ui.ts 1882` | 새 `similar.componentizing` | 컴포넌트화하는 중… | (그대로) | i18n 이동만 |
| 5-23 | `ui.ts 2391` | 새 `similar.failed` | 컴포넌트화하지 못했습니다 + 경고가 있으면 “ — {warning}” | **컴포넌트화하지 못했어요{warnPart}** | §9 해요체 통일 · ② 조건부 조각은 `similar.failedWarn`(조각을 받는 자리 `{warnPart}`) |
| 5-24 | `ui.ts 2391` | 새 `similar.failedWarn` |  — {warning} | (그대로) | i18n 이동만(② 조건부 조각을 나눈 키) |
| 5-25 | `ui.ts 2394` | 새 `similar.resMaster` | 마스터 {name} | (그대로) | i18n 이동만 |
| 5-26 | `ui.ts 2394` | 새 `similar.resInstances` | 인스턴스 {n}개 | (그대로) | i18n 이동만 |
| 5-27 | `ui.ts 2395` | 새 `similar.resProps` | 속성 {n}개 | (그대로) | i18n 이동만 |
| 5-28 | `ui.ts 2396` | 새 `similar.resImages` | 이미지 {n}개 | (그대로) | i18n 이동만 |
| 5-29 | `ui.ts 2398` | 새 `similar.resKept` |  · 남겨둔 것 {n}건: {warning} | (그대로) | i18n 이동만 |
| 5-30 | `ui.ts 3288` | 새 `similar.metaText` | 텍스트 {filled}/{total} | (그대로) | i18n 이동만 |
| 5-31 | `ui.ts 3289` | 새 `similar.metaImages` | 이미지 {n} | (그대로) | i18n 이동만 |
| 5-32 | `ui.ts 3290` | 새 `similar.metaEmpty` | 빈 칸 {n} | (그대로) | i18n 이동만 |
| 5-33 | `ui.ts 3297` | 새 `similar.recommended` | 추천 | (그대로) | i18n 이동만 |
| 5-34 | `ui.ts 3313` | 새 `similar.count` | 닮은 {n}개 | (그대로) | i18n 이동만 |
| 5-35 | `ui.ts 3321` | 새 `similar.needTwo` | 구조가 같은 프레임을 2개 이상 선택하세요. | (그대로) | i18n 이동만 |
| 5-36 | `ui.ts 3322` | 새 `similar.none` | 컴포넌트화할 프레임이 없습니다 — {why} | **컴포넌트화할 프레임이 없어요 — {why}** | §9 해요체 통일 |
| 5-37 | `ui.ts 3329` | 새 `similar.openText` | 텍스트 {n} | (그대로) | i18n 이동만 |
| 5-38 | `ui.ts 3330` | 새 `similar.openSwap` | 아이콘 교체 {n} | (그대로) | i18n 이동만 |
| 5-39 | `ui.ts 3331` | 새 `similar.openImage` | 이미지 {n} | (그대로) | i18n 이동만 |
| 5-40 | `ui.ts 3332` | 새 `similar.opened` | 속성으로 열림: {list} | (그대로) | i18n 이동만 |
| 5-41 | `ui.ts 3332` | 새 `similar.noVarying` | 가변 위치가 없어 속성은 만들지 않아요 | (그대로) | i18n 이동만 |
| 5-42 | `ui.ts 3333` | 새 `similar.excluded` |  · 제외 {n}개({why}) | (그대로) | i18n 이동만 |
| 5-43 | `ui.ts 3334` | 새 `similar.scanned` | 대상 {n}개 · {openPart}{skipPart} | (그대로) | i18n 이동만 · 조각을 받는 자리는 `{…Part}`(호출부 ui.ts 3332~3334도 바꿈) |
| 5-44 | `i18n.ts 101` | 기존 `component.registered` | 컴포넌트 {registered} · 베리언트 세트 {sets}{extra} | **컴포넌트 {registered} · 베리언트 세트 {sets}{extraPart}** | 조각을 받는 자리는 `{…Part}` — `{extra}` → `{extraPart}`(← `component.extra*` 조각, 호출부 ui.ts 2324~2325도 바꿈) |
| 5-45 | `i18n.ts 102` | 기존 `component.variants` | 베리언트 세트 {sets}개 생성{extra} | **베리언트 세트 {sets}개 생성{extraPart}** | 조각을 받는 자리는 `{…Part}` — `{extra}` → `{extraPart}`(← `component.extra*` 조각, 호출부 ui.ts 2332~2333도 바꿈) |

## 6. 만들기 · 마법사

| # | 위치(file:line) | i18n 키(기존/새) | 지금 문구 | 바꿀 문구(확정) | 이유 |
|---|---|---|---|---|---|
| 6-1 | `i18n.ts 106` | 기존 `wizard.needSelect` | 먼저 프레임을 선택하세요 — 선택한 레이어에서 토큰을 추출합니다. | **먼저 레이어를 선택하세요 — 선택에서 값을 뽑아요** | §2.9 선택 안내 동사(“레이어를 선택하세요”) |
| 6-2 | `i18n.ts 145` | 기존 `wizard.skip.paid` | Paid 전용 | **유료 기능** | 금지 용어(Paid) |
| 6-3 | `i18n.ts 146` | 기존 `wizard.chip.paid` | Paid 전용 단계라 이번 실행에서는 건너뜁니다 — 설정 탭에서 라이선스를 등록하면 함께 돕니다 | **유료 기능이라 이번 실행에서는 건너뛰어요 · 설정 › 라이선스** | 금지 용어(Paid) · §2.3 잠금 툴팁 꼬리와 맞춤 |
| 6-4 | `i18n.ts 175` | 기존 `wizard.seq.noExtract` | 추출된 토큰 없음 — 색·폰트·간격이 있는 프레임을 선택하세요. | **뽑은 값이 없어요 — 색·폰트·간격이 있는 레이어를 선택하세요** | §2.9 선택 안내 동사 |
| 6-5 | `i18n.ts 506` | 기존 `wizardCard.legend` | 역할 매핑=색 역할 · 다크=라이트 모드에서 어두운 값 채우기 | **역할 매핑=색 역할 · 다크=라이트에서 어두운 값 채우기** | §9 짧게(한 줄에 들게) |
| 6-6 | `ui.html 860` | 새 `rail.makeAria` | 만들기 단계 (aria-label) | (그대로) | i18n 이동만 |
| 6-7 | `ui.ts 378` | 새 `create.hintPreview` | ‘미리보기’를 누르세요. | (그대로) | i18n 이동만 |
| 6-8 | `ui.ts 378` | 새 `create.hintNoSel` | 프레임을 먼저 선택하세요. | **레이어를 먼저 선택하세요.** | §2.9 선택 안내 동사 |
| 6-9 | `ui.ts 382` | 새 `create.hintReveal` | ‘미리보기’를 누르면 만들 토큰이 표시됩니다. | **‘미리보기’를 누르면 만들 토큰이 보여요** | §9 해요체 통일 |
| 6-10 | `ui.ts 391` | 새 `create.onlyColors` | 색 외 토큰이 없습니다(색만 추출됨). | **색 외 토큰이 없어요(색만 뽑았어요)** | §9 해요체 통일 |
| 6-11 | `ui.ts 406` | 새 `create.count` | 후보 {sel}/{total} | (그대로) | i18n 이동만 |
| 6-12 | `ui.ts 591` | 새 `color.usedCount` |  · {n}× 사용 | (그대로) | i18n 이동만 |
| 6-13 | `ui.ts 723` | 새 `create.tidyMerged` |  · 같은 칸 {n}개 병합 | (그대로) | i18n 이동만 |
| 6-14 | `ui.ts 726` | 새 `create.tidySummary` | 여백·크기 {before} → {after}개 ({grid}px 격자로 {n}개 이동{mergedPart}){gapPart} | (그대로) | i18n 이동만 · 조각을 받는 자리는 `{…Part}`(호출부 ui.ts 723~726도 바꿈) |
| 6-15 | `ui.ts 738` | 새 `create.tidyUndone` | 격자 정리를 되돌렸습니다 — 「미리보기」를 다시 누르면 또 정리됩니다. | **격자 정리를 되돌렸어요 — ‘미리보기’를 다시 누르면 또 정리해요** | §9 해요체 통일 |
| 6-16 | `ui.ts 753` | 새 `create.onceOff` | 1× 토큰 {n}개 해제 | (그대로) | i18n 이동만 |
| 6-17 | `ui.ts 753` | 새 `create.onceNone` | 1× 토큰이 없습니다 | **1× 토큰이 없어요** | §9 해요체 통일 |
| 6-18 | `ui.ts 2002` | 새 `color.selInfo` | 선택 {n}개 · 색 {c} · 그 외 {o} | (그대로) | i18n 이동만 |
| 6-19 | `lib/palette.ts 148` | 새 `palette.lowChroma` | 브랜드색의 채도가 매우 낮아 hue가 불안정합니다 — 중립(neutral) 스케일로 다루는 것을 권장합니다. | **브랜드색의 채도가 너무 낮아 hue가 흔들려요 — 중립(neutral) 스케일을 권해요** | §9 해요체 통일 |
| 6-20 | `ui.ts 1635` | 새 `semantic.needGlobal` | 먼저 토큰을 생성해 Global 변수를 만드세요. | **먼저 토큰 만들기에서 Global 변수를 만드세요.** | 버튼·단계 이름(“토큰 만들기”)과 맞춤 |
| 6-21 | `ui.ts 1807` | 새 `dark.prereqLoading` | 변수 목록을 불러오는 중… | (그대로) | i18n 이동만 |
| 6-22 | `ui.ts 1810` | 새 `dark.prereqNoVars` | 먼저 토큰을 생성해 변수를 만드세요. | **먼저 토큰 만들기에서 변수를 만드세요.** | 버튼·단계 이름(“토큰 만들기”)과 맞춤 |
| 6-23 | `ui.ts 1813` | 새 `dark.prereqNoModes` | 모드가 있는 컬렉션(보통 Semantic)을 고르세요. | (그대로) | i18n 이동만 |
| 6-24 | `ui.ts 1816` | 새 `dark.prereqPick` | 컬렉션과 밝은 모드를 고르세요. | **컬렉션과 라이트 모드를 고르세요.** | 결정 (d) 라이트 · 다크 — 칸 이름(`dark.fromMode` “라이트”)과 맞춤 |
| 6-25 | `ui.ts 1854` | 기존 `dark.prereqPick`(1816과 같은 키) | 컬렉션과 라이트 모드를 고르세요. | (그대로) | i18n 이동만(1816과 같은 키 · 같은 문구 — 결정 (d)) |
| 6-26 | `ui.ts 1857` | 새 `dark.running` | Dark 모드를 만들고 값을 채우는 중… | **다크 모드를 만들고 값을 채우는 중…** | 결정 (d) 라이트 · 다크 |
| 6-27 | `ui.ts 2375` | 새 `dark.whyNoGlobal` | Global을 가리키는 색이 없어요(건너뜀 {n}개) | (그대로) | i18n 이동만 |
| 6-28 | `ui.ts 2375` | 새 `dark.whyNone` | 대상 색이 없어요 | (그대로) | i18n 이동만 |
| 6-29 | `ui.ts 2376` | 새 `dark.modeAdded` | Dark 모드는 추가됐어요.  | **다크 모드는 추가했어요. ** | 결정 (d) 라이트 · 다크 · 해요체 |
| 6-30 | `ui.ts 2377` | 새 `dark.fillFailed` | {modePart}다크 값을 채우지 못했어요 — {why} | (그대로) | i18n 이동만 · 조각을 받는 자리는 `{…Part}`(호출부 ui.ts 2376~2377도 바꿈) |
| 6-31 | `ui.ts 2380` | 새 `dark.modeAddedShort` | Dark 모드 추가 ·  | **다크 모드 추가 · ** | 결정 (d) 라이트 · 다크 |
| 6-32 | `ui.ts 2381` | 새 `dark.skippedDirect` |  · 건너뜀 {n}개(값을 직접 넣은 색) | (그대로) | i18n 이동만 |
| 6-33 | `ui.ts 2382` | 새 `dark.done` | {modePart}다크 {n}개 연결 · 새 dark/ 원시색 {c}개{skipPart} | (그대로) | i18n 이동만 · 조각을 받는 자리는 `{…Part}`(호출부 ui.ts 2380~2382도 바꿈) |
| 6-34 | `ui.ts 996` | 새 `textStyle.rowDelete` | 삭제 | (그대로) | i18n 이동만 |
| 6-35 | `ui.ts 1020` | 새 `textStyle.scanSummary` | 신규 {a} · 등록됨 {b} | (그대로) | i18n 이동만 |
| 6-36 | `ui.ts 1022` | 새 `textStyle.scanLhPct` |  · 행간% {n} | (그대로) | i18n 이동만 |
| 6-37 | `ui.ts 1023` | 새 `textStyle.scanLsPct` |  · 자간% {n} | (그대로) | i18n 이동만 |
| 6-38 | `ui.ts 1047` | 새 `textStyle.renaming` | 왼쪽 글자로 이름을 다시 매기는 중… | (그대로) | i18n 이동만 |
| 6-39 | `ui.ts 1061` | 새 `textStyle.needSpecs` | 먼저 ‘선택에서 스캔’ 하거나 ‘행 추가’로 스타일을 정의하세요. | **먼저 ‘스캔’하거나 ‘행 추가’로 스타일을 정의하세요.** | 버튼 이름(“스캔”, `textStyle.scanBtn`)과 맞춤 |
| 6-40 | `ui.ts 2201` | 새 `textStyle.nameSplit` |  · 왼쪽 글자 {a} · 크기 순 {b} | (그대로) | i18n 이동만 |
| 6-41 | `ui.ts 2210` | 새 `textStyle.fallbackRamp` | 선택에서 텍스트를 못 찾아 기본 램프로 채웠습니다. 폰트·값을 조정하세요. | **선택에서 텍스트를 못 찾아 기본 램프로 채웠어요. 폰트·값을 조정하세요** | §9 해요체 통일 |
| 6-42 | `ui.ts 2217` | 새 `textStyle.registered` | 텍스트 스타일 {n}개 (생성 {c} / 갱신 {u}) · 바인딩 {b} | **텍스트 스타일 {n}개 (생성 {c} / 갱신 {u}) · 연결 {b}** | 금지 용어(바인딩) |
| 6-43 | `ui.ts 2220` | 새 `textStyle.unlinked` |  · 미연결: {names} | (그대로) | i18n 이동만 |

## 7. 설정 · 라이선스

| # | 위치(file:line) | i18n 키(기존/새) | 지금 문구 | 바꿀 문구(확정) | 이유 |
|---|---|---|---|---|---|
| 7-1 | `i18n.ts 481` | 기존 `settings.hint` | 자주 안 바꾸는 값이에요. 만들기·적용 화면에는 안 보여요 | **만들기 · 연결 · 이름 정리에 쓰는 값이에요** | 본문 §4.8 문구(“적용 화면”은 v3에 없음) — 기본값은 이름 정리 깊이도 정함 |
| 7-2 | `i18n.ts 663` | 기존 `license.manage` | 결제 · 구독 관리 | **결제 · 구독 관리 ↗** | 본문 §4.8 · §2.9 외부 링크는 “↗” |
| 7-3 | `i18n.ts 664` | 기존 `license.manageTip` | Free면 결제 페이지로, 구독 중이면 결제수단·기기 활성화를 관리하는 페이지로 엽니다 | **무료면 결제 페이지로, 구독 중이면 결제수단·기기 활성화를 관리하는 페이지로 열어요** | 금지 용어(Free) |
| 7-4 | `ui.html 1154` | 새 `license.priceHint` | Free · Paid 연 $39 · 기기 1대 | **무료 · 유료 연 $39 · 기기 1대** | 금지 용어(Free·Paid) |
| 7-5 | `ui.html 1155` | 새 `license.setupHint` | 배포 전 — 키 검증·구독 링크는 아직 동작하지 않습니다. | **배포 전이라 키 검증·구독 링크는 아직 동작하지 않아요** | §9 해요체 통일 |
| 7-6 | `ui.ts 2280` | 새 `license.current` | 현재: {tier} ({source}){expPart} | (그대로) | i18n 이동만(FREE/PAID는 그대로 — §2.9 예외) · 조각을 받는 자리는 `{…Part}`(호출부 ui.ts 2279~2280도 바꿈) |
| 7-7 | `ui.ts 2275` | 새 `license.srcKey` | 라이선스 키 · {status}(상태가 있을 때만) | **라이선스 키{statusPart}** | ② 조건부 조각을 키로 나눔(`license.srcKeyStatus`, 조각을 받는 자리 `{statusPart}`) |
| 7-8 | `ui.ts 2275` | 새 `license.srcKeyStatus` |  · {status} | (그대로) | i18n 이동만(② 조건부 조각을 나눈 키) |
| 7-9 | `ui.ts 2275` (code.ts 93 `status`) | 새 `license.status.active` | active | **사용 중** | 결정 (b) — 상태값을 한국어로 |
| 7-10 | `ui.ts 2275` (code.ts 93 `status`) | 새 `license.status.grace` | grace | **유예 기간** | 결정 (b) — 상태값을 한국어로 |
| 7-11 | `ui.ts 2275` (code.ts 93 `status`) | 새 `license.status.expired` | expired | **만료** | 결정 (b) — 상태값을 한국어로 |
| 7-12 | `ui.ts 2277` | 새 `license.srcDev` | 개발용 강제 | (그대로) | i18n 이동만(개발 빌드에서만 보임) |
| 7-13 | `ui.ts 2278` | 새 `license.srcNone` | 없음 | (그대로) | i18n 이동만 |
| 7-14 | `ui.ts 2279` | 새 `license.expires` |  · 만료 {date} | (그대로) | i18n 이동만 |
| 7-15 | `ui.ts 1559` | (머리말 지움 — 사유만 넘김) | 검증 실패: {reason} — `extractSignedToken` 실패(license.ts 84 · 87 · 88)는 ui.ts 1552에서 던져 여기서 머리말이 붙고 code.ts 1218이 또 붙여 “검증 실패: 검증 실패: {reason}” | **{reason}(머리말 없이 넘김, 서버 사유면 `code`도 넘김)** | 버그 수정 — 머리말 두 번(license.ts 84 · 87 · 88 경로) |
| 7-16 | `lib/license.ts 84` | 새 `license.err.badBody`(툴팁) | 응답 본문을 해석할 수 없습니다 | **툴팁: 응답 본문을 해석할 수 없어요** | 결정 (b) — 플러그인 쪽 기술 사유: 화면 줄은 `license.verifyFailed`, 이 문구는 툴팁(`noteTip`) |
| 7-17 | `lib/license.ts 88` | 새 `license.err.noToken`(툴팁) | 서명 토큰이 없는 응답 | **툴팁: 서명 토큰이 없는 응답** | 결정 (b) — 플러그인 쪽 기술 사유: 화면 줄은 `license.verifyFailed`, 이 문구는 툴팁(`noteTip`) |
| 7-18 | `lib/licenseToken.ts 19` | 새 `license.err.b64Len`(툴팁) | 잘못된 base64url 길이 | **툴팁: 잘못된 base64url 길이** | 결정 (b) — 플러그인 쪽 기술 사유: 화면 줄은 `license.verifyFailed`, 이 문구는 툴팁(`noteTip`) |
| 7-19 | `lib/licenseToken.ts 31` | 새 `license.err.b64Char`(툴팁) | 잘못된 base64url 문자 | **툴팁: 잘못된 base64url 문자** | 결정 (b) — 플러그인 쪽 기술 사유: 화면 줄은 `license.verifyFailed`, 이 문구는 툴팁(`noteTip`) |
| 7-20 | `lib/licenseToken.ts 52` | 새 `license.err.notJwt`(툴팁) | JWT 형식 아님(점 3분할 필요) | **툴팁: JWT 형식 아님(점 3분할 필요)** | 결정 (b) — 플러그인 쪽 기술 사유: 화면 줄은 `license.verifyFailed`, 이 문구는 툴팁(`noteTip`) |
| 7-21 | `lib/licenseToken.ts 70` | 새 `license.err.noExp`(툴팁) | exp 클레임 없음 | **툴팁: exp 클레임 없음** | 결정 (b) — 플러그인 쪽 기술 사유: 화면 줄은 `license.verifyFailed`, 이 문구는 툴팁(`noteTip`) |
| 7-22 | `lib/licenseToken.ts 72` | 새 `license.err.expired`(툴팁) | 토큰 만료됨 | **툴팁: 토큰 만료됨** | 결정 (b) — 플러그인 쪽 기술 사유: 화면 줄은 `license.verifyFailed`, 이 문구는 툴팁(`noteTip`) |
| 7-23 | `lib/licenseToken.ts 74` | 새 `license.err.notYet`(툴팁) | 아직 유효하지 않은 토큰(nbf) | **툴팁: 아직 유효하지 않은 토큰(nbf)** | 결정 (b) — 플러그인 쪽 기술 사유: 화면 줄은 `license.verifyFailed`, 이 문구는 툴팁(`noteTip`) |
| 7-24 | `lib/licenseToken.ts 76` | 새 `license.err.iss`(툴팁) | 발급자(iss) 불일치 | **툴팁: 발급자(iss) 불일치** | 결정 (b) — 플러그인 쪽 기술 사유: 화면 줄은 `license.verifyFailed`, 이 문구는 툴팁(`noteTip`) |
| 7-25 | `lib/licenseToken.ts 77` | 새 `license.err.aud`(툴팁) | 대상(aud) 불일치 | **툴팁: 대상(aud) 불일치** | 결정 (b) — 플러그인 쪽 기술 사유: 화면 줄은 `license.verifyFailed`, 이 문구는 툴팁(`noteTip`) |
| 7-26 | `lib/licenseToken.ts 78` | 새 `license.err.tier`(툴팁) | 알 수 없는 티어 | **툴팁: 알 수 없는 티어** | 결정 (b) — 플러그인 쪽 기술 사유: 화면 줄은 `license.verifyFailed`, 이 문구는 툴팁(`noteTip`) |
| 7-27 | `lib/licenseToken.ts 99` | 새 `license.err.decode`(툴팁) | 토큰 디코드 실패 | **툴팁: 토큰 디코드 실패** | 결정 (b) — 플러그인 쪽 기술 사유: 화면 줄은 `license.verifyFailed`, 이 문구는 툴팁(`noteTip`) |
| 7-28 | `lib/licenseToken.ts 102` | 새 `license.err.alg`(툴팁) | 서명 알고리즘 없음(alg=none 거부) | **툴팁: 서명 알고리즘 없음(alg=none 거부)** | 결정 (b) — 플러그인 쪽 기술 사유: 화면 줄은 `license.verifyFailed`, 이 문구는 툴팁(`noteTip`) |
| 7-29 | `lib/licenseToken.ts 110` | 새 `license.err.sig`(툴팁) | 서명 검증 실패 | **툴팁: 서명 검증 실패** | 결정 (b) — 플러그인 쪽 기술 사유: 화면 줄은 `license.verifyFailed`, 이 문구는 툴팁(`noteTip`) |
| 7-30 | `workers/verify/src/index.js 138` (code: expired) | 새 `license.err.server.expired` | 구독이 만료되었습니다. | **구독이 끝났어요 — 결제 · 구독 관리에서 갱신하세요** | 결정 (b) — 서버가 `code`를 보내고 플러그인은 키로 화면 줄에 띄움(원문은 툴팁) |
| 7-31 | `workers/verify/src/index.js 138` (code: invalid) | 새 `license.err.server.invalid` | 유효하지 않은 라이선스 키이거나 기기 활성화 한도를 초과했습니다. (잘못된 키일 때) | **키가 맞지 않아요 — 키를 다시 확인하세요** | 결정 (b) — 서버가 `code`를 보내고 플러그인은 키로 화면 줄에 띄움(원문은 툴팁) |
| 7-32 | `workers/verify/src/index.js 138` (code: limit) | 새 `license.err.server.limit` | 유효하지 않은 라이선스 키이거나 기기 활성화 한도를 초과했습니다. (기기 한도일 때) | **기기 활성화 한도를 넘었어요 — 다른 기기에서 [해제]한 뒤 다시 검증하세요** | 결정 (b) — 서버가 `code`를 보내고 플러그인은 키로 화면 줄에 띄움(원문은 툴팁) |
| 7-33 | `workers/verify/src/index.js 148` (code: server) | 새 `license.err.server.server` | 검증 서버 오류: {e} | **검증 서버에 문제가 있어요 — 잠시 후 다시 시도하세요** | 결정 (b) — 서버가 `code`를 보내고 플러그인은 키로 화면 줄에 띄움(원문은 툴팁) |

## 8. 오류 · 상태 줄

| # | 위치(file:line) | i18n 키(기존/새) | 지금 문구 | 바꿀 문구(확정) | 이유 |
|---|---|---|---|---|---|
| 8-1 | `lib/errors.ts 19` | 새 `err.font` | 글꼴을 불러오지 못했습니다. | **글꼴을 불러오지 못했어요.** | §9 해요체 통일 |
| 8-2 | `lib/errors.ts 19` | 새 `err.fontAction` | 해당 폰트를 설치/활성화한 뒤 다시 시도하세요. | **그 폰트를 설치·활성화한 뒤 다시 시도하세요.** | §9 해요체 통일 |
| 8-3 | `lib/errors.ts 22` | 새 `err.scope` | 변수 스코프가 호환되지 않습니다. | **변수 스코프가 맞지 않아요.** | §9 해요체 통일 |
| 8-4 | `lib/errors.ts 22` | 새 `err.scopeAction` | ‘토큰 생성/갱신’을 다시 실행해 스코프를 갱신하세요. | **‘토큰 만들기’를 다시 실행해 스코프를 갱신하세요.** | 없는 버튼 이름(“토큰 생성/갱신”) → “토큰 만들기” |
| 8-5 | `lib/errors.ts 25` | 새 `err.prop` | 속성 값이 호환되지 않습니다(예: 미발행 컴포넌트). | **속성 값이 맞지 않아요(예: 발행 안 한 컴포넌트).** | §9 해요체 통일 |
| 8-6 | `lib/errors.ts 25` | 새 `err.propAction` | 컴포넌트를 발행하거나 대상 레이어를 확인하세요. | (그대로) | i18n 이동만 |
| 8-7 | `lib/errors.ts 28` | 새 `err.readonly` | 편집 권한이 없거나 읽기 전용 파일입니다. | **편집 권한이 없거나 읽기 전용 파일이에요.** | §9 해요체 통일 |
| 8-8 | `lib/errors.ts 28` | 새 `err.readonlyAction` | 편집 가능한 파일에서 다시 시도하세요. | (그대로) | i18n 이동만 |
| 8-9 | `lib/errors.ts 31` | 새 `err.network` | 네트워크 오류가 발생했습니다. | **네트워크 오류가 났어요.** | §9 해요체 통일 |
| 8-10 | `lib/errors.ts 31` | 새 `err.networkAction` | 연결을 확인하고 다시 시도하세요. | (그대로) | i18n 이동만 |
| 8-11 | `lib/errors.ts 34` | 새 `err.storage` | 로컬 저장소 접근에 실패했습니다. | **로컬 저장소에 접근하지 못했어요.** | §9 해요체 통일 |
| 8-12 | `lib/errors.ts 34` | 새 `err.storageAction` | 잠시 후 다시 시도하세요. | (그대로) | i18n 이동만 |
| 8-13 | `lib/errors.ts 37` | 새 `err.unknown` | 알 수 없는 오류 | (그대로) | i18n 이동만 |
| 8-14 | `lib/errors.ts 37` | 새 `err.unknownAction` | 선택을 확인하고 다시 시도하세요. | (그대로) | i18n 이동만 |
| 8-15 | `ui.ts 2490` | 새 `common.retry` | 다시 시도 | (그대로) | i18n 이동만 |

## 9. 플러그인 쪽(code.ts · lib) 메시지

| # | 위치(file:line) | i18n 키(기존/새) | 지금 문구 | 바꿀 문구(확정) | 이유 |
|---|---|---|---|---|---|
| 9-1 | `code.ts 232` (변수 탭 별칭 칸) | 기존 `edit.deletedTarget` | (삭제된 변수) | (그대로) | i18n 이동만(같은 글자의 키가 이미 있음) |
| 9-2 | `code.ts 434` (PREMIUM_REQUIRED) | (키 없음 — 지움) | 컴포넌트 등록·베리언트 분류는 Paid 기능입니다. | **(삭제 — 화면 밖)** | 결정 (c) — 화면에 안 나옴. `requirePaid`는 `feature`만 보내고 UI는 `status.paid` |
| 9-3 | `code.ts 439` (PREMIUM_REQUIRED) | (키 없음 — 지움) | 텍스트 스타일 등록은 Paid 기능입니다. | **(삭제 — 화면 밖)** | 결정 (c) — 화면에 안 나옴. `requirePaid`는 `feature`만 보내고 UI는 `status.paid` |
| 9-4 | `code.ts 918` (PREMIUM_REQUIRED) | (키 없음 — 지움) | 토큰(변수) 생성은 Paid 기능입니다. 미리보기는 무료로 제공됩니다. | **(삭제 — 화면 밖)** | 결정 (c) — 화면에 안 나옴. `requirePaid`는 `feature`만 보내고 UI는 `status.paid` |
| 9-5 | `code.ts 1090` (PREMIUM_REQUIRED) | (키 없음 — 지움) | 시맨틱 매핑은 Paid 기능입니다. | **(삭제 — 화면 밖)** | 결정 (c) — 화면에 안 나옴. `requirePaid`는 `feature`만 보내고 UI는 `status.paid` |
| 9-6 | `code.ts 1100 · 1110` (PREMIUM_REQUIRED) | (키 없음 — 지움) | 텍스트 스타일은 Paid 기능입니다. | **(삭제 — 화면 밖)** | 결정 (c) — 화면에 안 나옴. `requirePaid`는 `feature`만 보내고 UI는 `status.paid` |
| 9-7 | `code.ts 1838` (PREMIUM_REQUIRED) | (키 없음 — 지움) | 다크 테마 생성은 Paid 기능입니다. | **(삭제 — 화면 밖)** | 결정 (c) — 화면에 안 나옴. `requirePaid`는 `feature`만 보내고 UI는 `status.paid` |
| 9-8 | `code.ts 1864` (PREMIUM_REQUIRED) | (키 없음 — 지움) | 닮은 프레임 컴포넌트화는 Paid 기능입니다. 스캔·미리보기는 무료입니다. | **(삭제 — 화면 밖)** | 결정 (c) — 화면에 안 나옴. `requirePaid`는 `feature`만 보내고 UI는 `status.paid` |
| 9-9 | `code.ts 923` (만들기 › 토큰 결과) | 새 `create.sumGlobals` | Global {n}개 (생성 {c} / 갱신 {u}) | (그대로) | i18n 이동만 |
| 9-10 | `code.ts 924` | 새 `create.sumPruned` |  · 이전 색 {n}개 정리 | (그대로) | i18n 이동만 |
| 9-11 | `code.ts 929` | 새 `create.sumBase` |  · base {base}px 환산 {n}개({examples}{morePart}) | (그대로) | i18n 이동만 · ② 조건부 조각은 `create.sumBaseMore` |
| 9-12 | `code.ts 929` | 새 `create.sumBaseMore` |  외 | (그대로) | i18n 이동만(② 조건부 조각을 나눈 키) |
| 9-13 | `code.ts 1115` (만들기 › 타이포) | 새 `textStyle.needScan` | 먼저 스캔하세요 — 이름을 다시 매길 표본이 없습니다. | **먼저 스캔하세요 — 이름을 다시 매길 표본이 없어요.** | §9 해요체 통일 |
| 9-14 | `code.ts 1209` (설정 › 라이선스) | 새 `license.noteApplied` | 라이선스 적용됨 | **라이선스를 적용했어요** | §9 해요체 통일 |
| 9-15 | `code.ts 1214` | 새 `license.noteGrace` | 오프라인 — 캐시된 라이선스로 동작(grace). | **오프라인이에요 — 이 기기에 저장된 라이선스로 계속 써요** | §9 짧게 · 영어 내부 용어(grace) — 결정 ⑦ |
| 9-16 | `code.ts 1215` | 새 `license.noteOffline` | 오프라인 — 키를 확인할 수 없습니다. | **오프라인이에요 — 키를 확인할 수 없어요** | §9 해요체 통일 |
| 9-17 | `code.ts 1218` | 새 `license.verifyFailed`(사유는 툴팁 `license.err.*`) | 검증 실패: {reason} | **키를 확인하지 못했어요 — 키를 다시 확인해 주세요** | 결정 (b) — 알려진 서버 사유(`license.err.server.*`)가 아니면 이 줄 + 원문은 툴팁(`noteTip`) · 머리말 중복 버그 수정 |
| 9-18 | `code.ts 1233` | 새 `license.noteCleared` | 라이선스 키 제거됨 | **라이선스 키를 지웠어요** | §9 해요체 통일 |
| 9-19 | `code.ts 1462` (컴포넌트 “처리 중 문제”) | 새 `component.fail.placeInstance` | 인스턴스 배치 실패: {error} | (그대로) | i18n 이동만 — 결정 ⑨(내부 말 그대로) |
| 9-20 | `code.ts 1471 · 1649 · 1701` (컴포넌트 “처리 중 문제”) | 새 `component.fail.instance` | 인스턴스 실패({name}): {error} | (그대로) | i18n 이동만 — 결정 ⑨(내부 말 그대로) |
| 9-21 | `code.ts 1521` (컴포넌트 “처리 중 문제”) | 새 `component.fail.single` | 단독 등록 실패({name}): {error} | (그대로) | i18n 이동만 — 결정 ⑨(내부 말 그대로) |
| 9-22 | `code.ts 1543` (컴포넌트 “처리 중 문제”) | 새 `component.fail.propsRegister` | 속성접힘 등록 실패({set}): {error} | (그대로) | i18n 이동만 — 결정 ⑨(내부 말 그대로) |
| 9-23 | `code.ts 1578` (컴포넌트 “처리 중 문제”) | 새 `component.fail.iconFallback` | 아이콘을 만들지 못해 세트로 등록합니다({set}) | **아이콘을 만들지 못해 세트로 등록해요({set})** | §9 해요체 통일 |
| 9-24 | `code.ts 1593` (컴포넌트 “처리 중 문제”) | 새 `component.fail.propsComponentize` | 속성접힘 컴포넌트화 실패({name}): {error} | (그대로) | i18n 이동만 — 결정 ⑨(내부 말 그대로) |
| 9-25 | `code.ts 1629` (컴포넌트 “처리 중 문제”) | 새 `component.fail.expose` | 속성 노출 실패({name}): {error} | (그대로) | i18n 이동만 — 결정 ⑨(내부 말 그대로) |
| 9-26 | `code.ts 1709` (컴포넌트 “처리 중 문제”) | 새 `component.fail.exposeAll` | 속성 노출 실패: {error} | (그대로) | i18n 이동만 — 결정 ⑨(내부 말 그대로) |
| 9-27 | `code.ts 1670` (컴포넌트 “처리 중 문제”) | 새 `component.fail.componentize` | 컴포넌트화 실패({name}): {error} | (그대로) | i18n 이동만 — 결정 ⑨(내부 말 그대로) |
| 9-28 | `code.ts 1685 · 1757` (컴포넌트 “처리 중 문제”) | 새 `component.fail.combine` | 결합 실패({set}): {error} | (그대로) | i18n 이동만 — 결정 ⑨(내부 말 그대로) |
| 9-29 | `code.ts 1693 · 1751` (컴포넌트 “처리 중 문제”) | 새 `component.fail.arrange` | 정렬 실패({set}): {error} | (그대로) | i18n 이동만 — 결정 ⑨(내부 말 그대로) |
| 9-30 | `code.ts 1867` (컴포넌트 › 묶기) | 새 `similar.noMaster` | 마스터 프레임을 찾을 수 없습니다. | **마스터 프레임을 찾을 수 없어요.** | §9 해요체 통일 |
| 9-31 | `code.ts 1877` | 새 `similar.tooFew` | 대상 프레임이 2개 미만입니다. 다시 스캔하세요. | **대상 프레임이 2개보다 적어요. 다시 스캔하세요.** | §9 해요체 통일 |
| 9-32 | `lib/artwork.ts 66` (컴포넌트 “처리 중 문제”) | 새 `component.fail.iconComponent` | 아이콘 컴포넌트 실패({name}): {error} | (그대로) | i18n 이동만 |
| 9-33 | `lib/artwork.ts 92` (컴포넌트 “처리 중 문제”) | 새 `component.fail.iconSwap` | 아이콘 자리 교체 실패({layer}) | (그대로) | i18n 이동만 |
| 9-34 | `lib/artwork.ts 108` (컴포넌트 “처리 중 문제”) | 새 `component.fail.iconSwapErr` | 아이콘 자리 교체 실패({layer}): {error} | (그대로) | i18n 이동만 |
| 9-35 | `lib/artwork.ts 128` (컴포넌트 “처리 중 문제”) | 새 `component.fail.photoNoSlot` | 사진 이식 실패({path}) — 자리를 찾지 못했습니다 | **사진 이식 실패({path}) — 자리를 찾지 못했어요** | §9 해요체 통일 |
| 9-36 | `lib/artwork.ts 135` (컴포넌트 “처리 중 문제”) | 새 `component.fail.photo` | 사진 이식 실패({path}): {error} | (그대로) | i18n 이동만 |
| 9-37 | `lib/similarApply.ts 184` (묶기 결과) | 새 `similar.overrideFail` | {name}: 속성 오버라이드 실패 — 원본을 그대로 두었습니다. | **{name}: 속성 오버라이드 실패 — 원본을 그대로 뒀어요** | §9 해요체 통일 |
| 9-38 | `lib/similar.ts 133` (닮은 스캔 제외 사유) | 새 `similar.why.needTwo` | 프레임이 2개 이상 필요 | (그대로) | i18n 이동만 |
| 9-39 | `lib/similar.ts 147` | 새 `similar.why.mismatch` | 구조 불일치 | (그대로) | i18n 이동만 |
| 9-40 | `lib/similar.ts 150` | 새 `similar.why.fewSame` | 동일 구조 프레임 2개 미만 | (그대로) | i18n 이동만 |
| 9-41 | `lib/extract.ts 31` (만들기 › 색 추출 경고) | 새 `extract.skipHidden` | 숨긴 레이어는 화면에 없는 값이라 건너뛰었습니다 — 보이게 한 뒤 다시 추출하세요. | **숨긴 레이어는 화면에 없는 값이라 건너뛰었어요 — 보이게 한 뒤 다시 추출하세요.** | §9 해요체 통일 |
| 9-42 | `lib/extract.ts 33` | 새 `extract.skipInstance` | 인스턴스 내부는 마스터 복사본이라 건너뛰었습니다 — 값이 필요하면 컴포넌트를 선택해 추출하세요. | **인스턴스 안쪽은 마스터 복사본이라 건너뛰었어요 — 값이 필요하면 컴포넌트를 선택해 추출하세요.** | §9 해요체 통일 |
| 9-43 | `lib/extract.ts 34` | 새 `extract.skipGradient` | 그라디언트·이미지 채움은 변수로 묶을 수 없어 건너뛰었습니다. | **그라디언트·이미지 채움은 변수로 묶을 수 없어 건너뛰었어요.** | §9 해요체 통일 |
| 9-44 | `lib/extract.ts 38` | 새 `extract.skipFraction` | 소수 값(26.67px 등)은 척도가 아니라 스케일 잔값이라 토큰에서 제외했습니다. | **소수 값(26.67px 등)은 척도가 아니라 스케일 잔값이라 토큰에서 뺐어요.** | §9 해요체 통일 |
| 9-45 | `lib/themeApply.ts 68` (만들기 › 테마) | 새 `dark.errNoCol` | 컬렉션을 찾을 수 없어요. | (그대로) | i18n 이동만 |
| 9-46 | `lib/themeApply.ts 83` | 새 `dark.errAddMode` | Dark 모드를 추가하지 못했어요 — {why} | **다크 모드를 추가하지 못했어요 — {why}** | 결정 (d) 라이트 · 다크 |
| 9-47 | `lib/themeApply.ts 83` | 새 `dark.errAddModePlan` | 플랜에서 모드를 더 만들 수 없을 수 있어요. | (그대로) | i18n 이동만 |
| 9-48 | `lib/themeApply.ts 102` | 새 `dark.errSameMode` | 라이트와 다크가 같은 모드예요. 다른 라이트 모드를 고르세요. | **라이트와 다크가 같은 모드예요 — 라이트에 다른 모드를 고르세요.** | 결정 (d) 라이트 · 다크 |
| 9-49 | `lib/tokens.ts 101` | 새 `err.badHex` | 잘못된 hex: {value} | (그대로) | i18n 이동만(던지는 오류 — 오류 줄에 그대로 보일 수 있음) |
| 9-50 | `lib/variables.ts 388` (만들기 › 타이포 스캔 경고) | 새 `textStyle.warnMixed` | 부분 서식(혼합) 텍스트는 스킵했습니다. | **부분 서식(혼합) 텍스트는 건너뛰었어요.** | 금지 용어(스킵) |
| 9-51 | `lib/variables.ts 542` (타이포 등록 “미연결”) | 새 `textStyle.missRename` | 이름 충돌 '{from}'→'{to}' — 이미 같은 이름 스타일이 있어 rename 보류 | **이름 충돌 '{from}'→'{to}' — 같은 이름 스타일이 있어 이름을 바꾸지 않았어요** | 영어 섞임(rename) · 해요체 |
| 9-52 | `lib/variables.ts 598` (타이포 등록 알림) | 새 `textStyle.noteLhPx` | {name}: 역할마다 행간 원본이 달라 px로 기록(원본 표기 생략) | (그대로) | i18n 이동만 |
| 9-53 | `lib/variables.ts 618` | 새 `textStyle.noteLsPx` | {name}: 역할마다 자간 원본이 달라 px로 기록(원본 표기 생략) | (그대로) | i18n 이동만 |
| 9-54 | `lib/variables.ts 708` | 새 `textStyle.missStyle` | {name}: 폰트 {style}→Regular | (그대로) | i18n 이동만 |
| 9-55 | `lib/variables.ts 710` | 새 `textStyle.missFamily` | {name}: 폰트 '{family}' 없음 | (그대로) | i18n 이동만 |
| 9-56 | `lib/variables.ts 736` | 새 `textStyle.noteKeepLh` | {name}: 행간 변수 연결을 지켰습니다 — {n}% 교정 보류 | **{name}: 행간 변수 연결을 지켰어요 — {n}% 교정 보류** | §9 해요체 통일 |
| 9-57 | `lib/variables.ts 740` | 새 `textStyle.noteKeepLs` | {name}: 자간 변수 연결을 지켰습니다 — {n}% 교정 보류 | **{name}: 자간 변수 연결을 지켰어요 — {n}% 교정 보류** | §9 해요체 통일 |
| 9-58 | `lib/variables.ts 759` | 새 `textStyle.noteLhPct` | {role}: 행간 {n}% 유지 — 변수 바인딩 생략 | **{role}: 행간 {n}% 유지 — 변수 연결 안 함** | 금지 용어(바인딩) |
| 9-59 | `lib/variables.ts 775` | 새 `textStyle.noteLsPct` | {role}: 자간 {n}% 유지 — 변수 바인딩 생략 | **{role}: 자간 {n}% 유지 — 변수 연결 안 함** | 금지 용어(바인딩) |

## 10. 기존 STRINGS (해요체 · 토큰 만들기 · 라이트/다크)

| # | 위치(file:line) | i18n 키(기존/새) | 지금 문구 | 바꿀 문구(확정) | 이유 |
|---|---|---|---|---|---|
| 10-1 | `i18n.ts 31` | 기존 `color.fileVars` | 파일에 색 변수 {n}개 · 역할 {roles}개 — ‘선택에서 추출’을 누르면 현재 화면의 색을 읽습니다 | **파일에 색 변수 {n}개 · 역할 {roles}개 — ‘선택에서 추출’을 누르면 현재 화면의 색을 읽어요** | §9 해요체 통일 |
| 10-2 | `i18n.ts 32` | 기존 `create.fileVars` | 파일에 간격·크기·폰트 변수 {n}개 — ‘미리보기’를 누르면 현재 화면의 값을 읽습니다 | **파일에 간격·크기·폰트 변수 {n}개 — ‘미리보기’를 누르면 현재 화면의 값을 읽어요** | §9 해요체 통일 |
| 10-3 | `i18n.ts 34` | 기존 `color.extractEmpty` | 고를 값을 찾지 못했습니다 — 색·여백·크기가 있는 프레임이나 레이어를 선택하세요. | **고를 값을 찾지 못했어요 — 색·여백·크기가 있는 프레임이나 레이어를 선택하세요.** | §9 해요체 통일 |
| 10-4 | `i18n.ts 40` | 기존 `semantic.noGlobals` | 기존 Global 색 변수가 없습니다 — 먼저 토큰을 생성하세요. | **기존 Global 색 변수가 없어요 — 먼저 토큰을 만드세요.** | “토큰을 생성” → 만들기 |
| 10-5 | `i18n.ts 85` | 기존 `bind.layerSelectTip` | 누르면 캔버스에서 이 레이어를 선택합니다 | **누르면 캔버스에서 이 레이어를 선택해요** | §9 해요체 통일 |
| 10-6 | `i18n.ts 89` | 기존 `rename.none` | 변경할 이름이 없습니다. | **바꿀 이름이 없어요.** | §9 해요체 통일 |
| 10-7 | `i18n.ts 97` | 기존 `component.noEligible` | 선택 하위에 등록 가능한 프레임이 없습니다. | **선택 아래에 등록할 수 있는 프레임이 없어요.** | §9 해요체 통일 |
| 10-8 | `i18n.ts 98` | 기존 `component.noEligibleShort` | 등록 가능한 프레임이 없습니다. | **등록할 수 있는 프레임이 없어요.** | §9 해요체 통일 |
| 10-9 | `i18n.ts 113` | 기존 `dark.hint` | 밝은 모드 색을 뒤집어 다크 모드에 채웁니다. 목록 이름은 Figma 변수 컬렉션·모드예요 | **라이트 색을 뒤집어 다크에 채워요. 목록 이름은 Figma 변수 컬렉션·모드예요** | §9 해요체 통일 · 결정 (d) 라이트 · 다크 |
| 10-10 | `i18n.ts 114` | 기존 `dark.hintTip` | 색상·채도는 그대로 두고 명도만 뒤집습니다. Semantic이 Global을 가리키는 것만 대상이고 값을 직접 넣은 건 건너뜁니다. 다크용 원시색은 dark/…로 따로 만들어집니다. | **색상·채도는 그대로 두고 명도만 뒤집어요. Semantic이 Global을 가리키는 것만 대상이고 값을 직접 넣은 건 건너뛰어요. 다크용 원시색은 dark/…로 따로 만들어요.** | §9 해요체 통일 |
| 10-11 | `i18n.ts 116` | 기존 `dark.fromMode` | 밝은 모드 | **라이트** | 결정 (d) 라이트 · 다크 |
| 10-12 | `i18n.ts 117` | 기존 `dark.toMode` | 어두운 모드 | **다크** | 결정 (d) 라이트 · 다크 |
| 10-13 | `i18n.ts 120` | 기존 `dark.toPlaceholder` | Dark (없으면 생성) | **Dark (없으면 만들어요)** | 결정 (d) 라이트 · 다크 · “Dark”는 만들 모드의 실제 이름이라 둠 |
| 10-14 | `i18n.ts 181` | 기존 `wizard.seq.darkModeCreated` |  · Dark 모드 추가 | ** · 다크 모드 추가** | 결정 (d) 라이트 · 다크 |
| 10-15 | `i18n.ts 125` | 기존 `export.saved` | {format} — {file}로 저장했습니다. | **{format} — {file}로 저장했어요.** | §9 해요체 통일 |
| 10-16 | `i18n.ts 126` | 기존 `export.empty` | 내보낼 변수가 없습니다. 먼저 토큰을 생성하세요. | **내보낼 변수가 없어요. 먼저 토큰을 만드세요.** | “토큰을 생성” → 만들기 |
| 10-17 | `i18n.ts 142` | 기존 `wizard.rerunHint` | 이미 정리한 선택입니다 — 다시 실행하면 변수는 갱신되고 이름은 그대로예요. | **이미 정리한 선택이에요 — 다시 실행하면 변수는 갱신되고 이름은 그대로예요.** | §9 해요체 통일 |
| 10-18 | `i18n.ts 183` | 기존 `wizard.seq.darkNoTarget` | 모드가 있는 컬렉션이 없어 건너뜀 — 먼저 토큰을 생성하세요 | **모드가 있는 컬렉션이 없어 건너뜀 — 먼저 토큰을 만드세요** | “토큰을 생성” → 만들기 |
| 10-19 | `i18n.ts 184` | 기존 `wizard.seq.darkNothing` | 채울 색이 없음 — Global을 가리키는 시맨틱 색이 필요합니다 | **채울 색이 없음 — Global을 가리키는 시맨틱 색이 필요해요** | §9 해요체 통일 |
| 10-20 | `i18n.ts 196` | 기존 `wizard.sum.empty` | 완료된 작업이 없습니다 | **끝낸 작업이 없어요** | §9 해요체 통일 |
| 10-21 | `i18n.ts 206` | 기존 `pipeline.hint.needTokens` | 토큰을 먼저 생성하세요 | **토큰을 먼저 만드세요** | “토큰을 생성” → 만들기 |
| 10-22 | `i18n.ts 207` | 기존 `pipeline.hint.needBindable` | 연결할 변수를 먼저 생성하세요 | **연결할 변수를 먼저 만드세요** | “토큰을 생성” → 만들기 |
| 10-23 | `i18n.ts 217` | 기존 `vm.noVars` | 이 파일에는 변수가 없습니다. | **이 파일에는 변수가 없어요.** | §9 해요체 통일 |
| 10-24 | `i18n.ts 226` | 기존 `vm.copyEmpty` | 복사할 값이 없습니다. | **복사할 값이 없어요.** | §9 해요체 통일 |
| 10-25 | `i18n.ts 318` | 기존 `bind.noVarsPaid` | 먼저 토큰을 생성해 연결할 변수를 만드세요. | **먼저 토큰 만들기에서 연결할 변수를 만드세요.** | “토큰을 생성” → 만들기 |
| 10-26 | `i18n.ts 471` | 기존 `colRoles.hint` | 이름이 Global·Semantic·Component가 아닌 컬렉션도 계층으로 쓰게 지정합니다. 파일에 저장돼 이 파일을 여는 모두에게 적용됩니다 | **이름이 Global·Semantic·Component가 아닌 컬렉션도 계층으로 쓰게 지정해요. 파일에 저장돼 이 파일을 여는 모두에게 적용돼요** | §9 해요체 통일 |
| 10-27 | `i18n.ts 472` | 기존 `colRoles.empty` | 이 파일에는 변수 컬렉션이 없습니다. | **이 파일에는 변수 컬렉션이 없어요.** | §9 해요체 통일 |
| 10-28 | `i18n.ts 480` | 기존 `colRoles.dup` | {role}은(는) 한 컬렉션만 맡습니다 — {prev}의 지정은 풀렸습니다. | **{role}은(는) 한 컬렉션만 맡아요 — {prev}의 지정은 풀었어요.** | §9 해요체 통일 |
| 10-29 | `i18n.ts 485` | 기존 `ts.family` | 폰트 이름 — 이 이름 그대로 스타일에 씁니다 | **폰트 이름 — 이 이름 그대로 스타일에 써요** | §9 해요체 통일 |
| 10-30 | `i18n.ts 488` | 기존 `ts.letterSpacing` | 자간(px) · 음수도 됩니다 | **자간(px) · 음수도 돼요** | §9 해요체 통일 |
| 10-31 | `i18n.ts 533` | 기존 `colorTidy.hint` | 뽑거나 팔레트를 만든 뒤, 목록에서 역할을 정하고 변수로 만듭니다. 보조색을 켠 뒤에만 하모니를 고를 수 있어요. 추출은 무료 · 팔레트·변수화는 유료 | **뽑거나 팔레트를 만든 뒤, 목록에서 역할을 정하고 변수로 만들어요. 보조색을 켠 뒤에만 하모니를 고를 수 있어요. 추출은 무료 · 팔레트·변수화는 유료** | §9 해요체 통일 |
| 10-32 | `i18n.ts 534` | 기존 `colorTidy.hintTip` | 추출한 색은 전부 변수가 됩니다. Global 이름은 hue 패밀리(color/blue/500 · 같은 단계면 -2, -3), 역할은 Semantic으로 붙습니다. | **추출한 색은 전부 변수가 돼요. Global 이름은 hue 패밀리(color/blue/500 · 같은 단계면 -2, -3), 역할은 Semantic으로 붙어요.** | §9 해요체 통일 |
| 10-33 | `i18n.ts 537` | 기존 `create.scopeHint` | 여백·크기·폰트·효과만 다룹니다. 색은 이전 단계에서 이미 만들었어요 | **여백·크기·폰트·효과만 다뤄요. 색은 이전 단계에서 이미 만들었어요** | §9 해요체 통일 |
| 10-34 | `i18n.ts 540` | 기존 `create.dropOnceTip` | 한 레이어에서만 쓰인 값(1×)의 체크를 해제합니다 — 대개 일회성이라 토큰으로 남길 필요가 적습니다 | **한 레이어에서만 쓰인 값(1×)의 체크를 풀어요 — 대개 일회성이라 토큰으로 남길 필요가 적어요** | §9 해요체 통일 |
| 10-35 | `i18n.ts 559` | 기존 `textStyle.rowLabelTip` | 같은 가로 줄의 왼쪽 텍스트를 라벨(이름)으로, 큰 텍스트를 표본으로 봅니다. 짝을 못 찾은 행은 크기 순 이름(display/h1…) 그대로 둡니다. | **같은 가로 줄의 왼쪽 텍스트를 라벨(이름)으로, 큰 텍스트를 표본으로 봐요. 짝을 못 찾은 행은 크기 순 이름(display/h1…) 그대로 둬요.** | §9 해요체 통일 |
| 10-36 | `i18n.ts 561` | 기존 `textStyle.applyExistingTip` | 선택한 글자를 이미 만든 같은 스타일에 연결합니다. 새로 만들지 않아요. | **선택한 글자를 이미 만든 같은 스타일에 연결해요. 새로 만들지 않아요.** | §9 해요체 통일 |
| 10-37 | `i18n.ts 565` | 기존 `textStyle.nameBoundTip` | 이미 등록된 스타일입니다. 이름을 바꾸면 이 스타일의 이름만 바뀝니다(새로 만들지 않음). | **이미 등록된 스타일이에요. 이름을 바꾸면 이 스타일의 이름만 바뀌어요(새로 만들지 않음).** | §9 해요체 통일 |
| 10-38 | `i18n.ts 566` | 기존 `textStyle.nameNewTip` | 새 스타일로 등록됩니다(아직 등록 안 된 글자). | **새 스타일로 등록돼요(아직 등록 안 된 글자).** | §9 해요체 통일 |
| 10-39 | `i18n.ts 615` | 기존 `rename.hint` | 역할에 맞는 레이어 이름으로 바꿉니다. 최상위·인스턴스 이름은 그대로 둡니다 | **역할에 맞는 레이어 이름으로 바꿔요. 최상위·인스턴스 이름은 그대로 둬요** | §9 해요체 통일 |
| 10-40 | `i18n.ts 638 · ui.html 1092` | 기존 `component.scanHelp` | 선택 아래에서 버튼·카드 같은 고신뢰 구조 후보를 찾습니다. 숨김·부모 컨테이너는 제외. | **선택 아래에서 버튼·카드 같은 고신뢰 구조 후보를 찾아요. 숨김·부모 컨테이너는 빼요.** | §9 해요체 통일 · ⑤ `data-tip` 폴백 → `data-i18n-tip` |
| 10-41 | `i18n.ts 639 · ui.html 1098` | 기존 `component.registerHelp` | 체크한 후보를 Components에 등록하고 자리엔 인스턴스를 남깁니다. 원본의 연결과 값은 마스터를 따라요. | **체크한 후보를 Components에 등록하고 자리엔 인스턴스를 남겨요. 원본의 연결과 값은 마스터를 따라요.** | §9 해요체 통일 · ⑤ `data-tip` 폴백 → `data-i18n-tip` |
| 10-42 | `i18n.ts 640 · ui.html 1113` | 기존 `component.classifyHelp` | 이미 만든 컴포넌트만 같은 이름끼리 세트로 다시 묶습니다. | **이미 만든 컴포넌트만 같은 이름끼리 세트로 다시 묶어요.** | §9 해요체 통일 · ⑤ `data-tip` 폴백 → `data-i18n-tip` |
| 10-43 | `i18n.ts 641 · ui.html 1114` | 기존 `component.genMissingHelp` | 선택한 세트의 빠진 속성 조합을 첫 베리언트 복제로 채웁니다. | **선택한 세트의 빠진 속성 조합을 첫 베리언트 복제로 채워요.** | §9 해요체 통일 · ⑤ `data-tip` 폴백 → `data-i18n-tip` |
| 10-44 | `i18n.ts 642 · ui.html 1093` | 기존 `similar.scanHelp` | 구조가 같고 내용만 다른 프레임을 미리 묶습니다. 파일은 안 바꿉니다. | **구조가 같고 내용만 다른 프레임을 미리 묶어요. 파일은 안 바꿔요.** | §9 해요체 통일 · ⑤ `data-tip` 폴백 → `data-i18n-tip` |
| 10-45 | `i18n.ts 643 · ui.html 1099` | 기존 `similar.componentizeHelp` | 마스터를 컴포넌트로, 나머지는 인스턴스로 바꿉니다. 원본의 연결과 값은 마스터를 따라요. | **마스터를 컴포넌트로, 나머지는 인스턴스로 바꿔요. 원본의 연결과 값은 마스터를 따라요.** | §9 해요체 통일 · ⑤ `data-tip` 폴백 → `data-i18n-tip` |
| 10-46 | `i18n.ts 645` | 기존 `similar.needScanAfterComp` | ‘후보 스캔’ 결과는 ‘등록’이 씁니다. 묶기는 ‘닮은 스캔’을 먼저 실행하세요. | **‘후보 스캔’ 결과는 ‘등록’이 써요. 묶기는 ‘닮은 스캔’을 먼저 실행하세요.** | §9 해요체 통일 |
| 10-47 | `i18n.ts 648` | 기존 `export.hint` | 누르면 바로 코드 파일로 저장됩니다 | **누르면 바로 코드 파일로 저장돼요** | §9 해요체 통일 |
| 10-48 | `i18n.ts 654` | 기존 `export.fontUnitTip` | 폰트 크기 단위 — rem은 기준 크기로 나눕니다 | **폰트 크기 단위 — rem은 기준 크기로 나눠요** | §9 해요체 통일 |
| 10-49 | `i18n.ts 660` | 기존 `license.clearTip` | 이 기기의 활성화를 반납합니다. 새 기기에서 같은 키를 다시 검증하면 됩니다. | **이 기기의 활성화를 반납해요. 새 기기에서 같은 키를 다시 검증하면 돼요.** | §9 해요체 통일 |
| 10-50 | `i18n.ts 661` | 기존 `license.hint` | 유료를 쓰면 🔒 잠긴 기능이 풀립니다 | **유료를 쓰면 🔒 잠긴 기능이 풀려요** | §9 해요체 통일 |

## 11. 추가 문구 (2026-11-05, QA #4 불합격 2 — 위 요약 개수 밖)

> 명세 `docs/ia-v3.md` §4.6 "찾기 · 연결의 수". PR 4 확정 표 뒤에 생긴 새 키라 위 요약(277행)에 넣지 않는다.

| # | 위치(file:line) | i18n 키(기존/새) | 지금 문구 | 바꿀 문구(확정) | 이유 |
|---|---|---|---|---|---|
| 11-1 | `ui.ts` 카드 자리 줄 끝 | 새 `bind.placesMore` | (없음 — 자리 줄을 전부 그림) | **외 {n}곳 · 레이어 선택으로 보기** | 자리 줄 200줄 상한. 누르면 그리지 않은 줄의 레이어 선택 |
| 11-2 | `ui.ts` `case 'PROGRESS'` | 새 `bind.linkingOf` | (없음 — 연결 중은 `bind.linking` "연결 중…"만) | **연결 중… {done} / {total}** | 연결을 300곳씩 나눠 진행률을 보임. 띄어쓰기는 `bind.progressOf`와 같음. 첫 진행 전은 `bind.linking` 그대로 |
| 11-3 | `ui.ts` 연결 중 잠금 | 새 `bind.waitLink` | (없음 — 잠금 없음) | **연결이 끝나면 다시 해 주세요** | 연결 중 다른 쓰기 작업 · 다시 찾기 · 연결을 막을 때 |
