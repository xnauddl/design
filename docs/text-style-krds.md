# 텍스트 스타일 이름 — KRDS 규칙 (2026-11-09 사용자 확정 · 2026-11-11 IA v4에 맞춰 다시 씀)

> 대상: 이름을 짓는 두 화면 — **만들기 화면 Text Style 탭**(ia-v4 §4.3, `SCAN_TEXT_STYLES{reqId}` → `nameTextStyles`)과 **값을 직접 고르기 › 타이포**(스캔 · 기본 램프) — 그리고 새 기능 [이름 다시 짓기]. v3 마법사는 IA v4 B.4에서 지워졌다(그 텍스트 스타일 단계는 만들기 화면 Text Style 탭이 이어받았다).
> 근거: KRDS 공식 저장소 토큰(`KRDS-uiux/krds-uiux` — `tokens/transformed_tokens.json`, `resources/css/token/krds_tokens.css`, rem = 10px). 공식 페이지 krds.go.kr › 스타일 › 타이포그래피.
> 사용자 결정: ① 이름 구조는 수정안대로 ② 이미 등록된 스타일은 [이름 다시 짓기]로 바꾼다(b) ③ 규칙 밖 크기는 표시한다. 2026-11-11: ④ [이름 다시 짓기]는 **변수 탭 ⋯ 메뉴**에 두고 타이포 카드에도 같은 버튼을 남긴다 ⑤ 규칙 밖 표시는 만들기 화면 Text Style 탭 줄에도 붙인다(요약 끝에 작게) ⑥ 타이포 카드 목록의 "카드 안 카드"(CLAUDE.md)도 이번에 고친다.
> 순서: 이 명세 다시 검토 0 → 시안 → IA v4 B.9 병합 뒤(지금 main) 별도 PR로 구현.

## 0. 결정 요약

| 항목 | 결정 |
|---|---|
| 이름 구조 | `{분류}/{단계}` + 필요할 때만 꼬리 `-{크기}` · `-w{굵기}` · `-{줄 높이 %}` (이 순서, §3.8 마지막 수단 꼬리는 그 뒤) |
| 분류 | KRDS 4분류 display · heading · body · label |
| 단계 | KRDS PC 단계 이름. 크기 값은 바꾸지 않는다 |
| 폴더 | 언제나 `{분류}/` 폴더 안 |
| 소수 · 음수 표기 | 소수점은 `_`(예 `26_7`), 음수는 `m`(예 `-lsm0_3`) — 스타일 이름이 역할 변수 이름이 되고, 피그마 변수 이름은 `.`을 받지 않기 때문 |
| 기존 스타일 | [이름 다시 짓기](변수 탭 ⋯ 메뉴 · 타이포 카드) — 팝업에서 미리보기 → 스위치 → 바꾸기(연결 유지, ⌘Z 한 번) |
| 규칙 밖 크기 | 표시 — 소수 크기 ⚠, KRDS 크기 모음에 없는 정수 크기 ○(만들기 화면 Text Style 탭 · 타이포 목록 · 이름 다시 짓기 팝업) |

## 1. KRDS 규칙 (확인된 사실)

| 분류 | PC 크기(px) | 모바일(px) | 용도 |
|---|---|---|---|
| display | large 60 · medium 44 · small 36 | 44 · 32 · 28 | 배너 같은 마케팅용 |
| heading | xlarge 40 · large 32 · medium 24 · small 19 · xsmall 17 · xxsmall 15 | 28 · 24 · 22 · 19 · 17 · 15 | 제목 |
| body | large 19 · medium 17 · small 15 · xsmall 13 | 같음 | 본문 |
| label | large 19 · medium 17 · small 15 · xsmall 13 | 같음 | 버튼 · 입력 같은 UI 글자 |

- 굵기 2종(Regular · Bold), 줄 높이 기본 1.5(150%), 자간 0 또는 0.1rem, 글꼴 Pretendard GOV.
- **display small(36)은 이름으로 나오지 않는다:** 36 – 41.99의 굵은 글자는 heading xlarge(40)와 같은 크기대라, 둘 중 하나로만 나와야 이름이 겹치지 않는다. 제목 크기대는 heading이 더 흔하므로 heading/xlarge로 보낸다(§3.2 display = 42 이상).
- **KRDS 크기 모음**(규칙 밖 판정용, PC + 모바일): 13 · 15 · 17 · 19 · 22 · 24 · 28 · 32 · 36 · 40 · 44 · 60.
- 모바일 크기를 모드로 만드는 일은 범위 밖이다.

