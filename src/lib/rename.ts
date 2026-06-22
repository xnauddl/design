/* ============================================================
   rename.ts — 레이어를 "역할(role)"에 맞게 정돈 (naming.ts 규칙 사용)
   원칙: 역할이 이름을 정한다. 토큰은 신호로만 쓰고 경로를 복사하지 않는다.
   - 보존형: Figma 기본명(Frame 12·Rectangle·Vector…)만 교체, 사람이 지은
     의미 있는 이름은 보존하고 자식의 맥락(context)으로만 사용.
   - 역할 판정: 토큰 말단(신호) → 노드 타입/기하(채움·외곽선·얇음·이미지) 순.
   - 맥락: 가장 가까운 의미 있는 조상 이름 → (없으면) 토큰 경로 접두사.
   - 제외: Component/ComponentSet · Text · Instance · 잠긴 레이어.
   ============================================================ */
import { isDefaultName, isTokenEchoName, parseTokenName, layerNameFromRole, dedupeName, kebab } from './naming';
import type { ParsedToken } from './naming';
import type { RenameChange } from '../shared/messages';

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
  await recurse(selection, null, opts, changes);
  return { changes, applied: opts.apply };
}

async function recurse(
  nodes: readonly SceneNode[],
  ancestorName: string | null,
  opts: Opts,
  out: RenameChange[],
): Promise<void> {
  const taken = new Set<string>();
  for (const node of nodes) {
    const decided = await decide(node, ancestorName, opts);
    let contextForChildren = node.name;

    if (!decided.skip && decided.name) {
      const finalName = dedupeName(decided.name, taken);
      if (finalName !== node.name) {
        out.push({ id: node.id, before: node.name, after: finalName });
        if (opts.apply) node.name = finalName;
      }
      contextForChildren = finalName;
    } else {
      taken.add(node.name); // 보존·제외된 이름도 형제 충돌 방지용으로 예약
    }

    if ('children' in node) await recurse(node.children, contextForChildren, opts, out);
  }
}

async function decide(
  node: SceneNode,
  ancestorName: string | null,
  opts: Opts,
): Promise<{ skip: boolean; name?: string }> {
  // 제외 규칙(이름 유지 · 자기 이름을 자식 맥락으로 전달)
  if (node.type === 'COMPONENT' || node.type === 'COMPONENT_SET') return { skip: true };
  if (node.type === 'TEXT') return { skip: true };
  if (node.type === 'INSTANCE') return { skip: true };
  if (node.locked) return { skip: true };

  // 보존형: 사람이 지은 의미 있는 이름은 그대로 두고 맥락으로만 쓴다.
  // 단, Figma 기본명과 구 리네임이 남긴 토큰 베낌 이름(color-121210 등)은 교체.
  if (!isDefaultName(node.name) && !isTokenEchoName(node.name)) return { skip: true };

  const token = await primaryToken(node);
  const role = resolveRole(node, token);
  // 맥락: 의미 있는 조상 이름 우선, 없으면 토큰 경로 접두사.
  const ctx = ancestorName ?? token?.context ?? null;
  return { skip: false, name: layerNameFromRole(ctx, role, { maxDepth: opts.maxDepth }) };
}

/* ---------- 역할 판정: 토큰 신호 → 타입/기하 ---------- */
function resolveRole(node: SceneNode, token: ParsedToken | null): string {
  if (token?.roleLeaf) return token.roleLeaf; // 토큰 말단이 역할이면 그것이 1순위 신호

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
    case 'SECTION':
      return 'children' in node && node.children.length === 1 ? 'wrapper' : 'container';
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

function hasVisibleStroke(node: SceneNode): boolean {
  const s = paints(node, 'strokes');
  return !!s && s.some((p) => p.visible !== false);
}
