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
- 스타일 하나 = `{ fontSize, lineHeight(px, 0 = AUTO), lineHeightPercent?, letterSpacing(px), family, style, count, uiCount }`(지금 `StyleCluster` · `ExistingTextStyle` 모양 그대로 + `uiCount`).
  - 스캔 경로: 지금 군집(`StyleCluster`)에 `uiCount`를 더한다 — 그 군집 표본 중 §3.2-1의 UI 역할 안에 있는 표본 수. `count`는 지금처럼 표본 수.
  - 이름 다시 짓기 경로: 로컬 스타일 정의. `count` = 0, `uiCount` = 0(쓰인 횟수를 세지 않는다 — 동점은 다음 정렬 키로 간다).
- **굵기:** `weightOf(style) → { weight, italic }` — `exporters.ts splitWeightStyle`을 **감싸는 새 함수**(내보내기 결과는 그대로)로, 이름에서 폭 · 광학 수식어(condensed · narrow · compressed · expanded · extended · wide · display · text · caption · micro)를 뗀 뒤 읽는다. 표에 없는 이름은 400. (예: "SemiBold Condensed" → 600, "Book" → 400, "Bold Italic" → 700 · 기울임)
- **줄 높이 %:** `lineHeight`가 0이면 'auto'. `lineHeightPercent`가 있으면 그 값, 아니면 `lineHeight / fontSize × 100`. 정수 반올림해 비교 · 표기한다(149.6 → 150은 150%와 같다).
- **크기 표기값:** 소수 첫째 자리 반올림(26.67 → 26.7, 정수면 정수). **분류 · 단계 경계 · 기준값 거리 · 크기 꼬리 · 규칙 밖 판정은 모두 이 표기값으로 한다.** 원래 크기는 달라도 표기값이 같은 스타일은 같은 크기로 보고, 이름이 겹치면 §3.8로 간다.

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
- **순서:** §3.5 ~ §3.8로 이름을 다 지은 뒤 예약 이름과 견준다. 겹친 스타일만 **강제 꼬리**: `{분류}/{단계}-{크기}-w{굵기}[i]-{줄높이}` — 크기 · 굵기 · 줄 높이를 생략 없이(150%도 `-150`, 자동은 `-auto`, 기울임은 `i`) 쓰고, §3.8에서 붙은 `-ls…` · 글꼴 꼬리는 그 뒤에 그대로 둔다. 그래도 겹치면(예약 이름 또는 같은 회차의 다른 강제 이름) §3.8-3 정렬 순서대로 `-2` · `-3`을 붙인다.

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
1. 자간이 다르면 정렬(① 자간 0 ② 쓰인 곳 많은 순 ③ 절댓값 작은 순 ④ 작은 값) 1등이 그대로, 나머지는 `-ls{자간 px}`(소수 첫째 자리, `_` · `m` 표기 — 예 `-ls0_5` · `-lsm0_3`). 표기가 같아지는 자간은 같은 것으로 보고 다음 단계로.
2. 그래도 같고 글꼴이 다르면 쓰인 곳이 많은 글꼴(같으면 글꼴 이름 순 앞)이 그대로, 나머지는 `-{글꼴 slug}`(예 `-noto-sans-kr`).
3. 그래도 같으면 정렬(쓰인 곳 많은 순 → 시그니처 문자열 순 → 지금 이름 순 → 스타일 id 순) 1등이 그대로, 나머지 `-2` · `-3`(값이 완전히 같은 기존 스타일 둘도 이 순서로 갈린다).

### 3.9 그 밖
- **"왼쪽 글자로 이름 채우기"**(행 라벨)는 사용자가 누르는 기능이라 그대로 — 라벨 글자 이름이 KRDS 이름을 덮는다. 라벨이 이름처럼 보이는지 판정하는 `LABEL_RAMP_RE`에 KRDS 분류(`display|heading|body|label`)와 단계 · 꼬리 모양을 더한다.

