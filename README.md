# Design System Linker (Figma 플러그인)

선택한 레이어의 값(색 · 간격 · 반경 · 글자 등)을 찾아 **Figma 변수로 만들고**, 값이 같은 변수를 레이어 속성에 **연결**하고,
파일의 변수를 한 곳에서 **보고 고치고 내보내는** 플러그인이다. 레이어 이름을 역할에 맞게 정리하는 일도 한다.

이 문서는 **지금 코드가 하는 일**의 한 장 요약이다. 순서 · 결정 · 지난 기록은 [`ROADMAP.md`](ROADMAP.md)에 있다.

## 지키는 다섯 가지

기준은 [`docs/invariants.md`](docs/invariants.md)다. 이 문서와 어긋나면 그 문서가 맞다.

1. **맞추기**(자동 연결)는 같은 값만 붙이고, 화면을 바꾸지 않으며, 이미 붙은 연결을 건드리지 않는다.
2. **지정**은 사용자가 변수나 스타일을 집어 덮어쓰는 일이다. 값이 바뀌면 그 사실을 버튼과 결과 문장에 쓴다.
3. **만들기는 플러그인 컬렉션만** 고친다. 사용자 컬렉션은 후보로만 읽는다. 플러그인이 만드는 계층은 Global · Semantic 둘뿐이다.
4. **모르겠으면 이름을 두지 않는다.** 역할이 구조 폴백이면 레이어 이름은 그대로 둔다.
5. **컴포넌트 등록의 기본은 감싸기**다. 노드를 쪼개거나 없는 변형을 만드는 일은 기본으로 꺼 둔다.

아직 코드가 다 따르지 않는 곳은 아래 각 절에 "바뀔 예정(ROADMAP §0 S-x)"으로 적었다.

## 화면

- **창:** 560×510 고정. 최소화하면 140×104(펼치기 버튼만). 드래그로 크기를 바꿀 수 없다(`src/lib/uiSize.ts`).
- **머리 줄:** 탭 **선택 · 변수** 둘 + ⚙ **설정** 버튼 + 최소화 버튼. 설정은 탭이 아니라 따로 열리는 화면이다.
- **선택 탭 첫 화면:** 카드 "변수 없는 값 {n}곳"([{n}곳 연결]) · "쓰는 변수 {n}개" · "삭제된 변수 {n}곳"([선택] · [연결 풀기]), 아래 "할 일" 줄 [변수 만들기] · [이름 정리]. 로컬 변수가 없는 파일에서는 만들기 카드가 나온다. 레이어가 300개를 넘는 선택은 자동으로 읽지 않고 [읽기]를 눌러야 읽는다.
  - 바뀔 예정: 카드 모음 대신 진행 줄 "만들기 → 연결 → 관리"로 다시 짠다(ROADMAP §0 S-2).
- **하위 화면:** 연결 · 변수 만들기 · 값을 직접 고르기 · 이름 정리. 머리의 [←]로 돌아간다.
- **공통 상태 줄:** 창 맨 아래 한 줄에 결과 · 잠금 사유 · 실패를 보인다. 바뀔 예정: 없앤다(ROADMAP §0 S-2).
- 피그마에서 바꾼 내용은 탭 · 화면에 들어올 때, 창에 다시 들어올 때, 플러그인 작업 직후에 자동으로 다시 읽는다.

## 기능 — 지금 동작

