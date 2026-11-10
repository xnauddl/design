/* ============================================================
   ui.ts — iframe UI 로직 (postMessage 송수신, 폼 상태)
   ============================================================ */
import type { UiToCode, CodeToUi, RenameNode, BindCandidate, BindSkip, ComponentCandidate, VarUpdateError, TokenState, RoleRow, ExistingStyleSig } from './shared/messages';
import { type DraftToken, type Unit, tidyNumberTokens } from './lib/tokens';
import { t, hasString } from './lib/i18n';
import { isHexColor } from './lib/bindDisplay';
import { placeKey, carryRowChecks, groupByVarKind, type RowGroup } from './lib/bindGroups';
import { type TextStyleSpec, rampToSpecs, tsSig } from './lib/textStyles';
import { headState, headToggleTarget, mergeSameNameTokens, buildRenameTree, type RenameTreeItem } from './lib/treeState';
import { renderTree, focusRow, type TreeItem } from './treeList';
import { type Tier } from './lib/entitlements';
import { extractSignedToken, pickInstanceId, type VerifyResult } from './lib/license';
import { base64UrlToString, verifyLicenseToken } from './lib/licenseToken';
import { VERIFY_URL, PLUGIN_ID, LICENSE_ISS, LICENSE_AUD, LICENSE_ALG, LICENSE_PUBLIC_JWK, licenseLinksConfigured, licenseVerifyConfigured } from './lib/licenseConfig';
import { exportHasTokens, cssVarName, type ExportFormat } from './lib/exporters';
import { leafName, tierBadge, tierWhyText, sidebarCollections, paletteGroups, sideSelKey, normalizeVarName, nameError, groupMove, cssRename, sameCell, colorText, parseColorInput, parseNumberInput, cellInputText, resolveEditValue, aliasCandidates, type SideSel, type VarCell, type VarCollection, type VarRow, type LibraryVar, type EditValue, type PaletteGroup } from './lib/varTable';
import { varKind, APPLY_TARGETS, targetAllowed, scopeFits, scopesForNew, FREE_MANUAL_CREATE_LIMIT, type ApplyTarget } from './lib/varKind';
import { createReentryScheduler } from './lib/reread';
import type { FrameMeta } from './lib/similar';
import type { VarInfo } from './shared/messages';
import { generatePalette, paletteToDraftTokens, paletteSemanticMap, type Harmony } from './lib/palette';
import { nameColorsByHue } from './lib/colorName';
import { suggestTokenRoles, mergeTokenRoles, semanticMapToText, textToSemanticMap } from './lib/roles';
import { pipelineSteps, type PipelineStep } from './lib/pipeline';
import { explainError, type FriendlyError } from './lib/errors';
import { nextTabIndex } from './lib/a11y';
import { planMake, makeDoneText, pickDarkTarget, MAKE_STEP_ORDER, type MakeStepId, type MakeTotals } from './lib/wizard';
import { cardCounts, fieldKind, SEL_KINDS, NO_VAR_REASONS, FIX_SKIP_REASONS, LAYER_SKIP_REASONS, INFO_SKIP_REASONS, type CardCounts, type ReasonCounts, type SelKind } from './lib/selCards';

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
 * 연결 중(§4.6 "찾기 · 연결의 수") — 그 연결(APPLY_SELECTED)의 reqId, 아니면 0.
 * 보낼 때 세우고, 그 reqId의 APPLY_RESULT나 op: 'APPLY_SELECTED'인 ERROR에서 내린다.
 * opPending은 쓰지 않는다 — 다른 작업의 ERROR가 오면 opReceived가 통째로 비운다.
 * 초기화 중 setLock이 읽으므로 맨 위에 둔다.
 */
let bindLinking = 0;
/** 연결 중에 사용자가 선택을 바꿨다 — 결과 지우기를 미뤄 뒀다(연결이 성공하면 결과 카드, 아니면 그때 지운다). */
let bindSelChangedDuringLink = false;
/** 마지막으로 보낸 연결 자리 — 연결 오류의 [다시 시도]가 쓴다(lastSentMsg는 그 뒤 다른 요청으로 바뀔 수 있다). */
type LinkJob = { items: Extract<UiToCode, { type: 'APPLY_SELECTED' }>['items']; textStyles: { styleId: string; nodeIds: string[] }[] };
let lastLinkItems: LinkJob | null = null;
/**
 * SELECT_NODES를 부른 자리의 상태 줄. 레이어 선택은 적용 탭의 스킵 칩만 쓰던 기능이라
 * 결과를 #applyStatus에 고정으로 썼는데, 타이포 단계의 ×N 배지도 같은 메시지를 쓰면서
 * ‘상한 200개에 잘렸다’는 경고가 다른 탭에 적혀 사용자에게 닿지 않는다 — 부른 쪽이 지정한다.
 */
