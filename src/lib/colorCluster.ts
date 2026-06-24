/* ============================================================
   colorCluster.ts — 추출 색 ΔE 군집(순수, figma 의존 없음 → node --test)
   와이어프레임 '정리(군집)' 단계: 지각적으로 비슷한 색을 묶어 대표색 하나로
   병합하고, 충분히 다른 단색(unique)은 그대로 둔다. 역할은 대표색에만 붙는다.
   거리 척도(ΔE): OKLab 유클리드 거리 ×100. 프로젝트가 OKLCH(지각 균일)를 쓰므로
   CIELAB 대신 OKLab 거리를 ΔE로 채택 — 임계값 8이 "비슷한 색" 경계가 된다.
   허용오차는 UI에 노출하지 않고 기본 8 고정(와이어프레임 결정).
   ============================================================ */
import { hexToOklch } from './color';
import type { DraftToken } from './tokens';

/** UI 비노출 · 기본 고정 허용오차(ΔE). */
export const DEFAULT_DELTA_E = 8;

export interface ColorInput {
  name: string;
  hex: string;
}

export interface ColorCluster {
  /** 대표색 — 군집 중 채도가 가장 높은 색(동률: 명도 0.6 근접 → 이름순). */
  representative: ColorInput;
  /** 대표색을 포함한 전체 구성원. */
  members: ColorInput[];
  /** 단색 유지(군집 안 됨) 여부. */
  isSingleton: boolean;
}

interface Pt {
  L: number; // OKLab L
  a: number; // OKLab a
  b: number; // OKLab b
  c: number; // OKLCH chroma(대표색 선정용)
  l: number; // OKLCH lightness(동률 시 0.6 근접 비교용)
}

function oklabPoint(hex: string): Pt {
  const { l, c, h } = hexToOklch(hex);
  const r = (h * Math.PI) / 180;
  return { L: l, a: c * Math.cos(r), b: c * Math.sin(r), c, l };
}

/** 두 색의 지각 거리 ΔE(OKLab 유클리드 ×100). 0=동일, 클수록 다름. */
export function deltaEOK(hexA: string, hexB: string): number {
  const x = oklabPoint(hexA);
  const y = oklabPoint(hexB);
  return Math.hypot(x.L - y.L, x.a - y.a, x.b - y.b) * 100;
}

/* union-find(경로 절반 압축) */
function find(parent: number[], i: number): number {
  while (parent[i] !== i) {
    parent[i] = parent[parent[i]];
    i = parent[i];
  }
  return i;
}

/**
 * 색 목록을 ΔE 군집으로 묶는다 — 연결요소(ΔE ≤ tolerance인 색끼리 한 군집).
 * 대표색 = 군집 내 채도 최고색. 단색(군집 안 됨)은 isSingleton=true.
 * 반환 순서는 각 군집의 첫 등장(입력 순서) 기준으로 안정적.
 */
export function clusterColorsByDeltaE(
  colors: ReadonlyArray<ColorInput>,
  tolerance: number = DEFAULT_DELTA_E,
): ColorCluster[] {
  const n = colors.length;
  if (n === 0) return [];
  const pts = colors.map((c) => oklabPoint(c.hex));
  const parent = colors.map((_, i) => i);
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const d = Math.hypot(pts[i].L - pts[j].L, pts[i].a - pts[j].a, pts[i].b - pts[j].b) * 100;
      if (d <= tolerance) {
        const ri = find(parent, i);
        const rj = find(parent, j);
        // 루트를 더 작은 인덱스로 유지 → 첫 등장 순서 안정.
        if (ri !== rj) parent[Math.max(ri, rj)] = Math.min(ri, rj);
      }
    }
  }
  const order: number[] = [];
  const groups = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    const r = find(parent, i);
    let g = groups.get(r);
    if (!g) {
      g = [];
      groups.set(r, g);
      order.push(r);
    }
    g.push(i);
  }
  return order.map((r) => {
    const idxs = groups.get(r) as number[];
    // 대표색: 채도 최고 → 명도 0.6 근접 → 이름순
    let best = idxs[0];
    for (const i of idxs) {
      const p = pts[i];
      const q = pts[best];
      if (p.c > q.c + 1e-9) best = i;
      else if (Math.abs(p.c - q.c) <= 1e-9) {
        const dp = Math.abs(p.l - 0.6);
        const dq = Math.abs(q.l - 0.6);
        if (dp < dq - 1e-9) best = i;
        else if (Math.abs(dp - dq) <= 1e-9 && colors[i].name < colors[best].name) best = i;
      }
    }
    const members = idxs.map((i) => colors[i]);
    return { representative: colors[best], members, isSingleton: members.length === 1 };
  });
}

export interface ClusterSummary {
  total: number;
  representatives: number;
  merged: number;
  singletons: number;
}

/** 군집 요약 — 와이어프레임 "N색 → M 대표색 · K색 병합". */
export function clusterSummary(clusters: ReadonlyArray<ColorCluster>): ClusterSummary {
  const total = clusters.reduce((s, c) => s + c.members.length, 0);
  const representatives = clusters.length;
  return {
    total,
    representatives,
    merged: total - representatives,
    singletons: clusters.filter((c) => c.isSingleton).length,
  };
}

export interface TokenClusterResult {
  clusters: ColorCluster[];
  /** 비대표(병합된) 색 이름 → 대표 색 이름. */
  merges: Record<string, string>;
}

/** DraftToken[] 중 색 토큰만 군집 + 병합 맵(이름 기준) 산출. */
export function clusterColorTokens(
  tokens: ReadonlyArray<DraftToken>,
  tolerance: number = DEFAULT_DELTA_E,
): TokenClusterResult {
  const colors: ColorInput[] = [];
  for (const t of tokens) {
    if (t.category === 'color' && typeof t.value === 'string') colors.push({ name: t.name, hex: t.value });
  }
  const clusters = clusterColorsByDeltaE(colors, tolerance);
  const merges: Record<string, string> = {};
  for (const cl of clusters) {
    for (const m of cl.members) {
      if (m.name !== cl.representative.name) merges[m.name] = cl.representative.name;
    }
  }
  return { clusters, merges };
}
