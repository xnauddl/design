# 플러그인 디자인 시스템 — 명세

> 2026-11-25 작성 · DS-1 검토 4회(중대 13 → 4 → 2 → 1 → 0), 디자인 방향 DS-D5–DS-D9. 2026-11-26 DS-2 명세(§5 · §6 · 부록 C — DS-D10–DS-D13) · 검토 3회(중대 19 → 5 → 0). 결정은 `docs/redesign/brief.md` §7 · §8. 리디자인 세션(SC-D30)의 첫 일이다.
> 이 문서가 토큰 · 컴포넌트 · 레이아웃 · 사용 규칙의 **단일 명세**다. 토큰 값의 **단일 원본**은 `design-tokens/tokens.json`이고, 이 문서의 표는 그 원본과 같아야 한다(다르면 원본이 맞고 표를 고친다).
> 본문 §3의 값은 **최종 값(DS-1 ② 단계 뒤)** 이다. ① 단계의 임시 값과 옮기기 규칙은 부록 A.
> 기준: 본문 §0–§9에 중대 결함 0(CLAUDE.md 4단계). 부록 A · B는 DS-1 PR, 부록 C는 DS-2 PR에서 닫는다.

## 0. 결정 요약

| 항목 | 결정 |
|---|---|
| 디자인 방향 (DS-D5) | **Modern Minimalism · 모노크롬.** Primary `#111111`. 장식 · 과한 색 · 복잡한 카드를 줄이고 정보 구조 · 가독성 · 정렬 · 간격을 앞세운다. 상태색은 상태를 알릴 때만(brief §8). |
| 단계 (DS-D1 · DS-D6) | **DS-1(지금, 한 PR에 두 단계)** — ① 옮기기: 토큰 원본 + `src/ui.html` · `src/ui.ts` · `src/treeList.ts`의 직접 값을 토큰으로(값은 지금과 거의 같음 — 부록 A) ② 새 값: 토큰 원본의 값만 §3의 최종 값으로. **DS-2** 공통 컴포넌트 30종 · 레이아웃 9종 + 개발용 모음 화면. **DS-3** 리디자인(작업별 탭 · Header · 하단 실행 줄 · 영어 문구, brief). |
| 컴포넌트 범위 (DS-D2) | 요청 목록 **30종 전부**(§6). 지금 화면에 없는 5종(Split Button · Radio · Breadcrumb · Table · Toast)도 만든다. |
| 간격 (DS-D3) | 4px 격자(4 · 8 · 12 · 16 · 20 · 24 · 32 · 40) + 2px. |
| DS-2 (DS-D10–DS-D13) | 새 브랜치 · 새 PR · 만드는 법은 CSS 클래스(`ds-`) + TS 함수 · 지금 화면은 기본 5종(Button · Icon Button · Input/Select · Checkbox · Badge/Tag)만 바꿈 · 아이콘은 Lucide 24개(ISC · 일부 MIT — §6.6) — §6 |
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
- **그룹(JSON 첫 마디 = CSS 이름 첫 마디):** `global` · `color` · `text`(글자 묶음) · `font-family` · `font-size` · `font-weight` · `line-height` · `letter-spacing` · `space` · `radius` · `border-width` · `focus-ring` · `elevation` · `size` · `motion` · `z` · `opacity` · `icon` · Component 그룹(`chip` · `swatch` · `checker` · `nav` · `tree` · `pill` · `toggle` · `list`).
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
| | `color-text-tertiary` | neutral-500 | 자리 표시 글 · 비활성 · 장식 아이콘 **만** (⚠ DS-O1). 잠긴 체크박스의 체크 바탕 · 테두리에도 쓴다(흰 ✓가 보이는 같은 회색 — §6.2) |
| | `color-text-link` | primary | 글자 링크 · 링크 버튼(밑줄로 구분) |
| | `color-text-inverse` | white | 어두운 면 · 오류 버튼 위 글자 |
| Success | `color-state-success` | success | 완료 · 성공 글자와 아이콘 |
| | `color-state-success-subtle` | success-50 | 성공 알림 바탕 |
| Warning | `color-state-warning` | warning | 주의 글자와 아이콘 |
| | `color-state-warning-subtle` | warning-50 | 주의 알림 바탕 |
| Error | `color-state-error` | error | 오류 글자 · 삭제 버튼 바탕 |
| | `color-state-error-subtle` | error-50 | 오류 알림 바탕 |
| | `color-state-error-border` | error-300 | 오류 알림 상자 테두리(오류 입력 칸 테두리는 `color-state-error` — §6.2) |
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
| `radius-xs` | 4px | 16px 이하 작은 요소 — Checkbox · 색 견본 · Badge · 코드 조각 |
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
| `elevation-sticky` | `0 -2px 8px rgba(17,17,17,.08)` | 하위 화면 아래 고정 줄(Bottom Action Bar) — **그 아래로 내용이 깔릴 때만**(DS-3a — ia-v4 §4.1b S3-D10). 위 1px 선은 늘 |
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
| `motion-duration-highlight` | 1500ms | 잠깐 강조(`color-state-success-subtle` 바탕 — hover 바탕과 다른 색)가 원래 바탕으로 돌아가는 시간 — 변수 탭 [변수 보기] 도착 줄(DS-3a — ia-v4 §4.1b S3-D9). `prefers-reduced-motion: reduce`면 강조 없음 |
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

> DS-2는 아래 틀을 CSS 클래스로 만들고 모음 화면(§6.10)에서 보인다. **지금 화면은 옮기지 않는다** — 자리는 DS-3 리디자인 명세에서 확정한다(SC-D26 · SC-D27 · SC-D28, DS-D12).

창 560 × 510(ia-v4 §8). 틀(Header 40 + 탭 36 + 실행 줄 52 = 128px)이 세로의 약 25%. 하위 화면은 Page Header 40이 더해져 콘텐츠 약 342px.

| 레이아웃 | 클래스 · 짜임 | 토큰 | 지금 코드(DS-3에서 옮김) |
|---|---|---|---|
| **PluginLayout**(그릇) | `.ds-layout` — 세로 flex, 높이 100vh. 자식 순서 Header · Navigation · (Page Header) · `.ds-layout__body`(스크롤 — 이것만 `overflow: auto`) · Bottom Action Bar | `color-background-primary` · 본문 양옆 `space-3` | `body` · `.tab-section` |
| **Plugin Header** | `.ds-header` — 왼쪽 `.ds-header__brand`(로고 16 + 이름 `text-heading-sm`), 가운데 `.ds-header__scope`(선택 대상, 말줄임, `text-body-sm` `color-text-secondary`), 오른쪽 Icon Button(⚙ `settings` · 도움말 `circle-help`). 로고 그림은 DS-3에서 정함. 아래 1px 선 | `size-header` · 좌우 `space-3` · 사이 `space-2` | 없음(SC-D27) |
| **Navigation** | `.ds-navbar` — 밑줄형 Tab(§6.3)을 한 줄로. 왼쪽 맞춤, 탭 사이 `space-4`. 아래 1px 선 | `size-nav` · 좌우 `space-3` | `.tabs`(세그먼트형) |
| **Page Header** | `.ds-page-header` — ← Icon Button(sm) · 제목(`text-heading`, 말줄임) · 오른쪽 보조 정보(`text-body-sm` `color-text-secondary`, 말줄임). 아래 1px 선 | `size-header` · 사이 `space-2` | `.sub-head` |
| **Content Section** | `.ds-section` — `.ds-section__title`(`text-heading-sm`) · `.ds-section__desc`(`text-body-sm` `color-text-secondary`) · 본문. 절 사이 `space-6`, 제목–본문 `space-2` | `space-2` · `space-6` | `.step` |
| **Settings Section** | `.ds-settings` — `.ds-settings__row` 줄 목록: 라벨(왼쪽, `text-label` + 설명 `text-body-sm`) · 컨트롤(오른쪽). 줄 최소 높이 `size-control-md` + 위아래 `space-1`, 줄 사이 구분선 없음 | `text-label` | ⚙ 설정 화면 |
| **Result Section** | `.ds-result` — `.ds-result__summary`(한 줄 요약, `text-body`) + List Item 목록 + 빈 · 오류 상태 자리(§6.5 State) | `space-2` | `.results` · 트리 |
| **Bottom Action Bar** | `.ds-actionbar` — 위 1px 선, 바탕 `color-background-primary`. `.ds-actionbar__start`(Ghost: 취소 · 뒤로) · `.ds-actionbar__end`(오른쪽 끝 Primary 하나, 그 왼쪽 Secondary). PluginLayout의 flex 자식이라 본문을 가리지 않는다(본문만 스크롤 — 아래 여백 따로 두지 않음) | `size-action-bar` · 버튼 `size-control-md` · 사이 `space-2` · 좌우 `space-3` | `.sub-foot` · `.make-foot`(DS-3a 뒤 — 선택 탭 첫 화면의 `.sel-tools`는 아래 고정 줄이 아니라 카드 안 할 일 줄이 된다, ia-v4 §4.1b S3-D1). 내용이 밑에 깔릴 때만 `elevation-sticky`(S3-D10) |
| **Modal Layout** | Modal(§6.5)의 짜임 — `.ds-modal__header`(제목 `text-heading` + 닫기 Icon Button sm) · `.ds-modal__body`(스크롤) · `.ds-modal__footer`(오른쪽 [취소(Ghost)] [확인(Primary 또는 Destructive)], 위 1px 선) | `size-modal-*` · `radius-large` · `elevation-3` · 안쪽 `space-4` · 머리 · 바닥 위아래 `space-3` | `.modal` |

