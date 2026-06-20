/* ============================================================
   rename.ts — 레이어 리네임 (naming.ts 규칙 사용)
   제외: Component/ComponentSet · Text · Instance(기본) · 잠긴 레이어.
   토큰 보유 → 변수 전체 경로, 없으면 역할/해부학 + 상위 맥락.
   ============================================================ */
import { layerNameFromToken, layerNameFromRole, dedupeName, kebab } from './naming';
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
      taken.add(node.name); // 스킵된 이름도 충돌 방지용으로 예약
    }

    if ('children' in node) await recurse(node.children, contextForChildren, opts, out);
  }
}

async function decide(
  node: SceneNode,
  ancestorName: string | null,
  opts: Opts,
): Promise<{ skip: boolean; name?: string }> {
  // 제외 규칙
  if (node.type === 'COMPONENT' || node.type === 'COMPONENT_SET') return { skip: true };
  if (node.type === 'TEXT') return { skip: true };
  if (node.type === 'INSTANCE') return { skip: true };
  if (node.locked) return { skip: true };

  const tokenName = await primaryTokenName(node);
  if (tokenName) {
    return { skip: false, name: layerNameFromToken(tokenName, { maxDepth: opts.maxDepth }) };
  }
  const role = inferRole(node);
  return { skip: false, name: layerNameFromRole(ancestorName, role, { maxDepth: opts.maxDepth }) };
}

/* ---------- 주(主) 바인딩 토큰 이름 ---------- */
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

async function primaryTokenName(node: SceneNode): Promise<string | null> {
  const bv = (node as { boundVariables?: Record<string, unknown> }).boundVariables;
  if (!bv) return null;
  for (const field of FIELD_ORDER) {
    const id = firstAliasId(bv[field]);
    if (id) {
      const v = await figma.variables.getVariableByIdAsync(id);
      if (v) return v.name;
    }
  }
  return null;
}

function firstAliasId(entry: unknown): string | undefined {
  if (!entry) return undefined;
  if (Array.isArray(entry)) return (entry[0] as VariableAlias | undefined)?.id;
  return (entry as VariableAlias).id;
}

/* ---------- 역할/해부학 추론(비텍스트) ---------- */
function inferRole(node: SceneNode): string {
  switch (node.type) {
    case 'VECTOR':
    case 'BOOLEAN_OPERATION':
    case 'STAR':
    case 'POLYGON':
    case 'LINE':
      return 'icon';
    case 'FRAME':
    case 'GROUP':
    case 'SECTION':
      return 'container';
    case 'RECTANGLE':
    case 'ELLIPSE':
      return hasVisibleFill(node) ? 'background' : 'shape';
    default:
      return kebab(node.type);
  }
}

function hasVisibleFill(node: SceneNode): boolean {
  if (!('fills' in node)) return false;
  const fills = (node as { fills: Paint[] | typeof figma.mixed }).fills;
  return Array.isArray(fills) && fills.some((p) => p.visible !== false);
}