## 2. 원칙

- **값은 바꾸지 않는다.** 이름만 KRDS 체계를 따른다(연결은 값이 같은 곳만 붙이므로 — IA v3 §2.11).
- **`{분류}/{단계}`는 그 스타일의 값만으로 정해진다** — 파일이 달라도 같은 값은 같은 분류 · 단계다. **꼬리는 같은 단계에 함께 있는 스타일에 따라 달라진다**(구분이 필요할 때만 붙이므로).
- 이름 짓기는 순수 함수 `src/lib/krdsType.ts`의 `nameKrdsStyles`가 한다 — 만들기 화면 Text Style 탭 · 타이포 스캔 · 기본 램프 · 이름 다시 짓기가 같은 함수를 쓴다. 등록(`createSemanticTextStyles`)은 이름을 짓지 않고 받은 이름을 그대로 쓴다.

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
   - 스캔: `uiCount × 2 ≥ count`. UI 역할 = 표본 글자 레이어의 부모부터 위로 올라가며 `dsRoleOwner(node)`(bind.ts — `dsRole`을 읽어 어휘 안 · 구조 폴백이 아닌 역할만 돌려줌)가 처음 값을 주는 조상에서 **멈추고**, 그 역할이 `button` · `chip` · `input` · `field` 중 하나면 UI 역할이다(다른 역할이면 UI 아님 — 더 올라가지 않는다). 글자 레이어 자신은 보지 않고, 인스턴스 경계는 넘어 올라간다. 역할이 없으면(이름 정리를 안 한 파일) label이 나오지 않는다 — 한계.
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
- **이름 예약:** 이 파일의 모든 로컬 텍스트 스타일 이름을 처음부터 "사용 중"으로 둔다(앵커되지 않은 스타일이 관계없는 기존 스타일 이름을 차지해 등록이 그 스타일 값을 덮어쓰지 않게). 이름 다시 짓기에서는 대상 스타일 자신의 지금 이름은 예약하지 않는다(§5.2 · §5.3).
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
- **"왼쪽 글자로 이름 채우기"**(행 라벨)는 사용자가 누르는 기능이라 그대로 — 라벨 글자 이름이 KRDS 이름을 덮는다. 단 라벨 이름도 §3.4 **이름 예약을 따른다**: 라벨 이름이 예약 이름(앵커되지 않은 줄인데 관계없는 기존 스타일 이름)과 같으면 `-2` · `-3`을 붙인다(`nameTextStylesWithRowLabels`의 `unique`가 앵커 이름만이 아니라 예약 이름 전부를 "사용 중"으로 시작 — 등록이 이름으로 찾아 남의 스타일 값을 덮어쓰지 않게).
- 라벨이 이름처럼 보이는지 판정하는 `LABEL_RAMP_RE`(지금 `/^(display|h[1-6]|title|body|caption|overline)(\/\S+)?$/i`)를 `/^(display|heading|body|label|h[1-6]|title|caption|overline)(\/\S+)?$/i`로 넓힌다(KRDS 분류 · 옛 램프 이름 모두 — `/` 뒤 단계 · 꼬리는 지금처럼 `\S+`).

### 3.10 문자열 비교
- "이름 순" · "시그니처 문자열 순" · "글꼴 이름 순" · "id 순"은 모두 **문자 코드 순**(JS `a < b`, 대소문자 구분, `localeCompare` 쓰지 않음)이다.

## 4. 규칙 밖 크기 표시

- 판정(크기는 §3.1 표기 기준): 소수 → `'decimal'`, §1 KRDS 크기 모음에 없는 정수 → `'off'`, 있으면 `null`. **가까운 KRDS 크기** `nearest` = §1 모음에서 가장 가까운 값, 같은 거리면 큰 값.
- **타이포 목록 · 이름 다시 짓기 팝업** 줄 끝:
  - `'decimal'`: ⚠ `--danger` "소수 크기", 툴팁 "KRDS 크기가 아니에요 · 가까운 KRDS 크기 {nearest}px".
  - `'off'`: ○ `--text-2` "KRDS 밖", 같은 툴팁.
