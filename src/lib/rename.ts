/* ============================================================
   rename.ts — 레이어를 "역할(role)"에 맞게 정돈 (naming.ts 규칙 사용)
   원칙: 역할이 이름을 정한다. 토큰은 신호로만 쓰고 경로를 복사하지 않는다.
   - 정규화: 뚜렷한 역할(card/list/field/button/header… 등)은 역할 기반 이름으로 교체(사람이 지은 이름도 덮어씀).
     역할 없는 순수 레이아웃(container/wrapper 폴백)은 맥락 없는 plain 역할명으로 정리하고 맥락만 자식에게 통과.
     선택 루트(depth 0) 컨테이너는 보존(자식 맥락 앵커) — 단 카드/리스트/필드/버튼처럼 확실한 시멘틱이면 루트도 교체.
   - 역할 판정: nav → 버튼/칩 → 영역(landmark) → 리스트아이템 → 토큰 말단 → 시맨틱 컨테이너 → 타입/기하 순.
     · HTML 랜드마크: 첫→header·마지막→footer·3분할 가운데→main·그 외 페이지 중간→section,
       가로 좁은 컬럼→aside, 가로 링크행→nav, 이미지+캡션→figure, 피드 안 카드형 항목→article
     · 버튼/칩: 오토레이아웃 + 라운드 + 채움/외곽선 + 직속 텍스트 → button(작고 알약형이면 chip)
     · 시맨틱 컨테이너: 라벨+입력 → field, 반복 아이템 → list, 표면+라운드/그림자 → card
     · HTML 랜드마크와 컴포넌트/디자인 어휘(card/chip/avatar…)를 함께 사용. 리스트 항목은 영역보다 우선.
   - 맥락: 바로 위 의미 있는 이름에서 깨끗한 1단계만(pickScope). 숫자·단위 조각 제거.
   - 이름 형식: {맥락}-{역할} 최대 2토막. 형제 충돌에 숫자 안 붙임(Figma 중복 허용).
   - 제외: Component/ComponentSet · Text · Instance · 잠긴 레이어.
   ============================================================ */
import { parseTokenName, layerNameFromRole, pickScope, kebab } from './naming';
import type { ParsedToken } from './naming';
import type { RenameChange, RenameNode } from '../shared/messages';

/** 자식에게 내려보내는 위치 정보(영역 추론용). depth 0 = 선택 루트. */
interface Pos {
  index: number;
  total: number;
  parentLayout: 'vertical' | 'horizontal' | null;
  depth: number;
  /** 가로 부모에서 형제 최대폭 대비 비율(aside 판정용). 세로/없음이면 null. */
  widthFrac: number | null;
}

interface Opts {
  apply: boolean;
  maxDepth: number;
}

export interface RenameOutcome {
  changes: RenameChange[];
  /** 선택 서브트리 전체(미리보기 트리 #13용). 영향 노드는 `after` 보유. */
  nodes: RenameNode[];
  applied: boolean;
}

/** 순회 중 수집물(변경분 + 트리 노드). */
interface Collect {
  changes: RenameChange[];
  nodes: RenameNode[];
}

export async function renameSelection(
  selection: readonly SceneNode[],
  opts: Opts,
): Promise<RenameOutcome> {
  const col: Collect = { changes: [], nodes: [] };
  await recurse(selection, null, opts, col, 0, null, null, false);
  return { changes: col.changes, nodes: col.nodes, applied: opts.apply };
}

