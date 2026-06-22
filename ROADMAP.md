# Design System Linker — 로드맵

> 이 파일은 Notion 로드맵 페이지의 **단일 소스**입니다. `main`에 푸시하면 GitHub Action이
> Notion 페이지를 체크박스 목록으로 자동 동기화합니다. 상세 설계는 `README.md` 참고.

## 범례
- `[x]` 구현 완료 — 별도 표기 없으면 **main 병합**. `(PR #N)`는 브랜치 구현 완료·**병합 대기**.
- `[ ]` 예정.

## 1. 핵심 기능
- [x] **토큰 추출** — 선택에서 색·타이포·간격·반경·효과 후보 추출
- [x] **3계층 변수 생성** — Global(원시) → Semantic(별칭) → Component, 멱등 upsert
- [x] **시맨틱 매핑** — 역할(surface/text/…) → Global 별칭
- [x] **비색상 시맨틱 추천** — 간격·반경 티셔츠 스케일 자동 추천·병합 `(PR #31)`
- [x] **자동 바인딩** — 가장 가까운 변수에 연결(허용오차)
- [x] **레이어 리네임(역할 기반 재설계)** — 시맨틱 역할 추론·숫자 제거·맥락 정제, diff 미리보기
- [x] **브랜드 팔레트 생성** — OKLCH 톤 스케일·하모니·중립·상태색
- [x] **코드 내보내기** — W3C 디자인 토큰 JSON / CSS 변수 (px·rem)
- [ ] **텍스트 스타일** — 화면 텍스트 스캔 → 시맨틱 변수 → 텍스트 스타일 등록·바인딩(+원본 적용) `(PR #32)`
- [x] **시스템화 마법사** — 추출→생성→바인딩→정돈(리네임)→접근성 검수 **원클릭** 파이프라인(`wizard.ts`)

## 2. 컴포넌트 / 베리언트 (유료)
- [x] **Phase 3 — 컴포넌트 등록 + 베리언트 분류** (속성=값 추론, `combineAsVariants`)
- [x] **Phase 4 — 누락 조합 자동 생성** (2D 그리드 정렬·리사이즈)
- [x] **Phase 4.1 — 컴포넌트 속성 노출** (TEXT / INSTANCE_SWAP / BOOLEAN)
- [ ] **라이브러리 발행** — Figma Plugin API 미지원 → 수동/조직 정책

## 3. UI / 메뉴 개편
- [x] **탭 3개 재편** — 만들기 / 적용 / 관리 (sticky 탭바)
- [x] **패널 톤앤매너 정렬** — 목업 기준 시각 정리
- [x] **시스템화 마법사 진행 안내** — 단계 정의·순서·읽기/쓰기 구분(`wizard.ts`)
- [x] **유료 게이팅 노출** — 유료 카드 🔒 배지 (부분)
- [ ] **잔여** — 단계별 의존관계 시각화 고도화

## 4. UX 개선
- [x] **UX1~UX8** — 미리보기·단일 Undo·사유별 스킵·빈 상태·선택 동기화·진행률/취소·오류 복구·접근성(키보드)
- [x] **UX9 명도 대비 점검** — WCAG AA/AAA 읽기 전용 감사(`contrast.ts`)
- [ ] **잔여** — i18n 문자열 외부화 · 점진 렌더

## 5. 유료화 / 상용 전환 — Free/Paid 2티어 `(PR #30, 병합 대기)`
> 결정된 방향. 현재 main 코드는 아직 3티어(free/pro/team)이며 2티어 전환은 PR #30에서 진행.

- **모델**: 오픈 코어 + Freemium. **Free / Paid 2티어**(연 구독). 외부 결제 → 라이선스 키 → 서명 토큰 검증.
- **게이팅**: **기능 기반**(회당 횟수 한도 없음). 미리보기는 Free, 생성·등록은 Paid.

### 티어 경계 (기능 게이팅)
- **Free(무제한)**: 팔레트 · 리네임 · 바인딩 · 토큰 추출/미리보기 · 명도 대비 점검 · 코드 내보내기
- **Paid**: 위 전부 + 토큰(3계층 변수) 생성 · 시맨틱 매핑 · 컴포넌트/베리언트 · 텍스트 스타일 · 공유 프리셋/이력

### 가격
- **Paid 연 $39**(≈$3.25/월) 단일. (월 옵션·런치 프로모는 추후)

### 결제 / 검증
- **결제: LemonSqueezy**(MoR, 5%+$0.50) — 로그인 없는 **키 기반**, **기기 1대**(activation limit), 구독·기기 관리는 LS Customer Portal 위임.
- **검증: Cloudflare Worker(무료, `workers/verify`)** — LS 검증 → ES256 서명 JWT 발급. 플러그인은 공개키 검증 + 오프라인 grace.
- **비용**: 고정비 ~$0(서버리스·DB 없음), 변동비는 결제 수수료뿐.

