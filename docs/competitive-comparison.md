# 경쟁 비교 — 기존 디자인 → 변수 · 컴포넌트

> 조사일: 2026-11-09 · 상태: **1차(조사 기반)** — §4 실측 표는 직접 돌려 본 뒤 채운다.
>
> **표기:** ✅ 한다 · △ 일부만 · ❌ 안 한다 · ? 확인 못 함.
> **출처 등급:** [공식] 회사 사이트·공식 SNS · [목록] 피그마 커뮤니티 플러그인 소개 글 · [외부] 리뷰·블로그. [외부]만 있는 내용은 추정으로 본다.
>
> 이 세션 네트워크에서 `tokens.studio` · `www.figma.com`을 직접 열 수 없어, 모든 내용은 검색 결과 요약에서 가져왔다. 가격·요금제는 결정 전에 공식 페이지에서 다시 확인한다.

---

## 0. 핵심 요약

1. **한 번에 다 하는 도구는 찾지 못했다.** 변수 만들기·연결 플러그인과 컴포넌트 변환 플러그인은 각각 있지만, *3계층 변수 + 연결 + 이름 정리 + 컴포넌트*를 한 플러그인에서 하는 것은 검색에서 보이지 않았다. (커뮤니티 전체를 훑은 것은 아니어서 "없다"고 단정하지 않는다.)
2. **피그마 Check designs는 Organization · Enterprise의 Full 좌석 전용이다.** [공식] 이미 있는 변수에 맞춰 보는 *검사*이고, 변수를 *만들지는* 않는다.
3. **Tokens Studio는 무료 + Team(1인당 월 €39~49) 구조로 보인다.** [공식, 재확인 필요] 1인 기준 연 €468~588로, 우리 Paid(연 $39)의 약 **12~15배**다.
4. **우리 자리:** "Org 요금제 없이, 기존 디자인을 3계층 변수 + 연결 + 이름 정리까지 한 번에". 컴포넌트는 피그마 AI와 겹칠 수 있어 베타 비중을 유지한다.

---

## 1. 기능 비교

| 기능 | **우리 (DSL)** | 피그마 Check designs | Tokens Studio | bindy | Values to Variables | Selection to Variables | Tokenify | Convert styles to variables… | Componentizer / Component Repeater |
|---|---|---|---|---|---|---|---|---|---|
| 기존 디자인에서 값 뽑기 | ✅ 무료 | ❌ | ❌ (직접 정의) | ✅ | ✅ | ✅ | ❌ | △ (스타일에서) | ❌ |
| 변수 새로 만들기 | ✅ Paid | ❌ | ✅ (토큰 → 변수) | ✅ | ✅ | ✅ | ❌ | ✅ (스타일 → 변수) | ❌ |
| **계층 구조**(원시 → 의미 별칭) | ✅ Global → Semantic 자동 | ❌ | ✅ (직접 짜야 함) | ? | ? | ? | ❌ | ? | ❌ |
| 만들기 전 미리보기 | ✅ | — | — | ? | ? | ✅ | ? | ? | ? |
| 같은 값 레이어에 연결 | ✅ 무료 (같은 값만) | ✅ (추천 → 적용) | △ (토큰 적용) | ✅ (만든 변수에) | ? | △ | ✅ (기존 컬렉션에 맞춤) | ✅ | ❌ |
| 이미 붙은 변수·스타일 보호 | ✅ (건드리지 않음) | — | ? | ? | ? | ? | ? | ? | — |
| 레이어 이름 정리 | ✅ 무료 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 텍스트 스타일 | ✅ Paid | △ (추천) | ✅ | ? | △ (글꼴 값) | ✅ | ❌ | ? | ❌ |
| 반복 레이어 → 컴포넌트 · 베리언트 | ✅ Paid · 베타 | ❌ (분리된 것 찾기만) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| 안 쓰는 변수 정리 | ❌ (v3 다음) | ❌ | ? | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| 색 대비 · 라이브러리 불일치 검사 | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 코드 내보내기 (JSON · CSS) | ✅ 무료 | ❌ | ✅ (Git 동기화) | ? | ? | ? | ❌ | ❌ | ❌ |
| 다크 테마 | ✅ Paid | ❌ | ✅ (테마) | ? | ? | ? | ❌ | ? | ❌ |

출처: 우리 — `README.md`, `ROADMAP.md` §1·§5 / Check designs — [공식] Figma Threads, Schema 2025 / 나머지 — [목록]·[외부] (§6).

### 읽는 법
- **우리만 하는 것:** 레이어 이름 정리, 계층 별칭 *자동* 구성. 이 둘을 앞에 내세운다.
- **남이 하는데 우리가 안 하는 것:** 안 쓰는 변수 정리(Convert styles…), 색 대비·라이브러리 불일치 검사(Check designs), Git 동기화(Tokens Studio).
- **정면으로 겹치는 곳:** "값 → 변수 연결"은 무료 플러그인 여럿과 Check designs가 모두 한다. 연결 기능 하나만으로는 돈을 받기 어렵다. 우리도 연결은 무료다(`ROADMAP.md` §5).

---

## 2. 가격 비교 (1인 기준)

