/* ============================================================
   artwork.ts — 그림(사진·날 벡터) 슬롯을 인스턴스로 담는 figma 적용 조각.
   등록(REGISTER_COMPONENTS)의 **속성 접힘** 경로가 쓴다. 무엇이 다른지 판정하는 쪽은
   순수 계층(components.ts: `inferVaryingImageSlots` · `CompPropPlan.fromVector`).

   왜 나눠 뒀나 — 이 경로는 멤버를 지우고 마스터 하나만 남긴다. 그림을 못 옮기면 사진·아이콘이
   조용히 마스터 것으로 통일된다(되돌리기 전엔 알아채기 어렵다). 지우기 전에 옮겨지는지
   목 테스트로 지킨다(figma-lib 배럴로 내보낸다).
   ============================================================ */
import { t } from './i18n';
import { captureOrigin, placeAtOrigin, releaseOrigin } from './placement';
import { ICON_KEY } from './components';
import { VECTOR_TYPES } from './nodePaint'; // 벡터로 치는 타입

/** 루트 기준 **자식 인덱스 경로**(`0/1`)의 노드. 이름이 갈린 트리에서도 같은 슬롯을 가리킨다. */
export function nodeAtPath(root: SceneNode, path: string): SceneNode | null {
  let cur: SceneNode = root;
  for (const seg of path.split('/').filter(Boolean)) {
    if (!('children' in cur)) return null;
    const i = Number(seg);
    if (!Number.isFinite(i)) return null;
    const kids = cur.children as readonly SceneNode[];
    if (!kids[i]) return null;
    cur = kids[i];
  }
  return cur;
}

export interface IconRegistry {
  /** 지문별 아이콘 컴포넌트를 보장한다(없으면 복제 → 컴포넌트화 → 페이지 배치). */
  ensure(vectorKey: string, node: SceneNode, baseName: string): ComponentNode | null;
  get(vectorKey: string): ComponentNode | null;
  /** 이번 실행에서 새로 만든 아이콘 수. */
  created(): number;
  /**
   * 이번 실행에 새로 만든 아이콘을 지우고 등록부 · 만든 수에서 뺀다(§4.7 "재사용" 5번 "아이콘 정리" — 그 멤버가
   * 원본으로 남았을 때). 문서에 있던 아이콘이나 이번에 만들지 않은 지문이면 아무것도 하지 않고 false.
   */
  discard(vectorKey: string): boolean;
  /** 이번 실행에 새로 만든 아이콘 지문(만든 순서) — [등록] 끝 정리(§4.7 "인스턴스 자리" 7번 — C-D4)가 쓴다. */
  madeKeys(): string[];
}

/**
 * 날 벡터는 인스턴스 안에서 경로(geometry)를 못 고친다 — 그림이 다른 슬롯을 담으려면
 * 그림마다 **컴포넌트**를 만들고 그 자리를 인스턴스로 바꿔 INSTANCE_SWAP으로 노출해야 한다.
 * 지문(vectorKey) 기준이라 그룹이 달라도 같은 아이콘은 하나만 생긴다.
 */
export function createIconRegistry(opts: {
  page: BaseNode & ChildrenMixin;
  /** 컴포넌트를 컴포넌트 페이지에 배치(커서 전진 포함). */
  place: (c: ComponentNode) => void;
  /** 문서 안에서 겹치지 않는 이름으로. */
  uniqueName: (base: string) => string;
  onFailure: (message: string) => void;
  /**
   * 문서에 이미 있는, 같은 그림 지문(`dsl.icon`)의 로컬 아이콘 컴포넌트(§4.7 "재사용" 2번).
   * 있으면 새로 만들지 않고 그것을 쓴다 — 다시 [등록]해도 `Icon2`가 생기지 않는다. 새로 만든 수에는 넣지 않는다.
   */
  existing?: (vectorKey: string) => ComponentNode | null;
}): IconRegistry {
  const byKey = new Map<string, ComponentNode>();
  const madeKeys = new Set<string>(); // 이번 실행에 새로 만든 지문
  let made = 0;
  const lookup = (vectorKey: string): ComponentNode | null => {
    const hit = byKey.get(vectorKey);
    if (hit) return hit;
    let found: ComponentNode | null = null;
    try { found = opts.existing?.(vectorKey) ?? null; } catch { found = null; }
    if (found && !found.removed) {
      byKey.set(vectorKey, found);
      return found;
    }
    return null;
  };
  return {
    get: (vectorKey) => lookup(vectorKey),
    created: () => made,
    madeKeys: () => [...madeKeys],
    discard(vectorKey) {
      if (!madeKeys.has(vectorKey)) return false;
      const comp = byKey.get(vectorKey);
      madeKeys.delete(vectorKey);
      byKey.delete(vectorKey);
      made--;
      try { if (comp && !comp.removed) comp.remove(); } catch { /* 이미 사라짐 */ }
      return true;
    },
    ensure(vectorKey, node, baseName) {
      const hit = lookup(vectorKey);
      if (hit) return hit;
      try {
        // 복제본을 **즉시** 페이지로 옮긴다 — 멤버 트리 안에 잠깐이라도 형제로 남으면
        // 자식 수가 변해 다른 슬롯의 인덱스 경로가 어긋난다.
        const clone = node.clone();
        opts.page.appendChild(clone);
        const comp = figma.createComponentFromNode(clone);
        comp.name = opts.uniqueName(baseName);
        // 그림 지문을 남긴다 — 다음 [등록]이 이 아이콘을 찾아 쓴다(§4.7 "재사용" 2번).
        try { comp.setPluginData(ICON_KEY, vectorKey); } catch { /* 남기지 못하면 다음에 새로 만들 뿐 */ }
        opts.place(comp);
        byKey.set(vectorKey, comp);
        madeKeys.add(vectorKey);
        made++;
        return comp;
      } catch (e) {
        opts.onFailure(t('component.fail.iconComponent', { name: baseName, error: e instanceof Error ? e.message : String(e) }));
        return null;
      }
    },
  };
}

/**
 * [등록] 끝 정리(§4.7 "인스턴스 자리" 7번 — 2026-11-13 사용자 결정 C-D4). ① 이번 실행에 새로 만든 아이콘 중
 * 어디에도 쓰이지 않게 된 것(인스턴스 0)을 지운다 — 마스터를 못 만든 그룹 · 소가족 마스터 실패 · 원본으로 남은
 * 나머지 멤버 몫 등. 다른 곳이 쓰고 있으면 남긴다. 지운 아이콘은 등록부의 만든 수("아이콘 n")에서 빠진다.
 * ② 그 뒤 Components 페이지가 비었고 이번 실행에 만든 페이지면 지운다(전부터 있던 페이지는 비어도 둔다).
 * 그래서 아무것도 못 만들면 파일에 남는 것이 없다. 지운 아이콘 수를 돌려준다.
 */
export async function cleanupAfterRegister(opts: {
  registry: IconRegistry;
  page: (BaseNode & ChildrenMixin) | null;
  /** 이번 실행에 만든 Components 페이지인가. */
  pageCreated: boolean;
  /** 아이콘 컴포넌트를 쓰는 인스턴스(문서 전체 — 피그마 `getInstancesAsync`). */
  instancesOf: (comp: ComponentNode) => Promise<readonly SceneNode[]>;
}): Promise<number> {
  let removed = 0;
  for (const key of opts.registry.madeKeys()) {
    const comp = opts.registry.get(key);
    if (!comp || comp.removed) { if (opts.registry.discard(key)) removed++; continue; }
    let used = true;
    try {
      used = (await opts.instancesOf(comp)).some((i) => !i.removed);
    } catch {
      used = true; // 읽지 못하면 남긴다 — 쓰는 아이콘을 지우지 않게
    }
    if (!used && opts.registry.discard(key)) removed++;
  }
  const page = opts.page;
  if (opts.pageCreated && page && !(page as SceneNode).removed && page.children.length === 0) {
    try { (page as unknown as { remove(): void }).remove(); } catch { /* 지우지 못하면 빈 페이지가 남을 뿐 */ }
  }
  return removed;
}

