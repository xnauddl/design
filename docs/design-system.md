# 플러그인 디자인 시스템 — 명세

> 2026-11-25 작성 · 검토 4회(중대 13 → 4 → 2 → 1 → 0, 남은 사소는 구현 때 고침), 디자인 방향 DS-D5–DS-D9 반영. 결정은 `docs/redesign/brief.md` §7 · §8. 리디자인 세션(SC-D30)의 첫 일이다.
> 이 문서가 토큰 · 컴포넌트 · 레이아웃 · 사용 규칙의 **단일 명세**다. 토큰 값의 **단일 원본**은 `design-tokens/tokens.json`이고, 이 문서의 표는 그 원본과 같아야 한다(다르면 원본이 맞고 표를 고친다).
> 본문 §3의 값은 **최종 값(DS-1 ② 단계 뒤)** 이다. ① 단계의 임시 값과 옮기기 규칙은 부록 A.
> 기준: 본문 §0–§9에 중대 결함 0(CLAUDE.md 4단계). 부록 A(옮기기)와 B(체크리스트)는 DS-1 PR에서 닫는다.

## 0. 결정 요약

| 항목 | 결정 |
|---|---|
| 디자인 방향 (DS-D5) | **Modern Minimalism · 모노크롬.** Primary `#111111`. 장식 · 과한 색 · 복잡한 카드를 줄이고 정보 구조 · 가독성 · 정렬 · 간격을 앞세운다. 상태색은 상태를 알릴 때만(brief §8). |
| 단계 (DS-D1 · DS-D6) | **DS-1(지금, 한 PR에 두 단계)** — ① 옮기기: 토큰 원본 + `src/ui.html` · `src/ui.ts` · `src/treeList.ts`의 직접 값을 토큰으로(값은 지금과 거의 같음 — 부록 A) ② 새 값: 토큰 원본의 값만 §3의 최종 값으로. **DS-2** 공통 컴포넌트 30종 · 레이아웃 9종 + 개발용 모음 화면. **DS-3** 리디자인(작업별 탭 · Header · 하단 실행 줄 · 영어 문구, brief). |
| 컴포넌트 범위 (DS-D2) | 요청 목록 **30종 전부**(§6). 지금 화면에 없는 5종(Split Button · Radio · Breadcrumb · Table · Toast)도 만든다. |
| 간격 (DS-D3) | 4px 격자(4 · 8 · 12 · 16 · 20 · 24 · 32 · 40) + 2px. |
| Figma (DS-D4) | 코드 먼저. 원본을 JSON(DTCG)으로 두어 나중에 이 플러그인으로 Figma 변수를 만든다. |
| 상태색 대비 (DS-D7) | Success `#16845B` · Warning `#B7791F` · Error `#D64545`는 **지정 값 그대로** 글자에도 쓴다. 4.5:1 미달은 열린 결함(§9)으로 적고 대비 검사의 예외 목록에 둔다. |
| Information (DS-D8) | **모노크롬** — `#111111` 글자 + ⓘ 아이콘 + Neutral 100 바탕. |
| 둥글기 (DS-D9) | xs 4(16px 이하 작은 요소) · small 6 · medium 8 · large 10 · full. |
| 테마 | 밝은 테마만. 이름이 역할 기준이라 나중에 다크 테마를 더할 수 있다(범위 밖). |
| 기술 | 프레임워크 없이 지금 구조(순수 TS + 한 장의 HTML). 지금 id · 클래스 이름은 바꾸지 않는다. `scripts/verify-bind-flow.mjs`는 id · 클래스와 함께 **CSS 변수 이름 · 계산된 색 · 일부 px 값**도 읽는다 — DS-1이 그 검사를 새 이름 · 새 값에 맞춘다(부록 B.8). |

## 1. 원칙

1. **모든 스타일 값은 토큰에서 온다.** 색 · 글꼴 · 글자 크기 · 굵기 · 줄 높이 · 자간 · 간격 · 둥글기 · 그림자 · 테두리 굵기(0 · 1px 제외) · 겹침 순서 · 움직임 시간은 화면 코드에 직접 쓰지 않는다. 검사가 막는다(§8).
2. **화면 코드는 Semantic(과 꼭 필요한 Component) 토큰만 쓴다.** Global은 토큰 원본 안에서만.
3. **역할로 이름 짓는다.** `--color-text-secondary`는 "보조 글자"이지 "회색 700"이 아니다.
4. **색은 한 단계 참조.** Semantic · Component **색** 토큰은 Global 색 하나를 가리킨다. 색이 아닌 묶음 토큰(그림자 · 포커스 링)은 Semantic 색을 가리킬 수 있다(§2.2).
5. **필요한 상태만.** 컴포넌트마다 Default · Hover · Active · Focus · Disabled · Loading 중 뜻이 있는 것만(§6).
6. **색만으로 상태를 가르지 않는다.** 상태는 글자 또는 아이콘을 함께 쓴다. Information은 색이 모노크롬이라 ⓘ 아이콘이 필수다.
7. **카드 안에 카드를 넣지 않는다**(CLAUDE.md UI 규칙 · `docs/ia-v4.md` §2.8). Modal도 카드다 — Modal 안에는 Alert "상자"가 아니라 "띠"를 쓴다.
8. **새 값이 필요하면 토큰부터 더한다**(§7.2).
9. **사용자가 숫자로 정한 치수는 지킨다.** `docs/ia-v4.md`에 사용자 결정으로 적힌 px(트리 들여쓰기 V-D6 · 목록 줄 왼쪽 2px TR-D13 · 알약 글자 11.5px 등)는 간격 격자에 맞추지 않고 Component 토큰으로 옮긴다(§3.8). 바꾸려면 사용자 결정을 다시 받는다.

## 2. 토큰 구조

### 2.1 세 층

| 층 | 무엇 | 예 | 어디서 쓰나 |
|---|---|---|---|
| **Global** | 원재료 색 | `--global-neutral-800` = #333333 | 토큰 원본 안에서만 |
| **Semantic** | 역할 | `--color-text-primary` → `global.neutral-800` | 화면 코드 |
| **Component** | 한 컴포넌트 · 한 화면 전용 값 | `--chip-value-bg` · `--tree-content-x` | 그 컴포넌트 CSS에서만 |

- 색 이외(글자 · 간격 · 둥글기 · 크기 · 그림자 · 움직임 · 겹침)는 Global 층 없이 Semantic 층에 바로 둔다.
- 이 플러그인이 사용자 파일에 만드는 Global → Semantic 구조와 같은 방식이다.

### 2.2 원본 파일 · 이름 · 빌드

- **원본:** `design-tokens/tokens.json` — DTCG 형식(토큰마다 `$value` · `$type` · `$description`, Global은 `$description` 생략 가능). `$description` = §3 표의 "쓰임".
- **그룹(JSON 첫 마디 = CSS 이름 첫 마디):** `global` · `color` · `text`(글자 묶음) · `font-family` · `font-size` · `font-weight` · `line-height` · `letter-spacing` · `space` · `radius` · `border-width` · `focus-ring` · `elevation` · `size` · `motion` · `z` · `opacity` · Component 그룹(`chip` · `swatch` · `checker` · `nav` · `tree` · `pill` · `toggle` · `list`).
- **그룹 안 키**는 하이픈으로 이은 한 단어다(`color.text-secondary`). 토큰이 그룹을 겸하지 않는다(DTCG 규칙) — 그래서 `focus-ring.default` · `focus-ring.field`처럼 둘 다 키로 둔다.
- **CSS 이름:** `--{그룹}-{키}`. 예: `global.neutral-800` → `--global-neutral-800`, `color.text-secondary` → `--color-text-secondary`, `focus-ring.default` → `--focus-ring-default`.
- **참조:** `$value` 안에 `{그룹.키}`(예: `{global.neutral-800}` · `{color.background-primary}`). 빌드가 `var(--그룹-키)`로 바꾼다(값을 복사하지 않음 — 개발자 도구에서 사슬이 보인다).
- **빌드:** `build.mjs`가 원본을 읽어 `:root { … }` CSS를 만들고 `src/ui.html` `<style>` 안의 자리 표시 `/* @design-tokens */`에 넣어 `dist/ui.html`을 만든다. `:root`의 `color-scheme: light`는 `ui.html`에 그대로 남긴다. watch 모드는 `tokens.json`이 바뀌어도 다시 빌드한다.
- Figma 변수 이름(`/` 나눔)은 DS-D4 때 정한다.

### 2.3 런타임 변수 (토큰이 아님)

