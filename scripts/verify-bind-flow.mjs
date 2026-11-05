#!/usr/bin/env node
/* ============================================================
   verify-bind-flow — 적용 › 연결 카드의 상태 흐름 회귀 검사 (헤드리스 브라우저)
   플러그인(code.ts) 없이 dist/ui.html을 띄우고, 실제 시작 순서·경쟁 상황대로 메시지를
   흘려 넣어 화면 상태를 확인한다. 2026-11 검수에서 재현된 7건이 다시 생기지 않게 한다.
     1 연결 화면(§4.6 그림 개편): 단계 표시 · [찾기]/[다시 찾기] · [n곳 연결] 이름·잠금 사유 · 빈 상태 3종(예시는 파일 변수) · 배지
     2 늦게 온 응답(이전 연결 현황·이전 선택의 미리보기)은 버린다
     3 선택을 빠르게 바꿔도 연결 현황 요청은 한 번, 그동안 목록은 비우지 않고 흐리게
     4 첫 전제 상태 전에는 ‘먼저 토큰을 생성…’ 경고를 띄우지 않는다
     5 찾는 중 선택이 바뀌면 진행률을 숨긴다
     6 시작 직후 GET_PREREQ는 한 번
     7 좁은 폭에서도 ‘다음 →’은 툴바 오른쪽 끝
     8 변수 카드 "값 → 변수" · 스위치 · 속성 아이콘 · 모두 켜기/끄기 · 필터(7개 이상) · 연결 후 결과 카드 · 포커스 순서
     9 변수 탭(IA v3 PR 2): 불러오는 중·시작 화면·목록, 칩·펼침·간접·LIB·삭제된 변수, 목록 기준, 큰 선택·[읽기], ↻,
       검색, 행 메뉴(교체 없음)·사용 레이어 선택 200개, 상세, 알약 이동·되돌리기, 키보드, ⋯ 팝업, 시작 시 스크립트 오류 0
    10 IA v3 셸(PR 1): 첫 화면 변수 탭, 탭 전환에 크기 요청 0, 선택 표시줄, 하위 화면 기억, 창 다시 들어옴,
       최소화, 잠금 사유, 버튼 줄 고정, 24×24, §8 목록 높이 실측
    12 변수 고치기(PR 3.5): 열 때 포커스, 이름 오류·바뀌는 것 줄, 별칭 고르개(계층·Global·순환·검색), 값 ↔ 별칭,
       저장(고친 것만 + base), 저장 중 잠금, 성공·일부 실패·다른 곳에서 바뀜·삭제됨·이름 거절, ERROR·10초, 버리기 확인, 닫은 뒤 포커스
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
const sel = (count, bound) => ({ type: 'SELECTION_STATE', count, scanned: count * 40, bindable: 12, capped: false, comps: 0, sets: 0, selfSelect: false, bound, renamed: 0, firstName: 'Card', ids: Array.from({ length: count }, (_, i) => `s${i}`) });
const nodes = [{ id: 'n1', name: 'card', type: 'FRAME', depth: 0, parentId: null }];
const c = (field, v = 'vA') => ({ nodeId: 'n1', field, currentValue: '8', variableId: v, variableName: 'spacing/8', tier: 1 });
const preview = (reqId) => ({ type: 'APPLY_RESULT', preview: true, bound: 2, skipped: 0, reasons: {}, candidates: [c('itemSpacing'), c('paddingLeft')], nodes, skips: [], reqId });

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

/* 연결 화면(§4.6 그림 개편) 읽기 도우미 */
const steps = (p) => p.$$eval('#bindSteps .bs', (e) => e.map((x) => (x.classList.contains('done') ? 'done' : x.classList.contains('now') ? 'now' : 'todo')));
const curStep = (p) => p.$$eval('#bindSteps .bs', (e) => e.findIndex((x) => x.getAttribute('aria-current') === 'step'));
/** 버튼의 접근성 이름 = 글자만(아이콘은 aria-hidden) — 그 이름의 버튼이 정확히 그 요소인가. */
const named = async (p, sel, name) => (await p.getByRole('button', { name, exact: true }).count()) >= 1 && (await p.$eval(sel, (e, n) => e.textContent.trim() === n && [...e.querySelectorAll('svg')].every((s) => s.getAttribute('aria-hidden') === 'true'), name));
const locked = (p, sel) => p.getAttribute(sel, 'aria-disabled').then((v) => v === 'true');
const primary = (p, sel) => p.$eval(sel, (e) => e.classList.contains('primary'));
const emptyText = (p) => p.$eval('#bindEmpty', (e) => (e.hidden ? null : e.querySelector('.be-text')?.textContent ?? ''));
const cards = (p) => p.$$eval('#bindTree .bv-card', (e) => e.map((x) => [x.querySelector('.bv-val').textContent, x.querySelector('.bv-mark').textContent, x.querySelector('.bv-name').textContent, x.querySelector('.bv-tw').textContent.replace(/\s*[▾▸]$/, ''), x.querySelector('.bv-switch').getAttribute('aria-checked')]));
const lockMsg = async (p, sel) => { await p.click(sel, { force: true }); return p.textContent('#statusText'); };