- **만들기 화면 Text Style 탭 줄**(480px — 견본 Aa · 이름 칩 · 요약 · 상태 · Layer n · 스위치가 이미 있음): 글자 없이 기호만 요약 글(`tsSummary` — 예 "Inter · 16 / 24px / 0 · Regular") 끝에 붙인다(예 "Inter · 26.7 / 40px / 0 · SemiBold ⚠"). 기호는 요약 칸(`tr-sub`) 안의 별도 `span`(툴팁 · 접근성 이름을 따로 가짐 — 지금 요약은 `textContent` 하나라 이 `span`을 덧붙이는 모양으로 바꾼다) — ⚠ `--danger` · ○ `--text-2`, 툴팁은 위와 같은 글(앞에 "소수 크기" · "KRDS 밖"을 붙여 "소수 크기 · KRDS 크기가 아니에요 · …"), 접근성 이름에도 같은 글.
- 타이포 목록의 표시는 **그릴 때** 계산한다 — 기본 램프 줄에서 크기를 고치면(`isEditableTextRow`의 크기 칸) 그 줄의 표시와 상태 줄 꼬리를 다시 계산한다(크기 칸 `input` 때 그 줄 표시만 바꾸고, 꼬리는 `change` 때). 스캔 줄은 크기를 고칠 수 없다.
- **꼬리를 다시 붙이는 법:** 상태 줄에 쓴 앞 문구와 그 종류(스캔 요약 · 램프 문구 · 등록 결과 · 그 밖)를 기억해 둔다(`tsStatusBase = { kind, text }`). 꼬리를 다시 계산할 때 종류가 스캔 요약 · 램프 문구면 그 문구 + 새 꼬리로 다시 쓰고, 등록 결과 · 그 밖(이름 다시 짓기 결과 등)이 떠 있으면 줄 표시만 바꾸고 상태 줄은 그대로 둔다.
- 타이포 상태 줄(`#tsStatus`, 목록 **아래**) 끝에 " · KRDS 밖 크기 {k}개(소수 {m})" — k = 표시가 붙은 **스타일(줄) 수**, m = 그중 소수, 0이면 붙이지 않는다. 이 꼬리는 스캔 · 램프 결과 문구(`renderTextStyles`의 스캔 요약 · 기본 램프 문구) 뒤에만 붙이고, 등록 결과(`TEXT_STYLES_RESULT`)가 상태 줄을 덮으면 붙이지 않는다.
- 표시만 한다 — 값을 바꾸거나 등록을 막지 않는다.

## 5. [이름 다시 짓기] (사용자 결정 b)

### 5.1 자리 · 잠금
- **변수 탭 ⋯ 메뉴**에 "텍스트 스타일 이름 다시 짓기…"(새 키 `textStyle.renameMenu`) — 마지막 항목 "그룹 모두 접기" 뒤, 앞에 구분선(`separatorBefore`). 선택과 무관하게 파일 전체에 쓰는 기능이라 "변수 탭 = 파일" 규칙에 맞는다(2026-11-11 사용자 결정).
- **값을 직접 고르기 › 타이포 카드** 둘째 줄([왼쪽 글자로 이름 채우기] 옆)에 같은 동작의 [이름 다시 짓기](`textStyle.renameBtn`). 툴바 첫 줄([스캔] … [✓ 레이어에 바로 연결] [등록])은 그대로다.
- 유료(텍스트 스타일 기능과 같음) — **공통 유료 잠금**: 타이포 버튼은 `PAID_FIELDS`에 넣어 `aria-disabled` + 지금 공통 툴팁(`setLockTitle` → `lock.tipSuffix`), ⋯ 메뉴 항목은 무료면 `disabled` + 메모 `status.paid`. 누르면 지금 공통 유료 안내(`status.paid` + [라이선스])와 같다.
- 쓰기 작업 — OPS 표(메시지 종류가 열쇠)에 `APPLY_TS_RENAME: { results: ['TS_RENAMED'], label: 'op.tsRename'(새 키 "텍스트 스타일 이름 바꾸기"), go: 변수 탭, write: true }`. 미리보기 `SCAN_TS_RENAME`은 읽기라 OPS에 넣지 않고 `opSilent`로 보낸다(진행 테두리 없음). 다른 쓰기 작업 중이면 메뉴 항목은 `disabled` + 메모 `writeLockReason`, 타이포 버튼은 `WAIT_LINK_IDS`에 넣어 미리 잠그고(연결 · 쓰기 중 잠금), 팝업 안 [{k}개 이름 바꾸기]도 `writeLockReason`이 있으면 `aria-disabled` + 그 사유 — 작업이 끝나면(공통 잠금 해제 때) 다시 계산해 풀린다. 끝나면 작업 직후 다시 읽기(ia-v4 §7 — 목록에 "텍스트 스타일 이름 바꾸기"를 더한다).
- 글꼴: 이 기능은 스타일의 **이름만** 쓴다 — 피그마는 이름 쓰기에 글꼴을 요구하지 않으므로(ia-v4 §4.3 "글꼴") 글꼴을 불러오지 않는다. 글꼴이 없는 스타일도 이름은 바뀐다(`missFontKeep`과 무관).

