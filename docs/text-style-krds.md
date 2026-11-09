# 텍스트 스타일 이름 — KRDS 규칙 (2026-11-09 사용자 확정)

> 대상: 값을 직접 고르기 › 타이포(텍스트 스타일 스캔 · 등록 · 기본 램프)와 새 기능 [이름 다시 짓기]. v3 마법사의 텍스트 스타일 단계는 같은 이름 함수를 쓰므로 함께 바뀐다(이 단계는 IA v4 B.4에서 마법사에서 빠진다 — ia-v4 §4.3).
> 근거: KRDS 공식 저장소 토큰(`KRDS-uiux/krds-uiux` — `tokens/transformed_tokens.json`, `resources/css/token/krds_tokens.css`, rem = 10px). 공식 페이지 krds.go.kr › 스타일 › 타이포그래피.
> 사용자 결정: ① 이름 구조는 수정안대로 ② 이미 등록된 스타일은 [이름 다시 짓기]로 바꾼다(b) ③ 규칙 밖 크기는 표시한다.
> 순서: 이 명세 검토 0 → 시안 → IA v4 PR 1 병합 뒤 별도 PR로 구현.

## 0. 결정 요약

| 항목 | 결정 |
|---|---|
| 이름 구조 | `{분류}/{단계}` + 필요할 때만 꼬리 `-{크기}` · `-w{굵기}` · `-{줄 높이 %}` (이 순서, §3.8 마지막 수단 꼬리는 그 뒤) |
| 분류 | KRDS 4분류 display · heading · body · label |
| 단계 | KRDS PC 단계 이름. 크기 값은 바꾸지 않는다 |
| 폴더 | 언제나 `{분류}/` 폴더 안 |
| 소수 · 음수 표기 | 소수점은 `_`(예 `26_7`), 음수는 `m`(예 `-lsm0_3`) — 스타일 이름이 역할 변수 이름이 되고, 피그마 변수 이름은 `.`을 받지 않기 때문 |
| 기존 스타일 | [이름 다시 짓기] — 미리보기 → 체크 → 바꾸기(연결 유지, ⌘Z 한 번) |
| 규칙 밖 크기 | 목록 줄에 표시 — 소수 크기 ⚠, KRDS 크기 모음에 없는 정수 크기 ○ |

## 1. KRDS 규칙 (확인된 사실)

| 분류 | PC 크기(px) | 모바일(px) | 용도 |
|---|---|---|---|
| display | large 60 · medium 44 · small 36 | 44 · 32 · 28 | 배너 같은 마케팅용 |
| heading | xlarge 40 · large 32 · medium 24 · small 19 · xsmall 17 · xxsmall 15 | 28 · 24 · 22 · 19 · 17 · 15 | 제목 |
| body | large 19 · medium 17 · small 15 · xsmall 13 | 같음 | 본문 |
| label | large 19 · medium 17 · small 15 · xsmall 13 | 같음 | 버튼 · 입력 같은 UI 글자 |

- 굵기 2종(Regular · Bold), 줄 높이 기본 1.5(150%), 자간 0 또는 0.1rem, 글꼴 Pretendard GOV.
- **KRDS 크기 모음**(규칙 밖 판정용, PC + 모바일): 13 · 15 · 17 · 19 · 22 · 24 · 28 · 32 · 36 · 40 · 44 · 60.
- 모바일 크기를 모드로 만드는 일은 범위 밖이다.

## 2. 원칙

- **값은 바꾸지 않는다.** 이름만 KRDS 체계를 따른다(연결은 값이 같은 곳만 붙이므로 — IA v3 §2.11).
- **`{분류}/{단계}`는 그 스타일의 값만으로 정해진다** — 파일이 달라도 같은 값은 같은 분류 · 단계다. **꼬리는 같은 단계에 함께 있는 스타일에 따라 달라진다**(구분이 필요할 때만 붙이므로).
- 이름 짓기는 순수 함수 `src/lib/krdsType.ts`의 `nameKrdsStyles`가 한다 — 스캔 · 등록 · 마법사 · 이름 다시 짓기가 같은 함수를 쓴다.

## 3. 이름 짓는 규칙

