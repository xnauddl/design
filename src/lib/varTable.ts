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
  | { kind: 'alias'; aliasId: string; aliasName: string; /** 라이브러리(다른 파일) 변수를 가리킴 */ remote?: boolean };

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
  /** 피그마 기본 모드 — 고른 모드가 없는 컬렉션은 이 값을 보여 준다(§4.4 모드 ▾). */
  defaultModeId?: string;
  /** 계층 지정 상태: 직접 지정('global'…·'none') / 지정 없음(null — 이름으로 판정하거나 "?"). */
  tierSet?: 'global' | 'semantic' | 'component' | 'none' | null;
}

/** 라이브러리(다른 파일) 변수 — 이 파일이 쓰는 것만. 읽기 전용(§4.4 LIB 구역). */
export interface LibraryVar {
  id: string;
  name: string;
  collection: string;
  type: VarType;
  /** 라이브러리 기본 모드의 값(별칭이면 가리키는 이름). 못 읽으면 없음. */
  value?: VarCell;
  /** 모든 모드에서 별칭으로 가리키는 변수 id(간접 사용 판정). */
  aliasTargets: string[];
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

/* =====================================================================
   IA v3 변수 목록(§4.4) — 구역(컬렉션) · 그룹 · 행과 펼침 규칙. 순수 함수라 단위 테스트한다.
   ===================================================================== */

/** 계층 배지 — 계층이면 G/S/C, "계층 아님"으로 지정했으면 "–", 정해지지 않았으면 "?". */
export function tierBadge(c: Pick<VarCollection, 'tier' | 'tierSet'>): 'G' | 'S' | 'C' | '–' | '?' {
  if (c.tier === 1) return 'G';
  if (c.tier === 2) return 'S';
  if (c.tier === 3) return 'C';
  return c.tierSet === 'none' ? '–' : '?';
}

/** 칩·구역 순서 — Component → Semantic → Global → 계층 없음. 같은 계층 안은 피그마 순서(안정 정렬). */
export function orderCollections<T extends Pick<VarCollection, 'tier'>>(cols: readonly T[]): T[] {
  const rank = (t: number): number => (t === 3 ? 0 : t === 2 ? 1 : t === 1 ? 2 : 3);
  return cols.map((c, i) => ({ c, i })).sort((a, b) => rank(a.c.tier) - rank(b.c.tier) || a.i - b.i).map((x) => x.c);
}

/** 그룹 이름 — 이름에 "/"가 없으면 "(그룹 없음)". 그룹 키는 컬렉션 + 경로. */
export const NO_GROUP = '(그룹 없음)';
export function groupKey(collectionId: string, name: string): string {
  return `${collectionId}|${groupPath(name)}`;
}

/** 검색 — 전체 경로에 검색어가 들어 있으면 맞는다. 대소문자 무시. 값·별칭 대상은 보지 않는다. */
export function matchesQuery(name: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  return !q || name.toLowerCase().includes(q);
}

/**
 * 간접 사용 — 직접 쓰는 변수가 별칭으로 가리키는 변수들. 모든 모드를 보고 최대 5단계.
 * 결과: 간접 변수 id → 그 변수를 가리키는(통로가 된) 직접 사용 변수 id들. 직접과 겹치면 직접으로 센다(빠진다).
 */
export function indirectUsage(direct: ReadonlySet<string>, aliasTargets: ReadonlyMap<string, readonly string[]>, maxDepth = 5): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const start of direct) {
    let frontier = [start];
    const seen = new Set([start]);
    for (let d = 0; d < maxDepth && frontier.length; d++) {
      const next: string[] = [];
      for (const id of frontier) {
        for (const t of aliasTargets.get(id) ?? []) {
          if (seen.has(t)) continue;
          seen.add(t);
          next.push(t);
          if (!direct.has(t)) {
            const via = out.get(t) ?? [];
            if (!via.includes(start)) via.push(start);
            out.set(t, via);
          }
        }
      }
      frontier = next;
    }
  }
  return out;
}

/** 로컬 변수의 별칭 대상(모든 모드) — indirectUsage 입력. */
export function aliasTargetsOf(vars: readonly VarRow[]): Map<string, string[]> {
  const m = new Map<string, string[]>();
  for (const v of vars) {
    const ids = Object.values(v.values).filter((c): c is Extract<VarCell, { kind: 'alias' }> => c.kind === 'alias').map((c) => c.aliasId);
    if (ids.length) m.set(v.id, [...new Set(ids)]);
  }
  return m;
}

export type RowState = 'direct' | 'indirect' | 'unused' | 'none';

export type ListEntry =
  | { kind: 'section'; collection: VarCollection; used: number; total: number }
  | { kind: 'group'; key: string; collectionId: string; path: string; label: string; used: number; total: number; expanded: boolean; unused: number; showingUnused: boolean }
  | { kind: 'row'; v: VarRow; state: RowState; groupKey: string }
  | { kind: 'unusedGroups'; collectionId: string; count: number };

