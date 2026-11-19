/* ============================================================
   componentLike.ts — 고신뢰 시맨틱 역할 검출 (figma.* 의존 없음)
   rename.ts `highConfidenceRole`과 동일 코어(button~list). heading은 컴포넌트 후보 전용.
   컴포넌트 후보 eligible 게이트에 쓰며, 리네임 실행 여부와 무관하게 구조만으로 판정.
   ============================================================ */

import { VECTOR_TYPES, hasVisibleFill, hasImageFill, hasColorFill, hasVisibleStroke } from './nodePaint';
import { kebab } from './naming';

/** 검출에 필요한 최소 노드 형태(SceneNode / 테스트 fixture와 호환). */
export interface LikeNode {
  type: string;
  locked?: boolean;
  visible?: boolean;
  width?: number;
  height?: number;
  layoutMode?: string;
  /** GRID 오토레이아웃에서만 제공 — 표/갤러리 구분에 필요한 격자 규모. */
  gridRowCount?: number;
  gridColumnCount?: number;
  cornerRadius?: number | symbol;
  topLeftRadius?: number;
  opacity?: number;
  fills?: readonly PaintLike[] | symbol;
  strokes?: readonly PaintLike[] | symbol;
  effects?: readonly EffectLike[];
  /** 첫 보이는 단색 채움(hex) — TEXT면 글자 색. 섞인 색 · 없음은 null/undefined. 탭 판정(§4.7 "묶기" 1번)이 읽는다. */
  fillHex?: string | null;
  /** TEXT 글자. 탭 판정이 읽는다. */
  characters?: string;
  /** 아이콘 프레임(§4.7 "묶기" 3번 — `toStructNode`가 그림 하나로 접은 노드). */
  iconFrame?: boolean;
  /** 레이어 이름 · 이름 키 — 넓힌 구조 탭의 이름 조건(§4.7 "묶기" 1번 ②)이 읽는다. */
  name?: string;
  nameKey?: string;
  /** TEXT 글자 굵기 · 밑줄(섞인 값은 symbol) — 넓힌 구조 탭의 칸 모양. */
  fontWeight?: number | symbol;
  textDecoration?: string | symbol;
  /** 부모 안 자리(세로) — 칸 안 막대 판정(아래 끝에 붙었나). */
  y?: number;
  children?: readonly LikeNode[];
}

export interface PaintLike {
  visible?: boolean;
  type?: string;
  opacity?: number;
}

export interface EffectLike {
  visible?: boolean;
  type?: string;
}

/** 고신뢰 컴포넌트 역할 — button/chip/nav/progress/table/card/figure/field/list/heading. */
export type HighConfidenceRole =
  | 'tab'
  | 'button'
  | 'chip'
  | 'nav'
  | 'progress'
  | 'table'
  | 'card'
  | 'figure'
  | 'field'
  | 'list'
  | 'heading';

/**
 * 구조로 확실한 시맨틱 역할만 반환(아니면 null).
 * 위치/토큰 같은 약한 신호나 container/wrapper/랜드마크(header)는 제외.
 * heading은 card/nav/list 등보다 낮은 우선순위(오탐 방지).
 */
export function highConfidenceComponentRole(node: LikeNode, opts: { wideTab?: boolean } = {}): HighConfidenceRole | null {
  // 탭은 맨 먼저 — 메뉴는 nav, 알약 탭은 card · list · heading 조건도 함께 만족한다(§4.7 "묶기" 1번).
  // 쓰임 이름(§2.12 12.3)은 엄격한 구조만 탭으로 본다(`wideTab: false` — 2026-11-19 1회차 검토 결정).
  if (tabInfo(node, { wide: opts.wideTab !== false }) != null) return 'tab';
  if (isButtonLike(node)) return isChipLike(node) ? 'chip' : 'button';
  // highConfidenceRole은 depth=0으로 nav를 본다(노드 자체 판정).
  if (isNavLike(node, 0)) return 'nav';
  if (isContainerType(node)) {
    const kids = node.children ?? [];
    if (kids.length) {
      if (isProgressLike(node, kids)) return 'progress';
      // table은 card·list보다 먼저 — 행 스택 표는 list 조건(동일 타입·유사 크기)을 이미 만족하고,
      // 테두리 있는 표 컨테이너는 card 조건도 만족한다. 판정이 더 까다로운 쪽이 앞이다.
      if (isTableLike(node, kids)) return 'table';
      if (isCardLike(node, kids)) return 'card';
      if (isFigureLike(node, kids)) return 'figure';
      if (isFieldLike(node, kids)) return 'field';
      if (isListLike(node, kids)) return 'list';
    }
  }
  if (isHeadingLike(node)) return 'heading';
  return null;
}

