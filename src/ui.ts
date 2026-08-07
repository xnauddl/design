/* ============================================================
   ui.ts — iframe UI 로직 (postMessage 송수신, 폼 상태)
   ============================================================ */
import type { UiToCode, CodeToUi, RenameNode, BindCandidate, BindNode, BindSkip, ComponentCandidate } from './shared/messages';
import { type DraftToken, type Unit, tidyNumberTokens } from './lib/tokens';
import { t, hasString } from './lib/i18n';
import { type TextStyleSpec, rampToSpecs } from './lib/textStyles';
import { type Tier, type Feature } from './lib/entitlements';
import { extractSignedToken, pickInstanceId, type VerifyResult } from './lib/license';
import { base64UrlToString, verifyLicenseToken } from './lib/licenseToken';
import { VERIFY_URL, PLUGIN_ID, LICENSE_ISS, LICENSE_AUD, LICENSE_ALG, LICENSE_PUBLIC_JWK, licenseLinksConfigured, licenseVerifyConfigured } from './lib/licenseConfig';
import { exportHasTokens, type ExportFormat } from './lib/exporters';
import type { FrameMeta } from './lib/similar';
import type { VarInfo } from './shared/messages';
import { generatePalette, paletteToDraftTokens, paletteSemanticMap, suggestSemanticMap, type Harmony } from './lib/palette';
import { classifyColor, nameColorsByHue } from './lib/colorName';
import { suggestTokenRoles, semanticMapToText, textToSemanticMap } from './lib/roles';
import { pipelineSteps, type PipelineStep } from './lib/pipeline';
import { explainError, type FriendlyError } from './lib/errors';
import { nextTabIndex } from './lib/a11y';
import { planWizard, summarize, type WizardOptions, type WizardContext, type WizardTotals, type WizardStepId, type WizardPlanItem } from './lib/wizard';

let lastSentMsg: UiToCode | null = null; // UX7: '다시 시도' 대상(취소는 제외)
function send(msg: UiToCode): void {
  if (msg.type !== 'CANCEL') lastSentMsg = msg;
  parent.postMessage({ pluginMessage: msg }, '*');
}

const HEX6 = /^#[0-9a-fA-F]{6}$/;

const $ = <T extends HTMLElement = HTMLElement>(id: string): T =>
  document.getElementById(id) as T;

function readMaxDepth(): number {
  const value = Number(($('depth') as HTMLInputElement).value);
  return Number.isFinite(value) ? Math.max(1, Math.round(value)) : 8;
}

let tokens: DraftToken[] = [];
let isPaid = false; // Free/Paid 2티어 — 유료면 모든 유료 기능 해금
let hideOnboard = false; // 첫 실행 배너를 껐는가(파일에 기억)
let colorsFromPalette = false; // 지금 목록의 색이 팔레트 생성으로 온 것인가(변수 생성 시 이전 팔레트 정리)
let colorsCreated = false; // 이 세션에서 색 변수를 만들었는가(토큰 단계 안내용)
// #11: 단계 전제 — Global 변수 존재(역할 매핑) · 연결 가능 변수 존재(변수 연결) · 텍스트 스타일 존재(기존만 연결).
// 색/색 외/다크는 게이트가 아니라 '준비 현황' 목록에만 쓴다(만들기 탭의 할 일).
let hasColorVars = false;
let hasScaleVars = false;
let hasGlobal = false;
let hasBindable = false;
let hasDarkMode = false;
let hasTextStyles = false;
let lastSelCount = 0; // UX5: 마지막으로 받은 선택 수(빈 상태 문구 분기에 사용)
let createFrom: 'colors' | 'tokens' = 'tokens'; // 마지막 CREATE_TOKENS 호출 출처(결과 상태 라우팅)

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
function makeTokenRow(t: DraftToken): HTMLElement {
  const n = t.count ?? 0;
  const unit = t.unit && t.unit !== 'px' ? ` · ${UNIT_CHIP[t.unit]}` : '';

  // 이름은 편집 대상이라 제목 자리에 입력칸을 그대로 둔다(말줄임을 못 쓰므로 전체는 title로).
  const input = document.createElement('input');
  input.value = t.name;
  input.title = t.name;
  input.addEventListener('input', () => {
    t.name = input.value;
    input.title = input.value;
  });

  // 체크한 토큰만 생성한다. 키는 이름이 아니라 값(category|value|unit) — 이름은 편집 대상이라
  // 개명하는 순간 체크가 풀린다.
  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.checked = tokenChecked.has(tokenKey(t));
  cb.title = '생성 대상';
  cb.addEventListener('change', () => {
    if (cb.checked) tokenChecked.add(tokenKey(t));
    else tokenChecked.delete(tokenKey(t));
    updateTokenCreate();
  });

  const card = resultCard({
    check: cb,
    title: input,
    titleMono: true,
    // 값·타입까지 붙여 이름만으로 구분 안 되는 토큰(fontFamily 등)을 요약에서 바로 읽는다.
    summary: `${t.category}${unit} · ${t.value}`,
    // 등장 레이어 수 — 무엇을 남길지 고르는 근거. 1×는 대개 일회성 값이라 흐리게.
    meta: n > 0 ? `${n}×` : '',
    metaTitle: n > 0 ? `이 값을 쓰는 레이어 ${n}개` : '',
    dim: n === 1,
  });
  // 색 토큰은 renderTokens가 걸러내 여기 오지 않는다(색은 위 ‘색 정리’ 담당) → effectColor만.
  if (t.category === 'effectColor' && typeof t.value === 'string') addSwatch(card, t.value);
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
let lastTidy: { before: number; after: number; merged: number } = { before: 0, after: 0, merged: 0 };
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
    showHint(lastSelCount > 0 ? '‘미리보기’를 누르세요.' : '프레임을 먼저 선택하세요.');
    return;
  }
  if (!previewRevealed) {
    showHint('‘미리보기’를 누르면 만들 토큰이 표시됩니다.');
    return;
  }
  // 와이어: 색은 이전 단계에서 이미 변수화됐다는 사실을 이 단계 첫 줄로 알린다.
  const colorN = tokens.length - others.length;
  const banner = $('tokenColorNote');
  banner.style.display = colorsCreated && colorN ? '' : 'none';
  if (colorsCreated && colorN) banner.textContent = t('create.colorsDone', { count: colorN });
  if (!others.length) {
    showHint('색 외 토큰이 없습니다(색만 추출됨).');
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
  $('createCount').textContent = others.length ? `후보 ${sel}/${others.length}` : '';
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
  hideTidySummary(); // 팔레트 스케일은 의도적 간격 — 정리 안 함
  preTidyTokens = null;
  $('paletteInfo').textContent = t('palette.summary', { count: p.scales.length, tokens: tokens.length });
  setStatus(
    'paletteStatus',
    t('palette.hint', { warn: p.warnings.join(' ') ? p.warnings.join(' ') + ' ' : '' }),
    p.warnings.length ? 'warn' : 'ok',
  );
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
  const card = $('colorSection');
  const colors = tokens.filter((t) => t.category === 'color' && typeof t.value === 'string');
  if (!colorRevealed || !colors.length) {
    card.style.display = 'none'; // 색은 ‘선택에서 토큰 추출’(colorRevealed) 후에만 노출
    $('colorCount').textContent = '';
    // 옛 행을 남겨 두면 다음 추출이 색 0개일 때 테두리·‘총 n개’ 줄이 실제와 어긋난 채 되살아난다.
    $('colorTable').innerHTML = '';
    return;
  }
  card.style.display = '';
  // 카드 제목의 개수 — 표가 상한에 걸려 일부만 보여도 정리 대상 색이 몇 개인지 먼저 알린다.
  $('colorCount').textContent = `색 ${colors.length}개`;
  // 현 semMap을 역할→이름으로 읽어 이름→역할로 뒤집어 prefill.
  const roleByName = new Map<string, string>();
  for (const [role, name] of Object.entries(textToSemanticMap(($('semMap') as HTMLTextAreaElement).value))) {
    if (!roleByName.has(name)) roleByName.set(name, role);
  }
  renderChunked($('colorTable'), colors, (t) => {
    const role = document.createElement('input');
    role.setAttribute('list', 'roleList');
    role.placeholder = '역할(선택)';
    role.value = roleByName.get(t.name) ?? '';
    role.dataset.name = t.name;
    role.className = 'r-role';
    const card = resultCard({
      title: t.name,
      titleMono: true,
      summary: classifyColor(t.value as string).achromatic ? '무채' : 'hue',
      metaEl: role,
    });
    role.addEventListener('input', updateColorSummary);
    addSwatch(card, t.value as string);
    return card;
  });
  updateColorSummary();
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
  $('colorTable').querySelectorAll<HTMLInputElement>('input[data-name]').forEach((inp) => {
    const role = inp.value.trim();
    if (role) map[role] = inp.dataset.name as string;
  });
  return map;
}

