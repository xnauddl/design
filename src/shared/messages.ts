/* ============================================================
   messages.ts — code(샌드박스) ↔ ui(iframe) 메시지 타입 단일 소스
   ============================================================ */
import type { VarCollection, VarRow, LibraryVar, VarCell, EditValue } from '../lib/varTable';
import type { ApplyTarget } from '../lib/varKind';
import type { DraftToken } from '../lib/tokens';
import type { StyleCluster, TextStyleSpec } from '../lib/textStyles';
import type { Tier, Feature } from '../lib/entitlements';
import type { LicenseStatus, VerifyResult } from '../lib/license';
import type { ExportFormat } from '../lib/exporters';

export interface VarMode {
  modeId: string;
  name: string;
}

/**
 * 변수 한 개의 목록용 스냅샷. 우리 3계층(Global/Semantic/Component)만 대상.
 * 값 편집은 Figma Variables 패널의 몫이라 여기엔 값이 없다 — 다크 테마 생성이
 * 컬렉션과 모드를 고르는 데 필요한 만큼만 담는다.
 */
export interface VarInfo {
  id: string;
  name: string;
  /** 소속 컬렉션 id(다크 생성 등 컬렉션 단위 작업용). */
  collectionId: string;
  /** 소속 컬렉션 이름(표시용 — 'Primitives' 등 무엇이든 될 수 있다). */
  collection: string;
  /** 계층(Global 1 · Semantic 2 · Component 3) — 플러그인 컬렉션은 그 역할, 사용자 컬렉션은 내용으로 판단(§2.13). */
  tier: number;
  /** 플러그인 컬렉션이면 그 역할(§2.13 — 다크 대상은 플러그인 Semantic뿐). */
  owned?: 'global' | 'semantic';
  modes: VarMode[];
}

export interface CollectionInfo {
  id: string;
  name: string;
}

export interface RenameChange {
  id: string;
  before: string;
  after: string;
  /** 보이는 이름에서 루트 접두사를 뗐으면 떼기 전 이름(ia-v4 §4.4) — 적용 때 `dsNameKey`로 남긴다. */
  nameKey?: string;
}

/**
 * 선택형 미리보기 트리(#13)의 한 노드. 선택 서브트리 전체를 평면(pre-order)으로 담되
 * `depth`/`parentId`로 계층을 복원한다. `after`가 있으면 **영향 노드**(리네임 대상),
 * 없으면 회색 맥락(보존). 바인딩(#6) 미리보기도 같은 형태를 재사용한다.
 */
/** 리네임에서 이름을 지키는 사유(#7b). 라벨은 i18n `rename.keep.<reason>`. */
export type KeepReason = 'root' | 'instance' | 'component' | 'text' | 'locked';

export interface RenameNode {
  id: string;
  /** 현재 이름(=before). */
  name: string;
  type: string;
  depth: number;
  parentId: string | null;
  /** 리네임 후 이름. 존재 시 영향 노드(체크 가능). */
  after?: string;
  /** 사람이 지은 이름이라 이름을 지키고 역할만 기록하는 노드(ia-v4 §4.4 "S-2b 이름 보존") — 적용 때 `dsKept`를 기록한다(SC-D51). */
  kept?: boolean;
  /** 이름을 지킨 이유(#7b). 있으면 대상이 아니라는 뜻 — 미리보기에서 흐린 행으로 보인다.
   *  없고 after도 없으면 '역할이 지금 이름과 같아 바꿀 게 없는' 평범한 맥락 노드다. */
  keep?: KeepReason;
  /** 이 이름을 만든 역할(card·thumbnail…). 적용 때 `dsRole`로 남긴다(이름 정리 · 텍스트 스타일 label 판정이 읽는다). */
  role?: string;
  /** 판정 이름 ≠ 보이는 이름(루트 접두사를 뗌)이면 판정 이름 — 이름이 그대로인 다시 정리에서도 싣는다(ia-v4 §4.4). */
  nameKey?: string;
}

