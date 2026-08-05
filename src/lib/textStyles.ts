/* ============================================================
   textStyles.ts — 텍스트 스타일(타이포) 순수 로직
   화면 텍스트 시그니처 군집 → 크기 랭킹 명명 → 스펙. Figma 호출은 variables.ts.
   ============================================================ */

/** 스캔으로 모은 텍스트 노드의 타이포 시그니처(1개 노드 = 1개 샘플). */
export interface TextSample {
  fontSize: number;
  /** px 환산 행간. 0 = AUTO(행간 없음). 시그니처·매칭의 단일 기준. */
  lineHeight: number;
  /** 행간 원본이 %였을 때의 값(150 = 150%). 0 = px 원본 또는 AUTO. 등록 단위 결정에만 쓴다. */
  lineHeightPercent: number;
  /** px 자간(없으면 0). */
  letterSpacing: number;
  family: string;
  style: string; // 'Regular','Bold' 등 Figma fontName.style
  layerName: string;
  /** 노드에 이미 바인딩된 로컬 텍스트 스타일 id('' = 없음/혼합). 재스캔 rename 앵커. */
  styleId: string;
  /** 화면 글자 — 행 라벨 이름 옵션용. */
  characters?: string;
  /** 노드 id — 라벨/우측 제외용. */
  id?: string;
  /** HORIZONTAL 부모(행) id. 없으면 행 짝짓기 대상 아님. */
  rowId?: string;
  /** 부모 children 내 인덱스(왼쪽이 작음). */
  indexInParent?: number;
}

/** 동일 시그니처를 묶은 후보(빈도 포함). */
export interface StyleCluster {
  fontSize: number;
  lineHeight: number;
  /** 군집의 행간 원본 %(0 = px). 섞이면 %가 이긴다 — 아래 clusterTextStyles 참고. */
  lineHeightPercent: number;
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
  /** px 환산 행간(0 = AUTO). 시맨틱 변수 값·시그니처는 항상 이 값. */
  lineHeight: number;
  /** >0이면 스타일에 %로 등록하고 행간 변수 바인딩은 생략한다(Figma가 바인딩 시 px로 강제하므로). */
  lineHeightPercent?: number;
  letterSpacing: number;
  family: string;
  style: string;
  /** 재스캔 시 이미 바인딩된 기존 스타일 id. 있으면 등록=이 스타일 rename(신규 생성 아님). */
  boundStyleId?: string;
}

