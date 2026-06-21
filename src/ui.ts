/* ============================================================
   ui.ts — iframe UI 로직 (postMessage 송수신, 폼 상태)
   ============================================================ */
import type { UiToCode, CodeToUi } from './shared/messages';
import type { DraftToken } from './lib/tokens';
import { FREE_LIMITS, type Tier } from './lib/entitlements';
import { parseVerifyResponse, type VerifyResult } from './lib/license';
import { base64UrlToString, verifyLicenseToken } from './lib/licenseToken';
import { VERIFY_URL, PLUGIN_ID, LICENSE_ISS, LICENSE_AUD, LICENSE_ALG, LICENSE_PUBLIC_JWK } from './lib/licenseConfig';
import { generatePalette, paletteToDraftTokens, suggestSemanticMap, type Harmony } from './lib/palette';

function send(msg: UiToCode): void {
  parent.postMessage({ pluginMessage: msg }, '*');
}

const HEX6 = /^#[0-9a-fA-F]{6}$/;

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

/* ---------- 0 · 브랜드 팔레트 ---------- */
const brandColor = $('brand') as HTMLInputElement;
const brandHex = $('brandHex') as HTMLInputElement;
// 컬러 피커 ↔ HEX 텍스트 동기화
brandColor.addEventListener('input', () => {
  brandHex.value = brandColor.value;
});
brandHex.addEventListener('input', () => {
  if (HEX6.test(brandHex.value)) brandColor.value = brandHex.value.toLowerCase();
});

$('btnPalette').addEventListener('click', () => {
  const primary = brandHex.value.trim();
  if (!HEX6.test(primary)) {
    setStatus('paletteStatus', '브랜드색을 #RRGGBB 형식으로 입력하세요.', 'warn');
    return;
  }
  const useSecondary = ($('useBrand2') as HTMLInputElement).checked;
  const harmonyVal = ($('harmony') as HTMLSelectElement).value as Harmony | '';
  const p = generatePalette({
    brand: { primary, secondary: useSecondary ? ($('brand2') as HTMLInputElement).value : undefined },
    harmony: harmonyVal || undefined,
    includeNeutral: ($('incNeutral') as HTMLInputElement).checked,
    includeStatus: ($('incStatus') as HTMLInputElement).checked,
  });
  tokens = paletteToDraftTokens(p);
  renderTokens();
  // 시맨틱 매핑 textarea를 추천값으로 채움(편집 가능)
  ($('semMap') as HTMLTextAreaElement).value = Object.entries(suggestSemanticMap(p))
    .map(([role, global]) => `${role} = ${global}`)
    .join('\n');
  $('paletteInfo').textContent = `${p.scales.length}계열 · ${tokens.length}색 생성`;
  setStatus(
    'paletteStatus',
    (p.warnings.join(' ') ? p.warnings.join(' ') + ' ' : '') + '아래 ‘2 · 토큰 생성’에서 변수로 만드세요.',
    p.warnings.length ? 'warn' : 'ok',
  );
});

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

$('btnSemantics').addEventListener('click', () => {
  const map: Record<string, string> = {};
  for (const line of ($('semMap') as HTMLTextAreaElement).value.split('\n')) {
    const m = /^\s*([^=]+?)\s*=\s*(.+?)\s*$/.exec(line);
    if (m) map[m[1]] = m[2];
  }
  if (!Object.keys(map).length) {
    setStatus('semStatus', '매핑을 한 줄에 “역할 = Global변수이름” 형식으로 입력하세요.', 'warn');
    return;
  }
  send({ type: 'CREATE_SEMANTICS', map });
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

$('tier').addEventListener('change', () => {
  send({ type: 'SET_LICENSE', tier: ($('tier') as HTMLSelectElement).value as Tier });
});

$('btnVerify').addEventListener('click', () => {
  const key = ($('licenseKey') as HTMLInputElement).value.trim();
  if (!key) {
    setStatus('licenseStatus', '라이선스 키를 입력하세요.', 'warn');
    return;
  }
  setStatus('licenseStatus', '검증 중…', '');
  void verifyAndReport(key);
});

/* ---------- 라이선스 검증 (UI에서 수행 — WebCrypto·fetch 가용) ---------- */
function b64urlToBytes(s: string): Uint8Array<ArrayBuffer> {
  const bin = base64UrlToString(s);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i) & 0xff;
  return out;
}

/** ES256(JWT) 서명 검증 — UI 아이프레임의 WebCrypto 사용. */
async function subtleVerify(signingInput: string, signatureB64: string, alg: string): Promise<boolean> {
  if (alg !== LICENSE_ALG) return false;
  const key = await crypto.subtle.importKey(
    'jwk',
    LICENSE_PUBLIC_JWK as JsonWebKey,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['verify'],
  );
  const data = new TextEncoder().encode(signingInput);
  return crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, b64urlToBytes(signatureB64), data);
}

