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
  | 'STROKE_FLOAT'
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
  | 'strokeWidth'
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
  | 'strokeWidth'
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
export { clamp01 };

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

/**
 * 토큰별 변수 타입. #16: lineHeight/letterSpacing은 단위와 무관하게 **px FLOAT 단일**
 * (원본 단위값 "160%"는 Variable.description에 저장, 내보내기에서 우선 출력).
 */
export function resolvedTypeForToken(t: { category: TokenCategory; unit?: Unit }): ResolvedType {
  return resolvedTypeFor(t.category);
}

/** #16: 비-px 단위면 description용 단위 문자열("160%"), px/단위없음이면 undefined. */
export function unitDescription(t: { category: TokenCategory; unit?: Unit; value: string | number }): string | undefined {
  if ((t.category === 'lineHeight' || t.category === 'letterSpacing') && t.unit && t.unit !== 'px' && typeof t.value === 'number') {
    return stringValueForUnit(t.value, t.unit);
  }
  return undefined;
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
    case 'strokeWidth':
      return ['STROKE_FLOAT'];
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

/** resolvedType별 Figma가 허용하는 스코프. 이외 스코프를 변수에 지정하면 런타임 거부됨. */
const VALID_SCOPES: Record<ResolvedType, ReadonlySet<ScopeName>> = {
  COLOR: new Set(['ALL_SCOPES', 'ALL_FILLS', 'FRAME_FILL', 'SHAPE_FILL', 'TEXT_FILL', 'STROKE_COLOR', 'EFFECT_COLOR']),
  FLOAT: new Set(['ALL_SCOPES', 'GAP', 'WIDTH_HEIGHT', 'CORNER_RADIUS', 'STROKE_FLOAT', 'FONT_SIZE', 'LINE_HEIGHT', 'LETTER_SPACING', 'FONT_WEIGHT', 'EFFECT_FLOAT', 'OPACITY']),
  STRING: new Set(['ALL_SCOPES', 'FONT_FAMILY']),
  BOOLEAN: new Set(['ALL_SCOPES']),
};

/**
 * 스코프 목록을 변수 타입에 유효한 것만 남긴다(Figma가 타입에 안 맞는 스코프를 거부하므로 사전 차단).
 * #16: lineHeight/letterSpacing은 px FLOAT이라 LINE_HEIGHT/LETTER_SPACING 스코프를 그대로 받는다.
 */
export function scopesForType(scopes: ScopeName[], type: ResolvedType): ScopeName[] {
  const ok = VALID_SCOPES[type];
  return scopes.filter((s) => ok.has(s));
}

/**
 * 시맨틱 역할 이름 → 속성에 맞는 스코프. 역할 머리말(슬래시 앞)로 판단.
 * 미지정 역할(primary/secondary/accent/상태색 등)은 undefined → 호출자가 원시 스코프를 상속.
 */
export function scopeForSemanticRole(role: string): ScopeName[] | undefined {
  switch (role.split('/')[0].toLowerCase()) {
    case 'text':
      return ['TEXT_FILL'];
    case 'border':
      return ['STROKE_COLOR'];
    case 'surface':
    case 'background':
      return ['FRAME_FILL'];
    default:
      return undefined;
  }
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

/** 숫자 토큰 이름의 끝 세그먼트를 수치로 파싱. 예: 'spacing/16'→16, 'radius/1_5'→1.5. */
function numberFromTokenName(name: string): number | undefined {
  const last = name.split('/').pop() ?? '';
  const n = Number(last.replace('_', '.'));
  return Number.isFinite(n) ? n : undefined;
}

/* ============================================================
   비색상 시맨틱 추천 — 간격(space/*)·반경(radius/*) 티셔츠 스케일을
   가장 가까운 기존 Global 숫자 토큰에 매핑. 색상은 suggestSemanticMap(팔레트)이 담당.
   반환은 {시맨틱이름 → Global이름}으로 createSemanticAliases 입력과 동일.
   ============================================================ */
const SPACING_SCALE: ReadonlyArray<readonly [string, number]> = [
  ['space/xs', 4],
  ['space/sm', 8],
  ['space/md', 16],
  ['space/lg', 24],
  ['space/xl', 32],
  ['space/2xl', 48],
];
const RADIUS_SCALE: ReadonlyArray<readonly [string, number]> = [
  ['radius/sm', 4],
  ['radius/md', 8],
  ['radius/lg', 16],
];

/** names: 존재하는 Global 토큰 이름 목록. 간격·반경 시맨틱 별칭 추천을 만든다. */
export function suggestNonColorSemanticMap(names: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  const candidates = (prefix: string) =>
    names
      .filter((n) => n.startsWith(prefix + '/'))
      .map((n) => ({ name: n, v: numberFromTokenName(n) }))
      .filter((x): x is { name: string; v: number } => x.v !== undefined);
  const nearest = (cands: { name: string; v: number }[], target: number) =>
    cands.reduce((best, c) => (Math.abs(c.v - target) < Math.abs(best.v - target) ? c : best));

  const spacing = candidates('spacing');
  if (spacing.length) for (const [role, target] of SPACING_SCALE) map[role] = nearest(spacing, target).name;

  const radius = candidates('radius');
  if (radius.length) {
    for (const [role, target] of RADIUS_SCALE) map[role] = nearest(radius, target).name;
    map['radius/full'] = radius.reduce((a, b) => (b.v > a.v ? b : a)).name; // 가장 큰 반경 = full
  }
  return map;
}
