# Design System Linker (Figma 플러그인)

선택한 레이어에서 **디자인 토큰을 추출**해 Figma Variables로 만들고(3계층), 그 변수를
레이어 속성에 **바인딩**하고, 바인딩된 토큰 이름을 따라 **레이어를 리네임**하는 플러그인입니다.

> 양방향(하이브리드) 워크플로우: `추출 → 토큰 생성 → 적용(바인딩) → 리네임 → 컴포넌트 등록·베리언트 분류`.
> 만든 변수는 **코드로 내보내기(W3C 토큰 JSON · CSS 변수)** 도 가능.
> 설계 배경과 규칙은 저장소 계획 문서를 따릅니다. (마지막 단계는 Phase 3 계획)

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

### 프레임 크기·여백 바인딩
- 크기(`width`/`height`)는 **Fixed**일 때만 바인딩(HUG/FILL 충돌 시 스킵·플래그).
- `padding`·`gap`은 **오토레이아웃 프레임**에만 존재 → 일반 프레임은 스킵·안내.

### 레이어 네이밍
- 형식: **kebab-case 소문자**, 구분자 `-`. 구조: `{상위 맥락}-{로컬 역할}`(기본 최대 3단계).
- 토큰 보유 레이어 → 변수 전체 경로(`button/primary/background` → `button-primary-background`).
- 토큰 없는 비텍스트 레이어 → 역할/해부학 어휘(`button-primary-icon`, `-background`, `-container`).
- **제외**(이름 유지): Component/ComponentSet · **Text** · Instance · 잠긴 레이어. *텍스트는 이름만 제외하고 변수 바인딩은 정상 수행.*
- 형제 충돌은 `-2`/`-3` 접미사, 토큰/역할에서 매번 재계산하므로 **멱등**.

### 컴포넌트 등록 / 베리언트 분류 (Phase 3 · 구현됨, Paid)
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
  - **누락 조합 자동 생성 ✅ (구현됨, Paid)** — 선택한 베리언트 세트의 빠진 조합을 기존 변형 클론+`prop=value` 리네임으로 생성(`missingVariants` 순수 계산 + `code.ts` 적용, `GENERATE_MISSING_VARIANTS`).
  - **컴포넌트 속성(Boolean/Text/Instance-swap) 노출 ✅ (구현됨, Paid)** — 레이어 규칙(`inferComponentProperties`)으로 속성 계획 → `addComponentProperty` + 참조 연결(`EXPOSE_PROPERTIES`). TEXT→characters, INSTANCE→mainComponent, `이름?`→visible(Boolean).
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
    palette.ts  브랜드색→톤 스케일·하모니·중립·상태색 생성 — 순수
    pure.ts     테스트용 순수 배럴(→ dist/pure.mjs)
    extract.ts  선택 노드에서 토큰 추출
    variables.ts 3계층 변수 생성/갱신(upsert) + 시맨틱 별칭 매핑(createSemanticAliases)
    bind.ts     resolved 값 매칭 → 변수 바인딩
    rename.ts   boundVariables·역할 추론 → 리네임
    entitlements.ts 요금제 티어(Free/Paid)·기능 게이팅 — 순수
    license.ts   라이선스 캐시 평가·grace·검증 응답 파싱 — 순수
    licenseToken.ts 서명 토큰(JWT) 디코드·클레임·서명검증 통합 — 순수
    licenseConfig.ts 검증 서버 URL·공개키·구매/관리 링크(자리표시) — UI/code 공용 설정
    presets.ts   공유 프리셋 직렬화·검증·매핑(Paid) — 순수
    history.ts   변경 이력(audit) 기록·포맷(Paid) — 순수
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
- UI "내보내기(코드)" 카드에서 형식·폰트단위 선택 → 결과 복사 또는 `tokens.json`/`tokens.css` 다운로드. 게이팅: **Free**(리드젠).

## 컴포넌트 등록 / 베리언트 분류 (UI 5단계 · Phase 3 구현됨, Paid)

선택한 프레임을 **메인 컴포넌트로 등록**(`REGISTER_COMPONENTS`)하고, 같은 베이스 이름(예: `button/primary`,
`button/secondary`)을 공유하는 컴포넌트들을 **베리언트 세트**로 분류(`CLASSIFY_VARIANTS`)합니다. 속성 추론
(이름 → `속성=값`, 어휘 state/size/type)·그룹화·빈 조합 산출은 **순수 파서**(`components.ts`)로 `node --test`
검증, 실제 `createComponentFromNode`·`combineAsVariants`·자식 이름(`prop=value`) 적용만 `code.ts`에서
수행합니다(순수/부수효과 분리). 결과는 `COMPONENTS_RESULT`/`VARIANTS_RESULT`(생성 수·빈 조합·단일)로 보고.
이미 컴포넌트/세트 멤버면 건너뜀(멱등), `INSTANCE`·`TEXT`·잠금 제외. **Paid 게이팅**(비-Paid는 `PREMIUM_REQUIRED`).

**Phase 4 — 누락 조합 자동 생성**: 선택한 베리언트 세트의 **빠진 속성 조합**(`missingVariants` 순수 계산)을 기존 변형을 클론해 `prop=value`로 이름 지정하여 생성(`GENERATE_MISSING_VARIANTS`, Paid). 분류·생성 후 세트는 **속성 기반 2D 그리드**(`variantGrid`: 첫 속성=행, 둘째=열)로 정렬되고 자식에 맞게 **리사이즈**된다. 라이브러리 발행은 Plugin API 미지원이라 수동.

