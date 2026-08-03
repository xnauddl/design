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

/* ---------- 수치 토큰 정리 (스케일 사다리 스냅) ---------- */

/**
 * 스냅 대상 — 8pt 사다리가 실제 관례인 여백·크기만.
 * fontSize(14·18·20)·strokeWidth(1·1.5·2)·radius(2·4·6)는 각자의 척도가 있어 끌어당기면 망가진다.
 */
const SNAP_CATEGORIES: ReadonlySet<TokenCategory> = new Set<TokenCategory>(['gap', 'size']);

/** 카테고리별 자동 이름의 그룹 접두사 — 스냅으로 값이 바뀌면 이름도 따라가야 한다. */
const TOKEN_GROUP: Partial<Record<TokenCategory, string>> = { gap: 'spacing', size: 'size' };

export interface TidyNumbersOptions {
  /** 사다리 기준(px). 8이면 …4·2·1 / 8·16·24·32… 0 이하면 정리하지 않는다. */
  base: number;
  /** 사다리 칸으로 옮길 수 있는 최대 이동 **비율**(0~1). 예: 0.15 = 값의 15%까지. */
  ratio: number;
}

export interface TidyNumbersResult {
  tokens: DraftToken[];
  /** 정리 대상(여백·크기, px)이었던 토큰 수. */
  before: number;
  after: number;
  /** 같은 칸에 놓여 하나로 합쳐진 토큰 수. */
  merged: number;
  /** 값이 사다리 칸으로 옮겨진 토큰 수(옮겼지만 중복이 아닐 수 있다). */
  snapped: number;
}

const cloneToken = (t: DraftToken): DraftToken => ({ ...t, sources: [...t.sources] });

/**
 * 스케일 사다리 — 기준 미만은 **반분할**, 기준 이상은 **배수**.
 * base=8이면 1·2·4 / 8·16·24·32… 8pt 시스템에서 4를 반 스텝, 2를 1/4 스텝으로 쓰는 관례를 그대로 담는다.
 */
export function scaleLadder(base: number, max: number): number[] {
  if (base <= 0) return [];
  const rungs: number[] = [];
  for (let v = base / 2; v >= 1; v /= 2) rungs.push(v);
  for (let k = 1; base * k <= max + base; k++) rungs.push(base * k);
  return rungs.sort((a, b) => a - b);
}

/**
 * 여백·크기 토큰을 스케일 사다리로 정리한다.
 *
 * 이동 거리를 px이 아니라 **값 대비 비율**로 재는 것이 핵심이다. 2px 이동은 값 4에서는 50%,
 * 64에서는 3%로 의미가 전혀 다르다. 절대 px으로 통제하면 `4 → 8`(2배) 같은 사고가 나므로,
 * 비율 기준을 쓰면 작은 값은 자동으로 보수적으로, 큰 값은 관대하게 다뤄진다.
 *
 * 병합은 스냅의 **결과**다 — 같은 칸에 놓인 토큰만 하나로 합친다(사용 수·출처를 대표가 물려받음).
 * 사다리에서 먼 값은 의도된 예외로 보고 그대로 둔다. 불필요하면 목록에서 체크를 해제하면 된다.
 *
 * 입력은 변경하지 않는다 — 되돌리기용 스냅샷이 오염되지 않게 복제해서 다룬다.
 */
export function tidyNumberTokens(tokens: readonly DraftToken[], opts: TidyNumbersOptions): TidyNumbersResult {
  const { base, ratio } = opts;
  const out = tokens.map(cloneToken);
  // percent 행간 같은 비-px 값은 사다리와 무관하다.
  const targets = out.filter(
    (t) => SNAP_CATEGORIES.has(t.category) && typeof t.value === 'number' && (!t.unit || t.unit === 'px'),
  );
  const before = targets.length;
  if (base <= 0 || ratio <= 0 || before === 0) return { tokens: out, before, after: before, merged: 0, snapped: 0 };

  const rungs = scaleLadder(base, Math.max(...targets.map((t) => t.value as number)));
  const nearest = (v: number): number => rungs.reduce((p, c) => (Math.abs(c - v) < Math.abs(p - v) ? c : p));

  let snapped = 0;
  for (const t of targets) {
    const v = t.value as number;
    if (v <= 0) continue;
    const target = nearest(v);
    if (target === v || Math.abs(target - v) / v > ratio) continue;
    const group = TOKEN_GROUP[t.category];
    // 사용자가 개명했으면 그 이름을 존중한다 — 자동 이름 그대로일 때만 값에 맞춰 갱신.
    if (group && t.name === numberTokenName(group, v)) t.name = numberTokenName(group, target);
    t.value = target;
    snapped++;
  }

  // 같은 칸에 놓인 것만 병합 — 사용 수와 무관하다(같은 값이 두 줄 남으면 안 된다).
  const seen = new Map<string, DraftToken>();
  const dropped = new Set<DraftToken>();
  for (const t of targets) {
    const k = `${t.category}|${t.value}|${t.unit ?? ''}`;
    const rep = seen.get(k);
    if (!rep) {
      seen.set(k, t);
      continue;
    }
    // 흡수된 값의 출처도 대표가 물려받아야 스코프가 좁아지지 않는다.
    for (const s of t.sources) if (!rep.sources.includes(s)) rep.sources.push(s);
    rep.count = (rep.count ?? 0) + (t.count ?? 0);
    dropped.add(t);
  }

  return {
    tokens: out.filter((t) => !dropped.has(t)),
    before,
    after: before - dropped.size,
    merged: dropped.size,
    snapped,
  };
}

/** 숫자 토큰 이름 — 그룹 접두사 + 정수/소수 정규화. 예: numberTokenName('spacing',16)='spacing/16'. */
export function numberTokenName(group: string, value: number): string {
  const v = Number.isInteger(value) ? String(value) : String(value).replace('.', '_');
  return `${group}/${v}`;
}
