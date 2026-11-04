/* ============================================================
   placement.ts — 원본 자리를 인스턴스로 바꿀 때의 "자리 잡기" (IA v3 §4.7 "인스턴스 자리")
   [등록](code.ts REGISTER_COMPONENTS) · [묶기](similarApply.ts) · 아이콘 자리 교체(artwork.ts)가
   함께 쓴다. figma 의존 → figma-lib 배럴로 내보내 목 테스트한다.

   왜 따로 두나 — QA #3 불합격 3: 그룹 안 벡터 아이콘을 등록하면 벡터가 컴포넌트가 되어
   Components 페이지로 옮겨지는 순간 자식 0개가 된 GROUP을 피그마가 지운다. 기록해 둔 부모가
   없어져 insertChild가 던지고, 인스턴스는 createInstance()가 처음 놓은 페이지 맨 위(0,0)에 남았다.
   - [등록]처럼 원본이 먼저 빠지는 곳에서만, GROUP 부모면 원본을 바꾸기 **전에** 빈 표지(anchor)를
     넣어 그룹을 지킨다(§4.7 3·4번). [묶기]·아이콘 자리 교체는 넣고 나서 지우므로 표지가 필요 없다.
   - 넣기는 표지 자리(없으면 기록한 index)에 하고, x·y·제약·크기 규칙을 원본과 같게 한 뒤 절대 위치로 보정한다.
   - 못 넣으면 인스턴스를 지운다 — 페이지 맨 위로 대체하지 않는다. [등록]은 복사본으로 채워 본다(5번).
   ============================================================ */
import { t } from './i18n';

type Parent = BaseNode & ChildrenMixin;

/** 원본의 오토레이아웃 크기 규칙(§4.7 2번). 원본에 없던 속성은 빠진다. */
export interface Sizing {
  layoutSizingHorizontal?: 'FIXED' | 'HUG' | 'FILL';
  layoutSizingVertical?: 'FIXED' | 'HUG' | 'FILL';
  layoutGrow?: number;
  layoutAlign?: 'MIN' | 'CENTER' | 'MAX' | 'STRETCH' | 'INHERIT';
  minWidth?: number | null;
  maxWidth?: number | null;
  minHeight?: number | null;
  maxHeight?: number | null;
}

/** 넣는 순서 — 옛 속성(맞춤·늘이기)을 먼저, 그 둘을 아우르는 layoutSizing을 뒤에, 최소·최대는 끝에. */
const SIZING_KEYS = [
  'layoutAlign',
  'layoutGrow',
  'layoutSizingHorizontal',
  'layoutSizingVertical',
  'minWidth',
  'maxWidth',
  'minHeight',
  'maxHeight',
] as const;

export interface Origin {
  /** 원본 레이어 이름(실패 보고용 · 복사본 이름). */
  name: string;
  parent: Parent | null;
  index: number;
  x: number;
  y: number;
  /** 부모가 오토레이아웃(위치는 레이아웃이 정함). */
  autolayout: boolean;
  /** 오토레이아웃 안 절대 배치 자식. */
  absolute: boolean;
  constraints: Constraints | null;
  /** 원본의 크기 규칙(FILL/HUG/FIXED · 늘이기 · 맞춤 · 최소·최대). */
  sizing: Sizing;
  /** 원본의 절대 위치(페이지 기준 translate). 그룹 보정에 쓴다. */
  abs: { x: number; y: number } | null;
  /** 그룹 부모를 지키는 빈 표지. 넣기·정리 뒤 null. */
  anchor: SceneNode | null;
}

export interface CaptureOptions {
  /**
   * GROUP 부모면 표지를 넣는다(기본 true — [등록]). 원본을 넣고 나서 지우는 곳([묶기] · 아이콘 자리 교체)은
   * false — 원본이 자리에 있는 동안 그룹이 빌 일이 없다(§4.7 3번).
   */
  anchor?: boolean;
}

/** 자식이 0개가 되면 피그마가 스스로 지우는 부모(그룹류). x·y가 바깥 프레임 기준이라 절대 위치 보정 대상. */
function selfDeleting(parent: BaseNode | null): boolean {
  return !!parent && (parent.type === 'GROUP' || parent.type === 'BOOLEAN_OPERATION');
}

/** 표지를 넣는 부모 — GROUP만. 불리언 연산은 표지 사각형이 모양에 더해지므로 넣지 않는다(§4.7 4번). */
function needsAnchor(parent: BaseNode | null): boolean {
  return !!parent && parent.type === 'GROUP';
}

function absOf(n: SceneNode): { x: number; y: number } | null {
  const t = (n as { absoluteTransform?: Transform }).absoluteTransform;
  if (!t || !Array.isArray(t) || !Array.isArray(t[0]) || !Array.isArray(t[1])) return null;
  const x = t[0][2];
  const y = t[1][2];
  return typeof x === 'number' && typeof y === 'number' ? { x, y } : null;
}

