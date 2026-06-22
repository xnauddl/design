/* ============================================================
   ui.ts — iframe UI 로직 (postMessage 송수신, 폼 상태)
   ============================================================ */
import type { UiToCode, CodeToUi, RenameNode, BindCandidate, BindNode, ComponentCandidate } from './shared/messages';
import type { DraftToken } from './lib/tokens';
import { FREE_LIMITS, type Tier } from './lib/entitlements';
import { parseVerifyResponse, type VerifyResult } from './lib/license';
import { base64UrlToString, verifyLicenseToken } from './lib/licenseToken';
import { VERIFY_URL, PLUGIN_ID, LICENSE_ISS, LICENSE_AUD, LICENSE_ALG, LICENSE_PUBLIC_JWK } from './lib/licenseConfig';
import { type Preset, serializePreset, parsePreset, semanticMapToText, textToSemanticMap } from './lib/presets';
import type { ExportFormat } from './lib/exporters';
import { generatePalette, paletteToDraftTokens, paletteSemanticMap, suggestSemanticMap, type Harmony } from './lib/palette';
import { classifyColor, nameColorsByHue } from './lib/colorName';
import { suggestTokenRoles } from './lib/roles';
import { explainError, type FriendlyError } from './lib/errors';
import { nextTabIndex } from './lib/a11y';
import type { WcagLevel } from './lib/contrast';
import { planWizard, summarize, type WizardOptions, type WizardContext, type WizardTotals, type WizardStepId, type WizardPlanItem } from './lib/wizard';

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
let isTeam = false;
let isPro = false;
let teamDataRequested = false;
// #11: 단계 전제 — Global 변수 존재(시맨틱 매핑) · 바인딩 가능 변수 존재(바인딩).
let hasGlobal = false;
let hasBindable = false;
let lastExportFormat: ExportFormat = 'w3c';
let lastSelCount = 0; // UX5: 마지막으로 받은 선택 수(빈 상태 문구 분기에 사용)
let createFrom: 'palette' | 'tokens' = 'tokens'; // 마지막 CREATE_TOKENS 호출 출처(결과 상태 라우팅)

/* ---------- 토큰 목록 렌더 ---------- */
function renderTokens(): void {
  const box = $('tokenList');
  box.innerHTML = '';
  if (!tokens.length) {
    // UX4: 빈 상태 — 선택 여부에 따라 안내 문구를 바꾼다(콜아웃 박스 + 배지).
    const empty = document.createElement('div');
    empty.className = 'ux';
    empty.innerHTML =
      '<div class="ux-h"><span class="badge">UX4</span><span class="ux-t">빈 상태 도움말</span></div>' +
      (lastSelCount > 0
        ? '<div>선택에서 색·폰트·간격을 뽑습니다. <b>‘선택에서 토큰 추출’</b>을 누르세요.</div>'
        : '<div>프레임을 선택한 뒤 <b>‘선택에서 토큰 추출’</b>을 누르면 색·폰트·간격이 후보로 잡힙니다. 예) 버튼·카드</div>');
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
  // 보조색 체크박스가 보조색 + 하모니 사용 여부를 함께 결정(미체크 시 둘 다 미적용).
  const useSecondary = ($('useBrand2') as HTMLInputElement).checked;
  const harmonyVal = ($('harmony') as HTMLSelectElement).value as Harmony;
  const p = generatePalette({
    brand: { primary, secondary: useSecondary ? ($('brand2') as HTMLInputElement).value : undefined },
    harmony: useSecondary ? harmonyVal : undefined,
    includeNeutral: ($('incNeutral') as HTMLInputElement).checked,
    includeStatus: ($('incStatus') as HTMLInputElement).checked,
  });
  tokens = paletteToDraftTokens(p);
  renderTokens();
  // 시맨틱 매핑 textarea를 추천값으로 채움(편집 가능). #3: 역할 → hue Global(정확).
  setSemMapText(paletteSemanticMap(p));
  renderColorTable(); // #3: 색 편집표(hue·역할) 표시
  ($('btnPaletteApply') as HTMLButtonElement).style.display = ''; // 미리보기 후 ‘적용’ 노출
  $('paletteInfo').textContent = `${p.scales.length}계열 · ${tokens.length}색 생성`;
  setStatus(
    'paletteStatus',
    (p.warnings.join(' ') ? p.warnings.join(' ') + ' ' : '') + '하모니를 바꿔 다시 생성하거나, ‘적용’으로 변수에 반영하세요.',
    p.warnings.length ? 'warn' : 'ok',
  );
});

/** 시맨틱 매핑 textarea를 `역할 = 변수명` 줄로 채움. */
function setSemMapText(map: Record<string, string>): void {
  ($('semMap') as HTMLTextAreaElement).value = Object.entries(map)
    .map(([role, global]) => `${role} = ${global}`)
    .join('\n');
}

/** #10·역할 어휘: 전 토큰에서 시맨틱 역할을 추천(매핑이 비어 있을 때만 — 사용자 편집 보존). */
function suggestSemMapFrom(toks: DraftToken[]): void {
  if (($('semMap') as HTMLTextAreaElement).value.trim()) return;
  const base = Number(($('base') as HTMLInputElement).value) || 16;
  const map = suggestTokenRoles(toks, base);
  if (Object.keys(map).length) setSemMapText(map);
}

/** #3: 색 토큰 이름을 hue-Global(`color/blue/500`, 충돌 접미사)로 변환 — 추출 hex명 정규화. */
function huefyTokenColors(toks: DraftToken[]): void {
  const idx: number[] = [];
  const hexes: string[] = [];
  toks.forEach((t, i) => {
    if (t.category === 'color' && typeof t.value === 'string') {
      idx.push(i);
      hexes.push(t.value);
    }
  });
  if (!idx.length) return;
  const names = nameColorsByHue(hexes);
  idx.forEach((ti, k) => {
    toks[ti].name = names[k];
  });
}