/* 1·2·5 — 찾기, 경쟁(IA v3: 연결 현황 없음) */
{
  const p = await open();
  await recv(p, PREREQ);
  for (let i = 1; i <= 5; i++) await recv(p, sel(i, 3));
  await p.waitForTimeout(400);
  check('3 연결 현황 조회 0회(SCAN_BINDINGS 없음)', (await sent(p, 'SCAN_BINDINGS')).length === 0);
  check('3 연결 현황 버튼 없음', (await p.$('#btnScanBindings')) === null);
  // 그림 개편: 카드 제목·설명 문장·목록 머리·전체 체크박스 없음
  check('1 카드 제목 "변수 연결"·설명 문장·목록 머리 없음', (await p.$$('.step[data-apply-step="bind"] h2')).length === 0 && (await p.$('#bindIntro')) === null && (await p.$('#bindDesc')) === null && (await p.$('#bindHead')) === null && (await p.$$('.step[data-apply-step="bind"] input[type="checkbox"]')).length === 0);
  // 단계 표시: role=list, 지금 단계 aria-current, 정지점 아님
  check('1 단계 표시 role=list · 항목 3개 · 정지점 없음', (await p.getAttribute('#bindSteps', 'role')) === 'list' && (await p.$$eval('#bindSteps li', (e) => e.length === 3 && e.every((x) => x.tabIndex < 0 && !x.querySelector('button, [tabindex]')))));
  check('1 찾기 전 단계: 지금 · 아직 · 아직', JSON.stringify(await steps(p)) === JSON.stringify(['now', 'todo', 'todo']) && (await curStep(p)) === 0, JSON.stringify(await steps(p)));
  // 찾기 전: [🔍 찾기] 주 버튼, [🔗 연결] 숫자 없이 잠금
  check('1 찾기 전 [찾기] 주 버튼 · 이름은 글자만', (await named(p, '#btnApply', '찾기')) && (await primary(p, '#btnApply')));
  check('1 찾기 전 [연결] 숫자 없음 · 잠금 · 보조', (await named(p, '#btnApplyConfirm', '연결')) && (await locked(p, '#btnApplyConfirm')) && !(await primary(p, '#btnApplyConfirm')));
  check('1 잠긴 연결 → 사유 "먼저 [찾기]를 누르세요"', (await lockMsg(p, '#btnApplyConfirm')).includes('먼저 [찾기]를 누르세요'));
  check('1 찾기 전 빈 상태 한 줄', (await emptyText(p)) === '값이 변수와 같은 곳을 찾아 연결해요', String(await emptyText(p)));
  check('1 찾기 전 배지 줄 없음', !(await visible(p, '#bindBadges')));
  await p.click('#btnApply');
  check('1 찾는 중: 지금(돌아가는 표시) · 아직 · 아직', JSON.stringify(await steps(p)) === JSON.stringify(['now', 'todo', 'todo']) && (await p.$eval('#bindSteps .bs', (e) => e.classList.contains('busy'))) && (await p.textContent('#applyProgressText')) === '찾는 중…');
  const previewId = await lastReq(p, 'APPLY');
  await recv(p, preview(previewId));
  check('1 찾은 뒤 단계: 끝 · 지금 · 아직', JSON.stringify(await steps(p)) === JSON.stringify(['done', 'now', 'todo']) && (await curStep(p)) === 1 && !(await p.$eval('#bindSteps .bs', (e) => e.classList.contains('busy'))));
  check('1 찾은 뒤 [다시 찾기] 보조 · [2곳 연결] 주 버튼', (await named(p, '#btnApply', '다시 찾기')) && !(await primary(p, '#btnApply')) && (await named(p, '#btnApplyConfirm', '2곳 연결')) && (await primary(p, '#btnApplyConfirm')) && !(await locked(p, '#btnApplyConfirm')));
  check('1 (찾음 n) 배지 + 툴팁(선택 여럿이면 "레이어 k개")', (await p.textContent('#bindFound')) === '찾음 2' && (await p.getAttribute('#bindFound', 'title')) === '레이어 5개에서 변수와 같은 값 2곳을 찾았어요 · 연결하지 않을 변수는 끄세요', await p.getAttribute('#bindFound', 'title'));
  check('1 건너뛴 곳 없으면 (건너뜀) 배지 없음', !(await visible(p, '#bindSkipToggle')));
  check('1 찾은 뒤 빈 상태 숨김', (await emptyText(p)) === null);
  check('1 변수 카드 하나 · 스위치 켬 · 접힘', JSON.stringify(await cards(p)) === JSON.stringify([['8', '#', 'spacing/8', '2곳', 'true']]) && (await p.$$('#bindTree .bv-place')).length === 0, JSON.stringify(await cards(p)));
  check('1 스위치 role=switch · 이름 "{변수} 연결"', (await p.getAttribute('#bindTree .bv-switch', 'role')) === 'switch' && (await p.getByRole('switch', { name: 'spacing/8 연결', exact: true }).count()) === 1);
  check('1 자리 줄에는 체크박스·값 없음(펼쳐도)', await (async () => { await p.click('#bindTree .bv-tw'); return (await p.$$('#bindTree .bv-place')).length > 0 && (await p.$$('#bindTree .bv-place input')).length === 0 && !(await p.textContent('#bindTree .bv-place')).includes('8'); })());
  check('1 카드 6개 이하 → 필터 숨김', !(await visible(p, '#bindFilterBtn')) && !(await visible(p, '#bindFilterRow')));
  check('1 하위 탭 13px · 높이 32', JSON.stringify(await p.$eval('#applyRail .subtab', (e) => [getComputedStyle(e).fontSize, Math.round(e.getBoundingClientRect().height)])) === JSON.stringify(['13px', 32]));
  // 찾은 곳 0
  await p.click('#btnApply');
  await recv(p, { ...preview(await lastReq(p, 'APPLY')), candidates: [], bound: 0 });
  check('1 0곳 → ∅ + "레이어 5개에서 변수와 같은 값을 찾지 못했어요"', (await emptyText(p)) === '레이어 5개에서 변수와 같은 값을 찾지 못했어요' && (await p.textContent('#bindEmpty .be-art')) === '∅');
  check('1 0곳 단계: 끝 · 아직 · 아직', JSON.stringify(await steps(p)) === JSON.stringify(['done', 'todo', 'todo']));
  check('1 0곳 → (찾음)·모두 켜기·필터·카드 숨김, 건너뜀 없으면 배지 줄 없음', !(await visible(p, '#bindBadges')) && (await p.$$('#bindTree .bv-card')).length === 0);
  check('1 0곳 → [연결] 숫자 없음 · 사유 "연결할 곳이 없어요"', (await named(p, '#btnApplyConfirm', '연결')) && (await lockMsg(p, '#btnApplyConfirm')).includes('연결할 곳이 없어요'));
  await p.click('#btnApply');
  await recv(p, { ...preview(await lastReq(p, 'APPLY')), candidates: [], bound: 0, reasons: { 'already-bound': 2, styled: 1 }, skips: [{ nodeId: 'n1', name: 'card', reason: 'already-bound' }, { nodeId: 'n1', name: 'card', reason: 'styled' }] });
  check('1 0곳 + 건너뜀 → (건너뜀 m ▸)만', (await visible(p, '#bindSkipToggle')) && !(await visible(p, '#bindFound')) && !(await visible(p, '#bindAll')) && !(await visible(p, '#bindFilterBtn')));
  // 찾기 취소 → 찾기 전과 같음. 찾는 중에는 [취소]가 보인다(§4.6)
  await p.click('#btnApply');
  check('1 찾는 중 진행 줄에 [취소] 보임', (await visible(p, '#applyProgress')) && (await visible(p, '#btnApplyCancel')));
  await recv(p, { type: 'APPLY_RESULT', preview: true, cancelled: true, bound: 0, skipped: 0, reasons: {}, reqId: await lastReq(p, 'APPLY') });
  check('1 찾기 취소 → 찾기 전과 같음', JSON.stringify(await steps(p)) === JSON.stringify(['now', 'todo', 'todo']) && (await named(p, '#btnApply', '찾기')) && (await emptyText(p)) === '값이 변수와 같은 곳을 찾아 연결해요');
  check('1 찾기 취소 → 상태 줄 "찾기를 취소했어요"(경고 · 연결 수 없음)', (await p.textContent('#applyStatus')) === '찾기를 취소했어요' && (await p.getAttribute('#applyStatus', 'class')).includes('warn'), await p.textContent('#applyStatus'));
  // 5 + 2: 찾는 중 선택 변경 → 진행률 숨김, 이전 선택의 결과는 버린다
  await recv(p, sel(1, 0));
  await p.click('#btnApply');
  const oldPreview = await lastReq(p, 'APPLY');
  await recv(p, sel(3, 0));
  check('5 찾는 중 선택 변경 → 진행률 숨김 · 돌아가는 표시 없음', !(await visible(p, '#applyProgress')) && !(await p.$eval('#bindSteps .bs', (e) => e.classList.contains('busy'))));
  await recv(p, preview(oldPreview));
  check('2 이전 선택의 찾기 결과는 버림', (await named(p, '#btnApplyConfirm', '연결')) && (await emptyText(p)) === '값이 변수와 같은 곳을 찾아 연결해요');
  // 연결할 변수가 없다는 안내가 보이면 빈 상태 상자는 숨기고 단계는 모두 아직
  await recv(p, { ...PREREQ, hasBindable: false, tierVars: 0, otherVars: 3 });
  check('1 연결할 변수 없음 안내 → 빈 상태 숨김 · 단계 모두 아직', (await visible(p, '#bindPrereq')) && (await emptyText(p)) === null && JSON.stringify(await steps(p)) === JSON.stringify(['todo', 'todo', 'todo']));
  await p.close();
}

