// Toast — design-system §6.5. 한 번에 하나. 동작이 있으면 기본으로 남고(sticky), 없으면 4초 — 마우스 · 포커스가 들어가면 시간이 멈춘다.
import { icon } from '../icons';
import { TONE_ICON } from './alert';
import type { Tone } from './badge';
import { button, iconButton } from './button';
import { el } from './dom';

const LIFE_MS = 4000;
let current: { root: HTMLElement; close(): void } | null = null;

export function toast(o: { tone: Tone; text: string; closeLabel: string; action?: { label: string; onClick: () => void }; sticky?: boolean }): { close(): void } {
  current?.close();
  const root = el('div', 'ds-toast');
  root.setAttribute('role', 'status');
  root.setAttribute('aria-live', o.tone === 'error' ? 'assertive' : 'polite');
  root.appendChild(icon(TONE_ICON[o.tone]));
  root.appendChild(el('span', 'ds-toast__text', o.text));
  let timer = 0;
  const api = {
    root,
    close(): void { window.clearTimeout(timer); root.remove(); if (current === api) current = null; },
  };
  if (o.action) {
    const a = button({ label: o.action.label, variant: 'link', onClick: () => { api.close(); o.action!.onClick(); } }).el;
    a.classList.add('ds-toast__action');
    root.appendChild(a);
  }
  root.appendChild(iconButton({ icon: 'x', label: o.closeLabel, size: 'sm', onClick: () => api.close() }));
  const sticky = o.sticky ?? !!o.action;
  const arm = (): void => { if (!sticky) timer = window.setTimeout(() => api.close(), LIFE_MS); };
  root.addEventListener('pointerenter', () => window.clearTimeout(timer));
  root.addEventListener('pointerleave', arm);
  root.addEventListener('focusin', () => window.clearTimeout(timer));
  root.addEventListener('focusout', arm);
  document.body.appendChild(root);
  arm();
  current = api;
  return api;
}
