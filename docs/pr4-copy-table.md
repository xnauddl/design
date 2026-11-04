# PR 4 문구 전후 표 (확정 2026-11-04)

> 코드 기준 `5c61c6f`(= 브랜치 `2714765`, 코드 변경 없음) · 명세 `docs/ia-v3.md` §2.9 · §9 · 부록 A.4
> 2026-11-04 사용자 결정으로 이 표의 “바꿀 문구”는 **확정**이다. PR 4는 이 표대로 i18n 키를 만들고 문구를 바꾼다.

## 요약

| | 개수 |
|---|---|
| 전체 행 | **210** |
| 문구를 바꾸는 행 | **89** (그중 §9 해요체 통일 31) |
| i18n으로 옮기기만(문구 그대로) | **121** |

묶음별: 공통 4(바꿈 1) · 변수 탭 11(바꿈 3) · 레이어 › 연결 10(바꿈 6) · 레이어 › 이름 2(바꿈 1) · 레이어 › 컴포넌트 42(바꿈 5) · 만들기 · 마법사 43(바꿈 17) · 설정 · 라이선스 25(바꿈 20) · 오류 · 상태 줄 15(바꿈 8) · 플러그인 쪽(code.ts · lib) 메시지 58(바꿈 28)

- 한 행 = i18n 키 하나. 같은 문구를 여러 줄이 쓰면 위치에 줄을 함께 적었다(예: `code.ts` 1471 · 1649 · 1701).
- 기존 키 17개(A.4 “i18n 변경” 표)도 문구가 바뀌므로 함께 넣었다.
- `ui.html`의 aria-label은 지금 i18n이 덮지 않는다(정적 i18n은 글자 · title · placeholder만). 새 속성 `data-i18n-aria-label`로 옮긴다. title과 글자가 같은 것은 같은 키를 쓴다.
- 말투(결정 ①): 모든 문장을 해요체로 쓴다. 합니다체(“…했습니다”, “…없습니다”)와 “…됨”으로 끝나는 알림 문장은 해요체로 바꿨다. 안내의 “…하세요”는 해요체이므로 그대로 둔다(§2.9 “레이어를 선택하세요”). 숫자 · 라벨 · 진단 조각(“구조 불일치”, “… 실패({이름}): {오류}”, “(원본 표기 생략)”)은 문장이 아니라서 “(그대로)”다.

## 사용자 결정 (2026-11-04, 확정)

1. **말투** — 이번 PR에서 해요체로 통일한다. “그대로”였던 행 중 31행을 해요체로 바꿨다(이유 “§9 해요체 통일”).
2. **유료 사유 문구 8곳**(9번 `paid.feature`) — 키 하나에 기능 이름을 넣는다: “{기능} — 유료 기능이에요”. 마법사 단계 실패 줄도 `PREMIUM_REQUIRED`면 `status.paid`를 쓴다. 918 · 1864의 “미리보기 · 스캔은 무료” 꼬리는 뺀다(잠금 툴팁이 말한다).
3. **찾기를 취소했을 때**(3번 `apply.cancelled`) — 상태 줄에 “찾기를 취소했어요”를 띄운다.
4. **레이어 선택 결과 문구 통일**(3번 2163~2167) — 변수 탭의 `list.select*` 3개와 합쳐 `select.*`로 쓴다. “미리보기를 다시 실행하세요” 꼬리는 버린다.
5. **라이선스 “현재” 줄**(7번 2280) — FREE / PAID를 **그대로** 둔다(무료/유료로 바꾸지 않음). i18n으로 옮기기만 한다.
6. **라이선스 검증 실패**(7번 `license.err.*` 14개, 9번 `license.verifyFailed`) — 화면 줄은 “키를 확인하지 못했어요 — 키를 다시 확인해 주세요” 한 문장. 기술 사유는 툴팁. “검증 실패:” 머리말이 두 번 붙는 버그도 고친다(ui.ts 1559는 사유만 넘김).
7. **오프라인 grace 문구**(9번 `license.noteGrace`) — “오프라인이에요 — 이 기기에 저장된 라이선스로 계속 써요”.
8. **“토큰 생성” → “토큰 만들기”**(1번 `prereq.gotoCreate`, 6번 1635 · 1810, 8번 `err.scopeAction`) — 바꾼다.
9. **컴포넌트 처리 중 문제(진단) 16개**(9번 `component.fail.*`) — 내부 말(“속성접힘”, “결합”, “정렬”)은 그대로 둔다. 문장으로 끝나는 2개(`iconFallback` · `photoNoSlot`)만 해요체로 바꿨다.
10. **만들기 › 다크 결과의 “연결”**(6번 `dark.done`) — 그대로 둔다.
11. **“밝은 모드”로 맞추기**(6번 1854) — 칸 이름(`dark.fromMode`)대로 “밝은 모드”로 맞춘다.

## 화면에 안 나오는 문구 (표에서 뺌)

i18n.ts 머리 주석(“화면에 보이는 한국어는 전부 여기에 있다”)을 지키는 데는 상관없지만, A.4의 새 검사(“i18n.ts 밖 문자열 리터럴에 한글 0”)를 통과하려면 함께 정리해야 한다.

