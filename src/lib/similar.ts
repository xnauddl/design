/* ============================================================
   similar.ts — 닮은 프레임 컴포넌트화의 순수 로직 (figma 의존 없음 → node --test)
   구조가 같고 콘텐츠(텍스트·이미지)만 다른 프레임 N개를:
   ① 동일 구조끼리 그룹화(나머지 제외) ② 가변 위치(텍스트/인스턴스) 산출
   ③ 완전성 점수로 마스터 추천 ④ 속성 계획·프레임별 오버라이드 값 매핑.
   실제 createComponentFromNode·addComponentProperty·createInstance 적용은 code.ts.
   ============================================================ */
import { kebab } from './naming';

/** 스캔 입력 — figma SceneNode 트리의 최소 형태(콘텐츠 신호 포함). */
export interface FrameNode {
  id: string;
  name: string;
  type: string; // 'FRAME'|'GROUP'|'TEXT'|'INSTANCE'|'RECTANGLE'|...
  children?: readonly FrameNode[];
  /** TEXT 노드의 문자열. */
  characters?: string;
  /** INSTANCE 노드의 mainComponent key(없으면 id) — INSTANCE_SWAP 비교/오버라이드용. */
  componentKey?: string;
  /** 이미지 fill을 가진 노드(사각형 등). */
  hasImageFill?: boolean;
  /** 첫 이미지 fill의 imageHash — v2 이미지 변동 감지(인스턴스 fill 오버라이드 대상). */
  imageHash?: string;
}

/** 평탄화된 한 레이어(루트 제외, 루트 기준 이름-경로). */
export interface LeafEntry {
  id: string;
  /** 루트 기준 이름-경로. 동일 이름 형제는 `이름#2`로 구분. 예: `Body/Title`. */
  path: string;
  type: string;
  characters?: string;
  componentKey?: string;
  hasImageFill?: boolean;
  imageHash?: string;
}

/**
 * 프레임 트리를 루트 기준 이름-경로 리프 목록으로 평탄화(루트 자신은 제외).
 * 동일 이름 형제는 `이름#2`, `이름#3`…으로 모호성 제거 → 프레임 간 위치 매칭 키로 사용.
 * code.ts도 이 함수로 같은 경로를 재계산해 마스터/멤버 노드를 찾는다(경로 로직 단일화).
 */
export function flattenFrame(root: FrameNode): LeafEntry[] {
  const out: LeafEntry[] = [];
  const visit = (node: FrameNode, prefix: string): void => {
    const seen = new Map<string, number>();
    for (const c of node.children ?? []) {
      const n = (seen.get(c.name) ?? 0) + 1;
      seen.set(c.name, n);
      const seg = n === 1 ? c.name : `${c.name}#${n}`;
      const path = prefix ? `${prefix}/${seg}` : seg;
      out.push({ id: c.id, path, type: c.type, characters: c.characters, componentKey: c.componentKey, hasImageFill: c.hasImageFill, imageHash: c.imageHash });
      visit(c, path);
    }
  };
  visit(root, '');
  return out;
}

/** 경로/타입 구분자: 레이어 이름·타입에 절대 없는 NUL → 충돌 불가.
    소스엔 이스케이프로 표기해 파일이 바이너리로 인식되지 않게 함(variables.ts와 동일 규칙). */
const SEP = '\u0000';

/** 콘텐츠를 제외한 구조 시그니처(경로+타입 집합). 같으면 "구조 동일"로 본다. */
export function frameShapeSignature(root: FrameNode): string {
  return JSON.stringify(
    flattenFrame(root)
      .map((e) => `${e.path}${SEP}${e.type}`)
      .sort(),
  );
}

/** 가변 위치 — 멤버 간 콘텐츠가 달라 컴포넌트 속성으로 노출할 자리. */
export interface VaryingPosition {
  path: string;
  type: 'TEXT' | 'INSTANCE_SWAP';
}

/** 후보 프레임의 완전성 메타(마스터 추천 근거 — 텍스트 패널 표기용). */
export interface FrameMeta {
  id: string;
  name: string;
  textFilled: number; // 비어있지 않은 TEXT 수
  textTotal: number;
  images: number; // INSTANCE + 이미지 fill 수
  emptyLayers: number; // 빈 TEXT 수
  score: number; // 완전성 점수(정렬·추천용)
}

export interface AlignResult {
  /** 동일 구조 그룹(2개 이상)의 프레임 id. 1개 이하면 빈 배열. */
  memberIds: string[];
  /** 추천 마스터(완전성 최고). 멤버 없으면 null. */
  recommendedMasterId: string | null;
  /** 멤버 메타(점수 내림차순 → 추천이 맨 앞). */
  metas: FrameMeta[];
  /** 가변 위치(속성 후보). */
  varying: VaryingPosition[];
  /** 멤버 간 imageHash가 다른 이미지 fill 경로 — v2 인스턴스 fill 오버라이드 대상. */
  imageVarying: string[];
  /** 구조 불일치 등으로 제외된 프레임. */
  excluded: { id: string; name: string; reason: string }[];
}

const textOf = (e: LeafEntry): string => (e.characters ?? '').trim();

function metaOf(frame: FrameNode): FrameMeta {
  const leaves = flattenFrame(frame);
  const texts = leaves.filter((l) => l.type === 'TEXT');
  const textFilled = texts.filter((l) => textOf(l) !== '').length;
  const images = leaves.filter((l) => l.type === 'INSTANCE' || l.hasImageFill).length;
  const emptyLayers = texts.length - textFilled;
  return {
    id: frame.id,
    name: frame.name,
    textFilled,
    textTotal: texts.length,
    images,
    emptyLayers,
    score: textFilled * 2 + images - emptyLayers,
  };
}

