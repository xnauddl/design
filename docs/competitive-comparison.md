# 경쟁 비교 — 기존 디자인 → 변수 · 컴포넌트

> 조사일: 2026-11-09 · 상태: **2차** — Tokens Studio 가격과 Check designs 요금제를 공식 페이지에서 확인함. §4 실측 표는 직접 돌려 본 뒤 채운다.
>
> **표기:** ✅ 한다 · △ 일부만 · ❌ 안 한다 · ? 확인 못 함.
> **출처 등급:** [공식] 회사 사이트·공식 SNS · [목록] 피그마 커뮤니티 플러그인 소개 글 · [외부] 리뷰·블로그. [외부]만 있는 내용은 추정으로 본다.
>
> **2차에서 공식 페이지로 확인한 것:** `tokens.studio/pricing`(Tokens Studio 요금제), `help.figma.com` "Check designs in Figma"(대상 요금제·기능·한계). **아직 못 본 것:** 피그마 커뮤니티 플러그인 페이지(`www.figma.com/community`)는 자동 접속을 막아 열리지 않았다 — 플러그인 가격·사용자 수는 §4.1에서 직접 확인한다.

---

## 0. 핵심 요약

1. **한 번에 다 하는 도구는 찾지 못했다.** 변수 만들기·연결 플러그인과 컴포넌트 변환 플러그인은 각각 있지만, *3계층 변수 + 연결 + 이름 정리 + 컴포넌트*를 한 플러그인에서 하는 것은 검색에서 보이지 않았다. (커뮤니티 전체를 훑은 것은 아니어서 "없다"고 단정하지 않는다.)
2. **피그마 Check designs는 Education(K-12) · Organization · Government · Enterprise 요금제에서만, 파일 편집 권한이 있을 때 쓸 수 있다.** [공식 도움말] Professional · Starter(무료)에는 없다. *연결된 라이브러리*의 변수·스타일을 추천하는 검사이고, 변수를 *만들지는* 않는다.
3. **Tokens Studio 유료는 Team(연 결제 월 €39, 편집자 1명 포함)부터다.** [공식] 1인 기준 연 **€468**로, 우리 Paid(연 $39)의 약 **13배**다. 무료 요금제에는 피그마 플러그인 Pro 기능이 없다.
4. **우리 자리:** "Org 요금제 없이, 기존 디자인을 3계층 변수 + 연결 + 이름 정리까지 한 번에". 컴포넌트는 피그마 AI와 겹칠 수 있어 베타 비중을 유지한다.

---

## 1. 기능 비교

| 기능 | **우리 (DSL)** | 피그마 Check designs | Tokens Studio | bindy | Values to Variables | Selection to Variables | Tokenify | Convert styles to variables… | Componentizer / Component Repeater |
|---|---|---|---|---|---|---|---|---|---|
| 기존 디자인에서 값 뽑기 | ✅ 무료 | ❌ | ❌ (직접 정의) | ✅ | ✅ | ✅ | ❌ | △ (스타일에서) | ❌ |
| 변수 새로 만들기 | ✅ Paid | ❌ | ✅ (토큰 → 변수) | ✅ | ✅ | ✅ | ❌ | ✅ (스타일 → 변수) | ❌ |
| **계층 구조**(원시 → 의미 별칭) | ✅ Global → Semantic 자동 | ❌ | ✅ (직접 짜야 함) | ? | ? | ? | ❌ | ? | ❌ |
| 만들기 전 미리보기 | ✅ | — | — | ? | ? | ✅ | ? | ? | ? |
| 같은 값 레이어에 연결 | ✅ 무료 (같은 값만) | ✅ (비슷한 값까지 추천 → 적용, 연결된 라이브러리 변수만) | △ (토큰 적용) | ✅ (만든 변수에) | ? | △ | ✅ (기존 컬렉션에 맞춤) | ✅ | ❌ |
| 이미 붙은 변수·스타일 보호 | ✅ (건드리지 않음) | — | ? | ? | ? | ? | ? | ? | — |
| 레이어 이름 정리 | ✅ 무료 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 텍스트 스타일 | ✅ Paid | △ (추천) | ✅ | ? | △ (글꼴 값) | ✅ | ❌ | ? | ❌ |
| 반복 레이어 → 컴포넌트 · 베리언트 | ✅ Paid · 베타 | ❌ (분리된 것 찾기만) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| 안 쓰는 변수 정리 | ❌ (v3 다음) | ❌ | ? | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| 라이브러리 불일치 검사 | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 코드 내보내기 (JSON · CSS) | ✅ 무료 | ❌ | ✅ (Git 동기화) | ? | ? | ? | ❌ | ❌ | ❌ |
| 다크 테마 | ✅ Paid | ❌ | ✅ (테마) | ? | ? | ? | ❌ | ? | ❌ |