export interface VectorSlot {
  layerName: string;
  /** 마스터 기준 자식 인덱스 경로. */
  layerPath: string;
  /** 이 자리에 놓을 아이콘 컴포넌트(마스터 자신의 그림). 없으면 교체하지 않는다. */
  icon: ComponentNode | null;
}

/**
 * 마스터의 날 벡터 자리를 아이콘 **인스턴스**로 교체한다(INSTANCE_SWAP은 대상이 인스턴스여야
 * 붙으므로 속성 노출보다 먼저). 먼저 끼우고 뒤에 지워 자식 수가 잠깐도 줄지 않게 한다 —
 * 줄면 뒤따르는 슬롯의 인덱스 경로가 어긋난다.
 * 자리 잡기는 공용 모듈(§4.7 "인스턴스 자리")로 — 같은 순서·x·y·제약·절대 배치·크기 규칙을 이어받고,
 * 못 넣으면 인스턴스를 지운다(createInstance()가 놓은 페이지 맨 위에 남기지 않는다). 벡터는 그대로 둔다.
 * 원본이 넣은 뒤에야 빠지므로 표지는 쓰지 않는다(§4.7 3번).
 */
export function swapVectorSlots(master: SceneNode, slots: readonly VectorSlot[]): string[] {
  const failures: string[] = [];
  for (const s of slots) {
    const target = nodeAtPath(master, s.layerPath);
    const parent = target?.parent;
    if (!target || !s.icon || !parent || !('children' in parent)) {
      failures.push(t('component.fail.iconSwap', { layer: s.layerName }));
      continue;
    }
    let inst: InstanceNode | null = null;
    try {
      const o = captureOrigin(target, { anchor: false });
      inst = s.icon.createInstance();
      inst.name = target.name;
      try { inst.resize(target.width, target.height); } catch { /* 제약상 불가 시 아이콘 크기 그대로 */ }
      const placed = inst;
      inst = null; // 여기부터는 placeAtOrigin이 실패 시 지운다
      if (!placeAtOrigin(placed, o)) {
        failures.push(t('component.fail.iconSwapPlace', { layer: s.layerName }));
        continue;
      }
      target.remove();
    } catch (e) {
      // 만든 인스턴스가 아직 자리 잡기 전이면 지운다 — 페이지 맨 위(0,0)에 남기지 않는다.
      if (inst) { try { if (!inst.removed) inst.remove(); } catch { /* 이미 사라짐 */ } }
      failures.push(t('component.fail.iconSwapErr', { layer: s.layerName, error: e instanceof Error ? e.message : String(e) }));
    }
  }
  return failures;
}

/** 경로 잇기 — `joinPath('0', '')` = '0', `joinPath('', '1/2')` = '1/2'. */
export function joinPath(prefix: string, path: string): string {
  if (!prefix) return path;
  return path ? `${prefix}/${path}` : prefix;
}

const FRAME_LIKE = new Set(['FRAME', 'COMPONENT', 'COMPONENT_SET', 'INSTANCE', 'SECTION']);

/**
 * 원본 경로 → 마스터(컴포넌트) 경로 앞붙이(§4.7 "인스턴스 자리" 8번).
 * 피그마는 도형(사각형·원 등)을 컴포넌트로 만들 때 컴포넌트 프레임으로 **감싼다** — 그러면 원본의
 * 루트('')는 마스터의 첫 자식('0')이다. 마스터의 자식이 하나이고 그 종류가 원본 루트와 같으면 감싼 것으로 본다.
 * 프레임류는 그 자리에서 컴포넌트가 되므로 앞붙이가 없다.
 */
export function shapePrefix(master: SceneNode, rootType: string): string {
  if (FRAME_LIKE.has(rootType)) return '';
  const kids = 'children' in master ? (master.children as readonly SceneNode[]) : [];
  return kids.length === 1 && kids[0].type === rootType ? '0' : '';
}

/** 첫 보이는 IMAGE 채움의 해시. 사진이 아니면 undefined. */
function imageHashOf(n: SceneNode): string | undefined {
  const f = 'fills' in n ? (n as GeometryMixin).fills : null;
  if (!Array.isArray(f)) return undefined;
  const img = (f as readonly Paint[]).find((p) => p.type === 'IMAGE' && p.visible !== false) as ImagePaint | undefined;
  return img ? img.imageHash ?? '' : undefined;
}

const sameSize = (a: number, b: number) => Math.abs(Math.round(a * 100) - Math.round(b * 100)) < 1;

/** 검사 선택 인자(§4.7 8번 "안쪽 레이어의 자리 · 크기도 본다"). */
export interface FitOpts {
  /** 안쪽 레이어 자리 · 크기 검사(기본 켬). heading 접힘 경로는 끈다(슬롯 짝이라 인덱스 비교가 어긋남). */
  layout?: boolean;
  /** 아이콘 프레임인가 — 날 벡터처럼 아이콘 인스턴스 짝이면 그 레이어만 보고 안으로 내려가지 않는다. */
  isIcon?: (node: SceneNode) => boolean;
  /** 그림 크기(해시 → 크기) — 사진 틀 비교(FILL 채움)에 쓴다. 없으면 `keepLookAsync`가 읽어 둔 것. */
  imageSize?: (hash: string) => { width: number; height: number } | null;
}

/**
 * `node`의 자리를 `root` 좌표계로 옮긴 값(루트 기준 x · y). 부모 기준 x · y는 GROUP 자식이면 그룹 밖 프레임
 * 기준이라 GROUP 루트 멤버와 인스턴스가 늘 다르게 나온다 — 그래서 `absoluteTransform`을 루트의 역변환으로 옮긴다.
 * `absoluteTransform`이 없으면(목) 부모 기준 x · y를 루트 직전까지 더하고, x · y가 없으면 0.
 */
function relPos(node: SceneNode, root: SceneNode): { x: number; y: number } {
  if (node === root) return { x: 0, y: 0 };
  const T = (n: SceneNode) => {
    const m = (n as { absoluteTransform?: Transform }).absoluteTransform;
    return Array.isArray(m) && Array.isArray(m[0]) && Array.isArray(m[1]) && m[0].every((v) => typeof v === 'number') && m[1].every((v) => typeof v === 'number') ? m : null;
  };
  const tn = T(node);
  const tr = T(root);
  if (tn && tr) {
    const [[a, b, tx], [c, d, ty]] = tr;
    const det = a * d - b * c;
    if (Math.abs(det) > 1e-9) {
      const dx = tn[0][2] - tx;
      const dy = tn[1][2] - ty;
      return { x: (d * dx - b * dy) / det, y: (-c * dx + a * dy) / det };
    }
  }
  let x = 0;
  let y = 0;
  let cur: BaseNode | null = node;
  while (cur && cur !== root) {
    const n = cur as { x?: unknown; y?: unknown };
    x += typeof n.x === 'number' ? n.x : 0;
    y += typeof n.y === 'number' ? n.y : 0;
    cur = cur.parent;
  }
  return { x, y };
}

