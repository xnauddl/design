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
  /** 노드에 이미 바인딩된 로컬 텍스트 스타일 id('' = 없음/혼합). 재스캔 rename 앵커. */
  styleId: string;
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
  /** 이 군집 노드들이 바인딩된 로컬 스타일 id(중복 제거, '' 제외). 정확히 1개면 rename 앵커. */
  styleIds: string[];
}

/** 등록할 텍스트 스타일 1개. name = 바인딩할 시맨틱 역할(font-size/{name}). */
export interface TextStyleSpec {
  name: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  family: string;
  style: string;
  /** 재스캔 시 이미 바인딩된 기존 스타일 id. 있으면 등록=이 스타일 rename(신규 생성 아님). */
  boundStyleId?: string;
}

/** 크기 랭킹 순으로 부여하는 기본 역할명. 초과분은 text-N. */
export const RAMP_NAMES = ['display', 'h1', 'h2', 'h3', 'title', 'body', 'caption', 'overline'] as const;

const sigKey = (s: { fontSize: number; lineHeight: number; letterSpacing: number; family: string; style: string }) =>
  `${s.fontSize}|${s.lineHeight}|${s.letterSpacing}|${s.family}|${s.style}`;

/** 텍스트 샘플 → 동일 시그니처 군집(빈도순 누적). 바인딩된 스타일 id도 군집별로 모은다. */
export function clusterTextStyles(samples: TextSample[]): StyleCluster[] {
  const map = new Map<string, StyleCluster>();
  const ids = new Map<string, Set<string>>(); // sigKey → 바인딩된 styleId 집합('' 제외)
  for (const s of samples) {
    const k = sigKey(s);
    const ex = map.get(k);
    if (ex) ex.count++;
    else {
      map.set(k, {
        fontSize: s.fontSize,
        lineHeight: s.lineHeight,
        letterSpacing: s.letterSpacing,
        family: s.family,
        style: s.style,
        count: 1,
        sample: s.layerName,
        styleIds: [],
      });
      ids.set(k, new Set());
    }
    if (s.styleId) (ids.get(k) as Set<string>).add(s.styleId);
  }
  for (const [k, c] of map) c.styleIds = [...(ids.get(k) as Set<string>)];
  return [...map.values()];
}

/** 이름 조각 정규화(소문자·영숫자 외→'-'). 예: 'SemiBold'→'semibold', 'Noto Sans KR'→'noto-sans-kr'. */
const slug = (s: string): string =>
  s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** 군집 → 스펙. **고유 크기**를 내림차순으로 RAMP_NAMES(초과분 text-N) 배정 →
   같은 크기에 스타일이 여럿이면 `base/weight`로 분기(굵기도 겹치면 `base/family-weight`).
   그 크기에 하나뿐이면 base 그대로(예: body). 끝으로 이름 유일성 보강(겹치면 -2,-3…).
   같은 크기·굵기·패밀리라도 행간/자간이 다르면 별도 군집이므로 분리 유지(병합 금지).

   existingNameById(로컬 스타일 id→현재 이름)를 주면, 정확히 1개 스타일에만 바인딩된 군집은
   자동 이름 대신 **현재 이름을 유지**하고 spec.boundStyleId를 채운다 — 재스캔 후 그 행에서
   이름을 바꾸면 등록 시 신규 생성이 아니라 그 스타일을 rename(중복·고아 방지). */
export function nameTextStyles(clusters: StyleCluster[], existingNameById?: Map<string, string>): TextStyleSpec[] {
  // 군집 → 단일 바인딩 스타일 id(있고, 그 id가 로컬에 존재할 때만).
  const boundIdOf = (c: StyleCluster): string | undefined => {
    if (!existingNameById || c.styleIds.length !== 1) return undefined;
    const id = c.styleIds[0];
    return existingNameById.has(id) ? id : undefined;
  };

  const sizesDesc = [...new Set(clusters.map((c) => c.fontSize))].sort((a, b) => b - a);
  const baseBySize = new Map<number, string>();
  sizesDesc.forEach((sz, i) => baseBySize.set(sz, i < RAMP_NAMES.length ? RAMP_NAMES[i] : `text-${i + 1}`));

  const used = new Set<string>();
  const unique = (n: string): string => {
    if (!used.has(n)) {
      used.add(n);
      return n;
    }
    let k = 2;
    while (used.has(`${n}-${k}`)) k++;
    const u = `${n}-${k}`;
    used.add(u);
    return u;
  };

  // 바인딩 군집의 현재 이름을 먼저 예약 — 자동 이름이 이를 침범하지 않도록.
  for (const c of clusters) {
    const id = boundIdOf(c);
    if (id) used.add((existingNameById as Map<string, string>).get(id) as string);
  }

  const specs: TextStyleSpec[] = [];
  for (const sz of sizesDesc) {
    const base = baseBySize.get(sz) as string;
    const group = clusters
      .filter((c) => c.fontSize === sz)
      .sort((a, b) => b.count - a.count || b.lineHeight - a.lineHeight);
    const weightUnique = new Set(group.map((c) => slug(c.style))).size === group.length;
    for (const c of group) {
      const boundId = boundIdOf(c);
      const name = boundId
        ? ((existingNameById as Map<string, string>).get(boundId) as string) // 기존 이름 유지(예약됨 → unique 불필요)
        : unique(group.length === 1 ? base : weightUnique ? `${base}/${slug(c.style)}` : `${base}/${slug(c.family)}-${slug(c.style)}`);
      specs.push({
        name,
        fontSize: c.fontSize,
        lineHeight: c.lineHeight,
        letterSpacing: c.letterSpacing,
        family: c.family,
        style: c.style,
        ...(boundId ? { boundStyleId: boundId } : {}),
      });
    }
  }
  return specs;
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
