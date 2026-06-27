/* ============================================================
   components.ts — 컴포넌트 등록/베리언트 분류의 순수 파서 (figma 의존 없음)
   Phase 3: 같은 베이스 이름을 공유하는 컴포넌트들을 베리언트 세트로 묶기 위한
   이름 분석(속성=값 추론)·그룹화·빈 조합 산출. 실제 createComponentFromNode·
   combineAsVariants 적용은 code.ts.
   ============================================================ */
import { kebab } from './naming';
import { tshirtRoles } from './roles';
import { classifyColor } from './colorName';

/** 알려진 속성 어휘 — 값 → 속성명 추론. */
const STATES = new Set(['default', 'hover', 'pressed', 'focus', 'active', 'disabled', 'loading']);
const SIZES = new Set(['xs', 'sm', 'md', 'lg', 'xl', 'xxl', 'tiny', 'small', 'medium', 'large', 'huge']);
const TYPES = new Set([
  'primary', 'secondary', 'tertiary', 'ghost', 'outline', 'outlined', 'filled',
  'text', 'link', 'danger', 'warning', 'success', 'info', 'accent', 'brand', 'neutral',
]);
/** 불리언 축 어휘 — 값 자체가 속성명, 값은 true(예: `card/selected` → `selected=true`). */
const BOOLEANS = new Set(['selected']);

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
    if (BOOLEANS.has(seg) && !(seg in props)) {
      props[seg] = 'true'; // 불리언 축: 값이 곧 속성명 → `selected=true`
      continue;
    }
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
export interface GridCell {
  name: string;
  row: number;
  col: number;
}

/* ---------- Phase 4.1: 컴포넌트 속성 노출 추론(순수) ---------- */
export type CompPropType = 'TEXT' | 'INSTANCE_SWAP' | 'BOOLEAN';

export interface CompPropPlan {
  /** 컴포넌트 속성 이름(kebab). */
  propName: string;
  type: CompPropType;
  /** 대상 레이어 이름(매칭용). */
  layerName: string;
  /** 연결할 노드 필드. */
  field: 'characters' | 'mainComponent' | 'visible';
}

/**
 * 자식 레이어 → 노출할 컴포넌트 속성 계획(순수, 규칙 기반).
 * - 이름이 `?`로 끝나면 → BOOLEAN(가시성). 예: `badge?` → 속성 `badge`(visible).
 * - TEXT 레이어 → TEXT(characters).
 * - INSTANCE 레이어 → INSTANCE_SWAP(mainComponent).
 * 속성 이름 충돌은 `-2` 접미사로 회피.
 */
export function inferComponentProperties(layers: { name: string; type: string }[]): CompPropPlan[] {
  const out: CompPropPlan[] = [];
  const taken = new Set<string>();
  const uniq = (base: string): string => {
    let n = base || 'prop';
    let i = 2;
    while (taken.has(n)) n = `${base || 'prop'}-${i++}`;
    taken.add(n);
    return n;
  };
  for (const l of layers) {
    if (l.name.trim().endsWith('?')) {
      out.push({ propName: uniq(kebab(l.name.replace(/\?+$/, '')) || 'show'), type: 'BOOLEAN', layerName: l.name, field: 'visible' });
    } else if (l.type === 'TEXT') {
      out.push({ propName: uniq(kebab(l.name) || 'text'), type: 'TEXT', layerName: l.name, field: 'characters' });
    } else if (l.type === 'INSTANCE') {
      out.push({ propName: uniq(kebab(l.name) || 'swap'), type: 'INSTANCE_SWAP', layerName: l.name, field: 'mainComponent' });
    }
  }
  return out;
}

/**
 * 베리언트 이름들 → 속성 기반 2D 그리드 좌표(행/열). 세트 정렬용(순수).
 * - 속성 0개: 한 줄 나열.
 * - 1~2개: 첫 속성=행, 둘째 속성=열(값 정렬 인덱스) → 매트릭스.
 * - 3개+: √n 칸 흐름 그리드(겹침 방지).
 */
export function variantGrid(names: string[]): GridCell[] {
  const parsed = names.map((n) => ({ name: n, props: parseVariantName(n).props }));
  const keys = [...new Set(parsed.flatMap((p) => Object.keys(p.props)))].sort();

  if (keys.length === 0) return parsed.map((p, i) => ({ name: p.name, row: 0, col: i }));

  if (keys.length <= 2) {
    // 1속성: 한 줄(열 축). 2속성: 첫=행, 둘째=열.
    const rowKey = keys.length === 2 ? keys[0] : null;
    const colKey = keys.length === 2 ? keys[1] : keys[0];
    const rowVals = rowKey
      ? [...new Set(parsed.map((p) => p.props[rowKey]).filter((v): v is string => v != null))].sort()
      : [''];
    const colVals = [...new Set(parsed.map((p) => p.props[colKey]).filter((v): v is string => v != null))].sort();
    return parsed.map((p) => ({
      name: p.name,
      row: rowKey ? Math.max(0, rowVals.indexOf(p.props[rowKey])) : 0,
      col: Math.max(0, colVals.indexOf(p.props[colKey])),
    }));
  }

  const cols = Math.ceil(Math.sqrt(parsed.length));
  return parsed.map((p, i) => ({ name: p.name, row: Math.floor(i / cols), col: i % cols }));
}

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

