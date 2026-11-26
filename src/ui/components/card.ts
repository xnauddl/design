// Card — design-system §6.4. 안에 Card 금지(§1-7).
import { el } from './dom';

export function card(o: { title: string; desc?: string; body?: Node }): HTMLElement {
  const c = el('section', 'ds-card');
  c.appendChild(el('h3', 'ds-card__title', o.title));
  if (o.desc) c.appendChild(el('p', 'ds-card__desc', o.desc));
  if (o.body) { const b = el('div', 'ds-card__body'); b.appendChild(o.body); c.appendChild(b); }
  return c;
}