### 3.1 입력
- 스타일 하나 = `{ fontSize, lineHeight(px) · lineHeightPercent?(AUTO면 'auto'), letterSpacing(px), family, style, count, uiCount }`.
  - 스캔 경로: 지금 군집(`StyleCluster`)에 `uiCount`를 더한다 — 그 군집 표본 중 §3.2-1의 UI 역할 안에 있는 표본 수. `count`는 지금처럼 표본 수.
  - 이름 다시 짓기 경로: 로컬 스타일 정의. `count` = 0, `uiCount` = 0(쓰인 횟수를 세지 않는다 — 동점은 다음 정렬 키로 간다).
- **굵기:** `weightOf(style) → { weight, italic }`. 지금 `exporters.ts splitWeightStyle`을 공용으로 쓰되, 이름에서 폭 · 광학 수식어(condensed · narrow · compressed · expanded · extended · wide · display · text · caption · micro)를 뗀 뒤 읽는다. 표에 없는 이름은 400. (예: "SemiBold Condensed" → 600, "Book" → 400, "Bold Italic" → 700 · 기울임)
- **줄 높이 %:** `lineHeightPercent`가 있으면 그 값, px면 `lineHeight / fontSize × 100`. 둘 다 소수 첫째 자리 반올림 뒤 정수 반올림해 비교 · 표기한다(149.6 → 150은 150%와 같은 것으로 본다).
- **크기 표기:** 소수 첫째 자리 반올림(26.67 → 26.7), 정수면 정수.

### 3.2 분류 (위에서부터 처음 맞는 것)
1. **label**
   - 스캔: `uiCount × 2 ≥ count`. UI 역할 = 표본 글자 레이어에서 위로 올라가며 처음 만나는 `dsRole`(이름 정리가 남긴 역할, `naming.ts ROLE_KEY`)이 `button` · `chip` · `input` · `field` 중 하나. 글자 레이어 자신은 보지 않고, 인스턴스 경계는 넘어 올라간다. 역할이 없으면(이름 정리를 안 한 파일) label이 나오지 않는다 — 한계.
   - 이름 다시 짓기: 지금 이름을 `/` `-` `_` 공백으로 나눈 조각 중 하나가 `label` · `button` · `btn` · `chip` · `input` · `field`와 정확히 같을 때(대소문자 무시). (`table` · `tablet`은 해당 없음.) 두 경로의 판정 근거가 달라 같은 값이 스캔에서는 label, 이름 다시 짓기에서는 body가 될 수 있다 — 한계.
2. **display** — 굵기 600 이상 · 크기 42 이상.
3. **heading** — 굵기 600 이상.
4. **body** — 그 밖.

### 3.3 단계 (크기 → 단계, KRDS 값의 중간점이 경계 · 같은 거리면 큰 단계)

| 분류 | 단계 = 크기 범위(px) |
|---|---|
| display | large ≥ 52 · medium 42 – 51.99 |
| heading | xlarge 36 – 41.99 · large 28 – 35.99 · medium 21.5 – 27.99 · small 18 – 21.49 · xsmall 16 – 17.99 · xxsmall < 16 |
| body · label | large ≥ 18 · medium 16 – 17.99 · small 14 – 15.99 · xsmall < 14 |

- 각 단계의 **기준값** = KRDS PC 값(display large 60 · medium 44, heading xlarge 40 · large 32 · medium 24 · small 19 · xsmall 17 · xxsmall 15, body · label large 19 · medium 17 · small 15 · xsmall 13).

### 3.4 앵커 · 이미 있는 이름
- **앵커**(지금 `nameTextStyles` 조건 그대로 — 노드가 그 스타일에 묶였고 시그니처가 같거나, 시그니처가 같은 기존 스타일이 정확히 1개)된 스타일은 기존 이름을 그대로 쓰고, §3.5 ~ §3.8의 꼬리 계산에서 빠진다.
- **이름 예약:** 이 파일의 모든 로컬 텍스트 스타일 이름을 처음부터 "사용 중"으로 둔다(앵커되지 않은 스타일이 관계없는 기존 스타일 이름을 차지해 등록이 그 스타일 값을 덮어쓰지 않게). 이름 다시 짓기에서는 대상 스타일 자신의 지금 이름은 예약하지 않는다(§5.3).
- 지은 이름이 사용 중이면 **강제 꼬리**: 크기 · 굵기 · 줄 높이 꼬리를 모두 붙인 이름(`{분류}/{단계}-{크기}-w{굵기}-{줄높이}`), 그래도 사용 중이면 `-2` · `-3`.

