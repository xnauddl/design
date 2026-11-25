# 플러그인 디자인 시스템 — 명세

> 2026-11-25 작성. 결정 DS-D1–DS-D4(`docs/redesign/brief.md` §7). 리디자인 세션(SC-D30)의 첫 일이다.
> 이 문서가 토큰 · 컴포넌트 · 레이아웃 · 사용 규칙의 **단일 명세**다. 토큰 값의 **단일 원본**은 `design-tokens/tokens.json`이고, 이 문서의 표는 그 원본과 같아야 한다(다르면 원본이 맞고 표를 고친다).
> 기준: 본문 §0–§9에 중대 결함 0(CLAUDE.md 4단계). 부록 A(옮기기 대응표)와 B(체크리스트)는 DS-1 PR에서 닫는다.

## 0. 결정 요약

| 항목 | 결정 |
|---|---|
| 단계 (DS-D1) | **DS-1(지금)** 토큰 원본 한 곳 + `src/ui.html` · `src/ui.ts`의 직접 입력 값을 토큰으로 바꿈 + 직접 입력을 막는 검사. **DS-2** 공통 컴포넌트 30종 · 레이아웃 8종 + 개발용 모음 화면. **DS-3** 토큰 값을 바꿔 새 모양을 입힘(리디자인 — 작업별 탭 · Header · 하단 실행 줄 · 영어 문구, `docs/redesign/brief.md`). |
| 컴포넌트 범위 (DS-D2) | 요청 목록 **30종 전부**(§6). 지금 화면에 없는 5종(Split Button · Radio · Breadcrumb · Table · Toast)도 만들고 모음 화면에서 확인한다. Toast는 SC-D10(상태 줄 없앰)에서 화면에 쓴다. |
| 간격 (DS-D3) | 4px 격자(4 · 8 · 12 · 16 · 20 · 24 · 32 · 40) + 2px(아이콘–글자 사이 · 칩 안쪽만). |
| Figma (DS-D4) | 코드 먼저. Figma 변수 · 라이브러리는 나중. 원본을 JSON(DTCG 형식)으로 두어 나중에 이 플러그인으로 Figma 변수를 만들 수 있게 한다. |
| 테마 | 밝은 테마만. 이름이 역할(Semantic) 기준이라 나중에 다크 테마를 더할 수 있다(이번 범위 밖). |
| 화면 변화 (DS-1) | 색은 거의 같다(비슷한 값 몇 개만 합침 — 부록 A.2). 둥글기 · 간격 · 글자 크기는 단계에 맞추는 만큼 바뀐다(§3 각 절 "맞추는 법"). 화면 배치 · 동작 · 문구는 바뀌지 않는다. |
| 기술 | 프레임워크 없이 지금 구조(순수 TS + 한 장의 HTML) 그대로. 지금 id · 클래스 이름은 바꾸지 않는다(`scripts/verify-bind-flow.mjs`가 그 이름을 본다). |

## 1. 원칙

1. **모든 스타일 값은 토큰에서 온다.** 색 · 글꼴 · 글자 크기 · 굵기 · 줄 높이 · 자간 · 간격 · 둥글기 · 그림자 · 테두리 굵기(1px 제외 — §3.5) · 겹침 순서 · 움직임 시간은 화면 CSS에 직접 쓰지 않는다. 검사가 막는다(§8).
2. **화면 CSS는 Semantic(과 꼭 필요한 Component) 토큰만 쓴다.** Global은 토큰 원본 안에서만 쓴다.
3. **역할로 이름 짓는다.** `--color-text-secondary`는 "보조 글자"이지 "회색 600"이 아니다. 값이 바뀌어도 이름은 그대로다.
4. **한 단계 참조.** Semantic · Component 토큰은 Global 하나를 가리킨다(Semantic이 Semantic을 가리키지 않는다). 그래서 어떤 화면 값이든 "토큰 → Global → 값" 두 걸음으로 찾는다.
5. **필요한 상태만.** 컴포넌트마다 Default · Hover · Active · Focus · Disabled · Loading 중 그 컴포넌트에 뜻이 있는 것만 정의한다(§6 표).
6. **색만으로 상태를 가르지 않는다.** 상태(성공 · 주의 · 오류 · 안내)는 글자 또는 아이콘을 함께 쓴다(`docs/redesign/brief.md` §2).
7. **카드 안에 카드를 넣지 않는다**(CLAUDE.md UI 규칙 · `docs/ia-v4.md` §2.8). 컴포넌트 Card 안의 목록은 List Item(구분선 · 여백 · 옅은 띠)으로 나눈다.
8. **새 값이 필요하면 토큰부터 더한다**(§7.2). 화면 CSS에 임시 값을 쓰지 않는다.

## 2. 토큰 구조

### 2.1 세 층

| 층 | 무엇 | 예 | 어디서 쓰나 |
|---|---|---|---|
| **Global** | 원재료 값(색 · 투명 검정) | `--global-blue-800` = #0a6dbf | 토큰 원본 안에서만 |
| **Semantic** | 역할 | `--color-primary` → `global.blue-800` | 화면 CSS · TS |
| **Component** | 역할로 묶기 어려운 한 컴포넌트 전용 값 | `--chip-value-bg` → `global.gray-800` | 그 컴포넌트 CSS에서만 |

- 색 이외의 토큰(글자 · 간격 · 둥글기 · 크기 · 그림자 · 움직임 · 겹침)은 Global 층 없이 바로 Semantic 층에 둔다(원재료와 역할이 같다).
- 이 구조는 이 플러그인이 사용자 파일에 만드는 Global → Semantic 구조와 같은 방식이다.

### 2.2 원본 파일과 빌드

