/* ============================================================
   variables.ts — 3계층 변수 생성/갱신 (Global · Semantic · Component)
   불변식: Global만 리터럴, Semantic/Component는 별칭만. upsert로 재실행 안전.
   성능: 로컬 변수를 1회만 페치해 인덱스(Map)로 O(1) upsert.
   ============================================================ */
import {
  DraftToken,
  PxConversion,
  ResolvedType,
  ScopeName,
  hexToRgb,
  numberTokenName,
  pxConversions,
  resolvedTypeForToken,
  scopesForSources,
  scopesForType,
  scopeForSemanticRole,
  toPx,
  unitDescription,
} from './tokens';
import { paletteFamilyOf } from './palette';
import { TextSample, TextStyleSpec, ExistingTextStyle } from './textStyles';

export const GLOBAL = 'Global';
export const SEMANTIC = 'Semantic';
export const COMPONENT = 'Component';

/* ---------- 변수 인덱스(이름+컬렉션 → 변수) ---------- */
type VarIndex = Map<string, Variable>;
/* 복합 키 구분자는 변수 이름에 절대 없는 NUL. 소스에는 반드시 이스케이프(\u0000)로 적는다 —
   raw NUL을 넣으면 git이 이 파일을 바이너리로 판정해 diff가 `Bin … bytes`로만 찍히고
   변경 내역을 리뷰할 수 없게 된다. */
const vkey = (collectionId: string, name: string) => `${collectionId}\u0000${name}`;

async function buildVarIndex(): Promise<VarIndex> {
  const idx: VarIndex = new Map();
  for (const v of await figma.variables.getLocalVariablesAsync()) {
    idx.set(vkey(v.variableCollectionId, v.name), v);
  }
  return idx;
}

interface Upsert {
  variable: Variable;
  created: boolean;
}

/** 이름+컬렉션으로 조회(타입 무관) → 없으면 생성. 인덱스를 갱신해 같은 실행 내 멱등 보장. */
function upsertVariable(name: string, collection: VariableCollection, type: ResolvedType, idx: VarIndex): Upsert {
  const k = vkey(collection.id, name);
  const existing = idx.get(k);
  if (existing) return { variable: existing, created: false };
  const variable = figma.variables.createVariable(name, collection, type);
  idx.set(k, variable);
  return { variable, created: true };
}

async function resolveCollections(): Promise<{ globalCol: VariableCollection; semanticCol: VariableCollection }> {
  const cols = await figma.variables.getLocalVariableCollectionsAsync();
  const globalCol = cols.find((c) => c.name === GLOBAL) ?? figma.variables.createVariableCollection(GLOBAL);
  const semanticCol = cols.find((c) => c.name === SEMANTIC) ?? figma.variables.createVariableCollection(SEMANTIC);
  return { globalCol, semanticCol };
}

export interface CreateSummary {
  created: number;
  updated: number;
  globals: number;
  semantics: number;
  /** base(px)로 px 환산되는 토큰들 — 미리보기가 base 반영 결과를 보여주는 데 쓴다. */
  conversions: PxConversion[];
}

/** Global(원시) + Semantic(별칭 미러) 생성. v1은 Semantic을 1:1 미러로 자동 생성(이름 개명은 UI에서). */
export async function createTokens(tokens: DraftToken[], base: number): Promise<CreateSummary> {
  const { globalCol, semanticCol } = await resolveCollections();
  const gMode = globalCol.defaultModeId;
  const sMode = semanticCol.defaultModeId;
  const idx = await buildVarIndex();

  const summary: CreateSummary = { created: 0, updated: 0, globals: 0, semantics: 0, conversions: pxConversions(tokens, base) };

  for (const t of tokens) {
    const type = resolvedTypeForToken(t);
    const g = upsertVariable(t.name, globalCol, type, idx);
    summary[g.created ? 'created' : 'updated']++;
    summary.globals++;

    // Global 값 = 리터럴(#16: 비-px lineHeight/letterSpacing은 px FLOAT + 원본 단위는 description)
    setGlobalLiteral(g.variable, gMode, t, type, base);
    g.variable.scopes = scopesForType(scopesForSources(t.sources), type);
    g.variable.hiddenFromPublishing = true; // 직접 사용 방지(3계층 규칙 보강)
    const desc = unitDescription(t);
    if (desc) g.variable.description = desc; // 예: "160%" — 내보내기·Figma 패널 표시

    // Semantic 미러(별칭) — 리터럴 금지, 오직 Global 참조
    const s = upsertVariable(t.name, semanticCol, type, idx);
    s.variable.setValueForMode(sMode, figma.variables.createVariableAlias(g.variable));
    s.variable.scopes = scopesForType(scopesForSources(t.sources), type);
    summary[s.created ? 'created' : 'updated']++;
    summary.semantics++;
  }

  return summary;
}

/** UX1: 토큰 생성 미리보기 — 변수를 만들지 않고 생성/갱신 예정 수만 집계(읽기 전용).
   createTokens 의 이름/부수 변수(px 스냅샷) 규칙을 그대로 모사한다.
   base는 값 환산(비-px → px)에만 쓰이므로 개수는 안 바뀌지만, 무엇이 얼마로 환산될지를
   conversions로 돌려줘 미리보기가 base 변경을 보여줄 수 있게 한다. */
