#!/usr/bin/env node
/* ============================================================
   verify-bind-flow — 적용 › 연결 카드의 상태 흐름 회귀 검사 (헤드리스 브라우저)
   플러그인(code.ts) 없이 dist/ui.html을 띄우고, 실제 시작 순서·경쟁 상황대로 메시지를
   흘려 넣어 화면 상태를 확인한다. 2026-11 검수에서 재현된 7건이 다시 생기지 않게 한다.
     1 연결 현황 뒤 미리보기 → ‘선택한 항목에 연결’이 보여야 한다(읽기 전용으로 그려지면 안 됨)
     2 늦게 온 응답(이전 연결 현황·이전 선택의 미리보기)은 버린다
     3 선택을 빠르게 바꿔도 연결 현황 요청은 한 번, 그동안 목록은 비우지 않고 흐리게
     4 첫 전제 상태 전에는 ‘먼저 토큰을 생성…’ 경고를 띄우지 않는다
     5 미리보기 중 선택이 바뀌면 진행률을 숨긴다
     6 시작 직후 GET_PREREQ는 한 번
     7 좁은 폭에서도 ‘다음 →’은 툴바 오른쪽 끝
     8 연결 현황 줄은 디자인 말 + ‘=’(취소선 없음), 미리보기는 ‘→’, 네 방향 여백은 한 줄, 레이어 머리는 캔버스 선택
     9 변수 관리(변수 탭 첫 화면, PR 1 중간 상태): 연결 카드 무간섭·트리/표·우클릭 메뉴·복사·상세·교체, 시작 시 스크립트 오류 0
    10 IA v3 셸(PR 1): 첫 화면 변수 탭, 탭 전환에 크기 요청 0, 선택 표시줄, 하위 화면 기억, 창 다시 들어옴,
       최소화, 잠금 사유, 버튼 줄 고정, 24×24, §8 목록 높이 실측
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
async function open(width = 400, tab = 'layer') {
  const p = await browser.newPage({ viewport: { width, height: 510 } });
  p.on('pageerror', (e) => pageErrors.push(e.message));
  await p.addInitScript(() => {
    window.__sent = [];
    window.parent.postMessage = (m) => window.__sent.push(m.pluginMessage);
  });
  await p.goto(url);
  if (tab) await p.click(`#tabbtn-${tab}`);
  return p;
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
const sel = (count, bound) => ({ type: 'SELECTION_STATE', count, scanned: count * 40, bindable: 12, capped: false, comps: 0, sets: 0, selfSelect: false, bound, renamed: 0 });
const nodes = [{ id: 'n1', name: 'card', type: 'FRAME', depth: 0, parentId: null }];
const c = (field, v = 'vA') => ({ nodeId: 'n1', field, currentValue: '8', variableId: v, variableName: 'spacing/8', tier: 1 });
const scanResult = (reqId, cands = [c('itemSpacing')]) => ({ type: 'BINDINGS_RESULT', candidates: cands, nodes, total: cands.length, boundNodes: 1, reqId });
const preview = (reqId) => ({ type: 'APPLY_RESULT', preview: true, bound: 2, skipped: 0, flags: [], reasons: {}, candidates: [c('itemSpacing'), c('paddingLeft')], nodes, skips: [], reqId });

/* 4·6 — 시작 직후 */
{
  const p = await open();
  check('4 첫 전제 상태 전 경고 없음', !(await visible(p, '#bindPrereq')));
  await recv(p, sel(1, 0)); // 선택이 있는 상태에서
  check('4 첫 전제 상태 전 미리보기 막지 않음', !(await p.$eval('#btnApply', (b) => b.disabled || b.getAttribute('aria-disabled') === 'true')));
  check('6 시작 직후 GET_PREREQ 한 번', (await sent(p, 'GET_PREREQ')).length === 1, `${(await sent(p, 'GET_PREREQ')).length}회`);
  await recv(p, { ...PREREQ, hasBindable: false });
  check('4 변수 없음이 확인되면 경고 표시', await visible(p, '#bindPrereq'));
  await recv(p, PREREQ);
  check('4 변수 있음이면 경고 숨김', !(await visible(p, '#bindPrereq')));
  await p.close();
}

