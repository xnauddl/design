/* ============================================================
   naming.ts — 레이어 네이밍 규칙 (figma.* 의존 없음 → node --test 가능)
   형식: kebab-case 소문자, 구분자 '-'. 구조: {상위 맥락}-{로컬 역할}.
   ============================================================ */

/** 토큰 없는 비텍스트 레이어의 역할 어휘. */
export const ROLE_VOCAB = [
  // 구조
  'container',
  'wrapper',
  'content',
  'group',
  // 영역
  'header',
  'body',
  'footer',
  'leading',
  'trailing',
  // 요소
  'icon',
  'image',
  'background',
  'swatch',
  'border',
  'divider',
  'badge',
  'avatar',
  // 시맨틱(영역/컴포넌트) — 인식·정리 + 일부 구조 추론
  'nav',
  'hero',
  'main',
  'sidebar',
  'aside',
  'section',
  'article',
  'figure',
  'button',
  'card',
  'list',
  'item',
  'field',
  'tab',
  'chip',
  'label',
  'title',
] as const;

/** 역할 어휘 집합(맥락 추출 시 의미 있는 세그먼트 판별용). */
const ROLE_SET: ReadonlySet<string> = new Set(ROLE_VOCAB);

/** 세그먼트가 알려진 역할 어휘인지. */
export function isKnownRole(seg: string): boolean {
  return ROLE_SET.has(seg);
}

export type Role = (typeof ROLE_VOCAB)[number];

/** 임의 문자열 → kebab-case 소문자. 카멜/공백/언더스코어/슬래시를 '-'로 정규화. */
export function kebab(input: string): string {
  return input
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2') // camelCase 경계
    .replace(/[\s_/]+/g, '-') // 공백·언더스코어·슬래시
    .replace(/[^a-zA-Z0-9-]+/g, '-') // 기타 문자
    .replace(/-+/g, '-') // 중복 하이픈
    .replace(/^-+|-+$/g, '') // 양끝 하이픈
    .toLowerCase();
}

/** 흔한 UI 약어 → 전체 단어(PascalCase 세트 이름 정규화용). */
const ABBR: Readonly<Record<string, string>> = {
  btn: 'button',
  img: 'image',
  txt: 'text',
  msg: 'message',
  ico: 'icon',
  pic: 'picture',
  pwd: 'password',
};

/**
 * 임의 문자열 → PascalCase(컴포넌트/세트 이름 관례). 토큰별로 약어를 전체 단어로 펴고
 * 첫 글자를 대문자화해 이어붙인다. 예: `btn` → `Button`, `card-header` → `CardHeader`.
 * 펼 토큰이 없으면 원본을 그대로 반환(빈 결과 방지).
 */
export function pascalCase(input: string): string {
  const tokens = kebab(input).split('-').filter(Boolean);
  const out = tokens.map((t) => {
    const w = ABBR[t] ?? t;
    return w.charAt(0).toUpperCase() + w.slice(1);
  }).join('');
  return out || input;
}

/** 첫 글자만 대문자(속성명 관례: `size` → `Size`). 나머지는 보존. */
export function capitalize(input: string): string {
  return input ? input.charAt(0).toUpperCase() + input.slice(1) : input;
}

/** 스타일 말단 세그먼트(노드 이름에 불필요한 역할). 기본 보존, 옵션으로 제거. */
const STYLE_LEAVES = new Set([
  'fill',
  'color',
  'stroke',
  'bg',
  'text',
  'border',
]);

export interface LayerNameOptions {
  /** 토큰 경로의 스타일 말단(`/fill` 등)을 제거할지. 기본 false(경로 보존). */
  stripStyleLeaf?: boolean;
  /** 맥락 경로 최대 단계 수. 기본 3. */
  maxDepth?: number;
}

/**
 * 토큰 보유 레이어 이름 — 변수 전체 경로를 kebab으로(맥락+역할 보존).
 * 예: 'button/primary/background' → 'button-primary-background'.
 */
