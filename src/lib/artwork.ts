/* ============================================================
   artwork.ts — 그림(사진·날 벡터) 슬롯을 인스턴스로 담는 figma 적용 조각.
   등록(REGISTER_COMPONENTS)의 **속성 접힘** 경로가 쓴다. 무엇이 다른지 판정하는 쪽은
   순수 계층(components.ts: `inferVaryingImageSlots` · `CompPropPlan.fromVector`).

   왜 나눠 뒀나 — 이 경로는 멤버를 지우고 마스터 하나만 남긴다. 그림을 못 옮기면 사진·아이콘이
   조용히 마스터 것으로 통일된다(되돌리기 전엔 알아채기 어렵다). 지우기 전에 옮겨지는지
   목 테스트로 지킨다(figma-lib 배럴로 내보낸다).
   ============================================================ */

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
        opts.onFailure(`아이콘 컴포넌트 실패(${baseName}): ${e instanceof Error ? e.message : String(e)}`);
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
 */
export function swapVectorSlots(master: SceneNode, slots: readonly VectorSlot[]): string[] {
  const failures: string[] = [];
  for (const s of slots) {
    const target = nodeAtPath(master, s.layerPath);
    const parent = target?.parent;
    if (!target || !s.icon || !parent || !('children' in parent)) {
      failures.push(`아이콘 자리 교체 실패(${s.layerName})`);
      continue;
    }
    try {
      const kids = parent as BaseNode & ChildrenMixin;
      const idx = kids.children.indexOf(target);
      const inst = s.icon.createInstance();
      inst.name = target.name;
      try { inst.resize(target.width, target.height); } catch { /* 제약상 불가 시 아이콘 크기 그대로 */ }
      kids.insertChild(Math.max(0, idx), inst);
      if (!('layoutMode' in parent) || (parent as FrameNode).layoutMode === 'NONE') {
        inst.x = target.x;
        inst.y = target.y;
      }
      target.remove();
    } catch (e) {
      failures.push(`아이콘 자리 교체 실패(${s.layerName}): ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return failures;
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
      failures.push(`사진 이식 실패(${path}) — 자리를 찾지 못했습니다`);
      continue;
    }
    try {
      (dst as GeometryMixin).fills = paints;
      applied++;
    } catch (e) {
      failures.push(`사진 이식 실패(${path}): ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return { applied, failures };
}