/* 1·2·3·5 — 연결 현황 → 미리보기, 경쟁, 디바운스 */
{
  const p = await open();
  await recv(p, PREREQ);
  // 3: 빠른 선택 변경 5번 → 연결 현황 요청 1번
  for (let i = 1; i <= 5; i++) await recv(p, sel(i, 3));
  await p.waitForTimeout(400);
  const scans = await sent(p, 'SCAN_BINDINGS');
  check('3 빠른 선택 변경에도 연결 현황 요청 1번', scans.length === 1, `${scans.length}번`);
  await recv(p, scanResult(scans.at(-1).reqId));
  check('3 연결 현황 표시', (await p.textContent('#bindCount')).startsWith('연결'));
  // 3: 다음 선택 변경 동안 목록은 비우지 않고 흐리게
  await recv(p, sel(2, 3));
  const stale = await p.$eval('#bindTree', (e) => ({ stale: e.classList.contains('stale'), text: e.textContent.length }));
  check('3 대기 중 목록 유지(흐리게)', stale.stale && stale.text > 0);
  await p.waitForTimeout(400);
  const scanId = await lastReq(p, 'SCAN_BINDINGS');
  await recv(p, scanResult(scanId));
  check('3 새 연결 현황이 오면 흐림 해제', !(await p.$eval('#bindTree', (e) => e.classList.contains('stale'))));
  // 1: 연결 현황 위에서 미리보기
  await p.click('#btnApply');
  const previewId = await lastReq(p, 'APPLY');
  await recv(p, preview(previewId));
  check('1 미리보기 뒤 ‘선택한 항목에 연결’ 표시', await visible(p, '#btnApplyConfirm'));
  check('1 미리보기 개수는 ‘후보’', (await p.textContent('#bindCount')).startsWith('후보'));
  check('1 후보에 체크박스', (await p.$$('#bindTree input[type="checkbox"]')).length > 0);
  // 2: 늦게 온 이전 연결 현황은 버린다
  await recv(p, scanResult(scanId));
  check('2 늦은 연결 현황이 미리보기를 덮지 않음', await visible(p, '#btnApplyConfirm'));
  // 5 + 2: 미리보기 중 선택 변경 → 진행률 숨김, 이전 선택의 미리보기 결과는 버린다
  await recv(p, sel(1, 0)); // 바인딩 없는 선택 — 자동 조회 없음
  await p.click('#btnApply');
  const oldPreview = await lastReq(p, 'APPLY');
  await recv(p, sel(3, 0));
  check('5 미리보기 중 선택 변경 → 진행률 숨김', !(await visible(p, '#applyProgress')));
  await recv(p, preview(oldPreview));
  check('2 이전 선택의 미리보기 결과는 버림', !(await visible(p, '#btnApplyConfirm')));
  await p.close();
}

/* 8 — 연결 목록 표시 */
{
  const p = await open();
  await recv(p, PREREQ);
  const sides = ['paddingLeft', 'paddingRight'].map((f) => c(f, 'vLg'));
  await recv(p, scanResult(undefined, [{ ...c('fills'), index: 0, currentValue: '#ffffff', variableName: 'color/bg' }, ...sides]));
  const rows = await p.$$eval('#bindTree .r-card', (cs) => cs.map((x) => ({ text: x.textContent, strike: [...x.querySelectorAll('*')].some((e) => getComputedStyle(e).textDecorationLine.includes('line-through')) })));
  check('8 연결 현황 줄은 ‘=’', rows.length > 0 && rows.every((r) => r.text.includes('=')));
  check('8 취소선 없음', rows.every((r) => !r.strike));
  check('8 속성은 디자인 말(채움 색)', rows.some((r) => r.text.includes('채움 색')));
  check('8 같은 변수의 좌우 여백은 한 줄', rows.filter((r) => r.text.includes('좌우 여백')).length === 1 && !rows.some((r) => r.text.includes('paddingLeft')));
  await p.click('#bindTree .r-group.pick');
  check('8 레이어 머리 → 캔버스 선택', (await sent(p, 'SELECT_NODES')).at(-1)?.ids?.[0] === 'n1');
  await p.click('#btnApply');
  await recv(p, preview(await lastReq(p, 'APPLY')));
  const ops = await p.$$eval('#bindTree .bf-op', (e) => [...new Set(e.map((x) => x.textContent))]);
  check('8 미리보기 줄은 ‘→’', ops.length === 1 && ops[0] === '→', ops.join(','));
  await p.close();
}

