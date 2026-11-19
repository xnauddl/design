/* ============================================================
   unusedVars.ts — 안 쓰는 변수 찾기(docs/unused-vars.md)
   - 판정(순수): 뿌리(레이어 · 스타일 · 프로토타입 · 컴포넌트 속성 정의가 붙인 변수) + 별칭 그래프(모든 모드) → none · chain
   - 수집(figma): 모든 페이지를 직접 스택으로 돌며(숨김 · 인스턴스 안쪽 포함) 별칭 객체 · variableId를 깊이 훑는다
   ============================================================ */

export type UnusedKind = 'none' | 'chain';

export interface VarNode {
  id: string;
  /** 모든 모드에서 이 변수가 가리키는 로컬 변수 id들(별칭 대상). */
  targets: readonly string[];
}

/**
 * §2 판정. used = 뿌리에서 별칭을 따라 닿는 변수(순환 안전). 나머지 로컬 변수 중
 * 어떤 변수도 가리키지 않으면 none, 가리키는 변수가 있으면(모두 안 쓰임) chain.
 */
export function judgeUnused(vars: readonly VarNode[], roots: ReadonlySet<string>): Map<string, UnusedKind> {
  const byId = new Map(vars.map((v) => [v.id, v]));
  const used = new Set<string>();
  const stack = [...roots].filter((id) => byId.has(id));
  while (stack.length) {
    const id = stack.pop() as string;
    if (used.has(id)) continue;
    used.add(id);
    for (const t of byId.get(id)?.targets ?? []) if (byId.has(t) && !used.has(t)) stack.push(t);
  }
  const pointed = new Set<string>();
  for (const v of vars) for (const t of v.targets) if (t !== v.id) pointed.add(t);
  const out = new Map<string, UnusedKind>();
  for (const v of vars) if (!used.has(v.id)) out.set(v.id, pointed.has(v.id) ? 'chain' : 'none');
  return out;
}

/** 값 안의 모든 변수 별칭 id · variableId를 깊이 우선으로 모은다(배열 · 객체 전부, 순환 안전). */
export function collectAliasIds(value: unknown, into: Set<string>, seen: Set<object> = new Set()): void {
  if (!value || typeof value !== 'object') return;
  if (seen.has(value as object)) return;
  seen.add(value as object);
  if (Array.isArray(value)) {
    for (const x of value) collectAliasIds(x, into, seen);
    return;
  }
  const o = value as Record<string, unknown>;
  if (o.type === 'VARIABLE_ALIAS' && typeof o.id === 'string') into.add(o.id);
  if (typeof o.variableId === 'string') into.add(o.variableId);
  for (const k of Object.keys(o)) {
    let v: unknown;
    try {
      v = o[k];
    } catch {
      continue; // 피그마 게터가 던지는 속성(세트 안 베리언트의 정의 등)
    }
    if (v && typeof v === 'object') collectAliasIds(v, into, seen);
  }
}

/** 레이어에서 훑는 속성(§2-1). 글자 구간 연결은 boundVariables 안에 있다. */
const NODE_PROPS = ['boundVariables', 'fills', 'strokes', 'effects', 'layoutGrids', 'reactions', 'componentProperties'] as const;

function readProp(node: unknown, key: string): unknown {
  try {
    const v = (node as Record<string, unknown>)[key];
    return typeof v === 'symbol' ? undefined : v; // figma.mixed
  } catch {
    return undefined;
  }
}

/** 한 레이어의 뿌리 변수 id들(§2-1 · 3 · 4). */
export function collectNodeIds(node: SceneNode, into: Set<string>): void {
  for (const k of NODE_PROPS) collectAliasIds(readProp(node, k), into);
  // 컴포넌트 속성 정의 — 세트, 세트 밖 컴포넌트만(세트 안 베리언트는 읽으면 예외)
  const isSet = node.type === 'COMPONENT_SET';
  const isLoneComp = node.type === 'COMPONENT' && (node.parent as BaseNode | null)?.type !== 'COMPONENT_SET';
  if (isSet || isLoneComp) collectAliasIds(readProp(node, 'componentPropertyDefinitions'), into);
}

