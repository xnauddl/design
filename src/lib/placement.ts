/* ============================================================
   placement.ts — 원본 자리를 인스턴스로 바꿀 때의 "자리 잡기" (IA v3 §4.7 "인스턴스 자리")
   [등록](code.ts REGISTER_COMPONENTS)과 [묶기](similarApply.ts)가 함께 쓴다. figma 의존 →
   figma-lib 배럴로 내보내 목 테스트한다.

   왜 따로 두나 — QA #3 불합격 3: 그룹 안 벡터 아이콘을 등록하면 벡터가 컴포넌트가 되어
   Components 페이지로 옮겨지는 순간 자식 0개가 된 GROUP을 피그마가 지운다. 기록해 둔 부모가
   없어져 insertChild가 던지고, 인스턴스는 createInstance()가 처음 놓은 페이지 맨 위(0,0)에 남았다.
   - 그룹 부모면 원본을 바꾸기 **전에** 빈 표지(anchor)를 넣어 그룹을 지킨다.
   - 넣기는 표지 자리(없으면 기록한 index)에 하고, x·y·제약을 원본과 같게 한 뒤 절대 위치로 보정한다.
   - 못 넣으면 인스턴스를 지운다 — 페이지 맨 위로 대체하지 않는다.
   ============================================================ */

type Parent = BaseNode & ChildrenMixin;

export interface Origin {
  /** 원본 레이어 이름(실패 보고용). */
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
  /** 원본의 절대 위치(페이지 기준 translate). 그룹 보정에 쓴다. */
  abs: { x: number; y: number } | null;
  /** 그룹 부모를 지키는 빈 표지. 넣기·정리 뒤 null. */
  anchor: SceneNode | null;
}

/** 자식이 0개가 되면 피그마가 스스로 지우는 부모(그룹류). */
function selfDeleting(parent: BaseNode | null): boolean {
  return !!parent && (parent.type === 'GROUP' || parent.type === 'BOOLEAN_OPERATION');
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

/**
 * 원본 자리를 기록한다 — 원본을 컴포넌트로 바꾸거나 지우기 **전에** 부른다.
 * 부모가 그룹이면 원본 바로 앞에 빈 표지를 넣어, 원본이 빠져도 그룹이 사라지지 않게 한다.
 */
export function captureOrigin(n: SceneNode): Origin {
  const p = n.parent;
  const parent = p && 'children' in p ? (p as Parent) : null;
  const index = parent ? parent.children.indexOf(n) : -1;
  const autolayout = !!parent && 'layoutMode' in parent && (parent as FrameNode).layoutMode !== 'NONE';
  const absolute = 'layoutPositioning' in n && (n as FrameNode).layoutPositioning === 'ABSOLUTE';
  const constraints = 'constraints' in n ? ((n as ConstraintMixin).constraints ?? null) : null;
  const o: Origin = { name: n.name, parent, index, x: n.x, y: n.y, autolayout, absolute, constraints, abs: absOf(n), anchor: null };
  if (parent && index >= 0 && selfDeleting(parent)) {
    try {
      const a = figma.createRectangle();
      a.name = '__dsl_anchor';
      a.fills = [];
      a.strokes = [];
      parent.insertChild(index, a); // 원본 바로 앞 — 원본은 index+1로 밀린다
      try { a.resize(Math.max(0.01, n.width), Math.max(0.01, n.height)); } catch { /* 크기 실패 무시 */ }
      a.x = n.x;
      a.y = n.y;
      o.anchor = a;
    } catch {
      /* 표지 실패 — 기록한 index로 시도한다(그룹이 남아 있으면 성공) */
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

/**
 * 인스턴스를 원본 자리에 넣는다. 성공하면 true.
 * 실패하면 인스턴스를 지우고 false — **페이지 맨 위에 남기지 않는다**(§4.7 5번).
 * 어느 쪽이든 표지는 치운다.
 */
export function placeAtOrigin(inst: SceneNode, o: Origin): boolean {
  try {
    const parent = o.parent;
    if (!parent || (parent as { removed?: boolean }).removed) throw new Error('부모가 없어졌습니다');
    const kids = parent.children;
    const at = o.anchor && !o.anchor.removed ? kids.indexOf(o.anchor) : -1;
    const idx = at >= 0 ? at : Math.min(Math.max(0, o.index), kids.length);
    parent.insertChild(idx, inst);
    if (inst.parent !== parent) throw new Error('자리에 들어가지 않았습니다');
    if (o.autolayout && o.absolute && 'layoutPositioning' in inst) {
      try { (inst as FrameNode).layoutPositioning = 'ABSOLUTE'; } catch { /* 절대 배치 실패 — 레이아웃 흐름에 둔다 */ }
    }
    if (!o.autolayout || o.absolute) {
      inst.x = o.x;
      inst.y = o.y;
      if (o.constraints && 'constraints' in inst) {
        try { (inst as ConstraintMixin).constraints = o.constraints; } catch { /* 제약 실패 무시 */ }
      }
      // 그룹 자식의 x·y는 그룹 밖 프레임 기준이다. 넣은 뒤 절대 위치가 원본과 다르면 그만큼 고친다
      // (회전·배율 없는 부모에서만 — 그 밖엔 절대 차이를 x·y 차이로 옮길 수 없다).
      const now = absOf(inst);
      if (o.abs && now && selfDeleting(parent) && isPlainTransform(parent)) {
        const dx = o.abs.x - now.x;
        const dy = o.abs.y - now.y;
        if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) {
          inst.x += dx;
          inst.y += dy;
        }
      }
    }
    releaseOrigin(o);
    return true;
  } catch {
    try { inst.remove(); } catch { /* 이미 사라짐 */ }
    releaseOrigin(o);
    return false;
  }
}