- **원본:** `design-tokens/tokens.json` — [DTCG 형식](https://tr.designtokens.org/format/)(토큰마다 `$value` · `$type` · `$description`). `$description` = §3 표의 "쓰임"(나중에 Figma 변수 설명으로 옮긴다 — DS-D4).
- **참조:** `$value`에 `{global.blue-800}`처럼 쓴다.
- **빌드:** `build.mjs`가 원본을 읽어 CSS 변수 묶음(`:root { … }`)을 만들고 `src/ui.html`의 자리 표시 `/* @design-tokens */`에 넣어 `dist/ui.html`을 만든다. 참조는 `var(--…)`로 바뀐다(값을 복사하지 않음 — 개발자 도구에서 사슬이 보인다).
- **CSS 이름 규칙:** JSON 경로를 `-`로 잇고 앞에 `--`. 첫 마디가 그룹(`global` · `color` · `font` · `text` · `space` · `radius` · `border-width` · `elevation` · `focus-ring` · `size` · `motion` · `z` · `opacity` · 컴포넌트 이름)이다.
  - `global.blue-800` → `--global-blue-800`
  - `color.text-secondary` → `--color-text-secondary`
  - `chip.value-bg` → `--chip-value-bg`
- 그룹 안의 키는 하이픈으로 이은 한 단어다(`color.text-secondary` — `color.text.secondary`처럼 더 나누지 않는다. DTCG에서 토큰이 그룹을 겸할 수 없어서다). Figma 변수 이름(`/` 나눔)은 DS-D4 때 정한다.

### 2.3 런타임 변수 (토큰이 아님)

`ui.ts`가 화면을 재서 넣는 값은 토큰이 아니다. 아래 이름만 허용한다(검사 예외 — §8).

| 이름 | 넣는 곳 | 뜻 |
|---|---|---|
| `--tabs-h` · `--head-top` · `--toolbar-top` · `--toolbar-h` · `--side-top` | `ui.ts` 고정 줄 높이 재기 | 붙어 다니는(sticky) 줄의 top |
| `--prog` | `ui.ts` 진행 표시 | 진행 비율(%) |
| `--band-ic` | `ui.html` 안내 띠 | 띠 앞 아이콘 그림(data URI) |

## 3. Design Tokens

### 3.1 Color

#### Global (25 + 투명 1)

| 계열 | 토큰 · 값 |
|---|---|
| Neutral | `gray-0` #ffffff · `gray-50` #f4f5f6 · `gray-100` #eceef0 · `gray-150` #e7e8ea · `gray-200` #d4d6da · `gray-400` #9298a1 · `gray-600` #5e636b · `gray-800` #2b2a2a · `gray-900` #1b1b1f · `gray-1000` #000000 |
| Blue | `blue-50` #ecf6ff · `blue-100` #c4e4ff · `blue-500` #0d99ff · `blue-600` #0a86e6 · `blue-700` #0974c9 · `blue-800` #0a6dbf |
| Green | `green-50` #e8f5ec · `green-700` #117b34 |
| Amber | `amber-50` #fbf1df · `amber-700` #9a6300 |
| Orange | `orange-50` #fff1e6 · `orange-700` #c2410c |
| Red | `red-50` #fdecec · `red-100` #f4c9cc · `red-600` #c8252f |
| 투명 | `black-a15` rgba(0,0,0,.15) · `black-a30` rgba(0,0,0,.3) |

#### Semantic (33)

| 묶음 | 토큰 | ← Global | 쓰임 |
|---|---|---|---|
| Primary | `color-primary` | blue-800 | 주 실행 버튼 바탕 — 화면에 하나 |
| | `color-primary-hover` | blue-700 | 주 실행 버튼 hover · 누름 바탕 |
| | `color-primary-subtle` | blue-50 | 고른 항목 · 강조 영역의 옅은 바탕 |
| | `color-text-on-primary` | gray-0 | 주 실행 버튼 위 글자 · 아이콘 |
| Secondary | `color-secondary-bg` | gray-0 | 보조 버튼 바탕 |
| | `color-secondary-border` | gray-200 | 보조 버튼 테두리 |
| Background | `color-background-primary` | gray-0 | 플러그인 창 전체 바탕 |
| Surface | `color-surface-primary` | gray-0 | 카드 · 모달 · 메뉴처럼 바탕 위에 놓인 면 |
| | `color-surface-secondary` | gray-50 | 입력 칸 바탕 · 옅은 채움 · 트랙 |
| | `color-surface-selected` | gray-100 | 목록에서 고른 줄의 바탕 |
| | `color-surface-inverse` | gray-900 | 툴팁 · 짙은 배지처럼 어두운 면 |
| Border | `color-border-default` | gray-150 | 구분선 · 카드 · 입력 칸 기본 테두리 |
| | `color-border-strong` | gray-200 | hover한 입력 칸 · 강조 구분선 |
| Text | `color-text-primary` | gray-900 | 본문 · 제목 · 버튼 글자 |
| | `color-text-secondary` | gray-600 | 보조 설명 · 목록 둘째 줄 · 라벨 |
| | `color-text-tertiary` | gray-400 | 흐린 글자 · 자리 표시 글 · 잠긴 항목 (⚠ §9) |
| | `color-text-link` | blue-800 | 글자 링크 · 링크 버튼 |
| | `color-text-inverse` | gray-0 | 어두운 면(inverse · 오류 버튼) 위 글자 |
| Success | `color-state-success` | green-700 | 완료 · 성공 글자와 아이콘 |
| | `color-state-success-subtle` | green-50 | 성공 알림 바탕 |
| Warning | `color-state-warning` | amber-700 | 주의 글자와 아이콘 |
| | `color-state-warning-subtle` | amber-50 | 주의 알림 바탕 |
| Error | `color-state-error` | red-600 | 오류 글자 · 삭제 버튼 |
| | `color-state-error-subtle` | red-50 | 오류 알림 바탕 |
| | `color-state-error-border` | red-100 | 오류 알림 · 오류 입력 칸 테두리 |
| Information | `color-state-info` | blue-800 | 안내 글자와 아이콘 |
| | `color-state-info-subtle` | blue-50 | 안내 알림 바탕 |
| | `color-state-info-border` | blue-100 | 안내 알림 테두리 |
| Interactive | `color-interactive-hover` | gray-100 | 누를 수 있는 것을 hover · 누를 때 바탕 |
| | `color-interactive-focus` | blue-500 | 키보드 포커스 링 · 체크된 체크박스 |
| | `color-interactive-focus-hover` | blue-600 | 포커스 색 위 hover(링크 hover 포함) |
| | `color-interactive-focus-subtle` | blue-50 | 입력 칸 포커스의 옅은 띠 |
| Overlay | `color-overlay` | black-a30 | 모달 뒤를 가리는 막 |

#### Component (8)

| 토큰 | ← Global | 쓰임 |
|---|---|---|
| `chip-value-bg` | gray-800 | 변수 칩 값 칸 바탕(짙음) |
| `chip-value-text` | gray-200 | 변수 칩 값 칸 글자 |
| `chip-alias-text` | gray-1000 | 변수 칩 별칭 칸 글자 |
| `swatch-border` | gray-1000 | 목록 줄 색 동그라미 테두리(V-D5) |
| `swatch-outline` | black-a15 | 사용자 색 견본의 옅은 테두리 |
| `checker-color` | gray-200 | 투명 무늬(체커) 칸 |
| `tag-beta-text` | orange-700 | [베타] 배지 글자 |
| `tag-beta-bg` | orange-50 | [베타] 배지 바탕 |

- 상태 hover 바탕은 지금 두 가지다(버튼 = `color-surface-secondary`, 탭 · 목록 = `color-interactive-hover`) — DS-1은 그대로 옮기고 DS-2에서 하나로(§9).
- 사용자 데이터 색(변수 값 · 견본 · 팔레트)은 토큰이 아니다. `ui.ts`가 `style.background = hex`로 넣는 값은 검사 예외(§8).

### 3.2 Typography

**원재료**

| 토큰 | 값 |
|---|---|
| `font-family-sans` | "Inter", -apple-system, "Segoe UI", "Apple SD Gothic Neo", sans-serif |
| `font-family-mono` | ui-monospace, "SF Mono", Menlo, monospace |
| `font-size-xs` · `-sm` · `-md` · `-lg` · `-xl` | 10 · 11 · 12 · 13 · 16px |
| `font-weight-regular` · `-medium` · `-semibold` · `-bold` | 400 · 500 · 600 · 700 |
| `line-height-none` · `-xs` · `-sm` · `-md` · `-lg` · `-xl` | 1 · 14px · 16px · 18px · 20px · 24px |
| `letter-spacing-tight` · `-normal` | -0.1px · 0 |

**글자 묶음(`font` 한 줄로 쓰는 토큰)**

| 계층 | 토큰 | 굵기 / 크기 / 줄 높이 | 쓰임 |
|---|---|---|---|
| Display | `text-display` | 600 / 16 / 24 | 빈 화면 · 완료 화면의 큰 제목(창에 하나) |
| Heading | `text-heading` | 600 / 13 / 20 | 하위 화면 제목 · 모달 제목 |
| | `text-heading-sm` | 600 / 12 / 16 | 카드 제목 · 묶음 머리 |
| Body | `text-body` | 400 / 12 / 18 | 본문 문장(기본 — `body`) |
| | `text-body-sm` | 400 / 11 / 16 | 보조 설명 · 목록 둘째 줄 · 툴팁 |
| Label | `text-label` | 600 / 12 / 16 | 버튼 · 탭 · 입력 라벨 |
| | `text-label-sm` | 600 / 11 / 14 | 작은 버튼 · 표 머리 |
| Caption | `text-caption` | 700 / 10 / 14 | 배지 · 개수 · 작은 표시 |
| (코드) | `text-mono` | 400 / 11 / 16 mono | 값 · 이름 · 코드 |

- 자간: 제목(`text-display` · `text-heading`)은 `letter-spacing-tight`, 나머지 0.
- 한 묶음을 쓰고 한 속성만 바꿀 때는 원재료 토큰으로 덮는다(예: 버튼은 `font: var(--text-label); line-height: var(--line-height-none)`).
- **맞추는 법(DS-1):** 11.5px → 11, 12.5px → 12, 18px → 16(소수 자리는 내림 — 좁은 창의 밀도 유지). 줄 높이 없는 비율(1.3 · 1.35 · 1.4)은 그 글자 크기에서 가장 가까운 px 토큰(11px 글자 → 16, 12px 글자 → 16)으로, 1.45 · 1.5는 12px 글자 → 18, 11px 글자 → 16으로. `line-height: 1`은 `line-height-none`.

### 3.3 Spacing

| 토큰 | 값 | 쓰임 |
|---|---|---|
| `space-0-5` | 2px | 아이콘–글자 사이 · 칩 · 배지 안쪽 **만** |
| `space-1` | 4px | 붙은 요소 사이 · 작은 컨트롤 안쪽 |
| `space-2` | 8px | 한 줄 안 요소 사이(기본 gap) · 컨트롤 안쪽 |
| `space-3` | 12px | 카드 안쪽 · 창 양옆 여백 |
| `space-4` | 16px | 묶음 사이 · 모달 안쪽 |
| `space-5` | 20px | 큰 묶음 사이 |
| `space-6` | 24px | 절 사이 |
| `space-8` | 32px | 빈 상태 위아래 |
| `space-10` | 40px | 빈 상태 · 모달 바깥 위 여백 |

- `padding` · `margin` · `gap`(`row-gap` · `column-gap` 포함)은 이 토큰 또는 `0` · `auto`만 쓴다. 음수가 필요하면 `calc(-1 * var(--space-1))`.
- **맞추는 법(DS-1):** 가장 가까운 값. 1px → 0 또는 2(테두리와 겹치는 자리면 0), 3 → 4, 5 → 4, 7 → 8, 9 → 8, 21 → 20, 36 → 40, 48 → 40. 가운데 값(6 · 10 · 14 · 18)은 **줄 안**(gap · 컨트롤 안쪽)이면 아래로(6 → 4, 10 → 8, 14 → 12, 18 → 16), **묶음 사이 · 상자 안쪽 여백**(카드 · 모달 · 띠의 padding, 블록 사이 margin)이면 위로(6 → 8, 10 → 12, 14 → 16, 18 → 20).

### 3.4 Radius

| 토큰 | 값 | 쓰는 컴포넌트 |
|---|---|---|
| `radius-none` | 0 | 구분선 줄 · Table · List Item |
| `radius-small` | 4px | 작은 버튼(sm) · Badge · 색 견본 · Checkbox · Tooltip · 코드 조각 |
| `radius-medium` | 6px | Button · Icon Button · Input · Textarea · Select · Search Field · Tab · Navigation Item · Alert |
| `radius-large` | 8px | Card · Modal · Confirm Dialog · Toast · 메뉴 |
| `radius-full` | 9999px | Tag(칩) · Toggle · Radio · 동그라미 견본 · 진행 막대 · 알약 |

- **맞추는 법(DS-1):** `--r-sm`(5) · `--r`(7) → medium, `--r-lg`(10) → large. 직접 쓴 2 · 3 · 4px → small, 5 · 6px → medium, 8 · 10px → large, 13 · 999px · 50% → full.

### 3.5 Border · Shadow · Focus

| 토큰 | 값 | 쓰임 |
|---|---|---|
| `border-width-medium` | 1.5px | 고른 견본 · 강조 테두리(그림자로 그림) |
| `border-width-thick` | 2px | 포커스 링 · 선택 표시 |
| `focus-ring` | `0 0 0 2px {color-background-primary}, 0 0 0 4px {color-interactive-focus}` | 버튼 · 탭 · 체크 등 누르는 것의 키보드 포커스(`:focus-visible`) |
| `focus-ring-field` | `0 0 0 3px {color-interactive-focus-subtle}` + 테두리 `color-interactive-focus` | Input · Textarea · Select · Search Field 포커스 |
| `elevation-0` | none | 바탕에 붙은 것 |
| `elevation-1` | `0 1px 1.5px rgba(20,22,28,.05)` | 카드 · 주 버튼 · 고른 탭(지금 모양 — DS-3에서 카드는 0으로) |
| `elevation-2` | `0 1px 2px rgba(20,22,28,.06), 0 2px 6px rgba(20,22,28,.05)` | 메뉴 · 툴팁 · 고르개 · Toast |
| `elevation-3` | `0 8px 24px rgba(20,22,28,.16)` | Modal · Confirm Dialog (DS-2부터) |
| `toggle-knob-shadow` | `0 1px 1px rgba(0,0,0,.2)` | Toggle 손잡이(Component) |

- 1px 테두리(`border: 1px solid var(--color-border-default)`)는 직접 써도 된다(머리카락 선 — 토큰으로 감싸면 읽기만 어려워진다). 1.5px · 2px는 토큰을 쓴다.
- 그림자 · 외곽선(`box-shadow` · `outline`)은 `none` · `0` · `inset` · 토큰만 쓴다(예: `inset 0 0 0 var(--border-width-medium) var(--color-interactive-focus)`).
- 그림자는 계층 구분이 필요한 곳(떠 있는 메뉴 · 툴팁 · 모달)에만. 카드의 `elevation-1`은 DS-1에서 지금 모양을 지키려고 남기고 DS-3에서 없앤다(brief §2 "테두리 · 그림자는 줄인다").
- 맞추는 법(DS-1): 사용자 색 견본 테두리 rgba(0,0,0, .1 · .12 · .15 · .18 · .2) → `swatch-outline`(.15). 고르개 그림자 `0 2px 8px rgba(0,0,0,.08)` → `elevation-2`. 모달 막 rgba(0,0,0,.28) → `color-overlay`(.3).

### 3.6 Size

| 토큰 | 값 | 쓰임 |
|---|---|---|
| `size-control-sm` · `-md` · `-lg` | 24 · 28 · 32px | Button · Icon Button · Input · Select · Search Field · Tab 높이 |
| `size-icon-sm` · `-md` · `-lg` | 12 · 16 · 20px | 아이콘 |
| `size-checkbox` | 14px | Checkbox · Radio |
| `size-toggle-w` × `size-toggle-h` | 28 × 16px | Toggle 트랙 |
| `size-avatar-sm` · `-md` | 16 · 24px | 사람 · 파일 표시(쓰는 곳 없음 — 요청 크기 목록, DS-2 모음 화면에서만) |
| `size-modal-sm` · `-md` | 320 · 400px | Modal 너비(창이 좁으면 `100% - 2 × space-4`까지 줄어듦) |
| `size-header` | 40px | Plugin Header · Page Header(하위 화면 머리) |
| `size-nav` | 36px | Navigation(탭 줄) |
| `size-action-bar` | 52px | Bottom Action Bar |
| `size-hit-min` | 24px | 누르는 곳 최소(ia-v3 §2.10) |

- DS-1은 버튼 · 입력의 높이 24 · 28 · 32px와 Checkbox 13px(→ 14)를 이 토큰으로 바꾼다. 그 밖의 너비 · 높이(열 폭 88 · 견본 14 등 화면 고유 값)는 검사하지 않는다 — 컴포넌트로 옮기는 DS-2에서 정한다.

### 3.7 Motion · 겹침 · 투명도

| 토큰 | 값 | 쓰임 |
|---|---|---|
| `motion-duration-fast` | 120ms | hover · 펼침 · 손잡이 이동 (지금 .1s · .12s를 하나로) |
| `z-raised` | 1 | 카드 머리 붙음 |
| `z-sticky` | 2 | 선택 줄 · 아래 실행 줄 붙음 |
| `z-sticky-top` | 3 | 탭 줄 |
| `z-fixed` | 20 | 창 바닥 상태 줄 · 고르개 펼침 |
| `z-popover` | 30 | 고정 툴팁(`#uiTip`) |
| `z-modal` | 40 | 모달 막 |
| `z-menu` | 50 | ⋯ 메뉴(`.ctx-menu`) |
| `z-tooltip` | 60 | 표 툴팁(`.vt-tip`) |
| `opacity-disabled` | .42 | `:disabled` 버튼 · 꺼진 스위치(지금 .42 · .45를 하나로) |

## 4. 테마 (예약)

다크 테마 · 고대비는 이번 범위 밖이다. 더할 때는 Semantic 토큰마다 테마별 Global을 가리키게 하고(`$extensions`), 화면 CSS는 바꾸지 않는다.

## 5. 공통 Layout System (DS-2)

> 자리는 DS-3 리디자인 명세에서 확정한다(작업별 탭 SC-D26 · Header SC-D27 · 하단 실행 줄 SC-D28). DS-2는 아래 틀을 컴포넌트로 만들어 두고, 지금 화면은 DS-3에서 옮겨 탄다.

창 560 × 510(ia-v4 §8). 틀(Header 40 + 탭 36 + 실행 줄 52 = 128px)이 세로의 약 25%. 하위 화면은 Page Header 40이 더해져 콘텐츠 약 342px.

| 레이아웃 | 짜임 | 토큰 | 지금 코드 |
|---|---|---|---|
| **PluginLayout** | 위에서 아래로 Header · Navigation · (Page Header) · 스크롤 콘텐츠 · Bottom Action Bar. 콘텐츠만 스크롤, 나머지는 고정 | `color-background-primary` · 양옆 `space-3` | `body` · `.tab-section` |
| **Plugin Header** | 왼쪽 로고 · 이름, 가운데 선택 대상(말줄임), 오른쪽 ⚙ · 도움말 Icon Button. 아래 1px 선 | `size-header` · `text-heading-sm` | 없음(SC-D27) |
| **Navigation** | 작업별 Tab(밑줄형) 한 줄, 고른 탭 아래 `border-width-thick` 막대 | `size-nav` · `text-label` | `.tabs` (세그먼트형) |
| **Page Header** | ← Icon Button · 제목 · 오른쪽 보조 정보(말줄임) | `size-header` · `text-heading` | `.sub-head` |
| **Content Section** | 제목(`text-heading-sm`) · 짧은 설명(`text-body-sm`) · 본문. 절 사이 `space-6` | `space-2` · `space-6` | `.step` |
| **Settings Section** | 라벨–컨트롤 줄 목록(라벨 왼쪽, 컨트롤 오른쪽), 줄 높이 `size-control-md` + `space-2` | `text-label` | ⚙ 설정 화면 |
| **Result Section** | 요약 한 줄 + List Item 목록(구분선) + 빈 · 오류 상태 자리 | `text-body` | `.results` · 트리 |
| **Bottom Action Bar** | 위 1px 선. 왼쪽 Ghost(취소 · 뒤로), 오른쪽 끝 Primary 하나(+ 그 왼쪽 Secondary). 콘텐츠 아래에 같은 높이의 여백을 둬 가리지 않음 | `size-action-bar` · 버튼 `size-control-md` · 사이 `space-2` | `.sub-foot` · `.make-foot` · `.sel-tools` |
| **Modal Layout** | 제목(`text-heading`) · 본문 · 아래 오른쪽 [취소(Ghost)] [확인(Primary 또는 Destructive)] | `size-modal-*` · `radius-large` · `elevation-3` · 안쪽 `space-4` | `.modal` |

**버튼 자리 규칙:** 주 실행은 실행 줄 오른쪽 끝, 화면에 Primary 하나. 취소 · 뒤로는 왼쪽 Ghost. 여러 단계의 이전 · 다음은 늘 같은 자리. 같은 목적의 버튼은 모든 화면에서 자리 · 크기가 같다(brief §4).

## 6. 공통 UI Component (DS-2)

상태 열: D Default · H Hover · A Active(누름 · 켬) · F Focus · X Disabled · L Loading. **—** = 그 컴포넌트에 뜻이 없어 정의하지 않음.
"지금 코드" = DS-2에서 바꿔 끼울 지금 클래스(DS-1은 이름을 바꾸지 않고 토큰만 바꾼다). "없음" = 새로 만듦(모음 화면에서 확인).

### 6.1 Action

| 컴포넌트 | Variant | Size | 상태 | 핵심 토큰 | 지금 코드 |
|---|---|---|---|---|---|
| Button | Primary · Secondary · Ghost · Destructive · Link | sm 24 · md 28 · lg 32 | D H A F X L | `color-primary(-hover)` · `color-secondary-*` · `color-state-error` · `text-label` · `radius-medium` · `focus-ring` | `button` · `.primary` · `.danger` · `.link` · `.link-btn` · `.bd-all` · `.bd-skip` |
| Icon Button | Ghost · Secondary | sm 24 · md 28 | D H A F X L | `color-interactive-hover` · `size-icon-md` · 툴팁 필수 | `.icon-btn` · `.tab-min` · `.sub-back` · `.bv-tw` · `.ed-dd` |
| Button Group | 붙임(테두리 공유) · 띄움(`space-2`) | 버튼 크기를 따름 | (버튼 상태) | `space-2` | `.acts` · `.row` 안 버튼 |
| Split Button | Primary · Secondary | md | D H A F X L | 버튼과 같음 + 나눔 선 `color-border-strong` | 없음 |

- Loading: 글자 자리를 지키고 앞에 작은 원 아이콘, 누를 수 없음(`aria-busy`). Disabled: `opacity-disabled` · 커서 기본. 잠김(`aria-disabled`): 흐린 글자 `color-text-tertiary` · 포커스는 받음(ia-v3 §2.3).

### 6.2 Form

| 컴포넌트 | Variant | Size | 상태 | 핵심 토큰 | 지금 코드 |
|---|---|---|---|---|---|
| Input | 기본 · Error | sm 24 · md 28 | D H — F X — | `color-surface-secondary` · `color-border-default/strong` · `focus-ring-field` · `color-state-error(-border)` | `input[type=text/number]` · `.ed-field` |
| Textarea | 기본 · mono | 높이 자유(최소 3줄) | D H — F X — | Input과 같음 · `text-mono` | `textarea` |
| Select | 기본 | sm · md | D H — F X — | Input과 같음 | `select` · `.mode-select` |
| Checkbox | 체크 · 일부 · 해제 | `size-checkbox` | D H A F X — | `color-interactive-focus` · `radius-small` | `input[type=checkbox]` |
| Radio | 고름 · 안 고름 | `size-checkbox` | D H A F X — | `color-interactive-focus` · `radius-full` | 없음 |
| Toggle | 켬 · 끔 · 일부(mixed) | `size-toggle-*` | D H A F X — | `color-primary` · `color-border-strong` · `toggle-knob-shadow` | `button.bv-switch` · `.bv-track` |
| Search Field | 기본 · 값 있음(지우기 버튼) | sm · md | D H — F X — | Input과 같음 + 돋보기 `size-icon-sm` | `.search-box` · `.ed-psearch` |

### 6.3 Navigation

| 컴포넌트 | Variant | Size | 상태 | 핵심 토큰 | 지금 코드 |
|---|---|---|---|---|---|
| Tab | 밑줄형(작업별 탭) · 세그먼트형(화면 안 나눔) | md | D H A F X — | `text-label` · `color-text-secondary → primary` · `border-width-thick` · `color-surface-primary`(세그먼트 고름) | `.tabs .tab-btn` · `.subtabs .subtab` · `.mk-tabs` |
| Navigation Item | 1단 · 2단 · 위험 | 줄 `size-control-md` | D H A F — — | `color-surface-selected` · `color-interactive-hover` | `.vs-item` |
| Breadcrumb | 기본(마지막은 글자, 앞은 링크) | — | D H — F — — | `color-text-link` · 구분 기호 `color-text-tertiary` | 없음 |
| Step Indicator | 가로 점 · 번호 | — | 지남 · 지금 · 남음 (+F) | `color-primary` · `color-primary-subtle` · `color-border-strong` | `.bind-steps .bs` · `.steps` |

### 6.4 Data Display

| 컴포넌트 | Variant | Size | 상태 | 핵심 토큰 | 지금 코드 |
|---|---|---|---|---|---|
| Badge | 숫자 · 상태(성공 · 주의 · 오류 · 안내) · 베타 · 짙음 | 높이 14 | D | `text-caption` · `radius-small` · 상태색 `-subtle` 바탕 + 글자 | `.mini-badge` · `.vs-badge` · `.bv-new` · `.tier-chip` |
| Tag | 변수 칩(옅은 칸 + 짙은 칸) · 일반 · 주의 | sm | D H — F X — | `chip-*` · `radius-full` · `space-0-5` | `.vchip` · `.chip` · `.tr-tag` · `.lib-tag` · `.step-chip` |
| Tooltip | 짙음 | 최대 너비 240 | (보임 · 숨김) | `color-surface-inverse` · `color-text-inverse` · `text-body-sm` · `radius-small` · `elevation-2` | `#uiTip` · `.vt-tip` |
| Card | 기본 · 접힘 · 상태(성공 · 오류 바탕) | — | D (접기 머리 H F) | `color-surface-primary` · `color-border-default` · `radius-large` · `space-3` · `elevation-1` | `.step` · `.sel-card` · `.bind-card` |
| List Item | 한 줄 · 두 줄 · 머리 줄 | 줄 32 | D H A F X — | 구분선 `color-border-default` 또는 없음(§2.8) · `color-interactive-hover` | `.tr` · `.vt-row` · `.mk-row` · `.skip-row` |
| Table | 기본 · 줄 고름 | 줄 32 · 머리 28 | D H A — — — | `text-label-sm` 머리 · 줄 구분선 · `radius-none` | 없음 |
| Progress Indicator | 막대 · 원(돌기) · 단계 수 | 막대 높이 4 | 진행 · 끝남 · 오류 | `color-primary` · `color-surface-secondary` 트랙 · `radius-full` · `motion-duration-fast` | `#applyProgress .bar` · `.unused-prog` · `.make-prog` · `.mini-mark.busy` |

- Card 안에는 Card를 넣지 않는다 — 안쪽 묶음은 List Item · 옅은 띠(`color-surface-secondary`, 테두리 · 둥글기 없음)로(§1-7). 지금 `.results` 안 `.r-card`는 이 규칙을 어긴 남은 곳이다(DS-2에서 List Item으로).

### 6.5 Feedback

| 컴포넌트 | Variant | Size | 상태 | 핵심 토큰 | 지금 코드 |
|---|---|---|---|---|---|
| Alert | Info · Success · Warning · Error (글자 + 아이콘 필수) | 띠(카드 안) · 상자(카드 밖) | D (닫기 버튼 H F) | 상태색 · `-subtle` · `-border` · `text-body-sm` · `radius-medium`(상자) / `radius-none`(띠) | `.banner` · `.banner.caution` · `.ux` · `.ed-alert` · `.dark-notice` · `.tidy` |
| Toast | Info · Success · Error | 창 아래 가운데, 최대 너비 = 창 − 2 × `space-3` | 나타남 · 사라짐(4초) | `color-surface-inverse` · `color-text-inverse` · `radius-large` · `elevation-2` · `z-tooltip` | 없음(SC-D10 — `.status-line`을 대신함) |
| Modal | 기본 | `size-modal-sm` · `-md` | 열림 (닫기 F) | Modal Layout(§5) · `color-overlay` · `z-modal` | `.modal-backdrop` · `.modal` |
| Confirm Dialog | 일반 · 위험(Destructive 확인 버튼) | `size-modal-sm` | 열림 | Modal과 같음 · `color-state-error` | `.ed-confirm` |
| Empty State | 처음 · 결과 없음 | 가운데, 위아래 `space-10` | D | `text-display`(제목) · `text-body-sm` · 아이콘 `size-icon-lg` | `.sel-empty` · `.var-empty` · `.vt-empty` · `.bind-empty` · `.unused-none` |
| Loading State | 줄 뼈대 · 돌기 | 목록 / 화면 | L | `color-surface-secondary` 뼈대 · `motion-duration-fast` | `.var-loading` · `.tr-skel` · `.icon-btn.spinning` |
| Error State | 화면 · 칸 | — | D (다시 시도 버튼) | `color-state-error` · 아이콘 · 다시 시도 Secondary | `.ed-alert.err` · `.ed-ferr` |
| Success State | 화면 · 줄 | — | D | `color-state-success` · 아이콘 | `.bind-empty.done` · `.status-line.ok` |

### 6.6 만드는 방법 (DS-2)

- 파일: `src/ui/components/{이름}.ts`(DOM을 만드는 작은 함수 — 예: `button({ variant, size, label, icon, loading })`) + 같은 이름의 CSS 묶음(`ds-` 접두 클래스, 예: `.ds-btn.ds-btn--primary.ds-btn--md`). 레이아웃은 `src/ui/layouts/`.
- 빌드가 컴포넌트 CSS를 `ui.html`에 함께 넣는다. 지금 클래스와 함께 붙여(`class="primary ds-btn ds-btn--primary"`) 화면별로 옮기고, 옮긴 뒤 옛 클래스 규칙을 지운다.
- 모음 화면: `dist/ds-gallery.html`(개발용, 플러그인에 안 들어감) — 30종 × 상태별, 토큰 표와 변수 상세(대략 시안의 상세 패널).

## 7. 사용 규칙

### 7.1 쓰는 사람

1. 색이 필요하면 §3.1 Semantic 표의 **쓰임**에서 고른다. 맞는 것이 없으면 7.2.
2. 글자는 묶음 토큰(`font: var(--text-body)`)을 먼저 쓴다. 크기만 다르면 원재료 토큰으로 덮는다.
3. 간격은 `space-*`만. 줄 안은 `space-2`가 기본, 묶음 사이는 `space-4` 이상.
4. 높이가 있는 컨트롤은 `size-control-*`. 버튼과 입력은 같은 줄에서 같은 크기를 쓴다.
5. 둥글기는 §3.4의 컴포넌트별 값. 같은 종류는 같은 둥글기.
6. 그림자는 떠 있는 것에만(§3.5).
7. 상태는 색 + 글자 또는 아이콘.
8. 카드 안 카드 금지(§1-7).

### 7.2 토큰을 더하거나 바꿀 때

1. 이 문서의 표에 먼저 더한다(쓰임 한 줄 필수).
2. `design-tokens/tokens.json`에 같은 이름 · 값 · `$description`으로 더한다.
3. 검사(§8)를 돌린다. Semantic은 Global을 가리켜야 하고, 대비 검사(§8-6)를 통과해야 한다.
4. 같은 역할의 토큰이 이미 있으면 더하지 않는다(비슷한 값은 합친다).
5. 지울 때는 쓰는 곳이 0인지 검사가 확인한다(§8-3).

## 8. 검증 (자동 검사)

`test/design-tokens.test.mjs` — `npm test`에 들어가 CI에서 돈다. 검사 대상은 `src/ui.html`의 `<style>`(주석 뺌) · 같은 파일 본문의 `style="…"` · `src/ui.ts`.

1. **직접 값 금지(`ui.html` CSS · `style=`):** 아래 속성에 토큰(`var(--…)`) 대신 직접 값이 있으면 실패.
   - 색이 들어가는 모든 속성: 16진 색 · `rgb()` · `rgba()` · `hsl()` · 이름 색(`white` · `black` 등 — `transparent` · `currentColor` · `inherit`는 허용).
   - `font` · `font-family` · `font-size` · `font-weight` · `letter-spacing`: `var()` · `inherit`만.
   - `line-height`: `var()` · `inherit`만.
   - `padding*` · `margin*` · `gap` · `row-gap` · `column-gap`: `var()` · `0` · `auto` · `calc()` 안의 `var()`만.
   - `border-radius`: `var()` · `0`만.
   - `box-shadow` · `outline`: `none` · `0` · `inset` · `var()`만(`outline: none`, `outline-offset`은 허용).
   - `z-index`: `var()`만. `transition` · `animation`의 시간: `var()`만.
2. **`ui.ts`:** `style.*` · `setProperty`에 넣는 문자열 안의 색 · 크기 직접 값 금지. 사용자 데이터 색(`style.background = hex | value`)과 너비 % · 위치 px(툴팁 · 막대)는 예외.
3. **이름 확인:** 쓰인 `var(--x)`는 모두 토큰 원본에 있거나 런타임 변수(§2.3)여야 한다. 원본의 Semantic · Component 토큰 중 쓰는 곳이 0인 것은 경고(DS-2 컴포넌트용으로 미리 둔 것 — §6 — 은 목록으로 예외).
4. **층 규칙:** 화면 CSS · TS에 `var(--global-*)`가 있으면 실패. 원본에서 Semantic · Component 색은 Global 하나를 가리켜야 하고, 참조가 끊기거나 돌면 실패.
5. **원본 형식:** 모든 토큰에 `$value` · `$type` · `$description`(Global 제외).
6. **대비:** 글자 토큰과 그 바탕(`color-text-primary/secondary/link` · 상태 글자 ↔ `color-background-primary`, `color-text-on-primary` ↔ `color-primary`, `color-text-inverse` ↔ `color-surface-inverse`, `chip-value-text` ↔ `chip-value-bg`, `tag-beta-text` ↔ `tag-beta-bg`)이 4.5:1 이상. 알려진 예외는 §9의 목록만(그 목록에 없는 미달은 실패).

## 9. 열린 결함 (DS-1은 값을 지키고 뒤에서 고침)

| 번호 | 결함 | 언제 |
|---|---|---|
| DS-O1 | `color-text-tertiary`(gray-400 #9298a1) 흰 바탕 대비 약 2.9:1 — 본문 기준 4.5:1 미달. 자리 표시 글 · 잠긴 글자에 쓴다. 대비 검사(§8-6) 예외 목록에 둔다 | DS-3 |
| DS-O2 | `color-primary-hover`(blue-700 #0974c9)가 기본(blue-800 #0a6dbf)보다 밝다 — hover에서 버튼이 옅어짐 | DS-3 |
| DS-O3 | hover 바탕이 두 가지(버튼 `color-surface-secondary` · 탭과 목록 `color-interactive-hover`) | DS-2 |
| DS-O4 | 포커스 모양이 두 가지(`focus-ring` · `focus-ring-field`)이고, 스위치 · 일부 줄은 `outline`으로 따로 그린다 | DS-2 |
| DS-O5 | 카드에 그림자(`elevation-1`) — brief §2는 줄이라고 함 | DS-3 |
| DS-O6 | `.results` 안 `.r-card` — 카드 안 카드 | DS-2 |

---

## 부록 A. DS-1 옮기기 대응표 (DS-1 병합 뒤 지움)

### A.1 옛 CSS 변수 → 새 토큰

| 옛 이름 | 새 토큰 | 비고 |
|---|---|---|
| `--bg` | `--color-background-primary` | `var(--bg, #fff)`의 대체값은 뺀다 |
| `--surface` | `--color-surface-primary` | |
| `--surface-2` | `--color-surface-secondary` | 버튼 hover 포함(DS-O3) |
| `--surface-hover` | `--color-interactive-hover` | |
| `--text` | `--color-text-primary` | |
| `--text-2` | `--color-text-secondary` | |
| `--muted` | `--color-text-tertiary` | |
| `--border` | `--color-border-default` | |
| `--border-2` | `button` 기본 규칙 = `--color-secondary-border`, 그 밖 = `--color-border-strong` | |
| `--accent` | `--color-interactive-focus` | |
| `--accent-hover` | `--color-interactive-focus-hover` | 링크 hover |
| `--accent-press` | `--color-primary-hover` | |
| `--accent-strong` | 바탕 · 테두리 = `--color-primary`, 링크 글자(`.link` · `.link-btn`) = `--color-text-link`, 그 밖 글자 = `--color-state-info` | |
| `--accent-subtle` | `box-shadow`(포커스 띠) = `--color-interactive-focus-subtle`, 안내 띠(`.banner` · `.ux` · 콜아웃) = `--color-state-info-subtle`, 그 밖 = `--color-primary-subtle` | |
| `--accent-border` | `--color-state-info-border` | |
| `--on-accent` | `--color-text-on-primary` | |
| `--ok` · `--ok-subtle` | `--color-state-success` · `-subtle` | `var(--ok, #12805c)` 대체값 뺌 |
| `--warn` · `--warn-subtle` | `--color-state-warning` · `-subtle` | `var(--warn-subtle, #fff4e5)` 대체값 뺌 |
| `--danger` · `--danger-subtle` · `--danger-border` | `--color-state-error` · `-subtle` · `-border` | `var(--danger, #d0342c)` 대체값 뺌 |
| `--beta` · `--beta-subtle` | `--tag-beta-text` · `--tag-beta-bg` | |
| `--vchip-dark` · `--vchip-dark-fg` · `--vchip-fg` | `--chip-value-bg` · `--chip-value-text` · `--chip-alias-text` | |
| `--swatch-line` | `--swatch-border` | |
| `--side-sel` | `--color-surface-selected` | |
| `--r-sm` · `--r` · `--r-lg` | `--radius-medium` · `--radius-medium` · `--radius-large` | 5 → 6, 7 → 6, 10 → 8 |
| `--shadow-sm` · `--shadow` | `--elevation-1` · `--elevation-2` | |
| `--fs` | `--font-size-md` | |
| `--font` · `--mono` | `--font-family-sans` · `--font-family-mono` | |

`ui.ts`의 `var(--ok)` · `var(--warn)` · `var(--text)` · `var(--text-2)`도 같은 표로 바꾼다.

### A.2 직접 쓴 색 → 토큰 (값이 바뀌는 것은 ★)

| 지금 | 자리 | 새 토큰 |
|---|---|---|
| #fff | 어두운 면 · 오류 버튼 · 배지 · 새 표시 위 글자 | `--color-text-inverse` (주 버튼 바탕 위면 `--color-text-on-primary`) |
| #fff | 스위치 손잡이 · 체커 바탕 | `--color-surface-primary` |
| #1b1b1f · #222★ | 툴팁 바탕(`#uiTip` · `.vt-tip`) | `--color-surface-inverse` |
| #000★ | 고른 사이드 항목 글자 · 개수 | `--color-text-primary` |
| #000★ | 고른 사이드 항목 배지 바탕 | `--color-surface-inverse` |
| #d0d5dd★ | 투명 체커 무늬 | `--checker-color` (gray-200) |
| #ededed★ | `--side-sel` | `--color-surface-selected` (gray-100) |
| #d8d8d8★ | `--vchip-dark-fg` | `--chip-value-text` (gray-200) |
| rgba(0,0,0, .1 · .12★ · .15 · .18★ · .2★) | 사용자 색 견본 테두리 | `--swatch-outline` (.15) |
| rgba(0,0,0,.2) | 스위치 손잡이 그림자 | `--toggle-knob-shadow` |
| rgba(0,0,0,.08)★ | 고르개 그림자 | `--elevation-2` |
| rgba(0,0,0,.28)★ | 모달 막 | `--color-overlay` (.3) |

## 부록 B. DS-1 체크리스트

- [ ] B.1 `design-tokens/tokens.json` — §3의 모든 토큰(DTCG, `$description` = 쓰임)
- [ ] B.2 `build.mjs` — 원본 → `:root` CSS를 `/* @design-tokens */` 자리에 넣음, 참조는 `var()`로
- [ ] B.3 `src/ui.html` `:root` 옛 변수 묶음 지우고 자리 표시만 남김
- [ ] B.4 `src/ui.html` CSS 전부 부록 A · §3 맞추는 법대로 바꿈(직접 값 0)
- [ ] B.5 `src/ui.html` 본문 `style="font-size:…"` 2곳을 토큰으로(나머지 `display:none` · 너비는 검사 대상 아님 — §8-1은 직접 값이 들어간 색 · 글자 · 간격 속성만 봄)
- [ ] B.6 `src/ui.ts`의 옛 변수 이름 바꿈
- [ ] B.7 `test/design-tokens.test.mjs` — §8의 1–6
- [ ] B.8 검사 4개 통과(`tsc` · `npm test` · `verify:i18n` · `verify-bind-flow`) — 픽셀 크기를 보는 검사가 바뀐 값 때문에 깨지면 그 검사의 기대값을 새 토큰 값으로 고치고 PR에 목록을 적는다
- [ ] B.9 전후 스크린샷(선택 탭 · 변수 탭 · 연결 · 만들기 · 이름 정리 · 모달) 비교, 바뀐 곳을 PR에 적음
- [ ] B.10 `docs/redesign/brief.md` · `ROADMAP.md`에 DS-1 · DS-2 · DS-3 자리 적음, `docs/ia-v4.md` §2.8 · §8에서 이 문서를 가리킴