const rotationOf = (n: SceneNode): number => {
  const r = (n as { rotation?: unknown }).rotation;
  return typeof r === 'number' ? r : 0;
};

/* ---------- 화면을 지키는 옮기기(§4.7 "인스턴스 자리" 8번 — A.18 결함 2) ----------
   인스턴스 안 레이어의 자리 · 크기는 덮어쓸 수 없지만 채움 · 글자 자동 크기는 덮어쓸 수 있다. 자리만 다른 사진 틀은
   사진 채움의 자르기(CROP)로, 상자 폭만 다른 글자는 글자 자동 크기로 보이는 모습을 맞춘다.
   실험(2026-11-18 새 빈 파일): `imageTransform`은 **노드(0–1) → 그림(0–1)** 행렬이고, 인스턴스 안 사각형에 CROP을
   넣어도 거절되지 않으며 원본과 내보낸 PNG가 같다. 글자 자동 크기 덮어쓰기도 그려진 범위 · 부모 높이가 원본과 같다.
   두 덮어쓰기 모두 그 컴포넌트에 속성을 노출한 뒤에도 남는다. */

/** 2×3 아핀(피그마 `Transform`과 같은 꼴). */
export type Affine = [[number, number, number], [number, number, number]];
export interface Box { x0: number; y0: number; x1: number; y1: number }
type Size2 = { width: number; height: number };

const visiblePaints = (v: unknown): Paint[] => (Array.isArray(v) ? (v as Paint[]).filter((p) => p.visible !== false) : []);
const zeroRadius = (n: SceneNode): boolean => {
  const r = (n as { cornerRadius?: unknown }).cornerRadius;
  return r === undefined || r === 0;
};
const noOwnPaint = (n: SceneNode): boolean =>
  visiblePaints((n as { strokes?: unknown }).strokes).length === 0 && visiblePaints((n as { effects?: unknown }).effects).length === 0;

/**
 * 사진 틀이면 그 **사진 잎**(끝까지 따라가 만나는 사진 사각형), 아니면 null(§4.7 8번 ①).
 * ⓐ RECTANGLE · 보이는 채움이 이미지 하나 · 보이는 선 · 효과 없음 · 모서리 반경 0 · 회전 0
 * ⓑ 자기 칠 · 선 · 효과가 없는 FRAME · GROUP · INSTANCE(모서리 반경 0 · 회전 0)이고 보이는 자식이 사진 틀 하나뿐이며
 *    그 자식이 (0, 0)에 같은 크기.
 */
export function photoLeafOf(n: SceneNode): SceneNode | null {
  if (rotationOf(n) !== 0 || !zeroRadius(n) || !noOwnPaint(n)) return null;
  if (n.type === 'RECTANGLE') {
    const f = visiblePaints((n as GeometryMixin).fills);
    return f.length === 1 && f[0].type === 'IMAGE' ? n : null;
  }
  if (n.type !== 'FRAME' && n.type !== 'GROUP' && n.type !== 'INSTANCE') return null;
  if (n.type !== 'GROUP' && visiblePaints((n as GeometryMixin).fills).length) return null;
  const kids = ((n as ChildrenMixin).children as readonly SceneNode[]).filter((c) => c.visible !== false);
  if (kids.length !== 1) return null;
  const c = kids[0];
  const off = relPos(c, n);
  if (!sameSize(off.x, 0) || !sameSize(off.y, 0) || !sameSize(c.width, n.width) || !sameSize(c.height, n.height)) return null;
  return photoLeafOf(c);
}

/** 레이어 상자를 루트 기준으로 옮겨 내용 자르기가 켜진 조상(루트 포함, 루트 바깥은 보지 않음)과 겹친 부분. 비면 null. */
export function visibleBox(n: SceneNode, root: SceneNode): Box | null {
  const p = relPos(n, root);
  let b: Box = { x0: p.x, y0: p.y, x1: p.x + n.width, y1: p.y + n.height };
  let cur: BaseNode | null = n.parent;
  while (cur) {
    const a = cur as SceneNode;
    if ((a as { clipsContent?: unknown }).clipsContent === true) {
      const q = relPos(a, root);
      b = { x0: Math.max(b.x0, q.x), y0: Math.max(b.y0, q.y), x1: Math.min(b.x1, q.x + a.width), y1: Math.min(b.y1, q.y + a.height) };
    }
    if (a === root) break;
    cur = cur.parent;
  }
  return b.x1 - b.x0 > 1e-6 && b.y1 - b.y0 > 1e-6 ? b : null;
}

const imagePaintOf = (n: SceneNode): ImagePaint | null => {
  const f = visiblePaints((n as GeometryMixin).fills);
  return f.length === 1 && f[0].type === 'IMAGE' ? (f[0] as ImagePaint) : null;
};

/**
 * 사진 잎 채움의 노드(0–1) → 그림(0–1) 행렬. CROP은 `imageTransform` 그대로, FILL은 그림 크기로 계산한 "덮기"
 * (배율 = max(폭 / 그림 폭, 높이 / 그림 높이), 가운데). 그 밖(FIT · TILE · 회전 있음 · 크기 모름)은 null.
 */
export function imageMatrix(paint: ImagePaint, w: number, h: number, img: Size2 | null): Affine | null {
  const rot = (paint as { rotation?: unknown }).rotation;
  if (typeof rot === 'number' && rot !== 0) return null;
  if (paint.scaleMode === 'CROP') {
    const m = paint.imageTransform;
    return m ? [[m[0][0], m[0][1], m[0][2]], [m[1][0], m[1][1], m[1][2]]] : [[1, 0, 0], [0, 1, 0]];
  }
  if (paint.scaleMode !== 'FILL' || !img || !(img.width > 0) || !(img.height > 0) || !(w > 0) || !(h > 0)) return null;
  const s = Math.max(w / img.width, h / img.height);
  const sw = img.width * s;
  const sh = img.height * s;
  return [[w / sw, 0, (sw - w) / (2 * sw)], [0, h / sh, (sh - h) / (2 * sh)]];
}

/** 노드 단위로 (dx, dy)만큼 민 뒤 `m`을 거친 행렬 — m ∘ (u ↦ u + d). */
export function shiftMatrix(m: Affine, dx: number, dy: number): Affine {
  return [
    [m[0][0], m[0][1], m[0][0] * dx + m[0][1] * dy + m[0][2]],
    [m[1][0], m[1][1], m[1][0] * dx + m[1][1] * dy + m[1][2]],
  ];
}

/** 보이는 영역 네 모서리(루트 기준)가 그 잎에서 가리키는 그림 자리(0–1). */
export function cornerImagePoints(box: Box, leafPos: { x: number; y: number }, w: number, h: number, m: Affine): [number, number][] {
  const pts: [number, number][] = [[box.x0, box.y0], [box.x1, box.y0], [box.x0, box.y1], [box.x1, box.y1]];
  return pts.map(([x, y]) => {
    const u = (x - leafPos.x) / w;
    const v = (y - leafPos.y) / h;
    return [m[0][0] * u + m[0][1] * v + m[0][2], m[1][0] * u + m[1][1] * v + m[1][2]];
  });
}

const same2 = (a: number, b: number) => Math.abs(Math.round(a * 100) - Math.round(b * 100)) < 1;
const same4 = (a: number, b: number) => Math.abs(Math.round(a * 10000) - Math.round(b * 10000)) < 1;
const sameBox = (a: Box | null, b: Box | null): boolean =>
  !!a && !!b && same2(a.x0, b.x0) && same2(a.y0, b.y0) && same2(a.x1, b.x1) && same2(a.y1, b.y1);

