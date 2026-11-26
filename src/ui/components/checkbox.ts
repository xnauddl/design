// Checkbox · Radio — design-system §6.2. 기본 입력 그대로(키보드 · 화면 읽기).
import { el } from './dom';

export function checkbox(o: { label: string; checked?: boolean; indeterminate?: boolean; locked?: string }): HTMLLabelElement {
  const l = el('label', 'ds-checkline');
  const c = el('input', 'ds-check');
  c.type = 'checkbox';
  c.checked = !!o.checked;
  c.indeterminate = !!o.indeterminate;
  if (o.locked) { c.setAttribute('aria-disabled', 'true'); c.title = o.locked; c.addEventListener('click', (e) => e.preventDefault()); }
  l.append(c, el('span', '', o.label));
  return l;
}

export function radioGroup(o: { name: string; legend: string; options: { value: string; label: string }[]; value?: string }): HTMLFieldSetElement {
  const f = el('fieldset', 'ds-radiogroup');
  f.appendChild(el('legend', 'ds-label', o.legend));
  for (const op of o.options) {
    const l = el('label', 'ds-checkline');
    const r = el('input', 'ds-radio');
    r.type = 'radio'; r.name = o.name; r.value = op.value; r.checked = op.value === o.value;
    l.append(r, el('span', '', op.label));
    f.appendChild(l);
  }
  return f;
}
