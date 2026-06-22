/* ============================================================
   ui.ts — iframe UI 로직 (postMessage 송수신, 폼 상태)
   ============================================================ */
import type { UiToCode, CodeToUi } from './shared/messages';
import { type DraftToken, suggestNonColorSemanticMap } from './lib/tokens';
import { FREE_LIMITS, type Tier } from './lib/entitlements';
import { parseVerifyResponse, type VerifyResult } from './lib/license';
import { base64UrlToString, verifyLicenseToken } from './lib/licenseToken';
import { VERIFY_URL, PLUGIN_ID, LICENSE_ISS, LICENSE_AUD, LICENSE_ALG, LICENSE_PUBLIC_JWK } from './lib/licenseConfig';
import { type Preset, serializePreset, parsePreset, semanticMapToText, textToSemanticMap } from './lib/presets';
import { type HistoryEntry, formatHistory, serializeHistory } from './lib/history';
import type { ExportFormat } from './lib/exporters';
import { generatePalette, paletteToDraftTokens, suggestSemanticMap, type Harmony } from './lib/palette';
import { explainError, type FriendlyError } from './lib/errors';
import { nextTabIndex } from './lib/a11y';

let lastSentMsg: UiToCode | null = null; // UX7: '다시 시도' 대상(취소는 제외)
function send(msg: UiToCode): void {
  if (msg.type !== 'CANCEL') lastSentMsg = msg;
  parent.postMessage({ pluginMessage: msg }, '*');
}

const HEX6 = /^#[0-9a-fA-F]{6}$/;

const $ = <T extends HTMLElement = HTMLElement>(id: string): T =>
  document.getElementById(id) as T;

let tokens: DraftToken[] = [];
let presets: Preset[] = [];
let history: HistoryEntry[] = [];
let isTeam = false;
let isPro = false;
let teamDataRequested = false;
let lastExportFormat: ExportFormat = 'w3c';
let lastSelCount = 0; // UX5: 마지막으로 받은 선택 수(빈 상태 문구 분기에 사용)

/* ---------- 토큰 목록 렌더 ---------- */
function renderTokens(): void {
  const box = $('tokenList');
  box.innerHTML = '';
  if (!tokens.length) {
    // UX4: 빈 상태 — 선택 여부에 따라 안내 문구를 바꾼다.
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.innerHTML =
      lastSelCount > 0
        ? '선택에서 색·폰트·간격을 뽑습니다. <b>‘선택에서 토큰 추출’</b>을 누르세요.'
        : '프레임을 선택한 뒤 <b>‘선택에서 토큰 추출’</b>을 누르면 색·폰트·간격이 후보로 잡힙니다. 예) 버튼·카드';
    box.appendChild(empty);
    return;
  }
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
  // 시맨틱 매핑 textarea를 색상 추천값으로 채움(편집 가능) + 비색상(간격·반경) 병합
  ($('semMap') as HTMLTextAreaElement).value = Object.entries(suggestSemanticMap(p))
    .map(([role, global]) => `${role} = ${global}`)
    .join('\n');
  mergeSemSuggestions(suggestNonColorSemanticMap(tokens.map((t) => t.name)));
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
  send({ type: 'CREATE_TOKENS', tokens, base, preview: true }); // UX1: 미리보기 먼저
});

$('btnCreateApply').addEventListener('click', () => {
  if (!tokens.length) return;
  const base = Number(($('base') as HTMLInputElement).value) || 16;
  send({ type: 'CREATE_TOKENS', tokens, base }); // 확인 후 실제 적용
});

/** 추천 매핑을 semMap에 병합. 사용자가 이미 입력/편집한 역할은 보존(기존 우선). */
function mergeSemSuggestions(suggest: Record<string, string>): void {
  if (!Object.keys(suggest).length) return;
  const ta = $('semMap') as HTMLTextAreaElement;
  const existing = textToSemanticMap(ta.value);
  ta.value = semanticMapToText({ ...suggest, ...existing }); // 기존 항목이 추천을 덮어씀
}

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
  showApplyProgress('미리보기 계산 중…'); // UX6
  send({ type: 'APPLY', tolerance, preview: true }); // UX1: dry-run 미리보기 먼저
});

