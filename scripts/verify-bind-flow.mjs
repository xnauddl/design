#!/usr/bin/env node
/* ============================================================
   verify-bind-flow — 적용 › 연결 카드의 상태 흐름 회귀 검사 (헤드리스 브라우저)
   플러그인(code.ts) 없이 dist/ui.html을 띄우고, 실제 시작 순서·경쟁 상황대로 메시지를
   흘려 넣어 화면 상태를 확인한다. 2026-11 검수에서 재현된 7건이 다시 생기지 않게 한다.
     2 늦게 온 응답(이전 연결 현황·이전 선택의 미리보기)은 버린다
     3 선택을 빠르게 바꿔도 연결 현황 요청은 한 번, 그동안 목록은 비우지 않고 흐리게
     4 첫 전제 상태 전에는 ‘먼저 토큰을 생성…’ 경고를 띄우지 않는다
     5 찾는 중 선택이 바뀌면 진행률을 숨긴다
     6 시작 직후 GET_PREREQ는 한 번
     7 560 폭에서도 ‘다음 →’은 툴바 오른쪽 끝
    11 연결 화면(IA v4 §4.2 · B.2): 자동 찾기 + 텍스트 스타일 미리보기 · 카드 1 숫자 · 종류 머리 · (변수, 종류) 줄 · 스위치 ·
       스타일 먼저 · 모두 켜기/끄기 · 건너뜀 칩 · 연결(textStyles 함께) · 첫 화면 + 상태 줄 · 이어받기 · 취소 · 텍스트 스타일만 · 오류
     9 변수 탭(IA v3 PR 2): 불러오는 중·시작 화면·목록, 칩·펼침·간접·LIB·삭제된 변수, 목록 기준, 큰 선택·[읽기], ↻,
       검색, 행 메뉴(교체 없음)·사용 레이어 선택 200개, 상세, 알약 이동·되돌리기, 키보드, ⋯ 팝업, 시작 시 스크립트 오류 0
    10 IA v3 셸(PR 1): 첫 화면 변수 탭, 탭 전환에 크기 요청 0, 선택 표시줄, 하위 화면 기억, 창 다시 들어옴,
       최소화, 잠금 사유, 버튼 줄 고정, 24×24, §8 목록 높이 실측
    12 변수 고치기(PR 3.5): 열 때 포커스, 이름 오류·바뀌는 것 줄, 별칭 고르개(계층·Global·순환·검색), 값 ↔ 별칭,
       저장(고친 것만 + base), 저장 중 잠금, 성공·일부 실패·다른 곳에서 바뀜·삭제됨·이름 거절, ERROR·10초, 버리기 확인, 닫은 뒤 포커스
    14 컴포넌트(베타): 언제나 하위 탭 셋 · [베타] 배지 · 접근성 이름 · 준비 현황 각주 없음 · 켜기 체크박스 없음 · End
    23 UX 검수 C(IA v4 §4.3a · B.14): 색 Layer · 빈 상태 잠금 · 주 버튼 · 팔레트 띠 · 컴포넌트 문구 · 머리 띠
    25 라이선스 구매 버튼(IA v4 §4.10 · B.21): 늘 보임 · 자리표시자면 잠금 · 티어별 글 · 툴팁 꼬리
    30 상태 5 만들기 카드(IA v4 §4.1 · B.30): 남은 값 · 같은 값 줄 · 추출 전 · 실패 · 미리보기 다시 보냄 · 만들기 화면 기본 끔
    31 큰 선택 [읽기] — 찾기 중 미룬 만들기 카드 읽기를 찾기가 끝난 뒤 보냄("선택을 읽는 중…" 멈춤 수정)
   사용: npm run verify:bind  (Chromium 경로가 다르면 CHROMIUM_PATH로 지정)
   ============================================================ */
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const url = 'file://' + join(root, 'dist', 'ui.html');
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const fails = [];
const check = (name, cond, detail = '') => {
  console.log(`${cond ? '✓' : '✗'} ${name}${cond || !detail ? '' : ` — ${detail}`}`);
  if (!cond) fails.push(name);
};

const pageErrors = [];
async function open(width = 560, tab = 'layer') {
  const p = await browser.newPage({ viewport: { width, height: 510 } });
  p.on("pageerror", (e) => { pageErrors.push(e.message); console.log("PAGEERROR", e.message, (e.stack||"").split("\n").slice(0,3).join(" | ")); });
  await p.addInitScript(() => {
    window.__sent = [];
    window.parent.postMessage = (m) => window.__sent.push(m.pluginMessage);
  });
  await p.goto(url);
  if (tab) await goTab(p, tab);
  return p;
}
/** v4 탭 이동 — layer → 선택 탭 › 연결 하위 화면, settings → ⚙, 그 밖은 세그먼트(IA v4 §2.1). */
async function goTab(p, tab) {
  if (tab === 'settings') return p.click('#btnSettings');
  if (tab === 'layer' || ['bind', 'rename', 'structure', 'make'].includes(tab)) return goSub(p, tab === 'layer' ? 'bind' : tab);
  return p.click(`#tabbtn-${tab}`);
}
/** 선택 탭 하위 화면으로 — [data-go-sub] 위임 링크를 잠깐 붙여 누른다. */
async function goSub(p, sub) {
  await p.evaluate((sub) => { const b = document.createElement('button'); b.dataset.goSub = sub; b.id = '__goSub'; document.body.appendChild(b); b.click(); b.remove(); }, sub);
}
const recv = (p, m) => p.evaluate((m) => window.dispatchEvent(new MessageEvent('message', { data: { pluginMessage: m } })), m);
const sent = (p, type) => p.evaluate((t) => window.__sent.filter((m) => m && m.type === t), type);
const lastReq = async (p, type) => (await sent(p, type)).at(-1)?.reqId;
/** 컴포넌트 화면 찾기 — 버튼을 눌러 보낸 reqId로 응답한다(ia-v4 §4.5 — 비운 뒤 늦게 온 응답은 버림). 잠겨 있으면 유료 · 목록 기준을 먼저 준다. */
async function compFound(p, nodes) {
  if (await locked(p, '#btnScanComp')) await recv(p, { type: 'LICENSE_STATUS', tier: 'paid', unlimited: true, source: 'dev' });
  if (await locked(p, '#btnScanComp')) await recv(p, { ...sel(1, 0), ids: ['w1'] });
  await p.click('#btnScanComp');
  await recv(p, { type: 'COMPONENT_CANDIDATES', nodes, reqId: await lastReq(p, 'SCAN_COMPONENT_CANDIDATES') });
}
/** 우클릭 메뉴 열기 — 510 높이에서는 행이 아래에 있어, 클릭 전 스크롤이 메뉴를 닫지 않게 먼저 화면 안으로. */
async function rightClick(p, selector) {
  await p.$eval(selector, (e) => e.scrollIntoView({ block: 'center' }));
  await p.waitForTimeout(100);
  await p.click(selector, { button: 'right' });
}
const tabsOf = (p) => p.$$eval('#makeTabs [role="tab"]:not([hidden])', (e) => e.map((x) => `${x.textContent}${x.getAttribute('aria-selected') === 'true' ? '*' : ''}`));
const visible = (p, sel) => p.$eval(sel, (e) => e.offsetParent !== null && getComputedStyle(e).display !== 'none');

const PREREQ = { type: 'PREREQ_STATE', hasColorVars: true, hasScaleVars: true, hasGlobal: true, hasBindable: true, hasDarkMode: false, hasTextStyles: false, hasSemanticRoles: true };
const sel = (count, bound) => ({ type: 'SELECTION_STATE', count, scanned: count * 40, bindable: 12, capped: false, comps: 0, sets: 0, selfSelect: false, bound, renamed: 0, firstName: 'Card', ids: Array.from({ length: count }, (_, i) => `s${i}`) });
const nodes = [{ id: 'n1', name: 'card', type: 'FRAME', depth: 0, parentId: null }];
const c = (field, v = 'vA') => ({ nodeId: 'n1', field, currentValue: '8', variableId: v, variableName: 'spacing/8', tier: 1 });
const preview = (reqId) => ({ type: 'APPLY_RESULT', preview: true, bound: 2, skipped: 0, reasons: {}, candidates: [c('itemSpacing'), c('paddingLeft')], nodes, skips: [], reqId });

/* 연결 화면(IA v4 §4.2) 읽기 도우미 */
const locked = (p, sel) => p.getAttribute(sel, 'aria-disabled').then((v) => v === 'true');
const named = async (p, sel, name) => (await p.getByRole('button', { name, exact: true }).count()) >= 1 && (await p.$eval(sel, (e, n) => e.textContent.trim() === n, name));
const emptyText = (p) => p.$eval('#bindEmpty', (e) => (e.hidden ? null : e.querySelector('.be-text')?.textContent ?? ''));
const lockMsg = async (p, sel) => { await p.click(sel, { force: true }); return p.textContent('#statusText'); };
/** 목록(트리 §2.7) — 머리는 "이름 {n}개", 줄은 [이름(옅은 칸 — "→ " 뺌), 곳 수(왼쪽 글), 켬](TR 뒤 — ia-v4 §2.7 "변수 목록 모양"). */
const bindList = (p) => p.$$eval('#bindTree > .tr', (e) => e.map((x) => (x.classList.contains('tr-head') ? `${x.querySelector('.tr-name').textContent} ${x.querySelector('.tr-cnt').textContent}` : [x.querySelector('.vchip .al').textContent.replace(/^→ /, ''), x.querySelector('.tr-lt').textContent, x.querySelector('.bv-switch').getAttribute('aria-checked') === 'true'])));
const TS0 = { hasStyle: 0, noStyle: 0, ambiguous: 0, mixed: 0, instance: 0 };
const tsPrev = (reqId, rows = [], skipReasons = {}) => ({ type: 'TEXT_STYLES_PREVIEW', reqId, rows, skipReasons: { ...TS0, ...skipReasons } });
/** 찾기 응답(변수 + 텍스트 스타일) — 마지막 APPLY 차례로. */
async function found(p, extra = {}, rows = [], tsSkips = {}) {
  const id = await lastReq(p, 'APPLY');
  await recv(p, { ...preview(id), ...extra });
  await recv(p, tsPrev(id, rows, tsSkips));
}
/** 선택 탭 → 선택 1개 → 자동 찾기까지(응답 전). */
async function openSel(p, prereq = PREREQ) {
  await recv(p, prereq);
  await recv(p, { type: 'VAR_TABLE', collections: COLS, vars: VARS });
  await recv(p, sel(1, 0));
  await p.waitForTimeout(450);
  const u = (await sent(p, 'SCAN_USAGE')).at(-1);
  if (u) await recv(p, usageResult(u.reqId, {}));
}
const cand = (nodeId, field, variableId, variableName, currentValue = '8', extra = {}) => ({ nodeId, field, currentValue, variableId, variableName, tier: 2, ...extra });
const B2_CANDS = [
  cand('n1', 'itemSpacing', 'sp8', 'spacing/8'),
  cand('n2', 'itemSpacing', 'sp8', 'spacing/8'),
  cand('n1', 'topLeftRadius', 'sp8', 'spacing/8'), // 같은 변수 · 다른 종류 → 줄이 따로
  cand('n1', 'fills', 'tx', 'color/text/default', '#111111', { index: 0, variableValue: '#111111' }),
  cand('t1', 'fontSize', 'fs16', 'font/size/16', '16'), // t1은 스타일 후보 → 빠짐
  cand('t3', 'fontSize', 'fs16', 'font/size/16', '16'),
];
const B2_TS = [{ styleId: 'S:body', name: 'body/medium', nodeIds: ['t1', 't2'] }];


/* 9 — 변수 탭(IA v3 §4.2~§4.4) */
const COLS = [
  { id: 'g', name: 'Global', tier: 1, modes: [{ modeId: 'm', name: 'Mode 1' }], defaultModeId: 'm', tierWhy: { kind: 'ratio', alias: 0, counted: 4 } },
  { id: 's', name: 'Semantic', tier: 2, modes: [{ modeId: 'l', name: 'Light' }, { modeId: 'd', name: 'Dark' }], defaultModeId: 'l', tierWhy: { kind: 'owned' } },
];
const VARS = [
  { id: 'g0', name: 'color/gray/0', collectionId: 'g', type: 'COLOR', values: { m: { kind: 'color', hex: '#FFFFFF' } }, scopes: [], description: '' },
  { id: 'g9', name: 'color/gray/900', collectionId: 'g', type: 'COLOR', values: { m: { kind: 'color', hex: '#111111' } }, scopes: [], description: '' },
  { id: 'sp8', name: 'spacing/8', collectionId: 'g', type: 'FLOAT', values: { m: { kind: 'number', text: '8' } }, scopes: ['GAP'], description: '' },
  { id: 'r4', name: 'radius/4', collectionId: 'g', type: 'FLOAT', values: { m: { kind: 'number', text: '4' } }, scopes: [], description: '' },
  { id: 'tx', name: 'color/text/default', collectionId: 's', type: 'COLOR', values: { l: { kind: 'alias', aliasId: 'g9', aliasName: 'color/gray/900' }, d: { kind: 'alias', aliasId: 'g0', aliasName: 'color/gray/0' } }, scopes: [], description: '' },
];
const usageResult = (reqId, usage, extra = {}) => ({ type: 'USAGE_RESULT', reqId, usage, libraryVars: [], deleted: { count: 0, nodeIds: [] }, scanned: 40, ...extra });
/* 만들기 카드(IA v4 §4.1 상태 6 · B.18) — 카드가 보낸 추출 · 미리보기에 답한다. */
const MC_TOKENS = [
  { name: 'color/101828', category: 'color', value: '#101828', sources: ['fills'], count: 31 },
  { name: 'color/FFFFFF', category: 'color', value: '#FFFFFF', sources: ['fills'], count: 24 },
  { name: 'spacing/8', category: 'gap', value: 8, sources: ['itemSpacing'], count: 22 },
  { name: 'spacing/4', category: 'gap', value: 4, sources: ['itemSpacing'], count: 18 },
  { name: 'radius/8', category: 'radius', value: 8, sources: ['topLeftRadius'], count: 3 },
  { name: 'font-size/16', category: 'fontSize', value: 16, sources: ['fontSize'], count: 9 },
];
/** 카드의 마지막 EXTRACT에 tokens로 답하고, 이어지는 미리보기에 states로 답한다(roles = r). */
async function cardAnswer(p, tokens = MC_TOKENS, states = null, roles = 4) {
  const ex = (await sent(p, 'EXTRACT')).at(-1);
  await recv(p, { type: 'EXTRACT_RESULT', reqId: ex.reqId, warnings: [], selection: 1, tokens });
  await p.waitForTimeout(20);
  const pv = (await sent(p, 'CREATE_TOKENS')).filter((m) => m.preview).at(-1);
  if (pv && pv.reqId > ex.reqId) {
    const st = states ?? Object.fromEntries(pv.tokens.map((tk) => [tk.name, { state: 'new' }]));
    await recv(p, { type: 'CREATE_RESULT', reqId: pv.reqId, preview: true, created: pv.tokens.length, updated: 0, summary: '', roles, skippedManual: 0, tokenStates: st, roleRows: [] });
  }
  await p.waitForTimeout(40);
  return pv;
}
/** 카드 안 카드 찾기(ia-v4 §2.8 · B.12) — 보이는 카드(.step · .sel-card · .modal) 안에서 테두리나 그림자 + 둥근 모서리 + 배경을 모두 가진 요소. */
const nestedCards = (p) => p.evaluate(() => {
  const EX = 'button,input,select,textarea,.tabs,.tag,.r-swatch,.swatch,.mk-row .sw,.palette-row i,.bv-chip,.bv-sw,.bv-track,.bar,.tr-skel,.alias-pill,.vp-item,.tier-chip,.chip,.ed-field,.bf-swatch,.ed-picker,.vr-sw';
  document.activeElement?.blur?.();
  const clear = (c) => c === 'rgba(0, 0, 0, 0)' || c === 'transparent';
  const isCard = (e) => {
    const s = getComputedStyle(e);
    const border = ['Top', 'Right', 'Bottom', 'Left'].some((k) => parseFloat(s[`border${k}Width`]) > 0 && s[`border${k}Style`] !== 'none' && !clear(s[`border${k}Color`]));
    const shadow = s.boxShadow && s.boxShadow !== 'none';
    const round = ['TopLeft', 'TopRight', 'BottomLeft', 'BottomRight'].some((k) => parseFloat(s[`border${k}Radius`]) > 0);
    return (border || shadow) && round && !clear(s.backgroundColor);
  };
  const bad = [];
  for (const card of document.querySelectorAll('.step, .sel-card, .modal')) {
    if (!card.getClientRects().length) continue;
    for (const e of card.querySelectorAll('*')) {
      if (!e.getClientRects().length || e.closest(EX)) continue;
      if (isCard(e)) bad.push(`${e.tagName.toLowerCase()}.${[...e.classList].join('.')}#${e.id}`);
    }
  }
  return bad;
});
const rowShape = (p, s) => p.$eval(s, (e) => { const c = getComputedStyle(e); return { top: c.borderTopWidth, bottom: c.borderBottomWidth, radius: c.borderTopLeftRadius, bg: c.backgroundColor, minH: c.minHeight, pl: c.paddingLeft }; });
const rowIds = (p) => p.$$eval('#varTree .vt-row', (e) => e.map((x) => x.dataset.id));
/** 변수 탭 목록 모양(V-D5 · V-D6) — 그룹 머리 "[마디]"(단 k면 앞에 ">"를 k − 1개 — aria-level), 겹친 단 묶음(role 없음 — V-P3)을 따라 들어가며 줄(role=row)마다:
 *  목록 줄은 "이름|옅은 칸|짙은 칸"(없는 칸은 빈 글자 — 짙은 칸이 숨으면 "-"), 알약 · 격자 묶음은 항목 글(동그라미는 "dot")을 ","로.
 *  묶음에 role이 있거나 모르는 것이면 "?{class}". */
const treeShape = (p) => p.$eval('#varTree', (root) => {
  const out = [];
  const walk = (el) => {
    for (const x of el.children) {
      if (x.classList.contains('vt-group')) out.push(`${'>'.repeat(Number(x.getAttribute('aria-level') ?? 1) - 1)}[${x.querySelector('.lb').textContent}]`);
      else if (x.classList.contains('vt-grp') && !x.hasAttribute('role')) walk(x);
      else if (x.getAttribute('role') === 'row') {
        const c = x.querySelector('.vt-row');
        if (c) out.push([c.querySelector('.nm').textContent, c.querySelector('.vchip .al')?.textContent ?? '', c.querySelector('.vchip .vl')?.textContent ?? '-'].join('|'));
        else out.push([...x.querySelectorAll('.vp-item')].map((i) => i.textContent || 'dot').join(','));
      } else out.push(`?${x.className}`);
    }
  };
  walk(root);
  return out;
});
/** 사이드바 항목 [이름, 숫자] (결정 B). */
const sideItems = (p) => p.$$eval('#varSide .vs-item', (e) => e.map((x) => [x.querySelector('.vs-name').textContent, x.querySelector('.vs-num').textContent]));
const sideSelected = (p) => p.$eval('#varSide [aria-selected="true"]', (e) => e.dataset.key).catch(() => null);
{
  // B.3 변수 탭(IA v4 §4.6~§4.9) — 머리 줄 · 사이드바 · 팔레트 · 줄 · 클릭 연결 · 메뉴 · 상세 · 새 변수 · 복제 · 삭제
  const p = await open(560, 'variables');
  await recv(p, PREREQ);
  check('9 첫 표 전에는 불러오는 중', await visible(p, '#varLoading'));
  await recv(p, { type: 'VAR_TABLE', collections: [], vars: [] });
  check('9 로컬 변수 0개 → "아직 변수가 없어요" 빈 상태(v4 §4.6)', (await visible(p, '#varEmpty')) && !(await visible(p, '#varList')));
  check('9 빈 상태 [선택에서 변수 만들기] — 선택 없으면 잠금', await locked(p, '#btnVarEmptyMake'));
  // 선택이 바뀌면 잠금도 따라간다(B.15 — 쓰는 변수 결과로 변수 탭을 다시 그리지 않아도)
  await recv(p, { ...sel(1, 0), scanned: 40, ids: ['1:2'] });
  const unlocked9 = !(await locked(p, '#btnVarEmptyMake'));
  await recv(p, { ...sel(0, 0), scanned: 0, ids: [] });
  check('9 빈 상태 [선택에서 변수 만들기] — 선택을 따라감(선택 1 → 풀림 · 0 → 잠김)', unlocked9 && (await locked(p, '#btnVarEmptyMake')), String(unlocked9));
  await recv(p, { type: 'VAR_TABLE', collections: COLS, vars: VARS });
  check('9 로컬 변수 있음 → 목록', await visible(p, '#varList'));
  check('9 머리 줄 — 검색 칸 · ＋ · ⋯ (검색 단추 · 목록 제목 없음)', (await visible(p, '#varSearch')) && (await p.$('#btnSearch')) === null && (await p.$('#varMainTitle')) === null);
  check('9 사이드바 = 컬렉션만 · 계층 순서 · 전체 수', JSON.stringify(await sideItems(p)) === JSON.stringify([['Semantic', '1'], ['Global', '4']]), JSON.stringify(await sideItems(p)));
  check('9 사이드바 listbox · option', (await p.getAttribute('#varSide', 'role')) === 'listbox' && (await p.$$eval('#varSide .vs-item', (e) => e.every((x) => x.getAttribute('role') === 'option'))));
  check('9 처음에는 첫 컬렉션', (await sideSelected(p)) === 'side:col:s');
  check('9 모드 ▾(보이는 모드 2개 이상)', await visible(p, '#modeSelect'));
  // Semantic = 줄(끝 이름 · 값 알약), 그룹 머리, 사용 칸 없음
  check('9 Semantic 줄 — 경로 마디마다 머리(color › text — V-D6) + 끝 이름 · 칩 옅은 칸 "→ gray/900" → 짙은 칸 "#111111" · 사용 칸 없음(V-D5)', JSON.stringify(await treeShape(p)) === JSON.stringify(['[color]', '>[text]', 'default|→ gray/900|#111111']) && (await p.$('.vt-row .use')) === null, JSON.stringify(await treeShape(p)));
  // Global = 팔레트 — 종류 순서(간격 → 반경 → 색), 알약 · 동그라미
  await p.click('#varSide [data-key="side:col:g"]');
  const pal = await treeShape(p);
  check('9 Global 팔레트 — 종류 순서 간격 → 반경 → 색(color › gray — V-D6) · 알약 값 · 색은 줄마다 하나(짙은 칸만 — V1 · V-D5)', JSON.stringify(pal) === JSON.stringify(['[spacing]', '8', '[radius]', '4', '[color]', '>[gray]', '0||#FFFFFF', '900||#111111']), JSON.stringify(pal));
  check('9 알약 툴팁 · 접근성 이름 "{전체 이름}, {값}"', (await p.getAttribute('.vp-item[data-id="sp8"]', 'title')) === 'spacing/8 / 8' && (await p.getAttribute('.vp-item[data-id="sp8"]', 'aria-label')) === 'spacing/8, 8');
  const widths = await p.evaluate(() => {
    const w = (sel) => Math.round(document.querySelector(sel)?.getBoundingClientRect().width ?? -1);
    return { win: window.innerWidth, side: w('.vl-side'), hscroll: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  });
  check('9 §8 폭 — 창 560 · 사이드바 128 · 가로 스크롤 0', JSON.stringify(widths) === JSON.stringify({ win: 560, side: 128, hscroll: 0 }), JSON.stringify(widths));
  // 그룹 접기(기억)
  await p.click('#varTree .vt-group >> nth=0');
  check('9 그룹 머리 클릭 → 접힘(▸)', (await p.getAttribute('#varTree .vt-group >> nth=0', 'aria-expanded')) === 'false' && (await p.$('.vp-item[data-id="sp8"]')) === null);
  await p.click('#varTree .vt-group >> nth=0');
  // 클릭 = 연결 — 선택 없음이면 보내지 않고 사유
  await p.click('.vp-item[data-id="sp8"]');
  check('9 선택 없음에서 클릭 → 연결 안 함 · "선택이 없어요"', (await sent(p, 'APPLY_VARIABLE')).length === 0 && (await p.textContent('#statusText')).includes('선택이 없어요'));
  await recv(p, { ...sel(1, 2), scanned: 40, firstName: 'Card', ids: ['1:2'] });
  await p.waitForTimeout(450);
  await p.dblclick('.vp-item[data-id="sp8"]');
  const av = await sent(p, 'APPLY_VARIABLE');
  check('9 더블클릭 → 연결 한 번(두 번째 click 버림) · target 없음', av.length === 1 && av[0].id === 'sp8' && !('target' in av[0]), JSON.stringify(av));
  await recv(p, { type: 'VARIABLE_APPLIED', reqId: av[0].reqId, applied: 3, skipped: 1, skipReasons: { 'not-autolayout': 1 }, name: 'spacing/8' });
  check('9 결과 "레이어 3개에 spacing/8 연결 · 1개는 맞지 않아 건너뜀 · ⌘Z로 되돌리기" + 사유 툴팁', (await p.textContent('#statusText')) === '레이어 3개에 spacing/8 연결 · 1개는 맞지 않아 건너뜀 · ⌘Z로 되돌리기' && (await p.getAttribute('#statusText', 'title')).includes('오토 레이아웃 아님 1'), await p.textContent('#statusText'));
  // 연결 중에는 다른 클릭 연결 잠금
  await p.focus('.vp-item[data-id="r4"]');
  await p.keyboard.press(' ');
  const av2 = (await sent(p, 'APPLY_VARIABLE')).at(-1);
  check('9 Space → 연결', av2.id === 'r4' && (await sent(p, 'APPLY_VARIABLE')).length === 2);
  await p.click('.vp-item[data-id="sp8"]');
  check('9 클릭 연결 진행 중 → 쓰기 잠금 사유 · 요청 없음', (await sent(p, 'APPLY_VARIABLE')).length === 2 && (await p.textContent('#statusText')).includes('작업이 끝나면 다시 해 주세요'), await p.textContent('#statusText'));
  await recv(p, { type: 'VARIABLE_APPLIED', reqId: av2.reqId, applied: 0, skipped: 2, skipReasons: { 'no-prop': 2 }, name: 'radius/4' });
  check('9 하나도 못 붙임 → "선택한 레이어에 radius/4을 붙일 곳이 없어요"', (await p.textContent('#statusText')) === '선택한 레이어에 radius/4을 붙일 곳이 없어요');
  // 키보드 — ↓ 다음 줄 · ←→ 줄 안
  // 키보드(V1 뒤 — §4.6 "키보드"): 색 줄은 ↑ ↓ 줄 하나씩 · ← → 무시, 알약 묶음 안은 ← →
  await p.focus('.vt-row[data-id="g0"]');
  await p.keyboard.press('ArrowRight');
  check('9 색 줄에서 → 무시(그 줄 그대로)', (await p.evaluate(() => document.activeElement?.dataset?.id)) === 'g0');
  await p.keyboard.press('ArrowLeft');
  check('9 색 줄에서 ← = 담은 머리(gray — V-D6 V-P4)', (await p.evaluate(() => document.activeElement?.dataset?.key)) === 'g:g|color/gray', await p.evaluate(() => document.activeElement?.dataset?.key));
  await p.keyboard.press('ArrowRight');
  check('9 펴 있는 머리에서 → = 내용 첫 줄(V-P4)', (await p.evaluate(() => document.activeElement?.dataset?.id)) === 'g0');
  await p.keyboard.press('ArrowDown');
  check('9 ↓ 다음 색 줄 하나', (await p.evaluate(() => document.activeElement?.dataset?.id)) === 'g9');
  await p.keyboard.press('ArrowUp');
  await p.keyboard.press('ArrowUp');
  check('9 ↑ ↑ 위 색 줄 → 그룹 머리', (await p.evaluate(() => document.activeElement?.classList.contains('vt-group'))));
  // 우클릭 메뉴 — 다른 곳에 연결 ▸ · 상세… · 복제 · 삭제
  await rightClick(p, '.vp-item[data-id="sp8"]');
  check('9 우클릭 메뉴 항목', JSON.stringify(await p.$$eval('.ctx-menu button', (e) => e.map((x) => x.childNodes[0].textContent))) === JSON.stringify(['다른 곳에 연결 ▸', '상세', '복제', '삭제']), JSON.stringify(await p.$$eval('.ctx-menu button', (e) => e.map((x) => x.textContent))));
  await p.keyboard.press('ArrowRight');
  const subm = await p.$$eval('.ctx-menu >> nth=1 >> button', (e) => e.map((x) => [x.childNodes[0].textContent, x.getAttribute('aria-disabled')])).catch(async () => p.$$eval('.ctx-menu:last-child button', (e) => e.map((x) => [x.childNodes[0].textContent, x.getAttribute('aria-disabled')])));
  check('9 → 하위 메뉴 — 간격 항목(GAP 용도라 모두 열림)', subm.length === 6 && subm[0][0] === '간격' && subm.every((x) => x[1] !== 'true'), JSON.stringify(subm));
  await p.keyboard.press('ArrowLeft');
  check('9 ← 하위 메뉴 닫힘 · 포커스는 그 항목', (await p.$$('.ctx-menu')).length === 1 && (await p.evaluate(() => document.activeElement?.getAttribute('aria-haspopup'))) === 'menu');
  await p.keyboard.press('ArrowRight');
  await p.keyboard.press('ArrowDown');
  await p.keyboard.press('Enter');
  check('9 하위 메뉴 "안쪽 여백(4방향)" → target padding', (await sent(p, 'APPLY_VARIABLE')).at(-1).target === 'padding');
  await recv(p, { type: 'VARIABLE_APPLIED', reqId: (await sent(p, 'APPLY_VARIABLE')).at(-1).reqId, applied: 1, skipped: 0, skipReasons: {}, name: 'spacing/8' });
  // 반경 변수(용도 []) — 하위 항목 전부 aria-disabled
  await rightClick(p, '.vp-item[data-id="r4"]');
  await p.keyboard.press('ArrowRight');
  check('9 용도 [] 변수 → 하위 항목 모두 aria-disabled', (await p.$$eval('.ctx-menu', (ms) => [...ms.at(-1).querySelectorAll('button')].every((b) => b.getAttribute('aria-disabled') === 'true'))));
  await p.keyboard.press('Escape');
  await p.keyboard.press('Escape');
  // 검색 — 모든 컬렉션 · 경로 머리 · 사이드바 흐림 · 결과 없음
  await p.fill('#varSearch', 'color');
  check('9 검색 — 모든 컬렉션 경로 머리', JSON.stringify(await p.$$eval('#varTree .vt-group .lb', (e) => e.map((x) => x.textContent))) === JSON.stringify(['S Semantic › color/text', 'G Global › color/gray']) && (await p.$eval('#varSide', (e) => e.classList.contains('dim'))));
  await p.fill('#varSearch', 'zzz');
  check('9 검색 결과 없음 문구', (await p.textContent('#varTree')).includes("'zzz'와 맞는 변수가 없어요"));
  await p.focus('#varSearch');
  await p.keyboard.press('Escape');
  check('9 Esc로 검색 지움', (await p.inputValue('#varSearch')) === '' && (await p.$('.vp-item[data-id="sp8"]')) !== null);
  // ⋯ — 준비 현황 · 내보내기 · 색 격자 · 펼치기 · 접기
  await p.click('#btnVarMore');
  const more = await p.$$eval('.ctx-menu button', (e) => e.map((x) => x.textContent));
  check('9 ⋯ 메뉴 7개(색 격자로 보기 · 안 쓰는 변수 찾기 · 이름 다시 짓기 포함)', more.length === 7 && /^준비 현황 \d\/7…$/.test(more[0]) && more[1] === '코드로 내보내기…' && more[2] === '색 격자로 보기' && more[5] === '안 쓰는 변수 찾기…' && more[6].startsWith('텍스트 스타일 이름 다시 짓기…'), more.join('|'));
  check('9 ⋯ 이름 다시 짓기 — 무료면 잠김 · 앞에 구분선', (await p.$eval('.ctx-menu button:last-child', (b) => b.getAttribute('aria-disabled') === 'true' || b.disabled)) && (await p.$$eval('.ctx-menu [role="separator"], .ctx-menu hr, .ctx-menu .sep', (e) => e.length)) >= 1);
  await p.click('.ctx-menu button >> text=색 격자로 보기');
  check('9 색 격자 — 동그라미만(이름 없음)', (await p.$$('.vp-line.vp-dot .vp-item')).length === 2 && (await p.$('.vp-line.vp-dot .vp-name')) === null);
  // ＋ 메뉴
  await p.click('#btnAddVar');
  check('9 ＋ 메뉴 — 새 변수 · 선택에서 · 다크 · 텍스트 스타일', JSON.stringify(await p.$$eval('.ctx-menu button', (e) => e.map((x) => x.childNodes[0].textContent))) === JSON.stringify(['새 변수', '선택에서 변수 만들기…', '다크 모드 만들기…', '텍스트 스타일 만들기…']));
  await p.click('.ctx-menu button >> text=새 변수');
  check('9 새 변수 팝업 — 컬렉션 · 이름 · 타입 기본(지금 보이는 첫 그룹 = 숫자) · [취소] [만들기]', (await p.textContent('.modal')).includes('G Global') && (await p.inputValue('.modal select.ed-type')) === 'FLOAT' && (await p.textContent('.modal')).includes('만들기'));
  await p.fill('.modal .ed-field input >> nth=0', 'spacing/12');
  await p.fill('.modal .ed-field input >> nth=1', '12');
  await p.click('.modal button >> text=만들기');
  const cv = (await sent(p, 'CREATE_VARIABLE')).at(-1);
  check('9 [만들기] → CREATE_VARIABLE(컬렉션 · 이름 · 값 · 용도 GAP)', cv?.collectionId === 'g' && cv.name === 'spacing/12' && cv.varType === 'FLOAT' && cv.values.m?.value === 12 && JSON.stringify(cv.scopes) === '["GAP"]', JSON.stringify(cv));
  await recv(p, { type: 'VARIABLE_CREATED', reqId: cv.reqId, id: 'sp12' });
  check('9 만든 뒤 팝업 닫힘', (await p.$('.modal')) === null);
  await recv(p, { type: 'VAR_TABLE', collections: COLS, vars: [...VARS, { id: 'sp12', name: 'spacing/12', collectionId: 'g', type: 'FLOAT', values: { m: { kind: 'number', text: '12' } }, scopes: ['GAP'], description: '' }] });
  check('9 새 변수로 포커스', (await p.evaluate(() => document.activeElement?.dataset?.id)) === 'sp12');
  // 복제 → 상세 열고 이름 칸
  await rightClick(p, '.vp-item[data-id="sp8"]');
  await p.click('.ctx-menu button >> text=복제');
  const dv = (await sent(p, 'DUPLICATE_VARIABLE')).at(-1);
  check('9 복제 → DUPLICATE_VARIABLE', dv?.id === 'sp8');
  await recv(p, { type: 'VARIABLE_DUPLICATED', reqId: dv.reqId, newId: 'sp8c' });
  await recv(p, { type: 'VAR_TABLE', collections: COLS, vars: [...VARS, { id: 'sp8c', name: 'spacing/8-copy', collectionId: 'g', type: 'FLOAT', values: { m: { kind: 'number', text: '8' } }, scopes: ['GAP'], description: '' }] });
  check('9 복제 뒤 상세 열림 · 이름 칸 포커스', (await p.$('.modal')) !== null && (await p.evaluate(() => document.activeElement?.value)) === 'spacing/8-copy');
  // 복제 전에 읽기 시작한 표가 복사본 없이 늦게 온다. 줄을 지우면 닫을 때 포커스가 첫 그룹 머리로 떨어진다.
  const gvtBefore = (await sent(p, 'GET_VAR_TABLE')).length;
  await recv(p, { type: 'VAR_TABLE', collections: COLS, vars: VARS });
  await p.keyboard.press('Escape');
  check('9 상세가 열린 동안 버린 표가 있으면 닫을 때 새 표 요청(GET_VAR_TABLE 한 번)', (await sent(p, 'GET_VAR_TABLE')).length === gvtBefore + 1);
  check('9 복제 상세를 닫으면 복사본 줄(늦은 표가 복사본을 빼도 첫 머리가 아님)', (await p.evaluate(() => document.activeElement?.dataset?.id)) === 'sp8c', await p.evaluate(() => `${document.activeElement?.dataset?.key ?? ''} ${document.activeElement?.textContent ?? ''}`));
  // 삭제 — 확인 팝업(처음 포커스 [취소]) · m(가리키는 변수 수)
  await recv(p, { type: 'VAR_TABLE', collections: COLS, vars: VARS });
  await rightClick(p, '.vp-item[data-id="g9"]');
  await p.click('.ctx-menu button >> text=삭제');
  const mt = await p.textContent('.modal');
  check('9 삭제 확인 — 제목 · 가리키는 변수 1개 · 레이어 안내 · 포커스 [취소]', mt.includes('color/gray/900 변수를 지울까요?') && mt.includes('가리키는 변수 1개') && mt.includes("'삭제된 변수'가 돼요") && (await p.evaluate(() => document.activeElement?.textContent)) === '취소', mt);
  await p.click('.modal button.danger');
  const del = (await sent(p, 'DELETE_VARIABLE')).at(-1);
  check('9 [삭제] → DELETE_VARIABLE', del?.id === 'g9');
  await recv(p, { type: 'VARIABLE_DELETED', reqId: del.reqId, id: 'g9' });
  await recv(p, { type: 'VAR_TABLE', collections: COLS, vars: VARS.filter((v) => v.id !== 'g9') });
  check('9 지운 뒤 포커스 — 같은 그룹 이전 항목(color/gray/0)', (await p.evaluate(() => document.activeElement?.dataset?.id)) === 'g0');
  await recv(p, { type: 'VAR_TABLE', collections: COLS, vars: VARS });
  // 상세 — Enter · 이름 복사 · CSS · 쓰인 곳 직접만 · [모두 선택] · [→]
  await p.click('#varSide [data-key="side:col:s"]');
  await p.focus('.vt-row[data-id="tx"]');
  await p.keyboard.press('Enter');
  const fq = (await sent(p, 'FIND_VAR_USERS')).at(-1);
  check('9 Enter → 상세 · 쓰인 곳은 그 변수 하나만(직접만)', JSON.stringify(fq?.varIds) === '["tx"]' && fq.limit === 50);
  check('9 상세 — [⧉ 이름 복사] · CSS 줄 --color-text-default', (await p.$('.modal .ed-copyname')) !== null && (await p.textContent('.modal .ed-css code')) === '--color-text-default');
  await recv(p, { type: 'VAR_USERS', reqId: fq.reqId, layers: [{ id: 'n1', name: 'Title' }], totalLayers: 60, places: 80 });
  check('9 쓰인 곳 머리 "80곳 · 모두 선택" · 툴팁', (await p.textContent('.modal .uses-head')) === '80곳 · 모두 선택' && (await p.getAttribute('.modal .uses-head span', 'title')) === '인스턴스 안쪽 포함');
  await p.click('.modal .uses-head button');
  check('9 [모두 선택] → SELECT_VAR_USERS(그 변수 · 기준)', JSON.stringify((await sent(p, 'SELECT_VAR_USERS')).at(-1)?.varIds) === '["tx"]');
  check('9 별칭 칸에 [→]', (await p.$$('.modal .ed-go')).length === 2);
  await p.click('.modal .ed-go >> nth=0');
  await p.waitForTimeout(50);
  check('9 [→] → 팝업 닫고 Global의 color/gray/900로 · 상태 줄 [← 되돌리기]', (await p.$('.modal')) === null && (await sideSelected(p)) === 'side:col:g' && (await p.evaluate(() => document.activeElement?.dataset?.id)) === 'g9' && (await p.textContent('#statusText')) === 'color/gray/900(으)로 옮겼어요', JSON.stringify([!!(await p.$('.modal')), await sideSelected(p), await p.evaluate(() => document.activeElement?.dataset?.id ?? document.activeElement?.className), await p.textContent('#statusText')]));
  await p.click('#statusAction');
  check('9 [← 되돌리기] → Semantic · 그 줄', (await sideSelected(p)) === 'side:col:s' && (await p.evaluate(() => document.activeElement?.dataset?.id)) === 'tx');
  // 키보드 — 사이드바(listbox)
  await p.focus('#varSide [data-key="side:col:s"]');
  await p.keyboard.press('ArrowDown');
  check('9 사이드바 ↓ → 다음 항목(고르지 않음)', (await p.evaluate(() => document.activeElement?.dataset?.key)) === 'side:col:g' && (await sideSelected(p)) === 'side:col:s');
  await p.keyboard.press('Enter');
  check('9 사이드바 Enter → 고르기', (await sideSelected(p)) === 'side:col:g');
  const tips = await p.$$eval('#varSide .vs-item', (e) => e.map((x) => [x.querySelector('.vs-badge')?.title, x.getAttribute('aria-label')]));
  check('9 계층 배지 툴팁 · 접근성 이름', tips.length === 2 && tips[0][0] === '플러그인 컬렉션' && tips[0][1].endsWith(', 플러그인 컬렉션') && tips[1][0] === '직접 값 4/4 · Global', JSON.stringify(tips));
  await p.screenshot({ path: process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/b3-vars.png` : '/dev/null' }).catch(() => {});
  await p.close();
}
{
  // 선택 탭 카드(v4 §4.1) — 카드 1 숫자 · 카드 2 직접만 · 카드 3 [선택] · [연결 풀기]
  const p = await open(560, 'select');
  await recv(p, { ...PREREQ, tierVars: 5, otherVars: 0 });
  await recv(p, { type: 'VAR_TABLE', collections: COLS, vars: VARS });
  check('9 선택 없음 → "디자인에서 레이어를 선택하세요" · 할 일 세 버튼 잠금', (await p.textContent('#selCards')).includes('디자인에서 레이어를 선택하세요') && (await locked(p, '#btnGoMake')) && (await locked(p, '#btnGoRename')) && (await locked(p, '#btnGoComponents')));
  await recv(p, { ...sel(1, 2), scanned: 40, ids: ['1:2'] });
  check('9 읽는 중 카드', (await p.textContent('#selCards')).includes('선택을 읽는 중…'));
  await p.waitForTimeout(450);
  const ap = (await sent(p, 'APPLY')).at(-1);
  check('9 자동 찾기 — 기준 nodeIds · preview', ap?.preview === true && ap?.nodeIds?.[0] === '1:2');
  await recv(p, { ...preview(ap.reqId), counts: { 'no-match': { color: 2 }, styled: { color: 1 }, 'instance-children': { other: 4 } } });
  await recv(p, tsPrev(ap.reqId));
  await recv(p, usageResult((await sent(p, 'SCAN_USAGE')).at(-1).reqId, { tx: { places: 2, layers: 1 }, L1: { places: 1, layers: 1 } }, { libraryVars: [{ id: 'L1', name: 'core/blue/500', collection: 'Core', type: 'COLOR', value: { kind: 'color', hex: '#3366FF' }, aliasTargets: [] }], deleted: { count: 3, nodeIds: ['x'] } }));
  const txt = await p.textContent('#selCards');
  check('9 카드 1 — n = m + k(4곳), [2곳 연결], 종류별은 연결할 곳만 + "새로 만들 값 2곳"(링크 없음)', txt.includes('변수 없는 값 4곳') && txt.includes('2곳 연결') && txt.includes('Spacing 2 · 새로 만들 값 2곳') && (await p.$('#selCards [data-k="make"]')) === null, txt);
  check('9 머리 줄 — 이름만("레이어 n개" 없음)', !(await p.textContent('#selHead')).includes('레이어'), await p.textContent('#selHead'));
  check('9 카드 2 — 직접만 2개(Semantic 1 · 라이브러리 1)', txt.includes('쓰는 변수 2개') && txt.includes('Semantic 1 · 라이브러리 1'), txt);
  check('9 카드 3 — 삭제된 변수 3곳 · [선택] · [연결 풀기]', txt.includes('삭제된 변수 3곳') && (await p.$('[data-k="delsel"]')) !== null && (await p.$('[data-k="unbind"]')) !== null);
  // 카드 1 완료 문구(§4.1, 사용자 결정 A) — n = 0 · s > 0이면 "✓ 연결할 곳은 모두 연결됐어요", styled는 s에 안 더함
  const skips9 = [{ nodeId: '1:2', name: 'Box', type: 'FRAME', reason: 'fraction', field: 'paddingLeft' }, { nodeId: '1:3', name: 'Label', type: 'TEXT', reason: 'styled', field: 'fills' }];
  await recv(p, { ...preview(ap.reqId), candidates: [], counts: { fraction: { gap: 2 }, styled: { color: 3 } }, reasons: { fraction: 2, styled: 3 }, skips: skips9 });
  await p.waitForTimeout(30);
  const done1 = await p.textContent('#selCards');
  check('9 카드 1 완료 — n = 0 · s > 0 → "✓ 연결할 곳은 모두 연결됐어요 · 손볼 곳 2곳"(스타일 사용 중 3곳은 안 셈) · [보기]', done1.includes('✓ 연결할 곳은 모두 연결됐어요') && done1.includes('손볼 곳 2곳') && (await p.$('[data-k="skips"]')) !== null, done1);
  // [보기] → 건너뛴 곳 모습(§4.2 — m = k = 0): 제목 · ✓ 줄 · 목록 펼침 · 버튼 줄 없음
  await p.click('[data-k="skips"]');
  await p.waitForTimeout(40);
  const heads9 = await p.$$eval('#bindSkips .skip-head', (e) => e.map((x) => x.textContent));
  check('9 건너뛴 곳 모습 — 제목 "건너뛴 곳" · "✓ 연결할 곳은 모두 연결됐어요" · 손볼 곳 / 그대로 둬도 되는 곳 · [연결] 없음', (await p.textContent('#subTitle')) === '건너뛴 곳' && (await p.textContent('#bindEmpty')).includes('✓ 연결할 곳은 모두 연결됐어요') && JSON.stringify(heads9) === JSON.stringify(['손볼 수 있는 곳', '그대로 둬도 되는 곳']) && !(await visible(p, '#bindFoot')) && !(await visible(p, '#bindSkipToggle')), JSON.stringify(heads9));
  // 다시 그려도 포커스는 같은 사유의 [선택 ›](§4.2 "목록을 다시 그릴 때의 포커스")
  // [선택 ›]은 손볼 곳 줄에만(결정 A 확장) — 그래서 손볼 곳 사유(fraction)로 본다
  await p.focus('#bindSkips .skip-sel[data-reason="fraction"]');
  await recv(p, { ...preview(ap.reqId), candidates: [], counts: { fraction: { gap: 2 }, styled: { color: 3 } }, reasons: { fraction: 2, styled: 3 }, skips: skips9 });
  await p.waitForTimeout(40);
  check('9 건너뛴 곳 모습 — 다시 읽어 목록을 다시 그려도 포커스는 같은 사유의 [선택 ›]', (await p.evaluate(() => document.activeElement?.dataset?.reason)) === 'fraction', await p.evaluate(() => document.activeElement?.outerHTML?.slice(0, 80)));
  // 손볼 곳 0(그대로 둬도 되는 곳만) → ✓ 줄은 카드 1과 같은 allBound
  await recv(p, { ...preview(ap.reqId), candidates: [], counts: { styled: { color: 3 } }, reasons: { styled: 3 }, skips: [skips9[1]] });
  await p.waitForTimeout(40);
  await p.screenshot({ path: process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/b7-skip-s0.png` : '/dev/null' }).catch(() => {});
  check('9 건너뛴 곳 모습 s = 0 — 제목 "건너뛴 곳" · ✓ "찾은 값은 모두 연결돼 있어요" · 그대로 둬도 되는 곳만', (await p.textContent('#subTitle')) === '건너뛴 곳' && (await emptyText(p)) === '✓ 찾은 값은 모두 연결돼 있어요' && JSON.stringify(await p.$$eval('#bindSkips .skip-head', (e) => e.map((x) => x.textContent))) === JSON.stringify(['그대로 둬도 되는 곳']), await emptyText(p));
  check('9 s = 0 — 그대로 둬도 되는 곳만이라 [선택 ›] 0개 · 포커스 ←(사라진 손볼 곳 [선택 ›] — 남은 [선택 ›]이 없음)', (await p.$$eval('#bindSkips .skip-sel', (e) => e.length)) === 0 && (await p.evaluate(() => document.activeElement?.id)) === 'btnSubBack', await p.evaluate(() => document.activeElement?.id));
  // 목록까지 비면 모두 연결된 모습 — 제목 "연결" · allBound · 칩 · 목록 · 버튼 줄 없음, 지워진 [선택 ›]의 포커스는 ←
  await recv(p, { ...preview(ap.reqId), candidates: [], counts: { fraction: { gap: 2 }, styled: { color: 3 } }, reasons: { fraction: 2, styled: 3 }, skips: skips9 });
  await p.waitForTimeout(40);
  await p.focus('#bindSkips .skip-sel[data-reason="fraction"]');
  await recv(p, { ...preview(ap.reqId), candidates: [], counts: {}, reasons: {}, skips: [] });
  await p.waitForTimeout(40);
  await p.screenshot({ path: process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/b7-all-done.png` : '/dev/null' }).catch(() => {});
  check('9 모두 연결된 모습 — 제목 "연결" · ✓ "찾은 값은 모두 연결돼 있어요" · 칩 · 목록 · [연결] 없음 · 포커스 ←', (await p.textContent('#subTitle')) === '연결' && (await emptyText(p)) === '✓ 찾은 값은 모두 연결돼 있어요' && !(await visible(p, '#bindBadges')) && !(await visible(p, '#bindFoot')) && (await p.evaluate(() => document.activeElement?.id)) === 'btnSubBack', `${await p.textContent('#subTitle')} / ${await emptyText(p)} / ${await p.evaluate(() => document.activeElement?.id)}`);
  await p.click('#btnSubBack');
  await p.waitForTimeout(30);
  await recv(p, { ...preview(ap.reqId), candidates: [], counts: { styled: { color: 3 } } });
  await p.waitForTimeout(30);
  check('9 카드 1 완료 — 스타일 사용 중만 → "✓ 찾은 값은 모두 연결돼 있어요"(버튼 없음)', (await p.textContent('#selCards')).includes('✓ 찾은 값은 모두 연결돼 있어요') && (await p.$('[data-k="skips"]')) === null);
  await recv(p, { ...preview(ap.reqId), counts: { 'no-match': { color: 2 }, styled: { color: 1 }, 'instance-children': { other: 4 } } });
  await p.waitForTimeout(30);
  // 카드 2 — 안내만(버튼 없음, IA v4 §4.1 · §4.6 "쓰는 변수 필터 — 없앰" · B.15)
  const card2 = await p.$$eval('#selCards .sel-card', (e) => e.filter((x) => x.querySelector('.t')?.textContent === '쓰는 변수 2개').map((x) => ({ buttons: x.querySelectorAll('button').length, acts: !!x.querySelector('.acts') })));
  check('9 카드 2 — 안내만(버튼 없음 · .acts 없음 · [data-k="uses"] 없음 · 펼침 목록 없음)', card2.length === 1 && card2[0].buttons === 0 && !card2[0].acts && (await p.$('[data-k="uses"]')) === null && (await p.$('.sel-list')) === null, JSON.stringify(card2));
  // 선택 탭에서 변수 탭으로 — 모든 로컬 컬렉션 · 전체 수(필터 없음)
  await p.click('#tabbtn-variables');
  await p.waitForTimeout(60);
  check('9 선택 탭에서 변수 탭으로 — 모든 로컬 컬렉션 · 전체 수 · 라이브러리 항목 없음 · "{n}곳" 없음', JSON.stringify(await sideItems(p)) === JSON.stringify([['Semantic', '1'], ['Global', '4']]) && (await p.$('[data-key="side:lib"]')) === null && (await p.$$('#varTree .vr-n')).length === 0, JSON.stringify(await sideItems(p)));
  check('9 필터 줄 없음', (await p.$('#usesFilterBar')) === null && (await p.$('#usesFilterX')) === null);
  // 변수 탭에서 쓰는 변수 결과(내용이 바뀐 응답)가 와도 포커스 · 스크롤 그대로(변수 탭 목록은 페이지가 스크롤한다)
  await p.click('#varSide [data-key="side:col:g"]');
  await p.waitForTimeout(30);
  await p.setViewportSize({ width: 560, height: 240 });
  await p.focus('.vp-item[data-id="r4"]');
  await p.evaluate(() => window.scrollTo(0, 40));
  await p.waitForTimeout(30);
  const y9 = await p.evaluate(() => window.scrollY);
  await recv(p, usageResult((await sent(p, 'SCAN_USAGE')).at(-1).reqId, { tx: { places: 2, layers: 1 }, g9: { places: 1, layers: 1 }, L1: { places: 1, layers: 1 } }, { libraryVars: [{ id: 'L1', name: 'core/blue/500', collection: 'Core', type: 'COLOR', value: { kind: 'color', hex: '#3366FF' }, aliasTargets: [] }], deleted: { count: 3, nodeIds: ['x'] } }));
  await p.waitForTimeout(40);
  check('9 변수 탭에서 쓰는 변수 결과가 와도 그대로 — 포커스 · window.scrollY', y9 > 0 && (await p.evaluate(() => document.activeElement?.dataset?.id)) === 'r4' && (await p.evaluate(() => window.scrollY)) === y9, `${y9} / ${await p.evaluate(() => window.scrollY)} / ${await p.evaluate(() => document.activeElement?.dataset?.id)}`);
  await p.setViewportSize({ width: 560, height: 510 });
  await p.click('#tabbtn-select');
  await p.waitForTimeout(30);
  await p.click('[data-k="unbind"]');
  const ub = (await sent(p, 'UNBIND_DELETED')).at(-1);
  check('9 [연결 풀기] → UNBIND_DELETED(기준)', ub?.nodeIds?.[0] === '1:2');
  await recv(p, { type: 'DELETED_UNBOUND', reqId: ub.reqId, unbound: 3, failed: 0, failReasons: {} });
  check('9 연결 풀기 결과 문구', (await p.textContent('#statusText')).startsWith('삭제된 변수 연결 3곳을 풀었어요'));
  const ap2 = (await sent(p, 'APPLY')).at(-1);
  check('9 연결 풀기 뒤 다시 읽기(찾기 · 사용 수)', ap2.reqId !== ap.reqId);
  await recv(p, preview(ap2.reqId));
  await recv(p, tsPrev(ap2.reqId));
  await p.click('[data-k="link"]');
  check('9 [2곳 연결] → 연결 하위 화면(← 머리)', (await visible(p, '#subHead')) && !(await visible(p, '#selHome')));
  await p.keyboard.press('Escape');
  check('9 Esc → 첫 화면 · 포커스는 연 버튼', (await visible(p, '#selHome')) && (await p.evaluate(() => document.activeElement?.dataset?.k)) === 'link');
  await p.close();
}
{
  // 상태 5 — 로컬 변수 0개 + 라이브러리만: 카드 2(라이브러리 1)에 버튼 없음 · 변수 탭은 빈 화면 · 사이드바 없음(B.15)
  const p = await open(560, 'select');
  await recv(p, { ...PREREQ, hasBindable: false, tierVars: 0, otherVars: 0 });
  await recv(p, { type: 'VAR_TABLE', collections: [], vars: [] });
  await recv(p, { ...sel(1, 1), scanned: 40, ids: ['1:2'] });
  await p.waitForTimeout(450);
  const su = (await sent(p, 'SCAN_USAGE')).at(-1);
  await recv(p, usageResult(su.reqId, { L1: { places: 2, layers: 1 } }, { libraryVars: [{ id: 'L1', name: 'core/blue/500', collection: 'Core', type: 'COLOR', value: { kind: 'color', hex: '#3366FF' }, aliasTargets: [] }] }));
  await p.waitForTimeout(40);
  const card5 = await p.$$eval('#selCards .sel-card', (e) => e.filter((x) => x.querySelector('.t')?.textContent === '쓰는 변수 1개').map((x) => ({ s: x.querySelector('.s')?.textContent, buttons: x.querySelectorAll('button').length })));
  check('상태 5 — 카드 2 "라이브러리 1" · 버튼 없음', card5.length === 1 && card5[0].s === '라이브러리 1' && card5[0].buttons === 0, JSON.stringify(card5));
  await p.click('#tabbtn-variables');
  await p.waitForTimeout(60);
  check('상태 5 — 변수 탭은 빈 화면(#varEmpty) · 사이드바 없음', (await visible(p, '#varEmpty')) && !(await visible(p, '#varList')) && (await sideItems(p)).length === 0);
  await p.close();
}

/* 7 — '다음 →'은 툴바 오른쪽 끝(만들기 › 색) */
{
  const p = await open(560, 'variables');
  await recv(p, PREREQ);
  await recv(p, { type: 'VAR_TABLE', collections: [], vars: [] });
  await goSub(p, 'pick');
  const r = await p.evaluate(() => {
    const card = document.getElementById('colorCard');
    const bar = card.querySelector('.toolbar').getBoundingClientRect();
    const next = card.querySelector('.btn-next').getBoundingClientRect();
    return { gap: Math.round(bar.right - next.right) };
  });
  check('7 ‘다음 →’ 오른쪽 끝(만들기 › 색)', r.gap <= 2, `오른쪽 여백 ${r.gap}px`);
  check('7 가로 스크롤 없음', !(await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)));
  await p.close();
}

// 탭 바(+[—])가 한 줄
for (const w of [560]) {
  const p = await open(w);
  const r = await p.evaluate(() => ({ h: Math.round(document.querySelector('.tabs').getBoundingClientRect().height), hs: document.documentElement.scrollWidth > document.documentElement.clientWidth }));
  check(`9 ${w}px 탭 바 한 줄·가로 스크롤 없음`, r.h <= 40 && !r.hs, `높이 ${r.h}px`);
  await p.close();
}

/* 10 — IA v3 셸(PR 1) */
const count = async (p, type) => (await sent(p, type)).length;
const reenter = (p) => p.evaluate(() => {
  document.documentElement.dispatchEvent(new PointerEvent('pointerleave'));
  document.documentElement.dispatchEvent(new PointerEvent('pointerenter'));
  window.dispatchEvent(new FocusEvent('focus'));
});
{
  const p = await open(560, null);
  check('10 처음 열면 선택 탭(v4 §2.1)', (await p.$eval('.tab-btn.active', (e) => e.id)) === 'tabbtn-select');
  check('10 머리 = [선택 | 변수] + ⚙ + —', JSON.stringify(await p.$$eval('#tabBar .tab-btn', (e) => e.map((x) => x.textContent))) === JSON.stringify(['선택', '변수']) && (await visible(p, '#btnSettings')) && (await visible(p, '#btnMinimize')));
  check('10 선택 표시줄 없음(탭 바 바로 아래가 탭 내용)', (await p.$('#selBarWrap')) === null);
  await recv(p, PREREQ);
  await recv(p, sel(0, 0));
  // 선택이 없을 때 화면별 안내(§4.1)
  await goTab(p, 'layer');
  check('10 선택 없음 — 연결 화면 대신 첫 화면(선택 없음 안내)', (await visible(p, '#selHome')) && (await p.textContent('#selCards')).includes('디자인에서 레이어를 선택하세요'));
  await goSub(p, 'rename');
  check('10 선택 없음 — 이름 정리 "디자인에서 레이어를 선택하세요" + [← 돌아가기]', (await p.textContent('#renameEmpty')).includes('디자인에서 레이어를 선택하세요') && (await p.textContent('#renameEmpty')).includes('← 돌아가기'));
  await goSub(p, 'structure');
  check('10 선택 없음 — 컴포넌트 목록 자리', (await p.textContent('#compTree')).includes('선택이 없어요 — 캔버스에서 레이어를 선택하세요'));
  await recv(p, { ...sel(1, 0), scanned: 43, firstName: 'Card', ids: ['1:2'] });
  await goSub(p, 'bind');
  check('10 선택하면 연결 화면 — "선택을 읽는 중…"', (await emptyText(p)) === '선택을 읽는 중…', String(await emptyText(p)));
  for (const tb of ['layer', 'settings', 'variables', 'layer', 'variables']) await goTab(p, tb);
  check('10 탭 전환 시 크기 요청 0회', (await count(p, 'SET_UI_SIZE')) === 0);
  // 하위 화면·단계 기억(§2.6)
  await goSub(p, 'pick');
  await p.click('#makeRail [data-make-step="theme"]');
  await p.click('#tabbtn-variables');
  await p.click('#tabbtn-select');
  check('10 하위 화면 기억(선택 탭 › 값을 직접 고르기 › 테마)', (await visible(p, '#varMake')) && (await visible(p, '#darkCard')));
  await p.click('#btnSubBack');
  check('10 값을 직접 고르기 ← → 변수 만들기 화면', (await visible(p, '#makeScreen')) && !(await visible(p, '#varMake')));
  await p.click('#btnSubBack');
  check('10 ← → 선택 탭 첫 화면', (await visible(p, '#selHome')) && !(await visible(p, '#makeScreen')));
  await p.click('#btnSettings');
  check('10 ⚙ → 설정 화면 · 세그먼트 둘 다 고르지 않음', (await visible(p, '#tab-settings')) && (await p.$$eval('#tabBar .tab-btn', (e) => e.every((x) => x.getAttribute('aria-selected') === 'false'))));
  await p.keyboard.press('Escape');
  check('10 Esc → 설정을 연 탭으로', (await visible(p, '#selHome')) && (await p.$eval('.tab-btn.active', (e) => e.id)) === 'tabbtn-select');
  await p.close();
}
{
  // 창 다시 들어옴(④): 합쳐서 1번, 2초 안 재진입은 간격 끝에 1번, 창 안 이동 0회, 메뉴 열림 중 보류
  const p = await open(560, "variables");
  await recv(p, PREREQ);
  await recv(p, sel(0, 0));
  await p.waitForTimeout(50);
  const base = await count(p, 'GET_VAR_TABLE');
  await reenter(p);
  await p.waitForTimeout(500);
  check('10 창 다시 들어옴: 두 신호 합쳐 1번', (await count(p, 'GET_VAR_TABLE')) === base + 1, `${(await count(p, 'GET_VAR_TABLE')) - base}번`);
  await recv(p, PREREQ);
  await reenter(p);
  await p.waitForTimeout(500);
  check('10 2초 안 재진입은 바로 읽지 않음', (await count(p, 'GET_VAR_TABLE')) === base + 1);
  await p.waitForTimeout(1600);
  check('10 2초 안 재진입은 간격 끝에 1번', (await count(p, 'GET_VAR_TABLE')) === base + 2, `${(await count(p, 'GET_VAR_TABLE')) - base}번`);
  await recv(p, PREREQ);
  await p.waitForTimeout(2100);
  await p.mouse.move(100, 200);
  await p.mouse.move(200, 300);
  await p.waitForTimeout(500);
  check('10 창 안 이동은 0회', (await count(p, 'GET_VAR_TABLE')) === base + 2);
  // 메뉴 열림 중 보류 → 닫으면 1번
  await recv(p, { type: 'VAR_TABLE', collections: COLS, vars: VARS });
  await rightClick(p, '.vt-row[data-id="tx"]');
  check('10 (메뉴 열림)', (await p.$('.ctx-menu')) !== null);
  await reenter(p);
  await p.waitForTimeout(500);
  check('10 메뉴 열림 중 보류', (await count(p, 'GET_VAR_TABLE')) === base + 2);
  await p.keyboard.press('Escape');
  await p.waitForTimeout(50);
  check('10 메뉴 닫으면 미룬 다시 읽기 1번', (await count(p, 'GET_VAR_TABLE')) === base + 3, `${(await count(p, 'GET_VAR_TABLE')) - base}번`);
  await p.close();
}
{
  // 최소화(§4.9)
  const p = await open(560, 'select');
  await recv(p, PREREQ);
  await recv(p, { ...sel(1, 0), scanned: 400 });
  await p.waitForTimeout(450);
  await p.click('#selCards button'); // [읽기] — 사용자가 시작한 찾기는 결과 전까지 진행 테두리
  await p.click('#btnMinimize');
  const mini = (await sent(p, 'SET_UI_SIZE')).at(-1);
  check('10 최소화 → SET_UI_SIZE mini', mini?.mode === 'mini');
  check('10 최소화: 마크만 보임', (await visible(p, '#btnExpand')) && !(await visible(p, '#tabBar')) && !(await visible(p, '#statusLine')));
  check('10 최소화: 진행 테두리(작업 중)', await p.$eval('#btnExpand', (e) => e.classList.contains('busy')));
  check('10 최소화: 접근성 이름 "펼치기 · 작업 중"', (await p.getAttribute('#btnExpand', 'aria-label')) === '펼치기 · 작업 중');
  const markBox = await p.$eval('#btnExpand', (e) => { const r = e.getBoundingClientRect(); return { w: r.width, h: r.height }; });
  check('10 마크 24×24 이상', markBox.w >= 24 && markBox.h >= 24);
  const before = await count(p, 'GET_PREREQ');
  await reenter(p);
  await p.waitForTimeout(500);
  check('10 최소화 중 창 다시 들어옴은 0회', (await count(p, 'GET_PREREQ')) === before);
  await recv(p, { type: 'ERROR', message: '테스트 실패', op: 'APPLY' });
  check('10 실패 → ⚠ 표시', await visible(p, '#miniBadge') && (await p.$eval('#miniBadge', (e) => e.classList.contains('fail'))));
  await p.waitForTimeout(3300);
  check('10 ⚠는 펼칠 때까지 유지', await visible(p, '#miniBadge'));
  await p.click('#btnExpand');
  check('10 펼치기 → SET_UI_SIZE default', (await sent(p, 'SET_UI_SIZE')).at(-1)?.mode === 'default');
  check('10 펼치면 [—]에 포커스', (await p.evaluate(() => document.activeElement?.id)) === 'btnMinimize');
  check('10 펼치면 다시 읽기 1번', (await count(p, 'GET_PREREQ')) === before + 1, `${(await count(p, 'GET_PREREQ')) - before}번`);
  check('10 펼치면 "실패 · [보기]"', (await p.textContent('#statusText')).includes('실패') && (await visible(p, '#statusAction')));
  // 팝업은 최소화할 때 닫힌다
  await p.click('#tabbtn-variables');
  await recv(p, { type: 'VAR_TABLE', collections: COLS, vars: VARS });
  await p.waitForTimeout(450);
  await recv(p, usageResult((await sent(p, 'SCAN_USAGE')).at(-1).reqId, { tx: { places: 1, layers: 1 } })); // 선택이 있으면 사용 수가 와야 목록이 나온다(§4.2)
  await p.focus('.vt-row[data-id="tx"]');
  await p.keyboard.press('Enter'); // v4: 상세는 Enter(클릭은 연결)
  const hadModal = (await p.$('.modal')) !== null;
  await p.evaluate(() => document.getElementById('btnMinimize').click()); // 팝업 배경이 덮고 있어 직접 누른다
  check('10 최소화하면 팝업 닫힘', hadModal && (await p.$('.modal')) === null);
  await p.close();
}
{
  // 잠금(§2.3): 포커스 가능, 누르면 공통 상태 줄에 사유 + [라이선스 →]
  const p = await open(560, 'variables');
  await recv(p, PREREQ);
  await recv(p, { type: 'VAR_TABLE', collections: [], vars: [] });
  await goSub(p, 'pick');
  // 무료 규칙 PR 뒤 [색 변수 만들기] · 브랜드 팔레트는 무료(F8 · ia-v4 §4.3a) — 유료 잠금의 예는 타이포 [스캔]
  await p.click('#makeRail [data-make-step="type"]');
  await p.waitForTimeout(30);
  await p.focus('#btnScanText');
  check('10 잠긴 버튼은 포커스 가능', (await p.evaluate(() => document.activeElement?.id)) === 'btnScanText');
  check('10 잠긴 버튼은 aria-disabled', (await p.getAttribute('#btnScanText', 'aria-disabled')) === 'true');
  await p.click('#btnScanText', { force: true });
  check('10 누르면 공통 상태 줄에 유료 사유', (await p.textContent('#statusText')).includes('유료 기능이에요') && (await p.textContent('#statusAction')) === '라이선스 →');
  check('10 잠긴 버튼은 동작하지 않음', (await count(p, 'SCAN_TEXT_STYLES')) === 0);
  await p.keyboard.press('Tab'); // 포커스 이동은 메시지를 지우지 않는다
  check('10 포커스 이동은 상태 줄 메시지를 지우지 않음', await visible(p, '#statusAction'));
  await p.click('#statusAction');
  check('10 [라이선스 →] → 설정 › 키 입력칸 포커스', (await visible(p, '#tab-settings')) && (await p.evaluate(() => document.activeElement?.id)) === 'licenseKey');
  // 24×24
  await p.click('#tabbtn-variables');
  await recv(p, { type: 'VAR_TABLE', collections: COLS, vars: VARS });
  const small = await p.evaluate(() => ['btnMinimize', 'btnSettings', 'btnAddVar', 'btnVarMore'].map((id) => {
    const el = document.getElementById(id);
    const r = el.getBoundingClientRect();
    return { id, w: Math.round(r.width), h: Math.round(r.height), shown: el.offsetParent !== null };
  }).filter((x) => x.shown && (x.w < 24 || x.h < 24)));
  check('10 새 컨트롤 24×24 이상', small.length === 0, JSON.stringify(small));
  await p.close();
}
{
  // 510에서 아래 버튼 줄이 스크롤해도 보임(§2.5 · §4.2 아래 고정) + §8 목록 높이 실측
  const p = await open(560, 'select');
  await openSel(p);
  const many = Array.from({ length: 40 }, (_, i) => cand('n1', 'itemSpacing', `v${i}`, `spacing/${i}`));
  await found(p, { candidates: many });
  await p.click('[data-k="link"]');
  await p.evaluate(() => window.scrollTo(0, 300));
  await p.waitForTimeout(100);
  const tb = await p.evaluate(() => {
    const bar = document.getElementById('bindFoot').getBoundingClientRect();
    const tabs = document.querySelector('.tabs').getBoundingClientRect();
    return { top: Math.round(bar.top), bottom: Math.round(bar.bottom), selBottom: Math.round(tabs.bottom), long: document.getElementById('bindTree').getBoundingClientRect().bottom > 510 };
  });
  check('10 510에서 [n곳 연결] 줄이 스크롤해도 보임', tb.long && tb.top >= tb.selBottom && tb.bottom <= 510 - 24, JSON.stringify(tb));
  const area = await p.evaluate(() => {
    const tabs = document.querySelector('.tabs').getBoundingClientRect();
    return { contentH: Math.round(510 - tabs.bottom - 24) };
  });
  console.log(`  · §8 실측: 탭 내용 영역 ${area.contentH}px (탭 바 아래 · 상태 줄 24px 제외, 선택 표시줄 없음)`);
  await p.close();
}
/* 11 — 연결 화면(IA v4 §4.2 · PR B.2) */
/* B.2 — 연결 화면 ⑦: 자동 찾기 + 텍스트 스타일 미리보기 · 카드 1 숫자 · 줄 · 스위치 · 스타일 먼저 · 건너뜀 칩 · 연결 · 첫 화면 복귀 */
{
  const p = await open(560, 'select');
  await openSel(p);
  const a = await sent(p, 'APPLY');
  const ts = await sent(p, 'PREVIEW_TEXT_STYLES');
  check('B2 선택 → 찾기 1번 + 텍스트 스타일 미리보기 1번(같은 차례 · 기준 nodeIds)', a.length === 1 && ts.length === 1 && ts[0].reqId === a[0].reqId && ts[0].nodeIds?.[0] === 's0' && a[0].preview === true);
  check('B2 텍스트 스타일 미리보기는 조용한 읽기(진행 줄 없음)', !(await visible(p, '#applyProgress')));
  await recv(p, { ...preview(a[0].reqId), candidates: B2_CANDS, counts: { styled: { color: 1 }, hidden: { gap: 2 }, 'no-match': { radius: 1 } }, reasons: { styled: 1, hidden: 2 }, skips: [{ nodeId: 'h1', name: 'Hidden', reason: 'hidden', field: 'itemSpacing' }, { nodeId: 'h2', name: 'Hidden2', reason: 'hidden', field: 'paddingLeft' }] });
  check('B2 찾기 응답만 오면 아직 "읽는 중"(텍스트 스타일 기다림)', (await p.textContent('#selCards')).includes('선택을 읽는 중…'));
  await recv(p, tsPrev(a[0].reqId, B2_TS, { noStyle: 3 }));
  const card = await p.textContent('#selCards');
  // m = 변수 줄 5곳(t1 글자 크기 뺌) + 스타일 2곳 = 7, k = 1
  check('B2 카드 1 — 스타일 먼저(한 자리 한 번) · [7곳 연결] · 텍스트 스타일 종류', card.includes('변수 없는 값 8곳') && card.includes('Spacing 2 · Radius 1 · Color 1 · Typography 1 · Text Style 2 · 새로 만들 값 1곳') && !card.includes('간격') && (await p.textContent('[data-k="link"]')) === '7곳 연결', card);
  await p.click('[data-k="link"]');
  check('B2 [7곳 연결] → 연결 화면 · 다시 찾지 않음', (await visible(p, '#subHead')) && (await sent(p, 'APPLY')).length === 1);
  check('B2 들어오면 포커스는 트리 첫 줄(첫 종류 머리)', await p.evaluate(() => document.activeElement === document.querySelector('#bindTree [data-tkey]')));
  check('B2 머리 "← 연결" · 오른쪽 "Card · 변수 없는 값 8곳"(이름 · 꼬리 두 span)', (await p.textContent('#subTitle')) === '연결' && (await p.textContent('#subRight')) === 'Card · 변수 없는 값 8곳' && (await p.textContent('#subRight .sub-right-name')) === 'Card', await p.textContent('#subRight'));
  const list = await bindList(p);
  check('B2 종류 머리(카드 1 순서) · (변수, 종류) 줄 · 텍스트 스타일 머리 맨 끝',
    JSON.stringify(list) === JSON.stringify(['Spacing 2곳', ['spacing/8', '2곳', true], 'Radius 1곳', ['spacing/8', '1곳', true], 'Color 1곳', ['color/text/default', '1곳', true], 'Typography 1곳', ['font/size/16', '1곳', true], 'Text Style 2곳', ['body/medium', '2곳', true]]),
    JSON.stringify(list));
  check('B2 [7곳 연결] 주 버튼 · 단계 표시 · [찾기] · 필터 없음', (await named(p, '#btnApplyConfirm', '7곳 연결')) && !(await locked(p, '#btnApplyConfirm')) && (await p.$('#bindSteps')) === null && (await p.$('#btnApply')) === null && (await p.$('#bindFilter')) === null);
  check('B2 줄 옅은 칸 — 종류 표시(● · #) 없음(종류는 왼쪽 동그라미 · 표시 — TR-D3)', (await p.$$eval('#bindTree .tr-row .vchip .bv-mark', (e) => e.length)) === 0 && (await p.$$eval('#bindTree .tr-row .vchip .al', (e) => e.length > 0 && e.every((a) => !/[●#T] /.test(a.textContent.replace(/^→ /, ''))))));
  check('B2 목록 treegrid · 접근성 이름 · 머리 줄 = 이름 · 개수 · 스위치만(미리보기 없음)', (await p.getAttribute('#bindTree', 'role')) === 'treegrid' && (await p.getAttribute('#bindTree', 'aria-label')) === '연결할 변수' && (await p.$$eval('#bindTree .tr-head', (e) => e.every((h) => !h.querySelector('.bv-chip, .vchip') && !!h.querySelector('.bv-switch')))));
  // 스위치 — 줄 단위
  check('TR-D1 트리 머리 줄 — 띠 없음(배경 투명 · .tr-group 없음) · 위 1px 선(첫 머리 0) · 이름 12px 600 --text-2', (await p.$$eval('#bindTree .tr-head', (e) => e.length > 1 && e.every((h, i) => { const cs = getComputedStyle(h); const n = getComputedStyle(h.querySelector('.tr-name')); return !h.classList.contains('tr-group') && cs.backgroundColor === 'rgba(0, 0, 0, 0)' && cs.borderTopWidth === (i === 0 ? '0px' : '1px') && n.fontSize === '12px' && n.fontWeight === '600' && n.color === 'rgb(94, 99, 107)'; }))));
  await p.hover('#bindTree .tr-row >> nth=0');
  const trHover = await p.$eval('#bindTree .tr-row', (e) => getComputedStyle(e).backgroundColor);
  await p.hover('#bindTree .tr-head >> nth=0');
  const headHover = await p.$eval('#bindTree .tr-head', (e) => getComputedStyle(e).backgroundColor);
  check('B.12 마우스 올림 띠 — 트리 줄은 --surface-hover · 머리 줄은 그대로(투명 — TR-D1)', trHover === 'rgb(236, 238, 240)' && headHover === 'rgba(0, 0, 0, 0)', `${trHover} / ${headHover}`);
  await p.mouse.move(0, 0);
  await p.click('#bindTree .tr-row >> nth=1 >> .bv-switch'); // 반경 줄
  check('B2 반경 줄만 끔 → 간격 줄은 켠 채 · [6곳 연결]', JSON.stringify((await bindList(p)).filter(Array.isArray).map((x) => x[2])) === JSON.stringify([true, false, true, true, true]) && (await named(p, '#btnApplyConfirm', '6곳 연결')));
  // 스타일 줄을 끄면 t1 글자 크기가 글자 변수 후보로 되돌아온다
  await p.click('#bindTree .tr[data-tkey="ts:S:body"] .bv-switch');
  const l2 = await bindList(p);
  check('B2 스타일 줄 끔 → 글자 줄 2곳(되돌림) · Typography 머리 2곳 · [5곳 연결]', l2.includes('Typography 2곳') && JSON.stringify(l2.find((x) => Array.isArray(x) && x[0] === 'font/size/16')) === JSON.stringify(['font/size/16', '2곳', true]) && (await named(p, '#btnApplyConfirm', '5곳 연결')), JSON.stringify(l2));
  check('B2 스타일 줄을 꺼도 포커스는 그 줄', (await p.evaluate(() => document.activeElement?.closest('[data-tkey]')?.dataset.tkey)) === 'ts:S:body');
  await p.click('#bindTree .tr[data-tkey="ts:S:body"] .bv-switch');
  // 모두 끄기 → 잠금 사유, 모두 켜기
  await p.click('#bindAllOff');
  check('B2 모두 끄기 뒤 포커스는 링크', (await p.evaluate(() => document.activeElement?.id)) === 'bindAllOff');
  const offLocked = await locked(p, '#btnApplyConfirm');
  const offMsg = await lockMsg(p, '#btnApplyConfirm');
  check('B2 모두 끄기(스타일 줄 포함) → [연결] 잠금 · 사유', offLocked && offMsg === '연결할 변수를 켜세요', `${offLocked} ${offMsg}`);
  await p.click('#bindAllOn');
  check('B2 모두 켜기 → [7곳 연결]', (await named(p, '#btnApplyConfirm', '7곳 연결')) && (await bindList(p)).filter(Array.isArray).every((x) => x[2]));
  // 키보드 — 정지점 1개 · ↓ · Space
  check('B2 트리 정지점 1개 · 스위치는 tabIndex -1', (await p.$$eval('#bindTree [data-tkey]', (e) => e.filter((x) => x.tabIndex === 0).length)) === 1 && (await p.$$eval('#bindTree .bv-switch', (e) => e.every((x) => x.tabIndex === -1))));
  await p.focus('#bindTree [data-tkey]');
  for (let i = 0; i < 3; i++) await p.keyboard.press('ArrowDown');
  await p.keyboard.press('Space');
  check('B2 ↓×3 → 반경 줄 · Space → 끔', JSON.stringify((await bindList(p)).filter(Array.isArray).map((x) => x[2])) === JSON.stringify([true, false, true, true, true]));
  await p.keyboard.press('Space');
  await p.keyboard.press('ArrowUp'); // 반경 머리
  await p.keyboard.press('ArrowLeft');
  check('B2 머리에서 ← → 접힘(줄 숨김) · → 펼침', (await p.getAttribute('#bindTree [data-tkey="kind:radius"]', 'aria-expanded')) === 'false' && (await bindList(p)).filter(Array.isArray).length === 4);
  await p.keyboard.press('ArrowRight');
  await p.click('#bindTree [data-tkey="kind:gap"] .bv-switch');
  check('B2 머리 스위치 → 그 종류 줄 모두 끔', JSON.stringify((await bindList(p)).filter(Array.isArray).map((x) => x[2])) === JSON.stringify([false, true, true, true, true]) && (await p.getAttribute('#bindTree [data-tkey="kind:gap"] .bv-switch', 'aria-checked')) === 'false');
  await p.click('#bindTree [data-tkey="kind:gap"] .bv-switch');
  // 건너뜀 칩 — s는 자리 단위(스타일 사용 중 1곳), 레이어 단위 · 텍스트 스타일 사유는 칩 안에만
  check('B2 건너뜀 칩 — s = 0이고 스타일 사용 중이 있으면 "건너뛴 곳 ▸"(styled는 s에 안 더함)', (await p.textContent('#bindSkipToggle')) === '건너뛴 곳 ▸', await p.textContent('#bindSkipToggle'));
  await p.click('#bindSkipToggle');
  const chips = await p.$$eval('#bindSkips .skip-name', (e) => e.map((x) => x.textContent));
  check('B2 건너뛴 곳 목록 — 그대로 둬도 되는 곳 한 묶음 · 줄(스타일 사용 중 · 숨긴 레이어 · 같은 스타일 없음) · 그대로 둬도 되는 곳 줄에는 [선택 ›] 없음(결정 A 확장)', JSON.stringify(chips) === JSON.stringify(['스타일 사용 중', '숨긴 레이어', '같은 스타일 없음']) && JSON.stringify(await p.$$eval('#bindSkips .skip-head', (e) => e.map((x) => x.textContent))) === JSON.stringify(['그대로 둬도 되는 곳']) && (await p.$$eval('#bindSkips .skip-sel', (e) => e.length)) === 0, JSON.stringify(chips));
  await p.screenshot({ path: process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/b2-bind.png` : '/dev/null' }).catch(() => {});
  // 연결 — 변수 자리 + 켠 스타일 줄을 한 번에
  await p.click('#btnApplyConfirm');
  const req = (await sent(p, 'APPLY_SELECTED')).at(-1);
  check('B2 연결 요청 — 변수 5곳(t1 글자 크기 없음) + textStyles 1줄', req?.items?.length === 5 && !req.items.some((i) => i.nodeId === 't1') && JSON.stringify(req.textStyles) === JSON.stringify([{ styleId: 'S:body', nodeIds: ['t1', 't2'] }]), JSON.stringify(req));
  check('B2 연결 중 — 진행 줄 · 아래 버튼 숨김 · [취소] 없음', (await visible(p, '#applyProgress')) && !(await visible(p, '#bindFoot')) && !(await visible(p, '#btnApplyCancel')));
  await recv(p, { type: 'PROGRESS', op: 'link', done: 3, total: 5 });
  check('B2 연결 중… 3 / 5', (await p.textContent('#applyProgressText')).includes('3 / 5'), await p.textContent('#applyProgressText'));
  const a0 = (await sent(p, 'APPLY')).length;
  await recv(p, { type: 'APPLY_RESULT', bound: 4, skipped: 1, reasons: { 'already-bound': 1 }, skips: [], reqId: req.reqId, textStylesApplied: 2, textStylesSkipped: 0 });
  await p.waitForTimeout(400);
  check('B2 연결 끝 → 첫 화면 · 상태 줄 "🔗 6곳 연결 · ⌘Z로 되돌리기 · 건너뜀 1"', (await visible(p, '#selHome')) && (await p.textContent('#statusText')) === '🔗 6곳 연결 · ⌘Z로 되돌리기 · 건너뜀 1', await p.textContent('#statusText'));
  check('B2 연결 끝 → 카드 다시 읽음(찾기 1번 더)', (await sent(p, 'APPLY')).length === a0 + 1, `${(await sent(p, 'APPLY')).length - a0}`);
  await p.close();
}
{
  // 기준이 같으면 끈 스위치 이어받기(조용한 재계산) · 후보 0 · 취소 · 오류
  const p = await open(560, 'select');
  await openSel(p);
  await found(p, { candidates: B2_CANDS.slice(0, 3) });
  await p.click('[data-k="link"]');
  await p.click('#bindTree .tr-row >> nth=1 >> .bv-switch'); // 반경 줄 끔
  await reenter(p);
  await recv(p, PREREQ);
  await p.waitForTimeout(500);
  check('B2 창 다시 들어옴 → 조용히 다시 찾기(진행 줄 없음)', (await sent(p, 'APPLY')).length === 2 && (await sent(p, 'PREVIEW_TEXT_STYLES')).length === 2 && !(await visible(p, '#applyProgress')));
  await found(p, { candidates: [...B2_CANDS.slice(0, 3), cand('n3', 'topLeftRadius', 'sp8', 'spacing/8')] });
  check('B2 같은 (변수, 종류) 줄은 꺼진 채 이어받음 · 알림', JSON.stringify((await bindList(p)).filter(Array.isArray)) === JSON.stringify([['spacing/8', '2곳', true], ['spacing/8', '2곳', false]]) && (await p.textContent('#statusText')).includes('1곳 추가'), JSON.stringify(await bindList(p)));
  // 후보 0
  await reenter(p);
  await recv(p, PREREQ);
  await p.waitForTimeout(500);
  await found(p, { candidates: [], counts: { 'no-match': { color: 2 } } });
  check('B2 후보 0 → "연결할 수 있는 값이 없어요" + [변수 만들기 →]', (await emptyText(p)) === '연결할 수 있는 값이 없어요' && (await p.textContent('#bindEmpty')).includes('변수 만들기 →') && (await locked(p, '#btnApplyConfirm')));
  await p.close();
}
{
  // [읽기]로 시작한 찾기 — 진행률 · 취소 → "읽기를 취소했어요 · [다시 읽기]"
  const p = await open(560, 'select');
  await recv(p, PREREQ);
  await recv(p, { type: 'VAR_TABLE', collections: COLS, vars: VARS });
  await recv(p, { ...sel(1, 0), scanned: 400 });
  await p.waitForTimeout(450);
  check('B2 큰 선택 → 자동으로 찾지 않음', (await sent(p, 'APPLY')).length === 0 && (await sent(p, 'PREVIEW_TEXT_STYLES')).length === 0);
  await p.click('#selCards button');
  check('B2 [읽기] → 찾기 + 텍스트 스타일 미리보기 · 진행 줄', (await sent(p, 'APPLY')).length === 1 && (await sent(p, 'PREVIEW_TEXT_STYLES')).length === 1);
  await recv(p, { type: 'APPLY_RESULT', preview: true, cancelled: true, bound: 0, skipped: 0, reasons: {}, reqId: await lastReq(p, 'APPLY') });
  check('B2 취소 → "읽기를 취소했어요" + [다시 읽기]', (await p.textContent('#statusText')) === '읽기를 취소했어요' && (await p.textContent('#statusAction')).includes('다시 읽기'), await p.textContent('#statusText'));
  await p.close();
}
{
  // 텍스트 스타일만 모습(noTier) — 변수 찾기 없음 · 카드 1 안에 [{t}곳 연결] · 연결 화면은 스타일 줄만
  const p = await open(560, 'select');
  await openSel(p, { ...PREREQ, hasBindable: false, tierVars: 0, otherVars: 3 });
  check('B2 noTier → 변수 찾기 없이 텍스트 스타일 미리보기만', (await sent(p, 'APPLY')).length === 0 && (await sent(p, 'PREVIEW_TEXT_STYLES')).length === 1);
  await recv(p, tsPrev((await sent(p, 'PREVIEW_TEXT_STYLES')).at(-1).reqId, B2_TS, { hasStyle: 1 }));
  check('B2 noTier 카드 1 안에 "Text Style 2곳" + [2곳 연결]', (await p.textContent('#selCards')).includes('Text Style 2곳') && (await p.textContent('[data-k="tsLink"]')) === '2곳 연결');
  check('B11 noTier 카드 — [변수 만들기 →] 없음 · [2곳 연결]은 주 버튼', (await p.$('#selCards [data-k="make"]')) === null && (await p.$eval('[data-k="tsLink"]', (b) => b.classList.contains('primary'))));
  await p.click('[data-k="tsLink"]');
  check('B2 텍스트 스타일만 — 머리 오른쪽 "Card · Text Style 2곳" · 줄은 스타일 줄만 · [2곳 연결]', (await p.textContent('#subRight')) === 'Card · Text Style 2곳' && JSON.stringify(await bindList(p)) === JSON.stringify(['Text Style 2곳', ['body/medium', '2곳', true]]) && (await named(p, '#btnApplyConfirm', '2곳 연결')), await p.textContent('#subRight'));
  check('B2 텍스트 스타일만 — 칩 "건너뛴 곳 ▸" · 목록에 이미 스타일 있음(hasStyle 보임)', (await p.textContent('#bindSkipToggle')) === '건너뛴 곳 ▸' && (await p.$$eval('#bindSkips .skip-name', (e) => e.map((x) => x.textContent))).includes('이미 스타일 있음'), await p.textContent('#bindSkipToggle'));
  await p.click('#btnApplyConfirm');
  const req = (await sent(p, 'APPLY_SELECTED')).at(-1);
  check('B2 텍스트 스타일만 연결 — items 0 · textStyles 1줄', req?.items?.length === 0 && req.textStyles?.length === 1);
  await p.close();
}
{
  // 찾기 오류 → 읽는 중에 멈추지 않음 · [다시 시도]는 찾기 / 텍스트 스타일 미리보기 오류는 변수 연결을 막지 않음
  const p = await open(560, 'select');
  await openSel(p);
  const id = await lastReq(p, 'APPLY');
  await recv(p, { ...preview(id), candidates: B2_CANDS.slice(0, 2) });
  await recv(p, { type: 'ERROR', op: 'PREVIEW_TEXT_STYLES', message: 'boom' });
  check('B2 텍스트 스타일 미리보기 오류 → 변수 줄로 그림 · [2곳 연결]', (await p.textContent('[data-k="link"]')) === '2곳 연결');
  await p.close();
}

/* 12 — 변수 고치기(§4.4 고치기 · PR 3.5) */
const ECOLS = [
  ...COLS,
  { id: 'x', name: 'Misc', tier: 0, modes: [{ modeId: 'x1', name: 'Mode 1' }], defaultModeId: 'x1' },
];
const EVARS = [
  ...VARS,
  { id: 'tm', name: 'color/text/muted', collectionId: 's', type: 'COLOR', values: { l: { kind: 'alias', aliasId: 'g9', aliasName: 'color/gray/900' }, d: { kind: 'color', hex: '#888888' } }, scopes: [], description: '' },
  { id: 'xa', name: 'misc/a', collectionId: 'x', type: 'COLOR', values: { x1: { kind: 'alias', aliasId: 'xb', aliasName: 'misc/b' } }, scopes: [], description: '' },
  { id: 'xb', name: 'misc/b', collectionId: 'x', type: 'COLOR', values: { x1: { kind: 'color', hex: '#FF0000' } }, scopes: [], description: '' },
];
const NAME = '.modal input[aria-label="이름(전체 경로)"]';
const edAlert = (p) => p.$eval('.modal .ed-alert', (e) => (e.hidden ? '' : e.textContent));
const edSaveLocked = (p) => p.$eval('.modal .m-foot button.primary', (e) => e.getAttribute('aria-disabled') === 'true');
const edSaveText = (p) => p.textContent('.modal .m-foot button.primary');
const edCloseText = (p) => p.textContent('.modal .m-foot button:not(.primary)');
const activeText = (p) => p.evaluate(() => document.activeElement?.textContent ?? '');
const activeLabel = (p) => p.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? '');
const pickerOpts = (p) => p.$$eval('.ed-picker [role="option"]', (e) => e.map((x) => x.textContent));
const pickerNotes = (p) => p.$$eval('.ed-picker .ed-pnote, .ed-picker .ed-pnone', (e) => e.map((x) => x.textContent));
async function openEditList(opts = {}) {
  let p;
  if (opts.clock) {
    // 10초 시간 초과는 가짜 시계로 — 설치는 페이지를 열기 전에.
    p = await browser.newPage({ viewport: { width: 560, height: 510 } });
    p.on('pageerror', (e) => pageErrors.push(e.message));
    await p.clock.install();
    await p.addInitScript(() => {
      window.__sent = [];
      window.parent.postMessage = (m) => window.__sent.push(m.pluginMessage);
    });
    await p.goto(url);
    await goTab(p, 'variables');
  } else p = await open(560, 'variables');
  await recv(p, PREREQ);
  await recv(p, { type: 'VAR_TABLE', collections: ECOLS, vars: EVARS });
  await recv(p, { ...sel(1, 2), scanned: 40, firstName: 'Card', ids: ['1:2'] });
  await p.waitForTimeout(450);
  await recv(p, usageResult((await sent(p, 'SCAN_USAGE')).at(-1).reqId, { tx: { places: 8, layers: 5 } }));
  return p;
}
/** v4 §4.6 — 상세는 Enter(클릭은 연결). 옛 "고치기…"는 없앴다 — 상세를 열고 이름 칸으로. */
async function openDetailOf(p, id) {
  await p.focus(`#varTree [data-id="${id}"]`);
  await p.keyboard.press('Enter');
}
async function menuEdit(p, id) {
  await openDetailOf(p, id);
  await p.focus('.modal input[aria-label="이름(전체 경로)"]');
}
async function saveAndGet(p) {
  await p.click('.modal .m-foot button.primary');
  return (await sent(p, 'UPDATE_VARIABLE')).at(-1);
}
{
  const p = await openEditList();
  // 열 때 포커스 — 상세(Enter) → [닫기]
  await openDetailOf(p, 'tx');
  check('12 상세로 열면 [닫기]에 포커스 · [저장] 잠김', (await activeText(p)) === '닫기' && (await edSaveLocked(p)) && (await edCloseText(p)) === '닫기');
  check('12 이름 칸 · 모드마다 값 칸(별칭은 알약) · [▾]', (await p.inputValue(NAME)) === 'color/text/default' && (await p.$$('.modal .ed-pillbtn')).length === 2 && (await p.$$('.modal button.ed-dd')).length === 2);
  await p.click('.modal .m-foot button.primary', { force: true });
  check('12 고친 것 없이 [저장] → 알림 줄 "고친 것이 없어요"(상태 줄 아님)', (await edAlert(p)) === '고친 것이 없어요');
  await p.keyboard.press('Escape');
  check('12 고친 것 없으면 Esc로 바로 닫힘 · 원래 행으로', (await p.$('.modal')) === null && (await p.evaluate(() => document.activeElement?.dataset?.id)) === 'tx');
  // 고치기… → 이름 칸
  await menuEdit(p, 'tx');
  await p.fill(NAME, 'color//default');
  check('12 빈 토막 → "이름의 \'/\' 사이가 비어 있어요" · [취소] · [저장] 잠김', (await p.textContent('.modal .ed-ferr')) === "이름의 '/' 사이가 비어 있어요" && (await edCloseText(p)) === '취소' && (await edSaveLocked(p)));
  await p.fill(NAME, 'color/text/muted');
  check('12 같은 이름 → "이 컬렉션에 같은 이름이 있어요"', (await p.textContent('.modal .ed-ferr')) === '이 컬렉션에 같은 이름이 있어요');
  await p.click('.modal .m-foot button.primary', { force: true });
  check('12 입력 오류로 [저장] → "입력을 확인해 주세요" + 첫 오류 칸', (await edAlert(p)) === '입력을 확인해 주세요' && (await activeLabel(p)) === '이름(전체 경로)');
  await p.fill(NAME, ' color / fg /default');
  check('12 칸을 고치면 사건 문구를 지움', (await edAlert(p)) === '');
  const changes = await p.$eval('.modal .ed-changes', (e) => (e.hidden ? '' : e.textContent));
  check('12 바뀌는 것 줄: 그룹 이동(새 그룹) + CSS', changes.includes('그룹 이동: color/text → color/fg') && changes.includes('(새 그룹)') && changes.includes('CSS: --color-text-default → --color-fg-default') && !changes.includes('비어서 사라져요'), changes);
  // 별칭 고르개 — Semantic: Global 색만, 지금 대상 ✓
  await p.click('.modal button[aria-label="Light 별칭 고르기"]');
  check('12 고르개 열면 검색 칸 포커스 · listbox', (await p.evaluate(() => document.activeElement?.classList.contains('ed-psearch'))) && (await p.$$('.ed-picker [role="listbox"]')).length === 1);
  const opts = await pickerOpts(p);
  check('12 후보: 값으로 적기 + 같은 타입 · 낮은 계층(Global)만 · 지금 대상 ✓', JSON.stringify(opts.map((x) => x.replace(/\s+/g, ' ').trim())) === JSON.stringify(['값으로 적기 #111111', '0', '900✓']), JSON.stringify(opts));
  check('12 경로 머리 "G Global › color/gray" · 안내 줄 라이브러리', (await p.textContent('.ed-picker .ed-phead')) === 'G Global › color/gray' && (await pickerNotes(p)).includes('라이브러리 변수는 대상으로 고를 수 없어요'));
  const layer = await p.$eval('.ed-picker', (e) => ({ pos: getComputedStyle(e).position, max: parseInt(getComputedStyle(e).maxHeight, 10), inDd: e.parentElement?.closest('dd') !== null }));
  check('12 고르개는 덮는 층(absolute · 최대 240px · dd 안) — 아래 줄을 밀지 않음', layer.pos === 'absolute' && layer.max <= 240 && layer.max >= 124 && layer.inDd, JSON.stringify(layer));
  await p.focus('.modal button[aria-label="Dark 별칭 고르기"]');
  check('12 포커스가 층 밖으로 나가면 고르개 닫힘(focusout)', (await p.$$('.ed-picker')).length === 0);
  await p.click('.modal button[aria-label="Dark 별칭 고르기"]');
  check('12 고르개는 하나만 열림', (await p.$$('.ed-picker')).length === 1 && (await p.$eval('.ed-picker', (e) => !!e.closest('dd')?.querySelector('[aria-label="Dark 별칭 고르기"]'))));
  await p.keyboard.press('Escape');
  check('12 고르개 Esc → 고르개만 닫고 그 [▾]로', (await p.$$('.ed-picker')).length === 0 && (await p.$('.modal')) !== null && (await activeLabel(p)) === 'Dark 별칭 고르기');
  // 별칭 → 값으로 적기 → 다시 별칭
  await p.click('.modal button[aria-label="Dark 별칭 고르기"]');
  await p.keyboard.press('ArrowDown');
  await p.keyboard.press('Enter');
  check('12 값으로 적기 → 따라간 값(대상 컬렉션 기본 모드)', (await p.inputValue('.modal input[aria-label="Dark 값"]')) === '#FFFFFF' && (await activeLabel(p)) === 'Dark 값');
  await p.fill('.modal input[aria-label="Dark 값"]', '#FFFFF');
  check('12 틀린 색 → "#RRGGBB 형식으로 적어 주세요"', (await p.$$eval('.modal .ed-ferr', (e) => e.map((x) => x.textContent))).includes('#RRGGBB 형식으로 적어 주세요'));
  await p.fill('.modal input[aria-label="Dark 값"]', '#ffffff80');
  // 저장 — 고친 것만, base와 함께
  const u = await saveAndGet(p);
  check('12 저장 → UPDATE_VARIABLE(정리한 이름 · 고친 모드만 · base)', u?.id === 'tx' && u.name === 'color/fg/default' && JSON.stringify(Object.keys(u.values)) === JSON.stringify(['d']) && u.values.d.kind === 'color' && u.values.d.hex === '#FFFFFF' && Math.round(u.values.d.alpha * 255) === 128 && u.base.name === 'color/text/default' && u.base.values.d.aliasId === 'g0' && !('l' in u.base.values), JSON.stringify(u));
  check('12 저장 중: [저장 중…] 잠김 · 칸 잠김', (await edSaveText(p)) === '저장 중…' && (await edSaveLocked(p)) && (await p.$eval(NAME, (e) => e.disabled)));
  await p.keyboard.press('Escape');
  check('12 저장 중에는 Esc로 닫히지 않음 · "저장 중이에요"', (await p.$('.modal')) !== null && (await edAlert(p)) === '저장 중이에요');
  const tables0 = (await sent(p, 'GET_VAR_TABLE')).length;
  await recv(p, { type: 'VARIABLE_UPDATED', reqId: u.reqId, ok: true, applied: ['name', 'd'] });
  check('12 바뀐 응답 → 다시 읽기(GET_VAR_TABLE) · 표가 올 때까지 저장 중 유지', (await sent(p, 'GET_VAR_TABLE')).length === tables0 + 1 && (await edSaveText(p)) === '저장 중…');
  const V2 = EVARS.map((v) => (v.id === 'tx' ? { ...v, name: 'color/fg/default', values: { ...v.values, d: { kind: 'color', hex: '#FFFFFF', alpha: 128 / 255 } } } : v));
  await recv(p, { type: 'VAR_TABLE', collections: ECOLS, vars: V2 });
  check('12 성공 → 문구 없음 · [닫기] 포커스 · [저장] 잠김 · 칸이 새 값', (await edAlert(p)) === '' && (await activeText(p)) === '닫기' && (await edSaveLocked(p)) && (await edSaveText(p)) === '저장' && (await p.inputValue(NAME)) === 'color/fg/default' && (await p.inputValue('.modal input[aria-label="Dark 값"]')) === '#FFFFFF80' && (await p.textContent('.modal h3')).includes('color/fg/default'));
  check('12 성공 뒤 고친 표시 없음', (await p.$$('.modal .ed-field.changed')).length === 0);
  await p.keyboard.press('Escape');
  check('12 닫은 뒤 변수 id로 행 다시 찾아 포커스 · 상태 줄 문구 없음', (await p.evaluate(() => document.activeElement?.dataset?.id)) === 'tx' && !(await p.textContent('#statusText')).includes('행은'));
  await p.close();
}
{
  // 행이 지금 목록에 없게 됨(그룹 이동) → 오른쪽 목록 머리 + 상태 줄
  const p = await openEditList();
  await p.click('#varSide [data-key="side:col:s"]');
  await p.fill('#varSearch', 'color/text'); // v4: 그룹 항목이 없어 검색으로 좁힌다
  await menuEdit(p, 'tx');
  await p.fill(NAME, 'color/fg/default');
  const u = await saveAndGet(p);
  await recv(p, { type: 'VARIABLE_UPDATED', reqId: u.reqId, ok: true, applied: ['name'] });
  await recv(p, { type: 'VAR_TABLE', collections: ECOLS, vars: EVARS.map((v) => (v.id === 'tx' ? { ...v, name: 'color/fg/default' } : v)) });
  await p.click('.modal .m-foot button:not(.primary)');
  check('12 항목이 목록에 없으면 첫 항목으로 · "{새 이름}은 지금 목록에 보이지 않아요"', (await p.evaluate(() => document.activeElement?.closest('#varTree, #listHead') !== null)) && (await p.textContent('#statusText')) === 'color/fg/default은 지금 목록에 보이지 않아요', await p.textContent('#statusText'));
  // 고르개 후보: Global은 없음 · 계층 없음은 모든 컬렉션(순환 제외)
  await p.click('#varSide [data-key="side:col:g"]');
  await menuEdit(p, 'g0');
  await p.click('.modal button[aria-label="Mode 1 별칭 고르기"]');
  check('12 Global → "Global은 다른 변수를 가리키지 않아요"', (await pickerNotes(p)).includes('Global은 다른 변수를 가리키지 않아요') && (await pickerOpts(p)).length === 0);
  await p.keyboard.press('Escape');
  await p.keyboard.press('Escape');
  await p.click('#varSide [data-key="side:col:x"]');
  await menuEdit(p, 'xb');
  await p.click('.modal button[aria-label="Mode 1 별칭 고르기"]');
  const xo = await p.$$eval('.ed-picker [role="option"]', (e) => e.map((x) => x.title));
  check('12 계층 없음 → 모든 컬렉션 · 자기 · 순환(misc/a → misc/b) 제외 · 안내 줄', !xo.includes('misc/a') && !xo.includes('misc/b') && xo.includes('color/gray/0') && xo.includes('color/fg/default') && (await pickerNotes(p)).includes('계층이 없는 컬렉션이라 모든 변수를 보여요'), JSON.stringify(xo));
  await p.fill('.ed-psearch', 'GRAY/9');
  check('12 고르개 검색(전체 경로 · 대소문자 무시)', JSON.stringify(await p.$$eval('.ed-picker [role="option"]', (e) => e.map((x) => x.title))) === JSON.stringify(['color/gray/900']));
  await p.keyboard.press('ArrowDown');
  await p.keyboard.press('Enter');
  check('12 후보 고르면 별칭 알약 · 고르개 닫힘', (await p.$$('.ed-picker')).length === 0 && (await p.textContent('.modal .ed-pill')).includes('→ color/gray/900'));
  await p.close();
}
{
  // 일부 실패 · 버리기 확인 · 닫을 때 "일부만 저장됐어요"
  const p = await openEditList();
  await p.click('#varSide [data-key="side:col:s"]');
  await menuEdit(p, 'tm');
  await p.click('.modal button[aria-label="Light 별칭 고르기"]');
  await p.click('.ed-picker [role="option"][title="color/gray/0"]');
  await p.fill('.modal input[aria-label="Dark 값"]', '#777777');
  const u = await saveAndGet(p);
  check('12 별칭으로 바꿈 → {kind:alias, targetId}', u.values.l?.kind === 'alias' && u.values.l.targetId === 'g0' && u.values.d?.hex === '#777777');
  await recv(p, { type: 'VARIABLE_UPDATED', reqId: u.reqId, ok: false, applied: ['l'], error: { code: 'value', modeId: 'd', message: 'Invalid value' } });
  await recv(p, { type: 'VAR_TABLE', collections: ECOLS, vars: EVARS.map((v) => (v.id === 'tm' ? { ...v, values: { ...v.values, l: { kind: 'alias', aliasId: 'g0', aliasName: 'color/gray/0' } } } : v)) });
  check('12 일부 실패 → "피그마가 이 값을 받지 않아요 · 일부만 저장됐어요" · 남은 칸만 입력 유지 · 첫 오류 칸', (await edAlert(p)) === '피그마가 이 값을 받지 않아요 · 일부만 저장됐어요' && (await p.inputValue('.modal input[aria-label="Dark 값"]')) === '#777777' && (await activeLabel(p)) === 'Dark 값' && !(await edSaveLocked(p)) && (await p.$$('.modal .ed-field.changed')).length === 1);
  check('12 피그마 거절 원문은 툴팁', (await p.getAttribute('.modal .ed-alert', 'title')) === 'Invalid value');
  const u2 = await saveAndGet(p);
  check('12 다시 저장하면 남은 것만 · base는 새 표', JSON.stringify(Object.keys(u2.values)) === JSON.stringify(['d']) && u2.base.values.d.hex === '#888888' && u2.name === undefined);
  await recv(p, { type: 'VARIABLE_UPDATED', reqId: u2.reqId, ok: false, applied: [], error: { code: 'value', modeId: 'd', message: 'Invalid value' } });
  check('12 첫 변경부터 실패 → 잠그지 않음 · 다시 읽기 없음', !(await edSaveLocked(p)) && (await edAlert(p)) === '피그마가 이 값을 받지 않아요');
  await p.keyboard.press('Escape');
  check('12 고친 것이 있으면 Esc → 확인 줄 · [계속 고치기]에 포커스', (await p.$eval('.modal .ed-confirm', (e) => !e.hidden && e.textContent.includes('고친 내용을 버릴까요?'))) && (await activeText(p)) === '계속 고치기');
  check('12 확인 줄이 떠도 알림 줄은 그대로', (await edAlert(p)) === '피그마가 이 값을 받지 않아요');
  await p.keyboard.press('Escape');
  check('12 확인 줄에서 Esc = [계속 고치기] → 확인 줄 닫고 직전 칸', (await p.$eval('.modal .ed-confirm', (e) => e.hidden)) && (await activeLabel(p)) === 'Dark 값');
  await p.click('.modal .m-foot button:not(.primary)');
  await p.click('.modal .ed-confirm button >> text=버리기');
  check('12 [버리기] → 닫힘 · "일부만 저장됐어요"(행 있음) · 원래 행', (await p.$('.modal')) === null && (await p.textContent('#statusText')) === '일부만 저장됐어요' && (await p.evaluate(() => document.activeElement?.dataset?.id)) === 'tm');
  await p.close();
}
{
  // 다른 곳에서 바뀜 · 삭제됨 · 이름 거절
  const p = await openEditList();
  await menuEdit(p, 'tx');
  await p.fill(NAME, 'color/text/main');
  let u = await saveAndGet(p);
  await recv(p, { type: 'VARIABLE_UPDATED', reqId: u.reqId, ok: false, applied: [], error: { code: 'name', message: 'Invalid name' } });
  check('12 이름 거절 → 이름 칸 아래 "피그마가 이 이름을 받지 않아요"(툴팁 원문) · 잠그지 않음 · 이름 칸 포커스', (await p.textContent('.modal .ed-ferr')) === '피그마가 이 이름을 받지 않아요' && (await p.getAttribute('.modal .ed-ferr', 'title')) === 'Invalid name' && !(await edSaveLocked(p)) && (await activeLabel(p)) === '이름(전체 경로)');
  await p.fill(NAME, 'color/text/main2');
  check('12 이름 칸을 고치면 거절 문구 지움', (await p.$eval('.modal .ed-ferr', (e) => e.hidden)));
  const tables0 = (await sent(p, 'GET_VAR_TABLE')).length;
  u = await saveAndGet(p);
  await recv(p, { type: 'VARIABLE_UPDATED', reqId: u.reqId, ok: false, applied: [], error: { code: 'conflict' } });
  check('12 다른 곳에서 바뀜 → 남는 문구 · [저장] 잠김 · 칸 유지 · 다시 읽기 없음', (await edAlert(p)) === '다른 곳에서 바뀌었어요 · 닫고 다시 열어 주세요' && (await edSaveLocked(p)) && (await p.inputValue(NAME)) === 'color/text/main2' && (await sent(p, 'GET_VAR_TABLE')).length === tables0);
  await p.fill(NAME, 'color/text/main3');
  await p.click('.modal .m-foot button.primary', { force: true });
  check('12 남는 문구는 칸을 고쳐도 · [저장]을 눌러도 그대로', (await edAlert(p)) === '다른 곳에서 바뀌었어요 · 닫고 다시 열어 주세요' && (await edSaveLocked(p)));
  await p.keyboard.press('Escape');
  await p.click('.modal .ed-confirm button >> text=버리기');
  check('12 바뀐 응답이 없었으면 닫을 때 상태 줄 문구 없음', !(await p.textContent('#statusText')).includes('저장'));
  await menuEdit(p, 'tx');
  await p.fill(NAME, 'color/text/main');
  u = await saveAndGet(p);
  await recv(p, { type: 'VARIABLE_UPDATED', reqId: u.reqId, ok: false, applied: [], error: { code: 'deleted' } });
  check('12 삭제됨 → "변수가 삭제됐어요" · [저장] 잠김', (await edAlert(p)) === '변수가 삭제됐어요' && (await edSaveLocked(p)));
  await p.close();
}
{
  // 응답·표가 오지 않음 — ERROR · 10초 → "저장됐을 수 있어요", 늦은 응답·표로는 팝업을 다시 그리지 않음
  const p = await openEditList({ clock: true });
  await menuEdit(p, 'tx');
  await p.fill(NAME, 'color/text/main');
  let u = await saveAndGet(p);
  await recv(p, { type: 'ERROR', message: 'boom', op: 'UPDATE_VARIABLE' });
  check('12 ERROR(UPDATE_VARIABLE) → "저장됐을 수 있어요 · 닫고 다시 열어 주세요" · [저장] 잠김 · 칸 풀림', (await edAlert(p)) === '저장됐을 수 있어요 · 닫고 다시 열어 주세요' && (await edSaveLocked(p)) && (await edSaveText(p)) === '저장' && !(await p.$eval(NAME, (e) => e.disabled)));
  const t0 = (await sent(p, 'GET_VAR_TABLE')).length;
  await recv(p, { type: 'VARIABLE_UPDATED', reqId: u.reqId, ok: true, applied: ['name'] });
  await recv(p, { type: 'VAR_TABLE', collections: ECOLS, vars: EVARS.map((v) => (v.id === 'tx' ? { ...v, name: 'color/text/main' } : v)) });
  check('12 늦은 바뀐 응답 → 목록만 다시 읽음 · 팝업은 다시 그리지 않음', (await sent(p, 'GET_VAR_TABLE')).length === t0 + 1 && (await edAlert(p)) === '저장됐을 수 있어요 · 닫고 다시 열어 주세요' && (await edCloseText(p)) === '취소' && (await p.textContent('.modal h3')).includes('color/text/default'));
  await p.keyboard.press('Escape');
  await p.click('.modal .ed-confirm button >> text=버리기');
  check('12 늦은 응답도 닫을 때 판정에 넣음(행 있음 → 문구 없음) · 닫기는 다시 됨', (await p.$('.modal')) === null && (await p.evaluate(() => document.activeElement?.dataset?.id)) === 'tx');
  // 10초 시간 초과
  await p.click('#varSide [data-key="side:col:s"]');
  await menuEdit(p, 'tm');
  await p.fill('.modal input[aria-label="Dark 값"]', '#777777');
  u = await saveAndGet(p);
  await p.clock.fastForward(10100);
  check('12 10초 동안 응답 없음 → "저장됐을 수 있어요"', (await edAlert(p)) === '저장됐을 수 있어요 · 닫고 다시 열어 주세요' && (await edSaveLocked(p)));
  // 바뀐 응답 뒤 표가 오지 않음(ERROR GET_VAR_TABLE)
  await p.keyboard.press('Escape');
  await p.click('.modal .ed-confirm button >> text=버리기');
  await menuEdit(p, 'tm');
  await p.fill('.modal input[aria-label="Dark 값"]', '#777777');
  u = await saveAndGet(p);
  await recv(p, { type: 'VARIABLE_UPDATED', reqId: u.reqId, ok: true, applied: ['d'] });
  await recv(p, { type: 'ERROR', message: 'table', op: 'GET_VAR_TABLE' });
  check('12 바뀐 응답 뒤 표 ERROR → "저장됐을 수 있어요"', (await edAlert(p)) === '저장됐을 수 있어요 · 닫고 다시 열어 주세요' && (await edSaveText(p)) === '저장');
  await p.close();
}

/* ---------- 12b 별칭 고르개(IA v4 §4.8 B.3) — 덮는 층 · 용도 거르기 · "용도가 다른 변수도 보기" · [▾]의 Esc · 배경 누름 ---------- */
{
  const PCOLS = [
    { id: 'g', name: 'Global', tier: 1, modes: [{ modeId: 'm', name: 'Mode 1' }], defaultModeId: 'm' },
    { id: 's', name: 'Semantic', tier: 2, modes: [{ modeId: 'l', name: 'Light' }, { modeId: 'd', name: 'Dark' }], defaultModeId: 'l' },
  ];
  const num = (id, name, n, scopes) => ({ id, name, collectionId: 'g', type: 'FLOAT', values: { m: { kind: 'number', text: String(n) } }, scopes, description: '' });
  const PVARS = [
    num('r4', 'radius/4', 4, ['CORNER_RADIUS']),
    num('r8', 'radius/8', 8, ['CORNER_RADIUS']),
    num('any', 'misc/any', 2, ['ALL_SCOPES']),
    num('f12', 'font-size/12', 12, ['FONT_SIZE']),
    num('f14', 'font-size/14', 14, ['FONT_SIZE']),
    num('hid', 'misc/hidden', 1, []),
    { id: 'rc', name: 'radius/card', collectionId: 's', type: 'FLOAT', values: { l: { kind: 'alias', aliasId: 'r8', aliasName: 'radius/8' }, d: { kind: 'alias', aliasId: 'f14', aliasName: 'font-size/14' } }, scopes: ['CORNER_RADIUS'], description: '' },
  ];
  const p = await open(560, 'variables');
  await recv(p, PREREQ);
  await recv(p, { type: 'VAR_TABLE', collections: PCOLS, vars: PVARS });
  await p.focus('#varTree [data-id="rc"]');
  await p.keyboard.press('Enter');
  await p.click('.modal button[aria-label="Light 별칭 고르기"]');
  const names = async () => p.$$eval('.ed-picker [role="option"]', (e) => e.map((x) => x.textContent.replace(/\s+/g, ' ').trim()));
  const o1 = await names();
  check('12b 용도로 거르기 — 반경 · ALL_SCOPES만(글자 크기 · 빈 용도 숨김)', JSON.stringify(o1) === JSON.stringify(['값으로 적기 8', '44', '88✓', '2any']), JSON.stringify(o1));
  check('12b 링크 "용도가 다른 변수도 보기 (3개)"', (await p.textContent('.ed-plink')) === '용도가 다른 변수도 보기 (3개)');
  const before = await p.$eval('.modal dt:nth-of-type(4)', (e) => Math.round(e.getBoundingClientRect().top));
  check('12b 덮어 열기 — 아래 줄 자리 그대로', before > 0);
  await p.click('.ed-plink');
  const o2 = await names();
  check('12b 링크를 누르면 숨긴 후보가 "용도 다름"과 함께 · 링크 글 바뀜 · 포커스는 링크', o2.some((x) => x.includes('12') && x.includes('용도 다름')) && o2.some((x) => x.includes('hidden') && x.includes('용도 다름')) && (await p.textContent('.ed-plink')) === '용도가 맞는 변수만 보기' && (await p.evaluate(() => document.activeElement?.classList.contains('ed-plink'))), JSON.stringify(o2));
  // [▾]에서 Esc → 고르개만 닫음(팝업은 그대로)
  await p.focus('.modal button[aria-label="Light 별칭 고르기"]');
  check('12b [▾]에 포커스(층 안이라 열린 채)', (await p.$$('.ed-picker')).length === 1);
  await p.keyboard.press('Escape');
  check('12b [▾]의 Esc → 고르개만 닫힘 · 팝업 그대로', (await p.$$('.ed-picker')).length === 0 && (await p.$('.modal')) !== null);
  // 지금 대상이 용도 밖(Dark = font-size/14) → 토글 켠 채 열림 · 제자리 ✓
  await p.click('.modal button[aria-label="Dark 별칭 고르기"]');
  const o3 = await names();
  check('12b 지금 대상이 용도 밖 → 처음부터 다른 용도도 보임 · 제자리에 ✓ + "용도 다름"(맨 위 ✓ 줄 없음)', (await p.textContent('.ed-plink')) === '용도가 맞는 변수만 보기' && o3.filter((x) => x.includes('✓')).length === 1 && o3.some((x) => x.includes('14') && x.includes('용도 다름') && x.includes('✓')) && !(await p.textContent('.ed-picker')).includes('규칙 밖'), JSON.stringify(o3));
  const badPicker = await nestedCards(p);
  check('B.12 카드 안 카드 0 — 상세 팝업(별칭 고르개 펼침 · 고르개 층은 뺌)', badPicker.length === 0, badPicker.join(' · '));
  // 배경 누름 → 고르개만 닫고 팝업은 그대로
  await p.mouse.click(5, 5);
  check('12b 배경 누름 → 고르개만 닫힘 · 팝업 그대로', (await p.$$('.ed-picker')).length === 0 && (await p.$('.modal')) !== null);
  await p.screenshot({ path: process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/b3-picker.png` : '/dev/null' }).catch(() => {});
  await p.close();
}

/* ---------- 13 컴포넌트 결과 줄 꼬리 (§4.7 "인스턴스 자리" 5·6번, QA #3 검토 2회차) ---------- */
{
  const p = await open(560, 'layer');
  await goSub(p, 'structure');
  const st = () => p.$eval('#structureStatus', (e) => ({ text: e.textContent, cls: e.className }));
  await recv(p, {
    type: 'COMPONENTS_RESULT', registered: 3, skipped: 1, sets: 0, singles: ['Card'], missing: [], failures: ['x'],
    propFailed: ['Card A', 'Card B'], placeCloned: ['Vector'], placeFailed: ['Gone'],
  });
  let s1 = await st();
  check('13 [등록] 꼬리 순서: 건너뜀 → 속성 값 → 복사본 → 빈 자리, 경고',
    s1.text.includes(' · 건너뜀 1') && !s1.text.includes('스킵')
      && s1.text.indexOf('속성 값을 못 넣은 2개: Card A, Card B') > 0
      && s1.text.indexOf('속성 값을 못 넣은') < s1.text.indexOf('복사본을 둔 1개: Vector')
      && s1.text.indexOf('복사본을 둔') < s1.text.indexOf('제자리에 못 둔 1개: Gone')
      && s1.cls.includes('warn'), JSON.stringify(s1));
  await recv(p, { type: 'COMPONENTS_RESULT', registered: 2, skipped: 0, sets: 0, singles: [], missing: [], failures: [], propFailed: ['M'] });
  s1 = await st();
  await recv(p, { type: 'COMPONENTS_RESULT', registered: 1, skipped: 0, sets: 0, singles: ['WebsiteImage'], missing: [], failures: ['x'], propFailed: ['P'], fillKept: ['flight'], placeCloned: ['C'] });
  const s2 = await st();
  check('13 채움·크기는 상태 줄에 없음(처리 중 문제에만 — 2026-11-19 사용자 결정) · 경고',
    !s2.text.includes('채움·크기가 달라')
      && s2.text.indexOf('속성 값을 못 넣은') < s2.text.indexOf('복사본을 둔')
      && s2.cls.includes('warn'), JSON.stringify(s2));
  check('13 속성 값만 못 넣어도 경고', s1.text.includes('속성 값을 못 넣은 1개: M') && s1.cls.includes('warn'), JSON.stringify(s1));
  // [등록] 결과 줄(§4.7 6번 "세는 단위") — "컴포넌트 {total} (변형 세트 · 컴포넌트)", 단일 꼬리 없음.
  // 재사용(§4.7 "재사용" 6·8번) — 재사용만 있어도 성공, 꼬리는 건너뜀 뒤 · 속성 앞, 이름 3개 + " 외"
  await recv(p, { type: 'COMPONENTS_RESULT', registered: 1, skipped: 0, sets: 0, singles: ['Solo'], exposed: 2, missing: [], failures: [], reused: ['Card', 'Badge', 'Chip', 'Pill'] });
  s1 = await st();
  check('13 결과 줄 — 컴포넌트 1 (변형 세트 0 · 컴포넌트 1), 단일 꼬리 없음',
    s1.text.startsWith('컴포넌트 1 (변형 세트 0 · 컴포넌트 1) · ') && !s1.text.includes(') · 컴포넌트 '), JSON.stringify(s1));
  const rv = await p.$$eval('#variantReport > *', (els) => els.map((e) => e.textContent));
  check('13 재사용은 상태 줄이 아니라 결과 목록 "기존 컴포넌트 재사용" 구획에(이름 모두)',
    !s1.text.includes('기존 컴포넌트 재사용') && s1.text.includes(' · 속성 2')
      && rv[0]?.startsWith('기존 컴포넌트 재사용') && rv[0]?.includes('4')
      && ['Card', 'Badge', 'Chip', 'Pill'].every((n, i) => rv[i + 1] === n), JSON.stringify({ s1, rv }));
  await recv(p, { type: 'COMPONENTS_RESULT', registered: 39, skipped: 0, sets: 7, singles: ['A', 'B', 'C', 'D'], exposed: 3, missing: [], failures: [] });
  s1 = await st();
  check('13 결과 줄 — 변형 수 대신 맨 위 단위', s1.text === '컴포넌트 11 (변형 세트 7 · 컴포넌트 4) · 속성 3', JSON.stringify(s1));
  await recv(p, { type: 'COMPONENTS_RESULT', registered: 0, skipped: 0, sets: 0, singles: [], missing: [], failures: [], reused: ['ItemButton'] });
  s1 = await st();
  check('13 재사용만 있어도 성공 상태', s1.text === '컴포넌트 0 (변형 세트 0 · 컴포넌트 0)' && s1.cls.includes('ok') && !s1.cls.includes('warn'), JSON.stringify(s1));
  await recv(p, { type: 'COMPONENTS_RESULT', registered: 0, skipped: 0, sets: 0, singles: [], missing: [], failures: ['x'], reused: ['Card'], fillKept: ['flight'], reuseKept: ['Row A', 'Row B'], placeCloned: ['C'] });
  s1 = await st();
  const rv2 = await p.$$eval('#variantReport > *', (els) => els.map((e) => e.textContent));
  check('13 처리 중 문제 → 재사용 구획 순서(재사용 구획은 맨 아래)', rv2[0]?.startsWith('처리 중 문제') && rv2[2]?.startsWith('기존 컴포넌트 재사용') && rv2[3] === 'Card', JSON.stringify(rv2));
  check('13 구조가 달라 원본을 둔 꼬리 — 복사본 앞, 경고',
    s1.text.includes(' · 구조가 달라 원본을 둔 2개: Row A, Row B')
      && !s1.text.includes('채움·크기가 달라')
      && s1.text.indexOf('구조가 달라 원본을 둔') < s1.text.indexOf('복사본을 둔')
      && s1.cls.includes('warn'), JSON.stringify(s1));
  // 후보 트리 — 재사용할 줄은 종류 배지 대신 [재사용] + 기존 컴포넌트 이름(세트면 "{세트} · {변형}")
  await compFound(p, [
    { id: 'r', name: 'Frame', type: 'FRAME', depth: 0, parentId: null, eligible: false },
    { id: 'a', name: 'Item Button', type: 'FRAME', depth: 1, parentId: 'r', eligible: true, group: 'ItemButton2', variant: 'Variant=1', reuse: { name: 'ItemButton · Variant=1' }, defaultOn: true },
    { id: 'b', name: 'Like', type: 'FRAME', depth: 1, parentId: 'r', eligible: true, single: 'Like' },
    { id: 'c', name: 'hero-button', type: 'FRAME', depth: 1, parentId: 'r', eligible: true, single: 'Button', defaultOn: true },
  ]);
  const rows = await p.$$eval('#compTree .tag', (els) => els.map((e) => ({ text: e.textContent, cls: e.className, row: e.closest('.r-card')?.textContent ?? '' })));
  const reuseRow = rows.find((r) => r.text === '재사용');
  check('13 후보 트리 배지 [재사용] + 기존 이름(접미사 이름 안 보임)',
    !!reuseRow && reuseRow.cls.includes('tag-reuse') && reuseRow.row.includes('ItemButton · Variant=1') && !reuseRow.row.includes('ItemButton2')
      && rows.some((r) => r.text === '컴포넌트'), JSON.stringify(rows));
  await recv(p, { type: 'LICENSE_STATUS', tier: 'paid', unlimited: true, source: 'dev' }); // [등록]은 유료 — 잠금을 푼다
  await p.click('#btnRegisterComp');
  const reg = (await sent(p, 'REGISTER_COMPONENTS')).pop();
  check('13 [등록] — 재사용 줄의 이름은 보내지 않는다(판정이 바뀌면 접미사 규칙)', !!reg && reg.nodeIds.includes('a') && !(reg.names && 'a' in reg.names), JSON.stringify(reg));
  // 기본 체크는 code.ts의 `defaultOn`만 본다(§4.7 "묶기" 6번) — 단독 버튼(c)은 켬, 단독 카드(b)는 끔.
  check('13 기본 체크 — defaultOn만(단독 버튼 켬 · 단독 끔)', !!reg && reg.nodeIds.includes('c') && !reg.nodeIds.includes('b'), JSON.stringify(reg));
  // UX 검수 C "같이 맞춤"(B.14) — 결과 줄 문구
  await recv(p, { type: 'VARIANTS_RESULT', sets: 1, missing: [], singles: ['Solo'], failures: [] });
  s1 = await st();
  check('13 VARIANTS_RESULT(단일 1) 상태 줄 꼬리 " · 컴포넌트 1"', s1.text === '변형 세트 1개를 만들었어요 · 컴포넌트 1', JSON.stringify(s1));
  // 닮은 프레임 찾기 · 하나로 합치기 제거(2026-11-19 — ia-v4 B.27): 버튼 · 메시지가 없다
  check('13 [닮은 프레임 찾기] · [하나로 합치기] 없음', !(await p.$('#btnScanSimilar')) && !(await p.$('#btnComponentize')) && !(await p.$('#similarList')));
  await p.close();
}

/* ---------- 16 새 역할 표시 — "N" 배지 · 이미 붙은 연결은 그대로(§4.6 · §2.12, 2026-11-06 결정 B · IA v4 §4.2) ---------- */
{
  const p = await open(560, 'select');
  await openSel(p);
  const nr = { name: 'color/text/inverse', globalId: 'g0', scopes: ['TEXT_FILL'] };
  const newCand = (id) => ({ nodeId: id, field: 'fills', index: 0, currentValue: '#ffffff', variableId: 'new:color/text/inverse', variableName: 'color/text/inverse', tier: 2, variableValue: '#ffffff', newRole: nr, newRoleGlobalName: 'color/gray/0' });
  const keep = { nodeId: 'n1', field: 'paddingLeft', currentValue: '8', variableId: 'vA', variableName: 'spacing/8', tier: 2 };
  await found(p, { candidates: [newCand('n1'), newCand('n2'), keep], bound: 3 });
  await p.click('[data-k="link"]');
  const chips = await p.$$eval('#bindTree .tr-row', (cards) => cards.map((c) => {
    const b = c.querySelector('.bv-new');
    const ch = c.querySelector('.vchip');
    return { name: c.querySelector('.vchip .al')?.lastChild?.textContent, badge: b?.textContent, role: b?.getAttribute('role'), aria: b?.getAttribute('aria-label'), tip: b?.getAttribute('title'), chipTip: ch?.getAttribute('title') ?? null, after: !!b && ch.compareDocumentPosition(b) === Node.DOCUMENT_POSITION_FOLLOWING && b.previousElementSibling === ch };
  }));
  const inv = chips.find((x) => x.name === 'color/text/inverse');
  check('16 새 Semantic 줄 — "N" 배지 · role=img · 읽기 이름 "새 Semantic"', !!inv && inv.badge === 'N' && inv.role === 'img' && inv.aria === '새 Semantic', JSON.stringify(inv));
  check('16 N 배지 툴팁 "color/gray/0을 가리켜요"(TR-P12 — 칩에는 없음) · 배지는 칩 바로 뒤(TR-D9)', inv?.tip === 'color/gray/0을 가리켜요' && inv.chipTip === null && inv.after, JSON.stringify(inv));
  check('16 이미 있는 역할 줄은 "N" 없음', chips.find((x) => x.name === 'spacing/8')?.badge === undefined);
  const badgeStyle = await p.$eval('#bindTree .bv-new', (e) => { const cs = getComputedStyle(e); return [cs.backgroundColor, cs.color, cs.borderTopWidth, cs.fontWeight]; });
  check('16 "N" 배지 — 채운 바탕(#0a6dbf) · 흰 글자 · 테두리 없음 · 600', JSON.stringify(badgeStyle) === JSON.stringify(['rgb(10, 109, 191)', 'rgb(255, 255, 255)', '0px', '600']), JSON.stringify(badgeStyle));
  await p.click('#btnApplyConfirm');
  const items = (await sent(p, 'APPLY_SELECTED')).at(-1).items;
  check('16 연결 요청 — 새 역할 정보만(바꾸기 · 풀기 없음)', items.some((i) => i.newRole?.name === 'color/text/inverse') && items.every((i) => !('fromVariableId' in i) && !('unbind' in i)), JSON.stringify(items));
  await p.close();
}

/* ---------- 14 컴포넌트(베타) — 언제나 보임 · [베타] 배지 · 각주 없음 (§4.7 "베타", QA #3 불합격 4, 2026-11-05 결정) ---------- */
{
  // v4 §4.1 할 일 — [변수 만들기] · [이름 정리] · [컴포넌트 베타](언제나 보임, 선택이 없으면 잠금)
  const p = await open(560, 'select');
  check('14 할 일 버튼 셋 — [변수 만들기] · [이름 정리] · [컴포넌트 베타]', (await visible(p, '#btnGoMake')) && (await visible(p, '#btnGoRename')) && (await visible(p, '#btnGoComponents')) && (await p.textContent('#selTools')).trim().startsWith('할 일'));
  check('14 배지 — 할 일 버튼 · 카드 제목, aria-hidden', (await p.$$eval('#btnGoComponents .beta-badge[aria-hidden="true"], #structureCard h2 .beta-badge[aria-hidden="true"]', (e) => e.length)) === 2);
  check('14 배지 주황(#C2410C 글자 · #FFF1E6 바탕)', JSON.stringify(await p.$eval('#btnGoComponents .beta-badge', (e) => [getComputedStyle(e).color, getComputedStyle(e).backgroundColor])) === JSON.stringify(['rgb(194, 65, 12)', 'rgb(255, 241, 230)']));
  check('14 접근성 이름 "컴포넌트 (베타)"', (await p.$eval('#btnGoComponents', (e) => e.getAttribute('aria-label'))) === '컴포넌트 (베타)');
  check('14 준비 현황 각주 없음', (await p.$('#readinessPop .pop-note')) === null);
  check('14 설정에 켜기 체크박스 없음', (await p.$('#componentsBeta')) === null);
  await recv(p, PREREQ);
  await recv(p, sel(1, 0));
  await p.click('#btnGoComponents');
  check('14 [컴포넌트 베타] → 컴포넌트 하위 화면(머리 "컴포넌트 베타")', (await visible(p, '#structureCard')) && (await p.textContent('#subTitle')) === '컴포넌트 베타');
  await p.click('#btnSubBack');
  check('14 ← → 첫 화면 · 포커스는 [컴포넌트 베타]', (await visible(p, '#selHome')) && (await p.evaluate(() => document.activeElement?.id)) === 'btnGoComponents');
  await p.click('#btnGoMake');
  await p.waitForTimeout(30);
  check('14 [변수 만들기] → 만들기 화면', (await visible(p, '#makeScreen')) && (await p.textContent('#subTitle')) === '변수 만들기');
  await p.click('#btnSubBack');
  check('14 ← → 첫 화면 · 포커스는 [변수 만들기]', (await visible(p, '#selHome')) && (await p.evaluate(() => document.activeElement?.id)) === 'btnGoMake');
  await p.close();
}

/* ---------- 17 변수 만들기 화면(IA v4 §4.3 · B.4) — Global · Semantic · 텍스트 스타일 트리 · 실행 순서 ---------- */
{
  const p = await open(560, 'select');
  await recv(p, { type: 'LICENSE_STATUS', tier: 'paid', unlimited: true, source: 'dev' });
  await recv(p, { ...PREREQ, hasBindable: true, tierVars: 3, otherVars: 0 });
  await recv(p, { type: 'VAR_TABLE', collections: COLS, vars: VARS });
  await recv(p, { ...sel(1, 0), ids: ['w1'], firstName: 'Card' });
  await goSub(p, 'make');
  await p.waitForTimeout(50);
  const ex = (await sent(p, 'EXTRACT')).at(-1);
  const sc = (await sent(p, 'SCAN_TEXT_STYLES')).at(-1);
  check('17 들어오면 추출 + 텍스트 스타일 후보(조용한 읽기 · 기준 nodeIds · reqId)', ex?.nodeIds?.[0] === 'w1' && typeof ex?.reqId === 'number' && sc?.nodeIds?.[0] === 'w1' && typeof sc?.reqId === 'number' && !(await visible(p, '#applyProgress')));
  check('17 읽는 중 — 위 줄 "선택을 읽는 중…" · 버튼 잠금', (await p.textContent('#makeTopText')) === '선택을 읽는 중…' && (await locked(p, '#btnMakeRun')));
  check('B.12 읽는 중 자리 줄은 머리 띠 없음(배경 투명)', await p.$$eval('#makeTree .tr.tr-head', (e) => e.length > 0 && e.every((r) => !r.classList.contains('tr-group') && getComputedStyle(r).backgroundColor === 'rgba(0, 0, 0, 0)')));
  check('17 머리 "← 변수 만들기" · 오른쪽 "Card에서 찾은 값"', (await p.textContent('#subTitle')) === '변수 만들기' && (await p.textContent('#subRight')) === 'Card에서 찾은 값');
  await recv(p, { type: 'EXTRACT_RESULT', reqId: ex.reqId, warnings: [], selection: 1, tokens: [
    { name: 'spacing/16', category: 'gap', value: 16, sources: ['itemSpacing'], count: 4 },
    { name: 'spacing/8', category: 'gap', value: 8, sources: ['itemSpacing'], count: 2 },
    { name: 'font-size/14', category: 'fontSize', value: 14, sources: ['fontSize'], count: 3 },
  ] });
  await p.waitForTimeout(50);
  const pv = (await sent(p, 'CREATE_TOKENS')).at(-1);
  check('TR-D1 만들기 트리 머리 줄 — 띠 없음 · 위 선(첫 머리 0)', await p.$$eval('#makeTree .tr-head', (e) => e.length > 0 && e.every((h, i) => !h.classList.contains('tr-group') && getComputedStyle(h).backgroundColor === 'rgba(0, 0, 0, 0)' && getComputedStyle(h).borderTopWidth === (i === 0 ? '0px' : '1px'))));
  check('17 만들 수 미리보기 — preview · reqId · 켠 줄만(글자 종류는 기본 끔)', pv?.preview === true && typeof pv.reqId === 'number' && JSON.stringify(pv.tokens.map((x) => x.name)) === JSON.stringify(['spacing/16', 'spacing/8']), JSON.stringify(pv?.tokens?.map((x) => x.name)));
  await recv(p, { type: 'CREATE_RESULT', reqId: pv.reqId, preview: true, created: 1, updated: 0, summary: '', roles: 1, skippedManual: 0,
    tokenStates: { 'spacing/16': { state: 'new' }, 'spacing/8': { state: 'update' } }, roleRows: [{ name: 'spacing/card/gap', global: 'spacing/16', token: 'spacing/16' }] });
  await recv(p, { type: 'TEXT_STYLE_CANDIDATES', reqId: sc.reqId, warnings: [], existing: [{ name: 'body/medium', sig: '99|0|0|Inter|Regular' }],
    styles: [{ name: 'body/medium', fontSize: 14, lineHeight: 20, letterSpacing: 0, family: 'Inter', style: 'Regular', count: 3, nodeIds: ['t1'] }] });
  await p.waitForTimeout(50);
  check('17 Text Style 탭 줄에 .ts-off 없음 · 요약은 tsSummary 글 그대로(KRDS 크기 표시 없음 — text-style-krds §4)', await p.evaluate(() => { const m = [...document.querySelectorAll('#makeTabs [role="tab"]')].find((x) => x.textContent.startsWith('Text Style')); m?.click(); const sub = document.querySelector('#makeTree .vchip .vl'); const ok = !!sub && document.querySelectorAll('#makeTree .ts-off').length === 0 && sub.children.length === 0 && sub.textContent.startsWith('Inter') && !/[○⚠]/.test(sub.textContent); document.getElementById('makeTab-global')?.click(); return ok; }));
  check('17 탭 — Global*(고름) · Semantic · 텍스트 스타일, 개수 = 총 줄 수', JSON.stringify(await tabsOf(p)) === JSON.stringify(['Global3*', 'Semantic1', 'Text Style1']), JSON.stringify(await tabsOf(p)));
  const heads = await p.$$eval('#makeTree .tr-head', (e) => e.map((x) => `${x.querySelector('.tr-name').textContent} ${x.querySelector('.tr-cnt').textContent}`));
  check('17 Global 탭 — 종류 머리만(묶음 머리 없음) · 글자(꺼져 접힘)', JSON.stringify(heads) === JSON.stringify(['Spacing 2개', 'Typography 1개']) && (await p.getAttribute('#makeTree [data-tkey="gk:text"]', 'aria-expanded')) === 'false', JSON.stringify(heads));
  check('17 Global 탭 도구 줄 — "켠 값만 변수로 만들어요" · ⓘ 없음 · 모두 켜기 · 끄기', (await p.textContent('#makeTopText')) === '켠 값만 변수로 만들어요' && !(await visible(p, '#makeInfo')) && (await visible(p, '#makeAllOn')));
  check('17 상태 태그 "있음"(update — 칩 뒤, TR-D9) · "Layer 2" · 옅은 칸에 종류 표시 없음', (await p.textContent('#makeTree [data-tkey="g:spacing/8"]')).includes('있음') && (await p.$eval('#makeTree [data-tkey="g:spacing/8"] .tr-tag', (e) => e.previousElementSibling?.classList.contains('vchip'))) && (await p.textContent('#makeTree [data-tkey="g:spacing/8"] .tr-lt')) === 'Layer 2' && (await p.$$eval('#makeTree [data-tkey^="g:"] .vchip .bv-mark', (e) => e.length)) === 0 && (await p.textContent('#makeTree [data-tkey="g:spacing/8"] .vchip .al')) === '→ spacing/8');
  // 탭 키보드 — → 로 Semantic(바로 고름)
  await p.focus('#makeTab-global');
  await p.keyboard.press('ArrowRight');
  await p.waitForTimeout(20);
  check('17 → 키로 Semantic 탭 — 포커스 · 고름 · 도구 줄 ⓘ · 링크 없음', (await p.evaluate(() => document.activeElement?.id)) === 'makeTab-semantic' && (await p.getAttribute('#makeTab-semantic', 'aria-selected')) === 'true' && (await p.textContent('#makeTopText')) === '켠 Global을 따라 함께 만들어요' && (await visible(p, '#makeInfo')) && !(await visible(p, '#makeAllOn')) && (await p.getAttribute('#makePanel', 'aria-labelledby')) === 'makeTab-semantic');
  check('17 Semantic 탭 — 종류 머리 › Semantic 줄(왼쪽 종류 표시 # · 옅은 칸 "→ spacing/16" · "= …" 글 · .bv-mark 없음 — TR-D10)', (await p.textContent('#makeTree .tr-row .tr-lt')) === 'spacing/card/gap' && (await p.textContent('#makeTree .tr-row .vchip .al')) === '→ spacing/16' && (await p.textContent('#makeTree .tr-row .tr-lead')) === '#' && !(await p.textContent('#makeTree')).includes('= spacing/16') && (await p.$$eval('#makeTree .bv-mark', (e) => e.length)) === 0);
  await p.focus('#makeInfo');
  await p.waitForTimeout(20);
  const tipUp = () => p.$eval('#uiTip', (e) => !e.hidden && e.classList.contains('show'));
  const tipShown = await tipUp();
  await p.keyboard.press('Escape');
  await p.waitForTimeout(20);
  check('17 ⓘ 포커스 = 툴팁 · Esc는 툴팁만 닫음(화면에 남음)', tipShown && !(await tipUp()) && (await visible(p, '#makeScreen')), JSON.stringify([tipShown, await tipUp(), await visible(p, '#makeScreen')]));
  await p.click('#makeTab-ts');
  await p.waitForTimeout(20);
  check('17 텍스트 스타일 탭 — 머리 없이 줄 · "켠 스타일만 등록해요" · 모두 켜기 · 끄기', (await p.$$eval('#makeTree .tr-head', (e) => e.length)) === 0 && (await p.$$eval('#makeTree [data-tkey^="t:"]', (e) => e.length)) === 1 && (await p.textContent('#makeTopText')) === '켠 스타일만 등록해요' && (await visible(p, '#makeAllOff')));
  await p.click('#makeTab-global');
  await p.waitForTimeout(20);
  check('17 겹침 잠금 중 다른 탭이면 텍스트 스타일 탭에 주황 점(aria-label = 사유)', (await visible(p, '#makeTab-ts .mk-dot')) && (await p.getAttribute('#makeTab-ts .mk-dot', 'aria-label')) === '이미 있는 스타일 이름이에요');
  check('17 만들 수 잘림 없음 · 두 줄 이하', await p.$eval('#makeCount', (e) => e.scrollWidth <= e.clientWidth && e.getBoundingClientRect().height <= 32));
  check('17 만들 수 "Global 1개 · Semantic 1개 · 스타일 1개" · [변수 1개 만들기]', (await p.textContent('#makeCount')) === 'Global 1개 · Semantic 1개 · 스타일 1개' && (await p.textContent('#btnMakeRun')) === '변수 1개 만들기', await p.textContent('#makeCount'));
  check('17 기존 스타일과 이름이 같고 값이 다름 → 실행 잠금 "이미 있는 스타일 이름이에요"', (await locked(p, '#btnMakeRun')) && (await lockMsg(p, '#btnMakeRun')) === '이미 있는 스타일 이름이에요');
  // 이름 고치기 — 더블클릭 → 칸 → Enter 저장
  await p.click('#makeTab-ts');
  await p.waitForTimeout(20);
  await p.dblclick('#makeTree [data-tkey^="t:"] .vchip .al');
  await p.waitForTimeout(30);
  await p.fill('#makeTree input.tr-edit', 'body/base');
  await p.keyboard.press('Enter');
  check('17 이름 고치기 → 잠금 풀림', !(await locked(p, '#btnMakeRun')) && (await p.textContent('#makeTree [data-tkey^="t:"]')).includes('body/base'));
  // 모두 끄기는 고른 탭(텍스트 스타일)의 줄만
  await p.click('#makeAllOff');
  await p.waitForTimeout(20);
  check('17 텍스트 스타일 탭 모두 끄기 — 스타일만 끔(Global 줄 그대로)', (await p.getAttribute('#makeTree [data-tkey^="t:"] .bv-switch', 'aria-checked')) === 'false' && (await p.textContent('#makeCount')) === 'Global 1개 · Semantic 1개');
  await p.click('#makeAllOn');
  await p.click('#makeTab-global');
  await p.waitForTimeout(20);
  check('17 만든 뒤 체크 3개(바로 연결 켬)', (await p.$$eval('#makeOpts input[type="checkbox"]', (e) => e.length)) === 3 && (await p.$eval('#makeOptLink', (e) => e.checked)));
  // 실행: 만들기 → 텍스트 스타일 → 연결
  const exBefore = (await sent(p, 'EXTRACT')).length;
  const scBefore = (await sent(p, 'SCAN_TEXT_STYLES')).length;
  await p.click('#btnMakeRun');
  await p.waitForTimeout(50);
  const cr = (await sent(p, 'CREATE_TOKENS')).filter((m) => !m.preview).at(-1);
  check('17 실행 만들기 — 켠 줄 토큰 · reqId · 다시 추출하지 않음', !!cr && cr.tokens.length === 2 && typeof cr.reqId === 'number' && (await sent(p, 'EXTRACT')).length === exBefore, JSON.stringify({ n: cr?.tokens?.length, r: cr?.reqId, ex: (await sent(p, 'EXTRACT')).length }));
  check('17 실행 중 — 트리 잠금 · 진행 "1/3단계" · [취소]', (await visible(p, '#btnMakeCancel')) && (await p.textContent('#makeProgText')).includes('1/3단계'), await p.textContent('#makeProgText'));
  await recv(p, { ...sel(1, 0), ids: ['other'] }); // 실행 중 선택이 바뀌어도 기준은 그대로
  await recv(p, { type: 'CREATE_RESULT', reqId: cr.reqId, created: 1, updated: 1, summary: '', roles: 1, skippedManual: 0 });
  await p.waitForTimeout(80);
  const ts = (await sent(p, 'CREATE_TEXT_STYLES')).at(-1);
  check('17 텍스트 스타일 — 다시 스캔 없이 켠 줄(고친 이름) · applyTo = 시작 때 기준', ts?.styles?.[0]?.name === 'body/base' && ts.applyTo?.[0] === 'w1' && (await sent(p, 'SCAN_TEXT_STYLES')).length === scBefore, String((await sent(p, 'SCAN_TEXT_STYLES')).length));
  await recv(p, { type: 'TEXT_STYLES_RESULT', reqId: ts.reqId, created: 1, updated: 0, bound: 1, missing: ["title: 글꼴 'Gone Bold'을 불러오지 못해 값 · 변수 연결을 건너뛰었어요"], notes: [], applied: 3, applySkipped: 0 });
  await p.waitForTimeout(80);
  const ap = (await sent(p, 'APPLY')).filter((m) => m.preview === false).at(-1);
  check('17 연결 — APPLY(preview 아님) · skipTextStyleNodes · 시작 때 기준 · reqId', !!ap && ap.skipTextStyleNodes === true && ap.nodeIds?.[0] === 'w1' && typeof ap.reqId === 'number', JSON.stringify(ap));
  check('17 실행 중 [연결] 잠금', await locked(p, '#btnApplyConfirm'));
  await recv(p, { type: 'APPLY_RESULT', bound: 5, skipped: 0, reasons: {}, preview: false, newRoles: 0, reqId: ap.reqId });
  await p.waitForTimeout(120);
  await p.screenshot({ path: process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/b7-make-done-missing.png` : '/dev/null' }).catch(() => {});
  check('17 다 됨 → 첫 화면 · 상태 줄 "… 텍스트 스타일 1개(글자 3개) · 알림 1개 · 5곳 연결"(글꼴 알림이 있어도 연결까지 돈다) · 툴팁에 알림 글', (await visible(p, '#selHome')) && (await p.textContent('#statusText')) === 'Global 2개 · Semantic 1개 · 텍스트 스타일 1개(글자 3개) · 알림 1개 · 5곳 연결' && (await p.getAttribute('#statusText', 'title')).includes("title: 글꼴 'Gone Bold'"), await p.textContent('#statusText'));
  check('17 실행 결과로 연결 화면 상태 줄 "🔗 …곳 연결"을 쓰지 않음', !(await p.textContent('#statusText')).startsWith('🔗'));
  await p.close();
}
{
  // 일부 실패(연결 0곳) — 결과만 · [닫기] 하나 / 바로 연결 끔 → 상태 줄 [연결하기 →] / 무료
  const p = await open(560, 'select');
  await recv(p, { type: 'LICENSE_STATUS', tier: 'paid', unlimited: true, source: 'dev' });
  await recv(p, { ...PREREQ, hasBindable: true, tierVars: 3, otherVars: 0 });
  await recv(p, { ...sel(1, 0), ids: ['w2'] });
  await goSub(p, 'make');
  await p.waitForTimeout(30);
  const ex = (await sent(p, 'EXTRACT')).at(-1);
  await recv(p, { type: 'EXTRACT_RESULT', reqId: ex.reqId, warnings: [], selection: 1, tokens: [{ name: 'spacing/16', category: 'gap', value: 16, sources: ['itemSpacing'], count: 1 }] });
  await recv(p, { type: 'TEXT_STYLE_CANDIDATES', reqId: (await sent(p, 'SCAN_TEXT_STYLES')).at(-1).reqId, warnings: [], existing: [], styles: [] });
  await p.waitForTimeout(30);
  await recv(p, { type: 'CREATE_RESULT', reqId: (await sent(p, 'CREATE_TOKENS')).at(-1).reqId, preview: true, created: 1, updated: 0, summary: '', roles: 0, skippedManual: 0, tokenStates: { 'spacing/16': { state: 'new' } }, roleRows: [] });
  await p.waitForTimeout(30);
  check('17 스타일 후보 0 → 텍스트 스타일 탭 없음 · Semantic 탭은 남음(0)', JSON.stringify(await tabsOf(p)) === JSON.stringify(['Global1*', 'Semantic0']), JSON.stringify(await tabsOf(p)));
  await p.click('#makeTab-semantic');
  await p.waitForTimeout(20);
  check('17 Semantic r = 0 → 탭 안 "만들 Semantic이 없어요"(트리 없음)', (await visible(p, '#makeTabNote')) && (await p.textContent('#makeTabNote')) === '만들 Semantic이 없어요' && !(await visible(p, '#makeTree')));
  await p.click('#makeTab-global');
  await p.waitForTimeout(20);
  await p.click('#btnMakeRun');
  await p.waitForTimeout(30);
  await recv(p, { type: 'CREATE_RESULT', reqId: (await sent(p, 'CREATE_TOKENS')).filter((m) => !m.preview).at(-1).reqId, created: 1, updated: 0, summary: '', roles: 0, skippedManual: 0 });
  await p.waitForTimeout(60);
  const ap = (await sent(p, 'APPLY')).filter((m) => m.preview === false).at(-1);
  await recv(p, { type: 'APPLY_RESULT', bound: 0, skipped: 0, reasons: { 'no-match': 2 }, preview: false, reqId: ap.reqId });
  await p.waitForTimeout(80);
  const res = await p.$$eval('#makeResults .tr-head', (e) => e.map((x) => x.textContent));
  check('17 일부 실패 — 화면에 남고 단계별 결과 · 끈 단계는 "껐음" · [닫기] 하나', (await visible(p, '#makeResults')) && res.some((x) => x.includes('연결') && x.includes('같은 곳이 없어요')) && res.some((x) => x.includes('껐음')) && (await p.textContent('#btnMakeRun')) === '닫기' && !(await visible(p, '#makeOpts')), JSON.stringify(res));
  await p.click('#btnMakeRun');
  check('17 [닫기] → 첫 화면', await visible(p, '#selHome'));
  await p.close();
}
{
  // 연결 0곳이어도 이유가 '이미 모두 연결됨'뿐이면 ✓ · 다 됨(2026-11-19 사용자 결정 — ia-v4 §4.3 "연결 0곳 사유")
  const p = await open(560, 'select');
  await recv(p, { type: 'LICENSE_STATUS', tier: 'paid', unlimited: true, source: 'dev' });
  await recv(p, { ...PREREQ, hasBindable: true, tierVars: 3, otherVars: 0 });
  await recv(p, { ...sel(1, 0), ids: ['w2b'] });
  await goSub(p, 'make');
  await p.waitForTimeout(30);
  const ex = (await sent(p, 'EXTRACT')).at(-1);
  await recv(p, { type: 'EXTRACT_RESULT', reqId: ex.reqId, warnings: [], selection: 1, tokens: [{ name: 'spacing/16', category: 'gap', value: 16, sources: ['itemSpacing'], count: 1 }] });
  await recv(p, { type: 'TEXT_STYLE_CANDIDATES', reqId: (await sent(p, 'SCAN_TEXT_STYLES')).at(-1).reqId, warnings: [], existing: [], styles: [] });
  await p.waitForTimeout(30);
  await recv(p, { type: 'CREATE_RESULT', reqId: (await sent(p, 'CREATE_TOKENS')).at(-1).reqId, preview: true, created: 1, updated: 0, summary: '', roles: 0, skippedManual: 0, tokenStates: { 'spacing/16': { state: 'new' } }, roleRows: [] });
  await p.waitForTimeout(30);
  check('17b 스타일 후보 0 → 텍스트 스타일 탭 없음 · Semantic 탭은 남음(0)', JSON.stringify(await tabsOf(p)) === JSON.stringify(['Global1*', 'Semantic0']), JSON.stringify(await tabsOf(p)));
  await p.click('#makeTab-semantic');
  await p.waitForTimeout(20);
  check('17b Semantic r = 0 → 탭 안 "만들 Semantic이 없어요"(트리 없음)', (await visible(p, '#makeTabNote')) && (await p.textContent('#makeTabNote')) === '만들 Semantic이 없어요' && !(await visible(p, '#makeTree')));
  await p.click('#makeTab-global');
  await p.waitForTimeout(20);
  await p.click('#btnMakeRun');
  await p.waitForTimeout(30);
  await recv(p, { type: 'CREATE_RESULT', reqId: (await sent(p, 'CREATE_TOKENS')).filter((m) => !m.preview).at(-1).reqId, created: 1, updated: 0, summary: '', roles: 0, skippedManual: 0 });
  await p.waitForTimeout(60);
  const ap = (await sent(p, 'APPLY')).filter((m) => m.preview === false).at(-1);
  await recv(p, { type: 'APPLY_RESULT', bound: 0, skipped: 0, reasons: { 'already-bound': 3 }, preview: false, reqId: ap.reqId });
  await p.waitForTimeout(80);
  check('17 연결 0곳 · 이미 모두 연결됨 → 결과 화면에 머물지 않고 첫 화면(다 됨)', (await visible(p, '#selHome')) && !(await visible(p, '#makeResults')), await p.textContent('#statusText'));
  await p.close();
}
{
  const p = await open(560, 'select');
  await recv(p, { type: 'LICENSE_STATUS', tier: 'free', unlimited: false, source: 'dev' });
  await recv(p, { ...PREREQ, hasBindable: true, tierVars: 3, otherVars: 0 });
  await recv(p, { ...sel(1, 0), ids: ['w3'] });
  await goSub(p, 'make');
  await p.waitForTimeout(30);
  check('17 무료 — 텍스트 스타일 후보를 읽지 않음', (await sent(p, 'SCAN_TEXT_STYLES')).length === 0);
  const ex = (await sent(p, 'EXTRACT')).at(-1);
  await recv(p, { type: 'EXTRACT_RESULT', reqId: ex.reqId, warnings: [], selection: 1, tokens: [{ name: 'spacing/16', category: 'gap', value: 16, sources: ['itemSpacing'], count: 1 }, { name: 'radius/8', category: 'radius', value: 8, sources: ['topLeftRadius'], count: 1 }] });
  await p.waitForTimeout(30);
  // 무료 규칙(F4 — §4.3 "무료 — 무료 규칙 PR 뒤"): 미리보기는 globalOnly 없이(Semantic 탭 줄 · r을 받으려고)
  const pv = (await sent(p, 'CREATE_TOKENS')).filter((m) => m.preview).at(-1);
  check('17 무료 — 미리보기는 globalOnly 없이', !!pv && pv.globalOnly === undefined, JSON.stringify(pv));
  await recv(p, { type: 'CREATE_RESULT', reqId: pv.reqId, preview: true, created: 2, updated: 0, summary: '', roles: 1, skippedManual: 0, tokenStates: {}, roleRows: [{ name: 'spacing/card/gap', global: 'spacing/16', token: 'spacing/16' }] });
  await p.waitForTimeout(30);
  check('17 무료 — 두 줄 라벨 상자 "무료: Global 변수만" / "🔒 Semantic · 텍스트 스타일 · 다크 모드 · 라이선스 →"', (await visible(p, '#makeFree')) && (await p.$eval('#makeFree', (e) => e.innerText.replace(/\s+/g, ' ').trim())) === '무료: Global 변수만 🔒 Semantic · 텍스트 스타일 · 다크 모드 · 라이선스 →', await p.$eval('#makeFree', (e) => e.innerText));
  check('17 무료 — Global 탭 스위치 · 모두 켜기 · 끄기 · 도구 줄 "켠 값만 변수로 만들어요"', (await p.$$eval('#makeTree .bv-switch', (e) => e.length)) > 0 && (await visible(p, '#makeAllOn')) && (await p.textContent('#makeTopText')) === '켠 값만 변수로 만들어요');
  check('17 무료 — 만들 수 "Global 2개" · [변수 2개 만들기] · 다크 잠금', (await p.textContent('#makeCount')) === 'Global 2개' && (await p.textContent('#btnMakeRun')) === '변수 2개 만들기' && !(await locked(p, '#btnMakeRun')) && (await locked(p, '#makeOptDark')), await p.textContent('#makeCount'));
  await p.click('#makeTab-semantic');
  await p.waitForTimeout(20);
  check('17 무료 Semantic 탭 — 보기만(스위치 없음) · "🔒 Semantic은 유료예요 · 라이선스 →" · ⓘ 없음', (await p.$$eval('#makeTree .bv-switch', (e) => e.length)) === 0 && (await p.textContent('#makeTopText')) === '🔒 Semantic은 유료예요 · ' && (await visible(p, '#makeSemLic')) && !(await visible(p, '#makeInfo')) && !(await visible(p, '#makeAllOn')));
  await p.click('#makeTab-global');
  await p.click('#makeAllOff');
  await p.waitForTimeout(30);
  check('17 무료 — Global 모두 끄면 [변수 만들기] 잠금(사유 "만들 값을 켜 주세요")', (await lockMsg(p, '#btnMakeRun')) === '만들 값을 켜 주세요');
  await p.click('#makeAllOn');
  await p.waitForTimeout(300);
  const pv2 = (await sent(p, 'CREATE_TOKENS')).filter((m) => m.preview).at(-1);
  await recv(p, { type: 'CREATE_RESULT', reqId: pv2.reqId, preview: true, created: 2, updated: 0, summary: '', roles: 1, skippedManual: 0, tokenStates: {}, roleRows: [] });
  await p.waitForTimeout(30);
  await p.click('#makeOptLink'); // 바로 연결 끔
  await p.click('#makeOptRename'); // 이름 정리 켬
  await p.click('#btnMakeRun');
  await p.waitForTimeout(30);
  const cr = (await sent(p, 'CREATE_TOKENS')).filter((m) => !m.preview).at(-1);
  check('17 무료 실행 — 만들기(Global만 · globalOnly) 먼저', !!cr && cr.globalOnly === true && cr.tokens.length === 2 && typeof cr.reqId === 'number', JSON.stringify(cr));
  await recv(p, { type: 'CREATE_RESULT', reqId: cr.reqId, created: 2, updated: 0, summary: '', roles: 0, skippedManual: 0 });
  await p.waitForTimeout(60);
  const rn = (await sent(p, 'RENAME')).at(-1);
  check('17 무료 실행 — 이어 이름 정리(기준 nodeIds · reqId) · 다크 없음', rn?.apply === true && rn.nodeIds?.[0] === 'w3' && typeof rn.reqId === 'number' && (await sent(p, 'GENERATE_DARK_MODE')).length === 0);
  await recv(p, { type: 'RENAME_RESULT', reqId: rn.reqId, changes: [{ id: 'a', before: 'Frame', after: 'card' }], nodes: [], applied: true });
  await p.waitForTimeout(100);
  check('17 무료 다 됨 — "Global 2개 · 이름 1개 정리 · 연결은 아직 안 했어요" + [연결하기 →](무료 꼬리 없음)', (await p.textContent('#statusText')) === 'Global 2개 · 이름 1개 정리 · 연결은 아직 안 했어요' && (await p.textContent('#statusAction')) === '연결하기 →', await p.textContent('#statusText'));
  await p.close();
}

/* ---------- 18 이름 정리 화면(IA v4 §4.4 · B.4) — 소속 트리 · 스위치 · [k개 이름 바꾸기] ---------- */
{
  const p = await open(560, 'select');
  await recv(p, PREREQ);
  await recv(p, { ...sel(1, 0), ids: ['r0'], firstName: 'Product card' });
  await p.click('#btnGoRename');
  await p.waitForTimeout(30);
  const rq = (await sent(p, 'RENAME')).at(-1);
  check('18 들어오면 미리보기(조용한 읽기 · 기준 nodeIds · reqId)', rq?.apply === false && rq.nodeIds?.[0] === 'r0' && typeof rq.reqId === 'number');
  await recv(p, { type: 'RENAME_RESULT', reqId: rq.reqId, applied: false, changes: [], nodes: [
    { id: 'r0', name: 'Product card', type: 'FRAME', depth: 0, parentId: null, keep: 'root' },
    { id: 'a', name: 'Frame 12', type: 'FRAME', depth: 1, parentId: 'r0', after: 'card-header', role: 'card-header' },
    { id: 'a1', name: 'Ellipse 2', type: 'ELLIPSE', depth: 2, parentId: 'a', after: 'avatar' },
    { id: 'k', name: 'Title', type: 'TEXT', depth: 1, parentId: 'r0', keep: 'text', role: 'title' },
  ] });
  await p.waitForTimeout(30);
  const rows = await p.$$eval('#renameTree .tr', (e) => e.map((x) => x.textContent.replace(/\s+/g, ' ').trim()));
  check('TR-D1 이름 정리 트리 머리 줄 — 띠 없음 · 이름 12px 600 --text-2(맥락 머리 따로 회색 없음 — .muted 없음)', await p.$$eval('#renameTree .tr-head', (e) => e.length > 0 && e.every((h) => !h.classList.contains('tr-group') && getComputedStyle(h).backgroundColor === 'rgba(0, 0, 0, 0)' && !h.querySelector('.tr-name.muted') && getComputedStyle(h.querySelector('.tr-name')).fontWeight === '600' && getComputedStyle(h.querySelector('.tr-name')).color === 'rgb(94, 99, 107)')));
  check('18 소속 트리 — 그대로 조상 머리 "Product card 2개" · 바꿀 줄 · 보존 줄 숨김', rows.length === 3 && rows[0].includes('Product card') && rows[0].includes('2개') && rows[1].includes('Frame 12') && rows[1].includes('card-header') && !rows.some((x) => x.includes('Title')), JSON.stringify(rows));
  check('18 머리 오른쪽 "Product card · 바꿀 이름 2개" · [2개 이름 바꾸기]', (await p.textContent('#subRight')) === 'Product card · 바꿀 이름 2개' && (await p.textContent('#btnRename')) === '2개 이름 바꾸기');
  await p.click('#renameTree [data-tkey="a1"] .bv-switch');
  check('18 하나 끔 → 머리 스위치 일부 · [1개 이름 바꾸기]', (await p.getAttribute('#renameTree [data-tkey="r0"] .bv-switch', 'aria-checked')) === 'mixed' && (await p.textContent('#btnRename')) === '1개 이름 바꾸기');
  await p.click('#btnRename');
  const ap = (await sent(p, 'RENAME_APPLY')).at(-1);
  check('18 바꾸기 — 켠 줄 + 이름 그대로인 노드의 역할만(roleOnly) · reqId', !!ap && typeof ap.reqId === 'number' && JSON.stringify(ap.items.map((i) => i.id)) === JSON.stringify(['a', 'k']) && ap.items[1].after === 'Title', JSON.stringify(ap?.items));
  await recv(p, { type: 'RENAME_RESULT', reqId: ap.reqId, applied: true, changes: [{ id: 'a', before: 'Frame 12', after: 'card-header' }], nodes: [] });
  await p.waitForTimeout(60);
  check('18 끝 → 첫 화면 · 상태 줄 "이름 1개 바꿈 · ⌘Z로 되돌리기"', (await visible(p, '#selHome')) && (await p.textContent('#statusText')) === '이름 1개 바꿈 · ⌘Z로 되돌리기', await p.textContent('#statusText'));
  await p.close();
}

/* ---------- 19 텍스트 스타일 KRDS(docs/text-style-krds.md §4 · §5) — 표시 · 구분선 줄 · [이름 다시 짓기] ---------- */
{
  const p = await open(560, 'variables');
  await recv(p, { type: 'LICENSE_STATUS', tier: 'paid', unlimited: true, source: 'dev' });
  await recv(p, { ...PREREQ, hasTextStyles: true });
  await recv(p, { type: 'VAR_TABLE', collections: COLS, vars: VARS });
  await p.click('#btnAddVar');
  await p.click('.ctx-menu button >> text=텍스트 스타일 만들기…');
  await p.waitForTimeout(40);
  const sc = (await sent(p, 'SCAN_TEXT_STYLES')).at(-1);
  await recv(p, { type: 'TEXT_STYLE_CANDIDATES', ...(sc?.reqId != null ? { reqId: sc.reqId } : {}), warnings: [], existing: [], styles: [
    { name: 'heading/large', fontSize: 28, lineHeight: 36, letterSpacing: 0, family: 'Inter', style: 'Bold', count: 2, nodeIds: ['t1'] },
    { name: 'body/medium-14', fontSize: 14, lineHeight: 20, letterSpacing: 0, family: 'Inter', style: 'Regular', count: 3, nodeIds: ['t2'] },
    { name: 'body/small-13_5', fontSize: 13.5, lineHeight: 20, letterSpacing: 0, family: 'Inter', style: 'Regular', count: 0 },
  ] });
  await p.waitForTimeout(60);
  const cards = await p.$$eval('#tsList .r-card', (e) => e.map((c) => { const cs = getComputedStyle(c); return { r: cs.borderTopLeftRadius, bt: cs.borderTopWidth, bb: cs.borderBottomWidth }; }));
  check('19 타이포 목록 — 카드 안 카드 아님(둥근 모서리 0 · 위 테두리 0 · 아래 구분선)', cards.length === 3 && cards.every((c) => c.r === '0px' && c.bt === '0px' && c.bb !== '0px'), JSON.stringify(cards));
  check('19 KRDS 크기 표시 없음 — #tsList .ts-off 0개 · .r-top.has-off 0개 · ×n 배지 없음', (await p.$$eval('#tsList .ts-off', (e) => e.length)) === 0 && (await p.$$eval('#tsList .r-top.has-off', (e) => e.length)) === 0 && (await p.$$eval('#tsList .r-badge', (e) => e.length)) === 0);
  check('19 13.5 줄에도 [삭제]가 같은 줄 — 크기 칸 뒤 정렬 그대로', await p.$eval('#tsList .r-card:nth-child(3)', (c) => { const sz = c.querySelector('.ts-edit input[type="number"]')?.getBoundingClientRect(); const d = c.querySelector('.r-top .link')?.getBoundingClientRect(); const t = c.querySelector('.r-top .r-title')?.getBoundingClientRect(); return !!d && !!t && !!sz && Math.abs(t.top + t.height / 2 - (d.top + d.height / 2)) < 4 && d.left > sz.right; }));
  check('19 상태 줄에 " · KRDS 밖" 꼬리 없음', !(await p.textContent('#tsStatus')).includes(' · KRDS 밖'), await p.textContent('#tsStatus'));
  // [이름 다시 짓기] → 팝업 · 읽는 중 · 포커스 [닫기]
  await p.click('#btnTsRename');
  await p.waitForTimeout(30);
  const sr = (await sent(p, 'SCAN_TS_RENAME')).at(-1);
  check('19 팝업 — SCAN_TS_RENAME(reqId) · "스타일을 읽는 중…" · 버튼 잠금 · 포커스 [닫기]', typeof sr?.reqId === 'number' && (await p.textContent('.modal')).includes('스타일을 읽는 중…') && (await p.evaluate(() => document.activeElement?.textContent)) === '닫기');
  const rows = [
    { id: 's1', from: 'body', to: 'body/large', sig: 'a' },
    { id: 's2', from: 'h1', to: 'heading/xlarge', sig: 'b' },
    { id: 's3', from: 'caption', to: 'label/small-13_5', sig: 'c' },
  ];
  await recv(p, { type: 'TS_RENAME_PLAN', reqId: sr.reqId, rows });
  await p.waitForTimeout(30);
  const head = await p.textContent('.modal');
  check('19 응답 — 제목 "바꿀 이름 3개" · 줄 3 · [3개 이름 바꾸기] · 첫 스위치 포커스', head.includes('이름 다시 짓기 · 바꿀 이름 3개') && (await p.$$eval('.modal .tsr-row', (e) => e.length)) === 3 && head.includes('3개 이름 바꾸기') && (await p.evaluate(() => document.activeElement?.dataset.id)) === 's1');
  check('19 줄 — "body → body/large" · 팝업 .ts-off 0개(크기 표시 없음)', (await p.textContent('.modal .tsr-row >> nth=0')).replace(/\s+/g, '').startsWith('body→body/large') && (await p.$$eval('.modal .ts-off', (e) => e.length)) === 0);
  // ↓ 키로 다음 스위치 · 하나 끔 → [2개]
  await p.keyboard.press('ArrowDown');
  check('19 ↓ 키 — 다음 스위치로', (await p.evaluate(() => document.activeElement?.dataset.id)) === 's2');
  await p.click('.modal .bv-switch[data-id="s2"]');
  check('19 하나 끔 → [2개 이름 바꾸기] · 포커스 그대로', (await p.textContent('.modal')).includes('2개 이름 바꾸기') && (await p.getAttribute('.modal .bv-switch[data-id="s2"]', 'aria-checked')) === 'false');
  // 모두 끄기 → 잠금 사유 · 모두 켜기 → [3개]
  await p.click('.modal [data-all="off"]');
  const applyBtn = p.locator('.modal button', { hasText: '이름 바꾸기' });
  check('19 모두 끄기 → [0개 이름 바꾸기] 잠김', (await applyBtn.textContent()) === '0개 이름 바꾸기' && (await applyBtn.getAttribute('aria-disabled')) === 'true');
  await p.click('.modal [data-all="on"]');
  check('19 모두 켜기 → [3개 이름 바꾸기]', (await applyBtn.textContent()) === '3개 이름 바꾸기');
  // 겹침 — 끈 줄의 지금 이름 = 켠 줄의 새 이름이면 그 줄은 빠진다
  await recv(p, { type: 'TS_RENAME_PLAN', reqId: sr.reqId, rows: [rows[0], { id: 's4', from: 'body/large', to: 'body/xlarge', sig: 'd' }] });
  await p.click('.modal .bv-switch[data-id="s4"]');
  check('19 겹침 — "같은 이름이 남아요" · [0개]', (await p.textContent('.modal .tsr-row >> nth=0')).includes('같은 이름이 남아요') && (await applyBtn.textContent()) === '0개 이름 바꾸기');
  await p.click('.modal .bv-switch[data-id="s4"]');
  await applyBtn.click();
  const ap = (await sent(p, 'APPLY_TS_RENAME')).at(-1);
  check('19 [바꾸기] → APPLY_TS_RENAME(켠 줄 · id · from · to · sig) · 실행 중 잠금', typeof ap?.reqId === 'number' && JSON.stringify(ap.items) === JSON.stringify([{ id: 's1', from: 'body', to: 'body/large', sig: 'a' }, { id: 's4', from: 'body/large', to: 'body/xlarge', sig: 'd' }]) && (await applyBtn.getAttribute('aria-disabled')) === 'true', JSON.stringify(ap?.items));
  await recv(p, { type: 'TS_RENAMED', reqId: ap.reqId, renamed: 2, skipped: 0, skipReasons: {}, results: [], roleVarsRenamed: 2, roleVarsTaken: 1, roleVarsError: 0, roleVarsStuck: [] });
  await p.waitForTimeout(60);
  check('19 끝 — 팝업 닫힘 · 포커스 [이름 다시 짓기]로', (await p.$('.modal')) === null && (await p.evaluate(() => document.activeElement?.id)) === 'btnTsRename');
  check('19 상태 줄 — "2개 이름을 바꿨어요 · ⌘Z" + Semantic 변수 그대로 · warn', (await p.textContent('#statusText')).startsWith('텍스트 스타일 2개 이름을 바꿨어요 · ⌘Z로 되돌리기 · Semantic 변수 1개는'), await p.textContent('#statusText'));
  check('19 스캔 표 비움 · [왼쪽 글자로 이름 채우기] 잠김 · 다시 스캔 안내', (await p.$$eval('#tsList .r-card', (e) => e.length)) === 0 && (await p.$eval('#btnTsRowLabels', (b) => b.disabled)) && (await p.textContent('#tsStatus')).endsWith('스캔 표를 비웠어요 — 다시 [스캔]해 주세요'));
  await p.screenshot({ path: process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/krds-after.png` : '/dev/null' }).catch(() => {});
  await p.close();
}

/* ---------- 20 선택 탭 카드의 [변수 만들기 →] 없앰(IA v4 §4.1 · B.11) — 입구는 할 일 하나 ---------- */
{
  const p = await open(560, 'select');
  await recv(p, { ...PREREQ, tierVars: 5, otherVars: 0 });
  await recv(p, { type: 'VAR_TABLE', collections: COLS, vars: VARS });
  await recv(p, { ...sel(1, 0), scanned: 40, ids: ['1:2'] });
  await p.waitForTimeout(450);
  const ap = (await sent(p, 'APPLY')).at(-1);
  await recv(p, preview(ap.reqId));
  await recv(p, tsPrev(ap.reqId));
  await recv(p, usageResult((await sent(p, 'SCAN_USAGE')).at(-1).reqId, { tx: { places: 2, layers: 1 } }));
  await p.waitForTimeout(80);
  await p.focus('#selCards [data-k="link"]');
  // 다시 읽은 뒤 m = 0 — [n곳 연결]이 없어진다
  await recv(p, { ...preview(ap.reqId), candidates: [], bound: 0, counts: { 'no-match': { color: 3, gap: 2 } } });
  await recv(p, tsPrev(ap.reqId));
  await p.waitForTimeout(80);
  const first = '#selCards .sel-card >> nth=0';
  check('20 (a) m = 0 · k > 0 카드 — "새로 만들 값 5곳" · 카드 안 버튼 0 · "변수 만들기 →" 없음', (await p.textContent(first)).includes('새로 만들 값 5곳') && (await p.locator(first).locator('button').count()) === 0 && !(await p.textContent('#selCards')).includes('변수 만들기 →'), await p.textContent(first));
  check('20 (e) 포커스한 [n곳 연결]이 없어짐 → 카드 영역에 버튼이 없으면 할 일 [변수 만들기]', (await p.evaluate(() => document.activeElement?.id)) === 'btnGoMake', await p.evaluate(() => document.activeElement?.id ?? ''));
  check('20 할 일 [변수 만들기]는 그대로', (await visible(p, '#btnGoMake')) && !(await locked(p, '#btnGoMake')));
  await p.close();
}
{
  // (c) 상태 6 — 로컬 변수 0개: 만들기 카드(무료 규칙 F3). 텍스트 스타일 후보가 있으면 맨 아래 [{t}곳 연결] — 만들기 버튼이 있으면 보조, 없으면 주 버튼
  const p = await open(560, 'select');
  await recv(p, { ...PREREQ, hasBindable: false, tierVars: 0, otherVars: 0 });
  await recv(p, { type: 'VAR_TABLE', collections: [], vars: [] });
  await recv(p, { ...sel(1, 0), scanned: 40, ids: ['1:2'] });
  await p.waitForTimeout(450);
  await recv(p, usageResult((await sent(p, 'SCAN_USAGE')).at(-1).reqId, {}));
  await p.waitForTimeout(60);
  const first = '#selCards .sel-card >> nth=0';
  check('20 (c) 상태 6 카드 — 읽는 중엔 제목 + "선택을 읽는 중…"만(버튼 없음)', (await p.textContent(first)).includes('이 파일엔 아직 변수가 없어요') && (await p.textContent(first)).includes('선택을 읽는 중') && (await p.locator(first).locator('button').count()) === 0, await p.textContent(first));
  const pt = (await sent(p, 'PREVIEW_TEXT_STYLES')).at(-1);
  const ap6 = (await sent(p, 'APPLY')).at(-1);
  if (ap6) await recv(p, { ...preview(ap6.reqId), candidates: [], bound: 0, counts: { 'no-match': { gap: 2 } } });
  await recv(p, tsPrev(pt.reqId, B2_TS, { hasStyle: 1 }));
  await cardAnswer(p, [{ name: 'font-size/16', category: 'fontSize', value: 16, sources: ['fontSize'], count: 2 }]);
  check('20 (c) 고른 토큰 0개 — "기본으로 만들 값이 없어요 · 외 1개 보기" · [2곳 연결] 주 버튼', (await p.textContent(first)).includes('기본으로 만들 값이 없어요') && (await p.$eval('[data-k="tsLink"]', (b) => b.classList.contains('primary'))), await p.textContent(first));
  await p.close();
}

/* ---------- 21 선택 탭 할 일 버튼 강약(IA v4 §4.1 · B.13) — 한 화면에 주 버튼 하나 ---------- */
const makeHot = (p) => p.$eval('#btnGoMake', (b) => b.classList.contains('primary'));
const primaries = (p) => p.evaluate(() => document.querySelectorAll('#selCards button.primary').length + (document.getElementById('btnGoMake').classList.contains('primary') ? 1 : 0));
{
  // 상태 7 — 카드 1 읽는 중 · m > 0이면 보조, m = 0 · k > 0이면 주 버튼, 찾은 값이 모두 연결되면 보조
  const p = await open(560, 'select');
  await recv(p, { ...PREREQ, tierVars: 5, otherVars: 0 });
  await recv(p, { type: 'VAR_TABLE', collections: COLS, vars: VARS });
  await recv(p, { ...sel(1, 0), scanned: 40, ids: ['1:2'] });
  await p.waitForTimeout(450);
  const ap = (await sent(p, 'APPLY')).at(-1);
  await recv(p, usageResult((await sent(p, 'SCAN_USAGE')).at(-1).reqId, {}));
  await p.waitForTimeout(60);
  check('21 상태 7 · 카드 1 읽는 중 → 보조', (await p.textContent('#selCards .sel-card >> nth=0')).includes('읽는 중') && !(await makeHot(p)), await p.textContent('#selCards'));
  await recv(p, preview(ap.reqId));
  await recv(p, tsPrev(ap.reqId));
  await recv(p, usageResult((await sent(p, 'SCAN_USAGE')).at(-1).reqId, { tx: { places: 2, layers: 1 } }));
  await p.waitForTimeout(80);
  check('21 상태 7 · [n곳 연결] 있음 → [변수 만들기] 보조 · 주 버튼 1개', !(await makeHot(p)) && (await primaries(p)) === 1);
  await recv(p, { ...preview(ap.reqId), candidates: [], bound: 0, counts: { 'no-match': { color: 3, gap: 2 } } });
  await recv(p, tsPrev(ap.reqId));
  await p.waitForTimeout(80);
  check('21 상태 7 · m = 0 · k > 0 → [변수 만들기] 주 버튼 · 주 버튼 1개', (await makeHot(p)) && (await primaries(p)) === 1);
  await recv(p, { ...preview(ap.reqId), candidates: [], bound: 2, counts: {} });
  await recv(p, tsPrev(ap.reqId));
  await p.waitForTimeout(80);
  check('21 찾은 값이 모두 연결됨(만들 값 0) → 보조', !(await makeHot(p)));
  await p.close();
}
{
  // 상태 6 — 만들기 카드(무료 규칙 F3): 할 일 [변수 만들기]는 상태 6에서 늘 보조(카드 주 버튼이 하나)
  const p = await open(560, 'select');
  await recv(p, { ...PREREQ, hasBindable: false, tierVars: 0, otherVars: 0 });
  await recv(p, { type: 'VAR_TABLE', collections: [], vars: [] });
  await p.waitForTimeout(60);
  check('21 선택 없음 → [변수 만들기] 보조(잠금)', !(await makeHot(p)));
  await recv(p, { ...sel(1, 0), scanned: 40, ids: ['1:2'] });
  await p.waitForTimeout(450);
  const us = (await sent(p, 'SCAN_USAGE')).at(-1).reqId;
  await recv(p, usageResult(us, {}));
  await p.waitForTimeout(60);
  check('21 상태 6 · 읽는 중 → 보조', (await p.textContent('#selCards')).includes('이 파일엔 아직 변수가 없어요') && !(await makeHot(p)));
  const ap = (await sent(p, 'APPLY')).at(-1);
  const pt = (await sent(p, 'PREVIEW_TEXT_STYLES')).at(-1);
  await recv(p, { ...preview(ap.reqId), candidates: [], bound: 0, counts: { 'no-match': { gap: 2, color: 1 } } });
  if (pt) await recv(p, tsPrev(pt.reqId));
  await cardAnswer(p);
  check('21 상태 6 · 만들 값 있음 → [변수 만들기] 보조 · 주 버튼은 카드의 [Global {g}개 모두 만들기] 하나', !(await makeHot(p)) && (await primaries(p)) === 1 && (await p.$eval('[data-k="mkAll"]', (b) => b.classList.contains('primary'))));
  if (pt) {
    await recv(p, tsPrev(pt.reqId, B2_TS, { hasStyle: 1 }));
    await p.waitForTimeout(80);
    check('21 상태 6 + [{t}곳 연결] → 보조(카드 주 버튼은 만들기 버튼 하나)', !(await makeHot(p)) && (await primaries(p)) === 1 && !(await p.$eval('[data-k="tsLink"]', (b) => b.classList.contains('primary'))));
    await recv(p, tsPrev(pt.reqId));
    await p.waitForTimeout(60);
  }
  await recv(p, usageResult(us, {}, { deleted: { count: 3, nodeIds: ['x'] } }));
  await p.waitForTimeout(80);
  check('21 상태 6 + 카드 3(삭제된 변수) → [변수 만들기] 보조 · 카드 3 버튼은 보조', !(await makeHot(p)) && (await p.$$eval('#selCards .sel-card', (e) => e.length)) >= 2 && (await primaries(p)) === 1);
  await p.close();
}
{
  // 상태 5 — 라이브러리 변수만 씀: 만들 값이 있어도 보조
  const p = await open(560, 'select');
  await recv(p, { ...PREREQ, hasBindable: false, tierVars: 0, otherVars: 0 });
  await recv(p, { type: 'VAR_TABLE', collections: [], vars: [] });
  await recv(p, { ...sel(1, 0), scanned: 40, ids: ['1:2'] });
  await p.waitForTimeout(450);
  await recv(p, usageResult((await sent(p, 'SCAN_USAGE')).at(-1).reqId, { L1: { places: 1, layers: 1 } }, { libraryVars: [{ id: 'L1', name: 'core/blue/500', collection: 'Core', type: 'COLOR', value: { kind: 'color', hex: '#3366FF' }, aliasTargets: [] }] }));
  const ap = (await sent(p, 'APPLY')).at(-1);
  if (ap) await recv(p, { ...preview(ap.reqId), candidates: [], bound: 0, counts: { 'no-match': { gap: 2 } } });
  const pt = (await sent(p, 'PREVIEW_TEXT_STYLES')).at(-1);
  if (pt) await recv(p, tsPrev(pt.reqId));
  await p.waitForTimeout(80);
  check('21 상태 5(라이브러리만) → 보조', (await p.textContent('#selCards')).includes('라이브러리') && !(await makeHot(p)), await p.textContent('#selCards'));
  await p.close();
}
{
  // noTier — 로컬 변수는 있지만 계층 컬렉션이 없음: 만들 값 있으면 주 버튼
  const p = await open(560, 'select');
  await recv(p, { ...PREREQ, hasBindable: false, tierVars: 0, otherVars: 3 });
  await recv(p, { type: 'VAR_TABLE', collections: COLS, vars: VARS });
  await recv(p, { ...sel(1, 0), scanned: 40, ids: ['1:2'] });
  await p.waitForTimeout(450);
  await recv(p, usageResult((await sent(p, 'SCAN_USAGE')).at(-1).reqId, {}));
  const ap = (await sent(p, 'APPLY')).at(-1);
  if (ap) await recv(p, { ...preview(ap.reqId), candidates: [], bound: 0, counts: { 'no-match': { gap: 2 } } });
  const pt = (await sent(p, 'PREVIEW_TEXT_STYLES')).at(-1);
  if (pt) await recv(p, tsPrev(pt.reqId));
  await p.waitForTimeout(80);
  check('21 noTier · 찾기 결과 뒤 → [변수 만들기] 주 버튼', (await p.textContent('#selCards')).includes('계층으로 쓸 컬렉션이 없어요') && (await makeHot(p)) && (await primaries(p)) === 1, await p.textContent('#selCards'));
  if (pt) {
    await recv(p, tsPrev(pt.reqId, B2_TS, { hasStyle: 1 }));
    await p.waitForTimeout(80);
    check('21 noTier + 텍스트 스타일 후보 → [변수 만들기] 보조 · 주 버튼은 [{t}곳 연결] 하나', !(await makeHot(p)) && (await primaries(p)) === 1);
  }
  await p.screenshot({ path: process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/b13-notier.png` : '/dev/null' }).catch(() => {});
  await p.close();
}

/* ---------- 22 카드 안 카드 없애기(IA v4 §2.8 · B.12) ---------- */
{
  const p = await open(560, 'layer');
  await goSub(p, 'structure');
  await compFound(p, [
    { id: 'r', name: 'Frame', type: 'FRAME', depth: 0, parentId: null, eligible: false },
    { id: 'a', name: 'Item Button', type: 'FRAME', depth: 1, parentId: 'r', eligible: true, single: 'Button', defaultOn: true },
    { id: 'b', name: 'Like', type: 'FRAME', depth: 1, parentId: 'r', eligible: true, single: 'Like' },
  ]);
  await p.waitForTimeout(60);
  check('22 컴포넌트 트리 — 행 ≥1', (await p.$$eval('#compTree .r-card', (e) => e.length)) >= 1);
  const row = await rowShape(p, '#compTree .r-card');
  check('22 목록 행 = 아래 구분선 1px · 모서리 0 · 배경 투명 · 높이 30 · 들여쓰기는 안쪽 여백(2 + 12)', row.top === '0px' && row.bottom === '1px' && row.radius === '0px' && row.bg === 'rgba(0, 0, 0, 0)' && row.minH === '30px' && row.pl === '14px', JSON.stringify(row));
  check('22 .results 행 사이 틈 0', (await p.$eval('#compTree', (e) => getComputedStyle(e).rowGap)) === '0px');
  // 컴포넌트 트리는 맥락 줄을 늘 숨겨 그룹 머리가 없다 — 베리언트 리포트 구분줄(resultGroup과 같은 클래스)로 본다
  await p.evaluate(() => { document.getElementById('variantReport').innerHTML = '<div class="r-group r-ghead">아주 긴 그룹 머리 이름이 패널 폭을 넘어도 말줄임으로 끝나야 한다 · 아주 긴 그룹 머리 이름</div>'; });
  const gh = await p.$eval('#variantReport .r-ghead', (e) => { const s = getComputedStyle(e); return { bg: s.backgroundColor, h: e.getBoundingClientRect().height, fs: s.fontSize, ell: s.textOverflow, disp: s.display }; });
  check('22 목록 그룹 머리 = 회색 머리 띠(--surface-2 · 높이 ≥ 32 · 12.5px · 말줄임 · 블록)', gh.bg === 'rgb(244, 245, 246)' && gh.h >= 32 && gh.fs === '12.5px' && gh.ell === 'ellipsis' && gh.disp === 'block', JSON.stringify(gh));
  const ctg = await p.$eval('#compTreeGroup', (e) => ({ bg: getComputedStyle(e).backgroundColor, h: e.getBoundingClientRect().height, text: e.textContent }));
  check('22 #compTreeGroup = 머리 띠(--surface-2 · 높이 ≥ 32) + "컴포넌트 후보" · "2개"(UX 검수 C §4.3a-3)', ctg.bg === 'rgb(244, 245, 246)' && ctg.h >= 32 && ctg.text === '컴포넌트 후보2개', JSON.stringify(ctg));
  await p.hover('#compTree .r-card >> nth=0');
  check('22 목록 행 마우스 올림 띠 --surface-hover', (await p.$eval('#compTree .r-card', (e) => getComputedStyle(e).backgroundColor)) === 'rgb(236, 238, 240)');
  await p.mouse.move(0, 0);
  // 오류 상자(실제 ERROR 흐름) — 빨강 띠 · 테두리 0 · ⚠ 아이콘
  await recv(p, { type: 'ERROR', message: '테스트 실패', op: 'REGISTER_COMPONENTS' });
  await p.waitForTimeout(40);
  const err = await p.$eval('#structureStatus .ux.danger', (e) => { const s = getComputedStyle(e); const b = getComputedStyle(e.querySelector('.ux-h'), '::before'); return { bw: s.borderTopWidth, ic: b.content, w: b.width }; });
  check('22 오류 상자 = 빨강 띠(테두리 0) · 앞에 14px 아이콘', err.bw === '0px' && !['none', 'normal'].includes(err.ic) && err.w === '14px', JSON.stringify(err));
  // 안내 · 진행 띠, 색 · 토큰 · 리포트 목록 — 실제 클래스로 DOM을 채워 모양을 본다(데이터 흐름은 앞 검사들이 지킨다)
  await p.evaluate(() => {
    const row = (t) => `<div class="r-card"><div class="r-top no-check"><div class="r-main"><div class="r-title">${t}</div></div></div></div>`;
    for (const id of ['variantReport', 'colorTable', 'tokenList']) document.getElementById(id).innerHTML = row('a') + row('b');
    document.getElementById('applyProgress').style.display = '';
    for (const id of ['tokenColorNote', 'numTidySummary']) document.getElementById(id).style.display = '';
  });
  for (const id of ['variantReport', 'colorTable', 'tokenList']) {
    const r = await rowShape(p, `#${id} .r-card`);
    check(`22 #${id} 행 = 아래 구분선 · 모서리 0 · 배경 투명`, r.top === '0px' && r.bottom === '1px' && r.radius === '0px' && r.bg === 'rgba(0, 0, 0, 0)', JSON.stringify(r));
  }
  for (const s of ['#tokenColorNote', '#numTidySummary', '#applyProgress']) {
    const b = await p.$eval(s, (e) => { const c = getComputedStyle(e); const target = e.id === 'applyProgress' ? e.querySelector('.row') : e; const bf = getComputedStyle(target, '::before'); return { bw: c.borderTopWidth, ic: bf.content, w: bf.width, anim: bf.animationName }; });
    check(`22 ${s} 띠 — 테두리 0 · 14px 아이콘${s === '#applyProgress' ? ' · 도는 고리' : ''}`, b.bw === '0px' && !['none', 'normal'].includes(b.ic) && b.w === '14px' && (s !== '#applyProgress' || b.anim !== 'none'), JSON.stringify(b));
  }
  check('22 #tsList는 #139 행 크기 그대로(안쪽 여백 8px)', await p.evaluate(() => { const l = document.getElementById('tsList'); l.innerHTML = '<div class="r-card"><div class="r-top no-check"><div class="r-main"><div class="r-title">x</div></div></div></div>'; const s = getComputedStyle(l.firstElementChild); return s.paddingLeft === '8px' && s.minHeight !== '30px'; }));
  const bad = await nestedCards(p);
  check('22 카드 안 카드 0 — 컴포넌트 화면', bad.length === 0, bad.join(' · '));
  await p.screenshot({ path: process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/b12-structure.png` : '/dev/null', fullPage: true }).catch(() => {});
  await p.close();
}
{
  // 선택 탭 첫 화면(카드 1~3) · 연결 화면 — 카드 안 카드 0
  const p = await open(560, 'select');
  await recv(p, { ...PREREQ, tierVars: 5, otherVars: 0 });
  await recv(p, { type: 'VAR_TABLE', collections: COLS, vars: VARS });
  await recv(p, { ...sel(1, 0), scanned: 40, ids: ['1:2'] });
  await p.waitForTimeout(450);
  const ap = (await sent(p, 'APPLY')).at(-1);
  await recv(p, preview(ap.reqId));
  await recv(p, tsPrev(ap.reqId));
  await recv(p, usageResult((await sent(p, 'SCAN_USAGE')).at(-1).reqId, { tx: { places: 2, layers: 1 } }, { deleted: { count: 3, nodeIds: ['x'] } }));
  await p.waitForTimeout(80);
  check('22 선택 탭 카드가 보임', (await p.$$eval('#selCards .sel-card', (e) => e.length)) >= 2);
  const bad1 = await nestedCards(p);
  check('22 카드 안 카드 0 — 선택 탭 첫 화면', bad1.length === 0, bad1.join(' · '));
  await p.screenshot({ path: process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/b13-select.png` : '/dev/null' }).catch(() => {});
  await p.click('#selCards [data-k="link"]');
  await p.waitForTimeout(80);
  const bad2 = await nestedCards(p);
  check('22 카드 안 카드 0 — 연결 화면', bad2.length === 0, bad2.join(' · '));
  await p.screenshot({ path: process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/b12-bind.png` : '/dev/null' }).catch(() => {});
  await p.close();
}

{
  // 값을 직접 고르기 — 실제 흐름(추출 결과 · 토큰 미리보기)으로 색 · 토큰 목록과 격자 정리 띠를 채운다
  const p = await open(560, 'select');
  await recv(p, { type: 'LICENSE_STATUS', tier: 'paid', unlimited: true, source: 'dev' });
  await recv(p, PREREQ);
  await recv(p, { type: 'VAR_TABLE', collections: [], vars: [] });
  await recv(p, { ...sel(1, 0), ids: ['w1'], firstName: 'Card' });
  await goSub(p, 'pick');
  await p.waitForTimeout(80);
  await p.click('#colorCard .toolbar button >> nth=0');
  await p.waitForTimeout(40);
  const ex = (await sent(p, 'EXTRACT')).at(-1);
  await recv(p, { type: 'EXTRACT_RESULT', ...(ex?.reqId ? { reqId: ex.reqId } : {}), warnings: [], selection: 1, tokens: [
    { name: 'color/blue-500', category: 'color', value: '#2563EB', sources: ['fill'], count: 6 },
    { name: 'color/gray-900', category: 'color', value: '#111827', sources: ['fill'], count: 4 },
    { name: 'spacing/16', category: 'gap', value: 16, sources: ['itemSpacing'], count: 4 },
    { name: 'spacing/15', category: 'gap', value: 15, sources: ['itemSpacing'], count: 1 },
  ] });
  await p.waitForTimeout(120);
  check('22 색 목록(실제 흐름) — 행 ≥1 · 보이는 색 카드', (await p.$$eval('#colorTable .r-card', (e) => e.length)) >= 1 && (await p.$eval('#colorCard', (e) => e.getClientRects().length > 0)));
  const cr = await rowShape(p, '#colorTable .r-card');
  check('22 색 목록 행 = 아래 구분선 · 모서리 0 · 배경 투명', cr.top === '0px' && cr.bottom === '1px' && cr.radius === '0px' && cr.bg === 'rgba(0, 0, 0, 0)', JSON.stringify(cr));
  const badColor = await nestedCards(p);
  check('22 카드 안 카드 0 — 값을 직접 고르기 › 색', badColor.length === 0, badColor.join(' · '));
  await p.click('[data-make-step="token"].step-chip');
  await p.waitForTimeout(60);
  await p.click('#btnCreate');
  await p.waitForTimeout(80);
  // 색 안내 띠는 "색을 먼저 만든" 상태에서만 뜬다 — 표시만 켜서 모양을 본다
  await p.evaluate(() => { const n = document.getElementById('tokenColorNote'); n.style.display = ''; n.textContent = '색 2개는 색 단계에서 만들었어요'; });
  check('22 토큰 목록(실제 흐름) — 행 ≥1 · 격자 정리 띠가 보임', (await p.$$eval('#tokenList .r-card', (e) => e.length)) >= 1 && (await visible(p, '#numTidySummary')));
  const tr = await rowShape(p, '#tokenList .r-card');
  check('22 토큰 목록 행 = 아래 구분선 · 모서리 0 · 배경 투명 · 높이 30', tr.top === '0px' && tr.bottom === '1px' && tr.radius === '0px' && tr.bg === 'rgba(0, 0, 0, 0)' && tr.minH === '30px', JSON.stringify(tr));
  for (const s2 of ['#tokenColorNote', '#numTidySummary']) {
    const b = await p.$eval(s2, (e) => { const c = getComputedStyle(e); const bf = getComputedStyle(e, '::before'); return { bw: c.borderTopWidth, ic: bf.content, w: bf.width, shown: e.getClientRects().length > 0 }; });
    check(`22 ${s2} 띠(보이는 화면) — 테두리 0 · 14px 아이콘`, b.shown && b.bw === '0px' && !['none', 'normal'].includes(b.ic) && b.w === '14px', JSON.stringify(b));
  }
  const badToken = await nestedCards(p);
  check('22 카드 안 카드 0 — 값을 직접 고르기 › 토큰', badToken.length === 0, badToken.join(' · '));
  await p.screenshot({ path: process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/b12-token.png` : '/dev/null', fullPage: true }).catch(() => {});
  // 설정 › 라이선스 오류
  await recv(p, { type: 'ERROR', message: '키를 확인하지 못했어요', op: 'SET_LICENSE' });
  await p.click('#btnSettings');
  await p.waitForTimeout(60);
  const le = await p.$eval('#licenseStatus .ux.danger', (e) => ({ bw: getComputedStyle(e).borderTopWidth, w: getComputedStyle(e.querySelector('.ux-h'), '::before').width, shown: e.getClientRects().length > 0 }));
  check('22 설정 › 라이선스 오류 = 빨강 띠(테두리 0) · ⚠', le.shown && le.bw === '0px' && le.w === '14px', JSON.stringify(le));
  const badSet = await nestedCards(p);
  check('22 카드 안 카드 0 — 설정', badSet.length === 0, badSet.join(' · '));
  await p.close();
}
{
  // 내보내기 팝업 오류 — 팝업(.modal) 안 빨강 띠
  const p = await open(560, 'variables');
  await recv(p, PREREQ);
  await recv(p, { type: 'VAR_TABLE', collections: COLS, vars: VARS });
  await p.click('#btnVarMore');
  await p.click('.ctx-menu button:has-text("코드로 내보내기")');
  await p.waitForTimeout(60);
  await recv(p, { type: 'ERROR', message: '내보내지 못했어요', op: 'EXPORT' });
  await p.waitForTimeout(40);
  const xe = await p.$eval('.modal #exportStatus .ux.danger', (e) => ({ bw: getComputedStyle(e).borderTopWidth, w: getComputedStyle(e.querySelector('.ux-h'), '::before').width }));
  check('22 내보내기 팝업 오류 = 빨강 띠(테두리 0) · ⚠', xe.bw === '0px' && xe.w === '14px', JSON.stringify(xe));
  const badX = await nestedCards(p);
  check('22 카드 안 카드 0 — 내보내기 팝업', badX.length === 0, badX.join(' · '));
  await p.close();
}

/* ---------- 23 UX 검수 C(ia-v4 §4.3a · B.14) — 색 Layer · 빈 상태 잠금 · 주 버튼 · 팔레트 띠 · 컴포넌트 문구 · 머리 띠 ---------- */
const cardPrimaries = (p, card) => p.$$eval(`${card} button.primary`, (e) => e.filter((x) => x.getClientRects().length).map((x) => x.id));
{
  // 색(유료) — 빈 상태 · 토큰 단계 미리보기만 · 추출 뒤 · 팔레트 띠
  const p = await open(560, 'select');
  await recv(p, { type: 'LICENSE_STATUS', tier: 'paid', unlimited: true, source: 'dev' });
  await recv(p, PREREQ);
  await recv(p, { type: 'VAR_TABLE', collections: [], vars: [] });
  await recv(p, { ...sel(1, 0), ids: ['w1'], firstName: 'Card' });
  await goSub(p, 'pick');
  await p.waitForTimeout(80);
  check('23 색 빈 상태 — [색 변수 만들기] 잠김 · #btnExtract.primary · 주 버튼 하나',
    (await locked(p, '#btnColorVars')) && JSON.stringify(await cardPrimaries(p, '#colorCard')) === JSON.stringify(['btnExtract']), JSON.stringify(await cardPrimaries(p, '#colorCard')));
  const ct0 = (await sent(p, 'CREATE_TOKENS')).length;
  check('23 색 빈 상태 — 누르면 공통 상태 줄 사유 · CREATE_TOKENS 0', (await lockMsg(p, '#btnColorVars')) === '먼저 ‘선택에서 추출’이나 ‘팔레트 생성’으로 색을 모아 주세요' && (await sent(p, 'CREATE_TOKENS')).length === ct0);
  const hint = await p.$eval('#colorCard .hint[data-i18n="colorTidy.hint"]', (e) => ({ h: e.getBoundingClientRect().height, lh: parseFloat(getComputedStyle(e).lineHeight) || parseFloat(getComputedStyle(e).fontSize) * 1.5, text: e.textContent }));
  check('23 안내 한 줄(높이 ≤ 한 줄)', hint.text === '색을 뽑거나 팔레트를 만든 뒤 Semantic을 정하고 변수로 만들어요' && hint.h <= hint.lh + 1, JSON.stringify(hint));
  // 토큰 단계 [미리보기]로만 추출 — 색 목록이 숨어 있으니 색 단계 [색 변수 만들기]는 여전히 잠김
  await p.click('[data-make-step="token"].step-chip');
  await p.waitForTimeout(40);
  await p.click('#btnCreate');
  const ex0 = (await sent(p, 'EXTRACT')).at(-1);
  const COLORS = [
    { name: 'color/blue-500', category: 'color', value: '#2563EB', sources: ['fill'], count: 6 },
    { name: 'color/gray-900', category: 'color', value: '#111827', sources: ['fill'], count: 4 },
    { name: 'spacing/16', category: 'gap', value: 16, sources: ['itemSpacing'], count: 4 },
    { name: 'spacing/8', category: 'gap', value: 8, sources: ['itemSpacing'], count: 2 },
  ];
  await recv(p, { type: 'EXTRACT_RESULT', ...(ex0?.reqId ? { reqId: ex0.reqId } : {}), warnings: [], selection: 1, tokens: COLORS });
  await p.waitForTimeout(60);
  await p.click('[data-make-step="color"].step-chip');
  await p.waitForTimeout(40);
  check('23 토큰 단계 미리보기로만 추출(색 목록 숨음) → 색 단계 [색 변수 만들기] 여전히 잠김',
    !(await visible(p, '#colorSection')) && (await locked(p, '#btnColorVars')) && JSON.stringify(await cardPrimaries(p, '#colorCard')) === JSON.stringify(['btnExtract']));
  await p.click('#btnExtract');
  const ex1 = (await sent(p, 'EXTRACT')).at(-1);
  await recv(p, { type: 'EXTRACT_RESULT', ...(ex1?.reqId ? { reqId: ex1.reqId } : {}), warnings: [], selection: 1, tokens: COLORS });
  await p.waitForTimeout(80);
  check('23 추출 뒤 — [색 변수 만들기] 풀림 · 주 버튼 옮김(#btnColorVars.primary · 추출은 보조)',
    !(await locked(p, '#btnColorVars')) && JSON.stringify(await cardPrimaries(p, '#colorCard')) === JSON.stringify(['btnColorVars']), JSON.stringify(await cardPrimaries(p, '#colorCard')));
  const sums = await p.$$eval('#colorTable .r-sum', (e) => e.map((x) => x.textContent));
  check('23 색 목록 요약 "Layer 6" · "×" 없음', sums[0] === '#2563EB · Layer 6' && sums.every((x) => !x.includes('×')), JSON.stringify(sums));
  // 팔레트 띠
  check('23 팔레트 띠 처음 숨김 · aria-expanded="false" · aria-controls', !(await visible(p, '#paletteBand')) && (await p.getAttribute('#btnPalette', 'aria-expanded')) === 'false' && (await p.getAttribute('#btnPalette', 'aria-controls')) === 'paletteBand');
  await p.click('#btnPalette');
  check('23 [팔레트 생성] 누르면 aria-expanded="true" · 띠 보임 · 포커스 단추 그대로', (await p.getAttribute('#btnPalette', 'aria-expanded')) === 'true' && (await visible(p, '#paletteBand')) && (await p.evaluate(() => document.activeElement?.id)) === 'btnPalette');
  const band = await p.$eval('#paletteBand', (e) => { const s = getComputedStyle(e); return { bg: s.backgroundColor, bw: s.borderTopWidth, hex: getComputedStyle(document.getElementById('brandHex')).backgroundColor, tip: document.getElementById('harmonyLabel').title }; });
  check('23 띠 = 옅은 배경(--surface-2) · 테두리 0 · 입력 칸은 흰 바탕 · 하모니 label 툴팁', band.bg === 'rgb(244, 245, 246)' && band.bw === '0px' && band.hex === 'rgb(255, 255, 255)' && band.tip === '보조색을 켜면 고를 수 있어요', JSON.stringify(band));
  const badBand = await nestedCards(p);
  check('23 카드 안 카드 0 — 팔레트 띠를 연 색 단계', badBand.length === 0, badBand.join(' · '));
  await p.click('#btnPaletteRun');
  await p.waitForTimeout(80);
  check('23 [팔레트 만들기] → 색 목록 · 띠는 열린 채 · [팔레트 만들기]는 보조', (await p.$$eval('#colorTable .r-card', (e) => e.length)) > 10 && (await visible(p, '#paletteBand')) && !(await p.$eval('#btnPaletteRun', (e) => e.classList.contains('primary'))));
  await p.click('#btnPalette');
  check('23 띠를 접어도 #selInfo가 보임("선택 1개 · 색 2 · 그 외 2")', !(await visible(p, '#paletteBand')) && (await visible(p, '#selInfo')) && (await p.textContent('#selInfo')) === '선택 1개 · 색 2 · 그 외 2', await p.textContent('#selInfo'));
  await p.close();
}
{
  // 연결 중(대기 잠금)에도 색이 있는 색 단계의 주 버튼은 그대로
  const p = await open(560, 'select');
  await recv(p, { type: 'LICENSE_STATUS', tier: 'paid', unlimited: true, source: 'dev' });
  await openSel(p);
  const a = await sent(p, 'APPLY');
  await recv(p, { ...preview(a[0].reqId), candidates: B2_CANDS });
  await recv(p, tsPrev(a[0].reqId, B2_TS));
  await p.click('[data-k="link"]');
  await p.waitForTimeout(40);
  await p.click('#btnApplyConfirm');
  check('23 (준비) 연결 중', (await sent(p, 'APPLY_SELECTED')).length === 1);
  await goSub(p, 'pick');
  await p.waitForTimeout(60);
  await p.click('#btnExtract');
  const ex = (await sent(p, 'EXTRACT')).at(-1);
  await recv(p, { type: 'EXTRACT_RESULT', ...(ex?.reqId ? { reqId: ex.reqId } : {}), warnings: [], selection: 1, tokens: [{ name: 'color/blue-500', category: 'color', value: '#2563EB', sources: ['fill'], count: 6 }] });
  await p.waitForTimeout(60);
  check('23 연결 중(대기 잠금) — [색 변수 만들기]는 잠겨도 #btnColorVars.primary 그대로', (await locked(p, '#btnColorVars')) && JSON.stringify(await cardPrimaries(p, '#colorCard')) === JSON.stringify(['btnColorVars']), JSON.stringify(await cardPrimaries(p, '#colorCard')));
  await p.close();
}
{
  // 무료 — 잠긴 버튼에는 주 버튼을 두지 않는다
  const p = await open(560, 'select');
  await recv(p, { type: 'LICENSE_STATUS', tier: 'free', unlimited: false, source: 'dev' });
  await recv(p, PREREQ);
  await recv(p, { type: 'VAR_TABLE', collections: [], vars: [] });
  await recv(p, { ...sel(1, 0), ids: ['w1'], firstName: 'Card' });
  await goSub(p, 'pick');
  await p.waitForTimeout(60);
  check('23 무료 색 — #btnExtract.primary · [색 변수 만들기]에 primary 없음', JSON.stringify(await cardPrimaries(p, '#colorCard')) === JSON.stringify(['btnExtract']), JSON.stringify(await cardPrimaries(p, '#colorCard')));
  await goSub(p, 'structure');
  await p.waitForTimeout(60);
  // 2026-11-19 닮은 프레임 찾기 제거 — 무료는 [컴포넌트 후보 찾기] · [등록] 모두 유료 잠금이라 주 버튼이 없다(ia-v4 §4.3a-2)
  check('23 무료 컴포넌트 — 주 버튼 없음 · 두 버튼 유료 잠금', JSON.stringify(await cardPrimaries(p, '#structureCard')) === '[]' && (await locked(p, '#btnScanComp')) && (await locked(p, '#btnRegisterComp')), JSON.stringify(await cardPrimaries(p, '#structureCard')));
  check('23 컴포넌트 안내 글 = "후보를 찾아 컴포넌트로 등록해요"', (await p.textContent('#structureCard .hint')).trim() === '후보를 찾아 컴포넌트로 등록해요', await p.textContent('#structureCard .hint'));
  await p.close();
}
{
  // 컴포넌트(유료) — 잠금 · 주 버튼 · 제목 줄 · 머리 띠 · 문구 · 후보 줄 이름
  const p = await open(560, 'select');
  await recv(p, { type: 'LICENSE_STATUS', tier: 'paid', unlimited: true, source: 'dev' });
  await recv(p, PREREQ);
  await recv(p, { type: 'VAR_TABLE', collections: [], vars: [] });
  await recv(p, { ...sel(1, 0), ids: ['w1'], firstName: 'Card' });
  await goSub(p, 'structure');
  await p.waitForTimeout(60);
  const prim = () => cardPrimaries(p, '#structureCard');
  check('23 컴포넌트 처음 — [등록] 잠김 · #btnScanComp.primary', (await locked(p, '#btnRegisterComp')) && JSON.stringify(await prim()) === JSON.stringify(['btnScanComp']), JSON.stringify(await prim()));
  const rc0 = (await sent(p, 'REGISTER_COMPONENTS')).length;
  check('23 [등록] 누르면 사유 "먼저 ‘컴포넌트 후보 찾기’를 눌러 주세요" · REGISTER_COMPONENTS 0', (await lockMsg(p, '#btnRegisterComp')) === '먼저 ‘컴포넌트 후보 찾기’를 눌러 주세요' && (await sent(p, 'REGISTER_COMPONENTS')).length === rc0);
  const h2 = await p.$eval('#structureCard h2', (e) => e.textContent.replace(/\s+/g, ''));
  check('23 제목 줄 = "컴포넌트베타"(개수 · "닮은 프레임" 없음)', h2 === '컴포넌트베타', h2);
  const btns = await p.evaluate(() => ['btnScanComp', 'btnRegisterComp', 'btnClassifyVariants', 'btnGenMissing'].map((id) => document.getElementById(id).textContent.trim()));
  check('23 버튼 글 — 컴포넌트 후보 찾기 · 등록 · 변형 세트로 묶기 · 빠진 변형 채우기', JSON.stringify(btns) === JSON.stringify(['컴포넌트 후보 찾기', '등록', '변형 세트로 묶기', '빠진 변형 채우기']), JSON.stringify(btns));
  await compFound(p, [
    { id: 'r', name: 'Frame', type: 'FRAME', depth: 0, parentId: null, eligible: false },
    { id: 'b1', name: 'Button / primary', type: 'FRAME', depth: 1, parentId: 'r', eligible: true, group: 'Button', variant: 'Type=primary', defaultOn: true },
    { id: 'lk', name: 'Like', type: 'FRAME', depth: 1, parentId: 'r', eligible: true, single: 'Like' },
  ]);
  await p.waitForTimeout(60);
  check('23 후보 받음 → [등록] 풀림 · #btnRegisterComp.primary', !(await locked(p, '#btnRegisterComp')) && JSON.stringify(await prim()) === JSON.stringify(['btnRegisterComp']), JSON.stringify(await prim()));
  const ctg = await p.$eval('#compTreeGroup', (e) => ({ name: e.firstElementChild?.textContent, cnt: e.querySelector('.r-gcnt')?.textContent, bg: getComputedStyle(e).backgroundColor }));
  check('23 #compTreeGroup — "컴포넌트 후보" + "2개" 머리 띠', ctg.name === '컴포넌트 후보' && ctg.cnt === '2개' && ctg.bg === 'rgb(244, 245, 246)', JSON.stringify(ctg));
  const crow = await p.$$eval('#compTree .r-card', (e) => e.map((c) => ({ name: c.querySelector('.r-title .tree-name')?.textContent, v: c.querySelector('.r-title .r-var')?.textContent ?? null, sum: c.querySelector('.r-sum')?.textContent ?? null, tag: c.querySelector('.tag')?.textContent, tip: c.querySelector('.r-title span')?.title })));
  check('23 세트 후보 줄 — 제목 "Button" + 변형 "Type=primary" · 둘째 줄 "원래 이름 Button / primary" · 배지 [변형 세트]',
    crow[0]?.name === 'Button' && crow[0]?.v === 'Type=primary' && crow[0]?.sum === '원래 이름 Button / primary' && crow[0]?.tag === '변형 세트' && crow[0]?.tip === 'Button / primary → Button · Type=primary', JSON.stringify(crow));
  check('23 이름이 같은 단일 줄은 둘째 줄 없음 · 배지 [컴포넌트]', crow[1]?.name === 'Like' && crow[1]?.sum === null && crow[1]?.tag === '컴포넌트', JSON.stringify(crow[1]));
  await p.click('#compAll'); // 일부 체크(indeterminate) → 전체 켬
  await p.click('#compAll'); // 전체 끔
  await p.waitForTimeout(30);
  check('23 전체 끔 → [등록] 잠김 · 사유 "등록할 후보를 체크해 주세요" · 주 버튼 하나', (await locked(p, '#btnRegisterComp')) && (await lockMsg(p, '#btnRegisterComp')) === '등록할 후보를 체크해 주세요' && (await prim()).length === 1 && !(await prim()).includes('btnRegisterComp'), JSON.stringify(await prim()));
  const badComp = await nestedCards(p);
  check('23 카드 안 카드 0 — 머리 띠를 단 컴포넌트 화면', badComp.length === 0, badComp.join(' · '));
  check('23 화면마다 주 버튼 하나 이하', (await prim()).length <= 1, JSON.stringify(await prim()));
  // 베리언트 결과 — 머리 띠 "빈 변형" · "3개" · "처리 중 문제" · "1개"
  await recv(p, { type: 'VARIANTS_RESULT', sets: 2, missing: ['Size=L, State=hover', 'Size=S, State=pressed', 'Size=M, State=disabled'], singles: [], failures: ['Badge: 속성 이름이 서로 달라 묶지 못했어요'] });
  await p.waitForTimeout(60);
  const vr = await p.$$eval('#variantReport .r-ghead', (e) => e.map((g) => ({ name: g.firstElementChild?.textContent, cnt: g.querySelector('.r-gcnt')?.textContent, ff: getComputedStyle(g).fontFamily })));
  const vw = await p.$eval('#variantReport .r-card .r-title', (e) => getComputedStyle(e).fontWeight);
  check('23 베리언트 결과 머리 띠 — "빈 변형" · "3개" · "처리 중 문제" · "1개"(콜론 없음) · mono 아님 · 항목 굵기 400',
    vr.length === 2 && vr[0].name === '빈 변형' && vr[0].cnt === '3개' && vr[1].name === '처리 중 문제' && vr[1].cnt === '1개' && vr.every((g) => !/monospace|Menlo/.test(g.ff)) && vw === '400', JSON.stringify({ vr, vw }));
  check('23 제목 줄에 결과 개수 없음', (await p.$eval('#structureCard h2', (e) => e.textContent.replace(/\s+/g, ''))) === '컴포넌트베타');
  await p.close();
}

/* ---------- 24 무료 규칙 · 첫 화면 만들기 카드(ia-v4 B.18 — §4.1 "만들기 카드" · §4.3a · §4.9 · F1–F10) ---------- */
/** 로컬 변수 0개 파일 · 선택 1개 → 찾기 · 쓰는 변수 응답까지. 만들기 카드의 추출은 응답하지 않은 채 돌려준다. */
async function openZero(tier = 'free', { table = { collections: [], vars: [] }, prereq = { ...PREREQ, hasBindable: false, tierVars: 0, otherVars: 0 } } = {}) {
  const p = await open(560, 'select');
  await recv(p, { type: 'LICENSE_STATUS', tier, unlimited: tier === 'paid', source: 'dev' });
  await recv(p, prereq);
  await recv(p, { type: 'VAR_TABLE', ...table });
  await recv(p, { ...sel(1, 0), scanned: 40, ids: ['f1'], firstName: 'Flightin website' });
  await p.waitForTimeout(450);
  await recv(p, usageResult((await sent(p, 'SCAN_USAGE')).at(-1).reqId, {}));
  const ap = (await sent(p, 'APPLY')).at(-1);
  if (ap) await recv(p, { ...preview(ap.reqId), candidates: [], bound: 0, counts: { 'no-match': { gap: 2, color: 2 } } });
  const pt = (await sent(p, 'PREVIEW_TEXT_STYLES')).at(-1);
  if (pt) await recv(p, tsPrev(pt.reqId));
  await p.waitForTimeout(40);
  return p;
}
const cardRows = (p) => p.$$eval('#selCards .mk-row', (e) => e.map((r) => r.innerText.replace(/\s+/g, ' ').trim()));
const cardText = (p) => p.$eval('#selCards .sel-card', (e) => e.innerText.replace(/\s+/g, ' ').trim());
{
  // 무료 처음 모습(시안 ①) — 카드 읽기는 찾기와 함께 · 추출 · 미리보기는 조용한 읽기(OPS 밖) · 미리보기는 globalOnly 없이
  const p = await openZero('free');
  const ex = (await sent(p, 'EXTRACT')).at(-1);
  check('24 상태 6 — 찾기와 함께 추출 EXTRACT{reqId, nodeIds(기준)}', !!ex && typeof ex.reqId === 'number' && ex.nodeIds?.[0] === 'f1', JSON.stringify(ex));
  check('24 기억이 없는 카드 — 결과 전엔 제목 + "선택을 읽는 중…"만', (await cardText(p)) === '이 파일엔 아직 변수가 없어요 선택을 읽는 중…', await cardText(p));
  check('24 추출은 진행 테두리 대상이 아님(OPS 밖)', !(await p.$eval('#btnExpand', (b) => b.classList.contains('busy'))));
  const pv = await cardAnswer(p);
  check('24 미리보기 — 기본으로 켜지는 토큰(글자 종류 제외) · 이름 정리 뒤 · globalOnly 없음', !!pv && pv.preview === true && pv.globalOnly === undefined && pv.tokens.length === 5 && !pv.tokens.some((tk) => tk.category === 'fontSize') && !pv.tokens.some((tk) => tk.name === 'color/101828'), JSON.stringify(pv?.tokens?.map((tk) => tk.name)));
  const rows = await cardRows(p);
  check('24 무료 처음 — 제목 · 둘째 줄 · 라벨 · 값 줄 4개(Layer 많은 순) · 줄마다 [＋ 만들기]', (await cardText(p)).startsWith('이 파일엔 아직 변수가 없어요 찾은 값으로 Global 변수를 만들어요 · 개수 제한은 없어요 Flightin website에서 많이 쓴 값') && rows.length === 4 && rows[0].startsWith('#101828') && rows[0].includes('Layer 31') && rows.every((r) => r.endsWith('＋ 만들기')) && !rows.some((r) => r.includes('color/101828')), JSON.stringify(rows));
  check('24 무료 처음 — [외 1개 보기] · 주 버튼 [Global 5개 모두 만들기] · 🔒 줄 "🔒 Semantic 4개 · 텍스트 스타일 · 다크 모드 · 라이선스 →"', (await p.textContent('[data-k="mkMore"]')) === '외 1개 보기' && (await p.textContent('[data-k="mkAll"]')) === 'Global 5개 모두 만들기' && (await p.$eval('[data-k="mkAll"]', (b) => b.classList.contains('primary'))) && (await p.$eval('.mk-lock', (e) => e.innerText.replace(/\s+/g, ' ').trim())) === '🔒 Semantic 4개 · 텍스트 스타일 · 다크 모드 · 라이선스 →', await p.$eval('.mk-lock', (e) => e.innerText));
  check('24 할 일 [변수 만들기]는 상태 6에서 보조', !(await p.$eval('#btnGoMake', (b) => b.classList.contains('primary'))));
  const rowStyle = await p.$eval('.mk-row', (e) => { const s = getComputedStyle(e); return { b: s.borderTopWidth + s.borderLeftWidth + s.borderRightWidth, r: s.borderTopLeftRadius, bg: s.backgroundColor, bb: s.borderBottomWidth }; });
  check('24 카드 안 카드 없음 — 값 줄은 아래 구분선만(테두리 · 둥근 모서리 · 행 배경 0)', rowStyle.b === '0px0px0px' && rowStyle.r === '0px' && (rowStyle.bg === 'rgba(0, 0, 0, 0)' || rowStyle.bg === 'transparent') && rowStyle.bb === '1px', JSON.stringify(rowStyle));
  const bad = await nestedCards(p);
  check('24 카드 안 카드 0 — 만들기 카드', bad.length === 0, bad.join(' · '));
  // [＋ 만들기] — 그 토큰 하나 · globalOnly · OPS write(작업 이름 "변수 만들기")
  await p.click('[data-k="mk:color/blue/950"], .mk-row >> nth=0 >> button');
  await p.waitForTimeout(20);
  const cr = (await sent(p, 'CREATE_TOKENS')).filter((m) => !m.preview).at(-1);
  check('24 [＋ 만들기] → CREATE_TOKENS{preview 아님 · 토큰 하나 · globalOnly · reqId}', !!cr && cr.tokens.length === 1 && cr.globalOnly === true && typeof cr.reqId === 'number', JSON.stringify(cr));
  check('24 만드는 동안 카드 버튼 쓰기 잠금(사유 "변수 만들기")', (await locked(p, '[data-k="mkAll"]')) && (await p.getAttribute('[data-k="mkAll"]', 'data-lock-msg')).includes('변수 만들기'));
  const exBefore = (await sent(p, 'EXTRACT')).length;
  const semBefore = (await sent(p, 'CREATE_SEMANTICS')).length;
  await recv(p, { type: 'CREATE_RESULT', reqId: cr.reqId, created: 1, updated: 0, summary: 'x', roles: 0, skippedManual: 0 });
  await p.waitForTimeout(40);
  check('24 만든 직후 — 공통 상태 줄 "Global 변수 1개를 만들었어요 · ⌘Z로 되돌리기"', (await p.textContent('#statusText')) === 'Global 변수 1개를 만들었어요 · ⌘Z로 되돌리기', await p.textContent('#statusText'));
  check('24 카드 응답은 메인 처리기를 타지 않음(#createStatus · CREATE_SEMANTICS 없음)', (await sent(p, 'CREATE_SEMANTICS')).length === semBefore && !(await p.textContent('#createStatus')).includes('x'));
  check('24 만든 뒤 다시 읽기(작업 직후) — 찾기 · 추출', (await sent(p, 'EXTRACT')).length === exBefore + 1);
  check('24 일부만 만듦(남긴 카드) — 제목 "Global 변수 1개를 만들었어요" · 만든 줄 ✓ 만듦 · 나머지는 처음 모습', (await p.textContent('#selCards .sel-card .t')) === 'Global 변수 1개를 만들었어요' && (await cardRows(p))[0].endsWith('✓ 만듦') && (await cardRows(p))[1].endsWith('＋ 만들기') && (await p.textContent('[data-k="mkAll"]')) === 'Global 4개 모두 만들기', JSON.stringify(await cardRows(p)));
  check('24 다시 읽는 동안 — 예전 줄 · 숫자 그대로, 버튼만 잠금(사유 "선택을 읽는 중…")', (await locked(p, '[data-k="mkAll"]')) && (await p.getAttribute('[data-k="mkAll"]', 'data-lock-msg')) === '선택을 읽는 중…');
  // 다시 읽은 결과 — 로컬 변수가 생겨도(상태 7) 같은 기준이면 카드를 남긴다
  await recv(p, { type: 'PREREQ_STATE', ...PREREQ, hasBindable: true, tierVars: 1, otherVars: 0 });
  await recv(p, { type: 'VAR_TABLE', collections: COLS.slice(0, 1), vars: [{ id: 'nv1', name: 'color/blue/950', collectionId: 'g', type: 'COLOR', values: { m: { kind: 'color', hex: '#101828' } }, scopes: [], description: '' }] });
  const names = pv.tokens.map((tk) => tk.name);
  const st1 = Object.fromEntries(names.map((n, i) => [n, i === 0 ? { state: 'reuse', varName: n } : { state: 'new' }]));
  await cardAnswer(p, MC_TOKENS, st1);
  check('24 남긴 카드 — 상태 7이어도 카드 1 자리가 만들기 카드', (await p.textContent('#selCards .sel-card .t')) === 'Global 변수 1개를 만들었어요' && !(await locked(p, '[data-k="mkAll"]')), await p.textContent('#selCards .sel-card .t'));
  // [Global {g}개 모두 만들기] — new 토큰만
  await p.click('[data-k="mkAll"]');
  const cr2 = (await sent(p, 'CREATE_TOKENS')).filter((m) => !m.preview).at(-1);
  check('24 [Global 4개 모두 만들기] → new 토큰 4개만 · globalOnly', cr2.tokens.length === 4 && cr2.globalOnly === true && !cr2.tokens.some((tk) => tk.name === names[0]), JSON.stringify(cr2.tokens.map((tk) => tk.name)));
  await recv(p, { type: 'CREATE_RESULT', reqId: cr2.reqId, created: 4, updated: 0, summary: '', roles: 0, skippedManual: 0 });
  await p.waitForTimeout(40);
  check('24 만든 직후 모두 만듦 — 제목 · 둘째 줄 연결 안내 · 🔒 Semantic 4개 · [{o}곳 연결 →]은 아직 없음', (await p.textContent('#selCards .sel-card .t')) === 'Global 변수 5개를 만들었어요' && (await cardText(p)).includes('같은 값을 쓰는 레이어에 연결해요 · Semantic 변수는 유료예요') && (await p.$eval('.mk-lock', (e) => e.innerText.replace(/\s+/g, ' ').trim())) === '🔒 Semantic 4개 · 라이선스 →' && (await p.$('[data-k="mkLink"]')) === null && (await p.$('[data-k="mkAll"]')) === null, await cardText(p));
  // 다시 읽은 찾기 결과가 오면 [{o}곳 연결 →]가 생긴다
  const ap2 = (await sent(p, 'APPLY')).at(-1);
  await recv(p, { ...preview(ap2.reqId) });
  await recv(p, tsPrev(ap2.reqId));
  await cardAnswer(p, MC_TOKENS, Object.fromEntries(names.map((n) => [n, { state: 'reuse', varName: n }])));
  check('24 만든 뒤(다시 읽은 뒤) — 줄 모두 ✓ 만듦 · 주 버튼 [2곳 연결 →]', (await cardRows(p)).every((r) => r.endsWith('✓ 만듦')) && (await p.textContent('[data-k="mkLink"]')) === '2곳 연결 →' && (await p.$eval('[data-k="mkLink"]', (b) => b.classList.contains('primary'))), JSON.stringify(await cardRows(p)));
  await p.click('[data-k="mkLink"]');
  check('24 [{o}곳 연결 →] → 연결 화면', await visible(p, '#subHead'));
  await p.close();
}
{
  // 만들기 실패 · 추출 실패(카드 자리만 찾기 실패 모습 — F-D3)
  const p = await openZero('free');
  await cardAnswer(p, MC_TOKENS, null, 0);
  check('24 r = 0 — 🔒 줄 "🔒 텍스트 스타일 · 다크 모드 · 라이선스 →"', (await p.$eval('.mk-lock', (e) => e.innerText.replace(/\s+/g, ' ').trim())) === '🔒 텍스트 스타일 · 다크 모드 · 라이선스 →');
  await p.click('[data-k="mkAll"]');
  const cr = (await sent(p, 'CREATE_TOKENS')).filter((m) => !m.preview).at(-1);
  await recv(p, { type: 'ERROR', message: 'boom', op: 'CREATE_TOKENS', reqId: cr.reqId });
  await p.waitForTimeout(30);
  check('24 만들기 실패 — 공통 상태 줄 "변수 만들기 실패 · [보기]" · 줄 · 숫자는 그대로', (await p.textContent('#statusText')) === '변수 만들기 실패' && (await p.textContent('#statusAction')) === '보기' && (await p.textContent('#selCards .sel-card .t')) === '이 파일엔 아직 변수가 없어요' && (await p.textContent('[data-k="mkAll"]')) === 'Global 5개 모두 만들기', await p.textContent('#statusText'));
  check('24 만들기 실패를 #createStatus로 보내지 않음', !(await p.textContent('#createStatus')).includes('boom'));
  // 추출 실패 — 카드 자리만 "선택을 읽지 못했어요 · [다시 읽기]"
  await p.click('#tabbtn-variables');
  await p.click('#tabbtn-select');
  await p.waitForTimeout(30);
  const ex = (await sent(p, 'EXTRACT')).at(-1);
  await recv(p, { type: 'ERROR', message: 'x', op: 'EXTRACT', reqId: ex.reqId });
  await p.waitForTimeout(30);
  check('24 추출 실패 — 카드 자리 "선택을 읽지 못했어요" + [다시 읽기]', (await cardText(p)) === '선택을 읽지 못했어요 다시 읽기', await cardText(p));
  const apN = (await sent(p, 'APPLY')).length;
  await p.click('[data-k="mkReread"]');
  await p.waitForTimeout(20);
  check('24 [다시 읽기] — 찾기 결과가 지금 기준이면 추출만(찾기 다시 안 보냄) · 읽는 중 카드', (await sent(p, 'APPLY')).length === apN && (await cardText(p)).includes('선택을 읽는 중…'), String((await sent(p, 'APPLY')).length - apN));
  await cardAnswer(p);
  check('24 다시 읽기 성공 → 만들기 카드로 돌아옴', (await cardRows(p)).length === 4);
  await p.close();
}
{
  // 유료 · 추출 0개
  const p = await openZero('paid');
  await cardAnswer(p);
  check('24 유료 — 둘째 줄 · 줄에 버튼 없음 · [외 1개 보기] · 주 버튼 [Global 5 · Semantic 4 만들기 →] · 🔒 줄 없음', (await cardText(p)).includes('찾은 값으로 Global · Semantic 변수를 만들고 연결해요') && (await p.$$('.mk-row button')).length === 0 && (await p.textContent('[data-k="mkGo"]')) === 'Global 5 · Semantic 4 만들기 →' && (await p.$('.mk-lock')) === null, await cardText(p));
  await p.click('[data-k="mkGo"]');
  check('24 유료 주 버튼 → 만들기 화면(이동만 · 만들지 않음)', (await visible(p, '#subHead')) && (await sent(p, 'CREATE_TOKENS')).filter((m) => !m.preview).length === 0);
  await p.close();
  const p2 = await openZero('paid');
  await cardAnswer(p2, MC_TOKENS, null, 0);
  check('24 유료 r = 0 — [Global 5개 만들기 →]', (await p2.textContent('[data-k="mkGo"]')) === 'Global 5개 만들기 →');
  await p2.close();
  const p3 = await openZero('free');
  await cardAnswer(p3, []);
  check('24 추출 0개 — 제목 + "이 선택에서 찾은 값이 없어요"만', (await cardText(p3)) === '이 파일엔 아직 변수가 없어요 이 선택에서 찾은 값이 없어요', await cardText(p3));
  await p3.close();
}
{
  // 무료 새 변수 · 복제(F2 · F9 · F10)
  const RATIO = { id: 'u', name: 'Tokens', tier: 2, modes: [{ modeId: 'um', name: 'Mode 1' }], defaultModeId: 'um', tierWhy: { kind: 'ratio', alias: 4, counted: 4 } };
  const UVARS = [{ id: 'u1', name: 'color/brand', collectionId: 'u', type: 'COLOR', values: { um: { kind: 'alias', aliasId: 'g9', aliasName: 'color/gray/900' } }, scopes: [], description: '' }];
  const varsPage = async (collections, vars) => {
    const p = await open(560, 'variables');
    await recv(p, { type: 'LICENSE_STATUS', tier: 'free', unlimited: false, source: 'dev' });
    await recv(p, PREREQ);
    await recv(p, { type: 'VAR_TABLE', collections, vars });
    await p.waitForTimeout(450);
    const u = (await sent(p, 'SCAN_USAGE')).at(-1);
    if (u) await recv(p, usageResult(u.reqId, {}));
    await p.waitForTimeout(40);
    return p;
  };
  const openNew = async (p) => { await p.click('#btnAddVar'); await p.click('.ctx-menu button >> text=새 변수'); await p.waitForTimeout(30); };
  const p = await varsPage(COLS, VARS);
  await openNew(p);
  check('24 새 변수 — 사이드바에서 고른 적 없음 → 플러그인 Semantic이 아닌 첫 컬렉션(G Global) · 잠금 없음', (await p.textContent('.modal dd.ed-plain')) === 'G Global' && !(await locked(p, '.modal .m-foot button.primary, .modal button >> text=만들기')), await p.textContent('.modal dd.ed-plain'));
  await p.keyboard.press('Escape');
  await p.click('#varSide [data-key="side:col:s"]');
  await openNew(p);
  const saveSel = '.modal button:has-text("만들기")';
  check('24 Semantic을 직접 고른 뒤 — 팝업 안 알림 줄 "Semantic 변수는 유료예요 · 라이선스 →" · [만들기 🔒] 유료 잠금 · 포커스 이름 칸', (await p.textContent('.modal .ed-alert.paid')).replace(/\s+/g, ' ').trim() === 'Semantic 변수는 유료예요 · 라이선스 →' && (await p.textContent(saveSel)) === '만들기 🔒' && (await locked(p, saveSel)) && (await p.evaluate(() => document.activeElement?.getAttribute('aria-label'))) === '이름(전체 경로)', await p.textContent('.modal .ed-alert.paid'));
  await p.fill('.modal .ed-field input >> nth=0', 'color/x');
  check('24 칸을 고쳐도 사유 줄은 그대로', await visible(p, '.modal .ed-alert.paid'));
  await p.click(saveSel, { force: true });
  check('24 잠긴 [만들기]를 눌러도 CREATE_VARIABLE 없음 · 공통 상태 줄에 띄우지 않음 · 사유 줄 하나', (await sent(p, 'CREATE_VARIABLE')).length === 0 && !(await p.textContent('#statusText')).includes('유료') && (await p.$$('.modal .ed-alert.paid')).length === 1);
  await p.click('.modal .ed-alert.paid button');
  await p.waitForTimeout(30);
  check('24 팝업의 [라이선스 →] → 팝업 닫고 설정 › 키 입력 칸', (await p.$('.modal')) === null && (await p.evaluate(() => document.activeElement?.id)) === 'licenseKey');
  // 복제 — 원본이 플러그인 Semantic이면 늘 잠금
  await p.click('#tabbtn-variables');
  await p.waitForTimeout(30);
  await rightClick(p, '.vt-row[data-id="tx"]');
  const dupItem = await p.$eval('.ctx-menu', (m) => { const b = [...m.querySelectorAll('button')].find((x) => x.childNodes[0].textContent === '복제'); return { dis: b.getAttribute('aria-disabled') === 'true' || b.disabled, txt: b.textContent }; });
  check('24 우클릭 › 복제(플러그인 Semantic 변수) — 잠금 + 사유 "Semantic 변수는 유료예요"', dupItem.dis && dupItem.txt.includes('Semantic 변수는 유료예요'), JSON.stringify(dupItem));
  await p.keyboard.press('Escape');
  // 플러그인이 거절(ERROR code 'paid') — 새 변수는 팝업 안 사유 줄
  await p.click('#varSide [data-key="side:col:g"]');
  await openNew(p);
  await p.fill('.modal .ed-field input >> nth=0', 'spacing/20');
  await p.fill('.modal .ed-field input >> nth=1', '20');
  await p.click(saveSel);
  const cv = (await sent(p, 'CREATE_VARIABLE')).at(-1);
  await recv(p, { type: 'ERROR', message: 'semantic collection is paid', op: 'CREATE_VARIABLE', reqId: cv.reqId, code: 'paid' });
  await p.waitForTimeout(20);
  check('24 플러그인 ERROR{code: paid} → 팝업 안 사유 줄 + [만들기 🔒]', (await visible(p, '.modal .ed-alert.paid')) && (await p.textContent(saveSel)) === '만들기 🔒');
  await p.keyboard.press('Escape');
  await p.close();
  // Semantic만 있는 파일 → 새 Variables
  const p2 = await varsPage([COLS[1]], VARS.filter((v) => v.collectionId === 's'));
  await openNew(p2);
  check('24 Semantic만 있는 파일 → "Variables (새로 만듦)" · 잠금 없음 · 값 칸 "Mode 1"', (await p2.textContent('.modal dd.ed-plain')) === 'Variables (새로 만듦)' && !(await p2.$('.modal .ed-alert.paid:not([hidden])')) && (await p2.textContent('.modal')).includes('Mode 1'), await p2.textContent('.modal dd.ed-plain'));
  await p2.fill('.modal .ed-field input >> nth=0', 'spacing/4');
  await p2.fill('.modal .ed-field input >> nth=1', '4');
  await p2.click(saveSel);
  const cv2 = (await sent(p2, 'CREATE_VARIABLE')).at(-1);
  check('24 새 Variables — collectionId 없이 · 기본 모드 값(*)', !!cv2 && cv2.collectionId === undefined && cv2.values['*']?.value === 4, JSON.stringify(cv2));
  await p2.close();
  // 별칭 비율로 Semantic인 사용자 컬렉션 — 잠그지 않고 ②에서 건너뛰지 않는다(F10)
  const p3 = await varsPage([COLS[1], RATIO, COLS[0]], [...VARS, ...UVARS]);
  await openNew(p3);
  check('24 별칭 비율 Semantic 사용자 컬렉션 — 기본 컬렉션 ②에서 건너뛰지 않음 · 잠금 없음', (await p3.textContent('.modal dd.ed-plain')).endsWith('Tokens') && !(await p3.$('.modal .ed-alert.paid:not([hidden])')), await p3.textContent('.modal dd.ed-plain'));
  await p3.keyboard.press('Escape');
  await p3.click('#varSide [data-key="side:col:u"]');
  await rightClick(p3, '.vt-row[data-id="u1"]');
  const dup3 = await p3.$eval('.ctx-menu', (m) => { const b = [...m.querySelectorAll('button')].find((x) => x.childNodes[0].textContent === '복제'); return b.getAttribute('aria-disabled') === 'true' || b.disabled; });
  check('24 별칭 비율 Semantic 사용자 컬렉션의 복제는 잠그지 않음', !dup3);
  await p3.keyboard.press('Escape');
  // F7 — 이미 있는 Semantic 변수 고치기 · 삭제는 무료
  await p3.click('#varSide [data-key="side:col:s"]');
  await p3.focus('.vt-row[data-id="tx"]');
  await p3.keyboard.press('Enter');
  await p3.fill('.modal .ed-field input >> nth=0', 'color/text/strong');
  await p3.click('.modal button:has-text("저장")');
  check('24 무료 — 플러그인 Semantic 변수 고치기(UPDATE_VARIABLE)는 된다(F7)', (await sent(p3, 'UPDATE_VARIABLE')).length === 1);
  await p3.evaluate(() => document.querySelector('.modal-backdrop')?.remove());
  await p3.close();
  const p4 = await varsPage(COLS, VARS);
  await rightClick(p4, '.vt-row[data-id="tx"]');
  await p4.click('.ctx-menu button >> text=삭제');
  await p4.click('.modal button.danger');
  check('24 무료 — 플러그인 Semantic 변수 삭제(DELETE_VARIABLE)는 된다(F7)', (await sent(p4, 'DELETE_VARIABLE')).at(-1)?.id === 'tx');
  await p4.close();
}
{
  // 무료 값을 직접 고르기 › 색 · 토큰(F8) — Global만 · Semantic 0 · CREATE_SEMANTICS 없음
  const p = await open(560, 'select');
  await recv(p, { type: 'LICENSE_STATUS', tier: 'free', unlimited: false, source: 'dev' });
  await recv(p, PREREQ);
  await recv(p, { type: 'VAR_TABLE', collections: COLS, vars: VARS });
  await recv(p, { ...sel(1, 0), scanned: 40, ids: ['k1'] });
  await goSub(p, 'pick');
  await p.waitForTimeout(40);
  check('24 무료 색 — 색이 없으면 [색 변수 만들기]는 빈 상태 잠금(유료 잠금 아님) · [선택에서 추출] 주 버튼', (await p.getAttribute('#btnColorVars', 'data-lock')) === 'prereq' && (await p.$eval('#btnExtract', (b) => b.classList.contains('primary'))) && (await p.textContent('#colorVarsLock')) === '' && (await p.textContent('#paletteLock')) === '');
  await p.click('#btnExtract');
  const ex = (await sent(p, 'EXTRACT')).at(-1);
  await recv(p, { type: 'EXTRACT_RESULT', warnings: [], selection: 1, tokens: [{ name: 'color/101828', category: 'color', value: '#101828', sources: ['fills'], count: 3 }, { name: 'spacing/8', category: 'gap', value: 8, sources: ['itemSpacing'], count: 2 }], ...(ex?.reqId ? { reqId: ex.reqId } : {}) });
  await p.waitForTimeout(60);
  check('24 무료 색 — [색 변수 만들기] 열림 · 주 버튼 · 🔒 없음 · [팔레트 생성] 잠금 없음(브랜드 팔레트 무료)', !(await locked(p, '#btnColorVars')) && (await p.$eval('#btnColorVars', (b) => b.classList.contains('primary'))) && (await p.textContent('#paletteBtnLock')) === '' && !(await locked(p, '#btnPalette')));
  const rl = await p.$eval('#colorTable select.r-role', (s) => ({ dis: s.getAttribute('aria-disabled'), tip: s.title, lk: s.previousElementSibling?.textContent }));
  check('24 무료 색 — 줄의 Semantic 고르개 유료 잠금(왼쪽 🔒 · 사유 "Semantic 변수는 유료예요")', rl.dis === 'true' && rl.tip === 'Semantic 변수는 유료예요' && rl.lk === '🔒', JSON.stringify(rl));
  await p.click('#colorTable select.r-role', { force: true });
  check('24 잠긴 Semantic 고르개를 누르면 상태 줄 "Semantic 변수는 유료예요 · 라이선스 →"', (await p.textContent('#statusText')) === 'Semantic 변수는 유료예요' && (await p.textContent('#statusAction')) === '라이선스 →');
  await p.click('#btnColorVars');
  const cr = (await sent(p, 'CREATE_TOKENS')).at(-1);
  check('24 무료 [색 변수 만들기] → CREATE_TOKENS{globalOnly}', cr?.globalOnly === true && !cr.preview, JSON.stringify(cr));
  await recv(p, { type: 'CREATE_RESULT', created: 1, updated: 0, summary: 'Global 1개', roles: 0 });
  await p.waitForTimeout(40);
  check('24 무료 — 만든 뒤 CREATE_SEMANTICS를 보내지 않음', (await sent(p, 'CREATE_SEMANTICS')).length === 0);
  await p.evaluate(() => document.querySelectorAll('.steps > *')[1]?.click());
  await p.waitForTimeout(30);
  check('24 무료 토큰 — [미리보기] 열림 · 🔒 없음', !(await locked(p, '#btnCreate')) && !(await p.$eval('#btnCreate', (b) => b.disabled)) && (await p.textContent('#createLock')) === '');
  await p.click('#btnCreate');
  const tp = (await sent(p, 'CREATE_TOKENS')).at(-1);
  check('24 무료 토큰 [미리보기] → CREATE_TOKENS{preview · globalOnly}', tp?.preview === true && tp.globalOnly === true, JSON.stringify(tp));
  await p.close();
}
{
  // 무료 연결 — N 배지 · newRoles 꼬리 없음(플러그인이 새 Semantic 후보를 보내지 않는다 — test/figma.test.mjs) · 준비 현황 › Semantic 매핑
  const p = await open(560, 'variables');
  await recv(p, { type: 'LICENSE_STATUS', tier: 'free', unlimited: false, source: 'dev' });
  await recv(p, PREREQ);
  await recv(p, { type: 'VAR_TABLE', collections: COLS, vars: VARS });
  await p.waitForTimeout(300);
  await p.click('#btnVarMore');
  await p.click('.ctx-menu button >> nth=0');
  await p.waitForTimeout(30);
  const semRow = await p.$('[data-step="semantics"], .pstep[data-id="semantics"]');
  if (semRow) {
    await semRow.click();
    await p.waitForTimeout(30);
    check('24 무료 준비 현황 › Semantic 매핑 → 상태 줄 "Semantic 매핑은 유료예요 · 라이선스 →" · 포커스 [미리보기]', (await p.textContent('#statusText')) === 'Semantic 매핑은 유료예요' && (await p.textContent('#statusAction')) === '라이선스 →' && (await p.evaluate(() => document.activeElement?.id)) === 'btnCreate', await p.textContent('#statusText'));
  } else check('24 준비 현황 Semantic 매핑 줄 찾기', false, await p.$eval('body', (b) => b.innerHTML.slice(0, 200)));
  await p.close();
}

/* ---------- 25 Components 정리 PR(ia-v3 A.15 · ia-v4 §2.5 · §2.8 · §4.3a-2 · §4.5 · §4.11 T-P29 ④ — C-D5 · C-D7 · C-D12 · C-D13 · C-D14) ---------- */
const COMP_NODES = [
  { id: 'r', name: 'Frame', type: 'FRAME', depth: 0, parentId: null, eligible: false },
  { id: 'b1', name: 'Button / primary', type: 'FRAME', depth: 1, parentId: 'r', eligible: true, group: 'Button', variant: 'Type=primary', defaultOn: true },
  { id: 'lk', name: 'Like', type: 'FRAME', depth: 1, parentId: 'r', eligible: true, single: 'Like' },
];
/** 카드 안 보이는 주 버튼 — id가 없는 [다시 시도]는 'retry'. */
const shownPrimaries = (p, card) => p.$$eval(`${card} button.primary`, (e) => e.filter((x) => x.getClientRects().length).map((x) => (x.classList.contains('retry-btn') ? 'retry' : x.id)));
const compRows = (p) => p.$$eval('#compTree .r-card', (e) => e.length);
const activeId = (p) => p.evaluate(() => (document.activeElement?.classList.contains('retry-btn') ? 'retry' : document.activeElement?.id ?? ''));
async function compScreen(extra = {}) {
  const p = await open(560, 'select');
  await recv(p, { type: 'LICENSE_STATUS', tier: 'paid', unlimited: true, source: 'dev' });
  await recv(p, PREREQ);
  await recv(p, { type: 'VAR_TABLE', collections: [], vars: [] });
  await recv(p, { ...sel(1, 0), ids: ['w1'], firstName: 'Card', ...extra });
  await goSub(p, 'structure');
  await p.waitForTimeout(60);
  return p;
}
/** 후보 목록을 채운다 — 후보 2(닮은 프레임 목록은 2026-11-19 제거). */
async function fillBoth(p) {
  await compFound(p, COMP_NODES);
  await p.waitForTimeout(30);
}
{
  const p = await compScreen();
  // 들어올 때 포커스(C-D7) — 접힌 카드는 펼친다
  await p.click('#btnSubBack');
  await p.evaluate(() => document.getElementById('structureCard').classList.add('collapsed'));
  await goSub(p, 'structure');
  await p.waitForTimeout(60);
  check('25 들어오면 접힌 카드를 펼치고 주 버튼에 포커스([컴포넌트 후보 찾기])', !(await p.$eval('#structureCard', (e) => e.classList.contains('collapsed'))) && (await activeId(p)) === 'btnScanComp', await activeId(p));
  // 찾기 결과 0 → [등록] 사유 ②
  await compFound(p, []);
  await p.waitForTimeout(30);
  check('25 찾기 결과 0 → [등록] 사유 "등록할 수 있는 프레임이 없어요"', (await locked(p, '#btnRegisterComp')) && (await lockMsg(p, '#btnRegisterComp')) === '등록할 수 있는 프레임이 없어요');
  check('25 찾기 0 상태 줄 component.noEligible', (await p.textContent('#structureStatus')) === '선택 아래에 등록할 수 있는 프레임이 없어요.', await p.textContent('#structureStatus'));
  // 찾기 요청에 목록 기준 nodeIds · reqId
  const sc = (await sent(p, 'SCAN_COMPONENT_CANDIDATES')).at(-1);
  check('25 [컴포넌트 후보 찾기] → 목록 기준 nodeIds · reqId', JSON.stringify(sc?.nodeIds) === '["w1"]' && typeof sc.reqId === 'number', JSON.stringify(sc));
  // 기준이 바뀌면 후보 목록 비움 + 사유 "찾은 적 없음"
  await recv(p, { type: 'VARIANTS_RESULT', sets: 1, missing: ['Size=L'], singles: [], failures: [] });
  await fillBoth(p);
  check('25 (준비) 후보 목록', (await compRows(p)) === 2);
  await recv(p, { ...sel(1, 0), ids: ['w2'] });
  await p.waitForTimeout(40);
  check('25 기준이 바뀜 → 후보 목록 · 머리 띠 · 전체 체크 줄 비움 · #variantReport도 지움', (await compRows(p)) === 0 && !(await visible(p, '#compTreeGroup')) && !(await visible(p, '#compTreeCtrls')) && (await p.$$eval('#variantReport > *', (e) => e.length)) === 0);
  check('25 기준이 바뀜 → [등록] 사유 needScan', (await lockMsg(p, '#btnRegisterComp')) === '먼저 ‘컴포넌트 후보 찾기’를 눌러 주세요');
  check('25 기준이 바뀜 → 찾기 결과 상태 글도 지움', (await p.textContent('#structureStatus')) === '', await p.textContent('#structureStatus'));
  // [등록] 뒤 후보 목록 비움
  await fillBoth(p);
  await p.click('#btnRegisterComp');
  await recv(p, { type: 'COMPONENTS_RESULT', registered: 1, skipped: 0, sets: 0, singles: ['Like'], missing: [], failures: [] });
  await p.waitForTimeout(40);
  check('25 [등록] 뒤 → 후보 목록 비움 · 결과 글은 남음', (await compRows(p)) === 0 && (await p.textContent('#structureStatus')).startsWith('컴포넌트 1'), await p.textContent('#structureStatus'));
  await fillBoth(p);
  // 쓰기 실패(오류) → 목록 그대로
  await p.click('#btnRegisterComp');
  await recv(p, { type: 'ERROR', message: '쓰기 실패', op: 'REGISTER_COMPONENTS', reqId: (await sent(p, 'REGISTER_COMPONENTS')).at(-1)?.reqId });
  await p.waitForTimeout(40);
  check('25 쓰기 실패(오류) → 후보 목록 그대로', (await compRows(p)) === 2);
  // 늦게 온 찾기 응답 · 오류는 버린다(C-D12)
  await p.click('#btnScanComp');
  const late = await lastReq(p, 'SCAN_COMPONENT_CANDIDATES');
  await recv(p, { ...sel(1, 0), ids: ['w3'] });
  await p.waitForTimeout(30);
  check('25 목록을 비울 때 "찾는 중" 글도 지움', !(await p.textContent('#structureStatus')).includes('찾는 중'), await p.textContent('#structureStatus'));
  await recv(p, { type: 'COMPONENT_CANDIDATES', nodes: COMP_NODES, reqId: late });
  await recv(p, { type: 'ERROR', message: '늦은 오류', op: 'SCAN_COMPONENT_CANDIDATES', reqId: late });
  await p.waitForTimeout(30);
  check('25 비운 뒤 늦게 온 찾기 응답은 그리지 않음 · 상태 줄에 "찾는 중" 없음', (await compRows(p)) === 0 && !(await p.textContent('#structureStatus')).includes('찾는 중'));
  check('25 비운 뒤 늦게 온 찾기 오류도 #structureStatus에 뜨지 않음', (await p.$$('#structureStatus .ux.danger')).length === 0);
  // 정리 줄 — 세트만 / 낱개 컴포넌트만
  await recv(p, { ...sel(1, 0), ids: ['w3'], comps: 0, sets: 1 });
  await p.waitForTimeout(20);
  check('25 세트만 선택 → [변형 세트로 묶기] 숨김 · [빠진 변형 채우기] 보임', !(await visible(p, '#btnClassifyVariants')) && (await visible(p, '#btnGenMissing')));
  await recv(p, { ...sel(1, 0), ids: ['w3'], comps: 2, sets: 0 });
  await p.waitForTimeout(20);
  check('25 낱개 컴포넌트만 선택 → [빠진 변형 채우기] 숨김 · [변형 세트로 묶기] 보임', (await visible(p, '#btnClassifyVariants')) && !(await visible(p, '#btnGenMissing')));
  // 툴팁(C-D3 · UW-D4)
  const tip = await p.getAttribute('#btnRegisterComp', 'data-tip');
  check('25 [등록] 툴팁 — "마스터" 없음 · "메인 컴포넌트" 있음', !tip.includes('마스터') && tip.includes('메인 컴포넌트'), tip);
  // 기준 없음 → 찾기 버튼 잠금 · 사유 · 포커스 ←
  await p.focus('#btnScanComp');
  await recv(p, { ...sel(0, 0), count: 0, ids: [] });
  await p.waitForTimeout(40);
  check('25 기준 없음 → 찾기 버튼 잠금 · 주 버튼 없음 · 포커스 ←', (await locked(p, '#btnScanComp')) && (await shownPrimaries(p, '#structureCard')).length === 0 && (await activeId(p)) === 'btnSubBack', JSON.stringify({ prim: await shownPrimaries(p, '#structureCard'), a: await activeId(p) }));
  check('25 기준 없음 → 사유 "선택이 없어요 — 캔버스에서 레이어를 선택하세요" · 목록 자리 sel.noneHere', (await lockMsg(p, '#btnScanComp')) === '선택이 없어요 — 캔버스에서 레이어를 선택하세요' && (await p.textContent('#compTree')).includes('선택이 없어요'));
  const bad = await nestedCards(p);
  check('25 카드 안 카드 0 — 컴포넌트 화면', bad.length === 0, bad.join(' · '));
  check('25 콘솔 오류 없음', pageErrors.length === 0, pageErrors.join(' | '));
  await p.close();
}
{
  // 다른 화면 쓰기(연결) 뒤 후보 목록 비움 · #variantReport는 남음
  const p = await open(560, 'select');
  await recv(p, { type: 'LICENSE_STATUS', tier: 'paid', unlimited: true, source: 'dev' });
  await openSel(p);
  const a = await sent(p, 'APPLY');
  await recv(p, { ...preview(a[0].reqId), candidates: B2_CANDS });
  await recv(p, tsPrev(a[0].reqId, B2_TS));
  await goSub(p, 'structure');
  await p.waitForTimeout(40);
  await fillBoth(p);
  await recv(p, { type: 'VARIANTS_RESULT', sets: 1, missing: ['Size=L'], singles: [], failures: [] });
  await p.click('#btnSubBack');
  await p.click('[data-k="link"]');
  await p.waitForTimeout(40);
  await p.click('#btnApplyConfirm');
  const req = (await sent(p, 'APPLY_SELECTED')).at(-1);
  await recv(p, { type: 'APPLY_RESULT', bound: 4, skipped: 0, reasons: {}, skips: [], reqId: req.reqId, textStylesApplied: 0, textStylesSkipped: 0 });
  await p.waitForTimeout(80);
  check('25 다른 화면 쓰기(연결) 뒤 → 후보 목록 비움', (await compRows(p)) === 0);
  check('25 #variantReport는 다른 화면 쓰기 뒤에도 남음', (await p.$$eval('#variantReport .r-card', (e) => e.length)) >= 1);
  await p.close();
}
{
  // C-D14 — 컴포넌트 카드: 오류 상자의 [다시 시도]가 유일한 주 버튼 · 찾기 [다시 시도]
  const p = await compScreen();
  await compFound(p, COMP_NODES);
  await p.waitForTimeout(30);
  check('25 (준비) 주 버튼 [등록]', JSON.stringify(await shownPrimaries(p, '#structureCard')) === '["btnRegisterComp"]');
  await p.click('#btnScanComp');
  const s1 = await lastReq(p, 'SCAN_COMPONENT_CANDIDATES');
  await recv(p, { type: 'ERROR', message: '찾기 실패', op: 'SCAN_COMPONENT_CANDIDATES', reqId: s1 });
  await p.waitForTimeout(30);
  check('25 [컴포넌트 후보 찾기] 오류 → #structureStatus 빨강 띠 · 주 버튼은 [다시 시도] 하나', (await p.$$('#structureStatus .ux.danger')).length === 1 && JSON.stringify(await shownPrimaries(p, '#structureCard')) === '["retry"]', JSON.stringify(await shownPrimaries(p, '#structureCard')));
  check('25 숨은 색 카드 #colorStatus에 오류 없음', (await p.$$('#colorStatus .ux.danger')).length === 0);
  await p.click('#compAll');
  await p.waitForTimeout(20);
  check('25 오류 동안 체크를 바꿔도 주 버튼은 [다시 시도] 하나 · 상자 그대로', JSON.stringify(await shownPrimaries(p, '#structureCard')) === '["retry"]' && (await p.$$('#structureStatus .ux.danger')).length === 1);
  await p.click('#structureStatus .retry-btn');
  await p.waitForTimeout(20);
  const s2 = await lastReq(p, 'SCAN_COMPONENT_CANDIDATES');
  check('25 찾기 [다시 시도] → 상자 바로 사라짐 · "…찾는 중…" · 포커스 [컴포넌트 후보 찾기] · 새 reqId · 목록 기준', (await p.$$('#structureStatus .ux.danger')).length === 0 && (await p.textContent('#structureStatus')) === '컴포넌트 후보를 찾는 중…' && (await activeId(p)) === 'btnScanComp' && s2 !== s1 && JSON.stringify((await sent(p, 'SCAN_COMPONENT_CANDIDATES')).at(-1).nodeIds) === '["w1"]', JSON.stringify({ a: await activeId(p), s1, s2 }));
  await recv(p, { type: 'COMPONENT_CANDIDATES', nodes: COMP_NODES, reqId: s2 });
  await p.waitForTimeout(30);
  check('25 다시 찾은 응답이 그려짐', (await compRows(p)) === 2);
  // [등록] 오류 → 다른 결과로 상자가 사라지면 판정 주 버튼 · 포커스도
  await p.click('#btnRegisterComp');
  await recv(p, { type: 'ERROR', message: '등록 실패', op: 'REGISTER_COMPONENTS' });
  await p.waitForTimeout(30);
  check('25 [등록] 오류 → 주 버튼 [다시 시도] 하나', JSON.stringify(await shownPrimaries(p, '#structureCard')) === '["retry"]', JSON.stringify(await shownPrimaries(p, '#structureCard')));
  await p.focus('#structureStatus .retry-btn');
  await p.click('#btnScanComp');
  await p.waitForTimeout(20);
  check('25 다른 결과로 상태 글이 바뀌면 상자가 사라지고 주 버튼은 판정 버튼 하나', (await p.$$('#structureStatus .ux.danger')).length === 0 && (await shownPrimaries(p, '#structureCard')).length === 1 && !(await shownPrimaries(p, '#structureCard')).includes('retry'), JSON.stringify(await shownPrimaries(p, '#structureCard')));
  await recv(p, { type: 'COMPONENT_CANDIDATES', nodes: COMP_NODES, reqId: await lastReq(p, 'SCAN_COMPONENT_CANDIDATES') });
  await p.click('#btnRegisterComp');
  await recv(p, { type: 'ERROR', message: '등록 실패', op: 'REGISTER_COMPONENTS' });
  await p.waitForTimeout(20);
  await p.focus('#structureStatus .retry-btn');
  await recv(p, { type: 'VARIANTS_RESULT', sets: 1, missing: [], singles: [], failures: [] });
  await p.waitForTimeout(30);
  const judged = await shownPrimaries(p, '#structureCard');
  check('25 상자가 사라질 때 포커스가 [다시 시도]에 있었으면 판정 주 버튼으로', judged.length === 1 && (await activeId(p)) === judged[0], JSON.stringify({ judged, a: await activeId(p) }));
  // 다시 할 수 없는 오류 → 원래 주 버튼 그대로
  await recv(p, { type: 'ERROR', message: 'read-only document', op: 'REGISTER_COMPONENTS' });
  await p.waitForTimeout(20);
  check('25 다시 할 수 없는 오류(버튼 없음) → 원래 주 버튼 그대로', (await p.$$('#structureStatus .retry-btn')).length === 0 && JSON.stringify(await shownPrimaries(p, '#structureCard')) === JSON.stringify(judged), JSON.stringify(await shownPrimaries(p, '#structureCard')));
  // 오류 상자가 뜬 채 기준이 바뀌면 상자 지움 · 판정 주 버튼
  await p.click('#btnScanComp');
  await recv(p, { type: 'ERROR', message: '찾기 실패', op: 'SCAN_COMPONENT_CANDIDATES', reqId: await lastReq(p, 'SCAN_COMPONENT_CANDIDATES') });
  await p.waitForTimeout(20);
  check('25 (준비) 후보 찾기 오류 → [다시 시도]', JSON.stringify(await shownPrimaries(p, '#structureCard')) === '["retry"]');
  await recv(p, { ...sel(1, 0), ids: ['w9'] });
  await p.waitForTimeout(30);
  check('25 오류 상자가 뜬 채 기준이 바뀜 → 상자 지움 · 주 버튼 [컴포넌트 후보 찾기]', (await p.$$('#structureStatus .ux.danger')).length === 0 && JSON.stringify(await shownPrimaries(p, '#structureCard')) === '["btnScanComp"]', JSON.stringify(await shownPrimaries(p, '#structureCard')));
  await p.close();
}
{
  // C-D14 — 연결 실패: 아래 고정 [{o}곳 연결]은 보조, 다시 연결 결과 뒤 되돌아옴
  const p = await open(560, 'select');
  await recv(p, { type: 'LICENSE_STATUS', tier: 'paid', unlimited: true, source: 'dev' });
  await openSel(p);
  const a = await sent(p, 'APPLY');
  await recv(p, { ...preview(a[0].reqId), candidates: B2_CANDS });
  await recv(p, tsPrev(a[0].reqId, B2_TS));
  await p.click('[data-k="link"]');
  await p.waitForTimeout(40);
  await p.click('#btnApplyConfirm');
  await recv(p, { type: 'ERROR', message: '연결 실패', op: 'APPLY_SELECTED' });
  await p.waitForTimeout(40);
  check('25 연결 실패 → #btnApplyConfirm에 primary 없음 · 주 버튼은 [다시 시도] 하나', !(await p.$eval('#btnApplyConfirm', (e) => e.classList.contains('primary'))) && JSON.stringify(await shownPrimaries(p, '#applyStatus')) === '["retry"]', JSON.stringify(await shownPrimaries(p, '#tab-select')));
  await p.click('#applyStatus .retry-btn');
  const req = (await sent(p, 'APPLY_SELECTED')).at(-1);
  await recv(p, { type: 'APPLY_RESULT', bound: 4, skipped: 0, reasons: {}, skips: [], reqId: req.reqId, textStylesApplied: 0, textStylesSkipped: 0 });
  await p.waitForTimeout(80);
  check('25 다시 연결 결과 뒤 → #btnApplyConfirm primary 되돌아옴', await p.$eval('#btnApplyConfirm', (e) => e.classList.contains('primary')));
  await p.close();
}
{
  // C-D14 — 라이선스 카드 · 내보내기 팝업(주 버튼 하나)
  const p = await open(560, 'variables');
  await recv(p, PREREQ);
  await recv(p, { type: 'VAR_TABLE', collections: COLS, vars: VARS });
  await p.click('#btnSettings');
  await p.waitForTimeout(40);
  // B.21 뒤 [결제 · 구독 관리]는 늘 보이고 배포 전에는 잠겨 있다 — 오류 길만 보려고 잠금을 잠시 푼다(링크 준비 뒤 모습)
  await p.evaluate(() => { const b = document.getElementById('btnLicenseLink'); b.removeAttribute('aria-disabled'); delete b.dataset.lock; delete b.dataset.baseLock; });
  await p.click('#btnLicenseLink');
  await recv(p, { type: 'ERROR', message: '열지 못했어요', op: 'OPEN_LICENSE_LINK' });
  await p.waitForTimeout(30);
  const licCard = await p.$eval('#licenseStatus', (e) => e.closest('.step')?.id || '');
  const licPrim = await p.$eval('#licenseStatus', (e) => Array.from(e.closest('.step').querySelectorAll('button.primary')).filter((x) => x.getClientRects().length).map((x) => (x.classList.contains('retry-btn') ? 'retry' : x.id)));
  check('25 라이선스 오류 → 그 카드의 주 버튼은 [다시 시도] 하나(결제 · 구독 관리는 보조)', JSON.stringify(licPrim) === '["retry"]', JSON.stringify({ licCard, licPrim }));
  await p.click('#btnSettings');
  await p.click('#tabbtn-variables');
  await p.waitForTimeout(200);
  await p.click('#btnVarMore');
  await p.click('.ctx-menu button >> text=코드로 내보내기…');
  await p.waitForTimeout(40);
  check('25 내보내기 팝업 — 주 버튼은 [내보내기] 하나([닫기]는 보조)', JSON.stringify(await shownPrimaries(p, '.modal')) === '["btnExport"]', JSON.stringify(await shownPrimaries(p, '.modal')));
  await p.click('#btnExport');
  await recv(p, { type: 'ERROR', message: '내보내기 실패', op: 'EXPORT' });
  await p.waitForTimeout(30);
  check('25 내보내기 오류 → 팝업의 주 버튼은 [다시 시도] 하나', JSON.stringify(await shownPrimaries(p, '.modal')) === '["retry"]', JSON.stringify(await shownPrimaries(p, '.modal')));
  await p.click('.modal .m-foot button');
  await p.waitForTimeout(30);
  await p.click('#btnVarMore');
  await p.click('.ctx-menu button >> text=코드로 내보내기…');
  await p.waitForTimeout(40);
  check('25 닫았다 다시 열면 상자 없음 · [내보내기] 주 버튼', (await p.$$('.modal .ux.danger')).length === 0 && JSON.stringify(await shownPrimaries(p, '.modal')) === '["btnExport"]', JSON.stringify(await shownPrimaries(p, '.modal')));
  await p.close();
}
{
  // 이름 다시 짓기 오류(APPLY_TS_RENAME) → 팝업 안 알림 줄(B.19 오류 갈래 · T-P29 ④)
  const p = await open(560, 'variables');
  await recv(p, { type: 'LICENSE_STATUS', tier: 'paid', unlimited: true, source: 'dev' });
  await recv(p, { ...PREREQ, hasTextStyles: true });
  await recv(p, { type: 'VAR_TABLE', collections: COLS, vars: VARS });
  await p.waitForTimeout(200);
  const openTsr = async () => { await p.click('#btnVarMore'); await p.click('.ctx-menu button >> text=텍스트 스타일 이름 다시 짓기…'); await p.waitForTimeout(30); };
  await openTsr();
  const sr = (await sent(p, 'SCAN_TS_RENAME')).at(-1);
  const rows = [{ id: 's1', from: 'body', to: 'body/large', sig: 'a' }, { id: 's2', from: 'h1', to: 'heading/xlarge', sig: 'b' }];
  await recv(p, { type: 'TS_RENAME_PLAN', reqId: sr.reqId, rows });
  await p.waitForTimeout(30);
  const applyBtn = p.locator('.modal button', { hasText: '이름 바꾸기' });
  await applyBtn.click();
  const a1 = (await sent(p, 'APPLY_TS_RENAME')).at(-1);
  await recv(p, { type: 'ERROR', message: '바꾸지 못했어요', op: 'APPLY_TS_RENAME', reqId: a1.reqId });
  await p.waitForTimeout(30);
  const pos = await p.$eval('.modal .tsr-note', (e) => ({ shown: !e.hidden && !!e.querySelector('.ux.danger'), next: e.nextElementSibling?.className ?? '', inBody: !!e.closest('.tsr-body') }));
  check('25 이름 다시 짓기 오류 → 팝업 안 알림 줄(.tsr-body 밖 · 버튼 줄 바로 위)', pos.shown && pos.next === 'm-foot' && !pos.inBody, JSON.stringify(pos));
  check('25 [k개 이름 바꾸기] 다시 누를 수 있음(tsrBusy 풀림) · 팝업 primary는 [다시 시도] 하나', (await applyBtn.getAttribute('aria-disabled')) !== 'true' && JSON.stringify(await shownPrimaries(p, '.modal')) === '["retry"]', JSON.stringify(await shownPrimaries(p, '.modal')));
  check('25 이름 다시 짓기 오류 — 숨은 #colorStatus에 오류 없음', (await p.$$('#colorStatus .ux.danger')).length === 0);
  await p.click('.modal .bv-switch[data-id="s2"]');
  await p.waitForTimeout(20);
  check('25 스위치를 바꿔도 상자 그대로', (await p.$$('.modal .tsr-note .ux.danger')).length === 1);
  await p.click('.modal .tsr-note .retry-btn');
  await p.waitForTimeout(20);
  const a2 = (await sent(p, 'APPLY_TS_RENAME')).at(-1);
  check('25 [다시 시도] → 새 reqId · 켠 줄만 · 상자 사라짐 · 포커스 [닫기]', a2.reqId !== a1.reqId && JSON.stringify(a2.items.map((i) => i.id)) === '["s1"]' && (await p.$$('.modal .tsr-note .ux.danger')).length === 0 && (await p.evaluate(() => document.activeElement?.textContent)) === '닫기', JSON.stringify({ a2, f: await p.evaluate(() => document.activeElement?.textContent) }));
  await recv(p, { type: 'ERROR', message: '바꾸지 못했어요', op: 'APPLY_TS_RENAME', reqId: a2.reqId });
  await p.waitForTimeout(20);
  await p.click('.modal [data-all="off"]');
  const n0 = (await sent(p, 'APPLY_TS_RENAME')).length;
  await p.click('.modal .tsr-note .retry-btn');
  await p.waitForTimeout(20);
  check('25 켠 줄을 모두 끄고 [다시 시도] → 보내지 않음 · 상자 · 포커스 그대로', (await sent(p, 'APPLY_TS_RENAME')).length === n0 && (await p.$$('.modal .tsr-note .ux.danger')).length === 1 && (await activeId(p)) === 'retry');
  await p.click('.modal .m-foot button >> text=닫기');
  await p.waitForTimeout(20);
  await openTsr();
  check('25 닫았다 다시 열면 상자 없음', (await p.$$('.modal .tsr-note .ux.danger')).length === 0);
  await p.close();
}
{
  // 오류 자리 폴백 — 이름 정리 [이름 바꾸기] · 변수 탭 레이어 선택
  const p = await open(560, 'select');
  await recv(p, PREREQ);
  await recv(p, { ...sel(1, 0), ids: ['r0'], firstName: 'Product card' });
  await p.click('#btnGoRename');
  await p.waitForTimeout(30);
  const rq = (await sent(p, 'RENAME')).at(-1);
  await recv(p, { type: 'RENAME_RESULT', reqId: rq.reqId, applied: false, changes: [], nodes: [
    { id: 'r0', name: 'Product card', type: 'FRAME', depth: 0, parentId: null, keep: 'root' },
    { id: 'a', name: 'Frame 12', type: 'FRAME', depth: 1, parentId: 'r0', after: 'card-header', role: 'card-header' },
  ] });
  await p.waitForTimeout(30);
  await p.click('#btnRename');
  const ra = (await sent(p, 'RENAME_APPLY')).at(-1);
  await recv(p, { type: 'ERROR', message: '이름 바꾸기 실패', op: 'RENAME_APPLY', reqId: ra.reqId });
  await p.waitForTimeout(30);
  check('25 이름 정리 [이름 바꾸기] 오류 → #renameStatus · 주 버튼 [다시 시도] 하나', (await p.$$('#renameStatus .ux.danger')).length === 1 && (await p.$$('#colorStatus .ux.danger')).length === 0 && (await p.$eval('#renameStatus', (e) => Array.from(e.closest('.step').querySelectorAll('button.primary')).filter((x) => x.getClientRects().length).map((x) => (x.classList.contains('retry-btn') ? 'retry' : x.id)).join(','))) === 'retry');
  await p.close();
}
{
  const p = await open(560, 'variables');
  await recv(p, PREREQ);
  await recv(p, { type: 'VAR_TABLE', collections: COLS, vars: VARS });
  await recv(p, sel(1, 0));
  await p.waitForTimeout(300);
  await p.click('#varSide [data-key="side:col:s"]');
  await p.focus('.vt-row[data-id="tx"]');
  await p.keyboard.press('Enter');
  const fq = (await sent(p, 'FIND_VAR_USERS')).at(-1);
  await recv(p, { type: 'VAR_USERS', reqId: fq.reqId, layers: [{ id: 'n1', name: 'Title' }], totalLayers: 1, places: 1 });
  await p.click('.modal .var-use');
  const errs0 = pageErrors.length;
  await recv(p, { type: 'ERROR', message: '선택 실패', op: 'SELECT_NODES' });
  await p.waitForTimeout(30);
  check('25 변수 탭 레이어 선택 오류 → 공통 상태 줄 · 콘솔 오류 없음', (await p.textContent('#statusText')) === '선택 실패' && pageErrors.length === errs0, JSON.stringify({ t: await p.textContent('#statusText'), e: pageErrors.slice(errs0) }));
  await p.close();
}
{
  // 만들기 화면 실행(마법사)이 보낸 요청의 오류는 카드에 띄우지 않음
  const p = await open(560, 'select');
  await recv(p, { type: 'LICENSE_STATUS', tier: 'paid', unlimited: true, source: 'dev' });
  await recv(p, { ...PREREQ, hasBindable: true, tierVars: 3, otherVars: 0 });
  await recv(p, { ...sel(1, 0), ids: ['w2'] });
  await goSub(p, 'make');
  await p.waitForTimeout(30);
  const ex = (await sent(p, 'EXTRACT')).at(-1);
  await recv(p, { type: 'EXTRACT_RESULT', reqId: ex.reqId, warnings: [], selection: 1, tokens: [{ name: 'spacing/16', category: 'gap', value: 16, sources: ['itemSpacing'], count: 1 }] });
  await recv(p, { type: 'TEXT_STYLE_CANDIDATES', reqId: (await sent(p, 'SCAN_TEXT_STYLES')).at(-1).reqId, warnings: [], existing: [], styles: [] });
  await p.waitForTimeout(30);
  await recv(p, { type: 'CREATE_RESULT', reqId: (await sent(p, 'CREATE_TOKENS')).at(-1).reqId, preview: true, created: 1, updated: 0, summary: '', roles: 0, skippedManual: 0, tokenStates: { 'spacing/16': { state: 'new' } }, roleRows: [] });
  await p.waitForTimeout(30);
  const before = await p.evaluate(() => Array.from(document.querySelectorAll('#colorCard button.primary, #createCard button.primary')).map((b) => b.id).join(','));
  await p.click('#btnMakeRun');
  await p.waitForTimeout(30);
  const cr = (await sent(p, 'CREATE_TOKENS')).filter((m) => !m.preview).at(-1);
  await recv(p, { type: 'ERROR', message: '만들기 실패', op: 'CREATE_TOKENS', reqId: cr.reqId });
  await p.waitForTimeout(80);
  const res = await p.$$eval('#makeResults .tr-head', (e) => e.map((x) => x.textContent));
  const after = await p.evaluate(() => Array.from(document.querySelectorAll('#colorCard button.primary, #createCard button.primary')).map((b) => b.id).join(','));
  check('25 마법사 단계 오류 → 만들기 화면 결과에 실패 · 카드 상태 자리에 오류 상자 없음 · 카드 primary 그대로', (await visible(p, '#makeResults')) && res.length > 0 && (await p.$$('.status .ux.danger')).length === 0 && before === after, JSON.stringify({ res, before, after }));
  await p.close();
}

{
  // 이름 없는 레이어 안내(C-D15 — ia-v4 §4.5 · ia-v3 A.15 "실기 확인 뒤 더함")
  const p = await compScreen();
  const scanWith = async (nodes, autoNamed) => { await p.click('#btnScanComp'); await recv(p, { type: 'COMPONENT_CANDIDATES', nodes, autoNamed, reqId: await lastReq(p, 'SCAN_COMPONENT_CANDIDATES') }); await p.waitForTimeout(40); };
  const line = () => p.$eval('#compAutoNamed', (e) => (e.hidden || !e.getClientRects().length ? null : e.textContent));
  await scanWith(COMP_NODES, 2);
  check('25 찾기 응답 autoNamed 2 → 후보 목록 아래 안내 줄 "이름 없는 레이어 2개 — …"', (await line()) === '이름 없는 레이어 2개 — ‘이름 정리’를 먼저 하면 후보가 돼요' && (await p.$eval('#compAutoNamed', (e) => e.previousElementSibling?.id)) === 'compTree', String(await line()));
  const look = await p.$eval('#compAutoNamed', (e) => { const c = getComputedStyle(e); return { bw: c.borderTopWidth, bg: c.backgroundColor }; });
  check('25 안내 줄 = 글 한 줄(테두리 · 배경 없음)', look.bw === '0px' && look.bg === 'rgba(0, 0, 0, 0)', JSON.stringify(look));
  await p.screenshot({ path: process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/cd15.png` : '/dev/null' }).catch(() => {});
  await scanWith(COMP_NODES, 0);
  check('25 autoNamed 0 → 안내 줄 없음', (await line()) === null);
  await scanWith([], 3);
  check('25 후보 0 + autoNamed 3 → component.noEligible 경고 + 안내 줄 · [등록] 사유 "등록할 수 있는 프레임이 없어요"', (await p.textContent('#structureStatus')) === '선택 아래에 등록할 수 있는 프레임이 없어요.' && (await line()) === '이름 없는 레이어 3개 — ‘이름 정리’를 먼저 하면 후보가 돼요' && (await lockMsg(p, '#btnRegisterComp')) === '등록할 수 있는 프레임이 없어요');
  await recv(p, { ...sel(1, 0), ids: ['w7'] });
  await p.waitForTimeout(30);
  check('25 기준이 바뀌면 안내 줄도 지움', (await line()) === null);
  await p.close();
}

{
  // 26 라이선스 구매 버튼(IA v4 §4.10 · B.21) — 늘 보이고, 결제 링크가 자리표시자면 잠긴다. 글은 티어별.
  const p = await open(560, 'settings');
  await recv(p, { type: 'LICENSE_STATUS', tier: 'free', unlimited: false, source: 'none' });
  await p.waitForTimeout(30);
  const lk = () => p.evaluate(() => { const b = document.getElementById('btnLicenseLink'); const r = b.getBoundingClientRect(); return { text: b.textContent, title: b.title, dis: b.getAttribute('aria-disabled'), shown: r.width > 0 && r.height > 0 && getComputedStyle(document.getElementById('licenseLinkRow')).display !== 'none' }; });
  const f = await lk();
  const col = await p.evaluate(() => { const cs = getComputedStyle(document.getElementById('btnLicenseLink')); return { c: cs.color, b: cs.backgroundColor }; });
  check('26 잠긴 주 버튼 모양(B.23) — 글자 --muted · 바탕 --surface-2', col.c === 'rgb(146, 152, 161)' && col.b === 'rgb(244, 245, 246)', JSON.stringify(col));
  check('26 무료 · 자리표시자 → [유료 구매하기 ↗] 보임 · 잠김 · 툴팁 꼬리', f.shown && f.text === '유료 구매하기 ↗' && f.dis === 'true' && f.title === '결제 페이지를 열어요 — 구독 관리 페이지는 아직 준비 중이에요', JSON.stringify(f));
  await p.evaluate(() => { window.__sent.length = 0; });
  await p.click('#btnLicenseLink', { force: true });
  await p.waitForTimeout(30);
  check('26 잠긴 구매 버튼 누름 → 상태 줄 사유 · OPEN_LICENSE_LINK 안 보냄', (await p.textContent('#statusText')) === '구독 관리 페이지는 아직 준비 중이에요' && (await sent(p, 'OPEN_LICENSE_LINK')).length === 0, await p.textContent('#statusText'));
  await recv(p, { type: 'LICENSE_STATUS', tier: 'paid', unlimited: true, source: 'key', status: 'active' });
  await p.waitForTimeout(30);
  const pd = await lk();
  check('26 유료 → [구독 관리 ↗] · 툴팁 바뀜 · 잠금 그대로', pd.text === '구독 관리 ↗' && pd.dis === 'true' && pd.title === '결제 수단 · 기기 활성화를 관리하는 페이지를 열어요 — 구독 관리 페이지는 아직 준비 중이에요', JSON.stringify(pd));
  await recv(p, { type: 'LICENSE_STATUS', tier: 'free', unlimited: false, source: 'none' });
  await p.waitForTimeout(30);
  check('26 다시 무료 → [유료 구매하기 ↗]', (await lk()).text === '유료 구매하기 ↗');
  await p.close();
}

/* ---------- 27 안 쓰는 변수 찾기(docs/unused-vars.md) ---------- */
{
  const p = await open(560, 'variables');
  await recv(p, PREREQ);
  await recv(p, { type: 'VAR_TABLE', collections: COLS, vars: VARS });
  await p.click('#btnVarMore');
  const item = await p.$('.ctx-menu button:has-text("안 쓰는 변수 찾기")');
  check('27 ⋯ 메뉴에 "안 쓰는 변수 찾기…"', !!item);
  await item.click();
  await p.waitForTimeout(40);
  const scan = (await sent(p, 'SCAN_UNUSED_VARS')).at(-1);
  check('27 누르면 SCAN_UNUSED_VARS(reqId) · 팝업 · 처음 포커스 [취소]', typeof scan?.reqId === 'number' && (await p.$$('.modal')).length === 1 && (await p.evaluate(() => document.activeElement?.textContent)) === '취소');
  await recv(p, { type: 'PROGRESS', op: 'unused', done: 0, total: 0 });
  check('27 불러오는 중 띠(role=status)', (await p.textContent('.modal .unused-prog')).includes('페이지를 불러오는 중') && (await p.getAttribute('.modal .unused-prog', 'role')) === 'status');
  await recv(p, { type: 'PROGRESS', op: 'unused', done: 3, total: 12 });
  check('27 읽는 중 "3 / 12 페이지"', (await p.textContent('.modal .unused-prog')).includes('3 / 12 페이지'));
  await p.keyboard.press('Escape');
  await p.waitForTimeout(30);
  const cx = (await sent(p, 'CANCEL')).at(-1);
  check('27 읽는 중 Esc → CANCEL{op:"unused"} · 팝업 닫힘', cx?.op === 'unused' && (await p.$$('.modal')).length === 0);
  await p.click('#btnVarMore');
  await p.click('.ctx-menu button:has-text("안 쓰는 변수 찾기")');
  await p.waitForTimeout(40);
  const scan2 = (await sent(p, 'SCAN_UNUSED_VARS')).at(-1);
  await recv(p, { type: 'UNUSED_VARS', reqId: scan.reqId, items: [{ id: 'g0', kind: 'none' }], pages: 1, layers: 1 });
  check('27 지난 요청의 결과는 버림', (await p.$$('.modal .unused-tree')).length === 0);
  await recv(p, { type: 'UNUSED_VARS', reqId: scan2.reqId, items: [{ id: 'g0', kind: 'chain' }, { id: 'sp8', kind: 'none' }, { id: 'nope', kind: 'none' }], pages: 12, layers: 8240 });
  await p.waitForTimeout(40);
  check('27 결과 — 제목은 그린 줄 수(표에 없는 id 뺌) · 요약 · 주의 띠(주황)', (await p.textContent('.modal h3')) === '안 쓰는 변수 2개' && (await p.textContent('.modal .unused-sum')).includes('8,240') && (await p.textContent('.modal .banner.caution')) === '다른 파일에서 쓰는 변수는 확인하지 못해요', await p.textContent('.modal h3'));
  check('27 트리 — 머리 띠 · 처음 모두 끔', (await p.$$eval('.modal .unused-tree .tr-head', (e) => e.length)) === 1 && (await p.$$eval('.modal .unused-tree .tr-row .bv-switch', (e) => e.every((x) => x.getAttribute('aria-checked') === 'false'))));
  check('27 안 쓰는 변수 트리는 지금 모양 그대로(TR-D12) — .vlike 없음 · 머리 띠(.tr-group · --surface-2) · ▼/▶', await p.$$eval('.modal .unused-tree', (e) => e.length === 1 && !e[0].classList.contains('vlike') && [...e[0].querySelectorAll('.tr-head')].every((h) => h.classList.contains('tr-group') && getComputedStyle(h).backgroundColor === 'rgb(244, 245, 246)' && /[▼▶]/.test(h.querySelector('.tr-car').textContent))));
  check('27 chain 태그', (await p.$$eval('.modal .unused-tree .tr-tag', (e) => e.map((x) => x.textContent))).includes('안 쓰는 변수만 가리킴'));
  check('27 k = 0 → [선택한 0개 지우기] aria-disabled', (await p.getAttribute('.modal [data-unused="delete"]', 'aria-disabled')) === 'true');
  await p.click('.modal .unused-tree .tr-row .bv-switch');
  await p.waitForTimeout(30);
  check('27 하나 켜면 [선택한 1개 지우기] 풀림', (await p.textContent('.modal [data-unused="delete"]')) === '선택한 1개 지우기' && (await p.getAttribute('.modal [data-unused="delete"]', 'aria-disabled')) !== 'true');
  const badU = await nestedCards(p);
  check('27 카드 안 카드 0 — 안 쓰는 변수 팝업', badU.length === 0, badU.join(' · '));
  await p.click('.modal [data-unused="delete"]');
  await p.waitForTimeout(30);
  const del = (await sent(p, 'DELETE_VARIABLES')).at(-1);
  check('27 지우기 → DELETE_VARIABLES(켠 id) · 확인하는 중 잠금', del?.ids?.length === 1 && (await p.textContent('.modal .unused-prog')).includes('확인하는 중') && (await p.$$eval('.modal .unused-tree .bv-switch', (e) => e.every((x) => x.getAttribute('aria-disabled') === 'true'))));
  await recv(p, { type: 'VARIABLES_DELETED', reqId: del.reqId, deleted: 1, skipped: 1, failed: 0 });
  await p.waitForTimeout(40);
  check('27 지운 뒤 팝업 닫힘 · 상태 줄 문구', (await p.$$('.modal')).length === 0 && (await p.textContent('#statusText')) === '변수 1개를 지웠어요 · ⌘Z로 되돌리기 · 건너뜀 1', await p.textContent('#statusText'));
  await p.close();
}

{
  // 28e 브랜드 팔레트 무료(ia-v4 §4.3a · A.18 4) — 무료에서 [팔레트 생성] · [팔레트 만들기] 열림, [색 변수 만들기]는 Global만
  const p = await open(560, 'select');
  await recv(p, { type: 'LICENSE_STATUS', tier: 'free', unlimited: false, source: 'dev' });
  await recv(p, PREREQ);
  await recv(p, { type: 'VAR_TABLE', collections: COLS, vars: VARS });
  await recv(p, { ...sel(1, 0), scanned: 40, ids: ['k1'] });
  await goSub(p, 'pick');
  await p.waitForTimeout(40);
  check('28e 무료 — [팔레트 생성] · [팔레트 만들기] aria-disabled 없음 · 🔒 빈 글',
    (await p.getAttribute('#btnPalette', 'aria-disabled')) !== 'true' && (await p.getAttribute('#btnPaletteRun', 'aria-disabled')) !== 'true' && (await p.textContent('#paletteBtnLock')) === '');
  await p.click('#btnPalette');
  check('28e [팔레트 생성] → 띠 열림', await visible(p, '#paletteBand'));
  await p.click('#btnPaletteRun');
  await p.waitForTimeout(80);
  check('28e [팔레트 만들기] → 색 목록', (await p.$$eval('#colorTable .r-card', (e) => e.length)) > 10);
  await p.click('#btnColorVars');
  const cr = (await sent(p, 'CREATE_TOKENS')).at(-1);
  check('28e [색 변수 만들기] → CREATE_TOKENS{globalOnly · replacePalette}', cr?.globalOnly === true && cr.replacePalette === true && !cr.preview, JSON.stringify(cr && { g: cr.globalOnly, r: cr.replacePalette }));
  await recv(p, { type: 'CREATE_RESULT', created: 10, updated: 0, summary: 'Global 10개', roles: 0 });
  await p.waitForTimeout(40);
  check('28e 그 뒤 CREATE_SEMANTICS 없음', (await sent(p, 'CREATE_SEMANTICS')).length === 0);
  await p.close();
}

{
  // 28f 소수 크기 흐린 줄(ia-v4 §4.3 "소수 크기 줄" · A.18 3) — 만들기 화면 Text Style 탭
  const S24 = { name: 'heading/medium', fontSize: 24, lineHeight: 36, letterSpacing: 0, family: 'Inter', style: 'Bold', count: 3, nodeIds: ['t1'] };
  const D2667 = { fontSize: 26.67, lineHeight: 36, lineHeightPercent: 0, letterSpacing: 0, letterSpacingPercent: 0, family: 'Inter', style: 'SemiBold', count: 4, uiCount: 0, sample: 'Title', styleIds: [], nodeIds: ['t2'] };
  const openMake = async (styles) => {
    const p = await open(560, 'select');
    await recv(p, { type: 'LICENSE_STATUS', tier: 'paid', unlimited: true, source: 'dev' });
    await recv(p, { ...PREREQ, hasBindable: true, tierVars: 3, otherVars: 0 });
    await recv(p, { type: 'VAR_TABLE', collections: COLS, vars: VARS });
    await recv(p, { ...sel(1, 0), ids: ['w1'], firstName: 'Card' });
    await goSub(p, 'make');
    await p.waitForTimeout(50);
    const ex = (await sent(p, 'EXTRACT')).at(-1);
    const sc = (await sent(p, 'SCAN_TEXT_STYLES')).at(-1);
    await recv(p, { type: 'EXTRACT_RESULT', reqId: ex.reqId, warnings: [], selection: 1, tokens: [{ name: 'spacing/16', category: 'gap', value: 16, sources: ['itemSpacing'], count: 4 }] });
    await p.waitForTimeout(40);
    const pv = (await sent(p, 'CREATE_TOKENS')).at(-1);
    await recv(p, { type: 'CREATE_RESULT', reqId: pv.reqId, preview: true, created: 1, updated: 0, summary: '', roles: 0, skippedManual: 0, tokenStates: { 'spacing/16': { state: 'new' } }, roleRows: [] });
    await recv(p, { type: 'TEXT_STYLE_CANDIDATES', reqId: sc.reqId, warnings: [], existing: [], styles, decimalRows: [D2667] });
    await p.waitForTimeout(50);
    return p;
  };
  {
    const p = await openMake([S24]);
    check('28f 탭 수 — Text Style 1(흐린 줄은 세지 않음)', (await tabsOf(p)).includes('Text Style1'), JSON.stringify(await tabsOf(p)));
    await p.click('#makeTab-ts');
    await p.waitForTimeout(30);
    const rows = await p.$$eval('#makeTree .tr-row', (e) => e.map((r) => ({ k: r.dataset.tkey, dec: r.classList.contains('ts-decimal'), sw: !!r.querySelector('.bv-switch'), txt: r.textContent, aria: r.getAttribute('aria-label'), col: getComputedStyle(r.querySelector('.ts-aa')).color })));
    check('28f Text Style 탭 줄 2개 — 26.67 흐린 줄이 크기 순서 제자리(먼저) · 스위치 없음 · 오른쪽 글',
      rows.length === 2 && rows[0].dec && !rows[0].sw && rows[0].txt.includes('글자 크기가 소수라 만들지 않아요') && rows[0].txt.includes('26.67') && rows[0].txt.includes('Layer 4') && !rows[1].dec && rows[1].sw, JSON.stringify(rows));
    check('28f 흐린 줄 — Aa · 글 --muted · 접근성 이름 = 값 요약 + 사유', rows[0].col === 'rgb(146, 152, 161)' && rows[0].aria === 'Inter · 26.67 / 36px / 0 · SemiBold · 글자 크기가 소수라 만들지 않아요', JSON.stringify(rows[0]));
    check('28f 아래 줄 · 실행 수는 스타일 1개', (await p.textContent('#makeCount')).includes('스타일 1개'), await p.textContent('#makeCount'));
    // 키보드 — 화살표가 흐린 줄에도 멈추고 Enter · Space는 아무 일 없음
    await p.focus('#makeTree .tr-row[data-tkey^="t:"]');
    await p.keyboard.press('ArrowUp');
    await p.waitForTimeout(20);
    const onDec = await p.evaluate(() => document.activeElement?.closest?.('.tr-row')?.classList.contains('ts-decimal') ?? document.activeElement?.classList.contains('ts-decimal'));
    await p.keyboard.press('Enter');
    await p.keyboard.press(' ');
    await p.waitForTimeout(20);
    check('28f 화살표가 흐린 줄에 멈춤 · Enter · Space 아무 일 없음(고치기 칸 없음 · 줄 그대로)', onDec && (await p.$$eval('#makeTree input.tr-edit', (e) => e.length)) === 0 && (await p.$$eval('#makeTree .tr-row', (e) => e.length)) === 2);
    const bad = await nestedCards(p);
    check('28f 카드 안 카드 0 — Text Style 탭', bad.length === 0, bad.join(' · '));
    await p.close();
  }
  {
    // 소수 크기만 — 탭 수 0 · 빈 상태 없음 · 모두 켜기 · 끄기 없음
    const p = await openMake([]);
    check('28g 만들기 화면 소수 크기만 — Text Style 탭 수 0', (await tabsOf(p)).includes('Text Style0'), JSON.stringify(await tabsOf(p)));
    await p.click('#makeTab-ts');
    await p.waitForTimeout(30);
    check('28g Text Style 탭(소수 크기만) — 흐린 줄 하나 · 빈 상태 없음 · 모두 켜기 · 끄기 없음', (await p.$$eval('#makeTree .tr-row.ts-decimal', (e) => e.length)) === 1 && !(await visible(p, '#makeEmpty')) && !(await visible(p, '#makeAllOn')) && !(await visible(p, '#makeAllOff')));
    await p.close();
  }
}
{
  // 28f · 28g 값을 직접 고르기 › 타이포 #tsList 흐린 카드 · [등록] 0개 잠금
  const D2667 = { fontSize: 26.67, lineHeight: 36, lineHeightPercent: 0, letterSpacing: 0, letterSpacingPercent: 0, family: 'Inter', style: 'SemiBold', count: 4, uiCount: 0, sample: 'Title', styleIds: [], nodeIds: ['t2'] };
  const openTs = async () => {
    const p = await open(560, 'variables');
    await recv(p, { type: 'LICENSE_STATUS', tier: 'paid', unlimited: true, source: 'dev' });
    await recv(p, { ...PREREQ, hasTextStyles: true });
    await recv(p, { type: 'VAR_TABLE', collections: COLS, vars: VARS });
    await p.click('#btnAddVar');
    await p.click('.ctx-menu button >> text=텍스트 스타일 만들기…');
    await p.waitForTimeout(40);
    return p;
  };
  {
    const p = await openTs();
    const sc = (await sent(p, 'SCAN_TEXT_STYLES')).at(-1);
    await recv(p, { type: 'TEXT_STYLE_CANDIDATES', ...(sc?.reqId != null ? { reqId: sc.reqId } : {}), warnings: [], existing: [], decimalRows: [D2667], styles: [
      { name: 'heading/large', fontSize: 32, lineHeight: 40, letterSpacing: 0, family: 'Inter', style: 'Bold', count: 3, nodeIds: ['t1'] },
      { name: 'body/medium', fontSize: 16, lineHeight: 24, letterSpacing: 0, family: 'Inter', style: 'Regular', count: 12, nodeIds: ['t3'] },
    ] });
    await p.waitForTimeout(60);
    const cards = await p.$$eval('#tsList .r-card', (e) => e.map((c) => ({ dec: c.classList.contains('ts-decimal'), inputs: c.querySelectorAll('input').length, del: c.querySelectorAll('.link').length, title: c.querySelector('.r-title')?.textContent, col: getComputedStyle(c.querySelector('.r-title')).color })));
    check('28f #tsList — 흐린 카드가 크기 순서 제자리(가운데) · 이름 입력 · [삭제] 없음 · 회색 사유',
      cards.length === 3 && cards[1].dec && cards[1].inputs === 0 && cards[1].del === 0 && cards[1].title === '글자 크기가 소수라 만들지 않아요' && cards[1].col === 'rgb(146, 152, 161)' && !cards[0].dec && !cards[2].dec, JSON.stringify(cards));
    check('28f #tsStatus 수 — 신규 2(흐린 줄은 세지 않음)', (await p.textContent('#tsStatus')).startsWith('신규 2'), await p.textContent('#tsStatus'));
    check('28f [등록] 잠금 없음(만들 스타일 있음)', (await p.getAttribute('#btnTextStyles', 'aria-disabled')) !== 'true');
    // [왼쪽 글자로 이름 채우기] 뒤 — 응답의 decimalRows대로 다시 그림(빠진 줄은 없어짐)
    await p.click('#btnTsRowLabels');
    await recv(p, { type: 'TEXT_STYLE_CANDIDATES', warnings: [], labeled: 1, fallback: 1, decimalRows: [], styles: [
      { name: 'H1', fontSize: 32, lineHeight: 40, letterSpacing: 0, family: 'Inter', style: 'Bold', count: 3, nodeIds: ['t1'] },
      { name: 'body/medium', fontSize: 16, lineHeight: 24, letterSpacing: 0, family: 'Inter', style: 'Regular', count: 12, nodeIds: ['t3'] },
    ] });
    await p.waitForTimeout(60);
    check('28f 이름 채우기 뒤 — 응답에 없는 흐린 줄은 없어짐', (await p.$$eval('#tsList .r-card.ts-decimal', (e) => e.length)) === 0 && (await p.$$eval('#tsList .r-card', (e) => e.length)) === 2);
    await p.close();
  }
  {
    const p = await openTs();
    // 읽기 전에 누르면 지금처럼 needSpecs
    await p.click('#btnTextStyles', { force: true });
    await p.waitForTimeout(20);
    check('28g 읽기 전 [등록] — 잠금 없음 · needSpecs', (await p.getAttribute('#btnTextStyles', 'aria-disabled')) !== 'true' && (await p.textContent('#tsStatus')) === '먼저 ‘스캔’으로 스타일을 읽어 주세요', await p.textContent('#tsStatus'));
    const sc = (await sent(p, 'SCAN_TEXT_STYLES')).at(-1);
    await recv(p, { type: 'TEXT_STYLE_CANDIDATES', ...(sc?.reqId != null ? { reqId: sc.reqId } : {}), warnings: [], existing: [], styles: [], decimalRows: [D2667] });
    await p.waitForTimeout(60);
    check('28g 소수 크기만 — 램프로 가지 않음 · fallbackRamp 없음 · 흐린 카드 하나', (await p.$$eval('#tsList .r-card', (e) => e.length)) === 1 && (await p.$$eval('#tsList .r-card.ts-decimal', (e) => e.length)) === 1 && !(await p.textContent('#tsStatus')).includes('기본 램프'));
    check('28g [등록] aria-disabled', (await p.getAttribute('#btnTextStyles', 'aria-disabled')) === 'true');
    await p.click('#btnTextStyles', { force: true });
    await p.waitForTimeout(20);
    check('28g 누르면 상태 줄 "만들 수 있는 스타일이 없어요 — 글자 크기가 모두 소수예요" · CREATE_TEXT_STYLES 0', (await p.textContent('#statusText')) === '만들 수 있는 스타일이 없어요 — 글자 크기가 모두 소수예요' && (await count(p, 'CREATE_TEXT_STYLES')) === 0, await p.textContent('#statusText'));
    await p.close();
  }
}

{
  // 28a · 28b · 28c 인스턴스의 메인 컴포넌트(ia-v4 §4.1 · §4.2 · ia-v3 §2.11 11번 · A.18 1)
  const cm = (field, v, name, mainId, nodeId = 'n1') => ({ nodeId, field, currentValue: '8', variableId: v, variableName: name, tier: 2, ...(mainId ? { mainId } : {}) });
  const MAINS = [{ id: 'S', name: 'Traveler Card', page: 'Components' }, { id: 'M', name: 'Badge', page: 'Components' }];
  const CANDS = [cm('itemSpacing', 'vA', 'spacing/a', 'S', 'm1'), cm('paddingLeft', 'vB', 'spacing/b', 'M', 'm2'), cm('paddingTop', 'vC', 'spacing/c', undefined, 'n1')];
  const p = await open(560, 'select');
  await recv(p, { type: 'LICENSE_STATUS', tier: 'paid', unlimited: true, source: 'dev' });
  await openSel(p);
  await found(p, { candidates: CANDS, mains: MAINS, reasons: {}, counts: {} });
  await p.waitForTimeout(40);
  const line = await p.evaluate(() => { const e = [...document.querySelectorAll('#selCards .s.mains')][0]; if (!e) return null; const cs = getComputedStyle(e); const sp = e.querySelector('span'); return { text: e.textContent, tip: sp?.title, bw: cs.borderTopWidth, r: cs.borderTopLeftRadius, bg: cs.backgroundColor, below: e.getBoundingClientRect().top >= e.previousElementSibling.getBoundingClientRect().bottom - 1 }; });
  check('28a 카드 1 — 둘째 줄 아래 "선택 밖 메인 컴포넌트 2개도 함께 연결해요" · 툴팁에 메인 이름 둘', line?.text === '선택 밖 메인 컴포넌트 2개도 함께 연결해요' && line.tip === 'Traveler Card — Components\nBadge — Components' && line.below, JSON.stringify(line));
  check('28a 카드 안 줄 — 테두리 · 둥근 모서리 · 따로 바탕 없음(§2.8)', line?.bw === '0px' && line.r === '0px' && line.bg === 'rgba(0, 0, 0, 0)', JSON.stringify(line));
  check('28a 찾기 툴팁 — 메인 컴포넌트 포함', (await p.$eval('#selCards .sel-card .t', (e) => e.title)) === '인스턴스 안쪽 · 숨긴 레이어 제외 — 인스턴스의 메인 컴포넌트는 포함');
  // 28b 연결 화면
  await p.click('[data-k="link"]');
  await p.waitForTimeout(40);
  const bm = () => p.evaluate(() => { const e = document.getElementById('bindMains'); return e.hidden ? null : e.textContent; });
  const pos = await p.evaluate(() => { const m = document.getElementById('bindMains').getBoundingClientRect(); const st = document.getElementById('applyStatus').getBoundingClientRect(); const tree = document.getElementById('bindTree').getBoundingClientRect(); return m.top >= tree.bottom - 1 && m.bottom <= st.top + 1; });
  check('28b 연결 화면 — 아래 고정 줄 위(#applyStatus 위 · 목록 아래) 같은 글', (await bm()) === '선택 밖 메인 컴포넌트 2개도 함께 연결해요' && pos, String(await bm()));
  const toggle = async (name) => { await p.evaluate((n) => { const r = [...document.querySelectorAll('#bindTree .tr-row')].find((x) => x.textContent.includes(n)); r.querySelector('.bv-switch').click(); }, name); await p.waitForTimeout(20); };
  await toggle('spacing/b');
  check('28b 메인 자리만 가진 줄을 끄면 c = 2 → 1', (await bm()) === '선택 밖 메인 컴포넌트 1개도 함께 연결해요', String(await bm()));
  await p.click('#bindAllOff');
  await p.waitForTimeout(20);
  check('28b 모두 끄면 줄 숨김', (await bm()) === null);
  await p.click('#bindAllOn');
  await p.waitForTimeout(20);
  await p.click('#btnApplyConfirm');
  const as = (await sent(p, 'APPLY_SELECTED')).at(-1);
  check('28b 보낸 APPLY_SELECTED.items에 mainId', as?.items?.find((i) => i.variableId === 'vA')?.mainId === 'S' && as.items.find((i) => i.variableId === 'vC')?.mainId === undefined, JSON.stringify(as?.items));
  // 28c 연결 뒤 메인 줄(결정 B)
  await recv(p, { type: 'APPLY_RESULT', reqId: as.reqId, bound: 3, skipped: 0, reasons: {}, skips: [], mainsBound: ['S', 'M'] });
  await p.waitForTimeout(40);
  check('28c 상태 줄에 "메인 컴포넌트" 없음(v4.linked 글 그대로)', (await p.textContent('#statusText')) === '🔗 3곳 연결 · ⌘Z로 되돌리기', await p.textContent('#statusText'));
  const doneFind = async (extra = {}) => { const id = await lastReq(p, 'APPLY'); await recv(p, { ...preview(id), candidates: [], reasons: {}, counts: {}, ...extra }); await recv(p, tsPrev(id)); await p.waitForTimeout(40); };
  const boundLine = () => p.evaluate(() => [...document.querySelectorAll('#selCards .s.mains')].map((e) => e.textContent).join('|'));
  await p.waitForTimeout(450);
  await doneFind();
  check('28c 다음 찾기 ✓ → 카드 1 ✓ 글 아래 회색 "메인 컴포넌트 2개도 함께 연결했어요"', (await boundLine()) === '메인 컴포넌트 2개도 함께 연결했어요' && (await p.textContent('#selCards')).includes('✓ 찾은 값은 모두 연결돼 있어요'), await boundLine());
  // allLinked(s > 0) — ✓ 제목 바로 아래 · "손볼 곳" 줄 위
  await doneFind({ counts: { fraction: { gap: 2 } }, reasons: { fraction: 2 }, skips: [{ nodeId: 'x', name: 'X', type: 'FRAME', reason: 'fraction', field: 'paddingLeft' }] });
  const order = await p.evaluate(() => [...document.querySelectorAll('#selCards .sel-card')[0].querySelectorAll('.t, .s')].map((e) => e.textContent));
  check('28c allLinked 모습 — 줄이 ✓ 제목 바로 아래 · "손볼 곳" 줄 위', JSON.stringify(order) === JSON.stringify(['✓ 연결할 곳은 모두 연결됐어요', '메인 컴포넌트 2개도 함께 연결했어요', '손볼 곳 2곳']), JSON.stringify(order));
  // n > 0 → 줄 없음 · 기억 지움 → 그 뒤 ✓여도 줄 없음
  await doneFind({ candidates: CANDS });
  check('28c 다음 찾기가 ✓가 아니면 줄 없음', !(await boundLine()).includes('연결했어요'), await boundLine());
  await doneFind();
  check('28c 기억을 지운 뒤 ✓가 돼도 줄 없음', !(await boundLine()).includes('연결했어요'), await boundLine());
  await p.close();
}
{
  // 28b 텍스트 스타일 줄만(메인 안 글자) → c = 1 · textStyles[].mainIds · 28c 목록 기준이 바뀌면 줄 없음 · noTier면 줄 없음
  const p = await open(560, 'select');
  await recv(p, { type: 'LICENSE_STATUS', tier: 'paid', unlimited: true, source: 'dev' });
  await openSel(p);
  await found(p, { candidates: [], mains: [{ id: 'S', name: 'Traveler Card', page: 'Components' }], reasons: {}, counts: {} }, [{ styleId: 'st1', name: 'body/medium', nodeIds: ['t1', 't2'], mainIds: ['S', null] }]);
  await p.waitForTimeout(40);
  await p.click('[data-k="link"], [data-k="tsLink"]');
  await p.waitForTimeout(40);
  check('28b 메인 안 글자만 가진 텍스트 스타일 줄만 켜도 c = 1', (await p.evaluate(() => document.getElementById('bindMains').hidden ? null : document.getElementById('bindMains').textContent)) === '선택 밖 메인 컴포넌트 1개도 함께 연결해요');
  await p.click('#btnApplyConfirm');
  const as = (await sent(p, 'APPLY_SELECTED')).at(-1);
  check('28b textStyles[].mainIds가 실린다', JSON.stringify(as?.textStyles?.[0]?.mainIds) === JSON.stringify(['S', null]), JSON.stringify(as?.textStyles));
  await recv(p, { type: 'APPLY_RESULT', reqId: as.reqId, bound: 0, skipped: 0, reasons: {}, skips: [], textStylesApplied: 2, textStylesSkipped: 0, mainsBound: ['S'] });
  await p.waitForTimeout(40);
  // noTier 모습으로 그려지면 줄 없음 · 기억 지움
  await recv(p, { ...PREREQ, hasBindable: false });
  await p.waitForTimeout(40);
  check('28c 카드 1이 noTier 모습 → 줄 없음', !(await p.textContent('#selCards')).includes('연결했어요'), await p.textContent('#selCards'));
  await recv(p, PREREQ);
  await p.waitForTimeout(450);
  {
    const id0 = await lastReq(p, 'APPLY');
    await recv(p, { ...preview(id0), candidates: [], reasons: {}, counts: {} });
    await recv(p, tsPrev(id0));
    await p.waitForTimeout(40);
  }
  check('28c noTier로 지운 기억 — 다시 ✓여도 줄 없음', !(await p.textContent('#selCards')).includes('연결했어요'), await p.textContent('#selCards'));
  // 다시 연결 → 기억 → 목록 기준을 바꾼다 → ✓여도 줄 없음
  await recv(p, { type: 'APPLY_RESULT', reqId: as.reqId, bound: 0, skipped: 0, reasons: {}, skips: [], textStylesApplied: 2, textStylesSkipped: 0, mainsBound: ['S'] });
  await p.waitForTimeout(40);
  await recv(p, { ...sel(2, 0), ids: ['z1', 'z2'] });
  await p.waitForTimeout(450);
  const id = await lastReq(p, 'APPLY');
  await recv(p, { ...preview(id), candidates: [], reasons: {}, counts: {} });
  await recv(p, tsPrev(id));
  await p.waitForTimeout(40);
  check('28c 목록 기준을 바꾸면 줄 없음', !(await p.textContent('#selCards')).includes('연결했어요') && (await p.textContent('#selCards')).includes('✓'), await p.textContent('#selCards'));
  await p.close();
}
{
  // 28d 건너뛴 곳(결정 A 확장 — 손볼 곳 예외): 두 줄 · 설명만 · [선택 ›]은 손볼 곳 줄만
  const p = await open(560, 'select');
  await recv(p, { type: 'LICENSE_STATUS', tier: 'paid', unlimited: true, source: 'dev' });
  await openSel(p);
  const sk = [
    { nodeId: 'f1', name: 'Box', type: 'FRAME', reason: 'fraction', field: 'paddingLeft' },
    { nodeId: 'h1', name: 'Hidden', type: 'FRAME', reason: 'hidden' },
    { nodeId: 'l1', name: 'Lib', type: 'INSTANCE', reason: 'library-main' },
  ];
  await found(p, { reasons: { fraction: 2, hidden: 1, 'library-main': 4 }, counts: { fraction: { gap: 2 } }, skips: sk, skipLayers: { hidden: 1, 'library-main': 4 } }, [], { noStyle: 1 });
  await p.waitForTimeout(40);
  await p.click('[data-k="link"]');
  await p.waitForTimeout(40);
  await p.click('#bindSkipToggle');
  await p.waitForTimeout(30);
  const rows = await p.$$eval('#bindSkips .skip-row', (rs) => rs.map((r) => {
    const line = r.querySelector('.skip-line').getBoundingClientRect();
    const help = r.querySelector('.skip-help');
    const hb = help?.getBoundingClientRect();
    const sel = r.querySelector('.skip-sel');
    const sb = sel?.getBoundingClientRect();
    const rb = r.getBoundingClientRect();
    const nm = r.querySelector('.skip-name');
    const cs = getComputedStyle(r);
    return {
      name: nm.textContent, nameOneLine: nm.getBoundingClientRect().height < 20, help: help?.textContent ?? null,
      twoLine: !help || hb.top >= line.bottom - 1, sel: r.querySelectorAll('.skip-sel').length,
      selOk: !sb || (sb.bottom <= hb.top + 1 && Math.abs(rb.right - sb.right) < 8),
      noClip: !help || (help.scrollWidth <= help.clientWidth && getComputedStyle(help).textOverflow !== 'ellipsis'),
      card: cs.borderTopWidth !== '0px' || cs.borderTopLeftRadius !== '0px' || cs.backgroundColor !== 'rgba(0, 0, 0, 0)',
    };
  }));
  const fixR = rows.find((r) => r.name === '소수 값(정수만)');
  const keepR = rows.filter((r) => r.name === '숨긴 레이어' || r.name === '라이브러리 컴포넌트');
  const libR = rows.find((r) => r.name === '라이브러리 컴포넌트');
  check('28d 설명이 있는 줄은 모두 두 줄(설명이 첫 줄 아래)', rows.filter((r) => r.help).every((r) => r.twoLine) && rows.filter((r) => r.help).length >= 3, JSON.stringify(rows));
  check('28d 손볼 곳 줄(fraction)에 [선택 ›] 1개 — 첫 줄 오른쪽', fixR?.sel === 1 && fixR.selOk, JSON.stringify(fixR));
  check('28d 그대로 둬도 되는 곳 줄(숨긴 레이어 · 라이브러리 컴포넌트)에는 [선택 ›] 0개(레이어 항목이 있어도)', keepR.length === 2 && keepR.every((r) => r.sel === 0), JSON.stringify(keepR));
  check('28d "라이브러리 컴포넌트" 줄 설명', libR?.help === '라이브러리 컴포넌트라 이 파일에서 연결할 수 없어요', JSON.stringify(libR));
  check('28d 560px — 이름 줄바꿈 없음 · 설명 잘림 없음', rows.every((r) => r.nameOneLine && r.noClip), JSON.stringify(rows));
  check('28d 줄에 테두리 · 둥근 모서리 · 따로 바탕 없음(§2.8)', rows.every((r) => !r.card));
  const stops = await p.$$eval('#bindSkips button, #bindSkips [tabindex]:not([tabindex="-1"]), #bindSkips a, #bindSkips input', (e) => e.map((x) => x.className));
  check('28d 목록 안 탭 정지점은 손볼 곳 줄의 [선택 ›]뿐', stops.length === 1 && stops[0].includes('skip-sel'), JSON.stringify(stops));
  const bad = await nestedCards(p);
  check('28d 카드 안 카드 0 — 건너뛴 곳 목록', bad.length === 0, bad.join(' · '));
  await p.close();
}

{
  // 28c 만들기 실행 — 연결 mainsBound ['a'] + 텍스트 스타일 mainsApplied ['a', 'b'] → 다 됨 줄에 메인 없음 · 카드 1 ✓ 아래 2개
  const p = await open(560, 'select');
  await recv(p, { type: 'LICENSE_STATUS', tier: 'paid', unlimited: true, source: 'dev' });
  await recv(p, { ...PREREQ, hasBindable: true, tierVars: 3, otherVars: 0 });
  await recv(p, { type: 'VAR_TABLE', collections: COLS, vars: VARS });
  await recv(p, { ...sel(1, 0), ids: ['w9'] });
  await goSub(p, 'make');
  await p.waitForTimeout(40);
  const ex = (await sent(p, 'EXTRACT')).at(-1);
  await recv(p, { type: 'EXTRACT_RESULT', reqId: ex.reqId, warnings: [], selection: 1, tokens: [{ name: 'spacing/16', category: 'gap', value: 16, sources: ['itemSpacing'], count: 1 }] });
  await recv(p, { type: 'TEXT_STYLE_CANDIDATES', reqId: (await sent(p, 'SCAN_TEXT_STYLES')).at(-1).reqId, warnings: [], existing: [], styles: [{ name: 'body/medium', fontSize: 16, lineHeight: 24, letterSpacing: 0, family: 'Inter', style: 'Regular', count: 2, nodeIds: ['t1'] }] });
  await p.waitForTimeout(30);
  await recv(p, { type: 'CREATE_RESULT', reqId: (await sent(p, 'CREATE_TOKENS')).at(-1).reqId, preview: true, created: 1, updated: 0, summary: '', roles: 0, skippedManual: 0, tokenStates: { 'spacing/16': { state: 'new' } }, roleRows: [] });
  await p.waitForTimeout(30);
  await p.click('#btnMakeRun');
  await p.waitForTimeout(30);
  await recv(p, { type: 'CREATE_RESULT', reqId: (await sent(p, 'CREATE_TOKENS')).filter((m) => !m.preview).at(-1).reqId, created: 1, updated: 0, summary: '', roles: 0, skippedManual: 0 });
  await p.waitForTimeout(60);
  const ts = (await sent(p, 'CREATE_TEXT_STYLES')).at(-1);
  await recv(p, { type: 'TEXT_STYLES_RESULT', reqId: ts.reqId, created: 1, updated: 0, bound: 1, missing: [], notes: [], applied: 2, applySkipped: 0, mainsApplied: ['a', 'b'] });
  await p.waitForTimeout(60);
  const ap = (await sent(p, 'APPLY')).filter((m) => m.preview === false).at(-1);
  await recv(p, { type: 'APPLY_RESULT', bound: 3, skipped: 0, reasons: {}, preview: false, newRoles: 0, reqId: ap.reqId, mainsBound: ['a'] });
  await p.waitForTimeout(120);
  check('28c 만들기 다 됨 줄에 "메인 컴포넌트" 없음', (await visible(p, '#selHome')) && !(await p.textContent('#statusText')).includes('메인'), await p.textContent('#statusText'));
  await p.waitForTimeout(450);
  const id = await lastReq(p, 'APPLY');
  await recv(p, { ...preview(id), candidates: [], reasons: {}, counts: {} });
  await recv(p, tsPrev(id));
  await p.waitForTimeout(40);
  check('28c 만들기 뒤 카드 1 ✓ 아래 "메인 컴포넌트 2개도 함께 연결했어요"', (await p.evaluate(() => [...document.querySelectorAll('#selCards .s.mains')].map((e) => e.textContent).join('|'))) === '메인 컴포넌트 2개도 함께 연결했어요', await p.textContent('#selCards'));
  await p.close();
}

{
  /* ---------- 29 #110 검토 ② · ⑤(#158) — 사용 수 읽기 오류 · 조합 키와 상태 줄 버튼 ---------- */
  const p = await open(560, 'select');
  await recv(p, PREREQ);
  await recv(p, { type: 'VAR_TABLE', collections: COLS, vars: VARS });
  await recv(p, sel(1, 0));
  await p.waitForTimeout(450);
  const u1 = (await sent(p, 'SCAN_USAGE')).at(-1);
  await recv(p, { type: 'ERROR', message: 'boom', op: 'SCAN_USAGE', reqId: u1.reqId });
  const n1 = (await sent(p, 'SCAN_USAGE')).length;
  await p.evaluate(() => window.dispatchEvent(new Event('focus')));
  await p.waitForTimeout(600);
  const n2 = (await sent(p, 'SCAN_USAGE')).length;
  check('29 사용 수 읽기 오류 뒤 같은 기준 — 창 다시 들어옴으로 되풀이하지 않음(경고가 되풀이되지 않게)', n2 === n1, `${n1} → ${n2}`);
  await recv(p, { ...sel(1, 0), ids: ['z9'] });
  await p.waitForTimeout(450);
  const n3 = (await sent(p, 'SCAN_USAGE')).length;
  check('29 새 선택이면 사용 수를 다시 읽음(진행 중 표시가 풀림)', n3 > n2, `${n2} → ${n3}`);
  // 변수 탭 — 오류 뒤에도 창 다시 들어옴 다시 읽기가 보류되지 않는다(전에는 진행 중 표시가 남아 멈췄다).
  await goTab(p, 'variables');
  await p.waitForTimeout(100);
  await recv(p, { type: 'ERROR', message: 'boom', op: 'SCAN_USAGE', reqId: (await sent(p, 'SCAN_USAGE')).at(-1).reqId });
  const v1 = (await sent(p, 'GET_VAR_TABLE')).length;
  await p.waitForTimeout(2100);
  await p.evaluate(() => window.dispatchEvent(new Event('focus')));
  await p.waitForTimeout(600);
  const v2 = (await sent(p, 'GET_VAR_TABLE')).length;
  check('29 변수 탭 — 사용 수 읽기 오류 뒤에도 창 다시 들어옴 다시 읽기(변수 표)가 나감', v2 > v1, `${v1} → ${v2}`);
  // 누를 수 있는 메시지([라이선스 →]) — 유료 거절 응답 경로
  const paid = () => recv(p, { type: 'PREMIUM_REQUIRED', feature: 'tokens', message: '' });
  const actionShown = () => p.$eval('#statusAction', (b) => !b.hidden);
  await paid();
  await p.waitForTimeout(30);
  const shown = await actionShown();
  await p.keyboard.down('Meta');
  await p.keyboard.up('Meta');
  await p.keyboard.down('Control');
  await p.keyboard.press('c');
  await p.keyboard.up('Control');
  await p.waitForTimeout(30);
  check('29 ⌘ · Ctrl · Ctrl+C만으로는 상태 줄 [라이선스 →]가 남음', shown && (await actionShown()), String(shown));
  await p.keyboard.down('Control');
  await p.keyboard.down('Alt');
  await p.keyboard.press('q');
  await p.keyboard.up('Alt');
  await p.keyboard.up('Control');
  await p.waitForTimeout(30);
  check('29 AltGr(Ctrl+Alt)로 친 글자는 조작 — 메시지를 지움', !(await actionShown()));
  await paid();
  await p.waitForTimeout(30);
  await p.keyboard.down('Meta');
  await p.keyboard.press('Enter');
  await p.keyboard.up('Meta');
  await p.waitForTimeout(30);
  check('29 ⌘+Enter(실행)는 조작 — 메시지를 지움', !(await actionShown()));
  await p.close();
}

/* ---------- 30 상태 5 만들기 카드(IA v4 §4.1 "만들기 카드 — 상태 5" · B.30) ---------- */
const LIB30 = [
  { id: 'L1', name: 'core/blue/500', collection: 'Core', type: 'COLOR', value: { kind: 'color', hex: '#3366FF' }, aliasTargets: [], scopes: ['ALL_SCOPES'] },
  { id: 'LS8', name: 'core/space/8', collection: 'Core', type: 'FLOAT', value: { kind: 'number', text: '8' }, aliasTargets: [], scopes: ['GAP'] },
];
const usage30 = (reqId, libs = LIB30) => usageResult(reqId, Object.fromEntries(libs.map((l) => [l.id, { places: 2, layers: 1 }])), { libraryVars: libs });
/** 추출 토큰(freeBy = 변수가 안 붙은 자리 — 허용 스코프 묶음별). 남은 값 5개(n = 15) · 같은 값 2개(L = 13) · free 0 하나 · 글자 하나. */
const T30 = [
  { name: 'color/101828', category: 'color', value: '#101828', sources: ['fills'], count: 31, freeBy: { 'ALL_FILLS|TEXT_FILL': 5 } },
  { name: 'color/3366ff', category: 'color', value: '#3366ff', sources: ['fills'], count: 6, freeBy: { 'ALL_FILLS|FRAME_FILL': 4 } }, // 라이브러리 L1과 같은 값(ALL_SCOPES)
  { name: 'spacing/8', category: 'gap', value: 8, sources: ['itemSpacing'], count: 22, freeBy: { GAP: 9 } }, // 라이브러리 LS8과 같은 값(GAP)
  { name: 'spacing/4', category: 'gap', value: 4, sources: ['itemSpacing'], count: 18, freeBy: { GAP: 3 } },
  { name: 'radius/8', category: 'radius', value: 8, sources: ['topLeftRadius'], count: 3, freeBy: { CORNER_RADIUS: 4 } }, // 값은 8이지만 LS8은 GAP 전용 → 남은 값
  { name: 'opacity/0.5', category: 'opacity', value: 0.5, sources: ['opacity'], count: 1, freeBy: { OPACITY: 1 } },
  { name: 'stroke-width/1', category: 'strokeWidth', value: 1, sources: ['strokeWidth'], count: 2, freeBy: { STROKE_FLOAT: 2 } },
  { name: 'spacing/12', category: 'gap', value: 12, sources: ['itemSpacing'], count: 2, freeBy: {} }, // 이미 모두 변수가 붙음(free 0)
  { name: 'font-size/16', category: 'fontSize', value: 16, sources: ['fontSize'], count: 9 },
];
const isLibSame30 = (tk) => tk.name === 'spacing/8' || String(tk.value).toLowerCase() === '#3366ff';
/** 상태 5로 연다 — 로컬 변수 0개 + 라이브러리 변수 직접 사용. 추출에는 아직 답하지 않는다. */
async function openLib30({ tier = 'free', usage = true, find = true, prereq = { ...PREREQ, hasBindable: false, tierVars: 0, otherVars: 0 } } = {}) {
  const p = await open(560, 'select');
  await recv(p, { type: 'LICENSE_STATUS', tier, unlimited: tier === 'paid', source: 'dev' });
  await recv(p, prereq);
  await recv(p, { type: 'VAR_TABLE', collections: [], vars: [] });
  await recv(p, { ...sel(1, 0), scanned: 40, ids: ['f1'], firstName: 'Flightin website' });
  await p.waitForTimeout(450);
  if (usage) await recv(p, usage30((await sent(p, 'SCAN_USAGE')).at(-1).reqId));
  if (find) {
    const ap = (await sent(p, 'APPLY')).at(-1);
    if (ap) await recv(p, { ...preview(ap.reqId), candidates: [], bound: 0, counts: { 'no-match': { gap: 2 } } });
    const pt = (await sent(p, 'PREVIEW_TEXT_STYLES')).at(-1);
    if (pt) await recv(p, tsPrev(pt.reqId));
  }
  await p.waitForTimeout(40);
  return p;
}
/** 아직 답하지 않은 미리보기에 모두 답한다 — 카드가 보여 줄 집합이 바뀌어 다시 보내면 그것에도(최대 3번). 지난 reqId 응답은 화면이 버린다. */
async function settle30(p) {
  const done = new Set();
  for (let i = 0; i < 3 && !(await p.$('[data-k="mkAll"]')); i++) {
    for (const pv of (await sent(p, 'CREATE_TOKENS')).filter((m) => m.preview && !done.has(m.reqId))) {
      done.add(pv.reqId);
      await recv(p, { type: 'CREATE_RESULT', reqId: pv.reqId, preview: true, created: pv.tokens.length, updated: 0, summary: '', roles: 4, skippedManual: 0, tokenStates: Object.fromEntries(pv.tokens.map((tk) => [tk.name, { state: 'new' }])), roleRows: [] });
    }
    await p.waitForTimeout(40);
  }
}
const titles30 = (p) => p.$$eval('#selCards .sel-card', (e) => e.map((x) => x.querySelector('.t')?.textContent ?? ''));
const guideSubs30 = (p) => p.$eval('#selCards .sel-card', (e) => [...e.querySelectorAll('.s')].map((x) => x.textContent));
/** 만들기 화면 Global 탭 — 켜진 줄의 토큰 이름(data-tkey "g:{이름}"). */
const mkOnRows30 = (p) => p.$$eval('#makeTree [data-tkey^="g:"]', (e) => e.filter((r) => r.querySelector('.bv-switch')?.getAttribute('aria-checked') === 'true').map((r) => r.dataset.tkey.slice(2)));
/** 만들기 화면에 들어가 추출에 답하고, 이어 보낸 미리보기(켠 줄)를 돌려준다. */
async function enterMake30(p, how, tokens = T30) {
  const before = (await sent(p, 'EXTRACT')).length;
  if (how === 'more') await p.click('[data-k="mkMore"]');
  else await p.click('#btnGoMake');
  await p.waitForTimeout(40);
  const exs = await sent(p, 'EXTRACT');
  const ex = exs.at(-1);
  if (exs.length > before) await recv(p, { type: 'EXTRACT_RESULT', reqId: ex.reqId, warnings: [], selection: 1, tokens });
  await p.waitForTimeout(40);
  return (await sent(p, 'CREATE_TOKENS')).filter((m) => m.preview).at(-1);
}
/** ← 로 첫 화면에 돌아와 쓰는 변수를 다시 받는다(libs = 직접 쓰는 라이브러리 변수 — []면 상태 6). */
async function backHome30(p, libs) {
  await p.click('#btnSubBack');
  await p.waitForTimeout(40);
  const u = (await sent(p, 'SCAN_USAGE')).at(-1);
  await recv(p, usage30(u.reqId, libs));
  await p.waitForTimeout(40);
}
{
  // ① · ⑤ · ⑥ · ⑩ — 상태 5 + 라이브러리와 다른 날값
  const p = await openLib30();
  // ④ 추출 결과 전 — 만들기 카드 없음 · 같은 값 줄 없음(상태 6처럼 "선택을 읽는 중…" 카드를 먼저 두지 않는다)
  const t0 = await titles30(p);
  check('30 ④ 상태 5 · 추출 결과 전 → 만들기 카드 없음 · 같은 값 줄 없음', t0.length === 2 && t0[0] === '라이브러리 변수만 써요 · 연결은 피그마 오른쪽 패널에서 해요' && !t0.some((x) => x.startsWith('변수가 안 붙은 값')) && (await guideSubs30(p)).length === 0, JSON.stringify(t0));
  const pv = await cardAnswer(p, T30);
  check('30 미리보기 — 남은 값만(라이브러리와 같은 값 · free 0 · 글자 빼고)', !!pv && pv.tokens.length === 5 && !pv.tokens.some(isLibSame30) && !pv.tokens.some((tk) => tk.name === 'spacing/12' || tk.category === 'fontSize'), JSON.stringify(pv?.tokens?.map((tk) => tk.name)));
  const t1 = await titles30(p);
  check('30 ① 카드 순서 — 안내 카드 · 만들기 카드 "변수가 안 붙은 값 15곳" · 쓰는 변수 카드(서로 형제)', t1.length === 3 && t1[0].startsWith('라이브러리 변수만 써요') && t1[1] === '변수가 안 붙은 값 15곳' && t1[2].startsWith('쓰는 변수'), JSON.stringify(t1));
  check('30 ① 안내 카드 둘째 줄 "라이브러리에 같은 값 13곳 — 오른쪽 패널에서 연결해요"', JSON.stringify(await guideSubs30(p)) === JSON.stringify(['라이브러리에 같은 값 13곳 — 오른쪽 패널에서 연결해요']), JSON.stringify(await guideSubs30(p)));
  const rows = await cardRows(p);
  check('30 ① 값 줄 — 남은 값 4줄(라이브러리와 같은 값 없음) · [외 1개 보기] · [Global 5개 모두 만들기]', rows.length === 4 && !rows.some((r) => r.includes('spacing/8 ') || r.startsWith('#3366FF')) && (await p.textContent('[data-k="mkMore"]')) === '외 1개 보기' && (await p.textContent('[data-k="mkAll"]')) === 'Global 5개 모두 만들기', JSON.stringify(rows));
  check('30 ① 주 버튼 하나(만들기 카드) · 할 일 [변수 만들기]는 보조', (await primaries(p)) === 1 && (await p.$eval('[data-k="mkAll"]', (b) => b.classList.contains('primary'))) && !(await makeHot(p)));
  check('30 ① 카드 안 카드 0', (await nestedCards(p)).length === 0, (await nestedCards(p)).join(' · '));
  check('30 ① 포커스 대체 = 카드 영역 첫 버튼(만들기 카드의 첫 [＋ 만들기])', await p.evaluate(() => document.querySelector('#selCards button')?.closest('.sel-card')?.querySelector('.t')?.textContent === '변수가 안 붙은 값 15곳'));
  if (process.env.STATE5_SHOT) {
    // 화면 시안 대조용(로컬에서만) — 할 일 줄이 화면 아래에 붙어 있어 전체 높이 창으로 찍는다
    await p.setViewportSize({ width: 560, height: 720 });
    await p.waitForTimeout(60);
    await p.screenshot({ path: process.env.STATE5_SHOT });
    await p.setViewportSize({ width: 560, height: 510 });
    await p.waitForTimeout(60);
  }
  // ⑤ 텍스트 스타일 후보 + 만들기 카드 → [{t}곳 연결]은 안내 카드(같은 값 줄 아래)에 보조
  const pt = (await sent(p, 'PREVIEW_TEXT_STYLES')).at(-1);
  await recv(p, tsPrev(pt.reqId, B2_TS, { hasStyle: 1 }));
  await p.waitForTimeout(60);
  const g5 = await guideSubs30(p);
  check('30 ⑤ 상태 5 + 텍스트 스타일 + 만들기 카드 → 안내 카드 [2곳 연결] 보조 · 같은 값 줄 아래 · 만들기 카드에는 없음', !!(await p.$('#selCards .sel-card >> nth=0 >> [data-k="tsLink"]')) && !(await p.$eval('[data-k="tsLink"]', (b) => b.classList.contains('primary'))) && (await primaries(p)) === 1 && g5[0].startsWith('라이브러리에 같은 값') && g5[1] === 'Text Style 2곳' && (await p.$$eval('[data-k="tsLink"]', (e) => e.length)) === 1, JSON.stringify(g5));
  await recv(p, tsPrev(pt.reqId));
  await p.waitForTimeout(40);
  // ⑩ 상태 5에서 [외 1개 보기]로 만들기 화면 → 남은 값이 아닌 줄(라이브러리와 같은 값 · free 0)은 기본 끔
  const mp1 = await enterMake30(p, 'more');
  const on1 = await mkOnRows30(p);
  check('30 ⑩ 상태 5 → [외 1개 보기] → 처음 켜진 줄 = 카드의 남은 값 5개(같은 값 · free 0 · 글자 끔)', on1.length === 5 && !on1.includes('spacing/8') && !on1.includes('spacing/12') && mp1 && mp1.tokens.length === 5 && !mp1.tokens.some(isLibSame30), `${JSON.stringify(on1)} / ${JSON.stringify(mp1?.tokens?.map((tk) => tk.name))}`);
  check('30 ⑩ 기본 끈 줄도 보이고 켤 수 있음(잠그지 않음)', await p.$eval('#makeTree [data-tkey="g:spacing/8"] .bv-switch', (b) => b.getAttribute('aria-checked') === 'false' && b.getAttribute('aria-disabled') !== 'true' && !b.disabled));
  // 상태 5 → 6: 라이브러리 연결이 없어진 뒤 [변수 만들기]로 들어가면 모두 켬(글자 빼고)
  await backHome30(p, []);
  await enterMake30(p, 'go');
  const on2 = await mkOnRows30(p);
  check('30 ⑩ 상태 5에서 들어갔다 나온 뒤 상태 6에서 [변수 만들기] → 모두 켬(8줄 — 글자만 끔)', on2.length === 8, JSON.stringify(on2));
  // 상태 6 → 5: 사용자가 바꾸지 않은 줄은 다시 꺼짐. 상태 6에서 사용자가 켠 줄(spacing/8 — 껐다 켬)은 켜진 채(한계)
  await p.click('#makeTree [data-tkey="g:spacing/8"] .bv-switch');
  await p.click('#makeTree [data-tkey="g:spacing/8"] .bv-switch');
  await p.waitForTimeout(20);
  await backHome30(p, LIB30);
  await enterMake30(p, 'go');
  const on3 = await mkOnRows30(p);
  check('30 ⑩ 상태 6에서 먼저 들어갔다 나온 뒤 상태 5에서 [변수 만들기] → 같은 값 줄 다시 꺼짐(사용자가 안 바꾼 줄)', on3.length === 6 && !on3.includes('spacing/12') && on3.filter((n) => n.startsWith('color/')).length === 1, JSON.stringify(on3));
  check('30 ⑩ 상태 6에서 사용자가 켠 줄(spacing/8)은 상태 5에서도 켜짐(한계 — 사용자가 바꾼 것이 먼저)', on3.includes('spacing/8'), JSON.stringify(on3));
  await p.click('#btnSubBack');
  await p.waitForTimeout(40);
  await recv(p, usage30((await sent(p, 'SCAN_USAGE')).at(-1).reqId));
  await p.waitForTimeout(40);
  // ⑥ 무료 [＋ 만들기] 뒤 상태 7 남긴 카드 — 라이브러리와 같은 값이 줄로 나타나지 않음(상태 6 · 5를 오가며 다시 보낸 카드 미리보기에 먼저 답한다)
  await settle30(p);
  await p.click('#selCards .mk-row >> nth=0 >> button');
  await p.waitForTimeout(20);
  const cr = (await sent(p, 'CREATE_TOKENS')).filter((m) => !m.preview).at(-1);
  check('30 ⑥ [＋ 만들기] → 그 토큰 하나(남은 값)', !!cr && cr.tokens.length === 1 && !cr.tokens.some(isLibSame30), JSON.stringify(cr?.tokens?.map((tk) => tk.name)));
  await recv(p, { type: 'CREATE_RESULT', reqId: cr.reqId, created: 1, updated: 0, summary: '', roles: 0, skippedManual: 0 });
  await p.waitForTimeout(40);
  await recv(p, { ...PREREQ, hasBindable: true, tierVars: 1, otherVars: 0 });
  await recv(p, { type: 'VAR_TABLE', collections: COLS.slice(0, 1), vars: [{ id: 'nv1', name: cr.tokens[0].name, collectionId: 'g', type: 'COLOR', values: { m: { kind: 'color', hex: '#101828' } }, scopes: [], description: '' }] });
  const u7 = (await sent(p, 'SCAN_USAGE')).at(-1);
  await recv(p, usage30(u7.reqId));
  const ex7 = (await sent(p, 'EXTRACT')).at(-1);
  await recv(p, { type: 'EXTRACT_RESULT', reqId: ex7.reqId, warnings: [], selection: 1, tokens: T30 });
  await p.waitForTimeout(30);
  const pv7 = (await sent(p, 'CREATE_TOKENS')).filter((m) => m.preview).at(-1);
  await recv(p, { type: 'CREATE_RESULT', reqId: pv7.reqId, preview: true, created: pv7.tokens.length - 1, updated: 0, summary: '', roles: 4, skippedManual: 0, tokenStates: Object.fromEntries(pv7.tokens.map((tk) => [tk.name, tk.name === cr.tokens[0].name ? { state: 'reuse', varName: tk.name } : { state: 'new' }])), roleRows: [] });
  await p.waitForTimeout(60);
  const rows7 = await cardRows(p);
  check('30 ⑥ 상태 7 남긴 카드 — 제목 "Global 변수 1개를 만들었어요" · 라이브러리와 같은 값 줄 없음 · 미리보기도 남은 값만', (await p.textContent('#selCards .sel-card .t')) === 'Global 변수 1개를 만들었어요' && !rows7.some((r) => r.includes('spacing/8 ') || r.startsWith('#3366FF')) && !pv7.tokens.some(isLibSame30) && pv7.tokens.length === 5, `${JSON.stringify(rows7)} / ${JSON.stringify(pv7.tokens.map((tk) => tk.name))}`);
  await p.close();
}
{
  // ② 날값이 모두 라이브러리와 같음 → 만들기 카드 없음 · 안내 카드 둘째 줄만
  const p = await openLib30();
  const before = (await sent(p, 'CREATE_TOKENS')).length;
  const same = T30.filter((tk) => isLibSame30(tk) || tk.name === 'spacing/12' || tk.category === 'fontSize');
  await cardAnswer(p, same);
  const t2 = await titles30(p);
  check('30 ② 모든 날값이 라이브러리와 같음 → 만들기 카드 없음 · 안내 카드 "라이브러리에 같은 값 13곳 …" · 미리보기 안 보냄', t2.length === 2 && !t2.some((x) => x.startsWith('변수가 안 붙은 값')) && JSON.stringify(await guideSubs30(p)) === JSON.stringify(['라이브러리에 같은 값 13곳 — 오른쪽 패널에서 연결해요']) && (await sent(p, 'CREATE_TOKENS')).length === before, `${JSON.stringify(t2)} / ${JSON.stringify(await guideSubs30(p))}`);
  check('30 ② 할 일 [변수 만들기]는 보조 그대로', !(await makeHot(p)));
  // ⑩ 만들기 카드가 없어도 상태 5면 기본 끔 — 켜진 줄 0(같은 값 · free 0 · 글자)
  const mp0 = await enterMake30(p, 'go', same);
  check('30 ⑩ 상태 5(만들기 카드 없음) → [변수 만들기] → 켜진 줄 0 · 미리보기 보내지 않음', (await mkOnRows30(p)).length === 0 && (!mp0 || mp0.reqId < (await sent(p, 'EXTRACT')).at(-1).reqId), JSON.stringify(await mkOnRows30(p)));
  await p.close();
}
{
  // ③ 날값 0(모든 토큰의 freeBy 합 = 0) → 지금과 같음
  const p = await openLib30();
  await cardAnswer(p, T30.map((tk) => ({ ...tk, freeBy: {} })));
  const t3 = await titles30(p);
  check('30 ③ 날값 0 → 안내 카드(둘째 줄 없음) · 쓰는 변수 카드', t3.length === 2 && t3[1].startsWith('쓰는 변수') && (await guideSubs30(p)).length === 0, JSON.stringify(t3));
  await p.close();
}
{
  // ⑦ 추출 실패 → 만들기 카드 자리에 실패 카드(같은 값 줄 없음)
  const p = await openLib30();
  const ex = (await sent(p, 'EXTRACT')).at(-1);
  await recv(p, { type: 'ERROR', message: 'boom', op: 'EXTRACT', reqId: ex.reqId });
  await p.waitForTimeout(40);
  const t7 = await titles30(p);
  check('30 ⑦ 추출 실패 → 안내 카드 · 만들기 카드 자리 "선택을 읽지 못했어요 · [다시 읽기]" · 쓰는 변수 카드 · 같은 값 줄 없음', t7.length === 3 && t7[0].startsWith('라이브러리 변수만 써요') && t7[1] === '선택을 읽지 못했어요' && !!(await p.$('[data-k="mkReread"]')) && t7[2].startsWith('쓰는 변수') && (await guideSubs30(p)).length === 0, JSON.stringify(t7));
  await p.click('[data-k="mkReread"]');
  await p.waitForTimeout(30);
  const t7b = await titles30(p);
  check('30 ⑦ 실패 모습의 [다시 읽기] → 추출 결과가 없으니 제목 "선택을 읽는 중…"만', t7b[1] === '선택을 읽는 중…' && (await p.$eval('#selCards .sel-card >> nth=1', (e) => e.querySelectorAll('.s').length)) === 0, JSON.stringify(t7b));
  await p.close();
}
{
  // ⑦ 남은 값 0 확정 뒤 미리보기 실패 → 화면 그대로(추출이 쓰는 변수 결과보다 먼저 와 고른 토큰 모두로 보낸 미리보기)
  const p = await openLib30({ usage: false });
  const ex = (await sent(p, 'EXTRACT')).at(-1);
  await recv(p, { type: 'EXTRACT_RESULT', reqId: ex.reqId, warnings: [], selection: 1, tokens: T30.filter(isLibSame30) });
  await p.waitForTimeout(20);
  const pv = (await sent(p, 'CREATE_TOKENS')).filter((m) => m.preview).at(-1);
  await recv(p, usage30((await sent(p, 'SCAN_USAGE')).at(-1).reqId));
  await p.waitForTimeout(20);
  await recv(p, { type: 'ERROR', message: 'boom', op: 'CREATE_TOKENS', reqId: pv.reqId });
  await p.waitForTimeout(40);
  const t7 = await titles30(p);
  check('30 ⑦ 남은 값 0 확정 뒤 미리보기 실패 → 실패 카드 없음 · 같은 값 줄 그대로', !!pv && pv.tokens.length === 2 && t7.length === 2 && !t7.includes('선택을 읽지 못했어요') && (await guideSubs30(p))[0] === '라이브러리에 같은 값 13곳 — 오른쪽 패널에서 연결해요', JSON.stringify(t7));
  await p.close();
}
{
  // ⑧ 상태 5 찾기만 실패 → 안내 카드 · 만들기 카드 그대로
  const p = await openLib30({ find: false, prereq: { ...PREREQ, hasBindable: true, tierVars: 0, otherVars: 0 } });
  await cardAnswer(p, T30);
  const ap = (await sent(p, 'APPLY')).at(-1);
  await recv(p, { type: 'ERROR', message: 'boom', op: 'APPLY', reqId: ap.reqId });
  await p.waitForTimeout(40);
  const t8 = await titles30(p);
  check('30 ⑧ 상태 5 찾기만 실패 → 안내 카드(같은 값 줄 그대로) · 만들기 카드 그대로', !!ap && t8[0].startsWith('라이브러리 변수만 써요') && t8[1] === '변수가 안 붙은 값 15곳' && !!(await p.$('[data-k="mkAll"]')) && (await guideSubs30(p))[0]?.startsWith('라이브러리에 같은 값'), JSON.stringify(t8));
  await p.close();
}
{
  // ⑨ 라이브러리 변수 값만 바뀐 쓰는 변수 결과 → 미리보기 다시 보냄(보여 줄 집합이 바뀜)
  const p = await openLib30();
  await cardAnswer(p, T30);
  const n0 = (await sent(p, 'CREATE_TOKENS')).filter((m) => m.preview).length;
  await goTab(p, 'variables');
  await p.waitForTimeout(40);
  const changed = [{ ...LIB30[0], value: { kind: 'color', hex: '#101828' } }, LIB30[1]]; // id는 같고 값만 — 이제 #101828이 같은 값, #3366ff가 남은 값
  await recv(p, usage30((await sent(p, 'SCAN_USAGE')).at(-1).reqId, changed));
  await goTab(p, 'select');
  await p.waitForTimeout(60);
  const pvs = (await sent(p, 'CREATE_TOKENS')).filter((m) => m.preview);
  const last = pvs.at(-1);
  check('30 ⑨ 라이브러리 변수 값만 바뀜 → 미리보기 다시 보냄(#101828 빠지고 #3366ff 들어감) · 그동안 읽는 중', pvs.length === n0 + 1 && last.tokens.some((tk) => String(tk.value).toLowerCase() === '#3366ff') && !last.tokens.some((tk) => tk.value === '#101828') && (await titles30(p))[1].startsWith('변수가 안 붙은 값') && (await p.$eval('#selCards .sel-card >> nth=1', (e) => e.innerText)).includes('선택을 읽는 중…'), JSON.stringify(last?.tokens?.map((tk) => tk.name)));
  await p.close();
}

{
  // 31 큰 선택(300개 넘음) · 로컬 변수 0개 — [읽기]를 누르면 만들기 카드도 읽는다(찾기 APPLY 진행 중이라 미룬 추출을 찾기가 끝난 뒤 보냄 — "선택을 읽는 중…"에 멈추지 않음)
  const p = await open(560, 'select');
  await recv(p, { type: 'LICENSE_STATUS', tier: 'free', unlimited: false, source: 'dev' });
  await recv(p, { ...PREREQ, hasBindable: false, tierVars: 0, otherVars: 0 });
  await recv(p, { type: 'VAR_TABLE', collections: [], vars: [] });
  await recv(p, { ...sel(1, 0), scanned: 4000, ids: ['big1'], firstName: 'PC_main_BK' });
  await p.waitForTimeout(450);
  check('31 큰 선택 — 자동으로 읽지 않음([읽기] 카드 · 추출 없음)', (await p.$('[data-k="read"]')) !== null && (await sent(p, 'EXTRACT')).length === 0);
  await p.click('[data-k="read"]');
  await p.waitForTimeout(30);
  await recv(p, usageResult((await sent(p, 'SCAN_USAGE')).at(-1).reqId, {}));
  const ap = (await sent(p, 'APPLY')).at(-1);
  await recv(p, { ...preview(ap.reqId), candidates: [], bound: 0, counts: { 'no-match': { gap: 2, color: 2 } } });
  const pt = (await sent(p, 'PREVIEW_TEXT_STYLES')).at(-1);
  if (pt) await recv(p, tsPrev(pt.reqId));
  await p.waitForTimeout(40);
  const ex = (await sent(p, 'EXTRACT')).at(-1);
  check('31 [읽기] 뒤 — 만들기 카드 추출 EXTRACT{기준} 보냄', !!ex && ex.nodeIds?.[0] === 'big1', String((await sent(p, 'EXTRACT')).length));
  if (ex) await cardAnswer(p);
  check('31 [읽기] 뒤 — 카드가 "선택을 읽는 중…"에 멈추지 않고 값 줄을 그림', (await cardRows(p)).length === 4 && !(await cardText(p)).includes('선택을 읽는 중'), await cardText(p).catch(() => ''));
  await p.close();
}

{
  // 9v V PR(ia-v4 §4.6 "목록 줄 — V1 뒤" · V-D5 · §4.1 머리 줄 U-b · §8 · B.17) — 줄 모양 · 붙은 칩 · 특수한 경우 · 라이브러리 값 다시 그리기(미루기 · 포커스) · 그룹 · 사이드바 · 글자 · 폭
  const VC = [
    { id: 'g', name: 'Global', tier: 1, modes: [{ modeId: 'm', name: 'Mode 1' }], defaultModeId: 'm' },
    { id: 's', name: 'Semantic', tier: 2, modes: [{ modeId: 'l', name: 'Light' }, { modeId: 'd', name: 'Dark' }], defaultModeId: 'l' },
    { id: 'c', name: 'Comp', tier: 3, modes: [{ modeId: 'k', name: 'Mode 1' }], defaultModeId: 'k' },
  ];
  const Cc = (hex, alpha) => (alpha != null ? { kind: 'color', hex, alpha } : { kind: 'color', hex });
  const Al = (aliasId, aliasName, remote) => ({ kind: 'alias', aliasId, aliasName, ...(remote ? { remote: true } : {}) });
  const gv = (id, name, type, cell, scopes = []) => ({ id, name, collectionId: 'g', type, values: { m: cell }, scopes, description: '' });
  const sv = (id, name, type, cell, scopes = []) => ({ id, name, collectionId: 's', type, values: { l: cell, d: cell }, scopes, description: '' });
  const cv = (id, name, type, cell, scopes = []) => ({ id, name, collectionId: 'c', type, values: { k: cell }, scopes, description: '' });
  const VV = [
    gv('vsp16', 'spacing/16', 'FLOAT', { kind: 'number', text: '16' }, ['GAP']), gv('vsp24', 'spacing/24', 'FLOAT', { kind: 'number', text: '24' }, ['GAP']),
    gv('vg0', 'color/gray/0', 'COLOR', Cc('#FFFFFF')), gv('vg9', 'color/gray/900', 'COLOR', Cc('#101828')), gv('vga', 'color/gray/900-a50', 'COLOR', Cc('#101828', 128 / 255)),
    gv('vgx', 'color/gray/almost', 'COLOR', Cc('#101828', 254 / 255)),
    gv('vgl', 'color/gray/brand-accent', 'COLOR', Al('L2', 'Brand/color/accent', true)), gv('vgd', 'color/gray/gone', 'COLOR', Al('zz', '(삭제된 변수)')),
    gv('vff', 'font-family/base', 'STRING', { kind: 'string', text: 'Inter' }, ['FONT_FAMILY']),
    sv('vbg', 'color/background/default', 'COLOR', Al('vg0', 'color/gray/0')),
    sv('vlong', 'color/background/disabled-on-inverse-surface-with-a-very-long-name-for-ellipsis', 'COLOR', Al('vg9', 'color/gray/900')),
    sv('vscr', 'color/background/scrim', 'COLOR', Al('vga', 'color/gray/900-a50')), sv('vhov', 'color/background/hover', 'COLOR', Cc('#101828', 20 / 255)),
    sv('vlp', 'color/background/primary', 'COLOR', Al('L1', 'Brand/color/primary', true)), sv('vla', 'color/background/accent', 'COLOR', Al('L2', 'Brand/color/accent', true)),
    sv('vdl', 'color/background/legacy', 'COLOR', Al('zz', '(삭제된 변수)')),
    { id: 'vnp', name: 'color/background/pressed', collectionId: 's', type: 'COLOR', values: { d: Cc('#53389E') }, scopes: [], description: '' },
    sv('vcg', 'spacing/card/gap', 'FLOAT', Al('vsp16', 'spacing/16'), ['GAP']), sv('vfb', 'spacing/card/family', 'STRING', Al('vff', 'font-family/base')),
    sv('vdn', 'spacing/card/dense', 'BOOLEAN', { kind: 'bool', text: 'false' }),
    cv('vpx', 'button/padding-x', 'FLOAT', { kind: 'number', text: '12' }, ['GAP']),
  ];
  const LIB1 = [{ id: 'L1', name: 'Brand/color/primary', collection: 'Brand', type: 'COLOR', value: Cc('#7F56D9'), aliasTargets: [] }];
  const p = await open(560, 'variables');
  await recv(p, { type: 'LICENSE_STATUS', tier: 'paid', unlimited: true, source: 'dev' });
  await recv(p, PREREQ);
  await recv(p, { type: 'VAR_TABLE', collections: VC, vars: VV });
  await p.click('#varSide [data-key="side:col:s"]');
  const rowOf = (id) => p.$eval(`.vt-row[data-id="${id}"]`, (c) => {
    const r = c.parentElement; const cs = getComputedStyle(c); const rs = getComputedStyle(r);
    const nm = c.querySelector('.nm'); const t = c.querySelector('.nm .t'); const chip = c.querySelector('.vchip');
    const al = chip.querySelector('.al'); const vl = chip.querySelector('.vl'); const sw = c.querySelector('.vr-sw'); const mk = c.querySelector('.vr-mk');
    const R = (e) => e.getBoundingClientRect();
    return {
      rowRole: r.getAttribute('role'), rowKey: r.dataset.key ?? null, cellRole: c.getAttribute('role'), cells: r.querySelectorAll('[role=gridcell]').length,
      h: Math.round(R(r).height), cellH: Math.round(R(c).height), rowBorder: rs.borderBottomWidth, cellBorder: cs.borderBottomWidth, cursor: cs.cursor,
      nameRight: Math.round(R(nm).right), chipLeft: Math.round(R(chip).left), chipRight: Math.round(R(chip).right), cellRight: Math.round(R(c).right), chipH: Math.round(R(chip).height),
      nowrap: getComputedStyle(t).whiteSpace === 'nowrap', ellipsis: getComputedStyle(t).textOverflow === 'ellipsis', clipped: t.scrollWidth > t.clientWidth, nameH: Math.round(R(t).height),
      al: al?.textContent ?? null, vl: vl?.textContent ?? null, vlClipped: vl ? vl.scrollWidth > vl.clientWidth : null,
      sw: sw ? { bg: sw.style.background, ck: sw.classList.contains('ck'), border: getComputedStyle(sw).borderTopWidth + ' ' + getComputedStyle(sw).borderTopColor, w: Math.round(R(sw).width) } : null,
      mk: mk?.textContent ?? null, aria: c.getAttribute('aria-label'), title: c.title, x: Math.round(R(c).left),
    };
  });
  const bg = await rowOf('vbg');
  check('9v 줄 — row 안 gridcell 하나(포커스 · data-key는 gridcell) · 높이 32 · 구분선 없음 · cursor pointer', bg.rowRole === 'row' && bg.rowKey === null && bg.cellRole === 'gridcell' && bg.cells === 1 && bg.h === 32 && bg.cellH === 32 && bg.rowBorder === '0px' && bg.cellBorder === '0px' && bg.cursor === 'pointer', JSON.stringify(bg));
  check('9v 별칭 줄 — 칩 옅은 칸 "→ gray/0" + 짙은 칸 "#FFFFFF" · 칩 높이 20 · 오른쪽 끝 · 이름 남는 폭(이름 끝 + 4 = 칩 시작)', bg.al === '→ gray/0' && bg.vl === '#FFFFFF' && bg.chipH === 20 && bg.chipRight === bg.cellRight && bg.nameRight + 4 === bg.chipLeft, JSON.stringify(bg));
  check('9v 동그라미 16 · 테두리 1px 검정', bg.sw?.w === 16 && bg.sw.border === '1px rgb(0, 0, 0)', JSON.stringify(bg.sw));
  check('9v 별칭 줄 접근성 이름 "{전체 이름}, {값 글}, → {대상 전체 이름}" · 툴팁 "{전체 이름} / → {대상}"', bg.aria === 'color/background/default, #FFFFFF, → color/gray/0' && bg.title === 'color/background/default / → color/gray/0', `${bg.aria} | ${bg.title}`);
  const lg = await rowOf('vlong');
  check('9v 긴 이름 — 한 줄(nowrap) · 말줄임 · 줄 높이 32 그대로 · 칩 오른쪽 끝', lg.nowrap && lg.ellipsis && lg.clipped && lg.nameH === 16 && lg.h === 32 && lg.chipRight === lg.cellRight && lg.nameRight + 4 === lg.chipLeft, JSON.stringify(lg));
  const scr = await rowOf('vscr');
  const hov = await rowOf('vhov');
  check('9v 투명도 50% — 짙은 칸 "#101828 50%" 잘림 없음 · 동그라미 바둑판', scr.vl === '#101828 50%' && scr.vlClipped === false && scr.sw.ck, JSON.stringify(scr));
  check('9v 직접 값 8% — 짙은 칸만 "#101828 8%" · 접근성 이름 값 글(V-P2)', hov.al === null && hov.vl === '#101828 8%' && hov.aria === 'color/background/hover, #101828 8%' && hov.title === 'color/background/hover / #101828 8%', JSON.stringify(hov));
  const la = await rowOf('vla');
  const dl = await rowOf('vdl');
  check('9v libVars에 없는 라이브러리 대상 — 옅은 칸 "→ color/accent"만 · 빈 원 · 접근성 이름 값 없음', la.al === '→ color/accent' && la.vl === null && la.sw.bg === 'transparent' && !la.sw.ck && la.aria === 'color/background/accent, → Brand/color/accent', JSON.stringify(la));
  check('9v 삭제된 대상 — 옅은 칸 "→ (삭제된 변수)"만 · 빈 원', dl.al === '→ (삭제된 변수)' && dl.vl === null && dl.sw.bg === 'transparent' && dl.aria === 'color/background/legacy, → (삭제된 변수)', JSON.stringify(dl));
  const np = await rowOf('vnp');
  check('9v 셀 없음 — 짙은 칸 "—" · 빈 원 · 접근성 이름 "—"', np.al === null && np.vl === '—' && np.sw.bg === 'transparent' && np.aria === 'color/background/pressed, —', JSON.stringify(np));
  const cg = await rowOf('vcg');
  const fb = await rowOf('vfb');
  const dn = await rowOf('vdn');
  check('9v 색 아닌 줄 — 종류 표시 # · Aa · ✓ · 짙은 칸 값(별칭은 따라간 값)', cg.mk === '#' && cg.al === '→ spacing/16' && cg.vl === '16' && cg.sw === null && fb.mk === 'Aa' && fb.vl === 'Inter' && dn.mk === '✓' && dn.al === null && dn.vl === 'false', JSON.stringify([cg.mk, cg.al, cg.vl, fb.mk, fb.vl, dn.mk, dn.al, dn.vl]));
  check('9v 색 아닌 별칭 줄 접근성 이름 "spacing/card/gap, 16, → spacing/16"', cg.aria === 'spacing/card/gap, 16, → spacing/16', cg.aria);
  // 그룹 · 묶음
  const grp = await p.evaluate(() => {
    const heads = [...document.querySelectorAll('#varTree > .vt-group')];
    const R = (e) => e.getBoundingClientRect();
    // 줄 x(머리 x 기준): 안쪽 단이 없는 단 1 그룹은 16, 막대 있는 나무는 21 + 9 × (줄 aria-level − 2)(V-D6 "가로 자리").
    return heads.map((h, i) => { const cs = getComputedStyle(h); const g = h.nextElementSibling; const row = g?.querySelector('.vt-row'); const lvl = row ? Number(row.parentElement.getAttribute('aria-level')) : 0; const bar = g?.classList.contains('has-bar'); return { h: Math.round(R(h).height), top: cs.borderTopWidth, first: i === 0, pos: cs.position, fs: cs.fontSize, g: g?.getAttribute('role') ?? null, bar, lvl, dx: row ? Math.round(R(row).left - R(h).left) : null, want: bar ? 21 + 9 * (lvl - 2) : 16, pb: g ? getComputedStyle(g).paddingBottom : null }; });
  });
  check('9v 그룹 머리 32 · 위 1px 선(맨 위는 없음) · 고정 아님 · 12px · 묶음 role 없음(V-P3) · 줄 x = 머리 x + 16(막대 있는 나무는 21 + 9(n − 1)) · 묶음 아래 16', grp.length >= 2 && grp.every((g) => g.h === 32 && g.top === (g.first ? '0px' : '1px') && g.pos !== 'sticky' && g.fs === '12px' && g.g === null && g.dx === g.want && g.pb === '16px'), JSON.stringify(grp));
  // Component — 색 아닌 줄
  await p.click('#varSide [data-key="side:col:c"]');
  const px = await rowOf('vpx');
  check('9v Component button/padding-x — # · 짙은 칸 "12"만', px.mk === '#' && px.al === null && px.vl === '12', JSON.stringify(px));
  // Global — 색은 줄마다 하나, 옅은 칸 없음(따라갈 수 없을 때만 — ⓐ)
  await p.click('#varSide [data-key="side:col:g"]');
  const gshape = await treeShape(p);
  check('9v Global — 알약 묶음 → 색 줄마다 하나 · 옅은 칸 없음 · 따라갈 수 없는 별칭만 옅은 칸 + 짙은 칸 숨김(ⓐ)', JSON.stringify(gshape) === JSON.stringify(['[spacing]', '16,24', '[color]', '>[gray]', '0||#FFFFFF', '900||#101828', '900-a50||#101828 50%', 'almost||#101828', 'brand-accent|→ color/accent|-', 'gone|→ (삭제된 변수)|-', '[font-family]', 'Inter']), JSON.stringify(gshape));
  const gl = await rowOf('vgl');
  check('9v Global 따라갈 수 없는 별칭 — 빈 원', gl.sw.bg === 'transparent' && !gl.sw.ck, JSON.stringify(gl.sw));
  const gx = await rowOf('vgx');
  check('9v 반올림해 100%면 % 없음 · 바둑판 없음', gx.vl === '#101828' && !gx.sw.ck, JSON.stringify(gx));
  const gap8 = await p.evaluate(() => { const l = document.querySelector('#varTree .vp-line.vp-pill'); const r = document.querySelector('#varTree .vt-group + .vt-grp .vp-line + .vt-r') ?? [...document.querySelectorAll('#varTree .vt-grp')].map((g) => g.querySelector(':scope > .vp-line + .vt-r')).find(Boolean); return { pillGap: getComputedStyle(l).columnGap, pillH: Math.round(l.querySelector('.vp-item').getBoundingClientRect().height), pillFs: getComputedStyle(l.querySelector('.vp-item')).fontSize, lineToRow: r ? Math.round(r.getBoundingClientRect().top - r.previousElementSibling.getBoundingClientRect().bottom) : null }; });
  check('9v Global 알약 높이 26 · 11.5px · 사이 6', gap8.pillGap === '6px' && gap8.pillH === 26 && gap8.pillFs === '11.5px', JSON.stringify(gap8));
  // 알약 묶음과 색 줄 사이 8 — 같은 그룹에 둘 다 있는 경우
  await recv(p, { type: 'VAR_TABLE', collections: VC, vars: [...VV, gv('vgn', 'color/gray/weight', 'FLOAT', { kind: 'number', text: '2' })] });
  const mix = await p.evaluate(() => { const r = [...document.querySelectorAll('#varTree .vt-grp > .vp-line + .vt-r')][0]; return r ? Math.round(r.getBoundingClientRect().top - r.previousElementSibling.getBoundingClientRect().bottom) : null; });
  check('9v 같은 그룹 알약 묶음과 색 줄 사이 8', mix === 8, String(mix));
  await recv(p, { type: 'VAR_TABLE', collections: VC, vars: VV });
  // 키보드 — 알약 묶음 안은 ← →
  await p.focus('.vp-item[data-id="vsp16"]');
  await p.keyboard.press('ArrowRight');
  const kr = await p.evaluate(() => document.activeElement?.dataset?.id);
  await p.keyboard.press('ArrowDown');
  const kd = await p.evaluate(() => document.activeElement?.className);
  await p.keyboard.press('ArrowDown');
  const kdi = await p.evaluate(() => document.activeElement?.dataset?.key);
  await p.keyboard.press('ArrowDown');
  const kd2 = await p.evaluate(() => document.activeElement?.dataset?.id);
  check('9v 알약 묶음 안 → · ↓ 그룹 머리(color) · ↓ 안쪽 머리(gray — V-D6) · ↓ 첫 색 줄', kr === 'vsp24' && /vt-group/.test(kd) && kdi === 'g:g|color/gray' && kd2 === 'vg0', JSON.stringify([kr, kd, kdi, kd2]));
  // 격자 간격 8 · 접근성 이름 V-D3
  await p.click('#btnVarMore');
  await p.click('.ctx-menu button >> text=색 격자로 보기');
  const grid = await p.evaluate(() => { const l = document.querySelector('.vp-line.vp-dot'); return { gap: getComputedStyle(l).columnGap, aria: l.querySelector('[data-id="vga"]').getAttribute('aria-label'), ck: !!l.querySelector('[data-id="vga"] .vp-dot.ck') }; });
  check('9v 격자 — 간격 8 · 50% 동그라미 바둑판 · 접근성 이름 값 글', grid.gap === '8px' && grid.ck && grid.aria === 'color/gray/900-a50, #101828 50%', JSON.stringify(grid));
  await p.click('#btnVarMore');
  await p.click('.ctx-menu button >> text=색 목록으로 보기').catch(() => {});
  // 사이드바
  const side = await p.$$eval('#varSide .vs-item', (e) => e.map((x) => { const s = getComputedStyle(x); const b = getComputedStyle(x.querySelector('.vs-badge')); return { sel: x.getAttribute('aria-selected') === 'true', h: Math.round(x.getBoundingClientRect().height), bg: s.backgroundColor, fs: s.fontSize, fw: s.fontWeight, badge: b.backgroundColor, badgeFs: b.fontSize, num: getComputedStyle(x.querySelector('.vs-num')).fontSize }; }));
  check('9v 사이드바 — 항목 28 · 12px · 고른 항목 배경 #ededed · 굵게 · 배지 검정(10px) · 수 11px', side.every((x) => x.h === 28 && x.fs === '12px' && x.badgeFs === '10px' && x.num === '11px') && side.filter((x) => x.sel).every((x) => x.bg === 'rgb(237, 237, 237)' && x.fw === '600' && x.badge === 'rgb(0, 0, 0)') && side.some((x) => x.sel) && side.filter((x) => !x.sel).every((x) => x.fw === '400'), JSON.stringify(side));
  // 11px 아래 글자 0(배지 10px만) · 560 가로 스크롤 0
  const small = await p.evaluate(() => {
    const bad = [];
    const BADGE = /(\.vt-section \.badge|\.tier-chip \.badge|\.vs-badge|\.lib-tag|\.beta-badge|\.bv-new|\.mini-badge|\.tag\b|\.tr-tag|\.pstep \.pdot|\.bs-dot|\.mk-info|\.mk-row \.sw\.n)/;
    for (const sh of document.styleSheets) for (const r of sh.cssRules) {
      const m = r.style && /^([\d.]+)px$/.exec(r.style.fontSize);
      if (!m) continue;
      const v = parseFloat(m[1]);
      if (v < 10 || (v < 11 && !BADGE.test(r.selectorText))) bad.push(`${r.selectorText} ${v}`);
    }
    return { bad, base: getComputedStyle(document.body).fontSize, hs: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  });
  check('9v 기본 글자 12px · 11px 아래 글자 0(배지 10px만) · 560 가로 스크롤 0', small.base === '12px' && small.bad.length === 0 && small.hs === 0, JSON.stringify(small));
  // 라이브러리 값 다시 그리기 — USAGE_RESULT가 오면 새 libVars로(③), 기준이 없어지면(①) · 큰 선택 기준(②)이면 비움
  await p.click('#varSide [data-key="side:col:s"]');
  const vlOf = (id) => p.$eval(`.vt-row[data-id="${id}"] .vchip`, (c) => [c.querySelector('.al')?.textContent ?? '', c.querySelector('.vl')?.textContent ?? '-'].join('|'));
  const usage = async (libs = LIB1) => { const u = (await sent(p, 'SCAN_USAGE')).at(-1); await recv(p, usageResult(u.reqId, { vlp: { places: 1, layers: 1 } }, { libraryVars: libs })); await p.waitForTimeout(30); };
  await recv(p, { ...sel(1, 0), ids: ['v1'] });
  await p.waitForTimeout(450);
  await usage();
  check('9v USAGE_RESULT 뒤 — libVars의 라이브러리 별칭 짙은 칸 "#7F56D9"(다시 그림)', (await vlOf('vlp')) === '→ color/primary|#7F56D9', await vlOf('vlp'));
  await recv(p, { ...sel(1, 0), ids: ['v1'] });
  await p.waitForTimeout(450);
  check('9v 같은 기준 키로 다시 고름 — 값 그대로', (await vlOf('vlp')) === '→ color/primary|#7F56D9', await vlOf('vlp'));
  await recv(p, { ...sel(0, 0), ids: [] });
  await p.waitForTimeout(30);
  check('9v 기준이 없어지면 — 라이브러리 별칭 짙은 칸 숨음(옅은 칸만)', (await vlOf('vlp')) === '→ color/primary|-', await vlOf('vlp'));
  await recv(p, { ...sel(1, 0), ids: ['v2'] });
  await p.waitForTimeout(450);
  await usage();
  await recv(p, { ...sel(1, 0), scanned: 4000, ids: ['big'] });
  await p.waitForTimeout(30);
  check('9v 큰 선택 기준 — 라이브러리 별칭 짙은 칸 숨음', (await vlOf('vlp')) === '→ color/primary|-', await vlOf('vlp'));
  // 읽는 새 기준(④)도 먼저 비움
  await recv(p, { ...sel(1, 0), ids: ['v3'] });
  await p.waitForTimeout(450);
  await usage();
  await recv(p, { ...sel(1, 0), ids: ['v4'] });
  await p.waitForTimeout(30);
  check('9v 읽는 새 기준 — 응답 전 짙은 칸 숨음 · 응답 뒤 다시 보임', (await vlOf('vlp')) === '→ color/primary|-' && (await (async () => { await p.waitForTimeout(450); await usage(); return vlOf('vlp'); })()) === '→ color/primary|#7F56D9', await vlOf('vlp'));
  /** 새 기준(libVars 비움) → USAGE_RESULT를 받을 준비. */
  let baseN = 10;
  const freshBase = async () => { await recv(p, { ...sel(1, 0), ids: [`b${baseN++}`] }); await p.waitForTimeout(450); };
  const focusedId = () => p.evaluate(() => document.activeElement?.dataset?.id ?? document.activeElement?.className);
  // 메뉴가 열린 채 USAGE_RESULT → 미룸(그대로) → Esc 뒤 다시 그림 · 포커스 같은 줄
  await freshBase();
  await rightClick(p, '.vt-row[data-id="vbg"]');
  await usage();
  const heldMenu = await vlOf('vlp');
  await p.keyboard.press('Escape');
  await p.waitForTimeout(30);
  check('9v 메뉴 열린 채 USAGE_RESULT — 미룸 · Esc 뒤 다시 그림 · 포커스 같은 줄', heldMenu === '→ color/primary|-' && (await vlOf('vlp')) === '→ color/primary|#7F56D9' && (await focusedId()) === 'vbg', JSON.stringify([heldMenu, await vlOf('vlp'), await focusedId()]));
  // 메뉴 → 상세 → 닫기
  await freshBase();
  await rightClick(p, '.vt-row[data-id="vbg"]');
  await usage();
  await p.click('.ctx-menu button >> text=상세');
  await p.waitForTimeout(30);
  const heldModal = await vlOf('vlp');
  await p.keyboard.press('Escape');
  await p.waitForTimeout(30);
  check('9v 메뉴 열린 채 USAGE_RESULT → 상세 → 닫기 — 팝업 동안 미룸 · 닫은 뒤 다시 그림 · 포커스 같은 줄', heldModal === '→ color/primary|-' && (await p.$('.modal')) === null && (await vlOf('vlp')) === '→ color/primary|#7F56D9' && (await focusedId()) === 'vbg', JSON.stringify([heldModal, await vlOf('vlp'), await focusedId()]));
  // 메뉴 → 삭제 → [취소]
  await freshBase();
  await rightClick(p, '.vt-row[data-id="vbg"]');
  await usage();
  await p.click('.ctx-menu button >> text=삭제');
  await p.waitForTimeout(30);
  await p.click('.modal button >> text=취소');
  await p.waitForTimeout(30);
  check('9v 메뉴 열린 채 USAGE_RESULT → 삭제 → [취소] — 다시 그림 · 포커스 같은 줄', (await vlOf('vlp')) === '→ color/primary|#7F56D9' && (await focusedId()) === 'vbg', JSON.stringify([await vlOf('vlp'), await focusedId()]));
  // 메뉴 → 삭제 → [삭제] → 다음 줄
  await freshBase();
  await rightClick(p, '.vt-row[data-id="vbg"]');
  await usage();
  await p.click('.ctx-menu button >> text=삭제');
  await p.waitForTimeout(30);
  await p.click('.modal button.danger');
  const delV = (await sent(p, 'DELETE_VARIABLE')).at(-1);
  await recv(p, { type: 'VARIABLE_DELETED', reqId: delV.reqId, id: 'vbg' });
  await recv(p, { type: 'VAR_TABLE', collections: VC, vars: VV.filter((v) => v.id !== 'vbg') });
  await p.waitForTimeout(30);
  const afterDel = await focusedId();
  check('9v 메뉴 열린 채 USAGE_RESULT → 삭제 — 포커스 다음 줄', delV.id === 'vbg' && afterDel === 'vlong', String(afterDel));
  await recv(p, { type: 'VAR_TABLE', collections: VC, vars: VV });
  // USAGE_RESULT가 온 뒤 우클릭 → Esc · 복제 · 삭제 → [취소] 각각 포커스 같은 줄
  await freshBase();
  await usage();
  await rightClick(p, '.vt-row[data-id="vscr"]');
  await p.keyboard.press('Escape');
  const f1 = await focusedId();
  await rightClick(p, '.vt-row[data-id="vscr"]');
  await p.click('.ctx-menu button >> text=복제');
  await p.waitForTimeout(30);
  const f2 = await focusedId();
  const dup = (await sent(p, 'DUPLICATE_VARIABLE')).at(-1);
  await recv(p, { type: 'VARIABLE_DUPLICATED', reqId: dup.reqId, newId: 'vscr-copy-none' });
  await p.waitForTimeout(20);
  await p.keyboard.press('Escape').catch(() => {});
  await rightClick(p, '.vt-row[data-id="vscr"]');
  await p.click('.ctx-menu button >> text=삭제');
  await p.click('.modal button >> text=취소');
  await p.waitForTimeout(30);
  const f3 = await focusedId();
  check('9v USAGE_RESULT 뒤 우클릭 → Esc · 복제 · 삭제 → [취소] 각각 포커스 같은 줄', f1 === 'vscr' && f2 === 'vscr' && f3 === 'vscr', JSON.stringify([f1, f2, f3]));
  // Tab으로 들어온 줄 포커스 — 다시 그린 뒤에도 같은 줄
  await freshBase();
  await p.focus('#varSide .vs-item[aria-selected="true"]');
  await p.keyboard.press('Tab');
  for (let i = 0; i < 6; i++) await p.keyboard.press('ArrowDown');
  const tabbed = await focusedId();
  await usage();
  check('9v Tab · 화살표로 온 줄 포커스 — 다시 그린 뒤 같은 줄', !!tabbed && (await focusedId()) === tabbed && (await vlOf('vlp')) === '→ color/primary|#7F56D9', JSON.stringify([tabbed, await focusedId()]));
  // 메뉴 열린 채 USAGE_RESULT → 다른 줄 클릭 → 그 변수로 APPLY_VARIABLE 한 번, 그 뒤 다시 그림
  await freshBase();
  await rightClick(p, '.vt-row[data-id="vbg"]');
  await usage();
  const nApply = (await sent(p, 'APPLY_VARIABLE')).length;
  await p.click('.vt-row[data-id="vhov"]');
  await p.waitForTimeout(40);
  const ap9 = await sent(p, 'APPLY_VARIABLE');
  check('9v 메뉴 열린 채 USAGE_RESULT → 다른 줄 클릭 — APPLY_VARIABLE 한 번(그 변수) · 다시 그림', ap9.length === nApply + 1 && ap9.at(-1).id === 'vhov' && (await vlOf('vlp')) === '→ color/primary|#7F56D9', JSON.stringify([ap9.length - nApply, ap9.at(-1)?.id, await vlOf('vlp')]));
  await recv(p, { type: 'VARIABLE_APPLIED', reqId: ap9.at(-1).reqId, applied: 1, skipped: 0, skipReasons: {}, name: 'color/background/hover' });
  // 포인터 눌림 동안 미룸 — 끌어서 바깥에서 뗌 · 우클릭 뒤에도 다시 그림
  await freshBase();
  const box = await p.$eval('.vt-row[data-id="vhov"]', (e) => { const r = e.getBoundingClientRect(); return { x: r.left + 20, y: r.top + 10 }; });
  await p.mouse.move(box.x, box.y);
  await p.mouse.down();
  await usage();
  const heldPtr = await vlOf('vlp');
  await p.mouse.move(box.x, 4, { steps: 3 });
  await p.mouse.up();
  await p.waitForTimeout(30);
  check('9v 포인터 눌림 동안 미룸 · 끌어서 바깥에서 뗀 뒤 다시 그림', heldPtr === '→ color/primary|-' && (await vlOf('vlp')) === '→ color/primary|#7F56D9', JSON.stringify([heldPtr, await vlOf('vlp')]));
  await freshBase();
  await p.mouse.move(box.x, box.y);
  await p.mouse.down({ button: 'right' });
  await usage();
  const heldR = await vlOf('vlp');
  await p.mouse.up({ button: 'right' });
  await p.waitForTimeout(30);
  await p.keyboard.press('Escape');
  await p.waitForTimeout(30);
  check('9v 우클릭(누름 동안 미룸) 뒤 다시 그림', heldR === '→ color/primary|-' && (await vlOf('vlp')) === '→ color/primary|#7F56D9', JSON.stringify([heldR, await vlOf('vlp')]));
  check('9v 카드 안 카드 0(변수 탭)', (await nestedCards(p)).length === 0, JSON.stringify(await nestedCards(p)));
  await p.close();
}
{
  // 9v 선택 탭 머리 줄(§4.1 U-b) — 긴 이름 + 기준 다름: 높이 32 · 이름 말줄임 · "지금 선택과 달라요 · [기준 바꾸기]" 한 줄
  const p = await open(560, 'select');
  await recv(p, PREREQ);
  await recv(p, { type: 'VAR_TABLE', collections: COLS, vars: VARS });
  await recv(p, { ...sel(1, 0), ids: ['h1'], firstName: 'Flightin website — 홈 화면 · 로그인 상태 · 결제 단계 3 / 모바일 시안 / 아주 긴 이름' });
  await p.waitForTimeout(450);
  await recv(p, { ...sel(1, 0), ids: ['h2'], firstName: 'Footer', selfSelect: true });
  await p.waitForTimeout(60);
  const hd = await p.$eval('.sel-head', (h) => { const b = h.querySelector('b'); const d = h.querySelector('.sel-diff'); const R = (e) => e.getBoundingClientRect(); return { h: Math.round(R(h).height), wrap: getComputedStyle(h).flexWrap, clipped: b.scrollWidth > b.clientWidth, nameW: Math.round(R(b).width), diff: !!d, diffH: d ? Math.round(R(d).height) : 0, diffRight: d ? Math.round(R(d).right) : 0, headRight: Math.round(R(h).right) }; });
  check('9v 선택 탭 머리 줄 — 긴 이름 + 기준 다름: 높이 32 · nowrap · 이름 말줄임(200 넘게 씀) · 기준 다름 한 줄 오른쪽 끝', hd.h === 32 && hd.wrap === 'nowrap' && hd.clipped && hd.nameW > 200 && hd.diff && hd.diffH <= 24 && hd.diffRight === hd.headRight, JSON.stringify(hd));
  await p.close();
}

{
  // 9d V-D6(ia-v4 §4.6 "그룹 — 경로 마디마다 머리(V-D6)" · V-P3–V-P9 · §4.8 · B.17 "V-D6 추가 구현") — 단 나누기 · 단마다 접기 · 세로 선 · 가로 자리 · 접근성 · 키보드 · 포커스 · 검색
  const DC = [
    { id: 'g', name: 'Global', tier: 1, modes: [{ modeId: 'm', name: 'Mode 1' }], defaultModeId: 'm' },
    { id: 's', name: 'Semantic', tier: 2, modes: [{ modeId: 'l', name: 'Light' }, { modeId: 'd', name: 'Dark' }], defaultModeId: 'l' },
  ];
  const Cc = (hex) => ({ kind: 'color', hex });
  const Al = (aliasId, aliasName) => ({ kind: 'alias', aliasId, aliasName });
  const gv = (id, name, type, cell, scopes = []) => ({ id, name, collectionId: 'g', type, values: { m: cell }, scopes, description: '' });
  const sv = (id, name, type, cell, scopes = []) => ({ id, name, collectionId: 's', type, values: { l: cell, d: cell }, scopes, description: '' });
  const DV = [
    gv('dsp16', 'spacing/16', 'FLOAT', { kind: 'number', text: '16' }, ['GAP']), gv('dsp24', 'spacing/24', 'FLOAT', { kind: 'number', text: '24' }, ['GAP']),
    gv('dg0', 'color/gray/0', 'COLOR', Cc('#FFFFFF')), gv('dg9', 'color/gray/900', 'COLOR', Cc('#101828')),
    gv('db5', 'color/blue/500', 'COLOR', Cc('#2E90FA')), gv('db6', 'color/blue/600', 'COLOR', Cc('#1570EF')),
    gv('dff', 'font-family/base', 'STRING', { kind: 'string', text: 'Inter' }, ['FONT_FAMILY']),
    sv('dcv', 'canvas', 'COLOR', Al('dg0', 'color/gray/0')),
    sv('dsu', 'color/surface', 'COLOR', Al('dg0', 'color/gray/0')),
    sv('dbd', 'color/background/default', 'COLOR', Al('dg0', 'color/gray/0')), sv('dbs', 'color/background/subtle', 'COLOR', Al('dg9', 'color/gray/900')),
    sv('dtd', 'color/text/default', 'COLOR', Al('dg9', 'color/gray/900')),
    sv('dhd', 'color/brand/primary/hover/default', 'COLOR', Al('dg0', 'color/gray/0')),
    sv('dhs', 'color/brand/primary/hover/strong-emphasis-on-inverse-dark-surface-pressed', 'COLOR', Al('db6', 'color/blue/600')),
    sv('ddp', 'a/b/c/d/e/f/deep', 'COLOR', Al('db6', 'color/blue/600')),
    sv('dcg', 'spacing/card/gap', 'FLOAT', Al('dsp16', 'spacing/16'), ['GAP']),
    sv('drc', 'radius/card', 'FLOAT', { kind: 'number', text: '8' }, ['CORNER_RADIUS']),
  ];
  const p = await open(560, 'variables');
  await recv(p, { type: 'LICENSE_STATUS', tier: 'paid', unlimited: true, source: 'dev' });
  await recv(p, PREREQ);
  await recv(p, { type: 'VAR_TABLE', collections: DC, vars: DV });
  await p.click('#varSide [data-key="side:col:g"]');
  const heads = () => p.$$eval('#varTree .vt-group', (e) => e.map((h) => [h.dataset.key, h.getAttribute('aria-level'), h.getAttribute('aria-expanded'), h.title]));
  const act = () => p.evaluate(() => document.activeElement?.dataset?.key ?? document.activeElement?.id ?? null);
  const stop = () => p.evaluate(() => document.querySelector('#varTree [tabindex="0"]')?.dataset?.key ?? null);
  const clickHead = (k) => p.click(`#varTree .vt-group[data-key="g:${k.includes('|') ? k : `g|${k}`}"]`);
  const more = async (label) => { await p.click('#btnVarMore'); await p.click(`.ctx-menu button >> text=${label}`); };
  /** 자리 재기 — 오른쪽 목록 왼쪽 끝 0 기준. 선(::before)이 있는 묶음 · 머리 · 줄 · 알약 묶음. */
  const geo = () => p.evaluate(() => {
    const T = document.getElementById('varTree').getBoundingClientRect();
    const X = (v) => Math.round((v - T.left) * 10) / 10;
    const border = getComputedStyle(document.documentElement).getPropertyValue('--border').trim();
    const probe = document.createElement('i'); probe.style.background = border; document.body.appendChild(probe); const borderRgb = getComputedStyle(probe).backgroundColor; probe.remove();
    const grps = [...document.querySelectorAll('#varTree .vt-grp')].map((g) => {
      const s = getComputedStyle(g, '::before'); const r = g.getBoundingClientRect();
      const kids = [...g.children]; const head = g.previousElementSibling;
      const has = s.content !== 'none' && s.content !== 'normal';
      const contentH = kids.length ? kids.at(-1).getBoundingClientRect().bottom - kids[0].getBoundingClientRect().top : 0;
      return { key: head?.classList.contains('vt-group') ? head.dataset.key : 'top', cls: g.className, role: g.getAttribute('role'), bar: has,
        x: has ? X(r.left + parseFloat(s.left)) : null, w: has ? parseFloat(s.width) : null, h: has ? Math.round(r.height - parseFloat(s.top) - parseFloat(s.bottom)) : null,
        contentH: Math.round(contentH), bg: has ? s.backgroundColor : null, bw: has ? s.borderTopWidth + ' ' + s.borderLeftWidth : null, radius: has ? s.borderTopLeftRadius : null, borderRgb };
    });
    const hs = [...document.querySelectorAll('#varTree .vt-group')].map((h) => { const cs = getComputedStyle(h); const r = h.getBoundingClientRect(); return { key: h.dataset.key, x: X(r.left), tw: X(h.querySelector('.tw').getBoundingClientRect().left), right: X(r.right), h: Math.round(r.height), bt: cs.borderTopWidth, pl: cs.paddingLeft }; });
    const rows = Object.fromEntries([...document.querySelectorAll('#varTree .vt-row')].map((c) => { const r = c.getBoundingClientRect(); const t = c.querySelector('.nm .t'); return [c.dataset.id, { x: X(r.left), w: Math.round(r.width * 10) / 10, right: X(r.right), lvl: c.parentElement.getAttribute('aria-level'), name: Math.round(c.querySelector('.nm').getBoundingClientRect().width * 10) / 10, clipped: t.scrollWidth > t.clientWidth }]; }));
    const lines = [...document.querySelectorAll('#varTree .vp-line')].map((l) => ({ first: l.querySelector('.vp-item')?.dataset.id, x: X(l.getBoundingClientRect().left), lvl: l.getAttribute('aria-level') }));
    return { grps, hs, rows, lines, hscroll: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  });
  const G = (g, key) => g.grps.find((x) => x.key === key);
  const H = (g, key) => g.hs.find((x) => x.key === key);

  // 단 나누기 · 순서 · 키 · 툴팁(V-P7 · V-P8)
  const gs = await treeShape(p);
  check('9d Global — 경로 마디마다 머리(color › gray · blue) · 단 안 바로 든 변수 → 아래 단 · 종류 순서', JSON.stringify(gs) === JSON.stringify(['[spacing]', '16,24', '[color]', '>[gray]', '0||#FFFFFF', '900||#101828', '>[blue]', '500||#2E90FA', '600||#1570EF', '[font-family]', 'Inter']), JSON.stringify(gs));
  const gh = await heads();
  check('9d 접기 키 `{컬렉션 id}|{그 단까지의 경로}` · aria-level 단 · 머리 툴팁 경로 전체(V-P8)', JSON.stringify(gh) === JSON.stringify([['g:g|spacing', '1', 'true', 'spacing'], ['g:g|color', '1', 'true', 'color'], ['g:g|color/gray', '2', 'true', 'color/gray'], ['g:g|color/blue', '2', 'true', 'color/blue'], ['g:g|font-family', '1', 'true', 'font-family']]), JSON.stringify(gh));
  check('9d 머리 글은 마디 하나(V-P8)', JSON.stringify(await p.$$eval('#varTree .vt-group .lb', (e) => e.map((x) => x.textContent))) === JSON.stringify(['spacing', 'color', 'gray', 'blue', 'font-family']));
  // 접근성(V-P3)
  const aria = await p.evaluate(() => ({ role: document.getElementById('varTree').getAttribute('role'), grpRoles: [...document.querySelectorAll('#varTree .vt-grp')].map((g) => g.getAttribute('role')), row: document.querySelector('.vt-row[data-id="dg0"]').parentElement.getAttribute('aria-level'), pill: document.querySelector('.vp-item[data-id="dsp16"]').closest('.vp-line').getAttribute('aria-level'), ff: document.querySelector('.vp-item[data-id="dff"]').closest('.vp-line').getAttribute('aria-level') }));
  check('9d #varTree treegrid · 단 묶음 role 없음 · aria-level 줄 = 단 + 1 · 알약 묶음 = 단 + 1', aria.role === 'treegrid' && aria.grpRoles.every((r) => r === null) && aria.row === '3' && aria.pill === '2' && aria.ff === '2', JSON.stringify(aria));
  // 가로 자리 · 세로 선(Global)
  let g = await geo();
  const brd = g.grps[0].borderRgb;
  const sp = G(g, 'g:g|spacing'); const co = G(g, 'g:g|color'); const gr = G(g, 'g:g|color/gray'); const bl = G(g, 'g:g|color/blue');
  check('9d 안쪽 단 없는 단 1 그룹(spacing · font-family) — 선 0 · 알약 x 16', !sp.bar && !G(g, 'g:g|font-family').bar && g.lines.find((l) => l.first === 'dsp16').x === 16 && g.lines.find((l) => l.first === 'dff').x === 16, JSON.stringify([sp, g.lines]));
  check('9d 안쪽 단 있는 나무 — 모든 단에 선(color · gray · blue)', co.bar && gr.bar && bl.bar, JSON.stringify([co, gr, bl]));
  check('9d 선 — 폭 1 · 배경 --border · 테두리 0 · 반경 0', [co, gr, bl].every((x) => x.w === 1 && x.bg === brd && x.bw === '0px 0px' && x.radius === '0px'), JSON.stringify([co, gr, bl, brd]));
  check('9d 선 x 12(단 1) · 21(단 2) · 선 → 다음 선 8 · 선 → 줄 8', co.x === 12 && gr.x === 21 && bl.x === 21 && gr.x - (co.x + 1) === 8 && g.rows.dg0.x - (gr.x + 1) === 8, JSON.stringify([co.x, gr.x, bl.x, g.rows.dg0.x]));
  check('9d 선 길이 = 내용 높이 − 16', [co, gr, bl].every((x) => x.h === x.contentH - 16), JSON.stringify([co, gr, bl].map((x) => [x.key, x.h, x.contentH])));
  check('9d 단 2 줄 x 30 · 오른쪽 끝 400 · 폭 370 · aria-level 3', g.rows.dg0.x === 30 && g.rows.dg0.right === 400 && g.rows.dg0.w === 370 && g.rows.db6.x === 30 && g.rows.dg0.lvl === '3', JSON.stringify(g.rows.dg0));
  const ih = H(g, 'g:g|color/gray');
  check('9d 안쪽 머리 32 · 위 선 0 · 왼쪽 여백 0 · x 21(▾ 칸 왼쪽 끝 = 단 2 선 x) · 오른쪽 끝 400', ih.h === 32 && ih.bt === '0px' && ih.pl === '0px' && ih.x === 21 && ih.tw === 21 && ih.right === 400, JSON.stringify(ih));
  check('9d 단 1 머리 ▾ 칸 x 8 · 위 1px 선(맨 위 머리는 0)', H(g, 'g:g|color').tw === 8 && H(g, 'g:g|color').bt === '1px' && H(g, 'g:g|spacing').bt === '0px', JSON.stringify(g.hs));
  // 단마다 따로 접기
  await clickHead('color/gray');
  let sh = await treeShape(p);
  g = await geo();
  check('9d gray 접음 → gray 아래만 숨음 · blue 그대로 · color 선 그대로', JSON.stringify(sh) === JSON.stringify(['[spacing]', '16,24', '[color]', '>[gray]', '>[blue]', '500||#2E90FA', '600||#1570EF', '[font-family]', 'Inter']) && G(g, 'g:g|color').bar, JSON.stringify(sh));
  await clickHead('color/blue');
  g = await geo();
  check('9d gray · blue 모두 접어도 color 선 그대로(나무 모양으로 정함) · 길이 = 내용 높이 − 16', G(g, 'g:g|color').bar && G(g, 'g:g|color').h === G(g, 'g:g|color').contentH - 16, JSON.stringify(G(g, 'g:g|color')));
  await clickHead('color/blue');
  await clickHead('color');
  sh = await treeShape(p);
  check('9d color 접음 → gray · blue 머리와 줄 모두 숨음', JSON.stringify(sh) === JSON.stringify(['[spacing]', '16,24', '[color]', '[font-family]', 'Inter']), JSON.stringify(sh));
  await clickHead('color');
  check('9d color 폄 → gray는 접힌 채 · blue는 펴진 채', JSON.stringify((await heads()).map((h) => h[2])) === JSON.stringify(['true', 'true', 'false', 'true', 'true']), JSON.stringify(await heads()));
  await clickHead('color/gray');
  // ⋯ 모두 접기 → 단 1 머리만 · 하나 펴면 아래 단 접힌 채
  await more('사이드바 모두 접기');
  check('9d ⋯ 모두 접기 → 단 1 머리만', JSON.stringify(await heads()) === JSON.stringify([['g:g|spacing', '1', 'false', 'spacing'], ['g:g|color', '1', 'false', 'color'], ['g:g|font-family', '1', 'false', 'font-family']]), JSON.stringify(await heads()));
  await clickHead('color');
  check('9d 하나 펴면 아래 단은 접힌 채', JSON.stringify((await heads()).map((h) => [h[0], h[2]])) === JSON.stringify([['g:g|spacing', 'false'], ['g:g|color', 'true'], ['g:g|color/gray', 'false'], ['g:g|color/blue', 'false'], ['g:g|font-family', 'false']]), JSON.stringify(await heads()));
  await more('사이드바 모두 펼치기');
  // 키보드(V-P4)
  await p.focus('#varTree .vt-group[data-key="g:g|color"]');
  await p.keyboard.press('ArrowLeft');
  const k1 = [await act(), (await heads())[1][2]];
  await p.keyboard.press('ArrowRight');
  const k2 = [await act(), (await heads())[1][2]];
  await p.keyboard.press('ArrowRight');
  const k3 = await act();
  check('9d 머리 ← 접기 · → 펴기 · 펴 있으면 → 내용 첫 줄(안쪽 머리)', k1[0] === 'g:g|color' && k1[1] === 'false' && k2[0] === 'g:g|color' && k2[1] === 'true' && k3 === 'g:g|color/gray', JSON.stringify([k1, k2, k3]));
  await p.keyboard.press('ArrowLeft');
  const k4 = [await act(), (await heads())[2][2]];
  await p.keyboard.press('ArrowLeft');
  const k5 = await act();
  check('9d 안쪽 머리 ← 접기 · 접혔으면 ← 윗단 머리', k4[0] === 'g:g|color/gray' && k4[1] === 'false' && k5 === 'g:g|color', JSON.stringify([k4, k5]));
  await p.keyboard.press('ArrowLeft');
  await p.keyboard.press('ArrowLeft');
  check('9d 접힌 단 1 머리 ← 그대로', (await act()) === 'g:g|color');
  await p.keyboard.press('ArrowRight');
  await p.keyboard.press('ArrowDown');
  await p.keyboard.press('ArrowRight');
  await p.keyboard.press('ArrowRight');
  const k6 = await act();
  await p.keyboard.press('ArrowLeft');
  const k7 = await act();
  check('9d 줄 ← = 담은 머리(gray)', k6 === 'v:dg0' && k7 === 'g:g|color/gray', JSON.stringify([k6, k7]));
  await p.keyboard.press('ArrowUp');
  const u1 = await act();
  const seq = [];
  for (let i = 0; i < 4; i++) { await p.keyboard.press('ArrowDown'); seq.push(await act()); }
  check('9d ↑ ↓ 모든 단 머리를 한 줄로(gray ↑ color · ↓ gray · 0 · 900 · blue)', u1 === 'g:g|color' && JSON.stringify(seq) === JSON.stringify(['g:g|color/gray', 'v:dg0', 'v:dg9', 'g:g|color/blue']), JSON.stringify([u1, seq]));
  await p.focus('.vp-item[data-id="dsp24"]');
  await p.keyboard.press('ArrowLeft');
  const pk1 = await act();
  await p.keyboard.press('ArrowLeft');
  const pk2 = await act();
  check('9d 알약 묶음 ← 앞 알약 · 첫 항목 ← 담은 머리', pk1 === 'v:dsp16' && pk2 === 'g:g|spacing', JSON.stringify([pk1, pk2]));
  // 포커스(V-P5) — 이름이 바뀌어 접힌 단 아래로 감 → 보이는 가장 바깥의 접힌 윗단 머리
  await clickHead('color/blue');
  await p.focus('.vt-row[data-id="dg0"]');
  await p.keyboard.press('ArrowDown');
  await recv(p, { type: 'VAR_TABLE', collections: DC, vars: DV.map((v) => (v.id === 'dg9' ? { ...v, name: 'color/blue/900' } : v)) });
  check('9d VAR_TABLE로 접힌 단 아래로 감 → 포커스 · 정지점이 접힌 blue 머리', (await act()) === 'g:g|color/blue' && (await stop()) === 'g:g|color/blue', JSON.stringify([await act(), await stop()]));
  await recv(p, { type: 'VAR_TABLE', collections: DC, vars: DV });
  await clickHead('color/blue');
  // ⋯ 모두 접기에 포커스 줄이 숨음 → 정지점이 보이는 가장 바깥의 접힌 윗단 머리(color)
  await p.focus('.vt-row[data-id="dg0"]');
  await p.keyboard.press('ArrowDown');
  await more('사이드바 모두 접기');
  check('9d ⋯ 모두 접기로 포커스 줄이 숨음 → 정지점 = 보이는 가장 바깥의 접힌 윗단 머리(color)', (await stop()) === 'g:g|color', String(await stop()));
  // 상세에서 접힌 단 아래로 이름 고침 → 닫기 → 포커스가 접힌 윗단 머리(§4.8)
  await more('사이드바 모두 펼치기');
  await clickHead('color/blue');
  await p.focus('.vt-row[data-id="dg9"]');
  await p.keyboard.press('Enter');
  await p.fill('.modal input[aria-label="이름(전체 경로)"]', 'color/blue/900');
  await p.click('.modal .m-foot button.primary');
  const up = (await sent(p, 'UPDATE_VARIABLE')).at(-1);
  await recv(p, { type: 'VARIABLE_UPDATED', reqId: up.reqId, ok: true, applied: ['name'] });
  await recv(p, { type: 'VAR_TABLE', collections: DC, vars: DV.map((v) => (v.id === 'dg9' ? { ...v, name: 'color/blue/900' } : v)) });
  await p.click('.modal .m-foot button:not(.primary)');
  check('9d 상세 — 접힌 단 아래로 이름 고침 → 닫기 → 포커스 접힌 blue 머리 · 상태 줄 "지금 목록에 보이지 않아요"', (await act()) === 'g:g|color/blue' && (await p.textContent('#statusText')) === 'color/blue/900은 지금 목록에 보이지 않아요', JSON.stringify([await act(), await p.textContent('#statusText')]));
  await recv(p, { type: 'VAR_TABLE', collections: DC, vars: DV });
  // 새 변수 뒤 모든 윗단 펴짐
  await more('사이드바 모두 접기');
  await p.click('#btnAddVar');
  await p.click('.ctx-menu button >> text=새 변수');
  await p.fill('.modal .ed-field input >> nth=0', 'color/gray/weight');
  await p.fill('.modal .ed-field input >> nth=1', '2');
  await p.click('.modal button >> text=만들기');
  const cv = (await sent(p, 'CREATE_VARIABLE')).at(-1);
  await recv(p, { type: 'VARIABLE_CREATED', reqId: cv.reqId, id: 'dnew' });
  await recv(p, { type: 'VAR_TABLE', collections: DC, vars: [...DV, gv('dnew', 'color/gray/weight', 'FLOAT', { kind: 'number', text: '2' })] });
  const nh = Object.fromEntries((await heads()).map((h) => [h[0], h[2]]));
  check('9d 새 변수 뒤 그 변수로 포커스 · 모든 윗단(color · gray) 펴짐 · 다른 단은 접힌 채', (await act()) === 'v:dnew' && nh['g:g|color'] === 'true' && nh['g:g|color/gray'] === 'true' && nh['g:g|color/blue'] === 'false' && nh['g:g|spacing'] === 'false', JSON.stringify([await act(), nh]));
  await recv(p, { type: 'VAR_TABLE', collections: DC, vars: DV });
  // [→](varJump) — 접힌 color › gray 아래 대상으로 가면 모든 윗단 펴짐
  await clickHead('color/gray');
  await clickHead('color');
  await p.click('#varSide [data-key="side:col:s"]');
  await p.focus('.vt-row[data-id="dbd"]');
  await p.keyboard.press('Enter');
  await p.click('.modal .ed-go >> nth=0');
  await p.waitForTimeout(50);
  const jh = Object.fromEntries((await heads()).map((h) => [h[0], h[2]]));
  check('9d [→] → 대상 줄 포커스 · 모든 윗단(color · gray) 펴짐', (await act()) === 'v:dg0' && jh['g:g|color'] === 'true' && jh['g:g|color/gray'] === 'true', JSON.stringify([await act(), jh]));
  await more('사이드바 모두 펼치기');
  // Semantic — 머리 없는 맨 위 · 막대 없는 단 1 그룹 · 단 4 · 단 6
  await p.click('#varSide [data-key="side:col:s"]');
  const ss = await treeShape(p);
  check('9d Semantic — 머리 없는 맨 위 → 단 1 · color 안 바로 든 surface → 아래 단 · 단 4 경로도 머리 4단(깊이 제한 없음)', ss[0] === 'canvas|→ gray/0|#FFFFFF' && ss.includes('[color]') && ss.indexOf('surface|→ gray/0|#FFFFFF') === ss.indexOf('[color]') + 1 && ss.includes('>[background]') && ss.includes('>[brand]') && ss.includes('>>[primary]') && ss.includes('>>>[hover]') && ss.includes('>>>>>[f]'), JSON.stringify(ss));
  g = await geo();
  const top = G(g, 'top');
  check('9d 머리 없는 맨 위 — 줄 x 8 · 폭 392 · 선 없음 · aria-level 1', !top.bar && g.rows.dcv.x === 8 && g.rows.dcv.w === 392 && g.rows.dcv.lvl === '1', JSON.stringify([top, g.rows.dcv]));
  check('9d 단 1 잎 그룹(radius — 안쪽 단 없음) — 선 0 · 줄 x 16 · 폭 384', !G(g, 'g:s|radius').bar && g.rows.drc.x === 16 && g.rows.drc.w === 384, JSON.stringify([G(g, 'g:s|radius'), g.rows.drc]));
  check('9d 단 1 바로 든 줄(color/surface) x 21 · 폭 379', g.rows.dsu.x === 21 && g.rows.dsu.w === 379, JSON.stringify(g.rows.dsu));
  const hv = G(g, 'g:s|color/brand/primary/hover');
  check('9d 단 3 선 x 30 · 단 4 선 x 39 · 단 4 줄 x 48 · 폭 352 · 오른쪽 끝 400 · 선 길이 = 내용 높이 − 16', G(g, 'g:s|color/brand/primary').x === 30 && hv.x === 39 && g.rows.dhd.x === 48 && g.rows.dhd.w === 352 && g.rows.dhd.right === 400 && g.grps.filter((x) => x.bar).every((x) => x.h === x.contentH - 16), JSON.stringify([G(g, 'g:s|color/brand/primary'), hv, g.rows.dhd]));
  check('9d 깊은 이름 말줄임 · 단 6 경로(x 66)에서도 가로 스크롤 0', g.rows.dhs.clipped && g.rows.ddp.x === 66 && g.hscroll === 0, JSON.stringify([g.rows.dhs, g.rows.ddp, g.hscroll]));
  check('9d 깊은 머리 툴팁 경로 전체 · 글 마디 하나', (await p.getAttribute('#varTree .vt-group[data-key="g:s|color/brand/primary/hover"]', 'title')) === 'color/brand/primary/hover' && (await p.textContent('#varTree .vt-group[data-key="g:s|color/brand/primary/hover"] .lb')) === 'hover');
  await p.focus('.vt-row[data-id="dcv"]');
  await p.keyboard.press('ArrowLeft');
  check('9d 머리 없는 맨 위 줄 ← 그대로', (await act()) === 'v:dcv');
  await more('사이드바 모두 접기');
  check('9d ⋯ 모두 접기 → 머리 없는 맨 위 줄은 그대로 보임 · 단 1 머리만', (await p.$('.vt-row[data-id="dcv"]')) !== null && (await heads()).every((h) => h[1] === '1' && h[2] === 'false'), JSON.stringify(await heads()));
  await more('사이드바 모두 펼치기');
  // 검색(V-P6) — 경로 한 줄 머리 · 선 없음 · 줄 x 16
  await p.fill('#varSearch', 'default');
  g = await geo();
  const sl = await p.$$eval('#varTree .vt-group', (e) => e.map((h) => [h.querySelector('.lb').textContent, h.getAttribute('aria-level')]));
  check('9d 검색 — 경로 한 줄 머리(aria-level 1) · 줄 aria-level 2', sl.some((x) => x[0] === 'S Semantic › color/brand/primary/hover') && sl.every((x) => x[1] === '1') && g.rows.dhd.lvl === '2', JSON.stringify(sl));
  check('9d 검색 묶음 — 선 0 · 줄 x 16 · 폭 384', g.grps.every((x) => !x.bar) && Object.values(g.rows).every((r) => r.x === 16 && r.w === 384), JSON.stringify([g.grps.map((x) => x.cls), g.rows]));
  // 검색 중 "/" 없는 검색 머리 접기 → 검색 지움 → 맨 위 줄 그대로 보임
  await p.fill('#varSearch', 'canvas');
  await clickHead('s|');
  check('9d 검색 중 "/" 없는 검색 머리 접기 → 줄 숨음', (await p.$('.vt-row[data-id="dcv"]')) === null);
  await p.focus('#varSearch');
  await p.keyboard.press('Escape');
  check('9d 검색 지우면 머리 없는 맨 위 줄 그대로 보임(`{컬렉션 id}|` 키 무시)', (await p.$('.vt-row[data-id="dcv"]')) !== null);
  check('9d 카드 안 카드 0(선 · 안쪽 머리 · 묶음은 카드 아님 — §2.8)', (await nestedCards(p)).length === 0, JSON.stringify(await nestedCards(p)));
  await p.close();
}

/* ---------- 32 트리 3화면 변수 목록 모양(IA v4 §2.7 "변수 목록 모양 — TR 뒤" · B.31 · TR-D1–TR-D17 · TR-P4–TR-P23) ---------- */
/** 트리 줄 재기 — x는 트리 왼쪽 끝 기준. */
const trGeo = (p, sel) => p.$eval(sel, (T) => {
  const tl = T.getBoundingClientRect().left;
  const r = (n) => Math.round(n * 10) / 10;
  const probe = (v) => { const d = document.createElement('i'); d.style.color = `var(${v})`; document.body.appendChild(d); const c = getComputedStyle(d).color; d.remove(); return c; };
  const rows = [...T.querySelectorAll(':scope > .tr[data-tkey]')].map((e) => {
    const cs = getComputedStyle(e); const b = e.getBoundingClientRect();
    const lt = e.querySelector(':scope > .tr-lt'); const ch = e.querySelector(':scope > .vchip'); const al = ch?.querySelector('.al'); const vl = ch?.querySelector('.vl');
    const tag = e.querySelector(':scope > .tr-tag, :scope > .bv-new'); const sw = e.querySelector(':scope > .bv-switch'); const ld = e.querySelector(':scope > .tr-lead'); const car = e.querySelector(':scope > .tr-car');
    const nm = e.querySelector(':scope > .tr-name');
    return {
      k: e.dataset.tkey, head: e.classList.contains('tr-head'), off: e.classList.contains('off'), h: r(b.height), mt: cs.marginTop, mb: cs.marginBottom, bb: cs.borderBottomWidth, bt: cs.borderTopWidth, bg: cs.backgroundColor, right: r(b.right - tl),
      txt: e.textContent, car: car?.textContent ?? null, carX: car ? r(car.getBoundingClientRect().left - tl) : null,
      nmX: nm ? r(nm.getBoundingClientRect().left - tl) : null, nmFs: nm ? getComputedStyle(nm).fontSize : null, nmFw: nm ? getComputedStyle(nm).fontWeight : null, nmC: nm ? getComputedStyle(nm).color : null,
      ltX: lt ? r(lt.getBoundingClientRect().left - tl) : null, ltW: lt ? r(lt.getBoundingClientRect().width) : null, ltCut: lt ? lt.scrollWidth > lt.clientWidth + 1 : null, ltTitle: lt?.getAttribute('title') ?? null, ltText: lt?.textContent ?? null,
      ltC: lt ? getComputedStyle(lt).color : null, ltFw: lt ? getComputedStyle(lt).fontWeight : null, ltDeco: lt ? getComputedStyle(lt).textDecorationLine : null,
      chX: ch ? r(ch.getBoundingClientRect().left - tl) : null, chR: ch ? r(ch.getBoundingClientRect().right - tl) : null, chTitle: ch?.getAttribute('title') ?? null,
      al: al?.textContent ?? null, alW: al ? r(al.getBoundingClientRect().width) : null, alCut: al ? al.scrollWidth > al.clientWidth + 1 : null, alTitle: al?.getAttribute('title') ?? null, alC: al ? getComputedStyle(al).color : null, alArrowHidden: al ? al.firstElementChild?.getAttribute('aria-hidden') === 'true' : null,
      vl: vl?.textContent ?? null, vlX: vl ? r(vl.getBoundingClientRect().left - tl) : null, vlBg: vl ? getComputedStyle(vl).backgroundColor : null, vlC: vl ? getComputedStyle(vl).color : null,
      tagX: tag ? r(tag.getBoundingClientRect().left - tl) : null, tagR: tag ? r(tag.getBoundingClientRect().right - tl) : null, tagTitle: tag?.getAttribute('title') ?? null,
      swX: sw ? r(sw.getBoundingClientRect().left - tl) : null, swR: sw ? r(sw.getBoundingClientRect().right - tl) : null, swAria: sw?.getAttribute('aria-label') ?? null,
      ld: ld ? { t: ld.textContent, sw: ld.classList.contains('vr-sw'), ck: ld.classList.contains('ck'), w: r(ld.getBoundingClientRect().width), x: r(ld.getBoundingClientRect().left - tl), bw: getComputedStyle(ld).borderTopWidth, bc: getComputedStyle(ld).borderTopColor, f: getComputedStyle(ld).filter, o: getComputedStyle(ld).opacity } : null,
      bgPos: e.style.backgroundPosition, bgSize: e.style.backgroundSize,
    };
  });
  return { rows, w: r(T.getBoundingClientRect().width), vlike: T.classList.contains('vlike'), hscroll: document.documentElement.scrollWidth > document.documentElement.clientWidth || T.scrollWidth > T.clientWidth,
    text: probe('--text'), text2: probe('--text-2'), muted: probe('--muted'), line: probe('--swatch-line') };
});
const tipWait = (p) => p.evaluate(() => new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res))));
{
  const p = await open(560, 'select');
  await p.setViewportSize({ width: 560, height: 1400 });
  await openSel(p);
  const tc = (nodeId, field, variableId, variableName, v, resolvedType, extra = {}) => ({ nodeId, field, currentValue: v, variableId, variableName, tier: 2, variableValue: v, resolvedType, ...extra });
  const cands = [];
  for (let i = 0; i < 10000; i++) cands.push(tc('b' + i, 'fills', 'bgd', 'color/background/default', '#FFFFFF', 'COLOR', { index: 0 }));
  cands.push(tc('h1', 'fills', 'new:color/brand/primary-hover', 'color/brand/primary-hover', '#1570EF', 'COLOR', { index: 0, newRole: { name: 'color/brand/primary-hover', globalId: 'g0', scopes: [] }, newRoleGlobalName: 'color/blue/600' }));
  cands.push(tc('h2', 'fills', 'trn', 'color/overlay/scrim', '#000000', 'COLOR', { index: 0, variableAlpha: 0.5 }));
  cands.push(tc('n1', 'paddingLeft', 'ci', 'spacing/card/inset', '8', 'FLOAT'), tc('n2', 'paddingLeft', 'ci', 'spacing/card/inset', '8', 'FLOAT'), tc('n1', 'itemSpacing', 'cg', 'spacing/card/gap', '16', 'FLOAT'));
  cands.push(tc('n1', 'paddingTop', 'lg', 'spacing/a-very-long-semantic-variable-name/for-truncation-check/inset', '24', 'FLOAT'));
  cands.push(tc('n1', 'topLeftRadius', 'rc', 'radius/card', '8', 'FLOAT'));
  cands.push(tc('n3', 'opacity', 'op', 'opacity/label', 'half', 'STRING'), tc('n4', 'visible', 'vb', 'flag/visible', 'true', 'BOOLEAN'));
  await found(p, { candidates: cands, bound: cands.length, skipped: 6, reasons: { fraction: 2, 'size-fraction': 1, 'space-between': 2, 'hug-fill': 1 } }, [{ styleId: 'S:h2', name: 'Heading/H2', nodeIds: ['x1', 'x2'] }]);
  await p.click('[data-k="link"]');
  await p.waitForTimeout(100);
  await p.click('#bindTree [data-tkey="cg|gap"] > .bv-switch');
  await p.click('#bindTree [data-tkey="kind:radius"] > .tr-car');
  await p.mouse.move(1, 1);
  await tipWait(p);
  let g = await trGeo(p, '#bindTree');
  const R = Object.fromEntries(g.rows.map((x) => [x.k, x]));
  const rows = g.rows.filter((x) => !x.head); const heads = g.rows.filter((x) => x.head);
  check('32 연결 트리 .vlike · 줄 · 머리 높이 32 · 아래 테두리 0 · 배경 투명(마우스 올림 아님)', g.vlike && g.rows.every((x) => x.h === 32 && x.bb === '0px' && x.bg === 'rgba(0, 0, 0, 0)'), JSON.stringify(g.rows.map((x) => [x.k, x.h, x.bb, x.bg])));
  check('32 머리 — 위 1px 선(첫 머리 0) · 이름 12px 600 --text-2 · ▾/▸ · 이름 x 22(▾ 칸 8)', heads.every((x, i) => x.bt === (i === 0 ? '0px' : '1px') && x.nmFs === '12px' && x.nmFw === '600' && x.nmC === g.text2 && x.carX === 8 && x.nmX === 22) && R['kind:gap'].car === '▾' && R['kind:radius'].car === '▸', JSON.stringify(heads.map((x) => [x.k, x.bt, x.nmFs, x.nmFw, x.nmC, x.car, x.carX, x.nmX])));
  const swRs = [...new Set(g.rows.map((x) => x.swR).filter((x) => x != null))];
  check('32 머리 스위치 x = 줄 스위치 x(오른쪽 여백 8 — 줄 끝)', swRs.length === 1 && swRs[0] === g.w - 8, JSON.stringify([swRs, g.w]));
  const gapRows = g.rows.slice(g.rows.findIndex((x) => x.k === 'kind:gap') + 1, g.rows.findIndex((x) => x.k === 'kind:radius'));
  check('32 그룹 여백 — 펼친 머리 아래 첫 줄 위 4 · 마지막 줄 아래 16 · 접힌 머리 아래 0', gapRows[0].mt === '4px' && gapRows.at(-1).mb === '16px' && gapRows.slice(0, -1).every((x) => x.mb === '0px') && R['kind:radius'].mb === '0px' && R['kind:color'].mt === '0px', JSON.stringify(gapRows.map((x) => [x.k, x.mt, x.mb])));
  check('32 칩 시작 x 88 — 모든 줄(N 배지 · 넘치는 왼쪽 글 줄 포함, TR-D5 · TR-D16) · 왼쪽 글 x 40 · 폭 40', rows.every((x) => x.chX === 88 && x.ltX === 40 && x.ltW === 40), JSON.stringify(rows.map((x) => [x.k, x.chX, x.ltX, x.ltW])));
  const bd = R['bgd|color'];
  check('32 "10000곳" — 왼쪽 글 말줄임 · title "10000곳" · 줄 글에 전체 개수 · 칩 x 그대로(TR-D11 · TR-D16 — 999곳까지 다 보임)', bd.ltCut && bd.ltTitle === '10000곳' && bd.txt.includes('10000곳') && bd.chX === 88, JSON.stringify(bd));
  check('32 "2곳" 잘리지 않음 → title 없음', R['ci|gap'].ltCut === false && R['ci|gap'].ltTitle === null);
  const nr = R['new:color/brand/primary-hover|color'];
  check('32 N 배지 — 칩 끝 + 4 · 툴팁 = 배지 title · 칩 title 없음(TR-D9 · TR-P12)', nr.tagX === nr.chR + 4 && nr.tagTitle === 'color/blue/600을 가리켜요' && nr.chTitle === null, JSON.stringify(nr));
  check('32 태그 · 배지와 스위치 사이 ≥ 8(TR-P22)', rows.filter((x) => x.tagR != null && x.swX != null).every((x) => x.swX - x.tagR >= 8));
  check('32 옅은 칸 = "→ {전체 이름}"("→"는 aria-hidden) · 짙은 칸 = 값 글', R['ci|gap'].al === '→ spacing/card/inset' && R['ci|gap'].alArrowHidden && R['ci|gap'].vl === '8' && bd.vl === '#FFFFFF' && R['trn|color'].vl === '#000000 50%');
  check('32 칩 너비 = 글 길이(넉넉한 줄 — 스위치까지 늘지 않음 · 옅은 칸 잘림 없음)', !R['ci|gap'].alCut && R['ci|gap'].chR < R['ci|gap'].swX - 100, JSON.stringify(R['ci|gap']));
  const lg = R['lg|gap'];
  check('32 긴 이름 — 옅은 칸 최대 230 · 말줄임 · title = 전체 이름(→ 뺌)', lg.alW <= 230 && lg.alCut && lg.alTitle === 'spacing/a-very-long-semantic-variable-name/for-truncation-check/inset', JSON.stringify([lg.alW, lg.alCut, lg.alTitle]));
  const typeRows = Object.values(R).filter((x) => x.ld);
  const byName = (n) => typeRows.find((x) => x.al === `→ ${n}`);
  check('32 종류 표시 — FLOAT "#" · STRING "Aa" · BOOLEAN "✓" · COLOR 동그라미 16 · 테두리 1px --swatch-line', byName('spacing/card/inset')?.ld.t === '#' && byName('opacity/label')?.ld.t === 'Aa' && byName('flag/visible')?.ld.t === '✓' && bd.ld.sw && bd.ld.w === 16 && bd.ld.bw === '1px' && bd.ld.bc === g.line && bd.ld.x === 16, JSON.stringify(typeRows.map((x) => [x.al, x.ld])));
  check('32 투명 색 동그라미 — 바둑판(.ck — TR-P4)', R['trn|color'].ld.ck === true);
  const off = R['cg|gap'];
  check('32 끈 줄 — 옅은 칸 · 왼쪽 글 --text-2 · 짙은 칸 배경 --surface-2 · 글 --text-2 · opacity 1(TR-D6)', off.off && off.alC === g.text2 && off.ltC === g.text2 && off.vlBg === 'rgb(244, 245, 246)' && off.vlC === g.text2 && off.ld.o === '1', JSON.stringify(off));
  await p.click('#bindTree [data-tkey="bgd|color"] > .bv-switch');
  await p.mouse.move(1, 1);
  check('32 끈 색 줄 동그라미 흑백(grayscale) · opacity 1', await p.$eval('#bindTree [data-tkey="bgd|color"] .vr-sw', (e) => getComputedStyle(e).filter === 'grayscale(1)' && getComputedStyle(e).opacity === '1'));
  await p.click('#bindTree [data-tkey="bgd|color"] > .bv-switch');
  const ts = R['ts:S:h2'];
  check('32 Text Style 줄 — [Aa] "2곳" · 옅은 칸만 "→ Heading/H2"(짙은 칸 없음 — TR-D14)', ts.ld.t === 'Aa' && ts.ltText === '2곳' && ts.al === '→ Heading/H2' && ts.vl === null && ts.chX === 88);
  check('32 줄 읽는 순서 — "2곳" → 이름 → 값(TR-P9) · 스위치 aria-label 그대로', R['ci|gap'].txt.startsWith('#2곳→ spacing/card/inset8') && R['ci|gap'].swAria === 'spacing/card/inset 연결', JSON.stringify(R['ci|gap'].txt));
  check('32 세로 선 0(연결 — 한 단) · 가로 스크롤 0', g.rows.every((x) => !x.bgPos) && !g.hscroll);
  // 건너뛴 곳 묶음 머리(TR-D13 · TR-P14 · TR-P23)
  await p.click('#bindSkipToggle');
  const sk = await p.$$eval('#bindSkips > *', (e) => e.map((x) => { const cs = getComputedStyle(x); const t = x.classList.contains('skip-head') ? x : x.querySelector('.skip-name'); const rg = document.createRange(); rg.selectNodeContents(t); return { head: x.classList.contains('skip-head'), h: Math.round(x.getBoundingClientRect().height), bg: cs.backgroundColor, bt: cs.borderTopWidth, bb: cs.borderBottomWidth, fs: cs.fontSize, fw: cs.fontWeight, c: cs.color, tx: Math.round(rg.getBoundingClientRect().left) }; }));
  const sh = sk.filter((x) => x.head), sr = sk.filter((x) => !x.head);
  check('32 건너뛴 곳 묶음 머리 — 32 · 배경 투명 · 위 1px 선(첫 묶음 머리 0) · 12px 600 --text-2', sh.length === 2 && sh.every((x, i) => x.h === 32 && x.bg === 'rgba(0, 0, 0, 0)' && x.bt === (i === 0 ? '0px' : '1px') && x.fs === '12px' && x.fw === '600' && x.c === g.text2), JSON.stringify(sh));
  check('32 묶음 머리 글 x = .skip-row 글 x(왼쪽 2)', new Set(sk.map((x) => x.tx)).size === 1, JSON.stringify(sk.map((x) => x.tx)));
  check('32 머리 앞 .skip-row · 목록 맨 끝 줄 아래 구분선 0(TR-P14 · TR-P23) · 다른 줄은 1px', sk.every((x, i) => x.head || x.bb === ((!sk[i + 1] || sk[i + 1].head) ? '0px' : '1px')) && sr.some((x) => x.bb === '1px'), JSON.stringify(sk.map((x) => [x.head, x.bb])));
  check('32 카드 안 카드 0 — 연결(줄 · 칩 · 배지는 카드 아님)', (await nestedCards(p)).length === 0, JSON.stringify(await nestedCards(p)));
  await p.close();
}
{
  // 만들기 — Global(태그 · 잠긴 줄 · 끈 줄 · "Layer 100") · Semantic(오른쪽 끝) · Text Style(흐린 소수 크기 줄 · 이름 고치기)
  const p = await open(560, 'select');
  await p.setViewportSize({ width: 560, height: 1200 });
  await recv(p, { type: 'LICENSE_STATUS', tier: 'paid', unlimited: true, source: 'dev' });
  await recv(p, PREREQ);
  await recv(p, { ...sel(1, 0), ids: ['w1'] });
  await goSub(p, 'make');
  await p.waitForTimeout(50);
  const ex = (await sent(p, 'EXTRACT')).at(-1);
  const sc = (await sent(p, 'SCAN_TEXT_STYLES')).at(-1);
  await recv(p, { type: 'EXTRACT_RESULT', reqId: ex.reqId, warnings: [], selection: 1, tokens: [
    { name: 'color/gray/50', category: 'color', value: '#F2F4F7', sources: ['fills'], count: 3 },
    { name: 'color/x/500', category: 'color', value: '#7F56D9', alpha: 0.5, sources: ['fills'], count: 100 },
    { name: 'spacing/16', category: 'gap', value: 16, sources: ['itemSpacing'], count: 4 },
    { name: 'spacing/8', category: 'gap', value: 8, sources: ['itemSpacing'], count: 2 },
  ] });
  await p.waitForTimeout(50);
  const pv = (await sent(p, 'CREATE_TOKENS')).at(-1);
  const names = pv.tokens.map((x) => x.name);
  const purple = names.find((n) => n.startsWith('color/') && n !== 'color/gray/50');
  const st = Object.fromEntries(names.map((n) => [n, { state: 'new' }]));
  st['color/gray/50'] = { state: 'update' };
  st[purple] = { state: 'reuse', varName: 'color/brand/primary-container-hover-pressed' };
  await recv(p, { type: 'CREATE_RESULT', reqId: pv.reqId, preview: true, created: 3, updated: 0, summary: '', roles: 1, skippedManual: 0, tokenStates: st, roleRows: [{ name: 'spacing/card/gap', global: 'spacing/16', token: 'spacing/16' }] });
  await recv(p, { type: 'TEXT_STYLE_CANDIDATES', reqId: sc.reqId, warnings: [], existing: [],
    styles: [{ name: 'Heading/H2', fontSize: 24, lineHeight: 32, letterSpacing: 0, family: 'Inter', style: 'Bold', count: 6, nodeIds: ['t1'], boundStyleId: 'S:x' }],
    decimalRows: [{ fontSize: 26.67, lineHeight: 36, letterSpacing: 0, family: 'Inter', style: 'SemiBold', count: 4, nodeIds: ['t4'] }] });
  await p.waitForTimeout(50);
  await p.mouse.move(1, 1);
  await tipWait(p);
  let g = await trGeo(p, '#makeTree');
  let rows = g.rows.filter((x) => !x.head);
  const R = Object.fromEntries(g.rows.map((x) => [x.k, x]));
  check('32 만들기 Global — 줄 32 · 구분선 0 · 칩 x 96 · 왼쪽 글 x 40 · 폭 48', g.vlike && g.rows.every((x) => x.h === 32 && x.bb === '0px') && rows.every((x) => x.chX === 96 && x.ltX === 40 && x.ltW === 48), JSON.stringify(rows.map((x) => [x.k, x.chX, x.ltX, x.ltW])));
  const lp = R[`g:${purple}`];
  check('32 만들기 "Layer 100" — 말줄임 · title · 줄 글에 전체(TR-D11)', lp.ltCut && lp.ltTitle === 'Layer 100' && lp.txt.includes('Layer 100'), JSON.stringify(lp));
  check('32 만들기 태그 — 칩 끝 + 4(TR-D9) · 태그 · 스위치 줄지 않음 · 좁으면 옅은 칸 먼저 말줄임(TR-P11)', rows.filter((x) => x.tagX != null).every((x) => x.tagX === x.chR + 4 && x.swX - x.tagR >= 8) && lp.alCut && !lp.vl.endsWith('…') && lp.vl === '#7F56D9 50%', JSON.stringify(rows.map((x) => [x.k, x.chR, x.tagX, x.tagR, x.swX, x.alCut])));
  check('32 만들기 동그라미 — 색 · 투명 바둑판 · 숫자 "#"', R['g:color/gray/50'].ld.sw && lp.ld.ck && R['g:spacing/16'].ld.t === '#');
  check('32 만들기 머리 스위치 x = 줄 스위치 x · 가로 스크롤 0', new Set(g.rows.map((x) => x.swR).filter((x) => x != null)).size === 1 && !g.hscroll);
  await p.click('#makeTab-semantic');
  await p.waitForTimeout(30);
  g = await trGeo(p, '#makeTree');
  const sr = g.rows.find((x) => !x.head);
  check('32 만들기 Semantic — 칩 오른쪽 끝(줄 끝 − 8, 칩 열 없음 — TR-D10) · 왼쪽 이름 · 스위치 없음', sr.chR === g.w - 8 && sr.ltText === 'spacing/card/gap' && sr.swR === null && sr.al === '→ spacing/16' && sr.vl === '16', JSON.stringify(sr));
  await p.click('#makeTab-ts');
  await p.waitForTimeout(30);
  g = await trGeo(p, '#makeTree');
  const dec = g.rows.find((x) => x.k.startsWith('td:')), tr = g.rows.find((x) => x.k.startsWith('t:'));
  check('32 Text Style 탭 — 머리 없음 · 줄 x 8 · [Aa] "Layer 6" · 칩 x 96 [→ 이름 | 값 요약] · "있음" 칩 뒤', !g.rows.some((x) => x.head) && tr.ld.x === 8 && tr.ld.t === 'Aa' && tr.ltText === 'Layer 6' && tr.ltW === 56 && tr.chX === 96 && tr.al === '→ Heading/H2' && tr.vl.startsWith('Inter') && tr.tagX === tr.chR + 4, JSON.stringify(tr));
  check('32 흐린 소수 크기 줄 — 짙은 칸만 · 시작 x 96(TR-P21) · 글 --muted · 짙은 칸 배경 --surface-2', dec.al === null && dec.vlX === 96 && dec.ltC === g.muted && dec.vlBg === 'rgb(244, 245, 246)' && dec.vlC === g.muted, JSON.stringify(dec));
  await p.dblclick('#makeTree [data-tkey^="t:"] .vchip .al');
  await p.waitForTimeout(30);
  const ed = await p.$eval('#makeTree input.tr-edit', (e) => { const tl = e.closest('.tree').getBoundingClientRect().left; const b = e.getBoundingClientRect(); return [Math.round(b.left - tl), Math.round(b.width)]; });
  check('32 이름 고치기 칸 = 옅은 칸 자리(x 96 · 폭 230)', ed[0] === 96 && ed[1] === 230, JSON.stringify(ed));
  await p.keyboard.press('Escape');
  check('32 카드 안 카드 0 — 만들기', (await nestedCards(p)).length === 0, JSON.stringify(await nestedCards(p)));
  await p.close();
}
{
  // 이름 정리 — 여러 단(세로 선 · 단마다 9 · 안쪽 머리 · 깊은 줄 말줄임) · 한 단 · 맨 바깥이 바꿀 줄(TR-P13)
  const renameWith = async (nodes) => {
    const p = await open(560, 'select');
    await p.setViewportSize({ width: 560, height: 1200 });
    await recv(p, PREREQ);
    await recv(p, { ...sel(1, 0), ids: ['r0'], firstName: 'Product card' });
    await p.click('#btnGoRename');
    await p.waitForTimeout(30);
    const rq = (await sent(p, 'RENAME')).at(-1);
    await recv(p, { type: 'RENAME_RESULT', reqId: rq.reqId, applied: false, changes: [], nodes });
    await p.waitForTimeout(30);
    await p.mouse.move(1, 1);
    await tipWait(p);
    return p;
  };
  const N = (id, name, depth, parentId, ex = {}) => ({ id, name, type: 'FRAME', depth, parentId, ...ex });
  let p = await renameWith([
    N('r0', 'Product card', 0, null, { keep: 'root' }),
    N('a', 'Frame 12', 1, 'r0', { after: 'card-header' }), N('a1', 'Ellipse 2', 2, 'a', { after: 'avatar' }), N('a2', 'Text 3', 2, 'a', { after: 'name' }),
    N('g', 'Group 7', 1, 'r0'), N('g1', 'Frame 14', 2, 'g', { after: 'meta' }), N('g11', 'Text 5 copy copy copy (final final)', 3, 'g1', { after: 'price-label-discounted-very-long-name-for-check-of-truncation' }),
  ]);
  let g = await trGeo(p, '#renameTree');
  let R = Object.fromEntries(g.rows.map((x) => [x.k, x]));
  check('32 이름 정리 — 줄 32 · 구분선 0 · 칩 x 150(모든 바꿀 줄)', g.vlike && g.rows.every((x) => x.h === 32 && x.bb === '0px') && g.rows.filter((x) => !x.head).every((x) => x.chX === 150), JSON.stringify(g.rows.map((x) => [x.k, x.chX])));
  check('32 이름 정리 여러 단 — 단 2 x 21(▾ 21 · 이름 35) · 단 3 잎 x 30 · 안쪽 머리 위 선 0 · 단 4 x 39', R.a.carX === 21 && R.a.ltX === 35 && R.a1.ltX === 30 && R.g.carX === 21 && R.g.bt === '0px' && R.g1.carX === 30 && R.g11.ltX === 39, JSON.stringify(g.rows.map((x) => [x.k, x.carX, x.ltX, x.bt])));
  check('32 이름 정리 세로 선 — x 12 · 21(줄마다 조각, 1px) · 단 마지막 줄은 16(길이 = 내용 높이 − 16)', R.a.bgPos === '12px 0px' && R.a1.bgPos === '12px 0px, 21px 0px' && R.a1.bgSize === '1px 32px, 1px 32px' && R.a2.bgSize === '1px 32px, 1px 16px' && R.g11.bgSize === '1px 16px, 1px 16px, 1px 16px' && R.r0.bgPos === '', JSON.stringify(g.rows.map((x) => [x.k, x.bgPos, x.bgSize])));
  check('32 이름 정리 지금 이름 — 보통 글(400 · --text · 취소선 없음) · 늘 title · 짙은 칸 없음', g.rows.filter((x) => !x.head).every((x) => x.ltFw === '400' && x.ltC === g.text && x.ltDeco === 'none' && x.ltTitle === x.ltText && x.vl === null), JSON.stringify(g.rows.map((x) => [x.k, x.ltFw, x.ltC, x.ltDeco, x.ltTitle])));
  check('32 이름 정리 새 이름 title — 잘렸을 때만(TR-P12)', R.a.alTitle === null && R.g11.alCut && R.g11.alTitle === 'price-label-discounted-very-long-name-for-check-of-truncation', JSON.stringify([R.a.alTitle, R.g11.alTitle]));
  check('32 이름 정리 깊은 줄 왼쪽 글 말줄임 · 줄 글에 전체 이름(TR-D11) · 맥락 머리 칩 없음', R.g11.ltCut && R.g11.txt.includes('Text 5 copy copy copy (final final)') && R.g.chX === null && R.r0.chX === null);
  check('32 이름 정리 줄 읽기 — 지금 이름 → 새 이름 → 스위치(TR-P9)', R.a.txt.startsWith('▾Frame 12→ card-header') && R.a.swAria === 'card-header(으)로 바꾸기', JSON.stringify(R.a.txt));
  // 접힌 단 1 머리 아래 여백 0(TR-P17)
  await p.click('#renameTree [data-tkey="r0"] > .tr-car');
  await p.mouse.move(1, 1);
  g = await trGeo(p, '#renameTree');
  check('32 접힌 단 1 머리 — 내용 · 여백 없음(TR-P17)', g.rows.length === 1 && g.rows[0].mb === '0px' && g.rows[0].car === '▸');
  await p.click('#renameTree [data-tkey="r0"] > .tr-car');
  // 키보드 — ↓ · ← · Space · Enter
  await p.focus('#renameTree [data-tkey="r0"]');
  await p.keyboard.press('ArrowDown');
  await p.keyboard.press('ArrowDown');
  await p.keyboard.press('Space');
  check('32 이름 정리 키보드 — ↓↓ Space → 단 3 줄 끔', (await p.getAttribute('#renameTree [data-tkey="a1"] > .bv-switch', 'aria-checked')) === 'false');
  await p.keyboard.press('ArrowLeft');
  check('32 이름 정리 키보드 — ← 부모 줄', (await p.evaluate(() => document.activeElement?.dataset.tkey)) === 'a');
  check('32 카드 안 카드 0 — 이름 정리', (await nestedCards(p)).length === 0, JSON.stringify(await nestedCards(p)));
  await p.close();
  p = await renameWith([
    N('r0', 'Product card', 0, null, { keep: 'root' }),
    N('a', 'Rectangle 4', 1, 'r0', { after: 'thumbnail' }), N('b', 'Text 3', 1, 'r0', { after: 'title' }),
  ]);
  g = await trGeo(p, '#renameTree');
  check('32 이름 정리 한 단 — 선 0 · 잎 x 16 · 이름 폭 126(TR-P16) · 칩 x 150', g.rows.every((x) => !x.bgPos) && g.rows.filter((x) => !x.head).every((x) => x.ltX === 16 && x.ltW === 126 && x.chX === 150), JSON.stringify(g.rows.map((x) => [x.k, x.ltX, x.ltW, x.bgPos])));
  await p.close();
  p = await renameWith([
    N('r0', 'Frame 1', 0, null, { after: 'product-card' }),
    N('a', 'Frame 12', 1, 'r0', { after: 'card-header' }), N('a1', 'Ellipse 2', 2, 'a', { after: 'avatar' }), N('b', 'Rectangle 4', 1, 'r0', { after: 'thumbnail' }),
  ]);
  g = await trGeo(p, '#renameTree');
  R = Object.fromEntries(g.rows.map((x) => [x.k, x]));
  check('32 이름 정리 루트가 바꿀 줄(TR-P13) — 위 선 0 · ▾ x 8 · 이름 x 22 · 폭 120 · 내용 선 x 12 · 위 4 · 아래 16', R.r0 && !R.r0.head && R.r0.bt === '0px' && R.r0.carX === 8 && R.r0.ltX === 22 && R.r0.ltW === 120 && R.a.bgPos === '12px 0px' && R.a.mt === '4px' && R.b.mb === '16px' && R.b.ltX === 21, JSON.stringify(g.rows.map((x) => [x.k, x.bt, x.carX, x.ltX, x.ltW, x.bgPos, x.mt, x.mb])));
  await p.close();
  // 단 1 잎 바꿀 줄 x 8 — 선택 루트가 잎(컨테이너 아님)
  p = await renameWith([N('r0', 'Rectangle 9', 0, null, { after: 'thumbnail' })]);
  g = await trGeo(p, '#renameTree');
  check('32 이름 정리 루트 잎 바꿀 줄 — x 8 · 이름 폭 134 · 선 0', g.rows.length === 1 && g.rows[0].ltX === 8 && g.rows[0].ltW === 134 && !g.rows[0].bgPos, JSON.stringify(g.rows));
  await p.close();
}

await browser.close();
if (fails.length) {
  console.error(`\n✗ ${fails.length}건 실패`);
  process.exit(1);
}
console.log('\n✓ 연결 카드 흐름 — 전부 통과');
