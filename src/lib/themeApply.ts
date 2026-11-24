/* ============================================================
   themeApply.ts — 다크 모드 자동 채움 (figma 의존 → 목으로 테스트)
   값 변환 자체는 순수 themeGen.ts가 맡고, 여기서는 변수 그래프를 읽고 쓴다.
   (components.ts ↔ artwork.ts와 같은 분리)

   결정 D-T1(ia-v3 §2.13 13.7 "다크" · A.25): Dark 모드는 **플러그인 Global**에 더한다 —
   같은 Global 변수가 모드마다 다른 값을 가지고, Semantic은 모드 하나다. `dark/…` 복사본은 만들지 않는다.
   대상 · 모드는 플러그인이 정한다(from = Global 기본 모드, to = 기본이 아닌 `Dark` — 없으면 만든다).
   칸마다 채운 기록(`dsl.darkFill`)을 남겨, 다시 누를 때 직접 고친 Dark 칸은 지킨다.
   옛 구조(플러그인 Semantic에 `Dark` 모드)는 확인을 받은 뒤 옮긴다(①–⑥).
   ============================================================ */
import { t } from './i18n';
import { rgbToHex, hexToRgb } from './tokens';
import { ensureOwnedCollection, ownedCollection } from './collectionRoles';
import { darkValueForLight, isDarkGlobalName } from './themeGen';
import { isManualVar as isManual } from './variables'; // 직접 만든 변수(IA v4 §4.9)

/** 플러그인 Global에 만들/재사용할 다크 모드 표시 이름. */
export const DARK_MODE_NAME = 'Dark';
/** 칸마다 채운 기록 — 변수 플러그인 데이터(13.7 "채운 기록"). */
export const DARK_FILL_KEY = 'dsl.darkFill';
/** 별칭 따라가기 한도(변수 탭 따라가기와 같음). */
const MAX_ALIAS_HOPS = 8;

export interface DarkMigrated {
  /** 옮긴 색 a(b 포함). */
  moved: number;
  /** 값이 갈린 색 b. */
  split: number;
  /** 옮기지 못한 역할 c. */
  failed: number;
  splitNames: string[];
  failedNames: string[];
  /** 지운 `dark/…` 수. */
  removedDark: number;
}

export interface DarkModeResult {
  /** 채운 색 n. */
  filled: number;
  /** 그대로 둔 색 k(이번에 옮긴 칸 제외). */
  kept: number;
  /** 채우는 칸 대상 수(0이면 "채울 색 없음"). */
  targets: number;
  /** `Dark` 모드를 이번 실행에서 새로 추가했는지. */
  modeCreated?: boolean;
  /** 옛 구조를 옮겼으면 그 결과(채움 결과가 무엇이든 늘 싣는다). */
  migrated?: DarkMigrated;
  /** 옛 구조인데 확인 전 — 아무것도 바꾸지 않았다(UI가 팝업을 띄운다). */
  needMigrate?: { removeDark: number; mode: string };
  /** 거절 사유(플러그인 Global 없음 · 모드 추가 실패 · 같은 모드 · Semantic 모드 셋 이상). */
  error?: string;
  /** 파일을 바꿨는지(code.ts가 commitUndo 판단에 쓰고 메시지에서는 뺀다). */
  changed?: boolean;
}

