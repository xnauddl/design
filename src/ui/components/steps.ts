// Step Indicator — design-system §6.3.
import { icon } from '../icons';
import { el } from './dom';

export function steps(o: { items: string[]; current: number }): HTMLOListElement {
  const ol = el('ol', 'ds-steps');
  o.items.forEach((label, i) => {
    const li = el('li', `ds-step${i < o.current ? ' ds-step--done' : ''}`);
    if (i === o.current) li.setAttribute('aria-current', 'step');
    const dot = el('span', 'ds-step__dot');
    if (i < o.current) dot.appendChild(icon('check', 'sm')); else dot.textContent = String(i + 1);
    li.append(dot, el('span', '', label));
    ol.appendChild(li);
  });
  return ol;
}
