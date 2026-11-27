// 아이콘 생성 — docs/design-system.md §6.6. lucide-static(devDependency)에서 쓰는 아이콘의 SVG 안쪽만 뽑아
// src/ui/icons.json(이름 → 안쪽 마크업)을 만든다. 아이콘을 더할 때만 다시 돌린다: node scripts/gen-icons.mjs
import { readFileSync, writeFileSync } from 'node:fs';

// 세트(§6.6) — 이름 순서가 그대로 JSON 순서다.
export const ICON_NAMES = [
  'chevron-down', 'chevron-right', 'arrow-left', 'arrow-right', 'x', 'check', 'plus', 'minus', 'settings', 'ellipsis',
  'search', 'info', 'circle-alert', 'triangle-alert', 'circle-check', 'circle-help', 'copy', 'trash-2', 'refresh-cw',
  'lock', 'external-link', 'loader-circle', 'eye', 'eye-off',
];

// 직접 그린 아이콘 — Figma 정밀 시안 파일의 컴포넌트를 그대로 옮긴다(Lucide 아님 — 고지 대상 아님).
// 좌표는 Figma 16 틀 × 1.5 = 24 틀(iconSvg의 viewBox). 선 굵기는 디자인 값 그대로라 style로 둔다(.ds-ic *의 1.5px보다 앞섬).
// hash — 숫자 줄 종류 표시(DS-3a S3-D11 · 2026-11-26 사용자 디자인 "Icon/hash"): 둥근 네모(선 1.2) 안 작은 #(선 1).
export const CUSTOM_ICONS = {
  hash: '<rect x="3.75" y="3.75" width="16.5" height="16.5" rx="2.36" style="stroke-width:1.2px"/>'
    + '<path d="M8.25 10.75H15.75M8.25 13.25H15.75M11.06 8.25L10.13 15.75M13.88 8.25L12.94 15.75" style="stroke-width:1px"/>',
};

const pkg = 'node_modules/lucide-static';
const version = JSON.parse(readFileSync(`${pkg}/package.json`, 'utf8')).version;
const license = readFileSync(`${pkg}/LICENSE`, 'utf8').trim();
const icons = {};
for (const name of ICON_NAMES) {
  const svg = readFileSync(`${pkg}/icons/${name}.svg`, 'utf8');
  const inner = svg.replace(/<!--[\s\S]*?-->/g, '').match(/<svg[^>]*>([\s\S]*?)<\/svg>/)[1];
  icons[name] = inner.replace(/\s*\n\s*/g, '').replace(/\s*\/>/g, '/>').trim();
}
Object.assign(icons, CUSTOM_ICONS);
const out = { $source: `lucide-static@${version}`, $custom: Object.keys(CUSTOM_ICONS), $license: license, icons };
writeFileSync('src/ui/icons.json', JSON.stringify(out, null, 2) + '\n');
console.log(`icons.json — ${Object.keys(icons).length}개 (lucide-static@${version} ${ICON_NAMES.length} + 직접 그림 ${Object.keys(CUSTOM_ICONS).length})`);
