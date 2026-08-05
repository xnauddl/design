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
  'palette.needGenerate': '먼저 ‘팔레트 생성’으로 색을 만드세요.',
  'palette.summary': '{count}계열 · {tokens}색 생성',
  'palette.hint': '{warn}하모니를 바꿔 다시 생성하거나, ‘적용’으로 변수에 반영하세요.',

  // 추출 / 토큰 생성
  'extract.done': '{count}개 후보 추출 완료.',
  'create.preview': '미리보기 — {summary} · ‘적용’으로 반영',
  'create.baseChanged': 'base {base}px로 다시 계산 중…',

  // 시맨틱 매핑
  'semantic.rolesApplied': '{count}개 역할 반영됨 — ‘시맨틱 별칭 생성’으로 적용.',
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

  // 명도 대비
  'contrast.checking': '대비 검사 중…',
  'contrast.fixApplied': '보정 적용됨 — ‘대비 검사’로 다시 확인하세요.',
  'contrast.none': '검사할 텍스트가 없습니다.{detail}',
  'contrast.noneSkip': ' (건너뜀: {skip})',
  'contrast.noneSelect': ' 텍스트가 있는 프레임을 선택하세요.',
  'contrast.allPass': '{checked}개 모두 {level} 통과 ✓{skip}',
  'contrast.someFail': '{checked}개 중 {fails}개 {level} 미달{skip}',

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

  // 프리셋
  'preset.needName': '프리셋 이름을 입력하세요.',
  'preset.noneSelected': '선택된 프리셋이 없습니다.',
  'preset.applied': '‘{name}’ 적용됨 — 아래 단계에서 실행하세요.',
  'preset.needExport': '내보낼 프리셋을 선택하세요.',
  'preset.exported': '‘{name}’ JSON을 내보냈습니다(복사해 공유).',
  'preset.importFail': '가져오기 실패: {error}',
  'preset.count': '프리셋 {count}개',

  // 다크 테마 생성
  'dark.title': '다크 테마 생성',
  'dark.hint': '라이트 모드 색을 <b>명도만 뒤집어</b> 다크 모드를 채웁니다. 색상·채도는 그대로라 브랜드색이 유지돼요. Semantic이 Global을 <b>가리키고 있는 것만</b> 대상이고, 값을 직접 넣은 건 건너뜁니다. 다크용 원시색은 <code>dark/…</code>로 따로 만들어집니다. (Paid)',
  'dark.collection': '대상 컬렉션',
  'dark.fromMode': '라이트 모드',
  'dark.toMode': '다크 모드',
  'dark.genBtn': '다크 채우기',
  // 닮은 프레임 컴포넌트화
  'similar.title': '닮은 프레임 컴포넌트화',
  'similar.hint': '구조가 같고 <b>내용만 다른</b> 프레임 여러 개를 골라 스캔하면, 하나를 <b>마스터</b>로 컴포넌트화하고 나머지는 <b>인스턴스</b>로 바꿉니다. 프레임마다 다른 텍스트·아이콘은 <b>컴포넌트 속성</b>으로 열리고, 이미지는 인스턴스에서 개별 교체됩니다. 마스터는 <b>내용이 가장 잘 채워진</b> 프레임을 추천합니다(빈 텍스트가 많으면 감점). <b>스캔은 무료</b>, 실제 교체만 Paid.',
  'similar.scanBtn': '닮은 프레임 스캔',
  'similar.componentizeBtn': '컴포넌트화',
  // 변수 편집기
  'varedit.title': '변수 편집기',
  'varedit.hint': '만들어 둔 변수의 <b>이름·값·스코프</b>를 여기서 고칩니다. 값 칸에 <code>#RRGGBB</code>·숫자를 넣으면 리터럴, 다른 변수 이름을 고르면 별칭이 됩니다. 타입과 소속 컬렉션은 바꿀 수 없어요. <b>지우기 전에 ‘사용처’</b>를 눌러 어디에 쓰이는지 먼저 확인하세요.',
  'varedit.loadBtn': '변수 불러오기',
  'varedit.collection': '컬렉션',
  // 목록 공통(상한 해제 — 6개 카드가 같은 문구를 쓴다)
  'list.expandAll': '모두 펼치기',
  // 내보내기
  'export.needFirst': '먼저 내보내기를 실행하세요.',
  'export.done': '{format} 내보냄 — 복사 또는 다운로드.',

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
  'wizard.step.contrast': '접근성 검수',
  'wizard.step.componentize': '컴포넌트화',
  'wizard.skip.optionOff': '옵션 꺼짐',
  'wizard.skip.noMapping': '매핑 없음',
  'wizard.skip.paid': 'Paid 전용',
  'wizard.skip.default': '건너뜀',

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

  // 명도 대비 스킵 사유(라벨 맵)
  'contrastSkip.no-fill': '단색 글자색 없음',
  'contrastSkip.no-bg': '배경 없음',
  'contrastSkip.capped': '스캔 상한 도달',

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
  'wizard.seq.contrastNone': '검사할 텍스트 없음',
  'wizard.seq.contrastPass': '{pass}/{checked} {level} 통과',
  'wizard.seq.componentize': '등록 {registered} · 세트 {sets}',

  // 마법사 완료 요약(summarize, wizard.ts)
  'wizard.sum.tokens': '토큰 {n}',
  'wizard.sum.bound': '바인딩 {n}',
  'wizard.sum.renamed': '리네임 {n}',
  'wizard.sum.contrast': '대비 {passed}/{total} 통과',
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
  // 마법사 카드
  'wizardCard.title': '시스템화 마법사',
  'wizardCard.hint': '선택한 프레임을 한 번에 <b>토큰화 · 바인딩 · 정돈 · 접근성 검수</b>. 세부값은 ‘만들기/적용’ 탭의 각 입력(base·허용오차·맥락단계·대비 기준)을 사용합니다.',
  'wizardCard.optSemantics': '시맨틱 매핑',
  'wizardCard.optContrast': '접근성 검수',
  'wizardCard.optComponentize': '컴포넌트화',
  'wizardCard.run': '전체 실행',
  // 공통(정적 라벨)
  'common.selectAll': '전체 선택',
  'prereq.gotoCreate': '토큰 생성으로 →',
  'prereq.gotoTextStyle': '텍스트 스타일 등록으로 →',
  // 온보딩 / 가이드
  'onboard.title': '온보딩 / 가이드',
  'onboard.body': '처음이세요? <b>‘시스템화 마법사’</b>로 추출 → 토큰 → 바인딩 → 정돈을 한 번에 끝낼 수 있어요. 단계별로 직접 하려면 ‘만들기·적용’ 탭을 차례로 사용하세요.',
  'onboard.run': '전체 실행',
  'onboard.close': '닫기',
  // 진행 안내(파이프라인 카드)
  'pipeline.title': '진행 안내',
  'pipeline.hint': '권장 순서와 단계 상태(전제 충족 여부). 클릭하면 해당 단계로 이동.',
  'pipeline.indep': '리네임 · 대비 점검 · 컴포넌트는 전제 없이 언제든 가능(독립).',
  // 브랜드 팔레트
  'palette.title': '브랜드 팔레트 생성',
  'palette.brand': '브랜드색',
  'palette.brand2': '보조색',
  'palette.harmony': '하모니',
  'palette.neutral': '중립',
  'palette.status': '상태색',
  'palette.previewHint': '미리보기로 확인한 뒤 ‘적용’하면 변수로 반영됩니다.',
  'palette.gen': '팔레트 생성',
  'palette.apply': '적용 (변수 생성)',
  // 추출
  'extract.title': '추출 · 색 정리',
  'extract.scanBtn': '선택에서 토큰 추출',
  // 색 정리(추출 카드에 흡수)
  'colorTidy.hint': '비슷한 색은 추출 시 자동으로 대표 1색에 정리됩니다(드래프트 단계 — 바인딩 영향 없음). 역할(Semantic)을 정하세요. Global은 hue 패밀리(<code>color/blue/500</code>).',
  'colorTidy.undo': '되돌리기',
  'colorTable.applyBtn': '시맨틱 매핑에 반영',
  // 토큰 생성
  'create.title': '토큰 생성 (Global + Semantic)',
  'create.scopeHint': '색 외 토큰(간격·크기·폰트·효과)을 변수로 만듭니다. 색은 위 ‘색 정리’에서 다룹니다. 체크한 것만 생성되고, <b>n×</b>는 그 값을 쓰는 레이어 수입니다.',
  'create.base': 'base(px)',
  'create.selectAll': '전체 선택',
  'create.dropOnce': '1× 해제',
  'create.tidyBase': '사다리',
  'create.tidyRatio': '허용',
  'create.tidyBtn': '정리',
  'create.tidyUndo': '되돌리기',
  'create.hint': '미리보기로 변경 요약을 확인한 뒤 적용하세요.',
  'create.previewBtn': '미리보기',
  'create.apply': '적용',
  // 시맨틱 매핑 카드
  'semantic.title': '시맨틱 매핑 (역할 → 토큰)',
  'semantic.formatLabel': '형식: <code>역할 = Global변수이름</code>',
  'semantic.aliasBtn': '시맨틱 별칭 생성',
  'semantic.scanBtn': '기존 색에서 추천',
  // 텍스트 스타일
  'textStyle.title': '텍스트 스타일 (화면 → 스타일)',
  'textStyle.hint': '화면의 글자에서 텍스트 스타일을 만들어 등록합니다. 스캔한 값은 못 바꾸고 <b>이름만</b> 정리하면 돼요. 새 스타일은 ‘행 추가’로. (Paid)',
  'textStyle.scanBtn': '선택에서 스캔',
  'textStyle.addRow': '행 추가',
  'textStyle.useRowLabels': '가로 행의 왼쪽 텍스트를 스타일 이름으로 사용',
  'textStyle.rowLabelsHint': 'ON이면 같은 가로 줄의 <b>왼쪽 텍스트를 라벨(이름)</b>으로, 큰 텍스트를 표본으로 봅니다. 이름은 화면에 적힌 글자 그대로입니다. 표본 오른쪽 텍스트는 표에 넣지 않습니다. 짝을 못 찾으면 크기 순 이름(display/h1…)으로 둡니다. (세션만 유지)',
  'textStyle.applyExistingBtn': '텍스트 스타일 적용',
  'textStyle.applyTitle': '텍스트 스타일 적용',
  'textStyle.applyHint': '선택 글자를 이미 등록된 같은 타이포의 Text Style에 연결합니다. 새로 만들지 않아요. (Paid)',
  'textStyle.applyTabHint': '이미 만든 스타일만 화면에 붙이려면 적용 탭 → 텍스트 스타일 적용.',
  'textStyle.colName': '이름',
  'textStyle.colFont': '폰트',
  'textStyle.colSize': '크기',
  'textStyle.colLineHeight': '행간',
  'textStyle.colLetterSpacing': '자간',
  'textStyle.colStyle': '스타일',
  'textStyle.applyOriginal': '등록할 때 화면의 글자에도 적용',
  'textStyle.registerBtn': '텍스트 스타일 등록',
  // 적용 — 변수 바인딩(탭 이름 ‘적용’과 구분)
  'bind.title': '변수 바인딩',
  'bind.tol': '허용오차',
  'bind.tolExact': '정확',
  'bind.preview': '미리보기',
  'bind.confirm': '선택에 바인딩',
  'bind.progress': '진행률',
  // 리네임
  'rename.title': '리네임',
  'rename.depth': '맥락 최대단계',
  'rename.preview': '미리보기',
  'rename.apply': '이름 적용',
  'rename.undoTitle': '되돌리기 안전장치',
  'rename.undoBody': '이 실행은 한 번의 되돌리기(Ctrl/⌘Z)로 전체를 취소할 수 있어요.',
  // 명도 대비
  'contrast.title': '명도 대비 점검 (WCAG)',
  'contrast.hint': '선택 안 텍스트 ↔ 배경 대비를 WCAG로 검사(읽기 전용).',
  'contrast.level': '기준',
  'contrast.checkBtn': '대비 검사',
  // 컴포넌트 / 베리언트
  'component.title': '컴포넌트 / 베리언트',
  'component.hint': '<b>후보 스캔</b> → 골라 등록. 선택한 <b>부모는 컨테이너</b>(등록 제외). <b>고신뢰 구조</b>(button·chip·table·card·list·field·nav·progress·figure·heading)인 보이는 FRAME/GROUP만 후보 — 이름과 무관, <b>숨김은 제외</b>. heading은 섹션 머리줄(가로·낮은 높이·타이틀+선택 액션/메타)이며 페이지 header 랜드마크와 다름. <b>같은 레이어 이름</b>이 2개+이면: 구조가 같고 텍스트/아이콘만 다르면 <b>속성</b>(단품+TEXT/스왑), heading의 액션(buttonGroup) 유무만 달라도 <b>속성</b>, 구조·크기·색이 다르면 <b>세트</b>. 이름이 다르면 각각 <b>단독</b>. 속성은 이름 어휘(<code>Type</code>·<code>State</code>·<code>Size</code>) 우선 + 기하 보완. 메인은 <b>Components 페이지</b>, 원위치엔 <b>인스턴스</b>.',
  'component.hint2': '<b>베리언트 분류</b>는 이미 만들어 둔 <b>기존 컴포넌트</b>를 같은 이름끼리 다시 묶을 때만(프레임은 「컴포넌트 등록」). 등록 시 TEXT·스왑·<code>이름?</code> BOOLEAN 속성이 자동 노출됩니다(접힘=다른 슬롯만, 단독·세트=전체 API).',
  'component.scanBtn': '후보 스캔',
  'component.registerBtn': '컴포넌트 등록',
  'component.classifyBtn': '베리언트 분류',
  'component.genMissingBtn': '누락 조합 생성',
  // 내보내기
  'export.title': '내보내기 (코드)',
  'export.hint': '모든 디자인 변수(색·크기·간격·반경·타이포)를 코드로. HUG/FILL은 토큰이 아니라 제외.',
  'export.format': '형식',
  'export.fontUnit': '폰트 크기',
  'export.runBtn': '내보내기',
  'export.downloadBtn': '다운로드',
  // 요금제 / 라이선스
  'license.title': '요금제 / 라이선스',
  'license.verify': '검증',
  'license.clear': '해제',
  'license.devTier': '개발용 강제 티어',
  'license.devTierNote': '(검증된 키가 없을 때만 적용)',
  // 공유 프리셋
  'preset.title': '공유 프리셋',
  'preset.hint': 'base·허용오차·맥락단계·시맨틱 매핑을 묶어 저장/공유합니다. (Paid 전용)',
  'preset.saveBtn': '현재 설정 저장',
  'preset.loadBtn': '불러오기',
  'preset.deleteBtn': '삭제',
  'preset.exportBtn': '내보내기(JSON)',
  'preset.importBtn': '가져오기(JSON)',
  // 접근성 · 국제화
  'a11y.title': '접근성 · 국제화',
  'a11y.body': '키보드 전용 조작 · 명도 대비 AA · i18n',
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
