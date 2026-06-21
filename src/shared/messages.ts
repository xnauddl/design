/* ============================================================
   messages.ts — code(샌드박스) ↔ ui(iframe) 메시지 타입 단일 소스
   ============================================================ */
import type { DraftToken } from '../lib/tokens';
import type { Tier } from '../lib/entitlements';
import type { LicenseStatus } from '../lib/license';

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
  | { type: 'SET_LICENSE'; tier: Tier } // M1: 개발용 강제 티어(검증 키 없을 때만 적용)
  | { type: 'SET_LICENSE_KEY'; key: string } // M2: 라이선스 키 검증 요청
  | { type: 'CLEAR_LICENSE' }; // 키 제거 → 개발용 티어/Free로 복귀

/** code → UI 응답. */
export type CodeToUi =
  | { type: 'EXTRACT_RESULT'; tokens: DraftToken[]; warnings: string[]; selection: number }
  | { type: 'CREATE_RESULT'; created: number; updated: number; summary: string; limited?: boolean }
  | { type: 'APPLY_RESULT'; bound: number; skipped: number; flags: string[]; limited?: boolean }
  | { type: 'RENAME_RESULT'; changes: RenameChange[]; applied: boolean }
  | { type: 'SEMANTICS_RESULT'; created: number; updated: number; aliased: number; missing: string[] }
  | { type: 'COLLECTIONS'; collections: CollectionInfo[] }
  | {
      type: 'LICENSE_STATUS';
      tier: Tier;
      unlimited: boolean;
      /** 라이선스 출처: 검증 키 / 개발용 강제 / 없음. */
      source: 'key' | 'dev' | 'none';
      /** 키 기반일 때의 캐시 평가 상태. */
      status?: LicenseStatus;
      /** 구독 만료(ms epoch). */
      expiresAt?: number;
      /** 마지막 작업 관련 메시지(검증 실패·오프라인 안내 등). */
      note?: string;
    }
  | { type: 'PREMIUM_REQUIRED'; feature: string; message: string }
  | { type: 'ERROR'; message: string };

/** code → UI 안전 전송. */
export function post(msg: CodeToUi): void {
  figma.ui.postMessage(msg);
}
