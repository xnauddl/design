/* ============================================================
   messages.ts — code(샌드박스) ↔ ui(iframe) 메시지 타입 단일 소스
   ============================================================ */
import type { DraftToken } from '../lib/tokens';
import type { TextStyleSpec } from '../lib/textStyles';
import type { Tier } from '../lib/entitlements';
import type { LicenseStatus, VerifyResult } from '../lib/license';
import type { Preset } from '../lib/presets';
import type { ExportFormat } from '../lib/exporters';
import type { WcagLevel, ContrastFinding } from '../lib/contrast';

export interface CollectionInfo {
  id: string;
  name: string;
}

export interface RenameChange {
  id: string;
  before: string;
  after: string;
}

/**
 * 선택형 미리보기 트리(#13)의 한 노드. 선택 서브트리 전체를 평면(pre-order)으로 담되
 * `depth`/`parentId`로 계층을 복원한다. `after`가 있으면 **영향 노드**(리네임 대상),
 * 없으면 회색 맥락(보존). 바인딩(#6)·컴포넌트(#1) 미리보기도 같은 형태를 재사용한다.
 */
export interface RenameNode {
  id: string;
  /** 현재 이름(=before). */
  name: string;
  type: string;
  depth: number;
  parentId: string | null;
  /** 리네임 후 이름. 존재 시 영향 노드(체크 가능). */
  after?: string;
}

/**
 * 바인딩 미리보기(#6)의 한 후보 — (노드, 필드[, 페인트 인덱스])가 매칭한 변수.
 * 체크된 후보만 `APPLY_SELECTED`로 재매칭 없이 그대로 적용한다.
 */
export interface BindCandidate {
  nodeId: string;
  /** 'fills'|'strokes'|'effects'|'width'|'height'|'paddingLeft'|…|'fontSize'|'lineHeight'|'letterSpacing' */
  field: string;
  /** 색(fills/strokes/effects) 바인딩 시 페인트/효과 배열 내 인덱스. */
  index?: number;
  /** 표시용 현재값(hex 또는 숫자). */
  currentValue: string;
  variableId: string;
  variableName: string;
  /** Component 3 > Semantic 2. */
  tier: number;
  /** FLOAT 매칭 거리(0/undefined=정확). */
  distance?: number;
}

/** 바인딩 미리보기 트리(#13)의 맥락 노드 — 영향 노드 + 그 조상 체인. */
export interface BindNode {
  id: string;
  name: string;
  type: string;
  depth: number;
  parentId: string | null;
}

/** 컴포넌트 등록 후보(#1) — 선택 하위에서 스캔한 노드. eligible=등록 가능(체크). */
export interface ComponentCandidate {
  id: string;
  name: string;
  type: string;
  depth: number;
  parentId: string | null;
  eligible: boolean;
  /** 구조 그룹으로 묶일 세트 이름(미리보기). 세트(2개+) 후보일 때만. */
  group?: string;
  /** 도출된 베리언트(`Size=lg, Color=blue` 등) 미리보기. 세트 멤버일 때만. */
  variant?: string;
  /** 단독 컴포넌트로 등록될 후보의 등록 이름(PascalCase). 단독일 때만(group과 배타). */
  single?: string;
}

/** UI → code 요청. */
export type UiToCode =
  | { type: 'EXTRACT' }
  | { type: 'CREATE_TOKENS'; tokens: DraftToken[]; base: number; preview?: boolean; replacePalette?: boolean } // preview: UX1 미리보기(쓰기 없음) · replacePalette: 이전 팔레트 색 정리
  | { type: 'APPLY'; tolerance: number; preview?: boolean } // preview: UX1 dry-run(바인딩 없음)
  | { type: 'APPLY_SELECTED'; items: { nodeId: string; field: string; index?: number; variableId: string }[] } // #6: 미리보기 트리에서 체크한 후보만 직접 바인딩(WYSIWYG)
  | { type: 'CANCEL' } // UX6: 진행 중 작업 취소 요청
  | { type: 'RENAME'; apply: boolean; maxDepth: number }
  | { type: 'RENAME_APPLY'; items: { id: string; after: string }[] } // #7: 미리보기 트리에서 체크한 항목만 직접 적용(WYSIWYG)
  | { type: 'CREATE_SEMANTICS'; map: Record<string, string> }
  | { type: 'SCAN_TEXT_STYLES' } // Phase C: 선택 텍스트에서 스타일 후보 추출
  | { type: 'CREATE_TEXT_STYLES'; styles: TextStyleSpec[]; apply: boolean } // Phase C: 변수 보장+스타일 등록(+적용)
  | { type: 'GET_COLLECTIONS' }
  | { type: 'GET_GLOBAL_COLORS' } // #10: 기존 Global 색 변수 스캔(재방문 시맨틱 매핑 추천용)
  | { type: 'GET_PREREQ' } // #11: 단계 전제(변수 존재) 상태 요청
  | { type: 'RESIZE'; width: number; height: number; commit?: boolean } // #14: 창 리사이즈(commit 시 크기 저장)
  | { type: 'GET_LICENSE' }
  | { type: 'SET_LICENSE'; tier: Tier } // M1: 개발용 강제 티어(검증 키 없을 때만 적용)
  | { type: 'LICENSE_VERIFIED'; key: string; result: VerifyResult } // M2.2: UI가 검증한 결과 보고
  | { type: 'CLEAR_LICENSE' } // 키 제거 → 개발용 티어/Free로 복귀
  | { type: 'GET_PRESETS' } // M3(Team): 저장된 프리셋 목록 요청
  | { type: 'SAVE_PRESET'; preset: Preset } // M3(Team): 프리셋 저장/갱신
  | { type: 'DELETE_PRESET'; name: string } // M3(Team): 프리셋 삭제
  | { type: 'EXPORT'; format: ExportFormat; fontSizeUnit: 'px' | 'rem'; base: number } // 토큰 코드 내보내기
  | { type: 'SCAN_COMPONENT_CANDIDATES' } // #1(Pro): 선택 하위 순회 → 등록 후보 트리
  | { type: 'REGISTER_COMPONENTS'; nodeIds?: string[] } // Phase 3(Pro): 후보(트리 선택 nodeIds, 없으면 선택 프레임 '내부' 후보) → 메인 컴포넌트 등록 + 베이스 묶음 베리언트 세트
  | { type: 'CLASSIFY_VARIANTS' } // Phase 3(Pro): 같은 베이스 컴포넌트 → 베리언트 세트
  | { type: 'GENERATE_MISSING_VARIANTS' } // Phase 4(Pro): 선택 세트의 빠진 조합 자동 생성
  | { type: 'CHECK_CONTRAST'; level: WcagLevel } // 명도 대비 점검(읽기 전용 감사)
  | { type: 'APPLY_CONTRAST_FIX'; nodeId: string; hex: string }; // #2: 보정색을 해당 노드 단색 채움에 적용