PluginLayout은 그릇이고, 요청 목록의 레이아웃 8종(Plugin Header ~ Modal Layout)을 담는다(그래서 표는 9행).

**버튼 자리 규칙:** 주 실행은 실행 줄 오른쪽 끝, 화면에 Primary 하나. 취소 · 뒤로는 왼쪽 Ghost. 여러 단계의 이전 · 다음은 늘 같은 자리. 같은 목적의 버튼은 모든 화면에서 자리 · 크기가 같다(brief §4).

## 6. 공통 UI Component (DS-2)

### 6.0 모든 컴포넌트에 같은 규칙 (DS-D11)

**이름 · 쓰는 법**
- CSS 클래스 `.ds-{이름}`, 변형 `.ds-{이름}--{변형}`, 크기 `--sm` · `--md` · `--lg`(md가 기본 — 클래스를 생략하면 md). 안쪽 부분은 `.ds-{이름}__{부분}`.
- 정적 HTML(`ui.html`)은 클래스를 바로 쓴다. `ui.ts`는 같은 클래스를 붙이는 작은 함수(`src/ui/components/` — §6.7)를 쓴다. 함수는 DOM 요소를 돌려주고, 상태를 바꾸는 메서드가 필요한 것만 객체로 돌려준다(표의 "함수" 칸).
- **상태는 클래스가 아니라 HTML 속성으로** 표시한다: `:hover` · `:active` · `:focus-visible` · `:disabled` · `aria-disabled="true"`(잠김) · `aria-busy="true"`(Loading) · `aria-pressed` · `aria-checked` · `aria-selected` · `aria-current` · `aria-invalid`. 상태용 클래스(`.is-hover` 등)는 모음 화면(§6.10)의 "강제 상태" 칸에서만 쓰고 그 CSS는 모음 화면 파일에만 둔다.

**상태 모양(§6.1–§6.5의 상태 칸은 이 표를 따른다)**

| 상태 | 모양 | 비고 |
|---|---|---|
| Default | 각 컴포넌트 표 | |
| Hover | 바탕 `color-interactive-hover`. Primary는 `color-primary-hover`, Destructive는 `color-state-error-hover` | 누를 수 있는 것만 |
| Active(누름) | Hover와 같다(토큰 하나 — DS-2 대략 시안 확인) | |
| Focus | 누르는 것: `focus-ring-default`(`:focus-visible`만 — 마우스 클릭엔 안 보임). 입력류: 테두리 `color-interactive-focus` + `focus-ring-field` + 바탕 `color-surface-primary` | |
| Disabled · 잠김 | **같은 모양**(DS-O4 해결) — ia-v3 §2.3(2026-11-18 사용자 결정)을 따른다: 글자 · 아이콘 `color-text-tertiary`, **hover 없음**, 투명도 쓰지 않음. 바탕: Primary · Destructive는 `color-surface-secondary`(테두리 `color-border-default`) — 색이 빠짐. Secondary는 바탕 그대로 · 테두리 `color-border-default`. Ghost · Link · Icon Button은 바탕 · 테두리 없음 그대로(회색 상자가 생기지 않게). 차이는 동작 · 커서: `aria-disabled="true"`(잠김)는 포커스를 받고 누르면 사유를 보이며 커서 `not-allowed`(ia-v3 §2.3), `:disabled`는 포커스 · 클릭 없음 · 커서 `default` | `opacity-disabled` 토큰은 Toggle · Checkbox · Radio의 꺼짐에만 남긴다. 잠긴 단추가 포커스를 받으면 `focus-ring-default`가 보여 구분된다 |
| Loading | `aria-busy="true"`: 글자 · 아이콘을 투명하게 해 너비를 지키고, 가운데 돌기(12px, `border-width-thick`, `motion-duration-spin`) — 돌기 색은 그 변형의 글자색. 마우스는 `pointer-events: none`으로, 키보드(Enter · Space)는 함수 `setLoading(true)`가 클릭 처리기를 막아서 누르기를 막는다 | Button · Icon Button · Split Button만 |

**공통**
- 누르는 곳은 최소 `size-hit-min`(24). 그보다 작은 것(Checkbox 14 등)은 라벨까지 누르는 곳에 넣는다.
- 아이콘만 있는 컴포넌트는 `aria-label`과 툴팁이 필수다. DS-2에서 지금 화면의 아이콘 단추는 지금 툴팁 장치(`title` 또는 `data-tip` → `#uiTip`)를 그대로 쓴다. 새 Tooltip 컴포넌트로 옮기는 일은 DS-3(§6.4).
- 색만으로 상태를 가르지 않는다(§1-6) — 상태 Badge · Alert · Toast는 아이콘을 함께 쓴다.
- 모든 값은 토큰(§8 — 컴포넌트 CSS도 검사 대상).

### 6.1 Action

