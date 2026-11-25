# 텍스트 스타일 이름 — KRDS 규칙 (2026-11-09 사용자 확정 · 2026-11-11 IA v4에 맞춰 다시 씀)

> 대상: 이름을 짓는 화면 — **만들기 화면 Text Style 탭**(ia-v4 §4.3, `SCAN_TEXT_STYLES{reqId}` → `nameTextStyles`)과 **값을 직접 고르기 › 타이포**(스캔 · 기본 램프 — 지금. 도구 탭 PR 뒤에는 그 자리를 **도구 탭 텍스트 스타일**(선택 없이 기본 단계, ia-v4 §0 "도구 탭")이 맡는다). 이미 있는 스타일 이름을 한 번에 바꾸던 [이름 다시 짓기]는 없앴다(2026-11-24 사용자 결정 SC-D15 — ia-v4 §0 "범위 정리 S-1a" · §5). v3 마법사는 IA v4 B.4에서 지워졌다(그 텍스트 스타일 단계는 만들기 화면 Text Style 탭이 이어받았다).
> 근거: KRDS 공식 저장소 토큰(`KRDS-uiux/krds-uiux` — `tokens/transformed_tokens.json`, `resources/css/token/krds_tokens.css`, rem = 10px). 공식 페이지 krds.go.kr › 스타일 › 타이포그래피.
> 사용자 결정: ① 이름 구조는 수정안대로 ② 이미 등록된 스타일은 [이름 다시 짓기]로 바꾼다(b)(→ 2026-11-24 SC-D15로 없앰) ③ 규칙 밖 크기는 표시한다. 2026-11-11: ④ [이름 다시 짓기]는 **변수 탭 ⋯ 메뉴**에 두고 타이포 카드에도 같은 버튼을 남긴다(→ 2026-11-24 SC-D15로 둘 다 없앰) ⑤ 규칙 밖 표시는 만들기 화면 Text Style 탭 줄에도 붙인다(요약 끝에 작게) ⑥ 타이포 카드 목록의 "카드 안 카드"(CLAUDE.md)도 이번에 고친다. 2026-11-11(UX 검수 C): ⑦ ③ · ⑤의 규칙 밖 표시를 모두 없앤다 — "KRDS 기준은 말 그대로 예제이며 기준이다"(§4). 2026-11-24(SC-D15): ⑧ [이름 다시 짓기] 기능(⋯ 메뉴 항목 · 타이포 버튼 · 팝업)을 지운다 — 남는 것은 새로 등록하는 스타일의 이름 규칙(§3)과, 등록 때 기존 스타일 · 옛 규칙 역할 변수 이름을 함께 바꾸는 일(§6 "등록 순서")이다.
> 순서: 이 명세 다시 검토 0 → 시안 → IA v4 B.9 병합 뒤(지금 main) 별도 PR로 구현.
> 도구 탭 PR(2026-11-12 결정, ia-v4 §0 "도구 탭"): 이 문서에서 값을 직접 고르기 › 타이포 · 타이포 카드 · [왼쪽 글자로 이름 채우기]를 말하는 문장은 **지금 코드**다 — 그 PR에서 화면 · 버튼과 함께 없어진다(이름 채우기는 D1).

## 0. 결정 요약

| 항목 | 결정 |
|---|---|
| 이름 구조 | `{분류}/{단계}` + 필요할 때만 꼬리 `-{크기}` · `-w{굵기}` · `-{줄 높이 %}` (이 순서, §3.8 마지막 수단 꼬리는 그 뒤) |
| 분류 | KRDS 4분류 display · heading · body · label |
| 분류 기준 — 크기 (2026-11-19 사용자 결정 T1 · T4) | **T1:** 글자 크기(표기값) **21.5 이상은 굵기와 관계없이 heading**(label이 먼저, display는 지금처럼 굵기 600 이상 · 42 이상만 — 보통 굵기 42 이상은 heading xlarge). 보통 굵기는 heading 기본 굵기 묶음(600 이상) 밖이라 굵기 꼬리가 붙는다(예 `heading/medium-w400`). **T4:** 굵은 글자(600 이상)도 **16 미만이면 heading이 아니라 body**(예 14px Bold → `body/small-w700`). 그래서 heading `xxsmall`(16 미만) 단계는 없앤다. 순서: label → display → heading(21.5 이상) → heading(600 이상 · 16 이상) → body(§3.2). 계기: 보통 굵기 24 · 36px이 body로, 굵은 14 – 16px이 heading xsmall · xxsmall로 등록됐다. **이미 등록된 스타일은 이름이 그대로**다 — 스캔은 앵커로 기존 이름을 쓰고, 새 이름은 [이름 다시 짓기](또는 지우고 다시 등록)에서만 나온다. 소수 크기는 새로 만들지 않으므로(아래 "소수 글자 크기") 이미 있는 소수 크기 스타일도 [이름 다시 짓기]에서만 새 분류를 받는다 |
| 단계 | KRDS PC 단계 이름. 크기 값은 바꾸지 않는다 |
| 폴더 | 언제나 `{분류}/` 폴더 안 |
| 소수 · 음수 표기 | 소수점은 `_`(예 `26_7`), 음수는 `m`(예 `-lsm0_3`) — 스타일 이름이 역할 변수 이름이 되고, 피그마 변수 이름은 `.`을 받지 않기 때문. 2026-11-18부터 **소수 글자 크기 스타일은 새로 만들지 않으므로**(아래 "소수 글자 크기") 크기 꼬리의 `_`는 이미 있는 스타일(앵커된 스캔 줄)에만 나온다. 자간 꼬리(`-ls0_5`)는 그대로 |
| 소수 글자 크기 (2026-11-18, QA 5 결함 4 · 사용자 결정 — ia-v3 §2.11 11번 "글자 크기도 정수만") | 글자 크기를 소수 둘째 자리로 반올림한 값이 정수가 아니면(26.67 등) **새 스타일로 만들지 않는다** — 스타일도 글자 크기 변수도 없다. 후보 읽기는 앵커 없는 그 줄을 이름 없이 흐리게 보이고(ia-v4 §4.3 "소수 크기 줄") 이름 짓기 입력에서 뺀다 — 분류 · 단계 경계 · 꼬리는 나머지 후보(정수 크기 + 이미 등록된 스타일에 앵커된 소수 크기)만으로 정한다. **이미 등록된 소수 크기 스타일**은 지우지 않는다 — 스캔에서는 지금처럼 앵커된 "등록됨" 줄로 남아 이름(그 스타일 이름)이 그대로이고 실행하면 이름만 맞춘다(글자 크기 변수는 만들지 않음) |
| 기존 스타일 | 이미 등록된 스타일 이름을 한 번에 KRDS로 바꾸는 기능은 없다([이름 다시 짓기]는 2026-11-24 SC-D15로 없앰 — §5). 스캔은 등록된 스타일을 앵커로 옛 이름 그대로 두고, 그 줄의 이름을 고쳐 등록하면 스타일 이름과 옛 규칙 역할 변수 이름이 함께 바뀐다(§6 "등록 순서") |
| 규칙 밖 크기 | **표시 없음**(2026-11-11 사용자 결정 — KRDS는 이름 짓기의 예시 · 기준이다, §4). 크기는 그대로 두고 이름만 짓는다 |