/** 회전·뒤집힘·배율 없는 변환인가(절대 위치 차이를 그대로 x·y 차이로 써도 되는가). */
function isPlainTransform(n: BaseNode | null): boolean {
  const t = n ? (n as { absoluteTransform?: Transform }).absoluteTransform : null;
  if (!t || !Array.isArray(t)) return false;
  const eq = (a: number, b: number) => Math.abs(a - b) < 1e-6;
  return eq(t[0][0], 1) && eq(t[0][1], 0) && eq(t[1][0], 0) && eq(t[1][1], 1);
}

function sizingOf(n: SceneNode): Sizing {
  const out: Record<string, unknown> = {};
  const src = n as unknown as Record<string, unknown>;
  for (const k of SIZING_KEYS) {
    try {
      if (!(k in src)) continue;
      const v = src[k];
      if (v !== undefined) out[k] = v;
    } catch {
      /* 읽기 실패 — 이어받지 않는다 */
    }
  }
  return out as Sizing;
}

/**
 * 크기 규칙을 원본과 같게 한다(§4.7 2번). 하나씩 따로 시도하고, 이미 같은 값은 건너뛴다.
 * 피그마가 거절하는 조합(오토레이아웃 밖 FILL, 오토레이아웃 아닌 마스터의 HUG 등)은 그 하나만 건너뛴다.
 */
function applySizing(node: SceneNode, s: Sizing): void {
  const dst = node as unknown as Record<string, unknown>;
  const src = s as Record<string, unknown>;
  for (const k of SIZING_KEYS) {
    if (!(k in src)) continue;
    const v = src[k];
    try {
      if (!(k in dst) || dst[k] === v) continue;
      dst[k] = v;
    } catch {
      /* 이 조합은 피그마가 받지 않는다 — 나머지는 계속 */
    }
  }
}

/**
 * 원본 자리를 기록한다 — 원본을 컴포넌트로 바꾸거나 지우기 **전에** 부른다.
 * `anchor`(기본 true)이고 부모가 GROUP이면 원본 바로 앞에 빈 표지를 넣어, 원본이 빠져도 그룹이 사라지지 않게 한다.
 */
export function captureOrigin(n: SceneNode, opts: CaptureOptions = {}): Origin {
  const p = n.parent;
  const parent = p && 'children' in p ? (p as Parent) : null;
  const index = parent ? parent.children.indexOf(n) : -1;
  const autolayout = !!parent && 'layoutMode' in parent && (parent as FrameNode).layoutMode !== 'NONE';
  const absolute = 'layoutPositioning' in n && (n as FrameNode).layoutPositioning === 'ABSOLUTE';
  const constraints = 'constraints' in n ? ((n as ConstraintMixin).constraints ?? null) : null;
  const o: Origin = {
    name: n.name, parent, index, x: n.x, y: n.y, autolayout, absolute, constraints,
    sizing: sizingOf(n), abs: absOf(n), anchor: null,
  };
  if ((opts.anchor ?? true) && parent && index >= 0 && needsAnchor(parent)) {
    let a: RectangleNode | null = null;
    try {
      a = figma.createRectangle();
      a.name = '__dsl_anchor';
      // 크기·위치는 그룹에 넣기 **전에** — 넣는 순간 그룹 경계가 잠깐 바뀌지 않게(§4.7 4번).
      // 부모를 옮겨도 피그마는 상대 변환(x·y)을 그대로 둔다고 보고, 그룹 자식의 x·y는 바깥 프레임
      // 기준이므로 원본과 같은 값이면 같은 자리다. (실기에서 어긋나도 표지는 보이지 않고 곧 지워진다.)
      try { a.resize(Math.max(0.01, n.width), Math.max(0.01, n.height)); } catch { /* 크기 실패 무시 */ }
      a.x = n.x;
      a.y = n.y;
      a.fills = [];
      a.strokes = [];
      parent.insertChild(index, a); // 원본 바로 앞 — 원본은 index+1로 밀린다
      o.anchor = a;
    } catch {
      // 표지 실패 — 만든 표지는 지운다(페이지 맨 위에 남기지 않는다). 기록한 index로 시도한다.
      if (a) { try { if (!a.removed) a.remove(); } catch { /* 이미 사라짐 */ } }
    }
  }
  return o;
}

/** 표지를 치운다(여러 번 불러도 된다). 원본이 그 자리에 그대로 남은 경우(컴포넌트화 실패 등)에 부른다. */
export function releaseOrigin(o: Origin): void {
  const a = o.anchor;
  o.anchor = null;
  if (!a) return;
  try { if (!a.removed) a.remove(); } catch { /* 이미 사라짐 */ }
}

