/* ============================================================
   varTable.ts — 변수 관리 화면(Figma Variables 표를 닮은 목록)의 순수 로직 (figma 의존 없음)
   - 이름의 `/`로 그룹을 나눈다(Figma Variables 사이드바와 같은 규칙: 마지막 토막이 변수 이름).
   - 왼쪽 트리(컬렉션 → 그룹)와 오른쪽 표(그룹 머리 + 행)를 만들 데이터, 필터, 복사 문자열.
   ============================================================ */

export type VarType = 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN';

/** 한 모드의 값 표시. 별칭은 가리키는 변수 이름(그 변수가 이 파일에 없으면 aliasId만). */
export type VarCell =
  | { kind: 'color'; hex: string }
  | { kind: 'number'; text: string }
  | { kind: 'string'; text: string }
  | { kind: 'bool'; text: string }
  | { kind: 'alias'; aliasId: string; aliasName: string };

export interface VarRow {
  id: string;
  name: string;
  collectionId: string;
  type: VarType;
  /** modeId → 값 */
  values: Record<string, VarCell>;
  scopes: string[];
  description: string;
}

export interface VarCollection {
  id: string;
  name: string;
  /** 계층(1 Global · 2 Semantic · 3 Component · 0 계층 아님) */
  tier: number;
  modes: { modeId: string; name: string }[];
}

/** 이름의 그룹 경로(마지막 토막 앞부분). `color/background/default` → `color/background`. 그룹 없으면 ''. */
export function groupPath(name: string): string {
  const i = name.lastIndexOf('/');
  return i < 0 ? '' : name.slice(0, i);
}
/** 이름의 마지막 토막(표에 보이는 이름). */
export function leafName(name: string): string {
  const i = name.lastIndexOf('/');
  return i < 0 ? name : name.slice(i + 1);
}

/** 트리 노드 — 컬렉션(path='') 또는 그룹(path='color/background'). */
export interface TreeNode {
  collectionId: string;
  path: string;
  label: string;
  depth: number;
  /** 이 노드(하위 포함)에 속한 표시 대상 변수 수 */
  count: number;
  children: TreeNode[];
}

/**
 * 왼쪽 트리 — 컬렉션마다 그룹 경로를 토막별로 펼친 나무. include를 통과한 변수만 센다.
 * 변수가 하나도 안 남은 그룹은 빼고, 컬렉션은 0이어도 남긴다(어디에 무엇이 없는지도 정보다).
 */
export function buildVarTree(cols: readonly VarCollection[], vars: readonly VarRow[], include: (v: VarRow) => boolean): TreeNode[] {
  const out: TreeNode[] = [];
  for (const c of cols) {
    const root: TreeNode = { collectionId: c.id, path: '', label: c.name, depth: 0, count: 0, children: [] };
    const index = new Map<string, TreeNode>([['', root]]);
    for (const v of vars) {
      if (v.collectionId !== c.id || !include(v)) continue;
      root.count++;
      const parts = groupPath(v.name).split('/').filter(Boolean);
      let parent = root;
      let path = '';
      parts.forEach((p, i) => {
        path = path ? `${path}/${p}` : p;
        let node = index.get(path);
        if (!node) {
          node = { collectionId: c.id, path, label: p, depth: i + 1, count: 0, children: [] };
          index.set(path, node);
          parent.children.push(node);
        }
        node.count++;
        parent = node;
      });
    }
    out.push(root);
  }
  return out;
}

export interface VarFilter {
  collectionId: string;
  /** 그룹 경로 — 이 경로 또는 그 하위만. '' = 컬렉션 전체 */
  path: string;
  /** 이름 검색(대소문자 무시 부분 일치) */
  query: string;
  /** 선택에서 쓰는 것만 — usage에 1 이상인 변수 */
  onlyUsed: boolean;
}

export function inPath(name: string, path: string): boolean {
  if (!path) return true;
  const g = groupPath(name);
  return g === path || g.startsWith(path + '/');
}

/** 표에 보일 변수 — 순서는 들어온 순서(Figma와 같게 컬렉션 안 정의 순서). */
export function filterVars(vars: readonly VarRow[], f: VarFilter, usage: ReadonlyMap<string, number>): VarRow[] {
  const q = f.query.trim().toLowerCase();
  return vars.filter(
    (v) =>
      v.collectionId === f.collectionId &&
      inPath(v.name, f.path) &&
      (!q || v.name.toLowerCase().includes(q)) &&
      (!f.onlyUsed || (usage.get(v.id) ?? 0) > 0),
  );
}

/** 표의 그룹 머리 + 행. 그룹 경로가 같은 변수끼리 첫 등장 순서대로 묶는다. */
export function groupRows(rows: readonly VarRow[]): { path: string; rows: VarRow[] }[] {
  const out: { path: string; rows: VarRow[] }[] = [];
  const idx = new Map<string, { path: string; rows: VarRow[] }>();
  for (const r of rows) {
    const p = groupPath(r.name);
    let g = idx.get(p);
    if (!g) {
      g = { path: p, rows: [] };
      idx.set(p, g);
      out.push(g);
    }
    g.rows.push(r);
  }
  return out;
}

/** 값 복사 문자열 — 색은 대문자 hex, 별칭은 가리키는 변수 이름. */
export function cellCopyText(cell: VarCell | undefined): string {
  if (!cell) return '';
  switch (cell.kind) {
    case 'color':
      return cell.hex.toUpperCase();
    case 'alias':
      return cell.aliasName;
    default:
      return cell.text;
  }
}

/** 처음 보여줄 컬렉션 — 표시 대상이 있는 첫 컬렉션, 없으면 첫 컬렉션. */
export function pickInitialCollection(tree: readonly TreeNode[]): string | null {
  return (tree.find((n) => n.count > 0) ?? tree[0])?.collectionId ?? null;
}
