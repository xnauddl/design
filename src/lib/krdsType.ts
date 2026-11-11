/* ============================================================
   krdsType.ts — 텍스트 스타일 이름을 KRDS 규칙으로 짓는 순수 로직(docs/text-style-krds.md).
   이름 = `{분류}/{단계}` + 필요할 때만 꼬리 `-{크기}` · `-w{굵기}` · `-{줄 높이 %}`(§3).
   만들기 화면 Text Style 탭 · 타이포 스캔 · 기본 램프 · 이름 다시 짓기가 같은 함수를 쓴다.
   Figma 호출 없음.
   ============================================================ */

import { splitWeightStyle } from './exporters';

export type KrdsCategory = 'display' | 'heading' | 'body' | 'label';

export interface KrdsStepDef {
  step: string;
  /** 기준값 = KRDS PC 값(§3.3). */
  ref: number;
  /** 이 단계의 아래 경계(이상). 마지막 단계는 -Infinity. */
  min: number;
}

/** 분류별 단계(큰 것부터) — 경계는 KRDS 값의 중간점, 같은 거리면 큰 단계(§3.3). */
export const KRDS_STEPS: Readonly<Record<KrdsCategory, readonly KrdsStepDef[]>> = {
  display: [
    { step: 'large', ref: 60, min: 52 },
    { step: 'medium', ref: 44, min: -Infinity },
  ],
  heading: [
    { step: 'xlarge', ref: 40, min: 36 },
    { step: 'large', ref: 32, min: 28 },
    { step: 'medium', ref: 24, min: 21.5 },
    { step: 'small', ref: 19, min: 18 },
    { step: 'xsmall', ref: 17, min: 16 },
    { step: 'xxsmall', ref: 15, min: -Infinity },
  ],
  body: [
    { step: 'large', ref: 19, min: 18 },
    { step: 'medium', ref: 17, min: 16 },
    { step: 'small', ref: 15, min: 14 },
    { step: 'xsmall', ref: 13, min: -Infinity },
  ],
  label: [
    { step: 'large', ref: 19, min: 18 },
    { step: 'medium', ref: 17, min: 16 },
    { step: 'small', ref: 15, min: 14 },
    { step: 'xsmall', ref: 13, min: -Infinity },
  ],
};

/** 이름 짓기 입력 — 스타일 하나(§3.1). `StyleCluster` · `ExistingTextStyle` 모양 + `uiCount`. */
export interface KrdsInput {
  id?: string;
  name?: string;
  fontSize: number;
  lineHeight: number;
  lineHeightPercent?: number;
  letterSpacing: number;
  family: string;
  style: string;
  count: number;
  uiCount: number;
}

export type KrdsPath = 'scan' | 'rename';

/** 소수 첫째 자리 반올림(0 쪽 대칭, -0 없음) — 크기 · 자간 표기값(§3.1 · §3.8). */
export function round1(n: number): number {
  const r = (Math.sign(n) * Math.round(Math.abs(n) * 10)) / 10;
  return r === 0 ? 0 : r;
}

/** 이름에 쓰는 숫자 표기 — 소수점 `_`, 음수 `m`(§0). 예 26.7 → `26_7`, -0.3 → `m0_3`. */
export function krdsNum(n: number): string {
  return String(round1(n)).replace('-', 'm').replace('.', '_');
}

/** 폭 · 광학 수식어(§3.1). semi · extra · ultra 접두는 수식어와 함께 뗀다("SemiCondensed"가 600으로 읽히지 않게). */
const WIDTH_OPTICAL_RE =
  /(?:semi|extra|ultra)?[\s_-]*(?:condensed|narrow|compressed|expanded|extended|wide|display|text|caption|micro)/gi;

/** 스타일 이름 → 굵기 · 기울임(§3.1). splitWeightStyle을 감싸 폭 · 광학 수식어를 뗀 뒤 읽는다. 모르는 이름은 400. */
export function weightOf(style: string): { weight: number; italic: boolean } {
  const stripped = String(style ?? '').replace(WIDTH_OPTICAL_RE, ' ');
  const r = splitWeightStyle(stripped);
  const weight = Number.isFinite(r.weight) && r.weight >= 1 && r.weight <= 1000 ? r.weight : 400;
  return { weight, italic: r.italic };
}

/** 줄 높이 %(§3.1) — 0 = AUTO → 'auto', 아니면 정수 반올림. */
export function lineHeightPct(i: Pick<KrdsInput, 'fontSize' | 'lineHeight' | 'lineHeightPercent'>): number | 'auto' {
  if (!i.lineHeight) return 'auto';
  const p = i.lineHeightPercent ? i.lineHeightPercent : i.fontSize ? (i.lineHeight / i.fontSize) * 100 : 0;
  return Math.round(p);
}

const LABEL_TOKENS = new Set(['label', 'button', 'btn', 'chip', 'input', 'field']);

