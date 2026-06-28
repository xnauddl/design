/* ============================================================
   code.ts — 샌드박스 엔트리 & 메시지 라우터 (모든 figma.* 호출 지점)
   ============================================================ */
import type { UiToCode, RenameChange, CodeToUi, VarInfo, VarMode, VarValueCell, VarPatch } from './shared/messages';
import { post } from './shared/messages';
import { extractFromSelection } from './lib/extract';
import { createTokens, previewCreateTokens, createSemanticAliases, scanTextStyles, createSemanticTextStyles, prunePaletteColors, GLOBAL, SEMANTIC, COMPONENT } from './lib/variables';
import { clusterTextStyles, nameTextStyles } from './lib/textStyles';
import { bindSelection } from './lib/bind';
import { renameSelection } from './lib/rename';
import { rgbToHex, hexToRgb, type ResolvedType, type ScopeName } from './lib/tokens';
import { parseVarValue, sanitizeScopes, aliasSelfReference, findAliasReferers } from './lib/variableEdit';
import { darkValueForLight, darkGlobalName } from './lib/themeGen';
import { ExportToken, ThemeValue, TokenKind, exportTokens } from './lib/exporters';
import { classifyVariants, missingVariants, variantGrid, inferComponentProperties, scanComponentCandidates } from './lib/components';
import { scanSimilar, componentizeSimilar } from './lib/similarApply';
import { checkContrast, type ContrastSample } from './lib/contrast';
import { Tier, Feature, isTier, isPaid, coerceTier } from './lib/entitlements';
import { LicenseCache, LicenseStatus, evaluateLicense, cacheFromVerify } from './lib/license';
import { Preset, upsertPreset } from './lib/presets';
import { commitUndo } from './lib/undo';

// #14: 기본 창을 키우고(트리·편집표 수용) 사용자 리사이즈를 허용. 마지막 크기는 clientStorage에 기억.
const UI_SIZE_KEY = 'dsl.uiSize';
const UI_MIN = { w: 360, h: 480 };
const UI_MAX = { w: 900, h: 1200 };
const UI_DEFAULT = { w: 460, h: 660 };
const clampSize = (w: number, h: number) => ({
  w: Math.round(Math.min(UI_MAX.w, Math.max(UI_MIN.w, w))),
  h: Math.round(Math.min(UI_MAX.h, Math.max(UI_MIN.h, h))),
});

figma.showUI(__html__, { width: UI_DEFAULT.w, height: UI_DEFAULT.h, themeColors: true });

// 저장된 창 크기 복원(있으면).
figma.clientStorage.getAsync(UI_SIZE_KEY).then((s) => {
  const v = s as { w?: number; h?: number } | undefined;
  if (v && typeof v.w === 'number' && typeof v.h === 'number') {
    const c = clampSize(v.w, v.h);
    figma.ui.resize(c.w, c.h);
  }
}).catch(() => {});

const selection = () => figma.currentPage.selection;

/* ---------- 라이선스/티어 ----------
   M1: 개발용 강제 티어 토글 · M2: 외부 키 캐시/grace · M2.1: 서명(JWT) 검증 ·
   M2.2: 네트워크+서명 검증은 UI 아이프레임(WebCrypto 가용)에서 수행하고
   결과(LICENSE_VERIFIED)만 받아 캐시·적용한다. 여기서는 fetch/crypto를 직접 하지 않는다. */
const DEV_TIER_KEY = 'dsl.devTier';
const CACHE_KEY = 'dsl.licenseCache';
const PRESETS_KEY = 'dsl.presets';

let devTier: Tier = 'free'; // 개발용 강제 티어(검증 키가 없을 때만 적용)
let cache: LicenseCache | null = null; // 검증된 라이선스 캐시(우선)
let presets: Preset[] = []; // M3(Team): 공유 프리셋
let bindCancel = false; // UX6: 진행 중 바인딩 취소 플래그

function effective(): {
  tier: Tier;
  source: 'key' | 'dev' | 'none';
  status?: LicenseStatus;
  expiresAt?: number;
} {
  if (cache) {
    const ev = evaluateLicense(cache, Date.now());
    return { tier: ev.tier, source: 'key', status: ev.status, expiresAt: cache.expiresAt };
  }
  if (devTier !== 'free') return { tier: devTier, source: 'dev' };
  return { tier: 'free', source: 'none' };
}

const currentTier = (): Tier => effective().tier;

function postLicense(note?: string): void {
  const e = effective();
  post({
    type: 'LICENSE_STATUS',
    tier: e.tier,
    paid: isPaid(e.tier),
    source: e.source,
    status: e.status,
    expiresAt: e.expiresAt,
    note,
  });
}

async function loadLicense(): Promise<void> {
  try {
    // 개발용 강제 티어는 개발 빌드에서만 적용(배포 빌드 백도어 차단).
    const dt = await figma.clientStorage.getAsync(DEV_TIER_KEY);
    if (__DEV__ && isTier(dt)) devTier = dt;
    const c = (await figma.clientStorage.getAsync(CACHE_KEY)) as LicenseCache | undefined;
    // 손상/구형 캐시 방어: 모든 필드 형식을 확인(특히 key는 REQUEST_VERIFY에서 사용).
    // 구 3티어(pro/team) 캐시는 coerceTier로 paid 정규화 — 업데이트 후 유효 유료 사용자가 free로 강등되지 않게.
    if (c && typeof c.key === 'string' && typeof c.expiresAt === 'number' && typeof c.lastVerified === 'number') {
      const tier = coerceTier(c.tier);
      if (tier) cache = { ...c, tier };
    }
    const ps = await figma.clientStorage.getAsync(PRESETS_KEY);
    if (Array.isArray(ps)) presets = ps as Preset[];
  } catch {
    /* 저장소 접근 실패 시 free 유지 */
  }
}

/**
 * #11: 단계 전제 상태를 UI에 보고 — Global 변수 존재(시맨틱 매핑 가능) ·
 * 바인딩 가능 변수 존재(바인딩 가능). 바인딩은 Component/Semantic을 우선하되
 * Global을 폴백으로 직접 바인딩하므로, Global만 있어도 바인딩 가능으로 본다.
 * 전제 미충족 카드는 UI가 비활성+안내로 가드한다. 토큰/시맨틱 변경 후·시작 시·요청 시 호출.
 */
async function postPrereq(): Promise<void> {
  try {
    const cols = await figma.variables.getLocalVariableCollectionsAsync();
    const globalIds = new Set(cols.filter((c) => c.name === GLOBAL).map((c) => c.id));
    // Global도 폴백 바인딩 대상 → 바인딩 가능 집합에 포함.
    const bindableIds = new Set(cols.filter((c) => c.name === GLOBAL || c.name === SEMANTIC || c.name === COMPONENT).map((c) => c.id));
    const vars = await figma.variables.getLocalVariablesAsync();
    const hasGlobal = vars.some((v) => globalIds.has(v.variableCollectionId));
    const hasBindable = vars.some((v) => bindableIds.has(v.variableCollectionId));
    post({ type: 'PREREQ_STATE', hasGlobal, hasBindable });
  } catch {
    /* 저장소 접근 실패 시 보고 생략(UI는 마지막 상태 유지) */
  }
}