화면이 재거나 그림으로 넣는 값은 토큰이 아니다. 아래 이름만 허용한다(검사 예외 — §8-3).

| 이름 | 넣는 곳 | 뜻 |
|---|---|---|
| `--tabs-h` · `--head-top` · `--toolbar-top` · `--toolbar-h` · `--side-top` | `ui.ts`(고정 줄 높이 재기) | 붙어 다니는 줄의 top · 높이 |
| `--prog` | `ui.ts`(진행 표시) | 진행 비율(%) |
| `--band-ic` | `ui.html`(안내 띠 규칙) | 띠 앞 아이콘 그림(data URI) |

## 3. Design Tokens (최종 값)

### 3.1 Color

#### Global — Foundation (DS-D5)

| 토큰 | 값 | | 토큰 | 값 |
|---|---|---|---|---|
| `primary` | #111111 | | `success` | #16845B |
| `neutral-800` | #333333 | | `success-50` | #E8F3EF |
| `neutral-700` | #555555 | | `success-300` | #B9DACE |
| `neutral-500` | #999999 | | `warning` | #B7791F |
| `neutral-300` | #D9D9D9 | | `warning-50` | #F8F2E9 |
| `neutral-200` | #ECECEC | | `warning-300` | #E9D7BC |
| `neutral-100` | #F5F5F5 | | `error` | #D64545 |
| `white` | #FFFFFF | | `error-50` | #FBECEC |
| `black-a15` | rgba(0,0,0,.15) | | `error-300` | #F3C7C7 |
| `black-a30` | rgba(0,0,0,.3) | | | |

- 사용자가 준 Foundation 8색 + 상태색 3색이 기본이다. `-50` · `-300`은 상태색을 흰색에 10% · 30% 섞은 옅은 짝(알림 바탕 · 테두리용 — 지정 값이 없어 이 문서가 정함). `black-a*`는 견본 테두리 · 모달 막.

#### Semantic (34)

| 묶음 | 토큰 | ← Global | 쓰임 |
|---|---|---|---|
| Primary | `color-primary` | primary | 주 실행 버튼 바탕 · 켠 스위치 · 진행 막대 · 고른 탭 표시 |
| | `color-primary-hover` | neutral-800 | 주 실행 버튼 hover · 누름 바탕 |
| | `color-primary-subtle` | neutral-100 | 고른 항목 · 강조 영역의 옅은 바탕 |
| | `color-text-on-primary` | white | 주 실행 버튼 위 글자 · 아이콘 |
| Secondary | `color-secondary-bg` | white | 보조 버튼 바탕 |
| | `color-secondary-border` | neutral-300 | 보조 버튼 테두리 |
| Background | `color-background-primary` | white | 플러그인 창 전체 바탕 |
| Surface | `color-surface-primary` | white | 카드 · 모달 · 메뉴처럼 바탕 위에 놓인 면 |
| | `color-surface-secondary` | neutral-100 | 입력 칸 바탕 · 옅은 채움 · 트랙 · 보조 영역 |
| | `color-surface-selected` | neutral-200 | 목록에서 고른 줄의 바탕 |
| | `color-surface-inverse` | primary | 툴팁 · 짙은 배지처럼 어두운 면 |
| Border | `color-border-default` | neutral-200 | 구분선 · 카드 · 입력 칸 기본 테두리 |
| | `color-border-strong` | neutral-300 | hover한 입력 칸 · 체크박스 테두리 · 강조 구분선 |
| Text | `color-text-primary` | neutral-800 | 본문 · 제목 · 버튼 글자 |
| | `color-text-emphasis` | primary | 가장 중요한 글자 · 핵심 아이콘 · 고른 탭 · 고른 내비 글자 |
| | `color-text-secondary` | neutral-700 | 보조 설명 · 목록 둘째 줄 · 라벨 |
| | `color-text-tertiary` | neutral-500 | 자리 표시 글 · 비활성 · 장식 아이콘 **만** (⚠ DS-O1) |
| | `color-text-link` | primary | 글자 링크 · 링크 버튼(밑줄로 구분) |
| | `color-text-inverse` | white | 어두운 면 · 오류 버튼 위 글자 |
| Success | `color-state-success` | success | 완료 · 성공 글자와 아이콘 |
| | `color-state-success-subtle` | success-50 | 성공 알림 바탕 |
| Warning | `color-state-warning` | warning | 주의 글자와 아이콘 |
| | `color-state-warning-subtle` | warning-50 | 주의 알림 바탕 |
| Error | `color-state-error` | error | 오류 글자 · 삭제 버튼 바탕 |
| | `color-state-error-subtle` | error-50 | 오류 알림 바탕 |
| | `color-state-error-border` | error-300 | 오류 알림 · 오류 입력 칸 테두리 |
| Information | `color-state-info` | primary | 안내 글자와 아이콘(ⓘ 필수 — DS-D8) |
| | `color-state-info-subtle` | neutral-100 | 안내 알림 바탕 |
| | `color-state-info-border` | neutral-300 | 안내 알림 테두리 |
| Interactive | `color-interactive-hover` | neutral-100 | 누를 수 있는 것을 hover할 때 바탕 |
| | `color-interactive-focus` | primary | 키보드 포커스 링 · 체크된 체크박스 · 고르개 테두리 |
| | `color-interactive-focus-hover` | neutral-800 | 포커스 색 위 hover · 링크 hover |
| | `color-interactive-focus-subtle` | neutral-200 | 입력 칸 포커스의 옅은 띠 |
| Overlay | `color-overlay` | black-a30 | 모달 뒤를 가리는 막 |

#### Component 색 (7)

| 토큰 | ← Global | 쓰임 |
|---|---|---|
| `chip-value-bg` | neutral-800 | 변수 칩 값 칸 바탕(짙음) |
| `chip-value-text` | neutral-300 | 변수 칩 값 칸 글자 |
| `chip-alias-text` | primary | 변수 칩 별칭 칸 글자 |
| `swatch-border` | primary | 목록 줄 색 동그라미 테두리(V-D5) |
| `swatch-outline` | black-a15 | 사용자 색 견본의 옅은 테두리 |
| `checker-color` | neutral-300 | 투명 무늬(체커) 칸 |
| `nav-selected-badge-bg` | primary | 고른 사이드 항목의 개수 배지 바탕(V-D5) |

- 쓰는 곳이 없어진 `--beta` · `--beta-subtle`(S-1b에서 지움)은 토큰으로 만들지 않는다.
- 사용자 데이터 색(변수 값 · 견본 · 팔레트)은 토큰이 아니다(§8-2 예외).

### 3.2 Typography

| 토큰 | 값 |
|---|---|
| `font-family-sans` | "Inter", -apple-system, "Segoe UI", "Apple SD Gothic Neo", sans-serif |
| `font-family-mono` | ui-monospace, "SF Mono", Menlo, monospace |
| `font-size-xs` · `-sm` · `-md` · `-lg` · `-xl` | 10 · 11 · 12 · 13 · 16px |
| `font-weight-regular` · `-medium` · `-semibold` · `-bold` | 400 · 500 · 600 · 700 |
| `line-height-none` · `-tight` · `-snug` · `-normal` | 1 · 1.25 · 1.4 · 1.5 (배수 — 자식이 배수로 물려받음) |
| `line-height-xs` · `-sm` · `-md` | 12px · 14px · 16px (작은 글자를 줄 높이에 딱 맞출 때) |
| `letter-spacing-tight` · `-normal` | -0.1px · 0 |

**글자 묶음(DS-2부터 컴포넌트가 씀 — DS-1은 원재료 토큰으로 1:1 옮김)**

| 계층 | 토큰 | 굵기 / 크기 / 줄 높이 | 쓰임 |
|---|---|---|---|
| Display | `text-display` | 600 / 16 / 1.5 | 빈 화면 · 완료 화면 큰 제목(창에 하나) |
| Heading | `text-heading` | 600 / 13 / 1.5 | 하위 화면 제목 · 모달 제목 |
| | `text-heading-sm` | 600 / 12 / 1.4 | 카드 제목 · 묶음 머리 |
| Body | `text-body` | 400 / 12 / 1.5 | 본문 문장(기본 — `body`) |
| | `text-body-sm` | 400 / 11 / 1.4 | 보조 설명 · 목록 둘째 줄 · 툴팁 |
| Label | `text-label` | 600 / 12 / 1 | 버튼 · 탭 · 입력 라벨 |
| | `text-label-sm` | 600 / 11 / 1 | 작은 버튼 · 표 머리 |
| Caption | `text-caption` | 700 / 10 / 14px | 배지 · 개수 |
| (코드) | `text-mono` | 400 / 11 / 1.4 mono | 값 · 이름 · 코드 |

