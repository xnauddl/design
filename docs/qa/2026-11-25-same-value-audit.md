# "같은 값" 조사 — 화면마다 숫자를 어떻게 세는가 (2026-11-25)

> 목적: S-2("같은 값" 판정을 함수 하나로 — `docs/invariants.md` §2 · §3) 명세를 쓰기 전에 지금 코드가 세는 법을 적는다. 코드는 고치지 않았다.
> 기준 커밋: 조사는 `7612d2d`(main — #181 병합 뒤, S-1b 삭제 포함)에서 했고, 파일:줄은 `7231e75`(#178 병합 뒤 — `variables.ts` · `ui.ts` · `code.ts`가 밀림)로 다시 맞췄다. `bind.ts` · `selCards.ts` · `extract.ts` · `colorName.ts` · `i18n.ts`는 그대로다.
> 표기: **[확인]** = 코드나 실행으로 본 것(파일:줄), **[추측]** = 근거가 간접적인 것.
> 실행 근거: `src/lib`를 저장소 밖에 번들하고 `test/figma.test.mjs` 76–219의 `installFigma` 목으로 예 셋을 돌렸다(5장).
> 맨 끝 "정할 것" 1–10은 2026-11-25 사용자 결정 **SC-D31**(`docs/qa/2026-11-24-scope-review.md`)로 모두 확정됐고, 명세를 쓰며 더 드러난 9가지는 **SC-D32**로 확정됐다(직접 만든 변수는 건드리지 않음 · 후보 없는 글자 자리는 표시하지 않음 등 — ia-v4 B.39 표). 명세는 `docs/ia-v4.md` §2.9 · B.39.

먼저 알릴 것 넷:
- **7-5는 이미 #172(B.33)로 구현돼 있다.** 다만 그때 규칙은 "유료는 숫자만 맞춤(u) · 무료만 붙이고 용도 더함"이라 `docs/invariants.md` §2와 다르다.
- **"세 화면 점검 보고서 12건" 원문은 저장소에 없다.** ROADMAP §0 7-8 줄의 요약과 ia-v4 B.35 머리말뿐이라, 4장의 항목 5 · 10 · 12는 제목만 보고 판정했다.
- **SC-D7(줄마다 [＋ 만들기] 뺌) · SC-D8("Layer {n}" → "{n}곳")은 아직 코드에 없다**(`ui.ts` 7747 · `i18n.ts` 446).
- **추출은 스타일이 붙은 칠 · 선 · 효과를 "빈 자리"로 센다**(`extract.ts`에 `…StyleId` 검사가 없다 — `collectPaints` 143–172의 `free`). 연결 찾기는 그 자리를 `styled`로 건너뛴다(`bind.ts` 1139). 만들기 줄의 자리 수(`freeBy`)와 연결의 자리 수가 여기서 갈린다.

## 1. "같은 값" 판정 — 서로 다른 술어 8개 + 묶음 키 1개

값 비교식 자체는 세 벌이 같은 결과를 낸다(숫자 소수 둘째 자리 · 색 `colorKey` · 글꼴 문자열 일치). 갈리는 것은 어느 변수를 보는가, 별칭을 따라가는가, 용도 · 이름 · 계층을 보는가다.

| # | 함수 (파일:줄) | 비교 대상 | 값 | 용도 | 계층 | 이름 | 모드 | 쓰는 숫자 |
|---|---|---|---|---|---|---|---|---|
| P1 | `sameValueEntries` + `scopeOk` (`bind.ts` 846 · 768), 색인 `buildIndex` 662–712 | 자리 ↔ 로컬 변수 | 별칭을 따라간 값(`resolveValue` 742) | 자리 `allowed` 중 하나 또는 `ALL_SCOPES` | 계층 0 컬렉션은 색인에서 통째로 빠짐(681) | — | 컬렉션마다 기본 모드 | 카드 m · k · u · s · n, 연결 화면 줄 · 버튼, 만들기 실행의 "n곳 연결" |
| P1′ | `ownedSame` (`bind.ts` 960–963) | 색 자리 ↔ 플러그인 Global | 같은 `colorKey` · 직접 값만 | **안 봄**(`anyScope`) | 계층 1 · `!user` | — | 기본 | 카드 u(유료), 무료 m(`scopeAdd`) |
| P2 | `bindSelectedItems` 다시 확인 (`bind.ts` 1562 · 1646 · `textValueEqual` 1728) | 레이어 지금 값 ↔ 붙일 변수 | 별칭 따라간 값 | 색만 다시 확인(숫자 · 글자는 용도 안 봄) | — | — | 기본 | 연결 결과 `bound` · 사유 `changed` |
| P3 | `onlyMatch` (`bind.ts` 537) | 자리 ↔ 만들기에서 켠 줄 | 값(알약은 9999) | 묶음 키 `allowed.join('\|')` 완전 일치 | — | — | — | 만들기 실행 "n곳 연결" · `make-off` |
| P4 | `pickReusable` + `sameLiteral` (`variables.ts` 111 · 97) | 토큰 ↔ **사용자** Global | **직접 값만** | 토큰 출처 용도 중 하나 | 계층 1 · 플러그인 아님 | — (컬렉션 순 → 이름 순 첫째) | 기본 | 만들기 줄 태그 "있는 변수", g |
| P5 | `resolveGlobalNames` (`colorName.ts` 240, 입력 `fileGlobalsOf` `variables.ts` 177) | 토큰 ↔ **플러그인** Global | 직접 값 키 | **안 봄**(실행 때 합침 `variables.ts` 271) | 플러그인 Global만 | **같은 이름**(색은 같은 계열의 추출 전용 이름도) | 기본 | g, 태그 "있는 변수(· 용도 더함)" |
| P5′ | 쓰임 없는 토큰(글자 등) (`variables.ts` 397 · 300–306) | 토큰 ↔ 플러그인 Global | **안 봄** — 이름만, 값은 덮어씀 | — | — | 같은 이름 | 기본 | g에 `updated`로 들어감, 태그 "있음" |
| P6 | 직접 만든 변수 (`variables.ts` 290 · 386) | 토큰 ↔ `dsl.manual` 변수 | `sameLiteral` | — | 플러그인 Global | 같은 이름 | 기본 | 태그 "직접 만든 변수", "건너뜀 m" |
| P7 | `createUsageRoles`의 `canReuse` (`variables.ts` 446), `createRole` (`bind.ts` 1697–1710) | 쓰임 역할 ↔ Semantic | 별칭 따라간 값 키 / 같은 Global을 가리킴 | 필요한 용도를 **모두** 덮음(P1은 하나만) | 계층 2 전부 | 이름(쓰임 이름 + 꼬리) | `createRole`만 모든 모드 | r(Semantic 탭 수 · 만들 수), 연결 줄 "N" 배지 |
| P8 | `libValueSame` + `libScopeOk` (`selCards.ts` 158 · 170) | 토큰 ↔ 라이브러리 변수 | 직접 값만 | 묶음 키 중 하나 | — | — | 받은 값 | 상태 5 제목 n · "같은 값 L곳", 만들기 줄 기본 끔, `only`의 묶음 |
| K | `keyOf` (`extract.ts` 60) + `mergeSameNameTokens` (`treeState.ts` 29) | 자리 → 값 묶음 | 종류 · 값 · 단위 · 투명도 | — | — | 합친 뒤 이름 | — | 만들기 Global 탭 수 · 줄 "Layer n" |

범위 밖(변수 "같은 값"이 아님): `sameAsMain`(`bind.ts` 468 — 인스턴스 ↔ 메인), `typoKey`(`variables.ts` 1657 — 텍스트 스타일).

어긋남의 핵심 **[확인]**:
- **P1 ↔ P5:** 연결은 용도를 보고 이름은 안 본다. 만들기는 이름을 보고 용도는 안 본다. 7-5와 7-13의 11번(이름 바뀐 플러그인 Global 재사용)이 같은 뿌리다.
- **P1 ↔ P4:** 연결은 별칭을 따라가고, 만들기 재사용은 직접 값 사용자 Global만 본다.
- **P1 ↔ P7:** 같은 값의 사용자 별칭 변수가 있어도 만들기는 이름이 다르면 Semantic을 새로 만든다고 센다(5장 예 다).
- **K ↔ P1:** 추출의 빈 자리는 스타일이 붙은 칠을 넣고, 연결의 자리는 뺀다(위 "먼저 알릴 것").

## 2. 화면 숫자 표

| 화면 | 숫자 · 문구 | 단위 | 계산 (파일:줄) | 이미 붙은 자리 |
|---|---|---|---|---|
| 카드 1 제목 | "변수 없는 값 {n}곳" | 자리 | n = m + k + u — `cardCounts` `selCards.ts` 105–125, 텍스트 스타일 보정 `countBindCards` `ui.ts` 3502–3524, 그림 `renderFindCard` 7934–8005 | 뺌(`already-bound`는 `note`만, `bind.ts` 1150 · 1383) |
| 카드 1 둘째 줄 | "Color {x} · Spacing {y}…" | 자리 | m의 종류별 `byKind` (`ui.ts` 7979) | 뺌 |
| 〃 | "새로 만들 값 {k}곳" | **자리**(문구는 "값") | 사유 `no-match` 합 (`selCards.ts` 111) | 뺌 |
| 〃 | "용도 맞출 값 {u}곳" | 자리 | 사유 `scope-add` (`selCards.ts` 119, 원천 `bind.ts` 976) | 뺌 |
| 〃 | "손볼 곳 {s}곳" | 자리 | `fraction` · `size-fraction` · `deleted-var` (`selCards.ts` 121) | 삭제된 변수 자리는 넣음 |
| 카드 1 버튼 | [{m}곳 연결] | 자리(+스타일 레이어 t) | m > 0일 때만(`ui.ts` 7993). m = 0 · k + u > 0이면 버튼 없이 할 일 [변수 만들기]가 주 버튼(7997) | 뺌 |
| 카드 2 | "쓰는 변수 {n}개 · Semantic a · Global b" | **변수** | `renderUsesCard` `ui.ts` 8007–8026(계층은 컬렉션 판정) | 붙은 것만 |
| 만들기 카드(상태 6) 줄 | "Layer {n}" | **레이어** | 토큰 `count` (`extract.ts` 99–100), 줄 최대 4개 `mcRows` `ui.ts` 7626 | **넣음** |
| 〃 유료 버튼 | [Global {g} · Semantic {r} 만들기 →] | 변수 | `mcG` = created + updated, `mcR` = roles (`ui.ts` 7585–7586 · 7765) | 값 단위라 구분 없음 |
| 〃 무료 버튼 | [Global {g}개 모두 만들기], 줄마다 [＋ 만들기] | 변수 | 상태 `new` 토큰 수 (`ui.ts` 7471 · 7713 · 7747 · 7773) | 〃 |
| 〃 무료 만든 뒤 | "Global 변수 {c}개를 만들었어요" · [{o}곳 연결 →] | 변수 / 자리 | c `mcMadeCount` 7469, o = 다시 찾은 m (7783) | o는 뺌 |
| 만들기 카드(상태 5) | "변수가 안 붙은 값 {n}곳" · "라이브러리에 같은 값 {k}곳" | 자리 | `libSameSplit` `selCards.ts` 221 (`freeBy`) | 뺌(스타일 붙은 칠은 넣음) |
| 연결 화면 머리 | "{이름} · 변수 없는 값 {n}곳" | 자리 | 카드와 같은 n (`bindHeadTail` `ui.ts` 4692) | 뺌 |
| 연결 종류 머리 · 줄 | "{n}곳" | 자리 | `groupByVarKind` `bindGroups.ts` 155 (`ui.ts` 3715 · 3736) | 뺌 |
| 연결 버튼 | [{n}곳 연결] | 자리 + 켠 스타일 레이어 | `bindOnCount` `ui.ts` 3482 · 3833 | 뺌 |
| 만들기 탭 Global | {N} | **값(줄)** | `mkTokens.length` — 끈 줄 · 있는 변수 · 글자 · 다 붙은 값 모두 (`ui.ts` 2939) | **넣음** |
| 만들기 탭 Semantic | {r} | 변수 | `mkRoleRows.length` (2940) | — |
| 만들기 탭 Text Style | {t} | 스타일 후보 | `mkTs.length` (2941) | — |
| 만들기 종류 머리 | "{n}개" | 값(줄) | `list.length` (2873) | 넣음 |
| 만들기 줄 | "Layer {n}" | 레이어 | 토큰 `count` (2832 · 2862) | **넣음** |
| 만들 수 | "Global {g}개 · Semantic {r}개 (· 스타일 {t}개)" | 변수 | 켠 줄만 보낸 미리보기의 created + updated · roles (`ui.ts` 2796 · 3184, `variables.ts` 325–401) | — |
| 만들기 버튼 | [변수 {g}개 만들기] | 변수 — **Global만** | `ui.ts` 3187. g = 0이어도 "변수 0개 만들기" | — |
| 결과 문장 | "Global {g}개 · Semantic {r}개 · {n}곳 연결 · Text Style {t}곳" | 변수 / 자리 | `makeDoneText` `wizard.ts` 64–79, n = `APPLY{only}`의 `bound` (`ui.ts` 3271–3276) | n은 뺌 |

**[확인] 불일치:** 카드는 안 붙은 **자리**를, 만들기는 **값 줄**(탭) · **레이어**(줄, 붙은 곳 포함) · **변수**(만들 수)를 센다. 같은 자리가 카드 m과 만들기 줄 "Layer n"에 함께 들어간다 — "한 자리는 한쪽에만"이 지금은 성립하지 않는다.

## 3. 후보가 여럿일 때 지금 고르는 순서 · `tiers.ts`가 쓰이는 곳

**지금 순서 [확인] (`resolveSlots` `bind.ts` 886–1011)** — 전제는 P1(값 · 용도가 맞고 계층 1–3 컬렉션):
1. **Component 계층(3) 먼저** — `cands.find(tier === 3)` (868). 색인을 계층 내림차순으로만 정렬하므로(710) 같은 계층 안에서는 Figma 변수 목록 순서, 곧 **먼저 찾은 것**이다(이름 순 아님).
2. **디자이너 Semantic(계층 2)** — 플러그인 표시 · 거울 · 옛 이름을 뺀 것 가운데 이름 오름차순, 같으면 사용자 컬렉션 먼저 → 컬렉션 순 (871 · `byName` 856).
3. **쓰임 이름 가족의 Semantic** — 자리 쓰임 이름(`spacing/gap` · `color/background/…`)과 맞는 이름, 가족 순서 (861 · 918 · 949). 글자는 같은 그룹 접두사 이름 순(917).
4. **새 Semantic 역할** — 가리킬 Global은 계층 1 · 직접 값, 사용자 컬렉션 먼저 → 이름 순 (`globalFor` 896–899). 무료는 그 Global에 바로 붙임(984).
5. 4의 Global이 없고 용도만 다른 플러그인 Global이 있으면 유료 `scope-add`(u), 무료는 붙이고 용도 더함(960–981 — 색 자리만. 직접 만든 변수 `dsl.manual`은 무료도 붙이지 않고 u로 남긴다, 970).

"별칭 먼저"는 변수 단위가 아니라 **컬렉션 계층**으로만 구현돼 있다. 계층 1 컬렉션 안의 별칭 변수는 고르지 않고(`direct` 898), 홉 수는 계산하지 않는다(`resolveValue`가 세지 않음).

**`collectionTiers` · `collectionTierInfo`를 쓰는 곳 전부 [확인]:**

| 곳 | 무엇에 | S-2와의 관계 |
|---|---|---|
| `bind.ts` 666–711 `buildIndex` | 후보 색인(계층 0 제외) · 거울 · auto 표시 | **후보 고르기 — 대상** |
| `bind.ts` 868 · 871 · 898 · 917–918 · 943 · 949 · 962 | 위 순서 1–5 | **대상** |
| `bind.ts` 1691–1705 `createRole` | 새 역할 이름 차지 · 같은 역할 찾기(계층 2 전부) | 이름 규칙 — 그대로 둠 |
| `variables.ts` 117–122 `pickReusable` | 재사용할 사용자 Global(계층 1) | **대상**(만들기 재사용) |
| `variables.ts` 415 · 438 · 445 `createUsageRoles` | Semantic 이름 차지 · 거울 | 영향(r) |
| `variables.ts` 604–610 `createSemanticAliases` | 역할 매핑 표(값을 직접 고르기) | 범위 밖(SC-D2) |
| `variables.ts` 959–963 · 1012–1037 | 텍스트 스타일 글꼴 변수 · 글자 역할 이름 | 범위 밖 |
| `code.ts` 188–191 `postPrereq` | `hasGlobal` · `hasBindable` — **noTier 모습**("계층으로 쓸 컬렉션이 없어요") | 동작에 쓰임 — SC-D31 ②로 바뀜 |
| `code.ts` 247 · 425–430 | 변수 탭 배지 · 카드 2 계층별 수 | 표시만 — 그대로 |
| `code.ts` 976–1002, `exporters.ts` 419–535 | 내보내기에서 Global · Semantic 가르기 | 그대로(SC-D31 ⑧) |
| `varTable.ts` 98–112 · 501–513 | 배지 · 툴팁 · 별칭 대상 고르개 | 표시 / S-4 |

## 4. 7-5 · 7-7 · 7-8 · 7-12 — 고쳐진 것과 남은 것

| 항목 | 상태 | 근거 |
|---|---|---|
| 7-5 용도 어긋남(카드 65 ↔ 만들기 0개) | **고쳐짐 #172** — 단 옛 규칙 | `scope-add` `bind.ts` 960–981 · `selCards.ts` 34. 유료는 붙이지 않고 u로만 셈(테스트 B.33 ① `figma.test.mjs` 8806) |
| 7-5 문구 `make.top` | 고쳐짐 | `i18n.ts` 397 |
| 7-5 "g = 0일 때 [변수 0개 만들기]" | **남음** | `ui.ts` 3187 |
| 7-8 A-2 끈 줄도 연결됨 | 고쳐짐 #173 | `only` `bind.ts` 607–618 · `ui.ts` 3267 |
| 7-8 A-3 라이브러리 같은 값 | 고쳐짐 #173 | `onlyItems` `selCards.ts` 205 |
| 7-8 A-6 다 붙은 값도 새로 만듦 | **기본 끔으로만** 고쳐짐 | `mkRecalcOffByLib` `ui.ts` 2692. 사용자가 켜면 만든다 |
| 7-8 A-4 기존 텍스트 스타일 | 고쳐짐 #173 | `ui.ts` 3278–3292 |
| #176(B.36) 끈 값만 남은 0곳 문구 | 고쳐짐 · 실기 확인만 남음 | `make-off` `bind.ts` 617, ia-v4 B.36 마지막 체크 |
| 7-7 ① 큰 선택 [읽기] 뒤 멈춤 | 고친 흔적 **[추측]** — 재현 안 해 봄 | `mcDeferUserFor` `ui.ts` 7426–7428 · 7486 |

**남은 것(S-2 대상):**
1. **7-7 카드 버튼 하나로** — k + u > 0이어도 m > 0이면 [{m}곳 연결]이 주 버튼(`ui.ts` 7993–7997).
2. **7-5의 새 규칙** — 유료도 플러그인 Global이면 후보로 보고 연결할 때 용도 더함. u("용도 맞출 값")가 없어진다.
3. **7-12-7** g = 0 버튼 "변수 0개 만들기"(`ui.ts` 3187).
4. **7-12-8 · 7-7 ⑤** 탭 수(모든 줄) · 만들 수(Global g · Semantic r) · 버튼(g만) 세 숫자가 서로 다름(`ui.ts` 2939 · 3184 · 3187).
5. **7-12-9** "곳" ↔ "Layer"(`i18n.ts` 446 · SC-D8).
6. **7-12-12 제목 [추측]** — "변수 없는 값 n곳"의 n에 변수가 **있는** 자리 m이 들어간다(`ui.ts` 8002).
7. **7-12-5 글자만 있을 때 [추측]** — 카드 k는 글자 자리 `no-match`도 세는데 만들기는 글자 줄이 기본 끔(`mkOnDefault` `ui.ts` 2679)이라, 들어가면 버튼이 "만들 값을 켜 주세요"로 잠긴다.
8. **새로 찾은 것:** 값은 같은데 이름이 다른 사용자 별칭 변수가 있어도 만들기가 "Semantic 1개"를 세고 실제로 만든다 — 아무도 안 쓰는 역할이 남는다(5장 예 다-2).
9. **7-13-11**(이름 바뀐 플러그인 Global 재사용) — S-5로 분류돼 있지만 원인이 P5의 이름 조건이라 함수를 합치면 함께 풀린다.

S-2 밖: 7-7 ② 만든 뒤 문장(→ 리디자인 SC-D6) · ③ 잠긴 링크 모양 · ④ `#` 칸(→ 9-1) · ⑥ 글자 빠짐 안내(→ 7-3) · 7-13-10.

## 5. 예 셋 — 지금과 뒤

조건: 채움은 오토레이아웃 없는 FRAME의 SOLID 칠, 사용자 변수 용도는 `ALL_SCOPES`. "지금"은 실행한 값, "뒤"는 SC-D31을 적용한 예상이다(정확한 문구는 ia-v4 §2.9 "예").

### (가) 로컬 변수 0개 · `#111111` 3곳 · `#FFFFFF` 2곳

| 화면 | 지금 | 뒤 |
|---|---|---|
| 첫 화면 | 상태 6 만들기 카드(카드 1 없음). 줄 "Layer 3" · "Layer 2". 유료 [Global 2 · Semantic 2 만들기 →], 무료 [Global 2개 모두 만들기] + 줄마다 [＋ 만들기] | 만들 값 **2개** · 연결 **0곳** → 주 버튼 "만들고 연결" |
| 찾기(참고) | m 0 · k 5 · n 5(`no-match` 5) — 화면에는 안 보임(noTier) | 5곳은 만들기 쪽에만 |
| 만들기 화면 | 탭 Global 2 · Semantic 2, "Global 2개 · Semantic 2개", [변수 2개 만들기] | [2개 만들고 5곳 연결] |
| 결과 | 유료 "Global 2개 · Semantic 2개 · 5곳 연결", 무료 "Global 2개 · 5곳 연결" | 같음 |

### (나) 플러그인 Global `#111111`(선 색만) · 채움 3곳 — 7-5 재현

| 화면 | 지금 유료 | 지금 무료 | 뒤 |
|---|---|---|---|
| 카드 1 | "변수 없는 값 3곳" · "용도 맞출 값 3곳" · **버튼 없음**([변수 만들기]가 주 버튼) | "변수 없는 값 3곳 · Color 3" · [3곳 연결] | 만들 값 **0개** · 연결 **3곳** → [3곳 연결]. "용도 맞출 값" 없음 |
| 연결 화면 | 후보 0 — "연결할 수 있는 값이 없어요 · [변수 만들기 →]" | Color 3곳 → `color/gray/950` | 3곳. 유료는 새 Semantic `color/background/default`(N 배지), 무료는 Global 직접 |
| 만들기 화면 | Global 1 · Semantic 1, 줄 "Layer 3 [있는 변수 · 용도 더함]", "Global 0개 · Semantic 1개", **[변수 0개 만들기]** | "Global 0개", [변수 0개 만들기] | 줄 "3곳 [있는 변수]", [3곳 연결] |
| 결과 | "Global 0개 · Semantic 1개 · 3곳 연결", Global 용도에 `ALL_FILLS` 더해짐 | 연결 때 `ALL_FILLS` 더해짐 | 3곳 연결 + 용도 더함 |

### (다) 사용자 컬렉션에 원시 `ink/900` + 별칭 `surface/strong` · 채움 2곳

컬렉션 배치에 따라 지금 결과가 갈린다.

| | 지금 유료 | 지금 무료 | 뒤 |
|---|---|---|---|
| **다-1 같은 컬렉션**(같은 컬렉션 안 별칭은 판정에서 빠져 계층 1) | m 2 → **새 Semantic** `color/background/default` → `ink/900`(N 배지). 별칭 `surface/strong`은 안 고름 | m 2 → **원시 `ink/900`에 직접** | m 2 → **`surface/strong`**. 새 Semantic 없음 · 용도 더함 없음 |
| **다-2 다른 컬렉션**(별칭 쪽이 계층 2) | m 2 → `surface/strong` | m 2 → `surface/strong` | 같음 |
| 카드(둘 다) | "변수 없는 값 2곳 · Color 2" · [2곳 연결] | 같음 | "연결할 곳 2곳" · [2곳 연결] |
| 만들기 화면(둘 다) | Global 1 · **Semantic 1**, 줄 "Layer 2 → ink/900 [있는 변수]", "Global 0개 · Semantic 1개", [변수 0개 만들기] | "Global 0개" | Semantic 0 · [2곳 연결] |
| 만들기 실행 | **다-2: 플러그인 Semantic `color/background/default`를 만들지만 레이어는 `surface/strong`에 붙는다 — 안 쓰는 역할 1개가 남음** | — | 만들지 않음 |

## 6. 통합 함수 제안 — 가장 작은 변경

**둘 곳:** 새 순수 모듈 `src/lib/sameValue.ts`(figma 의존 없음 — `selCards.ts` · `tiers.ts`와 같은 급). 테스트는 `pure.test.mjs`.

**기준으로 삼을 것:** `bind.ts`의 `sameValueEntries` + `scopeOk` + `sameNumber` + `VarEntry`(43–67 · 73–76 · 768 · 846). 별칭을 따라간 값으로 비교하고 `colorKey` · 소수 둘째 자리 · 문자열 일치를 이미 갖췄다. `sameLiteral`(P4)과 `libValueSame`(P8)은 수식이 같아 그대로 대체된다.

**모양(안 — 확정은 ia-v4 B.39):**
- `valueKeyOf(kind, value, alpha)` — 값 키 하나.
- `pickCandidate(place, vars)` → `{ variable, scopeAdd? } | null`. `place` = 값 키 · 타입 · 허용 용도. `vars` = 변수 요약(id · 이름 · 값 키 · 용도 · 별칭 여부 · **홉 수** · 플러그인 Global인가 · 직접 만든 변수인가).
- `splitPlaces(places, vars)` → `{ link: 자리[], make: 값[] }` — "연결 m곳 · 새로 만들 값 n개 · 한 자리는 한쪽에만"을 한 곳에서 낸다.

**바꿀 호출부:**

| 파일 | 곳 | 바꿈 |
|---|---|---|
| `bind.ts` | `buildIndex` 662–712 | `VarEntry`에 홉 수 · 플러그인 Global 여부. 계층 0 제외(681)를 없앰 |
| `bind.ts` | `resolveSlots` 886–1011 (`pickDesigned` 867 · `globalFor` 896 · `ownedSame` 960) | `pickCandidate`로. 유료 `scope-add` 건너뜀 → 후보 + `scopeAdd` |
| `bind.ts` | `onlyMatch` 537 · 다시 확인 1562 · 1646 · `textValueEqual` 1728 | 값 비교를 같은 함수로(동작 변화 없음) |
| `variables.ts` | `pickReusable` 111 · `sameLiteral` 97 · `previewCreateTokens` 325–401의 `reuse` 판정 | 같은 함수로 — 플러그인 Global 재사용이 이름 조건에서 값 조건으로 바뀜(7-13-11 함께 해결). 새 이름 짓기(`resolveGlobalNames`의 반 단계 · `-n`)는 그대로 |
| `variables.ts` | `createUsageRoles` 410–529 | 같은 값 · 용도 맞는 별칭이 있으면 r에 세지 않음(5장 다-2의 안 쓰는 역할) |
| `extract.ts` | `collectPaints` 143 · `collectEffects` 447 | 스타일이 붙은 칠 · 선 · 효과는 빈 자리로 세지 않음(연결과 같은 자리) |
| `selCards.ts` | `libValueSame` 158 · `cardCounts` 105 | 값 비교 공유, u 제거, "만들 값" 값 단위 수 추가 |
| `ui.ts` | `countBindCards` 3502 · `renderFindCard` 7934–8005 · `bindHeadTail` 4692 · `renderBindEmpty` 3645 · `bindZero` 3665 | 제목 · 둘째 줄 · 버튼 |
| `ui.ts` | `renderMakeFoot` 3179–3190 · `renderMakeTabs` 2939 · `runMake` 3299–3300 · 만들기 카드 7713 · 7765 · 7773 | g = 0 버튼 · 숫자 맞춤 |
| `shared/messages.ts` · `code.ts` 589–649 | `APPLY_RESULT`에 값 단위 "만들 값" 목록(지금은 자리 단위 `counts`뿐) | 필드 추가 |
| `i18n.ts` + `ui.html` 인라인 글 | 새 · 바뀌는 키 | `verify:i18n` 드리프트 |

**깨질 테스트 · verify 어림 [추측]:**
- `test/figma.test.mjs`(369개) 8–15개 — B.33 ① · ②′(유료 `scope-add` → 후보, 8806 · 8825), "보는 순서 1 → 3 → 2 → 4"(5504), Component 우선(931 · 963), "별칭 대상은 사용자 Global 먼저"(4225), 사용자 Global 재사용(4164부터 2개), 옛 단계 이름(5739), A.14(7013), "별칭뿐인 0 여백"(4951), 거울보다 역할 먼저(1634). `designerRole` 도우미를 쓰는 12곳은 다시 확인.
- `test/pure.test.mjs`(169개) 2–4개 — `cardCounts`의 u · n. `judgeUserTier` 13곳은 배지용으로 `tiers.ts`를 남기면 그대로.
- `test/wizard.test.mjs` — `makeDoneText` 문구를 바꾸면 그만큼.
- `scripts/verify-bind-flow.mjs`(4,170줄) 6–10 블록 — "용도 맞출 값"(5곳) · "새로 만들 값"(7곳) · 카드 1 [n곳 연결] 주 버튼 · "개 만들기"(13곳) · "Layer "(9곳).

## 정할 것 1–10 — SC-D31로 확정(2026-11-25)

| # | 물음 | 정한 것 |
|---|---|---|
| 1 | 계층 0(섞인) 컬렉션의 변수도 후보인가 | A — 로컬 변수 전부(용도가 맞으면) |
| 2 | "별칭 → 홉 → 이름"과 쓰임 이름 맞추기의 앞뒤 | A — 사용자 변수는 별칭 → 홉 → 이름순, 플러그인이 만든 역할끼리만 쓰임 이름 가족 먼저. Component 우선 · 디자이너 것 우선은 없앰 |
| 3 | 유료에서 별칭 후보가 없고 Global만 있을 때 | A — 연결하면서 새 Semantic, 수는 연결 줄 배지로만 |
| 4 | "새로 만들 값"에 글자 값을 넣는가 | A — 넣지 않음 |
| 5 | 버튼 숫자 | B — [{n}개 만들고 {곳}곳 연결], 만들 값 0이면 [{m}곳 연결]. 만들기 화면 [변수 0개 만들기] → [{m}곳 연결] |
| 6 | 카드 제목 | A — "연결할 곳 {m}곳 · 새로 만들 값 {n}개" |
| 7 | "용도 맞출 값" · "있는 변수 · 용도 더함" | A — 지움 |
| 8 | 플러그인 Global 재사용을 이름에서 값으로 | A — 값으로(7-13-11 함께) |
| 9 | SC-D8 · SC-D7 | A — SC-D8("Layer n" → "n곳")만 이번에, SC-D7은 리디자인으로 |
| 10 | 내보내기 · 변수 탭 배지의 계층 판정 | 그대로 |
