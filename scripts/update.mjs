/* ============================================================
   update.mjs — 로컬 폴더를 원격 브랜치의 최신 빌드로 맞춘다 (실기 확인 전에 실행)
   Claude가 GitHub에 올린 수정은 로컬 폴더에 저절로 오지 않는다. Figma는 로컬 dist/를 읽는다.

   사용:
     npm run update                 지금 브랜치를 원격 최신으로
     npm run update -- <브랜치>      그 브랜치로 바꾼 뒤 원격 최신으로 (예: main)

   하는 일:
     1. git fetch origin <브랜치>
     2. dist/ 만 바뀌어 있으면 되돌린다(로컬 빌드 잔여물 — 원격 dist/가 정본).
        dist/ 밖에 고친 파일이 있으면 멈춘다(사용자 작업을 지우지 않는다).
     3. 브랜치를 바꾸고(인자가 있을 때) 원격 최신으로 앞으로만 옮긴다(--ff-only).
        원격이 새로 들이는 파일과 이름이 같은 '추적 안 하는' 로컬 파일은 같은 내용이면 지우고, 다르면 .local로 옮긴다.
     4. 받아 온 커밋 · 창 크기(dist/code.js의 UI_WIDTH)를 보여 준다.
   ============================================================ */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, renameSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const fail = (msg) => {
  console.error(`✗ ${msg}`);
  process.exit(1);
};

const current = git('branch', '--show-current');
const branch = process.argv[2] || current;
if (!branch) fail('지금 브랜치를 알 수 없어요(분리된 HEAD). 브랜치 이름을 붙여 실행해 주세요: npm run update -- <브랜치>');

console.log(`· 원격 ${branch} 받는 중…`);
try {
  git('fetch', 'origin', branch);
} catch (e) {
  fail(`원격 브랜치를 받지 못했어요: ${String(e.stderr || e.message).trim()}`);
}

// 고친 파일 — dist/ 만이면 되돌리고, 그 밖이 있으면 멈춘다.
const changed = execFileSync('git', ['status', '--porcelain', '--untracked-files=no'], { cwd: root, encoding: 'utf8' })
  .split('\n')
  .filter(Boolean)
  .map((l) => l.slice(3));
const outside = changed.filter((f) => !f.startsWith('dist/'));
if (outside.length) fail(`dist/ 밖에 고친 파일이 있어 멈췄어요 — 먼저 커밋하거나 되돌려 주세요:\n  ${outside.join('\n  ')}`);
if (changed.length) {
  git('restore', '--', ...changed);
  console.log(`· 로컬 빌드 잔여물 되돌림: ${changed.join(', ')}`);
}

const before = git('log', '-1', '--format=%h');
if (branch !== current) {
  try {
    git('checkout', branch);
  } catch {
    git('checkout', '-b', branch, '--track', `origin/${branch}`);
  }
  console.log(`· 브랜치 바꿈: ${current || '(없음)'} → ${branch}`);
}
// 원격이 새로 들이는 파일과 같은 이름의 '추적 안 하는' 로컬 파일 — 내용이 같으면 지우고, 다르면 .local로 옮긴다
// (그대로 두면 merge가 덮어쓰지 않으려고 멈춘다).
const incoming = git('diff', '--name-only', '--diff-filter=A', 'HEAD', `origin/${branch}`).split('\n').filter(Boolean);
for (const f of incoming) {
  const p = join(root, f);
  if (!existsSync(p)) continue;
  const theirs = execFileSync('git', ['show', `origin/${branch}:${f}`], { cwd: root });
  if (Buffer.compare(readFileSync(p), theirs) === 0) {
    rmSync(p);
    console.log(`· 같은 내용의 로컬 파일 정리: ${f}`);
  } else {
    const keep = p.replace(/(\.[^./]+)?$/, '.local$1');
    renameSync(p, keep);
    console.log(`· 내용이 다른 로컬 파일을 옮겨 둠: ${f} → ${keep.slice(root.length + 1)}`);
  }
}
try {
  git('merge', '--ff-only', `origin/${branch}`);
} catch (e) {
  fail(`앞으로만 옮길 수 없어요(로컬에만 있는 커밋이 있음). Claude에게 이 메시지를 알려 주세요:\n  ${String(e.stderr || e.message).trim()}`);
}

const after = git('log', '-1', '--oneline');
const width = /UI_WIDTH\s*=\s*(\d+)/.exec(readFileSync(join(root, 'dist', 'code.js'), 'utf8'))?.[1] ?? '?';
console.log(before === git('log', '-1', '--format=%h') ? '✓ 이미 최신이에요' : `✓ ${before} → 최신으로 옮겼어요`);
console.log(`  커밋: ${after}`);
console.log(`  창 가로: ${width}px (dist/code.js)`);
console.log('  Figma에서 플러그인 창을 닫고 다시 실행해 주세요.');