let selectStatusTarget = 'applyStatus';
/** 레이어 선택 요청 — 결과 경고가 돌아올 자리를 함께 기억한다. */
function selectNodes(ids: string[], statusId: string): void {
  selectStatusTarget = statusId;
  if (statusId === 'applyStatus' && activeTab === 'select') bindLayerSelectPending = true; // 사유 칩·레이어 머리
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

/** 여백 토큰을 격자 8 사다리로 스냅(#19). 미리보기 직전에 호출. 크기는 옮기지 않는다(§2.11). */
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
 * 값을 고칠 수 있는 행인가 — 텍스트를 못 찾아 채운 기본 램프.
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
    // 램프 행은 셀 글자가 없다 — 대신 지울 수 있어야 한다.
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
  // 표에서 세므로 줄 삭제가 바로 반영된다(스캔 시점 스냅샷이던 옛 상태줄의 문제).
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

/** 등록에 넘길 스펙 — 이름이 빈 행은 뺀다. */
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

/** 마지막 스캔에 실어 보낸 nodeIds(§4.3 "타이포 등록") — [등록]의 바로 연결 대상. */
let tsScanIds: string[] | null = null;
$('btnScanText').addEventListener('click', () => {
  // 기준 nodeIds, 없으면 지금 선택, 둘 다 없으면 nodeIds 없이(코드가 선택을 읽음).
  const ids = baseline?.ids.length ? baseline.ids : curSel.ids.length ? curSel.ids : null;
  tsScanIds = ids ? ids.slice() : null;
  send(ids ? { type: 'SCAN_TEXT_STYLES', nodeIds: ids } : { type: 'SCAN_TEXT_STYLES' });
  renderTsLink();
});
/** [✓] 레이어에 바로 연결 — 기억한 nodeIds가 없으면 잠금. */
function renderTsLink(): void {
  setLock($('tsLinkNow') as HTMLInputElement, tsScanIds ? null : 'prereq', t('textStyle.linkNeedScan'));
}
// 스캔 후 액션 — 눌러야 생기는 이름이라, 스캔이 표를 채우기 전엔 잠가 둔다(TEXT_STYLE_CANDIDATES에서 해제).
$('btnTsRowLabels').addEventListener('click', () => {
  setStatus('tsStatus', t('textStyle.renaming'), 'ok');
  send({ type: 'NAME_TEXT_STYLES_BY_ROW' });
});
$('btnTextStyles').addEventListener('click', () => {
  const styles = readTextStyleRows();
  if (!styles.length) {
    setStatus('tsStatus', t('textStyle.needSpecs'), 'warn');
    return;
  }
  // 바로 연결(§4.3 "타이포 등록", 2026-11-10 A+C) — 켜져 있고 스캔 대상이 있으면 등록하면서 그 글자에 붙인다.
  const link = ($('tsLinkNow') as HTMLInputElement).checked && !!tsScanIds;
  send(link ? { type: 'CREATE_TEXT_STYLES', styles, applyTo: tsScanIds! } : { type: 'CREATE_TEXT_STYLES', styles });
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
/** 변수 찾기 · 텍스트 스타일 미리보기 응답을 기다린다 — 둘 다 오면 결과를 그린다(§4.2). */
let bindVarPending = false;
/** 연결 화면에 들어왔고 첫 스위치 포커스를 기다린다(§4.2). */
let bindFocusPending = false;
/** 찾기가 오류로 끝났다 — 빈 상태 글을 띄우지 않는다(오류 줄이 말한다). */
let bindFindFailed = false;
let bindTsPending = false;
/** 찾기 실행 — 변수 찾기(APPLY preview) + 텍스트 스타일 미리보기. silent = 조용한 읽기(§7) — 진행률 · 테두리 없이. */
function runBindPreview(silent = false): void {
  bindFindFailed = false;
  bindHereSel = false;
  bindLeftSince = false;
  // 찾기 대상 = 목록 기준(IA v4 §2.5) — 플러그인이 만든 선택이어도 기준으로 센다.
  const base = baseline ?? curSel;
  // noTier — 변수 찾기는 하지 않고 텍스트 스타일만(§4.2). 로컬 변수 0개는 찾는다(④ 카드의 종류별 수).
  const doVars = !(prereqKnown && !hasBindable && prereqLocalVars > 0);
  if (!silent && doVars) {
    bindFinding = true;
    showApplyProgress(t('bind.finding')); // UX6
  }
  const reqId = nextBindReq();
  bindSilentReq = silent ? reqId : 0;
  bindSilentCarry = silent && !!bindPreviewSel && sameIds(bindPreviewSel, base.ids);
  if (!bindSilentCarry) bindTsOff.clear(); // 다른 기준 — 끈 스타일 줄을 이어받지 않는다
  bindVarPending = doVars;
  bindTsPending = true;
  bindTsReq = reqId;
  // 텍스트 스타일 미리보기를 먼저 보낸다 — [다시 시도]가 가리키는 마지막 요청이 찾기(APPLY)가 되게.
  send({ type: 'PREVIEW_TEXT_STYLES', reqId, nodeIds: base.ids });
  if (doVars) {
    opSilent = silent;
    send({ type: 'APPLY', preview: true, reqId, nodeIds: base.ids });
    opSilent = false;
  } else {
    bindCandidates = [];
    bindCounts = undefined;
    bindSkips = [];
    bindSkipsCapped = false;
    bindSkipReasons = {};
  }
  bindPreviewSel = base.ids.slice();
  renderBindChrome();
}
/** 두 응답이 다 왔다 — 결과를 그리고 카드 1을 맞춘다. */
function bindFindSettle(): void {
  if (bindVarPending || bindTsPending) return;
  bindPreviewed = true;
  selFindFor = bindPreviewSel ? bindPreviewSel.join(',') : null;
  selFindInFlight = false;
  renderBindTree();
  // 텍스트 스타일만 모습에서 후보가 없으면 첫 화면으로(§4.2 상태표).
  if (activeTab === 'select' && selSub === 'bind' && bindTsOnly() && !bindTsRows.length) showSelSub('home');
  renderSelHome();
}

$('btnApplyConfirm').addEventListener('click', () => {
  // #6: 켠 변수의 곳만 직접 연결(WYSIWYG). 플러그인이 각 자리를 다시 확인한다.
  const eff = bindTsOnly() ? [] : effCandidates();
  const items = eff
    .filter((c) => bindChecked.has(candKey(c)))
    .map((c) => ({ nodeId: c.nodeId, field: c.field, index: c.index, variableId: c.variableId, ...(c.newRole ? { newRole: c.newRole } : {}) }));
  const textStyles = bindTsRows.filter((r) => !bindTsOff.has(r.styleId)).map((r) => ({ styleId: r.styleId, nodeIds: r.nodeIds }));
  if (!items.length && !textStyles.length) return;
  startLink({ items, textStyles });
});
/** 연결 보내기 — 진행 줄을 열고 "연결 중" 플래그를 세운다(§4.6 "찾기 · 연결의 수"). [다시 시도]도 이 길로. */
function startLink(job: LinkJob): void {
  if (bindLinking) return;
  // [다시 시도]는 버튼 잠금을 거치지 않는다 — 같은 사유로 여기서 막는다(다른 쓰기 작업 중 → [🔗 연결] 전제).
  const other = otherWriteOp();
  if (other) { setStatus('applyStatus', t('bind.waitOp', { op: other }), 'warn'); return; }
  updateBindApply();
  const confirm = $('btnApplyConfirm');
  if (isLocked(confirm)) { setStatus('applyStatus', confirm.dataset.lockMsg ?? '', 'warn'); return; }
  lastLinkItems = job;
  bindFinding = false;
  // 첫 진행 메시지 전에는 "연결 중…", 그 뒤로 "연결 중… {done} / {total}".
  // 연결은 중간에 멈추지 않으므로 [취소]를 숨긴다.
  showApplyProgress(t('bind.linking'), false);
  const reqId = nextBindReq();
  bindLinking = reqId;
  send({ type: 'APPLY_SELECTED', items: job.items, ...(job.textStyles.length ? { textStyles: job.textStyles } : {}), reqId });
  onBindLinkingChanged();
}
/** 연결이 결과 카드 없이 끝났다(오류 · 버린 응답) — 연결 중에 미뤄 둔 선택 변경의 지우기를 이제 한다. */
function flushLinkSelClear(): void {
  if (!bindSelChangedDuringLink) return;
  bindSelChangedDuringLink = false;
  nextBindReq();
  hideApplyProgress();
  clearBindPreview();
}


$('btnApplyCancel').addEventListener('click', () => {
  send({ type: 'CANCEL' }); // UX6: 취소 요청
  setStatus('applyStatus', t('apply.cancelRequested'), 'warn');
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

let wizardWaiter: { types: string[]; reqId?: number; resolve: (m: CodeToUi) => void; reject: (e: Error) => void } | null = null;
/** 마법사 연결 요청의 reqId — 메인 처리기는 이 결과로 연결 화면을 다시 그리지 않는다(§4.3). */
let wizBindReq = 0;
/** 마법사 연결이 응답을 기다리는 중. */
let wizBindPending = false;

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
  if (wizardWaiter.types.includes(m.type) && (wizardWaiter.reqId === undefined || (m as { reqId?: number }).reqId === wizardWaiter.reqId)) {
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
function wizardRequest<T extends CodeToUi['type']>(msg: UiToCode, expect: T[], reqId?: number): Promise<Extract<CodeToUi, { type: T }>> {
  return new Promise<Extract<CodeToUi, { type: T }>>((resolve, reject) => {
    wizardWaiter = {
      types: [...expect],
      reqId,
      resolve: (m) => resolve(m as Extract<CodeToUi, { type: T }>),
      reject,
    };
    send(msg);
  });
}

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
}

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
  reapplyWaitTip(el);
}
/** 툴팁을 새로 쓴 뒤 — 연결 중 대기 꼬리가 있었으면 다시 붙인다(§4.6 "연결 중의 다른 일"). */
function reapplyWaitTip(el: HTMLElement): void {
  if (!el.dataset.wait) return;
  delete el.dataset.waitTail;
  setWait(el, el.dataset.wait, el.dataset.waitTarget ?? '');
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
  showPick('token'); // 토큰 생성은 '토큰' 단계에 있다 — 단계를 안 맞추면 빈 화면으로 보낸다
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
  bind: { make: null, btn: 'btnApplyConfirm' }, // 선택 탭 첫 화면
  rename: { make: null, btn: 'btnRename', apply: 'rename' }, // 적용 탭 · 이름 정리
};

function gotoStep(id: PipelineStep['id']): void {
  closeReadiness();
  const target = PIPELINE_TARGET[id];
  if (id === 'semantics') showStatusLine(t('list.semanticsNote'));
  if (target.make === null) {
    // v4 §4.6 준비 현황 표: 연결 → 선택 탭 첫 화면, 이름 → 이름 정리(선택이 없으면 첫 화면).
    showTab('select');
    showSelSub(target.apply === 'rename' && curSel.count ? 'rename' : 'home');
    if (selSub === 'home') { $('selCards').querySelector<HTMLElement>('button')?.focus(); return; }
  } else {
    showPick(target.make, 'vars');
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
  // 대상은 플러그인 Semantic 하나뿐(§2.13 13.7) — 사용자 Semantic의 모드는 건드리지 않는다.
  const cols = new Map<string, VarInfo>();
  for (const v of allVars) if (v.owned === 'semantic' && !cols.has(v.collectionId)) cols.set(v.collectionId, v);
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
    } else if (allVars.length === 0 || !allVars.some((v) => v.owned === 'semantic')) {
      // 플러그인 Semantic이 없으면 만들기부터(§4.5 "토큰 만들기로 →").
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
      // [재사용] 줄의 이름은 기존 컴포넌트 것이다 — 보내지 않는다. [등록] 판정이 재사용이 아니면 code 쪽이
      // 숫자 접미사 규칙으로 새 이름을 정한다(§4.7 "재사용" 7번 — 같은 이름이 둘 생기지 않게).
      if (c.reuse) continue;
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
  if (makeTakes(msg)) return; // 만들기 화면의 reqId 응답(§4.3) — 값을 직접 고르기 처리기를 건드리지 않는다
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
        // 단 연결 중에는 진행 줄과 결과를 그대로 둔다 — 마지막 APPLY_RESULT가 결과 카드를 그린다(§4.6 "연결 중의 다른 일").
        if (!bindLinking) {
          nextBindReq();
          hideApplyProgress();
          clearBindPreview();
        } else bindSelChangedDuringLink = true; // 연결이 결과 없이 끝나면 그때 지운다
        layerLibUse = null; // 라이브러리 사용 여부는 새 선택으로 다시 읽는다(§4.6 ②)
        if (activeTab === 'select') readLayerLibUse();
      } else if (bindLayerSelectPending) {
        bindHereSel = true; // 이 화면이 만든 선택(사유 칩·레이어 머리) — 복귀해도 아무것도 하지 않는다
      }
      // v4 §2.5: 플러그인이 만든 선택은 기준을 바꾸지 않는다 — 기준으로 센 찾기 결과는 그대로 유효하다.
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
      if (msg.op === 'bind' && !wizBindPending) updateApplyProgress(msg.done, msg.total); // UX6 — 마법사 연결의 진행은 연결 화면에 띄우지 않는다(§4.3)
      else if (msg.op === 'link' && bindLinking) updateLinkProgress(msg.done, msg.total);
      break;
    case 'APPLY_RESULT': {
      // 연결이 끝났다 — 잠금을 푼다(화면을 그리는지와 무관하게).
      const linkEnded = bindLinking !== 0 && msg.reqId === bindLinking;
      if (linkEnded) bindLinking = 0;
      if (msg.reqId !== undefined && msg.reqId === wizBindReq) break; // 마법사 연결 — 마법사가 받는다(§4.3)
      if (!isCurrentBindReply(msg.reqId)) {
        // 선택이 바뀐 뒤 도착한 이전 요청의 결과
        if (linkEnded) { flushLinkSelClear(); onBindLinkingChanged(); }
        break;
      }
      if (linkEnded) bindSelChangedDuringLink = false; // 결과 카드를 그린다 — 미뤄 둔 지우기는 하지 않는다
      hideApplyProgress(); // UX6
      const silent = msg.preview && msg.reqId !== undefined && msg.reqId === bindSilentReq;
      bindSilentReq = 0;
      if (isMini && msg.preview) bindPreviewMini = true; // 최소화 중에 끝난 미리보기 — 펼쳐도 다시 계산하지 않는다
      bindSkips = msg.skips ?? [];
      // 스킵 목록은 상한에서 잘린다(bind.ts SKIP_PREVIEW_CAP) — 잘렸으면 칩 툴팁이 그렇다고 말한다.
      bindSkipsCapped = (msg.skipTotal ?? bindSkips.length) > bindSkips.length;
      if (msg.cancelled) {
        // 읽기 취소(§4.2 상태표) — "읽기를 취소했어요 · [다시 읽기]".
        clearBindPreview();
        bindVarPending = false;
        bindTsPending = false;
        selFindInFlight = false;
        setStatus('applyStatus', t('v4.readCancelled'), 'warn');
        showStatusLine(t('v4.readCancelled'), { cls: 'warn', action: { label: t('v4.reread'), run: () => readSelFind(true, true) } });
      } else if (msg.preview) {
        // 찾은 곳을 변수 카드로. 처음에는 모든 변수를 켠다.
        const prev = bindCandidates;
        const prevChecked = new Set(bindChecked);
        bindCandidates = msg.candidates ?? [];
        bindCounts = msg.counts as ReasonCounts | undefined;
        bindVarPending = false;
        bindChecked.clear();
        renderSkipReasons(msg.reasons ?? {});
        if (silent) {
          // 조용한 재계산: 스위치는 변수 단위로 이어받고, 달라졌을 때만 알린다(§4.6 ⑧). 건너뜀 펼침은 그대로.
          const r = carryRowChecks(prev, prevChecked, bindCandidates);
          for (const k of r.checked) bindChecked.add(k);
          if (bindSilentCarry && (r.added || r.removed)) showStatusLine(t('bind.candChanged', { a: r.added, b: r.removed }));
        } else {
          bindSkipsOpen = false;
          for (const c of bindCandidates) bindChecked.add(candKey(c));
        }
        setStatus('applyStatus', '', '');
        bindFindSettle();
      } else {
        // 연결 후(§4.2) — 첫 화면으로 돌아오고 상태 줄 "🔗 {n}곳 연결 · ⌘Z로 되돌리기"(+ 건너뜀). 카드는 다시 읽는다.
        const n = msg.bound + (msg.textStylesApplied ?? 0);
        const m = msg.skipped + (msg.textStylesSkipped ?? 0);
        clearBindPreview();
        setStatus('applyStatus', '', '');
        if (activeTab === 'select' && selSub === 'bind') showSelSub('home');
        showStatusLine(t('v4.linked', { n }) + (m ? t('v4.linkedSkipped', { m }) : ''), { cls: 'ok' });
        selFindFor = null;
      }
      if (linkEnded) onBindLinkingChanged();
      if (!msg.preview) { selFindInFlight = false; renderSelHome(); }
      break;
    }
    case 'DELETED_UNBOUND':
      onDeletedUnbound(msg);
      break;
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
    case 'VARIABLE_APPLIED':
      onVariableApplied(msg);
      break;
    case 'VARIABLE_CREATED':
      onVariableCreated(msg);
      break;
    case 'VARIABLE_DUPLICATED':
      onVariableDuplicated(msg);
      break;
    case 'VARIABLE_DELETED':
      onVariableDeleted(msg);
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
          (msg.missing.length ? t('semantic.missing', { names: msg.missing.join(', ') }) : '') +
          (msg.skippedManual ? t('create.sumManual', { n: msg.skippedManual }) : ''),
        msg.missing.length ? 'warn' : 'ok',
      );
      semStatusPrefix = '';
      break;
    case 'TEXT_STYLE_CANDIDATES': {
      // 「왼쪽 글자로 이름 채우기」는 스캔이 실제 표본을 물어왔을 때만 누를 것이 있다.
      // 램프 폴백(styles 0)은 캔버스에서 온 글자가 아니라 행 라벨을 찾을 데가 없다.
      ($('btnTsRowLabels') as HTMLButtonElement).disabled = !msg.styles.length;
      if (msg.styles.length) {
        tsSpecs = msg.styles.map((x) => ({ ...x }));
        // 이름 출처는 「왼쪽 글자로 이름 채우기」를 누른 뒤에만 적는다 — 맨 스캔은 전부 크기 순이라
        // `왼쪽 글자 0`이 실패처럼 읽힌다. 와이어 상태 줄: 신규 · 등록됨 · 왼쪽 글자 · 크기 순.
        tsScanNote = {
          namePart: msg.labeled != null ? t('textStyle.nameSplit', { a: msg.labeled, b: msg.fallback ?? 0 }) : '',
          warnings: msg.warnings,
        };
        renderTextStyles(); // 상태줄까지 여기서 쓴다
      } else {
        tsSpecs = rampToSpecs(DEFAULT_TS_FAMILY);
        tsScanIds = null; // 기본 램프 — 붙일 글자가 없다
        renderTsLink();
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
          (msg.applied ? t('textStyle.linkedN', { a: msg.applied }) : '') +
          (msg.applySkipped ? t('textStyle.linkSkipped', { k: msg.applySkipped }) : '') +
          // 알림은 경고와 분리 — 행간 %처럼 '의도된 미바인딩'을 미연결로 적으면 정상 동작이 경고로 읽힌다.
          (msg.notes.length ? ` · ${msg.notes.join(' · ')}` : '') +
          (msg.missing.length ? t('textStyle.unlinked', { names: msg.missing.join(', ') }) : ''),
        msg.missing.length ? 'warn' : 'ok',
      );
      break;
    case 'TEXT_STYLES_PREVIEW': {
      // 텍스트 스타일 미리보기(§4.2) — 같은 찾기 차례의 응답만.
      if (msg.reqId !== bindTsReq || msg.reqId !== bindLatest) break;
      bindTsRows = msg.rows;
      bindTsSkips = { ...msg.skipReasons };
      // 사라진 스타일 줄의 끔은 잊는다.
      const ids = new Set(bindTsRows.map((x) => x.styleId));
      for (const id of [...bindTsOff]) if (!ids.has(id)) bindTsOff.delete(id);
      bindTsPending = false;
      renderSkipReasons(bindSkipReasons);
      bindFindSettle();
      break;
    }
    case 'COLLECTIONS':
      // 존재 확인용 프로브(별도 UI 없음).
      break;
    case 'PREREQ_STATE':
      // #11: 단계 전제 갱신 → 통합 게이트 재평가 + 진행 안내(§3).
      prereqKnown = true;
      prereqInFlight = false;
      if (typeof msg.manualUsed === 'number') manualUsed = msg.manualUsed;
      reentry.release();
      hasColorVars = msg.hasColorVars;
      hasScaleVars = msg.hasScaleVars;
      hasGlobal = msg.hasGlobal;
      hasBindable = msg.hasBindable;
      prereqLocalVars = (msg.tierVars ?? 0) + (msg.otherVars ?? 0);
      if (activeTab === 'select') queueMicrotask(readLayerLibUse); // 로컬 변수 0개가 확인되면 ② 판정용으로 읽는다
      hasDarkMode = msg.hasDarkMode;
      hasTextStyles = msg.hasTextStyles;
      hasSemanticRoles = msg.hasSemanticRoles;
      updateGates();
      applySelectionDone(); // renderPipeline 포함 — 변수 유무가 '처음/다시' 판정을 바꾼다
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
      // #1: 하위 등록 후보를 트리로. 기본 체크는 code.ts가 정한 `defaultOn`만 본다(§4.7 "묶기" 6번 —
      // 반복 이름 · 속성 접힘 · 버튼 · 칩 · 탭). 잡음(컨테이너/래퍼 단발성)은 체크 해제 상태로 둔다.
      compCandidates = msg.nodes;
      compChecked.clear();
      for (const c of msg.nodes) if (c.eligible && c.defaultOn) compChecked.add(c.id);
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
      const reused = msg.reused ?? [];
      const reuseKept = msg.reuseKept ?? [];
      // 컴포넌트 수 = 새로 만든 맨 위 단위(세트 + 단일, §4.7 6번 "세는 단위"). 단일은 괄호 안에만 쓴다.
      // 건너뜀 = 컴포넌트로 만들지 못한 대상 수(§4.7 6번 · 용어 §2.9). 자리 결과는 꼬리 두 개로 따로 센다.
      const extraPart =
        (msg.skipped ? t('component.extraSkipped', { n: msg.skipped }) : '') +
        reusedText(reused) +
        (msg.exposed ? t('component.extraProps', { n: msg.exposed }) : '') +
        (msg.icons ? t('component.extraIcons', { n: msg.icons }) : '') +
        placeTailText('component.propFailed', propFailed) +
        placeTailText('component.fillKept', fillKept) +
        placeTailText('component.reuseKept', reuseKept) +
        placeTailText('component.placeCloned', cloned) +
        placeFailedText(misplaced);
      // 속성 값을 못 넣었거나(6번) 원본을 그대로 뒀거나 복사본으로 채웠거나 비운 자리(5번)가 있으면 성공이어도 경고(§4.7 "인스턴스 자리").
      // 등록 · 세트 · 재사용 중 하나라도 있으면 성공(꼬리가 있으면 경고 — §4.7 "재사용" 6번).
      setStatus('structureStatus', t('component.registered', { total: msg.sets + msg.singles.length, sets: msg.sets, singles: msg.singles.length, extraPart }), (msg.registered || msg.sets || reused.length) && !misplaced.length && !cloned.length && !propFailed.length && !fillKept.length && !reuseKept.length ? 'ok' : 'warn');
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
      if (onVarOpError(msg)) break;
      if (msg.op === 'PREVIEW_TEXT_STYLES') {
        // 텍스트 스타일 미리보기 실패 — 변수 연결은 막지 않는다(스타일 줄 없이 그린다).
        if (bindTsPending) { bindTsPending = false; bindTsRows = []; bindTsSkips = {}; bindFindSettle(); }
        break;
      }
      if (msg.op === 'APPLY' && bindVarPending) {
        // 찾기 실패 — "읽는 중"에 멈추지 않게. 오류 줄 + [다시 시도]가 연결 화면에 뜬다.
        bindVarPending = false;
        bindFindFailed = true;
        selFindInFlight = false;
        renderSelHome();
      }
      // UX7: 실패한 작업 영역에 친절한 메시지 + 복구 행동 + (가능하면) 다시 시도.
      // 레이어 선택은 부른 자리가 여럿이라 표를 못 쓴다 — 마지막으로 부른 쪽을 따른다.
      const statusId = msg.op === 'SELECT_NODES'
        ? selectStatusTarget
        : resolveStatusId((msg.op && OP_STATUS[msg.op]) || 'colorStatus');
      if (msg.op === 'APPLY') hideApplyProgress();
      if (msg.op === 'APPLY_SELECTED' && bindLinking) {
        // 연결 실패 — 진행 줄을 닫고 잠금을 푼다(ERROR에는 reqId가 없지만 연결은 한 번에 하나뿐).
        bindLinking = 0;
        hideApplyProgress();
        flushLinkSelClear();
        onBindLinkingChanged();
      }
      showError(statusId, explainError(msg.message), msg.op);
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
  PREVIEW_TEXT_STYLES: 'applyStatus',
  APPLY: 'applyStatus',
  APPLY_SELECTED: 'applyStatus', // 연결 오류도 연결 카드에(§4.6 "연결 중의 다른 일")
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

function showError(id: string, f: FriendlyError, op?: string): void {
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
  // [다시 시도] — 연결 오류는 마지막 연결 자리(lastLinkItems)로 연결 길을 다시 탄다(§4.6 "연결 중의 다른 일").
  // 오류의 종류가 마지막 요청과 다르면 무엇을 다시 할지 모르므로 숨긴다.
  const linkRetry = op === 'APPLY_SELECTED' ? lastLinkItems : null;
  const retry = linkRetry ? null : op && lastSentMsg && op !== lastSentMsg.type ? null : lastSentMsg;
  if (f.retryable && (linkRetry || retry)) {
    const btn = document.createElement('button');
    btn.className = 'primary';
    btn.textContent = t('common.retry');
    btn.addEventListener('click', () => {
      if (linkRetry) { startLink(linkRetry); return; }
      if (!retry) return;
      // 연결 중에는 쓰기 작업을 다시 보내지 않는다.
      if (bindLinking && OPS[retry.type]?.write) { setStatus(id, t('bind.waitLink'), 'warn'); return; }
      send(retry);
    });
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
  badge?: { text: string; kind: 'set' | 'single' | 'reuse' };
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

/* ---------- 이름 정리(IA v4 §4.4): 소속 트리 + [k개 이름 바꾸기] ---------- */
let renameNodes: RenameNode[] = []; // 마지막 미리보기 서브트리
/** 끈 바꿀 줄(레이어 id) — 같은 레이어면 다시 읽어도 꺼진 채 이어받는다. */
const renameOff = new Set<string>();
const renameCollapsed = new Set<string>();
let renameTreeFresh = true;
/** 이 화면의 미리보기 · 바꾸기 reqId — 맞는 응답만 받는다. */
let renameReq = 0;
let renameApplyReq = 0;
/** 미리보기를 만든 기준(baseKey) · 읽는 중 · 미리보기를 받았나. */
let renameFor: string | null = null;
let renameReading = false;
let renameTimer: ReturnType<typeof setTimeout> | null = null;

const renameRows = (): RenameNode[] => renameNodes.filter((n) => n.after !== undefined);
const renameOnCount = (): number => renameRows().filter((n) => !renameOff.has(n.id)).length;

/** 미리보기 다시 하기(조용한 읽기 · 300개 규칙 — §2.6). user = [읽기]. */
function readRename(user = false): void {
  if (renameTimer) { clearTimeout(renameTimer); renameTimer = null; }
  if (!baseline || isMini || activeTab !== 'select' || selSub !== 'rename') { renderRenameScreen(); return; }
  if (!user && baseline.scanned > BIG_SELECTION) { renameFor = null; renameNodes = []; renderRenameScreen(); return; }
  if (opBusy() || wizardRunning) return; // 쓰기 중 — 끝난 뒤 작업 직후 다시 읽기가 부른다
  renameReq = ++bindReqSeq;
  renameReading = true;
  opSilent = !user;
  send({ type: 'RENAME', apply: false, maxDepth: readMaxDepth(), nodeIds: baseline.ids, reqId: renameReq });
  opSilent = false;
  renderRenameScreen();
}
function scheduleRename(): void {
  if (renameTimer) clearTimeout(renameTimer);
  renameTimer = setTimeout(() => { renameTimer = null; readRename(); }, AUTO_SCAN_DELAY);
}

function renderRenameScreen(): void {
  const empty = $('renameEmpty');
  clearMount(empty);
  let text = '';
  let action: [string, () => void] | null = null;
  if (!baseline) { text = t('v4.noSel'); action = [t('v4.backHome'), subBack]; }
  else if (renameFor !== baseKey() && !renameReading && baseline.scanned > BIG_SELECTION) { text = t('list.big'); action = [t('list.read'), () => readRename(true)]; }
  else if (renameReading && renameFor !== baseKey()) text = t('v4.reading');
  else if (!renameRows().length) text = t('rename.none');
  empty.hidden = !text;
  if (text) {
    const d = document.createElement('div');
    d.className = 'be-text';
    d.textContent = text;
    empty.appendChild(d);
    if (action) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'link link-btn';
      b.textContent = action[0];
      b.addEventListener('click', action[1]);
      empty.appendChild(b);
    }
  }
  const show = !text;
  $('renameTop').hidden = !show;
  const roots = show ? buildRenameTree(renameNodes) : [];
  const toItem = (it: RenameTreeItem): TreeItem => {
    const children = it.children.map(toItem);
    if (it.kind === 'head') {
      const st = headState(it.descendants.map((id) => ({ on: !renameOff.has(id) })));
      return {
        key: it.id, head: true, muted: true, name: it.name, countText: t('tree.count', { n: it.descendants.length }), indent: it.level * 16, children,
        sw: { state: st, label: t('tree.headAria', { name: it.name }), onToggle: () => { const to = headToggleTarget(st); for (const id of it.descendants) to ? renameOff.delete(id) : renameOff.add(id); renderRenameScreen(); } },
      };
    }
    const on = !renameOff.has(it.id);
    const old = document.createElement('span');
    old.className = 'tr-old';
    old.textContent = it.name;
    old.title = it.name;
    const nw = document.createElement('b');
    nw.className = 'tr-new';
    nw.textContent = it.after ?? '';
    nw.title = it.after ?? '';
    const cells: HTMLElement[] = [old, arrowEl(), nw];
    return {
      key: it.id, indent: it.level * 16 + (children.length ? 0 : 22), off: !on, cells, children,
      sw: { state: on, label: t('rename.switchAria', { name: it.after ?? '' }), onToggle: () => { on ? renameOff.add(it.id) : renameOff.delete(it.id); renderRenameScreen(); } },
    };
  };
  const items = roots.map(toItem);
  if (show && renameTreeFresh) {
    renameTreeFresh = false;
    renameCollapsed.clear();
    const walk = (list: TreeItem[]): void => { for (const it of list) { if (it.head && it.sw?.state === false) renameCollapsed.add(it.key); if (it.children) walk(it.children); } };
    walk(items);
  }
  renderTree($('renameTree'), items, { collapsed: renameCollapsed, rerender: renderRenameScreen, expandLabel: t('tree.expand'), collapseLabel: t('tree.collapse') });
  const k = show ? renameOnCount() : 0;
  const btn = $('btnRename');
  btn.textContent = show && renameRows().length ? t('rename.applyN', { k }) : t('rename.applyBtn');
  setLock(btn, !show ? 'prereq' : !k ? 'prereq' : null, !baseline ? t('status.noSelection') : !show ? t('rename.none') : t('rename.needOn'));
  if (activeTab === 'select' && selSub === 'rename') renderSubHead();
  if (renameFocusPending && show) {
    const row = $('renameTree').querySelector<HTMLElement>('[data-tkey][tabindex="0"]');
    if (row) { renameFocusPending = false; row.focus({ preventScroll: true }); }
  }
}
let renameFocusPending = false;

/** 미리보기 응답(이 화면 reqId) · 바꾸기 응답. */
function renderRenameResult(msg: Extract<CodeToUi, { type: 'RENAME_RESULT' }>): void {
  if (msg.reqId != null && msg.reqId === renameApplyReq && msg.applied) {
    renameApplyReq = 0;
    renameNodes = [];
    renameFor = null;
    if (activeTab === 'select' && selSub === 'rename') showSelSub('home');
    showStatusLine(t('rename.doneStatus', { k: msg.changes.length }), { cls: 'ok' });
    return;
  }
  if (msg.reqId == null || msg.reqId !== renameReq || msg.applied) return;
  renameReading = false;
  const sameBase = renameFor === baseKey();
  renameNodes = msg.nodes;
  renameFor = baseKey();
  // 끈 줄은 같은 레이어면 이어받는다 — 없어진 레이어 id는 버린다.
  const ids = new Set(renameRows().map((n) => n.id));
  for (const id of Array.from(renameOff)) if (!ids.has(id)) renameOff.delete(id);
  if (!sameBase) renameTreeFresh = true;
  renderRenameScreen();
}

$('btnRename').addEventListener('click', () => {
  if ($('btnRename').getAttribute('aria-disabled') === 'true') return;
  const items = renameRows()
    .filter((n) => !renameOff.has(n.id))
    .map((n) => ({ id: n.id, before: n.name, after: n.after as string, role: n.role }));
  if (!items.length) return;
  // 이름이 그대로인 노드도 역할은 남긴다(§4.4 — 세지 않음). 「컴포넌트 등록」의 말단 후보가 이 기록을 읽는다.
  const roleOnly = renameNodes
    .filter((n) => n.after === undefined && n.role)
    .map((n) => ({ id: n.id, before: n.name, after: n.name, role: n.role }));
  renameApplyReq = ++bindReqSeq;
  send({ type: 'RENAME_APPLY', items: [...items, ...roleOnly], reqId: renameApplyReq });
});
$('renameAllOn').addEventListener('click', () => { renameOff.clear(); renderRenameScreen(); $('renameAllOn').focus(); });
$('renameAllOff').addEventListener('click', () => { for (const n of renameRows()) renameOff.add(n.id); renderRenameScreen(); $('renameAllOff').focus(); });

/** 종류 이름(§2.7) — 영어 고유 이름, 번역하지 않는다(트리 머리 · 탭 · 카드 종류별 수 공용). */
const KIND_HEAD: Record<string, string> = {
  gap: 'Spacing', radius: 'Radius', size: 'Size', stroke: 'Stroke', opacity: 'Opacity', color: 'Color', text: 'Typography', other: 'Other', textStyle: 'Text Style',
};

/* ---------- 변수 만들기(IA v4 §4.3): Global · Semantic · 텍스트 스타일 묶음 트리 + 실행 ---------- */
type MakeKind = 'color' | 'gap' | 'radius' | 'size' | 'stroke' | 'opacity' | 'text';
const MAKE_KINDS: readonly MakeKind[] = ['color', 'gap', 'radius', 'size', 'stroke', 'opacity', 'text'];
const MAKE_KIND_OF: Partial<Record<DraftToken['category'], MakeKind>> = {
  color: 'color', effectColor: 'color', gap: 'gap', radius: 'radius', size: 'size', strokeWidth: 'stroke', opacity: 'opacity',
  fontSize: 'text', lineHeight: 'text', letterSpacing: 'text', fontFamily: 'text',
};
/** 추출 결과(색 이름 정리 · 같은 이름 합치기 뒤, 이 화면 종류만). 값을 직접 고르기의 `tokens`와 따로. */
let mkTokens: DraftToken[] = [];
let mkFor: string | null = null;
let mkExtractReq = 0;
let mkReading = false;
/** 줄 스위치(토큰 이름 → 켬). 같은 토큰 이름이면 다시 읽어도 이어받는다. */
const mkOn = new Map<string, boolean>();
const mkCollapsed = new Set<string>();
let mkTreeFresh = true;
/** 만들기 탭(§4.3) — null = 보이는 첫 탭(들어올 때). */
type MkTab = 'global' | 'semantic' | 'ts';
let mkTab: MkTab | null = null;
let mkStates: Record<string, TokenState> = {};
let mkRoleRows: RoleRow[] = [];
/** 만들 수(미리보기 응답) — null = 아직(세는 중) 또는 보내지 않음. */
let mkPreview: { g: number; r: number; m: number } | null = null;
let mkPreviewReq = 0;
let mkPreviewTimer: ReturnType<typeof setTimeout> | null = null;
/** 마지막 미리보기가 켠 Global 0개(잠긴 줄만)였다 — 응답은 태그에만 쓴다. */
let mkPreviewTagsOnly = false;
/** 텍스트 스타일 후보(유료). */
let mkTs: TextStyleSpec[] = [];
let mkTsExisting: ExistingStyleSig[] = [];
let mkTsFor: string | null = null;
let mkScanReq = 0;
let mkTsReading = false;
const mkTsOff = new Set<string>(); // sig
const mkTsNames = new Map<string, string>(); // sig → 고친 이름
let mkEditSig: string | null = null;
let mkTsPending: Extract<CodeToUi, { type: 'TEXT_STYLE_CANDIDATES' }> | null = null;
/** 이 화면이 보낸 요청 reqId — 메인 처리기는 이 응답을 건드리지 않는다. */
const mkOwned = new Set<number>();
let mkReadTimer: ReturnType<typeof setTimeout> | null = null;
let mkFocusPending = false;
/** 실행 상태. */
let mkRunning = false;
let mkCancelReq = false;
let mkProg: { steps: MakeStepId[]; i: number; done: MakeStepId[] } | null = null;
let mkResults: { id: MakeStepId; mark: 'ok' | 'warn' | 'off'; text: string }[] | null = null;
let mkResultsCreated = false;
let mkCancelNote = '';

const mkNextReq = (): number => { const id = ++bindReqSeq; mkOwned.add(id); return id; };
const mkKind = (tk: DraftToken): MakeKind | undefined => MAKE_KIND_OF[tk.category];
const mkLocked = (tk: DraftToken): boolean => mkStates[tk.name]?.state === 'manual';
const mkIsOn = (tk: DraftToken): boolean => !mkLocked(tk) && (mkOn.get(tk.name) ?? true);
const mkGlobalsOn = (): DraftToken[] => mkTokens.filter(mkIsOn);
const mkSendTokens = (): DraftToken[] => mkTokens.filter((tk) => mkIsOn(tk) || mkLocked(tk));
const mkTsName = (s: TextStyleSpec): string => mkTsNames.get(tsSig(s)) ?? s.name;
const mkTsOnList = (): TextStyleSpec[] => (isPaid ? mkTs.filter((s) => !mkTsOff.has(tsSig(s))) : []);
const mkReady = (): boolean => !!baseline && mkFor === baseKey() && !mkReading && (!isPaid || (mkTsFor === baseKey() && !mkTsReading));

/** 이름 겹침(§4.3 텍스트 스타일 묶음) — 'dup' 켠 줄끼리 · 'exists' 값이 다른 기존 스타일 이름. */
function mkTsConflict(s: TextStyleSpec): 'dup' | 'exists' | null {
  if (mkTsOff.has(tsSig(s))) return null;
  const name = mkTsName(s);
  const sig = tsSig(s);
  if (mkTsOnList().some((o) => o !== s && mkTsName(o) === name)) return 'dup';
  if (mkTsExisting.some((e) => e.name === name && e.sig !== sig)) return 'exists';
  return null;
}

/** 추출 · 후보 읽기(조용한 읽기 · 300개 규칙 — §2.6). user = [읽기]. */
function readMake(user = false): void {
  if (mkReadTimer) { clearTimeout(mkReadTimer); mkReadTimer = null; }
  if (!baseline || isMini || activeTab !== 'select' || selSub !== 'make' || mkRunning) { renderMakeScreen(); return; }
  if (!user && baseline.scanned > BIG_SELECTION) { renderMakeScreen(); return; }
  if (opBusy() || wizardRunning) return;
  mkExtractReq = mkNextReq();
  mkReading = true;
  opSilent = true;
  send({ type: 'EXTRACT', nodeIds: baseline.ids, reqId: mkExtractReq });
  if (isPaid) {
    mkScanReq = mkNextReq();
    mkTsReading = true;
    send({ type: 'SCAN_TEXT_STYLES', nodeIds: baseline.ids, reqId: mkScanReq });
  }
  opSilent = false;
  renderMakeScreen();
}
function scheduleMake(): void {
  if (mkReadTimer) clearTimeout(mkReadTimer);
  mkReadTimer = setTimeout(() => { mkReadTimer = null; readMake(); }, AUTO_SCAN_DELAY);
}

/** 만들 수 다시 계산(250ms 합침) — 보내는 토큰 = 켠 줄 + 잠긴 직접 만든 변수 줄. */
function mkPreviewSoon(): void {
  if (mkPreviewTimer) clearTimeout(mkPreviewTimer);
  mkPreviewTimer = setTimeout(() => { mkPreviewTimer = null; mkSendPreview(); }, AUTO_SCAN_DELAY);
}
function mkSendPreview(): void {
  const toks = mkSendTokens();
  mkPreview = null;
  if (!toks.length) { mkRoleRows = []; mkPreviewReq = 0; renderMakeScreen(); return; }
  mkPreviewTagsOnly = !mkGlobalsOn().length;
  if (mkPreviewTagsOnly) mkRoleRows = [];
  mkPreviewReq = mkNextReq();
  const base = Number(($('base') as HTMLInputElement).value) || 16;
  opSilent = true;
  send({ type: 'CREATE_TOKENS', tokens: toks, base, preview: true, reqId: mkPreviewReq });
  opSilent = false;
  renderMakeScreen();
}

/** 이 화면의 응답이면 받고 true(메인 처리기는 건드리지 않는다). */
function makeTakes(msg: CodeToUi): boolean {
  const rid = (msg as { reqId?: number }).reqId;
  if (rid == null || !mkOwned.has(rid)) return false;
  if (msg.type === 'EXTRACT_RESULT' && rid === mkExtractReq) onMakeExtract(msg);
  else if (msg.type === 'CREATE_RESULT' && rid === mkPreviewReq && msg.preview) onMakePreview(msg);
  else if (msg.type === 'TEXT_STYLE_CANDIDATES' && rid === mkScanReq) onMakeScan(msg);
  return true; // 실행 단계 응답은 wizardRequest가 받는다
}

function onMakeExtract(msg: Extract<CodeToUi, { type: 'EXTRACT_RESULT' }>): void {
  mkReading = false;
  const sameBase = mkFor === baseKey();
  const raw = msg.tokens.map((x) => ({ ...x }));
  huefyTokenColors(raw);
  const prevByKind = new Map<MakeKind, boolean[]>();
  for (const tk of mkTokens) { const k = mkKind(tk); if (k) prevByKind.set(k, [...(prevByKind.get(k) ?? []), mkIsOn(tk)]); }
  mkTokens = mergeSameNameTokens(raw).filter((tk) => mkKind(tk));
  for (const tk of mkTokens) {
    if (mkOn.has(tk.name)) continue;
    const k = mkKind(tk)!;
    const prev = prevByKind.get(k);
    // 새 줄: 그 종류가 지금 모두 꺼져 있으면 끔, 아니면 켬. 처음 보는 종류는 기본값(글자만 끔).
    mkOn.set(tk.name, prev ? prev.some(Boolean) : k !== 'text');
  }
  mkFor = baseKey();
  if (!sameBase) mkTreeFresh = true;
  renderMakeScreen();
  mkSendPreview();
}
function onMakePreview(msg: Extract<CodeToUi, { type: 'CREATE_RESULT' }>): void {
  const prev = mkStates;
  mkStates = { ...mkStates, ...(msg.tokenStates ?? {}) };
  // 잠금이 풀렸으면(manual이 아니게 됨) 켠다.
  for (const [name, st] of Object.entries(msg.tokenStates ?? {})) if (prev[name]?.state === 'manual' && st.state !== 'manual') mkOn.set(name, true);
  if (mkPreviewTagsOnly) { mkPreview = null; mkRoleRows = []; }
  else {
    mkPreview = { g: msg.created + msg.updated, r: msg.roles ?? 0, m: msg.skippedManual ?? 0 };
    mkRoleRows = msg.roleRows ?? [];
  }
  renderMakeScreen();
}
function onMakeScan(msg: Extract<CodeToUi, { type: 'TEXT_STYLE_CANDIDATES' }>): void {
  if (mkEditSig) { mkTsPending = msg; return; } // 고치는 동안은 칸을 닫을 때까지 미룬다
  mkTsReading = false;
  mkTs = msg.styles;
  mkTsExisting = msg.existing ?? [];
  const sigs = new Set(mkTs.map(tsSig));
  for (const k of Array.from(mkTsOff)) if (!sigs.has(k)) mkTsOff.delete(k);
  mkTsFor = baseKey();
  renderMakeScreen();
}

function mkValueChip(tk: DraftToken): HTMLElement {
  const v = typeof tk.value === 'number' && tk.unit === 'percent' ? `${tk.value}%` : String(tk.value);
  return valueChip(v);
}
function mkTag(text: string, tip: string, warn = false): HTMLElement {
  const s = document.createElement('span');
  s.className = `tr-tag${warn ? ' warn' : ''}`;
  s.textContent = text;
  s.title = tip;
  return s;
}
function mkLayers(n: number | undefined): HTMLElement {
  const s = document.createElement('span');
  s.className = 'bv-tw';
  s.textContent = t('make.layers', { n: n ?? 0 });
  return s;
}

/** 보이는 만들기 탭(§4.3 "보이는 탭"). */
function mkTabsVisible(): MkTab[] {
  const out: MkTab[] = [];
  if (mkTokens.length) out.push('global', 'semantic');
  if (isPaid && (mkTs.length || (mkTsReading && mkTsFor !== baseKey()))) out.push('ts');
  return out;
}
/** Semantic 탭 모습(§4.3 ①~③) — none 켠 Global 0개 · counting 응답 전 · zero r = 0 · rows. */
function mkSemState(): 'none' | 'counting' | 'zero' | 'rows' {
  if (!mkGlobalsOn().length) return 'none';
  if (mkPreview == null) return 'counting';
  return mkRoleRows.length ? 'rows' : 'zero';
}
const mkTabName = (tab: MkTab): string => (tab === 'global' ? 'Global' : tab === 'semantic' ? 'Semantic' : KIND_HEAD.textStyle);

/** 고른 탭의 트리 아이템(§4.3) — 종류 머리 › 줄 한 단(텍스트 스타일은 줄만). */
function makeTreeItems(tab: MkTab): TreeItem[] {
  const items: TreeItem[] = [];
  if (tab === 'global') {
    for (const k of MAKE_KINDS) {
      const list = mkTokens.filter((tk) => mkKind(tk) === k);
      if (!list.length) continue;
      const rows: TreeItem[] = list.map((tk) => {
        const st = mkStates[tk.name];
        const locked = mkLocked(tk);
        const on = mkIsOn(tk);
        const name = st?.state === 'reuse' && st.varName ? st.varName : tk.name;
        const cells: HTMLElement[] = [mkValueChip(tk), arrowEl(), varChip(name, String(tk.value), undefined, false)];
        if (st?.state === 'update') cells.push(mkTag(t('make.tagHas'), t('make.tagHasTip')));
        else if (st?.state === 'reuse') cells.push(mkTag(t('make.tagReuse'), t('make.tagReuseTip')));
        else if (st?.state === 'manual') cells.push(mkTag(t('make.tagManual'), t('make.tagManualTip'), true));
        return {
          key: `g:${tk.name}`, indent: 24, off: !on && isPaid, cells, right: [mkLayers(tk.count)],
          sw: !isPaid ? null : { state: on, disabled: locked, label: t('make.rowAria', { name }), onToggle: () => { mkOn.set(tk.name, !on); mkPreviewSoon(); renderMakeScreen(); } },
        };
      });
      const hs = headState(list.map((tk) => ({ on: mkIsOn(tk), locked: mkLocked(tk) })));
      items.push({
        key: `gk:${k}`, head: true, name: KIND_HEAD[k], countText: t('tree.count', { n: list.length }), indent: 0, children: rows,
        sw: !isPaid ? null : { state: hs, label: t('tree.headAria', { name: KIND_HEAD[k] }), onToggle: () => { const to = headToggleTarget(hs); for (const tk of list) if (!mkLocked(tk)) mkOn.set(tk.name, to); mkPreviewSoon(); renderMakeScreen(); } },
      });
    }
  } else if (tab === 'semantic') {
    if (mkSemState() !== 'rows') return items;
    const byTok = new Map(mkTokens.map((tk) => [tk.name, tk]));
    for (const k of MAKE_KINDS) {
      const rows = mkRoleRows.filter((r) => { const tk = byTok.get(r.token); return tk && mkKind(tk) === k; });
      if (!rows.length) continue;
      items.push({
        key: `sk:${k}`, head: true, name: KIND_HEAD[k], countText: t('tree.count', { n: rows.length }), indent: 0,
        children: rows.map((r) => {
          const tk = byTok.get(r.token)!;
          const eq = document.createElement('span');
          eq.className = 'tr-sub';
          eq.textContent = `= ${r.global}`;
          return { key: `s:${r.name}`, indent: 24, cells: [varChip(r.name, String(tk.value)), eq] };
        }),
      });
    }
  } else {
    if (!isPaid || mkTsFor !== baseKey()) return items;
    for (const s of mkTs) {
      const sig = tsSig(s);
      const on = !mkTsOff.has(sig);
      const aa = document.createElement('span');
      aa.className = 'ts-aa';
      aa.setAttribute('aria-hidden', 'true');
      aa.textContent = 'Aa';
      const cells: HTMLElement[] = [aa];
      if (mkEditSig === sig) cells.push(mkEditInput(s));
      else {
        const chip = varChip(mkTsName(s), 'Aa', undefined, false);
        const c = mkTsConflict(s);
        if (c) { chip.classList.add('dup'); chip.title = t(c === 'dup' ? 'make.tsDup' : 'make.tsExists'); }
        chip.addEventListener('dblclick', () => { if (!mkRunning) mkStartEdit(sig); });
        cells.push(chip);
      }
      const sub = document.createElement('span');
      sub.className = 'tr-sub';
      sub.textContent = tsSummary(s);
      cells.push(sub);
      if (s.boundStyleId) cells.push(mkTag(t('make.tagHas'), t('make.tsHasTip')));
      items.push({
        key: `t:${sig}`, indent: 0, off: !on, cells, right: [mkLayers(s.count)], onEdit: () => mkStartEdit(sig),
        sw: { state: on, label: t('make.rowAria', { name: mkTsName(s) }), onToggle: () => { on ? mkTsOff.add(sig) : mkTsOff.delete(sig); renderMakeScreen(); } },
      });
    }
  }
  return items;
}

/** 탭 줄 그리기 — 개수(총 줄 수, 응답 전 "…") · 고른 탭 · 텍스트 스타일 겹침 점. */
function renderMakeTabs(vis: readonly MkTab[]): void {
  const sem = mkSemState();
  const conflict = isPaid ? mkTs.map(mkTsConflict).find((c) => c) ?? null : null;
  for (const b of Array.from(document.querySelectorAll<HTMLButtonElement>('#makeTabs [data-mtab]'))) {
    const tab = b.dataset.mtab as MkTab;
    b.hidden = !vis.includes(tab);
    const sel = tab === mkTab;
    b.setAttribute('aria-selected', String(sel));
    b.tabIndex = sel ? 0 : -1;
    const n = tab === 'global' ? String(mkTokens.length)
      : tab === 'semantic' ? (sem === 'counting' ? '…' : String(sem === 'rows' ? mkRoleRows.length : 0))
      : mkTsFor === baseKey() ? String(mkTs.length) : '…';
    b.querySelector<HTMLElement>('.n')!.textContent = n;
    const dot = b.querySelector<HTMLElement>('.mk-dot');
    if (dot) {
      dot.hidden = !(conflict && !sel);
      dot.setAttribute('aria-label', conflict ? t(conflict === 'dup' ? 'make.tsDup' : 'make.tsExists') : '');
    }
  }
}
function mkSelectTab(tab: MkTab): void {
  mkTab = tab;
  renderMakeScreen();
  $(`makeTab-${tab}`).focus();
}

/** 이름 고치기 칸(§4.3) — Enter · 칸 밖 = 저장, Esc = 취소, 빈 이름은 되돌림. */
function mkEditInput(s: TextStyleSpec): HTMLElement {
  const sig = tsSig(s);
  const inp = document.createElement('input');
  inp.className = 'tr-edit';
  inp.value = mkTsName(s);
  inp.setAttribute('aria-label', t('make.tsEditAria'));
  let done = false;
  const finish = (save: boolean): void => {
    if (done) return;
    done = true;
    const v = inp.value.trim();
    if (save && v) { if (v === s.name) mkTsNames.delete(sig); else mkTsNames.set(sig, v); }
    mkEditSig = null;
    if (mkTsPending) { const p = mkTsPending; mkTsPending = null; onMakeScan(p); } else renderMakeScreen();
    focusRow($('makeTree'), `t:${sig}`);
  };
  inp.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); finish(true); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finish(false); }
  });
  inp.addEventListener('blur', () => finish(true));
  requestAnimationFrame(() => { inp.focus(); inp.select(); });
  return inp;
}
function mkStartEdit(sig: string): void {
  if (mkRunning) return;
  mkEditSig = sig;
  renderMakeScreen();
}
/** 실행 버튼을 누를 때 열린 칸은 먼저 저장한다. */
function mkCommitEdit(): void {
  const inp = $('makeTree').querySelector<HTMLInputElement>('input.tr-edit');
  if (inp) inp.blur();
}

function renderMakeScreen(): void {
  if (!curSel) return;
  const tree = $('makeTree');
  const empty = $('makeEmpty');
  clearMount(empty);
  const showResults = !!mkResults;
  $('makeResults').hidden = !showResults;
  $('makeWarn').hidden = !mkCancelNote || showResults;
  $('makeWarn').textContent = mkCancelNote;
  let emptyText = '';
  let emptyAction: [string, () => void] | null = null;
  let skeleton = false;
  if (!showResults) {
    if (!baseline && !mkRunning) { emptyText = t('v4.noSel'); emptyAction = [t('v4.backHome'), subBack]; }
    else if (!mkRunning && mkFor !== baseKey() && !mkReading && baseline && baseline.scanned > BIG_SELECTION) { emptyText = t('list.big'); emptyAction = [t('list.read'), () => readMake(true)]; }
    else if (!mkRunning && (mkFor !== baseKey() || mkReading)) skeleton = true;
    else if (!mkTokens.length && !mkTs.length) emptyText = t('make.zero');
  }
  empty.hidden = !emptyText;
  if (emptyText) {
    const d = document.createElement('div');
    d.className = 'be-text';
    d.textContent = emptyText;
    empty.appendChild(d);
    if (emptyAction) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'link link-btn';
      b.textContent = emptyAction[0];
      b.addEventListener('click', emptyAction[1]);
      empty.appendChild(b);
    }
  }
  const showTree = !showResults && !emptyText && !skeleton;
  // 탭(§4.3) — 탭 줄이 없는 상태에서는 고른 탭을 그대로 두고, 다시 보일 때 없으면 보이는 첫 탭.
  const vis = showTree ? mkTabsVisible() : [];
  let tabMoved = false;
  if (showTree && vis.length && (!mkTab || !vis.includes(mkTab))) {
    const act = document.activeElement as HTMLElement | null;
    tabMoved = !!mkTab && !!act && ($('makePanel').contains(act) || $('makeTabs').contains(act));
    mkTab = vis[0];
  }
  const tab: MkTab = mkTab ?? 'global';
  $('makeTabs').hidden = !showTree || !vis.length;
  if (showTree && vis.length) {
    renderMakeTabs(vis);
    $('makePanel').setAttribute('role', 'tabpanel');
    $('makePanel').setAttribute('aria-labelledby', `makeTab-${tab}`);
  } else { $('makePanel').removeAttribute('role'); $('makePanel').removeAttribute('aria-labelledby'); }
  $('makeTop').hidden = showResults || (!showTree && !skeleton);
  $('makeFree').hidden = isPaid || !showTree;
  // 도구 줄 — 탭마다 안내 · ⓘ · 그 탭의 모두 켜기 · 끄기.
  let topText = t('make.top');
  let info = '';
  let links = isPaid;
  if (skeleton) { topText = t('v4.reading'); links = false; }
  else if (!isPaid) { topText = t('make.freeTop'); if (tab === 'semantic') info = t('make.freeSemNote'); }
  else if (tab === 'semantic') { topText = t('make.semTop'); info = t('make.semNote'); links = false; }
  else if (tab === 'ts') { topText = t('make.tsTop'); info = t('make.tsNote'); }
  $('makeTopText').textContent = topText;
  const infoBtn = $('makeInfo');
  if (infoBtn.hidden !== !info || infoBtn.dataset.tip !== info) hideUiTip();
  infoBtn.hidden = !info;
  infoBtn.dataset.tip = info;
  infoBtn.setAttribute('aria-label', info);
  $('makeAllOn').hidden = mkRunning || !links;
  $('makeAllOff').hidden = mkRunning || !links;
  $('makeAllSep').hidden = mkRunning || !links;
  $('makeTopRight').hidden = !links;
  $('makeTopRight').querySelector<HTMLElement>('.make-lockmsg')?.remove();
  if (mkRunning && links) {
    const m = document.createElement('span');
    m.className = 'make-lockmsg';
    m.textContent = t('make.runLocked');
    $('makeTopRight').appendChild(m);
  }
  // 탭 안 글(트리 없이) — Semantic 빈 모습 · 세는 중, 텍스트 스타일 세는 중.
  const note = $('makeTabNote');
  let noteText = '';
  if (showTree && tab === 'semantic') {
    const st = mkSemState();
    if (st === 'none') noteText = t(isPaid ? 'make.semNone' : 'make.semZero');
    else if (st === 'counting') noteText = t('make.counting');
    else if (st === 'zero') noteText = t('make.semZero');
  } else if (showTree && tab === 'ts' && mkTsFor !== baseKey()) noteText = t('make.counting');
  note.hidden = !noteText;
  note.textContent = noteText;
  tree.hidden = !!noteText;
  if (skeleton) {
    tree.hidden = false;
    tree.replaceChildren();
    for (const w of [[30, 120], [40, 90], [34, 60], [28, 40]]) {
      const r = document.createElement('div');
      r.className = 'tr tr-head';
      r.innerHTML = `<span style="width:22px"></span><span class="tr-skel" style="width:${w[0]}px"></span><span class="tr-skel" style="width:${w[1]}px;margin-left:12px"></span><span class="grow"></span><span class="tr-skel" style="width:28px;height:16px;border-radius:8px"></span>`;
      tree.appendChild(r);
    }
  } else if (showTree && !noteText) {
    const items = makeTreeItems(tab);
    if (mkTreeFresh) {
      mkTreeFresh = false;
      mkCollapsed.clear();
      // 처음 접기(§2.7): Global 종류 머리가 "모두 끔"이면 접힘. Semantic 머리는 모두 펼침.
      for (const k of MAKE_KINDS) {
        const list = mkTokens.filter((tk) => mkKind(tk) === k);
        if (list.length && headState(list.map((tk) => ({ on: mkIsOn(tk), locked: mkLocked(tk) }))) === false) mkCollapsed.add(`gk:${k}`);
      }
    }
    // 실행 중에는 모두 접는다(끝나면 실행 전 접기 상태로).
    const collapsed = mkRunning ? new Set(items.map((i) => i.key)) : mkCollapsed;
    tree.setAttribute('aria-label', mkTabName(tab));
    renderTree(tree, items, { collapsed, rerender: renderMakeScreen, expandLabel: t('tree.expand'), collapseLabel: t('tree.collapse'), locked: mkRunning });
    tipTruncatedNames(tree);
  } else tree.replaceChildren();
  if (tabMoved) $(`makeTab-${tab}`).focus();
  if (showResults) renderMakeResults();
  $('makeMore').hidden = showResults || !!(emptyText && emptyText !== t('make.zero')) || skeleton;
  setLock($('btnMakePick'), mkRunning ? 'prereq' : null, t('make.runLocked'));
  renderMakeFoot(showResults);
  if (activeTab === 'select' && selSub === 'make') renderSubHead();
  if (mkFocusPending && activeTab === 'select' && selSub === 'make') {
    const target = showTree ? (tree.hidden ? null : tree.querySelector<HTMLElement>('[data-tkey][tabindex="0"]')) ?? $(`makeTab-${tab}`) : emptyAction ? empty.querySelector<HTMLElement>('button') : skeleton ? $('makeOptLink') : null;
    if (target) { mkFocusPending = showTree || !!emptyAction ? false : mkFocusPending; target.focus({ preventScroll: true }); if (showTree) mkFocusPending = false; }
  }
}

function renderMakeResults(): void {
  const box = $('makeResults');
  box.replaceChildren();
  const top = document.createElement('div');
  top.className = 'tree-top';
  top.innerHTML = `<b style="color:var(--text)">${escapeHtml(t('make.partialTitle'))}</b>`;
  box.appendChild(top);
  for (const r of mkResults ?? []) {
    const row = document.createElement('div');
    row.className = 'tr tr-head';
    const mark = document.createElement('span');
    mark.className = 'tr-car';
    mark.style.color = r.mark === 'ok' ? 'var(--ok)' : r.mark === 'warn' ? 'var(--warn)' : 'var(--text-2)';
    mark.textContent = r.mark === 'ok' ? '✓' : r.mark === 'warn' ? '⚠' : '—';
    const nm = document.createElement('span');
    nm.className = `tr-name${r.mark === 'off' ? ' muted' : ''}`;
    nm.textContent = t(`wizard.step.${r.id}`);
    const tx = document.createElement('span');
    tx.className = 'tr-cnt';
    if (r.mark === 'warn') tx.style.color = 'var(--warn)';
    tx.textContent = r.text;
    row.append(mark, nm, tx);
    box.appendChild(row);
  }
  if (mkResultsCreated) {
    const n = document.createElement('div');
    n.className = 'make-more';
    n.textContent = t('make.partialKept');
    box.appendChild(n);
  }
}

function renderMakeFoot(showResults: boolean): void {
  const run = $('btnMakeRun');
  const opts = $('makeOpts');
  opts.hidden = showResults;
  const dark = $('makeOptDark') as HTMLInputElement;
  $('makeDarkPaid').hidden = isPaid;
  if (!isPaid) dark.checked = false;
  for (const id of ['makeOptLink', 'makeOptRename', 'makeOptDark']) setLock($(id) as HTMLInputElement, mkRunning ? 'prereq' : id === 'makeOptDark' && !isPaid ? 'paid' : null, t('make.runLocked'));
  $('btnMakeCancel').hidden = !mkRunning;
  $('makeProg').hidden = !mkRunning;
  $('makeCount').hidden = mkRunning;
  run.hidden = mkRunning;
  if (showResults) {
    run.textContent = t('common.close');
    setLock(run, null);
    $('makeCount').textContent = '';
    return;
  }
  if (mkRunning && mkProg) {
    const { steps, i, done } = mkProg;
    const cur = steps[i];
    $('makeProgText').innerHTML = `${escapeHtml(cur ? t(`make.run.${cur}`) : '')} <span class="muted">${escapeHtml(t('make.stepOf', { i: i + 1, n: steps.length }))}${done.length ? ' · ' + escapeHtml(done.map((d) => `${t(`wizard.step.${d}`)} ✓`).join(' ')) : ''}</span>`;
    ($('makeProgFill') as HTMLElement).style.width = `${Math.round((done.length / Math.max(1, steps.length)) * 100)}%`;
    return;
  }
  const link = ($('makeOptLink') as HTMLInputElement).checked;
  const ren = ($('makeOptRename') as HTMLInputElement).checked;
  if (!isPaid) {
    run.textContent = t('make.runFree');
    $('makeCount').textContent = t('make.freeCount');
    setLock(run, !baseline ? 'prereq' : !link && !ren ? 'prereq' : null, !baseline ? t('status.noSelection') : t('make.freeNeedOpt'));
    return;
  }
  const gOn = mkGlobalsOn().length;
  const tsOn = mkTsOnList().length;
  const tsTail = tsOn ? t('make.countStyles', { t: tsOn }) : '';
  let count = '';
  if (gOn) count = mkPreview ? t('make.countGR', { g: mkPreview.g, r: mkPreview.r }) + (mkPreview.m ? t('create.sumManual', { n: mkPreview.m }) : '') : t('make.counting');
  $('makeCount').textContent = count ? count + tsTail : tsTail.replace(/^ · /, '');
  $('makeCount').title = $('makeCount').textContent ?? '';
  run.textContent = gOn ? (mkPreview ? t('make.runN', { g: mkPreview.g }) : t('make.run')) : tsOn ? t('make.runStyles', { t: tsOn }) : t('make.run');
  const conflict = mkTsOnList().map(mkTsConflict).find(Boolean);
  const reason = !baseline ? t('status.noSelection') : !mkReady() ? t('v4.reading') : !gOn && !tsOn ? t('make.needOn') : conflict === 'dup' ? t('make.tsDup') : conflict === 'exists' ? t('make.tsExists') : '';
  setLock(run, reason ? 'prereq' : null, reason);
}

/** 실행(§4.3 실행 순서) — 기준은 시작할 때 한 번 정한다, 다시 추출하지 않는다. */
async function runMake(): Promise<void> {
  if (mkRunning || wizardRunning) return;
  mkCommitEdit();
  renderMakeScreen();
  if ($('btnMakeRun').getAttribute('aria-disabled') === 'true') return;
  if (mkResults) { mkResults = null; showSelSub('home'); return; } // [닫기]
  const link = ($('makeOptLink') as HTMLInputElement).checked;
  const steps = planMake({ isPaid, globalsOn: mkGlobalsOn().length, stylesOn: mkTsOnList().length, link, rename: ($('makeOptRename') as HTMLInputElement).checked, dark: isPaid && ($('makeOptDark') as HTMLInputElement).checked });
  if (!steps.length || !baseline) return;
  const ids = baseline.ids.slice();
  const toks = mkSendTokens();
  const styles = mkTsOnList().map((s) => ({ ...s, name: mkTsName(s) }));
  const base = Number(($('base') as HTMLInputElement).value) || 16;
  mkRunning = true;
  mkCancelReq = false;
  mkCancelNote = '';
  mkResults = null;
  mkProg = { steps, i: 0, done: [] };
  wizardRunning = true;
  opWizardStart();
  renderMakeScreen();
  const totals: MakeTotals = {};
  const results: { id: MakeStepId; mark: 'ok' | 'warn' | 'off'; text: string }[] = [];
  let stay = false;
  let stopped = false;
  for (let i = 0; i < steps.length; i++) {
    const id = steps[i];
    if (mkCancelReq) { stopped = true; break; }
    mkProg = { steps, i, done: mkProg.done };
    renderMakeScreen();
    try {
      if (id === 'create') {
        const rid = mkNextReq();
        const r = await wizardRequest({ type: 'CREATE_TOKENS', tokens: toks, base, reqId: rid }, ['CREATE_RESULT'], rid);
        totals.created = { g: r.created + r.updated, r: r.roles ?? 0, m: r.skippedManual ?? 0 };
        results.push({ id, mark: 'ok', text: t('wizard.seq.createDone', { created: r.created, updated: r.updated }) });
      } else if (id === 'dark') {
        const vars = await wizardRequest({ type: 'GET_VARIABLES' }, ['VARIABLES']);
        const target = pickDarkTarget(vars.vars);
        if (!target) results.push({ id, mark: 'ok', text: t('wizard.seq.darkNoTarget') });
        else {
          const r = await wizardRequest({ type: 'GENERATE_DARK_MODE', collectionId: target.collectionId, fromModeId: target.fromModeId, ...(target.toModeId ? { toModeId: target.toModeId } : {}) }, ['DARK_MODE_RESULT']);
          if (r.error) { results.push({ id, mark: 'warn', text: r.error }); stay = true; }
          else if (!r.realiased) { results.push({ id, mark: 'warn', text: t('wizard.seq.darkNothing') }); stay = true; }
          else {
            totals.darkFilled = r.realiased;
            results.push({ id, mark: 'ok', text: t('wizard.seq.dark', { realiased: r.realiased }) + (r.modeCreated ? t('wizard.seq.darkModeCreated') : '') + (r.skipped ? t('wizard.seq.darkSkip', { n: r.skipped }) : '') });
          }
        }
      } else if (id === 'textStyles') {
        const rid = mkNextReq();
        const r = await wizardRequest({ type: 'CREATE_TEXT_STYLES', styles, reqId: rid, ...(link ? { applyTo: ids } : {}) }, ['TEXT_STYLES_RESULT'], rid);
        totals.styles = { s: r.created + r.updated, a: r.applied ?? 0 };
        results.push({ id, mark: 'ok', text: t('wizard.seq.textStyles', { created: r.created, updated: r.updated }) + (r.applied ? t('wizard.seq.textStylesLinked', { a: r.applied }) : '') + (r.missing.length ? t('wizard.seq.textStylesMissing', { k: r.missing.length }) : '') });
      } else if (id === 'bind') {
        wizBindReq = ++bindReqSeq;
        wizBindPending = true;
        const r = await wizardRequest({ type: 'APPLY', preview: false, nodeIds: ids, reqId: wizBindReq, skipTextStyleNodes: true }, ['APPLY_RESULT'], wizBindReq).finally(() => { wizBindPending = false; });
        totals.bound = r.bound;
        const reasons = r.reasons ?? {};
        if (r.bound) results.push({ id, mark: 'ok', text: t('wizard.seq.bindDone', { n: r.bound }) + (r.newRoles ? t('wizard.seq.bindRoles', { k: r.newRoles }) : '') });
        else {
          const zero = prereqKnown && !hasBindable ? 'wizard.seq.bindNoTier' : (reasons['already-bound'] ?? 0) > 0 && !(reasons['no-match'] ?? 0) ? 'wizard.seq.bindAllBound' : 'wizard.seq.bindNone';
          results.push({ id, mark: 'warn', text: t(zero) });
          stay = true;
        }
      } else if (id === 'rename') {
        const rid = mkNextReq();
        const r = await wizardRequest({ type: 'RENAME', apply: true, maxDepth: readMaxDepth(), nodeIds: ids, reqId: rid }, ['RENAME_RESULT'], rid);
        totals.renamed = r.changes.length;
        results.push({ id, mark: 'ok', text: t('wizard.seq.renameDone', { count: r.changes.length }) });
      }
      mkProg = { steps, i, done: [...mkProg.done, id] };
    } catch (e) {
      const fe = e instanceof PaidRequiredError ? { message: t('status.paid'), action: '' } : explainError(e instanceof Error ? e.message : String(e));
      results.push({ id, mark: 'warn', text: `${fe.message}${fe.action ? ` — ${fe.action}` : ''}` });
      stay = true;
      stopped = true;
      for (const rest of steps.slice(i + 1)) results.push({ id: rest, mark: 'off', text: t('wizard.seq.stoppedPrev') });
      break;
    }
  }
  const finishedSteps = mkProg?.done ?? [];
  mkRunning = false;
  mkProg = null;
  wizardRunning = false;
  opWizardEnd(stay ? 'fail' : stopped ? 'cancel' : 'ok');
  if (stopped && !stay) {
    // 취소됨 — 화면에 남고 경고 줄.
    const last = finishedSteps[finishedSteps.length - 1];
    mkCancelNote = last
      ? t('make.cancelledUpTo', { step: t(`wizard.step.${last}`) }) + (totals.created ? ` (${t('make.done.create', { g: totals.created.g, r: totals.created.r })}${totals.styles ? ' · ' + t('make.done.styles', { s: totals.styles.s }) : ''})` : '')
      : t('make.cancelled');
    renderMakeScreen();
    return;
  }
  if (stay) {
    for (const sid of MAKE_STEP_ORDER) if (!steps.includes(sid) && (isPaid || sid === 'bind' || sid === 'rename')) results.push({ id: sid, mark: 'off', text: t('make.stepOff') });
    results.sort((a, b) => MAKE_STEP_ORDER.indexOf(a.id) - MAKE_STEP_ORDER.indexOf(b.id));
    mkResults = results;
    mkResultsCreated = !!totals.created;
    if (!(activeTab === 'select' && selSub === 'make')) showStatusLine(t('make.partialStatus'), { cls: 'warn', action: { label: t('common.view'), run: () => { showTab('select'); showSelSub('make'); } } });
    renderMakeScreen();
    if (activeTab === 'select' && selSub === 'make') $('btnMakeRun').focus();
    return;
  }
  // 다 됨 — 하위 화면을 첫 화면으로(탭은 바꾸지 않음) + 상태 줄.
  const linkOff = !link;
  if (selSub === 'make') showSelSub('home');
  showStatusLine(makeDoneText(totals, { isPaid, linkOff }), { cls: 'ok', ...(linkOff ? { action: { label: t('wizard.toBind'), run: () => { showTab('select'); showSelSub('bind'); } } } : {}) });
}
$('btnMakeRun').addEventListener('click', () => void runMake());
$('btnMakeCancel').addEventListener('click', () => { mkCancelReq = true; send({ type: 'CANCEL' }); });
$('btnMakePick').addEventListener('click', (e) => { if ((e.currentTarget as HTMLElement).getAttribute('aria-disabled') === 'true') return; showPick(undefined, 'make'); });
$('makeLicense').addEventListener('click', () => { showTab('settings'); });
/** 모두 켜기 · 끄기 — 고른 탭의 줄만(잠긴 줄은 그대로, §4.3 도구 줄). */
function mkSetAll(on: boolean): void {
  if (mkTab === 'ts') { if (on) mkTsOff.clear(); else for (const s of mkTs) mkTsOff.add(tsSig(s)); }
  else { for (const tk of mkTokens) if (!mkLocked(tk)) mkOn.set(tk.name, on); mkPreviewSoon(); }
  renderMakeScreen();
}
$('makeAllOn').addEventListener('click', () => { mkSetAll(true); $('makeAllOn').focus(); });
$('makeAllOff').addEventListener('click', () => { mkSetAll(false); $('makeAllOff').focus(); });
for (const b of Array.from(document.querySelectorAll<HTMLButtonElement>('#makeTabs [data-mtab]'))) {
  b.addEventListener('click', () => mkSelectTab(b.dataset.mtab as MkTab));
  b.addEventListener('keydown', (e) => {
    const vis = mkTabsVisible();
    const ni = nextTabIndex(e.key, vis.indexOf(b.dataset.mtab as MkTab), vis.length);
    if (ni < 0 || e.key === 'ArrowUp' || e.key === 'ArrowDown') return;
    e.preventDefault();
    mkSelectTab(vis[ni]);
  });
}
// ⓘ: 툴팁이 떠 있으면 Esc는 툴팁만 닫는다(하위 화면 돌아가기보다 먼저).
$('makeInfo').addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !$('uiTip').hidden) { e.preventDefault(); hideUiTip(); }
});
for (const id of ['makeOptLink', 'makeOptRename', 'makeOptDark']) $(id).addEventListener('change', () => renderMakeScreen());