- 제목(`text-display` · `text-heading`)은 `letter-spacing-tight`, 나머지 0. 제목을 크게 키우지 않는다(최대 16px — DS-D5).
- 글자 묶음 토큰은 CSS `font` 한 줄 값이다(`font: var(--text-body)`). DS-1에서 `font:` 한 줄 직접 값은 같은 값의 원재료 토큰으로 바꾼다(예: `font: var(--font-weight-bold) var(--font-size-xs)/var(--line-height-sm) var(--font-family-sans)`) — 굵기 · 줄 높이가 바뀌지 않게.

### 3.3 Spacing

| 토큰 | 값 | 쓰임 |
|---|---|---|
| `space-0-5` | 2px | 아이콘–글자 사이 · 칩 · 배지 안쪽 · 작은 붙임 |
| `space-1` | 4px | 붙은 요소 사이 · 작은 컨트롤 안쪽 |
| `space-2` | 8px | 한 줄 안 요소 사이(기본 gap) · 컨트롤 안쪽 |
| `space-3` | 12px | 카드 안쪽 · 창 양옆 여백 · 버튼 좌우 안쪽 |
| `space-4` | 16px | 묶음 사이 · 모달 안쪽 |
| `space-5` | 20px | 큰 묶음 사이 |
| `space-6` | 24px | 절 사이 |
| `space-8` | 32px | 빈 상태 위아래 |
| `space-10` | 40px | 빈 상태 · 모달 바깥 위 여백 |

- `padding*` · `margin*` · `gap` · `row-gap` · `column-gap`은 이 토큰 · Component 치수 토큰(§3.8) · `0` · `auto` · `-1px`(테두리 겹치기)만 쓴다. 그 밖의 음수는 `calc(-1 * var(--space-…))`.
- 옮길 때 값 맞추는 법은 부록 A.3.

### 3.4 Radius (DS-D9)

| 토큰 | 값 | 쓰는 컴포넌트 |
|---|---|---|
| `radius-none` | 0 | 구분선 줄 · Table · List Item |
| `radius-xs` | 4px | 16px 이하 작은 요소 — Checkbox · 색 견본 · Badge · 코드 조각 · 작은 버튼(sm) |
| `radius-small` | 6px | Button · Icon Button · Input · Textarea · Select · Search Field · Tab · Navigation Item · Tooltip |
| `radius-medium` | 8px | Card · 메뉴 · 고르개 · Alert 상자 |
| `radius-large` | 10px | Modal · Confirm Dialog · Toast |
| `radius-full` | 9999px | Tag(칩) · 알약 · Toggle · Radio · 동그라미 견본 · 진행 막대 |

`border-radius`는 이 토큰 · `0` · `inherit`만.

### 3.5 Border · Shadow · Focus

| 토큰 | 값 | 쓰임 |
|---|---|---|
| `border-width-medium` | 1.5px | 고른 견본 · 강조 테두리 |
| `border-width-thick` | 2px | 포커스 링 · 고른 밑줄 · 진행 돌기 |
| `focus-ring-default` | `0 0 0 2px {color.background-primary}, 0 0 0 4px {color.interactive-focus}` | 버튼 · 탭 · 체크 등 누르는 것의 `:focus-visible` |
| `focus-ring-field` | `0 0 0 3px {color.interactive-focus-subtle}` | 입력 칸 포커스 띠(테두리 색 `color-interactive-focus`는 각 규칙에서 따로 바꿈) |
| `elevation-0` | none | 바탕에 붙은 것 |
| `elevation-1` | `0 1px 1.5px rgba(17,17,17,.05)` | 주 버튼 · 고른 세그먼트 탭 |
| `elevation-2` | `0 1px 2px rgba(17,17,17,.06), 0 2px 6px rgba(17,17,17,.05)` | 메뉴 · 툴팁 · 고르개 · Toast |
| `elevation-3` | `0 8px 24px rgba(17,17,17,.16)` | Modal · Confirm Dialog |
| `toggle-knob-shadow` | `0 1px 1px rgba(0,0,0,.2)` | Toggle 손잡이(Component) |

- 테두리 굵기(`border*`의 굵기)는 `0` · `1px` · 토큰만. 1px는 머리카락 선이라 직접 쓴다.
- `box-shadow` · `outline`은 `none` · `0` · `1px` · `inset` · `solid` · `inherit` · 토큰만(예: `inset 0 0 0 var(--border-width-medium) var(--color-interactive-focus)`, `outline: var(--border-width-thick) solid var(--color-interactive-focus)`).
- 그림자는 떠 있는 것(메뉴 · 툴팁 · 모달)에만. **카드에는 그림자를 쓰지 않는다**(DS-D5 — ② 단계에서 카드의 `elevation-1`을 뺀다, 부록 A.4).

### 3.6 Size

| 토큰 | 값 | 쓰임 |
|---|---|---|
| `size-control-sm` · `-md` · `-lg` | 24 · 28 · 32px | Button · Icon Button · Input · Select · Search Field 높이 |
| `size-icon-sm` · `-md` · `-lg` | 12 · 16 · 20px | 아이콘(선 굵기 1.5px로 통일 — DS-2) |
| `size-checkbox` | 14px | Checkbox · Radio |
| `size-toggle-w` × `size-toggle-h` | 28 × 16px | Toggle 트랙 |
| `size-avatar-sm` · `-md` | 16 · 24px | 사람 · 파일 표시(지금 쓰는 곳 없음 — 모음 화면에서만) |
| `size-modal-sm` · `-md` | 320 · 400px | Modal 너비(창이 좁으면 `100% - 2 × space-4`까지) |
| `size-header` | 40px | Plugin Header · Page Header |
| `size-nav` | 36px | Navigation(탭 줄 — ia-v4 §8) |
| `size-action-bar` | 52px | Bottom Action Bar |
| `size-compact` | 26px | 촘촘한 칸 높이 — 알약 · 편집 팝업 칸 · 목록 머리 검색(ia-v4 §8 "검색 26") · 색 입력 (표 아래) |
| `size-hit-min` | 24px | 누르는 곳 최소(ia-v3 §2.10) |

- 버튼 · 입력의 높이는 **`height`로** 정한다(`height: var(--size-control-md)`, 좌우 `padding`만, 위아래 0). 지금처럼 위아래 padding + 줄 높이로 높이를 만들지 않는다.
  - 높이는 **기본 `button` 규칙과 한 줄 입력(`input[type=text]` · `input[type=number]` · `select`)에만** 준다. `textarea`는 높이를 주지 않는다.
  - 아래 버튼은 글자 안에 놓이거나 자기 모양이 있어 `height: auto`로 지금 높이를 지킨다: `button.link` · `button.link-btn`(`.sel-diff` 안 포함 — 24 이하) · `.step-chip` · `.ctx-menu button` · `.var-use` · `.ed-copy`. 작은 한 줄 입력 `.ts-edit input`(텍스트 스타일 편집 줄, 지금 약 21) · `select.r-role`(색 목록 역할 고르개, 지금 약 24)도 `height: auto`로 둔다(위아래 padding 3 → 4는 A.3대로 받아들여 약 2px 커짐). 자기 `height`를 이미 정한 버튼 · 칸(`.bv-switch` · `.mk-row button` · `.tr-edit` 22 · `.subtab` 32 등)은 맞는 크기 토큰이 있으면 토큰으로, 없으면 그 값 그대로(너비 · 높이는 검사 밖 — §3.6 마지막 줄).
  - 탭: `.tabs`는 `min-height: var(--size-nav)`(36 — 지금과 같음) · 안쪽 `space-0-5`, `.tab-btn`은 `height: var(--size-control-sm)`(24 — 지금과 같음), `.tab-min` 28은 `size-control-md`.
- **26px 칸**은 모두 `size-compact`로 한다(28로 올리지 않음 — 옆 줄과 맞춘 값이라): `.vp-pill .vp-item` · `.make-opts` · `.ed-field`(min-height) · `.ed-go` · `.ed-type` · `.list-head .search-box input` · `input[type="color"]`, 그리고 그 칸과 줄을 맞춘 `line-height: 26px`(`.ed-dl dt` · `dd.ed-plain`).
- 너비 · 높이의 다른 px(열 폭 88 · 견본 14 등)는 검사하지 않는다 — DS-2에서 컴포넌트로 옮길 때 정한다.

### 3.7 Motion · 겹침 · 투명도

