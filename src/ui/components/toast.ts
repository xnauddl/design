// Toast — design-system §6.5 · ia-v4 §4.1b "결과 알림 — Toast 하나"(DS-3b).
// 한 번에 하나. 늘 있는 담는 곳 `#toastHost`(role="status")에 넣는다 — 없으면 만든다.
// 동작이 있으면 기본으로 남고(sticky), 없으면 4초 — 포인터가 위에 있거나 포커스가 안에 있는 동안 시간이 멈춘다.
// 글은 자르지 않는다(S3-D15). tip은 글의 title(덧붙인 설명)로만 둔다.
import { icon } from '../icons';
import { TONE_ICON } from './alert';
import type { Tone } from './badge';
import { button, iconButton } from './button';
import { el } from './dom';

const LIFE_MS = 4000;

export interface ToastOptions {
  tone: Tone;
  text: string;
  /** 덧붙인 설명(사유별 수 · 목록 · 원문) — 글의 title. */
  tip?: string;
  closeLabel: string;
  action?: { label: string; onClick: () => void };
  sticky?: boolean;
  /** 포커스가 Toast 안에 있던 채 사라졌는데 들어오기 전 요소가 없을 때 갈 곳. */
  fallbackFocus?: () => HTMLElement | null;
  /** 뜨고 사라질 때(자리 · 여백을 다시 정하라고) — 사라질 때는 null. */
  onChange?: (root: HTMLElement | null) => void;
}
export interface ToastApi { root: HTMLElement; sticky: boolean; close(): void }

let current: (ToastApi & { dismiss(): boolean }) | null = null;
/** 떠 있는 Toast가 기억한 "들어오기 전 요소" — 새 Toast로 바뀔 때 이어받는다. */
let prevReturn: HTMLElement | null = null;

/** 지금 떠 있는 Toast(없으면 null). */
export function currentToast(): ToastApi | null { return current; }

function toastHost(): HTMLElement {
  let h = document.getElementById('toastHost');
  if (!h) {
    h = el('div', 'ds-toast-host');
    h.id = 'toastHost';
    h.setAttribute('role', 'status');
    h.setAttribute('aria-live', 'polite');
    h.setAttribute('aria-atomic', 'true');
    document.body.appendChild(h);
  }
  return h;
}

const focusLost = (): boolean => { const a = document.activeElement as HTMLElement | null; return !a || a === document.body || !a.isConnected; };

export function toast(o: ToastOptions): ToastApi {
  // 앞 Toast를 바꾼다 — 포커스가 그 안에 있었으면 아래에서 되돌린다.
  const prev = current;
  const prevHadFocus = !!prev && prev.root.contains(document.activeElement);
  let returnTo: HTMLElement | null = prevHadFocus ? prevReturn : null;
  prev?.dismiss();

  const host = toastHost();
  host.setAttribute('aria-live', o.tone === 'error' ? 'assertive' : 'polite');
  const root = el('div', `ds-toast ds-toast--${o.tone}`);
  root.appendChild(icon(TONE_ICON[o.tone]));
  const text = el('span', 'ds-toast__text', o.text);
  if (o.tip) text.title = o.tip;
  root.appendChild(text);

  let timer = 0;
  let hovered = false;
  let focused = false;
  const sticky = o.sticky ?? !!o.action;
  const stop = (): void => { window.clearTimeout(timer); timer = 0; };
  const arm = (): void => { stop(); if (!sticky && !hovered && !focused) timer = window.setTimeout(() => api.close(), LIFE_MS); };

  /** 지우기만(포커스 되돌림 · 알림은 부르는 쪽이). true = 포커스가 안에 있었음. */
  const dismiss = (): boolean => {
    const had = root.contains(document.activeElement);
    stop();
    root.remove();
    if (current === api) current = null;
    return had;
  };
  const restore = (had: boolean): void => {
    if (!had || !focusLost()) return;
    const back = returnTo && returnTo.isConnected ? returnTo : o.fallbackFocus?.() ?? null;
    back?.focus();
  };
  const api: ToastApi & { dismiss(): boolean } = {
    root,
    sticky,
    dismiss,
    close(): void { const had = dismiss(); restore(had); o.onChange?.(null); },
  };

  if (o.action) {
    const a = button({ label: o.action.label, variant: 'link', onClick: () => { const had = dismiss(); o.action!.onClick(); restore(had); o.onChange?.(null); } }).el;
    a.classList.add('ds-toast__action');
    root.appendChild(a);
  }
  root.appendChild(iconButton({ icon: 'x', label: o.closeLabel, size: 'sm', onClick: () => api.close() }));

  root.addEventListener('pointerenter', () => { hovered = true; stop(); });
  root.addEventListener('pointerleave', () => { hovered = false; arm(); });
  root.addEventListener('focusin', (e) => {
    const from = e.relatedTarget as HTMLElement | null;
    if (!focused && from && !root.contains(from)) { returnTo = from; prevReturn = from; }
    focused = true;
    stop();
  });
  root.addEventListener('focusout', (e) => {
    const to = e.relatedTarget as HTMLElement | null;
    if (to && root.contains(to)) return;
    focused = false;
    arm();
  });

  host.appendChild(root);
  current = api;
  // 새 Toast로 바뀐 경우의 포커스 되돌림 — 들어오기 전 요소를 새 Toast도 기억한다.
  prevReturn = returnTo;
  if (prevHadFocus) {
    const back = returnTo && returnTo.isConnected ? returnTo : o.fallbackFocus?.() ?? null;
    if (focusLost()) back?.focus();
  }
  arm();
  o.onChange?.(root);
  return api;
}
