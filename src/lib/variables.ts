/* ============================================================
   variables.ts — 3계층 변수 생성/갱신 (Global · Semantic · Component)
   불변식: Global만 리터럴, Semantic/Component는 별칭만. upsert로 재실행 안전.
   성능: 로컬 변수를 1회만 페치해 인덱스(Map)로 O(1) upsert.
   ============================================================ */
import { t } from './i18n';
import { explainError } from './errors';
import {
  DraftToken,
  PxConversion,
  ResolvedType,
  ScopeName,
  hexToRgb,
  rgbToHex,
  colorKey,
  alphaPct,
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
import { resolveGlobalNames, type FileGlobal, type GlobalNameReq, type GlobalNameResult } from './colorName'; // Global 이름 · 덮지 않음(§2.12 12.11)
import { AUTO_ROLE_KEY, assignNames, colorRoleBases, colorRoleRef, colorSlotKey, valueKey, type BgKind } from './usageRoles'; // 쓰임 역할(§2.12 12.10)
import { collectionTiers, ensureOwnedCollection, ownedCollection, ownedIds } from './collectionRoles'; // 플러그인 컬렉션 · 내용으로 판단한 계층(§2.13)
import { TextSample, TextStyleSpec, ExistingTextStyle, tsSig } from './textStyles';
import { nameKrdsStyles, type KrdsInput } from './krdsType'; // KRDS 이름(docs/text-style-krds.md)
import { dsRoleOwner } from './bind'; // UI 역할 조상 탐색(docs/text-style-krds.md §3.2-1)
import { MANUAL_KEY, duplicateName } from './varKind'; // 직접 만든 변수(IA v4 §4.9)
import type { EditValue } from './varTable';
import type { TextStyleSkipReason, TextStyleApplySkipReason, TokenState, RoleRow, TsRenameRow, TsRenameItem } from '../shared/messages';

export const GLOBAL = 'Global';
export const SEMANTIC = 'Semantic';
export const COMPONENT = 'Component';

/** 직접 만든 변수(새 변수 · 복제, IA v4 §4.9)인가 — 자동 쓰기가 덮어쓰거나 지우지 않는다. */
export function isManualVar(v: Variable): boolean {
  try {
    const fn = (v as unknown as { getPluginData?: (k: string) => string }).getPluginData;
    return typeof fn === 'function' && fn.call(v, MANUAL_KEY) === '1';
  } catch {
    return false;
  }
}

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

/* ---------- 사용자 Global 재사용(§2.13 13.6) ---------- */
export const REUSE_MAP_KEY = 'dsl.reuseMap';

/** 토큰의 Global 리터럴 — 비교 · 쓰기가 같은 값을 쓴다(setGlobalLiteral과 같은 환산). */
function literalOf(t: DraftToken, type: ResolvedType, base: number): string | number {
  if (type === 'COLOR') return colorKey(String(t.value), t.alpha); // 색 값 키(hex + 투명도)
  if (type === 'STRING') return String(t.value);
  return t.unit && t.unit !== 'px' && typeof t.value === 'number' ? toPx(t.value, t.unit, { base, fontSize: t.fontSize ?? base }) : Number(t.value);
}

/** 변수의 기본 모드 직접 값(별칭이면 undefined). */
function directValue(v: Variable, modeOf: Map<string, string>): VariableValue | undefined {
  const raw = v.valuesByMode[modeOf.get(v.variableCollectionId) ?? ''];
  if (raw == null || (typeof raw === 'object' && (raw as VariableAlias).type === 'VARIABLE_ALIAS')) return undefined;
  return raw;
}

function sameLiteral(raw: VariableValue | undefined, lit: string | number, type: ResolvedType): boolean {
  if (raw == null) return false;
  if (type === 'COLOR') {
    if (typeof raw !== 'object' || !('r' in raw)) return false;
    return colorKey(rgbToHex(raw as RGB), (raw as RGBA).a) === lit; // hex · 투명도(소수 둘째 자리) 모두 같아야
  }
  if (type === 'STRING') return typeof raw === 'string' && raw === lit;
  return typeof raw === 'number' && Math.round(raw * 100) === Math.round(Number(lit) * 100);
}

/**
 * 쓰임 목록이 있는 토큰마다 재사용할 사용자 Global(같은 종류 · 같은 값 · 용도를 받는 직접 값 변수)을 고른다.
 * 사용자 컬렉션 목록 순 · 이름 순 첫 번째. 쓰임이 없는 토큰(글자 · 팔레트 · 텍스트 스타일)은 고르지 않는다.
 */
async function pickReusable(tokens: readonly DraftToken[], base: number): Promise<Map<string, Variable>> {
  const out = new Map<string, Variable>();
  const withUses = tokens.filter((t) => t.uses?.length);
  if (!withUses.length) return out;
  const cols = await figma.variables.getLocalVariableCollectionsAsync();
  const vars = await figma.variables.getLocalVariablesAsync();
  const tiers = collectionTiers(cols, vars);
  const owned = ownedIds(cols);
  const colIdx = new Map(cols.map((c, i) => [c.id, i]));
  const modeOf = new Map(cols.map((c) => [c.id, c.defaultModeId]));
  const userGlobals = vars
    .filter((v) => tiers.get(v.variableCollectionId) === 1 && !owned.has(v.variableCollectionId))
    .sort((a, b) => (colIdx.get(a.variableCollectionId) ?? 0) - (colIdx.get(b.variableCollectionId) ?? 0) || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  for (const t of withUses) {
    const type = resolvedTypeForToken(t);
    const lit = literalOf(t, type, base);
    const allowed = scopesForType(scopesForSources(t.sources), type);
    const hit = userGlobals.find((v) => {
      if (v.resolvedType !== type) return false;
      const sc = (v.scopes ?? []) as ScopeName[];
      if (!sc.includes('ALL_SCOPES' as ScopeName) && !allowed.some((x) => sc.includes(x))) return false;
      return sameLiteral(directValue(v, modeOf), lit, type);
    });
    if (hit) out.set(t.name, hit);
  }
  return out;
}

function readReuseMap(): Record<string, string> {
  try {
    const raw = (figma as unknown as { root?: { getPluginData?: (k: string) => string } }).root?.getPluginData?.(REUSE_MAP_KEY);
    const o = raw ? (JSON.parse(raw) as unknown) : {};
    return o && typeof o === 'object' && !Array.isArray(o) ? (o as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function writeReuseMap(map: Record<string, string>): void {
  try {
    (figma as unknown as { root?: { setPluginData?: (k: string, v: string) => void } }).root?.setPluginData?.(REUSE_MAP_KEY, JSON.stringify(map));
  } catch {
    /* 못 남겨도 이번 만들기는 끝난다 — 역할 매핑 표가 그 이름을 못 찾을 뿐 */
  }
}

export interface CreateSummary {
  created: number;
  updated: number;
  globals: number;
  semantics: number;
  /** base(px)로 px 환산되는 토큰들 — 미리보기가 base 반영 결과를 보여주는 데 쓴다. */
  conversions: PxConversion[];
  /** 토큰 이름 → 고른 Global id(재사용한 사용자 Global 또는 플러그인 Global) — 쓰임 역할이 별칭 대상으로 쓴다(13.6). */
  globalOf: Map<string, string>;
  /** 같은 이름의 직접 만든 변수가 값이 달라 만들지 않은 토큰 수(§4.9). 그 토큰을 가리킬 역할도 만들지 않는다. */
  skippedManual: number;
  /** 그 토큰 이름들 — 부르는 쪽이 쓰임 역할에서 뺀다. */
  skippedManualNames: Set<string>;
  /** 토큰별 상태(미리보기만, IA v4 §4.3 상태 태그) — new · update(같은 이름 있음) · reuse(있는 변수 씀 + 그 이름) · manual(값 다른 직접 만든 변수). */
  tokenStates?: Map<string, TokenState>;
  /** 쓰임 있는 토큰의 토큰 이름 → 최종 Global 이름(ia-v3 §2.12 12.11 — 파일과 견줘 바뀌었거나 재사용한 이름). */
  finalName: Map<string, string>;
}

/** 플러그인 Global의 이름 → 값 키 · hex(12.11 파일과 견주기). */
function fileGlobalsOf(col: VariableCollection | undefined, vars: readonly Variable[]): Map<string, FileGlobal> {
  const out = new Map<string, FileGlobal>();
  if (!col) return out;
  const mode = col.defaultModeId;
  for (const v of vars) {
    if (v.variableCollectionId !== col.id) continue;
    const raw = v.valuesByMode[mode];
    if (raw && typeof raw === 'object' && 'r' in raw) {
      const hex = rgbToHex(raw as RGB);
      out.set(v.name, { key: colorKey(hex, (raw as RGBA).a), hex });
    } else if (typeof raw === 'number') out.set(v.name, { key: valueKey(raw) });
    else if (typeof raw === 'string') out.set(v.name, { key: raw });
    else out.set(v.name, { key: null, hex: null }); // 별칭 · 못 읽음 → 차 있음
  }
  return out;
}

/** 쓰임 있는 토큰(사용자 Global 재사용 제외)의 최종 Global 이름(12.11) — createTokens · previewCreateTokens가 같이 쓴다. */
function resolveUsesNames(tokens: readonly DraftToken[], skip: ReadonlyMap<string, unknown>, base: number, file: ReadonlyMap<string, FileGlobal>): Map<string, GlobalNameResult> {
  const reqs: GlobalNameReq[] = [];
  for (const t of tokens) {
    if (!t.uses?.length || skip.has(t.name)) continue;
    const type = resolvedTypeForToken(t);
    const lit = literalOf(t, type, base);
    if (type === 'COLOR') {
      const hex = String(t.value).toLowerCase();
      reqs.push({ name: t.name, key: String(lit), hex, ...(t.alpha != null && t.alpha < 1 ? { alphaPct: alphaPct(t.alpha) } : {}) });
    } else reqs.push({ name: t.name, key: typeof lit === 'number' ? valueKey(lit) : String(lit) });
  }
  return resolveGlobalNames(reqs, file);
}

/**
 * Global(원시) 생성. Semantic은 **역할 별칭만**(createSemanticAliases) — 예전의 1:1 거울
 * (`color/gray/950` 같은 Global 이름을 Semantic에도 복사)은 걷었다. 디자이너가 보는 Semantic이
 * Global 복사본 106개 + 역할 4개로 보여 "시맨틱이 아니다"가 됐고, Lightning·Atlassian 어느 쪽도
 * 거울 계층을 두지 않는다. 역할 없는 값은 바인딩이 Global에 직접 붙는다(bind.ts).
 * Semantic 컬렉션은 역할 단계가 쓸 수 있게 미리 만들어 둔다(빈 컬렉션).
 */
export async function createTokens(tokens: DraftToken[], base: number): Promise<CreateSummary> {
  const reuse = await pickReusable(tokens, base);
  const summary: CreateSummary = { created: 0, updated: 0, globals: 0, semantics: 0, conversions: pxConversions(tokens, base), globalOf: new Map(), skippedManual: 0, skippedManualNames: new Set(), finalName: new Map() };
  const reuseMap = readReuseMap();
  const toCreate = tokens.filter((t) => !reuse.has(t.name));
  for (const [name, v] of reuse) {
    summary.globalOf.set(name, v.id);
    reuseMap[name] = v.id;
  }
  if (toCreate.length) {
    // 플러그인 Global은 실제로 만들 때만 만든다(13.2-3 — 모두 재사용이면 생기지 않는다).
    const globalCol = ensureOwnedCollection(await figma.variables.getLocalVariableCollectionsAsync(), 'global');
    const gMode = globalCol.defaultModeId;
    const idx = await buildVarIndex();
    // 쓰임 있는 토큰은 파일과 견줘 덮지 않는다(12.11) — 최종 이름 · 재사용.
    const named = resolveUsesNames(toCreate, reuse, base, fileGlobalsOf(globalCol, [...idx.values()]));
    // 같은 실행에서 같은 이름이 두 번 오면(채움색 #000 + 그림자색 #000) 스코프를 덮지 않고 합친다.
    const touched = new Set<string>();
    for (const t of toCreate) {
      const type = resolvedTypeForToken(t);
      const nm = named.get(t.name);
      if (nm) {
        summary.finalName.set(t.name, nm.name);
        const g = upsertVariable(nm.name, globalCol, type, idx);
        const key = vkey(globalCol.id, nm.name);
        const scopes = scopesForType(scopesForSources(t.sources), type);
        summary.globalOf.set(t.name, g.variable.id);
        delete reuseMap[t.name];
        if (nm.reuse) {
          // 값은 바꾸지 않고 용도는 합친다(12.11)
          g.variable.scopes = scopesForType([...new Set([...(g.variable.scopes as ScopeName[]), ...scopes])], type);
          touched.add(key);
          continue;
        }
        if (g.created) {
          summary.created++;
          summary.globals++;
          setGlobalLiteral(g.variable, gMode, t, type, base);
          g.variable.hiddenFromPublishing = true;
          const desc = unitDescription(t);
          if (desc) g.variable.description = desc;
        }
        g.variable.scopes = touched.has(key) ? scopesForType([...new Set([...(g.variable.scopes as ScopeName[]), ...scopes])], type) : scopes;
        touched.add(key);
        continue;
      }
      // 같은 이름의 직접 만든 변수(§4.9): 값이 같으면 그 변수를 이 토큰의 Global로 쓰고(재사용), 다르면 건너뛴다.
      const mine = idx.get(vkey(globalCol.id, t.name));
      if (mine && isManualVar(mine)) {
        if (!summary.skippedManualNames.has(t.name) && mine.resolvedType === type && sameLiteral(mine.valuesByMode[gMode], literalOf(t, type, base), type)) {
          summary.globalOf.set(t.name, mine.id);
          delete reuseMap[t.name];
        } else if (!summary.skippedManualNames.has(t.name)) {
          summary.globalOf.delete(t.name);
          summary.skippedManualNames.add(t.name);
          summary.skippedManual++;
        }
        continue;
      }
      const g = upsertVariable(t.name, globalCol, type, idx);
      summary[g.created ? 'created' : 'updated']++;
      summary.globals++;
      summary.globalOf.set(t.name, g.variable.id);
      delete reuseMap[t.name];
      // Global 값 = 리터럴(#16: 비-px lineHeight/letterSpacing은 px FLOAT + 원본 단위는 description)
      setGlobalLiteral(g.variable, gMode, t, type, base);
      const scopes = scopesForType(scopesForSources(t.sources), type);
      const key = vkey(globalCol.id, t.name);
      const merged = touched.has(key) ? scopesForType([...new Set([...(g.variable.scopes as ScopeName[]), ...scopes])], type) : scopes;
      touched.add(key);
      g.variable.scopes = merged;
      g.variable.hiddenFromPublishing = true; // 직접 사용 방지(3계층 규칙 보강)
      const desc = unitDescription(t);
      if (desc) g.variable.description = desc; // 예: "160%" — 내보내기·Figma 패널 표시
    }
  }
  writeReuseMap(reuseMap);
  return summary;
}

/** UX1: 토큰 생성 미리보기 — 변수를 만들지 않고 생성/갱신 예정 수만 집계(읽기 전용).
   createTokens 의 이름/부수 변수(px 스냅샷) 규칙을 그대로 모사한다.
   base는 값 환산(비-px → px)에만 쓰이므로 개수는 안 바뀌지만, 무엇이 얼마로 환산될지를
   conversions로 돌려줘 미리보기가 base 변경을 보여줄 수 있게 한다. */
export async function previewCreateTokens(tokens: DraftToken[], base: number): Promise<CreateSummary> {
  const cols = await figma.variables.getLocalVariableCollectionsAsync();
  const gId = ownedCollection(cols, 'global')?.id ?? '#G';
  const reuse = await pickReusable(tokens, base);
  const existing = new Set<string>();
  for (const v of await figma.variables.getLocalVariablesAsync()) existing.add(vkey(v.variableCollectionId, v.name));

  const states = new Map<string, TokenState>();
  const summary: CreateSummary = { created: 0, updated: 0, globals: 0, semantics: 0, conversions: pxConversions(tokens, base), globalOf: new Map(), skippedManual: 0, skippedManualNames: new Set(), tokenStates: states, finalName: new Map() };
  // 같은 이름이 두 번 오면 첫 판정을 그대로 둔다(태그는 이름당 하나).
  const setState = (name: string, st: TokenState): void => {
    if (!states.has(name)) states.set(name, st);
  };
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

  // 같은 이름의 직접 만든 변수(§4.9) — createTokens와 같은 판정(값이 같으면 재사용, 다르면 건너뜀).
  const gCol = cols.find((c) => c.id === gId);
  const manualByName = new Map<string, Variable>();
  if (gCol) for (const v of await figma.variables.getLocalVariablesAsync()) if (v.variableCollectionId === gId && isManualVar(v)) manualByName.set(v.name, v);
  // 쓰임 있는 토큰은 파일과 견줘 최종 이름(12.11) — createTokens와 같은 함수.
  const allVars = await figma.variables.getLocalVariablesAsync();
  const named = resolveUsesNames(tokens, reuse, base, fileGlobalsOf(gCol, allVars));
  // 토큰당 Global 1개(거울 없음 — createTokens와 동일). 재사용하는 사용자 Global은 세지 않는다(13.6).
  for (const t of tokens) {
    const r = reuse.get(t.name);
    if (r) {
      summary.globalOf.set(t.name, r.id);
      setState(t.name, { state: 'reuse', varName: r.name });
      continue;
    }
    const nm = named.get(t.name);
    if (nm) {
      summary.finalName.set(t.name, nm.name);
      if (nm.reuse) {
        const v = allVars.find((x) => x.variableCollectionId === gId && x.name === nm.name);
        if (v) summary.globalOf.set(t.name, v.id);
        setState(t.name, { state: 'reuse', varName: nm.name });
        continue;
      }
      setState(t.name, nm.name !== t.name ? { state: 'new', varName: nm.name } : { state: 'new' });
      tally(gId, nm.name, 'globals');
      continue;
    }
    const mine = manualByName.get(t.name);
    if (mine && gCol) {
      const type = resolvedTypeForToken(t);
      if (!summary.skippedManualNames.has(t.name) && mine.resolvedType === type && sameLiteral(mine.valuesByMode[gCol.defaultModeId], literalOf(t, type, base), type)) {
        summary.globalOf.set(t.name, mine.id);
        setState(t.name, { state: 'reuse', varName: mine.name });
      } else if (!summary.skippedManualNames.has(t.name)) {
        summary.globalOf.delete(t.name);
        summary.skippedManualNames.add(t.name);
        summary.skippedManual++;
        states.set(t.name, { state: 'manual' }); // 같은 실행의 두 번째가 값이 달라도 건너뜀이 이긴다(위 판정과 같게)
      }
      continue;
    }
    setState(t.name, { state: existing.has(vkey(gId, t.name)) ? 'update' : 'new' });
    tally(gId, t.name, 'globals');
  }
  return summary;
}

/**
 * 쓰임 역할 만들기(§2.12 12.10) — 토큰의 쓰임(`uses`)마다 Semantic 역할을 만든다(같은 처리 · 같은 ⌘Z).
 * 숫자는 쓰임 이름 그대로, 색은 쓰임별 밝기 이름(colorRoleBases). 이름 꼬리(12.5): 같은 값 · 맞는 용도가 이미 있으면 그 이름을
 * 쓰고(만들지 않음), 다른 값이 차지했으면 후보 목록의 다음 꼬리. 이미 있는 역할의 값은 바꾸지 않는다.
 * preview면 만들지 않고 만들 수만 센다. 반환 = 새로 만든(만들) 역할 수.
 * rowsOut을 주면 preview일 때 셀 역할마다 {이름, 가리킬 Global 이름, 만든 토큰 이름}을 넣는다(IA v4 §4.3 `roleRows` — 길이 = 반환값).
 */
export async function createUsageRoles(tokens: readonly DraftToken[], preview = false, globalOf?: ReadonlyMap<string, string>, rowsOut?: RoleRow[], finalName?: ReadonlyMap<string, string>): Promise<number> {
  const withUses = tokens.filter((t) => t.uses?.length);
  if (!withUses.length) return 0;
  const cols = await figma.variables.getLocalVariableCollectionsAsync();
  const vars = await figma.variables.getLocalVariablesAsync();
  const tiers = collectionTiers(cols, vars);
  const owned = ownedIds(cols);
  const byId = new Map(vars.map((v) => [v.id, v]));
  const modeOf = new Map(cols.map((c) => [c.id, c.defaultModeId]));
  const resolve = (v: Variable): VariableValue | undefined => {
    let cur: Variable | undefined = v;
    for (let i = 0; i < 12 && cur; i++) {
      const val: VariableValue | undefined = cur.valuesByMode[modeOf.get(cur.variableCollectionId) ?? ''];
      if (val && typeof val === 'object' && (val as VariableAlias).type === 'VARIABLE_ALIAS') cur = byId.get((val as VariableAlias).id);
      else return val;
    }
    return undefined;
  };
  const keyOfValue = (val: VariableValue | undefined): string => {
    if (val == null) return '';
    if (typeof val === 'object' && 'r' in val) return colorKey(rgbToHex(val as RGB), (val as RGBA).a); // 색 값 키
    return typeof val === 'number' || typeof val === 'string' ? valueKey(val) : '';
  };
  // 이미 있는 이름 = Semantic 계층 전부(플러그인 · 사용자)의 이름 → 값 묶음. 같은 이름이면 사용자 컬렉션 먼저 · 목록 순(13.5).
  const colIdx = new Map(cols.map((c, i) => [c.id, i]));
  const rank = (id: string): number => (owned.has(id) ? 1e6 : 0) + (colIdx.get(id) ?? 0);
  const existing = new Map<string, string[]>();
  const semByName = new Map<string, { key: string; v: Variable }[]>(); // 재사용 판정용(12.5 — 같은 값 · 맞는 용도 · 거울 아님)
  for (const v of vars.filter((x) => tiers.get(x.variableCollectionId) === 2).sort((a, b) => rank(a.variableCollectionId) - rank(b.variableCollectionId))) {
    const k = keyOfValue(resolve(v));
    const arr = existing.get(v.name);
    if (!arr) existing.set(v.name, k ? [k] : []);
    else if (k && !arr.includes(k)) arr.push(k);
    semByName.set(v.name, [...(semByName.get(v.name) ?? []), { key: k, v }]);
  }
  const globalNames = new Set(vars.filter((x) => tiers.get(x.variableCollectionId) === 1).map((x) => x.name));
  const canReuse = (name: string, value: string, base: string): boolean => {
    if (globalNames.has(name)) return false; // 거울(12.7)
    const need = scopeForSemanticRole(base);
    return (semByName.get(name) ?? []).some(({ key, v }) => {
      if (key !== value) return false;
      if (!need) return true;
      const sc = (v.scopes ?? []) as string[];
      return sc.includes('ALL_SCOPES') || need.every((x) => sc.includes(x));
    });
  };
  // 별칭 대상 — createTokens가 고른 Global(사용자 것일 수 있다). 없으면 플러그인 Global에서 이름으로.
  const pluginGlobal = ownedCollection(cols, 'global');
  const globalFor = (t: DraftToken): Variable | undefined => {
    const id = globalOf?.get(t.name);
    if (id) return byId.get(id);
    const nm = finalName?.get(t.name) ?? t.name; // 파일과 견줘 바뀐 최종 이름(12.11)
    return pluginGlobal ? vars.find((v) => v.variableCollectionId === pluginGlobal.id && v.name === nm) : undefined;
  };

  // 요청 — 숫자는 쓰임 이름, 색은 쓰임별 밝기 이름.
  const reqs: { base: string; value: string; count: number; token: DraftToken; refHex?: string }[] = [];
  const colorUses = new Map<string, { token: DraftToken; count: number; bg?: BgKind }[]>();
  for (const t of withUses) {
    for (const u of t.uses ?? []) {
      if (u.name.startsWith('color/')) {
        const arr = colorUses.get(u.name) ?? [];
        arr.push({ token: t, count: u.count, bg: u.bg });
        colorUses.set(u.name, arr);
      } else reqs.push({ base: u.name, value: valueKey(t.value), count: u.count, token: t });
    }
  }
  for (const [use, list] of colorUses) {
    // 입력 = (hex · 배경 종류 · 곳 수) — inverse 여부는 함수 안에서 기준색을 정한 뒤 판정한다(12.4).
    const defKey = existing.get(`${use}/default`)?.[0];
    const bases = colorRoleBases(
      list.map((x) => ({ hex: String(x.token.value), count: x.count, bg: x.bg, alpha: x.token.alpha })),
      defKey || undefined, // 색 값 키여도 colorRoleBases가 hex만 본다
      use.slice('color/'.length),
    );
    const refHex = colorRoleRef(
      list.map((x) => ({ hex: String(x.token.value), count: x.count, bg: x.bg, alpha: x.token.alpha })),
      defKey || undefined,
    );
    for (const x of list) {
      const hex = String(x.token.value).toLowerCase();
      // 값 = 색 값 키 — 같은 hex · 다른 투명도는 다른 값이라 투명도 단계로 갈린다(default · default-subtle, 12.5)
      reqs.push({ base: `${use}/${bases.get(colorSlotKey(hex, x.bg, x.token.alpha)) ?? 'default'}`, value: colorKey(hex, x.token.alpha), count: x.count, token: x.token, ...(refHex ? { refHex } : {}) });
    }
  }
  const names = assignNames(reqs, existing, { canReuse });
  const toMake = new Map<string, DraftToken>();
  for (const r of reqs) {
    const name = names.get(`${r.base}\u0000${r.value}`) ?? r.base;
    if (existing.has(name) || toMake.has(name)) continue; // 재사용(같은 값 · 맞는 용도) — 차지된 이름은 assignNames가 피했다
    toMake.set(name, r.token);
  }
  if (preview) {
    if (rowsOut) {
      for (const [name, t] of toMake) {
        const id = globalOf?.get(t.name);
        rowsOut.push({ name, global: (id && byId.get(id)?.name) || finalName?.get(t.name) || t.name, token: t.name });
      }
    }
    return toMake.size;
  }
  if (!toMake.size) return 0;
  const col = ensureOwnedCollection(cols, 'semantic'); // 쓰임 역할은 플러그인 Semantic에만(13.6)
  let made = 0;
  for (const [name, t] of toMake) {
    const g = globalFor(t);
    if (!g) continue;
    const v = figma.variables.createVariable(name, col, g.resolvedType);
    for (const m of col.modes) v.setValueForMode(m.modeId, figma.variables.createVariableAlias(g));
    v.scopes = scopesForType(scopeForSemanticRole(name) ?? (g.scopes as ScopeName[]), g.resolvedType as ResolvedType);
    try {
      (v as unknown as { setPluginData?: (k: string, val: string) => void }).setPluginData?.(AUTO_ROLE_KEY, '1');
    } catch {
      /* 표시를 못 남겨도 역할은 쓴다 */
    }
    made++;
  }
  return made;
}

function setGlobalLiteral(v: Variable, modeId: string, t: DraftToken, type: ResolvedType, base: number): void {
  if (type === 'COLOR') {
    const { r, g, b } = hexToRgb(String(t.value));
    v.setValueForMode(modeId, { r, g, b, a: t.alpha ?? 1 }); // 반투명 색은 투명도를 담은 Global
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
  /** 같은 이름의 직접 만든 변수라 덮어쓰지 않고 건너뛴 역할 수(§4.9). */
  skippedManual: number;
}

/** 팔레트 재적용 시 이전 색 정리: 이번에 (재)생성하는 **hue 패밀리** 안에서 keep에 없는
   이전 스텝만 삭제(#3). 다른 패밀리·추출 hex 색·사용자 변수는 보존. 반환=삭제 수. */
export async function prunePaletteColors(keep: string[]): Promise<number> {
  const keepSet = new Set(keep);
  // 이번 팔레트가 쓰는 hue 패밀리(이 안에서만 정리 — 무관 색 보존).
  const keepFamilies = new Set(keep.map(paletteFamilyOf).filter((f): f is string => f !== null));
  const cols = await figma.variables.getLocalVariableCollectionsAsync();
  const palIds = ownedIds(cols); // 플러그인 Global · Semantic 안에서만 — 사용자 컬렉션의 색은 지우지 않는다(13.7)
  let removed = 0;
  for (const v of await figma.variables.getLocalVariablesAsync()) {
    if (!palIds.has(v.variableCollectionId)) continue;
    if (isManualVar(v)) continue; // 직접 만든 변수는 지우지 않는다(§4.9)
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
  const summary: SemanticSummary = { created: 0, updated: 0, aliased: 0, missing: [], skippedManual: 0 };
  const cols = await figma.variables.getLocalVariableCollectionsAsync();
  const vars = await figma.variables.getLocalVariablesAsync();
  const tiers = collectionTiers(cols, vars);
  const modeOf = new Map(cols.map((c) => [c.id, c.defaultModeId]));
  const pluginGlobalId = ownedCollection(cols, 'global')?.id;
  const colIdx = new Map(cols.map((c, i) => [c.id, i]));
  // Global 이름은 Global 계층 전부의 직접 값 변수에서 — 플러그인 Global 먼저, 그다음 목록 순(13.7). 별칭 변수는 쓰지 않는다.
  const globals = vars
    .filter((v) => tiers.get(v.variableCollectionId) === 1 && directValue(v, modeOf) !== undefined)
    .sort((a, b) => Number(b.variableCollectionId === pluginGlobalId) - Number(a.variableCollectionId === pluginGlobalId) || (colIdx.get(a.variableCollectionId) ?? 0) - (colIdx.get(b.variableCollectionId) ?? 0));
  const byName = new Map<string, Variable>();
  for (const v of globals) if (!byName.has(v.name)) byName.set(v.name, v);
  const okIds = new Map(globals.map((v) => [v.id, v]));
  const reuseMap = readReuseMap(); // 재사용된 토큰 이름(13.6) — 낡은 항목(없음 · Global 아님 · 별칭)은 okIds에 없어 버려진다
  let semanticCol: VariableCollection | undefined;
  let idx: VarIndex | undefined;

  for (const [semName, globalName] of Object.entries(map)) {
    const g = byName.get(globalName) ?? okIds.get(reuseMap[globalName] ?? '');
    if (!g) {
      summary.missing.push(globalName);
      continue;
    }
    if (!semanticCol || !idx) {
      semanticCol = ensureOwnedCollection(cols, 'semantic'); // 역할은 플러그인 Semantic에만
      idx = await buildVarIndex();
    }
    const sMode = semanticCol.defaultModeId;
    const mine = idx.get(vkey(semanticCol.id, semName));
    if (mine && isManualVar(mine)) {
      summary.skippedManual++; // 직접 만든 변수는 덮어쓰지 않는다(§4.9)
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

/**
 * 보이는 텍스트를 모은다. `instanceOut`을 주면 인스턴스 안쪽으로는 내려가지 않고, 그 안의 보이는
 * 텍스트는 `instanceOut`에 따로 모은다(연결은 인스턴스 안쪽을 건드리지 않는다 — §2.11, 건너뜀으로 센다).
 * 주지 않으면(스캔) 예전처럼 인스턴스 안쪽까지 모은다.
 */
function walkText(node: SceneNode, out: TextNode[], instanceOut?: TextNode[]): void {
  if (node.visible === false) return; // 숨김 노드(및 그 하위)는 스캔/적용 대상에서 제외 — '보이는 텍스트만'
  if (node.type === 'TEXT') out.push(node);
  else if (instanceOut && node.type === 'INSTANCE') walkText(node, instanceOut);
  else if ('children' in node) for (const c of node.children) walkText(c, out, instanceOut);
}

export interface TextScanResult {
  samples: TextSample[];
  warnings: string[];
}

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
  // 여기서 멈춘다 — 폰트 대비 비율이 흔한 %(16/24=150%)라는 이유만으로 px를 %로 뒤집지 않는다.
  // 그 보정은 램프의 절반(16/24·24/36·32/48…)을 %로 만들고, %로 등록된 스타일은 행간 변수
  // 바인딩이 생략돼(Figma가 바인딩 시 px를 강제) 같은 램프에서 24/32는 변수가 있고 24/36은
  // 없는 상태가 됐다. 무엇보다 24px 의도와 150% 의도는 이 값만으로 구분할 수 없다 —
  // 진짜 %가 PIXELS로 떨어지는 경우는 위 판정(px로 읽으면 말이 안 되는 값)과 변수
  // description·스타일 단위 복구가 맡는다. 자간의 `authoredPx` 가드와 같은 원칙:
  // **추측이 사용자가 만든 사실을 이기면 안 된다.**
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
  //
  // px과 %는 이 폰트 크기에서 같은 값을 가리키므로 수치로는 못 가른다. 대신 **어느 쪽으로
  // 읽어야 사람이 적어 넣은 값처럼 보이는가**를 본다 — 손으로 넣는 자간은 0.5 단위(1px·-0.5px)이고,
  // %가 px로 환산돼 나온 값은 -0.32처럼 어중간하다. 0.5 배수면 px 의도로 보고 손대지 않는다.
  // (`back` 검사는 pct가 정수면 거의 항상 통과라 혼자서는 아무것도 거르지 못한다 —
  //  20px 활자에 1px 자간이 5%로 뒤집혀 변수 바인딩까지 끊겼다.)
  if (unit === 'PIXELS' && fontSize > 0 && px !== 0) {
    const authoredPx = Math.abs(px * 2 - Math.round(px * 2)) < 1e-9; // 0.5 단위 = 직접 넣은 px
    const pct = roundN((px / fontSize) * 100);
    const back = roundN((fontSize * pct) / 100);
    const common = pct === Math.trunc(pct) && Math.abs(pct) >= 1 && Math.abs(pct) <= 10;
    if (!authoredPx && common && Math.abs(back - px) <= 0.011) return { px: back, pct };
  }
  return { px, pct: 0 };
}

/**
 * 텍스트 노드의 균일 타이포.
 * 지정 단위(PERCENT)는 노드 필드에 있고 getStyledTextSegments는 해석된 px만 돌려주는 경우가
 * 있어 노드 필드를 읽는다.
 *
 * 부분 서식(mixed)은 null — 가장 긴 세그먼트로 대표시켜 세어 보기도 했으나, 두 적용 경로가
 * 모두 mixed 노드를 건너뛴다(스타일을 붙이면 구간 서식이 뭉개진다). 세기만 하면 ×N 배지와
 * '레이어 선택'이 손댈 수 없는 레이어를 가리키게 되므로 스캔도 같이 뺀다.
 */
function readNodeTypography(t: TextNode): {
  fontSize: number;
  family: string;
  style: string;
  lineHeight: LineHeight | typeof figma.mixed;
  letterSpacing: LetterSpacing | typeof figma.mixed;
} | null {
  if (t.fontSize === figma.mixed || t.fontName === figma.mixed) return null;
  return {
    fontSize: t.fontSize,
    family: t.fontName.family,
    style: t.fontName.style,
    lineHeight: t.lineHeight,
    letterSpacing: t.letterSpacing,
  };
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

/** label 분류의 UI 역할(docs/text-style-krds.md §3.2-1). */
const UI_ROLES: ReadonlySet<string> = new Set(['button', 'chip', 'input', 'field']);

/**
 * 글자 레이어가 UI 역할 안에 있나(docs/text-style-krds.md §3.2-1) — 부모부터 위로 올라가며
 * `dsRoleOwner`가 처음 값을 주는 조상에서 **멈추고**, 그 역할이 button · chip · input · field면 true.
 * 다른 역할이면 false(더 올라가지 않는다). 글자 레이어 자신은 보지 않고, 인스턴스 경계는 넘는다.
 */
function inUiRole(node: SceneNode, cache: Map<BaseNode, string | undefined>): boolean {
  let cur: BaseNode | null = node.parent;
  while (cur && cur.type !== 'PAGE' && cur.type !== 'DOCUMENT') {
    let role: string | undefined;
    if (cache.has(cur)) role = cache.get(cur);
    else {
      role = dsRoleOwner(cur as SceneNode);
      cache.set(cur, role);
    }
    if (role) return UI_ROLES.has(role);
    cur = cur.parent;
  }
  return false;
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
  const ownerCache = new Map<BaseNode, string | undefined>();
  for (const node of texts) {
    const typo = readNodeTypography(node);
    if (!typo) {
      warnings.add(t('textStyle.warnMixed'));
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
      const fromVar = await percentFromNodeBinding(node, 'lineHeight', varCache);
      if (fromVar !== undefined && fromVar > 0) {
        lineHeightPercent = fromVar;
        lineHeight = roundN((fontSize * fromVar) / 100);
      }
    }
    if (letterSpacingPercent === 0) {
      const fromVar = await percentFromNodeBinding(node, 'letterSpacing', varCache);
      if (fromVar !== undefined && fromVar !== 0) {
        letterSpacingPercent = fromVar;
        letterSpacing = roundN((fontSize * fromVar) / 100);
      }
    }

    // 이미 바인딩된 로컬 텍스트 스타일 id(혼합/없음=''). 재스캔 rename 앵커로 군집에 전달.
    const sid = node.textStyleId;
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
    try { characters = node.characters; } catch { characters = ''; }
    // HORIZONTAL 부모 = 행. 안쪽 H 행 단위 라벨 짝짓기용.
    let rowId: string | undefined;
    let indexInParent: number | undefined;
    const parent = node.parent;
    if (
      parent &&
      'layoutMode' in parent &&
      (parent as FrameNode).layoutMode === 'HORIZONTAL' &&
      'children' in parent
    ) {
      rowId = parent.id;
      indexInParent = parent.children.indexOf(node);
      if (indexInParent < 0) indexInParent = undefined;
    }
    samples.push({
      fontSize, lineHeight, lineHeightPercent, letterSpacing, letterSpacingPercent, family, style,
      layerName: node.name, styleId, characters, id: node.id, rowId, indexInParent,
      uiRole: inUiRole(node, ownerCache),
    });
  }
  return { samples, warnings: [...warnings] };
}

/** 스타일/노드의 행간을 있는 그대로 px 환산(AUTO/혼합=0) — 값을 기록하는 경로용. */
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
  return (await figma.getLocalTextStylesAsync()).map(existingOf);
}

/** 로컬 텍스트 스타일 하나 → 시그니처 매칭 모양(scanExistingTextStyles · 이름 다시 짓기의 `tsSig`가 같은 값을 쓴다). */
function existingOf(s: TextStyle): ExistingTextStyle {
  const fontSize = roundN(s.fontSize);
  const lineHeightPercent = lhPctOf(s.lineHeight);
  const letterSpacingPercent = lsPctOf(s.letterSpacing);
  return {
    id: s.id,
    name: s.name,
    fontSize,
    // 등록된 스타일은 사실이라 원값으로 잰다(applyExistingTextStyles의 인덱스와 같은 이유).
    // 스캔이 %로 등록해 둔 스타일은 lhPxOf가 %→px로 환산하므로 클러스터 측정값과 그대로 만난다.
    lineHeight: lhPxOf(fontSize, s.lineHeight),
    letterSpacing: lsPxOf(fontSize, s.letterSpacing),
    family: s.fontName.family,
    style: s.fontName.style,
    ...(lineHeightPercent ? { lineHeightPercent } : {}),
    ...(letterSpacingPercent !== 0 ? { letterSpacingPercent } : {}),
  };
}

/**
 * 글꼴 이름 → 값이 같은 Global STRING 변수(계층이 Global인 컬렉션 — 플러그인 Global · 사용자 Global 모두).
 * 여럿이면 플러그인 Global 먼저, 그다음 이름 순(IA v4 §4.3 "스타일의 글꼴 변수"). 없으면 undefined.
 */
async function globalFamilyVars(): Promise<(family: string) => Variable | undefined> {
  const cols = await figma.variables.getLocalVariableCollectionsAsync();
  const vars = await figma.variables.getLocalVariablesAsync();
  const tiers = collectionTiers(cols, vars);
  const pluginGlobalId = ownedCollection(cols, 'global')?.id;
  const modeOf = new Map(cols.map((c) => [c.id, c.defaultModeId]));
  const list = vars
    .filter((v) => v.resolvedType === 'STRING' && tiers.get(v.variableCollectionId) === 1)
    .sort((a, b) => {
      const pa = a.variableCollectionId === pluginGlobalId ? 0 : 1;
      const pb = b.variableCollectionId === pluginGlobalId ? 0 : 1;
      return pa - pb || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
    });
  return (family) => list.find((v) => directValue(v, modeOf) === family);
}

export interface TextStyleResult {
  created: number;
  updated: number;
  bound: number;
  /** 화면 노드에 스타일을 붙인 수 — `applyExistingTextStyles`만 채운다(등록은 생성까지, 결정 2026-08-06). */
  applied: number;
  missing: string[];
  /** 경고가 아닌 알림(의도된 미바인딩 등). missing과 섞으면 정상 동작이 경고로 읽힌다. */
  notes: string[];
  /** 이번에 만들거나 고친 스타일 id(바로 연결이 이 스타일만 붙인다 — IA v4 §4.3 "타이포 등록"). */
  styleIds: string[];
}

/**
 * 변수 보장 → 텍스트 스타일 upsert + 시맨틱 바인딩. 화면 연결은 하지 않는다.
 * 「등록 시 화면에 적용」 옵션 폐기(결정 2026-08-06) — 등록은 라이브러리를 만드는 일이고,
 * 화면에 붙이는 일은 「기존만 연결」(`applyExistingTextStyles`)이 맡는다. 한 버튼이 둘 다 하면
 * 되돌릴 때 무엇까지 되돌려야 하는지가 흐려진다.
 */
export async function createSemanticTextStyles(specs: TextStyleSpec[]): Promise<TextStyleResult> {
  const res: TextStyleResult = { created: 0, updated: 0, bound: 0, applied: 0, missing: [], notes: [], styleIds: [] };
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
  const roleSpecs: TextStyleSpec[] = []; // roleRenames와 같은 순서 — 3단계 뒤 되돌림(§5.3)
  for (const spec of specs) {
    const st = anchoredStyle(spec);
    if (!st || st.name === spec.name) continue;
    const occupant = styleByName.get(spec.name);
    if (occupant && occupant.id !== st.id) {
      renameBlocked.add(spec.boundStyleId as string);
      res.missing.push(t('textStyle.missRename', { from: st.name, to: spec.name }));
      continue;
    }
    roleRenames.push({ from: st.name, to: spec.name });
    roleSpecs.push(spec);
  }
  // 역할 변수 이름을 **먼저** 바꾼다 — 3단계가 `font-size/{새 이름}`으로 변수를 찾아 붙이므로(docs/text-style-krds.md §5.3
  // "두 경로의 순서가 다르다"). 이름 다시 짓기와 같은 공용 함수(직접 만든 변수 · 사용자 컬렉션은 건드리지 않음,
  // 최종 집합 밖의 다른 변수와 이름이 겹치면 건너뜀 — 기존 역할 토큰을 스캔 값으로 덮지 않기 위함).
  const roleMoved = roleRenames.length ? (await renameTextRoleVars(roleRenames)).moved : [];

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
    res.notes.push(t('textStyle.noteLhPx', { name }));
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
    res.notes.push(t('textStyle.noteLsPx', { name }));
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
    // 행간·자간 변수는 **px 정수로 직접 지정된 스타일만**(A안). %는 스타일이 보관하고 변수를 만들지
    // 않는다 — 글자 크기마다 px가 달라 역할 하나에 변수 하나가 성립하지 않고(19.2·28.8 소수),
    // 스타일마다 변수가 생겨 49개까지 불었다(extract.ts 같은 자리의 설명 참고).
    if (lineHeight > 0 && lineHeightPercent === 0 && Number.isInteger(lineHeight)) {
      const lhName = numberTokenName('line-height', lineHeight);
      pushLineHeightTok(lhName, lineHeight, 0, fontSize);
      aliasMap[`line-height/${role}`] = lhName;
    }
    if (letterSpacing !== 0 && letterSpacingPercent === 0 && Number.isInteger(letterSpacing)) {
      const lsName = numberTokenName('letter-spacing', letterSpacing);
      pushLetterSpacingTok(lsName, letterSpacing, 0, fontSize);
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
    const semId0 = ownedCollection(cols0, 'semantic')?.id;
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
  const semId = ownedCollection(cols, 'semantic')?.id;
  const semByName = new Map<string, Variable>();
  if (semId)
    for (const v of await figma.variables.getLocalVariablesAsync())
      if (v.variableCollectionId === semId) semByName.set(v.name, v);
  const familyVarFor = await globalFamilyVars();

  // 3) 텍스트 스타일 upsert + 시맨틱 바인딩. 유효 boundStyleId만 rename(이름만, 타이포 보존).
  //    이름 충돌로 막힌 rename은 스타일·바인딩을 그대로 두고 스킵(위에서 missing 보고됨).
  for (const spec of specs) {
    const anchored = anchoredStyle(spec);
    if (anchored && spec.boundStyleId && renameBlocked.has(spec.boundStyleId)) {
      continue; // 충돌 rename 보류 — 동명 스타일·잘못된 시맨틱 바인딩 방지
    }
    let style: TextStyle | undefined = anchored ?? styleByName.get(spec.name);
    const created = !style;
    // 앵커 id로 실제 스타일을 찾았을 때만 rename. stale boundStyleId는 이름 폴백/신규처럼 타이포 기록.
    const isRename = !!anchored;
    const setName = (st: TextStyle): void => {
      if (st.name === spec.name) return;
      styleByName.delete(st.name); // 옛 이름 인덱스 제거 — 이후 동명 행이 rename된 스타일을 가로채지 않도록.
      st.name = spec.name; // 신규=이름 지정 / 바인딩=rename (이름 쓰기는 글꼴 없이 된다)
    };
    // 스타일 하나의 오류로 단계가 멈추지 않게 — 그 행만 건너뛴다(IA v4 §4.3 "글꼴").
    try {
    // 피그마는 글꼴을 불러오지 않은 스타일에 값 쓰기를 막는다 — 쓰기 전에 글꼴부터(§4.3 "글꼴").
    let loaded: FontName | null = null;
    if (!isRename) {
      const wanted: FontName = { family: spec.family, style: spec.style };
      try {
        await figma.loadFontAsync(wanted);
        loaded = wanted;
      } catch {
        try {
          const fb: FontName = { family: spec.family, style: 'Regular' };
          await figma.loadFontAsync(fb);
          loaded = fb;
          res.missing.push(t('textStyle.missStyle', { name: spec.name, style: spec.style }));
        } catch {
          res.missing.push(t('textStyle.missFamily', { name: spec.name, family: spec.family }));
          continue; // 새 스타일은 아직 만들지 않았다 — 빈 스타일이 남지 않는다
        }
      }
    } else {
      // 이미 있는 스타일(앵커) — 지금 글꼴을 불러온다. Regular로 대신하지 않는다(타이포 보존).
      const fn = (style as TextStyle).fontName;
      try {
        await figma.loadFontAsync(fn);
      } catch {
        setName(style as TextStyle);
        res.missing.push(t('textStyle.missFontKeep', { name: spec.name, font: `${fn.family} ${fn.style}` }));
        styleByName.set(spec.name, style as TextStyle);
        continue; // 값 · 연결은 건너뛰고, updated · styleIds에도 넣지 않는다
      }
    }
    if (!style) style = figma.createTextStyle();
    setName(style);
    // 신규·수동 행: 타이포 전체 기록. rename: 이름만 바꾸되, 스캔이 %를 실어 오면
    // 예전에 px(+변수)로 굳은 스타일을 %로 교정한다(바인딩은 px 강제 → 반드시 해제).
    const lhPct = spec.lineHeightPercent ?? 0;
    const lsPct = spec.letterSpacingPercent ?? 0;
    if (!isRename && loaded) {
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
      //
      // 단, **이미 변수가 묶여 있으면 손대지 않는다**. 그 연결은 사용자가(또는 이 플러그인이
      // 지난 실행에서) 만든 명시적 사실이고, %는 px 값을 보고 세운 추측이다. 추측이 사실을
      // 지우면 되돌릴 방법이 없다 — 값을 안 바꾼 재스캔·재등록만으로 디자인 시스템 연결이
      // 끊기던 자리다. 바인딩이 없을 때만 단위를 교정한다.
      if (lhPct > 0) {
        if (style.boundVariables?.lineHeight) res.notes.push(t('textStyle.noteKeepLh', { name: spec.name, n: lhPct }));
        else style.lineHeight = { value: lhPct, unit: 'PERCENT' };
      }
      if (lsPct !== 0) {
        if (style.boundVariables?.letterSpacing) res.notes.push(t('textStyle.noteKeepLs', { name: spec.name, n: lsPct }));
        else style.letterSpacing = { value: lsPct, unit: 'PERCENT' };
      }
    }

    const bindRole = style.name; // rename 후 실제 이름(충돌 스킵은 위에서 continue)
    const fsVar = semByName.get(`font-size/${bindRole}`);
    if (fsVar) {
      style.setBoundVariable('fontSize', fsVar);
      res.bound++;
    } else res.missing.push(t('textStyle.missVar', { name: bindRole, var: `font-size/${bindRole}` }));
    if (spec.lineHeight > 0 || isRename) {
      // 지금 스타일에 들어 있는 단위가 기준 — 신규는 방금 쓴 값, rename은 교정 후 값.
      // Figma는 행간에 변수를 바인딩하면 단위를 PIXELS로 강제한다(실측). %를 지키려면 바인딩을 포기해야 하고,
      // 반대로 여기서 바인딩하면 사용자가 %로 만들어 둔 기존 스타일이 px로 뭉개진다.
      const pctNow = lhPctOf(style.lineHeight);
      if (pctNow > 0) {
        // 예전에 묶여 있던 px 변수가 남아 있으면 다시 풀린다(rename 교정 경로와 동일).
        if (style.boundVariables?.lineHeight) style.setBoundVariable('lineHeight', null);
        res.notes.push(t('textStyle.noteLhPct', { role: bindRole, n: pctNow }));
      } else {
        // rename은 스펙 lineHeight가 스캔값일 수 있어, 스타일에 바인딩할 시맨틱은 역할명 기준.
        // lineHeight>0인 신규만 필수; rename은 역할에 lh 별칭이 있으면 연결.
        const lhVar = semByName.get(`line-height/${bindRole}`);
        if (lhVar) {
          style.setBoundVariable('lineHeight', lhVar);
          res.bound++;
        } else if (spec.lineHeight > 0 && Number.isInteger(spec.lineHeight)) res.missing.push(t('textStyle.missVar', { name: bindRole, var: `line-height/${bindRole}` })); // 소수 px는 변수를 안 만드는 게 규칙이라 누락이 아니다
      }
    }
    if (spec.letterSpacing !== 0 || isRename) {
      // Figma는 자간 변수 바인딩도 PIXELS로 강제한다(행간과 동일). %를 지키려면 바인딩 생략.
      const lsPctNow = lsPctOf(style.letterSpacing);
      if (lsPctNow !== 0) {
        if (style.boundVariables?.letterSpacing) style.setBoundVariable('letterSpacing', null);
        res.notes.push(t('textStyle.noteLsPct', { role: bindRole, n: lsPctNow }));
      } else {
        const lsVar = semByName.get(`letter-spacing/${bindRole}`);
        if (lsVar) {
          style.setBoundVariable('letterSpacing', lsVar);
          res.bound++;
        } else if (spec.letterSpacing !== 0 && Number.isInteger(spec.letterSpacing)) res.missing.push(t('textStyle.missVar', { name: bindRole, var: `letter-spacing/${bindRole}` }));
      }
    }
    // 글꼴 — 값이 같은 Global STRING 변수가 있으면 붙인다(IA v4 §4.3 "스타일의 글꼴 변수"). 없으면 만들지 않는다.
    const famVar = familyVarFor(style.fontName.family);
    if (famVar) {
      style.setBoundVariable('fontFamily', famVar);
      res.bound++;
    }
    res[created ? 'created' : 'updated']++;
    if (!res.styleIds.includes(style.id)) res.styleIds.push(style.id);
    styleByName.set(style.name, style);
    } catch (e) {
      // 도중 오류 — 쓴 값은 그대로(⌘Z 한 번에 단계 전체), 세지 않는다. 만든 스타일은 같은 이름 뒤 행이 또 만들지 않게 기억.
      res.missing.push(t('textStyle.missError', { name: spec.name, error: explainError(e instanceof Error ? e.message : String(e)).message }));
      if (style) styleByName.set(style.name, style);
    }
  }

  // 0단계에서 변수 이름을 바꿨는데 3단계에서 그 스타일 이름 바꾸기가 끝나지 않았으면(보류 · 이름을 쓰기 전 오류)
  // 그 스타일의 변수를 되돌린다 — 변수 이름만 바뀌고 스타일 이름은 그대로 남지 않게(docs/text-style-krds.md §5.3).
  // missFontKeep은 이름을 바꾸므로 여기 걸리지 않는다.
  for (let i = 0; i < roleSpecs.length; i++) {
    const spec = roleSpecs[i];
    const st = anchoredStyle(spec);
    const ids = new Set(roleMoved.filter((m) => m.pair === i).map((m) => m.id));
    if (!st || !ids.size || st.name === spec.name) continue;
    const orig = roleRenames[i].from;
    await renameTextRoleVars([{ from: spec.name, to: orig }], { onlyIds: ids });
    const want = new Set(ROLE_VAR_CATS.map((c) => `${c}/${orig}`));
    const stuck: string[] = [];
    for (const id of ids) {
      const v = await figma.variables.getVariableByIdAsync(id);
      if (v && !want.has(v.name)) stuck.push(v.name);
    }
    if (stuck.length) res.missing.push(t('textStyle.missRoleStuck', { name: st.name, vars: stuck.join(', ') }));
  }

  // 화면 연결 단계는 여기 없다 — 「기존만 연결」이 시그니처로 붙인다(위 주석 참고).
  return res;
}

/* ============================================================
   이름 바꾸기 공용 — 최종 이름 집합 고정점 · 임시 이름 2단계 · 실패 되돌림(docs/text-style-krds.md §5.3)
   텍스트 스타일([이름 다시 짓기])과 역할 변수(renameTextRoleVars)가 같은 방식으로 바꾼다.
   ============================================================ */

/** 텍스트 스타일 등록이 스타일 이름으로 만드는 역할 변수 3종(`{종류}/{스타일 이름}`). */
const ROLE_VAR_CATS = ['font-size', 'line-height', 'letter-spacing'] as const;

/**
 * 최종 이름 집합으로 겹침 판정 — 이름을 하나라도 바꾸기 전에 끝낸다. (후보가 아닌 것의 지금 이름) ∪ (후보의 `to`)에서
 * `to`가 겹치는 후보를 빼고, 빠진 후보는 지금 이름(`from`)이 남으므로 더 빠지는 후보가 없을 때까지 반복한다(고정점).
 * 돌려주는 값 = 빠진 후보의 key.
 */
function finalNameTaken<K>(cands: readonly { key: K; from: string; to: string }[], others: readonly string[]): Set<K> {
  const out = new Set<K>();
  for (;;) {
    const count = new Map<string, number>();
    const add = (n: string): void => void count.set(n, (count.get(n) ?? 0) + 1);
    for (const n of others) add(n);
    for (const c of cands) add(out.has(c.key) ? c.from : c.to);
    let grew = false;
    for (const c of cands)
      if (!out.has(c.key) && (count.get(c.to) ?? 0) > 1) {
        out.add(c.key);
        grew = true;
      }
    if (!grew) return out;
  }
}

type RenameStatus = 'renamed' | 'error' | 'error-chain' | 'error-stuck';
interface RenameJob<K> {
  key: K;
  from: string;
  to: string;
  tmp: string;
  get(): string;
  set(name: string): void;
}

/**
 * 임시 이름 2단계로 바꾼다 — 모두 `tmp`로(1단계) → 모두 `to`로(2단계). 오류가 난 항목이 있으면 되돌릴 집합을
 * 닫힘으로 계산하고(오류 항목 + 그 `from`을 `to`로 원하던 항목 …) 그 집합을 다시 `tmp` → `from` 2단계로 되돌린다.
 * 직접 오류 = 'error', 함께 되돌림 = 'error-chain', 되돌리지 못함(끝난 뒤 이름이 `from`이 아님) = 'error-stuck'.
 */
function twoPhaseRename<K>(jobs: readonly RenameJob<K>[]): Map<K, RenameStatus> {
  const trySet = (j: RenameJob<K>, name: string): boolean => {
    try {
      j.set(name);
      return true;
    } catch {
      return false;
    }
  };
  const status = new Map<K, RenameStatus>();
  const failed = new Set<K>();
  for (const j of jobs) if (!trySet(j, j.tmp)) failed.add(j.key);
  for (const j of jobs) if (!failed.has(j.key) && !trySet(j, j.to)) failed.add(j.key);
  for (const j of jobs) status.set(j.key, 'renamed');
  if (!failed.size) return status;
  // 되돌릴 집합(닫힘) — 되돌려질 항목의 `from`을 `to`로 가진 항목도 함께(같은 이름이 둘 생기지 않게).
  const back = new Set(failed);
  for (let grew = true; grew; ) {
    grew = false;
    const reclaim = new Set(jobs.filter((j) => back.has(j.key)).map((j) => j.from));
    for (const j of jobs)
      if (!back.has(j.key) && reclaim.has(j.to)) {
        back.add(j.key);
        grew = true;
      }
  }
  const backJobs = jobs.filter((j) => back.has(j.key));
  const cur = (j: RenameJob<K>): string => {
    try {
      return j.get();
    } catch {
      return '';
    }
  };
  // 되돌림도 2단계 — 이미 `from`인 항목(1단계에서 실패해 그대로)은 옮기지 않는다.
  for (const j of backJobs) if (cur(j) !== j.from) trySet(j, j.tmp);
  for (const j of backJobs) if (cur(j) !== j.from) trySet(j, j.from);
  for (const j of backJobs) status.set(j.key, cur(j) !== j.from ? 'error-stuck' : failed.has(j.key) ? 'error' : 'error-chain');
  return status;
}

/** 변수 임시 이름 — 피그마 변수 이름에 못 쓰는 글자(`.` 등)가 id에 섞이지 않게 영숫자 · `_` · `-`만. */
const varTmpName = (id: string): string => `__dsl_tmp_${id.replace(/[^A-Za-z0-9_-]/g, '_')}`;

export interface RoleVarRenameResult {
  /** 바꾼 변수 수. */
  renamed: number;
  /** 최종 집합 밖의 다른 변수와 이름이 겹쳐 건너뛴 변수 수(그 스타일은 옛 이름의 변수에 묶인 채로 남는다). */
  taken: number;
  /** 바꾸기 오류로 되돌린 변수 수(error · error-chain · error-stuck). */
  error: number;
  /** 되돌리지 못한 변수의 지금 이름. */
  stuck: string[];
  /** 바꾼 변수 id와 그 짝의 순번(pairs 안) — 등록 경로의 되돌림(§5.3)이 쓴다. */
  moved: { id: string; pair: number }[];
}

/**
 * 역할 변수 `font-size/{from}` · `line-height/{from}` · `letter-spacing/{from}`을 `{to}`로 바꾼다
 * (docs/text-style-krds.md §5.3). 플러그인 Semantic 컬렉션 안에서만 — 사용자 컬렉션 · 직접 만든 변수(`isManualVar`)는
 * 건드리지 않는다. 스타일과 같은 방식(최종 이름 집합 고정점 · 임시 이름 2단계 · 실패 시 되돌림).
 * `onlyIds`를 주면 그 변수만(등록 경로의 되돌림이 0단계에서 옮긴 변수만 되돌린다).
 */
export async function renameTextRoleVars(
  pairs: readonly { from: string; to: string }[],
  opts: { onlyIds?: ReadonlySet<string> } = {},
): Promise<RoleVarRenameResult> {
  const res: RoleVarRenameResult = { renamed: 0, taken: 0, error: 0, stuck: [], moved: [] };
  if (!pairs.length) return res;
  const cols = await figma.variables.getLocalVariableCollectionsAsync();
  const semId = ownedCollection(cols, 'semantic')?.id;
  if (!semId) return res;
  const vars = (await figma.variables.getLocalVariablesAsync()).filter((v) => v.variableCollectionId === semId);
  const byName = new Map<string, Variable>();
  for (const v of vars) if (!byName.has(v.name)) byName.set(v.name, v);
  const cands: { key: string; from: string; to: string; v: Variable; pair: number }[] = [];
  const picked = new Set<string>();
  pairs.forEach((p, pair) => {
    if (p.from === p.to) return;
    for (const cat of ROLE_VAR_CATS) {
      const v = byName.get(`${cat}/${p.from}`);
      if (!v || picked.has(v.id) || isManualVar(v) || (opts.onlyIds && !opts.onlyIds.has(v.id))) continue;
      picked.add(v.id);
      cands.push({ key: v.id, from: v.name, to: `${cat}/${p.to}`, v, pair });
    }
  });
  if (!cands.length) return res;
  const taken = finalNameTaken(cands, vars.filter((v) => !picked.has(v.id)).map((v) => v.name));
  res.taken = taken.size;
  const live = cands.filter((c) => !taken.has(c.key));
  const status = twoPhaseRename(
    live.map((c) => ({
      key: c.key,
      from: c.from,
      to: c.to,
      tmp: varTmpName(c.v.id),
      get: () => c.v.name,
      set: (n: string) => {
        c.v.name = n;
      },
    })),
  );
  for (const c of live) {
    const st = status.get(c.key);
    if (st === 'renamed') {
      res.renamed++;
      res.moved.push({ id: c.v.id, pair: c.pair });
    } else {
      res.error++;
      if (st === 'error-stuck') res.stuck.push(c.v.name);
    }
  }
  return res;
}

/** 이름 다시 짓기의 스타일 하나 → KRDS 입력(쓰인 횟수를 세지 않는다 — count · uiCount 0, §3.1). */
function krdsInputOf(s: TextStyle): KrdsInput {
  const e = existingOf(s);
  return {
    id: e.id,
    name: e.name,
    fontSize: e.fontSize,
    lineHeight: e.lineHeight,
    ...(e.lineHeightPercent ? { lineHeightPercent: e.lineHeightPercent } : {}),
    letterSpacing: e.letterSpacing,
    family: e.family,
    style: e.style,
    count: 0,
    uiCount: 0,
  };
}

/**
 * [이름 다시 짓기] 미리보기(docs/text-style-krds.md §5.2) — 이 파일의 로컬 텍스트 스타일 전부에 §3을 한 번에 적용한다
 * (앵커 없음, count 0). 대상이 파일의 모든 스타일이고 각자 자기 지금 이름은 예약하지 않으므로(§3.4) 예약 이름은 비어 있다 —
 * 지금 이름끼리의 겹침은 바꾸기의 최종 이름 집합(§5.3)이 맡는다(맞바꿈 A↔B도 된다). 이름이 바뀌는 줄만 돌려준다.
 * 읽기만 한다 — 글꼴을 불러오지 않는다.
 */
export async function planTsRename(): Promise<TsRenameRow[]> {
  const styles = await figma.getLocalTextStylesAsync();
  const names = nameKrdsStyles(styles.map(krdsInputOf), { reserved: new Set<string>(), path: 'rename' });
  const rows: TsRenameRow[] = [];
  styles.forEach((s, i) => {
    const to = names[i];
    if (!to || to === s.name) return;
    rows.push({ id: s.id, from: s.name, to, sig: tsSig(existingOf(s)) });
  });
  return rows;
}

/** TS_RENAMED의 내용(type · reqId 제외). */
export interface TsRenameResult {
  results: { id: string; status: string; name: string }[];
  renamed: number;
  skipped: number;
  skipReasons: Record<string, number>;
  roleVarsRenamed: number;
  roleVarsTaken: number;
  roleVarsError: number;
  roleVarsStuck: string[];
}

/**
 * [이름 다시 짓기] 바꾸기(docs/text-style-krds.md §5.3). 이름만 쓴다 — 글꼴을 불러오지 않고 값을 쓰지 않는다(§5.1 "글꼴").
 * 1) 다시 확인: 지금 이름 ≠ from → 'renamed-meanwhile'(스타일이 없어져도), 시그니처 ≠ sig → 'value-changed'.
 * 2) 최종 이름 집합 고정점 → 'name-taken'. 3) 임시 이름 2단계 · 실패 되돌림(닫힘) → 'error' · 'error-chain' · 'error-stuck'.
 * 4) 'renamed'인 항목의 역할 변수만 `renameTextRoleVars`로(변수 쪽 실패는 스타일 이름을 되돌리지 않는다).
 */
export async function applyTsRename(items: readonly TsRenameItem[]): Promise<TsRenameResult> {
  const styles = await figma.getLocalTextStylesAsync();
  const byId = new Map(styles.map((s) => [s.id, s]));
  const status = new Map<string, string>();
  const order: string[] = [];
  const cands: { key: string; from: string; to: string; st: TextStyle }[] = [];
  for (const it of items) {
    if (status.has(it.id)) continue; // 같은 id가 두 번 오면 처음 것만
    order.push(it.id);
    const st = byId.get(it.id);
    if (!st || st.name !== it.from) status.set(it.id, 'renamed-meanwhile');
    else if (tsSig(existingOf(st)) !== it.sig) status.set(it.id, 'value-changed');
    else {
      status.set(it.id, 'pending');
      cands.push({ key: it.id, from: it.from, to: it.to, st });
    }
  }
  const candIds = new Set(cands.map((c) => c.key));
  const taken = finalNameTaken(cands, styles.filter((s) => !candIds.has(s.id)).map((s) => s.name));
  for (const k of taken) status.set(k, 'name-taken');
  const live = cands.filter((c) => !taken.has(c.key));
  const done = twoPhaseRename(
    live.map((c) => ({
      key: c.key,
      from: c.from,
      to: c.to,
      tmp: `__dsl_tmp_${c.key}`,
      get: () => c.st.name,
      set: (n: string) => {
        c.st.name = n; // 이름 쓰기는 글꼴 없이 된다(ia-v4 §4.3 "글꼴")
      },
    })),
  );
  for (const [k, v] of done) status.set(k, v);

  const res: TsRenameResult = { results: [], renamed: 0, skipped: 0, skipReasons: {}, roleVarsRenamed: 0, roleVarsTaken: 0, roleVarsError: 0, roleVarsStuck: [] };
  for (const id of order) {
    const st = status.get(id) as string;
    res.results.push({ id, status: st, name: byId.get(id)?.name ?? '' });
    if (st === 'renamed') res.renamed++;
    else {
      res.skipped++;
      res.skipReasons[st] = (res.skipReasons[st] ?? 0) + 1;
    }
  }
  const pairs = live.filter((c) => status.get(c.key) === 'renamed').map((c) => ({ from: c.from, to: c.to }));
  if (pairs.length) {
    try {
      const rv = await renameTextRoleVars(pairs);
      res.roleVarsRenamed = rv.renamed;
      res.roleVarsTaken = rv.taken;
      res.roleVarsError = rv.error;
      res.roleVarsStuck = rv.stuck;
    } catch {
      // 변수 목록을 읽지 못함 — 스타일 이름은 그대로 두고(§5.3) 짝마다 하나씩 오류로 센다.
      res.roleVarsError = pairs.length;
    }
  }
  return res;
}

/** [기존 스타일 연결] 결과(IA v3 §4.6). skipped = 건너뛴 텍스트 레이어 수 = skipReasons 합. */
export interface ApplyTextStylesResult {
  applied: number;
  skipped: number;
  skipReasons: Record<TextStyleSkipReason, number>;
}

/** 텍스트 스타일 비교 키 — 스타일이 정하는 모든 글자 속성(§2.11). 숫자는 소수 2자리. */
interface TypoFields {
  fontSize: number;
  fontName: FontName;
  lineHeight: LineHeight | typeof figma.mixed;
  letterSpacing: LetterSpacing | typeof figma.mixed;
  textCase?: TextCase | typeof figma.mixed;
  textDecoration?: TextDecoration | typeof figma.mixed;
  paragraphSpacing?: number;
  paragraphIndent?: number;
}

/**
 * 스타일·글자 모두 같은 식으로 키를 만든다. 줄 높이·자간은 px로 환산해 비교한다 —
 * 단위만 다르고 실제 높이가 같으면 같다(16px 글자의 24px ↔ 150%). 원값을 그대로 환산하고
 * 추측(PIXELS 150 → 150%)은 하지 않는다: 숫자를 다른 단위로 읽어야만 맞는 경우는 모양이 달라진다.
 * 없는 필드(오래된 목·환경)는 기본값(ORIGINAL · NONE · 0 · 0)으로 본다.
 */
function typoKey(t: TypoFields): string {
  const fontSize = roundN(t.fontSize);
  const lh = t.lineHeight !== figma.mixed && t.lineHeight && t.lineHeight.unit === 'AUTO' ? 'auto' : String(lhPxOf(fontSize, t.lineHeight));
  return [
    fontSize,
    lh,
    lsPxOf(fontSize, t.letterSpacing),
    t.fontName.family,
    t.fontName.style,
    t.textCase ?? 'ORIGINAL',
    t.textDecoration ?? 'NONE',
    roundN(t.paragraphSpacing ?? 0),
    roundN(t.paragraphIndent ?? 0),
  ].join('|');
}

/** 이 텍스트가 섞인 서식인가(구간마다 크기·글꼴·줄 높이·자간·대소문자·밑줄이 다름). */
function isMixedTypography(t: TextNode): boolean {
  return (
    t.fontSize === figma.mixed ||
    t.fontName === figma.mixed ||
    t.lineHeight === figma.mixed ||
    t.letterSpacing === figma.mixed ||
    (t as { textCase?: unknown }).textCase === figma.mixed ||
    (t as { textDecoration?: unknown }).textDecoration === figma.mixed
  );
}

/** 텍스트 스타일이 정하는 글자 속성 중 변수를 붙일 수 있는 것(IA v4 §2.3-6의 8가지). */
const STYLE_TEXT_VAR_FIELDS = ['fontFamily', 'fontSize', 'fontStyle', 'fontWeight', 'letterSpacing', 'lineHeight', 'paragraphSpacing', 'paragraphIndent'] as const;

/**
 * 스타일을 붙이기 직전 — 그 글자의 글자 속성 변수 연결을 모두 뗀다(전체 · 구간, IA v4 §2.3-6).
 * 값이 스타일과 같은 글자만 오므로 모습은 바뀌지 않는다. 구간 연결을 풀려면 글꼴이 불려 있어야 한다(부르는 쪽이 부른다).
 */
function unbindStyleTextVars(t: TextNode): void {
  const bv = (t as unknown as { boundVariables?: Record<string, unknown> }).boundVariables;
  if (!bv) return;
  const len = typeof t.characters === 'string' ? t.characters.length : 0;
  const node = t as unknown as {
    setBoundVariable?: (f: string, v: null) => void;
    setRangeBoundVariable?: (s: number, e: number, f: string, v: null) => void;
  };
  for (const f of STYLE_TEXT_VAR_FIELDS) {
    const e = bv[f];
    if (!(Array.isArray(e) ? e.length > 0 : !!e)) continue;
    if (len > 0 && node.setRangeBoundVariable) node.setRangeBoundVariable(0, len, f, null);
    try {
      node.setBoundVariable?.(f, null);
    } catch {
      /* 구간으로 이미 뗐다 — 전체 연결이 없는 속성은 피그마가 거절할 수 있다 */
    }
  }
}

/** 이 글자의 모든 글꼴을 불러온다(구간 연결 풀기 · 스타일 붙이기 전). */
async function loadTextFonts(t: TextNode, loaded: Set<string>): Promise<void> {
  const len = typeof t.characters === 'string' ? t.characters.length : 0;
  const fonts: FontName[] =
    len > 0 && typeof (t as { getRangeAllFontNames?: unknown }).getRangeAllFontNames === 'function'
      ? t.getRangeAllFontNames(0, len)
      : t.fontName !== figma.mixed
        ? [t.fontName as FontName]
        : [];
  for (const fn of fonts) {
    const k = `${fn.family} ${fn.style}`;
    if (loaded.has(k)) continue;
    await figma.loadFontAsync(fn);
    loaded.add(k);
  }
}

/** 글자 변수 연결을 떼고 스타일을 붙인다(IA v4 §2.3-6). 글꼴을 못 불러오면 던진다. */
async function attachTextStyle(t: TextNode, styleId: string, loaded: Set<string>): Promise<void> {
  await loadTextFonts(t, loaded);
  unbindStyleTextVars(t);
  await t.setTextStyleIdAsync(styleId);
}

/** 텍스트 스타일이 붙어 있는가(원격 스타일·일부 구간(mixed) 포함). */
function hasTextStyle(t: TextNode): boolean {
  const id = (t as { textStyleId?: unknown }).textStyleId;
  return id === figma.mixed || (typeof id === 'string' && id !== '');
}

/** 조상 중에 인스턴스가 있는가(선택 루트가 인스턴스 안쪽인 경우). */
function insideInstance(node: SceneNode): boolean {
  for (let p: BaseNode | null = node.parent; p; p = p.parent) if (p.type === 'INSTANCE') return true;
  return false;
}

/**
 * 적용만(생성 없음, IA v3 §4.6): 선택 텍스트를 모든 글자 속성이 같은 **기존** 로컬 스타일에 연결한다.
 * 건너뛰는 글자(§2.11): 이미 텍스트 스타일이 있음 · 인스턴스 안쪽 ·
 * 서식이 섞임 · 같은 스타일이 없음 · 같은 모양 스타일이 둘 이상. 글자 변수가 붙은 글자는 연결을 떼고 붙인다(IA v4 §2.3-6). 스타일·변수는 만들거나 고치지 않는다.
 */
/** 텍스트 스타일 미리보기의 줄 — 스타일 하나와 붙을 글자 레이어들(IA v4 §4.2). */
export interface TextStylePlanRow {
  styleId: string;
  name: string;
  nodeIds: string[];
}
/** 스타일 키 인덱스(같은 키 2개 이상 = 같은 모양 스타일이 여럿 → 모호, null). */
async function textStyleIndex(): Promise<Map<string, TextStyle | null>> {
  const styleByKey = new Map<string, TextStyle | null>();
  for (const s of await figma.getLocalTextStylesAsync()) {
    const k = typoKey(s as unknown as TypoFields);
    styleByKey.set(k, styleByKey.has(k) ? null : s);
  }
  return styleByKey;
}
/** 루트들 안의 글자 — 인스턴스 밖(texts)과 안쪽(inInstance)으로 나눈다(계획 · 바로 연결 공통). */
function planTexts(nodes: readonly SceneNode[]): { texts: TextNode[]; inInstance: TextNode[] } {
  const texts: TextNode[] = [];
  const inInstance: TextNode[] = [];
  for (const n of nodes) {
    if (insideInstance(n)) walkText(n, inInstance);
    else walkText(n, texts, inInstance);
  }
  return { texts, inInstance };
}
/** 이 글자에 붙일 수 있는 스타일(없으면 건너뜀 사유). */
function textStyleFor(t: TextNode, styleByKey: Map<string, TextStyle | null>): TextStyle | TextStyleSkipReason {
  if (hasTextStyle(t)) return 'hasStyle';
  // 글자 변수가 붙어 있어도 후보다 — 붙일 때 그 연결을 뗀다(IA v4 §2.3-6).
  if (isMixedTypography(t)) return 'mixed';
  const hit = styleByKey.get(typoKey(t as unknown as TypoFields));
  if (hit === undefined) return 'noStyle';
  if (hit === null) return 'ambiguous'; // 같은 모양 스타일 2개 이상 → 어느 것에 붙일지 모호
  return hit;
}
/**
 * 기존 스타일 연결 미리보기(IA v4 §4.2) — 쓰지 않고 스타일별로 붙을 글자를 모은다.
 * 사유는 레이어 단위로 센다(연결 화면 건너뜀 칩 "레이어 n개").
 */
export async function planExistingTextStyles(nodes: readonly SceneNode[]): Promise<{ rows: TextStylePlanRow[]; skipReasons: Record<TextStyleSkipReason, number> }> {
  const skipReasons: Record<TextStyleSkipReason, number> = { hasStyle: 0, noStyle: 0, ambiguous: 0, mixed: 0, instance: 0 };
  const styleByKey = await textStyleIndex();
  const { texts, inInstance } = planTexts(nodes);
  skipReasons.instance += inInstance.length;
  const rows = new Map<string, TextStylePlanRow>();
  for (const t of texts) {
    const r = textStyleFor(t, styleByKey);
    if (typeof r === 'string') { skipReasons[r]++; continue; }
    const row = rows.get(r.id) ?? { styleId: r.id, name: r.name, nodeIds: [] };
    row.nodeIds.push(t.id);
    rows.set(r.id, row);
  }
  return { rows: [...rows.values()], skipReasons };
}
/**
 * 켠 스타일 줄만 붙인다(IA v4 §4.2 — 연결 직전 다시 확인). 그 사이 스타일이 붙었거나 값이 달라진 글자는 건너뛴다.
 * 반환: 붙인 레이어 수 · 건너뛴 사유.
 */
export async function applyTextStyleRows(rows: readonly { styleId: string; nodeIds: readonly string[] }[]): Promise<ApplyTextStylesResult> {
  const skipReasons: Record<TextStyleSkipReason, number> = { hasStyle: 0, noStyle: 0, ambiguous: 0, mixed: 0, instance: 0 };
  const res: ApplyTextStylesResult = { applied: 0, skipped: 0, skipReasons };
  const styleByKey = await textStyleIndex();
  const loaded = new Set<string>();
  for (const row of rows) {
    for (const id of row.nodeIds) {
      const t = await figma.getNodeByIdAsync(id).catch(() => null);
      if (!t || t.type !== 'TEXT') { skipReasons.noStyle++; res.skipped++; continue; }
      const r = textStyleFor(t as TextNode, styleByKey);
      if (typeof r === 'string' || r.id !== row.styleId) { skipReasons[typeof r === 'string' ? r : 'noStyle']++; res.skipped++; continue; }
      try {
        await attachTextStyle(t as TextNode, r.id, loaded);
        res.applied++;
      } catch {
        /* 폰트를 못 불러옴 */
      }
    }
  }
  return res;
}

/**
 * 텍스트 스타일 후보 판정(연결의 "텍스트 스타일이 먼저" — IA v4 §4.2 · §4.3 `APPLY.skipTextStyleNodes`).
 * `planExistingTextStyles`가 줄에 넣을 글자(인스턴스 밖 · 붙일 로컬 스타일이 하나로 정해짐)면 true.
 */
export async function textStyleCandidateTest(): Promise<(t: TextNode) => boolean> {
  const styleByKey = await textStyleIndex();
  return (t) => !insideInstance(t) && typeof textStyleFor(t, styleByKey) !== 'string';
}

/** 타이포 등록 · 바로 연결 결과(IA v4 §4.3 "타이포 등록"). */
export interface ApplyRegisteredResult {
  applied: number;
  applySkipped: number;
  applyReasons: Record<TextStyleApplySkipReason, number>;
}

/**
 * 방금 등록 · 갱신한 스타일(styleIds)만 roots 안 글자에 붙인다(IA v4 §4.3 "타이포 등록" — 연결 화면과 같은 계획 ·
 * §2.3-6대로 글자 변수 연결을 떼고). 세는 범위는 값(`typoKey`)이 그 스타일과 같은 글자뿐: 이미 바로 그 스타일이
 * 붙은 글자는 세지 않고, 못 붙인 글자는 다른 스타일이 붙음(hasStyle) · 인스턴스 안쪽(instance) · 같은 모양 스타일
 * 여럿(ambiguous)으로 센다. 서식이 섞인 글자는 값이 하나로 정해지지 않아 범위 밖이다.
 */
export async function applyRegisteredTextStyles(roots: readonly SceneNode[], styleIds: readonly string[]): Promise<ApplyRegisteredResult> {
  const applyReasons: Record<TextStyleApplySkipReason, number> = { hasStyle: 0, instance: 0, ambiguous: 0 };
  const out: ApplyRegisteredResult = { applied: 0, applySkipped: 0, applyReasons };
  if (!styleIds.length) return out;
  const ids = new Set(styleIds);
  // 방금 스타일의 값 열쇠 → 스타일 id
  const idByKey = new Map<string, string>();
  for (const st of await figma.getLocalTextStylesAsync()) if (ids.has(st.id)) idByKey.set(typoKey(st as unknown as TypoFields), st.id);
  if (!idByKey.size) return out;
  const keyOf = (t: TextNode): string | undefined => (isMixedTypography(t) ? undefined : typoKey(t as unknown as TypoFields));
  const plan = planTexts(roots);
  const skipped = (k: TextStyleApplySkipReason): void => {
    applyReasons[k]++;
    out.applySkipped++;
  };
  for (const t of plan.inInstance) if (idByKey.has(keyOf(t) ?? '\u0000')) skipped('instance');
  const rows = new Map<string, string[]>();
  const styleByKey = await textStyleIndex();
  for (const t of plan.texts) {
    const k = keyOf(t);
    if (k === undefined || !idByKey.has(k)) continue; // 범위 밖(값이 방금 스타일과 다름 · 섞인 서식)
    const r = textStyleFor(t, styleByKey);
    if (r === 'hasStyle') {
      if ((t as { textStyleId?: unknown }).textStyleId !== idByKey.get(k)) skipped('hasStyle'); // 바로 그 스타일이면 세지 않음
      continue;
    }
    if (r === 'ambiguous') { skipped('ambiguous'); continue; }
    if (typeof r === 'string' || !ids.has(r.id)) continue;
    const arr = rows.get(r.id) ?? [];
    arr.push(t.id);
    rows.set(r.id, arr);
  }
  if (rows.size) {
    const r = await applyTextStyleRows([...rows].map(([styleId, nodeIds]) => ({ styleId, nodeIds })));
    out.applied = r.applied;
  }
  return out;
}

export async function applyExistingTextStyles(nodes: readonly SceneNode[]): Promise<ApplyTextStylesResult> {
  const skipReasons: Record<TextStyleSkipReason, number> = { hasStyle: 0, noStyle: 0, ambiguous: 0, mixed: 0, instance: 0 };
  const res: ApplyTextStylesResult = { applied: 0, skipped: 0, skipReasons };
  const skipText = (k: TextStyleSkipReason): void => {
    skipReasons[k]++;
    res.skipped++;
  };
  const styleByKey = await textStyleIndex();

  const texts: TextNode[] = [];
  const inInstance: TextNode[] = [];
  for (const n of nodes) {
    if (insideInstance(n)) walkText(n, inInstance);
    else walkText(n, texts, inInstance);
  }
  for (let i = 0; i < inInstance.length; i++) skipText('instance');

  const loaded = new Set<string>();

  for (const t of texts) {
    if (hasTextStyle(t)) {
      skipText('hasStyle');
      continue;
    }
    // 글자 변수가 붙은 글자도 붙인다 — 연결을 떼고(IA v4 §2.3-6).
    if (isMixedTypography(t)) {
      skipText('mixed');
      continue;
    }
    const hit = styleByKey.get(typoKey(t as unknown as TypoFields));
    if (hit === undefined) {
      skipText('noStyle');
      continue;
    }
    if (hit === null) {
      skipText('ambiguous'); // 같은 모양 스타일 2개 이상 → 어느 것에 붙일지 모호
      continue;
    }
    try {
      await attachTextStyle(t, hit.id, loaded);
      res.applied++;
    } catch {
      /* 폰트를 못 불러옴 — 적용 수에 넣지 않는다(결과 줄은 적용 수 + 건너뜀 사유만 보인다) */
    }
  }
  return res;
}

/* ============================================================
   새 변수 · 복제 · 삭제(IA v4 §4.9) — 사용자가 직접 하는 일. 직접 만든 변수에는 MANUAL_KEY를 단다.
   무료 개수 제한(세기 · 막기)은 부르는 쪽(code.ts)이 한다.
   ============================================================ */

/** 피그마가 이름을 거절함 — ERROR code 'name'. */
export class VarNameError extends Error {}
/** 대상 변수 · 컬렉션이 없음(지워짐 · 라이브러리) — ERROR code 'deleted'. */
export class VarGoneError extends Error {}

/** 사용자 컬렉션 이름(로컬 컬렉션이 없을 때 새로 만든다 — 플러그인 표시 없음). */
export const USER_COLLECTION_NAME = 'Variables';

/** 고치기 · 새 변수 칸의 값 → 피그마 값. 별칭 대상이 없으면 던진다. */
export async function editValueToFigma(ev: EditValue): Promise<VariableValue> {
  if (ev.kind === 'color') return { ...hexToRgb(ev.hex), a: Math.max(0, Math.min(1, ev.alpha)) };
  if (ev.kind === 'number') return ev.value;
  if (ev.kind === 'string') return ev.text;
  if (ev.kind === 'bool') return ev.value;
  const target = await figma.variables.getVariableByIdAsync(ev.targetId).catch(() => null);
  if (!target) throw new Error('alias target not found');
  return figma.variables.createVariableAlias(target);
}

function markManual(v: Variable): void {
  try {
    (v as unknown as { setPluginData?: (k: string, val: string) => void }).setPluginData?.(MANUAL_KEY, '1');
  } catch {
    /* 표시를 못 달아도 변수는 만들었다 */
  }
}

function dropQuietly(x: { remove?: () => void } | null | undefined): void {
  try {
    x?.remove?.();
  } catch {
    /* 못 지우면 그대로 둔다 */
  }
}

export interface NewVariableInput {
  collectionId?: string;
  name: string;
  varType: 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN';
  /** 모드 id → 값. '*' = 기본 모드(새 컬렉션처럼 모드 id를 모를 때). 비운 모드는 기본 모드 값. */
  values: Record<string, EditValue>;
  scopes?: string[];
}

/**
 * 새 변수(§4.9). collectionId가 없으면 사용자 컬렉션 `Variables`를 새로 만든다(플러그인 표시 없음).
 * 실패하면 이번에 만든 변수 · 컬렉션을 걷고 던진다(이름 거절은 VarNameError).
 */
export async function createManualVariable(input: NewVariableInput): Promise<{ variable: Variable; newCollection: boolean }> {
  let col: VariableCollection | undefined;
  let newCollection = false;
  if (input.collectionId) {
    col = (await figma.variables.getLocalVariableCollectionsAsync()).find((c) => c.id === input.collectionId);
    if (!col) throw new VarGoneError('collection not found');
  } else {
    col = figma.variables.createVariableCollection(USER_COLLECTION_NAME);
    newCollection = true;
  }
  let v: Variable;
  try {
    v = figma.variables.createVariable(input.name, col, input.varType);
  } catch (e) {
    if (newCollection) dropQuietly(col as unknown as { remove?: () => void });
    throw new VarNameError(e instanceof Error ? e.message : String(e));
  }
  try {
    const def = col.defaultModeId;
    const defVal = input.values[def] ?? input.values['*'];
    if (!defVal) throw new Error('default mode value required');
    for (const m of col.modes) {
      const ev = m.modeId === def ? defVal : input.values[m.modeId] ?? defVal;
      v.setValueForMode(m.modeId, await editValueToFigma(ev));
    }
    if (input.scopes) v.scopes = input.scopes as VariableScope[];
    markManual(v);
  } catch (e) {
    dropQuietly(v as unknown as { remove?: () => void });
    if (newCollection) dropQuietly(col as unknown as { remove?: () => void });
    throw e;
  }
  return { variable: v, newCollection };
}

/**
 * 복제(§4.9) — 같은 컬렉션에 모든 모드 값(별칭 포함) · 용도 · 설명 · 게시 숨김 · 코드 문법을 복사.
 * `dsl.autoRole` 같은 플러그인 데이터는 복사하지 않고 MANUAL_KEY를 단다. 이름은 duplicateName(대소문자까지 같을 때 겹침).
 */
export async function duplicateVariable(id: string): Promise<Variable> {
  const src = await figma.variables.getVariableByIdAsync(id).catch(() => null);
  if (!src || src.remote) throw new VarGoneError('variable not found');
  const col = (await figma.variables.getLocalVariableCollectionsAsync()).find((c) => c.id === src.variableCollectionId);
  if (!col) throw new VarGoneError('collection not found');
  const taken = new Set((await figma.variables.getLocalVariablesAsync()).filter((v) => v.variableCollectionId === col.id).map((v) => v.name));
  const nv = figma.variables.createVariable(duplicateName(src.name, taken), col, src.resolvedType);
  try {
    for (const [modeId, raw] of Object.entries(src.valuesByMode)) {
      if (raw === undefined || raw === null) continue;
      const val = typeof raw === 'object' && (raw as VariableAlias).type === 'VARIABLE_ALIAS' ? { type: 'VARIABLE_ALIAS' as const, id: (raw as VariableAlias).id } : raw;
      nv.setValueForMode(modeId, val as VariableValue);
    }
    nv.scopes = [...(src.scopes ?? [])];
    nv.description = src.description ?? '';
    nv.hiddenFromPublishing = !!src.hiddenFromPublishing;
    const cs = (src as unknown as { codeSyntax?: Record<string, string> }).codeSyntax ?? {};
    for (const [platform, value] of Object.entries(cs)) {
      if (value) nv.setVariableCodeSyntax(platform as CodeSyntaxPlatform, value);
    }
    markManual(nv);
  } catch (e) {
    dropQuietly(nv as unknown as { remove?: () => void });
    throw e;
  }
  return nv;
}

/** 삭제(§4.9) — 지운 변수의 이름을 돌려준다. 없으면 VarGoneError. */
export async function deleteVariable(id: string): Promise<string> {
  const v = await figma.variables.getVariableByIdAsync(id).catch(() => null);
  if (!v || v.remote) throw new VarGoneError('variable not found');
  const name = v.name;
  v.remove();
  return name;
}
