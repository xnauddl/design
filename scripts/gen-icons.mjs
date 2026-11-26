// 아이콘 생성 — docs/design-system.md §6.6. lucide-static(devDependency)에서 쓰는 아이콘의 SVG 안쪽만 뽑아
// src/ui/icons.json(이름 → 안쪽 마크업)을 만든다. 아이콘을 더할 때만 다시 돌린다: node scripts/gen-icons.mjs
import { readFileSync, writeFileSync } from 'node:fs';

// 세트(§6.6) — 이름 순서가 그대로 JSON 순서다.
export const ICON_NAMES = [
  'chevron-down', 'chevron-right', 'arrow-left', 'arrow-right', 'x', 'check', 'plus', 'minus', 'settings', 'ellipsis',
  'search', 'info', 'circle-alert', 'triangle-alert', 'circle-check', 'circle-help', 'copy', 'trash-2', 'refresh-cw',
  'lock', 'external-link', 'loader-circle', 'eye', 'eye-off',
];

const pkg = 'node_modules/lucide-static';
const version = JSON.parse(readFileSync(`${pkg}/package.json`, 'utf8')).version;
const license = readFileSync(`${pkg}/LICENSE`, 'utf8').trim();
const icons = {};
for (const name of ICON_NAMES) {
  const svg = readFileSync(`${pkg}/icons/${name}.svg`, 'utf8');
  const inner = svg.replace(/<!--[\s\S]*?-->/g, '').match(/<svg[^>]*>([\s\S]*?)<\/svg>/)[1];
  icons[name] = inner.replace(/\s*\n\s*/g, '').replace(/\s*\/>/g, '/>').trim();
}
const out = { $source: `lucide-static@${version}`, $license: license, icons };
writeFileSync('src/ui/icons.json', JSON.stringify(out, null, 2) + '\n');
console.log(`icons.json — ${ICON_NAMES.length}개 (lucide-static@${version})`);