/* ---------- 연결 화면(IA v4 §4.2): 종류 머리 · (변수, 종류) 줄 · 스위치 · 텍스트 스타일 줄 · [n곳 연결] ---------- */
let bindCandidates: BindCandidate[] = [];
/** 켠 곳의 키 — 스위치는 (변수, 종류) 줄 단위라 한 줄의 키가 모두 들어 있거나 모두 빠져 있다. */
const bindChecked = new Set<string>();

/** 후보 고유 키 — 같은 곳 = 같은 레이어 · 같은 속성 · 같은 변수. */
const candKey = placeKey;

/** 찾은 결과가 있는가(연결 후보가 떠 있음). */
function hasBindPreview(): boolean {
  return bindCandidates.length > 0 || bindTsRows.length > 0;
}
/** 찾기를 마쳤는가(찾은 곳이 0이어도 참). */
let bindPreviewed = false;
/** 진행률이 보이는 찾기([읽기] · [다시 읽기]). 조용한 재계산은 아니다. */
let bindFinding = false;
/** (건너뜀 ▸) 펼침. */
let bindSkipsOpen = false;
/** 건너뜀 사유별 수(찾을 때 또는 연결 후 다시 확인). */
let bindSkipReasons: Record<string, number> = {};
/* 복귀 규칙 상태 */
let bindPreviewSel: string[] | null = null; // 찾기를 만든 기준
let bindLeftSince = false; // 찾은 뒤 창·탭을 떠났었다
let bindHereSel = false; // 이 화면이 만든 선택 직후
let bindLayerSelectPending = false; // 이 화면이 레이어 선택을 요청했다(다음 selfSelect가 그것)
let bindPreviewMini = false; // 최소화 중에 끝난 찾기
let bindSilentReq = 0;
/** 조용한 찾기가 같은 기준의 다시 계산인가 — 다르면 스위치 이어받기 알림을 띄우지 않는다. */
let bindSilentCarry = false;
/** 찾기 결과의 사유 × 종류(카드 1 숫자, IA v4 §4.1). */
let bindCounts: ReasonCounts | undefined;
/** 라이브러리 사용 여부(로컬 변수 0개일 때 ② 판정) — null = 아직 모름. */
let layerLibUse: boolean | null = null;
let layerLibReq = 0;
/** 텍스트 스타일 미리보기(§4.2) — 스타일 줄 · 사유(레이어 단위) · 끈 줄. */
type BindTsRow = { styleId: string; name: string; nodeIds: string[] };
let bindTsRows: BindTsRow[] = [];
let bindTsSkips: Record<string, number> = {};
const bindTsOff = new Set<string>();
let bindTsReq = 0;

