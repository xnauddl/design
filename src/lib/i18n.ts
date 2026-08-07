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
  'palette.invalidHex2': '보조색을 #RRGGBB 형식으로 입력하세요.',
  'palette.summary': '{count}계열 · {tokens}색 생성',

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
  'apply.cancelled': '취소됨 — {bound}건만 연결{detail}',
  'apply.preview': '미리보기 — 후보 {bound}건{detail} · 체크 후 ‘선택한 항목에 연결’',
  'apply.done': '연결 {bound}{detail}',

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
  'dark.title': '다크 모드',
  'dark.hint': '밝은 모드 색을 뒤집어 다크 모드에 채웁니다. 목록 이름은 Figma 변수 컬렉션·모드예요',
  'dark.collection': '역할 컬렉션',
  'dark.fromMode': '밝은 모드',
  'dark.toMode': '어두운 모드',
  'dark.genBtn': '다크 만들기',
  // 닮은 프레임 컴포넌트화
  'similar.scanBtn': '닮은 스캔',
  'similar.componentizeBtn': '묶기',
  // 내보내기
  'export.saved': '{format} — {file}로 저장했습니다.',
  'export.empty': '내보낼 변수가 없습니다. 먼저 토큰을 생성하세요.',

  // 라이선스
  'license.needKey': '라이선스 키를 입력하세요.',

  // 유료 게이팅
  'premium.required': '{message} (유료 기능: {feature})',

  // 마법사 단계 라벨(WIZARD_STEPS id 기준) + 건너뜀 사유
  'wizard.step.extract': '추출',
  'wizard.step.create': '토큰',
  'wizard.step.semantics': '역할 매핑',
  'wizard.step.bind': '변수연결',
  'wizard.step.rename': '이름',
  'wizard.step.componentize': '컴포넌트',
  'wizard.skip.optionOff': '옵션 꺼짐',
  'wizard.skip.noMapping': '매핑 없음',
  'wizard.skip.paid': 'Paid 전용',

  // 진행 안내(파이프라인) 단계 상태
  'pipeline.stat.done': '완료',
  'pipeline.stat.ready': '준비',
  'pipeline.stat.blocked': '전제 미충족',
  'pipeline.stat.todo': '만들기',

  // 바인딩 스킵 사유(라벨 맵)
  'reason.no-match': '매칭 없음',
  'reason.empty-text': '빈 텍스트',
  'reason.error': '연결 실패',
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
  'wizard.seq.bindDone': '연결 {bound}',
  'wizard.seq.bindSkip': ' · 스킵 {n}',
  'wizard.seq.renameDone': '{count}개 이름 적용',
  'wizard.seq.componentize': '등록 {registered} · 세트 {sets}',

  // 마법사 완료 요약(summarize, wizard.ts)
  'wizard.sum.tokens': '토큰 {n}',
  'wizard.sum.bound': '연결 {n}',
  'wizard.sum.renamed': '이름 {n}',
  'wizard.sum.components': '컴포넌트 {n}',
  'wizard.sum.empty': '완료된 작업이 없습니다',

  // 진행 안내 단계 라벨·안내
  'pipeline.step.colors': '색 변수',
  'pipeline.step.tokens': '간격·크기 토큰',
  'pipeline.step.semantics': '역할 매핑',
  'pipeline.step.bind': '변수 연결',
  'pipeline.step.dark': '다크 모드',
  'pipeline.step.textStyles': '텍스트 스타일',
  'pipeline.hint.needTokens': '토큰을 먼저 생성하세요',
  'pipeline.hint.needBindable': '연결할 변수를 먼저 생성하세요',

  /* ---------- 정적 HTML 라벨(ui.html, data-i18n[-html]) ---------- */
  'common.cancel': '취소',
  // 탭
  'tab.wizard': '시작',
  'tab.tokens': '만들기',
  'tab.apply': '적용',
  'tab.settings': '설정',
  // 단계 레일(#5) — 만들기 4단계 · 적용 3단계
  'rail.color': '색',
  'rail.colorSub': '추출·변수',
  'rail.token': '토큰',
  'rail.tokenSub': '간격·크기',
  'rail.theme': '테마',
  'rail.themeSub': '다크 모드',
  'rail.type': '타이포',
  'rail.typeSub': '텍스트 스타일',
  'rail.bind': '연결',
  'rail.bindSub': '변수 붙이기',
  'rail.rename': '이름',
  'rail.renameSub': '레이어 이름',
  'rail.structure': '컴포넌트',
  'rail.structureSub': '닮은 프레임',
  'rail.next': '다음 →',
  // 플러그인 설정(#19) — 관리 탭에만
  'settings.title': '기본값',
  'settings.hint': '자주 안 바꾸는 값이에요. 만들기·적용 화면에는 안 보여요',
  'settings.base': '기준 크기',
  'settings.depth': '이름 정리 깊이',
  'settings.tol': '허용오차',
  'settings.fixed': '고정',
  // 마법사 카드
  'wizardCard.title': '한 번에 정리',
  'wizardCard.hint': '선택 화면을 한 번에 토큰·변수 연결까지 정리합니다',
  'wizardCard.optSemantics': '역할 매핑',
  'wizardCard.optComponentize': '컴포넌트',
  'wizardCard.run': '전체 실행',
  // 공통(정적 라벨)
  'common.selectAll': '전체',
  'prereq.gotoCreate': '토큰 생성으로 →',
  // 온보딩 / 가이드
  // 첫 실행 배너(온보딩 흡수)
  'onboard.banner': '처음이면 전체 실행으로 시작하세요.',
  'onboard.hide': '다시 보지 않기',
  // 진행(파이프라인 카드)
  'pipeline.title': '준비 현황',
  'pipeline.indep': '이름·컴포넌트는 필요할 때 적용 탭에서',
  // 브랜드 팔레트
  'color.title': '색',
  'color.scope': '변수화',
  'color.listHint': '추출·정리된 색 · Global = hue · Semantic = 역할',
  'color.makeVars': '색 변수 만들기',
  'palette.brand2': '보조색',
  'palette.harmony': '하모니',
  'palette.neutral': '중립',
  'palette.status': '상태',
  'palette.gen': '팔레트 생성',
  // 추출
  'extract.scanBtn': '선택에서 추출',
  // 색 정리(추출 카드에 흡수)
  'colorTidy.hint': '뽑거나 팔레트를 만든 뒤, 목록에서 역할을 정하고 변수로 만듭니다. 보조색을 켠 뒤에만 하모니를 고를 수 있어요. 추출은 무료 · 팔레트·변수화는 유료',
  'colorTidy.undo': '되돌리기',
  // 토큰 생성
  'create.title': '간격·크기 토큰',
  'create.scopeHint': '여백·크기·폰트·효과만 다룹니다. 색은 이전 단계에서 이미 만들었어요',
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
  'textStyle.hint': '스캔 후 이름을 다듬고 등록하세요. 화면 연결은 「기존만 연결」',
  'textStyle.scanBtn': '스캔',
  'textStyle.addRow': '행 추가',
  'textStyle.useRowLabels': '가로 행의 왼쪽 텍스트를 이름으로',
  'textStyle.applyExistingBtn': '기존만 연결',
  'textStyle.applyOriginal': '등록 시 화면에 적용',
  'textStyle.registerBtn': '등록',
  // 적용(바인딩)
  'bind.title': '변수 연결',
  'bind.hint': '먼저 미리보기로 확인하고, 연결할 항목만 고르세요',
  'bind.preview': '미리보기',
  'bind.confirm': '선택한 항목에 연결',
  'bind.progress': '진행률',
  'bind.skipHint': '건너뜀 사유 · 누르면 그 레이어를 캔버스에서 고릅니다',
  'bind.skipMeta': '스킵',
  // 색 역할(Semantic) 어휘 — 드롭다운은 `한글 · role`로 병기한다(와이어).
  // 키의 `-`는 역할 이름의 `/`(surface/muted)를 대신한다 — 점 표기 키와 섞이지 않게.
  'role.none': '역할 없음',
  'role.surface': '면',
  'role.surface-muted': '옅은 면',
  'role.text': '글자',
  'role.text-muted': '옅은 글자',
  'role.text-inverse': '반전 글자',
  'role.border': '테두리',
  'role.primary': '주색',
  'role.primary-strong': '진한 주색',
  'role.primary-subtle': '옅은 주색',
  'role.secondary': '보조',
  'role.accent': '강조',
  'role.success': '성공',
  'role.warning': '주의',
  'role.error': '오류',
  'role.info': '안내',
  // 리네임
  'rename.title': '이름 정리',
  'rename.hint': '역할에 맞는 레이어 이름으로 바꿉니다. 최상위·인스턴스 이름은 그대로 둡니다',
  'rename.preview': '미리보기',
  'rename.apply': '이름 적용',
  'rename.undoTitle': '되돌리기 안전장치',
  'rename.undoBody': '이 실행은 한 번의 되돌리기(Ctrl/⌘Z)로 전체를 취소할 수 있습니다.',
  // 이름을 지키는 사유(#7b) — 미리보기의 흐린 행에 붙는다. 키는 KeepReason과 1:1.
  'rename.keep.root': '루트 보존',
  'rename.keep.instance': '인스턴스 보존',
  'rename.keep.component': '컴포넌트 보존',
  'rename.keep.text': '텍스트 보존',
  'rename.keep.locked': '잠긴 레이어',
  'rename.keep.meta': '잠금',
  'rename.hideKeep': '잠금 제외',
  'rename.showKeep': '잠금 표시',
  // 컴포넌트 / 베리언트
  'structure.title': '컴포넌트',
  'structure.scope': '닮은 프레임',
  'structure.groupComp': '컴포넌트 후보',
  'structure.groupSimilar': '닮은 프레임',
  'structure.groupVariant': '선택한 컴포넌트 정리',
  'component.hint': '위는 후보 등록, 아래는 닮은 프레임 묶기. 닮은 스캔은 무료',
  'component.scanBtn': '후보 스캔',
  'component.registerBtn': '등록',
  'component.classifyBtn': '베리언트 분류',
  'component.genMissingBtn': '누락 조합 생성',
  'component.scanHelp': '선택 아래에서 버튼·카드 같은 고신뢰 구조 후보를 찾습니다. 숨김·부모 컨테이너는 제외.',
  'component.registerHelp': '체크한 후보를 Components에 등록하고 자리엔 인스턴스를 남깁니다.',
  'component.classifyHelp': '이미 만든 컴포넌트만 같은 이름끼리 세트로 다시 묶습니다.',
  'component.genMissingHelp': '선택한 세트의 빠진 속성 조합을 첫 베리언트 복제로 채웁니다.',
  'similar.scanHelp': '구조가 같고 내용만 다른 프레임을 미리 묶습니다. 파일은 안 바꿉니다.',
  'similar.componentizeHelp': '마스터를 컴포넌트로, 나머지는 인스턴스로 바꿉니다.',
  // 내보내기
  'export.title': '코드로 내보내기',
  'export.hint': '누르면 바로 코드 파일로 저장됩니다',
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
