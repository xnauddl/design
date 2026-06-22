# Design System Linker (Figma 플러그인)

선택한 레이어에서 **디자인 토큰을 추출**해 Figma Variables로 만들고(3계층), 그 변수를
레이어 속성에 **바인딩**하고, 바인딩된 토큰 이름을 따라 **레이어를 리네임**하는 플러그인입니다.

> 양방향(하이브리드) 워크플로우: `추출 → 토큰 생성 → 적용(바인딩) → 리네임 → 컴포넌트 등록·베리언트 분류`.
> 만든 변수는 **코드로 내보내기(W3C 토큰 JSON · CSS 변수)** 도 가능.
> 설계 배경과 규칙은 저장소 계획 문서를 따릅니다. (마지막 단계는 Phase 3 계획)

> **🛠 v2 재설계 진행 중** — UI/IA · 결과 표면화(선택형 트리 미리보기) · **색 계층 정렬(Global=hue / Semantic=role)** · 단위 토큰 단일화 등 확정된 방향은 [`REDESIGN.md`](REDESIGN.md)에 정리돼 있습니다(요약은 `ROADMAP.md` §8). 아래 본문은 **현재 구현** 기준이며, v2 적용 시 일부가 갱신됩니다.

## 핵심 규칙

### 디자인 토큰 3계층 (별도 컬렉션 + 별칭)
- **Global** (`Global` 컬렉션) — 원시값(`#HEX`/`px`)을 **직접** 넣는 유일한 계층. `hiddenFromPublishing=true`로 직접 사용 방지.
- **Semantic** (`Semantic` 컬렉션) — 리터럴 금지, **오직 Global 변수를 별칭 참조**. 속성에 맞는 `scopes` 자동 설정.
- **Component** — Semantic을 한 번 더 참조(현재 v1은 수동/추후, 코드에선 Semantic 미러까지 자동 생성).
- 변수명에 tier 접두사(`global/`…)를 넣지 않습니다(컬렉션이 네임스페이스). 예: `color/blue-500`.
- 참조 방향은 `Component → Semantic → Global` 단방향.

