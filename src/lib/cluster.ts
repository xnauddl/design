/* ============================================================
   cluster.ts — 추출 색 N:1 정리(ΔE 군집)
   ------------------------------------------------------------
   비슷한 색을 OKLab 지각 거리로 군집해 군집마다 대표 1색을 고른다.
   **변수 생성 전 드래프트(DraftToken) 단계에서만** 동작 — 이미 만든 변수나
   노드 바인딩은 건드리지 않으므로 적용된 디자인에 영향이 없다('정리만' 모델).
   ============================================================ */
import { hexToOklch } from './color';

/** OKLab 유클리드 거리 임계값. 이보다 가까우면 같은 색으로 보고 병합 후보로 묶는다. */
export const TIDY_TOL = 0.02;

interface Lab {
  L: number;
  a: number;
  b: number;
}

/** hex → OKLab 성분(OKLCH의 c·h를 직교좌표로 환산). 거리 계산용. */
function labOf(hex: string): Lab {
  const { l, c, h } = hexToOklch(hex);
  const rad = (h * Math.PI) / 180;
  return { L: l, a: c * Math.cos(rad), b: c * Math.sin(rad) };
}

/** 두 hex의 OKLab 유클리드 거리(≈ 지각 ΔE). */
export function colorDistance(hex1: string, hex2: string): number {
  const p = labOf(hex1);
  const q = labOf(hex2);
  return Math.hypot(p.L - q.L, p.a - q.a, p.b - q.b);
}

export interface ColorCluster {
  /** 대표 hex(메도이드 — 군집 내 다른 색까지 총 거리 최소). */
  rep: string;
  /** 군집 전체(대표 포함), hex 오름차순. */
  members: string[];
}

/**
 * hex 목록을 군집화. 입력 순서와 무관하게 **결정론적**(정렬 후 단일 연결 그리디 +
 * 대표=메도이드, 동률은 사전순). 같은 hex 중복은 먼저 dedup.
 */
export function clusterColors(hexes: string[], tol = TIDY_TOL): ColorCluster[] {
  const uniq = [...new Set(hexes.map((h) => h.toLowerCase()))].sort();
  const clusters: string[][] = [];
  for (const hex of uniq) {
    let placed = false;
    for (const cl of clusters) {
      // 단일 연결: 군집 내 어떤 색과도 tol 이내면 합류.
      if (cl.some((m) => colorDistance(m, hex) <= tol)) {
        cl.push(hex);
        placed = true;
        break;
      }
    }
    if (!placed) clusters.push([hex]);
  }
  return clusters.map((members) => ({ rep: medoid(members), members }));
}

/** 군집 대표 = 다른 색까지 총 거리가 최소인 색(메도이드), 동률은 사전순. */
function medoid(members: string[]): string {
  if (members.length === 1) return members[0];
  let best = members[0];
  let bestSum = Infinity;
  for (const m of members) {
    let sum = 0;
    for (const n of members) sum += colorDistance(m, n);
    if (sum < bestSum - 1e-9 || (Math.abs(sum - bestSum) <= 1e-9 && m < best)) {
      bestSum = sum;
      best = m;
    }
  }
  return best;
}
