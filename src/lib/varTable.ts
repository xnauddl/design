/* ============================================================
   varTable.ts — 변수 관리 화면(Figma Variables 표를 닮은 목록)의 순수 로직 (figma 의존 없음)
   - 이름의 `/`로 그룹을 나눈다(Figma Variables 사이드바와 같은 규칙: 마지막 토막이 변수 이름).
   - 왼쪽 트리(컬렉션 → 그룹)와 오른쪽 표(그룹 머리 + 행)를 만들 데이터, 필터, 복사 문자열.
   ============================================================ */

export type VarType = 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN';

/** 한 모드의 값 표시. 별칭은 가리키는 변수 이름(그 변수가 이 파일에 없으면 aliasId만). */
export type VarCell =
  /** hex는 언제나 6자리(#RRGGBB) — 목록 74px 열·값 복사는 지금처럼 6자리. alpha는 0–1(1/255 단위 반올림), 없으면 1. */
  | { kind: 'color'; hex: string; alpha?: number }
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

/* ============================================================
   결정 B(2026-11-03) — 사이드바(★ Inspect · 컬렉션 › 그룹 · LIB · 삭제된 변수) + 오른쪽 목록
   ============================================================ */

/** 사이드바에서 고른 것. */
export type SideSel =
  | { kind: 'inspect' }
  | { kind: 'col'; id: string }
  | { kind: 'grp'; key: string }
  | { kind: 'lib' }
  | { kind: 'deleted' };

export const sideSelKey = (s: SideSel): string =>
  s.kind === 'col' ? `col:${s.id}` : s.kind === 'grp' ? `grp:${s.key}` : s.kind;

export interface SideCount {
  used: number;
  total: number;
  direct: number;
  indirect: number;
}
export interface SideGroup extends SideCount {
  key: string;
  path: string;
  label: string;
}
export interface SideCollection extends SideCount {
  collection: VarCollection;
  groups: SideGroup[];
}

/** 행 상태 — 사용 판정이 없으면 'none'. */
export function rowState(id: string, direct: ReadonlyMap<string, number> | null, indirect: ReadonlySet<string>): RowState {
  if (!direct) return 'none';
  if ((direct.get(id) ?? 0) > 0) return 'direct';
  if (indirect.has(id)) return 'indirect';
  return 'unused';
}

function countOf(vars: readonly VarRow[], direct: ReadonlyMap<string, number> | null, indirect: ReadonlySet<string>): SideCount {
  let d = 0;
  let i = 0;
  if (direct) for (const v of vars) {
    const s = rowState(v.id, direct, indirect);
    if (s === 'direct') d++;
    else if (s === 'indirect') i++;
  }
  return { used: d + i, total: vars.length, direct: d, indirect: i };
}

/** 사이드바 컬렉션·그룹 — 계층 순서, 그룹은 피그마(변수) 순서의 첫 등장 순. */
export function sidebarCollections(
  cols: readonly VarCollection[],
  vars: readonly VarRow[],
  direct: ReadonlyMap<string, number> | null,
  indirect: ReadonlySet<string>,
): SideCollection[] {
  return orderCollections(cols).map((c) => {
    const cv = vars.filter((v) => v.collectionId === c.id);
    const byKey = new Map<string, VarRow[]>();
    for (const v of cv) {
      const k = groupKey(c.id, v.name);
      const arr = byKey.get(k);
      if (arr) arr.push(v);
      else byKey.set(k, [v]);
    }
    const groups: SideGroup[] = [...byKey.entries()].map(([key, gv]) => {
      const path = groupPath(gv[0].name);
      return { key, path, label: path || NO_GROUP, ...countOf(gv, direct, indirect) };
    });
    return { collection: c, groups, ...countOf(cv, direct, indirect) };
  });
}

