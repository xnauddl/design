// Badge — design-system §6.4.
import { icon, type IconName } from '../icons';
import { el } from './dom';

export type Tone = 'success' | 'warning' | 'error' | 'info';
export function badge(o: { text: string; tone?: Tone | 'solid'; icon?: IconName; outline?: boolean; dot?: boolean; label?: string }): HTMLSpanElement {
  const cls = ['ds-badge'];
  if (o.dot) cls.push('ds-badge--dot');
  if (o.tone) cls.push(`ds-badge--${o.tone}`);
  if (o.outline) cls.push('ds-badge--outline');
  const s = el('span', cls.join(' '));
  if (o.icon) s.appendChild(icon(o.icon, 'sm'));
  s.appendChild(document.createTextNode(o.text));
  if (o.label) s.setAttribute('aria-label', o.label);
  return s;
}
