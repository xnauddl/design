/* ============================================================
   similarApply.ts — 닮은 프레임 컴포넌트화의 figma 적용 (figma 의존 → dist/figma-lib로 목 테스트)
   순수 정렬·계획(similar.ts) 위에서 노드 트리 구성·컴포넌트 생성·속성 노출·인스턴스 교체.
   code.ts 핸들러는 이 함수를 호출만 한다(createTokens·bindSelection과 같은 패턴).
   ============================================================ */
import {
  alignFrames,
  planContentProperties,
  flattenFrame,
  overridesForFrame,
  type AlignResult,
  type FrameNode as SimNode,
} from './similar';

/** figma 노드 → similar 입력 트리(콘텐츠 신호 포함). INSTANCE key는 async 조회. */
async function buildSimTree(node: SceneNode): Promise<SimNode> {
  const out: SimNode = { id: node.id, name: node.name, type: node.type };
  if (node.type === 'TEXT') out.characters = typeof node.characters === 'string' ? node.characters : '';
  if (node.type === 'INSTANCE') {
    const mc = await node.getMainComponentAsync();
    if (mc) out.componentKey = mc.key || mc.id;
  }
  const fills = (node as { fills?: unknown }).fills;
  if (Array.isArray(fills)) {
    const img = fills.find((p) => (p as Paint).type === 'IMAGE' && (p as Paint).visible !== false) as ImagePaint | undefined;
    if (img) {
      out.hasImageFill = true;
      out.imageHash = img.imageHash ?? undefined; // 변동 감지용(인스턴스 fill 오버라이드)
    }
  }
  if ('children' in node) {
    const kids: SimNode[] = [];
    for (const c of (node as SceneNode & ChildrenMixin).children as readonly SceneNode[]) kids.push(await buildSimTree(c));
    out.children = kids;
  }
  return out;
}

/** flattenFrame과 동일한 이름-경로 규칙으로 figma 자식 노드를 경로별로 매핑(속성 연결용). */
function figmaPathMap(root: SceneNode): Map<string, SceneNode> {
  const map = new Map<string, SceneNode>();
  const visit = (node: SceneNode, prefix: string): void => {
    if (!('children' in node)) return;
    const seen = new Map<string, number>();
    for (const c of (node as SceneNode & ChildrenMixin).children as readonly SceneNode[]) {
      const n = (seen.get(c.name) ?? 0) + 1;
      seen.set(c.name, n);
      const seg = n === 1 ? c.name : `${c.name}#${n}`;
      const path = prefix ? `${prefix}/${seg}` : seg;
      map.set(path, c);
      visit(c, path);
    }
  };
  visit(root, '');
  return map;
}

/** 선택 프레임들을 스캔해 정렬 결과(미리보기) 반환. 읽기 전용. */
export async function scanSimilar(frames: readonly SceneNode[]): Promise<AlignResult> {
  const trees: SimNode[] = [];
  for (const f of frames) trees.push(await buildSimTree(f));
  return alignFrames(trees);
}

export interface ComponentizeResult {
  master: string;
  properties: number;
  instances: number;
  /** v2: 인스턴스 fill 오버라이드로 교체한 이미지 수. */
  images: number;
  warnings: string[];
}

/**
 * 마스터를 컴포넌트화하고 나머지 멤버를 오버라이드 인스턴스로 교체.
 * - 가변 위치(텍스트/인스턴스)를 컴포넌트 속성으로 노출하고 마스터 콘텐츠를 기본값으로.
 * - 멤버마다 자기 콘텐츠를 setProperties 오버라이드로 이식 후 원본 제거.
 * 노드/속성 실패는 graceful skip(부분 성공 허용).
 */
export async function componentizeSimilar(master: SceneNode, members: readonly SceneNode[]): Promise<ComponentizeResult> {
  const trees: SimNode[] = [];
  for (const n of members) trees.push(await buildSimTree(n));
  const treeById = new Map(members.map((n, i) => [n.id, trees[i]] as const));
  const aligned = alignFrames(trees);
  const plan = planContentProperties(aligned.varying);

  // 1) 마스터 → 컴포넌트(자식·이름 보존, 원본 자리에 위치).
  const comp = figma.createComponentFromNode(master);

  // 2) 가변 위치를 컴포넌트 속성으로 노출 + 레이어 연결(기본값=마스터 콘텐츠).
  const compPaths = figmaPathMap(comp);
  const propIdByPath = new Map<string, string>();
  let properties = 0;
  for (const p of plan) {
    const target = compPaths.get(p.path);
    if (!target) continue;
    try {
      let def = '';
      if (p.type === 'TEXT') def = target.type === 'TEXT' ? target.characters : '';
      else {
        const mc = target.type === 'INSTANCE' ? await target.getMainComponentAsync() : null;
        def = mc ? mc.key || mc.id : '';
      }
      const id = comp.addComponentProperty(p.propName, p.type, def);
      const refs = { ...(target.componentPropertyReferences ?? {}) };
      refs[p.field] = id;
      target.componentPropertyReferences = refs;
      propIdByPath.set(p.path, id);
      properties++;
    } catch {
      /* 미발행 INSTANCE_SWAP 등 실패 시 스킵 */
    }
  }

  // 3) 마스터 외 멤버 → 인스턴스 교체(각 프레임 콘텐츠를 오버라이드로 이식).
  let instances = 0;
  let images = 0;
  for (const n of members) {
    if (n.id === master.id) continue; // 마스터는 이미 컴포넌트로 소비됨
    const leaves = treeById.get(n.id);
    if (!leaves) continue;
    try {
      const inst = comp.createInstance();
      inst.x = n.x;
      inst.y = n.y;
      try { inst.resize(n.width, n.height); } catch { /* 제약상 불가 시 기본 크기 */ }
      if (n.parent) (n.parent as ChildrenMixin).appendChild(inst);
      // 컴포넌트 속성 오버라이드(TEXT/INSTANCE_SWAP).
      const ov = overridesForFrame(flattenFrame(leaves), plan);
      const props: Record<string, string> = {};
      for (const p of plan) {
        const v = ov[p.propName];
        const id = propIdByPath.get(p.path);
        if (v !== undefined && id) props[id] = v;
      }
      try { inst.setProperties(props); } catch { /* 일부 오버라이드 실패 무시 */ }
      // v2: 가변 이미지 fill → 인스턴스 내부 레이어 fills를 멤버 원본으로 교체(컴포넌트 속성 불필요).
      if (aligned.imageVarying.length) {
        const srcPaths = figmaPathMap(n);
        const dstPaths = figmaPathMap(inst);
        for (const path of aligned.imageVarying) {
          const src = srcPaths.get(path);
          const dst = dstPaths.get(path);
          const f = src && 'fills' in src ? (src as GeometryMixin).fills : null;
          if (dst && 'fills' in dst && Array.isArray(f)) {
            try { (dst as GeometryMixin).fills = f; images++; } catch { /* fill 오버라이드 실패 무시 */ }
          }
        }
      }
      n.remove();
      instances++;
    } catch {
      /* 인스턴스 생성 실패 시 원본 보존 */
    }
  }

  const warnings = aligned.excluded.map((e) => `${e.name}: ${e.reason}`);
  return { master: comp.name, properties, instances, images, warnings };
}