async function recurse(
  nodes: readonly SceneNode[],
  ancestorName: string | null,
  opts: Opts,
  col: Collect,
  depth: number,
  parentLayout: Pos['parentLayout'],
  parentId: string | null,
  parentIsList: boolean,
): Promise<void> {
  const total = nodes.length;
  // 가로 스플릿에서 좁은 컬럼(aside) 판정용 — 형제 최대폭.
  const widths = parentLayout === 'horizontal' ? nodes.map((n) => dims(n)?.w ?? null) : null;
  const maxW = widths ? Math.max(0, ...widths.filter((w): w is number => w != null)) : 0;
  for (let i = 0; i < total; i++) {
    const node = nodes[i];
    const before = node.name; // apply 시 node.name이 바뀌므로 먼저 캡처
    const wi = widths ? widths[i] : null;
    const widthFrac = wi != null && maxW > 0 ? wi / maxW : null;
    const pos: Pos = { index: i, total, parentLayout, depth, widthFrac };
    const decided = await decide(node, ancestorName, pos, opts, parentIsList);
    let contextForChildren: string | null = before;
    let after: string | undefined;

    if (!decided.skip && decided.name) {
      // 숫자 접미사 없음 — 형제가 같은 이름이어도 그대로(Figma는 중복 이름 허용).
      if (decided.name !== before) {
        after = decided.name;
        col.changes.push({ id: node.id, before, after });
        if (opts.apply) node.name = after;
      }
      // 맥락: 일반 레이아웃(passthrough)은 받은 맥락을 그대로 통과, 그 외엔 내 새 이름.
      contextForChildren = decided.passthrough ? ancestorName : decided.name;
    }

    // 영향 여부와 무관하게 트리에 담는다(전체 서브트리 + 영향 노드 강조).
    col.nodes.push({ id: node.id, name: before, type: node.type, depth, parentId, after });

    // #7b-2: 인스턴스 서브트리는 통째로 스킵(내부는 메인 컴포넌트 소유 → 리네임 무의미·에러 위험).
    if ('children' in node && node.type !== 'INSTANCE') {
      // 리네임 채택 여부와 무관하게 부모가 리스트면 자식에 전달(자식 → item).
      const childInList = node.type === 'FRAME' && isListLike(node, node.children);
      await recurse(node.children, contextForChildren, opts, col, depth + 1, layoutOf(node), node.id, childInList);
    }
  }
}

async function decide(
  node: SceneNode,
  ancestorName: string | null,
  pos: Pos,
  opts: Opts,
  parentIsList: boolean,
): Promise<{ skip: boolean; name?: string; passthrough?: boolean }> {
  // 제외 규칙(이름 유지 · 자기 이름을 자식 맥락으로 전달)
  if (node.type === 'COMPONENT' || node.type === 'COMPONENT_SET') return { skip: true };
  if (node.type === 'TEXT') return { skip: true };
  if (node.type === 'INSTANCE') return { skip: true };
  if (node.locked) return { skip: true };

  // #7b-1: 선택 루트(depth 0) 컨테이너는 보존 — 자식의 맥락 앵커로만 쓴다.
  // 단, 구조로 "확실한" 시멘틱(card/list/field/button/chip)이면 루트라도 역할명으로 교체.
  if (pos.depth === 0 && isContainerType(node)) {
    const hc = highConfidenceRole(node);
    if (!hc) return { skip: true };
    let hcScope = ancestorName ? pickScope(ancestorName) : null;
    if (hcScope === hc) hcScope = null;
    return { skip: false, name: layerNameFromRole(hcScope, hc, { maxDepth: opts.maxDepth }) };
  }

  // 전체 정규화: 현재 이름과 무관하게 역할 기반 이름으로 교체(사람이 지은 이름도 덮어씀).
  // 구조적 제외(위)와 선택 루트 보존(#7b-1)만 예외 — 그 외엔 모두 역할명으로.
  const token = await primaryToken(node);
  const role = resolveRole(node, token, pos, parentIsList);
  // 역할 없는 순수 레이아웃(container/wrapper 폴백)은 맥락 없는 plain 역할명으로 정리하되,
  // 상속 맥락은 자식에게 그대로 통과(passthrough)시켜 의미있는 후손이 카드 맥락을 받게.
  if (PASSTHROUGH_ROLES.has(role)) return { skip: false, name: role, passthrough: true };
  // 맥락: 바로 위 의미 있는 이름에서 깨끗한 1단계 → 없으면 토큰 경로 접두사에서.
  let scope = (ancestorName ? pickScope(ancestorName) : null) ?? (token?.context ? pickScope(token.context) : null);
  if (scope === role) scope = null; // 맥락==역할이면 중복 제거(button-button 방지)
  return { skip: false, name: layerNameFromRole(scope, role, { maxDepth: opts.maxDepth }) };
}

