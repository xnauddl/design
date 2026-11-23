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
  /** 변수 목록 모양(ia-v4 §2.7 "변수 목록 모양 — TR 뒤") — 연결 · 만들기 · 이름 정리 세 트리만 넘긴다(TR-D12 · TR-P20).
   *  없으면 지금 모양(.tr-group 띠 · ▼/▶ · 들여쓰기 = item.indent) — 안 쓰는 변수 팝업. */
  look?: 'vlike';
  /** vlike: 칩 열 x(트리 왼쪽 끝 기준 — 이름 정리 150 · 연결 88 · 만들기 96, TR-D5). 왼쪽 글 `.tr-lt`의 폭 = 열 − 글 x − 8. 없으면 폭을 정하지 않음. */
  col?: number;
}

/** vlike 줄 x(TR-D2 · TR-D7 · TR-P13 · TR-P16) — 단 1(level 0) 머리 · 접을 수 있는 줄 8(▾ 칸 8–18), 단 1 잎 줄 8,
 *  단 n+1 줄 = 단 n 내용 x: 여러 단 나무 21 + 9(n − 1), 한 단 16. */
const VL_HEAD_X = 8;
const vlContentX = (level: number, multi: boolean): number => (multi ? 21 + 9 * (level - 1) : 16);
/** 세로 선 x — 단 k(level k − 1 그릇)의 내용 왼쪽 선(TR-D7). */
const vlLineX = (k: number): number => 12 + 9 * k;
const VL_LINE = 'var(--border)';

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

/**
 * 포인터 표시(ia-v4 §2.7 키보드 "B.32 PR 뒤 — Space는 마지막 포커스가 키보드로 왔을 때만") — 문서 전체에 하나.
 * 켬 = 캡처 단계 pointerdown(어디든) · 마우스가 창을 떠남(documentElement pointerleave — 피그마 캔버스 손 도구 Space).
 * 끔 = 캡처 단계 keydown Tab(Shift+Tab) · ↑↓ · Home/End · ← → · Enter. 처리기는 표시만 바꾼다(preventDefault · stopPropagation 없음).
 * 다시 그리기 · 스크립트 포커스 · focusin은 표시를 바꾸지 않는다. :focus-visible은 키를 누르는 순간 참이 되어 쓰지 않는다.
 */
let pointerMode = false;
let pointerWatch = false;
const KEYBOARD_NAV = new Set(['Tab', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'ArrowLeft', 'ArrowRight', 'Enter']);
function watchPointer(): void {
  if (pointerWatch) return;
  pointerWatch = true;
  document.addEventListener('pointerdown', () => { pointerMode = true; }, true);
  document.documentElement.addEventListener('pointerleave', () => { pointerMode = true; });
  document.addEventListener('keydown', (e) => { if (KEYBOARD_NAV.has(e.key)) pointerMode = false; }, true);
}