### 색상 / 단위
- 색은 **불투명 hex(RGB)** 토큰 + **별도 opacity 토큰**(scope `OPACITY`)으로 분리.
- `lineHeight`/`letterSpacing`의 `%`·`em`·`rem` 의도는 Figma 변수로 바인딩 불가 → **STRING 토큰으로 보존**하고,
  필요 시 `base`(기본 16px)로 환산한 **`-px` FLOAT 스냅샷**을 추가 생성(폰트 크기 변경 시 비례하지 않는 스냅샷).
  - → **v2 예정(#16)**: STRING·`-px` 이중 생성을 폐기하고 **px FLOAT 단일** + 원본 단위는 `Variable.description`("160%")에 저장. 내보내기는 description 우선.

### 프레임 크기·여백 바인딩
- 크기(`width`/`height`)는 **Fixed**일 때만 바인딩(HUG/FILL 충돌 시 스킵·플래그).
- `padding`·`gap`은 **오토레이아웃 프레임**에만 존재 → 일반 프레임은 스킵·안내.

### 레이어 네이밍
**원칙: 레이어의 "역할(role)"이 이름을 정한다. 토큰은 이름을 짓는 "신호"로만 쓰고 경로를 그대로 복사하지 않는다.**

- 형식: **kebab-case 소문자**, 구분자 `-`. 구조: `{맥락}-{역할}` — **최대 2토막**(짧고 의미 있게).
- **보존형** — Figma 기본명(`Frame 12`·`Rectangle`·`Group 5`…)과 구(舊) 리네임이 원시·스냅샷 토큰 경로를 베껴 만든 이름(`color-121210`·`spacing-16`·`letter-spacing-0-percent-px`…)만 교체한다. 사람이 지은 의미 있는 이름(`color-picker`·`size-large` 등 값이 단어인 경우 포함)은 **그대로 보존**하고 자식의 맥락으로만 쓴다.
- **역할 판정 순서**: ① **버튼**(오토레이아웃+라운드+채움/외곽선+직속 텍스트) → ② **영역**(페이지 세로 스택의 첫=`header`/마지막=`footer`, depth 1 한정) → ③ 바인딩 토큰 **말단**이 역할 어휘면 그것(`…/background`→`background`) → ④ 타입·기하(VECTOR=`icon`, 얇은 막대=`divider`, 이미지 타원=`avatar`, 채움 사각형=`background`, 외곽선만=`border`, 색만 채운 빈 프레임=`swatch`, 그 외 프레임=`container`/단일자식 `wrapper`).
  - 역할 어휘: 요소(`icon`·`background`·`swatch`·`border`·`divider`·`image`·`avatar`·`badge`) + 시맨틱(`header`·`footer`·`nav`·`hero`·`button`·`card`·`label`·`title`…). 시맨틱은 **인식·보존**(사람·컴포넌트명)에 더해 button·header·footer만 **구조 추론**.
  - **원시/스냅샷 토큰**(`color/blue-500`·`line-height/150-percent-px`…)은 이름 신호가 없다 → 기하로 폴백(역할 오염 방지).
- **맥락(context)** — 바로 위 의미 있는 이름에서 **깨끗한 1단계**만 뽑는다(`pickScope`): 숫자·단위(`percent`·`px`…)·hex·일반 구조어(`container`·`wrapper`…)는 버린다. 없으면 토큰 경로 접두사에서. 그래서 `percent-px-container`·`2-wrapper-icon` 같은 군더더기가 생기지 않는다. 맥락==역할이면 중복 제거(`button-button`→`button`).
- **숫자 안 붙임** — 형제가 같은 이름이어도 그대로 둔다(Figma는 중복 레이어명 허용, 정체성은 ID). `-2`/`-3` 없음.
- **제외**(이름 유지): Component/ComponentSet · **Text** · Instance · 잠긴 레이어. *텍스트는 이름만 제외하고 변수 바인딩은 정상 수행.*
- **선택 루트 보존**(#7b): 선택의 **최상위(depth 0) 컨테이너**(프레임 등)는 **기본명이어도 항상 보존**하고 자식의 맥락으로만 쓴다(선택한 화면/프레임 이름을 건드리지 않음). **인스턴스는 서브트리까지 통째 스킵**(내부는 메인 컴포넌트 소유).
- 정돈된 역할명은 기본명이 아니므로 재실행 시 보존된다 → **멱등**.

### 컴포넌트 등록 / 베리언트 분류 (Phase 3 · 구현됨, Pro)
선택 레이어를 **메인 컴포넌트로 등록**하고, 같은 베이스 이름을 공유하는 컴포넌트들을 **베리언트 세트(ComponentSet)** 로 묶어 분류한다. 토큰/리네임과 동일하게 **kebab·멱등** 규칙을 따르며, 구조/이름만 바꾸고 토큰 바인딩은 건드리지 않는다.

- **컴포넌트 등록(registration)**
  - 선택한 `FRAME`/`GROUP`을 메인 컴포넌트로 변환. 이미 `COMPONENT`이거나 `COMPONENT_SET` 멤버면 건너뜀(멱등).
  - 이름 규칙: kebab 경로 `{영역}/{컴포넌트}`(예: `button`, `form/input`). 슬래시는 Figma 폴더 그룹으로 표시.
  - **제외**: `INSTANCE` · 잠긴 레이어 · `TEXT`.
  - (선택) 컴포넌트 설명·Code Connect 메타데이터 자리표시.
- **베리언트 분류(variant classification)**
  - 베이스 이름이 같은 형제 컴포넌트들을 `combineAsVariants`로 한 세트에 결합.
  - 베리언트 **속성(property) 추론** — 이름에서 `속성=값` 쌍으로 정규화:
    - `base/{value}`(단일 축) → 기본 속성명 `variant`; `base, prop=value`(다축) → 다중 키.
    - 어휘 매핑: `state`(default·hover·pressed·disabled) · `size`(sm·md·lg) · `type`/`emphasis`(primary·secondary·…) · `selected`(true/false → Boolean 속성).
  - 정규화 결과를 각 베리언트 이름 `prop=value, prop2=value2`(Figma 베리언트 규약)로 적용.
  - 속성 매트릭스의 **빈 조합 리포트**(분류 시) → **자동 생성은 Phase 4**(`GENERATE_MISSING_VARIANTS`).
- **멱등·안전**
  - 재실행 시 기존 ComponentSet/속성을 이름 키로 재사용(중복 결합 방지).
  - 텍스트·토큰 바인딩 불변(네이밍/구조만 변경). 모호한 속성 추론은 **미리보기에서 사용자가 교정**.
- **Phase 4**:
  - **누락 조합 자동 생성 ✅ (구현됨, Pro)** — 선택한 베리언트 세트의 빠진 조합을 기존 변형 클론+`prop=value` 리네임으로 생성(`missingVariants` 순수 계산 + `code.ts` 적용, `GENERATE_MISSING_VARIANTS`).
  - **컴포넌트 속성(Boolean/Text/Instance-swap) 노출 ✅ (구현됨, Pro)** — 레이어 규칙(`inferComponentProperties`)으로 속성 계획 → `addComponentProperty` + 참조 연결(`EXPOSE_PROPERTIES`). TEXT→characters, INSTANCE→mainComponent, `이름?`→visible(Boolean).
  - **라이브러리 발행** — Figma Plugin API에 발행 기능이 없어 **수동(또는 조직 정책)**, 코드 비대상.

## 개발

```bash
npm install
npm run build      # dist/code.js + dist/ui.html(인라인) + dist/pure.mjs 생성
npm run watch      # 변경 감시
npm run typecheck  # tsc --noEmit
npm test           # build 후 순수 로직(node --test)
```

Figma 데스크톱 → **Plugins → Development → Import plugin from manifest…** 에서 `manifest.json` 선택.

## 구조

```
src/
  code.ts            샌드박스 엔트리 · 메시지 라우터(모든 figma.* 호출)
  ui.html / ui.ts    순수 HTML/CSS UI · postMessage
  shared/messages.ts code↔ui 메시지 타입
  lib/
    tokens.ts   토큰 모델 + 순수 헬퍼(hex·스코프·단위 환산)
    naming.ts   레이어 네이밍 규칙(kebab·역할·맥락) — 순수
    color.ts    색공간 변환(sRGB↔OKLab↔OKLCH)·WCAG 대비 — 순수
    contrast.ts 명도 대비 점검(텍스트-배경 쌍 → AA/AAA 판정·리포트) — 순수
    palette.ts  브랜드색→톤 스케일·하모니·중립·상태색 생성 — 순수
    pure.ts     테스트용 순수 배럴(→ dist/pure.mjs)
    extract.ts  선택 노드에서 토큰 추출
    variables.ts 3계층 변수 생성/갱신(upsert) + 시맨틱 별칭 매핑(createSemanticAliases)
    bind.ts     resolved 값 매칭 → 변수 바인딩
    rename.ts   boundVariables·역할 추론 → 리네임
    entitlements.ts 요금제 티어·기능 게이팅·사용량 한도(M1) — 순수
    license.ts   라이선스 캐시 평가·grace·검증 응답 파싱(M2) — 순수
    licenseToken.ts 서명 토큰(JWT) 디코드·클레임·서명검증 통합(M2.1) — 순수
    licenseConfig.ts 검증 서버 URL·공개키·발급자(자리표시) — UI/code 공용 설정
    presets.ts   팀 공유 프리셋 직렬화·검증·매핑(M3, Team) — 순수
    exporters.ts 변수 → W3C 토큰 JSON · CSS 변수 내보내기 — 순수
    components.ts 컴포넌트 등록 + 베리언트 분류 순수 파서(속성=값 추론·그룹화·빈 조합) — 적용은 code.ts
    pure.ts        순수 로직 배럴(→ dist/pure.mjs)
    figma-lib.ts   figma 의존 모듈 배럴(→ dist/figma-lib.mjs, 테스트용)
test/pure.test.mjs     순수 로직 단위 테스트(tokens·naming)
test/palette.test.mjs  색공간·팔레트 생성 테스트(color·palette)
test/figma.test.mjs    figma 의존 모듈 테스트(extract·variables·bind·rename, 전역 figma 목 주입)
build.mjs              esbuild 빌드(코드 번들 + UI 인라인 + 테스트 번들 2종)
```

## 브랜드 팔레트 생성 (UI 0단계)

브랜드 색상을 선택하면 OKLCH 기반으로 **톤 스케일(50–950)**, 선택적 **하모니(보색·유사·삼각·분할·사각)**,
**중립(gray)·상태색(success/warning/error/info)** 을 생성해 토큰 목록에 채웁니다. 이후 `2 · 토큰 생성`으로
기존 3계층 변수 파이프라인(Global 리터럴 → Semantic 별칭)에 그대로 커밋됩니다. 생성 로직은 전부 순수
함수(`color.ts`/`palette.ts`)라 UI 스레드에서 동작하며 `node --test`로 검증됩니다.

## 시맨틱 매핑 (UI 2.5단계)

`surface`·`text`·`border`·`primary` 같은 **의미(semantic) 역할**을 특정 Global 변수에 별칭으로 연결합니다
(`Component → Semantic → Global` 단방향, 리터럴 금지). 팔레트 생성 시 `suggestSemanticMap`이 존재하는
패밀리 기준으로 추천 매핑을 채워주며, `역할 = Global변수이름` 형식으로 편집 후 적용합니다. 적용은
`createSemanticAliases`가 원시 스코프를 상속한 별칭 변수를 upsert(멱등)로 생성합니다.

## 코드 내보내기 (Export)

만든 **모든 디자인 변수**(Global+Semantic)를 코드로 내보낸다. 형식은 **택1**: **W3C 토큰 JSON**(DTCG) 또는 **CSS 변수**(`:root{ --…: … }`). Semantic 별칭은 W3C `{color.primary.500}` / CSS `var(--color-primary-500)`로 보존. 변환 로직(`exporters.ts`)은 순수라 `node --test`로 검증, 변수 읽기만 `code.ts`.

- **단위**: 폰트 크기는 **px/rem 택1**(rem은 `base`로 환산). 간격·반경·size는 px.
- **line-height·letter-spacing**: 정본(STRING)의 `%·em·rem` 단위를 **그대로** 출력(CSS 네이티브 지원; W3C는 비표준 문자열). 내부 `-px` 스냅샷은 기본 제외(옵션으로 포함).
- **fontWeight/italic**: italic은 굵기가 아니라 `font-style` → `splitWeightStyle`로 분리해 `font-weight` + (italic 시) `font-style: italic`/비표준 `fontStyle` 토큰 동반.
- **HUG/FILL 비대상**: 레이어 오토레이아웃 sizing은 변수가 아니라 export 대상이 아니다(대응 토큰 없음).
- UI "내보내기(코드)" 카드에서 형식·폰트단위 선택 → 결과 복사 또는 `tokens.json`/`tokens.css` 다운로드. 게이팅: 현재 Free.

## 컴포넌트 등록 / 베리언트 분류 (UI 5단계 · Phase 3 구현됨, Pro)

선택한 프레임을 **메인 컴포넌트로 등록**(`REGISTER_COMPONENTS`)하고, 같은 베이스 이름(예: `button/primary`,
`button/secondary`)을 공유하는 컴포넌트들을 **베리언트 세트**로 분류(`CLASSIFY_VARIANTS`)합니다. 속성 추론
(이름 → `속성=값`, 어휘 state/size/type)·그룹화·빈 조합 산출은 **순수 파서**(`components.ts`)로 `node --test`
검증, 실제 `createComponentFromNode`·`combineAsVariants`·자식 이름(`prop=value`) 적용만 `code.ts`에서
수행합니다(순수/부수효과 분리). 결과는 `COMPONENTS_RESULT`/`VARIANTS_RESULT`(생성 수·빈 조합·단일)로 보고.
이미 컴포넌트/세트 멤버면 건너뜀(멱등), `INSTANCE`·`TEXT`·잠금 제외. **Pro 게이팅**(비-Pro는 `PREMIUM_REQUIRED`).

**Phase 4 — 누락 조합 자동 생성**: 선택한 베리언트 세트의 **빠진 속성 조합**(`missingVariants` 순수 계산)을 기존 변형을 클론해 `prop=value`로 이름 지정하여 생성(`GENERATE_MISSING_VARIANTS`, Pro). 분류·생성 후 세트는 **속성 기반 2D 그리드**(`variantGrid`: 첫 속성=행, 둘째=열)로 정렬되고 자식에 맞게 **리사이즈**된다. 라이브러리 발행은 Plugin API 미지원이라 수동.

**Phase 4.1 — 컴포넌트 속성 노출**: 선택한 컴포넌트의 자식 레이어를 규칙으로 분석(`inferComponentProperties`)해 **컴포넌트 속성**을 만들고 연결(`EXPOSE_PROPERTIES`, Pro). TEXT 레이어→TEXT(characters), INSTANCE→INSTANCE_SWAP(mainComponent, 기본값은 발행 컴포넌트 key 또는 로컬 id), 이름이 `?`로 끝나는 레이어→BOOLEAN(visible). 실패 항목은 건너뜀.

빌드 메모: Figma UI는 단일 HTML만 로드(외부 `<script src>` 불가)하므로, `ui.ts` 번들 결과를
`ui.html`의 인라인 `<script>`로 주입합니다(`build.mjs`).

## UI / 메뉴 개편 (진행 중)

단계가 늘어 길어진 단일 스크롤을 **탭 그룹**으로 재편한다.

- **구조 재편 ✅ (v2 4탭)**: **`시작`(시스템화 마법사) / `만들기`(팔레트·추출·생성·시맨틱) / `적용`(바인딩·리네임·대비·컴포넌트) / `관리`(내보내기·요금제·프리셋)**. 상단 sticky 탭 바, 첫 화면은 `시작`. 창은 우하단 핸들로 리사이즈(크기 기억).
- **통합 게이트 ✅ (v2 #11·#12)**: **전제 미충족 가드** — Global 변수가 없으면 시맨틱 매핑, 바인딩 가능 변수가 없으면 바인딩 카드를 **비활성+안내(+‘토큰 생성으로’ 바로가기)** 로 가드(조용히 0건 방지). 유료 잠금(Pro/Team)과 함께 `updateGates` 한 메커니즘으로 처리(`PREREQ_STATE`로 상태 동기화).
- **유료 게이팅 노출 ✅(부분)**: 컴포넌트(Pro)·프리셋(Team) 카드에 🔒 잠금·비활성 표시. (토큰 생성·시맨틱 등 Paid 배지는 2티어 전환 PR #30과 함께.)
- **반응형·접근성**(부분): 탭 `role=tab/tabpanel`·`aria-selected`. 키보드 화살표 이동·대비는 추후.

> 비고: 기능 동작은 그대로 두고 **메뉴/레이아웃 표현만** 개편. `ui.html`/`ui.ts`만 변경(메시지·로직 불변).

## UX 개선

메뉴/레이아웃(위 UI 개편)과 별개로, **작업 흐름과 사용 경험**을 다듬는다. 토큰/바인딩/리네임은 디자인 파일을 직접 바꾸는 작업이므로 **안전성·예측 가능성·피드백**을 우선한다.

- ✅ **적용 전 미리보기·확인**: 토큰 생성·바인딩을 ‘미리보기 → 적용’ 2단계로(변경 요약 생성 n·갱신 n·스킵 n). 선택/추출 변경 시 미리보기 무효화. _(`previewCreateTokens`, `bindSelection(apply=false)`)_
- ✅ **되돌리기·안전장치**: 각 쓰기 작업을 단일 Undo 스텝으로 묶기(`figma.commitUndo()`). _(`lib/undo.ts`)_
- ✅ **명확한 피드백**: 바인딩 스킵을 사유별 그룹으로(매칭 없음·빈 텍스트·HUG/FILL·오토레이아웃 아님·폰트 미로드·실패). _(`BindResult.reasons`)_
- ✅ **온보딩·가이드**: 추출 목록 빈 상태 도움말(선택 여부에 맞춘 안내·예시).
- ✅ **선택 동기화**: 선택 변경 시 실시간 상태 바(선택 n·요소 m·바인딩 후보 b), 스캔 상한 안전장치. _(`SELECTION_STATE`)_
- ✅ **성능 체감**: 대량 바인딩 진행률 바 + 협조적 취소(비파괴, 처리분 유지). _(`BindHooks`)_
- ✅ **오류 처리**: 사람이 읽는 메시지 + 복구 행동 + ‘다시 시도’, 실패한 작업 영역으로 라우팅. _(`lib/errors.ts`)_
- ✅ **접근성**: 탭 키보드 내비(roving tabindex + 화살표/Home/End), ARIA tab/tabpanel. _(`lib/a11y.ts`)_
- ✅ **명도 대비 점검**: 선택 안 텍스트의 글자색 ↔ 유효 배경(가장 가까운 상위 단색 채움)을 WCAG 기준(AA/AAA, 큰 글자 반영)으로 검사 → 미달 건을 대비 낮은 순으로 보고. 읽기 전용(쓰기·Undo·이력 없음). _(`lib/contrast.ts`, `CHECK_CONTRAST`)_

> 비고: 동작 규칙(3계층·멱등·스코프)은 유지하고 **경험 계층**만 개선했다. 잔여(추후): 국제화(i18n 문자열 외부화), 대량 선택 비차단 점진 렌더.

## 유료화 / 상용 전환 (추후 · 로드맵)

오픈 코어 + **프리미엄(Freemium)** 모델. **구독(월/연)** 과 **외부 라이선스 키**(웹 결제 → 키 발급 → 플러그인이 서버 검증)를 기준으로 한다. 무료 사용자의 기존 동작은 **절대 막지 않으며**, 유료 기능·한도 초과분은 **미리보기·계산은 허용하고 적용(쓰기)만 잠금**한다.

### 유료화 기준 (게이팅 원칙)
무료↔유료를 가르는 명시적 규칙. (a)+(b) 조합을 1차 기준으로 한다.

- **(a) 사용량 한도** — 핵심 기능은 무료지만 **1회 실행 규모에 한도**를 둔다. 초과분은 적용하지 않고 업그레이드 안내(비파괴적).
- **(b) 기능 고도화** — 자동화·AI·발행·멀티모드·컴포넌트/베리언트 등 **고급 기능은 Pro 이상**.
- **(c) 협업** — 공유 프리셋·시트·변경 이력 등 팀 기능은 **Team**.
- **(d) 비파괴 게이팅** — 한도 초과/유료 기능도 **미리보기·계산은 허용**, **적용(쓰기)만 잠금**.

### 사용량 한도 (Free · 자리표시)
정확 수치는 **TBD**(아래는 예시). **회당 규모 제한**을 1차 기준으로 한다(일일 횟수 제한 아님).

| 항목 | Free 한도(예시) | Pro/Team |
|---|---|---|
| 1회 선택 처리 노드 | 50개 | 무제한 |
| 1회 토큰 생성/갱신 | 100개 | 무제한 |
| 1회 바인딩 | 200건 | 무제한 |
| 팔레트 계열 | 기본(primary·중립·상태) | 보조색·하모니·다축 포함 |

한도 초과 시: 계산/미리보기는 보여주되 **적용은 한도까지만** + `PREMIUM_REQUIRED` 안내(예: "n개 중 m개만 적용됨 · 업그레이드").

### 티어 매트릭스

| 기능 | Free | Pro | Team |
|---|:---:|:---:|:---:|
| 추출 · 토큰 생성(3계층) · 시맨틱 매핑 · 바인딩 · 리네임 | ✅ (한도) | ✅ 무제한 | ✅ 무제한 |
| 팔레트 생성(기본) | ✅ | ✅ | ✅ |
| 컴포넌트 등록 · 베리언트 분류(Phase 3) | — | ✅ | ✅ |
| 라이브러리 발행 · 멀티모드/테마 · 누락조합 자동생성 · AI 네이밍 | — | ✅ | ✅ |
| 공유 프리셋/네이밍 규칙 · 변경 이력 · 시트 관리 · 우선 지원 | — | — | ✅ |

### 가격 (자리표시)
- **Pro** — **$8–12/월**(연 결제 할인, 예: 2개월분). 금액 **TBD**.
- **Team** — **시트(seat)당** 과금. 금액 **TBD**.

### 라이선스 아키텍처 (외부 키) — M2 구현(서버 미배포)
- 웹 결제(결제 제공자: Gumroad/LemonSqueezy/Paddle 또는 자체 서버) → **라이선스 키 발급** → 플러그인 설정에 키 입력 → `code.ts`가 **검증 서버**(`VERIFY_URL` 자리표시)에 `fetch` 요청 → 엔타이틀먼트 응답.
- 검증 서버 책임: 키 진위·구독 상태·만료·시트 확인. **디자인 데이터 미전송**(키 + pluginId만).
- `figma.clientStorage` 캐시 `LicenseCache = { key, tier, expiresAt, lastVerified }`. 평가(`evaluateLicense`)는 만료 전이면 적용, 오프라인이면 **grace(기본 14일)** 동안 유지, grace 초과 시 강등(free). 오래된 캐시는 시작 시 백그라운드 재검증.
- **위변조 방지(M2.1 구현)**: 서버가 비대칭 서명(ES256/EdDSA) **JWT**를 발급, 플러그인이 공개키로 검증. 검증 응답이 `{ token }`이면 `verifyLicenseToken`으로 **서명+클레임(exp·iss·aud·tier)** 검사 후 신뢰(`alg=none` 거부). `{ valid,tier,expiresAt }` 평문은 개발/하위호환 경로.
- **검증 위치(M2.2)**: 네트워크 `fetch` + 서명(`crypto.subtle`) 검증은 **UI 아이프레임**에서 수행(WebCrypto 가용). UI가 결과(`LICENSE_VERIFIED`)만 `code.ts`로 보고하고, `code.ts`는 **캐시·grace·게이팅**만 담당(부수효과 분리). 시작 시 캐시가 오래됐으면 `code → UI`로 `REQUEST_VERIFY`(재검증 요청).
- 순수 로직(`license.ts` 캐시 평가, `licenseToken.ts` 디코드·클레임)은 `node --test`로 검증. `VERIFY_URL`·공개키(`licenseConfig.ts`)·`allowedDomains`는 자리표시(배포 시 교체).

### 엔타이틀먼트 모델 (M1 구현됨 · 결제는 추후)
- 기능 플래그 집합 + 단일 게이트 `hasEntitlement(tier, feature)` — `src/lib/entitlements.ts`(순수, 테스트됨).
- **사용량 한도 집행**: Free일 때 `code.ts`가 `createTokens`는 입력 토큰을 한도까지 슬라이스, `bindSelection`은 노드/바인딩 예산으로 비파괴 중단 → 결과 `limited` 플래그 + 업그레이드 안내.
- 메시지(`src/shared/messages.ts`): `UiToCode`에 `GET_LICENSE` · `SET_LICENSE`(M1 개발용 티어 토글); `CodeToUi`에 `LICENSE_STATUS` · `PREMIUM_REQUIRED`. 티어는 `figma.clientStorage`에 저장.
- UI: "요금제 / 라이선스 (개발용)" 카드에서 Free/Pro/Team 토글로 한도 동작을 검증할 수 있다(결제 연동은 M2).

### 게이팅 표면 (UI · UI 개편 로드맵과 연계)
- 유료 단계 카드에 잠금/배지, 한도 초과 시 "n개 중 m개만 적용됨 · 업그레이드" 안내.
- 미리보기는 항상 가능, 적용 버튼은 비활성/부분적용 + 업그레이드 CTA. 설정에 **라이선스 키 입력** 영역.

### 단계별 출시
- **M0**: 전 기능 무료.
- **M1 ✅ (구현됨)**: 엔타이틀먼트(`entitlements.ts`) + 사용량 한도 집행(`createTokens`/`bindSelection`) + UI 개발용 티어 토글. 결제 없음.
- **M2 ✅ (구현됨, 서버 미배포)**: 라이선스 키 입력·검증(`license.ts` + `code.ts` fetch) + `clientStorage` 캐시·오프라인 grace. `VERIFY_URL`·`allowedDomains`는 자리표시 → 실제 검증 서버/결제 제공자 연동 시 교체.
- **M2.1 ✅ (구현됨)**: 서명 토큰(JWT) 검증 코어(`licenseToken.ts`) — 서명+클레임 검사, `alg=none` 거부.
- **M2.2 ✅ (구현됨)**: 네트워크+서명 검증을 **UI 아이프레임**으로 이동(`verifyAndReport`→`LICENSE_VERIFIED`), `code`는 캐시/grace/게이팅만. 시작 시 stale 캐시는 `REQUEST_VERIFY`로 재검증. (실제 공개키/검증 서버는 배포 시 연동)
- **M3 ✅ (부분 구현: 공유 프리셋)**: Team 게이팅(`teamPresets`)으로 **공유 프리셋**(`presets.ts`) — base·허용오차·맥락단계·시맨틱 매핑을 저장/불러오기 + JSON 내보내기/가져오기(`clientStorage` 보관). 비-Team은 `PREMIUM_REQUIRED`.
- **M3.1 ~~변경 이력~~ — v2에서 제거(PR #37)**: 불투명한 집계성 이력은 v2 재설계에서 비목표로 결정해 `history.ts`·이력 카드·메시지·기록 호출부를 전면 삭제했다. (선택형 미리보기 트리가 "무엇이 바뀌는지"를 더 투명하게 대체.)
- **M3.2**(다음): 서버 기반 시트(seat) 관리 · 가격/프로모션 확정 · 팀 동기화(클라우드 공유).

### 프라이버시 · 법무
- 토큰·디자인 데이터 **로컬 처리** 유지, 외부 전송은 **라이선스 검증 요청에 한정**.
- 환불·약관·개인정보 처리방침·세금(VAT는 결제 제공자에 위임) — 자리표시.

### 리스크 · 미정
- Figma 정책(외부 결제/키 방식 허용 범위) 확인 필요.
- 정확한 한도 수치·가격·결제 제공자 선택, 무료↔유료 경계 재조정 여지.

> 비고: 이 섹션은 **사업/구현 방향의 설계 문서(자리표시 포함)** 이며, 실제 결제·라이선스 연동과 기능 게이팅은 별도 PR에서 진행한다.
