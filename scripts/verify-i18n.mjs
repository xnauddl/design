/**
 * i18n 정합 검증 — 문자열 테이블과 마크업이 어긋나지 않는지 확인한다.
 *
 * `applyStaticI18n()`이 `[data-i18n]` 요소의 textContent를 `t(key)`로 덮으므로,
 * HTML의 인라인 텍스트는 **폴백일 뿐 화면에 나오는 값이 아니다**. 둘이 갈라지면
 * 마크업만 고친 사람은 화면이 안 바뀌는 이유를 알 수 없다 — 브랜치 병합에서
 * 실제로 두 번 났다(한쪽이 문구를 고치고 다른 쪽이 STRINGS를 그대로 둔 경우).
 * typecheck·테스트로는 안 잡힌다. 여기서 잡는다.
 *
 * 속성으로 보이는 문자열(`data-i18n-title` → `title`, `data-i18n-placeholder` →
 * `placeholder`)도 같은 관계다 — 인라인 속성값이 폴백, STRINGS가 화면값. 툴팁은
 * 호버해야 보여 드리프트가 더 오래 안 들킨다. 그래서 같은 잣대로 함께 본다.
 *
 * 1. 누락  — `data-i18n*` 키가 STRINGS에 없음(하이드레이션이 건너뛰어 조용히 폴백)
 * 2. 드리프트 — STRINGS 값 ≠ 인라인 폴백(둘 중 하나가 낡음)
 * 3. 미참조 — STRINGS에만 있고 아무도 안 쓰는 키(죽은 문자열)
 *
 * 브라우저를 쓰지 않는다. CI에 playwright 브라우저 설치 단계가 없고, 이 검사
 * 하나 때문에 받게 하면 12초짜리 CI가 분 단위가 된다. 대신 `src/ui.html`에는
 * script 태그가 없어(빌드가 JS를 인라인한다) 원문 그대로 훑으면 된다.
 *
 * 사용: node scripts/verify-i18n.mjs   (먼저 `npm run build` — STRINGS를 dist에서 읽는다)
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve, join, extname } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PURE = join(ROOT, 'dist', 'pure.mjs');
const UI_HTML = join(ROOT, 'src', 'ui.html');

if (!existsSync(PURE)) {
  console.error(`dist/pure.mjs 없음 — 먼저 \`npm run build\`. (${PURE})`);
  process.exit(2);
}
const { STRINGS } = await import(pathToFileURL(PURE).href);

/* ---------- 인라인 폴백 추출 ----------
   정규식으로 요소 안쪽을 자르면 중첩(<div>…<b>…</b>…</div>)에서 틀린다.
   따옴표 안의 `>`(예: title="a > b")도 태그 끝으로 오해한다. 작은 스캐너를 쓴다. */

/** 열린 태그의 끝 `>` 위치 — 따옴표 안은 건너뛴다. */
function endOfOpenTag(html, from) {
  let quote = '';
  for (let i = from; i < html.length; i++) {
    const c = html[i];
    if (quote) {
      if (c === quote) quote = '';
    } else if (c === '"' || c === "'") {
      quote = c;
    } else if (c === '>') {
      return i;
    }
  }
  return -1;
}

/** `start`(‘<’ 위치)에서 시작하는 요소의 inner HTML. 같은 이름의 중첩을 센다. */
function innerHtmlAt(html, start) {
  const name = /^<([a-zA-Z][\w-]*)/.exec(html.slice(start, start + 40))?.[1];
  if (!name) return null;
  const open = endOfOpenTag(html, start);
  if (open < 0) return null;
  if (html[open - 1] === '/') return ''; // 자기닫음
  const re = new RegExp(`</?${name}\\b`, 'gi');
  re.lastIndex = open + 1;
  let depth = 1;
  let m;
  while ((m = re.exec(html))) {
    if (html[m.index + 1] === '/') {
      if (--depth === 0) return html.slice(open + 1, m.index);
    } else {
      const e = endOfOpenTag(html, m.index);
      if (e < 0) break;
      if (html[e - 1] !== '/') depth++;
      re.lastIndex = e + 1;
    }
  }
  return null; // 닫는 태그를 못 찾음
}

const html = readFileSync(UI_HTML, 'utf8');
const attrRe = /data-i18n(-html)?="([^"]+)"/g;
const found = []; // { key, inner, html: bool }
let am;
while ((am = attrRe.exec(html))) {
  const start = html.lastIndexOf('<', am.index);
  const inner = innerHtmlAt(html, start);
  found.push({ key: am[2], inner, isHtml: !!am[1] });
}

