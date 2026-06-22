/* ============================================================
   contrast.ts — 명도 대비 점검(순수, figma.* 의존 없음 → node --test 가능)
   WCAG 2.x 대비비로 텍스트-배경 쌍을 평가한다. 색 변환·대비비는 color.ts를 재사용하고,
   여기서는 '큰 텍스트' 판정과 기준치(AA/AAA)·일괄 리포트만 담당한다.
   code.ts가 figma에서 fg/bg를 추출해 ContrastSample[]로 넘기면 이 모듈이 판정한다.
   ============================================================ */
import { hexToRgb } from './tokens';
import { contrastRatio, hexToOklch, oklchToHex, clampToGamut } from './color';

export type WcagLevel = 'AA' | 'AAA';

/** code.ts가 figma에서 추출해 넘기는 텍스트-배경 쌍(순수 입력). */
export interface ContrastSample {
  id: string; // 노드 id(결과 추적·라우팅용)
  name: string; // 레이어 이름
  fg: string; // 텍스트 색 hex(#rrggbb)
  bg: string; // 유효 배경 hex(#rrggbb) — 가장 가까운 상위 단색 채움
  bgId?: string; // 유효 배경 노드 id(배경 보정 적용용)
  fontSize: number; // px(혼합이면 보수적으로 작은 값/기본값)
  bold: boolean; // 굵기 ≥ 700
}

export interface ContrastFinding {
  id: string;
  name: string;
  fg: string;
  bg: string;
  bgId?: string; // 배경 노드 id(배경 보정 적용 대상)
  ratio: number; // 대비비(소수 2자리 반올림)
  required: number; // 통과 기준치(level·large 반영)
  large: boolean; // 큰 텍스트로 판정됐는가
  pass: boolean; // ratio >= required
  /** #2 보정 제안(미달 건만) — 텍스트색(기본)·배경색(옵션). 통과시키는 최소 변경색. */
  suggestedFg?: string;
  suggestedBg?: string;
}

export interface ContrastReport {
  level: WcagLevel;
  checked: number; // 평가한 쌍 수
  passed: number;
  failed: number;
  /** 실패 우선·대비 낮은 순 정렬. */
  findings: ContrastFinding[];
}

/** WCAG '큰 텍스트': 18pt(≈24px) 이상, 또는 14pt(≈18.66px) 이상이면서 볼드. */
export function isLargeText(fontSizePx: number, bold: boolean): boolean {
  if (fontSizePx >= 24) return true;
  return bold && fontSizePx >= 18.66;
}

/** level·large에 따른 최소 대비비. AA: 4.5(큰 3) · AAA: 7(큰 4.5). */
export function requiredRatio(level: WcagLevel, large: boolean): number {
  if (level === 'AAA') return large ? 4.5 : 7;
  return large ? 3 : 4.5;
}

/** 소수 2자리 반올림(표시값과 판정값을 일치시켜 “4.5인데 미달” 혼동 방지). */
const round2 = (n: number): number => Math.round(n * 100) / 100;

/** 단색 쌍 한 건 평가 — 일반 텍스트 기준(AA=4.5·AAA=7) 통과 여부. preview 계약. */
export function checkPair(fgHex: string, bgHex: string): { ratio: number; aa: boolean; aaa: boolean } {
  const ratio = round2(contrastRatio(hexToRgb(fgHex), hexToRgb(bgHex)));
  return { ratio, aa: ratio >= 4.5, aaa: ratio >= 7 };
}

const clamp01 = (n: number): number => Math.min(1, Math.max(0, n));

/**
 * src 색의 hue·chroma는 유지하고 **명도(L)만** 조정해 other 대비 required를 만족하는
 * 최소 변경색을 찾는다(양방향 시도 후 변경량이 작은 쪽). 게멋 밖이면 chroma 클램프.
 */
function adjustLForContrast(srcHex: string, otherHex: string, required: number): string {
  const src = hexToOklch(srcHex);
  const otherRgb = hexToRgb(otherHex);
  const at = (L: number): { hex: string; ratio: number } => {
    const hex = oklchToHex(clampToGamut({ l: clamp01(L), c: src.c, h: src.h }));
    return { hex, ratio: contrastRatio(hexToRgb(hex), otherRgb) };
  };
  if (at(src.l).ratio >= required) return srcHex; // 이미 충족(미달 건엔 거의 없음)

  // 한 방향(현재 L → 끝점)에서 충족하는 경계 L을 이분 탐색. 끝점이 못 미치면 실패.
  const solve = (toL: number): { ok: boolean; L: number; hex: string } => {
    if (at(toL).ratio < required) return { ok: false, L: toL, hex: at(toL).hex };
    let lo = src.l;
    let hi = toL;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      if (at(mid).ratio >= required) hi = mid;
      else lo = mid;
    }
    return { ok: true, L: hi, hex: at(hi).hex };
  };

  const dark = solve(0); // 어둡게
  const light = solve(1); // 밝게
  const ok = [dark, light].filter((c) => c.ok).sort((a, b) => Math.abs(a.L - src.l) - Math.abs(b.L - src.l));
  if (ok.length) return ok[0].hex; // 변경량 작은 쪽
  return at(0).ratio >= at(1).ratio ? at(0).hex : at(1).hex; // 둘 다 미달이면 대비 큰 극단
}

/** #2: 미달 쌍을 통과시키는 보정색 제안 — suggestedFg(기본)·suggestedBg(옵션) 둘 다. */
export function suggestContrastFix(fg: string, bg: string, required: number): { suggestedFg: string; suggestedBg: string } {
  return {
    suggestedFg: adjustLForContrast(fg, bg, required), // 텍스트색 명도 조정(국소·파급 적음)
    suggestedBg: adjustLForContrast(bg, fg, required), // 배경색 명도 조정(옵션)
  };
}

/** 큰 텍스트까지 반영한 단일 샘플 판정. 미달이면 보정 제안 첨부. */
export function evaluateSample(s: ContrastSample, level: WcagLevel): ContrastFinding {
  const large = isLargeText(s.fontSize, s.bold);
  const required = requiredRatio(level, large);
  const ratio = round2(contrastRatio(hexToRgb(s.fg), hexToRgb(s.bg)));
  const pass = ratio >= required;
  const f: ContrastFinding = { id: s.id, name: s.name, fg: s.fg, bg: s.bg, bgId: s.bgId, ratio, required, large, pass };
  if (!pass) {
    const fix = suggestContrastFix(s.fg, s.bg, required);
    f.suggestedFg = fix.suggestedFg;
    f.suggestedBg = fix.suggestedBg;
  }
  return f;
}

/** 여러 쌍 일괄 점검 → 리포트(실패 우선·대비 낮은 순). */
export function checkContrast(samples: ContrastSample[], level: WcagLevel): ContrastReport {
  const findings = samples.map((s) => evaluateSample(s, level));
  // 실패를 먼저, 같은 그룹에선 대비가 낮은(더 시급한) 순으로.
  findings.sort((a, b) => Number(a.pass) - Number(b.pass) || a.ratio - b.ratio);
  const failed = findings.reduce((n, f) => n + (f.pass ? 0 : 1), 0);
  return { level, checked: findings.length, passed: findings.length - failed, failed, findings };
}