/**
 * 닮은 프레임들 → 동일 구조 그룹·가변 위치·마스터 추천·제외 목록.
 * - 가장 큰 동일-구조 그룹(2개+)을 멤버로, 나머지는 "구조 불일치"로 제외.
 * - 멤버 간 TEXT 문자열/INSTANCE key가 갈리는 위치만 가변(=속성 후보).
 * - 마스터 추천 = 완전성 점수 최고(동점이면 입력 순서 우선).
 */
export function alignFrames(frames: readonly FrameNode[]): AlignResult {
  const empty: AlignResult = { memberIds: [], recommendedMasterId: null, metas: [], varying: [], imageVarying: [], excluded: [] };
  if (frames.length < 2) {
    return { ...empty, excluded: frames.map((f) => ({ id: f.id, name: f.name, reason: '프레임이 2개 이상 필요' })) };
  }

  // 1) 구조 시그니처로 그룹화 → 최대 그룹 선택.
  const bySig = new Map<string, FrameNode[]>();
  for (const f of frames) {
    const sig = frameShapeSignature(f);
    (bySig.get(sig) ?? bySig.set(sig, []).get(sig)!).push(f);
  }
  let best: FrameNode[] = [];
  for (const group of bySig.values()) if (group.length > best.length) best = group;

  const excluded = frames
    .filter((f) => !best.includes(f))
    .map((f) => ({ id: f.id, name: f.name, reason: '구조 불일치' }));

  if (best.length < 2) {
    return { ...empty, excluded: frames.map((f) => ({ id: f.id, name: f.name, reason: '동일 구조 프레임 2개 미만' })) };
  }

  // 2) 위치별 콘텐츠 수집 → 가변 판정.
  const flats = best.map((f) => flattenFrame(f));
  const paths = flats[0]; // 시그니처 동일 → 모든 멤버가 같은 경로/타입 집합
  const varying: VaryingPosition[] = [];
  const imageVarying: string[] = [];
  const at = (leaves: LeafEntry[], path: string): LeafEntry | undefined => leaves.find((l) => l.path === path);

  for (const entry of paths) {
    // 이미지 fill: imageHash가 멤버 간 다르면 인스턴스 fill 오버라이드 대상(v2).
    if (entry.hasImageFill) {
      const hashes = new Set(flats.map((f) => at(f, entry.path)?.imageHash ?? ''));
      if (hashes.size > 1) imageVarying.push(entry.path);
    }
    if (entry.type !== 'TEXT' && entry.type !== 'INSTANCE') continue;
    const valueAt = (leaves: LeafEntry[]): string => {
      const e = at(leaves, entry.path);
      if (!e) return '';
      return entry.type === 'TEXT' ? textOf(e) : e.componentKey ?? '';
    };
    const distinct = new Set(flats.map(valueAt));
    if (distinct.size > 1) varying.push({ path: entry.path, type: entry.type === 'TEXT' ? 'TEXT' : 'INSTANCE_SWAP' });
  }

  // 3) 메타·마스터 추천(점수 내림차순, 동점은 입력 순서).
  const metas = best.map(metaOf);
  const order = new Map(best.map((f, i) => [f.id, i]));
  metas.sort((a, b) => b.score - a.score || (order.get(a.id)! - order.get(b.id)!));
  const recommendedMasterId = metas.length ? metas[0].id : null;

  return {
    memberIds: best.map((f) => f.id),
    recommendedMasterId,
    metas,
    varying,
    imageVarying: [...new Set(imageVarying)],
    excluded,
  };
}

/** 노출할 콘텐츠 컴포넌트 속성 계획(가변 위치 → 속성). */
export interface ContentPropPlan {
  propName: string;
  type: 'TEXT' | 'INSTANCE_SWAP';
  /** 대상 레이어 경로(flattenFrame 기준). */
  path: string;
  /** 연결할 노드 필드. */
  field: 'characters' | 'mainComponent';
}

/** 경로의 마지막 세그먼트(형제 구분 `#n` 제거)에서 속성 베이스 이름. */
const leafName = (path: string): string => {
  const seg = path.split('/').pop() ?? path;
  return kebab(seg.replace(/#\d+$/, ''));
};

/**
 * 가변 위치 → 컴포넌트 속성 계획. TEXT→TEXT(characters), INSTANCE_SWAP→mainComponent.
 * 속성 이름 충돌은 `-2` 접미사로 회피(components.inferComponentProperties와 동일 규칙).
 */
export function planContentProperties(varying: readonly VaryingPosition[]): ContentPropPlan[] {
  const taken = new Set<string>();
  const uniq = (base: string): string => {
    const b = base || 'prop';
    let n = b;
    let i = 2;
    while (taken.has(n)) n = `${b}-${i++}`;
    taken.add(n);
    return n;
  };
  return varying.map((v) => ({
    propName: uniq(leafName(v.path) || (v.type === 'TEXT' ? 'text' : 'swap')),
    type: v.type,
    path: v.path,
    field: v.type === 'TEXT' ? 'characters' : 'mainComponent',
  }));
}

/**
 * 한 프레임의 콘텐츠 → 속성 오버라이드 값 맵(propName → 값).
 * TEXT는 characters, INSTANCE_SWAP은 componentKey. 해당 경로가 비면 생략.
 */
export function overridesForFrame(frameLeaves: readonly LeafEntry[], plan: readonly ContentPropPlan[]): Record<string, string> {
  const byPath = new Map(frameLeaves.map((l) => [l.path, l]));
  const out: Record<string, string> = {};
  for (const p of plan) {
    const e = byPath.get(p.path);
    if (!e) continue;
    const value = p.type === 'TEXT' ? e.characters ?? '' : e.componentKey ?? '';
    if (value !== '') out[p.propName] = value;
  }
  return out;
}
