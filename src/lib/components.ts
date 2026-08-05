/* ============================================================
   components.ts — 컴포넌트 등록/베리언트 분류의 순수 파서 (figma 의존 없음)
   Phase 3: 같은 베이스 이름을 공유하는 컴포넌트들을 베리언트 세트로 묶기 위한
   이름 분석(속성=값 추론)·그룹화·빈 조합 산출. 실제 createComponentFromNode·
   combineAsVariants 적용은 code.ts.
   ============================================================ */
import { kebab, pascalCase, capitalize } from './naming';
import { tshirtRoles } from './roles';
import { classifyColor } from './colorName';
import { highConfidenceComponentRole, isHighConfidenceComponent, parseHeadingSlots } from './componentLike';
import type { LikeNode } from './componentLike';

/** 알려진 속성 어휘 — 값 → 속성명 추론. */
const STATES = new Set(['default', 'hover', 'pressed', 'focus', 'active', 'disabled', 'loading']);
const SIZES = new Set(['xs', 'sm', 'md', 'lg', 'xl', 'xxl', 'tiny', 'small', 'medium', 'large', 'huge']);
const TYPES = new Set([
  'primary', 'secondary', 'tertiary', 'ghost', 'outline', 'outlined', 'filled',
  'text', 'link', 'danger', 'warning', 'success', 'info', 'accent', 'brand', 'neutral',
]);
/** 불리언 축 어휘 — 값 자체가 속성명, 값은 true(예: `card/selected` → `selected=true`). */
const BOOLEANS = new Set(['selected']);

/** 값 → 속성명(미지정이면 null). 속성명은 Figma 라이브러리 관례대로 Capitalize. */
export function inferProp(value: string): string | null {
  const v = value.toLowerCase();
  if (STATES.has(v)) return 'State';
  if (SIZES.has(v)) return 'Size';
  if (TYPES.has(v)) return 'Type';
  return null;
}

/** 알려진 컴포넌트 명사(단어 단위). 후보 추림·세트 그룹 키에 사용. */
const COMPONENT_NOUNS = new Set([
  'button', 'link', 'toggle', 'switch', 'checkbox', 'radio', 'slider',
  'input', 'textfield', 'field', 'textarea', 'select', 'dropdown', 'combobox', 'search',
  'card', 'panel', 'modal', 'dialog', 'drawer', 'sheet', 'popover', 'tooltip', 'accordion',
  'tab', 'tabs', 'breadcrumb', 'pagination', 'navbar', 'nav', 'sidebar', 'menu', 'stepper',
  'avatar', 'badge', 'chip', 'tag', 'toast', 'snackbar', 'alert', 'banner', 'progress',
  'spinner', 'skeleton', 'table', 'list', 'item', 'divider', 'label', 'tooltip', 'header', 'footer',
  // naming.ts EMITTED_ROLES 정합 — 리네임이 출력하는 요소 역할도 컴포넌트가 된다.
  // 없으면 `header-icon`의 머리명사가 `header`로 잡혀 역할이 사라지고 맥락이 이름이 된다.
  'icon', 'image', 'thumbnail', 'status', 'indicator', 'overlay',
]);
/** 컴포넌트 명사 약어 → 표준어. */
const NOUN_ABBR: Readonly<Record<string, string>> = { btn: 'button', img: 'image' };

/** 토큰을 표준어로(약어 펼침 + 소문자). */
function nounWord(token: string): string {
  return NOUN_ABBR[token] ?? token;
}

/**
 * 이름에 알려진 **컴포넌트 명사**가 있으면 표준 PascalCase 이름을 반환(없으면 null).
 * **마지막으로 매칭되는 명사 토큰** 기준 — 영어 핵심어(head noun)는 보통 맨 뒤라
 * 앞단어는 맥락으로 본다(예: `nav-button` → `Button`, `card-item` → `Item`, `btn` → `Button`).
 */
export function recognizeComponentName(name: string): string | null {
  let found: string | null = null;
  for (const t of kebab(name).split('-').filter(Boolean)) {
    const w = nounWord(t);
    if (COMPONENT_NOUNS.has(w)) found = pascalCase(w); // 마지막 매칭 우선
  }
  return found;
}

/**
 * 이름에서 **보편 속성**을 추출(컴포넌트 명사 토큰은 베이스라 제외).
 * - 불리언 어휘(`selected`) → `Selected=true`.
 * - `inferProp` 어휘 → `State`/`Size`/`Type`.
 * - 그 외 토큰은 설명용 베이스로 보고 무시.
 */
export function extractNameProps(name: string): Record<string, string> {
  const props: Record<string, string> = {};
  for (const t of kebab(name).split('-').filter(Boolean)) {
    if (COMPONENT_NOUNS.has(nounWord(t))) continue; // 컴포넌트 명사 = 베이스
    if (BOOLEANS.has(t)) {
      const bk = capitalize(t);
      if (!(bk in props)) props[bk] = 'true';
      continue;
    }
    const p = inferProp(t);
    if (p && !(p in props)) props[p] = t;
  }
  return props;
}

/**
 * 이름에서 **구별 토큰**(컴포넌트 명사·알려진 속성 어휘를 뺀 설명 토큰)을 kebab으로.
 * 변형 도출이 어휘로 멤버를 못 가를 때, `Variant=1·2` 대신 이 토큰을 변형 값으로 써서
 * 사용자의 네이밍을 보존한다(예: `nav-left`→`left`, `artist-button`→`artist`).
 */