/** Paid 게이트: 아니면 PREMIUM_REQUIRED 안내 후 false. (미리보기/탐색은 호출 전에 허용) */
function requirePaid(feature: Feature, message: string): boolean {
  if (isPaid(currentTier())) return true;
  post({ type: 'PREMIUM_REQUIRED', feature, message });
  return false;
}

/** 베리언트 세트를 속성 기반 2D 그리드로 정렬하고 자식에 맞게 리사이즈. */
function arrangeSet(set: ComponentSetNode): void {
  const children = set.children.filter((c): c is ComponentNode => c.type === 'COMPONENT');
  if (!children.length) return;
  const cellW = Math.max(...children.map((c) => c.width));
  const cellH = Math.max(...children.map((c) => c.height));
  const gap = 16;
  const pad = 16;
  const pos = new Map(variantGrid(children.map((c) => c.name)).map((g) => [g.name, g]));
  let maxCol = 0;
  let maxRow = 0;
  for (const c of children) {
    const g = pos.get(c.name);
    if (!g) continue;
    c.x = pad + g.col * (cellW + gap);
    c.y = pad + g.row * (cellH + gap);
    maxCol = Math.max(maxCol, g.col);
    maxRow = Math.max(maxRow, g.row);
  }
  set.resizeWithoutConstraints(pad * 2 + (maxCol + 1) * cellW + maxCol * gap, pad * 2 + (maxRow + 1) * cellH + maxRow * gap);
}

/** #6: 텍스트 범위 바인딩 필드(나머지는 노드 스칼라 필드). */
const TEXT_BIND_FIELDS = new Set(['fontSize', 'lineHeight', 'letterSpacing', 'fontFamily']);

/**
 * #6: 미리보기에서 체크한 후보 1건을 재매칭 없이 그대로 바인딩한다.
 * 노드/변수 소실·미스매치는 false(graceful skip). 성공 시 true.
 */
async function applySelectedBinding(item: { nodeId: string; field: string; index?: number; variableId: string }): Promise<boolean> {
  const node = await figma.getNodeByIdAsync(item.nodeId);
  if (!node || !('type' in node)) return false;
  const variable = await figma.variables.getVariableByIdAsync(item.variableId);
  if (!variable) return false;
  const sn = node as SceneNode;
  try {
    if (item.field === 'fills' || item.field === 'strokes') {
      if (!(item.field in sn)) return false;
      const paints = (sn as unknown as Record<string, Paint[] | typeof figma.mixed>)[item.field];
      if (paints === figma.mixed || !Array.isArray(paints)) return false;
      const i = item.index ?? 0;
      const p = paints[i];
      if (!p || p.type !== 'SOLID') return false;
      const arr = paints.slice();
      arr[i] = figma.variables.setBoundVariableForPaint(p, 'color', variable);
      (sn as unknown as Record<string, Paint[]>)[item.field] = arr;
      return true;
    }
    if (item.field === 'effects') {
      if (!('effects' in sn)) return false;
      const effects = (sn as unknown as { effects: readonly Effect[] }).effects;
      const i = item.index ?? 0;
      const e = effects[i];
      if (!e || (e.type !== 'DROP_SHADOW' && e.type !== 'INNER_SHADOW')) return false;
      const arr = effects.slice();
      arr[i] = figma.variables.setBoundVariableForEffect(e, 'color', variable);
      (sn as unknown as { effects: readonly Effect[] }).effects = arr;
      return true;
    }
    if (TEXT_BIND_FIELDS.has(item.field)) {
      if (sn.type !== 'TEXT' || sn.fontName === figma.mixed) return false;
      await figma.loadFontAsync(sn.fontName);
      const len = sn.characters.length;
      if (len === 0) return false;
      sn.setRangeBoundVariable(0, len, item.field as VariableBindableTextField, variable);
      return true;
    }
    // 스칼라 노드 필드(width/height/padding…/cornerRadius…)
    (sn as unknown as { setBoundVariable: (f: VariableBindableNodeField, x: Variable) => void }).setBoundVariable(item.field as VariableBindableNodeField, variable);
    return true;
  } catch {
    return false;
  }
}


async function savePresets(): Promise<void> {
  try {
    await figma.clientStorage.setAsync(PRESETS_KEY, presets);
  } catch {
    /* 무시 */
  }
}

/** 변수 → 내보내기 kind 분류(scope 우선, 이름 폴백 — STRING line-height 등 scope 비어있음 대비). */
function kindOf(v: Variable): TokenKind {
  if (v.resolvedType === 'COLOR') return 'color';
  const sc = v.scopes;
  if (sc.includes('FONT_SIZE')) return 'fontSize';
  if (sc.includes('GAP')) return 'spacing';
  if (sc.includes('CORNER_RADIUS')) return 'radius';
  if (sc.includes('WIDTH_HEIGHT')) return 'size';
  if (sc.includes('STROKE_FLOAT')) return 'strokeWidth';
  if (sc.includes('LINE_HEIGHT')) return 'lineHeight';
  if (sc.includes('LETTER_SPACING')) return 'letterSpacing';
  if (sc.includes('OPACITY')) return 'opacity';
  if (sc.includes('EFFECT_FLOAT')) return 'effectFloat';
  if (sc.includes('FONT_WEIGHT')) return 'fontWeight';
  if (sc.includes('FONT_FAMILY')) return 'fontFamily';
  const n = v.name;
  if (n.startsWith('line-height')) return 'lineHeight';
  if (n.startsWith('letter-spacing')) return 'letterSpacing';
  if (n.startsWith('font-size')) return 'fontSize';
  if (n.startsWith('spacing')) return 'spacing';
  if (n.startsWith('radius')) return 'radius';
  if (n.startsWith('stroke-width')) return 'strokeWidth';
  if (n.startsWith('shadow-') || n.startsWith('blur')) return 'effectFloat';
  if (n.startsWith('size')) return 'size';
  if (n.includes('font') && n.includes('weight')) return 'fontWeight';
  if (n.includes('font') && n.includes('family')) return 'fontFamily';
  if (n.includes('opacity')) return 'opacity';
  return 'other';
}

/* ---------- R1: 변수 속성 편집기 ----------
   우리 3계층(Global/Semantic/Component) 변수만 대상으로 값·이름·스코프·설명·삭제를
   직접 편집한다. 외부/타 플러그인 변수는 비대상(안전). 작업마다 단일 Undo(commitUndo). */
const EDITABLE_COLLECTIONS = new Set([GLOBAL, SEMANTIC, COMPONENT]);
const errMsg = (e: unknown): string => (e instanceof Error ? e.message : String(e));

/** valuesByMode 원시값이 변수 별칭({type:'VARIABLE_ALIAS', id})인지. */
function isVariableAlias(raw: unknown): raw is VariableAlias {
  return !!raw && typeof raw === 'object' && 'type' in raw && (raw as VariableAlias).type === 'VARIABLE_ALIAS';
}

