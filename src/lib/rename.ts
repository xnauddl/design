/* ============================================================
   rename.ts — 레이어를 "역할(role)"에 맞게 정돈 (naming.ts 규칙 사용)
   원칙: 역할이 이름을 정한다. 토큰은 신호로만 쓰고 경로를 복사하지 않는다.
   - 정규화: 뚜렷한 역할(card/list/field/button/header… 등)은 역할 기반 이름으로 교체 — **기본명 · 플러그인이 붙인 이름만**
     (S-2b — ia-v4 §4.4 "S-2b 이름 보존": 사람이 지은 이름은 그대로 두고 역할 · 지킨 이름 표시만 기록, 자식에게는 판정 이름을 맥락으로).
     역할 없는 순수 레이아웃(container/wrapper/stack-x/stack-y 폴백)은 이름으로 쓰지 않고(이름 그대로 · 역할만 기록) 맥락만 자식에게 통과.
     선택 루트(depth 0) 컨테이너는 보존(자식 맥락 앵커) — 단 카드/리스트/필드/버튼처럼 확실한 시멘틱이면 루트도 교체(루트 이름이 사람 이름이면 역할만 기록).
     보존한 루트 이름의 낱말(역할이 아닌 것 — 'website' · 'copy')은 맥락 계산에는 그대로 쓰되, 보이는 이름에서는
     뗀다(`dsl-header` → `header`). 떼기 전 이름은 `dsNameKey`로 남겨 등록 묶기가 지금과 같게 한다(ia-v4 §4.4).
   - 역할 판정:
     · 전역 고우선: 오버레이/모달 → progress 안 indicator → field 안 input → 버튼/칩 → nav →
       status/thumbnail → 토큰 말단.
     · FRAME/GROUP/SECTION: progress → card/article → figure → field → list → list/nav-item →
       영역(landmark) → section → container/wrapper.
     · 그 외 타입/기하: VECTOR=icon, 얇은 막대=divider, 이미지 타원=avatar, 채움=background 등.
     · HTML 랜드마크: 첫→header·마지막→footer·3분할 가운데→main·그 외 페이지 중간→section,
       가로 좁은 컬럼→aside, 가로 링크행→nav, 이미지+캡션→figure, 피드 안 카드형 항목→article
     · 버튼/칩: 오토레이아웃 + 라운드 + 채움/외곽선 + 직속 텍스트 → button(작고 알약형이면 chip)
     · 시맨틱 컨테이너: 라벨+입력 → field, 반복 아이템 → list, 표면+라운드/그림자 → card,
       알약형 트랙+채움 바 → progress(그 안의 바 → indicator)
     · 맥락이 가르는 역할: field 안 입력상자 → input, card/item 안 작은 이미지 → thumbnail,
       아바타 곁 작은 원 → status, 부모를 덮는 반투명 면 → overlay(그 위 패널 → modal)
     · HTML 랜드마크와 컴포넌트/디자인 어휘(card/chip/avatar…)를 함께 사용. 리스트 항목은 영역보다 우선.
   - 맥락: 바로 위 의미 있는 이름에서 깨끗한 1단계만(pickScope). 없으면 시맨틱 토큰 접두사에서.
     숫자·단위 조각 제거.
   - 이름 형식: {맥락}-{역할} 최대 2토막. 형제 충돌에 숫자 안 붙임(Figma 중복 허용).
   - 제외: Component/ComponentSet · Instance · 잠긴 레이어는 서브트리째 스킵, Text는 자기 이름만 보존.
   ============================================================ */
import { parseTokenName, layerNameFromRole, pickScope, kebab, isKnownRole, isScopeRole, isDefaultName, nameKeyFor, EMITTED_ROLES, ROLE_KEY, NAME_KEY, KEPT_KEY } from './naming';
import { isIconFrame, shortOneLine } from './componentLike';
import type { ParsedToken } from './naming';
import type { KeepReason, RenameChange, RenameNode } from '../shared/messages';
import { hasVisibleFill, hasImageFill, hasColorFill, hasVisibleStroke, VECTOR_TYPES } from './nodePaint'; // 스와치 판정의 색 채움 = 보이는 단색 · 그라데이션

/** 자식에게 내려보내는 위치 정보(영역 추론용). depth 0 = 선택 루트. */
interface Pos {
  index: number;
  total: number;
  parentLayout: 'vertical' | 'horizontal' | null;
  depth: number;
  /** 가로 부모에서 형제 최대폭 대비 비율(aside 판정용). 세로/없음이면 null. */
  widthFrac: number | null;
  /** 부모 높이 대비 비율 — 페이지의 절반을 넘는 블록은 header/footer가 아니라 본문(main)이다. */
  heightFrac: number | null;
  /** 부모 치수(풀블리드·면적비 판정용). 알 수 없으면 null. */
  parentDims: { w: number; h: number } | null;
  /** 랜드마크 슬롯 번호 — 보이는 컨테이너 형제만 센 순번(대상 아니면 -1). */
  regionIndex: number;
  /** 랜드마크 슬롯 총수. */
  regionTotal: number;
  /** 자신이 확정된 배경막인지. */
  isOverlay: boolean;
  /** 앞선 형제 중 확정된 배경막이 있는지(그 위에 얹힌 패널 → modal). */
  afterOverlay: boolean;
  /** 형제 중 아바타(이미지 원)가 있는지(작은 점 → status). */
  hasAvatarSibling: boolean;
  /**
   * 맥락을 정한 조상으로부터의 거리 — 그 조상의 직계 자식 = 0, passthrough 한 단계마다 +1.
   * 이름(node.parent.name)이 아니라 ctx 체인으로 센다: 미리보기에선 부모 이름이 아직 안 바뀐다.
   */
  ctxDepth: number;
  /** 실제 부모 노드(형제 배열의 주인) — logo · actions 화면 위치용(ia-v4 §4.4 A4). 선택 목록이면 null. */
  parentNode: SceneNode | null;
  /** 형제 배열(자신 포함). */
  siblings: readonly SceneNode[];
  /** 루트에서 온 접두사(B.22) — 아이콘 프레임의 "전에 붙인 이름" 판정용(A1 ⓑ). */
  rootPrefix: string | null;
}

interface Opts {
  apply: boolean;
  maxDepth: number;
}

export interface RenameOutcome {
  changes: RenameChange[];
  /** 선택 서브트리 전체(미리보기 트리 #13용). 영향 노드는 `after` 보유. */
  nodes: RenameNode[];
  applied: boolean;
}

/** 순회 중 수집물(변경분 + 트리 노드). */
interface Collect {
  changes: RenameChange[];
  nodes: RenameNode[];
}

export async function renameSelection(
  selection: readonly SceneNode[],
  opts: Opts,
): Promise<RenameOutcome> {
  const col: Collect = { changes: [], nodes: [] };
  const safeOpts: Opts = { ...opts, maxDepth: normalizeMaxDepth(opts.maxDepth) };
  await recurse(selection, null, safeOpts, col, 0, null, null, null, null, 0, null, null);
  return { changes: col.changes, nodes: col.nodes, applied: opts.apply };
}

function normalizeMaxDepth(v: number): number {
  return Number.isFinite(v) ? Math.max(1, Math.round(v)) : 8;
}