/** 고신뢰 컴포넌트 역할이 있으면 true. */
export function isHighConfidenceComponent(node: LikeNode): boolean {
  return highConfidenceComponentRole(node) != null;
}

/* ---------- 기하/페인트 ---------- */
function dims(node: LikeNode): { w: number; h: number } | null {
  const w = node.width;
  const h = node.height;
  if (typeof w !== 'number' || typeof h !== 'number') return null;
  return { w, h };
}

function layoutOf(node: LikeNode): 'vertical' | 'horizontal' | null {
  const m = node.layoutMode;
  return m === 'VERTICAL' ? 'vertical' : m === 'HORIZONTAL' ? 'horizontal' : null;
}

function isContainerType(node: LikeNode): boolean {
  return node.type === 'FRAME' || node.type === 'GROUP' || node.type === 'SECTION';
}

function cornerRadiusOf(node: LikeNode): number {
  const r = node.cornerRadius;
  if (typeof r === 'number') return r;
  const tl = node.topLeftRadius;
  return typeof tl === 'number' ? tl : 0;
}

function hasDirectText(node: LikeNode): boolean {
  return !!node.children?.some((c) => c.type === 'TEXT');
}

function isVisible(node: LikeNode): boolean {
  return node.visible !== false;
}

/* ---------- 역할 검출기 (rename highConfidence 와 동일) ---------- */
function isButtonLike(node: LikeNode): boolean {
  if (node.type !== 'FRAME') return false;
  if (layoutOf(node) === null) return false;
  if (!(cornerRadiusOf(node) > 0)) return false;
  if (!hasVisibleFill(node) && !hasVisibleStroke(node)) return false;
  if (!hasDirectText(node)) return false;
  const d = dims(node);
  if (d && d.h > 80) return false;
  return true;
}

function isChipLike(node: LikeNode): boolean {
  const d = dims(node);
  if (!d || d.h > 28) return false;
  return cornerRadiusOf(node) >= d.h / 2 - 1;
}

function hasDropShadow(node: LikeNode): boolean {
  const eff = node.effects;
  return Array.isArray(eff) && eff.some((e) => e.visible !== false && e.type === 'DROP_SHADOW');
}

function isCardLike(node: LikeNode, kids: readonly LikeNode[]): boolean {
  if (node.type !== 'FRAME') return false;
  if (kids.length < 2) return false;
  if (!hasVisibleFill(node) && !hasVisibleStroke(node)) return false;
  return cornerRadiusOf(node) > 0 || hasDropShadow(node);
}

/* ---------- 표(table) ----------
   실무의 Figma 표는 대부분 GRID 오토레이아웃이 아니라 **세로 스택 안의 가로 행**이다.
   두 경로를 모두 본다.

   주의: "완전 균등한 셀"은 표가 아니라 **갤러리·아이콘 그리드의 신호**다. 표는 열마다 폭이
   다르고 셀에 텍스트가 있다. 그래서 균등성 대신 (1) 열 구조의 반복 (2) 텍스트 존재를 본다. */

/** 행으로 볼 수 있는 자식 — 가로 오토레이아웃 컨테이너. */
function rowCells(node: LikeNode): readonly LikeNode[] | null {
  if (node.type !== 'FRAME' && node.type !== 'COMPONENT' && node.type !== 'INSTANCE') return null;
  if (layoutOf(node) !== 'horizontal') return null;
  const cells = (node.children ?? []).filter(isVisible);
  return cells.length >= 2 ? cells : null;
}