/** 역할 없는 순수 레이아웃 폴백 — 맥락 없는 plain 역할명으로 정리하고 맥락만 자식에게 통과. */
const PASSTHROUGH_ROLES = new Set(['container', 'wrapper']);

/* ---------- 역할 판정: 버튼/칩 → 영역 → 리스트아이템 → 토큰 신호 → 시맨틱 컨테이너 → 타입/기하 ---------- */
function resolveRole(node: SceneNode, token: ParsedToken | null, pos: Pos, parentIsList: boolean): string {
  if (isNavLike(node)) return 'nav'; // HTML 랜드마크: 가로 링크행은 버튼보다 우선
  if (isButtonLike(node)) return isChipLike(node) ? 'chip' : 'button'; // 버튼은 토큰 채움색보다 우선
  // 리스트/피드 항목은 페이지 영역(header/footer 등)보다 우선 — 부모가 반복 리스트일 때만 true.
  if (parentIsList && isContainerType(node)) {
    const kids = 'children' in node ? node.children : [];
    if (isCardLike(node, kids)) return 'article'; // 피드 안의 카드형 항목 → article
    return 'item'; // 그 외 리스트 직속 컨테이너 → item(=list-item)
  }
  const region = regionRole(node, pos); // HTML 랜드마크: header/footer/main/aside
  if (region) return region;
  if (token?.roleLeaf) return token.roleLeaf; // 토큰 말단이 역할이면 신호로 사용

  switch (node.type) {
    case 'VECTOR':
    case 'BOOLEAN_OPERATION':
    case 'STAR':
    case 'POLYGON':
      return 'icon';
    case 'LINE':
      return 'divider';
    case 'RECTANGLE':
    case 'ELLIPSE': {
      if (isThin(node)) return 'divider';
      if (hasImageFill(node)) return node.type === 'ELLIPSE' ? 'avatar' : 'image';
      if (hasVisibleFill(node)) return 'background';
      if (hasVisibleStroke(node)) return 'border';
      return 'shape';
    }
    case 'FRAME':
    case 'GROUP':
    case 'SECTION': {
      const kids = 'children' in node ? node.children : [];
      if (kids.length === 0) {
        // 자식 없는 프레임: 색만 채웠으면 스와치, 이미지면 image, 비었으면 container.
        if (hasImageFill(node)) return 'image';
        if (hasColorFill(node)) return 'swatch';
        return 'container';
      }
      // 시맨틱 컨테이너(보수적): 명확한 패턴만 인정, 아니면 일반 container/wrapper.
      if (isFieldLike(node, kids)) return 'field';
      if (isListLike(node, kids)) return 'list';
      if (isCardLike(node, kids)) return 'card';
      if (isFigureLike(node, kids)) return 'figure'; // HTML 랜드마크: 이미지+캡션
      if (isPageSection(pos)) return 'section'; // HTML 랜드마크: 역할 없는 페이지 중간 블록
      return kids.length === 1 ? 'wrapper' : 'container';
    }
    default:
      return kebab(node.type);
  }
}

/**
 * 선택 루트(보존 대상)라도 덮어쓸 만큼 "구조로 확실한" 시멘틱 역할만 반환(아니면 null → 보존).
 * 위치/토큰 같은 약한 신호나 일반 구조(container/wrapper)는 제외 —
 * 선택 루트를 바꾸려면 그 노드 자체가 명백히 그 시멘틱이어야 한다.
 */