/* ---------- #1: 컴포넌트 등록 후보 스캔(순수) ---------- */
/** 스캔 입력 노드(figma SceneNode와 구조적으로 호환되는 최소 형태). */
export interface ScanNode {
  id: string;
  name: string;
  type: string;
  locked?: boolean;
  children?: readonly ScanNode[];
}

export interface ComponentCandidateNode {
  id: string;
  name: string;
  type: string;
  depth: number;
  parentId: string | null;
  /** 등록 가능(FRAME/GROUP, 잠금/컴포넌트/인스턴스/텍스트 아님). */
  eligible: boolean;
  /** 구조 그룹으로 묶일 세트 이름(미리보기). 세트 후보일 때만. */
  group?: string;
  /** 도출된 베리언트(`size=lg, color=blue` 등) 미리보기. */
  variant?: string;
}

/** 컴포넌트로 등록 가능한 노드인가(FRAME/GROUP, 잠금 제외). */
export function componentEligible(node: ScanNode): boolean {
  return (node.type === 'FRAME' || node.type === 'GROUP') && !node.locked;
}

/**
 * 선택 하위를 순회해 등록 후보 트리를 만든다 — 영향(eligible) + 그 조상 체인만 유지.
 * 비-eligible 말단(텍스트·벡터…)은 잡음이라 제외하되, 위치 맥락은 조상으로 보존.
 *
 * **단일 선택의 최상위(부모 프레임)는 컨테이너**라 등록 대상에서 제외한다 — 자기 자신은
 * 컴포넌트화하지 않고 그 안의 자식만 후보가 된다. 트리에는 회색 맥락으로 남는다.
 * (다중 선택 시에는 선택 각각이 등록 단위이므로 최상위도 eligible. `REGISTER_COMPONENTS`의
 * 대상 결정과 동일한 규칙.)
 */
export function scanComponentCandidates(selection: readonly ScanNode[]): ComponentCandidateNode[] {
  const single = selection.length === 1;
  const all: ComponentCandidateNode[] = [];
  const visit = (n: ScanNode, depth: number, parentId: string | null): void => {
    const isContainerRoot = single && depth === 0; // 컨테이너 자신 → 등록 제외
    all.push({ id: n.id, name: n.name, type: n.type, depth, parentId, eligible: !isContainerRoot && componentEligible(n) });
    if (n.children) for (const c of n.children) visit(c, depth + 1, n.id);
  };
  for (const n of selection) visit(n, 0, null);

  const byId = new Map(all.map((c) => [c.id, c]));
  const keep = new Set<string>(all.filter((c) => c.eligible).map((c) => c.id));
  for (const c of all) {
    if (!c.eligible) continue;
    let p = c.parentId;
    while (p && !keep.has(p)) {
      keep.add(p);
      p = byId.get(p)?.parentId ?? null;
    }
  }
  return all.filter((c) => keep.has(c.id));
}

/* ---------- 구조 기반 그룹화(등록): 생김새 같은 자식을 베리언트 세트로 ---------- */
/**
 * 구조 비교용 노드(figma SceneNode에서 추출). ScanNode + 여백·크기·대표 색.
 * 크기(width/height)·색(fillHex)은 시그니처에서 제외하고 **차이를 속성으로** 흡수한다.
 */
export interface StructNode extends ScanNode {
  width?: number;
  height?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  itemSpacing?: number;
  counterAxisSpacing?: number;
  layoutMode?: string;
  /** 프레임 자체의 첫 visible SOLID fill(hex). 없으면 null. */
  fillHex?: string | null;
  children?: readonly StructNode[];
}

/**
 * 구조 시그니처(결정적 문자열). 동일 = **여백(패딩·간격·layoutMode) + 자식 타입 + 자식 이름**.
 * - 크기(width/height)·색(fillHex)은 **제외**(차이는 size/color 속성으로 흡수).
 * - 루트 자신의 이름은 제외(세트/컴포넌트 이름으로 쓰임), 자식 이름은 포함.
 */
export function structuralSignature(node: StructNode): string {
  const sig = (m: StructNode, withName: boolean): unknown => ({
    t: m.type,
    ...(withName ? { n: kebab(m.name) } : {}),
    p: [m.paddingTop ?? 0, m.paddingRight ?? 0, m.paddingBottom ?? 0, m.paddingLeft ?? 0],
    s: m.itemSpacing ?? 0,
    cs: m.counterAxisSpacing ?? 0,
    l: m.layoutMode ?? 'NONE',
    c: (m.children ?? []).map((ch) => sig(ch, true)),
  });
  return JSON.stringify(sig(node, false));
}