## 1. KRDS 규칙 (확인된 사실)

| 분류 | PC 크기(px) | 모바일(px) | 용도 |
|---|---|---|---|
| display | large 60 · medium 44 · small 36 | 44 · 32 · 28 | 배너 같은 마케팅용 |
| heading | xlarge 40 · large 32 · medium 24 · small 19 · xsmall 17 · xxsmall 15 | 28 · 24 · 22 · 19 · 17 · 15 | 제목 |
| body | large 19 · medium 17 · small 15 · xsmall 13 | 같음 | 본문 |
| label | large 19 · medium 17 · small 15 · xsmall 13 | 같음 | 버튼 · 입력 같은 UI 글자 |

- 굵기 2종(Regular · Bold), 줄 높이 기본 1.5(150%), 자간 0 또는 0.1rem, 글꼴 Pretendard GOV.
- **heading xxsmall(15)은 이름으로 나오지 않는다(2026-11-19 T4):** 16 미만 글자는 굵어도 body로 보낸다 — 15px 굵은 글자는 `body/small-w700`. 본문 크기대의 굵은 글자는 제목보다 강조된 본문인 경우가 많다는 사용자 판단이다.
- **display small(36)은 이름으로 나오지 않는다:** 36 – 41.99의 굵은 글자는 heading xlarge(40)와 같은 크기대라, 둘 중 하나로만 나와야 이름이 겹치지 않는다. 제목 크기대는 heading이 더 흔하므로 heading/xlarge로 보낸다(§3.2 display = 42 이상).
- **KRDS 크기**(PC + 모바일): 13 · 15 · 17 · 19 · 22 · 24 · 28 · 32 · 36 · 40 · 44 · 60. 이름 짓기의 **예시 · 기준**이다 — 단계 경계 · 기준값(§3.3)이 이 값에서 나온다. 이 모음에 없는 크기(14 · 20 · 26.7 등)도 같은 규칙으로 이름을 짓고, 따로 표시하지 않는다(§4).
- 모바일 크기를 모드로 만드는 일은 범위 밖이다.

## 2. 원칙

- **값은 바꾸지 않는다.** 이름만 KRDS 체계를 따른다(연결은 값이 같은 곳만 붙이므로 — IA v3 §2.11).
- **`{분류}/{단계}`는 그 스타일의 값만으로 정해진다** — 파일이 달라도 같은 값은 같은 분류 · 단계다. **꼬리는 같은 단계에 함께 있는 스타일에 따라 달라진다**(구분이 필요할 때만 붙이므로).
- 이름 짓기는 순수 함수 `src/lib/krdsType.ts`의 `nameKrdsStyles`가 한다 — 만들기 화면 Text Style 탭 · 타이포 스캔 · 기본 램프가 같은 함수를 쓴다. 등록(`createSemanticTextStyles`)은 이름을 짓지 않고 받은 이름을 그대로 쓴다.

## 3. 이름 짓는 규칙

### 3.1 입력
- 스타일 하나 = `{ fontSize, lineHeight(px, 0 = AUTO), lineHeightPercent?, letterSpacing(px), family, style, count, uiCount }`(지금 `StyleCluster` · `ExistingTextStyle` 모양 그대로 + `uiCount`).
  - 스캔 경로: 지금 군집(`StyleCluster`)에 `uiCount`를 더한다 — 그 군집 표본 중 §3.2-1의 UI 역할 안에 있는 표본 수. `count`는 지금처럼 표본 수.
  - 이름 토큰 경로(`path: 'rename'` — 없앤 [이름 다시 짓기]가 쓰던 길. 코드는 그대로 두었고 지금 쓰는 곳은 테스트뿐이다, 2026-11-24 SC-D15): 로컬 스타일 정의. `count` = 0, `uiCount` = 0(쓰인 횟수를 세지 않는다 — 동점은 다음 정렬 키로 간다).
- **굵기:** `weightOf(style) → { weight, italic }` — `exporters.ts splitWeightStyle`을 **감싸는 새 함수**(내보내기 결과는 그대로)로, 이름에서 폭 · 광학 수식어(condensed · narrow · compressed · expanded · extended · wide · display · text · caption · micro)를 뗀 뒤 읽는다. 수식어 앞의 semi · extra · ultra 접두도 함께 뗀다(예 "SemiCondensed Bold" → 700 — "Semi"가 600으로 읽히지 않게, `krdsType.ts` 74–76). 표에 없는 이름은 400. (예: "SemiBold Condensed" → 600, "Book" → 400, "Bold Italic" → 700 · 기울임)
- **줄 높이 %:** `lineHeight`가 0이면 'auto'. `lineHeightPercent`가 있으면 그 값, 아니면 `lineHeight / fontSize × 100`. 정수 반올림해 비교 · 표기한다(149.6 → 150은 150%와 같다).
- **크기 표기값:** 소수 첫째 자리 반올림(26.67 → 26.7, 정수면 정수). 2026-11-18부터 스캔 경로의 이름 짓기에는 정수 크기와 이미 등록된 스타일에 앵커된 소수 크기만 들어오므로(§0 "소수 글자 크기") 소수 표기값은 이미 있는 스타일(앵커)에서만 생긴다. **분류 · 단계 경계 · 기준값 거리 · 크기 꼬리는 모두 이 표기값으로 한다.** 원래 크기는 달라도 표기값이 같은 스타일은 같은 크기로 보고, 이름이 겹치면 §3.8로 간다.