### 3.5 크기 꼬리 — 한 단계에 크기가 둘 이상일 때
- 같은 `{분류}/{단계}`(앵커 제외)의 서로 다른 크기 중 하나만 꼬리 없이, 나머지는 `-{크기}`.
- 꼬리 없이 남는 크기 = 정렬 1등: ① 기준값과의 거리 작은 순 ② 크기별 쓰인 곳(그 크기 스타일들의 `count` 합) 많은 순 ③ 큰 크기.

### 3.6 굵기 꼬리
- **기본 굵기 묶음:** display · heading = 600 이상, body · label = 500 이하. 굵기는 (숫자, 기울임) 한 쌍으로 센다 — 400과 400 기울임은 다른 굵기.
- 같은 `{분류}/{단계}[-크기]` 안에서 기본 묶음에 드는 굵기 중 정렬 1등 하나만 꼬리 없이, 나머지 굵기는 `-w{숫자}`(기울임이면 `-w{숫자}i`).
  - 정렬: ① 쓰인 곳(`count` 합) 많은 순 ② 분류 기본값(display · heading 700, body · label 400)에 가까운 순 ③ 기울임 아님 먼저 ④ 작은 숫자.
- 기본 묶음에 드는 굵기가 하나도 없으면 전부 꼬리가 붙는다(예: 굵은 버튼 글자만 있는 label/medium → `label/medium-w700`). 의도된 동작이다.
- 굵기를 이름이 아니라 숫자로 쓰는 이유: 단계 이름(medium · small …)과 겹쳐 `body/medium-medium`처럼 읽히는 것을 막는다.

### 3.7 줄 높이 꼬리
- 줄 높이가 150%가 아니면 `-{줄 높이 %}`(예 `-120`), 자동이면 `-auto`.

### 3.8 마지막 수단
위 꼬리를 다 붙여도 이름이 같은 스타일들:
1. 자간이 다르면 자간 0인 것이 그대로, 나머지는 `-ls{자간 px}`(소수 첫째 자리, `_` · `m` 표기 — 예 `-ls0_5` · `-lsm0_3`).
2. 그래도 같고 글꼴이 다르면 쓰인 곳이 많은 글꼴(같으면 글꼴 이름 순 앞)이 그대로, 나머지는 `-{글꼴 slug}`(예 `-noto-sans-kr`).
3. 그래도 같으면 정렬(쓰인 곳 많은 순 → 시그니처 문자열 순) 1등이 그대로, 나머지 `-2` · `-3`.

### 3.9 그 밖
- **"왼쪽 글자로 이름 채우기"**(행 라벨)는 사용자가 누르는 기능이라 그대로 — 라벨 글자 이름이 KRDS 이름을 덮는다. 라벨이 이름처럼 보이는지 판정하는 `LABEL_RAMP_RE`에 KRDS 분류(`display|heading|body|label`)와 단계 · 꼬리 모양을 더한다.

## 4. 규칙 밖 크기 표시

- 판정(크기는 §3.1 표기 기준): 소수 → `'decimal'`, §1 KRDS 크기 모음에 없는 정수 → `'off'`, 있으면 `null`. **가까운 KRDS 크기** `nearest` = §1 모음에서 가장 가까운 값, 같은 거리면 큰 값.
- 텍스트 스타일 목록(값을 직접 고르기 › 타이포 · 이름 다시 짓기 미리보기) 줄 끝:
  - `'decimal'`: ⚠ `--danger` "소수 크기", 툴팁 "KRDS 크기가 아니에요 · 가까운 KRDS 크기 {nearest}px".
  - `'off'`: ○ `--text-2` "KRDS 밖", 같은 툴팁.