/* ---------- #3 색 편집표 (hue → 역할) ---------- */
/** 색 토큰을 표로: 스와치 · hue 이름 · 역할 입력(현 semMap에서 prefill). */
function renderColorTable(): void {
  const card = $('colorTableCard');
  const colors = tokens.filter((t) => t.category === 'color' && typeof t.value === 'string');
  if (!colors.length) {
    card.style.display = 'none';
    return;
  }
  card.style.display = '';
  // 현 semMap을 역할→이름으로 읽어 이름→역할로 뒤집어 prefill.
  const roleByName = new Map<string, string>();
  for (const [role, name] of Object.entries(textToSemanticMap(($('semMap') as HTMLTextAreaElement).value))) {
    if (!roleByName.has(name)) roleByName.set(name, role);
  }
  const box = $('colorTable');
  box.innerHTML = '';
  for (const t of colors) {
    const row = document.createElement('div');
    row.className = 'crow';
    const sw = document.createElement('span');
    sw.className = 'swatch';
    sw.style.background = t.value as string;
    const name = document.createElement('span');
    name.className = 'cn';
    name.textContent = t.name;
    name.title = `${t.name} · ${classifyColor(t.value as string).achromatic ? '무채' : 'hue'}`;
    const role = document.createElement('input');
    role.setAttribute('list', 'roleList');
    role.placeholder = '역할(선택)';
    role.value = roleByName.get(t.name) ?? '';
    role.dataset.name = t.name;
    row.append(sw, name, role);
    box.appendChild(row);
  }
}

/** 색 편집표의 역할 입력 → 시맨틱 매핑 textarea로 반영(역할=이름). */
function applyColorRoles(): void {
  const map: Record<string, string> = {};
  $('colorTable').querySelectorAll<HTMLInputElement>('input[data-name]').forEach((inp) => {
    const role = inp.value.trim();
    if (role) map[role] = inp.dataset.name as string; // 같은 역할 중복 시 뒤가 우선
  });
  setSemMapText(map);
  setStatus('semStatus', `${Object.keys(map).length}개 역할 반영됨 — ‘시맨틱 별칭 생성’으로 적용.`, 'ok');
}

// 보조색 사용 토글 → 보조색·하모니 입력 활성/비활성 동기화.
function syncSecondaryControls(): void {
  const on = ($('useBrand2') as HTMLInputElement).checked;
  ($('brand2') as HTMLInputElement).disabled = !on;
  ($('harmony') as HTMLSelectElement).disabled = !on;
}
$('useBrand2').addEventListener('change', syncSecondaryControls);
syncSecondaryControls();

// 팔레트 ‘적용’ — 생성된 팔레트를 변수에 직접 커밋(생성=미리보기 / 적용=커밋).
$('btnPaletteApply').addEventListener('click', () => {
  if (!tokens.length) {
    setStatus('paletteStatus', '먼저 ‘팔레트 생성’으로 색을 만드세요.', 'warn');
    return;
  }
  const base = Number(($('base') as HTMLInputElement).value) || 16;
  createFrom = 'palette';
  send({ type: 'CREATE_TOKENS', tokens, base, replacePalette: true }); // 바로 변수 생성 + 이전 팔레트 색 정리
  setStatus('paletteStatus', '변수에 적용 중…', '');
});

/* ---------- UX4: 온보딩 카드 ---------- */
$('btnOnboardClose').addEventListener('click', () => {
  $('onboardCard').style.display = 'none';
});
$('btnGuide').addEventListener('click', () => {
  showTab('wizard');
  $('btnWizardRun').focus();
  $('wizardCard').scrollIntoView({ block: 'start', behavior: 'smooth' });
});

/* ---------- 버튼 ---------- */
$('btnExtract').addEventListener('click', () => send({ type: 'EXTRACT' }));

$('btnCreate').addEventListener('click', () => {
  if (!tokens.length) {
    setStatus('createStatus', '먼저 토큰을 추출하세요.', 'warn');
    return;
  }
  const base = Number(($('base') as HTMLInputElement).value) || 16;
  createFrom = 'tokens';
  send({ type: 'CREATE_TOKENS', tokens, base, preview: true }); // UX1: 미리보기 먼저
});

$('btnCreateApply').addEventListener('click', () => {
  if (!tokens.length) return;
  const base = Number(($('base') as HTMLInputElement).value) || 16;
  createFrom = 'tokens';
  send({ type: 'CREATE_TOKENS', tokens, base }); // 확인 후 실제 적용
});

$('btnColorRoles').addEventListener('click', applyColorRoles); // #3 색 편집표 → 시맨틱 매핑

$('btnScanGlobals').addEventListener('click', () => {
  // #10: 기존 Global 색에서 시맨틱 역할 추천(재방문 매핑).
  setStatus('semStatus', '기존 색 스캔 중…', '');
  send({ type: 'GET_GLOBAL_COLORS' });
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
  showApplyProgress('미리보기 계산 중…'); // UX6
  send({ type: 'APPLY', tolerance, preview: true }); // UX1: dry-run 미리보기 먼저
});

$('btnApplyConfirm').addEventListener('click', () => {
  // #6: 미리보기 트리에서 체크한 후보만 직접 바인딩(WYSIWYG).
  const items = bindCandidates
    .filter((c) => bindChecked.has(candKey(c)))
    .map((c) => ({ nodeId: c.nodeId, field: c.field, index: c.index, variableId: c.variableId }));
  if (!items.length) return;
  showApplyProgress('바인딩 중…'); // UX6
  send({ type: 'APPLY_SELECTED', items });
});

$('bindAll').addEventListener('change', (e) => {
  const on = (e.target as HTMLInputElement).checked;
  bindChecked.clear();
  if (on) for (const c of bindCandidates) bindChecked.add(candKey(c));
  renderBindTree();
});

$('bindHideCtx').addEventListener('change', (e) => {
  bindHideContext = (e.target as HTMLInputElement).checked;
  renderBindTree();
});

$('btnApplyCancel').addEventListener('click', () => {
  send({ type: 'CANCEL' }); // UX6: 취소 요청
  setStatus('applyStatus', '취소 요청됨 — 다음 지점에서 중단합니다.', 'warn');
});

$('btnPreview').addEventListener('click', () => {
  const maxDepth = Number(($('depth') as HTMLInputElement).value) || 3;
  send({ type: 'RENAME', apply: false, maxDepth });
});

$('btnContrast').addEventListener('click', () => {
  const level = ($('contrastLevel') as HTMLSelectElement).value as WcagLevel;
  setStatus('contrastStatus', '대비 검사 중…', '');
  send({ type: 'CHECK_CONTRAST', level });
});