async function recurse(
  nodes: readonly SceneNode[],
  ancestorName: string | null,
  opts: Opts,
  col: Collect,
  depth: number,
  parentLayout: Pos['parentLayout'],
  parentId: string | null,
  parentRole: string | null,
  parentDims: { w: number; h: number } | null,
  ctxDepth: number,
  rootPrefix: string | null,
  parentNode: SceneNode | null,
): Promise<void> {
  const total = nodes.length;
  // 랜드마크 슬롯 — 실제로 리네임 대상이 되는 "보이는 컨테이너"만 센다.
  // 숨김 레이어·TEXT·인스턴스가 자리를 차지하면 header/footer가 엉뚱한 노드로 밀린다.
  const slotOf = new Map<number, number>();
  let slots = 0;
  for (let i = 0; i < total; i++) if (isLandmarkCandidate(nodes[i])) slotOf.set(i, slots++);
  // 형제 신호: 배경막 위치(그 뒤 = modal 후보) · 아바타 존재(작은 점 = status 후보).
  const overlayAt = findOverlayIndex(nodes, parentDims);
  const hasAvatarSibling = nodes.some((n) => n.type === 'ELLIPSE' && hasImageFill(n));
  for (let i = 0; i < total; i++) {
    const node = nodes[i];
    const before = node.name; // apply 시 node.name이 바뀌므로 먼저 캡처
    // 좁은 컬럼(aside) 비율은 형제 최대폭이 아니라 부모 폭 대비로 잰다.
    const d = dims(node);
    const widthFrac = d != null && parentDims && parentDims.w > 0 ? d.w / parentDims.w : null;
    const heightFrac = d != null && parentDims && parentDims.h > 0 ? d.h / parentDims.h : null;
    const pos: Pos = {
      index: i, total, parentLayout, depth, widthFrac, heightFrac, parentDims,
      regionIndex: slotOf.get(i) ?? -1,
      regionTotal: slots,
      isOverlay: i === overlayAt,
      afterOverlay: overlayAt >= 0 && i > overlayAt,
      hasAvatarSibling,
      ctxDepth,
      parentNode,
      siblings: nodes,
      rootPrefix,
    };
    const decided = await decide(node, ancestorName, pos, opts, parentRole);
    let contextForChildren: string | null = before;
    let ctxDepthForChildren = 0;
    let after: string | undefined;
    let nameKey: string | undefined;
    // 보존한 선택 루트의 접두사(ia-v4 §4.4) — 루트 이름의 pickScope가 역할 낱말이 아닐 때만. 자식에게 내려보낸다.
    let prefixForChildren = rootPrefix;
    if (depth === 0) {
      const sc = decided.keep === 'root' ? pickScope(before) : null;
      prefixForChildren = sc && !isScopeRole(sc) ? sc : null;
    }

    if (!decided.skip && decided.name) {
      // 보이는 이름 = 판정 이름에서 루트 접두사를 뗀 것. 판정 이름은 그대로 맥락으로 쓴다(역할 · 토큰 맥락이 지금과 같게).
      // 아이콘 모양 이름을 그대로 두는 경우(A1)는 접두사를 떼지 않는다.
      const visible = decided.keepName ? decided.name : stripRootPrefix(decided.name, rootPrefix, decided.role);
      if (visible !== decided.name) nameKey = decided.name;
      // 이름 힌트로 이름을 둔 노드는 저장된 키가 지금 이름과 이어질 때만 남긴다(ia-v4 §4.4 "이름 힌트" — A1과 다름).
      if (decided.keepKey) nameKey = nameKeyFor(before, readPluginKey(node, NAME_KEY));
      // 숫자 접미사 없음 — 형제가 같은 이름이어도 그대로(Figma는 중복 이름 허용).
      if (visible !== before) {
        after = visible;
        col.changes.push({ id: node.id, before, after, ...(nameKey ? { nameKey } : {}) });
        if (opts.apply) node.name = after;
      }
      // 판정한 역할을 노드에 남긴다 — 다음 이름 정리와 텍스트 스타일 label 판정이 읽어 이름 파싱 추측을 없앤다.
      // 이름이 안 바뀐 재실행에서도 기록해 예전 리네임 결과에 값을 채운다(멱등).
      if (opts.apply && decided.role) writeRole(node, decided.role);
      if (opts.apply) writeNameKey(node, nameKey ?? null);
      // 지킨 이름 표시(S-2b SC-D51) — 사람 이름을 지킨 노드는 지금 이름, 아니면 지운다(다음 실행에서 ⓐ로 바뀌지 않게).
      if (opts.apply) writeKept(node, decided.kept ? before : null);
      // 맥락: 일반 레이아웃(passthrough)은 받은 맥락을 그대로 통과, 그 외엔 내 새 이름.
      // 이름 힌트로 이름을 둔 노드는 이름이 아니라 기록한 역할 낱말을 넘긴다(디자이너 낱말을 자손이 베끼지 않게).
      contextForChildren = decided.ctxName ?? (decided.passthrough ? ancestorName : decided.name);
      if (decided.passthrough) ctxDepthForChildren = ctxDepth + 1;
    }

    // 영향 여부와 무관하게 트리에 담는다(전체 서브트리 + 영향 노드 강조).
    col.nodes.push({ id: node.id, name: before, type: node.type, depth, parentId, after, keep: decided.keep, role: decided.role, ...(nameKey ? { nameKey } : {}), ...(decided.kept ? { kept: true } : {}) });

    // 제외 대상은 서브트리째 건너뛴다 — decide()가 노드 자신만 스킵하면 내부는 그대로 리네임돼
    // 메인 컴포넌트 내부 이름(→ 모든 인스턴스에 전파)과 잠금 레이어까지 덮어쓰게 된다.
    // 아이콘 프레임은 안을 정리하지 않는다(인스턴스 안처럼 — ia-v4 §4.4 A1, 깊이 · 판정 역할과 무관).
    if ('children' in node && !isSkippedSubtree(node) && !isIconFrameNode(node)) {
      // 자식 역할은 부모에게 "실제로 부여된" 역할에서만 파생한다(구조 재판정 금지) —
      // 그래야 nav처럼 list를 앞지르는 역할이 붙었을 때 자식이 엉뚱하게 item이 되지 않는다.
      const childDims = decided.passthrough ? parentDims : dims(node);
      await recurse(node.children, contextForChildren, opts, col, depth + 1, layoutOf(node), node.id, decided.role ?? null, childDims, ctxDepthForChildren, prefixForChildren, node);
    }
  }
}

/** decide() 결과. keepKey = 저장된 dsNameKey를 맞으면 남김(이름 힌트), ctxName = 자식에게 넘길 맥락(이름 대신). */
interface Decided {
  skip: boolean;
  name?: string;
  passthrough?: boolean;
  role?: string;
  keep?: KeepReason;
  keepName?: boolean;
  keepKey?: boolean;
  ctxName?: string;
  /** 사람이 지은 이름이라 지킨 노드(S-2b) — `RenameNode.kept` · 적용 때 `dsKept`. */
  kept?: boolean;
}

async function decide(
  node: SceneNode,
  ancestorName: string | null,
  pos: Pos,
  opts: Opts,
  parentRole: string | null,
): Promise<Decided> {
  // 제외 규칙(이름 유지). 일부 노드는 recurse()에서 서브트리째 중단한다.
  // keep은 미리보기에서 "왜 안 바뀌는지"를 보여 주려고 싣는다 — 조용히 빠지면 버그로 읽힌다.
  if (node.type === 'COMPONENT' || node.type === 'COMPONENT_SET') return { skip: true, keep: 'component' };
  if (node.type === 'TEXT') return { skip: true, keep: 'text' };
  if (node.type === 'INSTANCE') return { skip: true, keep: 'instance' };
  if (node.locked) return { skip: true, keep: 'locked' };

  // #7b-1: 선택 루트(depth 0) 컨테이너는 보존 — 자식의 맥락 앵커로만 쓴다.
  // 단, 구조로 "확실한" 시멘틱(card/list/field/button/chip)이면 루트라도 역할명으로 교체.
  if (pos.depth === 0 && isContainerType(node)) {
    const hc = highConfidenceRole(node);
    if (!hc) return { skip: true, keep: 'root' };
    let hcScope = ancestorName ? pickScope(ancestorName) : null;
    if (hcScope === hc) hcScope = null;
    const hcName = layerNameFromRole(hcScope, hc, { maxDepth: opts.maxDepth });
    // S-2b R2B-P3 — 루트 이름이 사람 이름이면 이름은 그대로, 고신뢰 역할만 기록하고 자식에게는 바꿨을 때와 같은 맥락을 넘긴다.
    if ((await nameKindOf(node, pos.rootPrefix)) === 'human') return { skip: false, role: hc, name: node.name, keepName: true, ctxName: hcName, kept: true };
    return { skip: false, role: hc, name: hcName };
  }

  // 전체 정규화: 현재 이름과 무관하게 역할 기반 이름으로 교체(사람이 지은 이름도 덮어씀).
  // 구조적 제외(위)와 선택 루트 보존(#7b-1)만 예외 — 그 외엔 모두 역할명으로.
  const token = await primaryToken(node);
  // 맥락: 바로 위 의미 있는 이름에서 깨끗한 1단계 → 없으면 토큰 경로 접두사에서.
  // 역할 판정보다 먼저 구한다 — field→input, card→thumbnail처럼 맥락이 역할을 가르는 경우가 있다.
  const ctxScope = (ancestorName ? pickScope(ancestorName) : null) ?? (token?.context ? pickScope(token.context) : null);
  const role = resolveRole(node, token, pos, parentRole, ctxScope);
  // 이름 힌트(ia-v4 §4.4 · B.28) — 머리 낱말이 역할 낱말이고 구조 판정이 약하거나 같으면 이름 그대로, 역할만 기록.
  // FRAME · GROUP · SECTION만(아이콘 프레임은 A1 규칙 그대로). 자식에게는 부모 역할 = 힌트 역할 · 맥락 = 역할 낱말.
  if (isContainerType(node) && !isIconFrameNode(node)) {
    const h = hintRole(node, pos.rootPrefix);
    if (h && (role === h || HINT_WEAK_ROLES.has(role))) {
      return { skip: false, role: h, name: node.name, keepName: true, keepKey: true, ctxName: h };
    }
  }
  // 역할 없는 순수 레이아웃(container/wrapper 폴백)은 맥락 없는 plain 역할명으로 정리하되,
  // 상속 맥락은 자식에게 그대로 통과(passthrough)시켜 의미있는 후손이 카드 맥락을 받게.
  // S-2b R2B-P2 — 구조 폴백 넷은 이름으로 쓰지 않는다: 이름 그대로 · 역할만 기록(사람 이름이면 지킨 이름 표시도).
  if (PASSTHROUGH_ROLES.has(role)) return { skip: false, role, name: node.name, keepName: true, passthrough: true, ...((await nameKindOf(node, pos.rootPrefix)) === 'human' ? { kept: true } : {}) };
  // 아이콘 프레임은 모양 이름 그대로 — 뜻 없는 이름일 때만 맥락 + icon(ia-v4 §4.4 A1).
  if (role === 'icon' && isIconFrameNode(node) && !isMeaninglessIconName(node, pos.rootPrefix)) {
    return { skip: false, role, name: node.name, keepName: true };
  }
  const scope = ctxScope === role ? null : ctxScope; // 맥락==역할이면 중복 제거(button-button 방지)
  const name = layerNameFromRole(scope, role, { maxDepth: opts.maxDepth });
  // S-2b R2B-P2 · R2B-P4 — 사람이 지은 이름은 그대로 두고 역할만 기록. 자식에게는 바꿨다면 지었을 이름(판정 이름)을 넘겨
  // 자식 이름이 S-2b 전과 같다. 세분화 1차 역할은 지금처럼 맥락 통과(recurse는 ctxName을 passthrough보다 먼저 본다).
  if ((await nameKindOf(node, pos.rootPrefix)) === 'human') {
    return { skip: false, role, name: node.name, keepName: true, kept: true, ...(REFINED_PASSTHROUGH.has(role) ? { passthrough: true } : { ctxName: name }) };
  }
  // 세분화 1차 역할은 이름만 맥락 + 역할, 자식에게는 받은 맥락을 통과(B1–B3).
  if (REFINED_PASSTHROUGH.has(role)) return { skip: false, role, name, passthrough: true };
  return { skip: false, role, name };
}

/**
 * 판정한 역할을 노드 pluginData에 기록한다. 실패해도 리네임은 계속 — 이름이 본체고
 * 기록은 등록 단계의 보조 신호다. (테스트 목처럼 API가 없는 노드도 안전하게 통과)
 */
export function writeRole(node: SceneNode, role: string): boolean {
  const fn = (node as { setPluginData?: (key: string, value: string) => void }).setPluginData;
  if (typeof fn !== 'function') return false;
  try {
    // 이미 같은 값이면 쓰지 않는다. RENAME_APPLY는 이름이 그대로인 노드에도 역할을 남기므로
    // (멱등), 한 번 정리한 3천 레이어 서브트리를 다시 적용하면 3천 번을 도로 쓰게 된다.
    // 읽기는 싸고 쓰기는 문서를 더럽히니 — 실제로 바뀔 때만 쓴다.
    const read = (node as { getPluginData?: (key: string) => string }).getPluginData;
    if (typeof read === 'function' && read.call(node, ROLE_KEY) === role) return false;
    fn.call(node, ROLE_KEY, role);
    return true;
  } catch {
    return false; /* 기록 실패 무시 */
  }
}