| 도구 | 무료 범위 | 유료 | 1인 연간 비용 | 출처 등급 |
|---|---|---|---|---|
| **우리 (DSL)** | 값 뽑기 · 연결 · 이름 정리 · 코드 내보내기 (무제한) | Paid **연 $39** (기기 1대) | **$39** | 내부 확정 (`ROADMAP.md` §5) |
| Tokens Studio | 편집자 1 · 보는 사람 무제한 · 프로젝트 1 · 플러그인 Pro 기능 없음 | Team 월 €49(월 결제) / €39(연 결제) | **€468** (연 결제) ~ €588 | [공식] 단, Starter Plus 페이지의 표 — 재확인 필요 |
| Tokens Studio (예전) | — | Pro $12 · Teams $18 /월 | ($144) | [외부] — 예전 정보로 보임 |
| 피그마 Check designs | — | Organization · Enterprise **Full 좌석**에 포함 | 피그마 요금제 비용 (별도 가격 없음) | [공식] |
| bindy · Values to Variables · Selection to Variables · Tokenify · Convert styles… · Componentizer | ? | ? | ? | 커뮤니티 페이지 확인 필요 (§4.1) |

**숫자로 보면**
- Tokens Studio Team(연 결제) ÷ 우리 Paid = €468 ÷ $39 ≈ **12배** (환율 €1 ≈ $1.08로 계산하면 약 13배).
- Check designs를 쓰려면 Org 이상이 필요하다. Professional·무료 요금제 사용자는 이 기능이 없다 → 우리가 공략할 대상.

---

## 3. 피그마 Check designs 현황

| 항목 | 내용 | 등급 |
|---|---|---|
| 상태 | 정식 출시(GA) | [공식] Threads |
| 대상 | Organization · Enterprise의 **Full 좌석** | [공식] |
| Professional | 출시 글에 없음. 댓글에 "Pro에도 열어 달라" 요청 → 지금은 없는 것으로 보임 | 추정 |
| 기능 | ① 변수·스타일 추천 ② 색 대비 ③ 라이브러리 불일치 ④ 분리된 컴포넌트 찾기 | [외부] |
| 실행 시점 | "Ready for dev" 표시할 때, 또는 빠른 실행(Quick actions) | [공식] 발표 |
| 출시일 | 확인 못 함 (외부 사이트는 약 5개월 전으로 봄) | 추정 |
| 하지 않는 것 | 변수를 **새로 만들기**, 계층 짜기, 이름 정리 | 추정 (기능 목록에 없음) |

관련 사실: Variables REST API는 Enterprise Full 좌석 전용이다 [공식, developers.figma.com]. 플러그인 API로 변수를 다루는 데에는 이 제한이 없다 — 우리가 모든 요금제에서 돌아가는 이유.

---

## 4. 직접 돌려 보는 비교 (실측) — 미완

조사만으로는 결과물이 어떻게 나오는지(구조·개수·이름) 알 수 없다. 같은 파일로 직접 돌려서 아래 표를 채운다. **소요: 약 1시간.**

### 4.1 준비
1. 테스트 파일 1개를 만든다(또는 `docs/qa`에서 쓰던 파일을 복제). 아래가 들어 있어야 한다.
   - 카드 3개 반복(텍스트만 다름) + 버튼 2종(채움 · 외곽선)
   - 색 8개 이상(같은 색 반복 포함), 간격 4 · 8 · 12 · 16 · 24, 모서리 4 · 8 · 999
   - % 단위 행간(예: 150%) 텍스트 1개
   - 이미 변수가 붙은 레이어 1개, 텍스트 스타일이 붙은 글자 1개 (보호 확인용)
   - 피그마 기본 이름(`Frame 12` 등) 레이어 10개 이상
2. 플러그인마다 **복제본**에서 실행한다(서로 결과가 섞이지 않게).
3. 커뮤니티 페이지에서 가격 · 사용자 수 · 마지막 업데이트를 적는다.

### 4.2 잴 것

| 지표 | 재는 법 |
|---|---|
| 만든 변수 수 | 변수 패널 전체 개수 |
| 컬렉션 · 계층 | 컬렉션 이름 / 별칭이 있는지 |
| 중복 변수 | 같은 값으로 변수 2개 이상 생긴 수 |
| 연결한 자리 수 | 결과 요약 또는 직접 셈 |
| 잘못 연결 | 값이 다른데 연결된 자리 |
| 보호 위반 | 원래 붙어 있던 변수 · 스타일이 바뀐 수 (0이어야 함) |
| % 행간 처리 | 변수 값 · 설명 |
| 이름 정리 | 기본 이름이 몇 개 남았나 |
| 클릭 수 | 시작부터 끝까지 누른 횟수 |
| 되돌리기 | ⌘Z 한 번에 전부 돌아오나 |

### 4.3 결과 표 (채울 것)