$('btnRename').addEventListener('click', () => {
  // #7: 미리보기 트리에서 체크한 항목만 직접 적용(WYSIWYG).
  const items = renameNodes
    .filter((n) => n.after !== undefined && renameChecked.has(n.id))
    .map((n) => ({ id: n.id, after: n.after as string }));
  if (!items.length) return;
  send({ type: 'RENAME_APPLY', items });
});

$('renameAll').addEventListener('change', (e) => {
  const on = (e.target as HTMLInputElement).checked;
  renameChecked.clear();
  if (on) for (const n of renameNodes) if (n.after !== undefined) renameChecked.add(n.id);
  renderRenameTree();
});

$('renameHideCtx').addEventListener('change', (e) => {
  renameHideContext = (e.target as HTMLInputElement).checked;
  renderRenameTree();
});

/* ============================================================
   시스템화 마법사 — 기존 메시지(추출→생성→시맨틱→바인딩→정돈→검수→컴포넌트화)를
   순서대로 호출하는 UI 시퀀서. 신규 로직은 lib/wizard.ts(순수)에 분리.
   기존 window.onmessage 스위치는 그대로 두고, 별도 리스너로 단계 완료를 await한다.
   ============================================================ */
let wizardRunning = false;
// 한 번에 하나의 단계만 await(순차 실행)하므로 단일 대기자로 충분.
let wizardWaiter: { types: string[]; resolve: (m: CodeToUi) => void; reject: (e: Error) => void } | null = null;

window.addEventListener('message', (event: MessageEvent) => {
  const m = (event.data as { pluginMessage?: CodeToUi }).pluginMessage;
  if (!m) return;
  // 바인딩 진행률(UX6)은 마법사 자체 진행바로 표시(‘적용’ 탭 진행바는 안 보임).
  if (wizardRunning && m.type === 'PROGRESS' && m.op === 'bind') updateWizardBar(m.done, m.total);
  if (!wizardWaiter) return;
  // 오류/유료요구는 대기 중이면 해당 단계 실패로 처리(무한 대기 방지).
  if (m.type === 'ERROR' || m.type === 'PREMIUM_REQUIRED') {
    const w = wizardWaiter;
    wizardWaiter = null;
    w.reject(new Error(m.message));
    return;
  }
  if (wizardWaiter.types.includes(m.type)) {
    const w = wizardWaiter;
    wizardWaiter = null;
    w.resolve(m);
  }
});

/** 메시지를 보내고 기대 응답(또는 오류)까지 기다린다. 결과 타입은 expect로 좁혀진다. */
function wizardRequest<T extends CodeToUi['type']>(msg: UiToCode, expect: T[]): Promise<Extract<CodeToUi, { type: T }>> {
  return new Promise<Extract<CodeToUi, { type: T }>>((resolve, reject) => {
    wizardWaiter = {
      types: [...expect],
      resolve: (m) => resolve(m as Extract<CodeToUi, { type: T }>),
      reject,
    };
    send(msg);
  });
}

function showWizardBar(): void {
  $('wizardBar').style.display = '';
  ($('wizardBarFill') as HTMLElement).style.width = '0%';
}
function updateWizardBar(done: number, total: number): void {
  $('wizardBar').style.display = '';
  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
  ($('wizardBarFill') as HTMLElement).style.width = `${pct}%`;
}
function hideWizardBar(): void {
  $('wizardBar').style.display = 'none';
}

/** 계획에 따라 단계 행을 그린다(번호·라벨·사유). 실행 안 할 단계는 skip 표시. */
function renderWizardSteps(plan: WizardPlanItem[]): void {
  const box = $('wizardSteps');
  box.innerHTML = '';
  plan.forEach((p, i) => {
    const row = document.createElement('div');
    row.className = 'wstep' + (p.run ? '' : ' skip');
    row.id = `wstep-${p.step.id}`;
    const dot = document.createElement('span');
    dot.className = 'dot';
    dot.textContent = String(i + 1);
    const label = document.createElement('span');
    label.className = 'wlabel';
    label.textContent = p.step.label;
    const note = document.createElement('span');
    note.className = 'wnote';
    note.textContent = p.run ? '' : p.skipReason ?? '건너뜀';
    row.append(dot, label, note);
    box.appendChild(row);
  });
}

function setWizardStep(id: WizardStepId, state: 'active' | 'done' | 'fail', note: string): void {
  const row = document.getElementById(`wstep-${id}`);
  if (!row) return;
  row.classList.remove('active', 'done', 'fail');
  row.classList.add(state);
  const dot = row.querySelector('.dot') as HTMLElement | null;
  if (dot && state === 'done') dot.textContent = '✓';
  if (dot && state === 'fail') dot.textContent = '!';
  const n = row.querySelector('.wnote') as HTMLElement | null;
  if (n) n.textContent = note;
}

