/* ============================================================
   rename.ts — 레이어를 W3C HTML 태그명으로 정돈 (naming.ts 어휘 사용)
   원칙: 시각/구조 신호로 추론 가능한 것만 태그를, 모호하면 제네릭(div 계열)으로.
   - 이름 = 단일 토막(맥락 접두사·숫자 없음). Figma 중복명 허용.
   - 시맨틱 태그(추론): header·footer(영역) · button · ul/li · figure · img · svg · hr.
     · 영역: 페이지 세로 스택의 첫/마지막 컨테이너 → header/footer
     · 버튼: 오토레이아웃+라운드+채움/외곽선+직속 텍스트 → button
     · 목록: 오토레이아웃+동일 시그니처 형제 ≥3 → ul, 그 자식 → li
     · 그림: 이미지 1개(+캡션 텍스트)만 → figure
   - 제네릭 신호(깊이 무시): 스크롤(overflowDirection) → scroll, 라운드 박스(채움/외곽선) → box.
   - 제네릭 깊이 사다리(시맨틱 조상에서 리셋): wrap(0)→container(1)→content(2)→inner(3↑).
   - article/div/a/p 류는 추론하지 않고 제네릭 사다리로 둔다.
   - 제외(보존): Component/ComponentSet · Text · Instance · 잠긴 레이어 · 사람이 지은 이름.
   ============================================================ */
import { isDefaultName, isTokenEchoName, parseTokenName, depthWord, isGenericWord } from './naming';
import type { ParsedToken } from './naming';
import type { RenameChange } from '../shared/messages';

/** 자식에게 내려보내는 위치/문맥 정보. depth 0 = 선택 루트. */
interface Ctx {
  index: number;
  total: number;
  parentLayout: 'vertical' | 'horizontal' | null;
  depth: number;
  /** 시맨틱 조상 이후 제네릭 프레임 중첩 깊이 — wrap→container→content→inner. */
  genericDepth: number;
  /** 부모가 ul로 판정됨 → 이 노드는 li 후보. */
  parentIsList: boolean;
}

interface Opts {
  apply: boolean;
  maxDepth: number;
}

export interface RenameOutcome {
  changes: RenameChange[];
  applied: boolean;
}

export async function renameSelection(
  selection: readonly SceneNode[],
  opts: Opts,
): Promise<RenameOutcome> {
  const changes: RenameChange[] = [];
  await recurse(selection, opts, changes, 0, null, 0, false);
  return { changes, applied: opts.apply };
}

async function recurse(
  nodes: readonly SceneNode[],
  opts: Opts,
  out: RenameChange[],
  depth: number,
  parentLayout: Ctx['parentLayout'],
  genericDepth: number,
  parentIsList: boolean,
): Promise<void> {
  const total = nodes.length;
  for (let i = 0; i < total; i++) {
    const node = nodes[i];
    const ctx: Ctx = { index: i, total, parentLayout, depth, genericDepth, parentIsList };
    const decided = await decide(node, ctx);

    if (!decided.skip && decided.name && decided.name !== node.name) {
      // 숫자 접미사 없음 — 형제가 같은 이름이어도 그대로(Figma는 중복 이름 허용).
      out.push({ id: node.id, before: node.name, after: decided.name });
      if (opts.apply) node.name = decided.name;
    }

    if ('children' in node) {
      // 제네릭 단어면 깊이 +1, 시맨틱 태그/보존 노드면 0으로 리셋(맥락 경계).
      const childGenericDepth = !decided.skip && decided.generic ? genericDepth + 1 : 0;
      const childIsList = !decided.skip && decided.name === 'ul';
      await recurse(node.children, opts, out, depth + 1, layoutOf(node), childGenericDepth, childIsList);
    }
  }
}

async function decide(
  node: SceneNode,
  ctx: Ctx,
): Promise<{ skip: boolean; name?: string; generic: boolean }> {
  const keep = { skip: true, generic: false };

  // 제외 규칙(이름 유지 · 맥락 경계로만 사용)
  if (node.type === 'COMPONENT' || node.type === 'COMPONENT_SET') return keep;
  if (node.type === 'TEXT') return keep;
  if (node.type === 'INSTANCE') return keep;
  if (node.locked) return keep;

  // 보존형: 사람이 지은 의미 있는 이름은 그대로 둔다.
  // 단, Figma 기본명(Frame 12…)과 구 리네임의 토큰 베낌 이름(color-121210 등)은 교체.
  if (!isDefaultName(node.name) && !isTokenEchoName(node.name)) return keep;

  const token = await primaryToken(node);
  const tag = resolveTag(node, token, ctx);
  return { skip: false, name: tag, generic: isGenericWord(tag) };
}

