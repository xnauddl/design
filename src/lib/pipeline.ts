/* ============================================================
   pipeline.ts — 만들기→적용 준비 현황(순수, figma 의존 없음)
   #11 통합 게이트의 PREREQ_STATE를 사용자 가시 목록으로.
   의존 그래프: 색·토큰(Global) → 역할 매핑(Global 필요) → 변수 연결(변수 필요).
   다크·텍스트 스타일은 전제가 아니라 만들기 탭에서 하는 일 — 있으면 완료, 없으면 안내만.
   이름 정리·컴포넌트는 언제든 가능해 여기 넣지 않는다(카드 아래 한 줄로 안내).
   ============================================================ */

export type StepStatus = 'done' | 'ready' | 'blocked' | 'todo';

export interface PrereqState {
  /** Global에 색 변수 존재(색 단계 완료 여부). */
  hasColorVars: boolean;
  /** Global에 색 외(간격·크기·폰트) 변수 존재. */
  hasScaleVars: boolean;
  /** Global 변수 존재(역할 매핑 전제) — 색이든 색 외든 하나라도. */
  hasGlobal: boolean;
  /** 바인딩 가능 변수(Semantic/Component) 존재(변수 연결 전제). */
  hasBindable: boolean;
  /** 모드가 둘 이상인 컬렉션 존재(다크 모드를 이미 만든 상태). */
  hasDarkMode: boolean;
  /** 등록된 텍스트 스타일 존재. */
  hasTextStyles: boolean;
}

export interface PipelineStep {
  id: 'colors' | 'tokens' | 'semantics' | 'bind' | 'dark' | 'textStyles';
  status: StepStatus;
  /** blocked일 때 다음 행동 안내(i18n 키, UI가 t()로 해석). 표시 라벨은 `pipeline.step.<id>`. */
  hint?: string;
}

/**
 * 준비 현황 목록 — 와이어의 6줄.
 * - 색 변수 / 간격·크기 토큰: 만들었으면 done, 아니면 ready(언제든 시작 가능).
 * - 역할 매핑: Global 있으면 ready, 없으면 blocked(+안내).
 * - 변수 연결: 연결할 변수 있으면 ready, 없으면 blocked(+안내).
 * - 다크 모드 / 텍스트 스타일: 있으면 done, 없으면 todo — 막힌 게 아니라 만들기 탭의 할 일.
 */
export function pipelineSteps(s: PrereqState): PipelineStep[] {
  return [
    { id: 'colors', status: s.hasColorVars ? 'done' : 'ready' },
    { id: 'tokens', status: s.hasScaleVars ? 'done' : 'ready' },
    {
      id: 'semantics',
      status: s.hasGlobal ? 'ready' : 'blocked',
      hint: s.hasGlobal ? undefined : 'pipeline.hint.needTokens',
    },
    {
      id: 'bind',
      status: s.hasBindable ? 'ready' : 'blocked',
      hint: s.hasBindable ? undefined : 'pipeline.hint.needBindable',
    },
    { id: 'dark', status: s.hasDarkMode ? 'done' : 'todo' },
    { id: 'textStyles', status: s.hasTextStyles ? 'done' : 'todo' },
  ];
}