### 3.10 문자열 비교
- "이름 순" · "시그니처 문자열 순" · "글꼴 이름 순" · "id 순"은 모두 **문자 코드 순**(JS `a < b`, 대소문자 구분, `localeCompare` 쓰지 않음)이다.

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
- `PREVIEW_TEXT_STYLE_RENAME{reqId}` → `TEXT_STYLE_RENAME_PREVIEW{reqId, rows:[{id, from, to, sig, fontSize, offScale, nearest}]}`(`sig` = 시그니처 문자열 — 바꾸기 때 그대로 돌려보낸다).
- 대상: 이 파일의 로컬 텍스트 스타일 전부(선택과 무관). 이름 = §3을 그 전체에 한 번에 적용한 결과(앵커 없음, count 0).
- 화면: 카드 안 목록. 머리 "이름 다시 짓기 · 바꿀 이름 {n}개". 줄 = 체크 + 옛 이름(취소선, `--text-2`) → 새 이름 + §4 표시. 이름이 같은 스타일은 보이지 않는다. 기본 모두 켬. 0개면 "바꿀 이름이 없어요".
- 아래: [{k}개 이름 바꾸기](k = 켠 수, 0이면 `aria-disabled` · 사유 "바꿀 이름을 켜 주세요") · [닫기].
- 체크를 끈 줄은 지금 이름을 유지한다 — 그 이름과 켠 줄의 새 이름이 겹치면 켠 줄에 "같은 이름이 남아요" 표시 + 그 줄은 바꾸기에서 빠진다(§5.3).

### 5.2b 카드 안 배치
- 타이포 카드: 툴바 [스캔] [행 추가] … [이름 다시 짓기] [등록]. [이름 다시 짓기]를 누르면 스캔 표(`tsList`) **자리를 미리보기 목록이 대신**한다(스캔 표는 숨김, 상태는 그대로 보관). 미리보기 아래 [k개 이름 바꾸기] · [닫기].
- [닫기]를 누르면 미리보기를 닫고 스캔 표를 다시 보인다. 바꾸기가 끝나면 미리보기를 닫는다(표는 아래 규칙대로 비우거나 그대로 둔다). 미리보기 중 [스캔]을 누르면 미리보기를 닫고 스캔한다.
- 바꾸기가 끝나면(`TEXT_STYLE_RENAMED`) `renamed` ≥ 1이고 스캔 표가 있었을 때만 **표를 비운다**(`tsSpecs` = 빈 표). 하나도 바꾸지 못했으면(`renamed` = 0) 표는 그대로 둔다. 순서: 표 비움 → 표 그리기 → 상태 줄에 결과 문구 + " · 스캔 표를 비웠어요 — 다시 [스캔]해 주세요"를 쓴다(빈 표를 그릴 때 상태 줄을 지우는 동작보다 뒤에 써서 문구가 남게). 표를 비운 뒤에는 「왼쪽 글자로 이름 채우기」(`btnTsRowLabels`)를 끈다(`disabled`) — 옛 선택의 글자(`lastTextSamples`)로 표를 다시 채우지 않게. 다음 `TEXT_STYLE_CANDIDATES`가 오면 다시 켠다. 옛 이름으로 [등록]해 이름이 되돌아가거나, 앵커 없는 줄 · 행 추가 줄이 바뀐 이름과 겹쳐 남의 스타일 값을 덮어쓰는 일을 막는다. 손으로 고친 이름 · 행 추가 줄 · 행 라벨 이름도 함께 없어진다(사용자가 [이름 다시 짓기]를 누르기 전에 표를 등록하지 않았다면 다시 만들어야 한다 — 받아들임). 자동으로 다시 스캔하지 않는 이유: 스캔은 지금 선택을 읽어 그 사이 바뀐 선택이나 빈 선택(기본 램프)으로 표를 엉뚱하게 덮을 수 있다.