| 위치 | 지금 | 처리 |
|---|---|---|
| `lib/bind.ts` 343 · 486 · 513 · 596 · 606 · 612 | `APPLY_RESULT.flags` 안내 6종(“…바인딩…”) | 지운다(A.4 “삭제”의 기존 항목) |
| `lib/bind.ts` 1033 | `scanBindings`의 “(삭제된 변수)” | `code.ts`가 `scanBindings`를 부르지 않는다 → 함수째 지울지 확인, 남기면 `edit.deletedTarget` |
| `ui.ts` 1544 | “검증 서버 연결 실패(오프라인)” | `offline: true`면 `code.ts`가 자기 문구(1214 · 1215)를 쓰므로 안 보인다 → 문구를 지운다(`offline: true`만 넘김) |
| `lib/variables.ts` 937 · 940 · 941 · 942 | `TEXT_STYLES_APPLIED.missing`(“적용 실패 …” · “적용 대상 없음 …” · “미등록 …” · “모호 …”) | UI가 `missing`을 읽지 않는다(결과 줄은 `bind.tsDone` + 사유 툴팁) → 필드와 문구를 지운다 |
| `ui.html` 1019 · 1046 · 1182의 aria-label, 1024 · 1025의 버튼 글자 | “연결 단계” · “변수 이름 필터” · “펼치기” · “찾기” · “연결” | `ui.ts`가 실행 때 `t()`로 덮는다(폴백일 뿐) → 그대로 둠 |

## 1. 공통

| # | 위치(file:line) | i18n 키(기존/새) | 지금 문구 | 바꿀 문구(확정) | 이유 |
|---|---|---|---|---|---|
| 1-1 | `i18n.ts 509` | 기존 `prereq.gotoCreate` | 토큰 생성으로 → | **토큰 만들기로 →** | 버튼·단계 이름과 맞춤(§3.1 · §4.5 · §4.6) |
| 1-2 | `ui.html 759` | 새 `tab.listAria` | 작업 탭 (aria-label) | (그대로) | i18n 이동만 |
| 1-3 | `ui.html 764` | 기존 `ui.minimize` | 최소화 (aria-label) | (그대로) | i18n 이동만(title은 이미 키 — aria-label도 같은 키) |
| 1-4 | `ui.html 1007` | 새 `rail.layerAria` | 레이어 작업 (aria-label) | (그대로) | i18n 이동만 |

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
| 2-9 | `ui.html 812` | 새 `list.searchClear` | 검색 지우기 (aria-label) | (그대로) | i18n 이동만 |
| 2-10 | `ui.html 814` | 새 `list.gridAria` | 변수 목록 (aria-label) | (그대로) | i18n 이동만 |
| 2-11 | `lib/varTable.ts 97` | 새 `list.noGroup` | (그룹 없음) | (그대로) | i18n 이동만 |

## 3. 레이어 › 연결