### 5.2 팝업(미리보기)
- 메시지: `SCAN_TS_RENAME{reqId}` → `TS_RENAME_PLAN{reqId, rows:[{id, from, to, sig, fontSize, offScale, nearest}]}`(연결 화면의 `PREVIEW_TEXT_STYLES`와 헷갈리지 않는 이름). `sig` = `tsSig`(textStyles.ts — 크기 · 줄 높이 px · 자간 · 글꼴 · 스타일)의 문자열, 바꾸기 때 그대로 돌려보낸다.
- 대상: 이 파일의 로컬 텍스트 스타일 전부(선택과 무관). 이름 = §3을 그 전체에 한 번에 적용한 결과(앵커 없음, count 0).
- **모양:** 상세 팝업과 같은 틀(`openModal`) — 제목 "이름 다시 짓기 · 바꿀 이름 {n}개"(`textStyle.renameHead`). 몸통 맨 위 "모두 켜기 · 모두 끄기"(`bind.allOn` · `bind.allOff`), 그 아래 줄 목록. 줄 = **구분선 줄**(아래 테두리 한 줄 — 테두리 · 둥근 모서리 · 배경 없음, CLAUDE.md "카드 안에 카드") 높이 30: 옛 이름(취소선, `--text-2`) → 새 이름 + §4 표시(**기호만** ⚠ · ○ — 글은 툴팁) + 오른쪽 스위치. 넘치면 **옛 이름부터 말줄임**(최소 60px), 그다음 새 이름 말줄임 — 기호 · 스위치는 늘 보인다, 줄 툴팁 = "{옛 전체 이름} → {새 전체 이름}"(ia-v4 §2.7 스위치와 같은 모양, `aria-label` "{옛 이름} → {새 이름}"). 이름이 같은 스타일은 보이지 않는다. 기본 모두 켬. 0개면 "바꿀 이름이 없어요"(`textStyle.renameNone`).
- 응답 전: 몸통에 "스타일을 읽는 중…"(새 키 `textStyle.renameReading` — 선택이 아니라 파일 전체를 읽으므로 `v4.reading` "선택을 읽는 중…"을 쓰지 않는다), 진행 테두리 없음(목록만 읽는 짧은 작업). 팝업 아래: [{k}개 이름 바꾸기](`textStyle.renameApply`, k = 켠 수, 0이면 `aria-disabled` · 사유 `textStyle.renameNeedOn` "바꿀 이름을 켜 주세요") · [닫기].
- 끈 줄은 지금 이름을 유지한다 — 그 이름과 켠 줄의 새 이름이 겹치면 켠 줄에 "같은 이름이 남아요"(`textStyle.renameClash`) 표시 + 그 줄은 바꾸기에서 빠진다(k에도 세지 않는다).
- **포커스:** 열면 [닫기]; 응답이 와서 줄이 있으면 첫 줄 스위치로 옮긴다(사용자가 그 사이 포커스를 옮겼으면 그대로). 팝업 안 순서: 모두 켜기 · 모두 끄기 → 줄 스위치(↑↓) → [{k}개 이름 바꾸기] → [닫기]. [닫기] · Esc · 바꾸기 뒤에는 팝업을 연 버튼 · 메뉴 버튼(⋯ 또는 타이포 [이름 다시 짓기])으로 돌아간다.
- 팝업이 떠 있는 동안 뒤 화면(타이포의 [등록] · [왼쪽 글자로 이름 채우기] · 바로 연결 체크 등)은 팝업에 가려 누를 수 없다(공통 팝업 규칙) — 미리보기 중 다른 컨트롤 규칙이 따로 필요 없다.

