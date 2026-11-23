/* ============================================================
   themeApply.ts — 다크 모드 자동 채움 (figma 의존 → 목으로 테스트)
   값 변환 · 칸 판정 자체는 순수 themeGen.ts가 맡고, 여기서는 변수 그래프를 읽고 쓴다.
   (components.ts ↔ artwork.ts와 같은 분리)

   D-T1(ia-v3 13.7 "다크"): Dark 모드는 플러그인 Global에 둔다. 같은 Global 변수가 Light · Dark
   값을 갖고, Semantic은 모드 하나로 늘 같은 Global을 가리킨다. 옛 구조(플러그인 Semantic의
   Dark 모드 + `dark/…` Global 복사본)는 사용자가 [다크 만들기]를 누를 때 확인 뒤 옮긴다.
   ============================================================ */
import { t } from './i18n';
import { rgbToHex, hexToRgb } from './tokens';
import { ensureOwnedCollection, ownedCollection, collectionTiers } from './collectionRoles';
import { darkValueForLight, darkGlobalName, isDarkGlobalName, darkCellHex, classifyDarkCell, DARK_CALC_KEY, type DarkCellAction } from './themeGen';
import { isManualVar as isManual } from './variables'; // 직접 만든 변수(IA v4 §4.9)
import { scanUnusedVariables } from './unusedVars';

/** 플러그인 Global에 만들/재사용할 다크 모드 표시 이름. */
export const DARK_MODE_NAME = 'Dark';

/** 옛 구조 옮기기 확인 팝업에 보일 것(13.7 "옛 구조 옮기기"). */
export interface DarkMigrationPlan {
  /** 옛 다크 모드 이름(플러그인 Semantic의 기본이 아닌 모드). */
  modes: string[];
  /** 플러그인 Global의 `dark/…` 변수 수. */
  darkVars: number;
  /** 직접 고친 Dark가 사라지는 역할 이름. */
  lost: string[];
  /** 사용자 Global을 쓰는 역할 가운데 옛 다크 값이 기본과 다른 것의 수. */
  userRoles: number;
}

export interface DarkModeResult {
  /** 이번에 계산값을 넣은 Dark 칸 수. */
  filled: number;
  /** 손댄 칸(사용자가 고친 · 기록 없이 Light와 다른) — 그대로 둠. */
  kept: number;
  /** 이미 계산값인 칸. */
  same: number;
  /** 건너뛴 Global 색(별칭 · 직접 만든 · 옛 `dark/…`). */
  skipped: number;
  /** 사용자 Global을 가리키는 플러그인 Semantic 색 역할 수(Dark에서 바뀌지 않음). */
  userRoles: number;
  /** `Dark` 모드를 이번 실행에서 새로 추가했는지. */
  modeCreated?: boolean;
  /** 옛 구조를 옮겼으면 — 지운 `dark/` 수 · 남긴 수. */
  migrated?: { deleted: number; keptDark: number };
  /** 옛 구조라 바꾸지 않았다 — 확인 팝업에 보일 것. */
  needsMigration?: DarkMigrationPlan;
  /** 플러그인 Global이 없어 바꾸지 않았다. */
  noTarget?: boolean;
  /** 기록 pluginData를 새로 쓰거나 바꿨는지(안에서만 — 되돌리기 묶음 판정). */
  recordChanged?: boolean;
  /** 모드 추가 실패 사유(플랜 한도 등). */
  error?: string;
}

function isVariableAlias(raw: unknown): raw is VariableAlias {
  return !!raw && typeof raw === 'object' && 'type' in raw && (raw as VariableAlias).type === 'VARIABLE_ALIAS';
}

function isColor(raw: unknown): raw is RGBA {
  return !!raw && typeof raw === 'object' && 'r' in raw && 'g' in raw && 'b' in raw;
}

/** 모드 이름 대소문자 무시 검색. */
export function findModeByName(
  modes: ReadonlyArray<{ modeId: string; name: string }>,
  name: string,
): { modeId: string; name: string } | undefined {
  const key = name.toLowerCase();
  return modes.find((m) => m.name.toLowerCase() === key);
}

/** 컬렉션의 Dark 모드 — 기본이 아닌 모드 가운데 이름이 `dark`(대소문자 무시)인 첫 모드(13.7). */
export function findDarkMode(collection: { defaultModeId: string; modes: ReadonlyArray<{ modeId: string; name: string }> }): { modeId: string; name: string } | undefined {
  return findModeByName(collection.modes.filter((m) => m.modeId !== collection.defaultModeId), DARK_MODE_NAME);
}