**Phase 4.1 — 컴포넌트 속성 노출**: 선택한 컴포넌트의 자식 레이어를 규칙으로 분석(`inferComponentProperties`)해 **컴포넌트 속성**을 만들고 연결(`EXPOSE_PROPERTIES`, Paid). TEXT 레이어→TEXT(characters), INSTANCE→INSTANCE_SWAP(mainComponent, 기본값은 발행 컴포넌트 key 또는 로컬 id), 이름이 `?`로 끝나는 레이어→BOOLEAN(visible). 실패 항목은 건너뜀.

빌드 메모: Figma UI는 단일 HTML만 로드(외부 `<script src>` 불가)하므로, `ui.ts` 번들 결과를
`ui.html`의 인라인 `<script>`로 주입합니다(`build.mjs`).

## UI / 메뉴 개편 (진행 중)

단계가 늘어 길어진 단일 스크롤을 **탭 그룹**으로 재편한다.

- **구조 재편 ✅ (구현됨)**: 단일 스크롤 → **탭 3개** `토큰`(팔레트·추출·생성·시맨틱·바인딩·리네임·내보내기) / `컴포넌트`(등록·베리언트·속성) / `설정`(요금제·프리셋·이력). 상단 sticky 탭 바.
- **진행 안내**(추후): 단계별 완료/대기 상태, 권장 순서 가이드(의존관계 시각화).
- **유료 게이팅 노출 ✅**: 컴포넌트·프리셋/이력(Paid) 카드에 🔒 잠금·비활성 표시.
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

> 비고: 동작 규칙(3계층·멱등·스코프)은 유지하고 **경험 계층**만 개선했다. 잔여(추후): 국제화(i18n 문자열 외부화), 명도 대비 점검, 대량 선택 비차단 점진 렌더.

## 유료화 / 상용 전환

오픈 코어 + **프리미엄(Freemium)** 모델. **Free / Paid 2단계**, **연 구독**, **외부 결제(LemonSqueezy)** + **무료 서버리스 검증(Cloudflare Workers)** 으로 한다. 무료 사용자의 기존 동작은 **절대 막지 않으며**, 유료 기능은 **미리보기·탐색은 허용하고 생성(쓰기)만 잠금**한다. (결정 배경·대안 비교는 `ROADMAP.md`)

### Free / Paid 경계 (기능 기반 게이팅 — 회당 횟수 제한 없음)
탐색·체험은 무료, **실제 디자인 시스템 생성은 Paid**.

| 기능 | Free (무제한) | Paid |
|---|:---:|:---:|
| 색상 팔레트 생성 · 레이어 리네임 · 바인딩(기존 변수) | ✅ | ✅ |
| 토큰 추출/미리보기 · 명도 대비 점검 · 코드 내보내기(W3C JSON / CSS) | ✅ | ✅ |
| **토큰(3계층 변수) 생성** | — | ✅ |
| **시맨틱 매핑** | — | ✅ |
| **컴포넌트 등록 · 베리언트(Phase 3/4/4.1)** | — | ✅ |
| **공유 프리셋 · 변경 이력** | — | ✅ |

> 의존성: Free '바인딩'은 **기존 변수**에 연결만 가능하다. 빈 파일에서 새 변수 시스템을 만들려면 '토큰 생성'(Paid)이 필요 — 자연스러운 업셀 지점.

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
- `src/lib/entitlements.ts`(순수, 테스트됨): `Tier = 'free' | 'paid'`, `hasEntitlement(tier, feature)` — 모든 유료 기능(`tokens`·`semantics`·`components`·`presets`)은 Paid에서 해금. **사용량 횟수 한도 없음**(기능 게이팅으로 대체).
- `code.ts`: `requirePaid(feature, message)` 단일 게이트. 토큰 생성(미리보기 제외)·시맨틱·컴포넌트·프리셋/이력을 게이팅. 바인딩·리네임·팔레트·내보내기·미리보기는 무게이팅.
- 메시지(`src/shared/messages.ts`): `CodeToUi.LICENSE_STATUS { tier, paid, source, … }` · `PREMIUM_REQUIRED { feature, message }`.

### 관리자 / 개발·테스트 전권 + 백도어 차단
- **개발 빌드 전용 티어 토글**: `__DEV__`(esbuild define, `npm run watch`/`node build.mjs --dev`에서 true) 일 때만 `SET_LICENSE` 개발용 강제 티어(`paid`)가 동작 → 결제 없이 전권 테스트.
- **배포 빌드**(`npm run build`)에선 `__DEV__=false` → `SET_LICENSE` 핸들러와 UI 토글이 **컴파일 단계에서 비활성**(페이월 우회 백도어 차단).
- **실제 검증 경로 테스트**: LemonSqueezy **test mode** + sandbox 키로 Worker `/verify`. (선택) Worker `ADMIN_KEYS` 오너 allowlist 키 → 장기 paid 토큰(스모크 테스트용).

### 프라이버시 · 법무
- 토큰·디자인 데이터 **로컬 처리** 유지, 외부 전송은 **라이선스 검증 요청(키 + instanceName)** 에 한정 — 디자인 데이터 미전송.
- 환불·약관·개인정보 처리방침·세금(VAT)은 **LemonSqueezy(MoR)** 에 위임.

### 리스크 · 미정
- 연 가격 금액·월 옵션 여부 확정. Figma 발행 정책(외부 결제/키 방식 — 현재 허용, 광고·저품질 금지) 재확인.
- 기기 교체(1대 한도) 셀프 해제 UX — LS 포털 가능 여부 확인, 불가 시 지원/Worker "이 기기로 이동" 추후.