function highConfidenceRole(node: SceneNode): string | null {
  if (isNavLike(node)) return 'nav';
  if (isButtonLike(node)) return isChipLike(node) ? 'chip' : 'button';
  if ('children' in node && isContainerType(node)) {
    const kids = node.children;
    if (kids.length) {
      if (isFieldLike(node, kids)) return 'field';
      if (isListLike(node, kids)) return 'list';
      if (isCardLike(node, kids)) return 'card';
      if (isFigureLike(node, kids)) return 'figure';
    }
  }
  return null;
}

/* ---------- 주(主) 바인딩 토큰 → 파싱된 신호 ---------- */
const FIELD_ORDER = [
  'fills',
  'strokes',
  'width',
  'height',
  'topLeftRadius',
  'itemSpacing',
  'paddingLeft',
  'paddingTop',
] as const;

async function primaryToken(node: SceneNode): Promise<ParsedToken | null> {
  const bv = (node as { boundVariables?: Record<string, unknown> }).boundVariables;
  if (!bv) return null;
  for (const field of FIELD_ORDER) {
    const id = firstAliasId(bv[field]);
    if (id) {
      const v = await figma.variables.getVariableByIdAsync(id);
      if (v) return parseTokenName(v.name);
    }
  }
  return null;
}

function firstAliasId(entry: unknown): string | undefined {
  if (!entry) return undefined;
  if (Array.isArray(entry)) return (entry[0] as VariableAlias | undefined)?.id;
  return (entry as VariableAlias).id;
}

/* ---------- 기하/페인트 신호(동기 · figma.mixed·미존재 안전) ---------- */
function dims(node: SceneNode): { w: number; h: number } | null {
  if (!('width' in node) || !('height' in node)) return null;
  const w = (node as LayoutMixin).width;
  const h = (node as LayoutMixin).height;
  if (typeof w !== 'number' || typeof h !== 'number') return null;
  return { w, h };
}

/** 얇은 막대(구분선) — 한 변이 ≤2px 또는 종횡비가 극단(≥25:1). */
function isThin(node: SceneNode): boolean {
  const d = dims(node);
  if (!d) return false;
  const min = Math.min(d.w, d.h);
  const max = Math.max(d.w, d.h);
  if (min <= 0) return false;
  return min <= 2 || max / min >= 25;
}

function paints(node: SceneNode, field: 'fills' | 'strokes'): Paint[] | null {
  if (!(field in node)) return null;
  const p = (node as unknown as Record<string, unknown>)[field];
  return Array.isArray(p) ? (p as Paint[]) : null; // figma.mixed → 배열 아님 → null
}

function hasVisibleFill(node: SceneNode): boolean {
  const f = paints(node, 'fills');
  return !!f && f.some((p) => p.visible !== false);
}

function hasImageFill(node: SceneNode): boolean {
  const f = paints(node, 'fills');
  return !!f && f.some((p) => p.visible !== false && p.type === 'IMAGE');
}

/** 보이는 색(단색·그라데이션, 이미지 제외) 채움이 있는지 — 스와치 판정용. */
function hasColorFill(node: SceneNode): boolean {
  const f = paints(node, 'fills');
  return !!f && f.some((p) => p.visible !== false && p.type !== 'IMAGE');
}

function hasVisibleStroke(node: SceneNode): boolean {
  const s = paints(node, 'strokes');
  return !!s && s.some((p) => p.visible !== false);
}

/* ---------- 시맨틱(영역/버튼) 추론 ---------- */
function layoutOf(node: SceneNode): Pos['parentLayout'] {
  if (!('layoutMode' in node)) return null;
  const m = (node as { layoutMode?: string }).layoutMode;
  return m === 'VERTICAL' ? 'vertical' : m === 'HORIZONTAL' ? 'horizontal' : null;
}

function isContainerType(node: SceneNode): boolean {
  return node.type === 'FRAME' || node.type === 'GROUP' || node.type === 'SECTION';
}

