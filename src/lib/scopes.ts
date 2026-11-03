/* ============================================================
   scopes.ts — 바인딩 필드 ↔ 변수 용도(scope)·타입 규칙 (순수, figma 의존 없음)
   자동 바인딩(bind.ts)과 일괄 교체(remap)가 같은 규칙을 쓰도록 한 곳에 둔다.
   여백(GAP) 변수가 행간에, 채움 색이 선 색에 붙는 오매칭을 막는 기준이다.
   ============================================================ */

/**
 * 바인딩 대상 필드 → 요구 변수 스코프. 변수 `scopes`가 이 스코프(또는 `ALL_SCOPES`)를
 * 포함할 때만 매칭한다. 여백(GAP)이 line-height/letter-spacing(LINE_HEIGHT/LETTER_SPACING)
 * 변수에 값만 비슷하다고 잘못 연결되는 오매칭을 막는다. (Figma의 GAP 스코프는 gap+padding 공용.)
 */
export const FIELD_SCOPE: Record<string, VariableScope> = {
  width: 'WIDTH_HEIGHT',
  height: 'WIDTH_HEIGHT',
  itemSpacing: 'GAP',
  counterAxisSpacing: 'GAP',
  gridRowGap: 'GAP',
  gridColumnGap: 'GAP',
  paddingLeft: 'GAP',
  paddingRight: 'GAP',
  paddingTop: 'GAP',
  paddingBottom: 'GAP',
  topLeftRadius: 'CORNER_RADIUS',
  topRightRadius: 'CORNER_RADIUS',
  bottomLeftRadius: 'CORNER_RADIUS',
  bottomRightRadius: 'CORNER_RADIUS',
  strokeWeight: 'STROKE_FLOAT',
  strokeTopWeight: 'STROKE_FLOAT',
  strokeRightWeight: 'STROKE_FLOAT',
  strokeBottomWeight: 'STROKE_FLOAT',
  strokeLeftWeight: 'STROKE_FLOAT',
  fontSize: 'FONT_SIZE',
  lineHeight: 'LINE_HEIGHT',
  letterSpacing: 'LETTER_SPACING',
  opacity: 'OPACITY',
};

/** 색상 필드별 허용 스코프 — 변수 scopes가 이 중 하나(또는 ALL_SCOPES)를 포함해야 매칭. */
export const FILL_SCOPES: readonly VariableScope[] = ['ALL_FILLS', 'FRAME_FILL', 'SHAPE_FILL', 'TEXT_FILL'];
export const STROKE_SCOPES: readonly VariableScope[] = ['STROKE_COLOR'];
export const EFFECT_SCOPES: readonly VariableScope[] = ['EFFECT_COLOR'];

/** 필드가 받아들이는 스코프 목록. 규칙이 없는 필드(visible·characters 등)는 null. */
export function fieldScopes(field: string): readonly VariableScope[] | null {
  if (field === 'fills') return FILL_SCOPES;
  if (field === 'strokes') return STROKE_SCOPES;
  if (field === 'effects') return EFFECT_SCOPES;
  if (field === 'fontFamily') return ['FONT_FAMILY'];
  const s = FIELD_SCOPE[field];
  return s ? [s] : null;
}

/** 필드가 요구하는 변수 타입. 규칙이 없는 필드는 null(원래 변수의 타입을 따른다). */
export function fieldResolvedType(field: string): VariableResolvedDataType | null {
  if (field === 'fills' || field === 'strokes' || field === 'effects') return 'COLOR';
  if (field === 'fontFamily') return 'STRING';
  return FIELD_SCOPE[field] ? 'FLOAT' : null;
}

/** 변수 scopes가 이 필드에 쓰일 수 있는가. 규칙이 없는 필드는 스코프를 따지지 않는다. */
export function scopeFitsField(field: string, scopes: readonly VariableScope[]): boolean {
  const need = fieldScopes(field);
  if (!need) return true;
  return scopes.includes('ALL_SCOPES') || need.some((s) => scopes.includes(s));
}

/** 교체 후보 판정에 쓰는 변수 요약(figma Variable에서 필요한 것만). */
export interface RemapVar {
  id: string;
  name: string;
  resolvedType: VariableResolvedDataType;
  scopes: readonly VariableScope[];
  collection: string;
}

/**
 * 일괄 교체 — 변수 A(fromId)를 쓰던 필드들(fields)에 대신 붙일 수 있는 변수 B 후보.
 * - A 자신은 뺀다.
 * - 타입: 필드가 요구하는 타입(색·수치·문자). 규칙이 없는 필드뿐이면 A의 타입(fromType)을 따른다.
 *   A가 지워져 타입을 모르고 필드 규칙도 없으면 후보가 없다(무엇을 붙여도 되는지 알 수 없다).
 * - 용도: A가 쓰이던 **모든** 필드에 맞아야 한다 — 일부만 맞는 변수를 고르면 나머지가 남아
 *   '교체했는데 일부만 바뀜'이 된다.
 * 정렬: 컬렉션 이름 → 변수 이름.
 */
export function remapTargets(
  fromId: string,
  fromType: VariableResolvedDataType | null,
  fields: readonly string[],
  vars: readonly RemapVar[],
): RemapVar[] {
  const typed = fields.map(fieldResolvedType).find((t): t is VariableResolvedDataType => t !== null) ?? null;
  const type = typed ?? fromType;
  if (!type || fields.length === 0) return [];
  return vars
    .filter((v) => v.id !== fromId && v.resolvedType === type && fields.every((f) => scopeFitsField(f, v.scopes)))
    .sort((a, b) => a.collection.localeCompare(b.collection) || a.name.localeCompare(b.name));
}