export async function previewCreateTokens(tokens: DraftToken[], base: number): Promise<CreateSummary> {
  const cols = await figma.variables.getLocalVariableCollectionsAsync();
  const gId = cols.find((c) => c.name === GLOBAL)?.id ?? '#G';
  const sId = cols.find((c) => c.name === SEMANTIC)?.id ?? '#S';
  const existing = new Set<string>();
  for (const v of await figma.variables.getLocalVariablesAsync()) existing.add(vkey(v.variableCollectionId, v.name));

  const summary: CreateSummary = { created: 0, updated: 0, globals: 0, semantics: 0, conversions: pxConversions(tokens, base) };
  const seen = new Set<string>();
  const tally = (colId: string, name: string, kind: 'globals' | 'semantics'): void => {
    const k = vkey(colId, name);
    summary[kind]++;
    if (seen.has(k)) {
      summary.updated++; // 같은 실행 내 중복 이름 → 두 번째부터는 갱신
      return;
    }
    seen.add(k);
    summary[existing.has(k) ? 'updated' : 'created']++;
  };

  // #16: 토큰당 Global + Semantic 미러 1쌍(스냅샷 변수 없음).
  for (const t of tokens) {
    tally(gId, t.name, 'globals');
    tally(sId, t.name, 'semantics');
  }
  return summary;
}

function setGlobalLiteral(v: Variable, modeId: string, t: DraftToken, type: ResolvedType, base: number): void {
  if (type === 'COLOR') {
    const { r, g, b } = hexToRgb(String(t.value));
    v.setValueForMode(modeId, { r, g, b, a: 1 });
  } else if (type === 'STRING') {
    v.setValueForMode(modeId, String(t.value)); // fontFamily 등
  } else {
    // FLOAT — #16: 비-px lineHeight/letterSpacing은 px로 환산해 바인딩 가능하게(원본 단위는 description).
    // 토큰이 자기 폰트 크기를 알면 그것으로 환산한다 — 텍스트 스타일 등록은 역할마다 크기가 달라
    // base(16)로 환산하면 `150% @ 24px`가 36이 아니라 24로 굳어진다.
    const num =
      t.unit && t.unit !== 'px' && typeof t.value === 'number'
        ? toPx(t.value, t.unit, { base, fontSize: t.fontSize ?? base })
        : Number(t.value);
    v.setValueForMode(modeId, num);
  }
}

/* ============================================================
   Phase 2 — 시맨틱 별칭 매핑
   의미 토큰(예: surface, text, primary)을 Global 원시 변수에 별칭으로 연결.
   Component → Semantic → Global 단방향 규칙 준수. 리터럴 금지(별칭만).
   스코프는 역할에 맞게 부여(text→TEXT_FILL 등), 미지정 역할은 원시 스코프 상속.
   ============================================================ */
export interface SemanticSummary {
  created: number;
  updated: number;
  aliased: number;
  /** 참조 대상 Global 변수가 없어 건너뛴 이름들. */
  missing: string[];
}

/** 팔레트 재적용 시 이전 색 정리: 이번에 (재)생성하는 **hue 패밀리** 안에서 keep에 없는
   이전 스텝만 삭제(#3). 다른 패밀리·추출 hex 색·사용자 변수는 보존. 반환=삭제 수. */
export async function prunePaletteColors(keep: string[]): Promise<number> {
  const keepSet = new Set(keep);
  // 이번 팔레트가 쓰는 hue 패밀리(이 안에서만 정리 — 무관 색 보존).
  const keepFamilies = new Set(keep.map(paletteFamilyOf).filter((f): f is string => f !== null));
  const cols = await figma.variables.getLocalVariableCollectionsAsync();
  const palIds = new Set(cols.filter((c) => c.name === GLOBAL || c.name === SEMANTIC).map((c) => c.id));
  let removed = 0;
  for (const v of await figma.variables.getLocalVariablesAsync()) {
    if (!palIds.has(v.variableCollectionId)) continue;
    const fam = paletteFamilyOf(v.name);
    if (fam && keepFamilies.has(fam) && !keepSet.has(v.name)) {
      v.remove();
      removed++;
    }
  }
  return removed;
}

/** map: 시맨틱 이름 → Global 변수 이름(예: {'surface':'color/neutral/50'}). */
export async function createSemanticAliases(map: Record<string, string>): Promise<SemanticSummary> {
  const summary: SemanticSummary = { created: 0, updated: 0, aliased: 0, missing: [] };
  const cols = await figma.variables.getLocalVariableCollectionsAsync();
  const globalCol = cols.find((c) => c.name === GLOBAL);
  if (!globalCol) {
    summary.missing = Object.values(map);
    return summary; // Global이 없으면 먼저 토큰을 생성해야 함
  }
  const semanticCol = cols.find((c) => c.name === SEMANTIC) ?? figma.variables.createVariableCollection(SEMANTIC);
  const sMode = semanticCol.defaultModeId;
  const idx = await buildVarIndex();

  for (const [semName, globalName] of Object.entries(map)) {
    const g = idx.get(vkey(globalCol.id, globalName));
    if (!g) {
      summary.missing.push(globalName);
      continue;
    }
    const u = upsertVariable(semName, semanticCol, g.resolvedType, idx);
    u.variable.setValueForMode(sMode, figma.variables.createVariableAlias(g)); // 별칭만
    // 역할 기반, 없으면 원시 상속 — 단 변수 타입에 유효한 스코프만(STRING에 LINE_HEIGHT 등 금지)
    u.variable.scopes = scopesForType(scopeForSemanticRole(semName) ?? (g.scopes as ScopeName[]), g.resolvedType);
    summary[u.created ? 'created' : 'updated']++;
    summary.aliased++;
  }
  return summary;
}

/* ============================================================
   텍스트 스타일 (Phase C) — 화면 텍스트 → 변수 → 텍스트 스타일 end-to-end.
   스캔(시그니처 수집)은 순수 입력만 받고, 등록은 변수 보장(구 Phase B 흡수) →
   createTextStyle + 시맨틱 바인딩 → (옵션) 원본 노드에 스타일 적용 순.
   ============================================================ */
const roundN = (n: number, p = 2) => Math.round(n * 10 ** p) / 10 ** p;