### 3.2 분류 (위에서부터 처음 맞는 것)
1. **label**
   - 스캔: `uiCount > 0`이고 `uiCount × 2 ≥ count`(그래서 쓰인 곳이 없는 기본 램프 — `count` 0 · `uiCount` 0 — 는 label이 아니다, `krdsType.ts krdsCategory`). UI 역할 = 표본 글자 레이어의 부모부터 위로 올라가며 `dsRoleOwner(node)`(bind.ts — `dsRole`을 읽어 어휘 안 · 구조 폴백이 아닌 역할만 돌려줌)가 처음 값을 주는 조상에서 **멈추고**, 그 역할이 `button` · `chip` · `input` · `field` 중 하나면 UI 역할이다(다른 역할이면 UI 아님 — 더 올라가지 않는다). 글자 레이어 자신은 보지 않고, 인스턴스 경계는 넘어 올라간다. 역할이 없으면(이름 정리를 안 한 파일) label이 나오지 않는다 — 한계.
   - 이름 토큰 경로(`'rename'` — 지금 테스트만 쓴다, §3.1): 지금 이름을 `/` `-` `_` 공백으로 나눈 조각 중 하나가 `label` · `button` · `btn` · `chip` · `input` · `field`와 정확히 같을 때(대소문자 무시). (`table` · `tablet`은 해당 없음.) 두 경로의 판정 근거가 달라 같은 값이 스캔에서는 label, 이름 토큰 경로에서는 body가 될 수 있다 — 한계.
2. **display** — 굵기 600 이상 · 크기 42 이상.
3. **heading(크기)** — 크기 21.5 이상(굵기와 관계없이 — 2026-11-19 T1). 보통 굵기 42 이상도 여기(heading xlarge).
4. **heading(굵기)** — 굵기 600 이상 · 크기 16 이상(16 미만 굵은 글자는 body — 2026-11-19 T4).
5. **body** — 그 밖.
- 크기는 모두 표기값(§3.1)으로 견준다(21.46 → 21.5 = heading, 15.96 → 16.0 = 굵으면 heading). 2026-11-18부터 새로 만드는 스타일은 정수 크기뿐이라 실제 경계는 22 · 16이다.
- 예: 24 Regular → `heading/medium-w400` · 36 Regular → `heading/xlarge-w400` · 44 Regular(40 Bold와 함께) → `heading/xlarge-44-w400` · 18 Regular → `body/large` · 16 Bold → `heading/xsmall` · 15 · 14 Bold → `body/small-w700`(같은 크기 Regular가 있으면 그것이 `body/small`) · UI 역할 안의 24 Regular → `label/large`(label이 먼저).

### 3.3 단계 (크기 → 단계, KRDS 값의 중간점이 경계 · 같은 거리면 큰 단계)

| 분류 | 단계 = 크기 범위(px) |
|---|---|
| display | large ≥ 52 · medium 42 – 51.99 |
| heading | xlarge ≥ 36 · large 28 – 35.99 · medium 21.5 – 27.99 · small 18 – 21.49 · xsmall 16 – 17.99 |
| body | large 18 – 21.49 · medium 16 – 17.99 · small 14 – 15.99 · xsmall < 14 |
| label | large ≥ 18 · medium 16 – 17.99 · small 14 – 15.99 · xsmall < 14 |

- 각 단계의 **기준값** = KRDS PC 값(display large 60 · medium 44, heading xlarge 40 · large 32 · medium 24 · small 19 · xsmall 17, body · label large 19 · medium 17 · small 15 · xsmall 13).
- 2026-11-19(T1 · T4)로 바뀐 것: heading xlarge는 위 끝이 없다(보통 굵기 42 이상이 heading으로 오므로 — 굵은 42 이상은 display), body large는 21.5 미만만(21.5 이상은 heading), heading `xxsmall`(< 16)은 없앴다(16 미만은 heading이 되지 않는다). 코드 `KRDS_STEPS`의 각 분류 마지막 단계는 아래 경계 없이 받는다 — heading xsmall도 16 미만이 오면 xsmall이지만 §3.2로 오지 않는다.

### 3.4 앵커 · 이미 있는 이름
- **앵커**(지금 `nameTextStyles` 조건 그대로 — 노드가 그 스타일에 묶였고 시그니처가 같거나, 시그니처가 같은 기존 스타일이 정확히 1개)된 스타일은 기존 이름을 그대로 쓰고, §3.5 ~ §3.8의 꼬리 계산에서 빠진다.
- **이름 예약:** 이 파일의 모든 로컬 텍스트 스타일 이름을 처음부터 "사용 중"으로 둔다(앵커되지 않은 스타일이 관계없는 기존 스타일 이름을 차지해 등록이 그 스타일 값을 덮어쓰지 않게).
- **순서:** §3.5 ~ §3.8로 이름을 다 지은 뒤 예약 이름과 견준다. 겹친 스타일만 **강제 꼬리**: `{분류}/{단계}-{크기}-w{굵기}[i]-{줄높이}` — 크기 · 굵기 · 줄 높이를 생략 없이(150%도 `-150`, 자동은 `-auto`, 기울임은 `i`) 쓰고, §3.8에서 붙은 `-ls…` · 글꼴 꼬리는 그 뒤에 그대로 둔다. 그래도 겹치면(예약 이름 또는 같은 회차의 다른 강제 이름) §3.8-3 정렬 순서대로 `-2` · `-3`을 붙인다. §3.8까지 지은 이름끼리 같아져도(드묾 — 크기 꼬리 `-2`와 §3.8-3의 `-2` 등) 입력 순서로 처음 것만 그 이름을 갖고 뒤의 것은 강제 꼬리를 붙인다(`krdsType.ts` 312–319).

