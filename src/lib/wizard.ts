/* ============================================================
   wizard.ts — 만들기 화면 실행(IA v4 §4.3)의 순수 로직: 단계 계획 · 다크 대상 · 다 됨 문구.
   figma/DOM 의존 없음. 실제 메시지 시퀀싱은 ui.ts가 이 계획을 따라 수행한다.
   다크 결과 글(darkResultText)도 여기 — 다크 카드 상태 줄이 쓴다(ia-v4 §4.11 ② 상태표).
   ============================================================ */
import { t } from './i18n';

/** 실행 단계(순서 = 실제 순서). 만들기 → 다크 → 텍스트 스타일 → 연결 → 이름 정리. */
export type MakeStepId = 'create' | 'dark' | 'textStyles' | 'bind' | 'rename';
export const MAKE_STEP_ORDER: readonly MakeStepId[] = ['create', 'dark', 'textStyles', 'bind', 'rename'];

export interface MakePlanInput {
  isPaid: boolean;
  /** 켠 Global 줄 수(잠긴 줄 제외). 0이면 만들기 단계가 없다. */
  globalsOn: number;
  /** 켠 텍스트 스타일 줄 수. 0이면 텍스트 스타일 단계가 없다. */
  stylesOn: number;
  /** 만든 뒤 옵션. */
  link: boolean;
  rename: boolean;
  dark: boolean;
}

/**
 * 이번 실행에서 도는 단계(§4.3 "실행 순서"). 무료도 만들기(Global만 — `globalOnly`) · 연결 · 이름 정리를 하고,
 * 다크 · 텍스트 스타일은 유료다(무료 규칙 — §4.3 "무료 — 무료 규칙 PR 뒤", F4).
 * 텍스트 스타일 단계가 연결보다 먼저인 이유: 스타일이 붙은 글자는 연결이 글자 자리를 건너뛴다(`styled`).
 */
export function planMake(i: MakePlanInput): MakeStepId[] {
  const out: MakeStepId[] = [];
  if (i.globalsOn > 0) out.push('create');
  if (i.isPaid && i.dark) out.push('dark');
  if (i.isPaid && i.stylesOn > 0) out.push('textStyles');
  if (i.link) out.push('bind');
  if (i.rename) out.push('rename');
  return out;
}

/**
 * 다크 단계를 돌릴 수 있나(순수) — 플러그인 Global이 있으면 참(ia-v3 13.7 D-T1). 모드는 고르지 않는다 —
 * 플러그인이 기본 모드 → `Dark`(없으면 만듦)로 정한다(`GENERATE_DARK_MODE{}`). 없으면 단계는 건너뛴다.
 */
export function hasDarkTarget(vars: readonly { owned?: string }[]): boolean {
  return vars.some((v) => v.owned === 'global');
}

/** 실행이 단계 결과로 모은 수(다 됨 문구용). 단계가 돌지 않았으면 그 필드는 없다. */
export interface MakeTotals {
  /** 만들기: g = created + updated, r = Semantic 수, m = 직접 만든 변수라 건너뜀. */
  created?: { g: number; r: number; m: number };
  darkFilled?: number;
  /** 텍스트 스타일: s = created + updated, a = 붙인 글자 수, missing = 알림 목록(§4.3 "글꼴"). */
  styles?: { s: number; a: number; missing?: string[] };
  bound?: number;
  /** 연결 단계가 붙인 기존 텍스트 스타일 글자 수(ia-v4 §4.3 B.35 ④). */
  tsBound?: number;
  renamed?: number;
}

/**
 * 다 됨 상태 줄 문구(§4.3 실행 상태표 "다 됨"). 한 단계도 하지 않은 부분은 뺀다.
 * 무료의 만들기 부분은 "Global {g}개"(Semantic 없음 — F4), 바로 연결을 껐으면 끝에 " · 연결은 아직 안 했어요".
 */