/* ---------- 색 정리 (ΔE 군집 N:1) ---------- */
/** 현재 색 토큰 hex 목록. */
function colorHexes(): string[] {
  return tokens
    .filter((t) => t.category === 'color' && typeof t.value === 'string')
    .map((t) => (t.value as string).toLowerCase());
}

/** 자동 정리 직전의 추출 토큰 스냅샷(되돌리기용). null이면 되돌릴 것 없음. */
let preTidyTokens: DraftToken[] | null = null;

/** 색 토큰을 hue-단계 이름 기준으로 N:1 병합(드래프트 단계 — 변수·바인딩 영향 없음).
   huefy가 같은 단계로 본 색(예: color/gray/50 와 color/gray/50-2)은 한 대표로 합친다
   (sources union, 대표는 접미사 없는 base 이름). 단계 버킷이 ΔE(군집)보다 관대해
   실데이터에서 확실히 정리됨 — 같은 단계 색이 두 변수로 남지 않는다. 통계 반환. */
function tidyColors(): { before: number; after: number; merged: number } {
  const colors = tokens.filter((t) => t.category === 'color' && typeof t.value === 'string');
  const before = colors.length;
  const baseName = (name: string) => name.replace(/-\d+$/, ''); // 충돌 접미사(-2,-3…) 제거
  const keep = new Map<string, DraftToken>(); // base 이름 → 남길 대표 토큰
  const drop = new Set<DraftToken>();
  for (const t of colors) {
    const k = baseName(t.name);
    const rep = keep.get(k);
    if (!rep) {
      keep.set(k, t);
    } else {
      for (const s of t.sources) if (!rep.sources.includes(s)) rep.sources.push(s); // 스코프 union 보존
      drop.add(t);
    }
  }
  if (drop.size) {
    tokens = tokens.filter((t) => !drop.has(t));
    for (const [base, rep] of keep) rep.name = base; // 대표 이름을 base로 정규화(접미사 제거)
  }
  return { before, after: keep.size, merged: drop.size };
}

/** 정리 결과 요약 한 줄 + 되돌리기. merged=0이면 숨김. */
function renderTidySummary(s: { before: number; after: number; merged: number }): void {
  const box = $('tidySummary');
  if (s.merged <= 0) {
    box.style.display = 'none';
    return;
  }
  box.style.display = '';
  $('tidySumText').textContent = `비슷한 색 ${s.before} → ${s.after}개로 자동 정리됨`;
}

function hideTidySummary(): void {
  $('tidySummary').style.display = 'none';
}

/** 자동 정리 되돌리기 — 정리 직전 추출 색으로 복원(이번 추출 한정). */
function undoTidy(): void {
  if (!preTidyTokens) return;
  const restored = preTidyTokens.map((t) => ({ ...t, sources: [...t.sources] }));
  carryTokenChecked(tokens, restored); // 수치 정리 후라면 키가 어긋나 전부 풀린다
  tokens = restored;
  preTidyTokens = null;
  hideTidySummary();
  renderTokens();
  renderColorTable();
  suggestSemMapFrom(tokens);
  ($('btnCreateApply') as HTMLButtonElement).style.display = 'none'; // 집합 변경 → 새 미리보기 필요
  setStatus('colorStatus', `정리 되돌림 · 추출 색 ${new Set(colorHexes()).size}개`, '');
}
$('btnTidyUndo').addEventListener('click', undoTidy);

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

/* UX4 온보딩 — 카드 하나를 통째로 두는 대신 마법사 탭 첫 줄 배너로 흡수했다(와이어).
   '다시 보지 않기'는 세션이 아니라 파일에 기억한다 — 매번 다시 뜨면 그게 더 성가시다. */
$('btnOnboardHide').addEventListener('click', () => {
  $('onboardBanner').style.display = 'none';
  hideOnboard = true;
  saveSettings();
});

/* ---------- 버튼 ---------- */
$('btnExtract').addEventListener('click', () => {
  colorRevealed = true; // 추출 버튼 역할: 색 노출
  previewRevealed = false; // 색 외 토큰은 ‘미리보기’ 클릭 시
  send({ type: 'EXTRACT' });
});

/* 스케일 사다리 정리 — #19로 격자 8px·허용 15%에 고정하고 UI 입력·버튼을 없앴다.
   미리보기를 만들 때 자동으로 한 번 돌린다: 손으로 그린 13·15 같은 값이 8 격자로 모여야
   토큰 수가 줄고, 그 수치로 바인딩이 걸린다. 무엇이 옮겨졌는지는 요약 한 줄로 알린다. */
const TIDY_GRID = 8; // 여백·크기 격자(고정)
const TIDY_RATIO = 0.15; // 값 대비 이 비율 안이면 격자로 이동

/** 요약 줄을 걷는다 — 남겨두면 다른 추출의 토큰에 옛 요약이 붙는다. */
function clearNumTidy(): void {
  $('numTidySummary').style.display = 'none';
}

/** 여백·크기 토큰을 격자 8 사다리로 스냅(#19). 미리보기 직전에 호출. */
function tidyNumbers(): void {
  if (!creatableTokens().length) {
    clearNumTidy();
    return;
  }
  const snapshot = tokens.map((t) => ({ ...t, sources: [...t.sources] }));
  const r = tidyNumberTokens(tokens, { base: TIDY_GRID, ratio: TIDY_RATIO });
  if (!r.snapped) {
    clearNumTidy();
    return;
  }
  tokens = r.tokens;
  // 스냅으로 키(값)가 바뀌므로 체크를 그대로 두면 전부 풀린다. 그렇다고 전체 재선택을 하면
  // 사용자의 '1× 해제'가 조용히 되살아난다 → 정리 전 체크 상태를 새 키로 이월한다.
  carryTokenChecked(snapshot, r.tokens);
  $('numTidySummary').style.display = '';
  // 이동과 병합은 다른 일이라 따로 센다 — 옮겼지만 같은 칸이 아니어서 안 합쳐진 토큰도 있다.
  const merged = r.merged ? ` · 같은 칸 ${r.merged}개 병합` : '';
  $('numTidyText').textContent = `여백·크기 ${r.before} → ${r.after}개 (${TIDY_GRID}px 격자로 ${r.snapped}개 이동${merged})`;
}

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
  setStatus('createStatus', once.length ? `1× 토큰 ${once.length}개 해제` : '1× 토큰이 없습니다', '');
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

/* #19: 설정은 관리 탭에만 있고, 바뀌면 곧바로 파일에 기억한다(저장 버튼 없음).
   타이핑 중 매 키마다 보내지 않도록 한 박자 늦춘다. */
let settingsSaveTimer = 0;
function saveSettings(): void {
  clearTimeout(settingsSaveTimer);
  settingsSaveTimer = window.setTimeout(() => {
    send({ type: 'SET_SETTINGS', base: Number(($('base') as HTMLInputElement).value) || 16, maxDepth: readMaxDepth(), hideOnboard });
  }, 350);
}
($('base') as HTMLInputElement).addEventListener('input', saveSettings);
($('depth') as HTMLInputElement).addEventListener('input', saveSettings);

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
  setSemMapText(colorRoleMap()); // 역할 → 매핑(2.5 카드는 숨김이라 이 textarea가 단일 출처)
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
  setStatus('semStatus', t('semantic.scanningGlobals'), '');
  send({ type: 'GET_GLOBAL_COLORS' });
});