### 변수 만들기 (선택 탭 › [변수 만들기])
- 선택에서 찾은 값을 **Global**(원시값) · **Semantic**(Global을 가리키는 별칭) · **Text Style** 세 탭의 목록으로 보이고, 켠 줄만 만든다.
- 실행 순서는 만들기 → 다크 모드 → 텍스트 스타일 → 연결 → 이름 정리다. "만든 뒤" 옵션은 [바로 연결] · [이름 정리] · [다크 모드](`src/lib/wizard.ts`).
- 새 변수는 플러그인 컬렉션(`Global` · `Semantic`, 표시 `dsl.owned`)에만 넣는다. 같은 값의 변수가 이미 있으면 새로 만들지 않고 그것을 쓴다("있는 변수"). 직접 만든 변수는 덮어쓰지 않는다. 같은 이름으로 다시 실행하면 값만 맞춘다.
- 플러그인이 만든 Global은 라이브러리 게시에서 숨긴다(`hiddenFromPublishing`). Figma 패널에서는 보인다 — 바뀔 예정: Semantic이 가리키는 Global만 패널에서 숨긴다(ROADMAP §0 S-3).
- `%` · `em` 행간 · 자간은 px 값 변수 하나로 만들고, 원래 단위는 변수 설명에 적는다.
- **값을 직접 고르기**(만들기 화면 맨 아래 링크, 변수 탭 [＋] 메뉴): 색 · 토큰 · 테마 · 타이포 네 단계 화면. 브랜드 팔레트(OKLCH 톤 스케일 · 하모니 · 중립 · 상태색)의 입구가 여기뿐이다. **도구 탭 PR(ROADMAP §0 S-6)에서 삭제 예정**(SC-D2)이고 그때까지 오류는 고치지 않는다.

### 변수 연결 (선택 탭 › [{n}곳 연결]) — 맞추기
- 값이 **같은** 변수만 찾는다(허용오차 없음). 변수의 용도(scope)가 그 속성에 맞아야 한다. 이미 변수나 스타일이 붙은 자리는 건너뛴다.
- 대상: 색(채움 · 선 · 그림자) · 간격 · 안쪽 여백 · 반경 · 선 두께 · 크기 · 레이어 투명도 · 글자 크기 · 행간 · 자간 · 글꼴. 크기는 Fixed일 때만, 여백 · 간격은 오토 레이아웃 프레임에서만.
- 변수별 줄과 스위치로 켠 곳만 연결한다. 값이 같은 기존 텍스트 스타일도 같은 화면의 줄로 연결한다. 300곳씩 나눠 연결하고 진행률을 보인다. 건너뛴 곳은 사유와 함께 따로 볼 수 있다.
- 유료는 맞는 Semantic이 없으면 쓰임에 맞는 이름으로 새로 만들어 붙인다. 무료는 새 Semantic을 만들지 않고, 맞는 Semantic이 없으면 Global에 붙인다.
- 사용자 컬렉션은 고치지 않고 후보로만 읽는다. 지금 코드는 사용자 컬렉션의 계층을 **컬렉션 단위로 내용을 보고** 판정한다(별칭이 80% 이상이면 Semantic, 직접 값이 80% 이상이면 Global, 그 사이는 계층 아님 — `src/lib/tiers.ts`). 바뀔 예정: 컬렉션 단위 판정을 빼고 변수 단위로 고른다(SC-D20, ROADMAP §0 S-2).
- 바뀔 예정: "같은 값" 판정을 함수 하나로 모으고 카드 숫자 · 주 버튼을 그 결과로만 정한다(ROADMAP §0 S-2). 무료로 Global에 붙인 자리에 표시를 남기고 "Semantic으로 올리기"를 둔다(S-3).

### 변수 탭
- 왼쪽 사이드바(로컬 컬렉션 · 그룹) + 오른쪽 목록, 변수 검색, 모드 고르기.
- **변수를 누르면** 지금 선택한 레이어에 그 변수를 붙인다 — 지정이라 이미 붙은 연결도 바꾼다. 우클릭 메뉴: "다른 곳에 연결"(채움 · 선 색 · 글자 색 · 그림자 색 · 간격 · 안쪽 여백 · 모서리) · "상세" · "복제" · "삭제".
  - 결과 문장은 지금 "레이어 {n}개에 {name} 연결"뿐이다. 바뀔 예정: 값이 바뀌면 그 사실을 문장에 쓴다(ROADMAP §0 S-2 · S-4).
- 상세 팝업에서 이름 · 모드별 값 · 별칭을 고친다(⌘Z 한 번으로 되돌림). 이름 · CSS 변수명 복사, 쓰인 곳 보기.
- **[＋] 메뉴:** "새 변수" · "선택에서 변수 만들기…" · "다크 모드 만들기…" · "텍스트 스타일 만들기…".
- **[⋯] 메뉴:** "코드로 내보내기…" · "색 격자로 보기 / 색 목록으로 보기" · "사이드바 모두 펼치기" · "사이드바 모두 접기" · "안 쓰는 변수 찾기…".
- 바뀔 예정: 고치는 단계를 줄이고, 안 쓰는 변수 찾기 · 내보내기를 머리 줄 아이콘으로 꺼낸다(ROADMAP §0 S-4).