| 토큰 | 값 | 쓰임 |
|---|---|---|
| `motion-duration-fast` | 120ms | hover · 펼침 · 손잡이 이동 (지금 .1s · .12s) |
| `motion-duration-spin` | 900ms | 돌기 한 바퀴 (지금 .9s · 1s) |
| `z-below` | -1 | 그림 뒤에 까는 장식 |
| `z-raised` | 1 | 붙는 카드 머리 · 도구 줄 |
| `z-sticky` | 2 | 붙는 목록 머리 · 아래 실행 줄(`.vl-head` · `.make-foot`) |
| `z-sticky-top` | 3 | 탭 줄 · 목록 머리(`#varList .list-head`) |
| `z-fixed` | 20 | 창 바닥 상태 줄 · 고르개 펼침 |
| `z-popover` | 30 | 고정 툴팁(`#uiTip`) |
| `z-modal` | 40 | 모달 막 |
| `z-menu` | 50 | ⋯ 메뉴(`.ctx-menu`) |
| `z-tooltip` | 60 | 표 툴팁(`.vt-tip`) · Toast |
| `opacity-disabled` | .5 | `:disabled` 버튼 · 꺼진 스위치 — 흐리되 읽힘(DS-D5 "과하게 흐리지 않게") |

- 투명도는 `opacity-disabled`만 토큰이다. 그 밖의 `opacity`는 검사하지 않는다.

### 3.8 Component 치수 (사용자 결정 숫자 — §1-9)

| 토큰 | 값 | 출처 |
|---|---|---|
| `tree-content-x` | 21px | 변수 탭 · 이름 정리 여러 단 트리 내용 x(V-D6 · TR-D7) |
| `tree-indent` | 9px | 단마다 들여쓰기(V-D6 · TR-D7) |
| `tree-line-x` | 12px | 세로 선 x(V-D6) |
| `list-row-pad-x` | 2px | 카드 안 목록 줄 · 건너뛴 곳 줄 글 왼쪽(ia-v4 §2.8 · TR-D13) |
| `list-row-pad-y` | 6px | 카드 안 목록 줄 위아래(ia-v4 §2.8) |
| `pill-gap` | 6px | 알약 줄 사이(V-D5) |
| `nav-item-gap` | 3px | 사이드바 항목 안 사이(V-D5 "항목 28 · 좌우 8 · 사이 3") |
| `pill-font-size` | 11.5px | 알약 글자(ia-v4 §8) |

- `src/treeList.ts`의 `21 + 9(n − 1)` · `12 + 9k` 계산은 같은 숫자를 쓴다. DS-1은 그 숫자를 바꾸지 않는다(TS의 계산된 위치 px는 검사 예외 — §8-2). CSS의 세로 선 위치(`.vt-grp.has-bar::before { left: 12px }`)는 `var(--tree-line-x)`로 바꾼다. 두 곳의 숫자가 같은지는 테스트가 확인한다(§8-7).
- V-D5 "목록 줄 위아래 6"(`.vt-row` padding)은 줄 높이 32가 고정이라 화면 차이가 없다 — A.3 규칙대로 옮겨도 된다(이 표에 넣지 않음).
- ia-v4 §8의 V-D4("11px 이상 이미 정한 크기는 그대로")는 V PR 범위의 결정이었다. DS-1의 글자 크기 맞추기(A.3-4)는 이 문서의 결정(DS-D5 "위계는 크기 · 굵기로, 단계 통일")을 따르고, 사용자가 숫자로 정한 알약 11.5만 §3.8로 지킨다.

## 4. 테마 (예약)

다크 테마 · 고대비는 범위 밖. 더할 때는 Semantic 색마다 테마별 Global을 가리키게 하고(`$extensions`), 화면 코드는 바꾸지 않는다.

## 5. 공통 Layout System (DS-2)

> 자리는 DS-3 리디자인 명세에서 확정한다(SC-D26 · SC-D27 · SC-D28). DS-2는 아래 틀을 만들어 두고, 지금 화면은 DS-3에서 옮겨 탄다.

창 560 × 510(ia-v4 §8). 틀(Header 40 + 탭 36 + 실행 줄 52 = 128px)이 세로의 약 25%. 하위 화면은 Page Header 40이 더해져 콘텐츠 약 342px.

| 레이아웃 | 짜임 | 토큰 | 지금 코드 |
|---|---|---|---|
| **PluginLayout**(그릇) | Header · Navigation · (Page Header) · 스크롤 콘텐츠 · Bottom Action Bar. 콘텐츠만 스크롤 | `color-background-primary` · 양옆 `space-3` | `body` · `.tab-section` |
| **Plugin Header** | 왼쪽 로고 · 이름, 가운데 선택 대상(말줄임), 오른쪽 ⚙ · 도움말 Icon Button. 아래 1px 선 | `size-header` · `text-heading-sm` | 없음(SC-D27) |
| **Navigation** | 작업별 Tab(밑줄형) 한 줄. 고른 탭은 `color-text-emphasis` + 아래 `border-width-thick` `color-primary` 막대 | `size-nav` · `text-label` | `.tabs`(세그먼트형) |
| **Page Header** | ← Icon Button · 제목 · 오른쪽 보조 정보(말줄임) | `size-header` · `text-heading` | `.sub-head` |
| **Content Section** | 제목 · 짧은 설명 · 본문. 절 사이 `space-6`. 카드는 꼭 필요할 때만 | `text-heading-sm` · `text-body-sm` | `.step` |
| **Settings Section** | 라벨–컨트롤 줄(라벨 왼쪽, 컨트롤 오른쪽), 줄 높이 `size-control-md` + 위아래 `space-1` | `text-label` | ⚙ 설정 화면 |
| **Result Section** | 요약 한 줄 + List Item 목록 + 빈 · 오류 상태 자리 | `text-body` | `.results` · 트리 |
| **Bottom Action Bar** | 위 1px 선. 왼쪽 Ghost(취소 · 뒤로), 오른쪽 끝 Primary 하나(+ 그 왼쪽 Secondary). 콘텐츠 아래에 같은 높이 여백 | `size-action-bar` · 버튼 `size-control-md` · 사이 `space-2` | `.sub-foot` · `.make-foot` · `.sel-tools` |
| **Modal Layout** | 제목 · 본문 · 아래 오른쪽 [취소(Ghost)] [확인(Primary 또는 Destructive)] | `size-modal-*` · `radius-large` · `elevation-3` · 안쪽 `space-4` | `.modal` |

PluginLayout은 그릇이고, 요청 목록의 레이아웃 8종(Plugin Header ~ Modal Layout)을 담는다(그래서 표는 9행).

**버튼 자리 규칙:** 주 실행은 실행 줄 오른쪽 끝, 화면에 Primary 하나. 취소 · 뒤로는 왼쪽 Ghost. 여러 단계의 이전 · 다음은 늘 같은 자리. 같은 목적의 버튼은 모든 화면에서 자리 · 크기가 같다(brief §4).

## 6. 공통 UI Component (DS-2)

상태 열: D Default · H Hover · A Active · F Focus · X Disabled · L Loading. **—** = 정의하지 않음.
"지금 코드" = DS-2에서 바꿔 끼울 지금 클래스(DS-1은 이름을 바꾸지 않고 토큰만 바꾼다). "없음" = 새로 만듦. **이 절의 "핵심 토큰"은 DS-2의 컴포넌트 기준이다** — DS-1의 옮기기는 부록 A.1을 따른다(둘이 다르면 DS-1은 A.1, DS-2에서 이 절로 맞춤).

### 6.1 Action

| 컴포넌트 | Variant | Size | 상태 | 핵심 토큰 | 지금 코드 |
|---|---|---|---|---|---|
| Button | Primary · Secondary · Ghost · Destructive · Link | sm 24 · md 28 · lg 32 | D H A F X L | Primary `color-primary(-hover)` + `color-text-on-primary` · Secondary `color-secondary-*` · Destructive `color-state-error` + `color-text-inverse` · `radius-small`(sm는 `radius-xs`) · `focus-ring-default` | `button` · `.primary` · `.danger` · `.link` · `.link-btn` · `.bd-skip` |
| Icon Button | Ghost · Secondary | sm 24 · md 28 | D H A F X L | `color-interactive-hover` · `size-icon-md` · 툴팁 필수 | `.icon-btn` · `.tab-min` · `.sub-back` · `.ed-dd` |
| Button Group | 붙임(테두리 공유) · 띄움(`space-2`) | 버튼 크기 | (버튼 상태) | `space-2` | `.acts` · `.row` 안 버튼 |
| Split Button | Primary · Secondary | md | D H A F X L | 버튼과 같음 + 나눔 선 `color-border-strong` | 없음 |

