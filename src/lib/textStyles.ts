/* ============================================================
   textStyles.ts — 텍스트 스타일(타이포) 순수 로직
   화면 텍스트 시그니처 군집 → 크기 랭킹 명명 → 스펙. Figma 호출은 variables.ts.
   ============================================================ */

/** 스캔으로 모은 텍스트 노드의 타이포 시그니처(1개 노드 = 1개 샘플). */
export interface TextSample {
  fontSize: number;
  /** px 환산 행간. 0 = AUTO(행간 없음). */
  lineHeight: number;
  /** px 자간(없으면 0). */
  letterSpacing: number;
  family: string;
  style: string; // 'Regular','Bold' 등 Figma fontName.style
  layerName: string;
}

/** 동일 시그니처를 묶은 후보(빈도 포함). */
export interface StyleCluster {
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  family: string;
  style: string;
  count: number; // 같은 시그니처 노드 수
  sample: string; // 대표 레이어 이름(명명 힌트)
}

/** 등록할 텍스트 스타일 1개. name = 바인딩할 시맨틱 역할(font-size/{name}). */
export interface TextStyleSpec {
  name: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  family: string;
  style: string;
}

/** 크기 랭킹 순으로 부여하는 기본 역할명. 초과분은 text-N. */
export const RAMP_NAMES = ['display', 'h1', 'h2', 'h3', 'title', 'body', 'caption', 'overline'] as const;

const sigKey = (s: { fontSize: number; lineHeight: number; letterSpacing: number; family: string; style: string }) =>
  `${s.fontSize}|${s.lineHeight}|${s.letterSpacing}|${s.family}|${s.style}`;

/** 텍스트 샘플 → 동일 시그니처 군집(빈도순 누적). */
export function clusterTextStyles(samples: TextSample[]): StyleCluster[] {
  const map = new Map<string, StyleCluster>();
  for (const s of samples) {
    const k = sigKey(s);
    const ex = map.get(k);
    if (ex) ex.count++;
    else
      map.set(k, {
        fontSize: s.fontSize,
        lineHeight: s.lineHeight,
        letterSpacing: s.letterSpacing,
        family: s.family,
        style: s.style,
        count: 1,
        sample: s.layerName,
      });
  }
  return [...map.values()];
}

/** 군집 → 스펙. fontSize 내림차순으로 RAMP_NAMES 배정(동률은 빈도→자간 보조정렬). */
export function nameTextStyles(clusters: StyleCluster[]): TextStyleSpec[] {
  const sorted = [...clusters].sort(
    (a, b) => b.fontSize - a.fontSize || b.count - a.count || b.lineHeight - a.lineHeight,
  );
  return sorted.map((c, i) => ({
    name: i < RAMP_NAMES.length ? RAMP_NAMES[i] : `text-${i + 1}`,
    fontSize: c.fontSize,
    lineHeight: c.lineHeight,
    letterSpacing: c.letterSpacing,
    family: c.family,
    style: c.style,
  }));
}

const STYLE_BY_WEIGHT: Record<number, string> = {
  100: 'Thin',
  200: 'ExtraLight',
  300: 'Light',
  400: 'Regular',
  500: 'Medium',
  600: 'SemiBold',
  700: 'Bold',
  800: 'ExtraBold',
  900: 'Black',
};

/** 굵기(+italic) → Figma fontName.style 문자열. splitWeightStyle(exporters)의 역방향. */
export function fontStyleForWeight(weight: number, italic = false): string {
  const base = STYLE_BY_WEIGHT[weight] ?? 'Regular';
  if (!italic) return base;
  return base === 'Regular' ? 'Italic' : `${base} Italic`;
}

interface RampEntry {
  name: string;
  fontSize: number;
  lineHeight: number;
  weight: number;
}

/** 선택이 없을 때 쓰는 기본 타입 램프(폰트 패밀리는 호출자가 주입). */
export const DEFAULT_TYPE_RAMP: RampEntry[] = [
  { name: 'display', fontSize: 48, lineHeight: 56, weight: 700 },
  { name: 'h1', fontSize: 32, lineHeight: 40, weight: 700 },
  { name: 'h2', fontSize: 24, lineHeight: 32, weight: 600 },
  { name: 'h3', fontSize: 20, lineHeight: 28, weight: 600 },
  { name: 'title', fontSize: 18, lineHeight: 24, weight: 600 },
  { name: 'body', fontSize: 16, lineHeight: 24, weight: 400 },
  { name: 'caption', fontSize: 13, lineHeight: 18, weight: 400 },
  { name: 'overline', fontSize: 11, lineHeight: 16, weight: 500 },
];

/** 기본 램프 → 스펙(주어진 패밀리로). */
export function rampToSpecs(family: string): TextStyleSpec[] {
  return DEFAULT_TYPE_RAMP.map((r) => ({
    name: r.name,
    fontSize: r.fontSize,
    lineHeight: r.lineHeight,
    letterSpacing: 0,
    family,
    style: fontStyleForWeight(r.weight, false),
  }));
}