function walkText(node: SceneNode, out: TextNode[]): void {
  if (node.visible === false) return; // 숨김 노드(및 그 하위)는 스캔/적용 대상에서 제외 — '보이는 텍스트만'
  if (node.type === 'TEXT') out.push(node);
  else if ('children' in node) for (const c of node.children) walkText(c, out);
}

export interface TextScanResult {
  samples: TextSample[];
  warnings: string[];
}

/** 디자인에서 자주 쓰는 행간 %(정수). PIXELS로만 남은 값을 비율로 되돌릴 때 허용 목록. */
const COMMON_LH_PCTS = new Set([100, 110, 120, 125, 130, 140, 150, 160, 175, 180, 200, 220, 250]);

/** 노드/세그먼트 행간 → px 시그니처 + 원본 %. */
function measureLineHeight(fontSize: number, lh: LineHeight | typeof figma.mixed): { px: number; pct: number } {
  if (lh === figma.mixed || !lh || lh.unit === 'AUTO') return { px: 0, pct: 0 };
  const unit = String(lh.unit).toUpperCase();
  if (unit === 'PERCENT') {
    return { px: roundN((fontSize * lh.value) / 100), pct: roundN(lh.value) };
  }
  const v = roundN(lh.value);
  // 스타일 없는 텍스트에서 단위가 PIXELS로 떨어지고 값만 150처럼 % 숫자인 경우 보정.
  //
  // 판정 기준은 **그 값을 px로 읽으면 말이 되는가**다. 폰트 대비 0.8~3배면 진짜 px 행간이므로
  // 손대지 않는다 — 96px 활자에 104px 행간 같은 큰 램프가 여기 걸려 104%(=99.84px)로 바뀌었다.
  // (예전 검사는 `asPx = fontSize*v/100` 을 같은 배율 범위와 비교했는데, 그건 fontSize가 약분돼
  //  `80 ≤ v ≤ 300` 이라는 항등식이라 바깥 조건에 이미 포함돼 있었다 — 아무것도 거르지 못했다.)
  if (unit === 'PIXELS' && fontSize > 0) {
    const pxRatio = v / fontSize; // 값을 px 행간으로 읽었을 때의 배율
    const plausibleAsPx = pxRatio >= 0.8 && pxRatio <= 3;
    const plausibleAsPct = v >= 100 && v <= 300; // %로 읽으면 0.8~3배가 되는 구간
    if (!plausibleAsPx && plausibleAsPct) return { px: roundN((fontSize * v) / 100), pct: v };
  }
  // UI는 150%인데 API가 24(PIXELS)만 주는 경우 — 폰트 대비 정수 %가 흔한 값이면 복구.
  // (진짜 24px 의도와 구분 불가: 텍스트 스타일 등록 맥락에선 %가 맞는 경우가 대부분.)
  if (unit === 'PIXELS' && fontSize > 0 && v > 0) {
    const pct = roundN((v / fontSize) * 100);
    const back = roundN((fontSize * pct) / 100);
    if (COMMON_LH_PCTS.has(pct) && Math.abs(back - v) <= 0.05) return { px: back, pct };
  }
  return { px: v, pct: 0 };
}

function measureLetterSpacing(fontSize: number, ls: LetterSpacing | typeof figma.mixed): { px: number; pct: number } {
  if (ls === figma.mixed || !ls) return { px: 0, pct: 0 };
  const unit = String(ls.unit).toUpperCase();
  if (unit === 'PERCENT') {
    return { px: roundN((fontSize * ls.value) / 100), pct: roundN(ls.value) };
  }
  const px = roundN(ls.value);
  // 스타일 없는 텍스트: UI는 -2%인데 API가 -0.32px만 주는 경우.
  // 흔한 정수 % 트래킹만 복구(임의 px를 %로 오인하지 않도록).
  if (unit === 'PIXELS' && fontSize > 0 && px !== 0) {
    const pct = roundN((px / fontSize) * 100);
    const back = roundN((fontSize * pct) / 100);
    const common = pct === Math.trunc(pct) && Math.abs(pct) >= 1 && Math.abs(pct) <= 10;
    if (common && Math.abs(back - px) <= 0.011) return { px: back, pct };
  }
  return { px, pct: 0 };
}

/**
 * 텍스트 노드의 균일 타이포.
 * 지정 단위(PERCENT)는 노드 필드에 있고, getStyledTextSegments는 해석된 px만
 * 돌려주는 경우가 있어 — **non-mixed면 노드 필드를 우선**한다. mixed일 때만 세그먼트.
 */
function readNodeTypography(t: TextNode): {
  fontSize: number;
  family: string;
  style: string;
  lineHeight: LineHeight | typeof figma.mixed;
  letterSpacing: LetterSpacing | typeof figma.mixed;
} | null {
  if (t.fontSize !== figma.mixed && t.fontName !== figma.mixed) {
    return {
      fontSize: t.fontSize,
      family: t.fontName.family,
      style: t.fontName.style,
      lineHeight: t.lineHeight,
      letterSpacing: t.letterSpacing,
    };
  }
  try {
    const segs = t.getStyledTextSegments(['fontSize', 'fontName', 'lineHeight', 'letterSpacing']);
    if (segs.length > 0) {
      let best = segs[0];
      for (let i = 1; i < segs.length; i++) {
        if (segs[i].end - segs[i].start > best.end - best.start) best = segs[i];
      }
      return {
        fontSize: best.fontSize,
        family: best.fontName.family,
        style: best.fontName.style,
        lineHeight: best.lineHeight,
        letterSpacing: best.letterSpacing,
      };
    }
  } catch {
    /* ignore */
  }
  return null;
}