/** 셀(또는 그 하위)에 텍스트가 있는가 — 표와 이미지 갤러리를 가르는 신호. */
function hasTextWithin(node: LikeNode, depth = 2): boolean {
  if (node.type === 'TEXT') return true;
  if (depth <= 0) return false;
  return !!node.children?.some((c) => hasTextWithin(c, depth - 1));
}

/**
 * 표 판정.
 * - 행 스택: 세로 AL + 행 3개 이상 + 모든 행이 가로 AL + 열 수 동일 + 열 폭이 행마다 정렬 + 텍스트 존재
 * - GRID: layoutMode 'GRID' + 행·열 2 이상 + 셀 폭이 열마다 다름(균등이면 갤러리) + 텍스트 존재
 */
function isTableLike(node: LikeNode, kids: readonly LikeNode[]): boolean {
  if (node.type !== 'FRAME') return false;
  const visible = kids.filter(isVisible);

  if (node.layoutMode === 'GRID') {
    const cols = node.gridColumnCount ?? 0;
    const rows = node.gridRowCount ?? 0;
    if (cols < 2 || rows < 2) return false;
    if (visible.length < cols * 2) return false; // 최소 2행 분량의 셀
    if (!visible.some((c) => hasTextWithin(c))) return false;
    // 첫 행의 셀 폭이 전부 같으면 표가 아니라 균등 격자(갤러리·아이콘 그리드).
    const firstRow = visible.slice(0, cols).map((c) => c.width);
    if (firstRow.every((w) => typeof w === 'number') && ratioWithin(firstRow as number[], 1.05)) return false;
    return true;
  }

  if (layoutOf(node) !== 'vertical') return false;
  if (visible.length < 3) return false;
  const rows = visible.map(rowCells);
  if (rows.some((r) => r === null)) return false;
  const cellRows = rows.filter((r): r is readonly LikeNode[] => r !== null);
  const cols = cellRows[0].length;
  if (cols < 2) return false;
  if (!cellRows.every((r) => r.length === cols)) return false; // 열 수가 어긋나면 표가 아니다
  if (!cellRows.some((r) => r.some((c) => hasTextWithin(c)))) return false;
  // 같은 열끼리 폭이 맞아야 표 — 행마다 제각각이면 그냥 반복 레이아웃이다.
  for (let i = 0; i < cols; i++) {
    const widths = cellRows.map((r) => r[i].width);
    if (!widths.every((w) => typeof w === 'number')) return false;
    if (!ratioWithin(widths as number[], 1.1)) return false;
  }
  return true;
}

const LIST_ITEM_TYPES = new Set(['FRAME', 'GROUP', 'INSTANCE', 'COMPONENT', 'RECTANGLE', 'ELLIPSE']);

function isListLike(node: LikeNode, kids: readonly LikeNode[]): boolean {
  if (node.type !== 'FRAME') return false;
  if (layoutOf(node) === null) return false;
  if (kids.length < 3) return false;
  const counts = new Map<string, number>();
  for (const k of kids) counts.set(k.type, (counts.get(k.type) ?? 0) + 1);
  let domType: string | null = null;
  let domCount = 0;
  for (const [t, c] of counts) if (c > domCount) { domCount = c; domType = t; }
  if (!domType || domCount / kids.length < 0.8) return false;
  if (!LIST_ITEM_TYPES.has(domType)) return false;
  if (isSectionStack(kids)) return false;
  return dimsSimilar(kids);
}

function isSectionStack(kids: readonly LikeNode[]): boolean {
  return kids.every((k) => {
    const d = dims(k);
    return !!d && d.w >= 768 && d.h >= 400;
  });
}

function dimsSimilar(kids: readonly LikeNode[]): boolean {
  const ws: number[] = [];
  const hs: number[] = [];
  for (const k of kids) {
    const d = dims(k);
    if (!d) return false;
    ws.push(d.w);
    hs.push(d.h);
  }
  return ratioWithin(ws, 1.5) && ratioWithin(hs, 1.25);
}