/** 분류(§3.2) — 위에서부터 처음 맞는 것. scan: uiCount × 2 ≥ count(uiCount > 0), rename: 이름 조각. */
export function krdsCategory(input: KrdsInput, path: KrdsPath = 'scan'): KrdsCategory {
  if (path === 'scan') {
    const ui = input.uiCount ?? 0;
    if (ui > 0 && ui * 2 >= (input.count ?? 0)) return 'label';
  } else {
    const tokens = String(input.name ?? '')
      .split(/[/\-_\s]+/)
      .map((t) => t.toLowerCase());
    if (tokens.some((t) => LABEL_TOKENS.has(t))) return 'label';
  }
  const { weight } = weightOf(input.style);
  const size = round1(input.fontSize);
  if (weight >= 600 && size >= 42) return 'display';
  if (weight >= 600) return 'heading';
  return 'body';
}

/** 단계 정의(§3.3) — 크기는 표기값으로 판정. */
export function krdsStepDef(category: KrdsCategory, size: number): KrdsStepDef {
  const d = round1(size);
  const steps = KRDS_STEPS[category];
  return steps.find((s) => d >= s.min) ?? steps[steps.length - 1];
}

/** 크기 → 단계 이름(§3.3). */
export function krdsStep(category: KrdsCategory, size: number): string {
  return krdsStepDef(category, size).step;
}

/** 문자 코드 순 비교(§3.10 — localeCompare 아님). */
const cmpStr = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

const slug = (s: string): string =>
  s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const sigOf = (i: KrdsInput): string => `${i.fontSize}|${i.lineHeight}|${i.letterSpacing}|${i.family}|${i.style}`;

interface Work {
  idx: number;
  input: KrdsInput;
  cat: KrdsCategory;
  step: KrdsStepDef;
  size: number; // 표기값
  weight: number;
  italic: boolean;
  lh: number | 'auto';
  ls: number; // 자간 표기값
  count: number;
  /** §3.5 ~ §3.7까지의 이름(§3.8 꼬리 전). */
  base: string;
  /** §3.8-1 · -2 꼬리(-ls… · 글꼴) — 강제 꼬리 뒤에 그대로 둔다. */
  lastTail: string;
  name: string;
}

/** 묶음별로 나눈다(삽입 순서 유지). */
function groupBy<T>(items: readonly T[], key: (t: T) => string): T[][] {
  const m = new Map<string, T[]>();
  for (const it of items) {
    const k = key(it);
    const l = m.get(k);
    if (l) l.push(it);
    else m.set(k, [it]);
  }
  return [...m.values()];
}

/** §3.8-3 정렬 — 쓰인 곳 많은 순 → 시그니처 문자열 순 → 지금 이름 순 → id 순. */
const cmpLast = (a: Work, b: Work): number =>
  b.count - a.count ||
  cmpStr(sigOf(a.input), sigOf(b.input)) ||
  cmpStr(a.input.name ?? '', b.input.name ?? '') ||
  cmpStr(a.input.id ?? '', b.input.id ?? '') ||
  a.idx - b.idx;

const weightKey = (w: { weight: number; italic: boolean }): string => `${w.weight}${w.italic ? 'i' : ''}`;
const lhTail = (lh: number | 'auto'): string => (lh === 'auto' ? '-auto' : lh === 150 ? '' : `-${lh}`);

/**
 * 스타일 묶음 → KRDS 이름(입력 순서대로 하나씩). §3.4 ~ §3.8.
 * - `anchored`: 입력 index → 그대로 쓸 기존 이름(꼬리 계산에서 빠지고, 그 이름은 사용 중).
 * - `reserved`: 처음부터 사용 중인 이름(이 파일의 로컬 텍스트 스타일 이름) — 겹치면 강제 꼬리.
 * - `path`: 'scan'(uiCount로 label 판정) · 'rename'(지금 이름 조각으로 판정).
 */