### 3.5 크기 꼬리 — 한 단계에 크기가 둘 이상일 때
- 같은 `{분류}/{단계}`(앵커 제외)의 서로 다른 크기 중 하나만 꼬리 없이, 나머지는 `-{크기}`.
- 꼬리 없이 남는 크기 = 정렬 1등: ① 기준값과의 거리 작은 순 ② 크기별 쓰인 곳(그 크기 스타일들의 `count` 합) 많은 순 ③ 큰 크기.

### 3.6 굵기 꼬리
- **기본 굵기 묶음:** display · heading = 600 이상, body · label = 500 이하. 굵기는 (숫자, 기울임) 한 쌍으로 센다 — 400과 400 기울임은 다른 굵기.
- 같은 `{분류}/{단계}[-크기]` 안에서 기본 묶음에 드는 굵기 중 정렬 1등 하나만 꼬리 없이, 나머지 굵기는 `-w{숫자}`(기울임이면 `-w{숫자}i`).
  - 정렬: ① 쓰인 곳(`count` 합) 많은 순 ② 분류 기본값(display · heading 700, body · label 400)에 가까운 순 ③ 기울임 아님 먼저 ④ 작은 숫자.
- 기본 묶음에 드는 굵기가 하나도 없으면 전부 꼬리가 붙는다(예: 굵은 버튼 글자만 있는 label/medium → `label/medium-w700`, 보통 굵기만 있는 heading/medium → `heading/medium-w400`, 굵은 글자만 있는 body/small → `body/small-w700` — 2026-11-19 T1 · T4). 의도된 동작이다.
- 굵기를 이름이 아니라 숫자로 쓰는 이유: 단계 이름(medium · small …)과 겹쳐 `body/medium-medium`처럼 읽히는 것을 막는다.

### 3.7 줄 높이 꼬리
- 줄 높이가 150%가 아니면 `-{줄 높이 %}`(예 `-120`), 자동이면 `-auto`.

### 3.8 마지막 수단
위 꼬리를 다 붙여도 이름이 같은 스타일들:
1. 자간이 다르면 정렬(① 자간 0 ② 쓰인 곳 많은 순 ③ 절댓값 작은 순 ④ 작은 값) 1등이 그대로, 나머지는 `-ls{자간 px}`(소수 첫째 자리, `_` · `m` 표기 — 예 `-ls0_5` · `-lsm0_3`). 표기가 같아지는 자간은 같은 것으로 보고 다음 단계로.
2. 그래도 같고 글꼴이 다르면 쓰인 곳이 많은 글꼴(같으면 글꼴 이름 순 앞)이 그대로, 나머지는 `-{글꼴 slug}`(예 `-noto-sans-kr`).
3. 그래도 같으면 정렬(쓰인 곳 많은 순 → 시그니처 문자열 순 → 지금 이름 순 → 스타일 id 순) 1등이 그대로, 나머지 `-2` · `-3`(값이 완전히 같은 기존 스타일 둘도 이 순서로 갈린다).

### 3.9 그 밖
- **(없앰 — 2026-11-12 사용자 결정 D1, 도구 탭 PR에서 화면과 함께 지운다. 이름은 줄마다 더블클릭으로 고친다. 아래 두 줄은 그 PR 전까지의 지금 코드)** **"왼쪽 글자로 이름 채우기"**(행 라벨)는 사용자가 누르는 기능이라 그대로 — 라벨 글자 이름이 KRDS 이름을 덮는다. 단 라벨 이름도 §3.4 **이름 예약을 따른다**: 라벨 이름이 예약 이름(앵커되지 않은 줄인데 관계없는 기존 스타일 이름)과 같으면 `-2` · `-3`을 붙인다(`nameTextStylesWithRowLabels`의 `unique`가 앵커 이름만이 아니라 예약 이름 전부를 "사용 중"으로 시작 — 등록이 이름으로 찾아 남의 스타일 값을 덮어쓰지 않게).
- 라벨이 이름처럼 보이는지 판정하는 `LABEL_RAMP_RE`는 지금 코드(`textStyles.ts` 225)에서 `/^(display|heading|body|label|h[1-6]|title|caption|overline)(\/\S+)?$/i`다(KRDS 분류 · 옛 램프 이름 모두 — `/` 뒤 단계 · 꼬리는 `\S+`). 행 라벨 판정 `isRowLabelNameLike`에만 쓰므로 위 "왼쪽 글자로 이름 채우기"와 함께 D1로 지운다.

### 3.10 문자열 비교
- "이름 순" · "시그니처 문자열 순" · "글꼴 이름 순" · "id 순"은 모두 **문자 코드 순**(JS `a < b`, 대소문자 구분, `localeCompare` 쓰지 않음)이다.

## 4. KRDS 크기 표시 — 없음 (2026-11-11 사용자 결정)

- 사용자 결정(UX 검수 C): **"KRDS 기준은 말 그대로 예제이며 기준이다."** KRDS 크기에 없는 정수 크기(예 14 · 20)와 소수 크기(예 26.7)에 붙이던 표시를 모두 없앤다 — ⚠ "소수 크기" · ○ "KRDS 밖" · 툴팁 "KRDS 크기가 아니에요 · 가까운 KRDS 크기 {n}px" · 상태 줄 꼬리 " · KRDS 밖 크기 {k}개(소수 {m})". 크기가 KRDS 값이 아닌 것은 고칠 일이 아니라 그 파일의 선택이고, 표시는 경고처럼 읽혀 "고쳐야 하나"를 묻게 했다.
- **없애는 곳:** 값을 직접 고르기 › 타이포 목록(`#tsList`) 줄 끝 · 타이포 상태 줄(`#tsStatus`) 꼬리 · [이름 다시 짓기] 팝업 줄 끝 · 만들기 화면 Text Style 탭 요약 끝(ia-v4 §4.3).
- **그대로인 것:** 이름 규칙 `{분류}/{단계}` + 꼬리(§3 — 크기 꼬리 `-{크기}`도 그대로), 소수 · 음수 표기(`_` · `m` — §0), 값은 바꾸지 않음(§2), 연결이 소수 글자 크기를 건너뛰는 일과 그 건너뜀 칩(연결 화면 — 사유 `fraction`, ia-v4 §4.2).
- **2026-11-18 바뀜(QA 5 결함 4 — §0 "소수 글자 크기"):** 소수 크기는 표시만 없던 것이 아니라 **새 스타일로 만들지 않는다.** 그래서 이 절이 없앤 "⚠ 소수 크기" 표시 대신, 이미 등록된 스타일에 앵커되지 않은 소수 크기 후보 줄은 흐리게 · 스위치 없이 · 오른쪽 "글자 크기가 소수라 만들지 않아요"(`textStyle.decimalRow`)로 보인다(ia-v4 §4.3 "소수 크기 줄"). KRDS 밖 정수 크기(14 · 20 등)는 지금처럼 표시 없이 만든다.
- **바뀐 모습:**
  - 타이포 목록 줄 끝: 스캔 줄(`count > 0`이고 `nodeIds`가 있음)은 아무것도 없다. 그 밖의 줄(기본 램프 · `count` 0)은 [삭제](`textStyle.rowDelete`)만 — 붙는 조건은 그대로.
  - 타이포 상태 줄: 스캔 요약 · 램프 문구 · 등록 결과 등 앞 문구만 쓴다(꼬리 없음).
  - 팝업 줄: 옛 이름(취소선) → 새 이름 · ("같은 이름이 남아요" — 있을 때) · 스위치.
  - Text Style 탭 줄: 요약 칸(`tr-sub`)은 `tsSummary` 글 하나(기호 `span` 없음).
