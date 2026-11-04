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
}): IconRegistry {
  const byKey = new Map<string, ComponentNode>();
  let made = 0;
  return {
    get: (vectorKey) => byKey.get(vectorKey) ?? null,
    created: () => made,
    ensure(vectorKey, node, baseName) {
      const hit = byKey.get(vectorKey);
      if (hit) return hit;
      try {
        // 복제본을 **즉시** 페이지로 옮긴다 — 멤버 트리 안에 잠깐이라도 형제로 남으면
        // 자식 수가 변해 다른 슬롯의 인덱스 경로가 어긋난다.
        const clone = node.clone();
        opts.page.appendChild(clone);
        const comp = figma.createComponentFromNode(clone);
        comp.name = opts.uniqueName(baseName);
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