### 이름 정리 (선택 탭 › [이름 정리])
- 레이어의 역할을 구조로 판정해 kebab-case 이름 `{맥락}-{역할}`을 제안한다. 트리 미리보기에서 켠 이름만 바꾼다(⌘Z로 되돌림). 같은 이름이 겹쳐도 숫자를 붙이지 않는다.
- 그대로 두는 것: 선택의 맨 위 프레임(역할이 뚜렷하면 바꾼다) · 컴포넌트 · 컴포넌트 세트 · 인스턴스(안쪽 포함) · 글자 레이어 · 잠긴 레이어.
- 지금 코드는 역할이 뚜렷하면(`button` · `card` 등) 사람이 지은 이름도 바꾸고, 역할을 못 정한 프레임에는 `container` · `wrapper` 같은 구조 이름을 붙인다(`src/lib/rename.ts`). 바뀔 예정: 사람이 지은 이름은 바꾸지 않고, 구조 폴백 넷(`wrapper` · `container` · `stack-x` · `stack-y`)은 이름으로 쓰지 않는다(SC-D21, ROADMAP §0 S-2b).

### 다크 모드 (유료)
- 플러그인 Global 컬렉션에 `Dark` 모드를 더하고, 색의 밝기만 뒤집어 Dark 칸을 채운다(색상 · 채도는 그대로). Semantic은 모드 하나다.
- 직접 만든 변수 · 다른 변수를 가리키는 변수 · 직접 고친 Dark 칸은 그대로 둔다. 다크가 Semantic 모드에 있던 옛 구조는 확인을 받은 뒤 옮긴다(`src/lib/themeApply.ts`).
- 입구: 만들기 화면 "만든 뒤" [다크 모드] · 변수 탭 [＋] › "다크 모드 만들기…".

### 텍스트 스타일 (등록은 유료 · 기존 스타일 연결은 무료)
- 선택의 글자에서 글꼴 · 크기 · 행간 · 자간 조합을 모아 텍스트 스타일로 등록하고, 스타일에 쓸 글자 크기 · 줄 높이 · 자간 변수도 함께 만든다. 이름은 KRDS 규칙 `{분류}/{단계}`를 따른다([`docs/text-style-krds.md`](docs/text-style-krds.md)).
- 입구: 만들기 화면 Text Style 탭 · 변수 탭 [＋] › "텍스트 스타일 만들기…".

### 코드로 내보내기 (무료)
- 변수 탭 [⋯] › "코드로 내보내기…" 팝업. 형식은 "W3C 토큰 JSON" 또는 "CSS 변수" 가운데 하나, 폰트 크기 단위는 px 또는 rem(기준 크기로 나눔).
- [내보내기]를 누르면 `tokens.json` 또는 `tokens.css` 파일로 저장한다. Semantic의 별칭은 참조(`{…}` · `var(--…)`)로 남는다.

### 안 쓰는 변수 찾기 (무료)
- 변수 탭 [⋯] › "안 쓰는 변수 찾기…". 파일의 모든 페이지를 읽어 어디에도 쓰이지 않는 로컬 변수를 찾고, 켠 변수만 지운다(⌘Z로 되돌림).
- 다른 파일에서 쓰는 변수는 확인하지 못한다. 규칙은 [`docs/unused-vars.md`](docs/unused-vars.md).

### 설정 (⚙)
- 기본값: 기준 크기(16px) · 이름 정리 깊이(8) · 여백 격자(8px). 기기에 저장한다(`clientStorage` `dsl.settings`).
- 라이선스: 키 입력 · [검증] · [해제], [유료 구매하기 ↗] / [구독 관리 ↗].