async function runWizard(): Promise<void> {
  if (wizardRunning) return;
  if (lastSelCount <= 0) {
    setStatus('wizardSummary', '먼저 프레임을 선택하세요 — 선택한 레이어에서 토큰을 추출합니다.', 'warn');
    return;
  }
  // 설정값은 각 단계의 기존 입력 필드에서 읽는다(단일 출처).
  const base = Number(($('base') as HTMLInputElement).value) || 16;
  const tolerance = Number(($('tol') as HTMLInputElement).value) || 0;
  const maxDepth = Number(($('depth') as HTMLInputElement).value) || 3;
  const level = ($('contrastLevel') as HTMLSelectElement).value as WcagLevel;
  const semMap = textToSemanticMap(($('semMap') as HTMLTextAreaElement).value);

  const options: WizardOptions = {
    semantics: ($('wizOptSemantics') as HTMLInputElement).checked,
    contrast: ($('wizOptContrast') as HTMLInputElement).checked,
    componentize: ($('wizOptComponentize') as HTMLInputElement).checked,
  };
  const ctx: WizardContext = { isPro, hasSemanticMap: Object.keys(semMap).length > 0 };
  const plan = planWizard(options, ctx);

  wizardRunning = true;
  ($('btnWizardRun') as HTMLButtonElement).disabled = true;
  $('btnWizardCancel').style.display = '';
  setStatus('wizardSummary', '실행 중…', '');
  renderWizardSteps(plan);

  const totals: WizardTotals = {};
  let stopped = false;

  for (const p of plan) {
    if (!p.run) continue; // renderWizardSteps에서 이미 skip 표시
    if (stopped) {
      setWizardStep(p.step.id, 'fail', '이전 단계 중단으로 건너뜀');
      continue;
    }
    setWizardStep(p.step.id, 'active', '진행 중…');
    try {
      switch (p.step.id) {
        case 'extract': {
          const r = await wizardRequest({ type: 'EXTRACT' }, ['EXTRACT_RESULT']);
          tokens = r.tokens; // 모듈 변수 동기화(다음 단계 일관성)
          if (!tokens.length) {
            setWizardStep('extract', 'fail', '추출된 토큰 없음 — 색·폰트·간격이 있는 프레임을 선택하세요.');
            stopped = true;
            break;
          }
          setWizardStep('extract', 'done', `${tokens.length}개 후보`);
          break;
        }
        case 'create': {
          const r = await wizardRequest({ type: 'CREATE_TOKENS', tokens, base }, ['CREATE_RESULT']);
          totals.created = r.created + r.updated;
          setWizardStep('create', 'done', r.limited ? `${r.created + r.updated}개 · ⚠ Free 한도 일부만` : `생성 ${r.created} · 갱신 ${r.updated}`);
          break;
        }
        case 'semantics': {
          const r = await wizardRequest({ type: 'CREATE_SEMANTICS', map: semMap }, ['SEMANTICS_RESULT']);
          totals.semanticsAliased = r.aliased;
          setWizardStep('semantics', 'done', `별칭 ${r.aliased}${r.missing.length ? ` · 누락 ${r.missing.length}` : ''}`);
          break;
        }
        case 'bind': {
          showWizardBar();
          const r = await wizardRequest({ type: 'APPLY', tolerance }, ['APPLY_RESULT']);
          hideWizardBar();
          totals.bound = r.bound;
          if (r.cancelled) {
            setWizardStep('bind', 'done', `취소됨 — ${r.bound}건만 적용`);
            stopped = true;
            break;
          }
          setWizardStep('bind', 'done', `바인딩 ${r.bound}${r.skipped ? ` · 스킵 ${r.skipped}` : ''}`);
          break;
        }
        case 'rename': {
          const r = await wizardRequest({ type: 'RENAME', apply: true, maxDepth }, ['RENAME_RESULT']);
          totals.renamed = r.changes.length;
          setWizardStep('rename', 'done', `${r.changes.length}개 이름 적용`);
          break;
        }
        case 'contrast': {
          const r = await wizardRequest({ type: 'CHECK_CONTRAST', level }, ['CONTRAST_RESULT']);
          totals.contrastChecked = r.checked;
          totals.contrastFailed = r.failed;
          // 미달 발견은 ‘실행 실패’가 아니라 ‘점검 결과’ — 흐름은 계속하되 주의 표시.
          setWizardStep('contrast', r.failed ? 'fail' : 'done', r.checked === 0 ? '검사할 텍스트 없음' : `${r.checked - r.failed}/${r.checked} ${r.level} 통과`);
          break;
        }
        case 'componentize': {
          const reg = await wizardRequest({ type: 'REGISTER_COMPONENTS' }, ['COMPONENTS_RESULT']);
          const cls = await wizardRequest({ type: 'CLASSIFY_VARIANTS' }, ['VARIANTS_RESULT']);
          totals.components = reg.registered;
          setWizardStep('componentize', 'done', `등록 ${reg.registered} · 세트 ${cls.sets}`);
          break;
        }
      }
    } catch (e) {
      hideWizardBar();
      const fe = explainError(e instanceof Error ? e.message : String(e));
      setWizardStep(p.step.id, 'fail', `${fe.message}${fe.action ? ` — ${fe.action}` : ''}`);
      stopped = true;
    }
  }

  wizardRunning = false;
  ($('btnWizardRun') as HTMLButtonElement).disabled = false;
  $('btnWizardCancel').style.display = 'none';
  setStatus('wizardSummary', `${stopped ? '중단' : '완료'} — ${summarize(totals)}`, stopped ? 'warn' : 'ok');
}

$('btnWizardRun').addEventListener('click', () => void runWizard());
$('btnWizardCancel').addEventListener('click', () => send({ type: 'CANCEL' }));

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

/* ---------- 팀 기능 게이트 (M3 프리셋, Team) ---------- */
const TEAM_FIELDS = [
  'presetName', 'btnSavePreset', 'presetList', 'btnLoadPreset', 'btnDeletePreset', 'btnExportPreset', 'btnImportPreset', 'presetJson',
];

const PRO_FIELDS = ['btnScanComp', 'btnRegisterComp', 'btnClassifyVariants', 'btnGenMissing', 'btnExposeProps'];

/**
 * 통합 게이트(#11·#12) — 유료 잠금(Pro/Team)과 전제 미충족(Global/바인딩 변수 없음)을
 * 한 메커니즘으로: 해당 버튼 disabled + 배지/안내(+바로가기) 표시.
 */
function updateGates(): void {
  // 유료 잠금(#12)
  for (const id of TEAM_FIELDS) ($(id) as HTMLButtonElement).disabled = !isTeam;
  for (const id of PRO_FIELDS) ($(id) as HTMLButtonElement).disabled = !isPro;
  $('presetLock').textContent = isTeam ? '' : '🔒 Team 전용';
  $('componentLock').textContent = isPro ? '' : '🔒 Pro 전용';
  $('wizComponentLock').textContent = isPro ? '' : '🔒 Pro';
  ($('wizOptComponentize') as HTMLInputElement).disabled = !isPro;

  // 전제 미충족 가드(#11) — Global 없으면 시맨틱 매핑, 바인딩 변수 없으면 바인딩을 잠근다.
  setPrereq('btnSemantics', 'semPrereq', hasGlobal, '먼저 토큰을 생성해 Global 변수를 만드세요.');
  setPrereq('btnApply', 'bindPrereq', hasBindable, '먼저 토큰을 생성해 바인딩할 변수를 만드세요.');
  if (!hasBindable) ($('btnApplyConfirm') as HTMLButtonElement).disabled = true;

  if (isTeam && !teamDataRequested) {
    teamDataRequested = true;
    send({ type: 'GET_PRESETS' });
  }
}