| # | 위치(file:line) | i18n 키(기존/새) | 지금 문구 | 바꿀 문구(확정) | 이유 |
|---|---|---|---|---|---|
| 3-1 | `i18n.ts 46` | 기존 `apply.cancelRequested` | 취소 요청됨 — 다음 지점에서 중단합니다. | **취소하는 중…** | §9 짧게 · 해요체 |
| 3-2 | `i18n.ts 47` | 기존 `apply.cancelled` | 취소됨 — {bound}곳만 연결{detail} | **찾기를 취소했어요** | 취소는 찾기에서만 일어남(§4.6 “찾기 취소됨 = 찾기 전”) — “0곳만 연결”이 틀림 |
| 3-3 | `ui.ts 2104` | (지움 — `apply.cancelled`의 {detail}) |  · 스킵 {n} — {사유} | **(지움)** | 금지 용어(스킵) · 찾기 취소에는 건너뜀 수가 없음 |
| 3-4 | `ui.ts 1124` | 새 `bind.linking` | 연결 중… | (그대로) | i18n 이동만 — 이때 [취소]는 숨김(2026-11-04 결정) |
| 3-5 | `ui.ts 3341` | 새 `bind.progressOf` | {done} / {total} 처리 중… ({pct}%) | (그대로) | i18n 이동만 |
| 3-6 | `ui.ts 3341` | 새 `bind.progressCount` | {done}개 처리 중… | (그대로) | i18n 이동만 |
| 3-7 | `ui.ts 3257` | 새 `bind.skipSelected` | {사유} 레이어 {n}개 선택 | (그대로) | i18n 이동만 |
| 3-8 | `ui.ts 2163` | 기존 `list.selectCapped` → `select.capped` | 레이어 {found}개만 선택 — 한 번에 보여줄 수 있는 상한({requested}개 중)입니다. | **레이어 {found}개만 선택했어요(전체 {requested}개)** | 같은 상황은 같은 문구(변수 탭과 통일) · 해요체 |
| 3-9 | `ui.ts 2166` | 기존 `list.selectPartial` → `select.partial` | 레이어 {found}개 선택 — {missing}개는 삭제됐거나 다른 페이지입니다. | **레이어 {found}개 선택 — {missing}개는 삭제됐거나 다른 페이지예요** | 같은 상황은 같은 문구(변수 탭과 통일) |
| 3-10 | `ui.ts 2167` | 기존 `list.selectNone` → `select.none` | 레이어를 찾지 못했습니다 — 삭제됐거나 다른 페이지입니다. 미리보기를 다시 실행하세요. | **선택할 레이어를 찾지 못했어요 — 삭제됐거나 다른 페이지예요** | §2.9 연결은 “찾기”(미리보기 없음) · 텍스트 스타일 배지에서도 뜨므로 꼬리 안내를 뺌 |

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
| 5-11 | `ui.ts 3105` | 새 `component.changeProps` | {이름} · 속성 | (그대로) | i18n 이동만 |
| 5-12 | `ui.ts 3105` | 새 `component.badgeProps` | 속성 | (그대로) | i18n 이동만 |
| 5-13 | `ui.ts 3105 · 3107` | 새 `component.nameFallback` | 컴포넌트 | (그대로) | i18n 이동만 |
| 5-14 | `ui.ts 3107` | 새 `component.badgeSingle` | 단독 | (그대로) | i18n 이동만 |
| 5-15 | `ui.ts 3126` | 새 `component.count` | 후보 {total} | (그대로) | i18n 이동만 |
| 5-16 | `ui.ts 3186` | 새 `component.tagMissing` | 빈 조합 | (그대로) | i18n 이동만 |
| 5-17 | `ui.ts 3186` | 새 `component.headMissing` | 빈 조합(미생성): | (그대로) | i18n 이동만 |
| 5-18 | `ui.ts 3187` | 새 `component.tagIssue` | 문제 | (그대로) | i18n 이동만 |
| 5-19 | `ui.ts 3187` | 새 `component.headIssue` | 처리 중 문제 {n}건: | (그대로) | i18n 이동만 |
| 5-20 | `ui.ts 3195` | 새 `component.tagCount` | {구획} {n}개 | (그대로) | i18n 이동만 |
| 5-21 | `ui.ts 1872` | 새 `similar.scanning` | 닮은 프레임을 찾는 중… | (그대로) | i18n 이동만 |
| 5-22 | `ui.ts 1882` | 새 `similar.componentizing` | 컴포넌트화하는 중… | (그대로) | i18n 이동만 |
| 5-23 | `ui.ts 2391` | 새 `similar.failed` | 컴포넌트화하지 못했습니다{ — 첫 경고} | **컴포넌트화하지 못했어요{ — 첫 경고}** | §9 해요체 통일 |
| 5-24 | `ui.ts 2394` | 새 `similar.resMaster` | 마스터 {name} | (그대로) | i18n 이동만 |
| 5-25 | `ui.ts 2394` | 새 `similar.resInstances` | 인스턴스 {n}개 | (그대로) | i18n 이동만 |
| 5-26 | `ui.ts 2395` | 새 `similar.resProps` | 속성 {n}개 | (그대로) | i18n 이동만 |
| 5-27 | `ui.ts 2396` | 새 `similar.resImages` | 이미지 {n}개 | (그대로) | i18n 이동만 |
| 5-28 | `ui.ts 2398` | 새 `similar.resKept` |  · 남겨둔 것 {n}건: {첫 경고} | (그대로) | i18n 이동만 |
| 5-29 | `ui.ts 3288` | 새 `similar.metaText` | 텍스트 {채움}/{전체} | (그대로) | i18n 이동만 |
| 5-30 | `ui.ts 3289` | 새 `similar.metaImages` | 이미지 {n} | (그대로) | i18n 이동만 |
| 5-31 | `ui.ts 3290` | 새 `similar.metaEmpty` | 빈 칸 {n} | (그대로) | i18n 이동만 |
| 5-32 | `ui.ts 3297` | 새 `similar.recommended` | 추천 | (그대로) | i18n 이동만 |
| 5-33 | `ui.ts 3313` | 새 `similar.count` | 닮은 {n}개 | (그대로) | i18n 이동만 |
| 5-34 | `ui.ts 3321` | 새 `similar.needTwo` | 구조가 같은 프레임을 2개 이상 선택하세요. | (그대로) | i18n 이동만 |
| 5-35 | `ui.ts 3322` | 새 `similar.none` | 컴포넌트화할 프레임이 없습니다 — {이유} | **컴포넌트화할 프레임이 없어요 — {이유}** | §9 해요체 통일 |
| 5-36 | `ui.ts 3329` | 새 `similar.openText` | 텍스트 {n} | (그대로) | i18n 이동만 |
| 5-37 | `ui.ts 3330` | 새 `similar.openSwap` | 아이콘 교체 {n} | (그대로) | i18n 이동만 |
| 5-38 | `ui.ts 3331` | 새 `similar.openImage` | 이미지 {n} | (그대로) | i18n 이동만 |
| 5-39 | `ui.ts 3332` | 새 `similar.opened` | 속성으로 열림: {목록} | (그대로) | i18n 이동만 |
| 5-40 | `ui.ts 3332` | 새 `similar.noVarying` | 가변 위치가 없어 속성은 만들지 않아요 | (그대로) | i18n 이동만 |
| 5-41 | `ui.ts 3333` | 새 `similar.excluded` |  · 제외 {n}개({이유}) | (그대로) | i18n 이동만 |
| 5-42 | `ui.ts 3334` | 새 `similar.scanned` | 대상 {n}개 · {열림}{제외} | (그대로) | i18n 이동만 |

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
| 6-14 | `ui.ts 726` | 새 `create.tidySummary` | 여백·크기 {before} → {after}개 ({grid}px 격자로 {n}개 이동{병합}){안내} | (그대로) | i18n 이동만 |
| 6-15 | `ui.ts 738` | 새 `create.tidyUndone` | 격자 정리를 되돌렸습니다 — 「미리보기」를 다시 누르면 또 정리됩니다. | **격자 정리를 되돌렸어요 — ‘미리보기’를 다시 누르면 또 정리해요** | §9 해요체 통일 |
| 6-16 | `ui.ts 753` | 새 `create.onceOff` | 1× 토큰 {n}개 해제 | (그대로) | i18n 이동만 |
| 6-17 | `ui.ts 753` | 새 `create.onceNone` | 1× 토큰이 없습니다 | **1× 토큰이 없어요** | §9 해요체 통일 |
| 6-18 | `ui.ts 2002` | 새 `color.selInfo` | 선택 {n}개 · 색 {c} · 그 외 {o} | (그대로) | i18n 이동만 |
| 6-19 | `lib/palette.ts 148` | 새 `palette.lowChroma` | 브랜드색의 채도가 매우 낮아 hue가 불안정합니다 — 중립(neutral) 스케일로 다루는 것을 권장합니다. | **브랜드색의 채도가 너무 낮아 hue가 흔들려요 — 중립(neutral) 스케일을 권해요** | §9 해요체 통일 |
| 6-20 | `ui.ts 1635` | 새 `semantic.needGlobal` | 먼저 토큰을 생성해 Global 변수를 만드세요. | **먼저 토큰 만들기에서 Global 변수를 만드세요.** | 버튼·단계 이름(“토큰 만들기”)과 맞춤 |
| 6-21 | `ui.ts 1807` | 새 `dark.prereqLoading` | 변수 목록을 불러오는 중… | (그대로) | i18n 이동만 |
| 6-22 | `ui.ts 1810` | 새 `dark.prereqNoVars` | 먼저 토큰을 생성해 변수를 만드세요. | **먼저 토큰 만들기에서 변수를 만드세요.** | 버튼·단계 이름(“토큰 만들기”)과 맞춤 |
| 6-23 | `ui.ts 1813` | 새 `dark.prereqNoModes` | 모드가 있는 컬렉션(보통 Semantic)을 고르세요. | (그대로) | i18n 이동만 |
| 6-24 | `ui.ts 1816` | 새 `dark.prereqPick` | 컬렉션과 밝은 모드를 고르세요. | (그대로) | i18n 이동만 |
| 6-25 | `ui.ts 1854` | `dark.prereqPick`(1816과 같은 키) | 컬렉션과 라이트 모드를 고르세요. | **컬렉션과 밝은 모드를 고르세요.** | 칸 이름(“밝은 모드”, `dark.fromMode`)과 맞춤 · 1816과 같은 문구 |
| 6-26 | `ui.ts 1857` | 새 `dark.running` | Dark 모드를 만들고 값을 채우는 중… | (그대로) | i18n 이동만 |
| 6-27 | `ui.ts 2375` | 새 `dark.whyNoGlobal` | Global을 가리키는 색이 없어요(건너뜀 {n}개) | (그대로) | i18n 이동만 |
| 6-28 | `ui.ts 2375` | 새 `dark.whyNone` | 대상 색이 없어요 | (그대로) | i18n 이동만 |
| 6-29 | `ui.ts 2376` | 새 `dark.modeAdded` | Dark 모드는 추가됐어요.  | (그대로) | i18n 이동만 |
| 6-30 | `ui.ts 2377` | 새 `dark.fillFailed` | {모드}다크 값을 채우지 못했어요 — {이유} | (그대로) | i18n 이동만 |
| 6-31 | `ui.ts 2380` | 새 `dark.modeAddedShort` | Dark 모드 추가 ·  | (그대로) | i18n 이동만 |
| 6-32 | `ui.ts 2381` | 새 `dark.skippedDirect` |  · 건너뜀 {n}개(값을 직접 넣은 색) | (그대로) | i18n 이동만 |
| 6-33 | `ui.ts 2382` | 새 `dark.done` | {모드}다크 {n}개 연결 · 새 dark/ 원시색 {c}개{건너뜀} | (그대로) | i18n 이동만 |
| 6-34 | `ui.ts 996` | 새 `textStyle.rowDelete` | 삭제 | (그대로) | i18n 이동만 |
| 6-35 | `ui.ts 1020` | 새 `textStyle.scanSummary` | 신규 {a} · 등록됨 {b} | (그대로) | i18n 이동만 |
| 6-36 | `ui.ts 1022` | 새 `textStyle.scanLhPct` |  · 행간% {n} | (그대로) | i18n 이동만 |
| 6-37 | `ui.ts 1023` | 새 `textStyle.scanLsPct` |  · 자간% {n} | (그대로) | i18n 이동만 |
| 6-38 | `ui.ts 1047` | 새 `textStyle.renaming` | 왼쪽 글자로 이름을 다시 매기는 중… | (그대로) | i18n 이동만 |
| 6-39 | `ui.ts 1061` | 새 `textStyle.needSpecs` | 먼저 ‘선택에서 스캔’ 하거나 ‘행 추가’로 스타일을 정의하세요. | **먼저 ‘스캔’하거나 ‘행 추가’로 스타일을 정의하세요.** | 버튼 이름(“스캔”, `textStyle.scanBtn`)과 맞춤 |
| 6-40 | `ui.ts 2201` | 새 `textStyle.nameSplit` |  · 왼쪽 글자 {a} · 크기 순 {b} | (그대로) | i18n 이동만 |
| 6-41 | `ui.ts 2210` | 새 `textStyle.fallbackRamp` | 선택에서 텍스트를 못 찾아 기본 램프로 채웠습니다. 폰트·값을 조정하세요. | **선택에서 텍스트를 못 찾아 기본 램프로 채웠어요. 폰트·값을 조정하세요** | §9 해요체 통일 |
| 6-42 | `ui.ts 2217` | 새 `textStyle.registered` | 텍스트 스타일 {n}개 (생성 {c} / 갱신 {u}) · 바인딩 {b} | **텍스트 스타일 {n}개 (생성 {c} / 갱신 {u}) · 연결 {b}** | 금지 용어(바인딩) |
| 6-43 | `ui.ts 2220` | 새 `textStyle.unlinked` |  · 미연결: {이름들} | (그대로) | i18n 이동만 |