| 지표 | 우리 | bindy | Values to Variables | Selection to Variables | Tokenify | Convert styles… |
|---|---|---|---|---|---|---|
| 가격 | 무료 / 연 $39 | | | | | |
| 사용자 수 · 마지막 업데이트 | — | | | | | |
| 만든 변수 수 | | | | | (안 만듦) | |
| 컬렉션 · 계층 | Global · Semantic | | | | | |
| 중복 변수 | | | | | | |
| 연결한 자리 수 | | | | | | |
| 잘못 연결 | | | | | | |
| 보호 위반 | 0 (명세 §2.11) | | | | | |
| % 행간 처리 | px + 설명 "150%" | | | | | |
| 남은 기본 이름 | | | | | | |
| 클릭 수 | | | | | | |
| ⌘Z 한 번 | | | | | | |

컴포넌트 쪽(Componentizer · Component Repeater)은 카드 3개 반복으로 따로 잰다: 세트로 묶였나 / 텍스트만 다른 반복이 단품으로 접혔나 / 원본이 지워졌나.

---

## 5. 판단

### 내세울 것 (추천)
> **"Org 요금제 없이, 기존 디자인을 3계층 변수 + 연결 + 이름 정리까지 한 번에. 연 $39."**

- 근거: Check designs가 없는 Professional·무료 사용자 / Tokens Studio Team의 약 1/12 가격 / 이름 정리와 계층 자동 구성은 다른 도구에 없음.

### 실패할 수 있는 이유
| 위험 | 가능성 (추정) | 영향 | 대응 |
|---|---|---|---|
| 피그마가 Check designs를 Professional에도 연다 | 중간 | 연결 기능의 차별점이 줄어듦 | 연결은 이미 무료. 계층 만들기 · 이름 정리를 앞에 내세움 |
| 피그마가 변수 *만들기*까지 자동화한다 | 낮음~중간 | 핵심 Paid 기능과 겹침 | 계층 규칙 · 코드 내보내기 등 디자인 시스템 운영 쪽으로 깊이를 더함 |
| 무료 플러그인(bindy 등)으로 충분하다고 본다 | 중간 | 전환율이 낮음 | §4 실측으로 품질 차이(중복 · 잘못 연결 · 보호 위반)를 숫자로 보여 줌 |
| 컴포넌트 자동화가 피그마 AI와 겹친다 | 높음 | 컴포넌트 기능 가치가 떨어짐 | 베타로 유지하고 투자 비중을 키우지 않음 |

### 우리가 채울 만한 빈칸 (후보, 결정 아님)
- **안 쓰는 변수 찾기(파일 전체)** — 이미 "v3 다음"에 있다(`docs/ia-v3.md`). 경쟁 도구 하나가 하고 있다.
- **색·효과 스타일 → 변수** — `ROADMAP.md`에 미완(Paid)으로 있다.

---

## 6. 할 일

- [ ] Tokens Studio Team 가격과 Free 범위를 공식 페이지에서 확인해 §2 갱신 (5분)
- [ ] §4 실측 표 채우기 (약 1시간)
- [ ] Check designs 도움말 문서에서 Professional 지원 여부 확인 — 분기마다 1번 (다음: 2027-02)
- [ ] 실측 결과로 §5 "내세울 것" 문구를 확정해 스토어 소개(`store/`)에 반영할지 결정

---

## 7. 출처

**Tokens Studio**
- [Tokens Studio Pricing](https://tokens.studio/pricing) · [Starter Plus](https://tokens.studio/starter-plus) [공식]
- [G2](https://www.g2.com/products/tokens-studio/pricing) · [designtools.fyi](https://designtools.fyi/tools/tokens-studio) · [tooltrim](https://tooltrim.com/en/tool/figma-tokens) [외부]

**피그마 Check designs · 요금제**
- [Figma Threads — Check Designs GA](https://www.threads.com/@figma/post/DZK7pu0m_tR) · [Schema 2025 recap](https://www.figma.com/blog/schema-2025-design-systems-recap/) · [Figma plans and features](https://help.figma.com/hc/articles/360040328273) · [Variables REST API](https://developers.figma.com/docs/rest-api/variables) [공식]
- [createwith](https://www.createwith.com/tool/figma/updates/figma-releases-check-designs-for-design-system-compliance-across-team-plans) · [Medium — Figma's New Linter](https://medium.com/@iamfilipp/figmas-new-linter-sees-the-mess-it-can-t-see-the-cost-d3130713b2e0) [외부]

**플러그인**
- [bindy](https://www.figma.com/community/plugin/1567266906129777058/bindy-generate-bind-figma-variables-automatically) · [Values to Variables](https://www.figma.com/community/plugin/1527741249144777105/values-to-variables) · [Selection to Variables](https://www.figma.com/community/plugin/1615136997796434946/selection-to-variables) · [Convert styles to variables…](https://www.figma.com/community/plugin/1682711656065145288/convert-styles-to-variables-link-hard-coded-values-to-variables-find-and-delete-unused-variables) · [Componentizer](https://www.figma.com/community/plugin/1050200692173775681/componentizer) · [Component repeater](https://www.figma.com/community/plugin/1446899745376796238/component-repeater) [목록]
- [Huekit — Tokenify 소개](https://huekit.io/blog/replace-hard-coded-colors-with-variables-figma) · [Figma Design to Components](https://www.figma.com/solutions/design-to-components/) [외부·공식]
