/* ============================================================
   darkRules.ts — 다크 D-T2의 순수 규칙 (figma 의존 없음 → node --test)
   ia-v3 13.7 "다크 — D-T2"(DK-D5–DK-D11 · A.30):
   Global은 모드 없는 팔레트 하나, Semantic 역할마다 Dark가 다른 Global 스텝을 가리킨다.
   - lightStepOf: Light가 가리키는 Global(G)의 계열 · 단계 읽기
   - darkStepFor: 역할별 규칙(1–6)으로 Dark 단계 고르기
   - scaleStepColor: 전체 스케일(50–950)의 빈 단계 색
   ============================================================ */
import { hexToOklch, oklchToHex, clampToGamut } from './color';
import { classifyColor, stepRefL } from './colorName';

/** 스케일 단계(자리 0–10). gray 0은 자리 −1 · 1000은 자리 11. */
export const DARK_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;

/** 단계 → 자리(0–10, gray 0 → −1, 1000 → 11). 단계가 아니면 null. */
export function stepIndex(step: number): number | null {
  if (step === 0) return -1;
  if (step === 1000) return 11;
  const i = (DARK_STEPS as readonly number[]).indexOf(step);
  return i >= 0 ? i : null;
}

export interface LightStep {
  family: string;
  step: number;
  /** 값이 무채색인가(`classifyColor(G 값).achromatic`) — 회색 규칙 · 유채색 규칙을 가른다(DK-D9). */
  achromatic: boolean;
}

const STEP_NAMES = new Set<number>([...DARK_STEPS, 0, 1000]);

/**
 * Light 스텝 읽기(13.7 표): `color/{x}/{n}`(n이 단계)이면 x · n, `color/{x}/{y}`(x가 계열 꼴)이면 x · 분류 단계,
 * 그 밖이면 분류 계열 · 단계.
 */
export function lightStepOf(name: string, hex: string): LightStep {
  const cls = classifyColor(hex);
  const parts = name.split('/');
  if (parts.length === 3 && parts[0] === 'color') {
    const [, x, y] = parts;
    if (/^\d+$/.test(y) && STEP_NAMES.has(Number(y))) return { family: x, step: Number(y), achromatic: cls.achromatic };
    if (/^[a-z]+(-\d+)?$/.test(x)) return { family: x, step: cls.step, achromatic: cls.achromatic };
  }
  return { family: cls.family, step: cls.step, achromatic: cls.achromatic };
}

const clampIdx = (j: number): number => Math.max(0, Math.min(10, j));
/** 대칭 자리에서 가운데(5) 쪽으로 한 자리(규칙 2 · 4). */
const mirrorToward = (i: number): number => {
  const j = 10 - i;
  return clampIdx(j < 5 ? j + 1 : j > 5 ? j - 1 : j);
};
/** 대칭 자리(규칙 3 · 5). */
const mirror = (i: number): number => clampIdx(10 - i);

export interface DarkStepInput {
  /** Semantic 이름의 둘째 마디(`color/{쓰임}/…`). 모르면 undefined. */
  use?: string;
  /** G의 투명도(0–1). */
  alpha: number;
  achromatic: boolean;
  step: number;
}

/**
 * 역할별 규칙(13.7 DK-D6 · DK-D10 — inverse도 같은 쓰임 규칙). Dark 단계(50–950)를 돌려준다.
 * 규칙 1(그림자 · 반투명)이면 null — Light와 같은 G를 가리킨다.
 */
export function darkStepFor(x: DarkStepInput): number | null {
  if (x.use === 'shadow' || x.alpha < 1) return null; // 1
  const i = stepIndex(x.step);
  if (i === null) return null; // 단계를 못 읽음 — 바꾸지 않는다(lightStepOf는 늘 단계를 준다)
  let j: number;
  if (x.achromatic) j = x.use === 'background' ? mirrorToward(i) : mirror(i); // 2 · 3
  else if (x.step <= 200) j = mirrorToward(i); // 4 — 연한 강조색(쓰임과 상관없이)
  else if (x.step >= 800) j = mirror(i); // 5 — 짙은 끝
  else j = Math.max(3, i >= 6 ? i - 2 : i - 1); // 6 — 강조색: 한두 자리 밝게, 300보다 밝게 가지 않음
  return DARK_STEPS[j];
}

/** Semantic 이름의 쓰임(`color/{쓰임}/…`의 둘째 마디). 그 꼴이 아니면 undefined. */
export function useOfRoleName(name: string): string | undefined {
  const parts = name.split('/');
  return parts.length >= 3 && parts[0] === 'color' ? parts[1] : undefined;
}

/** 원형 평균(가중) — 도. */
function circularMean(items: readonly { h: number; w: number }[]): number {
  let x = 0;
  let y = 0;
  for (const it of items) {
    x += Math.cos((it.h * Math.PI) / 180) * it.w;
    y += Math.sin((it.h * Math.PI) / 180) * it.w;
  }
  const d = (Math.atan2(y, x) * 180) / Math.PI;
  return d < 0 ? d + 360 : d;
}

export interface ScaleAnchor {
  step: number;
  hex: string;
  /** 같은 C일 때 고르는 순서(이름). */
  name: string;
}

/**
 * 전체 스케일의 빈 단계 색(13.7 DK-D7). L = `stepRefL(단계)`.
 * 회색 계열(기준이 모두 무채색): H = C 가중 원형 평균(C < 0.005 제외 — 모두 빠지면 C = 0), C = 기준 C 중앙값(≤ 0.02).
 * 유채색: 기준 중 C가 가장 큰 색의 H · C, C′ = C × (1 − 0.6 × |i − i_peak| / 10).
 */
export function scaleStepColor(step: number, anchors: readonly ScaleAnchor[]): string {
  const l = stepRefL(step);
  const i = stepIndex(step) ?? 5;
  const os = anchors.map((a) => ({ a, o: hexToOklch(a.hex), cls: classifyColor(a.hex) }));
  const gray = os.length === 0 || os.every((x) => x.cls.achromatic);
  if (gray) {
    const tinted = os.filter((x) => x.o.c >= 0.005);
    if (!tinted.length) return oklchToHex(clampToGamut({ l, c: 0, h: 0 }));
    const h = circularMean(tinted.map((x) => ({ h: x.o.h, w: x.o.c })));
    const cs = os.map((x) => x.o.c).sort((a, b) => a - b);
    const mid = cs.length % 2 ? cs[(cs.length - 1) / 2] : (cs[cs.length / 2 - 1] + cs[cs.length / 2]) / 2;
    return oklchToHex(clampToGamut({ l, c: Math.min(0.02, mid), h }));
  }
  const peak = os
    .filter((x) => !x.cls.achromatic)
    .sort((p, q) => q.o.c - p.o.c || (p.a.name < q.a.name ? -1 : p.a.name > q.a.name ? 1 : 0))[0];
  const ip = stepIndex(peak.a.step) ?? 5;
  const ipc = Math.max(0, Math.min(10, ip));
  const c = peak.o.c * (1 - 0.6 * (Math.abs(i - ipc) / 10));
  return oklchToHex(clampToGamut({ l, c, h: peak.o.h }));
}