/**
 * 바인딩 미리보기(#6)의 한 후보 — (노드, 필드[, 페인트 인덱스])가 매칭한 변수.
 * 체크된 후보만 `APPLY_SELECTED`로 연결한다(연결 직전 자리마다 다시 확인 — bindSelectedItems).
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
  /** 변수 값(표시용 — 연결 목록의 변수 묶음 줄, §4.6). */
  variableValue?: string;
  /** 붙을 변수의 타입(연결 줄 동그라미 · 종류 표시 — ia-v4 §2.7 TR-P19). 새 역할이면 가리킬 Global의 타입. */
  resolvedType?: 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN';
  /** 색: 현재 칠하기 · 그림자의 투명도(소수 둘째 자리) — 1이면 없음. 값 칩 "#000000 8%"(ia-v3 §2.11). */
  currentAlpha?: number;
  /** 색: 변수 값의 투명도(소수 둘째 자리) — 1이면 없음. */
  variableAlpha?: number;
  /** 새 역할(§2.12 12.9) — 연결할 때 만든다. 이때 variableId는 `new:{이름}`(카드 묶음 키). */
  newRole?: NewRoleRef;
  /** 새 역할이 가리킬 Global 이름(칩 툴팁 "…{Global}을 가리켜요"). */
  newRoleGlobalName?: string;
  /** 선택 밖 메인 컴포넌트 안 자리면 그 메인 단위 id(세트면 COMPONENT_SET id — ia-v3 §2.11 11번). */
  mainId?: string;
  /** 9999로 붙이는 알약 반경 자리면 찾을 때 읽은 원래 값(ia-v3 §2.12 12.12 N-D5) — 연결 직전 다시 확인에 쓴다. */
  pillFrom?: number;
  /** 용도 예외(ia-v4 §2.9 S2-P3 — 유료 · 무료) — 붙이기 바로 전에 이 용도를 그 플러그인 Global(새 역할이면 가리킬 Global)에 더한다. */
  scopeAdd?: string;
}

/** 함께 연결하는 선택 밖 메인 컴포넌트 단위(세트는 하나 — ia-v3 §2.11 11번). */
export interface MainUnitInfo {
  id: string;
  name: string;
  page: string;
}

/** 연결할 때 만들 쓰임 역할(§2.12). 값은 globalId Global의 별칭, 용도는 scopes. */
export interface NewRoleRef {
  name: string;
  globalId: string;
  scopes: string[];
}

/**
 * 바인딩에서 건너뛴 레이어 1건 — 사유 집계가 숫자만 남기면 어떤 레이어가 왜 빠졌는지
 * 찾을 수 없어, 미리보기에서 사유별로 레이어를 선택할 수 있게 함께 싣는다.
 * 노드×사유로 중복 제거되어 있다(같은 노드의 padding 4건은 1건).
 */
export interface BindSkip {
  nodeId: string;
  name: string;
  type: string;
  /** REASON_LABELS의 키 — 'no-match' · 'hug-fill' · 'size-fraction' 등. */
  reason: string;
  /** 어느 속성에서 났는지(있으면). 예: 'width' · 'paddingLeft'. */
  field?: string;
}

/** 바인딩 미리보기 트리(#13)의 맥락 노드 — 영향 노드 + 그 조상 체인. */
export interface BindNode {
  id: string;
  name: string;
  type: string;
  depth: number;
  parentId: string | null;
}

/**
 * [기존 스타일 연결]에서 건너뛴 텍스트의 사유(§4.6, §2.11).
 * - hasStyle: 이미 텍스트 스타일이 붙음(원격·일부 구간 포함)
 * - noStyle: 모든 글자 속성이 같은 스타일이 없음
 * - ambiguous: 같은 모양의 스타일이 둘 이상
 * - mixed: 구간마다 서식이 다름(크기·글꼴·대소문자·밑줄 등)
 * - instance: 인스턴스 안쪽 글자
 * 글자 변수가 붙은 글자는 건너뛰지 않는다 — 변수 연결을 떼고 스타일을 붙인다(IA v4 §2.3-6, 예전 사유 `boundVars`는 없앴다).
 */
export type TextStyleSkipReason = 'hasStyle' | 'noStyle' | 'ambiguous' | 'mixed' | 'instance';

/** 타이포 등록 · 바로 연결(IA v4 §4.3 "타이포 등록")에서 못 붙인 글자의 사유 — 값이 방금 스타일과 같은 글자만 센다. */
export type TextStyleApplySkipReason = 'hasStyle' | 'instance' | 'ambiguous';