/** 검증 서버 호출 + 서명/클레임 검증 → 결과를 code로 보고(code가 캐시·적용). */
async function verifyAndReport(key: string): Promise<void> {
  let result: VerifyResult;
  try {
    const resp = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, pluginId: PLUGIN_ID }),
    });
    const json: unknown = await resp.json();
    // 서명 토큰({ token }) 우선, 없으면 평문 응답(개발/하위호환).
    const signed = !!json && typeof json === 'object' && typeof (json as { token?: unknown }).token === 'string';
    const parsed = signed
      ? await verifyLicenseToken((json as { token: string }).token, Date.now(), { issuer: LICENSE_ISS, audience: LICENSE_AUD }, subtleVerify)
      : parseVerifyResponse(json);
    result = parsed.ok
      ? { ok: true, tier: parsed.tier, expiresAt: parsed.expiresAt }
      : { ok: false, error: parsed.error };
  } catch {
    result = { ok: false, error: '검증 서버 연결 실패(오프라인)', offline: true };
  }
  send({ type: 'LICENSE_VERIFIED', key, result });
}

$('btnClearLicense').addEventListener('click', () => {
  ($('licenseKey') as HTMLInputElement).value = '';
  send({ type: 'CLEAR_LICENSE' });
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
      setStatus('createStatus', msg.summary, msg.limited ? 'warn' : 'ok');
      break;
    case 'APPLY_RESULT': {
      const limitNote = msg.limited ? ' · ⚠ Free 한도 도달 — 일부만 적용(업그레이드 필요)' : '';
      setStatus(
        'applyStatus',
        `바인딩 ${msg.bound} · 스킵 ${msg.skipped}${msg.flags.length ? ' — ' + msg.flags.join(' ') : ''}${limitNote}`,
        msg.limited || msg.flags.length ? 'warn' : 'ok',
      );
      break;
    }
    case 'RENAME_RESULT':
      renderDiff(msg.changes, msg.applied);
      break;
    case 'SEMANTICS_RESULT':
      setStatus(
        'semStatus',
        `시맨틱 ${msg.aliased}개 별칭 (생성 ${msg.created} / 갱신 ${msg.updated})` +
          (msg.missing.length ? ` · 누락: ${msg.missing.join(', ')}` : ''),
        msg.missing.length ? 'warn' : 'ok',
      );
      break;
    case 'COLLECTIONS':
      // 현재는 존재 확인용 프로브(별도 UI 없음). 추후 컬렉션 상태 표시에 사용.
      break;
    case 'LICENSE_STATUS': {
      const srcLabel =
        msg.source === 'key'
          ? `라이선스 키${msg.status ? ` · ${msg.status}` : ''}`
          : msg.source === 'dev'
            ? '개발용 강제'
            : '없음';
      const exp = msg.expiresAt ? ` · 만료 ${new Date(msg.expiresAt).toISOString().slice(0, 10)}` : '';
      $('licenseInfo').textContent = `현재: ${msg.tier.toUpperCase()} (${srcLabel})${exp}`;
      const cap = (n: number) => (msg.unlimited ? '∞' : String(n));
      $('limitsInfo').textContent =
        `1회 한도 — 노드 ${cap(FREE_LIMITS.nodes)} · 토큰 ${cap(FREE_LIMITS.tokens)} · 바인딩 ${cap(FREE_LIMITS.bindings)}`;
      // 개발용 토글은 검증 키가 없을 때만 의미가 있으므로, 키가 적용 중이면 표시만 동기화
      if (msg.source !== 'key') ($('tier') as HTMLSelectElement).value = msg.tier;
      if (msg.note) {
        const cls = /실패|오프라인/.test(msg.note) ? 'warn' : 'ok';
        setStatus('licenseStatus', msg.note, cls);
      }
      break;
    }
    case 'PREMIUM_REQUIRED':
      setStatus('createStatus', `${msg.message} (유료 기능: ${msg.feature})`, 'warn');
      break;
    case 'REQUEST_VERIFY':
      // code가 캐시된 키의 (재)검증을 요청 — UI에서 수행 후 결과 보고.
      void verifyAndReport(msg.key);
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

// 초기: 컬렉션 조회(존재 확인용) + 라이선스 상태 조회
send({ type: 'GET_COLLECTIONS' });
send({ type: 'GET_LICENSE' });