/* 1 — 찾기 전 예시는 이 파일의 변수에서(계층 컬렉션 사이드바 순서 · 기본 모드 · 별칭은 대상 값) */
{
  const p = await open();
  await recv(p, PREREQ);
  await recv(p, sel(1, 0));
  check('1 변수 표 전 예시 없음 → 한 줄만', (await p.$$('#bindEmpty .be-row')).length === 0 && (await emptyText(p)) === '값이 변수와 같은 곳을 찾아 연결해요');
  const cols = [
    { id: 'g', name: 'Global', tier: 1, modes: [{ modeId: 'm', name: 'Mode 1' }], defaultModeId: 'm' },
    { id: 'x', name: 'Misc', tier: 0, modes: [{ modeId: 'x1', name: 'Mode 1' }], defaultModeId: 'x1' },
    { id: 's', name: 'Semantic', tier: 2, modes: [{ modeId: 'l', name: 'Light' }, { modeId: 'd', name: 'Dark' }], defaultModeId: 'd' },
  ];
  const vars = [
    { id: 'x0', name: 'misc/red', collectionId: 'x', type: 'COLOR', values: { x1: { kind: 'color', hex: '#FF0000' } }, scopes: [], description: '' },
    { id: 'g0', name: 'color/gray/0', collectionId: 'g', type: 'COLOR', values: { m: { kind: 'color', hex: '#FFFFFF' } }, scopes: [], description: '' },
    { id: 'g9', name: 'color/gray/900', collectionId: 'g', type: 'COLOR', values: { m: { kind: 'color', hex: '#111111' } }, scopes: [], description: '' },
    { id: 'sp', name: 'spacing/16', collectionId: 'g', type: 'FLOAT', values: { m: { kind: 'number', text: '16' } }, scopes: [], description: '' },
    { id: 'tx', name: 'color/text/a-very-long-semantic-name/default', collectionId: 's', type: 'COLOR', values: { l: { kind: 'alias', aliasId: 'g0', aliasName: 'color/gray/0' }, d: { kind: 'alias', aliasId: 'g9', aliasName: 'color/gray/900' } }, scopes: [], description: '' },
  ];
  await recv(p, { type: 'VAR_TABLE', collections: cols, vars });
  const ex = await p.$$eval('#bindEmpty .be-row', (e) => e.map((x) => [x.querySelector('.bv-val').textContent, x.querySelector('.bv-mark').textContent, x.querySelector('.bv-name').textContent]));
  check('1 찾기 전 예시 두 줄 — Semantic 먼저 · 기본 모드(별칭 → 대상 값) · 첫 숫자는 Global', JSON.stringify(ex) === JSON.stringify([['#111111', '●', 'color/text/a-very-long-semantic-name/default'], ['16', '#', 'spacing/16']]), JSON.stringify(ex));
  const w = await p.$eval('#bindEmpty .bv-var', (e) => Math.round(e.getBoundingClientRect().width));
  check('1 예시 변수 이름은 140px에서 말줄임', w <= 140, `${w}px`);
  await recv(p, { type: 'VAR_TABLE', collections: cols, vars: vars.filter((v) => v.type === 'COLOR') });
  check('1 숫자 변수가 없으면 그 줄은 뺀다', (await p.$$('#bindEmpty .be-row')).length === 1);
  await recv(p, sel(0, 0));
  check('1 선택 없음 빈 상태 ⬚ ↖ + 한 줄', (await emptyText(p)) === '캔버스에서 레이어를 선택하세요' && (await p.textContent('#bindEmpty .be-art')) === '⬚ ↖' && JSON.stringify(await steps(p)) === JSON.stringify(['todo', 'todo', 'todo']));
  check('1 선택 없음 → [연결] 사유 "선택이 없어요"', (await lockMsg(p, '#btnApplyConfirm')).includes('선택이 없어요'));
  await p.close();
}

