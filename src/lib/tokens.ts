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
  /**
   * 이 값을 쓰는 레이어 수(추출 시 집계). 한 레이어가 같은 값을 여러 번 써도(padding 4방향) 1.
   * 무엇을 토큰으로 남길지 고르는 근거 — 1이면 대개 일회성 값이다.
   */
  count?: number;
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

/** base(px)로 px 환산되는 토큰 1건 — 미리보기 표시·검증용. */
export interface PxConversion {
  /** 변수 이름 */
  name: string;
  /** 원본 표기("160%", "1.5rem") */
  from: string;
  /** 환산된 px 값 */
  to: number;
}

/**
 * base(px) 환산 대상과 결과. 변수 생성이 쓰는 규칙(비-px 수치 → toPx)과 **같은 판정**을
 * 써야 미리보기와 실제 값이 어긋나지 않으므로, 양쪽이 이 함수를 공유한다.
 */
export function pxConversions(
  tokens: readonly { name: string; category: TokenCategory; unit?: Unit; value: string | number }[],
  base: number,
): PxConversion[] {
  const out: PxConversion[] = [];
  for (const t of tokens) {
    if (!t.unit || t.unit === 'px' || typeof t.value !== 'number') continue;
    out.push({
      name: t.name,
      from: stringValueForUnit(t.value, t.unit),
      to: toPx(t.value, t.unit, { base, fontSize: base }),
    });
  }
  return out;
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

/* ---------- 수치 토큰 정리 (근접 중복 병합) ---------- */

/**
 * 정리 대상 카테고리. px 척도라 "1px 차이는 사실상 같은 값"이 성립하는 것만.
 * opacity(0~1)·fontFamily(문자열)·색은 제외 — 색은 별도의 색 정리가 담당한다.
 */
const TIDY_CATEGORIES: ReadonlySet<TokenCategory> = new Set<TokenCategory>([
  'gap', 'size', 'radius', 'strokeWidth', 'fontSize', 'lineHeight', 'letterSpacing', 'effectFloat',
]);

export interface TidyNumbersResult {
  tokens: DraftToken[];
  before: number;
  after: number;
  merged: number;
}

/**
 * 근접한 수치 토큰을 **더 많이 쓰인 값**으로 흡수한다. 스케일(4·8배수)로 스냅하지 않는 이유는
 * 그러면 아무도 안 쓰는 값이 만들어져(14 → 16) 어떤 레이어와도 매칭되지 않는 토큰이 남기 때문이다.
 * 실제로 쓰이는 값 중 대표를 고르므로 병합 후에도 바인딩이 성립한다.
 *
 * 규칙: 같은 카테고리·같은 단위끼리, 사용 레이어 수(count) 내림차순으로 대표를 정하고,
 * 대표보다 **덜 쓰인** 값이 threshold 이내면 대표로 흡수한다. 같은 횟수끼리는 병합하지 않는다
 * (둘 다 실제로 쓰이는 값이라 어느 쪽을 지울 근거가 없다).
 */
export function tidyNumberTokens(tokens: readonly DraftToken[], threshold: number): TidyNumbersResult {
  const targets = tokens.filter((t) => TIDY_CATEGORIES.has(t.category) && typeof t.value === 'number');
  const before = targets.length;
  if (threshold <= 0 || before === 0) return { tokens: [...tokens], before, after: before, merged: 0 };

  // 사용 수 내림차순 → 같으면 값 오름차순(안정적인 대표 선택).
  const order = [...targets].sort((a, b) => (b.count ?? 0) - (a.count ?? 0) || (a.value as number) - (b.value as number));
  const kept: DraftToken[] = [];
  const dropped = new Set<DraftToken>();
  for (const t of order) {
    const rep = kept.find(
      (k) =>
        k.category === t.category &&
        (k.unit ?? '') === (t.unit ?? '') &&
        (k.count ?? 0) > (t.count ?? 0) && // 덜 쓰인 값만 흡수 — 동률은 둘 다 남긴다
        Math.abs((k.value as number) - (t.value as number)) <= threshold,
    );
    if (rep) {
      dropped.add(t);
      // 흡수된 값의 출처도 대표가 물려받아야 스코프가 좁아지지 않는다.
      for (const s of t.sources) if (!rep.sources.includes(s)) rep.sources.push(s);
      rep.count = (rep.count ?? 0) + (t.count ?? 0);
    } else {
      kept.push(t);
    }
  }
  return {
    tokens: tokens.filter((t) => !dropped.has(t)),
    before,
    after: before - dropped.size,
    merged: dropped.size,
  };
}

/** 숫자 토큰 이름 — 그룹 접두사 + 정수/소수 정규화. 예: numberTokenName('spacing',16)='spacing/16'. */
export function numberTokenName(group: string, value: number): string {
  const v = Number.isInteger(value) ? String(value) : String(value).replace('.', '_');
  return `${group}/${v}`;
}
