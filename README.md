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
- `lineHeight`/`letterSpacing`의 `%`·`em`·`rem` → **#16 단위 토큰 단일화**: STRING·`-px` 스냅샷 이중 생성을 폐기하고
  **px FLOAT 단일 변수**(`base`=16px 기준 환산, 바인딩 가능)로 만들고, **원본 단위는 `Variable.description`("160%")** 에 저장한다.
  내보내기는 description을 우선 출력(`160%`), 없으면 px. (Figma 패널에도 사람이 읽을 단위가 표시됨.)

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

### 컴포넌트 등록 / 베리언트 분류 (Phase 3 · 구현됨, Paid)
선택 레이어를 **메인 컴포넌트로 등록**하고, 같은 베이스 이름을 공유하는 컴포넌트들을 **베리언트 세트(ComponentSet)** 로 묶어 분류한다. 토큰/리네임과 동일하게 **kebab·멱등** 규칙을 따르며, 구조/이름만 바꾸고 토큰 바인딩은 건드리지 않는다.

- **컴포넌트 등록(registration)**
  - 선택한 **부모는 컨테이너**(자신은 컴포넌트화 X) — 하위 후보만 대상. 다중 선택 시엔 선택 각각이 대상.
  - **고신뢰 구조 게이트**: `button`/`chip`/`nav`/`progress`/`card`/`figure`/`field`/`list`/`heading`으로 검출되는 **보이는** `FRAME`/`GROUP`만 eligible(레이어 이름 문자열 불필요). `heading`은 섹션 머리줄(가로 스택·높이 상한·타이틀+선택 액션/메타)이며 리네임 페이지 `header` 랜드마크와 별개. 숨김(조상 포함)·잠금·`INSTANCE`/`COMPONENT`/`COMPONENT_SET` 안·임의 컨테이너는 제외.
  - **그룹화 = 정확한 레이어 이름**(대소문자·여백만 정규화). 이름이 다르면 레이아웃이 같아도 각각 단독.
  - **같은 이름 2개+**: 구조가 같고 텍스트/스왑/`?` 가시성만 다르면 **속성 접힘**(단품 1개 + 인스턴스 오버라이드). **heading**(타이틀+메타)은 액션 INSTANCE(`buttonGroup` 등) 유무만 달라도 접힘(BOOLEAN). 크기·색·레이아웃 차이면 **베리언트 세트**(`deriveVariants`). 과묶임은 체크 해제. 이름은 **PascalCase**.
  - **견고성**: `combineAsVariants` 실패 시 단독 등록. 정렬은 비치명. 실패는 UI `failures`.
  - **인스턴스 교체**: 메인은 `Components` 페이지, 원위치엔 인스턴스.
  - **세트 속성 도출**: 이름 어휘(`Type`/`State`/`Size`/`Selected`) 우선 + 기하 보완 + 구별 토큰/`Variant=N`.
- **베리언트 분류(variant classification)**
  - 베이스 이름이 같은 형제 컴포넌트들을 `combineAsVariants`로 한 세트에 결합.
  - 베리언트 **속성(property) 추론** — 이름에서 `속성=값` 쌍으로 정규화. 추론한 속성명은 Figma 라이브러리 관례대로 **Capitalize**(`Size`·`Color`…), 사용자가 명시한 `prop=value`는 기존 세트 호환을 위해 **그대로 보존**:
    - `base/{value}`(경로형) → 알려진 어휘는 해당 속성, 미지정 값은 `Variant`; `base, prop=value`(명시형) → 다중 키(사용자 표기 유지).
    - 어휘 매핑: `State`(default·hover·pressed·focus·active·disabled·loading) · `Size`(sm·md·lg) · `Type`(primary·secondary·…) · `Selected`(불리언 축 — 경로형 `…/selected` → `Selected=true`, 명시형 `selected=true/false`).
  - 정규화 결과를 각 베리언트 이름 `Prop=value, Prop2=value2`(Figma 베리언트 규약)로 적용.
  - 속성 매트릭스의 **빈 조합 리포트**(분류 시) → **자동 생성은 Phase 4**(`GENERATE_MISSING_VARIANTS`).
