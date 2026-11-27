// 디자인 토큰 검사 — docs/design-system.md §8(1–8).
// 화면 코드(ui.html CSS · style="…" · ui.ts · treeList.ts)에 직접 쓴 스타일 값이 없는지, 쓰인 토큰이 원본에 있는지,
// 층 규칙 · 원본 형식 · 대비 · 트리 숫자가 맞는지 본다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { flattenTokens, refsOf } from '../design-tokens/to-css.mjs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const json = JSON.parse(read('design-tokens/tokens.json'));
const tokens = flattenTokens(json);
const byName = new Map(tokens.map((t) => [t.name, t]));
const html = read('src/ui.html');
const styleStart = html.indexOf('<style>') + '<style>'.length;
const styleEnd = html.indexOf('</style>');
const css = html.slice(styleStart, styleEnd).replace(/\/\*[\s\S]*?\*\//g, '');
const bodyHtml = html.slice(styleEnd);
const ts = { 'src/ui.ts': read('src/ui.ts'), 'src/treeList.ts': read('src/treeList.ts') };
/** DS-2 — 컴포넌트 · 레이아웃 · 모음 화면 파일(§8 대상). */
const listFiles = (dir) => (existsSync(new URL(`../${dir}`, import.meta.url)) ? readdirSync(new URL(`../${dir}`, import.meta.url), { recursive: true }).map((f) => `${dir}/${f}`.replace(/\\/g, '/')) : []);
const dsFiles = [...listFiles('src/ui'), ...listFiles('src/gallery')];
const dsCss = Object.fromEntries(dsFiles.filter((f) => f.endsWith('.css')).map((f) => [f, read(f).replace(/\/\*[\s\S]*?\*\//g, '')]));
for (const f of dsFiles.filter((f) => f.endsWith('.ts'))) ts[f] = read(f);
const dsHtml = Object.fromEntries(dsFiles.filter((f) => f.endsWith('.html')).map((f) => [f, read(f)]));

/** §2.3 런타임 변수 — 토큰이 아님. */
const RUNTIME = new Set(['--tabs-h', '--head-top', '--toolbar-top', '--toolbar-h', '--side-top', '--prog', '--band-ic', '--tip-x', '--toast-bottom', '--toast-space-body', '--toast-space-bar', '--toast-space-side']);

/** CSS 선언 [{prop, value, where}] — :root 묶음(자리 표시 · color-scheme)은 뺀다. */
function declsOf(text, where) {
  const out = [];
  const t = text.replace(/:root\s*\{[^}]*\}/, '');
  for (const body of t.matchAll(/\{([^{}]*)\}/g)) {
    for (const d of body[1].split(';')) {
      const m = d.match(/^\s*([a-z-]+)\s*:\s*([\s\S]+?)\s*$/);
      if (m) out.push({ prop: m[1], value: m[2], where });
    }
  }
  return out;
}
const inlineDecls = (styleAttr, where) =>
  styleAttr.split(';').map((d) => d.match(/^\s*([a-z-]+)\s*:\s*([\s\S]+?)\s*$/)).filter(Boolean).map((m) => ({ prop: m[1], value: m[2], where }));

const allDecls = [
  ...declsOf(css, 'ui.html <style>'),
  ...Object.entries(dsCss).flatMap(([f, s]) => declsOf(s, f)),
  ...Object.entries(dsHtml).flatMap(([f, s]) => [...s.matchAll(/style="([^"]*)"/g)].flatMap((m) => inlineDecls(m[1], `${f} style=""`))),
  ...[...bodyHtml.matchAll(/style="([^"]*)"/g)].flatMap((m) => inlineDecls(m[1], 'ui.html style=""')),
  // TS 문자열 안의 style="…"(innerHTML) — ${…} 보간은 값이 변수에서 오므로 뺀다.
  ...Object.entries(ts).flatMap(([f, s]) => [...s.matchAll(/style="([^"]*)"/g)].flatMap((m) => inlineDecls(m[1].replace(/\$\{[^}]*\}/g, 'var(--x-interp)'), `${f} style=""`))),
];

const stripVars = (v) => v.replace(/var\(--[\w-]+(?:\s*,[^()]*(?:\([^()]*\))?[^()]*)?\)/g, ' VAR ');
const stripUrls = (v) => v.replace(/url\((?:"[^"]*"|'[^']*'|[^)]*)\)/g, ' URL ');
const NAMED_COLOR = /\b(white|black|red|green|blue|gray|grey|silver|orange|yellow|purple|pink|navy|teal|maroon)\b/i;
const COLOR_LIT = /#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(/i;
const SPACING = /^(padding|margin)(-(top|right|bottom|left|inline|block))?$|^(gap|row-gap|column-gap)$/;

function violations(d) {
  const v = stripUrls(d.value);
  const bare = stripVars(v);
  const errs = [];
  if (d.prop !== 'font-family' && (COLOR_LIT.test(bare) || NAMED_COLOR.test(bare.replace(/\b(inset|solid|dashed|none)\b/g, ''))) && !/^(grid-template|content)/.test(d.prop)) errs.push('색 직접 값');
  if (/^(font|font-family|font-size|font-weight|letter-spacing|line-height)$/.test(d.prop)) {
    if (bare.replace(/\b(inherit|normal)\b|VAR|\//g, '').trim()) errs.push('글자 직접 값');
  }
  if (SPACING.test(d.prop)) {
    const rest = bare.replace(/calc\(\s*-1\s*\*\s*VAR\s*\)/g, '').replace(/calc\(\s*VAR(?:\s*\+\s*VAR)*\s*\)/g, '').replace(/(^|\s)(0|auto|-1px)(?=\s|$)/g, ' ').replace(/VAR/g, '').trim();
    if (rest) errs.push('간격 직접 값');
  }
  if (d.prop === 'border-radius' && bare.replace(/\b(0|inherit)\b|VAR/g, '').trim()) errs.push('둥글기 직접 값');
  if (/^border(-(top|right|bottom|left))?(-width)?$/.test(d.prop)) {
    const px = [...bare.matchAll(/(-?\d*\.?\d+)px/g)].map((m) => m[1]).filter((n) => n !== '1');
    if (px.length) errs.push('테두리 굵기 직접 값');
  }
  if (d.prop === 'box-shadow' || d.prop === 'outline') {
    if (bare.replace(/\b(none|inset|solid|inherit)\b|(^|[\s,])(0|1px)(?=[\s,]|$)|VAR|,/g, ' ').trim()) errs.push('그림자 · 외곽선 직접 값');
  }
  if (d.prop === 'z-index' && bare.replace(/VAR/g, '').trim()) errs.push('겹침 직접 값');
  if ((d.prop === 'transition' || d.prop === 'animation') && /(^|[\s,])\d*\.?\d+m?s\b/.test(bare)) errs.push('움직임 시간 직접 값');
  return errs;
}

test('§8-1a 선언의 괄호 짝이 맞는다(깨진 선언은 브라우저가 통째로 버린다)', () => {
  const bad = allDecls.filter((d) => (d.value.match(/\(/g) || []).length !== (d.value.match(/\)/g) || []).length).map((d) => `${d.where}: ${d.prop}: ${d.value}`);
  assert.deepEqual(bad, []);
});

test('§8-1 화면 CSS · style="…"에 직접 스타일 값이 없다', () => {
  const bad = allDecls.flatMap((d) => violations(d).map((e) => `${d.where}: ${d.prop}: ${d.value} — ${e}`));
  assert.deepEqual(bad, []);
});

test('§8-2 TS에서 style.* · setProperty에 직접 색 · 간격 · 둥글기를 넣지 않는다', () => {
  const bad = [];
  for (const [f, s] of Object.entries(ts)) {
    for (const m of s.matchAll(/\.style\.(\w+)\s*=\s*(['`])([^'`]*)\2/g)) {
      const [, prop, , val] = m;
      if (/\$\{/.test(val)) continue; // 계산된 값(위치 · 너비 · 사용자 색)
      if (COLOR_LIT.test(val)) bad.push(`${f}: style.${prop} = ${val} — 색`);
      if (/^(margin|padding)/.test(prop) && /\d+px/.test(val)) bad.push(`${f}: style.${prop} = ${val} — 간격`);
      if (/radius/i.test(prop) && /\d+px/.test(val)) bad.push(`${f}: style.${prop} = ${val} — 둥글기`);
    }
    for (const m of s.matchAll(/setProperty\(\s*'(--[\w-]+)'/g)) if (!RUNTIME.has(m[1])) bad.push(`${f}: setProperty(${m[1]}) — 런타임 변수 목록(§2.3)에 없음`);
  }
  assert.deepEqual(bad, []);
});

test('§8-3 쓰인 var(--x)는 모두 원본 토큰이거나 런타임 변수다', () => {
  const sources = { 'ui.html': html.replace(/\/\*[\s\S]*?\*\//g, ''), ...ts, ...dsCss, ...dsHtml };
  const used = new Set();
  const bad = [];
  for (const [f, s] of Object.entries(sources)) {
    for (const m of s.matchAll(/var\((--[\w-]+)/g)) {
      used.add(m[1]);
      if (!byName.has(m[1]) && !RUNTIME.has(m[1]) && m[1] !== '--x-interp') bad.push(`${f}: ${m[1]}`);
    }
  }
  assert.deepEqual([...new Set(bad)], []);
  // 쓰는 곳 0인 Semantic · Component 토큰은 경고만(DS-2 예약은 $extensions.reserved).
  const refd = new Set(tokens.flatMap((t) => refsOf(t.$value)));
  const unused = tokens.filter((t) => t.path[0] !== 'global' && !used.has(t.name) && !refd.has(t.name) && !t.$extensions?.reserved).map((t) => t.name);
  if (unused.length) console.log(`  (경고) 쓰는 곳 없는 토큰 ${unused.length}개: ${unused.join(' ')}`);
});

test('§8-4 층 규칙 — 화면 코드에 Global 없음 · 색 토큰은 Global 하나를 가리킴 · 참조가 끊기거나 돌지 않음', () => {
  const screen = [css, bodyHtml, ...Object.values(ts), ...Object.values(dsCss), ...Object.values(dsHtml)].join('\n');
  assert.equal(/var\(--global-/.test(screen), false, '화면 코드에 var(--global-*)');
  const bad = [];
  for (const t of tokens) {
    for (const r of refsOf(t.$value)) if (!byName.has(r)) bad.push(`${t.name} → ${r} 없음`);
    if (t.$type === 'color' && t.path[0] !== 'global' && !/^\{global\.[\w-]+\}$/.test(t.$value)) bad.push(`${t.name}: 색 토큰은 Global 하나를 가리켜야 함 (${t.$value})`);
  }
  // 돌기 — 참조를 따라가 깊이 10 안에 끝나야 함
  const deref = (name, depth = 0) => {
    if (depth > 10) throw new Error(`참조가 돎: ${name}`);
    for (const r of refsOf(byName.get(name).$value)) deref(r, depth + 1);
  };
  for (const t of tokens) deref(t.name);
  assert.deepEqual(bad, []);
});

test('§8-5 원본 형식 — Global 밖 모든 토큰에 $value · $type · $description', () => {
  const bad = tokens.filter((t) => t.path[0] !== 'global' && !(t.$type && t.$description && '$value' in t)).map((t) => t.name);
  assert.deepEqual(bad, []);
});

// ── 대비(WCAG 2.x 상대 휘도)
const hexOf = (name) => {
  const t = byName.get(name);
  const r = refsOf(t.$value);
  return r.length ? hexOf(r[0]) : t.$value;
};
const lum = (hex) => {
  const h = hex.replace('#', '');
  const c = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => {
  const [x, y] = [lum(hexOf(a)), lum(hexOf(b))];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};
/** §9 열린 결함 — 대비 미달을 허용하는 짝(DS-O1 · DS-O2). */
const CONTRAST_EXCEPTIONS = new Set([
  'color-text-tertiary|color-background-primary',
  'color-state-warning|color-background-primary', 'color-state-warning|color-state-warning-subtle',
  'color-state-error|color-background-primary', 'color-state-error|color-state-error-subtle', 'color-text-inverse|color-state-error',
  'color-state-success|color-state-success-subtle',
]);

test('§8-6 대비 4.5:1 — 예외는 §9 목록의 짝만', () => {
  const C = (n) => `--color-${n}`;
  const pairs = [
    ...['text-primary', 'text-secondary', 'text-emphasis', 'text-link', 'text-tertiary', 'state-success', 'state-warning', 'state-error', 'state-info'].map((f) => [C(f), C('background-primary')]),
    ...['success', 'warning', 'error', 'info'].map((s) => [C(`state-${s}`), C(`state-${s}-subtle`)]),
    [C('text-on-primary'), C('primary')],
    [C('text-inverse'), C('surface-inverse')],
    [C('text-inverse'), C('state-error')],
    [C('text-inverse'), C('state-error-hover')],
    ['--chip-value-text', '--chip-value-bg'],
  ];
  const bad = [];
  for (const [fg, bg] of pairs) {
    const r = ratio(fg, bg);
    const key = `${fg.slice(2)}|${bg.slice(2)}`;
    if (r < 4.5 && !CONTRAST_EXCEPTIONS.has(key)) bad.push(`${key} ${r.toFixed(2)}:1`);
  }
  assert.deepEqual(bad, []);
});

test('§8-7 트리 숫자 — 토큰 · treeList.ts · CSS 세로 선이 같다', () => {
  const px = (n) => parseFloat(byName.get(n).$value);
  const tl = ts['src/treeList.ts'];
  const m = tl.match(/multi \? (\d+) \+ (\d+) \* \(level - 1\)/);
  const l = tl.match(/vlLineX = \(k: number\): number => (\d+) \+ (\d+) \* k/);
  assert.ok(m && l, 'treeList.ts의 x 계산을 찾지 못함');
  assert.equal(px('--tree-content-x'), Number(m[1]));
  assert.equal(px('--tree-indent'), Number(m[2]));
  assert.equal(px('--tree-line-x'), Number(l[1]));
  assert.equal(px('--tree-indent'), Number(l[2]));
  assert.match(css, /\.vt-grp\.has-bar::before[^{]*\{[^}]*left:\s*var\(--tree-line-x\)/);
});

test('§8-8 컴포넌트 CSS의 아이콘 데이터 URI 색은 #FFFFFF뿐이고 color-text-on-primary와 같다', () => {
  const onPrimary = hexOf('--color-text-on-primary').toUpperCase();
  const bad = [];
  for (const [f, s] of Object.entries(dsCss)) {
    for (const m of s.matchAll(/url\(\s*["']?data:image\/svg\+xml,([^"')]*)/g)) {
      const svg = decodeURIComponent(m[1]);
      for (const c of svg.matchAll(/#[0-9a-f]{3,8}\b|\brgba?\([^)]*\)/gi)) {
        if (c[0].toUpperCase() !== '#FFFFFF') bad.push(`${f}: ${c[0]} — #FFFFFF만`);
      }
    }
  }
  assert.equal(onPrimary, '#FFFFFF', 'color-text-on-primary 값이 바뀌면 데이터 URI 색도 함께 바꾼다');
  assert.deepEqual(bad, []);
});
