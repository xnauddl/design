/* ============================================================
   tokens.ts — 토큰 모델 + 순수 헬퍼 (figma.* 의존 없음 → node --test 가능)
   ============================================================ */

/** Figma VariableScope 문자열의 부분집합(정확히 동일 리터럴이라 VariableScope[]에 할당 가능). */
export type ScopeName =
  | 'ALL_SCOPES'
  | 'ALL_FILLS'
  | 'FRAME_FILL'
  | 'SHAPE_FILL'
  | 'TEXT_FILL'
  | 'STROKE_COLOR'
  | 'EFFECT_COLOR'
  | 'GAP'
  | 'WIDTH_HEIGHT'
  | 'CORNER_RADIUS'
  | 'FONT_SIZE'
  | 'LINE_HEIGHT'
  | 'LETTER_SPACING'
  | 'FONT_FAMILY'
  | 'FONT_WEIGHT'
  | 'EFFECT_FLOAT'
  | 'OPACITY';

export type ResolvedType = 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN';

export type Unit = 'px' | 'percent' | 'em' | 'rem' | 'ratio';

/** 추출된 값의 출처 속성 — 스코프 추론에 사용. */
export type SourceField =
  | 'fill'
  | 'stroke'
  | 'effectColor'
  | 'gap'
  | 'size'
  | 'radius'
  | 'fontSize'
  | 'lineHeight'
  | 'letterSpacing'
  | 'fontFamily'
  | 'fontWeight'
  | 'effectFloat'
  | 'opacity';

export type TokenCategory =
  | 'color'
  | 'opacity'
  | 'gap'
  | 'size'
  | 'radius'
  | 'fontSize'
  | 'lineHeight'
  | 'letterSpacing'
  | 'fontFamily'
  | 'fontWeight'
  | 'effectColor'
  | 'effectFloat';

/** UI ↔ code 사이를 오가는 초안 토큰(Global 후보). */
export interface DraftToken {
  /** 컬렉션 내 변수 이름(슬래시로 폴더 그룹). tier 접두사 없음. */
  name: string;
  category: TokenCategory;
  /** 이 값이 등장한 출처 속성들(스코프 union 산출용). */
  sources: SourceField[];
  /** 색상: 6자리 hex(#rrggbb). 그 외: 숫자 또는 fontFamily 문자열. */
  value: string | number;
  /** 수치 토큰의 의도 단위(px 외에는 STRING 보존 + 선택적 px 환산). */
  unit?: Unit;
}

/* ---------- 색상 hex ---------- */

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const to255 = (c: number) => Math.round(clamp01(c) * 255);

/** {r,g,b} (0~1) → 소문자 6자리 hex. dedup 키 & Global 색 토큰 값으로 사용. */
export function rgbToHex(rgb: { r: number; g: number; b: number }): string {
  const h = (c: number) => to255(c).toString(16).padStart(2, '0');
  return `#${h(rgb.r)}${h(rgb.g)}${h(rgb.b)}`.toLowerCase();
}

/** 소문자 6자리 hex → {r,g,b} (0~1). */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) throw new Error(`잘못된 hex: ${hex}`);
  const n = parseInt(m[1], 16);
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
}

/* ---------- 타입/스코프 매핑 ---------- */

export function resolvedTypeFor(category: TokenCategory): ResolvedType {
  switch (category) {
    case 'color':
    case 'effectColor':
      return 'COLOR';
    case 'fontFamily':
      return 'STRING';
    default:
      return 'FLOAT';
  }
}

/** 단위까지 반영한 토큰별 타입. 비-px lineHeight/letterSpacing은 STRING(코드용 진실). */
export function resolvedTypeForToken(t: { category: TokenCategory; unit?: Unit }): ResolvedType {
  if ((t.category === 'lineHeight' || t.category === 'letterSpacing') && t.unit && t.unit !== 'px') {
    return 'STRING';
  }
  return resolvedTypeFor(t.category);
}

/** 비-px 단위의 STRING 표현(코드용). 예: percent 150 → "150%", rem 1.5 → "1.5rem". */
export function stringValueForUnit(value: number, unit: Unit): string {
  switch (unit) {
    case 'percent':
      return `${value}%`;
    case 'em':
      return `${value}em`;
    case 'rem':
      return `${value}rem`;
    case 'ratio':
      return `${value}`;
    case 'px':
      return `${value}px`;
  }
}

/** 출처 속성 → 적절한 변수 스코프. 기본값 ALL_SCOPES를 쓰지 않고 속성에 맞게 좁힌다. */
export function scopesFor(source: SourceField): ScopeName[] {
  switch (source) {
    case 'fill':
      return ['ALL_FILLS'];
    case 'stroke':
      return ['STROKE_COLOR'];
    case 'effectColor':
      return ['EFFECT_COLOR'];
    case 'gap':
      return ['GAP'];
    case 'size':
      return ['WIDTH_HEIGHT'];
    case 'radius':
      return ['CORNER_RADIUS'];
    case 'fontSize':
      return ['FONT_SIZE'];
    case 'lineHeight':
      return ['LINE_HEIGHT'];
    case 'letterSpacing':
      return ['LETTER_SPACING'];
    case 'fontFamily':
      return ['FONT_FAMILY'];
    case 'fontWeight':
      return ['FONT_WEIGHT'];
    case 'effectFloat':
      return ['EFFECT_FLOAT'];
    case 'opacity':
      return ['OPACITY'];
  }
}

/** 여러 출처의 스코프를 합쳐 중복 제거(예: 채움+선 → ['ALL_FILLS','STROKE_COLOR']). */
export function scopesForSources(sources: SourceField[]): ScopeName[] {
  const set = new Set<ScopeName>();
  for (const s of sources) for (const sc of scopesFor(s)) set.add(sc);
  return [...set];
}

/* ---------- 단위 환산 (%/em/rem → px) ---------- */

/**
 * 비-px 단위를 Figma 바인딩용 px 스냅샷으로 환산.
 * - rem→px = value × base
 * - em→px  = value × fontSize
 * - percent→px = fontSize × value/100
 * - ratio→px   = fontSize × value
 */
export function toPx(
  value: number,
  unit: Unit,
  opts: { base?: number; fontSize?: number } = {},
): number {
  const base = opts.base ?? 16;
  const fontSize = opts.fontSize ?? base;
  switch (unit) {
    case 'px':
      return value;
    case 'rem':
      return value * base;
    case 'em':
      return value * fontSize;
    case 'percent':
      return (fontSize * value) / 100;
    case 'ratio':
      return fontSize * value;
  }
}

/* ---------- 토큰 자동 이름 (중립; 사용자가 개명) ---------- */

/** 임의 색 → 중립 이름 `color/0066ff` (hex 6자리, # 제거). */
export function colorTokenName(hex: string): string {
  return `color/${hex.replace('#', '').toLowerCase()}`;
}

/** 숫자 토큰 이름 — 그룹 접두사 + 정수/소수 정규화. 예: numberTokenName('spacing',16)='spacing/16'. */
export function numberTokenName(group: string, value: number): string {
  const v = Number.isInteger(value) ? String(value) : String(value).replace('.', '_');
  return `${group}/${v}`;
}
