/**
 * 문구 검사(IA v3 §2.9 · §9 · 부록 A.4 "새 검사") — `npm test`라서 CI에서 돈다.
 *
 * 1. 금지 용어(바인딩 · 스킵 · Paid · Free · 적용 탭 · 붙이기)가 STRINGS 값에 없다.
 * 2. 연결은 "찾기"다 — `bind.*` · `apply.*` · `list.findUnboundTip`에 "미리보기"가 없다.
 * 3. `src/ui.html`의 글자 · title · placeholder · aria-label · data-tip에 금지 용어가 없다
 *    (`<!-- -->` 주석, `<style>`, 개발용 `#devTierRow`는 뺀다).
 * 4. `src/**\/*.ts`(i18n.ts 제외)의 문자열 리터럴에 금지 용어가 없다 — 주석이 걸리지 않게
 *    TypeScript 구문 트리에서 리터럴(문자열 · 템플릿 조각)만 본다.
 * 5. 화면 한국어는 i18n에만(2026-11-04 결정 1): 4번과 같은 리터럴에 한글이 없다. ui.html에서는
 *    `data-i18n` · `data-i18n-html` 요소 안의 글자와, `data-i18n-{title|placeholder|aria-label|tip}`이
 *    붙은 짝 속성값(폴백)만 한글을 허용한다.
 *
 * FREE / PAID(라이선스 "현재" 줄, §2.9 예외)와 티어 id 'free' · 'paid'는 `\b` · 대소문자 때문에 걸리지 않는다.
 * 실패 메시지에 파일:줄과 문구를 낸다. (먼저 `npm run build` — STRINGS를 dist/pure.mjs에서 읽는다)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, resolve } from 'node:path';
import ts from 'typescript';
import { STRINGS } from '../dist/pure.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BANNED = /바인딩|스킵|\bPaid\b|\bFree\b|적용 탭|붙이기/;
const HANGUL = /[가-힣]/;

const show = (list) => '\n' + list.map((x) => `  ${x}`).join('\n');

/* ---------- 1 · 2. STRINGS ---------- */
test('terms 1 — STRINGS 값에 금지 용어가 없다', () => {
  const bad = Object.entries(STRINGS)
    .filter(([, v]) => BANNED.test(v))
    .map(([k, v]) => `src/lib/i18n.ts ${k}: ${v}`);
  assert.deepEqual(bad, [], `금지 용어 ${bad.length}건:${show(bad)}`);
});

test('terms 2 — 연결 문구(bind.* · apply.* · list.findUnboundTip)에 "미리보기"가 없다', () => {
  const bad = Object.entries(STRINGS)
    .filter(([k]) => k.startsWith('bind.') || k.startsWith('apply.') || k === 'list.findUnboundTip')
    .filter(([, v]) => v.includes('미리보기'))
    .map(([k, v]) => `src/lib/i18n.ts ${k}: ${v}`);
  assert.deepEqual(bad, [], `연결은 "찾기"(§2.9) — ${bad.length}건:${show(bad)}`);
});

/* ---------- 3 · 5. ui.html ---------- */
const HTML_PATH = join(ROOT, 'src', 'ui.html');
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
/** 보이는 속성 → 그 폴백을 i18n이 덮는 표시 속성. */
const SHOWN_ATTRS = { title: 'data-i18n-title', placeholder: 'data-i18n-placeholder', 'aria-label': 'data-i18n-aria-label', 'data-tip': 'data-i18n-tip' };

/** 길이를 지키며 지운다(줄 번호가 원문과 맞게 — 줄바꿈은 남긴다). */
const blank = (s) => s.replace(/[^\n]/g, ' ');

/** 열린 태그의 끝 `>` — 따옴표 안은 건너뛴다. */
function endOfOpenTag(html, from) {
  let quote = '';
  for (let i = from; i < html.length; i++) {
    const c = html[i];
    if (quote) {
      if (c === quote) quote = '';
    } else if (c === '"' || c === "'") quote = c;
    else if (c === '>') return i;
  }
  return -1;
}

/** start(‘<’)에서 시작하는 요소의 끝(닫는 태그 뒤) 위치. 같은 이름의 중첩을 센다. */
function endOfElement(html, start) {
  const name = /^<([a-zA-Z][\w-]*)/.exec(html.slice(start, start + 40))[1];
  const open = endOfOpenTag(html, start);
  const re = new RegExp(`</?${name}\\b`, 'gi');
  re.lastIndex = open + 1;
  let depth = 1;
  let m;
  while ((m = re.exec(html))) {
    if (html[m.index + 1] === '/') {
      if (--depth === 0) return html.indexOf('>', m.index) + 1;
    } else {
      const e = endOfOpenTag(html, m.index);
      if (html[e - 1] !== '/') depth++;
      re.lastIndex = e + 1;
    }
  }
  throw new Error(`닫는 태그를 못 찾음: ${name}`);
}

function scrubHtml(raw) {
  let html = raw.replace(/<!--[\s\S]*?-->/g, blank);
  html = html.replace(/<style\b[\s\S]*?<\/style>/gi, blank);
  const dev = html.indexOf('id="devTierRow"');
  assert.ok(dev > 0, '#devTierRow를 찾지 못함 — 검사 범위를 다시 정하세요');
  const s = html.lastIndexOf('<', dev);
  const e = endOfElement(html, s);
  return html.slice(0, s) + blank(html.slice(s, e)) + html.slice(e);
}

const decode = (s) =>
  s.replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (_, x) => ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", nbsp: ' ' })[x]);