export interface StructGroup {
  key: string; // 구조 시그니처
  members: StructNode[]; // 입력 순서 보존
}

/** 자식들을 구조 시그니처로 그룹화(입력 순서 유지). */
export function groupByStructure(children: readonly StructNode[]): StructGroup[] {
  const map = new Map<string, StructNode[]>();
  const order: string[] = [];
  for (const c of children) {
    const k = structuralSignature(c);
    if (!map.has(k)) {
      map.set(k, []);
      order.push(k);
    }
    map.get(k)!.push(c);
  }
  return order.map((k) => ({ key: k, members: map.get(k)! }));
}

/** 색 hex 목록 → 색 이름 라벨(충돌은 `-N`, 무채색은 `gray-{step}`). */
export function colorAxisLabels(hexes: readonly string[]): string[] {
  const used = new Set<string>();
  const uniq = (base: string): string => {
    let name = base;
    let i = 2;
    while (used.has(name)) name = `${base}-${i++}`;
    used.add(name);
    return name;
  };
  return hexes.map((hex) => {
    const { family, step, achromatic } = classifyColor(hex);
    return uniq(achromatic ? `gray-${step}` : family);
  });
}

export interface DerivedVariant {
  id: string;
  name: string; // 원본 멤버 이름
  props: Record<string, string>;
  variant: string; // 'prop=value, ...'(멤버 1개면 '')
}

/**
 * 같은 구조 그룹 멤버들 → 차이 축 도출(순수).
 * - 크기(면적 width*height) 고유값 2개+ → `size`(티셔츠 등급).
 * - 색(fillHex) 모든 멤버 보유 + 고유값 2개+ → `color`(색 이름).
 * - 둘 다 없으면 `variant=1·2…`. 동일 조합 충돌은 `variant` 인덱스로 분리(combineAsVariants는 고유 이름 필요).
 */
export function deriveVariants(members: readonly StructNode[]): DerivedVariant[] {
  if (members.length <= 1) {
    return members.map((m) => ({ id: m.id, name: m.name, props: {}, variant: '' }));
  }
  const props: Record<string, string>[] = members.map(() => ({}));

  // size 축: 면적 오름차순 → 티셔츠 등급
  const areas = members.map((m) => (m.width ?? 0) * (m.height ?? 0));
  const distinctAreas = [...new Set(areas)];
  if (distinctAreas.length > 1) {
    const sorted = [...distinctAreas].sort((a, b) => a - b);
    const grades = tshirtRoles(sorted);
    const byArea = new Map(sorted.map((a, i) => [a, grades[i]]));
    members.forEach((_, i) => {
      props[i].size = byArea.get(areas[i])!;
    });
  }

  // color 축: 모든 멤버에 fill이 있을 때만
  const hexes = members.map((m) => m.fillHex ?? null);
  if (hexes.every((h): h is string => h != null)) {
    const distinct = [...new Set(hexes)];
    if (distinct.length > 1) {
      const labels = colorAxisLabels(distinct);
      const byHex = new Map(distinct.map((h, i) => [h, labels[i]]));
      members.forEach((_, i) => {
        props[i].color = byHex.get(hexes[i] as string)!;
      });
    }
  }

  // 고유성: 축이 전혀 없으면 variant=N, 부분 충돌은 충돌분만 variant 인덱스
  const anyAxis = props.some((p) => Object.keys(p).length > 0);
  if (!anyAxis) {
    members.forEach((_, i) => {
      props[i].variant = String(i + 1);
    });
  } else {
    const counts = new Map<string, number>();
    members.forEach((_, i) => {
      const base = formatVariant(props[i]);
      const c = (counts.get(base) ?? 0) + 1;
      counts.set(base, c);
      if (c > 1) props[i].variant = String(c);
    });
  }

  return members.map((m, i) => ({ id: m.id, name: m.name, props: props[i], variant: formatVariant(props[i]) }));
}

/** 그룹 멤버 이름들의 공통 베이스(세트 이름용). 토큰 공통 접두 → 없으면 첫 이름. */
export function commonBaseName(names: readonly string[]): string {
  if (!names.length) return '';
  const split = (s: string) => kebab(s).split('-').filter(Boolean);
  let prefix = split(names[0]);
  for (const n of names.slice(1)) {
    const toks = split(n);
    let i = 0;
    while (i < prefix.length && i < toks.length && prefix[i] === toks[i]) i++;
    prefix = prefix.slice(0, i);
    if (!prefix.length) break;
  }
  return prefix.length ? prefix.join('-') : kebab(names[0]);
}