출처: 우리 — `README.md`, `ROADMAP.md` §1·§5 / Check designs — [공식] Figma 도움말 "Check designs in Figma" / 나머지 — [목록]·[외부] (§6).

### 읽는 법
- **우리만 하는 것:** 레이어 이름 정리, 계층 별칭 *자동* 구성. 이 둘을 앞에 내세운다.
- **남이 하는데 우리가 안 하는 것:** 안 쓰는 변수 정리(Convert styles…), 라이브러리 불일치 검사(Check designs), Git 동기화(Tokens Studio). (Check designs의 색 대비 검사는 외부 글에만 있고 공식 도움말에는 없어 표에서 뺐다.)
- **연결 방식의 차이:** Check designs는 값이 *비슷한* 변수도 추천한다(유사도 · 이름 계층 · 팀 사용 빈도로 순위). 우리는 값이 *같은* 곳만 연결한다(명세 §2.11). 또 Check designs는 게시된 라이브러리가 있어야 잘 돌고, 우리는 파일 안 로컬 변수로 돈다.
- **정면으로 겹치는 곳:** "값 → 변수 연결"은 무료 플러그인 여럿과 Check designs가 모두 한다. 연결 기능 하나만으로는 돈을 받기 어렵다. 우리도 연결은 무료다(`ROADMAP.md` §5).

---

## 2. 가격 비교 (1인 기준)

| 도구 | 무료 범위 | 유료 | 1인 연간 비용 | 출처 등급 |
|---|---|---|---|---|
| **우리 (DSL)** | 값 뽑기 · 연결 · 이름 정리 · 코드 내보내기 (무제한) | Paid **연 $39** (기기 1대) | **$39** | 내부 확정 (`ROADMAP.md` §5) |
| Tokens Studio Free | 편집자 1 · 보는 사람 무제한 · 프로젝트 1(브랜치 1) · 테마 그룹 1 · **플러그인 Pro 기능 없음** | — | €0 | [공식] |
| Tokens Studio **Team** | — | **월 €39 (연 결제)**, 편집자 1명 포함 · 추가 편집자 월 €39(최대 150) · 플러그인 유료 기능 전부(Git 동기화 · 다차원 테마 · 캔버스 문서) · 프로젝트 5 | **€468** | [공식] |
| Tokens Studio Team (월 결제) | — | 월 €49로 보임 | (€588) | Starter Plus 페이지 표에만 있음 — 가격 페이지의 월 결제 값은 화면에서 스크립트로 그려져 확인 못 함 |
| Tokens Studio Organization | — | **월 €499 (연 결제)**, 편집자 5명 포함 · 추가 편집자 월 €49 · SSO 등은 추가 | €5,988 (5명) | [공식] |
| Tokens Studio Enterprise | — | 문의 | — | [공식] |
| Tokens Studio (예전) | — | Starter Plus · Pro · Essential → **Team으로 합침** | — | [공식] "We've simplified our plans" |
| 피그마 Check designs | — | Education(K-12) · Organization · Government · Enterprise 요금제에 포함, 파일 **편집 권한** 필요 | 피그마 요금제 비용 (별도 가격 없음) | [공식 도움말] |
| bindy · Values to Variables · Selection to Variables · Tokenify · Convert styles… · Componentizer | ? | ? | ? | 커뮤니티 페이지 확인 필요 (§4.1) |

**숫자로 보면**
- Tokens Studio Team(연 결제) ÷ 우리 Paid = €468 ÷ $39. 환율 €1 ≈ $1.08로 계산하면 $505 ÷ $39 ≈ **13배**. 환율은 2026-11 근사치이며 확인하지 않았다.
- Check designs를 쓰려면 Organization 이상(또는 교육·정부 요금제)이 필요하다. Professional·Starter 사용자는 이 기능이 없다 → 우리가 공략할 대상.

---

## 3. 피그마 Check designs 현황

