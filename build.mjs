// 빌드 스크립트 — esbuild로 (1) 샌드박스 code.ts 번들, (2) ui.ts를 ui.html에 인라인 주입,
// (3) 순수 로직(pure.ts)을 node --test 용 ESM 번들로 생성.
// Figma UI는 단일 HTML만 로드(외부 <script src> 불가)하므로 JS를 <script>로 주입한다.
import esbuild from 'esbuild';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const watch = process.argv.includes('--watch');
const outdir = 'dist';
await mkdir(outdir, { recursive: true });

const shared = {
  bundle: true,
  target: 'es2019',
  logLevel: 'info',
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

if (watch) {
  await Promise.all([codeCtx.watch(), uiCtx.watch(), pureCtx.watch()]);
  console.log('watching…');
} else {
  await Promise.all([codeCtx.rebuild(), uiCtx.rebuild(), pureCtx.rebuild()]);
  await Promise.all([codeCtx.dispose(), uiCtx.dispose(), pureCtx.dispose()]);
  console.log('build done');
}