/** valuesByMode 한 항목 → 편집기용 값 칸(별칭은 nameById로 표시명 해소). */
function toValueCell(type: ResolvedType, raw: VariableValue | undefined, nameById: Map<string, string>): VarValueCell {
  if (isVariableAlias(raw)) {
    const aliasId = (raw as VariableAlias).id;
    const aliasName = nameById.get(aliasId);
    return { kind: 'alias', display: aliasName ?? '(알 수 없음)', aliasId, aliasName };
  }
  if (type === 'COLOR' && raw && typeof raw === 'object' && 'r' in raw) {
    return { kind: 'literal', display: rgbToHex(raw as RGB) };
  }
  if (raw === undefined) return { kind: 'literal', display: '' };
  return { kind: 'literal', display: String(raw) };
}

/** Variable + 소속 컬렉션 → VarInfo(모드별 값 포함). */
function toVarInfo(v: Variable, col: VariableCollection, nameById: Map<string, string>): VarInfo {
  const modes: VarMode[] = col.modes.map((m) => ({ modeId: m.modeId, name: m.name }));
  const values: Record<string, VarValueCell> = {};
  for (const m of col.modes) values[m.modeId] = toValueCell(v.resolvedType, v.valuesByMode[m.modeId], nameById);
  return {
    id: v.id,
    name: v.name,
    collectionId: col.id,
    collection: col.name,
    type: v.resolvedType,
    description: v.description ?? '',
    scopes: v.scopes as ScopeName[],
    hidden: v.hiddenFromPublishing,
    modes,
    defaultModeId: col.defaultModeId,
    values,
  };
}

/** 3계층 컬렉션의 모든 변수를 VarInfo[]로(컬렉션→이름 정렬). */
async function collectVars(): Promise<VarInfo[]> {
  const cols = await figma.variables.getLocalVariableCollectionsAsync();
  const colById = new Map(cols.map((c) => [c.id, c]));
  const vars = await figma.variables.getLocalVariablesAsync();
  const nameById = new Map(vars.map((v) => [v.id, v.name]));
  const out: VarInfo[] = [];
  for (const v of vars) {
    const col = colById.get(v.variableCollectionId);
    if (!col || !EDITABLE_COLLECTIONS.has(col.name)) continue;
    out.push(toVarInfo(v, col, nameById));
  }
  out.sort((a, b) => a.collection.localeCompare(b.collection) || a.name.localeCompare(b.name));
  return out;
}

/** 별칭 재지정이 순환을 만드는지 — target에서 alias 간선을 따라 sourceId에 도달하면 순환. */
async function aliasWouldCycle(sourceId: string, target: Variable): Promise<boolean> {
  const seen = new Set<string>();
  let frontier: Variable[] = [target];
  while (frontier.length) {
    const next: Variable[] = [];
    for (const cur of frontier) {
      if (cur.id === sourceId) return true;
      if (seen.has(cur.id)) continue;
      seen.add(cur.id);
      for (const modeId of Object.keys(cur.valuesByMode)) {
        const raw = cur.valuesByMode[modeId];
        if (isVariableAlias(raw)) {
          const nv = await figma.variables.getVariableByIdAsync(raw.id);
          if (nv) next.push(nv);
        }
      }
    }
    frontier = next;
  }
  return false;
}

/** 값 패치 적용(리터럴/별칭). 오류 메시지 문자열 반환, 성공 시 null. */
async function applyVarValue(v: Variable, col: VariableCollection, value: NonNullable<VarPatch['value']>): Promise<string | null> {
  const modeId = value.modeId || col.defaultModeId;
  if (!col.modes.some((m) => m.modeId === modeId)) return '대상 모드를 찾을 수 없습니다.';
  if (value.aliasId !== undefined) {
    if (aliasSelfReference(v.id, value.aliasId)) return '변수를 자기 자신에 별칭할 수 없습니다.';
    const target = await figma.variables.getVariableByIdAsync(value.aliasId);
    if (!target) return '별칭 대상을 찾을 수 없습니다.';
    if (target.resolvedType !== v.resolvedType) return '별칭 대상의 타입이 다릅니다.';
    if (await aliasWouldCycle(v.id, target)) return '별칭이 순환 참조를 만듭니다.';
    v.setValueForMode(modeId, figma.variables.createVariableAlias(target));
    return null;
  }
  if (value.literal !== undefined) {
    const p = parseVarValue(v.resolvedType, value.literal);
    if (!p.ok) return p.error;
    v.setValueForMode(modeId, p.value as VariableValue);
    return null;
  }
  return null;
}

/** 변수 속성 패치 적용 → 결과 메시지(갱신 VarInfo 포함). */
async function editVariable(id: string, patch: VarPatch): Promise<Extract<CodeToUi, { type: 'EDIT_VARIABLE_RESULT' }>> {
  const v = await figma.variables.getVariableByIdAsync(id);
  if (!v) return { type: 'EDIT_VARIABLE_RESULT', id, ok: false, error: '변수를 찾을 수 없습니다.' };
  const col = await figma.variables.getVariableCollectionByIdAsync(v.variableCollectionId);
  if (!col || !EDITABLE_COLLECTIONS.has(col.name)) return { type: 'EDIT_VARIABLE_RESULT', id, ok: false, error: '편집 대상이 아닌 컬렉션입니다.' };
  try {
    if (patch.name !== undefined) {
      const nm = patch.name.trim();
      if (!nm) return { type: 'EDIT_VARIABLE_RESULT', id, ok: false, error: '이름을 입력하세요.' };
      v.name = nm;
    }
    if (patch.description !== undefined) v.description = patch.description;
    if (patch.hidden !== undefined) v.hiddenFromPublishing = patch.hidden;
    if (patch.scopes) v.scopes = sanitizeScopes(patch.scopes, v.resolvedType);
    if (patch.value) {
      const err = await applyVarValue(v, col, patch.value);
      if (err) return { type: 'EDIT_VARIABLE_RESULT', id, ok: false, error: err };
    }
  } catch (e) {
    return { type: 'EDIT_VARIABLE_RESULT', id, ok: false, error: errMsg(e) };
  }
  const all = await figma.variables.getLocalVariablesAsync();
  const nameById = new Map(all.map((x) => [x.id, x.name]));
  return { type: 'EDIT_VARIABLE_RESULT', id, ok: true, var: toVarInfo(v, col, nameById) };
}

/* ---------- R2-C: 삭제/리네임 영향 분석(where-used) ---------- */
const USAGE_SCAN_CAP = 5000;

/** 노드의 boundVariables에 varId가 쓰였는지(스칼라/배열/중첩 모두 검사). */
function nodeBindsVar(node: SceneNode, varId: string): boolean {
  const bv = (node as unknown as { boundVariables?: Record<string, unknown> }).boundVariables;
  if (!bv) return false;
  const hits = (a: unknown): boolean => !!a && typeof a === 'object' && (a as VariableAlias).id === varId;
  for (const key of Object.keys(bv)) {
    const entry = bv[key];
    if (Array.isArray(entry)) {
      if (entry.some(hits)) return true;
    } else if (entry && typeof entry === 'object') {
      if (hits(entry)) return true; // {type,id} 형태
      for (const v of Object.values(entry as Record<string, unknown>)) if (hits(v)) return true;
    }
  }
  return false;
}

/** 문서 전체 페이지에서 변수에 바인딩된 노드 수집(상한 적용).
 *  dynamic-page라 다른 페이지 순회 전 loadAllPagesAsync 필요 — 현재 페이지만 보면 타 페이지 사용처를 놓쳐 삭제 경고가 위양성. */