/** 만들기 미리보기의 토큰별 상태(IA v4 §4.3 상태 태그). varName: reuse일 때 쓸 기존 변수 이름, new일 때는 파일과 견줘 바뀐 최종 이름(ia-v3 §2.12 12.11 — 없으면 토큰 이름). */
export interface TokenState {
  state: 'new' | 'update' | 'reuse' | 'manual';
  varName?: string;
}

/** 만들기 미리보기의 Semantic 줄(IA v4 §4.3) — 역할 이름 · 가리킬 Global 이름 · 그 역할을 만든 토큰 이름. */
export interface RoleRow {
  name: string;
  global: string;
  token: string;
}

/** 기존 로컬 텍스트 스타일 — 이름 겹침 잠금용(sig = `tsSig`). */
export interface ExistingStyleSig {
  name: string;
  sig: string;
}

/**
 * 변수 고치기 실패 사유 — deleted: 변수가 없음(1단계) · conflict: 다른 곳에서 바뀜(2단계, 아무것도 안 바꿈) ·
 * name / value: 피그마가 이름·값을 받지 않음(3단계, modeId는 값일 때) · other: 그 밖. message는 피그마가 준 원문.
 */
export interface VarUpdateError {
  code: 'deleted' | 'conflict' | 'name' | 'value' | 'other';
  modeId?: string;
  message?: string;
}

