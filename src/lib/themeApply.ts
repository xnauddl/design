/* ============================================================
   themeApply.ts — 다크 모드 연결 (figma 의존 → 목으로 테스트)
   규칙 자체는 순수 darkRules.ts가 맡고, 여기서는 변수 그래프를 읽고 쓴다.

   결정 D-T2(ia-v3 13.7 "다크 — D-T2" · A.30 — DK-D5–DK-D11): 플러그인 Global은 모드 없는 팔레트 하나,
   플러그인 Semantic에 Dark 모드를 더하고 역할마다 Dark가 다른 Global 스텝을 별칭으로 가리킨다(역할별 규칙).
   쓸 역할의 계열은 50–950 전체 스케일을 채운다. 칸마다 기록(`dsl.darkPick`)을 남겨 직접 고친 Dark 연결은 지킨다.
   D-T1 파일(플러그인 Global에 Dark 모드)은 확인을 받은 뒤 옮긴다(1–5).
   ============================================================ */
import { t } from './i18n';
import { rgbToHex, hexToRgb } from './tokens';
import { ensureOwnedCollection, ownedCollection } from './collectionRoles';
import { isManualVar as isManual } from './variables'; // 직접 만든 변수(IA v4 §4.9)
import { lightStepOf, darkStepFor, useOfRoleName, scaleStepColor, DARK_STEPS, type LightStep, type ScaleAnchor } from './darkRules';
import { nameColorsByHue } from './colorName';

/** 플러그인 Semantic에 만들/재사용할 다크 모드 표시 이름. */
export const DARK_MODE_NAME = 'Dark';
/** 역할마다 Dark 연결 기록 — Semantic 변수 플러그인 데이터(13.7 D-T2 "채운 기록"). */
export const DARK_PICK_KEY = 'dsl.darkPick';
/** D-T1 기록(플러그인 Global 변수) — 옮기기 1에서만 읽고 4에서 지운다. */
export const DARK_FILL_KEY = 'dsl.darkFill';
/** 별칭 따라가기 한도(변수 탭 따라가기와 같음). */
const MAX_ALIAS_HOPS = 8;

export interface DarkMigrated {
  /** 사용자 Dark 값을 옮긴 역할 a. */
  moved: number;
  /** 그 값으로 새로 만든 Global 스텝 g. */
  added: number;
}

export interface DarkModeResult {
  /** 연결한 역할 n. */
  filled: number;
  /** 그대로 둔 역할 k. */
  kept: number;
  /** 대상 역할 수(0이면 "연결할 역할 없음"). */
  targets: number;
  /** `Dark` 모드를 이번 실행에서 새로 추가했는지. */
  modeCreated?: boolean;
  /** 전체 스케일로 만든 Global 스텝 수(0이면 없음). */
  scaleAdded?: number;
  /** D-T1 파일을 옮겼으면 그 결과. */
  migrated?: DarkMigrated;
  /** D-T1 파일인데 확인 전 — 아무것도 바꾸지 않았다(UI가 팝업을 띄운다). lost = 옮겨지지 않고 사라질 사용자 Dark 값 수. */
  needMigrate?: { lost: number };
  /** 거절 사유(플러그인 Semantic 없음 · 모드 추가 실패 · 같은 모드). */
  error?: string;
  /** 파일을 바꿨는지(code.ts가 commitUndo 판단에 쓰고 메시지에서는 뺀다). */
  changed?: boolean;
}

/** 역할 하나의 Dark 연결 기록. 칸 값은 별칭이면 `alias:{id}`, 색이면 `#RRGGBBAA`. */
export interface DarkPickEntry {
  l: string;
  d: string;
  by: 'calc' | 'user';
}
export type DarkPickRecord = Record<string, DarkPickEntry>;

/** D-T1 기록(옮기기에서 읽기만). */
export interface DarkFillEntry {
  f: string;
  l: string;
  d: string;
  by: 'calc' | 'user';
}
export type DarkFillRecord = Record<string, DarkFillEntry>;

