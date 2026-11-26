// Alert — design-system §6.5. 오류는 role="alert", 나머지 role="status".
import { icon, type IconName } from '../icons';
import type { Tone } from './badge';
import { iconButton } from './button';
import { el } from './dom';

export const TONE_ICON: Record<Tone, IconName> = { info: 'info', success: 'circle-check', warning: 'triangle-alert', error: 'circle-alert' };

export function alert(o: { tone: Tone; title?: string; text: string; box?: boolean; closeLabel?: string; onClose?: () => void }): HTMLElement {
  const a = el('div', `ds-alert ds-alert--${o.tone}${o.box ? ' ds-alert--box' : ''}`);
  a.setAttribute('role', o.tone === 'error' ? 'alert' : 'status');
  a.appendChild(icon(TONE_ICON[o.tone]));
  const body = el('div', 'ds-alert__body');
  if (o.title) body.appendChild(el('div', 'ds-alert__title', o.title));
  body.appendChild(el('div', '', o.text));
  a.appendChild(body);
  if (o.onClose && o.closeLabel) a.appendChild(iconButton({ icon: 'x', label: o.closeLabel, size: 'sm', onClick: () => { a.remove(); o.onClose!(); } }));
  return a;
}