- **코드에서 지우는 것**
  - `src/ui.ts`: `offMarkEl` · `putOffMark` · `offTail` · `tsStatusBase` · `tsRefreshTail`, `import { offScale } from './lib/krdsType'`. `textStyleCard`의 `putOffMark` 호출, `textStyleEditRow` 크기 칸의 `putOffMark`(입력 때) · `change` 리스너(`tsRefreshTail`), 팝업 줄의 `offMarkEl(r.fontSize, false)`, 만들기 Text Style 탭 줄의 기호(`sub.textContent = tsSummary(s)`만 남김). `setTsStatus(kind, text, cls, tip)`는 꼬리를 붙이지 않으므로 종류 인자가 필요 없다 — `setTsStatus(text, cls, tip)`로 줄이거나 `setStatus('tsStatus', …)`를 바로 쓴다(부르는 곳: `renderTextStyles` · 행 라벨 · 이름 다시 짓기 뒤 · `btnTextStyles` · 램프 · 스캔 결과 · 등록 결과 `TEXT_STYLES_RESULT` — 이 곳은 툴팁 `tip` 인자(알림 목록)를 넘기므로 줄인 함수도 `tip`을 받는다).
  - `src/ui.html`: `.r-top.has-off` · `.r-top.no-check.has-off` · `.ts-off` · `.ts-off.decimal` · `.ts-off.off`.
  - `src/lib/i18n.ts`: `textStyle.offDecimal` · `textStyle.offScale` · `textStyle.offTip` · `textStyle.offSum`.
  - `src/lib/krdsType.ts`: `offScale`, 그리고 `offScale`만 쓰던 `KRDS_SIZES`(크기 모음은 이 문서 §1에만 남긴다). 이름 짓기 함수(`round1` · `krdsStep` · `nameKrdsStyles` 등)는 그대로.
  - `src/shared/messages.ts`: `TsRenameRow`의 `fontSize` · `offScale` · `nearest`(UI가 표시에만 썼다) → `TsRenameRow = {id, from, to, sig}`. 그 주석의 "규칙 밖 크기(§4)"도 지운다.
  - `src/lib/variables.ts` `planTsRename`: `offScale` import · `off` 계산 · 세 필드를 지운다(`existingOf(s)`는 `sig`에 그대로 쓴다). 함수 주석은 그대로.
  - 테스트: `test/pure.test.mjs` `krdsType — offScale …` 테스트와 import(`KRDS_SIZES` · `offScale`) 지움, `test/figma.test.mjs` `planTsRename …` — 이름의 "· 규칙 밖 표시" 빼고, `by.h1` 기대값에서 세 필드 빼고, `by.odd.offScale` · `by.odd.nearest` 확인 지움(`by.odd.to`는 남김). verify-bind-flow 17 · 19는 ia-v4 B.14.

## 5. [이름 다시 짓기] — 없앰 (2026-11-24 사용자 결정 SC-D15)

- 이미 있는 텍스트 스타일 이름을 한 번에 KRDS로 바꾸던 기능(변수 탭 ⋯ 메뉴 "텍스트 스타일 이름 다시 짓기…" · 타이포 카드 [이름 다시 짓기] · 미리보기 팝업 · `SCAN_TS_RENAME` · `APPLY_TS_RENAME`)은 지웠다(ia-v4 §0 "범위 정리 S-1a" · B.37). 단계가 바뀐 스타일을 새 단계 변수로 옮겨 연결하던 일(ia-v3 §2.12 12.12 N-D2a)도 함께 없어졌다.
- 남는 것: 새로 등록하는 스타일의 이름 규칙(§3), 등록 때 기존 스타일 · 옛 규칙 역할 변수 이름을 함께 바꾸는 일(§6 "등록 순서").

## 6. 코드에서 바뀌는 곳