### 보안 / 관리
- [x] **개발용 티어 토글을 `__DEV__` 빌드 플래그로 dev 빌드 전용화**(배포 빌드 백도어 차단) `(PR #30)`
- [x] **오너 관리자 키**(Worker allowlist) — 결제 없이 paid 토큰(스모크 테스트) `(PR #30)`

### 출시 단계
- [x] **M1** 엔타이틀먼트 + 개발용 티어 토글
- [x] **M2** 라이선스 키 입력·검증 + 캐시·오프라인 grace
- [x] **M2.1** 서명 토큰(JWT) 검증 코어 (alg=none 거부)
- [x] **M2.2** 검증을 UI 아이프레임으로 이동(WebCrypto)
- [x] **M3 / M3.1** 공유 프리셋 · 변경 이력 (부분)
- [x] **2티어 전환 + 기능 게이팅 + 검증 Worker(C) 작성** `(PR #30, 병합 대기)`
- [ ] **배포** — Worker 배포 · 키쌍/URL 교체 · LS 스토어·제품 설정

## 6. 배포 전 남은 일
- [ ] `licenseConfig.ts` `VERIFY_URL`·공개키·`PURCHASE_URL`·`PORTAL_URL`, `manifest.json` `allowedDomains` 실제 값 교체 (가이드: `workers/verify/README.md`)
- [x] 결제 제공자 선택(**LemonSqueezy**) · 검증 서버 코드(**Cloudflare Worker**) 작성 — *배포만 남음* `(PR #30)`
- [x] 가격 확정 — **연 $39**
- [x] **빌드 타깃 es2017** — Figma 샌드박스 객체 스프레드 호환
- [x] **플러그인 산출물(dist) 커밋** — 브랜치/main에서 직접 로드 가능
- [ ] Figma 정책(외부 결제/키 방식) 최종 확인
- [ ] Figma Community 게시 (아이콘·커버·캐러셀·소개글 — `store/figma-listing.md`)

## 7. 프라이버시
- 토큰·디자인 데이터는 **로컬 처리**. 외부 전송은 **라이선스 검증 요청(키 + pluginId)** 에 한정 — 디자인 데이터 미전송.

## 8. v2 재설계 — 결정 완료·구현 대기 (상세: `REDESIGN.md`)
> 확정된 방향. 엔진(`lib/` 순수 함수)은 대부분 유지, **UI/IA · 결과 표면화 · 색 계층 정렬** 중심. 우선순위 상위부터 점진.

### 8.1 미리보기·적용 — 선택형 레이어 트리
- [ ] 공통 **미리보기→선택→적용 트리** 컴포넌트 (전체 서브트리 + 영향 노드 강조)
- [ ] 리네임 트리 미리보기 (파일럿)
- [ ] 바인딩 트리 미리보기 + **WYSIWYG 직접 적용**(`APPLY_SELECTED`)
- [ ] 컴포넌트 등록 — 선택 디자인 **하위에서 골라** 등록

### 8.2 리네임 규칙 보강
- [ ] 루트(최종) 프레임 **항상 보존**(기본명 포함)
- [ ] 인스턴스 **서브트리까지 스킵** (기존 보존: 컴포넌트·텍스트·잠금·명명 레이어)

### 8.3 색·토큰 계층 정렬 — Global=primitive / Semantic=role
- [ ] 팔레트 Global을 **hue로 통일**(`color/blue/500`), 역할은 Semantic만 (신규만, 마이그레이션 X)
- [ ] 동일 hue 충돌 **접미사 인덱스**
- [ ] 추출 색 **편집표**(hue→역할 자동추천·확정)
- [ ] 시맨틱 매핑 **일반화 + 기존 Global 스캔** (추출·재방문 모두 매핑)
- [ ] 전 토큰 역할 어휘 확장 (색 우선→spacing/radius/size; **size=icon 최소·effects=후순위 보류**)
- [ ] **단위 토큰 단일화** — px FLOAT + `description`("160%"), 내보내기는 description 우선

### 8.4 IA · UX
- [ ] 시스템화 마법사 **별도 탭(시작)**
- [ ] **4탭 재편**(시작·만들기·적용·관리, 색은 만들기 안)
- [ ] 판넬 **크기 확대 + 리사이즈**
- [ ] 불필요 **텍스트·불릿 정리**
- [ ] **통합 게이트** — 전제 미충족 + 유료 🔒 한 메커니즘

### 8.5 신규 · 정리
- [ ] 명도 대비 **후속 보정**(텍스트색 기본 + 배경 옵션)
- [ ] **변경 이력 제거**
- [ ] 내보내기 미리보기 **비목표**(현행 유지)