/* 8 — 변수 카드 · 자리 줄 · 스위치 · 모두 켜기/끄기 · 필터 · 연결 후 결과 카드 */
{
  const p = await open();
  await recv(p, PREREQ);
  await recv(p, sel(1, 0));
  const sides = ['paddingLeft', 'paddingRight'].map((f) => c(f, 'vLg'));
  const twoCards = [{ ...c('fills'), index: 0, currentValue: '#ffffff', variableId: 'vC', variableName: 'color/bg' }, ...sides];
  await p.click('#btnApply');
  await recv(p, { ...preview(await lastReq(p, 'APPLY')), candidates: twoCards, reasons: { 'already-bound': 3, styled: 1 }, skips: [{ nodeId: 'n1', name: 'card', reason: 'already-bound' }, { nodeId: 'n1', name: 'card', reason: 'styled' }] });
  check('8 카드 "값 → 변수" · 곳 수 많은 순 · 타입 표시', JSON.stringify(await cards(p)) === JSON.stringify([['8', '#', 'spacing/8', '2곳', 'true'], ['#FFFFFF', '●', 'color/bg', '1곳', 'true']]), JSON.stringify(await cards(p)));
  check('8 값 칩 견본(색)', await p.$eval('#bindTree .bv-card:nth-child(2) .bv-val .bv-sw', (e) => getComputedStyle(e).backgroundColor === 'rgb(255, 255, 255)'));
  check('8 카드 툴팁(+ 일부 빼기 안내)', (await p.getAttribute('#bindTree .bv-head', 'title')) === 'spacing/8을(를) 이 2곳에 연결해요 · 일부만 빼려면 그 레이어를 뺀 나머지를 선택하고 다시 찾기');
  check('8 단일 레이어 (찾음) 툴팁은 레이어 이름', (await p.getAttribute('#bindFound', 'title')).startsWith('Card에서'));
  // (건너뜀 m ▸) — m = 사유 합, 펼침 버튼
  check('8 (건너뜀 4 ▸) · aria-expanded=false · 접근성 이름', (await p.textContent('#bindSkipToggle')) === '건너뜀 4 ▸' && (await p.getAttribute('#bindSkipToggle', 'aria-expanded')) === 'false' && (await p.getAttribute('#bindSkipToggle', 'aria-label')) === '건너뜀 4곳 사유 보기' && !(await visible(p, '#bindSkips')));
  await p.click('#bindSkipToggle');
  check('8 건너뜀 펼침 → 사유 칩 줄 · ▾', (await visible(p, '#bindSkips')) && (await p.getAttribute('#bindSkipToggle', 'aria-expanded')) === 'true' && (await p.textContent('#bindSkipToggle')) === '건너뜀 4 ▾' && JSON.stringify(await p.$$eval('#bindSkips .skip-chip', (e) => e.map((x) => x.textContent))) === JSON.stringify(['이미 연결됨 3 ›', '스타일 사용 중 1 ›']));
  await p.click('#bindSkips .skip-chip');
  check('8 사유 칩 → 그 레이어 캔버스 선택', (await sent(p, 'SELECT_NODES')).at(-1)?.ids?.[0] === 'n1');
  // 카드는 처음에 접혀 있다 — 자리 줄을 보려면 펼친다(누를 때마다 다시 그리므로 매번 새로 찾는다).
  for (let i = 0, n = (await p.$$('#bindTree .bv-tw')).length; i < n; i++) await p.click(`#bindTree .bv-card >> nth=${i} >> .bv-tw`);
  check('8 펼침 ▾ · aria-expanded', (await p.$$eval('#bindTree .bv-tw', (e) => e.every((x) => x.getAttribute('aria-expanded') === 'true' && x.textContent.endsWith('▾')))));
  const places = await p.$$eval('#bindTree .bv-place', (e) => e.map((x) => [x.querySelector('.bv-ic').textContent, x.querySelector('.bv-layer').textContent, x.querySelector('.bv-prop').textContent]));
  check('8 자리 줄 [속성 아이콘] 레이어 · 속성 — 좌우 여백은 한 줄 "· 2곳"', JSON.stringify(places) === JSON.stringify([['⇔', 'card', '좌우 여백 · 2곳'], ['▣', 'card', '채움 색']]), JSON.stringify(places));
  await p.click('#bindTree .bv-layer');
  check('8 레이어 이름 → 캔버스 선택', (await sent(p, 'SELECT_NODES')).at(-1)?.ids?.[0] === 'n1');
  // 스위치 끄기: 버튼 수 · 회색(opacity 아님) · 툴팁 · 포커스 유지
  await p.click('#bindTree .bv-card >> nth=0 >> .bv-switch');
  check('8 스위치 끔 → [1곳 연결]', await named(p, '#btnApplyConfirm', '1곳 연결'));
  check('8 끈 카드: aria-checked=false · 회색 글자(opacity 아님) · 툴팁 "끄면 이 2곳은 그대로 둬요"', await p.$eval('#bindTree .bv-card', (e) => e.classList.contains('off') && e.querySelector('.bv-switch').getAttribute('aria-checked') === 'false' && getComputedStyle(e).opacity === '1' && getComputedStyle(e.querySelector('.bv-var')).color === 'rgb(94, 99, 107)' && e.querySelector('.bv-head').title === '끄면 이 2곳은 그대로 둬요'));
  check('8 스위치를 눌러도 포커스는 그 스위치', await p.evaluate(() => document.activeElement?.classList.contains('bv-switch') && document.activeElement.closest('.bv-card').dataset.var === 'vLg'));
  await p.keyboard.press('Space');
  check('8 Space로 다시 켬', (await p.getAttribute('#bindTree .bv-card >> nth=0 >> .bv-switch', 'aria-checked')) === 'true' && (await named(p, '#btnApplyConfirm', '3곳 연결')));
  // 모두 켜기/끄기 — 하나라도 꺼져 있으면 "모두 켜기"
  check('8 모두 켜져 있으면 [모두 끄기]', (await p.textContent('#bindAll')) === '모두 끄기');
  await p.click('#bindAll');
  check('8 [모두 끄기] → 모두 끔 · [모두 켜기] · 포커스는 버튼', (await p.$$eval('#bindTree .bv-switch', (e) => e.every((x) => x.getAttribute('aria-checked') === 'false'))) && (await p.textContent('#bindAll')) === '모두 켜기' && (await p.evaluate(() => document.activeElement?.id)) === 'bindAll');
  check('8 모두 끔 → [연결] 사유 "연결할 변수를 켜세요"', (await named(p, '#btnApplyConfirm', '0곳 연결')) && (await lockMsg(p, '#btnApplyConfirm')).includes('연결할 변수를 켜세요'));
  await p.click('#bindAll');
  // 접기 — 직접 펼치거나 접은 카드는 기억
  await p.click('#bindTree .bv-card >> nth=0 >> .bv-tw');
  check('8 접기 → 자리 줄 숨김 · 포커스 유지', (await p.$$('#bindTree .bv-card:first-child .bv-place')).length === 0 && (await p.getAttribute('#bindTree .bv-card >> nth=0 >> .bv-tw', 'aria-expanded')) === 'false' && (await p.evaluate(() => document.activeElement?.classList.contains('bv-tw'))));
  await p.click('#btnApply');
  await recv(p, { ...preview(await lastReq(p, 'APPLY')), candidates: twoCards });
  check('8 다시 찾아도 접힘·펼침 유지', (await p.$$('#bindTree .bv-card:first-child .bv-place')).length === 0 && (await p.$$('#bindTree .bv-card:nth-child(2) .bv-place')).length === 1);
  check('8 다시 찾으면 건너뜀 접힘', !(await visible(p, '#bindSkips')));
  // 필터 — 카드 7개 이상일 때만, 보이는 카드에만 모두 켜기/끄기, 필터 밖 켠 곳
  const seven = Array.from({ length: 7 }, (_, i) => ({ ...c('width', `v${i}`), nodeId: `n${i}`, variableName: i === 6 ? 'color/x' : `size/${i}` }));
  await p.click('#btnApply');
  await recv(p, { ...preview(await lastReq(p, 'APPLY')), candidates: seven });
  check('8 카드 7개 → [필터] 보임(24×24)', (await visible(p, '#bindFilterBtn')) && !(await visible(p, '#bindFilterRow')) && (await p.$eval('#bindFilterBtn', (e) => e.getBoundingClientRect().width >= 24 && e.getBoundingClientRect().height >= 24)));
  await p.click('#bindFilterBtn');
  check('8 [필터] → 입력칸 열림 · 포커스', (await visible(p, '#bindFilterRow')) && (await p.evaluate(() => document.activeElement?.id)) === 'bindFilter' && (await p.getAttribute('#bindFilterBtn', 'aria-expanded')) === 'true');
  await p.fill('#bindFilter', 'size');
  check('8 필터 → 걸린 카드만', (await p.$$('#bindTree .bv-card')).length === 6);
  await p.click('#bindAll');
  check('8 필터 중 [모두 끄기]는 보이는 카드에만 · 숫자는 전체', (await named(p, '#btnApplyConfirm', '1곳 연결')) && (await p.textContent('#bindAll')) === '모두 켜기');
  check('8 필터 밖 켠 곳 "필터 밖 1곳 포함"', (await p.textContent('#bindOutside')) === '필터 밖 1곳 포함', await p.textContent('#bindOutside'));
  await p.click('#bindAll');
  await p.fill('#bindFilter', 'color');
  check('8 필터 중 보이지 않는 카드의 스위치는 그대로', (await named(p, '#btnApplyConfirm', '7곳 연결')));
  // 카드 6개 이하여도 필터 칸에 글자가 있으면 [필터]는 보인다
  await p.click('#btnApply');
  await recv(p, { ...preview(await lastReq(p, 'APPLY')), candidates: twoCards });
  check('8 카드 6개 이하 + 필터 글자 있음 → [필터] 보임', (await visible(p, '#bindFilterBtn')) && (await p.$$('#bindTree .bv-card')).length === 1);
  await p.focus('#bindFilter');
  await p.keyboard.press('Escape');
  check('8 Esc → 필터 비우고 닫힘 · 6개 이하라 [필터] 숨김', !(await visible(p, '#bindFilterRow')) && !(await visible(p, '#bindFilterBtn')) && (await p.$$('#bindTree .bv-card')).length === 2);
  // 연결 후: 결과 카드 + (건너뜀 m ▸), 배지 줄·필터·카드 지움
  await p.click('#btnApplyConfirm');
  const applyId = await lastReq(p, 'APPLY_SELECTED');
  check('8 연결 요청은 켠 곳만', (await sent(p, 'APPLY_SELECTED')).at(-1).items.length === 3);
  check('8 연결 중 → 진행 줄 "연결 중…" · [취소] 숨김(연결은 멈추지 않는다)', (await visible(p, '#applyProgress')) && (await p.textContent('#applyProgressText')) === '연결 중…' && !(await visible(p, '#btnApplyCancel')));
  await recv(p, { type: 'APPLY_RESULT', bound: 3, skipped: 1, reasons: { changed: 1 }, skips: [{ nodeId: 'n1', name: 'card', reason: 'changed' }], reqId: applyId });
  check('8 연결 후 결과 카드 "3곳 연결됨" + "변수 탭에서 보기 →"', (await visible(p, '#bindDone')) && (await p.textContent('#bindDoneText')) === '3곳 연결됨' && (await p.textContent('#btnBindToList')) === '변수 탭에서 보기 →');
  check('8 연결 후 카드·(찾음)·모두 켜기·필터 없음', (await p.$$('#bindTree .bv-card')).length === 0 && !(await visible(p, '#bindFound')) && !(await visible(p, '#bindAll')) && !(await visible(p, '#bindFilterBtn')) && (await emptyText(p)) === null);
  check('8 연결 후 다시 확인 건너뜀 (건너뜀 1 ▸) — 결과 카드 아래', (await p.textContent('#bindSkipToggle')) === '건너뜀 1 ▸' && (await p.$eval('#bindDone', (d) => d.getBoundingClientRect().bottom <= document.getElementById('bindSkipToggle').getBoundingClientRect().top)));
  await p.click('#bindSkipToggle');
  check('8 연결 후 건너뜀 펼침 → 그 사유 칩', JSON.stringify(await p.$$eval('#bindSkips .skip-chip', (e) => e.map((x) => x.textContent))) === JSON.stringify(['그 사이 바뀜 1 ›']));
  check('8 연결 후 단계: 셋 다 끝', JSON.stringify(await steps(p)) === JSON.stringify(['done', 'done', 'done']));
  check('8 연결 후 [다시 찾기] 주 버튼 · [연결] 숫자 없이 잠금', (await named(p, '#btnApply', '다시 찾기')) && (await primary(p, '#btnApply')) && (await named(p, '#btnApplyConfirm', '연결')) && (await locked(p, '#btnApplyConfirm')));
  check('8 연결 후 [연결] 사유 "먼저 [찾기]를 누르세요"', (await lockMsg(p, '#btnApplyConfirm')).includes('먼저 [찾기]를 누르세요'));
  await p.click('#btnBindToList');
  check('8 변수 탭에서 보기 → 변수 탭', (await p.$eval('.tab-btn.active', (e) => e.id)) === 'tabbtn-variables');
  await p.close();
}

