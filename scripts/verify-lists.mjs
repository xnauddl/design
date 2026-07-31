/**
 * 목록 스크롤 영역 회귀 검증 — 반쪽 행이 다시 생기지 않는지 헤드리스로 확인한다.
 *
 * 플러그인 UI는 Figma 안에서 도는 패널이라 typecheck·빌드만으로는 레이아웃을 못 본다.
 * 다만 빌드 산출물 `dist/ui.html`은 JS가 인라인돼 **standalone 브라우저로도 렌더**되고,
 * 백엔드(code.ts) 없이도 `postMessage`로 잠금 해제와 데이터 주입이 둘 다 되므로
 * 실제 렌더 결과를 그대로 잴 수 있다.
 *
 * 사용: node scripts/verify-lists.mjs [--list <id>|all] [--count 70] [--shots <dir>]
 */
import pw from 'playwright'; // CommonJS 패키지라 named export가 안 된다
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { mkdirSync, existsSync } from 'node:fs';

const { chromium } = pw;
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const UI = join(ROOT, 'dist', 'ui.html');

/* ---------- 시드 데이터 ---------- */

/** 색 외 토큰 n개 — `#tokenList`는 색을 걸러내므로(색은 ‘색 정리’ 표 담당) 비-색만 만든다. */
function fakeTokens(n) {
  const cats = ['gap', 'size', 'radius', 'fontSize', 'strokeWidth', 'lineHeight'];
  return Array.from({ length: n }, (_, i) => ({
    name: `${cats[i % cats.length]}/step-${String(i + 1).padStart(3, '0')}`,
    category: cats[i % cats.length],
    sources: ['itemSpacing'],
    value: 4 + i,
  }));
}

/** 텍스트 스타일 후보 n개 — 스캔 결과(locked 행)와 같은 모양. 시그니처가 겹치면 안 되므로 크기를 흩뜨린다. */
function fakeTextStyles(n) {
  const roles = ['display', 'title', 'heading', 'body', 'caption', 'label'];
  return Array.from({ length: n }, (_, i) => ({
    name: `${roles[i % roles.length]}/${String(i + 1).padStart(2, '0')}`,
    fontSize: 10 + (i % 40),
    lineHeight: 16 + (i % 40),
    letterSpacing: (i % 5) * 0.1,
    family: 'Inter',
    style: i % 3 === 0 ? 'Bold' : 'Regular',
    // 절반은 이미 등록된 스타일(파랑) — 행 높이가 같은지도 함께 본다.
    ...(i % 2 ? { boundStyleId: `S:${i}` } : {}),
  }));
}

/* ---------- 목록 배선 ----------
   새 목록을 채택하면 여기에 항목 하나만 추가한다. setup()은 그 목록이 실제로
   행을 그리게 만드는 최소 조작(시드 + ‘펼침’ 버튼 클릭)만 담당한다. */
const LISTS = {
  tokenList: {
    label: '토큰 생성 미리보기',
    tab: 'tabbtn-tokens',
    row: '.tk',
    more: 'tokenListMore',
    count: 'tokenListCount',
    expand: 'btnTokenListExpand',
    async setup(page, n) {
      await seed(page, { type: 'EXTRACT_RESULT', tokens: fakeTokens(n), selection: 1, warnings: [] });
      await page.click('#btnCreate'); // previewRevealed=true → 색 외 목록 렌더
    },
  },
  tsRows: {
    label: '텍스트 스타일 표',
    tab: 'tabbtn-tokens',
    // 마운트는 표를 감싼 래퍼다 — 표 박스 자체는 스크롤 컨테이너가 못 된다.
    mount: 'tsList',
    row: 'tbody tr',
    more: 'tsListMore',
    count: 'tsListCount',
    expand: 'btnTsListExpand',
    // 고정 헤더가 스크롤포트 상단을 덮는다 → 그 아래만 ‘실제로 보이는 영역’이다.
    // 이 보정 없이는 헤더에 반쯤 가린 행을 검사가 통째로 놓친다(기하학적으로는 뷰포트 안이라).
    // 셀렉터는 thead가 아니라 th다 — sticky가 걸린 건 셀이고, thead 박스는 그대로 스크롤을
    // 따라 올라간다(측정해 보면 스크롤 후 thead.top이 음수, th는 스크롤포트 상단 고정).
    stickyHead: '#tsTable thead th',
    async setup(page, n) {
      await seed(page, { type: 'TEXT_STYLE_CANDIDATES', styles: fakeTextStyles(n), warnings: [] });
    },
  },
};