type Modes = ReadonlyArray<{ modeId: string; name: string }>;

function isVariableAlias(raw: unknown): raw is VariableAlias {
  return !!raw && typeof raw === 'object' && 'type' in raw && (raw as VariableAlias).type === 'VARIABLE_ALIAS';
}
function isColor(raw: unknown): raw is RGB | RGBA {
  return !!raw && typeof raw === 'object' && 'r' in raw && 'g' in raw && 'b' in raw;
}

/** 색 값 → `#RRGGBBAA`(채널마다 0–255 반올림, 대문자) — 기록 · 견주기 공통(Figma 소수 오차 무시). */
export function hex8(raw: unknown): string | null {
  if (!isColor(raw)) return null;
  const h = (c: number) => Math.round(Math.min(1, Math.max(0, c)) * 255).toString(16).padStart(2, '0');
  const a = typeof (raw as RGBA).a === 'number' ? (raw as RGBA).a : 1;
  return `#${h(raw.r)}${h(raw.g)}${h(raw.b)}${h(a)}`.toUpperCase();
}
/** 칸 값 → 기록에 적는 꼴(색은 hex8, 별칭은 `alias:{id}`, 그 밖은 null). */
function cellKey(raw: unknown): string | null {
  if (isVariableAlias(raw)) return `alias:${raw.id}`;
  return hex8(raw);
}

/**
 * 모드 이름 검색 — 앞뒤 공백을 떼고 대소문자 무시(13.7 — 모든 쓰는 곳이 같은 비교).
 * `exceptModeId`(보통 기본 모드)는 빼고 찾는다.
 */
export function findModeByName(modes: Modes, name: string, exceptModeId?: string): { modeId: string; name: string } | undefined {
  const key = name.trim().toLowerCase();
  return modes.find((m) => m.modeId !== exceptModeId && m.name.trim().toLowerCase() === key);
}

/**
 * 컬렉션에 기본이 아닌 `Dark` 모드가 있으면 재사용, 없으면 `addMode('Dark')`.
 * Figma 플랜 한도 등으로 실패하면 예외를 그대로 던진다(호출측에서 error로 담음).
 */
export function ensureDarkMode(collection: VariableCollection): { modeId: string; created: boolean } {
  const existing = findModeByName(collection.modes, DARK_MODE_NAME, collection.defaultModeId);
  if (existing) return { modeId: existing.modeId, created: false };
  const modeId = collection.addMode(DARK_MODE_NAME);
  return { modeId, created: true };
}

/** D-T1 구조의 Global Dark 모드(GD) — 플러그인 Global의 기본이 아닌 `Dark`. 없으면 undefined. */
export function globalDarkMode(global: VariableCollection | undefined): { modeId: string; name: string } | undefined {
  return global ? findModeByName(global.modes, DARK_MODE_NAME, global.defaultModeId) : undefined;
}

function readJson<T>(v: Variable, key: string): Record<string, T> {
  try {
    const fn = (v as unknown as { getPluginData?: (k: string) => string }).getPluginData;
    const raw = typeof fn === 'function' ? fn.call(v, key) : '';
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, T>) : {};
  } catch {
    return {};
  }
}
function setData(v: Variable, key: string, val: string): void {
  (v as unknown as { setPluginData?: (k: string, val: string) => void }).setPluginData?.(key, val);
}
/** D-T1 기록 읽기(깨졌으면 빈 기록). */
export function readDarkFill(v: Variable): DarkFillRecord {
  return readJson<DarkFillEntry>(v, DARK_FILL_KEY);
}
/** D-T2 기록 읽기(깨졌으면 빈 기록). */
export function readDarkPick(v: Variable): DarkPickRecord {
  return readJson<DarkPickEntry>(v, DARK_PICK_KEY);
}
function writeDarkPick(v: Variable, rec: DarkPickRecord): void {
  setData(v, DARK_PICK_KEY, JSON.stringify(rec));
}
/** 열쇠(to) 모드가 없어진 기록은 버린다. */
function pruneRecord<T>(rec: Record<string, T>, modeIds: Set<string>): Record<string, T> {
  const out: Record<string, T> = {};
  for (const [k, e] of Object.entries(rec)) if (modeIds.has(k) && e && typeof e === 'object') out[k] = e;
  return out;
}