/* 9 — 변수 관리 */
{
  const p = await open();
  await recv(p, PREREQ);
  await recv(p, { ...sel(1, 2), selfSelect: true });
  await p.click('#tabbtn-variables');
  check('9 변수 탭 첫 화면에 변수 관리', await visible(p, '#varManager'));
  const usageReq = (await sent(p, 'SCAN_BINDINGS')).at(-1);
  check('9 사용 수 조회는 관리 전용(forManager)', usageReq?.forManager === true);
  const cols = [{ id: 's', name: 'Tokens', tier: 2, modes: [{ modeId: 'l', name: 'Light' }, { modeId: 'd', name: 'Dark' }] }];
  const vars = [
    { id: 'vA', name: 'spacing/8', collectionId: 's', type: 'FLOAT', values: { l: { kind: 'number', text: '8' }, d: { kind: 'number', text: '8' } }, scopes: ['GAP'], description: '' },
    { id: 'vB', name: 'color/bg', collectionId: 's', type: 'COLOR', values: { l: { kind: 'color', hex: '#ffffff' }, d: { kind: 'color', hex: '#000000' } }, scopes: [], description: '' },
  ];
  await recv(p, { type: 'VAR_TABLE', collections: cols, vars });
  await recv(p, { ...scanResult(usageReq.reqId), forManager: true });
  check('9 관리 조회가 연결 카드를 건드리지 않음', !(await visible(p, '#bindViewRow')));
  const rows = await p.$$eval('#vmTableWrap .vm-row', (e) => e.map((x) => x.dataset.id));
  check('9 선택에서 쓰는 것만(기본) — 쓰인 변수만', rows.length === 1 && rows[0] === 'vA', rows.join(','));
  check('9 표 머리에 모드 열', (await p.textContent('#vmTableWrap thead')).includes('Dark'));
  await rightClick(p, '.vm-row[data-id="vA"]');
  const items = await p.$$eval('.ctx-menu button', (e) => e.map((x) => x.textContent));
  check('9 우클릭 메뉴(복사 3 · 선택 · 상세 · 교체)', ['이름 복사', '값 복사', 'CSS 변수명 복사', '사용 레이어 선택', '상세 보기…', '다른 변수로 교체…'].every((x) => items.includes(x)), items.join('|'));
  await p.keyboard.press('Escape');
  check('9 Esc로 메뉴 닫힘', (await p.$('.ctx-menu')) === null);
  await p.dblclick('.vm-row[data-id="vA"]');
  check('9 더블클릭 → 상세 팝업', (await p.textContent('.modal')).includes('spacing/8'));
  await p.keyboard.press('Escape');
  check('9 Esc로 팝업 닫힘', (await p.$('.modal')) === null);
  await p.close();
}

/* 7 — 좁은 폭 */
{
  const p = await open(400);
  await recv(p, PREREQ);
  await recv(p, preview(undefined));
  const r = await p.evaluate(() => {
    const card = document.querySelector('.step[data-apply-step="bind"]');
    const bar = card.querySelector('.toolbar').getBoundingClientRect();
    const next = card.querySelector('.btn-next').getBoundingClientRect();
    return { gap: Math.round(bar.right - next.right) };
  });
  check('7 좁은 폭에서 ‘다음 →’ 오른쪽 끝', r.gap <= 2, `오른쪽 여백 ${r.gap}px`);
  check('7 가로 스크롤 없음', !(await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)));
  await p.close();
}