/** 이미 존재하는 로컬 텍스트 스타일(시그니처 매칭용). px 환산된 행간·자간. */
export interface ExistingTextStyle {
  id: string;
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

/** 텍스트 샘플 → 동일 시그니처 군집(빈도순 누적). 바인딩된 스타일 id도 군집별로 모은다.
   시그니처는 px 환산 행간 기준이므로 `16px/150%`와 `24px` 노드가 한 군집으로 합쳐진다.
   이때 원본 단위는 **%가 이긴다** — px는 %의 환산 결과로도 설명되지만 그 반대는 아니고,
   %로 등록해 두면 크기를 바꿔도 비율이 따라오기 때문. */
export function clusterTextStyles(samples: TextSample[]): StyleCluster[] {
  const map = new Map<string, StyleCluster>();
  const ids = new Map<string, Set<string>>(); // sigKey → 바인딩된 styleId 집합('' 제외)
  for (const s of samples) {
    const k = sigKey(s);
    const ex = map.get(k);
    if (ex) {
      ex.count++;
      if (!ex.lineHeightPercent && s.lineHeightPercent) ex.lineHeightPercent = s.lineHeightPercent; // % 우선
    } else {
      map.set(k, {
        fontSize: s.fontSize,
        lineHeight: s.lineHeight,
        lineHeightPercent: s.lineHeightPercent,
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

   existing(이미 존재하는 로컬 텍스트 스타일들)을 주면, 군집을 기존 스타일에 **앵커**한다:
   (1) 노드가 그 스타일에 바인딩되고 **시그니처도 일치**하거나 (2) **시그니처가 같은 기존 스타일이 정확히 1개**.
   스타일 바인딩만 있고 로컬 오버라이드(크기·행간 등)로 시그니처가 어긋나면 앵커하지 않는다.
   앵커되면 자동 이름 대신 **기존 이름을 유지**하고 spec.boundStyleId를 채운다 — 재스캔/타프레임에서
   같은 타이포가 또 잡혀도 중복 생성 없이 그 스타일로 인식되고, 이름을 바꾸면 rename된다. */
export function nameTextStyles(clusters: StyleCluster[], existing?: ExistingTextStyle[]): TextStyleSpec[] {
  // 기존 스타일 인덱스: id→이름·시그니처, 시그니처→id(중복 시그니처는 모호 → 제외).
  const nameById = new Map<string, string>();
  const sigById = new Map<string, string>();
  const idBySig = new Map<string, string | null>(); // null = 같은 시그니처 2개 이상(모호)
  for (const e of existing ?? []) {
    nameById.set(e.id, e.name);
    const k = sigKey(e);
    sigById.set(e.id, k);
    idBySig.set(k, idBySig.has(k) ? null : e.id);
  }
  // 군집 → 앵커할 기존 스타일 id. 노드 바인딩은 시그니처 일치할 때만(오버라이드 어긋남 방지).
  const boundIdOf = (c: StyleCluster): string | undefined => {
    if (!existing) return undefined;
    if (c.styleIds.length === 1) {
      const id = c.styleIds[0];
      if (nameById.has(id) && sigById.get(id) === sigKey(c)) return id;
    }
    const sigId = idBySig.get(sigKey(c));
    return sigId && nameById.has(sigId) ? sigId : undefined;
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

  // 앵커 군집의 기존 이름을 먼저 예약 — 자동 이름이 이를 침범하지 않도록.
  for (const c of clusters) {
    const id = boundIdOf(c);
    if (id) used.add(nameById.get(id) as string);
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
        ? (nameById.get(boundId) as string) // 기존 이름 유지(예약됨 → unique 불필요)
        : unique(group.length === 1 ? base : weightUnique ? `${base}/${slug(c.style)}` : `${base}/${slug(c.family)}-${slug(c.style)}`);
      specs.push({
        name,
        fontSize: c.fontSize,
        lineHeight: c.lineHeight,
        letterSpacing: c.letterSpacing,
        family: c.family,
        style: c.style,
        ...(c.lineHeightPercent ? { lineHeightPercent: c.lineHeightPercent } : {}),
        ...(boundId ? { boundStyleId: boundId } : {}),
      });
    }
  }
  return specs;
}

/** 램프/역할형 라벨 패턴(긴 문자열용). 짧은 글자(≤24)는 패턴 없이도 이름성. */
const LABEL_RAMP_RE = /^(display|h[1-6]|title|body|caption|overline)(\/\S+)?$/i;

/** 라벨 이름성 — trim ≤24·개행 없음, 또는 램프 패턴. */
export function isRowLabelNameLike(characters: string): boolean {
  const t = characters.trim();
  if (!t || t.includes('\n')) return false;
  if (t.length <= 24) return true;
  return LABEL_RAMP_RE.test(t);
}

/**
 * 한 HORIZONTAL 행의 TEXT 샘플에서 라벨↔표본 짝.
 * 실패(모호·조건 미달) 시 null — 호출측이 랭킹 폴백.
 */
export function pairHorizontalRowLabel(
  row: readonly TextSample[],
): { label: TextSample; specimen: TextSample; labelName: string } | null {
  if (row.length < 2) return null;
  // 표본은 '가장 큰 글자'로 고르되, 맨 왼쪽이 이름성이면 표본 후보에서 뺀다.
  // 사양표는 라벨을 자기 스타일로 그리는 일이 흔해(왼쪽 'H1'을 40px로) 크기만 보면
  // 라벨이 표본으로 뽑히고, 그 왼쪽엔 아무것도 없어 행 전체가 실패한다.
  const byIndex = [...row].sort((a, b) => (a.indexInParent ?? 0) - (b.indexInParent ?? 0));
  const pool = isRowLabelNameLike(byIndex[0].characters ?? '') ? byIndex.slice(1) : byIndex;
  let specimen = pool[0];
  for (let i = 1; i < pool.length; i++) {
    const s = pool[i];
    const si = s.indexInParent ?? 0;
    const pi = specimen.indexInParent ?? 0;
    if (s.fontSize > specimen.fontSize || (s.fontSize === specimen.fontSize && si > pi)) {
      specimen = s;
    }
  }
  const specIdx = specimen.indexInParent ?? 0;
  const left = row.filter((s) => (s.indexInParent ?? 0) < specIdx);
  if (!left.length) return null;

  type Cand = { s: TextSample; score: number };
  const cands: Cand[] = [];
  for (const s of left) {
    const nameLike = isRowLabelNameLike(s.characters ?? '');
    const smaller = s.fontSize < specimen.fontSize;
    if (!nameLike && !smaller) continue;
    const idx = s.indexInParent ?? 0;
    // 왼쪽·이름성·더 작음 가산. 동점이면 행 실패.
    let score = 1000 - idx;
    if (nameLike) score += 100;
    if (smaller) score += 50;
    cands.push({ s, score });
  }
  if (!cands.length) return null;
  cands.sort((a, b) => b.score - a.score);
  if (cands.length > 1 && cands[0].score === cands[1].score) return null;
  const label = cands[0].s;
  const labelName = (label.characters ?? '').trim();
  if (!labelName) return null;
  return { label, specimen, labelName };
}

export interface RowLabelNameResult {
  styles: TextStyleSpec[];
  /** 라벨 characters로 이름 붙인 스펙 수(앵커 제외). */
  labeled: number;
  /** 랭킹 이름을 쓴 스펙 수. */
  fallback: number;
}

/**
 * 가로 행 라벨 → 스타일 이름. 확정 행의 라벨·표본 우측(및 미채택 형제)은 후보에서 제외.
 * 앵커(`boundStyleId`) 이름은 유지. 라벨 이름은 characters 그대로(trim) + unique().
 */
export function nameTextStylesWithRowLabels(
  samples: readonly TextSample[],
  existing?: ExistingTextStyle[],
): RowLabelNameResult {
  const excludeIds = new Set<string>();
  const labelBySig = new Map<string, string>();

  const byRow = new Map<string, TextSample[]>();
  for (const s of samples) {
    if (!s.rowId || s.id == null || s.indexInParent == null) continue;
    const list = byRow.get(s.rowId) ?? [];
    list.push(s);
    byRow.set(s.rowId, list);
  }

  for (const row of byRow.values()) {
    if (row.length < 2) continue;
    const pair = pairHorizontalRowLabel(row);
    if (!pair || !pair.specimen.id) continue;
    const k = sigKey(pair.specimen);
    if (!labelBySig.has(k)) labelBySig.set(k, pair.labelName);
    for (const s of row) {
      if (!s.id || s.id === pair.specimen.id) continue;
      excludeIds.add(s.id); // 라벨·우측·미채택 왼쪽 — 표본만 표에 남김
    }
  }

  const forCluster = samples.filter((s) => !s.id || !excludeIds.has(s.id));
  const styles = nameTextStyles(clusterTextStyles(forCluster), existing);

  const used = new Set<string>();
  const unique = (n: string): string => {
    const base = n || 'text';
    if (!used.has(base)) {
      used.add(base);
      return base;
    }
    let i = 2;
    while (used.has(`${base}-${i}`)) i++;
    const u = `${base}-${i}`;
    used.add(u);
    return u;
  };

  for (const s of styles) {
    if (s.boundStyleId) used.add(s.name);
  }

  let labeled = 0;
  let fallback = 0;
  for (const style of styles) {
    if (style.boundStyleId) continue;
    const label = labelBySig.get(sigKey(style));
    if (label) {
      style.name = unique(label);
      labeled++;
    }
  }
  for (const style of styles) {
    if (style.boundStyleId) continue;
    if (labelBySig.has(sigKey(style))) continue;
    style.name = unique(style.name);
    fallback++;
  }

  return { styles, labeled, fallback };
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
