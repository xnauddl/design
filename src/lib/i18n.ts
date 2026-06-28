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

  // 내보내기
  'export.needFirst': '먼저 내보내기를 실행하세요.',
  'export.done': '{format} 내보냄 — 복사 또는 다운로드.',

  // 라이선스
  'license.needKey': '라이선스 키를 입력하세요.',

  // 유료 게이팅
  'premium.required': '{message} (유료 기능: {feature})',
};

/** key → 문자열. `{var}` 자리표시자를 vars로 치환. 누락 키는 key 그대로(폴백). */
export function t(key: string, vars?: StringVars): string {
  const tpl = STRINGS[key] ?? key;
  if (!vars) return tpl;
  return tpl.replace(/\{(\w+)\}/g, (_, k: string) => (k in vars ? String(vars[k]) : `{${k}}`));
}
