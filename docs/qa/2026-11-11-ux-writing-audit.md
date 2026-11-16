# Design System Linker — UX 라이팅 점검 (2026-11-11 · 2026-11-16 다시 대조)

- 이 파일은 2026-11-11 점검 보고서(48건, 아래 "원본")를 저장소에 넣은 것이다(ROADMAP "UX 라이팅 검수" — "점검 보고서(48건)를 저장소 `docs/`에 넣기"). 맨 위 "2026-11-16 다시 대조"가 지금 기준이고, 원본은 그날 그대로 둔다(원본의 줄 번호 · 키 수는 2026-11-11 기준).
- 이 점검으로 정한 규칙(용어표 · 문장 규칙 · 원칙 UW-P · 사용자 결정 UW-D1–UW-D6 — 처음엔 열린 질문 UW-Q1–Q6으로 적었고 2026-11-16 사용자가 답함)은 `docs/ia-v4.md` §2.4, 바꿀 문구 목록 · PR 2개는 `docs/ia-v4.md` 부록 B.20이다. 이 파일은 근거 기록이다 — 둘이 다르면 ia-v4를 따른다.

## 2026-11-16 다시 대조

### 기준
- 코드: 브랜치 `claude/zealous-ritchie-4hqdkt` 커밋 `c9d71cd` — `src/lib/i18n.ts` 810키, `src/ui.html`, `scripts/verify-bind-flow.mjs`(정확 문구 검사), `test/terms.test.mjs`(금지어 `바인딩|스킵|Paid|Free|적용 탭|붙이기`), `test/tree.test.mjs`("역할" 검사), `test/figma.test.mjs`(부분 문자열 검사).
- 2026-11-11 뒤 코드에서 바뀐 것은 #145(B.15 — 쓰는 변수 필터 없앰, 커밋 `b056534`)뿐이다. 키 11개를 지웠고(821 → 810) 그 가운데 점검 항목의 키는 없다. 그래서 **코드에서 이미 고쳐진 항목은 0건**이다. `verify-bind-flow.mjs`는 그 커밋에서 약 100줄이 바뀌어 원본의 verify 줄 번호가 어긋났다 — 아래 표의 verify 줄 번호가 오늘 기준이다.
- 함께 본 앞으로의 명세(코드보다 먼저 도는 PR — 순서는 ROADMAP §0 5–8번): ia-v4 B.18 무료 규칙(키 지움 · `make.freeBox` 새 글 · 만들기 카드 새 글), ia-v3 A.15 Components 정리(`component.registerHelp` 새 글 초안), ia-v4 B.17 V PR(글은 바꾸지 않음 — 창 560 · 글자 12px로 줄 길이만 바뀜), ia-v4 B.19 도구 탭(값을 직접 고르기 화면 통째와 그 키를 지움 · 도구 탭 새 키 · 바꾼 글 넷).
- 상태 말: **그대로** = 오늘 코드에 남고 앞 PR들도 고치지 않음(일부 키가 앞 PR에서 없어져도 남는 키가 있으면 그대로) / **이미 고쳐짐** = 코드에서 고쳐짐 / **다른 PR에서 없어짐** = 그 PR이 화면 · 키를 지워 할 일이 없어짐 / **새 PR 화면에 옮겨감** = 앞 PR의 새 화면 · 새 초안이 그 글을 쓰거나 다시 써서, 최종 글을 이 명세가 정함.
- "B.19 뒤 쓰는 곳 없음"은 B.19가 키 이름을 적지 않았지만 쓰는 함수 · 화면을 지워 미참조 키가 되는 것이다(`npm run verify:i18n`의 미참조 0 규칙으로 B.19에서 지워져야 한다): `ts.family` · `ts.lineHeight` · `ts.weight`(`textStyleEditRow`), `textStyle.linkedN` · `textStyle.linkSkipped`(타이포 바로 연결 결과), `textStyle.renameClearedTable`(`onTsRenamed`의 스캔 표 비우기), `color.extractEmpty`(`EXTRACT_RESULT` reqId 없는 갈래), `op.create`(값을 직접 고르기 `CREATE_TOKENS` — 도구 팔레트는 `op.palette`). B.20 체크리스트에 "B.19에서 지웠는지 확인"으로 둔다.

### 개수
| 상태 | 원본 48건 중 | 항목 |
|---|---|---|
| 그대로 | 46 | #1–#22 · #24 · #26–#48 — #12 · #31 · #35는 앞 PR이 새 화면 · 초안에서 쓰지만 키가 남아 그대로로 셈(#4 · #10과 같이, 1회차 검토) |
| 이미 고쳐짐 | 0 | — |
| 다른 PR에서 없어짐 | 1 | #23(B.19 — 팔레트 띠 · [팔레트 생성] · [팔레트 만들기]가 없어짐, T-P8) |
| 새 PR 화면에 옮겨감 | 1 | #25(B.18이 `make.freeBox` 글을 바꾸고 `make.freeTop` · `make.freeCount`를 지움 — 최종 모양은 UW-D6) |
| **새로 찾음** | **14** | #49–#60(아래 — B.18 · A.15 · B.19 초안이 같은 규칙을 어김) · #61–#62(1회차 검토에서 더함 — 금지어 "컴포넌트화" 2키 · 명세에 "UX 라이팅 검수"로 남았던 찾기 실패 사유) |