/** 그림 크기 기억(해시 → 크기) — `keepLookAsync`가 채우고 검사(`memberFitIssue`)가 읽는다. 해시의 그림 크기는 바뀌지 않는다. */
const IMAGE_SIZES = new Map<string, Size2>();

/**
 * 짝 사진 틀(멤버 L ↔ 인스턴스 L′, 크기 같음)의 보이는 그림이 같은가(§4.7 8번 ③). 조건 ㉠(보이는 영역 같음)과
 * 네 모서리의 그림 자리가 소수 넷째 자리까지 같으면 true.
 */
function photoFrameSame(a: SceneNode, member: SceneNode, b: SceneNode, instRoot: SceneNode, sizeOf: (h: string) => Size2 | null): boolean {
  const la = photoLeafOf(a);
  const lb = photoLeafOf(b);
  if (!la || !lb) return false;
  const va = visibleBox(a, member);
  const vb = visibleBox(b, instRoot);
  if (!sameBox(va, vb)) return false;
  const pa = imagePaintOf(la);
  const pb = imagePaintOf(lb);
  if (!pa || !pb) return false;
  const ma = imageMatrix(pa, la.width, la.height, pa.imageHash ? sizeOf(pa.imageHash) : null);
  const mb = imageMatrix(pb, lb.width, lb.height, pb.imageHash ? sizeOf(pb.imageHash) : null);
  if (!ma || !mb) return false;
  const ca = cornerImagePoints(va as Box, relPos(la, member), la.width, la.height, ma);
  const cb = cornerImagePoints(vb as Box, relPos(lb, instRoot), lb.width, lb.height, mb);
  return ca.every((p, i) => same4(p[0], cb[i][0]) && same4(p[1], cb[i][1]));
}

/** 그려진 범위(`absoluteRenderBounds`)를 루트 좌표계로 옮긴 상자. 없으면(빈 글자 · 목) null. */
function renderBox(n: SceneNode, root: SceneNode): Box | null {
  const rb = (n as { absoluteRenderBounds?: Rect | null }).absoluteRenderBounds;
  if (!rb || typeof rb.x !== 'number') return null;
  const m = (root as { absoluteTransform?: Transform }).absoluteTransform;
  let ox = 0;
  let oy = 0;
  if (Array.isArray(m) && Array.isArray(m[0]) && Array.isArray(m[1])) { ox = m[0][2]; oy = m[1][2]; }
  return { x0: rb.x - ox, y0: rb.y - oy, x1: rb.x - ox + rb.width, y1: rb.y - oy + rb.height };
}

/** `keepLookAsync`가 쓰는 것. */
export interface KeepLookDeps {
  /** 그림 크기(`figma.getImageByHash(h)?.getSizeAsync()`). 못 읽으면 null. */
  imageSize: (hash: string) => Promise<Size2 | null>;
}

/**
 * 덮어쓴 값 옮기기(`copyOverridesAsync`) 뒤에 부른다(§4.7 "인스턴스 자리" 8번 "화면을 지키는 옮기기").
 * 멤버와 인스턴스를 같은 경로끼리 맞춰(보이는 레이어만, 감싼 도형이면 `prefix` 앞붙이):
 * ① 둘 다 사진 틀 · 크기 같음 · 루트 기준 자리만 다름 · 조건 ㉠ ㉡ ㉢ → 인스턴스 사진 잎에 CROP 채움(그 아래로는 내려가지 않음)
 * ② 둘 다 TEXT · 글자 같음 · 자리나 크기 다름 → 인스턴스 글자에 `textAutoResize = 'WIDTH_AND_HEIGHT'`
 * 조건이 안 맞으면 옮기지 않는다(검사가 가른다). 넣기가 실패한 레이어 이름 목록을 돌려준다(그림 크기를 못 읽음 포함).
 */
export async function keepLookAsync(member: SceneNode, inst: InstanceNode, prefix: string, deps: KeepLookDeps): Promise<string[]> {
  const failed: string[] = [];
  const fail = (what: string): void => { if (!failed.includes(what)) failed.push(what); };
  // 검사(replaceMember)가 하는 resize를 먼저 — 안쪽 자리는 크기에 따라 정해진다.
  try {
    if (!sameSize(inst.width, member.width) || !sameSize(inst.height, member.height)) inst.resize(member.width, member.height);
  } catch { /* 검사가 가른다 */ }
  const instRoot = prefix ? nodeAtPath(inst, prefix) : inst;
  if (!instRoot) return failed;
  const sizeOf = async (h: string): Promise<Size2 | null> => {
    const hit = IMAGE_SIZES.get(h);
    if (hit) return hit;
    let sz: Size2 | null = null;
    try { sz = await deps.imageSize(h); } catch { sz = null; }
    if (sz && sz.width > 0 && sz.height > 0) IMAGE_SIZES.set(h, { width: sz.width, height: sz.height });
    return sz;
  };
  const visit = async (a: SceneNode, path: string): Promise<void> => {
    if (a.removed) return;
    if (path !== '' && a.visible === false) return;
    if (path !== '') {
      const b = nodeAtPath(inst, joinPath(prefix, path));
      if (!b || b.removed) return;
      const pa = relPos(a, member);
      const pb = relPos(b, instRoot);
      const moved = !sameSize(pa.x, pb.x) || !sameSize(pa.y, pb.y);
      const resized = !sameSize(a.width, b.width) || !sameSize(a.height, b.height);
      if (a.type === 'TEXT' && b.type === 'TEXT') {
        if ((moved || resized) && (a as TextNode).characters === (b as TextNode).characters) {
          try { (b as TextNode).textAutoResize = 'WIDTH_AND_HEIGHT'; } catch { fail(b.name); }
        }
        return;
      }
      if (moved && !resized) {
        const la = photoLeafOf(a);
        const lb = photoLeafOf(b);
        if (la && lb) {
          await putCrop(a, b, la, lb, pa, pb);
          return; // 사진 틀 아래로는 내려가지 않는다
        }
      }
    }
    if (!('children' in a)) return;
    const kids = a.children as readonly SceneNode[];
    for (let i = 0; i < kids.length; i++) await visit(kids[i], path ? `${path}/${i}` : String(i));
  };
  const putCrop = async (a: SceneNode, b: SceneNode, la: SceneNode, lb: SceneNode, pa: { x: number; y: number }, pb: { x: number; y: number }): Promise<void> => {
    const va = visibleBox(a, member);
    const vb = visibleBox(b, instRoot);
    if (!sameBox(va, vb)) return; // ㉠
    const paint = imagePaintOf(la);
    if (!paint || (paint.scaleMode !== 'FILL' && paint.scaleMode !== 'CROP')) return; // ㉡
    const rot = (paint as { rotation?: unknown }).rotation;
    if (typeof rot === 'number' && rot !== 0) return; // ㉡
    let img: Size2 | null = null;
    if (paint.scaleMode === 'FILL') {
      img = paint.imageHash ? await sizeOf(paint.imageHash) : null;
      if (!img) { fail(lb.name); return; } // 그림 크기를 못 읽음
    }
    const m = imageMatrix(paint, la.width, la.height, img);
    if (!m) return;
    // Δ = 멤버 자리 − 인스턴스 자리. 인스턴스 잎의 u는 멤버 잎의 u − Δ/크기를 보인다.
    const next = shiftMatrix(m, -(pa.x - pb.x) / la.width, -(pa.y - pb.y) / la.height);
    const corners = cornerImagePoints(vb as Box, relPos(lb, instRoot), lb.width, lb.height, next);
    if (!corners.every(([x, y]) => x >= -1e-6 && x <= 1 + 1e-6 && y >= -1e-6 && y <= 1 + 1e-6)) return; // ㉢
    const crop: ImagePaint = {
      type: 'IMAGE',
      scaleMode: 'CROP',
      imageHash: paint.imageHash,
      imageTransform: next as Transform,
      ...(paint.opacity !== undefined ? { opacity: paint.opacity } : {}),
      ...(paint.blendMode !== undefined ? { blendMode: paint.blendMode } : {}),
      ...(paint.filters !== undefined ? { filters: paint.filters } : {}),
    };
    try {
      const cur = Array.isArray((lb as GeometryMixin).fills) ? ((lb as GeometryMixin).fills as readonly Paint[]) : [];
      let put = false;
      const fills = cur.map((p) => {
        if (!put && p.type === 'IMAGE' && p.visible !== false) { put = true; return crop; }
        return p;
      });
      (lb as GeometryMixin).fills = put ? fills : [crop];
    } catch { fail(lb.name); }
  };
  await visit(member, '');
  return failed;
}