/** 변수 description("150%" / "-2%")에서 % 숫자 추출. 별칭이면 Global까지 따라간다. */
async function percentFromVariableDescription(
  varId: string,
  cache: Map<string, Variable | null>,
): Promise<number | undefined> {
  let id: string | undefined = varId;
  const seen = new Set<string>();
  while (id && !seen.has(id)) {
    seen.add(id);
    let v = cache.get(id);
    if (v === undefined) {
      v = await figma.variables.getVariableByIdAsync(id);
      cache.set(id, v);
    }
    if (!v) return undefined;
    const desc = (v.description ?? '').trim();
    const m = /^(-?\d+(?:\.\d+)?)%$/.exec(desc);
    if (m) return roundN(Number(m[1]));
    const modeIds = Object.keys(v.valuesByMode);
    const raw = modeIds.length ? v.valuesByMode[modeIds[0]] : undefined;
    if (raw && typeof raw === 'object' && (raw as VariableAlias).type === 'VARIABLE_ALIAS') {
      id = (raw as VariableAlias).id;
      continue;
    }
    return undefined;
  }
  return undefined;
}

/** 노드에 행간/자간 변수가 묶여 있으면(해석값은 px) description의 %를 복구. */
async function percentFromNodeBinding(
  t: TextNode,
  field: 'lineHeight' | 'letterSpacing',
  cache: Map<string, Variable | null>,
): Promise<number | undefined> {
  const entry = t.boundVariables?.[field];
  if (!entry) return undefined;
  const alias = Array.isArray(entry) ? entry[0] : entry;
  if (!alias?.id) return undefined;
  return percentFromVariableDescription(alias.id, cache);
}

/** 선택 트리의 TEXT 노드에서 타이포 시그니처 수집. 부분 서식(mixed)은 스킵+경고.
   단위 우선순위: (1) 노드 지정 % (2) 묶인 변수의 description % (3) 텍스트 스타일 정의 % (4) px. */
export async function scanTextStyles(nodes: readonly SceneNode[]): Promise<TextScanResult> {
  const texts: TextNode[] = [];
  for (const n of nodes) walkText(n, texts);
  const samples: TextSample[] = [];
  const warnings = new Set<string>();
  const styleCache = new Map<string, TextStyle | null>();
  const varCache = new Map<string, Variable | null>();
  const styleOf = async (id: string): Promise<TextStyle | null> => {
    if (styleCache.has(id)) return styleCache.get(id) ?? null;
    const raw = await figma.getStyleByIdAsync(id);
    const st = raw && raw.type === 'TEXT' ? (raw as TextStyle) : null;
    styleCache.set(id, st);
    return st;
  };
  for (const t of texts) {
    const typo = readNodeTypography(t);
    if (!typo) {
      warnings.add('부분 서식(혼합) 텍스트는 스킵했습니다.');
      continue;
    }
    const fontSize = roundN(typo.fontSize);
    const { family, style } = { family: typo.family, style: typo.style };
    const lhMeas = measureLineHeight(fontSize, typo.lineHeight);
    let lineHeight = lhMeas.px;
    let lineHeightPercent = lhMeas.pct;
    const lsMeas = measureLetterSpacing(fontSize, typo.letterSpacing);
    let letterSpacing = lsMeas.px;
    let letterSpacingPercent = lsMeas.pct;

    // 변수 바인딩 → 해석 px만 남는 경우 description("%")으로 복구(스타일 없는 텍스트 포함).
    if (lineHeightPercent === 0) {
      const fromVar = await percentFromNodeBinding(t, 'lineHeight', varCache);
      if (fromVar !== undefined && fromVar > 0) {
        lineHeightPercent = fromVar;
        lineHeight = roundN((fontSize * fromVar) / 100);
      }
    }
    if (letterSpacingPercent === 0) {
      const fromVar = await percentFromNodeBinding(t, 'letterSpacing', varCache);
      if (fromVar !== undefined && fromVar !== 0) {
        letterSpacingPercent = fromVar;
        letterSpacing = roundN((fontSize * fromVar) / 100);
      }
    }

    // 이미 바인딩된 로컬 텍스트 스타일 id(혼합/없음=''). 재스캔 rename 앵커로 군집에 전달.
    const sid = t.textStyleId;
    const styleId = sid === figma.mixed ? '' : sid;
    if (styleId) {
      const st = await styleOf(styleId);
      if (st) {
        const stLh = measureLineHeight(fontSize, st.lineHeight);
        const stLs = measureLetterSpacing(fontSize, st.letterSpacing);
        if (lineHeightPercent === 0 && stLh.pct > 0) {
          lineHeightPercent = stLh.pct;
          lineHeight = stLh.px;
        }
        if (letterSpacingPercent === 0 && stLs.pct !== 0) {
          letterSpacingPercent = stLs.pct;
          letterSpacing = stLs.px;
        }
      }
    }
    let characters = '';
    try { characters = t.characters; } catch { characters = ''; }
    // HORIZONTAL 부모 = 행. 안쪽 H 행 단위 라벨 짝짓기용.
    let rowId: string | undefined;
    let indexInParent: number | undefined;
    const parent = t.parent;
    if (
      parent &&
      'layoutMode' in parent &&
      (parent as FrameNode).layoutMode === 'HORIZONTAL' &&
      'children' in parent
    ) {
      rowId = parent.id;
      indexInParent = parent.children.indexOf(t);
      if (indexInParent < 0) indexInParent = undefined;
    }
    samples.push({
      fontSize, lineHeight, lineHeightPercent, letterSpacing, letterSpacingPercent, family, style,
      layerName: t.name, styleId, characters, id: t.id, rowId, indexInParent,
    });
  }
  return { samples, warnings: [...warnings] };
}

