// Toggle — design-system §6.2. <button role="switch" aria-checked>.
import { el } from './dom';

export function toggle(o: { checked?: boolean; mixed?: boolean; label: string; onChange?: (checked: boolean) => void }): HTMLButtonElement {
  const b = el('button', 'ds-toggle');
  b.type = 'button';
  b.setAttribute('role', 'switch');
  b.setAttribute('aria-label', o.label);
  b.setAttribute('aria-checked', o.mixed ? 'mixed' : String(!!o.checked));
  b.appendChild(el('span', 'ds-toggle__track'));
  b.addEventListener('click', () => {
    if (b.getAttribute('aria-disabled') === 'true') return;
    const next = b.getAttribute('aria-checked') !== 'true';
    b.setAttribute('aria-checked', String(next));
    o.onChange?.(next);
  });
  return b;
}
