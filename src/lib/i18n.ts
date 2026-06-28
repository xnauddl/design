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
  'create.needExtract': '먼저 토큰을 추출하세요.',
  'create.preview': '미리보기 — {summary} · ‘적용’으로 반영',

  // 색 정리(군집) — ΔE로 비슷한 색을 대표색으로 병합(허용오차 고정·비노출). 추출 카드에 요약 한 줄.
  'cluster.summary': '{total}색 → {reps} 대표색 · {merged}색 병합',

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
  'component.exposing': '속성 노출 중…',
  'component.noEligible': '선택 하위에 등록 가능한 프레임이 없습니다.',
  'component.noEligibleShort': '등록 가능한 프레임이 없습니다.',
  'component.candidates': '등록 후보 {total}개 · {sel}개 선택',
  'component.registered': '컴포넌트 {registered} · 베리언트 세트 {sets}{extra}',
  'component.variants': '베리언트 세트 {sets}개 생성{extra}',
  'component.generated': '누락 조합 {generated}개 생성(세트 {sets})',
  'component.exposed': '컴포넌트 속성 {created}개 노출',

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

  // 내보내기
  'export.needFirst': '먼저 내보내기를 실행하세요.',
  'export.done': '{format} 내보냄 — 복사 또는 다운로드.',

  // 라이선스
  'license.needKey': '라이선스 키를 입력하세요.',

  // 유료 게이팅
  'premium.required': '{message} (유료 기능: {feature})',

  // 변수 편집기(R1)
  'varedit.empty': '편집할 변수가 없습니다 — 먼저 토큰을 생성하세요.',
  'varedit.count': '변수 {count}개',
  'varedit.saved': '변경 저장됨.',
  'varedit.deleted': '‘{name}’ 삭제됨 — 되돌리려면 Undo.',
  'varedit.editFail': '편집 실패: {error}',
  'varedit.dupName': '같은 컬렉션에 같은 이름의 변수가 있습니다.',
  'varedit.confirmDelete': '‘{name}’ 변수를 삭제할까요? 되돌리려면 Undo하세요.',
  // R2-C: 영향 분석(where-used)
  'varedit.usageNodes': '이 변수를 쓰는 노드 {count}개',
  'varedit.usageAliases': '이 변수를 별칭하는 변수 {count}개: {names}',
  // R2-A: 다크 자동 생성
  'varedit.darkDone': '다크 생성 — 다크 Global {created}개 · 재별칭 {realiased}개{skip}',
  'varedit.darkSkip': ' · 스킵 {skipped}(별칭 아님)',
  'varedit.darkSameMode': '라이트와 다크 모드가 같습니다 — 서로 다른 모드를 고르세요.',
  'varedit.darkHint': '라이트 모드 Semantic 색을 OKLCH 명도 반전으로 다크 모드에 자동 채웁니다(다크용 Global 생성 후 재-별칭).',

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
  'wizard.seq.createLimited': '{count}개 · ⚠ Free 한도 일부만',
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
};

/** key → 문자열. `{var}` 자리표시자를 vars로 치환. 누락 키는 key 그대로(폴백). */
export function t(key: string, vars?: StringVars): string {
  const tpl = STRINGS[key] ?? key;
  if (!vars) return tpl;
  return tpl.replace(/\{(\w+)\}/g, (_, k: string) => (k in vars ? String(vars[k]) : `{${k}}`));
}
