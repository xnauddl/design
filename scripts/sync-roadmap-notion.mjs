#!/usr/bin/env node
/* ============================================================
   sync-roadmap-notion.mjs — ROADMAP.md → Notion 페이지 동기화
   GitHub Action(또는 로컬)에서 실행. 페이지의 기존 블록을 비우고
   체크리스트(to-do)·헤딩·불릿·인용·문단으로 다시 채운다.

   환경변수:
     NOTION_TOKEN   — Notion 내부 통합(integration) 토큰 (secret)
     NOTION_PAGE_ID — 동기화 대상 페이지 ID (secret)
   플래그:
     --dry-run      — API 호출 없이 파싱 결과만 출력
     <파일경로>.md   — 소스 파일 지정(기본 ROADMAP.md)
   ============================================================ */
import { readFile } from 'node:fs/promises';

const TOKEN = process.env.NOTION_TOKEN;
const PAGE_ID = process.env.NOTION_PAGE_ID;
const DRY = process.argv.includes('--dry-run');
const FILE = process.argv.find((a) => a.endsWith('.md')) || 'ROADMAP.md';
const NOTION_VERSION = '2022-06-28';

/** **bold**·`code` 인라인 → Notion rich_text 배열. */
function rich(text) {
  const out = [];
  const push = (content, annotations) => {
    if (content) out.push({ type: 'text', text: { content }, annotations });
  };
  const re = /(\*\*([^*]+)\*\*|`([^`]+)`)/g;
  let last = 0;
  let m;
  while ((m = re.exec(text))) {
    push(text.slice(last, m.index), {});
    if (m[2] !== undefined) push(m[2], { bold: true });
    else if (m[3] !== undefined) push(m[3], { code: true });
    last = re.lastIndex;
  }
  push(text.slice(last), {});
  return out.length ? out : [{ type: 'text', text: { content: '' } }];
}

const blk = (type, text) => ({ object: 'block', type, [type]: { rich_text: rich(text) } });

/** 한 줄 → Notion 블록(빈 줄은 null). */
function lineToBlock(raw) {
  const t = raw.replace(/\s+$/, '');
  if (!t.trim()) return null;
  let m;
  if ((m = /^###\s+(.*)/.exec(t))) return blk('heading_3', m[1]);
  if ((m = /^##\s+(.*)/.exec(t))) return blk('heading_2', m[1]);
  if ((m = /^#\s+(.*)/.exec(t))) return blk('heading_1', m[1]);
  if ((m = /^>\s?(.*)/.exec(t))) return blk('quote', m[1]);
  if ((m = /^[-*]\s+\[([ xX])\]\s+(.*)/.exec(t)))
    return { object: 'block', type: 'to_do', to_do: { rich_text: rich(m[2]), checked: m[1].toLowerCase() === 'x' } };
  if ((m = /^[-*]\s+(.*)/.exec(t))) return blk('bulleted_list_item', m[1]);
  return blk('paragraph', t);
}

async function api(method, path, body) {
  const r = await fetch('https://api.notion.com/v1' + path, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(`${method} ${path} → ${r.status} ${await r.text()}`);
  return r.json();
}

async function listChildren(id) {
  const res = [];
  let cursor;
  do {
    const j = await api('GET', `/blocks/${id}/children?page_size=100${cursor ? `&start_cursor=${cursor}` : ''}`);
    res.push(...j.results);
    cursor = j.has_more ? j.next_cursor : null;
  } while (cursor);
  return res;
}

async function main() {
  const md = await readFile(FILE, 'utf8');
  const blocks = md.split('\n').map(lineToBlock).filter(Boolean);
  // 첫 H1은 페이지 제목과 중복되므로 제외.
  if (blocks[0]?.type === 'heading_1') blocks.shift();

  if (DRY) {
    console.log(`parsed ${blocks.length} blocks from ${FILE}`);
    console.log(JSON.stringify(blocks.slice(0, 4), null, 2));
    return;
  }
  if (!TOKEN || !PAGE_ID) {
    console.error('NOTION_TOKEN 과 NOTION_PAGE_ID 환경변수가 필요합니다.');
    process.exit(1);
  }

  // 1) 기존 블록 비우기
  const existing = await listChildren(PAGE_ID);
  for (const b of existing) await api('DELETE', `/blocks/${b.id}`);

  // 2) 새 블록 append (한 번에 최대 100개)
  for (let i = 0; i < blocks.length; i += 100) {
    await api('PATCH', `/blocks/${PAGE_ID}/children`, { children: blocks.slice(i, i + 100) });
  }
  console.log(`synced ${blocks.length} blocks → Notion page ${PAGE_ID}`);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