/** ★ Inspect 숫자 — 쓰는 로컬 변수 수(라이브러리 제외). */
export function inspectCount(vars: readonly VarRow[], direct: ReadonlyMap<string, number> | null, indirect: ReadonlySet<string>): number {
  return countOf(vars, direct, indirect).used;
}

export type RightEntry = { kind: 'path'; label: string; collectionId: string } | { kind: 'row'; v: VarRow; state: RowState };

/**
 * 오른쪽 목록(§4.4).
 * - inspect: 쓰는 행만, 경로 머리("S Semantic › color/text")로 묶음. 컬렉션 계층 순 → 그룹 → 피그마 순.
 * - col: 모든 행, 그룹마다 경로 머리. 쓰는 행 먼저(그룹 안), 안 쓰는 행 뒤.
 * - grp: 그 그룹의 모든 행(쓰는 행 먼저), 경로 머리 없음.
 * - 검색어가 있으면 고른 항목과 관계없이 모든 로컬 컬렉션에서 맞는 행을 경로 머리로(쓰는 행 먼저).
 */
export function rightEntries(
  sel: SideSel,
  cols: readonly VarCollection[],
  vars: readonly VarRow[],
  direct: ReadonlyMap<string, number> | null,
  indirect: ReadonlySet<string>,
  query = '',
): RightEntry[] {
  const out: RightEntry[] = [];
  const rank = (s: RowState): number => (s === 'direct' || s === 'indirect' ? 0 : 1);
  const pushGroups = (side: SideCollection, filter: (v: VarRow) => boolean, withPath: 'full' | 'path' | 'none', usedOnly: boolean) => {
    const badge = tierBadge(side.collection);
    for (const g of side.groups) {
      const rows = vars
        .filter((v) => v.collectionId === side.collection.id && groupKey(v.collectionId, v.name) === g.key && filter(v))
        .map((v) => ({ v, state: rowState(v.id, direct, indirect) }))
        .filter((r) => !usedOnly || rank(r.state) === 0);
      if (!rows.length) continue;
      rows.sort((a, b) => rank(a.state) - rank(b.state)); // 안정 정렬 — 같은 순위는 피그마 순서
      if (withPath !== 'none') {
        const label = withPath === 'full' ? `${badge} ${side.collection.name} › ${g.label}` : g.label;
        out.push({ kind: 'path', label, collectionId: side.collection.id });
      }
      for (const r of rows) out.push({ kind: 'row', ...r });
    }
  };
  const sides = sidebarCollections(cols, vars, direct, indirect);
  if (query.trim()) {
    for (const side of sides) pushGroups(side, (v) => matchesQuery(v.name, query), 'full', false);
    return out;
  }
  if (sel.kind === 'inspect') {
    if (!direct) return out;
    for (const side of sides) pushGroups(side, () => true, 'full', true);
  } else if (sel.kind === 'col') {
    const side = sides.find((s) => s.collection.id === sel.id);
    if (side) pushGroups(side, () => true, 'path', false);
  } else if (sel.kind === 'grp') {
    const side = sides.find((s) => s.groups.some((g) => g.key === sel.key));
    if (side) pushGroups({ ...side, groups: side.groups.filter((g) => g.key === sel.key) }, () => true, 'none', false);
  }
  return out;
}

/**
 * 처음 고르는 항목(§4.4) — 선택이 있고 사용 수를 읽었으며 쓰는 로컬 변수가 1개 이상이면 ★,
 * 아직 읽는 중이면 ★(읽는 중 빈 상태), 그 밖(선택 없음 · 큰 선택 · 쓰는 변수 0)은 계층 순서의 첫 컬렉션.
 */
