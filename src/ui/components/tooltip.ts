// Tooltip — design-system §6.4. 위임으로 나중에 붙인 요소에도 걸린다. title을 data-tip으로 옮겨 겹치지 않게.
import { el } from './dom';

let tipEl: HTMLDivElement | null = null;
const GAP = 8;

function show(target: HTMLElement, text: string): void {
  if (!tipEl) { tipEl = el('div', 'ds-tip'); tipEl.setAttribute('role', 'tooltip'); tipEl.hidden = true; document.body.appendChild(tipEl); }
  tipEl.textContent = text;
  tipEl.hidden = false;
  const r = target.getBoundingClientRect();
  const t = tipEl.getBoundingClientRect();
  const below = r.top - t.height - GAP < 0;
  const x = Math.min(Math.max(r.left + r.width / 2 - t.width / 2, 4), window.innerWidth - t.width - 4);
  tipEl.style.left = `${x}px`;
  tipEl.style.top = `${below ? r.bottom + GAP : r.top - t.height - GAP}px`;
  tipEl.dataset.side = below ? 'bottom' : 'top';
  tipEl.style.setProperty('--tip-x', `${r.left + r.width / 2 - x}px`);
}
const hide = (): void => { if (tipEl) tipEl.hidden = true; };

/** root 아래 [data-tip] · [title] 요소에 툴팁을 건다(한 번만 부르면 된다). */
export function tooltip(root: HTMLElement = document.body): void {
  root.addEventListener('pointerover', (e) => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('[data-tip], [title]');
    if (!t) return;
    if (t.title) { t.dataset.tip = t.title; t.removeAttribute('title'); }
    show(t, t.dataset.tip!);
  });
  root.addEventListener('pointerout', hide);
  root.addEventListener('focusin', (e) => { const t = (e.target as HTMLElement).closest<HTMLElement>('[data-tip]'); if (t) show(t, t.dataset.tip!); });
  root.addEventListener('focusout', hide);
}