/* ---------- 태그 판정: 목록항목 → 버튼 → 영역 → 목록/그림 → 토큰 → 타입/기하 ---------- */
function resolveTag(node: SceneNode, token: ParsedToken | null, ctx: Ctx): string {
  if (ctx.parentIsList && node.type !== 'TEXT') return 'li'; // ul의 직속 자식 → li
  if (isButtonLike(node)) return 'button';
  const region = regionRole(node, ctx);
  if (region) return region;
  if (looksLikeList(node)) return 'ul';
  if (looksLikeFigure(node)) return 'figure';
  if (token?.roleLeaf) {
    const t = TOKEN_TAG[token.roleLeaf];
    if (t) return t; // 토큰 말단 신호(예: 'background'→box, 'icon'→svg)
  }

  switch (node.type) {
    case 'VECTOR':
    case 'BOOLEAN_OPERATION':
    case 'STAR':
    case 'POLYGON':
      return 'svg';
    case 'LINE':
      return 'hr';
    case 'RECTANGLE':
    case 'ELLIPSE': {
      if (isThin(node)) return 'hr';
      if (hasImageFill(node)) return 'img';
      return 'box'; // 단색/외곽선 도형 → 박스
    }
    case 'FRAME':
    case 'GROUP':
    case 'SECTION': {
      if (isScrollable(node)) return 'scroll'; // 신호: 스크롤 프레임
      const count = 'children' in node ? node.children.length : 0;
      if (count === 0) {
        if (hasImageFill(node)) return 'img';
        if (hasVisibleFill(node) || hasVisibleStroke(node)) return 'box';
        return depthWord(ctx.genericDepth);
      }
      // 라운드 박스(채움/외곽선 + 모서리) → box, 그 외 레이아웃 프레임 → 깊이 사다리.
      if (cornerRadiusOf(node) > 0 && (hasVisibleFill(node) || hasVisibleStroke(node))) return 'box';
      return depthWord(ctx.genericDepth);
    }
    default:
      return depthWord(ctx.genericDepth);
  }
}

/** 토큰 말단(역할 어휘) → HTML 태그. parseTokenName이 주는 옛 역할명을 새 어휘로 매핑. */
const TOKEN_TAG: Record<string, string> = {
  background: 'box', swatch: 'box', border: 'box', badge: 'box',
  icon: 'svg', divider: 'hr', image: 'img', avatar: 'img',
};

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

function hasVisibleStroke(node: SceneNode): boolean {
  const s = paints(node, 'strokes');
  return !!s && s.some((p) => p.visible !== false);
}

/* ---------- 시맨틱(영역/버튼/목록/그림/스크롤) 추론 ---------- */
function layoutOf(node: SceneNode): Ctx['parentLayout'] {
  if (!('layoutMode' in node)) return null;
  const m = (node as { layoutMode?: string }).layoutMode;
  return m === 'VERTICAL' ? 'vertical' : m === 'HORIZONTAL' ? 'horizontal' : null;
}

function isContainerType(node: SceneNode): boolean {
  return node.type === 'FRAME' || node.type === 'GROUP' || node.type === 'SECTION';
}

/**
 * 영역 추론(보수적): 페이지(세로 오토레이아웃) 바로 아래 컨테이너의
 * 첫 자식 → header, 마지막 자식 → footer. depth 1에서만(과추론 방지).
 */
function regionRole(node: SceneNode, ctx: Ctx): string | null {
  if (ctx.depth !== 1 || ctx.parentLayout !== 'vertical' || ctx.total < 2) return null;
  if (!isContainerType(node)) return null;
  if (ctx.index === 0) return 'header';
  if (ctx.index === ctx.total - 1) return 'footer';
  return null;
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

/**
 * 목록 추론(보수적): 오토레이아웃 컨테이너 + 동일 타입 비텍스트 형제 ≥3 + 자식 수가 비슷.
 * 반복 카드/행 묶음을 ul로 본다(그 직속 자식은 li).
 */
function looksLikeList(node: SceneNode): boolean {
  if (!isContainerType(node) || layoutOf(node) === null) return false;
  if (!('children' in node)) return false;
  const kids = node.children.filter((c) => c.type !== 'TEXT');
  if (kids.length < 3) return false;
  const t0 = kids[0].type;
  if (!kids.every((k) => k.type === t0)) return false; // 동일 타입
  // 컨테이너 항목이면 자식 수가 모두 '동일'하고 ≥1 — 반복 카드/행 시그니처.
  // (header/main/footer 처럼 자식 수가 들쭉날쭉한 페이지를 목록으로 오인하지 않게)
  if ('children' in kids[0]) {
    const c0 = (kids[0] as ChildrenMixin).children.length;
    if (c0 < 1) return false;
    if (!kids.every((k) => 'children' in k && (k as ChildrenMixin).children.length === c0)) return false;
  }
  return true;
}

/** 그림 추론: 이미지 정확히 1개 + 나머지는 캡션 텍스트뿐(자식 ≤3) → figure. */
function looksLikeFigure(node: SceneNode): boolean {
  if (!isContainerType(node) || !('children' in node)) return false;
  const kids = node.children;
  if (kids.length === 0 || kids.length > 3) return false;
  const imgs = kids.filter(isImageNode);
  if (imgs.length !== 1) return false;
  return kids.every((k) => isImageNode(k) || k.type === 'TEXT');
}

function isImageNode(node: SceneNode): boolean {
  if (node.type !== 'RECTANGLE' && node.type !== 'ELLIPSE' && node.type !== 'FRAME') return false;
  return hasImageFill(node);
}

/** 스크롤 프레임 — 프로토타입 overflowDirection이 NONE이 아님. */
function isScrollable(node: SceneNode): boolean {
  const od = (node as { overflowDirection?: string }).overflowDirection;
  return !!od && od !== 'NONE';
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
