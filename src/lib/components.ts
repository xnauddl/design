/* ============================================================
   components.ts — 컴포넌트 등록/베리언트 분류의 순수 파서 (figma 의존 없음)
   Phase 3: 같은 베이스 이름을 공유하는 컴포넌트들을 베리언트 세트로 묶기 위한
   이름 분석(속성=값 추론)·그룹화·빈 조합 산출. 실제 createComponentFromNode·
   combineAsVariants 적용은 code.ts.
   ============================================================ */
import { kebab } from './naming';

/** 알려진 속성 어휘 — 값 → 속성명 추론. */
const STATES = new Set(['default', 'hover', 'pressed', 'focus', 'active', 'disabled', 'selected', 'loading']);
const SIZES = new Set(['xs', 'sm', 'md', 'lg', 'xl', 'xxl', 'tiny', 'small', 'medium', 'large', 'huge']);
const TYPES = new Set([
  'primary', 'secondary', 'tertiary', 'ghost', 'outline', 'outlined', 'filled',
  'text', 'link', 'danger', 'warning', 'success', 'info', 'accent', 'brand', 'neutral',
]);

/** 값 → 속성명(미지정이면 null). */
export function inferProp(value: string): string | null {
  const v = value.toLowerCase();
  if (STATES.has(v)) return 'state';
  if (SIZES.has(v)) return 'size';
  if (TYPES.has(v)) return 'type';
  return null;
}

export interface ParsedName {
  base: string;
  props: Record<string, string>;
}

/**
 * 컴포넌트 이름 → 베이스 + 속성맵.
 * - 명시형 `base, prop=value, prop2=value2`(쉼표/등호) 지원.
 * - 경로형 `base/value/value2`(슬래시): value를 어휘로 속성 추론, 미지정은 variant[-N].
 */
export function parseVariantName(name: string): ParsedName {
  const trimmed = name.trim();
  const props: Record<string, string> = {};

  if (trimmed.includes('=')) {
    let base = '';
    for (const part of trimmed.split(',')) {
      const seg = part.trim();
      if (!seg) continue;
      const eq = seg.indexOf('=');
      if (eq >= 0) {
        const k = kebab(seg.slice(0, eq));
        const val = kebab(seg.slice(eq + 1));
        if (k && val) props[k] = val;
      } else if (!base) {
        base = kebab(seg);
      }
    }
    return { base, props };
  }

  const segs = trimmed.split('/').map((s) => kebab(s)).filter(Boolean);
  const base = segs[0] ?? '';
  let unknown = 0;
  for (const seg of segs.slice(1)) {
    const prop = inferProp(seg);
    if (prop && !(prop in props)) props[prop] = seg;
    else {
      const key = unknown === 0 ? 'variant' : `variant-${unknown + 1}`;
      props[key] = seg;
      unknown++;
    }
  }
  return { base, props };
}

/** 속성맵 → Figma 베리언트 문자열 `prop=value, prop2=value2`(속성명 정렬). */
export function formatVariant(props: Record<string, string>): string {
  return Object.keys(props)
    .sort()
    .map((k) => `${k}=${props[k]}`)
    .join(', ');
}

export interface VariantMember {
  name: string; // 원본 컴포넌트 이름
  props: Record<string, string>;
  variant: string; // 'prop=value, ...'
}

export interface VariantGroup {
  base: string;
  properties: Record<string, string[]>; // 속성 → 정렬된 고유 값
  members: VariantMember[];
  missing: string[]; // 빈 조합(variant 문자열)
}

export interface ClassifyResult {
  groups: VariantGroup[]; // 멤버 2개 이상 → 세트 대상
  singles: string[]; // 단일(세트 미형성)
}

function cartesian(props: Record<string, string[]>): Record<string, string>[] {
  const keys = Object.keys(props).sort();
  let combos: Record<string, string>[] = [{}];
  for (const k of keys) {
    const next: Record<string, string>[] = [];
    for (const c of combos) for (const v of props[k]) next.push({ ...c, [k]: v });
    combos = next;
  }
  return combos;
}

/**
 * 컴포넌트 이름 목록 → 베이스별 그룹/속성/빈 조합 + 단일 목록.
 * 빈 조합은 그룹 멤버들이 동일 속성 키 집합을 가질 때만 계산(키가 섞이면 생략).
 */
/**
 * 이미 베리언트인 자식 이름들(`prop=value, ...`) → 빠진 조합(variant 문자열).
 * Phase 4 누락 조합 자동 생성의 순수 계산. 멤버들이 동일 속성 키 집합일 때만.
 */
export function missingVariants(variantNames: string[]): string[] {
  const parsed = variantNames
    .map((n) => parseVariantName(n).props)
    .filter((p) => Object.keys(p).length > 0);
  if (parsed.length < 2) return [];
  const keySig = (p: Record<string, string>) => Object.keys(p).sort().join(',');
  if (new Set(parsed.map(keySig)).size !== 1) return [];

  const properties: Record<string, string[]> = {};
  for (const p of parsed) {
    for (const [k, v] of Object.entries(p)) {
      const arr = (properties[k] ??= []);
      if (!arr.includes(v)) arr.push(v);
    }
  }
  for (const k of Object.keys(properties)) properties[k].sort();

  const existing = new Set(parsed.map(formatVariant));
  return cartesian(properties)
    .map(formatVariant)
    .filter((v) => !existing.has(v));
}

export function classifyVariants(names: string[]): ClassifyResult {
  const byBase = new Map<string, { name: string; props: Record<string, string> }[]>();
  for (const name of names) {
    const p = parseVariantName(name);
    if (!p.base) continue;
    const list = byBase.get(p.base) ?? [];
    list.push({ name, props: p.props });
    byBase.set(p.base, list);
  }

  const groups: VariantGroup[] = [];
  const singles: string[] = [];

  for (const [base, parsed] of byBase) {
    const withProps = parsed.filter((p) => Object.keys(p.props).length > 0);
    if (withProps.length < 2) {
      for (const p of parsed) singles.push(p.name);
      continue;
    }

    const members: VariantMember[] = withProps.map((p) => ({
      name: p.name,
      props: p.props,
      variant: formatVariant(p.props),
    }));

    const properties: Record<string, string[]> = {};
    for (const m of members) {
      for (const [k, v] of Object.entries(m.props)) {
        const arr = (properties[k] ??= []);
        if (!arr.includes(v)) arr.push(v);
      }
    }
    for (const k of Object.keys(properties)) properties[k].sort();

    // 빈 조합: 모든 멤버가 동일 속성 키 집합일 때만
    const keySig = (p: Record<string, string>) => Object.keys(p).sort().join(',');
    const sigs = new Set(members.map((m) => keySig(m.props)));
    let missing: string[] = [];
    if (sigs.size === 1) {
      const existing = new Set(members.map((m) => m.variant));
      missing = cartesian(properties)
        .map(formatVariant)
        .filter((v) => !existing.has(v));
    }

    groups.push({ base, properties, members, missing });
  }

  return { groups, singles };
}