/**
 * 대상 컬렉션에 `Dark` 모드가 있으면 재사용, 없으면 `addMode('Dark')`.
 * 기본 모드는 이름이 Dark여도 잡지 않는다(Light 칸을 덮어쓰지 않게 — 13.7).
 * Figma 플랜 한도 등으로 실패하면 예외를 그대로 던진다(호출측에서 error로 담음).
 */
export function ensureDarkMode(collection: VariableCollection): { modeId: string; created: boolean } {
  const existing = findDarkMode(collection);
  if (existing) return { modeId: existing.modeId, created: false };
  const modeId = collection.addMode(DARK_MODE_NAME);
  return { modeId, created: true };
}

function readRecord(v: Variable): string {
  try {
    const fn = (v as unknown as { getPluginData?: (k: string) => string }).getPluginData;
    return typeof fn === 'function' ? fn.call(v, DARK_CALC_KEY) || '' : '';
  } catch {
    return '';
  }
}

function writeRecord(v: Variable, val: string): boolean {
  if (readRecord(v) === val) return false;
  try {
    (v as unknown as { setPluginData?: (k: string, x: string) => void }).setPluginData?.(DARK_CALC_KEY, val);
    return true;
  } catch {
    return false;
  }
}

/** 한 Global 색의 칸 판정 재료. 대상이 아니면 null(건너뜀). */
interface CellPlan {
  v: Variable;
  light: RGBA;
  calc: RGBA;
  lightHex: string;
  calcHex: string;
}

function cellPlan(v: Variable, lightModeId: string): CellPlan | null {
  if (v.resolvedType !== 'COLOR' || isDarkGlobalName(v.name) || isManual(v)) return null;
  const raw = v.valuesByMode[lightModeId];
  if (!isColor(raw)) return null;
  const a = typeof raw.a === 'number' ? raw.a : 1;
  // 밝기만 바꾸고 투명도는 그대로(ia-v3 §2.11 "반투명 색 토큰")
  const calc = { ...hexToRgb(darkValueForLight(rgbToHex(raw))), a };
  return { v, light: { ...raw, a }, calc, lightHex: darkCellHex({ ...raw, a }), calcHex: darkCellHex(calc) };
}

function cellAction(p: CellPlan, darkModeId: string): DarkCellAction {
  const d = p.v.valuesByMode[darkModeId];
  const dark = d === undefined ? undefined : isColor(d) ? darkCellHex(d) : null;
  return classifyDarkCell(p.lightHex, p.calcHex, dark, readRecord(p.v));
}

/**
 * 다시 채울 칸 알림(13.7) — 지금 [다크 만들기]를 누르면 `filled`가 될 Global 색.
 * 플러그인 Global에 Dark 모드가 없으면 0. 이름 순(코드 단위 비교) 앞 10개.
 */
export function countDarkStale(cols: readonly VariableCollection[], vars: readonly Variable[]): { count: number; names: string[] } {
  const g = ownedCollection(cols, 'global');
  const dark = g ? findDarkMode(g) : undefined;
  if (!g || !dark) return { count: 0, names: [] };
  const names: string[] = [];
  for (const v of vars) {
    if (v.variableCollectionId !== g.id) continue;
    const p = cellPlan(v, g.defaultModeId);
    if (p && cellAction(p, dark.modeId) === 'fill') names.push(v.name);
  }
  names.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return { count: names.length, names: names.slice(0, 10) };
}

/** 두 모드 값이 같은가(별칭은 같은 대상, 색은 같은 `darkCellHex`). */
function sameValue(a: unknown, b: unknown): boolean {
  if (isVariableAlias(a) || isVariableAlias(b)) return isVariableAlias(a) && isVariableAlias(b) && a.id === b.id;
  if (isColor(a) && isColor(b)) return darkCellHex(a) === darkCellHex(b);
  return a === b;
}

/** 옛 다크 모드 — 플러그인 Semantic의 기본이 아닌 모드 중 이름이 dark이거나 `dark/…`를 가리키는 값이 있는 모드. */
function legacyDarkModes(sem: VariableCollection, semVars: readonly Variable[], byId: Map<string, Variable>): { modeId: string; name: string }[] {
  return sem.modes.filter((m) => {
    if (m.modeId === sem.defaultModeId) return false;
    if (m.name.toLowerCase() === DARK_MODE_NAME.toLowerCase()) return true;
    return semVars.some((v) => {
      const raw = v.valuesByMode[m.modeId];
      return isVariableAlias(raw) && isDarkGlobalName(byId.get(raw.id)?.name ?? '');
    });
  });
}