export function layerNameFromToken(tokenName: string, opts: LayerNameOptions = {}): string {
  let segs = tokenName.split('/').filter(Boolean);
  if (opts.stripStyleLeaf && segs.length > 1 && STYLE_LEAVES.has(segs[segs.length - 1].toLowerCase())) {
    segs = segs.slice(0, -1);
  }
  segs = limitDepth(segs, opts.maxDepth);
  return segs.map(kebab).filter(Boolean).join('-');
}

/**
 * 토큰 없는 비텍스트 레이어 이름 — 상위 맥락 + 역할.
 * 예: layerNameFromRole('button-primary','icon') → 'button-primary-icon'.
 */
export function layerNameFromRole(
  ancestorName: string | null,
  role: string,
  opts: LayerNameOptions = {},
): string {
  const ctx = ancestorName ? kebab(ancestorName) : '';
  const parts = limitDepth([...(ctx ? ctx.split('-') : []), kebab(role)], opts.maxDepth);
  return parts.filter(Boolean).join('-');
}

function limitDepth(segs: string[], maxDepth = 8): string[] {
  if (segs.length <= maxDepth) return segs;
  // 뒤쪽(로컬 역할)을 보존하고 앞쪽 맥락을 자른다.
  return segs.slice(segs.length - maxDepth);
}

/* ---------- 보존형 리네임: 기본/자동 생성 이름 판별 ---------- */
/**
 * Figma가 자동으로 붙인 의미 없는 기본명(교체 대상)인지.
 * 사람이 지은 이름은 보존하고 맥락으로만 쓰기 위한 게이트.
 * 대소문자는 Figma 기본 표기(PascalCase)에 맞춰 정확히 일치 — 의도적 소문자명은 보존.
 */
const DEFAULT_NAME_RE =
  /^(Frame|Group|Rectangle|Ellipse|Line|Polygon|Star|Vector|Component|Instance|Slice|Section|Union|Subtract|Intersect|Exclude|Mask|Arrow)( \d+)?( copy( \d+)?)?$/;

export function isDefaultName(name: string): boolean {
  const n = name.trim();
  if (!n) return true; // 빈 이름도 교체 대상
  return DEFAULT_NAME_RE.test(n);
}

/* ---------- 토큰 이름 → 역할/맥락 신호 파싱 ---------- */
/** Global/원시 토큰 네임스페이스 — 이름 신호 없음(레이어명에 쓰지 않음). */
const PRIMITIVE_NS = new Set([
  'color', 'colour', 'spacing', 'space', 'gap', 'padding', 'size', 'sizing',
  'radius', 'border-radius', 'opacity', 'font', 'font-size', 'font-weight',
  'line-height', 'letter-spacing', 'number', 'dimension', 'width', 'height',
  'elevation', 'shadow', 'z',
]);

/** 토큰 경로 말단(leaf)이 역할 어휘일 때의 매핑(핵심 어휘). */
const LEAF_ROLE: Record<string, Role> = {
  background: 'background', bg: 'background', fill: 'background', surface: 'background',
  swatch: 'swatch', sample: 'swatch',
  border: 'border', stroke: 'border', outline: 'border',
  icon: 'icon', glyph: 'icon',
  divider: 'divider', separator: 'divider', rule: 'divider',
  image: 'image', img: 'image', picture: 'image', thumbnail: 'image',
  avatar: 'avatar',
  badge: 'badge', dot: 'badge', indicator: 'badge',
};

export interface ParsedToken {
  /** 토큰 말단이 역할 어휘이면 그 역할(아니면 null). */
  roleLeaf: Role | null;
  /** 역할 말단을 뗀 경로 접두사의 kebab(맥락 폴백용, 없으면 null). */
  context: string | null;
  /** Global/원시 토큰(첫 세그먼트가 원시 네임스페이스)이면 true — 이름 신호 없음. */
  primitive: boolean;
}

