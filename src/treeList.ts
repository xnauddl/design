/* ============================================================
   treeList.ts — 트리 목록 그리기(IA v4 §2.7).
   연결 화면 · 만들기 · 이름 정리가 같이 쓴다. 머리 줄 = 접기 · 이름 · "{n}개" · 머리 스위치,
   줄 = 화면마다 내용 · 스위치. `treegrid`, 정지점 1개(줄 자체가 포커스를 받는다).
   ============================================================ */
import type { SwState } from './lib/treeState';

export interface TreeSwitch {
  /** null = 바꿀 수 있는 줄이 없음(끔 모습 · 잠금). */
  state: SwState | null;
  label: string;
  disabled?: boolean;
  onToggle: () => void;
}

export interface TreeItem {
  key: string;
  /** 머리 줄(이름 · 개수) — 아니면 줄. */
  head?: boolean;
  /** 머리 줄: 이름 · 개수. */
  name?: string;
  /** 머리 개수 글("{n}개" · "세는 중…") — 부르는 쪽이 i18n으로 만든다. */
  countText?: string;
  /** 묶음 머리(회색 바탕 — 만들기의 Global · Semantic · 텍스트 스타일). */
  group?: boolean;
  /** 머리 이름을 회색으로(이름 정리의 이름 그대로인 조상). */
  muted?: boolean;
  /** 줄: 내용 칸들(스위치 앞까지, 오른쪽으로 밀 것은 right). */
  cells?: HTMLElement[];
  right?: HTMLElement[];
  /** 끈 줄(칩 · 글자 회색). */
  off?: boolean;
  /** 들여쓰기(px). */
  indent: number;
  sw?: TreeSwitch | null;
  children?: TreeItem[];
  /** Enter · F2 — 머리가 아닌 줄의 자기 동작(이름 고치기). */
  onEdit?: () => void;
  /** 줄 클래스(테스트 · 꾸밈). */
  cls?: string;
  /** 머리 · 접을 수 있는 줄 aria-label 보조. */
  aria?: string;
}

export interface TreeOptions {
  /** 접힌 머리 key — 화면이 가진다(그 화면에 있는 동안 기억). */
  collapsed: Set<string>;
  /** 접기를 바꾼 뒤 다시 그리기(보통 같은 render를 다시 부른다). */
  rerender: () => void;
  expandLabel: string;
  collapseLabel: string;
  /** 잠금(실행 중) — 스위치 · 접기 단추 · 이름 고치기를 막는다. */
  locked?: boolean;
}

interface Flat {
  item: TreeItem;
  parentKey: string | null;
  level: number;
}

const state = new WeakMap<HTMLElement, { flat: Flat[]; opts: TreeOptions }>();

function swEl(sw: TreeSwitch, locked: boolean): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'bv-switch';
  b.setAttribute('role', 'switch');
  b.setAttribute('aria-checked', sw.state === null ? 'false' : String(sw.state));
  b.setAttribute('aria-label', sw.label);
  b.tabIndex = -1;
  const dis = locked || sw.disabled || sw.state === null;
  if (dis) b.setAttribute('aria-disabled', 'true');
  const tr = document.createElement('span');
  tr.className = 'bv-track';
  tr.setAttribute('aria-hidden', 'true');
  b.appendChild(tr);
  b.addEventListener('click', (e) => {
    e.stopPropagation();
    if (b.getAttribute('aria-disabled') === 'true') return;
    sw.onToggle();
  });
  return b;
}

