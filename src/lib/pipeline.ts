/* ============================================================
   pipeline.ts — 만들기→적용 의존 파이프라인의 단계 상태(순수, figma 의존 없음)
   #11 통합 게이트의 PREREQ_STATE(Global·바인딩 변수 존재)를 사용자 가시 "진행 안내"로.
   의존 그래프: 토큰 생성(Global) → 시맨틱 매핑(Global 필요) → 바인딩(변수 필요).
   리네임·대비·컴포넌트는 독립(언제든) — 여기 포함하지 않는다.
   ============================================================ */

export type StepStatus = 'done' | 'ready' | 'blocked';

export interface PrereqState {
  /** Global 변수 존재(시맨틱 매핑 전제). */
  hasGlobal: boolean;
  /** 바인딩 가능 변수 존재(바인딩 전제). Component/Semantic 우선, Global은 폴백이라 Global만 있어도 true. */
  hasBindable: boolean;
}

export interface PipelineStep {
  id: 'tokens' | 'semantics' | 'bind';
  label: string;
  status: StepStatus;
  /** blocked일 때 다음 행동 안내. */
  hint?: string;
}

/**
 * 의존 파이프라인의 권장 순서 + 단계 상태.
 * - 토큰 생성: Global이 있으면 done, 없으면 ready(추출은 언제든 가능).
 * - 시맨틱 매핑: Global 있으면 ready, 없으면 blocked.
 * - 바인딩: 바인딩 가능 변수 있으면 ready, 없으면 blocked.
 */
export function pipelineSteps(s: PrereqState): PipelineStep[] {
  return [
    { id: 'tokens', label: '토큰 생성 (Global)', status: s.hasGlobal ? 'done' : 'ready' },
    {
      id: 'semantics',
      label: '시맨틱 매핑',
      status: s.hasGlobal ? 'ready' : 'blocked',
      hint: s.hasGlobal ? undefined : '토큰을 먼저 생성하세요',
    },
    {
      id: 'bind',
      label: '바인딩',
      status: s.hasBindable ? 'ready' : 'blocked',
      hint: s.hasBindable ? undefined : '바인딩할 변수를 먼저 생성하세요',
    },
  ];
}