/** 판정 이름에서 앞의 `{루트 접두사}-`를 뗀다(정확히 접두사뿐이면 그대로 — ia-v4 §4.4). */
export function stripRootPrefix(name: string, prefix: string | null, role?: string): string {
  if (role && name === role) return name; // 판정 이름이 역할 그 자체면 떼지 않는다(text-group → group 방지)
  return prefix && name.startsWith(prefix + '-') && name.length > prefix.length + 1 ? name.slice(prefix.length + 1) : name;
}

/**
 * 떼기 전 이름(`dsNameKey`)을 기록하거나(key) 지운다(null). 실제로 바뀐 경우만 쓰고 true —
 * `RENAME_APPLY`가 undo 묶음 판단(roleWrites)에 센다. API가 없거나 실패하면 false.
 */
export function writeNameKey(node: SceneNode, key: string | null): boolean {
  const n = node as { setPluginData?: (k: string, v: string) => void; getPluginData?: (k: string) => string };
  if (typeof n.setPluginData !== 'function') return false;
  try {
    const cur = typeof n.getPluginData === 'function' ? n.getPluginData.call(node, NAME_KEY) : '';
    const next = key ?? '';
    if (cur === next) return false;
    n.setPluginData.call(node, NAME_KEY, next);
    return true;
  } catch {
    return false;
  }
}

/**
 * 지킨 이름 표시(`dsKept` — S-2b SC-D51)를 기록하거나(name) 지운다(null). 실제로 바뀐 경우만 쓰고 true —
 * `RENAME_APPLY`가 undo 묶음 판단(roleWrites)에 센다. API가 없거나 실패하면 false.
 */
export function writeKept(node: SceneNode, name: string | null): boolean {
  const n = node as { setPluginData?: (k: string, v: string) => void; getPluginData?: (k: string) => string };
  if (typeof n.setPluginData !== 'function') return false;
  try {
    const cur = typeof n.getPluginData === 'function' ? n.getPluginData.call(node, KEPT_KEY) : '';
    const next = name ?? '';
    if (cur === next) return false;
    n.setPluginData.call(node, KEPT_KEY, next);
    return true;
  } catch {
    return false;
  }
}

/* ---------- 이름의 갈래(ia-v4 §4.4 "S-2b 이름 보존" R2B-P1) ---------- */
/** 레이어에 붙은 변수 이름 — 노드 속성(`boundVariables`)과 칠 · 선의 색 변수(SC-D52 ⓒ). 못 읽으면 빼고 넘어간다. */
async function boundVariableNames(node: SceneNode): Promise<string[]> {
  const ids = new Set<string>();
  const add = (e: unknown): void => {
    if (!e) return;
    if (Array.isArray(e)) for (const a of e) add(a);
    else if (typeof (e as VariableAlias).id === 'string') ids.add((e as VariableAlias).id);
  };
  const bv = (node as { boundVariables?: Record<string, unknown> }).boundVariables;
  if (bv && typeof bv === 'object') for (const v of Object.values(bv)) add(v);
  for (const f of ['fills', 'strokes'] as const) {
    const ps = (node as unknown as Record<string, unknown>)[f];
    if (Array.isArray(ps)) for (const p of ps) add((p as { boundVariables?: { color?: unknown } }).boundVariables?.color);
  }
  const out: string[] = [];
  for (const id of ids) {
    try {
      const v = await figma.variables.getVariableByIdAsync(id);
      if (v) out.push(v.name);
    } catch {
      /* 못 읽는 변수는 건너뛴다 */
    }
  }
  return out;
}
/** ASCII 밖 글자(한글 · 이모지 등) — 있으면 늘 사람 이름(`kebab`이 지워 빈 낱말이 되는 것을 막는다). */
const NON_ASCII = /[^\x00-\x7F]/;
/** 숫자 낱말(`2` · `1_5`). */
const NUM_WORD = /^[\d_]+$/;
/** 플러그인이 내는 역할 낱말 열(하이픈 역할은 낱말 여럿 — `text-group` · `stack-x`), 긴 것 먼저. */
const EMITTED_SEQS: readonly (readonly string[])[] = [...EMITTED_ROLES].map((r) => r.split('-')).sort((a, b) => b.length - a.length);
/** 낱말이 모두 역할 낱말 열로 나뉘는가(1개 이상). */
function allEmitted(toks: readonly string[]): boolean {
  if (!toks.length) return false;
  const ok = (i: number): boolean => i === toks.length || EMITTED_SEQS.some((seq) => seq.every((w, k) => toks[i + k] === w) && ok(i + seq.length));
  return ok(0);
}

/**
 * 레이어 지금 이름의 갈래 — 기본명 · 플러그인 이름 · 사람 이름(R2B-P1). 플러그인 이름 = ASCII 밖 글자가 없고
 * ⓐ 기록한 `dsRole`과 맞는 이름(`{역할}` · `{숫자 아닌 낱말 하나}-{역할}` · `namedByPlugin`, 지킨 이름 표시와 같으면 아님 — SC-D50 · SC-D51)
 * 또는 ⓑ 낱말이 모두 역할 낱말(맨 앞 한 낱말만 루트 접두사 · 숫자 낱말 없음 — SC-D47)
 * 또는 ⓒ 그 레이어에 붙은 변수 이름과 같은 이름(예전 토큰 경로 베낌 — SC-D52).
 */
async function nameKindOf(node: SceneNode, rootPrefix: string | null): Promise<'default' | 'plugin' | 'human'> {
  const name = node.name;
  if (isDefaultName(name)) return 'default';
  if (NON_ASCII.test(name)) return 'human';
  const toks = kebab(name).split('-').filter(Boolean);
  if (!toks.length) return 'human';
  // ⓒ 예전 버전이 붙은 변수 경로를 베낀 이름(`color/121210` → `color-121210`) — 그 레이어에 붙은 변수 이름과 같으면 플러그인 이름(SC-D52)
  if ((await boundVariableNames(node)).some((v) => kebab(v) === toks.join('-'))) return 'plugin';
  const role = readPluginKey(node, ROLE_KEY);
  const kept = readPluginKey(node, KEPT_KEY);
  if (role && !(kept && kebab(kept) === toks.join('-'))) {
    const rt = kebab(role).split('-').filter(Boolean);
    if (rt.length && toks.length >= rt.length && toks.slice(toks.length - rt.length).join('-') === rt.join('-')) {
      const head = toks.slice(0, toks.length - rt.length);
      if (!head.length || (head.length === 1 && !NUM_WORD.test(head[0])) || namedByPlugin(name, role, rootPrefix)) return 'plugin';
    }
  }
  if (toks.some((t) => NUM_WORD.test(t))) return 'human';
  if (allEmitted(toks)) return 'plugin';
  if (rootPrefix && toks.length > 1 && toks[0] === rootPrefix && allEmitted(toks.slice(1))) return 'plugin';
  return 'human';
}

/**
 * 리네임 결과 이름에서 역할 토큰을 뽑아 기록한다 — `RENAME_APPLY`(미리보기 체크 적용)용.
 * 전체 적용 경로(`renameSelection` apply:true)는 `decide().role`을 직접 쓰지만,
 * WYSIWYG 적용은 id→after만 받으므로 이름 말단(역할)을 복원한다.
 * `layerNameFromRole`이 역할을 항상 마지막 토큰에 두므로 말단만 보면 된다.
 */
export function writeRoleFromName(node: SceneNode, name: string): boolean {
  const toks = kebab(name).split('-').filter(Boolean);
  const two = toks.length >= 2 ? toks.slice(-2).join('-') : '';
  if (two && isKnownRole(two)) return writeRole(node, two); // 두 낱말 역할(text-group) 먼저
  const role = toks[toks.length - 1];
  return role && isKnownRole(role) ? writeRole(node, role) : false;
}

/** 역할 없는 순수 레이아웃 폴백 — 맥락 없는 plain 역할명으로 정리하고 맥락만 자식에게 통과. */
const PASSTHROUGH_ROLES = new Set(['container', 'wrapper', 'stack-x', 'stack-y']); // 오토레이아웃 묶음(ia-v3 §2.12 12.12 N-D6)도 container처럼
/** 세분화 1차 역할(ia-v4 §4.4 B1–B3) — 이름은 맥락 + 역할, 자식에게는 받은 맥락 통과. */
const REFINED_PASSTHROUGH = new Set(['row', 'text-group', 'media']);
/** 페인트(채움·선)에서 온 색 역할 — 자식 있는 컨테이너의 구조 역할을 덮지 못한다. */
const PAINT_ROLES = new Set(['background', 'border', 'surface']);
const hasChildren = (node: SceneNode): boolean => 'children' in node && node.children.length > 0;

