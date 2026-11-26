// Progress Indicator — 막대 · 돌기, design-system §6.4.
import { el } from './dom';

export function progress(o: { value: number; max: number; label: string; error?: boolean }): HTMLElement {
  const p = el('div', `ds-progress${o.error ? ' ds-progress--error' : ''}`);
  p.setAttribute('role', 'progressbar');
  p.setAttribute('aria-label', o.label);
  p.setAttribute('aria-valuemin', '0');
  p.setAttribute('aria-valuemax', String(o.max));
  p.setAttribute('aria-valuenow', String(o.value));
  const f = el('div', 'ds-progress__fill');
  f.style.width = `${o.max ? Math.round((o.value / o.max) * 100) : 0}%`;
  p.appendChild(f);
  return p;
}

export function spinner(o: { size?: 'sm' | 'md'; label: string }): HTMLElement {
  const s = el('span', `ds-spinner${o.size === 'sm' ? ' ds-spinner--sm' : ''}`);
  s.setAttribute('role', 'status');
  s.appendChild(el('span', 'ds-sr', o.label));
  return s;
}
