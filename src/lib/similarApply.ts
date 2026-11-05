/* ============================================================
   similarApply.ts — 닮은 프레임 컴포넌트화의 figma 적용 (figma 의존 → dist/figma-lib로 목 테스트)
   순수 정렬·계획(similar.ts) 위에서 노드 트리 구성·컴포넌트 생성·속성 노출·인스턴스 교체.
   code.ts 핸들러는 이 함수를 호출만 한다(createTokens·bindSelection과 같은 패턴).
   ============================================================ */
import { t } from './i18n';
import {
  alignFrames,
  planContentProperties,
  flattenFrame,
  overridesForFrame,
  type AlignResult,
  type FrameNode as SimNode,
} from './similar';
import { captureOrigin, placeAtOrigin, releaseOrigin } from './placement';
import type { CodeToUi } from '../shared/messages';

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
  /** 제자리에 넣지 못해 원본을 그대로 둔 멤버 이름(§4.7 "인스턴스 자리" 5번). 인스턴스는 지웠다. */
  placeFailed: string[];
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
  const kept: string[] = [];
  const placeFailed: string[] = [];
  // 정렬에서 제외된(구조 불일치) 프레임은 절대 교체 대상이 아니다 — 스캔과 실행 사이에
  // 문서가 바뀌어 구조가 달라졌다면 원본을 그대로 두고 경고만 남긴다.
  const memberSet = new Set(aligned.memberIds);
  for (const n of members) {
    if (n.id === master.id) continue; // 마스터는 이미 컴포넌트로 소비됨
    if (!memberSet.has(n.id)) continue; // 제외된 프레임 → 원본 보존
    const leaves = treeById.get(n.id);
    if (!leaves) continue;
    let inst: InstanceNode | null = null;
    try {
      inst = comp.createInstance();
      try { inst.resize(n.width, n.height); } catch { /* 제약상 불가 시 기본 크기 */ }
      // 원본이 있던 **자리**에 먼저 끼우고 원본은 맨 끝에 지운다(§4.7 "인스턴스 자리" — 등록과 같은 모듈).
      // appendChild로 부모 끝에 붙이면 오토레이아웃 리스트에서 순서가 뒤섞이고, 부모가 없을 때 그냥 두면
      // 인스턴스가 페이지 맨 위(0,0)에 남는다(QA #3 불합격 3). 못 넣으면 인스턴스를 지우고 원본을 지킨다.
      // 원본이 아직 자리에 있으니 그룹이 빌 일이 없다 — 표지는 넣지 않는다(§4.7 3번). 위치·제약·크기 규칙·
      // 절대 위치 보정은 같은 모듈이 맡는다.
      const origin = captureOrigin(n, { anchor: false });
      if (!placeAtOrigin(inst, origin)) {
        inst = null; // placeAtOrigin이 이미 지웠다
        placeFailed.push(n.name);
        continue;
      }
      releaseOrigin(origin);
      // 컴포넌트 속성 오버라이드(TEXT/INSTANCE_SWAP).
      const ov = overridesForFrame(flattenFrame(leaves), plan);
      const props: Record<string, string> = {};
      for (const p of plan) {
        const v = ov[p.propName];
        const id = propIdByPath.get(p.path);
        if (v !== undefined && id) props[id] = v;
      }
      // 오버라이드가 실패하면 인스턴스는 마스터 콘텐츠 그대로다 — 그 상태로 원본을 지우면
      // 이 프레임의 고유 콘텐츠가 영영 사라진다. 실패 시 인스턴스를 버리고 원본을 남긴다.
      if (Object.keys(props).length) {
        try {
          inst.setProperties(props);
        } catch {
          inst.remove();
          kept.push(n.name);
          continue;
        }
      }
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
      // 인스턴스 생성·오버라이드 중 실패 — 원본은 보존. 만든 인스턴스가 있으면 치운다(어디에도 남기지 않음).
      if (inst) { try { inst.remove(); } catch { /* 이미 사라짐 */ } }
    }
  }

  const warnings = aligned.excluded.map((e) => `${e.name}: ${e.reason}`);
  for (const name of kept) warnings.push(t('similar.overrideFail', { name }));
  for (const name of placeFailed) warnings.push(t('similar.placeFail', { name })); // UI가 같은 키로 알아본다(isPlaceFailWarning)
  return { master: comp.name, properties, instances, images, warnings, placeFailed };
}

/**
 * [묶기] 결과 → UI 메시지. 결과의 필드를 빠짐없이 싣는다 — 예전에 code.ts가 필드를 하나씩 옮기다
 * `placeFailed`를 빠뜨려 결과 줄 꼬리·최소화 ⚠가 동작하지 않았다(QA #3 검토 2회차). 테스트가 지킨다.
 */
export function componentizeResultMessage(r: ComponentizeResult): Extract<CodeToUi, { type: 'COMPONENTIZE_RESULT' }> {
  return {
    type: 'COMPONENTIZE_RESULT',
    master: r.master,
    properties: r.properties,
    instances: r.instances,
    images: r.images,
    warnings: r.warnings,
    placeFailed: r.placeFailed,
  };
}
