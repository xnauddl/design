/* ============================================================
   componentLike.ts — 고신뢰 시맨틱 역할 검출 (figma.* 의존 없음)
   rename.ts `highConfidenceRole`과 동일 코어(button~list). heading은 컴포넌트 후보 전용.
   컴포넌트 후보 eligible 게이트에 쓰며, 리네임 실행 여부와 무관하게 구조만으로 판정.
   ============================================================ */

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
export function highConfidenceComponentRole(node: LikeNode): HighConfidenceRole | null {
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

function paints(node: LikeNode, field: 'fills' | 'strokes'): PaintLike[] | null {
  const p = node[field];
  return Array.isArray(p) ? (p as PaintLike[]) : null;
}

function hasVisibleFill(node: LikeNode): boolean {
  const f = paints(node, 'fills');
  return !!f && f.some((p) => p.visible !== false);
}

function hasImageFill(node: LikeNode): boolean {
  const f = paints(node, 'fills');
  return !!f && f.some((p) => p.visible !== false && p.type === 'IMAGE');
}

function hasColorFill(node: LikeNode): boolean {
  const f = paints(node, 'fills');
  return !!f && f.some((p) => p.visible !== false && p.type !== 'IMAGE');
}

function hasVisibleStroke(node: LikeNode): boolean {
  const s = paints(node, 'strokes');
  return !!s && s.some((p) => p.visible !== false);
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
  const hasLabel = shown.some((k) => k.type === 'TEXT');
  const hasInput = shown.some(isInputBox);
  return hasLabel && hasInput;
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