- 원본 "표 밖 작은 것 6건"은 순서대로 #43–#48로 번호를 붙였다(#43 띄어쓰기 · #44 `v4.linked` 순서 · #45 `list.rebase` · #46 `license.priceHint` · #47 별칭 → 가리키는 변수 · #48 `err.storage` · `err.badHex` · HUG/FILL).
- 문장 규칙별 수(오늘 → B.18 · B.19 뒤): 끝 마침표가 있는 글 51 → 40, "~세요"(주세요 아님) 36 → 28, "~해 주세요" 19 → 16, `붙이 · 붙임 · 붙일 · 붙여 · 붙인` 9 → 5(+ `make.semNote` "붙어요" 1 — 다시 대조에서 더 찾음), "토큰" 24 → 14(라이선스 내부 오류 4 · 내보내기 형식 "W3C 토큰 JSON" 1 제외 시 9), "스캔" 7 → 1(`op.textScan`), "생성 · 갱신" 13 → 7, "Figma" 2 → 1(`dark.hint`), "폰트" 9 → 5, "행간" 5 → 3, "⌘Z" 8 → 8(+ B.18 새 글 1), 홑따옴표 ' ' 8 → 8, 문장 속 [버튼] 3 → 2, "시맨틱 · 쓰임" 6 → 1, "마스터" 3 → 3, "원시" 0 → 2(`dark.hintTip` · `dark.done` — 원본에서 놓침, #57에 넣음), "KRDS" 2 → 0(B.19), 가운뎃점 붙여 씀 19 → 10.

### 48건 — 상태 · 남는 키 · 갈 곳
갈 곳의 PR 1 · PR 2는 ia-v4 B.20(PR 1 = 문구만 — verify · 테스트 · 명세 와이어를 건드리지 않는 것, PR 2 = 명세 와이어 · 사용자 결정 · verify 정확 문구 · 테스트 금지어 · 코드가 함께 바뀌는 것).

| # | 상태 | 오늘 남는 키(B.19 뒤 기준) · 바뀐 점 | 갈 곳 |
|---|---|---|---|
| 1 | 그대로 | `err.scopeAction` · `export.empty` · `wizard.seq.darkNoTarget` · `pipeline.hint.needTokens` 남음. `dark.prereqNoVars` · `prereq.gotoCreate` · `list.semanticsNote`는 B.19가 "변수 만들기"로 고침, `semantic.needGlobal`은 B.19에서 없어짐, `op.create`는 B.19 뒤 쓰는 곳 없음. 준비 현황 줄 이름 `pipeline.step.tokens` "간격·크기 토큰"을 더함(원본에서 놓침) | PR 1(`pipeline.step.tokens`만 PR 2 — 명세가 줄 이름을 7곳 인용) |
| 2 | 그대로 | `apply.none` · `apply.otherKind` · `apply.reason.other-kind` · `reasonHelp.hug-fill` · `reasonHelp.size-free-layout` + `make.semNote`("붙어요"). `textStyle.hint` · `textStyle.linkNeedScan`은 B.19에서 없어짐, `textStyle.linkedN` · `textStyle.linkSkipped`는 B.19 뒤 쓰는 곳 없음 | PR 2(verify 207 · `terms.test` 금지어) |
| 3 | 그대로 | 키 그대로 + `edit.closedPartialMissing` "일부만 저장됐어요 · {name}은 …"(`ui.ts` 6837 — 1회차 검토에서 더함). verify 207이 아직 "radius/4**을**"을 기대 | PR 2(verify 207) |
| 4 | 그대로 · 도구 탭도 씀 | `make.tsTop`(verify 1222) · `make.run.textStyles` · `op.textStyles`(B.19 도구 텍스트 스타일 실패 줄도 이 이름 — "다듬기는 UX 라이팅") · `wizard.seq.textStyles` | PR 2(verify 1222) |
| 5 | 그대로 | `make.runStyles` · `make.countStyles`(verify 1227) | PR 2 |
| 6 | 그대로 | `err.fontAction` · `reason.font` · `export.fontUnitTip` · `textStyle.missStyle` · `textStyle.missFamily`(`test/figma.test.mjs` 6835가 "display: 폰트 'Nope' 없음"을 그대로 봄 — 원본은 테스트 영향 없다고 적었음). `ts.family`는 B.19 뒤 쓰는 곳 없음, `create.fileVars` · `create.scopeHint`는 B.19에서 없어짐 | PR 1(앞 셋) · PR 2(`textStyle.miss*` — 테스트 6835) |
| 7 | 그대로 | `reason.font` · `apply.reason.font` · `v4.unbindFail.font` | PR 1 |
| 8 | 그대로 | `common.applyingVars`(B.19 팔레트 "만드는 중"이 계속 씀) · `wizard.seq.renameDone` · `license.noteApplied` "라이선스를 적용했어요"(`code.ts` 1488 — 1회차 검토에서 더함). `create.*`는 B.19에서 없어짐 | PR 1 |
| 9 | 그대로 | `wizard.seq.darkNothing`만 남음(나머지 5키는 B.19에서 없어짐) | PR 1(금지어 검사 추가는 PR 2) |
| 10 | 그대로 · 도구 탭도 씀 | `dark.hint`(도구 다크 화면 안내로 옮겨감). `ts.weight`는 B.19 뒤 쓰는 곳 없음 | PR 1 |
| 11 | 그대로 | ⌘Z가 든 8키(`v4.linked`도 지금은 꼬리에 ⌘Z — B.20에서 되돌리기 꼬리는 `apply.undo` 하나가 맡음) + B.18 만들기 카드 성공 글 "Global 변수 {n}개를 만들었어요 · ⌘Z로 되돌리기". verify 198 · 690 · 1355 · 1417 | PR 2(UW-D2 · 코드) |
| 12 | 그대로(A.15가 초안을 씀) | `component.registerHelp`는 A.15가 "마스터"를 뺀 초안을 두고 "최종 글은 UX 라이팅"(C-D3). `component.fail.propValue` · `extract.skipInstance` · `reasonHelp.instance-children`은 그대로. verify 1119는 [합치기] 툴팁에 "마스터"가 없는지만 봄(A.15가 [등록] 툴팁 검사를 더함) | PR 2(UW-D4 · ia-v4 §4.3a-3 표 · ia-v3 A.15) |
| 13 | 그대로 | `vm.noTier` · `vm.tierWhyEmpty` · `bind.noTier`(verify 1561 includes "계층으로 쓸 컬렉션이 없어요") · `wizard.seq.bindNoTier` | PR 2 |
| 14 | 그대로 | `vm.tierWhy*` 4키. **verify 308이 이제 "직접 값 4/4 · Global"을 그대로 봄**(원본은 verify 없음 — 작음) | PR 2(verify 308) |
| 15 | 그대로 | `err.networkAction` | PR 1 |
| 16 | 그대로 | `err.scope` · `err.scopeAction` | PR 1 |
| 17 | 그대로 | `err.prop` · `err.propAction` | PR 1 |
| 18 | 그대로 · 도구 탭도 씀 | "~세요" 36키 중 B.19 뒤 28키. 잠금 · 오류 쪽은 `license.err.server.*` 4 · `err.*Action` 7 · `palette.invalidHex(2)`(도구 팔레트) · `license.needKey` · `export.empty` · `bind.needOn`(verify 657) · `dark.errSameMode` · `extract.skipHidden` · `extract.skipInstance`. 늘 떠 있는 안내로만 쓰는 글(`v4.noSel` · `sel.noneHere` · `pipeline.hint.*`)은 "~하세요" 그대로. **두 곳에 쓰이는 글(1회차 검토 — UW-P19):** `status.noSelection`(잠금 사유 `setLock` 7곳 · 메뉴 메모 · 막힌 클릭 뒤 상태 줄)과 도구 다크 전제 띠 `dark.prereqNoModes` · `dark.prereqPick`(띠이자 [다크 만들기] 잠금 사유 — 같은 띠의 `dark.prereqNoVars`는 B.19가 "…만들어 주세요")은 "~해 주세요"로. `status.noSelection`은 `sel.noneHere`와 글이 같아 키를 나눔(UW-P14) | PR 1(UW-D1 · `dark.prereq*`) · PR 2(`bind.needOn` — verify 657 · `status.noSelection`) |
| 19 | 그대로 | 끝 마침표 51 → B.19 뒤 40키(여러 문장 툴팁 6키 — `dark.hintTip` · `component.scanHelp` · `component.registerHelp` · `similar.scanHelp` · `similar.componentizeHelp` · `license.clearTip` — 는 규칙대로 마침표 유지, 한 문장 툴팁 `component.classifyHelp` · `component.genMissingHelp`는 마침표를 뺌(1회차 검토에서 바로잡음)). **더 찾은 결함:** 만들기 화면 결과의 실패 줄은 `{message} — {action}`으로 잇는데(`ui.ts` 3472) `err.*`가 마침표로 끝나 "글꼴을 불러오지 못했어요. — 그 폰트를…"이 된다. 도구 다크 화면 전제 띠 `dark.prereqNoModes` · `dark.prereqPick`도 마침표, `dark.modeAdded` "다크 모드는 추가했어요. "는 줄 가운데 마침표(`ui.ts` 2408) | PR 1 |
| 20 | 그대로 | `wizard.seq.darkNothing` · `wizard.seq.darkNoTarget`. `create.colorsDone`은 B.19에서 없어짐 | PR 1 |
| 21 | 그대로 | `list.addNew` · `list.addFromSel` · `list.addDark` · `list.addTextStyles` — 뒤 둘은 B.19(T-D1)가 목적지를 도구 탭 화면으로 바꾸고 글은 그대로 둠(원본이 "다음 PR에서"로 미룬 것이 여기로 옴). verify 250 | PR 2(ia-v4 §4.6 ＋ 메뉴 와이어 · verify 250) |
| 22 | 그대로 | `v4.noSel` "디자인에서" · `sel.noneHere` = `status.noSelection` "캔버스에서". `create.hintNoSel`은 B.19에서 없어짐. `make.noSel`은 사용자 결정 R5-D1 글이라 그대로. verify 317 · 461 · 463(· 465) | PR 2 |
| 23 | 다른 PR에서 없어짐(B.19) | `palette.gen` · `palette.run` · `color.needColors` 모두 B.19에서 없어짐 — 팔레트 도구는 입력이 늘 보이고 바꾸면 바로 다시 그림(T-P8), 실행은 [변수 {k}개 만들기] | — |
| 24 | 그대로 | `wizard.seq.createDone` · `wizard.seq.textStyles` · `create.sumGlobals` · `textStyle.registered`(도구 텍스트 스타일 다 됨 줄로도 옮겨감). `palette.summary`는 B.19가 " 생성"을 뺌, `semantic.result` · `create.rowCheckTip`은 B.19에서 없어짐 | PR 1 |
| 25 | 새 PR 화면에 옮겨감 | B.18(F4)이 `make.freeBox` 글을 바꾸고 `make.freeTop` · `make.freeCount`를 지움. 남는 문제(주어 "무료는" · 가운뎃점 겹침 #52)는 2026-11-16 사용자 결정 UW-D6으로 풀었고 ia-v4 §4.3 "무료"(B.18) 글을 그날 바꿈 — 두 줄 라벨 "무료: Global 변수만" / "🔒 Semantic · 텍스트 스타일 · 다크 모드 · [라이선스 →]"(🔒는 잠긴 줄에만, "유료:" 없음 — 같은 날 사용자 결정으로 처음 안 "🔒 무료: … / 유료: …"를 바꿈). 키 `make.freeBox` "무료: Global 변수만" · 새 `make.freeBoxPaid` "Semantic · 텍스트 스타일 · 다크 모드" | B.18(이미 고친 글로 구현) · B.20 PR 2에서 확인 |
| 26 | 그대로 | `del.aliases` · `del.layers`(verify 276 "'삭제된 변수'가 돼요") · `list.noMatch`(verify 237) · `edit.nameEmptySeg`(verify 823) · `textStyle.missRename` · `textStyle.missFamily`(테스트 6835) · `textStyle.missFontKeep` · `textStyle.missVar`. `semantic.formatHint`는 B.19에서 없어짐 | PR 2 |
| 27 | 그대로 | `reasonHelp.deleted-var` · `license.err.server.limit`. `textStyle.renameClearedTable`은 B.19 뒤 쓰는 곳 없음 | PR 1 |
| 28 | 그대로 | `component.registered`(verify 1077 · 1083) · `component.extraSingles` · `component.reused`(verify 1079) · `component.extraSkipped`(verify 1051) · `v4.linkedSkipped`(verify 690) · `make.done.manual` · `create.sumManual` · `textStyle.renameSkipped` | PR 2 |
| 29 | 그대로 | `license.verify` "검증" · `license.clear` "해제"(+ `common.verifying` "검증 중…"). `create.apply` · `textStyle.scanBtn`은 B.19에서 없어짐 | PR 1 |
| 30 | 그대로 | `make.tsNote` · `make.semNote` · `v4.libOnly` · `component.hint` · `make.freeBox` + 40자를 넘던 `dark.hint` · `license.err.server.limit`(약 54자) · `extract.skipInstance` · `extract.skipHidden` · `palette.lowChroma`(B.20 PR 1 · 2에서 " — "로 줄이고 나머지는 툴팁 — 1회차 검토). V2 · V3(창 560 · 글자 12px — B.17)로 한 줄 자리가 바뀌므로 B.17 뒤 스크린샷으로 다시 잰다. `color.fileVars` · `create.fileVars`는 B.19에서 없어짐 | PR 1(스크린샷) |
| 31 | 그대로(B.19 도구 화면도 씀) | `make.done.missing`(verify 1266) · `wizard.seq.textStylesMissing` 그대로 + `textStyle.missingN`은 B.19 도구 텍스트 스타일 다 됨 줄 " · 알림 {w}개"로 옮겨감(§4.11 ③ 상태표) | PR 2(verify 1266 · §4.3 · §4.11 글) |
| 32 | 그대로 | 실패 7키 | PR 1(꼬리 글) · PR 2(원문 오류 툴팁 — 코드) |
| 33 | 그대로 | `textStyle.noteLhPx` · `textStyle.noteKeepLh` · `textStyle.noteLhPct` + 자간 짝 `textStyle.noteLsPx` · `textStyle.noteKeepLs`("교정 보류" — 1회차 검토에서 더함, `textStyle.noteLsPct`는 그대로). `ts.lineHeight`는 B.19 뒤 쓰는 곳 없음, `textStyle.scanLhPct`는 B.19에서 없어짐 | PR 1 |
| 34 | 그대로 | `create.sumBase`만(`create.baseChanged`는 B.19에서 없어짐) | PR 1 |
| 35 | 그대로(B.19 도구 팔레트가 씀) | `palette.lowChroma`("hue" · "neutral" · "브랜드색") · `palette.invalidHex`("브랜드색")가 도구 팔레트로 옮겨감 — B.19가 입력 이름을 "기준 색"(`palette.seedLabel`)으로 두고 두 글은 "UX 라이팅 PR에서 기준 색으로". `color.listHint` · `colorTidy.hintTip`은 B.19에서 없어짐 | PR 1 |
| 36 | 그대로 | `reason.empty-text` · `reason.instance-children` · `reason.no-autolayout` · `tsSkip.hasStyle`(verify 739 includes "이미 스타일 있음") | PR 1(앞 셋) · PR 2(`tsSkip.hasStyle`) |
| 37 | 그대로 | `similar.why.*` · `similar.tooFew`. `similar.why.*`는 사유 이름이라 명사형으로 두고(`similar.excluded` " · 제외 {n}개({why})" 괄호 안 · `similar.none` "… — {why}" — `ui.ts` 4248), **`test/similar.test.mjs` 56 · `test/similarApply.test.mjs` 91이 "구조 불일치"를 그대로 봄**(1회차 검토). verify 1850은 `similar.needTwo`만 봄 | PR 1(`similar.tooFew`) · PR 2(`similar.why.*` — 테스트) |
| 38 | 그대로 | `list.undo` · `bind.skipSelectBtn`. verify는 글을 그대로 비교하지 않고 설명에만 씀(298 · 300 · 342 · 346 · 352 · 678), 명세 와이어가 "[← 되돌리기]" · "[선택 ›]"를 인용 | PR 2(명세 와이어) |
| 39 | 그대로 | `v4.fixPlaces` · `v4.fixPlacesChip` · 머리 `v4.skipFixHead`(ROADMAP 검수 요청과 같은 것). verify 336 · 341 | PR 2(UW-D3) |
| 40 | 그대로 | `component.fit.*` | PR 1 |
| 41 | 그대로 | `make.layers` "Layer {n}" — B.18 만들기 카드도 같은 키(2026-11-13 사용자 결정 §9 5번). 사용자 결정이 둘이라 바꾸려면 다시 물어야 함 | 닫음 — 2026-11-16 사용자 결정 UW-D5 "Layer {n}" 그대로 |
| 42 | 그대로 | `component.fillKept` · `component.fail.fillKept` · `dark.hint` · `dark.hintTip` · `component.scanHelp` · `license.manageTip` · `extract.skipGradient` · `license.setupHint` · `err.fontAction` · `pipeline.step.tokens`. `create.title` · `color.extractEmpty` · `rail.colorSub`는 B.19에서 없어짐 | PR 1 · PR 2(`pipeline.step.tokens` — 명세 인용, `component.fillKept` · `component.fail.fillKept` — verify 1061–1063 · 1091이 "채움·크기가 달라"를 봄 → "채움이나 크기가 달라") |
| 43 | 그대로 | `license.manageTip` "결제수단" · `similar.resKept` "남겨둔"(+ "건"). `semantic.formatLabel`은 B.19에서 없어짐 | PR 1(`license.manageTip`) · PR 2(`similar.resKept` — verify 1068 `!includes('남겨둔 것')`을 '남겨 둔 것'으로 함께, 안 바꾸면 늘 참) |
| 44 | 그대로 | `v4.linked` + `v4.linkedSkipped` 순서 · 🔗(verify 690) | PR 2(#11과 함께 — 코드에서 잇는 순서) |
| 45 | 그대로 | `list.rebase` "기준 바꾸기" — 명세(§2.5 · §4.1)가 "[기준 바꾸기]"를 여러 곳 인용 | PR 2 |
| 46 | 그대로 | `license.priceHint` — F1(무료도 Global 변수를 만듦) 뒤에는 "무료 ·"만으로 범위가 더 모호 | PR 1 |
| 47 | 그대로 | `edit.pickAria` · `vm.tierWhyAlias`의 "별칭" | PR 2(#14와 함께) |
| 48 | 그대로 | `err.storage` · `err.badHex` · `reason.hug-fill` | PR 1 |

### 새로 찾은 것 — B.18 · A.15 · B.19 초안(#49–#60) · 1회차 검토(#61–#62)
| # | 분류 | 어디(초안) | 지금 초안 글 | 문제 | 바꿀 글(안) | 갈 곳 |
|---|---|---|---|---|---|---|
| 49 | ③ | B.18 만들기 카드 둘째 줄 셋(ia-v4 §4.1 "만들기 카드" 와이어) | "선택에서 찾은 값으로 Global 변수를 만들어요. 무료는 개수 제한이 없어요." · "선택에서 찾은 값으로 Global · Semantic 변수를 한 번에 만들고 바로 연결해요." · "이제 같은 값을 쓰는 레이어에 연결해요. Semantic 변수로 묶기는 유료예요." | 한 줄 자리(둘째 줄)에 끝 마침표 · 문장 사이 마침표(UW-P4) | "선택에서 찾은 값으로 Global 변수를 만들어요 · 개수 제한은 없어요" · "선택에서 찾은 값으로 Global · Semantic 변수를 만들고 바로 연결해요" · "이제 같은 값을 쓰는 레이어에 연결해요 · Semantic 변수 만들기는 유료예요"(#50) | B.18이 이 글로 만들면 끝, 아니면 PR 2 |
| 50 | ① | B.18 만든 뒤 카드 둘째 줄 | "Semantic 변수로 **묶기**는 유료예요" | "묶기"는 컴포넌트의 [변형 세트로 묶기]에 쓰는 말(용어표) | "Semantic 변수 만들기는 유료예요" | 위와 같음 |
| 51 | ⑥ | B.18 카드 만들기 성공 상태 줄 | "Global 변수 {n}개를 만들었어요 · ⌘Z로 되돌리기" | #11과 같음 | UW-D2 — `{undo}` | PR 2(#11과 함께) |
| 52 | ⑥ | B.18 `make.freeBox` 새 글 | "🔒 무료는 Global 변수만 만들어요 · Semantic · 텍스트 스타일 · 다크 모드는 유료 · [라이선스 →]" | 가운뎃점이 나열(Semantic · 텍스트 스타일 · 다크 모드)과 절 구분에 함께 쓰여 어디서 끊기는지 안 보임(UW-P8) · 🔒가 무료 줄에 붙음 | 두 줄 라벨 "무료: Global 변수만" / "🔒 Semantic · 텍스트 스타일 · 다크 모드 · [라이선스 →]"(UW-D6 — 사용자 결정: 명세 추천 B가 아니라 라벨 모양, 🔒는 잠긴 줄에만 · "유료:" 없음. 키 `make.freeBox` · 새 `make.freeBoxPaid`). 만들기 카드 🔒 줄도 같은 모양(UW-P20) | B.18(ia-v4 §4.3 · §4.1 글 고침) |
| 53 | ① | A.15 `component.registerHelp` 초안(ia-v4 §4.3a-3 표) | "체크한 후보를 Components에 등록하고 자리엔 인스턴스를 남겨요. 그 인스턴스는 등록한 컴포넌트의 연결과 값을 따라요" | 여러 문장 툴팁인데 마지막 마침표 없음(UW-P4) · "Components"가 페이지 이름인지 안 보임 · 피그마 말(메인 컴포넌트)과 다름(#12) | "체크한 후보를 Components 페이지에 컴포넌트로 등록하고, 원래 자리에는 인스턴스를 남겨요. 남긴 인스턴스의 연결과 값은 메인 컴포넌트를 따라요."(UW-D4) | A.15가 이 글로 만들면 끝, 아니면 PR 2 |
| 54 | ① | B.19 `tools.intro` | "레이어를 **고르지** 않아도 파일에 바로 만들어요" | 레이어는 "선택"(용어표 — 다른 안내는 모두 "레이어를 선택하세요") | "레이어를 선택하지 않아도 파일에 바로 만들어요" | B.19가 이 글로 만들면 끝, 아니면 PR 1 |
| 55 | ④ | B.19 브랜드 팔레트 · 텍스트 스타일 화면의 안내 한 줄(§4.11 와이어) | "기준 색으로 Global 색 변수를 만들어요" · "기본 글자 단계를 만들어요 · 이름을 더블클릭하면 고칠 수 있어요" | 와이어에만 있고 키 이름이 없다(B.19 새 키 목록에 없음 — 다크 화면만 `dark.hint`) | 새 키 `tools.paletteHint` · `tools.tsHint`(글은 와이어 그대로 — 둘 다 규칙에 맞음) | B.19 구현 때 이 이름으로 만든다(B.20에서 확인) |
| 56 | ③⑥ | B.19 도구 다크 화면 안내(§4.11 ② 와이어 · `dark.hint`) | 와이어 "…다크에 채워요 · 목록 이름은 Figma 변수 컬렉션·모드예요" ↔ 키 "…다크에 채워요. 목록 이름은 Figma 변수 컬렉션·모드예요" | 와이어와 키 글이 다르고(마침표 · 가운뎃점), "Figma" · "·" 붙여 씀(#10 · #19 · #42) · "목록 이름"이 무엇인지 모호(고르개 이름) | "라이트 색을 뒤집어 다크 모드 값을 채워요 · 고르개 이름은 피그마 변수 컬렉션 · 모드 이름이에요" | PR 1 |
| 57 | ① | B.19 도구 다크 화면 결과(`dark.done` — "글 그대로") · 툴팁 `dark.hintTip` | "{modePart}다크 {n}개 **연결** · 새 dark/ **원시색** {c}개{skipPart}" · "다크용 원시색은 dark/…로 따로 만들어요." | "연결"은 레이어에 변수를 붙이는 일인데 여기서는 Semantic의 다크 값 채우기 · "원시"는 금지어(용어표) | "{modePart}다크 값 {n}개를 채웠어요 · 새 dark/ 색 {c}개{skipPart}" · 툴팁 "색상 · 채도는 그대로 두고 명도만 뒤집어요. Semantic이 Global을 가리키는 것만 대상이고 값을 직접 넣은 것은 건너뛰어요. 다크용 색은 dark/… 이름으로 따로 만들어요." | PR 1 — 같은 문제의 `wizard.seq.dark` "다크 {realiased}개 연결"(`ui.ts` 3443) · `wizard.seq.darkSkip`(단위) · `dark.modeAddedShort` "다크 모드 추가 · "(명사형 + 해요체 `dark.done` — UW-P17)도 함께(1회차 검토) |
| 58 | ① | B.19 도구 텍스트 스타일 다 됨 줄(`textStyle.registered` — "글 그대로") | "텍스트 스타일 {n}개 (생성 {c} / 갱신 {u}) · **연결 {b}**" | 도구 탭은 레이어에 붙이지 않는데(`applyTo` 없음) "연결 {b}"(스타일에 붙인 글자 변수 수)가 레이어 연결로 읽힘 · 생성/갱신(#24) | "텍스트 스타일 {n}개를 만들었어요(새로 {c} · 바뀜 {u})" — `{b}`는 글에서 뺌 | PR 1 |
| 59 | ① | B.19 작업 실패 [보기] 표의 작업 이름(§4.11 T-P14 "지금 이름") | `op.textScan` "텍스트 **스캔**" · `op.extract` "**추출**" | B.19 뒤 화면에서 "스캔" · "추출" 버튼이 모두 없어지고(사용자가 누른 것은 [읽기]) 실패 줄 "텍스트 스캔 실패 · [보기]"만 남음(용어표 "읽기") | `op.textScan` "텍스트 스타일 읽기" · `op.extract` "값 읽기" | PR 1 |
| 60 | ⑤ | B.19 `tools.paidNote`(무료 잠금 안내) | "🔒 유료 기능이에요 · 라이선스를 넣으면 쓸 수 있어요" | 같은 잠금을 공통 상태 줄은 `status.paid` "유료 기능이에요 · 설정 › 라이선스에서 풀 수 있어요"로 말함(같은 상황 두 문구) | "🔒 유료 기능이에요 · 설정 › 라이선스에서 풀 수 있어요"(`status.paid`와 같은 글 — 바로 아래 [라이선스 →]가 있음) | B.19가 이 글로 만들면 끝, 아니면 PR 1 |
| 61 | ① | 오늘 코드(1회차 검토에서 더함) | `component.fail.componentize` "컴포넌트화 실패({name}): {error}" · `component.fail.propsComponentize` "속성접힘 컴포넌트화 실패(…)"(`code.ts` 2028 · 2157) | 금지어 "컴포넌트화"(용어표 — 등록 · 합치기) | "컴포넌트로 만들지 못했어요({name}): {error}" · "속성 컴포넌트로 만들지 못했어요({name}): {error}" | PR 1 |
| 62 | ④ | ia-v4 §4.2 상태표 "찾기 실패"(명세에 "실패에 맞는 사유 글은 UX 라이팅 검수"로 남음 — 1회차 검토) | [연결] 잠금 사유가 지금 "선택을 읽는 중…"(`v4.reading` — `updateBindApply` `ui.ts` 3922) | 실패했는데 읽는 중이라고 말함 · 다음 할 일 없음(UW-P15) | 새 키 `bind.findFailedLock` "선택을 읽지 못했어요 — ‘다시 시도’를 눌러 주세요"(잠금 사유 — UW-P19) | PR 2(코드) |

- 규칙에 맞아 그대로 쓰는 초안(확인만): B.18 "기본으로 만들 값이 없어요 · [외 {k}개 보기]" · "Semantic 변수는 유료예요" · "Semantic 매핑은 유료예요" · "변수 만들기 실패 · [보기]" · "{선택 이름}에서 많이 쓴 값"(조사 "에서"는 받침과 무관), §4.1 찾기 실패 "선택을 읽지 못했어요 · [다시 읽기]"(13회차 — "UX 라이팅에서 다듬음" → 이대로 확정), §2.6 찾기 작업 이름 "찾기"(새 키 `op.find` — "찾기 실패 · [보기]"), B.19 `tab.tools` "도구" · `tools.paletteSub` · `tools.darkSub` · `tools.textStylesSub` · `palette.make` "변수 {k}개 만들기" · `palette.overwriteN` "기존 변수 {n}개의 값이 바뀌어요" · `palette.counting` "바뀌는 변수를 세는 중…" · `palette.countFail` "바뀌는 변수를 세지 못했어요" · `palette.use.*`(주색 · 보조색 · 하모니 1–3 · 중립 · 성공 · 경고 · 오류 · 정보 — "역할" 없음) · `tools.tsMake` "텍스트 스타일 {k}개 만들기" · `tools.tsNeedOn` "만들 스타일을 켜 주세요"(텍스트 스타일 화면 안이라 "스타일" — UW-P18) · `tools.tsReading` "스타일을 읽는 중…" · `tools.tsRunning` "텍스트 스타일을 만드는 중…" · `tools.tsRefreshFail` · `tools.darkReadFail` · `tools.darkRefreshFail` · `dark.prereqNoVars` 새 글("먼저 변수 만들기에서 Semantic 변수를 만들어 주세요" — 전제 띠이자 잠금 사유라 UW-P19의 "~해 주세요"에 맞음) · `prereq.gotoCreate` "변수 만들기 →" · `list.semanticsNote` 새 글 · `op.palette` "브랜드 팔레트" · `op.updateVar` "고치기".

### ROADMAP "UX 라이팅 검수" 요청 — 어디서 정했나
- `bind.needOn` "연결할 변수를 켜세요" → 잠금 사유라 "연결할 변수를 켜 주세요"(UW-D1) — #18, B.20 PR 2(verify 657).
- " · 건너뜀 {x}" · "건너뛴 곳" · "손볼 수 있는 곳" · "손볼 곳 {s}곳" → UW-D3 — #39 · #28, B.20 PR 2.
- 텍스트 스타일 이름 다시 짓기 팝업의 읽는 중 · 바꿀 이름 0개 버튼 · 사유 → UW-P12(모르는 수는 숫자로 쓰지 않는다) + B.20 PR 2 표. **더 찾은 결함:** text-style-krds §5.2는 응답 전 제목을 `textStyle.renameBtn` "이름 다시 짓기"로 정했는데, B.19는 `textStyle.renameBtn`을 지울 키로 적었다(`btnTsRename`만 쓴다고 봄) — 새 키 `textStyle.renameTitle`로 푼다(B.20).
- `make.freeBox` 범위 → B.18(F4)이 새 글을 정함, 여기서는 다듬기만 — UW-D6 · #52.
- 화면에 "KRDS"를 쓰지 않음 → UW-P13. 지금 두 키(`textStyle.rowLabelTip` · `textStyle.nameSplit`)는 B.19에서 없어지고, B.20 PR 2에서 `terms.test` 금지어에 `KRDS`를 더한다.

---

## 원본 (2026-11-11 — 그날 그대로)

- 기준: 브랜치 `claude/zealous-ritchie-4hqdkt`(PR #143 반영, 2026-11-11 pull) — `src/lib/i18n.ts` 821키, `src/ui.html`, `docs/ia-v4.md`(§2.4 용어 · §2.7 영어 종류 이름 · §4.3a), `docs/ia-v3.md` §2.9 용어 · §9, `test/terms.test.mjs` · `test/tree.test.mjs`, `scripts/verify-bind-flow.mjs`.
- 파일은 하나도 고치지 않았다.
- "값을 직접 고르기"의 토큰 · 테마 · 타이포 단계 문구(`create.*` · `rail.*` · `semantic.*` · `textStyle.*` 스캔/등록 · `dark.*` 일부)는 다음 PR에서 없어지므로 **기록만** 하고 순위에서는 낮췄다.
- 크기: **작음** = 문구만 바꾸면 됨 / **중간** = 명세(ia-v4) · 테스트(`verify-bind-flow` 정확 문구, `test/*.mjs`) · 코드도 같이 바꿔야 함.

---

### 1. 요약 — 분류별 개수

| 분류 | 개수 | 한 줄 요약 |
|---|---|---|
| ① 용어 일관성 | 15 | 같은 것을 다른 말로 부름: 토큰↔변수, 붙이기↔연결, 폰트↔글꼴, 행간↔줄 높이, 등록↔만들기↔생성, 시맨틱/쓰임↔Semantic, Figma↔피그마, 마스터↔원본, 스코프↔용도 |
| ② 디자이너가 모를 말 | 8 | 계층(tier), base, hue, HUG/FILL, 1×, ≠, 진단 조각(별칭 a/n · Component), KRDS, 로컬 저장소 |
| ③ 문장 규칙 | 8 | "~하세요" 55개 vs "~해 주세요" 19개 섞임, 끝 마침표 38개(대부분 v4 규칙 위반), 한 문장 안 명사형+해요체 혼용, "…" 규칙이 거꾸로, 버튼이 명사(검증 · 해제 · 적용), 480px에서 줄바꿈될 긴 안내 |
| ④ 오류 · 빈 상태 · 잠금 | 6 | 다음 할 일이 없는 실패 문구, "연결을 확인하세요"(네트워크인데 제품 용어 '연결'과 겹침), "알림 n개"의 뜻 불명, 무료 안내 주어 불명 |
| ⑤ 중복 · 비슷한 문구 | 5 | 같은 상황을 3가지로 말함(선택 없음 · 글꼴 사유 · 닮은 프레임 2개 미만 · 빈 글자/텍스트 · 인스턴스 안쪽/내부), 팔레트 "생성/만들기" 두 버튼 |
| ⑥ 띄어쓰기 · 문장부호 | 6 | 따옴표 3종(‘’ · '' · “”), 버튼 가리킴 [ ] vs ‘ ’, "·" 붙임/띄움 섞임, 숫자 뒤 단위 빠짐, 조사 `{name}을` 오류("radius/4을"), ⌘Z(맥 전용) |
| **합계** | **48** | 표에는 영향 큰 순으로 42건 |

참고로 좋은 점: 금지어 검사(바인딩 · 스킵 · Paid · Free · 붙이기)는 통과, "역할"→Semantic 정리는 화면 문구에서 끝났고(`tree.test.mjs`), 잠금 사유 대부분이 v4 규칙(마침표 없음 · "먼저 ‘…’를 눌러 주세요")을 따른다. PR #143의 컴포넌트 문구(변형 세트 · 원본 · 하나의 컴포넌트로 합치기)는 서로 잘 맞는다 — 남은 것은 `마스터` 3곳(#12)뿐.

---

### 2. 주요 발견 42건 (사용자 영향 순)

| # | 분류 | 키 | 지금 문구 | 문제 | 바꿀 문구(안) | 크기 |
|---|---|---|---|---|---|---|
| 1 | ① | `op.create` · `err.scopeAction` · `export.empty` · `semantic.needGlobal` · `dark.prereqNoVars` · `prereq.gotoCreate` · `wizard.seq.darkNoTarget` · `pipeline.hint.needTokens` | "토큰 만들기 실패" · "‘토큰 만들기’를 다시 실행해…" · "먼저 토큰을 만드세요." | v4에는 "토큰 만들기" 화면이 없다(이름은 **변수 만들기**). 화면은 "변수", 오류는 "토큰"이라 다른 기능처럼 읽힘 | "변수 만들기 실패" · "‘변수 만들기’를 다시 실행해 주세요" · "내보낼 변수가 없어요 — 먼저 변수를 만들어 주세요" | 작음 (verify 영향 없음) |
| 2 | ① | `apply.none` · `apply.otherKind` · `apply.reason.other-kind` · `textStyle.hint` · `textStyle.linkNeedScan` · `textStyle.linkedN` · `textStyle.linkSkipped` · `reasonHelp.hug-fill` · `reasonHelp.size-free-layout` | "{name}을 붙일 곳이 없어요" · "글자 {a}개에 붙임" · "변수를 붙이지 않아요" | §2.4 "레이어에 변수를 붙이는 일은 어디서든 **연결**". 금지어 검사가 `붙이기`만 잡아 `붙일 · 붙임 · 붙여`가 남음 | "선택한 레이어에 연결할 곳이 없어요({name})" · "글자 {a}개에 연결" · "자동 크기라 변수를 연결하지 않아요" | 중간 (verify 202 정확 문구 · `terms.test` 금지어에 `붙일\|붙임\|붙여` 추가 권장) |
| 3 | ⑥ | `apply.none`(위) · `edit.closedMissing` · `edit.cssClash` · `bind.newRoleTip` · `textStyle.missVar` · `textStyle.missFontKeep` | "radius/4**을** 붙일 곳이…" · "{name}은" · "{global}을 가리켜요" | 변수 이름 끝 글자에 따라 조사가 틀림(verify 202가 실제로 "radius/4을"을 기대 — '사'로 읽으면 '를'). `list.jumped`는 이미 "(으)로"를 씀 | 조사를 빼고 구조 변경: "가리키는 변수: {global}" · "지금 목록에 없어요: {name}" 또는 "(을)를 · (은)는 · (과)와" | 작음~중간 (verify 202) |
| 4 | ① | `make.tsTop` · `make.run.textStyles` · `op.textStyles` vs `make.runStyles` · `list.addTextStyles` · `make.done.styles` | "켠 스타일만 **등록**해요" / 버튼 "스타일 {t}개 **만들기**" | 한 탭 안에서 안내는 '등록', 버튼은 '만들기'. 변수는 '만들기'이므로 텍스트 스타일도 '만들기'로 | "켠 스타일만 만들어요" · "텍스트 스타일 만드는 중…" · op "텍스트 스타일 만들기" ('등록'은 컴포넌트에만) | 중간 (verify 1266) |
| 5 | ① | `make.runStyles` · `make.countStyles` | "스타일 {t}개 만들기" · " · 스타일 {t}개" | 탭은 "Text Style", 다 됨은 "텍스트 스타일", 버튼 · 개수만 "스타일" — 색 스타일과 헷갈림 | "텍스트 스타일 {t}개 만들기" · " · 텍스트 스타일 {t}개" (§2.7: 종류 자리 아님 → 한글) | 중간 (verify 1271) |
| 6 | ① | `err.font`+`err.fontAction` · `reason.font` · `ts.family` · `create.fileVars` · `create.scopeHint` · `export.fontUnitTip` · `textStyle.missStyle` · `textStyle.missFamily` | "글꼴을 불러오지 못했어요." + "그 **폰트**를 설치·활성화한 뒤…" | 한 메시지 안에서 글꼴/폰트가 바뀜. 명세 §2.4 · `reasonHelp.font` · `apply.reason.font`는 '글꼴' | 전부 "글꼴": "그 글꼴을 설치하거나 켠 뒤 다시 시도해 주세요" · "글꼴 크기 단위" | 작음 |
| 7 | ⑤ | `reason.font` · `apply.reason.font` · `v4.unbindFail.font` | "폰트 미로드" / "글꼴을 불러오지 못함" / "글꼴을 불러올 수 없음" | 같은 사유 3가지 표현, "미로드"는 개발 말 | 셋 다 "글꼴을 불러오지 못함" | 작음 |
| 8 | ① | `common.applyingVars` · `create.preview` · `create.apply` · `wizard.seq.renameDone` | "변수에 적용 중…" · "‘적용’으로 반영" · "이름 적용" | §2.4 "'적용'이라는 말은 쓰지 않는다". `common.applyingVars`는 다음 PR에도 남는 **색 단계** 문구 | "색 변수를 만드는 중…" · "{count}개 이름 정리" (`create.*`는 토큰 단계와 함께 삭제) | 작음 |
| 9 | ① | `semantic.result` · `semantic.aliasBtn` · `wizard.seq.darkNothing` · `semantic.title` · `color.listHint` · `colorTidy.hintTip` | "시맨틱 {n}개 별칭" · "시맨틱 색이 필요해요" · "Semantic = **쓰임** 이름" | §2.4 "Semantic"으로 통일 결정. 한글 "시맨틱" · "쓰임"이 남음. `color.listHint` · `colorTidy.hintTip`은 남는 색 단계 | "Global을 가리키는 Semantic 색이 필요해요" · "Global = 색 계열 이름 · Semantic = 용도 이름" | 작음 (+ `tree.test` "역할" 검사처럼 `시맨틱\|쓰임` 검사 추가 권장 → 중간) |
| 10 | ① | `ts.weight` · `dark.hint` vs `v4.libOnly` · `edit.nameRejected` · `edit.valueRejected` · `apply.reason.error` · `reasonHelp.space-between` | "**Figma**가 쓰는 이름" · "Figma 변수 컬렉션" vs "**피그마**가 이 이름을 받지 않아요" | 제품 이름 표기 2가지 | 다수 · verify가 쓰는 "피그마"로 통일(영어 2곳만 바꿈) | 작음 (verify 영향 없음) |
| 11 | ⑥ | `apply.undo` · `newVar.created` · `del.done` · `v4.linked` · `v4.unbound` · `rename.footNote` · `rename.doneStatus` · `textStyle.renamed` | "⌘Z로 되돌리기" | Windows 피그마 사용자에게는 Ctrl+Z. 8곳 | `{undoKey}` 자리표시자(맥 ⌘Z / 그 외 Ctrl+Z) 또는 "실행 취소로 되돌리기" | 중간 (코드 + verify 193 · 734 · 1399 · 1461) |
| 12 | ① | `component.registerHelp` · `component.fail.propValue` · `extract.skipInstance` · `reasonHelp.instance-children` | "원본의 연결과 값은 **마스터**를 따라요" · "마스터 값으로 뒀어요" · "마스터 복사본" · "컴포넌트 **원본**에서 연결해요" | 피그마 한국어판은 "메인 컴포넌트". PR #143이 닮은 프레임에서 '마스터'→'원본'으로 바꿔 '원본'이 두 뜻(고른 프레임 · 메인 컴포넌트)이 됨 | 피그마의 것 = "메인 컴포넌트", 닮은 프레임에서 고른 것만 "원본": "등록 전 레이어의 연결과 값은 메인 컴포넌트를 따라요" · "메인 컴포넌트에서 연결해요" | 중간 (§4.3a가 registerHelp를 '그대로'로 정함 → 명세 수정) |
| 13 | ② | `vm.noTier` · `v4.noTierName` · `bind.noTier` · `wizard.seq.bindNoTier` · `edit.pickAllTiers` | "계층 아님" / "계층 없음" · "계층으로 쓸 **컬렉션**이 없어요" / "계층으로 쓸 **변수**가 없어요" | '계층'(=Global/Semantic/Component 구분)은 디자이너에게 '레이어 계층'으로 읽힘. 같은 상태를 "아님/없음", "컬렉션/변수"로 다르게 | 라벨은 "계층 없음" 하나로. 문장은 "Global · Semantic으로 나뉜 컬렉션이 없어요 — 컬렉션 이름에 Global · Semantic을 넣거나 변수 만들기로 만들어 주세요" | 중간 (verify 938 설명 · 명세 용어) |
| 14 | ② | `vm.tierWhyName` · `vm.tierWhyAlias` · `vm.tierWhyDirect` · `vm.tierWhyEmpty` | "이름 · Component" · "별칭 {a}/{n} · {tier}" · "직접 값 {d}/{n} · Global" | 계층 배지 툴팁이 개발 진단 조각. 무엇을 보고 정했는지 문장이 아님 | "이름에 Component가 있어서" · "변수 {n}개 중 {a}개가 다른 변수를 가리켜서 {tier}" · "변수 {n}개 중 {d}개가 값을 직접 가져서 Global" | 작음 |
| 15 | ④ | `err.networkAction` | "**연결**을 확인하고 다시 시도하세요." | 이 제품에서 '연결'은 변수 연결. 네트워크 문제인데 '연결을 확인'은 오해 | "인터넷 상태를 확인하고 다시 시도해 주세요" | 작음 |
| 16 | ① | `err.scope` · `err.scopeAction` vs `vm.dScopes` · `apply.notInScope` · `edit.pickOtherScope` | "변수 **스코프**가 맞지 않아요." | 다른 곳은 다 "용도" | "변수의 용도가 맞지 않아요" · "‘변수 만들기’를 다시 실행해 용도를 고쳐 주세요" | 작음 |
| 17 | ② | `err.prop` · `err.propAction` | "(예: **발행** 안 한 컴포넌트)" · "컴포넌트를 발행하거나…" | 피그마 · 명세는 "게시"(라이브러리 게시) | "게시하지 않은 컴포넌트" · "컴포넌트를 게시하거나…" | 작음 |
| 18 | ③ | 잠금 · 오류 문구 19개("~해 주세요") vs 55개("~하세요") — 예 `license.verifyFailed` "키를 다시 확인해 주세요" vs `license.err.server.invalid` "키를 다시 확인하세요" | 같은 화면 · 같은 상황에서 두 말투 | 규칙 하나로: **오류 · 잠금 뒤 요청 = "~해 주세요"**(§4.3a 최근 결정과 같음), **빈 상태 · 정적 안내 = "~하세요"**(v3 §2.9 "레이어를 선택하세요"). 고칠 곳: `license.err.server.*` 4 · `err.*Action` 7 · `palette.invalidHex(2)` · `license.needKey` · `textStyle.needScan` · `export.empty` | 중간 (명세 §2.4에 규칙 추가) |
| 19 | ③ | `palette.invalidHex` · `component.noEligible` · `export.saved` · `export.empty` · `license.needKey` · `vm.dNoUses` · `similar.noMaster` · `dark.errNoCol` · `semantic.needGlobal` 등 38개 | "…입력하세요." · "…저장했어요." | v4는 상태 줄 · 잠금 사유 한 줄에 마침표 없음(§4.3a "다른 잠금 사유처럼 마침표 없음"). 같은 묶음에서 `similar.noMaster`는 ".", `similar.tooFew`는 없음 | 한 문장짜리는 마침표 삭제. 두 문장은 " — "로 잇기(예 `export.empty` "내보낼 변수가 없어요 — 먼저 변수를 만들어 주세요"). 툴팁은 여러 문장이면 마지막까지 마침표(`dark.hint`는 첫 문장만 마침표 — 고침) | 작음 |
| 20 | ③ | `wizard.seq.darkNothing` · `wizard.seq.darkNoTarget` · `create.colorsDone` | "채울 색이 없**음** — …필요**해요**" · "건너뜀 — 먼저 토큰을 만드세요" · "이미 생성됨 · 여기선 색 외만" | 한 줄 안에서 명사형과 해요체가 섞이고, "여기선 색 외만"은 문장이 끊김 | "채울 색이 없어요 — Global을 가리키는 Semantic 색이 필요해요" · "색 변수 {count}개는 이미 있어요 · 여기서는 색 말고 다른 값만 만들어요" | 작음 |
| 21 | ③ | `list.addNew` vs `list.addFromSel` · `list.addDark` · `list.addTextStyles` | "새 변수"(창이 열림) / "선택에서 변수 만들기…"(화면 이동) | "…"는 '창이 열린다'는 뜻인데 거꾸로: 창을 여는 '새 변수'엔 없고, 다른 화면으로 가는 세 항목에 있음. §2.4는 화면 이동을 "→"로 정함 | "새 변수…" · "선택에서 변수 만들기 →" (다크 · 텍스트 스타일 항목은 다음 PR에서 목적지가 바뀌므로 그때) | 중간 (ia-v4 §4.6 와이어 문구 · verify 246 · 1410 정확 문구) |
| 22 | ⑤ | `sel.noneHere` = `status.noSelection` vs `v4.noSel` vs `create.hintNoSel` · `make.noSel` | "선택이 없어요 — **캔버스**에서 레이어를 선택하세요" / "**디자인**에서 레이어를 선택하세요" / "레이어를 먼저 선택하세요." | 같은 상황 3~4가지 표현, '캔버스/디자인' 섞임 | 모두 "캔버스에서 레이어를 선택하세요"(선택 탭 첫 화면도). 앞의 "선택이 없어요 —"는 잠금 사유에서만 | 중간 (verify 186 · 312 · 505 · 507 · 509) |
| 23 | ⑤ | `palette.gen` · `palette.run` | 여는 단추 "팔레트 **생성**" + 실행 "팔레트 **만들기**" | 뜻이 같은 두 말이 서로 다른 일(띠 열기 / 실제 생성)을 함 | 여는 단추 "팔레트 ▸"(또는 "팔레트 설정"), 실행 "팔레트 만들기" — `color.needColors`의 ‘팔레트 생성’도 함께 | 중간 (§4.3a 결정 · verify 1769 · 1800) — 다음 PR "브랜드 팔레트"와 같이 결정 권장 |
| 24 | ① | `semantic.result` · `wizard.seq.createDone` · `create.sumGlobals` · `textStyle.registered` · `palette.summary` · `create.rowCheckTip` | "(**생성** {c} / **갱신** {u})" · "{tokens}색 생성" · "생성 대상" | 화면 버튼은 '만들기', 결과는 '생성 · 갱신'(한자어). 구분 기호도 " / "와 " · " 섞임 | "새로 {c} · 바뀜 {u}" · "{tokens}색" · "만들 대상" | 작음 (대부분 값을 직접 고르기 단계 — 남는 것: `palette.summary`) |
| 25 | ④ | `make.freeBox` · `make.freeTop` · `make.freeCount` | "**무료는** 변수를 만들지 않아요 · 아래는 유료에서 만들 변수예요" | 주어 '무료는'이 어색, 왜/어떻게 풀리는지 없음 | "무료에서는 변수를 만들 수 없어요 · 아래는 유료에서 만들어질 변수예요 [라이선스 →]" | 작음 |
| 26 | ⑥ | `del.aliases` · `list.noMatch` · `edit.nameEmptySeg` · `textStyle.missRename` · `textStyle.missFamily` · `textStyle.missFontKeep` · `textStyle.missVar` · `semantic.formatHint` | "'삭제된 변수'" · "'{q}'와 맞는…" · "“Semantic = …”" | 따옴표 3종. 나머지(‘미리보기’ · ‘스캔’ 등 20여 곳)는 ‘ ’ | 모두 ‘ ’ | 중간 (verify 232 · 271 · 867 · 1302 · 1310 정확 문구) |
| 27 | ⑥ | `reasonHelp.deleted-var` · `textStyle.renameClearedTable` · `license.err.server.limit` | "첫 화면 [연결 풀기]로…" · "다시 [스캔]해 주세요" · "[해제]한 뒤…" | 버튼을 가리키는 방식이 [ ]와 ‘ ’ 두 가지(다수는 ‘ ’) | "첫 화면 ‘연결 풀기’로 정리해요" · "‘해제’한 뒤" | 작음 |
| 28 | ⑥ | `component.registered` · `component.extraSingles` · `component.reused` · `v4.linkedSkipped` · `component.extraSkipped` · `make.done.manual` · `create.sumManual` · `textStyle.registered` · `textStyle.renameSkipped` | "**컴포넌트** {total} (변형 세트 {sets} · **컴포넌트** {singles})" · "건너뜀 {m}" · "재사용 {n}:" | 숫자 뒤 단위(개 · 곳)가 빠지고, 결과 줄에 '컴포넌트'가 '전체'와 '단독' 두 뜻으로 나옴 | "컴포넌트 {total}개 만들었어요(변형 세트 {sets} · 단독 컴포넌트 {singles})" · "건너뜀 {m}곳" · "재사용 {n}개:" | 중간 (verify 1095 · 1116 · 1123 · 734 정확 문구) |
| 29 | ③ | `license.verify` · `license.clear` · `create.apply` · `textStyle.scanBtn` | 버튼 "검증" · "해제" · "적용" · "스캔" | 버튼이 명사 · 개발 말. '해제'는 무엇을 푸는지 모름 | "키 확인" · "이 기기에서 해제" (`create.apply` · `textStyle.scanBtn`은 다음 PR에서 사라짐) | 작음 |
| 30 | ③ | `make.tsNote` · `color.fileVars` · `create.fileVars` · `component.hint` · `make.semNote` · `v4.libOnly` · `make.freeBox` | 예 "이름을 더블클릭하면 고칠 수 있어요 · 스타일에 쓸 글자 크기 · 줄 높이 · 자간 변수도 함께 만들어요"(약 70자) | 480px 패널에서 2~3줄로 넘침. `v4.libOnly`는 카드 둘째 줄(11.5px · 한 줄 자리)에 들어가 잘리거나 카드 높이 56을 깸 | `make.tsNote` "더블클릭해 이름을 고쳐요 · 글자 변수도 함께 만들어요"(툴팁에 자세히) · `v4.libOnly` "라이브러리 변수만 있어요 — 연결은 피그마 오른쪽 패널에서" | 작음 (스크린샷 확인 필요) |
| 31 | ④ | `make.done.missing` · `textStyle.missingN` · `wizard.seq.textStylesMissing` | "알림 {k}개" | 무엇을 알려 주는지, 내가 뭘 해야 하는지 모름(실제는 '건너뛴 글자 · 이름 충돌' 경고, 툴팁에만 있음) | "확인할 것 {k}개 (툴팁 보기)" 또는 "건너뛴 것 {k}개" | 중간 (verify 1310 정확 문구) |
| 32 | ④ | `apply.failed` · `newVar.failed` · `newVar.dupFailed` · `del.failed` · `edit.saveFailed` · `v4.unbindFail.error` · `textStyle.renameSkip.error` | "연결하지 못했어요" · "만들지 못했어요" · "오류" | 무슨 일인지 · 다음에 뭘 할지 없음 | 뒤에 공통 꼬리 " — 다시 시도해 주세요 · 계속되면 피그마를 다시 열어 주세요", 원문 오류는 툴팁 | 작음~중간 (툴팁 원문 전달은 코드) |
| 33 | ① | `ts.lineHeight` · `textStyle.scanLhPct` · `textStyle.noteLhPx` · `textStyle.noteKeepLh` · `textStyle.noteLhPct` | "**행간**(px) · 0이면 AUTO" | 명세 §2.4 · `make.tsNote`는 "줄 높이"(피그마 한국어판도 '줄 높이') | "줄 높이(px) · 0이면 자동" | 작음 (타이포 단계는 다음 PR — `note*`는 변수 탭 이름 다시 짓기에도 남으므로 함께) |
| 34 | ② | `create.baseChanged` · `create.sumBase` | "**base** {base}px로 다시 계산 중…" · "base {base}px 환산" | 설정 화면 이름은 "기준 크기". 영어 + '환산' | "기준 크기 {base}px로 다시 계산 중…" · "기준 크기 {base}px로 바꾼 값 {n}개" | 작음 |
| 35 | ② | `color.listHint` · `colorTidy.hintTip` · `palette.lowChroma` | "Global = **hue** 이름" · "hue 패밀리" · "hue가 흔들려요 — 중립(neutral) 스케일을 권해요" | 남는 색 단계 문구에 영어 개발 말 | "Global = 색 계열 이름(blue · gray)" · "브랜드색이 너무 회색에 가까워 색 계열이 흔들려요 — 중립 색으로 쓰기를 권해요" | 작음 |
| 36 | ⑤ | `reason.empty-text` vs `apply.reason.empty-text` · `reasonHelp.empty-text` · `reason.instance-children` vs `tsSkip.instance` · `v4.findTip` · `reason.styled` vs `tsSkip.hasStyle` · `reason.no-autolayout` vs `apply.reason.not-autolayout` | "빈 **텍스트**" / "빈 **글자**" · "인스턴스 **내부**" / "인스턴스 **안쪽**" · "**오토레이아웃** 아님" / "**오토 레이아웃** 아님" | 같은 건너뜀 사유를 화면마다 다르게 | "빈 글자" · "인스턴스 안쪽" · "오토 레이아웃 아님"(피그마 표기) | 작음 |
| 37 | ⑤ | `similar.needTwo` · `similar.why.needTwo` · `similar.why.fewSame` · `similar.why.mismatch` · `similar.tooFew` | "구조가 같은 프레임이 2개 이상 있어야 해요" / "프레임이 2개 이상 필요" / "동일 구조 프레임 2개 미만" / "대상 프레임이 2개보다 적어요." | 같은 이유 4가지 표현, '동일 · 미만 · 불일치' 한자어 | `why.*` 모두 "구조가 같은 프레임이 2개 이상 있어야 해요" 한 문구로, `why.mismatch` "구조가 서로 달라요" | 작음 |
| 38 | ⑥ | `list.undo` · `bind.skipSelectBtn` | "**←** 되돌리기" · "선택 **›**" | ←는 이 제품에서 '뒤로 가기'(`v4.backHome` "← 돌아가기"), ›는 경로 구분 기호(설정 › 라이선스)인데 버튼 글자로 씀 | "되돌리기" · "레이어 선택" | 중간 (verify 293 · 295 · 337 · 341 · 722 문구 · 설명) |
| 39 | ① | `v4.fixPlaces` · `v4.fixPlacesChip` | "손볼 곳 {s}곳" | '곳'이 두 번 | "손볼 곳 {s}" 또는 "직접 손볼 {s}곳" | 중간 (verify 3곳) |
| 40 | ② | `component.fit.size` · `component.fit.photoSize` · `component.fit.self` | "크기 {w}×{h} **≠** {mw}×{mh}" · "자신" | 수학 기호 ≠ 와 뜻 모를 "자신"(진단은 결정 ⑨로 내부 말 유지지만 이 조각은 사유 자리 {causePart}에 보임) | "크기가 달라요({w}×{h}, 원본 {mw}×{mh})" · "원본 자신" | 작음 |
| 41 | ① | `make.layers` vs `v4.layerCount` · `create.rowCountTip` · `select.*` | "**Layer** {n}" vs "**레이어** {n}개" | §4.3a 결정으로 영어 "Layer"를 썼지만 같은 화면군(건너뛴 곳 · 툴팁 · 상태 줄)은 한글 "레이어 n개". §2.7 영어 규칙은 '종류 이름'에만 | "레이어 {n}" (영어는 종류 이름 Color · Spacing…과 Global · Semantic · Text Style에만) | 중간 (§4.3a 결정 · verify 1796 등 4곳) |
| 42 | ⑥ | `create.title` · `color.extractEmpty` · `rail.colorSub` · `component.fillKept` · `err.fontAction` · `license.setupHint` · `dark.hint` vs `make.tsNote` · `reasonHelp.no-autolayout` | "간격·크기" (붙임) vs "글자 크기 · 줄 높이"(띄움) | 가운뎃점 앞뒤 띄우기가 섞임 | 모두 " · " (띄움) | 작음 |

#### 표에 넣지 않은 작은 것(6건 — 요약 개수에 포함)
- 띄어쓰기: `license.manageTip` "결제수단" → "결제 수단", `similar.resKept` "남겨둔" → "남겨 둔", `semantic.formatLabel` "Global변수이름" → "Global 변수 이름"(삭제 예정 화면).
- `v4.linked` "🔗 {n}곳 연결 · ⌘Z로 되돌리기 · 건너뜀 {m}" — 되돌리기 안내가 가운데에 끼임. "🔗 {n}곳 연결 · 건너뜀 {m}곳 · ⌘Z로 되돌리기" 순서로(verify 734). 🔗 이모지는 이 문구에만 있음.
- `list.rebase` "기준 바꾸기" — '목록 기준'은 명세 말. "지금 선택으로 바꾸기"가 더 쉬움(verify는 주석만).
- `license.priceHint` "무료 · 유료 연 $39 · 기기 1대" → "유료 연 $39(기기 1대) · 무료로도 연결 · 이름 정리는 돼요".
- `edit.pickAria` "{mode} **별칭** 고르기" · `vm.tierWhyAlias` "별칭" vs `edit.goTarget` · `del.aliases` "가리키는 변수" — 화면은 "가리키는 변수"로 통일 권장.
- `err.storage` "로컬 저장소에 접근하지 못했어요" → "이 기기에 설정을 저장하지 못했어요", `err.badHex` "잘못된 hex: {value}" → "색 코드가 맞지 않아요: {value}", `reason.hug-fill` "HUG/FILL" → "자동 크기(Hug · Fill)"(`reasonHelp.hug-fill`과 맞춤).

#### 다음 PR(값을 직접 고르기 → "브랜드 팔레트")에서 함께 볼 것 — 기록만
- 사라질 단계 문구: `rail.*`("타이포" 등) · `make.more` "격자 정리 · 테마 · 타이포까지 고르려면" · `make.pick` "값을 직접 고르기 →" · `v4.subMake` · `create.*`(1× 해제 · 적용 · 미리보기) · `textStyle.*` 스캔/등록/KRDS 이름("왼쪽 글자로 이름 채우기", "KRDS 이름 {b}") · `semantic.*` 매핑 카드.
- **남는데 사라질 화면을 가리키는 문구:** `settings.gridTip` "여백 토큰을 **값을 직접 고르기 › 토큰**에서 이 격자로 모아요…" · `list.addDark` "다크 모드 만들기…" · `list.addTextStyles` "텍스트 스타일 만들기…"(＋ 메뉴 → 테마 · 타이포 단계로 이동) · `textStyle.renameClearedTable` "스캔 표를 비웠어요 — 다시 [스캔]해 주세요"(변수 탭 이름 다시 짓기 결과). 이 넷은 다음 PR에서 반드시 고쳐야 함.

---

### 3. 용어표(제안)

| 개념 | 쓴다 | 쓰지 않는다 | 근거 · 메모 |
|---|---|---|---|
| 레이어에 변수를 붙이는 일 | **연결** · 연결 풀기 | 바인딩 · 붙이기 · 붙임 · 적용 | ia-v4 §2.4 (금지어 검사에 `붙일·붙임·붙여·적용` 추가 권장) |
| 변수를 새로 만드는 일 | **만들기** · 새로 · 바뀜 | 생성 · 갱신 · 토큰 만들기 · 등록(변수 · 텍스트 스타일) | 화면 이름 "변수 만들기" |
| 컴포넌트로 바꾸는 일 | **등록**(컴포넌트로 등록) · 하나의 컴포넌트로 합치기 | 컴포넌트화 · 묶기 | PR #143 |
| 디자인 토큰 | **변수** | 토큰(화면 문구) | 피그마 용어. "토큰"은 내보내기 형식 이름(W3C 토큰 JSON)에만 |
| 선택한 레이어를 읽는 일 | **찾기**(사용자가 누름) · 읽기(자동 · 큰 선택) | 스캔 · 미리보기(연결 쪽) · 추출(색 단계 버튼 이름 "선택에서 추출"만 예외) | ia-v3 §2.9 "연결은 찾기" |
| 계층 이름 | **Global · Semantic · Component**(영어 그대로) | 시맨틱 · 역할 · 쓰임 · 원시 | ia-v4 §2.4 |
| 계층 개념 | **계층**(라벨) / 문장에서는 "Global · Semantic으로 나뉜" | 티어 · tier | 라벨 "계층 없음" 하나 |
| 종류 이름 | **Color · Spacing · Radius · Size · Stroke · Opacity · Typography · Other · Text Style** | 간격 · 반경(종류 자리에서) | ia-v4 §2.7 — 종류 자리만 영어 |
| 텍스트 스타일(문장 · 버튼) | **텍스트 스타일** | 스타일(단독) · 타이포 · 타이포그래피 | 탭 이름 "Text Style"만 영어 |
| 위치 · 개수 | 레이어 속성 자리 = **{n}곳**, 레이어 수 = **레이어 {n}개**, 그 밖 = **{n}개** | 건(件) · 숫자만(단위 없음) · Layer {n} | §2.7 · §4.3a 재검토 |
| 글자 모양 | **글꼴** · 글자 크기 · **줄 높이** · 자간 | 폰트 · 행간 · 텍스트(빈 글자) | ia-v4 §2.4 "글자 종류" |
| 변수가 쓰이는 곳 제한 | **용도** | 스코프 · scope | `vm.dScopes` |
| 다른 변수를 가리킴 | **가리키는 변수** | 별칭 · 앨리어스 | `edit.goTarget` |
| 피그마의 원본 컴포넌트 | **메인 컴포넌트** | 마스터 · 컴포넌트 원본 | 피그마 한국어판 |
| 닮은 프레임 중 고른 것 | **원본** | 마스터 | PR #143 |
| 인스턴스 안의 레이어 | **인스턴스 안쪽** | 인스턴스 내부 | 다수 |
| 제품 이름 | **피그마** | Figma(문장 속) | 다수 · verify |
| 요금제 | **무료 · 유료**(라이선스 "현재" 줄만 FREE / PAID) | Free · Paid | ia-v3 §2.9 예외 |
| 이동 · 창 | 화면 이동 **→**, 밖 링크 **↗**, 창(팝업)이 열림 **…** | ›(버튼 글자) · ←(되돌리기) | §2.4 |
| 되돌리기 | **⌘Z / Ctrl+Z로 되돌리기**(기기별) | ⌘Z만 | Windows 사용자 |

문장 규칙(같이 명세 §2.4에 적기 권장)
1. 해요체. 한 줄 안에서 "~음/~됨"과 섞지 않는다(라벨 · 숫자 · 진단 조각은 예외).
2. 오류 · 잠금 뒤 요청은 "~해 주세요", 빈 상태 · 정적 안내는 "~하세요".
3. 상태 줄 · 잠금 사유 · 한 문장은 마침표 없음. 두 문장은 " — "로 잇는다. 툴팁이 여러 문장이면 모든 문장에 마침표.
4. 버튼은 동사(무엇을 하는지). 버튼을 문장에서 가리킬 때는 ‘버튼 이름’.
5. 따옴표는 ‘ ’ 하나, 구분은 " · "(앞뒤 띄움), 숫자 뒤에는 단위.
6. 변수 이름 뒤에 조사를 바로 붙이지 않는다(문장 구조를 바꾸거나 (을)를).

---

### 4. 권장 PR 범위

#### PR A — "UX 라이팅 1차"(문구만, 명세 §2.4 보강 + i18n.ts) — 위험 낮음
verify · 테스트의 정확 문구를 거의 건드리지 않는 것만:
- #1 토큰 만들기 → 변수 만들기(남는 키만: `op.create` · `err.scopeAction` · `export.empty`)
- #6 · #7 · #36 글꼴 · 빈 글자 · 인스턴스 안쪽 · 오토 레이아웃 통일(verify 영향 없음 — `오토 레이아웃`은 verify가 이미 띄어 씀)
- #8 `common.applyingVars` · #9 시맨틱/쓰임(남는 색 단계 2키 + `wizard.seq.darkNothing`)
- #10 Figma → 피그마(2키), #14 계층 배지 툴팁 문장화, #15 네트워크, #16 스코프 → 용도, #17 발행 → 게시
- #19 끝 마침표 정리(verify가 보는 문구 없음 — 보내기 전에 grep 한 번), #20 혼용 문장, #24 `palette.summary`
- #25 무료 안내, #27 [ ] → ‘ ’(verify 없음), #29 라이선스 버튼, #30 긴 안내 줄이기(스크린샷 확인), #32 실패 꼬리, #34 base, #35 hue, #37 닮은 프레임 이유, #40 ≠, #42 가운뎃점, 표 밖 작은 것(띄어쓰기 · err.storage · err.badHex · HUG/FILL)
- 테스트 강화(같은 PR): `terms.test.mjs` 금지어에 `붙일|붙임|붙여|시맨틱|스코프|발행` 추가 → #2 · #9를 PR A에 넣는다면 함께. 지금 `붙일 · 붙임`은 `apply.none`(verify 202) · `textStyle.linkedN` 등에 있으므로 #2와 한 묶음.

#### PR B — "UX 라이팅 2차"(명세 결정 + verify 정확 문구 수정 필요)
| 항목 | 깨지는 검사 |
|---|---|
| #2 붙이기 → 연결 · #3 조사 | `verify-bind-flow.mjs` 202("선택한 레이어에 radius/4을 붙일 곳이 없어요"), 1302 · 1310(글꼴 알림 문구 일부) |
| #4 · #5 텍스트 스타일 만들기 | verify 1266("켠 스타일만 등록해요"), 1271("Global 1개 · Semantic 1개 · 스타일 1개") |
| #11 ⌘Z → 기기별 | verify 193 · 734 · 1399 · 1461 (+ 코드에서 플랫폼 판별) |
| #12 마스터 → 메인 컴포넌트 | ia-v4 §4.3a "registerHelp 그대로" 결정 수정, verify 1163은 '마스터 없음' 검사라 통과 |
| #13 계층 문구 | verify 938(설명 글), ia-v4 용어 |
| #18 "~하세요/~해 주세요" 규칙 | verify 200 · 871 · 1769 · 1882는 이미 "주세요"라 그대로, 바뀌는 쪽은 verify 없음 — 명세 규칙 추가가 핵심 |
| #21 "…" · "→" 규칙 | ia-v4 §4.6 ＋ 메뉴 와이어, verify 246 · 1410 |
| #22 선택 없음 통일 | verify 186 · 312 · 505 · 507 · 509 |
| #23 팔레트 생성/만들기 | §4.3a 결정, verify 1769 · 1800 · 1807 — **다음 "브랜드 팔레트" PR에 합치기 권장** |
| #26 따옴표 ‘ ’ | verify 232 · 271 · 867 · 1302 · 1310 |
| #28 단위 · 컴포넌트 결과 줄 | verify 734 · 1095 · 1116 · 1123 |
| #31 알림 n개 | verify 1310 |
| #38 ← 되돌리기 · 선택 › | verify 293 · 295 · 337 · 341 · 722 |
| #39 손볼 곳 n곳 | verify 3곳 |
| #41 Layer {n} | §4.3a 결정, verify 1796 외 3곳 |

`test/*.mjs`는 문구를 거의 직접 비교하지 않는다 — 걸리는 것은 `figma.test.mjs`의 부분 문자열 `부분 서식`(3367) · `이름 충돌`(3534) · `원본이 달라`(3708 · 3969) · `연결 안 함`(3833) · `자간 변수 연결을 지켰어요`(3939)뿐이라, #33(행간 → 줄 높이)은 `행간`만 바꾸면 통과한다. `tree.test.mjs`의 "역할" 금지 검사는 영향 없음.

#### 다음 "브랜드 팔레트" PR로 미룰 것
#23 팔레트 버튼 이름, `settings.gridTip` · `list.addDark` · `list.addTextStyles` · `textStyle.renameClearedTable`의 목적지 문구, 값을 직접 고르기 단계 문구 전부(#8 `create.*`, #24 대부분, #29 `create.apply` · `textStyle.scanBtn`, #33 `ts.lineHeight`).

CLAUDE.md 순서대로라면 PR A · B 모두 먼저 ia-v4 §2.4(용어 · 문장 규칙)에 위 용어표와 문장 규칙을 적고 검토를 돌린 뒤 i18n을 고치는 흐름이 된다.