/**
 * 인스턴스가 멤버의 사진 · 자리 · 크기를 지키는가(§4.7 8번 검사). 다르면 그 까닭(진단용), 같으면 null.
 * - 인스턴스 자신의 크기 = 멤버 크기
 * - 멤버 안 사진 채움이 있는 모든 레이어(자신 포함)마다, 인스턴스의 같은 경로(`prefix` 앞붙이) 레이어의
 *   이미지 해시와 크기가 같다(숨긴 레이어도, 인스턴스 안도)
 * - (layout 켬) 멤버 루트가 아닌 **보이는** 레이어마다 같은 경로 레이어가 있고 종류가 같으며, 루트 기준 자리와
 *   크기가 같다. 날 벡터 · 아이콘 프레임 ↔ 아이콘 인스턴스 짝은 그 레이어만 보고 안으로 내려가지 않는다.
 *   감싼 도형(앞붙이 '0')은 감싼 자식의 크기 = 멤버 크기, 회전 0이면 자리 (0, 0).
 * 같은 레이어에서는 사진 검사가 먼저다.
 */
export function memberFitIssue(inst: SceneNode, member: SceneNode, prefix: string, opts: FitOpts = {}): string | null {
  if (!sameSize(inst.width, member.width) || !sameSize(inst.height, member.height)) {
    return t('component.fit.size', { w: inst.width, h: inst.height, mw: member.width, mh: member.height });
  }
  const layoutOn = opts.layout !== false;
  const instRoot = prefix ? nodeAtPath(inst, prefix) : inst;
  const sizeOf = opts.imageSize ?? ((h: string) => IMAGE_SIZES.get(h) ?? null);
  let issue: string | null = null;
  const layoutIssue = (name: string) => { issue = t('component.fit.layout', { name }); };
  const visit = (n: SceneNode, path: string, layout: boolean): void => {
    if (issue) return;
    const h = imageHashOf(n);
    if (h !== undefined) {
      const at = joinPath(prefix, path);
      const hit = nodeAtPath(inst, at);
      if (!hit) { issue = t('component.fit.noPhoto', { path: at || t('component.fit.self') }); return; }
      if (imageHashOf(hit) !== h) { issue = t('component.fit.photoDiff', { name: n.name }); return; }
      if (!sameSize(hit.width, n.width) || !sameSize(hit.height, n.height)) {
        issue = t('component.fit.photoSize', { w: hit.width, h: hit.height, mw: n.width, mh: n.height, name: n.name });
        return;
      }
    }
    // 숨긴 레이어와 그 아래는 자리 · 크기를 보지 않는다(사진 검사는 그대로).
    let down = layout && (path === '' || n.visible !== false);
    // 감싼 도형(루트 ↔ 감싼 자식 '0'): resize를 따라오지 않으면(제약 없음) 사진이 아닌 도형도 어긋난다.
    if (down && path === '' && prefix) {
      if (!instRoot) { layoutIssue(n.name); return; }
      const off = relPos(instRoot, inst);
      const posBad = rotationOf(instRoot) === 0 && (!sameSize(off.x, 0) || !sameSize(off.y, 0));
      if (posBad || !sameSize(instRoot.width, n.width) || !sameSize(instRoot.height, n.height)) { layoutIssue(n.name); return; }
    }
    if (down && path !== '') {
      const hit = nodeAtPath(inst, joinPath(prefix, path));
      if (!hit) { layoutIssue(n.name); return; }
      const iconPair = hit.type === 'INSTANCE' && n.type !== 'INSTANCE' && (VECTOR_TYPES.has(n.type) || !!opts.isIcon?.(n));
      if (!iconPair && hit.type !== n.type) { layoutIssue(n.name); return; }
      const a = relPos(n, member);
      const b = instRoot ? relPos(hit, instRoot) : { x: NaN, y: NaN };
      if (!sameSize(a.x, b.x) || !sameSize(a.y, b.y) || !sameSize(hit.width, n.width) || !sameSize(hit.height, n.height)) {
        // 화면을 지키는 옮기기(§4.7 8번 ③) — 상자 대신 보이는 모습을 비교한다.
        const sameDims = sameSize(hit.width, n.width) && sameSize(hit.height, n.height);
        if (instRoot && sameDims && photoFrameSame(n, member, hit, instRoot, sizeOf)) {
          down = false; // 사진 틀 아래로는 자리 · 크기 비교를 내려가지 않는다(사진 검사는 내려간다)
        } else if (instRoot && n.type === 'TEXT' && hit.type === 'TEXT' && renderBox(n, member) && renderBox(hit, instRoot)) {
          if (!sameBox(renderBox(n, member), renderBox(hit, instRoot))) { layoutIssue(n.name); return; }
        } else {
          layoutIssue(n.name);
          return;
        }
      }
      // 아이콘 인스턴스 안 트리는 멤버와 다르다 — 자리 · 크기 비교는 내려가지 않는다(사진은 내려간다).
      if (iconPair) down = false;
    }
    // 인스턴스 안도 본다(§4.7 8번 "인스턴스 안도 본다", QA #5 불합격 1) — 안쪽 인스턴스의 사진이
    // 바뀌어도 통과하던 빈틈. 인스턴스의 자식 순서는 메인 트리와 같아 같은 인덱스 경로로 찾는다.
    if (!('children' in n)) return;
    (n.children as readonly SceneNode[]).forEach((c, i) => visit(c, path ? `${path}/${i}` : String(i), down));
  };
  visit(member, '', layoutOn);
  return issue;
}

export type MemberResult = { result: 'replaced' | 'mismatch' | 'placeFailed'; why?: string };

/**
 * [등록] 속성 접힘의 마스터가 아닌 멤버를 인스턴스로 바꾼다(§4.7 3·8번). 멤버는 컴포넌트로 바꾸지 않는다.
 * 1. `make()`로 인스턴스(속성 값·사진까지)를 만들고 멤버 크기로 resize
 * 2. 검사(`memberFitIssue`) — 다르면 인스턴스를 지우고 멤버를 그대로 둔다('mismatch')
 * 3. 멤버 자리에 넣고(표지 없이 — 멤버가 아직 자리에 있다) 멤버를 지운다. 못 넣으면 멤버 그대로('placeFailed')
 * 어느 실패든 페이지 맨 위에 인스턴스를 남기지 않는다.
 */
