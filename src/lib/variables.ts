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
import { mergeTokenRoles } from './roles';
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

/** Global(원시 리터럴)만 생성. Semantic 1:1 미러는 만들지 않음(#3 — 역할 별칭만 Semantic). */
export async function createTokens(tokens: DraftToken[], base: number): Promise<CreateSummary> {
  const { globalCol } = await resolveCollections();
  const gMode = globalCol.defaultModeId;
  const idx = await buildVarIndex();

  const summary: CreateSummary = { created: 0, updated: 0, globals: 0, semantics: 0, conversions: pxConversions(tokens, base) };

  for (const t of tokens) {
    const type = resolvedTypeForToken(t);
    const g = upsertVariable(t.name, globalCol, type, idx);
    summary[g.created ? 'created' : 'updated']++;
    summary.globals++;

    setGlobalLiteral(g.variable, gMode, t, type, base);
    g.variable.scopes = scopesForType(scopesForSources(t.sources), type);
    g.variable.hiddenFromPublishing = true;
    const desc = unitDescription(t);
    if (desc) g.variable.description = desc;
  }

  return summary;
}

/**
 * Global 원시 + Semantic 역할 별칭을 한 번에.
 * semanticMap 항목은 자동 추천 위에 덮어쓰고, 빠진 카테고리(간격·크기 등)는 추천으로 채운다.
 */
export async function createTokensAndRoles(
  tokens: DraftToken[],
  base: number,
  semanticMap?: Record<string, string>,
): Promise<CreateSummary> {
  const summary = await createTokens(tokens, base);
  const map = mergeTokenRoles(tokens, base, semanticMap);
  if (!Object.keys(map).length) return summary;
  const sem = await createSemanticAliases(map);
  summary.created += sem.created;
  summary.updated += sem.updated;
  summary.semantics += sem.aliased;
  return summary;
}

/** UX1: 토큰 생성 미리보기 — 변수를 만들지 않고 생성/갱신 예정 수만 집계(읽기 전용). */
export async function previewCreateTokens(
  tokens: DraftToken[],
  base: number,
  semanticMap?: Record<string, string>,
): Promise<CreateSummary> {
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
      summary.updated++;
      return;
    }
    seen.add(k);
    summary[existing.has(k) ? 'updated' : 'created']++;
  };

  for (const t of tokens) tally(gId, t.name, 'globals');
  const map = mergeTokenRoles(tokens, base, semanticMap);
  for (const semName of Object.keys(map)) tally(sId, semName, 'semantics');
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

