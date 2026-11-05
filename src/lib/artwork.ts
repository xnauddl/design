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
        made++;
        return comp;
      } catch (e) {
        opts.onFailure(t('component.fail.iconComponent', { name: baseName, error: e instanceof Error ? e.message : String(e) }));
        return null;
      }
    },
  };
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

/**
 * 인스턴스가 멤버의 사진·크기를 지키는가(§4.7 8번 검사). 다르면 그 까닭(진단용), 같으면 null.
 * - 인스턴스 자신의 크기 = 멤버 크기
 * - 멤버 안 사진 채움이 있는 모든 레이어(자신 포함)마다, 인스턴스의 같은 경로(`prefix` 앞붙이) 레이어의
 *   이미지 해시와 크기가 같다
 */
export function memberFitIssue(inst: SceneNode, member: SceneNode, prefix: string): string | null {
  if (!sameSize(inst.width, member.width) || !sameSize(inst.height, member.height)) {
    return t('component.fit.size', { w: inst.width, h: inst.height, mw: member.width, mh: member.height });
  }
  let issue: string | null = null;
  const visit = (n: SceneNode, path: string): void => {
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
    if (n.type === 'INSTANCE' || !('children' in n)) return; // 인스턴스 안은 그 컴포넌트 소관
    (n.children as readonly SceneNode[]).forEach((c, i) => visit(c, path ? `${path}/${i}` : String(i)));
  };
  visit(member, '');
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
export function replaceMember(member: SceneNode, make: () => InstanceNode, prefix: string): MemberResult {
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
    const why = memberFitIssue(inst, member, prefix);
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
 * 기다려야 하므로 `make`가 Promise를 돌려준다. 순서와 실패 처리는 같다(resize → 사진·크기 검사 → 넣기 → 지움).
 */
export async function replaceMemberAsync(member: SceneNode, make: () => Promise<InstanceNode>, prefix: string): Promise<MemberResult> {
  let inst: InstanceNode;
  try {
    inst = await make();
  } catch (e) {
    return { result: 'placeFailed', why: t('component.fail.instanceMake', { error: e instanceof Error ? e.message : String(e) }) };
  }
  return replaceMember(member, () => inst, prefix);
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

const VECTOR_TYPES = new Set(['VECTOR', 'BOOLEAN_OPERATION', 'STAR', 'POLYGON', 'LINE']);

export interface CopyDeps {
  mainOf: (inst: InstanceNode) => Promise<ComponentNode | null>;
  loadFont: (f: FontName) => Promise<void>;
  /** A의 날 벡터 그림에 맞는 아이콘 컴포넌트(등록부 — 없으면 만든다). 못 구하면 null. */
  iconFor: (vector: SceneNode) => ComponentNode | null;
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
    if (!root && VECTOR_TYPES.has(a.type) && b.type === 'INSTANCE') {
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