/* 8 — 포커스 순서(§4.6): 버튼 줄 → 배지 줄(건너뜀 · 사유 칩 · 모두 · 필터) → 필터 칸 → 카드마다 ▾ · 스위치 · 레이어 이름 → 기존 스타일 연결 */
{
  const p = await open();
  await recv(p, PREREQ);
  await recv(p, sel(1, 0));
  const seven = Array.from({ length: 7 }, (_, i) => ({ ...c('width', `v${i}`), nodeId: 'n1', variableName: `size/${i}` }));
  await p.click('#btnApply');
  await recv(p, { ...preview(await lastReq(p, 'APPLY')), candidates: seven, reasons: { 'already-bound': 1 }, skips: [{ nodeId: 'n1', name: 'card', reason: 'already-bound' }] });
  await p.click('#bindSkipToggle');
  await p.click('#bindFilterBtn');
  await p.click('#bindTree .bv-card >> nth=0 >> .bv-tw');
  await p.focus('#applyRail [data-apply-step="bind"]');
  const order = [];
  for (let i = 0; i < 25; i++) {
    await p.keyboard.press('Tab');
    const id = await p.evaluate(() => {
      const a = document.activeElement;
      if (!a) return '';
      if (a.id) return '#' + a.id;
      const card = a.closest('.bv-card');
      return (a.closest('#bindSkips') ? 'chip' : card ? `${card.dataset.var}:${a.className.split(' ').find((x) => x.startsWith('bv-'))}` : a.tagName);
    });
    order.push(id);
    if (id === '#btnApplyExistingText') break;
  }
  const expect = ['#btnApply', '#btnApplyConfirm', '#bindSkipToggle', 'chip', '#bindAll', '#bindFilterBtn', '#bindFilter', 'v0:bv-tw', 'v0:bv-switch', 'v0:bv-layer'];
  check('8 포커스 순서 — 하위 탭 → 버튼 줄 → 배지 줄 → 필터 칸 → 카드(▾ · 스위치 · 레이어) → 기존 스타일 연결', JSON.stringify(order.slice(0, expect.length)) === JSON.stringify(expect) && order.at(-1) === '#btnApplyExistingText' && !order.some((x) => x === 'LI' || x === '#bindSteps'), JSON.stringify(order));
  await p.close();
}