export function replaceMember(member: SceneNode, make: () => InstanceNode, prefix: string, opts: FitOpts = {}): MemberResult {
  let inst: InstanceNode | null = null;
  try {
    inst = make();
  } catch (e) {
    return { result: 'placeFailed', why: t('component.fail.instanceMake', { error: e instanceof Error ? e.message : String(e) }) };
  }
  try {
    if (!sameSize(inst.width, member.width) || !sameSize(inst.height, member.height)) {
      try { inst.resize(member.width, member.height); } catch { /* 검사가 가른다 */ }
    }
    const why = memberFitIssue(inst, member, prefix, opts);
    if (why) {
      try { inst.remove(); } catch { /* 이미 사라짐 */ }
      return { result: 'mismatch', why };
    }
  } catch (e) {
    try { inst.remove(); } catch { /* 이미 사라짐 */ }
    return { result: 'mismatch', why: e instanceof Error ? e.message : String(e) };
  }
  const o = captureOrigin(member, { anchor: false });
  if (!placeAtOrigin(inst, o)) {
    releaseOrigin(o);
    return { result: 'placeFailed', why: t('component.fail.instancePlace') };
  }
  try { member.remove(); } catch { /* 이미 사라짐 */ }
  return { result: 'replaced' };
}

/**
 * `replaceMember`의 비동기판(§4.7 "재사용" 5번) — 값 넣기 안에서 글꼴 불러오기 · `getMainComponentAsync`를
 * 기다려야 하므로 `make`가 Promise를 돌려준다. 순서와 실패 처리는 같다(resize → 사진 · 자리 · 크기 검사 → 넣기 → 지움).
 */
export async function replaceMemberAsync(member: SceneNode, make: () => Promise<InstanceNode>, prefix: string, opts: FitOpts = {}): Promise<MemberResult> {
  let inst: InstanceNode;
  try {
    inst = await make();
  } catch (e) {
    return { result: 'placeFailed', why: t('component.fail.instanceMake', { error: e instanceof Error ? e.message : String(e) }) };
  }
  return replaceMember(member, () => inst, prefix, opts);
}

/** 그 레이어를 품은 가장 가까운 **조상** 인스턴스(자기 자신은 뺀다). */
function ancestorInstance(n: SceneNode): InstanceNode | null {
  let p: BaseNode | null = n.parent;
  while (p) {
    if ((p as SceneNode).type === 'INSTANCE') return p as InstanceNode;
    p = p.parent;
  }
  return null;
}


export interface CopyDeps {
  mainOf: (inst: InstanceNode) => Promise<ComponentNode | null>;
  loadFont: (f: FontName) => Promise<void>;
  /** A의 날 벡터 그림에 맞는 아이콘 컴포넌트(등록부 — 없으면 만든다). 못 구하면 null. */
  iconFor: (vector: SceneNode) => ComponentNode | null;
  /** 아이콘 프레임인가(§4.7 "묶기" 3번) — 날 벡터처럼 아이콘 인스턴스와 짝짓는다. */
  isIcon?: (node: SceneNode) => boolean;
}

/**
 * 재사용 인스턴스에 멤버의 덮어쓴 값을 옮긴다(§4.7 "재사용" 5번, 재귀). 멤버(A)와 인스턴스(B)를 같은 경로끼리
 * 맞춘다(루트 포함, 감싼 도형이면 `prefix` 앞붙이). 짝마다:
 * - 보이기가 다르면 넣는다.
 * - TEXT: 글자가 다르면 넣는다 — 넣기 전에 B 쪽 텍스트의 지금 글꼴을 모두 불러온다.
 * - INSTANCE: B의 메인이 A의 메인과 다르면 바꾸고, **언제나** 그 안으로 내려간다.
 * - 날 벡터 ↔ 아이콘 인스턴스: A 그림의 아이콘으로 B를 바꾼다.
 * - 사진: A의 이미지 해시가 B와 다르면 채움 전체를 옮긴다.
 * 넣는 곳: 레이어가 속성에 묶여 있으면(`componentPropertyReferences`) 가장 가까운 조상 인스턴스의 속성에,
 * 아니면 직접. 돌려주는 값: 못 넣은 것(레이어 이름) 목록.
 */
export async function copyOverridesAsync(member: SceneNode, inst: InstanceNode, prefix: string, deps: CopyDeps): Promise<string[]> {
  const failed: string[] = [];
  const fail = (what: string): void => { if (!failed.includes(what)) failed.push(what); };
  const refsOf = (n: SceneNode): { [k: string]: string } => {
    try { return (n.componentPropertyReferences ?? {}) as { [k: string]: string }; } catch { return {}; }
  };
  /** 묶였으면 조상 인스턴스의 속성에, 아니면 직접. */
  const put = (b: SceneNode, field: 'visible' | 'characters' | 'mainComponent', value: string | boolean, direct: () => void): void => {
    const ref = refsOf(b)[field];
    const owner = ref ? ancestorInstance(b) : null;
    if (ref && owner) owner.setProperties({ [ref]: value });
    else direct();
  };
  const loadFonts = async (n: TextNode): Promise<void> => {
    const len = n.characters.length;
    const fonts = len ? n.getRangeAllFontNames(0, len) : typeof n.fontName === 'symbol' ? [] : [n.fontName as FontName];
    for (const f of fonts) await deps.loadFont(f);
  };
  const swapTo = async (b: InstanceNode, comp: ComponentNode): Promise<void> => {
    const cur = await deps.mainOf(b);
    if (cur && cur.id === comp.id) return;
    put(b, 'mainComponent', comp.id, () => b.swapComponent(comp));
  };
  const visit = async (a: SceneNode, b: SceneNode, root: boolean): Promise<void> => {
    if (a.removed || b.removed) return;
    // 날 벡터 ↔ 아이콘 인스턴스(1회차 접힘의 아이콘 자리 교체)
    if (!root && (VECTOR_TYPES.has(a.type) || deps.isIcon?.(a)) && b.type === 'INSTANCE') {
      try {
        if (a.visible !== b.visible) put(b, 'visible', a.visible, () => { b.visible = a.visible; });
        const icon = deps.iconFor(a);
        if (!icon) { fail(b.name); return; }
        await swapTo(b, icon);
      } catch { fail(b.name); }
      return;
    }
    // 루트(멤버 ↔ 재사용 인스턴스 자신)는 타입이 다르다(FRAME ↔ INSTANCE). 그 밖의 다른 짝은 짝 맞추기 검사가 막는다.
    if (!root && a.type !== b.type) return;
    try {
      if (a.visible !== b.visible) put(b, 'visible', a.visible, () => { b.visible = a.visible; });
    } catch { fail(b.name); }
    if (a.type === 'TEXT' && b.type === 'TEXT') {
      try {
        if (a.characters !== b.characters) {
          await loadFonts(b);
          const text = a.characters;
          put(b, 'characters', text, () => { b.characters = text; });
        }
      } catch { fail(b.name); }
      return;
    }
    if (!root && a.type === 'INSTANCE' && b.type === 'INSTANCE') {
      try {
        const main = await deps.mainOf(a);
        if (main) await swapTo(b, main);
      } catch { fail(b.name); }
    }
    // 사진 — §4.7 "인스턴스 자리" 8번처럼 채움 전체를 옮긴다
    const ha = imageHashOf(a);
    if (ha !== undefined && imageHashOf(b) !== ha) {
      try { (b as GeometryMixin).fills = (a as GeometryMixin).fills; } catch { fail(b.name); }
    }
    if (!('children' in a) || !('children' in b)) return;
    const ak = (a as ChildrenMixin).children as readonly SceneNode[];
    const bk = (b as ChildrenMixin).children as readonly SceneNode[]; // 바꾼 뒤의 자식을 다시 읽는다
    const n = Math.min(ak.length, bk.length);
    for (let i = 0; i < n; i++) await visit(ak[i], bk[i], false);
  };
  const bRoot = prefix ? nodeAtPath(inst, prefix) : inst;
  if (bRoot) await visit(member, bRoot, bRoot === inst);
  return failed;
}