- Hover: Primary는 바탕 `color-primary-hover`, Secondary · Ghost는 바탕 `color-interactive-hover`. Focus: `focus-ring-default`. Disabled: `opacity-disabled` · 커서 기본. 잠김(`aria-disabled`): 글자 `color-text-tertiary` · 포커스는 받음(ia-v3 §2.3). Loading: 글자 자리를 지키고 앞에 돌기, `aria-busy`.

### 6.2 Form

| 컴포넌트 | Variant | Size | 상태 | 핵심 토큰 | 지금 코드 |
|---|---|---|---|---|---|
| Input | 기본 · Error | sm 24 · md 28 | D H — F X — | 바탕 `color-surface-secondary` · 테두리 `color-border-default` → hover `-strong` → focus `color-interactive-focus` + `focus-ring-field` · Error `color-state-error(-border)` · `radius-small` | `input[type=text/number]` · `.ed-field` |
| Textarea | 기본 · mono | 최소 3줄 | D H — F X — | Input과 같음 · `font-family-mono` | `textarea` |
| Select | 기본 | sm · md | D H — F X — | Input과 같음 | `select` · `.mode-select` |
| Checkbox | 체크 · 일부 · 해제 | `size-checkbox` | D H A F X — | 체크 `color-interactive-focus` · 테두리 `color-border-strong` · `radius-xs` | `input[type=checkbox]` |
| Radio | 고름 · 안 고름 | `size-checkbox` | D H A F X — | Checkbox와 같음 · `radius-full` | 없음 |
| Toggle | 켬 · 끔 · 일부 | `size-toggle-*` | D H A F X — | 켬 `color-primary` · 끔 `color-border-strong` · 손잡이 `color-surface-primary` + `toggle-knob-shadow` | `button.bv-switch` · `.bv-track` |
| Search Field | 기본 · 값 있음(지우기) | sm · md | D H — F X — | Input과 같음 + 돋보기 `size-icon-sm` | `.search-box` · `.ed-psearch` |

### 6.3 Navigation

| 컴포넌트 | Variant | Size | 상태 | 핵심 토큰 | 지금 코드 |
|---|---|---|---|---|---|
| Tab | 밑줄형(작업별 탭) · 세그먼트형(화면 안 나눔) | md | D H A F X — | 글자 `color-text-secondary` → 고름 `color-text-emphasis` · 밑줄 `border-width-thick` `color-primary` · 세그먼트 고름 `color-surface-primary` + `elevation-1` | `.tabs .tab-btn` · `.subtab` · `.mk-tabs` |
| Navigation Item | 1단 · 2단 · 위험 | 줄 `size-control-md` | D H A F — — | 고름 `color-surface-selected` + `color-text-emphasis` + 배지 `nav-selected-badge-bg` · hover `color-interactive-hover` · `radius-small` | `.vs-item` |
| Breadcrumb | 기본(마지막은 글자) | — | D H — F — — | `color-text-link` · 구분 기호 `color-text-tertiary` | 없음 |
| Step Indicator | 가로 점 · 번호 | — | 지남 · 지금 · 남음 (+F) | 지금 `color-primary` · 지남 `color-text-secondary` · 남음 `color-border-strong` | `.steps` |

### 6.4 Data Display

| 컴포넌트 | Variant | Size | 상태 | 핵심 토큰 | 지금 코드 |
|---|---|---|---|---|---|
| Badge | 숫자 · 상태(성공 · 주의 · 오류 · 안내) · 짙음 | 높이 14 | D | `text-caption` · `radius-xs` · 상태 `-subtle` 바탕 + 상태 글자 · 짙음 `color-surface-inverse` | `.mini-badge` · `.vs-badge` · `.bv-new` |
| Tag | 변수 칩(옅은 칸 + 짙은 칸) · 일반 · 주의 | `size-compact` 이하 | D H — F X — | `chip-*` · `radius-full` · `space-0-5` | `.vchip` · `.chip` · `.tr-tag` · `.lib-tag` · `.step-chip` |
| Tooltip | 짙음 | 최대 너비 240 | (보임 · 숨김) | `color-surface-inverse` · `color-text-inverse` · `text-body-sm` · `radius-small` · `elevation-2` | `#uiTip` · `.vt-tip` |
| Card | 기본 · 접힘 · 상태 바탕 | — | D (접기 머리 H F) | `color-surface-primary` · `color-border-default` · `radius-medium` · `space-3` · 그림자 없음 | `.step` · `.sel-card` · `.bind-card` |
| List Item | 한 줄 · 두 줄 · 머리 줄 | 줄 32 | D H A F X — | 구분선 `color-border-default` 또는 없음(ia-v4 §2.8 · §2.7) · `color-interactive-hover` | `.tr` · `.vt-row` · `.mk-row` · `.skip-row` · `.results .r-card` |
| Table | 기본 · 줄 고름 | 줄 32 · 머리 28 | D H A — — — | `text-label-sm` 머리 · 줄 구분선 · `radius-none` | 없음 |
| Progress Indicator | 막대 · 돌기 · 단계 수 | 막대 높이 4 | 진행 · 끝남 · 오류 | `color-primary` · 트랙 `color-surface-secondary` · `radius-full` · `motion-duration-spin` | `#applyProgress .bar` · `.unused-prog` · `.make-prog` · `.mini-mark.busy` |

- Card 안에는 Card를 넣지 않는다 — 안쪽은 List Item · 옅은 띠(`color-surface-secondary`)로(§1-7). `.results` 안 `.r-card`는 이미 카드 모양을 걷은 목록 줄이다(`ui.html`의 `.results:not(#tsList) .r-card` · `#tsList .r-card` 규칙). 기본 `.r-card` 규칙(테두리 · 둥글기 · 바탕)은 쓰이지 않는 스타일이라 DS-2에서 지운다.

### 6.5 Feedback

| 컴포넌트 | Variant | Size | 상태 | 핵심 토큰 | 지금 코드 |
|---|---|---|---|---|---|
| Alert | Info · Success · Warning · Error (글자 + 아이콘 필수) | 띠(카드 · 모달 안) · 상자(카드 밖) | D (닫기 H F) | 상태 글자 · `-subtle` 바탕 · 상자는 `-border` 테두리 + `radius-medium`, 띠는 테두리 없음 + `radius-small` | `.banner` · `.banner.caution` · `.ux` · `.ed-alert` · `.dark-notice` · `.tidy` |
| Toast | Info · Success · Error | 창 아래 가운데, 최대 너비 = 창 − 2 × `space-3` | 나타남 · 사라짐(4초) | `color-surface-inverse` · `color-text-inverse` · `radius-large` · `elevation-2` · `z-tooltip` | 없음(SC-D10 — `.status-line`을 대신함) |
| Modal | 기본 | `size-modal-sm` · `-md` | 열림 (닫기 F) | Modal Layout(§5) · `color-overlay` · `z-modal` | `.modal-backdrop` · `.modal` |
| Confirm Dialog | 일반 · 위험(Destructive 확인) | `size-modal-sm` | 열림 | Modal과 같음 | 없음(지금 `.ed-confirm`은 대화 상자가 아니라 팝업 아래의 확인 줄 — DS-2에서 이 컴포넌트로 바꿀지 정함) |
| Empty State | 처음 · 결과 없음 | 가운데, 위아래 `space-10` | D | `text-display` · `text-body-sm` · 아이콘 `size-icon-lg` | `.sel-empty` · `.var-empty` · `.vt-empty` · `.bind-empty` · `.unused-none` |
| Loading State | 줄 뼈대 · 돌기 | 목록 / 화면 | L | `color-surface-secondary` 뼈대 · `motion-duration-spin` | `.var-loading` · `.tr-skel` · `.mini-mark.spin` |
| Error State | 화면 · 칸 | — | D (다시 시도) | `color-state-error` · 아이콘 · 다시 시도 Secondary | `.ed-alert.err` · `.ed-ferr` |
| Success State | 화면 · 줄 | — | D | `color-state-success` · 아이콘 | `.bind-empty.done` · `.status-line.ok` |

### 6.6 만드는 방법 (DS-2)

- 파일: `src/ui/components/{이름}.ts`(DOM을 만드는 작은 함수 — 예: `button({ variant, size, label, icon, loading })`) + `ds-` 접두 CSS(예: `.ds-btn.ds-btn--primary.ds-btn--md`). 레이아웃은 `src/ui/layouts/`.
- 빌드가 컴포넌트 CSS를 `ui.html`에 함께 넣는다. 지금 클래스와 함께 붙여 화면별로 옮기고, 옮긴 뒤 옛 규칙을 지운다.
- 모음 화면: `dist/ds-gallery.html`(개발용, 플러그인에 안 들어감) — 30종 × 상태, 토큰 표와 변수 상세(대략 시안의 상세 패널).