- 새 `src/lib/krdsType.ts`(순수): `KRDS_STEPS`, `weightOf(style)`, `krdsCategory(input, path)`, `krdsStep(category, size)`, `nameKrdsStyles(inputs, { reserved, anchored })`.
- `textStyles.ts`: `nameTextStyles`가 RAMP_NAMES 순위 대신 `nameKrdsStyles`를 쓴다(앵커 조건은 유지, 행 라벨은 예약을 따름 — §3.9). `StyleCluster`에 `uiCount`, `TextSample`에 `uiRole?: boolean`. `LABEL_RAMP_RE` 넓힘(§3.9). `RAMP_NAMES` · 옛 램프는 지운다. 주석 "크기 순(display/h1…)"(code.ts · messages.ts)도 KRDS 이름으로 고친다.
- `rampToSpecs`(스캔 결과가 없을 때의 기본 램프): display/large 60 · heading/large 32 · heading/medium 24 · heading/small 19 = Bold, body/medium 17 · body/small 15 = Regular, 줄 높이 `lineHeightPercent: 150` · `lineHeight = 크기 × 1.5`, 자간 0. 글꼴은 지금처럼 `DEFAULT_TS_FAMILY`(Inter — Pretendard GOV는 설치되지 않았을 수 있다). label 줄은 넣지 않는다(body/medium과 값이 같아 앵커 · 기존 스타일 연결이 모호해지므로). 램프 이름도 §3.4 예약을 따른다 — 같은 이름의 로컬 스타일이 있으면 그 줄은 강제 꼬리를 붙인다(등록이 이름으로 찾아 남의 스타일 값을 덮어쓰지 않게). 이를 위해 이미 있는 `TEXT_STYLE_CANDIDATES.existing:{name, sig}[]`를 reqId 없는 스캔에도 싣고, 그 `name`을 예약 이름으로 쓴다. 순수 함수 `rampToSpecs(family, reserved)`(textStyles.ts)가 예약을 적용한다(램프 폴백 판정 · 문구는 지금 그대로).
- `variables.ts scanTextStyles`: 표본에 `uiRole`(§3.2-1 조상 탐색). `scanExistingTextStyles`는 그대로.
- `variables.ts`: `renameTextRoleVars(pairs)` 공용 함수(직접 만든 변수 거름) + 등록 경로의 되돌림(아래 "등록 순서"). (이름 다시 짓기 적용 함수 `planTsRename` · `applyTsRename`과 메시지 2쌍 `SCAN_TS_RENAME` → `TS_RENAME_PLAN` · `APPLY_TS_RENAME` → `TS_RENAMED`는 2026-11-24 SC-D15로 지움.)
- **등록 순서 — 역할 변수 이름(`renameTextRoleVars`):** 텍스트 스타일 등록이 스타일 이름으로 만든 옛 규칙 역할 변수 `font-size/{이름}` · `line-height/{이름}` · `letter-spacing/{이름}`(3종 — 6-2 PR부터 새 역할 변수는 크기 단계 이름이라 바꾸지 않는다, ia-v3 §2.12 12.12 N-D2)를 플러그인 Semantic 컬렉션(`ownedCollection('semantic')`) 안에서 `{from}` → `{to}`로 바꾼다. 사용자 컬렉션 · 직접 만든 변수(`dsl.manual` — `isManualVar`)는 건드리지 않는다.
  - 바꾸는 방식: 겹침 판정은 **최종 이름 집합**으로, 이름을 하나라도 바꾸기 전에 끝낸다 — (후보가 아닌 모든 변수의 지금 이름) ∪ (후보들의 `to`)에서 `to`가 겹치는 후보를 빼고, 빠진 항목의 지금 이름이 남으므로 더 빠지는 항목이 없을 때까지 반복한다(고정점 — `finalNameTaken`). 그래서 A→B · B→C 연쇄나 A↔B 맞바꿈도 되고, 한 항목이 빠지면 그 이름을 원하던 항목도 함께 빠진다. 최종 집합 밖의 다른 변수와 이름이 겹쳐 빠진 변수는 `taken`에 센다(그 스타일은 옛 이름의 변수에 묶인 채로 남는다).
  - 남은 후보를 모두 임시 이름(`__dsl_tmp_{id}`)으로 바꾼 뒤(1단계) `to`로 바꾼다(2단계 — `twoPhaseRename`). 오류가 난 항목이 생기면 **되돌릴 집합 전체**(오류 항목 + 그 `from`을 `to`로 원하던 항목 … 더 늘지 않을 때까지)를 임시 이름으로 옮긴 뒤 `from`으로 되돌린다(같은 이름이 잠깐이라도 둘 생기지 않게). 직접 오류 · 함께 되돌려진 항목은 `error`에 세고, 되돌리기도 실패한 변수는 `stuck:[지금 이름]`에 남는다.
  - 등록(`createSemanticTextStyles` — 앵커 rename): 0단계에서 변수 이름을 **먼저** 바꾼다 — 3단계 루프가 `font-size/{style.name}`(새 이름)으로 변수를 찾아 붙이므로. 그 뒤 3단계에서 그 스타일의 이름 바꾸기가 끝나지 않으면(`missRename`으로 보류 · 행이 `missError`로 이름을 쓰기 전에 빠짐) 그 스타일의 변수를 `renameTextRoleVars`로 **되돌린다**(`to` → `from`) — 변수 이름만 바뀌고 스타일 이름은 그대로 남지 않게. 되돌림이 실패한 변수는 missing에 `textStyle.missRoleStuck`("{name}: Semantic 변수 이름을 되돌리지 못했어요 — {vars}")로 남긴다. `missFontKeep`은 이름은 바꾸므로 되돌리지 않는다.