async function collectBoundNodes(varId: string): Promise<{ nodes: { id: string; name: string }[]; capped: boolean }> {
  await figma.loadAllPagesAsync();
  const nodes: { id: string; name: string }[] = [];
  const stack: SceneNode[] = [];
  for (const page of figma.root.children) stack.push(...(page.children as readonly SceneNode[]));
  let scanned = 0;
  let capped = false;
  while (stack.length) {
    if (scanned >= USAGE_SCAN_CAP) {
      capped = true;
      break;
    }
    const n = stack.pop() as SceneNode;
    scanned++;
    if (nodeBindsVar(n, varId)) nodes.push({ id: n.id, name: n.name });
    if ('children' in n) for (const c of (n as SceneNode & ChildrenMixin).children) stack.push(c as SceneNode);
  }
  return { nodes, capped };
}

/* ---------- R2-A: 라이트→다크 자동 생성 ----------
   (a안) Semantic 다크 모드를 다크용 Global 프리미티브로 재-별칭(계층 보존).
   라이트 모드가 Global 별칭인 COLOR 변수만 대상 — 그 Global의 hex를 L 반전해
   `dark/<global이름>` 프리미티브에 리터럴로 쓰고, Semantic 다크 모드는 그 변수를 별칭. */
async function generateDarkMode(collectionId: string, fromModeId: string, toModeId: string): Promise<Extract<CodeToUi, { type: 'DARK_MODE_RESULT' }>> {
  let created = 0;
  let realiased = 0;
  let skipped = 0;
  const cols = await figma.variables.getLocalVariableCollectionsAsync();
  const semanticCol = cols.find((c) => c.id === collectionId);
  if (!semanticCol) return { type: 'DARK_MODE_RESULT', created, realiased, skipped };
  const globalCol = cols.find((c) => c.name === GLOBAL) ?? figma.variables.createVariableCollection(GLOBAL);
  const gMode = globalCol.defaultModeId;
  const allVars = await figma.variables.getLocalVariablesAsync();
  const byId = new Map(allVars.map((v) => [v.id, v]));
  const globalByName = new Map(allVars.filter((v) => v.variableCollectionId === globalCol.id).map((v) => [v.name, v]));

  for (const v of allVars) {
    if (v.variableCollectionId !== semanticCol.id || v.resolvedType !== 'COLOR') continue;
    const fromRaw = v.valuesByMode[fromModeId];
    // 라이트 모드가 Global 별칭이 아니면 스킵(3계층 규칙 — 리터럴 Semantic은 대상 아님).
    if (!isVariableAlias(fromRaw)) {
      skipped++;
      continue;
    }
    const lightGlobal = byId.get(fromRaw.id);
    const lightRaw = lightGlobal?.valuesByMode[gMode];
    if (!lightGlobal || !(lightRaw && typeof lightRaw === 'object' && 'r' in lightRaw)) {
      skipped++;
      continue;
    }
    const darkHex = darkValueForLight(rgbToHex(lightRaw as RGB));
    const dname = darkGlobalName(lightGlobal.name);
    let dark = globalByName.get(dname);
    if (!dark) {
      dark = figma.variables.createVariable(dname, globalCol, 'COLOR');
      dark.scopes = lightGlobal.scopes;
      dark.hiddenFromPublishing = true;
      globalByName.set(dname, dark);
      created++;
    }
    dark.setValueForMode(gMode, hexToRgb(darkHex));
    v.setValueForMode(toModeId, figma.variables.createVariableAlias(dark));
    realiased++;
  }
  return { type: 'DARK_MODE_RESULT', created, realiased, skipped };
}

loadLicense().then(() => {
  postLicense();
  // 캐시가 오래됐으면 UI에 백그라운드 재검증 요청(WebCrypto는 UI에서).
  if (cache && evaluateLicense(cache, Date.now()).stale) post({ type: 'REQUEST_VERIFY', key: cache.key });
});

/* ---------- UX5: 실시간 선택 동기화 ----------
   선택이 바뀔 때마다 선택 수·하위 요소 수·바인딩 후보 수를 UI에 알린다.
   대규모 선택에서도 안전하도록 스캔을 상한(SCAN_CAP)으로 제한한다. */
const SCAN_CAP = 1500;
function isBindableCandidate(n: SceneNode): boolean {
  const fills = (n as { fills?: unknown }).fills;
  const hasFills = Array.isArray(fills) && fills.some((p) => (p as Paint).type === 'SOLID' && (p as Paint).visible !== false);
  const strokes = (n as { strokes?: unknown }).strokes;
  const hasStrokes = Array.isArray(strokes) && strokes.length > 0;
  const r = (n as { cornerRadius?: unknown }).cornerRadius;
  const hasRadius = typeof r === 'number' && r > 0;
  const hasFont = typeof (n as { fontSize?: unknown }).fontSize === 'number';
  const lm = (n as { layoutMode?: string }).layoutMode;
  const hasGap = !!lm && lm !== 'NONE' && typeof (n as { itemSpacing?: number }).itemSpacing === 'number';
  return hasFills || hasStrokes || hasRadius || hasFont || hasGap;
}
function postSelection(): void {
  const sel = selection();
  let scanned = 0;
  let bindable = 0;
  let capped = false;
  const stack: SceneNode[] = sel.slice();
  while (stack.length) {
    if (scanned >= SCAN_CAP) {
      capped = true;
      break;
    }
    const n = stack.pop() as SceneNode;
    scanned++;
    if (isBindableCandidate(n)) bindable++;
    if ('children' in n) for (const c of (n as SceneNode & ChildrenMixin).children) stack.push(c as SceneNode);
  }
  post({ type: 'SELECTION_STATE', count: sel.length, scanned, bindable, capped });
}
figma.on('selectionchange', postSelection);

/* ---------- 명도 대비 점검(읽기 전용) ----------
   선택 하위의 텍스트 노드마다 글자색(첫 단색 채움)과 유효 배경(가장 가까운 상위
   단색 채움)을 뽑아 ContrastSample로 만든다. 판정은 순수 모듈(contrast.ts)에 위임.
   한계: 부분 투명·겹친 형제·범위별 혼합색은 다루지 않고 사유별로 건너뛴다. */
const CONTRAST_SCAN_CAP = 2000;

/** 노드의 첫 '보이는 단색' 채움 hex. 없거나 혼합(mixed)이면 null. */
function solidFillHex(node: SceneNode): string | null {
  const fills = (node as { fills?: readonly Paint[] | typeof figma.mixed }).fills;
  if (!Array.isArray(fills)) return null; // figma.mixed 또는 fills 없음
  for (const p of fills) {
    if (p.type === 'SOLID' && p.visible !== false && (p.opacity ?? 1) > 0) return rgbToHex(p.color);
  }
  return null;
}

/** 텍스트 위로 올라가며 가장 가까운 상위의 단색 배경(hex + 노드 id). 없으면 null. */
function effectiveBg(node: SceneNode): { hex: string; id: string } | null {
  let cur: BaseNode | null = node.parent;
  while (cur && cur.type !== 'PAGE' && cur.type !== 'DOCUMENT') {
    const hex = solidFillHex(cur as SceneNode);
    if (hex) return { hex, id: cur.id };
    cur = cur.parent;
  }
  return null;
}