export function distinguishingTokens(name: string): string {
  return kebab(name)
    .split('-')
    .filter(Boolean)
    .filter((t) => {
      if (COMPONENT_NOUNS.has(nounWord(t))) return false; // 컴포넌트 명사 = 베이스
      if (BOOLEANS.has(t)) return false; // 불리언 어휘
      if (inferProp(t)) return false; // State/Size/Type 어휘
      return true;
    })
    .join('-');
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
    if (BOOLEANS.has(seg)) {
      const bk = capitalize(seg); // 불리언 축: 값이 곧 속성명 → `Selected=true`
      if (!(bk in props)) {
        props[bk] = 'true';
        continue;
      }
    }
    const prop = inferProp(seg);
    if (prop && !(prop in props)) props[prop] = seg;
    else {
      const key = unknown === 0 ? 'Variant' : `Variant-${unknown + 1}`;
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
  /** 컴포넌트 속성 이름(PascalCase). */
  propName: string;
  type: CompPropType;
  /** 대상 레이어 이름(매칭용). */
  layerName: string;
  /**
   * 루트 기준 자식 인덱스 경로(`0/1`). 접힘 시 레이어명이 카피마다 달라도
   * 같은 슬롯을 가리키기 위해 사용. **대표(마스터) 트리** 기준.
   */
  layerPath?: string;
  /** 연결할 노드 필드. */
  field: 'characters' | 'mainComponent' | 'visible';
  /**
   * heading 접힘 전용 — 멤버마다 자식 인덱스가 달라도(액션 optional)
   * 슬롯 종류·순서로 값을 읽는다. 노출(expose)은 여전히 `layerPath`(마스터).
   */
  headingSlot?: {
    kind: 'title' | 'action' | 'meta';
    /** 해당 kind 안에서의 순서(0-based). */
    slotIndex: number;
    /** title/meta 내부 추가 경로(슬롯 루트 기준). */
    innerPath?: string;
  };
}

/**
 * 자식 레이어 → 노출할 컴포넌트 속성 계획(순수, 규칙 기반). 속성명은 PascalCase(관례).
 * - 이름이 `?`로 끝나면 → BOOLEAN(가시성). 예: `badge?` → 속성 `Badge`(visible).
 * - TEXT 레이어 → TEXT(characters).
 * - INSTANCE 레이어 → INSTANCE_SWAP(mainComponent).
 * 속성 이름 충돌은 `-2` 접미사로 회피.
 * **동명·동일 카피 TEXT는 한 번만** — Count×2(둘 다 "1") → `Count` 속성 1개(고아 Count-2 방지).
 * `path`가 있으면 `layerPath`로 동명 레이어를 슬롯별로 연결.
 */
export function inferComponentProperties(
  layers: { name: string; type: string; path?: string; characters?: string }[],
): CompPropPlan[] {
  const out: CompPropPlan[] = [];
  const taken = new Set<string>();
  const seenTextContent = new Set<string>();
  const uniq = (base: string): string => {
    let n = base || 'Prop';
    let i = 2;
    while (taken.has(n)) n = `${base || 'Prop'}-${i++}`;
    taken.add(n);
    return n;
  };
  for (const l of layers) {
    if (l.name.trim().endsWith('?')) {
      out.push({
        propName: uniq(pascalCase(l.name.replace(/\?+$/, '')) || 'Show'),
        type: 'BOOLEAN',
        layerName: l.name,
        layerPath: l.path,
        field: 'visible',
      });
    } else if (l.type === 'TEXT') {
      // characters를 알 때만 동명·동일 카피 중복 제거(미지정 시 기존처럼 Label-2 허용).
      if (l.characters !== undefined) {
        const contentKey = `${l.name}\0${l.characters}`;
        if (seenTextContent.has(contentKey)) continue;
        seenTextContent.add(contentKey);
      }
      out.push({
        propName: uniq(pascalCase(l.name) || 'Text'),
        type: 'TEXT',
        layerName: l.name,
        layerPath: l.path,
        field: 'characters',
      });
    } else if (l.type === 'INSTANCE') {
      out.push({
        propName: uniq(pascalCase(l.name) || 'Swap'),
        type: 'INSTANCE_SWAP',
        layerName: l.name,
        layerPath: l.path,
        field: 'mainComponent',
      });
    }
  }
  return out;
}

/** TEXT 레이어명이 곧 카피(또는 Text/Text 2)면 속성명은 중립적인 Text. */
function textPropBaseName(node: { name: string; characters?: string }): string {
  const n = node.name.trim();
  const c = node.characters ?? '';
  if (!n || n === c || /^text(\s+\d+)?$/i.test(n)) return 'Text';
  return pascalCase(n) || 'Text';
}

/**
 * 같은 구조 멤버들 사이 **값이 다른 슬롯만** 컴포넌트 속성으로 계획.
 * 두 버튼의 라벨만 "확인"/"취소"로 다르면 TEXT 속성 1개(인스턴스에서 값만 변경).
 * 공통으로 같은 텍스트·아이콘은 속성에 올리지 않는다.
 * 레이어명이 카피마다 달라도 트리 위치(`layerPath`)로 같은 슬롯을 본다.
 *
 * **`이름?` → BOOLEAN 우선**(TEXT여도) — `inferComponentProperties`와 동일.
 * **heading**: 액션 INSTANCE 유무 차이 → BOOLEAN(가시성), 경로는 액션이 있는 대표 트리 기준.
 */
export function inferVaryingComponentProperties(members: readonly StructNode[]): CompPropPlan[] {
  if (members.length < 2) return [];
  if (members.every((m) => highConfidenceComponentRole(m as LikeNode) === 'heading')) {
    return inferVaryingHeadingProperties(members);
  }
  const out: CompPropPlan[] = [];
  const taken = new Set<string>();
  const uniq = (base: string): string => {
    let n = base || 'Prop';
    let i = 2;
    while (taken.has(n)) n = `${base || 'Prop'}-${i++}`;
    taken.add(n);
    return n;
  };

  const visit = (nodes: readonly StructNode[], path: string): void => {
    const rep = nodes[0];
    if (!rep) return;

    if (path !== '') {
      // `?` 접미사 → BOOLEAN 우선(TEXT·INSTANCE여도 가시성 토글).
      if (rep.name.trim().endsWith('?')) {
        const vals = nodes.map((n) => n.visible !== false);
        if (new Set(vals).size > 1) {
          out.push({
            propName: uniq(pascalCase(rep.name.replace(/\?+$/, '')) || 'Show'),
            type: 'BOOLEAN',
            layerName: rep.name,
            layerPath: path,
            field: 'visible',
          });
        }
      } else if (rep.type === 'TEXT') {
        const vals = nodes.map((n) => n.characters ?? '');
        if (new Set(vals).size > 1) {
          out.push({
            propName: uniq(textPropBaseName(rep)),
            type: 'TEXT',
            layerName: rep.name,
            layerPath: path,
            field: 'characters',
          });
        }
      } else if (rep.type === 'INSTANCE') {
        const vals = nodes.map((n) => n.mainComponentKey ?? '');
        if (new Set(vals).size > 1) {
          out.push({
            propName: uniq(pascalCase(rep.name) || 'Swap'),
            type: 'INSTANCE_SWAP',
            layerName: rep.name,
            layerPath: path,
            field: 'mainComponent',
          });
        }
      }
    }

    if (rep.type === 'INSTANCE' || rep.type === 'TEXT') return;
    const lens = nodes.map((n) => (n.children ?? []).length);
    if (new Set(lens).size !== 1) return;
    const n = lens[0] ?? 0;
    for (let i = 0; i < n; i++) {
      const kids = nodes.map((m) => (m.children ?? [])[i]).filter((c): c is StructNode => !!c);
      if (kids.length !== nodes.length) return;
      visit(kids, path === '' ? String(i) : `${path}/${i}`);
    }
  };

  visit(members, '');
  return out;
}

/** heading 그룹에서 액션 슬롯이 가장 많은 멤버 인덱스(마스터 후보). */
export function pickCollapseMasterIndex(members: readonly StructNode[]): number {
  if (members.length === 0) return 0;
  let best = 0;
  let bestActions = headingActionCount(members[0]);
  let bestKids = members[0].children?.length ?? 0;
  for (let i = 1; i < members.length; i++) {
    const a = headingActionCount(members[i]);
    const k = members[i].children?.length ?? 0;
    if (a > bestActions || (a === bestActions && k > bestKids)) {
      best = i;
      bestActions = a;
      bestKids = k;
    }
  }
  return best;
}

function headingActionCount(node: StructNode): number {
  const slots = parseHeadingSlots(node as LikeNode);
  if (!slots) return 0;
  return slots.filter((s) => s.kind === 'action').length;
}

/** heading 접힘 — 타이틀/메타는 개수 일치, 액션은 optional, 값은 슬롯 정렬. */
function inferVaryingHeadingProperties(members: readonly StructNode[]): CompPropPlan[] {
  const bundles = members.map((m) => parseHeadingSlots(m as LikeNode));
  if (bundles.some((b) => !b)) return [];
  const repIdx = pickCollapseMasterIndex(members);
  const out: CompPropPlan[] = [];
  const taken = new Set<string>();
  const uniq = (base: string): string => {
    let n = base || 'Prop';
    let i = 2;
    while (taken.has(n)) n = `${base || 'Prop'}-${i++}`;
    taken.add(n);
    return n;
  };

  const ofKind = (slots: NonNullable<(typeof bundles)[0]>, kind: 'title' | 'action' | 'meta') =>
    slots.filter((s) => s.kind === kind);

  const titles = bundles.map((b) => ofKind(b!, 'title'));
  const metas = bundles.map((b) => ofKind(b!, 'meta'));
  const actions = bundles.map((b) => ofKind(b!, 'action'));
  const titleCount = titles[repIdx].length;
  const metaCount = metas[repIdx].length;
  if (titles.some((t) => t.length !== titleCount) || metas.some((m) => m.length !== metaCount)) return [];

  /** 대표 멤버 노드를 앞에 두어 layerName·타입이 마스터 기준이 되게. */
  const aroundRep = <T>(arr: T[]): T[] => {
    if (repIdx === 0) return arr;
    return [arr[repIdx], ...arr.filter((_, i) => i !== repIdx)];
  };

  // 타이틀 슬롯 — TEXT(직접 또는 래퍼 안)
  for (let ti = 0; ti < titleCount; ti++) {
    const repTitle = titles[repIdx][ti];
    const nodes = aroundRep(titles.map((t) => t[ti].node as StructNode));
    collectVaryingUnder(nodes, String(repTitle.childIndex), {
      kind: 'title',
      slotIndex: ti,
    }, out, uniq);
  }

  // 메타 슬롯
  for (let mi = 0; mi < metaCount; mi++) {
    const repMeta = metas[repIdx][mi];
    const nodes = aroundRep(metas.map((m) => m[mi].node as StructNode));
    collectVaryingUnder(nodes, String(repMeta.childIndex), {
      kind: 'meta',
      slotIndex: mi,
    }, out, uniq);
  }

  // 액션 — 유무 차이 → BOOLEAN(메타 패턴일 때만), 둘 다 있으면 스왑
  const maxActions = Math.max(...actions.map((a) => a.length));
  for (let ai = 0; ai < maxActions; ai++) {
    const present = actions.map((a) => ai < a.length);
    const repAction = actions[repIdx][ai];
    if (!repAction) continue; // 대표에 없으면 경로를 못 만듦 — 마스터 선택으로 방지
    const layerPath = String(repAction.childIndex);
    const layerName = (repAction.node as StructNode).name;
    if (present.some((p) => !p)) {
      if (metaCount < 1) continue; // 버튼형 과접힘 방지 — shouldCollapse와 동일 가드
      out.push({
        propName: uniq(pascalCase(layerName) || 'Action'),
        type: 'BOOLEAN',
        layerName,
        layerPath,
        field: 'visible',
        headingSlot: { kind: 'action', slotIndex: ai },
      });
    } else {
      const keys = actions.map((a) => (a[ai].node as StructNode).mainComponentKey ?? '');
      if (new Set(keys).size > 1) {
        out.push({
          propName: uniq(pascalCase(layerName) || 'Swap'),
          type: 'INSTANCE_SWAP',
          layerName,
          layerPath,
          field: 'mainComponent',
          headingSlot: { kind: 'action', slotIndex: ai },
        });
      }
    }
  }

  return out;
}

/** 동형 서브트리에서 변하는 TEXT/`?`/INSTANCE만 계획에 추가(heading 슬롯 메타 포함). */
function collectVaryingUnder(
  nodes: readonly StructNode[],
  path: string,
  heading: { kind: 'title' | 'meta'; slotIndex: number; innerPath?: string },
  out: CompPropPlan[],
  uniq: (base: string) => string,
): void {
  const rep = nodes[0];
  if (!rep) return;

  if (path !== '' || heading.innerPath != null) {
    const effectivePath = path;
    if (rep.name.trim().endsWith('?')) {
      const vals = nodes.map((n) => n.visible !== false);
      if (new Set(vals).size > 1) {
        out.push({
          propName: uniq(pascalCase(rep.name.replace(/\?+$/, '')) || 'Show'),
          type: 'BOOLEAN',
          layerName: rep.name,
          layerPath: effectivePath,
          field: 'visible',
          headingSlot: { ...heading },
        });
      }
    } else if (rep.type === 'TEXT') {
      const vals = nodes.map((n) => n.characters ?? '');
      if (new Set(vals).size > 1) {
        out.push({
          propName: uniq(textPropBaseName(rep)),
          type: 'TEXT',
          layerName: rep.name,
          layerPath: effectivePath,
          field: 'characters',
          headingSlot: { ...heading },
        });
      }
    } else if (rep.type === 'INSTANCE') {
      const vals = nodes.map((n) => n.mainComponentKey ?? '');
      if (new Set(vals).size > 1) {
        out.push({
          propName: uniq(pascalCase(rep.name) || 'Swap'),
          type: 'INSTANCE_SWAP',
          layerName: rep.name,
          layerPath: effectivePath,
          field: 'mainComponent',
          headingSlot: { ...heading },
        });
      }
    }
  }

  if (rep.type === 'INSTANCE' || rep.type === 'TEXT') return;
  const lens = nodes.map((n) => (n.children ?? []).length);
  if (new Set(lens).size !== 1) return;
  const n = lens[0] ?? 0;
  for (let i = 0; i < n; i++) {
    const kids = nodes.map((m) => (m.children ?? [])[i]).filter((c): c is StructNode => !!c);
    if (kids.length !== nodes.length) return;
    const childPath = path === '' ? String(i) : `${path}/${i}`;
    const inner = heading.innerPath == null ? String(i) : `${heading.innerPath}/${i}`;
    // 타이틀이 루트 TEXT면 path가 이미 childIndex — 첫 visit에서 처리됨.
    // 래퍼/메타는 자식으로 내려가며 innerPath를 쌓는다.
    collectVaryingUnder(kids, childPath, { ...heading, innerPath: inner }, out, uniq);
  }
}

/**
 * 접힘 속성 계획에 맞춰 StructNode에서 값 스냅샷.
 * headingSlot이 있으면 멤버별 자식 인덱스 불일치를 슬롯으로 해소.
 * BOOLEAN 대상이 없으면 false(optional 액션 결손).
 */
export function propValuesFromStruct(
  root: StructNode,
  plan: readonly CompPropPlan[],
): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {};
  for (const p of plan) {
    if (p.headingSlot) {
      const v = readHeadingSlotProp(root, p);
      if (v !== undefined) out[p.propName] = v;
      continue;
    }
    const target = p.layerPath ? structAtPath(root, p.layerPath) : null;
    if (!target) {
      if (p.type === 'BOOLEAN') out[p.propName] = false;
      continue;
    }
    out[p.propName] = structPropValue(target, p.type);
  }
  return out;
}

