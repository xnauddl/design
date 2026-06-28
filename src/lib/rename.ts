/* ============================================================
   rename.ts — 레이어 리네임 (naming.ts 규칙 사용)
   제외: Component/ComponentSet · Text · Instance(기본) · 잠긴 레이어.
   토큰 보유 → 변수 전체 경로, 없으면 역할/해부학 + 상위 맥락.
   ============================================================ */
import { layerNameFromToken, layerNameFromRole, dedupeName, type Role } from './naming';
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

    // 인스턴스 내부 레이어는 이름이 메인 컴포넌트에서 파생되어 변경 불가(Figma가 throw)
    // → 서브트리를 순회하지 않는다. (인스턴스 자체는 decide()에서 이미 skip.)
    if ('children' in node && node.type !== 'INSTANCE') {
      await recurse(node.children, contextForChildren, opts, out);
    }
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

/* ---------- 주(主) 바인딩 토큰 이름 ----------
   bind.ts가 바인딩하는 모든 스칼라 필드를 포괄: 네 corner·네 padding 전부.
   (텍스트 필드는 TEXT 노드가 decide()에서 제외되므로 생략, 효과 색은 아래 별도 처리.) */
const FIELD_ORDER = [
  'fills',
  'strokes',
  'width',
  'height',
  'topLeftRadius',
  'topRightRadius',
  'bottomLeftRadius',
  'bottomRightRadius',
  'itemSpacing',
  'paddingLeft',
  'paddingRight',
  'paddingTop',
  'paddingBottom',
] as const;

async function primaryTokenName(node: SceneNode): Promise<string | null> {
  const bv = (node as { boundVariables?: Record<string, unknown> }).boundVariables;
  if (bv) {
    for (const field of FIELD_ORDER) {
      const id = firstAliasId(bv[field]);
      if (id) {
        const v = await figma.variables.getVariableByIdAsync(id);
        if (v) return v.name;
      }
    }
  }
  // 효과(그림자) 색 바인딩은 node.boundVariables가 아니라 각 effect에 보관됨 → 별도 확인.
  const effects = (node as { effects?: readonly Effect[] }).effects;
  if (Array.isArray(effects)) {
    for (const e of effects) {
      const id = firstAliasId((e as { boundVariables?: Record<string, unknown> }).boundVariables?.color);
      if (id) {
        const v = await figma.variables.getVariableByIdAsync(id);
        if (v) return v.name;
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

/* ---------- 역할/해부학 추론(비텍스트) ----------
   반환은 항상 ROLE_VOCAB의 멤버(Role) — 어휘 밖 이름이 새지 않도록 타입으로 강제. */
function inferRole(node: SceneNode): Role {
  switch (node.type) {
    case 'VECTOR':
    case 'BOOLEAN_OPERATION':
    case 'STAR':
    case 'POLYGON':
      return 'icon';
    case 'LINE':
      return 'divider'; // 선은 구분선으로 본다(아이콘 아님)
    case 'FRAME':
    case 'GROUP':
    case 'SECTION':
      return 'container';
    case 'RECTANGLE':
    case 'ELLIPSE':
      if (hasImageFill(node)) return 'image';
      if (hasVisibleFill(node)) return 'background';
      if (hasVisibleStroke(node)) return 'border';
      return 'shape';
    default:
      return 'shape'; // 기타 노드는 어휘 내 중립값으로(이전: kebab(type) → 어휘 밖)
  }
}

/** 노드의 visible 페인트 배열(없거나 mixed면 빈 배열). */
function visiblePaints(node: SceneNode, key: 'fills' | 'strokes'): Paint[] {
  if (!(key in node)) return [];
  const p = (node as unknown as Record<string, Paint[] | typeof figma.mixed>)[key];
  return Array.isArray(p) ? p.filter((x) => x.visible !== false) : [];
}
function hasVisibleFill(node: SceneNode): boolean {
  return visiblePaints(node, 'fills').length > 0;
}
function hasImageFill(node: SceneNode): boolean {
  return visiblePaints(node, 'fills').some((p) => p.type === 'IMAGE');
}
function hasVisibleStroke(node: SceneNode): boolean {
  return visiblePaints(node, 'strokes').length > 0;
}