/** 노드의 행간/자간을 스캔과 동일 규칙으로 px 환산(AUTO/혼합=0). 시그니처 일치 판정의 단일 기준. */
function lhPxOf(fontSize: number, lh: LineHeight | typeof figma.mixed): number {
  if (lh === figma.mixed || lh.unit === 'AUTO') return 0;
  return lh.unit === 'PERCENT' ? roundN((fontSize * lh.value) / 100) : roundN(lh.value);
}
/** 행간이 %면 그 값(150 = 150%), 아니면 0. 등록 단위 결정·보존 판정의 단일 기준. */
function lhPctOf(lh: LineHeight | typeof figma.mixed): number {
  if (lh === figma.mixed || lh.unit !== 'PERCENT') return 0;
  return roundN(lh.value);
}
function lsPxOf(fontSize: number, ls: LetterSpacing | typeof figma.mixed): number {
  if (ls === figma.mixed) return 0;
  return ls.unit === 'PERCENT' ? roundN((fontSize * ls.value) / 100) : roundN(ls.value);
}
/** 자간이 %면 그 값(2 = 2%, 음수 가능), 아니면 0(px 원본). */
function lsPctOf(ls: LetterSpacing | typeof figma.mixed): number {
  if (ls === figma.mixed || ls.unit !== 'PERCENT') return 0;
  return roundN(ls.value);
}

/** 로컬 텍스트 스타일 → 시그니처 매칭용 목록(행간·자간 px 환산 + 원본 %). 스캔 후보의 '이미 등록' 인식에 사용. */
export async function scanExistingTextStyles(): Promise<ExistingTextStyle[]> {
  const out: ExistingTextStyle[] = [];
  for (const s of await figma.getLocalTextStylesAsync()) {
    const fontSize = roundN(s.fontSize);
    const lineHeightPercent = lhPctOf(s.lineHeight);
    const letterSpacingPercent = lsPctOf(s.letterSpacing);
    out.push({
      id: s.id,
      name: s.name,
      fontSize,
      lineHeight: lhPxOf(fontSize, s.lineHeight),
      letterSpacing: lsPxOf(fontSize, s.letterSpacing),
      family: s.fontName.family,
      style: s.fontName.style,
      ...(lineHeightPercent ? { lineHeightPercent } : {}),
      ...(letterSpacingPercent !== 0 ? { letterSpacingPercent } : {}),
    });
  }
  return out;
}

export interface TextStyleResult {
  created: number;
  updated: number;
  bound: number;
  applied: number;
  missing: string[];
  /** 경고가 아닌 알림(의도된 미바인딩 등). missing과 섞으면 정상 동작이 경고로 읽힌다. */
  notes: string[];
}