/** 칸 하나의 기록. */
export interface DarkFillEntry {
  /** from 모드 id. */
  f: string;
  /** 그때의 from 칸(#RRGGBBAA). */
  l: string;
  /** 쓴(또는 지금) Dark 칸(#RRGGBBAA, 별칭이면 `alias:{id}`). */
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
function rgbaOfHex8(h: string): RGBA {
  const n = parseInt(h.slice(1, 7), 16);
  const a = parseInt(h.slice(7, 9), 16);
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255, a: a / 255 };
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

/** 옛 구조의 옮길 모드 — 플러그인 Semantic의 기본이 아닌 `Dark`(13.7). 없으면 undefined. */
export function oldDarkMode(semantic: VariableCollection | undefined): { modeId: string; name: string } | undefined {
  return semantic ? findModeByName(semantic.modes, DARK_MODE_NAME, semantic.defaultModeId) : undefined;
}

/** 기록 읽기(깨졌으면 빈 기록). */
export function readDarkFill(v: Variable): DarkFillRecord {
  try {
    const fn = (v as unknown as { getPluginData?: (k: string) => string }).getPluginData;
    const raw = typeof fn === 'function' ? fn.call(v, DARK_FILL_KEY) : '';
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as DarkFillRecord) : {};
  } catch {
    return {};
  }
}
function writeDarkFill(v: Variable, rec: DarkFillRecord): void {
  (v as unknown as { setPluginData?: (k: string, val: string) => void }).setPluginData?.(DARK_FILL_KEY, JSON.stringify(rec));
}

/** 채우는 칸 · 수 세기 대상 — 플러그인 Global의 색 변수 중 기본(from) 칸이 직접 값, `isManual` 아님, `dark/` 이름 아님. */
function darkTargets(global: VariableCollection, vars: readonly Variable[], fromModeId: string): Variable[] {
  return vars.filter(
    (v) =>
      v.variableCollectionId === global.id &&
      v.resolvedType === 'COLOR' &&
      !isManual(v) &&
      !isDarkGlobalName(v.name) &&
      isColor(v.valuesByMode[fromModeId]),
  );
}

/**
 * Dark 값이 없는 색 수(13.7 — 기록으로 센다). 플러그인 Global의 모드가 하나면 0.
 * 지금 있는 모드를 열쇠로 한 기록 중 user이거나, calc이고 `f` 모드 칸 = `l`인 것이 있으면 채운 색.
 */
export function countDarkUnfilled(cols: readonly VariableCollection[], vars: readonly Variable[]): number {
  const global = ownedCollection(cols, 'global');
  if (!global || global.modes.length < 2) return 0;
  const modeIds = new Set(global.modes.map((m) => m.modeId));
  let n = 0;
  for (const v of darkTargets(global, vars, global.defaultModeId)) {
    const rec = readDarkFill(v);
    const filled = Object.entries(rec).some(([to, e]) => {
      if (!modeIds.has(to) || !e) return false;
      if (e.by === 'user') return true;
      // 다시 누를 때 다시 계산하는 calc(f 모드 없음 · f 칸 ≠ l · 기본 모드가 바뀜 — generate의 fStale)는 채우지 않은 색으로 센다.
      return e.by === 'calc' && e.f === global.defaultModeId && hex8(v.valuesByMode[e.f]) === e.l;
    });
    if (!filled) n++;
  }
  return n;
}