## 7. 사용 규칙

### 7.1 쓰는 사람

1. 색은 §3.1 Semantic 표의 **쓰임**에서 고른다. 없으면 7.2.
2. 상태색(Success · Warning · Error)은 상태를 알릴 때만 쓴다 — 장식 · 강조에 쓰지 않는다. 강조는 `color-text-emphasis` · 굵기 · 여백으로.
3. 글자는 묶음 토큰(DS-2부터)을 먼저, 크기만 다르면 원재료로 덮는다.
4. 간격은 `space-*`. 줄 안은 `space-2`, 묶음 사이는 `space-4` 이상. 답답하지 않게 여백을 넉넉히(DS-D5).
5. 높이가 있는 컨트롤은 `height: var(--size-control-*)`. 같은 줄의 버튼과 입력은 같은 크기.
6. 둥글기는 §3.4의 컴포넌트별 값. 같은 종류는 같은 둥글기.
7. 그림자는 떠 있는 것에만. 카드는 테두리만.
8. 상태는 색 + 글자 또는 아이콘. Information은 ⓘ 필수.
9. 카드 안 카드 금지. 테두리를 겹치지 않는다(카드 안 줄은 구분선 하나).

### 7.2 토큰을 더하거나 바꿀 때

1. 이 문서의 표에 먼저 더한다(쓰임 한 줄 필수).
2. `design-tokens/tokens.json`에 같은 이름 · 값 · `$description`으로 더한다.
3. 검사(§8)를 돌린다.
4. 같은 역할의 토큰이 있으면 더하지 않는다.
5. 지울 때는 쓰는 곳이 0인지 검사가 확인한다(§8-3).

## 8. 검증 (자동 검사)

`test/design-tokens.test.mjs` — `npm test`에 들어가 CI에서 돈다. 대상: `src/ui.html`의 `<style>`(주석 뺌) · 본문 `style="…"`, `src/ui.ts` · `src/treeList.ts`의 문자열(innerHTML 안 `style="…"` 포함) · `style.*` · `setProperty`.

1. **직접 값 금지(CSS · `style="…"`):**
   - 색: 16진 색 · `rgb()` · `rgba()` · `hsl()` · 이름 색 금지(`transparent` · `currentColor` · `inherit` 허용).
   - `font` · `font-family` · `font-size` · `font-weight` · `letter-spacing` · `line-height`: `var()` · `inherit` · `normal`만(`font:` 한 줄은 `var()`로만 짠 값).
   - `padding*` · `margin*` · `gap` · `row-gap` · `column-gap`: `var()` · `0` · `auto` · `-1px` · `var()`만 든 `calc()`.
   - `border-radius`: `var()` · `0` · `inherit`.
   - `border*`의 굵기: `0` · `1px` · `var()`.
   - `box-shadow` · `outline`: `none` · `0` · `1px` · `inset` · `solid` · `inherit` · `var()`(`outline-offset`은 검사 안 함).
   - `z-index`: `var()`만. `transition` · `animation`의 시간: `var()`만(이름 · 곡선 `ease` · `linear`는 허용).
2. **TS 예외:** 사용자 데이터 색(`style.background = hex` 등 값이 변수에서 옴) · 너비 % · 계산된 위치 · 높이 px(툴팁 · 막대 · `maxHeight` · 트리 x · `num('40px')`처럼 변수로 넘는 너비)는 검사하지 않는다. 문자열에 직접 쓴 색 · 간격 · 둥글기만 본다.
3. **이름 확인:** 쓰인 `var(--x)`는 모두 원본 토큰이거나 런타임 변수(§2.3). Semantic · Component 토큰 중 쓰는 곳 0은 경고 — DS-2용으로 미리 둔 토큰은 원본의 `$extensions.reserved: true`로 표시해 예외.
4. **층 규칙:** 화면 코드에 `var(--global-*)`가 있으면 실패. 원본의 Semantic · Component 색은 Global 색 하나를 가리켜야 하고, 참조가 끊기거나 돌면 실패.
5. **원본 형식:** Global 밖 모든 토큰에 `$value` · `$type` · `$description`.
6. **대비(4.5:1):** `color-text-primary` · `-secondary` · `-emphasis` · `-link` · 상태 글자 ↔ `color-background-primary`, 상태 글자 ↔ 그 `-subtle`, `color-text-on-primary` ↔ `color-primary`, `color-text-inverse` ↔ `color-surface-inverse` · `color-state-error`, `chip-value-text` ↔ `chip-value-bg`. 예외는 §9 목록에 적힌 짝만(목록에 없는 미달은 실패).
7. **같은 숫자:** `tree-content-x` · `tree-indent` · `tree-line-x`가 `src/treeList.ts`의 `21` · `9` · `12`와 같은지, CSS 세로 선 `left`가 `var(--tree-line-x)`인지.

## 9. 열린 결함

