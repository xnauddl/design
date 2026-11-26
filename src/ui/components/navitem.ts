// Navigation Item — design-system §6.3.
import { badge } from './badge';
import { el } from './dom';

export function navItem(o: { label: string; count?: number; countLabel?: string; level?: 1 | 2; selected?: boolean; danger?: boolean; onClick?: () => void }): HTMLButtonElement {
  const b = el('button', `ds-navitem${o.level === 2 ? ' ds-navitem--lv2' : ''}${o.danger ? ' ds-navitem--danger' : ''}`);
  b.type = 'button';
  if (o.selected) b.setAttribute('aria-current', 'true');
  b.appendChild(el('span', 'ds-navitem__label', o.label));
  if (o.count != null) b.appendChild(badge({ text: String(o.count), label: o.countLabel }));
  if (o.onClick) b.addEventListener('click', o.onClick);
  return b;
}