$('btnSemantics').addEventListener('click', () => {
  const map: Record<string, string> = {};
  for (const line of ($('semMap') as HTMLTextAreaElement).value.split('\n')) {
    const m = /^\s*([^=]+?)\s*=\s*(.+?)\s*$/.exec(line);
    if (m) map[m[1]] = m[2];
  }
  if (!Object.keys(map).length) {
    setStatus('semStatus', t('semantic.formatHint'), 'warn');
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

function textStyleCard(s: TextStyleSpec): HTMLElement {
  const name = document.createElement('input');
  name.value = s.name;
  name.placeholder = '스타일 이름';
  name.addEventListener('input', () => {
    s.name = name.value;
  });
  if (s.boundStyleId) {
    name.classList.add('ts-bound');
    name.title = '이미 등록된 스타일입니다. 이름을 바꾸면 이 스타일의 이름만 바뀝니다(새로 만들지 않음).';
  } else {
    name.classList.add('ts-new');
    name.title = '새 스타일로 등록됩니다(아직 등록 안 된 글자).';
  }

  const card = resultCard({ title: name, summary: tsSummary(s), summaryMono: true });

  const n = s.count ?? 0;
  const ids = s.nodeIds ?? [];
  if (n > 0 && ids.length) {
    // 1개면 그 글자로 이동, 여러 개면 전부 선택 — 어느 쪽이든 캔버스가 답을 보여준다.
    const badge = document.createElement('button');
    badge.className = 'r-badge';
    badge.textContent = `×${n}`;
    badge.title = n === 1 ? '이 글자로 이동' : `이 스타일을 쓰는 글자 ${n}개 전체 선택`;
    badge.addEventListener('click', () => send({ type: 'SELECT_NODES', ids }));
    (card.querySelector('.r-top') as HTMLElement).appendChild(badge);
  } else {
    // 수동 추가 행은 셀 글자가 없다 — 대신 지울 수 있어야 한다.
    const del = document.createElement('button');
    del.className = 'link';
    del.textContent = '삭제';
    del.addEventListener('click', () => {
      tsSpecs = tsSpecs.filter((x) => x !== s);
      renderTextStyles();
    });
    (card.querySelector('.r-top') as HTMLElement).appendChild(del);
  }
  return card;
}

function renderTextStyles(): void {
  const fresh = tsSpecs.filter((s) => !s.boundStyleId).length;
  const bound = tsSpecs.length - fresh;
  $('tsCount').textContent = tsSpecs.length ? `신규 ${fresh} · 등록됨 ${bound}` : '';
  renderChunked($('tsList'), tsSpecs, textStyleCard);
}

/** 등록에 넘길 스펙 — 이름이 빈 행은 뺀다(수동 추가 후 미입력). */
function readTextStyleRows(): TextStyleSpec[] {
  return tsSpecs.filter((s) => s.name.trim()).map((s) => ({ ...s, name: s.name.trim() }));
}

$('btnScanText').addEventListener('click', () =>
  send({
    type: 'SCAN_TEXT_STYLES',
    useRowLabels: ($('tsUseRowLabels') as HTMLInputElement).checked,
  }),
);
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
    setStatus('tsStatus', '먼저 ‘선택에서 스캔’ 하거나 ‘행 추가’로 스타일을 정의하세요.', 'warn');
    return;
  }
  send({ type: 'CREATE_TEXT_STYLES', styles, apply: ($('tsApply') as HTMLInputElement).checked });
});
$('btnApplyExistingText').addEventListener('click', () => {
  // 적용만: 표/스캔과 무관하게 현재 선택의 텍스트를 기존 스타일에 바인딩(생성 없음).
  setStatus('tsStatus', '선택 텍스트를 기존 스타일에 적용 중…', 'ok');
  send({ type: 'APPLY_TEXT_STYLES' });
});

/* #6: 허용오차는 0.5px 고정 — 반올림 오차만 흡수한다. 칩·입력으로 노출하던 값을 없앴다.
   0은 소수점 반올림 때문에 실제로 안 붙고, 1 이상은 의도치 않은 값까지 끌어와 과매칭이 된다.
   고정값이라는 사실은 관리 탭 '플러그인 설정'에 표시한다. */
const BIND_TOLERANCE = 0.5;

$('btnApply').addEventListener('click', () => {
  showApplyProgress('미리보기 계산 중…'); // UX6
  send({ type: 'APPLY', tolerance: BIND_TOLERANCE, preview: true }); // UX1: dry-run 미리보기 먼저
});

$('btnApplyConfirm').addEventListener('click', () => {
  // #6: 미리보기 트리에서 체크한 후보만 직접 바인딩(WYSIWYG).
  const items = bindCandidates
    .filter((c) => bindChecked.has(candKey(c)))
    .map((c) => ({ nodeId: c.nodeId, field: c.field, index: c.index, variableId: c.variableId }));
  if (!items.length) return;
  showApplyProgress('연결 중…'); // UX6
  send({ type: 'APPLY_SELECTED', items });
});