/** 다크 화면 알림 띠에 쓰는 다크 상태(code.ts `postPrereq`). */
export function darkPrereq(cols: readonly VariableCollection[], vars: readonly Variable[]): { hasDarkMode: boolean; darkUnfilled: number; darkOld: boolean; darkOldManual: boolean } {
  const global = ownedCollection(cols, 'global');
  const semantic = ownedCollection(cols, 'semantic');
  const darkOld = !!oldDarkMode(semantic);
  return {
    hasDarkMode: (global?.modes.length ?? 0) > 1 || darkOld,
    darkUnfilled: countDarkUnfilled(cols, vars),
    darkOld,
    // 옛 구조인데 Semantic 모드가 셋 이상 — 옮기기를 거절하는 경우(띠 dark.needMigrateManual).
    darkOldManual: darkOld && (semantic?.modes.length ?? 0) >= 3,
  };
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

/** ⑤에서 지울 `dark/…` — 플러그인 Global의 `dark/` 이름 · `isManual` 아님 · 어떤 로컬 변수도(그 컬렉션의 지금 모드만) 가리키지 않음. */
function unusedDarkCopies(
  global: VariableCollection,
  cols: readonly VariableCollection[],
  vars: readonly Variable[],
  skip?: { collectionId: string; modeId: string },
): Variable[] {
  const modesOf = new Map(cols.map((c) => [c.id, c.modes.map((m) => m.modeId)]));
  const referenced = new Set<string>();
  for (const v of vars) {
    for (const m of modesOf.get(v.variableCollectionId) ?? []) {
      if (skip && v.variableCollectionId === skip.collectionId && m === skip.modeId) continue;
      const raw = v.valuesByMode[m];
      if (isVariableAlias(raw)) referenced.add(raw.id);
    }
  }
  return vars.filter((v) => v.variableCollectionId === global.id && isDarkGlobalName(v.name) && !isManual(v) && !referenced.has(v.id));
}

/** 표식 — 쓰기 중에 예외가 나면 그때까지 바꾼 것이 있는지(code.ts가 commitUndo로 묶는다). */
const CHANGED_FLAG = '__darkChanged';
export function darkChangedBeforeError(e: unknown): boolean {
  return !!e && typeof e === 'object' && (e as Record<string, unknown>)[CHANGED_FLAG] === true;
}

/**
 * 다크 만들기(13.7 "다크"). 대상은 늘 플러그인 Global(인자로 받지 않음).
 * 판정 순서: 플러그인 Global 없음 → 옛 구조 + Semantic 모드 셋 이상 → Global 기본 모드 이름이 Dark뿐 →
 * 옛 구조이고 `migrate`가 없으면 `needMigrate`(쓰기 없음) → (쓰기) 모드 ensure → ③ → ④ → ⑤ → ⑥ 채우기.
 */
export async function generateDarkMode(migrate?: boolean): Promise<DarkModeResult> {
  const cols = await figma.variables.getLocalVariableCollectionsAsync();
  const global = ownedCollection(cols, 'global');
  if (!global) return { filled: 0, kept: 0, targets: 0, error: t('dark.errNoCol') };
  const semantic = ownedCollection(cols, 'semantic');
  const oldMode = oldDarkMode(semantic);
  if (oldMode && semantic && semantic.modes.length >= 3) return { filled: 0, kept: 0, targets: 0, error: t('dark.errMigrateModes') };
  const from = global.defaultModeId;
  const defMode = global.modes.find((m) => m.modeId === from);
  if (defMode && findModeByName([defMode], DARK_MODE_NAME) && !findModeByName(global.modes, DARK_MODE_NAME, from)) {
    return { filled: 0, kept: 0, targets: 0, error: t('dark.errSameMode') };
  }
  let vars = await figma.variables.getLocalVariablesAsync();
  if (oldMode && semantic && !migrate) {
    const removeDark = unusedDarkCopies(global, cols, vars, { collectionId: semantic.id, modeId: oldMode.modeId }).length;
    return { filled: 0, kept: 0, targets: 0, needMigrate: { removeDark, mode: oldMode.name } };
  }
  const doMigrate = !!(oldMode && semantic);

  // ① 값 모으기(아무것도 쓰기 전에)
  const byId = new Map(vars.map((v) => [v.id, v]));
  const defOf = new Map(cols.map((c) => [c.id, c.defaultModeId]));
  const cand = new Map<string, { hex: string; sem: string }[]>(); // X id → 후보
  const failedNames: string[] = [];
  if (doMigrate && semantic && oldMode) {
    for (const s of vars) {
      if (s.variableCollectionId !== semantic.id || s.resolvedType !== 'COLOR') continue;
      const L = s.valuesByMode[semantic.defaultModeId];
      const D = s.valuesByMode[oldMode.modeId];
      if (D === undefined || D === null) continue; // 옮길 것 없음
      if (isVariableAlias(L) && isVariableAlias(D) && L.id === D.id) continue;
      if (!isVariableAlias(L) && !isVariableAlias(D) && hex8(L) !== null && hex8(L) === hex8(D)) continue;
      if (!isVariableAlias(L)) {
        // 값을 직접 넣은 Light — Dark를 색으로 푼 값과 같으면 옮길 것 없음, 다르면(또는 못 풀면) c.
        const dh = hex8(resolveColor(D, byId, defOf));
        if (dh !== null && hex8(L) !== null && dh === hex8(L)) continue;
        failedNames.push(s.name);
        continue;
      }
      const x = byId.get(L.id);
      if (!x || x.variableCollectionId !== global.id || x.resolvedType !== 'COLOR' || isManual(x) || !isColor(x.valuesByMode[from])) {
        failedNames.push(s.name);
        continue;
      }
      const col = resolveColor(D, byId, defOf);
      const h = col ? hex8(col) : null;
      if (!h) { failedNames.push(s.name); continue; }
      const arr = cand.get(x.id) ?? [];
      arr.push({ hex: h, sem: s.name });
      cand.set(x.id, arr);
    }
  }
  // ② 갈린 값 — 많은 쪽, 같으면 Semantic 이름 순(코드 단위) 첫 S의 색
  const pick = new Map<string, string>(); // X id → hex8
  const splitNames: string[] = [];
  for (const [xid, arr] of cand) {
    const counts = new Map<string, number>();
    for (const c of arr) counts.set(c.hex, (counts.get(c.hex) ?? 0) + 1);
    const max = Math.max(...counts.values());
    const sorted = arr.slice().sort((a, b) => (a.sem < b.sem ? -1 : a.sem > b.sem ? 1 : 0));
    const chosen = sorted.find((c) => counts.get(c.hex) === max)!.hex;
    pick.set(xid, chosen);
    if (counts.size > 1) splitNames.push(byId.get(xid)!.name);
  }

  // 모드 ensure — 실패하면 아무것도 바뀌지 않는다.
  let to: string;
  let modeCreated = false;
  try {
    ensureOwnedCollection(cols, 'global'); // 이어받은 컬렉션이면 쓰기 직전에 표시를 단다(13.2-3)
    const ensured = ensureDarkMode(global);
    to = ensured.modeId;
    modeCreated = ensured.created;
  } catch (e) {
    const why = e instanceof Error ? e.message : String(e);
    return { filled: 0, kept: 0, targets: 0, error: t('dark.errAddMode', { why: why || t('dark.errAddModePlan') }) };
  }
  let changed = modeCreated;
  try {
    // 모드를 더하면 Figma가 칸을 채울 수 있으니 다시 읽는다(목도 같은 객체라 값은 그대로 보인다).
    vars = await figma.variables.getLocalVariablesAsync();
    const modeIds = new Set(global.modes.map((m) => m.modeId));
    // ③ 쓰기 — 옮긴 칸은 by: user
    const written = new Set<string>();
    for (const [xid, h] of pick) {
      const x = byId.get(xid)!;
      // Global Dark 칸에 이미 사용자 기록(by: user)이 있고 그 값이 고른 색과 다르면 덮지 않는다 — 옮긴 색에 세지 않고
      // ⑥에서 k로 센다(A.25 구현 메모). 같은 값이면(④ 전에 멈춘 옮기기를 다시 할 때 등) 그대로 옮긴 색으로 센다.
      const prev = readDarkFill(x)[to];
      if (prev?.by === 'user' && prev.d !== h) continue;
      x.setValueForMode(to, rgbaOfHex8(h));
      const rec = pruneRecord(readDarkFill(x), modeIds);
      rec[to] = { f: from, l: hex8(x.valuesByMode[from]) ?? '', d: hex8(x.valuesByMode[to]) ?? h, by: 'user' };
      writeDarkFill(x, rec);
      written.add(xid);
      changed = true;
    }
    let removedDark = 0;
    if (doMigrate && semantic && oldMode) {
      // ④ Semantic 모드 지우기
      semantic.removeMode(oldMode.modeId);
      changed = true;
      // ⑤ 가리키는 변수가 없는 dark/…만 지우기(④ 뒤 — 지금 모드만 본다)
      const colsNow = await figma.variables.getLocalVariableCollectionsAsync();
      const varsNow = await figma.variables.getLocalVariablesAsync();
      for (const d of unusedDarkCopies(global, colsNow, varsNow)) {
        d.remove();
        removedDark++;
      }
      vars = await figma.variables.getLocalVariablesAsync();
    }

    // ⑥ 칸마다 판정
    let filled = 0;
    let kept = 0;
    const targets = darkTargets(global, vars, from);
    const fromHexOf = (v: Variable) => hex8(v.valuesByMode[from])!;
    const writeCalc = (v: Variable, rec: DarkFillRecord): void => {
      const light = v.valuesByMode[from] as RGBA;
      const la = typeof light.a === 'number' ? light.a : 1;
      // 밝기만 바꾸고 투명도는 그대로(ia-v3 §2.11 "반투명 색 토큰")
      v.setValueForMode(to, { ...hexToRgb(darkValueForLight(rgbToHex(light))), a: la });
      rec[to] = { f: from, l: fromHexOf(v), d: hex8(v.valuesByMode[to]) ?? '', by: 'calc' };
      writeDarkFill(v, rec);
      filled++;
      changed = true;
    };
    for (const v of targets) {
      if (written.has(v.id)) continue; // ③에서 쓴 칸은 표를 보지 않는다
      const rec = pruneRecord(readDarkFill(v), modeIds);
      const darkRaw = v.valuesByMode[to];
      const entry = rec[to];
      if (modeCreated || darkRaw === undefined || darkRaw === null) {
        writeCalc(v, rec);
        continue;
      }
      const darkNow = cellKey(darkRaw);
      if (entry && entry.by === 'user') {
        kept++;
        continue;
      }
      if (entry && entry.by === 'calc') {
        if (darkNow !== entry.d) {
          rec[to] = { f: from, l: fromHexOf(v), d: darkNow ?? '', by: 'user' };
          writeDarkFill(v, rec);
          changed = true;
          kept++;
          continue;
        }
        const fStale = !modeIds.has(entry.f) || hex8(v.valuesByMode[entry.f]) !== entry.l || from !== entry.f;
        if (fStale) writeCalc(v, rec);
        continue;
      }
      // 기록 없음
      if (darkNow === fromHexOf(v)) writeCalc(v, rec);
      else {
        rec[to] = { f: from, l: fromHexOf(v), d: darkNow ?? '', by: 'user' };
        writeDarkFill(v, rec);
        changed = true;
        kept++;
      }
    }
    const moved = written.size;
    const splitWritten = splitNames.filter((n) => vars.some((v) => written.has(v.id) && v.name === n));
    // 새로 만든 모드에 쓴 칸이 하나도 없으면 지운다(빈 Dark 모드가 '다크 있음'으로 남지 않게).
    if (modeCreated && filled === 0 && moved === 0) {
      try {
        global.removeMode(to);
        modeCreated = false;
      } catch {
        // 못 지우면 그대로 둔다
      }
    }
    const out: DarkModeResult = { filled, kept, targets: targets.length, changed };
    if (modeCreated) out.modeCreated = true;
    if (doMigrate) out.migrated = { moved, split: splitWritten.length, failed: failedNames.length, splitNames: splitWritten, failedNames, removedDark };
    return out;
  } catch (e) {
    if (changed && e && typeof e === 'object') (e as Record<string, unknown>)[CHANGED_FLAG] = true;
    throw e;
  }
}

/** 열쇠(to) 모드가 없어진 기록은 버린다. */
function pruneRecord(rec: DarkFillRecord, modeIds: Set<string>): DarkFillRecord {
  const out: DarkFillRecord = {};
  for (const [k, e] of Object.entries(rec)) if (modeIds.has(k) && e && typeof e === 'object') out[k] = e;
  return out;
}