/** 변수 보장 → 텍스트 스타일 upsert + 시맨틱 바인딩 → (apply) 원본 노드에 스타일 연결. */
export async function createSemanticTextStyles(
  specs: TextStyleSpec[],
  apply: boolean,
  nodes: readonly SceneNode[],
): Promise<TextStyleResult> {
  const res: TextStyleResult = { created: 0, updated: 0, bound: 0, applied: 0, missing: [], notes: [] };
  if (!specs.length) return res;

  // 0) 재스캔 rename 준비: boundStyleId가 **실제로 존재하는** 스타일을 가리킬 때만 rename.
  //    역할 이름 변경(old→new) 시 시맨틱 별칭 `{category}/{role}`도 옮긴다(대상이 비어 있을 때만).
  //    대상 역할이 이미 있으면 이동을 건너뛰고, 아래 aliasMap에서도 그 역할을 덮어쓰지 않는다.
  const existing = await figma.getLocalTextStylesAsync();
  const styleById = new Map<string, TextStyle>(existing.map((s) => [s.id, s]));
  const styleByName = new Map<string, TextStyle>(existing.map((s) => [s.name, s]));
  // 유효 앵커: id로 스타일을 찾은 스펙만 rename(이름만). stale id는 이름 폴백·신규와 같이 취급.
  const anchoredStyle = (spec: TextStyleSpec): TextStyle | undefined =>
    spec.boundStyleId ? styleById.get(spec.boundStyleId) : undefined;

  // 대상 이름을 다른 스타일이 이미 쓰면 rename 충돌 — 이름·시맨틱·바인딩을 건드리지 않고 보고만.
  const renameBlocked = new Set<string>(); // boundStyleId (또는 name) 키
  const roleRenames: Array<{ from: string; to: string }> = [];
  for (const spec of specs) {
    const st = anchoredStyle(spec);
    if (!st || st.name === spec.name) continue;
    const occupant = styleByName.get(spec.name);
    if (occupant && occupant.id !== st.id) {
      renameBlocked.add(spec.boundStyleId as string);
      res.missing.push(`이름 충돌 '${st.name}'→'${spec.name}' — 이미 같은 이름 스타일이 있어 rename 보류`);
      continue;
    }
    roleRenames.push({ from: st.name, to: spec.name });
  }
  if (roleRenames.length) {
    const cols0 = await figma.variables.getLocalVariableCollectionsAsync();
    const semId0 = cols0.find((c) => c.name === SEMANTIC)?.id;
    if (semId0) {
      const byName = new Map<string, Variable>();
      for (const v of await figma.variables.getLocalVariablesAsync())
        if (v.variableCollectionId === semId0) byName.set(v.name, v);
      for (const { from, to } of roleRenames)
        for (const cat of ['font-size', 'line-height', 'letter-spacing']) {
          const v = byName.get(`${cat}/${from}`);
          // 대상 역할 변수가 이미 있으면 이동 안 함 — 기존 역할 토큰을 스캔 값으로 덮지 않기 위함.
          if (v && !byName.has(`${cat}/${to}`)) {
            v.name = `${cat}/${to}`;
            byName.set(`${cat}/${to}`, v);
            byName.delete(`${cat}/${from}`);
          }
        }
    }
  }

  // 1) 변수 보장: 신규·수동 행만 스캔 스펙으로 Global/Semantic upsert.
  //    rename(유효 앵커)은 이름만 바꾸므로 aliasMap에 넣지 않음 — 기존 역할 시맨틱을 덮어쓰지 않음.
  const tokens: DraftToken[] = [];
  const seen = new Set<string>();
  const pushTok = (t: DraftToken) => {
    if (!seen.has(t.name)) {
      seen.add(t.name);
      tokens.push(t);
    }
  };
  const aliasMap: Record<string, string> = {};
  // 행간 토큰은 이름(=px)이 같아도 원본이 갈릴 수 있다(24px 역할 + 16px의 150% 역할).
  // description은 이름당 하나뿐이라 한쪽의 "150%"가 다른 역할의 내보내기까지 오염시키므로,
  // 원본이 어긋나면 px 스냅샷으로 통일하고(설명 없음) 알림만 남긴다.
  const lhTokens = new Map<string, DraftToken>();
  const pushLineHeightTok = (name: string, px: number, pct: number, fontSize: number) => {
    const prev = lhTokens.get(name);
    if (!prev) {
      const t: DraftToken =
        pct > 0
          ? { name, category: 'lineHeight', value: pct, unit: 'percent', fontSize, sources: ['lineHeight'] }
          : { name, category: 'lineHeight', value: px, unit: 'px', sources: ['lineHeight'] };
      lhTokens.set(name, t);
      pushTok(t);
      return;
    }
    const prevPct = prev.unit === 'percent' ? Number(prev.value) : 0;
    if (prevPct === pct && (pct === 0 || prev.fontSize === fontSize)) return; // 같은 원본 → 그대로
    prev.value = px;
    prev.unit = 'px';
    prev.fontSize = undefined;
    res.notes.push(`${name}: 역할마다 행간 원본이 달라 px로 기록(원본 표기 생략)`);
  };
  // 자간도 행간과 같이 이름(=px)이 같아도 원본이 갈릴 수 있다(0.32px 역할 + 16px의 2% 역할).
  const lsTokens = new Map<string, DraftToken>();
  const pushLetterSpacingTok = (name: string, px: number, pct: number, fontSize: number) => {
    const prev = lsTokens.get(name);
    if (!prev) {
      const t: DraftToken =
        pct !== 0
          ? { name, category: 'letterSpacing', value: pct, unit: 'percent', fontSize, sources: ['letterSpacing'] }
          : { name, category: 'letterSpacing', value: px, unit: 'px', sources: ['letterSpacing'] };
      lsTokens.set(name, t);
      pushTok(t);
      return;
    }
    const prevPct = prev.unit === 'percent' ? Number(prev.value) : 0;
    if (prevPct === pct && (pct === 0 || prev.fontSize === fontSize)) return; // 같은 원본 → 그대로
    prev.value = px;
    prev.unit = 'px';
    prev.fontSize = undefined;
    res.notes.push(`${name}: 역할마다 자간 원본이 달라 px로 기록(원본 표기 생략)`);
  };
  const pushAlias = (
    role: string,
    fontSize: number,
    lineHeight: number,
    letterSpacing: number,
    lineHeightPercent = 0,
    letterSpacingPercent = 0,
  ) => {
    pushTok({ name: numberTokenName('font-size', fontSize), category: 'fontSize', value: fontSize, sources: ['fontSize'] });
    aliasMap[`font-size/${role}`] = numberTokenName('font-size', fontSize);
    if (lineHeight > 0) {
      const lhName = numberTokenName('line-height', lineHeight);
      pushLineHeightTok(lhName, lineHeight, lineHeightPercent, fontSize);
      aliasMap[`line-height/${role}`] = lhName;
    }
    if (letterSpacing !== 0) {
      const lsName = numberTokenName('letter-spacing', letterSpacing);
      pushLetterSpacingTok(lsName, letterSpacing, letterSpacingPercent, fontSize);
      aliasMap[`letter-spacing/${role}`] = lsName;
    }
  };
  for (const s of specs) {
    if (anchoredStyle(s)) continue; // rename: 스캔 값으로 시맨틱 upsert 금지
    pushAlias(s.name, s.fontSize, s.lineHeight, s.letterSpacing, s.lineHeightPercent ?? 0, s.letterSpacingPercent ?? 0);
  }
  // rename인데 이동/기존 모두 없어 시맨틱이 비면, 스타일 **현재 값**으로만 생성(스캔 오버라이드 아님).
  {
    const cols0 = await figma.variables.getLocalVariableCollectionsAsync();
    const semId0 = cols0.find((c) => c.name === SEMANTIC)?.id;
    const semNames = new Set<string>();
    if (semId0)
      for (const v of await figma.variables.getLocalVariablesAsync())
        if (v.variableCollectionId === semId0) semNames.add(v.name);
    for (const s of specs) {
      const st = anchoredStyle(s);
      if (!st) continue;
      if (semNames.has(`font-size/${s.name}`)) continue; // 이미 있음(이동됐거나 대상 역할 존재) → 덮지 않음
      const fontSize = roundN(st.fontSize);
      // 스펙(스캔)이 아니라 **스타일의 현재 단위**가 기준 — 앵커 행은 타이포를 건드리지 않으므로.
      pushAlias(s.name, fontSize, lhPxOf(fontSize, st.lineHeight), lsPxOf(fontSize, st.letterSpacing), lhPctOf(st.lineHeight), lsPctOf(st.letterSpacing));
    }
  }
  if (tokens.length) await createTokens(tokens, 16);
  if (Object.keys(aliasMap).length) await createSemanticAliases(aliasMap);

  // 2) 시맨틱 변수 인덱스(이름→변수). 기존 텍스트 스타일 맵은 step 0에서 준비됨.
  const cols = await figma.variables.getLocalVariableCollectionsAsync();
  const semId = cols.find((c) => c.name === SEMANTIC)?.id;
  const semByName = new Map<string, Variable>();
  if (semId)
    for (const v of await figma.variables.getLocalVariablesAsync())
      if (v.variableCollectionId === semId) semByName.set(v.name, v);

  // 3) 텍스트 스타일 upsert + 시맨틱 바인딩. 유효 boundStyleId만 rename(이름만, 타이포 보존).
  //    이름 충돌로 막힌 rename은 스타일·바인딩을 그대로 두고 스킵(위에서 missing 보고됨).
  for (const spec of specs) {
    const anchored = anchoredStyle(spec);
    if (anchored && spec.boundStyleId && renameBlocked.has(spec.boundStyleId)) {
      continue; // 충돌 rename 보류 — 동명 스타일·잘못된 시맨틱 바인딩 방지
    }
    let style = anchored;
    if (!style) style = styleByName.get(spec.name);
    const created = !style;
    // 앵커 id로 실제 스타일을 찾았을 때만 rename. stale boundStyleId는 이름 폴백/신규처럼 타이포 기록.
    const isRename = !!anchored;
    if (!style) style = figma.createTextStyle();
    if (style.name !== spec.name) {
      styleByName.delete(style.name); // 옛 이름 인덱스 제거 — 이후 동명 행이 rename된 스타일을 가로채지 않도록.
      style.name = spec.name; // 신규=이름 지정 / 바인딩=rename
    }
    // 신규·수동 행: 타이포 전체 기록. rename: 이름만 바꾸되, 스캔이 %를 실어 오면
    // 예전에 px(+변수)로 굳은 스타일을 %로 교정한다(바인딩은 px 강제 → 반드시 해제).
    const lhPct = spec.lineHeightPercent ?? 0;
    const lsPct = spec.letterSpacingPercent ?? 0;
    if (!isRename) {
      const wanted: FontName = { family: spec.family, style: spec.style };
      let loaded: FontName;
      try {
        await figma.loadFontAsync(wanted);
        loaded = wanted;
      } catch {
        try {
          const fb: FontName = { family: spec.family, style: 'Regular' };
          await figma.loadFontAsync(fb);
          loaded = fb;
          res.missing.push(`${spec.name}: 폰트 ${spec.style}→Regular`);
        } catch {
          res.missing.push(`${spec.name}: 폰트 '${spec.family}' 없음`);
          continue;
        }
      }
      style.fontName = loaded;
      style.fontSize = spec.fontSize;
      // 순서 주의: 값을 먼저 쓰고 바인딩은 나중 — 나중에 대입하면 바인딩이 풀린다.
      style.lineHeight =
        spec.lineHeight > 0
          ? lhPct > 0
            ? { value: lhPct, unit: 'PERCENT' }
            : { value: spec.lineHeight, unit: 'PIXELS' }
          : { unit: 'AUTO' };
      // 원본이 %면 %로 등록(음수 가능). 0도 기록해 잔여 자간을 클리어한다.
      style.letterSpacing =
        lsPct !== 0
          ? { value: lsPct, unit: 'PERCENT' }
          : { value: spec.letterSpacing, unit: 'PIXELS' };
    } else if (lhPct > 0 || lsPct !== 0) {
      // rename인데 스캔 %가 있으면 단위만 교정(폰트·크기는 기존 유지).
      if (lhPct > 0) {
        style.setBoundVariable('lineHeight', null);
        style.lineHeight = { value: lhPct, unit: 'PERCENT' };
      }
      if (lsPct !== 0) {
        style.setBoundVariable('letterSpacing', null);
        style.letterSpacing = { value: lsPct, unit: 'PERCENT' };
      }
    }

    const bindRole = style.name; // rename 후 실제 이름(충돌 스킵은 위에서 continue)
    const fsVar = semByName.get(`font-size/${bindRole}`);
    if (fsVar) {
      style.setBoundVariable('fontSize', fsVar);
      res.bound++;
    } else res.missing.push(`font-size/${bindRole}`);
    if (spec.lineHeight > 0 || isRename) {
      // 지금 스타일에 들어 있는 단위가 기준 — 신규는 방금 쓴 값, rename은 교정 후 값.
      // Figma는 행간에 변수를 바인딩하면 단위를 PIXELS로 강제한다(실측). %를 지키려면 바인딩을 포기해야 하고,
      // 반대로 여기서 바인딩하면 사용자가 %로 만들어 둔 기존 스타일이 px로 뭉개진다.
      const pctNow = lhPctOf(style.lineHeight);
      if (pctNow > 0) {
        // 예전에 묶여 있던 px 변수가 남아 있으면 다시 풀린다(rename 교정 경로와 동일).
        if (style.boundVariables?.lineHeight) style.setBoundVariable('lineHeight', null);
        res.notes.push(`${bindRole}: 행간 ${pctNow}% 유지 — 변수 바인딩 생략`);
      } else {
        // rename은 스펙 lineHeight가 스캔값일 수 있어, 스타일에 바인딩할 시맨틱은 역할명 기준.
        // lineHeight>0인 신규만 필수; rename은 역할에 lh 별칭이 있으면 연결.
        const lhVar = semByName.get(`line-height/${bindRole}`);
        if (lhVar) {
          style.setBoundVariable('lineHeight', lhVar);
          res.bound++;
        } else if (spec.lineHeight > 0) res.missing.push(`line-height/${bindRole}`);
      }
    }
    if (spec.letterSpacing !== 0 || isRename) {
      // Figma는 자간 변수 바인딩도 PIXELS로 강제한다(행간과 동일). %를 지키려면 바인딩 생략.
      const lsPctNow = lsPctOf(style.letterSpacing);
      if (lsPctNow !== 0) {
        if (style.boundVariables?.letterSpacing) style.setBoundVariable('letterSpacing', null);
        res.notes.push(`${bindRole}: 자간 ${lsPctNow}% 유지 — 변수 바인딩 생략`);
      } else {
        const lsVar = semByName.get(`letter-spacing/${bindRole}`);
        if (lsVar) {
          style.setBoundVariable('letterSpacing', lsVar);
          res.bound++;
        } else if (spec.letterSpacing !== 0) res.missing.push(`letter-spacing/${bindRole}`);
      }
    }
    res[created ? 'created' : 'updated']++;
    styleByName.set(style.name, style);
  }

  // 4) (옵션) 원본 텍스트에 스타일 적용 — 패밀리+크기+굵기 일치 노드에(패밀리는 행별로 보존됨).
  if (apply) {
    const texts: TextNode[] = [];
    for (const n of nodes) walkText(n, texts);
    const loaded = new Set<string>();
    const ensureFont = async (fn: FontName): Promise<void> => {
      const k = `${fn.family} ${fn.style}`;
      if (loaded.has(k)) return;
      await figma.loadFontAsync(fn); // 노드 수정엔 현재 폰트 로드가 필요. Figma가 캐시하지만 await 중복은 피함.
      loaded.add(k);
    };
    let matched = 0;
    for (const t of texts) {
      if (t.fontSize === figma.mixed || t.fontName === figma.mixed) continue;
      const fontSize = roundN(t.fontSize);
      const fn = t.fontName; // 가드 후 FontName으로 narrowing(클로저에서 재확장 방지).
      // 노드 행간·자간을 스캔과 동일 규칙으로 px 환산(AUTO/혼합=0). 전체 시그니처가 같은 스펙에만 적용 —
      // 행간/자간을 빼고 매칭하면 같은 폰트·크기·굵기라도 행간이 다른 노드에 엉뚱한 스타일이 붙어 행간이 바뀜.
      const lhPx = lhPxOf(fontSize, t.lineHeight);
      const lsPx = lsPxOf(fontSize, t.letterSpacing);
      const spec = specs.find(
        (s) =>
          s.fontSize === fontSize &&
          s.family === fn.family &&
          s.style === fn.style &&
          s.lineHeight === lhPx &&
          s.letterSpacing === lsPx,
      );
      if (!spec) continue;
      const ts = styleByName.get(spec.name);
      if (!ts) continue; // 스타일 생성이 폰트 부재로 스킵된 경우(step 3에서 이미 missing 보고).
      matched++;
      try {
        await ensureFont(fn);
        await t.setTextStyleIdAsync(ts.id);
        res.applied++;
      } catch {
        res.missing.push(`적용 실패 '${t.name}'(폰트 로드 불가)`);
      }
    }
    if (texts.length === 0) res.missing.push('적용 대상 없음 — 선택에 텍스트 노드가 없습니다(등록 후 선택이 풀렸을 수 있음)');
    else if (matched === 0) res.missing.push('적용 매칭 0 — 선택이 스캔과 다르거나 폰트·크기·굵기·행간·자간 불일치');
  }
  return res;
}