function ratioWithin(xs: number[], max: number): boolean {
  const mn = Math.min(...xs);
  const mx = Math.max(...xs);
  if (mn <= 0) return false;
  return mx / mn <= max;
}

function isInputBox(node: LikeNode): boolean {
  if (node.type !== 'FRAME' && node.type !== 'RECTANGLE') return false;
  if (hasImageFill(node)) return false;
  if (!hasVisibleStroke(node) && !hasColorFill(node)) return false;
  const d = dims(node);
  if (!d || d.h <= 0 || d.h > 72) return false;
  return d.w >= d.h * 2;
}

function isFieldLike(node: LikeNode, kids: readonly LikeNode[]): boolean {
  if (node.type !== 'FRAME') return false;
  if (layoutOf(node) !== 'vertical') return false;
  const shown = kids.filter(isVisible);
  if (shown.length < 2 || shown.length > 4) return false;
  // 이름표 = 짧은 한 줄 글자(두 줄 안내 글은 이름표 아님 — ia-v4 §4.4 A3 실기 2).
  const hasLabel = shown.some((k) => k.type === 'TEXT' && shortOneLine(k as unknown as Parameters<typeof shortOneLine>[0]));
  const hasInput = shown.some(isInputBox);
  // 글자가 아닌 자식은 모두 입력 높이 안(≤72) — 목록 · 이미지 블록이 끼면 섹션이지 field가 아니다(ia-v4 §4.4 A3).
  const shortBlocks = shown.every((k) => k.type === 'TEXT' || ((dims(k)?.h ?? Infinity) <= 72));
  return hasLabel && hasInput && shortBlocks;
}

function isNavLike(node: LikeNode, depth: number): boolean {
  if (node.type !== 'FRAME') return false;
  if (layoutOf(node) !== 'horizontal') return false;
  if (depth > 1) return false;
  if (cornerRadiusOf(node) > 0 && (hasVisibleFill(node) || hasVisibleStroke(node))) return false;
  const kids = node.children ?? [];
  if (kids.length < 3) return false;
  const d = dims(node);
  if (d && d.h > 80) return false;
  return kids.every((k) => k.type === 'TEXT' || (k.type === 'FRAME' && hasDirectText(k)));
}

function isFigureLike(node: LikeNode, kids: readonly LikeNode[]): boolean {
  if (node.type !== 'FRAME') return false;
  if (kids.length < 2 || kids.length > 3) return false;
  const hasImg = kids.some((k) => hasImageFill(k));
  const hasCaption = kids.some((k) => k.type === 'TEXT');
  return hasImg && hasCaption;
}

function isProgressLike(node: LikeNode, kids: readonly LikeNode[]): boolean {
  if (node.type !== 'FRAME') return false;
  if (kids.length < 1 || kids.length > 2) return false;
  if (kids.some((k) => k.type === 'TEXT')) return false;
  const d = dims(node);
  if (!d || d.h < 4 || d.h > 24) return false;
  if (d.w < d.h * 4) return false;
  if (cornerRadiusOf(node) * 2 < d.h) return false;
  if (!hasVisibleFill(node) && !hasVisibleStroke(node)) return false;
  return kids.some((k) => {
    const kd = dims(k);
    return !!kd && kd.w > 0 && kd.w < d.w && kd.h <= d.h + 1 && hasColorFill(k);
  });
}

/** heading 직접 자식 슬롯 종류 — 접힘 시 액션만 개수 불일치 허용. */
export type HeadingSlotKind = 'title' | 'action' | 'meta';

export interface HeadingSlot {
  kind: HeadingSlotKind;
  node: LikeNode;
  /** 루트 `children` 배열 인덱스(경로·마스터 정렬용). */
  childIndex: number;
}

/**
 * 섹션 머리줄 슬롯 파싱. 실패 시 null.
 * HORIZONTAL + 낮은 높이 + 타이틀 ≥1 + (선택) 액션 0~2 + (선택) 메타 0~1.
 */