### 5.2b 바꾼 뒤 화면 정리
- 바꾸기가 끝나면(`TS_RENAMED`) 팝업을 닫고, `renamed` ≥ 1이면:
  - **타이포 스캔 표**(`tsSpecs`)가 있었으면 비운다(빈 표) → 표 그리기 → 상태 줄에 결과 문구 + " · 스캔 표를 비웠어요 — 다시 [스캔]해 주세요"(`textStyle.renameClearedTable`)를 쓴다(빈 표를 그릴 때 상태 줄을 지우는 동작보다 뒤에 써서 문구가 남게). 표를 비운 뒤에는 「왼쪽 글자로 이름 채우기」(`btnTsRowLabels`)를 끈다(`disabled`) — 다음 reqId 없는 `TEXT_STYLE_CANDIDATES`가 와서 표를 다시 채우면 지금 규칙(`disabled = !styles.length`)대로 다시 정한다. 옛 이름으로 [등록]해 이름이 되돌아가거나, 앵커 없는 줄이 바뀐 이름과 겹쳐 남의 스타일 값을 덮어쓰는 일을 막는다. 손으로 고친 이름 · 행 라벨 이름도 함께 없어진다(받아들임). 자동으로 다시 스캔하지 않는다 — 스캔은 지금 선택을 읽어 그 사이 바뀐 선택이나 빈 선택(기본 램프)으로 표를 엉뚱하게 덮을 수 있다.
  - **만들기 화면의 고친 이름**(`mkTsNames` — 시그니처 열쇠)을 모두 비운다: 남겨 두면 다음 실행의 앵커 rename이 바꾼 이름을 옛 손 이름으로 되돌린다. 만들기 화면이 열려 있으면 다시 읽는다(작업 직후 다시 읽기).
  - 결과 문구는 공통 상태 줄(`showStatusLine`, 사유 툴팁)에 쓴다. 타이포 표를 비운 경우에는 **어느 화면에서 실행했든** `#tsStatus`에도 결과 문구 + 비운 이유를 써 둔다(⋯ 메뉴로 실행한 뒤 타이포에 돌아와도 비운 이유가 남게). 표를 비우지 않았으면 `#tsStatus`는 건드리지 않는다.
- `renamed` = 0이면 표 · 고친 이름은 그대로 두고 결과 문구만.

### 5.3 바꾸기
- `APPLY_TS_RENAME{reqId, items:[{id, from, to, sig}]}` → `TS_RENAMED{reqId, results:[{id, status, name}], renamed, skipped, skipReasons, roleVarsRenamed, roleVarsTaken, roleVarsError, roleVarsStuck}` — `status` = `'renamed'` 또는 건너뜀 사유 코드, `name` = 끝난 뒤 그 스타일의 지금 이름. `sig` = 미리보기 때의 `tsSig`.
- 다시 확인(스타일마다): 지금 이름이 `from`이 아니면 건너뜀 `'renamed-meanwhile'`, 시그니처가 `sig`와 다르면 `'value-changed'`.
- 겹침 판정은 **최종 이름 집합**으로, 이름을 하나라도 바꾸기 전에 끝낸다: 통과 후보 = 다시 확인을 통과한 항목. (후보가 아닌 모든 스타일의 지금 이름) ∪ (후보들의 `to`)에서 `to`가 겹치는 후보를 건너뜀 `'name-taken'`으로 빼고, 빠진 항목의 지금 이름이 남으므로 **더 빠지는 항목이 없을 때까지 반복**한다(고정점). 그래서 A→B · B→C 연쇄나 A↔B 맞바꿈도 되고, 한 항목이 빠지면 그 이름을 원하던 항목도 함께 빠진다.
- 바꾸는 순서: 남은 후보를 모두 임시 이름(`__dsl_tmp_{id}`)으로 바꾼 뒤(1단계) `to`로 바꾼다(2단계). 1단계나 2단계에서 오류가 난 항목은 `from`으로 되돌리고 `'error'`, 되돌리기도 실패하면 `'error-stuck'`(결과 툴팁에 그 스타일의 지금 이름 `name`을 적는다). **연쇄 되돌림:** 1단계를 모든 후보에 끝낸 뒤 2단계로 간다. 어느 단계든 오류가 난 항목이 생기면, 먼저 **되돌릴 집합 전체**를 계산한다 — 오류 항목 + 그 `from`을 `to`로 원하던 항목, 그 항목의 `from`을 원하던 항목 … 더 늘지 않을 때까지(닫힘). 그 집합을 모두 임시 이름(`__dsl_tmp_{id}`)으로 옮긴 뒤 `from`으로 바꾼다(되돌림도 2단계 — 같은 이름이 잠깐이라도 둘 생기지 않게). 직접 오류가 난 항목은 `'error'`, 함께 되돌려진 항목은 `'error-chain'`으로 센다. 되돌림 2단계에서도 실패하면 `'error-stuck'`.
- **역할 변수는 스타일 바꾸기가 끝난 뒤:** `status: 'renamed'`인 항목의 `{from, to}`만 넘긴다(되돌려진 스타일의 변수는 건드리지 않는다). 변수 쪽 실패는 스타일 이름을 되돌리지 않는다. 결과는 `roleVarsTaken`(같은 이름이 있어 건너뜀) · `roleVarsError`(바꾸기 오류 — 되돌림, 되돌리지 못한 변수는 `roleVarsStuck:[지금 이름]`)으로 나눠 센다.
- **역할 변수도 함께:** 텍스트 스타일 등록이 스타일 이름으로 만드는 역할 변수 `font-size/{이름}` · `line-height/{이름}` · `letter-spacing/{이름}`(3종 — `variables.ts createSemanticTextStyles`)를 플러그인 Semantic 컬렉션(`ownedCollection('semantic')`) 안에서 `{from}` → `{to}`로 바꾼다. 사용자 컬렉션 · 직접 만든 변수(`dsl.manual` — `isManualVar`, variables.ts)는 건드리지 않는다. 지금 등록 경로의 `roleRenames`는 직접 만든 변수를 거르지 않으므로, 이번에 함께 걸러지게 바뀐다(동작 변경). 역할 변수도 스타일과 **같은 방식**(최종 이름 집합 · 고정점 · 임시 이름 2단계 · 실패 시 되돌림)으로 바꾼다 — 최종 집합 밖의 다른 변수와 이름이 겹치는 변수만 건너뛰고 `roleVarsTaken`에 센다(그 스타일은 옛 이름의 변수에 묶인 채로 남는다). 지금 `createSemanticTextStyles` 안의 `roleRenames` 처리를 이 방식의 공용 함수 `renameTextRoleVars(pairs)`로 바꿔 두 경로가 함께 쓴다.
- **두 경로의 순서가 다르다:**
  - 이름 다시 짓기: 스타일 이름을 모두 바꾼 **뒤** `status: 'renamed'`인 항목의 변수만 바꾼다(위).
  - 등록(`createSemanticTextStyles` — 앵커 rename): 지금처럼 0단계에서 변수 이름을 **먼저** 바꾼다 — 3단계 루프가 `font-size/{style.name}`(새 이름)으로 변수를 찾아 붙이므로. 그 뒤 3단계에서 그 스타일의 이름 바꾸기가 끝나지 않으면(`missRename`으로 보류 · 행이 `missError`로 이름을 쓰기 전에 빠짐) 그 스타일의 변수를 `renameTextRoleVars`로 **되돌린다**(`to` → `from`) — 변수 이름만 바뀌고 스타일 이름은 그대로 남지 않게. 되돌림이 실패한 변수는 missing에 `textStyle.missRoleStuck`(새 키 "{name}: Semantic 변수 이름을 되돌리지 못했어요 — {vars}")로 남긴다. `missFontKeep`은 이름은 바꾸므로 되돌리지 않는다.
