/* ============================================================
   rename.ts — 레이어를 "역할(role)"에 맞게 정돈 (naming.ts 규칙 사용)
   원칙: 역할이 이름을 정한다. 토큰은 신호로만 쓰고 경로를 복사하지 않는다.
   - 보존형: Figma 기본명(Frame 12…)과 구 리네임의 토큰 베낌명만 교체,
     사람이 지은 의미 있는 이름은 보존하고 자식의 맥락(context)으로만 사용.
   - 역할 판정: 영역(상단/하단) → 버튼 → 토큰 말단 → 타입/기하 순.
     · 영역: 페이지 세로 스택의 첫/마지막 컨테이너 → header/footer
     · 버튼: 오토레이아웃 + 라운드 + 채움/외곽선 + 직속 텍스트 → button
   - 맥락: 바로 위 의미 있는 이름에서 깨끗한 1단계만(pickScope). 숫자·단위 조각 제거.
   - 이름 형식: {맥락}-{역할} 최대 2토막. 형제 충돌에 숫자 안 붙임(Figma 중복 허용).
   - 제외(보존): Component/ComponentSet · Text · Instance(+하위 서브트리) · 잠긴 레이어
     · 선택의 루트 컨테이너(기본명이어도) · 사람이 지은 의미 있는 이름.
   - 출력: 방문한 전체 서브트리(RenameNode[]) — 영향 노드는 changed, 나머지는 preserved 사유.
   ============================================================ */
import { isDefaultName, isTokenEchoName, parseTokenName, layerNameFromRole, pickScope, kebab } from './naming';
import type { ParsedToken } from './naming';
import type { RenameChange, RenameNode, PreservedReason } from '../shared/messages';

/** 자식에게 내려보내는 위치 정보(영역 추론용). depth 0 = 선택 루트. */
interface Pos {
  index: number;
  total: number;
  parentLayout: 'vertical' | 'horizontal' | null;
  depth: number;
}

interface Opts {
  apply: boolean;
  maxDepth: number;
}

export interface RenameOutcome {
  /** 영향 노드만(이름 바뀜) — 하위호환·요약용. */
  changes: RenameChange[];
  /** 방문한 전체 서브트리(미리보기 트리용). */
  nodes: RenameNode[];
  applied: boolean;
  /** 노드 상한 도달로 일부 서브트리를 생략했는지. */
  capped: boolean;
}

/** 미리보기 트리가 과도하게 커지는 것을 막는 안전 상한(이를 넘으면 이후 서브트리 생략). */
const MAX_NODES = 5000;

/** 결정: 이름을 바꾸거나(rename) 사유와 함께 보존(preserve). */
type Decision = { kind: 'rename'; name: string } | { kind: 'preserve'; reason: PreservedReason };

export async function renameSelection(
  selection: readonly SceneNode[],
  opts: Opts,
): Promise<RenameOutcome> {
  const nodes: RenameNode[] = [];
  const state = { capped: false };
  await recurse(selection, null, null, opts, nodes, state, 0, null);
  const changes: RenameChange[] = nodes
    .filter((n) => n.changed)
    .map((n) => ({ id: n.id, before: n.before, after: n.after }));
  return { changes, nodes, applied: opts.apply, capped: state.capped };
}

async function recurse(
  sceneNodes: readonly SceneNode[],
  ancestorName: string | null,
  parentId: string | null,
  opts: Opts,
  out: RenameNode[],
  state: { capped: boolean },
  depth: number,
  parentLayout: Pos['parentLayout'],
): Promise<void> {
  const total = sceneNodes.length;
  for (let i = 0; i < total; i++) {
    if (out.length >= MAX_NODES) {
      state.capped = true;
      return;
    }
    const node = sceneNodes[i];
    const before = node.name;
    const pos: Pos = { index: i, total, parentLayout, depth };
    const decided = await decide(node, ancestorName, pos, opts);

    let after = before;
    let changed = false;
    let preserved: PreservedReason | null = null;
    if (decided.kind === 'rename') {
      after = decided.name;
      // 숫자 접미사 없음 — 형제가 같은 이름이어도 그대로(Figma는 중복 이름 허용).
      changed = after !== before;
      if (changed && opts.apply) node.name = after;
    } else {
      preserved = decided.reason;
    }

    out.push({ id: node.id, type: node.type, before, after, changed, depth, parentId, preserved });

    // 자식 맥락: 새로 부여한 역할명(after) 또는 사람이 지은 의미 있는 보존명만 전달.
    // 보존된 기본명(Frame 1)·토큰 베낌명은 맥락으로 쓰지 않는다(frame-* 같은 잡음 방지).
    let contextForChildren: string | null = null;
    if (decided.kind === 'rename') contextForChildren = after;
    else if (!isDefaultName(before) && !isTokenEchoName(before)) contextForChildren = before;

    // 인스턴스(#7b-2)는 자기 이름 보존 + 하위 서브트리까지 통째 스킵.
    if ('children' in node && node.type !== 'INSTANCE') {
      await recurse(node.children, contextForChildren, node.id, opts, out, state, depth + 1, layoutOf(node));
    }
  }
}