| 항목 | 내용 | 등급 |
|---|---|---|
| 상태 | 정식 출시(GA) | [공식] Threads |
| 대상 | **Education(K-12) · Organization · Government · Enterprise** 요금제, 파일 편집 권한 필요 | [공식 도움말] |
| Professional · Starter | 대상 목록에 없음 → **쓸 수 없음** | [공식 도움말] |
| 찾는 것 | ① 변수·스타일로 바꿀 수 있는 원래 값(색 · 텍스트 스타일 · 모서리 · 간격·여백) ② 잘못된 라이브러리의 컴포넌트·변수·스타일(파일에 추가 안 된 라이브러리 포함) | [공식 도움말] |
| 고치는 방식 | 변수·스타일은 **연결된 라이브러리**에서 추천 → 수락하거나 목록에서 고름. 컴포넌트는 표시만 하고 직접 바꿔야 함 | [공식 도움말] |
| 추천 순위 | 현재 값과의 유사도 · 변수 이름과 계층 · 팀·조직 사용 빈도. LLM·생성형 AI는 쓰지 않음 | [공식 도움말] |
| 한계 | 한 번에 한 페이지 · 선택 최대 25,000 레이어 · 색 스타일 바꾸기는 안 됨(원래 색 → 변수만) | [공식 도움말] |
| 잘 도는 조건 | 게시된 변수 기반 디자인 시스템. 원시 변수를 숨기거나 용도(scope)를 좁히면 추천이 좋아짐 | [공식 도움말] |
| 여는 곳 | 선택 우클릭 · 섹션의 Ready for Dev 메뉴 · 아래 도구 막대 Actions에서 검색 | [공식 도움말] |
| 출시일 | 확인 못 함 (외부 사이트는 약 5개월 전으로 봄) | 추정 |
| 하지 않는 것 | 변수를 **새로 만들기**, 계층 짜기, 이름 정리 | [공식 도움말]에 해당 기능 없음 |
| 색 대비 검사 | 외부 글에는 있으나 공식 도움말에는 없음 | 확인 못 함 |

**우리에게 주는 뜻:** Check designs의 추천 순위가 "이름 계층 · 용도(scope)"를 본다는 것은, 우리가 만든 Global(숨김) → Semantic(scope 설정) 구조가 Check designs에서도 그대로 좋은 결과를 낸다는 뜻이다(추정). 두 도구는 경쟁만이 아니라 *우리가 만들고 → 피그마가 지킨다*는 보완 관계로도 설명할 수 있다.

관련 사실: Variables REST API는 Enterprise Full 좌석 전용이다 [공식, developers.figma.com]. 플러그인 API로 변수를 다루는 데에는 이 제한이 없다 — 우리가 모든 요금제에서 돌아가는 이유.

---

## 4. 직접 돌려 보는 비교 (실측) — 미완

조사만으로는 결과물이 어떻게 나오는지(구조·개수·이름) 알 수 없다. 같은 파일로 직접 돌려서 아래 표를 채운다. **소요: 약 1시간.**