export function initialSideSel(
  cols: readonly VarCollection[],
  vars: readonly VarRow[],
  hasBaseline: boolean,
  bigSkipped: boolean,
  direct: ReadonlyMap<string, number> | null,
  indirect: ReadonlySet<string>,
): SideSel {
  const first = orderCollections(cols)[0];
  const fallback: SideSel = first ? { kind: 'col', id: first.id } : { kind: 'inspect' };
  if (!hasBaseline || bigSkipped) return fallback;
  if (!direct) return { kind: 'inspect' }; // 읽는 중 — 사용 수가 오면 다시 정한다
  return inspectCount(vars, direct, indirect) > 0 ? { kind: 'inspect' } : fallback;
}

/** 고른 항목이 사라졌으면 대체 항목(§4.4). 그룹 → 같은 컬렉션 → 처음 규칙. */
export function validSideSel(
  sel: SideSel,
  cols: readonly VarCollection[],
  vars: readonly VarRow[],
  hasLib: boolean,
  hasDeleted: boolean,
  initial: () => SideSel,
): SideSel {
  if (sel.kind === 'inspect') return sel;
  if (sel.kind === 'col') return cols.some((c) => c.id === sel.id) ? sel : initial();
  if (sel.kind === 'grp') {
    if (vars.some((v) => groupKey(v.collectionId, v.name) === sel.key)) return sel;
    const colId = sel.key.slice(0, sel.key.indexOf('|'));
    return cols.some((c) => c.id === colId) ? { kind: 'col', id: colId } : initial();
  }
  if (sel.kind === 'lib') return hasLib ? sel : initial();
  return hasDeleted ? sel : initial();
}

/* ============================================================
   변수 고치기(PR 3.5, §4.4 고치기) — 이름 검사 · 바뀌는 것 줄 재료 · 별칭 후보 · 값으로 적기 · 입력 검사
   ============================================================ */

/** UI → 플러그인 고친 값(UPDATE_VARIABLE). hex는 #RRGGBB, alpha는 0–1. */
export type EditValue =
  | { kind: 'color'; hex: string; alpha: number }
  | { kind: 'number'; value: number }
  | { kind: 'string'; text: string }
  | { kind: 'bool'; value: boolean }
  | { kind: 'alias'; targetId: string };

/** 이름 정리 — 앞뒤 공백과 토막마다 앞뒤 공백을 뗀다(`color/ text` → `color/text`). */
export function normalizeVarName(name: string): string {
  return name.trim().split('/').map((s) => s.trim()).join('/');
}

export type NameError = 'emptySegment' | 'duplicate';
/**
 * 이름 칸 검사(정리한 이름으로). 비었거나 "/" 사이가 빔 → emptySegment.
 * 같은 컬렉션에 같은 이름(대소문자까지 같을 때)인 다른 변수 → duplicate.
 */
export function nameError(name: string, self: Pick<VarRow, 'id' | 'collectionId'>, vars: readonly Pick<VarRow, 'id' | 'name' | 'collectionId'>[]): NameError | null {
  const n = normalizeVarName(name);
  if (!n || n.split('/').some((s) => !s)) return 'emptySegment';
  if (vars.some((v) => v.id !== self.id && v.collectionId === self.collectionId && v.name === n)) return 'duplicate';
  return null;
}

/** 그룹 표시 이름 — 마지막 "/" 앞 경로, 없으면 "(그룹 없음)". */
export const groupLabel = (name: string): string => groupPath(name) || NO_GROUP;

/** 같은 컬렉션의 다른 변수 중 그룹 g(경로)에 드는 것이 있나 — 이름이 `{g}/`로 시작(그룹 없음이면 "/"가 없는 이름). */
function groupHasOthers(g: string, self: Pick<VarRow, 'id' | 'collectionId'>, vars: readonly Pick<VarRow, 'id' | 'name' | 'collectionId'>[]): boolean {
  return vars.some((v) => v.id !== self.id && v.collectionId === self.collectionId && (g ? v.name.startsWith(`${g}/`) : !v.name.includes('/')));
}