/** 선택 트리의 TEXT 노드에서 타이포 시그니처 수집. 부분 서식(mixed)은 스킵+경고. */
export function scanTextStyles(nodes: readonly SceneNode[]): TextScanResult {
  const texts: TextNode[] = [];
  for (const n of nodes) walkText(n, texts);
  const samples: TextSample[] = [];
  const warnings = new Set<string>();
  for (const t of texts) {
    if (t.fontSize === figma.mixed || t.fontName === figma.mixed) {
      warnings.add('부분 서식(혼합) 텍스트는 스킵했습니다.');
      continue;
    }
    const fontSize = roundN(t.fontSize);
    const { family, style } = t.fontName;
    let lineHeight = 0;
    let lineHeightPercent = 0; // 원본이 %일 때만(등록 단위 결정용). 시그니처는 계속 px.
    const lh = t.lineHeight;
    if (lh !== figma.mixed && lh.unit !== 'AUTO') {
      lineHeight = lh.unit === 'PERCENT' ? roundN((fontSize * lh.value) / 100) : roundN(lh.value);
      if (lh.unit === 'PERCENT') lineHeightPercent = roundN(lh.value);
    }
    let letterSpacing = 0;
    const ls = t.letterSpacing;
    if (ls !== figma.mixed) letterSpacing = ls.unit === 'PERCENT' ? roundN((fontSize * ls.value) / 100) : roundN(ls.value);
    // 이미 바인딩된 로컬 텍스트 스타일 id(혼합/없음=''). 재스캔 rename 앵커로 군집에 전달.
    const sid = t.textStyleId;
    const styleId = sid === figma.mixed ? '' : sid;
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
      fontSize, lineHeight, lineHeightPercent, letterSpacing, family, style,
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

/** 로컬 텍스트 스타일 → 시그니처 매칭용 목록(행간·자간 px 환산). 스캔 후보의 '이미 등록' 인식에 사용. */
export async function scanExistingTextStyles(): Promise<ExistingTextStyle[]> {
  const out: ExistingTextStyle[] = [];
  for (const s of await figma.getLocalTextStylesAsync()) {
    const fontSize = roundN(s.fontSize);
    out.push({
      id: s.id,
      name: s.name,
      fontSize,
      lineHeight: lhPxOf(fontSize, s.lineHeight),
      letterSpacing: lsPxOf(fontSize, s.letterSpacing),
      family: s.fontName.family,
      style: s.fontName.style,
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
  const pushAlias = (role: string, fontSize: number, lineHeight: number, letterSpacing: number, lineHeightPercent = 0) => {
    pushTok({ name: numberTokenName('font-size', fontSize), category: 'fontSize', value: fontSize, sources: ['fontSize'] });
    aliasMap[`font-size/${role}`] = numberTokenName('font-size', fontSize);
    if (lineHeight > 0) {
      const lhName = numberTokenName('line-height', lineHeight);
      pushLineHeightTok(lhName, lineHeight, lineHeightPercent, fontSize);
      aliasMap[`line-height/${role}`] = lhName;
    }
    if (letterSpacing !== 0) {
      pushTok({ name: numberTokenName('letter-spacing', letterSpacing), category: 'letterSpacing', value: letterSpacing, unit: 'px', sources: ['letterSpacing'] });
      aliasMap[`letter-spacing/${role}`] = numberTokenName('letter-spacing', letterSpacing);
    }
  };
  for (const s of specs) {
    if (anchoredStyle(s)) continue; // rename: 스캔 값으로 시맨틱 upsert 금지
    pushAlias(s.name, s.fontSize, s.lineHeight, s.letterSpacing, s.lineHeightPercent ?? 0);
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
      pushAlias(s.name, fontSize, lhPxOf(fontSize, st.lineHeight), lsPxOf(fontSize, st.letterSpacing), lhPctOf(st.lineHeight));
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
    // 신규·수동 행만 정보 기록. rename은 정보를 건드리지 않으므로 폰트 로드도 불필요(미설치 폰트여도 안전).
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
      // 원본이 %면 %로 등록한다(스캔에서 실어 온 값). 순서 주의: lineHeight를 나중에 대입하면
      // 아래에서 건 바인딩이 조용히 풀린다 — 반드시 값 먼저, 바인딩 나중.
      const pct = spec.lineHeightPercent ?? 0;
      style.lineHeight =
        spec.lineHeight > 0
          ? pct > 0
            ? { value: pct, unit: 'PERCENT' }
            : { value: spec.lineHeight, unit: 'PIXELS' }
          : { unit: 'AUTO' };
      // 0도 기록(잔여 자간 클리어). PIXELS 단위로 통일.
      style.letterSpacing = { value: spec.letterSpacing, unit: 'PIXELS' };
    }

    const bindRole = style.name; // rename 후 실제 이름(충돌 스킵은 위에서 continue)
    const fsVar = semByName.get(`font-size/${bindRole}`);
    if (fsVar) {
      style.setBoundVariable('fontSize', fsVar);
      res.bound++;
    } else res.missing.push(`font-size/${bindRole}`);
    if (spec.lineHeight > 0 || isRename) {
      // 지금 스타일에 들어 있는 단위가 기준 — 신규는 방금 쓴 값, rename은 원래 스타일 값.
      // Figma는 행간에 변수를 바인딩하면 단위를 PIXELS로 강제한다(실측). %를 지키려면 바인딩을 포기해야 하고,
      // 반대로 여기서 바인딩하면 사용자가 %로 만들어 둔 기존 스타일이 px로 뭉개진다.
      const pctNow = lhPctOf(style.lineHeight);
      if (pctNow > 0) {
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
      const lsVar = semByName.get(`letter-spacing/${bindRole}`);
      if (lsVar) {
        style.setBoundVariable('letterSpacing', lsVar);
        res.bound++;
      } else if (spec.letterSpacing !== 0) res.missing.push(`letter-spacing/${bindRole}`);
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