/* ---------- 구동 ---------- */

/** 백엔드(code.ts) 없이 UI에 메시지를 넣는다 — ui.ts는 event.data.pluginMessage를 읽는다. */
async function seed(page, pluginMessage) {
  await page.evaluate((m) => window.postMessage({ pluginMessage: m }, '*'), pluginMessage);
  await page.waitForTimeout(60);
}

/** 유료 잠금 해제 — 미리보기 버튼들이 PAID_FIELDS라 Free면 disabled라 클릭이 안 된다. */
async function unlock(page) {
  await seed(page, { type: 'LICENSE_STATUS', tier: 'paid', source: 'dev', unlimited: true });
}

/**
 * 스크롤포트에 **걸쳐 있는** 행을 센다.
 * 완전히 위/아래로 벗어난 행은 정상(가려진 행)이고, 경계에 걸친 행이 곧 반쪽 행이다.
 * 세로 클리핑은 border 안쪽(padding box)에서 일어나므로 clientTop/clientHeight로 잰다.
 *
 * stickyHead가 있는 목록(표)은 상단을 고정 헤더가 덮으므로 기하학적 뷰포트와 ‘보이는 영역’이
 * 다르다. 헤더에 반쯤 가린 행도 사용자에겐 똑같이 반쪽 행이라, 그만큼 위를 잘라내고 잰다.
 * 단 ‘헤더 높이만큼’이 아니라 **헤더가 실제로 있는 자리**로 잘라야 한다. 높이를 그냥 빼면
 * 고정이 풀린 경우(셀렉터가 어긋나 sticky 규칙이 안 붙는 등)에도 검사가 상단 한 줄을 스스로
 * 눈감아, 진짜 잘린 행을 못 본다. 고정돼 있으면 두 식은 같고, 풀리면 이 식만 옳다.
 */
async function partialRows(page, mount, row, stickyHead) {
  return page.evaluate(({ mount, row, stickyHead }) => {
    const box = document.getElementById(mount);
    const br = box.getBoundingClientRect();
    const head = stickyHead ? box.querySelector(stickyHead) : null;
    const portTop = br.top + box.clientTop;
    const top = head ? Math.max(portTop, head.getBoundingClientRect().bottom) : portTop;
    const bottom = portTop + box.clientHeight;
    const EPS = 1.0; // 서브픽셀 반올림 허용
    const bad = [];
    for (const el of box.querySelectorAll(row)) {
      const r = el.getBoundingClientRect();
      if (r.height === 0) continue;
      const above = r.bottom <= top + EPS;
      const below = r.top >= bottom - EPS;
      const inside = r.top >= top - EPS && r.bottom <= bottom + EPS;
      if (!above && !below && !inside) {
        bad.push({ text: (el.textContent || '').trim().slice(0, 40), top: +r.top.toFixed(2), bottom: +r.bottom.toFixed(2) });
      }
    }
    return { bad, viewport: { top: +top.toFixed(2), bottom: +bottom.toFixed(2) } };
  }, { mount, row, stickyHead });
}

