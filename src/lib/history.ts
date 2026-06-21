/* ============================================================
   history.ts — 변경 이력(audit log) (순수)
   M3.1(Team): 토큰 생성·바인딩·리네임·시맨틱 적용을 시각+요약으로 기록.
   기록은 항상 로컬(clientStorage)에, 조회/내보내기/비우기는 Team 게이팅(code).
   ============================================================ */

export type HistoryAction = 'create' | 'bind' | 'rename' | 'semantics';

export interface HistoryEntry {
  /** ms epoch. */
  at: number;
  action: HistoryAction;
  summary: string;
}

export const HISTORY_CAP = 100;

/** 새 항목을 앞에 추가(최신순)하고 cap으로 자른다(불변 반환). */
export function pushHistory(list: HistoryEntry[], entry: HistoryEntry, cap = HISTORY_CAP): HistoryEntry[] {
  return [entry, ...list].slice(0, cap);
}

const pad = (n: number): string => String(n).padStart(2, '0');

/** ms epoch → 'YYYY-MM-DD HH:MM' (UTC, 결정적 — 테스트 가능). */
export function formatTime(at: number): string {
  const d = new Date(at);
  return (
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ` +
    `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`
  );
}

const ACTION_LABEL: Record<HistoryAction, string> = {
  create: '토큰 생성',
  bind: '바인딩',
  rename: '리네임',
  semantics: '시맨틱',
};

/** 한 줄 표시 문자열. */
export function formatHistory(e: HistoryEntry): string {
  return `${formatTime(e.at)} · ${ACTION_LABEL[e.action]} · ${e.summary}`;
}

/** 내보내기용 텍스트(최신순 줄바꿈). */
export function serializeHistory(list: HistoryEntry[]): string {
  return list.map(formatHistory).join('\n');
}