- ⌘Z 한 번(스타일 · 변수 이름을 한 묶음 — `commitUndo`).
- 결과(상태 줄): "텍스트 스타일 {renamed}개 이름을 바꿨어요 · ⌘Z로 되돌리기" + 건너뛴 것이 있으면 " · 건너뜀 {skipped}"(툴팁에 사유별 수) + " · 역할 변수 {roleVarsTaken}개는 같은 이름이 있어 그대로 뒀어요"(있을 때) + " · 역할 변수 {roleVarsError}개는 바꾸지 못했어요"(있을 때, 툴팁에 되돌리지 못한 변수의 지금 이름).

## 6. 코드에서 바뀌는 곳

- 새 `src/lib/krdsType.ts`(순수): `KRDS_SIZES`, `KRDS_STEPS`, `weightOf(style)`, `krdsCategory(input, path)`, `krdsStep(category, size)`, `offScale(size) → { kind: 'decimal' | 'off' | null, nearest }`, `nameKrdsStyles(inputs, { reserved, anchored })`.
- `textStyles.ts`: `nameTextStyles`가 RAMP_NAMES 순위 대신 `nameKrdsStyles`를 쓴다(앵커 조건은 유지, 행 라벨은 예약을 따름 — §3.9). `StyleCluster`에 `uiCount`, `TextSample`에 `uiRole?: boolean`. `LABEL_RAMP_RE` 넓힘(§3.9). `RAMP_NAMES` · 옛 램프는 지운다. 주석 "크기 순(display/h1…)"(code.ts · messages.ts)도 KRDS 이름으로 고친다.
- `rampToSpecs`(스캔 결과가 없을 때의 기본 램프): display/large 60 · heading/large 32 · heading/medium 24 · heading/small 19 = Bold, body/medium 17 · body/small 15 = Regular, 줄 높이 `lineHeightPercent: 150` · `lineHeight = 크기 × 1.5`, 자간 0. 글꼴은 지금처럼 `DEFAULT_TS_FAMILY`(Inter — Pretendard GOV는 설치되지 않았을 수 있다). label 줄은 넣지 않는다(body/medium과 값이 같아 앵커 · 기존 스타일 연결이 모호해지므로). 램프 이름도 §3.4 예약을 따른다 — 같은 이름의 로컬 스타일이 있으면 그 줄은 강제 꼬리를 붙인다(등록이 이름으로 찾아 남의 스타일 값을 덮어쓰지 않게). 이를 위해 이미 있는 `TEXT_STYLE_CANDIDATES.existing:{name, sig}[]`(지금은 reqId 스캔에서만 보냄)를 reqId 없는 스캔에도 싣고, 그 `name`을 예약 이름으로 쓴다. 순수 함수 `rampToSpecs(family, reserved)`(textStyles.ts)가 예약을 적용한다(램프 폴백 판정 · 문구는 지금 그대로).
- `variables.ts scanTextStyles`: 표본에 `uiRole`(§3.2-1 조상 탐색). `scanExistingTextStyles`는 그대로.
- `variables.ts`: `renameTextRoleVars(pairs)` 공용 함수(직접 만든 변수 거름) + 이름 다시 짓기 적용 함수 + 등록 경로의 되돌림(§5.3). `code.ts` · `messages.ts`: 메시지 2쌍(`SCAN_TS_RENAME` → `TS_RENAME_PLAN`, `APPLY_TS_RENAME` → `TS_RENAMED`).
- `ui.ts` · `ui.html`: 변수 탭 ⋯ 메뉴 항목 · 타이포 카드 [이름 다시 짓기](`PAID_FIELDS`) · 이름 다시 짓기 팝업 · OPS `tsRename` · §4 표시(타이포 목록 · 만들기 Text Style 탭 · 팝업) · 바꾼 뒤 `tsSpecs` · `mkTsNames` 비움. `ui.html` `btnTsRowLabels`의 기본 `title`(지금 `rowLabelTip`과 같은 옛 글)도 고친다.
- **타이포 목록 줄 모양(CLAUDE.md "카드 안에 카드")**: 지금 `tsList` 줄은 `resultCard` → `.r-card`(테두리 + 둥근 모서리 + 배경)가 `.step` 카드 안에 쌓인 모양이다. 이 목록의 줄을 구분선 줄(아래 테두리 한 줄, 둥근 모서리 · 배경 · 그림자 없음, 줄 사이 간격 0)로 바꾼다 — 타이포 목록에만(`#tsList .r-card`로 범위를 좁혀, 다른 화면의 `.r-card`는 UX 검수 C에서). 줄 안 내용 · 높이는 그대로.
- **문구(i18n, 해요체)**