### 5.3 바꾸기
- `APPLY_TEXT_STYLE_RENAME{reqId, items:[{id, from, to, sig}]}` → `TEXT_STYLE_RENAMED{reqId, results:[{id, status, name}], renamed, skipped, skipReasons, roleVarsRenamed, roleVarsTaken, roleVarsError, roleVarsStuck}` — `status` = `'renamed'` 또는 건너뜀 사유 코드, `name` = 끝난 뒤 그 스타일의 지금 이름. `sig` = 미리보기 때의 시그니처(크기 · 줄 높이 · 자간 · 글꼴 · 스타일).
- 다시 확인(스타일마다): 지금 이름이 `from`이 아니면 건너뜀 `'renamed-meanwhile'`, 시그니처가 `sig`와 다르면 `'value-changed'`.
- 겹침 판정은 **최종 이름 집합**으로, 이름을 하나라도 바꾸기 전에 끝낸다: 통과 후보 = 다시 확인을 통과한 항목. (후보가 아닌 모든 스타일의 지금 이름) ∪ (후보들의 `to`)에서 `to`가 겹치는 후보를 건너뜀 `'name-taken'`으로 빼고, 빠진 항목의 지금 이름이 남으므로 **더 빠지는 항목이 없을 때까지 반복**한다(고정점). 그래서 A→B · B→C 연쇄나 A↔B 맞바꿈도 되고, 한 항목이 빠지면 그 이름을 원하던 항목도 함께 빠진다.
- 바꾸는 순서: 남은 후보를 모두 임시 이름(`__dsl_tmp_{id}`)으로 바꾼 뒤(1단계) `to`로 바꾼다(2단계). 1단계나 2단계에서 오류가 난 항목은 `from`으로 되돌리고 `'error'`, 되돌리기도 실패하면 `'error-stuck'`(결과 툴팁에 그 스타일의 지금 이름 `name`을 적는다). **연쇄 되돌림:** 1단계를 모든 후보에 끝낸 뒤 2단계로 간다. 어느 단계든 오류가 난 항목이 생기면, 먼저 **되돌릴 집합 전체**를 계산한다 — 오류 항목 + 그 `from`을 `to`로 원하던 항목, 그 항목의 `from`을 원하던 항목 … 더 늘지 않을 때까지(닫힘). 그 집합을 모두 임시 이름(`__dsl_tmp_{id}`)으로 옮긴 뒤 `from`으로 바꾼다(되돌림도 2단계 — 같은 이름이 잠깐이라도 둘 생기지 않게). 직접 오류가 난 항목은 `'error'`, 함께 되돌려진 항목은 `'error-chain'`으로 센다. 되돌림 2단계에서도 실패하면 `'error-stuck'`.
- **역할 변수는 스타일 바꾸기가 끝난 뒤:** `status: 'renamed'`인 항목의 `{from, to}`만 넘긴다(되돌려진 스타일의 변수는 건드리지 않는다). 변수 쪽 실패는 스타일 이름을 되돌리지 않는다. 결과는 `roleVarsTaken`(같은 이름이 있어 건너뜀) · `roleVarsError`(바꾸기 오류 — 되돌림, 되돌리지 못한 변수는 `roleVarsStuck:[지금 이름]`)으로 나눠 센다.
- **역할 변수도 함께:** 텍스트 스타일 등록이 스타일 이름으로 만드는 역할 변수 `font-size/{이름}` · `line-height/{이름}` · `letter-spacing/{이름}`(3종 — `variables.ts createSemanticTextStyles`)를 플러그인 Semantic 컬렉션(`ownedCollection('semantic')`) 안에서 `{from}` → `{to}`로 바꾼다. 사용자 컬렉션 · 직접 만든 변수(IA v4 B.3의 `dsl.manual` 표시가 생긴 뒤에는 그 변수)는 건드리지 않는다. 역할 변수도 스타일과 **같은 방식**(최종 이름 집합 · 고정점 · 임시 이름 2단계 · 실패 시 되돌림)으로 바꾼다 — 최종 집합 밖의 다른 변수와 이름이 겹치는 변수만 건너뛰고 `roleVarsTaken`에 센다(그 스타일은 옛 이름의 변수에 묶인 채로 남는다). 지금 `createSemanticTextStyles` 안의 `roleRenames` 처리를 이 방식의 공용 함수 `renameTextRoleVars(pairs)`로 바꿔 두 경로가 함께 쓴다.
- ⌘Z 한 번(스타일 · 변수 이름을 한 묶음 — `commitUndo`).
- 결과(상태 줄): "텍스트 스타일 {renamed}개 이름을 바꿨어요 · ⌘Z로 되돌리기" + 건너뛴 것이 있으면 " · 건너뜀 {skipped}"(툴팁에 사유별 수) + " · 역할 변수 {roleVarsTaken}개는 같은 이름이 있어 그대로 뒀어요"(있을 때) + " · 역할 변수 {roleVarsError}개는 바꾸지 못했어요"(있을 때, 툴팁에 되돌리지 못한 변수의 지금 이름).