/** 켠 스타일 줄의 글자 레이어 — 이 레이어의 글자 종류 자리는 변수 후보에서 뺀다(§4.2 "텍스트 스타일이 먼저다"). */
function tsOnNodes(): Set<string> {
  return new Set(bindTsRows.filter((r) => !bindTsOff.has(r.styleId)).flatMap((r) => r.nodeIds));
}
/** 스타일 후보가 있는 모든 글자 레이어(켬 · 끔 무관) — 카드 숫자용(스위치는 모두 켬). */
function tsAllNodes(): Set<string> {
  return new Set(bindTsRows.flatMap((r) => r.nodeIds));
}
/** 지금 보일 변수 후보 — 켠 스타일 줄 레이어의 글자 종류 자리를 뺀다. */
function effCandidates(): BindCandidate[] {
  const ts = tsOnNodes();
  return ts.size ? bindCandidates.filter((c) => !(fieldKind(c.field) === 'text' && ts.has(c.nodeId))) : bindCandidates;
}
let bindRowsSrc: BindCandidate[] | null = null;
let bindRowsSig = '';
let bindRowsAll: RowGroup[] = [];
/** (변수, 종류) 줄 — 후보 · 끈 스타일 줄이 바뀔 때만 다시 만든다. */
function bindRows(): RowGroup[] {
  const sig = [...bindTsOff].sort().join(',') + '|' + bindTsRows.length;
  if (bindRowsSrc !== bindCandidates || sig !== bindRowsSig) {
    bindRowsAll = groupByVarKind(effCandidates());
    bindRowsSrc = bindCandidates;
    bindRowsSig = sig;
  }
  return bindRowsAll;
}
const rowOn = (g: RowGroup): boolean => g.keys.every((k) => bindChecked.has(k));
/** 켠 곳 수 — 켠 변수 줄의 곳 + 켠 스타일 줄의 레이어(§4.2 — 한 자리는 한 번만). */
function bindOnCount(): number {
  const eff = new Set(effCandidates().map(candKey));
  let n = 0;
  for (const k of bindChecked) if (eff.has(k)) n++;
  for (const r of bindTsRows) if (!bindTsOff.has(r.styleId)) n += r.nodeIds.length;
  return n;
}
/** 텍스트 스타일만 모습(§4.2 상태표 — 로컬 변수 0개 · noTier). */
const bindTsOnly = (): boolean => prereqKnown && !hasBindable;

/** 카드 1 · 연결 화면 공통 숫자(§4.1) — 텍스트 스타일 줄 반영. */
function bindCardCounts(): CardCounts & { t: number } {
  const ts = tsAllNodes();
  const fields = bindCandidates.filter((c) => !(fieldKind(c.field) === 'text' && ts.has(c.nodeId))).map((c) => c.field);
  const c = cardCounts(fields, bindCounts);
  // 스타일 후보 레이어의 글자 종류 자리는 k · s에서도 뺀다(§4.1) — 사유 목록(bindSkips, 레이어 × 사유)으로 센다.
  let dk = 0;
  let ds = 0;
  for (const s of bindSkips) {
    if (!ts.has(s.nodeId) || fieldKind(s.field) !== 'text') continue;
    if (NO_VAR_REASONS.includes(s.reason)) dk++;
    else if (FIX_SKIP_REASONS.includes(s.reason)) ds++;
  }
  const t = ts.size;
  const m = c.m + t;
  const k = Math.max(0, c.k - dk);
  const byKind = [...c.byKind];
  const noVarByKind = c.noVarByKind.map((x) => (x.kind === 'text' ? { ...x, n: x.n - dk } : x)).filter((x) => x.n > 0);
  if (t) byKind.push({ kind: 'textStyle' as SelKind, n: t });
  return { ...c, m, k, s: Math.max(0, c.s - ds), n: m + k, byKind, noVarByKind, t };
}

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
/** 변수 이름 칩. mark = 종류 표시(● · # · T) — 왼쪽에 값 칩이 있는 줄은 끈다(§4.2 · §4.3). */
function varChip(name: string, value: string, newRoleOf?: string, mark = true): HTMLElement {
  const markOn = mark;
  const chip = document.createElement('span');
  chip.className = 'bv-chip bv-var';
  const mk = document.createElement('span');
  mk.className = 'bv-mark';
  mk.setAttribute('aria-hidden', 'true');
  mk.textContent = typeMark(value);
  const nm = document.createElement('span');
  nm.className = 'bv-name';
  nm.textContent = name;
  if (newRoleOf != null) {
    // 새 역할(§2.12) — 연결할 때 Semantic에 만든다.
    const badge = document.createElement('span');
    badge.className = 'bv-new';
    badge.textContent = t('bind.newRole');
    badge.setAttribute('role', 'img');
    badge.setAttribute('aria-label', t('bind.newRoleAria'));
    chip.append(badge, ...(markOn ? [mk] : []), nm);
    chip.dataset.tip = t('bind.newRoleTip', { global: newRoleOf });
    chip.title = chip.dataset.tip;
  } else chip.append(...(markOn ? [mk] : []), nm);
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
      if (chip.dataset.tip) continue;
      if (nm.scrollWidth > nm.clientWidth + 1) chip.title = nm.textContent ?? '';
      else chip.removeAttribute('title');
    }
  });
}

/** 빈 상태 · 읽는 중(§4.2 상태표). */
function renderBindEmpty(): void {
  const box = $('bindEmpty');
  clearMount(box);
  let text = '';
  let action: [string, () => void] | null = null;
  box.classList.toggle('done', bindSkipMode());
  if (bindLinking) text = '';
  else if (!bindPreviewed) text = bindFinding || bindFindFailed ? '' : t('v4.reading');
  else if (bindSkipMode()) text = t('v4.allLinked'); // 건너뛴 곳 모습(§4.2) — 연결할 곳 · 새로 만들 값이 모두 0
  else if (!hasBindPreview() || (bindTsOnly() && !bindTsRows.length)) {
    text = t('v4.nothingToLink');
    if (bindCardCounts().k > 0) action = [t('v4.makeArrow'), () => showMakeScreen()];
  }
  box.hidden = !text;
  if (!text) return;
  const d = document.createElement('div');
  d.className = 'be-text';
  d.textContent = text;
  box.appendChild(d);
  if (action) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'link link-btn';
    b.textContent = action[0];
    b.addEventListener('click', action[1]);
    box.appendChild(b);
  }
}

/** 건너뛴 곳 모습(§4.2) — 찾기를 마쳤고 연결할 곳(m)과 새로 만들 값(k)이 모두 0. */
function bindSkipMode(): boolean {
  return bindPreviewed && !bindLinking && !bindTsOnly() && !hasBindPreview() && bindCardCounts().k === 0;
}
/** 텍스트 스타일 사유 중 목록에 보일 것 — hasStyle은 styled와 같은 글자라 숨긴다(텍스트 스타일만 모습에서는 보인다). */
function tsSkipVisible(key: string): boolean {
  return key !== 'hasStyle' || bindTsOnly();
}
/** 건너뛴 곳 칩(§4.2) — s(손볼 곳)가 있으면 "[손볼 곳 {s}곳 ▸]", 그대로 둬도 되는 곳만 있으면 "[건너뛴 곳 ▸]". 건너뛴 곳 모습에서는 칩 없이 목록을 펼친 채. */
function renderBindBadges(): void {
  const c = bindCardCounts();
  const s = bindTsOnly() ? 0 : c.s;
  const keep = bindTsOnly()
    ? 0
    : Object.entries(bindSkipReasons).filter(([k, n]) => n > 0 && (INFO_SKIP_REASONS.includes(k) || LAYER_SKIP_REASONS.includes(k))).length;
  const ts = Object.entries(bindTsSkips).filter(([k, n]) => n > 0 && tsSkipVisible(k)).length;
  const any = s > 0 || keep > 0 || ts > 0;
  const skipMode = bindSkipMode();
  const show = !bindLinking && bindPreviewed && any;
  $('bindBadges').hidden = !show;
  const skip = $('bindSkipToggle');
  skip.hidden = skipMode;
  skip.textContent = `${s > 0 ? t('v4.fixPlacesChip', { s }) : t('bind.skippedPlacesChip')} ${bindSkipsOpen ? '▾' : '▸'}`;
  skip.setAttribute('aria-expanded', String(show && bindSkipsOpen));
  $('bindSkips').hidden = !(show && (bindSkipsOpen || skipMode));
}

/** 연결 화면 그리기. */
function renderBindTree(): void {
  const tree = $('bindTree');
  const rows = bindTsOnly() ? [] : bindRows();
  const showList = bindPreviewed && !bindLinking && (rows.length > 0 || bindTsRows.length > 0);
  $('bindAllRow').hidden = !showList;
  const items: TreeItem[] = [];
  if (showList) {
    for (const kind of [...SEL_KINDS, 'other' as const]) {
      const list = rows.filter((g) => g.kind === kind);
      if (!list.length) continue;
      const children: TreeItem[] = list.map((g) => {
        const on = rowOn(g);
        const cnt = document.createElement('span');
        cnt.className = 'bv-tw';
        cnt.textContent = t('bind.count', { k: g.count });
        return {
          key: g.rowKey,
          indent: 24,
          off: !on,
          cells: [valueChip(g.variableValue), arrowEl(), varChip(g.variableName, g.variableValue, g.newRoleOf, false)],
          right: [cnt],
          sw: { state: on, label: t('bind.switchAria', { name: g.variableName }), onToggle: () => { for (const k of g.keys) on ? bindChecked.delete(k) : bindChecked.add(k); renderBindTree(); } },
        };
      });
      const st = headState(list.map((g) => ({ on: rowOn(g) })));
      items.push({
        key: `kind:${kind}`, head: true, name: KIND_HEAD[kind], countText: t('tree.places', { n: list.reduce((a, g) => a + g.count, 0) }), indent: 0, children,
        sw: { state: st, label: t('tree.headAria', { name: KIND_HEAD[kind] }), onToggle: () => { const to = headToggleTarget(st); for (const g of list) for (const k of g.keys) to ? bindChecked.add(k) : bindChecked.delete(k); renderBindTree(); } },
      });
    }
    if (bindTsRows.length) {
      const tsToggle = (r: BindTsRow, on: boolean): void => {
        on ? bindTsOff.delete(r.styleId) : bindTsOff.add(r.styleId);
        // 스타일 줄을 끄면 그 레이어의 글자 변수 자리가 되살아난다 — 그 줄은 켜진 상태로(같은 줄의 스위치를 따른다).
        if (!on) for (const c of bindCandidates) if (fieldKind(c.field) === 'text' && r.nodeIds.includes(c.nodeId)) bindChecked.add(candKey(c));
      };
      const children: TreeItem[] = bindTsRows.map((r) => {
        const on = !bindTsOff.has(r.styleId);
        const aa = document.createElement('span');
        aa.className = 'ts-aa';
        aa.setAttribute('aria-hidden', 'true');
        aa.textContent = 'Aa';
        const nm = document.createElement('span');
        nm.className = 'bv-chip bv-var';
        nm.innerHTML = `<span class="bv-name">${escapeHtml(r.name)}</span>`;
        const cnt = document.createElement('span');
        cnt.className = 'bv-tw';
        cnt.textContent = t('bind.count', { k: r.nodeIds.length });
        return { key: `ts:${r.styleId}`, indent: 24, off: !on, cells: [aa, arrowEl(), nm], right: [cnt], sw: { state: on, label: t('bind.switchAria', { name: r.name }), onToggle: () => { tsToggle(r, !on); renderBindTree(); } } };
      });
      const st = headState(bindTsRows.map((r) => ({ on: !bindTsOff.has(r.styleId) })));
      items.push({
        key: 'kind:textStyle', head: true, name: KIND_HEAD.textStyle, countText: t('tree.places', { n: bindTsRows.reduce((a, r) => a + r.nodeIds.length, 0) }), indent: 0, children,
        sw: { state: st, label: t('tree.headAria', { name: KIND_HEAD.textStyle }), onToggle: () => { const to = headToggleTarget(st); for (const r of bindTsRows) tsToggle(r, to); renderBindTree(); } },
      });
    }
    // 처음 모습(§2.7): 모두 펼침, 머리 스위치가 "모두 끔"인 머리는 접힘 — 화면에 들어와 처음 그릴 때만.
    if (bindTreeFresh) {
      bindTreeFresh = false;
      bindCollapsed.clear();
      for (const it of items) if (it.sw?.state === false) bindCollapsed.add(it.key);
    }
  }
  renderTree(tree, items, { collapsed: bindCollapsed, rerender: renderBindTree, expandLabel: t('tree.expand'), collapseLabel: t('tree.collapse') });
  tipTruncatedNames(tree);
  renderBindChrome();
  bindFocusFirst();
}
/** 연결 화면 트리의 접힌 머리(그 화면에 있는 동안 기억). */
const bindCollapsed = new Set<string>();
/** 화면에 들어온 뒤 아직 트리를 그리지 않았다 — 처음 접기 규칙을 쓴다. */
let bindTreeFresh = true;
/** 줄은 그대로 두고 빈 상태 · 칩 · 버튼 · 머리만 맞춘다. */
function renderBindChrome(): void {
  if (!curSel) return;
  renderBindEmpty();
  renderBindBadges();
  updateBindApply();
  if (activeTab === 'select' && selSub === 'bind') renderSubHead();
  renderSelHome();
}
$('bindSkipToggle').addEventListener('click', () => {
  bindSkipsOpen = !bindSkipsOpen;
  renderBindBadges();
});
// 모두 켜기 · 모두 끄기(§4.2) — 변수 줄과 스타일 줄 모두. 포커스는 누른 링크에 남는다.
function setAllBind(on: boolean): void {
  // 스타일 줄을 먼저 — 끄면 되살아나는 글자 자리까지 아래에서 함께 끈다.
  for (const r of bindTsRows) on ? bindTsOff.delete(r.styleId) : bindTsOff.add(r.styleId);
  for (const g of bindRows()) for (const k of g.keys) on ? bindChecked.add(k) : bindChecked.delete(k);
  renderBindTree();
}
$('bindAllOn').addEventListener('click', () => { setAllBind(true); $('bindAllOn').focus(); });
$('bindAllOff').addEventListener('click', () => { setAllBind(false); $('bindAllOff').focus(); });

/** [n곳 연결] 이름 · 잠금(§4.2). */
function updateBindApply(): void {
  if (!curSel) return;
  const confirm = $('btnApplyConfirm');
  const n = bindOnCount();
  $('btnApplyConfirmLabel').textContent = bindPreviewed && hasBindPreview() ? t('bind.linkN', { n }) : t('bind.link');
  $('bindFoot').hidden = !!bindLinking || bindSkipMode(); // 건너뛴 곳 모습은 연결할 곳이 0 — 버튼 줄 없음
  if (!curSel.count && !baseline) setLock(confirm, 'prereq', t('status.noSelection'));
  else if (!bindPreviewed) setLock(confirm, 'prereq', t('v4.reading'));
  else if (!hasBindPreview()) setLock(confirm, 'prereq', t('bind.nothing'));
  else if (!n) setLock(confirm, 'prereq', t('bind.needOn'));
  else setLock(confirm, null);
}

/** 찾은 결과를 지운다(기준 변경 · 취소) — "읽는 중"으로. */
function clearBindPreview(): void {
  bindPreviewSel = null;
  bindHereSel = false;
  bindPreviewed = false;
  bindCandidates = [];
  bindSkips = [];
  bindSkipsCapped = false;
  bindSkipReasons = {};
  bindSkipsOpen = false;
  bindTsRows = [];
  bindTsSkips = {};
  bindVarPending = false;
  bindTsPending = false;
  clearMount($('bindSkips'));
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
    // 세트: [세트] · 속성접힘: [속성] · 단독: [단독] · 재사용: [재사용] + 기존 컴포넌트 이름(§4.7 "재사용" 7번)
    const base = { id: n.id, name: n.name, type: n.type, depth: n.depth, parentId: n.parentId, replace: false };
    if (n.reuse) {
      return { ...base, change: n.reuse.name, badge: { text: t('component.badgeReuse'), kind: 'reuse' as const } };
    }
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

/** 건너뜀 사유 칩(§4.2) — [건너뜀 ▸]을 펼치면 보인다. 자리 단위 사유는 "{사유} {n}곳", 레이어 단위 · 텍스트 스타일 사유는 "{사유} 레이어 {n}개".
    레이어 목록이 있는 사유만 버튼(누르면 캔버스 선택). 텍스트 스타일만 모습이면 텍스트 스타일 사유만. */
function renderSkipReasons(reasons: Record<string, number>): void {
  bindSkipReasons = { ...reasons };
  const box = $('bindSkips');
  clearMount(box);
  const capNote = bindSkipsCapped ? t('bind.skipCappedTip', { shown: bindSkips.length }) : '';
  const tsOnly = bindTsOnly();
  // 줄 하나 = 사유 하나(§4.2 건너뛴 곳 목록): 이름 · 수 · 한 줄 설명 · [선택 ›]
  const row = (label: string, count: string, help: string, ids: string[], key?: string): HTMLElement => {
    const r = document.createElement('div');
    r.className = 'skip-row';
    const nm = document.createElement('span');
    nm.className = 'skip-name';
    nm.textContent = label;
    const n = document.createElement('span');
    n.className = 'skip-n';
    n.textContent = count;
    r.append(nm, n);
    if (help) {
      const h = document.createElement('span');
      h.className = 'skip-help';
      h.textContent = help;
      r.appendChild(h);
    }
    const grow = document.createElement('span');
    grow.className = 'grow';
    r.appendChild(grow);
    if (ids.length && key) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'link link-btn skip-sel';
      btn.textContent = t('bind.skipSelectBtn');
      const names = bindSkips.filter((x) => x.reason === key).slice(0, 5).map((x) => x.name).join(', ');
      btn.title = t(ids.length > 5 ? 'bind.skipChipTipMore' : 'bind.skipChipTip', { count: ids.length, names }) + capNote;
      btn.addEventListener('click', () => {
        bindLayerSelectPending = true;
        selectNodes(ids, 'applyStatus');
        setStatus('applyStatus', t('bind.skipSelected', { reason: t('reason.' + key), n: ids.length }), '');
      });
      r.appendChild(btn);
    }
    return r;
  };
  const varRow = (key: string, n: number): HTMLElement => {
    const ids = [...new Set(bindSkips.filter((x) => x.reason === key).map((x) => x.nodeId))];
    const layer = LAYER_SKIP_REASONS.includes(key);
    const count = layer ? t('v4.layerCount', { n: ids.length || n }) : t('bind.count', { k: n });
    return row(t('reason.' + key), count, t('reasonHelp.' + key), ids, key);
  };
  const head = (text: string): void => {
    const h = document.createElement('div');
    h.className = 'skip-head';
    h.textContent = text;
    box.appendChild(h);
  };
  const fix = tsOnly ? [] : FIX_SKIP_REASONS.filter((k) => (reasons[k] ?? 0) > 0);
  const keep = tsOnly ? [] : [...INFO_SKIP_REASONS, ...LAYER_SKIP_REASONS].filter((k) => (reasons[k] ?? 0) > 0);
  const tsKeys = Object.keys(bindTsSkips).filter((k) => (bindTsSkips[k] ?? 0) > 0 && tsSkipVisible(k));
  if (fix.length) {
    head(t('v4.skipFixHead'));
    for (const k of fix) box.appendChild(varRow(k, reasons[k]));
  }
  if (keep.length || tsKeys.length) {
    head(t('v4.skipKeepHead'));
    for (const k of keep) box.appendChild(varRow(k, reasons[k]));
    for (const k of tsKeys) box.appendChild(row(t('tsSkip.' + k), t('v4.layerCount', { n: bindTsSkips[k] }), '', []));
  }
}