/* 스캐너가 조용히 놓치면 검사 전체가 무의미해진다 — 속성 수와 추출 수를 맞춰본다. */
const attrCount = (html.match(/data-i18n(-html)?="/g) ?? []).length;
if (found.length !== attrCount) {
  console.error(`✗ 추출 실패: data-i18n 속성 ${attrCount}개 중 ${found.length}개만 파싱됨`);
  process.exit(2);
}
const unparsed = found.filter((f) => f.inner === null);
if (unparsed.length) {
  console.error(`✗ 닫는 태그를 못 찾은 요소: ${unparsed.map((f) => f.key).join(', ')}`);
  process.exit(2);
}

/* ---------- 속성 폴백 추출(data-i18n-title / -placeholder) ----------
   짝이 되는 속성(title/placeholder)이 같은 여는 태그 안에 있어야 폴백이 성립한다.
   없으면 하이드레이션 전 첫 프레임에 툴팁이 통째로 빈다 — 누락으로 잡는다. */
const ATTR_FORMS = ['title', 'placeholder'];
const unescape = (s) =>
  s.replace(/&(amp|lt|gt|quot|#39);/g, (_, e) =>
    ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'" })[e],
  );

const attrFound = []; // { key, inner, form }
const noFallback = [];
for (const form of ATTR_FORMS) {
  const re = new RegExp(`data-i18n-${form}="([^"]+)"`, 'g');
  let m;
  while ((m = re.exec(html))) {
    const start = html.lastIndexOf('<', m.index);
    const end = endOfOpenTag(html, start);
    const tag = html.slice(start, end < 0 ? undefined : end);
    const pair = new RegExp(`\\s${form}="([^"]*)"`).exec(tag);
    if (!pair) noFallback.push(m[1]);
    else attrFound.push({ key: m[1], inner: unescape(pair[1]), form });
  }
}
if (noFallback.length) {
  console.error(`✗ 폴백 속성이 없는 키: ${noFallback.join(', ')} — 같은 태그에 title/placeholder를 함께 두세요`);
  process.exit(2);
}
found.push(...attrFound);

/* ---------- 1·2. 누락 / 드리프트 ---------- */
const missing = [];
const drift = [];
for (const { key, inner } of found) {
  const val = STRINGS[key];
  if (val === undefined) {
    missing.push(key);
    continue;
  }
  if (val.trim() !== inner.trim()) drift.push({ key, val, inner: inner.trim() });
}

/* ---------- 3. 미참조 ---------- */
function srcFiles(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) srcFiles(p, out);
    else if (['.ts', '.mjs', '.js'].includes(extname(p))) out.push(p);
  }
  return out;
}
const code = srcFiles(join(ROOT, 'src'))
  .filter((p) => !p.endsWith(join('lib', 'i18n.ts'))) // 정의부 자신은 제외
  .map((p) => readFileSync(p, 'utf8'))
  .join('\n');

// `t('reason.' + key)` / `` t(`rename.keep.${reason}`) ``처럼 조립되는 키는 접두사만 보고
// 사용된 것으로 친다. 접두사를 하드코딩하면 새 조립 지점이 생길 때마다 오탐이 나므로 코드에서 뽑는다.
const dynPrefixes = [...code.matchAll(/\bt\(\s*(?:'([\w.]+\.)'\s*\+|`([\w.]+\.)\$\{)/g)].map((m) => m[1] ?? m[2]);
const literal = new Set([...code.matchAll(/['"`]([a-z][\w]*(?:\.[\w-]+)+)['"`]/gi)].map((m) => m[1]));
const inMarkup = new Set(found.map((f) => f.key));

const orphan = Object.keys(STRINGS).filter(
  (k) => !inMarkup.has(k) && !literal.has(k) && !dynPrefixes.some((p) => k.startsWith(p)),
);

/* ---------- 보고 ---------- */
let failed = 0;
if (missing.length) {
  failed++;
  console.error(`✗ STRINGS 누락 ${missing.length}건 — 하이드레이션이 건너뛴다`);
  for (const k of missing) console.error(`   · ${k}`);
}
if (drift.length) {
  failed++;
  console.error(`✗ 드리프트 ${drift.length}건 — 화면엔 STRINGS 값이 나온다(인라인은 폴백)`);
  for (const d of drift) {
    console.error(`   · ${d.key}`);
    console.error(`     STRINGS: ${d.val.slice(0, 100)}`);
    console.error(`     인라인 : ${d.inner.slice(0, 100)}`);
  }
}
if (orphan.length) {
  failed++;
  console.error(`✗ 미참조 키 ${orphan.length}건 — 죽은 문자열`);
  for (const k of orphan) console.error(`   · ${k}`);
}
if (!failed) {
  console.log(
    `✓ i18n 정합 — 마크업 ${found.length}개(텍스트 ${found.length - attrFound.length} · 속성 ${attrFound.length}) · ` +
      `STRINGS ${Object.keys(STRINGS).length}개 · 누락 0 · 드리프트 0 · 미참조 0`,
  );
}
process.exit(failed ? 1 : 0);