$('btnApplyConfirm').addEventListener('click', () => {
  const tolerance = Number(($('tol') as HTMLInputElement).value) || 0;
  showApplyProgress('바인딩 중…'); // UX6
  send({ type: 'APPLY', tolerance }); // 확인 후 실제 바인딩
});

$('btnApplyCancel').addEventListener('click', () => {
  send({ type: 'CANCEL' }); // UX6: 취소 요청
  setStatus('applyStatus', '취소 요청됨 — 다음 지점에서 중단합니다.', 'warn');
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

/* ---------- 팀 기능 게이트 (M3 프리셋 · M3.1 이력, Team) ---------- */
const TEAM_FIELDS = [
  'presetName', 'btnSavePreset', 'presetList', 'btnLoadPreset', 'btnDeletePreset', 'btnExportPreset', 'btnImportPreset', 'presetJson',
  'btnRefreshHistory', 'btnExportHistory', 'btnClearHistory', 'historyJson',
];

const PRO_FIELDS = ['btnRegisterComp', 'btnClassifyVariants', 'btnGenMissing', 'btnExposeProps'];

function updateTeamGate(): void {
  for (const id of TEAM_FIELDS) ($(id) as HTMLButtonElement).disabled = !isTeam;
  for (const id of PRO_FIELDS) ($(id) as HTMLButtonElement).disabled = !isPro;
  const lock = isTeam ? '' : '🔒 Team 전용';
  $('presetLock').textContent = lock;
  $('historyLock').textContent = lock;
  $('componentLock').textContent = isPro ? '' : '🔒 Pro 전용';
  if (isTeam && !teamDataRequested) {
    teamDataRequested = true;
    send({ type: 'GET_PRESETS' });
    send({ type: 'GET_HISTORY' });
  }
}

/* ---------- 컴포넌트 / 베리언트 (Phase 3, Pro) ---------- */
$('btnRegisterComp').addEventListener('click', () => {
  setStatus('componentStatus', '컴포넌트 등록 중…', '');
  send({ type: 'REGISTER_COMPONENTS' });
});

$('btnClassifyVariants').addEventListener('click', () => {
  setStatus('componentStatus', '베리언트 분류 중…', '');
  send({ type: 'CLASSIFY_VARIANTS' });
});

$('btnGenMissing').addEventListener('click', () => {
  setStatus('componentStatus', '누락 조합 생성 중…', '');
  send({ type: 'GENERATE_MISSING_VARIANTS' });
});

$('btnExposeProps').addEventListener('click', () => {
  setStatus('componentStatus', '속성 노출 중…', '');
  send({ type: 'EXPOSE_PROPERTIES' });
});

function renderPresetList(): void {
  const sel = $('presetList') as HTMLSelectElement;
  sel.innerHTML = '';
  for (const p of presets) {
    const o = document.createElement('option');
    o.value = p.name;
    o.textContent = p.name;
    sel.appendChild(o);
  }
}

const gatherPreset = (name: string): Preset => ({
  name,
  base: Number(($('base') as HTMLInputElement).value) || 16,
  tolerance: Number(($('tol') as HTMLInputElement).value) || 0,
  maxDepth: Number(($('depth') as HTMLInputElement).value) || 3,
  semanticMap: textToSemanticMap(($('semMap') as HTMLTextAreaElement).value),
});

function applyPreset(p: Preset): void {
  ($('base') as HTMLInputElement).value = String(p.base);
  ($('tol') as HTMLInputElement).value = String(p.tolerance);
  ($('depth') as HTMLInputElement).value = String(p.maxDepth);
  ($('semMap') as HTMLTextAreaElement).value = semanticMapToText(p.semanticMap);
}

$('btnSavePreset').addEventListener('click', () => {
  const name = ($('presetName') as HTMLInputElement).value.trim();
  if (!name) {
    setStatus('presetStatus', '프리셋 이름을 입력하세요.', 'warn');
    return;
  }
  send({ type: 'SAVE_PRESET', preset: gatherPreset(name) });
});

$('btnLoadPreset').addEventListener('click', () => {
  const name = ($('presetList') as HTMLSelectElement).value;
  const p = presets.find((x) => x.name === name);
  if (!p) {
    setStatus('presetStatus', '선택된 프리셋이 없습니다.', 'warn');
    return;
  }
  applyPreset(p);
  setStatus('presetStatus', `‘${name}’ 적용됨 — 아래 단계에서 실행하세요.`, 'ok');
});

$('btnDeletePreset').addEventListener('click', () => {
  const name = ($('presetList') as HTMLSelectElement).value;
  if (name) send({ type: 'DELETE_PRESET', name });
});

$('btnExportPreset').addEventListener('click', () => {
  const name = ($('presetList') as HTMLSelectElement).value;
  const p = presets.find((x) => x.name === name);
  if (!p) {
    setStatus('presetStatus', '내보낼 프리셋을 선택하세요.', 'warn');
    return;
  }
  ($('presetJson') as HTMLTextAreaElement).value = serializePreset(p);
  setStatus('presetStatus', `‘${name}’ JSON을 내보냈습니다(복사해 공유).`, 'ok');
});

$('btnImportPreset').addEventListener('click', () => {
  const parsed = parsePreset(($('presetJson') as HTMLTextAreaElement).value.trim());
  if (!parsed.ok) {
    setStatus('presetStatus', `가져오기 실패: ${parsed.error}`, 'warn');
    return;
  }
  send({ type: 'SAVE_PRESET', preset: parsed.preset });
});

/* ---------- 변경 이력 (M3.1, Team) ---------- */
function renderHistory(): void {
  const box = $('historyList');
  box.innerHTML = '';
  if (!history.length) {
    box.textContent = '이력 없음';
    return;
  }
  for (const e of history) {
    const row = document.createElement('div');
    row.textContent = formatHistory(e);
    box.appendChild(row);
  }
}

$('btnRefreshHistory').addEventListener('click', () => send({ type: 'GET_HISTORY' }));

$('btnExportHistory').addEventListener('click', () => {
  ($('historyJson') as HTMLTextAreaElement).value = serializeHistory(history);
  setStatus('historyStatus', `이력 ${history.length}건 내보냄(복사해 공유).`, 'ok');
});

$('btnClearHistory').addEventListener('click', () => send({ type: 'CLEAR_HISTORY' }));

/* ---------- 내보내기 (코드) ---------- */
$('btnExport').addEventListener('click', () => {
  const format = ($('exportFormat') as HTMLSelectElement).value as ExportFormat;
  const fontSizeUnit = ($('exportFontUnit') as HTMLSelectElement).value as 'px' | 'rem';
  const base = Number(($('base') as HTMLInputElement).value) || 16;
  const includeSnapshots = ($('exportSnap') as HTMLInputElement).checked;
  setStatus('exportStatus', '내보내는 중…', '');
  send({ type: 'EXPORT', format, fontSizeUnit, base, includeSnapshots });
});

$('btnDownloadExport').addEventListener('click', () => {
  const content = ($('exportOut') as HTMLTextAreaElement).value;
  if (!content) {
    setStatus('exportStatus', '먼저 내보내기를 실행하세요.', 'warn');
    return;
  }
  const css = lastExportFormat === 'css';
  const blob = new Blob([content], { type: css ? 'text/css' : 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = css ? 'tokens.css' : 'tokens.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

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
      mergeSemSuggestions(suggestNonColorSemanticMap(tokens.map((t) => t.name))); // 간격·반경 시맨틱 추천
      ($('btnCreateApply') as HTMLButtonElement).style.display = 'none'; // 토큰 집합 변경 → 새 미리보기 필요
      $('selInfo').textContent = `선택 ${msg.selection}개 · 토큰 ${tokens.length}개`;
      setStatus('extractStatus', msg.warnings.join(' ') || `${tokens.length}개 후보 추출 완료.`, msg.warnings.length ? 'warn' : 'ok');
      break;
    }
    case 'SELECTION_STATE': {
      lastSelCount = msg.count;
      renderSelBar(msg.count, msg.scanned, msg.bindable, msg.capped);
      ($('btnApplyConfirm') as HTMLButtonElement).style.display = 'none'; // 선택 변경 → 바인딩 미리보기 무효화
      if (!tokens.length) renderTokens(); // 선택 변화에 맞춰 빈 상태 문구 갱신
      break;
    }
    case 'CREATE_RESULT': {
      const applyBtn = $('btnCreateApply') as HTMLButtonElement;
      if (msg.preview) {
        // UX1: 변경 요약을 먼저 보여주고 ‘적용’ 버튼 노출.
        setStatus('createStatus', `미리보기 — ${msg.summary} · ‘적용’으로 반영`, msg.limited ? 'warn' : '');
        applyBtn.style.display = '';
      } else {
        setStatus('createStatus', msg.summary, msg.limited ? 'warn' : 'ok');
        applyBtn.style.display = 'none';
      }
      break;
    }
    case 'PROGRESS':
      if (msg.op === 'bind') updateApplyProgress(msg.done, msg.total); // UX6
      break;
    case 'APPLY_RESULT': {
      hideApplyProgress(); // UX6
      const confirmBtn = $('btnApplyConfirm') as HTMLButtonElement;
      const rt = reasonsText(msg.reasons); // UX3: 사유별 스킵
      const limitNote = msg.limited ? ' · ⚠ Free 한도 도달 — 일부만 적용(업그레이드 필요)' : '';
      const detail = `${msg.skipped ? ` · 스킵 ${msg.skipped}` : ''}${rt ? ` — ${rt}` : ''}${limitNote}`;
      if (msg.cancelled) {
        // UX6: 취소 — 처리한 만큼만 적용(비파괴).
        setStatus('applyStatus', `취소됨 — 바인딩 ${msg.bound}건만 적용${detail}`, 'warn');
        confirmBtn.style.display = 'none';
      } else if (msg.preview) {
        setStatus('applyStatus', `미리보기 — 바인딩 ${msg.bound}건 예정${detail} · ‘선택에 바인딩’으로 반영`, msg.limited || msg.skipped ? 'warn' : '');
        confirmBtn.style.display = '';
      } else {
        setStatus('applyStatus', `바인딩 ${msg.bound}${detail}`, msg.limited || msg.skipped ? 'warn' : 'ok');
        confirmBtn.style.display = 'none';
      }
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
      isTeam = msg.tier === 'team';
      isPro = msg.tier === 'pro' || msg.tier === 'team';
      updateTeamGate();
      break;
    }
    case 'PRESETS':
      presets = msg.presets;
      renderPresetList();
      setStatus('presetStatus', `프리셋 ${presets.length}개`, 'ok');
      break;
    case 'HISTORY':
      history = msg.entries;
      renderHistory();
      setStatus('historyStatus', `이력 ${history.length}건`, 'ok');
      break;
    case 'EXPORT_RESULT':
      lastExportFormat = msg.format;
      ($('exportOut') as HTMLTextAreaElement).value = msg.content;
      setStatus('exportStatus', `${msg.format === 'css' ? 'CSS' : 'W3C JSON'} 내보냄 — 복사 또는 다운로드.`, 'ok');
      break;
    case 'COMPONENTS_RESULT':
      setStatus('componentStatus', `컴포넌트 등록 ${msg.registered} · 스킵 ${msg.skipped}`, msg.registered ? 'ok' : 'warn');
      break;
    case 'VARIANTS_RESULT': {
      const box = $('variantReport');
      box.innerHTML = '';
      if (msg.missing.length) {
        const h = document.createElement('div');
        h.textContent = '빈 조합(미생성):';
        box.appendChild(h);
        for (const m of msg.missing) {
          const d = document.createElement('div');
          d.textContent = `  ${m}`;
          box.appendChild(d);
        }
      }
      const extra = `${msg.singles.length ? ` · 단일 ${msg.singles.length}` : ''}${msg.missing.length ? ' · 빈 조합 있음' : ''}`;
      setStatus('componentStatus', `베리언트 세트 ${msg.sets}개 생성${extra}`, 'ok');
      break;
    }
    case 'GENERATE_RESULT': {
      const box = $('variantReport');
      box.innerHTML = '';
      for (const c of msg.combos) {
        const d = document.createElement('div');
        d.textContent = `+ ${c}`;
        box.appendChild(d);
      }
      setStatus('componentStatus', `누락 조합 ${msg.generated}개 생성(세트 ${msg.sets})`, msg.generated ? 'ok' : 'warn');
      break;
    }
    case 'PROPERTIES_RESULT': {
      const box = $('variantReport');
      box.innerHTML = '';
      for (const p of msg.props) {
        const d = document.createElement('div');
        d.textContent = `+ ${p}`;
        box.appendChild(d);
      }
      setStatus('componentStatus', `컴포넌트 속성 ${msg.created}개 노출`, msg.created ? 'ok' : 'warn');
      break;
    }
    case 'PREMIUM_REQUIRED': {
      // 기능에 맞는 카드 영역으로 라우팅(컴포넌트는 ‘적용’ 탭, 팀 기능은 ‘관리’ 탭).
      const statusId = msg.feature === 'components' ? 'componentStatus' : msg.feature === 'teamPresets' ? 'presetStatus' : 'createStatus';
      setStatus(statusId, `${msg.message} (유료 기능: ${msg.feature})`, 'warn');
      break;
    }
    case 'REQUEST_VERIFY':
      // code가 캐시된 키의 (재)검증을 요청 — UI에서 수행 후 결과 보고.
      void verifyAndReport(msg.key);
      break;
    case 'ERROR': {
      // UX7: 실패한 작업 영역에 친절한 메시지 + 복구 행동 + (가능하면) 다시 시도.
      const statusId = (msg.op && OP_STATUS[msg.op]) || 'extractStatus';
      if (msg.op === 'APPLY') hideApplyProgress();
      showError(statusId, explainError(msg.message));
      break;
    }
  }
};

/* ---------- UX7: 오류 라우팅/표시 ---------- */
const OP_STATUS: Record<string, string> = {
  EXTRACT: 'extractStatus',
  CREATE_TOKENS: 'createStatus',
  CREATE_SEMANTICS: 'semStatus',
  APPLY: 'applyStatus',
  RENAME: 'renameStatus',
  EXPORT: 'exportStatus',
  REGISTER_COMPONENTS: 'componentStatus',
  CLASSIFY_VARIANTS: 'componentStatus',
  GENERATE_MISSING_VARIANTS: 'componentStatus',
  EXPOSE_PROPERTIES: 'componentStatus',
  GET_PRESETS: 'presetStatus',
  SAVE_PRESET: 'presetStatus',
  DELETE_PRESET: 'presetStatus',
  GET_HISTORY: 'historyStatus',
  CLEAR_HISTORY: 'historyStatus',
  SET_LICENSE: 'licenseStatus',
  LICENSE_VERIFIED: 'licenseStatus',
  CLEAR_LICENSE: 'licenseStatus',
  GET_LICENSE: 'licenseStatus',
};

function showError(id: string, f: FriendlyError): void {
  const el = $(id);
  el.className = 'status warn';
  el.textContent = `오류: ${f.message}${f.action ? ` — ${f.action}` : ''}`;
  if (f.retryable && lastSentMsg) {
    const retry = lastSentMsg;
    const btn = document.createElement('button');
    btn.textContent = '다시 시도';
    btn.style.marginLeft = '6px';
    btn.addEventListener('click', () => send(retry));
    el.appendChild(document.createTextNode(' '));
    el.appendChild(btn);
  }
}

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

/** UX3: 스킵 사유 키 → 한글 라벨. */
const REASON_LABELS: Record<string, string> = {
  'no-match': '매칭 없음',
  'empty-text': '빈 텍스트',
  error: '바인딩 실패',
  'hug-fill': 'HUG/FILL',
  'no-autolayout': '오토레이아웃 아님',
  font: '폰트 미로드',
};
function reasonsText(reasons: Record<string, number>): string {
  return Object.entries(reasons)
    .filter(([, n]) => n > 0)
    .map(([k, n]) => `${REASON_LABELS[k] ?? k} ${n}`)
    .join(' · ');
}

/* ---------- UX6: 진행률 바 ---------- */
function showApplyProgress(label: string): void {
  $('applyProgress').style.display = '';
  ($('applyBarFill') as HTMLElement).style.width = '0%';
  $('applyProgressText').textContent = label;
}
function updateApplyProgress(done: number, total: number): void {
  $('applyProgress').style.display = '';
  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
  ($('applyBarFill') as HTMLElement).style.width = `${pct}%`;
  $('applyProgressText').textContent = total > 0 ? `${done} / ${total} 처리 중… (${pct}%)` : `${done}개 처리 중…`;
}
function hideApplyProgress(): void {
  $('applyProgress').style.display = 'none';
}

/** UX5: 선택 동기화 바 갱신. */
function renderSelBar(count: number, scanned: number, bindable: number, capped: boolean): void {
  const el = $('selBar');
  const plus = capped ? '+' : '';
  el.textContent =
    count > 0
      ? `● 선택 ${count}개 · 요소 ${scanned}${plus}개 · 바인딩 후보 ${bindable}${plus}개`
      : '● 선택 없음 — 프레임을 선택하면 추출·바인딩할 수 있어요';
  el.className = count > 0 ? 'selbar' : 'selbar muted';
}

function setStatus(id: string, text: string, cls: 'ok' | 'warn' | ''): void {
  const el = $(id);
  el.textContent = text;
  el.className = `status ${cls}`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string));
}

// 초기: 컬렉션 조회(존재 확인용) + 라이선스 상태 조회. 팀 카드는 Team 확인 전까지 잠금.
updateTeamGate();
renderTokens(); // UX4: 시작 시 빈 상태 안내 표시
send({ type: 'GET_COLLECTIONS' });
send({ type: 'GET_LICENSE' });

/* ---------- 탭 내비게이션 (UI 개편 + UX8 키보드) ---------- */
const TABS = ['tokens', 'apply', 'settings'] as const;
function showTab(name: (typeof TABS)[number]): void {
  for (const t of TABS) {
    $(`tab-${t}`).classList.toggle('active', t === name);
    const btn = $(`tabbtn-${t}`);
    const on = t === name;
    btn.classList.toggle('active', on);
    btn.setAttribute('aria-selected', String(on));
    btn.tabIndex = on ? 0 : -1; // UX8: roving tabindex — 탭 묶음은 한 번의 Tab 정지점
  }
}
TABS.forEach((t, i) => {
  const btn = $(`tabbtn-${t}`);
  btn.addEventListener('click', () => showTab(t));
  // UX8: 화살표/Home/End로 탭 이동(포커스 따라가며 활성화).
  btn.addEventListener('keydown', (e) => {
    const ni = nextTabIndex(e.key, i, TABS.length);
    if (ni < 0) return;
    e.preventDefault();
    const target = TABS[ni];
    showTab(target);
    $(`tabbtn-${target}`).focus();
  });
});
showTab('tokens');
