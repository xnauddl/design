// 개발용 모음 화면 — docs/design-system.md §6.10. 플러그인에 들어가지 않는다(npm run gallery → dist/ds-gallery.html).
import tokensJson from '../../design-tokens/tokens.json';
import {
  alert, badge, breadcrumb, button, buttonGroup, card, checkbox, chip, confirmDialog, icon, iconButton, input, listItem,
  navItem, openModal, progress, radioGroup, searchField, select, skeleton, spinner, splitButton, stateView, steps, table,
  tabs, tag, textarea, toast, toggle, tooltip, type IconName,
} from '../ui/components';
import iconsJson from '../ui/icons.json';

type Tok = { name: string; path: string[]; value: unknown; type?: string; desc?: string };
const flat: Tok[] = [];
(function walk(o: Record<string, unknown>, path: string[]): void {
  for (const [k, v] of Object.entries(o)) {
    if (k.startsWith('$') || typeof v !== 'object' || v === null) continue;
    const r = v as Record<string, unknown>;
    if ('$value' in r) flat.push({ name: `--${[...path, k].join('-')}`, path: [...path, k], value: r.$value, type: r.$type as string, desc: r.$description as string });
    else walk(r, [...path, k]);
  }
})(tokensJson as unknown as Record<string, unknown>, []);
const byName = new Map(flat.map((t) => [t.name, t]));
const refName = (v: unknown): string | null => (typeof v === 'string' && /^\{[\w.-]+\}$/.test(v) ? `--${v.slice(1, -1).replace(/\./g, '-')}` : null);
const chain = (name: string): string[] => { const out = [name]; let r = refName(byName.get(name)?.value); while (r && out.length < 10) { out.push(r); r = refName(byName.get(r)?.value); } return out; };
const literal = (name: string): string => String(byName.get(chain(name).slice(-1)[0])?.value ?? '');

const $ = (id: string): HTMLElement => document.getElementById(id)!;
const h = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text?: string): HTMLElementTagNameMap[K] => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const body = $('gBody');
const nav = $('gNav');
const navGroups = new Map<string, HTMLElement>();

function section(group: string, id: string, title: string, desc: string, kind: 'foundation' | 'component' | 'layout'): HTMLElement {
  if (!navGroups.has(group)) { nav.appendChild(h('h2', '', group)); navGroups.set(group, nav); }
  const a = h('a', '', title); a.href = `#${id}`; nav.appendChild(a);
  const s = h('section', 'g-sec'); s.id = id; s.dataset[kind === 'component' ? 'gComponent' : kind === 'layout' ? 'gLayout' : 'gFoundation'] = title;
  s.append(h('h3', '', title), h('p', '', desc));
  body.appendChild(s);
  return s;
}
function row(parent: HTMLElement, label: string, items: (Node | [Node, string])[]): void {
  const r = h('div', 'g-row'); r.appendChild(h('span', 'g-label', label));
  for (const it of items) { if (Array.isArray(it)) { const c = h('span', 'g-cell'); c.append(it[0], h('small', '', it[1])); r.appendChild(c); } else r.appendChild(it); }
  parent.appendChild(r);
}
function meta(parent: HTMLElement, o: { tokens: string; code: string; a11y: string }): void {
  const m = h('div', 'g-meta');
  m.append(h('div', '', `토큰: ${o.tokens}`), h('div', '', `접근성: ${o.a11y}`), h('code', 'g-code', o.code));
  parent.appendChild(m);
}
const force = (n: HTMLElement, cls: string): HTMLElement => { n.classList.add(cls); return n; };
const STATES = ['Default', 'Hover', 'Active', 'Focus', 'Disabled', '잠김', 'Loading'] as const;