/** 별칭을 대상 컬렉션 기본 모드로 따라가 색으로 푼다(최대 8단계). 못 풀면 null. */
function resolveColor(raw: unknown, byId: Map<string, Variable>, defOf: Map<string, string>): RGBA | null {
  let cur = raw;
  const seen = new Set<string>();
  for (let hop = 0; hop <= MAX_ALIAS_HOPS; hop++) {
    if (isColor(cur)) return { r: cur.r, g: cur.g, b: cur.b, a: typeof (cur as RGBA).a === 'number' ? (cur as RGBA).a : 1 };
    if (!isVariableAlias(cur) || hop === MAX_ALIAS_HOPS || seen.has(cur.id)) return null;
    seen.add(cur.id);
    const tv = byId.get(cur.id);
    if (!tv) return null;
    cur = tv.valuesByMode[defOf.get(tv.variableCollectionId) ?? ''];
  }
  return null;
}

/** 대상 역할 하나(13.7 D-T2 "대상 역할" · "Light 스텝 읽기" · 역할별 규칙). */
interface Target {
  r: Variable;
  g: Variable;
  ls: LightStep;
  /** 규칙 1(그림자 · 반투명)이면 null — Light와 같은 G. */
  step: number | null;
  /** 규칙 스텝 이름(`color/{계열}/{s′}`). step이 null이면 없음. */
  ruleName?: string;
}

const cmpStr = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** 대상 역할 — R 이름 오름차순. 규칙 스텝 이름의 변수가 색 변수가 아니면 뺀다. */
function collectTargets(semantic: VariableCollection, global: VariableCollection | undefined, vars: readonly Variable[]): Target[] {
  if (!global) return [];
  const byId = new Map(vars.map((v) => [v.id, v]));
  const gByName = new Map(vars.filter((v) => v.variableCollectionId === global.id).map((v) => [v.name, v]));
  const out: Target[] = [];
  for (const r of vars) {
    if (r.variableCollectionId !== semantic.id || r.resolvedType !== 'COLOR' || isManual(r)) continue;
    const L = r.valuesByMode[semantic.defaultModeId];
    if (!isVariableAlias(L)) continue;
    const g = byId.get(L.id);
    if (!g || g.variableCollectionId !== global.id || g.resolvedType !== 'COLOR') continue;
    const gv = g.valuesByMode[global.defaultModeId];
    if (!isColor(gv)) continue;
    const alpha = typeof (gv as RGBA).a === 'number' ? (gv as RGBA).a : 1;
    const ls = lightStepOf(g.name, rgbToHex(gv));
    const step = darkStepFor({ use: useOfRoleName(r.name), alpha, achromatic: ls.achromatic, step: ls.step });
    if (step === null) {
      out.push({ r, g, ls, step: null });
      continue;
    }
    const ruleName = `color/${ls.family}/${step}`;
    const existing = gByName.get(ruleName);
    if (existing && existing.resolvedType !== 'COLOR') continue; // 색 변수가 아닌 이름 — 대상에서 뺀다(받아들임)
    out.push({ r, g, ls, step, ruleName });
  }
  return out.sort((a, b) => cmpStr(a.r.name, b.r.name));
}

/**
 * Dark 연결이 없는 역할 수(13.7 D-T2). 플러그인 Semantic 모드가 하나면 0.
 * 지금 모드를 열쇠로 한 기록이 user이거나, calc이고 Light = `l`이면 연결된 역할. 기록 없이 Dark ≠ Light도 연결된 역할.
 */