// 탭 바(+[—])가 한 줄
for (const w of [400]) {
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
  const p = await open(400, null);
  check('10 처음 열면 변수 탭', (await p.$eval('.tab-btn.active', (e) => e.id)) === 'tabbtn-variables');
  check('10 선택 없음 문구', (await p.textContent('#selBar')).includes('선택 없음 — 캔버스에서 레이어를 선택하세요') || (await p.textContent('#selBar')).includes('불러오는 중'));
  await recv(p, sel(0, 0));
  check('10 선택 없음 문구(SELECTION_STATE 뒤)', (await p.textContent('#selBar')).trim() === '● 선택 없음 — 캔버스에서 레이어를 선택하세요');
  await recv(p, { ...sel(1, 0), scanned: 43, firstName: 'Card', ids: ['1:2'] });
  check('10 선택 1개 문구', (await p.textContent('#selBar')).replace(/\s+/g, ' ').trim() === '● Card · 하위 42', await p.textContent('#selBar'));
  await recv(p, { ...sel(3, 0), scanned: 50, capped: true });
  check('10 선택 k개 문구(capped면 +)', (await p.textContent('#selBar')).replace(/\s+/g, ' ').trim() === '● 레이어 3개 · 하위 47+', await p.textContent('#selBar'));
  for (const tb of ['layer', 'settings', 'variables', 'layer', 'variables']) await p.click(`#tabbtn-${tb}`);
  check('10 탭 전환 시 크기 요청 0회', (await count(p, 'SET_UI_SIZE')) === 0);
  await p.click('#tabbtn-settings');
  const barSettings = await visible(p, '#selBarWrap');
  await p.click('#tabbtn-layer');
  check('10 선택 표시줄은 설정에서만 숨음', !barSettings && (await visible(p, '#selBarWrap')));
  // 하위 화면·단계 기억(§2.6)
  await p.click('#tabbtn-variables');
  await p.click('#btnGoMake');
  await p.click('#makeRail [data-make-step="theme"]');
  await p.click('#tabbtn-layer');
  await p.click('#tabbtn-variables');
  check('10 탭 상태 유지(만들기 › 테마)', (await visible(p, '#varMake')) && (await visible(p, '#darkCard')));
  await p.click('#btnMakeBack');
  check('10 ← 돌아가기 → 변수 첫 화면', (await visible(p, '#varHome')) && !(await visible(p, '#varMake')));
  await p.close();
}
{
  // 창 다시 들어옴(④): 합쳐서 1번, 2초 안 재진입은 간격 끝에 1번, 창 안 이동 0회, 메뉴 열림 중 보류
  const p = await open(400, null);
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
  await recv(p, { type: 'VAR_TABLE', collections: [{ id: 's', name: 'Tokens', tier: 2, modes: [{ modeId: 'l', name: 'Light' }] }], vars: [{ id: 'vA', name: 'spacing/8', collectionId: 's', type: 'FLOAT', values: { l: { kind: 'number', text: '8' } }, scopes: [], description: '' }] });
  await p.uncheck('#vmOnlyUsed');
  await rightClick(p, '.vm-row[data-id="vA"]');
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
  const p = await open(400, 'layer');
  await recv(p, PREREQ);
  await recv(p, sel(1, 0));
  await p.click('#btnApply'); // 미리보기 요청 — 결과 전까지 진행 테두리
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
  await recv(p, { type: 'VAR_TABLE', collections: [{ id: 's', name: 'Tokens', tier: 2, modes: [{ modeId: 'l', name: 'Light' }] }], vars: [{ id: 'vA', name: 'spacing/8', collectionId: 's', type: 'FLOAT', values: { l: { kind: 'number', text: '8' } }, scopes: [], description: '' }] });
  await p.uncheck('#vmOnlyUsed');
  await p.dblclick('.vm-row[data-id="vA"]');
  const hadModal = (await p.$('.modal')) !== null;
  await p.evaluate(() => document.getElementById('btnMinimize').click()); // 팝업 배경이 덮고 있어 직접 누른다
  check('10 최소화하면 팝업 닫힘', hadModal && (await p.$('.modal')) === null);
  await p.close();
}
{
  // 잠금(§2.3): 포커스 가능, 누르면 공통 상태 줄에 사유 + [라이선스 →]
  const p = await open(400, 'variables');
  await recv(p, PREREQ);
  await p.click('#btnGoMake');
  await p.focus('#btnColorVars');
  check('10 잠긴 버튼은 포커스 가능', (await p.evaluate(() => document.activeElement?.id)) === 'btnColorVars');
  check('10 잠긴 버튼은 aria-disabled', (await p.getAttribute('#btnColorVars', 'aria-disabled')) === 'true');
  await p.click('#btnColorVars', { force: true });
  check('10 누르면 공통 상태 줄에 유료 사유', (await p.textContent('#statusText')).includes('유료 기능이에요') && (await p.textContent('#statusAction')) === '라이선스 →');
  check('10 잠긴 버튼은 동작하지 않음', (await count(p, 'CREATE_TOKENS')) === 0);
  await p.keyboard.press('Tab'); // 포커스 이동은 메시지를 지우지 않는다
  check('10 포커스 이동은 상태 줄 메시지를 지우지 않음', await visible(p, '#statusAction'));
  await p.click('#statusAction');
  check('10 [라이선스 →] → 설정 › 키 입력칸 포커스', (await p.$eval('.tab-btn.active', (e) => e.id)) === 'tabbtn-settings' && (await p.evaluate(() => document.activeElement?.id)) === 'licenseKey');
  // 24×24
  await p.click('#tabbtn-variables');
  const small = await p.evaluate(() => ['btnMinimize', 'btnMakeBack', 'btnGoMake'].map((id) => {
    const el = document.getElementById(id);
    const r = el.getBoundingClientRect();
    return { id, w: Math.round(r.width), h: Math.round(r.height), shown: el.offsetParent !== null };
  }).filter((x) => x.shown && (x.w < 24 || x.h < 24)));
  check('10 새 컨트롤 24×24 이상', small.length === 0, JSON.stringify(small));
  await p.close();
}
{
  // 510에서 버튼 줄이 스크롤해도 보임(§2.5) + §8 목록 높이 실측
  const p = await open(400, 'layer');
  await recv(p, PREREQ);
  await recv(p, sel(1, 0));
  const many = Array.from({ length: 40 }, (_, i) => ({ ...c('itemSpacing'), nodeId: `n${i}` }));
  const manyNodes = Array.from({ length: 40 }, (_, i) => ({ id: `n${i}`, name: `card ${i}`, type: 'FRAME', depth: 0, parentId: null }));
  await p.click('#btnApply');
  await recv(p, { ...preview(await lastReq(p, 'APPLY')), candidates: many, nodes: manyNodes });
  await p.evaluate(() => window.scrollTo(0, 900));
  await p.waitForTimeout(100);
  const tb = await p.evaluate(() => {
    const bar = document.querySelector('.step[data-apply-step="bind"] .toolbar').getBoundingClientRect();
    const sel = document.getElementById('selBarWrap').getBoundingClientRect();
    return { top: Math.round(bar.top), bottom: Math.round(bar.bottom), selBottom: Math.round(sel.bottom), sy: window.scrollY };
  });
  check('10 510에서 버튼 줄이 스크롤해도 보임', tb.sy > 0 && tb.top >= tb.selBottom && tb.bottom <= 510 - 24, JSON.stringify(tb));
  const area = await p.evaluate(() => {
    const sel = document.getElementById('selBarWrap').getBoundingClientRect();
    return { selH: Math.round(sel.height), contentH: Math.round(510 - sel.bottom - 24) };
  });
  console.log(`  · §8 실측: 선택 표시줄 ${area.selH}px · 탭 내용 영역 ${area.contentH}px (상태 줄 24px 제외)`);
  await p.close();
}
check('9 시작 시 스크립트 오류 0', pageErrors.length === 0, pageErrors.join(' / '));

await browser.close();
if (fails.length) {
  console.error(`\n✗ ${fails.length}건 실패`);
  process.exit(1);
}
console.log('\n✓ 연결 카드 흐름 — 전부 통과');