| 키 | 지금 | 바뀜 / 새 |
|---|---|---|
| `textStyle.rowLabelTip` | "… 짝을 못 찾은 행은 크기 순 이름(display/h1…) 그대로 둬요." | "… 짝을 못 찾은 행은 KRDS 이름(heading/large…) 그대로 둬요." |
| `textStyle.nameSplit` | "… 크기 순 {b}" | "… KRDS 이름 {b}" |
| `textStyle.renameBtn` (새) | — | "이름 다시 짓기" |
| `textStyle.renameMenu` (새) | — | "텍스트 스타일 이름 다시 짓기…" |
| `textStyle.renameReading` (새) | — | "스타일을 읽는 중…" |
| `op.tsRename` (새) | — | "텍스트 스타일 이름 바꾸기" |
| `textStyle.missRoleStuck` (새) | — | "{name}: Semantic 변수 이름을 되돌리지 못했어요 — {vars}" |
| `textStyle.renameHead` (새) | — | "이름 다시 짓기 · 바꿀 이름 {n}개" |
| `textStyle.renameNone` (새) | — | "바꿀 이름이 없어요" |
| `textStyle.renameApply` (새) | — | "{k}개 이름 바꾸기" |
| `textStyle.renameNeedOn` (새) | — | "바꿀 이름을 켜 주세요" |
| `textStyle.renameClash` (새) | — | "같은 이름이 남아요" |
| `textStyle.renamed` (새) | — | "텍스트 스타일 {n}개 이름을 바꿨어요 · ⌘Z로 되돌리기" |
| `textStyle.renameSkipped` (새) | — | " · 건너뜀 {m}" |
| `textStyle.renameRoleSkipped` (새) | — | " · Semantic 변수 {n}개는 같은 이름이 있어 그대로 뒀어요" |
| `textStyle.renameRoleError` · `renameRoleStuck` (새) | — | " · Semantic 변수 {n}개는 바꾸지 못했어요" · "되돌리지 못한 변수: {names}" |
| `textStyle.renameSkip.renamed-meanwhile` · `value-changed` · `name-taken` · `error` · `error-chain` · `error-stuck` (새) | — | "그 사이 이름이 바뀜" · "그 사이 값이 바뀜" · "같은 이름이 있음" · "오류" · "연결된 항목 오류로 되돌림" · "되돌리지 못함 · 지금 이름 {name}" |
| `textStyle.renameClearedTable` (새) | — | " · 스캔 표를 비웠어요 — 다시 [스캔]해 주세요" |
| `textStyle.offDecimal` · `offScale` · `offTip` · `offSum` (새) | — | "소수 크기" · "KRDS 밖" · "KRDS 크기가 아니에요 · 가까운 KRDS 크기 {n}px" · " · KRDS 밖 크기 {k}개(소수 {m})" |