export interface ListInput {
  collections: readonly VarCollection[];
  vars: readonly VarRow[];
  /** 'all' 또는 컬렉션 id */
  chip: string;
  query: string;
  /** 직접 사용 변수 id → 곳. null = 사용 판정 없음(선택 없음 · 아직 안 읽음). */
  direct: ReadonlyMap<string, number> | null;
  /** 간접 사용 변수 id(직접 제외). */
  indirect: ReadonlySet<string>;
  /** 사용자가 직접 펼치거나(true) 접은(false) 그룹. */
  userExpanded: ReadonlyMap<string, boolean>;
  /** "+n 안 씀"을 펼친 그룹. */
  showUnusedIn: ReadonlySet<string>;
  /** "안 쓰는 그룹 n개"를 펼친 구역(컬렉션 id). */
  showUnusedGroups: ReadonlySet<string>;
}

/**
 * 목록 줄 — 구역 머리 → 그룹 머리 → 행 → (구역 끝) "안 쓰는 그룹 n개".
 * 펼침 규칙(§4.4):
 *  - 사용 판정이 있으면: 쓰는(직접·간접) 그룹은 펼치고 쓰는 행만. 안 쓰는 그룹은 구역 끝 한 줄로 모은다.
 *  - 없으면: 지금 칩에 보이는 그룹이 10개 이하면 모두 펼치고, 넘으면 모두 접는다.
 *  - 직접 펼치거나 접은 그룹은 그 기억을 따른다(사용 판정이 있을 때는 쓰는 그룹과, 펼쳐 보인 안 쓰는 그룹에).
 *  - 검색어가 있으면 접힘과 "쓰는 것만"을 무시하고 맞는 행을 모두 보인다.
 */
export function buildList(inp: ListInput): ListEntry[] {
  const known = inp.direct !== null;
  const searching = inp.query.trim() !== '';
  const cols = orderCollections(inp.collections).filter((c) => inp.chip === 'all' || c.id === inp.chip);
  const stateOf = (v: VarRow): RowState =>
    !known ? 'none' : (inp.direct!.get(v.id) ?? 0) > 0 ? 'direct' : inp.indirect.has(v.id) ? 'indirect' : 'unused';
  // 그룹 모으기(컬렉션별, 첫 등장 순서)
  type G = { key: string; path: string; rows: VarRow[] };
  const byCol = new Map<string, G[]>();
  for (const c of cols) byCol.set(c.id, []);
  const idx = new Map<string, G>();
  for (const v of inp.vars) {
    const list = byCol.get(v.collectionId);
    if (!list) continue;
    if (searching && !matchesQuery(v.name, inp.query)) continue;
    const key = groupKey(v.collectionId, v.name);
    let g = idx.get(key);
    if (!g) {
      g = { key, path: groupPath(v.name), rows: [] };
      idx.set(key, g);
      list.push(g);
    }
    g.rows.push(v);
  }
  const groupCount = [...byCol.values()].reduce((n, gs) => n + gs.length, 0);
  const out: ListEntry[] = [];
  for (const c of cols) {
    const groups = byCol.get(c.id) ?? [];
    if (searching && !groups.length) continue;
    const all = inp.vars.filter((v) => v.collectionId === c.id);
    const usedIn = (rows: readonly VarRow[]): number => rows.filter((v) => { const s = stateOf(v); return s === 'direct' || s === 'indirect'; }).length;
    out.push({ kind: 'section', collection: c, used: known ? usedIn(all) : 0, total: all.length });
    const unusedGroups: G[] = [];
    for (const g of groups) {
      const used = usedIn(g.rows);
      const unused = known ? g.rows.length - used : 0;
      const label = g.path || NO_GROUP;
      if (searching) {
        out.push({ kind: 'group', key: g.key, collectionId: c.id, path: g.path, label, used, total: g.rows.length, expanded: true, unused: 0, showingUnused: true });
        for (const v of g.rows) out.push({ kind: 'row', v, state: stateOf(v), groupKey: g.key });
        continue;
      }
      if (known && used === 0) { unusedGroups.push(g); continue; }
      const auto = known ? true : groupCount <= 10;
      const expanded = inp.userExpanded.get(g.key) ?? auto;
      const showingUnused = inp.showUnusedIn.has(g.key);
      out.push({ kind: 'group', key: g.key, collectionId: c.id, path: g.path, label, used, total: g.rows.length, expanded, unused, showingUnused });
      if (!expanded) continue;
      for (const v of g.rows) {
        const st = stateOf(v);
        if (known && st === 'unused' && !showingUnused) continue;
        out.push({ kind: 'row', v, state: st, groupKey: g.key });
      }
    }
    if (unusedGroups.length) {
      if (inp.showUnusedGroups.has(c.id)) {
        for (const g of unusedGroups) {
          const expanded = inp.userExpanded.get(g.key) ?? false;
          out.push({ kind: 'group', key: g.key, collectionId: c.id, path: g.path, label: g.path || NO_GROUP, used: 0, total: g.rows.length, expanded, unused: g.rows.length, showingUnused: true });
          if (expanded) for (const v of g.rows) out.push({ kind: 'row', v, state: 'unused', groupKey: g.key });
        }
      } else out.push({ kind: 'unusedGroups', collectionId: c.id, count: unusedGroups.length });
    }
  }
  return out;
}