/**
 * HTML 랜드마크 영역 추론(보수적, depth 1 컨테이너만):
 * - 가로 스플릿: 형제 최대폭 대비 ≤40%인 좁은 컬럼 → aside(사이드바)
 * - 세로 페이지: 첫 → header, 마지막 → footer, 정확히 3분할이면 가운데 → main
 *   (total>3의 중간 블록 → section은 폴백으로 FRAME 분기에서 처리)
 */
function regionRole(node: SceneNode, pos: Pos): string | null {
  if (pos.depth !== 1 || !isContainerType(node)) return null;
  if (pos.parentLayout === 'horizontal') {
    return pos.widthFrac != null && pos.widthFrac <= 0.4 ? 'aside' : null;
  }
  if (pos.parentLayout !== 'vertical' || pos.total < 2) return null;
  if (pos.index === 0) return 'header';
  if (pos.index === pos.total - 1) return 'footer';
  if (pos.total === 3) return 'main'; // 가운데(0·마지막은 위에서 처리됨)
  return null;
}

/** 페이지(세로 스택, total>3)의 역할 없는 중간 블록인지 — section 폴백. */
function isPageSection(pos: Pos): boolean {
  return (
    pos.depth === 1 &&
    pos.parentLayout === 'vertical' &&
    pos.total > 3 &&
    pos.index > 0 &&
    pos.index < pos.total - 1
  );
}

/** 버튼 추론: 오토레이아웃 + 라운드 + 채움/외곽선 + 직속 텍스트 + 과대하지 않음. */
function isButtonLike(node: SceneNode): boolean {
  if (node.type !== 'FRAME') return false;
  if (layoutOf(node) === null) return false; // 오토레이아웃만
  if (!(cornerRadiusOf(node) > 0)) return false;
  if (!hasVisibleFill(node) && !hasVisibleStroke(node)) return false;
  if (!hasDirectText(node)) return false;
  const d = dims(node);
  if (d && d.h > 80) return false; // 너무 크면 버튼 아님(영역/카드)
  return true;
}

function cornerRadiusOf(node: SceneNode): number {
  const r = (node as { cornerRadius?: number | symbol }).cornerRadius;
  if (typeof r === 'number') return r;
  const tl = (node as { topLeftRadius?: number }).topLeftRadius; // mixed 라운드면 한 모서리로 판단
  return typeof tl === 'number' ? tl : 0;
}

function hasDirectText(node: SceneNode): boolean {
  return 'children' in node && node.children.some((c) => c.type === 'TEXT');
}

/* ---------- 시맨틱 컨테이너(카드/리스트/필드)·칩 추론 ---------- */
/** 칩: 작은(높이 ≤28) 알약형(반지름 ≥ 높이/2) — 버튼 중 작고 둥근 것. */
function isChipLike(node: SceneNode): boolean {
  const d = dims(node);
  if (!d || d.h > 28) return false;
  return cornerRadiusOf(node) >= d.h / 2 - 1;
}

/** 보이는 드롭섀도가 있는지(카드 판정용). */
function hasDropShadow(node: SceneNode): boolean {
  const eff = (node as { effects?: readonly Effect[] }).effects;
  return Array.isArray(eff) && eff.some((e) => e.visible !== false && e.type === 'DROP_SHADOW');
}

/** 카드: 표면(채움/외곽선) + 라운드 또는 그림자 + 자식 2개 이상인 프레임. */
function isCardLike(node: SceneNode, kids: readonly SceneNode[]): boolean {
  if (node.type !== 'FRAME') return false;
  if (kids.length < 2) return false;
  if (!hasVisibleFill(node) && !hasVisibleStroke(node)) return false;
  return cornerRadiusOf(node) > 0 || hasDropShadow(node);
}

/** 리스트 아이템이 될 수 있는(구조적) 자식 타입. */
const LIST_ITEM_TYPES = new Set(['FRAME', 'GROUP', 'INSTANCE', 'COMPONENT', 'RECTANGLE', 'ELLIPSE']);