interface Graph {
  cols: VariableCollection[];
  vars: Variable[];
  byId: Map<string, Variable>;
  global: VariableCollection;
  semantic?: VariableCollection;
  semVars: Variable[];
  /** 사용자 Global(13.3 계층 1, 플러그인 Global이 아님)의 변수인가. */
  isUserGlobal: (v: Variable | undefined) => boolean;
}

/** 기본 모드 값이 사용자 Global의 별칭인 플러그인 Semantic 색. */
function userGlobalRoles(g: Graph): Variable[] {
  if (!g.semantic) return [];
  const def = g.semantic.defaultModeId;
  return g.semVars.filter((v) => {
    const raw = v.valuesByMode[def];
    return v.resolvedType === 'COLOR' && isVariableAlias(raw) && g.isUserGlobal(g.byId.get(raw.id));
  });
}

/** 옮겨지는 역할이면 그 Global X와 짝 `dark/X`(13.7). */
function movedPair(g: Graph, v: Variable, legacy: readonly { modeId: string }[]): { x: Variable; dark?: Variable } | null {
  const sem = g.semantic as VariableCollection;
  const def = v.valuesByMode[sem.defaultModeId];
  if (!isVariableAlias(def)) return null;
  const x = g.byId.get(def.id);
  if (!x || x.variableCollectionId !== g.global.id || isDarkGlobalName(x.name)) return null;
  const want = darkGlobalName(x.name);
  let dark: Variable | undefined;
  for (const m of legacy) {
    const raw = v.valuesByMode[m.modeId];
    if (raw === undefined || sameValue(raw, def)) continue;
    const t = isVariableAlias(raw) ? g.byId.get(raw.id) : undefined;
    if (!t || t.name !== want || t.variableCollectionId !== g.global.id) return null;
    dark = t;
  }
  return { x, dark };
}

function planMigration(g: Graph, legacy: readonly { modeId: string; name: string }[]): DarkMigrationPlan {
  const sem = g.semantic as VariableCollection;
  const userRoleIds = new Set(userGlobalRoles(g).map((v) => v.id));
  const differs = (v: Variable): boolean => legacy.some((m) => {
    const raw = v.valuesByMode[m.modeId];
    return raw !== undefined && !sameValue(raw, v.valuesByMode[sem.defaultModeId]);
  });
  const lost: string[] = [];
  let userRoles = 0;
  for (const v of g.semVars) {
    if (v.resolvedType !== 'COLOR' || !differs(v)) continue;
    if (userRoleIds.has(v.id)) userRoles++;
    else if (!movedPair(g, v, legacy)) lost.push(v.name);
  }
  lost.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return {
    modes: legacy.map((m) => m.name),
    darkVars: g.vars.filter((v) => v.variableCollectionId === g.global.id && isDarkGlobalName(v.name)).length,
    lost,
    userRoles,
  };
}

export interface GenerateDarkOptions {
  /** 옛 구조를 옮긴다(확인 팝업의 [옮기기]). */
  migrate?: boolean;
  /** ④ 안 쓰는 변수 찾기 — 테스트에서 바꿔 끼운다. 기본은 파일 전체를 훑는 `scanUnusedVariables`. */
  scanUnused?: () => Promise<{ items: { id: string; kind: string }[]; cancelled?: boolean }>;
}

/**
 * 플러그인 Global에 Dark 모드를 두고 Global 색마다 Dark 칸을 채운다(ia-v3 13.7 "다크").
 * 플러그인 Global이 없으면 `noTarget`, 옛 구조면(옮기기가 아니면) `needsMigration`으로 바꾸지 않고 답한다.
 */
