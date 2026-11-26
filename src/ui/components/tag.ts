// Tag · 변수 칩 — design-system §6.4.
import { el } from './dom';

export function tag(o: { text: string; tone?: 'warn' | 'outline'; onClick?: () => void }): HTMLElement {
  const t = el(o.onClick ? 'button' : 'span', `ds-tag${o.tone ? ` ds-tag--${o.tone}` : ''}`, o.text);
  if (o.onClick) { (t as HTMLButtonElement).type = 'button'; t.addEventListener('click', o.onClick); }
  return t;
}

export function chip(o: { alias?: string; value?: string }): HTMLSpanElement {
  const c = el('span', 'ds-chip');
  if (o.alias) c.appendChild(el('span', 'ds-chip__alias', o.alias));
  if (o.value) c.appendChild(el('span', 'ds-chip__value', o.value));
  return c;
}
