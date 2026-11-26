// Breadcrumb — design-system §6.3.
import { icon } from '../icons';
import { el } from './dom';

export function breadcrumb(items: { label: string; onClick?: () => void }[], label: string): HTMLElement {
  const nav = el('nav', 'ds-crumb');
  nav.setAttribute('aria-label', label);
  const ol = el('ol');
  items.forEach((it, i) => {
    const li = el('li');
    if (i > 0) li.appendChild(icon('chevron-right', 'sm'));
    if (i === items.length - 1) { const s = el('span', '', it.label); s.setAttribute('aria-current', 'page'); li.appendChild(s); }
    else { const a = el('a', '', it.label); a.href = '#'; a.addEventListener('click', (e) => { e.preventDefault(); it.onClick?.(); }); li.appendChild(a); }
    ol.appendChild(li);
  });
  nav.appendChild(ol);
  return nav;
}