/** 전제 충족 여부로 버튼 활성/안내(+바로가기) 토글. */
function setPrereq(btnId: string, noticeId: string, ok: boolean, msg: string): void {
  ($(btnId) as HTMLButtonElement).disabled = !ok;
  const notice = $(noticeId);
  notice.style.display = ok ? 'none' : '';
  const text = notice.querySelector('.prereq-text');
  if (text) text.textContent = ok ? '' : msg;
}

/** 전제 미충족 안내의 ‘토큰 생성으로’ 바로가기 — 토큰 탭으로 이동 + 생성 카드 포커스. */
function goToCreate(): void {
  showTab('tokens');
  $('createCard').scrollIntoView({ behavior: 'smooth', block: 'center' });
  ($('btnCreate') as HTMLButtonElement).focus();
}

/* ---------- 컴포넌트 / 베리언트 (Phase 3, Pro) ---------- */
$('btnScanComp').addEventListener('click', () => {
  setStatus('componentStatus', '후보 스캔 중…', '');
  send({ type: 'SCAN_COMPONENT_CANDIDATES' });
});

$('btnRegisterComp').addEventListener('click', () => {
  // #1: 스캔 후보가 있으면 체크한 노드만, 없으면 최상위 선택(폴백).
  if (compCandidates.length) {
    const nodeIds = compCandidates.filter((c) => c.eligible && compChecked.has(c.id)).map((c) => c.id);
    if (!nodeIds.length) return;
    setStatus('componentStatus', '컴포넌트 등록 중…', '');
    send({ type: 'REGISTER_COMPONENTS', nodeIds });
  } else {
    setStatus('componentStatus', '컴포넌트 등록 중…', '');
    send({ type: 'REGISTER_COMPONENTS' });
  }
});

$('compAll').addEventListener('change', (e) => {
  const on = (e.target as HTMLInputElement).checked;
  compChecked.clear();
  if (on) for (const c of compCandidates) if (c.eligible) compChecked.add(c.id);
  renderCompTree();
});