- 목록 위 상태 줄 끝에 " · KRDS 밖 크기 {k}개(소수 {m})" — k = 표시가 붙은 **스타일(줄) 수**, m = 그중 소수. 0이면 붙이지 않는다.
- 표시만 한다 — 값을 바꾸거나 등록을 막지 않는다.

## 5. [이름 다시 짓기] (사용자 결정 b)

### 5.1 자리 · 잠금
- 값을 직접 고르기 › 타이포 카드 툴바 [이름 다시 짓기]. 유료(텍스트 스타일 기능과 같음) — 무료면 `aria-disabled`, 사유 "유료 기능이에요 · [라이선스 →]"(공통 잠금 문구).
- 쓰기 작업(OPS write · 공통 잠금). 끝나면 작업 직후 다시 읽기(ia-v4 §7).

### 5.2 미리보기
- `PREVIEW_TEXT_STYLE_RENAME{reqId}` → `TEXT_STYLE_RENAME_PREVIEW{reqId, rows:[{id, from, to, fontSize, offScale, nearest}]}`.
- 대상: 이 파일의 로컬 텍스트 스타일 전부(선택과 무관). 이름 = §3을 그 전체에 한 번에 적용한 결과(앵커 없음, count 0).
- 화면: 카드 안 목록. 머리 "이름 다시 짓기 · 바꿀 이름 {n}개". 줄 = 체크 + 옛 이름(취소선, `--text-2`) → 새 이름 + §4 표시. 이름이 같은 스타일은 보이지 않는다. 기본 모두 켬. 0개면 "바꿀 이름이 없어요".
- 아래: [{k}개 이름 바꾸기](k = 켠 수, 0이면 `aria-disabled` · 사유 "바꿀 이름을 켜 주세요") · [닫기].
- 체크를 끈 줄은 지금 이름을 유지한다 — 그 이름과 켠 줄의 새 이름이 겹치면 켠 줄에 "같은 이름이 남아요" 표시 + 그 줄은 바꾸기에서 빠진다(§5.3).

### 5.3 바꾸기
- `APPLY_TEXT_STYLE_RENAME{reqId, items:[{id, from, to, sig}]}` → `TEXT_STYLE_RENAMED{reqId, renamed, skipped, skipReasons, roleVarsRenamed, roleVarsSkipped}`. `sig` = 미리보기 때의 시그니처(크기 · 줄 높이 · 자간 · 글꼴 · 스타일).
- 다시 확인(스타일마다): 지금 이름이 `from`이 아니면 건너뜀 `'renamed-meanwhile'`, 시그니처가 `sig`와 다르면 `'value-changed'`.
- 겹침 판정은 **최종 이름 집합**으로 한다: (바꾸지 않는 스타일들의 지금 이름) ∪ (통과한 항목들의 `to`)에서 `to`가 겹치는 항목은 건너뜀 `'name-taken'`. 그래서 A→B · B→C 연쇄나 A↔B 맞바꿈도 된다.
- 바꾸는 순서: 통과한 항목을 먼저 임시 이름(`__dsl_tmp_{id}`)으로 바꾼 뒤 `to`로 바꾼다(2단계 — 중간에 이름이 부딪히지 않게). 오류는 `'error'`.
- **역할 변수도 함께:** 텍스트 스타일 등록이 스타일 이름으로 만드는 역할 변수 `font-size/{이름}` · `line-height/{이름}` · `letter-spacing/{이름}`(3종 — `variables.ts createSemanticTextStyles`)를 플러그인 Semantic 컬렉션(`ownedCollection('semantic')`) 안에서 `{from}` → `{to}`로 바꾼다. 사용자 컬렉션 · 직접 만든 변수(IA v4 B.3의 `dsl.manual` 표시가 생긴 뒤에는 그 변수)는 건드리지 않는다. 바꿀 이름이 이미 있으면 그 변수는 건너뛰고 `roleVarsSkipped`에 센다(그 스타일은 옛 이름의 변수에 묶인 채로 남는다). 지금 `createSemanticTextStyles` 안의 `roleRenames` 처리를 공용 함수 `renameTextRoleVars(pairs)`로 빼서 두 경로가 함께 쓴다.
- ⌘Z 한 번(스타일 · 변수 이름을 한 묶음 — `commitUndo`).
- 결과(상태 줄): "텍스트 스타일 {renamed}개 이름을 바꿨어요 · ⌘Z로 되돌리기" + 건너뛴 것이 있으면 " · 건너뜀 {skipped}"(툴팁에 사유별 수) + 역할 변수를 건너뛴 것이 있으면 " · 역할 변수 {roleVarsSkipped}개는 같은 이름이 있어 그대로 뒀어요".

