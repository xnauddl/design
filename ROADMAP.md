# Design System Linker — 로드맵

> 이 파일은 Notion 로드맵 페이지의 **단일 소스**입니다. `main`에 푸시하면 GitHub Action이
> Notion 페이지를 체크박스 목록으로 자동 동기화합니다. 상세 설계는 `README.md` 참고.

## 범례
- ✅ 구현 완료 · 🟡 부분 구현 · ⬜ 예정

## 1. 핵심 기능 (구현 현황)
- [x] **토큰 추출** — 선택에서 색·타이포·간격·반경·효과 후보 추출
- [x] **3계층 변수 생성** — Global(원시) → Semantic(별칭) → Component, 멱등 upsert
- [x] **시맨틱 매핑** — 역할(surface/text/…) → Global 별칭
- [x] **자동 바인딩** — 가장 가까운 변수에 연결(허용오차)
- [x] **레이어 리네임** — 토큰/역할 기반 kebab, diff 미리보기
- [x] **브랜드 팔레트 생성** — OKLCH 톤 스케일·하모니·중립·상태색
- [x] **코드 내보내기** — W3C 디자인 토큰 JSON / CSS 변수 (px·rem)

## 2. 컴포넌트 / 베리언트 (Paid)
- [x] **Phase 3 — 컴포넌트 등록 + 베리언트 분류** (속성=값 추론, `combineAsVariants`)
- [x] **Phase 4 — 누락 조합 자동 생성** (2D 그리드 정렬·리사이즈)
- [x] **Phase 4.1 — 컴포넌트 속성 노출** (TEXT / INSTANCE_SWAP / BOOLEAN)
- [ ] **라이브러리 발행** — Figma Plugin API 미지원 → 수동/조직 정책

## 3. UI / 메뉴 개편
- [x] **탭 3개 재편** — 만들기 / 적용 / 관리 (sticky 탭바)
- [x] **유료 게이팅 노출** — Paid 카드 🔒 배지·비활성
- [ ] **진행 안내** — 단계 완료/대기·의존관계 시각화

## 4. UX 개선 (전 항목 구현 완료)
- [x] **UX1 적용 전 미리보기·확인** — 토큰 생성·바인딩 2단계
- [x] **UX2 단일 Undo** — 작업당 `figma.commitUndo()`
- [x] **UX3 사유별 스킵 그룹** — `BindResult.reasons`
- [x] **UX4 빈 상태 안내** — 추출 목록 도움말
- [x] **UX5 선택 동기화** — 실시간 선택 상태 바
- [x] **UX6 진행률·취소** — 대량 바인딩 진행률 + 협조적 취소
- [x] **UX7 오류 처리·복구** — 사람이 읽는 메시지 + 다시 시도
- [x] **UX8 접근성** — 키보드 탭 내비(roving tabindex)
- [ ] **잔여** — i18n 문자열 외부화 · 명도 대비 점검 · 점진 렌더

## 5. 유료화 / 상용 전환
- 오픈 코어 + Freemium. **Free / Paid 2티어** · 연 $39 · LemonSqueezy(웹 결제 → 키 발급 → 무료 서버리스 검증).
- 무료 동작은 막지 않음. **회당 횟수 한도 없음** — 기능 기반 게이팅(유료 기능은 미리보기 허용·생성만 잠금).

### 티어 매트릭스 (Free / Paid)
- **팔레트·추출·토큰 미리보기·바인딩·리네임·내보내기**: Free ✅ · Paid ✅
- **토큰(3계층 변수) 생성·시맨틱 매핑**: Free — · Paid ✅
- **컴포넌트 등록·베리언트(Phase 3/4/4.1)**: Free — · Paid ✅
- **공유 프리셋·변경 이력**: Free — · Paid ✅

### 가격
- **Paid** — 연 $39 (LemonSqueezy 구독, License keys · activation limit=1 → 기기 1대).

### 검증 아키텍처 (방식 C — 무료 서버리스)
- Cloudflare Worker가 LS 키를 activate/validate → **ES256 서명 JWT** 발급. 플러그인은 공개키로 검증·캐시(오프라인 grace 14일). 고정비 ~$0.

### 출시 단계
- [x] **M1 — 엔타이틀먼트(기능 게이팅) + 개발용 티어 토글 + 백도어 차단**
- [x] **M2 — 라이선스 키 입력·검증 + 캐시·오프라인 grace**
- [x] **M2.1 — 서명 토큰(JWT) 검증 코어** (alg=none 거부)
- [x] **M2.2 — 검증을 UI 아이프레임으로 이동(WebCrypto)**
- [x] **M3 — 공유 프리셋(Paid)**
- [x] **M3.1 — 변경 이력(Paid)**
- [x] **C — Cloudflare Worker 검증기 + LemonSqueezy 연동 + 기기 1대(activation limit) + 해제 시 슬롯 반납**
- [ ] **배포 — 실제 도메인·공개키·결제/포털 링크 교체**

## 6. 배포 전 남은 일
- [ ] `licenseConfig.ts` `VERIFY_URL`·공개키·`PURCHASE_URL`·`PORTAL_URL`, `manifest.json` allowedDomains 실제 값 교체
- [ ] 검증 서버(Cloudflare Worker) 배포 · LemonSqueezy 스토어/제품 설정(License keys, activation limit=1)
- [ ] Figma 정책(외부 결제/키 방식) 확인
- [ ] Figma Community 게시 (아이콘·커버·캐러셀·소개글 — `store/figma-listing.md`)

## 7. 프라이버시
- 토큰·디자인 데이터는 **로컬 처리**. 외부 전송은 **라이선스 검증 요청(키 + pluginId)** 에 한정 — 디자인 데이터 미전송.
