/* ============================================================
   i18n.ts — UI 문자열 단일 소스 + 룩업/보간 (순수, figma 의존 없음)
   현재 로케일은 ko 단일. t(key, vars)로 조회하고 `{var}` 자리표시자를 치환한다.
   누락 키는 key를 그대로 반환(폴백) — 디버그·점진 도입 안전.
   ※ 런타임 문자열(상태/피드백)을 외부화. HTML 정적 라벨은 후속.
   ============================================================ */

export type StringVars = Record<string, string | number>;

/** 런타임 UI 문자열(ko). 키는 영역.용도 점 표기. `{var}`는 보간 자리표시자. */
export const STRINGS: Record<string, string> = {
  // 공통 진행/상태
  'common.applyingVars': '변수에 적용 중…',
  'common.exporting': '내보내는 중…',
  'common.verifying': '검증 중…',
  'common.running': '실행 중…',

  // 팔레트
  'palette.invalidHex': '브랜드색을 #RRGGBB 형식으로 입력하세요.',
  'palette.summary': '{count}계열 · {tokens}색 생성',
  'palette.hint': '{warn}하모니를 바꿔 다시 생성하거나, ‘적용’으로 변수에 반영하세요.',

  // 추출 / 토큰 생성
  'create.preview': '미리보기 — {summary} · ‘적용’으로 반영',
  'create.colorsDone': '색 변수 {count}개 이미 생성됨 · 여기선 색 외만',
  'color.summary': '색 {count}개 · 역할 지정 {roles} · 변수화 대기',
  'color.needColors': '먼저 ‘선택에서 추출’ 또는 ‘팔레트 생성’으로 색을 모으세요.',
  'create.baseChanged': 'base {base}px로 다시 계산 중…',

  // 시맨틱 매핑
  'semantic.scanningGlobals': '기존 색 스캔 중…',
  'semantic.formatHint': '매핑을 한 줄에 “역할 = Global변수이름” 형식으로 입력하세요.',
  'semantic.noGlobals': '기존 Global 색 변수가 없습니다 — 먼저 토큰을 생성하세요.',
  'semantic.suggested': '기존 색 {count}개에서 역할 추천 — 확인 후 ‘시맨틱 별칭 생성’.',
  'semantic.result': '시맨틱 {aliased}개 별칭 (생성 {created} / 갱신 {updated})',
  'semantic.missing': ' · 누락: {names}',

  // 바인딩(적용)
  'apply.cancelRequested': '취소 요청됨 — 다음 지점에서 중단합니다.',
  'apply.cancelled': '취소됨 — 바인딩 {bound}건만 적용{detail}',
  'apply.preview': '미리보기 — 바인딩 {bound}건 후보{detail} · 체크 후 ‘선택에 바인딩’',
  'apply.done': '바인딩 {bound}{detail}',

  // 리네임
  'rename.previewCount': '{total}개 변경 예정 · {sel}개 선택 — ‘이름 적용’.',
  'rename.none': '변경할 이름이 없습니다.',
  'rename.applied': '{count}개 이름 적용 완료.',

  // 컴포넌트 / 베리언트
  'component.scanning': '후보 스캔 중…',
  'component.registering': '컴포넌트 등록 중…',
  'component.classifying': '베리언트 분류 중…',
  'component.generating': '누락 조합 생성 중…',
  'component.noEligible': '선택 하위에 등록 가능한 프레임이 없습니다.',
  'component.noEligibleShort': '등록 가능한 프레임이 없습니다.',
  'component.noChecked': '체크된 후보가 없습니다 — 트리에서 묶을 항목을 선택하세요.',
  'component.candidates': '등록 후보 {total}개 · {sel}개 선택',
  'component.registered': '컴포넌트 {registered} · 베리언트 세트 {sets}{extra}',
  'component.variants': '베리언트 세트 {sets}개 생성{extra}',
  'component.generated': '누락 조합 {generated}개 생성(세트 {sets})',

  // 마법사
  'wizard.needSelect': '먼저 프레임을 선택하세요 — 선택한 레이어에서 토큰을 추출합니다.',
  'wizard.result': '{state} — {summary}',
  'wizard.stopped': '중단',
  'wizard.completed': '완료',

  // 다크 테마 생성
  'dark.title': '다크 테마',
  'dark.hint': '라이트 명도 반전 → Dark 모드(없으면 추가).',
  'dark.collection': '컬렉션',
  'dark.fromMode': '라이트',
  'dark.toMode': '다크',
  'dark.genBtn': '다크 생성',
  // 닮은 프레임 컴포넌트화
  'similar.scanBtn': '닮은 스캔',
  'similar.componentizeBtn': '컴포넌트화',
  // 내보내기
  'export.saved': '{format} — {file}로 저장했습니다.',
  'export.empty': '내보낼 변수가 없습니다. 먼저 토큰을 생성하세요.',

  // 라이선스
  'license.needKey': '라이선스 키를 입력하세요.',

  // 유료 게이팅
  'premium.required': '{message} (유료 기능: {feature})',

  // 마법사 단계 라벨(WIZARD_STEPS id 기준) + 건너뜀 사유
  'wizard.step.extract': '토큰 추출',
  'wizard.step.create': '토큰 생성',
  'wizard.step.semantics': '시맨틱 매핑',
  'wizard.step.bind': '바인딩',
  'wizard.step.rename': '레이어 정돈',
  'wizard.step.componentize': '컴포넌트화',
  'wizard.skip.optionOff': '옵션 꺼짐',
  'wizard.skip.noMapping': '매핑 없음',
  'wizard.skip.paid': 'Paid 전용',

  // 진행 안내(파이프라인) 단계 상태
  'pipeline.stat.done': '완료',
  'pipeline.stat.ready': '준비됨',
  'pipeline.stat.blocked': '전제 미충족',

  // 바인딩 스킵 사유(라벨 맵)
  'reason.no-match': '매칭 없음',
  'reason.empty-text': '빈 텍스트',
  'reason.error': '바인딩 실패',
  'reason.hug-fill': 'HUG/FILL',
  'reason.no-autolayout': '오토레이아웃 아님',
  'reason.size-free-layout': '자유 배치(크기 제외)',
  'reason.size-fraction': '소수 크기(정확 일치만)',
  'reason.hidden': '숨긴 레이어',
  'reason.instance-children': '인스턴스 내부',
  'reason.font': '폰트 미로드',

  // 마법사 시퀀서 단계 결과
  'wizard.seq.stoppedPrev': '이전 단계 중단으로 건너뜀',
  'wizard.seq.running': '진행 중…',
  'wizard.seq.noExtract': '추출된 토큰 없음 — 색·폰트·간격이 있는 프레임을 선택하세요.',
  'wizard.seq.extractDone': '{count}개 후보',
  'wizard.seq.createDone': '생성 {created} · 갱신 {updated}',
  'wizard.seq.semantics': '별칭 {aliased}',
  'wizard.seq.semanticsMissing': ' · 누락 {n}',
  'wizard.seq.bindCancelled': '취소됨 — {bound}건만 적용',
  'wizard.seq.bindDone': '바인딩 {bound}',
  'wizard.seq.bindSkip': ' · 스킵 {n}',
  'wizard.seq.renameDone': '{count}개 이름 적용',
  'wizard.seq.componentize': '등록 {registered} · 세트 {sets}',

  // 마법사 완료 요약(summarize, wizard.ts)
  'wizard.sum.tokens': '토큰 {n}',
  'wizard.sum.bound': '바인딩 {n}',
  'wizard.sum.renamed': '리네임 {n}',
  'wizard.sum.components': '컴포넌트 {n}',
  'wizard.sum.empty': '완료된 작업이 없습니다',

  // 진행 안내 단계 라벨·안내
  'pipeline.step.tokens': '토큰 생성 (Global)',
  'pipeline.step.semantics': '시맨틱 매핑',
  'pipeline.step.bind': '바인딩',
  'pipeline.hint.needTokens': '토큰을 먼저 생성하세요',
  'pipeline.hint.needBindable': '바인딩할 변수를 먼저 생성하세요',

  /* ---------- 정적 HTML 라벨(ui.html, data-i18n[-html]) ---------- */
  'common.cancel': '취소',
  // 탭
  'tab.wizard': '마법사',
  'tab.tokens': '만들기',
  'tab.apply': '적용',
  'tab.settings': '관리',
  // 단계 레일(#5) — 만들기 4단계 · 적용 3단계
  'rail.color': '색',
  'rail.colorSub': '추출·변수',
  'rail.token': '토큰',
  'rail.tokenSub': '간격·크기',
  'rail.theme': '테마',
  'rail.themeSub': '다크',
  'rail.type': '타이포',
  'rail.typeSub': '텍스트 스타일',
  'rail.bind': '바인딩',
  'rail.bindSub': '변수 연결',
  'rail.rename': '리네임',
  'rail.renameSub': '역할 이름',
  'rail.structure': '구조',
  'rail.structureSub': '컴포넌트',
  'rail.next': '다음 →',
  // 플러그인 설정(#19) — 관리 탭에만
  'settings.title': '플러그인 설정',
  'settings.hint': '만들기·적용 탭에서는 안 보임 · 여기서만 변경',
  'settings.base': '기준 크기',
  'settings.depth': '리네임 맥락 깊이',
  'settings.tol': '허용오차',
  'settings.fixed': '고정',
  // 마법사 카드
  'wizardCard.title': '시스템화 마법사',
  'wizardCard.hint': '추출 → 토큰 → 바인딩 → 정돈',
  'wizardCard.optSemantics': '시맨틱 매핑',
  'wizardCard.optComponentize': '컴포넌트화',
  'wizardCard.run': '전체 실행',
  // 공통(정적 라벨)
  'common.selectAll': '전체 선택',
  'prereq.gotoCreate': '토큰 생성으로 →',
  // 온보딩 / 가이드
  // 첫 실행 배너(온보딩 흡수)
  'onboard.banner': '처음이면 전체 실행으로 시작하세요.',
  'onboard.hide': '다시 보지 않기',
  // 진행(파이프라인 카드)
  'pipeline.title': '진행',
  'pipeline.indep': '리네임 · 컴포넌트는 독립',
  // 브랜드 팔레트
  'color.title': '색',
  'color.scope': '추출 → 변수 · 팔레트',
  'color.listHint': '추출·정리된 색 · Global = hue · Semantic = 역할',
  'color.makeVars': '색 변수 만들기',
  'palette.brand2': '보조색',
  'palette.harmony': '하모니',
  'palette.neutral': '중립',
  'palette.status': '상태색',
  'palette.gen': '팔레트 생성',
  // 추출
  'extract.scanBtn': '선택에서 추출',
  // 색 정리(추출 카드에 흡수)
  'colorTidy.hint': '화면에서 뽑거나 시드로 만든 뒤, 역할을 정하고 변수로 만듭니다.',
  'colorTidy.undo': '되돌리기',
  // 토큰 생성
  'create.title': '토큰 생성',
  'create.scopeHint': '간격·크기·폰트·효과만. 색은 이전 단계에서 변수화함.',
  'create.selectAll': '전체',
  'create.dropOnce': '1× 해제',
  'create.previewBtn': '미리보기',
  'create.apply': '적용',
  // 시맨틱 매핑 카드
  'semantic.title': '시맨틱 매핑 (역할 → 토큰)',
  'semantic.formatLabel': '형식: <code>역할 = Global변수이름</code>',
  'semantic.aliasBtn': '시맨틱 별칭 생성',
  'semantic.scanBtn': '기존 색에서 추천',
  // 텍스트 스타일
  'textStyle.title': '텍스트 스타일',
  'textStyle.hint': '이름만 수정 · ×N으로 같은 글자 선택',
  'textStyle.scanBtn': '스캔',
  'textStyle.addRow': '행 추가',
  'textStyle.useRowLabels': '가로 행의 왼쪽 텍스트를 이름으로',
  'textStyle.applyExistingBtn': '기존만 연결',
  'textStyle.applyOriginal': '등록 시 화면에 적용',
  'textStyle.registerBtn': '등록',
  // 적용(바인딩)
  'bind.title': '바인딩',
  'bind.hint': '미리보기 → 골라 → 연결',
  'bind.preview': '미리보기',
  'bind.confirm': '선택에 바인딩',
  'bind.progress': '진행률',
  // 리네임
  'rename.title': '리네임',
  'rename.hint': '역할 이름으로 정돈 · 루트·인스턴스 보존',
  'rename.preview': '미리보기',
  'rename.apply': '이름 적용',
  'rename.undoTitle': '되돌리기 안전장치',
  'rename.undoBody': '이 실행은 한 번의 되돌리기(Ctrl/⌘Z)로 전체를 취소할 수 있습니다.',
  // 컴포넌트 / 베리언트
  'structure.title': '구조',
  'structure.scope': '컴포넌트 · 닮은 프레임',
  'structure.groupComp': '컴포넌트 후보',
  'structure.groupSimilar': '닮은 프레임',
  'structure.groupVariant': '선택한 컴포넌트 정리',
  'component.hint': '후보 스캔 후 등록 · 닮은 프레임은 스캔 Free',
  'component.scanBtn': '후보 스캔',
  'component.registerBtn': '컴포넌트 등록',
  'component.classifyBtn': '베리언트 분류',
  'component.genMissingBtn': '누락 조합 생성',
  'component.scanHelp': '선택 아래에서 버튼·카드 같은 고신뢰 구조 후보를 찾습니다. 숨김·부모 컨테이너는 제외.',
  'component.registerHelp': '체크한 후보를 Components에 등록하고 자리엔 인스턴스를 남깁니다.',
  'component.classifyHelp': '이미 만든 컴포넌트만 같은 이름끼리 세트로 다시 묶습니다.',
  'component.genMissingHelp': '선택한 세트의 빠진 속성 조합을 첫 베리언트 복제로 채웁니다. (Paid)',
  'similar.scanHelp': '구조가 같고 내용만 다른 프레임을 미리 묶습니다. 파일은 안 바꿉니다.',
  'similar.componentizeHelp': '마스터를 컴포넌트로, 나머지는 인스턴스로 바꿉니다. (Paid)',
  // 내보내기
  'export.title': '변수 → 코드',
  'export.hint': 'Figma 변수를 코드 파일로 · 패널 목록·미리보기 없음',
  'export.runBtn': '내보내기',
  // 요금제 / 라이선스
  'license.title': '라이선스',
  'license.verify': '검증',
  'license.clear': '해제',
  'license.devTier': '개발용 강제 티어',
  'license.devTierNote': '(검증된 키가 없을 때만 적용)',
  // 접근성 · 국제화
};

/** 해당 키가 STRINGS에 정의돼 있는가. 정적 라벨 하이드레이션이 오타 키로 원문을 덮지 않도록 쓴다. */
export function hasString(key: string): boolean {
  return Object.prototype.hasOwnProperty.call(STRINGS, key);
}

/** key → 문자열. `{var}` 자리표시자를 vars로 치환. 누락 키는 key 그대로(폴백). */
export function t(key: string, vars?: StringVars): string {
  const tpl = STRINGS[key] ?? key;
  if (!vars) return tpl;
  return tpl.replace(/\{(\w+)\}/g, (_, k: string) => (k in vars ? String(vars[k]) : `{${k}}`));
}