## 6. 코드에서 바뀌는 곳

- 새 `src/lib/krdsType.ts`(순수): `KRDS_SIZES`, `KRDS_STEPS`, `weightOf(style)`, `krdsCategory(input, path)`, `krdsStep(category, size)`, `offScale(size) → { kind: 'decimal' | 'off' | null, nearest }`, `nameKrdsStyles(inputs, { reserved, anchored })`.
- `textStyles.ts`: `nameTextStyles`가 RAMP_NAMES 순위 대신 `nameKrdsStyles`를 쓴다(앵커 조건 · 행 라벨은 유지). `StyleCluster`에 `uiCount`, `TextSample`에 `uiRole?: boolean`. `LABEL_RAMP_RE` 넓힘(§3.9). `RAMP_NAMES` · 옛 램프는 지운다.
- `rampToSpecs`(스캔 결과가 없을 때의 기본 램프): display/large 60 · heading/large 32 · heading/medium 24 · heading/small 19 = Bold, body/medium 17 · body/small 15 = Regular, 줄 높이 `lineHeightPercent: 150` · `lineHeight = 크기 × 1.5`, 자간 0. 글꼴은 지금처럼 `DEFAULT_TS_FAMILY`(Inter — Pretendard GOV는 설치되지 않았을 수 있다). label 줄은 넣지 않는다(body/medium과 값이 같아 앵커 · 기존 스타일 연결이 모호해지므로).
- `variables.ts scanTextStyles`: 표본에 `uiRole`(§3.2-1 조상 탐색). `scanExistingTextStyles`는 그대로.
- `variables.ts`: `renameTextRoleVars(pairs)` 공용 함수 + 이름 다시 짓기 적용 함수. `code.ts` · `messages.ts`: 메시지 2쌍.
- `ui.ts` · `ui.html`: 타이포 카드 [이름 다시 짓기] · 미리보기 목록 · §4 표시.
- **문구(i18n, 해요체)**

| 키 | 지금 | 바뀜 / 새 |
|---|---|---|
| `textStyle.rowLabelTip` | "… 짝을 못 찾은 행은 크기 순 이름(display/h1…) 그대로 둬요." | "… 짝을 못 찾은 행은 KRDS 이름(heading/large…) 그대로 둬요." |
| `textStyle.nameSplit` | "… 크기 순 {b}" | "… KRDS 이름 {b}" |
| `textStyle.renameBtn` (새) | — | "이름 다시 짓기" |
| `textStyle.renameHead` (새) | — | "이름 다시 짓기 · 바꿀 이름 {n}개" |
| `textStyle.renameNone` (새) | — | "바꿀 이름이 없어요" |
| `textStyle.renameApply` (새) | — | "{k}개 이름 바꾸기" |
| `textStyle.renameNeedOn` (새) | — | "바꿀 이름을 켜 주세요" |
| `textStyle.renameClash` (새) | — | "같은 이름이 남아요" |
| `textStyle.renamed` (새) | — | "텍스트 스타일 {n}개 이름을 바꿨어요 · ⌘Z로 되돌리기" |
| `textStyle.renameSkipped` (새) | — | " · 건너뜀 {m}" |
| `textStyle.renameRoleSkipped` (새) | — | " · 역할 변수 {n}개는 같은 이름이 있어 그대로 뒀어요" |
| `textStyle.renameSkip.renamed-meanwhile` · `value-changed` · `name-taken` · `error` (새) | — | "그 사이 이름이 바뀜" · "그 사이 값이 바뀜" · "같은 이름이 있음" · "오류" |
| `textStyle.offDecimal` · `offScale` · `offTip` · `offSum` (새) | — | "소수 크기" · "KRDS 밖" · "KRDS 크기가 아니에요 · 가까운 KRDS 크기 {n}px" · " · KRDS 밖 크기 {k}개(소수 {m})" |