/* ---------- 역할 판정: 전역 고우선 → 토큰 신호 → 컨테이너 시맨틱/랜드마크 → 타입/기하 ---------- */
function resolveRole(
  node: SceneNode,
  token: ParsedToken | null,
  pos: Pos,
  parentRole: string | null,
  ctxScope: string | null,
): string {
  // 확정된 모달 레이어는 최우선 — 배경막과 그 위 패널은 다른 무엇으로도 읽히면 안 된다.
  if (pos.isOverlay) return 'overlay';
  if (isModalLike(node, pos, ctxScope)) return 'modal';
  // 프로그레스 트랙 안의 채움 바 → indicator(얇은 막대 → divider 오검출 방지).
  if (ctxScope === 'progress' && isBarFill(node)) return 'indicator';
  // 탭 안의 얇은 색 띠 → indicator(ia-v4 §4.4 "이름 힌트" — 보강 divider보다 먼저).
  if (ctxScope === 'tab' && (node.type === 'FRAME' || node.type === 'RECTANGLE') && isThinColorStrip(node)) return 'indicator';
  // 입력은 field 맥락에서만 인정 — 맥락 없이는 아웃라인 버튼과 구분되지 않는다.
  if (ctxScope === 'field' && isInputBox(node)) return 'input';
  if (isButtonLike(node)) return isChipLike(node) ? 'chip' : 'button'; // 버튼은 토큰 채움색보다 우선
  if (isNavLike(node, pos.depth, ctxScope)) return 'nav'; // HTML 랜드마크: 페이지 수준·헤더 안 가로 링크행
  if (isLogoLike(node, pos, ctxScope)) return 'logo'; // 헤더 첫 자리의 작은 묶음
  if (isActionsLike(node, pos, ctxScope)) return 'actions'; // 헤더 끝의 링크·버튼 2~3개
  if (isStatusDot(node, pos)) return 'status'; // 아바타 곁의 작은 점(온라인 표시 등)
  if (isThumbnail(node, pos, ctxScope)) return 'thumbnail'; // 카드/항목 맥락의 작은 미리보기
  // 글자 버튼(A2) — list · nav 직속과 영역 자리는 빼고(지금 판정 그대로).
  if (parentRole !== 'list' && parentRole !== 'nav' && !atRegionSlot(node, pos, ctxScope, parentRole) && isTextButtonLike(node)) return 'button';
  if (isIconFrameNode(node)) return 'icon'; // 아이콘 프레임(A1)
  // 토큰 말단이 역할이면 신호로 사용 — 단, 자식이 있는 컨테이너에는 **색 역할**(background/border)을
  // 그대로 쓰지 않는다. 역할 별칭이 바인딩에서 거울을 이기게 되면서 페이지 본문 프레임의 채움이
  // `surface`(→background)에 붙고, 그 한 줄이 랜드마크 판정(main/section)을 덮어 본문이
  // `website-background`가 됐다. 컨테이너의 채움색은 그 안의 구조를 말해 주지 않는다.
  if (token?.roleLeaf && !(hasChildren(node) && PAINT_ROLES.has(token.roleLeaf))) return token.roleLeaf;

  switch (node.type) {
    case 'VECTOR':
    case 'BOOLEAN_OPERATION':
    case 'STAR':
    case 'POLYGON':
      return 'icon';
    case 'LINE':
      return 'divider';
    case 'RECTANGLE':
    case 'ELLIPSE': {
      if (isThin(node)) return 'divider';
      if (hasImageFill(node)) return node.type === 'ELLIPSE' ? 'avatar' : 'image';
      if (hasVisibleFill(node)) return 'background';
      if (hasVisibleStroke(node)) return 'border';
      return 'shape';
    }
    case 'FRAME':
    case 'GROUP':
    case 'SECTION': {
      const kids = 'children' in node ? node.children : [];
      if (kids.length === 0) {
        // 자식 없는 프레임: 색만 채웠으면 스와치(얇은 띠면 divider — ia-v4 §4.4 보강), 이미지면 image.
        if (hasImageFill(node)) return 'image';
        if (hasColorFill(node)) return node.type === 'FRAME' && isThinStrip(node) ? 'divider' : 'swatch';
        // 빈 컨테이너도 페이지 랜드마크 자리는 차지한다(자리표시 섹션).
        const emptyRegion = regionRole(node, pos, ctxScope, parentRole);
        if (emptyRegion) return emptyRegion;
        return 'container';
      }
      // 시맨틱 컨테이너(보수적): 명확한 패턴만 인정, 아니면 일반 container/wrapper.
      // 이 판정들은 랜드마크(header/footer/aside)보다 먼저다 — 그렇지 않으면 페이지 아래
      // 첫/마지막에 놓인 카드·필드가 전부 header/footer로 덮인다.
      // progress는 card보다 먼저 — 알약형 트랙은 라운드+채움이라 card 조건도 만족한다.
      if (isProgressLike(node, kids)) return 'progress';
      if (isCardLike(node, kids)) return parentRole === 'list' ? 'article' : 'card'; // 피드 안 카드형 → article
      if (isFigureLike(node, kids)) return 'figure'; // HTML 랜드마크: 이미지+캡션
      if (isFieldLike(node, kids)) return 'field';
      if (isListLike(node, kids)) return 'list';
      // 리스트·네비의 직속 컨테이너 자식 → item(= list-item / nav-item)
      if (parentRole === 'list' || parentRole === 'nav') return 'item';
      // 본문(main)의 첫 블록은 히어로 — section보다 구체적이고, header로 오인하지 않는다.
      if (parentRole === 'main' && pos.regionIndex === 0 && pos.parentLayout === 'vertical') return 'hero';
      const region = regionRole(node, pos, ctxScope, parentRole); // HTML 랜드마크: header/footer/main/aside
      if (region) return region;
      if (isPageSection(pos, ctxScope)) return 'section'; // 역할 없는 페이지 중간 블록
      // 세분화 1차(B1–B3) — 폴백 자리에서만, FRAME · GROUP만.
      if (node.type !== 'SECTION') {
        if (isRowLike(node, kids)) return 'row';
        if (isTextGroupLike(node, kids)) return 'text-group';
        if (isMediaLike(kids)) return 'media';
      }
      if (kids.length === 1) return 'wrapper';
      // 오토레이아웃 묶음은 방향으로 나눈다(ia-v3 §2.12 12.12 N-D6) — 격자 · 오토레이아웃 아님 · GROUP은 container 그대로.
      const lm = (node as { layoutMode?: string }).layoutMode;
      return lm === 'HORIZONTAL' ? 'stack-x' : lm === 'VERTICAL' ? 'stack-y' : 'container';
    }
    default:
      return kebab(node.type);
  }
}

/**
 * 선택 루트(보존 대상)라도 덮어쓸 만큼 "구조로 확실한" 시멘틱 역할만 반환(아니면 null → 보존).
 * 위치/토큰 같은 약한 신호나 일반 구조(container/wrapper)는 제외 —
 * 선택 루트를 바꾸려면 그 노드 자체가 명백히 그 시멘틱이어야 한다.
 */
function highConfidenceRole(node: SceneNode): string | null {
  if (isButtonLike(node)) return isChipLike(node) ? 'chip' : 'button';
  if (isNavLike(node, 0)) return 'nav';
  if ('children' in node && isContainerType(node)) {
    const kids = node.children;
    if (kids.length) {
      if (isProgressLike(node, kids)) return 'progress';
      if (isCardLike(node, kids)) return 'card';
      if (isFigureLike(node, kids)) return 'figure';
      if (isFieldLike(node, kids)) return 'field';
      if (isListLike(node, kids)) return 'list';
    }
  }
  return null;
}

/* ---------- 주(主) 바인딩 토큰 → 파싱된 신호 ---------- */
const FIELD_ORDER = [
  'fills',
  'strokes',
  'width',
  'height',
  'topLeftRadius',
  'itemSpacing',
  'paddingLeft',
  'paddingTop',
] as const;

async function primaryToken(node: SceneNode): Promise<ParsedToken | null> {
  const bv = (node as { boundVariables?: Record<string, unknown> }).boundVariables;
  if (!bv) return null;
  for (const field of FIELD_ORDER) {
    const id = firstAliasId(bv[field]);
    if (id) {
      const v = await figma.variables.getVariableByIdAsync(id);
      if (v) {
        const token = parseTokenName(v.name);
        if (!token.primitive) return token;
      }
    }
  }
  return null;
}

function firstAliasId(entry: unknown): string | undefined {
  if (!entry) return undefined;
  if (Array.isArray(entry)) return (entry[0] as VariableAlias | undefined)?.id;
  return (entry as VariableAlias).id;
}

/* ---------- 기하/페인트 신호(동기 · figma.mixed·미존재 안전) ---------- */
function dims(node: SceneNode): { w: number; h: number } | null {
  if (!('width' in node) || !('height' in node)) return null;
  const w = (node as LayoutMixin).width;
  const h = (node as LayoutMixin).height;
  if (typeof w !== 'number' || typeof h !== 'number') return null;
  return { w, h };
}

/** 얇은 막대(구분선) — 한 변이 ≤2px 또는 종횡비가 극단(≥25:1). */
function isThin(node: SceneNode): boolean {
  const d = dims(node);
  if (!d) return false;
  const min = Math.min(d.w, d.h);
  const max = Math.max(d.w, d.h);
  if (min <= 0) return false;
  return min <= 2 || max / min >= 25;
}

/** 얇은 띠 — `isThin`이면서 짧은 변 4 이하(1920×76 색 띠 · 자리표시 배너 제외 — ia-v4 §4.4 보강). */
function isThinStrip(node: SceneNode): boolean {
  const d = dims(node);
  return !!d && isThin(node) && Math.min(d.w, d.h) <= 4;
}

/** 자식 없는 색 채움(사진 아님) 얇은 띠 — 탭 밑줄(indicator) 판정용. */
function isThinColorStrip(node: SceneNode): boolean {
  if ('children' in node && node.children.length > 0) return false;
  if (hasImageFill(node) || !hasColorFill(node)) return false;
  return isThinStrip(node);
}

function paints(node: SceneNode, field: 'fills' | 'strokes'): Paint[] | null {
  if (!(field in node)) return null;
  const p = (node as unknown as Record<string, unknown>)[field];
  return Array.isArray(p) ? (p as Paint[]) : null; // figma.mixed → 배열 아님 → null
}

/* ---------- 시맨틱(영역/버튼) 추론 ---------- */
function layoutOf(node: SceneNode): Pos['parentLayout'] {
  if (!('layoutMode' in node)) return null;
  const m = (node as { layoutMode?: string }).layoutMode;
  return m === 'VERTICAL' ? 'vertical' : m === 'HORIZONTAL' ? 'horizontal' : null;
}

function isContainerType(node: SceneNode): boolean {
  return node.type === 'FRAME' || node.type === 'GROUP' || node.type === 'SECTION';
}

/**
 * 서브트리째 건너뛸 노드인지 — 내부를 소유하지 않거나 건드리면 안 되는 트리.
 * 인스턴스(메인 컴포넌트 소유) · 메인 컴포넌트 내부(모든 인스턴스에 전파) · 잠금 레이어.
 */
function isSkippedSubtree(node: SceneNode): boolean {
  return (
    node.type === 'INSTANCE' ||
    node.type === 'COMPONENT' ||
    node.type === 'COMPONENT_SET' ||
    node.locked
  );
}

