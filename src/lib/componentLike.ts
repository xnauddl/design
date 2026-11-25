/* ============================================================
   componentLike.ts — 이름 정리가 쓰는 아이콘 프레임 · 짧은 한 줄 글 판정 (figma.* 의존 없음)
   `rename.ts`가 `isIconFrame` · `shortOneLine`을 부른다. 구조만으로 판정한다.
   ============================================================ */

import { VECTOR_TYPES, hasImageFill } from './nodePaint';

/** 판정에 필요한 최소 노드 형태(SceneNode / 테스트 fixture와 호환). */
export interface LikeNode {
  type: string;
  width?: number;
  height?: number;
  fills?: readonly PaintLike[] | symbol;
  /** TEXT 글자. */
  characters?: string;
  /** 아이콘 프레임으로 이미 판정된 노드. */
  iconFrame?: boolean;
  children?: readonly LikeNode[];
}

export interface PaintLike {
  visible?: boolean;
  type?: string;
  opacity?: number;
}

/* ---------- 기하 ---------- */
function dims(node: LikeNode): { w: number; h: number } | null {
  const w = node.width;
  const h = node.height;
  if (typeof w !== 'number' || typeof h !== 'number') return null;
  return { w, h };
}

/** 아이콘으로 치는 그림 — 날 벡터, 또는 아이콘 프레임(96 이하 · 벡터 1개 이상 · 벡터 · 원 · 사각형과 그 묶음뿐). */
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
 * 아이콘 프레임인가: FRAME · GROUP, 96 이하,
 * 자손에 벡터 1개 이상, 자손이 벡터 · 원 · 사각형과 그것을 담은 GROUP · FRAME뿐(글자 · 사진 · 인스턴스 없음).
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
