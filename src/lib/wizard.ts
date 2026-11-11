/* ============================================================
   wizard.ts — 만들기 화면 실행(IA v4 §4.3)의 순수 로직: 단계 계획 · 다크 대상 · 다 됨 문구.
   figma/DOM 의존 없음. 실제 메시지 시퀀싱은 ui.ts가 이 계획을 따라 수행한다.
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
 * 이번 실행에서 도는 단계(§4.3 "실행 순서"). 무료는 연결 · 이름 정리만(만들기 · 다크 · 텍스트 스타일은 유료).
 * 텍스트 스타일 단계가 연결보다 먼저인 이유: 스타일이 붙은 글자는 연결이 글자 자리를 건너뛴다(`styled`).
 */
export function planMake(i: MakePlanInput): MakeStepId[] {
  const out: MakeStepId[] = [];
  if (i.isPaid && i.globalsOn > 0) out.push('create');
  if (i.isPaid && i.dark) out.push('dark');
  if (i.isPaid && i.stylesOn > 0) out.push('textStyles');
  if (i.link) out.push('bind');
  if (i.rename) out.push('rename');
  return out;
}

/** 다크 단계가 보낼 대상(컬렉션·출처 모드·대상 모드). */
export interface DarkTarget {
  collectionId: string;
  fromModeId: string;
  /** 이미 있는 Dark 모드. 없으면 생략 — 플러그인이 `addMode('Dark')`로 만든다. */
  toModeId?: string;
}

/**
 * 변수 목록에서 다크 채움 대상을 고른다(순수). 대상은 플러그인 Semantic 하나뿐(§2.13 13.7) →
 * 출처는 Dark가 아닌 첫 모드 → 대상은 이미 있는 `Dark`(없으면 생략). 고를 게 없으면 null(단계는 건너뛴다).
 */
export function pickDarkTarget(vars: readonly { collectionId: string; collection: string; tier?: number; owned?: string; modes: readonly { modeId: string; name: string }[] }[]): DarkTarget | null {
  const target = vars.find((v) => v.owned === 'semantic' && v.modes.length >= 1);
  if (!target) return null;
  const dark = target.modes.find((m) => m.name.toLowerCase() === 'dark');
  const from = target.modes.find((m) => m.modeId !== dark?.modeId);
  if (!from) return null; // 모드가 Dark 하나뿐 — 다크에서 다크를 채울 일은 없다
  return { collectionId: target.collectionId, fromModeId: from.modeId, ...(dark ? { toModeId: dark.modeId } : {}) };
}

/** 실행이 단계 결과로 모은 수(다 됨 문구용). 단계가 돌지 않았으면 그 필드는 없다. */
export interface MakeTotals {
  /** 만들기: g = created + updated, r = Semantic 수, m = 직접 만든 변수라 건너뜀. */
  created?: { g: number; r: number; m: number };
  darkFilled?: number;
  /** 텍스트 스타일: s = created + updated, a = 붙인 글자 수, missing = 알림 목록(§4.3 "글꼴"). */
  styles?: { s: number; a: number; missing?: string[] };
  bound?: number;
  renamed?: number;
}

/**
 * 다 됨 상태 줄 문구(§4.3 실행 상태표 "다 됨"). 한 단계도 하지 않은 부분은 뺀다.
 * 무료는 끝에 " · 변수는 만들지 않았어요", 바로 연결을 껐으면 끝에 " · 연결은 아직 안 했어요".
 */
export function makeDoneText(totals: MakeTotals, opts: { isPaid: boolean; linkOff: boolean }): string {
  const parts: string[] = [];
  if (totals.created) parts.push(t('make.done.create', { g: totals.created.g, r: totals.created.r }));
  if (totals.darkFilled != null) parts.push(t('make.done.dark', { k: totals.darkFilled }));
  if (totals.styles) parts.push(totals.styles.a > 0 ? t('make.done.stylesLinked', { s: totals.styles.s, a: totals.styles.a }) : t('make.done.styles', { s: totals.styles.s }));
  if (totals.styles?.missing?.length) parts.push(t('make.done.missing', { k: totals.styles.missing.length })); // 텍스트 스타일 바로 뒤(§4.3 "글꼴")
  if (totals.bound != null) parts.push(t('make.done.bind', { n: totals.bound }));
  if (totals.renamed != null) parts.push(t('make.done.rename', { c: totals.renamed }));
  if (totals.created && totals.created.m > 0) parts.push(t('make.done.manual', { m: totals.created.m }));
  if (!opts.isPaid) parts.push(t('make.done.free'));
  if (opts.linkOff) parts.push(t('make.done.notLinked'));
  return parts.join(' · ');
}