export function makeDoneText(totals: MakeTotals, opts: { isPaid: boolean; linkOff: boolean }): string {
  const parts: string[] = [];
  // 만들기 부분 — 만든 것이 없으면(g = 0 · r = 0, 무료 g = 0) 뺀다(ia-v4 §2.9 "결과 문장").
  const createdText = totals.created ? makeCreatedText(totals.created, opts.isPaid) : '';
  if (createdText) parts.push(createdText);
  if (totals.darkFilled != null) parts.push(t('make.done.dark', { k: totals.darkFilled }));
  if (totals.styles) parts.push(totals.styles.a > 0 ? t('make.done.stylesLinked', { s: totals.styles.s, a: totals.styles.a }) : t('make.done.styles', { s: totals.styles.s }));
  if (totals.styles?.missing?.length) parts.push(t('make.done.missing', { k: totals.styles.missing.length })); // 텍스트 스타일 바로 뒤(§4.3 "글꼴")
  // 연결 부분(B.35): n > 0이면 "{b}곳 연결" + Text Style 꼬리, n = 0 · t > 0(건너뜀 포함)이면 "Text Style {t}곳 연결", 돌려 0 · 0이면 "0곳 연결"
  const tsB = totals.tsBound ?? 0;
  if (totals.bound && totals.bound > 0) parts.push(t('make.done.bind', { n: totals.bound }) + (tsB ? t('wizard.seq.bindTs', { t: tsB }) : ''));
  else if (tsB) parts.push(t('wizard.seq.bindTsOnly', { t: tsB }));
  else if (totals.bound != null) parts.push(t('make.done.bind', { n: totals.bound }));
  if (totals.renamed != null) parts.push(t('make.done.rename', { c: totals.renamed }));
  if (totals.created && totals.created.m > 0) parts.push(t('make.done.manual', { m: totals.created.m }));
  if (opts.linkOff) parts.push(t('make.done.notLinked'));
  return parts.join(' · ');
}

/**
 * 만들기 부분 글 — 유료 "Global {g}개 · Semantic {r}개", 무료 "Global {g}개"(다 됨 · 취소됨 괄호 공통 — §4.3).
 * 만든 것이 없으면 ''(ia-v4 §2.9): g = 0 · r = 0이면 뺀다, g = 0 · r > 0이면 "Semantic {r}개", 무료 g = 0이면 뺀다.
 */
export function makeCreatedText(c: { g: number; r: number }, isPaid: boolean): string {
  if (!isPaid) return c.g > 0 ? t('make.globalN', { g: c.g }) : '';
  if (c.g > 0) return t('make.done.create', { g: c.g, r: c.r });
  return c.r > 0 ? t('make.done.semOnly', { r: c.r }) : '';
}

/** 다크 결과(`DARK_MODE_RESULT`에서 거절 · needMigrate를 뺀 것) — 결과 글을 만드는 데 쓰는 필드만. */
export interface DarkResultLike {
  filled: number;
  kept: number;
  targets: number;
  modeCreated?: boolean;
  migrated?: { moved: number; split: number; failed: number; splitNames: string[]; failedNames: string[]; removedDark: number };
}

/**
 * 다크 카드 상태 줄 글(ia-v4 §4.11 ② 상태표 "다 됨" · "대상 없음" · "옮기기를 한 결과").
 * 옮기기를 했으면 어느 결과든 앞에 옮기기 줄 · 툴팁(있는 묶음만 빈 줄로 나눔), c > 0이면 warn.
 */
export function darkResultText(r: DarkResultLike): { text: string; cls: 'ok' | 'warn'; tip?: string } {
  const keptPart = r.kept > 0 ? t('dark.keptPart', { k: r.kept }) : '';
  let cls: 'ok' | 'warn' = 'ok';
  let body: string;
  if (r.targets === 0) {
    body = t('dark.nothing');
    cls = 'warn';
  } else if (r.filled === 0) body = t('dark.upToDate', { keptPart });
  else body = t('dark.doneFill', { modePart: r.modeCreated ? t('dark.modeAddedShort') : '', n: r.filled, keptPart });
  const m = r.migrated;
  if (!m) return { text: body, cls };
  const head = t('dark.migrated', {
    a: m.moved,
    splitPart: m.split > 0 ? t('dark.migratedSplit', { b: m.split }) : '',
    failPart: m.failed > 0 ? t('dark.migratedFail', { c: m.failed }) : '',
  });
  if (m.failed > 0) cls = 'warn';
  const groups: string[] = [];
  if (m.splitNames.length) groups.push([t('dark.migratedSplitTip'), ...m.splitNames].join('\n'));
  if (m.failedNames.length) groups.push([t('dark.migratedFailTip'), ...m.failedNames].join('\n'));
  if (m.removedDark > 0) groups.push(t('dark.migratedDelTip', { n: m.removedDark }));
  return { text: head + body, cls, ...(groups.length ? { tip: groups.join('\n\n') } : {}) };
}