/* 9 — 변수 탭(IA v3 §4.2~§4.4) */
const COLS = [
  { id: 'g', name: 'Global', tier: 1, modes: [{ modeId: 'm', name: 'Mode 1' }], defaultModeId: 'm', tierSet: null },
  { id: 's', name: 'Semantic', tier: 2, modes: [{ modeId: 'l', name: 'Light' }, { modeId: 'd', name: 'Dark' }], defaultModeId: 'l', tierSet: null },
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
  const p = await open(400, null);
  await recv(p, PREREQ);
  check('9 첫 표 전에는 불러오는 중', await visible(p, '#varLoading'));
  await recv(p, { type: 'VAR_TABLE', collections: [], vars: [] });
  check('9 로컬 변수 0개 → 시작 화면', (await visible(p, '#varStart')) && !(await visible(p, '#varList')));
  check('9 무료 시작 화면: 무료 안내 + [이름 정리 실행]', (await visible(p, '#startFree')) && (await p.textContent('#btnWizardRun')) === '이름 정리 실행');
  await recv(p, { type: 'VAR_TABLE', collections: COLS, vars: VARS });
  check('9 로컬 변수 있음 → 목록', await visible(p, '#varList'));
  // 사이드바(결정 B): ★ Inspect · 계층 순서(S → G), 선택 없으면 전체 수, 첫 컬렉션만 펼침
  check('9 사이드바 항목·숫자(선택 없음)', JSON.stringify(await sideItems(p)) === JSON.stringify([['★ Inspect', '—'], ['Semantic', '1'], ['color/text', '1'], ['Global', '4']]), JSON.stringify(await sideItems(p)));
  check('9 칩 줄 없음', (await p.$('#chipRow')) === null);
  check('9 선택 없음 → 첫 컬렉션 고름 + 상황 안내 줄', (await sideSelected(p)) === 'side:col:s' && (await p.textContent('#situationLine')) === '레이어를 선택하면 쓰는 변수가 ★ Inspect에 모여요');
  check('9 모드 ▾(보이는 모드 2개 이상)', await visible(p, '#modeSelect'));
  check('9 선택 없음: 사용 "—"', JSON.stringify(await rowIds(p)) === JSON.stringify(['tx']) && (await p.textContent('.vt-row[data-id="tx"] .use')) === '—');
  // 선택 → 400ms 뒤 SCAN_USAGE(목록 기준 = 지금 선택), 응답 동안 칩 "…"
  await recv(p, { ...sel(1, 2), scanned: 40, firstName: 'Card', ids: ['1:2'] });
  await p.waitForTimeout(450);
  const req = (await sent(p, 'SCAN_USAGE')).at(-1);
  check('9 선택 변경 → SCAN_USAGE(기준 = 지금 선택)', req?.nodeIds?.[0] === '1:2');
  check('9 읽는 중 사이드바 숫자 "…"', (await p.textContent('#varSide')).includes('…'));
  await recv(p, usageResult(req.reqId, { tx: { places: 8, layers: 5 }, sp8: { places: 3, layers: 2 } }));
  const ids = await rowIds(p);
  // tx는 Light에서 g9, Dark에서 g0을 가리킨다 — 간접은 모든 모드를 본다.
  check('9 쓰는 변수 있음 → ★ Inspect 고름', (await sideSelected(p)) === 'side:inspect');
  check('9 ★ Inspect: 쓰는 행만(직접 + 간접, 모든 모드)', JSON.stringify(ids) === JSON.stringify(['tx', 'g0', 'g9', 'sp8']), ids.join(','));
  check('9 ★ Inspect: 경로 머리', JSON.stringify(await p.$$eval('#varTree .vt-path', (e) => e.map((x) => x.textContent))) === JSON.stringify(['S Semantic › color/text', 'G Global › color/gray', 'G Global › spacing']));
  check('9 간접 사용 "↳"', (await p.textContent('.vt-row[data-id="g9"] .use')) === '↳');
  check('9 사용 수 "곳"', (await p.textContent('.vt-row[data-id="tx"] .use')) === '8곳');
  check('9 사이드바 사용/전체', JSON.stringify((await sideItems(p)).slice(0, 2)) === JSON.stringify([['★ Inspect', '4'], ['Semantic', '1/1']]), JSON.stringify(await sideItems(p)));
  await p.click('#varSide [data-key="side:col:g"]');
  check('9 컬렉션 고름 → 모든 행(쓰는 것 먼저, 안 쓰는 행 "안 씀")', JSON.stringify(await rowIds(p)) === JSON.stringify(['g0', 'g9', 'sp8', 'r4']) && (await p.textContent('.vt-row[data-id="r4"] .use')) === '안 씀');
  check('9 컬렉션 고르면 그룹이 사이드바에 펼쳐짐', (await sideItems(p)).some(([n]) => n === 'radius'));
  await p.click('#varSide [data-key="side:grp:g|radius"]');
  check('9 그룹 고름 → 그 그룹만', JSON.stringify(await rowIds(p)) === JSON.stringify(['r4']) && (await p.textContent('#varMainTitle')) === 'radius');
  await p.click('#varSide [data-key="side:inspect"]');
  // 우클릭 메뉴 — 교체 없음
  await rightClick(p, '.vt-row[data-id="tx"]');
  const items = await p.$$eval('.ctx-menu button', (e) => e.map((x) => x.textContent));
  check('9 행 메뉴(복사 3 · 사용 레이어 선택 · 이동 · 상세 · 고치기, 교체 없음)', JSON.stringify(items) === JSON.stringify(['이름 복사', '값 복사', 'CSS 변수명 복사', '사용 레이어 선택', '가리키는 변수로 이동', '상세', '고치기…']), items.join('|'));
  await p.click('.ctx-menu button >> text=사용 레이어 선택');
  const selReq = (await sent(p, 'SELECT_VAR_USERS')).at(-1);
  check('9 사용 레이어 선택 → 기준 안에서 새로 찾기', selReq?.varIds?.[0] === 'tx' && selReq?.nodeIds?.[0] === '1:2');
  await recv(p, { type: 'SELECT_RESULT', found: 200, requested: 340, capped: true });
  check('9 200개 상한 문구', (await p.textContent('#statusText')).includes('레이어 200개만 선택했어요(전체 340개)'));
  // 플러그인이 만든 선택 → 기준 유지 + [기준 바꾸기]
  await recv(p, { ...sel(3, 2), scanned: 60, selfSelect: true, ids: ['a', 'b', 'c'] });
  check('9 플러그인이 만든 선택은 기준 유지 → 상황 안내 줄 맨 앞', (await p.textContent('#situationLine')).startsWith('목록 기준: Card · 지금 선택과 달라요') && (await visible(p, '#situationLine button')), await p.textContent('#situationLine'));
  check('9 선택 표시줄 없음', (await p.$('#selBarWrap')) === null);
  const scansBefore = (await sent(p, 'SCAN_USAGE')).length;
  await p.click('#situationLine button');
  await p.waitForTimeout(450);
  check('9 [기준 바꾸기] → 새 기준으로 읽기', (await sent(p, 'SCAN_USAGE')).length === scansBefore + 1 && !(await p.textContent('#situationLine')).includes('목록 기준'));
  await recv(p, usageResult((await sent(p, 'SCAN_USAGE')).at(-1).reqId, { tx: { places: 8, layers: 5 }, sp8: { places: 3, layers: 2 } }));
  // 큰 선택(⑤): 자동으로 읽지 않고 [읽기]
  const s0 = (await sent(p, 'SCAN_USAGE')).length;
  await recv(p, { ...sel(1, 2), scanned: 1200, ids: ['big'] });
  await p.waitForTimeout(450);
  check('9 큰 선택은 자동으로 읽지 않음 — ★ 빈 상태에만(상황 안내 줄엔 없음)', (await sent(p, 'SCAN_USAGE')).length === s0 && (await p.textContent('#varTree')).includes('선택이 커서 자동으로 읽지 않아요') && !(await visible(p, '#situationLine')));
  await p.click('#varTree .vt-empty button');
  check('9 [읽기] → 300개 무시하고 읽기', (await sent(p, 'SCAN_USAGE')).length === s0 + 1);
  await recv(p, usageResult((await sent(p, 'SCAN_USAGE')).at(-1).reqId, {}));
  check('9 안 쓰는 선택 안내(★ 빈 상태)', (await p.textContent('#varTree')).includes('이 선택은 로컬 변수를 쓰지 않아요'));
  // ↻ — 결과 문구
  await p.click('#btnVarRefresh');
  await recv(p, { type: 'VAR_TABLE', collections: COLS, vars: VARS });
  await recv(p, usageResult((await sent(p, 'SCAN_USAGE')).at(-1).reqId, { tx: { places: 1, layers: 1 } }));
  check('9 ↻ 결과 "사용 수가 바뀐 변수 n개"', (await p.textContent('#statusText')) === '다시 읽음 · 사용 수가 바뀐 변수 1개', await p.textContent('#statusText'));
  // 검색 — 결과 없음
  await p.click('#btnSearch');
  await p.fill('#varSearch', 'zzz');
  check('9 검색 결과 없음 문구', (await p.textContent('#varTree')).includes("'zzz'와 맞는 변수가 없어요"));
  await p.keyboard.press('Escape');
  check('9 Esc로 검색 닫힘', !(await visible(p, '#searchBox')));
  // 상세 팝업 — 큰 기준이면 자동으로 찾지 않고 [찾기]
  await p.dblclick('.vt-row[data-id="tx"] .nm');
  check('9 큰 기준의 상세 → [찾기]', (await p.textContent('.modal')).includes('선택이 커서 자동으로 찾지 않아요') && (await sent(p, 'FIND_VAR_USERS')).length === 0);
  await p.keyboard.press('Escape');
  await recv(p, { ...sel(1, 2), scanned: 40, firstName: 'Card', ids: ['1:2'] });
  await p.waitForTimeout(450);
  await recv(p, usageResult((await sent(p, 'SCAN_USAGE')).at(-1).reqId, { tx: { places: 8, layers: 5 }, sp8: { places: 3, layers: 2 } }));
  // 상세 팝업 — 기준 안에서 쓰인 곳(최대 50)
  await p.dblclick('.vt-row[data-id="tx"] .nm');
  const fq = (await sent(p, 'FIND_VAR_USERS')).at(-1);
  check('9 상세 → 쓰인 곳 새로 찾기(50)', fq?.limit === 50 && fq?.varIds?.[0] === 'tx');
  await recv(p, { type: 'VAR_USERS', reqId: fq.reqId, layers: [{ id: 'n1', name: 'Title' }], totalLayers: 60, places: 80 });
  check('9 상세 "인스턴스 안쪽 포함" · 외 n개', (await p.textContent('.modal')).includes('레이어 60개 · 80곳 · 인스턴스 안쪽 포함') && (await p.textContent('.modal')).includes('외 59개'));
  await p.keyboard.press('Escape');
  check('9 Esc로 팝업 닫힘 · 원래 행으로 포커스', (await p.$('.modal')) === null && (await p.evaluate(() => document.activeElement?.dataset?.id)) === 'tx');
  // 알약 이동 + 되돌리기
  await p.click('.vt-row[data-id="tx"] .alias-pill');
  check('9 알약 → 가리키는 행으로 포커스', (await p.evaluate(() => document.activeElement?.dataset?.id)) === 'g9');
  await p.click('#statusAction');
  check('9 되돌리기 → 원래 행', (await p.evaluate(() => document.activeElement?.dataset?.id)) === 'tx');
  // 키보드 — 사이드바(tree): ↑↓ 이동, Enter 고르기
  await p.focus('#varSide [data-key="side:inspect"]');
  await p.keyboard.press('ArrowDown');
  check('9 사이드바 ↓ → 다음 항목(고르지 않음)', (await p.evaluate(() => document.activeElement?.dataset?.key)) === 'side:col:s' && (await sideSelected(p)) === 'side:inspect');
  await p.keyboard.press('Enter');
  check('9 사이드바 Enter → 고르기', (await sideSelected(p)) === 'side:col:s');
  await p.click('#varSide [data-key="side:inspect"]');
  // ⋯ → 계층 팝업 · 내보내기 팝업, 설정 탭에는 없다
  await p.click('#btnVarMore');
  const more = await p.$$eval('.ctx-menu button', (e) => e.map((x) => x.textContent));
  check('9 ⋯ 메뉴', JSON.stringify(more) === JSON.stringify(['컬렉션 계층 지정…', '코드로 내보내기…', '사이드바 모두 펼치기', '사이드바 모두 접기']), more.join('|'));
  await p.click('.ctx-menu button >> text=컬렉션 계층 지정…');
  check('9 계층 팝업 열 때 계층 정보 읽기', (await sent(p, 'GET_COLLECTION_ROLES')).length > 0 && (await p.textContent('.modal')).includes('컬렉션 계층'));
  await p.keyboard.press('Escape');
  check('9 팝업 닫으면 [⋯]로 포커스', (await p.evaluate(() => document.activeElement?.id)) === 'btnVarMore');
  await p.click('#tabbtn-settings');
  check('9 설정 탭에 계층·내보내기 없음', !(await p.textContent('#tab-settings')).includes('컬렉션 계층') && !(await p.textContent('#tab-settings')).includes('코드로 내보내기'));
  await p.close();
}
{
  // §4.2 — 선택이 있는 채로 처음 목록에 들어오면 사용 수가 올 때까지 "읽는 중" 한 줄만
  const p = await open(400, null);
  await recv(p, PREREQ);
  await recv(p, { ...sel(1, 2), scanned: 40, ids: ['1:2'] });
  await recv(p, { type: 'VAR_TABLE', collections: COLS, vars: VARS });
  check('9 처음 목록 + 선택 → "읽는 중" 한 줄만', (await p.textContent('#varTree')).trim() === '선택에서 쓰는 변수 읽는 중…' && (await rowIds(p)).length === 0);
  await p.waitForTimeout(450);
  await recv(p, usageResult((await sent(p, 'SCAN_USAGE')).at(-1).reqId, { tx: { places: 2, layers: 1 } }));
  check('9 사용 수가 오면 한 번에 목록', (await rowIds(p)).includes('tx'));
  await p.close();
}
{
  // LIB 구역 · 삭제된 변수 줄
  const p = await open(400, null);
  await recv(p, PREREQ);
  await recv(p, { type: 'VAR_TABLE', collections: COLS, vars: VARS });
  await recv(p, { ...sel(1, 2), scanned: 40, ids: ['1:2'] });
  await p.waitForTimeout(450);
  await recv(p, usageResult((await sent(p, 'SCAN_USAGE')).at(-1).reqId, { L1: { places: 2, layers: 1 } }, { libraryVars: [{ id: 'L1', name: 'core/blue/500', collection: 'Core', type: 'COLOR', value: { kind: 'color', hex: '#3366FF' }, aliasTargets: [] }], deleted: { count: 3, nodeIds: ['x'] } }));
  check('9 쓰는 로컬 변수 0 → 첫 컬렉션', (await sideSelected(p)) === 'side:col:s');
  await p.click('#varSide [data-key="side:lib"]');
  check('9 사이드바 라이브러리: 실제 이름 + LIB', (await p.textContent('.vt-row[data-id="L1"]')).includes('core/blue/500LIB'));
  await p.click('#varSide [data-key="side:deleted"]');
  check('9 사이드바 삭제된 변수 → 삭제된 변수에 연결된 곳 n개', (await p.textContent('#varTree')).includes('삭제된 변수에 연결된 곳 3개'));
  await p.close();
}

