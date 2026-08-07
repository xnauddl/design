# 통합 재설계 설계문서 (v2)

> 상태: **논의용 초안**. 구현 전 합의를 위한 문서. 결정되면 ROADMAP/README에 반영.
> 범위: 사용자가 제시한 9개 요구사항. 결론 먼저 — **엔진(`lib/` 순수 함수)은 거의 그대로**,
> 바뀌는 건 **UI/IA 셸 + 결과 표면화 + 일부 기능 정리**. (#2 명도 대비는 **삭제**.)

---

## 0. 배경 / 동기

현재 플러그인은 핵심 엔진(3계층 변수, 팔레트, 시맨틱 매핑, 텍스트 스타일, 바인딩, 리네임,
대비 점검)이 동작하나, 다음 불만이 누적됨:

- **불투명함**: 바인딩·리네임·컴포넌트 등록이 "무엇이 어떻게 적용됐는지" 안 보임 (집계 수치만)
- **단절**: 대비 점검은 결과만 주고 "그 후" 액션이 없음
- **구조**: 마법사가 만들기 탭에 묻혀 있고, 추출/팔레트의 색 역할이 모호, 불필요 기능(이력) 잔존

목표: **모든 쓰기 작업을 "미리보기→선택→적용"으로 투명하게**, 색 흐름을 **추출↔팔레트 일원화**,
화면 구조를 **마법사 중심으로 재편**.

---

## 1. 현재 구조 (검증된 사실)

### 아키텍처
- `src/code.ts` — Figma 샌드박스 메인 스레드. 메시지 라우터 + Figma API 호출.
- `src/ui.ts` + `src/ui.html` — UI 스레드(iframe). 카드 UI + 시퀀서.
- `src/lib/*.ts` — **순수 로직**(figma 의존 없음), `node --test`로 검증.
- `src/shared/messages.ts` — UI↔code 메시지 타입.
- 빌드 `build.mjs` → `dist/`.

### 탭 / IA (3탭)
| 탭 id | 라벨 | 카드 | 마크업 |
|---|---|---|---|
| `tokens` | 만들기 | 마법사·팔레트 생성·추출·토큰 생성·시맨틱 매핑·텍스트 스타일 | ui.html 127–244 |
| `apply` | 적용 | 바인딩·리네임·명도 대비·컴포넌트/베리언트 | ui.html 246–317 |
| `settings` | 관리 | 내보내기·요금제·설정 (프리셋·이력 → 제거 대상) | ui.html 319–418 |
- 탭 전환: `TABS`(ui.ts:1113) + `showTab()`(ui.ts:1114–1125), sticky 탭바(ui.html:67).
- 마법사 카드: `#wizardCard`(ui.html 129–145), 시퀀서(ui.ts 298–495), `WIZARD_STEPS`(wizard.ts 28–36).

### 게이팅 (현재 3티어 — 주의)
- 코드는 아직 `free | pro | team`(entitlements.ts:7). ROADMAP은 Free/Paid 2티어로 전환 예정(PR #30).
- `requirePro()`(code.ts 121–125)·`requireTeam()`(code.ts 92–96), UI는 `PRO_FIELDS`/`TEAM_FIELDS`(ui.ts 561–576) + 🔒 배지.

### 적용 계열 데이터 (미리보기에 바로/추가로 필요한 것)
| 기능 | 현재 반환 | 미리보기 준비도 | 부족분 |
|---|---|---|---|
| 바인딩 `bindSelection()` (bind.ts 80–104) | `BindResult{bound,skipped,flags,reasons,...}` (bind.ts 20–30). **dry-run(`apply=false`) 이미 있음** | 집계만 (40%) | **노드별 매칭 후보 리스트 없음** → `BindCandidate[]` 신설 필요 |
| 리네임 `renameSelection()` (rename.ts 41–48) | `RenameOutcome{changes:RenameChange[], applied}` — **노드별 id/before/after 이미 있음** | 높음 (80%) | 항목별 `checked` 선택 상태만 |
| 컴포넌트 `REGISTER_COMPONENTS` (code.ts 489) | 최상위 `selection()`의 FRAME/GROUP **1:1 변환** | 없음 | 선택 디자인 **하위 순회 + 후보 picker** |
| 대비 `checkContrast()` (contrast.ts 72) | `ContrastReport{...,findings:ContrastFinding[]}` — `{id,name,fg,bg,ratio,required,large,pass}` (contrast.ts 22–31) | 읽기 전용 | **보정 제안 없음** → `suggestedFg/Bg` 추가 |

### 색 흐름 (추출 vs 팔레트)
- 추출: `extractFromSelection()`(extract.ts 193) → 색은 `nameColorsByScale()`(extract.ts 181–189) → `classifyColorScale(hex)`(palette.ts 237)로 **hue family**(`color/blue/500`).
- 팔레트: `generatePalette({brand:{primary,secondary?},harmony?,...})`(palette.ts 125, 단일 시드색) → `paletteToDraftTokens()`(palette.ts 186) → **역할 family**(`color/primary/500`).
- **형식은 동일**(`color/{family}/{step}`, b87f538에서 통일), family 어휘만 다름. `createTokens`는 **이름으로 upsert** → 이름 같으면 **같은 변수로 병합**.

---

## 2. 관통하는 두 패턴 (재사용 핵심)

### 패턴 A — "미리보기 → 선택 → 적용" 공통 컴포넌트 (레이어 트리, #13)
#1·#6·#7이 동일 인터랙션: `대상 스캔 → 후보를 **Figma 레이어 트리 형태**로 표시(체크박스) → 골라서 → 적용`.
- **공통 트리 컴포넌트** 1개(`renderSelectableTree(nodes)`)를 만들어 셋이 재사용. Figma 레이어 패널처럼 **들여쓰기·계층**으로 보여줌(#13).
- 후보 데이터에 **계층 정보**(`parentId`/`depth`) 포함 → 트리 렌더 + 부모-자식 체크 전파.
- 기존 자산 재활용: `renderDiff()`(ui.ts 983–998)를 트리형으로 확장, dry-run(bind `apply=false`), CSS Grid 행 패턴.
- 적용은 **선택된 항목만**: `nodes.filter(n => n.checked)`.

### 패턴 B — 추출↔팔레트 색 일원화 (패턴 C의 색 적용 사례)
색은 **Global=hue**(`color/blue/500`), **역할은 Semantic**(`primary→color/blue/500`). 추출·팔레트 모두 hue-Global이라 이름이 같아지면 **자동 병합**. #3의 메커니즘.

### 패턴 C — 전 토큰 공통 원칙: Global=primitive, Semantic=role ⭐
**모든 토큰 카테고리에 동일 적용** (사용자 확정). Global은 원시값으로, 역할은 Semantic 별칭으로만.

| 카테고리 | Global (primitive) | Semantic (role) | 현재 |
|---|---|---|---|
| color | `color/blue/500` (hue) | `primary →` | 🔧 #3로 정렬 |
| font-size | `font-size/16` (값) | `font-size/body` | ✅ |
| line-height | `line-height/24` | `line-height/body` | ✅ |
| spacing/gap | `spacing/16` (값) | `spacing/sm·md·lg` | ◑ Global✅·Semantic 추천(PR#31) |
| radius | `radius/4` | `radius/sm·md` | ◑ 동일 |
| size | `size/16` | (역할 추천 보강 여지) | ◑ |

- 근거: `numberTokenName`(tokens.ts 251)이 값으로 Global 생성, 역할 별칭은 `createSemanticAliases`(variables.ts 202)로 Semantic. **숫자 토큰은 이미 준수**, 색만 예외였음.
- **귀결**: #3(편집표)·#10(역할 추천)은 색 전용이 아니라 **전 카테고리 공통 기계**. 색=hue→역할, 숫자=값→티셔츠/타입 스케일. 같은 매핑 UI·로직 하나로.

---

## 3. 항목별 설계

### #1 컴포넌트 등록 — 디자인 안에서 골라 등록 (패턴 A)
- **현재**: `REGISTER_COMPONENTS`(code.ts 489)가 최상위 선택의 FRAME/GROUP만 1:1 변환.
- **목표**: 프레임 하나 선택 → **그 하위 노드**를 스캔해 후보 리스트 제시 → 체크한 것만 컴포넌트화.
- **설계**: 신규 메시지 `SCAN_COMPONENT_CANDIDATES`(하위 순회, FRAME/GROUP/적격 노드 수집 → `{id,name,type,depth}[]`) → UI 선택 리스트(패턴 A) → `REGISTER_COMPONENTS`에 `nodeIds: string[]` 받아 해당 노드만 변환.
- **영향/난이도**: 핸들러 교체 + 하위 순회 + picker UI. **중**. 코어 영향 낮음.


### #2 명도 대비 — **삭제 (결정 2026-08-05)**
- **결정**: 기능 제거. 점검만 있고 후속이 약해 적용 탭·마법사를 복잡하게 만듦.
- **범위**: UI 카드 · 마법사 ‘접근성 검수’ 옵션 · 진행/파이프라인 표기 · 관련 카피. (이전 ‘보정 제안’ 확장안은 폐기.)
- **코드 제거**: `contrast.ts` / `CHECK_CONTRAST` / 마법사 대비 단계 등은 별도 PR(와이어프레임·IA 합의 후).
- **와이어프레임**: [`docs/wireframe-plugin-ia.html`](docs/wireframe-plugin-ia.html)에서 이미 제외.

### #3 색 계층 정렬 — Global=hue, Semantic=role (패턴 B) — #10과 통합
- **결정 배경**: **Global=원시 정체성(hue)**, **Semantic=역할**. 현재 팔레트는 Global을 역할명(`color/primary/500`)으로 만들어 원칙 위반 + 역할명이 Global·Semantic 양쪽 중복 + 추출(hue)과 불일치. → **이게 추출/팔레트가 안 합쳐지는 진짜 원인**.
- **목표**: 추출·팔레트 **모두 Global=`color/{hue}/{step}`**, 역할은 **Semantic 별칭으로만**(`primary→color/{hue}/500`).
- **설계**:
  1. **팔레트**: `generatePalette`가 각 스케일에 `role`(primary/secondary/neutral/status) + `hue`(brand색 `classifyColorScale`) **둘 다** 보유. `paletteToDraftTokens`/`colorScaleName`은 Global 이름을 **hue**로 생성. role→hue Semantic 맵을 별도 산출.
  2. **추출**: 현행 hue-Global 유지(이미 맞음, extract.ts 181–189). 색 편집표에서 hue family 확정/수정.
  3. **역할 = Semantic 추천(#10)**: 무채색→`neutral`, 지배채도색→`primary` 등은 **Global 리네임이 아니라 Semantic 매핑 추천**. 사용자가 표에서 확정/수정.
  4. **동일 hue 충돌**(예: primary·info 둘 다 blue → 둘 다 `color/blue`): 결정적 접미사 인덱스(`color/blue`, `color/blue-2`; OKLCH 각·명도 순). 역할 의미는 Semantic이 담으므로 인덱스는 내부 구분용.
  5. 변경 지점: `generatePalette`·`paletteToDraftTokens`·`colorScaleName`·`suggestSemanticMap`(palette.ts), `prunePaletteColors`(variables.ts 186, 키를 hue 기준으로), `classifyColorScale` 재사용. UI 추출/팔레트 카드 + 색 편집표.
- **영향/난이도**: 팔레트 Global 네이밍 + ColorScale 구조 + suggest/prune. **중상**(코어 색 네이밍 건드림). 순수함수라 `node --test`.
- **⚠️ 하위호환**: 기존 역할-Global(`color/primary/500`)과 신규 hue-Global(`color/blue/500`) 불일치. **✅ 결정: 신규만**(미게시라 외부 파일 없음 → 마이그레이션 불필요; 게시 직전 필요시 일회성 헬퍼 추가).
- **✅ 결정(family 어휘)**: hue-Global 통일. Global=hue(자동분류, 편집표에서 수정 가능), 역할은 전부 Semantic 추천. 동일 hue는 접미사 인덱스.
- **연관**: #10(역할=Semantic 추천), #5(색 탭).

### #10 시맨틱 매핑을 색 소스에서 분리 (추출에서도 매핑 가능)
- **현재(문제)**: `suggestSemanticMap(PaletteResult)`(palette.ts 162)가 **팔레트 생성 직후에만** 호출(ui.ts 113). 추출엔 `PaletteResult`가 없어 추천 미발생. 게다가 추천은 역할 family 기준이라 추출의 hue family(`blue`)와 매칭 0건 → **추출 후 시맨틱 매핑 불가**.
- **목표**: 색 소스(생성/추출/기존 문서)와 무관하게 시맨틱 매핑·추천 가능.
- **설계**:
  1. **추출 색 역할 승격**(#3 패턴 B)으로 `color/{역할}/{step}` 확보 → `suggestSemanticMap` 작동.
  2. **추천 입력 일반화**: `suggestSemanticMap`을 `PaletteResult` 의존에서 **색 토큰/Global 변수 목록** 입력으로 리팩(존재 family 기준 동일 로직). 추출·생성·기존 변수 모두에서 호출 가능하게.
  3. 시맨틱 매핑 카드를 팔레트 카드 종속이 아닌 **독립 단계**로(이미 UI는 별도 카드 2.5; 추천 트리거만 일반화).
  4. **전 카테고리 일반화(패턴 C)**: 색뿐 아니라 spacing/radius/size/font-size 등도 동일한 "값/hue Global → 역할 Semantic" 매핑·편집표 기계 공유. 숫자 역할 추천은 티셔츠/타입 스케일(sm·md·lg / body·h1), PR#31 로직 재사용·확장.
  5. **카테고리별 역할 어휘 — 전체 12개**(`TokenCategory` tokens.ts:45 기준. 어휘는 지금 확정, 코드는 구현 시):
     | category | Global(값) | Semantic 역할 | 처리 |
     |---|---|---|---|
     | color | `color/{hue}/{step}` | surface·surface/muted·text·text/muted·text/inverse·border·primary(/strong·/subtle)·secondary·accent-N·success·warning·error·info | 핵심 #3 |
     | opacity | `opacity/40` | disabled·hover·overlay | 약함(선택) |
     | gap | `spacing/16` | xs·sm·md·lg·xl·2xl | ✅ PR#31 |
     | size | `size/16` | icon/sm·md·lg | ✅ 최소 부여 |
     | radius | `radius/4` | none·sm·md·lg·full | 보강 |
     | fontSize | `font-size/16` | display·h1·h2·h3·title·body·caption·overline | ✅ |
     | lineHeight | `line-height/24` | (fontSize 역할 연동) | ✅ |
     | letterSpacing | `letter-spacing/0-5` | tight·normal·wide | 약함(선택) |
     | fontFamily | `font-family/{name}` | sans·serif·mono / heading·body | 보강 |
     | fontWeight | `font-weight/600` | regular·medium·semibold·bold | 보강 |
     | effectColor | `shadow/color/…` | (대개 원시 유지) | 보류 |
     | effectFloat | `shadow/blur·spread·x·y` | elevation/sm·md·lg (복합) | ✅ 후순위 보류 |
     - **보강 대상**: radius·fontWeight·fontFamily(명확 어휘). **약함/선택**: opacity·letterSpacing·size. **후순위**: effects(복합값 → elevation 묶음 별도 설계).
- **진행 시점**: 역할 어휘는 **지금 확정**, 코드는 **구현 우선순위 5**에서 색 완성 후 확장(패턴 C: 색 우선).
- **영향/난이도**: `suggestSemanticMap` 일반화 + 카테고리 확장 + 호출부. **중**. #3와 함께 진행.
- **✅ 결정(범위)**: 일반화 + **기존 Global 스캔**. 순수함수는 변수 이름 목록 입력으로, code.ts가 추출/생성 토큰 + 기존 문서 Global을 모두 공급. 추출·재방문 모두 매핑 가능, #11과 시너지.
- **연관**: #3(색 적용), 패턴 C(전 토큰), #11(가드), 시맨틱 매핑 단계.

### #11 의존성 인지형 배치 (전제 미충족 단계 가드)
- **현재(문제)**: 시맨틱 매핑은 **Global 존재가 하드 전제**(`createSemanticAliases`가 Global 없으면 전부 missing, variables.ts 206–209). 바인딩도 변수 없으면 매칭 0. 그런데 UI는 **숫자 + muted 텍스트**(ui.html 216)만 있고 상태 게이팅/순서 강제/바로가기가 없어, 전제 미충족 시 **조용히 0건**.
- **의존성 그래프**: `추출/팔레트 → 토큰 생성 → 시맨틱 매핑(Global) → 바인딩(변수)` / 리네임·대비·컴포넌트는 독립.
- **목표**: 전제 미충족 단계를 **배치·상태로 가드**하고 다음 행동을 안내.
- **설계(택1, 열린 질문)**:
  - (a) **상태 기반 비활성화**: Global 없으면 시맨틱/바인딩 카드 비활성 + "토큰 먼저 생성" 안내·바로가기. 충족 시 자동 활성. (권장, 경량)
  - (b) **순서형 스텝**: 만들기 흐름을 단계로 묶어 이전 완료 전 다음 잠금.
  - (c) **마법사 주 경로화**(#4): 의존성은 `planWizard`(wizard.ts 67–76)가 이미 시퀀싱; 독립 카드는 (a)로 보조.
- **재사용**: 게이팅 인프라(`updateTeamGate` 패턴, ui.ts 568–583)를 "전제 게이팅"으로 확장 — disabled + 안내 텍스트 동일 메커니즘.
- **영향/난이도**: UI 상태 로직(현재 변수/Global 존재 여부를 UI가 알아야 함 → code.ts가 상태 post 또는 작업 후 갱신). **중**. 코어 영향 없음.
- **✅ 결정**: (a) **상태 기반 비활성화 + 바로가기**. Global 없으면 시맨틱/바인딩 카드 비활성 + "토큰 먼저 생성" 안내·바로가기, 충족 시 자동 활성. #12와 **통합 게이트**로 구현. 마법사 주경로(c)는 #4에서 보조.
- **연관**: #4, #5, #10, #12(통합 게이트).

### #12 유료화 표시(🔒 배지) 일관화
- **현재(문제)**: 🔒 메커니즘은 존재(`updateTeamGate` → `presetLock`/`historyLock`, ui.ts 571–577)하나 **부분 적용**. 텍스트 스타일은 plain `(Pro)` 텍스트(ui.html 226), 시맨틱 매핑·토큰 생성 등 Paid 기능엔 배지 없음. ROADMAP도 "🔒 배지 (부분)"으로 미완 표기.
- **목표**: 모든 유료 기능에 **일관된 🔒 배지** + 잠금 상태. 2티어(Free/Paid, PR #30)와 정합.
- **설계**:
  - `updateTeamGate`를 **통합 게이트 함수**(`updateGates`)로 일반화: 카드별 `{ id, requires: 'paid' | 'prereq', label }` 테이블로 (유료 잠금) + (#11 전제 미충족)을 **한 메커니즘**으로 표시(disabled + 배지/안내).
  - Paid 경계(ROADMAP §5): 토큰 생성·시맨틱 매핑·컴포넌트/베리언트·텍스트 스타일 → 🔒 배지 부여(**프리셋은 기능 제거로 배지 불필요**). 텍스트 스타일의 plain `(Pro)`도 배지로 교체.
  - `#9` 제거로 `historyLock` 항목은 삭제.
- **재사용**: 기존 `PRO_FIELDS`/`TEAM_FIELDS`(ui.ts 561–576)·`requirePro`/`requireTeam`(code.ts 92–125) 구조 유지, 표시 계층만 통합·확장.
- **영향/난이도**: UI 표시 통합. **소~중**. 코어 영향 없음. **#11과 동일 인프라로 함께 구현 권장**.
- **연관**: #11(공통 게이트 메커니즘), #9, 2티어 전환(PR #30).

### #13 미리보기를 Figma 레이어 트리로 표시 (패턴 A 핵심 형태)
- **현재**: 리네임 미리보기는 flat diff(`renderDiff`, ui.ts 983–998), 바인딩은 집계만, 컴포넌트는 미리보기 없음.
- **목표(사용자 요청)**: 미리보기를 **Figma 레이어 패널과 동일한 트리 구조**로 — 위치·계층 맥락을 보며 선택.
- **설계**: 후보/변경 데이터에 `parentId`·`depth` 포함(스캔 시 figma 노드 hierarchy에서 수집). 공통 `renderSelectableTree(nodes)` — 들여쓰기·접기/펼치기·체크박스(부모↔자식 전파). 패턴 A를 **트리형**으로.
- **적용 대상**: #1(하위 노드)·#6(바인딩 후보)·#7(리네임 변경) 공통.
- **✅ 결정(트리 범위)**: **전체 서브트리 + 영향 노드 강조**. Figma 레이어 패널 그대로, 영향 노드는 체크+강조·나머지는 회색 맥락(접기 가능). 대형 트리는 영향 노드 자동 펼침 + 나머지 접힘.
- **영향/난이도**: 후보 데이터에 계층 추가 + 트리 UI 컴포넌트. **중**. 패턴 A의 핵심 형태라 #7 파일럿부터 반영.
- **연관**: 패턴 A, #1/#6/#7.

### #16 단위 토큰 단일화 — description 메타데이터로
- **현재(문제)**: line-height/letter-spacing의 비-px 단위(%, em)는 **STRING(원본 "160%") + FLOAT(px 스냅샷 `-percent-px`)** 2~3개 변수를 만들어 패널 잡음(variables.ts 87–104·153–168).
- **✅ 결정**: **바인딩용 px FLOAT 하나만 남기고, 원본 단위값은 `Variable.description`에 저장**. 내보내기는 description을 읽어 `160%` 출력.
- **근거**: `Variable.description`은 표준 API. export 루프(code.ts 458)가 변수 순회 중이라 `v.description`만 읽으면 됨. 기존 `includeSnapshots`(code.ts 484) 구조 대체로 단순화. description이 Figma 패널에 사람이 읽을 정보로 표시(보너스).
- **변경점**: (1) `createTokens`에서 STRING 분기 제거 → px FLOAT에 `description = stringValueForUnit(value,unit)`; (2) `exporters.ts` `ExportToken`에 `description?` 추가 + line-height/letter-spacing 출력 시 우선; (3) code.ts EXPORT에 `t.description = v.description`.
- **✅ 이름 결정**: **원본 기준** — `line-height/160`(value=25.6px, description=`"160%"`), letter-spacing 동일(`letter-spacing/0-02`, description=`"0.02em"`). 이름=원본값 · value=px 프록시 · description=단위표기로 일관(이름 160 ↔ description 160% ↔ value 25.6px).
- **영향/난이도**: **소~중**. variables.ts 단순화 + exporters.ts. 순수 로직이라 `node --test`.
- **연관**: 패턴 C, 내보내기(#8).

### #4 시스템화 마법사 — 별도 탭/화면
- **현재**: `tokens` 탭 최상단 `#wizardCard`(ui.html 129–145) + 로직(ui.ts 298–495).
- **목표**: 독립 탭 `wizard`(또는 첫 화면).
- **설계**: 새 탭 추가(아래 #5), `#wizardCard`(+`#onboardCard` ui.html 147–155) 마크업 이동, 로직은 `semMap`(ui.ts 397)·`isPro`(404) 의존만 유지하면 그대로 동작. `TABS`(ui.ts 1113)에 추가.
- **영향/난이도**: UI 이동. **중**. 코어 영향 없음.

### #5 UX/탭 재편 (확장)
- **✅ 결정**: **4탭 — `시작`(마법사) · `만들기` · `적용` · `관리`**, **색은 만들기 안**.
  - `만들기`: 팔레트 생성/추출 → **색 편집표** → 토큰 생성 → 시맨틱 매핑 → 텍스트 스타일 (한 파이프라인)
  - `적용`: **단계 레일** — 바인딩 · 리네임 · 구조(컴포넌트·닮은 프레임). 한 화면·한 일. / `관리`: **플러그인 설정**(기준 크기·허용오차·리네임 깊이) · 내보내기 · 요금제(이력·프리셋·**변수 편집기 제거**). **명도 대비는 삭제(#2).**
  - **✅ 결정(설정 위치, 2026-08-05)**: `base` · `tolerance`(0.5 고정) · `maxDepth`는 **관리 탭만**. 만들기·적용 각 단계 UI에는 노출하지 않음(엔진은 관리 값을 사용). 설정 값은 `clientStorage`에 자동 유지.
  - **✅ 결정(프리셋 제거, 2026-08-05)**: 공유 프리셋(저장/적용/JSON 보내기·추가) **삭제**. 허용오차 고정·설정 항목이 적어 이름 붙은 스냅샷 가치가 약함. 시맨틱 매핑 팀 공유가 나중에 필요하면 별도 「매핑 보내기」로 재검토.
  - 변경 지점: `TABS`(ui.ts 1113)에 `시작` 추가, 탭 버튼/section(ui.html 116–118), `showTab()`은 배열 순회라 수정 불필요.
- **영향/난이도**: UI 셸. **중**. 코어 영향 없음.

### #14 판넬(플러그인 창) 크기 확대
- **현재**: `figma.showUI` + 리사이즈 핸들(`#resizeHandle`)·`clientStorage`로 크기 기억(구현됨).
- **목표**: 기본 창을 더 크게 + 리사이즈는 **세로 우선**. 가로로 키워 표 열을 버티는 패턴은 UX로 채택하지 않음(#17).
- **설계**: 기본 height 여유 · 가로 최소폭은 “한 열 리스트+요약”이 읽히는 수준. 정보 밀도는 레이아웃(카드/리스트)으로 해결.
- **영향/난이도**: **소**. 코어 영향 없음.
- **연관**: #13(트리), #3(편집표), **#17(텍스트 스타일 목록)**.

### #17 텍스트 스타일 목록 UX — 좁은 폭·캔버스 연동 (미구현 · 합의 대기)
> 2026-08-05 논의. **구현 전 문서만.** 참고: [Design Lint](https://www.figma.com/community/plugin/801195587640428208/design-lint)
> **확인용 와이어프레임**: [`docs/wireframe-plugin-ia.html`](docs/wireframe-plugin-ia.html) — **제안 UX(기본)** vs 현재 토글. 만들기=단계 레일 · **적용=단계 레일(바인딩·리네임·구조)** · **색 단계에서 추출색 변수화** · 텍스트 스타일=리스트+×N · hint 축약 · 온보딩 흡수 · 명도 대비 제외. (브라우저에서 열기)

- **현재 문제**
  - `#tsTable`이 이름·폰트·크기·행간·자간·굵기를 **고정 열 표**로 나열 → ~360px에서 열 폭 싸움(행간을 늘리면 폰트 열이 사라짐 — ui.html 주석).
  - 패널을 **가로로 키워도** “같은 타이포가 어디에 몇 개인지”는 안 보임. 리사이즈가 정보 설계의 대체재가 됨.
  - 스캔 값은 잠금·**이름만 편집**인데 UI는 편집용 스프레드시트처럼 보임 → 역할 불일치.
  - 군집(`StyleCluster`)에 `count`·대표 `sample`만 있고 **노드 id 목록은 버림** → UI에서 레이어 선택 불가.
- **목표 (Design Lint 패턴)**
  - 한 행 = 한 시그니처 후보. 좁은 폭에서도 읽힘.
  - **1개** → 해당 레이어 선택 + `scrollAndZoomIntoView`.
  - **여러 개** → 같은 시그니처 전체 선택(기존 `SELECT_NODES`, 상한 200 재사용).
- **제안 UI**
  - 주: 이름(편집) + 한 줄 요약 `Inter · 16 / 150% / -2% · Regular`
  - 보조: `×N` 배지 클릭 → 위 선택 규칙
  - **값 입력은 수동·폴백 행만**(결정 2026-08-07): 스캔 행은 캔버스에서 읽은 사실이라 이름만 편집한다. 하지만 「행 추가」로 만든 행과 텍스트를 못 찾아 채운 기본 램프는 근거로 삼을 글자가 없는데도 값이 못 박혀 있었다 — `boundStyleId`도 `count`도 없는 행에만 요약 대신 같은 순서의 입력 줄(`폰트 · 크기 / 행간 / 자간 · 굵기`)을 연다.
  - 선택: 펼침/호버로 레이어 이름 목록(선택적)
  - 가로 확장은 필수가 아님. 필요할 때 **세로**로 목록 확장.
- **데이터**
  - `clusterTextStyles` / 스펙에 `nodeIds: string[]`(± count) 유지 → `TEXT_STYLE_CANDIDATES`로 UI 전달.
- **영향/난이도**: UI + 군집 필드. **소~중**. 등록/스캔 코어 단위 로직은 유지.
- **열린 선택**: 배지형(Compact) vs 펼침 리스트형 — 구현 전 결정.
- **연관**: #14(리사이즈를 정보 설계로 쓰지 않기), #15(긴 hint 축약), 패턴 A의 `SELECT_NODES` 재사용.

### #18 UI 컴포넌트 가이드 — 미리보기·스캔 목록 (부재 → 파편화)
> 2026-08-05. **색 토큰은 있으나 목록/행 컴포넌트 스펙이 없음.** 미리보기·스캔 결과가 “망가진” 체감의 주원인.

- **있는 것**
  - `:root` 색·반경·타이포 토큰 (`ui.html` 디자인 시스템 v2).
  - 스크롤 기계장치: `.list-region` + `layoutList` / `LIST_REGIONS` (행 높이 스냅·framed·모두 펼치기). **버그 패치용 인프라**이지 비주얼 가이드가 아님.
- **없는 것 (가이드)**
  - 행 밀도(패딩·최소 높이)·체크/메타/액션 열 폭 규칙.
  - 미리보기 트리 vs 토큰 리스트 vs 표 vs 리포트의 **역할별 템플릿**.
  - 빈 상태 / 로딩 / 잘림(개수 줄)의 통일 카피·시각.
  - 모노스페이스 강제 범위(`#diff, #bindTree` 등) vs UI 산세리프 구분.
- **증상 (스캔·미리보기 후)**
  | 목록 | 행 클래스 | 문제 |
  |---|---|---|
  | 토큰 생성 | `.tk` | 칩 88px 고정·이름 flex — 비교적 정돈 |
  | 색 정리 | `.crow` | 그리드 3열, 토큰 목록과 리듬 다름 |
  | 바인딩/리네임/컴포넌트 | `.tree-row` | mono + 다른 `--list-cap`(30vh) → 같은 탭에서 높이·톤 불일치 |
  | 텍스트 스타일 | `table tr` | list-region과 표가 충돌(헤더 sticky 예외·열 잘림) |
  | 대비/닮은/변수/베리언트 | `.cfind` `.simrow` `.vrow` `.vr-row` | 또 다른 행 문법 |
- **목표**
  1. **결과 리스트 = 흐름 레이아웃**: `max-height`/`list-region` 전용 스크롤 박스 없이 패널 body가 스크롤. CTA(미리보기·적용)는 **상단 툴바**.
  2. **결과 행 = 얇은 카드** (`r-card`): 체크/제목/요약/메타. 트리도 **그룹 헤더 + 자식 카드**.
  3. Row 역할: `RowCheck`(토큰/색) · `RowTree`(미리보기) · `RowSummary`(×N, #17). 표 폐기.
  4. 밀도: 연한 테두리·짧은 패딩(큰 그림자 카드 금지).
  5. 와이어프레임: [`docs/wireframe-plugin-ia.html`](docs/wireframe-plugin-ia.html) 제안 UX에 반영됨.
- **영향/난이도**: UI만. **중**. 엔진 무관. #17·#15·패턴 A와 같이 가면 한 번에 정리 가능.
- **연관**: #17(텍스트 스타일 리스트), #13/#6/#7(트리 미리보기), #14(리사이즈로 가리지 않기).

### #19 토큰 기준 크기 · 격자 (결정 수정 2026-08-05 · 재수정 2026-08-07)
- **기준 크기**: 기본 **16px**, **고정 아님** — **관리 탭**에서만 변경. 토큰/만들기 단계에는 노출하지 않음.
- **격자**: 여백·크기 기본 **8px**, **고정 아님**(2026-08-07 수정) — **관리 탭**에서만 변경. `사다리` / `정리` 입력은 여전히 **비표시**이고, 미리보기·적용 시 내부에서 자동 스냅.
- **허용오차 · 리네임 깊이**: 마찬가지로 **관리 탭만**. 오차도 기본 0.5px의 **수정 가능 값**으로(2026-08-07 수정) — 격자와 한 쌍이라 격자만 열어두면 스냅한 토큰이 연결에서 빠지는 것을 사용자가 손쓸 수 없다. **프리셋 없음** — 설정 자동 저장.
- **두 값의 관계**: 격자로 옮긴 값은 원래 레이어와 최대 `격자/2`만큼 어긋난다. 오차가 그보다 좁으면 스냅은 성공하고 연결만 조용히 실패하므로, **실제로 옮긴 값이 있을 때만** 토큰 정리 요약 뒤에 그 사실을 붙인다(`create.snapTolGap`).
- **와이어프레임**: 토큰 단계에서 기준 크기 제거, 관리에「플러그인 설정」만(프리셋 카드 없음).
- **코드**: 구현 시 tidyBase=8·tidyRatio 숨김, `#base`/`#tol`/`#depth`를 관리로 이동 · `presets.ts`/프리셋 UI·메시지 **제거**(별도 PR, #9 이력 제거와 유사).

### #15 불필요한 텍스트·불릿 정리 (UI 간소화)
- **현재**: 카드마다 긴 `.muted` 설명문·불릿이 다수(예: ui.html 131·216·226…). 화면 차지·시선 분산.
- **목표**: 설명 산문·불릿 **삭제/축약**, 핵심 라벨·버튼 위주로.
- **설계**: 의존성 안내는 #11 게이트(상태 비활성+바로가기)가 대체하므로 중복 prose 제거. 도움말은 필요 시 툴팁/접기로. ui.html 전반 `.muted` 감사 후 정리.
- **영향/난이도**: **소**. 코어 영향 없음. #5 IA 재편과 함께.
- **연관**: #5, #11(안내를 게이트로 대체), #8(미니멀 기조).

### #6 바인딩 — 적용 전 선택형 미리보기 (패턴 A)
- **현재**: dry-run은 있으나 집계만(`BindResult`).
- **목표**: "노드 X의 fills → 변수 Y(거리 0.3)" 후보 리스트, 체크한 것만 적용.
- **설계**: `bind.ts`에 `BindCandidate{nodeId,nodeName,field,currentValue,matched:{variableId,variableName,tier,distance?}|null,reason,checked?}[]` 신설, dry-run 시 채워 `BindResult.candidates`로 반환. 매칭 로직 `matchColor`(bind.ts 150)·`matchFloat`(154–168, 거리 계산 있음) 재사용. `APPLY_RESULT`에 `candidates` 추가 → UI 패턴 A → 적용 시 선택 노드만.
- **영향/난이도**: bind.ts 후보 수집 + UI. **중**. 코어 로직은 확장(반환 추가).
- **✅ 결정(적용 방식)**: **미리보기 결과 직접 적용(WYSIWYG)**. dry-run 후보(`nodeId+field+variableId`) 중 체크된 것만 code.ts로 전달 → 재매칭 없이 그대로 바인딩. 신규 메시지 `APPLY_SELECTED{ items }`. 노드/변수 소실 시 graceful skip.
- **✅ 결정(허용오차 UI, 2026-08-05)**: FLOAT 매칭만 해당. UI 칩(정확/0.5/1/2) **숨김**, 엔진 기본 **0.5px 고정**. 색은 hex 정확 일치라 무관. 고급 노출은 보류.

### #7b 리네임 규칙 — 보존 대상(리네임 제외)
- **이미 구현됨**(rename.ts `decide()` 87–94): COMPONENT/COMPONENT_SET · TEXT · INSTANCE(자신) · locked · **사람이 지은 이름**(`!isDefaultName && !isTokenEchoName`) 보존. → 의미있는 루트 프레임명·인스턴스명은 이미 안전.
- **✅ 규칙 1 — 루트 프레임 항상 보존**: 선택의 **최상위(루트) 프레임은 기본명(`Frame 1`)이어도 리네임 제외**. (현재는 기본명 루트가 리네임됨 → 가드 추가)
  - 해석: "최종 프레임" = 선택의 루트 프레임.
- **✅ 규칙 2 — 인스턴스 서브트리 스킵**: INSTANCE 자신은 이미 보존. 추가로 **그 하위 노드까지 통째 스킵**(현재 `recurse` 75행이 인스턴스 children도 순회 → 무의미·에러 위험 제거).
- **설계(추가 작업)**: rename.ts에 (a) depth 0 루트 FRAME 스킵 가드, (b) `node.type==='INSTANCE'`면 children 순회 중단. 미리보기 트리(#13)에서 루트·인스턴스는 체크 비활성(맥락 고정 표시).
- **영향/난이도**: **소**. 가드 2개 + 테스트.
- **연관**: #7, #13.

### #7 리네임 — 적용 전 선택형 미리보기 (패턴 A, 파일럿)
- **현재**: `RenameChange{id,before,after}[]` 이미 있고 `renderDiff()`로 표시. 준비도 최고.
- **목표**: 각 diff 행에 체크박스, 선택분만 적용.
- **설계**: `RenameChange`에 `checked?` (또는 UI 로컬 상태), `renderDiff`→패턴 A 컴포넌트화, 적용 시 `changes.filter(c=>c.checked)`. **공통 패턴의 파일럿으로 먼저**.
- **영향/난이도**: **소**. 코어 영향 없음.

### #8 내보내기 — 미리보기 비목표 (제약)
- **✅ 결정**: 미리보기 **없음**. dry-run·패널 안 JSON/`textarea` 미리보기 영역도 두지 않음.
- **✅ 결정(버튼, 2026-08-05)**: 현행「내보내기」(textarea 채움) +「다운로드」(파일 저장) **이원화 폐기**. UX는 **「내보내기」 한 버튼** → 곧바로 `tokens.json`/`tokens.css` 다운로드(선택: 클립보드 복사). 상태 한 줄이면 충분.
- 현행 `#exportOut` · `#btnDownloadExport`는 제안 UX에서 제거 대상. (다른 항목의 "미리보기 추가" 범위에서 명시 제외)

### #8b 변수 편집기 — 제거 (결정 2026-08-05)
- **배경**: Tokens Studio처럼 Variables에 등록된 토큰을 플러그인에서 관리하고 싶어 생겼으나, 「불러오기→목록 CRUD」는 Figma Variables와 중복·관리 탭과도 안 맞음.
- **✅ 결정**: `#varEditCard` / `GET_VARIABLES`·`EDIT_VARIABLE`·사용처 UI **제거**(구현 PR 별도).
- **대체 (Tokens Studio식 니즈 → 이 플러그인)**

  | 하고 싶은 일 | 대체 |
  |---|---|
  | 이미 있는 변수를 화면에 쓰기 | **적용 · 바인딩** (값 매칭) |
  | 추출/토큰을 변수로 등록·갱신 | **만들기** upsert (이름 같으면 기존 변수 유지·갱신) |
  | 역할(primary 등) ↔ hue 연결 | **만들기 · 색/시맨틱** 역할 드롭다운·매핑 |
  | 리터럴 값·이름 미세 수정 | **Figma → Variables** 패널 (소스 오브 트루스) |
  | 어디 쓰이는지 | 바인딩 미리보기 후보 · (옵션) 사용처는 Figma/검색 |
  | 코드·타 툴과 공유 | **관리 · 내보내기** W3C JSON / CSS |
  | Tokens Studio와 병행 | Studio가 소스면 Figma Variables에 동기화 → 이 플러그인은 **바인딩·리네임·구조**만 |

- **원칙**: 플러그인은 “변수 CRUD 앱”이 아니라 **화면 → 토큰/변수 → 연결** 파이프라인. 변수 저장소 UI는 Figma에 맡김.
- **연관**: #5(관리 정리), #6(바인딩), #3/#패턴C(색·토큰), #8(내보내기), #20(프리셋 제거와 같은 중복 정리).

### #9 변경 이력 — 제거
- **삭제**: `lib/history.ts` 전체. 
- **수정**: ui.html(historyCard 397–411), ui.ts(import·`let history`·TEAM_FIELDS·renderHistory·리스너·`HISTORY` 케이스·OP_STATUS), code.ts(import·`HISTORY_KEY`·`record()` 함수와 호출부 293/324/337/345/360·GET/CLEAR_HISTORY 케이스), messages.ts(GET/CLEAR_HISTORY·HISTORY). 
- **주의**: `record()` 제거 시 각 핸들러에서 호출부도 제거(빌드 깨짐 방지). Team 게이팅은 presetCard만 잔존 → **프리셋도 제거(#20) 시 Team 전용 UI 소멸**.
- **영향/난이도**: **소**(삭제 위주), 다만 호출부 누락 주의.

### #20 공유 프리셋 — 제거 (결정 2026-08-05)
- **삭제 대상**: `lib/presets.ts`, ui.html `#presetCard`, ui.ts 프리셋 리스너·`gatherPreset`/`applyPreset`, code.ts SAVE/DELETE/GET_PRESETS·clientStorage, messages·i18n·`presetLock` Paid 게이트.
- **대체**: 관리 탭「플러그인 설정」값을 `clientStorage`에 자동 저장(이름 없는 현재 설정만).
- **영향/난이도**: **소**. #9와 같이 삭제 PR.
- **연관**: #5(관리), #19(설정 위치), #12(Paid 배지 목록에서 프리셋 제외).

---

## 4. 게이팅 영향
- ROADMAP의 Free/Paid 2티어 전환(PR #30)과 충돌 없음. 신규 기능 티어 귀속:
  - 선택형 미리보기(#1/#6/#7): 미리보기는 Free, 적용은 기존 티어 따름.
  - 대비 보정(#2): 점검 Free, 보정 적용은 Paid 후보(논의).
  - 이력 제거(#9): Team 전용 기능 축소 → 2티어 전환과 정합.

---

## 5. 우선순위 / 단계 (상위부터 점진)

1. **공통 선택형 미리보기 트리 패턴** — #13(레이어 트리) 포함, #7(파일럿)→#6→#1
2. **기능 정리** — #9 이력 제거, **#20 프리셋 제거**, #8 내보내기 단일 버튼·미리보기 없음
3. **통합 게이트** — #11(전제 미충족) + #12(유료 🔒) 공통 메커니즘 — IA 재편 전 안전망
4. **IA 재편** — #4 마법사 탭 → #5 4탭 → #14 창 확대 → #15 텍스트·불릿 정리
5. **색 일원화 + 매핑 분리** — #3 + #10 (함께, 색 우선)
6. ~~**신규 로직** — #2 대비 보정~~ → **삭제 결정으로 취소**

각 단계는 독립 PR. 순수 로직은 `node --test`, figma 부분은 수동 검증.

---

## 6. 열린 질문 (결정 필요)

1. ✅ **#3 family 어휘** — **결정: 편집표 + 자동추천 기본값(하이브리드).**
2. ✅ **#2 명도 대비** — **결정: 기능 삭제**(보정 확장 안 함).
3. ✅ **#5 탭 구성** — **결정: 4탭(시작·만들기·적용·관리), 색은 만들기 안.**
9. ✅ **#13 트리 범위** — **결정: 전체 서브트리 + 영향 노드 강조.**
10. ✅ **size 역할 처리** — **결정: icon/sm·md·lg 최소 부여.**
11. ✅ **effects(elevation) 설계** — **결정: 후순위 보류**(복합값 묶음 설계는 나중에).
12. ✅ **#7b-1 루트 프레임** — **결정: 기본명이어도 항상 보존.**
13. ✅ **#7b-2 인스턴스** — **결정: 하위 서브트리까지 스킵.**
4. ✅ **#6 적용 방식** — **결정: 미리보기 결과 직접 적용(WYSIWYG)**, `APPLY_SELECTED`.
5. ✅ **#11 의존성 UX** — **결정: (a) 상태 비활성화 + 바로가기**(#12와 통합 게이트).
6. ✅ **#10 매핑 분리 범위** — **결정: 일반화 + 기존 Global 스캔.**
7. ✅ **#3b hue-Global 하위호환** — **결정: 신규만**(미게시라 마이그레이션 불필요).
8. ✅ **패턴 C 출시 범위** — **결정: 색 우선, 이후 확장**(검증된 기계를 숫자 카테고리로).
14. ⏳ **#17 텍스트 스타일 목록** — 배지형(Compact) vs 펼침 리스트형. 가로 리사이즈 의존은 비채택(합의됨).
15. ⏳ **#18 목록 UI 가이드** — Row 템플릿 2~3종 + 밀도 토큰. 미리보기/스캔 목록 파편화 해소.

---

## 7. 검증 방법
- 순수 로직(bind 후보 수집, 대비 보정, 색 family 매핑, 리네임 필터): `node --test` 케이스 추가.
- UI/Figma 동작: 빌드(`build.mjs`) → 브랜치 dist 로드 → 샘플 프레임으로 미리보기/선택/적용 수동 확인.
- 회귀: 이력 제거 후 빌드 통과(호출부 누락 없음) 확인.