/** code → UI 응답. */
export type CodeToUi =
  | { type: 'EXTRACT_RESULT'; tokens: DraftToken[]; warnings: string[]; selection: number }
  // UX5: 실시간 선택 동기화 — 선택 수·하위 요소 수·바인딩 후보 수(capped: 스캔 상한 도달).
  | { type: 'SELECTION_STATE'; count: number; scanned: number; bindable: number; capped: boolean }
  | { type: 'CREATE_RESULT'; created: number; updated: number; summary: string; limited?: boolean; preview?: boolean }
  | { type: 'APPLY_RESULT'; bound: number; skipped: number; flags: string[]; reasons: Record<string, number>; limited?: boolean; preview?: boolean; cancelled?: boolean; candidates?: BindCandidate[]; nodes?: BindNode[] } // candidates/nodes: 미리보기 트리(#6·#13)
  | { type: 'PROGRESS'; op: 'bind'; done: number; total: number } // UX6: 진행률
  | { type: 'RENAME_RESULT'; changes: RenameChange[]; nodes: RenameNode[]; applied: boolean } // nodes: 선택형 트리(#13)용 전체 서브트리
  | { type: 'SEMANTICS_RESULT'; created: number; updated: number; aliased: number; missing: string[] }
  | { type: 'TEXT_STYLE_CANDIDATES'; styles: TextStyleSpec[]; warnings: string[] } // Phase C: 스캔 결과
  | { type: 'TEXT_STYLES_RESULT'; created: number; updated: number; bound: number; applied: number; missing: string[] } // Phase C
  | { type: 'COLLECTIONS'; collections: CollectionInfo[] }
  | { type: 'GLOBAL_COLORS'; colors: { name: string; hex: string }[] } // #10: 기존 Global 색(이름+hex)
  // #11: 단계 전제 — Global 변수 존재(시맨틱 매핑 가능) · 바인딩 가능 변수(Semantic/Component) 존재(바인딩 가능).
  | { type: 'PREREQ_STATE'; hasGlobal: boolean; hasBindable: boolean }
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
  | { type: 'REQUEST_VERIFY'; key: string } // M2.2: code → UI에 (재)검증 요청(WebCrypto는 UI에서)
  | { type: 'PRESETS'; presets: Preset[] } // M3(Team): 프리셋 목록
  | { type: 'EXPORT_RESULT'; format: ExportFormat; content: string } // 토큰 코드 내보내기 결과
  | { type: 'COMPONENT_CANDIDATES'; nodes: ComponentCandidate[] } // #1: 등록 후보 트리(영향+조상)
  | { type: 'COMPONENTS_RESULT'; registered: number; skipped: number; sets: number; singles: string[]; exposed?: number; missing: string[]; failures?: string[] } // Phase 3: 등록 + 세트 묶음 + 속성 자동 노출(exposed). failures: 실패 진단
  | { type: 'VARIANTS_RESULT'; sets: number; missing: string[]; singles: string[]; failures?: string[] } // Phase 3(베리언트 분류, failures: 결합/정렬 실패 진단)
  | { type: 'GENERATE_RESULT'; generated: number; sets: number; combos: string[] } // Phase 4
  // 명도 대비 점검: 텍스트-배경 쌍 평가 결과 + 추출 단계에서 건너뛴 사유별 집계(skipped).
  | { type: 'CONTRAST_RESULT'; level: WcagLevel; checked: number; passed: number; failed: number; findings: ContrastFinding[]; skipped: Record<string, number> }
  | { type: 'ERROR'; message: string; op?: string }; // op: 실패한 UiToCode 종류(상태 라우팅용)

/** code → UI 안전 전송. */
export function post(msg: CodeToUi): void {
  figma.ui.postMessage(msg);
}