$('compHideCtx').addEventListener('change', (e) => {
  compHideContext = (e.target as HTMLInputElement).checked;
  renderCompTree();
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

/* ---------- 내보내기 (코드) ---------- */
$('btnExport').addEventListener('click', () => {
  const format = ($('exportFormat') as HTMLSelectElement).value as ExportFormat;
  const fontSizeUnit = ($('exportFontUnit') as HTMLSelectElement).value as 'px' | 'rem';
  const base = Number(($('base') as HTMLInputElement).value) || 16;
  setStatus('exportStatus', '내보내는 중…', '');
  send({ type: 'EXPORT', format, fontSizeUnit, base });
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
      huefyTokenColors(tokens); // #3: 추출 색을 hue-Global 이름으로 정규화
      renderTokens();
      ($('btnCreateApply') as HTMLButtonElement).style.display = 'none'; // 토큰 집합 변경 → 새 미리보기 필요
      ($('btnPaletteApply') as HTMLButtonElement).style.display = 'none'; // 추출이 팔레트 미리보기를 대체 → 팔레트 적용 숨김
      // #10: 추출 색에서도 시맨틱 매핑 추천(비어 있을 때만 — 사용자 편집 보존).
      suggestSemMapFrom(tokens);
      renderColorTable(); // #3: 색 편집표(hue·역할) 표시
      $('selInfo').textContent = `선택 ${msg.selection}개 · 토큰 ${tokens.length}개`;
      setStatus('extractStatus', msg.warnings.join(' ') || `${tokens.length}개 후보 추출 완료.`, msg.warnings.length ? 'warn' : 'ok');
      break;
    }
    case 'SELECTION_STATE': {
      lastSelCount = msg.count;
      renderSelBar(msg.count, msg.scanned, msg.bindable, msg.capped);
      clearBindPreview(); // 선택 변경 → 바인딩 미리보기 무효화
      if (!tokens.length) renderTokens(); // 선택 변화에 맞춰 빈 상태 문구 갱신
      break;
    }
    case 'CREATE_RESULT': {
      const applyBtn = $('btnCreateApply') as HTMLButtonElement;
      if (msg.preview) {
        // UX1: 변경 요약을 먼저 보여주고 ‘적용’ 버튼 노출.
        setStatus('createStatus', `미리보기 — ${msg.summary} · ‘적용’으로 반영`, msg.limited ? 'warn' : '');
        applyBtn.style.display = '';
      } else if (createFrom === 'palette') {
        // 팔레트 카드의 ‘적용’에서 온 결과 → 팔레트 상태에 표시.
        setStatus('paletteStatus', msg.summary, msg.limited ? 'warn' : 'ok');
        createFrom = 'tokens';
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
        clearBindPreview();
        setStatus('applyStatus', `취소됨 — 바인딩 ${msg.bound}건만 적용${detail}`, 'warn');
        confirmBtn.style.display = 'none';
      } else if (msg.preview) {
        // #6: 후보를 선택형 미리보기 트리로. 기본 전체 체크.
        bindCandidates = msg.candidates ?? [];
        bindNodes = msg.nodes ?? [];
        bindChecked.clear();
        for (const c of bindCandidates) bindChecked.add(candKey(c));
        renderBindTree();
        setStatus('applyStatus', `미리보기 — 바인딩 ${msg.bound}건 후보${detail} · 체크 후 ‘선택에 바인딩’`, msg.limited || msg.skipped ? 'warn' : '');
      } else {
        clearBindPreview();
        setStatus('applyStatus', `바인딩 ${msg.bound}${detail}`, msg.limited || msg.skipped ? 'warn' : 'ok');
        confirmBtn.style.display = 'none';
      }
      break;
    }
    case 'RENAME_RESULT':
      renderRenameResult(msg);
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
      // 존재 확인용 프로브(별도 UI 없음).
      break;
    case 'GLOBAL_COLORS':
      // #10: 기존 Global 색에서 역할 추천 → 시맨틱 매핑 textarea 채움(재방문 매핑).
      if (!msg.colors.length) {
        setStatus('semStatus', '기존 Global 색 변수가 없습니다 — 먼저 토큰을 생성하세요.', 'warn');
      } else {
        setSemMapText(suggestSemanticMap(msg.colors));
        setStatus('semStatus', `기존 색 ${msg.colors.length}개에서 역할 추천 — 확인 후 ‘시맨틱 별칭 생성’.`, 'ok');
      }
      break;
    case 'PREREQ_STATE':
      // #11: 단계 전제 갱신 → 통합 게이트 재평가.
      hasGlobal = msg.hasGlobal;
      hasBindable = msg.hasBindable;
      updateGates();
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
      updateGates();
      break;
    }
    case 'PRESETS':
      presets = msg.presets;
      renderPresetList();
      setStatus('presetStatus', `프리셋 ${presets.length}개`, 'ok');
      break;
    case 'EXPORT_RESULT':
      lastExportFormat = msg.format;
      ($('exportOut') as HTMLTextAreaElement).value = msg.content;
      setStatus('exportStatus', `${msg.format === 'css' ? 'CSS' : 'W3C JSON'} 내보냄 — 복사 또는 다운로드.`, 'ok');
      break;
    case 'COMPONENT_CANDIDATES': {
      // #1: 하위 등록 후보를 트리로. 등록 가능 노드 기본 전체 체크.
      compCandidates = msg.nodes;
      compChecked.clear();
      for (const c of msg.nodes) if (c.eligible) compChecked.add(c.id);
      renderCompTree();
      if (!compEligibleCount()) setStatus('componentStatus', '선택 하위에 등록 가능한 프레임이 없습니다.', 'warn');
      break;
    }
    case 'COMPONENTS_RESULT':
      clearCompPreview(); // 등록으로 노드 구조 변경 → 후보 무효화
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
    case 'CONTRAST_RESULT':
      renderContrast(msg);
      break;
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
  CHECK_CONTRAST: 'contrastStatus',
  GET_PRESETS: 'presetStatus',
  SAVE_PRESET: 'presetStatus',
  DELETE_PRESET: 'presetStatus',
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

/* ============================================================
   선택형 미리보기 트리 (#13) — 공통 컴포넌트.
   선택 서브트리 전체를 Figma 레이어 패널처럼 들여쓰기로 표시하고,
   영향 노드(change 보유)만 체크박스로 골라 적용한다. 나머지는 회색 맥락.
   #6(바인딩)·#1(컴포넌트) 미리보기도 이 컴포넌트를 재사용한다.
   ============================================================ */
interface TreeRow {
  id: string;
  name: string;
  type: string;
  depth: number;
  parentId: string | null;
  /** 적용 후 라벨(리네임=after, 바인딩=변수명…). 존재 시 영향 노드(체크 가능). */
  change?: string;
  /** 영향 후보를 가진 노드의 헤더(맥락 숨김에도 유지, 체크 불가). */
  header?: boolean;
  /** false면 name을 교체(취소선)가 아니라 그대로 유지(예: 컴포넌트 등록은 이름 보존). 기본 true. */
  replace?: boolean;
}

/** 선택 서브트리의 최소 depth(루트 기준)로 들여쓰기를 정규화한다. */
function baseDepth(rows: TreeRow[]): number {
  return rows.reduce((m, r) => Math.min(m, r.depth), Infinity);
}

function renderSelectableTree(
  mount: HTMLElement,
  rows: TreeRow[],
  checked: Set<string>,
  opts: { onChange: () => void; hideContext: boolean },
): void {
  mount.innerHTML = '';
  const base = rows.length ? baseDepth(rows) : 0;
  for (const r of rows) {
    const affected = r.change !== undefined;
    if (!affected && !r.header && opts.hideContext) continue; // 헤더는 맥락 숨김에도 유지
    const row = document.createElement('div');
    row.className = affected ? 'tree-row affected' : r.header ? 'tree-row header' : 'tree-row context';
    row.style.paddingLeft = `${(r.depth - base) * 12}px`;

    if (affected) {
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = checked.has(r.id);
      cb.addEventListener('change', () => {
        if (cb.checked) checked.add(r.id);
        else checked.delete(r.id);
        opts.onChange();
      });
      row.appendChild(cb);
      const label = document.createElement('span');
      const nameCls = r.replace === false ? 'tree-name' : 'before'; // 이름 보존(컴포넌트)은 취소선 없음
      label.innerHTML = ` <span class="${nameCls}">${escapeHtml(r.name)}</span> → <span class="after">${escapeHtml(r.change as string)}</span>`;
      row.appendChild(label);
    } else {
      const label = document.createElement('span');
      label.className = 'tree-ctx';
      label.textContent = r.name;
      row.appendChild(label);
    }
    mount.appendChild(row);
  }
}

/* ---------- 리네임: 미리보기 트리 + 선택 적용 ---------- */
let renameNodes: RenameNode[] = []; // 마지막 미리보기 서브트리
const renameChecked = new Set<string>(); // 체크된 영향 노드 id
let renameHideContext = false; // 맥락(비영향) 숨기기 토글

function affectedRenameCount(): number {
  return renameNodes.reduce((n, r) => n + (r.after !== undefined ? 1 : 0), 0);
}

function renderRenameTree(): void {
  const rows: TreeRow[] = renameNodes.map((n) => ({
    id: n.id,
    name: n.name,
    type: n.type,
    depth: n.depth,
    parentId: n.parentId,
    change: n.after,
  }));
  renderSelectableTree($('diff'), rows, renameChecked, {
    hideContext: renameHideContext,
    onChange: updateRenameApply,
  });
  updateRenameApply();
}

/** 적용 버튼 활성/라벨 + 전체선택 마스터 상태를 체크 수에 맞춰 갱신. */
function updateRenameApply(): void {
  const total = affectedRenameCount();
  const sel = renameChecked.size;
  ($('btnRename') as HTMLButtonElement).disabled = sel === 0;
  const all = $('renameAll') as HTMLInputElement;
  all.checked = total > 0 && sel === total;
  all.indeterminate = sel > 0 && sel < total;
  setStatus(
    'renameStatus',
    total === 0 ? '변경할 이름이 없습니다.' : `${total}개 변경 예정 · ${sel}개 선택 — ‘이름 적용’.`,
    '',
  );
}

function renderRenameResult(msg: Extract<CodeToUi, { type: 'RENAME_RESULT' }>): void {
  if (!msg.applied) {
    // 미리보기: 전체 서브트리 + 영향 노드 기본 체크.
    renameNodes = msg.nodes;
    renameChecked.clear();
    for (const n of msg.nodes) if (n.after !== undefined) renameChecked.add(n.id);
    renderRenameTree();
    return;
  }
  // 적용 완료(선택 적용 또는 마법사): 트리 비우고 결과만.
  renameNodes = [];
  renameChecked.clear();
  $('diff').innerHTML = '';
  ($('btnRename') as HTMLButtonElement).disabled = true;
  setStatus('renameStatus', `${msg.changes.length}개 이름 적용 완료.`, 'ok');
}

/* ---------- 바인딩(#6): 미리보기 트리 + 선택 적용 ---------- */
let bindCandidates: BindCandidate[] = [];
let bindNodes: BindNode[] = [];
const bindChecked = new Set<string>(); // 체크된 후보 키
let bindHideContext = false;

/** 후보 고유 키(노드+필드+인덱스). */
function candKey(c: { nodeId: string; field: string; index?: number }): string {
  return `${c.nodeId}|${c.field}|${c.index ?? ''}`;
}

/** 미리보기 후보를 트리에 표시 가능 여부. */
function hasBindPreview(): boolean {
  return bindCandidates.length > 0;
}

/** code의 후보/노드를 트리 행으로: 노드 헤더 + 후보(체크) 행. */
function bindRows(): TreeRow[] {
  const byNode = new Map<string, BindCandidate[]>();
  for (const c of bindCandidates) {
    const arr = byNode.get(c.nodeId);
    if (arr) arr.push(c);
    else byNode.set(c.nodeId, [c]);
  }
  const rows: TreeRow[] = [];
  for (const n of bindNodes) {
    const cands = byNode.get(n.id);
    rows.push({ id: n.id, name: n.name, type: n.type, depth: n.depth, parentId: n.parentId, header: !!cands });
    if (cands) {
      for (const c of cands) {
        const dist = c.distance && c.distance > 0 ? ` ~${Math.round(c.distance * 100) / 100}` : '';
        rows.push({
          id: candKey(c),
          name: `${c.field} ${c.currentValue}`,
          type: c.field,
          depth: n.depth + 1,
          parentId: n.id,
          change: `${c.variableName}${dist}`,
        });
      }
    }
  }
  return rows;
}

function renderBindTree(): void {
  ($('bindTreeCtrls') as HTMLElement).style.display = hasBindPreview() ? '' : 'none';
  renderSelectableTree($('bindTree'), bindRows(), bindChecked, {
    hideContext: bindHideContext,
    onChange: updateBindApply,
  });
  updateBindApply();
}

/** 선택에 바인딩 버튼 활성/라벨 + 전체선택 마스터 동기화. */
function updateBindApply(): void {
  const total = bindCandidates.length;
  const sel = bindChecked.size;
  const confirm = $('btnApplyConfirm') as HTMLButtonElement;
  confirm.style.display = hasBindPreview() ? '' : 'none';
  confirm.disabled = sel === 0;
  if (hasBindPreview()) {
    const all = $('bindAll') as HTMLInputElement;
    all.checked = sel === total && total > 0;
    all.indeterminate = sel > 0 && sel < total;
  }
}

/** 바인딩 미리보기/적용 상태를 초기화(선택 변경·적용 완료 시). */
function clearBindPreview(): void {
  bindCandidates = [];
  bindNodes = [];
  bindChecked.clear();
  $('bindTree').innerHTML = '';
  ($('bindTreeCtrls') as HTMLElement).style.display = 'none';
  ($('btnApplyConfirm') as HTMLButtonElement).style.display = 'none';
}

/* ---------- 컴포넌트 등록(#1): 하위 후보 트리 + 선택 등록 ---------- */
let compCandidates: ComponentCandidate[] = [];
const compChecked = new Set<string>(); // 체크된 등록 후보(노드 id)
let compHideContext = false;

function compEligibleCount(): number {
  return compCandidates.reduce((n, c) => n + (c.eligible ? 1 : 0), 0);
}

function compRows(): TreeRow[] {
  return compCandidates.map((n) =>
    n.eligible
      ? { id: n.id, name: n.name, type: n.type, depth: n.depth, parentId: n.parentId, change: '컴포넌트', replace: false }
      : { id: n.id, name: n.name, type: n.type, depth: n.depth, parentId: n.parentId },
  );
}

function renderCompTree(): void {
  const has = compCandidates.length > 0;
  ($('compTreeCtrls') as HTMLElement).style.display = has ? '' : 'none';
  renderSelectableTree($('compTree'), compRows(), compChecked, {
    hideContext: compHideContext,
    onChange: updateCompRegister,
  });
  updateCompRegister();
}

/** 등록 버튼 라벨/상태 + 전체선택 마스터 동기화. */
function updateCompRegister(): void {
  const total = compEligibleCount();
  const sel = compChecked.size;
  if (compCandidates.length) {
    const all = $('compAll') as HTMLInputElement;
    all.checked = sel === total && total > 0;
    all.indeterminate = sel > 0 && sel < total;
    setStatus('componentStatus', total === 0 ? '등록 가능한 프레임이 없습니다.' : `등록 후보 ${total}개 · ${sel}개 선택`, '');
  }
}

function clearCompPreview(): void {
  compCandidates = [];
  compChecked.clear();
  $('compTree').innerHTML = '';
  ($('compTreeCtrls') as HTMLElement).style.display = 'none';
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

/* ---------- 명도 대비 점검 결과 렌더 ---------- */
const CONTRAST_SKIP_LABELS: Record<string, string> = {
  'no-fill': '단색 글자색 없음',
  'no-bg': '배경 없음',
  capped: '스캔 상한 도달',
};
function contrastSkipText(skipped: Record<string, number>): string {
  return Object.entries(skipped)
    .filter(([, n]) => n > 0)
    .map(([k, n]) => `${CONTRAST_SKIP_LABELS[k] ?? k} ${n}`)
    .join(' · ');
}

/** #2: 보정 적용 버튼(색 미리보기 + 라벨). 클릭 → 해당 노드 채움 교체 + ‘다시 검사’ 안내. */
function contrastFixBtn(label: string, hex: string, nodeId: string): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.className = 'fixbtn';
  btn.title = `${label} 색을 ${hex}로 보정`;
  const sw = document.createElement('span');
  sw.className = 'swatch';
  sw.style.background = hex;
  btn.appendChild(sw);
  btn.appendChild(document.createTextNode(` ${label}`));
  btn.addEventListener('click', () => {
    send({ type: 'APPLY_CONTRAST_FIX', nodeId, hex });
    btn.disabled = true;
    btn.textContent = '✓ 적용';
    setStatus('contrastStatus', '보정 적용됨 — ‘대비 검사’로 다시 확인하세요.', 'ok');
  });
  return btn;
}

function renderContrast(msg: Extract<CodeToUi, { type: 'CONTRAST_RESULT' }>): void {
  const box = $('contrastList');
  box.innerHTML = '';
  const fails = msg.findings.filter((f) => !f.pass); // 실패 건만 나열(조치 대상)
  for (const f of fails) {
    const row = document.createElement('div');
    row.className = 'cfind';

    const pair = document.createElement('span');
    pair.className = 'cpair';
    for (const hex of [f.bg, f.fg]) {
      const sw = document.createElement('span');
      sw.className = 'swatch';
      sw.style.background = hex;
      pair.appendChild(sw);
    }
    row.appendChild(pair);

    const name = document.createElement('span');
    name.className = 'cname';
    name.textContent = `${f.name}${f.large ? ' · 큰글자' : ''}`;
    row.appendChild(name);

    const ratio = document.createElement('span');
    ratio.className = 'ratio warn';
    ratio.textContent = `${f.ratio} / ${f.required}`;
    row.appendChild(ratio);

    // #2: 보정 제안 — 텍스트색(기본)·배경색(옵션). 클릭 시 해당 노드에 적용.
    if (f.suggestedFg || f.suggestedBg) {
      const fix = document.createElement('span');
      fix.className = 'cfix';
      if (f.suggestedFg) fix.appendChild(contrastFixBtn('텍스트', f.suggestedFg, f.id));
      if (f.suggestedBg && f.bgId) fix.appendChild(contrastFixBtn('배경', f.suggestedBg, f.bgId));
      row.appendChild(fix);
    }

    box.appendChild(row);
  }
  const skip = contrastSkipText(msg.skipped);
  const skipNote = skip ? ` · 건너뜀: ${skip}` : '';
  if (msg.checked === 0) {
    setStatus('contrastStatus', `검사할 텍스트가 없습니다.${skip ? ` (건너뜀: ${skip})` : ' 텍스트가 있는 프레임을 선택하세요.'}`, 'warn');
  } else if (fails.length === 0) {
    setStatus('contrastStatus', `${msg.checked}개 모두 ${msg.level} 통과 ✓${skipNote}`, 'ok');
  } else {
    setStatus('contrastStatus', `${msg.checked}개 중 ${fails.length}개 ${msg.level} 미달${skipNote}`, 'warn');
  }
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

// 초기: 컬렉션·전제·라이선스 조회. 팀 카드는 Team 확인 전까지, 전제 카드는 변수 생성 전까지 잠금.
updateGates();
renderTokens(); // UX4: 시작 시 빈 상태 안내 표시
send({ type: 'GET_COLLECTIONS' });
send({ type: 'GET_PREREQ' }); // #11: 단계 전제 상태
send({ type: 'GET_LICENSE' });

// #11: 전제 안내의 ‘토큰 생성으로’ 바로가기.
document.querySelectorAll<HTMLButtonElement>('[data-goto="create"]').forEach((b) => b.addEventListener('click', goToCreate));

/* ---------- 탭 내비게이션 (UI 개편 + UX8 키보드) ---------- */
const TABS = ['wizard', 'tokens', 'apply', 'settings'] as const;
function showTab(name: (typeof TABS)[number]): void {
  for (const t of TABS) {
    $(`tab-${t}`).classList.toggle('active', t === name);
    const btn = $(`tabbtn-${t}`);
    const on = t === name;
    btn.classList.toggle('active', on);
    btn.setAttribute('aria-selected', String(on));
    btn.tabIndex = on ? 0 : -1; // UX8: roving tabindex — 탭 묶음은 한 번의 Tab 정지점
  }
  // UX5 상태 카드는 ‘관리’ 탭에선 숨김(목업 기준 — 만들기·적용에서만 노출).
  $('selBarWrap').style.display = name === 'settings' ? 'none' : '';
  if (name !== 'settings') send({ type: 'GET_PREREQ' }); // #11: 전제 상태 최신화(외부 변경 대비)
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
showTab('wizard'); // #4: 첫 화면은 ‘시작’(시스템화 마법사)

/* ---------- #14: 창 리사이즈(우하단 핸들 드래그) ---------- */
(() => {
  const handle = $('resizeHandle');
  let resizing = false;
  let pending: { w: number; h: number } | null = null;
  let raf = 0;
  const flush = (commit: boolean): void => {
    if (!pending) return;
    send({ type: 'RESIZE', width: pending.w, height: pending.h, commit });
    pending = null;
  };
  handle.addEventListener('pointerdown', (e) => {
    resizing = true;
    handle.setPointerCapture((e as PointerEvent).pointerId);
    e.preventDefault();
  });
  handle.addEventListener('pointermove', (e) => {
    if (!resizing) return;
    const pe = e as PointerEvent;
    pending = { w: Math.ceil(pe.clientX + 6), h: Math.ceil(pe.clientY + 6) };
    if (!raf) raf = requestAnimationFrame(() => { raf = 0; flush(false); }); // rAF 스로틀
  });
  const end = (e: Event): void => {
    if (!resizing) return;
    resizing = false;
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    flush(true); // 드롭 시 최종 크기 저장
    try { handle.releasePointerCapture((e as PointerEvent).pointerId); } catch { /* 무시 */ }
  };
  handle.addEventListener('pointerup', end);
  handle.addEventListener('pointercancel', end);
})();
