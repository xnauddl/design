// Table — design-system §6.4.
import { el } from './dom';

export function table(o: { columns: { key: string; label: string; num?: boolean }[]; rows: Record<string, string>[] }): HTMLTableElement {
  const t = el('table', 'ds-table');
  const hr = el('tr');
  for (const c of o.columns) { const th = el('th', c.num ? 'ds-table__num' : '', c.label); th.scope = 'col'; hr.appendChild(th); }
  t.appendChild(el('thead')).appendChild(hr);
  const tb = t.appendChild(el('tbody'));
  for (const r of o.rows) {
    const tr = el('tr');
    for (const c of o.columns) tr.appendChild(el('td', c.num ? 'ds-table__num' : '', r[c.key] ?? ''));
    tb.appendChild(tr);
  }
  return t;
}