| 번호 | 결함 | 언제 |
|---|---|---|
| DS-O1 | `color-text-tertiary`(#999999) 흰 바탕 2.85:1 — 글자 기준 미달. 자리 표시 글 · 비활성 · 장식에만 쓴다(보조 글자는 `-secondary` #555555 7.5:1). 대비 검사 예외 | 쓰임 제한으로 유지 |
| DS-O2 | 상태 글자 대비(DS-D7 — 지정 값 그대로): Warning #B7791F 흰 바탕 3.6:1 · 옅은 바탕 3.3:1, Error #D64545 흰 바탕 4.4:1 · 옅은 바탕 3.8:1 · 흰 글자를 얹은 삭제 버튼 4.4:1, Success #16845B 옅은 바탕 4.1:1. 대비 검사 예외 | 사용자 결정으로 유지 |
| DS-O3 | 포커스 모양이 두 가지(`focus-ring-default` · `focus-ring-field`)이고, 스위치 · 일부 줄은 `outline`으로 따로 그린다 | DS-2 |
| DS-O4 | 잠긴 버튼(`aria-disabled`)과 꺼진 버튼(`:disabled`)의 모양이 다르다(글자 흐림 · 투명도) | DS-2 |
| DS-O5 | `.ed-copy` · `.ed-plink`가 포커스 색(`--accent` 2.9:1)을 글자에 썼다 — ① 단계에서 `color-text-link`로 옮김(부록 A.1). ② 뒤 #111111로 해결 | DS-1에서 닫힘 |

---

## 부록 A. DS-1 옮기기 (DS-1 병합 뒤 지움)

### A.0 ① 단계 Global (지금 값 그대로)

① 단계의 `tokens.json`은 아래 Global을 쓰고, Semantic은 A.1의 짝을 가리킨다. 색은 지금과 같다(★만 바뀜 — A.1 · A.2). ② 단계는 Global을 §3.1의 Foundation으로 바꾸고 Semantic이 가리키는 Global을 §3.1 표로 바꾼다(Semantic 이름은 그대로).

| 계열 | 값 |
|---|---|
| gray | `0` #ffffff · `50` #f4f5f6 · `100` #eceef0 · `120` #ededed · `150` #e7e8ea · `200` #d4d6da · `210` #d8d8d8 · `220` #d0d5dd · `400` #9298a1 · `600` #5e636b · `800` #2b2a2a · `900` #1b1b1f · `920` #222222 · `1000` #000000 |
| blue | `50` #ecf6ff · `100` #c4e4ff · `500` #0d99ff · `600` #0a86e6 · `700` #0974c9 · `800` #0a6dbf |
| green · amber · red | `green-50` #e8f5ec · `green-700` #117b34 · `amber-50` #fbf1df · `amber-700` #9a6300 · `red-50` #fdecec · `red-100` #f4c9cc · `red-600` #c8252f |
| 투명 | `black-a10` · `a12` · `a15` · `a18` · `a20` · `a28` (지금 쓰는 rgba(0,0,0,…) 그대로) |

① 단계 Semantic → Global: primary blue-800 · primary-hover blue-700 · primary-subtle blue-50 · text-on-primary gray-0 · secondary-bg gray-0 · secondary-border gray-200 · background-primary gray-0 · surface-primary gray-0 · surface-secondary gray-50 · surface-selected gray-120 · surface-inverse gray-900 · border-default gray-150 · border-strong gray-200 · text-primary gray-900 · text-emphasis gray-1000 · text-secondary gray-600 · text-tertiary gray-400 · text-link blue-800 · text-inverse gray-0 · success green-700 / green-50 · warning amber-700 / amber-50 · error red-600 / red-50 / red-100 · info blue-800 / blue-50 / blue-100 · interactive-hover gray-100 · focus blue-500 · focus-hover blue-600 · focus-subtle blue-50 · overlay black-a28. Component: chip-value-bg gray-800 · chip-value-text gray-210 · chip-alias-text gray-1000 · swatch-border gray-1000 · swatch-outline black-a15(★ 아래) · checker-color gray-220 · nav-selected-badge-bg gray-1000. 툴팁 `.vt-tip`의 #222는 `color-surface-inverse`로(★ #1b1b1f).

① 단계 비색 토큰: 둥글기 `radius-xs` 3 · `-small` 5 · `-medium` 7 · `-large` 10 · `-full` 9999(지금 `--r-sm` 5 · `--r` 7 · `--r-lg` 10), 그림자 rgba(20,22,28,…) 지금 값, `opacity-disabled` .42. 나머지(글자 · 간격 · 크기 · 움직임 · 겹침 · §3.8)는 §3 값 그대로.

### A.1 옛 CSS 변수 → 새 토큰

| 옛 이름 | 새 토큰 |
|---|---|
| `--bg` | `--color-background-primary` (`var(--bg, #fff)`의 대체값 뺌) |
| `--surface` | `button` 기본 바탕 = `--color-secondary-bg`, 그 밖 = `--color-surface-primary` |
| `--surface-2` | `--color-surface-secondary` (버튼 hover도 — ② 뒤 hover와 같은 neutral-100) |
| `--surface-hover` | `--color-interactive-hover` |
| `--text` | `--color-text-primary` |
| `--text-2` | `--color-text-secondary` |
| `--muted` | 아래 닫힌 목록대로 나눈다(§3.1 — tertiary는 자리 표시 · 비활성 · 장식만). **tertiary(그대로 #9298a1):** `::placeholder` · `[aria-disabled="true"]` 규칙 전부(`button` · `button.primary` · `label.inline:has(…)` · `.ctx-menu button` · `.ed-opt`) · `.ctx-menu button:disabled` · `.r-role.lk` · 장식(`.step-head .chev` · `.ts-edit .ts-sep` · `.be-art.icon` · `.tree.vlike button.tr-car` · `.vt-group .tw`) · 흐린 소수 크기 줄(TR-D14 · ia-v4 §4.3 — `#tsList .r-card.ts-decimal .r-title/.r-sum` · `.tr.ts-decimal .ts-aa/.tr-sub/.bv-tw` · `.tree.vlike .tr.ts-decimal .tr-lt` · `.tree.vlike .tr.ts-decimal .vchip .vl`). (꺼진 줄 이름 `.tr-name.muted`는 자기 규칙이 `--text-2`라 A.1대로 `color-text-secondary` — 지금 색 그대로, 새 규칙 없음.) **secondary★(#9298a1 → #5e636b, 읽어야 하는 글자):** 공용 `.muted`(카드 제목 개수 · 만들기 "단계 i/n" · `.unused-sum` · 새 그룹 메모 등) · `.ed-changes .muted` · `.ctx-menu .menu-note` · `.r-sum` · `.r-meta` · `.ed-changes .ed-ch-h` · `.ed-phead` · `.ed-pnote` · `.modal dt` · `.ed-ptag`. **쓰는 곳 없음(B.12에서 지움):** `.pipe-mini span` · `.bind-steps .bs` · `.bs-dot` · `.vs-tw` · `.col-role .sub` · `.vu-props`. 이 목록에 없는 `--muted`가 구현 때 나오면 tertiary로 두고 PR에 적는다 |
| `--border` | `--color-border-default` (`var(--border-2, var(--border))` → `--color-border-strong`) |
| `--border-2` | `button` 기본 테두리 = `--color-secondary-border`, 그 밖 = `--color-border-strong` |
| `--accent` | 포커스 링 · 외곽선 · 고르개 테두리 · 체크박스 `accent-color` · 편집 중 칸 테두리(`.tr input.tr-edit`) · 메뉴가 열린 알약 테두리(`.vp-item.menu-open`) = `--color-interactive-focus` · 켠 스위치 · 진행 막대 · 돌기 · 고른 밑줄 = `--color-primary`(★) · 글자(`.ed-copy` · `.ed-plink`) = `--color-text-link`(★) |
| `--accent-hover` | `--color-interactive-focus-hover` |
| `--accent-press` | `--color-primary-hover` |
| `--accent-strong` | 주 버튼 바탕 · 테두리 · 새 표시 바탕 = `--color-primary`, 링크 글자 = `--color-text-link`, 그 밖 글자 · 안내 띠 아이콘(`background-color`) = `--color-state-info` |
| `--accent-subtle` | 포커스 띠(`box-shadow`) = `--color-interactive-focus-subtle`, 안내 띠(`.banner` · `.ux` 등) = `--color-state-info-subtle`, 그 밖 = `--color-primary-subtle` |
| `--accent-border` | `--color-state-info-border` |
| `--on-accent` | 주 버튼 위 = `--color-text-on-primary`, 짙은 바탕 위(있으면) = `--color-text-inverse` |
| `--ok` · `--ok-subtle` | `--color-state-success` · `-subtle` (대체값 뺌) |
| `--warn` · `--warn-subtle` | `--color-state-warning` · `-subtle` (대체값 뺌) |
| `--danger` · `--danger-subtle` · `--danger-border` | `--color-state-error` · `-subtle` · `-border` (대체값 뺌) |
| `--vchip-dark` · `--vchip-dark-fg` · `--vchip-fg` | `--chip-value-bg` · `--chip-value-text` · `--chip-alias-text` |
| `--swatch-line` | `--swatch-border` |
| `--side-sel` | `--color-surface-selected` |
| `--r-sm` · `--r` · `--r-lg` | `--radius-small` · `--radius-medium` · `--radius-large` |
| `--shadow-sm` · `--shadow` | `--elevation-1` · `--elevation-2` |
| `--fs` | `--font-size-md` |
| `--font` · `--mono` | `--font-family-sans` · `--font-family-mono` |

`src/ui.ts` · `src/treeList.ts`의 `var(--ok)` · `var(--warn)` · `var(--text)` · `var(--text-2)` · `var(--border)`도 같은 표로.

### A.2 직접 쓴 색 → 토큰 (★ = ① 단계에서 눈에 띄게 바뀜)

| 지금 | 자리 | 새 토큰 |
|---|---|---|
| #fff | 어두운 면 · 오류 버튼 · 배지 · 새 표시 위 글자 | `--color-text-inverse`(주 버튼 위면 `--color-text-on-primary`) |
| #fff | 스위치 손잡이 · 체커 바탕 | `--color-surface-primary` |
| #1b1b1f · ★ #222 | 툴팁 바탕(`#uiTip` · ★ `.vt-tip`) | `--color-surface-inverse`(#1b1b1f) |
| #000 | 고른 사이드 항목 글자 · 개수 | `--color-text-emphasis` |
| #000 | 고른 사이드 항목 배지 바탕 | `--nav-selected-badge-bg` |
| #d0d5dd | 체커 무늬 | `--checker-color` |
| rgba(0,0,0, .1 · .12 · .15 · .18) | 사용자 색 견본 테두리 | `--swatch-outline`(.15로 합침 — 차이 .03 이내라 ★ 아님) |
| rgba(0,0,0,.2) | 스위치 손잡이 그림자 | `--toggle-knob-shadow` |
| ★ `0 2px 8px rgba(0,0,0,.08)` | 고르개 그림자 | `--elevation-2`(모양이 조금 바뀜) |
| rgba(0,0,0,.28) | 모달 막 | `--color-overlay` |
| ★ #0d99ff | 켠 스위치 · 진행 막대 · 고른 밑줄 | `--color-primary`(#0a6dbf — A.1 `--accent`) |

### A.3 값 맞추기 (① 단계)

옮길 때 값이 토큰 단계에 없으면 아래 순서로 정한다. 위에 있는 규칙이 이긴다.

1. **사용자 결정 치수** → §3.8 Component 토큰(값 그대로).
2. **컨트롤 높이**(버튼 · 입력 · 고르개) → §3.6의 규칙(높이를 주는 곳 · `height: auto` 예외 · 26px 칸 = `size-compact`). 버튼(지금 7 · 11 + 줄 높이 1 = 28) → `size-control-md` + 좌우 `space-3`(11 → 12). 입력(지금 6 · 8 + 1.4 ≈ 31) → `size-control-md` 28 + 좌우 `space-2`(★ 3px 낮아짐).
3. **간격** — 가장 가까운 단계. 가운데 값:
   | 지금 | 줄 안 요소 사이(`gap` · 가로 `margin`) · 컨트롤 · 칩 안쪽 | 상자 안쪽(카드 · 모달 · 띠 · 메뉴의 `padding`) · 블록 사이 세로 `margin` · 세로로 쌓는 `gap`(`flex-direction: column` · `grid` 행) |
   |---|---|---|
   | 6 | 4 | 8 |
   | 10 | 8 | 12 |
   | 14 | 12 | 16 |
   | 18 | 16 | 20 |
   그 밖: 1 → 0(위아래 1px로 줄 높이를 맞추던 곳) 또는 `space-0-5`(글자 좌우), 3 → 4, 5 → 4, 7 → 8, 9 → 8, 11 → 12, 21 → 20, 36 → 40, 48 → 40. 음수: `-1px`는 그대로(테두리 겹치기), `-2px` → `calc(-1 * var(--space-0-5))`, `-3px` → `calc(-1 * var(--space-1))`.
4. **글자 크기** — 11.5 → 11, 12.5 → 12, 18 → 16(소수 내림). 단 §3.8 `pill-font-size`(11.5)는 그대로.
5. **줄 높이** — `1` → `line-height-none`, `1.25` · `1.3` → `-tight`, `1.35` · `1.4` · `1.45` → `-snug`, `1.5` → `-normal`. px: `10px` · `12px` → `-xs`, `14px` → `-sm`, `16px` → `-md`, `26px` → `var(--size-compact)`(§3.6 26px 칸과 줄 맞춤). 줄 높이 없는 `font: 11px var(--mono)`는 줄 높이를 더하지 않는다(물려받음 그대로).
6. **둥글기** — 지금 2 · 3 · 4px → `radius-xs`, 5 · 6px → `radius-small`, 7 · 8px → `radius-medium`, 10px → `radius-large`, 13px · 999px · 50% → `radius-full`(① 단계 값은 A.0).
7. **겹침** — §3.7 표의 지금 값 → 같은 값의 토큰. `-1` → `z-below`.
8. **움직임** — .1s · .12s → `motion-duration-fast`, .9s · 1s → `motion-duration-spin`.
9. **투명도** — `:disabled` 버튼 .42 · 꺼진 스위치 .45 → `opacity-disabled`. 그 밖 opacity는 그대로.

### A.4 ② 단계에서 바꾸는 것 (토큰 원본 + 검사 기대값)

- Global을 §3.1 Foundation으로, Semantic · Component가 가리키는 Global을 §3.1 표로.
- 둥글기를 §3.4(4 · 6 · 8 · 10)로, 그림자 색을 rgba(17,17,17,…)로, `opacity-disabled` .5로.
- 카드 그림자 없음(DS-D5): 그림자는 `.step`에만 있다(`.bind-card`는 `.step`, `.sel-card`는 그림자 없음) — `.step`의 `box-shadow: var(--elevation-1)`을 지운다. ② 단계의 CSS 변경은 이 한 줄뿐이다.
- 카드 둘의 둥글기가 다르다(`.step` large 10 · `.sel-card` medium 8 — 지금 `--r-lg` · `--r`를 그대로 옮긴 결과). §3.4의 Card = medium으로 맞추는 일은 DS-2(컴포넌트 Card로 옮길 때).
- `scripts/verify-bind-flow.mjs`의 색 기대값(2회차 검토 기준 줄 번호 — 구현 때 다시 확인):

  | verify 줄 | 지금 값 | ② 값 | 토큰 |
  |---|---|---|---|
  | 715 · 1447 | rgb(94,99,107) | #555555 | `color-text-secondary` |
  | 720 · 1655 · 1665 | rgb(236,238,240) | #F5F5F5 | `color-interactive-hover` |
  | 1154 | rgb(10,109,191) | #111111 | `color-primary` |
  | 1845 · 2314 · 2360 · 3597 · 3666 | rgb(244,245,246) | #F5F5F5 | `color-surface-secondary` |
  | 2314 · 2448 · 2499 | rgb(146,152,161) | #999999 | `color-text-tertiary` |
  | 3071 | 1px rgb(0,0,0) | #111111 | `swatch-border` |
  | 3137 | 바탕 rgb(237,237,237) · 배지 rgb(0,0,0) | #ECECEC · #111111 | `color-surface-selected` · `nav-selected-badge-bg` |
  | 3778 | rgb(251,241,223) | #F8F2E9 | `color-state-warning-subtle` |

  검사 이름 문자열의 "#ededed · 검정"도 새 값으로. ①에서 `--muted` → secondary★로 바뀐 줄의 기대값도 이 표와 함께 확인.
- `docs/ia-v4.md`에서 색 값을 적은 줄(V-D5 #ededed · 검정 배지 등)에 "② 뒤 값은 design-system.md §3.1" 한 줄.

## 부록 B. DS-1 체크리스트

- [ ] B.1 `design-tokens/tokens.json` ① 단계(A.0) — §3의 모든 토큰, `$description` = 쓰임, DS-2 예약 토큰은 `$extensions.reserved`
- [ ] B.2 `build.mjs` — 원본 → `:root` CSS를 `/* @design-tokens */`에, 참조는 `var()`로, watch가 원본 변경도 봄
- [ ] B.3 `src/ui.html` `:root`의 옛 변수 지우고 자리 표시만(`color-scheme: light`는 남김)
- [ ] B.4 `src/ui.html` CSS 전부 A.1–A.3대로(직접 값 0)
- [ ] B.5 `src/ui.html` 본문 `style="font-size:…"` 2곳 → 토큰(나머지 `display:none` · 너비는 §8-1 대상 속성이 아님)
- [ ] B.6 `src/ui.ts` · `src/treeList.ts`의 옛 변수 이름과 innerHTML · `style.margin*` 안 직접 간격 · 둥글기 · 색 → 토큰(`treeList.ts`의 4px · 16px 그룹 여백 → `var(--space-1)` · `var(--space-4)`)
- [ ] B.7 `test/design-tokens.test.mjs` — §8의 1–7
- [ ] B.8 `scripts/verify-bind-flow.mjs`가 읽는 옛 변수 이름(`--border` · `--text` · `--text-2` · `--muted` · `--swatch-line`)을 새 이름으로. 글자 크기 검사(`^[\d.]+px$`)는 계산된 값을 보도록. 바뀐 px 기대값(★ 입력 높이 등)은 고치고 목록을 PR에 적는다
- [ ] B.9 ① 커밋: 검사 4개 통과 + 전후 스크린샷(선택 탭 · 변수 탭 · 연결 · 만들기 · 이름 정리 · 모달)으로 **★과 A.3 규칙(둥글기 · 줄 높이 · 글자 크기 · 간격 · 투명도 맞추기)에 따른 변화 밖**의 차이가 없는지
- [ ] B.10 ② 커밋: A.4 + 검사 4개 통과 + 새 모양 스크린샷
- [ ] B.11 `ROADMAP.md`에 DS-1 · DS-2 · DS-3 자리, `docs/ia-v4.md` §2.8 · §8에서 이 문서를 가리킴. ①에서 바뀌는 ia-v4 §8의 숫자(사용자 결정이 아닌 것 — 카드 안쪽 10 · 12 → 12 · 12, 만들기 아래 줄 위아래 6 · 8 → 8 · 8로 합계 80 → 82, 입력 높이 ≈31 → 28, 변수 탭 머리 줄 높이 등)를 ia-v4 §8에 적는다
- [ ] B.12 쓰는 곳이 없는 규칙을 지운다(HTML 본문 · `ui.ts` · `treeList.ts`에 0곳 — 3회차 검토 확인): `.pipe-mini` · `.bind-steps` · `.bs` · `.bs-dot` · `.vs-tw` · `.bv-tw` · `.bd-all` · `.tier-chip` · `.subtabs`(`.subtab`은 남김) · `.vt-section` · `.vu-props` · `.col-role .sub` · `.icon-btn.spinning` · `.results.stale` · `.vusage` · `.alias-pill` · `.vt-line` · `.vt-lib` · `.tr-note` · `.bind-done` · `.situation`(4회차 검토 확인). 지우기 전에 한 번 더 grep. `scripts/verify-bind-flow.mjs`에 이름만 남은 `.tier-chip`(카드 찾기 제외) · `.tier-chip .badge` · `.bs-dot`(배지 예외)도 함께 정리. §5 · §6의 "지금 코드" 칸은 실제로 쓰는 클래스만 적는다