### 컴포넌트
지금 컴포넌트 기능은 없다. 옛 기능(후보 찾기 · 등록 · 변형 세트 정리)은 S-1b에서 화면 · 코드 · 테스트째 지웠다(2026-11-24 SC-D13 — 마지막 코드 커밋 `1b1f419`, 옛 명세는 [`docs/archive/components-v1.md`](docs/archive/components-v1.md)). 새 기능은 [`docs/component-system/`](docs/component-system/)에서 다시 기획한다.

- 전에 등록으로 만든 "Components" 페이지 · 컴포넌트 · 변형 세트 · 인스턴스는 파일에 그대로 둔다(지우거나 되돌리지 않는다).
- 연결이 인스턴스의 메인 컴포넌트를 함께 다루는 규칙과, 이름 정리가 컴포넌트 · 인스턴스 이름을 그대로 두는 규칙은 바뀌지 않았다.

## 무료 / 유료

기준은 `src/lib/entitlements.ts`(`Tier = 'free' | 'paid'`)와 `src/code.ts`의 `requirePaid`다. 횟수 · 개수 한도는 없다.

| | 무료 | 유료 |
|---|---|---|
| 변수 만들기 | Global 변수(만들기 화면 Global 탭 · 브랜드 팔레트 · 새 변수 · 복제) | + Semantic 변수(플러그인 Semantic 컬렉션의 새 변수 · 복제 포함) |
| 연결 | 있는 변수에 연결(새 Semantic은 만들지 않음) · 기존 텍스트 스타일 연결 | + 맞는 Semantic이 없으면 만들어 연결 |
| 변수 탭 | 눌러서 붙이기 · 고치기 · 삭제 · 내보내기 · 안 쓰는 변수 찾기 | 같음 |
| 이름 정리 | ○ | ○ |
| 텍스트 스타일 등록(읽기 · 미리보기 포함) | — | ○ |
| 다크 모드 | — | ○ |

- 유료 버튼은 무료에서 🔒로 잠겨 있고, 누르면 "유료 기능이에요 · 설정 › 라이선스에서 풀 수 있어요"를 보인다.
- 가격 표기는 "무료 · 유료 연 $39 · 기기 1대"다. 키는 LemonSqueezy가 발급하고 검증 서버(`workers/verify`, Cloudflare Worker)가 서명한 토큰을 준다. 오프라인이면 저장된 라이선스로 14일 동안 쓴다.
- **지금은 배포 전이다.** `manifest.json`의 네트워크는 `none`이고 `src/lib/licenseConfig.ts`의 주소 · 공개키가 자리표시라, 키 검증과 구매 링크는 아직 동작하지 않는다. 개발 빌드(`npm run build:dev` · `npm run watch`)에서만 티어를 강제로 바꿀 수 있다.
- 디자인 데이터는 밖으로 보내지 않는다. 밖으로 나가는 것은 라이선스 확인 요청뿐이다.

## 개발

```bash
npm install
npm run build      # dist/code.js · dist/ui.html(스크립트 인라인) · dist/pure.mjs · dist/figma-lib.mjs
npm run watch      # 바뀌면 다시 빌드(개발 빌드)
```

Figma 데스크톱 › Plugins › Development › Import plugin from manifest…에서 `manifest.json`을 고른다.

검사는 넷이고 CI도 넷을 모두 돈다.

```bash
npx tsc --noEmit
npm test
npm run verify:i18n
CHROMIUM_PATH=/opt/pw-browsers/chromium node scripts/verify-bind-flow.mjs
```

- `dist/`는 커밋한다(`manifest.json`이 `dist/code.js` · `dist/ui.html`을 가리킨다). `.gitignore`에 있으므로 `git add -u`로 올린다.
- 화면에 보이는 글은 모두 `src/lib/i18n.ts`에 둔다. `verify:i18n`과 `test/terms.test.mjs`가 검사한다.

## 소스 구조