- **멱등·안전**
  - 재실행 시 기존 ComponentSet/속성을 이름 키로 재사용(중복 결합 방지).
  - 텍스트·토큰 바인딩 불변(네이밍/구조만 변경). 모호한 속성 추론은 **미리보기에서 사용자가 교정**.
- **Phase 4**:
  - **누락 조합 자동 생성 ✅ (구현됨, Paid)** — 선택한 베리언트 세트의 빠진 조합을 기존 변형 클론+`prop=value` 리네임으로 생성(`missingVariants` 순수 계산 + `code.ts` 적용, `GENERATE_MISSING_VARIANTS`).
  - **컴포넌트 속성(Boolean/Text/Instance-swap) 노출 ✅** — 등록 시 자동. **접힘**: 값이 다른 슬롯만(`inferVarying…`). **단독·세트**: 트리 TEXT/INSTANCE/`이름?` 전부(`inferComponentProperties`, 동명·동일 카피는 1개, 연결은 레이어 경로). `이름?` → BOOLEAN 우선(TEXT여도).
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
    colorName.ts 색→hue 패밀리·스텝 분류 + 색 목록 hue 네이밍(충돌 접미사, #3) — 순수
    contrast.ts 명도 대비 점검(텍스트-배경 쌍 → AA/AAA 판정·리포트) — 순수
    palette.ts  브랜드색→hue 스케일·하모니·중립·상태색 + 역할→hue 매핑 — 순수
    roles.ts    전 토큰 역할 어휘 추천(수치 티셔츠·fontSize 타입·weight·family) — 순수
    pipeline.ts 만들기→적용 의존 파이프라인 단계 상태(진행 안내) — 순수
    i18n.ts     UI 문자열 단일 소스 + t() 룩업·{var} 보간(현재 ko) — 순수
    pure.ts     테스트용 순수 배럴(→ dist/pure.mjs)
    extract.ts  선택 노드에서 토큰 추출
    variables.ts 3계층 변수 생성/갱신(upsert) + 시맨틱 별칭 매핑 + 텍스트 스타일 등록(createSemanticTextStyles)
    textStyles.ts 텍스트 스타일 순수 로직(시그니처 군집·크기 랭킹 명명·기본 램프) — Phase C
    bind.ts     resolved 값 매칭 → 변수 바인딩
    rename.ts   boundVariables·역할 추론 → 리네임
    entitlements.ts 요금제 티어(Free/Paid)·기능 게이팅 — 순수
    license.ts   라이선스 캐시 평가·grace·검증 응답 파싱 — 순수
    licenseToken.ts 서명 토큰(JWT) 디코드·클레임·서명검증 통합 — 순수
    licenseConfig.ts 검증 서버 URL·공개키·구매/관리 링크(자리표시) — UI/code 공용 설정
    presets.ts   공유 프리셋 직렬화·검증·매핑(Paid) — 순수
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
**중립·상태색(success/warning/error/info)** 을 생성해 토큰 목록에 채웁니다. **#3: Global 이름은 역할이 아니라
hue 패밀리**(`color/blue/500`·`color/gray/900`)로 만들고(원시=정체성), 역할(primary·surface…)은
`paletteSemanticMap`이 **Semantic 별칭**으로만 산출합니다. 동일 hue가 겹치면(예: primary·info 둘 다 blue)
결정적 **접미사 인덱스**(`blue`, `blue-2`). 이후 `2 · 토큰 생성`으로 3계층 파이프라인(Global 리터럴 → Semantic
별칭)에 커밋됩니다. 로직은 전부 순수(`color.ts`/`colorName.ts`/`palette.ts`)라 `node --test`로 검증됩니다.

## 시맨틱 매핑 (UI 2.5단계)

`surface`·`text`·`border`·`primary` 같은 **의미(semantic) 역할**을 특정 Global 변수에 별칭으로 연결합니다
(`Component → Semantic → Global` 단방향, 리터럴 금지). **#10: 색 소스와 무관하게 추천** — 팔레트는
`paletteSemanticMap`(역할→hue 정확), **추출·기존 색은 `suggestSemanticMap(colors)`** 가 OKLCH로 분류해
무채색→surface/text/border, 채도 최고 유채색→primary를 **실제 변수 이름으로** 추천합니다(추출 후에도 매핑
가능). **재방문 매핑**: ‘기존 색에서 추천’ 버튼은 `GET_GLOBAL_COLORS`로 **문서에 이미 있는 Global 색**을 읽어
같은 로직으로 추천합니다(새 추출 없이도). **전 토큰 역할 어휘**(`suggestTokenRoles`): 색뿐 아니라
spacing/radius/size는 **센터(md) 티셔츠 스케일**(`spacing/sm·md·lg`), fontSize는 base 기준 **type 스케일**
(`font-size/body·title·h1`), fontWeight는 이름(`font-weight/bold`), fontFamily는 키워드/순서(`font-family/sans·heading`)로
추천합니다(약함인 opacity·letterSpacing, 후순위 effects는 제외). `역할 = Global변수이름` 형식으로 편집 후 적용하며,
`createSemanticAliases`가 원시 스코프를 상속한 별칭 변수를 upsert(멱등)로 생성합니다. **#3 색 편집표(UI 1.5단계)**: 추출/생성 색을 표로 보여주고
(스와치·hue 이름·역할 입력), 추출 색은 `nameColorsByHue`로 **hue-Global 이름**(`color/blue/500`, 같은
hue·스텝 충돌 시 `…/500-2`)으로 정규화합니다. 역할을 확정해 ‘반영’하면 시맨틱 매핑에 채워집니다.

## 텍스트 스타일 (UI 2.6단계 · Phase C, Paid)

화면의 **실제 텍스트를 인식**해 타이포 조합을 **시맨틱 변수로 등록**하고, 이를 **명명된 텍스트 스타일**로 등록·바인딩하는 end-to-end 파이프라인입니다(스타일 → 시맨틱 → Global 3계층 완성).

- **스캔**(`SCAN_TEXT_STYLES`): 선택 트리의 **보이는** TEXT 노드에서 `{fontSize, lineHeight(px), letterSpacing, family, style}` 시그니처를 수집(`scanTextStyles`). 숨김(`visible=false`)·부분 서식(mixed)은 스킵(+경고). PERCENT 자간·행간은 px 환산 — 다만 **행간의 원본 %는 `lineHeightPercent`로 함께 보존**한다(시그니처·매칭 기준은 계속 px).
  - **군집·명명**(순수 `textStyles.ts`): 동일 시그니처를 묶고(`clusterTextStyles`), **fontSize 내림차순**으로 `display·h1·…·overline` 배정(`nameTextStyles`, 같은 크기는 `base/weight`·`base/family-weight` 분기). **기존 스타일 앵커**: 노드 `textStyleId` 또는 시그니처가 로컬 스타일과 정확히 1개 일치하면 기존 이름 유지 + `boundStyleId`(재스캔=rename, 타프레임 중복 방지). 선택이 없으면 `DEFAULT_TYPE_RAMP` 폴백. **가로 행 라벨 옵션**(`useRowLabels`, 기본 OFF·세션만): 안쪽 HORIZONTAL 행의 왼쪽 텍스트 `characters`를 이름으로(`nameTextStylesWithRowLabels`), 라벨·표본 우측은 표 제외, 실패 시 크기 랭킹 폴백.
- **등록**(`CREATE_TEXT_STYLES`, `createSemanticTextStyles`): size·lineHeight·letterSpacing → **Global + Semantic**(`font-size|line-height|letter-spacing/{역할}`) 보장 후 텍스트 스타일 upsert·시맨틱 바인딩. `boundStyleId`가 있으면 **이름만 rename**(폰트·크기·행간·자간 보존). 폰트 로드 실패 시 `Regular` 폴백+보고.
- **행간 % 보존**: 원본이 %인 행간은 스타일에 **`PERCENT`로 등록**하고 그 스타일의 **행간 변수 바인딩만 생략**한다(크기·자간 바인딩은 유지). Figma는 행간에 변수를 바인딩하면 단위를 `PIXELS`로 강제하고, 변수는 단위 없는 FLOAT이라 `150`이 150%가 아니라 **150px**로 해석되므로 %와 바인딩은 동시에 가질 수 없다. 이미 %로 만들어 둔 기존 스타일을 rename할 때도 같은 이유로 바인딩하지 않는다(px로 뭉개지 않기 위해). 변수는 그대로 만들되 **값은 px 스냅샷 + 원본 단위는 `description`("150%")** — 내보내기가 description을 우선하므로 코드에는 `line-height: 150%`로 나간다(#16 규칙). 같은 px 이름에 원본이 갈리면(24px 역할 + 16px의 150% 역할) 다른 역할의 내보내기를 오염시키지 않도록 px로 기록하고 알림을 남긴다. 의도된 미바인딩은 경고(`missing`)가 아니라 `notes`로 보고.
- **적용**: (a) 등록 시 옵션 — 전체 시그니처(패밀리·크기·굵기·행간·자간) 일치 노드에 연결. (b) **기존 스타일 적용만**(`APPLY_TEXT_STYLES`) — 생성 없이 시그니처 매칭 바인딩(미등록·모호는 보고).
- UI: **‘선택에서 스캔’** → 표(이름만 편집·스캔값 읽기 전용, 신규=앰버/등록됨=파랑, 행간은 `24px`/`150%`처럼 단위까지 표시) → **‘텍스트 스타일 등록’** (+화면 적용 체크) · **‘기존 스타일 적용만’**. 순수 로직은 `node --test`, figma 호출은 `variables.ts`. **Paid 게이팅**(스캔은 무게이팅 미리보기).

## 코드 내보내기 (Export)

만든 **모든 디자인 변수**(Global+Semantic)를 코드로 내보낸다. 형식은 **택1**: **W3C 토큰 JSON**(DTCG) 또는 **CSS 변수**(`:root{ --…: … }`). Semantic 별칭은 W3C `{color.primary.500}` / CSS `var(--color-primary-500)`로 보존. 변환 로직(`exporters.ts`)은 순수라 `node --test`로 검증, 변수 읽기만 `code.ts`.

- **단위**: 폰트 크기는 **px/rem 택1**(rem은 `base`로 환산). 간격·반경·size는 px.
- **line-height·letter-spacing**(#16): `Variable.description`의 원본 단위(`160%`·`0.02em`)를 우선 출력(CSS 네이티브; W3C는 비표준 문자열), 없으면 px. 별도 `-px` 스냅샷·옵션은 폐기.
- **fontWeight/italic**: italic은 굵기가 아니라 `font-style` → `splitWeightStyle`로 분리해 `font-weight` + (italic 시) `font-style: italic`/비표준 `fontStyle` 토큰 동반.
- **HUG/FILL 비대상**: 레이어 오토레이아웃 sizing은 변수가 아니라 export 대상이 아니다(대응 토큰 없음).
- UI "내보내기(코드)" 카드에서 형식·폰트단위 선택 → 결과 복사 또는 `tokens.json`/`tokens.css` 다운로드. 게이팅: **Free**(리드젠).

## 컴포넌트 등록 / 베리언트 분류 (UI 5단계 · Phase 3 구현됨, Paid)

선택 하위의 **고신뢰 구조** 후보를 스캔·등록(`SCAN_COMPONENT_CANDIDATES` / `REGISTER_COMPONENTS`)하고, 기존 컴포넌트를 같은 이름으로 세트 분류(`CLASSIFY_VARIANTS`)합니다. 후보 게이트·이름 그룹·속성 접힘·베리언트 도출은 `components.ts`/`componentLike.ts` 순수 로직, 적용은 `code.ts`. **Paid**. 숨김(조상 포함) 제외.

**속성 노출**: 접힘=가변 슬롯만 / 단독·세트=전체 API. 경로는 레이어 경로로 연결.

**Phase 4 — 누락 조합 자동 생성**: 선택한 세트의 빈 조합 클론 생성(`GENERATE_MISSING_VARIANTS`) + `variantGrid` 정렬. 라이브러리 발행은 수동.

빌드 메모: Figma UI는 단일 HTML만 로드(외부 `<script src>` 불가)하므로, `ui.ts` 번들 결과를
`ui.html`의 인라인 `<script>`로 주입합니다(`build.mjs`).

## UI / 메뉴 개편 (진행 중)

단계가 늘어 길어진 단일 스크롤을 **탭 그룹**으로 재편한다.

- **구조 재편 ✅ (v2 4탭)**: **`시작`(시스템화 마법사) / `만들기`(팔레트·추출·생성·시맨틱) / `적용`(바인딩·리네임·대비·컴포넌트) / `관리`(내보내기·요금제·프리셋)**. 상단 sticky 탭 바, 첫 화면은 `시작`. 창은 우하단 핸들로 리사이즈(크기 기억).
- **통합 게이트 ✅ (v2 #11·#12)**: **전제 미충족 가드** — Global 변수가 없으면 시맨틱 매핑, 바인딩 가능 변수가 없으면 바인딩 카드를 **비활성+안내(+‘토큰 생성으로’ 바로가기)** 로 가드(조용히 0건 방지). 유료 잠금(Paid)과 함께 `updateGates` 한 메커니즘으로 처리(`PREREQ_STATE`로 상태 동기화).
- **진행 안내 ✅ (의존관계 시각화)**: 시작 탭에 의존 파이프라인(토큰 생성→시맨틱 매핑→바인딩)의 **단계 상태**(완료/준비됨/전제 미충족)를 표시하고, 클릭하면 해당 단계로 이동합니다. 상태 로직은 순수(`pipeline.ts`)라 `node --test`로 검증. 리네임·대비·컴포넌트는 독립이라 별도 표기.
- **유료 게이팅 노출 ✅**: 토큰 생성·시맨틱·컴포넌트·프리셋 등 유료(Paid) 카드에 🔒 잠금·비활성 표시(미리보기·탐색은 무료).
- **반응형·접근성**(부분): 탭 `role=tab/tabpanel`·`aria-selected`. 키보드 화살표 이동·대비는 추후.

> 비고: 기능 동작은 그대로 두고 **메뉴/레이아웃 표현만** 개편. `ui.html`/`ui.ts`만 변경(메시지·로직 불변).

## UX 개선

메뉴/레이아웃(위 UI 개편)과 별개로, **작업 흐름과 사용 경험**을 다듬는다. 토큰/바인딩/리네임은 디자인 파일을 직접 바꾸는 작업이므로 **안전성·예측 가능성·피드백**을 우선한다.

- ✅ **적용 전 미리보기·확인**: 토큰 생성·바인딩을 ‘미리보기 → 적용’ 2단계로(변경 요약 생성 n·갱신 n·스킵 n). 선택/추출 변경 시 미리보기 무효화. _(`previewCreateTokens`, `bindSelection(apply=false)`)_
- ✅ **되돌리기·안전장치**: 각 쓰기 작업을 단일 Undo 스텝으로 묶기(`figma.commitUndo()`). _(`lib/undo.ts`)_
- ✅ **명확한 피드백**: 바인딩 스킵을 사유별 그룹으로(매칭 없음·빈 텍스트·HUG/FILL·오토레이아웃 아님·폰트 미로드·실패). _(`BindResult.reasons`)_
- ✅ **온보딩·가이드**: 추출 목록 빈 상태 도움말(선택 여부에 맞춘 안내·예시).
- ✅ **선택 동기화**: 선택 변경 시 실시간 상태 바(선택 n·요소 m·바인딩 후보 b), 스캔 상한 안전장치. _(`SELECTION_STATE`)_
- ✅ **성능 체감**: 대량 바인딩 진행률 바 + 협조적 취소(비파괴, 처리분 유지). _(`BindHooks`)_ · **대량 선택 점진 렌더** — 토큰 목록·선택 트리·색 편집표가 클 때 `requestAnimationFrame` 청크로 비차단 렌더(소량은 즉시). _(`renderChunked`)_
- ✅ **오류 처리**: 사람이 읽는 메시지 + 복구 행동 + ‘다시 시도’, 실패한 작업 영역으로 라우팅. _(`lib/errors.ts`)_
- ✅ **접근성**: 탭 키보드 내비(roving tabindex + 화살표/Home/End), ARIA tab/tabpanel. _(`lib/a11y.ts`)_
- ✅ **명도 대비 점검 + 보정(#2)**: 선택 안 텍스트의 글자색 ↔ 유효 배경(가장 가까운 상위 단색 채움)을 WCAG 기준(AA/AAA, 큰 글자 반영)으로 검사 → 미달 건을 대비 낮은 순으로 보고. **미달 행마다 보정 제안** — `suggestContrastFix`가 OKLCH 명도(L)를 이분 탐색해 기준을 통과시키는 **최소 변경색**을 산출(텍스트색 기본·배경색 옵션), ‘텍스트/배경’ 버튼으로 해당 노드 채움에 적용(`APPLY_CONTRAST_FIX`, 단일 Undo). _(`lib/contrast.ts`, `CHECK_CONTRAST`)_

- ✅ **국제화(i18n) 인프라**: UI 문자열을 `i18n.ts`의 `STRINGS` 단일 소스로 모으고 `t(key, vars)`로 조회(`{var}` 보간, 누락 키는 폴백). 상태/피드백(`setStatus`) 메시지를 전부 키로 외부화. _(잔여: HTML 정적 라벨·마법사 단계 문구는 같은 패턴으로 추후)_

> 비고: 동작 규칙(3계층·멱등·스코프)은 유지하고 **경험 계층**만 개선했다.

## 유료화 / 상용 전환

오픈 코어 + **프리미엄(Freemium)** 모델. **Free / Paid 2단계**, **연 구독**, **외부 결제(LemonSqueezy)** + **무료 서버리스 검증(Cloudflare Workers)** 으로 한다. (결정 배경·대안 비교는 `ROADMAP.md`)

### Free / Paid 경계 (기능 기반 게이팅 — 회당 횟수 제한 없음)
경계선은 **기존 자산을 다루는 일 / 새 자산을 만드는 일**이다. 파일에 이미 있는 변수·레이어를 읽고 고치는 작업은 Free, 디자인 시스템을 새로 **생성**하는 작업은 Paid.

| 기능 | Free (무제한) | Paid |
|---|:---:|:---:|
| 토큰 추출 · 바인딩(기존 변수) · 레이어 리네임 | ✅ | ✅ |
| 변수 편집(값·이름·스코프 수정/삭제) · 닮은 프레임 **스캔** | ✅ | ✅ |
| 명도 대비 점검 · 코드 내보내기(W3C JSON / CSS) | ✅ | ✅ |
| **색상 팔레트 생성 · 적용** | — | ✅ |
| **토큰(3계층 변수) 생성** | — | ✅ |
| **시맨틱 매핑** | — | ✅ |
| **컴포넌트 등록 · 베리언트(Phase 3/4/4.1)** | — | ✅ |
| **닮은 프레임 컴포넌트화** | — | ✅ |
| **텍스트 스타일 등록 · 적용** | — | ✅ |
| **다크 테마 생성** | — | ✅ |
| **공유 프리셋** | — | ✅ |

> 의존성: Free '바인딩'은 **기존 변수**에 연결만 가능하다. 빈 파일에서 새 변수 시스템을 만들려면 '토큰 생성'(Paid)이 필요 — 자연스러운 업셀 지점.
>
> **미리보기도 함께 잠근다.** '적용'이 Paid인 카드에서 미리보기만 열어두면 눌러도 적용 버튼이 회색이라, 이유를 알 수 없는 막다른 길이 된다. 그래서 팔레트 생성·토큰 생성 미리보기는 Free에서 비활성이다. 반대로 **닮은 프레임 '스캔'은 Free** — 읽기 전용이고 그 자체로 결과(중복 프레임 목록)가 완결되기 때문.

### 가격
- **Paid — 연 $39**(≈ $3.25/월). LemonSqueezy 수수료 5%+$0.50 → 실수령 ~$36.5/건(~94%). (월 옵션·런치 프로모는 추후)

### 결제 · 계정 관리 (LemonSqueezy 위임 — 커스텀 계정 0)
- **결제**: LemonSqueezy(MoR=Merchant of Record). 전 세계 VAT/세금·인보이스·환불을 대행 → **별도 계정/DB/로그인 미도입**.
- **고객 셀프서비스**: LS Customer Portal(매직링크) — 구독 취소/재개·결제수단·인보이스·키 조회. 플러그인은 "구독하기"/"구독 관리" 링크만 노출.
- **기기 관리**: LS 라이선스 **activation limit=1**(1대) + instances(activate/validate/deactivate). 기기 교체 시 기존 instance 해제 후 활성화(친절 안내).
- **식별**: 로그인 없는 **키 기반**. 키는 `figma.clientStorage`(기기별) 보관.

### 검증 아키텍처 (방식 C — 무료 서버리스)
- **Cloudflare Worker**(`workers/verify`, 무료 티어): `POST /verify { key, instanceName? }` → LemonSqueezy `activate`/`validate` → 활성/만료 확인 → **ES256 서명 JWT(`{ token }`)** 반환. 개인키·LS 설정은 Worker secret, **공개키만 플러그인 임베드**. 고정비 ~$0.
- **플러그인**: 검증(`fetch` + 서명 검증 `crypto.subtle`)은 **UI 아이프레임**에서 수행(`verifyAndReport`)하고 결과(`LICENSE_VERIFIED`)만 `code.ts`로 보고. `code.ts`는 **캐시·grace·게이팅**만 담당.
- **캐시·오프라인**: `LicenseCache = { key, tier, expiresAt, lastVerified }`를 `clientStorage`에 보관. `evaluateLicense`는 만료 전이면 적용, 오프라인이면 **grace(14일)** 유지, grace 초과 시 free 강등. 시작 시 stale 캐시는 `REQUEST_VERIFY`로 재검증.
- **위변조 방지**: `verifyLicenseToken`이 **서명 + 클레임(exp·iss·aud·tier)** 검사, `alg=none` 거부. `{ valid,tier,expiresAt }` 평문 응답은 개발/하위호환 경로.
- **자리표시**: `licenseConfig.ts`의 `VERIFY_URL`·`LICENSE_PUBLIC_JWK`·`PURCHASE_URL`·`PORTAL_URL`, `manifest.json allowedDomains` → 배포 시 실제 값으로 교체. 키쌍 생성: `node scripts/gen-license-keys.mjs`. Worker 셋업: `workers/verify/README.md`.

### 엔타이틀먼트 모델
- `src/lib/entitlements.ts`(순수, 테스트됨): `Tier = 'free' | 'paid'`, `hasEntitlement(tier, feature)` — 모든 유료 기능(`tokens`·`semantics`·`components`·`textStyles`·`presets`)은 Paid에서 해금. **사용량 횟수 한도 없음**(기능 게이팅으로 대체).
- `code.ts`: `requirePaid(feature, message)` 단일 게이트 — 토큰 생성·시맨틱·컴포넌트·텍스트 스타일·프리셋, 그리고 기존 기능에 얹힌 둘: **다크 테마 생성**(`dark/` Global을 새로 만드니 `tokens`), **닮은 프레임 컴포넌트화**(`components`). 추출·바인딩·리네임·내보내기·대비 점검·변수 편집·닮은 프레임 스캔은 무게이팅.
- **두 층으로 막는다.** code의 `requirePaid`가 최종 방어선이고, UI(`ui.ts`)는 그 전에 유료 버튼을 **클릭 전 사전 비활성**(`PAID_FIELDS` + 🔒 배지)한다. 그래서 code에 게이트가 없어도 UI에서 잠기는 항목이 있다 — 팔레트 '생성'(`btnPalette`)이 그 예로, postMessage 없이 UI에서만 도는데도 그 카드의 미리보기 역할이라 함께 잠근다.
- 거부 안내는 `PREMIUM_STATUS_ID`로 **해당 기능의 카드**에 띄운다(클릭-후-거부 방지).
- 메시지(`src/shared/messages.ts`): `CodeToUi.LICENSE_STATUS { tier, unlimited, source, … }` · `PREMIUM_REQUIRED { feature, message }`.

### 관리자 / 개발·테스트 전권 + 백도어 차단
- **개발 빌드 전용 티어 토글**: `__DEV__`(esbuild define, `npm run watch`/`node build.mjs --dev`에서 true) 일 때만 `SET_LICENSE` 개발용 강제 티어(`paid`)가 동작 → 결제 없이 전권 테스트.
- **배포 빌드**(`npm run build`)에선 `__DEV__=false` → `SET_LICENSE` 핸들러와 UI 토글이 **컴파일 단계에서 비활성**(페이월 우회 백도어 차단).
- **실제 검증 경로 테스트**: LemonSqueezy **test mode** + sandbox 키로 Worker `/verify`. (선택) Worker `ADMIN_KEYS` 오너 allowlist 키 → 장기 paid 토큰(스모크 테스트용).

### 가격
- **Paid** — 단일 유료 티어, **연 $39 확정**(위 ‘가격’ 절 참고). 결제·환불·세금은 **LemonSqueezy(MoR)** 위임. 월 옵션·런치 프로모는 추후.

### 단계별 출시
- **M0**: 전 기능 무료.
- **M1 ✅ (구현됨)**: 엔타이틀먼트(`entitlements.ts`, Free/Paid) + `requirePaid` 단일 게이트 + UI 개발용 티어 토글. **사용량 횟수 한도 없음**(기능 게이팅으로 대체). 결제 없음.
- **M2 ✅ (구현됨, 서버 미배포)**: 라이선스 키 입력·검증(`license.ts` + UI fetch) + `clientStorage` 캐시·오프라인 grace. `VERIFY_URL`·`allowedDomains`는 자리표시 → 실제 검증 서버/결제 제공자 연동 시 교체.
- **M2.1 ✅ (구현됨)**: 서명 토큰(JWT) 검증 코어(`licenseToken.ts`) — 서명+클레임 검사, `alg=none` 거부.
- **M2.2 ✅ (구현됨)**: 네트워크+서명 검증을 **UI 아이프레임**으로 이동(`verifyAndReport`→`LICENSE_VERIFIED`), `code`는 캐시/grace/게이팅만. 시작 시 stale 캐시는 `REQUEST_VERIFY`로 재검증(보관된 `instanceId`로 같은 기기 validate). 키 해제 시 `REQUEST_DEACTIVATE`로 LemonSqueezy 활성화 슬롯 반납(best-effort).
- **M3 ✅ (구현됨: 공유 프리셋)**: Paid 게이팅으로 **공유 프리셋**(`presets.ts`) — base·허용오차·맥락단계·시맨틱 매핑을 저장/불러오기 + JSON 내보내기/가져오기(`clientStorage` 보관). 비-Paid는 `PREMIUM_REQUIRED`.
- **M3.1 ~~변경 이력~~ — v2에서 제거(PR #37)**: 불투명한 집계성 이력은 v2 재설계에서 비목표로 결정해 `history.ts`·이력 카드·메시지·기록 호출부를 전면 삭제했다. (선택형 미리보기 트리가 "무엇이 바뀌는지"를 더 투명하게 대체.)
- **M3.2**(다음): 서버 기반 시트(seat) 관리 · 가격/프로모션 확정 · 팀 동기화(클라우드 공유).

### 프라이버시 · 법무
- 토큰·디자인 데이터 **로컬 처리** 유지, 외부 전송은 **라이선스 검증 요청(키 + instanceName)** 에 한정 — 디자인 데이터 미전송.
- 환불·약관·개인정보 처리방침·세금(VAT)은 **LemonSqueezy(MoR)** 에 위임.

### 리스크 · 미정
- 연 가격 금액·월 옵션 여부 확정. Figma 발행 정책(외부 결제/키 방식 — 현재 허용, 광고·저품질 금지) 재확인.
- 기기 교체(1대 한도) 셀프 해제 UX — LS 포털 가능 여부 확인, 불가 시 지원/Worker "이 기기로 이동" 추후.
