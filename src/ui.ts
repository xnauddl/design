/* ============================================================
   ui.ts — iframe UI 로직 (postMessage 송수신, 폼 상태)
   ============================================================ */
import type { UiToCode, CodeToUi } from './shared/messages';
import type { DraftToken } from './lib/tokens';

function send(msg: UiToCode): void {
  parent.postMessage({ pluginMessage: msg }, '*');
}

const $ = <T extends HTMLElement = HTMLElement>(id: string): T =>
  document.getElementById(id) as T;

let tokens: DraftToken[] = [];

/* ---------- 토큰 목록 렌더 ---------- */
function renderTokens(): void {
  const box = $('tokenList');
  box.innerHTML = '';
  tokens.forEach((t, i) => {
    const row = document.createElement('div');
    row.className = 'tk';

    const sw = document.createElement('span');
    if ((t.category === 'color' || t.category === 'effectColor') && typeof t.value === 'string') {
      sw.className = 'swatch';
      sw.style.background = t.value;
    }
    row.appendChild(sw);

    const input = document.createElement('input');
    input.value = t.name;
    input.addEventListener('input', () => {
      tokens[i].name = input.value;
    });
    row.appendChild(input);

    const cat = document.createElement('span');
    cat.className = 'cat';
    cat.textContent = t.unit && t.unit !== 'px' ? `${t.category}·${t.unit}` : t.category;
    row.appendChild(cat);

    box.appendChild(row);
  });
}

/* ---------- 버튼 ---------- */
$('btnExtract').addEventListener('click', () => send({ type: 'EXTRACT' }));

$('btnCreate').addEventListener('click', () => {
  if (!tokens.length) {
    setStatus('createStatus', '먼저 토큰을 추출하세요.', 'warn');
    return;
  }
  const base = Number(($('base') as HTMLInputElement).value) || 16;
  send({ type: 'CREATE_TOKENS', tokens, base });
});

$('btnApply').addEventListener('click', () => {
  const tolerance = Number(($('tol') as HTMLInputElement).value) || 0;
  send({ type: 'APPLY', tolerance });
});

$('btnPreview').addEventListener('click', () => {
  const maxDepth = Number(($('depth') as HTMLInputElement).value) || 3;
  send({ type: 'RENAME', apply: false, maxDepth });
});

$('btnRename').addEventListener('click', () => {
  const maxDepth = Number(($('depth') as HTMLInputElement).value) || 3;
  send({ type: 'RENAME', apply: true, maxDepth });
});

/* ---------- code → ui ---------- */
window.onmessage = (event: MessageEvent) => {
  const msg = event.data.pluginMessage as CodeToUi | undefined;
  if (!msg) return;
  switch (msg.type) {
    case 'EXTRACT_RESULT': {
      tokens = msg.tokens;
      renderTokens();
      $('selInfo').textContent = `선택 ${msg.selection}개 · 토큰 ${tokens.length}개`;
      setStatus('extractStatus', msg.warnings.join(' ') || `${tokens.length}개 후보 추출 완료.`, msg.warnings.length ? 'warn' : 'ok');
      break;
    }
    case 'CREATE_RESULT':
      setStatus('createStatus', msg.summary, 'ok');
      break;
    case 'APPLY_RESULT':
      setStatus('applyStatus', `바인딩 ${msg.bound} · 스킵 ${msg.skipped}${msg.flags.length ? ' — ' + msg.flags.join(' ') : ''}`, msg.flags.length ? 'warn' : 'ok');
      break;
    case 'RENAME_RESULT':
      renderDiff(msg.changes, msg.applied);
      break;
    case 'ERROR':
      setStatus('extractStatus', `오류: ${msg.message}`, 'warn');
      break;
  }
};

function renderDiff(changes: { before: string; after: string }[], applied: boolean): void {
  const box = $('diff');
  box.innerHTML = '';
  for (const c of changes) {
    const row = document.createElement('div');
    row.className = 'diff-row';
    row.innerHTML = `<span class="before">${escapeHtml(c.before)}</span> → <span class="after">${escapeHtml(c.after)}</span>`;
    box.appendChild(row);
  }
  ($('btnRename') as HTMLButtonElement).disabled = applied || changes.length === 0;
  setStatus(
    'renameStatus',
    applied ? `${changes.length}개 이름 적용 완료.` : changes.length ? `${changes.length}개 변경 예정 — 확인 후 ‘이름 적용’.` : '변경할 이름이 없습니다.',
    applied ? 'ok' : '',
  );
}

function setStatus(id: string, text: string, cls: 'ok' | 'warn' | ''): void {
  const el = $(id);
  el.textContent = text;
  el.className = `status ${cls}`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string));
}

// 초기: 컬렉션 조회(존재 확인용)
send({ type: 'GET_COLLECTIONS' });