function collectContrastSamples(sel: readonly SceneNode[]): { samples: ContrastSample[]; skipped: Record<string, number> } {
  const samples: ContrastSample[] = [];
  const skipped: Record<string, number> = {};
  const note = (k: string): void => {
    skipped[k] = (skipped[k] ?? 0) + 1;
  };
  const stack: SceneNode[] = sel.slice();
  let scanned = 0;
  while (stack.length) {
    if (scanned >= CONTRAST_SCAN_CAP) {
      note('capped');
      break;
    }
    const n = stack.pop() as SceneNode;
    scanned++;
    if (n.type === 'TEXT' && n.visible) {
      const fg = solidFillHex(n);
      if (!fg) note('no-fill'); // 단색 글자색 없음(혼합/이미지/그라데이션 등)
      else {
        const bg = effectiveBg(n);
        if (!bg) note('no-bg'); // 상위에 단색 배경이 없음
        else {
          const fontSize = typeof n.fontSize === 'number' ? n.fontSize : 16; // 혼합이면 보수적 기본값
          const bold = typeof n.fontWeight === 'number' ? n.fontWeight >= 700 : false;
          samples.push({ id: n.id, name: n.name, fg, bg: bg.hex, bgId: bg.id, fontSize, bold });
        }
      }
    }
    if ('children' in n) for (const c of (n as SceneNode & ChildrenMixin).children) stack.push(c as SceneNode);
  }
  return { samples, skipped };
}