async function verify(page, id, spec, count, shots) {
  const fails = [];
  const ok = (cond, msg) => { if (!cond) fails.push(msg); };
  const mount = spec.mount ?? id; // 목록 이름과 마운트 요소가 다를 수 있다(표는 래퍼가 마운트)

  await page.goto(`file://${UI}`);
  await page.click(`#${spec.tab}`);
  await unlock(page);
  await spec.setup(page, count);
  await page.waitForTimeout(200); // renderChunked의 rAF 청크 + onDone 레이아웃 대기

  const state = await page.evaluate(({ mount, more, countId }) => {
    const box = document.getElementById(mount);
    return {
      classes: [...box.classList],
      capped: getComputedStyle(box).maxHeight !== 'none',
      moreShown: getComputedStyle(document.getElementById(more)).display !== 'none',
      countText: document.getElementById(countId).textContent,
    };
  }, { mount, more: spec.more, countId: spec.count });

  // class="list-region"을 빠뜨리면 CSS가 안 붙어 상한 자체가 없다 — 계산된 max-height로 잡는다.
  ok(state.capped, 'max-height가 none — 마운트에 class="list-region"이 있는지 확인');
  ok(state.classes.includes('framed'), `.framed 없음 (classes=${state.classes.join(',')})`);
  ok(state.classes.includes('scrolls'), `.scrolls 없음 (classes=${state.classes.join(',')})`);
  ok(state.moreShown, '‘더 보기’ 줄이 숨겨져 있음 — 상한에 안 걸렸거나 배선 누락');
  const m = /총 (\d+)개 중 (\d+)개 표시/.exec(state.countText || '');
  ok(!!m, `개수 문구 형식 불일치: ${JSON.stringify(state.countText)}`);
  if (m) ok(Number(m[1]) === count, `총 개수 ${m[1]} ≠ 시드 ${count}`);

  // 스크롤 위치별 반쪽 행 검사 — 높이 스냅만으로는 맨 위에서만 온전하다.
  for (const frac of [0, 0.25, 0.5, 0.75, 1]) {
    await page.evaluate(({ mount, frac }) => {
      const box = document.getElementById(mount);
      box.scrollTop = frac * (box.scrollHeight - box.clientHeight);
    }, { mount, frac });
    await page.waitForTimeout(150); // scroll-snap 정착
    const { bad, viewport } = await partialRows(page, mount, spec.row, spec.stickyHead);
    ok(bad.length === 0, `스크롤 ${Math.round(frac * 100)}%: 반쪽 행 ${bad.length}건 ` +
      `(뷰포트 ${viewport.top}~${viewport.bottom}, 예: ${JSON.stringify(bad[0] || null)})`);
    if (shots) await page.screenshot({ path: join(shots, `${id}-${Math.round(frac * 100)}.png`) });
  }

  // ‘모두 펼치기’ — 상한 해제 후 전부 보이는지.
  await page.click(`#${spec.expand}`);
  await page.waitForTimeout(150);
  const expanded = await page.evaluate(({ mount, countId, row }) => {
    const box = document.getElementById(mount);
    return {
      classes: [...box.classList],
      rows: box.querySelectorAll(row).length,
      countText: document.getElementById(countId).textContent,
    };
  }, { mount, countId: spec.count, row: spec.row });
  ok(expanded.classes.includes('expanded'), '펼치기 후 .expanded 없음');
  ok(expanded.rows === count, `펼친 뒤 행 ${expanded.rows} ≠ ${count}`);
  ok(/모두 표시/.test(expanded.countText || ''), `펼친 뒤 문구 불일치: ${JSON.stringify(expanded.countText)}`);
  if (shots) await page.screenshot({ path: join(shots, `${id}-expanded.png`), fullPage: true });

  return fails.filter(Boolean);
}

/* ---------- main ---------- */

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const which = arg('--list', 'all');
const count = Number(arg('--count', '70'));
const shots = arg('--shots', '');

if (!existsSync(UI)) {
  console.error(`dist/ui.html 없음 — 먼저 \`npm run build\`. (${UI})`);
  process.exit(2);
}
if (shots) mkdirSync(shots, { recursive: true });

const ids = which === 'all' ? Object.keys(LISTS) : [which];
for (const id of ids) {
  if (!LISTS[id]) {
    console.error(`알 수 없는 목록: ${id} (있는 것: ${Object.keys(LISTS).join(', ')})`);
    process.exit(2);
  }
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 420, height: 900 } }); // 플러그인 패널 폭
let failed = 0;
for (const id of ids) {
  const spec = LISTS[id];
  let fails;
  try {
    fails = await verify(page, id, spec, count, shots);
  } catch (e) {
    fails = [`예외: ${e.message}`];
  }
  if (fails.length) {
    failed++;
    console.error(`✗ ${id} (${spec.label})`);
    for (const f of fails) console.error(`   · ${f}`);
  } else {
    console.log(`✓ ${id} (${spec.label}) — ${count}개, 5개 스크롤 위치에서 반쪽 행 0건`);
  }
}
await browser.close();
process.exit(failed ? 1 : 0);
