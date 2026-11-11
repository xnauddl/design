/* ============================================================
   colorName.ts — 색 → hue 패밀리·스텝 분류 (순수, figma 의존 없음)
   원칙(#3): Global=원시 정체성(hue) `color/{hue}/{step}`, 역할은 Semantic 별칭으로만.
   OKLCH hue 각 → hue 이름(가장 가까운 중심), L → 스텝(50…950), 저채도 → gray.
   ============================================================ */
import { hexToOklch } from './color';

/** 토큰 스텝(머티리얼/테일윈드 관례) — palette.STEPS와 동일 값(독립 정의로 순환 방지). */
const STEP_LIST = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
/** 스텝별 기준 L(밝은 0.97 → 어두운 0.16, buildScale과 동일 램프). */
const STEP_L = STEP_LIST.map((_, i) => 0.97 + (0.16 - 0.97) * (i / (STEP_LIST.length - 1)));

/** 거의 무채색으로 보는 채도 임계(이하면 hue 불안정 → gray). */
export const ACHROMATIC_C = 0.03;

/** OKLCH hue 중심(도) → 이름. 가장 가까운 중심을 채택(각거리, wrap-around). */
const HUE_CENTERS: ReadonlyArray<{ name: string; h: number }> = [
  { name: 'red', h: 25 },
  { name: 'orange', h: 65 },
  { name: 'yellow', h: 100 },
  { name: 'green', h: 145 },
  { name: 'teal', h: 190 },
  { name: 'blue', h: 250 },
  { name: 'indigo', h: 285 },
  { name: 'purple', h: 320 },
  { name: 'pink', h: 355 },
];

/** 팔레트/분류가 만드는 hue 패밀리 목록(+무채색 gray). */
export const HUE_FAMILIES: readonly string[] = [...HUE_CENTERS.map((c) => c.name), 'gray'];

/** 두 각(0–360)의 최소 각거리. */
function angularDist(a: number, b: number): number {
  const d = Math.abs(((a - b) % 360 + 360) % 360);
  return Math.min(d, 360 - d);
}

