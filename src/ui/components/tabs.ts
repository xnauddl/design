// Tab — 밑줄형 · 세그먼트형, design-system §6.3. roving tabindex · 화살표 키.
import { el } from './dom';

export function tabs(o: { items: { value: string; label: string }[]; value: string; label: string; kind?: 'underline' | 'segment'; onChange?: (v: string) => void }): HTMLElement {
  const seg = o.kind === 'segment';
  const list = el('div', seg ? 'ds-seg' : 'ds-tabs');
  list.setAttribute('role', 'tablist');
  list.setAttribute('aria-label', o.label);
  const btns = o.items.map((it) => {
    const b = el('button', seg ? 'ds-seg__item' : 'ds-tab', it.label);
    b.type = 'button';
    b.setAttribute('role', 'tab');
    b.dataset.value = it.value;
    return b;
  });
  const pick = (v: string, focus = false): void => {
    for (const b of btns) {
      const on = b.dataset.value === v;
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
      if (on && focus) b.focus();
    }
  };
  btns.forEach((b, i) => {
    b.addEventListener('click', () => { pick(b.dataset.value!); o.onChange?.(b.dataset.value!); });
    b.addEventListener('keydown', (e) => {
      const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      const j = e.key === 'Home' ? 0 : e.key === 'End' ? btns.length - 1 : d ? (i + d + btns.length) % btns.length : -1;
      if (j < 0) return;
      e.preventDefault();
      pick(btns[j].dataset.value!, true);
      o.onChange?.(btns[j].dataset.value!);
    });
  });
  list.append(...btns);
  pick(o.value);
  return list;
}
