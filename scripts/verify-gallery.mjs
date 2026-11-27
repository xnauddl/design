/* 개발용 모음 화면 검사 — docs/design-system.md §6.10.
   dist/ds-gallery.html(npm run gallery)을 열어 30종 · 9종 칸이 모두 그려지는지, 페이지 오류 0, 560 틀에서 가로 스크롤 0인지 본다.
   사용: npm run gallery && node scripts/verify-gallery.mjs  (Chromium 경로가 다르면 CHROMIUM_PATH로 지정)
   SHOT=경로.png 를 주면 전체 화면을 찍는다. */
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(pathToFileURL(path.resolve('dist/ds-gallery.html')).href);

let fail = 0;
const check = (name, ok, detail = '') => { console.log(`${ok ? '✓' : '✗'} ${name}${ok ? '' : ` — ${detail}`}`); if (!ok) fail++; };

const counts = await page.evaluate(() => ({
  comp: [...document.querySelectorAll('[data-g-component]')].map((s) => s.dataset.gComponent),
  layout: [...document.querySelectorAll('[data-g-layout]')].map((s) => s.dataset.gLayout),
  found: document.querySelectorAll('[data-g-foundation]').length,
  empty: [...document.querySelectorAll('[data-g-component], [data-g-layout]')].filter((s) => s.children.length < 3 || s.getBoundingClientRect().height < 40).map((s) => s.id),
  icons: document.querySelectorAll('#f-icons svg.ds-ic').length,
}));
check('컴포넌트 칸 30종', counts.comp.length === 30, `${counts.comp.length}: ${counts.comp.join(', ')}`);
check('레이아웃 칸 9종', counts.layout.length === 9, `${counts.layout.length}: ${counts.layout.join(', ')}`);
check('Foundations 6칸', counts.found === 6, String(counts.found));
check('모든 칸이 그려짐(빈 칸 0)', counts.empty.length === 0, counts.empty.join(', '));
check('아이콘 24개 이상 그려짐', counts.icons >= 24, String(counts.icons));

// 버튼 치수 · 아이콘 선 굵기(§6.1 · §6.6)
const dims = await page.evaluate(() => {
  const q = (s) => document.querySelector(s);
  const h = (s) => Math.round(q(s)?.getBoundingClientRect().height ?? -1);
  const ic = q('#f-icons svg.ds-ic path, #f-icons svg.ds-ic circle');
  return { sm: h('#c-button .ds-btn--sm'), md: h('#c-button .ds-btn--primary:not(.ds-btn--sm):not(.ds-btn--lg)'), lg: h('#c-button .ds-btn--lg'), stroke: ic ? getComputedStyle(ic).strokeWidth : '', vfx: ic ? getComputedStyle(ic).vectorEffect : '' };
});
check('Button 높이 sm 24 · md 28 · lg 32', dims.sm === 24 && dims.md === 28 && dims.lg === 32, JSON.stringify(dims));
check('아이콘 선 1.5px · non-scaling-stroke', dims.stroke === '1.5px' && dims.vfx === 'non-scaling-stroke', JSON.stringify(dims));

// 560 틀 — 가로 스크롤 0
await page.check('#gNarrow');
const over = await page.evaluate(() => [...document.querySelectorAll('.g-sec')].filter((s) => s.scrollWidth > s.clientWidth + 1).map((s) => `${s.id} ${s.scrollWidth}>${s.clientWidth}`));
check('560 틀에서 가로 스크롤 0', over.length === 0, over.join(' · '));
if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT, fullPage: true });
await page.uncheck('#gNarrow');

check('페이지 오류 0', errors.length === 0, errors.join(' | '));
await browser.close();
console.log(fail ? `\n✗ ${fail}건 실패` : '\n✓ 모음 화면 — 전부 통과');
process.exit(fail ? 1 : 0);
