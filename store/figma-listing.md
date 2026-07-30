# Figma Community 등록 자료 (Design System Linker)

플러그인을 Figma Community에 게시할 때 입력하는 텍스트와 이미지 모음입니다.
이미지는 Figma 파일에서 PNG로 내보내 업로드하세요.

- **에셋 Figma 파일**: https://www.figma.com/design/DxdfUfaSZnZtc8MJtepYTc (DSL — Figma Community Assets)
  - `icon-128` 프레임 → **아이콘 128×128 PNG**
  - `cover-1920x960` 프레임 → **커버 1920×960 PNG**
  - `carousel-1` / `carousel-2` / `carousel-3` → **캐러셀 스크린샷 1920×960 PNG** (만들기 / 적용 / 관리)
  - 내보내기: 프레임 선택 → 우측 Export 패널 → PNG → 1x → Export

---

## 이름 (Name)
**Design System Linker**

## 태그라인 (Tagline · 한 줄)
- KO: 셀렉션에서 디자인 토큰을 추출해 3계층 변수로 연결 — 추출·바인딩·정리·내보내기
- EN: Turn selections into 3‑tier design tokens — extract, bind, organize, export.

---

## 설명 (Description · 마크다운 지원)

### 한국어
**Design System Linker**는 선택한 레이어에서 디자인 토큰을 추출해 **Figma Variables 3계층 구조**(Global → Semantic → Component)로 만들고, 다시 디자인에 **바인딩**하고, 레이어 이름을 **정리**하고, **코드로 내보내는** 워크플로우를 한곳에서 제공합니다. 모든 동작은 **미리보기 → 적용** 2단계이며, 한 번의 실행은 **한 번의 되돌리기(⌘Z)** 로 취소됩니다.

**주요 기능**
- 🎨 **토큰 추출** — 선택에서 색·타이포·간격·반경·효과 토큰 후보를 자동 추출
- 🧱 **3계층 변수 생성** — Global(원시값) → Semantic(별칭) → Component. 재실행해도 안전(멱등)
- 🔗 **시맨틱 매핑** — `surface`, `text` 같은 역할을 Global 변수에 별칭으로 연결
- 🎯 **자동 바인딩** — 선택 속성을 가장 가까운 변수에 연결(허용오차). 적용 전 미리보기, 사유별 스킵 안내, 진행률·취소
- ✏️ **레이어 리네임** — 토큰/역할 기반의 일관된 이름으로, 변경 diff 미리보기
- 🧩 **컴포넌트 · 베리언트 (Paid)** — 컴포넌트 등록, 베리언트 분류, 누락 조합 생성, 속성 노출
- 📦 **코드 내보내기** — W3C 디자인 토큰 JSON / CSS 변수 (px·rem 선택)

**안전·프라이버시**
- 모든 변경은 단일 Undo로 되돌리기 · 미리보기 → 적용 2단계(비파괴)
- **디자인 데이터를 외부로 전송하지 않습니다.** 네트워크는 (선택적) 라이선스 키 검증에만 사용

### English
**Design System Linker** extracts design tokens from your selection, builds them into a **3‑tier Figma Variables** structure (Global → Semantic → Component), **binds** them back onto your design, **renames** layers consistently, and **exports** to code — all in one panel. Every action is **preview → apply**, and each run is a **single undo (⌘Z)**.

**Features**
- 🎨 **Extract** color, typography, spacing, radius, and effect tokens from a selection
- 🧱 **3‑tier variables** — Global → Semantic → Component, idempotent on re‑run
- 🔗 **Semantic mapping** — alias roles (`surface`, `text`, …) to Global variables
- 🎯 **Auto‑bind** properties to the nearest variable (tolerance), with preview, grouped skip reasons, progress & cancel
- ✏️ **Rename** layers from tokens/roles with a change diff
- 🧩 **Components & variants (Paid)** — register, classify variants, generate missing combos, expose properties
- 📦 **Export** to W3C Design Tokens JSON / CSS variables (px or rem)

**Safety & privacy**
- Single‑undo per run, non‑destructive preview → apply
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
- [ ] 캐러셀 스크린샷 3장(`carousel-1/2/3`, 만들기·적용·관리) 1920×960 PNG 내보내기
