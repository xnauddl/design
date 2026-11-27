// List Item — design-system §6.4.
import { el } from './dom';

export function listItem(o: { lead?: Node; title: string; sub?: string; trail?: Node; plain?: boolean }): HTMLElement {
  const li = el('div', `ds-li${o.plain ? ' ds-li--plain' : ''}`);
  if (o.lead) li.appendChild(o.lead);
  const main = el('div', 'ds-li__main');
  main.appendChild(el('div', 'ds-li__title', o.title));
  if (o.sub) main.appendChild(el('div', 'ds-li__sub', o.sub));
  li.appendChild(main);
  if (o.trail) li.appendChild(o.trail);
  return li;
}
