/* 레이어 칠하기 · 타입 판정 공용 부품 — figma 전역을 쓰지 않는 순수 함수라
   순수 분석(componentLike)과 Figma 노드(extract · rename)가 함께 쓴다. */

/** 벡터로 치는 레이어 타입 — 아이콘 판정 · 그림 판정이 같은 목록을 쓴다. */
export const VECTOR_TYPES: ReadonlySet<string> = new Set(['VECTOR', 'BOOLEAN_OPERATION', 'STAR', 'POLYGON', 'LINE']);

interface PaintBit {
  visible?: boolean;
  type?: string;
}

/** fills · strokes 배열(figma.mixed나 없는 필드는 null). */
export function paintsOf(node: unknown, field: 'fills' | 'strokes'): readonly PaintBit[] | null {
  if (node == null || typeof node !== 'object' || !(field in node)) return null;
  const p = (node as Record<string, unknown>)[field];
  return Array.isArray(p) ? (p as PaintBit[]) : null;
}

/** 보이는 채움이 있는가. */
export function hasVisibleFill(node: unknown): boolean {
  const f = paintsOf(node, 'fills');
  return !!f && f.some((p) => p.visible !== false);
}

/** 보이는 IMAGE 채움이 있는가. */
export function hasImageFill(node: unknown): boolean {
  const f = paintsOf(node, 'fills');
  return !!f && f.some((p) => p.visible !== false && p.type === 'IMAGE');
}

/** 보이는 색(단색 · 그라데이션, 이미지 제외) 채움이 있는가. */
export function hasColorFill(node: unknown): boolean {
  const f = paintsOf(node, 'fills');
  return !!f && f.some((p) => p.visible !== false && p.type !== 'IMAGE');
}

/** 보이는 선이 있는가. */
export function hasVisibleStroke(node: unknown): boolean {
  const s = paintsOf(node, 'strokes');
  return !!s && s.some((p) => p.visible !== false);
}