/** OKLCH hue 각 → 가장 가까운 hue 이름(결정적, 동률은 목록 순서 우선). */
export function hueName(h: number): string {
  let best = HUE_CENTERS[0];
  let bestD = Infinity;
  for (const c of HUE_CENTERS) {
    const d = angularDist(h, c.h);
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best.name;
}

/** L(0–1) → 가장 가까운 스텝(50…950). */
export function stepForL(l: number): number {
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < STEP_LIST.length; i++) {
    const d = Math.abs(STEP_L[i] - l);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return STEP_LIST[best];
}

export interface ColorClass {
  /** hue 패밀리('blue'…) 또는 무채색 'gray'. */
  family: string;
  /** 톤 스텝(50…950). */
  step: number;
  /** 무채색 여부(채도 < 임계). */
  achromatic: boolean;
}

/** hex → hue 패밀리·스텝 분류(저채도는 gray). */
export function classifyColor(hex: string): ColorClass {
  const o = hexToOklch(hex);
  const achromatic = o.c < ACHROMATIC_C;
  // 순백·순흑은 스텝 밖의 끝점이다(Atlassian Neutral0 / Neutral1000). 50·950에 끼워 넣으면
  // #ffffff가 `gray/50-4`, #000000이 `gray/950-2`로 밀려 가장 많이 쓰는 두 색이 제일 이상한 이름을 받는다.
  if (achromatic && o.l >= 0.985) return { family: 'gray', step: 0, achromatic };
  if (achromatic && o.l <= 0.05) return { family: 'gray', step: 1000, achromatic };
  return { family: achromatic ? 'gray' : hueName(o.h), step: stepForL(o.l), achromatic };
}

/** 단계의 기준 L — gray 0 = 1.0, 1000 = 0.0(§2.12 12.11). */
export function stepRefL(step: number): number {
  if (step === 0) return 1;
  if (step === 1000) return 0;
  const i = STEP_LIST.indexOf(step as (typeof STEP_LIST)[number]);
  if (i >= 0) return STEP_L[i];
  // 가운데 단계(450 등) — 두 이웃 기준 L의 평균
  for (let k = 0; k < STEP_LIST.length - 1; k++) if ((STEP_LIST[k] + STEP_LIST[k + 1]) / 2 === step) return (STEP_L[k] + STEP_L[k + 1]) / 2;
  return NaN;
}

/** 단계의 밝은 쪽 · 어두운 쪽 가운데 단계(없으면 null — 50의 밝은 쪽 · 950의 어두운 쪽 · gray 0 · 1000 · 가운데 단계 자신). */
export function midSteps(step: number): { lighter: number | null; darker: number | null } {
  const i = STEP_LIST.indexOf(step as (typeof STEP_LIST)[number]);
  if (i < 0) return { lighter: null, darker: null };
  return { lighter: i > 0 ? (STEP_LIST[i - 1] + step) / 2 : null, darker: i < STEP_LIST.length - 1 ? (step + STEP_LIST[i + 1]) / 2 : null };
}

const cmpHex = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/**
 * 색 목록 → hue-Global 이름(`color/{hue}/{step}`, §2.12 12.11). 같은 (hue, step)에 색이 둘 이상이면 단계 기준 L에
 * 가까운 색이 단계 주인, 나머지는 밝으면 위 · 어두우면 아래 가운데 단계(450 · 550 …), 못 받으면 `-n`.
 * `opaqueCount`: 앞에서부터 그만큼이 불투명 토큰의 hex — 단계 주인 · 가운데 단계를 먼저 받는다(나머지는 반투명만 있는 hex).
 * `taken`: 이미 차 있는 이름(파일 · 이번 실행). 입력과 같은 순서로 반환.
 */
export function nameColorsByHue(hexes: readonly string[], opaqueCount = hexes.length, taken: ReadonlySet<string> = new Set()): string[] {
  const used = new Set(taken);
  const out = new Map<string, string>();
  const info = new Map(hexes.map((h) => [h, { ...classifyColor(h), l: hexToOklch(h).l }]));
  const nameOf = (fam: string, step: number): string => `color/${fam}/${step}`;
  const fallback = (base: string): string => {
    for (let i = 2; ; i++) if (!used.has(`${base}-${i}`)) return `${base}-${i}`;
  };
  const phase = (list: readonly string[]): void => {
    // ① 단계 주인
    const groups = new Map<string, string[]>();
    for (const h of list) {
      const c = info.get(h)!;
      const k = nameOf(c.family, c.step);
      groups.set(k, [...(groups.get(k) ?? []), h]);
    }
    const owners = new Map<string, string>(); // 단계 이름 → 주인 hex
    const losers: { hex: string; stepName: string; ownerL: number; step: number; fam: string }[] = [];
    for (const [k, hs] of groups) {
      const c = info.get(hs[0])!;
      const ref = stepRefL(c.step);
      const sorted = [...hs].sort((a, b) => Math.abs(info.get(a)!.l - ref) - Math.abs(info.get(b)!.l - ref) || cmpHex(a, b));
      let ownerL: number;
      let rest = sorted;
      if (!used.has(k)) {
        owners.set(k, sorted[0]);
        out.set(sorted[0], k);
        used.add(k);
        ownerL = info.get(sorted[0])!.l;
        rest = sorted.slice(1);
      } else {
        ownerL = ownerLOf.get(k) ?? ref; // 이미 차 있으면 그 자리 주인(앞 단계의 불투명 hex 또는 기준 L)
      }
      for (const h of rest) losers.push({ hex: h, stepName: k, ownerL, step: c.step, fam: c.family });
      if (owners.has(k)) ownerLOf.set(k, ownerL);
    }
    // ② 가운데 단계를 원함 — 같은 단계 · 같은 쪽에서는 주인과 가까운 한 색만
    const wants = new Map<string, { hex: string; refL: number }[]>();
    const fallbackers: { hex: string; stepName: string; refL: number }[] = [];
    const byKeySide = new Map<string, typeof losers>();
    for (const x of losers) {
      const side = info.get(x.hex)!.l > x.ownerL ? 'lighter' : 'darker';
      const key = `${x.stepName}|${side}`;
      byKeySide.set(key, [...(byKeySide.get(key) ?? []), x]);
    }
    for (const [key, xs] of byKeySide) {
      const side = key.endsWith('|lighter') ? 'lighter' : 'darker';
      const sorted = [...xs].sort((a, b) => Math.abs(info.get(a.hex)!.l - a.ownerL) - Math.abs(info.get(b.hex)!.l - b.ownerL) || cmpHex(a.hex, b.hex));
      const first = sorted[0];
      const mid = midSteps(first.step)[side];
      if (mid != null) {
        const m = nameOf(first.fam, mid);
        wants.set(m, [...(wants.get(m) ?? []), { hex: first.hex, refL: stepRefL(mid) }]);
      } else fallbackers.push({ hex: first.hex, stepName: first.stepName, refL: stepRefL(first.step) });
      for (const x of sorted.slice(1)) fallbackers.push({ hex: x.hex, stepName: x.stepName, refL: stepRefL(x.step) });
    }
    const stepOfHex = new Map(losers.map((x) => [x.hex, x]));
    for (const [m, ws] of wants) {
      const sorted = [...ws].sort((a, b) => Math.abs(info.get(a.hex)!.l - a.refL) - Math.abs(info.get(b.hex)!.l - b.refL) || cmpHex(a.hex, b.hex));
      let i = 0;
      if (!used.has(m)) {
        out.set(sorted[0].hex, m);
        used.add(m);
        i = 1;
      }
      for (const w of sorted.slice(i)) {
        const x = stepOfHex.get(w.hex)!;
        fallbackers.push({ hex: w.hex, stepName: x.stepName, refL: stepRefL(x.step) });
      }
    }
    // 되돌림 — 단계마다 기준 L에 가까운 순으로 작은 번호
    fallbackers.sort((a, b) => cmpHex(a.stepName, b.stepName) || Math.abs(info.get(a.hex)!.l - a.refL) - Math.abs(info.get(b.hex)!.l - b.refL) || cmpHex(a.hex, b.hex));
    for (const f of fallbackers) {
      const n = fallback(f.stepName);
      out.set(f.hex, n);
      used.add(n);
    }
  };
  const ownerLOf = new Map<string, number>();
  const uniq = [...new Set(hexes)];
  const opaque = uniq.filter((h) => hexes.indexOf(h) < opaqueCount);
  phase(opaque);
  phase(uniq.filter((h) => !out.has(h)));
  return hexes.map((h) => out.get(h)!);
}

/* ---------- 파일과 견주기(§2.12 12.11) ---------- */

export interface GlobalNameReq {
  /** 이번 추출이 정한 이름(반 단계 · `-n` · `-a` 포함). */
  name: string;
  /** 값 키(색 = 색 값 키, 숫자 = 소수 둘째 자리 문자열). */
  key: string;
  /** 색이면 소문자 hex. */
  hex?: string;
  /** 색 투명도 %(1이면 없음) — 이름 꼬리 `-a{%}`. */
  alphaPct?: number;
}
export interface FileGlobal {
  /** 값 키(못 읽으면 null). */
  key: string | null;
  /** 색이면 소문자 hex(못 읽으면 null). */
  hex?: string | null;
}
export interface GlobalNameResult {
  name: string;
  /** 파일의 그 변수를 쓴다(만들지 않음). */
  reuse: boolean;
}

const STEP_SET = new Set<number>([0, 1000, ...STEP_LIST]);
const COLOR_NAME_RE = /^color\/([a-z]+)\/(\d+)((?:-[a-z0-9]+)*)$/;

/** 추출 경로만 만드는 이름인가 — 반 단계(정수 단계 · 0 · 1000이 아닌 수) 또는 되돌림 `-n`(투명도 `-a`는 빼고 본다). */
export function isExtractOnlyColorName(name: string): boolean {
  const m = COLOR_NAME_RE.exec(name);
  if (!m) return false;
  if (!STEP_SET.has(Number(m[2]))) return true;
  return m[3].split('-').filter(Boolean).some((p) => /^\d+$/.test(p));
}

/**
 * 쓰임 있는 토큰들의 Global 최종 이름(§2.12 12.11 "파일과 견주기"). 덮지 않는다.
 * - 같은 이름 · 같은 값 → 재사용. 색은 같은 계열의 추출 전용 이름(반 단계 · `-n`, 그 `-a`)에 같은 값이 있어도 재사용.
 * - 차 있으면(다른 값 · 못 읽음): 정수 단계면 차지한 hex를 주인으로 반 단계, 아니면 단계 이름 + `-n`. 숫자는 이름 + `-n`.
 * - 차지 판정 = 파일 이름 + 이번 실행의 다른 토큰 이름(처음 이름 · 정한 이름). 토큰 순서대로, 같은 (이름, 값)은 같은 결과.
 * - 이름은 hex마다 한 번 — 반투명 토큰은 재사용하지 않으면 hex 이름 + `-a{%}`.
 */
export function resolveGlobalNames(reqs: readonly GlobalNameReq[], file: ReadonlyMap<string, FileGlobal>): Map<string, GlobalNameResult> {
  const out = new Map<string, GlobalNameResult>();
  const memo = new Map<string, GlobalNameResult>();
  const reserved = new Map<string, Set<string>>(); // 처음 이름 → 그 이름을 가진 토큰 값 키들
  for (const r of reqs) reserved.set(r.name, new Set([...(reserved.get(r.name) ?? []), r.key]));
  const assigned = new Map<string, string>(); // 정한 이름 → 값 키
  const hexBase = new Map<string, string>(); // hex → 정한 hex 이름(투명도 꼬리 전)
  const free = (name: string, key: string): boolean => {
    if (file.has(name)) return false;
    const a = assigned.get(name);
    if (a != null && a !== key) return false;
    const rs = reserved.get(name);
    return !rs || (rs.size === 1 && rs.has(key)) || [...rs].every((k) => k === key);
  };
  const nextN = (base: string, key: string): string => {
    for (let i = 2; ; i++) if (free(`${base}-${i}`, key)) return `${base}-${i}`;
  };
  const fileNames = [...file.keys()].sort();
  for (const r of reqs) {
    const mk = `${r.name}\u0000${r.key}`;
    const hit = memo.get(mk);
    if (hit) {
      out.set(r.name, hit);
      continue;
    }
    let res: GlobalNameResult | undefined;
    // 재사용
    if (file.get(r.name)?.key === r.key) res = { name: r.name, reuse: true };
    else if (r.hex) {
      const fam = classifyColor(r.hex).family;
      const n = fileNames.find((x) => file.get(x)?.key === r.key && COLOR_NAME_RE.exec(x)?.[1] === fam && isExtractOnlyColorName(x));
      if (n) res = { name: n, reuse: true };
    }
    if (!res) {
      if (!r.hex) res = { name: free(r.name, r.key) ? r.name : nextN(r.name, r.key), reuse: false };
      else {
        const hex = r.hex;
        const a = r.alphaPct != null && r.alphaPct < 100 ? r.alphaPct : undefined;
        let base = hexBase.get(hex);
        if (!base) {
          const orig = r.name.replace(/-a\d+(-\d+)?$/, '');
          base = baseFor(orig, hex, r.key, file, free, nextN, a != null);
          hexBase.set(hex, base);
        }
        const want = a != null ? `${base}-a${a}` : base;
        res = { name: free(want, r.key) ? want : nextN(want, r.key), reuse: false };
      }
    }
    if (!res.reuse) assigned.set(res.name, r.key);
    if (res.reuse && r.hex && !(r.alphaPct != null && r.alphaPct < 100)) hexBase.set(r.hex, res.name);
    memo.set(mk, res);
    out.set(r.name, res);
  }
  return out;
}

/** hex 이름(투명도 꼬리 전) — 비어 있으면 그대로, 차 있으면 반 단계 또는 단계 이름 + `-n`. */
function baseFor(orig: string, hex: string, key: string, file: ReadonlyMap<string, FileGlobal>, free: (n: string, k: string) => boolean, nextN: (b: string, k: string) => string, translucent: boolean): string {
  // 이름 자리가 이 hex의 것인가 — 파일에 없고 비어 있음(반투명은 같은 hex의 불투명 토큰이 그 이름을 가져도 됨), 또는 파일의 같은 이름이 같은 hex(투명도만 다름)
  const f = file.get(orig);
  if (f ? !!f.hex && f.hex === hex : free(orig, key) || translucent) return orig;
  const m = COLOR_NAME_RE.exec(orig);
  if (!m) return orig; // 색 이름 모양이 아니면 그대로(꼬리에서 -n)
  const fam = m[1];
  const step = Number(m[2]);
  const stepName = `color/${fam}/${step}`;
  const plain = m[3] === '';
  if (plain && STEP_LIST.includes(step as (typeof STEP_LIST)[number])) {
    const ownerL = f?.hex ? hexToOklch(f.hex).l : stepRefL(step);
    const side = hexToOklch(hex).l > ownerL ? 'lighter' : 'darker';
    const mid = midSteps(step)[side];
    if (mid != null && !file.has(`color/${fam}/${mid}`) && free(`color/${fam}/${mid}`, key)) return `color/${fam}/${mid}`;
  }
  if (plain && STEP_SET.has(step)) return nextN(stepName, key);
  // 이미 반 단계 · 되돌림 이름 → 그 색의 단계 이름 + -n
  const c = classifyColor(hex);
  return nextN(`color/${c.family}/${c.step}`, key);
}