---

## 9. 구현 진행 현황 — 개발 환경 이전용 핸드오프 (2026-06-22)
> v2 우선순위 **①(공통 선택형 미리보기 트리)** 착수. 파일럿 = **리네임(#7·#7b·#13)**.
> 작업 브랜치 **`feat/preview-tree-rename`**(`main`에서 분기). 엔진·테스트·메시지·핸들러는 **완료(커밋됨)**, **UI는 미착수**.

### 9.1 환경 이전 절차
- 작업본은 커밋 `원격 이전을 위한 로컬 작업본 임시 커밋`에 들어 있고 **origin에 푸시함**.
- 새 환경: `git fetch && git checkout feat/preview-tree-rename` → `npm test`(빌드+테스트, **109 pass** 확인) → 아래 9.3부터 이어서.
- 임시 커밋이라 UI 완료 후 정리(squash)·정식 커밋 권장. (참고: README에 §5 Team 티어 "지금은 구현 안 함" 메모 1줄이 미커밋 상태일 수 있음 — 본 작업과 무관.)

### 9.2 완료(커밋됨 · 순수 로직 `node --test` 통과)
- [x] `src/shared/messages.ts` — `PreservedReason`·`RenameNode{id,type,before,after,changed,depth,parentId,preserved}` 추가. `RENAME_RESULT`에 `nodes`+`capped` 추가. 신규 `APPLY_RENAME{renames:{id,after}[]}`(UI→code)·`RENAME_APPLIED{count}`(code→UI).
- [x] `src/lib/rename.ts` — **전체 서브트리** 방출(`RenameNode[]`), `changes`는 파생(하위호환). 안전 상한 `MAX_NODES=5000`. **#7b-1** 루트 컨테이너 항상 보존, **#7b-2** 인스턴스 하위 서브트리 스킵. 자식 맥락은 **의미 있는 이름만** 전파(기본명·토큰베낌명 잡음 차단).
- [x] `src/code.ts` — `RENAME`이 `nodes`+`capped` 전송. 신규 `APPLY_RENAME` 핸들러(`getNodeByIdAsync`로 체크분만 직접 적용=WYSIWYG, 소실 노드 graceful skip, `record`+`commitUndo`).
- [x] `test/figma.test.mjs` — 단일 기본명 루트를 쓰던 6개 테스트를 보존 루트 하위로 래핑, **신규 3개**(#7b-1·#7b-2·트리 출력). 총 109 pass.
- [x] `dist/code.js` 재빌드 반영.

### 9.3 다음 작업 — UI (미착수, 여기서 이어서)
- [ ] **공통 트리 컴포넌트** `renderSelectableTree(host, rows, opts)` → `{getChecked, setAll, count}` (ui.ts). row=`{id,parentId,depth,label,detail,checkable,checked,muted,chip,hasChildren}`. 기본: 영향 노드 체크·강조, **체크 가능한 후손이 없는 컨테이너는 접힘**, 부모 체인 가시성 토글(▸/▾).
- [ ] **리네임 어댑터** `renderRenameTree(nodes, applied, capped)` — `RenameNode→row` 매핑. 보존 라벨: root=루트·instance=인스턴스·component=컴포넌트·text=텍스트·locked=잠김·named=유지.
- [ ] `ui.html` 리네임 카드(약 247–260행): `#diff`→`#renameTree`로 교체 + 툴바(전체 선택/해제·개수) + 트리 CSS(들여쓰기·토글·체크박스·강조/회색·사유 칩).
- [ ] `ui.ts` 배선: `RENAME_RESULT`(716행)에서 `lastRenameNodes` 저장 후 트리 렌더(`renderDiff` 대체). `btnRename`(216행)을 `RENAME apply:true`→**체크분 수집 후 `APPLY_RENAME`**로 변경. `btnPreview`(205행)는 `RENAME apply:false` 유지. `RENAME_APPLIED` 핸들러 추가. 구 `renderDiff`(872행) 제거.
- [ ] **마법사 경로 유지**: `ui.ts:384`는 `RENAME apply:true`로 전체 적용 후 `r.changes.length` 사용 — 그대로 동작해야 함(회귀 확인).
- [ ] 빌드(`npm run build`) + Figma 수동 로드로 미리보기→선택→적용 검증.

### 9.4 후속 PR (이 트리 컴포넌트 재사용)
- [ ] **#6 바인딩** 트리 미리보기 + `APPLY_SELECTED`(=WYSIWYG). `bind.ts`에 `BindCandidate[]` 신설(dry-run 시 채움).
- [ ] **#1 컴포넌트 등록** — 선택 디자인 **하위 picker**. 신규 `SCAN_COMPONENT_CANDIDATES`→트리→`REGISTER_COMPONENTS{nodeIds}`.