/**
 * 바인딩된 변수 이름을 레이어 네이밍 "신호"로만 파싱한다(경로 복사 금지).
 * 예: 'button/primary/background' → {roleLeaf:'background', context:'button-primary'}.
 *     'color/blue-500' → {primitive:true} (역할·맥락 신호 없음).
 */
export function parseTokenName(tokenName: string): ParsedToken {
  const segs = tokenName.split('/').map((s) => s.trim()).filter(Boolean);
  if (!segs.length) return { roleLeaf: null, context: null, primitive: false };
  if (PRIMITIVE_NS.has(kebab(segs[0]))) return { roleLeaf: null, context: null, primitive: true };

  const roleLeaf = LEAF_ROLE[kebab(segs[segs.length - 1])] ?? null;
  const ctxSegs = roleLeaf ? segs.slice(0, -1) : segs;
  const context = ctxSegs.length ? ctxSegs.map(kebab).filter(Boolean).join('-') : null;
  return { roleLeaf, context, primitive: false };
}

/** 토큰 값에 붙는 단위 어휘(스냅샷 토큰 이름의 꼬리). */
const UNIT_WORDS = new Set(['percent', 'px', 'em', 'rem', 'ratio', 'pt']);

/** 토큰 값 꼴(색 6자리 hex, 또는 숫자·단위 세그먼트)인지. */
function isTokenValue(v: string): boolean {
  if (/^[0-9a-f]{6}$/.test(v)) return true; // 색: 121210, 0066ff
  // 숫자/단위: 16 · 1-5 · 0-percent-px · 150-percent-px · 1-5-em
  return v.split('-').every((s) => /^\d+$/.test(s) || UNIT_WORDS.has(s));
}

/** 식별력이 없는 일반 구조 어휘 — 맥락 접두사로 쓰지 않는다(container-header 같은 군더더기 방지). */
const GENERIC_ROLES = new Set(['frame', 'container', 'wrapper', 'content', 'group', 'section', 'body', 'main', 'shape']);

/**
 * 이름에서 깨끗한 "맥락 1단계"를 뽑는다 — 숫자·단위·hex·일반 구조어를 버리고,
 * 식별력 있는 역할/단어 하나를 반환(없으면 null → 맥락 없이 역할만).
 * 예: 'card-header' → 'header' · 'button-primary' → 'button' · 'container' → null · 'wrapper-2' → null.
 */
export function pickScope(name: string): string | null {
  const segs = kebab(name)
    .split('-')
    .filter((s) => s && !/^\d+$/.test(s) && !UNIT_WORDS.has(s) && !/^[0-9a-f]{6}$/.test(s) && !GENERIC_ROLES.has(s));
  if (!segs.length) return null;
  const known = segs.filter(isKnownRole);
  return known.length ? known[known.length - 1] : segs[segs.length - 1];
}

/**
 * 구(舊) 리네임이 원시 토큰 경로를 그대로 베껴 만든 의미 없는 이름인지(교체 대상).
 * 예: 'color-121210'(=color/121210) · 'spacing-16' · 'line-height-1-5'.
 * 'color-picker'·'size-large'처럼 값이 단어면 사람 이름으로 보고 보존(false).
 */
export function isTokenEchoName(name: string): boolean {
  const n = name.trim().toLowerCase();
  for (const ns of PRIMITIVE_NS) {
    if (n.startsWith(ns + '-')) {
      const value = n.slice(ns.length + 1);
      if (value && isTokenValue(value)) return true;
    }
  }
  return false;
}

/**
 * 같은 부모 내 이름 충돌 해소 — 순서대로 -2, -3 … 접미사.
 * `taken`은 이미 확정된 이름 집합(호출자가 누적).
 */
export function dedupeName(name: string, taken: Set<string>): string {
  if (!taken.has(name)) {
    taken.add(name);
    return name;
  }
  let i = 2;
  while (taken.has(`${name}-${i}`)) i++;
  const out = `${name}-${i}`;
  taken.add(out);
  return out;
}
