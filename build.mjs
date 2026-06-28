// 빌드 스크립트 — esbuild로 (1) 샌드박스 code.ts 번들, (2) ui.ts를 ui.html에 인라인 주입,
// (3) 순수 로직(pure.ts)을 node --test 용 ESM 번들로 생성.
// Figma UI는 단일 HTML만 로드(외부 <script src> 불가)하므로 JS를 <script>로 주입한다.
import esbuild from 'esbuild';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

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
      const template = await readFile('src/ui.html', 'utf8');
      const html = template.replace(
        '<!-- UI_SCRIPT -->',
        `<script>\n${js.text}\n</script>`,
      );
      await writeFile(path.join(outdir, 'ui.html'), html);
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

if (watch) {
  await Promise.all([codeCtx.watch(), uiCtx.watch(), pureCtx.watch(), figmaLibCtx.watch()]);
  console.log('watching…');
} else {
  await Promise.all([codeCtx.rebuild(), uiCtx.rebuild(), pureCtx.rebuild(), figmaLibCtx.rebuild()]);
  await Promise.all([codeCtx.dispose(), uiCtx.dispose(), pureCtx.dispose(), figmaLibCtx.dispose()]);
  console.log('build done');
}