export function countDarkUnfilled(cols: readonly VariableCollection[], vars: readonly Variable[]): number {
  const semantic = ownedCollection(cols, 'semantic');
  if (!semantic || semantic.modes.length < 2) return 0;
  const global = ownedCollection(cols, 'global');
  const modeIds = new Set(semantic.modes.map((m) => m.modeId));
  const others = semantic.modes.map((m) => m.modeId).filter((m) => m !== semantic.defaultModeId);
  let n = 0;
  for (const tg of collectTargets(semantic, global, vars)) {
    const L = cellKey(tg.r.valuesByMode[semantic.defaultModeId]);
    const rec = readDarkPick(tg.r);
    const recorded = Object.entries(rec).some(([to, e]) => modeIds.has(to) && !!e && (e.by === 'user' || (e.by === 'calc' && e.l === L)));
    if (recorded) continue;
    const anyNoRecordDiff = others.some((m) => !rec[m] && tg.r.valuesByMode[m] != null && cellKey(tg.r.valuesByMode[m]) !== L);
    if (!anyNoRecordDiff) n++;
  }
  return n;
}

/** 다크 화면 알림 띠에 쓰는 다크 상태(code.ts `postPrereq`). darkOld = D-T1 구조(옮기기 전). darkOldManual은 늘 거짓(필드만 남김). */
export function darkPrereq(cols: readonly VariableCollection[], vars: readonly Variable[]): { hasDarkMode: boolean; darkUnfilled: number; darkOld: boolean; darkOldManual: boolean } {
  const global = ownedCollection(cols, 'global');
  const semantic = ownedCollection(cols, 'semantic');
  const darkOld = !!globalDarkMode(global);
  return {
    hasDarkMode: (semantic?.modes.length ?? 0) > 1 || darkOld,
    darkUnfilled: countDarkUnfilled(cols, vars),
    darkOld,
    darkOldManual: false,
  };
}

/** 표식 — 쓰기 중에 예외가 나면 그때까지 바꾼 것이 있는지(code.ts가 commitUndo로 묶는다). */
const CHANGED_FLAG = '__darkChanged';
export function darkChangedBeforeError(e: unknown): boolean {
  return !!e && typeof e === 'object' && (e as Record<string, unknown>)[CHANGED_FLAG] === true;
}

/** D-T1 옮기기 1 — X의 사용자 Dark 값인가(기록 user · calc인데 GD ≠ d · 기록 없이 GD ≠ 기본 칸). */
function hasUserDark(x: Variable, global: VariableCollection, gdId: string): boolean {
  const D = x.valuesByMode[gdId];
  if (D === undefined || D === null) return false;
  const rec = readDarkFill(x)[gdId];
  if (rec?.by === 'user') return true;
  if (rec?.by === 'calc') return cellKey(D) !== rec.d;
  return cellKey(D) !== cellKey(x.valuesByMode[global.defaultModeId]);
}

/** 옮기기 3 — X의 GD 칸을 가리킬 대상으로(쓸 수 있는 별칭 대상 · 같은 값 변수 · 새로 만들 색). 못 풀면 null. */
function migrateTarget(
  x: Variable,
  global: VariableCollection,
  gdId: string,
  vars: readonly Variable[],
  byId: Map<string, Variable>,
  defOf: Map<string, string>,
): { use: Variable } | { make: RGBA } | null {
  const D = x.valuesByMode[gdId];
  if (isVariableAlias(D)) {
    const tv = byId.get(D.id);
    if (tv && tv.resolvedType === 'COLOR' && tv.variableCollectionId === global.id && isColor(tv.valuesByMode[global.defaultModeId])) return { use: tv };
  }
  const col = resolveColor(D, byId, defOf);
  if (!col) return null;
  const h = hex8(col);
  const same = vars.filter((v) => v.variableCollectionId === global.id && v.resolvedType === 'COLOR' && hex8(v.valuesByMode[global.defaultModeId]) === h);
  if (same.some((v) => v.id === x.id)) return { use: x };
  const plain = same.filter((v) => !isManual(v) && !v.name.startsWith('dark/')).sort((a, b) => cmpStr(a.name, b.name));
  const rest = same.filter((v) => !plain.includes(v)).sort((a, b) => cmpStr(a.name, b.name));
  const first = plain[0] ?? rest[0];
  return first ? { use: first } : { make: col };
}