| 컴포넌트 | 클래스 · 변형 · 크기 · 치수 | 함수 | 접근성 | 지금 코드 → DS-2 |
|---|---|---|---|---|
| **Button** | `.ds-btn` + `--primary` · (Secondary = 기본) · `--ghost` · `--danger` · `--link` / `--sm`(높이 24 · 좌우 `space-2` · `text-label-sm`) · md(28 · `space-3` · `text-label`) · `--lg`(32 · `space-4` · `text-label`). 둥글기는 세 크기 모두 `radius-small`(DS-D9 — xs는 16px 이하만). 아이콘 + 글자 사이 `space-1`, 버튼 안 아이콘 `size-icon-md`(sm은 `-sm`). Secondary 바탕 `color-secondary-bg` · 테두리 `color-secondary-border` · 글자 `color-text-primary`. Primary 바탕 · 테두리 `color-primary` · 글자 `color-text-on-primary` · `elevation-1`(§3.5). Ghost 테두리 · 바탕 없음 · 글자 `color-text-secondary` → hover `color-text-primary`. Destructive 바탕 `color-state-error` · 글자 `color-text-inverse`. Link: 높이 auto · 안쪽 0 · 테두리 · 바탕 없음 · 글자는 둘레를 따름(`font: inherit`, 굵기 `font-weight-semibold`) · `color-text-link` · **늘 밑줄**(아래 2px 띄움 — 링크 색이 #111111이라 글자와 밑줄로만 구분), hover 글자 `color-interactive-focus-hover` | `button({ variant, size, label, icon?, iconEnd?, onClick? })` → `{ el, setLoading(b), setDisabled(b), setLocked(reason) }` | `<button type="button">`. 잠김은 `aria-disabled` + 사유 | **바꿈**(§6.9) |
| **Icon Button** | `.ds-btn .ds-icbtn`(두 클래스 함께) + `--ghost`(기본으로 씀) · Secondary / `--sm` 24×24 · md 28×28. 아이콘 `size-icon-md`(sm도 16 — 누르는 곳만 작음), **안쪽 여백 0 · 가운데 맞춤 · 너비 = 높이**(`--sm`의 좌우 `space-2`를 덮음), 둥글기 `radius-small`, Ghost 글자 `color-text-secondary` | `iconButton({ icon, label, variant?, size? })` | `aria-label` = `label`, `data-tip` = `label` 필수 | **바꿈**(§6.9) |
| **Button Group** | `.ds-btngroup` — 붙임(이웃 테두리 겹침 `margin-left: -1px`, 바깥 모서리만 둥글게) · `.ds-btngroup--spaced`(사이 `space-2`) | `buttonGroup(buttons, { attached? })` | 붙임은 `role="group"` + `aria-label` | 클래스만(DS-3에서 씀) |
| **Split Button** | `.ds-split` = 주 버튼 + 펼침 Icon Button(▾). 둘 사이 나눔 선(펼침 단추의 왼쪽 테두리 1px): Primary는 `color-border-on-primary`(새 토큰 — 흰색 25%), Secondary는 `color-border-default` | `splitButton({ label, variant, onClick, menu: [{label, onClick}] })` | 펼침 단추 `aria-haspopup="menu"` · `aria-expanded` | 새로(모음 화면만) |

### 6.2 Form

| 컴포넌트 | 클래스 · 변형 · 크기 · 치수 | 함수 | 접근성 | 지금 코드 → DS-2 |
|---|---|---|---|---|
| **Input** | `.ds-input` — 높이 md 28 · `--sm` 24 · 좌우 `space-2` · `text-body` · 바탕 `color-surface-secondary` · 테두리 `color-border-default` → hover `color-border-strong` · `radius-small`. 오류: `aria-invalid="true"` → 테두리 `color-state-error`(옅은 `-border`가 아님 — 칸이 잘 보이게) + 아래 `.ds-help--error`(아이콘 `size-icon-sm` + 글, `color-state-error`). 꺼짐: 글자 `color-text-tertiary` · 커서 `default`(바탕은 기본과 같음 — 글자로 구분). 라벨 `.ds-label`(`text-label-sm` `color-text-secondary`) · 도움말 `.ds-help`(`text-body-sm`) · 묶음 `.ds-field`(세로, 사이 `space-1`) | `input({ value, placeholder, size?, invalid?, label?, help? })` | 라벨은 `<label for>` 또는 `aria-label` | **바꿈**(§6.9) |
| **Textarea** | `.ds-input .ds-textarea` — 높이 자유(최소 3줄 = 64), 위아래 `space-1`, `--mono`(`text-mono`), 세로로만 늘림. 기본 `textarea` 요소 규칙은 `--mono`와 같게(지금 mono — `#semMap`) | `textarea({ value, rows?, mono? })` | Input과 같음 | 기본 요소 규칙만 바꿈(mono 유지) |
| **Select** | `.ds-select` 그릇 + 안의 `<select class="ds-input">` + 오른쪽 `chevron-down` 아이콘(`size-icon-sm`, `color-text-secondary`, 오른쪽 `space-2`). 그릇 안에서만 브라우저 화살표를 숨기고(`.ds-select > select { appearance: none }`) 오른쪽 안쪽 `calc(var(--space-2) + var(--space-2) + var(--size-icon-sm))` | `select({ options, value, size? })` | 기본 `<select>` 그대로(키보드 · 화면 읽기) | 기본 `select` 요소 규칙만 Input 모양으로(브라우저 화살표 그대로 — 그릇 · 아이콘은 DS-3, §6.9) |
| **Checkbox** | `.ds-check` — **기본 `<input type="checkbox">`를 그대로 두고 모양만 그림**(`appearance: none`, 의사 요소 없이 입력 자체의 바탕으로 — Firefox에서도 그려짐): 14×14(`size-checkbox`) · `radius-xs` · 테두리 `color-border-strong` · 바탕 `color-surface-primary`. 체크(`:checked`): 바탕 · 테두리 `color-interactive-focus` + 가운데 ✓ 그림(`background-image`의 SVG data URI, 10px — CSS의 `vector-effect`가 닿지 않으므로 SVG 안 도형에 `vector-effect="non-scaling-stroke" stroke-width="1.5"`를 직접 쓴다). 일부(`:indeterminate`): ✓ 대신 가로 막대 그림. data URI 안 선 색은 #FFFFFF로 쓴다 — `color-text-on-primary`와 같은 값이어야 하고(§8-8 검사), 토큰 값이 바뀌면 함께 바꾼다. 꺼짐(`:disabled`): `opacity-disabled`. 잠김(`aria-disabled` — `makeOptLink` · `makeOptRename` · `makeOptDark` · `tsLinkNow`): **투명도 없이**(ia-v3 §2.3) — 안 체크 테두리 `color-border-default` · 바탕 `color-surface-secondary`, 체크 바탕 · 테두리 `color-text-tertiary` + 흰 ✓, 라벨 `color-text-tertiary`(지금 `label.inline:has(input[aria-disabled])` 규칙 그대로), 커서 `not-allowed`. 포커스 `focus-ring-default`. 라벨과 사이 `space-1`(지금 `label.inline`과 같음), 라벨까지 누르는 곳 | `checkbox({ label, checked, indeterminate? })` | 기본 체크박스라 키보드 · 화면 읽기 그대로 | **바꿈**(§6.9) |
| **Radio** | `.ds-radio` — Checkbox와 같은 방식 · `radius-full` · 고름: 테두리 굵기 `calc(var(--border-width-thick) + var(--border-width-thick))` `color-interactive-focus`(가운데 흰 점처럼) | `radioGroup({ name, options, value })` | `<fieldset>` + `<legend>` 또는 `role="radiogroup"` | 새로(모음 화면만) |
| **Toggle** | `.ds-toggle` — 트랙 `size-toggle-w` × `size-toggle-h` · `radius-full`, 끔 `color-border-strong` · 켬 `color-primary`. 손잡이 12 · `color-surface-primary` · `toggle-knob-shadow` · 이동 `motion-duration-fast`. 일부(mixed): 트랙 `color-primary` + 손잡이 대신 가운데 가로 막대 12×4(지금 `.bv-switch` mixed와 같음) | `toggle({ checked, mixed?, label })` | `<button role="switch" aria-checked>` | 클래스만(지금 `.bv-switch`는 DS-3) |
| **Search Field** | `.ds-search` — Input + 왼쪽 돋보기(`size-icon-md`, `color-text-tertiary`, 왼쪽 안쪽 `calc(var(--space-2) + var(--space-2) + var(--size-icon-md))`) + 값이 있으면 오른쪽 지우기 Icon Button(sm, `x`). 높이는 Input을 따르고, 목록 머리 검색은 `size-compact`(26 — ia-v4 §8 "검색 26") | `searchField({ placeholder, onInput, onClear })` | `type="search"`, 지우기 단추 `aria-label` | 클래스만(DS-3) — DS-2에서는 지우기 단추 글자 ✕만 `x` 아이콘으로(Icon Button, §6.9) |

### 6.3 Navigation

| 컴포넌트 | 클래스 · 변형 · 크기 · 치수 | 함수 | 접근성 | 지금 코드 → DS-2 |
|---|---|---|---|---|
| **Tab** | 밑줄형 `.ds-tabs` > `.ds-tab` — 높이 `size-nav`, 사이 `space-4`, `text-label`, 글자 `color-text-secondary` → hover `color-text-primary` → 고름 `color-text-emphasis` + 아래 `border-width-thick` `color-primary` 막대(줄 아래 1px 선과 겹침). 세그먼트형 `.ds-seg` > `.ds-seg__item` — 그릇 바탕 `color-surface-secondary` · 안쪽 `space-0-5` · `radius-small`, 항목 높이 `size-control-sm` · 좌우 `space-3` · `text-label-sm` · `radius-small`, 고름 바탕 `color-surface-primary` + `elevation-1` + `color-text-emphasis` | `tabs({ items, value, onChange, kind: 'underline' \| 'segment' })` | `role="tablist"` · `tab` · `aria-selected` · 화살표 키로 이동(roving tabindex) | 클래스만(DS-3) |
| **Navigation Item** | `.ds-navitem` — 높이 `size-control-md` · 좌우 `space-2` · 사이 `nav-item-gap`(3) · `radius-small`, 2단 `--lv2`(왼쪽 `space-4` — 지금 `.vs-item.lv2`와 같음), 고름(`aria-current="true"`) 바탕 `color-surface-selected` · `color-text-emphasis` · 굵게 · 개수 배지 `nav-selected-badge-bg`, hover `color-interactive-hover`, 위험 `--danger`(글자 `color-state-error`) | `navItem({ label, count?, level?, selected? })` | 목록 `role="listbox"`면 `option` + `aria-selected` | 클래스만(지금 `.vs-item`은 DS-3) |
| **Breadcrumb** | `.ds-crumb` — 링크(`color-text-link` 밑줄) · 구분 `chevron-right` 12px `color-text-tertiary` · 마지막은 글자(굵게, `aria-current="page"`), 사이 `space-1`, `text-body-sm` | `breadcrumb(items)` | `<nav aria-label>` + `<ol>` | 새로(모음 화면만) |
| **Step Indicator** | `.ds-steps` > `.ds-step` — 원 16(번호 `text-caption`) + 글자 `text-label-sm`, 사이 선 20 × 1 `color-border-strong`. 남음: 원 테두리 `color-border-strong` · 글자 `color-text-tertiary`. 지금(`aria-current="step"`): 원 `color-primary` · 번호 `color-text-on-primary` · 글자 `color-text-emphasis`. 지남: 원 `color-surface-selected` + ✓ · 글자 `color-text-secondary` | `steps({ items, current })` | `<ol>` + 지금 단계 `aria-current="step"` | 새로(지금 `.steps`는 DS-3) |

### 6.4 Data Display

| 컴포넌트 | 클래스 · 변형 · 크기 · 치수 | 함수 | 접근성 | 지금 코드 → DS-2 |
|---|---|---|---|---|
| **Badge** | `.ds-badge` — 높이 16 · 좌우 `space-1` · `text-caption` · `radius-xs`. 아이콘은 `size-icon-sm`. 기본(숫자) 바탕 `color-surface-secondary` · 글자 `color-text-secondary`. `--success` · `--warning` · `--error` · `--info`: 바탕 상태 `-subtle` + 글자 상태색 + 아이콘 필수. `--solid`: 바탕 `color-surface-inverse` · 글자 `color-text-inverse`. `--dot`(겹쳐 붙는 숫자 원, 14 · `radius-full` — 지금 `.mini-badge`): 색조를 **채움**으로 — 기본 `color-surface-inverse`, `--dot.ds-badge--success` · `--dot.ds-badge--error`는 바탕 상태색 + 글자 `color-text-inverse`. 안의 ✓ · ! 글자는 표시 기호라 아이콘 필수 규칙의 예외. `--outline`(바탕 없음 · 테두리 1px `color-border-strong` · 글자 `color-text-secondary` — 지금 `.lib-tag`) | `badge({ text, tone?, icon?, outline? })` · 아이콘 `size-icon-sm` | 숫자만이면 뜻을 `aria-label`로(예: "변수 24개") | **바꿈**(§6.9) |
| **Tag** | `.ds-tag` — 높이 20 · 좌우 `space-2` · `radius-full` · `text-body-sm` · 바탕 `color-surface-secondary` · 글자 `color-text-secondary`, `--warn`(주의 — 바탕 `color-state-warning-subtle` · 글자 `color-state-warning`), `--outline`(바탕 없음 · 테두리 `color-border-strong`). **변수 칩** `.ds-chip` — 옅은 칸 `.ds-chip__alias`(`chip-alias-text`) + 짙은 칸 `.ds-chip__value`(`chip-value-bg` · `chip-value-text`), mono 11 · 높이 20 · `radius-full` · 테두리 `color-border-default` | `tag({ text, tone? })` · `chip({ alias?, value? })` | 장식이면 그대로, 누를 수 있으면 `<button>` | **바꿈**(§6.9 — `.chip`만. 트리 태그 `.tr-tag` · 변수 칩 `.vchip`은 TR-D3 · TR-D9 모양이라 DS-3) |
| **Tooltip** | `.ds-tip` — 바탕 `color-surface-inverse` · 글자 `color-text-inverse` · `text-body-sm` · 안쪽 `space-1` `space-2` · `radius-small` · `elevation-2` · 최대 너비 240 · 꼬리 8 | `tooltip(el, text)` — 나중에 붙인 요소에도 걸리게(위임), `title`과 겹치지 않게 `title`을 옮겨 담고, 위아래 뒤집기 · 창 안 클램프에 맞춰 꼬리 위치를 계산, 모달 위에도 보이게 `z-tooltip` | 툴팁은 보조 — 뜻은 `aria-label`에 | 클래스 · 함수만. 지금 `#uiTip`(z 30 · 시작 때만 연결 · `title` 겹침)을 이것으로 옮기는 일은 DS-3 |
| **Card** | `.ds-card` — 테두리 `color-border-default` · `radius-medium` · 바탕 `color-surface-primary` · 안쪽 `space-3` · 그림자 없음. 머리 `.ds-card__title`(`text-heading-sm`) + `.ds-card__desc`. **안에 Card 금지**(§1-7). **lg 크기**(DS-3a — 선택 탭 첫 화면 카드만, ia-v4 §4.1b): 안쪽 · 묶음(머리 · 본문 · 할 일 줄) 사이 `space-4`, 제목–둘째 줄 `space-2`, 맨 위 카드의 제목만 `text-display`(창에 하나) | `card({ title, desc?, body })` | | 클래스만(지금 `.step` · `.sel-card`는 DS-3) |
| **List Item** | `.ds-li` — 최소 높이 32 · 위아래 `space-1` · 좌우 `list-row-pad-x` · 사이 `space-2`, 줄 사이 구분선 `color-border-default`(`--plain`이면 없음 — TR 트리 모양), hover `color-interactive-hover`, 고름 `color-surface-selected`. 두 줄 `.ds-li__sub`(`text-body-sm` `color-text-secondary`) | `listItem({ lead?, title, sub?, trail? })` | 고를 수 있는 목록이면 `role="option"` | 클래스만(DS-3) |
| **Table** | `.ds-table` — 머리 줄 28(`text-label-sm` `color-text-secondary` · 아래 1px `color-border-strong`) · 줄 32(아래 1px `color-border-default`) · 좌우 `space-2` · 숫자 칸 `--num`(mono · 오른쪽 맞춤) · 고른 줄 `color-surface-selected` · `radius-none` | `table({ columns, rows })` | `<table>` + `<th scope>` | 새로(모음 화면만) |
| **Progress Indicator** | 막대 `.ds-progress`(높이 4 · 트랙 `color-surface-secondary` · 채움 `color-primary` · 오류 `--error` 채움 `color-state-error` · `radius-full` · 너비 변화 `motion-duration-fast`), 돌기 `.ds-spinner`(16 · 12 sm · 테두리 `border-width-thick` `color-surface-selected` + 위 `color-primary` · `motion-duration-spin`), 단계 수 `.ds-progress__count`(`text-body-sm`) | `progress({ value, max })` · `spinner({ size })` | 막대 `role="progressbar"` + `aria-valuenow`, 돌기 `role="status"` + 숨은 글 | 클래스만(DS-3) |

### 6.5 Feedback

| 컴포넌트 | 클래스 · 변형 · 크기 · 치수 | 함수 | 접근성 | 지금 코드 → DS-2 |
|---|---|---|---|---|
| **Alert** | `.ds-alert` + `--info` · `--success` · `--warning` · `--error` — 아이콘(`size-icon-md`, `info` · `circle-check` · `triangle-alert` · `circle-alert`) + 글(`text-body-sm`, 머리말 굵게 선택). 바탕 상태 `-subtle`, 글 · 아이콘 상태색. 띠(기본 — 카드 · 모달 안): 테두리 없음 · `radius-small` · 안쪽 `space-2` `space-3`. 상자 `--box`(카드 밖): 테두리 1px — Info · Error는 상태 `-border`, Warning · Success는 `color-border-default`(상태 테두리 토큰 없음) · `radius-medium`. 닫기는 끝에 Icon Button sm | `alert({ tone, title?, text, onClose? })` | 오류는 `role="alert"`, 나머지 `role="status"` | 클래스만(지금 `.banner` · `.ux` 등은 DS-3) |
| **Toast** | `.ds-toast` — 창 아래 가운데(아래 `space-3` 띄움), 최대 너비 = 창 − 2 × `space-3`, 바탕 `color-surface-inverse` · 글 `color-text-inverse` · `text-body-sm` · 안쪽 `space-2` `space-3` · `radius-large` · `elevation-2` · `z-tooltip`. 앞 아이콘(성공 `circle-check` · 오류 `circle-alert` · 안내 `info`) · 끝 동작 링크(밑줄, 굵게). 끝에 닫기 Icon Button(sm, `x`, `color-text-inverse`). 한 번에 하나(새 것이 옛 것을 바꿈). **남는 시간 — SC-D10을 따른다:** 잠금 사유 · 이 화면의 실패 · 진행 알림은 4초 뒤 사라짐, **다른 화면의 실패와 누를 동작이 있는 알림은 누르거나 닫을 때까지 남음**. 마우스를 올리거나 포커스가 들어가면 시간이 멈춤 | `toast({ tone, text, action?: {label, onClick}, sticky? })` → `{ close() }` — `action`이 있으면 `sticky`가 기본 | 담는 곳 하나 `role="status"` `aria-live="polite"`(오류 `assertive`) | 새로(SC-D10). **DS-3b에서 공통 상태 줄을 모든 화면에서 없애고 결과 · 실패 알림을 Toast 하나로**(ia-v4 §4.1b S3-D7 · B.43) — 진행은 옮기지 않음. 모양은 사용자 시안(연한 상태색 바탕 · 테두리 없음 · `elevation-2`)으로 바꾸고 글자 대비 4.5:1 이상(S3-P4 — B.43에서 확정). 동작이 있는 알림이 사라지는 때는 지금 `dismissStickyOnAction`(다른 클릭 · 입력 · 탭 · 선택 바뀜) 그대로. 아래 고정 줄이 있는 화면은 그 줄 위에 띄움 |
| **Modal** | `.ds-modal-scrim`(전체 · `color-overlay` · `z-modal` · 위 `space-10` 띄움) > `.ds-modal`(너비 `size-modal-md`, 좁으면 창 − 2 × `space-4`, 최대 높이 창 − 80 · 바탕 `color-surface-primary` · `radius-large` · `elevation-3`) + Modal Layout(§5) | `openModal({ title, body, actions, onClose })` → `{ close() }` — 처음 포커스를 첫 입력 또는 닫기에, Tab 가두기, Esc · 막 누르면 닫기(바뀐 내용이 있으면 확인), 닫으면 연 단추로 포커스 되돌림 | `role="dialog"` · `aria-modal="true"` · `aria-labelledby` | 클래스 · 함수만(지금 `.modal`은 DS-3) |
| **Confirm Dialog** | Modal `--sm`(`size-modal-sm`) + 본문 한두 문장 + [취소(Ghost)] [확인]. 위험한 일은 확인이 Destructive | `confirmDialog({ title, text, confirmLabel, danger? })` → `Promise<boolean>` — 처음 포커스는 위험하면 **취소**, 아니면 **확인** | `role="alertdialog"` | 새로(지금 `.ed-confirm` 확인 줄은 DS-3에서 정함) |
| **Empty State** | `.ds-state` — 가운데, 위아래 `space-8`, 아이콘 `size-icon-lg` `color-text-tertiary` · 제목 `text-display` `color-text-emphasis` · 설명 `text-body-sm` `color-text-secondary` · 동작 Button(Secondary) | `stateView({ kind: 'empty' \| 'error' \| 'success', icon, title, text, action? })` | 제목은 머리 요소(`h2` 등) | 클래스만(DS-3) |
| **Loading State** | `.ds-skeleton` 줄(높이 10 · `radius-full` · `color-surface-secondary`, 너비 60–90% 섞음) 또는 `.ds-state` + 돌기 | `skeleton(rows)` | `aria-busy="true"` + 숨은 "불러오는 중" | 클래스만(지금 `.tr-skel` · `.var-loading`은 DS-3) |
| **Error State** | `.ds-state--error` — 아이콘 `circle-alert` `color-state-error` + 다시 시도 Button(Secondary) | `stateView({ kind: 'error' })` | `role="alert"` | 클래스만(DS-3) |
| **Success State** | `.ds-state--success` — 아이콘 `circle-check` `color-state-success` | `stateView({ kind: 'success' })` | `role="status"` | 클래스만(DS-3) |

### 6.6 아이콘 (DS-D13)

- 원본: npm `lucide-static@1.79.0` — devDependency로만 둔다(플러그인 실행 때 쓰지 않음). **라이선스는 ISC이고, Feather에서 온 아이콘은 MIT(© Cole Bemis)다** — 이 세트에서는 `arrow-left` · `arrow-right` · `check` · `chevron-down` · `chevron-right` · `circle-alert` · `circle-help` · `ellipsis` · `external-link` · `info` · `lock` · `minus` · `plus` · `search` · `trash-2` · `triangle-alert` · `x`(17개 — lucide LICENSE 기준. DS-3a에서 더하는 `hash`도 Feather에서 왔다 — 18개). 두 고지 전문을 생성 파일 머리에 `/*! … */`로 남기고, 빌드는 `dist/ui.html`의 **`<style>` 안 맨 앞**에 같은 고지를 CSS 주석(`/*! … */`)으로 넣는다(`<style>` 밖에 두면 HTML 글자로 보인다). JS 번들 쪽 고지는 esbuild의 법적 주석 보존(기본값)으로 남는다.
- 생성: `scripts/gen-icons.mjs`가 아래 아이콘의 SVG 안쪽(`<path>` 등)만 뽑아 `src/ui/icons.json`(이름 → 안쪽 마크업)을 만든다(커밋함). `src/ui/icons.ts`는 그 JSON을 가져와(esbuild JSON 가져오기) `icon()`을 내보내고, `build.mjs`는 같은 JSON을 읽어 정적 HTML을 바꾼다. 아이콘을 더할 때만 다시 돌린다.
- 모양: `<svg class="ds-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">`. 크기는 `size-icon-sm`(12) · `-md`(16, 기본) · `-lg`(20)만 쓴다. **선 굵기는 크기와 상관없이 1.5px** — 안쪽 모든 도형에 `vector-effect: non-scaling-stroke` + `stroke-width: var(--icon-stroke)`(새 토큰 1.5px). 색은 글자색(`currentColor`).
- 쓰는 법: TS `icon(name, size?)` → SVG 요소. 정적 HTML은 `<i data-ds-icon="settings"></i>`를 쓰면 빌드가 SVG로 바꾼다(없는 이름이면 빌드 실패). `data-i18n`으로 글자를 바꾸는 요소 안에는 넣지 않는다(i18n이 `textContent`로 지운다) — 그런 요소는 글자를 자식 `<span data-i18n>`에 둔다.
- 세트(24개): `chevron-down` · `chevron-right` · `arrow-left` · `arrow-right` · `x` · `check` · `plus` · `minus` · `settings` · `ellipsis` · `search` · `info` · `circle-alert` · `triangle-alert` · `circle-check` · `circle-help` · `copy` · `trash-2` · `refresh-cw` · `lock` · `external-link` · `loader-circle` · `eye` · `eye-off`. DS-3a에서 `hash` 하나를 더한다(25개 — 만들기 화면 · 만들기 카드 미리보기의 색 아닌 줄 종류 표시, ia-v4 §4.1b S3-D11).
- **DS-2에서 지금 화면의 기호를 바꾸는 곳은 아래뿐**(DS-D12 기본 5종 안). 나머지 기호는 그대로 두고 DS-3에서:

| 지금 | 자리 | DS-2 |
|---|---|---|
| ✕ 글자 | 변수 탭 검색 지우기 `#btnSearchClear`(`.icon-btn`) | `x` |
| ← 글자 | 돌아가기 `#btnSubBack` · `#btnSettingsBack`(`.sub-back`) | `arrow-left` |
| 인라인 SVG | ⚙ 설정 `#btnSettings` · — 최소화 `#btnMinimize`(`.tab-min`) · ＋ 새 변수 · ⋯ 메뉴(변수 탭 머리 줄 `.icon-btn`) | `settings` · `minus` · `plus` · `ellipsis` — 같은 자리 · 같은 단추 크기, 아이콘은 지금 12 · 14 → `size-icon-md` 16(★ — Icon Button 규칙 §6.1) |

- 그대로 두는 기호(DS-3): 트리 펼침 ▾/▸(`button.tr-car` — TR-D1 · TR-P5 글자 모양, 안 쓰는 변수 트리 ▼/▶ — TR-D12) · 변수 탭 그룹 ▾/▸(`.vt-group .tw`) · `#paletteCaret` · 건너뛴 곳 칩 글의 ▸ · 복사 ⧉(`.ed-copy` — 단추 글자를 바꿔 끼우는 코드라 라벨 span을 따로 둔 뒤에) · ⓘ "i"(`.mk-info`) · 이동 → (`.ed-go`) · 고르개 ▾/▴(`button.ed-dd`) · 문구 속 → · ↗ · 🔒 · ✓(글자의 일부 — DS-3 영어 문구 때).

### 6.7 만드는 방법 · 파일 (DS-D11)

| 파일 | 내용 |
|---|---|
| `src/ui/components/*.css` | 컴포넌트마다 한 파일(`button.css` · `input.css` …). 토큰만 쓴다(§8). |
| `src/ui/components/*.ts` | 같은 이름의 함수(§6.1–§6.5 "함수" 칸). DOM을 만들고 클래스 · 속성을 붙이며, 문구는 부르는 쪽이 `t()`로 넘긴다(컴포넌트 안에 한국어 · 영어 문구 없음). |
| `src/ui/components/index.ts` | 모두 내보냄. `ui.ts`는 여기서 가져온다. |
| `src/ui/layouts/layouts.css` | §5의 레이아웃 클래스. |
| `src/ui/icons.json` · `src/ui/icons.ts` | §6.6 생성 데이터(커밋) + `icon()` 함수. |
| `src/gallery/gallery.html` · `gallery.ts` | §6.10 모음 화면. |
| `build.mjs` | `src/ui/**/*.css`를 이름 순으로 이어 `ui.html`의 새 자리 표시 `/* @ds-components */`에 넣는다 — **`:root { … }` 묶음을 닫은 바로 뒤, 화면 CSS 앞**(그래서 화면 CSS가 뒤에 와 같은 특이도면 이긴다 — §6.9의 옛 규칙 지우기가 필요한 까닭). `<i data-ds-icon>`을 SVG로 바꾼다. 아이콘 고지를 넣는다. 새 스크립트 `npm run gallery`(`node build.mjs --gallery`)는 `dist/ds-gallery.html`을 만든다(`dist/`는 통째로 `.gitignore` — 커밋하지 않음). |

- 상태 · 모양 CSS는 컴포넌트 파일에만 둔다. 화면 CSS(`ui.html` `<style>`)는 자리 · 배치만 맡는다 — DS-2에서 옮긴 5종은 `ui.html`에서 모양 규칙을 지운다(§6.9).
- 런타임 의존을 더하지 않는다(Lucide는 생성 때만).

### 6.8 컴포넌트가 새로 쓰는 토큰

| 토큰 | 값 | 쓰임 |
|---|---|---|
| `global.error-hover` | #C13E3E (`error`에 검정 10%) | Destructive hover |
| `color-state-error-hover` | → `global.error-hover` | Destructive 버튼 hover · 누름 바탕 |
| `global.white-a25` | rgba(255,255,255,.25) | 주 버튼 위 나눔 선 |
| `color-border-on-primary` | → `global.white-a25` | Split Button(Primary) 나눔 선 |
| `icon-stroke` | 1.5px (`$type: dimension`, 그룹 `icon` — §2.2) | 아이콘 선 굵기(`vector-effect: non-scaling-stroke`와 함께 — 모든 크기에서 1.5px) |

- 대비 검사(§8-6)에 `color-text-inverse` ↔ `color-state-error-hover`(4.5:1 이상 — #C13E3E 위 흰 글자 5.2:1)를 더한다.

### 6.9 지금 화면에서 바꾸는 기본 5종 (DS-D12)

**바꾸는 방법(모두 같음):**
1. 그 요소에 `ds-` 클래스를 더한다(HTML 본문 · `ui.ts` · `treeList.ts`의 만드는 곳). **옛 클래스 이름은 지우지 않는다** — 동작 코드와 `scripts/verify-bind-flow.mjs`가 그 이름으로 찾는다.
2. `ui.html` `<style>`에서 옛 클래스의 **모양 규칙**(색 · 테두리 · 높이 · 글자 · 안쪽 여백 · 둥글기 · 상태)을 지운다. 자리 규칙(`margin` · `flex` · `width` · `position`)은 남긴다.
3. 기본 요소 규칙(`button { … }` · `input[type=text] { … }` · `input[type=checkbox] { … }`)은 각 컴포넌트의 기본(Secondary md · Input md · Checkbox)과 **같은 선언**을 쓰게 바꾼다 — 클래스를 아직 안 붙인 요소도 같은 모양이 되게(같은 CSS를 두 번 쓰지 않도록 컴포넌트 CSS의 선택자에 기본 요소를 함께 적는다: `button, .ds-btn { … }`).

| 컴포넌트 | 바꾸는 것(옛 클래스 → 더할 클래스) | 바꾸지 않는 것(DS-3) |
|---|---|---|
| **Button** | 기본 `button` → Secondary md · `.primary`(`#btnApplyConfirm.bind-btn` 포함 — 아이콘 없음) → `ds-btn--primary` · `.danger` → `ds-btn--danger` · `.link` · `.link-btn` → `ds-btn--link`(`.link-btn`은 누르는 곳 24 유지 · 밑줄이 hover 때만에서 늘로 바뀜. 자리별로 낮춘 높이 — `.mk-lock … button.link-btn` 20 · `.ed-alert.paid button.link-btn` 18 · `.make-free .mfb2 button.link-btn` · `.mk-bar #makeSemLic` 18 · `.status-line .sl-action` 20 — 는 띠 줄 높이를 지키는 **자리 규칙으로 남긴다**) · `.btn-next` → `ds-btn--ghost` · `.mk-row button` → `ds-btn--sm` | `.step-chip`(Step) · `.ctx-menu button`(메뉴) · `.mk-tabs button` · `.tab-btn` · `.subtab`(Tab) · `.bv-switch`(Toggle) · `button.bd-skip`(`.bd` 알약 칩) · `.var-use` · `.ed-copy` · `.ed-pillbtn` · `.ed-plink` · `.ed-go` · `button.ed-dd` · `button.tr-car` · `.mk-info` · `.mini-mark` · `.bv-chip` · `.bv-val` · `.bv-var` |
| **Icon Button** | `.icon-btn` → `ds-btn ds-icbtn ds-btn--ghost ds-btn--sm`(지금 24) · `.tab-min` · `.sub-back` → `ds-btn ds-icbtn ds-btn--ghost`(지금 28 — md). 기호 → §6.6 표의 아이콘. 툴팁이 없는 `#btnSubBack` · `#btnSettingsBack` · `#btnSearchClear`에는 `aria-label`과 같은 문구 키로 `data-i18n-title`과 폴백 `title`을 함께 더한다(`title="돌아가기"` · `title="검색 지우기"` — `verify-i18n`이 폴백을 요구) | 위 칸의 아이콘처럼 생긴 단추들 |
| **Input · Select** | `input[type=text]` · `input[type=number]` · `select` · `textarea` 기본 규칙 → `.ds-input` 규칙(textarea는 `--mono`, select는 브라우저 화살표 그대로 — 그릇 · ▾ 아이콘은 DS-3). 포커스를 `focus-ring-field` 하나로(DS-O3): `.r-title input:focus`(지금 1px outline) · `.ed-field:focus-within`(이미 같음 — 확인만) · `.ts-edit input` · `select.r-role`(기본 규칙을 받음). 목록 머리 검색칸 `.list-head .search-box input`은 높이 `size-compact` 유지 | `.ed-picker input.ed-psearch`(`overflow: hidden` 고르개 안이라 바깥 띠가 잘림 — 안쪽 그림자 예외로 둠) · `.tr input.tr-edit`(늘 편집 중인 칸 — 자기 테두리) · `.palette-band` 안 입력의 흰 바탕(자리 규칙) · `.mode-select` · `input[type="color"]` |
| **Checkbox** | 모든 `input[type="checkbox"]`(HTML 8곳 · `ui.ts` 1곳) → `ds-check` 모양(기본 요소 규칙으로 — 클래스는 붙이지 않아도 됨). `accent-color` 규칙 지움 | 스위치(`.bv-switch`) |
| **Badge · Tag** | `.mini-badge` → `ds-badge ds-badge--dot`(`.ok` → `--success` · `.fail` → `--error` 색조, 글자 ✓ · ! 그대로) · `.bv-new` → `ds-badge ds-badge--solid` · `.vs-badge` → `ds-badge`(고른 항목 안에서는 Navigation Item 규칙으로 `nav-selected-badge-bg`) · `.lib-tag` → `ds-badge ds-badge--outline` · `.chip`(변수 고치기 팝업의 칩) → `ds-tag` | `.tr-tag`(트리 태그 — TR-D9 칩 열) · `.vchip`(TR-D3) · `.step-chip` · `.ed-ptag` · `.ed-pill` |

- **옛 규칙 지우기:** 옛 클래스를 포함하는 **모든** 선택자(겹친 선택자 · 상태 선택자 포함, 예: `button.primary:hover…` · `button[aria-disabled="true"]` · `.mk-row button`)에서 모양 선언을 지운다. 구현 때 `grep`으로 찾은 목록을 PR에 적는다.
- **바뀌는 굵기 · 크기:** Badge는 `text-caption`(10 · 700) — 지금 `.bv-new` 600 · `.vs-badge` · `.mini-badge` 700 · `.lib-tag` 700(10/12)이라 `.bv-new`만 600 → 700(verify "16 N 배지 … 600" 기대값을 700으로). `.lib-tag` 줄 높이 12 → 16(Badge 높이 — `.ed-pill` · 고르개 `.ed-opt` 안이라 줄이 늘지 않음). `.chip` 11 · 안쪽 4 → Tag 11 · 안쪽 8 · 높이 20. 화면 흐름 검사에서 깨지는 px 기대값은 PR에 목록으로 적고 고친다.
- **잠긴 · 꺼진 버튼:** §6.0 상태 표대로(ia-v3 §2.3과 같음 — verify "26 잠긴 주 버튼 모양(B.23)"은 그대로 통과). `:disabled` 버튼은 지금 투명도 .5 → 투명도 없이 흐린 글자로 바뀐다. 잠긴 Destructive(예: 0개일 때 [선택한 0개 지우기])는 지금 `button.danger`가 뒤에 와 빨간 바탕 그대로 보이던 것이 회색으로 바뀐다(버그 고침).
- **그 밖에 바뀌는 모양:** `.sub-back` 글자색 `color-text-primary` → Ghost `color-text-secondary`(hover에서 primary). 머리 줄 아이콘 12 · 14 → 16.

### 6.10 개발용 모음 화면 `dist/ds-gallery.html`

- 플러그인에 들어가지 않는다(`manifest.json` 바꾸지 않음). 빌드: `npm run gallery`. 브라우저로 바로 연다.
- 짜임: 왼쪽 목록(Foundations: Color · Typography · Spacing · Radius · Elevation · Icons / Components 30종 / Layouts 9종) · 오른쪽 본문. 폭 560 미리보기 틀 켜기/끄기(플러그인 창 크기로 보기).
- Foundations: 토큰 표 + 대략 시안 4판의 **변수 상세 패널**(참조 사슬 · 쓰임 · 쓰는 곳 · 대비 · 코드)을 `tokens.json`에서 그린다.
- 컴포넌트마다: 변형 × 크기 표 · 상태 줄(Default · Hover · Active · Focus · Disabled · 잠김 · Loading — 강제 상태 클래스) · 쓰는 토큰 목록 · 코드 예시(클래스 · 함수) · 접근성 메모.
- 검사: `scripts/verify-gallery.mjs`(Playwright) — 30종 · 9종 칸이 모두 그려지는지, 페이지 오류 0, 가로 스크롤 0(560 틀). `package.json`에 `"gallery": "node build.mjs --gallery"`를 더하고, CI에 한 단계(`npm run gallery && node scripts/verify-gallery.mjs` — verify-bind-flow 다음)를 더한다.

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

`test/design-tokens.test.mjs` — `npm test`에 들어가 CI에서 돈다. 대상: `src/ui.html`의 `<style>`(주석 뺌) · 본문 `style="…"`, `src/ui.ts` · `src/treeList.ts`의 문자열(innerHTML 안 `style="…"` 포함) · `style.*` · `setProperty`. DS-2부터 `src/ui/**/*.css` · `src/ui/**/*.ts` · `src/gallery/*`(모음 화면 강제 상태 CSS 포함)도 같은 규칙으로 본다.

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
8. (DS-2) **아이콘 데이터 URI 색:** 컴포넌트 CSS의 `url("data:image/svg+xml,…")` 안 색은 #FFFFFF만 허용하고 `color-text-on-primary`의 값과 같아야 한다(Checkbox ✓ · 막대).

## 9. 열린 결함

| 번호 | 결함 | 언제 |
|---|---|---|
| DS-O1 | `color-text-tertiary`(#999999) 흰 바탕 2.85:1 — 글자 기준 미달. 자리 표시 글 · 비활성 · 장식에만 쓴다(보조 글자는 `-secondary` #555555 7.5:1). 대비 검사 예외 | 쓰임 제한으로 유지 |
| DS-O2 | 상태 글자 대비(DS-D7 — 지정 값 그대로): Warning #B7791F 흰 바탕 3.6:1 · 옅은 바탕 3.3:1, Error #D64545 흰 바탕 4.4:1 · 옅은 바탕 3.8:1 · 흰 글자를 얹은 삭제 버튼 4.4:1, Success #16845B 옅은 바탕 4.1:1. 대비 검사 예외 | 사용자 결정으로 유지 |
| DS-O3 | 포커스 모양이 두 가지(`focus-ring-default` · `focus-ring-field`)이고, 스위치 · 일부 줄은 `outline`으로 따로 그린다 | DS-2에서 입력류는 `focus-ring-field` 하나로(§6.9). 누르는 것 · 입력 두 가지는 규칙으로 남김(§6.0). 스위치의 `outline` · 줄(`.tr` · `.vs-item` · `.vt-row`)의 안쪽 그림자 포커스는 DS-3 |
| DS-O4 | 잠긴 버튼(`aria-disabled`)과 꺼진 버튼(`:disabled`)의 모양이 다르다(글자 흐림 · 투명도) | DS-2에서 같은 모양으로(§6.0 상태 표) |
| DS-O5 | `.ed-copy` · `.ed-plink`가 포커스 색(`--accent` 2.9:1)을 글자에 썼다 — ① 단계에서 `color-text-link`로 옮김(부록 A.1). ② 뒤 #111111로 해결 | 닫힘(DS-1) |

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

- [x] B.1 `design-tokens/tokens.json` ① 단계(A.0) — §3의 모든 토큰, `$description` = 쓰임, DS-2 예약 토큰은 `$extensions.reserved`
- [x] B.2 `build.mjs` — 원본 → `:root` CSS를 `/* @design-tokens */`에, 참조는 `var()`로, watch가 원본 변경도 봄
- [x] B.3 `src/ui.html` `:root`의 옛 변수 지우고 자리 표시만(`color-scheme: light`는 남김)
- [x] B.4 `src/ui.html` CSS 전부 A.1–A.3대로(직접 값 0)
- [x] B.5 `src/ui.html` 본문 `style="font-size:…"` 2곳 → 토큰(나머지 `display:none` · 너비는 §8-1 대상 속성이 아님)
- [x] B.6 `src/ui.ts` · `src/treeList.ts`의 옛 변수 이름과 innerHTML · `style.margin*` 안 직접 간격 · 둥글기 · 색 → 토큰(`treeList.ts`의 4px · 16px 그룹 여백 → `var(--space-1)` · `var(--space-4)`)
- [x] B.7 `test/design-tokens.test.mjs` — §8의 1–7
- [x] B.8 `scripts/verify-bind-flow.mjs`가 읽는 옛 변수 이름(`--border` · `--text` · `--text-2` · `--muted` · `--swatch-line`)을 새 이름으로. 글자 크기 검사(`^[\d.]+px$`)는 계산된 값을 보도록. 바뀐 px 기대값(★ 입력 높이 등)은 고치고 목록을 PR에 적는다
- [x] B.9 ① 커밋: 검사 4개 통과 + 전후 스크린샷(선택 탭 · 변수 탭 · 연결 · 만들기 · 이름 정리 · 모달)으로 **★과 A.3 규칙(둥글기 · 줄 높이 · 글자 크기 · 간격 · 투명도 맞추기)에 따른 변화 밖**의 차이가 없는지
- [x] B.10 ② 커밋: A.4 + 검사 4개 통과 + 새 모양 스크린샷
- [x] B.11 `ROADMAP.md`에 DS-1 · DS-2 · DS-3 자리, `docs/ia-v4.md` §2.8 · §8에서 이 문서를 가리킴. ①에서 바뀌는 ia-v4 §8의 숫자(사용자 결정이 아닌 것 — 카드 안쪽 10 · 12 → 12 · 12, 만들기 아래 줄 위아래 6 · 8 → 8 · 8로 합계 80 → 82, 입력 높이 ≈31 → 28, 변수 탭 머리 줄 높이 등)를 ia-v4 §8에 적는다
- [x] B.12 쓰는 곳이 없는 규칙을 지운다(HTML 본문 · `ui.ts` · `treeList.ts`에 0곳 — 3회차 검토 확인): `.pipe-mini` · `.bind-steps` · `.bs` · `.bs-dot` · `.vs-tw` · `.bv-tw` · `.bd-all` · `.tier-chip` · `.subtabs`(`.subtab`은 남김) · `.vt-section` · `.vu-props` · `.col-role .sub` · `.icon-btn.spinning` · `.results.stale` · `.vusage` · `.alias-pill` · `.vt-line` · `.vt-lib` · `.tr-note` · `.bind-done` · `.situation`(4회차 검토 확인). 지우기 전에 한 번 더 grep. `scripts/verify-bind-flow.mjs`에 이름만 남은 `.tier-chip`(카드 찾기 제외) · `.tier-chip .badge` · `.bs-dot`(배지 예외)도 함께 정리. §5 · §6의 "지금 코드" 칸은 실제로 쓰는 클래스만 적는다

## 부록 C. DS-2 체크리스트

- [ ] C.1 토큰 더함(§6.8) — `global.error-hover` · `global.white-a25` · `color-state-error-hover` · `color-border-on-primary` · `icon-stroke`(1.5px), 대비 검사 짝 하나 더함, `color-state-error-border`의 `$description`을 "오류 알림 상자 테두리"로
- [ ] C.2 `scripts/gen-icons.mjs` + `src/ui/icons.json` · `src/ui/icons.ts`(24개 · ISC + MIT 고지) · devDependency `lucide-static@1.79.0` · 빌드 결과에 고지 주석
- [ ] C.3 `src/ui/components/` 30종 CSS + TS 함수 · `index.ts`, `src/ui/layouts/layouts.css`(9종)
- [ ] C.4 `build.mjs` — `/* @ds-components */` 자리에 컴포넌트 · 레이아웃 CSS, `<i data-ds-icon>` → SVG(없는 이름이면 실패), `npm run gallery`
- [ ] C.5 토큰 검사(§8) 대상에 `src/ui/**` · `src/gallery/*` 더함, §8-8(데이터 URI 색) 더함, 간격 · 테두리 굵기 검사가 `var()`와 `+`만 든 `calc()`도 허용하게 넓힘(§8-1 "`var()`만 든 `calc()`"와 맞춤)
- [ ] C.6 기본 5종 바꿈(§6.9) — `ds-` 클래스 더함 · 옛 클래스 이름 남김 · `ui.html`에서 옛 모양 규칙 지움 · 글자 기호 → 아이콘
- [ ] C.7 `src/gallery/` + `dist/ds-gallery.html`(커밋 안 함) + `scripts/verify-gallery.mjs` + `package.json` `gallery` 스크립트 + CI 단계
- [ ] C.8 검사 4개 + 모음 화면 검사 통과, `verify-bind-flow`에서 바뀐 기대값(배지 굵기 · px)은 PR에 목록
- [ ] C.9 전후 스크린샷(선택 탭 · 변수 탭 · 연결 · 만들기 · 이름 정리 · 변수 상세 · 설정) + 모음 화면 스크린샷
- [ ] C.10 `ROADMAP.md` DS-2 줄 · `docs/ia-v4.md` · `docs/ia-v3.md` §2.3에서 바뀐 모양(꺼진 버튼 · 체크박스 · 아이콘 단추 · 링크 밑줄)을 가리키는 한 줄

