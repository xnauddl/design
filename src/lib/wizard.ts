/* ============================================================
   wizard.ts — 시스템화 마법사의 순수 로직(단계 정의·계획·요약)
   figma/DOM 의존 없음. 실제 메시지 시퀀싱은 ui.ts가 이 정의를 따라 수행한다.
   ============================================================ */

/** 마법사 단계 식별자(각 단계는 기존 UiToCode 메시지 1~2개로 매핑된다). */
export type WizardStepId =
  | 'extract' // EXTRACT (읽기)
  | 'create' // CREATE_TOKENS (쓰기)
  | 'semantics' // CREATE_SEMANTICS (쓰기, 선택)
  | 'bind' // APPLY (쓰기)
  | 'rename' // RENAME (쓰기) — bind 이후라야 토큰을 역할 신호로 활용 가능
  | 'contrast' // CHECK_CONTRAST (읽기, 선택)
  | 'componentize'; // REGISTER_COMPONENTS → CLASSIFY_VARIANTS (쓰기, 선택, Pro)

export interface WizardStepDef {
  id: WizardStepId;
  label: string;
  /** 문서를 변경하는 단계인지(읽기 전용이면 false). */
  write: boolean;
  /** 옵션(체크박스)로 끌 수 있는 단계인지. 필수 단계는 항상 실행. */
  optional: boolean;
  /** Pro 이상 필요 여부. */
  pro?: boolean;
}

/** 단계 순서 = 실제 데이터 의존 순서. 바인딩(bind) 후 리네임(rename). */
export const WIZARD_STEPS: readonly WizardStepDef[] = [
  { id: 'extract', label: '토큰 추출', write: false, optional: false },
  { id: 'create', label: '토큰 생성', write: true, optional: false },
  { id: 'semantics', label: '시맨틱 매핑', write: true, optional: true },
  { id: 'bind', label: '바인딩', write: true, optional: false },
  { id: 'rename', label: '레이어 정돈', write: true, optional: false },
  { id: 'contrast', label: '접근성 검수', write: false, optional: true },
  { id: 'componentize', label: '컴포넌트화', write: true, optional: true, pro: true },
];

/** 사용자가 켠 선택 단계(필수 단계는 포함하지 않는다). */
export interface WizardOptions {
  semantics: boolean;
  contrast: boolean;
  componentize: boolean;
}

/** 실행 시점의 게이팅 컨텍스트(티어·매핑 존재 여부). */
export interface WizardContext {
  isPro: boolean;
  /** 시맨틱 매핑 텍스트에 한 줄이라도 매핑이 있는지. */
  hasSemanticMap: boolean;
}

export interface WizardPlanItem {
  step: WizardStepDef;
  /** 이번 실행에서 이 단계를 돌릴지. */
  run: boolean;
  /** run=false일 때의 사유(스테퍼에 표시). */
  skipReason?: string;
}

/**
 * 옵션·컨텍스트로 각 단계의 실행 여부를 결정한다.
 * - 필수 단계: 항상 실행.
 * - 선택 단계: 옵션이 꺼져 있으면 건너뜀.
 * - 시맨틱: 옵션이 켜져도 매핑이 없으면 건너뜀(만들 별칭이 없음).
 * - Pro 단계: 옵션이 켜져도 비Pro면 건너뜀.
 */
export function planWizard(options: WizardOptions, ctx: WizardContext): WizardPlanItem[] {
  return WIZARD_STEPS.map((step) => {
    if (!step.optional) return { step, run: true };
    const enabled = options[step.id as keyof WizardOptions];
    if (!enabled) return { step, run: false, skipReason: '옵션 꺼짐' };
    if (step.id === 'semantics' && !ctx.hasSemanticMap) return { step, run: false, skipReason: '매핑 없음' };
    if (step.pro && !ctx.isPro) return { step, run: false, skipReason: 'Pro 전용' };
    return { step, run: true };
  });
}

/** 마법사가 단계 결과로 누적하는 집계값(완료 요약용). */
export interface WizardTotals {
  created?: number; // 생성/갱신된 토큰 변수 수
  semanticsAliased?: number;
  bound?: number;
  renamed?: number;
  contrastChecked?: number;
  contrastFailed?: number;
  components?: number;
}

/** 누적 집계 → 사람이 읽는 완료 요약 한 줄. */
export function summarize(t: WizardTotals): string {
  const parts: string[] = [];
  if (t.created != null) parts.push(`토큰 ${t.created}`);
  if (t.bound != null) parts.push(`바인딩 ${t.bound}`);
  if (t.renamed != null) parts.push(`리네임 ${t.renamed}`);
  if (t.contrastChecked != null) {
    const passed = t.contrastChecked - (t.contrastFailed ?? 0);
    parts.push(`대비 ${passed}/${t.contrastChecked} 통과`);
  }
  if (t.components != null && t.components > 0) parts.push(`컴포넌트 ${t.components}`);
  return parts.length ? parts.join(' · ') : '완료된 작업이 없습니다';
}