## 6. 코드에서 바뀌는 곳

- 새 `src/lib/krdsType.ts`(순수): `KRDS_SIZES`, `KRDS_STEPS`, `weightOf(style)`, `krdsCategory(input, path)`, `krdsStep(category, size)`, `offScale(size) → { kind: 'decimal' | 'off' | null, nearest }`, `nameKrdsStyles(inputs, { reserved, anchored })`.
- `textStyles.ts`: `nameTextStyles`가 RAMP_NAMES 순위 대신 `nameKrdsStyles`를 쓴다(앵커 조건 · 행 라벨은 유지). `StyleCluster`에 `uiCount`, `TextSample`에 `uiRole?: boolean`. `LABEL_RAMP_RE` 넓힘(§3.9). `RAMP_NAMES` · 옛 램프는 지운다.
- `rampToSpecs`(스캔 결과가 없을 때의 기본 램프): display/large 60 · heading/large 32 · heading/medium 24 · heading/small 19 = Bold, body/medium 17 · body/small 15 = Regular, 줄 높이 `lineHeightPercent: 150` · `lineHeight = 크기 × 1.5`, 자간 0. 글꼴은 지금처럼 `DEFAULT_TS_FAMILY`(Inter — Pretendard GOV는 설치되지 않았을 수 있다). label 줄은 넣지 않는다(body/medium과 값이 같아 앵커 · 기존 스타일 연결이 모호해지므로). 램프 이름도 §3.4 예약을 따른다 — 같은 이름의 로컬 스타일이 있으면 그 줄은 강제 꼬리를 붙인다(등록이 이름으로 찾아 남의 스타일 값을 덮어쓰지 않게). 이를 위해 `TEXT_STYLE_CANDIDATES`에 `reservedNames`(이 파일의 로컬 텍스트 스타일 이름 전부)를 더하고, UI의 `rampToSpecs(family, reservedNames)`가 예약을 적용한다(램프 폴백 판정 · 문구는 지금 그대로).
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
| `textStyle.renameRoleError` · `renameRoleStuck` (새) | — | " · 역할 변수 {n}개는 바꾸지 못했어요" · "되돌리지 못한 변수: {names}" |
| `textStyle.renameSkip.renamed-meanwhile` · `value-changed` · `name-taken` · `error` · `error-chain` · `error-stuck` (새) | — | "그 사이 이름이 바뀜" · "그 사이 값이 바뀜" · "같은 이름이 있음" · "오류" · "연결된 항목 오류로 되돌림" · "되돌리지 못함 · 지금 이름 {name}" |
| `textStyle.renameClearedTable` (새) | — | " · 스캔 표를 비웠어요 — 다시 [스캔]해 주세요" |
| `textStyle.offDecimal` · `offScale` · `offTip` · `offSum` (새) | — | "소수 크기" · "KRDS 밖" · "KRDS 크기가 아니에요 · 가까운 KRDS 크기 {n}px" · " · KRDS 밖 크기 {k}개(소수 {m})" |

- 테스트: `krdsType` 단위(분류 · 단계 경계 · 꼬리 순서 · 정렬 동점 · 강제 꼬리 · 마지막 수단 · 소수 · 음수 표기 · 규칙 밖 · weightOf), `nameTextStyles` · `rampToSpecs` 바뀐 기대값, 이름 다시 짓기(figma 목: 연쇄 · 맞바꿈 · 임시 이름 · 역할 변수 · 사용자 컬렉션 제외 · 겹침 건너뜀 · 값 바뀜), verify-bind-flow(타이포 카드 표시 · 이름 다시 짓기 흐름).