async function decide(
  node: SceneNode,
  ancestorName: string | null,
  pos: Pos,
  opts: Opts,
): Promise<Decision> {
  // 제외 규칙(이름 유지 · 자기 이름을 자식 맥락으로 전달)
  if (node.type === 'COMPONENT' || node.type === 'COMPONENT_SET') return { kind: 'preserve', reason: 'component' };
  if (node.type === 'TEXT') return { kind: 'preserve', reason: 'text' };
  if (node.type === 'INSTANCE') return { kind: 'preserve', reason: 'instance' };
  if (node.locked) return { kind: 'preserve', reason: 'locked' };

  // #7b-1: 선택의 최상위(루트) 프레임/컨테이너는 기본명이어도 항상 보존(최종 산출물의 이름은 건드리지 않음).
  if (pos.depth === 0 && isContainerType(node)) return { kind: 'preserve', reason: 'root' };

  // 보존형: 사람이 지은 의미 있는 이름은 그대로 두고 맥락으로만 쓴다.
  // 단, Figma 기본명과 구 리네임이 남긴 토큰 베낌 이름(color-121210 등)은 교체.
  if (!isDefaultName(node.name) && !isTokenEchoName(node.name)) return { kind: 'preserve', reason: 'named' };

  const token = await primaryToken(node);
  const role = resolveRole(node, token, pos);
  // 맥락: 바로 위 의미 있는 이름에서 깨끗한 1단계 → 없으면 토큰 경로 접두사에서.
  let scope = (ancestorName ? pickScope(ancestorName) : null) ?? (token?.context ? pickScope(token.context) : null);
  if (scope === role) scope = null; // 맥락==역할이면 중복 제거(button-button 방지)
  return { kind: 'rename', name: layerNameFromRole(scope, role, { maxDepth: opts.maxDepth }) };
}

/* ---------- 역할 판정: 영역 → 버튼 → 토큰 신호 → 타입/기하 ---------- */
function resolveRole(node: SceneNode, token: ParsedToken | null, pos: Pos): string {
  if (isButtonLike(node)) return 'button'; // 버튼은 토큰 채움색보다 우선
  const region = regionRole(node, pos);
  if (region) return region;
  if (token?.roleLeaf) return token.roleLeaf; // 토큰 말단이 역할이면 신호로 사용

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
      const count = 'children' in node ? node.children.length : 0;
      if (count === 0) {
        // 자식 없는 프레임: 색만 채웠으면 스와치, 이미지면 image, 비었으면 container.
        if (hasImageFill(node)) return 'image';
        if (hasColorFill(node)) return 'swatch';
        return 'container';
      }
      return count === 1 ? 'wrapper' : 'container';
    }
    default:
      return kebab(node.type);
  }
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
      if (v) return parseTokenName(v.name);
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

function paints(node: SceneNode, field: 'fills' | 'strokes'): Paint[] | null {
  if (!(field in node)) return null;
  const p = (node as unknown as Record<string, unknown>)[field];
  return Array.isArray(p) ? (p as Paint[]) : null; // figma.mixed → 배열 아님 → null
}

function hasVisibleFill(node: SceneNode): boolean {
  const f = paints(node, 'fills');
  return !!f && f.some((p) => p.visible !== false);
}

function hasImageFill(node: SceneNode): boolean {
  const f = paints(node, 'fills');
  return !!f && f.some((p) => p.visible !== false && p.type === 'IMAGE');
}

/** 보이는 색(단색·그라데이션, 이미지 제외) 채움이 있는지 — 스와치 판정용. */
function hasColorFill(node: SceneNode): boolean {
  const f = paints(node, 'fills');
  return !!f && f.some((p) => p.visible !== false && p.type !== 'IMAGE');
}

function hasVisibleStroke(node: SceneNode): boolean {
  const s = paints(node, 'strokes');
  return !!s && s.some((p) => p.visible !== false);
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
 * 영역 추론(보수적): 페이지(세로 오토레이아웃) 바로 아래 컨테이너의
 * 첫 자식 → header, 마지막 자식 → footer. depth 1에서만(과추론 방지).
 */
function regionRole(node: SceneNode, pos: Pos): string | null {
  if (pos.depth !== 1 || pos.parentLayout !== 'vertical' || pos.total < 2) return null;
  if (!isContainerType(node)) return null;
  if (pos.index === 0) return 'header';
  if (pos.index === pos.total - 1) return 'footer';
  return null;
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