export function parseHeadingSlots(node: LikeNode): HeadingSlot[] | null {
  if (node.type !== 'FRAME') return null;
  if (layoutOf(node) !== 'horizontal') return null;
  const d = dims(node);
  if (d && d.h > 96) return null;
  if (hasVisibleFill(node) && cornerRadiusOf(node) > 0) return null;
  if (hasVisibleFill(node) && hasDropShadow(node)) return null;

  const allKids = node.children ?? [];
  const visible = allKids
    .map((k, childIndex) => ({ k, childIndex }))
    .filter(({ k }) => isVisible(k));
  if (visible.length < 1 || visible.length > 5) return null;
  if (visible.some(({ k }) => {
    const kd = dims(k);
    return !!kd && kd.w >= 768 && kd.h >= 400;
  })) return null;

  const slots: HeadingSlot[] = [];
  let titles = 0;
  let actions = 0;
  let metas = 0;
  for (const { k, childIndex } of visible) {
    if (k.type === 'INSTANCE' || k.type === 'COMPONENT') {
      actions++;
      if (actions > 2) return null;
      slots.push({ kind: 'action', node: k, childIndex });
      continue;
    }
    if (k.type === 'TEXT' || isHeadingTitleWrapper(k)) {
      titles++;
      slots.push({ kind: 'title', node: k, childIndex });
      continue;
    }
    if (isHeadingMetaSlot(k)) {
      metas++;
      if (metas > 1) return null;
      slots.push({ kind: 'meta', node: k, childIndex });
      continue;
    }
    return null;
  }
  if (titles < 1) return null;
  return slots;
}

/** 섹션 머리줄(heading) — `parseHeadingSlots` 성공 여부. */
function isHeadingLike(node: LikeNode): boolean {
  return parseHeadingSlots(node) != null;
}

/** 타이틀 래퍼: TEXT 하나만 담은 작은 FRAME/GROUP. */
function isHeadingTitleWrapper(node: LikeNode): boolean {
  if (node.type !== 'FRAME' && node.type !== 'GROUP') return false;
  const kd = dims(node);
  if (kd && kd.h > 64) return false;
  const kids = (node.children ?? []).filter(isVisible);
  return kids.length === 1 && kids[0].type === 'TEXT';
}

/** 메타 슬롯(Num 등): 작은 가로/무레이아웃 그룹, 자식은 TEXT(또는 TEXT만 있는 래퍼). */
function isHeadingMetaSlot(node: LikeNode): boolean {
  if (node.type !== 'FRAME' && node.type !== 'GROUP') return false;
  if (layoutOf(node) === 'vertical') return false;
  const kd = dims(node);
  if (kd && kd.h > 48) return false;
  const kids = (node.children ?? []).filter(isVisible);
  if (kids.length < 1 || kids.length > 4) return false;
  return kids.every(
    (k) => k.type === 'TEXT' || isHeadingTitleWrapper(k),
  );
}

/* ---------- 탭(§4.7 "묶기" 1번, 2026-11-05) ---------- */
export type TabStyle = 'Text' | 'Pill' | 'Box';

/** 탭 판정 결과 — 칸 종류 · 선택 칸 위치(0부터) · 선택 칸 색 · Style. 탭이 아니면 null. */
export interface TabInfo {
  style: TabStyle;
  selected: number;
  /** 선택 칸 색 — 글자 칸은 글자 색, 틀 칸은 칸 채움(없으면 안쪽 글자 색). */
  selectedColor: string;
  /** 선택 안 된 칸의 글자 색. 나머지 칸끼리는 모양이 같으므로 첫 나머지 칸의 글자 색. */
  unselectedTextColor: string;
  /**
   * 칸마다 넓힌 모양(색 · 굵기 · 밑줄 · 막대 — §4.7 "묶기" 1번 ②). ① · ② 모두 이 모양으로 2번의 칸 맞추기 ·
   * 재사용 지문을 본다(2026-11-19).
   */
  cellLooks: string[];
  /** ② 넓힌 구조로 판정됐나(이름 조건을 거친 탭). */
  wide: boolean;
}

