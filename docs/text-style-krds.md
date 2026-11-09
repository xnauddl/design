# 텍스트 스타일 이름 — KRDS 규칙 (2026-11-09 사용자 확정)

> 대상: 값을 직접 고르기 › 타이포(텍스트 스타일 스캔 · 등록), "한 번에 정리"의 텍스트 스타일 단계, 새 기능 [이름 다시 짓기].
> 근거: KRDS 공식 저장소 토큰(`KRDS-uiux/krds-uiux` — `tokens/transformed_tokens.json`, `resources/css/token/krds_tokens.css`, rem = 10px). 공식 페이지 krds.go.kr › 스타일 › 타이포그래피.
> 사용자 결정: ① 이름 구조는 수정안대로 ② 이미 등록된 스타일은 [이름 다시 짓기]로 바꾼다(b) ③ 규칙 밖 크기는 표시한다.
> 순서: 이 명세 검토 0 → 시안 → IA v4 PR 1 병합 뒤 별도 PR로 구현.

## 0. 결정 요약

| 항목 | 결정 |
|---|---|
| 이름 구조 | `{분류}/{단계}` + 필요할 때만 꼬리 `-{크기}` · `-w{굵기}` · `-{줄 높이 %}` (이 순서) |
| 분류 | KRDS 4분류 display · heading · body · label |
| 단계 | KRDS PC 단계 이름(xlarge · large · medium · small · xsmall · xxsmall). 크기 값은 바꾸지 않는다 |
| 폴더 | 언제나 `{분류}/` 폴더 안 — 폴더 밖 스타일 없음 |
| 글꼴 이름 · `-2` 번호 | 쓰지 않는다(마지막 수단의 `-2`만 — §3.6) |
| 기존 스타일 | [이름 다시 짓기] — 미리보기 → 체크 → 바꾸기(연결 유지, ⌘Z 한 번) |
| 규칙 밖 크기 | 목록 줄에 표시 — 소수 크기 ⚠, KRDS에 없는 정수 크기 ○ |

## 1. KRDS 규칙 (확인된 사실)

| 분류 | PC 크기(px) | 모바일(px) | 용도 |
|---|---|---|---|
| display | large 60 · medium 44 · small 36 | 44 · 32 · 28 | 배너 같은 마케팅용 |
| heading | xlarge 40 · large 32 · medium 24 · small 19 · xsmall 17 · xxsmall 15 | 28 · 24 · 22 · 19 · 17 · 15 | 제목 |
| body | large 19 · medium 17 · small 15 · xsmall 13 | 같음 | 본문 |
| label | large 19 · medium 17 · small 15 · xsmall 13 | 같음 | 버튼 · 입력 · 탭 같은 UI 글자 |

- 굵기 2종(Regular · Bold), 줄 높이 기본 1.5(150%), 자간 0 또는 0.1rem, 글꼴 Pretendard GOV.
- **KRDS 크기 모음**(규칙 밖 판정용, PC + 모바일): 13 · 15 · 17 · 19 · 22 · 24 · 28 · 32 · 36 · 40 · 44 · 60.
- 모바일 크기를 모드로 만드는 일은 이 명세 범위 밖이다.

## 2. 원칙

- **값은 바꾸지 않는다.** 이름만 KRDS 체계를 따른다(연결은 값이 같은 곳만 붙이므로 — IA v3 §2.11).
- **같은 입력이면 같은 이름.** 파일이 달라도 같은 크기 · 굵기 · 줄 높이는 같은 이름이 된다(순위가 아니라 고정 표로 정한다).
- 이름 짓기는 순수 함수(`src/lib/krdsType.ts`)에서 한다 — 스캔 · 등록 · 마법사 · 이름 다시 짓기가 같은 함수를 쓴다.

## 3. 이름 짓는 규칙

### 3.1 분류
위에서부터 처음 맞는 것:
1. **label** — 그 스타일을 쓰는 글자(스캔 표본)의 조상 레이어 역할(`dsRole`, 이름 정리가 남김)이 button · chip · tab · input · checkbox · radio · switch · select 중 하나인 표본이 절반 이상. 기존 스타일(이름 다시 짓기)은 표본이 없으므로 지금 이름에 `label` · `button` · `btn` · `chip` · `tab` · `input` 단어가 있을 때만.
2. **display** — 굵기 600 이상이고 크기 42px 이상.
3. **heading** — 굵기 600 이상.
4. **body** — 그 밖.

### 3.2 단계 (크기 → 단계, KRDS 값의 중간점이 경계 · 같은 거리면 큰 단계)

| 분류 | 단계 = 크기 범위(px) |
|---|---|
| display | large ≥ 52 · medium 42 – 51.99 |
| heading | xlarge 36 – 41.99 · large 28 – 35.99 · medium 21.5 – 27.99 · small 18 – 21.49 · xsmall 16 – 17.99 · xxsmall < 16 |
| body · label | large ≥ 18 · medium 16 – 17.99 · small 14 – 15.99 · xsmall < 14 |