/** 트리를 그린다. 포커스가 트리 안에 있었으면 같은 key 줄로 되돌린다. */
export function renderTree(mount: HTMLElement, items: readonly TreeItem[], opts: TreeOptions): void {
  const active = document.activeElement as HTMLElement | null;
  const hadFocus = !!active && mount.contains(active) && !active.matches('input, textarea');
  const focusKey = hadFocus ? active!.closest<HTMLElement>('[data-tkey]')?.dataset.tkey ?? null : mount.dataset.focusKey ?? null;
  watchPointer();
  mount.replaceChildren();
  mount.setAttribute('role', 'treegrid');
  const flat: Flat[] = [];
  const vl = opts.look === 'vlike';
  mount.classList.toggle('vlike', vl);
  // 여러 단 나무(TR-D7) — 단 1 그릇(머리 · 접을 수 있는 줄) 아래에 단 2 그릇이 하나라도 있으면. 접힘이 아니라 나무 모양으로.
  const isBox = (x: TreeItem): boolean => !!x.head || !!x.children?.length;
  const multi = vl && items.some((it) => isBox(it) && (it.children ?? []).some(isBox));
  /** 펼친 줄의 조상 그릇 key(바깥부터) — 세로 선 · 그룹 여백용. */
  const rowsOut: { row: HTMLElement; anc: string[]; level: number }[] = [];
  const walk = (list: readonly TreeItem[], parentKey: string | null, level: number, anc: string[]): void => {
    for (const it of list) {
      flat.push({ item: it, parentKey, level });
      const row = document.createElement('div');
      // 트리 머리 줄은 회색 머리 띠(.tr-group — ia-v4 §2.7 · §2.8 B안 ②). vlike는 띠 없이 위 1px 선(TR-D1 — CSS `.tree.vlike .tr-head[data-tkey]`)
      const grp = !vl && (it.head || it.group);
      row.className = `tr ${it.head ? 'tr-head' : 'tr-row'}${grp ? ' tr-group' : ''}${vl && it.head && level > 0 ? ' tr-inner' : ''}${it.off ? ' off' : ''}${it.cls ? ' ' + it.cls : ''}`;
      row.setAttribute('role', 'row');
      row.setAttribute('aria-level', String(level + 1));
      row.dataset.tkey = it.key;
      row.tabIndex = -1;
      const hasKids = !!it.children?.length;
      const open = hasKids && !opts.collapsed.has(it.key);
      const x = !vl ? it.indent : level === 0 ? VL_HEAD_X : vlContentX(level, multi);
      row.style.paddingLeft = `${x}px`;
      if (hasKids) row.setAttribute('aria-expanded', String(open));
      const withCar = hasKids || !!it.head;
      if (withCar) {
        const car = document.createElement('button');
        car.type = 'button';
        car.className = 'tr-car';
        car.tabIndex = -1;
        car.textContent = vl ? (open ? '▾' : '▸') : open ? '▼' : '▶';
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
        nm.className = `tr-name${it.muted && !vl ? ' muted' : ''}`;
        nm.textContent = it.name ?? '';
        const ct = document.createElement('span');
        ct.className = 'tr-cnt';
        ct.textContent = it.countText ?? '';
        row.append(nm, ct);
      } else row.append(...(it.cells ?? []));
      // 왼쪽 글 고정 폭(TR-D5 · TR-D11) — 열 − 글 x − 8, 모자라면 0(칩은 글 x + 8에 선다). 글 x = 줄 x + ▾(10 + 4) + 동그라미(16 + 8).
      if (vl && opts.col != null && !it.head) {
        const lt = row.querySelector<HTMLElement>(':scope > .tr-lt:not(.fill)');
        if (lt) {
          const lx = x + (withCar ? 14 : 0) + (row.querySelector(':scope > .tr-lead') ? 24 : 0);
          lt.style.width = `${Math.max(0, opts.col - 8 - lx)}px`;
        }
      }
      const grow = document.createElement('span');
      grow.className = 'grow';
      row.appendChild(grow);
      if (it.right) row.append(...it.right);
      if (it.sw) row.appendChild(swEl(it.sw, !!opts.locked));
      if (it.aria) row.setAttribute('aria-label', it.aria);
      mount.appendChild(row);
      rowsOut.push({ row, anc, level });
      if (open) walk(it.children!, it.key, level + 1, [...anc, it.key]);
    }
  };
  const toggle = (key: string): void => {
    if (opts.collapsed.has(key)) opts.collapsed.delete(key);
    else opts.collapsed.add(key);
    mount.dataset.focusKey = key;
    opts.rerender();
    focusRow(mount, key);
  };
  walk(items, null, 0, []);
  if (vl) vlDecorate(rowsOut, multi);
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

/** vlike 꾸밈 — 그룹 여백(TR-D2 · TR-P17)과 이름 정리 세로 선 조각(TR-D7 · TR-P7). 줄은 평평한 채 바깥 여백 · 배경 그림으로. */
function vlDecorate(rows: { row: HTMLElement; anc: string[]; level: number }[], multi: boolean): void {
  // 그룹 여백: 단 1 그릇(level 0 머리 · 접을 수 있는 줄)의 보이는 내용 — 첫 줄 위 4 · 마지막 줄 아래 16. 접힌 그릇은 내용이 없어 여백도 없다.
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].level !== 0) continue;
    let j = i + 1;
    while (j < rows.length && rows[j].level > 0) j++;
    if (j === i + 1) continue;
    rows[i + 1].row.style.marginTop = '4px';
    rows[j - 1].row.style.marginBottom = '16px';
  }
  if (!multi) return;
  // 세로 선: 줄마다 조상 그릇(단 k)의 선 x에 1px 조각 — 그 그릇의 마지막 보이는 내용 줄만 위 16까지(길이 = 내용 높이 − 16).
  for (let i = 0; i < rows.length; i++) {
    const { row, anc } = rows[i];
    if (!anc.length) continue;
    const imgs: string[] = [];
    const sizes: string[] = [];
    const pos: string[] = [];
    anc.forEach((key, k) => {
      const next = rows[i + 1];
      const last = !next || next.anc[k] !== key;
      imgs.push(`linear-gradient(${VL_LINE}, ${VL_LINE})`);
      sizes.push(`1px ${last ? 16 : 32}px`);
      pos.push(`${vlLineX(k)}px 0`);
    });
    row.style.backgroundImage = imgs.join(', ');
    row.style.backgroundSize = sizes.join(', ');
    row.style.backgroundPosition = pos.join(', ');
    row.style.backgroundRepeat = 'no-repeat';
    row.classList.add('tr-lined');
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
      // 되풀이(누르고 있음 — 피그마 손 도구) · 마지막 포커스가 마우스로 왔을 때는 바꾸지 않는다(B.32).
      if (e.repeat || pointerMode) { e.preventDefault(); return; }
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