/** 결과 줄 꼬리 — 이름은 3개까지 + " 외"(§4.7 "인스턴스 자리" 5번). 없으면 빈 문자열. */
function placeTailText(key: 'component.placeFailed' | 'component.placeCloned' | 'component.propFailed' | 'component.fillKept' | 'component.reuseKept', names: readonly string[]): string {
  if (!names.length) return '';
  const shown = names.slice(0, 3).join(', ') + (names.length > 3 ? t('component.placeFailedMore') : '');
  return t(key, { n: names.length, names: shown });
}
/** " · 기존 컴포넌트 재사용 {n}: {이름들}" — 이름 3개까지 + " 외"(§4.7 "재사용" 8번). 없으면 빈 문자열. */
function reusedText(names: readonly string[]): string {
  if (!names.length) return '';
  const shown = names.slice(0, 3).join(', ') + (names.length > 3 ? t('component.reusedMore') : '');
  return t('component.reused', { n: names.length, names: shown });
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
/** 연결 진행(PROGRESS op: 'link') — "연결 중… {done} / {total}", 막대는 done/total. */
function updateLinkProgress(done: number, total: number): void {
  $('applyProgress').style.display = '';
  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
  ($('applyBarFill') as HTMLElement).style.width = `${pct}%`;
  $('applyProgressText').textContent = t('bind.linkingOf', { done, total });
}
function hideApplyProgress(): void {
  $('applyProgress').style.display = 'none';
  bindFinding = false;
  if (curSel) renderBindChrome(); // 찾는 중 표시를 거둔다
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
function showStatusLine(text: string, opts: { cls?: 'ok' | 'warn' | ''; action?: StatusAction; background?: boolean; tip?: string } = {}): void {
  if (opts.background && statusSticky) return;
  const line = $('statusLine');
  const txt = $('statusText');
  const btn = $('statusAction') as HTMLButtonElement;
  if (statusTimer) { clearTimeout(statusTimer); statusTimer = null; }
  txt.textContent = text;
  txt.title = opts.tip ? `${text}\n${opts.tip}` : text; // 말줄임된 글 전체는 툴팁으로(사유별 수가 있으면 함께)
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
/**
 * 버튼·체크박스 잠금. reason이 null이면 푼다. prereqMsg는 전제 미충족 사유(공통 상태 줄 문구).
 * 그 화면의 사유(base)는 따로 기억하고, 대기 사유(setWait — 연결 중 · 다른 쓰기 작업 중)와 합쳐 건다.
 * 순서: 유료 → 대기 → 전제(§2 원칙 3 · §4.6 버튼 절).
 */
function setLock(el: HTMLElement, reason: LockReason | null, prereqMsg = ''): void {
  if (reason) {
    el.dataset.baseLock = reason;
    if (reason === 'prereq') el.dataset.baseLockMsg = prereqMsg;
    else delete el.dataset.baseLockMsg;
  } else {
    delete el.dataset.baseLock;
    delete el.dataset.baseLockMsg;
  }
  applyLock(el);
}
function applyLock(el: HTMLElement): void {
  const base = el.dataset.baseLock as LockReason | undefined;
  const wait = el.dataset.wait;
  const reason: LockReason | undefined = base === 'paid' ? 'paid' : wait ? 'prereq' : base;
  if (reason) {
    el.setAttribute('aria-disabled', 'true');
    el.dataset.lock = reason;
    if (reason === 'prereq') el.dataset.lockMsg = wait || el.dataset.baseLockMsg || '';
    else delete el.dataset.lockMsg;
  } else {
    el.removeAttribute('aria-disabled');
    delete el.dataset.lock;
    delete el.dataset.lockMsg;
  }
}
/**
 * 대기 잠금(§4.6 "연결 중의 다른 일") — msg가 있으면 걸고 툴팁 뒤에 " · {msg}"를 붙인다. null이면 푼다.
 * target이 있으면 누를 때 사유를 그 카드 상태 줄에, 없으면 공통 상태 줄에 띄운다.
 */
function setWait(el: HTMLElement, msg: string | null, target = ''): void {
  const attr = el.hasAttribute('data-tip') ? 'data-tip' : 'title';
  let tip = el.getAttribute(attr) ?? '';
  const prevTail = el.dataset.waitTail ?? '';
  if (prevTail && tip.endsWith(prevTail)) tip = tip.slice(0, tip.length - prevTail.length);
  if (msg) {
    const tail = tip ? ` · ${msg}` : msg;
    el.setAttribute(attr, tip + tail);
    el.dataset.waitTail = tail;
    el.dataset.wait = msg;
    if (target) el.dataset.waitTarget = target;
    else delete el.dataset.waitTarget;
  } else {
    if (prevTail) {
      if (tip) el.setAttribute(attr, tip);
      else el.removeAttribute(attr);
    }
    delete el.dataset.waitTail;
    delete el.dataset.wait;
    delete el.dataset.waitTarget;
  }
  applyLock(el);
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
    else if (el.dataset.wait && el.dataset.waitTarget) setStatus(el.dataset.waitTarget, el.dataset.wait, 'warn'); // 연결 카드 버튼 — 카드 상태 줄
    else if (el.dataset.lockMsg) showStatusLine(el.dataset.lockMsg, { cls: 'warn' });
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
const goLayer = (step: ApplyStep): OpGo => () => { showTab('select'); showApplyStep(step); };
const OPS: Partial<Record<UiToCode['type'], OpDef>> = {
  EXTRACT: { results: ['EXTRACT_RESULT'], label: 'op.extract', go: () => showPick('color'), write: false },
  CREATE_TOKENS: { results: ['CREATE_RESULT'], label: 'op.create', go: () => showPick('token'), write: true },
  CREATE_SEMANTICS: { results: ['SEMANTICS_RESULT'], label: 'op.semantics', go: () => showPick('token'), write: true },
  GENERATE_DARK_MODE: { results: ['DARK_MODE_RESULT'], label: 'op.dark', go: () => showPick('theme'), write: true },
  SCAN_TEXT_STYLES: { results: ['TEXT_STYLE_CANDIDATES'], label: 'op.textScan', go: () => showPick('type'), write: false },
  CREATE_TEXT_STYLES: { results: ['TEXT_STYLES_RESULT'], label: 'op.textStyles', go: () => showPick('type'), write: true },
  APPLY: { results: ['APPLY_RESULT'], label: 'op.bind', go: goLayer('bind'), write: false },
  APPLY_SELECTED: { results: ['APPLY_RESULT'], label: 'op.bind', go: goLayer('bind'), write: true },
  // IA v4 §4.6 쓰기 잠금 — 클릭 연결 · 새 변수 · 복제 · 삭제
  APPLY_VARIABLE: { results: ['VARIABLE_APPLIED'], label: 'op.applyVar', go: () => showTab('variables'), write: true },
  CREATE_VARIABLE: { results: ['VARIABLE_CREATED'], label: 'op.createVar', go: () => showTab('variables'), write: true },
  DUPLICATE_VARIABLE: { results: ['VARIABLE_DUPLICATED'], label: 'op.dupVar', go: () => showTab('variables'), write: true },
  DELETE_VARIABLE: { results: ['VARIABLE_DELETED'], label: 'op.delVar', go: () => showTab('variables'), write: true },
  RENAME: { results: ['RENAME_RESULT'], label: 'op.rename', go: goLayer('rename'), write: false },
  RENAME_APPLY: { results: ['RENAME_RESULT'], label: 'op.rename', go: goLayer('rename'), write: true },
  SCAN_COMPONENT_CANDIDATES: { results: ['COMPONENT_CANDIDATES'], label: 'op.components', go: goLayer('structure'), write: false },
  REGISTER_COMPONENTS: { results: ['COMPONENTS_RESULT'], label: 'op.components', go: goLayer('structure'), write: true },
  CLASSIFY_VARIANTS: { results: ['VARIANTS_RESULT'], label: 'op.components', go: goLayer('structure'), write: true },
  GENERATE_MISSING_VARIANTS: { results: ['GENERATE_RESULT'], label: 'op.components', go: goLayer('structure'), write: true },
  SCAN_SIMILAR: { results: ['SIMILAR_CANDIDATES'], label: 'op.components', go: goLayer('structure'), write: false },
  COMPONENTIZE_SIMILAR: { results: ['COMPONENTIZE_RESULT'], label: 'op.components', go: goLayer('structure'), write: true },
  EXPORT: { results: ['EXPORT_RESULT'], label: 'op.export', go: () => showTab('variables'), write: false },
  UNBIND_DELETED: { results: ['DELETED_UNBOUND'], label: 'op.unbind', go: () => { showTab('select'); showSelSub('home'); }, write: true },
};
/** 결과를 기다리는 작업(요청 종류별). 마법사는 단계 요청을 따로 세지 않고 한 작업으로 본다. */
const opPending = new Map<UiToCode['type'], OpDef>();
let opWizard = false;

/* ---------- 연결 중 잠금(§4.6 "연결 중의 다른 일") ----------
   연결 중에는 쓰기 작업 버튼을 aria-disabled로 두고 사유 bind.waitLink를 띄운다.
   반대로 다른 쓰기 작업 중에는 [🔗 연결]을 bind.waitOp로 잠근다. 읽기 요청(write: false)은 막지 않는다. */
/** OPS write: true 요청의 버튼 + 마법사 [전체 실행] — 사유는 공통 상태 줄. */
const WAIT_LINK_IDS = [
  'btnCreate', 'btnCreateApply', 'btnColorVars', // CREATE_TOKENS
  'btnSemantics', // CREATE_SEMANTICS
  'btnGenDark', // GENERATE_DARK_MODE
  'btnTextStyles', // CREATE_TEXT_STYLES
  'btnRename', // RENAME_APPLY
  'btnRegisterComp', // REGISTER_COMPONENTS
  'btnClassifyVariants', // CLASSIFY_VARIANTS
  'btnGenMissing', // GENERATE_MISSING_VARIANTS
  'btnComponentize', // COMPONENTIZE_SIMILAR
  'btnMakeRun', // 만들기 화면 실행(§4.3)
];
/** 연결 화면의 [n곳 연결] — 사유는 화면 상태 줄(#applyStatus). */
const WAIT_CARD_IDS = ['btnApplyConfirm'];
/** 지금 진행 중인 다른 쓰기 작업의 이름(op.* 라벨) — 없으면 null. 연결 자신은 빼고 본다. */
function otherWriteOp(): string | null {
  if (opWizard || wizardRunning) return t('op.wizard');
  for (const [type, def] of opPending) if (type !== 'APPLY_SELECTED' && def.write) return t(def.label);
  return null;
}
/** 변수 탭 쓰기 작업(§4.6 쓰기 잠금) — 진행 중이면 다른 쓰기 버튼을 잠근다. */
const VAR_WRITE_OPS: readonly UiToCode['type'][] = ['APPLY_VARIABLE', 'CREATE_VARIABLE', 'DUPLICATE_VARIABLE', 'DELETE_VARIABLE'];
function renderWaitLocks(): void {
  const link = bindLinking ? t('bind.waitLink') : null;
  const varOp = VAR_WRITE_OPS.find((x) => opPending.has(x));
  const varLock = varOp ? t('bind.waitOp', { op: t(opPending.get(varOp)!.label) }) : null;
  for (const id of WAIT_LINK_IDS) setWait($(id), link ?? varLock);
  const other = link ? null : otherWriteOp();
  const wiz = opWizard || wizardRunning ? t('bind.waitOp', { op: t('op.wizard') }) : null;
  for (const id of WAIT_CARD_IDS) {
    // 마법사 중에는 찾기 · 다시 찾기도 막는다(§4.3 — 마법사 연결과 겹치지 않게).
    const msg = link ?? (id === 'btnApplyConfirm' && other ? t('bind.waitOp', { op: other }) : wiz);
    setWait($(id), msg, 'applyStatus');
  }
}
/** 연결 중 플래그가 바뀐 뒤 — 잠금 · 단계 표시 · 상세 팝업 [저장]을 다시 맞춘다. */
function onBindLinkingChanged(): void {
  renderWaitLocks();
  renderBindChrome();
  if (ed) edChrome();
}
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
  if (def.write) renderWaitLocks(); // 다른 쓰기 작업 중 [🔗 연결] 잠금(§4.6 "반대 방향")
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
    // 오류의 op가 있으면 그 작업만 끝낸다 — 다른 작업(예: 연결)이 기다리는 결과는 그대로 기다린다.
    const op = m.type === 'ERROR' ? (m.op as UiToCode['type'] | undefined) : undefined;
    let def: OpDef | undefined;
    if (op) {
      def = opPending.get(op);
      if (!def) return;
      opPending.delete(op);
    } else {
      def = [...opPending.values()][0];
      if (!def) return;
      opPending.clear();
    }
    opProg = null;
    renderWaitLocks();
    opFinished(false, def);
    return;
  }
  for (const [type, def] of opPending) {
    if (!def.results.includes(m.type)) continue;
    opPending.delete(type);
    opProg = null;
    if (def.write) renderWaitLocks();
    let failed = false;
    let cancelled = false;
    if (m.type === 'DARK_MODE_RESULT' && m.error) failed = true;
    if ((m.type === 'COMPONENTS_RESULT' || m.type === 'VARIANTS_RESULT') && (m.failures?.length ?? 0) > 0) failed = true;
    // 속성 값 실패 · 복사본 · 빈 자리도 실패로(§4.7 5·6번) — failures에도 실리지만 꼬리와 같은 기준으로 한 번 더 본다.
    if (m.type === 'COMPONENTS_RESULT' && ((m.propFailed?.length ?? 0) + (m.fillKept?.length ?? 0) + (m.reuseKept?.length ?? 0) + (m.placeCloned?.length ?? 0) + (m.placeFailed?.length ?? 0)) > 0) failed = true;
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
  if (m.type === 'COMPONENTS_RESULT') return m.registered > 0 || m.sets > 0 || (m.reused?.length ?? 0) > 0; // 재사용만이어도 파일을 바꿨다(§4.7 "재사용" 6번)
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
  renderWaitLocks();
}
function opWizardEnd(result: 'ok' | 'fail' | 'cancel'): void {
  opWizard = false;
  opProg = null;
  renderWaitLocks();
  if (result !== 'cancel') opFinished(result === 'ok', { results: [], label: 'op.wizard', go: () => showMakeScreen(), write: true });
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
  if (activeTab === 'variables') {
    send({ type: 'GET_VAR_TABLE' });
    requestManagerUsage(why === 'work' ? 'work' : 'quiet');
  }
  if (why === 'work' && activeTab !== 'variables') send({ type: 'GET_VAR_TABLE' });
  if (activeTab === 'select') {
    if (selSub === 'rename' && (why !== 'enter' || (renameFor !== baseKey() && !renameReading))) readRename();
    if (selSub === 'make' && !mkResults && (why === 'work' || why === 'reentry' || (why === 'enter' && mkFor !== baseKey() && !mkReading))) readMake();
    // 선택 탭 데이터(IA v4 §7): 찾기 + 쓰는 변수 + 삭제된 변수(300개 규칙, 조용히).
    // 연결 하위 화면의 복귀는 bindOnReturn이 조용히 다시 찾는다(§4.2) — 찾기를 두 번 보내지 않는다.
    const bindReturn = why !== 'work' && selSub === 'bind';
    readSelData(why, !bindReturn);
    readLayerLibUse();
    if (bindReturn) bindOnReturn();
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
renderTsLink(); // 타이포 [✓] 레이어에 바로 연결 — 스캔 전에는 잠금
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

/* ---------- 탭 내비게이션 (IA v4 §2.1: [선택 | 변수] + ⚙) ---------- */
const TABS = ['select', 'variables'] as const;
type SegTab = (typeof TABS)[number];
/** settings = ⚙ 설정 화면(탭 밖). */
type TabName = SegTab | 'settings';
/** 선택 탭의 하위 화면(§2.1). */
type SelSub = 'home' | 'bind' | 'rename' | 'structure' | 'make' | 'pick';
let activeTab: TabName = 'select';
let selSub: SelSub = 'home';
/** ⚙ 설정을 연 탭 — ←로 돌아간다. */
let settingsReturn: SegTab = 'select';
/** 하위 화면을 연 버튼 — ←로 돌아오면 포커스(§2.1). */
let subOpener: HTMLElement | null = null;
/** 플러그인이 열려 있는 동안 기억(§2.6) — 탭·하위 화면별 스크롤. 다시 열면 처음 상태. */
const screenScroll = new Map<string, number>();
const screenKey = (): string => (activeTab === 'select' ? `select:${selSub}` : activeTab);

function showTab(name: TabName): void {
  const changed = name !== activeTab;
  if (changed) screenScroll.set(screenKey(), window.scrollY);
  if (changed && activeTab === 'select' && selSub === 'bind' && hasBindPreview()) bindLeftSince = true; // 미리보기 뒤 탭을 떠남(⑧)
  if (name === 'settings' && activeTab !== 'settings') settingsReturn = activeTab as SegTab;
  activeTab = name;
  for (const tb of TABS) {
    $(`tab-${tb}`).classList.toggle('active', tb === name);
    const btn = $(`tabbtn-${tb}`);
    const on = tb === name;
    btn.classList.toggle('active', on);
    btn.setAttribute('aria-selected', String(on));
    // 정지점 1개 — 설정 화면 중에는 둘 다 고르지 않은 모양이라 [선택]이 정지점(§2.1).
    btn.tabIndex = on || (name === 'settings' && tb === 'select') ? 0 : -1;
  }
  $('tab-settings').classList.toggle('active', name === 'settings');
  syncManagerVisibility(false);
  syncStickyOffsets();
  if (changed) {
    const y = screenScroll.get(screenKey()) ?? 0;
    requestAnimationFrame(() => window.scrollTo(0, y));
    readScreen('enter');
  }
  renderSelHome();
}

/** 선택 탭 하위 화면 전환(§2.1). 탭은 바꾸지 않는다(부르는 쪽이 showTab). */
function showSelSub(sub: SelSub, opener?: HTMLElement | null): void {
  // 연결 화면은 기준이 있어야 한다 — 선택이 없으면 첫 화면(선택 없음 안내, §4.2 상태표).
  if (sub === 'bind' && !(baseline ?? curSel)?.count) sub = 'home';
  const changed = sub !== selSub;
  if (changed && activeTab === 'select') screenScroll.set(screenKey(), window.scrollY);
  if (changed && selSub === 'bind' && hasBindPreview()) bindLeftSince = true;
  if (sub !== 'home' && opener !== undefined) subOpener = opener;
  selSub = sub;
  $('selHome').style.display = sub === 'home' ? '' : 'none';
  $('subHead').hidden = sub === 'home';
  $('varMake').style.display = sub === 'pick' ? '' : 'none';
  $('makeScreen').style.display = sub === 'make' ? '' : 'none';
  if (sub === 'bind' || sub === 'rename' || sub === 'structure') showStep('apply', sub);
  else for (const el of Array.from(document.querySelectorAll<HTMLElement>('.step[data-apply-step]'))) el.style.display = 'none';
  if (sub === 'pick') showMakeStep(curMakeStep);
  renderSubHead();
  syncStickyOffsets();
  if (changed && activeTab === 'select') {
    const y = screenScroll.get(screenKey()) ?? 0;
    requestAnimationFrame(() => window.scrollTo(0, y));
    readScreen('enter');
  }
  renderSelHome();
  // 연결 화면에 들어오면 첫 스위치에 포커스(§4.2) — 목록이 아직 없으면 결과가 그려질 때.
  if (changed && sub === 'bind') { bindFocusPending = true; bindTreeFresh = true; $('bindTree').dataset.focusKey = ''; if (bindPreviewed) renderBindTree(); }
  if (changed && sub === 'make') { mkFocusPending = true; mkTreeFresh = true; mkTab = null; mkCancelNote = ''; if (!mkRunning && !mkResults) readMake(); else renderMakeScreen(); }
  if (changed && sub === 'rename') { renameFocusPending = true; renameTreeFresh = true; renameFor = null; renameNodes = []; readRename(); }
  bindFocusFirst();
}
/** 연결 화면에 들어온 뒤 첫 스위치에 포커스를 한 번 준다. */
function bindFocusFirst(): void {
  if (!bindFocusPending || activeTab !== 'select' || selSub !== 'bind') return;
  // 건너뛴 곳 모습은 첫 [선택 ›](없으면 ←) — §4.2
  const row = bindSkipMode()
    ? $('bindSkips').querySelector<HTMLElement>('.skip-sel') ?? $('btnSubBack')
    : $('bindTree').querySelector<HTMLElement>('[data-tkey][tabindex="0"]');
  if (!row) return;
  bindFocusPending = false;
  row.focus({ preventScroll: true });
}
/** 연결 화면 머리 오른쪽 꼬리(§4.2) — "변수 없는 값 {n}곳", 텍스트 스타일만 모습이면 "Text Style {t}곳". 없으면 ''. */
function bindHeadTail(): string {
  if (!bindPreviewed) return '';
  const c = bindCardCounts();
  if (bindTsOnly()) return c.t ? t('v4.tsPlaces', { t: c.t }) : '';
  if (bindSkipMode()) return c.s ? t('v4.fixPlaces', { s: c.s }) : ''; // 건너뛴 곳 모습 — 손볼 곳 수
  return c.n ? t('v4.findN', { n: c.n }) : '';
}
/** 머리 오른쪽 = 이름(넘치면 이것만 줄임) + 꼬리(늘 보임, §4.2). */
function setSubRight(name: string, tail: string, sep: string): void {
  const box = $('subRight');
  box.replaceChildren();
  if (!name && !tail) return;
  const nm = document.createElement('span');
  nm.className = 'sub-right-name';
  nm.textContent = name;
  box.appendChild(nm);
  if (tail) {
    const tl = document.createElement('span');
    tl.className = 'sub-right-tail';
    tl.textContent = (name ? sep : '') + tail;
    box.appendChild(tl);
  }
  requestAnimationFrame(() => { nm.title = nm.scrollWidth > nm.clientWidth ? name : ''; });
}
/** 하위 화면 머리 — 제목 · 오른쪽 보조 글(§4.2~§4.5). */
function renderSubHead(): void {
  const titles: Record<Exclude<SelSub, 'home'>, string> = { bind: 'v4.subBind', rename: 'v4.rename', structure: 'v4.subComponents', make: 'make.title', pick: 'v4.subMake' };
  if (selSub === 'home') return;
  $('subTitle').textContent = selSub === 'bind' && bindSkipMode() ? t('v4.skippedTitle') : t(titles[selSub]);
  const name = baseline ? baseLabel() : '';
  if (selSub === 'make') setSubRight(name, name ? t('make.subRight') : '', '');
  else if (selSub === 'rename') setSubRight(name, renameFor === baseKey() ? t('rename.subRight', { n: renameRows().length }) : '', ' · ');
  else if (selSub === 'bind') setSubRight(name, bindHeadTail(), ' · ');
  else setSubRight('', '', '');
}
/** ← · Esc — 첫 화면으로, 포커스는 연 버튼(없으면 첫 카드 버튼, §2.1). */
function subBack(): void {
  if (selSub === 'pick') {
    if (pickFrom === 'make' && (baseline ?? curSel)?.count) { showSelSub('make'); $('btnMakePick').focus(); return; }
    showSelSub('home');
    if (pickFrom === 'vars') { showTab('variables'); return; }
  }
  showSelSub('home');
  const target = subOpener && document.body.contains(subOpener) && subOpener.offsetParent ? subOpener : $('selCards').querySelector<HTMLElement>('button');
  (target ?? $('btnGoMake')).focus();
}
$('btnSubBack').addEventListener('click', subBack);
// [data-go-sub] — 선택 탭 하위 화면으로 가는 링크(위임). 카드 버튼과 같은 이동.
document.addEventListener('click', (e) => {
  const el = (e.target as HTMLElement | null)?.closest<HTMLElement>('[data-go-sub]');
  if (!el) return;
  const sub = el.dataset.goSub as SelSub;
  if (!['home', 'bind', 'rename', 'structure', 'make', 'pick'].includes(sub)) return;
  showTab('select');
  showSelSub(sub, el);
});
$('btnSettings').addEventListener('click', () => { showTab('settings'); $('btnSettingsBack').focus(); });
$('btnSettingsBack').addEventListener('click', () => { showTab(settingsReturn); $('btnSettings').focus(); });
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape' || menuEl || modalEl || e.defaultPrevented) return;
  const tg = e.target as HTMLElement;
  if (tg.closest('input, textarea, select, [contenteditable]')) return;
  if (activeTab === 'settings') { e.preventDefault(); showTab(settingsReturn); $('btnSettings').focus(); }
  else if (activeTab === 'select' && selSub !== 'home') { e.preventDefault(); subBack(); }
});

/** 값을 직접 고르기(v3 만들기 4단계)로 — from: 돌아갈 곳(만들기 화면 · 변수 탭). */
let pickFrom: 'make' | 'vars' = 'make';
function showPick(step?: MakeStep, from: 'make' | 'vars' = 'vars'): void {
  const opener = document.activeElement as HTMLElement | null;
  pickFrom = from;
  showTab('select');
  showSelSub('pick', opener);
  if (step) showMakeStep(step);
}
/** 변수 만들기 화면으로(§4.3) — 선택이 없으면 들어갈 수 없다. */
function showMakeScreen(opener?: HTMLElement | null): void {
  if (!(baseline ?? curSel)?.count) { showStatusLine(t('status.noSelection'), { cls: 'warn' }); return; }
  showTab('select');
  showSelSub('make', opener ?? (document.activeElement as HTMLElement | null));
}

TABS.forEach((tb, i) => {
  const btn = $(`tabbtn-${tb}`);
  btn.addEventListener('click', () => showTab(tb));
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
$('btnGoMake').addEventListener('click', (e) => { if (!(baseline ?? curSel).count) return; showMakeScreen(e.currentTarget as HTMLElement); });
$('btnGoRename').addEventListener('click', (e) => { if (!(baseline ?? curSel).count) return; showSelSub('rename', e.currentTarget as HTMLElement); });
$('btnGoComponents').addEventListener('click', (e) => { if (!(baseline ?? curSel).count) return; showSelSub('structure', e.currentTarget as HTMLElement); });
$('btnVarEmptyMake').addEventListener('click', (e) => { if (!curSel.count) return; showMakeScreen(e.currentTarget as HTMLElement); });

/* ---------- #5: 단계 레일 — 한 화면에 한 단계 ---------- */
// 만들기 4단계·적용 3단계. 카드는 마크업의 data-make-step / data-apply-step으로 묶여 있고,
// 레일은 그중 한 묶음만 보여준다.
const MAKE_STEPS = ['color', 'token', 'theme', 'type'] as const;
const APPLY_STEPS = ['bind', 'rename', 'structure'] as const;
type MakeStep = (typeof MAKE_STEPS)[number];
type ApplyStep = (typeof APPLY_STEPS)[number];

function showStep(attr: 'make' | 'apply', step: string): void {
  const key = attr === 'make' ? 'data-make-step' : 'data-apply-step';
  const rail = attr === 'make' ? $('makeRail') : null;
  for (const el of Array.from(document.querySelectorAll<HTMLElement>(`.step[${key}]`))) {
    // 시맨틱 매핑처럼 원래부터 숨은 카드(자동 흡수)는 단계가 맞아도 계속 숨긴다.
    if (el.dataset.alwaysHidden !== undefined) continue;
    el.style.display = el.getAttribute(key) === step ? '' : 'none';
  }
  for (const b of Array.from(rail?.querySelectorAll<HTMLElement>('.step-chip') ?? [])) {
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
const showApplyStep = (s: ApplyStep): void => showSelSub(s);

for (const b of Array.from(document.querySelectorAll<HTMLElement>('#makeRail .step-chip'))) {
  b.addEventListener('click', () => showMakeStep(b.dataset.makeStep as MakeStep));
}
showMakeStep('color');
showStep('apply', 'bind');
// 첫 화면에서는 하위 화면 카드를 숨긴다(§2.1) — 들어갈 때 showSelSub가 보인다.
for (const el of Array.from(document.querySelectorAll<HTMLElement>('.step[data-apply-step]'))) el.style.display = 'none';

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
  /** 하위 메뉴(§4.7 다른 곳에 연결 ▸) — → · 클릭으로 열고 ← · Esc로 닫는다(포커스는 그 항목으로). */
  submenu?: MenuItem[];
}
let menuOnClose: (() => void) | null = null;
let menuEl: HTMLElement | null = null;
let menuSubEl: HTMLElement | null = null;
function closeSubmenu(): void {
  menuSubEl?.remove();
  menuSubEl = null;
}
function closeMenu(): void {
  if (!menuEl) return;
  closeSubmenu();
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
  const m = buildMenu(items, returnFocus, false);
  $('overlayRoot').appendChild(m.el);
  const r = m.el.getBoundingClientRect();
  m.el.style.left = `${Math.max(4, Math.min(x, window.innerWidth - r.width - 4))}px`;
  m.el.style.top = `${Math.max(4, Math.min(y, window.innerHeight - r.height - 4))}px`;
  m.buttons[0]?.focus();
  menuEl = m.el;
}
/** 메뉴 한 장(최상위 · 하위 공통). */
function buildMenu(items: MenuItem[], returnFocus: HTMLElement | undefined, isSub: boolean, parentBtn?: HTMLButtonElement): { el: HTMLElement; buttons: HTMLButtonElement[] } {
  const m = document.createElement('div');
  m.className = 'ctx-menu';
  m.setAttribute('role', 'menu');
  const buttons: HTMLButtonElement[] = [];
  const openSub = (it: MenuItem, b: HTMLButtonElement): void => {
    if (!it.submenu || it.disabled) return;
    closeSubmenu();
    const sub = buildMenu(it.submenu, returnFocus, true, b);
    $('overlayRoot').appendChild(sub.el);
    const br = b.getBoundingClientRect();
    const sr = sub.el.getBoundingClientRect();
    const right = br.right + 2 + sr.width <= window.innerWidth - 4;
    sub.el.style.left = `${right ? br.right + 2 : Math.max(4, br.left - sr.width - 2)}px`;
    sub.el.style.top = `${Math.max(4, Math.min(br.top, window.innerHeight - sr.height - 4))}px`;
    b.setAttribute('aria-expanded', 'true');
    menuSubEl = sub.el;
    sub.buttons[0]?.focus();
  };
  for (const it of items) {
    if (it.separatorBefore) m.appendChild(document.createElement('hr'));
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('role', 'menuitem');
    b.textContent = it.label + (it.submenu ? ' ▸' : '');
    if (it.submenu) { b.setAttribute('aria-haspopup', 'menu'); b.setAttribute('aria-expanded', 'false'); }
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
      if (it.submenu) { openSub(it, b); return; }
      closeMenu();
      if (!it.focusElsewhere) returnFocus?.focus();
      it.onSelect();
    });
    b.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight' && it.submenu) { e.preventDefault(); e.stopPropagation(); openSub(it, b); } });
    m.appendChild(b);
    buttons.push(b);
  }
  m.addEventListener('keydown', (e) => {
    const i = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); buttons[(i + 1) % buttons.length]?.focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); buttons[(i - 1 + buttons.length) % buttons.length]?.focus(); }
    else if (isSub && (e.key === 'ArrowLeft' || e.key === 'Escape')) { e.preventDefault(); e.stopPropagation(); closeSubmenu(); parentBtn?.setAttribute('aria-expanded', 'false'); parentBtn?.focus(); }
    else if (e.key === 'Escape') { e.preventDefault(); closeMenu(); returnFocus?.focus(); }
    else if (e.key === 'Tab') { e.preventDefault(); }
  });
  return { el: m, buttons };
}
document.addEventListener('pointerdown', (e) => { if (menuEl && !menuEl.contains(e.target as Node) && !menuSubEl?.contains(e.target as Node)) closeMenu(); }, true);
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
let deletedUse: { count: number; nodeIds: string[] } = { count: 0, nodeIds: [] };
let vmUsageReq = 0;
/** 사용 수 조회가 응답을 기다리는 중 — 겹쳐 보내지 않고, 창 다시 들어옴은 보류한다. */
let vmUsageInFlight = false;
/** 사용자가 일으킨 읽기(↻·[읽기]·선택 변경)인가 — 칩 숫자 "…"·상태 줄 문구는 이때만(조용한 반영 아님). */
let vmUsageVisible = false;
let vmUsageSig = '';

interface SelInfo { ids: string[]; count: number; scanned: number; name: string }
let curSel: SelInfo = { ids: [], count: 0, scanned: 0, name: '' };
/** 목록 기준(③) — 사용 수를 셀 레이어. 플러그인이 만든 선택은 이것을 바꾸지 않는다. */
let baseline: SelInfo | null = null;

/** 사이드바에서 고른 항목(결정 B). null = 아직 안 정함(처음 규칙). */
let sideSel: SideSel | null = null;
let query = '';
let modeName: string | null = null; // 고른 모드 이름(없으면 각 컬렉션 기본 모드)
/** 키보드 포커스 줄 — 다시 그려도 지킨다. */
let focusKey: string | null = null;

const sameIds = (a: readonly string[], b: readonly string[]): boolean => a.length === b.length && a.every((x, i) => x === b[i]);
const localVarCount = (): number => vmVars.length;

/* ---------- 화면 고르기(§4.2·§4.3) ---------- */
type VarScreen = 'loading' | 'empty' | 'list';
function varScreen(): VarScreen {
  if (!vmTableKnown) return 'loading';
  if (localVarCount() === 0) return 'empty'; // 로컬 변수 0개(컬렉션이 있어도) — §4.6 빈 상태
  return 'list';
}
function renderVarScreen(): void {
  const scr = varScreen();
  $('varLoading').style.display = scr === 'loading' ? '' : 'none';
  $('varEmpty').style.display = scr === 'empty' ? '' : 'none';
  $('varList').style.display = scr === 'list' ? '' : 'none';
  setLock($('btnVarEmptyMake'), curSel.count ? null : 'prereq', t('status.noSelection'));
  if (scr === 'list') renderVarList();
  renderSelHome();
}

/** 변수 첫 화면이 보이는가 = 변수 탭 + 첫 화면. 보이게 될 때 표와 사용 수를 읽는다(부르는 쪽이 read). */
function syncManagerVisibility(read: boolean): void {
  const want = activeTab === 'variables';
  if (want && !vmOpen) {
    vmOpen = true;
    renderVarScreen();
    if (read) { send({ type: 'GET_VAR_TABLE' }); requestManagerUsage('quiet'); }
  } else if (!want && vmOpen) {
    leaveManagerUi();
  }
}
function leaveManagerUi(): void {
  vmOpen = false;
  if (vmUsageTimer) { clearTimeout(vmUsageTimer); vmUsageTimer = null; }
  closeMenu();
  closeModal();
  closeReadiness();
  // 시작 화면 고정(①): 요약을 본 뒤 변수 탭을 떠나면 푼다.
}

/* ---------- 선택과 목록 기준 ---------- */
function onSelectionForList(m: { count: number; scanned: number; ids?: string[]; firstName?: string; selfSelect?: boolean }): void {
  curSel = { ids: m.ids ?? [], count: m.count, scanned: m.scanned, name: m.firstName ?? '' };
  if (m.selfSelect) { renderSelBase(); return; } // 플러그인이 만든 선택 — 기준 유지
  setBaseline(curSel.count ? { ...curSel } : null);
}
function rebaseToCurrent(): void {
  setBaseline(curSel.count ? { ...curSel } : null);
}
function setBaseline(b: SelInfo | null): void {
  baseline = b;
  selFindInFlight = false; // 앞 기준의 찾기는 버린다(응답은 reqId로 걸러진다)
  renderSelBase();
  if (vmUsageTimer) { clearTimeout(vmUsageTimer); vmUsageTimer = null; }
  vmUsageReq = 0;
  vmUsageInFlight = false;
  if (!b && activeTab === 'select' && selSub === 'bind' && !bindLinking) showSelSub('home');
  if (activeTab === 'select' && selSub === 'rename') { if (b && b.scanned <= BIG_SELECTION) scheduleRename(); else renderRenameScreen(); }
  if (activeTab === 'select' && selSub === 'make' && !mkRunning) { if (b && b.scanned <= BIG_SELECTION) scheduleMake(); else renderMakeScreen(); }
  if (!b) {
    usageMap = null;
    libVars = [];
    deletedUse = { count: 0, nodeIds: [] };
    vmUsageSig = '';
    if (vmOpen) renderVarScreen();
    renderSelHome();
    return;
  }
  // 목록은 비우지 않는다 — 응답이 오면 한 번에 바꾼다. 큰 선택·마법사 중이면 자동으로 읽지 않는다.
  if (b.scanned > BIG_SELECTION || wizardRunning) {
    usageMap = null;
    selFindFor = null;
    if (vmOpen) renderVarScreen();
    renderSelHome();
    return;
  }
  usageMap = null; // 새 기준 — 카드는 "읽는 중"(§4.1 상태 4)
  renderSelHome();
  if (!usageVisible() || isMini) return; // 보이지 않으면 들어올 때 읽는다
  vmUsageTimer = setTimeout(() => { vmUsageTimer = null; requestManagerUsage('selection'); readSelFind(); }, AUTO_SCAN_DELAY);
}
let vmUsageTimer: ReturnType<typeof setTimeout> | null = null;

/** 사용 수 요청 — why: quiet(진입·창 다시 들어옴) / work(작업 직후) / selection(선택 변경) / user(↻·[읽기]). */
function requestManagerUsage(why: 'quiet' | 'work' | 'selection' | 'user' = 'quiet'): void {
  if (!baseline) {
    usageMap = null;
    if (vmOpen) renderVarScreen();
    renderSelHome();
    return;
  }
  const auto = why !== 'user';
  if (auto && (baseline.scanned > BIG_SELECTION || wizardRunning)) {
    if (vmOpen) renderVarScreen();
    renderSelHome();
    return;
  }
  if (vmUsageInFlight && why !== 'user') return; // 같은 종류의 직전 요청이 아직 끝나지 않았다(보류)
  vmUsageReq = ++bindReqSeq;
  vmUsageInFlight = true;
  vmUsageVisible = why === 'selection' || why === 'user';
  if (vmUsageVisible && vmOpen && varScreen() === 'list') renderVarList();
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
  // 조용한 반영 — 응답이 이전과 같으면 다시 그리지 않는다(스크롤·포커스 행 유지).
  const sig = JSON.stringify([msg.usage, msg.libraryVars.map((l) => l.id), msg.deleted.count]);
  const changed = sig !== vmUsageSig || usageMap === null;
  vmUsageSig = sig;
  if (changed) {
    usageMap = new Map(Object.entries(msg.usage));
    libVars = msg.libraryVars;
    deletedUse = msg.deleted;
  }
  if (changed || wasVisible) renderVarScreen();
  renderSelHome();
  reentry.release();
}

function onVarTable(msg: Extract<CodeToUi, { type: 'VAR_TABLE' }>): void {
  const sig = JSON.stringify([msg.collections, msg.vars]);
  const edRebase = !!ed?.saving?.awaitingTable;
  const first = !vmTableKnown;
  vmTableKnown = true;
  if (sig === vmTableSig && !first) {
    if (edRebase) edOnVarTable(msg); // 고치기 저장 뒤 첫 표는 직전과 같아도 팝업 base를 새로 잡는다(§4.4 고치기)
    return;
  }
  vmTableSig = sig;
  vmCols = msg.collections;
  vmVars = msg.vars;
  if (vmOpen || first) renderVarScreen();
  if (edRebase) edOnVarTable(msg); // 목록을 새 표로 그린 뒤(이름 검사 · 후보도 새 표로)
  runAfterTable(); // 새 변수 · 복제 · 삭제 뒤 포커스 · 상세(§4.9)
}

/* ---------- 목록 기준 다름(§4.1 · §4.4) — 상황 안내 줄 맨 앞 ---------- */
/** 목록 기준이 지금 선택과 다른가(지금 선택이 없을 때도 포함). */
function baseDiffers(): boolean {
  return !!baseline && !!curSel && !sameIds(baseline.ids, curSel.ids);
}
/** 목록 기준이 바뀌거나 선택이 바뀌면 상황 안내 줄(목록)과 시작 화면의 기준 줄을 다시 그린다. */
function renderSelBase(): void {
  if (!vmCols) return; // 첫 화면 전(초기화 순서)
  renderSelHome();
}
/** [기준 바꾸기](§2.5) — 지금 선택을 기준으로 삼고 읽는다. 버튼이 사라지면 첫 카드 버튼(없으면 [이름 정리])으로. */
function doRebase(): void {
  rebaseToCurrent();
  ($('selCards').querySelector<HTMLElement>('button') ?? $('btnGoMake')).focus();
}

/* ---------- 칩 줄 ---------- */
/* ---------- 사이드바(결정 B, §4.4) ---------- */
/** 지금 고른 컬렉션(IA v4 §4.6) — 처음에는 첫 컬렉션, 사라지면 첫 컬렉션. */
function currentSel(): SideSel {
  const sides = sidebarCollections(vmCols, vmVars, null, new Set());
  const cur = sideSel;
  if (!cur || cur.kind !== 'col' || !sides.some((x) => x.collection.id === cur.id)) {
    const first = sides[0];
    if (cur && document.activeElement?.closest('#varSide') && first) focusSideKey = `side:col:${first.collection.id}`;
    sideSel = first ? { kind: 'col', id: first.collection.id } : { kind: 'inspect' };
  }
  return sideSel!;
}
let focusSideKey: string | null = null;
function pickSide(sel: SideSel, focus = true): void {
  if (query) clearSearch(false); // 검색 중에 사이드바를 누르면 검색을 지우고 그 항목(§4.4)
  sideSel = sel;
  focusSideKey = focus ? `side:${sideSelKey(sel)}` : null;
  focusKey = null;
  renderVarList();
}
function renderSidebar(sel: SideSel): void {
  // IA v4 §4.6 — 로컬 컬렉션만(listbox, 정지점 1개). 그룹 · ★ Inspect · LIB · 삭제된 변수 항목은 없다.
  const nav = $('varSide');
  nav.setAttribute('role', 'listbox');
  const hadFocus = nav.contains(document.activeElement) ? (document.activeElement as HTMLElement).dataset.key ?? null : null;
  clearMount(nav);
  const sides = sidebarCollections(vmCols, vmVars, null, new Set());
  const selKey = query.trim() ? '' : sideSelKey(sel);
  for (const side of sides) {
    const c = side.collection;
    const key = `col:${c.id}`;
    const d = document.createElement('div');
    d.className = 'vs-item lv1';
    d.dataset.key = `side:${key}`;
    d.setAttribute('role', 'option');
    d.setAttribute('aria-selected', String(selKey === key));
    const badge = tierBadge(c);
    const why = tierWhyText(c);
    d.setAttribute('aria-label', t('list.sideColAria', { name: c.name, badge, num: String(side.total) }) + (why ? `, ${why}` : ''));
    d.tabIndex = -1;
    const b = document.createElement('span');
    b.className = 'vs-badge';
    b.setAttribute('aria-hidden', 'true');
    b.textContent = badge;
    if (why) b.title = why; // 계층 판단 근거(§4.4 — 사이드바 배지에만)
    const nm = document.createElement('span');
    nm.className = 'vs-name';
    nm.textContent = c.name;
    d.title = c.name;
    const n = document.createElement('span');
    n.className = 'vs-num';
    n.textContent = String(side.total);
    d.append(b, nm, n);
    const pick = (): void => pickSide({ kind: 'col', id: c.id });
    d.addEventListener('click', pick);
    d.addEventListener('keydown', (ev) => sideKey(ev, d, pick));
    nav.appendChild(d);
  }
  const items = Array.from(nav.querySelectorAll<HTMLElement>('.vs-item'));
  const want = focusSideKey ?? hadFocus;
  const target = (want && items.find((x) => x.dataset.key === want)) || items.find((x) => x.getAttribute('aria-selected') === 'true') || items[0];
  if (target) target.tabIndex = 0;
  if (want && target && (focusSideKey || hadFocus)) target.focus({ preventScroll: true });
  focusSideKey = null;
}
/** 사이드바 키(listbox — ↑↓ · Home/End · Enter/Space). */
function sideKey(ev: KeyboardEvent, el: HTMLElement, pick: () => void): void {
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
  else if (k === 'Enter' || k === ' ') pick();
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
  if (names.length <= 1) { sel.hidden = true; return; }
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

/* ---------- 목록(IA v4 §4.6) — Global 팔레트(알약 · 동그라미) · 그 밖은 줄 ---------- */
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
/** 값 표시(상세 · 라이브러리 상세용) — 별칭은 "→ 이름". */
function valueEl(cell: VarCell | undefined): HTMLElement {
  const span = document.createElement('span');
  span.className = 'val';
  if (!cell) { span.textContent = '—'; return span; }
  if (cell.kind === 'alias') span.innerHTML = `${swatchHtml(resolveSwatch(cell))}→ ${escapeHtml(cell.aliasName)}${cell.remote ? ' <span class="lib-tag">LIB</span>' : ''}`;
  else if (cell.kind === 'color') span.innerHTML = `${swatchHtml(cell.hex)}${escapeHtml(cell.hex.toUpperCase())}`;
  else span.textContent = cell.text;
  return span;
}
/** 알약 · 줄의 값 글(§4.6) — 숫자 소수 둘째 자리, 참거짓 true/false, 별칭은 "→ {대상 끝 이름}". */
function cellText(cell: VarCell | undefined): string {
  if (!cell) return '—';
  if (cell.kind === 'alias') return `→ ${leafName(cell.aliasName)}`;
  if (cell.kind === 'color') return cell.hex.toUpperCase();
  if (cell.kind === 'number') { const n = Number(cell.text); return Number.isFinite(n) ? String(Math.round(n * 100) / 100) : cell.text; }
  return cell.text;
}
/** 툴팁 · 접근성 이름의 값 — 별칭은 전체 이름. */
function cellTipText(cell: VarCell | undefined): string {
  if (!cell) return '—';
  if (cell.kind === 'alias') return `→ ${cell.aliasName}`;
  return cellText(cell);
}

/** 오른쪽에 지금 보이는 컬렉션(모드 메뉴 범위). */
let lastRightCols: string[] = [];
/** 접은 그룹(`{collectionId}|{경로}`) — 세션 동안 기억. */
const grpCollapsed = new Set<string>();
/** 색 보기 — 목록(기본) · 격자. 기억(이 창의 저장소, 실패하면 메모리만). */
let colorView: 'list' | 'grid' = (() => { try { return localStorage.getItem('dsl.colorView') === 'grid' ? 'grid' : 'list'; } catch { return 'list'; } })();
function setColorView(v: 'list' | 'grid'): void {
  colorView = v;
  try { localStorage.setItem('dsl.colorView', v); } catch { /* 저장 못 하면 이번 창만 */ }
  renderVarList();
}

function renderVarList(): void {
  if (!vmOpen || varScreen() !== 'list') return;
  const sel = currentSel();
  renderSidebar(sel);
  const tree = $('varTree');
  const prevScroll = window.scrollY;
  const hadFocus = tree.contains(document.activeElement);
  clearMount(tree);
  const searching = !!query.trim();
  $('varSide').classList.toggle('dim', searching);
  ($('btnSearchClear') as HTMLElement).hidden = !query;
  const colId = sel.kind === 'col' ? sel.id : null;
  const groups = paletteGroups(vmCols, vmVars, colId, query);
  lastRightCols = searching ? [...new Set(groups.map((g) => g.collectionId))] : colId ? [colId] : [];
  const lines: HTMLElement[] = [];
  for (const g of groups) {
    const col = vmCols.find((c) => c.id === g.collectionId);
    const open = !grpCollapsed.has(g.key);
    if (g.head) lines.push(groupHeadEl(g, open));
    if (!open) continue;
    if (col?.tier === 1) {
      const colors = g.rows.filter((v) => v.type === 'COLOR');
      const others = g.rows.filter((v) => v.type !== 'COLOR');
      if (others.length) lines.push(paletteLineEl(others, 'pill'));
      if (colors.length) lines.push(paletteLineEl(colors, colorView === 'grid' ? 'dot' : 'swatch'));
    } else for (const v of g.rows) lines.push(varRowEl(v));
  }
  if (!groups.length) {
    const d = document.createElement('div');
    d.className = 'vt-empty';
    if (searching) {
      d.append(t('list.noMatch', { q: query.trim() }), ' · ');
      const b = document.createElement('button');
      b.className = 'link link-btn';
      b.type = 'button';
      b.textContent = t('list.searchClear');
      b.addEventListener('click', () => clearSearch(true));
      d.appendChild(b);
    } else d.textContent = t('v4.colEmpty');
    lines.push(d);
  }
  renderModeSelect();
  tree.append(...lines);
  // 키보드: 정지점 1개(roving tabindex). 포커스 항목이 빠지면 첫 항목으로.
  const focusables = gridItems();
  let target = focusKey ? focusables.find((x) => x.dataset.key === focusKey) : undefined;
  for (const f of focusables) f.tabIndex = -1;
  target = target ?? focusables[0];
  target?.setAttribute('tabindex', '0');
  if (target && hadFocus) target.focus({ preventScroll: true });
  if (Math.abs(window.scrollY - prevScroll) > 1) window.scrollTo(0, prevScroll);
}
/** 오른쪽 목록의 포커스 가능한 것(그룹 머리 · 줄 · 알약 · 동그라미), 화면 순서. */
function gridItems(): HTMLElement[] {
  return Array.from($('varTree').querySelectorAll<HTMLElement>('[data-key]'));
}
/** 그룹 머리 — [▾/▸] + 경로. Enter · Space · 클릭 = 접기 · 펼치기. */
function groupHeadEl(g: PaletteGroup, open: boolean): HTMLElement {
  const d = document.createElement('div');
  d.className = 'vt-group';
  d.dataset.key = `g:${g.key}`;
  d.setAttribute('role', 'row');
  d.setAttribute('aria-expanded', String(open));
  const tw = document.createElement('span');
  tw.className = 'tw';
  tw.setAttribute('aria-hidden', 'true');
  tw.textContent = open ? '▾' : '▸';
  const lb = document.createElement('span');
  lb.className = 'lb';
  lb.textContent = g.label;
  d.title = g.label;
  d.append(tw, lb);
  const toggle = (): void => {
    if (open) grpCollapsed.add(g.key); else grpCollapsed.delete(g.key);
    focusKey = d.dataset.key ?? null;
    renderVarList();
    gridItems().find((x) => x.dataset.key === focusKey)?.focus();
  };
  d.addEventListener('click', toggle);
  d.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); toggle(); return; }
    gridKey(ev, d);
  });
  return d;
}
/** Global 팔레트 한 줄 — 알약(숫자 · 글자 · 참거짓) · 동그라미(색 목록 = 동그라미 + 끝 이름, 격자 = 동그라미만). */
function paletteLineEl(rows: VarRow[], mode: 'pill' | 'swatch' | 'dot'): HTMLElement {
  const line = document.createElement('div');
  line.className = `vp-line vp-${mode}`;
  line.setAttribute('role', 'row');
  for (const v of rows) {
    const cell = currentModeCell(v);
    const b = document.createElement('div');
    b.className = 'vp-item';
    b.dataset.key = `v:${v.id}`;
    b.dataset.id = v.id;
    b.setAttribute('role', 'gridcell');
    const tip = `${v.name} / ${cellTipText(cell)}`;
    b.title = tip;
    b.setAttribute('aria-label', `${v.name}, ${cellTipText(cell)}`);
    if (mode === 'pill') b.textContent = cellText(cell);
    else {
      const dot = document.createElement('span');
      dot.className = 'vp-dot';
      dot.style.background = resolveSwatch(cell) ?? 'transparent';
      b.appendChild(dot);
      if (mode === 'swatch') {
        const nm = document.createElement('span');
        nm.className = 'vp-name';
        nm.textContent = leafName(v.name);
        b.appendChild(nm);
      }
    }
    wireItem(b, v);
    line.appendChild(b);
  }
  return line;
}
/** Semantic · Component · 계층 아님 — 줄(끝 이름 · 값 알약 180px). */
function varRowEl(v: VarRow): HTMLElement {
  const d = document.createElement('div');
  d.className = 'vt-row';
  d.dataset.key = `v:${v.id}`;
  d.dataset.id = v.id;
  d.setAttribute('role', 'row');
  const cell = currentModeCell(v);
  const nm = document.createElement('span');
  nm.className = 'nm';
  nm.textContent = leafName(v.name);
  const val = document.createElement('span');
  val.className = 'vr-val';
  const pill = document.createElement('span');
  pill.className = `vr-pill${cell?.kind === 'alias' ? ' alias' : ''}`;
  pill.innerHTML = `${v.type === 'COLOR' ? swatchHtml(resolveSwatch(cell)) : ''}${escapeHtml(cellText(cell))}`;
  val.appendChild(pill);
  d.title = `${v.name} / ${cellTipText(cell)}`;
  d.setAttribute('aria-label', `${v.name}, ${cellTipText(cell)}`);
  d.append(nm, val);
  wireItem(d, v);
  return d;
}

