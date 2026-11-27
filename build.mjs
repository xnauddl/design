// 빌드 스크립트 — esbuild로 (1) 샌드박스 code.ts 번들, (2) ui.ts를 ui.html에 인라인 주입,
// (3) 순수 로직(pure.ts)을 node --test 용 ESM 번들로 생성.
// Figma UI는 단일 HTML만 로드(외부 <script src> 불가)하므로 JS를 <script>로 주입한다.
import esbuild from 'esbuild';
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { watch as fsWatch } from 'node:fs';
import path from 'node:path';
import { tokensToCss } from './design-tokens/to-css.mjs';

// 디자인 토큰(docs/design-system.md §2.2) — 원본 tokens.json을 :root CSS 변수로 바꿔 ui.html의 자리 표시에 넣는다.
const TOKENS_PATH = 'design-tokens/tokens.json';
const TOKENS_SLOT = '/* @design-tokens */';
async function tokenCss() {
  return tokensToCss(JSON.parse(await readFile(TOKENS_PATH, 'utf8')));
}

// 공통 컴포넌트 · 레이아웃 CSS(docs/design-system.md §6.7) — src/ui/**/*.css를 경로 이름 순으로 이어 :root 바로 뒤 자리에 넣는다.
const DS_SLOT = '/* @ds-components */';
const ICONS_PATH = 'src/ui/icons.json';
async function dsCss() {
  const files = (await readdir('src/ui', { recursive: true })).filter((f) => f.endsWith('.css')).map((f) => path.join('src/ui', f).split(path.sep).join('/')).sort();
  const parts = await Promise.all(files.map(async (f) => `/* ${f} */\n${(await readFile(f, 'utf8')).trim()}`));
  return parts.join('\n');
}
async function iconData() {
  return JSON.parse(await readFile(ICONS_PATH, 'utf8'));
}
/** 아이콘 고지(§6.6) — <style> 안 맨 앞에 CSS 법적 주석으로. */
const licenseComment = (data) => `/*! Lucide icons (${data.$source}) — ISC · Feather에서 온 아이콘은 MIT\n${data.$license.replace(/\*\//g, '* /')}\n*/`;
/** 정적 HTML의 <i data-ds-icon="이름" [data-size="sm|lg"]></i> → SVG(없는 이름이면 실패). */
function replaceIcons(html, data) {
  return html.replace(/<i\s+data-ds-icon="([\w-]+)"(?:\s+data-size="(sm|lg)")?\s*><\/i>/g, (_, name, size) => {
    const inner = data.icons[name];
    if (!inner) throw new Error(`없는 아이콘: ${name} (src/ui/icons.json — scripts/gen-icons.mjs의 ICON_NAMES에 더한다)`);
    const cls = size ? `ds-ic ds-ic--${size}` : 'ds-ic';
    return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
  });
}
/** 템플릿 HTML에 토큰 · 컴포넌트 CSS · 고지 · 아이콘 · 스크립트를 넣는다(ui.html · 모음 화면 공통). */
async function assembleHtml(templatePath, jsText) {
  const template = await readFile(templatePath, 'utf8');
  if (!template.includes(TOKENS_SLOT)) throw new Error(`${templatePath}에 ${TOKENS_SLOT} 자리가 없다`);
  if (!template.includes(DS_SLOT)) throw new Error(`${templatePath}에 ${DS_SLOT} 자리가 없다`);
  const [css, comps, icons] = await Promise.all([tokenCss(), dsCss(), iconData()]);
  const html = template
    .replace('<style>', () => `<style>\n${licenseComment(icons)}`)
    .replace(TOKENS_SLOT, () => css.trimStart())
    .replace(DS_SLOT, () => comps)
    .replace('<!-- UI_SCRIPT -->', () => `<script>\n${jsText}\n</script>`);
  return replaceIcons(html, icons);
}

const watch = process.argv.includes('--watch');
// 개발 빌드 여부 — watch 또는 --dev. __DEV__=true일 때만 개발용 티어 토글이 활성(백도어 차단).
const dev = watch || process.argv.includes('--dev');
const outdir = 'dist';
await mkdir(outdir, { recursive: true });

// target는 es2017로 고정한다. Figma 플러그인 샌드박스 파서는 객체 스프레드({...x},
// ES2018)를 거부("Unexpected token ...")하므로, esbuild가 이를 헬퍼로 트랜스파일하도록
// es2018 미만으로 내린다. async/await(es2017)은 런타임이 지원하므로 그대로 둔다.
const shared = {
  bundle: true,
  target: 'es2017',
  logLevel: 'info',
  define: { __DEV__: JSON.stringify(dev) },
};

// (1) 샌드박스 코드
const codeCtx = await esbuild.context({
  ...shared,
  entryPoints: ['src/code.ts'],
  outfile: path.join(outdir, 'code.js'),
  format: 'iife',
});

// (2) UI — JS를 메모리로 번들한 뒤 html 템플릿에 주입하는 esbuild 플러그인
const uiInlinePlugin = {
  name: 'ui-inline',
  setup(build) {
    build.onEnd(async (result) => {
      if (result.errors.length) return;
      const js = result.outputFiles?.find((f) => f.path.endsWith('.js'));
      if (!js) return;
      await writeFile(path.join(outdir, 'ui.html'), await assembleHtml('src/ui.html', js.text));
    });
  },
};

const uiCtx = await esbuild.context({
  ...shared,
  entryPoints: ['src/ui.ts'],
  outdir,
  format: 'iife',
  write: false,
  plugins: [uiInlinePlugin],
});

// (3) 순수 로직 테스트 번들 (figma 의존 없음)
const pureCtx = await esbuild.context({
  ...shared,
  entryPoints: ['src/lib/pure.ts'],
  outfile: path.join(outdir, 'pure.mjs'),
  format: 'esm',
  platform: 'node',
});

// (4) figma 의존 모듈 테스트 번들 — 전역 `figma`는 테스트가 목으로 주입한다.
const figmaLibCtx = await esbuild.context({
  ...shared,
  entryPoints: ['src/lib/figma-lib.ts'],
  outfile: path.join(outdir, 'figma-lib.mjs'),
  format: 'esm',
  platform: 'node',
});

// (5) 개발용 모음 화면(§6.10) — npm run gallery(node build.mjs --gallery). 플러그인에 들어가지 않는다.
if (process.argv.includes('--gallery')) {
  const g = await esbuild.build({ ...shared, entryPoints: ['src/gallery/gallery.ts'], format: 'iife', write: false, outdir });
  const html = await assembleHtml('src/gallery/gallery.html', g.outputFiles[0].text);
  await writeFile(path.join(outdir, 'ds-gallery.html'), html);
  console.log('gallery → dist/ds-gallery.html');
}

if (watch) {
  await Promise.all([codeCtx.watch(), uiCtx.watch(), pureCtx.watch(), figmaLibCtx.watch()]);
  // esbuild는 ui.ts 의존만 본다 — 토큰 원본 · ui.html이 바뀌어도 UI를 다시 만든다.
  for (const f of [TOKENS_PATH, 'src/ui.html', ICONS_PATH, 'src/ui']) fsWatch(f, { recursive: true }, () => uiCtx.rebuild().catch((e) => console.error(e)));
  console.log('watching…');
} else {
  await Promise.all([codeCtx.rebuild(), uiCtx.rebuild(), pureCtx.rebuild(), figmaLibCtx.rebuild()]);
  await Promise.all([codeCtx.dispose(), uiCtx.dispose(), pureCtx.dispose(), figmaLibCtx.dispose()]);
  console.log('build done');
}