$('bindAll').addEventListener('change', (e) => {
  const on = (e.target as HTMLInputElement).checked;
  bindChecked.clear();
  if (on) for (const c of bindCandidates) bindChecked.add(candKey(c));
  renderBindTree();
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
    .map((n) => ({ id: n.id, before: n.name, after: n.after as string }));
  if (!items.length) return;
  send({ type: 'RENAME_APPLY', items });
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

/** 계획을 미니 파이프 칩으로 — 실제로 돌 단계만 번호순으로. 결과·사유는 칩 툴팁(와이어).
    건너뛴 단계는 칩을 만들지 않는다: 왜 빠졌는지는 바로 위 옵션 체크박스가 이미 말한다. */
function renderWizardSteps(plan: WizardPlanItem[]): void {
  const box = $('wizardSteps');
  box.innerHTML = '';
  plan.filter((p) => p.run).forEach((p, i) => {
    const chip = document.createElement('span');
    chip.id = `wstep-${p.step.id}`;
    chip.textContent = `${i + 1} ${t('wizard.step.' + p.step.id)}`;
    box.appendChild(chip);
  });
}

function setWizardStep(id: WizardStepId, state: 'active' | 'done' | 'fail', note: string): void {
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
  // 설정값은 관리 탭 '플러그인 설정'에서 읽는다(단일 출처). 허용오차는 고정.
  const base = Number(($('base') as HTMLInputElement).value) || 16;
  const tolerance = BIND_TOLERANCE;
  const maxDepth = readMaxDepth();
  const semMap = textToSemanticMap(($('semMap') as HTMLTextAreaElement).value);

  const options: WizardOptions = {
    semantics: ($('wizOptSemantics') as HTMLInputElement).checked,
    componentize: ($('wizOptComponentize') as HTMLInputElement).checked,
  };
  const ctx: WizardContext = { isPaid, hasSemanticMap: Object.keys(semMap).length > 0 };
  const plan = planWizard(options, ctx);

  wizardRunning = true;
  ($('btnWizardRun') as HTMLButtonElement).disabled = true;
  $('btnWizardCancel').style.display = '';
  setStatus('wizardSummary', t('common.running'), '');
  renderWizardSteps(plan);

  const totals: WizardTotals = {};
  let stopped = false;
  let failNote = ''; // 실패 사유 — 칩 툴팁에만 두면 화면에서 사라진다(요약 줄에 함께 싣는다)

  for (const p of plan) {
    if (!p.run) continue; // renderWizardSteps에서 이미 skip 표시
    if (stopped) {
      setWizardStep(p.step.id, 'fail', t('wizard.seq.stoppedPrev'));
      continue;
    }
    setWizardStep(p.step.id, 'active', t('wizard.seq.running'));
    try {
      switch (p.step.id) {
        case 'extract': {
          const r = await wizardRequest({ type: 'EXTRACT' }, ['EXTRACT_RESULT']);
          tokens = r.tokens; // 모듈 변수 동기화(다음 단계 일관성)
          if (!tokens.length) {
            setWizardStep('extract', 'fail', t('wizard.seq.noExtract'));
            stopped = true;
            break;
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
        case 'bind': {
          showWizardBar();
          const r = await wizardRequest({ type: 'APPLY', tolerance }, ['APPLY_RESULT']);
          hideWizardBar();
          totals.bound = r.bound;
          if (r.cancelled) {
            setWizardStep('bind', 'done', t('wizard.seq.bindCancelled', { bound: r.bound }));
            stopped = true;
            break;
          }
          setWizardStep('bind', 'done', t('wizard.seq.bindDone', { bound: r.bound }) + (r.skipped ? t('wizard.seq.bindSkip', { n: r.skipped }) : ''));
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
      hideWizardBar();
      const fe = explainError(e instanceof Error ? e.message : String(e));
      failNote = `${fe.message}${fe.action ? ` — ${fe.action}` : ''}`;
      setWizardStep(p.step.id, 'fail', failNote);
      stopped = true;
    }
  }

  wizardRunning = false;
  ($('btnWizardRun') as HTMLButtonElement).disabled = false;
  $('btnWizardCancel').style.display = 'none';
  setStatus(
    'wizardSummary',
    t('wizard.result', { state: stopped ? t('wizard.stopped') : t('wizard.completed'), summary: summarize(totals) }) +
      (failNote ? ` · ${failNote}` : ''),
    stopped ? 'warn' : 'ok',
  );
}

$('btnWizardRun').addEventListener('click', () => void runWizard());
$('btnWizardCancel').addEventListener('click', () => send({ type: 'CANCEL' }));

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
    send({ type: 'LICENSE_VERIFIED', key, result: { ok: false, error: '검증 서버 연결 실패(오프라인)', offline: true } });
    return;
  }

  let result: VerifyResult;
  try {
    // 서명 토큰(JWT)만 신뢰한다 — 서명 없는 평문 응답은 페이월 우회 경로라 수용하지 않는다(M2.1).
    const ext = extractSignedToken(json);
    if (!ext.ok) throw new Error(ext.error);
    const parsed = await verifyLicenseToken(ext.token, Date.now(), { issuer: LICENSE_ISS, audience: LICENSE_AUD }, subtleVerify);
    result = parsed.ok
      ? { ok: true, tier: parsed.tier, expiresAt: parsed.expiresAt, instanceId: pickInstanceId(json, instanceId) }
      : { ok: false, error: parsed.error };
  } catch (e) {
    // 서명·클레임·응답 형식 오류 → offline 아님(검증 실패로 확정 처리).
    result = { ok: false, error: `검증 실패: ${e instanceof Error ? e.message : String(e)}` };
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
/** 유료 거부(PREMIUM_REQUIRED) 안내를 띄울 카드 — Feature별 상태 영역. */
const PREMIUM_STATUS_ID: Record<Feature, string> = {
  tokens: 'createStatus',
  semantics: 'semStatus',
  components: 'structureStatus',
  textStyles: 'tsStatus',
};
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
  'btnTextStyles',
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
    el.disabled = !isPaid;
    setLockTitle(el, !isPaid); // 카드 배지를 못 본 채 회색 버튼만 보는 경우 대비
  }
  // 색 카드는 Free('선택에서 추출')와 Paid('팔레트 생성'·'색 변수 만들기')가 한 툴바에 섞여
  // 있어 카드 배지만으로는 어느 쪽이 잠긴 건지 알 수 없다 → 두 버튼 모두에 자물쇠를 붙인다
  // (와이어 rev k). 400px에서 툴바가 두 줄이 되는 건 감수 — 결론 버튼의 잠금이 먼저다.
  for (const id of ['paletteLock', 'paletteBtnLock', 'colorVarsLock', 'componentLock', 'darkLock', 'createLock', 'semLock', 'tsLock']) {
    $(id).textContent = isPaid ? '' : PAID_LOCK;
  }
  // 다크 채우기는 Paid에 더해 '모드 2개 이상'이라는 전제도 있다. PAID_FIELDS 루프가
  // 방금 disabled를 티어만 보고 덮었으니, 모드 조건을 여기서 다시 적용해야 한다(순서 의존).
  refreshDarkModes();
  // 마법사 옵션 둘 다 Paid 단계다(WIZARD_STEPS의 semantics·componentize). 한쪽만 잠그면
  // Free가 켤 수 있는 체크박스가 실행 계획에서 조용히 빠진다 — #11이 없애려던 바로 그 상태.
  for (const [box, lock] of [['wizOptSemantics', 'wizSemanticLock'], ['wizOptComponentize', 'wizComponentLock']]) {
    $(lock).textContent = isPaid ? '' : PAID_LOCK;
    ($(box) as HTMLInputElement).disabled = !isPaid;
  }

  // 전제 미충족 가드(#11) — Global 없으면 시맨틱 매핑, 바인딩 변수 없으면 바인딩을 잠근다.
  setPrereq('btnSemantics', 'semPrereq', hasGlobal, '먼저 토큰을 생성해 Global 변수를 만드세요.');
  if (!isPaid) ($('btnSemantics') as HTMLButtonElement).disabled = true; // 유료 잠금이 전제보다 우선
  setPrereq('btnApply', 'bindPrereq', hasBindable, '먼저 토큰을 생성해 연결할 변수를 만드세요.');
  if (!hasBindable) ($('btnApplyConfirm') as HTMLButtonElement).disabled = true;
  // '기존 스타일 적용만'은 등록된 텍스트 스타일이 없으면 할 일이 없으므로 비활성+안내(숨김 아님).
  setPrereq('btnApplyExistingText', 'tsApplyPrereq', hasTextStyles, '먼저 텍스트 스타일을 등록하세요.');
  if (!isPaid) ($('btnApplyExistingText') as HTMLButtonElement).disabled = true; // 유료 잠금이 전제보다 우선
}

/** 유료 잠금 사유를 툴팁으로. 원래 문구(기능 설명)는 dataset에 1회 백업해 보존·복원한다.
 *  구조 버튼은 native title이 아니라 커스텀 툴팁(data-tip)을 쓴다 — title에 넣으면 사유가
 *  보이는 툴팁 옆에 겹쳐 뜨거나 아예 안 보인다. 그래서 실제로 뜨는 쪽 하나에만 얹는다. */
function setLockTitle(el: HTMLElement, locked: boolean): void {
  const attr = el.hasAttribute('data-tip') ? 'data-tip' : 'title';
  if (el.dataset.baseTip === undefined) el.dataset.baseTip = el.getAttribute(attr) ?? '';
  const base = el.dataset.baseTip;
  el.setAttribute(attr, locked ? (base ? `${base} · ${PAID_LOCK}` : PAID_LOCK) : base);
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
  showMakeStep('token'); // 토큰 생성은 '토큰' 단계에 있다 — 단계를 안 맞추면 빈 화면으로 보낸다
  $('createCard').scrollIntoView({ behavior: 'smooth', block: 'center' });
  ($('btnCreate') as HTMLButtonElement).focus();
}

/* ---------- 진행 안내 파이프라인(§3) ---------- */

/** 준비 현황 줄 클릭 → 그 일을 하는 단계로. 목록 순서 = 만들기 레일 순서 + 적용 첫 단계. */
const PIPELINE_TARGET: Record<PipelineStep['id'], { make: MakeStep | null; btn: string }> = {
  colors: { make: 'color', btn: 'btnColorVars' },
  tokens: { make: 'token', btn: 'btnCreate' },
  semantics: { make: 'token', btn: 'btnSemantics' }, // 역할 매핑은 토큰 단계에 흡수돼 있다
  dark: { make: 'theme', btn: 'btnGenDark' },
  textStyles: { make: 'type', btn: 'btnScanText' },
  bind: { make: null, btn: 'btnApply' }, // 유일하게 적용 탭
};

function gotoStep(id: PipelineStep['id']): void {
  const target = PIPELINE_TARGET[id];
  if (target.make === null) {
    showTab('apply');
    showApplyStep('bind');
  } else {
    showTab('tokens');
    showMakeStep(target.make);
  }
  const b = $(target.btn) as HTMLButtonElement;
  b.scrollIntoView({ behavior: 'smooth', block: 'center' });
  b.focus();
}

/** PREREQ_STATE 기반으로 의존 파이프라인 단계 상태를 그린다(시작 탭). */
function renderPipeline(): void {
  const box = $('pipelineSteps');
  box.innerHTML = '';
  const steps = pipelineSteps({ hasColorVars, hasScaleVars, hasGlobal, hasBindable, hasDarkMode, hasTextStyles });
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

// 다크 채우기는 컬렉션의 모드 2개(라이트→다크)를 고르는 게 전부라, 변수 목록에서 모드를 읽어 채운다.
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
  // 라이트/다크가 성립하려면 모드가 2개 이상이어야 한다. 이름순 첫 컬렉션(대개 단일 모드인
  // Global)이 잡히면 카드가 열리자마자 막힌 것처럼 보이니, 실제로 쓸 수 있는 쪽을 기본으로.
  const usable = [...cols.values()].find((v) => v.modes.length >= 2);
  if (usable && (cols.get(sel.value)?.modes.length ?? 0) < 2) sel.value = usable.collectionId;
  refreshDarkModes();
}

function refreshDarkModes(): void {
  const colId = ($('darkCollection') as HTMLSelectElement).value;
  const v = allVars.find((x) => x.collectionId === colId);
  const modes = v ? v.modes : [];
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
    if (prev && modes.some((m) => m.modeId === prev)) sel.value = prev;
  }
  // 모드가 2개 이상이어야 라이트→다크가 성립한다. 1개면 무엇을 눌러도 아무 일이 없으니 미리 막는다.
  const ok = modes.length >= 2;
  ($('btnGenDark') as HTMLButtonElement).disabled = !ok || !isPaid;
  const notice = $('darkPrereq');
  notice.style.display = ok ? 'none' : '';
  const text = notice.querySelector('.prereq-text');
  if (text) {
    text.textContent = ok
      ? ''
      : modes.length
        ? '모드가 하나뿐입니다 — Figma에서 다크 모드를 추가하세요.'
        : '먼저 토큰을 생성해 변수를 만드세요.';
  }
  // 모드가 2개 이상이면 서로 다른 모드가 기본으로 잡히게 — 같은 모드끼리면 덮어써도 의미가 없다.
  if (modes.length >= 2 && ($('darkFromMode') as HTMLSelectElement).value === ($('darkToMode') as HTMLSelectElement).value) {
    ($('darkToMode') as HTMLSelectElement).value = modes[1].modeId;
  }
}

$('darkCollection').addEventListener('change', refreshDarkModes);

$('btnGenDark').addEventListener('click', () => {
  const collectionId = ($('darkCollection') as HTMLSelectElement).value;
  const fromModeId = ($('darkFromMode') as HTMLSelectElement).value;
  const toModeId = ($('darkToMode') as HTMLSelectElement).value;
  if (!collectionId || !fromModeId || !toModeId) {
    setStatus('darkStatus', '컬렉션과 모드를 고르세요.', 'warn');
    return;
  }
  if (fromModeId === toModeId) {
    setStatus('darkStatus', '라이트와 다크가 같은 모드예요. 다른 모드를 고르세요.', 'warn');
    return;
  }
  setStatus('darkStatus', '다크 값을 채우는 중…', '');
  send({ type: 'GENERATE_DARK_MODE', collectionId, fromModeId, toModeId });
});

/* ---------- 닮은 프레임 컴포넌트화 ---------- */
// 스캔이 확정한 멤버(구조가 같은 최대 그룹)와 고른 마스터. 컴포넌트화는 이 둘만 보낸다 —
// 제외된 프레임을 실수로 교체 대상에 넣지 않으려면 선택 그대로가 아니라 스캔 결과를 써야 한다.
let similarMemberIds: string[] = [];
let similarMasterId: string | null = null;

$('btnScanSimilar').addEventListener('click', () => {
  setStatus('structureStatus', '닮은 프레임을 찾는 중…', '');
  send({ type: 'SCAN_SIMILAR' });
});

$('btnComponentize').addEventListener('click', () => {
  if (similarMemberIds.length < 2 || !similarMasterId) {
    setStatus('structureStatus', '먼저 스캔해서 마스터를 고르세요.', 'warn');
    return;
  }
  setStatus('structureStatus', '컴포넌트화하는 중…', '');
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
    send({ type: 'REGISTER_COMPONENTS', nodeIds });
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
$('btnBuy').addEventListener('click', () => send({ type: 'OPEN_LICENSE_LINK', target: 'purchase' }));
$('btnPortal').addEventListener('click', () => send({ type: 'OPEN_LICENSE_LINK', target: 'portal' }));

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
  switch (msg.type) {
    case 'EXTRACT_RESULT': {
      tokens = msg.tokens;
      colorsFromPalette = false; // 화면에서 뽑은 색 — 기존 팔레트를 지울 근거가 없다
      colorsCreated = false;
      resetTokenChecked(); // 새 추출 = 새 집합 → 전체 선택으로 시작
      clearNumTidy(); // 이전 추출의 정리 스냅샷으로 되돌아가지 않게
      huefyTokenColors(tokens); // #3: 추출 색을 hue-Global 이름으로 정규화
      // 추출 색 자동 정리(같은 hue-단계 N:1 병합) — 드래프트 단계라 바인딩 영향 없음.
      preTidyTokens = tokens.map((t) => ({ ...t, sources: [...t.sources] })); // 되돌리기 스냅샷
      lastTidy = tidyColors();
      ($('btnCreateApply') as HTMLButtonElement).style.display = 'none'; // 토큰 집합 변경 → 새 미리보기 필요
      // #10: 추출 색에서도 시맨틱 매핑 추천(비어 있을 때만 — 사용자 편집 보존).
      suggestSemMapFrom(tokens);
      renderColorTable(); // colorRevealed면 색 표(추출 버튼이 켬)
      renderTidySummary(lastTidy); // 정리 요약 한 줄 + 되돌리기
      renderTokens(); // previewRevealed면 색 외 목록(미리보기 버튼이 켬)
      const colorN = tokens.filter((tk) => tk.category === 'color').length;
      $('selInfo').textContent = `선택 ${msg.selection}개 · 색 ${colorN} · 그 외 ${tokens.length - colorN}`;
      if (msg.warnings.length) setStatus('colorStatus', msg.warnings.join(' '), 'warn'); // 경고가 없으면 renderColorTable의 요약 줄을 남긴다
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
      renderSelBar(msg.count, msg.scanned, msg.bindable, msg.capped);
      refreshVariantRow(msg.comps, msg.sets);
      // 스킵 칩이 만든 선택 변경이면 미리보기를 유지한다 — 지우면 칩을 한 번 누르는 순간
      // 칩 줄과 체크해둔 후보가 통째로 사라져 두 번째 사유를 볼 수 없다.
      if (!msg.selfSelect) clearBindPreview(); // 사용자의 선택 변경 → 바인딩 미리보기 무효화
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
        if (!wizardRunning && Object.keys(semMap).length) send({ type: 'CREATE_SEMANTICS', map: semMap });
        setStatus('colorStatus', msg.summary, 'ok');
        renderTokens(); // 토큰 단계의 '색 변수 N개 이미 생성됨' 안내 갱신
      } else {
        setStatus('createStatus', msg.summary, 'ok');
        applyBtn.style.display = 'none';
        // 2.5 카드 숨김(자동 흡수): 토큰 생성 적용 시 자동 추천 매핑으로 역할 별칭(Semantic)도 자동 생성.
        // 마법사는 자체 semantics 단계가 있어 제외(메인 핸들러와 동시 수신 → 이중 생성 방지).
        if (!wizardRunning) {
          const semMap = textToSemanticMap(($('semMap') as HTMLTextAreaElement).value);
          if (Object.keys(semMap).length) send({ type: 'CREATE_SEMANTICS', map: semMap });
        }
      }
      break;
    }
    case 'PROGRESS':
      if (msg.op === 'bind') updateApplyProgress(msg.done, msg.total); // UX6
      break;
    case 'APPLY_RESULT': {
      hideApplyProgress(); // UX6
      const confirmBtn = $('btnApplyConfirm') as HTMLButtonElement;
      bindSkips = msg.skips ?? [];
      const rt = reasonsText(msg.reasons); // UX3: 사유별 스킵
      // 칩(레이어로 이동)이 뜨면 상태 줄에는 사유를 중복해 쓰지 않는다.
      const asChips = bindSkips.length > 0;
      const detail = `${msg.skipped ? ` · 스킵 ${msg.skipped}` : ''}${rt && !asChips ? ` — ${rt}` : ''}`;
      renderSkipReasons(msg.reasons);
      if (msg.cancelled) {
        // UX6: 취소 — 처리한 만큼만 적용(비파괴). clearBindPreview가 칩을 숨기므로
        // 취소 경로에서는 사유를 상태 줄 텍스트로 남긴다(그러지 않으면 둘 다 사라진다).
        clearBindPreview();
        const cancelDetail = `${msg.skipped ? ` · 스킵 ${msg.skipped}` : ''}${rt ? ` — ${rt}` : ''}`;
        setStatus('applyStatus', t('apply.cancelled', { bound: msg.bound, detail: cancelDetail }), 'warn');
        confirmBtn.style.display = 'none';
      } else if (msg.preview) {
        // #6: 후보를 선택형 미리보기 트리로. 기본 전체 체크.
        bindCandidates = msg.candidates ?? [];
        bindNodes = msg.nodes ?? [];
        bindChecked.clear();
        for (const c of bindCandidates) bindChecked.add(candKey(c));
        renderBindTree();
        setStatus('applyStatus', t('apply.preview', { bound: msg.bound, detail }), msg.skipped ? 'warn' : '');
      } else {
        clearBindPreview();
        setStatus('applyStatus', t('apply.done', { bound: msg.bound, detail }), msg.skipped ? 'warn' : 'ok');
        confirmBtn.style.display = 'none';
      }
      break;
    }
    case 'SELECT_RESULT':
      // 미리보기 이후 레이어가 지워졌거나 다른 페이지로 옮겨졌으면 그만큼 못 찾는다 — 조용히 실패하지 않게.
      if (msg.capped) {
        setStatus('applyStatus', `레이어 ${msg.found}개만 선택 — 한 번에 보여줄 수 있는 상한(${msg.requested}개 중)입니다.`, 'warn');
      } else if (msg.found < msg.requested) {
        setStatus('applyStatus', msg.found
          ? `레이어 ${msg.found}개 선택 — ${msg.requested - msg.found}개는 삭제됐거나 다른 페이지입니다.`
          : '레이어를 찾지 못했습니다 — 삭제됐거나 다른 페이지입니다. 미리보기를 다시 실행하세요.', 'warn');
      }
      break;
    case 'RENAME_RESULT':
      renderRenameResult(msg);
      break;
    case 'SEMANTICS_RESULT':
      setStatus(
        'semStatus',
        t('semantic.result', { aliased: msg.aliased, created: msg.created, updated: msg.updated }) +
          (msg.missing.length ? t('semantic.missing', { names: msg.missing.join(', ') }) : ''),
        msg.missing.length ? 'warn' : 'ok',
      );
      break;
    case 'TEXT_STYLE_CANDIDATES': {
      if (msg.styles.length) {
        tsSpecs = msg.styles.map((x) => ({ ...x }));
        renderTextStyles();
        const bound = msg.styles.filter((s) => s.boundStyleId).length;
        const fresh = msg.styles.length - bound;
        const labelPart = msg.labeled != null ? ` · 라벨이름 ${msg.labeled} · 랭킹폴백 ${msg.fallback ?? 0}` : '';
        // 와이어 상태 줄: 신규 · 등록됨 · 행간% · 자간%.
        setStatus(
          'tsStatus',
          `신규 ${fresh} · 등록됨 ${bound}` +
            ` · 행간% ${msg.styles.filter((s) => s.lineHeightPercent).length}` +
            ` · 자간% ${msg.styles.filter((s) => (s.letterSpacingPercent ?? 0) !== 0).length}` +
            labelPart +
            (msg.warnings.length ? ' · ' + msg.warnings.join(' ') : ''),
          msg.warnings.length ? 'warn' : 'ok',
        );
      } else {
        tsSpecs = rampToSpecs(DEFAULT_TS_FAMILY);
        renderTextStyles();
        setStatus('tsStatus', '선택에서 텍스트를 못 찾아 기본 램프로 채웠습니다. 폰트·값을 조정하세요.', 'warn');
      }
      break;
    }
    case 'TEXT_STYLES_RESULT':
      setStatus(
        'tsStatus',
        `텍스트 스타일 ${msg.created + msg.updated}개 (생성 ${msg.created} / 갱신 ${msg.updated}) · 바인딩 ${msg.bound}` +
          (msg.applied ? ` · 적용 ${msg.applied}` : '') +
          // 알림은 경고와 분리 — 행간 %처럼 '의도된 미바인딩'을 미연결로 적으면 정상 동작이 경고로 읽힌다.
          (msg.notes.length ? ` · ${msg.notes.join(' · ')}` : '') +
          (msg.missing.length ? ` · 미연결: ${msg.missing.join(', ')}` : ''),
        msg.missing.length ? 'warn' : 'ok',
      );
      break;
    case 'TEXT_STYLES_APPLIED':
      setStatus(
        'tsStatus',
        `기존 스타일 적용 ${msg.applied}건` + (msg.missing.length ? ` · ${msg.missing.join(' · ')}` : ''),
        msg.applied === 0 || msg.missing.length ? 'warn' : 'ok',
      );
      break;
    case 'COLLECTIONS':
      // 존재 확인용 프로브(별도 UI 없음).
      break;
    case 'GLOBAL_COLORS':
      // #10: 기존 Global 색에서 역할 추천 → 시맨틱 매핑 textarea 채움(재방문 매핑).
      if (!msg.colors.length) {
        setStatus('semStatus', t('semantic.noGlobals'), 'warn');
      } else {
        setSemMapText(suggestSemanticMap(msg.colors));
        setStatus('semStatus', t('semantic.suggested', { count: msg.colors.length }), 'ok');
      }
      break;
    case 'PREREQ_STATE':
      // #11: 단계 전제 갱신 → 통합 게이트 재평가 + 진행 안내(§3).
      hasColorVars = msg.hasColorVars;
      hasScaleVars = msg.hasScaleVars;
      hasGlobal = msg.hasGlobal;
      hasBindable = msg.hasBindable;
      hasDarkMode = msg.hasDarkMode;
      hasTextStyles = msg.hasTextStyles;
      updateGates();
      renderPipeline();
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
      // 개발용 토글은 검증 키가 없을 때만 의미가 있으므로, 키가 적용 중이면 표시만 동기화
      if (__DEV__ && msg.source !== 'key') ($('tier') as HTMLSelectElement).value = msg.tier;
      if (msg.note) {
        const cls = /실패|오프라인/.test(msg.note) ? 'warn' : 'ok';
        setStatus('licenseStatus', msg.note, cls);
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
      const extra = `${msg.skipped ? ` · 스킵 ${msg.skipped}` : ''}${msg.singles.length ? ` · 단일 ${msg.singles.length}` : ''}${msg.exposed ? ` · 속성 ${msg.exposed}` : ''}`;
      setStatus('structureStatus', t('component.registered', { registered: msg.registered, sets: msg.sets, extra }), msg.registered || msg.sets ? 'ok' : 'warn');
      // 빈 조합(미생성) + 실패(진단) 리포트
      renderVariantReport(variantIssueSections(msg.missing, msg.failures));
      break;
    }
    case 'VARIANTS_RESULT': {
      renderVariantReport(variantIssueSections(msg.missing, msg.failures));
      const extra = `${msg.singles.length ? ` · 단일 ${msg.singles.length}` : ''}${msg.missing.length ? ' · 빈 조합 있음' : ''}`;
      setStatus('structureStatus', t('component.variants', { sets: msg.sets, extra }), msg.sets ? 'ok' : 'warn');
      break;
    }
    case 'GENERATE_RESULT': {
      renderVariantReport([{ tag: '생성', items: msg.combos, marker: 'added' }]);
      setStatus('structureStatus', t('component.generated', { generated: msg.generated, sets: msg.sets }), msg.generated ? 'ok' : 'warn');
      break;
    }
    case 'SETTINGS': {
      ($('base') as HTMLInputElement).value = String(msg.base);
      ($('depth') as HTMLInputElement).value = String(msg.maxDepth);
      hideOnboard = msg.hideOnboard;
      $('onboardBanner').style.display = hideOnboard ? 'none' : '';
      break;
    }
    case 'VARIABLES': {
      allVars = msg.vars;
      refreshDarkOptions();
      break;
    }
    case 'DARK_MODE_RESULT': {
      if (!msg.realiased) {
        const why = msg.skipped ? `Global을 가리키는 색이 없습니다(건너뜀 ${msg.skipped}개)` : '대상 색이 없습니다';
        setStatus('darkStatus', `다크 값을 채우지 못했습니다 — ${why}`, 'warn');
        break;
      }
      const skip = msg.skipped ? ` · 건너뜀 ${msg.skipped}개(값을 직접 넣은 색)` : '';
      setStatus('darkStatus', `다크 ${msg.realiased}개 연결 · 새 dark/ 원시색 ${msg.created}개${skip}`, 'ok');
      break;
    }
    case 'SIMILAR_CANDIDATES':
      renderSimilar(msg);
      break;
    case 'COMPONENTIZE_RESULT': {
      if (!msg.instances) {
        // 교체가 하나도 없으면 실패다 — 경고를 그대로 보여줘야 원인을 안다.
        setStatus('structureStatus', `컴포넌트화하지 못했습니다${msg.warnings.length ? ` — ${msg.warnings[0]}` : ''}`, 'warn');
        break;
      }
      const parts = [`마스터 ${msg.master}`, `인스턴스 ${msg.instances}개`];
      if (msg.properties) parts.push(`속성 ${msg.properties}개`);
      if (msg.images) parts.push(`이미지 ${msg.images}개`);
      // 경고(제외·오버라이드 실패)는 성공했어도 반드시 노출 — 원본이 남아 있다는 신호다.
      const warn = msg.warnings.length ? ` · 남겨둔 것 ${msg.warnings.length}건: ${msg.warnings[0]}` : '';
      setStatus('structureStatus', `${parts.join(' · ')}${warn}`, msg.warnings.length ? 'warn' : 'ok');
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
      const statusId = PREMIUM_STATUS_ID[msg.feature] ?? 'createStatus';
      setStatus(statusId, t('premium.required', { message: msg.message, feature: msg.feature }), 'warn');
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
      // UX7: 실패한 작업 영역에 친절한 메시지 + 복구 행동 + (가능하면) 다시 시도.
      const statusId = (msg.op && OP_STATUS[msg.op]) || 'colorStatus';
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
  CREATE_TEXT_STYLES: 'tsStatus',
  APPLY: 'applyStatus',
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
    btn.textContent = '다시 시도';
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
}

/** 선택 서브트리의 최소 depth(루트 기준)로 들여쓰기를 정규화한다. */
function baseDepth(rows: TreeRow[]): number {
  return rows.reduce((m, r) => Math.min(m, r.depth), Infinity);
}

/** 선택형 트리 1행. base는 들여쓰기 기준 depth. */
function makeTreeRow(r: TreeRow, base: number, checked: Set<string>, onChange: () => void): HTMLElement {
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
    return group;
  }

  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.checked = checked.has(r.id);
  cb.addEventListener('change', () => {
    if (cb.checked) checked.add(r.id);
    else checked.delete(r.id);
    onChange();
  });

  // 이름 보존(컴포넌트 등록)은 취소선 없이 그대로, 교체(리네임·바인딩)는 before → after.
  const title = document.createElement('span');
  const nameCls = r.replace === false ? 'tree-name' : 'before';
  title.innerHTML = `<span class="${nameCls}">${escapeHtml(r.name)}</span> → <span class="after">${escapeHtml(r.change)}</span>`;
  title.title = `${r.name} → ${r.change}`;

  const card = resultCard({ check: cb, title, titleMono: true, meta: r.badge?.text });
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
  opts: { onChange: () => void; hideContext: boolean; hideKeep?: boolean },
): void {
  const base = rows.length ? baseDepth(rows) : 0;
  // 보이는 행만(맥락 숨김 시 비영향·비헤더 제외) → §4: 대형 서브트리도 청크로 비차단 렌더.
  // 보존 행(keep)은 맥락이 아니라 '왜 안 바뀌는지'라 맥락 숨김과 별도로 켜고 끈다.
  const visible = rows.filter(
    (r) => r.change !== undefined || r.header || (r.keep ? !opts.hideKeep : !opts.hideContext),
  );
  // 세 트리(#bindTree·#diff·#compTree)가 모두 이 호출부를 지난다 — 어느 목록인지는 마운트 id가
  // 말해 주므로 스냅·개수 줄 재계산도 여기 한 줄로 끝난다(행 0건이면 테두리·줄을 걷는다).
  renderChunked(mount, visible, (r) => makeTreeRow(r, base, checked, opts.onChange));
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
  $('renameCount').textContent = total ? `후보 ${total}` : '';
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

/* ---------- 바인딩(#6): 미리보기 트리 + 선택 적용 ---------- */
let bindCandidates: BindCandidate[] = [];
let bindNodes: BindNode[] = [];
const bindChecked = new Set<string>(); // 체크된 후보 키
const bindHideContext = true; // 항상 숨김(토글 없음)

/** 후보 고유 키(노드+필드+인덱스). */
function candKey(c: { nodeId: string; field: string; index?: number }): string {
  return `${c.nodeId}|${c.field}|${c.index ?? ''}`;
}

/** 미리보기 후보를 트리에 표시 가능 여부. */
function hasBindPreview(): boolean {
  return bindCandidates.length > 0;
}

/** 건너뛴 레이어의 사유 요약 — '너비 · HUG/FILL'처럼 속성이 있으면 앞에 붙인다. */
function skipReasonText(s: BindSkip): string {
  const why = t(`reason.${s.reason}`);
  return s.field ? `${s.field} · ${why}` : why;
}

/** code의 후보/노드를 트리 행으로: 노드 헤더 + 후보(체크) 행 + 건너뛴 레이어(흐림). */
function bindRows(): TreeRow[] {
  const byNode = new Map<string, BindCandidate[]>();
  for (const c of bindCandidates) {
    const arr = byNode.get(c.nodeId);
    if (arr) arr.push(c);
    else byNode.set(c.nodeId, [c]);
  }
  // 붙은 게 하나도 없는 레이어만 '스킵' 행으로 — 일부라도 붙었으면 후보 쪽이 본론이고,
  // 그 노드의 나머지 사유는 위쪽 사유 칩이 맡는다(같은 말을 두 번 하지 않게).
  const skipOf = new Map<string, BindSkip>();
  for (const s of bindSkips) if (!byNode.has(s.nodeId) && !skipOf.has(s.nodeId)) skipOf.set(s.nodeId, s);

  const rows: TreeRow[] = [];
  for (const n of bindNodes) {
    const cands = byNode.get(n.id);
    const skipped = skipOf.get(n.id);
    if (!cands && skipped) {
      rows.push({
        id: n.id, name: n.name, type: n.type, depth: n.depth, parentId: n.parentId,
        keep: { reason: skipReasonText(skipped), meta: t('bind.skipMeta') },
      });
      continue;
    }
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
  // 카드 제목의 개수 — 목록이 접혀 있거나 상한에 잘려 있어도 전체 규모를 먼저 알린다.
  // 이 트리는 노드 헤더도 한 행이라 목록 아래 ‘총 n개’(행 수)와 수가 다르다 → 세는 단위를
  // ‘건’으로 구분해(상태 문구 ‘바인딩 n건 후보’와 같은 말) 같은 수의 오기로 읽히지 않게 한다.
  $('bindCount').textContent = total ? `후보 ${total}` : '';
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
  bindSkips = [];
  clearMount($('bindSkips')); // 숨기기만 하면 낡은 칩이 DOM에 남는다
  ($('bindSkips') as HTMLElement).style.display = 'none';
  ($('bindSkipHint') as HTMLElement).style.display = 'none';
  bindChecked.clear();
  clearMount($('bindTree'));
  $('bindCount').textContent = '';
  ($('bindTreeCtrls') as HTMLElement).style.display = 'none';
  ($('btnApplyConfirm') as HTMLButtonElement).style.display = 'none';
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
      return { ...base, change: `${n.group} · ${n.variant || '베리언트'}`, badge: { text: '세트', kind: 'set' as const } };
    }
    if (n.propsOnly) {
      return { ...base, change: `${n.single || '컴포넌트'} · 속성`, badge: { text: '속성', kind: 'single' as const } };
    }
    return { ...base, change: n.single || '컴포넌트', badge: { text: '단독', kind: 'single' as const } };
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
  $('compCount').textContent = total ? `후보 ${total}` : '';
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
    { tag: '빈 조합', head: '빈 조합(미생성):', items: missing },
    { tag: '문제', head: `처리 중 문제 ${f.length}건:`, items: f, warn: true, marker: 'bullet' },
  ];
}

function renderVariantReport(sections: VariantReportSection[]): void {
  const filled = sections.filter((s) => s.items.length);
  // 카드 제목의 개수(#tokenList의 createCount와 같은 패턴) — 리포트가 상한에 걸리거나
  // 카드가 접혀 있어도 무엇이 몇 건인지 먼저 알린다.
  $('componentCount').textContent = filled.map((s) => `${s.tag} ${s.items.length}개`).join(' · ');
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
  const guide = '프레임이나 레이어를 선택하세요.';
  // 어느 쪽이든 행은 0건이다 — 안내 문구는 스크롤 영역이 아니므로 테두리·개수 줄을 걷어야 한다.
  // (예전 :empty 규칙은 안내 문구가 들어찬 순간 자식이 생겨 안 먹었다.)
  if (!hasBindPreview()) {
    if (lastSelCount === 0) renderEmptyState($('bindTree'), '선택한 노드가 없습니다', guide);
    else clearMount($('bindTree'));
  }
  if (compCandidates.length === 0) {
    if (lastSelCount === 0) renderEmptyState($('compTree'), '선택한 노드가 없습니다', guide);
    else clearMount($('compTree'));
  }
}

/** UX3: 스킵 사유 키 → 한글 라벨. */
/**
 * 사유별 레이어(미리보기 dry-run에서만 채워짐). 숫자만 있으면 원인 레이어를 찾을 길이 없어,
 * 사유 칩을 눌러 캔버스에서 선택할 수 있게 보관한다.
 */
let bindSkips: BindSkip[] = [];

/** 사유 칩 렌더 — 레이어 목록이 있는 사유만 버튼, 나머지는 글자. */
function renderSkipReasons(reasons: Record<string, number>): void {
  const box = $('bindSkips');
  const hint = $('bindSkipHint'); // 칩이 무엇이고 누르면 무슨 일이 나는지 — 칩과 생사를 같이 한다
  box.innerHTML = '';
  const entries = Object.entries(reasons).filter(([, n]) => n > 0);
  if (!entries.length || !bindSkips.length) {
    box.style.display = 'none';
    hint.style.display = 'none';
    return;
  }
  box.style.display = '';
  hint.style.display = '';
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
    btn.className = 'skip-chip';
    btn.textContent = `${label} ›`;
    // 사유 건수(n)는 속성 단위, 레이어 수는 노드 단위라 서로 다를 수 있다(padding 4건 → 레이어 1개).
    btn.title = `레이어 ${ids.length}개 선택 — ${bindSkips.filter((s) => s.reason === key).slice(0, 5).map((s) => s.name).join(', ')}${ids.length > 5 ? ' 외' : ''}`;
    btn.addEventListener('click', () => {
      send({ type: 'SELECT_NODES', ids });
      setStatus('applyStatus', `${t('reason.' + key)} 레이어 ${ids.length}개 선택`, '');
    });
    box.appendChild(btn);
  }
}

function reasonsText(reasons: Record<string, number>): string {
  return Object.entries(reasons)
    .filter(([, n]) => n > 0)
    .map(([k, n]) => `${t('reason.' + k)} ${n}`)
    .join(' · ');
}

/* ---------- UX6: 진행률 바 ---------- */
function showApplyProgress(label: string): void {
  $('applyProgress').style.display = '';
  ($('applyBarFill') as HTMLElement).style.width = '0%';
  $('applyProgressText').textContent = label;
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
  const parts = [`텍스트 ${m.textFilled}/${m.textTotal}`];
  if (m.images) parts.push(`이미지 ${m.images}`);
  if (m.emptyLayers) parts.push(`빈 칸 ${m.emptyLayers}`);

  const card = resultCard({
    check: radio,
    title: m.name,
    summary: parts.join(' · '),
    summaryMono: true,
    meta: m.id === recommendedId ? '추천' : '',
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
  $('similarCount').textContent = msg.metas.length ? `닮은 ${msg.metas.length}개` : '';
  $('similarGroup').style.display = msg.metas.length ? '' : 'none';

  const box = $('similarList');
  renderChunked(box, msg.metas, (m) => makeSimilarRow(m, msg.recommendedMasterId));

  if (!msg.metas.length) {
    // 왜 대상이 없는지 알려준다 — 제외 사유가 있으면 그걸 그대로 보여주는 게 가장 빠른 안내다.
    const why = msg.excluded.length ? msg.excluded[0].reason : '구조가 같은 프레임을 2개 이상 선택하세요.';
    setStatus('structureStatus', `컴포넌트화할 프레임이 없습니다 — ${why}`, 'warn');
    return;
  }

  const texts = msg.varying.filter((v) => v.type === 'TEXT').length;
  const swaps = msg.varying.length - texts;
  const opened: string[] = [];
  if (texts) opened.push(`텍스트 ${texts}`);
  if (swaps) opened.push(`아이콘 교체 ${swaps}`);
  if (msg.imageVarying.length) opened.push(`이미지 ${msg.imageVarying.length}`);
  const openText = opened.length ? `속성으로 열림: ${opened.join(' · ')}` : '가변 위치가 없어 속성은 만들지 않아요';
  const skipText = msg.excluded.length ? ` · 제외 ${msg.excluded.length}개(${msg.excluded[0].reason})` : '';
  setStatus('structureStatus', `대상 ${msg.metas.length}개 · ${openText}${skipText}`, 'ok');
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
      : '● 선택 없음 — 프레임을 선택하세요';
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

/* ---------- 캐논 패턴: 카드 접기(아코디언) + 주 버튼 타이틀 줄 이동 ---------- */
/**
 * sticky 오프셋 동기화 — 탭 바·선택 바의 '실제' 높이를 CSS 변수로 넘긴다.
 * 카드 헤더(주 버튼 포함)가 그 아래에 정확히 붙어야 가려지지 않는다. 폭이 좁아져 선택 바가
 * 두 줄이 되거나 창을 리사이즈해도 따라간다(하드코딩 41px/71px은 그 경우 어긋남).
 */
function syncStickyOffsets(): void {
  const tabs = document.querySelector<HTMLElement>('.tabs');
  const bar = $('selBarWrap');
  if (!tabs) return;
  const tabsH = Math.round(tabs.getBoundingClientRect().height);
  const barH = Math.round(bar.getBoundingClientRect().height);
  const root = document.documentElement;
  root.style.setProperty('--tabs-h', `${tabsH}px`);
  root.style.setProperty('--head-top', `${tabsH + barH}px`);
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
const STRUCTURE_TIPS: Record<string, string> = {
  btnScanComp: 'component.scanHelp',
  btnScanSimilar: 'similar.scanHelp',
  btnClassifyVariants: 'component.classifyHelp',
  btnGenMissing: 'component.genMissingHelp',
  btnRegisterComp: 'component.registerHelp',
  btnComponentize: 'similar.componentizeHelp',
};

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
  for (const [id, key] of Object.entries(STRUCTURE_TIPS)) {
    const el = document.getElementById(id);
    if (el && hasString(key)) el.setAttribute('data-tip', t(key));
  }
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
 *  뱃지 span(예: …Lock)이 함께 있는 요소는 텍스트만 <span data-i18n>로 감싸 뱃지를 보존한다. */
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
}

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
  ro.observe($('selBarWrap'));
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
send({ type: 'GET_PREREQ' }); // #11: 단계 전제 상태
send({ type: 'GET_LICENSE' });
send({ type: 'GET_VARIABLES' }); // 다크 카드의 컬렉션·모드 선택지(편집기 '변수 불러오기'가 하던 일)
send({ type: 'GET_SETTINGS' }); // #19: 기준 크기·맥락 깊이는 파일에 기억된 값으로 시작

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
  for (const b of Array.from(rail.querySelectorAll<HTMLElement>('.step-chip'))) {
    const on = b.getAttribute(key) === step;
    if (on) b.setAttribute('aria-current', 'step');
    else b.removeAttribute('aria-current');
  }
}

const showMakeStep = (s: MakeStep): void => showStep('make', s);
const showApplyStep = (s: ApplyStep): void => showStep('apply', s);

for (const b of Array.from(document.querySelectorAll<HTMLElement>('#makeRail .step-chip'))) {
  b.addEventListener('click', () => showMakeStep(b.dataset.makeStep as MakeStep));
}
for (const b of Array.from(document.querySelectorAll<HTMLElement>('#applyRail .step-chip'))) {
  b.addEventListener('click', () => showApplyStep(b.dataset.applyStep as ApplyStep));
}
showMakeStep('color');
showApplyStep('bind');

// 카드 툴바의 '다음 →' — 레일 칩과 같은 이동을 카드 안에서(일이 끝난 자리에서 바로 다음으로).
for (const b of Array.from(document.querySelectorAll<HTMLElement>('[data-next-make]'))) {
  b.addEventListener('click', () => showMakeStep(b.dataset.nextMake as MakeStep));
}
for (const b of Array.from(document.querySelectorAll<HTMLElement>('[data-next-apply]'))) {
  b.addEventListener('click', () => showApplyStep(b.dataset.nextApply as ApplyStep));
}