/* 7 — '다음 →'은 툴바 오른쪽 끝(만들기 › 색) */
{
  const p = await open(400, 'variables');
  await recv(p, PREREQ);
  await recv(p, { type: 'VAR_TABLE', collections: [], vars: [] });
  await p.click('#btnGoMake');
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
  check('10 선택 표시줄 없음(탭 바 바로 아래가 탭 내용)', (await p.$('#selBarWrap')) === null);
  await recv(p, PREREQ);
  await recv(p, sel(0, 0));
  // 선택이 없을 때 화면별 안내(§4.1)
  await p.click('#tabbtn-layer');
  check('10 선택 없음 — 연결 화면 빈 상태 "캔버스에서 레이어를 선택하세요"', (await emptyText(p)) === '캔버스에서 레이어를 선택하세요');
  await p.click('#applyRail [data-apply-step="rename"]');
  check('10 선택 없음 — 이름 목록 자리', (await p.textContent('#diff')).includes('선택이 없어요 — 캔버스에서 레이어를 선택하세요'));
  await p.click('#applyRail [data-apply-step="structure"]');
  check('10 선택 없음 — 컴포넌트 목록 자리', (await p.textContent('#compTree')).includes('선택이 없어요 — 캔버스에서 레이어를 선택하세요'));
  await p.click('#applyRail [data-apply-step="bind"]');
  await recv(p, { ...sel(1, 0), scanned: 43, firstName: 'Card', ids: ['1:2'] });
  check('10 선택하면 연결 화면 빈 상태가 찾기 전으로', (await emptyText(p)) === '값이 변수와 같은 곳을 찾아 연결해요');
  for (const tb of ['layer', 'settings', 'variables', 'layer', 'variables']) await p.click(`#tabbtn-${tb}`);
  check('10 탭 전환 시 크기 요청 0회', (await count(p, 'SET_UI_SIZE')) === 0);
  // 하위 화면·단계 기억(§2.6)
  await p.click('#tabbtn-variables');
  await recv(p, { type: 'VAR_TABLE', collections: [], vars: [] }); // 시작 화면 → [색부터 하나씩 만들기 →]
  await p.click('#btnGoMake');
  await p.click('#makeRail [data-make-step="theme"]');
  await p.click('#tabbtn-layer');
  await p.click('#tabbtn-variables');
  check('10 탭 상태 유지(만들기 › 테마)', (await visible(p, '#varMake')) && (await visible(p, '#darkCard')));
  await p.click('#btnMakeBack');
  check('10 ← 돌아가기 → 변수 첫 화면', (await visible(p, '#varStart')) && !(await visible(p, '#varMake')));
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
  const p = await open(400, 'variables');
  await recv(p, PREREQ);
  await recv(p, { type: 'VAR_TABLE', collections: [], vars: [] });
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
  await recv(p, { type: 'VAR_TABLE', collections: COLS, vars: VARS });
  const small = await p.evaluate(() => ['btnMinimize', 'btnReadiness', 'btnFindUnbound', 'btnAddVar', 'btnVarMore', 'btnVarRefresh', 'btnSearch'].map((id) => {
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
  await p.click('#bindTree .bv-tw'); // 카드는 접혀 있다 — 펼쳐야 목록이 길어진다
  await p.evaluate(() => window.scrollTo(0, 900));
  await p.waitForTimeout(100);
  const tb = await p.evaluate(() => {
    const bar = document.querySelector('.step[data-apply-step="bind"] .toolbar').getBoundingClientRect();
    const tabs = document.querySelector('.tabs').getBoundingClientRect();
    return { top: Math.round(bar.top), bottom: Math.round(bar.bottom), selBottom: Math.round(tabs.bottom), sy: window.scrollY };
  });
  check('10 510에서 버튼 줄이 스크롤해도 보임', tb.sy > 0 && tb.top >= tb.selBottom && tb.bottom <= 510 - 24, JSON.stringify(tb));
  const st = await p.evaluate(() => {
    const s = document.getElementById('bindSteps').getBoundingClientRect();
    const b = document.getElementById('btnApply').getBoundingClientRect();
    const tabs = document.querySelector('.tabs').getBoundingClientRect();
    return { top: Math.round(s.top), bottom: Math.round(s.bottom), btnTop: Math.round(b.top), tabs: Math.round(tabs.bottom) };
  });
  check('10 단계 표시도 버튼 줄 위에 함께 고정', st.top >= st.tabs && st.bottom <= st.btnTop, JSON.stringify(st));
  const area = await p.evaluate(() => {
    const tabs = document.querySelector('.tabs').getBoundingClientRect();
    return { contentH: Math.round(510 - tabs.bottom - 24) };
  });
  console.log(`  · §8 실측: 탭 내용 영역 ${area.contentH}px (탭 바 아래 · 상태 줄 24px 제외, 선택 표시줄 없음)`);
  await p.close();
}
/* 11 — 레이어 탭(IA v3 §4.6~§4.7) */
{
  // 하위 탭(밑줄) · "다음 →" 없음
  const p = await open();
  check('11 하위 탭 3개(밑줄)', JSON.stringify(await p.$$eval('#applyRail .subtab', (e) => e.map((x) => x.textContent))) === JSON.stringify(['연결', '이름', '컴포넌트']));
  check('11 연결·이름 카드에 "다음 →" 없음', (await p.$$('#tab-layer .btn-next')).length === 0);
  await p.focus('#applyRail [data-apply-step="bind"]');
  await p.keyboard.press('ArrowRight');
  check('11 하위 탭 → 키로 이동', (await p.getAttribute('#applyRail [data-apply-step="rename"]', 'aria-selected')) === 'true');
  await p.click('#applyRail [data-apply-step="bind"]');
  // 선택 없음: 세 버튼 aria-disabled + 사유
  await recv(p, PREREQ);
  await recv(p, sel(0, 0));
  const locks = await p.evaluate(() => ['btnApply', 'btnApplyExistingText'].map((id) => document.getElementById(id).getAttribute('aria-disabled')));
  check('11 선택 없음 → 찾기·기존 스타일 연결 잠금', locks.every((x) => x === 'true'));
  await p.click('#btnApply', { force: true });
  check('11 잠긴 찾기 → 사유', (await p.textContent('#statusText')).includes('선택이 없어요'));
  check('11 잠긴 찾기는 요청하지 않음', (await sent(p, 'APPLY')).length === 0);
  // 연결할 변수가 없을 때 4행
  await recv(p, sel(1, 0));
  await recv(p, { ...PREREQ, hasBindable: false, tierVars: 0, otherVars: 3 });
  check('11 계층 없음 → "계층 지정하기 →"', (await p.textContent('#bindPrereq')).includes('변수는 있지만 계층이 지정되지 않았어요') && (await p.textContent('#bindPrereqAction')) === '계층 지정하기 →');
  await recv(p, { ...PREREQ, hasBindable: false, tierVars: 0, otherVars: 0 });
  check('11 로컬 변수 0개(무료) → 라이선스 →', (await p.textContent('#bindPrereq')).includes('연결할 변수가 없어요') && (await p.textContent('#bindPrereqAction')) === '라이선스 →');
  const libReq = (await sent(p, 'SCAN_USAGE')).at(-1);
  check('11 로컬 변수 0개 → 라이브러리 사용 읽기(②)', !!libReq && libReq.nodeIds?.[0] === 's0');
  await recv(p, { type: 'USAGE_RESULT', reqId: libReq.reqId, usage: { L: { places: 1, layers: 1 } }, libraryVars: [{ id: 'L', name: 'core/x', collection: 'Core', type: 'COLOR', aliasTargets: [] }], deleted: { count: 0, nodeIds: [] }, scanned: 40 });
  check('11 ② 라이브러리만 → 오른쪽 패널 안내, 버튼 없음', (await p.textContent('#bindPrereq')).includes('라이브러리 변수 연결은 피그마 오른쪽 패널에서 해요') && !(await visible(p, '#bindPrereqAction')));
  // 기존 스타일 연결(무료): 등록된 스타일 없음 → 사유 + 타이포 이동
  await recv(p, { ...PREREQ, hasTextStyles: false });
  await p.click('#btnApplyExistingText', { force: true });
  check('11 텍스트 스타일 없음 → 사유 + 타이포에서 등록 →', (await p.textContent('#statusText')).includes('등록된 텍스트 스타일이 없어요') && (await p.textContent('#statusAction')).includes('타이포에서 등록'));
  await recv(p, { ...PREREQ, hasTextStyles: true });
  await p.click('#btnApplyExistingText');
  check('11 기존 스타일 연결은 무료(요청 보냄)', (await sent(p, 'APPLY_TEXT_STYLES')).length === 1);
  await recv(p, { type: 'TEXT_STYLES_APPLIED', applied: 4, skipped: 1, skipReasons: { hasStyle: 1 } });
  check('11 결과 한 줄 "✓ 텍스트 4개에 스타일 연결 · 건너뜀 1" + 사유 툴팁', (await p.textContent('#tsApplyResult')) === '✓ 텍스트 4개에 스타일 연결 · 건너뜀 1' && (await p.getAttribute('#tsApplyResult', 'title')) === '이미 스타일 있음 1');
  await p.close();
}
{
  // "변수 없는 값 찾기" 진입 규칙 · 복귀 규칙
  const p = await open(400, null);
  await recv(p, PREREQ);
  await recv(p, { type: 'VAR_TABLE', collections: COLS, vars: VARS });
  await recv(p, sel(1, 0));
  await p.waitForTimeout(450);
  await recv(p, usageResult((await sent(p, 'SCAN_USAGE')).at(-1).reqId, {}));
  await p.click('#btnFindUnbound');
  check('11 변수 없는 값 찾기 → 레이어 › 연결 + 찾기', (await p.$eval('.tab-btn.active', (e) => e.id)) === 'tabbtn-layer' && (await sent(p, 'APPLY')).length === 1);
  await recv(p, preview(await lastReq(p, 'APPLY')));
  await p.click('#tabbtn-variables');
  await p.click('#btnFindUnbound');
  check('11 같은 선택의 결과가 있으면 다시 실행하지 않음', (await sent(p, 'APPLY')).length === 1);
  // 조용한 재계산: 창을 떠났다 돌아오면(≤300) 스위치 유지 + 차이 알림
  await p.click('#bindTree .bv-switch >> nth=0'); // 변수 단위 스위치(vA)
  await p.click('#bindTree .bv-tw >> nth=0'); // 펼침도 유지되는지
  await reenter(p);
  await recv(p, PREREQ);
  await p.waitForTimeout(500);
  const silent = (await sent(p, 'APPLY')).at(-1);
  check('11 창 다시 들어옴 → 조용히 다시 계산', (await sent(p, 'APPLY')).length === 2 && !(await visible(p, '#applyProgress')));
  await recv(p, { ...preview(silent.reqId), candidates: [c('itemSpacing'), c('paddingLeft'), c('paddingTop'), { ...c('width', 'vB'), variableName: 'size/8' }] });
  const checked = await p.$$eval('#bindTree .bv-card', (e) => e.map((x) => [x.querySelector('.bv-name').textContent, x.querySelector('.bv-switch').getAttribute('aria-checked') === 'true']));
  check('11 스위치는 변수 단위로 이어받음 — 끈 변수의 새 곳은 끔, 새 변수는 켬', JSON.stringify(checked) === JSON.stringify([['spacing/8', false], ['size/8', true]]) && (await named(p, '#btnApplyConfirm', '1곳 연결')), JSON.stringify(checked));
  check('11 조용한 재계산은 펼침을 바꾸지 않음', (await p.getAttribute('#bindTree .bv-tw >> nth=0', 'aria-expanded')) === 'true');
  check('11 후보가 바뀌면 알림', (await p.textContent('#statusText')) === '후보가 바뀌었어요 · 2곳 추가 · 0곳 제외');
  // 다른 화면에서 플러그인이 선택을 바꾼 뒤 복귀 → "다른 선택에서 만든 결과예요" + 연결 잠금
  await p.click('#tabbtn-variables');
  await recv(p, { ...sel(2, 0), selfSelect: true });
  await p.click('#tabbtn-layer');
  check('11 다른 선택의 결과 → 안내 + [다시 찾기]', (await p.textContent('#bindNotice')).includes('다른 선택에서 만든 결과예요') && (await p.textContent('#btnBindRepreview')) === '다시 찾기');
  check('11 다른 선택의 결과 → 단계 지금 · 아직 · 아직', JSON.stringify(await steps(p)) === JSON.stringify(['now', 'todo', 'todo']));
  check('11 다른 선택의 결과 → [n곳 연결] 잠금 · 사유 "선택이 바뀌었어요 · 다시 찾아 주세요"', (await locked(p, '#btnApplyConfirm')) && (await named(p, '#btnApplyConfirm', '1곳 연결')) && (await lockMsg(p, '#btnApplyConfirm')).includes('선택이 바뀌었어요 · 다시 찾아 주세요'));
  await p.close();
}
{
  // 300개 초과 복귀(⑧ 안내만) — 단계는 찾은 뒤와 같고 [n곳 연결]은 누를 수 있다
  const p = await open();
  await recv(p, PREREQ);
  await recv(p, { ...sel(1, 0), scanned: 400 });
  await p.click('#btnApply');
  await recv(p, preview(await lastReq(p, 'APPLY')));
  await reenter(p);
  await p.waitForTimeout(500);
  check('11 300개 초과 복귀 → "피그마에서 바뀌었을 수 있어요 · [다시 찾기]"', (await p.textContent('#bindNotice')).includes('피그마에서 바뀌었을 수 있어요') && (await sent(p, 'APPLY')).length === 1);
  check('11 300개 초과 안내 → 단계는 찾은 뒤와 같음 · 연결 가능', JSON.stringify(await steps(p)) === JSON.stringify(['done', 'now', 'todo']) && !(await locked(p, '#btnApplyConfirm')));
  await p.close();
}

/* 12 — 변수 고치기(§4.4 고치기 · PR 3.5) */
const ECOLS = [
  ...COLS,
  { id: 'x', name: 'Misc', tier: 0, modes: [{ modeId: 'x1', name: 'Mode 1' }], defaultModeId: 'x1', tierSet: null },
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
    p = await browser.newPage({ viewport: { width: 400, height: 510 } });
    p.on('pageerror', (e) => pageErrors.push(e.message));
    await p.clock.install();
    await p.addInitScript(() => {
      window.__sent = [];
      window.parent.postMessage = (m) => window.__sent.push(m.pluginMessage);
    });
    await p.goto(url);
  } else p = await open(400, null);
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
  await p.click('#varSide [data-key="side:grp:s|color/text"]');
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
  const p = await open(400, 'layer');
  await p.evaluate(() => document.querySelector('[data-apply-step="structure"]')?.click());
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
  await p.close();
}

check('9 시작 시 스크립트 오류 0', pageErrors.length === 0, pageErrors.join(' / '));

await browser.close();
if (fails.length) {
  console.error(`\n✗ ${fails.length}건 실패`);
  process.exit(1);
}
console.log('\n✓ 연결 카드 흐름 — 전부 통과');