```
src/
  code.ts              플러그인 쪽 시작점 · 메시지 처리(figma.* 호출)
  ui.html · ui.ts      화면(HTML · CSS) · 화면 동작
  treeList.ts          트리 목록 그리기(연결 · 만들기 · 이름 정리가 함께 씀)
  shared/messages.ts   code ↔ ui 메시지 타입
  lib/
    extract.ts · tokens.ts          선택에서 값 찾기 · 토큰 모델과 단위 환산
    variables.ts                    변수 만들기 · 고치기 · 복제 · 삭제, 텍스트 스타일 읽기 · 등록
    usageRoles.ts · roles.ts        Semantic 이름 짓기(쓰임 이름) · 역할 이름 추천
    tiers.ts · collectionRoles.ts   플러그인 컬렉션 고르기 · 사용자 컬렉션 계층 판정
    bind.ts · scopes.ts             같은 값 찾기 · 연결 · 쓰는 곳 세기 · 용도 규칙
    bindGroups.ts · bindDisplay.ts  연결 후보를 변수별로 묶기 · 속성 이름을 읽는 말로
    selCards.ts                     선택 탭 카드의 숫자
    applyVar.ts · varKind.ts        변수 눌러 붙이기 · 변수 종류와 붙일 속성
    varTable.ts · treeState.ts      변수 탭 목록 계산 · 트리 스위치 계산
    unusedVars.ts                   안 쓰는 변수 찾기
    rename.ts · naming.ts           이름 정리(역할 판정 · 이름 규칙)
    nodePaint.ts                    칠하기 · 레이어 타입 판정 공용 부품
    textStyles.ts · krdsType.ts     텍스트 스타일 묶기 · KRDS 이름
    themeApply.ts · themeGen.ts     다크 모드 채우기 · 밝기 뒤집기
    color.ts · colorName.ts · colorCluster.ts · palette.ts   색 변환 · 색 이름 · 비슷한 색 묶기 · 브랜드 팔레트
    exporters.ts                    W3C 토큰 JSON · CSS 변수 내보내기
    wizard.ts                       만들기 화면 실행 순서 · 결과 문장
    entitlements.ts · license.ts · licenseToken.ts · licenseConfig.ts   무료 · 유료 · 라이선스
    i18n.ts · errors.ts             화면 글 · 오류를 읽는 말로
    uiSize.ts · reread.ts · a11y.ts · undo.ts   창 크기 · 다시 읽기 · 탭 키보드 · ⌘Z 한 번
    componentLike.ts                이름 정리가 쓰는 아이콘 프레임 · 짧은 한 줄 글 판정
    pure.ts · figma-lib.ts          테스트용 묶음(→ dist/pure.mjs · dist/figma-lib.mjs)
test/                  node --test — pure · palette · figma · tree · wizard · colorCluster · terms · verify
scripts/               verify-i18n · verify-bind-flow · update · gen-license-keys · sync-roadmap-notion
workers/verify/        라이선스 검증 서버(Cloudflare Worker)
build.mjs              esbuild 빌드
```

## 문서 길잡이

| 문서 | 내용 |
|---|---|
| [`docs/invariants.md`](docs/invariants.md) | 불변식 다섯 가지 — 다른 문서 · 코드와 어긋나면 이 문서가 기준 |
| [`docs/ia-v4.md`](docs/ia-v4.md) | 화면 명세(기준) |
| [`docs/ia-v3.md`](docs/ia-v3.md) | 토큰 · 연결 규칙 — 아직 유효한 절만 |
| [`ROADMAP.md`](ROADMAP.md) | 지금 할 일 순서(§0) · 요금 · 출시 · 완료 기록 |
| [`docs/qa/2026-11-24-scope-review.md`](docs/qa/2026-11-24-scope-review.md) | 범위 결정 SC-D1–SC-D31 |
| [`docs/component-system/`](docs/component-system/) | 새 컴포넌트 기능 기획 |
| [`docs/archive/components-v1.md`](docs/archive/components-v1.md) | 지운 옛 컴포넌트 기능의 명세 · 결정 기록(보관) |
| [`docs/text-style-krds.md`](docs/text-style-krds.md) · [`docs/unused-vars.md`](docs/unused-vars.md) | 텍스트 스타일 이름 규칙 · 안 쓰는 변수 찾기 명세 |
| [`CLAUDE.md`](CLAUDE.md) | 작업 순서 · UI 규칙 · 검사 |
| [`REDESIGN.md`](REDESIGN.md) | v2 기록(지금 기준 아님) |