- display는 42px 이상만 들어오므로 small(36)은 쓰지 않는다(36~41 굵은 글자는 heading xlarge).

### 3.3 크기 꼬리 — 한 단계에 크기가 둘 이상일 때
- 같은 `{분류}/{단계}`에 서로 다른 크기가 있으면, KRDS 그 단계 값에 가장 가까운 크기가 꼬리 없이 갖고 나머지는 `-{크기}`(소수는 그대로, 예 `-26.7`).
- 같은 거리면 쓰인 곳이 많은 크기, 그것도 같으면 큰 크기가 꼬리 없이.

### 3.4 굵기 꼬리
- 분류의 **기본 굵기 묶음**: display · heading = 600 이상, body · label = 500 이하.
- 같은 `{분류}/{단계}[-크기]` 안에서 기본 묶음에 드는 굵기 중 쓰인 곳이 가장 많은 굵기는 꼬리 없음. 나머지 굵기는 `-w{굵기 숫자}`(예 `-w500`, 기울임이면 `-w500i`).
- 굵기를 이름(medium · bold …)이 아니라 숫자로 쓰는 이유: 단계 이름(medium · small …)과 겹쳐 `body/medium-medium`처럼 읽히는 것을 막는다. 숫자는 스타일 이름(`Semi Bold` 등)을 100~900으로 바꾼 값이다.

### 3.5 줄 높이 꼬리
- 줄 높이가 150%가 아니면 `-{줄 높이 %}`(예 `-120`)(정수 반올림. px 줄 높이는 크기로 나눠 %로 바꾼다. 자동(AUTO)은 `-auto`).

### 3.6 마지막 수단
- 위 꼬리를 다 붙여도 이름이 같으면(예: 자간만 다름) `-ls{자간}`(px, 예 `-ls0.5`), 그래도 같으면 `-2` · `-3`.

### 3.7 이 규칙을 넘는 경우
- **이미 등록된 스타일과 같은 값**이면(지금 코드의 앵커 — `nameTextStyles` existing) 등록 화면에서는 그 이름을 그대로 둔다. 이름을 바꾸는 일은 [이름 다시 짓기]에서만.
- **"왼쪽 글자로 이름 채우기"**(행 라벨)는 사용자가 누르는 기능이라 그대로 둔다 — 누르면 라벨 글자 이름이 KRDS 이름을 덮는다(지금과 같음).

## 4. 규칙 밖 크기 표시

- 텍스트 스타일 목록(값을 직접 고르기 › 타이포 · 이름 다시 짓기 미리보기)의 줄 끝에 표시:
  - 소수 크기(예 26.7): ⚠ `--danger` 글자 "소수 크기", 툴팁 "KRDS 크기가 아니에요 · 가까운 KRDS 크기 {n}px".
  - KRDS 크기 모음(§1)에 없는 정수 크기(예 18): ○ `--text-2` "KRDS 밖", 툴팁 같은 형식.
- 목록 위 상태 줄에 " · KRDS 밖 크기 {k}개(소수 {m})"를 덧붙인다(0이면 붙이지 않는다).
- 표시만 한다 — 값을 바꾸거나 등록을 막지 않는다.

## 5. [이름 다시 짓기] (사용자 결정 b)

- **자리:** 값을 직접 고르기 › 타이포 카드 툴바 [이름 다시 짓기]. 유료(텍스트 스타일 기능과 같음 — 무료면 잠금 + 사유).
- **대상:** 이 파일의 로컬 텍스트 스타일 전부(선택과 무관). 원격 라이브러리 스타일은 대상이 아니다.
- **미리보기:** `PREVIEW_TEXT_STYLE_RENAME{reqId}` → `TEXT_STYLE_RENAME_PREVIEW{reqId, rows:[{id, from, to, size, offScale}]}`. 줄 = 체크 + 옛 이름(취소선) → 새 이름 + 규칙 밖 표시. 이름이 같은 줄은 보이지 않는다. 기본 모두 켬. 0개면 "바꿀 이름이 없어요".
- **바꾸기:** [k개 이름 바꾸기] → `APPLY_TEXT_STYLE_RENAME{reqId, items:[{id, from, to}]}` → `TEXT_STYLE_RENAMED{reqId, renamed, skipped, skipReasons}`.
  - 스타일 이름만 바꾼다 — 그 스타일을 쓰는 레이어의 연결은 그대로다(피그마 스타일은 id로 연결).
  - 바꾸기 직전 다시 확인: 지금 이름이 `from`과 다르면 건너뜀(사유 "그 사이 이름이 바뀜"), 새 이름이 다른 스타일과 겹치면 건너뜀(사유 "같은 이름이 있음").
  - **역할 변수도 함께:** 플러그인 Semantic 컬렉션에 `font-size/{from}` · `line-height/{from}` · `letter-spacing/{from}` · `font-family/{from}` 변수가 있으면 `/{to}`로 이름을 바꾼다(텍스트 스타일 등록이 스타일 이름으로 역할 변수를 만들기 때문 — `variables.ts` `bindRole = style.name`). 사용자가 직접 만든 변수(`dsl.manual`)와 사용자 컬렉션은 건드리지 않는다. 바꿀 이름이 이미 있으면 그 변수는 건너뛴다.
  - ⌘Z 한 번(스타일 · 변수 이름을 한 묶음으로). 결과: 상태 줄 "텍스트 스타일 {k}개 이름을 바꿨어요 · ⌘Z로 되돌리기" + 건너뜀 수(툴팁에 사유).
