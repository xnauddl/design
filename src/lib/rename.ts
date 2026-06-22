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
   - 중첩 컨테이너: 같은 맥락(scope)이 깊어지면 container→content→inner 사다리로 구분.
     예) header › header-content › header-inner › header-inner(이하 동일, 숫자 안 붙임).
     맥락 없는(scope=null) 컨테이너·형제는 사다리를 타지 않고 그대로 container.
   - 제외: Component/ComponentSet · Text · Instance · 잠긴 레이어.
   ============================================================ */
import { isDefaultName, isTokenEchoName, parseTokenName, layerNameFromRole, pickScope, kebab } from './naming';
import type { ParsedToken } from './naming';
import type { RenameChange } from '../shared/messages';

/** 자식에게 내려보내는 위치 정보(영역 추론용). depth 0 = 선택 루트. */
interface Pos {
  index: number;
  total: number;
  parentLayout: 'vertical' | 'horizontal' | null;
  depth: number;
  /** 같은 맥락(scope) 컨테이너 중첩 단계 — container→content→inner 사다리 인덱스. */
  ladder: number;
}

interface Opts {
  apply: boolean;
  maxDepth: number;
}

export interface RenameOutcome {
  changes: RenameChange[];
  applied: boolean;
}

export async function renameSelection(
  selection: readonly SceneNode[],
  opts: Opts,
): Promise<RenameOutcome> {
  const changes: RenameChange[] = [];
  await recurse(selection, null, opts, changes, 0, null, 0);
  return { changes, applied: opts.apply };
}

async function recurse(
  nodes: readonly SceneNode[],
  ancestorName: string | null,
  opts: Opts,
  out: RenameChange[],
  depth: number,
  parentLayout: Pos['parentLayout'],
  ladder: number,
): Promise<void> {
  const total = nodes.length;
  for (let i = 0; i < total; i++) {
    const node = nodes[i];
    const pos: Pos = { index: i, total, parentLayout, depth, ladder };
    const decided = await decide(node, ancestorName, pos, opts);
    let contextForChildren = node.name;

    if (!decided.skip && decided.name) {
      // 숫자 접미사 없음 — 형제가 같은 이름이어도 그대로(Figma는 중복 이름 허용).
      if (decided.name !== node.name) {
        out.push({ id: node.id, before: node.name, after: decided.name });
        if (opts.apply) node.name = decided.name;
      }
      contextForChildren = decided.name;
    }

    if ('children' in node) {
      await recurse(node.children, contextForChildren, opts, out, depth + 1, layoutOf(node), decided.childLadder);
    }
  }
}

/* ---------- 중첩 구조 사다리: 같은 맥락이 깊어질수록 단계어 교체 ---------- */
/** 사다리 단계어(숫자 없음). 0=container/wrapper 유지, 1=content, 2↑=inner(중복 허용). */
const LADDER_WORDS = ['', 'content', 'inner'] as const;

/** 사다리 깊이 → 구조 단계어. 0은 호출부에서 기본 역할(container/wrapper) 유지. */
function ladderWord(ladder: number): string {
  if (ladder <= 0) return '';
  return LADDER_WORDS[Math.min(ladder, LADDER_WORDS.length - 1)];
}

/**
 * 자식에게 내려줄 사다리 단계 — 같은 맥락(scope)이 이어지면 +1, 새 맥락이 생기면 1,
 * 맥락이 없으면 0(사다리 리셋). childScope는 이 노드 이름에서 뽑은 맥락 1단계.
 */
function nextLadder(thisNodeScope: string | null, effectiveName: string, parentLadder: number): number {
  const childScope = pickScope(effectiveName);
  if (childScope === null) return 0;
  if (childScope === thisNodeScope) return parentLadder + 1;
  return 1;
}

async function decide(
  node: SceneNode,
  ancestorName: string | null,
  pos: Pos,
  opts: Opts,
): Promise<{ skip: boolean; name?: string; childLadder: number }> {
  // 보존/제외 노드: 이름은 유지하되, 자식 사다리는 이 노드 이름의 맥락 연속성으로 계산.
  const inheritedScope = ancestorName ? pickScope(ancestorName) : null;
  const keep = () => ({ skip: true, childLadder: nextLadder(inheritedScope, node.name, pos.ladder) });

  // 제외 규칙(이름 유지 · 자기 이름을 자식 맥락으로 전달)
  if (node.type === 'COMPONENT' || node.type === 'COMPONENT_SET') return keep();
  if (node.type === 'TEXT') return keep();
  if (node.type === 'INSTANCE') return keep();
  if (node.locked) return keep();

  // 보존형: 사람이 지은 의미 있는 이름은 그대로 두고 맥락으로만 쓴다.
  // 단, Figma 기본명과 구 리네임이 남긴 토큰 베낌 이름(color-121210 등)은 교체.
  if (!isDefaultName(node.name) && !isTokenEchoName(node.name)) return keep();

  const token = await primaryToken(node);
  let role = resolveRole(node, token, pos);
  // 중첩 구조 사다리: 같은 맥락의 generic 구조 역할(container/wrapper)이 깊어지면 content→inner로.
  if ((role === 'container' || role === 'wrapper') && pos.ladder > 0) role = ladderWord(pos.ladder);
  // 맥락: 바로 위 의미 있는 이름에서 깨끗한 1단계 → 없으면 토큰 경로 접두사에서.
  let scope = inheritedScope ?? (token?.context ? pickScope(token.context) : null);
  if (scope === role) scope = null; // 맥락==역할이면 중복 제거(button-button 방지)
  const name = layerNameFromRole(scope, role, { maxDepth: opts.maxDepth });
  return { skip: false, name, childLadder: nextLadder(scope, name, pos.ladder) };
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