// ── Foundations ─────────────────────────────────────
{
  const s = section('Foundations', 'f-color', 'Color', '색 토큰 — 칸을 누르면 변수 상세(참조 사슬 · 쓰임 · 쓰는 곳 · 대비 · 코드)', 'foundation');
  const grid = h('div', 'g-swatches');
  const detail = h('div', 'g-detail');
  const cssText = Array.from(document.querySelectorAll('style')).map((st) => st.textContent ?? '').join('\n');
  const usedIn = (name: string): string[] => {
    const out: string[] = [];
    for (const part of cssText.split(/\/\* (src\/ui\/[^ ]+\.css) \*\//).reduce<[string, string][]>((acc, x, i, arr) => (i % 2 === 1 ? [...acc, [x, arr[i + 1] ?? '']] : acc), [])) {
      if (part[1].includes(`var(${name})`)) out.push(part[0].replace('src/ui/', ''));
    }
    return out;
  };
  const lum = (hex: string): number => { const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const contrast = (a: string, b: string): string => { if (!/^#[0-9a-f]{6}$/i.test(a) || !/^#[0-9a-f]{6}$/i.test(b)) return '—'; const [x, y] = [lum(a), lum(b)]; return `${((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)).toFixed(2)}:1`; };
  const show = (name: string): void => {
    detail.replaceChildren();
    const t = byName.get(name)!;
    const bg = literal('--color-background-primary');
    detail.appendChild(table({
      columns: [{ key: 'k', label: '항목' }, { key: 'v', label: '값' }],
      rows: [
        { k: '이름', v: name },
        { k: '참조 사슬', v: chain(name).join(' → ') + ` → ${literal(name)}` },
        { k: '쓰임', v: t.desc ?? '—' },
        { k: '쓰는 곳(컴포넌트 CSS)', v: usedIn(name).join(' · ') || '—' },
        { k: '대비(바탕 흰색)', v: contrast(literal(name), bg) },
        { k: '코드', v: `var(${name})` },
      ],
    }));
  };
  for (const t of flat.filter((x) => x.type === 'color' && x.path[0] !== 'global')) {
    const b = h('button', 'g-swatch'); b.type = 'button';
    const c = h('span', 'g-chipc'); c.style.background = `var(${t.name})`;
    b.append(c, h('span', '', t.name.replace('--', '')));
    b.addEventListener('click', () => show(t.name));
    grid.appendChild(b);
  }
  s.append(grid, detail);
  show('--color-text-primary');
}
{
  const s = section('Foundations', 'f-type', 'Typography', '글자 묶음(text-*)', 'foundation');
  for (const t of flat.filter((x) => x.path[0] === 'text')) { const p = h('div', '', `${t.path[1]} — 다람쥐 헌 쳇바퀴에 타고파 Aa 123`); p.style.font = `var(${t.name})`; row(s, t.path[1], [p]); }
}
{
  const s = section('Foundations', 'f-space', 'Spacing', '4px 격자(+ 2px)', 'foundation');
  for (const t of flat.filter((x) => x.path[0] === 'space')) { const b = h('span', 'g-bar-sp'); b.style.width = `var(${t.name})`; row(s, `${t.path[1]} · ${t.value}`, [b]); }
}
{
  const s = section('Foundations', 'f-radius', 'Radius', '둥글기', 'foundation');
  row(s, '', flat.filter((x) => x.path[0] === 'radius').map((t) => { const b = h('span', 'g-box'); b.style.borderRadius = `var(${t.name})`; return [b, `${t.path[1]} ${t.value}`] as [Node, string]; }));
}
{
  const s = section('Foundations', 'f-elev', 'Elevation', '그림자 — 떠 있는 것에만', 'foundation');
  row(s, '', flat.filter((x) => x.path[0] === 'elevation').map((t) => { const b = h('span', 'g-box'); b.style.boxShadow = `var(${t.name})`; b.style.background = 'var(--color-surface-primary)'; return [b, t.path[1]] as [Node, string]; }));
}
{
  const s = section('Foundations', 'f-icons', 'Icons', `Lucide 24개 · 선 1.5px(크기와 상관없이) — ${(iconsJson as { $source: string }).$source}`, 'foundation');
  const names = Object.keys((iconsJson as { icons: Record<string, string> }).icons) as IconName[];
  row(s, 'md 16', names.map((n) => [icon(n), n] as [Node, string]));
  row(s, 'sm · lg', [icon('settings', 'sm'), icon('settings'), icon('settings', 'lg')]);
}

// ── Components(30) ──────────────────────────────────
const variants = ['primary', 'secondary', 'ghost', 'danger', 'link'] as const;
{
  const s = section('Action', 'c-button', 'Button', '5변형 × 3크기 · 상태 7', 'component');
  for (const v of variants) row(s, v, (['sm', 'md', 'lg'] as const).map((z) => [button({ variant: v, size: z, label: '실행' }).el, z] as [Node, string]));
  for (const v of variants) row(s, `${v} 상태`, STATES.map((st) => {
    const b = button({ variant: v, label: st });
    if (st === 'Hover' || st === 'Active') force(b.el, 'is-hover');
    if (st === 'Focus') force(b.el, 'is-focus');
    if (st === 'Disabled') b.setDisabled(true);
    if (st === '잠김') b.setLocked('잠긴 까닭');
    if (st === 'Loading') b.setLoading(true);
    return [b.el, st] as [Node, string];
  }));
  row(s, '아이콘', [button({ label: '새 변수', icon: 'plus' }).el, button({ variant: 'primary', label: '다음', iconEnd: 'arrow-right' }).el]);
  meta(s, { tokens: 'color-primary · color-secondary-* · color-state-error(-hover) · radius-small · size-control-* · text-label(-sm) · elevation-1 · focus-ring-default', code: "button({ variant: 'primary', size: 'md', label })  ·  <button class=\"ds-btn ds-btn--primary\">", a11y: '<button type="button">, 잠김은 aria-disabled + 사유' });
}
{
  const s = section('Action', 'c-iconbutton', 'Icon Button', 'Ghost(기본) · Secondary / sm 24 · md 28 — 아이콘은 늘 16', 'component');
  row(s, 'ghost', [[iconButton({ icon: 'settings', label: '설정', size: 'sm' }), 'sm'], [iconButton({ icon: 'settings', label: '설정' }), 'md'], [force(iconButton({ icon: 'x', label: '닫기' }), 'is-hover'), 'hover'], [force(iconButton({ icon: 'x', label: '닫기' }), 'is-focus'), 'focus']]);
  row(s, 'secondary', [[iconButton({ icon: 'plus', label: '추가', variant: 'secondary', size: 'sm' }), 'sm'], [iconButton({ icon: 'plus', label: '추가', variant: 'secondary' }), 'md']]);
  meta(s, { tokens: 'size-control-sm · -md · size-icon-md · color-text-secondary · color-interactive-hover', code: "iconButton({ icon: 'settings', label })", a11y: 'aria-label · data-tip 필수' });
}
{
  const s = section('Action', 'c-buttongroup', 'Button Group', '붙임 · 띄움', 'component');
  row(s, '붙임', [buttonGroup([button({ label: '왼쪽' }).el, button({ label: '가운데' }).el, button({ label: '오른쪽' }).el], { label: '맞춤' })]);
  row(s, '띄움', [buttonGroup([button({ label: '취소', variant: 'ghost' }).el, button({ label: '확인', variant: 'primary' }).el], { attached: false })]);
  meta(s, { tokens: 'radius-small · space-2', code: 'buttonGroup(buttons, { attached })', a11y: '붙임은 role="group" + aria-label' });
}
{
  const s = section('Action', 'c-split', 'Split Button', '주 버튼 + 펼침', 'component');
  row(s, '', [splitButton({ label: '내보내기', menuLabel: '형식 고르기', variant: 'primary', menu: [] }), splitButton({ label: '내보내기', menuLabel: '형식 고르기', menu: [] })]);
  meta(s, { tokens: 'color-border-on-primary · color-border-default', code: 'splitButton({ label, menuLabel, variant, menu })', a11y: '펼침 단추 aria-haspopup="menu" · aria-expanded' });
}
{
  const s = section('Form', 'c-input', 'Input', 'md 28 · sm 24 · 상태', 'component');
  row(s, '크기', [[input({ placeholder: 'md' }), 'md'], [input({ placeholder: 'sm', size: 'sm' }), 'sm']]);
  const hov = input({ value: 'Hover' }) as HTMLInputElement; const foc = input({ value: 'Focus' }) as HTMLInputElement; const dis = input({ value: 'Disabled' }) as HTMLInputElement; dis.disabled = true;
  row(s, '상태', [[input({ value: 'Default' }), 'Default'], [force(hov, 'is-hover'), 'Hover'], [force(foc, 'is-focus'), 'Focus'], [dis, 'Disabled']]);
  row(s, '라벨 · 오류', [input({ label: '이름', value: 'spacing/8', help: '그룹/이름' }), input({ label: '이름', value: '', invalid: true, error: '이름을 써 주세요' })]);
  meta(s, { tokens: 'color-surface-secondary · color-border-default/-strong · color-interactive-focus · focus-ring-field · color-state-error', code: "input({ value, label, help, error })", a11y: '<label for> 또는 aria-label' });
}
{
  const s = section('Form', 'c-textarea', 'Textarea', '최소 3줄 · mono', 'component');
  row(s, '', [textarea({ value: '여러 줄 입력' }), textarea({ value: 'color.primary → #111111', mono: true })]);
  meta(s, { tokens: 'text-body · text-mono', code: 'textarea({ value, rows, mono })', a11y: 'Input과 같음' });
}
{
  const s = section('Form', 'c-select', 'Select', '그릇 + chevron-down', 'component');
  row(s, '', [select({ options: [{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }], value: 'light' }), select({ options: [{ value: 'a', label: 'sm' }], size: 'sm' })]);
  meta(s, { tokens: 'size-icon-sm · space-2', code: 'select({ options, value, size })', a11y: '기본 <select> 그대로' });
}
{
  const s = section('Form', 'c-checkbox', 'Checkbox', '끔 · 켬 · 일부 · 포커스 · 꺼짐 · 잠김', 'component');
  const dis = checkbox({ label: '꺼짐' }); (dis.querySelector('input') as HTMLInputElement).disabled = true;
  const fc = checkbox({ label: '포커스' }); force(fc.querySelector('input') as HTMLElement, 'is-focus');
  row(s, '', [checkbox({ label: '끔' }), checkbox({ label: '켬', checked: true }), checkbox({ label: '일부', indeterminate: true }), fc, dis, checkbox({ label: '잠김', locked: '유료' }), checkbox({ label: '잠김 켬', checked: true, locked: '유료' })]);
  meta(s, { tokens: 'size-checkbox · radius-xs · color-border-strong · color-interactive-focus · opacity-disabled', code: "checkbox({ label, checked, indeterminate })", a11y: '기본 체크박스(키보드 · 화면 읽기 그대로)' });
}
{
  const s = section('Form', 'c-radio', 'Radio', '그룹', 'component');
  row(s, '', [radioGroup({ name: 'g-r', legend: '모드', options: [{ value: 'l', label: 'Light' }, { value: 'd', label: 'Dark' }], value: 'l' })]);
  meta(s, { tokens: 'radius-full · border-width-thick', code: 'radioGroup({ name, legend, options, value })', a11y: '<fieldset> + <legend>' });
}
{
  const s = section('Form', 'c-toggle', 'Toggle', '끔 · 켬 · 일부 · 포커스 · 꺼짐', 'component');
  const off = toggle({ label: '끔' }); const dis = toggle({ label: '꺼짐', checked: true }); dis.disabled = true;
  row(s, '', [[off, '끔'], [toggle({ label: '켬', checked: true }), '켬'], [toggle({ label: '일부', mixed: true }), '일부'], [force(toggle({ label: '포커스', checked: true }), 'is-focus'), '포커스'], [dis, '꺼짐']]);
  meta(s, { tokens: 'size-toggle-w/-h · color-primary · color-border-strong · toggle-knob-shadow', code: "toggle({ checked, mixed, label })", a11y: '<button role="switch" aria-checked>' });
}
{
  const s = section('Form', 'c-search', 'Search Field', '돋보기 + 지우기', 'component');
  row(s, '', [searchField({ placeholder: '변수 검색', clearLabel: '검색 지우기' }), searchField({ placeholder: '목록 머리(26)', clearLabel: '검색 지우기', compact: true })]);
  meta(s, { tokens: 'size-icon-md · size-compact', code: 'searchField({ placeholder, clearLabel, onInput, onClear })', a11y: 'type="search" · 지우기 aria-label' });
}
{
  const s = section('Navigation', 'c-tab', 'Tab', '밑줄형 · 세그먼트형', 'component');
  const items = [{ value: 's', label: '선택' }, { value: 'v', label: '변수' }, { value: 't', label: '도구' }];
  row(s, '밑줄', [tabs({ items, value: 's', label: '탭' })]);
  row(s, '세그먼트', [tabs({ items, value: 'v', label: '탭', kind: 'segment' })]);
  meta(s, { tokens: 'size-nav · text-label(-sm) · border-width-thick · color-primary · elevation-1', code: "tabs({ items, value, label, kind })", a11y: 'tablist · tab · aria-selected · 화살표 키' });
}
{
  const s = section('Navigation', 'c-navitem', 'Navigation Item', '보통 · 2단 · 고름 · 위험', 'component');
  const w = h('div'); w.style.width = 'var(--size-modal-sm)';
  w.append(navItem({ label: 'Global', count: 24 }), navItem({ label: 'color', level: 2, count: 8 }), navItem({ label: 'Semantic', count: 12, selected: true }), force(navItem({ label: 'Hover', count: 3 }), 'is-hover'), navItem({ label: '삭제된 변수', danger: true }));
  row(s, '', [w]);
  meta(s, { tokens: 'size-control-md · nav-item-gap · color-surface-selected · nav-selected-badge-bg', code: "navItem({ label, count, level, selected })", a11y: 'listbox면 option + aria-selected' });
}
{
  const s = section('Navigation', 'c-breadcrumb', 'Breadcrumb', '링크 · 구분 · 마지막', 'component');
  row(s, '', [breadcrumb([{ label: 'Global' }, { label: 'color' }, { label: 'gray/950' }], '위치')]);
  meta(s, { tokens: 'color-text-link · color-text-tertiary · text-body-sm', code: 'breadcrumb(items, label)', a11y: '<nav aria-label> + <ol> · aria-current="page"' });
}
{
  const s = section('Navigation', 'c-steps', 'Step Indicator', '지남 · 지금 · 남음', 'component');
  row(s, '', [steps({ items: ['색', '토큰', '테마', '타이포'], current: 1 })]);
  meta(s, { tokens: 'color-primary · color-surface-selected · color-border-strong · text-caption', code: 'steps({ items, current })', a11y: '<ol> + aria-current="step"' });
}
{
  const s = section('Data Display', 'c-badge', 'Badge', '기본 · 상태 · solid · outline · dot', 'component');
  row(s, '', [badge({ text: '24', label: '변수 24개' }), badge({ text: '완료', tone: 'success', icon: 'circle-check' }), badge({ text: '주의', tone: 'warning', icon: 'triangle-alert' }), badge({ text: '오류', tone: 'error', icon: 'circle-alert' }), badge({ text: '안내', tone: 'info', icon: 'info' }), badge({ text: 'N', tone: 'solid' }), badge({ text: 'LIB', outline: true }), badge({ text: '3', dot: true }), badge({ text: '✓', dot: true, tone: 'success' }), badge({ text: '!', dot: true, tone: 'error' })]);
  meta(s, { tokens: 'text-caption · radius-xs · color-state-*(-subtle) · color-surface-inverse', code: "badge({ text, tone, icon, outline, dot })", a11y: '숫자만이면 aria-label로 뜻' });
}
{
  const s = section('Data Display', 'c-tag', 'Tag', '태그 · 주의 · outline · 변수 칩', 'component');
  row(s, '', [tag({ text: 'color' }), tag({ text: '직접 만든 변수', tone: 'warn' }), tag({ text: 'outline', tone: 'outline' }), chip({ alias: '→ gray/900', value: '#111111' }), chip({ value: '8' })]);
  meta(s, { tokens: 'radius-full · text-body-sm · chip-*', code: "tag({ text, tone })  ·  chip({ alias, value })", a11y: '누를 수 있으면 <button>' });
}
{
  const s = section('Data Display', 'c-tooltip', 'Tooltip', '마우스를 올리거나 포커스 — 위아래 뒤집기 · 창 안 클램프', 'component');
  const b = button({ label: '올려 보기' }).el; b.dataset.tip = '툴팁 — data-tip 또는 title';
  row(s, '', [b, iconButton({ icon: 'circle-help', label: '도움말' })]);
  meta(s, { tokens: 'color-surface-inverse · text-body-sm · radius-small · elevation-2 · z-tooltip', code: 'tooltip(root)  — [data-tip] · [title]에 위임', a11y: '보조 — 뜻은 aria-label에' });
}
{
  const s = section('Data Display', 'c-card', 'Card', '안에 Card 금지', 'component');
  row(s, '', [card({ title: '변수 없는 값 2곳', desc: 'Spacing 2', body: button({ label: '2곳 연결', variant: 'primary' }).el })]);
  meta(s, { tokens: 'color-border-default · radius-medium · space-3 · text-heading-sm', code: "card({ title, desc, body })", a11y: '' });
}
{
  const s = section('Data Display', 'c-listitem', 'List Item', '구분선 · plain · 두 줄 · 고름', 'component');
  const w = h('div'); w.style.width = 'var(--size-modal-md)';
  const sel = listItem({ title: '고른 줄', sub: '둘째 줄' }); sel.setAttribute('aria-selected', 'true');
  w.append(listItem({ lead: icon('info'), title: 'color/gray/950', sub: '#101828 · Layer 31', trail: badge({ text: '3' }) }), force(listItem({ title: 'Hover' }), 'is-hover'), sel, listItem({ title: 'plain', plain: true }));
  row(s, '', [w]);
  meta(s, { tokens: 'list-row-pad-x · color-border-default · color-surface-selected', code: "listItem({ lead, title, sub, trail, plain })", a11y: '고를 수 있으면 role="option"' });
}
{
  const s = section('Data Display', 'c-table', 'Table', '머리 · 줄 · 숫자 칸', 'component');
  row(s, '', [table({ columns: [{ key: 'n', label: '이름' }, { key: 'v', label: '값', num: true }], rows: [{ n: 'spacing/4', v: '4' }, { n: 'spacing/8', v: '8' }] })]);
  meta(s, { tokens: 'text-label-sm · color-border-strong · text-mono', code: 'table({ columns, rows })', a11y: '<table> + <th scope>' });
}
{
  const s = section('Data Display', 'c-progress', 'Progress Indicator', '막대 · 오류 · 돌기', 'component');
  const p1 = progress({ value: 40, max: 100, label: '진행' }); p1.style.width = 'var(--size-modal-sm)';
  const p2 = progress({ value: 70, max: 100, label: '진행', error: true }); p2.style.width = 'var(--size-modal-sm)';
  row(s, '', [p1, p2, spinner({ label: '불러오는 중' }), spinner({ size: 'sm', label: '불러오는 중' })]);
  meta(s, { tokens: 'color-primary · color-surface-secondary · color-state-error · motion-duration-spin', code: 'progress({ value, max, label })  ·  spinner({ size, label })', a11y: 'progressbar + aria-valuenow · 돌기 role="status"' });
}
{
  const s = section('Feedback', 'c-alert', 'Alert', '띠 4종 · 상자', 'component');
  for (const tone of ['info', 'success', 'warning', 'error'] as const) s.appendChild(alert({ tone, title: tone, text: '알림 글 — 한두 문장', closeLabel: '닫기', onClose: () => undefined }));
  s.appendChild(alert({ tone: 'error', text: '상자(카드 밖)', box: true }));
  meta(s, { tokens: 'color-state-*(-subtle · -border) · radius-small/-medium · text-body-sm', code: "alert({ tone, title, text, box, onClose })", a11y: '오류 role="alert", 나머지 role="status"' });
}
{
  const s = section('Feedback', 'c-toast', 'Toast', '한 번에 하나 · 4초(동작이 있으면 남음)', 'component');
  row(s, '', [button({ label: '성공 Toast', onClick: () => toast({ tone: 'success', text: 'Global 변수 5개를 만들고 97곳에 연결했어요', closeLabel: '닫기' }) }).el, button({ label: '실패 Toast', onClick: () => toast({ tone: 'error', text: '연결 실패', closeLabel: '닫기', action: { label: '보기', onClick: () => undefined } }) }).el]);
  meta(s, { tokens: 'color-surface-inverse · radius-large · elevation-2 · z-tooltip', code: "toast({ tone, text, closeLabel, action, sticky })", a11y: 'role="status" · aria-live(오류 assertive)' });
}
{
  const s = section('Feedback', 'c-modal', 'Modal', '머리 · 본문 · 바닥 — Tab 가두기 · Esc', 'component');
  row(s, '', [button({ label: '모달 열기', onClick: () => openModal({ title: 'color/text/default', body: input({ label: '이름', value: 'color/text/default' }), closeLabel: '닫기', actions: [{ label: '닫기', variant: 'ghost' }, { label: '저장', variant: 'primary' }] }) }).el]);
  meta(s, { tokens: 'color-overlay · size-modal-md · radius-large · elevation-3 · z-modal', code: "openModal({ title, body, actions, closeLabel })", a11y: 'role="dialog" · aria-modal · aria-labelledby' });
}
{
  const s = section('Feedback', 'c-confirm', 'Confirm Dialog', '위험하면 처음 포커스가 취소', 'component');
  row(s, '', [button({ label: '지우기 확인', variant: 'danger', onClick: () => { void confirmDialog({ title: '변수 3개를 지울까요?', text: '⌘Z로 되돌릴 수 있어요.', confirmLabel: '지우기', cancelLabel: '취소', closeLabel: '닫기', danger: true }); } }).el]);
  meta(s, { tokens: 'size-modal-sm', code: "confirmDialog({ title, text, confirmLabel, cancelLabel, danger }) → Promise<boolean>", a11y: 'role="alertdialog"' });
}
{
  const s = section('Feedback', 'c-empty', 'Empty State', '아이콘 · 제목 · 설명 · 동작', 'component');
  s.appendChild(stateView({ kind: 'empty', title: '아직 변수가 없어요', text: '선택에서 변수를 만들어 보세요', action: { label: '변수 만들기', onClick: () => undefined } }));
  meta(s, { tokens: 'space-8 · size-icon-lg · text-display', code: "stateView({ kind: 'empty', title, text, action })", a11y: '제목은 머리 요소' });
}
{
  const s = section('Feedback', 'c-loading', 'Loading State', '뼈대 줄', 'component');
  s.appendChild(skeleton(4, '불러오는 중'));
  meta(s, { tokens: 'color-surface-secondary · radius-full', code: 'skeleton(rows, label)', a11y: 'aria-busy="true" + 숨은 글' });
}
{
  const s = section('Feedback', 'c-error', 'Error State', '아이콘 · 다시 시도', 'component');
  s.appendChild(stateView({ kind: 'error', title: '읽지 못했어요', text: '선택이 바뀌었을 수 있어요', action: { label: '다시 시도', onClick: () => undefined } }));
  meta(s, { tokens: 'color-state-error', code: "stateView({ kind: 'error', … })", a11y: 'role="alert"' });
}
{
  const s = section('Feedback', 'c-success', 'Success State', '완료', 'component');
  s.appendChild(stateView({ kind: 'success', title: '모두 연결했어요' }));
  meta(s, { tokens: 'color-state-success', code: "stateView({ kind: 'success', title })", a11y: 'role="status"' });
}

// ── Layouts(9) ──────────────────────────────────────
function lay(id: string, title: string, desc: string, build: () => HTMLElement): void {
  const s = section('Layouts', id, title, desc, 'layout');
  const box = h('div', 'g-lay'); box.appendChild(build()); s.appendChild(box);
}
const header = (): HTMLElement => { const e = h('div', 'ds-header'); const b = h('span', 'ds-header__brand'); b.append(icon('circle-check'), document.createTextNode('DSL')); e.append(b, h('span', 'ds-header__scope', 'Card · 선택 1개'), iconButton({ icon: 'settings', label: '설정' }), iconButton({ icon: 'circle-help', label: '도움말' })); return e; };
const navbar = (): HTMLElement => { const e = h('div', 'ds-navbar'); e.appendChild(tabs({ items: [{ value: 's', label: '선택' }, { value: 'v', label: '변수' }, { value: 't', label: '도구' }], value: 's', label: '탭' })); return e; };
const pageHeader = (): HTMLElement => { const e = h('div', 'ds-page-header'); e.append(iconButton({ icon: 'arrow-left', label: '돌아가기', size: 'sm' }), h('h2', 'ds-page-header__title', '변수 만들기'), h('span', 'ds-page-header__aside', 'Card에서 찾은 값')); return e; };
const actionbar = (): HTMLElement => { const e = h('div', 'ds-actionbar'); const a = h('div', 'ds-actionbar__start'); a.appendChild(button({ label: '취소', variant: 'ghost' }).el); const b = h('div', 'ds-actionbar__end'); b.append(button({ label: '이름 정리' }).el, button({ label: '변수 5개 만들기', variant: 'primary' }).el); e.append(a, b); return e; };
lay('l-layout', 'PluginLayout', '그릇 — Header · Navigation · (Page Header) · 본문(스크롤) · Bottom Action Bar', () => { const e = h('div', 'ds-layout'); const bd = h('div', 'ds-layout__body'); bd.appendChild(h('p', '', '본문')); e.append(header(), navbar(), pageHeader(), bd, actionbar()); return e; });
lay('l-header', 'Plugin Header', '브랜드 · 선택 대상 · ⚙ · 도움말', header);
lay('l-navbar', 'Navigation', '밑줄형 탭 한 줄', navbar);
lay('l-pageheader', 'Page Header', '← · 제목 · 보조 정보', pageHeader);
lay('l-section', 'Content Section', '절 제목 · 설명 · 본문', () => { const e = h('div', 'ds-section'); e.append(h('h3', 'ds-section__title', '색'), h('p', 'ds-section__desc', '선택에서 찾은 색')); const b = h('div', 'ds-section__body'); b.appendChild(button({ label: '색 변수 만들기' }).el); e.appendChild(b); return e; });
lay('l-settings', 'Settings Section', '라벨 · 설명 · 컨트롤', () => { const e = h('div', 'ds-settings'); for (const [l, d] of [['격자 기본값', '간격을 맞출 단위'], ['언어', '화면 글']]) { const r = h('div', 'ds-settings__row'); const lb = h('div'); lb.append(h('span', 'ds-settings__label', l), h('span', 'ds-settings__desc', d)); r.append(lb, input({ value: '4', size: 'sm' })); e.appendChild(r); } return e; });
lay('l-result', 'Result Section', '요약 · 목록 · 빈/오류 자리', () => { const e = h('div', 'ds-result'); e.append(h('div', 'ds-result__summary', 'Global 5개 · 97곳 연결'), listItem({ title: 'color/gray/950', sub: 'Layer 31' }), listItem({ title: 'spacing/8', sub: 'Layer 22' })); return e; });
lay('l-actionbar', 'Bottom Action Bar', '왼쪽 Ghost · 오른쪽 끝 Primary 하나', actionbar);
lay('l-modal', 'Modal Layout', '머리 · 본문 · 바닥(Modal 안의 짜임)', () => { const m = h('div', 'ds-modal'); const hd = h('div', 'ds-modal__header'); hd.append(h('h2', 'ds-modal__title', '변수 상세'), iconButton({ icon: 'x', label: '닫기', size: 'sm' })); const bd = h('div', 'ds-modal__body'); bd.appendChild(input({ label: '이름', value: 'color/text/default' })); const ft = h('div', 'ds-modal__footer'); ft.append(button({ label: '닫기', variant: 'ghost' }).el, button({ label: '저장', variant: 'primary' }).el); m.append(hd, bd, ft); return m; });

tooltip(document.body);
($('gNarrow') as HTMLInputElement).addEventListener('change', (e) => document.body.classList.toggle('g-narrow', (e.target as HTMLInputElement).checked));