export function nameKrdsStyles(
  inputs: readonly KrdsInput[],
  opts: { reserved?: ReadonlySet<string>; anchored?: ReadonlyMap<number, string>; path?: KrdsPath } = {},
): string[] {
  const path = opts.path ?? 'scan';
  const anchored = opts.anchored ?? new Map<number, string>();
  const out: string[] = inputs.map((_, i) => anchored.get(i) ?? '');

  const works: Work[] = [];
  inputs.forEach((input, idx) => {
    if (anchored.has(idx)) return;
    const cat = krdsCategory(input, path);
    const size = round1(input.fontSize);
    const w = weightOf(input.style);
    works.push({
      idx,
      input,
      cat,
      step: krdsStepDef(cat, size),
      size,
      weight: w.weight,
      italic: w.italic,
      lh: lineHeightPct(input),
      ls: round1(input.letterSpacing || 0),
      count: input.count || 0,
      base: '',
      lastTail: '',
      name: '',
    });
  });

  // §3.5 크기 꼬리 — 같은 {분류}/{단계}에 크기가 둘 이상이면 1등만 꼬리 없이.
  const sizeKey = new Map<Work, string>(); // `{분류}/{단계}[-크기]`
  for (const g of groupBy(works, (w) => `${w.cat}/${w.step.step}`)) {
    const sizes = groupBy(g, (w) => String(w.size));
    const ref = g[0].step.ref;
    const ranked = sizes
      .map((ws) => ({ size: ws[0].size, ws, used: ws.reduce((s, w) => s + w.count, 0) }))
      .sort((a, b) => Math.abs(a.size - ref) - Math.abs(b.size - ref) || b.used - a.used || b.size - a.size);
    ranked.forEach((r, i) => {
      for (const w of r.ws) sizeKey.set(w, `${w.cat}/${w.step.step}${i === 0 ? '' : `-${krdsNum(w.size)}`}`);
    });
  }

  // §3.6 굵기 꼬리 — 기본 묶음에 드는 굵기 중 1등만 꼬리 없이, 나머지 굵기는 -w{n}[i].
  for (const g of groupBy(works, (w) => sizeKey.get(w) as string)) {
    const heavy = g[0].cat === 'display' || g[0].cat === 'heading';
    const def = heavy ? 700 : 400;
    const inDefault = (w: Work): boolean => (heavy ? w.weight >= 600 : w.weight <= 500);
    const weights = groupBy(g, weightKey)
      .filter((ws) => inDefault(ws[0]))
      .map((ws) => ({ w: ws[0], used: ws.reduce((s, x) => s + x.count, 0) }))
      .sort(
        (a, b) =>
          b.used - a.used ||
          Math.abs(a.w.weight - def) - Math.abs(b.w.weight - def) ||
          Number(a.w.italic) - Number(b.w.italic) ||
          a.w.weight - b.w.weight,
      );
    const winner = weights.length ? weightKey(weights[0].w) : null;
    for (const w of g) {
      const wt = weightKey(w) === winner ? '' : `-w${weightKey(w)}`;
      // §3.7 줄 높이 꼬리.
      w.base = `${sizeKey.get(w)}${wt}${lhTail(w.lh)}`;
      w.name = w.base;
    }
  }

  // §3.8-1 자간 — 표기가 같은 자간은 같은 것으로 본다.
  for (const g of groupBy(works, (w) => w.name)) {
    const byLs = groupBy(g, (w) => String(w.ls));
    if (byLs.length < 2) continue;
    const ranked = byLs
      .map((ws) => ({ ls: ws[0].ls, ws, used: ws.reduce((s, w) => s + w.count, 0) }))
      .sort(
        (a, b) =>
          Number(b.ls === 0) - Number(a.ls === 0) ||
          b.used - a.used ||
          Math.abs(a.ls) - Math.abs(b.ls) ||
          a.ls - b.ls,
      );
    ranked.forEach((r, i) => {
      if (i === 0) return;
      for (const w of r.ws) {
        w.lastTail += `-ls${krdsNum(w.ls)}`;
        w.name = w.base + w.lastTail;
      }
    });
  }

  // §3.8-2 글꼴 — 쓰인 곳 많은 글꼴(같으면 글꼴 이름 순 앞)이 그대로.
  for (const g of groupBy(works, (w) => w.name)) {
    const byFam = groupBy(g, (w) => w.input.family);
    if (byFam.length < 2) continue;
    const ranked = byFam
      .map((ws) => ({ fam: ws[0].input.family, ws, used: ws.reduce((s, w) => s + w.count, 0) }))
      .sort((a, b) => b.used - a.used || cmpStr(a.fam, b.fam));
    ranked.forEach((r, i) => {
      if (i === 0) return;
      for (const w of r.ws) {
        w.lastTail += `-${slug(w.input.family) || 'font'}`;
        w.name = w.base + w.lastTail;
      }
    });
  }

  // §3.8-3 그래도 같으면 정렬 1등이 그대로, 나머지 -2 · -3.
  for (const g of groupBy(works, (w) => w.name)) {
    if (g.length < 2) continue;
    [...g].sort(cmpLast).forEach((w, i) => {
      if (i > 0) w.name = `${w.name}-${i + 1}`;
    });
  }

  // §3.4 예약 이름과 견준다 — 겹친 스타일만 강제 꼬리, 그래도 겹치면 -2 · -3.
  const taken = new Set<string>(opts.reserved ?? []);
  for (const n of anchored.values()) taken.add(n);
  const forced: Work[] = [];
  const claimed = new Set<string>();
  for (const w of works) {
    // 예약 이름과 겹치거나, 드물게 자연 이름끼리 겹치면(예: 크기 2px 꼬리 `-2`와 §3.8-3 `-2`) 강제 꼬리로.
    if (taken.has(w.name) || claimed.has(w.name)) forced.push(w);
    else claimed.add(w.name);
  }
  for (const n of claimed) taken.add(n);
  for (const w of [...forced].sort(cmpLast)) {
    const wt = `-w${weightKey(w)}`;
    const lh = w.lh === 'auto' ? '-auto' : `-${w.lh}`;
    const name = `${w.cat}/${w.step.step}-${krdsNum(w.size)}${wt}${lh}${w.lastTail}`;
    let final = name;
    for (let k = 2; taken.has(final); k++) final = `${name}-${k}`;
    taken.add(final);
    w.name = final;
  }

  for (const w of works) out[w.idx] = w.name;
  return out;
}
