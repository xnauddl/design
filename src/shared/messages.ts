/* ============================================================
   messages.ts — code(샌드박스) ↔ ui(iframe) 메시지 타입 단일 소스
   ============================================================ */
import type { DraftToken } from '../lib/tokens';
import type { Tier } from '../lib/entitlements';
import type { LicenseStatus, VerifyResult } from '../lib/license';
import type { Preset } from '../lib/presets';
import type { HistoryEntry } from '../lib/history';
import type { ExportFormat } from '../lib/exporters';

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
  | { type: 'CREATE_TOKENS'; tokens: DraftToken[]; base: number; preview?: boolean } // preview: UX1 미리보기(쓰기 없음)
  | { type: 'APPLY'; tolerance: number; preview?: boolean } // preview: UX1 dry-run(바인딩 없음)
  | { type: 'CANCEL' } // UX6: 진행 중 작업 취소 요청
  | { type: 'RENAME'; apply: boolean; maxDepth: number }
  | { type: 'CREATE_SEMANTICS'; map: Record<string, string> }
  | { type: 'GET_COLLECTIONS' }
  | { type: 'GET_LICENSE' }
  | { type: 'SET_LICENSE'; tier: Tier } // M1: 개발용 강제 티어(검증 키 없을 때만 적용)
  | { type: 'LICENSE_VERIFIED'; key: string; result: VerifyResult } // M2.2: UI가 검증한 결과 보고
  | { type: 'CLEAR_LICENSE' } // 키 제거 → 개발용 티어/Free로 복귀
  | { type: 'GET_PRESETS' } // M3(Team): 저장된 프리셋 목록 요청
  | { type: 'SAVE_PRESET'; preset: Preset } // M3(Team): 프리셋 저장/갱신
  | { type: 'DELETE_PRESET'; name: string } // M3(Team): 프리셋 삭제
  | { type: 'GET_HISTORY' } // M3.1(Team): 변경 이력 조회
  | { type: 'CLEAR_HISTORY' } // M3.1(Team): 변경 이력 비우기
  | { type: 'EXPORT'; format: ExportFormat; fontSizeUnit: 'px' | 'rem'; base: number; includeSnapshots: boolean } // 토큰 코드 내보내기
  | { type: 'REGISTER_COMPONENTS' } // Phase 3(Pro): 선택 프레임 → 메인 컴포넌트
  | { type: 'CLASSIFY_VARIANTS' } // Phase 3(Pro): 같은 베이스 컴포넌트 → 베리언트 세트
  | { type: 'GENERATE_MISSING_VARIANTS' } // Phase 4(Pro): 선택 세트의 빠진 조합 자동 생성
  | { type: 'EXPOSE_PROPERTIES' }; // Phase 4.1(Pro): 컴포넌트 속성(Boolean/Text/Instance-swap) 노출

/** code → UI 응답. */
export type CodeToUi =
  | { type: 'EXTRACT_RESULT'; tokens: DraftToken[]; warnings: string[]; selection: number }
  // UX5: 실시간 선택 동기화 — 선택 수·하위 요소 수·바인딩 후보 수(capped: 스캔 상한 도달).
  | { type: 'SELECTION_STATE'; count: number; scanned: number; bindable: number; capped: boolean }
  | { type: 'CREATE_RESULT'; created: number; updated: number; summary: string; limited?: boolean; preview?: boolean }
  | { type: 'APPLY_RESULT'; bound: number; skipped: number; flags: string[]; reasons: Record<string, number>; limited?: boolean; preview?: boolean; cancelled?: boolean }
  | { type: 'PROGRESS'; op: 'bind'; done: number; total: number } // UX6: 진행률
  | { type: 'RENAME_RESULT'; changes: RenameChange[]; applied: boolean }
  | { type: 'SEMANTICS_RESULT'; created: number; updated: number; aliased: number; missing: string[] }
  | { type: 'COLLECTIONS'; collections: CollectionInfo[] }
  | {
      type: 'LICENSE_STATUS';
      tier: Tier;
      /** 유료(Paid) 여부 — 유료 기능 잠금 해제 표시용. */
      paid: boolean;
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
  | { type: 'REQUEST_VERIFY'; key: string } // M2.2: code → UI에 (재)검증 요청(WebCrypto는 UI에서)
  | { type: 'PRESETS'; presets: Preset[] } // M3(Team): 프리셋 목록
  | { type: 'HISTORY'; entries: HistoryEntry[] } // M3.1(Team): 변경 이력
  | { type: 'EXPORT_RESULT'; format: ExportFormat; content: string } // 토큰 코드 내보내기 결과
  | { type: 'COMPONENTS_RESULT'; registered: number; skipped: number } // Phase 3
  | { type: 'VARIANTS_RESULT'; sets: number; missing: string[]; singles: string[] } // Phase 3
  | { type: 'GENERATE_RESULT'; generated: number; sets: number; combos: string[] } // Phase 4
  | { type: 'PROPERTIES_RESULT'; created: number; props: string[] } // Phase 4.1
  | { type: 'ERROR'; message: string; op?: string }; // op: 실패한 UiToCode 종류(상태 라우팅용)

/** code → UI 안전 전송. */
export function post(msg: CodeToUi): void {
  figma.ui.postMessage(msg);
}
