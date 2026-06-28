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
  'border',
  'divider',
  'badge',
  'avatar',
  'shape', // 채움·선 없는 순수 도형(추론 폴백)
] as const;

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

function limitDepth(segs: string[], maxDepth = 3): string[] {
  if (segs.length <= maxDepth) return segs;
  // 뒤쪽(로컬 역할)을 보존하고 앞쪽 맥락을 자른다.
  return segs.slice(segs.length - maxDepth);
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
