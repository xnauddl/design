// Button · Icon Button · Button Group · Split Button — design-system §6.1.
import { icon, type IconName } from '../icons';
import { el, sizeCls, type Size } from './dom';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'link';
export interface ButtonApi { el: HTMLButtonElement; setLoading(b: boolean): void; setDisabled(b: boolean): void; setLocked(reason: string | null): void }

const variantCls = (v?: ButtonVariant): string => (v && v !== 'secondary' ? ` ds-btn--${v}` : '');

export function button(o: { variant?: ButtonVariant; size?: Size; label: string; icon?: IconName; iconEnd?: IconName; onClick?: (e: MouseEvent) => void }): ButtonApi {
  const b = el('button', `ds-btn${variantCls(o.variant)}${sizeCls('ds-btn', o.size)}`);
  b.type = 'button';
  if (o.icon) b.appendChild(icon(o.icon, o.size === 'sm' ? 'sm' : 'md'));
  b.appendChild(el('span', 'ds-btn__label', o.label));
  if (o.iconEnd) b.appendChild(icon(o.iconEnd, o.size === 'sm' ? 'sm' : 'md'));
  let busy = false;
  if (o.onClick) b.addEventListener('click', (e) => { if (!busy && b.getAttribute('aria-disabled') !== 'true') o.onClick!(e); });
  // Loading 중 키보드(Enter · Space)도 막는다 — 클릭 처리기에서 busy를 본다(§6.0 Loading).
  return {
    el: b,
    setLoading(on) { busy = on; if (on) b.setAttribute('aria-busy', 'true'); else b.removeAttribute('aria-busy'); },
    setDisabled(on) { b.disabled = on; },
    setLocked(reason) {
      if (reason) { b.setAttribute('aria-disabled', 'true'); b.title = reason; } else { b.removeAttribute('aria-disabled'); b.removeAttribute('title'); }
    },
  };
}

export function iconButton(o: { icon: IconName; label: string; variant?: 'ghost' | 'secondary'; size?: 'sm' | 'md'; onClick?: (e: MouseEvent) => void }): HTMLButtonElement {
  const v = o.variant ?? 'ghost';
  const b = el('button', `ds-btn ds-icbtn${v === 'ghost' ? ' ds-btn--ghost' : ''}${sizeCls('ds-btn', o.size)}`);
  b.type = 'button';
  b.setAttribute('aria-label', o.label);
  b.dataset.tip = o.label;
  b.appendChild(icon(o.icon));
  if (o.onClick) b.addEventListener('click', o.onClick);
  return b;
}

export function buttonGroup(buttons: HTMLElement[], o: { attached?: boolean; label?: string } = {}): HTMLElement {
  const g = el('div', `ds-btngroup${o.attached === false ? ' ds-btngroup--spaced' : ''}`);
  if (o.attached !== false) { g.setAttribute('role', 'group'); if (o.label) g.setAttribute('aria-label', o.label); }
  g.append(...buttons);
  return g;
}

export function splitButton(o: { label: string; menuLabel: string; variant?: 'primary' | 'secondary'; onClick?: () => void; menu: { label: string; onClick: () => void }[] }): HTMLElement {
  const wrap = el('div', 'ds-split');
  const main = button({ label: o.label, variant: o.variant, onClick: o.onClick }).el;
  const toggle = el('button', `ds-btn ds-icbtn ds-split__toggle${o.variant === 'primary' ? ' ds-btn--primary' : ''}`);
  toggle.type = 'button';
  toggle.setAttribute('aria-label', o.menuLabel);
  toggle.setAttribute('aria-haspopup', 'menu');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.appendChild(icon('chevron-down'));
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(open));
    wrap.dispatchEvent(new CustomEvent('ds-split-menu', { detail: { open, items: o.menu } }));
  });
  wrap.append(main, toggle);
  return wrap;
}