/* ---------- 조작(§4.6 조작 표) ---------- */
function wireItem(el: HTMLElement, v: VarRow): void {
  // 더블클릭 = 클릭과 같고 연결은 한 번 — 두 번째 click(detail > 1)은 버린다.
  el.addEventListener('click', (e) => {
    focusKey = el.dataset.key ?? null;
    gridItems().forEach((x) => (x.tabIndex = -1));
    el.tabIndex = 0;
    if (e.detail > 1) return;
    applyVar(v);
  });
  el.addEventListener('contextmenu', (e) => { e.preventDefault(); openVarMenuFor(v, el, e.clientX, e.clientY); });
  el.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') { ev.preventDefault(); openDetail({ local: v }, el); return; }
    if (ev.key === ' ') { ev.preventDefault(); applyVar(v); return; }
    if (ev.key === 'ContextMenu' || (ev.key === 'F10' && ev.shiftKey)) { ev.preventDefault(); openVarMenuFor(v, el); return; }
    gridKey(ev, el);
  });
  // 키보드 포커스에도 툴팁 내용을 띄운다(§4.6).
  el.addEventListener('focus', () => { if (el.matches(':focus-visible')) showItemTip(el); });
  el.addEventListener('blur', hideItemTip);
}
let itemTip: HTMLElement | null = null;
function showItemTip(el: HTMLElement): void {
  hideItemTip();
  const tip = document.createElement('div');
  tip.className = 'vt-tip';
  tip.setAttribute('aria-hidden', 'true');
  tip.textContent = el.title;
  $('overlayRoot').appendChild(tip);
  const r = el.getBoundingClientRect();
  const w = tip.offsetWidth;
  tip.style.left = `${Math.max(4, Math.min(r.left, window.innerWidth - w - 4))}px`;
  tip.style.top = `${r.bottom + 4 + tip.offsetHeight > window.innerHeight - 24 ? r.top - tip.offsetHeight - 4 : r.bottom + 4}px`;
  itemTip = tip;
}
function hideItemTip(): void {
  itemTip?.remove();
  itemTip = null;
}

/** 오른쪽 목록 키(§4.6 키보드) — ↑↓ 줄 사이(알약 · 동그라미 줄은 같은 열에 가까운 것), ←→ 줄 안, Home/End, PageUp/Down, Esc. */
function gridKey(ev: KeyboardEvent, el: HTMLElement): void {
  const all = gridItems();
  const lineOf = (x: HTMLElement): HTMLElement => (x.closest('.vp-line') as HTMLElement | null) ?? x;
  const lines: HTMLElement[] = [];
  for (const x of all) { const l = lineOf(x); if (!lines.includes(l)) lines.push(l); }
  const itemsIn = (l: HTMLElement): HTMLElement[] => (l.matches('[data-key]') ? [l] : Array.from(l.querySelectorAll<HTMLElement>('[data-key]')));
  const go = (target: HTMLElement | undefined): void => {
    if (!target) return;
    all.forEach((x) => (x.tabIndex = -1));
    target.tabIndex = 0;
    focusKey = target.dataset.key ?? null;
    target.focus();
  };
  const toLine = (j: number): void => {
    const l = lines[Math.max(0, Math.min(lines.length - 1, j))];
    if (!l) return;
    const cx = el.getBoundingClientRect().left + el.getBoundingClientRect().width / 2;
    const items = itemsIn(l);
    let best = items[0];
    let bd = Infinity;
    for (const it of items) { const r = it.getBoundingClientRect(); const d = Math.abs(r.left + r.width / 2 - cx); if (d < bd) { bd = d; best = it; } }
    go(best);
  };
  const li = lines.indexOf(lineOf(el));
  const inLine = itemsIn(lineOf(el));
  const ii = inLine.indexOf(el);
  const k = ev.key;
  if (k === 'ArrowDown') toLine(li + 1);
  else if (k === 'ArrowUp') toLine(li - 1);
  else if (k === 'ArrowRight' && ii >= 0 && inLine.length > 1) go(inLine[Math.min(inLine.length - 1, ii + 1)]);
  else if (k === 'ArrowLeft' && ii >= 0 && inLine.length > 1) go(inLine[Math.max(0, ii - 1)]);
  else if (k === 'Home') go(all[0]);
  else if (k === 'End') go(all[all.length - 1]);
  else if (k === 'PageDown') toLine(li + 10);
  else if (k === 'PageUp') toLine(li - 10);
  else if (k === 'Escape' && query) clearSearch(true);
  else return;
  ev.preventDefault();
}

/* ---------- 클릭 연결(§4.7) ---------- */
let applyVarReq = 0;
/** 쓰기 작업 잠금 사유(§4.6 쓰기 잠금) — 없으면 null. */
function writeLockReason(): string | null {
  if (bindLinking) return t('bind.waitLink');
  const other = otherWriteOp();
  return other ? t('bind.waitOp', { op: other }) : null;
}
function applyVar(v: VarRow, target?: ApplyTarget): void {
  const lock = writeLockReason();
  if (lock) { showStatusLine(lock, { cls: 'warn' }); return; }
  if (!curSel.count) { showStatusLine(t('status.noSelection'), { cls: 'warn' }); return; }
  if (!target && varKind(v) === 'other') { showStatusLine(t('apply.otherKind'), { cls: 'warn' }); return; }
  applyVarReq = ++bindReqSeq;
  send({ type: 'APPLY_VARIABLE', reqId: applyVarReq, id: v.id, ...(target ? { target } : {}) });
}
function onVariableApplied(msg: Extract<CodeToUi, { type: 'VARIABLE_APPLIED' }>): void {
  if (msg.reqId !== applyVarReq) return;
  const tip = Object.entries(msg.skipReasons).filter(([, n]) => n > 0).map(([k, n]) => `${t('apply.reason.' + k)} ${n}`).join(' · ');
  if (!msg.applied) { showStatusLine(t('apply.none', { name: msg.name }), { cls: 'warn', tip }); return; }
  showStatusLine(t('apply.done', { n: msg.applied, name: msg.name }) + (msg.skipped ? t('apply.skipped', { m: msg.skipped }) : '') + t('apply.undo'), { cls: msg.skipped ? 'warn' : 'ok', tip });
}

/* ---------- 행 메뉴(§4.6 우클릭) ---------- */
function openVarMenuFor(v: VarRow, el: HTMLElement, x?: number, y?: number): void {
  const r = el.getBoundingClientRect();
  el.classList.add('menu-open');
  const kind = varKind(v);
  const targets = APPLY_TARGETS[kind] ?? [];
  const items: MenuItem[] = [];
  if (targets.length) {
    const sub: MenuItem[] = targets.map((tg) => {
      const ok = targetAllowed(v.scopes, tg);
      return { label: t('apply.t.' + tg), disabled: !ok, note: ok ? undefined : t('apply.notInScope'), onSelect: () => applyVar(v, tg) };
    });
    items.push({ label: t('apply.elsewhere'), submenu: sub, disabled: !curSel.count, note: curSel.count ? undefined : t('status.noSelection'), onSelect: () => {} });
  }
  items.push({ label: t('vm.detail'), onSelect: () => openDetail({ local: v }, el), focusElsewhere: true });
  const limit = manualLimitReason();
  items.push({ label: t('vm.duplicate'), disabled: !!limit, note: limit ?? undefined, onSelect: () => duplicateVar(v) });
  items.push({ label: t('vm.delete'), separatorBefore: true, onSelect: () => confirmDeleteVar(v, el), focusElsewhere: true });
  openMenu(x ?? r.left + 24, y ?? r.bottom, items, el, () => el.classList.remove('menu-open'));
}

/* ---------- 검색 ---------- */
function clearSearch(render = true): void {
  query = '';
  ($('varSearch') as HTMLInputElement).value = '';
  if (render) { renderVarList(); ($('varSearch') as HTMLElement).focus(); }
}

/* ---------- 상세 팝업 · 고치기(§4.4 상세 팝업 · 고치기, PR 3.5) ---------- */
let detailReq = 0;
let detailBox: HTMLElement | null = null;
let detailUsesEl: HTMLElement | null = null;

/** 상세를 연 자리(§4.8) — 선택 탭 카드 2의 줄이면 닫은 뒤 그리로. */
let detailReturn: HTMLElement | null = null;
/** 상세를 변수 탭 목록에서 열었나 — 다시 그린 뒤 원래 요소가 떨어져 있어도 변수 탭 규칙을 쓴다. */
let detailFromVars = true;
/** 닫은 뒤 포커스(§4.8) — 연 곳이 선택 탭이면 그 줄, 변수 탭이면 그 변수(새 자리). 보이지 않으면 첫 항목 + present=false. */
function focusAfterDetail(id: string): { el: HTMLElement; present: boolean } {
  const ret = detailReturn;
  if (ret && !detailFromVars) {
    if (document.body.contains(ret) && ret.offsetParent) return { el: ret, present: true };
    return { el: $('selCards').querySelector<HTMLElement>('button') ?? $('btnGoMake'), present: false };
  }
  const items = gridItems();
  const hit = items.find((x) => x.dataset.key === `v:${id}`);
  const el = hit ?? items[0] ?? $('varSearch');
  items.forEach((x) => (x.tabIndex = -1));
  el.tabIndex = 0;
  focusKey = el.dataset.key ?? null;
  return { el, present: !!hit };
}

