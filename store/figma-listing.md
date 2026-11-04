# Figma Community 등록 자료 (Design System Linker)

플러그인을 Figma Community에 게시할 때 입력하는 텍스트와 이미지 모음입니다.
이미지는 Figma 파일에서 PNG로 내보내 업로드하세요. 화면 설명은 IA v3([`docs/ia-v3.md`](../docs/ia-v3.md)) 기준입니다.

- **에셋 Figma 파일**: https://www.figma.com/design/DxdfUfaSZnZtc8MJtepYTc (DSL — Figma Community Assets)
  - `icon-128` 프레임 → **아이콘 128×128 PNG**
  - `cover-1920x960` 프레임 → **커버 1920×960 PNG**
  - `carousel-1` / `carousel-2` / `carousel-3` → **캐러셀 스크린샷 1920×960 PNG** (변수 / 레이어 / 최소화) — v2 화면(만들기 / 적용 / 관리)이라 **다시 찍어야 한다**(아래 체크리스트)
  - 내보내기: 프레임 선택 → 우측 Export 패널 → PNG → 1x → Export

---

## 이름 (Name)
**Design System Linker**

## 태그라인 (Tagline · 한 줄)
- KO: 셀렉션에서 디자인 토큰을 추출해 3계층 변수로 연결 — 추출·연결·정리·내보내기
- EN: Turn selections into 3‑tier design tokens — extract, link, organize, export.

---

## 설명 (Description · 마크다운 지원)

### 한국어
**Design System Linker**는 선택한 레이어에서 디자인 토큰을 추출해 **Figma Variables 3계층 구조**(Global → Semantic → Component)로 만들고, 다시 디자인에 **연결**하고, 레이어 이름을 **정리**하고, **코드로 내보내는** 워크플로우를 한곳에서 제공합니다. 연결은 **찾기 → 켠 변수만 연결** 2단계이며, 한 번의 실행은 **한 번의 되돌리기(⌘Z)** 로 취소됩니다.

**주요 기능**
- 📋 **변수 목록** — 파일의 변수를 사이드바(★ Inspect · 컬렉션 · 그룹 · LIB)와 목록으로. ★ Inspect는 선택한 레이어가 쓰는 변수만 모으고, 라이브러리 변수는 LIB에 실제 이름으로
- 🛠 **변수 고치기** — 상세에서 이름 · 모드별 값 · 별칭을 고치고 한 번의 ⌘Z로 되돌리기
- 🎨 **토큰 추출** — 선택에서 색·타이포·간격·반경·효과 토큰 후보를 자동 추출
- 🧱 **3계층 변수 만들기 (유료)** — Global(원시값) → Semantic(별칭) → Component. 재실행해도 안전(멱등)
- 🔗 **시맨틱 매핑 (유료)** — `surface`, `text` 같은 역할을 Global 변수에 별칭으로 연결
- 🎯 **변수 연결** — 값이 **같은** 변수에만 연결하고, 이미 변수·스타일이 붙은 곳은 건너뜁니다. 찾은 곳을 변수별 카드로 보고 켠 변수만 연결, 건너뛴 사유는 칩으로
- 🔤 **기존 텍스트 스타일 연결** — 모든 글자 속성이 같은 로컬 스타일에 텍스트를 연결(무료). 스타일 등록은 유료
- ✏️ **레이어 이름 정리** — 역할 기반의 일관된 이름으로, 바뀌는 이름을 미리 보고 적용
- 🧩 **컴포넌트 · 베리언트 (유료)** — 컴포넌트 등록, 베리언트 분류, 누락 조합 생성, 속성 노출, 닮은 프레임 묶기
- 📦 **코드 내보내기** — W3C 디자인 토큰 JSON / CSS 변수 (px·rem 선택)
- 🗕 **최소화** — 작업 중에는 창을 작은 사각형(140×104)으로 접어 두기

**안전·프라이버시**
- 모든 변경은 단일 Undo로 되돌리기 · 쓰기 전에 찾기·미리보기로 확인(비파괴)
- **디자인 데이터를 외부로 전송하지 않습니다.** 네트워크는 (선택적) 라이선스 키 검증에만 사용

### English
**Design System Linker** extracts design tokens from your selection, builds them into a **3‑tier Figma Variables** structure (Global → Semantic → Component), **links** them back onto your design, **renames** layers consistently, and **exports** to code — all in one panel. Linking is **find → link the variables you turn on**, and each run is a **single undo (⌘Z)**.

**Features**
- 📋 **Variable list** — sidebar (★ Inspect · collections · groups · LIB) plus a list. ★ Inspect gathers the variables your selection uses; library variables show their real names under LIB
- 🛠 **Edit variables** — rename, edit per‑mode values and aliases from the detail view, undone with one ⌘Z
- 🎨 **Extract** color, typography, spacing, radius, and effect tokens from a selection
- 🧱 **3‑tier variables (paid)** — Global → Semantic → Component, idempotent on re‑run
- 🔗 **Semantic mapping (paid)** — alias roles (`surface`, `text`, …) to Global variables
- 🎯 **Link variables** — only to variables with the **same** value; places that already have a variable or style are skipped. Review finds per variable, link only the ones you turn on, with skip reasons as chips
- 🔤 **Link existing text styles** — attach text to a local style whose properties all match (free). Registering styles is paid
- ✏️ **Rename** layers from roles, previewing every change
- 🧩 **Components & variants (paid)** — register, classify variants, generate missing combos, expose properties, componentize similar frames
- 📦 **Export** to W3C Design Tokens JSON / CSS variables (px or rem)
- 🗕 **Minimize** the panel to a small 140×104 square while you work

**Safety & privacy**
- Single‑undo per run; find/preview before anything is written
- **No design data leaves Figma.** Network is used only for optional license‑key verification.

---

## 태그 (Tags · 최대 12개)
design systems, design tokens, variables, tokens, styles, automation, naming, components, variants, export, css, developer handoff

## 카테고리 (제안)
- 1순위: **Design** (또는 Design systems)
- 2순위: **Productivity** / **Development**

---

## 배포 전 체크리스트
- [ ] `licenseConfig.ts`의 `VERIFY_URL` · `LICENSE_PUBLIC_JWK`를 실제 검증 서버 값으로 교체
- [ ] `manifest.json`의 `networkAccess.allowedDomains`를 실제 도메인으로 교체 (licenseConfig와 일치)
- [ ] `npm run build` 후 `manifest.json`(main=`dist/code.js`, ui=`dist/ui.html`)로 Figma 데스크톱에서 “Import plugin from manifest”로 동작 확인
- [ ] 아이콘 128×128 PNG, 커버 1920×960 PNG 내보내기
- [ ] 캐러셀 스크린샷 3장(`carousel-1/2/3`, **변수 · 레이어 · 최소화**) 1920×960 PNG — 에셋 Figma 파일의 v2 화면(만들기 · 적용 · 관리)을 v3 화면으로 다시 찍은 뒤 내보내기