/** 리스트: 오토레이아웃 + 같은 타입·유사 크기 자식 3개 이상(반복 아이템). */
function isListLike(node: SceneNode, kids: readonly SceneNode[]): boolean {
  if (node.type !== 'FRAME') return false;
  if (layoutOf(node) === null) return false; // 오토레이아웃만(우연한 겹침 배제)
  if (kids.length < 3) return false;
  const counts = new Map<string, number>();
  for (const k of kids) counts.set(k.type, (counts.get(k.type) ?? 0) + 1);
  let domType: string | null = null;
  let domCount = 0;
  for (const [t, c] of counts) if (c > domCount) { domCount = c; domType = t; }
  if (!domType || domCount / kids.length < 0.8) return false; // 8할 이상 같은 타입
  if (!LIST_ITEM_TYPES.has(domType)) return false;
  return dimsSimilar(kids); // 크기까지 유사해야 반복 아이템(페이지 섹션 스택 배제)
}

/** 모든 자식의 너비·높이가 서로 비슷한지(반복 행/카드 신호). 치수 없으면 보수적으로 false. */
function dimsSimilar(kids: readonly SceneNode[]): boolean {
  const ws: number[] = [];
  const hs: number[] = [];
  for (const k of kids) {
    const d = dims(k);
    if (!d) return false;
    ws.push(d.w);
    hs.push(d.h);
  }
  return ratioWithin(ws, 1.5) && ratioWithin(hs, 1.5);
}

function ratioWithin(xs: number[], max: number): boolean {
  const mn = Math.min(...xs);
  const mx = Math.max(...xs);
  if (mn <= 0) return false;
  return mx / mn <= max;
}

/** 필드: 세로 스택 안에 라벨(텍스트) + 입력박스(외곽선/채움의 가로형 상자). */
function isFieldLike(node: SceneNode, kids: readonly SceneNode[]): boolean {
  if (node.type !== 'FRAME') return false;
  if (layoutOf(node) !== 'vertical') return false; // 라벨 위, 입력 아래
  if (kids.length < 2 || kids.length > 3) return false; // 라벨+입력(+도움말) 정도
  const hasLabel = kids.some((k) => k.type === 'TEXT');
  const hasInput = kids.some(isInputBox);
  return hasLabel && hasInput;
}

/** 입력박스: 외곽선/채움 있는 가로로 긴(너비 ≥ 높이×2) 프레임·사각형. */
function isInputBox(node: SceneNode): boolean {
  if (node.type !== 'FRAME' && node.type !== 'RECTANGLE') return false;
  if (!hasVisibleStroke(node) && !hasVisibleFill(node)) return false;
  const d = dims(node);
  return !!d && d.h > 0 && d.w >= d.h * 2;
}

/* ---------- HTML 랜드마크(nav/figure) 추론 ---------- */
/** 네비: 가로 오토레이아웃 + 링크형(텍스트/텍스트 버튼) 자식 3개 이상, 과대하지 않음. */
function isNavLike(node: SceneNode): boolean {
  if (node.type !== 'FRAME') return false;
  if (layoutOf(node) !== 'horizontal') return false;
  const kids = node.children;
  if (kids.length < 3) return false;
  const d = dims(node);
  if (d && d.h > 80) return false; // 너무 크면 nav 아님(카드/섹션 행)
  return kids.every((k) => k.type === 'TEXT' || (k.type === 'FRAME' && hasDirectText(k)));
}

/** 피겨: 이미지(채움) 자식 + 캡션(텍스트)으로 이뤄진 프레임 — 카드 크롬이 없을 때만(카드 우선). */
function isFigureLike(node: SceneNode, kids: readonly SceneNode[]): boolean {
  if (node.type !== 'FRAME') return false;
  if (kids.length < 2 || kids.length > 3) return false;
  const hasImg = kids.some((k) => hasImageFill(k));
  const hasCaption = kids.some((k) => k.type === 'TEXT');
  return hasImg && hasCaption;
}
