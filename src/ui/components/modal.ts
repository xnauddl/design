// Modal · Confirm Dialog — design-system §6.5 · Modal Layout §5.
// 처음 포커스 · Tab 가두기 · Esc · 막 누르면 닫기 · 닫으면 연 단추로 포커스 되돌림.
import { button, iconButton } from './button';
import { el, nextId } from './dom';

export interface ModalAction { label: string; variant?: 'primary' | 'ghost' | 'danger' | 'secondary'; onClick?: () => void | boolean }

export function openModal(o: { title: string; body: Node; actions: ModalAction[]; closeLabel: string; size?: 'sm' | 'md'; alert?: boolean; initialFocus?: number; onClose?: () => void }): { close(): void } {
  const opener = document.activeElement as HTMLElement | null;
  const scrim = el('div', 'ds-modal-scrim');
  const dlg = el('div', `ds-modal${o.size === 'sm' ? ' ds-modal--sm' : ''}`);
  dlg.setAttribute('role', o.alert ? 'alertdialog' : 'dialog');
  dlg.setAttribute('aria-modal', 'true');
  const titleId = nextId('ds-modal-title');
  dlg.setAttribute('aria-labelledby', titleId);
  const head = el('div', 'ds-modal__header');
  const h = el('h2', 'ds-modal__title', o.title); h.id = titleId;
  const close = (): void => { scrim.remove(); document.removeEventListener('keydown', onKey, true); opener?.focus?.(); o.onClose?.(); };
  const x = iconButton({ icon: 'x', label: o.closeLabel, size: 'sm', onClick: close });
  head.append(h, x);
  const bodyEl = el('div', 'ds-modal__body'); bodyEl.appendChild(o.body);
  const foot = el('div', 'ds-modal__footer');
  const btns = o.actions.map((a) => button({ label: a.label, variant: a.variant ?? 'secondary', onClick: () => { if (a.onClick?.() !== false) close(); } }).el);
  foot.append(...btns);
  dlg.append(head, bodyEl, foot);
  scrim.appendChild(dlg);
  scrim.addEventListener('mousedown', (e) => { if (e.target === scrim) close(); });
  const focusables = (): HTMLElement[] => Array.from(dlg.querySelectorAll<HTMLElement>('button, input, select, textarea, [tabindex]:not([tabindex="-1"])')).filter((n) => !n.hasAttribute('disabled'));
  function onKey(e: KeyboardEvent): void {
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key !== 'Tab') return;
    const f = focusables(); if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  document.addEventListener('keydown', onKey, true);
  document.body.appendChild(scrim);
  const firstInput = bodyEl.querySelector<HTMLElement>('input, select, textarea');
  (o.initialFocus != null ? btns[o.initialFocus] : firstInput ?? x).focus();
  return { close };
}

export function confirmDialog(o: { title: string; text: string; confirmLabel: string; cancelLabel: string; closeLabel: string; danger?: boolean }): Promise<boolean> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v: boolean): void => { if (!done) { done = true; resolve(v); } };
    openModal({
      title: o.title, body: el('p', '', o.text), size: 'sm', alert: true, closeLabel: o.closeLabel,
      actions: [{ label: o.cancelLabel, variant: 'ghost', onClick: () => finish(false) }, { label: o.confirmLabel, variant: o.danger ? 'danger' : 'primary', onClick: () => finish(true) }],
      initialFocus: o.danger ? 0 : 1,
      onClose: () => finish(false),
    });
  });
}