export interface GroupMove {
  from: string;
  to: string;
  /** 새 그룹에 다른 변수가 없다 → "(새 그룹)". */
  newGroup: boolean;
  /** 이전 그룹에 다른 변수가 없다 → "· {이전} 그룹은 비어서 사라져요". */
  emptied: boolean;
}
/** 바뀌는 것 줄 — 그룹 이동(그룹이 바뀔 때만, 아니면 null). 이름은 정리한 것으로 본다. */
export function groupMove(oldName: string, newName: string, self: Pick<VarRow, 'id' | 'collectionId'>, vars: readonly Pick<VarRow, 'id' | 'name' | 'collectionId'>[]): GroupMove | null {
  const from = groupPath(oldName);
  const to = groupPath(normalizeVarName(newName));
  if (from === to) return null;
  return { from: from || NO_GROUP, to: to || NO_GROUP, newGroup: !groupHasOthers(to, self, vars), emptied: !groupHasOthers(from, self, vars) };
}

export interface CssRename {
  from: string;
  to: string;
  /** 같은 CSS 이름이 되는 다른 로컬 변수(모든 컬렉션)의 이름 — 경고만. */
  clash?: string;
}
/** 바뀌는 것 줄 — CSS 이름(코드 내보내기와 같은 규칙)이 다를 때만. cssName은 exporters.cssVarName. */
export function cssRename(oldName: string, newName: string, selfId: string, vars: readonly Pick<VarRow, 'id' | 'name'>[], cssName: (n: string) => string): CssRename | null {
  const from = cssName(oldName);
  const to = cssName(normalizeVarName(newName));
  if (from === to) return null;
  const other = vars.find((v) => v.id !== selfId && cssName(v.name) === to);
  return other ? { from, to, clash: other.name } : { from, to };
}

/** 칸 비교 열쇠 — 같은 값이면 같은 문자열. 색은 대문자 hex + 투명도(0–255 정수), 숫자는 읽은 수, 별칭은 대상 id. */
export function cellKey(c: VarCell | EditValue | undefined | null): string {
  if (!c) return '';
  switch (c.kind) {
    case 'color': return `c:${c.hex.toUpperCase()}:${Math.round((c.alpha ?? 1) * 255)}`;
    case 'number': return `n:${Number('value' in c ? c.value : c.text)}`;
    case 'string': return `s:${c.text}`;
    case 'bool': return `b:${'value' in c ? String(c.value) : c.text}`;
    case 'alias': return `a:${'targetId' in c ? c.targetId : c.aliasId}`;
  }
}
/** 같은 값인가(변수 표 칸끼리, 또는 표 칸과 고친 값). 별칭은 대상 id만 본다(대상 이름이 바뀐 것은 이 변수의 변경이 아니다). */
export const sameCell = (a: VarCell | EditValue | undefined | null, b: VarCell | EditValue | undefined | null): boolean => cellKey(a) === cellKey(b);

/** 색 칸 글자 — 불투명이면 #RRGGBB, 투명도가 있으면 #RRGGBBAA. */
export function colorText(hex: string, alpha = 1): string {
  const a = Math.round(alpha * 255);
  return a >= 255 ? hex.toUpperCase() : `${hex.toUpperCase()}${a.toString(16).padStart(2, '0').toUpperCase()}`;
}
/** 색 입력 — #RRGGBB(불투명) 또는 #RRGGBBAA. 앞 "#"는 없어도 된다. 틀리면 null. */
export function parseColorInput(s: string): { hex: string; alpha: number } | null {
  const m = /^#?([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(s.trim());
  if (!m) return null;
  return { hex: `#${m[1].toUpperCase()}`, alpha: m[2] ? Math.round((parseInt(m[2], 16) / 255) * 1e6) / 1e6 : 1 };
}
/** 숫자 입력 — 빈 칸·숫자가 아님 → null. */
export function parseNumberInput(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}
/** 표 칸 → 칸에 보일 글자(값일 때). */
export function cellInputText(c: VarCell | undefined): string {
  if (!c || c.kind === 'alias') return '';
  if (c.kind === 'color') return colorText(c.hex, c.alpha);
  return c.text;
}

