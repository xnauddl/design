// Input · Textarea · Select · Search Field — design-system §6.2.
import { icon } from '../icons';
import { iconButton } from './button';
import { el, nextId } from './dom';

export function input(o: { value?: string; placeholder?: string; size?: 'sm' | 'md'; invalid?: boolean; label?: string; help?: string; error?: string } = {}): HTMLElement {
  const i = el('input', `ds-input${o.size === 'sm' ? ' ds-input--sm' : ''}`);
  i.type = 'text';
  if (o.value != null) i.value = o.value;
  if (o.placeholder) i.placeholder = o.placeholder;
  if (o.invalid) i.setAttribute('aria-invalid', 'true');
  if (!o.label && !o.help && !o.error) return i;
  const f = el('div', 'ds-field');
  if (o.label) { const l = el('label', 'ds-label', o.label); i.id = nextId('ds-input'); l.htmlFor = i.id; f.appendChild(l); }
  f.appendChild(i);
  if (o.error) { const h = el('div', 'ds-help ds-help--error'); h.append(icon('circle-alert', 'sm'), el('span', '', o.error)); f.appendChild(h); }
  else if (o.help) f.appendChild(el('div', 'ds-help', o.help));
  return f;
}

export function textarea(o: { value?: string; rows?: number; mono?: boolean } = {}): HTMLTextAreaElement {
  const t = el('textarea', `ds-input ds-textarea${o.mono ? ' ds-textarea--mono' : ''}`);
  if (o.value != null) t.value = o.value;
  t.rows = o.rows ?? 3;
  return t;
}

export function select(o: { options: { value: string; label: string }[]; value?: string; size?: 'sm' | 'md' }): HTMLElement {
  const w = el('div', 'ds-select');
  const s = el('select', `ds-input${o.size === 'sm' ? ' ds-input--sm' : ''}`);
  for (const op of o.options) { const e = el('option', '', op.label); e.value = op.value; s.appendChild(e); }
  if (o.value != null) s.value = o.value;
  w.append(s, icon('chevron-down', 'sm'));
  return w;
}

export function searchField(o: { placeholder?: string; clearLabel: string; compact?: boolean; onInput?: (v: string) => void; onClear?: () => void }): HTMLElement {
  const w = el('div', `ds-search${o.compact ? ' ds-search--compact' : ''}`);
  const i = el('input', 'ds-input');
  i.type = 'search';
  if (o.placeholder) i.placeholder = o.placeholder;
  const clear = iconButton({ icon: 'x', label: o.clearLabel, size: 'sm', onClick: () => { i.value = ''; clear.hidden = true; o.onClear?.(); i.focus(); } });
  clear.hidden = true;
  i.addEventListener('input', () => { clear.hidden = !i.value; o.onInput?.(i.value); });
  w.append(icon('search'), i, clear);
  return w;
}