/** 글자 '탭'(U+D0ED) — 화면 문구가 아니라 이름 판정용이라 i18n 밖에 둔다. */
const TAB_HANGUL = String.fromCharCode(0xd0ed);
const TAB_WORDS = new Set(['tab', 'tabs', 'tabbar', 'tablist', 'tabmenu', 'tabgroup']);
/** 넓힌 구조 탭의 이름 조건(§4.7 "묶기" 1번 ②) — `kebab` 낱말 `tab` · `tabs` · `tabbar` · `tablist` · `tabmenu` · `tabgroup`, 또는 글자 `탭`. */
export function isTabName(name: string): boolean {
  if (name.includes(TAB_HANGUL)) return true;
  return kebab(name).split('-').some((w) => TAB_WORDS.has(w));
}

/**
 * 틀 칸의 막대(§4.7 "묶기" 1번 ②) — 마지막 보이는 직접 자식이면서 LINE이거나 높이 4 이하 RECTANGLE, 폭 ≥ 칸 폭 / 2,
 * 칸 아래 끝에 붙음(`y` + 높이 ≥ 칸 높이 − 1). 아니면 null.
 */
function cellBar(cell: LikeNode): LikeNode | null {
  const kids = (cell.children ?? []).filter(isVisible);
  const last = kids[kids.length - 1];
  if (!last) return null;
  const d = dims(last);
  const cd = dims(cell);
  if (!d || !cd) return null;
  if (last.type !== 'LINE' && !(last.type === 'RECTANGLE' && d.h <= 4)) return null;
  if (d.w < cd.w / 2) return null;
  if ((last.y ?? 0) + d.h < cd.h - 1) return null;
  return last;
}

/** 칸 안의 보이는 직접 TEXT 하나(틀 칸 조건). 아니면 null. 그 밖의 자식은 아이콘(그림)만 — `bar`면 막대 하나도 허용. */
function cellText(cell: LikeNode, bar = false): LikeNode | null {
  const kids = (cell.children ?? []).filter(isVisible);
  const texts = kids.filter((k) => k.type === 'TEXT');
  if (texts.length !== 1) return null;
  const b = bar ? cellBar(cell) : null;
  const others = kids.filter((k) => k.type !== 'TEXT' && k !== b);
  if (others.some((k) => !isIconLike(k))) return null;
  return texts[0];
}

/** 탭 칸 안에 허용하는 그림 — 날 벡터, 또는 아이콘 프레임(§4.7 "묶기" 3번: 96 이하 · 벡터 1개 이상 · 벡터 · 원 · 사각형과 그 묶음뿐). */
function isIconLike(n: LikeNode): boolean {
  if (VECTOR_TYPES.has(n.type) || n.iconFrame) return true;
  if (n.type !== 'FRAME' && n.type !== 'GROUP') return false;
  const d = dims(n);
  if (!d || d.w > 96 || d.h > 96) return false;
  let vectors = 0;
  const ok = (x: LikeNode): boolean => (x.children ?? []).every((c) => {
    if (VECTOR_TYPES.has(c.type)) { vectors++; return true; }
    if (c.type === 'ELLIPSE' || c.type === 'RECTANGLE') return !hasImageFill(c);
    if (c.type === 'FRAME' || c.type === 'GROUP') return !hasImageFill(c) && ok(c);
    return false;
  });
  return ok(n) && vectors > 0;
}

/**
 * 아이콘 프레임인가(§4.7 "묶기" 3번 — `code.ts` `iconFrameKeyOf`와 같은 조건): FRAME · GROUP, 96 이하,
 * 자손에 벡터 1개 이상, 자손이 벡터 · 원 · 사각형과 그것을 담은 GROUP · FRAME뿐(글자 · 사진 · 인스턴스 없음).
 * 선택 루트(자식을 비우지 않은 StructNode)에도 쓴다 — 후보 게이트가 루트도 본다.
 */
export function isIconFrame(n: LikeNode): boolean {
  if (n.type !== 'FRAME' && n.type !== 'GROUP') return false;
  if (n.iconFrame) return true;
  if (hasImageFill(n)) return false;
  return isIconLike(n);
}

