/* ============================================================
   messages.ts — code(샌드박스) ↔ ui(iframe) 메시지 타입 단일 소스
   ============================================================ */
import type { DraftToken } from '../lib/tokens';
import type { Tier } from '../lib/entitlements';

export interface CollectionInfo {
  id: string;
  name: string;
}

export interface RenameChange {
  id: string;
  before: string;
  after: string;
}

/** UI → code 요청. */
export type UiToCode =
  | { type: 'EXTRACT' }
  | { type: 'CREATE_TOKENS'; tokens: DraftToken[]; base: number }
  | { type: 'APPLY'; tolerance: number }
  | { type: 'RENAME'; apply: boolean; maxDepth: number }
  | { type: 'CREATE_SEMANTICS'; map: Record<string, string> }
  | { type: 'GET_COLLECTIONS' }
  | { type: 'GET_LICENSE' }
  | { type: 'SET_LICENSE'; tier: Tier }; // M1: 개발용 티어 토글(결제 없음)

/** code → UI 응답. */
export type CodeToUi =
  | { type: 'EXTRACT_RESULT'; tokens: DraftToken[]; warnings: string[]; selection: number }
  | { type: 'CREATE_RESULT'; created: number; updated: number; summary: string; limited?: boolean }
  | { type: 'APPLY_RESULT'; bound: number; skipped: number; flags: string[]; limited?: boolean }
  | { type: 'RENAME_RESULT'; changes: RenameChange[]; applied: boolean }
  | { type: 'SEMANTICS_RESULT'; created: number; updated: number; aliased: number; missing: string[] }
  | { type: 'COLLECTIONS'; collections: CollectionInfo[] }
  | { type: 'LICENSE_STATUS'; tier: Tier; unlimited: boolean }
  | { type: 'PREMIUM_REQUIRED'; feature: string; message: string }
  | { type: 'ERROR'; message: string };

/** code → UI 안전 전송. */
export function post(msg: CodeToUi): void {
  figma.ui.postMessage(msg);
}