/**
 * 값으로 적기 · 견본 색(§4.4 고치기) — 그 모드 줄의 칸에서 시작해, 별칭 대상은 **대상 컬렉션의 기본 모드** 값을 본다.
 * 로컬 별칭만 최대 5단계. 따라갈 수 없으면(라이브러리 · 삭제된 대상 · 더 깊음) null.
 */
export function resolveEditValue(cell: VarCell | undefined, cols: readonly VarCollection[], vars: readonly VarRow[], maxDepth = 5): Exclude<VarCell, { kind: 'alias' }> | null {
  let c = cell;
  for (let d = 0; c && c.kind === 'alias'; d++) {
    if (d >= maxDepth) return null;
    const id = c.aliasId;
    const t = vars.find((v) => v.id === id);
    if (!t) return null;
    const col = cols.find((x) => x.id === t.collectionId);
    c = t.values[col?.defaultModeId ?? col?.modes[0]?.modeId ?? ''];
  }
  return c ?? null;
}

/** 변수 v의 별칭을 어느 모드든 따라가면 target에 닿는가(순환 판정). */
function reaches(fromId: string, targetId: string, vars: readonly VarRow[]): boolean {
  const byId = new Map(vars.map((v) => [v.id, v]));
  const seen = new Set<string>();
  const stack = [fromId];
  while (stack.length) {
    const id = stack.pop()!;
    if (id === targetId) return true;
    if (seen.has(id)) continue;
    seen.add(id);
    const v = byId.get(id);
    if (!v) continue;
    for (const c of Object.values(v.values)) if (c.kind === 'alias') stack.push(c.aliasId);
  }
  return false;
}

export interface AliasCandidateGroup {
  collection: VarCollection;
  /** 경로 머리("G Global › gray"). */
  label: string;
  rows: VarRow[];
}
export interface AliasCandidates {
  /** Global(1) — 후보 없음. */
  global: boolean;
  /** 계층이 없는 컬렉션(0) — 모든 로컬 컬렉션에서. */
  allTiers: boolean;
  groups: AliasCandidateGroup[];
}
/**
 * 별칭 후보(§4.4 고치기) — 같은 타입의 로컬 변수만, 자기 자신과 순환이 생기는 변수는 뺀다.
 * 계층 규칙: Semantic(2)·Component(3)은 계층이 자기보다 낮은(1 이상) 컬렉션, Global(1)은 없음, 계층 없음(0)은 모든 컬렉션.
 * 순서는 사이드바와 같다(계층 순서 → 그룹 첫 등장 → 피그마 순서). query는 전체 경로에 들어 있으면 맞음(대소문자 무시).
 */
export function aliasCandidates(self: VarRow, cols: readonly VarCollection[], vars: readonly VarRow[], query = ''): AliasCandidates {
  const own = cols.find((c) => c.id === self.collectionId);
  const tier = own?.tier ?? 0;
  if (tier === 1) return { global: true, allTiers: false, groups: [] };
  const okCol = (c: VarCollection): boolean => (tier === 0 ? true : c.tier >= 1 && c.tier < tier);
  const groups: AliasCandidateGroup[] = [];
  for (const side of sidebarCollections(cols.filter(okCol), vars, null, new Set())) {
    const badge = tierBadge(side.collection);
    for (const g of side.groups) {
      const rows = vars.filter((v) =>
        v.collectionId === side.collection.id && groupKey(v.collectionId, v.name) === g.key &&
        v.id !== self.id && v.type === self.type && matchesQuery(v.name, query) && !reaches(v.id, self.id, vars));
      if (rows.length) groups.push({ collection: side.collection, label: `${badge} ${side.collection.name} › ${g.label}`, rows });
    }
  }
  return { global: false, allTiers: tier === 0, groups };
}
