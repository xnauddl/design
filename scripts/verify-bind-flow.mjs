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

async function open(width = 400) {
  const p = await browser.newPage({ viewport: { width, height: 660 } });
  await p.addInitScript(() => {
    window.__sent = [];
    window.parent.postMessage = (m) => window.__sent.push(m.pluginMessage);
  });
  await p.goto(url);
  await p.click('#tabbtn-apply');
  return p;
}
const recv = (p, m) => p.evaluate((m) => window.dispatchEvent(new MessageEvent('message', { data: { pluginMessage: m } })), m);
const sent = (p, type) => p.evaluate((t) => window.__sent.filter((m) => m && m.type === t), type);
const lastReq = async (p, type) => (await sent(p, type)).at(-1)?.reqId;
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
  check('4 첫 전제 상태 전 미리보기 막지 않음', !(await p.$eval('#btnApply', (b) => b.disabled)));
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

/* 7 — 좁은 폭 */
{
  const p = await open(360);
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

await browser.close();
if (fails.length) {
  console.error(`\n✗ ${fails.length}건 실패`);
  process.exit(1);
}
console.log('\n✓ 연결 카드 흐름 — 전부 통과');
