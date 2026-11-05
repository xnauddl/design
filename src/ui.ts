/* ============================================================
   ui.ts — iframe UI 로직 (postMessage 송수신, 폼 상태)
   ============================================================ */
import type { UiToCode, CodeToUi, RenameNode, BindCandidate, BindNode, BindSkip, ComponentCandidate, VarUpdateError } from './shared/messages';
import { type DraftToken, type Unit, tidyNumberTokens } from './lib/tokens';
import { t, hasString } from './lib/i18n';
import { isHexColor } from './lib/bindDisplay';
import { groupByVariable, placeKey, carryChecks, fieldIcon, bindExamples, type VarGroup, type PlaceLine } from './lib/bindGroups';
import { type TextStyleSpec, rampToSpecs } from './lib/textStyles';
import { type Tier } from './lib/entitlements';
import { extractSignedToken, pickInstanceId, type VerifyResult } from './lib/license';
import { base64UrlToString, verifyLicenseToken } from './lib/licenseToken';
import { VERIFY_URL, PLUGIN_ID, LICENSE_ISS, LICENSE_AUD, LICENSE_ALG, LICENSE_PUBLIC_JWK, licenseLinksConfigured, licenseVerifyConfigured } from './lib/licenseConfig';
import { exportHasTokens, cssVarName, type ExportFormat } from './lib/exporters';
import { leafName, cellCopyText, tierBadge, groupKey, matchesQuery, indirectUsage, aliasTargetsOf, sidebarCollections, rightEntries, initialSideSel, validSideSel, inspectCount, sideSelKey, normalizeVarName, nameError, groupMove, cssRename, sameCell, colorText, parseColorInput, parseNumberInput, cellInputText, resolveEditValue, aliasCandidates, type SideSel, type SideCollection, type VarCell, type VarCollection, type VarRow, type LibraryVar, type RowState, type EditValue } from './lib/varTable';
import { createReentryScheduler } from './lib/reread';
import type { FrameMeta } from './lib/similar';
import type { VarInfo, CollectionRoleInfo } from './shared/messages';
import { generatePalette, paletteToDraftTokens, paletteSemanticMap, suggestSemanticMap, type Harmony } from './lib/palette';
import { nameColorsByHue } from './lib/colorName';
import { suggestTokenRoles, mergeTokenRoles, semanticMapToText, textToSemanticMap } from './lib/roles';
import { pipelineSteps, type PipelineStep } from './lib/pipeline';
import { explainError, type FriendlyError } from './lib/errors';
import { nextTabIndex } from './lib/a11y';
import { planWizard, summarize, pickDarkTarget, type WizardOptions, type WizardContext, type WizardTotals, type WizardStepId, type WizardPlanItem } from './lib/wizard';

let lastSentMsg: UiToCode | null = null; // UX7: '다시 시도' 대상(취소는 제외)
function send(msg: UiToCode): void {
  // 고치기 저장은 '다시 시도'로 다시 보내지 않는다(옛 base로 다시 보내면 안 된다 — 팝업 안에서 다룬다).
  if (msg.type !== 'CANCEL' && msg.type !== 'UPDATE_VARIABLE') lastSentMsg = msg;
  opSent(msg); // 최소화 진행 테두리(§4.9) — 사용자가 일으킨 작업만 센다
  parent.postMessage({ pluginMessage: msg }, '*');
}

const HEX6 = /^#[0-9a-fA-F]{6}$/;

const $ = <T extends HTMLElement = HTMLElement>(id: string): T =>
  document.getElementById(id) as T;

function readMaxDepth(): number {
  // 빈 칸은 '0'이 아니라 '아직 안 정함' — Number('')=0을 그대로 받으면 깊이 1이 파일에 굳어
  // 이후 모든 세션이 맥락 없는 이름(`button`)을 만든다(설정은 바뀔 때마다 저장된다).
  const raw = ($('depth') as HTMLInputElement).value.trim();
  const value = Number(raw);
  return raw && Number.isFinite(value) ? Math.max(1, Math.round(value)) : 8;
}

let tokens: DraftToken[] = [];
let isPaid = false; // Free/Paid 2티어 — 유료면 모든 유료 기능 해금
let colorsFromPalette = false; // 지금 목록의 색이 팔레트 생성으로 온 것인가(변수 생성 시 이전 팔레트 정리)
let colorsCreated = false; // 이 세션에서 색 변수를 만들었는가(토큰 단계 안내용)
// #11: 단계 전제 — Global 변수 존재(역할 매핑) · 연결 가능 변수 존재(변수 연결) · 텍스트 스타일 존재(기존만 연결).
// 색/색 외/다크는 게이트가 아니라 '준비 현황' 목록에만 쓴다(만들기 탭의 할 일).
let hasColorVars = false;
let hasScaleVars = false;
let hasGlobal = false;
let hasBindable = false;
/** 로컬 변수 수(계층 있음 + 없음) — 연결할 변수가 없을 때 안내 4행(§4.6)을 가른다. */
let prereqLocalVars = 0;
/** 첫 PREREQ_STATE를 받았는가 — 받기 전엔 전제를 '모름'으로 보고 경고를 띄우지 않는다. */
let prereqKnown = false;
/** GET_PREREQ 응답 대기 중 — 시작 직후 같은 요청이 여러 번 겹쳐 나가지 않게. */
let prereqInFlight = false;
function requestPrereq(): void {
  if (prereqInFlight) return;
  prereqInFlight = true;
  send({ type: 'GET_PREREQ' });
  // 응답이 끝내 안 오면(플러그인 쪽 오류) 다음 요청이 영영 막히지 않게 풀어 둔다.
  setTimeout(() => { prereqInFlight = false; }, 3000);
}
let hasDarkMode = false;
let hasTextStyles = false;
let hasSemanticRoles = false; // 역할 별칭 존재(역할 매핑 완료)
let hasBoundNodes = false; // 현재 선택에 변수 붙은 레이어 존재(변수 연결 완료)
let hasRenamedNodes = false; // 현재 선택에 이름 정리된 레이어 존재(이름 정리 완료)
let lastSelCount = 0; // UX5: 마지막으로 받은 선택 수(빈 상태 문구 분기에 사용)
let createFrom: 'colors' | 'tokens' = 'tokens'; // 마지막 CREATE_TOKENS 호출 출처(결과 상태 라우팅)

/**
 * 2.5 시맨틱 카드는 자동 흡수라 늘 숨김(data-always-hidden) — 그 안의 #semStatus에 쓴 글은
 * 화면에 뜨지 않는다. 시맨틱은 색·토큰 카드가 자동으로 부르므로, 결과·오류·유료 안내는
 * 그 실행을 부른 카드의 상태 줄로 돌린다.
 */
let semStatusTarget = 'colorStatus';
/** 그 카드가 이미 띄운 요약 — 시맨틱 결과가 덮어쓰지 않고 뒤에 이어 붙게 한다. */
let semStatusPrefix = '';
/**
 * SELECT_NODES를 부른 자리의 상태 줄. 레이어 선택은 적용 탭의 스킵 칩만 쓰던 기능이라
 * 결과를 #applyStatus에 고정으로 썼는데, 타이포 단계의 ×N 배지도 같은 메시지를 쓰면서
 * ‘상한 200개에 잘렸다’는 경고가 다른 탭에 적혀 사용자에게 닿지 않는다 — 부른 쪽이 지정한다.
 */
let selectStatusTarget = 'applyStatus';
/** 레이어 선택 요청 — 결과 경고가 돌아올 자리를 함께 기억한다. */
function selectNodes(ids: string[], statusId: string): void {
  selectStatusTarget = statusId;
  if (statusId === 'applyStatus' && activeTab === 'layer') bindLayerSelectPending = true; // 사유 칩·레이어 머리
  send({ type: 'SELECT_NODES', ids });
}
/** #semStatus로 향하는 상태 쓰기를 화면에 있는 카드로 옮긴다(그 외 id는 그대로). */
function resolveStatusId(id: string): string {
  return id === 'semStatus' ? semStatusTarget : id;
}

/* ---------- 토큰 목록 렌더 ---------- */
/* ---------- 점진(청크) 렌더 — 대량 목록을 프레임 단위로 나눠 비차단 렌더(§4) ----------
   소량(≤CHUNK)은 즉시 동기 렌더(기존 동작), 대량은 requestAnimationFrame으로 청크 추가.
   같은 mount를 다시 렌더하면 진행 중 청크를 취소(선택 변경·토글 시 잔상 방지). */
const CHUNK = 150;
const chunkPending = new WeakMap<HTMLElement, number>();
function renderChunked<T>(
  mount: HTMLElement,
  items: T[],
  makeRow: (item: T, i: number) => Node,
  onDone?: () => void, // 전체 행이 붙은 뒤 실행(높이 측정처럼 렌더 완료가 전제인 후처리)
): void {
  const prev = chunkPending.get(mount);
  if (prev !== undefined) {
    cancelAnimationFrame(prev);
    chunkPending.delete(mount);
  }
  mount.innerHTML = '';
  if (items.length <= CHUNK) {
    const frag = document.createDocumentFragment();
    items.forEach((it, i) => frag.appendChild(makeRow(it, i)));
    mount.appendChild(frag);
    onDone?.();
    return;
  }
  let i = 0;
  const step = (): void => {
    const frag = document.createDocumentFragment();
    const end = Math.min(i + CHUNK, items.length);
    for (; i < end; i++) frag.appendChild(makeRow(items[i], i));
    mount.appendChild(frag);
    if (i < items.length) chunkPending.set(mount, requestAnimationFrame(step));
    else {
      chunkPending.delete(mount);
      onDone?.();
    }
  };
  chunkPending.set(mount, requestAnimationFrame(step));
}

/**
 * 목록 마운트를 비운다 — **진행 중인 청크를 먼저 취소**한다.
 *
 * `innerHTML = ''`만 하면 rAF에 예약된 다음 청크가 그대로 살아나 이미 무효가 된 행을 계속
 * 붙인다(2000노드 미리보기 중 선택을 바꾸면 안내 문구 아래로 수천 행이 다시 쌓였다).
 */
function clearMount(mount: HTMLElement): void {
  const prev = chunkPending.get(mount);
  if (prev !== undefined) {
    cancelAnimationFrame(prev);
    chunkPending.delete(mount);
  }
  mount.innerHTML = '';
}

/* ---------- #18: 결과 행 = 얇은 카드 ----------
   목록마다 제각각이던 행 문법을 하나로 모은다. 열은 [체크 | 본문(제목·요약) | 메타] 셋뿐이고,
   제목·메타는 문자열 대신 요소를 넘길 수 있다(이름 입력칸·역할 입력칸처럼 편집이 필요한 자리). */
interface ResultCardSpec {
  /** 왼쪽 체크박스/라디오. 없으면 체크 열을 접는다. */
  check?: HTMLElement;
  title: string | HTMLElement;
  titleMono?: boolean;
  summary?: string;
  summaryMono?: boolean;
  /** 오른쪽 끝 메타(개수·상태). 요소가 필요하면 metaEl. */
  meta?: string;
  metaTitle?: string;
  metaEl?: HTMLElement;
  /** 흐리게 — 대상이 아니거나(스킵·잠금) 근거가 약한 행(1×). */
  dim?: boolean;
}

function resultCard(spec: ResultCardSpec): HTMLElement {
  const card = document.createElement('div');
  card.className = spec.dim ? 'r-card dim' : 'r-card';

  const top = document.createElement('div');
  top.className = spec.check ? 'r-top' : 'r-top no-check';
  if (spec.check) top.appendChild(spec.check);

  const main = document.createElement('div');
  main.className = 'r-main';
  const title = document.createElement('div');
  title.className = spec.titleMono ? 'r-title mono' : 'r-title';
  if (typeof spec.title === 'string') {
    title.textContent = spec.title;
    title.title = spec.title; // 한 줄 말줄임 — 잘린 부분은 툴팁으로 읽는다
  } else {
    title.appendChild(spec.title);
  }
  main.appendChild(title);
  if (spec.summary) {
    const sum = document.createElement('div');
    sum.className = spec.summaryMono ? 'r-sum mono' : 'r-sum';
    sum.textContent = spec.summary;
    sum.title = spec.summary;
    main.appendChild(sum);
  }
  top.appendChild(main);

  if (spec.metaEl) top.appendChild(spec.metaEl);
  else if (spec.meta) {
    const meta = document.createElement('span');
    meta.className = 'r-meta';
    meta.textContent = spec.meta;
    if (spec.metaTitle) meta.title = spec.metaTitle;
    top.appendChild(meta);
  }

  card.appendChild(top);
  return card;
}

/** 색 스와치를 제목 앞에 끼운다 — 목록에서 무슨 색인지 눈으로 먼저 찾는다. */
function addSwatch(card: HTMLElement, hex: string): void {
  const title = card.querySelector('.r-title') as HTMLElement;
  const sw = document.createElement('span');
  sw.className = 'r-swatch';
  sw.style.background = hex;
  title.prepend(sw);
  title.classList.add('has-swatch');
}

/** 목록의 그룹 머리(트리 루트·리포트 구분줄) — 카드가 아니라 라벨이다. */
function resultGroup(label: string): HTMLElement {
  const el = document.createElement('div');
  el.className = 'r-group';
  el.textContent = label;
  el.title = label;
  return el;
}

/** 타입 칩 안의 단위 표기 — 칩이 88px 고정 폭이라 낱말 대신 기호로 줄인다
    (`letterSpacing·percent` 106px → `letterSpacing·%` 81px). 온전한 표기는 칩 title에 남는다.
    추출이 실제로 만드는 비-px 단위는 percent뿐이고(lineHeight·letterSpacing), 나머지는 대비용. */
const UNIT_CHIP: Record<Unit, string> = { px: 'px', percent: '%', em: 'em', rem: 'rem', ratio: '×' };

/* ---------- 생성 대상 선택 ----------
   바인딩 카드가 후보를 골라 적용하듯(bindChecked), 토큰도 골라서 만든다. 색 토큰은 위 ‘색 정리’
   표가 담당하므로 이 선택의 대상이 아니다 — 항상 생성에 포함된다. */
const tokenChecked = new Set<string>();

/** 체크 키 — 이름은 편집 대상이라 값으로 식별한다(추출의 dedup 키와 같은 규칙). */
function tokenKey(t: DraftToken): string {
  return `${t.category}|${t.value}|${t.unit ?? ''}`;
}

/** 이 카드가 고르는 대상(색 외 토큰). */
function creatableTokens(): DraftToken[] {
  return tokens.filter((t) => t.category !== 'color');
}

/** 토큰 집합이 바뀌면 전체 선택으로 초기화(새 추출·팔레트 생성). */
function resetTokenChecked(): void {
  tokenChecked.clear();
  for (const t of creatableTokens()) tokenChecked.add(tokenKey(t));
}

/** 실제로 생성할 토큰 — 색은 전부, 색 외는 체크한 것만. */
/** '토큰' 단계가 만들 것 — 체크된 색 외 토큰만. 색은 '색' 단계의 「색 변수 만들기」가 맡는다. */
function tokensToCreate(): DraftToken[] {
  return creatableTokens().filter((t) => tokenChecked.has(tokenKey(t)));
}

/**
 * 값이 바뀌는 변환(사다리 정리·되돌리기) 앞뒤로 체크 상태를 옮긴다.
 * 키가 값 기반이라 스냅하면 옛 키가 사라진다 — 전체 재선택을 하면 사용자의 '1× 해제'가
 * 되살아나고, 아무것도 안 하면 전부 풀린다. 그래서 **이름**으로 짝을 맞춰 이월한다
 * (스냅은 자동 이름만 갱신하고 개명은 보존하므로 이름이 가장 안정적인 축이다).
 */
function carryTokenChecked(before: readonly DraftToken[], after: readonly DraftToken[]): void {
  const checkedNames = new Set(before.filter((t) => tokenChecked.has(tokenKey(t))).map((t) => t.name));
  // 값이 바뀌면 자동 이름도 바뀌므로, 이름이 안 맞는 건 '체크였던 것끼리 합쳐졌다'고 보고 살린다.
  const beforeNames = new Set(before.map((t) => t.name));
  tokenChecked.clear();
  for (const t of after) {
    if (t.category === 'color') continue;
    if (checkedNames.has(t.name) || !beforeNames.has(t.name)) tokenChecked.add(tokenKey(t));
  }
}

/**
 * 토큰 1행(스와치·이름 입력·타입 칩).
 * 이름 편집은 넘겨받은 토큰 객체를 그대로 고친다 — 목록은 `tokens`를 필터한 배열이라
 * 행 인덱스가 `tokens` 인덱스와 어긋난다(색 토큰이 앞에 있으면 남의 이름을 덮어썼다).
 */
function makeTokenRow(tok: DraftToken): HTMLElement {
  const n = tok.count ?? 0;
  const unit = tok.unit && tok.unit !== 'px' ? ` · ${UNIT_CHIP[tok.unit]}` : '';

  // 이름은 편집 대상이라 제목 자리에 입력칸을 그대로 둔다(말줄임을 못 쓰므로 전체는 title로).
  const input = document.createElement('input');
  input.value = tok.name;
  input.title = tok.name;
  input.addEventListener('input', () => {
    tok.name = input.value;
    input.title = input.value;
  });

  // 체크한 토큰만 생성한다. 키는 이름이 아니라 값(category|value|unit) — 이름은 편집 대상이라
  // 개명하는 순간 체크가 풀린다.
  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.checked = tokenChecked.has(tokenKey(tok));
  cb.title = t('create.rowCheckTip');
  cb.addEventListener('change', () => {
    if (cb.checked) tokenChecked.add(tokenKey(tok));
    else tokenChecked.delete(tokenKey(tok));
    updateTokenCreate();
  });

  const card = resultCard({
    check: cb,
    title: input,
    titleMono: true,
    // 값·타입까지 붙여 이름만으로 구분 안 되는 토큰(fontFamily 등)을 요약에서 바로 읽는다.
    summary: `${tok.category}${unit} · ${tok.value}`,
    // 등장 레이어 수 — 무엇을 남길지 고르는 근거. 1×는 대개 일회성 값이라 흐리게.
    meta: n > 0 ? `${n}×` : '',
    metaTitle: n > 0 ? t('create.rowCountTip', { count: n }) : '',
    dim: n === 1,
  });
  // 색 토큰은 renderTokens가 걸러내 여기 오지 않는다(색은 위 ‘색 정리’ 담당) → effectColor만.
  if (tok.category === 'effectColor' && typeof tok.value === 'string') addSwatch(card, tok.value);
  return card;
}

/** 공통 빈 상태 — 가운데 굵은 헤드라인 + 안내 + (선택) 비활성 버튼. 캐논 108:2 패턴. */
function renderEmptyState(box: HTMLElement, title: string, guide: string, actionLabel?: string): void {
  clearMount(box); // 진행 중이던 청크가 안내 문구 아래로 계속 쌓이지 않게
  const wrap = document.createElement('div');
  wrap.className = 'empty-state';
  const t = document.createElement('div');
  t.className = 'es-title';
  t.textContent = title;
  const g = document.createElement('div');
  g.className = 'es-guide';
  g.textContent = guide;
  wrap.append(t, g);
  if (actionLabel) {
    const btn = document.createElement('button');
    btn.textContent = actionLabel;
    btn.disabled = true;
    wrap.appendChild(btn);
  }
  box.appendChild(wrap);
}

// 버튼 역할 분리: ‘선택에서 토큰 추출’은 색만(colorRevealed), ‘미리보기’는 색 외 토큰만
// (previewRevealed) 노출. 추출은 색·색 외를 한 번에 읽는 단일 동작이라, 어느 버튼을
// 먼저 눌러도 추출이 실행되고(자동 추출) 각자 자기 영역만 펼친다.
let colorRevealed = false;
let previewRevealed = false;
let pendingCreatePreview = false; // ‘미리보기’가 추출을 유발했을 때, 추출 후 생성 미리보기 전송
/* #18: 결과 목록은 흐름 레이아웃 — 목록마다 max-height 스크롤 박스를 두지 않고 패널 body가
   스크롤한다. 상한이 없으니 '행 높이 정수배로 스냅 · 남은 개수 · 모두 펼치기' 기계장치도
   함께 걷었다(반쪽 행은 상한이 만들던 문제였다). 대량 목록의 청크 렌더(renderChunked)는
   렌더 비용을 나누는 별개 장치라 그대로 둔다. */

// ‘토큰 생성’ 카드의 목록 — 색 외 토큰(간격·크기·폰트·효과)만.
function renderTokens(): void {
  const box = $('tokenList');
  const others = creatableTokens();
  const showHint = (msg: string): void => {
    clearMount(box); // 진행 중이던 청크가 안내 문구 아래로 계속 쌓이지 않게
    ($('tokenCtrls') as HTMLElement).style.display = 'none';
    const hint = document.createElement('div');
    hint.className = 'hint';
    hint.textContent = msg;
    box.appendChild(hint);
    updateTokenCreate();
  };
  if (!tokens.length) {
    showHint(t(lastSelCount > 0 ? 'create.hintPreview' : 'create.hintNoSel'));
    return;
  }
  if (!previewRevealed) {
    showHint(t('create.hintReveal'));
    return;
  }
  // 와이어: 색은 이전 단계에서 이미 변수화됐다는 사실을 이 단계 첫 줄로 알린다.
  const colorN = tokens.length - others.length;
  const banner = $('tokenColorNote');
  banner.style.display = colorsCreated && colorN ? '' : 'none';
  if (colorsCreated && colorN) banner.textContent = t('create.colorsDone', { count: colorN });
  if (!others.length) {
    showHint(t('create.onlyColors'));
    return;
  }
  ($('tokenCtrls') as HTMLElement).style.display = '';
  renderChunked(box, others, makeTokenRow); // §4: 대량 추출도 비차단
  updateTokenCreate();
}

/**
 * 선택 수 반영 — 카드 제목 개수·전체선택 마스터·버튼 활성. 바인딩 카드의 updateBindApply와 같은 역할.
 * 목록이 렌더되기 전(빈 상태)에도 불리므로 DOM 존재만 가정한다.
 */
function updateTokenCreate(): void {
  const others = creatableTokens();
  const sel = others.filter((t) => tokenChecked.has(tokenKey(t))).length;
  $('createCount').textContent = others.length ? t('create.count', { sel, total: others.length }) : '';
  const all = $('tokenAll') as HTMLInputElement;
  all.checked = sel === others.length && others.length > 0;
  all.indeterminate = sel > 0 && sel < others.length;
  // 색만 추출된 경우엔 색 토큰만으로도 생성할 게 있으므로 잠그지 않는다.
  // 두 버튼은 PAID_FIELDS라 유료 잠금이 우선 — 여기서 무조건 false를 쓰면 Free 티어의 잠금이 풀려
  // 클릭-후-거부(PREMIUM_REQUIRED) 막다른 길이 된다. 잠금은 더하기만 하고 풀지는 않는다.
  const nothing = others.length > 0 && sel === 0 && !tokens.some((t) => t.category === 'color');
  for (const id of ['btnCreate', 'btnCreateApply']) {
    const el = $(id) as HTMLButtonElement;
    el.disabled = nothing || !isPaid;
  }
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
// 보조색도 같은 피커 ↔ HEX 쌍(와이어 시드 둘째 줄). 피커만 두면 브랜드 가이드에 적힌
// 코드를 그대로 넣을 방법이 없다 — 주색과 같은 입력 수단을 준다.
const brand2Color = $('brand2') as HTMLInputElement;
const brand2Hex = $('brand2Hex') as HTMLInputElement;
brand2Color.addEventListener('input', () => {
  brand2Hex.value = brand2Color.value;
});
brand2Hex.addEventListener('input', () => {
  if (HEX6.test(brand2Hex.value)) brand2Color.value = brand2Hex.value.toLowerCase();
});

$('btnPalette').addEventListener('click', () => {
  const primary = brandHex.value.trim();
  if (!HEX6.test(primary)) {
    setStatus('colorStatus', t('palette.invalidHex'), 'warn');
    return;
  }
  // 보조색 체크박스가 보조색 + 하모니 사용 여부를 함께 결정(미체크 시 둘 다 미적용).
  const useSecondary = ($('useBrand2') as HTMLInputElement).checked;
  const secondary = brand2Hex.value.trim();
  // 텍스트로 받는 값이니 주색과 같은 검사를 거친다(피커만 있을 땐 늘 유효했다).
  if (useSecondary && !HEX6.test(secondary)) {
    setStatus('colorStatus', t('palette.invalidHex2'), 'warn');
    return;
  }
  const harmonyVal = ($('harmony') as HTMLSelectElement).value as Harmony;
  const p = generatePalette({
    brand: { primary, secondary: useSecondary ? secondary : undefined },
    harmony: useSecondary ? harmonyVal : undefined,
    includeNeutral: ($('incNeutral') as HTMLInputElement).checked,
    includeStatus: ($('incStatus') as HTMLInputElement).checked,
  });
  tokens = paletteToDraftTokens(p);
  colorsFromPalette = true; // 이 색들은 시드에서 나왔다 → 변수 생성 시 이전 팔레트 색 정리
  colorsCreated = false;
  resetTokenChecked();
  clearNumTidy();
  colorRevealed = true; // 팔레트 생성 = 색 노출
  previewRevealed = false; // 색 외 토큰 목록은 ‘미리보기’ 클릭 시
  renderTokens();
  // 시맨틱 매핑 textarea를 추천값으로 채움(편집 가능). #3: 역할 → hue Global(정확).
  setSemMapText(paletteSemanticMap(p));
  renderColorTable(); // #3: 색 편집표(hue·역할) 표시
  $('paletteInfo').textContent = t('palette.summary', { count: p.scales.length, tokens: tokens.length });
  // 경고가 있을 때만 상태 줄을 쓴다 — 없으면 바로 위 renderColorTable이 채운 요약
  // (`색 N개 · 역할 지정 M · 변수화 대기`)이 서 있어야 한다. 색 카드의 상태 줄은 하나다.
  // 이 줄은 없어진 `paletteStatus`를 가리켜 팔레트를 만들 때마다 예외를 던졌고, 그래서
  // '브랜드색 채도가 낮다' 같은 경고가 한 번도 화면에 닿지 못했다.
  if (p.warnings.length) setStatus('colorStatus', p.warnings.join(' '), 'warn');
});

/** 시맨틱 매핑 textarea를 `역할 = 변수명` 줄로 채움(textToSemanticMap의 역방향). */
function setSemMapText(map: Record<string, string>): void {
  ($('semMap') as HTMLTextAreaElement).value = semanticMapToText(map);
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
    // 그림자 색(effectColor)도 같은 `color/` 이름 공간이다 — 빼면 `color/000000`이 hex 이름으로 남는다.
    if ((t.category === 'color' || t.category === 'effectColor') && typeof t.value === 'string') {
      idx.push(i);
      hexes.push(t.value);
    }
  });
  if (!idx.length) return;
  // 같은 hex는 같은 이름 — 채움색과 그림자색이 둘 다 #000000이면 `gray/950`·`gray/950-2` 두 변수가
  // 아니라 한 변수(스코프 합집합)가 돼야 한다. 고유 hex만 이름 짓고 되돌려 붙인다.
  const uniq = [...new Set(hexes.map((h) => h.toLowerCase()))];
  const names = nameColorsByHue(uniq);
  const nameOf = new Map(uniq.map((h, i) => [h, names[i]]));
  idx.forEach((ti, k) => {
    toks[ti].name = nameOf.get(hexes[k].toLowerCase()) ?? toks[ti].name;
  });
}

/* ---------- #3 색 편집표 (hue → 역할) ---------- */
/** 색에 붙일 수 있는 Semantic 역할 — 순서는 화면 표시 순서 그대로. */
// property-first 어휘(Atlassian `color.background.brand` · Lightning `$color-text-default`).
// property(background/text/border/icon)가 곧 Figma 스코프라 역할을 고르면 스코프가 따라온다.
const COLOR_ROLES = [
  'color/background/default', 'color/background/subtle', 'color/background/inverse',
  'color/background/brand', 'color/background/brand-bold', 'color/background/brand-subtle', 'color/background/accent',
  'color/background/success', 'color/background/warning', 'color/background/danger', 'color/background/info',
  'color/text/default', 'color/text/subtle', 'color/text/inverse', 'color/text/brand',
  'color/text/success', 'color/text/warning', 'color/text/danger', 'color/text/info',
  'color/border/default', 'color/border/bold', 'color/border/brand', 'color/border/danger',
  'color/icon/default', 'color/icon/subtle', 'color/icon/brand',
] as const;

/**
 * 역할 드롭다운(와이어: `주색 · primary ▾`). 자유 입력이던 것을 목록으로 바꾼 이유는
 * 오타 하나가 그대로 Semantic 변수 이름이 되기 때문 — 어휘는 여기서 닫는다.
 */
function roleSelect(value: string): HTMLSelectElement {
  const sel = document.createElement('select');
  sel.className = 'r-role';
  const none = document.createElement('option');
  none.value = '';
  none.textContent = t('role.none');
  sel.appendChild(none);
  for (const r of COLOR_ROLES) {
    const o = document.createElement('option');
    o.value = r;
    o.textContent = `${t(`role.${r.replace(/^color\//, '').replace(/\//g, '-')}`)} · ${r}`;
    sel.appendChild(o);
  }
  // 추천이 어휘 밖 역할을 주면(옛 매핑 등) 그 값도 고를 수 있게 남긴다 — 조용히 지우지 않는다.
  if (value && !COLOR_ROLES.includes(value as (typeof COLOR_ROLES)[number])) {
    const o = document.createElement('option');
    o.value = value;
    o.textContent = value;
    sel.appendChild(o);
  }
  sel.value = value;
  return sel;
}

/** 색 토큰을 표로: 스와치 · hue 이름 · 역할 입력(현 semMap에서 prefill). */
function renderColorTable(): void {
  const card = $('colorSection');
  const colors = tokens.filter((t) => t.category === 'color' && typeof t.value === 'string');
  if (!colorRevealed || !colors.length) {
    card.style.display = 'none'; // 색은 ‘선택에서 토큰 추출’(colorRevealed) 후에만 노출
    // 옛 행을 남겨 두면 다음 추출이 색 0개일 때 테두리·‘총 n개’ 줄이 실제와 어긋난 채 되살아난다.
    $('colorTable').innerHTML = '';
    $('paletteRow').innerHTML = '';
    return;
  }
  card.style.display = '';
  // 개수는 상태줄(color.summary)만 말한다 — 제목 배지는 걷었다(ui.html 주석 참고).
  // 표를 자르던 상한도 이제 없어서, 제목이 '보이는 것보다 많다'를 알릴 이유 자체가 사라졌다.
  // 화면에 떠 있는 역할 지정을 먼저 거둔다. 이 드롭다운은 #semMap에 되쓰이지 않고
  // (semMap은 「색 변수 만들기」 때 colorAuthoritativeRoles가 한 번 쓴다) 이 함수가
  // 표를 통째로 다시 그리므로, 여기서 읽어 두지 않으면 되돌리기·재추출 한 번에
  // 사용자가 정한 역할이 전부 ‘없음’으로 조용히 돌아간다.
  const roleByName = new Map<string, string>();
  $('colorTable').querySelectorAll<HTMLSelectElement>('select[data-name]').forEach((sel) => {
    const role = sel.value.trim();
    if (role) roleByName.set(sel.dataset.name as string, role);
  });
  // 화면에 없던 이름은 semMap에서 채운다 — 역할→이름을 이름→역할로 뒤집어 prefill.
  for (const [role, name] of Object.entries(textToSemanticMap(($('semMap') as HTMLTextAreaElement).value))) {
    if (!roleByName.has(name)) roleByName.set(name, role);
  }
  renderPaletteRow(colors);
  renderChunked($('colorTable'), colors, (tok) => {
    const role = roleSelect(roleByName.get(tok.name) ?? '');
    role.dataset.name = tok.name;
    // 값과 쓰임새 — 스와치는 색만 보여 주고 hue 이름은 계열만 말한다. 정확한 hex와
    // ‘몇 군데서 쓰나’가 어느 색에 역할을 줄지 고르는 근거다(와이어 `주색 · 12× 사용`).
    const used = tok.count ? t('color.usedCount', { n: tok.count }) : '';
    const card = resultCard({
      title: tok.name,
      titleMono: true,
      summary: `${tok.value}${used}`,
      summaryMono: true,
      metaEl: role,
    });
    role.addEventListener('change', updateColorSummary);
    addSwatch(card, tok.value as string);
    return card;
  });
  updateColorSummary();
}

/** 모아 놓은 색을 한 줄 스와치로 — 팔레트 한 벌이면 목록이 60행을 넘어 램프가 안 보인다. */
function renderPaletteRow(colors: DraftToken[]): void {
  const row = $('paletteRow');
  row.innerHTML = '';
  for (const c of colors) {
    const i = document.createElement('i');
    i.style.background = c.value as string;
    i.title = `${c.name} · ${c.value}`;
    row.appendChild(i);
  }
}

/** 색 카드 상태 줄 — 몇 개를 모았고 역할을 몇 개 정했는지, 아직 변수로 만들기 전인지(와이어). */
function updateColorSummary(): void {
  const colors = tokens.filter((t) => t.category === 'color');
  if (!colorRevealed || !colors.length) return;
  setStatus('colorStatus', t('color.summary', { count: colors.length, roles: Object.keys(colorRoleMap()).length }), '');
}

/** 색 편집표의 역할 입력 → 시맨틱 매핑 textarea로 반영(역할=이름). */
/** 색 목록의 역할 입력 → `역할 = Global변수이름` 맵. 같은 역할이 겹치면 뒤가 이긴다. */
function colorRoleMap(): Record<string, string> {
  const map: Record<string, string> = {};
  $('colorTable').querySelectorAll<HTMLSelectElement>('select[data-name]').forEach((sel) => {
    const role = sel.value.trim();
    if (role) map[role] = sel.dataset.name as string;
  });
  return map;
}

/**
 * 시맨틱 매핑 = 자동 추천(수치·타이포) + **색 목록이 정한 색 역할**.
 *
 * `{...auto, ...picks}`만 하면 사용자가 지운 역할을 지울 방법이 없다 — 「없음」은 키가 빠지는
 * 것이라 자동 추천값이 그대로 살아남아, 지운 역할의 Semantic 별칭이 만들어지고 표를 다시
 * 그리면 그 역할이 드롭다운에 되살아난다. 색 역할만큼은 표가 유일한 출처다.
 * (수치·크기·타이포 역할은 색 목록이 모르므로 자동 추천을 그대로 둔다.)
 */
function colorAuthoritativeRoles(base: number): Record<string, string> {
  const auto = mergeTokenRoles(tokens, base);
  const picks = colorRoleMap();
  // 표가 아직 안 그려졌으면(색 카드 미노출) 지운 것과 구분할 수 없다 — 예전대로 추천을 남긴다.
  if (!$('colorTable').querySelector('select[data-name]')) return { ...auto, ...picks };
  const colorTokenNames = new Set(tokens.filter((t) => t.category === 'color').map((t) => t.name));
  const nonColor: Record<string, string> = {};
  for (const [role, name] of Object.entries(auto)) if (!colorTokenNames.has(name)) nonColor[role] = name;
  return { ...nonColor, ...picks };
}

/* 색 N:1 자동 병합(tidyColors)은 걷었다 — 합쳐진 색의 hex가 사라져 바인딩이 그 레이어를
   `매칭 없음`으로 남겼다. 이제 이름만 정리하고(huefyTokenColors) 색은 전부 변수가 된다. */


// 보조색 사용 토글 → 보조색·하모니 입력 활성/비활성 동기화.
function syncSecondaryControls(): void {
  const on = ($('useBrand2') as HTMLInputElement).checked;
  brand2Color.disabled = !on;
  brand2Hex.disabled = !on;
  ($('harmony') as HTMLSelectElement).disabled = !on;
}
$('useBrand2').addEventListener('change', syncSecondaryControls);
syncSecondaryControls();

// 팔레트 ‘적용’ — 생성된 팔레트를 변수에 직접 커밋(생성=미리보기 / 적용=커밋).

/* ---------- 버튼 ---------- */
$('btnExtract').addEventListener('click', () => {
  colorRevealed = true; // 추출 버튼 역할: 색 노출
  previewRevealed = false; // 색 외 토큰은 ‘미리보기’ 클릭 시
  send({ type: 'EXTRACT' });
});

/* 스케일 사다리 정리 — #19로 만들기 단계의 입력·버튼을 없앴다. 미리보기를 만들 때 자동으로
   한 번 돌린다: 손으로 그린 13·15 같은 값이 격자로 모여야 토큰 수가 줄고, 그 수치로 바인딩이
   걸린다. 무엇이 옮겨졌는지는 요약 한 줄로 알린다.
   격자 크기는 설정 탭에서만 고친다(허용오차와 한 쌍이라 거기서 같이 본다). */
const TIDY_GRID_DEFAULT = 8;
const TIDY_RATIO = 0.15; // 값 대비 이 비율 안이면 격자로 이동
/** 설정 탭의 격자 값(없거나 이상하면 기본 8). */
function tidyGrid(): number {
  const v = Math.round(Number(($('grid') as HTMLInputElement).value));
  return isFinite(v) && v >= 1 ? v : TIDY_GRID_DEFAULT;
}

/** 격자 스냅 직전의 토큰 스냅샷(되돌리기용). null이면 되돌릴 것 없음. */
let preNumTidyTokens: DraftToken[] | null = null;

/** 요약 줄을 걷는다 — 남겨두면 다른 추출의 토큰에 옛 요약이 붙는다. */
function clearNumTidy(): void {
  $('numTidySummary').style.display = 'none';
  preNumTidyTokens = null; // 요약이 없으면 되돌릴 대상도 없다
}

/** 여백·크기 토큰을 격자 8 사다리로 스냅(#19). 미리보기 직전에 호출. */
function tidyNumbers(): void {
  if (!creatableTokens().length) {
    clearNumTidy();
    return;
  }
  const snapshot = tokens.map((t) => ({ ...t, sources: [...t.sources] }));
  const grid = tidyGrid();
  const r = tidyNumberTokens(tokens, { base: grid, ratio: TIDY_RATIO });
  if (!r.snapped) {
    // 스냅은 멱등이라 「미리보기」를 두 번째로 누르면 옮길 게 없다. 그렇다고 먼저 한
    // 스냅의 되돌리기까지 걷으면 원래 13·15px을 재추출 없이는 못 되찾는다 —
    // 이미 잡아 둔 스냅샷이 있으면 요약 줄과 되돌리기를 그대로 둔다.
    // (새 추출은 EXTRACT_RESULT에서 clearNumTidy로 따로 끊는다.)
    if (!preNumTidyTokens) clearNumTidy();
    return;
  }
  tokens = r.tokens;
  preNumTidyTokens = snapshot; // 격자는 이제 설정 값이라 '정책'이 아니다 — 되돌릴 수 있어야 한다
  // 스냅으로 키(값)가 바뀌므로 체크를 그대로 두면 전부 풀린다. 그렇다고 전체 재선택을 하면
  // 사용자의 '1× 해제'가 조용히 되살아난다 → 정리 전 체크 상태를 새 키로 이월한다.
  carryTokenChecked(snapshot, r.tokens);
  $('numTidySummary').style.display = '';
  // 이동과 병합은 다른 일이라 따로 센다 — 옮겼지만 같은 칸이 아니어서 안 합쳐진 토큰도 있다.
  const mergedPart = r.merged ? t('create.tidyMerged', { n: r.merged }) : '';
  // 격자로 옮긴 값의 변수는 원래 레이어와 값이 달라 연결되지 않는다(§2.11 · §4.5). 실제로 옮긴 게 있을 때만 알린다.
  const gapPart = r.snapped ? t('create.snapNoBind', { k: r.snapped }) : '';
  $('numTidyText').textContent = t('create.tidySummary', { before: r.before, after: r.after, grid, n: r.snapped, mergedPart, gapPart });
}

/** 격자 정리 되돌리기 — 스냅 직전 값으로 복원(색 자동 정리의 되돌리기와 같은 모양). */
function undoNumTidy(): void {
  if (!preNumTidyTokens) return;
  const restored = preNumTidyTokens.map((t) => ({ ...t, sources: [...t.sources] }));
  carryTokenChecked(tokens, restored); // 스냅으로 바뀐 키를 원래 값으로 되돌리며 체크를 이월
  tokens = restored;
  clearNumTidy(); // 요약 줄·스냅샷 정리
  renderTokens();
  ($('btnCreateApply') as HTMLButtonElement).style.display = 'none'; // 집합 변경 → 새 미리보기 필요
  setStatus('createStatus', t('create.tidyUndone'), '');
}
$('btnNumTidyUndo').addEventListener('click', undoNumTidy);

// 전체 선택 / 1× 해제 — 목록이 상한에 잘려 있어도 전체에 적용된다(체크는 DOM이 아니라 집합이 보관).
$('tokenAll').addEventListener('change', () => {
  const on = ($('tokenAll') as HTMLInputElement).checked;
  tokenChecked.clear();
  if (on) for (const t of creatableTokens()) tokenChecked.add(tokenKey(t));
  renderTokens();
});
$('btnTokenDropOnce').addEventListener('click', () => {
  const once = creatableTokens().filter((t) => (t.count ?? 0) <= 1);
  for (const t of once) tokenChecked.delete(tokenKey(t));
  renderTokens();
  setStatus('createStatus', once.length ? t('create.onceOff', { n: once.length }) : t('create.onceNone'), '');
});

$('btnCreate').addEventListener('click', () => {
  previewRevealed = true; // 미리보기 버튼 역할: 생성할 색 외 토큰을 펼침
  if (!tokens.length) {
    // 추출 전에 눌러도 동작: 추출을 자동 실행하고, 결과 도착 후 생성 미리보기까지 이어감.
    // (색은 colorRevealed가 false라 노출 안 함 — 추출 버튼의 역할)
    pendingCreatePreview = true;
    send({ type: 'EXTRACT' });
    return;
  }
  tidyNumbers(); // #19: 격자 8 스냅을 먼저 — 미리보기에 정리된 수치가 보이게
  renderTokens();
  const base = Number(($('base') as HTMLInputElement).value) || 16;
  createFrom = 'tokens';
  send({ type: 'CREATE_TOKENS', tokens: tokensToCreate(), base, preview: true }); // UX1: 미리보기 먼저
});

$('btnCreateApply').addEventListener('click', () => {
  if (!tokens.length) return;
  const base = Number(($('base') as HTMLInputElement).value) || 16;
  createFrom = 'tokens';
  send({ type: 'CREATE_TOKENS', tokens: tokensToCreate(), base }); // 확인 후 실제 적용
});

// base는 비-px 값(rem·%·em)을 px로 환산하는 기준이라 미리보기 결과가 base에 따라 달라진다.
// 미리보기를 본 뒤 base만 바꾸면 옛 기준 요약이 남은 채 ‘적용’이 새 base로 실행돼 어긋나므로,
// 즉시 ‘적용’을 감추고 새 base로 미리보기를 다시 돌린다(미리보기는 변수를 만들지 않는 읽기).
let basePreviewTimer = 0;

/* #19: 설정은 설정 탭에만 있고, 바뀌면 곧바로 파일에 기억한다(저장 버튼 없음).
   타이핑 중 매 키마다 보내지 않도록 한 박자 늦춘다. */
let settingsSaveTimer = 0;
function saveSettings(): void {
  clearTimeout(settingsSaveTimer);
  settingsSaveTimer = window.setTimeout(() => {
    send({
      type: 'SET_SETTINGS',
      base: Number(($('base') as HTMLInputElement).value) || 16,
      maxDepth: readMaxDepth(),
      grid: tidyGrid(),
      componentsBeta,
    });
  }, 350);
}

($('base') as HTMLInputElement).addEventListener('input', saveSettings);
($('depth') as HTMLInputElement).addEventListener('input', saveSettings);
($('grid') as HTMLInputElement).addEventListener('input', saveSettings);

($('base') as HTMLInputElement).addEventListener('input', () => {
  const applyBtn = $('btnCreateApply') as HTMLButtonElement;
  if (applyBtn.style.display === 'none') return; // 아직 미리보기 전 — 무효화할 결과가 없음
  applyBtn.style.display = 'none';
  const base = Number(($('base') as HTMLInputElement).value) || 16;
  setStatus('createStatus', t('create.baseChanged', { base }), '');
  clearTimeout(basePreviewTimer);
  basePreviewTimer = window.setTimeout(() => {
    if (!tokens.length) return;
    createFrom = 'tokens';
    send({ type: 'CREATE_TOKENS', tokens: tokensToCreate(), base: Number(($('base') as HTMLInputElement).value) || 16, preview: true });
  }, 350); // 타이핑 중 매 키마다 보내지 않도록
});


/* 「색 변수 만들기」 — 이 단계의 결론. 역할 입력을 시맨틱 매핑에 반영하고, 색 토큰만
   Global(hue)로 만든 뒤 결과가 오면 역할 별칭(Semantic)까지 이어서 만든다(#3·#10).
   팔레트로 만든 색이면 이전 팔레트 색을 함께 정리한다(replacePalette). */
$('btnColorVars').addEventListener('click', () => {
  const colors = tokens.filter((t) => t.category === 'color');
  if (!colors.length) {
    setStatus('colorStatus', t('color.needColors'), 'warn');
    return;
  }
  // 색 목록이 정한 역할을 매핑에 싣는다(2.5 카드는 숨김이라 이 textarea가 단일 출처).
  // 통째로 갈아끼우면 추출 때 채워 둔 간격·크기·타이포 역할이 같이 날아간다 — 색만 덮어쓴다.
  setSemMapText(colorAuthoritativeRoles(Number(($('base') as HTMLInputElement).value) || 16));
  createFrom = 'colors';
  send({
    type: 'CREATE_TOKENS',
    tokens: colors,
    base: Number(($('base') as HTMLInputElement).value) || 16,
    ...(colorsFromPalette ? { replacePalette: true } : {}),
  });
  setStatus('colorStatus', t('common.applyingVars'), '');
});

$('btnScanGlobals').addEventListener('click', () => {
  // #10: 기존 Global 색에서 시맨틱 역할 추천(재방문 매핑).
  autoGlobalScan = false;
  setStatus(semStatusTarget, t('semantic.scanningGlobals'), '');
  send({ type: 'GET_GLOBAL_COLORS' });
});

/** 방금 보낸 Global 색 요청이 자동(전제 상태 감지)인가 — 사용자가 누른 것과 응답 처리가 다르다. */
let autoGlobalScan = false;
/** 자동 요청은 세션당 한 번 — 탭을 오갈 때마다 사용자가 고친 맵을 흔들지 않는다. */
let globalRolesAsked = false;

/**
 * #10 재방문 매핑 — 색 변수가 이미 있는 파일이면 그때 정한 역할을 불러와 채운다.
 * 수동 트리거(「기존 색에서 추천」)는 흡수된 시맨틱 카드 안에 있어 손이 닿지 않으므로,
 * 전제 상태(hasColorVars)를 신호로 삼는다. 채우기는 맵이 비어 있을 때만 —
 * 추측 휴리스틱(suggestSemMapFrom)보다 '지난번에 실제로 만든 것'이 언제나 낫다.
 */
function requestGlobalRoles(): void {
  if (globalRolesAsked || !hasColorVars) return;
  if (($('semMap') as HTMLTextAreaElement).value.trim()) return;
  globalRolesAsked = true;
  autoGlobalScan = true;
  send({ type: 'GET_GLOBAL_COLORS' });
}

$('btnSemantics').addEventListener('click', () => {
  const map: Record<string, string> = {};
  for (const line of ($('semMap') as HTMLTextAreaElement).value.split('\n')) {
    const m = /^\s*([^=]+?)\s*=\s*(.+?)\s*$/.exec(line);
    if (m) map[m[1]] = m[2];
  }
  if (!Object.keys(map).length) {
    setStatus(semStatusTarget, t('semantic.formatHint'), 'warn');
    return;
  }
  send({ type: 'CREATE_SEMANTICS', map });
});

/* ---------- 2.6 · 텍스트 스타일 (Phase C) ---------- */
/** 폰트는 행별 폰트 셀로 보존(스캔 행 읽기 전용). 수동 행/폴백의 기본 패밀리만 상수로 둔다. */
const DEFAULT_TS_FAMILY = 'Inter';

/** 표 1행 생성(스펙 → 입력 행). 폰트는 행별 셀로 보존(패밀리가 행마다 다를 수 있음).
   locked=true(스캔 행): 폰트·크기·행간·자간·스타일은 읽기 전용(이미 디자인된 사실) — 이름(role)만 편집. */
/* #17: 텍스트 스타일은 표가 아니라 리스트다. 열 폭을 두고 폰트·크기·행간·자간이 싸우는 대신
   이름(편집) · 요약 한 줄 · ×N 배지로 읽는다. 스캔 값은 어차피 편집 대상이 아니라 요약이면 되고,
   ×N을 누르면 그 글자들을 캔버스에서 선택한다(1개면 그리로 이동). */

/** 편집 중인 스타일 목록 — 카드가 곧 편집기라 이름 외에는 이 배열이 단일 출처다. */
let tsSpecs: TextStyleSpec[] = [];

/** 요약 한 줄 — "Inter · 32 / 120% / 0 · Bold". 행간·자간은 원본 단위로 보여준다. */
function tsSummary(s: TextStyleSpec): string {
  const lh = s.lineHeight > 0 ? (s.lineHeightPercent ? `${s.lineHeightPercent}%` : `${s.lineHeight}px`) : 'AUTO';
  const ls = s.letterSpacingPercent ? `${s.letterSpacingPercent}%` : `${s.letterSpacing}`;
  return `${s.family} · ${s.fontSize} / ${lh} / ${ls} · ${s.style}`;
}

/**
 * 값을 고칠 수 있는 행인가 — 손으로 추가한 행(`행 추가`)과 텍스트를 못 찾아 채운 기본 램프.
 * 스캔 행은 캔버스에서 읽은 사실이라 읽기 전용으로 둔다(고치면 화면과 스타일이 어긋난다).
 * 두 부류 모두 세고 있는 글자(count)도, 이미 묶인 스타일(boundStyleId)도 없다.
 */
function isEditableTextRow(s: TextStyleSpec): boolean {
  return !s.boundStyleId && !(s.count ?? 0);
}

/** 값 입력 줄 — 스캔 행 요약과 같은 순서(`폰트 · 크기 / 행간 / 자간 · 굵기`). */
function textStyleEditRow(s: TextStyleSpec): HTMLElement {
  const row = document.createElement('div');
  row.className = 'ts-edit';
  const sep = (ch: string): HTMLElement => {
    const el = document.createElement('span');
    el.className = 'ts-sep';
    el.textContent = ch;
    return el;
  };
  const text = (cls: string, width: string, value: string, title: string, set: (v: string) => void): HTMLInputElement => {
    const el = document.createElement('input');
    el.type = 'text'; // 명시해야 기본 입력 스타일(input[type="text"])이 걸린다
    el.className = cls;
    el.value = value;
    el.title = title;
    if (width) el.style.width = width;
    el.addEventListener('input', () => set(el.value));
    return el;
  };
  const num = (width: string, value: number, title: string, min: string, set: (n: number) => void): HTMLInputElement => {
    const el = document.createElement('input');
    el.type = 'number';
    el.step = 'any';
    if (min) el.min = min;
    el.value = String(value);
    el.title = title;
    el.style.width = width;
    el.addEventListener('input', () => {
      const v = Number(el.value);
      if (el.value !== '' && isFinite(v)) set(v);
    });
    return el;
  };

  row.appendChild(text('ts-family', '', s.family, t('ts.family'), (v) => (s.family = v)));
  row.appendChild(sep('·'));
  row.appendChild(num('40px', s.fontSize, t('ts.size'), '1', (n) => (s.fontSize = n)));
  row.appendChild(sep('/'));
  // 행간·자간을 손으로 넣으면 %가 아니라 px다 — 남아 있던 %는 지워야 요약과 등록이 어긋나지 않는다.
  row.appendChild(num('44px', s.lineHeight, t('ts.lineHeight'), '0', (n) => {
    s.lineHeight = n;
    delete s.lineHeightPercent;
  }));
  row.appendChild(sep('/'));
  row.appendChild(num('44px', s.letterSpacing, t('ts.letterSpacing'), '', (n) => {
    s.letterSpacing = n;
    delete s.letterSpacingPercent;
  }));
  row.appendChild(sep('·'));
  row.appendChild(text('', '72px', s.style, t('ts.weight'), (v) => (s.style = v)));
  return row;
}

function textStyleCard(s: TextStyleSpec): HTMLElement {
  const name = document.createElement('input');
  name.value = s.name;
  name.placeholder = t('textStyle.namePlaceholder');
  name.addEventListener('input', () => {
    s.name = name.value;
  });
  if (s.boundStyleId) {
    name.classList.add('ts-bound');
    name.title = t('textStyle.nameBoundTip');
  } else {
    name.classList.add('ts-new');
    name.title = t('textStyle.nameNewTip');
  }

  // 고칠 수 있는 행은 요약 대신 그 값을 그대로 입력칸으로 — 같은 자리, 같은 순서.
  const editable = isEditableTextRow(s);
  const card = resultCard(editable ? { title: name } : { title: name, summary: tsSummary(s), summaryMono: true });
  if (editable) card.appendChild(textStyleEditRow(s));

  const n = s.count ?? 0;
  const ids = s.nodeIds ?? [];
  if (n > 0 && ids.length) {
    // 1개면 그 글자로 이동, 여러 개면 전부 선택 — 어느 쪽이든 캔버스가 답을 보여준다.
    const badge = document.createElement('button');
    badge.className = 'r-badge';
    badge.textContent = `×${n}`;
    badge.title = n === 1 ? t('textStyle.badgeGoTip') : t('textStyle.badgeSelectTip', { count: n });
    badge.addEventListener('click', () => selectNodes(ids, 'tsStatus'));
    (card.querySelector('.r-top') as HTMLElement).appendChild(badge);
  } else {
    // 수동 추가 행은 셀 글자가 없다 — 대신 지울 수 있어야 한다.
    const del = document.createElement('button');
    del.className = 'link';
    del.textContent = t('textStyle.rowDelete');
    del.addEventListener('click', () => {
      tsSpecs = tsSpecs.filter((x) => x !== s);
      renderTextStyles();
    });
    (card.querySelector('.r-top') as HTMLElement).appendChild(del);
  }
  return card;
}

/** 스캔만 알 수 있는 부가 정보 — 표를 편집해도 그 스캔의 사실이라 남는다(이름 출처·경고). */
let tsScanNote = { namePart: '', warnings: [] as string[] };

function renderTextStyles(): void {
  renderChunked($('tsList'), tsSpecs, textStyleCard);
  if (!tsSpecs.length) {
    setStatus('tsStatus', '', ''); // 마지막 행까지 지웠다 — 남은 개수 요약은 거짓말이 된다
    return;
  }
  // 개수는 상태줄 한 곳에서만 — 제목 배지(#tsCount)는 걷었다(ui.html 주석 참고).
  // 표에서 세므로 행 추가·삭제가 바로 반영된다(스캔 시점 스냅샷이던 옛 상태줄의 문제).
  const fresh = tsSpecs.filter((s) => !s.boundStyleId).length;
  setStatus(
    'tsStatus',
    t('textStyle.scanSummary', { a: fresh, b: tsSpecs.length - fresh }) +
      tsScanNote.namePart +
      t('textStyle.scanLhPct', { n: tsSpecs.filter((s) => s.lineHeightPercent).length }) +
      t('textStyle.scanLsPct', { n: tsSpecs.filter((s) => (s.letterSpacingPercent ?? 0) !== 0).length }) +
      (tsScanNote.warnings.length ? ' · ' + tsScanNote.warnings.join(' ') : ''),
    tsScanNote.warnings.length ? 'warn' : 'ok',
  );
}

/** 등록에 넘길 스펙 — 이름이 빈 행은 뺀다(수동 추가 후 미입력). */
function readTextStyleRows(): TextStyleSpec[] {
  // 폰트가 빈 채로 넘어가면 code가 createTextStyle로 스타일을 먼저 만든 뒤
  // loadFontAsync({family:''})에서 던져, 값도 변수도 없는 껍데기 스타일이 파일에
  // 영구히 남는다. 편집 행은 입력칸을 그대로 s.family에 쓰므로(지우면 '') 여기서 받는다.
  return tsSpecs
    .filter((s) => s.name.trim())
    .map((s) => ({
      ...s,
      name: s.name.trim(),
      family: s.family?.trim() || DEFAULT_TS_FAMILY,
      style: s.style?.trim() || 'Regular',
    }));
}

$('btnScanText').addEventListener('click', () => send({ type: 'SCAN_TEXT_STYLES' }));
// 스캔 후 액션 — 눌러야 생기는 이름이라, 스캔이 표를 채우기 전엔 잠가 둔다(TEXT_STYLE_CANDIDATES에서 해제).
$('btnTsRowLabels').addEventListener('click', () => {
  setStatus('tsStatus', t('textStyle.renaming'), 'ok');
  send({ type: 'NAME_TEXT_STYLES_BY_ROW' });
});
$('btnTsAddRow').addEventListener('click', () => {
  tsSpecs.push({ name: '', fontSize: 16, lineHeight: 24, letterSpacing: 0, family: DEFAULT_TS_FAMILY, style: 'Regular' });
  renderTextStyles();
  // 추가한 카드로 데려가고 이름 칸에 커서를 둔다(어차피 다음 동작은 이름 입력).
  const last = $('tsList').lastElementChild as HTMLElement | null;
  last?.scrollIntoView({ block: 'nearest' });
  (last?.querySelector('input') as HTMLInputElement | null)?.focus();
});
$('btnTextStyles').addEventListener('click', () => {
  const styles = readTextStyleRows();
  if (!styles.length) {
    setStatus('tsStatus', t('textStyle.needSpecs'), 'warn');
    return;
  }
  // 등록은 스타일 생성까지 — 화면에 붙이는 건 옆의 「기존만 연결」 담당(결정 2026-08-06).
  send({ type: 'CREATE_TEXT_STYLES', styles });
});
$('btnApplyExistingText').addEventListener('click', () => {
  // 적용만(무료): 현재 선택의 텍스트를 이미 등록된 같은 스타일에 연결(생성 없음).
  $('tsApplyResult').hidden = true;
  send({ type: 'APPLY_TEXT_STYLES' });
});

/** 선택이 멎은 뒤 이만큼 기다렸다 연결 현황을 읽는다 — 드래그 선택 중 매 이벤트마다 목록이 비었다 찼다 하지 않게. */
const AUTO_SCAN_DELAY = 250;

/* 연결 카드 요청 번호 — 연결 현황·미리보기·연결·교체 응답이 순서 없이 와도(플러그인은 요청을
   동시에 처리한다) 마지막 요청의 응답만 화면에 그린다. 선택이 바뀌면 번호를 올려 진행 중이던
   요청의 응답을 무효로 만든다(이전 선택의 미리보기가 새 선택 위에 그려지지 않게). */
let bindReqSeq = 0;
let bindLatest = 0;
let autoScanTimer: ReturnType<typeof setTimeout> | null = null;
function nextBindReq(): number {
  if (autoScanTimer) { clearTimeout(autoScanTimer); autoScanTimer = null; } // 새 요청이 예약된 자동 조회보다 우선
  bindLatest = ++bindReqSeq;
  return bindLatest;
}
/** 응답이 지금 화면이 기다리는 요청의 것인가. reqId가 없는 응답(마법사 등 다른 경로)은 예전처럼 받는다. */
function isCurrentBindReply(reqId: number | undefined): boolean {
  return reqId === undefined || reqId === bindLatest;
}
$('btnApply').addEventListener('click', () => runBindPreview());
/** 찾기 실행(이전의 미리보기 — 연결하지 않고 후보만 계산). silent = 복귀 때 조용히 다시 계산(§4.6 ⑧) — 진행률·테두리 없이. */
function runBindPreview(silent = false): void {
  $('bindNotice').hidden = true;
  const wasDone = bindIsDone();
  $('bindDone').hidden = true;
  if (wasDone) { bindSkipReasons = {}; bindSkipsOpen = false; } // 연결 후 다시 찾기 — 결과 카드의 건너뜀 배지는 지운다
  bindForeignSel = false;
  bindHereSel = false;
  bindLeftSince = false;
  if (!silent) {
    bindFinding = true;
    showApplyProgress(t('bind.finding')); // UX6
  }
  const reqId = nextBindReq();
  bindSilentReq = silent ? reqId : 0;
  opSilent = silent;
  send({ type: 'APPLY', preview: true, reqId });
  opSilent = false;
  bindPreviewSel = curSel.ids.slice();
  if (!silent) bindPreviewName = curSel.count === 1 ? shortName(curSel.name || t('sel.unnamed')) : t('bind.selMany', { k: curSel.count });
  renderBindChrome();
}
$('btnBindRepreview').addEventListener('click', () => runBindPreview());
$('btnBindToList').addEventListener('click', () => showManager());

$('btnApplyConfirm').addEventListener('click', () => {
  // #6: 켠 변수의 곳만 직접 연결(WYSIWYG). 플러그인이 각 자리를 다시 확인한다.
  const items = bindCandidates
    .filter((c) => bindChecked.has(candKey(c)))
    .map((c) => ({ nodeId: c.nodeId, field: c.field, index: c.index, variableId: c.variableId }));
  if (!items.length) return;
  bindFinding = false;
  showApplyProgress(t('bind.linking'), false); // UX6 — 연결은 중간에 멈추지 않으므로 [취소]를 숨긴다(§4.6)
  send({ type: 'APPLY_SELECTED', items, reqId: nextBindReq() });
});


$('btnApplyCancel').addEventListener('click', () => {
  send({ type: 'CANCEL' }); // UX6: 취소 요청
  setStatus('applyStatus', t('apply.cancelRequested'), 'warn');
});

$('btnPreview').addEventListener('click', () => {
  send({ type: 'RENAME', apply: false, maxDepth: readMaxDepth() });
});

$('btnRename').addEventListener('click', () => {
  // #7: 미리보기 트리에서 체크한 항목만 직접 적용(WYSIWYG).
  const items = renameNodes
    .filter((n) => n.after !== undefined && renameChecked.has(n.id))
    .map((n) => ({ id: n.id, before: n.name, after: n.after as string, role: n.role }));
  if (!items.length) return;
  // 이름이 안 바뀐 노드도 역할은 남긴다 — 마법사 경로(renameSelection)는 이미 그렇게 하고(멱등),
  // 판넬만 빠져 있어 옛 빌드로 리네임한 파일·손으로 이름 지은 레이어에는 역할 기록이 영영 안 생겼다.
  // 그러면 「컴포넌트 등록」의 말단 후보(아바타·아이콘·썸네일)가 통째로 죽는다.
  // 체크 대상이 아닌 이유는 '바꿀 이름이 없어서'지 역할까지 남기지 말라는 뜻이 아니다.
  const roleOnly = renameNodes
    .filter((n) => n.after === undefined && n.role)
    .map((n) => ({ id: n.id, before: n.name, after: n.name, role: n.role }));
  send({ type: 'RENAME_APPLY', items: [...items, ...roleOnly] });
});

$('renameAll').addEventListener('change', (e) => {
  const on = (e.target as HTMLInputElement).checked;
  renameChecked.clear();
  if (on) for (const n of renameNodes) if (n.after !== undefined) renameChecked.add(n.id);
  renderRenameTree();
});

// 보존 행 감추기/보이기 — 체크에는 영향이 없다(보존 행은 애초에 체크 대상이 아님).
$('btnRenameKeep').addEventListener('click', () => {
  renameHideKeep = !renameHideKeep;
  renderRenameTree();
});


/* ============================================================
   시스템화 마법사 — 기존 메시지(추출→생성→시맨틱→바인딩→정돈→검수→컴포넌트화)를
   순서대로 호출하는 UI 시퀀서. 신규 로직은 lib/wizard.ts(순수)에 분리.
   기존 window.onmessage 스위치는 그대로 두고, 별도 리스너로 단계 완료를 await한다.
   ============================================================ */
let wizardRunning = false;
// 한 번에 하나의 단계만 await(순차 실행)하므로 단일 대기자로 충분.
/** 마법사 단계가 유료 잠금에 걸림 — 실패 줄은 공통 잠금 문구(status.paid)를 쓴다(§2.3). */
class PaidRequiredError extends Error {}

let wizardWaiter: { types: string[]; resolve: (m: CodeToUi) => void; reject: (e: Error) => void } | null = null;

window.addEventListener('message', (event: MessageEvent) => {
  const m = (event.data as { pluginMessage?: CodeToUi }).pluginMessage;
  if (!m) return;
  // 바인딩 진행률(UX6)은 마법사 자체 진행바로 표시(‘적용’ 탭 진행바는 안 보임).
  if (!wizardWaiter) return;
  // 오류/유료요구는 대기 중이면 해당 단계 실패로 처리(무한 대기 방지).
  if (m.type === 'ERROR' || m.type === 'PREMIUM_REQUIRED') {
    const w = wizardWaiter;
    wizardWaiter = null;
    w.reject(m.type === 'PREMIUM_REQUIRED' ? new PaidRequiredError() : new Error(m.message));
    return;
  }
  if (wizardWaiter.types.includes(m.type)) {
    const w = wizardWaiter;
    wizardWaiter = null;
    // 메인 핸들러(window.onmessage)가 같은 메시지를 **다 처리한 뒤** 깨운다. 이 리스너가 먼저
    // 등록돼 있어, 바로 resolve하면 리스너 사이의 마이크로태스크 체크포인트에서 마법사가 재개돼
    // EXTRACT_RESULT의 hue 이름 정규화(`color/0066ff`→`color/blue/500`)·색 정리·역할 추천이
    // 적용되기 전의 raw 토큰으로 CREATE_TOKENS를 보냈다 — Semantic에 hex 이름이 남던 원인.
    setTimeout(() => w.resolve(m), 0);
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

/** Paid라서 이번 실행에서 빠진 단계들. 칩과 요약 줄이 같은 목록을 쓴다. */
function paidSkippedSteps(plan: WizardPlanItem[]): WizardPlanItem[] {
  return plan.filter((p) => !p.run && p.skipReason === 'wizard.skip.paid');
}

/** 계획을 미니 파이프 칩으로 — 돌 단계는 번호순, 결과·사유는 칩 툴팁(와이어).
    옵션을 꺼서 빠진 단계는 칩을 만들지 않는다: 왜 빠졌는지는 바로 위 체크박스가 이미 말한다.
    반면 Paid로 빠진 단계는 화면 어디에도 단서가 없어, 칩까지 지우면 Free 사용자는 파이프가
    왜 세 칸만 도는지 알 길이 없다 — 자물쇠 회색 칩으로 자리를 남긴다. */
function renderWizardSteps(plan: WizardPlanItem[]): void {
  const box = $('wizardSteps');
  box.innerHTML = '';
  let n = 0;
  for (const p of plan) {
    const paidSkip = !p.run && p.skipReason === 'wizard.skip.paid';
    if (!p.run && !paidSkip) continue;
    const chip = document.createElement('span');
    chip.id = `wstep-${p.step.id}`;
    const label = t('wizard.step.' + p.step.id);
    if (p.run) {
      chip.textContent = `${++n} ${label}`;
    } else {
      chip.className = 'skip';
      chip.textContent = `${PAID_LOCK} ${label}`;
      chip.title = t('wizard.chip.paid');
    }
    box.appendChild(chip);
  }
}

/** 이번 마법사 실행에 실패한 단계가 있었는가(앞 단계가 멈춰 건너뛴 표시는 빼고) — 최소화 ⚠ 판정. */
let wizardFailed = false;
function setWizardStep(id: WizardStepId, state: 'active' | 'done' | 'fail', note: string): void {
  if (state === 'fail' && note !== t('wizard.seq.stoppedPrev')) wizardFailed = true;
  const chip = document.getElementById(`wstep-${id}`);
  if (!chip) return;
  chip.classList.remove('active', 'done', 'fail');
  chip.classList.add(state);
  // 칩에는 번호·라벨만 둔다 — 단계별 결과("생성 3 · 갱신 2")는 툴팁으로, 총평은 아래 요약 줄로.
  chip.title = note;
}

async function runWizard(): Promise<void> {
  if (wizardRunning) return;
  if (lastSelCount <= 0) {
    setStatus('wizardSummary', t('wizard.needSelect'), 'warn');
    return;
  }
  // 설정값은 설정 탭 '플러그인 설정'에서 읽는다(단일 출처) — 격자·허용오차도 거기 값을 그대로 쓴다.
  const base = Number(($('base') as HTMLInputElement).value) || 16;
  const maxDepth = readMaxDepth();
  let semMap = textToSemanticMap(($('semMap') as HTMLTextAreaElement).value);

  const options: WizardOptions = {
    semantics: ($('wizOptSemantics') as HTMLInputElement).checked,
    dark: ($('wizOptDark') as HTMLInputElement).checked,
    textStyles: ($('wizOptTextStyles') as HTMLInputElement).checked,
    // v1.0: 마법사에서 컴포넌트 등록 제외(체크박스 숨김) — 리네임 뒤 이름 기준 묶기가 디자인을 덮어쓴다.
    componentize: false,
  };
  const ctx: WizardContext = { isPaid, hasSemanticMap: Object.keys(semMap).length > 0 };
  const plan = planWizard(options, ctx);

  wizardRunning = true;
  wizardFailed = false;
  // 시작 화면 고정(①) — 로컬 변수 0개일 때 시작했으면 실행 중·요약 동안 시작 화면 유지.
  wizBeforeCount = localVarCount();
  wizFrom = activeTab === 'variables' && varSub === 'make' ? 'make' : 'start';
  wizLatch = wizBeforeCount === 0 ? { from: wizFrom, before: 0, summarySeen: false, done: false } : null;
  opWizardStart();
  ($('btnWizardRun') as HTMLButtonElement).disabled = true;
  $('btnWizardCancel').style.display = '';
  setStatus('wizardSummary', t('common.running'), '');
  renderWizardSteps(plan);

  const totals: WizardTotals = {};
  let stopped = false;
  let failNote = ''; // 실패 사유 — 칩 툴팁에만 두면 화면에서 사라진다(요약 줄에 함께 싣는다)

  wizCancelReq = false;
  wizEnded = false;
  renderWizToBind();
  for (const p of plan) {
    if (!p.run) continue; // renderWizardSteps에서 이미 skip 표시
    // 취소는 지금 단계가 끝난 뒤 남은 단계를 실행하지 않는다(§4.3).
    if (wizCancelReq && !stopped) stopped = true;
    if (stopped) {
      setWizardStep(p.step.id, 'fail', wizCancelReq ? t('wizard.seq.cancelSkipped') : t('wizard.seq.stoppedPrev'));
      continue;
    }
    setWizardStep(p.step.id, 'active', t('wizard.seq.running'));
    try {
      switch (p.step.id) {
        case 'extract': {
          // 응답은 메인 핸들러가 먼저 받아 `tokens`를 정규화(hue 이름·색 정리·역할 추천)해 둔다 —
          // 여기서는 raw `r.tokens`가 아니라 그 결과(모듈 변수)를 쓴다. 버튼 경로와 같은 토큰이다.
          await wizardRequest({ type: 'EXTRACT' }, ['EXTRACT_RESULT']);
          if (!tokens.length) {
            setWizardStep('extract', 'fail', t('wizard.seq.noExtract'));
            stopped = true;
            break;
          }
          // 만들기 탭의 색 표·토큰 목록은 '추출'/'미리보기' 버튼이 켜는 플래그로 가려져 있다 —
          // 마법사가 같은 추출을 했으니 둘 다 펼쳐, 탭을 열면 무엇을 만들었는지 목록으로 보이게 한다.
          colorRevealed = true;
          previewRevealed = true;
          renderColorTable();
          renderTokens();
          // 역할 매핑은 **이번 추출 토큰 기준으로 다시** 만든다(자동 추천 + 색 표에서 고른 역할) —
          // '색 변수 만들기' 버튼과 같은 출처. 이전 세션의 textarea를 그대로 쓰면 지금은 없는
          // 이름(옛 hex 이름 `color/000000`)에 역할이 붙거나, 색 4개만 남고 간격·크기·타이포
          // 역할(spacing/sm, radius/md, font-size/body…)이 통째로 빠진다.
          setSemMapText(colorAuthoritativeRoles(base));
          semMap = textToSemanticMap(($('semMap') as HTMLTextAreaElement).value);
          // 시작 시점엔 매핑이 없어 '매핑 없음'으로 빠졌어도 지금은 만들 별칭이 있다 — 단계를 되살린다.
          const sem = plan.find((x) => x.step.id === 'semantics');
          if (sem && !sem.run && sem.skipReason === 'wizard.skip.noMapping' && Object.keys(semMap).length) {
            sem.run = true;
            sem.skipReason = undefined;
            renderWizardSteps(plan);
            setWizardStep('extract', 'active', t('wizard.seq.running'));
          }
          setWizardStep('extract', 'done', t('wizard.seq.extractDone', { count: tokens.length }));
          break;
        }
        case 'create': {
          const r = await wizardRequest({ type: 'CREATE_TOKENS', tokens, base }, ['CREATE_RESULT']);
          totals.created = r.created + r.updated;
          setWizardStep('create', 'done', t('wizard.seq.createDone', { created: r.created, updated: r.updated }));
          break;
        }
        case 'semantics': {
          const r = await wizardRequest({ type: 'CREATE_SEMANTICS', map: semMap }, ['SEMANTICS_RESULT']);
          totals.semanticsAliased = r.aliased;
          setWizardStep('semantics', 'done', t('wizard.seq.semantics', { aliased: r.aliased }) + (r.missing.length ? t('wizard.seq.semanticsMissing', { n: r.missing.length }) : ''));
          break;
        }
        case 'dark': {
          // 대상은 변수 목록에서 직접 고른다 — 테마 카드의 셀렉트는 다른 리스너가 채우므로
          // 같은 응답으로 깨어난 이 자리에서 읽으면 아직 비어 있을 수 있다.
          const vars = await wizardRequest({ type: 'GET_VARIABLES' }, ['VARIABLES']);
          const target = pickDarkTarget(vars.vars);
          if (!target) {
            setWizardStep('dark', 'done', t('wizard.seq.darkNoTarget'));
            break;
          }
          const r = await wizardRequest(
            { type: 'GENERATE_DARK_MODE', collectionId: target.collectionId, fromModeId: target.fromModeId, ...(target.toModeId ? { toModeId: target.toModeId } : {}) },
            ['DARK_MODE_RESULT'],
          );
          if (r.error) {
            setWizardStep('dark', 'fail', r.error);
            break;
          }
          totals.darkFilled = r.realiased;
          if (!r.realiased) {
            // 모드만 생기고 값이 안 찬 상태 — '완료'로 적으면 다크가 된 줄 안다.
            setWizardStep('dark', 'fail', t('wizard.seq.darkNothing'));
            break;
          }
          setWizardStep(
            'dark',
            'done',
            t('wizard.seq.dark', { realiased: r.realiased }) +
              (r.modeCreated ? t('wizard.seq.darkModeCreated') : '') +
              (r.skipped ? t('wizard.seq.darkSkip', { n: r.skipped }) : ''),
          );
          break;
        }
        case 'textStyles': {
          // 스캔(읽기) → 후보 그대로 등록. 화면의 표는 같은 응답을 받은 타이포 카드가 그린다.
          const scan = await wizardRequest({ type: 'SCAN_TEXT_STYLES' }, ['TEXT_STYLE_CANDIDATES']);
          if (!scan.styles.length) {
            setWizardStep('textStyles', 'done', t('wizard.seq.textStylesNone'));
            break;
          }
          const r = await wizardRequest({ type: 'CREATE_TEXT_STYLES', styles: scan.styles }, ['TEXT_STYLES_RESULT']);
          totals.textStyles = r.created + r.updated;
          setWizardStep('textStyles', 'done', t('wizard.seq.textStyles', { created: r.created, updated: r.updated }));
          break;
        }
        case 'rename': {
          const r = await wizardRequest({ type: 'RENAME', apply: true, maxDepth }, ['RENAME_RESULT']);
          totals.renamed = r.changes.length;
          setWizardStep('rename', 'done', t('wizard.seq.renameDone', { count: r.changes.length }));
          break;
        }
        case 'componentize': {
          // 등록이 베이스 묶음 베리언트 세트까지 함께 수행(별도 분류 불필요).
          const reg = await wizardRequest({ type: 'REGISTER_COMPONENTS' }, ['COMPONENTS_RESULT']);
          totals.components = reg.registered;
          setWizardStep('componentize', 'done', t('wizard.seq.componentize', { registered: reg.registered, sets: reg.sets }));
          break;
        }
      }
    } catch (e) {
      if (e instanceof PaidRequiredError) failNote = t('status.paid');
      else {
        const fe = explainError(e instanceof Error ? e.message : String(e));
        failNote = `${fe.message}${fe.action ? ` — ${fe.action}` : ''}`;
      }
      setWizardStep(p.step.id, 'fail', failNote);
      stopped = true;
    }
  }

  wizardRunning = false;
  opWizardEnd(wizardFailed ? 'fail' : stopped ? 'cancel' : 'ok');
  if (wizLatch) wizLatch.done = true;
  ($('btnWizardRun') as HTMLButtonElement).disabled = false;
  setWizardRunLabel(!stopped); // 완주했으면 '다시 실행' — 같은 선택을 또 돌리는 건 갱신이지 첫 실행이 아니다
  $('btnWizardCancel').style.display = 'none';
  // 칩 툴팁만으로는 사라진다 — 무엇이 왜 안 돌았는지는 요약 줄에도 적는다(#15).
  // 특히 '토큰'이 빠지면 새 변수가 없어 연결 수가 0에 가까운데, 그 인과가 화면에 없었다.
  const paidSkipped = paidSkippedSteps(plan);
  const paidNote = paidSkipped.length
    ? t('wizard.paidSkipped', { steps: paidSkipped.map((p) => t('wizard.step.' + p.step.id)).join(' · ') })
    : '';
  if (!isPaid && !stopped && !wizardFailed) {
    // 무료 완료 요약(§4.3) — 로컬 변수 수와 관계없이 이름 정리만.
    setStatus('wizardSummary', t('wizard.freeSum', { n: totals.renamed ?? 0 }), 'ok');
  } else setStatus(
    'wizardSummary',
    t('wizard.result', { state: stopped ? t('wizard.stopped') : t('wizard.completed'), summary: summarize(totals) }) +
      paidNote +
      (failNote ? ` · ${failNote}` : ''),
    stopped || paidSkipped.length || wizardFailed ? 'warn' : 'ok',
  );
  // 만들기 맨 위에서 실행했고 로컬 변수가 이미 있었으면 머리는 그대로, "변수 {n}개 생성"은 상태 줄에(§4.3).
  // 변수 수는 작업 직후 다시 읽기로 오는 표에서 센다.
  wizCountPending = wizFrom === 'make' && wizBeforeCount > 0;
  wizEnded = true;
  renderWizToBind();
  renderVarScreen();
}
/** 마법사 취소 요청 — 지금 단계가 끝난 뒤 멈춘다. */
let wizCancelReq = false;
/** 마법사가 한 번 끝났다(취소·실패 포함) — 요약 끝 연결 안내를 보인다. */
let wizEnded = false;
/** 요약 끝 "레이어 › 연결에서 확인하고 연결하기 →"(§4.3). 연결할 변수가 없으면 숨기고, 선택이 없으면 잠근다. */
function renderWizToBind(): void {
  const b = $('btnWizToBind');
  b.hidden = !wizEnded || wizardRunning || (prereqKnown && !hasBindable);
  if (curSel) setLock(b, curSel.count ? null : 'prereq', t('status.noSelection'));
}
/** 만들기 맨 위(로컬 변수 있음) 마법사가 끝난 뒤 — 다음 변수 표에서 "변수 {n}개 생성"을 상태 줄에. */
let wizCountPending = false;

let lastSelBound = 0;
let lastSelRenamed = 0;
/**
 * 선택 기준 '완료' 판정 + 전체 실행 라벨. SELECTION_STATE와 PREREQ_STATE 어느 쪽이 먼저 와도 같은 답이 나오게
 * 둘 다 여기로 모은다. Global/Semantic이 없으면(컬렉션을 지우고 처음부터 하는 QA 흐름, 다른 파일에서 복사해 온
 * 프레임) 이전 이름 정리 기록이 남아 있어도 '처음'으로 본다 — 변수가 없으면 어차피 전부 다시 한다.
 */
function applySelectionDone(): void {
  // 변수 컬렉션이 없으면 레이어에 남은 바인딩은 지워진 변수를 가리키는 잔상이다 — 연결도 '처음'으로 본다.
  const fresh = !hasGlobal && !hasSemanticRoles;
  hasBoundNodes = !fresh && lastSelBound > 0;
  hasRenamedNodes = !fresh && lastSelRenamed > 0;
  renderPipeline();
  if (!wizardRunning) setWizardRunLabel(hasBoundNodes || hasRenamedNodes);
}

/** 전체 실행 버튼 라벨 — 이미 정리한 선택이면 '다시 실행'(툴팁에 무엇이 달라지는지). */
function setWizardRunLabel(rerun: boolean): void {
  const b = $('btnWizardRun') as HTMLButtonElement;
  b.dataset.rerun = rerun ? '1' : '';
  b.title = rerun && isPaid ? t('wizard.rerunHint') : '';
  renderWizardCopy(); // 유료/무료·로컬 변수 유무에 따라 문구가 다르다(§4.3)
}
$('btnWizardRun').addEventListener('click', () => void runWizard());
$('btnWizardCancel').addEventListener('click', () => {
  wizCancelReq = true;
  send({ type: 'CANCEL' });
});
$('btnWizToBind').addEventListener('click', () => findUnbound());

// 개발용 강제 티어 토글 — 개발 빌드에서만 노출/동작(배포 빌드 백도어 차단).
// HTML은 기본 display:none(배포 안전). dev 빌드에서만 여기서 노출한다.
if (__DEV__) {
  $('devTierRow').style.display = '';
  $('tier').addEventListener('change', () => {
    send({ type: 'SET_LICENSE', tier: ($('tier') as HTMLSelectElement).value as Tier });
  });
} else {
  $('devTierRow').style.display = 'none';
}

$('btnVerify').addEventListener('click', () => {
  const key = ($('licenseKey') as HTMLInputElement).value.trim();
  if (!key) {
    setStatus('licenseStatus', t('license.needKey'), 'warn');
    return;
  }
  setStatus('licenseStatus', t('common.verifying'), '');
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

/** 검증 서버 호출 + 서명/클레임 검증 → 결과를 code로 보고(code가 캐시·적용).
 *  instanceId: 이전 활성화에서 받아 캐시에 보관한 기기 식별자(있으면 같은 기기로 validate). */
async function verifyAndReport(key: string, instanceId?: string): Promise<void> {
  let json: unknown;
  try {
    const resp = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, pluginId: PLUGIN_ID, instanceId }),
    });
    // 네트워크 도달 이후의 실패는 '오프라인'이 아니다 — grace 유지로 페일오픈되지 않게 여기서부터 분리한다.
    json = await resp.json().catch(() => null);
  } catch {
    // fetch 자체 실패(DNS·연결·CORS)만 오프라인 → 기존 캐시를 grace로 유지.
    // 문구는 넘기지 않는다 — offline이면 code가 자기 문구(license.noteGrace · noteOffline)를 쓴다.
    send({ type: 'LICENSE_VERIFIED', key, result: { ok: false, offline: true } });
    return;
  }

  let result: VerifyResult;
  try {
    // 서명 토큰(JWT)만 신뢰한다 — 서명 없는 평문 응답은 페이월 우회 경로라 수용하지 않는다(M2.1).
    const ext = extractSignedToken(json);
    if (!ext.ok) {
      // 서버 거부 사유(code)는 그대로 넘긴다. 머리말("검증 실패:")은 붙이지 않는다 — 화면 줄은 code가 고른다.
      send({ type: 'LICENSE_VERIFIED', key, result: ext.code ? { ok: false, error: ext.error, code: ext.code } : { ok: false, error: ext.error } });
      return;
    }
    const parsed = await verifyLicenseToken(ext.token, Date.now(), { issuer: LICENSE_ISS, audience: LICENSE_AUD }, subtleVerify);
    result = parsed.ok
      ? { ok: true, tier: parsed.tier, expiresAt: parsed.expiresAt, instanceId: pickInstanceId(json, instanceId) }
      : { ok: false, error: parsed.error };
  } catch (e) {
    // 서명·클레임·응답 형식 오류 → offline 아님(검증 실패로 확정 처리).
    result = { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
  send({ type: 'LICENSE_VERIFIED', key, result });
}

/** 라이선스 키 제거 시 이 기기의 LS 활성화 슬롯을 반납(best-effort). 실패해도 로컬 제거는 진행됨. */
async function deactivateInstance(key: string, instanceId: string): Promise<void> {
  try {
    await fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'deactivate', key, instanceId, pluginId: PLUGIN_ID }),
    });
  } catch {
    /* 오프라인 등 실패는 무시 — 슬롯은 만료/재활성화로 회수됨. */
  }
}

/* ---------- 유료(Paid) 기능 게이트 ----------
   Free/Paid 2티어. Paid에서 해금: 팔레트·토큰 생성(미리보기+적용)·다크 테마 생성·시맨틱·
   텍스트 스타일·컴포넌트/베리언트·닮은 프레임 컴포넌트화.
   Free: 추출·색 정리·바인딩·리네임·닮은 프레임 스캔·내보내기. */
const PAID_LOCK = '🔒'; // 와이어의 잠금 배지는 자물쇠 하나 — 사유는 버튼·배지 툴팁(setLockTitle)
// btnScanSimilar(스캔)은 읽기 전용이라 Free — 잠그는 건 실제로 문서를 바꾸는 btnComponentize뿐.
const COMPONENT_FIELDS = ['btnScanComp', 'btnRegisterComp', 'btnClassifyVariants', 'btnGenMissing', 'btnComponentize'];
// 사전 잠금 대상 유료 버튼 전체(시맨틱은 전제 가드와 결합돼 아래에서 별도 처리).
// 미리보기도 함께 잠근다: '적용'이 Paid인 카드에서 미리보기만 열어두면, 눌러도 적용이 회색이라
// 이유를 알 수 없는 막다른 길이 된다(btnPalette=팔레트 생성이 그 카드의 미리보기 역할).
// btnApplyExistingText도 code 쪽에서 requireTextStyles로 막히지만, 전제 가드(등록된 스타일 유무)와
// 결합돼 있어 여기 목록이 아니라 updateGates 아래에서 별도로 잠근다.
const PAID_FIELDS = [
  ...COMPONENT_FIELDS,
  'btnPalette', 'btnColorVars',
  'btnCreate', 'btnCreateApply',
  'btnScanText', 'btnTextStyles', // 스캔(미리보기)도 잠금 — 등록이 Paid라 스캔만 열면 막다른 길
  'btnGenDark', // 다크 Global을 새로 만드니 토큰 생성과 같은 등급
];

/**
 * 통합 게이트(#11·#12) — 유료 잠금(Paid)과 전제 미충족(Global/바인딩 변수 없음)을
 * 한 메커니즘으로: 해당 버튼 disabled + 배지/안내(+바로가기) 표시.
 */
function updateGates(): void {
  // 유료 잠금(#12) — Free는 유료 버튼을 클릭 전에 사전 비활성 + 🔒 배지(클릭-후-거부 방지).
  for (const id of PAID_FIELDS) {
    const el = $(id) as HTMLButtonElement;
    setLock(el, isPaid ? null : 'paid'); // aria-disabled — 포커스는 받고, 누르면 공통 상태 줄에 사유(§2.3)
    setLockTitle(el, !isPaid); // 카드 배지를 못 본 채 회색 버튼만 보는 경우 대비
  }
  // 색 카드는 Free('선택에서 추출')와 Paid('팔레트 생성'·'색 변수 만들기')가 한 툴바에 섞여
  // 있어 카드 배지만으로는 어느 쪽이 잠긴 건지 알 수 없다 → 두 버튼 모두에 자물쇠를 붙인다
  // (와이어 rev k). 400px에서 툴바가 두 줄이 되는 건 감수 — 결론 버튼의 잠금이 먼저다.
  for (const id of ['paletteLock', 'paletteBtnLock', 'colorVarsLock', 'componentLock', 'darkLock', 'createLock', 'semLock', 'tsLock']) {
    $(id).textContent = isPaid ? '' : PAID_LOCK;
  }
  // 다크 채우기는 Paid에 더해 컬렉션·모드(라이트 출처)가 있어야 한다. PAID_FIELDS 루프가
  // 방금 disabled를 티어만 보고 덮었으니, 전제를 여기서 다시 적용해야 한다(순서 의존).
  // Dark 모드는 없으면 생성하므로 모드 2개 전제는 더 이상 없다.
  refreshDarkModes();
  // 마법사 옵션은 모두 Paid 단계다(WIZARD_STEPS의 semantics·dark·textStyles·componentize).
  // 하나라도 빠뜨리면 Free가 켤 수 있는 체크박스가 실행 계획에서 조용히 빠진다 — #11이 없애려던 바로 그 상태.
  for (const [box, lock] of [
    ['wizOptSemantics', 'wizSemanticLock'],
    ['wizOptDark', 'wizDarkLock'],
    ['wizOptTextStyles', 'wizTextStylesLock'],
    ['wizOptComponentize', 'wizComponentLock'],
  ]) {
    $(lock).textContent = isPaid ? '' : PAID_LOCK;
    // 잠긴 옵션은 체크 해제 + aria-disabled + 🔒. 풀리면 원래 체크를 되돌린다.
    const input = $(box) as HTMLInputElement;
    if (!isPaid && !isLocked(input)) { input.dataset.wasChecked = String(input.checked); input.checked = false; }
    if (isPaid && isLocked(input) && input.dataset.wasChecked !== undefined) { input.checked = input.dataset.wasChecked === 'true'; delete input.dataset.wasChecked; }
    setLock(input, isPaid ? null : 'paid');
  }

  // 전제 미충족 가드(#11) — Global 없으면 시맨틱 매핑, 바인딩 변수 없으면 바인딩을 잠근다.
  setPrereq('btnSemantics', 'semPrereq', hasGlobal, t('semantic.needGlobal'));
  if (!isPaid) setLock($('btnSemantics'), 'paid'); // 유료 잠금이 전제보다 우선(§2.3)
  renderBindPrereq();
}

/** 유료 잠금 사유를 툴팁으로. 원래 문구(기능 설명)는 dataset에 1회 백업해 보존·복원한다.
 *  구조 버튼은 native title이 아니라 커스텀 툴팁(data-tip)을 쓴다 — title에 넣으면 사유가
 *  보이는 툴팁 옆에 겹쳐 뜨거나 아예 안 보인다. 그래서 실제로 뜨는 쪽 하나에만 얹는다. */
function setLockTitle(el: HTMLElement, locked: boolean): void {
  const attr = el.hasAttribute('data-tip') ? 'data-tip' : 'title';
  if (el.dataset.baseTip === undefined) el.dataset.baseTip = el.getAttribute(attr) ?? '';
  const base = el.dataset.baseTip;
  // 툴팁은 기존 설명 뒤에 " · 유료 기능 · 설정 › 라이선스"를 붙인다(IA v3 §2.3).
  const note = t('lock.tipSuffix');
  el.setAttribute(attr, locked ? (base ? `${base} · ${note}` : note) : base);
}

/** 전제 충족 여부로 버튼 활성/안내(+바로가기) 토글. */
function setPrereq(btnId: string, noticeId: string, okRaw: boolean, msg: string): void {
  // 첫 PREREQ_STATE 전에는 '모름' — 변수가 있는 파일에서도 '먼저 토큰을 생성…' 경고가 번쩍이고
  // 카드 높이가 출렁이지 않게, 모를 때는 경고를 띄우지 않고 버튼도 막지 않는다.
  const ok = okRaw || !prereqKnown;
  setLock($(btnId), ok ? null : 'prereq', msg);
  const notice = $(noticeId);
  notice.style.display = ok ? 'none' : '';
  const text = notice.querySelector('.prereq-text');
  if (text) text.textContent = ok ? '' : msg;
}

/** 전제 미충족 안내의 ‘토큰 생성으로’ 바로가기 — 토큰 탭으로 이동 + 생성 카드 포커스. */
function goToCreate(): void {
  showMake('token'); // 토큰 생성은 '토큰' 단계에 있다 — 단계를 안 맞추면 빈 화면으로 보낸다
  $('createCard').scrollIntoView({ behavior: 'smooth', block: 'center' });
  ($('btnCreate') as HTMLButtonElement).focus();
}

/* ---------- 진행 안내 파이프라인(§3) ---------- */

/** 준비 현황 줄 클릭 → 그 일을 하는 단계로. 목록 순서 = 만들기 레일 순서 + 적용 첫 단계. */
const PIPELINE_TARGET: Record<PipelineStep['id'], { make: MakeStep | null; btn: string; apply?: ApplyStep }> = {
  colors: { make: 'color', btn: 'btnColorVars' },
  tokens: { make: 'token', btn: 'btnCreate' },
  semantics: { make: 'token', btn: 'btnCreate' }, // 역할 매핑은 토큰을 적용할 때 함께 만들어진다(숨은 카드 대신)
  dark: { make: 'theme', btn: 'btnGenDark' },
  textStyles: { make: 'type', btn: 'btnScanText' },
  bind: { make: null, btn: 'btnApply' }, // 적용 탭
  rename: { make: null, btn: 'btnPreview', apply: 'rename' }, // 적용 탭 · 이름 정리
};

function gotoStep(id: PipelineStep['id']): void {
  closeReadiness();
  const target = PIPELINE_TARGET[id];
  if (id === 'semantics') showStatusLine(t('list.semanticsNote'));
  if (target.make === null) {
    showTab('layer');
    showApplyStep(target.apply ?? 'bind');
  } else {
    showMake(target.make);
  }
  const b = $(target.btn) as HTMLButtonElement;
  b.scrollIntoView({ behavior: 'smooth', block: 'center' });
  b.focus();
}

/** PREREQ_STATE 기반으로 의존 파이프라인 단계 상태를 그린다(시작 탭). */
function renderPipeline(): void {
  const box = $('pipelineSteps');
  box.innerHTML = '';
  const steps = pipelineSteps({ hasColorVars, hasScaleVars, hasGlobal, hasBindable, hasDarkMode, hasTextStyles, hasSemanticRoles, hasBoundNodes, hasRenamedNodes });
  steps.forEach((s, i) => {
    const row = document.createElement('div');
    row.className = `pstep ${s.status}`;
    row.tabIndex = 0;
    row.setAttribute('role', 'button');

    const dot = document.createElement('span');
    dot.className = 'pdot';
    dot.textContent = s.status === 'done' ? '✓' : String(i + 1);
    const label = document.createElement('span');
    label.className = 'plabel';
    label.textContent = t('pipeline.step.' + s.id);
    const stat = document.createElement('span');
    stat.className = 'pstat';
    stat.textContent = s.hint ? t(s.hint) : t('pipeline.stat.' + s.status);

    row.append(dot, label, stat);
    const go = (): void => gotoStep(s.id);
    row.addEventListener('click', go);
    row.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        go();
      }
    });
    box.appendChild(row);
  });
}

/* ---------- 컴포넌트 / 베리언트 (Phase 3, Paid) ---------- */
$('btnScanComp').addEventListener('click', () => {
  setStatus('structureStatus', t('component.scanning'), '');
  send({ type: 'SCAN_COMPONENT_CANDIDATES' });
});

/* ---------- 다크 테마 생성 ---------- */
// 문서의 3계층 변수 목록 — 다크 카드가 컬렉션·모드 선택지를 여기서 읽는다(값 편집은 Figma Variables 몫).
let allVars: VarInfo[] = [];
/** GET_VARIABLES 응답을 한 번이라도 받았는지 — 다크 카드가 ‘목록 미로드’와 ‘토큰 없음’을 구분한다. */
let varsLoaded = false;

// 밝은 모드 → 고른 어두운 모드로 채운다. 셀렉트가 플레이스홀더(모드가 아직 없음)일 때만
// to를 생략하고, 그때 플러그인이 addMode('Dark')로 만든다.
// 목록은 시작할 때 한 번 받아 둔다 — 안 받으면 토큰이 있어도 modes=[]로 보여
// ‘토큰 생성으로’라는 엉뚱한 안내가 뜬다.
function refreshDarkOptions(): void {
  const cols = new Map<string, VarInfo>();
  for (const v of allVars) if (!cols.has(v.collectionId)) cols.set(v.collectionId, v);
  const sel = $('darkCollection') as HTMLSelectElement;
  const prev = sel.value;
  sel.innerHTML = '';
  for (const [id, v] of cols) {
    const o = document.createElement('option');
    o.value = id;
    o.textContent = v.collection;
    sel.appendChild(o);
  }
  if (prev && cols.has(prev)) sel.value = prev;
  // Semantic을 우선(다크 채움 대상). 모드 1개여도 Dark를 만들 수 있으므로 ≥1이면 충분.
  const withModes = [...cols.values()].filter((v) => v.modes.length >= 1);
  const usable = withModes.find((v) => v.tier === 2) ?? withModes[0];
  if (usable && (cols.get(sel.value)?.modes.length ?? 0) < 1) sel.value = usable.collectionId;
  // 선택이 비었거나 Global만 잡힌 경우 Semantic으로 끌어올린다.
  if (usable && (!sel.value || cols.get(sel.value)?.tier === 1) && usable.tier === 2) {
    sel.value = usable.collectionId;
  } else if (usable && !sel.value) {
    sel.value = usable.collectionId;
  }
  refreshDarkModes();
}

function refreshDarkModes(): void {
  const colId = ($('darkCollection') as HTMLSelectElement).value;
  const v = allVars.find((x) => x.collectionId === colId);
  const modes = v ? v.modes : [];
  // 이전 선택이 아직 유효하면 복원한다. 복원 여부를 기억해 둬야 아래 기본값이
  // 사용자의 선택을 덮어쓰지 않는다 — 옵션을 새로 넣으면 sel.value는 첫 항목으로
  // 잡히므로, value만 봐서는 ‘사용자가 고른 것’과 ‘브라우저 기본’을 구분 못 한다.
  const restored: Record<string, boolean> = {};
  for (const id of ['darkFromMode', 'darkToMode']) {
    const sel = $(id) as HTMLSelectElement;
    const prev = sel.value;
    sel.innerHTML = '';
    for (const m of modes) {
      const o = document.createElement('option');
      o.value = m.modeId;
      o.textContent = m.name;
      sel.appendChild(o);
    }
    restored[id] = !!prev && modes.some((m) => m.modeId === prev);
    if (restored[id]) sel.value = prev;
  }
  // 모드 ≥1 + Paid면 생성 가능(Dark 없으면 플러그인이 추가). 목록 미로드·토큰 없음만 막는다.
  const hasCollection = !!colId && modes.length >= 1;
  const ok = hasCollection && varsLoaded && allVars.length > 0;
  // 유료 잠금이 전제보다 먼저(§2.3). 전제 사유는 아래 안내 문구와 같다.
  const notice = $('darkPrereq');
  const gotoCreate = $('darkPrereqGotoCreate') as HTMLButtonElement;
  notice.style.display = ok ? 'none' : '';
  const text = notice.querySelector('.prereq-text');
  if (!ok && text) {
    // 목록을 아직 안 받았으면 ‘토큰 없음’이 아니라 로딩 — 오안내(토큰 생성으로)를 막는다.
    if (!varsLoaded) {
      text.textContent = t('dark.prereqLoading');
      gotoCreate.style.display = 'none';
    } else if (allVars.length === 0) {
      text.textContent = t('dark.prereqNoVars');
      gotoCreate.style.display = '';
    } else if (!colId || modes.length === 0) {
      text.textContent = t('dark.prereqNoModes');
      gotoCreate.style.display = 'none';
    } else {
      text.textContent = t('dark.prereqPick');
      gotoCreate.style.display = 'none';
    }
  }
  const darkBtn = $('btnGenDark');
  setLock(darkBtn, !isPaid ? 'paid' : ok ? null : 'prereq', (text?.textContent ?? '') || t('status.noSelection'));
  // to 셀렉트 기본값: 이미 Dark가 있으면 그걸, 없으면 안내 옵션(실제 생성은 플러그인).
  // 단 사용자가 이미 대상 모드를 골라 뒀으면 건드리지 않는다 — 탭을 오갈 때마다
  // (showTab → PREREQ_STATE·VARIABLES → 이 함수) 선택이 Dark나 빈 값으로 되돌아가면
  // 「다크 생성」이 toModeId 없이 나가 사용자의 모드 대신 빈 ‘Dark’를 새로 만든다.
  const toSel = $('darkToMode') as HTMLSelectElement;
  const darkMode = modes.find((m) => m.name.toLowerCase() === 'dark');
  if (!restored['darkToMode']) {
    if (darkMode) {
      toSel.value = darkMode.modeId;
    } else if (modes.length >= 1) {
      // 플레이스홀더 — 값이 실제 modeId가 아니므로 전송하지 않는다(버튼은 from만 보냄).
      const o = document.createElement('option');
      o.value = '';
      o.textContent = t('dark.toPlaceholder');
      toSel.insertBefore(o, toSel.firstChild);
      toSel.value = '';
    }
  }
  // from: Dark가 기본으로 잡히면 다른 모드로.
  const fromSel = $('darkFromMode') as HTMLSelectElement;
  if (modes.length >= 2 && darkMode && fromSel.value === darkMode.modeId) {
    const other = modes.find((m) => m.modeId !== darkMode.modeId);
    if (other) fromSel.value = other.modeId;
  }
}

$('darkCollection').addEventListener('change', refreshDarkModes);

$('btnGenDark').addEventListener('click', () => {
  const collectionId = ($('darkCollection') as HTMLSelectElement).value;
  const fromModeId = ($('darkFromMode') as HTMLSelectElement).value;
  if (!collectionId || !fromModeId) {
    setStatus('darkStatus', t('dark.prereqPick'), 'warn');
    return;
  }
  setStatus('darkStatus', t('dark.running'), '');
  // 고른 대상 모드를 그대로 보낸다 — 플레이스홀더(값 '')일 때만 생략해 themeApply가 Dark를 ensure.
  // 안 보내면 사용자가 고른 `Night` 대신 새 `Dark` 모드가 생기고, 모드 상한에 걸린 파일에선
  // addMode가 실패해 생성 자체가 막힌다.
  const toModeId = ($('darkToMode') as HTMLSelectElement).value;
  send({ type: 'GENERATE_DARK_MODE', collectionId, fromModeId, ...(toModeId ? { toModeId } : {}) });
});

/* ---------- 닮은 프레임 컴포넌트화 ---------- */
// 스캔이 확정한 멤버(구조가 같은 최대 그룹)와 고른 마스터. 컴포넌트화는 이 둘만 보낸다 —
// 제외된 프레임을 실수로 교체 대상에 넣지 않으려면 선택 그대로가 아니라 스캔 결과를 써야 한다.
let similarMemberIds: string[] = [];
let similarMasterId: string | null = null;

$('btnScanSimilar').addEventListener('click', () => {
  setStatus('structureStatus', t('similar.scanning'), '');
  send({ type: 'SCAN_SIMILAR' });
});

$('btnComponentize').addEventListener('click', () => {
  if (similarMemberIds.length < 2 || !similarMasterId) {
    // '후보 스캔'을 하고 '묶기'를 누르는 경우가 잦다 — 묶기는 '닮은 스캔' 결과만 받는다는 걸 말해 준다.
    setStatus('structureStatus', t(compCandidates.length ? 'similar.needScanAfterComp' : 'similar.needScan'), 'warn');
    return;
  }
  setStatus('structureStatus', t('similar.componentizing'), '');
  send({ type: 'COMPONENTIZE_SIMILAR', masterId: similarMasterId, frameIds: similarMemberIds });
});

$('btnRegisterComp').addEventListener('click', () => {
  // #1: 스캔 후보가 있으면 체크한 노드만, 없으면 최상위 선택(폴백).
  if (compCandidates.length) {
    const nodeIds = compCandidates.filter((c) => c.eligible && compChecked.has(c.id)).map((c) => c.id);
    if (!nodeIds.length) {
      setStatus('structureStatus', t('component.noChecked'), 'warn'); // 무반응 방지: 체크 0이면 안내
      return;
    }
    setStatus('structureStatus', t('component.registering'), '');
    // 트리에 보여 준 이름을 그대로 보낸다(WYSIWYG). 이름 충돌은 **후보 전체**를 보고 풀리므로,
    // 일부만 체크해 보내면 code 쪽에서 충돌이 사라져 `ProfileAvatar`가 `Avatar`로 등록됐다.
    const names: Record<string, string> = {};
    for (const c of compCandidates) {
      const shown = c.group ?? c.single;
      if (shown && compChecked.has(c.id)) names[c.id] = shown;
    }
    send({ type: 'REGISTER_COMPONENTS', nodeIds, names });
  } else {
    setStatus('structureStatus', t('component.registering'), '');
    send({ type: 'REGISTER_COMPONENTS' });
  }
});

$('compAll').addEventListener('change', (e) => {
  const on = (e.target as HTMLInputElement).checked;
  compChecked.clear();
  if (on) for (const c of compCandidates) if (c.eligible) compChecked.add(c.id);
  renderCompTree();
});


/**
 * 베리언트 줄(#variantRow) 노출 — 툴바는 와이어대로 스캔→등록 4개만 두고, '이미 만든
 * 컴포넌트를 정리'하는 두 동작은 대상이 실제로 선택돼 있을 때만 결과 목록 아래에 띄운다.
 * 판단 기준은 code 쪽 핸들러와 같다(낱개 COMPONENT=분류 / COMPONENT_SET=누락 조합).
 */
function refreshVariantRow(comps: number, sets: number): void {
  $('variantRow').hidden = comps === 0 && sets === 0;
}

$('btnClassifyVariants').addEventListener('click', () => {
  setStatus('structureStatus', t('component.classifying'), '');
  send({ type: 'CLASSIFY_VARIANTS' });
});

$('btnGenMissing').addEventListener('click', () => {
  setStatus('structureStatus', t('component.generating'), '');
  send({ type: 'GENERATE_MISSING_VARIANTS' });
});

/* ---------- 내보내기 (코드) ---------- */
$('btnExport').addEventListener('click', () => {
  const format = ($('exportFormat') as HTMLSelectElement).value as ExportFormat;
  const fontSizeUnit = ($('exportFontUnit') as HTMLSelectElement).value as 'px' | 'rem';
  const base = Number(($('base') as HTMLInputElement).value) || 16;
  setStatus('exportStatus', t('common.exporting'), '');
  send({ type: 'EXPORT', format, fontSizeUnit, base });
});

/** 내보낸 코드를 그대로 파일로 저장 — 패널에 미리보기를 두지 않으므로 결과는 파일뿐이다. */
function saveExportFile(content: string, format: ExportFormat): void {
  const css = format === 'css';
  const blob = new Blob([content], { type: css ? 'text/css' : 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = css ? 'tokens.css' : 'tokens.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

$('btnClearLicense').addEventListener('click', () => {
  ($('licenseKey') as HTMLInputElement).value = '';
  send({ type: 'CLEAR_LICENSE' });
});

// 결제·구독 관리는 LemonSqueezy 위임 — URL은 code가 licenseConfig에서 해석해 openExternal로 연다.
// 목적지는 티어가 정한다: Free면 결제, Paid면 포털. 버튼이 하나라 클릭 시점의 isPaid를 읽는다
// (검증 직후 티어가 바뀌어도 다음 클릭부터 바로 반영된다).
$('btnLicenseLink').addEventListener('click', () =>
  send({ type: 'OPEN_LICENSE_LINK', target: isPaid ? 'portal' : 'purchase' }),
);

// 배포 전(자리표시자 URL)에는 구독 버튼을 숨긴다 — 눌러도 없는 페이지로 가서 혼란만 준다.
// URL을 실제 값으로 갈아끼우면 조건이 자동으로 풀려 다시 노출된다.
// 요금 한 줄('Free · Paid 연 $39 · 기기 1대')은 링크와 무관한 사실이라 항상 남긴다 —
// 와이어에도 카드 마지막 줄로 있고, 이게 없으면 Free 사용자는 값을 알 방법이 없다.
if (!licenseLinksConfigured()) $('licenseLinkRow').style.display = 'none';
// 검증 서버·공개키가 미설정이면 키를 넣어도 반드시 '서명 검증 실패'가 난다. 그 이유를 미리 밝힌다.
if (!licenseVerifyConfigured()) $('licenseSetupHint').style.display = '';

/* ---------- code → ui ---------- */
window.onmessage = (event: MessageEvent) => {
  const msg = event.data.pluginMessage as CodeToUi | undefined;
  if (!msg) return;
  opReceived(msg); // 진행 테두리·✓/⚠·작업 직후 다시 읽기
  switch (msg.type) {
    case 'EXTRACT_RESULT': {
      tokens = msg.tokens;
      colorsFromPalette = false; // 화면에서 뽑은 색 — 기존 팔레트를 지울 근거가 없다
      colorsCreated = false;
      resetTokenChecked(); // 새 추출 = 새 집합 → 전체 선택으로 시작
      clearNumTidy(); // 이전 추출의 정리 스냅샷으로 되돌아가지 않게
      // #3: 추출 색을 hue-Global 이름으로 정규화. **이름만** 정리하고 색은 합치지 않는다 —
      // 같은 hue·단계에 떨어진 색은 `color/gray/100`, `color/gray/100-2`로 각자 변수가 된다.
      // (예전 N:1 병합은 합쳐진 색의 hex를 버려, 바인딩이 그 레이어를 `매칭 없음`으로 남겼다.
      //  "변수가 몇 개 더 생긴다"보다 "내 색이 연결 안 됐다/바뀌었다"가 훨씬 큰 불만이다.)
      huefyTokenColors(tokens);
      ($('btnCreateApply') as HTMLButtonElement).style.display = 'none'; // 토큰 집합 변경 → 새 미리보기 필요
      // #10: 추출 색에서도 시맨틱 매핑 추천(비어 있을 때만 — 사용자 편집 보존).
      suggestSemMapFrom(tokens);
      renderColorTable(); // colorRevealed면 색 표(추출 버튼이 켬)
      renderTokens(); // previewRevealed면 색 외 목록(미리보기 버튼이 켬)
      const colorN = tokens.filter((tk) => tk.category === 'color').length;
      $('selInfo').textContent = t('color.selInfo', { n: msg.selection, c: colorN, o: tokens.length - colorN });
      // 경고가 있으면 그걸, 없는데 빈손이면 최소한 빈손이라는 말을. 둘 다 아니면
      // renderColorTable이 쓴 요약 줄을 그대로 남긴다.
      // (#colorStatus는 #colorSection 밖이라 색이 0개여도 보인다.)
      if (msg.warnings.length) setStatus('colorStatus', msg.warnings.join(' '), 'warn');
      else if (!tokens.length) setStatus('colorStatus', t('color.extractEmpty'), 'warn');
      if (pendingCreatePreview) {
        // ‘미리보기’가 추출을 유발 → 추출 완료 후 생성 미리보기까지 이어감.
        pendingCreatePreview = false;
        tidyNumbers(); // #19: 버튼 경로와 같게 격자 8 스냅 후 미리보기
        renderTokens();
        const base = Number(($('base') as HTMLInputElement).value) || 16;
        createFrom = 'tokens';
        send({ type: 'CREATE_TOKENS', tokens: tokensToCreate(), base, preview: true });
      }
      break;
    }
    case 'SELECTION_STATE': {
      lastSelCount = msg.count;
      onSelectionForList(msg); // 변수 목록 기준(③) — 플러그인이 만든 선택은 기준을 바꾸지 않는다
      // 준비 현황의 '완료'는 현재 선택 기준 — 선택이 바뀌면 다시 판정한다.
      // Global/Semantic이 없으면(컬렉션을 지우고 처음부터 하는 QA 흐름, 또는 다른 파일에서 복사해 온
      // 프레임) 이전 이름 정리 기록이 남아 있어도 '처음'으로 본다 — 변수가 없으면 어차피 전부 다시 한다.
      lastSelBound = msg.bound;
      lastSelRenamed = msg.renamed;
      applySelectionDone();
      // 연결 현황 자동 읽기 — 선택이 작고(≤ AUTO_SCAN_MAX) 바인딩이 있을 때만(Tokens Studio처럼 선택 기준 표시).
      // 큰 선택은 버튼으로(Design Lint 방식) — 선택만 바꿔도 플러그인이 버벅이면 안 된다.
      refreshVariantRow(msg.comps, msg.sets);
      // 스킵 칩이 만든 선택 변경(selfSelect)이면 미리보기를 유지한다 — 지우면 칩을 한 번 누르는 순간
      // 칩 줄과 체크해둔 후보가 통째로 사라져 두 번째 사유를 볼 수 없다.
      if (!msg.selfSelect) {
        // 사용자의 선택 변경 → 진행 중이던 연결 카드 요청은 무효(이전 선택의 결과가 늦게 와도 버린다).
        nextBindReq();
        hideApplyProgress();
        clearBindPreview();
        $('bindDone').hidden = true;
        $('tsApplyResult').hidden = true;
        layerLibUse = null; // 라이브러리 사용 여부는 새 선택으로 다시 읽는다(§4.6 ②)
        if (activeTab === 'layer') readLayerLibUse();
      } else if (bindLayerSelectPending) {
        bindHereSel = true; // 이 화면이 만든 선택(사유 칩·레이어 머리) — 복귀해도 아무것도 하지 않는다
      } else if (hasBindPreview()) {
        bindForeignSel = true; // 다른 화면에서 플러그인이 바꾼 선택 — 복귀하면 "다른 선택에서 만든 결과예요"
      }
      bindLayerSelectPending = false;
      renderBindPrereq();
      if (!tokens.length) renderTokens(); // 선택 변화에 맞춰 빈 상태 문구 갱신
      refreshTreeEmptyStates(); // 바인딩·컴포넌트 카드 빈 상태 갱신
      break;
    }
    case 'CREATE_RESULT': {
      const applyBtn = $('btnCreateApply') as HTMLButtonElement;
      if (msg.preview) {
        // UX1: 변경 요약을 먼저 보여주고 ‘적용’ 버튼 노출.
        setStatus('createStatus', t('create.preview', { summary: msg.summary }), '');
        applyBtn.style.display = '';
      } else if (createFrom === 'colors') {
        // 「색 변수 만들기」 결과 — Global(hue)까지 끝났으니 역할 별칭(Semantic)을 이어서.
        createFrom = 'tokens';
        colorsCreated = true;
        const semMap = textToSemanticMap(($('semMap') as HTMLTextAreaElement).value);
        semStatusTarget = 'colorStatus'; // 이어지는 시맨틱 결과는 방금 누른 색 카드에 뜬다
        if (!wizardRunning && Object.keys(semMap).length) {
          semStatusPrefix = msg.summary;
          send({ type: 'CREATE_SEMANTICS', map: semMap });
        }
        setStatus('colorStatus', msg.summary, 'ok');
        renderTokens(); // 토큰 단계의 '색 변수 N개 이미 생성됨' 안내 갱신
      } else {
        setStatus('createStatus', msg.summary, 'ok');
        applyBtn.style.display = 'none';
        // 2.5 카드 숨김(자동 흡수): 토큰 생성 적용 시 자동 추천 매핑으로 역할 별칭(Semantic)도 자동 생성.
        // 마법사는 자체 semantics 단계가 있어 제외(메인 핸들러와 동시 수신 → 이중 생성 방지).
        if (!wizardRunning) {
          const semMap = textToSemanticMap(($('semMap') as HTMLTextAreaElement).value);
          semStatusTarget = 'createStatus'; // 이어지는 시맨틱 결과는 방금 누른 토큰 카드에 뜬다
          if (Object.keys(semMap).length) {
            semStatusPrefix = msg.summary;
            send({ type: 'CREATE_SEMANTICS', map: semMap });
          }
        }
      }
      break;
    }
    case 'PROGRESS':
      if (msg.op === 'bind') updateApplyProgress(msg.done, msg.total); // UX6
      break;
    case 'APPLY_RESULT': {
      if (!isCurrentBindReply(msg.reqId)) break; // 선택이 바뀐 뒤 도착한 이전 요청의 결과
      hideApplyProgress(); // UX6
      const silent = msg.preview && msg.reqId !== undefined && msg.reqId === bindSilentReq;
      bindSilentReq = 0;
      if (isMini && msg.preview) bindPreviewMini = true; // 최소화 중에 끝난 미리보기 — 펼쳐도 다시 계산하지 않는다
      bindSkips = msg.skips ?? [];
      // 스킵 목록은 상한에서 잘린다(bind.ts SKIP_PREVIEW_CAP) — 잘렸으면 칩 툴팁이 그렇다고 말한다.
      bindSkipsCapped = (msg.skipTotal ?? bindSkips.length) > bindSkips.length;
      if (msg.cancelled) {
        // UX6: 취소 — 처리한 만큼만 적용(비파괴). 찾기 취소는 "찾기 전"과 같다(§4.6 단계 표).
        // clearBindPreview가 칩을 지우므로 사유는 상태 글로 남긴다.
        clearBindPreview();
        setStatus('applyStatus', t('apply.cancelled'), 'warn');
      } else if (msg.preview) {
        // 찾은 곳을 변수 카드로. 처음에는 모든 변수를 켠다.
        const prev = bindCandidates;
        const prevChecked = new Set(bindChecked);
        bindCandidates = msg.candidates ?? [];
        bindNodes = msg.nodes ?? [];
        bindPreviewed = true;
        bindChecked.clear();
        renderSkipReasons(msg.reasons ?? {});
        if (silent) {
          // 조용한 재계산: 스위치는 변수 단위로 이어받고, 달라졌을 때만 알린다(§4.6 ⑧). 건너뜀 펼침은 그대로.
          const r = carryChecks(prev, prevChecked, bindCandidates);
          for (const k of r.checked) bindChecked.add(k);
          if (r.added || r.removed) showStatusLine(t('bind.candChanged', { a: r.added, b: r.removed }));
        } else {
          bindSkipsOpen = false;
          for (const c of bindCandidates) bindChecked.add(candKey(c));
        }
        renderBindTree();
        // 찾은 곳·건너뜀은 배지가 말한다 — 상태 글은 비운다.
        setStatus('applyStatus', '', '');
      } else {
        // 연결 후 — 배지 줄·필터·카드를 지우고 결과 카드 하나 + (다시 확인해서 건너뛴 곳이 있으면) 건너뜀 배지(§4.6).
        clearBindPreview();
        bindSkips = msg.skips ?? [];
        bindSkipsCapped = (msg.skipTotal ?? bindSkips.length) > bindSkips.length;
        renderSkipReasons(msg.reasons ?? {});
        setStatus('applyStatus', '', '');
        $('bindDoneText').textContent = t('bind.doneCard', { n: msg.bound });
        $('bindDone').hidden = false;
        renderBindTree();
      }
      break;
    }
    case 'VAR_TABLE':
      onVarTable(msg);
      renderBindEmpty(); // 찾기 전 예시는 이 파일의 변수에서(§4.6)
      break;
    case 'USAGE_RESULT':
      onUsageResult(msg);
      break;
    case 'VAR_USERS':
      onVarUsers(msg);
      break;
    case 'VARIABLE_UPDATED':
      onVariableUpdated(msg);
      break;
    case 'SELECT_RESULT':
      // 변수 탭에서 고른 레이어 선택 — 결과는 공통 상태 줄(§4.4: 한 번에 최대 200개).
      if (selectStatusTarget === 'list') {
        if (msg.capped) showStatusLine(t('select.capped', { found: msg.found, requested: msg.requested }), { cls: 'warn' });
        else if (!msg.found) showStatusLine(t('select.none'), { cls: 'warn' });
        else if (msg.found < msg.requested) showStatusLine(t('select.partial', { found: msg.found, missing: msg.requested - msg.found }), { cls: 'warn' });
        break;
      }
      // 미리보기 이후 레이어가 지워졌거나 다른 페이지로 옮겨졌으면 그만큼 못 찾는다 — 조용히 실패하지 않게.
      if (msg.capped) {
        setStatus(selectStatusTarget, t('select.capped', { found: msg.found, requested: msg.requested }), 'warn');
      } else if (msg.found < msg.requested) {
        setStatus(selectStatusTarget, msg.found
          ? t('select.partial', { found: msg.found, missing: msg.requested - msg.found })
          : t('select.none'), 'warn');
      }
      break;
    case 'RENAME_RESULT':
      renderRenameResult(msg);
      break;
    case 'SEMANTICS_RESULT':
      // 마법사가 돌려도 만들기 탭의 역할 카드에 결과를 남긴다 — 탭을 열었을 때 "무슨 일이 있었나"가 보여야 한다.
      setStatus(
        semStatusTarget,
        (semStatusPrefix ? `${semStatusPrefix} · ` : '') +
          t('semantic.result', { aliased: msg.aliased, created: msg.created, updated: msg.updated }) +
          (msg.missing.length ? t('semantic.missing', { names: msg.missing.join(', ') }) : ''),
        msg.missing.length ? 'warn' : 'ok',
      );
      semStatusPrefix = '';
      break;
    case 'TEXT_STYLE_CANDIDATES': {
      // 「왼쪽 글자로 이름 채우기」는 스캔이 실제 표본을 물어왔을 때만 누를 것이 있다.
      // 램프 폴백(styles 0)은 캔버스에서 온 글자가 아니라 행 라벨을 찾을 데가 없다.
      ($('btnTsRowLabels') as HTMLButtonElement).disabled = !msg.styles.length;
      if (msg.styles.length) {
        // 「왼쪽 글자로 이름 채우기」(labeled)는 **스캔 표본의 이름만** 다시 매기는 동작이다.
        // 표를 통째로 갈아끼우면 그 사이 「행 추가」로 손수 만든 행이 말없이 사라진다 —
        // 캔버스에서 온 행이 아니라(nodeIds 없음) 다시 계산해 줄 수 없는 행이라 남긴다.
        // (맨 스캔은 '선택에서 다시 만들기'라 통째 교체가 맞다.)
        const tsSig = (s: TextStyleSpec) => `${s.fontSize}|${s.lineHeight}|${s.letterSpacing}|${s.family}|${s.style}`;
        const incoming = new Set(msg.styles.map(tsSig)); // 같은 타이포가 두 줄로 늘어나지 않게
        const manual =
          msg.labeled != null ? tsSpecs.filter((s) => !s.nodeIds?.length && !incoming.has(tsSig(s))) : [];
        tsSpecs = [...msg.styles.map((x) => ({ ...x })), ...manual];
        // 이름 출처는 「왼쪽 글자로 이름 채우기」를 누른 뒤에만 적는다 — 맨 스캔은 전부 크기 순이라
        // `왼쪽 글자 0`이 실패처럼 읽힌다. 와이어 상태 줄: 신규 · 등록됨 · 왼쪽 글자 · 크기 순.
        tsScanNote = {
          namePart: msg.labeled != null ? t('textStyle.nameSplit', { a: msg.labeled, b: msg.fallback ?? 0 }) : '',
          warnings: msg.warnings,
        };
        renderTextStyles(); // 상태줄까지 여기서 쓴다
      } else {
        tsSpecs = rampToSpecs(DEFAULT_TS_FAMILY);
        tsScanNote = { namePart: '', warnings: [] };
        renderTextStyles();
        // 램프는 스캔 결과가 아니라 폴백 — 개수 요약 대신 무슨 일이 있었는지를 덮어쓴다.
        setStatus('tsStatus', t('textStyle.fallbackRamp'), 'warn');
      }
      break;
    }
    case 'TEXT_STYLES_RESULT':
      setStatus(
        'tsStatus',
        t('textStyle.registered', { n: msg.created + msg.updated, c: msg.created, u: msg.updated, b: msg.bound }) +
          // 알림은 경고와 분리 — 행간 %처럼 '의도된 미바인딩'을 미연결로 적으면 정상 동작이 경고로 읽힌다.
          (msg.notes.length ? ` · ${msg.notes.join(' · ')}` : '') +
          (msg.missing.length ? t('textStyle.unlinked', { names: msg.missing.join(', ') }) : ''),
        msg.missing.length ? 'warn' : 'ok',
      );
      break;
    case 'TEXT_STYLES_APPLIED': {
      // 결과는 버튼 아래 한 줄(§4.6) — "✓ 텍스트 {n}개에 스타일 연결 · 건너뜀 {m}".
      const line = $('tsApplyResult');
      // m = 건너뛴 텍스트 레이어 수, 사유별 수는 툴팁(§4.6).
      line.textContent = t('bind.tsDone', { n: msg.applied }) + (msg.skipped ? t('bind.doneSkipped', { m: msg.skipped }) : '');
      line.title = Object.entries(msg.skipReasons ?? {})
        .filter(([, n]) => n > 0)
        .map(([k, n]) => `${t('tsSkip.' + k)} ${n}`)
        .join(' · ');
      line.hidden = false;
      break;
    }
    case 'COLLECTIONS':
      // 존재 확인용 프로브(별도 UI 없음).
      break;
    case 'COLLECTION_ROLES':
      renderCollectionRoles(msg.collections);
      break;
    case 'GLOBAL_COLORS':
      // #10: 기존 Global 색에서 역할 추천 → 시맨틱 매핑 textarea 채움(재방문 매핑).
      // 자동 요청은 비어 있을 때만 채운다 — 사용자가 이미 고른 역할을 덮으면 안 된다.
      if (!msg.colors.length) {
        if (!autoGlobalScan) setStatus(semStatusTarget, t('semantic.noGlobals'), 'warn');
      } else if (!autoGlobalScan || !($('semMap') as HTMLTextAreaElement).value.trim()) {
        setSemMapText(suggestSemanticMap(msg.colors));
        renderColorTable(); // 이미 색이 떠 있으면 역할 드롭다운을 새 맵으로 다시 채운다
        if (!autoGlobalScan) setStatus(semStatusTarget, t('semantic.suggested', { count: msg.colors.length }), 'ok');
      }
      autoGlobalScan = false;
      break;
    case 'PREREQ_STATE':
      // #11: 단계 전제 갱신 → 통합 게이트 재평가 + 진행 안내(§3).
      prereqKnown = true;
      prereqInFlight = false;
      reentry.release();
      hasColorVars = msg.hasColorVars;
      hasScaleVars = msg.hasScaleVars;
      hasGlobal = msg.hasGlobal;
      hasBindable = msg.hasBindable;
      prereqLocalVars = (msg.tierVars ?? 0) + (msg.otherVars ?? 0);
      if (activeTab === 'layer') queueMicrotask(readLayerLibUse); // 로컬 변수 0개가 확인되면 ② 판정용으로 읽는다
      hasDarkMode = msg.hasDarkMode;
      hasTextStyles = msg.hasTextStyles;
      hasSemanticRoles = msg.hasSemanticRoles;
      updateGates();
      applySelectionDone(); // renderPipeline 포함 — 변수 유무가 '처음/다시' 판정을 바꾼다
      requestGlobalRoles(); // #10: 이미 색 변수가 있는 파일이면 지난번 역할을 불러온다
      break;
    case 'LICENSE_STATUS': {
      // 상태값(active/grace/expired)은 한국어로(결정 5-(b)). FREE/PAID는 그대로(§2.9 예외).
      const statusPart = msg.status ? t('license.srcKeyStatus', { status: t(`license.status.${msg.status}`) }) : '';
      const source =
        msg.source === 'key' ? t('license.srcKey', { statusPart }) : msg.source === 'dev' ? t('license.srcDev') : t('license.srcNone');
      const expPart = msg.expiresAt ? t('license.expires', { date: new Date(msg.expiresAt).toISOString().slice(0, 10) }) : '';
      $('licenseInfo').textContent = t('license.current', { tier: msg.tier.toUpperCase(), source, expPart });
      // 개발용 토글은 검증 키가 없을 때만 의미가 있으므로, 키가 적용 중이면 표시만 동기화
      if (__DEV__ && msg.source !== 'key') ($('tier') as HTMLSelectElement).value = msg.tier;
      if (msg.note) {
        setStatus('licenseStatus', msg.note, msg.noteKind ?? 'ok');
        // 원문 사유는 툴팁으로(setStatus가 title을 비운 뒤에 단다 — 없는 알림이면 비운 채로).
        if (msg.noteTip) $('licenseStatus').title = msg.noteTip;
      }
      // Free/Paid 2티어 — 유료면 모든 유료 기능 해금.
      isPaid = msg.unlimited;
      updateGates();
      break;
    }
    case 'EXPORT_RESULT': {
      const label = msg.format === 'css' ? 'CSS' : 'W3C JSON';
      // 변수가 없으면 껍데기만 남는다('{}' / ':root {}'). 빈 파일을 조용히 떨어뜨리면
      // 저장된 줄 알고 넘어가니, 파일 대신 이유를 말한다.
      if (!exportHasTokens(msg.content, msg.format)) {
        setStatus('exportStatus', t('export.empty'), 'warn');
        break;
      }
      saveExportFile(msg.content, msg.format);
      setStatus('exportStatus', t('export.saved', { format: label, file: msg.format === 'css' ? 'tokens.css' : 'tokens.json' }), 'ok');
      break;
    }
    case 'COMPONENT_CANDIDATES': {
      // #1: 하위 등록 후보를 트리로. **반복 이름(group) + 속성접힘(propsOnly)만 기본 체크** —
      // 잡음(컨테이너/래퍼 단발성)은 체크 해제 상태로 두고, 사용자가 필요시 추가 체크.
      compCandidates = msg.nodes;
      compChecked.clear();
      for (const c of msg.nodes) if (c.eligible && (c.group || c.propsOnly)) compChecked.add(c.id);
      renderCompTree();
      // 다시 스캔했으면 이전 등록/분류 리포트는 남의 얘기다. 개수를 카드 제목에 올린 뒤로는
      // 카드를 접어 둬도 옛 수치가 계속 보여, 새 후보와 짝이 안 맞는다.
      renderVariantReport([]);
      // 스캔 완료 시 반드시 ‘스캔 중’을 덮어쓴다(후보 0·비eligible만 있어도).
      if (!compCandidates.length || !compEligibleCount()) {
        setStatus('structureStatus', t('component.noEligible'), 'warn');
      } else {
        updateCompRegister();
      }
      break;
    }
    case 'COMPONENTS_RESULT': {
      clearCompPreview(); // 등록으로 노드 구조 변경 → 후보 무효화
      const misplaced = msg.placeFailed ?? [];
      const cloned = msg.placeCloned ?? [];
      const propFailed = msg.propFailed ?? [];
      const fillKept = msg.fillKept ?? [];
      // 건너뜀 = 컴포넌트로 만들지 못한 대상 수(§4.7 6번 · 용어 §2.9). 자리 결과는 꼬리 두 개로 따로 센다.
      const extraPart =
        (msg.skipped ? t('component.extraSkipped', { n: msg.skipped }) : '') +
        (msg.singles.length ? t('component.extraSingles', { n: msg.singles.length }) : '') +
        (msg.exposed ? t('component.extraProps', { n: msg.exposed }) : '') +
        (msg.icons ? t('component.extraIcons', { n: msg.icons }) : '') +
        placeTailText('component.propFailed', propFailed) +
        placeTailText('component.fillKept', fillKept) +
        placeTailText('component.placeCloned', cloned) +
        placeFailedText(misplaced);
      // 속성 값을 못 넣었거나(6번) 원본을 그대로 뒀거나 복사본으로 채웠거나 비운 자리(5번)가 있으면 성공이어도 경고(§4.7 "인스턴스 자리").
      setStatus('structureStatus', t('component.registered', { registered: msg.registered, sets: msg.sets, extraPart }), (msg.registered || msg.sets) && !misplaced.length && !cloned.length && !propFailed.length && !fillKept.length ? 'ok' : 'warn');
      // 빈 조합(미생성) + 실패(진단) 리포트
      renderVariantReport(variantIssueSections(msg.missing, msg.failures));
      break;
    }
    case 'VARIANTS_RESULT': {
      renderVariantReport(variantIssueSections(msg.missing, msg.failures));
      const extraPart = (msg.singles.length ? t('component.extraSingles', { n: msg.singles.length }) : '') + (msg.missing.length ? t('component.extraMissing') : '');
      setStatus('structureStatus', t('component.variants', { sets: msg.sets, extraPart }), msg.sets ? 'ok' : 'warn');
      break;
    }
    case 'GENERATE_RESULT': {
      renderVariantReport([{ tag: t('component.tagAdded'), items: msg.combos, marker: 'added' }]);
      setStatus('structureStatus', t('component.generated', { generated: msg.generated, sets: msg.sets }), msg.generated ? 'ok' : 'warn');
      break;
    }
    case 'UI_SIZE': {
      // 최소화/펼치기 확인 — 화면은 setMini가 이미 바꿨다. 다른 값이면(드문 경합) code 쪽을 따른다.
      if ((msg.mode === 'mini') !== isMini) setMini(msg.mode === 'mini', false);
      break;
    }
    case 'SETTINGS': {
      ($('base') as HTMLInputElement).value = String(msg.base);
      ($('depth') as HTMLInputElement).value = String(msg.maxDepth);
      ($('grid') as HTMLInputElement).value = String(msg.grid);
      setComponentsBeta(msg.componentsBeta === true, false);
      break;
    }
    case 'VARIABLES': {
      varsLoaded = true;
      allVars = msg.vars;
      refreshDarkOptions();
      // 만들기 탭이 비어 보이지 않게 — 파일에 이미 있는 변수 수를 카드 상태 줄에(목록은 다음 버전).
      if (!tokens.length) {
        const globals = allVars.filter((v) => v.tier === 1);
        const colors = globals.filter((v) => v.name.startsWith('color/')).length;
        const others = globals.length - colors;
        const roles = allVars.filter((v) => v.tier === 2).length;
        if (globals.length) {
          setStatus('colorStatus', t('color.fileVars', { n: colors, roles }), '');
          setStatus('createStatus', t('create.fileVars', { n: others }), '');
        }
      }
      break;
    }
    case 'DARK_MODE_RESULT': {
      if (msg.error) {
        setStatus('darkStatus', msg.error, 'warn');
        break;
      }
      if (!msg.realiased) {
        const why = msg.skipped ? t('dark.whyNoGlobal', { n: msg.skipped }) : t('dark.whyNone');
        const modePart = msg.modeCreated ? t('dark.modeAdded') : '';
        setStatus('darkStatus', t('dark.fillFailed', { modePart, why }), 'warn');
        break;
      }
      const modePart = msg.modeCreated ? t('dark.modeAddedShort') : '';
      const skipPart = msg.skipped ? t('dark.skippedDirect', { n: msg.skipped }) : '';
      setStatus('darkStatus', t('dark.done', { modePart, n: msg.realiased, c: msg.created, skipPart }), 'ok');
      break;
    }
    case 'SIMILAR_CANDIDATES':
      renderSimilar(msg);
      break;
    case 'COMPONENTIZE_RESULT': {
      if (!msg.instances) {
        // 교체가 하나도 없으면 실패다 — 경고를 그대로 보여줘야 원인을 안다. 제자리에 못 둔 것도 같은 꼬리로(§4.7 5번).
        const misplaced0 = msg.placeFailed ?? [];
        const first = msg.warnings.find((w) => !isPlaceFailWarning(w, misplaced0));
        const warnPart = first ? t('similar.failedWarn', { warning: first }) : '';
        setStatus('structureStatus', t('similar.failed', { warnPart }) + placeFailedText(misplaced0), 'warn');
        break;
      }
      const parts = [t('similar.resMaster', { name: msg.master }), t('similar.resInstances', { n: msg.instances })];
      if (msg.properties) parts.push(t('similar.resProps', { n: msg.properties }));
      if (msg.images) parts.push(t('similar.resImages', { n: msg.images }));
      // 경고(제외·오버라이드 실패)는 성공했어도 반드시 노출 — 원본이 남아 있다는 신호다.
      // 제자리에 못 둔 것은 따로 이름까지 적는다(§4.7 5번) — 경고 목록에서는 빼고 센다(같은 일을 두 번 세지 않게).
      const misplaced = msg.placeFailed ?? [];
      const others = msg.warnings.length - misplaced.length;
      const firstOther = msg.warnings.find((w) => !isPlaceFailWarning(w, misplaced));
      const warn = others > 0 && firstOther ? t('similar.resKept', { n: others, warning: firstOther }) : '';
      setStatus('structureStatus', `${parts.join(' · ')}${warn}${placeFailedText(misplaced)}`, msg.warnings.length ? 'warn' : 'ok');
      // 교체된 프레임은 더 이상 대상이 아니다 — 목록을 비워 이중 실행을 막는다.
      similarMemberIds = [];
      similarMasterId = null;
      $('similarList').innerHTML = '';
      $('similarCount').textContent = '';
      $('similarGroup').style.display = 'none';
      break;
    }
    case 'PREMIUM_REQUIRED': {
      // 기능에 맞는 카드 영역으로 라우팅 — 거부 안내는 사용자가 누른 카드에 떠야 한다.
      // (컴포넌트는 ‘적용’ 탭, 프리셋은 ‘관리’ 탭, 나머지는 ‘만들기’ 탭)
      // IA v3: 잠금 사유는 공통 상태 줄로(§2.3). 카드 상태 영역은 그 카드 작업의 결과 요약만 남긴다.
      showPaidReason();
      break;
    }
    case 'REQUEST_VERIFY':
      // code가 캐시된 키의 (재)검증을 요청 — 보관된 instanceId로 같은 기기에 validate 후 보고.
      void verifyAndReport(msg.key, msg.instanceId);
      break;
    case 'REQUEST_DEACTIVATE':
      // 키 제거 시 이 기기의 LS 활성화 슬롯 반납(best-effort).
      void deactivateInstance(msg.key, msg.instanceId);
      break;
    case 'ERROR': {
      // 고치기 저장 중 응답·표가 오지 않음(§4.4 고치기) — "저장됐을 수 있어요". 고치기 오류는 팝업 안에서만 알린다.
      if (msg.op === 'UPDATE_VARIABLE' || msg.op === 'GET_VAR_TABLE') edMaybeSaved();
      if (msg.op === 'UPDATE_VARIABLE') break;
      // UX7: 실패한 작업 영역에 친절한 메시지 + 복구 행동 + (가능하면) 다시 시도.
      // 레이어 선택은 부른 자리가 여럿이라 표를 못 쓴다 — 마지막으로 부른 쪽을 따른다.
      const statusId = msg.op === 'SELECT_NODES'
        ? selectStatusTarget
        : resolveStatusId((msg.op && OP_STATUS[msg.op]) || 'colorStatus');
      if (msg.op === 'APPLY') hideApplyProgress();
      showError(statusId, explainError(msg.message));
      break;
    }
  }
};

/* ---------- UX7: 오류 라우팅/표시 ---------- */
const OP_STATUS: Record<string, string> = {
  EXTRACT: 'colorStatus',
  CREATE_TOKENS: 'createStatus',
  CREATE_SEMANTICS: 'semStatus',
  SCAN_TEXT_STYLES: 'tsStatus',
  NAME_TEXT_STYLES_BY_ROW: 'tsStatus',
  CREATE_TEXT_STYLES: 'tsStatus',
  // 옛 `tsApplyStatus`가 사라졌다고 매핑까지 빼면 폴백(colorStatus)으로 흘러가는데,
  // 그 줄은 다른 단계에 있어 숨겨져 있다 — 실패가 '적용 중…'인 채로 조용히 묻힌다.
  APPLY_TEXT_STYLES: 'applyStatus',
  APPLY: 'applyStatus',
  // 실제 자리는 부른 쪽이 정한다(selectStatusTarget) — 여기 값은 resolveStatusId가 못 받는
  // 경로를 위한 폴백일 뿐이다.
  SELECT_NODES: 'applyStatus',
  RENAME: 'renameStatus',
  EXPORT: 'exportStatus',
  SCAN_COMPONENT_CANDIDATES: 'structureStatus',
  REGISTER_COMPONENTS: 'structureStatus',
  CLASSIFY_VARIANTS: 'structureStatus',
  GENERATE_MISSING_VARIANTS: 'structureStatus',
  SET_LICENSE: 'licenseStatus',
  LICENSE_VERIFIED: 'licenseStatus',
  CLEAR_LICENSE: 'licenseStatus',
  GET_LICENSE: 'licenseStatus',
};

function showError(id: string, f: FriendlyError): void {
  const el = $(id);
  el.className = 'status';
  el.innerHTML = '';
  if (id === 'licenseStatus') el.removeAttribute('title'); // 이전 알림의 툴팁(noteTip)이 오류 박스에 남지 않게
  // 에러 = 빨강 콜아웃 박스(캐논 108:2 패턴) + (가능하면) 다시 시도.
  const box = document.createElement('div');
  box.className = 'ux danger';
  const h = document.createElement('div');
  h.className = 'ux-h';
  const title = document.createElement('span');
  title.className = 'ux-t';
  title.textContent = f.message;
  h.appendChild(title);
  box.appendChild(h);
  if (f.action) {
    const g = document.createElement('div');
    g.className = 'hint';
    g.textContent = f.action;
    box.appendChild(g);
  }
  if (f.retryable && lastSentMsg) {
    const retry = lastSentMsg;
    const btn = document.createElement('button');
    btn.className = 'primary';
    btn.textContent = t('common.retry');
    btn.addEventListener('click', () => send(retry));
    box.appendChild(btn);
  }
  el.appendChild(box);
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
  /** 행 앞 종류 배지(예: 세트/단독). text=라벨, kind=색 클래스(set|single). */
  badge?: { text: string; kind: 'set' | 'single' };
  /** 대상이 아닌 이유. 있으면 흐린 행 + 사유(reason) + 꼬리표(meta), 체크 불가.
   *  리네임=보존(잠금) · 바인딩=건너뜀(스킵). */
  keep?: { reason: string; meta: string };
  /** 바인딩 줄 — `채움 색 ■ #fff = color/bg`. connected=이미 연결됨('='), 아니면 연결 예정('→'). 취소선 없음(값은 그대로다). */
  bind?: { label: string; value: string; variable: string; connected: boolean; tip: string };
  /** 한 줄이 여러 후보를 합친 것(네 방향 여백 등) — 체크는 이 키들을 함께 켜고 끈다. */
  keys?: string[];
  /** 그룹 머리를 누르면 캔버스에서 이 레이어를 선택한다. */
  selectId?: string;
}

/** 선택 서브트리의 최소 depth(루트 기준)로 들여쓰기를 정규화한다. */
function baseDepth(rows: TreeRow[]): number {
  return rows.reduce((m, r) => Math.min(m, r.depth), Infinity);
}

/** 선택형 트리 1행. base는 들여쓰기 기준 depth. */
function makeTreeRow(r: TreeRow, base: number, checked: Set<string>, onChange: () => void, readOnly = false): HTMLElement {
  const indent = `${(r.depth - base) * 12}px`;

  // 손대지 않은 레이어는 '아무 일도 안 일어난 것'과 구분해서 보여 준다 — 흐린 카드 + 사유.
  // 그냥 빼 버리면 왜 그 레이어만 빠졌는지 알 길이 없어 버그로 읽힌다(#7b 보존 · #6 건너뜀).
  if (r.change === undefined && r.keep) {
    const title = document.createElement('span');
    title.className = 'tree-name';
    title.textContent = r.name;
    const card = resultCard({ title, titleMono: true, summary: r.keep.reason, meta: r.keep.meta, dim: true });
    card.style.marginLeft = indent;
    return card;
  }

  // 맥락 노드·헤더는 카드가 아니라 그룹 머리다 — 고를 대상이 아니고, 어디에 속한
  // 변경인지만 알려준다(#18: 트리 = 그룹 헤더 + 자식 카드).
  if (r.change === undefined) {
    const group = resultGroup(r.name);
    group.style.marginLeft = indent;
    if (!r.header) group.classList.add('ctx');
    if (r.selectId) {
      // 어느 레이어인지 캔버스에서 바로 찾게 — 목록의 이름만으로는 같은 이름이 여럿일 때 모른다.
      const id = r.selectId;
      group.classList.add('pick');
      group.title = t('bind.layerSelectTip');
      group.setAttribute('role', 'button');
      group.tabIndex = 0;
      group.addEventListener('click', () => selectNodes([id], 'applyStatus'));
      group.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectNodes([id], 'applyStatus'); } });
    }
    return group;
  }

  const keys = r.keys ?? [r.id];
  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.checked = keys.every((k) => checked.has(k));
  cb.addEventListener('change', () => {
    for (const k of keys) {
      if (cb.checked) checked.add(k);
      else checked.delete(k);
    }
    onChange();
  });

  if (r.bind) {
    const b = r.bind;
    const title = document.createElement('span');
    const swatch = isHexColor(b.value) ? `<span class="bf-swatch" style="background:${escapeHtml(b.value)}"></span>` : '';
    title.innerHTML =
      `<span class="bf-label">${escapeHtml(b.label)}</span> ${swatch}<span class="bf-val">${escapeHtml(b.value)}</span> ` +
      `<span class="bf-op">${b.connected ? '=' : '→'}</span> <span class="after">${escapeHtml(b.variable)}</span>`;
    title.title = b.tip;
    const card = resultCard({ ...(readOnly ? {} : { check: cb }), title, titleMono: true });
    card.style.marginLeft = indent;
    return card;
  }

  // 이름 보존(컴포넌트 등록)은 취소선 없이 그대로, 교체(리네임·바인딩)는 before → after.
  const title = document.createElement('span');
  const nameCls = r.replace === false ? 'tree-name' : 'before';
  title.innerHTML = `<span class="${nameCls}">${escapeHtml(r.name)}</span> → <span class="after">${escapeHtml(r.change)}</span>`;
  title.title = `${r.name} → ${r.change}`;

  const card = resultCard({ ...(readOnly ? {} : { check: cb }), title, titleMono: true, meta: r.badge?.text });
  if (r.badge) {
    const meta = card.querySelector('.r-meta') as HTMLElement;
    meta.className = `tag tag-${r.badge.kind}`;
  }
  card.style.marginLeft = indent;
  return card;
}

function renderSelectableTree(
  mount: HTMLElement,
  rows: TreeRow[],
  checked: Set<string>,
  opts: { onChange: () => void; hideContext: boolean; hideKeep?: boolean; readOnly?: boolean },
): void {
  const base = rows.length ? baseDepth(rows) : 0;
  // 보이는 행만(맥락 숨김 시 비영향·비헤더 제외) → §4: 대형 서브트리도 청크로 비차단 렌더.
  // 보존 행(keep)은 맥락이 아니라 '왜 안 바뀌는지'라 맥락 숨김과 별도로 켜고 끈다.
  const visible = rows.filter(
    (r) => r.change !== undefined || r.header || (r.keep ? !opts.hideKeep : !opts.hideContext),
  );
  // 세 트리(#bindTree·#diff·#compTree)가 모두 이 호출부를 지난다 — 어느 목록인지는 마운트 id가
  // 말해 주므로 스냅·개수 줄 재계산도 여기 한 줄로 끝난다(행 0건이면 테두리·줄을 걷는다).
  renderChunked(mount, visible, (r) => makeTreeRow(r, base, checked, opts.onChange, opts.readOnly));
}

/* ---------- 리네임: 미리보기 트리 + 선택 적용 ---------- */
let renameNodes: RenameNode[] = []; // 마지막 미리보기 서브트리
const renameChecked = new Set<string>(); // 체크된 영향 노드 id
const renameHideContext = true; // 맥락(비영향) 노드는 항상 숨김(토글 없음)
let renameHideKeep = false; // 보존 행(루트·인스턴스·잠금…)은 기본 표시, 「잠금 제외」로 감춤(와이어)

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
    keep: n.keep ? { reason: t(`rename.keep.${n.keep}`), meta: t('rename.keep.meta') } : undefined,
  }));
  // 보존 행이 없으면 토글할 것도 없다 — 버튼을 걷어 빈 스위치를 남기지 않는다.
  const keepBtn = $('btnRenameKeep');
  keepBtn.style.display = rows.some((r) => r.keep) ? '' : 'none';
  keepBtn.textContent = t(renameHideKeep ? 'rename.showKeep' : 'rename.hideKeep');
  renderSelectableTree($('diff'), rows, renameChecked, {
    hideContext: renameHideContext,
    hideKeep: renameHideKeep,
    onChange: updateRenameApply,
  });
  updateRenameApply();
}

/** 적용 버튼 활성/라벨 + 전체선택 마스터 상태를 체크 수에 맞춰 갱신. */
function updateRenameApply(): void {
  const total = affectedRenameCount();
  const sel = renameChecked.size;
  // 카드 제목의 개수 — 목록이 접혀 있거나 상한에 잘려 있어도 전체 규모를 먼저 알린다.
  $('renameCount').textContent = total ? t('rename.count', { total }) : '';
  ($('btnRename') as HTMLButtonElement).disabled = sel === 0;
  const all = $('renameAll') as HTMLInputElement;
  all.checked = total > 0 && sel === total;
  all.indeterminate = sel > 0 && sel < total;
  setStatus(
    'renameStatus',
    total === 0 ? t('rename.none') : t('rename.previewCount', { total, sel }),
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
  clearMount($('diff'));
  $('renameCount').textContent = '';
  ($('btnRename') as HTMLButtonElement).disabled = true;
  setStatus('renameStatus', t('rename.applied', { count: msg.changes.length }), 'ok');
}

/* ---------- 레이어 › 연결(§4.6 그림 개편): 찾기 → 변수 카드(스위치) → 연결 ---------- */
let bindCandidates: BindCandidate[] = [];
let bindNodes: BindNode[] = [];
/** 켠 곳의 키 — 스위치는 변수 단위라 한 변수의 키가 모두 들어 있거나 모두 빠져 있다. */
const bindChecked = new Set<string>();

/** 후보 고유 키 — 같은 곳 = 같은 레이어 · 같은 속성 · 같은 변수(§4.6 ⑧). */
const candKey = placeKey;

/** 찾은 결과가 있는가(연결 후보가 떠 있음). */
function hasBindPreview(): boolean {
  return bindCandidates.length > 0;
}
/** 찾기를 마쳤는가(찾은 곳이 0이어도 참) — 배지·빈 상태·버튼 사유를 정한다. */
let bindPreviewed = false;
/** 배지·빈 상태 문구의 선택 이름 — 찾을 때의 이름으로 고정(§4.6). */
let bindPreviewName = '';
/** 사용자가 직접 펼치거나 접은 카드(변수 id → 펼침) — 세션 동안 기억(§2.6). */
const bindExpanded = new Map<string, boolean>();
/** 찾는 중(진행률이 보이는 찾기) — 단계 표시의 돌아가는 표시. 조용한 재계산은 아니다. */
let bindFinding = false;
/** (건너뜀 m ▸) 펼침 — 새로 찾거나 연결하면 접는다. */
let bindSkipsOpen = false;
/** 건너뜀 사유별 수(지금 보이는 배지의 것 — 찾을 때 또는 연결 후 다시 확인). */
let bindSkipReasons: Record<string, number> = {};
/* 복귀 규칙(§4.6 ⑧) 상태 */
let bindPreviewSel: string[] | null = null; // 찾기를 만든 선택
let bindLeftSince = false; // 찾은 뒤 창·탭을 떠났었다
let bindForeignSel = false; // 다른 화면에서 플러그인이 선택을 바꿨다
let bindHereSel = false; // 이 화면이 만든 선택 직후
let bindLayerSelectPending = false; // 이 화면이 레이어 선택을 요청했다(다음 selfSelect가 그것)
let bindPreviewMini = false; // 최소화 중에 끝난 찾기
let bindSilentReq = 0;
/** 레이어 › 연결에서 쓰는 라이브러리 사용 여부(§4.6 ②) — null = 아직 모름(선택 없음 · 300개 초과 · 읽는 중). */
let layerLibUse: boolean | null = null;
let layerLibReq = 0;

/** 속성 라벨 — i18n 키가 없으면(새 필드) 원래 API 이름을 그대로. */
function fieldLabel(label: string, rawField: string): string {
  return hasString(`field.${label}`) ? t(`field.${label}`) : rawField;
}

/** 변수 이름 필터(소문자 부분 일치). 비어 있으면 전부. */
function bindFilterText(): string {
  return (($('bindFilter') as HTMLInputElement).value ?? '').trim().toLowerCase();
}
/** 변수 카드 — 전체와 필터에 걸린 것. */
function bindGroups(): { all: VarGroup[]; shown: VarGroup[] } {
  const all = groupByVariable(bindCandidates);
  const q = bindFilterText();
  return { all, shown: q ? all.filter((g) => g.variableName.toLowerCase().includes(q)) : all };
}
/** 카드가 펼쳐져 있나 — 처음에는 모두 접힘, 직접 펼치거나 접은 것은 세션 동안 기억(§4.6). */
function groupOpen(g: VarGroup): boolean {
  return bindExpanded.get(g.variableId) ?? false;
}
/** 변수가 켜져 있나(스위치) — 그 변수의 곳이 모두 켜짐. */
const groupOn = (g: VarGroup): boolean => g.keys.every((k) => bindChecked.has(k));
/** 켠 곳 수(보이지 않는 카드 포함) — [🔗 n곳 연결]의 n. */
const bindOnCount = (): number => bindChecked.size;
/** 연결 후 결과 카드가 보이는가. */
const bindIsDone = (): boolean => !$('bindDone').hidden;
/** 연결할 변수가 없다는 안내가 보이는가. */
const bindPrereqShown = (): boolean => $('bindPrereq').style.display !== 'none';
/** 다른 선택에서 만든 결과(연결 잠김)인가. */
const bindOtherSel = (): boolean => bindForeignSel && !$('bindNotice').hidden;

/** 타입 표시 — ● 색 · # 숫자 · T 글자. */
function typeMark(value: string): string {
  return isHexColor(value) ? '●' : /^-?\d/.test(value) ? '#' : 'T';
}
/** 값 칩 — 색은 견본 + #RRGGBB, 숫자는 숫자. */
function valueChip(value: string): HTMLElement {
  const chip = document.createElement('span');
  chip.className = 'bv-chip bv-val';
  if (isHexColor(value)) {
    const sw = document.createElement('span');
    sw.className = 'bv-sw';
    sw.style.background = value;
    chip.append(sw, value.toUpperCase());
  } else chip.textContent = value;
  return chip;
}
/** 변수 칩 — 타입 표시 + 이름(길면 말줄임 + 툴팁). */
function varChip(name: string, value: string): HTMLElement {
  const chip = document.createElement('span');
  chip.className = 'bv-chip bv-var';
  const mark = document.createElement('span');
  mark.className = 'bv-mark';
  mark.setAttribute('aria-hidden', 'true');
  mark.textContent = typeMark(value);
  const nm = document.createElement('span');
  nm.className = 'bv-name';
  nm.textContent = name;
  chip.append(mark, nm);
  return chip;
}
const arrowEl = (): HTMLElement => {
  const a = document.createElement('span');
  a.className = 'bv-arrow';
  a.setAttribute('aria-hidden', 'true');
  a.textContent = '→';
  return a;
};
/** 말줄임된 변수 이름에만 툴팁(그리고 난 뒤 잰다). */
function tipTruncatedNames(root: HTMLElement): void {
  requestAnimationFrame(() => {
    for (const nm of Array.from(root.querySelectorAll<HTMLElement>('.bv-name'))) {
      const chip = nm.parentElement as HTMLElement;
      if (nm.scrollWidth > nm.clientWidth + 1) chip.title = nm.textContent ?? '';
      else chip.removeAttribute('title');
    }
  });
}

/** 자리 줄 — 보기만(스위치는 변수 단위, §4.6). [속성 아이콘] 레이어 이름(캔버스 선택) · 속성. */
function placeEl(l: PlaceLine): HTMLElement {
  const row = document.createElement('div');
  row.className = 'bv-place';
  row.dataset.key = l.keys[0];
  const ic = document.createElement('span');
  ic.className = 'bv-ic';
  ic.setAttribute('aria-hidden', 'true');
  ic.textContent = fieldIcon(l.fields[0]);
  const node = bindNodes.find((n) => n.id === l.nodeId);
  const layer = document.createElement('button');
  layer.type = 'button';
  layer.className = 'link link-btn bv-layer';
  layer.textContent = node?.name ?? l.nodeId;
  layer.title = t('bind.layerTip');
  layer.addEventListener('click', () => selectNodes([l.nodeId], 'applyStatus'));
  const prop = document.createElement('span');
  prop.className = 'bv-prop';
  prop.textContent = fieldLabel(l.label, l.fields[0]) + (l.keys.length > 1 ? t('bind.placeCount', { k: l.keys.length }) : '');
  row.append(ic, layer, prop);
  return row;
}

/** 변수 카드 — 머리: [값 칩] → [변수 칩] · {k}곳 ▾/▸ · 스위치. 펼치면 자리 줄. */
function bindGroupEl(g: VarGroup): HTMLElement {
  const on = groupOn(g);
  const open = groupOpen(g);
  const card = document.createElement('div');
  card.className = 'bv-card';
  card.classList.toggle('off', !on);
  card.dataset.var = g.variableId;
  const head = document.createElement('div');
  head.className = 'bv-head';
  head.title = on ? t('bind.cardTip', { name: g.variableName, k: g.count }) : t('bind.offTip', { k: g.count });
  const grow = document.createElement('span');
  grow.className = 'grow';
  const tw = document.createElement('button');
  tw.type = 'button';
  tw.className = 'bv-tw';
  tw.textContent = `${t('bind.count', { k: g.count })} ${open ? '▾' : '▸'}`;
  tw.setAttribute('aria-expanded', String(open));
  tw.setAttribute('aria-label', t('bind.placesAria', { name: g.variableName, k: g.count }));
  tw.addEventListener('click', () => {
    bindExpanded.set(g.variableId, !open);
    renderBindTree();
    focusCardControl(g.variableId, '.bv-tw');
  });
  const sw = document.createElement('button');
  sw.type = 'button';
  sw.className = 'bv-switch';
  sw.setAttribute('role', 'switch');
  sw.setAttribute('aria-checked', String(on));
  sw.setAttribute('aria-label', t('bind.switchAria', { name: g.variableName }));
  const track = document.createElement('span');
  track.className = 'bv-track';
  track.setAttribute('aria-hidden', 'true');
  sw.appendChild(track);
  sw.addEventListener('click', () => {
    for (const k of g.keys) on ? bindChecked.delete(k) : bindChecked.add(k);
    renderBindTree();
    focusCardControl(g.variableId, '.bv-switch');
  });
  head.append(valueChip(g.variableValue), arrowEl(), varChip(g.variableName, g.variableValue), grow, tw, sw);
  card.appendChild(head);
  if (open) {
    const places = document.createElement('div');
    places.className = 'bv-places';
    for (const l of g.lines) places.appendChild(placeEl(l));
    card.appendChild(places);
  }
  return card;
}
/** 다시 그린 뒤 같은 카드의 같은 컨트롤로 포커스를 돌려준다. */
function focusCardControl(variableId: string, sel: string): void {
  $('bindTree').querySelector<HTMLElement>(`.bv-card[data-var="${CSS.escape(variableId)}"] ${sel}`)?.focus();
}

/** 배지·빈 상태 문구의 선택 이름 — 20자를 넘으면 줄인다(§4.6). */
function shortName(name: string): string {
  return name.length > 20 ? `${name.slice(0, 20)}…` : name;
}

type BindStepState = 'now' | 'done' | 'todo';
/** 단계 표시 상태(§4.6 표). */
function bindStepStates(): [BindStepState, BindStepState, BindStepState] {
  if (!curSel.count || bindPrereqShown()) return ['todo', 'todo', 'todo'];
  if (bindIsDone()) return ['done', 'done', 'done'];
  if (bindFinding && $('applyProgress').style.display !== 'none') return ['now', 'todo', 'todo'];
  if (bindOtherSel()) return ['now', 'todo', 'todo'];
  if (bindPreviewed) return hasBindPreview() ? ['done', 'now', 'todo'] : ['done', 'todo', 'todo'];
  return ['now', 'todo', 'todo']; // 찾기 전 · 취소됨
}
function renderBindSteps(): void {
  const states = bindStepStates();
  const busy = bindFinding && $('applyProgress').style.display !== 'none';
  $('bindSteps').querySelectorAll<HTMLElement>('.bs').forEach((li, i) => {
    const st = states[i];
    li.classList.toggle('now', st === 'now');
    li.classList.toggle('done', st === 'done');
    const spin = i === 0 && busy && st === 'now';
    li.classList.toggle('busy', spin);
    if (st === 'now') li.setAttribute('aria-current', 'step');
    else li.removeAttribute('aria-current');
    (li.querySelector('.bs-dot') as HTMLElement).textContent = spin ? '' : st === 'done' ? '✓' : String(i + 1);
  });
}

/** 빈 상태(목록 자리 점선 상자) — 찾기 전 / 선택 없음 / 찾은 곳 0. 연결할 변수 없음 안내가 보이면 숨김. */
function renderBindEmpty(): void {
  const box = $('bindEmpty');
  clearMount(box);
  let kind: 'intro' | 'nosel' | 'none' | null = null;
  if (bindPrereqShown() || bindIsDone()) kind = null;
  else if (!curSel.count) kind = 'nosel';
  else if (!bindPreviewed) kind = 'intro';
  else if (!hasBindPreview()) kind = 'none';
  box.hidden = !kind;
  if (!kind) return;
  const text = document.createElement('div');
  text.className = 'be-text';
  if (kind === 'intro') {
    const ex = bindExamples(vmCols, vmVars);
    const rows = [ex.color, ex.number].filter((x): x is { value: string; name: string } => !!x);
    if (rows.length) {
      const art = document.createElement('div');
      art.className = 'be-art';
      art.setAttribute('aria-hidden', 'true');
      for (const r of rows) {
        const row = document.createElement('div');
        row.className = 'be-row';
        const vc = varChip(r.name, r.value);
        vc.title = r.name;
        row.append(valueChip(r.value), arrowEl(), vc);
        art.appendChild(row);
      }
      box.appendChild(art);
    }
    text.textContent = t('bind.emptyIntro');
  } else {
    const art = document.createElement('div');
    art.className = 'be-art icon';
    art.setAttribute('aria-hidden', 'true');
    art.textContent = kind === 'nosel' ? '⬚ ↖' : '∅';
    box.appendChild(art);
    text.textContent = kind === 'nosel' ? t('bind.emptyNoSel') : t('bind.descNone', { name: bindPreviewName });
  }
  box.appendChild(text);
}

/** 배지 줄 — (찾음 n) (건너뜀 m ▸) [모두 켜기/끄기] [필터]. 연결 후에는 (건너뜀 m ▸)만(결과 카드 아래). */
function renderBindBadges(): void {
  const done = bindIsDone();
  const has = hasBindPreview() && !done;
  const m = Object.values(bindSkipReasons).reduce((a, n) => a + (n > 0 ? n : 0), 0);
  const showSkip = m > 0 && (bindPreviewed || done);
  $('bindBadges').hidden = !has && !showSkip;
  const found = $('bindFound');
  found.hidden = !has;
  if (has) {
    found.textContent = t('bind.found', { n: bindCandidates.length });
    found.title = t('bind.foundTip', { name: bindPreviewName, n: bindCandidates.length });
  }
  const skip = $('bindSkipToggle');
  skip.hidden = !showSkip;
  skip.textContent = `${t('bind.skipTotal', { m })} ${bindSkipsOpen ? '▾' : '▸'}`;
  skip.setAttribute('aria-expanded', String(showSkip && bindSkipsOpen));
  skip.setAttribute('aria-label', t('bind.skipAria', { m }));
  $('bindSkips').hidden = !(showSkip && bindSkipsOpen);
  // 모두 켜기/끄기 — 보이는 카드 기준
  const { all, shown } = bindGroups();
  const allBtn = $('bindAll');
  allBtn.hidden = !has;
  allBtn.textContent = shown.some((g) => !groupOn(g)) ? t('bind.allOn') : t('bind.allOff');
  // 필터 — 카드 7개 이상이거나 필터 칸에 글자가 있을 때
  const filterOn = has && (all.length > 6 || !!bindFilterText());
  const fbtn = $('bindFilterBtn');
  fbtn.hidden = !filterOn;
  const row = $('bindFilterRow');
  if (!filterOn) row.hidden = true;
  fbtn.setAttribute('aria-expanded', String(!row.hidden));
  // 필터 밖에 켠 곳
  const shownSet = new Set(shown.flatMap((g) => g.keys));
  const outside = [...bindChecked].filter((k) => !shownSet.has(k)).length;
  $('bindOutside').textContent = bindFilterText() && outside ? t('bind.outside', { h: outside }) : '';
}

/** 연결 화면 그리기 — 변수 카드를 다시 만들고 나머지(단계·버튼·빈 상태·배지)를 맞춘다. */
function renderBindTree(): void {
  const tree = $('bindTree');
  clearMount(tree);
  if (hasBindPreview() && !bindIsDone()) for (const g of bindGroups().shown) tree.appendChild(bindGroupEl(g));
  tipTruncatedNames(tree);
  renderBindChrome();
}
/** 카드는 그대로 두고 단계·버튼·빈 상태·배지만 맞춘다(포커스가 카드 안에 있어도 안전). */
function renderBindChrome(): void {
  if (!curSel) return;
  renderBindEmpty();
  renderBindBadges();
  updateBindApply();
}

// 접근성 이름(정적 i18n은 aria-label을 덮지 않는다)
$('bindSteps').setAttribute('aria-label', t('bind.stepsAria'));
$('bindFilterBtn').setAttribute('aria-label', t('bind.filterBtn'));
$('btnApplyLabel').textContent = t('bind.find');
$('btnApplyConfirmLabel').textContent = t('bind.link');
$('bindFilter').addEventListener('input', () => renderBindTree());
$('bindFilter').addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { e.preventDefault(); closeBindFilter(); }
});
function closeBindFilter(): void {
  ($('bindFilter') as HTMLInputElement).value = '';
  $('bindFilterRow').hidden = true;
  renderBindTree();
  if (!$('bindFilterBtn').hidden) $('bindFilterBtn').focus();
}
$('bindFilterBtn').addEventListener('click', () => {
  const row = $('bindFilterRow');
  if (row.hidden) {
    row.hidden = false;
    renderBindBadges();
    ($('bindFilter') as HTMLInputElement).focus();
  } else closeBindFilter();
});
$('bindSkipToggle').addEventListener('click', () => {
  bindSkipsOpen = !bindSkipsOpen;
  renderBindBadges();
});
// 모두 켜기/끄기 — 보이는 카드에만(필터 중 보이지 않는 카드는 그대로, §4.6). 포커스는 버튼에 남는다.
$('bindAll').addEventListener('click', () => {
  const { shown } = bindGroups();
  const turnOn = shown.some((g) => !groupOn(g));
  for (const g of shown) for (const k of g.keys) turnOn ? bindChecked.add(k) : bindChecked.delete(k);
  renderBindTree();
});

/** 단계 표시 · 버튼 이름 · 주/보조 · 잠금(§4.6). */
function updateBindApply(): void {
  if (!curSel) return;
  renderBindSteps();
  const done = bindIsDone();
  const has = bindPreviewed && hasBindPreview() && !done;
  // [🔍 찾기] — 찾기 전 주 버튼, 찾은 뒤 [🔍 다시 찾기] 보조, 연결 후 [🔍 다시 찾기] 주 버튼.
  const find = $('btnApply');
  $('btnApplyLabel').textContent = bindPreviewed || done ? t('bind.refind') : t('bind.find');
  find.classList.toggle('primary', !bindPreviewed || done);
  // [🔗 연결] — 찾은 뒤 [🔗 {n}곳 연결] 주 버튼, 그 밖에는 숫자 없이 잠금.
  const confirm = $('btnApplyConfirm');
  const n = bindOnCount();
  $('btnApplyConfirmLabel').textContent = has ? t('bind.linkN', { n }) : t('bind.link');
  confirm.classList.toggle('primary', has);
  // 사유 순서: 선택 없음 → 다른 선택의 결과 → 찾기 전·연결 후 → 찾은 곳 0 → 모두 끔(§4.6).
  if (!curSel.count) setLock(confirm, 'prereq', t('status.noSelection'));
  else if (bindOtherSel()) setLock(confirm, 'prereq', t('bind.selChanged'));
  else if (!bindPreviewed || done) setLock(confirm, 'prereq', t('bind.needFind'));
  else if (!hasBindPreview()) setLock(confirm, 'prereq', t('bind.nothing'));
  else if (!n) setLock(confirm, 'prereq', t('bind.needOn'));
  else setLock(confirm, null);
}

/** 찾은 결과를 지운다(선택 변경·취소·연결 후) — "찾기 전"으로. 필터도 비운다. */
function clearBindPreview(): void {
  $('bindNotice').hidden = true;
  bindPreviewSel = null;
  bindForeignSel = false;
  bindHereSel = false;
  bindPreviewed = false;
  bindCandidates = [];
  bindNodes = [];
  bindSkips = [];
  bindSkipsCapped = false;
  bindSkipReasons = {};
  bindSkipsOpen = false;
  clearMount($('bindSkips')); // 숨기기만 하면 낡은 칩이 DOM에 남는다
  ($('bindFilter') as HTMLInputElement).value = '';
  $('bindFilterRow').hidden = true;
  bindChecked.clear();
  renderBindTree();
}

/* ---------- 컴포넌트 등록(#1): 하위 후보 트리 + 선택 등록 ---------- */
let compCandidates: ComponentCandidate[] = [];
const compChecked = new Set<string>(); // 체크된 등록 후보(노드 id)
const compHideContext = true; // 항상 숨김(토글 없음)

function compEligibleCount(): number {
  return compCandidates.reduce((n, c) => n + (c.eligible ? 1 : 0), 0);
}

function compRows(): TreeRow[] {
  return compCandidates.map((n) => {
    if (!n.eligible) return { id: n.id, name: n.name, type: n.type, depth: n.depth, parentId: n.parentId };
    // 세트: [세트] · 속성접힘: [속성] · 단독: [단독]
    const base = { id: n.id, name: n.name, type: n.type, depth: n.depth, parentId: n.parentId, replace: false };
    if (n.group) {
      return { ...base, change: `${n.group} · ${n.variant || t('component.variantFallback')}`, badge: { text: t('component.badgeSet'), kind: 'set' as const } };
    }
    if (n.propsOnly) {
      return { ...base, change: t('component.changeProps', { name: n.single || t('component.nameFallback') }), badge: { text: t('component.badgeProps'), kind: 'single' as const } };
    }
    return { ...base, change: n.single || t('component.nameFallback'), badge: { text: t('component.badgeSingle'), kind: 'single' as const } };
  });
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
  // 카드 제목의 개수 — 트리에 뜨는 건 등록 가능한 후보뿐이라 그 수를 센다(스캔 노드 수가 아니라).
  $('compCount').textContent = total ? t('component.count', { total }) : '';
  $('compTreeGroup').style.display = total ? '' : 'none';
  if (compCandidates.length) {
    const all = $('compAll') as HTMLInputElement;
    all.checked = sel === total && total > 0;
    all.indeterminate = sel > 0 && sel < total;
    setStatus('structureStatus', total === 0 ? t('component.noEligibleShort') : t('component.candidates', { total, sel }), '');
  }
}

function clearCompPreview(): void {
  compCandidates = [];
  compChecked.clear();
  clearMount($('compTree'));
  $('compCount').textContent = '';
  $('compTreeGroup').style.display = 'none';
  ($('compTreeCtrls') as HTMLElement).style.display = 'none';
}

/* ---------- 등록/분류 결과 리포트(#variantReport) ----------
   세 메시지(COMPONENTS_RESULT · VARIANTS_RESULT · GENERATE_RESULT)가 각자 다른 내용을 그리는데
   렌더 코드가 세 번 복붙돼 있었고, 행이라는 단위 자체가 없어 맨 <div>에 **리터럴 공백**으로
   들여썼다. 뭉뚱그려 한 모양으로 합치는 대신 ‘머리줄 + 항목 줄’이라는 공통 구조만 뽑는다. */

/** 항목 앞 표시 — 내용이 아니라 장식이라 textContent가 아니라 CSS(::before)가 그린다. */
type VariantReportMarker = 'bullet' | 'added';

interface VariantReportSection {
  /** 카드 제목 개수 span에 쓸 짧은 이름 */
  tag: string;
  /** 목록 안 머리줄. 종류가 하나뿐이면(생성 결과) 생략 */
  head?: string;
  items: string[];
  /** 진단(실패)은 경고색 */
  warn?: boolean;
  marker?: VariantReportMarker;
}

interface VariantReportLine {
  text: string;
  /** 구분줄(‘빈 조합(미생성):’)인가 — 항목 카드와 달리 그룹 머리로 그린다. */
  head?: boolean;
  warn?: boolean;
}

function makeVariantReportRow(l: VariantReportLine): HTMLElement {
  if (l.head) {
    const g = resultGroup(l.text);
    if (l.warn) g.classList.add('warn');
    return g;
  }
  const card = resultCard({ title: l.text, titleMono: true });
  if (l.warn) (card.querySelector('.r-title') as HTMLElement).classList.add('warn');
  return card;
}

/** 등록·분류가 공유하는 구획(빈 조합 + 실패 진단) — 두 결과가 같은 리포트를 그린다. */
function variantIssueSections(missing: string[], failures?: string[]): VariantReportSection[] {
  const f = failures || [];
  return [
    { tag: t('component.tagMissing'), head: t('component.headMissing'), items: missing },
    { tag: t('component.tagIssue'), head: t('component.headIssue', { n: f.length }), items: f, warn: true, marker: 'bullet' },
  ];
}

function renderVariantReport(sections: VariantReportSection[]): void {
  const filled = sections.filter((s) => s.items.length);
  // 카드 제목의 개수(#tokenList의 createCount와 같은 패턴) — 리포트가 상한에 걸리거나
  // 카드가 접혀 있어도 무엇이 몇 건인지 먼저 알린다.
  $('componentCount').textContent = filled.map((s) => t('component.tagCount', { tag: s.tag, n: s.items.length })).join(' · ');
  const lines: VariantReportLine[] = [];
  for (const s of filled) {
    if (s.head) lines.push({ text: s.head, head: true, warn: s.warn });
    for (const it of s.items) lines.push({ text: it, warn: s.warn });
  }
  // 빈 조합은 베리언트 속성의 곱집합이라 세트 하나로도 수백 줄이 된다 → 청크 렌더.
  // 줄이 0이어도 불러야 마운트가 비워지고 onDone이 테두리·푸터를 걷는다.
  renderChunked($('variantReport'), lines, makeVariantReportRow);
}

/** 선택 의존 카드(바인딩·컴포넌트)의 빈 상태(캐논 108:2) — 미리보기/후보가 없을 때만,
    무선택이면 캐논 빈 상태를 표시하고, 선택이 있으면 비워 둔다(액션 버튼이 흐름을 주도). */
function refreshTreeEmptyStates(): void {
  // 선택 표시줄이 없으므로 선택이 없으면 목록 자리에서 알린다(§4.1). 연결 화면은 빈 상태 상자가 맡는다(renderBindEmpty).
  if (compCandidates.length === 0) {
    if (lastSelCount === 0) renderEmptyState($('compTree'), t('sel.noneHere'), '');
    else clearMount($('compTree'));
  }
  if (renameNodes.length === 0) {
    if (lastSelCount === 0) renderEmptyState($('diff'), t('sel.noneHere'), '');
    else clearMount($('diff'));
  }
  renderMakeNoSel();
}

/** UX3: 스킵 사유 키 → 한글 라벨. */
/**
 * 사유별 레이어(미리보기 dry-run에서만 채워짐). 숫자만 있으면 원인 레이어를 찾을 길이 없어,
 * 사유 칩을 눌러 캔버스에서 선택할 수 있게 보관한다.
 */
let bindSkips: BindSkip[] = [];
/** 스킵 목록이 상한에서 잘렸는가 — 힌트 줄이 "목록은 N개까지"라고 밝힌다. */
let bindSkipsCapped = false;

/** 건너뜀 사유 칩(§4.6) — (건너뜀 m ▸) 배지를 펼치면 보인다. 레이어 목록이 있는 사유만 버튼(누르면 캔버스 선택), 나머지는 글자.
    m = 사유별 숫자의 합(속성 단위) — 배지가 센다. */
function renderSkipReasons(reasons: Record<string, number>): void {
  bindSkipReasons = { ...reasons };
  const box = $('bindSkips');
  clearMount(box);
  const entries = Object.entries(reasons).filter(([, n]) => n > 0);
  const capNote = bindSkipsCapped ? t('bind.skipCappedTip', { shown: bindSkips.length }) : '';
  for (const [key, n] of entries) {
    const ids = bindSkips.filter((s) => s.reason === key).map((s) => s.nodeId);
    const label = `${t('reason.' + key)} ${n}`;
    if (!ids.length) {
      const span = document.createElement('span');
      span.className = 'skip-chip static';
      span.textContent = label;
      box.appendChild(span);
      continue;
    }
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'skip-chip';
    btn.textContent = `${label} ›`;
    // 사유 건수(n)는 속성 단위, 레이어 수는 노드 단위라 서로 다를 수 있다(padding 4건 → 레이어 1개).
    const names = bindSkips.filter((s) => s.reason === key).slice(0, 5).map((s) => s.name).join(', ');
    btn.title = t(ids.length > 5 ? 'bind.skipChipTipMore' : 'bind.skipChipTip', { count: ids.length, names }) + capNote;
    btn.addEventListener('click', () => {
      selectNodes(ids, 'applyStatus');
      setStatus('applyStatus', t('bind.skipSelected', { reason: t('reason.' + key), n: ids.length }), '');
    });
    box.appendChild(btn);
  }
}

/** 결과 줄 꼬리 — 이름은 3개까지 + " 외"(§4.7 "인스턴스 자리" 5번). 없으면 빈 문자열. */
function placeTailText(key: 'component.placeFailed' | 'component.placeCloned' | 'component.propFailed' | 'component.fillKept', names: readonly string[]): string {
  if (!names.length) return '';
  const shown = names.slice(0, 3).join(', ') + (names.length > 3 ? t('component.placeFailedMore') : '');
  return t(key, { n: names.length, names: shown });
}
/** " · 제자리에 못 둔 {n}개: {이름들}" */
function placeFailedText(names: readonly string[]): string {
  return placeTailText('component.placeFailed', names);
}
/** 묶기 경고 중 "제자리에 둘 수 없어" 줄인가 — 꼬리로 따로 세므로 경고 목록에서 뺀다(§4.7 5번). */
function isPlaceFailWarning(w: string, names: readonly string[]): boolean {
  return names.some((name) => w === t('similar.placeFail', { name }));
}


/* ---------- UX6: 진행률 바 ---------- */
/** 진행 줄을 연다. cancellable=false면 [취소]를 숨긴다 — 연결(APPLY_SELECTED)은 취소를 보지 않는다(§4.6 · 2026-11-04 결정 2). */
function showApplyProgress(label: string, cancellable = true): void {
  $('applyProgress').style.display = '';
  ($('applyBarFill') as HTMLElement).style.width = '0%';
  $('applyProgressText').textContent = label;
  $('btnApplyCancel').hidden = !cancellable;
}
/** 닮은 프레임 멤버 한 줄 — 마스터 라디오 + 이름 + 완전성 근거(왜 이게 추천인지). */
function makeSimilarRow(m: FrameMeta, recommendedId: string | null): HTMLElement {
  const radio = document.createElement('input');
  radio.type = 'radio';
  radio.name = 'similarMaster';
  radio.value = m.id;
  radio.checked = m.id === similarMasterId;
  radio.addEventListener('change', () => {
    if (radio.checked) similarMasterId = m.id;
  });

  // 추천 근거를 숫자로 — 텍스트가 얼마나 채워졌는지가 마스터 선택의 핵심이다.
  const parts = [t('similar.metaText', { filled: m.textFilled, total: m.textTotal })];
  if (m.images) parts.push(t('similar.metaImages', { n: m.images }));
  if (m.emptyLayers) parts.push(t('similar.metaEmpty', { n: m.emptyLayers }));

  const card = resultCard({
    check: radio,
    title: m.name,
    summary: parts.join(' · '),
    summaryMono: true,
    meta: m.id === recommendedId ? t('similar.recommended') : '',
  });
  if (m.id === recommendedId) (card.querySelector('.r-meta') as HTMLElement).className = 'tag tag-set';
  // 줄 아무 데나 눌러도 라디오가 선택되게 — 라벨로 감싸던 예전 동작을 유지한다.
  card.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).tagName === 'INPUT') return;
    radio.checked = true;
    radio.dispatchEvent(new Event('change'));
  });
  return card;
}

/** 스캔 결과 → 멤버 목록(마스터 라디오) + 무엇이 속성으로 열리는지 요약. */
function renderSimilar(msg: Extract<CodeToUi, { type: 'SIMILAR_CANDIDATES' }>): void {
  similarMemberIds = msg.metas.map((m) => m.id);
  similarMasterId = msg.recommendedMasterId;
  $('similarCount').textContent = msg.metas.length ? t('similar.count', { n: msg.metas.length }) : '';
  $('similarGroup').style.display = msg.metas.length ? '' : 'none';

  const box = $('similarList');
  renderChunked(box, msg.metas, (m) => makeSimilarRow(m, msg.recommendedMasterId));

  if (!msg.metas.length) {
    // 왜 대상이 없는지 알려준다 — 제외 사유가 있으면 그걸 그대로 보여주는 게 가장 빠른 안내다.
    const why = msg.excluded.length ? msg.excluded[0].reason : t('similar.needTwo');
    setStatus('structureStatus', t('similar.none', { why }), 'warn');
    return;
  }

  const texts = msg.varying.filter((v) => v.type === 'TEXT').length;
  const swaps = msg.varying.length - texts;
  const opened: string[] = [];
  if (texts) opened.push(t('similar.openText', { n: texts }));
  if (swaps) opened.push(t('similar.openSwap', { n: swaps }));
  if (msg.imageVarying.length) opened.push(t('similar.openImage', { n: msg.imageVarying.length }));
  const openPart = opened.length ? t('similar.opened', { list: opened.join(' · ') }) : t('similar.noVarying');
  const skipPart = msg.excluded.length ? t('similar.excluded', { n: msg.excluded.length, why: msg.excluded[0].reason }) : '';
  setStatus('structureStatus', t('similar.scanned', { n: msg.metas.length, openPart, skipPart }), 'ok');
}

function updateApplyProgress(done: number, total: number): void {
  $('applyProgress').style.display = '';
  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
  ($('applyBarFill') as HTMLElement).style.width = `${pct}%`;
  $('applyProgressText').textContent = total > 0 ? t('bind.progressOf', { done, total, pct }) : t('bind.progressCount', { done });
}
function hideApplyProgress(): void {
  $('applyProgress').style.display = 'none';
  bindFinding = false;
  if (curSel) renderBindSteps(); // 찾는 중 표시를 거둔다
}

function setStatus(id: string, text: string, cls: 'ok' | 'warn' | ''): void {
  const el = $(id);
  el.textContent = text;
  el.className = `status ${cls}`;
  // 라이선스 줄의 원문 사유 툴팁(noteTip)이 다음 문구에 남지 않게 — 쓸 때마다 비운다.
  if (id === 'licenseStatus') el.removeAttribute('title');
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string));
}

/* ---------- 캐논 패턴: 카드 접기(아코디언) + 주 버튼 타이틀 줄 이동 ---------- */
/**
 * sticky 오프셋 동기화 — 탭 바·선택 바의 '실제' 높이를 CSS 변수로 넘긴다.
 * 카드 헤더(주 버튼 포함)가 그 아래에 정확히 붙어야 가려지지 않는다. 폭이 좁아져 선택 바가
 * 두 줄이 되거나 창을 리사이즈해도 따라간다(하드코딩 41px/71px은 그 경우 어긋남).
 */
function syncStickyOffsets(): void {
  const tabs = document.querySelector<HTMLElement>('.tabs');
  if (!tabs) return;
  const tabsH = Math.round(tabs.getBoundingClientRect().height);
  const root = document.documentElement;
  // 선택 표시줄은 없앴다(§4.1) — 탭 바 바로 아래부터 탭 내용이다.
  const headTop = tabsH;
  root.style.setProperty('--tabs-h', `${tabsH}px`);
  root.style.setProperty('--head-top', `${headTop}px`);
  // 버튼 줄은 카드 머리 바로 아래에 고정(§2.5). 카드 머리 높이는 카드마다 같다(제목 한 줄 + 아래 8px).
  // 제목이 없는 카드(레이어 › 연결, §4.6 그림 개편)는 버튼 줄이 탭 바 바로 아래에 붙는다.
  const shownCard = Array.from(document.querySelectorAll<HTMLElement>('.tab-section.active .step:not(.collapsed)')).find((c) => c.offsetParent);
  const head = document.querySelector<HTMLElement>('.tab-section.active .step:not(.collapsed) .step-head');
  const headH = shownCard && !shownCard.querySelector('.step-head') ? 0 : head && head.offsetParent ? Math.round(head.getBoundingClientRect().height) : 26;
  root.style.setProperty('--toolbar-top', `${headTop + headH}px`);
  // 변수 목록(결정 B): 사이드바·오른쪽 목록 머리는 머리줄 바로 아래에 고정(§4.4).
  const lh = document.getElementById('listHead');
  if (lh && lh.offsetParent) root.style.setProperty('--side-top', `${headTop + Math.round(lh.getBoundingClientRect().height)}px`);
  // 목록 머리(레이어 › 연결)는 버튼 줄 바로 아래에 고정 — 버튼 줄 높이를 잰다(두 겹, §2.5).
  const bar2 = document.querySelector<HTMLElement>('.tab-section.active .step:not(.collapsed) .toolbar');
  if (bar2 && bar2.offsetParent) root.style.setProperty('--toolbar-h', `${Math.round(bar2.getBoundingClientRect().height)}px`);
}

/** 모든 .step 카드를 접이식으로 + 주 버튼을 타이틀 줄로. 노드 이동이라 id/리스너 보존, 멱등. */
function applyCardChrome(): void {
  document.querySelectorAll<HTMLElement>('.step').forEach((card) => {
    const h2 = card.querySelector('h2');
    if (!h2 || card.querySelector('.step-head')) return; // 멱등
    const head = document.createElement('div');
    head.className = 'step-head';
    const body = document.createElement('div');
    body.className = 'step-body';
    while (h2.nextSibling) body.appendChild(h2.nextSibling); // h2 이후 형제를 body로
    card.insertBefore(head, h2);
    // 캐논 순서: chevron(왼쪽) · 타이틀 · 주 버튼(오른쪽)
    const chev = document.createElement('span');
    chev.className = 'chev';
    chev.textContent = '›';
    head.appendChild(chev);
    head.appendChild(h2);
    card.appendChild(body);
    head.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('button')) return; // 버튼 클릭은 토글 제외
      card.classList.toggle('collapsed');
    });
  });
}

/** 구조 툴바 버튼 호버 툴팁 — fixed #uiTip을 패널 안으로 클램프한다.
 *  버튼 ::after는 줄바꿈·가장자리에서 잘리고 가로 스크롤을 만든다. */

const TIP_PAD = 8;

function hideUiTip(): void {
  const tip = $('uiTip');
  tip.classList.remove('show');
  tip.hidden = true;
  tip.textContent = '';
}

function placeUiTip(anchor: HTMLElement, text: string): void {
  const tip = $('uiTip');
  tip.textContent = text;
  tip.hidden = false;
  tip.classList.remove('show'); // 측정만 — 아직 안 보이게
  tip.style.left = '0px';
  tip.style.top = '0px';
  const rect = anchor.getBoundingClientRect();
  const tw = tip.offsetWidth;
  const th = tip.offsetHeight;
  const vw = document.documentElement.clientWidth;
  const vh = document.documentElement.clientHeight;
  let left = rect.left + (rect.width - tw) / 2;
  left = Math.max(TIP_PAD, Math.min(left, vw - tw - TIP_PAD));
  let top = rect.bottom + 6;
  if (top + th > vh - TIP_PAD) top = rect.top - th - 6;
  top = Math.max(TIP_PAD, Math.min(top, vh - th - TIP_PAD));
  tip.style.left = `${Math.round(left)}px`;
  tip.style.top = `${Math.round(top)}px`;
  tip.classList.add('show');
}

function applyButtonTips(): void {
  document.querySelectorAll<HTMLElement>('[data-tip]').forEach((el) => {
    const show = () => {
      const text = el.getAttribute('data-tip');
      if (text) placeUiTip(el, text);
    };
    el.addEventListener('mouseenter', show);
    el.addEventListener('focus', show);
    el.addEventListener('mouseleave', hideUiTip);
    el.addEventListener('blur', hideUiTip);
  });
  window.addEventListener('scroll', hideUiTip, true);
}

/** 정적 HTML 라벨 외부화: [data-i18n]=textContent, [data-i18n-html]=innerHTML(신뢰된 자체 문자열).
 *  텍스트 전용 요소는 data-i18n, <b>/<code> 등 마크업이 있으면 data-i18n-html을 쓴다.
 *  뱃지 span(예: …Lock)이 함께 있는 요소는 텍스트만 <span data-i18n>로 감싸 뱃지를 보존한다.
 *  `<option>`도 textContent라 data-i18n으로 족하다 — value는 코드가 읽는 키라 건드리지 않는다.
 *  보이는 문자열이 속성인 것(title 툴팁·placeholder·aria-label·커스텀 툴팁 data-tip)은
 *  data-i18n-title/-placeholder/-aria-label/-tip으로 같은 표를 쓴다. */
function applyStaticI18n(root: ParentNode = document): void {
  // 정의된 키만 덮어쓴다 — 오타/누락 키에서 t()가 키 문자열을 반환해 HTML 원문을 파괴하지 않도록.
  root.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n as string;
    if (hasString(key)) el.textContent = t(key);
  });
  root.querySelectorAll<HTMLElement>('[data-i18n-html]').forEach((el) => {
    const key = el.dataset.i18nHtml as string;
    if (hasString(key)) el.innerHTML = t(key);
  });
  // [data-i18n-X] → 속성 Y. 짝(Y)은 같은 태그의 인라인 폴백이다(verify-i18n의 ATTR_FORMS와 같은 표).
  for (const [form, attr] of [
    ['title', 'title'],
    ['placeholder', 'placeholder'],
    ['aria-label', 'aria-label'],
    ['tip', 'data-tip'], // 커스텀 툴팁(applyButtonTips가 호버 때 읽는다)
  ] as const) {
    root.querySelectorAll<HTMLElement>(`[data-i18n-${form}]`).forEach((el) => {
      const key = el.getAttribute(`data-i18n-${form}`) as string;
      if (hasString(key)) el.setAttribute(attr, t(key));
    });
  }
}

/* ---------- 공통 상태 줄(§4.1) ----------
   창 맨 아래 고정, 모든 탭 공통. 잠금·전제 사유, 선택 없음, 다시 읽기 결과, 이동·되돌리기,
   숨김 안내, 작업 진행, 최소화 중 실패를 띄운다. 카드 상태 영역은 그 카드 작업의 결과만. */
interface StatusAction { label: string; run: () => void }
let statusTimer: ReturnType<typeof setTimeout> | null = null;
/** 누를 수 있는 메시지가 떠 있는가 — 다음 사용자 조작까지 유지, 배경 메시지가 덮지 않는다. */
let statusSticky = false;
function showStatusLine(text: string, opts: { cls?: 'ok' | 'warn' | ''; action?: StatusAction; background?: boolean } = {}): void {
  if (opts.background && statusSticky) return;
  const line = $('statusLine');
  const txt = $('statusText');
  const btn = $('statusAction') as HTMLButtonElement;
  if (statusTimer) { clearTimeout(statusTimer); statusTimer = null; }
  txt.textContent = text;
  txt.title = text; // 말줄임된 글 전체는 툴팁으로
  line.className = `status-line ${opts.cls ?? ''}`.trim();
  if (opts.action) {
    btn.textContent = opts.action.label;
    btn.onclick = () => { const a = opts.action!; clearStatusLine(); a.run(); };
    btn.hidden = false;
    statusSticky = true;
  } else {
    btn.hidden = true;
    btn.onclick = null;
    statusSticky = false;
    // 일반 메시지는 4초 뒤 사라진다.
    if (text) statusTimer = setTimeout(clearStatusLine, 4000);
  }
}
function clearStatusLine(): void {
  if (statusTimer) { clearTimeout(statusTimer); statusTimer = null; }
  statusSticky = false;
  $('statusText').textContent = '';
  $('statusText').title = '';
  const btn = $('statusAction') as HTMLButtonElement;
  btn.hidden = true;
  btn.onclick = null;
  $('statusLine').className = 'status-line';
}
// 누를 수 있는 메시지를 지우는 조작: 클릭, 실행(Enter·Space), 글자 입력, 탭 전환, 캔버스 선택 변경.
// 지우지 않는 조작: 포커스 이동(Tab·화살표), 포인터 이동·hover, 스크롤.
function dismissStickyOnAction(e: Event): void {
  if (!statusSticky) return;
  const target = e.target as HTMLElement | null;
  if (target && target.closest('#statusAction')) return; // 그 버튼 자체는 자기 일을 한다
  if (e.type === 'keydown') {
    const k = (e as KeyboardEvent).key;
    if (k === 'Tab' || k.startsWith('Arrow') || k === 'Shift' || k === 'Home' || k === 'End' || k === 'PageUp' || k === 'PageDown' || k === 'Escape') return;
  }
  clearStatusLine();
}
document.addEventListener('pointerdown', dismissStickyOnAction, true);
document.addEventListener('keydown', dismissStickyOnAction, true);

/** 유료 잠금 사유(§2.3) — [라이선스 →]는 설정 › 라이선스 키 입력칸으로. */
function showPaidReason(): void {
  showStatusLine(t('status.paid'), { cls: 'warn', action: { label: t('status.paidAction'), run: goToLicense } });
}
function goToLicense(): void {
  showTab('settings');
  // 포커스는 바로 준다 — 누른 [라이선스 →]가 상태 줄과 함께 사라져 포커스가 body로 떨어진 채
  // 한 프레임을 기다리지 않게(키보드 사용자는 그 사이 입력을 잃는다). 스크롤은 하지 않는다(preventScroll).
  ($('licenseKey') as HTMLInputElement).focus({ preventScroll: true });
  // 스크롤만 다음 프레임에 — showTab이 rAF로 탭의 지난 스크롤 위치를 되돌리므로 그 뒤에 와야 한다.
  requestAnimationFrame(() => $('licenseKey').scrollIntoView({ block: 'center' }));
}

/* ---------- 잠금(§2.3) — aria-disabled: 포커스는 받고, 누르면 동작 대신 사유 ---------- */
type LockReason = 'paid' | 'prereq';
/** 버튼·체크박스 잠금. reason이 null이면 푼다. prereqMsg는 전제 미충족 사유(공통 상태 줄 문구). */
function setLock(el: HTMLElement, reason: LockReason | null, prereqMsg = ''): void {
  if (reason) {
    el.setAttribute('aria-disabled', 'true');
    el.dataset.lock = reason;
    if (reason === 'prereq') el.dataset.lockMsg = prereqMsg;
    else delete el.dataset.lockMsg;
  } else {
    el.removeAttribute('aria-disabled');
    delete el.dataset.lock;
    delete el.dataset.lockMsg;
  }
}
function isLocked(el: HTMLElement): boolean {
  return el.getAttribute('aria-disabled') === 'true';
}
// 잠긴 컨트롤의 클릭·실행은 동작 대신 사유를 띄운다(캡처 단계에서 가로채 기존 리스너가 돌지 않게).
function onLockedActivate(e: Event): void {
  const el = (e.target as HTMLElement | null)?.closest<HTMLElement>('[aria-disabled="true"]');
  if (!el) return;
  if (e.type === 'keydown') {
    const k = (e as KeyboardEvent).key;
    if (k !== 'Enter' && k !== ' ') return;
  }
  e.preventDefault();
  e.stopImmediatePropagation();
  if (e.type === 'click' || e.type === 'keydown') {
    if (el.dataset.lock === 'paid') showPaidReason();
    else if (el.dataset.lock === 'edit') edLockedSave(); // 고치기 [저장] — 사유는 팝업 안 알림 줄에
    else if (el.id === 'btnApplyExistingText' && curSel.count && !hasTextStyles) {
      // "등록된 텍스트 스타일이 없어요 · 타이포에서 등록 →(유료)"
      showStatusLine(t('bind.tsNoneText'), { cls: 'warn', action: { label: t('bind.tsGotoType'), run: () => showMake('type') } });
    } else if (el.dataset.lockMsg) showStatusLine(el.dataset.lockMsg, { cls: 'warn' });
  }
}
document.addEventListener('click', onLockedActivate, true);
document.addEventListener('keydown', onLockedActivate, true);

/* ---------- 최소화(§4.9) — 140×104, 펼치기 버튼만. 기억하지 않는다. ---------- */
let isMini = false;
/** 최소화 중 실패한 작업 — 펼칠 때 "{작업} 실패 · [보기]". */
let miniFailure: { label: string; go: () => void } | null = null;
let miniOkTimer: ReturnType<typeof setTimeout> | null = null;

function setMini(on: boolean, notify = true): void {
  if (on === isMini) return;
  isMini = on;
  if (on) {
    closeMenu();
    closeModal();
    hideUiTip();
    reentry.cancel();
  }
  document.body.classList.toggle('is-mini', on);
  $('miniView').hidden = !on;
  if (notify) send({ type: 'SET_UI_SIZE', mode: on ? 'mini' : 'default' });
  if (on) {
    renderMiniMark();
    ($('btnExpand') as HTMLButtonElement).focus();
    return;
  }
  // 펼칠 때: ⚠가 있었으면 상태 줄에 "{작업} 실패 · [보기]". 보던 화면 유지, 포커스는 [—], 다시 읽기 1번.
  const fail = miniFailure;
  miniFailure = null;
  if (miniOkTimer) { clearTimeout(miniOkTimer); miniOkTimer = null; }
  $('miniBadge').hidden = true;
  if (fail) showStatusLine(t('status.failed', { op: fail.label }), { cls: 'warn', action: { label: t('status.view'), run: fail.go } });
  syncStickyOffsets();
  ($('btnMinimize') as HTMLButtonElement).focus();
  readScreen('expand');
}

function renderMiniMark(): void {
  const mark = $('btnExpand');
  const busy = opBusy();
  mark.classList.toggle('busy', busy);
  const prog = opProgress();
  mark.classList.toggle('spin', busy && prog === null);
  mark.style.setProperty('--prog', `${prog === null ? 25 : Math.round(prog * 100)}%`);
  const label = miniFailure ? t('ui.expandFail') : busy ? t('ui.expandBusy') : t('ui.expand');
  mark.setAttribute('aria-label', label);
  mark.title = label;
}
function showMiniResult(ok: boolean, fail?: { label: string; go: () => void }): void {
  if (!isMini) return;
  const badge = $('miniBadge');
  if (miniOkTimer) { clearTimeout(miniOkTimer); miniOkTimer = null; }
  if (ok) {
    if (miniFailure) return; // ⚠는 펼칠 때까지 유지 — ✓가 덮지 않는다
    badge.className = 'mini-badge ok';
    badge.textContent = '✓';
    badge.hidden = false;
    miniOkTimer = setTimeout(() => { badge.hidden = true; miniOkTimer = null; }, 3000);
  } else if (fail) {
    miniFailure = fail;
    badge.className = 'mini-badge fail';
    badge.textContent = '!';
    badge.hidden = false;
  }
  renderMiniMark();
}
$('btnMinimize').addEventListener('click', () => setMini(true));
$('btnExpand').addEventListener('click', () => setMini(false));

/* ---------- 작업 추적 — 진행 테두리·✓/⚠(§4.9)와 작업 직후 다시 읽기(§4.1) ----------
   사용자가 일으킨 작업 요청을 보내고 결과가 올 때까지. 조용한 다시 읽기는 대상이 아니다. */
type OpGo = () => void;
interface OpDef { results: CodeToUi['type'][]; label: string; go: OpGo; write: boolean }
const goLayer = (step: ApplyStep): OpGo => () => {
  // 컴포넌트(베타)를 그 사이 껐으면 숨은 카드 대신 설정의 체크박스로(§4.7 "베타" · §4.9)
  if (step === 'structure' && !componentsBeta) { showTab('settings'); const cb = $('componentsBeta'); cb.scrollIntoView({ block: 'center' }); cb.focus(); return; }
  showTab('layer');
  showApplyStep(step);
};
const OPS: Partial<Record<UiToCode['type'], OpDef>> = {
  EXTRACT: { results: ['EXTRACT_RESULT'], label: 'op.extract', go: () => showMake('color'), write: false },
  CREATE_TOKENS: { results: ['CREATE_RESULT'], label: 'op.create', go: () => showMake('token'), write: true },
  CREATE_SEMANTICS: { results: ['SEMANTICS_RESULT'], label: 'op.semantics', go: () => showMake('token'), write: true },
  GENERATE_DARK_MODE: { results: ['DARK_MODE_RESULT'], label: 'op.dark', go: () => showMake('theme'), write: true },
  SCAN_TEXT_STYLES: { results: ['TEXT_STYLE_CANDIDATES'], label: 'op.textScan', go: () => showMake('type'), write: false },
  CREATE_TEXT_STYLES: { results: ['TEXT_STYLES_RESULT'], label: 'op.textStyles', go: () => showMake('type'), write: true },
  APPLY_TEXT_STYLES: { results: ['TEXT_STYLES_APPLIED'], label: 'op.textApply', go: () => { showTab('layer'); showApplyStep('bind'); }, write: true },
  APPLY: { results: ['APPLY_RESULT'], label: 'op.bind', go: goLayer('bind'), write: false },
  APPLY_SELECTED: { results: ['APPLY_RESULT'], label: 'op.bind', go: goLayer('bind'), write: true },
  RENAME: { results: ['RENAME_RESULT'], label: 'op.rename', go: goLayer('rename'), write: false },
  RENAME_APPLY: { results: ['RENAME_RESULT'], label: 'op.rename', go: goLayer('rename'), write: true },
  SCAN_COMPONENT_CANDIDATES: { results: ['COMPONENT_CANDIDATES'], label: 'op.components', go: goLayer('structure'), write: false },
  REGISTER_COMPONENTS: { results: ['COMPONENTS_RESULT'], label: 'op.components', go: goLayer('structure'), write: true },
  CLASSIFY_VARIANTS: { results: ['VARIANTS_RESULT'], label: 'op.components', go: goLayer('structure'), write: true },
  GENERATE_MISSING_VARIANTS: { results: ['GENERATE_RESULT'], label: 'op.components', go: goLayer('structure'), write: true },
  SCAN_SIMILAR: { results: ['SIMILAR_CANDIDATES'], label: 'op.components', go: goLayer('structure'), write: false },
  COMPONENTIZE_SIMILAR: { results: ['COMPONENTIZE_RESULT'], label: 'op.components', go: goLayer('structure'), write: true },
  EXPORT: { results: ['EXPORT_RESULT'], label: 'op.export', go: () => showTab('settings'), write: false },
  SET_COLLECTION_ROLE: { results: ['COLLECTION_ROLES'], label: 'op.roles', go: () => showTab('settings'), write: true },
};
/** 결과를 기다리는 작업(요청 종류별). 마법사는 단계 요청을 따로 세지 않고 한 작업으로 본다. */
const opPending = new Map<UiToCode['type'], OpDef>();
let opWizard = false;
let opProg: number | null = null;
const opBusy = (): boolean => opWizard || opPending.size > 0;
const opProgress = (): number | null => opProg;

/** 조용한 다시 계산(복귀 때 미리보기) — 진행 테두리 대상이 아니다(§4.9). */
let opSilent = false;
function opSent(msg: UiToCode): void {
  if (wizardRunning || opSilent) return; // 마법사 단계 요청은 마법사 한 작업으로 센다
  const def = OPS[msg.type];
  if (!def) return;
  opPending.set(msg.type, def);
  if (msg.type === 'APPLY_SELECTED' || msg.type === 'APPLY') opProg = null;
  if (isMini) renderMiniMark();
}
/** 결과 메시지 → 끝난 작업 판정. 실패 조건(§4.9): 오류 응답, 유료 잠금 응답, 다크 생성 오류,
 *  컴포넌트 실패 1건 이상. 취소는 표시 없음. */
function opReceived(m: CodeToUi): void {
  if (m.type === 'PROGRESS') {
    opProg = m.total > 0 ? Math.min(1, m.done / m.total) : null;
    if (isMini) renderMiniMark();
    return;
  }
  if (wizardRunning) return;
  if (m.type === 'ERROR' || m.type === 'PREMIUM_REQUIRED') {
    const defs = [...opPending.values()];
    if (!defs.length) return;
    opPending.clear();
    opProg = null;
    opFinished(false, defs[0]);
    return;
  }
  for (const [type, def] of opPending) {
    if (!def.results.includes(m.type)) continue;
    opPending.delete(type);
    opProg = null;
    let failed = false;
    let cancelled = false;
    if (m.type === 'DARK_MODE_RESULT' && m.error) failed = true;
    if ((m.type === 'COMPONENTS_RESULT' || m.type === 'VARIANTS_RESULT') && (m.failures?.length ?? 0) > 0) failed = true;
    // 속성 값 실패 · 복사본 · 빈 자리도 실패로(§4.7 5·6번) — failures에도 실리지만 꼬리와 같은 기준으로 한 번 더 본다.
    if (m.type === 'COMPONENTS_RESULT' && ((m.propFailed?.length ?? 0) + (m.fillKept?.length ?? 0) + (m.placeCloned?.length ?? 0) + (m.placeFailed?.length ?? 0)) > 0) failed = true;
    // [묶기]에서 제자리에 못 둔 것도 실패로(§4.7 "인스턴스 자리" 5번 — 최소화 중이면 ⚠).
    if (m.type === 'COMPONENTIZE_RESULT' && (m.placeFailed?.length ?? 0) > 0) failed = true;
    if (m.type === 'APPLY_RESULT' && m.cancelled) cancelled = true;
    if (cancelled) { if (isMini) renderMiniMark(); }
    else opFinished(!failed, def);
    // 작업 직후 다시 읽기(§4.1) — 파일을 바꾼 작업만. 준비 상태 + 변수 표 + 지금 화면의 표.
    // 실패(⚠)로 끝나도 파일을 바꿨으면 읽는다(컴포넌트 등록·묶기·분류 — §4.1 표).
    // [묶기]는 마스터가 있을 때만 — 실패 여부와 무관(이른 반환 = 마스터 없음 = 아무것도 안 바꿈).
    const reread = m.type === 'COMPONENTIZE_RESULT' ? changedFile(m) : !failed || changedFile(m);
    if (def.write && reread) readScreen('work');
    return;
  }
}
/** 실패로 끝난 결과라도 파일을 바꿨나(§4.1 "플러그인 작업이 끝난 직후"). 그 밖의 실패는 바꾸지 않았다고 본다. */
function changedFile(m: CodeToUi): boolean {
  if (m.type === 'COMPONENTS_RESULT') return m.registered > 0 || m.sets > 0;
  if (m.type === 'COMPONENTIZE_RESULT') return !!m.master; // 마스터를 컴포넌트로 만든 결과(빈 이름 = 아무것도 안 바꿈)
  if (m.type === 'VARIANTS_RESULT') return m.sets > 0;
  return false;
}
function opFinished(ok: boolean, def: OpDef): void {
  if (!isMini) return;
  if (ok) showMiniResult(true);
  else showMiniResult(false, { label: t(def.label), go: def.go });
  renderMiniMark();
}
/** 마법사 실행 시작·끝 — 실패는 단계 실패가 있을 때, 취소는 표시 없음. */
function opWizardStart(): void {
  opWizard = true;
  if (isMini) renderMiniMark();
}
function opWizardEnd(result: 'ok' | 'fail' | 'cancel'): void {
  opWizard = false;
  opProg = null;
  if (result !== 'cancel') opFinished(result === 'ok', { results: [], label: 'op.wizard', go: () => { showTab('variables'); showVarSub('home'); }, write: true });
  else if (isMini) renderMiniMark();
  readScreen('work');
  reentry.release();
}

/* ---------- 다시 읽기(§4.1) ----------
   때: 탭·하위 화면에 들어갈 때 / 작업 직후 / 창에 다시 들어올 때(400ms 합침, 2초 간격) / ↻ / 펼칠 때.
   화면별로 읽는 것: 변수 첫 화면 = 준비 상태 + 변수 표 + 사용 수(300개 규칙),
   변수 › 만들기 = 준비 상태 + 다크 카드용 컬렉션, 레이어 = 준비 상태, 설정 = 없음(계층은 팝업을 열 때 읽는다). */
type ReadWhy = 'enter' | 'work' | 'reentry' | 'expand';
function readScreen(why: ReadWhy): void {
  if (isMini) return; // 최소화 상태에서는 다시 읽지 않는다
  if (activeTab !== 'settings' || why === 'work') requestPrereq();
  if (activeTab === 'variables' && varSub === 'home') {
    send({ type: 'GET_VAR_TABLE' });
    requestManagerUsage(why === 'work' ? 'work' : 'quiet');
  } else if (activeTab === 'variables' && varSub === 'make') {
    send({ type: 'GET_VARIABLES' });
  }
  if (why === 'work' && !(activeTab === 'variables' && varSub === 'home')) send({ type: 'GET_VAR_TABLE' });
  if (activeTab === 'layer') {
    readLayerLibUse();
    if (why !== 'work') bindOnReturn();
  }
}

// 보류(④): 메뉴·팝업·팝오버 열림, 포인터 눌림, 진행 테두리 대상 작업 실행 중, 같은 종류 직전 요청 미완료.
let pointerDown = false;
// 같은 종류의 직전 요청 — 변수 목록의 사용 수는 변수 탭에 있을 때만 이 화면의 요청이다(응답이 오면 풀린다).
const reentryHeld = (): boolean => !!menuEl || !!modalEl || pointerDown || opBusy() || prereqInFlight || (activeTab === 'variables' && vmUsageInFlight) || !$('readinessPop').hidden;
const reentry = createReentryScheduler(() => readScreen('reentry'), reentryHeld, {
  now: () => Date.now(),
  set: (fn, ms) => setTimeout(fn, ms),
  clear: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
});
// 포인터가 나갔다 들어옴 + 창 포커스 회복 — 두 신호를 합쳐 400ms 뒤 한 번. 창 안 이동은 신호가 아니다.
let pointerOutside = false;
document.documentElement.addEventListener('pointerleave', () => { pointerOutside = true; });
document.documentElement.addEventListener('pointerenter', () => {
  if (!pointerOutside) return;
  pointerOutside = false;
  if (!isMini) reentry.signal();
});
window.addEventListener('focus', () => { if (!isMini) reentry.signal(); });
document.addEventListener('pointerdown', () => { pointerDown = true; }, true);
document.addEventListener('pointerup', () => { pointerDown = false; reentry.release(); }, true);
document.addEventListener('pointercancel', () => { pointerDown = false; reentry.release(); }, true);

// 초기: 컬렉션·전제·라이선스 조회. 유료 카드는 Paid 확인 전까지, 전제 카드는 변수 생성 전까지 잠금.
applyStaticI18n(); // 정적 라벨 외부화(캐논 변형 전에 원본 요소에 적용)
applyCardChrome(); // 캐논: 카드 접기 + 버튼 타이틀 이동
applyButtonTips(); // 구조 버튼 호버 툴팁
syncStickyOffsets(); // 카드 헤더 sticky 오프셋(탭 바 + 선택 바 높이)
// 선택 바는 문구가 바뀌며 높이가 변하고, 창 리사이즈로 두 바 모두 접힐 수 있다 → 계속 추적.
if (typeof ResizeObserver !== 'undefined') {
  const ro = new ResizeObserver(() => syncStickyOffsets());
  const tabsEl = document.querySelector('.tabs');
  if (tabsEl) ro.observe(tabsEl);
  ro.observe($('listHead')); // 변수 목록 머리줄이 보이면 사이드바 고정 위치를 잰다
}
window.addEventListener('resize', syncStickyOffsets);

// 목록 상한은 패널 높이 비례(40vh)라 리사이즈하면 몇 행이 들어가는지가 바뀐다 → 다시 스냅.
// 목록마다 리스너를 달면 드래그 중 리사이즈 1회에 목록 수만큼 레이아웃이 돌아 끊긴다 →
// 하나로 모아 디바운스한다(드래그가 멎은 뒤 한 번만 재계산해도 결과는 같다).
updateGates();
renderPipeline(); // §3: 진행 안내 초기 표시(이후 PREREQ_STATE로 갱신)
renderTokens(); // UX4: 시작 시 빈 상태 안내 표시
refreshTreeEmptyStates(); // 바인딩·컴포넌트 카드도 시작 시 빈 상태 표시
send({ type: 'GET_COLLECTIONS' });
requestPrereq(); // #11: 단계 전제 상태
send({ type: 'GET_LICENSE' });
send({ type: 'GET_VARIABLES' }); // 다크 카드의 컬렉션·모드 선택지
send({ type: 'GET_SETTINGS' }); // #19: 기준 크기·맥락 깊이는 파일에 기억된 값으로 시작
refreshDarkModes(); // 응답 전 ‘불러오는 중…’ 안내(오안내 ‘토큰 생성으로’ 방지)

// #11: 전제 안내의 ‘토큰 생성으로’ 바로가기.
document.querySelectorAll<HTMLButtonElement>('[data-goto="create"]').forEach((b) => b.addEventListener('click', goToCreate));

/* ---------- 탭 내비게이션 (IA v3: 변수 · 레이어 · 설정) ---------- */
const TABS = ['variables', 'layer', 'settings'] as const;
type TabName = (typeof TABS)[number];
/** 변수 탭의 하위 화면 — PR 1 중간 상태: 첫 화면(마법사·준비 현황·변수 관리) / 만들기. */
type VarSub = 'home' | 'make';
let activeTab: TabName = 'variables';
let varSub: VarSub = 'home';
/** 플러그인이 열려 있는 동안 기억(§2.6) — 탭·하위 화면별 스크롤. 다시 열면 처음 상태. */
const screenScroll = new Map<string, number>();
const screenKey = (): string => (activeTab === 'variables' ? `variables:${varSub}` : activeTab);

function showTab(name: TabName): void {
  const changed = name !== activeTab;
  if (changed) screenScroll.set(screenKey(), window.scrollY);
  if (changed && activeTab === 'layer' && hasBindPreview()) bindLeftSince = true; // 미리보기 뒤 탭을 떠남(⑧)
  activeTab = name;
  for (const tb of TABS) {
    $(`tab-${tb}`).classList.toggle('active', tb === name);
    const btn = $(`tabbtn-${tb}`);
    const on = tb === name;
    btn.classList.toggle('active', on);
    btn.setAttribute('aria-selected', String(on));
    btn.tabIndex = on ? 0 : -1; // UX8: roving tabindex — 탭 묶음은 한 번의 Tab 정지점
  }
  // "목록 기준 다름"은 변수 탭의 상황 안내 줄에만(§4.1 · §4.4).
  renderSelBase();
  // 시작 화면 고정(①): 요약을 본 뒤 변수 탭을 떠나면 푼다.
  if (changed && name !== 'variables' && wizLatch && wizLatch.summarySeen && !wizardRunning) wizLatch = null;
  syncManagerVisibility(false);
  syncStickyOffsets();
  if (changed) {
    const y = screenScroll.get(screenKey()) ?? 0;
    requestAnimationFrame(() => window.scrollTo(0, y));
    readScreen('enter');
  }
}

/** 변수 탭 하위 화면 전환. 탭은 바꾸지 않는다(부르는 쪽이 showTab). */
function showVarSub(sub: VarSub): void {
  if (sub === varSub) return;
  if (activeTab === 'variables') screenScroll.set(screenKey(), window.scrollY);
  varSub = sub;
  $('varMake').style.display = sub === 'make' ? '' : 'none';
  renderVarScreen(); // 첫 화면(불러오는 중·시작 화면·목록)은 만들기 동안 숨긴다
  syncManagerVisibility(false);
  syncStickyOffsets();
  if (activeTab === 'variables') {
    const y = screenScroll.get(screenKey()) ?? 0;
    requestAnimationFrame(() => window.scrollTo(0, y));
    readScreen('enter');
  }
}

/** 변수 › 만들기로(필요하면 단계까지). 옛 '만들기' 탭으로 가던 모든 바로가기가 여기로 온다. */
function showMake(step?: MakeStep): void {
  showTab('variables');
  showVarSub('make');
  if (step) showMakeStep(step);
}


/* ---------- 컬렉션 계층(§9) — 이름이 아니라 지정으로 Global/Semantic/Component ---------- */
type RoleKey = 'global' | 'semantic' | 'component';
const ROLE_LABEL: Record<RoleKey, string> = { global: 'Global', semantic: 'Semantic', component: 'Component' };
let colRoleRows: CollectionRoleInfo[] = [];

function renderCollectionRoles(rows: CollectionRoleInfo[]): void {
  const prev = colRoleRows;
  colRoleRows = rows;
  const box = $('collectionRoles');
  clearMount(box);
  if (!rows.length) {
    const p = document.createElement('div');
    p.className = 'hint';
    p.textContent = t('colRoles.empty');
    box.appendChild(p);
    return;
  }
  for (const r of rows) {
    const row = document.createElement('div');
    row.className = 'col-role';
    const name = document.createElement('div');
    name.className = 'name';
    name.textContent = r.name;
    name.title = r.name;
    const sel = document.createElement('select');
    sel.setAttribute('aria-label', r.name);
    // 자동 = 지정 없음(이름으로 판정). 지금 이름 판정 결과를 함께 보여 준다.
    const opts: [string, string][] = [
      ['', !r.set && r.role ? t('colRoles.auto', { role: ROLE_LABEL[r.role] }) : t('colRoles.autoNone')],
      ['global', 'Global'],
      ['semantic', 'Semantic'],
      ['component', 'Component'],
      ['none', t('colRoles.none')],
    ];
    for (const [v, label] of opts) {
      const o = document.createElement('option');
      o.value = v;
      o.textContent = label;
      sel.appendChild(o);
    }
    sel.value = r.set ?? '';
    sel.addEventListener('change', () => {
      const role = (sel.value || null) as RoleKey | 'none' | null;
      // 같은 역할을 맡던 다른 컬렉션은 풀린다(한 역할 = 한 컬렉션) — 미리 알려 준다.
      const holder = role && role !== 'none' ? colRoleRows.find((x) => x.id !== r.id && x.set === role) : undefined;
      pendingRoleNote = { id: r.id, name: r.name, role, prev: holder?.name };
      send({ type: 'SET_COLLECTION_ROLE', collectionId: r.id, role });
    });
    const sub = document.createElement('div');
    sub.className = 'sub';
    sub.append(t('colRoles.vars', { n: r.vars }));
    // 추천은 지정이 없고, 추측이 지금 판정과 다를 때만 — 이미 맞으면 소음이다.
    if (!r.set && r.guess && r.guess !== r.role) {
      sub.append(' · ', t('colRoles.guess', { role: ROLE_LABEL[r.guess] }), ' ');
      const use = document.createElement('button');
      use.className = 'link';
      use.textContent = t('colRoles.useGuess');
      use.addEventListener('click', () => {
        const holder = colRoleRows.find((x) => x.id !== r.id && x.set === r.guess);
        pendingRoleNote = { id: r.id, name: r.name, role: r.guess, prev: holder?.name };
        send({ type: 'SET_COLLECTION_ROLE', collectionId: r.id, role: r.guess });
      });
      sub.appendChild(use);
    }
    row.append(name, sel, sub);
    box.appendChild(row);
  }
  // 방금 바꾼 지정의 결과 문구(지정 응답일 때만).
  if (pendingRoleNote && prev.length) {
    const n = pendingRoleNote;
    pendingRoleNote = null;
    // 해제(null)는 이름 판정으로 돌아간다 — 실제 결과는 방금 받은 행의 role이 말해 준다.
    const now = rows.find((x) => x.id === n.id);
    const label = n.role === null
      ? now?.role ? t('colRoles.auto', { role: ROLE_LABEL[now.role] }) : t('colRoles.autoNone')
      : n.role === 'none' ? t('colRoles.none') : ROLE_LABEL[n.role];
    const dup = n.prev && n.role && n.role !== 'none' ? ' ' + t('colRoles.dup', { role: ROLE_LABEL[n.role], prev: n.prev }) : '';
    setStatus('colRolesStatus', t('colRoles.saved', { name: n.name, role: label }) + dup, dup ? 'warn' : 'ok');
  }
}
let pendingRoleNote: { id: string; name: string; role: RoleKey | 'none' | null; prev?: string } | null = null;
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
$('btnGoMake').addEventListener('click', () => showMake('color'));
$('btnMakeBack').addEventListener('click', () => {
  showVarSub('home');
  ($('btnGoMake') as HTMLButtonElement).focus();
});

/* ---------- #5: 단계 레일 — 한 화면에 한 단계 ---------- */
// 만들기 4단계·적용 3단계. 카드는 마크업의 data-make-step / data-apply-step으로 묶여 있고,
// 레일은 그중 한 묶음만 보여준다.
const MAKE_STEPS = ['color', 'token', 'theme', 'type'] as const;
const APPLY_STEPS = ['bind', 'rename', 'structure'] as const;
type MakeStep = (typeof MAKE_STEPS)[number];
type ApplyStep = (typeof APPLY_STEPS)[number];

function showStep(attr: 'make' | 'apply', step: string): void {
  const key = attr === 'make' ? 'data-make-step' : 'data-apply-step';
  const rail = $(attr === 'make' ? 'makeRail' : 'applyRail');
  for (const el of Array.from(document.querySelectorAll<HTMLElement>(`.step[${key}]`))) {
    // 시맨틱 매핑처럼 원래부터 숨은 카드(자동 흡수)는 단계가 맞아도 계속 숨긴다.
    if (el.dataset.alwaysHidden !== undefined) continue;
    el.style.display = el.getAttribute(key) === step ? '' : 'none';
  }
  for (const b of Array.from(rail.querySelectorAll<HTMLElement>('.step-chip, .subtab'))) {
    const on = b.getAttribute(key) === step;
    if (b.classList.contains('subtab')) {
      // 레이어 하위 탭: tablist, 정지점 1개(§4.1)
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
    } else if (on) b.setAttribute('aria-current', 'step');
    else b.removeAttribute('aria-current');
  }
  if (attr === 'apply') {
    const changed = currentApplyStep !== step;
    currentApplyStep = step as ApplyStep;
    if (changed) syncStickyOffsets();
  }
}
let currentApplyStep: ApplyStep = 'bind';

let curMakeStep: MakeStep = 'color';
const showMakeStep = (s: MakeStep): void => {
  curMakeStep = s;
  showStep('make', s);
  renderMakeNoSel();
};
/** 만들기 — 선택이 없으면 지금 단계 카드의 버튼 줄 아래에 안내(§4.1, 선택 표시줄이 없으므로). */
function renderMakeNoSel(): void {
  let hint = document.getElementById('makeNoSel');
  if (!hint) {
    hint = document.createElement('div');
    hint.id = 'makeNoSel';
    hint.className = 'hint';
    hint.textContent = t('make.noSel');
  }
  const card = document.querySelector<HTMLElement>(`#varMake .step[data-make-step="${curMakeStep}"]:not([data-always-hidden])`);
  const bar = card?.querySelector<HTMLElement>('.toolbar');
  if (bar && hint.previousElementSibling !== bar) bar.after(hint);
  hint.hidden = lastSelCount > 0;
}
const showApplyStep = (s: ApplyStep): void => showStep('apply', s);

for (const b of Array.from(document.querySelectorAll<HTMLElement>('#makeRail .step-chip'))) {
  b.addEventListener('click', () => showMakeStep(b.dataset.makeStep as MakeStep));
}
/* 컴포넌트(베타) — 기본 끔. 켜야 레이어 › 컴포넌트 하위 탭이 보인다(§4.7 "베타"). */
let componentsBeta = false;
/** 화살표·Home·End가 도는 하위 탭 — 보이는 것만(끔이면 연결 · 이름). */
const visibleApplySteps = (): ApplyStep[] => APPLY_STEPS.filter((s) => s !== 'structure' || componentsBeta);
function setComponentsBeta(on: boolean, announce: boolean): void {
  componentsBeta = on;
  ($('componentsBeta') as HTMLInputElement).checked = on;
  $('subtabComponents').hidden = !on;
  // 기억해 둔 하위 화면이 컴포넌트면 연결로(켠 순간에는 화면을 옮기지 않는다)
  if (!on && currentApplyStep === 'structure') showApplyStep('bind');
  if (announce) showStatusLine(t(on ? 'settings.componentsBetaOn' : 'settings.componentsBetaOff'));
}
($('componentsBeta') as HTMLInputElement).addEventListener('change', (e) => {
  setComponentsBeta((e.target as HTMLInputElement).checked, true);
  saveSettings();
});
for (const b of Array.from(document.querySelectorAll<HTMLElement>('#applyRail .subtab'))) {
  b.addEventListener('click', () => showApplyStep(b.dataset.applyStep as ApplyStep));
  b.addEventListener('keydown', (e) => {
    const steps = visibleApplySteps();
    const ni = nextTabIndex(e.key, steps.indexOf(b.dataset.applyStep as ApplyStep), steps.length);
    if (ni < 0) return;
    e.preventDefault();
    showApplyStep(steps[ni]);
    document.querySelector<HTMLElement>(`#applyRail [data-apply-step="${steps[ni]}"]`)?.focus();
  });
}
showMakeStep('color');
showApplyStep('bind');

// 카드 툴바의 '다음 →' — 레일 칩과 같은 이동을 카드 안에서(일이 끝난 자리에서 바로 다음으로).
for (const b of Array.from(document.querySelectorAll<HTMLElement>('[data-next-make]'))) {
  b.addEventListener('click', () => showMakeStep(b.dataset.nextMake as MakeStep));
}




/* =====================================================================
   공용 — 우클릭 메뉴 · 팝업
   ===================================================================== */
interface MenuItem {
  label: string;
  onSelect: () => void;
  disabled?: boolean;
  separatorBefore?: boolean;
  /** 잠긴 항목의 보조 문구(aria-disabled 항목 아래 작은 글씨). */
  note?: string;
  /** 고르면 다른 곳으로 포커스가 가는 항목(§2.10 예외) — 여는 버튼으로 되돌리지 않는다. */
  focusElsewhere?: boolean;
}
let menuOnClose: (() => void) | null = null;
let menuEl: HTMLElement | null = null;
function closeMenu(): void {
  if (!menuEl) return;
  menuEl.remove();
  menuEl = null;
  const cb = menuOnClose;
  menuOnClose = null;
  cb?.();
  reentry.release(); // 메뉴가 열려 있어 미뤄 둔 다시 읽기
}
/** (x, y)에 메뉴. 창 밖으로 안 넘치게 당기고, ↑↓·Enter·Esc, 바깥 클릭·스크롤·크기 변경에 닫는다. */
function openMenu(x: number, y: number, items: MenuItem[], returnFocus?: HTMLElement, onClose?: () => void): void {
  closeMenu();
  menuOnClose = onClose ?? null;
  const m = document.createElement('div');
  m.className = 'ctx-menu';
  m.setAttribute('role', 'menu');
  const buttons: HTMLButtonElement[] = [];
  for (const it of items) {
    if (it.separatorBefore) m.appendChild(document.createElement('hr'));
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('role', 'menuitem');
    b.textContent = it.label;
    // 잠긴 항목은 aria-disabled(포커스는 받음) + 보조 문구.
    if (it.disabled) {
      b.setAttribute('aria-disabled', 'true');
      if (it.note) {
        const n = document.createElement('span');
        n.className = 'menu-note';
        n.textContent = it.note;
        b.appendChild(n);
      }
    }
    b.addEventListener('click', () => {
      if (it.disabled) return;
      closeMenu();
      if (!it.focusElsewhere) returnFocus?.focus();
      it.onSelect();
    });
    m.appendChild(b);
    buttons.push(b);
  }
  $('overlayRoot').appendChild(m);
  const r = m.getBoundingClientRect();
  m.style.left = `${Math.max(4, Math.min(x, window.innerWidth - r.width - 4))}px`;
  m.style.top = `${Math.max(4, Math.min(y, window.innerHeight - r.height - 4))}px`;
  const enabled = buttons;
  enabled[0]?.focus();
  m.addEventListener('keydown', (e) => {
    const i = enabled.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); enabled[(i + 1) % enabled.length]?.focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); enabled[(i - 1 + enabled.length) % enabled.length]?.focus(); }
    else if (e.key === 'Escape') { e.preventDefault(); closeMenu(); returnFocus?.focus(); }
    else if (e.key === 'Tab') { e.preventDefault(); }
  });
  menuEl = m;
}
document.addEventListener('pointerdown', (e) => { if (menuEl && !menuEl.contains(e.target as Node)) closeMenu(); }, true);
window.addEventListener('resize', closeMenu);
document.addEventListener('scroll', closeMenu, true);

let modalEl: HTMLElement | null = null;
let modalReturnFocus: HTMLElement | (() => HTMLElement | null | undefined) | null = null;
let modalOnClose: (() => void) | null = null;
/** 닫기 전 확인(§4.4 고치기) — Esc · 바깥 누름 · requestCloseModal을 가로챈다. false면 닫지 않는다. */
let modalBeforeClose: ((how: 'esc' | 'backdrop' | 'button') => boolean) | null = null;
function closeModal(): void {
  if (!modalEl) return;
  const cb = modalOnClose;
  modalOnClose = null;
  modalBeforeClose = null;
  cb?.(); // 팝업에 빌려 온 요소를 원래 자리로 — 지우기 전에
  modalEl.remove();
  modalEl = null;
  const rf = modalReturnFocus;
  modalReturnFocus = null;
  (typeof rf === 'function' ? rf() : rf)?.focus();
  reentry.release();
}
/** 닫기 요청 — 닫기 전 확인이 있으면 그것을 거친다(Esc · 바깥 누름 · [취소]는 모두 같다). */
function requestCloseModal(how: 'esc' | 'backdrop' | 'button'): void {
  if (modalBeforeClose && !modalBeforeClose(how)) return;
  closeModal();
}
interface ModalOpts {
  /** 처음 포커스(없으면 첫 입력 칸 → 주 버튼 → 첫 버튼). */
  focus?: HTMLElement;
  /** 닫기 전 확인 — false를 돌려주면 닫지 않는다. */
  beforeClose?: (how: 'esc' | 'backdrop' | 'button') => boolean;
  /** 단추 줄 위(팝업 아래 고정)에 둘 줄들 — 오류 줄 · 확인 줄. */
  footTop?: HTMLElement[];
}
/** 창 안 오버레이 팝업 — Esc·바깥 클릭으로 닫힘, Tab은 팝업 안에서만 돈다. 내용은 안에서 스크롤하고 단추 줄은 아래에 고정. */
function openModal(title: HTMLElement | string, body: HTMLElement, foot: HTMLElement[], returnFocus?: HTMLElement | (() => HTMLElement | null | undefined), onClose?: () => void, opts: ModalOpts = {}): HTMLElement {
  closeModal();
  closeMenu();
  modalReturnFocus = returnFocus ?? (document.activeElement as HTMLElement | null);
  modalOnClose = onClose ?? null;
  modalBeforeClose = opts.beforeClose ?? null;
  const back = document.createElement('div');
  back.className = 'modal-backdrop';
  const box = document.createElement('div');
  box.className = 'modal';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  const h = document.createElement('h3');
  if (typeof title === 'string') h.textContent = title;
  else h.appendChild(title);
  const scroll = document.createElement('div');
  scroll.className = 'm-scroll';
  scroll.append(h, body);
  const fw = document.createElement('div');
  fw.className = 'm-foot-wrap';
  const f = document.createElement('div');
  f.className = 'm-foot';
  f.append(...foot);
  fw.append(...(opts.footTop ?? []), f);
  box.append(scroll, fw);
  back.appendChild(box);
  back.addEventListener('pointerdown', (e) => { if (e.target === back) requestCloseModal('backdrop'); });
  box.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.preventDefault(); requestCloseModal('esc'); return; }
    if (e.key !== 'Tab') return;
    const focusables = Array.from(box.querySelectorAll<HTMLElement>('button:not(:disabled), select:not(:disabled), input:not(:disabled), [tabindex="0"]')).filter((x) => !x.closest('[hidden]'));
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  $('overlayRoot').appendChild(back);
  modalEl = back;
  (opts.focus ?? box.querySelector<HTMLElement>('select, input, button.primary, button') ?? box).focus();
  return box;
}
function modalButton(label: string, onClick: () => void, primary = false): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = label;
  if (primary) b.className = 'primary';
  b.addEventListener('click', onClick);
  return b;
}

/** 클립보드 복사 — 플러그인 창은 navigator.clipboard가 막힐 수 있어 execCommand로 한 번 더 시도한다. */
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch { /* 권한 없음 — 아래로 */ }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch { ok = false; }
  ta.remove();
  return ok;
}

/* =====================================================================
   변수 탭(IA v3 §4.2~§4.4) — 불러오는 중 / 시작 화면 / 변수 목록
   - 목록은 항상 전체: [모두] + 컬렉션 칩, 계층 순서 구역(C → S → G → 계층 없음).
   - 선택(목록 기준)이 쓰는 변수(직접 + ↳ 간접)만 펼친다. 사용 수 단위는 "곳"(인스턴스 안쪽 포함).
   - 목록 기준(③): 플러그인이 만든 선택은 기준을 바꾸지 않는다. [기준 바꾸기]·캔버스 직접 선택으로만.
   ===================================================================== */
const BIG_SELECTION = 300; // ⑤ 이보다 크면 자동으로 읽지 않는다(↻·[읽기]는 무시)
const DETAIL_LIMIT = 50; // 상세 "쓰인 곳" 이름 최대 수

let vmOpen = false; // 변수 탭 첫 화면(시작 화면·목록)이 보이는가
let vmCols: VarCollection[] = [];
let vmVars: VarRow[] = [];
let vmTableKnown = false;
let vmTableSig = '';
let libVars: LibraryVar[] = [];
/** 직접 사용(변수 id → 곳·레이어). null = 판정 없음(기준 없음 · 아직 안 읽음). */
let usageMap: Map<string, { places: number; layers: number }> | null = null;
let indirectMap = new Map<string, string[]>();
let deletedUse: { count: number; nodeIds: string[] } = { count: 0, nodeIds: [] };
let vmUsageReq = 0;
/** 사용 수 조회가 응답을 기다리는 중 — 겹쳐 보내지 않고, 창 다시 들어옴은 보류한다. */
let vmUsageInFlight = false;
/** 사용자가 일으킨 읽기(↻·[읽기]·선택 변경)인가 — 칩 숫자 "…"·상태 줄 문구는 이때만(조용한 반영 아님). */
let vmUsageVisible = false;
let vmUsageSig = '';
/** ↻ 결과 비교용 — 누르기 전 표·사용 수. */
let refreshBefore: { table: string; usage: Map<string, number> } | null = null;

interface SelInfo { ids: string[]; count: number; scanned: number; name: string }
let curSel: SelInfo = { ids: [], count: 0, scanned: 0, name: '' };
/** 목록 기준(③) — 사용 수를 셀 레이어. 플러그인이 만든 선택은 이것을 바꾸지 않는다. */
let baseline: SelInfo | null = null;
/** 큰 선택이라 자동으로 읽지 않았다(⑤) — 상황 안내 줄 [읽기]. */
let bigSkipped = false;

/** 사이드바에서 고른 항목(결정 B). null = 아직 안 정함(처음 규칙). */
let sideSel: SideSel | null = null;
/** 사용자가 사이드바에서 직접 골랐다 — 선택이 바뀌어도 다시 정하지 않는다(§4.4). */
let sidePicked = false;
/** 사이드바에서 펼친 컬렉션(직접 펼치거나 접은 것만). 없으면 처음 규칙. */
const sideOpen = new Map<string, boolean>();
let query = '';
let searchOpen = false;
let modeName: string | null = null; // 고른 모드 이름(없으면 각 컬렉션 기본 모드)
/** 키보드 포커스 줄 — 다시 그려도 지킨다. */
let focusKey: string | null = null;
let vmSelected: string | null = null;

const sameIds = (a: readonly string[], b: readonly string[]): boolean => a.length === b.length && a.every((x, i) => x === b[i]);
const localVarCount = (): number => vmVars.length;

/* ---------- 화면 고르기(§4.2·§4.3) ---------- */
type VarScreen = 'loading' | 'start' | 'list';
function varScreen(): VarScreen {
  if (!vmTableKnown) return 'loading';
  if (startLatched() || localVarCount() === 0) return 'start';
  return 'list';
}
function renderVarScreen(): void {
  const scr = varSub === 'home' ? varScreen() : null;
  $('varLoading').style.display = scr === 'loading' ? '' : 'none';
  $('varStart').style.display = scr === 'start' ? '' : 'none';
  $('varList').style.display = scr === 'list' ? '' : 'none';
  placeWizard();
  if (scr === 'start') renderStart();
  if (scr === 'list') renderVarList();
  renderReadinessButtons();
}

/** 변수 첫 화면이 보이는가 = 변수 탭 + 첫 화면. 보이게 될 때 표와 사용 수를 읽는다(부르는 쪽이 read). */
function syncManagerVisibility(read: boolean): void {
  const want = activeTab === 'variables' && varSub === 'home';
  if (want && !vmOpen) {
    vmOpen = true;
    renderVarScreen();
    if (read) { send({ type: 'GET_VAR_TABLE' }); requestManagerUsage('quiet'); }
  } else if (!want && vmOpen) {
    leaveManagerUi();
  }
  placeWizard();
}
function leaveManagerUi(): void {
  vmOpen = false;
  if (vmUsageTimer) { clearTimeout(vmUsageTimer); vmUsageTimer = null; }
  closeMenu();
  closeModal();
  closeReadiness();
  // 시작 화면 고정(①): 요약을 본 뒤 변수 탭을 떠나면 푼다.
  if (wizLatch && wizLatch.summarySeen && !wizardRunning) wizLatch = null;
}
/** 다른 화면에서 "변수 탭에서 보기 →" — 목록, 기준은 지금 선택으로(§3.1). */
function showManager(): void {
  showTab('variables');
  showVarSub('home');
  rebaseToCurrent();
}

/* ---------- 선택과 목록 기준 ---------- */
function onSelectionForList(m: { count: number; scanned: number; ids?: string[]; firstName?: string; selfSelect?: boolean }): void {
  curSel = { ids: m.ids ?? [], count: m.count, scanned: m.scanned, name: m.firstName ?? '' };
  // "변수 없는 값 찾기 →"는 지금 선택에 대해 동작한다 — 사용 수를 기다리지 않고 잠금을 바로 갱신.
  setLock($('btnFindUnbound'), curSel.count ? null : 'prereq', t('status.noSelection'));
  if (m.selfSelect) { renderSelBase(); return; } // 플러그인이 만든 선택 — 기준 유지
  setBaseline(curSel.count ? { ...curSel } : null);
}
function rebaseToCurrent(): void {
  setBaseline(curSel.count ? { ...curSel } : null);
}
function setBaseline(b: SelInfo | null): void {
  baseline = b;
  renderSelBase();
  if (vmUsageTimer) { clearTimeout(vmUsageTimer); vmUsageTimer = null; }
  vmUsageReq = 0;
  vmUsageInFlight = false;
  bigSkipped = false;
  if (!b) {
    usageMap = null;
    indirectMap = new Map();
    libVars = [];
    deletedUse = { count: 0, nodeIds: [] };
    vmUsageSig = '';
    if (vmOpen) renderVarScreen();
    return;
  }
  // 목록은 비우지 않는다 — 응답이 오면 한 번에 바꾼다. 큰 선택·마법사 중이면 자동으로 읽지 않는다.
  if (b.scanned > BIG_SELECTION || wizardRunning) {
    bigSkipped = b.scanned > BIG_SELECTION;
    usageMap = null;
    if (vmOpen) renderVarScreen();
    return;
  }
  if (!vmOpen || isMini) return; // 보이지 않으면 들어올 때 읽는다
  vmUsageTimer = setTimeout(() => { vmUsageTimer = null; requestManagerUsage('selection'); }, AUTO_SCAN_DELAY);
}
let vmUsageTimer: ReturnType<typeof setTimeout> | null = null;

/** 사용 수 요청 — why: quiet(진입·창 다시 들어옴) / work(작업 직후) / selection(선택 변경) / user(↻·[읽기]). */
function requestManagerUsage(why: 'quiet' | 'work' | 'selection' | 'user' = 'quiet'): void {
  if (!baseline) {
    usageMap = null;
    if (vmOpen) renderVarScreen();
    return;
  }
  const auto = why !== 'user';
  if (auto && (baseline.scanned > BIG_SELECTION || wizardRunning)) {
    bigSkipped = baseline.scanned > BIG_SELECTION;
    if (vmOpen) renderVarScreen();
    return;
  }
  if (vmUsageInFlight && why !== 'user') return; // 같은 종류의 직전 요청이 아직 끝나지 않았다(보류)
  vmUsageReq = ++bindReqSeq;
  vmUsageInFlight = true;
  vmUsageVisible = why === 'selection' || why === 'user';
  if (vmUsageVisible && vmOpen) {
    showStatusLine(t('list.reading'), { background: true });
    if (varScreen() === 'list') renderVarList();
  }
  send({ type: 'SCAN_USAGE', reqId: vmUsageReq, nodeIds: baseline.ids });
}

function onUsageResult(msg: Extract<CodeToUi, { type: 'USAGE_RESULT' }>): void {
  if (msg.reqId === layerLibReq) {
    // 레이어 › 연결의 ② 판정 — 지금 선택이 라이브러리 변수를 쓰는가.
    layerLibReq = 0;
    layerLibUse = msg.libraryVars.length > 0;
    renderBindPrereq();
    return;
  }
  if (msg.reqId !== vmUsageReq) return; // 늦게 온 이전 기준의 응답
  vmUsageInFlight = false;
  const wasVisible = vmUsageVisible;
  vmUsageVisible = false;
  bigSkipped = false;
  // 조용한 반영 — 응답이 이전과 같으면 다시 그리지 않는다(스크롤·포커스 행 유지).
  const sig = JSON.stringify([msg.usage, msg.libraryVars.map((l) => l.id), msg.deleted.count]);
  const changed = sig !== vmUsageSig || usageMap === null;
  vmUsageSig = sig;
  if (changed) {
    usageMap = new Map(Object.entries(msg.usage));
    libVars = msg.libraryVars;
    deletedUse = msg.deleted;
    recomputeIndirect();
  }
  if (wasVisible && $('statusText').textContent === t('list.reading')) clearStatusLine();
  if (refreshBefore) finishRefresh();
  if (changed || wasVisible) renderVarScreen();
  reentry.release();
}
function recomputeIndirect(): void {
  if (!usageMap) { indirectMap = new Map(); return; }
  const alias = aliasTargetsOf(vmVars);
  for (const l of libVars) if (l.aliasTargets.length) alias.set(l.id, l.aliasTargets);
  indirectMap = indirectUsage(new Set([...usageMap.keys()].filter((k) => (usageMap!.get(k)?.places ?? 0) > 0)), alias);
}

function onVarTable(msg: Extract<CodeToUi, { type: 'VAR_TABLE' }>): void {
  const sig = JSON.stringify([msg.collections, msg.vars]);
  const edRebase = !!ed?.saving?.awaitingTable;
  const first = !vmTableKnown;
  vmTableKnown = true;
  if (sig === vmTableSig && !first) {
    if (edRebase) edOnVarTable(msg); // 고치기 저장 뒤 첫 표는 직전과 같아도 팝업 base를 새로 잡는다(§4.4 고치기)
    if (refreshBefore) finishRefresh();
    return;
  }
  vmTableSig = sig;
  vmCols = msg.collections;
  vmVars = msg.vars;
  if (wizCountPending) {
    wizCountPending = false;
    const n = vmVars.length - wizBeforeCount;
    if (n > 0) showStatusLine(t('wizard.madeStatus', { n }), { cls: 'ok' });
  }
  recomputeIndirect();
  if (refreshBefore) finishRefresh();
  if (vmOpen || first) renderVarScreen();
  if (edRebase) edOnVarTable(msg); // 목록을 새 표로 그린 뒤(이름 검사 · 후보도 새 표로)
}

/* ---------- ↻ 다시 읽기 ---------- */
function refreshList(): void {
  const btn = $('btnVarRefresh');
  btn.classList.add('spinning');
  refreshBefore = { table: vmTableSig, usage: new Map([...(usageMap ?? new Map()).entries()].map(([k, v]) => [k, v.places])) };
  refreshPending = baseline ? 2 : 1;
  requestPrereq();
  send({ type: 'GET_VAR_TABLE' });
  if (baseline) requestManagerUsage('user'); // 300개 제한 무시, 기준 유지
}
let refreshPending = 0;
function finishRefresh(): void {
  if (!refreshBefore) return;
  refreshPending--;
  if (refreshPending > 0) return;
  const before = refreshBefore;
  refreshBefore = null;
  $('btnVarRefresh').classList.remove('spinning');
  const tableChanged = before.table !== vmTableSig;
  let n = 0;
  const now = new Map([...(usageMap ?? new Map()).entries()].map(([k, v]) => [k, v.places]));
  for (const k of new Set([...before.usage.keys(), ...now.keys()])) if ((before.usage.get(k) ?? 0) !== (now.get(k) ?? 0)) n++;
  const text = tableChanged ? t('list.refreshTable') + (n ? t('list.refreshCountSuffix', { n }) : '') : n ? t('list.refreshUsage', { n }) : t('list.refreshSame');
  showStatusLine(text);
  if (statusTimer) { clearTimeout(statusTimer); statusTimer = setTimeout(clearStatusLine, 2000); }
}

/* ---------- 목록 기준 다름(§4.1 · §4.4) — 상황 안내 줄 맨 앞 ---------- */
/** 목록 기준이 지금 선택과 다른가(지금 선택이 없을 때도 포함). */
function baseDiffers(): boolean {
  return !!baseline && !!curSel && !sameIds(baseline.ids, curSel.ids);
}
/** "목록 기준: {이름} · 지금 선택과 달라요 · " 문구. */
function baseNoticeText(): string {
  const b = baseline!;
  const name = b.count === 1 ? b.name || t('sel.unnamed') : t('list.baseMany', { m: b.count });
  return t(curSel.count ? 'list.baseDiff' : 'list.baseDiffNoSel', { name });
}
/** 목록 기준이 바뀌거나 선택이 바뀌면 상황 안내 줄(목록)과 시작 화면의 기준 줄을 다시 그린다. */
function renderSelBase(): void {
  if (!vmCols) return; // 첫 화면 전(초기화 순서)
  renderSituation();
  if (activeTab === 'variables' && varScreen() === 'start') renderStart();
}
/** [기준 바꾸기] — 캔버스 선택 변경과 같게 처리하고, 포커스는 목록(시작 화면이면 LIB 첫 행 → 마법사 주 버튼). */
function doRebase(fromStart: boolean): void {
  rebaseToCurrent();
  if (fromStart) {
    ($('startLib').querySelector<HTMLElement>('[data-key]') ?? $('btnWizardRun')).focus();
    return;
  }
  const tree = $('varTree');
  const target = (focusKey && tree.querySelector<HTMLElement>(`[data-key="${CSS.escape(focusKey)}"]`)) || tree.querySelector<HTMLElement>('[data-key]');
  target?.focus();
}
/** 상황 안내 줄 한 칸(글 + 링크 버튼). */
function situationEl(text: string, action?: [string, () => void]): HTMLElement {
  const d = document.createElement('div');
  d.className = 'situation';
  const sp = document.createElement('span');
  sp.textContent = text;
  d.appendChild(sp);
  if (action) {
    const b = document.createElement('button');
    b.className = 'link link-btn';
    b.type = 'button';
    b.textContent = action[0];
    b.addEventListener('click', action[1]);
    d.appendChild(b);
  }
  return d;
}

/* ---------- 칩 줄 ---------- */
/* ---------- 사이드바(결정 B, §4.4) ---------- */
const directMap = (): Map<string, number> | null =>
  usageMap ? new Map([...usageMap.entries()].map(([k, v]) => [k, v.places])) : null;
const indirectSet = (): Set<string> => new Set(indirectMap.keys());
/** 사용 수를 읽는 중이고 사용자가 기다리는 중인가("…"). */
const usageReadingVisible = (): boolean => vmUsageInFlight && vmUsageVisible;
/** 숫자 칸 — 사용/전체, 아니면 전체, 읽는 중이면 "…". */
function sideNum(c: { used: number; total: number; direct: number; indirect: number }): { text: string; tip: string } {
  if (usageReadingVisible()) return { text: '…', tip: '' };
  if (!usageMap) return { text: String(c.total), tip: t('list.totalTip', { total: c.total }) };
  return { text: `${c.used}/${c.total}`, tip: t('list.chipTip', { used: c.used, direct: c.direct, indirect: c.indirect, total: c.total }) };
}
/** 처음 고르는 항목(사용자가 직접 고르지 않았을 때) — 선택이 바뀌면 사용 수가 온 뒤 다시 정한다. */
function initialSel(): SideSel {
  return initialSideSel(vmCols, vmVars, !!baseline, bigSkipped || (wizardRunning && !usageMap), directMap(), indirectSet());
}
/** 지금 고른 항목 — 직접 고른 게 없으면 처음 규칙, 있으면 사라졌는지 확인(§4.4). */
function currentSel(): SideSel {
  const hasLib = libRowsAll().length > 0;
  const hasDeleted = deletedUse.count > 0 && !!baseline;
  if (!sidePicked || !sideSel) {
    // 마법사 실행 중(선택 있음, 아직 안 읽음)은 ★(마법사 빈 상태)로 둔다.
    sideSel = baseline && wizardRunning && !usageMap && !bigSkipped ? { kind: 'inspect' } : initialSel();
    return sideSel;
  }
  const next = validSideSel(sideSel, vmCols, vmVars, hasLib, hasDeleted, initialSel);
  if (sideSelKey(next) !== sideSelKey(sideSel)) {
    // 사라진 항목에 포커스가 있었으면 새 항목으로(§4.4).
    if (document.activeElement?.closest('#varSide')) focusSideKey = `side:${sideSelKey(next)}`;
    sideSel = next;
  }
  return sideSel;
}
let focusSideKey: string | null = null;
/** 컬렉션이 사이드바에서 펼쳐져 있나 — 직접 바꾼 게 있으면 그것, 없으면 쓰는 변수가 있는 컬렉션(없으면 첫 컬렉션만). */
function sideIsOpen(side: SideCollection, all: SideCollection[], sel: SideSel): boolean {
  const user = sideOpen.get(side.collection.id);
  if (user !== undefined) return user;
  if (sel.kind === 'grp' && sel.key.startsWith(`${side.collection.id}|`)) return true;
  if (usageMap && all.some((x) => x.used > 0)) return side.used > 0;
  return all[0] === side;
}
function pickSide(sel: SideSel, focus = true): void {
  if (searchOpen || query) clearSearch(false); // 검색 중에 사이드바를 누르면 검색을 지우고 그 항목(§4.4)
  sideSel = sel;
  sidePicked = true;
  if (sel.kind === 'col') sideOpen.set(sel.id, true);
  focusSideKey = focus ? `side:${sideSelKey(sel)}` : null;
  focusKey = null;
  renderVarList();
}
function renderSidebar(sel: SideSel): void {
  const nav = $('varSide');
  const hadFocus = nav.contains(document.activeElement) ? (document.activeElement as HTMLElement).dataset.key ?? null : null;
  clearMount(nav);
  const dm = directMap();
  const ind = indirectSet();
  const sides = sidebarCollections(vmCols, vmVars, dm, ind);
  const selKey = searchOpen && query.trim() ? '' : sideSelKey(sel);
  const item = (key: string, level: number, label: string, num: { text: string; tip: string }, aria: string, opts: { badge?: string; open?: boolean; onToggle?: () => void; muted?: boolean; danger?: boolean; onPick: () => void; title?: string }): HTMLElement => {
    const d = document.createElement('div');
    d.className = `vs-item lv${level}${opts.muted ? ' muted' : ''}${opts.danger ? ' danger' : ''}`;
    d.dataset.key = `side:${key}`;
    d.setAttribute('role', 'treeitem');
    d.setAttribute('aria-level', String(level));
    d.setAttribute('aria-selected', String(selKey === key));
    d.setAttribute('aria-label', aria);
    if (opts.open !== undefined) d.setAttribute('aria-expanded', String(opts.open));
    d.tabIndex = -1;
    if (opts.onToggle) {
      const tw = document.createElement('button');
      tw.type = 'button';
      tw.className = 'vs-tw';
      tw.tabIndex = -1;
      tw.textContent = opts.open ? '▾' : '▸';
      tw.setAttribute('aria-label', t(opts.open ? 'list.sideCollapse' : 'list.sideExpand'));
      tw.addEventListener('click', (e) => { e.stopPropagation(); opts.onToggle!(); });
      d.appendChild(tw);
    }
    if (opts.badge) {
      const b = document.createElement('span');
      b.className = 'vs-badge';
      b.setAttribute('aria-hidden', 'true');
      b.textContent = opts.badge;
      d.appendChild(b);
    }
    const nm = document.createElement('span');
    nm.className = 'vs-name';
    nm.textContent = label;
    d.title = opts.title ?? label;
    const n = document.createElement('span');
    n.className = 'vs-num';
    n.textContent = num.text;
    if (num.tip) n.title = num.tip;
    d.append(nm, n);
    d.addEventListener('click', opts.onPick);
    d.addEventListener('keydown', (ev) => sideKey(ev, d, opts));
    nav.appendChild(d);
    return d;
  };
  // ★ Inspect
  const insN = inspectCount(vmVars, dm, ind);
  const insNum = usageReadingVisible() ? '…' : !baseline || !usageMap ? '—' : String(insN);
  item('inspect', 1, t('list.inspect'), { text: insNum, tip: t('list.inspectTip') }, t('list.inspectAria', { n: insNum }), { onPick: () => pickSide({ kind: 'inspect' }), title: t('list.inspectTip') });
  for (const side of sides) {
    const c = side.collection;
    const open = sideIsOpen(side, sides, sel);
    const badge = tierBadge(c);
    const num = sideNum(side);
    item(`col:${c.id}`, 1, c.name, num, t('list.sideColAria', { name: c.name, badge, num: num.text }), {
      badge, open, muted: !!usageMap && side.used === 0,
      onToggle: () => { sideOpen.set(c.id, !open); focusSideKey = `side:col:${c.id}`; renderVarList(); },
      onPick: () => pickSide({ kind: 'col', id: c.id }),
    });
    if (open) for (const g of side.groups) {
      const gn = sideNum(g);
      item(`grp:${g.key}`, 2, g.label, gn, t('list.sideGrpAria', { name: g.label, num: gn.text }), {
        muted: !!usageMap && g.used === 0,
        onPick: () => pickSide({ kind: 'grp', key: g.key }),
      });
    }
  }
  const libN = libRowsAll().length;
  const hasDeleted = deletedUse.count > 0 && !!baseline;
  if (libN || hasDeleted) {
    const sep = document.createElement('div');
    sep.className = 'vs-sep';
    sep.setAttribute('role', 'separator');
    nav.appendChild(sep);
  }
  if (libN) item('lib', 1, t('list.libItem'), { text: String(libN), tip: '' }, t('list.libItemAria', { n: libN }), { onPick: () => pickSide({ kind: 'lib' }) });
  if (hasDeleted) item('deleted', 1, t('list.deletedItem'), { text: String(deletedUse.count), tip: '' }, t('list.deletedItemAria', { n: deletedUse.count }), { danger: true, onPick: () => pickSide({ kind: 'deleted' }) });
  // 정지점 1개 — 고른 항목(없으면 첫 항목).
  const items = Array.from(nav.querySelectorAll<HTMLElement>('.vs-item'));
  const want = focusSideKey ?? hadFocus;
  const target = (want && items.find((x) => x.dataset.key === want)) || items.find((x) => x.getAttribute('aria-selected') === 'true') || items[0];
  if (target) target.tabIndex = 0;
  if (want && target && (focusSideKey || hadFocus)) target.focus({ preventScroll: true });
  focusSideKey = null;
}
/** 사이드바 키(§4.4 키보드 · tree). */
function sideKey(ev: KeyboardEvent, el: HTMLElement, opts: { open?: boolean; onToggle?: () => void; onPick: () => void }): void {
  const items = Array.from($('varSide').querySelectorAll<HTMLElement>('.vs-item'));
  const i = items.indexOf(el);
  const go = (j: number): void => {
    const target = items[Math.max(0, Math.min(items.length - 1, j))];
    if (!target) return;
    items.forEach((x) => (x.tabIndex = -1));
    target.tabIndex = 0;
    target.focus();
  };
  const k = ev.key;
  if (k === 'ArrowDown') go(i + 1);
  else if (k === 'ArrowUp') go(i - 1);
  else if (k === 'Home') go(0);
  else if (k === 'End') go(items.length - 1);
  else if (k === 'ArrowRight' && opts.onToggle) {
    if (!opts.open) opts.onToggle();
    else go(i + 1);
  } else if (k === 'ArrowLeft') {
    if (el.classList.contains('lv2')) {
      for (let j = i - 1; j >= 0; j--) if (items[j].classList.contains('lv1')) { go(j); break; }
    } else if (opts.onToggle && opts.open) opts.onToggle();
  } else if (k === 'Enter' || k === ' ') opts.onPick();
  else return;
  ev.preventDefault();
}

function renderModeSelect(): void {
  const sel = $('modeSelect') as HTMLSelectElement;
  // 오른쪽에 행이 보이는 컬렉션만(★·검색: 행이 있는 컬렉션, LIB·삭제된 변수: 없음 → 숨김).
  const shownCols = new Set(lastRightCols);
  const visible = vmCols.filter((c) => shownCols.has(c.id));
  const names = [...new Set(visible.flatMap((c) => c.modes.map((m) => m.name)))];
  // 보이는 모드가 1개면 숨긴다. 검색 중에도 숨겨 칩 줄 자리를 남긴다.
  if (names.length <= 1 || searchOpen) { sel.hidden = true; return; }
  sel.hidden = false;
  clearMount(sel);
  const def = document.createElement('option');
  def.value = '';
  def.textContent = t('list.modeDefault');
  sel.appendChild(def);
  for (const n of names) {
    const o = document.createElement('option');
    o.value = n;
    o.textContent = n;
    sel.appendChild(o);
  }
  sel.value = modeName && names.includes(modeName) ? modeName : '';
}
/** 행에 보일 모드 — 고른 모드 이름이 그 컬렉션에 있으면 그것, 없으면 기본 모드(defaultModeId). */
function modeIdFor(col: VarCollection | undefined): string | undefined {
  if (!col) return undefined;
  if (modeName) {
    const m = col.modes.find((x) => x.name === modeName);
    if (m) return m.modeId;
  }
  return col.defaultModeId ?? col.modes[0]?.modeId;
}
function currentModeCell(v: VarRow): VarCell | undefined {
  return v.values[modeIdFor(vmCols.find((c) => c.id === v.collectionId)) ?? ''];
}

/* ---------- 상황 안내 줄(위 행 하나만) ---------- */
function renderSituation(): void {
  const line = $('situationLine');
  clearMount(line);
  const add = (text: string, action?: [string, () => void]): void => {
    const s = document.createElement('span');
    s.textContent = text;
    line.appendChild(s);
    if (action) {
      const b = document.createElement('button');
      b.className = 'link link-btn';
      b.type = 'button';
      b.textContent = action[0];
      b.addEventListener('click', action[1]);
      line.appendChild(b);
    }
  };
  let shown = true;
  // ★가 골라져 있으면 그 빈 상태가 같은 안내를 보인다 — 한 안내는 한 곳에만(§4.4).
  const insShown = !!sideSel && sideSel.kind === 'inspect' && !(searchOpen && query.trim());
  // 겹치면 위쪽 하나만(§4.4). 목록 기준 다름이 맨 앞.
  if (baseDiffers()) add(baseNoticeText(), [t('list.rebase'), () => doRebase(false)]);
  else if (insShown && (!baseline || !usageMap || inspectCount(vmVars, directMap(), indirectSet()) === 0)) shown = false;
  else if (baseline && bigSkipped && !usageMap) add(t('list.big'), [t('list.read'), () => requestManagerUsage('user')]);
  else if (baseline && wizardRunning && !usageMap) add(t('list.wizardWait'));
  else if (baseline && usageMap && inspectCount(vmVars, directMap(), indirectSet()) === 0) add(t('list.noneUsed'), [t('list.findUnbound'), findUnbound]);
  else if (!baseline) add(t('list.selectHint'));
  else shown = false;
  line.hidden = !shown;
}

/* ---------- 목록 ---------- */
function resolveSwatch(cell: VarCell | undefined): string | null {
  let c = cell;
  for (let i = 0; i < 8 && c; i++) {
    if (c.kind === 'color') return c.hex;
    if (c.kind !== 'alias') return null;
    const id = c.aliasId;
    const local = vmVars.find((v) => v.id === id);
    if (local) { c = currentModeCell(local); continue; }
    const lib = libVars.find((l) => l.id === id);
    c = lib?.value;
  }
  return null;
}
const swatchHtml = (hex: string | null): string => (hex ? `<span class="bf-swatch" style="background:${escapeHtml(hex)}"></span>` : '');
function typeIcon(type: VarRow['type']): string {
  return type === 'COLOR' ? '' : type === 'FLOAT' ? '#' : type === 'STRING' ? 'T' : '◐';
}
function valueEl(cell: VarCell | undefined): HTMLElement {
  const span = document.createElement('span');
  span.className = 'val';
  if (!cell) { span.textContent = '—'; return span; }
  if (cell.kind === 'alias') {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'alias-pill';
    b.tabIndex = -1; // 행 안의 알약은 Tab 정지점이 아니다 — 키보드는 메뉴로
    b.innerHTML = `${swatchHtml(resolveSwatch(cell))}→ ${escapeHtml(cell.aliasName)}${cell.remote ? ' <span class="lib-tag">LIB</span>' : ''}`;
    b.title = t('vm.jumpAlias');
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      jumpToVar(cell.aliasId, (e.currentTarget as HTMLElement).closest<HTMLElement>('[data-key]')?.dataset.key);
    });
    b.addEventListener('dblclick', (e) => e.stopPropagation()); // 알약 더블클릭이 행 상세를 함께 열지 않게
    span.appendChild(b);
    return span;
  }
  if (cell.kind === 'color') span.innerHTML = `${swatchHtml(cell.hex)}${escapeHtml(cell.hex.toUpperCase())}`;
  else span.textContent = cell.text;
  return span;
}

/** 오른쪽에 지금 행이 보이는 컬렉션(모드 메뉴 범위). */
let lastRightCols: string[] = [];
function renderVarList(): void {
  if (!vmOpen || varScreen() !== 'list') return;
  const sel = currentSel();
  renderSidebar(sel);
  renderSituation();
  renderReadinessButtons();
  setLock($('btnFindUnbound'), curSel.count ? null : 'prereq', t('status.noSelection'));
  const tree = $('varTree');
  const prevScroll = window.scrollY;
  const hadFocus = tree.contains(document.activeElement);
  clearMount(tree);
  const searching = !!query.trim();
  // 오른쪽 목록 머리 — 고른 항목 이름
  const title = $('varMainTitle');
  if (searching) title.textContent = t('list.searchTitle', { q: query.trim() });
  else if (sel.kind === 'inspect') title.textContent = t('list.inspect');
  else if (sel.kind === 'lib') title.textContent = t('list.libItem');
  else if (sel.kind === 'deleted') title.textContent = t('list.deletedItem');
  else if (sel.kind === 'col') { const c = vmCols.find((x) => x.id === sel.id); title.textContent = c ? `${tierBadge(c)} ${c.name}` : ''; }
  else title.textContent = sel.key.slice(sel.key.indexOf('|') + 1) || t('list.noGroup');
  const lines: HTMLElement[] = [];
  const dm = directMap();
  const ind = indirectSet();
  lastRightCols = [];
  const empty = (text: string, action?: [string, () => void]): void => {
    const d = document.createElement('div');
    d.className = 'vt-empty';
    d.append(text);
    if (action) {
      const b = document.createElement('button');
      b.className = 'link link-btn';
      b.type = 'button';
      b.textContent = action[0];
      b.addEventListener('click', action[1]);
      d.append(' · ', b);
    }
    lines.push(d);
  };
  if (sel.kind === 'lib' && !searching) {
    for (const l of libRowsAll()) lines.push(libRowEl(l));
  } else if (sel.kind === 'deleted' && !searching) {
    if (deletedUse.count > 0) lines.push(deletedEl());
  } else {
    const entries = rightEntries(sel, vmCols, vmVars, dm, ind, query);
    let pi = 0;
    for (const e of entries) {
      if (e.kind === 'path') { lines.push(pathEl(e.label, pi++)); if (!lastRightCols.includes(e.collectionId)) lastRightCols.push(e.collectionId); }
      else lines.push(rowEl(e.v, e.state));
    }
    if (sel.kind === 'col' && !searching) lastRightCols = [sel.id];
    if (sel.kind === 'grp' && !searching) lastRightCols = [sel.key.slice(0, sel.key.indexOf('|'))];
    if (searching) {
      const libs = libRowsMatching();
      if (libs.length) { lines.push(pathEl(t('list.libItem'), pi++)); for (const l of libs) lines.push(libRowEl(l)); }
      if (!entries.length && !libs.length) empty(t('list.noMatch', { q: query.trim() }), [t('list.searchClear'), () => clearSearch(true)]);
    } else if (sel.kind === 'inspect' && !entries.length) {
      // ★ 빈 상태(§4.4 표) — 같은 안내를 상황 안내 줄에는 띄우지 않는다.
      if (!baseline) empty(t('list.inspectNoSel'));
      else if (bigSkipped && !usageMap) empty(t('list.big'), [t('list.read'), () => requestManagerUsage('user')]);
      else if (wizardRunning && !usageMap) empty(t('list.wizardWait'));
      else if (!usageMap) empty(t('list.reading'));
      else empty(t('list.noneUsed'), [t('list.findUnbound'), findUnbound]);
    } else if (!entries.length) empty(t('vm.noVars'));
  }
  renderModeSelect();
  tree.append(...lines);
  // 키보드: 정지점 1개(roving tabindex). 포커스 행이 빠지면 오른쪽 목록 머리로(§4.4).
  const focusables = Array.from(tree.querySelectorAll<HTMLElement>('[data-key]'));
  let target = focusKey ? focusables.find((x) => x.dataset.key === focusKey) : undefined;
  if (focusKey && !target && focusKey.startsWith('row:') && hadFocus) {
    showStatusLine(t('list.hiddenRow'));
    focusKey = null;
    $('varMainTitle').focus({ preventScroll: true });
  }
  for (const f of focusables) f.tabIndex = -1;
  (target ?? focusables[0])?.setAttribute('tabindex', '0');
  if (target && hadFocus) target.focus({ preventScroll: true });
  if (Math.abs(window.scrollY - prevScroll) > 1) window.scrollTo(0, prevScroll);
}
/** 오른쪽 목록의 경로 머리(고정 안 함, ↑↓로 지나감). */
function pathEl(label: string, i: number): HTMLElement {
  const d = document.createElement('div');
  d.className = 'vt-path';
  d.dataset.key = `path:${i}`;
  d.setAttribute('role', 'row');
  d.textContent = label;
  d.title = label;
  d.addEventListener('keydown', (ev) => treeKey(ev, d));
  return d;
}
/** ⋯ 메뉴 "사이드바 모두 펼치기/접기". */
function setAllExpanded(on: boolean): void {
  for (const c of vmCols) sideOpen.set(c.id, on);
  renderVarList();
}
/** 목록 기준이 쓰는 라이브러리 변수 전부(검색과 무관). */
function libRowsAll(): LibraryVar[] {
  if (!usageMap) return [];
  return libVars.filter((l) => (usageMap!.get(l.id)?.places ?? 0) > 0 || indirectMap.has(l.id));
}
function libRowsMatching(): LibraryVar[] {
  if (!usageMap) return [];
  return libVars.filter((l) => ((usageMap!.get(l.id)?.places ?? 0) > 0 || indirectMap.has(l.id)) && matchesQuery(l.name, query));
}

function useText(id: string, state: RowState): { text: string; tip: string } {
  if (state === 'none') return { text: '—', tip: '' };
  if (state === 'unused') return { text: t('list.unused'), tip: '' };
  if (state === 'indirect') {
    const via = indirectMap.get(id) ?? [];
    const first = vmVars.find((v) => v.id === via[0])?.name ?? libVars.find((l) => l.id === via[0])?.name ?? '';
    return { text: t('list.indirect'), tip: t('list.indirectTip', { alias: first }) };
  }
  const u = usageMap?.get(id);
  return { text: t('vm.uses', { n: u?.places ?? 0 }), tip: t('list.usesTip', { k: u?.layers ?? 0, n: u?.places ?? 0 }) };
}
function rowEl(v: VarRow, state: RowState): HTMLElement {
  const d = document.createElement('div');
  d.className = `vt-row ${state}`;
  d.dataset.key = `row:${v.id}`;
  d.dataset.id = v.id;
  d.setAttribute('role', 'row');
  d.setAttribute('aria-selected', String(vmSelected === v.id));
  const cell = currentModeCell(v);
  const nm = document.createElement('span');
  nm.className = 'nm';
  const ic = document.createElement('span');
  ic.className = 'ic';
  const hex = v.type === 'COLOR' ? resolveSwatch(cell) : null;
  if (hex) ic.innerHTML = swatchHtml(hex); else ic.textContent = typeIcon(v.type);
  const tx = document.createElement('span');
  tx.className = 't';
  tx.textContent = leafName(v.name);
  nm.title = v.description ? `${v.name}\n${v.description}` : v.name;
  nm.append(ic, tx);
  const use = document.createElement('span');
  use.className = 'use';
  const u = useText(v.id, state);
  use.textContent = u.text;
  if (u.tip) use.title = u.tip;
  const more = moreButton(() => openVarMenuFor({ local: v }, d));
  d.append(nm, valueEl(cell), use, more);
  wireRow(d, { local: v });
  return d;
}
function libRowEl(l: LibraryVar): HTMLElement {
  const d = document.createElement('div');
  const direct = (usageMap?.get(l.id)?.places ?? 0) > 0;
  const state: RowState = direct ? 'direct' : 'indirect';
  d.className = `vt-row ${state}`;
  d.dataset.key = `lib:${l.id}`;
  d.dataset.id = l.id;
  d.setAttribute('role', 'row');
  const nm = document.createElement('span');
  nm.className = 'nm';
  const ic = document.createElement('span');
  ic.className = 'ic';
  const hex = l.type === 'COLOR' ? resolveSwatch(l.value) : null;
  if (hex) ic.innerHTML = swatchHtml(hex); else ic.textContent = typeIcon(l.type);
  const tx = document.createElement('span');
  tx.className = 't';
  tx.textContent = l.name;
  const tag = document.createElement('span');
  tag.className = 'lib-tag';
  tag.textContent = 'LIB';
  nm.title = `${l.name} · ${l.collection}`;
  nm.append(ic, tx, tag);
  const use = document.createElement('span');
  use.className = 'use';
  const ut = useText(l.id, state);
  use.textContent = ut.text;
  if (ut.tip) use.title = ut.tip;
  d.append(nm, valueEl(l.value), use, moreButton(() => openVarMenuFor({ lib: l }, d)));
  wireRow(d, { lib: l });
  return d;
}
function deletedEl(): HTMLElement {
  const d = document.createElement('div');
  d.className = 'vt-line';
  d.dataset.key = 'deleted';
  d.setAttribute('role', 'row');
  const s = document.createElement('span');
  s.textContent = t('list.deleted', { n: deletedUse.count });
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'link link-btn';
  b.tabIndex = -1;
  b.textContent = t('list.select');
  const pick = (): void => selectNodes(deletedUse.nodeIds, 'list'); // 기준은 유지(플러그인이 만든 선택)
  b.addEventListener('click', (e) => { e.stopPropagation(); pick(); });
  d.append(s, b);
  d.addEventListener('keydown', (ev) => treeKey(ev, d, pick));
  return d;
}
function moreButton(open: () => void): HTMLButtonElement {
  const mb = document.createElement('button');
  mb.type = 'button';
  mb.className = 'more';
  mb.tabIndex = -1;
  mb.innerHTML = '<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" fill="currentColor"><circle cx="2" cy="6" r="1.2"/><circle cx="6" cy="6" r="1.2"/><circle cx="10" cy="6" r="1.2"/></svg>';
  mb.title = t('vm.moreTip');
  mb.setAttribute('aria-label', t('vm.moreTip'));
  mb.addEventListener('click', (e) => { e.stopPropagation(); open(); });
  return mb;
}
type RowRef = { local: VarRow; lib?: undefined } | { lib: LibraryVar; local?: undefined };
function wireRow(d: HTMLElement, ref: RowRef): void {
  d.addEventListener('click', () => { vmSelected = d.dataset.id ?? null; focusKey = d.dataset.key ?? null; d.focus(); markSelected(); });
  d.addEventListener('dblclick', () => openDetail(ref, d));
  d.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    vmSelected = d.dataset.id ?? null;
    markSelected();
    openVarMenuFor(ref, d, e.clientX, e.clientY);
  });
  d.addEventListener('keydown', (ev) => treeKey(ev, d, () => openDetail(ref, d), () => openVarMenuFor(ref, d)));
}
function markSelected(): void {
  document.querySelectorAll<HTMLElement>('#varTree .vt-row').forEach((r) => r.setAttribute('aria-selected', String(r.dataset.id === vmSelected)));
}

/** 오른쪽 목록 키(§4.4 키보드 · grid). onEnter: 줄의 기본 동작, onMenu: Shift+F10. */
function treeKey(ev: KeyboardEvent, el: HTMLElement, onEnter?: () => void, onMenu?: () => void): void {
  const all = Array.from($('varTree').querySelectorAll<HTMLElement>('[data-key]'));
  const i = all.indexOf(el);
  const go = (j: number): void => {
    const target = all[Math.max(0, Math.min(all.length - 1, j))];
    if (!target) return;
    all.forEach((x) => (x.tabIndex = -1));
    target.tabIndex = 0;
    focusKey = target.dataset.key ?? null;
    target.focus();
  };
  const k = ev.key;
  if (k === 'ArrowDown') go(i + 1);
  else if (k === 'ArrowUp') go(i - 1);
  else if (k === 'Home') go(0);
  else if (k === 'End') go(all.length - 1);
  else if (k === 'PageDown') go(i + 10);
  else if (k === 'PageUp') go(i - 10);
  else if (k === 'Escape' && (searchOpen || query)) clearSearch(true);
  else if (k === 'Enter' && onEnter) onEnter();
  else if ((k === 'ContextMenu' || (k === 'F10' && ev.shiftKey)) && onMenu) onMenu();
  else return;
  ev.preventDefault();
}

/* ---------- 알약 / "가리키는 변수로 이동" + 되돌리기 ---------- */
/** fromKey: 이동 전 원래 행 — 되돌리기는 그 행으로 포커스를 돌린다(§4.1). */
function jumpToVar(id: string, fromKey?: string): void {
  const v = vmVars.find((x) => x.id === id);
  if (!v) {
    if (libRowsAll().some((l) => l.id === id)) {
      pickSide({ kind: 'lib' }, false);
      document.querySelector<HTMLElement>(`#varTree [data-key="lib:${CSS.escape(id)}"]`)?.focus();
    } else showStatusLine(t('list.libVar'));
    return;
  }
  const undo = { sel: sideSel, picked: sidePicked, open: new Map(sideOpen), query, searchOpen, scroll: window.scrollY, focusKey: fromKey ?? focusKey };
  clearSearch(false);
  sideSel = { kind: 'grp', key: groupKey(v.collectionId, v.name) };
  sidePicked = true;
  sideOpen.set(v.collectionId, true);
  focusKey = `row:${v.id}`;
  vmSelected = v.id;
  renderVarList();
  const row = document.querySelector<HTMLElement>(`#varTree [data-key="row:${CSS.escape(v.id)}"]`);
  row?.scrollIntoView({ block: 'center' });
  row?.focus({ preventScroll: true });
  showStatusLine(t('list.jumped', { name: v.name }), {
    action: {
      label: t('list.undo'),
      run: () => {
        sideSel = undo.sel;
        sidePicked = undo.picked;
        sideOpen.clear(); undo.open.forEach((val, key) => sideOpen.set(key, val));
        query = undo.query;
        searchOpen = undo.searchOpen;
        ($('varSearch') as HTMLInputElement).value = query;
        $('searchBox').hidden = !searchOpen;
        focusKey = undo.focusKey;
        renderVarList();
        window.scrollTo(0, undo.scroll);
        const back = focusKey ? document.querySelector<HTMLElement>(`#varTree [data-key="${CSS.escape(focusKey)}"]`) : null;
        back?.focus({ preventScroll: true });
      },
    },
  });
}

/* ---------- 검색 ---------- */
function openSearch(): void {
  searchOpen = true;
  $('searchBox').hidden = false;
  renderModeSelect();
  ($('varSearch') as HTMLInputElement).focus();
}
function clearSearch(render = true): void {
  query = '';
  searchOpen = false;
  ($('varSearch') as HTMLInputElement).value = '';
  $('searchBox').hidden = true;
  if (render) { renderVarList(); ($('btnSearch') as HTMLElement).focus(); }
}

/* ---------- 행 메뉴(§4.4) ---------- */
async function copyAndReport(text: string, what: string): Promise<void> {
  if (!text) { showStatusLine(t('vm.copyEmpty'), { cls: 'warn' }); return; }
  const ok = await copyText(text);
  showStatusLine(ok ? t('vm.copied', { what, text }) : t('vm.copyFailed', { text }), { cls: ok ? 'ok' : 'warn' });
}
function openVarMenuFor(ref: RowRef, rowEl: HTMLElement, x?: number, y?: number): void {
  const id = ref.local ? ref.local.id : ref.lib.id;
  const name = ref.local ? ref.local.name : ref.lib.name;
  const cell = ref.local ? currentModeCell(ref.local) : ref.lib.value;
  const direct = (usageMap?.get(id)?.places ?? 0) > 0;
  const via = indirectMap.get(id) ?? [];
  const known = !!usageMap && !!baseline;
  const r = rowEl.getBoundingClientRect();
  rowEl.classList.add('menu-open');
  const items: MenuItem[] = [
    { label: t('vm.copyName'), onSelect: () => void copyAndReport(name, t('vm.whatName')) },
    { label: t('vm.copyValue'), onSelect: () => void copyAndReport(cellCopyText(cell), t('vm.whatValue')) },
    { label: t('vm.copyCss'), onSelect: () => void copyAndReport(cssVarName(name), t('vm.whatCss')) },
  ];
  if (!known) {
    items.push({ label: t('vm.selectLayers'), separatorBefore: true, disabled: true, note: t('list.selectFirstNote'), onSelect: () => {} });
  } else if (direct) {
    items.push({ label: t('vm.selectLayers'), separatorBefore: true, onSelect: () => selectVarUsers([id]) });
  } else if (via.length) {
    items.push({ label: t('list.selectViaAlias'), separatorBefore: true, onSelect: () => selectVarUsers(via) });
  }
  if (cell && cell.kind === 'alias') items.push({ label: t('vm.jumpAlias'), onSelect: () => jumpToVar(cell.aliasId, rowEl.dataset.key), focusElsewhere: true });
  items.push({ label: t('vm.detail'), onSelect: () => openDetail(ref, rowEl), focusElsewhere: true });
  // 고치기…(§4.4 행 메뉴) — 로컬 변수만. 상세를 열고 이름 칸에 포커스.
  if (ref.local) items.push({ label: t('vm.edit'), onSelect: () => openDetail(ref, rowEl, true), focusElsewhere: true });
  openMenu(x ?? r.left + 24, y ?? r.bottom, items, rowEl, () => rowEl.classList.remove('menu-open'));
}
function selectVarUsers(varIds: string[]): void {
  if (!baseline) return;
  selectStatusTarget = 'list';
  send({ type: 'SELECT_VAR_USERS', varIds, nodeIds: baseline.ids });
}

/* ---------- 상세 팝업 · 고치기(§4.4 상세 팝업 · 고치기, PR 3.5) ---------- */
let detailReq = 0;
let detailBox: HTMLElement | null = null;
let detailUsesEl: HTMLElement | null = null;

/** 닫은 뒤 포커스 — 지금 오른쪽 목록에서 같은 키(변수 id)의 행, 없으면 오른쪽 목록 머리(§2.10 · §4.4 고치기). */
function focusRowOrHead(key: string): HTMLElement {
  const tree = $('varTree');
  const row = tree.querySelector<HTMLElement>(`[data-key="${CSS.escape(key)}"]`);
  if (!row) return $('varMainTitle');
  tree.querySelectorAll<HTMLElement>('[data-key]').forEach((x) => (x.tabIndex = -1));
  row.tabIndex = 0;
  focusKey = key;
  return row;
}

/** "쓰인 곳" — 목록 기준 레이어 안에서 새로 찾는다. 간접이면 그 별칭들이 쓰인 곳. run()은 다시 찾기(값이 바뀐 뒤). */
function usesBlock(id: string): { box: HTMLElement; list: HTMLElement; run: () => void } {
  const usesBox = document.createElement('div');
  usesBox.className = 'var-uses';
  const via0 = (usageMap?.get(id)?.places ?? 0) > 0 ? [] : indirectMap.get(id) ?? [];
  if (via0.length) {
    const names = via0.map((x) => vmVars.find((v) => v.id === x)?.name ?? libVars.find((l) => l.id === x)?.name ?? x);
    const p = document.createElement('div');
    p.className = 'hint';
    p.textContent = t('list.viaAlias', { names: names.join(', ') });
    usesBox.appendChild(p);
  }
  const usesList = document.createElement('div');
  usesBox.appendChild(usesList);
  const findUses = (): void => {
    if (!baseline) return;
    const direct = (usageMap?.get(id)?.places ?? 0) > 0;
    const via = direct ? [] : indirectMap.get(id) ?? [];
    detailReq = ++bindReqSeq;
    usesList.textContent = t('common.running');
    send({ type: 'FIND_VAR_USERS', reqId: detailReq, varIds: direct ? [id] : via.length ? via : [id], nodeIds: baseline.ids, limit: DETAIL_LIMIT });
  };
  const run = (): void => {
    clearMount(usesList);
    if (!baseline) usesList.textContent = t('list.selectFirstNote');
    else if (baseline.scanned > BIG_SELECTION) {
      usesList.append(t('list.detailBig'), ' ');
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'link';
      b.textContent = t('list.find');
      b.addEventListener('click', findUses);
      usesList.appendChild(b);
    } else findUses();
  };
  return { box: usesBox, list: usesList, run };
}

/** focusName: "고치기…"로 열면 이름 칸, "상세"(Enter · 더블클릭 · 메뉴)면 [닫기](§2.10). */
function openDetail(ref: RowRef, _returnRow: HTMLElement, focusName = false): void {
  if (ref.local) { openEditor(ref.local, focusName); return; }
  const l = ref.lib;
  const title = document.createElement('span');
  title.innerHTML = `${l.type === 'COLOR' ? swatchHtml(resolveSwatch(l.value)) : ''}<span class="vm-val">${escapeHtml(l.name)}</span> <span class="lib-tag">LIB</span>`;
  const body = document.createElement('div');
  const dl = document.createElement('dl');
  const row = (k: string, val: HTMLElement | string): void => {
    const dt = document.createElement('dt');
    dt.textContent = k;
    const dd = document.createElement('dd');
    if (typeof val === 'string') dd.textContent = val; else dd.appendChild(val);
    dl.append(dt, dd);
  };
  row(t('vm.dCollection'), t('list.libCollection', { name: l.collection }));
  row(t('list.dValue'), valueEl(l.value));
  const uses = usesBlock(l.id);
  row(t('list.dUses'), uses.box);
  body.appendChild(dl);
  const n = document.createElement('div');
  n.className = 'hint';
  n.textContent = t('list.libManaged');
  body.appendChild(n);
  const key = `lib:${l.id}`;
  const close = modalButton(t('common.close'), () => requestCloseModal('button'), true);
  const box = openModal(title, body, [close], () => focusRowOrHead(key), undefined, { focus: close });
  detailBox = box;
  detailUsesEl = uses.list;
  uses.run();
}

function onVarUsers(msg: Extract<CodeToUi, { type: 'VAR_USERS' }>): void {
  if (msg.reqId !== detailReq || !detailUsesEl || !detailBox || !modalEl) return;
  const box = detailUsesEl;
  clearMount(box);
  if (!msg.totalLayers) { box.textContent = t('vm.dNoUses'); return; }
  const head = document.createElement('div');
  head.className = 'hint';
  head.textContent = t('list.usesHead', { k: msg.totalLayers, n: msg.places });
  box.appendChild(head);
  for (const l of msg.layers) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'var-use';
    b.title = t('bind.layerSelectTip');
    b.innerHTML = `<span class="vu-layer">${escapeHtml(l.name)}</span>`;
    b.addEventListener('click', () => selectNodes([l.id], 'list'));
    box.appendChild(b);
  }
  if (msg.totalLayers > msg.layers.length) {
    const more = document.createElement('div');
    more.className = 'hint';
    more.textContent = t('list.usesMore', { n: msg.totalLayers - msg.layers.length });
    box.appendChild(more);
  }
}

/* ---------- 고치기 상태 ---------- */
interface EdField {
  modeId: string;
  modeName: string;
  /** 열 때(또는 마지막 저장 응답 뒤)의 칸. 값 없는 모드는 undefined. */
  base: VarCell | undefined;
  mode: 'value' | 'alias';
  /** 값일 때 글자(색 · 숫자 · 글자). */
  text: string;
  bool: boolean;
  /** 별칭일 때 대상 id. */
  aliasId: string | null;
  /** 값 칸에 손댔다(손대지 않은 칸은 표시값이 달라도 고친 것이 아니다). */
  touched: boolean;
  /** "값으로 적기"를 따라갈 수 없어 칸을 비웠다 → "값을 적어 주세요". */
  needValue: boolean;
  /** 피그마가 거절한 원문(저장 응답). 칸을 고치면 지운다. */
  figmaErr: string | null;
  dd: HTMLElement;
  /** 칸의 첫 컨트롤(입력 · 스위치 · 알약) — 첫 오류 칸 포커스용. */
  ctl: HTMLElement | null;
  ddBtn: HTMLButtonElement | null;
}
type EdSticky = 'deleted' | 'conflict' | 'maybe';
interface Editor {
  v: VarRow;
  nameText: string;
  nameFigmaErr: string | null;
  fields: EdField[];
  saving: { reqId: number; awaitingTable: boolean; res?: Extract<CodeToUi, { type: 'VARIABLE_UPDATED' }> } | null;
  timer: ReturnType<typeof setTimeout> | null;
  sticky: EdSticky | null;
  event: { text: string; err: boolean; tip?: string } | null;
  confirm: boolean;
  picker: { modeId: string; query: string } | null;
  lastField: HTMLElement | null;
  /** 시간 초과 · ERROR 뒤의 요청(늦은 응답은 목록만 맞춘다). */
  dead: Set<number>;
  /** 팝업을 연 뒤 무엇이든 바뀐 응답이 있었나 · 마지막 그런 응답이 일부 실패였나(닫을 때 상태 줄). */
  appliedAny: boolean;
  lastPartial: boolean;
  title: HTMLElement;
  nameInput: HTMLInputElement;
  nameField: HTMLElement;
  nameErr: HTMLElement;
  changes: HTMLElement;
  alert: HTMLElement;
  confirmRow: HTMLElement;
  btnKeep: HTMLButtonElement;
  btnClose: HTMLButtonElement;
  btnSave: HTMLButtonElement;
  usesRun: () => void;
}
let ed: Editor | null = null;
/** 닫은 뒤에도 늦게 올 수 있는 시간 초과 요청 — 바뀐 응답이면 목록만 다시 읽는다. */
const edDeadReqs = new Set<number>();
const EDIT_TIMEOUT = 10000;

/** 별칭 대상의 표시(이름 · LIB · 삭제됨) — 로컬이면 지금 표의 이름, 아니면 base 칸의 이름. */
function edTarget(f: EdField, id: string): { name: string; remote: boolean; deleted: boolean } {
  const local = vmVars.find((v) => v.id === id);
  if (local) return { name: local.name, remote: false, deleted: false };
  const b = f.base?.kind === 'alias' && f.base.aliasId === id ? f.base : undefined;
  if (b?.remote) return { name: b.aliasName, remote: true, deleted: false };
  return { name: t('edit.deletedTarget'), remote: false, deleted: true };
}
/** 견본 색(고치기) — 그 모드 줄에서 시작해 대상 컬렉션의 기본 모드 값, 로컬 별칭 최대 5단계(목록 견본과 다름). */
function edSwatch(cell: VarCell | undefined): string | null {
  const r = resolveEditValue(cell, vmCols, vmVars);
  return r && r.kind === 'color' ? r.hex : null;
}

/** 한 칸의 판정 — 고친 것인가 · 입력 오류 · 보낼 값. */
function edDraft(f: EdField, type: VarRow['type']): { changed: boolean; err: string | null; value?: EditValue } {
  if (f.mode === 'alias') {
    const changed = !(f.base?.kind === 'alias' && f.base.aliasId === f.aliasId);
    return { changed, err: null, value: { kind: 'alias', targetId: f.aliasId ?? '' } };
  }
  if (!f.touched) return { changed: false, err: null };
  if (type === 'BOOLEAN') {
    if (f.needValue) return { changed: true, err: t('edit.errNeedValue') };
    const value: EditValue = { kind: 'bool', value: f.bool };
    return { changed: !sameCell(f.base, value), err: null, value };
  }
  const raw = f.text;
  if (f.needValue && raw === '') return { changed: true, err: t('edit.errNeedValue') };
  if (!f.base && raw.trim() === '') return { changed: false, err: null }; // 값 없는 모드를 비운 채로 둠
  let value: EditValue;
  if (type === 'COLOR') {
    const p = parseColorInput(raw);
    if (!p) return { changed: true, err: t('edit.errColor') };
    value = { kind: 'color', hex: p.hex, alpha: p.alpha };
  } else if (type === 'FLOAT') {
    const n = parseNumberInput(raw);
    if (n === null) return { changed: true, err: t('edit.errNumber') };
    value = { kind: 'number', value: n };
  } else value = { kind: 'string', text: raw };
  return { changed: !sameCell(f.base, value), err: null, value };
}
function edNameState(e: Editor): { changed: boolean; err: string | null; name: string } {
  const name = normalizeVarName(e.nameText);
  const changed = name !== normalizeVarName(e.v.name);
  const ne = changed ? nameError(e.nameText, e.v, vmVars) : null;
  return { changed, err: ne === 'emptySegment' ? t('edit.nameEmptySeg') : ne === 'duplicate' ? t('edit.nameDup') : null, name };
}
function edState(e: Editor): { changed: boolean; hasErr: boolean; firstErr: HTMLElement | null } {
  const n = edNameState(e);
  let changed = n.changed;
  let firstErr: HTMLElement | null = n.err ? e.nameInput : null;
  for (const f of e.fields) {
    const d = edDraft(f, e.v.type);
    if (d.changed) changed = true;
    if (d.err && !firstErr) firstErr = f.ctl;
  }
  return { changed, hasErr: !!firstErr, firstErr };
}
/** 첫 오류 칸(입력 오류 + 피그마 거절). */
function edFirstErrorCtl(e: Editor): HTMLElement | null {
  if (edNameState(e).err || e.nameFigmaErr !== null) return e.nameInput;
  for (const f of e.fields) if (edDraft(f, e.v.type).err || f.figmaErr !== null) return f.ctl;
  return null;
}

/** 단추 · 알림 줄 · 확인 줄 · 칸 표시 · 바뀌는 것 줄을 지금 상태로. */
function edChrome(): void {
  const e = ed;
  if (!e) return;
  const st = edState(e);
  const saving = !!e.saving;
  // 이름 칸
  const n = edNameState(e);
  e.nameField.classList.toggle('changed', n.changed);
  e.nameField.classList.toggle('err', !!n.err || e.nameFigmaErr !== null);
  e.nameInput.disabled = saving;
  e.nameErr.textContent = n.err ?? (e.nameFigmaErr !== null ? t('edit.nameRejected') : '');
  e.nameErr.title = !n.err && e.nameFigmaErr ? e.nameFigmaErr : '';
  e.nameErr.hidden = !e.nameErr.textContent;
  // 값 칸
  for (const f of e.fields) {
    const d = edDraft(f, e.v.type);
    const wrap = f.dd.querySelector<HTMLElement>('.ed-field');
    wrap?.classList.toggle('changed', d.changed);
    wrap?.classList.toggle('err', !!d.err || f.figmaErr !== null);
    f.dd.querySelectorAll<HTMLInputElement | HTMLButtonElement>('input, button').forEach((x) => { if (!x.closest('.ed-picker')) x.disabled = saving; });
    const errEl = f.dd.querySelector<HTMLElement>('.ed-ferr');
    if (errEl) {
      errEl.textContent = d.err ?? (f.figmaErr !== null ? t('edit.valueRejected') : '');
      errEl.title = !d.err && f.figmaErr ? f.figmaErr : '';
      errEl.hidden = !errEl.textContent;
    }
    if (f.mode === 'value' && e.v.type === 'COLOR') {
      const sw = f.dd.querySelector<HTMLElement>('.ed-field > .bf-swatch');
      const p = parseColorInput(f.text);
      if (sw) sw.style.background = p ? p.hex : 'transparent';
    }
  }
  // 바뀌는 것 줄 — 이름이 바뀔 때만(그룹 이동 · CSS 이름)
  clearMount(e.changes);
  // 빈 토막이면 경로가 성립하지 않아 보이지 않는다. 같은 이름 오류는 그대로 보인다(시안 ④).
  const showCh = n.changed && n.err !== t('edit.nameEmptySeg');
  const gm = showCh ? groupMove(e.v.name, n.name, e.v, vmVars) : null;
  const cr = showCh ? cssRename(e.v.name, n.name, e.v.id, vmVars, cssVarName) : null;
  if (gm || cr) {
    const h = document.createElement('span');
    h.className = 'ed-ch-h';
    h.textContent = t('edit.changesHead');
    e.changes.appendChild(h);
    if (gm) {
      const d = document.createElement('div');
      d.append(`· ${t('edit.groupMove', { from: gm.from, to: gm.to })}`);
      if (gm.newGroup) { const m = document.createElement('span'); m.className = 'muted'; m.textContent = ` ${t('edit.newGroup')}`; d.appendChild(m); }
      if (gm.emptied) { const m = document.createElement('span'); m.className = 'muted'; m.textContent = ` ${t('edit.groupEmptied', { group: gm.from })}`; d.appendChild(m); }
      e.changes.appendChild(d);
    }
    if (cr) {
      const d = document.createElement('div');
      d.append(`· ${t('edit.cssLabel')} `);
      const m = document.createElement('span');
      m.className = 'mono';
      m.textContent = `${cr.from} → ${cr.to}`;
      d.appendChild(m);
      if (cr.clash) { const w = document.createElement('span'); w.className = 'w'; w.textContent = ` ${t('edit.cssClash', { name: cr.clash })}`; d.appendChild(w); }
      e.changes.appendChild(d);
    }
  }
  e.changes.hidden = !(gm || cr);
  // 알림 줄 — 남는 상태 문구가 사건 문구보다 앞선다.
  const stickyText = e.sticky === 'deleted' ? t('edit.deleted') : e.sticky === 'conflict' ? t('edit.conflict') : e.sticky === 'maybe' ? t('edit.maybeSaved') : null;
  const text = stickyText ?? e.event?.text ?? '';
  e.alert.textContent = text;
  e.alert.title = !stickyText && e.event?.tip ? e.event.tip : '';
  e.alert.hidden = !text;
  e.alert.classList.toggle('err', !!stickyText || !!e.event?.err);
  e.confirmRow.hidden = !e.confirm;
  // 단추 — 고친 것이 없으면 [닫기] + [저장](잠김), 있으면 [취소] + [저장].
  e.btnClose.textContent = st.changed ? t('common.cancel') : t('common.close');
  e.btnSave.textContent = saving ? t('edit.savingBtn') : t('edit.save');
  const locked = saving || !!e.sticky || !st.changed || st.hasErr;
  if (locked) { e.btnSave.setAttribute('aria-disabled', 'true'); e.btnSave.dataset.lock = 'edit'; }
  else { e.btnSave.removeAttribute('aria-disabled'); delete e.btnSave.dataset.lock; }
}
/** 칸을 고쳤다 — 사건 문구를 지우고 다시 판정. */
function edEdited(): void {
  if (!ed) return;
  ed.event = null;
  edChrome();
}
/** 잠긴 [저장]을 눌렀다 — 사유는 팝업 안 알림 줄에(상태 줄은 팝업 뒤에 가려진다). */
function edLockedSave(): void {
  const e = ed;
  if (!e || e.saving || e.sticky) return; // 저장 중 · 남는 상태 문구는 그대로
  const st = edState(e);
  if (!st.changed) e.event = { text: t('edit.noChange'), err: false };
  else if (st.hasErr) { e.event = { text: t('edit.checkInput'), err: true }; st.firstErr?.focus(); }
  edChrome();
}

/** 칸 한 줄(값 · 별칭) 다시 그리기 — 고르개가 열려 있으면 그 아래에. */
function edRenderField(f: EdField): void {
  const e = ed!;
  clearMount(f.dd);
  const wrap = document.createElement('div');
  wrap.className = 'ed-field';
  f.ctl = null;
  if (f.mode === 'alias' && f.aliasId) {
    const tg = edTarget(f, f.aliasId);
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'ed-pillbtn';
    b.setAttribute('aria-label', t('edit.valueAria', { mode: f.modeName }));
    const pill = document.createElement('span');
    pill.className = `ed-pill${tg.deleted ? ' warn' : ''}`;
    const hex = e.v.type === 'COLOR' && !tg.deleted ? edSwatch({ kind: 'alias', aliasId: f.aliasId, aliasName: tg.name }) : null;
    pill.innerHTML = `${swatchHtml(hex)}→ ${escapeHtml(tg.name)}${tg.remote ? ' <span class="lib-tag">LIB</span>' : ''}`;
    pill.title = tg.name;
    b.appendChild(pill);
    b.addEventListener('click', () => edTogglePicker(f));
    wrap.appendChild(b);
    f.ctl = b;
  } else if (e.v.type === 'BOOLEAN') {
    const sw = document.createElement('button');
    sw.type = 'button';
    sw.className = 'bv-switch';
    sw.setAttribute('role', 'switch');
    sw.setAttribute('aria-checked', String(f.bool));
    sw.setAttribute('aria-label', t('edit.valueAria', { mode: f.modeName }));
    const track = document.createElement('span');
    track.className = 'bv-track';
    track.setAttribute('aria-hidden', 'true');
    sw.appendChild(track);
    sw.addEventListener('click', () => {
      f.bool = !f.bool;
      f.touched = true;
      f.needValue = false;
      f.figmaErr = null;
      sw.setAttribute('aria-checked', String(f.bool));
      edEdited();
    });
    const grow = document.createElement('span');
    grow.className = 'ed-grow';
    wrap.append(sw, grow);
    f.ctl = sw;
  } else {
    if (e.v.type === 'COLOR') {
      const sw = document.createElement('span');
      sw.className = 'bf-swatch';
      const p = parseColorInput(f.text);
      sw.style.background = p ? p.hex : 'transparent';
      wrap.appendChild(sw);
    }
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.value = f.text;
    inp.placeholder = '—';
    inp.spellcheck = false;
    inp.setAttribute('aria-label', t('edit.valueAria', { mode: f.modeName }));
    inp.addEventListener('input', () => {
      f.text = inp.value;
      f.touched = true;
      f.needValue = false;
      f.figmaErr = null;
      edEdited();
    });
    wrap.appendChild(inp);
    f.ctl = inp;
  }
  const dd = document.createElement('button');
  dd.type = 'button';
  dd.className = 'ed-dd';
  const open = e.picker?.modeId === f.modeId;
  dd.textContent = open ? '▴' : '▾';
  dd.setAttribute('aria-label', t('edit.pickAria', { mode: f.modeName }));
  dd.setAttribute('aria-haspopup', 'listbox');
  dd.setAttribute('aria-expanded', String(open));
  dd.addEventListener('click', () => edTogglePicker(f));
  wrap.appendChild(dd);
  f.ddBtn = dd;
  f.dd.appendChild(wrap);
  const err = document.createElement('div');
  err.className = 'ed-ferr';
  err.hidden = true;
  f.dd.appendChild(err);
  if (f.mode === 'alias' && f.aliasId && edTarget(f, f.aliasId).deleted) {
    const w = document.createElement('div');
    w.className = 'ed-fwarn';
    w.textContent = t('edit.targetDeleted');
    f.dd.appendChild(w);
  }
  if (open) f.dd.appendChild(edPicker(f));
}

/** 고르개 열기 · 닫기 — 한 번에 하나만. */
function edTogglePicker(f: EdField): void {
  const e = ed;
  if (!e || e.saving) return;
  const prev = e.picker ? e.fields.find((x) => x.modeId === e.picker!.modeId) : undefined;
  if (prev === f) { edClosePicker(true); return; }
  e.picker = { modeId: f.modeId, query: '' };
  if (prev) edRenderField(prev);
  edRenderField(f);
  edChrome();
  f.dd.querySelector<HTMLInputElement>('.ed-psearch')?.focus();
}
function edClosePicker(focusDd: boolean): void {
  const e = ed;
  if (!e?.picker) return;
  const f = e.fields.find((x) => x.modeId === e.picker!.modeId);
  e.picker = null;
  if (!f) return;
  edRenderField(f);
  edChrome();
  if (focusDd) f.ddBtn?.focus();
}
/** 별칭 대상을 고름 → 칸은 별칭, 고르개 닫힘. */
function edPick(f: EdField, id: string): void {
  f.mode = 'alias';
  f.aliasId = id;
  f.touched = true;
  f.needValue = false;
  f.figmaErr = null;
  ed!.event = null;
  edClosePicker(true);
}
/** "값으로 적기" — 따라간 실제 값을 칸에. 따라갈 수 없으면(라이브러리 · 삭제된 대상) 비우고 "값을 적어 주세요". */
function edWriteValue(f: EdField): void {
  const r = f.aliasId ? resolveEditValue({ kind: 'alias', aliasId: f.aliasId, aliasName: '' }, vmCols, vmVars) : null;
  f.mode = 'value';
  f.touched = true;
  f.figmaErr = null;
  if (r) {
    f.text = cellInputText(r);
    f.bool = r.kind === 'bool' && r.text === 'true';
    f.needValue = false;
  } else {
    f.text = '';
    f.bool = false;
    f.needValue = true;
  }
  ed!.event = null;
  edClosePicker(false);
  f.ctl?.focus();
}
/** 별칭 고르개(listbox) — 검색 칸 → (값으로 적기) → (규칙 밖 지금 대상) → 후보(경로 머리) → 안내 줄. */
function edPicker(f: EdField): HTMLElement {
  const e = ed!;
  const el = document.createElement('div');
  el.className = 'ed-picker';
  const search = document.createElement('input');
  search.type = 'text';
  search.className = 'ed-psearch';
  search.placeholder = t('edit.pickSearch');
  search.setAttribute('aria-label', t('edit.pickSearch'));
  search.value = e.picker?.query ?? '';
  const lb = document.createElement('div');
  lb.setAttribute('role', 'listbox');
  lb.setAttribute('aria-label', t('edit.pickAria', { mode: f.modeName }));
  const notes = document.createElement('div');
  const opts: HTMLElement[] = [];
  const option = (cls: string, html: string, title: string, onPick: (() => void) | null, selected = false): HTMLElement => {
    const o = document.createElement('div');
    o.className = `ed-opt${cls ? ` ${cls}` : ''}`;
    o.setAttribute('role', 'option');
    o.setAttribute('aria-selected', String(selected));
    o.tabIndex = -1;
    o.innerHTML = html;
    if (title) o.title = title;
    if (!onPick) o.setAttribute('aria-disabled', 'true');
    else o.addEventListener('click', onPick);
    o.addEventListener('keydown', (ev) => {
      const i = opts.indexOf(o);
      if (ev.key === 'ArrowDown') opts[Math.min(opts.length - 1, i + 1)]?.focus();
      else if (ev.key === 'ArrowUp') (i <= 0 ? search : opts[i - 1]).focus();
      else if ((ev.key === 'Enter' || ev.key === ' ') && onPick) onPick();
      else return;
      ev.preventDefault();
    });
    opts.push(o);
    return o;
  };
  const curId = f.mode === 'alias' ? f.aliasId : null;
  const valHtml = (cell: VarCell | undefined): string => {
    const r = resolveEditValue(cell, vmCols, vmVars);
    if (!r) return '';
    if (r.kind === 'color') return swatchHtml(r.hex);
    return `<span class="ed-ov">${escapeHtml(r.text)}</span>`;
  };
  const render = (): void => {
    clearMount(lb);
    clearMount(notes);
    opts.length = 0;
    const q = e.picker?.query ?? '';
    if (curId) {
      const r = resolveEditValue({ kind: 'alias', aliasId: curId, aliasName: '' }, vmCols, vmVars);
      const preview = r ? (r.kind === 'color' ? colorText(r.hex, r.alpha) : r.text) : '—';
      lb.appendChild(option('ed-raw', `${escapeHtml(t('edit.writeValue'))} <span class="mono">${escapeHtml(preview)}</span>`, '', () => edWriteValue(f)));
    }
    const all = aliasCandidates(e.v, vmCols, vmVars);
    const inRules = !!curId && all.groups.some((g) => g.rows.some((r) => r.id === curId));
    const note = (text: string): void => { const d = document.createElement('div'); d.className = 'ed-pnote'; d.textContent = text; notes.appendChild(d); };
    if (curId && !inRules) {
      const tg = edTarget(f, curId);
      lb.appendChild(option('', `${escapeHtml(tg.name)}${tg.remote ? ' <span class="lib-tag">LIB</span>' : ''}<span class="ck">✓</span>`, tg.name, null, true));
    }
    if (all.global) {
      const d = document.createElement('div');
      d.className = 'ed-pnone';
      d.textContent = t('edit.pickGlobal');
      lb.appendChild(d);
    } else {
      const cands = aliasCandidates(e.v, vmCols, vmVars, q);
      const sc = document.createElement('div');
      sc.className = 'ed-pscroll';
      sc.setAttribute('role', 'presentation');
      for (const g of cands.groups) {
        const h = document.createElement('div');
        h.className = 'ed-phead';
        h.setAttribute('role', 'presentation');
        h.textContent = g.label;
        sc.appendChild(h);
        for (const r of g.rows) {
          const col = vmCols.find((c) => c.id === r.collectionId);
          const cell = r.values[col?.defaultModeId ?? col?.modes[0]?.modeId ?? ''];
          sc.appendChild(option('', `${valHtml(cell)}${escapeHtml(leafName(r.name))}${r.id === curId ? '<span class="ck">✓</span>' : ''}`, r.name, () => edPick(f, r.id), r.id === curId));
        }
      }
      if (!cands.groups.length) {
        const d = document.createElement('div');
        d.className = 'ed-pnone';
        d.textContent = t('edit.pickNoMatch');
        sc.appendChild(d);
      }
      lb.appendChild(sc);
    }
    if (curId && !inRules) note(t('edit.pickOutOfRules'));
    if (all.allTiers) note(t('edit.pickAllTiers'));
    if (!all.global) note(t('edit.pickNoLib'));
    opts.forEach((o, i) => (o.tabIndex = i === 0 ? 0 : -1));
  };
  search.addEventListener('input', () => {
    if (e.picker) e.picker.query = search.value;
    render();
  });
  search.addEventListener('keydown', (ev) => {
    if (ev.key === 'ArrowDown') { ev.preventDefault(); opts[0]?.focus(); }
  });
  // Esc는 고르개만 닫고 그 [▾]로(팝업까지 올리지 않는다).
  el.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Escape') return;
    ev.preventDefault();
    ev.stopPropagation();
    edClosePicker(true);
  });
  render();
  el.append(search, lb, notes);
  return el;
}

/** 열 때 · 저장 응답 뒤 칸 하나를 표 칸으로 되돌린다. */
function edResetField(f: EdField, base: VarCell | undefined, type: VarRow['type']): void {
  f.base = base;
  f.mode = base?.kind === 'alias' ? 'alias' : 'value';
  f.aliasId = base?.kind === 'alias' ? base.aliasId : null;
  f.text = cellInputText(base);
  f.bool = type === 'BOOLEAN' && base?.kind === 'bool' && base.text === 'true';
  f.touched = false;
  f.needValue = false;
  f.figmaErr = null;
}
function edTitle(e: Editor): void {
  const col = vmCols.find((c) => c.id === e.v.collectionId);
  const first = e.v.values[col?.defaultModeId ?? col?.modes[0]?.modeId ?? ''];
  e.title.innerHTML = `${e.v.type === 'COLOR' ? swatchHtml(edSwatch(first)) : ''}<span class="vm-val">${escapeHtml(e.v.name)}</span>`;
}

/** 로컬 행 상세 = 고치기 팝업(§4.4 고치기). 칸은 처음부터 고칠 수 있다. */
function openEditor(v: VarRow, focusName: boolean): void {
  const col = vmCols.find((c) => c.id === v.collectionId);
  const title = document.createElement('span');
  const body = document.createElement('div');
  const dl = document.createElement('dl');
  dl.className = 'ed-dl';
  const row = (k: string, val: HTMLElement | string, cls = ''): HTMLElement => {
    const dt = document.createElement('dt');
    dt.textContent = k;
    dt.title = k;
    const dd = document.createElement('dd');
    if (cls) dd.className = cls;
    if (typeof val === 'string') dd.textContent = val; else dd.appendChild(val);
    dl.append(dt, dd);
    return dd;
  };
  if (col) {
    const tierName = col.tier ? ['', 'Global', 'Semantic', 'Component'][col.tier] : t('vm.noTier');
    row(t('vm.dCollection'), col.name === tierName ? col.name : `${col.name} · ${tierName}`, 'ed-plain');
  }
  // 이름 칸
  const nameField = document.createElement('div');
  nameField.className = 'ed-field';
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.value = v.name;
  nameInput.spellcheck = false;
  nameInput.setAttribute('aria-label', t('edit.nameAria'));
  nameField.appendChild(nameInput);
  const nameErr = document.createElement('div');
  nameErr.className = 'ed-ferr';
  nameErr.hidden = true;
  const nameBox = document.createElement('div');
  nameBox.append(nameField, nameErr);
  row(t('edit.name'), nameBox);
  // 값 칸 — 컬렉션의 모든 모드, 한 줄씩
  const fields: EdField[] = [];
  for (const m of col?.modes ?? []) {
    const dd = row(m.name, '');
    const f: EdField = { modeId: m.modeId, modeName: m.name, base: undefined, mode: 'value', text: '', bool: false, aliasId: null, touched: false, needValue: false, figmaErr: null, dd, ctl: null, ddBtn: null };
    edResetField(f, v.values[m.modeId], v.type);
    fields.push(f);
  }
  const scopes = document.createElement('span');
  for (const sc of v.scopes) {
    const c = document.createElement('span');
    c.className = 'chip';
    c.textContent = sc;
    scopes.appendChild(c);
  }
  row(t('vm.dScopes'), v.scopes.length ? scopes : '—', 'ed-text');
  row(t('vm.dDesc'), v.description || '—', 'ed-text');
  const uses = usesBlock(v.id);
  row(t('list.dUses'), uses.box, 'ed-text');
  body.appendChild(dl);
  const changes = document.createElement('div');
  changes.className = 'ed-changes';
  changes.hidden = true;
  body.appendChild(changes);
  // 단추 줄 — 알림 줄 · 확인 줄 · [닫기]/[취소] · [저장]
  const alert = document.createElement('div');
  alert.className = 'ed-alert';
  alert.setAttribute('role', 'status');
  alert.hidden = true;
  const confirmRow = document.createElement('div');
  confirmRow.className = 'ed-confirm';
  confirmRow.hidden = true;
  const cq = document.createElement('span');
  cq.textContent = t('edit.confirm');
  const btnDiscard = modalButton(t('edit.discard'), () => closeModal());
  const btnKeep = modalButton(t('edit.keep'), () => edKeepEditing());
  confirmRow.append(cq, btnDiscard, btnKeep);
  const btnClose = modalButton(t('common.close'), () => requestCloseModal('button'));
  const btnSave = modalButton(t('edit.save'), () => edSave(), true);
  const e: Editor = {
    v, nameText: v.name, nameFigmaErr: null, fields, saving: null, timer: null, sticky: null, event: null, confirm: false, picker: null,
    lastField: null, dead: new Set(), appliedAny: false, lastPartial: false,
    title, nameInput, nameField, nameErr, changes, alert, confirmRow, btnKeep, btnClose, btnSave, usesRun: uses.run,
  };
  ed = e;
  edTitle(e);
  for (const f of fields) edRenderField(f);
  nameInput.addEventListener('input', () => {
    e.nameText = nameInput.value;
    e.nameFigmaErr = null;
    edEdited();
  });
  // 확인 줄의 [계속 고치기]는 직전 칸으로 포커스를 돌린다.
  body.addEventListener('focusin', (ev) => { e.lastField = ev.target as HTMLElement; });
  const box = openModal(title, body, [btnClose, btnSave], () => edAfterClose(e), () => edCleanup(e), {
    focus: focusName ? nameInput : btnClose,
    beforeClose: (how) => edBeforeClose(e, how),
    footTop: [alert, confirmRow],
  });
  detailBox = box;
  detailUsesEl = uses.list;
  edChrome();
  uses.run();
}
/** 닫기 전 확인 — [취소] · Esc · 바깥 누름은 모두 같다. */
function edBeforeClose(e: Editor, how: 'esc' | 'backdrop' | 'button'): boolean {
  if (e.saving) {
    e.event = { text: t('edit.saving'), err: false };
    edChrome();
    return false;
  }
  if (e.confirm) {
    if (how === 'esc') edKeepEditing(); // 확인 줄이 떠 있을 때 Esc = [계속 고치기]
    else e.btnKeep.focus();
    return false;
  }
  if (!edState(e).changed) return true;
  e.confirm = true;
  edChrome();
  e.btnKeep.focus();
  return false;
}
function edKeepEditing(): void {
  const e = ed;
  if (!e) return;
  e.confirm = false;
  edChrome();
  const back = e.lastField && e.lastField.isConnected && !e.lastField.closest('[hidden]') ? e.lastField : e.nameInput;
  back.focus();
}
function edCleanup(e: Editor): void {
  if (e.timer) clearTimeout(e.timer);
  e.timer = null;
  if (ed === e) ed = null;
  detailUsesEl = null;
  detailBox = null;
}
/** 닫은 뒤 — 변수 id로 행을 다시 찾아 포커스, 바뀐 응답이 있었으면 상태 줄(§4.4 고치기 "닫을 때 상태 줄"). */
function edAfterClose(e: Editor): HTMLElement {
  const target = focusRowOrHead(`row:${e.v.id}`);
  if (e.appliedAny) {
    const present = target !== $('varMainTitle');
    const name = vmVars.find((x) => x.id === e.v.id)?.name ?? e.v.name;
    if (e.lastPartial) showStatusLine(present ? t('edit.partial') : t('edit.closedPartialMissing', { name }), { cls: 'warn' });
    else if (!present) showStatusLine(t('edit.closedMissing', { name }));
  }
  return target;
}

/** [저장] — 고친 것만 한 번에(UPDATE_VARIABLE). 잠긴 [저장]은 edLockedSave로 간다. */
function edSave(): void {
  const e = ed;
  if (!e || e.saving || e.sticky) return;
  const st = edState(e);
  if (!st.changed || st.hasErr) { edLockedSave(); return; }
  const n = edNameState(e);
  const values: Record<string, EditValue> = {};
  const baseValues: Record<string, VarCell | null> = {};
  for (const f of e.fields) {
    const d = edDraft(f, e.v.type);
    if (!d.changed || !d.value) continue;
    values[f.modeId] = d.value;
    baseValues[f.modeId] = f.base ?? null;
  }
  const reqId = ++bindReqSeq;
  e.saving = { reqId, awaitingTable: false };
  e.event = null;
  e.confirm = false;
  if (e.picker) edClosePicker(false);
  e.timer = setTimeout(() => edMaybeSaved(reqId), EDIT_TIMEOUT);
  const msg: UiToCode = { type: 'UPDATE_VARIABLE', reqId, id: e.v.id, base: { name: e.v.name, values: baseValues } };
  if (n.changed) msg.name = n.name;
  if (Object.keys(values).length) msg.values = values;
  send(msg);
  edChrome();
}
/** 저장 중 끝. */
function edEndSaving(e: Editor): void {
  e.saving = null;
  if (e.timer) clearTimeout(e.timer);
  e.timer = null;
}
function edSetSticky(e: Editor, s: EdSticky): void {
  if (e.sticky === 'deleted') return; // "변수가 삭제됐어요"가 가장 앞선다
  e.sticky = s;
}
/** 응답이나 표가 오지 않음(ERROR · 10초) — 결과를 알 수 없다: 저장 중 끝, [저장]은 닫을 때까지 잠금. */
function edMaybeSaved(reqId?: number): void {
  const e = ed;
  if (!e?.saving || (reqId !== undefined && e.saving.reqId !== reqId)) return;
  e.dead.add(e.saving.reqId);
  edDeadReqs.add(e.saving.reqId);
  edEndSaving(e);
  edSetSticky(e, 'maybe');
  edChrome();
}
function edReasonText(err: VarUpdateError | undefined): { text: string; tip?: string } {
  if (!err) return { text: '' };
  if (err.code === 'name') return { text: t('edit.nameRejected'), tip: err.message };
  if (err.code === 'value') return { text: t('edit.valueRejected'), tip: err.message };
  return { text: t('edit.saveFailed'), tip: err.message };
}
/** 저장 응답(VARIABLE_UPDATED). */
function onVariableUpdated(msg: Extract<CodeToUi, { type: 'VARIABLE_UPDATED' }>): void {
  const e = ed;
  if (edDeadReqs.has(msg.reqId)) {
    // 시간 초과 뒤 늦은 응답 — 팝업은 다시 그리지 않는다. 바뀌었으면 목록을 실제와 맞추고 닫을 때 판정에 넣는다.
    edDeadReqs.delete(msg.reqId);
    if (msg.applied.length) {
      readScreen('work');
      if (e && e.dead.has(msg.reqId)) { e.appliedAny = true; e.lastPartial = !!msg.error; }
    }
    return;
  }
  if (!e?.saving || e.saving.reqId !== msg.reqId) return;
  if (!msg.applied.length) {
    // 1·2·3단계에서 아무것도 안 바뀜 — 응답을 받을 때 바로 '저장 중' 끝.
    edEndSaving(e);
    const err = msg.error;
    let focus: HTMLElement | null = null;
    if (err?.code === 'deleted') edSetSticky(e, 'deleted');
    else if (err?.code === 'conflict') edSetSticky(e, 'conflict');
    else {
      if (err?.code === 'name') { e.nameFigmaErr = err.message ?? ''; focus = e.nameInput; }
      else if (err?.code === 'value') {
        const f = e.fields.find((x) => x.modeId === err.modeId);
        if (f) { f.figmaErr = err.message ?? ''; focus = f.ctl; }
      }
      const r = edReasonText(err);
      e.event = { text: r.text, err: true, tip: r.tip };
      if (!focus) focus = e.btnSave;
    }
    edChrome();
    focus?.focus();
    return;
  }
  // 하나라도 바뀜 — 응답 뒤 첫 변수 표를 받아 다시 그릴 때까지 '저장 중' 유지.
  e.appliedAny = true;
  e.lastPartial = !!msg.error;
  e.saving.awaitingTable = true;
  e.saving.res = msg;
  readScreen('work');
}
/** 응답 뒤 첫 변수 표 — 직전 표와 같아도 base를 새로 잡는다(onVarTable의 같은 표 조기 반환보다 앞). */
function edOnVarTable(msg: Extract<CodeToUi, { type: 'VAR_TABLE' }>): void {
  const e = ed;
  if (!e?.saving?.awaitingTable || !e.saving.res) return;
  const res = e.saving.res;
  edEndSaving(e);
  const row = msg.vars.find((x) => x.id === e.v.id);
  if (!row) { edSetSticky(e, 'deleted'); edChrome(); return; }
  const applied = new Set(res.applied);
  const prev = e.v;
  const remaining = new Map<string, boolean>();
  for (const f of e.fields) remaining.set(f.modeId, !applied.has(f.modeId) && edDraft(f, prev.type).changed);
  const nameRemains = !applied.has('name') && normalizeVarName(e.nameText) !== normalizeVarName(prev.name);
  e.v = row;
  e.nameFigmaErr = null;
  if (!nameRemains) { e.nameText = row.name; e.nameInput.value = row.name; }
  for (const f of e.fields) {
    const base = row.values[f.modeId];
    if (remaining.get(f.modeId)) {
      f.base = base; // 실패해서 남은 칸만 입력을 그대로 둔다
      if (res.error?.code === 'value' && res.error.modeId === f.modeId) f.figmaErr = res.error.message ?? '';
    } else edResetField(f, base, row.type);
    edRenderField(f);
  }
  edTitle(e);
  let focus: HTMLElement | null;
  if (res.error) {
    const r = edReasonText(res.error);
    e.event = { text: `${r.text} · ${t('edit.partial')}`, err: true, tip: r.tip };
    focus = edFirstErrorCtl(e) ?? e.btnSave;
  } else {
    e.event = null; // 성공 — 문구 없음. 칸이 새 값으로, [닫기] · [저장] 잠김이 저장된 표시다.
    focus = e.btnClose;
  }
  edChrome();
  focus.focus();
  if (res.applied.some((k) => k !== 'name')) e.usesRun(); // 값·별칭이 바뀌면 쓰인 곳을 다시 찾는다
}

/* ---------- 계층 팝업 · 내보내기 팝업(⋯) ---------- */
function openPopupFrom(storeId: string, title: string, returnFocus: HTMLElement): void {
  const content = $(storeId);
  const body = document.createElement('div');
  body.appendChild(content);
  content.hidden = false;
  openModal(title, body, [modalButton(t('common.close'), closeModal, true)], returnFocus, () => {
    content.hidden = true;
    $('popupStore').appendChild(content); // 팝업이 지워지기 전에 원래 자리로
  });
}
function openTierPopup(returnFocus: HTMLElement): void {
  send({ type: 'GET_COLLECTION_ROLES' });
  openPopupFrom('tierPopBody', t('colRoles.title'), returnFocus);
}
function openExportPopup(returnFocus: HTMLElement): void {
  openPopupFrom('exportPopBody', t('export.title'), returnFocus);
}
function openMoreMenu(): void {
  const btn = $('btnVarMore');
  const r = btn.getBoundingClientRect();
  openMenu(r.left, r.bottom + 2, [
    { label: t('list.menuTiers'), onSelect: () => openTierPopup(btn), focusElsewhere: true },
    { label: t('list.menuExport'), onSelect: () => openExportPopup(btn), focusElsewhere: true },
    { label: t('list.menuExpandAll'), separatorBefore: true, onSelect: () => setAllExpanded(true) },
    { label: t('list.menuCollapseAll'), onSelect: () => setAllExpanded(false) },
  ], btn);
}

/* ---------- 변수 없는 값 찾기 → 레이어 › 연결(§4.6 예외 규칙은 PR 3) ---------- */
function findUnbound(): void {
  if (!curSel.count) { showStatusLine(t('status.noSelection'), { cls: 'warn' }); return; }
  // 진입 규칙(§4.6): 같은 선택의 결과가 있으면 / 실행 중이면 화면만, 연결할 변수가 없으면 안내만, 그 밖은 미리보기.
  const sameResult = hasBindPreview() && !!bindPreviewSel && sameIds(bindPreviewSel, curSel.ids) && !bindForeignSel;
  bindLeftSince = false; // 지금 들어가는 것이라 복귀 재계산 대상이 아니다
  showTab('layer');
  showApplyStep('bind');
  if (sameResult || bindBusy()) return;
  if (prereqKnown && !hasBindable) { renderBindPrereq(); return; }
  runBindPreview();
}

/* ---------- 리스너 ---------- */
$('btnVarRefresh').addEventListener('click', refreshList);
$('btnAddVar').addEventListener('click', () => showMake('color'));
$('btnVarMore').addEventListener('click', openMoreMenu);
$('btnFindUnbound').addEventListener('click', findUnbound);
$('btnSearch').addEventListener('click', () => (searchOpen ? ($('varSearch') as HTMLInputElement).focus() : openSearch()));
$('varSearch').addEventListener('input', () => { query = ($('varSearch') as HTMLInputElement).value; renderVarList(); });
$('varSearch').addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); clearSearch(); } });
$('btnSearchClear').addEventListener('click', () => clearSearch(true));
$('modeSelect').addEventListener('change', () => { modeName = ($('modeSelect') as HTMLSelectElement).value || null; renderVarList(); });
/* =====================================================================
   시작 화면(§4.3) · 마법사 위치 · 준비 현황 팝오버
   ===================================================================== */
/** 시작 화면 고정(①) — 로컬 변수 0개일 때 시작한 마법사가 실행 중이거나 그 요약이 보이는 동안. */
let wizLatch: { from: 'start' | 'make'; before: number; summarySeen: boolean; done: boolean } | null = null;
/** 이번 실행 시작 때 로컬 변수 수 — 완료 n = 전후 차이(만들기 맨 위, 로컬 변수 있음). */
let wizBeforeCount = 0;
let wizFrom: 'start' | 'make' = 'start';
function startLatched(): boolean {
  return !!wizLatch;
}
/** 마법사 카드(요소 1개)를 보이는 곳에 붙인다 — 만들기 하위 화면이면 맨 위, 아니면 시작 화면. */
function placeWizard(): void {
  const card = $('wizardCard');
  const inMake = activeTab === 'variables' && varSub === 'make';
  const slot = $(inMake ? 'wizardSlotMake' : 'wizardSlotStart');
  // 자리를 옮길 때만 기본 펼침을 정한다 — 다시 그릴 때마다 접으면 사용자가 펼친 것이 풀린다.
  // 만들기 쪽에서는 접힌 채, 실행 중이거나 요약이 있으면 펼친다.
  if (card.parentElement !== slot) {
    slot.appendChild(card);
    if (inMake) card.classList.toggle('collapsed', !wizardRunning && !wizHasSummary());
    else card.classList.remove('collapsed');
  }
  if (wizardRunning) card.classList.remove('collapsed');
  // 요약을 화면에서 봤다(①) — 끝난 뒤 카드가 실제로 보이면.
  const visible = activeTab === 'variables' && !isMini && (inMake || varScreen() === 'start');
  if (wizLatch && wizLatch.done && visible) wizLatch.summarySeen = true;
  renderWizardCopy();
}
const wizHasSummary = (): boolean => !!$('wizardSummary').textContent;

/** 마법사 카드 문구(§4.3 표) — 유료 / 무료(로컬 변수 0개) / 무료(로컬 변수 있음). */
function renderWizardCopy(): void {
  const hint = $('wizardCard').querySelector<HTMLElement>('[data-i18n="wizardCard.hint"]');
  // 마법사는 연결하지 않는다(§2.11) — 무료는 로컬 변수 수와 관계없이 이름 정리만.
  if (hint) hint.textContent = t(isPaid ? 'wizardCard.hintPaid' : 'wizardCard.hintFree');
  const btn = $('btnWizardRun') as HTMLButtonElement;
  if (!wizardRunning) btn.textContent = isPaid ? t(btn.dataset.rerun === '1' ? 'wizard.rerun' : 'wizardCard.run') : t('wizardCard.runFree');
  // 선택이 없으면 주 버튼은 aria-disabled, 누르면 상태 줄에 사유. 카드 안에도 안내(§4.1 — 선택 표시줄이 없다).
  if (!wizardRunning) setLock(btn, curSel.count ? null : 'prereq', t('status.noSelection'));
  $('wizNoSel').hidden = wizardRunning || !!curSel.count;
  renderWizToBind();
  // 완료 머리 — 로컬 변수 0개에서 시작했고 변수가 늘었을 때.
  const done = $('wizDone');
  const made = wizLatch && wizLatch.done ? localVarCount() - wizLatch.before : 0;
  if (made > 0) {
    $('wizDoneText').textContent = t('start.made', { n: made });
    done.hidden = false;
  } else done.hidden = true;
}

/** 시작 화면 내용 — 머리, 무료 안내, LIB 구역, 무료 표시. */
function renderStart(): void {
  const made = wizLatch && wizLatch.done ? localVarCount() - wizLatch.before : 0;
  $('startHead').textContent = made > 0 ? t('start.made', { n: made }) : t('start.head');
  $('startSub').hidden = made > 0;
  $('startFree').style.display = isPaid ? 'none' : '';
  $('goMakeFree').style.display = isPaid ? 'none' : '';
  const lib = $('startLib');
  clearMount(lib);
  // 시작 화면에는 상황 안내 표의 첫 행("목록 기준 다름")만 LIB 구역 위에(§4.4).
  if (baseDiffers()) lib.appendChild(situationEl(baseNoticeText(), [t('list.rebase'), () => doRebase(true)]));
  if (baseline && bigSkipped && !usageMap) {
    const d = document.createElement('div');
    d.className = 'situation';
    d.append(t('list.big'), ' ');
    const b = document.createElement('button');
    b.className = 'link link-btn';
    b.textContent = t('list.read');
    b.addEventListener('click', () => requestManagerUsage('user'));
    d.appendChild(b);
    lib.appendChild(d);
  } else {
    const rows = libRowsMatching();
    if (rows.length) {
      const h = document.createElement('div');
      h.className = 'vt-section vt-lib';
      h.textContent = t('list.libSection');
      const note = document.createElement('div');
      note.className = 'hint';
      note.textContent = t('start.libNote');
      lib.append(h, note, ...rows.map(libRowEl));
    }
  }
  renderWizardCopy();
}

/* ---------- 준비 현황 팝오버 ---------- */
function readinessDone(): number {
  return pipelineSteps({ hasColorVars, hasScaleVars, hasGlobal, hasBindable, hasDarkMode, hasTextStyles, hasSemanticRoles, hasBoundNodes, hasRenamedNodes }).filter((s) => s.status === 'done').length;
}
function renderReadinessButtons(): void {
  const label = t('list.readiness', { n: readinessDone(), total: 7 });
  for (const id of ['btnReadiness', 'btnReadinessStart']) $(id).textContent = label;
}
let readinessReturn: HTMLElement | null = null;
function openReadiness(btn: HTMLElement): void {
  if (!$('readinessPop').hidden) { closeReadiness(); return; }
  closeMenu();
  renderPipeline();
  const pop = $('readinessPop');
  pop.hidden = false;
  const r = btn.getBoundingClientRect();
  const w = pop.offsetWidth;
  pop.style.left = `${Math.max(4, Math.min(r.left, window.innerWidth - w - 4))}px`;
  pop.style.top = `${Math.min(r.bottom + 2, window.innerHeight - pop.offsetHeight - 28)}px`;
  readinessReturn = btn;
  btn.setAttribute('aria-expanded', 'true');
  pop.querySelector<HTMLElement>('.pstep')?.focus();
}
function closeReadiness(returnFocus = false): void {
  const pop = $('readinessPop');
  if (pop.hidden) return;
  pop.hidden = true;
  readinessReturn?.setAttribute('aria-expanded', 'false');
  if (returnFocus) readinessReturn?.focus();
  readinessReturn = null;
  reentry.release();
}
$('btnReadiness').addEventListener('click', () => openReadiness($('btnReadiness')));
$('btnReadinessStart').addEventListener('click', () => openReadiness($('btnReadinessStart')));
$('readinessPop').addEventListener('keydown', (e) => {
  const rows = Array.from($('readinessPop').querySelectorAll<HTMLElement>('.pstep'));
  const i = rows.indexOf(document.activeElement as HTMLElement);
  if (e.key === 'Escape') { e.preventDefault(); closeReadiness(true); }
  else if (e.key === 'ArrowDown') { e.preventDefault(); rows[(i + 1) % rows.length]?.focus(); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); rows[(i - 1 + rows.length) % rows.length]?.focus(); }
  else if (e.key === 'Tab') e.preventDefault();
});
document.addEventListener('pointerdown', (e) => {
  const pop = $('readinessPop');
  if (pop.hidden) return;
  const tgt = e.target as Node;
  if (pop.contains(tgt) || readinessReturn?.contains(tgt)) return;
  closeReadiness();
}, true);
$('btnWizListView').addEventListener('click', () => {
  wizLatch = null;
  showVarSub('home');
  renderVarScreen();
  $('varTree').querySelector<HTMLElement>('[data-key]')?.focus();
});
$('btnStartLicense').addEventListener('click', goToLicense);

/* =====================================================================
   레이어 › 연결(IA v3 §4.6)
   ===================================================================== */
/** 연결할 변수가 없을 때의 안내(4행)와 [찾기]·[연결]·[기존 스타일 연결] 잠금. */
function renderBindPrereq(): void {
  // 시작 직후 updateGates가 목록 상태보다 먼저 부를 수 있다 — 그때는 건너뛰고 첫 선택 상태에서 그린다.
  if (!curSel) return;
  const notice = $('bindPrereq');
  const text = notice.querySelector('.prereq-text') as HTMLElement;
  const act = $('bindPrereqAction') as HTMLButtonElement;
  let msg = '';
  let action: [string, () => void] | null = null;
  // 첫 전제 상태 전에는 '모름' — 경고를 띄우지 않고 막지도 않는다.
  if (prereqKnown && !hasBindable) {
    if (prereqLocalVars === 0) {
      // ②는 라이브러리 사용을 읽었을 때만. 모르면 유료/무료 행.
      if (layerLibUse === true) msg = t('bind.noLocalLib');
      else if (isPaid) { msg = t('bind.noVarsPaid'); action = [t('prereq.gotoCreate'), goToCreate]; }
      else { msg = t('bind.noVarsFree'); action = [t('status.paidAction'), goToLicense]; }
    } else {
      msg = t('bind.noTier');
      action = [t('bind.gotoTiers'), goToTiers];
    }
  }
  notice.style.display = msg ? '' : 'none';
  text.textContent = msg;
  act.hidden = !action;
  if (action) { act.textContent = action[0]; act.onclick = action[1]; }
  // 선택이 없을 때 세 버튼은 aria-disabled(누르면 사유).
  const noSel = !curSel.count;
  setLock($('btnApply'), noSel ? 'prereq' : msg ? 'prereq' : null, noSel ? t('status.noSelection') : msg);
  renderBindChrome(); // 단계 표시 · [연결] 잠금 · 빈 상태(안내가 보이면 숨김)
  // 기존 스타일 연결(무료) — 선택 없음 / 등록된 텍스트 스타일 없음.
  const ts = $('btnApplyExistingText');
  if (noSel) setLock(ts, 'prereq', t('status.noSelection'));
  else if (prereqKnown && !hasTextStyles) setLock(ts, 'prereq', t('bind.tsNone'));
  else setLock(ts, null);
}
/** 계층 지정하기 → 변수 › 목록 + 계층 팝업. */
function goToTiers(): void {
  showTab('variables');
  showVarSub('home');
  requestAnimationFrame(() => openTierPopup($('btnVarMore')));
}
/** ② 판정용 — 로컬 변수가 없고 선택이 300개 이하일 때만 라이브러리 사용을 읽는다. */
function readLayerLibUse(): void {
  // 연결할 변수가 없고 로컬 변수도 0개일 때만 필요하다(② 판정).
  if (!prereqKnown || hasBindable || prereqLocalVars > 0 || !curSel.count || curSel.scanned > BIG_SELECTION || layerLibUse !== null || layerLibReq) return;
  layerLibReq = ++bindReqSeq;
  send({ type: 'SCAN_USAGE', reqId: layerLibReq, nodeIds: curSel.ids });
}

/** 다른 탭에서 돌아오거나 창에 다시 들어올 때(§4.6 ⑧). 순서: 최소화 중 결과 → 다른 선택 → 이 화면의 선택 → 조용한 재계산/안내. */
function bindOnReturn(): void {
  if (activeTab !== 'layer' || currentApplyStep !== 'bind' || !hasBindPreview()) return;
  if (bindPreviewMini) { bindPreviewMini = false; return; }
  const notice = $('bindNotice');
  if (bindForeignSel || (bindPreviewSel && !sameIds(bindPreviewSel, curSel.ids))) {
    bindForeignSel = true;
    $('bindNoticeText').textContent = t('bind.otherSel');
    notice.hidden = false;
    renderBindPrereq(); // 단계 표시 "지금 찾기" · [연결] 잠금
    return;
  }
  if (bindHereSel) { bindHereSel = false; return; }
  if (!bindLeftSince) return;
  bindLeftSince = false;
  if (curSel.scanned > BIG_SELECTION) {
    $('bindNoticeText').textContent = t('bind.maybeChanged');
    notice.hidden = false;
    return;
  }
  runBindPreview(true);
}
document.documentElement.addEventListener('pointerleave', () => { if (hasBindPreview()) bindLeftSince = true; });
window.addEventListener('blur', () => { if (hasBindPreview()) bindLeftSince = true; });

/** 연결 미리보기·연결이 실행 중인가. */
const bindBusy = (): boolean => opPending.has('APPLY') || opPending.has('APPLY_SELECTED');

/* ---------- 첫 화면 — 변수 탭(IA v3) ----------
   파일 맨 끝에서 부른다: 첫 화면이 변수 관리를 그리고 사용 수를 읽으므로, 그 상태 변수가 모두 선언된 뒤여야 한다.
   처음 한 번은 탭이 '바뀌지' 않으므로 activeTab을 비켜 두어 들어올 때 읽기가 돌게 한다. */
activeTab = 'settings';
showTab('variables');