export function shortOneLine(t: LikeNode): boolean {
  const c = t.characters;
  if (typeof c !== 'string') return false;
  return !/[\n\r\u2028]/.test(c) && c.trim().length > 0 && c.trim().length <= 24;
}

const weightOf = (t: LikeNode): number | 'mixed' => (typeof t.fontWeight === 'number' ? t.fontWeight : typeof t.fontWeight === 'symbol' ? 'mixed' : 400);
const underlineOf = (t: LikeNode): boolean => t.textDecoration === 'UNDERLINE';

/**
 * 탭이면 정보, 아니면 null(§4.7 "묶기" 1번 — 2026-11-19 사용자 결정 B).
 * ① 엄격한 구조(이름 없이): 칸 3개 이상 · 색 모양이 다른 칸이 정확히 하나. ② 넓힌 구조(`wide` — 기본 참):
 * 칸 2개 이상 · 색 + 굵기 + 밑줄 + 막대 모양, 칸 2개면 표지 순서로 선택 칸 — 이름 조건(`isTabName`)이 맞을 때만.
 */
export function tabInfo(node: LikeNode, opts: { wide?: boolean } = {}): TabInfo | null {
  if (node.type !== 'FRAME') return null;
  if (layoutOf(node) !== 'horizontal') return null;
  const d = dims(node);
  if (!d || d.h > 80) return null;
  const cells = (node.children ?? []).filter(isVisible);
  if (cells.length < 2) return null;
  const strict = cells.length >= 3 ? strictTab(cells) : null;
  if (strict) return strict;
  if (opts.wide === false) return null;
  if (!isTabName(node.nameKey ?? node.name ?? '')) return null;
  return wideTab(cells);
}

/** 칸마다 넓힌 모양 — 틀 칸은 막대 하나를 허용해 읽는다. 칸이 탭 칸 조건에 맞지 않으면 null. */
function wideLooks(cells: readonly LikeNode[]): { looks: string[]; texts: LikeNode[]; bars: boolean[]; textCells: boolean } | null {
  if (cells.every((c) => c.type === 'TEXT')) {
    if (!cells.every(shortOneLine)) return null;
    if (cells.some((c) => !c.fillHex)) return null;
    const looks = cells.map((c) => `${c.fillHex}|${String(weightOf(c))}|${underlineOf(c) ? 'u' : ''}`);
    return { looks, texts: [...cells], bars: cells.map(() => false), textCells: true };
  }
  if (!cells.every((c) => c.type === 'FRAME')) return null;
  const texts = cells.map((c) => cellText(c, true));
  if (texts.some((t) => !t || !shortOneLine(t) || !t.fillHex)) return null;
  if (cells.some((c) => typeof c.fills === 'symbol' || (hasVisibleFill(c) && !c.fillHex))) return null;
  const bars = cells.map((c) => cellBar(c) != null);
  const looks = cells.map((c, i) => {
    const t = texts[i]!;
    return `${hasVisibleFill(c) ? c.fillHex : ''}|${hasVisibleStroke(c) ? 's' : ''}|${t.fillHex}|${String(weightOf(t))}|${underlineOf(t) ? 'u' : ''}|${bars[i] ? 'b' : ''}`;
  });
  return { looks, texts: texts as LikeNode[], bars, textCells: false };
}

function finishTab(cells: readonly LikeNode[], selected: number, textCells: boolean, texts: readonly LikeNode[], looks: string[], wide: boolean): TabInfo {
  const sel = cells[selected];
  let style: TabStyle = 'Text';
  if (!textCells) style = hasVisibleFill(sel) && cornerRadiusOf(sel) > 0 ? 'Pill' : 'Box';
  const colorOf = (i: number): string => (!textCells && hasVisibleFill(cells[i]) && cells[i].fillHex ? (cells[i].fillHex as string) : (texts[i].fillHex as string));
  const other = selected === 0 ? 1 : 0;
  return { style, selected, selectedColor: colorOf(selected), unselectedTextColor: texts[other].fillHex as string, cellLooks: looks, wide };
}