- `ui.ts` · `ui.html`: `ui.html` `btnTsRowLabels`의 기본 `title`(지금 `rowLabelTip`과 같은 옛 글)을 고친다. (변수 탭 ⋯ 메뉴 항목 · 타이포 카드 [이름 다시 짓기] · 팝업 · OPS `tsRename`은 2026-11-24 SC-D15로 지움.)
- **타이포 목록 줄 모양(CLAUDE.md "카드 안에 카드")**: 지금 `tsList` 줄은 `resultCard` → `.r-card`(테두리 + 둥근 모서리 + 배경)가 `.step` 카드 안에 쌓인 모양이다. 이 목록의 줄을 구분선 줄(아래 테두리 한 줄, 둥근 모서리 · 배경 · 그림자 없음, 줄 사이 간격 0)로 바꾼다 — 타이포 목록에만(`#tsList .r-card`로 범위를 좁혀, 다른 화면의 `.r-card`는 ia-v4 §2.8 · B.12에서(완료)). 줄 안 내용 · 높이는 그대로.
- **×n 배지 없앰 (2026-11-11 사용자 결정 B)**: 타이포 목록 스캔 줄 오른쪽의 `×{n}` 버튼(그 스타일 후보를 쓰는 글자 레이어 수 · 누르면 그 레이어 선택, `.r-badge`)을 없앤다 — 기호만으로는 뜻과 기능이 읽히지 않는다. 그 자리에 다른 것을 두지 않는다.
  - 줄 끝: 스캔 줄(배지가 있던 줄 — `count > 0`이고 `nodeIds`가 있음)은 아무것도 없다. 그 밖의 줄(기본 램프 줄 등)은 [삭제](`textStyle.rowDelete`)만 — [삭제]가 붙는 조건은 그대로(배지 분기의 else). (2026-11-11 §4 — 그전에는 둘 다 끝에 크기 표시가 붙었다.)
  - 격자: 크기 표시가 없어져(§4) `putOffMark` · `has-off`(표시 칸을 하나 늘리던 격자)도 지운다 — `.r-top`은 체크 · 본문 · 끝(없음 또는 [삭제]) 세 칸 그대로.
  - 함께 지우는 것: 키 `textStyle.badgeGoTip` · `textStyle.badgeSelectTip`, CSS `.r-badge`(타이포 목록 말고 쓰는 곳 없음). `selectNodes`는 다른 곳에서 쓰므로 남긴다.
  - 데이터는 남긴다: `TextStyleSpec.count`(편집 가능 판정 `isEditableTextRow` · 만들기 화면 "Layer {n}"). `TextStyleSpec.nodeIds` · `StyleCluster.nodeIds`는 배지를 지우면 읽는 곳이 없지만 남긴다 — 메시지 모양(`TEXT_STYLE_CANDIDATES`)과 플러그인 테스트를 이번에 바꾸지 않기 위해서다. `textStyles.ts`의 "×N 배지" 주석은 `count`는 지금 쓰임으로, `nodeIds`는 "지금 UI에서 읽지 않음(옛 ×N 배지용 · 메시지 모양 유지)"으로 고친다.
  - 잃는 것: 타이포 목록에서 쓰는 글자 수와 바로 선택. 글자 수는 만들기 화면 Text Style 탭의 "Layer {n}"(누를 수 없음)에서만 보이고, 바로 선택은 대신할 곳이 없다.
  - 옛 와이어프레임(`docs/wireframe-plugin-ia.html` #17 "×N")은 역사 기록으로 그대로 둔다 — 이 결정이 앞선다.
  - 테스트: verify-bind-flow 19 — `#tsList .r-badge` 0개 · `.ts-off` 0개 · `has-off` 0개 · [삭제]가 있는 줄(스캔 응답의 `count: 0` 줄)에서 [삭제]가 그 줄 끝(같은 `.r-top`).
- **문구(i18n, 해요체)**

| 키 | 지금 | 바뀜 / 새 |
|---|---|---|
| `textStyle.rowLabelTip` | "… 짝을 못 찾은 행은 크기 순 이름(display/h1…) 그대로 둬요." | "… 짝을 못 찾은 행은 KRDS 이름(heading/large…) 그대로 둬요." |
| `textStyle.nameSplit` | "… 크기 순 {b}" | "… KRDS 이름 {b}" |
| `textStyle.missRoleStuck` (새) | — | "{name}: Semantic 변수 이름을 되돌리지 못했어요 — {vars}" |
| `textStyle.offDecimal` · `offScale` · `offTip` · `offSum` | "소수 크기" · "KRDS 밖" · "KRDS 크기가 아니에요 · 가까운 KRDS 크기 {n}px" · " · KRDS 밖 크기 {k}개(소수 {m})" | **지움**(2026-11-11 — §4) |

- `textStyle.rename*` · `op.tsRename` 24개([이름 다시 짓기]의 버튼 · 메뉴 · 팝업 · 결과 문구)는 2026-11-24 SC-D15로 지웠다(ia-v4 B.37). `textStyle.missRoleStuck`은 등록이 쓰므로 남는다.
- 테스트: `krdsType` 단위(분류 · 단계 경계 · 꼬리 순서 · 정렬 동점 · 강제 꼬리 · 마지막 수단 · 소수 · 음수 표기 · weightOf · UI 역할 조상에서 멈춤 — 규칙 밖 판정 테스트는 2026-11-11 지움), `nameTextStyles` · `rampToSpecs`(예약) · 행 라벨 예약 바뀐 기대값, 역할 변수 이름 바꾸기(`renameTextRoleVars` — figma 목: 사용자 컬렉션 · 직접 만든 변수 제외 · 같은 이름이 남는 사슬 · 연결된 항목 오류 되돌림), 등록 경로 되돌림(스타일 이름 보류 · 행 오류 시 변수 이름 되돌림), verify-bind-flow(타이포 목록 구분선 줄 — 크기 표시 검사는 2026-11-11 "표시 없음" 검사로 바뀜, ia-v4 B.14).

## 7. 이름 규칙 예 — 2026-11-09 사용자 파일(스크린샷)의 스타일 값에 §3을 적용

이름 규칙(§3)의 예다 — 그 파일의 스타일 값 전체에 §3을 앵커 없이 한 번에 적용했을 때 나오는 이름(이름 토큰 경로 — §3.1. 없앤 [이름 다시 짓기]가 내던 결과다, 2026-11-24 SC-D15). 이미 등록된 스타일은 스캔이 앵커로 옛 이름을 그대로 두므로 이 표의 이름으로 저절로 바뀌지 않는다(아래 h2 26.7은 이미 등록된 스타일이라 지우지 않고 스캔에서도 앵커된 줄로 남는다 — 그 스타일의 글자 크기 변수는 새로 만들지 않는다. 등록된 스타일이 없는 26.67 글자는 스캔에서 흐린 줄이 되고 새로 만들지 않는다 — §0 "소수 글자 크기"). 이 예는 쓰인 곳이 0이라 동점은 다음 정렬 키로 정해진다(크기: 큰 크기, 굵기: 분류 기본값에 가까운 굵기). 2026-11-19 분류 기준(T1 · T4 — §3.2)으로 바뀌는 줄은 없다(21.5 이상 보통 굵기 · 16 미만 굵은 글자가 이 파일에 없음). (옛 표의 "표시" 칸 ⚠ · ○는 2026-11-11 없앴다 — §4.)

| 옛 이름 | 값(크기/줄 높이 · 굵기) | §3 이름 |
|---|---|---|
| display/inter-semi-bold · -2 · -3 | 52/150 · 52/120 · 52/125 SemiBold | display/large · display/large-120 · display/large-125 |
| h1 | 28/120 SemiBold | heading/large-120 |
| h3/inter-semi-bold · -2 | 24/150 · 24/120 SemiBold | heading/medium · heading/medium-120 |
| h2 | 26.7/150 SemiBold | heading/medium-26_7 (24가 기준 24에 더 가까움) |
| title/semi-bold | 20/120 SemiBold | heading/small-120 (20 · 18이 기준 19와 같은 거리 → 큰 크기 20이 꼬리 없음) |
| body/inter-semi-bold · -2 | 18/125 · 18/120 SemiBold | heading/small-18-125 · heading/small-18-120 |
| title/regular | 20/150 Regular | body/large (20이 꼬리 없음) |
| body/inter-regular · -2 · -3 · -4 | 18/180 · 18/150 · 18/120 · 18/120 Regular | body/large-18-180 · body/large-18 · body/large-18-120 · body/large-18-120-2 (셋째 · 넷째가 값이 같으면 지금 이름 순 — §3.8-3) |
| body/inter-medium · -2 · -3 | 18/120 · 18/120 · 18/125 Medium | body/large-18-w500-120 · body/large-18-w500-120-2 (값이 같으면 §3.8-3) · body/large-18-w500-125 |
| caption/inter-regular | 16/125 Regular | body/medium-125 (Regular가 기본값 400에 가까움) |
| caption/inter-medium · -2 | 16/125 · 16/120 Medium | body/medium-w500-125 · body/medium-w500-120 |
| caption/inter-semi-bold · -2 | 16/120 · 16/125 SemiBold | heading/xsmall-120 · heading/xsmall-125 |
| overline | 14/120 Regular | body/small-120 |
| text-9 · -2 | 12/120 Regular (화면으로는 차이를 알 수 없음 — 자간 · 글꼴 중 하나) | body/xsmall-120 · body/xsmall-120-ls{자간}(자간이 다를 때) |
| text-10 | 10/120 Regular | body/xsmall-10-120 (12가 기준 13에 더 가까움) |

## 부록 A. PR 체크리스트 (IA v4 B.9 병합 뒤 — 지금 main)
- [x] `krdsType.ts` + 단위 테스트
- [x] `nameTextStyles` · `rampToSpecs` · `LABEL_RAMP_RE` · 기존 테스트 기대값
- [x] 스캔 표본 `uiRole` · 군집 `uiCount`
- [x] 규칙 밖 표시(타이포 목록 · 상태 줄 꼬리 · 만들기 Text Style 탭 요약 끝 · 팝업) — 2026-11-11 UX 검수 C에서 없앰(아래)
- [x] 행 라벨 이름의 예약 · `existing`을 reqId 없는 스캔에도 · `rampToSpecs(family, reserved)`
- [x] 타이포 목록 줄 구분선 모양(`#tsList`) — 카드 안 카드 해소
- [x] 타이포 목록 ×n 배지 없앰(§6 — 2026-11-11 사용자 결정 B) · 키 2개 · `.r-badge`
- [x] [이름 다시 짓기] — 변수 탭 ⋯ 메뉴 · 타이포 버튼 · 메시지(`SCAN_TS_RENAME` · `APPLY_TS_RENAME`, `tsSig`) · 팝업(구분선 줄 · 스위치 · 모두 켜기/끄기 · 포커스) · 최종 이름 집합 고정점 · 임시 이름 2단계 · 실패 되돌림 · 역할 변수(`renameTextRoleVars` — 직접 만든 변수 거름) · 등록 경로 되돌림 · 바꾼 뒤 `tsSpecs` · `mkTsNames` 비움 · ⌘Z · 공통 유료 잠금 · OPS · 다시 읽기 (→ 2026-11-24 SC-D15로 [이름 다시 짓기]를 없앰 — `renameTextRoleVars` · 등록 경로 되돌림은 남음, ia-v4 B.37)
- [x] ia-v4 반영(§2.6 [보기] 도착 · §4.3 · §4.6 ⋯ 메뉴 · §6 유료 · §7 작업 직후 · 부록 B.10)
- [x] i18n(§6 표) · verify:i18n 0 · verify-bind-flow · 4검사 · 스크린샷
- [ ] 실기 확인(사용자, 피그마): 옛 이름 스타일(`display` · `body` · `h1` …)과 역할 변수(`font-size/body` 등)가 있는 파일에서 새 폴더 이름(`body/medium` · `font-size/body/medium`)이 함께 생기고 바뀌는지 — 피그마가 같은 이름의 폴더와 스타일(`body` 스타일 · `body/` 폴더)을 함께 두는지 · 이름 다시 짓기 · ⌘Z 한 번 (이름 다시 짓기 부분은 2026-11-24 SC-D15로 없어짐)
- [x] **UX 검수 C — KRDS 크기 표시 없앰**(2026-11-11 사용자 결정 · §4 · ia-v4 B.14): `ui.ts` `offMarkEl` · `putOffMark` · `offTail` · `tsStatusBase` · `tsRefreshTail` · `offScale` import · 네 곳의 표시(타이포 목록 · 상태 줄 꼬리 · 팝업 · Text Style 탭), `setTsStatus` 종류 인자
- [x] `ui.html` `.r-top.has-off` · `.r-top.no-check.has-off` · `.ts-off*` 지움, i18n `textStyle.offDecimal` · `offScale` · `offTip` · `offSum` 지움
- [x] `krdsType.ts` `offScale` · `KRDS_SIZES` 지움, `messages.ts` `TsRenameRow`에서 `fontSize` · `offScale` · `nearest` 지움, `variables.ts` `planTsRename` 정리
- [x] 테스트: pure `offScale` 테스트 · import 지움, figma `planTsRename` 기대값, verify 17(Text Style 탭 기호 없음) · 19(타이포 목록 · 팝업 · 상태 줄 표시 없음, `TS_RENAME_PLAN` 줄 필드)
- [x] 바뀌지 않음 확인: 이름 규칙 · 꼬리 · `_` 표기 테스트 그대로 통과, 연결 화면 소수 글자 크기 건너뜀 칩(`fraction`) 그대로
