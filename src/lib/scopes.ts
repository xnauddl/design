/* ============================================================
   scopes.ts — 바인딩 필드 ↔ 변수 용도(scope)·타입 규칙 (순수, figma 의존 없음)
   자동 바인딩(bind.ts)이 쓰는 용도 규칙을 한 곳에 둔다.
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

