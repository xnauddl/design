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
     7 480 폭에서도 ‘다음 →’은 툴바 오른쪽 끝
    11 연결 화면(IA v4 §4.2 · B.2): 자동 찾기 + 텍스트 스타일 미리보기 · 카드 1 숫자 · 종류 머리 · (변수, 종류) 줄 · 스위치 ·
       스타일 먼저 · 모두 켜기/끄기 · 건너뜀 칩 · 연결(textStyles 함께) · 첫 화면 + 상태 줄 · 이어받기 · 취소 · 텍스트 스타일만 · 오류
     9 변수 탭(IA v3 PR 2): 불러오는 중·시작 화면·목록, 칩·펼침·간접·LIB·삭제된 변수, 목록 기준, 큰 선택·[읽기], ↻,
       검색, 행 메뉴(교체 없음)·사용 레이어 선택 200개, 상세, 알약 이동·되돌리기, 키보드, ⋯ 팝업, 시작 시 스크립트 오류 0
    10 IA v3 셸(PR 1): 첫 화면 변수 탭, 탭 전환에 크기 요청 0, 선택 표시줄, 하위 화면 기억, 창 다시 들어옴,
       최소화, 잠금 사유, 버튼 줄 고정, 24×24, §8 목록 높이 실측
    12 변수 고치기(PR 3.5): 열 때 포커스, 이름 오류·바뀌는 것 줄, 별칭 고르개(계층·Global·순환·검색), 값 ↔ 별칭,
       저장(고친 것만 + base), 저장 중 잠금, 성공·일부 실패·다른 곳에서 바뀜·삭제됨·이름 거절, ERROR·10초, 버리기 확인, 닫은 뒤 포커스
    14 컴포넌트(베타): 언제나 하위 탭 셋 · [베타] 배지 · 접근성 이름 · 준비 현황 각주 없음 · 켜기 체크박스 없음 · End
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
async function open(width = 480, tab = 'layer') {
  const p = await browser.newPage({ viewport: { width, height: 510 } });
  p.on('pageerror', (e) => pageErrors.push(e.message));
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
/** 우클릭 메뉴 열기 — 510 높이에서는 행이 아래에 있어, 클릭 전 스크롤이 메뉴를 닫지 않게 먼저 화면 안으로. */
async function rightClick(p, selector) {
  await p.$eval(selector, (e) => e.scrollIntoView({ block: 'center' }));
  await p.waitForTimeout(100);
  await p.click(selector, { button: 'right' });
}
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
/** 목록 — 종류 머리는 글자, 줄은 [이름, 곳 수, 켬]. */
const bindList = (p) => p.$$eval('#bindTree > *', (e) => e.map((x) => (x.classList.contains('bv-kind') ? x.textContent : [x.querySelector('.bv-name').textContent, x.querySelector('.bv-tw').textContent, x.querySelector('.bv-switch').getAttribute('aria-checked') === 'true'])));
const TS0 = { hasStyle: 0, noStyle: 0, ambiguous: 0, boundVars: 0, mixed: 0, instance: 0 };
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
const rowIds = (p) => p.$$eval('#varTree .vt-row', (e) => e.map((x) => x.dataset.id));
/** 사이드바 항목 [이름, 숫자] (결정 B). */
const sideItems = (p) => p.$$eval('#varSide .vs-item', (e) => e.map((x) => [x.querySelector('.vs-name').textContent, x.querySelector('.vs-num').textContent]));
const sideSelected = (p) => p.$eval('#varSide [aria-selected="true"]', (e) => e.dataset.key).catch(() => null);
{
  const p = await open(480, 'variables');
  await recv(p, PREREQ);
  check('9 첫 표 전에는 불러오는 중', await visible(p, '#varLoading'));
  await recv(p, { type: 'VAR_TABLE', collections: [], vars: [] });
  check('9 로컬 변수 0개 → "아직 변수가 없어요" 빈 상태(v4 §4.6)', (await visible(p, '#varEmpty')) && !(await visible(p, '#varList')));
  check('9 빈 상태 [선택에서 변수 만들기] — 선택 없으면 잠금', await locked(p, '#btnVarEmptyMake'));
  await recv(p, { type: 'VAR_TABLE', collections: COLS, vars: VARS });
  check('9 로컬 변수 있음 → 목록', await visible(p, '#varList'));
  // 사이드바(v4 §4.6): 컬렉션만 · 계층 순서(S → G) · 전체 수 · listbox
  check('9 사이드바 = 컬렉션만(★ · 그룹 · LIB · 삭제된 변수 없음)', JSON.stringify(await sideItems(p)) === JSON.stringify([['Semantic', '1'], ['Global', '4']]), JSON.stringify(await sideItems(p)));
  check('9 사이드바 listbox · option', (await p.getAttribute('#varSide', 'role')) === 'listbox' && (await p.$$eval('#varSide .vs-item', (e) => e.every((x) => x.getAttribute('role') === 'option'))));
  check('9 머리줄 링크 · ↻ · 상황 안내 줄 없음', (await p.$('#btnFindUnbound')) === null && (await p.$('#btnVarRefresh')) === null && (await p.$('#btnReadiness')) === null && (await p.$('#situationLine')) === null);
  check('9 처음에는 첫 컬렉션', (await sideSelected(p)) === 'side:col:s');
  check('9 모드 ▾(보이는 모드 2개 이상)', await visible(p, '#modeSelect'));
  check('9 선택 없음: 사용 "—"', JSON.stringify(await rowIds(p)) === JSON.stringify(['tx']) && (await p.textContent('.vt-row[data-id="tx"] .use')) === '—');
  await recv(p, { ...sel(1, 2), scanned: 40, firstName: 'Card', ids: ['1:2'] });
  await p.waitForTimeout(450);
  const req = (await sent(p, 'SCAN_USAGE')).at(-1);
  check('9 선택 변경 → SCAN_USAGE(기준 = 지금 선택)', req?.nodeIds?.[0] === '1:2');
  await recv(p, usageResult(req.reqId, { tx: { places: 8, layers: 5 }, sp8: { places: 3, layers: 2 } }));
  check('9 사용 수 "곳"', (await p.textContent('.vt-row[data-id="tx"] .use')) === '8곳');
  await p.click('#varSide [data-key="side:col:g"]');
  check('9 컬렉션 고름 → 그 컬렉션 행', JSON.stringify(await rowIds(p)) === JSON.stringify(['g0', 'g9', 'sp8', 'r4']), JSON.stringify(await rowIds(p)));
  const widths = await p.evaluate(() => {
    const w = (sel) => Math.round(document.querySelector(sel)?.getBoundingClientRect().width ?? -1);
    return { win: window.innerWidth, side: w('.vl-side'), main: w('#varTree'), hscroll: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  });
  check('9 §8 폭 — 창 480 · 사이드바 128 · 목록 328 · 가로 스크롤 0', JSON.stringify(widths) === JSON.stringify({ win: 480, side: 128, main: 328, hscroll: 0 }), JSON.stringify(widths));
  await p.click('#varSide [data-key="side:col:s"]');
  // 우클릭 메뉴 — 교체 없음(B.3 전까지 v3 행 메뉴)
  await rightClick(p, '.vt-row[data-id="tx"]');
  await p.click('.ctx-menu button >> text=사용 레이어 선택');
  const selReq = (await sent(p, 'SELECT_VAR_USERS')).at(-1);
  check('9 사용 레이어 선택 → 기준 안에서 새로 찾기', selReq?.varIds?.[0] === 'tx' && selReq?.nodeIds?.[0] === '1:2');
  await recv(p, { type: 'SELECT_RESULT', found: 200, requested: 340, capped: true });
  check('9 200개 상한 문구', (await p.textContent('#statusText')).includes('레이어 200개만 선택했어요(전체 340개)'));
  // 플러그인이 만든 선택 → 기준 유지, 선택 탭 머리 줄에 [기준 바꾸기](§2.5)
  await recv(p, { ...sel(3, 2), scanned: 60, selfSelect: true, ids: ['a', 'b', 'c'] });
  await goTab(p, 'select');
  check('9 플러그인이 만든 선택은 기준 유지 → 선택 탭 머리 줄 "지금 선택과 달라요"', (await p.textContent('#selHead')).includes('지금 선택과 달라요') && (await p.textContent('#selHead')).startsWith('Card'), await p.textContent('#selHead'));
  const scansBefore = (await sent(p, 'SCAN_USAGE')).length;
  await p.click('#selHead [data-k="rebase"]');
  await p.waitForTimeout(450);
  check('9 [기준 바꾸기] → 새 기준으로 읽기 · 안내 사라짐', (await sent(p, 'SCAN_USAGE')).length > scansBefore && !(await p.textContent('#selHead')).includes('지금 선택과 달라요'));
  // 큰 선택(⑤): 자동으로 읽지 않고 [읽기]
  const s0 = (await sent(p, 'SCAN_USAGE')).length;
  const a0 = (await sent(p, 'APPLY')).length;
  await recv(p, { ...sel(1, 2), scanned: 1200, ids: ['big'] });
  await p.waitForTimeout(450);
  check('9 큰 선택은 자동으로 읽지 않음 — 선택 탭 "선택이 커서…" + [읽기]', (await sent(p, 'SCAN_USAGE')).length === s0 && (await sent(p, 'APPLY')).length === a0 && (await p.textContent('#selCards')).includes('선택이 커서 자동으로 읽지 않아요'));
  await p.click('#selCards button');
  check('9 [읽기] → 300개 무시하고 사용 수 · 찾기', (await sent(p, 'SCAN_USAGE')).length === s0 + 1 && (await sent(p, 'APPLY')).length === a0 + 1 && (await sent(p, 'APPLY')).at(-1).nodeIds?.[0] === 'big');
  await goTab(p, 'variables');
  // 검색 — 결과 없음
  await p.click('#btnSearch');
  await p.fill('#varSearch', 'zzz');
  check('9 검색 결과 없음 문구', (await p.textContent('#varTree')).includes("'zzz'와 맞는 변수가 없어요"));
  await p.keyboard.press('Escape');
  check('9 Esc로 검색 닫힘', !(await visible(p, '#searchBox')));
  await recv(p, { ...sel(1, 2), scanned: 40, firstName: 'Card', ids: ['1:2'] });
  await p.waitForTimeout(450);
  await recv(p, usageResult((await sent(p, 'SCAN_USAGE')).at(-1).reqId, { tx: { places: 8, layers: 5 }, sp8: { places: 3, layers: 2 } }));
  await p.dblclick('.vt-row[data-id="tx"] .nm');
  const fq = (await sent(p, 'FIND_VAR_USERS')).at(-1);
  check('9 상세 → 쓰인 곳 새로 찾기(50)', fq?.limit === 50 && fq?.varIds?.[0] === 'tx');
  await recv(p, { type: 'VAR_USERS', reqId: fq.reqId, layers: [{ id: 'n1', name: 'Title' }], totalLayers: 60, places: 80 });
  check('9 상세 "인스턴스 안쪽 포함" · 외 n개', (await p.textContent('.modal')).includes('레이어 60개 · 80곳 · 인스턴스 안쪽 포함') && (await p.textContent('.modal')).includes('외 59개'));
  await p.keyboard.press('Escape');
  check('9 Esc로 팝업 닫힘 · 원래 행으로 포커스', (await p.$('.modal')) === null && (await p.evaluate(() => document.activeElement?.dataset?.id)) === 'tx');
  // 키보드 — 사이드바(listbox): ↑↓ 이동, Enter 고르기
  await p.focus('#varSide [data-key="side:col:s"]');
  await p.keyboard.press('ArrowDown');
  check('9 사이드바 ↓ → 다음 항목(고르지 않음)', (await p.evaluate(() => document.activeElement?.dataset?.key)) === 'side:col:g' && (await sideSelected(p)) === 'side:col:s');
  await p.keyboard.press('Enter');
  check('9 사이드바 Enter → 고르기', (await sideSelected(p)) === 'side:col:g');
  const tips = await p.$$eval('#varSide .vs-item', (e) => e.map((x) => [x.querySelector('.vs-badge')?.title, x.getAttribute('aria-label')]));
  check('9 계층 배지 툴팁 · 접근성 이름', tips.length === 2 && tips[0][0] === '플러그인 컬렉션' && tips[0][1].endsWith(', 플러그인 컬렉션') && tips[1][0] === '직접 값 4/4 · Global', JSON.stringify(tips));
  // ⋯ → 준비 현황 · 내보내기(v4 §4.6)
  await p.click('#btnVarMore');
  const more = await p.$$eval('.ctx-menu button', (e) => e.map((x) => x.textContent));
  check('9 ⋯ 메뉴 — 준비 현황 · 내보내기 · 펼치기/접기', more.length === 4 && /^준비 현황 \d\/7…$/.test(more[0]) && more[1] === '코드로 내보내기…', more.join('|'));
  await p.click('.ctx-menu button >> text=코드로 내보내기…');
  check('9 내보내기 팝업 열림', (await p.textContent('.modal')).includes('누르면 바로 코드 파일로 저장돼요'));
  await p.keyboard.press('Escape');
  check('9 팝업 닫으면 [⋯]로 포커스', (await p.evaluate(() => document.activeElement?.id)) === 'btnVarMore');
  await goTab(p, 'settings');
  check('9 설정 화면에 계층·내보내기 없음', !(await p.textContent('#tab-settings')).includes('컬렉션 계층') && !(await p.textContent('#tab-settings')).includes('코드로 내보내기'));
  await p.close();
}
{
  // 선택 탭 카드(v4 §4.1) — 카드 1 숫자 · 카드 2 직접만 · 카드 3 [선택] · [연결 풀기]
  const p = await open(480, 'select');
  await recv(p, { ...PREREQ, tierVars: 5, otherVars: 0 });
  await recv(p, { type: 'VAR_TABLE', collections: COLS, vars: VARS });
  check('9 선택 없음 → "디자인에서 레이어를 선택하세요" · 레이어 정리 잠금', (await p.textContent('#selCards')).includes('디자인에서 레이어를 선택하세요') && (await locked(p, '#btnGoRename')));
  await recv(p, { ...sel(1, 2), scanned: 40, ids: ['1:2'] });
  check('9 읽는 중 카드', (await p.textContent('#selCards')).includes('선택을 읽는 중…'));
  await p.waitForTimeout(450);
  const ap = (await sent(p, 'APPLY')).at(-1);
  check('9 자동 찾기 — 기준 nodeIds · preview', ap?.preview === true && ap?.nodeIds?.[0] === '1:2');
  await recv(p, { ...preview(ap.reqId), counts: { 'no-match': { color: 2 }, styled: { color: 1 }, 'instance-children': { other: 4 } } });
  await recv(p, tsPrev(ap.reqId));
  await recv(p, usageResult((await sent(p, 'SCAN_USAGE')).at(-1).reqId, { tx: { places: 2, layers: 1 }, L1: { places: 1, layers: 1 } }, { libraryVars: [{ id: 'L1', name: 'core/blue/500', collection: 'Core', type: 'COLOR', value: { kind: 'color', hex: '#3366FF' }, aliasTargets: [] }], deleted: { count: 3, nodeIds: ['x'] } }));
  const txt = await p.textContent('#selCards');
  check('9 카드 1 — n = m + k(4곳), [2곳 연결], 변수가 없는 값 2곳', txt.includes('변수 없는 값 4곳') && txt.includes('2곳 연결') && txt.includes('변수가 없는 값 2곳'), txt);
  check('9 카드 2 — 직접만 2개(Semantic 1 · 라이브러리 1)', txt.includes('쓰는 변수 2개') && txt.includes('Semantic 1 · 라이브러리 1'), txt);
  check('9 카드 3 — 삭제된 변수 3곳 · [선택] · [연결 풀기]', txt.includes('삭제된 변수 3곳') && (await p.$('[data-k="delsel"]')) !== null && (await p.$('[data-k="unbind"]')) !== null);
  await p.click('[data-k="uses"]');
  check('9 카드 2 펼침 — 경로 머리 · 줄', JSON.stringify(await p.$$eval('.sel-list .sl-path', (e) => e.map((x) => x.textContent))) === JSON.stringify(['S Semantic › color/text', '라이브러리 › Core']));
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

/* 7 — '다음 →'은 툴바 오른쪽 끝(만들기 › 색) */
{
  const p = await open(480, 'variables');
  await recv(p, PREREQ);
  await recv(p, { type: 'VAR_TABLE', collections: [], vars: [] });
  await goSub(p, 'make');
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
for (const w of [480]) {
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
  const p = await open(480, null);
  check('10 처음 열면 선택 탭(v4 §2.1)', (await p.$eval('.tab-btn.active', (e) => e.id)) === 'tabbtn-select');
  check('10 머리 = [선택 | 변수] + ⚙ + —', JSON.stringify(await p.$$eval('#tabBar .tab-btn', (e) => e.map((x) => x.textContent))) === JSON.stringify(['선택', '변수']) && (await visible(p, '#btnSettings')) && (await visible(p, '#btnMinimize')));
  check('10 선택 표시줄 없음(탭 바 바로 아래가 탭 내용)', (await p.$('#selBarWrap')) === null);
  await recv(p, PREREQ);
  await recv(p, sel(0, 0));
  // 선택이 없을 때 화면별 안내(§4.1)
  await goTab(p, 'layer');
  check('10 선택 없음 — 연결 화면 대신 첫 화면(선택 없음 안내)', (await visible(p, '#selHome')) && (await p.textContent('#selCards')).includes('디자인에서 레이어를 선택하세요'));
  await goSub(p, 'rename');
  check('10 선택 없음 — 이름 목록 자리', (await p.textContent('#diff')).includes('선택이 없어요 — 캔버스에서 레이어를 선택하세요'));
  await goSub(p, 'structure');
  check('10 선택 없음 — 컴포넌트 목록 자리', (await p.textContent('#compTree')).includes('선택이 없어요 — 캔버스에서 레이어를 선택하세요'));
  await recv(p, { ...sel(1, 0), scanned: 43, firstName: 'Card', ids: ['1:2'] });
  await goSub(p, 'bind');
  check('10 선택하면 연결 화면 — "선택을 읽는 중…"', (await emptyText(p)) === '선택을 읽는 중…', String(await emptyText(p)));
  for (const tb of ['layer', 'settings', 'variables', 'layer', 'variables']) await goTab(p, tb);
  check('10 탭 전환 시 크기 요청 0회', (await count(p, 'SET_UI_SIZE')) === 0);
  // 하위 화면·단계 기억(§2.6)
  await goSub(p, 'make');
  await p.click('#makeRail [data-make-step="theme"]');
  await p.click('#tabbtn-variables');
  await p.click('#tabbtn-select');
  check('10 하위 화면 기억(선택 탭 › 값을 직접 고르기 › 테마)', (await visible(p, '#varMake')) && (await visible(p, '#darkCard')));
  await p.click('#btnSubBack');
  check('10 ← → 선택 탭 첫 화면', (await visible(p, '#selHome')) && !(await visible(p, '#varMake')));
  await p.click('#btnSettings');
  check('10 ⚙ → 설정 화면 · 세그먼트 둘 다 고르지 않음', (await visible(p, '#tab-settings')) && (await p.$$eval('#tabBar .tab-btn', (e) => e.every((x) => x.getAttribute('aria-selected') === 'false'))));
  await p.keyboard.press('Escape');
  check('10 Esc → 설정을 연 탭으로', (await visible(p, '#selHome')) && (await p.$eval('.tab-btn.active', (e) => e.id)) === 'tabbtn-select');
  await p.close();
}
{
  // 창 다시 들어옴(④): 합쳐서 1번, 2초 안 재진입은 간격 끝에 1번, 창 안 이동 0회, 메뉴 열림 중 보류
  const p = await open(480, "variables");
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
  const p = await open(480, 'select');
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
  await p.dblclick('.vt-row[data-id="tx"] .nm');
  const hadModal = (await p.$('.modal')) !== null;
  await p.evaluate(() => document.getElementById('btnMinimize').click()); // 팝업 배경이 덮고 있어 직접 누른다
  check('10 최소화하면 팝업 닫힘', hadModal && (await p.$('.modal')) === null);
  await p.close();
}
{
  // 잠금(§2.3): 포커스 가능, 누르면 공통 상태 줄에 사유 + [라이선스 →]
  const p = await open(480, 'variables');
  await recv(p, PREREQ);
  await recv(p, { type: 'VAR_TABLE', collections: [], vars: [] });
  await goSub(p, 'make');
  await p.focus('#btnColorVars');
  check('10 잠긴 버튼은 포커스 가능', (await p.evaluate(() => document.activeElement?.id)) === 'btnColorVars');
  check('10 잠긴 버튼은 aria-disabled', (await p.getAttribute('#btnColorVars', 'aria-disabled')) === 'true');
  await p.click('#btnColorVars', { force: true });
  check('10 누르면 공통 상태 줄에 유료 사유', (await p.textContent('#statusText')).includes('유료 기능이에요') && (await p.textContent('#statusAction')) === '라이선스 →');
  check('10 잠긴 버튼은 동작하지 않음', (await count(p, 'CREATE_TOKENS')) === 0);
  await p.keyboard.press('Tab'); // 포커스 이동은 메시지를 지우지 않는다
  check('10 포커스 이동은 상태 줄 메시지를 지우지 않음', await visible(p, '#statusAction'));
  await p.click('#statusAction');
  check('10 [라이선스 →] → 설정 › 키 입력칸 포커스', (await visible(p, '#tab-settings')) && (await p.evaluate(() => document.activeElement?.id)) === 'licenseKey');
  // 24×24
  await p.click('#tabbtn-variables');
  await recv(p, { type: 'VAR_TABLE', collections: COLS, vars: VARS });
  const small = await p.evaluate(() => ['btnMinimize', 'btnSettings', 'btnAddVar', 'btnVarMore', 'btnSearch'].map((id) => {
    const el = document.getElementById(id);
    const r = el.getBoundingClientRect();
    return { id, w: Math.round(r.width), h: Math.round(r.height), shown: el.offsetParent !== null };
  }).filter((x) => x.shown && (x.w < 24 || x.h < 24)));
  check('10 새 컨트롤 24×24 이상', small.length === 0, JSON.stringify(small));
  await p.close();
}
{
  // 510에서 아래 버튼 줄이 스크롤해도 보임(§2.5 · §4.2 아래 고정) + §8 목록 높이 실측
  const p = await open(480, 'select');
  await openSel(p);
  const many = Array.from({ length: 40 }, (_, i) => cand('n1', 'itemSpacing', `v${i}`, `spacing/${i}`));
  await found(p, { candidates: many });
  await p.click('[data-k="link"]');
  await p.evaluate(() => window.scrollTo(0, 900));
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
  const p = await open(480, 'select');
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
  check('B2 카드 1 — 스타일 먼저(한 자리 한 번) · [7곳 연결] · 텍스트 스타일 종류', card.includes('변수 없는 값 8곳') && card.includes('텍스트 스타일 2') && (await p.textContent('[data-k="link"]')) === '7곳 연결', card);
  await p.click('[data-k="link"]');
  check('B2 [7곳 연결] → 연결 화면 · 다시 찾지 않음', (await visible(p, '#subHead')) && (await sent(p, 'APPLY')).length === 1);
  check('B2 들어오면 포커스는 첫 스위치', await p.evaluate(() => document.activeElement === document.querySelector('#bindTree .bv-switch')));
  check('B2 머리 "← Card" · 오른쪽 "변수 없는 값 8곳"', (await p.textContent('#subTitle')) === 'Card' && (await p.textContent('#subRight')) === '변수 없는 값 8곳', await p.textContent('#subRight'));
  const list = await bindList(p);
  check('B2 종류 머리(카드 1 순서) · (변수, 종류) 줄 · 텍스트 스타일 머리 맨 끝',
    JSON.stringify(list) === JSON.stringify(['간격 2곳', ['spacing/8', '2곳', true], '반경 1곳', ['spacing/8', '1곳', true], '색 1곳', ['color/text/default', '1곳', true], '글자 1곳', ['font/size/16', '1곳', true], '텍스트 스타일 2곳', ['body/medium', '2곳', true]]),
    JSON.stringify(list));
  check('B2 [7곳 연결] 주 버튼 · 단계 표시 · [찾기] · 필터 없음', (await named(p, '#btnApplyConfirm', '7곳 연결')) && !(await locked(p, '#btnApplyConfirm')) && (await p.$('#bindSteps')) === null && (await p.$('#btnApply')) === null && (await p.$('#bindFilter')) === null);
  check('B2 목록 grid · 접근성 이름', (await p.getAttribute('#bindTree', 'role')) === 'grid' && (await p.getAttribute('#bindTree', 'aria-label')) === '연결할 변수');
  // 스위치 — 줄 단위
  await p.click('#bindTree .bv-card >> nth=1 >> .bv-switch'); // 반경 줄
  check('B2 반경 줄만 끔 → 간격 줄은 켠 채 · [6곳 연결]', JSON.stringify((await bindList(p)).filter(Array.isArray).map((x) => x[2])) === JSON.stringify([true, false, true, true, true]) && (await named(p, '#btnApplyConfirm', '6곳 연결')));
  // 스타일 줄을 끄면 t1 글자 크기가 글자 변수 후보로 되돌아온다
  await p.click('#bindTree .bv-card[data-var="ts:S:body"] .bv-switch');
  const l2 = await bindList(p);
  check('B2 스타일 줄 끔 → 글자 줄 2곳(되돌림) · [5곳 연결]', l2.includes('글자 2곳') && JSON.stringify(l2.find((x) => Array.isArray(x) && x[0] === 'font/size/16')) === JSON.stringify(['font/size/16', '2곳', true]) && (await named(p, '#btnApplyConfirm', '5곳 연결')), JSON.stringify(l2));
  check('B2 스타일 줄을 꺼도 포커스는 그 스위치', (await p.evaluate(() => document.activeElement?.closest('[data-var]')?.dataset.var)) === 'ts:S:body');
  await p.click('#bindTree .bv-card[data-var="ts:S:body"] .bv-switch');
  // 모두 끄기 → 잠금 사유, 모두 켜기
  await p.click('#bindAllOff');
  check('B2 모두 끄기 뒤 포커스는 링크', (await p.evaluate(() => document.activeElement?.id)) === 'bindAllOff');
  const offLocked = await locked(p, '#btnApplyConfirm');
  const offMsg = await lockMsg(p, '#btnApplyConfirm');
  check('B2 모두 끄기(스타일 줄 포함) → [연결] 잠금 · 사유', offLocked && offMsg === '연결할 변수를 켜세요', `${offLocked} ${offMsg}`);
  await p.click('#bindAllOn');
  check('B2 모두 켜기 → [7곳 연결]', (await named(p, '#btnApplyConfirm', '7곳 연결')) && (await bindList(p)).filter(Array.isArray).every((x) => x[2]));
  // 키보드 — 정지점 1개 · ↓ · Space
  check('B2 줄 목록 정지점 1개(첫 스위치)', (await p.$$eval('#bindTree .bv-switch', (e) => e.filter((x) => x.tabIndex === 0).length)) === 1 && (await p.$eval('#bindTree .bv-switch', (e) => e.tabIndex)) === 0);
  await p.focus('#bindTree .bv-switch');
  await p.keyboard.press('ArrowDown');
  await p.keyboard.press('Space');
  check('B2 ↓ → 둘째 줄 · Space → 끔', JSON.stringify((await bindList(p)).filter(Array.isArray).map((x) => x[2])) === JSON.stringify([true, false, true, true, true]));
  await p.keyboard.press('Space');
  // 건너뜀 칩 — s는 자리 단위(스타일 사용 중 1곳), 레이어 단위 · 텍스트 스타일 사유는 칩 안에만
  check('B2 건너뜀 칩 "건너뜀 1곳 ▸"(카드와 같은 s)', (await p.textContent('#bindSkipToggle')) === '건너뜀 1곳 ▸', await p.textContent('#bindSkipToggle'));
  await p.click('#bindSkipToggle');
  const chips = await p.$$eval('#bindSkips .skip-chip', (e) => e.map((x) => x.textContent));
  check('B2 사유 칩 — 자리 "{사유} {n}곳" · 레이어 "{사유} 레이어 {n}개" · 텍스트 스타일 사유', JSON.stringify(chips) === JSON.stringify(['스타일 사용 중 1곳', '숨긴 레이어 레이어 2개 ›', '같은 스타일 없음 레이어 3개']), JSON.stringify(chips));
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
  const p = await open(480, 'select');
  await openSel(p);
  await found(p, { candidates: B2_CANDS.slice(0, 3) });
  await p.click('[data-k="link"]');
  await p.click('#bindTree .bv-card >> nth=1 >> .bv-switch'); // 반경 줄 끔
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
  const p = await open(480, 'select');
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
  const p = await open(480, 'select');
  await openSel(p, { ...PREREQ, hasBindable: false, tierVars: 0, otherVars: 3 });
  check('B2 noTier → 변수 찾기 없이 텍스트 스타일 미리보기만', (await sent(p, 'APPLY')).length === 0 && (await sent(p, 'PREVIEW_TEXT_STYLES')).length === 1);
  await recv(p, tsPrev((await sent(p, 'PREVIEW_TEXT_STYLES')).at(-1).reqId, B2_TS, { hasStyle: 1 }));
  check('B2 noTier 카드 1 안에 "텍스트 스타일 2곳" + [2곳 연결]', (await p.textContent('#selCards')).includes('텍스트 스타일 2곳') && (await p.textContent('[data-k="tsLink"]')) === '2곳 연결');
  await p.click('[data-k="tsLink"]');
  check('B2 텍스트 스타일만 — 머리 오른쪽 "텍스트 스타일 2곳" · 줄은 스타일 줄만 · [2곳 연결]', (await p.textContent('#subRight')) === '텍스트 스타일 2곳' && JSON.stringify(await bindList(p)) === JSON.stringify(['텍스트 스타일 2곳', ['body/medium', '2곳', true]]) && (await named(p, '#btnApplyConfirm', '2곳 연결')), await p.textContent('#subRight'));
  check('B2 텍스트 스타일만 — 칩 "건너뛴 레이어 ▸"', (await p.textContent('#bindSkipToggle')) === '건너뛴 레이어 ▸', await p.textContent('#bindSkipToggle'));
  await p.click('#btnApplyConfirm');
  const req = (await sent(p, 'APPLY_SELECTED')).at(-1);
  check('B2 텍스트 스타일만 연결 — items 0 · textStyles 1줄', req?.items?.length === 0 && req.textStyles?.length === 1);
  await p.close();
}
{
  // 찾기 오류 → 읽는 중에 멈추지 않음 · [다시 시도]는 찾기 / 텍스트 스타일 미리보기 오류는 변수 연결을 막지 않음
  const p = await open(480, 'select');
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
    p = await browser.newPage({ viewport: { width: 480, height: 510 } });
    p.on('pageerror', (e) => pageErrors.push(e.message));
    await p.clock.install();
    await p.addInitScript(() => {
      window.__sent = [];
      window.parent.postMessage = (m) => window.__sent.push(m.pluginMessage);
    });
    await p.goto(url);
    await goTab(p, 'variables');
  } else p = await open(480, 'variables');
  await recv(p, PREREQ);
  await recv(p, { type: 'VAR_TABLE', collections: ECOLS, vars: EVARS });
  await recv(p, { ...sel(1, 2), scanned: 40, firstName: 'Card', ids: ['1:2'] });
  await p.waitForTimeout(450);
  await recv(p, usageResult((await sent(p, 'SCAN_USAGE')).at(-1).reqId, { tx: { places: 8, layers: 5 } }));
  return p;
}
async function menuEdit(p, id) {
  await rightClick(p, `.vt-row[data-id="${id}"]`);
  await p.click('.ctx-menu button >> text=고치기…');
}
async function saveAndGet(p) {
  await p.click('.modal .m-foot button.primary');
  return (await sent(p, 'UPDATE_VARIABLE')).at(-1);
}
{
  const p = await openEditList();
  // 열 때 포커스 — 상세(더블클릭) → [닫기]
  await p.dblclick('.vt-row[data-id="tx"] .nm');
  check('12 상세로 열면 [닫기]에 포커스 · [저장] 잠김', (await activeText(p)) === '닫기' && (await edSaveLocked(p)) && (await edCloseText(p)) === '닫기');
  check('12 이름 칸 · 모드마다 값 칸(별칭은 알약) · [▾]', (await p.inputValue(NAME)) === 'color/text/default' && (await p.$$('.modal .ed-pillbtn')).length === 2 && (await p.$$('.modal button.ed-dd')).length === 2);
  await p.click('.modal .m-foot button.primary', { force: true });
  check('12 고친 것 없이 [저장] → 알림 줄 "고친 것이 없어요"(상태 줄 아님)', (await edAlert(p)) === '고친 것이 없어요');
  await p.keyboard.press('Escape');
  check('12 고친 것 없으면 Esc로 바로 닫힘 · 원래 행으로', (await p.$('.modal')) === null && (await p.evaluate(() => document.activeElement?.dataset?.id)) === 'tx');
  // 고치기… → 이름 칸
  await menuEdit(p, 'tx');
  check('12 고치기…로 열면 이름 칸에 포커스', (await activeLabel(p)) === '이름(전체 경로)');
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
  check('12 후보 목록 최대 200px', (await p.$eval('.ed-pscroll', (e) => getComputedStyle(e).maxHeight)) === '200px');
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
  await p.click('#btnSearch');
  await p.fill('#varSearch', 'color/text'); // v4: 그룹 항목이 없어 검색으로 좁힌다
  await menuEdit(p, 'tx');
  await p.fill(NAME, 'color/fg/default');
  const u = await saveAndGet(p);
  await recv(p, { type: 'VARIABLE_UPDATED', reqId: u.reqId, ok: true, applied: ['name'] });
  await recv(p, { type: 'VAR_TABLE', collections: ECOLS, vars: EVARS.map((v) => (v.id === 'tx' ? { ...v, name: 'color/fg/default' } : v)) });
  await p.click('.modal .m-foot button:not(.primary)');
  check('12 행이 목록에 없으면 오른쪽 목록 머리로 · "{새 이름} 행은 지금 고른 목록에 없어요"', (await p.evaluate(() => document.activeElement?.id)) === 'varMainTitle' && (await p.textContent('#statusText')) === 'color/fg/default 행은 지금 고른 목록에 없어요', await p.textContent('#statusText'));
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

/* ---------- 13 컴포넌트 결과 줄 꼬리 (§4.7 "인스턴스 자리" 5·6번, QA #3 검토 2회차) ---------- */
{
  const p = await open(480, 'layer');
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
  check('13 채움·크기 꼬리 — 속성 값 뒤 · 복사본 앞, 경고',
    s2.text.includes('채움·크기가 달라 건너뛴 1개: flight')
      && s2.text.indexOf('속성 값을 못 넣은') < s2.text.indexOf('채움·크기가 달라')
      && s2.text.indexOf('채움·크기가 달라') < s2.text.indexOf('복사본을 둔')
      && s2.cls.includes('warn'), JSON.stringify(s2));
  check('13 속성 값만 못 넣어도 경고', s1.text.includes('속성 값을 못 넣은 1개: M') && s1.cls.includes('warn'), JSON.stringify(s1));
  await recv(p, { type: 'COMPONENTIZE_RESULT', master: 'Card', properties: 1, instances: 1, images: 0, warnings: ['Other: 제자리에 둘 수 없어 원본을 그대로 두었어요.'], placeFailed: ['Other'] });
  s1 = await st();
  check('13 [묶기] placeFailed 꼬리 · 경고', s1.text.includes('제자리에 못 둔 1개: Other') && !s1.text.includes('남겨둔 것') && s1.cls.includes('warn'), JSON.stringify(s1));
  await recv(p, { type: 'COMPONENTIZE_RESULT', master: 'Card', properties: 0, instances: 0, images: 0, warnings: ['Other: 제자리에 둘 수 없어 원본을 그대로 두었어요.'], placeFailed: ['Other'] });
  s1 = await st();
  check('13 [묶기] 인스턴스 0개에도 꼬리', s1.text.startsWith('컴포넌트화하지 못했어요') && s1.text.includes('제자리에 못 둔 1개: Other'), JSON.stringify(s1));
  // [등록] 결과 줄(§4.7 6번 "세는 단위") — "컴포넌트 {total} (세트 · 단일)", 단일 꼬리 없음.
  // 재사용(§4.7 "재사용" 6·8번) — 재사용만 있어도 성공, 꼬리는 건너뜀 뒤 · 속성 앞, 이름 3개 + " 외"
  await recv(p, { type: 'COMPONENTS_RESULT', registered: 1, skipped: 0, sets: 0, singles: ['Solo'], exposed: 2, missing: [], failures: [], reused: ['Card', 'Badge', 'Chip', 'Pill'] });
  s1 = await st();
  check('13 결과 줄 — 컴포넌트 1 (세트 0 · 단일 1), 단일 꼬리 없음',
    s1.text.startsWith('컴포넌트 1 (세트 0 · 단일 1) · ') && s1.text.split('단일').length === 2, JSON.stringify(s1));
  check('13 재사용 꼬리 — 속성 앞, 3개 + " 외"',
    s1.text.includes(' · 기존 컴포넌트 재사용 4: Card, Badge, Chip 외')
      && s1.text.indexOf('기존 컴포넌트 재사용') < s1.text.indexOf(' · 속성 2'), JSON.stringify(s1));
  await recv(p, { type: 'COMPONENTS_RESULT', registered: 39, skipped: 0, sets: 7, singles: ['A', 'B', 'C', 'D'], exposed: 3, missing: [], failures: [] });
  s1 = await st();
  check('13 결과 줄 — 변형 수 대신 맨 위 단위', s1.text === '컴포넌트 11 (세트 7 · 단일 4) · 속성 3', JSON.stringify(s1));
  await recv(p, { type: 'COMPONENTS_RESULT', registered: 0, skipped: 0, sets: 0, singles: [], missing: [], failures: [], reused: ['ItemButton'] });
  s1 = await st();
  check('13 재사용만 있어도 성공 상태', s1.text.startsWith('컴포넌트 0 (세트 0 · 단일 0) · 기존 컴포넌트 재사용 1: ItemButton') && s1.cls.includes('ok') && !s1.cls.includes('warn'), JSON.stringify(s1));
  await recv(p, { type: 'COMPONENTS_RESULT', registered: 0, skipped: 0, sets: 0, singles: [], missing: [], failures: ['x'], reused: ['Card'], fillKept: ['flight'], reuseKept: ['Row A', 'Row B'], placeCloned: ['C'] });
  s1 = await st();
  check('13 구조가 달라 원본을 둔 꼬리 — 채움·크기 뒤 · 복사본 앞, 경고',
    s1.text.includes(' · 구조가 달라 원본을 둔 2개: Row A, Row B')
      && s1.text.indexOf('채움·크기가 달라') < s1.text.indexOf('구조가 달라 원본을 둔')
      && s1.text.indexOf('구조가 달라 원본을 둔') < s1.text.indexOf('복사본을 둔')
      && s1.cls.includes('warn'), JSON.stringify(s1));
  // 후보 트리 — 재사용할 줄은 종류 배지 대신 [재사용] + 기존 컴포넌트 이름(세트면 "{세트} · {변형}")
  await recv(p, { type: 'COMPONENT_CANDIDATES', nodes: [
    { id: 'r', name: 'Frame', type: 'FRAME', depth: 0, parentId: null, eligible: false },
    { id: 'a', name: 'Item Button', type: 'FRAME', depth: 1, parentId: 'r', eligible: true, group: 'ItemButton2', variant: 'Variant=1', reuse: { name: 'ItemButton · Variant=1' }, defaultOn: true },
    { id: 'b', name: 'Like', type: 'FRAME', depth: 1, parentId: 'r', eligible: true, single: 'Like' },
    { id: 'c', name: 'hero-button', type: 'FRAME', depth: 1, parentId: 'r', eligible: true, single: 'Button', defaultOn: true },
  ] });
  const rows = await p.$$eval('#compTree .tag', (els) => els.map((e) => ({ text: e.textContent, cls: e.className, row: e.closest('.r-card')?.textContent ?? '' })));
  const reuseRow = rows.find((r) => r.text === '재사용');
  check('13 후보 트리 배지 [재사용] + 기존 이름(접미사 이름 안 보임)',
    !!reuseRow && reuseRow.cls.includes('tag-reuse') && reuseRow.row.includes('ItemButton · Variant=1') && !reuseRow.row.includes('ItemButton2')
      && rows.some((r) => r.text === '단독'), JSON.stringify(rows));
  await recv(p, { type: 'LICENSE_STATUS', tier: 'paid', unlimited: true, source: 'dev' }); // [등록]은 유료 — 잠금을 푼다
  await p.click('#btnRegisterComp');
  const reg = (await sent(p, 'REGISTER_COMPONENTS')).pop();
  check('13 [등록] — 재사용 줄의 이름은 보내지 않는다(판정이 바뀌면 접미사 규칙)', !!reg && reg.nodeIds.includes('a') && !(reg.names && 'a' in reg.names), JSON.stringify(reg));
  // 기본 체크는 code.ts의 `defaultOn`만 본다(§4.7 "묶기" 6번) — 단독 버튼(c)은 켬, 단독 카드(b)는 끔.
  check('13 기본 체크 — defaultOn만(단독 버튼 켬 · 단독 끔)', !!reg && reg.nodeIds.includes('c') && !reg.nodeIds.includes('b'), JSON.stringify(reg));
  await p.close();
}

/* ---------- 16 새 역할 표시 — "N" 배지 · 이미 붙은 연결은 그대로(§4.6 · §2.12, 2026-11-06 결정 B · IA v4 §4.2) ---------- */
{
  const p = await open(480, 'select');
  await openSel(p);
  const nr = { name: 'color/text/inverse', globalId: 'g0', scopes: ['TEXT_FILL'] };
  const newCand = (id) => ({ nodeId: id, field: 'fills', index: 0, currentValue: '#ffffff', variableId: 'new:color/text/inverse', variableName: 'color/text/inverse', tier: 2, variableValue: '#ffffff', newRole: nr, newRoleGlobalName: 'color/gray/0' });
  const keep = { nodeId: 'n1', field: 'paddingLeft', currentValue: '8', variableId: 'vA', variableName: 'spacing/8', tier: 2 };
  await found(p, { candidates: [newCand('n1'), newCand('n2'), keep], bound: 3 });
  await p.click('[data-k="link"]');
  const chips = await p.$$eval('#bindTree .bv-card', (cards) => cards.map((c) => {
    const b = c.querySelector('.bv-new');
    return { name: c.querySelector('.bv-name')?.textContent, badge: b?.textContent, role: b?.getAttribute('role'), aria: b?.getAttribute('aria-label'), tip: c.querySelector('.bv-var')?.getAttribute('title') };
  }));
  const inv = chips.find((x) => x.name === 'color/text/inverse');
  check('16 새 역할 줄 — "N" 배지 · role=img · 읽기 이름 "새 역할"', !!inv && inv.badge === 'N' && inv.role === 'img' && inv.aria === '새 역할', JSON.stringify(inv));
  check('16 칩 툴팁 "color/gray/0을 가리켜요"', inv?.tip === 'color/gray/0을 가리켜요', JSON.stringify(inv));
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
  // v4 §4.1 레이어 정리 — [이름 정리] · [컴포넌트 베타](언제나 보임, 선택이 없으면 잠금)
  const p = await open(480, 'select');
  check('14 레이어 정리 버튼 둘', (await visible(p, '#btnGoRename')) && (await visible(p, '#btnGoComponents')));
  check('14 배지 — 레이어 정리 버튼 · 카드 제목, aria-hidden', (await p.$$eval('#btnGoComponents .beta-badge[aria-hidden="true"], #structureCard h2 .beta-badge[aria-hidden="true"]', (e) => e.length)) === 2);
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
  await p.close();
}

/* ---------- 17 "한 번에 정리"는 연결까지(IA v4 §4.3 B.1 ~ B.3 마법사, 2026-11-09 사용자 결정) ---------- */
{
  const p = await open(480, 'select');
  await recv(p, { type: 'LICENSE_STATUS', tier: 'paid', unlimited: true, source: 'dev' });
  await recv(p, { ...PREREQ, hasBindable: true, tierVars: 3, otherVars: 0 });
  await recv(p, { type: 'VAR_TABLE', collections: COLS, vars: VARS });
  await recv(p, { ...sel(1, 0), ids: ['w1'] });
  await goSub(p, 'make');
  check('17 마법사 체크 "연결" 기본 켬', await p.$eval('#wizOptBind', (e) => e.checked));
  await p.$eval('#btnWizardRun', (b) => b.click()); // 만들기 화면에서는 카드가 접혀 있다
  await p.waitForTimeout(50);
  check('17 추출도 시작 때 기준 nodeIds', (await sent(p, 'EXTRACT')).at(-1)?.nodeIds?.[0] === 'w1');
  await recv(p, { ...sel(1, 0), ids: ['other'] }); // 실행 중 선택이 바뀌어도 기준은 그대로
  await recv(p, { type: 'EXTRACT_RESULT', tokens: [{ name: 'spacing/16', category: 'gap', value: 16 }], warnings: [], selection: 1 });
  await p.waitForTimeout(50);
  await recv(p, { type: 'CREATE_RESULT', created: 1, updated: 0, summary: 'ok', roles: 1 });
  await p.waitForTimeout(80);
  if ((await sent(p, 'CREATE_SEMANTICS')).length) { await recv(p, { type: 'SEMANTICS_RESULT', aliased: 1, created: 1, updated: 0, missing: [] }); await p.waitForTimeout(80); }
  const ap = (await sent(p, 'APPLY')).filter((m) => m.preview === false).at(-1);
  check('17 연결 단계 — APPLY(preview 아님) · 시작 때 기준 · reqId', !!ap && ap.nodeIds?.[0] === 'w1' && typeof ap.reqId === 'number', JSON.stringify(ap));
  check('17 마법사 중 [연결] 잠금', await locked(p, '#btnApplyConfirm'));
  await recv(p, { type: 'APPLY_RESULT', bound: 5, skipped: 0, reasons: {}, preview: false, newRoles: 2, reqId: ap.reqId });
  await p.waitForTimeout(80);
  const rn = (await sent(p, 'RENAME')).at(-1);
  check('17 이름 정리도 시작 때 기준', rn?.nodeIds?.[0] === 'w1');
  await recv(p, { type: 'RENAME_RESULT', changes: [{ id: 'a', before: 'Frame', after: 'card' }], nodes: [], applied: true });
  await p.waitForTimeout(120);
  check('17 요약 "연결 5곳" · 연결 안내 링크 숨김', (await p.textContent('#wizardSummary')).includes('연결 5곳') && !(await p.textContent('#wizardSummary')).includes('연결은 아직') && (await p.$eval('#btnWizToBind', (e) => e.hidden)));
  check('17 마법사 결과로 연결 화면 상태 줄 "🔗 …곳 연결"을 쓰지 않음', !(await p.textContent('#statusText')).startsWith('🔗'));
  await p.close();
}

await browser.close();
if (fails.length) {
  console.error(`\n✗ ${fails.length}건 실패`);
  process.exit(1);
}
console.log('\n✓ 연결 카드 흐름 — 전부 통과');