/** 표지는 그대로 두고 넣어 본다. 실패하면 node를 지우고 false. */
function tryPlace(node: SceneNode, o: Origin): boolean {
  try {
    const parent = o.parent;
    if (!parent || (parent as { removed?: boolean }).removed) throw new Error('parent gone'); // 화면에 안 나옴 — 아래 catch가 삼킨다
    const kids = parent.children;
    const at = o.anchor && !o.anchor.removed ? kids.indexOf(o.anchor) : -1;
    const idx = at >= 0 ? at : Math.min(Math.max(0, o.index), kids.length);
    parent.insertChild(idx, node);
    if (node.parent !== parent) throw new Error('not inserted'); // 화면에 안 나옴 — 아래 catch가 삼킨다
    if (o.autolayout && o.absolute && 'layoutPositioning' in node) {
      try { (node as FrameNode).layoutPositioning = 'ABSOLUTE'; } catch { /* 절대 배치 실패 — 레이아웃 흐름에 둔다 */ }
    }
    // 크기 규칙(FILL/HUG/FIXED 등)은 부모에 들어간 뒤에야 받는다.
    applySizing(node, o.sizing);
    if (!o.autolayout || o.absolute) {
      node.x = o.x;
      node.y = o.y;
      if (o.constraints && 'constraints' in node) {
        try { (node as ConstraintMixin).constraints = o.constraints; } catch { /* 제약 실패 무시 */ }
      }
      // 그룹·불리언 자식의 x·y는 그 밖 프레임 기준이다. 넣은 뒤 절대 위치가 원본과 다르면 그만큼 고친다
      // (회전·배율 없는 부모에서만 — 그 밖엔 절대 차이를 x·y 차이로 옮길 수 없다).
      const now = absOf(node);
      if (o.abs && now && selfDeleting(parent) && isPlainTransform(parent)) {
        const dx = o.abs.x - now.x;
        const dy = o.abs.y - now.y;
        if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) {
          node.x += dx;
          node.y += dy;
        }
      }
    }
    return true;
  } catch {
    try { node.remove(); } catch { /* 이미 사라짐 */ }
    return false;
  }
}

/**
 * 인스턴스를 원본 자리에 넣는다. 성공하면 true.
 * 실패하면 인스턴스를 지우고 false — **페이지 맨 위에 남기지 않는다**(§4.7 5번).
 * 어느 쪽이든 표지는 치운다.
 */
export function placeAtOrigin(inst: SceneNode, o: Origin): boolean {
  const ok = tryPlace(inst, o);
  releaseOrigin(o);
  return ok;
}

export type FillResult = 'instance' | 'copy' | 'failed';

/**
 * [등록]의 자리 채우기(§4.7 5번): 인스턴스 → (못 넣으면) 복사본 → (그래도 못 하면) 빈 자리.
 * - `make`는 그 자리의 인스턴스를 새로 만든다(속성 접힘이면 속성 값·사진까지). 던져도 된다 —
 *   던지기 전에 만든 인스턴스는 `make`가 스스로 치운다.
 * - 복사본 = `make()`로 만든 인스턴스를 바로 떼어 낸(detachInstance) 보통 프레임. 이름은 원본 이름.
 *   그것도 못 넣으면 그 프레임의 자식이 하나뿐일 때 그 자식만 넣어 본다(불리언 안 벡터 등).
 * 표지는 모든 시도가 끝난 뒤에 치운다 — 중간에 치우면 원본이 유일한 자식이던 그룹이 사라진다.
 * `onError`는 실패 사유(인스턴스 만들기·넣기)를 받는다.
 */
export function fillOrigin(make: () => InstanceNode, o: Origin, onError?: (why: string) => void): FillResult {
  const errText = (e: unknown) => (e instanceof Error ? e.message : String(e));
  try {
    let inst: InstanceNode | null = null;
    try {
      inst = make();
    } catch (e) {
      onError?.(t('component.fail.instanceMake', { error: errText(e) }));
    }
    if (inst) {
      if (tryPlace(inst, o)) return 'instance';
      onError?.(t('component.fail.instancePlace'));
    }
    // 복사본 — 보통 프레임(컴포넌트와 이어지지 않음)
    const detached = (): FrameNode | null => {
      let i: InstanceNode | null = null;
      try {
        i = make();
        const f = i.detachInstance();
        try { f.name = o.name; } catch { /* 이름 실패 무시 */ }
        return f;
      } catch {
        if (i) { try { if (!i.removed) i.remove(); } catch { /* 이미 사라짐 */ } }
        return null;
      }
    };
    const frame = detached();
    if (!frame) return 'failed';
    if (tryPlace(frame, o)) return 'copy';
    // 자식이 하나뿐이면 그 자식만(벡터 아이콘 등 — 프레임을 받지 않는 부모)
    const again = detached();
    if (!again) return 'failed';
    const kids = 'children' in again ? (again.children as readonly SceneNode[]) : [];
    if (kids.length !== 1) {
      try { again.remove(); } catch { /* 이미 사라짐 */ }
      return 'failed';
    }
    const only = kids[0];
    try {
      const holder = again.parent;
      if (holder && 'appendChild' in holder) (holder as Parent).appendChild(only);
      try { only.name = o.name; } catch { /* 이름 실패 무시 */ }
    } catch {
      /* 꺼내기 실패 — 아래에서 프레임째 지운다 */
    }
    try { if (!again.removed) again.remove(); } catch { /* 이미 사라짐 */ }
    if (only.removed) return 'failed';
    return tryPlace(only, o) ? 'copy' : 'failed';
  } finally {
    releaseOrigin(o);
  }
}