/** 적용만(생성 없음): 선택 텍스트를 시그니처가 같은 **기존** 로컬 스타일에 바인딩.
   라이브러리에 없는 시그니처는 건드리지 않고 "먼저 등록 필요"로 보고(스타일·변수 생성/수정 없음). */
export async function applyExistingTextStyles(nodes: readonly SceneNode[]): Promise<TextStyleResult> {
  const res: TextStyleResult = { created: 0, updated: 0, bound: 0, applied: 0, missing: [], notes: [] };
  // 기존 스타일 시그니처 인덱스(중복 시그니처는 모호 → 적용 제외).
  const styleBySig = new Map<string, TextStyle | null>(); // null = 같은 시그니처 2개 이상
  for (const s of await figma.getLocalTextStylesAsync()) {
    const fontSize = roundN(s.fontSize);
    const k = `${fontSize}|${lhPxOf(fontSize, s.lineHeight)}|${lsPxOf(fontSize, s.letterSpacing)}|${s.fontName.family}|${s.fontName.style}`;
    styleBySig.set(k, styleBySig.has(k) ? null : s);
  }

  const texts: TextNode[] = [];
  for (const n of nodes) walkText(n, texts);
  const loaded = new Set<string>();
  const ensureFont = async (fn: FontName): Promise<void> => {
    const k = `${fn.family} ${fn.style}`;
    if (loaded.has(k)) return;
    await figma.loadFontAsync(fn);
    loaded.add(k);
  };

  const unregistered = new Set<string>(); // 라이브러리에 없는 시그니처(요약 보고용)
  let ambiguous = 0;
  for (const t of texts) {
    if (t.fontSize === figma.mixed || t.fontName === figma.mixed) continue;
    const fontSize = roundN(t.fontSize);
    const fn = t.fontName;
    const k = `${fontSize}|${lhPxOf(fontSize, t.lineHeight)}|${lsPxOf(fontSize, t.letterSpacing)}|${fn.family}|${fn.style}`;
    const hit = styleBySig.get(k);
    if (hit === undefined) {
      unregistered.add(`${fn.family} ${fn.style} ${fontSize}`);
      continue;
    }
    if (hit === null) {
      ambiguous++;
      continue;
    } // 같은 시그니처 스타일 2개 이상 → 어느 것에 붙일지 모호, 스킵
    try {
      await ensureFont(fn);
      await t.setTextStyleIdAsync(hit.id);
      res.applied++;
    } catch {
      res.missing.push(`적용 실패 '${t.name}'(폰트 로드 불가)`);
    }
  }
  if (texts.length === 0) res.missing.push('적용 대상 없음 — 선택에 텍스트 노드가 없습니다');
  if (unregistered.size) res.missing.push(`미등록 ${unregistered.size}종 — 먼저 등록 필요: ${[...unregistered].join(', ')}`);
  if (ambiguous) res.missing.push(`모호 ${ambiguous}개 — 같은 타이포의 스타일이 여러 개라 자동 적용 보류`);
  return res;
}
