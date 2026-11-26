// Empty · Loading · Error · Success State — design-system §6.5.
import { icon, type IconName } from '../icons';
import { button } from './button';
import { el } from './dom';

export function stateView(o: { kind: 'empty' | 'error' | 'success'; icon?: IconName; title: string; text?: string; action?: { label: string; onClick: () => void } }): HTMLElement {
  const s = el('div', `ds-state${o.kind === 'empty' ? '' : ` ds-state--${o.kind}`}`);
  if (o.kind === 'error') s.setAttribute('role', 'alert');
  if (o.kind === 'success') s.setAttribute('role', 'status');
  s.appendChild(icon(o.icon ?? (o.kind === 'error' ? 'circle-alert' : o.kind === 'success' ? 'circle-check' : 'info'), 'lg'));
  s.appendChild(el('h2', 'ds-state__title', o.title));
  if (o.text) s.appendChild(el('p', 'ds-state__text', o.text));
  if (o.action) s.appendChild(button({ label: o.action.label, onClick: o.action.onClick }).el);
  return s;
}

export function skeleton(rows: number, label: string): HTMLElement {
  const s = el('div', 'ds-skeleton');
  s.setAttribute('aria-busy', 'true');
  for (let i = 0; i < rows; i++) s.appendChild(el('div', 'ds-skeleton__row'));
  s.appendChild(el('span', 'ds-sr', label));
  return s;
}