function readHeadingSlotProp(root: StructNode, p: CompPropPlan): string | boolean | undefined {
  const hs = p.headingSlot!;
  const slots = parseHeadingSlots(root as LikeNode);
  if (!slots) {
    return p.type === 'BOOLEAN' ? false : undefined;
  }
  const ofKind = slots.filter((s) => s.kind === hs.kind);
  const slot = ofKind[hs.slotIndex];
  if (!slot) {
    return p.type === 'BOOLEAN' ? false : undefined;
  }
  let node = slot.node as StructNode;
  if (hs.innerPath) {
    const inner = structAtPath(node, hs.innerPath);
    if (!inner) return p.type === 'BOOLEAN' ? false : undefined;
    node = inner;
  } else if (p.type === 'TEXT' && node.type !== 'TEXT') {
    // 타이틀 래퍼 → 단일 TEXT 자식
    const kid = (node.children ?? []).find((c) => c.type === 'TEXT');
    if (kid) node = kid;
  }
  return structPropValue(node, p.type);
}

function structAtPath(root: StructNode, path: string): StructNode | null {
  let cur: StructNode = root;
  for (const seg of path.split('/').filter(Boolean)) {
    const i = Number(seg);
    const kids = cur.children ?? [];
    if (!Number.isInteger(i) || i < 0 || i >= kids.length) return null;
    cur = kids[i];
  }
  return cur;
}