function createGlobalColor(global: VariableCollection, name: string, rgba: RGBA, scopes: readonly VariableScope[] | undefined): Variable {
  const v = figma.variables.createVariable(name, global, 'COLOR');
  v.setValueForMode(global.defaultModeId, rgba);
  if (scopes) {
    try {
      v.scopes = [...scopes];
    } catch {
      // 용도를 못 쓰면 기본(ALL_SCOPES) 그대로
    }
  }
  return v;
}

/**
 * 다크 만들기(13.7 "다크 — D-T2"). 대상은 늘 플러그인 Semantic(인자로 받지 않음).
 * 판정 순서: 플러그인 Semantic 없음 → Semantic 기본 모드 이름이 Dark뿐 → D-T1 구조이고 `migrate`가 없으면 `needMigrate`(쓰기 없음)
 * → (쓰기) 모드 ensure → 옮기기 3–4(승인 때) → 실행 순서 ①–④.
 */
export async function generateDarkMode(migrate?: boolean): Promise<DarkModeResult> {
  const cols = await figma.variables.getLocalVariableCollectionsAsync();
  const semantic = ownedCollection(cols, 'semantic');
  if (!semantic) return { filled: 0, kept: 0, targets: 0, error: t('dark.errNoCol') };
  const from = semantic.defaultModeId;
  const defMode = semantic.modes.find((m) => m.modeId === from);
  if (defMode && findModeByName([defMode], DARK_MODE_NAME) && !findModeByName(semantic.modes, DARK_MODE_NAME, from)) {
    return { filled: 0, kept: 0, targets: 0, error: t('dark.errSameMode') };
  }
  const global = ownedCollection(cols, 'global');
  const gd = globalDarkMode(global);
  let vars = await figma.variables.getLocalVariablesAsync();
  const defOf = new Map(cols.map((c) => [c.id, c.defaultModeId]));

  // 옮기기 판정(읽기만) — 역할마다 첫 갈래(이미 Semantic Dark ≠ Light)인지 · 옮길 X.
  const semDarkBefore = findModeByName(semantic.modes, DARK_MODE_NAME, from);
  const keepFirst = (r: Variable, modeCreated: boolean, to: string | undefined): boolean => {
    if (modeCreated || !to) return false;
    const D = r.valuesByMode[to];
    return D !== undefined && D !== null && cellKey(D) !== cellKey(r.valuesByMode[from]);
  };
  if (gd && global && !migrate) {
    const byId = new Map(vars.map((v) => [v.id, v]));
    const tgs = collectTargets(semantic, global, vars);
    let lost = 0;
    for (const x of vars) {
      if (x.variableCollectionId !== global.id || x.resolvedType !== 'COLOR' || !hasUserDark(x, global, gd.modeId)) continue;
      const roles = tgs.filter((tg) => tg.g.id === x.id && !keepFirst(tg.r, !semDarkBefore, semDarkBefore?.modeId));
      if (!roles.length || !migrateTarget(x, global, gd.modeId, vars, byId, defOf)) lost++;
    }
    return { filled: 0, kept: 0, targets: 0, needMigrate: { lost } };
  }

  // 모드 ensure — 실패하면 아무것도 바뀌지 않는다.
  let to: string;
  let modeCreated = false;
  try {
    ensureOwnedCollection(cols, 'semantic'); // 이어받은 컬렉션이면 쓰기 직전에 표시를 단다(13.2-3)
    const ensured = ensureDarkMode(semantic);
    to = ensured.modeId;
    modeCreated = ensured.created;
  } catch (e) {
    const why = e instanceof Error ? e.message : String(e);
    return { filled: 0, kept: 0, targets: 0, error: t('dark.errAddMode', { why: why || t('dark.errAddModePlan') }) };
  }
  let changed = modeCreated;
  try {
    // 모드를 더하면 Figma가 칸을 채울 수 있으니 다시 읽는다.
    vars = await figma.variables.getLocalVariablesAsync();
    const modeIds = new Set(semantic.modes.map((m) => m.modeId));
    const alias = (v: Variable) => figma.variables.createVariableAlias(v);
    const done = new Set<string>(); // 옮기기 3에서 기록한 역할
    let migrated: DarkMigrated | undefined;
    let globalMarked = false;
    const markGlobal = () => {
      if (!globalMarked) ensureOwnedCollection(cols, 'global');
      globalMarked = true;
    };

    // 옮기기 3–4(승인 때)
    if (gd && global) {
      markGlobal();
      const byId = new Map(vars.map((v) => [v.id, v]));
      const taken = new Set(vars.filter((v) => v.variableCollectionId === global.id).map((v) => v.name));
      const tgs = collectTargets(semantic, global, vars);
      const chosen = new Map<string, Variable | null>(); // X id → 대상(null = 못 풂)
      let moved = 0;
      let added = 0;
      for (const tg of tgs) {
        const r = tg.r;
        const L = cellKey(r.valuesByMode[from]) ?? '';
        if (keepFirst(r, modeCreated, to)) {
          const rec = pruneRecord(readDarkPick(r), modeIds);
          rec[to] = { l: L, d: cellKey(r.valuesByMode[to]) ?? '', by: 'user' };
          writeDarkPick(r, rec);
          done.add(r.id);
          changed = true;
          continue;
        }
        const x = tg.g;
        if (!hasUserDark(x, global, gd.modeId)) continue;
        if (!chosen.has(x.id)) {
          const m = migrateTarget(x, global, gd.modeId, vars, byId, defOf);
          if (!m) chosen.set(x.id, null);
          else if ('use' in m) chosen.set(x.id, m.use);
          else {
            const name = nameColorsByHue([rgbToHex(m.make)], 1, taken)[0];
            taken.add(name);
            const nv = createGlobalColor(global, name, m.make, x.scopes);
            added++;
            chosen.set(x.id, nv);
          }
        }
        const target = chosen.get(x.id);
        if (!target) continue; // 못 풂 — 아래 보통 실행이 규칙 값
        r.setValueForMode(to, alias(target));
        const rec = pruneRecord(readDarkPick(r), modeIds);
        rec[to] = { l: L, d: `alias:${target.id}`, by: 'user' };
        writeDarkPick(r, rec);
        done.add(r.id);
        moved++;
        changed = true;
      }
      // 4 — Global Dark 모드 지우기 · D-T1 기록 지우기
      global.removeMode(gd.modeId);
      for (const v of vars) if (v.variableCollectionId === global.id && readDarkFill(v) && Object.keys(readDarkFill(v)).length) setData(v, DARK_FILL_KEY, '');
      changed = true;
      migrated = { moved, added };
      vars = await figma.variables.getLocalVariablesAsync();
    }

    // 실행 순서 ① 판정(쓰지 않음)
    const targets = collectTargets(semantic, global, vars);
    const gByName = new Map(global ? vars.filter((v) => v.variableCollectionId === global.id).map((v) => [v.name, v]) : []);
    const ruleValue = (tg: Target): string | null => {
      if (tg.step === null) return `alias:${tg.g.id}`;
      const v = gByName.get(tg.ruleName!);
      return v ? `alias:${v.id}` : null;
    };
    const writes: Target[] = [];
    const toUser: Target[] = [];
    let kept = 0;
    for (const tg of targets) {
      if (done.has(tg.r.id)) continue;
      const r = tg.r;
      const L = cellKey(r.valuesByMode[from]);
      const D = r.valuesByMode[to];
      const entry = pruneRecord(readDarkPick(r), modeIds)[to];
      if (modeCreated || D === undefined || D === null) writes.push(tg);
      else if (entry?.by === 'user') kept++;
      else if (entry?.by === 'calc') {
        const rv = ruleValue(tg);
        if (cellKey(D) !== entry.d) toUser.push(tg);
        else if (L !== entry.l || rv === null || entry.d !== rv) writes.push(tg);
      } else if (cellKey(D) === L) writes.push(tg);
      else toUser.push(tg);
    }

    // ② 쓸 역할(규칙 1 제외)의 계열마다 전체 스케일
    let scaleAdded = 0;
    if (global) {
      const famFirst = new Map<string, Target>(); // 계열 → R 이름 오름차순 첫째(writes는 이미 이름순)
      for (const tg of writes) if (tg.step !== null && !famFirst.has(tg.ls.family)) famFirst.set(tg.ls.family, tg);
      for (const fam of [...famFirst.keys()].sort(cmpStr)) {
        const first = famFirst.get(fam)!;
        let anchors: ScaleAnchor[] = [];
        for (const s of DARK_STEPS) {
          const v = gByName.get(`color/${fam}/${s}`);
          const val = v && v.resolvedType === 'COLOR' ? v.valuesByMode[global.defaultModeId] : undefined;
          if (isColor(val) && (typeof (val as RGBA).a !== 'number' || (val as RGBA).a >= 1)) anchors.push({ step: s, hex: rgbToHex(val), name: v!.name });
        }
        if (!anchors.length) {
          anchors = targets
            .filter((tg) => tg.ls.family === fam)
            .map((tg) => ({ step: tg.ls.step, hex: rgbToHex(tg.g.valuesByMode[global.defaultModeId] as RGBA), name: tg.g.name }));
        }
        for (const s of DARK_STEPS) {
          const name = `color/${fam}/${s}`;
          if (gByName.has(name)) continue;
          markGlobal();
          const nv = createGlobalColor(global, name, { ...hexToRgb(scaleStepColor(s, anchors)), a: 1 }, first.g.scopes);
          gByName.set(name, nv);
          scaleAdded++;
          changed = true;
        }
      }
    }

    // ③ 쓸 역할에 규칙 스텝 별칭 · 기록
    let filled = 0;
    for (const tg of writes) {
      const r = tg.r;
      const target = tg.step === null ? tg.g : gByName.get(tg.ruleName!);
      if (!target) continue;
      r.setValueForMode(to, alias(target));
      const rec = pruneRecord(readDarkPick(r), modeIds);
      rec[to] = { l: cellKey(r.valuesByMode[from]) ?? '', d: `alias:${target.id}`, by: 'calc' };
      writeDarkPick(r, rec);
      filled++;
      changed = true;
    }
    // ④ 그대로 둘 역할 중 기록을 user로
    for (const tg of toUser) {
      const r = tg.r;
      const rec = pruneRecord(readDarkPick(r), modeIds);
      rec[to] = { l: cellKey(r.valuesByMode[from]) ?? '', d: cellKey(r.valuesByMode[to]) ?? '', by: 'user' };
      writeDarkPick(r, rec);
      kept++;
      changed = true;
    }
    kept += [...done].length - (migrated?.moved ?? 0); // 옮기기 3의 첫 갈래(그대로 둠)도 k

    // 새로 만든 모드에 쓴 칸이 하나도 없으면 지운다(빈 Dark 모드가 '다크 있음'으로 남지 않게).
    if (modeCreated && filled === 0 && (migrated?.moved ?? 0) === 0) {
      try {
        semantic.removeMode(to);
        modeCreated = false;
      } catch {
        // 못 지우면 그대로 둔다
      }
    }
    const out: DarkModeResult = { filled, kept, targets: targets.length, changed };
    if (modeCreated) out.modeCreated = true;
    if (scaleAdded) out.scaleAdded = scaleAdded;
    if (migrated) out.migrated = migrated;
    return out;
  } catch (e) {
    if (changed && e && typeof e === 'object') (e as Record<string, unknown>)[CHANGED_FLAG] = true;
    throw e;
  }
}
