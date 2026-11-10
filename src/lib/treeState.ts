/* ============================================================
   treeState.ts — 트리 목록(IA v4 §2.7)의 순수 계산.
   머리 스위치 3상태 · 이름 정리 소속 트리 · 같은 이름 토큰 합치기.
   figma/DOM 의존 없음.
   ============================================================ */
import type { DraftToken } from './tokens';

/** 머리 스위치 모습 — 모두 켬 · 일부 · 모두 끔. */
export type SwState = true | false | 'mixed';

/** 머리 스위치 모습(§2.7) — 잠긴 줄은 빼고 정한다. 바꿀 수 있는 줄이 없으면 null(끔 모습 · 잠금). */
export function headState(rows: readonly { on: boolean; locked?: boolean }[]): SwState | null {
  const free = rows.filter((r) => !r.locked);
  if (!free.length) return null;
  const on = free.filter((r) => r.on).length;
  return on === free.length ? true : on === 0 ? false : 'mixed';
}

/** 머리 스위치를 누른 뒤 줄이 가질 값 — 켬 · 일부 → 모두 끔, 끔 → 모두 켬. */
export function headToggleTarget(state: SwState | null): boolean {
  return state === false;
}

/**
 * 같은 이름의 토큰을 한 토큰으로 합친다(§4.3) — 채움색과 그림자색이 같은 hex면 같은 이름을 받는다.
 * category는 color, sources는 합집합, uses는 같은 이름 · bg면 곳 수를 더함, count는 큰 쪽(같은 레이어가
 * 채움과 그림자를 함께 쓸 수 있어 더하면 부풀려진다 — tokens.ts 기존 합치기와 같은 규칙). 순서는 처음 나온 순서.
 */
export function mergeSameNameTokens(tokens: readonly DraftToken[]): DraftToken[] {
  const out: DraftToken[] = [];
  const byName = new Map<string, DraftToken>();
  for (const t of tokens) {
    const prev = byName.get(t.name);
    if (!prev) {
      const copy: DraftToken = { ...t, sources: [...t.sources], ...(t.uses ? { uses: t.uses.map((u) => ({ ...u })) } : {}) };
      byName.set(t.name, copy);
      out.push(copy);
      continue;
    }
    // 같은 이름은 같은 hex(색 이름 정리) — 합친 토큰은 color로 본다(§4.3).
    if (prev.category === 'effectColor' || prev.category === 'color') prev.category = 'color';
    for (const s of t.sources) if (!prev.sources.includes(s)) prev.sources.push(s);
    if (t.uses?.length) {
      const uses = (prev.uses ??= []);
      for (const u of t.uses) {
        const same = uses.find((x) => x.name === u.name && x.bg === u.bg);
        if (same) same.count += u.count;
        else uses.push({ ...u });
      }
    }
    if (t.count != null) prev.count = Math.max(prev.count ?? 0, t.count);
  }
  return out;
}

/** 이름 정리 미리보기 노드(필요한 필드만). */
export interface RenameTreeNode {
  id: string;
  name: string;
  depth: number;
  parentId: string | null;
  after?: string;
}

/** 이름 정리 소속 트리의 한 줄(§4.4). head = 이름이 그대로인 조상(머리 줄), row = 바꿀 줄. */
export interface RenameTreeItem {
  id: string;
  kind: 'head' | 'row';
  name: string;
  after?: string;
  /** 기준 루트 깊이를 0으로 한 깊이. */
  level: number;
  /** 아래 모든 깊이의 바꿀 줄 id(머리 줄의 개수 · 스위치, 바꿀 줄이면 접기 판단). */
  descendants: string[];
  children: RenameTreeItem[];
}

/**
 * 바꿀 줄과 그 조상만 남긴 소속 트리(트리 순서 = 들어온 순서). 바꿀 줄이 없는 가지는 빠진다.
 * 들어온 순서는 미리보기 노드 순서(깊이 우선)라고 본다.
 */
export function buildRenameTree(nodes: readonly RenameTreeNode[]): RenameTreeItem[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const keep = new Set<string>();
  for (const n of nodes) {
    if (n.after === undefined) continue;
    for (let cur: RenameTreeNode | undefined = n; cur && !keep.has(cur.id); cur = cur.parentId ? byId.get(cur.parentId) : undefined) keep.add(cur.id);
  }
  const kept = nodes.filter((n) => keep.has(n.id));
  if (!kept.length) return [];
  const minDepth = Math.min(...kept.map((n) => n.depth));
  const items = new Map<string, RenameTreeItem>();
  const roots: RenameTreeItem[] = [];
  for (const n of kept) {
    const it: RenameTreeItem = { id: n.id, kind: n.after !== undefined ? 'row' : 'head', name: n.name, ...(n.after !== undefined ? { after: n.after } : {}), level: n.depth - minDepth, descendants: [], children: [] };
    items.set(n.id, it);
    const parent = n.parentId ? items.get(n.parentId) : undefined;
    if (parent) parent.children.push(it);
    else roots.push(it);
  }
  const fill = (it: RenameTreeItem): string[] => {
    const ds: string[] = [];
    for (const c of it.children) {
      if (c.kind === 'row') ds.push(c.id);
      ds.push(...fill(c));
    }
    it.descendants = ds;
    return ds;
  };
  roots.forEach(fill);
  return roots;
}