/** 랜드마크 슬롯을 차지할 수 있는 형제인지 — 보이는, 리네임 대상 컨테이너만. */
function isLandmarkCandidate(node: SceneNode): boolean {
  if (!isContainerType(node)) return false;
  if (node.locked) return false;
  return (node as { visible?: boolean }).visible !== false;
}

/** 페이지 수준 가로 스플릿인지 — 툴바·카드 헤더 같은 납작한 행과 구분(aside 오검출 방지). */
function isPageSplit(pos: Pos): boolean {
  const p = pos.parentDims;
  return !!p && p.w >= 768 && p.h >= 400;
}

/**
 * 부모가 "페이지"로 볼 만한지 — header/footer/main/aside를 붙일 자격.
 * depth는 선택 기준 상대값이라, 이 게이트가 없으면 Hero·Card처럼 페이지가 아닌 걸
 * 선택하는 순간 그 자식들이 전부 depth 1 = 랜드마크 자리로 취급된다(hero-footer).
 * 두 가지로 거른다:
 *  - 이름: 부모 맥락이 알려진 역할(hero/card/nav/modal/sheet…)이면 페이지가 아니다.
 *    'Desktop'·'Home'처럼 역할 어휘가 아닌 이름이나, 일반 구조어(pickScope가 null)만 통과.
 *  - 형태: 좁은 모달/시트(폭 < 768)는 모바일 세로 화면만 예외로 통과.
 *    데스크톱 폭은 히어로 배너(~700)보다 큰 화면 높이(≥800)만 페이지로 본다.
 *    치수를 모르면 이름 판정에만 의존.
 */
function isPageParent(pos: Pos, ctxScope: string | null): boolean {
  if (ctxScope && isScopeRole(ctxScope)) return false;
  const p = pos.parentDims;
  if (!p || p.w <= 0 || p.h <= 0) return true; // 치수 미상 → 이름 판정에만 의존
  return isPageSized(p);
}

/** 치수만으로 "화면"인가 — 좁으면 세로 모바일 화면(≥700·세로형), 넓으면 화면 높이(≥800). */
function isPageSized(p: { w: number; h: number } | null): boolean {
  if (!p || p.w <= 0 || p.h <= 0) return false;
  // 좁은 프레임: 시트/드로어/다이얼로그 vs 세로 모바일 화면
  if (p.w < 768) return p.h >= 700 && p.h >= p.w;
  // 데스크톱·태블릿 폭: 납작한 히어로·패널은 배제, 화면 크롬만 통과
  return p.h >= 800;
}

/**
 * HTML 랜드마크 영역 추론(보수적, depth 1 컨테이너만).
 * 순번은 `regionIndex`/`regionTotal` — 숨김·TEXT·인스턴스 형제를 뺀 슬롯이라
 * 유령 레이어 하나가 header/footer 자리를 밀어내지 않는다.
 * - 가로: 페이지 수준 스플릿에서 부모 폭 대비 ≤35%인 좁은 컬럼 → aside
 * - 세로: 첫 → header, 마지막 → footer, 정확히 3분할이면 가운데 → main
 */
function regionRole(node: SceneNode, pos: Pos, ctxScope: string | null, parentRole: string | null): string | null {
  // 본문(main) 바로 아래도 페이지 수준이다 — 페이지가 [header, 본문] 둘로만 나뉜 파일에서
  // 본문의 자식들이 실제 섹션·푸터인데, depth 1만 보면 전부 container로 남는다.
  const underMain = parentRole === 'main';
  if ((pos.depth !== 1 && !underMain) || !isContainerType(node)) return null;
  if (pos.regionIndex < 0) return null;
  if (pos.parentLayout === 'horizontal') {
    if (!isPageParent(pos, ctxScope)) return null; // 카드·패널 안 좁은 열은 aside 아님
    if (!isPageSplit(pos)) return null;
    return pos.widthFrac != null && pos.widthFrac <= 0.35 ? 'aside' : null;
  }
  if (pos.parentLayout !== 'vertical' || pos.regionTotal < 2) return null;
  if (!isPageParent(pos, ctxScope)) return null; // 히어로·카드·시트 안에는 header/footer가 없다
  // 페이지 높이의 절반을 넘는 블록은 머리/꼬리가 아니라 본문이다 — [header 80px, 본문 4890px]
  // 같은 2분할에서 본문이 footer가 되고, 그 안의 히어로·기사 목록까지 footer-* 접두사를 받았다.
  const tall = pos.heightFrac != null && pos.heightFrac > 0.5;
  if (pos.regionIndex === 0 && !underMain) return tall ? 'main' : 'header';
  if (pos.regionIndex === pos.regionTotal - 1) return tall ? 'main' : 'footer';
  if (underMain) return 'section'; // 본문의 중간 블록(첫 블록은 히어로일 뿐 header가 아니다)
  if (pos.regionTotal === 3) return 'main'; // 가운데(0·마지막은 위에서 처리됨)
  return null;
}

/** 페이지(세로 스택, 슬롯 3개 초과)의 역할 없는 중간 블록인지 — section 폴백. */
function isPageSection(pos: Pos, ctxScope: string | null): boolean {
  return (
    pos.depth === 1 &&
    pos.parentLayout === 'vertical' &&
    pos.regionIndex > 0 &&
    pos.regionTotal > 3 &&
    pos.regionIndex < pos.regionTotal - 1 &&
    isPageParent(pos, ctxScope)
  );
}

/** 버튼 추론: 오토레이아웃 + 라운드 + 채움/외곽선 + 직속 텍스트 + 과대하지 않음. */
function isButtonLike(node: SceneNode): boolean {
  if (node.type !== 'FRAME') return false;
  if (layoutOf(node) === null) return false; // 오토레이아웃만
  if (!(cornerRadiusOf(node) > 0)) return false;
  if (!hasVisibleFill(node) && !hasVisibleStroke(node)) return false;
  if (!hasDirectText(node)) return false;
  const d = dims(node);
  if (d && d.h > 80) return false; // 너무 크면 버튼 아님(영역/카드)
  return true;
}

function cornerRadiusOf(node: SceneNode): number {
  const r = (node as { cornerRadius?: number | symbol }).cornerRadius;
  if (typeof r === 'number') return r;
  const tl = (node as { topLeftRadius?: number }).topLeftRadius; // mixed 라운드면 한 모서리로 판단
  return typeof tl === 'number' ? tl : 0;
}

function hasDirectText(node: SceneNode): boolean {
  return 'children' in node && node.children.some((c) => c.type === 'TEXT');
}

/* ---------- 시맨틱 컨테이너(카드/리스트/필드)·칩 추론 ---------- */
/** 칩: 작은(높이 ≤28) 알약형(반지름 ≥ 높이/2) — 버튼 중 작고 둥근 것. */
function isChipLike(node: SceneNode): boolean {
  const d = dims(node);
  if (!d || d.h > 28) return false;
  return cornerRadiusOf(node) >= d.h / 2 - 1;
}

/** 보이는 드롭섀도가 있는지(카드 판정용). */
function hasDropShadow(node: SceneNode): boolean {
  const eff = (node as { effects?: readonly Effect[] }).effects;
  return Array.isArray(eff) && eff.some((e) => e.visible !== false && e.type === 'DROP_SHADOW');
}

/** 카드: 표면(채움/외곽선) + 라운드 또는 그림자 + 자식 2개 이상인 프레임. */
function isCardLike(node: SceneNode, kids: readonly SceneNode[]): boolean {
  if (node.type !== 'FRAME') return false;
  if (kids.length < 2) return false;
  if (!hasVisibleFill(node) && !hasVisibleStroke(node)) return false;
  return cornerRadiusOf(node) > 0 || hasDropShadow(node);
}

/** 리스트 아이템이 될 수 있는(구조적) 자식 타입. */
const LIST_ITEM_TYPES = new Set(['FRAME', 'GROUP', 'INSTANCE', 'COMPONENT', 'RECTANGLE', 'ELLIPSE']);

/** 리스트: 오토레이아웃 + 같은 타입·유사 크기 자식 3개 이상(반복 아이템). */
function isListLike(node: SceneNode, kids: readonly SceneNode[]): boolean {
  if (node.type !== 'FRAME') return false;
  if (layoutOf(node) === null) return false; // 오토레이아웃만(우연한 겹침 배제)
  if (kids.length < 3) return false;
  const counts = new Map<string, number>();
  for (const k of kids) counts.set(k.type, (counts.get(k.type) ?? 0) + 1);
  let domType: string | null = null;
  let domCount = 0;
  for (const [t, c] of counts) if (c > domCount) { domCount = c; domType = t; }
  if (!domType || domCount / kids.length < 0.8) return false; // 8할 이상 같은 타입
  if (!LIST_ITEM_TYPES.has(domType)) return false;
  if (isSectionStack(kids)) return false; // 전폭·대형 블록의 반복은 페이지 구성이지 리스트가 아니다
  return dimsSimilar(kids); // 크기까지 유사해야 반복 아이템
}

/** 페이지 섹션 스택인지 — 자식이 모두 전폭(≥768)이면서 큰(≥400) 블록. */
function isSectionStack(kids: readonly SceneNode[]): boolean {
  return kids.every((k) => {
    const d = dims(k);
    return !!d && d.w >= 768 && d.h >= 400;
  });
}

/**
 * 모든 자식의 너비·높이가 서로 비슷한지(반복 행/카드 신호). 치수 없으면 보수적으로 false.
 * 높이 허용치는 좁게(1.25) — 전폭 페이지 섹션은 너비비가 항상 1.0이라 너비로는 걸러지지 않고,
 * 헐거운 높이 허용치면 랜딩 페이지 섹션 스택이 통째로 리스트가 된다.
 */
function dimsSimilar(kids: readonly SceneNode[]): boolean {
  const ws: number[] = [];
  const hs: number[] = [];
  for (const k of kids) {
    const d = dims(k);
    if (!d) return false;
    ws.push(d.w);
    hs.push(d.h);
  }
  return ratioWithin(ws, 1.5) && ratioWithin(hs, 1.25);
}