- 쓰기 작업(OPS write · 공통 잠금). 끝나면 작업 직후 다시 읽기.

## 6. 코드에서 바뀌는 곳

- 새 `src/lib/krdsType.ts`(순수): `KRDS_SIZES`, `krdsCategory(sample)`, `krdsStep(category, size)`, `weightName(weight)`, `nameKrdsStyles(clusters, opts)` → 이름 + 규칙 밖 판정.
- `textStyles.ts` `nameTextStyles`: RAMP_NAMES 순위 방식을 `nameKrdsStyles`로 바꾼다(앵커 · 행 라벨 동작은 유지). `rampToSpecs`(스캔 결과가 없을 때의 기본 램프)도 KRDS 이름 · 값으로(display/large 60 · heading/large 32 · heading/medium 24 · heading/small 19 · body/medium 17 · body/small 15 · label/medium 17, 줄 높이 150%, Regular/Bold).
- 스캔 표본에 조상 역할(`dsRole`) 단서를 더한다(`TextSample.uiRole`).
- `code.ts` · `messages.ts`: 이름 다시 짓기 메시지 2쌍. `variables.ts`: 역할 변수 이름 바꾸기 함수.
- `ui.ts` · `ui.html`: 타이포 카드 [이름 다시 짓기] · 미리보기 목록 · 규칙 밖 표시 · i18n.
- 테스트: `krdsType` 단위(분류 · 단계 경계 · 꼬리 순서 · 충돌 · 규칙 밖), `nameTextStyles` 바뀐 기대값, 이름 다시 짓기(figma 목: 스타일 · 역할 변수 · manual 제외 · 겹침 건너뜀), verify-bind-flow(타이포 카드 표시 · 이름 다시 짓기 흐름).

## 7. 예 — 2026-11-09 사용자 파일(스크린샷)에 적용

| 지금 | 값(크기/줄 높이 · 굵기) | 새 이름 | 표시 |
|---|---|---|---|
| display/inter-semi-bold · -2 · -3 | 52/150 · 52/120 · 52/125 SemiBold | display/large · display/large-120 · display/large-125 | ○ |
| h1 | 28/120 SemiBold | heading/large-120 | ○ |
| h3/inter-semi-bold · -2 | 24/150 · 24/120 SemiBold | heading/medium · heading/medium-120 | — |
| h2 | 26.7/150 SemiBold | heading/medium-26.7 (24가 KRDS 24에 더 가까움) | ⚠ |
| title/semi-bold · body/inter-semi-bold · -2 | 20/120 · 18/125 · 18/120 SemiBold | heading/small 단계에 20과 18이 함께 — KRDS 19와 둘 다 1 차이라 쓰인 곳이 많은 크기가 꼬리 없음. 예: 18이 많으면 heading/small-125 · heading/small-120 · heading/small-20-120 | ○ |
| title/regular · body/inter-regular … (Regular · Medium) | 20/150 · 18/120~180 | body/large 단계에 20과 18 — 같은 규칙. 예: 18이 많으면 body/large · body/large-180 · body/large-120 · body/large-w500-120 … · body/large-20 | ○ |
| caption/… (Regular · Medium) | 16/120~125 | body/medium-125 · body/medium-w500-125 · body/medium-w500-120 | ○ |
| caption/inter-semi-bold · -2 | 16/120 · 16/125 SemiBold | heading/xsmall-120 · heading/xsmall-125 | ○ |
| overline | 14/120 Regular | body/small-120 | ○ |
| text-9 · -2 | 12/120 Regular | body/xsmall-120 · (두 스타일이 자간만 다르면) body/xsmall-120-ls{자간} | ○ |
| text-10 | 10/120 Regular | body/xsmall-10-120 (12가 KRDS 13에 더 가까움) | ○ |

## 부록 A. PR 체크리스트 (IA v4 PR 1 병합 뒤)
- [ ] `krdsType.ts` + 단위 테스트
- [ ] `nameTextStyles` · `rampToSpecs` KRDS 이름 · 기존 테스트 기대값
- [ ] 스캔 표본 조상 역할(label 판정)
- [ ] 규칙 밖 표시(목록 · 상태 줄)
- [ ] [이름 다시 짓기] — 메시지 · 미리보기 · 바꾸기 · 역할 변수 · ⌘Z · 잠금 · 다시 읽기
- [ ] i18n · verify:i18n 0 · verify-bind-flow · 4검사 · 스크린샷 · 실기 확인