/**
 * 컴포넌트 속성 정의에서 속성 이름 → 속성 id(정의 키). 피그마는 TEXT·INSTANCE_SWAP·BOOLEAN 속성의
 * 키를 "이름#id"(예: `Title#12:3`)로 주고, **정의 값에는 이름이 없다**(plugin-api ComponentPropertyDefinitions).
 * 그래서 이름은 키 끝의 "#…"를 떼어 얻는다. VARIANT 속성은 키에 "#"가 없으므로 키가 곧 이름이다(§4.7 6번).
 */
export function propIdsByName(container: { componentPropertyDefinitions?: Record<string, unknown> | null }): Map<string, string> {
  const map = new Map<string, string>();
  let defs: Record<string, unknown> | null | undefined;
  try { defs = container.componentPropertyDefinitions; } catch { return map; } // 세트 안 변형 등에서 읽기가 던질 수 있다
  if (!defs) return map;
  for (const key of Object.keys(defs)) {
    const name = key.replace(/#[^#]*$/, '');
    if (name && !map.has(name)) map.set(name, key);
  }
  return map;
}

/**
 * 속성 접힘 멤버 인스턴스에 속성 값을 넣는다(§4.7 6번). 못 넣은 속성의 **이름** 목록을 돌려준다
 * — 그 속성은 마스터 값 그대로다. 인스턴스는 지우지 않는다(2026-11-04 결정).
 * 한 번에 넣어 보고, 피그마가 거절하면 속성마다 따로 넣어 거절된 것만 골라낸다.
 * 이름이 `ids`에 없는 속성(노출 실패)도 못 넣은 것으로 센다.
 */
export function applyInstancePropValues(
  inst: InstanceNode,
  ids: Map<string, string>,
  values: Record<string, string | boolean>,
): string[] {
  const failed: string[] = [];
  const payload: { [key: string]: string | boolean } = {};
  const nameOf = new Map<string, string>();
  for (const [name, val] of Object.entries(values)) {
    const id = ids.get(name);
    if (id == null) { failed.push(name); continue; }
    payload[id] = val;
    nameOf.set(id, name);
  }
  if (!Object.keys(payload).length) return failed;
  try {
    inst.setProperties(payload);
    return failed;
  } catch {
    // 하나가 거절되면 전체가 거절된다 — 속성마다 따로
  }
  for (const [id, val] of Object.entries(payload)) {
    try { inst.setProperties({ [id]: val }); } catch { failed.push(nameOf.get(id) ?? id); }
  }
  return failed;
}

/**
 * 사진은 컴포넌트 속성이 될 수 없지만 인스턴스의 `fills`는 오버라이드된다 —
 * 멤버 원본의 fill을 같은 경로에 이식해 접힌 뒤에도 각자 사진을 지킨다.
 * (닮은 프레임 컴포넌트화가 쓰는 방식과 같다.)
 */
export function transplantImageFills(
  inst: SceneNode,
  images: Record<string, readonly Paint[]>,
): { applied: number; failures: string[] } {
  let applied = 0;
  const failures: string[] = [];
  for (const [path, paints] of Object.entries(images)) {
    const dst = nodeAtPath(inst, path);
    if (!dst || !('fills' in dst)) {
      failures.push(t('component.fail.photoNoSlot', { path }));
      continue;
    }
    try {
      (dst as GeometryMixin).fills = paints;
      applied++;
    } catch (e) {
      failures.push(t('component.fail.photo', { path, error: e instanceof Error ? e.message : String(e) }));
    }
  }
  return { applied, failures };
}

/* ---------- 값 지키기 — [등록] 맨 끝 속성 노출 (§4.7 9번, QA #3 실기 ③ 불합격 7) ----------
   세트의 레이어를 한 속성에 묶으면 피그마는 모든 변형을 그 속성의 기본값(대표 변형 값)으로 바꾼다.
   노출 전에 만들어 둔 인스턴스는 덮어쓴 값이 없어 기본값을 따라간다. 노출 전에 인스턴스마다
   **자기 레이어**(안쪽 인스턴스 속은 그 인스턴스 몫)의 값을 적어 두고, 노출 뒤 묶인 속성에 다시 넣는다. */

/** 인스턴스 자기 레이어 하나의 값 — 글자 · 안쪽 인스턴스의 메인 컴포넌트 id · 보이기. */
export type SlotSnap = { id: string; name: string; text?: string; swap?: string; visible: boolean };
/** 인스턴스 하나의 기록. depth = 안쪽 인스턴스 깊이(바깥부터 되돌린다). place = 결과 줄에 셀 자리 번호(부르는 쪽이 정함). */
export type OverrideSnap = { instId: string; depth: number; place: number; items: SlotSnap[] };

type MainOf = (inst: InstanceNode) => Promise<{ id: string } | null>;

/** 자기 레이어 — 자식을 따라 내려가되 INSTANCE 안으로는 들어가지 않는다(그 인스턴스 자신은 넣는다). */
function ownLayers(root: SceneNode): SceneNode[] {
  const out: SceneNode[] = [];
  const walk = (n: SceneNode): void => {
    if (!('children' in n)) return;
    for (const c of (n as ChildrenMixin).children as readonly SceneNode[]) {
      out.push(c);
      if (c.type !== 'INSTANCE') walk(c);
    }
  };
  walk(root);
  return out;
}

/**
 * `root` 아래(자신 포함)의 모든 인스턴스마다 자기 레이어 값을 적는다 — 속성 노출 **전에** 부른다.
 * 안쪽 인스턴스는 바깥 인스턴스와 따로, 깊이를 붙여 적는다.
 */
export async function snapshotOverrides(root: SceneNode, place: number, mainOf: MainOf): Promise<OverrideSnap[]> {
  const out: OverrideSnap[] = [];
  const visit = async (n: SceneNode, depth: number): Promise<void> => {
    if (n.removed) return;
    if (n.type === 'INSTANCE') {
      const items: SlotSnap[] = [];
      for (const l of ownLayers(n)) {
        try {
          const item: SlotSnap = { id: l.id, name: l.name, visible: l.visible };
          if (l.type === 'TEXT') item.text = l.characters;
          if (l.type === 'INSTANCE') item.swap = (await mainOf(l))?.id;
          items.push(item);
        } catch { /* 읽기 실패 — 지킬 것이 없다 */ }
      }
      out.push({ instId: n.id, depth, place, items });
      depth++;
    }
    if ('children' in n) for (const c of (n as ChildrenMixin).children as readonly SceneNode[]) await visit(c, depth);
  };
  await visit(root, 0);
  return out;
}

/** 속성 키("이름#id")에서 화면에 보일 속성 이름. */
const propNameOf = (key: string): string => key.replace(/#[^#]*$/, '') || key;

/** 값 지키기 기록 대상 자리(§4.7 "인스턴스 자리" 9번) — 자리 인스턴스 · 컴포넌트. `counted`: 이미 " · 속성 값을 못 넣은" 꼬리에 센 자리. */
export interface KeepRoot {
  node: SceneNode;
  name: string;
  counted?: boolean;
}

/**
 * 노출 뒤 되돌리기 실패를 센다(§4.7 "인스턴스 자리" 9번 "한 자리는 한 번만 센다"). 실패 진단은 속성마다 남기고,
 * 꼬리(`propFailed`)에는 자리마다 한 번 — 넣을 때 이미 센 자리(`counted`)는 다시 세지 않는다. 자리는 `keepRoots`
 * 항목 단위로 기억하고 이름으로 거르지 않는다(이름이 같은 다른 자리를 함께 빼거나 빠뜨리지 않게).
 */
export function tallyRestoreFailures(
  roots: KeepRoot[],
  failed: ReadonlyMap<number, readonly string[]>,
  propFailed: string[],
  onProp: (name: string, prop: string) => void,
): void {
  for (const [k, props] of failed) {
    const root = roots[k];
    if (!root) continue;
    for (const prop of props) onProp(root.name, prop);
    if (root.counted) continue;
    root.counted = true;
    propFailed.push(root.name);
  }
}

/**
 * 속성 노출 뒤 기록과 달라진 값을 되돌린다(§4.7 9번). 바깥 인스턴스부터(depth 오름차순) — 바깥의
 * 인스턴스 바꾸기를 먼저 되돌려야 안쪽 인스턴스가 제 메인 컴포넌트로 돌아온다. 노드는 id로 다시 찾는다.
 * 묶인 값은 그 인스턴스의 속성에(한 번에 → 속성마다), 묶이지 않았는데 달라진 글자는 직접 넣는다.
 * 글자를 넣기 전 그 텍스트의 글꼴을 모두 불러오고, 못 불러오면 실패로 센다.
 * 돌려주는 값: 자리(place)마다 못 넣은 속성 이름(안 묶인 글자는 레이어 이름) 목록 — 실패가 있는 자리만.
 */
export async function restoreOverrides(
  snaps: readonly OverrideSnap[],
  getNode: (id: string) => Promise<BaseNode | null>,
  mainOf: MainOf,
  loadFont: (f: FontName) => Promise<void>,
): Promise<Map<number, string[]>> {
  const failedBy = new Map<number, string[]>();
  const fail = (place: number, what: string): void => {
    const list = failedBy.get(place) ?? [];
    if (!list.includes(what)) list.push(what);
    failedBy.set(place, list);
  };
  const loadAll = async (node: TextNode): Promise<void> => {
    const len = node.characters.length;
    const fonts = len ? node.getRangeAllFontNames(0, len) : typeof node.fontName === 'symbol' ? [] : [node.fontName as FontName];
    for (const f of fonts) await loadFont(f);
  };
  const ordered = [...snaps].sort((a, b) => a.depth - b.depth);
  for (const snap of ordered) {
    const inst = (await getNode(snap.instId)) as InstanceNode | null;
    if (!inst || inst.removed || inst.type !== 'INSTANCE') continue; // 복사본으로 떼어졌거나 지워짐
    const payload: { [key: string]: string | boolean } = {};
    const direct: { node: TextNode; text: string }[] = [];
    for (const it of snap.items) {
      const node = (await getNode(it.id)) as SceneNode | null;
      if (!node || node.removed) continue;
      const refs = node.componentPropertyReferences ?? {};
      try {
        if (refs.visible && node.visible !== it.visible) payload[refs.visible] = it.visible;
        if (node.type === 'INSTANCE' && it.swap && refs.mainComponent) {
          const cur = (await mainOf(node))?.id;
          if (cur !== it.swap) payload[refs.mainComponent] = it.swap;
        }
        if (node.type === 'TEXT' && it.text !== undefined && node.characters !== it.text) {
          try { await loadAll(node); } catch { fail(snap.place, refs.characters ? propNameOf(refs.characters) : node.name); continue; }
          if (refs.characters) payload[refs.characters] = it.text;
          else direct.push({ node, text: it.text });
        }
      } catch {
        fail(snap.place, it.name);
      }
    }
    const keys = Object.keys(payload);
    if (keys.length) {
      let ok = false;
      try { inst.setProperties(payload); ok = true; } catch { /* 하나가 거절되면 전체가 거절된다 — 속성마다 */ }
      if (!ok) {
        for (const k of keys) {
          try { inst.setProperties({ [k]: payload[k] }); } catch { fail(snap.place, propNameOf(k)); }
        }
      }
    }
    for (const d of direct) {
      try { d.node.characters = d.text; } catch { fail(snap.place, d.node.name); }
    }
  }
  return failedBy;
}

/** `swapMemberAsync`가 쓰는 [등록] 실행 상태 · 의존(§4.7 "묶기" 2번 · 5번 5단계). */
export interface SwapCtx {
  copy: CopyDeps;
  keepLook: KeepLookDeps;
  fit: FitOpts;
  /** 9번 값 지키기의 기록 대상 · 이번 실행이 만든 인스턴스 id(C-D18 다시 맞추기에서 뺀다). */
  keepRoots: KeepRoot[];
  made: Set<string>;
  failures: string[];
  propFailed: string[];
  fillKept: string[];
  placeFailed: string[];
}

/**
 * 멤버(또는 탭 칸 · Tab Bar 인스턴스가 될 바) 자리를 `comp`의 인스턴스로 바꾼다 — 인스턴스(만든 id 기록) → 9번 기록 → 덮어쓴 값
 * 옮기기 → 화면을 지키는 옮기기 → 넣기 전 검사 → 넣고 멤버를 지움. 걸리면 원본 그대로(꼬리 `fillKept` · `placeFailed`).
 * 세트 ⑤ 나머지 멤버 · 탭 칸 · Tab Bar 인스턴스가 함께 쓴다. 감싼 도형이면 앞붙이(`shapePrefix`).
 */
export async function swapMemberAsync(comp: ComponentNode, node: SceneNode, type: string, ctx: SwapCtx): Promise<MemberResult['result']> {
  const name = node.name;
  const prefix = shapePrefix(comp, type);
  const make = async (): Promise<InstanceNode> => {
    const inst = comp.createInstance();
    ctx.made.add(inst.id);
    try {
      const entry: KeepRoot = { node: inst, name };
      ctx.keepRoots.push(entry);
      const bad = await copyOverridesAsync(node, inst, prefix, ctx.copy);
      // 화면을 지키는 옮기기(§4.7 8번) — 자리만 다른 사진 틀은 자르기로, 폭만 다른 글자는 글자 자동 크기로
      for (const l of await keepLookAsync(node, inst, prefix, ctx.keepLook)) if (!bad.includes(l)) bad.push(l);
      for (const p of bad) ctx.failures.push(t('component.fail.propValue', { name, prop: p }));
      if (bad.length) { ctx.propFailed.push(name); entry.counted = true; }
      return inst;
    } catch (e) {
      try { if (!inst.removed) inst.remove(); } catch { /* 이미 사라짐 */ }
      throw e;
    }
  };
  const before = ctx.propFailed.length;
  const r = await replaceMemberAsync(node, make, prefix, ctx.fit);
  if (r.result === 'replaced') return r.result;
  if (ctx.propFailed.length > before) ctx.propFailed.splice(before); // 원본 그대로 — 따질 속성 값이 없다
  if (r.result === 'mismatch') {
    ctx.fillKept.push(name);
    ctx.failures.push(t('component.fail.fillKept', { name, causePart: t('component.fail.cause', { why: r.why ?? '' }) }));
  } else {
    ctx.placeFailed.push(name);
    ctx.failures.push(t('component.fail.memberKept', { name, causePart: r.why ? t('component.fail.cause', { why: r.why }) : '' }));
  }
  return r.result;
}
