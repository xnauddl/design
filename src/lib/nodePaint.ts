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

/**
 * 가려진 칠하기인가(ia-v3 §2.12 6-2 N6) — 같은 칠하기 배열에서 그보다 위(배열 뒤)에 보이는 불투명 칠하기가 있다.
 * 불투명 = 투명도 1인 SOLID, 또는 투명도 1이고 맞춤이 FILL · CROP인 IMAGE · VIDEO(FIT · TILE은 빈틈이 있어 가리지 않음,
 * 그라데이션은 가리지 않음). 한계: 같은 레이어의 칠하기만 본다(자식이 덮는 모양은 잡지 못함).
 */
export function isCoveredPaint(paints: readonly unknown[], index: number): boolean {
  for (let j = index + 1; j < paints.length; j++) {
    const p = paints[j] as { visible?: boolean; type?: string; opacity?: number; scaleMode?: string };
    if (!p || p.visible === false) continue;
    if ((p.opacity ?? 1) < 1) continue;
    if (p.type === 'SOLID') return true;
    if ((p.type === 'IMAGE' || p.type === 'VIDEO') && (p.scaleMode === 'FILL' || p.scaleMode === 'CROP')) return true;
  }
  return false;
}