/** 트리를 그린다. 포커스가 트리 안에 있었으면 같은 key 줄로 되돌린다. */
export function renderTree(mount: HTMLElement, items: readonly TreeItem[], opts: TreeOptions): void {
  const active = document.activeElement as HTMLElement | null;
  const hadFocus = !!active && mount.contains(active) && !active.matches('input, textarea');
  const focusKey = hadFocus ? active!.closest<HTMLElement>('[data-tkey]')?.dataset.tkey ?? null : mount.dataset.focusKey ?? null;
  mount.replaceChildren();
  mount.setAttribute('role', 'treegrid');
  const flat: Flat[] = [];
  const walk = (list: readonly TreeItem[], parentKey: string | null, level: number): void => {
    for (const it of list) {
      flat.push({ item: it, parentKey, level });
      const row = document.createElement('div');
      // 트리 머리 줄은 회색 머리 띠(.tr-group — ia-v4 §2.7 · §2.8 B안 ②)
      row.className = `tr ${it.head ? 'tr-head' : 'tr-row'}${it.head || it.group ? ' tr-group' : ''}${it.off ? ' off' : ''}${it.cls ? ' ' + it.cls : ''}`;
      row.setAttribute('role', 'row');
      row.setAttribute('aria-level', String(level + 1));
      row.dataset.tkey = it.key;
      row.tabIndex = -1;
      row.style.paddingLeft = `${it.indent}px`;
      const hasKids = !!it.children?.length;
      const open = hasKids && !opts.collapsed.has(it.key);
      if (hasKids) row.setAttribute('aria-expanded', String(open));
      if (hasKids || it.head) {
        const car = document.createElement('button');
        car.type = 'button';
        car.className = 'tr-car';
        car.tabIndex = -1;
        car.textContent = open ? '▼' : '▶';
        car.setAttribute('aria-label', open ? opts.collapseLabel : opts.expandLabel);
        if (!hasKids) car.style.visibility = 'hidden';
        if (opts.locked) car.setAttribute('aria-disabled', 'true');
        car.addEventListener('click', (e) => {
          e.stopPropagation();
          if (opts.locked || !hasKids) return;
          toggle(it.key);
        });
        row.appendChild(car);
      }
      if (it.head) {
        const nm = document.createElement('span');
        nm.className = `tr-name${it.muted ? ' muted' : ''}`;
        nm.textContent = it.name ?? '';
        const ct = document.createElement('span');
        ct.className = 'tr-cnt';
        ct.textContent = it.countText ?? '';
        row.append(nm, ct);
      } else row.append(...(it.cells ?? []));
      const grow = document.createElement('span');
      grow.className = 'grow';
      row.appendChild(grow);
      if (it.right) row.append(...it.right);
      if (it.sw) row.appendChild(swEl(it.sw, !!opts.locked));
      if (it.aria) row.setAttribute('aria-label', it.aria);
      mount.appendChild(row);
      if (open) walk(it.children!, it.key, level + 1);
    }
  };
  const toggle = (key: string): void => {
    if (opts.collapsed.has(key)) opts.collapsed.delete(key);
    else opts.collapsed.add(key);
    mount.dataset.focusKey = key;
    opts.rerender();
    focusRow(mount, key);
  };
  walk(items, null, 0);
  state.set(mount, { flat, opts });
  const rows = Array.from(mount.querySelectorAll<HTMLElement>('[data-tkey]'));
  const target = (focusKey && rows.find((r) => r.dataset.tkey === focusKey)) || rows[0];
  if (target) target.tabIndex = 0;
  if (hadFocus && target) target.focus({ preventScroll: true });
  if (!mount.dataset.treeKeys) {
    mount.dataset.treeKeys = '1';
    mount.addEventListener('keydown', (e) => onKey(mount, e));
    mount.addEventListener('focusin', (e) => {
      const r = (e.target as HTMLElement).closest<HTMLElement>('[data-tkey]');
      if (!r) return;
      mount.dataset.focusKey = r.dataset.tkey;
      for (const x of Array.from(mount.querySelectorAll<HTMLElement>('[data-tkey]'))) x.tabIndex = x === r ? 0 : -1;
    });
  }
}

/** 그 key 줄에 포커스(없으면 무시). */
export function focusRow(mount: HTMLElement, key: string): void {
  const rows = Array.from(mount.querySelectorAll<HTMLElement>('[data-tkey]'));
  const r = rows.find((x) => x.dataset.tkey === key);
  if (!r) return;
  rows.forEach((x) => (x.tabIndex = x === r ? 0 : -1));
  r.focus({ preventScroll: false });
}

function onKey(mount: HTMLElement, e: KeyboardEvent): void {
  const st = state.get(mount);
  if (!st) return;
  if ((e.target as HTMLElement).matches('input, textarea')) return;
  const rows = Array.from(mount.querySelectorAll<HTMLElement>('[data-tkey]'));
  const cur = (e.target as HTMLElement).closest<HTMLElement>('[data-tkey]');
  if (!cur) return;
  const i = rows.indexOf(cur);
  const f = st.flat.find((x) => x.item.key === cur.dataset.tkey);
  if (!f) return;
  const it = f.item;
  const hasKids = !!it.children?.length;
  const open = hasKids && !st.opts.collapsed.has(it.key);
  const go = (j: number): void => {
    const tg = rows[Math.max(0, Math.min(rows.length - 1, j))];
    if (tg) focusRow(mount, tg.dataset.tkey!);
  };
  const toggleOpen = (): void => {
    if (st.opts.locked) return;
    if (open) st.opts.collapsed.add(it.key);
    else st.opts.collapsed.delete(it.key);
    mount.dataset.focusKey = it.key;
    st.opts.rerender();
    focusRow(mount, it.key);
  };
  switch (e.key) {
    case 'ArrowDown': go(i + 1); break;
    case 'ArrowUp': go(i - 1); break;
    case 'Home': go(0); break;
    case 'End': go(rows.length - 1); break;
    case 'ArrowRight':
      if (!hasKids) return;
      if (open) go(i + 1);
      else toggleOpen();
      break;
    case 'ArrowLeft':
      if (hasKids && open) toggleOpen();
      else if (f.parentKey) focusRow(mount, f.parentKey);
      else return;
      break;
    case 'Enter':
      if (hasKids && (it.head || !it.onEdit)) toggleOpen();
      else if (it.onEdit && !st.opts.locked) it.onEdit();
      else return;
      break;
    case 'F2':
      if (!it.onEdit || st.opts.locked) return;
      it.onEdit();
      break;
    case ' ':
    case 'Spacebar': {
      const sw = cur.querySelector<HTMLButtonElement>(':scope > .bv-switch');
      if (!sw || sw.getAttribute('aria-disabled') === 'true') { e.preventDefault(); return; }
      it.sw?.onToggle();
      break;
    }
    default:
      return;
  }
  e.preventDefault();
}