/** UI → code 요청. */
export type UiToCode =
  | { type: 'EXTRACT'; nodeIds?: string[]; reqId?: number } // reqId: 만들기 화면 요청 번호(결과에 그대로 돌려줌, IA v4 §4.3) · nodeIds: 목록 기준(IA v4 §2.5), 없으면 지금 선택
  | { type: 'CREATE_TOKENS'; tokens: DraftToken[]; base: number; preview?: boolean; replacePalette?: boolean; reqId?: number; globalOnly?: boolean } // preview: UX1 미리보기(쓰기 없음) · replacePalette: 이전 팔레트 색 정리 · globalOnly: Global만(Semantic을 만들지 않음 — 무료도 됨, IA v4 §4.3 무료 규칙)
  // reqId: 연결 카드 요청 번호 — 결과에 그대로 돌려줘 UI가 낡은 응답(선택이 바뀐 뒤 도착한 것)을 버린다.
  // 매칭은 언제나 "같은 값"(IA v3 §2.11 — 숫자 소수 2자리, 색 #RRGGBB + 양쪽 불투명). 허용오차는 없앴다.
  // skipTextStyleNodes: 로컬 텍스트 스타일 후보가 있는 글자의 글자 자리(fontSize · lineHeight · letterSpacing · fontFamily)는 붙이지 않는다(만들기 실행의 연결 — IA v4 §4.3).
  | { type: 'APPLY'; preview?: boolean; reqId?: number; nodeIds?: string[]; skipTextStyleNodes?: boolean; only?: { value: string | number; alpha?: number; groups: string[] }[]; off?: { value: string | number; alpha?: number; groups: string[] }[] } // preview: UX1 dry-run(바인딩 없음)
  | { type: 'PREVIEW_TEXT_STYLES'; reqId: number; nodeIds?: string[] } // 기존 스타일 연결 미리보기(IA v4 §4.2) — 쓰지 않는다
  | { type: 'APPLY_SELECTED'; items: { nodeId: string; field: string; index?: number; variableId: string; newRole?: NewRoleRef; mainId?: string; pillFrom?: number; scopeAdd?: string }[]; textStyles?: { styleId: string; nodeIds: string[]; mainIds?: (string | null)[] }[]; reqId?: number } // #6: 체크한 후보만 연결 — 연결 직전 자리마다 다시 확인해 바뀐 곳은 건너뛴다(§4.6)
  | { type: 'SELECT_NODES'; ids: string[] } // 스킵 사유 → 해당 레이어를 캔버스에서 선택·이동(읽기 전용)
  | { type: 'GET_VAR_TABLE' } // 변수 관리: 로컬 변수 전부(모드별 값·별칭 이름·용도·설명)
  // 변수 고치기(§4.4 고치기, PR 3.5) — 고친 것만. base = 팝업을 열 때(또는 마지막 저장 응답 뒤)의 이름과 고친 모드의 칸(값 없음은 null).
  // IA v4 §4.7 클릭 연결 — 지금 캔버스 선택의 레이어 각각에 변수 하나를 붙인다(target 없으면 속성 고르기).
  | { type: 'APPLY_VARIABLE'; reqId: number; id: string; target?: ApplyTarget }
  // IA v4 §4.9 새 변수 — collectionId 없으면 사용자 컬렉션 `Variables`를 새로 만든다(그때 values 키는 '*' = 그 컬렉션의 첫 모드).
  | { type: 'CREATE_VARIABLE'; reqId: number; collectionId?: string; name: string; varType: 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN'; values: Record<string, EditValue>; scopes?: string[] }
  | { type: 'DUPLICATE_VARIABLE'; reqId: number; id: string }
  | { type: 'DELETE_VARIABLE'; reqId: number; id: string }
  | { type: 'UPDATE_VARIABLE'; reqId: number; id: string; name?: string; values?: Record<string, EditValue>; base: { name: string; values: Record<string, VarCell | null> } }
  // IA v3 변수 목록(§4.4) — 보기 전용 사용 수. nodeIds = 목록 기준(없으면 지금 선택). 인스턴스 안쪽 포함, 상한 없음.
  | { type: 'SCAN_USAGE'; reqId: number; nodeIds?: string[] }
  // 상세 "쓰인 곳" — 변수들(간접이면 그 변수를 가리키는 별칭들까지) 중 하나라도 쓰는 레이어, 이름은 최대 limit개.
  | { type: 'FIND_VAR_USERS'; reqId: number; varIds: string[]; nodeIds: string[]; limit: number }
  // 사용 레이어 선택 / 별칭으로 쓰는 레이어 선택 — 그때 새로 찾아 최대 200개 선택(응답은 SELECT_RESULT).
  | { type: 'SELECT_VAR_USERS'; varIds: string[]; nodeIds: string[] }
  | { type: 'CANCEL'; op?: 'unused' } // UX6: 진행 중 작업 취소 요청. op 'unused' = 안 쓰는 변수 읽기 · 확인만(docs/unused-vars.md §5)
  // 안 쓰는 변수 찾기(docs/unused-vars.md) — 파일 전체 읽기 · 다시 확인 뒤 지우기
  | { type: 'SCAN_UNUSED_VARS'; reqId: number }
  | { type: 'DELETE_VARIABLES'; reqId: number; ids: string[] }
  | { type: 'RENAME'; apply: boolean; maxDepth: number; nodeIds?: string[]; reqId?: number }
  | { type: 'UNBIND_DELETED'; reqId: number; nodeIds?: string[] } // 삭제된 변수 연결 풀기(IA v4 §4.1 카드 3)
  // role: 미리보기가 판정한 역할 — 적용 시 `dsRole`로 남긴다(이름 정리 · 텍스트 스타일 label 판정이 읽는다).
  | { type: 'RENAME_APPLY'; items: { id: string; before: string; after: string; role?: string; nameKey?: string; kept?: boolean }[]; reqId?: number } // #7: 미리보기 트리에서 체크한 항목만 직접 적용(WYSIWYG)
  | { type: 'CREATE_SEMANTICS'; map: Record<string, string> }
  // nodeIds: 목록 기준(없으면 지금 선택). reqId가 있으면 만들기 화면의 조용한 후보 읽기 — 응답에 existing을 싣고 lastTextSamples를 덮어쓰지 않는다(IA v4 §4.3).
  | { type: 'SCAN_TEXT_STYLES'; nodeIds?: string[]; reqId?: number } // Phase C: 선택 텍스트 후보 — 이름은 KRDS 규칙(heading/large…, docs/text-style-krds.md)
  // 스캔 결과에 가로 행 라벨 이름을 덧입힌다. 스캔의 옵션이 아니라 뒤따르는 별도 동작이다
  // (결정 2026-08-06) — 켜고 스캔하는 대신, 결과를 보고 마음에 안 들면 눌러 이름만 다시 매긴다.
  | { type: 'NAME_TEXT_STYLES_BY_ROW' }
  // applyTo: 바로 연결 — 그 루트 안에서 방금 등록 · 갱신한 스타일과 값이 같은 글자에 붙인다(IA v4 §4.3 "타이포 등록", 같은 ⌘Z).
  | { type: 'CREATE_TEXT_STYLES'; styles: TextStyleSpec[]; reqId?: number; applyTo?: string[] } // Phase C: 변수 보장+스타일 등록
  | { type: 'GET_COLLECTIONS' }
  | { type: 'SET_UI_SIZE'; mode: 'default' | 'mini' } // IA v3: 최소화(140×104) / 펼치기(400×510), 저장 안 함
  | { type: 'GET_PREREQ' } // #11: 단계 전제(변수 존재) 상태 요청
  | { type: 'GET_LICENSE' }
  | { type: 'SET_LICENSE'; tier: Tier } // M1: 개발용 강제 티어(검증 키 없을 때만 적용)
  | { type: 'LICENSE_VERIFIED'; key: string; result: VerifyResult } // M2.2: UI가 검증한 결과 보고
  | { type: 'CLEAR_LICENSE' } // 키 제거 → 개발용 티어/Free로 복귀
  // 결제/구독 관리 링크 열기. UI 아이프레임은 외부 링크를 못 열어 code의 openExternal 경유.
  // URL은 code가 licenseConfig에서 해석한다(임의 URL 전달 금지 — 열린 리다이렉트 방지).
  | { type: 'OPEN_LICENSE_LINK'; target: 'purchase' | 'portal' }
  | { type: 'EXPORT'; format: ExportFormat; fontSizeUnit: 'px' | 'rem'; base: number } // 토큰 코드 내보내기
  | { type: 'GET_SETTINGS' } // #19: 설정 탭 설정(기준 크기·리네임 맥락 깊이) 불러오기
  | { type: 'SET_SETTINGS'; base: number; maxDepth: number; grid: number } // 바뀔 때마다 clientStorage에 보관
  | { type: 'GET_VARIABLES' } // 3계층 변수 목록(다크 테마 생성의 컬렉션·모드 선택용)
  // 모드 id는 선택 — 생략하면 themeApply가 Light를 고르고 Dark가 없으면 addMode('Dark')로 만든다.
  // 다크 만들기 — 대상 · 모드는 플러그인이 정한다(플러그인 Global, 기본 모드 → Dark — ia-v3 13.7). migrate: 옛 구조 옮기기 확인을 받았을 때만 참.
  | { type: 'GENERATE_DARK_MODE'; migrate?: boolean };

/** code → UI 응답. */
export type CodeToUi =
  | { type: 'UI_SIZE'; mode: 'default' | 'mini' } // 지금 창 크기(최소화 여부)
  | { type: 'EXTRACT_RESULT'; tokens: DraftToken[]; warnings: string[]; selection: number; reqId?: number }
  // UX5: 실시간 선택 동기화 — 선택 수·하위 요소 수·바인딩 후보 수(capped: 스캔 상한 도달).
  | { type: 'SELECTION_STATE'; count: number; scanned: number; bindable: number; capped: boolean; selfSelect?: boolean; firstName?: string; ids?: string[] } // selfSelect: 플러그인이 만든 선택 변경(미리보기 유지)
  | { type: 'VAR_TABLE'; collections: VarCollection[]; vars: VarRow[] }
  // 변수 고치기 응답 — applied: 바꾼 것('name' 또는 modeId), 순서대로. 변수 표는 따로 보내지 않는다(UI가 다시 읽는다).
  | { type: 'VARIABLE_APPLIED'; reqId: number; applied: number; skipped: number; skipReasons: Record<string, number>; name: string } // applied · skipped = 레이어 수
  | { type: 'VARIABLE_CREATED'; reqId: number; id: string }
  | { type: 'VARIABLE_DUPLICATED'; reqId: number; newId: string }
  | { type: 'VARIABLE_DELETED'; reqId: number; id: string }
  | { type: 'VARIABLE_UPDATED'; reqId: number; ok: boolean; applied: string[]; error?: VarUpdateError }
  | { type: 'USAGE_RESULT'; reqId: number; usage: Record<string, { places: number; layers: number }>; libraryVars: LibraryVar[]; deleted: { count: number; nodeIds: string[] }; scanned: number }
  | { type: 'VAR_USERS'; reqId: number; layers: { id: string; name: string }[]; totalLayers: number; places: number }
  | { type: 'SELECT_RESULT'; found: number; requested: number; capped?: boolean } // 사유 칩 → 레이어 선택 결과(사라진 레이어·상한 안내)
  // roles: 새로 만든(미리보기는 만들) 쓰임 역할 수(§2.12 12.10). tokenStates · roleRows: 미리보기만(IA v4 §4.3 — roleRows.length = roles).
  | { type: 'CREATE_RESULT'; created: number; updated: number; summary: string; preview?: boolean; roles?: number; skippedManual?: number; reqId?: number; tokenStates?: Record<string, TokenState>; roleRows?: RoleRow[] }
  | { type: 'APPLY_RESULT'; bound: number; skipped: number; reasons: Record<string, number>; newRoles?: number; preview?: boolean; cancelled?: boolean; candidates?: BindCandidate[]; nodes?: BindNode[]; skips?: BindSkip[]; skipLayers?: Record<string, number>; reqId?: number; counts?: Record<string, Record<string, number>>; textStylesApplied?: number; textStylesSkipped?: number; mains?: MainUnitInfo[]; mainsBound?: string[]; make?: { kind: string; value: string | number; alpha?: number; by: Record<string, number> }[] } // mains: 함께 걸은 선택 밖 메인 단위 · mainsBound: 실제로 붙인 메인 단위 id(ia-v3 §2.11 11번). candidates/nodes: 미리보기 트리(#6·#13), skips: 사유별 레이어(상한까지). APPLY_SELECTED 결과면 skipped/reasons/skips = 연결 직전 다시 확인에서 건너뛴 자리('already-bound'·'deleted-var'·'styled'·'changed'·'error', 속성 단위)
  | { type: 'PROGRESS'; op: 'bind' | 'link' | 'unused' | 'unused-delete'; done: number; total: number } // UX6: 진행률. 'bind' = 찾기(APPLY), 'link' = 연결(APPLY_SELECTED, 300곳씩), 'unused' · 'unused-delete' = 안 쓰는 변수 읽기 · 다시 확인(페이지 단위, total 0 = 불러오는 중)
  | { type: 'UNUSED_VARS'; reqId: number; items: { id: string; kind: 'none' | 'chain' }[]; pages: number; layers: number; cancelled?: true }
  | { type: 'VARIABLES_DELETED'; reqId: number; deleted: number; skipped: number; failed: number; cancelled?: true }
  | { type: 'RENAME_RESULT'; changes: RenameChange[]; nodes: RenameNode[]; applied: boolean; reqId?: number } // nodes: 선택형 트리(#13)용 전체 서브트리
  | { type: 'SEMANTICS_RESULT'; created: number; updated: number; aliased: number; missing: string[]; skippedManual?: number } // skippedManual: 직접 만든 변수라 건너뛴 역할 수(§4.9)
  // labeled/fallback은 「왼쪽 글자로 이름 채우기」를 눌렀을 때만 온다 — 맨 스캔은 전부 크기 순이라
  // `왼쪽 글자 0`을 적어 봐야 실패처럼 읽힐 뿐이다. undefined면 상태줄에서 그 조각을 생략한다.
  // existing: 로컬 텍스트 스타일 전부 — 이름 겹침 잠금(IA v4 §4.3) · 예약 이름(docs/text-style-krds.md §3.4 — 기본 램프 rampToSpecs).
  // decimalRows: 앵커 없는 소수 크기 군집 — 만들지 않는 흐린 줄(§2.11 11번 · ia-v4 §4.3 "소수 크기 줄").
  | { type: 'TEXT_STYLE_CANDIDATES'; styles: TextStyleSpec[]; decimalRows?: StyleCluster[]; warnings: string[]; labeled?: number; fallback?: number; reqId?: number; existing?: ExistingStyleSig[] }
  // applied · applySkipped · applyReasons: applyTo가 있을 때만(붙인 글자 수 · 못 붙인 글자 수 · 사유별, IA v4 §4.3 "타이포 등록").
  | { type: 'TEXT_STYLES_RESULT'; created: number; updated: number; bound: number; missing: string[]; notes: string[]; reqId?: number; applied?: number; applySkipped?: number; applyReasons?: Record<TextStyleApplySkipReason, number>; mainsApplied?: string[] } // Phase C (notes=경고 아닌 알림)
  | { type: 'TEXT_STYLES_PREVIEW'; reqId: number; rows: { styleId: string; name: string; nodeIds: string[]; mainIds?: (string | null)[] }[]; skipReasons: Record<TextStyleSkipReason, number> }
  | { type: 'COLLECTIONS'; collections: CollectionInfo[] }
  // #11: 단계 전제 — Global 변수 존재(시맨틱 매핑 가능). 연결할 변수가 있는가는 로컬 변수 수(tierVars + otherVars)로 본다(ia-v4 §2.9 S2-P9).
  | {
      type: 'PREREQ_STATE';
      hasGlobal: boolean;
      /** 계층(Global·Semantic·Component) 안의 변수 수 · 그중 색 — '이미 변수 N개' 안내용. */
      tierVars?: number;
      tierColorVars?: number;
      /** 계층으로 인식되지 않은 컬렉션의 변수 수 — 있으면 '계층 지정' 안내. */
      otherVars?: number;
      /** Dark 값이 없는 색 수(플러그인 Global 모드가 하나면 0 — ia-v3 13.7). 없으면 0. */
      darkUnfilled?: number;
      /** 옛 구조(플러그인 Semantic에 Dark 모드) — 다크 화면 띠. 없으면 거짓. */
      darkOld?: boolean;
      /** 옛 구조인데 플러그인 Semantic 모드가 셋 이상(옮기기 거절 — 띠 dark.needMigrateManual). 없으면 거짓. */
      darkOldManual?: boolean;
    }
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
      /** 마지막 작업 관련 메시지(검증 실패·오프라인 안내 등) — 이미 t()로 만든 화면 문구. */
      note?: string;
      /** note의 색: ok(적용·제거) / warn(오프라인·검증 실패). 문구를 보고 정하지 않는다. */
      noteKind?: 'ok' | 'warn';
      /** 원문 사유(서버 error · 기술 사유) — #licenseStatus의 title(툴팁). 없으면 title을 비운다. */
      noteTip?: string;
    }
  | { type: 'PREMIUM_REQUIRED'; feature: Feature } // 사유 문구는 보내지 않는다 — UI가 status.paid를 띄운다(PR 4)
  | { type: 'REQUEST_VERIFY'; key: string; instanceId?: string } // M2.2: code → UI에 (재)검증 요청(WebCrypto는 UI에서). instanceId: 같은 기기로 validate
  | { type: 'REQUEST_DEACTIVATE'; key: string; instanceId: string } // 해제 시 code → UI: 이 기기의 LS 활성화 슬롯 반납(best-effort)
  | { type: 'EXPORT_RESULT'; format: ExportFormat; content: string; clashes: string[]; globalDupes: string[]; globalDupesFrom?: string } // 토큰 코드 내보내기 결과 · clashes = Global과 같은 이름의 거울 아닌 Semantic · globalDupes = 같은 이름 Global끼리(앞의 것만 냄) · globalDupesFrom = 남은 쪽 컬렉션 이름이 하나일 때(ia-v3 §4.4)
  | { type: 'SETTINGS'; base: number; maxDepth: number; grid: number } // #19: 보관된 설정(없으면 기본값). grid=만들기가 값을 맞추는 간격
  | { type: 'VARIABLES'; vars: VarInfo[] } // 3계층 변수 목록(다크 카드의 컬렉션·모드 선택지)
  // modeCreated: Dark 모드를 이번에 만들었는가(안내 문구가 달라진다). error: 채우기 전 단계 실패.
  | {
      type: 'DARK_MODE_RESULT';
      /** 채운 색 n · 그대로 둔 색 k(이번에 옮긴 칸 제외) · 채우는 칸 대상 수(0이면 "채울 색 없음"). */
      filled: number;
      kept: number;
      targets: number;
      modeCreated?: boolean;
      /** 옛 구조를 옮겼으면 늘 싣는다. */
      migrated?: { moved: number; split: number; failed: number; splitNames: string[]; failedNames: string[]; removedDark: number };
      /** 옛 구조인데 확인 전 — 아무것도 바꾸지 않았다(UI가 확인 팝업). */
      needMigrate?: { removeDark: number; mode: string };
      error?: string;
    }
  | { type: 'DELETED_UNBOUND'; reqId: number; unbound: number; failed: number; failReasons: Record<string, number> }
  | { type: 'ERROR'; message: string; op?: string; reqId?: number; code?: 'name' | 'paid' | 'deleted' }; // op: 실패한 UiToCode 종류(상태 라우팅용), code: 새 변수 · 복제의 이름 거절 · 유료(무료의 플러그인 Semantic 컬렉션 — §4.9 F2) · 지워짐 // op: 실패한 UiToCode 종류(상태 라우팅용)

/** code → UI 안전 전송. */
export function post(msg: CodeToUi): void {
  figma.ui.postMessage(msg);
}