/** "쓰인 곳"(§4.8) — 목록 기준 안에서 **직접 연결만**(FIND_VAR_USERS에 그 변수 id 하나). run()은 다시 찾기(값이 바뀐 뒤). */
let detailVarId: string | null = null;
function usesBlock(id: string): { box: HTMLElement; list: HTMLElement; run: () => void } {
  const usesBox = document.createElement('div');
  usesBox.className = 'var-uses';
  const usesList = document.createElement('div');
  usesBox.appendChild(usesList);
  const findUses = (): void => {
    if (!baseline) return;
    detailReq = ++bindReqSeq;
    detailVarId = id;
    usesList.textContent = t('common.running');
    send({ type: 'FIND_VAR_USERS', reqId: detailReq, varIds: [id], nodeIds: baseline.ids, limit: DETAIL_LIMIT });
  };
  const run = (): void => {
    clearMount(usesList);
    if (!baseline) usesList.textContent = t('detail.usesNoSel');
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
function openDetail(ref: RowRef, returnEl: HTMLElement, focusName = false): void {
  detailReturn = returnEl;
  detailFromVars = $('varTree').contains(returnEl);
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
  const close = modalButton(t('common.close'), () => requestCloseModal('button'), true);
  const box = openModal(title, body, [close], () => focusAfterDetail(l.id).el, undefined, { focus: close });
  detailBox = box;
  detailUsesEl = uses.list;
  uses.run();
}

function onVarUsers(msg: Extract<CodeToUi, { type: 'VAR_USERS' }>): void {
  if (msg.reqId !== detailReq || !detailUsesEl || !detailBox || !modalEl) return;
  const box = detailUsesEl;
  clearMount(box);
  // 머리 "{n}곳 · [모두 선택]"(§4.8) — n = 0이면 [모두 선택]은 aria-disabled.
  const head = document.createElement('div');
  head.className = 'uses-head';
  const cnt = document.createElement('span');
  cnt.textContent = t('v4.places', { n: msg.places });
  cnt.title = t('v4.usesTip');
  const all = document.createElement('button');
  all.type = 'button';
  all.className = 'link link-btn';
  all.textContent = t('detail.selectAll');
  const id = detailVarId;
  if (!msg.places || !id) setLock(all, 'prereq', t('vm.dNoUses'));
  all.addEventListener('click', () => { if (id && msg.places && !isLocked(all)) selectVarUsers([id]); });
  head.append(cnt, ' · ', all);
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
function selectVarUsers(varIds: string[]): void {
  if (!baseline) return;
  selectStatusTarget = 'list';
  send({ type: 'SELECT_VAR_USERS', varIds, nodeIds: baseline.ids });
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
  /** 별칭 고르개(§4.8) — selfScopes: 용도 거르기의 자기 용도, other: "용도가 다른 변수도 보기" 켬. */
  picker: { modeId: string; query: string; selfScopes: string[]; other: boolean } | null;
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
  /** 새 변수 팝업(§4.9) — 있으면 [만들기]가 CREATE_VARIABLE을 보낸다. */
  create?: { collectionId?: string; label: string; opener: HTMLElement | null; reqId: number | null };
  /** 새 변수의 용도(별칭 고르개의 자기 용도, §4.8) — 고르개를 열 때 지금 이름 칸으로. */
  newScopes?: () => string[];
  /** [→] 이동을 닫기 전 확인 뒤에 한다(§4.8). */
  pendingJump?: string | null;
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
  const showCh = !e.create && n.changed && n.err !== t('edit.nameEmptySeg');
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
  // 새 변수 팝업(§4.9)은 늘 [취소] [만들기] — 입력 검사는 [만들기]를 누를 때(edCreate).
  e.btnClose.textContent = e.create || st.changed ? t('common.cancel') : t('common.close');
  e.btnSave.textContent = e.create ? (e.create.reqId ? t('newVar.creating') : t('newVar.create')) : saving ? t('edit.savingBtn') : t('edit.save');
  // 연결 중에도 잠근다(§4.6 "연결 중의 다른 일") — 툴팁 꼬리 · 누르면 팝업 안 알림 줄에 bind.waitLink.
  const locked = e.create ? !!e.create.reqId || bindLinking !== 0 : saving || !!e.sticky || !st.changed || st.hasErr || bindLinking !== 0;
  if (locked) { e.btnSave.setAttribute('aria-disabled', 'true'); e.btnSave.dataset.lock = 'edit'; }
  else { e.btnSave.removeAttribute('aria-disabled'); delete e.btnSave.dataset.lock; }
  e.btnSave.title = bindLinking ? t('bind.waitLink') : '';
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
  if (bindLinking) e.event = { text: t('bind.waitLink'), err: false }; // 연결 중(§4.6 "연결 중의 다른 일")
  else if (!st.changed) e.event = { text: t('edit.noChange'), err: false };
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
  // 고르개가 열려 있으면 [▾]에서 누른 Esc도 고르개만 닫는다(§4.8).
  dd.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && ed?.picker?.modeId === f.modeId) { ev.preventDefault(); ev.stopPropagation(); edClosePicker(true); } });
  wrap.appendChild(dd);
  f.ddBtn = dd;
  // [→] 가리키는 변수로(§4.8) — 별칭이고 대상이 삭제되지 않았을 때.
  if (f.mode === 'alias' && f.aliasId && !edTarget(f, f.aliasId).deleted) {
    const go = document.createElement('button');
    go.type = 'button';
    go.className = 'ed-go';
    go.textContent = '→';
    go.title = t('edit.goTarget');
    go.setAttribute('aria-label', t('edit.goTarget'));
    const target = f.aliasId;
    go.addEventListener('click', () => edGoTarget(target));
    wrap.appendChild(go);
  }
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
  if (open) {
    // 층은 [▾] 바로 뒤(DOM 순서) — 층 안 순서: [▾] → 검색 → 목록 → 링크 → [→].
    const layer = edPicker(f);
    const goBtn = wrap.querySelector('.ed-go');
    if (goBtn) wrap.insertBefore(layer, goBtn); else wrap.appendChild(layer);
    edPlacePicker(f, layer);
  }
}