- 테스트: `krdsType` 단위(분류 · 단계 경계 · 꼬리 순서 · 정렬 동점 · 강제 꼬리 · 마지막 수단 · 소수 · 음수 표기 · 규칙 밖 · weightOf · UI 역할 조상에서 멈춤), `nameTextStyles` · `rampToSpecs`(예약) · 행 라벨 예약 바뀐 기대값, 이름 다시 짓기(figma 목: 연쇄 · 맞바꿈 · 임시 이름 · 역할 변수 · 사용자 컬렉션 · 직접 만든 변수 제외 · 겹침 건너뜀 · 값 바뀜 · **값을 쓰지 않음** — `loadFontAsync`가 던지고 값 쓰기를 막는 목에서도 이름이 바뀜), 등록 경로 되돌림(스타일 이름 보류 · 행 오류 시 변수 이름 되돌림), verify-bind-flow(⋯ 메뉴 · 타이포 버튼 → 팝업 · 스위치 · 모두 켜기/끄기 · 바꾸기 · 표 비움 · 포커스 복귀, 만들기 Text Style 탭 ⚠ · ○, 타이포 목록 구분선 줄).
- 동적 키 `textStyle.renameSkip.*`는 `verify:i18n`이 잡지 못하므로 손으로 확인한다.

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

## 부록 A. PR 체크리스트 (IA v4 B.9 병합 뒤 — 지금 main)
- [ ] `krdsType.ts` + 단위 테스트
- [ ] `nameTextStyles` · `rampToSpecs` · `LABEL_RAMP_RE` · 기존 테스트 기대값
- [ ] 스캔 표본 `uiRole` · 군집 `uiCount`
- [ ] 규칙 밖 표시(타이포 목록 · 상태 줄 꼬리 · 만들기 Text Style 탭 요약 끝 · 팝업)
- [ ] 행 라벨 이름의 예약 · `existing`을 reqId 없는 스캔에도 · `rampToSpecs(family, reserved)`
- [ ] 타이포 목록 줄 구분선 모양(`#tsList`) — 카드 안 카드 해소
- [ ] [이름 다시 짓기] — 변수 탭 ⋯ 메뉴 · 타이포 버튼 · 메시지(`SCAN_TS_RENAME` · `APPLY_TS_RENAME`, `tsSig`) · 팝업(구분선 줄 · 스위치 · 모두 켜기/끄기 · 포커스) · 최종 이름 집합 고정점 · 임시 이름 2단계 · 실패 되돌림 · 역할 변수(`renameTextRoleVars` — 직접 만든 변수 거름) · 등록 경로 되돌림 · 바꾼 뒤 `tsSpecs` · `mkTsNames` 비움 · ⌘Z · 공통 유료 잠금 · OPS · 다시 읽기
- [ ] ia-v4 반영(§2.6 [보기] 도착 · §4.3 · §4.6 ⋯ 메뉴 · §6 유료 · §7 작업 직후 · 부록 B.10)
- [ ] i18n(§6 표) · verify:i18n 0 · verify-bind-flow · 4검사 · 스크린샷
- [ ] 실기 확인(사용자, 피그마): 옛 이름 스타일(`display` · `body` · `h1` …)과 역할 변수(`font-size/body` 등)가 있는 파일에서 새 폴더 이름(`body/medium` · `font-size/body/medium`)이 함께 생기고 바뀌는지 — 피그마가 같은 이름의 폴더와 스타일(`body` 스타일 · `body/` 폴더)을 함께 두는지 · 이름 다시 짓기 · ⌘Z 한 번