export async function generateDarkMode(opts: GenerateDarkOptions = {}): Promise<DarkModeResult> {
  const out: DarkModeResult = { filled: 0, kept: 0, same: 0, skipped: 0, userRoles: 0 };
  const cols = await figma.variables.getLocalVariableCollectionsAsync();
  if (!ownedCollection(cols, 'global')) return { ...out, noTarget: true };
  let vars = await figma.variables.getLocalVariablesAsync();
  const tiers = collectionTiers(cols, vars);
  const global = ownedCollection(cols, 'global') as VariableCollection;
  const semantic = ownedCollection(cols, 'semantic');
  const graph: Graph = {
    cols,
    vars,
    byId: new Map(vars.map((v) => [v.id, v])),
    global,
    semantic,
    semVars: semantic ? vars.filter((v) => v.variableCollectionId === semantic.id) : [],
    isUserGlobal: (v) => !!v && v.variableCollectionId !== global.id && tiers.get(v.variableCollectionId) === 1,
  };
  out.userRoles = userGlobalRoles(graph).length;
  const legacy = semantic ? legacyDarkModes(semantic, graph.semVars, graph.byId) : [];
  if (legacy.length && !opts.migrate) return { ...out, needsMigration: planMigration(graph, legacy) };

  ensureOwnedCollection(cols, 'global'); // 이어받은 Global이면 표시를 단다(쓰기 직전)
  // ① Dark 모드
  let darkModeId: string;
  let modeCreated = false;
  try {
    const ensured = ensureDarkMode(global);
    darkModeId = ensured.modeId;
    modeCreated = ensured.created;
  } catch (e) {
    const why = e instanceof Error ? e.message : String(e);
    return { ...out, error: t('dark.errAddMode', { why: why || t('dark.errAddModePlan') }) };
  }
  const lightModeId = global.defaultModeId;
  let recordChanged = false;

  if (legacy.length) {
    // ② 옮겨지는 역할의 X마다 Dark 칸 = dark/X의 직접 값
    const done = new Set<string>();
    for (const v of graph.semVars) {
      if (v.resolvedType !== 'COLOR') continue;
      const pair = movedPair(graph, v, legacy);
      if (!pair?.dark || done.has(pair.x.id)) continue;
      done.add(pair.x.id);
      const raw = pair.dark.valuesByMode[lightModeId];
      if (!isColor(raw)) continue; // dark/X가 별칭이면 넣지 않음
      const p = cellPlan(pair.x, lightModeId);
      if (!p || cellAction(p, darkModeId) === 'kept') continue; // 손댄 칸은 둔다
      const val = { ...raw, a: typeof raw.a === 'number' ? raw.a : 1 };
      pair.x.setValueForMode(darkModeId, val);
      // C와 같을 때만 기록 — 다르면(다듬은 dark/X일 수 있음) 기록을 지워 손댄 칸으로 지킨다
      recordChanged = writeRecord(pair.x, darkCellHex(val) === p.calcHex ? p.calcHex : '') || recordChanged;
    }
    // ③ 플러그인 Semantic의 옛 다크 모드를 지운다(다른 모드는 둔다)
    for (const m of legacy) {
      try {
        semantic?.removeMode(m.modeId);
      } catch {
        /* 못 지우면(마지막 모드 등) 그대로 — 아래 결과가 말한다 */
      }
    }
    // ④ 안 쓰는 dark/… 지우기(파일 한 번 훑기 — `none`만)
    const scan = await (opts.scanUnused ?? scanUnusedVariables)();
    const none = new Set(scan.items.filter((i) => i.kind === 'none').map((i) => i.id));
    vars = await figma.variables.getLocalVariablesAsync();
    let deleted = 0;
    let keptDark = 0;
    for (const v of vars) {
      if (v.variableCollectionId !== global.id || !isDarkGlobalName(v.name)) continue;
      if (!none.has(v.id) || isManual(v)) {
        keptDark++;
        continue;
      }
      try {
        v.remove();
        deleted++;
      } catch {
        keptDark++;
      }
    }
    out.migrated = { deleted, keptDark };
    vars = await figma.variables.getLocalVariablesAsync();
  }

  // ⑤ 칸 채우기
  for (const v of vars) {
    if (v.variableCollectionId !== global.id || v.resolvedType !== 'COLOR') continue;
    const p = cellPlan(v, lightModeId);
    if (!p) {
      out.skipped++;
      continue;
    }
    const act = cellAction(p, darkModeId);
    if (act === 'kept') out.kept++;
    else if (act === 'same') {
      out.same++;
      recordChanged = writeRecord(v, p.calcHex) || recordChanged;
    } else {
      v.setValueForMode(darkModeId, p.calc);
      writeRecord(v, p.calcHex);
      recordChanged = true;
      out.filled++;
    }
  }
  // 값을 하나도 못 채웠는데 모드만 남기면 Light와 똑같이 해석되는 Dark가 생기고,
  // 준비 현황은 '다크 있음'으로 뒤집힌다 — 만든 걸 도로 걷는다(옮기기는 Semantic 모드를 이미 지웠으므로 제외).
  if (modeCreated && !legacy.length && out.filled + out.kept + out.same === 0) {
    try {
      global.removeMode(darkModeId);
      modeCreated = false;
    } catch {
      /* 못 지우면 그대로 — 채운 게 없다는 사실은 결과가 말한다 */
    }
  }
  return { ...out, ...(modeCreated ? { modeCreated: true } : {}), ...(recordChanged ? { recordChanged: true } : {}) };
}