## 7. 설정 · 라이선스

| # | 위치(file:line) | i18n 키(기존/새) | 지금 문구 | 바꿀 문구(확정) | 이유 |
|---|---|---|---|---|---|
| 7-1 | `i18n.ts 481` | 기존 `settings.hint` | 자주 안 바꾸는 값이에요. 만들기·적용 화면에는 안 보여요 | **변수 만들기와 연결에 쓰는 값이에요** | 본문 §4.8 문구(“적용 화면”은 v3에 없음) |
| 7-2 | `i18n.ts 663` | 기존 `license.manage` | 결제 · 구독 관리 | **결제 · 구독 관리 ↗** | 본문 §4.8 · §2.9 외부 링크는 “↗” |
| 7-3 | `i18n.ts 664` | 기존 `license.manageTip` | Free면 결제 페이지로, 구독 중이면 결제수단·기기 활성화를 관리하는 페이지로 엽니다 | **무료면 결제 페이지로, 구독 중이면 결제수단·기기 활성화를 관리하는 페이지로 열어요** | 금지 용어(Free) |
| 7-4 | `ui.html 1154` | 새 `license.priceHint` | Free · Paid 연 $39 · 기기 1대 | **무료 · 유료 연 $39 · 기기 1대** | 금지 용어(Free·Paid) |
| 7-5 | `ui.html 1155` | 새 `license.setupHint` | 배포 전 — 키 검증·구독 링크는 아직 동작하지 않습니다. | **배포 전이라 키 검증·구독 링크는 아직 동작하지 않아요** | §9 해요체 통일 |
| 7-6 | `ui.ts 2280` | 새 `license.current` | 현재: {FREE\|PAID} ({출처}){만료} | (그대로) | i18n 이동만(티어 이름 FREE/PAID는 그대로 — 2026-11-04 결정 ⑤) |
| 7-7 | `ui.ts 2275` | 새 `license.srcKey` | 라이선스 키{ · 상태} | (그대로) | i18n 이동만 |
| 7-8 | `ui.ts 2277` | 새 `license.srcDev` | 개발용 강제 | (그대로) | i18n 이동만(개발 빌드에서만 보임) |
| 7-9 | `ui.ts 2278` | 새 `license.srcNone` | 없음 | (그대로) | i18n 이동만 |
| 7-10 | `ui.ts 2279` | 새 `license.expires` |  · 만료 {날짜} | (그대로) | i18n 이동만 |
| 7-11 | `ui.ts 1559` | (머리말 지움 — 사유만 넘김) | 검증 실패: {사유} — 응답 형식·디코드 오류(license.ts 84·88, licenseToken.ts 19·31·52·99)면 화면에는 “검증 실패: 검증 실패: {사유}” | **{사유}(머리말 없이 code.ts로 넘김)** | 버그 수정 — 머리말이 두 번 붙음(ui.ts 1559 + code.ts 1218) |
| 7-12 | `lib/license.ts 84` | 새 `license.err.badBody`(툴팁) | 응답 본문을 해석할 수 없습니다 | **툴팁: 응답 본문을 해석할 수 없어요** | 결정 ⑥ — 화면 줄은 `license.verifyFailed` 한 문장, 기술 사유는 툴팁 |
| 7-13 | `lib/license.ts 88` | 새 `license.err.noToken`(툴팁) | 서명 토큰이 없는 응답 | **툴팁: 서명 토큰이 없는 응답** | 결정 ⑥ — 화면 줄은 `license.verifyFailed` 한 문장, 기술 사유는 툴팁 |
| 7-14 | `lib/licenseToken.ts 19` | 새 `license.err.b64Len`(툴팁) | 잘못된 base64url 길이 | **툴팁: 잘못된 base64url 길이** | 결정 ⑥ — 화면 줄은 `license.verifyFailed` 한 문장, 기술 사유는 툴팁 |
| 7-15 | `lib/licenseToken.ts 31` | 새 `license.err.b64Char`(툴팁) | 잘못된 base64url 문자 | **툴팁: 잘못된 base64url 문자** | 결정 ⑥ — 화면 줄은 `license.verifyFailed` 한 문장, 기술 사유는 툴팁 |
| 7-16 | `lib/licenseToken.ts 52` | 새 `license.err.notJwt`(툴팁) | JWT 형식 아님(점 3분할 필요) | **툴팁: JWT 형식 아님(점 3분할 필요)** | 결정 ⑥ — 화면 줄은 `license.verifyFailed` 한 문장, 기술 사유는 툴팁 |
| 7-17 | `lib/licenseToken.ts 70` | 새 `license.err.noExp`(툴팁) | exp 클레임 없음 | **툴팁: exp 클레임 없음** | 결정 ⑥ — 화면 줄은 `license.verifyFailed` 한 문장, 기술 사유는 툴팁 |
| 7-18 | `lib/licenseToken.ts 72` | 새 `license.err.expired`(툴팁) | 토큰 만료됨 | **툴팁: 토큰 만료됨** | 결정 ⑥ — 화면 줄은 `license.verifyFailed` 한 문장, 기술 사유는 툴팁 |
| 7-19 | `lib/licenseToken.ts 74` | 새 `license.err.notYet`(툴팁) | 아직 유효하지 않은 토큰(nbf) | **툴팁: 아직 유효하지 않은 토큰(nbf)** | 결정 ⑥ — 화면 줄은 `license.verifyFailed` 한 문장, 기술 사유는 툴팁 |
| 7-20 | `lib/licenseToken.ts 76` | 새 `license.err.iss`(툴팁) | 발급자(iss) 불일치 | **툴팁: 발급자(iss) 불일치** | 결정 ⑥ — 화면 줄은 `license.verifyFailed` 한 문장, 기술 사유는 툴팁 |
| 7-21 | `lib/licenseToken.ts 77` | 새 `license.err.aud`(툴팁) | 대상(aud) 불일치 | **툴팁: 대상(aud) 불일치** | 결정 ⑥ — 화면 줄은 `license.verifyFailed` 한 문장, 기술 사유는 툴팁 |
| 7-22 | `lib/licenseToken.ts 78` | 새 `license.err.tier`(툴팁) | 알 수 없는 티어 | **툴팁: 알 수 없는 티어** | 결정 ⑥ — 화면 줄은 `license.verifyFailed` 한 문장, 기술 사유는 툴팁 |
| 7-23 | `lib/licenseToken.ts 99` | 새 `license.err.decode`(툴팁) | 토큰 디코드 실패 | **툴팁: 토큰 디코드 실패** | 결정 ⑥ — 화면 줄은 `license.verifyFailed` 한 문장, 기술 사유는 툴팁 |
| 7-24 | `lib/licenseToken.ts 102` | 새 `license.err.alg`(툴팁) | 서명 알고리즘 없음(alg=none 거부) | **툴팁: 서명 알고리즘 없음(alg=none 거부)** | 결정 ⑥ — 화면 줄은 `license.verifyFailed` 한 문장, 기술 사유는 툴팁 |
| 7-25 | `lib/licenseToken.ts 110` | 새 `license.err.sig`(툴팁) | 서명 검증 실패 | **툴팁: 서명 검증 실패** | 결정 ⑥ — 화면 줄은 `license.verifyFailed` 한 문장, 기술 사유는 툴팁 |

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
| 9-2 | `code.ts 434` (PREMIUM_REQUIRED) | 새 `paid.feature` + 기능 이름 | 컴포넌트 등록·베리언트 분류는 Paid 기능입니다. | **컴포넌트 등록 — 유료 기능이에요** | 금지 용어(Paid) · 결정 ② 키 하나 + 기능 이름 |
| 9-3 | `code.ts 439` (PREMIUM_REQUIRED) | 새 `paid.feature` + 기능 이름 | 텍스트 스타일 등록은 Paid 기능입니다. | **텍스트 스타일 등록 — 유료 기능이에요** | 금지 용어(Paid) · 결정 ② 키 하나 + 기능 이름 |
| 9-4 | `code.ts 918` (PREMIUM_REQUIRED) | 새 `paid.feature` + 기능 이름 | 토큰(변수) 생성은 Paid 기능입니다. 미리보기는 무료로 제공됩니다. | **토큰 만들기 — 유료 기능이에요** | 금지 용어(Paid) · 결정 ② 키 하나 + 기능 이름 |
| 9-5 | `code.ts 1090` (PREMIUM_REQUIRED) | 새 `paid.feature` + 기능 이름 | 시맨틱 매핑은 Paid 기능입니다. | **역할 매핑 — 유료 기능이에요** | 금지 용어(Paid) · 결정 ② 키 하나 + 기능 이름 |
| 9-6 | `code.ts 1100 · 1110` (PREMIUM_REQUIRED) | 새 `paid.feature` + 기능 이름 | 텍스트 스타일은 Paid 기능입니다. | **텍스트 스타일 등록 — 유료 기능이에요** | 금지 용어(Paid) · 결정 ② 키 하나 + 기능 이름 |
| 9-7 | `code.ts 1838` (PREMIUM_REQUIRED) | 새 `paid.feature` + 기능 이름 | 다크 테마 생성은 Paid 기능입니다. | **다크 만들기 — 유료 기능이에요** | 금지 용어(Paid) · 결정 ② 키 하나 + 기능 이름 |
| 9-8 | `code.ts 1864` (PREMIUM_REQUIRED) | 새 `paid.feature` + 기능 이름 | 닮은 프레임 컴포넌트화는 Paid 기능입니다. 스캔·미리보기는 무료입니다. | **닮은 프레임 묶기 — 유료 기능이에요** | 금지 용어(Paid) · 결정 ② 키 하나 + 기능 이름 |
| 9-9 | `code.ts 923` (만들기 › 토큰 결과) | 새 `create.sumGlobals` | Global {n}개 (생성 {c} / 갱신 {u}) | (그대로) | i18n 이동만 |
| 9-10 | `code.ts 924` | 새 `create.sumPruned` |  · 이전 색 {n}개 정리 | (그대로) | i18n 이동만 |
| 9-11 | `code.ts 929` | 새 `create.sumBase` |  · base {base}px 환산 {n}개({예}{ 외}) | (그대로) | i18n 이동만 |
| 9-12 | `code.ts 1115` (만들기 › 타이포) | 새 `textStyle.needScan` | 먼저 스캔하세요 — 이름을 다시 매길 표본이 없습니다. | **먼저 스캔하세요 — 이름을 다시 매길 표본이 없어요.** | §9 해요체 통일 |
| 9-13 | `code.ts 1209` (설정 › 라이선스) | 새 `license.noteApplied` | 라이선스 적용됨 | **라이선스를 적용했어요** | §9 해요체 통일 |
| 9-14 | `code.ts 1214` | 새 `license.noteGrace` | 오프라인 — 캐시된 라이선스로 동작(grace). | **오프라인이에요 — 이 기기에 저장된 라이선스로 계속 써요** | §9 짧게 · 영어 내부 용어(grace) — 결정 ⑦ |
| 9-15 | `code.ts 1215` | 새 `license.noteOffline` | 오프라인 — 키를 확인할 수 없습니다. | **오프라인이에요 — 키를 확인할 수 없어요** | §9 해요체 통일 |
| 9-16 | `code.ts 1218` | 새 `license.verifyFailed`(사유는 툴팁 `license.err.*`) | 검증 실패: {사유} | **키를 확인하지 못했어요 — 키를 다시 확인해 주세요** | 결정 ⑥ — 기술 사유는 툴팁 · 머리말 중복 버그 수정 |
| 9-17 | `code.ts 1233` | 새 `license.noteCleared` | 라이선스 키 제거됨 | **라이선스 키를 지웠어요** | §9 해요체 통일 |
| 9-18 | `code.ts 1462` (컴포넌트 “처리 중 문제”) | 새 `component.fail.placeInstance` | 인스턴스 배치 실패: {오류} | (그대로) | i18n 이동만 — 결정 ⑨(내부 말 그대로) |
| 9-19 | `code.ts 1471 · 1649 · 1701` (컴포넌트 “처리 중 문제”) | 새 `component.fail.instance` | 인스턴스 실패({이름}): {오류} | (그대로) | i18n 이동만 — 결정 ⑨(내부 말 그대로) |
| 9-20 | `code.ts 1521` (컴포넌트 “처리 중 문제”) | 새 `component.fail.single` | 단독 등록 실패({이름}): {오류} | (그대로) | i18n 이동만 — 결정 ⑨(내부 말 그대로) |
| 9-21 | `code.ts 1543` (컴포넌트 “처리 중 문제”) | 새 `component.fail.propsRegister` | 속성접힘 등록 실패({세트}): {오류} | (그대로) | i18n 이동만 — 결정 ⑨(내부 말 그대로) |
| 9-22 | `code.ts 1578` (컴포넌트 “처리 중 문제”) | 새 `component.fail.iconFallback` | 아이콘을 만들지 못해 세트로 등록합니다({세트}) | **아이콘을 만들지 못해 세트로 등록해요({세트})** | §9 해요체 통일 |
| 9-23 | `code.ts 1593` (컴포넌트 “처리 중 문제”) | 새 `component.fail.propsComponentize` | 속성접힘 컴포넌트화 실패({이름}): {오류} | (그대로) | i18n 이동만 — 결정 ⑨(내부 말 그대로) |
| 9-24 | `code.ts 1629` (컴포넌트 “처리 중 문제”) | 새 `component.fail.expose` | 속성 노출 실패({이름}): {오류} | (그대로) | i18n 이동만 — 결정 ⑨(내부 말 그대로) |
| 9-25 | `code.ts 1709` (컴포넌트 “처리 중 문제”) | 새 `component.fail.exposeAll` | 속성 노출 실패: {오류} | (그대로) | i18n 이동만 — 결정 ⑨(내부 말 그대로) |
| 9-26 | `code.ts 1670` (컴포넌트 “처리 중 문제”) | 새 `component.fail.componentize` | 컴포넌트화 실패({이름}): {오류} | (그대로) | i18n 이동만 — 결정 ⑨(내부 말 그대로) |
| 9-27 | `code.ts 1685 · 1757` (컴포넌트 “처리 중 문제”) | 새 `component.fail.combine` | 결합 실패({세트}): {오류} | (그대로) | i18n 이동만 — 결정 ⑨(내부 말 그대로) |
| 9-28 | `code.ts 1693 · 1751` (컴포넌트 “처리 중 문제”) | 새 `component.fail.arrange` | 정렬 실패({세트}): {오류} | (그대로) | i18n 이동만 — 결정 ⑨(내부 말 그대로) |
| 9-29 | `code.ts 1867` (컴포넌트 › 묶기) | 새 `similar.noMaster` | 마스터 프레임을 찾을 수 없습니다. | **마스터 프레임을 찾을 수 없어요.** | §9 해요체 통일 |
| 9-30 | `code.ts 1877` | 새 `similar.tooFew` | 대상 프레임이 2개 미만입니다. 다시 스캔하세요. | **대상 프레임이 2개보다 적어요. 다시 스캔하세요.** | §9 해요체 통일 |
| 9-31 | `lib/artwork.ts 66` (컴포넌트 “처리 중 문제”) | 새 `component.fail.iconComponent` | 아이콘 컴포넌트 실패({이름}): {오류} | (그대로) | i18n 이동만 |
| 9-32 | `lib/artwork.ts 92` (컴포넌트 “처리 중 문제”) | 새 `component.fail.iconSwap` | 아이콘 자리 교체 실패({레이어}) | (그대로) | i18n 이동만 |
| 9-33 | `lib/artwork.ts 108` (컴포넌트 “처리 중 문제”) | 새 `component.fail.iconSwapErr` | 아이콘 자리 교체 실패({레이어}): {오류} | (그대로) | i18n 이동만 |
| 9-34 | `lib/artwork.ts 128` (컴포넌트 “처리 중 문제”) | 새 `component.fail.photoNoSlot` | 사진 이식 실패({경로}) — 자리를 찾지 못했습니다 | **사진 이식 실패({경로}) — 자리를 찾지 못했어요** | §9 해요체 통일 |
| 9-35 | `lib/artwork.ts 135` (컴포넌트 “처리 중 문제”) | 새 `component.fail.photo` | 사진 이식 실패({경로}): {오류} | (그대로) | i18n 이동만 |
| 9-36 | `lib/similarApply.ts 184` (묶기 결과) | 새 `similar.overrideFail` | {이름}: 속성 오버라이드 실패 — 원본을 그대로 두었습니다. | **{이름}: 속성 오버라이드 실패 — 원본을 그대로 뒀어요** | §9 해요체 통일 |
| 9-37 | `lib/similar.ts 133` (닮은 스캔 제외 사유) | 새 `similar.why.needTwo` | 프레임이 2개 이상 필요 | (그대로) | i18n 이동만 |
| 9-38 | `lib/similar.ts 147` | 새 `similar.why.mismatch` | 구조 불일치 | (그대로) | i18n 이동만 |
| 9-39 | `lib/similar.ts 150` | 새 `similar.why.fewSame` | 동일 구조 프레임 2개 미만 | (그대로) | i18n 이동만 |
| 9-40 | `lib/extract.ts 31` (만들기 › 색 추출 경고) | 새 `extract.skipHidden` | 숨긴 레이어는 화면에 없는 값이라 건너뛰었습니다 — 보이게 한 뒤 다시 추출하세요. | **숨긴 레이어는 화면에 없는 값이라 건너뛰었어요 — 보이게 한 뒤 다시 추출하세요.** | §9 해요체 통일 |
| 9-41 | `lib/extract.ts 33` | 새 `extract.skipInstance` | 인스턴스 내부는 마스터 복사본이라 건너뛰었습니다 — 값이 필요하면 컴포넌트를 선택해 추출하세요. | **인스턴스 안쪽은 마스터 복사본이라 건너뛰었어요 — 값이 필요하면 컴포넌트를 선택해 추출하세요.** | §9 해요체 통일 |
| 9-42 | `lib/extract.ts 34` | 새 `extract.skipGradient` | 그라디언트·이미지 채움은 변수로 묶을 수 없어 건너뛰었습니다. | **그라디언트·이미지 채움은 변수로 묶을 수 없어 건너뛰었어요.** | §9 해요체 통일 |
| 9-43 | `lib/extract.ts 38` | 새 `extract.skipFraction` | 소수 값(26.67px 등)은 척도가 아니라 스케일 잔값이라 토큰에서 제외했습니다. | **소수 값(26.67px 등)은 척도가 아니라 스케일 잔값이라 토큰에서 뺐어요.** | §9 해요체 통일 |
| 9-44 | `lib/themeApply.ts 68` (만들기 › 테마) | 새 `dark.errNoCol` | 컬렉션을 찾을 수 없어요. | (그대로) | i18n 이동만 |
| 9-45 | `lib/themeApply.ts 83` | 새 `dark.errAddMode` | Dark 모드를 추가하지 못했어요 — {이유} | (그대로) | i18n 이동만 |
| 9-46 | `lib/themeApply.ts 83` | 새 `dark.errAddModePlan` | 플랜에서 모드를 더 만들 수 없을 수 있어요. | (그대로) | i18n 이동만 |
| 9-47 | `lib/themeApply.ts 102` | 새 `dark.errSameMode` | 라이트와 다크가 같은 모드예요. 다른 라이트 모드를 고르세요. | (그대로) | i18n 이동만 |
| 9-48 | `lib/tokens.ts 101` | 새 `err.badHex` | 잘못된 hex: {값} | (그대로) | i18n 이동만(던지는 오류 — 오류 줄에 그대로 보일 수 있음) |
| 9-49 | `lib/variables.ts 388` (만들기 › 타이포 스캔 경고) | 새 `textStyle.warnMixed` | 부분 서식(혼합) 텍스트는 스킵했습니다. | **부분 서식(혼합) 텍스트는 건너뛰었어요.** | 금지 용어(스킵) |
| 9-50 | `lib/variables.ts 542` (타이포 등록 “미연결”) | 새 `textStyle.missRename` | 이름 충돌 ‘{옛}’→‘{새}’ — 이미 같은 이름 스타일이 있어 rename 보류 | **이름 충돌 ‘{옛}’→‘{새}’ — 같은 이름 스타일이 있어 이름을 바꾸지 않았어요** | 영어 섞임(rename) · 해요체 |
| 9-51 | `lib/variables.ts 598` (타이포 등록 알림) | 새 `textStyle.noteLhPx` | {이름}: 역할마다 행간 원본이 달라 px로 기록(원본 표기 생략) | (그대로) | i18n 이동만 |
| 9-52 | `lib/variables.ts 618` | 새 `textStyle.noteLsPx` | {이름}: 역할마다 자간 원본이 달라 px로 기록(원본 표기 생략) | (그대로) | i18n 이동만 |
| 9-53 | `lib/variables.ts 708` | 새 `textStyle.missStyle` | {이름}: 폰트 {스타일}→Regular | (그대로) | i18n 이동만 |
| 9-54 | `lib/variables.ts 710` | 새 `textStyle.missFamily` | {이름}: 폰트 ‘{글꼴}’ 없음 | (그대로) | i18n 이동만 |
| 9-55 | `lib/variables.ts 736` | 새 `textStyle.noteKeepLh` | {이름}: 행간 변수 연결을 지켰습니다 — {n}% 교정 보류 | **{이름}: 행간 변수 연결을 지켰어요 — {n}% 교정 보류** | §9 해요체 통일 |
| 9-56 | `lib/variables.ts 740` | 새 `textStyle.noteKeepLs` | {이름}: 자간 변수 연결을 지켰습니다 — {n}% 교정 보류 | **{이름}: 자간 변수 연결을 지켰어요 — {n}% 교정 보류** | §9 해요체 통일 |
| 9-57 | `lib/variables.ts 759` | 새 `textStyle.noteLhPct` | {역할}: 행간 {n}% 유지 — 변수 바인딩 생략 | **{역할}: 행간 {n}% 유지 — 변수 연결 안 함** | 금지 용어(바인딩) |
| 9-58 | `lib/variables.ts 775` | 새 `textStyle.noteLsPct` | {역할}: 자간 {n}% 유지 — 변수 바인딩 생략 | **{역할}: 자간 {n}% 유지 — 변수 연결 안 함** | 금지 용어(바인딩) |