function ratioWithin(xs: number[], max: number): boolean {
  const mn = Math.min(...xs);
  const mx = Math.max(...xs);
  if (mn <= 0) return false;
  return mx / mn <= max;
}

/** 보이는 레이어인지(숨긴 에러/힌트 줄을 자식 수에서 빼기 위함). */
function isVisible(node: SceneNode): boolean {
  return (node as { visible?: boolean }).visible !== false;
}

/**
 * 필드: 세로 스택 안에 라벨(텍스트) + 입력박스.
 * 보이는 자식만 세고 힌트·에러 줄까지 허용한다 — 숨겨둔 에러 상태 레이어 하나 때문에
 * 필드가 통째로 container로 떨어지지 않도록.
 */
function isFieldLike(node: SceneNode, kids: readonly SceneNode[]): boolean {
  if (node.type !== 'FRAME') return false;
  if (layoutOf(node) !== 'vertical') return false; // 라벨 위, 입력 아래
  const shown = kids.filter(isVisible);
  if (shown.length < 2 || shown.length > 4) return false; // 라벨+입력(+힌트/에러)
  // 이름표 = 짧은 한 줄 글자(두 줄 안내 글은 이름표 아님 — ia-v4 §4.4 A3 실기 2).
  const hasLabel = shown.some((k) => k.type === 'TEXT' && shortOneLine(k as unknown as Parameters<typeof shortOneLine>[0]));
  const hasInput = shown.some(isInputBox);
  // 글자가 아닌 자식은 모두 입력 높이 안(≤72) — 목록 · 이미지 블록이 끼면 섹션이지 field가 아니다(A3).
  const shortBlocks = shown.every((k) => k.type === 'TEXT' || ((dims(k)?.h ?? Infinity) <= 72));
  return hasLabel && hasInput && shortBlocks;
}

/**
 * 입력박스: 외곽선/색 채움이 있는 가로로 긴(너비 ≥ 높이×2) 프레임·사각형.
 * 이미지 채움과 입력 높이를 벗어나는 크기는 제외 — 그러지 않으면 카드의 커버 사진이
 * 입력으로 인식돼 카드 전체가 field로 분류된다.
 */
function isInputBox(node: SceneNode): boolean {
  if (node.type !== 'FRAME' && node.type !== 'RECTANGLE') return false;
  if (hasImageFill(node)) return false; // 사진은 입력 상자가 아니다
  if (!hasVisibleStroke(node) && !hasColorFill(node)) return false;
  const d = dims(node);
  if (!d || d.h <= 0 || d.h > 72) return false; // 입력 높이 상한
  return d.w >= d.h * 2;
}

/* ---------- HTML 랜드마크(nav/figure) 추론 ---------- */
/**
 * 네비: 페이지 수준(depth ≤1)의 가로 오토레이아웃 + 링크형 자식 3개 이상, 과대하지 않음.
 * depth 제한과 버튼 크롬 제외가 없으면 카드 안 통계 행·테이블 헤더·세그먼트 라벨이
 * 전부 nav 랜드마크로 덮인다.
 */
function isNavLike(node: SceneNode, depth: number, ctxScope: string | null = null): boolean {
  if (node.type !== 'FRAME') return false;
  if (layoutOf(node) !== 'horizontal') return false;
  // 페이지 수준 링크 행, 또는 헤더 안이면 깊이 무관(헤더 > container > 링크행이 흔하다).
  if (depth > 1 && ctxScope !== 'header') return false;
  if (cornerRadiusOf(node) > 0 && (hasVisibleFill(node) || hasVisibleStroke(node))) return false; // 버튼 크롬
  const kids = node.children;
  if (kids.length < 3) return false;
  const d = dims(node);
  if (d && d.h > 80) return false; // 너무 크면 nav 아님(카드/섹션 행)
  return kids.every((k) => k.type === 'TEXT' || (k.type === 'FRAME' && hasDirectText(k)));
}

/**
 * 헤더 맥락의 가로(또는 자유 배치) 행에서 **첫 자리**의 작은 묶음 → logo(마크·워드마크).
 * header > logo, header > row > logo 까지만(ctxDepth ≤ 1) — 더 깊은 중첩 컨테이너의 첫 자식은 아니다.
 */
function isLogoLike(node: SceneNode, pos: Pos, ctxScope: string | null): boolean {
  if (ctxScope !== 'header' || pos.ctxDepth > 1) return false;
  if (!isContainerType(node) || !('children' in node) || node.children.length === 0) return false;
  if (pos.parentLayout === 'vertical') return false;
  const d = dims(node);
  if (!d || d.h > 80 || d.w > 320) return false; // 헤더 높이 안의 작은 묶음만
  // 레이어 순서가 아니라 화면 위치(A4): 보이는 형제 중 가장 왼쪽 + 가운데가 부모 폭 왼쪽 1/3 안.
  const box = boxIn(node, pos);
  const pw = parentWidth(pos);
  if (!box || pw == null) return false;
  for (const s of pos.siblings) {
    if (s === node || !isVisible(s)) continue;
    const sb = boxIn(s, pos);
    if (!sb) return false;
    if (sb.x < box.x - 1) return false;
  }
  if (box.x + box.w / 2 > pw / 3) return false;
  return countVisibleTexts(node, 2) < 2; // 글자 2개 이상은 링크 · 버튼 줄
}

/** 실제 부모 폭(숫자가 아니면 null). */
function parentWidth(pos: Pos): number | null {
  const w = pos.parentNode ? (pos.parentNode as { width?: unknown }).width : undefined;
  return typeof w === 'number' && w > 0 ? w : null;
}

/** 실제 부모 기준 x · 폭 — GROUP 부모는 자식 x가 GROUP의 부모 기준이라 부모 x를 뺀다. */
function boxIn(node: SceneNode, pos: Pos): { x: number; w: number } | null {
  const x = (node as { x?: unknown }).x;
  const w = (node as { width?: unknown }).width;
  if (typeof x !== 'number' || typeof w !== 'number') return null;
  let ox = 0;
  if (pos.parentNode && pos.parentNode.type === 'GROUP') {
    const px = (pos.parentNode as { x?: unknown }).x;
    if (typeof px !== 'number') return null;
    ox = px;
  }
  return { x: x - ox, w };
}

/** 보이는 자손 TEXT 수(limit에서 멈춤). */
function countVisibleTexts(node: SceneNode, limit: number): number {
  let n = 0;
  const walk = (x: SceneNode): void => {
    if (n >= limit || !isVisible(x)) return;
    if (x.type === 'TEXT') { n++; return; }
    if ('children' in x) for (const c of x.children) walk(c);
  };
  if ('children' in node) for (const c of node.children) walk(c);
  return n;
}

/** 헤더 맥락의 가로 행에서 **마지막 자리**의 텍스트·버튼 2~3개 → actions(Sign in · Sign up). 깊이 제한은 logo와 같다. */
function isActionsLike(node: SceneNode, pos: Pos, ctxScope: string | null): boolean {
  if (ctxScope !== 'header' || pos.ctxDepth > 1) return false;
  if (node.type !== 'FRAME' || layoutOf(node) !== 'horizontal') return false;
  if (pos.total < 2) return false;
  // 레이어 순서가 아니라 화면 위치(A4): 보이는 형제 중 가장 오른쪽.
  const box = boxIn(node, pos);
  if (!box || parentWidth(pos) == null) return false;
  for (const s of pos.siblings) {
    if (s === node || !isVisible(s)) continue;
    const sb = boxIn(s, pos);
    if (!sb) return false;
    if (sb.x + sb.w > box.x + box.w + 1) return false;
  }
  const kids = node.children;
  if (kids.length < 2 || kids.length > 3) return false;
  const d = dims(node);
  if (d && d.h > 80) return false;
  return kids.every((k) => k.type === 'TEXT' || (k.type === 'FRAME' && (isButtonLike(k) || hasDirectText(k))));
}

/** 피겨: 이미지(채움) 자식 + 캡션(텍스트)으로 이뤄진 프레임 — 카드 크롬이 없을 때만(카드 우선). */
function isFigureLike(node: SceneNode, kids: readonly SceneNode[]): boolean {
  if (node.type !== 'FRAME') return false;
  if (kids.length < 2 || kids.length > 3) return false;
  const hasImg = kids.some((k) => hasImageFill(k));
  const hasCaption = kids.some((k) => k.type === 'TEXT');
  return hasImg && hasCaption;
}

/* ---------- 오버레이/모달 · 입력 · 프로그레스 · 썸네일 · 상태 추론 ---------- */
/**
 * 스크림 페인트인지 — 반투명한 "단색" 표면.
 * 그라데이션 워시·틴트는 제외한다. 아무 반투명 면이나 배경막으로 보면
 * 장식용 배경을 깐 페이지의 히어로가 modal이 된다.
 */
function isScrimPaint(node: SceneNode): boolean {
  const f = paints(node, 'fills');
  if (!f) return false;
  const solid = f.filter((p) => p.visible !== false && p.type === 'SOLID');
  if (!solid.length) return false;
  const o = (node as { opacity?: number }).opacity;
  if (typeof o === 'number' && o < 1) return true;
  return solid.some((p) => typeof p.opacity === 'number' && p.opacity < 1);
}

/** 부모를 거의(≥95%) 덮는지 — 풀블리드 판정. 부모 치수를 모르면 false. */
function coversParent(node: SceneNode, parentDims: { w: number; h: number } | null): boolean {
  if (!parentDims || parentDims.w <= 0 || parentDims.h <= 0) return false;
  const d = dims(node);
  if (!d) return false;
  return d.w / parentDims.w >= 0.95 && d.h / parentDims.h >= 0.95;
}

/** 배경막 후보: 부모를 덮는 반투명 단색 면. */
function isScrimLike(node: SceneNode, parentDims: { w: number; h: number } | null): boolean {
  if (node.type !== 'FRAME' && node.type !== 'RECTANGLE') return false;
  if (!coversParent(node, parentDims)) return false;
  return isScrimPaint(node);
}

/** 부모보다 양 축 모두 뚜렷하게 작은지 — 가운데 띄운 패널 판정(전폭 header 배제). */
function isInsetPanel(node: SceneNode, parentDims: { w: number; h: number } | null): boolean {
  if (!parentDims || parentDims.w <= 0 || parentDims.h <= 0) return false;
  const d = dims(node);
  return !!d && d.w / parentDims.w <= 0.9 && d.h / parentDims.h <= 0.9;
}