- 테스트: `krdsType` 단위(분류 · 단계 경계 · 꼬리 순서 · 정렬 동점 · 강제 꼬리 · 마지막 수단 · 소수 · 음수 표기 · 규칙 밖 · weightOf), `nameTextStyles` · `rampToSpecs` 바뀐 기대값, 이름 다시 짓기(figma 목: 연쇄 · 맞바꿈 · 임시 이름 · 역할 변수 · 사용자 컬렉션 제외 · 겹침 건너뜀 · 값 바뀜), verify-bind-flow(타이포 카드 표시 · 이름 다시 짓기 흐름).

## 7. 예 — 2026-11-09 사용자 파일(스크린샷)에 적용

스캔 경로 기준(쓰인 곳 수는 화면에서 알 수 없어 동점이 나는 곳은 "쓰인 곳에 따라"로 적는다).

| 지금 | 값(크기/줄 높이 · 굵기) | 새 이름 | 표시 |
|---|---|---|---|
| display/inter-semi-bold · -2 · -3 | 52/150 · 52/120 · 52/125 SemiBold | display/large · display/large-120 · display/large-125 | ○ |
| h1 | 28/120 SemiBold | heading/large-120 | — (28은 KRDS 모바일 값) |
| h3/inter-semi-bold · -2 | 24/150 · 24/120 SemiBold | heading/medium · heading/medium-120 | — |
| h2 | 26.7/150 SemiBold | heading/medium-26_7 (24가 기준 24에 더 가까움) | ⚠ |
| title/semi-bold · body/inter-semi-bold · -2 | 20/120 · 18/125 · 18/120 SemiBold | heading/small 단계에 20과 18 — 기준 19와 둘 다 1 차이라 쓰인 곳이 많은 크기가 꼬리 없음. 18이 많으면 heading/small-125 · heading/small-120 · heading/small-20-120 | ○ |
| title/regular · body/inter-regular · inter-medium … | 20/150 Regular · 18/120~180 Regular · Medium | body/large 단계에 20과 18 — 같은 규칙. 18이 많고 Regular가 많으면 body/large · body/large-180 · body/large-120 · body/large-w500-120 … · body/large-20 | ○ |
| caption/inter-regular · inter-medium … | 16/120~125 Regular · Medium | Regular가 많으면 body/medium-125 · body/medium-w500-125 · body/medium-w500-120 | ○ |
| caption/inter-semi-bold · -2 | 16/120 · 16/125 SemiBold | heading/xsmall-120 · heading/xsmall-125 | ○ |
| overline | 14/120 Regular | body/small-120 | ○ |
| text-9 · -2 | 12/120 Regular (두 스타일의 차이가 화면에 보이지 않음 — 자간 · 글꼴 중 하나) | 자간이 다르면 자간 0인 쪽 body/xsmall-120, 다른 쪽 body/xsmall-120-ls{자간}. 글꼴이 다르면 §3.8-2 | ○ |
| text-10 | 10/120 Regular | body/xsmall-10-120 (12가 기준 13에 더 가까움) | ○ |

## 부록 A. PR 체크리스트 (IA v4 PR 1 병합 뒤)
- [ ] `krdsType.ts` + 단위 테스트
- [ ] `nameTextStyles` · `rampToSpecs` · `LABEL_RAMP_RE` · 기존 테스트 기대값
- [ ] 스캔 표본 `uiRole` · 군집 `uiCount`
- [ ] 규칙 밖 표시(목록 · 상태 줄)
- [ ] [이름 다시 짓기] — 메시지 · 미리보기 · 최종 이름 집합 겹침 · 임시 이름 2단계 · 역할 변수(`renameTextRoleVars`) · ⌘Z · 잠금 · 다시 읽기
- [ ] i18n(§6 표) · verify:i18n 0 · verify-bind-flow · 4검사 · 스크린샷 · 실기 확인