### 4.1 준비
**테스트 파일 (만들어 둠, 2026-11-09):** [DSL 경쟁 실측 — 테스트 파일](https://www.figma.com/design/ipZ1RCPJCMq51nS9p6ErFw) — kahee 팀(Professional) Drafts. 페이지 `실측`에 실측 대상 `test-screen`과 오른쪽 `정답지 (측정 기준)` 프레임이 있다.

| 조건 | 파일에 넣은 것 |
|---|---|
| 카드 3개 반복(텍스트만 다름) | Revenue · Users · Orders 카드 — 구조 같음, 컴포넌트 아님 |
| 버튼 2종 | Save(채움) · Cancel(외곽선) |
| 색 8개 이상(반복 포함) | 9개: `#F9FAFB` `#FFFFFF` `#111827` `#6B7280` `#E5E7EB` `#F3F4F6` `#2563EB` `#DCFCE7` `#16A34A` |
| 간격 · 모서리 | 간격 4 · 8 · 12 · 16 · 24 / 모서리 4 · 8 · 999 |
| 글자 | 크기 24 · 16 · 14 · 12, 카드 본문 행간 150% (3곳) |
| 보호 확인용 | Save 버튼 채움 = 기존 변수 `Existing / color/brand` · Dashboard 제목 = 텍스트 스타일 `Heading/H1` |
| 기본 이름 레이어 | 13개 (`Frame n` · `Rectangle n`) |
| **함정 값** (같은 값이 아님 — 연결되면 "잘못 연결") | 푸터 글자색 `#6B7281`(본문 `#6B7280`과 1 차이) · 푸터 위아래 여백 15(16과 1 차이) |

함정 값은 "비슷한 값까지 묶는 도구"와 "같은 값만 연결하는 우리"(명세 §2.11)의 차이를 숫자로 보기 위해 넣었다.

**순서**
1. 플러그인마다 `실측` 페이지를 **복제**해서 그 복제본에서 실행한다(결과가 섞이지 않게).
2. 실행할 때는 **`test-screen` 프레임만** 선택한다. 정답지 프레임까지 선택하면 결과가 오염된다.
3. 커뮤니티 페이지에서 가격 · 사용자 수 · 마지막 업데이트를 적는다.
4. 결과를 정답지와 대조해 §4.3을 채운다.

이 파일은 Professional 팀에 있어 피그마 Check designs는 돌릴 수 없다(§3). Check designs까지 비교하려면 Organization 이상 요금제의 파일이 따로 필요하다.

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

- 근거: Check designs가 없는 Professional·Starter 사용자 [공식] / Tokens Studio Team(연 €468)의 약 1/13 가격 [공식] / 이름 정리와 계층 자동 구성은 다른 도구에 없음.

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

- [x] Tokens Studio Team 가격과 Free 범위를 공식 페이지에서 확인해 §2 갱신 (2026-11-09) — 남은 것: Team 월 결제 가격(€49로 보임)은 가격 페이지에서 직접 눈으로 확인
- [x] §4 실측용 테스트 파일 만들기 (2026-11-09, §4.1 링크)
- [ ] §4 실측 표 채우기 (약 1시간)
- [x] Check designs 도움말 문서에서 Professional 지원 여부 확인 (2026-11-09: 지원 안 함)
- [ ] 위 도움말의 "Who can use this feature"가 바뀌었는지 분기마다 1번 확인 (다음: 2027-02)
- [ ] 실측 결과로 §5 "내세울 것" 문구를 확정해 스토어 소개(`store/`)에 반영할지 결정

---

## 7. 출처

**Tokens Studio**
- [Tokens Studio Pricing](https://tokens.studio/pricing) · [Starter Plus](https://tokens.studio/starter-plus) [공식]
- [G2](https://www.g2.com/products/tokens-studio/pricing) · [designtools.fyi](https://designtools.fyi/tools/tokens-studio) · [tooltrim](https://tooltrim.com/en/tool/figma-tokens) [외부]

**피그마 Check designs · 요금제**
- [Check designs in Figma (도움말)](https://help.figma.com/hc/en-us/articles/39592284074263-Check-designs-in-Figma) · [Figma Threads — Check Designs GA](https://www.threads.com/@figma/post/DZK7pu0m_tR) · [Schema 2025 recap](https://www.figma.com/blog/schema-2025-design-systems-recap/) · [Figma plans and features](https://help.figma.com/hc/articles/360040328273) · [Variables REST API](https://developers.figma.com/docs/rest-api/variables) [공식]
- [createwith](https://www.createwith.com/tool/figma/updates/figma-releases-check-designs-for-design-system-compliance-across-team-plans) · [Medium — Figma's New Linter](https://medium.com/@iamfilipp/figmas-new-linter-sees-the-mess-it-can-t-see-the-cost-d3130713b2e0) [외부]

**플러그인**
- [bindy](https://www.figma.com/community/plugin/1567266906129777058/bindy-generate-bind-figma-variables-automatically) · [Values to Variables](https://www.figma.com/community/plugin/1527741249144777105/values-to-variables) · [Selection to Variables](https://www.figma.com/community/plugin/1615136997796434946/selection-to-variables) · [Convert styles to variables…](https://www.figma.com/community/plugin/1682711656065145288/convert-styles-to-variables-link-hard-coded-values-to-variables-find-and-delete-unused-variables) · [Componentizer](https://www.figma.com/community/plugin/1050200692173775681/componentizer) · [Component repeater](https://www.figma.com/community/plugin/1446899745376796238/component-repeater) [목록]
- [Huekit — Tokenify 소개](https://huekit.io/blog/replace-hard-coded-colors-with-variables-figma) · [Figma Design to Components](https://www.figma.com/solutions/design-to-components/) [외부·공식]