/** 모달 패널: 표면(채움/외곽선)이 있고 부모보다 양 축 모두 작은 내용 컨테이너. */
function isPanelLike(node: SceneNode, parentDims: { w: number; h: number } | null): boolean {
  if (!isContainerType(node)) return false;
  if (!('children' in node) || node.children.length === 0) return false;
  if (!hasVisibleFill(node) && !hasVisibleStroke(node)) return false;
  return isInsetPanel(node, parentDims);
}

/**
 * 확정된 배경막의 인덱스(없으면 -1).
 * 반투명 면 하나만으로는 부족하고, 그 위(뒤 형제)나 그 안에 실제 패널이 있어야 배경막으로 인정한다.
 * 배경막과 패널이 서로를 뒷받침하게 해서 장식용 반투명 배경의 오검출을 막는다.
 */
function findOverlayIndex(nodes: readonly SceneNode[], parentDims: { w: number; h: number } | null): number {
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (!isScrimLike(n, parentDims)) continue;
    for (let j = i + 1; j < nodes.length; j++) if (isPanelLike(nodes[j], parentDims)) return i;
    if ('children' in n && n.children.some((k) => isPanelLike(k, dims(n)))) return i;
  }
  return -1;
}

/** 모달(패널): 확정된 배경막 뒤에 오거나 배경막 맥락 안에 있는 패널. */
function isModalLike(node: SceneNode, pos: Pos, ctxScope: string | null): boolean {
  if (!pos.afterOverlay && ctxScope !== 'overlay') return false;
  return isPanelLike(node, pos.parentDims);
}

/**
 * 프로그레스: 얇고 완전히 둥근 가로 트랙 + 그보다 "좁은" 채움 바 자식.
 * - 높이 하한 4px: 그 아래는 알약 검사가 공허해져(`r >= h/2`가 0 이상이면 통과) 구분선까지 걸린다
 * - 채움 바는 트랙보다 좁아야 함: 같은 폭이면 진행 표시가 아니라 장식용 액센트 바다
 */
function isProgressLike(node: SceneNode, kids: readonly SceneNode[]): boolean {
  if (node.type !== 'FRAME') return false;
  if (kids.length < 1 || kids.length > 2) return false;
  if (kids.some((k) => k.type === 'TEXT')) return false; // 텍스트가 있으면 칩/버튼 쪽
  const d = dims(node);
  if (!d || d.h < 4 || d.h > 24) return false;
  if (d.w < d.h * 4) return false; // 가로로 긴 바
  if (cornerRadiusOf(node) * 2 < d.h) return false; // 완전한 알약형 트랙
  if (!hasVisibleFill(node) && !hasVisibleStroke(node)) return false;
  return kids.some((k) => {
    const kd = dims(k);
    return !!kd && kd.w > 0 && kd.w < d.w && kd.h <= d.h + 1 && hasColorFill(k);
  });
}

/**
 * 프로그레스 트랙 안의 채움 바인지 — 색만 채운 납작한 가로 막대.
 * 맥락이 'progress'이기만 하면 인정하면 'Progress'라는 이름의 섹션 아래 색 있는
 * 모든 자식이 indicator가 된다. 형태까지 봐서 실제 바만 인정한다.
 */
function isBarFill(node: SceneNode): boolean {
  if (node.type !== 'RECTANGLE' && node.type !== 'FRAME') return false;
  if ('children' in node && node.children.length > 0) return false; // 내용이 있으면 바가 아님
  if (hasImageFill(node) || !hasColorFill(node)) return false;
  const d = dims(node);
  return !!d && d.h > 0 && d.h <= 24 && d.w >= d.h * 2;
}

/** 썸네일이 성립하는 맥락 — 카드/피드 항목 안의 미리보기. */
const THUMB_CONTEXTS = new Set(['card', 'article', 'item', 'list', 'figure']);

/** 썸네일: 카드/항목 맥락 안의 작은 이미지. 전면 이미지는 image, 둥근 이미지는 avatar. */
function isThumbnail(node: SceneNode, pos: Pos, ctxScope: string | null): boolean {
  if (!ctxScope || !THUMB_CONTEXTS.has(ctxScope)) return false;
  if (node.type === 'ELLIPSE') return false; // 원형 이미지는 avatar
  if (!hasImageFill(node)) return false;
  const d = dims(node);
  if (!d) return false;
  if (Math.max(d.w, d.h) <= 96) return true; // 작은 미리보기
  const p = pos.parentDims;
  return !!p && p.w > 0 && p.h > 0 && (d.w * d.h) / (p.w * p.h) <= 0.35; // 부모 대비 작음
}

/** 상태 점: 아바타 형제 곁의 작은 단색 원(온라인 표시 등). */
function isStatusDot(node: SceneNode, pos: Pos): boolean {
  if (!pos.hasAvatarSibling) return false;
  if (node.type !== 'ELLIPSE' && node.type !== 'RECTANGLE' && node.type !== 'FRAME') return false;
  if (hasImageFill(node) || !hasColorFill(node)) return false;
  const d = dims(node);
  if (!d || d.w <= 0 || d.h <= 0) return false;
  if (Math.max(d.w, d.h) > 16) return false; // 작은 점
  // 원형이어야 한다 — 사각 타입이면 반지름이 반쪽 이상.
  return node.type === 'ELLIPSE' || cornerRadiusOf(node) >= Math.min(d.w, d.h) / 2 - 1;
}

/* ---------- 역할 세분화 1차(ia-v4 §4.4 A1–A2 · B1–B3) ---------- */
const ICONISH_VECTORS = new Set(['VECTOR', 'BOOLEAN_OPERATION', 'STAR', 'POLYGON']);

/** 아이콘 프레임 — `isIconFrame`(LINE 포함 벡터) + LINE이 아닌 벡터 1개 이상. */
function isIconFrameNode(node: SceneNode): boolean {
  if (node.type !== 'FRAME' && node.type !== 'GROUP') return false;
  if (!isIconFrame(node as unknown as Parameters<typeof isIconFrame>[0])) return false;
  const hasRealVector = (x: SceneNode): boolean =>
    'children' in x && x.children.some((c) => (VECTOR_TYPES.has(c.type) && c.type !== 'LINE') || hasRealVector(c));
  return hasRealVector(node);
}

/** 아이콘 같은 것 — 벡터 계열(LINE 제외) · 아이콘 프레임 · 두 변 48 이하 인스턴스. */
function isIconish(node: SceneNode): boolean {
  if (ICONISH_VECTORS.has(node.type)) return true;
  if (isIconFrameNode(node)) return true;
  if (node.type === 'INSTANCE') {
    const d = dims(node);
    return !!d && d.w <= 48 && d.h <= 48;
  }
  return false;
}

const EMITTED = new Set<string>(EMITTED_ROLES);
const STRUCT_FALLBACK_NAMES = new Set(['container', 'wrapper', 'stack-x', 'stack-y', 'shape']);

/** 아이콘 프레임의 지금 이름이 뜻 없는 이름인지(A1 ① 자동 이름 · ② 전에 붙인 이름). */
function isMeaninglessIconName(node: SceneNode, rootPrefix: string | null): boolean {
  const name = node.name;
  if (isDefaultName(name)) return true; // ①
  if (STRUCT_FALLBACK_NAMES.has(name)) return true; // ⓐ 구조 폴백
  const toks = kebab(name).split('-').filter(Boolean);
  if (toks.length === 1 && toks[0] === 'icon') return true; // ⓐ Icon
  // ⓑ dsRole + 이름이 그 역할로 끝나고 앞 낱말이 출력 역할(맨 앞 한 낱말만 루트 접두사 허용)
  const role = readPluginKey(node, ROLE_KEY);
  return !!role && namedByPlugin(name, role, rootPrefix);
}

/** pluginData 값 읽기(API 없음 · 실패 → ''). */
function readPluginKey(node: SceneNode, key: string): string {
  try {
    const fn = (node as { getPluginData?: (k: string) => string }).getPluginData;
    return typeof fn === 'function' ? fn.call(node, key) || '' : '';
  } catch {
    return '';
  }
}

/** A1 ②ⓑ — 이름이 `dsRole` 낱말로 끝나고 앞 낱말이 모두 출력 역할(맨 앞 한 낱말만 루트 접두사 허용)인지. */
function namedByPlugin(name: string, role: string, rootPrefix: string | null): boolean {
  const toks = kebab(name).split('-').filter(Boolean);
  const rt = kebab(role).split('-').filter(Boolean);
  if (!rt.length || toks.length < rt.length) return false;
  if (toks.slice(toks.length - rt.length).join('-') !== rt.join('-')) return false;
  const head = toks.slice(0, toks.length - rt.length);
  return head.every((t, i) => EMITTED.has(t) || (i === 0 && rootPrefix != null && t === rootPrefix));
}

