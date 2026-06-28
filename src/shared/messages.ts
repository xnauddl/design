/* ============================================================
   messages.ts — code(샌드박스) ↔ ui(iframe) 메시지 타입 단일 소스
   ============================================================ */
import type { DraftToken, ResolvedType, ScopeName } from '../lib/tokens';
import type { TextStyleSpec } from '../lib/textStyles';
import type { Tier } from '../lib/entitlements';
import type { LicenseStatus, VerifyResult } from '../lib/license';
import type { Preset } from '../lib/presets';
import type { ExportFormat } from '../lib/exporters';
import type { WcagLevel, ContrastFinding } from '../lib/contrast';
import type { FrameMeta, VaryingPosition } from '../lib/similar';

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

/** 변수 편집기(R1) — 컬렉션의 모드 하나(id + 표시명). */
export interface VarMode {
  modeId: string;
  name: string;
}

/** 변수 편집기 — 한 모드의 값 칸. 리터럴(표시 문자열) 또는 별칭(대상 변수). */
export interface VarValueCell {
  kind: 'literal' | 'alias';
  /** 표시/편집용 문자열 — COLOR=hex, FLOAT/STRING=문자열화. alias면 대상 이름. */
  display: string;
  /** kind='alias'일 때 대상 변수 id/이름. */
  aliasId?: string;
  aliasName?: string;
}

/**
 * 변수 편집기(R1)의 변수 한 개 스냅샷. 우리 3계층(Global/Semantic/Component)만 대상.
 * 다중 모드 컬렉션이면 modes가 2개 이상이고 values에 모드별 칸이 담긴다(단일 모드면 1개).
 */
export interface VarInfo {
  id: string;
  name: string;
  /** 소속 컬렉션 id(다크 생성 등 컬렉션 단위 작업용). */
  collectionId: string;
  /** 소속 컬렉션 이름('Global'|'Semantic'|'Component'). 읽기 전용(이동 불가). */
  collection: string;
  /** 읽기 전용(타입 고정). */
  type: ResolvedType;
  description: string;
  scopes: ScopeName[];
  hidden: boolean;
  modes: VarMode[];
  defaultModeId: string;
  /** modeId → 값 칸. */
  values: Record<string, VarValueCell>;
}

/** EDIT_VARIABLE 패치 — 지정한 속성만 변경(즉시 편집, 행별 단일 Undo). */
export interface VarPatch {
  name?: string;
  description?: string;
  scopes?: ScopeName[];
  hidden?: boolean;
  /** 값 변경 — modeId로 대상 모드 지정(단일 모드면 defaultModeId). literal/aliasId 택1. */
  value?: { modeId: string; literal?: string; aliasId?: string };
}

/** 컴포넌트 등록 후보(#1) — 선택 하위에서 스캔한 노드. eligible=등록 가능(체크). */
export interface ComponentCandidate {
  id: string;
  name: string;
  type: string;
  depth: number;
  parentId: string | null;
  eligible: boolean;
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
  | { type: 'EXPOSE_PROPERTIES' } // Phase 4.1(Pro): 컴포넌트 속성(Boolean/Text/Instance-swap) 노출
  | { type: 'SCAN_SIMILAR' } // 닮은 프레임 컴포넌트화: 선택 프레임 정렬·가변 위치·마스터 추천(미리보기, Free)
  | { type: 'FOCUS_NODE'; id: string } // 후보 행 포커스 → 캔버스에서 해당 노드 선택+줌(마스터 판단 근거)
  | { type: 'COMPONENTIZE_SIMILAR'; masterId: string; frameIds: string[] } // 적용(Paid): 마스터 컴포넌트 + 인스턴스 오버라이드
  | { type: 'CHECK_CONTRAST'; level: WcagLevel } // 명도 대비 점검(읽기 전용 감사)
  | { type: 'APPLY_CONTRAST_FIX'; nodeId: string; hex: string } // #2: 보정색을 해당 노드 단색 채움에 적용
  | { type: 'GET_VARIABLES' } // R1: 3계층 변수 목록(편집기)
  | { type: 'EDIT_VARIABLE'; id: string; patch: VarPatch } // R1: 변수 속성 즉시 편집
  | { type: 'DELETE_VARIABLE'; id: string } // R1: 변수 삭제
  | { type: 'GET_VARIABLE_USAGE'; id: string } // R2-C: 삭제/리네임 전 사용처 조회
  | { type: 'GENERATE_DARK_MODE'; collectionId: string; fromModeId: string; toModeId: string }; // R2-A: 라이트→다크 자동 채움

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
  | { type: 'EXPORT_RESULT'; format: ExportFormat; content: string } // 토큰 코드 내보내기 결과
  | { type: 'COMPONENT_CANDIDATES'; nodes: ComponentCandidate[] } // #1: 등록 후보 트리(영향+조상)
  | { type: 'COMPONENTS_RESULT'; registered: number; skipped: number; sets: number; singles: string[]; missing: string[] } // Phase 3: 등록 + 베이스 묶음 베리언트 세트
  | { type: 'VARIANTS_RESULT'; sets: number; missing: string[]; singles: string[] } // Phase 3
  | { type: 'GENERATE_RESULT'; generated: number; sets: number; combos: string[] } // Phase 4
  | { type: 'PROPERTIES_RESULT'; created: number; props: string[] } // Phase 4.1
  | {
      type: 'SIMILAR_CANDIDATES'; // 닮은 프레임 스캔 결과(미리보기)
      metas: FrameMeta[]; // 멤버 메타(점수 내림차순 → 추천 맨 앞)
      recommendedMasterId: string | null;
      varying: VaryingPosition[]; // 가변 위치(노출될 속성)
      imageWarnings: string[]; // 이미지 fill 경로(교체 불가 안내)
      excluded: { id: string; name: string; reason: string }[];
    }
  | { type: 'COMPONENTIZE_RESULT'; master: string; properties: number; instances: number; warnings: string[] }
  // 명도 대비 점검: 텍스트-배경 쌍 평가 결과 + 추출 단계에서 건너뛴 사유별 집계(skipped).
  | { type: 'CONTRAST_RESULT'; level: WcagLevel; checked: number; passed: number; failed: number; findings: ContrastFinding[]; skipped: Record<string, number> }
  | { type: 'VARIABLES'; vars: VarInfo[] } // R1: 편집기용 변수 목록
  | { type: 'EDIT_VARIABLE_RESULT'; id: string; ok: boolean; error?: string; var?: VarInfo; deleted?: boolean } // R1: 편집/삭제 결과
  // R2-C: 변수 사용처 — 바인딩된 노드 + 이 변수를 별칭하는 변수. capped=노드 스캔 상한 도달.
  | { type: 'VARIABLE_USAGE'; id: string; nodes: { id: string; name: string }[]; aliasedBy: { id: string; name: string }[]; capped: boolean }
  | { type: 'DARK_MODE_RESULT'; created: number; realiased: number; skipped: number } // R2-A: 다크 생성 결과
  | { type: 'ERROR'; message: string; op?: string }; // op: 실패한 UiToCode 종류(상태 라우팅용)

/** code → UI 안전 전송. */
export function post(msg: CodeToUi): void {
  figma.ui.postMessage(msg);
}