export interface ScanHooks {
  /** 페이지 단위 진행(done, total). 불러오는 중은 (0, 0). */
  onProgress?: (done: number, total: number) => void;
  /** true면 다음 양보 지점에서 멈춘다. */
  cancelled?: () => boolean;
}

const YIELD_EVERY = 2000;
const yieldNow = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

export interface UnusedScan {
  items: { id: string; kind: UnusedKind }[];
  pages: number;
  layers: number;
  cancelled: boolean;
}

/** 로컬 변수 → 별칭 그래프 노드(모든 모드). */
export function varNodesOf(vars: readonly Variable[]): VarNode[] {
  return vars.map((v) => {
    const t = new Set<string>();
    collectAliasIds(v.valuesByMode, t);
    return { id: v.id, targets: [...t] };
  });
}

/** 파일 전체를 읽어 안 쓰는 로컬 변수를 고른다(§2 · §6). */
export async function scanUnusedVariables(hooks: ScanHooks = {}): Promise<UnusedScan> {
  hooks.onProgress?.(0, 0);
  await figma.loadAllPagesAsync();
  if (hooks.cancelled?.()) return { items: [], pages: 0, layers: 0, cancelled: true };
  const roots = new Set<string>();
  const pages = figma.root.children as readonly PageNode[];
  let layers = 0;
  let sinceYield = 0;
  for (let i = 0; i < pages.length; i++) {
    const stack: SceneNode[] = [...(pages[i].children as readonly SceneNode[])];
    while (stack.length) {
      const n = stack.pop() as SceneNode;
      layers++;
      collectNodeIds(n, roots);
      const kids = readProp(n, 'children');
      if (Array.isArray(kids)) for (const c of kids) stack.push(c as SceneNode);
      if (++sinceYield >= YIELD_EVERY) {
        sinceYield = 0;
        await yieldNow();
        if (hooks.cancelled?.()) return { items: [], pages: i, layers, cancelled: true };
      }
    }
    hooks.onProgress?.(i + 1, pages.length);
    await yieldNow();
    if (hooks.cancelled?.()) return { items: [], pages: i + 1, layers, cancelled: true };
  }
  // 스타일(§2-2)
  const styleLists = await Promise.all([
    figma.getLocalPaintStylesAsync?.() ?? [],
    figma.getLocalTextStylesAsync?.() ?? [],
    figma.getLocalEffectStylesAsync?.() ?? [],
    figma.getLocalGridStylesAsync?.() ?? [],
  ]);
  for (const list of styleLists) {
    for (const st of list as readonly BaseStyle[]) {
      for (const k of ['boundVariables', 'paints', 'effects', 'layoutGrids']) collectAliasIds(readProp(st, k), roots);
    }
  }
  const vars = await figma.variables.getLocalVariablesAsync();
  const kinds = judgeUnused(varNodesOf(vars), roots);
  const items = vars.filter((v) => kinds.has(v.id)).map((v) => ({ id: v.id, kind: kinds.get(v.id) as UnusedKind }));
  return { items, pages: pages.length, layers, cancelled: false };
}

export interface DeleteResult {
  deleted: number;
  skipped: number;
  failed: number;
  cancelled: boolean;
}

/**
 * §4 — 다시 확인(전체 다시 읽기 → K = S − U′) 뒤 S ∩ U′를 하나씩 지운다.
 * 다시 확인이 끝나는 순간이 취소를 보는 마지막 지점이다(지우기 시작 뒤 취소는 무시).
 */
export async function deleteUnusedVariables(ids: readonly string[], hooks: ScanHooks = {}): Promise<DeleteResult> {
  const again = await scanUnusedVariables(hooks);
  if (again.cancelled) return { deleted: 0, skipped: 0, failed: 0, cancelled: true };
  const still = new Set(again.items.map((x) => x.id));
  let deleted = 0;
  let skipped = 0;
  let failed = 0;
  for (const id of new Set(ids)) {
    if (!still.has(id)) {
      skipped++;
      continue;
    }
    try {
      const v = await figma.variables.getVariableByIdAsync(id);
      if (!v) {
        skipped++;
        continue;
      }
      v.remove();
      deleted++;
    } catch {
      failed++;
    }
  }
  return { deleted, skipped, failed, cancelled: false };
}