/* ---------- 이름 힌트(ia-v4 §4.4 "이름 힌트" · B.28) ---------- */
/** 영어 힌트 낱말 → 힌트 역할. */
const HINT_EN: Readonly<Record<string, string>> = {
  gnb: 'nav', lnb: 'nav', snb: 'nav', nav: 'nav', navigation: 'nav', navbar: 'nav', menubar: 'nav',
  breadcrumb: 'breadcrumb', breadcrumbs: 'breadcrumb',
  tabs: 'tabs', tabbar: 'tabs', tablist: 'tabs', tabmenu: 'tabs', tabgroup: 'tabs',
  tab: 'tab',
  divider: 'divider', separator: 'divider',
  button: 'button', btn: 'button', cta: 'button',
};
/** 한글 낱말을 코드 값으로 적는다 — src 문자열 리터럴에 한글을 두지 않는 규칙(terms 5b, 화면 문구는 i18n.ts에만). */
const ko = (hex: string): string => hex.split(' ').map((c) => String.fromCharCode(parseInt(c, 16))).join('');
const TAB_KO = ko('D0ED'); // 탭
/** 한글 힌트 낱말 — 긴 낱말 먼저(`탭메뉴`를 `탭`보다, `네비게이션`을 `네비`보다). */
const HINT_KO: ReadonlyArray<readonly [string, string]> = ([
  [ko('B0B4 BE44'), 'nav'], // 내비
  [ko('B124 BE44'), 'nav'], // 네비
  [ko('B124 BE44 AC8C C774 C158'), 'nav'], // 네비게이션
  [ko('B0B4 BE44 AC8C C774 C158'), 'nav'], // 내비게이션
  [ko('ACBD B85C'), 'breadcrumb'], // 경로
  [ko('D0ED BA54 B274'), 'tabs'], // 탭메뉴
  [ko('D0ED'), 'tab'], // 탭
  [ko('AD6C BD84 C120'), 'divider'], // 구분선
  [ko('BC84 D2BC'), 'button'], // 버튼
] as Array<readonly [string, string]>).sort((a, b) => b[0].length - a[0].length);
const NAV_EN = new Set(Object.keys(HINT_EN).filter((k) => HINT_EN[k] === 'nav'));
const NAV_KO = HINT_KO.filter(([, r]) => r === 'nav').map(([w]) => w);
/** 중립 꼬리 — nav · tab 낱말 바로 뒤에서만 힌트를 잇는다. */
const NEUTRAL_TAILS = new Set(['menu', 'bar', 'area', 'wrap', 'box']);
const KO_TAILS = new Set([ko('BA54 B274'), ko('C601 C5ED'), ko('BC14')]); // 메뉴 · 영역 · 바
const HANGUL = /[\u1100-\u11FF\u3131-\u318E\uAC00-\uD7A3]/;
/** 토막 나누기 — 글자 · 숫자가 아닌 모든 것(공백 · 문장부호 · `-` `_` `/` `.` `·`). 대상 Figma 런타임이 es2017이라 \p{L} 대신 범위로 적는다. */
const NON_WORD = /[^0-9A-Za-z\u00C0-\u024F\u0370-\u03FF\u0400-\u04FF\u1100-\u11FF\u3040-\u30FF\u3131-\u318E\u4E00-\u9FFF\uAC00-\uD7A3]+/;
/** 약한 구조 판정 — 이름 힌트가 덮을 수 있다. */
const HINT_WEAK_ROLES = new Set(['container', 'wrapper', 'stack-x', 'stack-y', 'section', 'row', 'text-group', 'media', 'swatch', 'item']);

/** 이름의 머리 낱말(맨 뒤 낱말)에서 힌트 역할을 구한다(없으면 null). 단계 0–4는 ia-v4 §4.4 "머리 낱말 찾기". */
export function nameHintRole(name: string): string | null {
  const segs = name.split(NON_WORD).filter(Boolean);
  const lastSeg = segs[segs.length - 1] ?? '';
  // 0. 맨 뒤 토막에 한글이 있으면 한글만 본다(뒤에 오는 한글이 머리명사).
  if (!HANGUL.test(lastSeg)) {
    // 1. 영어 — 맨 뒤 숫자 낱말을 떼고 맨 뒤 낱말.
    const w = kebab(name).split('-').filter(Boolean);
    while (w.length && /^[\d_]+$/.test(w[w.length - 1])) w.pop();
    const last = w[w.length - 1];
    if (last) {
      if (HINT_EN[last]) return HINT_EN[last];
      // 2. 꼬리 규칙은 nav · tab 낱말 뒤에만.
      const prev = w[w.length - 2];
      if (prev && NEUTRAL_TAILS.has(last) && NAV_EN.has(prev)) return 'nav';
      if (prev === 'tab' && (NEUTRAL_TAILS.has(last) || last === 'list' || last === 'group')) return 'tabs';
    }
    // 3. 그 밖이면 영어 힌트 없음 → 4. 한글
  }
  return koreanHint(segs);
}

/** 4. 한글 — 맨 뒤 토막이 한글 낱말로 끝나거나, 정확히 꼬리이고 바로 앞 토막이 nav · tab 낱말. */
function koreanHint(segs: readonly string[]): string | null {
  const last = segs[segs.length - 1];
  if (!last) return null;
  for (const [word, role] of HINT_KO) if (last.endsWith(word)) return role;
  if (KO_TAILS.has(last) && segs.length >= 2) {
    const prev = segs[segs.length - 2];
    if (HANGUL.test(prev)) {
      if (NAV_KO.some((k) => prev.endsWith(k))) return 'nav';
      if (prev.endsWith(TAB_KO)) return 'tabs';
    } else {
      const p = prev.toLowerCase();
      if (NAV_EN.has(p)) return 'nav';
      if (p === 'tab') return 'tabs';
    }
  }
  return null;
}

/** 노드의 힌트 역할 — 이 플러그인이 전에 지은 이름(`dsRole` ≠ 힌트 역할 + A1 ②ⓑ)은 힌트가 아니다. */
function hintRole(node: SceneNode, rootPrefix: string | null): string | null {
  const h = nameHintRole(node.name);
  if (!h) return null;
  const stored = readPluginKey(node, ROLE_KEY);
  if (stored && stored !== h && namedByPlugin(node.name, stored, rootPrefix)) return null;
  return h;
}

/** 영역 자리인지 — 지금 코드가 hero · 영역 · section을 붙이는 자리면 글자 버튼 판정을 건너뛴다(A2). */
function atRegionSlot(node: SceneNode, pos: Pos, ctxScope: string | null, parentRole: string | null): boolean {
  if (!isContainerType(node)) return false;
  if (parentRole === 'main' && pos.regionIndex === 0 && pos.parentLayout === 'vertical') return true;
  if (regionRole(node, pos, ctxScope, parentRole)) return true;
  return isPageSection(pos, ctxScope);
}

/** 글자 버튼(A2) — 둥근 모서리 · 채움 없이 글자 1개 + 아이콘 자리인 오토레이아웃 프레임. */
function isTextButtonLike(node: SceneNode): boolean {
  if (node.type !== 'FRAME' || layoutOf(node) === null) return false;
  const d = dims(node);
  if (!d || d.h > 64 || d.w > 400) return false;
  const kids = node.children;
  const texts = kids.filter((k) => k.type === 'TEXT' && isVisible(k));
  if (texts.length !== 1 || !shortOneLine(texts[0] as unknown as Parameters<typeof shortOneLine>[0])) return false;
  const others = kids.filter((k) => k !== texts[0]);
  if (!others.every((k) => isIconish(k))) return false; // 숨긴 글자도 여기서 걸러짐(TEXT는 아이콘 아님)
  if (others.length > 0) return true;
  if (hasVisibleFill(node) || hasVisibleStroke(node)) return true;
  const pl = (node as { paddingLeft?: unknown }).paddingLeft;
  const pr = (node as { paddingRight?: unknown }).paddingRight;
  return typeof pl === 'number' && typeof pr === 'number' && pl >= 4 && pr >= 4;
}

const DIGITS_ONLY = /^[\d\s/]+$/;
const isDigitsText = (t: SceneNode): boolean => typeof (t as { characters?: unknown }).characters === 'string' && DIGITS_ONLY.test((t as TextNode).characters);

/** 세로 범위가 겹치는지(같은 줄). 치수를 모르면 false. */
function sameLine(a: SceneNode, b: SceneNode): boolean {
  const ay = (a as { y?: unknown }).y, by = (b as { y?: unknown }).y;
  const da = dims(a), db = dims(b);
  if (typeof ay !== 'number' || typeof by !== 'number' || !da || !db) return false;
  return Math.max(ay, by) < Math.min(ay + da.h, by + db.h);
}

function xOf(n: SceneNode): number {
  const x = (n as { x?: unknown }).x;
  return typeof x === 'number' ? x : 0;
}

/** 가로로 나란한지 — 이 노드가 가로 오토레이아웃이거나, 아니면 모두 서로 세로 범위가 겹침. */
function sideBySide(node: SceneNode, items: readonly SceneNode[]): boolean {
  if (layoutOf(node) === 'horizontal') return true;
  if (layoutOf(node) === 'vertical') return false;
  for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) if (!sameLine(items[i], items[j])) return false;
  return true;
}

/** B1 row — 이름표 글자 + 값 한 줄. */
function isRowLike(node: SceneNode, kids: readonly SceneNode[]): boolean {
  const shown = kids.filter(isVisible);
  if (shown.length !== 2) return false;
  const d = dims(node);
  if (!d || d.h > 64 || d.w < d.h * 2.5) return false;
  if (!sideBySide(node, shown)) return false;
  const [left, right] = xOf(shown[0]) <= xOf(shown[1]) ? [shown[0], shown[1]] : [shown[1], shown[0]];
  if (left.type !== 'TEXT' || !shortOneLine(left as unknown as Parameters<typeof shortOneLine>[0])) return false;
  if (right.type === 'TEXT') {
    if (isDigitsText(left) && isDigitsText(right)) return false; // 페이지 번호
    return true;
  }
  if (right.type !== 'INSTANCE' && right.type !== 'FRAME' && right.type !== 'GROUP') return false;
  const n = countVisibleTexts(right, 3);
  return n >= 1 && n <= 2;
}

/** B2 text-group — 보이는 자식이 모두 글자(2개 이상). 가로 3개 이상 · 숫자뿐은 아님. */
function isTextGroupLike(node: SceneNode, kids: readonly SceneNode[]): boolean {
  const shown = kids.filter(isVisible);
  if (shown.length < 2 || !shown.every((k) => k.type === 'TEXT')) return false;
  if (shown.length >= 3 && sideBySide(node, shown)) return false;
  if (shown.every(isDigitsText)) return false;
  return true;
}

/** B3 media — 사진(원 제외) 1개 이상 + 나머지는 아이콘 같은 것. */
function isMediaLike(kids: readonly SceneNode[]): boolean {
  const shown = kids.filter(isVisible);
  // 사진 = 사진 채움 사각형, 또는 보이는 자식 없는 사진 채움 프레임(글자를 얹은 배너는 아님).
  const isPhoto = (k: SceneNode): boolean =>
    hasImageFill(k) && (k.type === 'RECTANGLE' || (k.type === 'FRAME' && !k.children.some(isVisible)));
  if (!shown.some(isPhoto)) return false;
  return shown.every((k) => isPhoto(k) || isIconish(k));
}