/** ① 엄격한 구조 — 고치기 전 `tabInfo` 그대로(칸 3개 이상 · 색 모양 · 칸 안 LINE은 그림). */
function strictTab(cells: readonly LikeNode[]): TabInfo | null {
  let looks: string[];
  let texts: LikeNode[];
  let textCells: boolean;
  if (cells.every((c) => c.type === 'TEXT')) {
    textCells = true;
    if (!cells.every(shortOneLine)) return null;
    if (cells.some((c) => !c.fillHex)) return null; // 섞인 색 · 없음
    looks = cells.map((c) => c.fillHex as string);
    texts = [...cells];
  } else if (cells.every((c) => c.type === 'FRAME')) {
    textCells = false;
    const ts = cells.map((c) => cellText(c));
    if (ts.some((t) => !t || !shortOneLine(t) || !t.fillHex)) return null;
    // 칸 채움이 섞인 색(symbol)이거나 단색이 아니면(그라데이션 · 사진) 탭이 아니다 — 칸 모양을 비교할 수 없다.
    if (cells.some((c) => typeof c.fills === 'symbol' || (hasVisibleFill(c) && !c.fillHex))) return null;
    texts = ts as LikeNode[];
    looks = cells.map((c, i) => `${hasVisibleFill(c) ? c.fillHex : ''}|${hasVisibleStroke(c) ? 's' : ''}|${texts[i].fillHex}`);
  } else {
    return null;
  }
  // 선택 칸이 정확히 하나 — 나머지 칸끼리는 모양이 모두 같다.
  const counts = new Map<string, number>();
  for (const l of looks) counts.set(l, (counts.get(l) ?? 0) + 1);
  if (counts.size !== 2) return null;
  const odd = [...counts.entries()].find(([, n]) => n === 1);
  if (!odd) return null;
  // 칸이 3개 이상이므로 나머지 모양은 2번 이상 — 한 번 나온 쪽이 선택 칸.
  const selected = looks.indexOf(odd[0]);
  // 넓힌 모양(칸 맞추기 · 재사용 지문) — 막대를 허용해 다시 읽고, 못 읽으면(칸 안 LINE이 막대 조건 밖 등) 색 모양 그대로.
  const wl = wideLooks(cells);
  return finishTab(cells, selected, textCells, texts, wl ? wl.looks : looks, false);
}

/** ② 넓힌 구조(이름 조건은 부르는 쪽이 본다). */
function wideTab(cells: readonly LikeNode[]): TabInfo | null {
  const wl = wideLooks(cells);
  if (!wl) return null;
  const { looks, texts, bars, textCells } = wl;
  if (texts.some((t) => weightOf(t) === 'mixed')) return null; // 섞인 굵기
  if (cells.length >= 3) {
    const counts = new Map<string, number>();
    for (const l of looks) counts.set(l, (counts.get(l) ?? 0) + 1);
    if (counts.size !== 2) return null;
    const odd = [...counts.entries()].find(([, n]) => n === 1);
    if (!odd) return null;
    return finishTab(cells, looks.indexOf(odd[0]), textCells, texts, looks, true);
  }
  // 칸 2개 — 표지 순서(막대 → 밑줄 → 굵기 → 채움 → 선)로 처음 갈리는 표지를 가진 칸이 선택. 색만 다르면 탭 아님.
  if (looks[0] === looks[1]) return null;
  const marks: ((i: number) => number)[] = [
    (i) => (bars[i] ? 1 : 0),
    (i) => (underlineOf(texts[i]) ? 1 : 0),
    (i) => weightOf(texts[i]) as number,
    (i) => (!textCells && hasVisibleFill(cells[i]) ? 1 : 0),
    (i) => (!textCells && hasVisibleStroke(cells[i]) ? 1 : 0),
  ];
  for (const m of marks) {
    const a = m(0);
    const b = m(1);
    if (a !== b) return finishTab(cells, a > b ? 0 : 1, textCells, texts, looks, true);
  }
  return null;
}