## 7. 예 — 2026-11-09 사용자 파일(스크린샷)에 [이름 다시 짓기]를 적용

이미 등록된 스타일이라 스캔은 앵커로 옛 이름을 그대로 둔다 — 새 이름은 [이름 다시 짓기]에서 나온다. 이 경로는 쓰인 곳이 0이라 동점은 다음 정렬 키로 정해진다(크기: 큰 크기, 굵기: 분류 기본값에 가까운 굵기).

| 지금 | 값(크기/줄 높이 · 굵기) | 새 이름 | 표시 |
|---|---|---|---|
| display/inter-semi-bold · -2 · -3 | 52/150 · 52/120 · 52/125 SemiBold | display/large · display/large-120 · display/large-125 | ○ |
| h1 | 28/120 SemiBold | heading/large-120 | — (28은 KRDS 모바일 값) |
| h3/inter-semi-bold · -2 | 24/150 · 24/120 SemiBold | heading/medium · heading/medium-120 | — |
| h2 | 26.7/150 SemiBold | heading/medium-26_7 (24가 기준 24에 더 가까움) | ⚠ |
| title/semi-bold | 20/120 SemiBold | heading/small-120 (20 · 18이 기준 19와 같은 거리 → 큰 크기 20이 꼬리 없음) | ○ |
| body/inter-semi-bold · -2 | 18/125 · 18/120 SemiBold | heading/small-18-125 · heading/small-18-120 | ○ |
| title/regular | 20/150 Regular | body/large (20이 꼬리 없음) | ○ |
| body/inter-regular · -2 · -3 · -4 | 18/180 · 18/150 · 18/120 · 18/120 Regular | body/large-18-180 · body/large-18 · body/large-18-120 · body/large-18-120-2 (셋째 · 넷째가 값이 같으면 지금 이름 순 — §3.8-3) | ○ |
| body/inter-medium · -2 · -3 | 18/120 · 18/120 · 18/125 Medium | body/large-18-w500-120 · body/large-18-w500-120-2 (값이 같으면 §3.8-3) · body/large-18-w500-125 | ○ |
| caption/inter-regular | 16/125 Regular | body/medium-125 (Regular가 기본값 400에 가까움) | ○ |
| caption/inter-medium · -2 | 16/125 · 16/120 Medium | body/medium-w500-125 · body/medium-w500-120 | ○ |
| caption/inter-semi-bold · -2 | 16/120 · 16/125 SemiBold | heading/xsmall-120 · heading/xsmall-125 | ○ |
| overline | 14/120 Regular | body/small-120 | ○ |
| text-9 · -2 | 12/120 Regular (화면으로는 차이를 알 수 없음 — 자간 · 글꼴 중 하나) | body/xsmall-120 · body/xsmall-120-ls{자간}(자간이 다를 때) | ○ |
| text-10 | 10/120 Regular | body/xsmall-10-120 (12가 기준 13에 더 가까움) | ○ |

## 부록 A. PR 체크리스트 (IA v4 PR 1 병합 뒤)
- [ ] `krdsType.ts` + 단위 테스트
- [ ] `nameTextStyles` · `rampToSpecs` · `LABEL_RAMP_RE` · 기존 테스트 기대값
- [ ] 스캔 표본 `uiRole` · 군집 `uiCount`
- [ ] 규칙 밖 표시(목록 · 상태 줄)
- [ ] [이름 다시 짓기] — 메시지(`sig`) · 미리보기(카드 안 배치) · 최종 이름 집합 고정점 · 임시 이름 2단계 · 실패 되돌림 · 역할 변수(`renameTextRoleVars`, 같은 방식) · 바꾼 뒤 스캔 표 비움 · ⌘Z · 잠금 · 다시 읽기
- [ ] i18n(§6 표) · verify:i18n 0 · verify-bind-flow · 4검사 · 스크린샷 · 실기 확인
