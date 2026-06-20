/* ============================================================
   variables.ts — 3계층 변수 생성/갱신 (Global · Semantic · Component)
   불변식: Global만 리터럴, Semantic/Component는 별칭만. upsert로 재실행 안전.
   ============================================================ */
import {
  DraftToken,
  ResolvedType,
  hexToRgb,
  resolvedTypeForToken,
  scopesForSources,
  stringValueForUnit,
  toPx,
  numberTokenName,
} from './tokens';

export const GLOBAL = 'Global';
export const SEMANTIC = 'Semantic';
export const COMPONENT = 'Component';

async function getOrCreateCollection(name: string): Promise<VariableCollection> {
  const all = await figma.variables.getLocalVariableCollectionsAsync();
  return all.find((c) => c.name === name) ?? figma.variables.createVariableCollection(name);
}

interface Upsert {
  variable: Variable;
  created: boolean;
}

async function upsertVariable(
  name: string,
  collection: VariableCollection,
  type: ResolvedType,
): Promise<Upsert> {
  const existing = (await figma.variables.getLocalVariablesAsync(type)).find(
    (v) => v.name === name && v.variableCollectionId === collection.id,
  );
  if (existing) return { variable: existing, created: false };
  return { variable: figma.variables.createVariable(name, collection, type), created: true };
}

export interface CreateSummary {
  created: number;
  updated: number;
  globals: number;
  semantics: number;
}

/** Global(원시) + Semantic(별칭 미러) 생성. v1은 Semantic을 1:1 미러로 자동 생성(이름 개명은 UI에서). */
export async function createTokens(tokens: DraftToken[], base: number): Promise<CreateSummary> {
  const globalCol = await getOrCreateCollection(GLOBAL);
  const semanticCol = await getOrCreateCollection(SEMANTIC);
  const gMode = globalCol.defaultModeId;
  const sMode = semanticCol.defaultModeId;

  const summary: CreateSummary = { created: 0, updated: 0, globals: 0, semantics: 0 };

  for (const t of tokens) {
    const type = resolvedTypeForToken(t);
    const { variable: gVar, created } = await upsertVariable(t.name, globalCol, type);
    summary[created ? 'created' : 'updated']++;
    summary.globals++;

    // Global 값 = 리터럴
    setGlobalLiteral(gVar, gMode, t, type);
    gVar.scopes = scopesForSources(t.sources);
    gVar.hiddenFromPublishing = true; // 직접 사용 방지(3계층 규칙 보강)

    // 비-px lineHeight/letterSpacing → 바인딩용 px 스냅샷 FLOAT(-px) 추가 생성
    if (type === 'STRING' && t.unit && t.unit !== 'px' && typeof t.value === 'number') {
      const pxName = `${numberTokenName(`${t.category === 'lineHeight' ? 'line-height' : 'letter-spacing'}`, t.value)}-px`;
      const px = await upsertVariable(pxName, globalCol, 'FLOAT');
      px.variable.setValueForMode(gMode, toPx(t.value, t.unit, { base, fontSize: base }));
      px.variable.scopes = scopesForSources(t.sources);
      px.variable.hiddenFromPublishing = true;
      summary[px.created ? 'created' : 'updated']++;
      summary.globals++;
    }

    // Semantic 미러(별칭) — 리터럴 금지, 오직 Global 참조
    const { variable: sVar, created: sCreated } = await upsertVariable(t.name, semanticCol, type);
    sVar.setValueForMode(sMode, figma.variables.createVariableAlias(gVar));
    sVar.scopes = scopesForSources(t.sources);
    summary[sCreated ? 'created' : 'updated']++;
    summary.semantics++;
  }

  return summary;
}

function setGlobalLiteral(v: Variable, modeId: string, t: DraftToken, type: ResolvedType): void {  if (type === 'COLOR') {
    const { r, g, b } = hexToRgb(String(t.value));
    v.setValueForMode(modeId, { r, g, b, a: 1 });
  } else if (type === 'STRING') {
    // fontFamily 또는 비-px 단위의 코드용 진실
    if (t.unit && t.unit !== 'px' && typeof t.value === 'number') {
      v.setValueForMode(modeId, stringValueForUnit(t.value, t.unit));
    } else {
      v.setValueForMode(modeId, String(t.value));
    }
  } else {
    // FLOAT
    v.setValueForMode(modeId, Number(t.value));
  }
}

/* ============================================================
   Phase 2 — 시맨틱 별칭 매핑
   의미 토큰(예: surface, text, primary)을 Global 원시 변수에 별칭으로 연결.
   Component → Semantic → Global 단방향 규칙 준수. 리터럴 금지(별칭만).
   ============================================================ */
export interface SemanticSummary {
  created: number;
  updated: number;
  aliased: number;
  /** 참조 대상 Global 변수가 없어 건너뛴 이름들. */
  missing: string[];
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
  const semanticCol = await getOrCreateCollection(SEMANTIC);
  const sMode = semanticCol.defaultModeId;
  const globals = await figma.variables.getLocalVariablesAsync();

  for (const [semName, globalName] of Object.entries(map)) {
    const g = globals.find((v) => v.name === globalName && v.variableCollectionId === globalCol.id);
    if (!g) {
      summary.missing.push(globalName);
      continue;
    }
    const { variable, created } = await upsertVariable(semName, semanticCol, g.resolvedType);
    variable.setValueForMode(sMode, figma.variables.createVariableAlias(g)); // 별칭만
    variable.scopes = g.scopes; // 원시 스코프 상속
    summary[created ? 'created' : 'updated']++;
    summary.aliased++;
  }
  return summary;
}