function structPropValue(node: StructNode, type: CompPropType): string | boolean {
  if (type === 'BOOLEAN') return node.visible !== false;
  if (type === 'TEXT') return node.characters ?? '';
  return node.mainComponentKey ?? '';
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
/** 스캔 입력 노드(figma SceneNode·LikeNode와 구조적으로 호환). */
export interface ScanNode extends LikeNode {
  id: string;
  name: string;
  type: string;
  locked?: boolean;
  /** 리네임이 남긴 역할(pluginData `dsRole`). 말단 노드의 등록 자격을 가른다. */
  role?: string;
  children?: readonly ScanNode[];
}

export interface ComponentCandidateNode {
  id: string;
  name: string;
  type: string;
  depth: number;
  parentId: string | null;
  /** 등록 가능: 미잠금·보임 + (FRAME/GROUP은 고신뢰 시맨틱 역할 · 말단은 재사용 원자 역할). */
  eligible: boolean;
  /** 구조 그룹으로 묶일 **세트 이름**(미리보기). 세트(2개+) 후보일 때만. */
  group?: string;
  /** 도출된 베리언트(`Size=lg, Color=blue` 등) 미리보기. 세트 멤버일 때만. */
  variant?: string;
  /** **단독** 컴포넌트로 등록될 후보의 등록 이름(PascalCase). 단독일 때만(group과 배타). */
  single?: string;
  /**
   * 같은 이름 반복이지만 차이가 TEXT/SWAP/BOOLEAN뿐이라 **세트 대신 단품+속성**으로 접힘.
   * UI는 기본 체크하고 [속성] 배지로 표시.
   */
  propsOnly?: boolean;
}

/**
 * 말단 노드(사각형·타원·벡터…)라도 등록 후보가 되는 역할 — 재사용되는 UI 원자.
 * 리네임이 판정해 `dsRole`로 남긴 값만 인정하므로, 리네임을 돌리지 않은 파일에서는
 * 말단이 하나도 열리지 않는다(기존과 동일).
 *
 * `background`·`border`·`shape`·`swatch`는 장식이라 제외하고, `indicator`는 progress의
 * 내부 부품이라 제외한다(그 progress 프레임 자체가 이미 후보다).
 */
const COMPONENT_ROLES = new Set(['icon', 'image', 'thumbnail', 'avatar', 'status', 'badge', 'divider']);

/**
 * 컴포넌트로 등록 가능한 노드인가 — 잠금·숨김 제외 + 다음 중 하나.
 * - FRAME/GROUP: 고신뢰 역할(button/chip/table/card/list/field/nav/progress/figure/heading).
 *   container/wrapper·랜드마크·임의 프레임은 제외 — 리네임 선행 없이 구조만으로 판정.
 * - 말단 노드: 리네임이 남긴 역할이 재사용 원자(`COMPONENT_ROLES`)일 때만.
 *   타원 아바타·벡터 아이콘처럼 프레임으로 감싸지 않은 요소를 그대로 등록하기 위한 통로다.
 *
 * 숨김(`visible === false`)은 두 경로 모두 제외 — BOOLEAN 속성용 자식 visible 판별과는 별개.
 */
export function componentEligible(node: ScanNode): boolean {
  if (node.locked || node.visible === false) return false;
  if (node.type === 'FRAME' || node.type === 'GROUP') return isHighConfidenceComponent(node);
  return !!node.role && COMPONENT_ROLES.has(kebab(node.role));
}

/**
 * 이미 컴포넌트 체계에 속한 서브트리 — 안으로 내려가면 안 된다.
 * 인스턴스/메인/세트 안의 FRAME을 다시 등록 후보로 잡으면 중복·인스턴스 내부 변조가 된다.
 * (리네임의 isSkippedSubtree와 같은 취지.)
 */
function isClosedComponentSubtree(node: ScanNode): boolean {
  return node.type === 'INSTANCE' || node.type === 'COMPONENT' || node.type === 'COMPONENT_SET';
}

/**
 * 선택 하위를 순회해 등록 후보 트리를 만든다 — 영향(eligible) + 그 조상 체인만 유지.
 * 역할 없는 말단(텍스트·장식 도형…)은 잡음이라 제외하되, 위치 맥락은 조상으로 보존.
 * 리네임이 재사용 원자로 판정한 말단(아바타·아이콘·썸네일…)은 후보로 올린다.
 *
 * **단일 선택의 최상위(부모 프레임)는 컨테이너**라 등록 대상에서 제외한다 — 자기 자신은
 * 컴포넌트화하지 않고 그 안의 자식만 후보가 된다. 트리에는 회색 맥락으로 남는다.
 * (다중 선택 시에는 선택 각각이 등록 단위이므로 최상위도 eligible. `REGISTER_COMPONENTS`의
 * 대상 결정과 동일한 규칙.)
 *
 * **고신뢰 게이트**: button/chip/card/list/field/nav/progress/figure/heading 구조만 eligible.
 * **숨김 제외**: `visible === false` 노드는 후보·하위로 들어가지 않음(숨긴 프레임 단독 등록 방지).
 * 반복 이름(2회+)은 스캔 후 구조 차이면 `group`(세트), 속성(텍스트/스왑/불리언)만
 * 다르면 `propsOnly`(단품+속성) — UI 기본 체크(code.ts).
 *
 * **닫힌 서브트리**: INSTANCE · COMPONENT · COMPONENT_SET 안은 순회하지 않는다.
 */
export function scanComponentCandidates(selection: readonly ScanNode[]): ComponentCandidateNode[] {
  const single = selection.length === 1;
  const all: ComponentCandidateNode[] = [];
  const visit = (n: ScanNode, depth: number, parentId: string | null): void => {
    // 숨김은 후보도 아니고 안쪽도 스캔하지 않음(실효 비가시 트리).
    if (n.visible === false) return;
    const isContainerRoot = single && depth === 0; // 컨테이너 자신 → 등록 제외
    all.push({ id: n.id, name: n.name, type: n.type, depth, parentId, eligible: !isContainerRoot && componentEligible(n) });
    // 이미 등록된 컴포넌트 체계는 서브트리째 스킵(안쪽 FRAME을 새 후보로 잡지 않음).
    if (isClosedComponentSubtree(n)) return;
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

/* ---------- 이름 기반 그룹화(등록): 같은 이름 자식을 베리언트 세트로 ---------- */
/**
 * 그룹화/변형 도출용 노드(figma SceneNode에서 추출). ScanNode + 여백·크기·대표 색.
 * 크기(width/height)·색(fillHex)은 변형 축(Size/Color) 도출에 쓴다.
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
  /** 리네임이 남긴 역할(pluginData `dsRole`). 사람이 지은 이름에는 없다. */
  role?: string;
  /** TEXT 레이어 문자열 — 속성 접힘(collapse) 판별용. */
  characters?: string;
  /** INSTANCE의 mainComponent key(또는 id) — swap 접힘 판별용. */
  mainComponentKey?: string | null;
  children?: readonly StructNode[];
}

/**
 * 같은 이름 그룹이 **베리언트 세트**가 아니라 **단품 + 컴포넌트 속성**으로 접혀야 하는지.
 *
 * 구조(타입·레이어명·자식 수·layout·fill·패딩)가 같고, 차이가 아래뿐이면 collapse:
 * - TEXT `characters` → TEXT 속성
 * - INSTANCE `mainComponent` → INSTANCE_SWAP
 * - 이름 `?` 레이어의 `visible` → BOOLEAN
 *
 * **heading 예외**: 타이틀·메타 슬롯 개수가 같고(메타≥1) 액션 INSTANCE만 유무가 다르면
 * 구조 차로 보지 않고 접힘(BOOLEAN). 버튼 아이콘 결손 등 메타 없는 케이스는 해당 없음.
 *
 * 크기만 다르면(카피 변화 없음) Size 세트로 본다. 카피/스왑 차이와 함께 크기가
 * 달라진 경우(오토레이아웃)는 속성 접힘으로 보고 크기는 무시한다.
 */
export function shouldCollapseToProperties(members: readonly StructNode[]): boolean {
  if (members.length < 2) return false;
  if (members.every((m) => highConfidenceComponentRole(m as LikeNode) === 'heading')) {
    return shouldCollapseHeadingMembers(members);
  }
  const base = members[0];
  for (let i = 1; i < members.length; i++) {
    const d = diffForCollapse(base, members[i]);
    if (d.struct) return false;
    if (d.size && !d.prop) return false;
  }
  // 완전 동일 복제(prop 없음·struct/size 없음)도 단품 1개 + 인스턴스 N개로 접는다.
  return true;
}

/** heading: 슬롯 정렬 비교 — 액션 optional(메타 있을 때만), 타이틀/메타 개수·내부 구조는 일치. */
function shouldCollapseHeadingMembers(members: readonly StructNode[]): boolean {
  const bundles = members.map((m) => parseHeadingSlots(m as LikeNode));
  if (bundles.some((b) => !b)) return false;

  const ofKind = (slots: NonNullable<(typeof bundles)[0]>, kind: 'title' | 'action' | 'meta') =>
    slots.filter((s) => s.kind === kind);

  const titleNs = bundles.map((b) => ofKind(b!, 'title').length);
  const metaNs = bundles.map((b) => ofKind(b!, 'meta').length);
  const actionNs = bundles.map((b) => ofKind(b!, 'action').length);
  if (new Set(titleNs).size !== 1 || new Set(metaNs).size !== 1) return false;

  // 액션 개수 불일치는 Num 등 메타가 있을 때만 optional — 없으면 버튼(라벨+아이콘) 과접힘 방지.
  if (new Set(actionNs).size !== 1 && metaNs[0] < 1) return false;

  const base = members[0];
  for (let i = 1; i < members.length; i++) {
    const d = diffHeadingPair(base, members[i], bundles[0]!, bundles[i]!);
    if (d.struct) return false;
    if (d.size && !d.prop) return false;
  }
  return true;
}

function diffHeadingPair(
  a: StructNode,
  b: StructNode,
  slotsA: NonNullable<ReturnType<typeof parseHeadingSlots>>,
  slotsB: NonNullable<ReturnType<typeof parseHeadingSlots>>,
): { prop: boolean; struct: boolean; size: boolean } {
  let prop = false;
  let struct = false;
  let size = false;

  // 루트 크롬(자식 제외)
  if ((a.layoutMode ?? 'NONE') !== (b.layoutMode ?? 'NONE')) struct = true;
  if ((a.fillHex ?? null) !== (b.fillHex ?? null)) struct = true;
  if ((a.paddingTop ?? 0) !== (b.paddingTop ?? 0) ||
      (a.paddingRight ?? 0) !== (b.paddingRight ?? 0) ||
      (a.paddingBottom ?? 0) !== (b.paddingBottom ?? 0) ||
      (a.paddingLeft ?? 0) !== (b.paddingLeft ?? 0) ||
      (a.itemSpacing ?? 0) !== (b.itemSpacing ?? 0) ||
      (a.counterAxisSpacing ?? 0) !== (b.counterAxisSpacing ?? 0)) {
    struct = true;
  }
  if ((a.width ?? 0) !== (b.width ?? 0) || (a.height ?? 0) !== (b.height ?? 0)) size = true;
  if (struct) return { prop, struct, size };

  const kind = (s: typeof slotsA, k: 'title' | 'action' | 'meta') => s.filter((x) => x.kind === k);

  const titlesA = kind(slotsA, 'title');
  const titlesB = kind(slotsB, 'title');
  for (let i = 0; i < titlesA.length; i++) {
    const d = diffForCollapse(titlesA[i].node as StructNode, titlesB[i].node as StructNode);
    if (d.struct) return { prop: true, struct: true, size };
    if (d.prop) prop = true;
    if (d.size) size = true;
  }

  const metasA = kind(slotsA, 'meta');
  const metasB = kind(slotsB, 'meta');
  for (let i = 0; i < metasA.length; i++) {
    const d = diffForCollapse(metasA[i].node as StructNode, metasB[i].node as StructNode);
    if (d.struct) return { prop, struct: true, size };
    if (d.prop) prop = true;
    if (d.size) size = true;
  }

  const actionsA = kind(slotsA, 'action');
  const actionsB = kind(slotsB, 'action');
  const n = Math.max(actionsA.length, actionsB.length);
  if (actionsA.length !== actionsB.length) prop = true;
  for (let i = 0; i < n; i++) {
    if (i >= actionsA.length || i >= actionsB.length) continue; // 결손은 prop으로 이미 처리
    const d = diffForCollapse(actionsA[i].node as StructNode, actionsB[i].node as StructNode);
    if (d.struct) return { prop, struct: true, size };
    if (d.prop) prop = true;
  }

  return { prop, struct, size };
}

/** 두 트리 비교 — 속성으로 흡수 가능한 차이 / 구조 / 크기. INSTANCE 안은 비교하지 않음. */
function diffForCollapse(a: StructNode, b: StructNode): { prop: boolean; struct: boolean; size: boolean } {
  let prop = false;
  let struct = false;
  let size = false;

  const walk = (x: StructNode, y: StructNode): void => {
    if (struct) return;
    if (x.type !== y.type) {
      struct = true;
      return;
    }

    // TEXT/INSTANCE는 레이어명이 카피·에셋마다 달라도 같은 슬롯(위치)로 본다.
    if (x.type === 'TEXT') {
      if ((x.characters ?? '') !== (y.characters ?? '')) prop = true;
      return; // 텍스트 크기 차이는 카피 길이 때문일 수 있어 무시
    }

    if (x.type === 'INSTANCE') {
      if ((x.mainComponentKey ?? '') !== (y.mainComponentKey ?? '')) prop = true;
      return; // 인스턴스 내부는 자식 컴포넌트 소관
    }

    if (x.name !== y.name) {
      struct = true;
      return;
    }

    const xv = x.visible !== false;
    const yv = y.visible !== false;
    if (xv !== yv) {
      if (x.name.trim().endsWith('?')) prop = true;
      else struct = true;
    }

    if ((x.layoutMode ?? 'NONE') !== (y.layoutMode ?? 'NONE')) struct = true;
    if ((x.fillHex ?? null) !== (y.fillHex ?? null)) struct = true;
    if ((x.paddingTop ?? 0) !== (y.paddingTop ?? 0) ||
        (x.paddingRight ?? 0) !== (y.paddingRight ?? 0) ||
        (x.paddingBottom ?? 0) !== (y.paddingBottom ?? 0) ||
        (x.paddingLeft ?? 0) !== (y.paddingLeft ?? 0) ||
        (x.itemSpacing ?? 0) !== (y.itemSpacing ?? 0) ||
        (x.counterAxisSpacing ?? 0) !== (y.counterAxisSpacing ?? 0)) {
      struct = true;
    }

    const xw = x.width ?? 0;
    const xh = x.height ?? 0;
    const yw = y.width ?? 0;
    const yh = y.height ?? 0;
    if (xw !== yw || xh !== yh) size = true;

    const xc = x.children ?? [];
    const yc = y.children ?? [];
    if (xc.length !== yc.length) {
      struct = true;
      return;
    }
    for (let i = 0; i < xc.length; i++) walk(xc[i], yc[i]);
  };

  walk(a, b);
  return { prop, struct, size };
}

export interface StructGroup {
  key: string; // 그룹 키(정규화된 이름)
  members: StructNode[]; // 입력 순서 보존
}

/**
 * 등록용 그룹화 — **정확한(정규화) 이름** 기준. 사용자는 "같은 것"에 똑같은 이름을 주고
 * 다른 컴포넌트엔 다른 이름을 준다(`Artwork Card`×6, `Like Button`×6, `artist-button`×1).
 * 머리명사로 묶으면 `Like Button`+`artist-button`이 'Button'으로 잘못 합쳐지므로, 정확한 이름으로
 * 묶어 사용자의 네이밍 의도를 그대로 따른다. 입력 순서 보존.
 *
 * 키 정규화 = **소문자 + 연속 공백 1칸**만. `kebab`을 쓰지 않는다 — kebab은 구두점·구분자를 전부
 * `-`로 뭉개 `Card (Large)`와 `Card Large`처럼 **서로 다른 이름을 잘못 합친다**. 대소문자·여백만
 * 관대하게 보고 구두점/글자는 그대로 구분한다.
 */
function exactNameKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function groupByExactName(children: readonly StructNode[]): StructGroup[] {
  const map = new Map<string, StructNode[]>();
  const order: string[] = [];
  for (const c of children) {
    const k = exactNameKey(c.name);
    if (!k) continue; // 빈 이름 제외
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
 * 같은 그룹 멤버들 → 차이 축 도출(순수). 속성명은 Capitalize(Figma 라이브러리 관례).
 * **이름 우선 + 기하 보완**:
 * 1. 이름 어휘(`Type`/`State`/`Size`/`Selected`)를 먼저 속성으로(`extractNameProps`).
 * 2. 이름만으로 멤버가 구분되지 않으면 빈 축을 **기하로 보완**:
 *    - 크기(면적 width*height) 고유값 2개+ → `Size`(티셔츠 등급, 이름이 Size를 안 줄 때만).
 *    - 색(fillHex) 모든 멤버 보유 + 고유값 2개+ → `Color`(색 이름).
 * 3. 그래도 안 갈리면 이름의 **구별 토큰**을 `Variant` 값으로(의미 보존; `nav-left`→`Variant=left`),
 *    구별 토큰이 없으면 마지막 수단 `Variant=1·2…`(combineAsVariants는 고유 이름 필요).
 */
export function deriveVariants(members: readonly StructNode[]): DerivedVariant[] {
  if (members.length <= 1) {
    return members.map((m) => ({ id: m.id, name: m.name, props: {}, variant: '' }));
  }
  // 1) 이름 어휘 우선
  const props: Record<string, string>[] = members.map((m) => extractNameProps(m.name));

  // 2) 이름만으로 구분 안 되면(중복 조합 존재) 기하로 보완
  const nameDistinct = new Set(props.map(formatVariant)).size === members.length;
  if (!nameDistinct) {
    // size: 이름이 Size를 안 줬을 때만
    if (!props.some((p) => 'Size' in p)) {
      const areas = members.map((m) => (m.width ?? 0) * (m.height ?? 0));
      const distinctAreas = [...new Set(areas)];
      if (distinctAreas.length > 1) {
        const sorted = [...distinctAreas].sort((a, b) => a - b);
        const grades = tshirtRoles(sorted);
        const byArea = new Map(sorted.map((a, i) => [a, grades[i]]));
        members.forEach((_, i) => {
          props[i].Size = byArea.get(areas[i])!;
        });
      }
    }
    // color: 이름이 Color를 안 줬고(애초에 이름엔 없음) 모든 멤버에 fill이 있을 때
    if (!props.some((p) => 'Color' in p)) {
      const hexes = members.map((m) => m.fillHex ?? null);
      if (hexes.every((h): h is string => h != null)) {
        const distinct = [...new Set(hexes)];
        if (distinct.length > 1) {
          const labels = colorAxisLabels(distinct);
          const byHex = new Map(distinct.map((h, i) => [h, labels[i]]));
          members.forEach((_, i) => {
            props[i].Color = byHex.get(hexes[i] as string)!;
          });
        }
      }
    }
  }

  // 3) 균일한 속성 키 + 고유 이름(Figma 세트 유효성 요건: 모든 변형이 같은 속성 키 집합).
  //    - 멤버마다 키가 다르면(혼합) **키 합집합**으로 맞추고 빠진 키는 `default`로 채운다.
  const keys = [...new Set(props.flatMap((p) => Object.keys(p)))];
  if (keys.length) for (const p of props) for (const k of keys) if (!(k in p)) p[k] = 'default';

  // 아직 멤버 구분이 안 되면(어휘로 못 가름) → 이름의 **구별 토큰**을 `Variant` 값으로(의미 보존).
  //   예: nav-left/nav-right/nav-links → Variant=left/right/links, artist-button/like-button → Variant=artist/like.
  //   구별 토큰이 비거나 겹치면 마지막 수단으로 `Variant=N` 인덱스.
  if (new Set(props.map(formatVariant)).size !== members.length) {
    const tokens = members.map((m) => distinguishingTokens(m.name));
    const usable = tokens.every((t) => t.length > 0) && new Set(tokens).size === members.length;
    members.forEach((_, i) => {
      props[i].Variant = usable ? tokens[i] : String(i + 1);
    });
  }

  return members.map((m, i) => ({ id: m.id, name: m.name, props: props[i], variant: formatVariant(props[i]) }));
}

/**
 * 공통 접두에서 **맥락 토막**을 떼어낸다 — 컴포넌트 이름은 놓인 자리와 무관해야 한다.
 * 리네임이 붙이는 이름은 `{맥락}-{역할}` 꼴이라(`article-avatar`) 그대로 쓰면 맥락이 박힌다.
 *
 * 말단(머리명사)에서 **뒤로 이어지는 컴포넌트 명사 연속**만 이름으로 남기고 그 앞은 버린다.
 * 명사가 이어지면 복합 명사로 보고 보존(`nav-button`·`card-header`·`list-item`), 명사가
 * 끊기는 지점부터는 맥락이다. 첫 토막만 보면 `list-article-thumbnail`처럼 맥락에 명사가
 * 섞였을 때(`list`) 못 떼어낸다.
 * 예: `article-avatar` → `avatar` · `list-article-thumbnail` → `thumbnail` · `nav-button` → `nav-button`.
 * 말단이 컴포넌트 명사가 아니면(`row-container`) 임의 이름으로 보고 손대지 않는다.
 */
function stripContextTokens(tokens: readonly string[]): string[] {
  const last = tokens.length - 1;
  if (last < 0) return tokens.slice();
  if (!COMPONENT_NOUNS.has(nounWord(tokens[last]))) return tokens.slice(); // 말단이 역할이 아니면 보존
  let start = last;
  while (start > 0 && COMPONENT_NOUNS.has(nounWord(tokens[start - 1]))) start--; // 명사 연속 = 복합 명사
  return tokens.slice(start);
}

/** 이름들의 공통 접두 토큰(맥락 포함). 공통분이 없으면 빈 배열. */
function commonPrefixTokens(names: readonly string[]): string[] {
  if (!names.length) return [];
  const split = (s: string) => kebab(s).split('-').filter(Boolean);
  let prefix = split(names[0]);
  for (const n of names.slice(1)) {
    const toks = split(n);
    let i = 0;
    while (i < prefix.length && i < toks.length && prefix[i] === toks[i]) i++;
    prefix = prefix.slice(0, i);
    if (!prefix.length) break;
  }
  return prefix;
}

/**
 * 그룹 멤버 이름들의 공통 베이스(세트 이름용) — 토큰 공통 접두를 PascalCase로.
 * 공통 접두가 있으면 맥락 토막만 떼고 쓰고(`nav-button-*` → `NavButton`,
 * `article-avatar` → `Avatar`), **없으면 인식된 컴포넌트명**(=마지막 명사)으로
 * 폴백한다(`nav-button` + `button-primary` → `Button`).
 *
 * 이름 텍스트만 보는 휴리스틱이라 맥락이 컴포넌트 명사면 복합 명사와 구분할 수 없다
 * (`card-thumbnail`). 리네임이 남긴 역할이 있으면 `componentBaseName`을 쓰는 게 정확하다.
 */
export function commonBaseName(names: readonly string[]): string {
  if (!names.length) return '';
  const prefix = commonPrefixTokens(names);
  if (prefix.length) return pascalCase(stripContextTokens(prefix).join('-'));
  return recognizeComponentName(names[0]) ?? pascalCase(names[0]); // 공통 접두 없음 → 인식 명사
}

/**
 * 멤버 전원이 같은 역할을 기록하고 있고 그 역할이 **현재 이름의 말단과 일치**할 때만
 * 그 역할을 신뢰한다(아니면 null). 말단 일치 검사가 낡은 기록을 걸러낸다 — 리네임 뒤
 * 사람이 이름을 바꿨다면 기록보다 사람의 이름이 우선이다.
 */
function trustedRole(members: readonly StructNode[]): string | null {
  if (!members.length) return null;
  const role = members[0].role ? kebab(members[0].role) : '';
  if (!role) return null;
  for (const m of members) {
    if (!m.role || kebab(m.role) !== role) return null; // 역할이 갈리면 신뢰 못 함
    const toks = kebab(m.name).split('-').filter(Boolean);
    if (toks[toks.length - 1] !== role) return null; // 이름이 손으로 바뀜 → 기록 무시
  }
  return role;
}

/**
 * 그룹의 컴포넌트 이름 — 리네임이 남긴 역할(`dsRole`)이 있으면 그것을 머리명사로 쓴다.
 * 이름만으로는 `nav-button`(사람이 지은 복합 명사)과 `card-thumbnail`(맥락+역할)이
 * 구조적으로 같아 구분할 수 없다. 역할 기록이 그 추측을 없앤다.
 * 기록이 없거나 신뢰할 수 없으면 이름 기반 규칙(`commonBaseName`)으로 폴백한다.
 */
export function componentBaseName(members: readonly StructNode[]): string {
  const role = trustedRole(members);
  return role ? pascalCase(role) : commonBaseName(members.map((m) => m.name));
}

/** 맥락을 되살린 이름(충돌 해소용) — 맥락 토막을 떼지 않은 공통 접두. */
function contextualName(members: readonly StructNode[]): string {
  const prefix = commonPrefixTokens(members.map((m) => m.name));
  return prefix.length ? pascalCase(prefix.join('-')) : commonBaseName(members.map((m) => m.name));
}

/**
 * 그룹별 최종 컴포넌트 이름(입력 순서와 1:1) — 맥락을 뗀 이름이 서로 **겹치면 맥락을 되살려**
 * 구분한다. 겹친 채로 등록하면 「분류」가 정확한 이름 기준으로 무관한 컴포넌트를 한 세트로
 * 병합한다(`article-avatar`·`profile-avatar` → 둘 다 `Avatar` → 병합).
 * 맥락을 되살려도 여전히 겹치면 마지막 수단으로 숫자를 붙인다.
 */
export function resolveGroupNames(groups: readonly (readonly StructNode[])[]): string[] {
  const base = groups.map(componentBaseName);
  const collides = new Set(base.filter((n, i) => base.indexOf(n) !== i));
  const taken = new Set<string>();
  return base.map((n, i) => {
    let name = collides.has(n) ? contextualName(groups[i]) : n;
    if (taken.has(name)) {
      let k = 2;
      while (taken.has(`${name}${k}`)) k++;
      name = `${name}${k}`;
    }
    taken.add(name);
    return name;
  });
}