figma.ui.onmessage = async (msg: UiToCode) => {
  try {
    switch (msg.type) {
      case 'EXTRACT': {
        const sel = selection();
        const { tokens, warnings } = extractFromSelection(sel);
        post({ type: 'EXTRACT_RESULT', tokens, warnings, selection: sel.length });
        break;
      }
      case 'CREATE_TOKENS': {
        // 미리보기(추출/예정 집계)는 Free. 실제 변수 생성만 Paid 게이팅.
        if (!msg.preview && !requirePaid('tokens', '토큰(변수) 생성은 Paid 기능입니다. 미리보기는 무료로 제공됩니다.')) break;
        // UX1: preview면 변수를 만들지 않고 예정 수만 집계.
        const s = msg.preview ? await previewCreateTokens(msg.tokens) : await createTokens(msg.tokens, msg.base);
        // 팔레트 재적용(replacePalette): 이번 팔레트에 없는 이전 팔레트 색 변수 정리(사용자 변수 보존).
        const pruned = !msg.preview && msg.replacePalette ? await prunePaletteColors(msg.tokens.map((t) => t.name)) : 0;
        let summary = `Global ${s.globals}개 (생성 ${s.created} / 갱신 ${s.updated}) · Semantic은 시맨틱 매핑 단계에서`;
        if (pruned) summary += ` · 이전 색 ${pruned}개 정리`;
        post({ type: 'CREATE_RESULT', created: s.created, updated: s.updated, summary, preview: msg.preview });
        if (!msg.preview) {
          commitUndo(figma); // UX2: 토큰 생성 전체를 단일 Undo로
          await postPrereq(); // #11: 토큰 생성 → 시맨틱/바인딩 전제 충족 갱신
        }
        break;
      }
      case 'APPLY': {
        bindCancel = false; // UX6: 새 작업 시작 시 취소 플래그 초기화
        // 바인딩은 Free·무제한. UX1: preview면 dry-run(바인딩 없이 집계). UX3: 사유별 스킵. UX6: 진행률·취소.
        const r = await bindSelection(
          selection(),
          msg.tolerance,
          { maxNodes: Infinity, maxBindings: Infinity },
          !msg.preview,
          {
            onProgress: (done, total) => post({ type: 'PROGRESS', op: 'bind', done, total }),
            shouldCancel: () => bindCancel,
            yieldToEvents: () => new Promise<void>((resolve) => setTimeout(resolve, 0)),
          },
        );
        post({
          type: 'APPLY_RESULT',
          bound: r.bound,
          skipped: r.skipped,
          flags: r.flags,
          reasons: r.reasons,
          limited: !!r.limited,
          preview: msg.preview,
          cancelled: r.cancelled,
          candidates: r.candidates, // #6: 미리보기 후보(dry-run만)
          nodes: r.nodes, // #13: 미리보기 트리 맥락
        });
        if (!msg.preview) {
          commitUndo(figma); // UX2: 바인딩(취소 시 부분 포함)을 단일 Undo로
        }
        break;
      }
      case 'CANCEL': {
        bindCancel = true; // UX6: 다음 양보 지점에서 중단
        break;
      }
      case 'APPLY_SELECTED': {
        // #6: 미리보기 트리에서 체크한 후보만 재매칭 없이 그대로 바인딩(WYSIWYG).
        let bound = 0;
        let skipped = 0;
        for (const item of msg.items) {
          if (await applySelectedBinding(item)) bound++;
          else skipped++; // 노드/변수 소실·실패는 graceful skip
        }
        post({ type: 'APPLY_RESULT', bound, skipped, flags: [], reasons: {} });
        if (bound) {
          commitUndo(figma); // UX2: 선택 바인딩 전체를 단일 Undo로
        }
        break;
      }
      case 'RENAME': {
        const r = await renameSelection(selection(), { apply: msg.apply, maxDepth: msg.maxDepth });
        post({ type: 'RENAME_RESULT', changes: r.changes, nodes: r.nodes, applied: r.applied });
        if (r.applied && r.changes.length) {
          commitUndo(figma); // UX2: 리네임 전체를 단일 Undo로
        }
        break;
      }
      case 'RENAME_APPLY': {
        // #7: 미리보기 트리에서 체크한 항목만 직접 적용(재계산 없이 id→after 그대로).
        const changes: RenameChange[] = [];
        for (const { id, after } of msg.items) {
          const node = await figma.getNodeByIdAsync(id);
          if (!node || !('name' in node)) continue; // 소실 노드는 graceful skip
          const before = node.name;
          if (before === after) continue;
          node.name = after;
          changes.push({ id, before, after });
        }
        post({ type: 'RENAME_RESULT', changes, nodes: [], applied: true });
        if (changes.length) {
          commitUndo(figma); // UX2: 선택 리네임 전체를 단일 Undo로
        }
        break;
      }
      case 'CREATE_SEMANTICS': {
        if (!requirePaid('semantics', '시맨틱 매핑은 Paid 기능입니다.')) break;
        const s = await createSemanticAliases(msg.map);
        post({ type: 'SEMANTICS_RESULT', created: s.created, updated: s.updated, aliased: s.aliased, missing: s.missing });
        commitUndo(figma); // UX2: 시맨틱 별칭 생성을 단일 Undo로
        await postPrereq(); // #11: 시맨틱 별칭(바인딩 가능 변수) 생성 → 전제 갱신
        break;
      }
      case 'SCAN_TEXT_STYLES': {
        // 미리보기(읽기 전용)는 무게이팅 — 후보를 보여주고 등록 단계에서 게이팅.
        const { samples, warnings } = scanTextStyles(selection());
        const styles = nameTextStyles(clusterTextStyles(samples));
        post({ type: 'TEXT_STYLE_CANDIDATES', styles, warnings });
        break;
      }
      case 'CREATE_TEXT_STYLES': {
        if (!requirePaid('textStyles', '텍스트 스타일 등록은 Paid 기능입니다.')) break;
        const r = await createSemanticTextStyles(msg.styles, msg.apply, selection());
        post({ type: 'TEXT_STYLES_RESULT', created: r.created, updated: r.updated, bound: r.bound, applied: r.applied, missing: r.missing });
        commitUndo(figma); // UX2: 변수+스타일 생성을 단일 Undo로
        break;
      }
      case 'GET_COLLECTIONS': {
        const cols = await figma.variables.getLocalVariableCollectionsAsync();
        post({ type: 'COLLECTIONS', collections: cols.map((c) => ({ id: c.id, name: c.name })) });
        postSelection(); // UI 초기화 시점 — 현재 선택 상태도 함께 전송(UX5).
        break;
      }
      case 'GET_PREREQ': {
        await postPrereq(); // #11: 단계 전제 상태(시작·탭 전환 시)
        break;
      }
      case 'GET_GLOBAL_COLORS': {
        // #10: 기존 Global 색 변수(리터럴 COLOR)를 이름+hex로 수집 → 재방문 시맨틱 매핑 추천.
        const cols = await figma.variables.getLocalVariableCollectionsAsync();
        const globalCol = cols.find((c) => c.name === GLOBAL);
        const colors: { name: string; hex: string }[] = [];
        if (globalCol) {
          const mode = globalCol.defaultModeId;
          for (const v of await figma.variables.getLocalVariablesAsync()) {
            if (v.variableCollectionId !== globalCol.id || v.resolvedType !== 'COLOR') continue;
            const raw = v.valuesByMode[mode];
            if (raw && typeof raw === 'object' && 'r' in raw) colors.push({ name: v.name, hex: rgbToHex(raw as RGB) });
          }
        }
        post({ type: 'GLOBAL_COLORS', colors });
        break;
      }
      case 'GET_VARIABLES': {
        post({ type: 'VARIABLES', vars: await collectVars() }); // R1: 편집기 목록
        break;
      }
      case 'EDIT_VARIABLE': {
        const res = await editVariable(msg.id, msg.patch);
        post(res);
        if (res.ok) {
          commitUndo(figma); // UX2: 행별 단일 Undo
          await postPrereq(); // 값/이름 변경이 전제 상태에 영향 가능
        }
        break;
      }
      case 'DELETE_VARIABLE': {
        const v = await figma.variables.getVariableByIdAsync(msg.id);
        if (!v) {
          post({ type: 'EDIT_VARIABLE_RESULT', id: msg.id, ok: false, error: '변수를 찾을 수 없습니다.' });
          break;
        }
        const col = await figma.variables.getVariableCollectionByIdAsync(v.variableCollectionId);
        if (!col || !EDITABLE_COLLECTIONS.has(col.name)) {
          post({ type: 'EDIT_VARIABLE_RESULT', id: msg.id, ok: false, error: '편집 대상이 아닌 컬렉션입니다.' });
          break;
        }
        try {
          v.remove();
          commitUndo(figma); // UX2: 삭제도 단일 Undo
          await postPrereq();
          post({ type: 'EDIT_VARIABLE_RESULT', id: msg.id, ok: true, deleted: true });
        } catch (e) {
          post({ type: 'EDIT_VARIABLE_RESULT', id: msg.id, ok: false, error: errMsg(e) });
        }
        break;
      }
      case 'GET_VARIABLE_USAGE': {
        const { nodes, capped } = await collectBoundNodes(msg.id); // R2-C: 바인딩된 노드(문서 전체)
        const aliasedBy = findAliasReferers(msg.id, await collectVars()); // 이 변수를 별칭하는 변수
        post({ type: 'VARIABLE_USAGE', id: msg.id, nodes, aliasedBy, capped });
        break;
      }
      case 'GENERATE_DARK_MODE': {
        const r = await generateDarkMode(msg.collectionId, msg.fromModeId, msg.toModeId); // R2-A
        post(r);
        if (r.created || r.realiased) {
          commitUndo(figma); // UX2: 다크 생성 전체를 단일 Undo로
          await postPrereq();
        }
        post({ type: 'VARIABLES', vars: await collectVars() }); // 편집기 목록 갱신
        break;
      }
      case 'RESIZE': {
        // #14: 드래그 중엔 즉시 리사이즈, commit(드롭) 시 크기 저장.
        const c = clampSize(msg.width, msg.height);
        figma.ui.resize(c.w, c.h);
        if (msg.commit) void figma.clientStorage.setAsync(UI_SIZE_KEY, { w: c.w, h: c.h }).catch(() => {});
        break;
      }
      case 'GET_LICENSE': {
        postLicense();
        break;
      }
      case 'SET_LICENSE': {
        if (!__DEV__) break; // 개발 빌드 전용 — 배포 빌드에선 페이월 우회 백도어 차단
        devTier = msg.tier;
        try {
          await figma.clientStorage.setAsync(DEV_TIER_KEY, devTier);
        } catch {
          /* 저장 실패해도 세션 동안은 적용 */
        }
        postLicense();
        break;
      }
      case 'LICENSE_VERIFIED': {
        // UI가 수행한 검증 결과를 받아 캐시·적용(부수효과만 여기서).
        if (msg.result.ok) {
          cache = cacheFromVerify(msg.key, msg.result, Date.now());
          try {
            await figma.clientStorage.setAsync(CACHE_KEY, cache);
          } catch {
            /* 저장 실패해도 세션 동안은 적용 */
          }
          postLicense('라이선스 적용됨');
        } else if (msg.result.offline) {
          // 오프라인 — 기존 캐시(grace) 유지, 변경 없음.
          postLicense(
            cache
              ? '오프라인 — 캐시된 라이선스로 동작(grace).'
              : '오프라인 — 키를 확인할 수 없습니다.',
          );
        } else {
          postLicense(`검증 실패: ${msg.result.error}`);
        }
        break;
      }
      case 'CLEAR_LICENSE': {
        cache = null;
        try {
          await figma.clientStorage.deleteAsync(CACHE_KEY);
        } catch {
          /* 무시 */
        }
        postLicense('라이선스 키 제거됨');
        break;
      }
      case 'GET_PRESETS': {
        if (!requirePaid('presets', '공유 프리셋은 Paid 기능입니다.')) break;
        post({ type: 'PRESETS', presets });
        break;
      }
      case 'SAVE_PRESET': {
        if (!requirePaid('presets', '공유 프리셋은 Paid 기능입니다.')) break;
        presets = upsertPreset(presets, msg.preset);
        await savePresets();
        post({ type: 'PRESETS', presets });
        break;
      }
      case 'DELETE_PRESET': {
        if (!requirePaid('presets', '공유 프리셋은 Paid 기능입니다.')) break;
        presets = presets.filter((p) => p.name !== msg.name);
        await savePresets();
        post({ type: 'PRESETS', presets });
        break;
      }
      case 'EXPORT': {
        // 모든 디자인 시스템 변수(Global+Semantic)를 코드로 내보내기. (현재 Free; 추후 게이팅 가능)
        const cols = await figma.variables.getLocalVariableCollectionsAsync();
        const colById = new Map(cols.map((c) => [c.id, c]));
        const vars = await figma.variables.getLocalVariablesAsync();
        const nameById = new Map(vars.map((v) => [v.id, v.name]));
        const tokens: ExportToken[] = [];
        for (const v of vars) {
          const col = colById.get(v.variableCollectionId);
          if (!col || (col.name !== GLOBAL && col.name !== SEMANTIC)) continue;
          const raw = v.valuesByMode[col.defaultModeId];
          const t: ExportToken = {
            name: v.name,
            collection: col.name as 'Global' | 'Semantic',
            type: v.resolvedType,
            kind: kindOf(v),
          };
          if (v.description) t.description = v.description; // #16: 원본 단위("160%") 내보내기 우선
          if (isVariableAlias(raw)) {
            const target = nameById.get(raw.id);
            if (!target) continue; // 대상 불명 → 스킵
            t.aliasOf = target;
          } else if (v.resolvedType === 'COLOR' && raw && typeof raw === 'object' && 'r' in raw) {
            t.value = rgbToHex(raw as RGB);
          } else {
            t.value = raw as string | number;
          }
          // R1: 비기본 모드 → themes(다중 모드 컬렉션에서만 채워짐). CSS는 [data-theme] 블록으로 출력.
          const themes: ThemeValue[] = [];
          for (const m of col.modes) {
            if (m.modeId === col.defaultModeId) continue;
            const mraw = v.valuesByMode[m.modeId];
            const tv: ThemeValue = { theme: m.name };
            if (isVariableAlias(mraw)) {
              const target = nameById.get(mraw.id);
              if (!target) continue; // 대상 불명 → 이 모드 스킵(상속)
              tv.aliasOf = target;
            } else if (v.resolvedType === 'COLOR' && mraw && typeof mraw === 'object' && 'r' in mraw) {
              tv.value = rgbToHex(mraw as RGB);
            } else if (mraw !== undefined) {
              tv.value = mraw as string | number;
            } else {
              continue; // 값 없음 → 상속
            }
            themes.push(tv);
          }
          if (themes.length) t.themes = themes;
          tokens.push(t);
        }
        tokens.sort((a, b) => a.name.localeCompare(b.name));
        const content = exportTokens(tokens, {
          format: msg.format,
          fontSizeUnit: msg.fontSizeUnit,
          base: msg.base,
        });
        post({ type: 'EXPORT_RESULT', format: msg.format, content });
        break;
      }
      case 'SCAN_COMPONENT_CANDIDATES': {
        if (!requirePaid('components', '컴포넌트 등록·베리언트는 Paid 기능입니다.')) break;
        post({ type: 'COMPONENT_CANDIDATES', nodes: scanComponentCandidates(selection()) });
        break;
      }
      case 'REGISTER_COMPONENTS': {
        if (!requirePaid('components', '컴포넌트 등록·베리언트는 Paid 기능입니다.')) break;
        let registered = 0;
        let skipped = 0;
        const isContainerFrame = (n: SceneNode): boolean => (n.type === 'FRAME' || n.type === 'GROUP') && !n.locked;
        // 대상 후보 결정: 트리에서 체크한 nodeIds, 없으면 **선택 프레임 '내부'의 직접 후보(자식)**를
        // 등록한다(선택 프레임 자체가 아님). 후보가 없는 리프 프레임은 그 자신을 등록.
        let targets: SceneNode[];
        if (msg.nodeIds && msg.nodeIds.length) {
          targets = [];
          for (const id of msg.nodeIds) {
            const n = await figma.getNodeByIdAsync(id);
            if (n && 'type' in n) targets.push(n as SceneNode);
            else skipped++; // 소실 노드 graceful skip
          }
        } else {
          const roots = [...selection()];
          if (roots.length > 1) {
            targets = roots; // 여러 프레임 직접 선택 → 변형 프레임들로 보고 그대로 등록
          } else if (roots.length === 1) {
            // 단일 선택은 컨테이너로 보고 '내부' 후보(자식)를 등록. 후보 없으면 자신(리프).
            const root = roots[0];
            const kids = 'children' in root ? (root.children as readonly SceneNode[]).filter(isContainerFrame) : [];
            targets = kids.length ? kids : [root];
          } else {
            targets = [];
          }
        }
        // 1) 후보 → 메인 컴포넌트 등록(기존 컴포넌트는 분류 대상에 포함).
        const created: ComponentNode[] = [];
        for (const node of targets) {
          if (node.type === 'COMPONENT') {
            created.push(node);
            continue;
          }
          if (node.type === 'COMPONENT_SET' || node.type === 'INSTANCE' || node.type === 'TEXT' || node.locked) {
            skipped++;
            continue;
          }
          if (node.type !== 'FRAME' && node.type !== 'GROUP') {
            skipped++;
            continue;
          }
          try {
            created.push(figma.createComponentFromNode(node)); // 이름 유지(리네임 단계에서 정함)
            registered++;
          } catch {
            skipped++;
          }
        }
        // 2) 베이스 이름으로 묶어 베리언트 세트 결합(멤버 2개+). 단일은 컴포넌트로 유지.
        const byName = new Map<string, ComponentNode>();
        for (const c of created) if (!byName.has(c.name)) byName.set(c.name, c);
        const cls = classifyVariants(created.map((c) => c.name));
        let sets = 0;
        const missing: string[] = [];
        for (const g of cls.groups) {
          const nodes = g.members
            .map((m) => byName.get(m.name))
            .filter((n): n is ComponentNode => !!n && n.parent?.type !== 'COMPONENT_SET');
          if (nodes.length < 2) continue;
          try {
            const parent = nodes[0].parent ?? figma.currentPage;
            const set = figma.combineAsVariants(nodes, parent);
            set.name = g.base;
            for (const m of g.members) {
              const node = byName.get(m.name);
              if (node) node.name = m.variant; // 'prop=value, ...'
            }
            arrangeSet(set); // 속성 기반 그리드 정렬 + 리사이즈
            sets++;
            if (g.missing.length) missing.push(`${g.base}: ${g.missing.join(' / ')}`);
          } catch {
            /* 결합 실패 시 스킵 */
          }
        }
        post({ type: 'COMPONENTS_RESULT', registered, skipped, sets, singles: cls.singles, missing });
        if (registered || sets) commitUndo(figma); // UX2
        break;
      }
      case 'CLASSIFY_VARIANTS': {
        if (!requirePaid('components', '컴포넌트 등록·베리언트는 Paid 기능입니다.')) break;
        const comps = selection().filter((n): n is ComponentNode => n.type === 'COMPONENT');
        const byName = new Map<string, ComponentNode>();
        for (const c of comps) if (!byName.has(c.name)) byName.set(c.name, c);
        const result = classifyVariants(comps.map((c) => c.name));
        let sets = 0;
        const missing: string[] = [];
        for (const g of result.groups) {
          // 아직 세트에 속하지 않은 멤버만(멱등)
          const nodes = g.members
            .map((m) => byName.get(m.name))
            .filter((n): n is ComponentNode => !!n && n.parent?.type !== 'COMPONENT_SET');
          if (nodes.length < 2) continue;
          try {
            const parent = nodes[0].parent ?? figma.currentPage;
            const set = figma.combineAsVariants(nodes, parent);
            set.name = g.base;
            for (const m of g.members) {
              const node = byName.get(m.name);
              if (node) node.name = m.variant; // 'prop=value, ...'
            }
            arrangeSet(set); // 속성 기반 그리드 정렬 + 리사이즈
            sets++;
            if (g.missing.length) missing.push(`${g.base}: ${g.missing.join(' / ')}`);
          } catch {
            /* 결합 실패 시 스킵 */
          }
        }
        post({ type: 'VARIANTS_RESULT', sets, missing, singles: result.singles });
        if (sets) commitUndo(figma); // UX2
        break;
      }
      case 'GENERATE_MISSING_VARIANTS': {
        if (!requirePaid('components', '컴포넌트 등록·베리언트는 Paid 기능입니다.')) break;
        const sets = selection().filter((n): n is ComponentSetNode => n.type === 'COMPONENT_SET');
        let generated = 0;
        const combos: string[] = [];
        for (const set of sets) {
          const children = set.children.filter((c): c is ComponentNode => c.type === 'COMPONENT');
          if (!children.length) continue;
          const missing = missingVariants(children.map((c) => c.name));
          const src = children[0];
          for (const combo of missing) {
            try {
              const clone = src.clone();
              clone.name = combo; // 빠진 prop=value 조합
              set.appendChild(clone);
              generated++;
              combos.push(`${set.name}: ${combo}`);
            } catch {
              /* 클론 실패 시 스킵 */
            }
          }
          if (missing.length) arrangeSet(set); // 추가 후 그리드 정렬 + 리사이즈
        }
        post({ type: 'GENERATE_RESULT', generated, sets: sets.length, combos });
        if (generated) commitUndo(figma); // UX2
        break;
      }
      case 'EXPOSE_PROPERTIES': {
        if (!requirePaid('components', '컴포넌트 등록·베리언트는 Paid 기능입니다.')) break;
        let created = 0;
        const props: string[] = [];
        // 단일 컴포넌트 대상(세트는 변형 충돌 방지 위해 개별 변형을 선택).
        for (const node of selection()) {
          if (node.type !== 'COMPONENT') continue;
          const layers = node.findAll(() => true);
          const plan = inferComponentProperties(layers.map((l) => ({ name: l.name, type: l.type })));
          for (const p of plan) {
            const target = layers.find((l) => l.name === p.layerName);
            if (!target) continue;
            try {
              let def: string | boolean = '';
              if (p.type === 'TEXT') def = target.type === 'TEXT' ? target.characters : '';
              else if (p.type === 'BOOLEAN') def = target.visible;
              // INSTANCE_SWAP 기본값: 발행된 컴포넌트는 key, 로컬(미발행)은 빈 key라 id 사용.
              else def = target.type === 'INSTANCE' && target.mainComponent ? target.mainComponent.key || target.mainComponent.id : '';
              const id = node.addComponentProperty(p.propName, p.type, def);
              const refs = { ...(target.componentPropertyReferences ?? {}) };
              refs[p.field] = id;
              target.componentPropertyReferences = refs;
              created++;
              props.push(`${p.propName}:${p.type}`);
            } catch {
              /* 속성 추가/연결 실패 시 스킵(예: 미발행 INSTANCE_SWAP) */
            }
          }
        }
        post({ type: 'PROPERTIES_RESULT', created, props });
        if (created) commitUndo(figma); // UX2
        break;
      }
      case 'SCAN_SIMILAR': {
        // 미리보기(읽기 전용)는 Free — 선택 프레임을 정렬해 가변 위치·마스터 추천을 보여준다.
        const frames = selection().filter((n) => n.type === 'FRAME' || n.type === 'GROUP' || n.type === 'COMPONENT');
        const r = await scanSimilar(frames);
        post({
          type: 'SIMILAR_CANDIDATES',
          metas: r.metas,
          recommendedMasterId: r.recommendedMasterId,
          varying: r.varying,
          imageVarying: r.imageVarying,
          excluded: r.excluded,
        });
        break;
      }
      case 'FOCUS_NODE': {
        // 후보 행 포커스 → 캔버스에서 해당 프레임 선택+줌(마스터 판단 근거, 읽기 전용).
        const n = await figma.getNodeByIdAsync(msg.id);
        if (n && 'type' in n && n.type !== 'PAGE' && n.type !== 'DOCUMENT') {
          const sn = n as SceneNode;
          figma.currentPage.selection = [sn];
          figma.viewport.scrollAndZoomIntoView([sn]);
        }
        break;
      }
      case 'COMPONENTIZE_SIMILAR': {
        if (!requirePaid('components', '닮은 프레임 컴포넌트화는 Paid 기능입니다.')) break;
        const master = await figma.getNodeByIdAsync(msg.masterId);
        if (!master || (master.type !== 'FRAME' && master.type !== 'GROUP')) {
          post({ type: 'COMPONENTIZE_RESULT', master: '', properties: 0, instances: 0, images: 0, warnings: ['마스터 프레임을 찾을 수 없습니다.'] });
          break;
        }
        // 멤버 노드 수집(마스터 포함) → 정렬·생성·인스턴스 교체는 순수+적용 lib에 위임.
        const memberNodes: SceneNode[] = [];
        for (const id of msg.frameIds) {
          const n = await figma.getNodeByIdAsync(id);
          if (n && 'type' in n) memberNodes.push(n as SceneNode);
        }
        const r = await componentizeSimilar(master as SceneNode, memberNodes);
        post({ type: 'COMPONENTIZE_RESULT', master: r.master, properties: r.properties, instances: r.instances, images: r.images, warnings: r.warnings });
        if (r.instances) commitUndo(figma); // UX2: 전체를 단일 Undo로
        break;
      }
      case 'CHECK_CONTRAST': {
        // 읽기 전용 감사 — 쓰기/Undo/이력 없음. 추출은 figma, 판정은 순수 모듈.
        const { samples, skipped } = collectContrastSamples(selection());
        const report = checkContrast(samples, msg.level);
        post({
          type: 'CONTRAST_RESULT',
          level: report.level,
          checked: report.checked,
          passed: report.passed,
          failed: report.failed,
          findings: report.findings,
          skipped,
        });
        break;
      }
      case 'APPLY_CONTRAST_FIX': {
        // #2: 보정색을 대상 노드(텍스트=글자색 / 배경=배경 노드)의 첫 단색 채움에 적용.
        const node = await figma.getNodeByIdAsync(msg.nodeId);
        if (node && 'fills' in node) {
          const fills = (node as { fills?: readonly Paint[] | typeof figma.mixed }).fills;
          if (Array.isArray(fills)) {
            const i = fills.findIndex((p) => p.type === 'SOLID' && p.visible !== false && (p.opacity ?? 1) > 0);
            if (i >= 0) {
              const next = fills.slice();
              next[i] = { ...(next[i] as SolidPaint), color: hexToRgb(msg.hex) };
              (node as unknown as { fills: Paint[] }).fills = next;
              commitUndo(figma); // UX2: 보정 적용을 단일 Undo로
            }
          }
        }
        break;
      }
    }
  } catch (err) {
    // UX7: 실패한 작업 종류(op)도 함께 보내 UI가 해당 영역에 친절한 메시지를 띄운다.
    post({ type: 'ERROR', message: err instanceof Error ? err.message : String(err), op: msg?.type });
  }
};
