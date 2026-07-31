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
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { mkdirSync, existsSync } from 'node:fs';

const { chromium } = pw;
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const UI = join(ROOT, 'dist', 'ui.html');

if (!existsSync(UI)) {
  console.error(`dist/ui.html 없음 — 먼저 \`npm run build\`. (${UI})`);
  process.exit(2);
}
// 색 시드는 UI가 쓰는 분류기 그대로 골라야 한다(아래 fakeColors 주석 참고).
// 정적 import는 위 안내보다 먼저 평가돼 dist가 없을 때 원인 모를 예외가 되므로 동적으로 읽는다.
const { classifyColor } = await import(pathToFileURL(join(ROOT, 'dist', 'pure.mjs')).href);

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

/** HSL(0–360, 0–1, 0–1) → #rrggbb. 색상값을 격자로 훑으려고 쓰는 최소 변환. */
function hslHex(h, s, l) {
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    return l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
  };
  const to = (v) => Math.round(v * 255).toString(16).padStart(2, '0');
  return `#${to(f(0))}${to(f(8))}${to(f(4))}`;
}

/**
 * 색 토큰 n개 — **hue/step 버킷이 서로 다른** 색만 고른다.
 *
 * EXTRACT_RESULT 핸들러는 시드 직후 huefyTokenColors(색 → `color/{hue}/{step}` 이름)와
 * tidyColors(같은 base 이름끼리 N:1 병합)를 돌린다. 색상값을 아무렇게나 70개 넣으면
 * 같은 버킷으로 몰려 몇 개로 병합되고, 그러면 하네스의 ‘총 N개’ 단언이 시드 수와 어긋난다.
 * 그래서 UI가 쓰는 분류기(classifyColor) 그대로 버킷을 세어 중복을 건너뛴다.
 * 버킷 상한은 hue 9종+gray × step 11단 = 110개.
 */
function fakeColors(n) {
  const seen = new Set();
  const out = [];
  // 밝기 바깥 · hue 안쪽 순회 — 한 단(step) 안에서 여러 hue를 먼저 채워 목록이 골고루 섞인다.
  // 채도는 4단으로 훑는다. 무채(gray)와 고채도만으로는 아주 밝은 단(red/50 등)에 닿지 못해
  // 버킷이 109개에서 멈춘다 — 중간 채도가 있어야 110개가 다 나온다.
  for (let l = 2; l <= 98 && out.length < n; l += 2) {
    for (let h = 0; h < 360 && out.length < n; h += 5) {
      for (const s of [0, 0.2, 0.5, 0.9]) {
        if (out.length >= n) break;
        const value = hslHex(h, s, l / 100);
        const c = classifyColor(value);
        const bucket = `${c.family}/${c.step}`;
        if (seen.has(bucket)) continue;
        seen.add(bucket);
        // 이름은 huefy가 어차피 덮어쓴다 — 추출 결과와 같은 hex 이름 형태만 맞춰 둔다.
        out.push({ name: `color/${value.slice(1)}`, category: 'color', sources: ['fills'], value });
      }
    }
  }
  if (out.length < n) throw new Error(`고유 hue/step 버킷이 ${out.length}개뿐 — --count를 낮추세요(최대 110)`);
  return out;
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
  colorTable: {
    label: '추출 · 색 정리 표',
    tab: 'tabbtn-tokens',
    row: '.crow',
    more: 'colorTableMore',
    count: 'colorTableCount',
    expand: 'btnColorTableExpand',
    async setup(page, n) {
      // 백엔드가 없어 클릭만으로는 데이터가 안 온다 — colorRevealed를 켜고(추출 버튼의 역할)
      // 결과는 직접 주입한다. 순서가 바뀌면 표가 잠긴 채로 남는다.
      await page.click('#btnExtract');
      await seed(page, { type: 'EXTRACT_RESULT', tokens: fakeColors(n), selection: 1, warnings: [] });
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
 */
async function partialRows(page, mount, row) {
  return page.evaluate(({ mount, row }) => {
    const box = document.getElementById(mount);
    const br = box.getBoundingClientRect();
    const top = br.top + box.clientTop;
    const bottom = top + box.clientHeight;
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
  }, { mount, row });
}

async function verify(page, id, spec, count, shots) {
  const fails = [];
  const ok = (cond, msg) => { if (!cond) fails.push(msg); };

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
  }, { mount: id, more: spec.more, countId: spec.count });

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
    }, { mount: id, frac });
    await page.waitForTimeout(150); // scroll-snap 정착
    const { bad, viewport } = await partialRows(page, id, spec.row);
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
  }, { mount: id, countId: spec.count, row: spec.row });
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