/** 고르개 열기 · 닫기 — 한 번에 하나만. */
function edTogglePicker(f: EdField): void {
  const e = ed;
  if (!e || e.saving) return;
  const prev = e.picker ? e.fields.find((x) => x.modeId === e.picker!.modeId) : undefined;
  if (prev === f) { edClosePicker(true); return; }
  // 지금 대상이 용도만 다르면(규칙 안) 처음부터 "용도가 다른 변수도 보기"를 켠 채 연다(§4.8).
  const selfScopes = e.newScopes ? e.newScopes() : e.v.scopes;
  const cur = f.mode === 'alias' && f.aliasId ? vmVars.find((x) => x.id === f.aliasId) : undefined;
  const inRules = !!cur && aliasCandidates(e.v, vmCols, vmVars).groups.some((g) => g.rows.some((r) => r.id === cur.id));
  e.picker = { modeId: f.modeId, query: '', selfScopes, other: !!cur && inRules && !scopeFits(selfScopes, cur.scopes) };
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
  const pk = e.picker!;
  // 덮는 층(§4.8) — 값 칸 dd(position: relative) 안 absolute. 고정은 검색 칸 · 링크뿐, 그 사이가 스크롤 영역.
  const el = document.createElement('div');
  el.className = 'ed-picker';
  const search = document.createElement('input');
  search.type = 'text';
  search.className = 'ed-psearch';
  search.placeholder = t('edit.pickSearch');
  search.setAttribute('aria-label', t('edit.pickSearch'));
  search.value = pk.query;
  const body = document.createElement('div');
  body.className = 'ed-pbody';
  const lb = document.createElement('div');
  lb.setAttribute('role', 'listbox');
  lb.setAttribute('aria-label', t('edit.pickAria', { mode: f.modeName }));
  const notes = document.createElement('div');
  body.append(lb, notes);
  const link = document.createElement('button');
  link.type = 'button';
  link.className = 'ed-plink';
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
      if (ev.key === 'ArrowDown') { if (i >= opts.length - 1 && !link.hidden) link.focus(); else opts[Math.min(opts.length - 1, i + 1)]?.focus(); }
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
    const q = pk.query;
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
    let hidden = 0;
    if (all.global) {
      const d = document.createElement('div');
      d.className = 'ed-pnone';
      d.textContent = t('edit.pickGlobal');
      lb.appendChild(d);
    } else {
      const cands = aliasCandidates(e.v, vmCols, vmVars, q);
      let shown = 0;
      for (const g of cands.groups) {
        const rows = g.rows.filter((r) => {
          const fit = scopeFits(pk.selfScopes, r.scopes);
          if (!fit) hidden++;
          return fit || pk.other;
        });
        if (!rows.length) continue;
        const h = document.createElement('div');
        h.className = 'ed-phead';
        h.setAttribute('role', 'presentation');
        h.textContent = g.label;
        lb.appendChild(h);
        for (const r of rows) {
          const col = vmCols.find((c) => c.id === r.collectionId);
          const cell = r.values[col?.defaultModeId ?? col?.modes[0]?.modeId ?? ''];
          const other = !scopeFits(pk.selfScopes, r.scopes);
          lb.appendChild(option('', `${valHtml(cell)}${escapeHtml(leafName(r.name))}${other ? ` <span class="ed-ptag">${escapeHtml(t('edit.pickOtherScope'))}</span>` : ''}${r.id === curId ? '<span class="ck">✓</span>' : ''}`, r.name, () => edPick(f, r.id), r.id === curId));
          shown++;
        }
      }
      if (!shown) {
        const d = document.createElement('div');
        d.className = 'ed-pnone';
        d.textContent = t('edit.pickNoMatch');
        lb.appendChild(d);
      }
    }
    if (curId && !inRules) note(t('edit.pickOutOfRules'));
    if (all.allTiers) note(t('edit.pickAllTiers'));
    if (!all.global) note(t('edit.pickNoLib'));
    // 링크(§4.8) — 숨긴 후보가 있을 때만. 켠 상태면 "용도가 맞는 변수만 보기".
    link.hidden = !pk.other && hidden === 0;
    link.textContent = pk.other ? t('edit.pickShowFit') : t('edit.pickShowOther', { n: hidden });
    opts.forEach((o, i) => (o.tabIndex = i === 0 ? 0 : -1));
  };
  link.addEventListener('click', () => {
    pk.other = !pk.other;
    render();
    link.focus();
  });
  link.addEventListener('keydown', (ev) => { if (ev.key === 'ArrowUp') { ev.preventDefault(); opts[opts.length - 1]?.focus(); } });
  search.addEventListener('input', () => {
    pk.query = search.value;
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
  el.append(search, body, link);
  return el;
}
/** 층 높이 · 방향(§4.8) — 팝업 본문(.m-scroll)의 보이는 영역 기준. 열 때 한 번. */
const PICKER_MAX = 240;
const PICKER_MIN = 124;
function edPlacePicker(f: EdField, el: HTMLElement): void {
  const field = f.dd.querySelector<HTMLElement>('.ed-field');
  const scroller = f.dd.closest<HTMLElement>('.m-scroll');
  if (!field || !scroller) return;
  const fr = field.getBoundingClientRect();
  const sr = scroller.getBoundingClientRect();
  const below = sr.bottom - fr.bottom - 4;
  const above = fr.top - sr.top - 4;
  let up = false;
  let h = PICKER_MAX;
  if (below >= PICKER_MAX) up = false;
  else if (above >= PICKER_MAX) up = true;
  else { up = above > below; h = Math.max(PICKER_MIN, Math.min(PICKER_MAX, up ? above : below)); }
  el.style.maxHeight = `${h}px`;
  if (up) { el.style.bottom = `${f.dd.offsetHeight - field.offsetTop + 2}px`; el.style.top = 'auto'; }
  else { el.style.top = `${field.offsetTop + field.offsetHeight + 2}px`; el.style.bottom = 'auto'; }
  el.classList.toggle('up', up);
  // 최소 높이로도 잘리면 층이 다 보이게 본문을 스크롤한다.
  const er = el.getBoundingClientRect();
  if (er.top < sr.top || er.bottom > sr.bottom) el.scrollIntoView({ block: 'nearest' });
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
function openEditor(v: VarRow, focusName: boolean, create?: { collectionId?: string; label: string; opener: HTMLElement | null }): void {
  const col = vmCols.find((c) => c.id === v.collectionId);
  // 제목 줄 — 이름 + 오른쪽 [⧉ 이름 복사](§4.8). 새 변수는 복사 단추 없음.
  const titleWrap = document.createElement('span');
  titleWrap.className = 'ed-titlewrap';
  const title = document.createElement('span');
  titleWrap.appendChild(title);
  if (!create) titleWrap.appendChild(copyBtn(t('vm.copyName'), () => vmVars.find((x) => x.id === v.id)?.name ?? v.name, 'ed-copyname'));
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
  if (create) row(t('vm.dCollection'), create.label, 'ed-plain');
  else if (col) {
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
  // 새 변수 — 타입(색 · 숫자 · 글자 · 참거짓). 바꾸면 값 칸을 비우고 다시 그린다.
  let typeSel: HTMLSelectElement | null = null;
  if (create) {
    typeSel = document.createElement('select');
    typeSel.className = 'ed-type';
    typeSel.setAttribute('aria-label', t('newVar.type'));
    for (const [val, key] of [['COLOR', 'newVar.tColor'], ['FLOAT', 'newVar.tNumber'], ['STRING', 'newVar.tString'], ['BOOLEAN', 'newVar.tBool']] as const) {
      const o = document.createElement('option');
      o.value = val;
      o.textContent = t(key);
      typeSel.appendChild(o);
    }
    typeSel.value = v.type;
    row(t('newVar.type'), typeSel);
  }
  // 값 칸 — 컬렉션의 모든 모드, 한 줄씩
  const fields: EdField[] = [];
  for (const m of col?.modes ?? []) {
    const dd = row(m.name, '');
    const f: EdField = { modeId: m.modeId, modeName: m.name, base: undefined, mode: 'value', text: '', bool: false, aliasId: null, touched: false, needValue: false, figmaErr: null, dd, ctl: null, ddBtn: null };
    edResetField(f, v.values[m.modeId], v.type);
    fields.push(f);
  }
  const uses = create ? { box: document.createElement('div'), list: document.createElement('div'), run: () => {} } : usesBlock(v.id);
  if (!create) {
    const scopes = document.createElement('span');
    for (const sc of v.scopes) {
      const c = document.createElement('span');
      c.className = 'chip';
      c.textContent = sc;
      scopes.appendChild(c);
    }
    row(t('vm.dScopes'), v.scopes.length ? scopes : '—', 'ed-text');
    row(t('vm.dDesc'), v.description || '—', 'ed-text');
    // CSS 줄 `--{css 이름}` + [⧉](§4.8)
    const css = document.createElement('span');
    css.className = 'ed-css';
    const code = document.createElement('code');
    code.textContent = cssVarName(v.name);
    css.append(code, copyBtn(t('vm.copyCss'), () => cssVarName(vmVars.find((x) => x.id === v.id)?.name ?? v.name), 'ed-copycss', '⧉'));
    row('CSS', css, 'ed-text');
    row(t('list.dUses'), uses.box, 'ed-text');
  }
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
  const btnClose = modalButton(create ? t('common.cancel') : t('common.close'), () => requestCloseModal('button'));
  const btnSave = modalButton(create ? t('newVar.create') : t('edit.save'), () => edSave(), true);
  const e: Editor = {
    v, nameText: v.name, nameFigmaErr: null, fields, saving: null, timer: null, sticky: null, event: null, confirm: false, picker: null,
    lastField: null, dead: new Set(), appliedAny: false, lastPartial: false,
    title, nameInput, nameField, nameErr, changes, alert, confirmRow, btnKeep, btnClose, btnSave, usesRun: uses.run,
    ...(create ? { create: { ...create, reqId: null }, newScopes: () => scopesForNew(normalizeVarName(e.nameText), e.v.type) ?? ['ALL_SCOPES'] } : {}),
  };
  if (typeSel) {
    const ts = typeSel;
    ts.addEventListener('change', () => {
      if (e.picker) edClosePicker(false);
      e.v = { ...e.v, type: ts.value as VarRow['type'] };
      for (const f of e.fields) { edResetField(f, undefined, e.v.type); edRenderField(f); }
      edChrome();
    });
  }
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
  const box = openModal(titleWrap, body, [btnClose, btnSave], () => edAfterClose(e), () => edCleanup(e), {
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
  e.pendingJump = null; // [계속 고치기] — 이동하지 않는다
  e.confirm = false;
  edChrome();
  const back = e.lastField && e.lastField.isConnected && !e.lastField.closest('[hidden]') ? e.lastField : e.nameInput;
  back.focus();
}
function edCleanup(e: Editor): void {
  if (e.pendingJump) { const id = e.pendingJump; setTimeout(() => varJump(id), 0); }
  if (e.timer) clearTimeout(e.timer);
  e.timer = null;
  if (ed === e) ed = null;
  detailUsesEl = null;
  detailBox = null;
}
/** 닫은 뒤 — 변수 id로 행을 다시 찾아 포커스, 바뀐 응답이 있었으면 상태 줄(§4.4 고치기 "닫을 때 상태 줄"). */
function edAfterClose(e: Editor): HTMLElement {
  if (e.create) return e.create.opener && document.body.contains(e.create.opener) ? e.create.opener : $('btnAddVar');
  const { el: target, present } = focusAfterDetail(e.v.id);
  if (e.appliedAny) {
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
  if (e.create) { edCreate(e); return; }
  const st = edState(e);
  if (bindLinking || !st.changed || st.hasErr) { edLockedSave(); return; }
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

/* ---------- 상세에서 쓰는 작은 것들 · 이동 · 새 변수 · 복제 · 삭제(IA v4 §4.8 · §4.9) ---------- */
type RowRef = { local: VarRow; lib?: undefined } | { lib: LibraryVar; local?: undefined };

/** [⧉] 복사 단추 — 누르면 단추 글자가 1.5초 "복사됨", 포커스는 그 단추에 남는다(상태 줄은 팝업 뒤라 쓰지 않음). */
function copyBtn(label: string, text: () => string, cls: string, face?: string): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = `ed-copy ${cls}`;
  const idle = face ? face : `⧉ ${label}`;
  b.textContent = idle;
  b.title = label;
  b.setAttribute('aria-label', label);
  let timer: ReturnType<typeof setTimeout> | null = null;
  b.addEventListener('click', () => {
    void copyText(text()).then((ok) => {
      b.textContent = ok ? t('vm.copiedShort') : t('vm.copyFailedShort');
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { b.textContent = idle; }, 1500);
    });
  });
  return b;
}

/** [→] 가리키는 변수로(§4.8) — 고친 것이 있으면 닫기 전 확인을 거친 뒤 이동. */
function edGoTarget(targetId: string): void {
  const e = ed;
  if (!e) return;
  e.pendingJump = targetId;
  requestCloseModal('button');
  // 바로 닫혔으면 edCleanup이 이동을 했다. 확인 줄이 떴으면 [버리기] 뒤 edCleanup이, [계속 고치기]면 취소.
}
/** 변수 탭의 그 변수로 이동 + 상태 줄 [← 되돌리기](§4.8). */
function varJump(id: string): void {
  const v = vmVars.find((x) => x.id === id);
  if (!v) { showStatusLine(t('list.libVar')); return; }
  const fromVars = activeTab === 'variables';
  const undo = fromVars
    ? { tab: 'variables' as const, sel: sideSel, collapsed: new Set(grpCollapsed), query, scroll: window.scrollY, focusKey }
    : { tab: 'select' as const, usesOpen: selUsesOpen, scroll: window.scrollY, focusK: (document.activeElement as HTMLElement | null)?.closest<HTMLElement>('[data-k]')?.dataset.k ?? null };
  showTab('variables');
  query = '';
  ($('varSearch') as HTMLInputElement).value = '';
  sideSel = { kind: 'col', id: v.collectionId };
  const cut = v.name.lastIndexOf('/');
  grpCollapsed.delete(`${v.collectionId}|${cut < 0 ? '' : v.name.slice(0, cut)}`);
  focusKey = `v:${v.id}`;
  renderVarList();
  const item = gridItems().find((x) => x.dataset.key === focusKey);
  if (item) {
    gridItems().forEach((x) => (x.tabIndex = -1));
    item.tabIndex = 0;
    item.scrollIntoView({ block: 'center' });
    item.focus({ preventScroll: true });
  }
  showStatusLine(t('list.jumped', { name: v.name }), {
    action: {
      label: t('list.undo'),
      run: () => {
        if (undo.tab === 'variables') {
          sideSel = undo.sel;
          grpCollapsed.clear(); undo.collapsed.forEach((k) => grpCollapsed.add(k));
          query = undo.query;
          ($('varSearch') as HTMLInputElement).value = query;
          focusKey = undo.focusKey;
          renderVarList();
          window.scrollTo(0, undo.scroll);
          gridItems().find((x) => x.dataset.key === focusKey)?.focus({ preventScroll: true });
        } else {
          showTab('select');
          selUsesOpen = undo.usesOpen;
          renderSelHome();
          window.scrollTo(0, undo.scroll);
          const back = undo.focusK ? $('selCards').querySelector<HTMLElement>(`[data-k="${CSS.escape(undo.focusK)}"]`) : null;
          (back ?? $('selCards').querySelector<HTMLElement>('button'))?.focus({ preventScroll: true });
        }
      },
    },
  });
}

/* ---------- 무료 개수 제한(§4.9 · §9) ---------- */
let manualUsed = 0;
/** 새 변수 · 복제가 잠겼으면 그 사유. */
function manualLimitReason(): string | null {
  if (isPaid) return null;
  return manualUsed >= FREE_MANUAL_CREATE_LIMIT ? t('newVar.freeLimit', { n: FREE_MANUAL_CREATE_LIMIT }) : null;
}

/** 표가 온 뒤 할 일(새 변수 · 복제 · 삭제 뒤) — 그 항목으로 포커스 · 상세 열기. */
let afterTable: { focus?: string; openDetail?: string } | null = null;
function runAfterTable(): void {
  const job = afterTable;
  if (!job) return;
  if (job.openDetail) {
    const v = vmVars.find((x) => x.id === job.openDetail);
    if (!v) return; // 아직 이 표에 없음 — 다음 표를 기다린다
    afterTable = null;
    revealVar(v);
    openEditor(v, true);
    return;
  }
  if (job.focus) {
    const id = job.focus.startsWith('v:') ? job.focus.slice(2) : null;
    const v = id ? vmVars.find((x) => x.id === id) : undefined;
    if (id && !v) return;
    afterTable = null;
    if (v) revealVar(v);
    else { focusKey = job.focus; renderVarList(); }
    const item = gridItems().find((x) => x.dataset.key === job.focus) ?? gridItems()[0];
    if (item) {
      gridItems().forEach((x) => (x.tabIndex = -1));
      item.tabIndex = 0;
      item.scrollIntoView({ block: 'nearest' });
      item.focus({ preventScroll: true });
    }
  }
}
/** 그 변수의 컬렉션 · 그룹을 보이게(검색은 지움). */
function revealVar(v: VarRow): void {
  if (activeTab !== 'variables') showTab('variables');
  query = '';
  ($('varSearch') as HTMLInputElement).value = '';
  sideSel = { kind: 'col', id: v.collectionId };
  const cut = v.name.lastIndexOf('/');
  grpCollapsed.delete(`${v.collectionId}|${cut < 0 ? '' : v.name.slice(0, cut)}`);
  focusKey = `v:${v.id}`;
  renderVarList();
}

/* ---------- 새 변수(§4.9) ---------- */
function openNewVar(opener: HTMLElement | null): void {
  const lock = manualLimitReason();
  if (lock) { showStatusLine(lock, { cls: 'warn', action: { label: t('status.paidAction'), run: goToLicense } }); return; }
  const sel = currentSel();
  const col = sel.kind === 'col' ? vmCols.find((c) => c.id === sel.id) : undefined;
  // 타입 기본값: 지금 보이는 첫 그룹의 첫 변수 타입, 그룹이 없으면 숫자.
  const first = paletteGroups(vmCols, vmVars, col?.id ?? null, '')[0]?.rows[0];
  const type: VarRow['type'] = first?.type ?? 'FLOAT';
  const v: VarRow = { id: '__new', name: '', collectionId: col?.id ?? '__new', type, values: {}, scopes: [], description: '' } as VarRow;
  const label = col ? `${tierBadge(col)} ${col.name}` : t('newVar.newCollection');
  openEditor(v, true, { collectionId: col?.id, label, opener });
}
/** [만들기] — 이름 · 기본 모드 값 필수, 다른 모드는 비우면 기본 모드 값(플러그인 쪽). */
function edCreate(e: Editor): void {
  const c = e.create!;
  if (c.reqId) return;
  const n = normalizeVarName(e.nameText);
  const ne = nameError(e.nameText, e.v, vmVars);
  const col = vmCols.find((x) => x.id === c.collectionId);
  const defMode = col ? col.defaultModeId ?? col.modes[0]?.modeId : '*';
  const values: Record<string, EditValue> = {};
  let firstErr: HTMLElement | null = ne ? e.nameInput : null;
  for (const f of e.fields) {
    const d = edDraft(f, e.v.type);
    if (d.err && !firstErr) firstErr = f.ctl;
    if (d.value && d.changed) values[col ? f.modeId : '*'] = d.value;
  }
  if (!values[defMode ?? '*'] && !firstErr) {
    const f = e.fields.find((x) => x.modeId === defMode) ?? e.fields[0];
    if (f) { f.needValue = true; f.touched = true; firstErr = f.ctl; }
  }
  if (firstErr) { e.event = { text: t('edit.checkInput'), err: true }; edChrome(); firstErr.focus(); return; }
  const lock = writeLockReason();
  if (lock) { e.event = { text: lock, err: false }; edChrome(); return; }
  const scopes = scopesForNew(n, e.v.type);
  c.reqId = ++bindReqSeq;
  send({ type: 'CREATE_VARIABLE', reqId: c.reqId, ...(c.collectionId ? { collectionId: c.collectionId } : {}), name: n, varType: e.v.type, values, ...(scopes ? { scopes } : {}) });
  e.event = { text: t('newVar.creating'), err: false };
  edChrome();
}
function onVariableCreated(msg: Extract<CodeToUi, { type: 'VARIABLE_CREATED' }>): void {
  manualUsed = msg.manualUsed;
  const e = ed;
  if (!e?.create || e.create.reqId !== msg.reqId) return;
  afterTable = { focus: `v:${msg.id}` };
  e.create.opener = null;
  closeModal();
  showStatusLine(t('newVar.created'), { cls: 'ok' });
}

/* ---------- 복제 · 삭제(§4.9) ---------- */
let dupReq = 0;
function duplicateVar(v: VarRow): void {
  const lock = writeLockReason() ?? manualLimitReason();
  if (lock) { showStatusLine(lock, { cls: 'warn' }); return; }
  dupReq = ++bindReqSeq;
  send({ type: 'DUPLICATE_VARIABLE', reqId: dupReq, id: v.id });
}
function onVariableDuplicated(msg: Extract<CodeToUi, { type: 'VARIABLE_DUPLICATED' }>): void {
  manualUsed = msg.manualUsed;
  if (msg.reqId !== dupReq) return;
  afterTable = { openDetail: msg.newId }; // 만든 뒤 상세를 열고 이름 칸에 포커스
}
let delReq = 0;
function confirmDeleteVar(v: VarRow, el: HTMLElement): void {
  const lock = writeLockReason();
  if (lock) { showStatusLine(lock, { cls: 'warn' }); return; }
  // {m} — 이 변수를 가리키는 로컬 변수(모든 모드의 별칭 대상).
  const m = vmVars.filter((x) => x.id !== v.id && Object.values(x.values).some((c) => c?.kind === 'alias' && c.aliasId === v.id)).length;
  // 지운 뒤 포커스 — 같은 그룹의 다음 항목, 없으면 이전, 그것도 없으면 그룹 머리.
  const cut = v.name.lastIndexOf('/');
  const gKey = `${v.collectionId}|${cut < 0 ? '' : v.name.slice(0, cut)}`;
  const items = gridItems();
  const i = items.indexOf(el);
  const sameGroup = (x: HTMLElement | undefined): boolean => {
    const id = x?.dataset.id;
    const o = id ? vmVars.find((y) => y.id === id) : undefined;
    if (!o) return false;
    const c2 = o.name.lastIndexOf('/');
    return `${o.collectionId}|${c2 < 0 ? '' : o.name.slice(0, c2)}` === gKey;
  };
  const next = sameGroup(items[i + 1]) ? items[i + 1] : sameGroup(items[i - 1]) ? items[i - 1] : null;
  const after = next?.dataset.key ?? `g:${gKey}`;
  const title = document.createElement('span');
  title.textContent = t('del.title', { name: v.name });
  const body = document.createElement('div');
  if (m) { const p = document.createElement('p'); p.textContent = t('del.aliases', { m }); body.appendChild(p); }
  const p2 = document.createElement('p');
  p2.textContent = t('del.layers');
  body.appendChild(p2);
  const cancel = modalButton(t('common.cancel'), () => closeModal());
  const del = modalButton(t('del.confirm'), () => {
    delReq = ++bindReqSeq;
    afterTable = { focus: after };
    send({ type: 'DELETE_VARIABLE', reqId: delReq, id: v.id });
    closeModal();
  });
  del.classList.add('danger');
  openModal(title, body, [cancel, del], () => el, undefined, { focus: cancel });
}
function onVariableDeleted(msg: Extract<CodeToUi, { type: 'VARIABLE_DELETED' }>): void {
  if (msg.reqId !== delReq) return;
  showStatusLine(t('del.done'), { cls: 'ok' });
}
/** 새 변수 · 복제 · 삭제 · 클릭 연결의 ERROR(§4.9) — code로 문구를 정한다. */
function onVarOpError(msg: Extract<CodeToUi, { type: 'ERROR' }>): boolean {
  const e = ed;
  if (msg.op === 'CREATE_VARIABLE' && e?.create && e.create.reqId === msg.reqId) {
    e.create.reqId = null;
    if (msg.code === 'name') { e.nameFigmaErr = msg.message; e.event = { text: t('edit.nameRejected'), err: true, tip: msg.message }; edChrome(); e.nameInput.focus(); }
    else if (msg.code === 'freeLimit') { e.event = { text: t('newVar.freeLimit', { n: FREE_MANUAL_CREATE_LIMIT }), err: true }; edChrome(); }
    else { e.event = { text: t('newVar.failed'), err: true, tip: msg.message }; edChrome(); }
    return true;
  }
  if (msg.op === 'DUPLICATE_VARIABLE' && msg.reqId === dupReq) {
    showStatusLine(msg.code === 'freeLimit' ? t('newVar.freeLimit', { n: FREE_MANUAL_CREATE_LIMIT }) : msg.code === 'deleted' ? t('edit.deleted') : t('newVar.dupFailed'), { cls: 'warn', tip: msg.message });
    return true;
  }
  if (msg.op === 'DELETE_VARIABLE' && msg.reqId === delReq) {
    afterTable = null;
    showStatusLine(msg.code === 'deleted' ? t('edit.deleted') : t('del.failed'), { cls: 'warn', tip: msg.message });
    return true;
  }
  if (msg.op === 'APPLY_VARIABLE' && msg.reqId === applyVarReq) {
    showStatusLine(msg.code === 'deleted' ? t('edit.deleted') : t('apply.failed'), { cls: 'warn', tip: msg.message });
    return true;
  }
  return false;
}

/* ---------- 별칭 고르개 — 바깥 누름 · 배경 누름 · focusout(§4.8) ---------- */
document.addEventListener('pointerdown', (ev) => {
  const e = ed;
  if (!e?.picker) return;
  const f = e.fields.find((x) => x.modeId === e.picker!.modeId);
  const tg = ev.target as Node;
  if (!f || f.dd.contains(tg)) return;
  // 배경을 누르면 고르개만 닫고 팝업은 그대로. 다른 곳은 고르개만 닫고 포커스는 누른 곳.
  if ((tg as HTMLElement).classList?.contains('modal-backdrop')) { ev.stopPropagation(); ev.preventDefault(); }
  edClosePicker(false);
}, true);
document.addEventListener('focusout', (ev) => {
  const e = ed;
  if (!e?.picker) return;
  const f = e.fields.find((x) => x.modeId === e.picker!.modeId);
  const to = (ev as FocusEvent).relatedTarget as Node | null;
  if (!f || !to || !f.dd.contains(ev.target as Node)) return;
  if (!f.dd.contains(to)) edClosePicker(false);
});

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
function openExportPopup(returnFocus: HTMLElement): void {
  openPopupFrom('exportPopBody', t('export.title'), returnFocus);
}
function openMoreMenu(): void {
  const btn = $('btnVarMore');
  const r = btn.getBoundingClientRect();
  openMenu(r.left, r.bottom + 2, [
    { label: t('list.readiness', { n: readinessDone(), total: 7 }) + '…', onSelect: () => openReadiness(btn), focusElsewhere: true },
    { label: t('list.menuExport'), onSelect: () => openExportPopup(btn), focusElsewhere: true },
    { label: colorView === 'grid' ? t('list.colorList') : t('list.colorGrid'), separatorBefore: true, onSelect: () => setColorView(colorView === 'grid' ? 'list' : 'grid') },
    { label: t('list.menuExpandAll'), onSelect: () => setAllGroups(true) },
    { label: t('list.menuCollapseAll'), onSelect: () => setAllGroups(false) },
  ], btn);
}
/** [＋] 메뉴(§4.6 ⑥) — 새 변수 · (구분선) · 선택에서 변수 만들기… · 다크 모드 만들기… · 텍스트 스타일 만들기…. */
function openAddMenu(): void {
  const btn = $('btnAddVar');
  const r = btn.getBoundingClientRect();
  const limit = manualLimitReason();
  openMenu(r.left, r.bottom + 2, [
    { label: t('list.addNew'), disabled: !!limit, note: limit ?? undefined, onSelect: () => openNewVar(btn), focusElsewhere: true },
    { label: t('list.addFromSel'), separatorBefore: true, disabled: !curSel.count, note: curSel.count ? undefined : t('status.noSelection'), onSelect: () => showMakeScreen(), focusElsewhere: true },
    { label: t('list.addDark'), onSelect: () => showPick('theme', 'vars'), focusElsewhere: true },
    { label: t('list.addTextStyles'), onSelect: () => showPick('type', 'vars'), focusElsewhere: true },
  ], btn);
}
/** ⋯ "그룹 모두 펼치기 / 접기" — 지금 컬렉션(검색 중이면 보이는 것)의 그룹. */
function setAllGroups(open: boolean): void {
  const sel = currentSel();
  for (const g of paletteGroups(vmCols, vmVars, sel.kind === 'col' ? sel.id : null, query)) {
    if (open) grpCollapsed.delete(g.key); else grpCollapsed.add(g.key);
  }
  renderVarList();
}

/* ---------- 리스너 ---------- */
$('btnAddVar').addEventListener('click', openAddMenu);
$('btnVarMore').addEventListener('click', openMoreMenu);
$('varSearch').addEventListener('input', () => { query = ($('varSearch') as HTMLInputElement).value; renderVarList(); });
$('varSearch').addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); clearSearch(); } });
$('btnSearchClear').addEventListener('click', () => clearSearch(true));
$('modeSelect').addEventListener('change', () => { modeName = ($('modeSelect') as HTMLSelectElement).value || null; renderVarList(); });
/* =====================================================================
   시작 화면(§4.3) · 마법사 위치 · 준비 현황 팝오버
   ===================================================================== */
/* ---------- 준비 현황 팝오버 ---------- */
function readinessDone(): number {
  return pipelineSteps({ hasColorVars, hasScaleVars, hasGlobal, hasBindable, hasDarkMode, hasTextStyles, hasSemanticRoles, hasBoundNodes, hasRenamedNodes }).filter((s) => s.status === 'done').length;
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
/* =====================================================================
   레이어 › 연결(IA v3 §4.6)
   ===================================================================== */
/** 준비 상태가 바뀐 뒤 연결 화면을 맞춘다 — 연결할 변수가 없으면 "텍스트 스타일만" 모습(§4.2). */
function renderBindPrereq(): void {
  // 시작 직후 updateGates가 목록 상태보다 먼저 부를 수 있다 — 그때는 건너뛰고 첫 선택 상태에서 그린다.
  if (!curSel) return;
  renderBindChrome();
}
/** ② 판정용 — 로컬 변수가 없고 선택이 300개 이하일 때만 라이브러리 사용을 읽는다. */
function readLayerLibUse(): void {
  // 연결할 변수가 없고 로컬 변수도 0개일 때만 필요하다(② 판정).
  if (!prereqKnown || hasBindable || prereqLocalVars > 0 || !curSel.count || curSel.scanned > BIG_SELECTION || layerLibUse !== null || layerLibReq) return;
  layerLibReq = ++bindReqSeq;
  send({ type: 'SCAN_USAGE', reqId: layerLibReq, nodeIds: curSel.ids });
}

/** 다른 탭에서 돌아오거나 창에 다시 들어올 때(§4.2 · §7). 최소화 중 결과 → 이 화면의 선택 → 조용히 다시 찾기(끈 스위치 이어받음). */
function bindOnReturn(): void {
  if (bindLinking) return; // 연결 중의 복귀는 아무것도 하지 않는다 — 끝난 뒤 1번(§4.2)
  if (activeTab !== 'select' || selSub !== 'bind' || !hasBindPreview()) return;
  if (bindPreviewMini) { bindPreviewMini = false; return; }
  if (bindHereSel) { bindHereSel = false; return; }
  if (!bindLeftSince) return;
  bindLeftSince = false;
  if ((baseline ?? curSel).scanned > BIG_SELECTION) return; // 300개 규칙 — 자동으로 읽지 않는다
  runBindPreview(true);
}
document.documentElement.addEventListener('pointerleave', () => { if (hasBindPreview()) bindLeftSince = true; });
window.addEventListener('blur', () => { if (hasBindPreview()) bindLeftSince = true; });

/** 찾기·연결이 실행 중인가. 연결 쪽은 bindLinking(§4.6 "연결 중의 다른 일"). */

/* =====================================================================
   선택 탭 첫 화면(IA v4 §4.1) — 머리 줄 · 상태표 · 카드 1(변수 없는 값) · 카드 2(쓰는 변수) · 카드 3(삭제된 변수)
   ===================================================================== */
/** 카드 1 숫자가 가리키는 기준(id를 이은 글) — 다르면 "읽는 중". */
let selFindFor: string | null = null;
/** 자동 찾기를 보냈고 응답을 기다린다. */
let selFindInFlight = false;
/** 쓰기 작업 중이라 미룬 자동 찾기(§7). */
let selFindDeferred = false;
/** 카드 2 펼침(세션 동안 기억). */
let selUsesOpen = false;
let unbindReq = 0;

const baseKey = (): string => (baseline ? baseline.ids.join(',') : '');
/** 기준 이름 — "{첫 이름}" / "{첫 이름} 외 {k}개". */
function baseLabel(): string {
  const b = baseline ?? curSel;
  if (!b.count) return '';
  const first = b.name || t('sel.unnamed');
  return b.count === 1 ? first : t('v4.selMany', { name: first, k: b.count - 1 });
}
/** 사용 수를 읽어야 하는 화면이 보이는가(변수 탭 · 선택 탭). */
function usageVisible(): boolean {
  return vmOpen || activeTab === 'select';
}
/** 선택 탭 데이터 읽기(§7) — 찾기 + 쓰는 변수 · 삭제된 변수. */
function readSelData(why: ReadWhy, find = true): void {
  if (!baseline) return;
  requestManagerUsage(why === 'work' ? 'work' : 'quiet');
  if (find) readSelFind(why === 'work' || why === 'reentry' || selFindDeferred || selFindFor !== baseKey());
}
/** 카드 1 자동 찾기 — 조용한 읽기, 300개 규칙, 쓰기 중이면 미룬다, 한 번에 하나(§2.6 · §7). */
function readSelFind(force = true, user = false): void {
  if (!baseline || isMini || activeTab !== 'select') return;
  if (!force && selFindFor === baseKey()) return;
  if (!user && baseline.scanned > BIG_SELECTION) { renderSelHome(); return; }
  if (bindLinking || opBusy() || wizardRunning) { selFindDeferred = true; return; }
  selFindDeferred = false;
  selFindInFlight = true;
  if (user) runBindPreview(); else runBindPreview(true);
  renderSelHome();
}

/** 카드 한 장. */
function selCard(opts: { title: string; subs?: (string | Node)[]; cls?: string; actions?: HTMLElement[] }): HTMLElement {
  const d = document.createElement('div');
  d.className = `sel-card${opts.cls ? ' ' + opts.cls : ''}`;
  const g = document.createElement('div');
  g.className = 'grow';
  const tt = document.createElement('div');
  tt.className = 't';
  tt.textContent = opts.title;
  g.appendChild(tt);
  for (const sub of opts.subs ?? []) {
    const sd = document.createElement('div');
    sd.className = 's';
    sd.append(sub);
    g.appendChild(sd);
  }
  d.appendChild(g);
  if (opts.actions?.length) {
    const a = document.createElement('div');
    a.className = 'acts';
    a.append(...opts.actions);
    d.appendChild(a);
  }
  return d;
}
function selBtn(label: string, onClick: (b: HTMLButtonElement) => void, primary = false): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = label;
  if (primary) b.className = 'primary';
  b.addEventListener('click', () => { if (!isLocked(b)) onClick(b); });
  return b;
}
function selLink(label: string, onClick: (b: HTMLButtonElement) => void): HTMLButtonElement {
  const b = selBtn(label, onClick);
  b.className = 'link link-btn';
  return b;
}
const kindLabel = (k: SelKind): string => KIND_HEAD[k];

function renderSelHome(): void {
  if (activeTab !== 'select' || selSub !== 'home' || !curSel) return;
  const head = $('selHead');
  const cards = $('selCards');
  const hadFocus = cards.contains(document.activeElement) ? (document.activeElement as HTMLElement).dataset.k ?? null : null;
  clearMount(head);
  clearMount(cards);
  const noSel = !baseline;
  // 할 일(§4.1) — 목록 기준이 없으면 잠금.
  for (const id of ['btnGoMake', 'btnGoRename', 'btnGoComponents']) setLock($(id), (baseline ?? curSel).count ? null : 'prereq', t('status.noSelection'));
  // 머리 줄
  if (baseline) {
    const b = document.createElement('b');
    b.textContent = baseLabel();
    b.title = baseLabel();
    head.append(b);
    if (baseDiffers()) {
      const diff = document.createElement('span');
      diff.className = 'sel-diff';
      diff.append(t('v4.baseDiff') + ' · ');
      const rb = selLink(t('list.rebase'), () => doRebase());
      rb.dataset.k = 'rebase';
      diff.appendChild(rb);
      head.appendChild(diff);
    }
  }
  const put = (el: HTMLElement): void => { cards.appendChild(el); };
  const localZero = vmTableKnown ? localVarCount() === 0 : prereqKnown && prereqLocalVars === 0;
  // 1 첫 정보 전
  if (!vmTableKnown && !prereqKnown) { put(selCard({ title: t('v4.loading') })); return finishSelFocus(hadFocus); }
  // 2 선택 없음
  if (noSel) {
    const d = document.createElement('div');
    d.className = 'sel-empty';
    d.textContent = t('v4.noSel');
    if (localZero) { const sd = document.createElement('div'); sd.className = 'sub'; sd.textContent = t('v4.noVarsFile'); d.appendChild(sd); }
    put(d);
    return finishSelFocus(hadFocus);
  }
  // 3 큰 선택, 아직 안 읽음
  const findReady = selFindFor === baseKey() && !selFindInFlight;
  const usageReady = !!usageMap;
  if (baseline!.scanned > BIG_SELECTION && !findReady && !usageReady && !selFindInFlight) {
    const c = selCard({ title: t('list.big'), actions: [selBtn(t('list.read'), () => { requestManagerUsage('user'); readSelFind(true, true); })] });
    put(c);
    return finishSelFocus(hadFocus);
  }
  const counts = findReady ? bindCardCounts() : null;
  const reading = (): HTMLElement => selCard({ title: t('v4.reading') });
  // 5 · 6 로컬 변수 0개 — 쓰는 변수 결과가 온 뒤 가린다(오기 전에는 4 읽는 중).
  if (localZero) {
    if (!usageReady) { put(reading()); return finishSelFocus(hadFocus); }
    const libDirect = libVars.filter((l) => (usageMap?.get(l.id)?.places ?? 0) > 0);
    if (libDirect.length) {
      const subs: (string | Node)[] = [];
      const actions: HTMLElement[] = [];
      tsOnlyExtra(subs, actions);
      put(selCard({ title: t('v4.libOnly'), subs, actions }));
      renderUsesCard(put);
    } else {
      const subs: string[] = [];
      if (counts && counts.noVarByKind.length) subs.push(counts.noVarByKind.filter((x) => x.kind !== 'other').map((x) => t('v4.kindPlaces', { kind: kindLabel(x.kind), n: x.n })).join(' · '));
      else if (!findReady) subs.push(t('v4.reading'));
      const actions: HTMLElement[] = [selBtn(t('v4.makeArrow'), (b) => { showMakeScreen(b); }, true)];
      const allSubs: (string | Node)[] = [...subs];
      tsOnlyExtra(allSubs, actions);
      put(selCard({ title: t('v4.noVarsFile'), subs: allSubs, actions }));
    }
    renderDeletedCard(put);
    return finishSelFocus(hadFocus);
  }
  // 7 카드들
  renderFindCard(put, counts);
  renderUsesCard(put);
  renderDeletedCard(put);
  finishSelFocus(hadFocus);
}
function finishSelFocus(key: string | null): void {
  if (!key) return;
  $('selCards').querySelector<HTMLElement>(`[data-k="${CSS.escape(key)}"]`)?.focus({ preventScroll: true });
}
/** 텍스트 스타일만 연결하기(§4.1) — 5 · 6번 카드와 noTier 카드 1 안에 "텍스트 스타일 {t}곳" + [{t}곳 연결]. */
function tsOnlyExtra(subs: (string | Node)[], actions: HTMLElement[]): void {
  const n = bindPreviewed && selFindFor === baseKey() ? tsAllNodes().size : 0;
  if (!n) return;
  subs.push(t('v4.tsPlaces', { t: n }));
  const b = selBtn(t('v4.linkN', { n }), (el) => { showSelSub('bind', el); }, !actions.length);
  b.dataset.k = 'tsLink';
  actions.push(b);
}
/** 카드 1 — 변수 없는 값(§4.1). */
function renderFindCard(put: (el: HTMLElement) => void, counts: CardCounts | null): void {
  if (prereqKnown && !hasBindable) {
    // noTier — 계층 컬렉션에 변수가 없음
    const b = selBtn(t('v4.makeArrow'), (el) => { showMakeScreen(el); });
    b.dataset.k = 'make';
    const subs: (string | Node)[] = [t('bind.noTier')];
    const actions: HTMLElement[] = [b];
    tsOnlyExtra(subs, actions);
    put(selCard({ title: t('v4.find0'), subs, actions }));
    return;
  }
  if (!counts) {
    put(selCard({ title: t('v4.find0'), subs: [t('v4.reading')] }));
    return;
  }
  const { m, k, s, n } = counts;
  if (n === 0 && s === 0) { put(selCard({ title: t('v4.allBound'), cls: 'ok' })); return; }
  if (n === 0) {
    const v = selLink(t('v4.view'), (el) => { bindSkipsOpen = true; showSelSub('bind', el); renderBindTree(); });
    v.dataset.k = 'skips';
    put(selCard({ title: t('v4.allLinked'), subs: [t('v4.fixPlaces', { s })], actions: [v] }));
    return;
  }
  // 둘째 줄: 종류별 연결할 곳(합 = m, Other 제외) + " · 새로 만들 값 {k}곳"(링크 없음 — 입구는 할 일 [변수 만들기]).
  const parts = m > 0 ? counts.byKind.filter((x) => x.kind !== 'other').map((x) => `${kindLabel(x.kind)} ${x.n}`) : [];
  if (k > 0) parts.push(t('v4.noVarPlaces', { k }));
  const sub = document.createElement('span');
  sub.textContent = parts.join(' · ');
  const actions: HTMLElement[] = [];
  if (m > 0) {
    const go = selBtn(t('v4.linkN', { n: m }), (el) => { showSelSub('bind', el); }, true);
    go.dataset.k = 'link';
    actions.push(go);
  } else {
    const mk = selBtn(t('v4.makeArrow'), (el) => { showMakeScreen(el); }, true);
    mk.dataset.k = 'make';
    actions.push(mk);
  }
  const card = selCard({ title: t('v4.findN', { n }), subs: [sub], actions });
  (card.querySelector('.t') as HTMLElement).title = t('v4.findTip');
  put(card);
}
/** 카드 2 — 쓰는 변수(직접만, §4.1). */
function renderUsesCard(put: (el: HTMLElement) => void): void {
  if (!usageMap) { put(selCard({ title: t('v4.usesTitle0'), subs: [t('v4.reading')] })); return; }
  const local = vmVars.filter((v) => (usageMap!.get(v.id)?.places ?? 0) > 0);
  const lib = libVars.filter((l) => (usageMap!.get(l.id)?.places ?? 0) > 0);
  const n = local.length + lib.length;
  if (!n) return;
  const tierN = new Map<string, number>();
  for (const v of local) {
    const c = vmCols.find((x) => x.id === v.collectionId);
    const key = c?.tier === 3 ? 'Component' : c?.tier === 2 ? 'Semantic' : c?.tier === 1 ? 'Global' : t('v4.noTierName');
    tierN.set(key, (tierN.get(key) ?? 0) + 1);
  }
  if (lib.length) tierN.set(t('v4.libName'), lib.length);
  const order = ['Component', 'Semantic', 'Global', t('v4.noTierName'), t('v4.libName')];
  const sub = order.filter((k) => tierN.get(k)).map((k) => `${k} ${tierN.get(k)}`).join(' · ');
  const tog = selLink(selUsesOpen ? t('v4.collapse') : t('v4.expand'), () => { selUsesOpen = !selUsesOpen; renderSelHome(); });
  tog.dataset.k = 'uses';
  tog.setAttribute('aria-expanded', String(selUsesOpen));
  const card = selCard({ title: t('v4.usesN', { n }), subs: [sub], actions: [tog] });
  (card.querySelector('.t') as HTMLElement).title = t('v4.usesTip');
  put(card);
  if (!selUsesOpen) return;
  // 펼친 목록 — 계층(C → S → G → 없음 → 라이브러리) → 그룹 → 피그마 순서. grid, 정지점 1개.
  const list = document.createElement('div');
  list.className = 'sel-list';
  list.setAttribute('role', 'grid');
  list.setAttribute('aria-label', t('v4.usesN', { n }));
  const tierRank = (tier: number | undefined): number => (tier === 3 ? 0 : tier === 2 ? 1 : tier === 1 ? 2 : 3);
  const rows: { path: string; name: string; ref: RowRef; cell: VarCell | undefined; places: number; rank: number; order: number }[] = [];
  local.forEach((v) => {
    const c = vmCols.find((x) => x.id === v.collectionId);
    const cut = v.name.lastIndexOf('/');
    rows.push({ path: `${tierBadge(c ?? { tier: 0 })} ${c?.name ?? ''}${cut > 0 ? ' › ' + v.name.slice(0, cut) : ''}`, name: cut >= 0 ? v.name.slice(cut + 1) : v.name, ref: { local: v }, cell: currentModeCell(v), places: usageMap!.get(v.id)?.places ?? 0, rank: tierRank(c?.tier), order: vmVars.indexOf(v) });
  });
  lib.forEach((l, i) => {
    const cut = l.name.lastIndexOf('/');
    rows.push({ path: `${t('v4.libName')} › ${l.collection}`, name: cut >= 0 ? l.name.slice(cut + 1) : l.name, ref: { lib: l }, cell: l.value, places: usageMap!.get(l.id)?.places ?? 0, rank: 4, order: i });
  });
  rows.sort((a, b) => a.rank - b.rank || a.path.localeCompare(b.path) || a.order - b.order);
  let lastPath = '';
  const focusables: HTMLElement[] = [];
  for (const r of rows) {
    if (r.path !== lastPath) {
      const ph = document.createElement('div');
      ph.className = 'sl-path';
      ph.textContent = r.path;
      list.appendChild(ph);
      lastPath = r.path;
    }
    const row = document.createElement('div');
    row.className = 'sl-row';
    row.setAttribute('role', 'row');
    row.tabIndex = -1;
    row.dataset.k = `use:${r.ref.local ? r.ref.local.id : r.ref.lib.id}`;
    const nm = document.createElement('span');
    nm.className = 'nm';
    nm.textContent = r.name;
    const num = document.createElement('span');
    num.className = 'num';
    num.textContent = t('v4.places', { n: r.places });
    row.append(nm, valueEl(r.cell), num);
    const open = (): void => openDetail(r.ref, row);
    row.addEventListener('click', open);
    row.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      openMenu(e.clientX, e.clientY, [{ label: t('v4.detail'), onSelect: open, focusElsewhere: true }], row);
    });
    row.addEventListener('keydown', (e) => {
      const i = focusables.indexOf(row);
      const go = (j: number): void => { const tg = focusables[Math.max(0, Math.min(focusables.length - 1, j))]; focusables.forEach((x) => (x.tabIndex = -1)); tg.tabIndex = 0; tg.focus(); };
      if (e.key === 'ArrowDown') go(i + 1);
      else if (e.key === 'ArrowUp') go(i - 1);
      else if (e.key === 'Home') go(0);
      else if (e.key === 'End') go(focusables.length - 1);
      else if (e.key === 'Enter') open();
      else if (e.key === 'ContextMenu' || (e.key === 'F10' && e.shiftKey)) { const rc = row.getBoundingClientRect(); openMenu(rc.left + 16, rc.bottom, [{ label: t('v4.detail'), onSelect: open, focusElsewhere: true }], row); }
      else return;
      e.preventDefault();
    });
    focusables.push(row);
    list.appendChild(row);
  }
  if (focusables[0]) focusables[0].tabIndex = 0;
  put(list);
}
/** 카드 3 — 삭제된 변수(§4.1) · [선택] · [연결 풀기]. */
function renderDeletedCard(put: (el: HTMLElement) => void): void {
  if (!usageMap || !deletedUse.count) return;
  const sel = selBtn(t('v4.select'), () => { selectStatusTarget = 'list'; send({ type: 'SELECT_NODES', ids: deletedUse.nodeIds }); });
  sel.dataset.k = 'delsel';
  const un = selBtn(t('v4.unbind'), () => unbindDeleted());
  un.id = 'btnUnbindDeleted';
  un.dataset.k = 'unbind';
  const other = otherWriteOp() ?? (bindLinking ? t('op.bind') : null);
  if (other) setWait(un, t('bind.waitOp', { op: other }));
  put(selCard({ title: t('v4.deletedN', { n: deletedUse.count }), cls: 'warn', actions: [sel, un] }));
}
/** [연결 풀기] — 기준 안 삭제된 변수 연결만 뗀다(§2.3-5). */
function unbindDeleted(): void {
  if (!baseline) return;
  unbindReq = ++bindReqSeq;
  send({ type: 'UNBIND_DELETED', reqId: unbindReq, nodeIds: baseline.ids });
}
function onDeletedUnbound(msg: Extract<CodeToUi, { type: 'DELETED_UNBOUND' }>): void {
  if (msg.reqId !== unbindReq) return;
  unbindReq = 0;
  let text = t('v4.unbound', { k: msg.unbound });
  if (msg.failed) text += t('v4.unboundFailed', { m: msg.failed });
  showStatusLine(text, { cls: msg.failed ? 'warn' : 'ok' });
  const tip = Object.entries(msg.failReasons).map(([k, n]) => `${t('v4.unbindFail.' + k)} ${n}`).join(' · ');
  if (tip) $('statusText').title = tip;
  // 카드가 사라지면 포커스는 [이름 정리](§4.1).
  if (document.activeElement === document.body || !document.activeElement?.isConnected) $('btnGoMake').focus();
  queueMicrotask(() => { if (!$('selCards').contains(document.activeElement)) $('btnGoMake').focus(); });
}

/* ---------- 첫 화면 — 변수 탭(IA v3) ----------
   파일 맨 끝에서 부른다: 첫 화면이 변수 관리를 그리고 사용 수를 읽으므로, 그 상태 변수가 모두 선언된 뒤여야 한다.
   처음 한 번은 탭이 '바뀌지' 않으므로 activeTab을 비켜 두어 들어올 때 읽기가 돌게 한다. */
activeTab = 'variables';
showTab('select'); // v4 §2.1 — 창을 열면 선택 탭