/** ui.html을 훑어 { kind: 'text' | 'attr', line, text, allowed(한글 허용 여부), where } 목록을 만든다. */
function htmlPieces() {
  const raw = readFileSync(HTML_PATH, 'utf8');
  const html = scrubHtml(raw);
  const lineAt = (i) => raw.slice(0, i).split('\n').length;
  const pieces = [];
  const stack = []; // { name, i18n }
  let i = 0;
  while (i < html.length) {
    const lt = html.indexOf('<', i);
    const textEnd = lt < 0 ? html.length : lt;
    const text = html.slice(i, textEnd);
    if (text.trim()) {
      const inI18n = stack.some((e) => e.i18n);
      pieces.push({ kind: 'text', line: lineAt(i + text.search(/\S/)), text: decode(text.trim()), allowed: inI18n, where: stack.at(-1)?.name ?? '' });
    }
    if (lt < 0) break;
    if (html[lt + 1] === '/') {
      const name = /^<\/([a-zA-Z][\w-]*)/.exec(html.slice(lt, lt + 40))?.[1]?.toLowerCase();
      const at = stack.map((e) => e.name).lastIndexOf(name);
      if (at >= 0) stack.length = at;
      i = html.indexOf('>', lt) + 1;
      continue;
    }
    if (html[lt + 1] === '!' || html[lt + 1] === '?') {
      i = html.indexOf('>', lt) + 1; // <!doctype>
      continue;
    }
    const end = endOfOpenTag(html, lt);
    const tag = html.slice(lt, end + 1);
    const name = /^<([a-zA-Z][\w-]*)/.exec(tag)?.[1]?.toLowerCase();
    if (!name) {
      i = lt + 1;
      continue;
    }
    const attrs = {};
    for (const m of tag.matchAll(/\s([\w:-]+)(?:="([^"]*)"|='([^']*)')?/g)) attrs[m[1]] = m[2] ?? m[3] ?? '';
    for (const [attr, val] of Object.entries(attrs)) {
      if (attr.startsWith('data-i18n')) continue; // 키(ASCII)
      if (!BANNED.test(val) && !HANGUL.test(val)) continue;
      const shown = attr in SHOWN_ATTRS;
      pieces.push({
        kind: 'attr',
        shown,
        line: lineAt(lt),
        text: decode(val),
        allowed: shown && SHOWN_ATTRS[attr] in attrs,
        where: `<${name}${attrs.id ? `#${attrs.id}` : ''}> ${attr}`,
      });
    }
    const selfClose = tag.endsWith('/>') || VOID.has(name);
    if (!selfClose) stack.push({ name, i18n: 'data-i18n' in attrs || 'data-i18n-html' in attrs });
    i = end + 1;
  }
  return pieces;
}

test('terms 3 — ui.html 글자 · title · placeholder · aria-label · data-tip에 금지 용어가 없다', () => {
  const bad = htmlPieces()
    .filter((p) => (p.kind === 'text' || p.shown) && BANNED.test(p.text))
    .map((p) => `src/ui.html:${p.line} ${p.where}: ${p.text}`);
  assert.deepEqual(bad, [], `금지 용어 ${bad.length}건:${show(bad)}`);
});

test('terms 5a — ui.html 한글은 i18n이 덮는 폴백에만(data-i18n 요소 글자 · data-i18n-* 짝 속성)', () => {
  const pieces = htmlPieces();
  assert.ok(pieces.filter((p) => p.allowed).length > 100, '스캐너가 폴백을 거의 못 찾았다 — 파서를 확인하세요');
  const bad = pieces.filter((p) => !p.allowed && HANGUL.test(p.text)).map((p) => `src/ui.html:${p.line} ${p.where}: ${p.text}`);
  assert.deepEqual(bad, [], `i18n 밖 한글 ${bad.length}건 — STRINGS에 키를 두고 data-i18n(-*)을 붙이세요:${show(bad)}`);
});

/* ---------- 4 · 5. TypeScript 문자열 리터럴 ---------- */
function tsFiles(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) tsFiles(p, out);
    else if (p.endsWith('.ts') && !p.endsWith('.d.ts') && p !== join(ROOT, 'src', 'lib', 'i18n.ts')) out.push(p);
  }
  return out;
}

/** 파일마다 문자열 리터럴 · 템플릿 조각 { file, line, text }. */
function tsLiterals() {
  const out = [];
  for (const file of tsFiles(join(ROOT, 'src'))) {
    const src = readFileSync(file, 'utf8');
    const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true);
    const visit = (node) => {
      if (
        ts.isStringLiteral(node) ||
        ts.isNoSubstitutionTemplateLiteral(node) ||
        ts.isTemplateHead(node) ||
        ts.isTemplateMiddle(node) ||
        ts.isTemplateTail(node)
      ) {
        const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
        out.push({ file: relative(ROOT, file), line, text: node.text });
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }
  return out;
}

test('terms 4 — src/**/*.ts 문자열 리터럴에 금지 용어가 없다(i18n.ts 제외)', () => {
  const lits = tsLiterals();
  assert.ok(lits.length > 1000, '리터럴을 거의 못 찾았다 — 파일 목록을 확인하세요');
  const bad = lits.filter((l) => BANNED.test(l.text)).map((l) => `${l.file}:${l.line}: ${JSON.stringify(l.text)}`);
  assert.deepEqual(bad, [], `금지 용어 ${bad.length}건:${show(bad)}`);
});

test('terms 5b — src/**/*.ts 문자열 리터럴에 한글이 없다(화면 문구는 i18n.ts에만)', () => {
  const bad = tsLiterals()
    .filter((l) => HANGUL.test(l.text))
    .map((l) => `${l.file}:${l.line}: ${JSON.stringify(l.text)}`);
  assert.deepEqual(bad, [], `i18n.ts 밖 한글 리터럴 ${bad.length}건 — STRINGS에 키를 두고 t()로 부르세요:${show(bad)}`);
});
