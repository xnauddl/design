/* ============================================================
   contrast.ts — 명도 대비 점검(순수, figma.* 의존 없음 → node --test 가능)
   WCAG 2.x 대비비로 텍스트-배경 쌍을 평가한다. 색 변환·대비비는 color.ts를 재사용하고,
   여기서는 '큰 텍스트' 판정과 기준치(AA/AAA)·일괄 리포트만 담당한다.
   code.ts가 figma에서 fg/bg를 추출해 ContrastSample[]로 넘기면 이 모듈이 판정한다.
   ============================================================ */
import { hexToRgb } from './tokens';
import { contrastRatio } from './color';

export type WcagLevel = 'AA' | 'AAA';

/** code.ts가 figma에서 추출해 넘기는 텍스트-배경 쌍(순수 입력). */
export interface ContrastSample {
  id: string; // 노드 id(결과 추적·라우팅용)
  name: string; // 레이어 이름
  fg: string; // 텍스트 색 hex(#rrggbb)
  bg: string; // 유효 배경 hex(#rrggbb) — 가장 가까운 상위 단색 채움
  fontSize: number; // px(혼합이면 보수적으로 작은 값/기본값)
  bold: boolean; // 굵기 ≥ 700
}

export interface ContrastFinding {
  id: string;
  name: string;
  fg: string;
  bg: string;
  ratio: number; // 대비비(소수 2자리 반올림)
  required: number; // 통과 기준치(level·large 반영)
  large: boolean; // 큰 텍스트로 판정됐는가
  pass: boolean; // ratio >= required
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

/** 큰 텍스트까지 반영한 단일 샘플 판정. */
export function evaluateSample(s: ContrastSample, level: WcagLevel): ContrastFinding {
  const large = isLargeText(s.fontSize, s.bold);
  const required = requiredRatio(level, large);
  const ratio = round2(contrastRatio(hexToRgb(s.fg), hexToRgb(s.bg)));
  return { id: s.id, name: s.name, fg: s.fg, bg: s.bg, ratio, required, large, pass: ratio >= required };
}

/** 여러 쌍 일괄 점검 → 리포트(실패 우선·대비 낮은 순). */
export function checkContrast(samples: ContrastSample[], level: WcagLevel): ContrastReport {
  const findings = samples.map((s) => evaluateSample(s, level));
  // 실패를 먼저, 같은 그룹에선 대비가 낮은(더 시급한) 순으로.
  findings.sort((a, b) => Number(a.pass) - Number(b.pass) || a.ratio - b.ratio);
  const failed = findings.reduce((n, f) => n + (f.pass ? 0 : 1), 0);
  return { level, checked: findings.length, passed: findings.length - failed, failed, findings };
}
