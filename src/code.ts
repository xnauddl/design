/* ============================================================
   code.ts — 샌드박스 엔트리 & 메시지 라우터 (모든 figma.* 호출 지점)
   ============================================================ */
import type { UiToCode, RenameChange, VarInfo, VarMode, VarValueCell, VarPatch, CodeToUi } from './shared/messages';
import { post } from './shared/messages';
import { extractFromSelection } from './lib/extract';
import { createTokens, previewCreateTokens, createSemanticAliases, scanTextStyles, scanExistingTextStyles, createSemanticTextStyles, applyExistingTextStyles, prunePaletteColors, GLOBAL, SEMANTIC, COMPONENT } from './lib/variables';
import { clusterTextStyles, nameTextStyles, nameTextStylesWithRowLabels } from './lib/textStyles';
import { bindSelection } from './lib/bind';
import { renameSelection } from './lib/rename';
import { rgbToHex, type ResolvedType, type ScopeName } from './lib/tokens';
import { pascalCase, ROLE_KEY } from './lib/naming';
import { ExportToken, TokenKind, exportTokens } from './lib/exporters';
import { missingVariants, variantGrid, inferComponentProperties, inferVaryingComponentProperties, scanComponentCandidates, groupByExactName, deriveVariants, resolveGroupNames, commonBaseName, componentEligible, shouldCollapseToProperties, pickCollapseMasterIndex, propValuesFromStruct } from './lib/components';
import type { CompPropType, StructNode, StructGroup, ScanNode, CompPropPlan } from './lib/components';
import { scanSimilar, componentizeSimilar } from './lib/similarApply';
import { generateDarkMode } from './lib/themeApply';
import { parseVarValue, sanitizeScopes, aliasSelfReference, findAliasReferers } from './lib/variableEdit';
import { Tier, Feature, isTier } from './lib/entitlements';
import { LicenseCache, LicenseStatus, evaluateLicense, cacheFromVerify, normalizeLicenseCache } from './lib/license';
import { PURCHASE_URL, PORTAL_URL } from './lib/licenseConfig';
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
let presets: Preset[] = []; // 공유 프리셋(Paid)
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
  // 개발 빌드에선 강제 티어 토글이 활성 출처(free 포함) — UI가 토글 상태를 숨기지 않도록.
  if (__DEV__) return { tier: 'free', source: 'dev' };
  return { tier: 'free', source: 'none' };
}

const currentTier = (): Tier => effective().tier;
/** Free/Paid 2티어 — 유료면 모든 유료 기능 해금. */
const isPaid = (): boolean => currentTier() === 'paid';

/** Paid 게이트: 아니면 PREMIUM_REQUIRED 안내 후 false. (미리보기/탐색은 호출 전에 허용) */
function requirePaid(feature: Feature, message: string): boolean {
  if (isPaid()) return true;
  post({ type: 'PREMIUM_REQUIRED', feature, message });
  return false;
}

function postLicense(note?: string): void {
  const e = effective();
  post({
    type: 'LICENSE_STATUS',
    tier: e.tier,
    unlimited: e.tier === 'paid', // Free/Paid 2티어 — 유료면 모든 기능 해금
    source: e.source,
    status: e.status,
    expiresAt: e.expiresAt,
    note,
  });
}

async function loadLicense(): Promise<void> {
  try {
    const dt = await figma.clientStorage.getAsync(DEV_TIER_KEY);
    if (__DEV__ && isTier(dt)) devTier = dt; // 개발용 강제 티어는 dev 빌드에서만 로드(배포 백도어 차단)
    const raw = await figma.clientStorage.getAsync(CACHE_KEY);
    const normalized = normalizeLicenseCache(raw);
    if (normalized) {
      cache = normalized;
      // 구 3티어(pro/team) 캐시를 paid로 승격했으면 저장소도 갱신 — 업데이트 직후 Free 강등 방지.
      const legacyTier =
        raw && typeof raw === 'object' && ((raw as { tier?: unknown }).tier === 'pro' || (raw as { tier?: unknown }).tier === 'team');
      if (legacyTier) {
        try {
          await figma.clientStorage.setAsync(CACHE_KEY, normalized);
        } catch {
          /* 저장 실패해도 세션 동안은 승격된 캐시 적용 */
        }
      }
    }
    const ps = await figma.clientStorage.getAsync(PRESETS_KEY);
    if (Array.isArray(ps)) presets = ps as Preset[];
  } catch {
    /* 저장소 접근 실패 시 free 유지 */
  }
}

/**
 * #11: 단계 전제 상태를 UI에 보고 — Global 변수 존재(시맨틱 매핑 가능) ·
 * 바인딩 가능 변수(Semantic/Component) 존재(바인딩 가능). 전제 미충족 카드는
 * UI가 비활성+안내로 가드한다. 토큰/시맨틱 변경 후·시작 시·요청 시 호출.
 */
async function postPrereq(): Promise<void> {
  try {
    const cols = await figma.variables.getLocalVariableCollectionsAsync();
    const globalIds = new Set(cols.filter((c) => c.name === GLOBAL).map((c) => c.id));
    const bindableIds = new Set(cols.filter((c) => c.name === SEMANTIC || c.name === COMPONENT).map((c) => c.id));
    const vars = await figma.variables.getLocalVariablesAsync();
    const hasGlobal = vars.some((v) => globalIds.has(v.variableCollectionId));
    const hasBindable = vars.some((v) => bindableIds.has(v.variableCollectionId));
    const hasTextStyles = (await figma.getLocalTextStylesAsync()).length > 0; // '기존 스타일 적용만' 전제
    post({ type: 'PREREQ_STATE', hasGlobal, hasBindable, hasTextStyles });
  } catch {
    /* 저장소 접근 실패 시 보고 생략(UI는 마지막 상태 유지) */
  }
}

/** Paid 게이트(공유 프리셋): 아니면 PREMIUM_REQUIRED 안내 후 false. */
function requirePresets(): boolean {
  return requirePaid('presets', '공유 프리셋은 Paid 기능입니다.');
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

/** 등록한 메인 컴포넌트를 모아둘 'Components' 페이지(없으면 생성·있으면 재사용). */
async function ensureComponentsPage(): Promise<PageNode> {
  await figma.loadAllPagesAsync(); // dynamic-page: 타 페이지 접근/이동 전 로드 필수
  const found = figma.root.children.find((p) => p.name === COMPONENTS_PAGE);
  if (found) return found;
  const page = figma.createPage();
  page.name = COMPONENTS_PAGE;
  return page;
}
const COMPONENTS_PAGE = 'Components';

/** 페이지에서 기존 노드들 오른쪽 빈 자리의 시작 x(겹침 방지). */
function pageStartX(page: PageNode): number {
  const ch = page.children;
  return ch.length ? Math.max(...ch.map((n) => n.x + n.width)) + 48 : 0;
}

/** 예외에서 사람이 읽을 메시지 추출(진단 노출용). */
function errText(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/* ---------- 변수 편집기 / 다크 테마 생성 ---------- */

// 우리가 만든 3계층만 편집 대상 — 남의 라이브러리 컬렉션을 건드리지 않는다.
const EDITABLE_COLLECTIONS = new Set([GLOBAL, SEMANTIC, COMPONENT]);
// 사용처 조회는 문서 전체를 훑는다 — 큰 파일에서 UI가 굳지 않게 상한을 둔다(도달 시 capped 표시).
const USAGE_SCAN_CAP = 5000;

function isVariableAlias(raw: unknown): raw is VariableAlias {
  return !!raw && typeof raw === 'object' && 'type' in raw && (raw as VariableAlias).type === 'VARIABLE_ALIAS';
}

function toValueCell(type: ResolvedType, raw: VariableValue | undefined, nameById: Map<string, string>): VarValueCell {
  if (isVariableAlias(raw)) {
    const aliasId = raw.id;
    const aliasName = nameById.get(aliasId);
    return { kind: 'alias', display: aliasName ?? '(알 수 없음)', aliasId, aliasName };
  }
  if (type === 'COLOR' && raw && typeof raw === 'object' && 'r' in raw) {
    return { kind: 'literal', display: rgbToHex(raw as RGB) };
  }
  if (raw === undefined) return { kind: 'literal', display: '' };
  return { kind: 'literal', display: String(raw) };
}

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

/** 별칭이 순환을 만드는지 — 대상에서 출발해 별칭 사슬을 따라가 source에 닿으면 순환. */
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
    return { type: 'EDIT_VARIABLE_RESULT', id, ok: false, error: errText(e) };
  }
  const all = await figma.variables.getLocalVariablesAsync();
  const nameById = new Map(all.map((x) => [x.id, x.name]));
  return { type: 'EDIT_VARIABLE_RESULT', id, ok: true, var: toVarInfo(v, col, nameById) };
}

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

/** 노드가 속한 페이지(없으면 null) — 부모를 PAGE까지 거슬러 올라간다. */
function pageOf(node: BaseNode): PageNode | null {
  let n: BaseNode | null = node;
  while (n && n.type !== 'PAGE') n = n.parent;
  return n && n.type === 'PAGE' ? n : null;
}

/** Paid 게이트(컴포넌트/베리언트): 아니면 PREMIUM_REQUIRED 안내 후 false. */
function requireComponents(): boolean {
  return requirePaid('components', '컴포넌트 등록·베리언트 분류는 Paid 기능입니다.');
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

/** Paid 게이트(텍스트 스타일): 아니면 PREMIUM_REQUIRED 안내 후 false. */
function requireTextStyles(): boolean {
  return requirePaid('textStyles', '텍스트 스타일 등록은 Paid 기능입니다.');
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

loadLicense().then(() => {
  postLicense();
  // 캐시가 오래됐으면 UI에 백그라운드 재검증 요청(WebCrypto는 UI에서).
  // instanceId 없는 구 캐시는 activate만 남아 한도 초과로 실패할 수 있음 → grace 유지, 수동 재입력 때 instanceId 확보.
  if (cache && cache.instanceId && evaluateLicense(cache, Date.now()).stale) {
    post({ type: 'REQUEST_VERIFY', key: cache.key, instanceId: cache.instanceId });
  }
});

/* ---------- UX5: 실시간 선택 동기화 ----------
   선택이 바뀔 때마다 선택 수·하위 요소 수·바인딩 후보 수를 UI에 알린다.
   대규모 선택에서도 안전하도록 스캔을 상한(SCAN_CAP)으로 제한한다. */
const SCAN_CAP = 1500;
/** 스킵 사유 칩 한 번에 선택할 레이어 상한 — 직렬 조회·대량 선택으로 멈추지 않게. */
const SELECT_CAP = 200;
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
/**
 * 이번 selectionchange가 플러그인 자신이 만든 것인가(스킵 칩 → 레이어 이동).
 * UI는 선택이 바뀌면 바인딩 미리보기를 버리는데, 칩이 그 미리보기에서 나온 것이라
 * 그대로 두면 칩 한 번 누르는 순간 칩 줄 자체가 사라진다.
 */
let selfSelect = false;

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
    // bind.ts의 walk와 같은 기준으로 세야 헤더의 '바인딩 후보 N개'와 실제 결과가 어긋나지 않는다.
    if (n.visible === false) continue;
    scanned++;
    if (isBindableCandidate(n)) bindable++;
    if (n.type === 'INSTANCE') continue; // 인스턴스 내부는 바인딩 대상이 아니다
    if ('children' in n) for (const c of (n as SceneNode & ChildrenMixin).children) stack.push(c as SceneNode);
  }
  post({ type: 'SELECTION_STATE', count: sel.length, scanned, bindable, capped, selfSelect });
  selfSelect = false;
}
figma.on('selectionchange', postSelection);

/** 노드의 첫 '보이는 단색' 채움 hex. 없거나 혼합(mixed)이면 null. */
function solidFillHex(node: SceneNode): string | null {
  const fills = (node as { fills?: readonly Paint[] | typeof figma.mixed }).fills;
  if (!Array.isArray(fills)) return null; // figma.mixed 또는 fills 없음
  for (const p of fills) {
    if (p.type === 'SOLID' && p.visible !== false && (p.opacity ?? 1) > 0) return rgbToHex(p.color);
  }
  return null;
}

/**
 * 리네임이 남긴 역할(`dsRole`)을 읽는다 — 등록이 머리명사로 쓴다. 없으면 undefined
 * (사람이 지은 이름이거나 리네임 전). API가 없는 노드도 안전하게 통과.
 */
function readRole(node: SceneNode): string | undefined {
  const fn = (node as { getPluginData?: (key: string) => string }).getPluginData;
  if (typeof fn !== 'function') return undefined;
  try {
    return fn.call(node, ROLE_KEY) || undefined;
  } catch {
    return undefined; // 읽기 실패 → 이름 기반 폴백
  }
}

/** figma 노드 → 구조 비교용 StructNode(재귀). 여백·크기·대표 색·텍스트/스왑·역할을 읽어 순수 그룹화에 넘김. */
function toStructNode(node: SceneNode): StructNode {
  const a = node as unknown as Record<string, unknown>;
  const num = (v: unknown): number | undefined => (typeof v === 'number' ? v : undefined);
  const kids = 'children' in node ? (node.children as readonly SceneNode[]) : [];
  let characters: string | undefined;
  let mainComponentKey: string | null | undefined;
  if (node.type === 'TEXT') {
    try { characters = node.characters; } catch { characters = ''; }
  }
  if (node.type === 'INSTANCE') {
    try {
      const main = node.mainComponent;
      mainComponentKey = main ? (main.key || main.id) : null;
    } catch {
      mainComponentKey = null;
    }
  }
  return {
    id: node.id,
    name: node.name,
    type: node.type,
    locked: node.locked,
    visible: node.visible,
    width: num(a.width),
    height: num(a.height),
    paddingTop: num(a.paddingTop),
    paddingRight: num(a.paddingRight),
    paddingBottom: num(a.paddingBottom),
    paddingLeft: num(a.paddingLeft),
    itemSpacing: num(a.itemSpacing),
    counterAxisSpacing: num(a.counterAxisSpacing),
    layoutMode: typeof a.layoutMode === 'string' ? a.layoutMode : undefined,
    fillHex: solidFillHex(node),
    characters,
    mainComponentKey,
    role: readRole(node),
    // INSTANCE 안은 자식 컴포넌트 소관 — 접힘 비교·속성 노출과 동일하게 펼치지 않음.
    children: node.type === 'INSTANCE' ? [] : kids.map(toStructNode),
  };
}

/** 컴포넌트 루트 기준 레이어 + 경로(인스턴스 안 미진입). */
function ownComponentLayersWithPath(root: ComponentNode | SceneNode): { node: SceneNode; path: string }[] {
  const out: { node: SceneNode; path: string }[] = [];
  const walk = (n: SceneNode, path: string): void => {
    if (n !== root) out.push({ node: n, path });
    if (n.type === 'INSTANCE') return;
    if (!('children' in n)) return;
    const kids = n.children as readonly SceneNode[];
    for (let i = 0; i < kids.length; i++) {
      walk(kids[i], path === '' ? String(i) : `${path}/${i}`);
    }
  };
  walk(root, '');
  return out;
}

/** @deprecated 경로 없는 목록 — 동명 레이어 매칭에 취약. 가급적 withPath 사용. */
function ownComponentLayers(root: ComponentNode | SceneNode): SceneNode[] {
  return ownComponentLayersWithPath(root).map((x) => x.node);
}

/** 루트 기준 자식 인덱스 경로(`0/1`)로 노드 찾기. */
function nodeAtPath(root: SceneNode, path: string): SceneNode | null {
  let cur: SceneNode = root;
  for (const seg of path.split('/').filter(Boolean)) {
    if (!('children' in cur)) return null;
    const i = Number(seg);
    if (!Number.isFinite(i)) return null;
    const kids = cur.children as readonly SceneNode[];
    if (!kids[i]) return null;
    cur = kids[i];
  }
  return cur;
}

function propDefaultFor(target: SceneNode, type: CompPropType): string | boolean {
  if (type === 'TEXT') return target.type === 'TEXT' ? target.characters : '';
  if (type === 'BOOLEAN') return target.visible;
  return target.type === 'INSTANCE' && target.mainComponent ? target.mainComponent.key || target.mainComponent.id : '';
}

/** 조상 체인 포함 실효 가시성 — 부모만 숨겨도 자식은 후보에서 제외. */
function isEffectivelyVisible(node: SceneNode): boolean {
  let p: BaseNode | null = node;
  while (p) {
    if ('visible' in p && (p as SceneNode).visible === false) return false;
    p = p.parent;
  }
  return true;
}

/** 등록/스캔 공통: 실효 보임 + componentEligible. */
function sceneComponentEligible(n: SceneNode): boolean {
  if (!isEffectivelyVisible(n)) return false;
  // FRAME/GROUP은 구조만으로 판정하므로 노드를 그대로 넘긴다.
  if (n.type === 'FRAME' || n.type === 'GROUP') return componentEligible(n as ScanNode);
  // 말단은 리네임이 남긴 dsRole로만 열린다 — SceneNode엔 그 필드가 없어 읽어 채운다.
  return componentEligible({ id: n.id, name: n.name, type: n.type, locked: n.locked, visible: n.visible, role: readRole(n) });
}

/** 계획의 layerPath(우선) 또는 layerName으로 대상 레이어 찾기. */
function resolvePropTarget(root: SceneNode, p: CompPropPlan): SceneNode | null {
  if (p.layerPath != null && p.layerPath !== '') {
    // 경로가 있으면 이름 폴백 금지 — 동명 레이어에 잘못 묶여 고아 속성이 생기는 것 방지.
    return nodeAtPath(root, p.layerPath);
  }
  return ownComponentLayers(root).find((l) => l.name === p.layerName) ?? null;
}

/** 레이어 계획에 맞춰 노드에서 속성값 스냅샷(등록 전·노드 소멸 전). */
function propValuesFromNode(root: SceneNode, plan: readonly CompPropPlan[]): Record<string, string | boolean> {
  return propValuesFromStruct(toStructNode(root), plan);
}

/** 컴포넌트 속성 정의에서 propName → property id. */
function propIdsByName(container: ComponentNode | ComponentSetNode): Map<string, string> {
  const map = new Map<string, string>();
  const defs = container.componentPropertyDefinitions;
  if (!defs) return map;
  for (const [id, def] of Object.entries(defs)) {
    if (def && typeof def === 'object' && 'name' in def && typeof (def as { name: string }).name === 'string') {
      map.set((def as { name: string }).name, id);
    }
  }
  return map;
}

function applyInstancePropValues(
  inst: InstanceNode,
  ids: Map<string, string>,
  values: Record<string, string | boolean>,
): void {
  const payload: { [key: string]: string | boolean } = {};
  for (const [name, val] of Object.entries(values)) {
    const id = ids.get(name);
    if (id != null) payload[id] = val;
  }
  if (Object.keys(payload).length) {
    try { inst.setProperties(payload); } catch { /* 일부 속성 적용 실패 무시 */ }
  }
}

/**
 * 컴포넌트/세트의 레이어를 컴포넌트 속성으로 노출(등록에 자동 통합).
 *
 * **TEXT 노출 정책(경로별)**:
 * - **속성 접힘**(같은 이름·구조 동형, 카피/스왑만 다름): `inferVaryingComponentProperties` —
 *   값이 다른 슬롯만 속성. 인스턴스에서 값 오버라이드.
 * - **단독·베리언트 세트**: `inferComponentProperties` — 트리의 TEXT/INSTANCE/`?`를
 *   컴포넌트 API로 전부 노출(인스턴스에서 라벨 등을 바꿀 수 있게). 동명·동일 카피는 1개만.
 * 두 경로 모두 **레이어 경로**로 연결(`이름?` → BOOLEAN 우선 동일).
 *
 * **인스턴스 내부로는 진입하지 않는다** — 중첩 컴포넌트는 swap 후보로만.
 * 반환: 노출된 `속성명:타입` 목록.
 */
function exposeProperties(container: ComponentNode | ComponentSetNode, scopes: readonly ComponentNode[]): string[] {
  const rep = scopes[0];
  if (!rep) return [];
  const layered = ownComponentLayersWithPath(rep);
  const plan = inferComponentProperties(
    layered.map(({ node, path }) => ({
      name: node.name,
      type: node.type,
      path,
      characters: node.type === 'TEXT' ? node.characters : undefined,
    })),
  );
  return exposePropertiesFromPlan(container, scopes, plan);
}

/** 주어진 계획만 속성으로 노출(접힘: 값이 다른 슬롯만). */
function exposePropertiesFromPlan(
  container: ComponentNode | ComponentSetNode,
  scopes: readonly ComponentNode[],
  plan: readonly CompPropPlan[],
): string[] {
  const out: string[] = [];
  for (const p of plan) {
    const repTarget = resolvePropTarget(scopes[0], p);
    if (!repTarget) continue;
    try {
      const id = container.addComponentProperty(p.propName, p.type, propDefaultFor(repTarget, p.type));
      for (const scope of scopes) {
        const target = resolvePropTarget(scope, p);
        if (!target) continue;
        const refs = { ...(target.componentPropertyReferences ?? {}) };
        refs[p.field] = id;
        target.componentPropertyReferences = refs;
      }
      out.push(`${p.propName}:${p.type}`);
    } catch {
      /* 속성 추가/연결 실패(예: 미발행 INSTANCE_SWAP) 스킵 */
    }
  }
  return out;
}

/** a가 b의 조상인가(부모 체인). */
function isAncestorOf(a: BaseNode, b: BaseNode): boolean {
  let p: BaseNode | null = b.parent;
  while (p) { if (p.id === a.id) return true; p = p.parent; }
  return false;
}

/**
 * 등록용 그룹화 — 정확한 이름 그룹(`groupByExactName`) + **같은 이름의 조상 제외**.
 * 같은 이름의 조상·자손이 함께 선택되면 한 세트에 둘 다 넣을 수 없어(결합이 깨짐) 잎 쪽만 남긴다.
 * SCAN 미리보기와 REGISTER가 **동일 규칙**을 쓰도록 한 곳에 둔다.
 */
function groupForRegister(nodes: readonly SceneNode[]): StructGroup[] {
  const liveById = new Map(nodes.map((n) => [n.id, n]));
  return groupByExactName(nodes.map(toStructNode))
    .map((g) => {
      const live = g.members.map((m) => liveById.get(m.id)).filter((n): n is SceneNode => !!n);
      const members = g.members.filter((m) => {
        const node = liveById.get(m.id);
        return node ? !live.some((o) => o.id !== node.id && isAncestorOf(node, o)) : false;
      });
      return { key: g.key, members };
    })
    .filter((g) => g.members.length > 0);
}

/**
 * **내부(자손) 그룹 먼저** — 위상 정렬. 내부 반복이 먼저 세트/인스턴스가 된 뒤 바깥을 컴포넌트화해야
 * 중첩이 보존된다. "다른 남은 그룹을 자기 안에 포함하지 않는(=가장 안쪽인) 그룹"부터 출력한다.
 * 깊이만으로 정렬하면 한 그룹의 멤버가 여러 깊이에 걸칠 때 어긋날 수 있어, 실제 포함관계로 정렬한다.
 * 사이클(이론상)·동순위는 문서 깊이 내림차순으로 폴백.
 */
function orderInnerFirst(groups: readonly StructGroup[], byId: Map<string, SceneNode>): StructGroup[] {
  const liveOf = (g: StructGroup): SceneNode[] => g.members.map((m) => byId.get(m.id)).filter((n): n is SceneNode => !!n);
  const docDepth = (n: SceneNode): number => {
    let d = 0;
    let p: BaseNode | null = n.parent;
    while (p && p.type !== 'PAGE' && p.type !== 'DOCUMENT') { d++; p = p.parent; }
    return d;
  };
  const groupDepth = (g: StructGroup): number => Math.max(0, ...liveOf(g).map(docDepth));
  // x가 남은 다른 그룹 y를 자기 안에 포함하면(=y가 x보다 안쪽) x는 아직 출력 불가.
  const containsRemaining = (x: StructGroup, rest: readonly StructGroup[]): boolean =>
    rest.some((y) => y !== x && liveOf(y).some((b) => liveOf(x).some((a) => a.id !== b.id && isAncestorOf(a, b))));
  const remaining = [...groups].sort((a, b) => groupDepth(b) - groupDepth(a)); // 깊이 폴백(사이클/동순위)
  const out: StructGroup[] = [];
  while (remaining.length) {
    let idx = remaining.findIndex((x) => !containsRemaining(x, remaining));
    if (idx < 0) idx = 0; // 사이클 폴백: 가장 깊은 것
    out.push(remaining.splice(idx, 1)[0]);
  }
  return out;
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
        // 실제 변수 생성만 Paid(미리보기는 비파괴 읽기라 백엔드는 허용 — UI가 무료 티어에서 버튼을 잠근다).
        if (!msg.preview && !requirePaid('tokens', '토큰(변수) 생성은 Paid 기능입니다. 미리보기는 무료로 제공됩니다.')) break;
        // UX1: preview면 변수를 만들지 않고 예정 수만 집계. base는 값 환산에 쓰이므로 양쪽 다 전달.
        const s = msg.preview ? await previewCreateTokens(msg.tokens, msg.base) : await createTokens(msg.tokens, msg.base);
        // 팔레트 재적용(replacePalette): 이번 팔레트에 없는 이전 팔레트 색 변수 정리(사용자 변수 보존).
        const pruned = !msg.preview && msg.replacePalette ? await prunePaletteColors(msg.tokens.map((t) => t.name)) : 0;
        let summary = `Global ${s.globals}개 · Semantic ${s.semantics}개 (생성 ${s.created} / 갱신 ${s.updated})`;
        if (pruned) summary += ` · 이전 색 ${pruned}개 정리`;
        // base 반영 — 비-px 값이 실제로 얼마가 되는지 요약에 노출. base를 바꾸면 이 줄이 바뀐다.
        if (s.conversions.length) {
          const px = (n: number): string => String(Math.round(n * 100) / 100);
          const ex = s.conversions.slice(0, 2).map((c) => `${c.from}→${px(c.to)}px`).join(', ');
          summary += ` · base ${msg.base}px 환산 ${s.conversions.length}개(${ex}${s.conversions.length > 2 ? ' 외' : ''})`;
        }
        post({ type: 'CREATE_RESULT', created: s.created, updated: s.updated, summary, preview: msg.preview });
        if (!msg.preview) {
          commitUndo(figma); // UX2: 토큰 생성 전체를 단일 Undo로
          await postPrereq(); // #11: 토큰 생성 → 시맨틱/바인딩 전제 충족 갱신
        }
        break;
      }
      case 'APPLY': {
        bindCancel = false; // UX6: 새 작업 시작 시 취소 플래그 초기화
        // UX1: preview면 dry-run(바인딩 없이 집계). UX3: 사유별 스킵(reasons). UX6: 진행률·취소.
        const r = await bindSelection(
          selection(),
          msg.tolerance,
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
          preview: msg.preview,
          cancelled: r.cancelled,
          candidates: r.candidates, // #6: 미리보기 후보(dry-run만)
          nodes: r.nodes, // #13: 미리보기 트리 맥락
          skips: r.skips, // 사유별 건너뛴 레이어(dry-run만)
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
      case 'SELECT_NODES': {
        // 스킵 사유 → 원인 레이어로 이동(읽기 전용). 삭제·페이지 이동으로 사라진 id는 조용히 무시하고,
        // 현재 페이지에 남은 것만 선택한다(다른 페이지 노드를 selection에 넣으면 런타임이 거부).
        // 상한 — 사유 하나에 수천 건이 걸릴 수 있다(자유 배치 프레임이 많은 페이지). 전부 조회하면
        // 직렬 await로 플러그인이 수 초간 멈추고, 전체 선택 + scrollAndZoomIntoView는 페이지 전체로
        // 축소돼 오히려 원인을 못 찾는다. 앞에서부터 잘라 보여주고 몇 개를 생략했는지 알린다.
        const ids = msg.ids.slice(0, SELECT_CAP);
        const found: SceneNode[] = [];
        for (const id of ids) {
          const n = await figma.getNodeByIdAsync(id);
          if (n && n.type !== 'PAGE' && n.type !== 'DOCUMENT' && (n as SceneNode).parent) found.push(n as SceneNode);
        }
        const onPage = found.filter((n) => {
          for (let p: BaseNode | null = n; p; p = p.parent) if (p.id === figma.currentPage.id) return true;
          return false;
        });
        if (onPage.length) {
          const cur = figma.currentPage.selection;
          // 선택이 실제로 바뀔 때만 표시한다 — 안 바뀌면 selectionchange가 안 와서 플래그가 남는다.
          if (onPage.length !== cur.length || onPage.some((n, i) => cur[i] !== n)) selfSelect = true;
          figma.currentPage.selection = onPage;
          figma.viewport.scrollAndZoomIntoView(onPage);
        }
        post({ type: 'SELECT_RESULT', found: onPage.length, requested: msg.ids.length, capped: msg.ids.length > SELECT_CAP });
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
        for (const { id, before: expectedBefore, after } of msg.items) {
          const node = await figma.getNodeByIdAsync(id);
          if (!node || !('name' in node)) continue; // 소실 노드는 graceful skip
          const before = node.name;
          if (before !== expectedBefore) continue; // 미리보기 이후 이름이 바뀐 노드는 stale 적용 방지
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
        const existing = await scanExistingTextStyles();
        if (msg.useRowLabels) {
          const r = nameTextStylesWithRowLabels(samples, existing);
          post({
            type: 'TEXT_STYLE_CANDIDATES',
            styles: r.styles,
            warnings,
            labeled: r.labeled,
            fallback: r.fallback,
          });
        } else {
          const styles = nameTextStyles(clusterTextStyles(samples), existing);
          post({ type: 'TEXT_STYLE_CANDIDATES', styles, warnings });
        }
        break;
      }
      case 'CREATE_TEXT_STYLES': {
        if (!requireTextStyles()) break;
        const r = await createSemanticTextStyles(msg.styles, msg.apply, selection());
        post({ type: 'TEXT_STYLES_RESULT', created: r.created, updated: r.updated, bound: r.bound, applied: r.applied, missing: r.missing, notes: r.notes });
        commitUndo(figma); // UX2: 변수+스타일 생성을 단일 Undo로
        await postPrereq(); // 스타일·시맨틱 변수 생성 반영 → '적용만' 등 전제 게이트 갱신
        break;
      }
      case 'APPLY_TEXT_STYLES': {
        // 적용만(생성 없음): 선택 텍스트를 시그니처가 같은 기존 스타일에 바인딩.
        if (!requireTextStyles()) break;
        const r = await applyExistingTextStyles(selection());
        post({ type: 'TEXT_STYLES_APPLIED', applied: r.applied, missing: r.missing });
        commitUndo(figma);
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
          const prev = cache;
          // 키 교체·기기 변경 시 이전 LS 활성화 슬롯 반납(best-effort) — activation_limit 고아 방지.
          if (prev?.instanceId) {
            const keyChanged = prev.key !== msg.key;
            const instChanged = !!msg.result.instanceId && prev.instanceId !== msg.result.instanceId;
            if (keyChanged || instChanged) {
              post({ type: 'REQUEST_DEACTIVATE', key: prev.key, instanceId: prev.instanceId });
            }
          }
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
        // 이 기기의 LS 활성화 슬롯 반납(best-effort) — 캐시를 지우기 전에 키+instanceId를 UI로 넘긴다.
        if (cache?.key && cache.instanceId) {
          post({ type: 'REQUEST_DEACTIVATE', key: cache.key, instanceId: cache.instanceId });
        }
        cache = null;
        try {
          await figma.clientStorage.deleteAsync(CACHE_KEY);
        } catch {
          /* 무시 */
        }
        postLicense('라이선스 키 제거됨');
        break;
      }
      case 'OPEN_LICENSE_LINK': {
        // URL은 여기서만 해석 — UI가 임의 주소를 넘길 수 없게 한다.
        figma.openExternal(msg.target === 'purchase' ? PURCHASE_URL : PORTAL_URL);
        break;
      }
      case 'GET_PRESETS': {
        if (!requirePresets()) break;
        post({ type: 'PRESETS', presets });
        break;
      }
      case 'SAVE_PRESET': {
        if (!requirePresets()) break;
        presets = upsertPreset(presets, msg.preset);
        await savePresets();
        post({ type: 'PRESETS', presets });
        break;
      }
      case 'DELETE_PRESET': {
        if (!requirePresets()) break;
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
          if (raw && typeof raw === 'object' && 'type' in raw && (raw as VariableAlias).type === 'VARIABLE_ALIAS') {
            const target = nameById.get((raw as VariableAlias).id);
            if (!target) continue; // 대상 불명 → 스킵
            t.aliasOf = target;
          } else if (v.resolvedType === 'COLOR' && raw && typeof raw === 'object' && 'r' in raw) {
            t.value = rgbToHex(raw as RGB);
          } else {
            t.value = raw as string | number;
          }
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
        if (!requireComponents()) break;
        // 숨긴 조상 아래 노드는 선택 루트여도 제외(실효 비가시).
        const roots = selection().filter(isEffectivelyVisible);
        // StructNode로 매핑해 넘긴다 — 말단 등록 자격이 `dsRole`에 달려 있다.
        // toStructNode가 인스턴스 내부를 펼치지 않으므로 스캔 범위는 그대로다.
        const candidates = scanComponentCandidates(roots.map(toStructNode));
        // 라이브 노드 인덱스 — 스캔과 동일하게 인스턴스·메인·세트 안은 펼치지 않는다.
        // (전체 재귀는 대용량 파일에서 UI가 ‘스캔 중’에 멈춘 것처럼 보이게 함.)
        const liveById = new Map<string, SceneNode>();
        const index = (n: SceneNode): void => {
          if (n.visible === false) return;
          liveById.set(n.id, n);
          if (n.type === 'INSTANCE' || n.type === 'COMPONENT' || n.type === 'COMPONENT_SET') return;
          if ('children' in n) for (const c of n.children as readonly SceneNode[]) index(c);
        };
        for (const r of roots) index(r);
        // eligible 재확인(조상 숨김 — 순수 스캔은 선택 서브트리만 보아 놓칠 수 있음).
        const gated = candidates.map((c) => {
          const live = liveById.get(c.id);
          if (!live || !isEffectivelyVisible(live)) return { ...c, eligible: false };
          return c;
        });
        // eligible이 빠진 뒤 고아 맥락 조상 제거.
        const byCand = new Map(gated.map((c) => [c.id, c]));
        const keepIds = new Set(gated.filter((c) => c.eligible).map((c) => c.id));
        for (const c of gated) {
          if (!c.eligible) continue;
          let p = c.parentId;
          while (p && !keepIds.has(p)) {
            keepIds.add(p);
            p = byCand.get(p)?.parentId ?? null;
          }
        }
        const pruned = gated.filter((c) => keepIds.has(c.id));
        // **전체 eligible 후보**를 정확한 이름으로 묶어 미리보기 라벨 주입(깊이 무관, 등록과 동일 규칙).
        // 반복(2개+) → 구조 차이면 group+variant(자동체크), 속성(텍스트/스왑/불리언)만 다르면
        // propsOnly+single(자동체크·단품 접힘). 단독(1개) → single(PascalCase).
        let nodes = pruned;
        try {
          const eligibleNodes = pruned
            .filter((c) => c.eligible)
            .map((c) => liveById.get(c.id))
            .filter((n): n is SceneNode => !!n);
          const groups = groupForRegister(eligibleNodes);
          const preview = new Map<string, { group?: string; variant?: string; single?: string; propsOnly?: boolean }>();
          for (const g of groups) {
            if (g.members.length < 2) {
              if (g.members[0]) preview.set(g.members[0].id, { single: pascalCase(g.members[0].name) });
              continue;
            }
            if (shouldCollapseToProperties(g.members)) {
              const name = pascalCase(commonBaseName(g.members.map((m) => m.name)) || g.members[0].name);
              for (const m of g.members) preview.set(m.id, { single: name, propsOnly: true });
              continue;
            }
            const base = commonBaseName(g.members.map((m) => m.name));
            for (const d of deriveVariants(g.members)) preview.set(d.id, { group: base, variant: d.variant });
          }
          nodes = pruned.map((c) => {
            const p = preview.get(c.id);
            return p ? { ...c, ...p } : c;
          });
        } catch (e) {
          // 미리보기 라벨 실패해도 후보는 반환(스캔 중 고정 방지).
          console.warn('component preview label failed', e);
        }
        post({ type: 'COMPONENT_CANDIDATES', nodes });
        break;
      }
      case 'REGISTER_COMPONENTS': {
        if (!requireComponents()) break;
        await figma.loadAllPagesAsync(); // dynamic-page: 컴포넌트 페이지 이동 전 로드
        let registered = 0;
        let skipped = 0;
        // 후보 필터: 스캔(`componentEligible`)과 같은 규칙 — 실효 보임 + FRAME/GROUP은 고신뢰
        // 시맨틱 역할, 말단은 리네임이 재사용 원자로 판정한 것(아바타·아이콘·썸네일…).
        const eligible = (n: SceneNode): boolean => sceneComponentEligible(n);
        // 대상 결정: 트리에서 체크한 nodeIds, 없으면(스캔 없이 등록) 선택 서브트리를 **재귀**로 모아
        // **반복 이름(2회+)만** 묶는다(단독 잡음 제외).
        let targets: SceneNode[];
        let setsOnly = false;
        if (msg.nodeIds && msg.nodeIds.length) {
          targets = [];
          for (const id of msg.nodeIds) {
            const n = await figma.getNodeByIdAsync(id);
            if (n && 'type' in n) targets.push(n as SceneNode);
            else skipped++; // 소실 노드 graceful skip
          }
        } else {
          const roots = [...selection()];
          const single = roots.length === 1;
          const collected: SceneNode[] = [];
          const walk = (n: SceneNode, depth: number): void => {
            if (n.visible === false) return; // 숨김은 등록·하위 스캔 제외
            const isContainerRoot = single && depth === 0; // 컨테이너 자신 제외
            if (!isContainerRoot && eligible(n)) collected.push(n);
            // 인스턴스·메인·세트 안은 이미 컴포넌트 체계 — 안쪽 FRAME을 다시 등록하지 않음.
            if (n.type === 'INSTANCE' || n.type === 'COMPONENT' || n.type === 'COMPONENT_SET') return;
            if ('children' in n) for (const c of n.children as readonly SceneNode[]) walk(c, depth + 1);
          };
          for (const r of roots) walk(r, 0);
          targets = collected;
          setsOnly = true;
        }
        const valid: SceneNode[] = [];
        for (const n of targets) {
          if (eligible(n)) valid.push(n);
          else skipped++;
        }
        const byId = new Map(valid.map((n) => [n.id, n]));

        // 정확한 이름 그룹화 + 같은 이름 조상 제외(SCAN과 공유). 폴백(스캔 없이 등록)은 반복만.
        let groups = groupForRegister(valid);
        if (setsOnly) groups = groups.filter((g) => g.members.length >= 2);
        if (!groups.length) {
          post({ type: 'COMPONENTS_RESULT', registered: 0, skipped, sets: 0, singles: [], missing: [], failures: [] });
          break;
        }
        // **내부(자손) 그룹 먼저** — 내부 반복이 먼저 세트/인스턴스가 된 뒤 바깥을 컴포넌트화해야
        // 그 안에 내부 인스턴스가 들어가 중첩이 보존된다(각 단계 모두). 실제 포함관계로 위상 정렬.
        groups = orderInnerFirst(groups, byId);

        const page = await ensureComponentsPage();
        let cursorX = pageStartX(page);
        let sets = 0;
        const singles: string[] = [];
        const failures: string[] = []; // 조용히 삼키던 실패를 UI로 노출(진단)
        // 등록으로 만든 컴포넌트/세트 — 루프 후 **속성 자동 노출**(옛 '속성 노출' 버튼 통합).
        const containers: { container: ComponentNode | ComponentSetNode; scopes: ComponentNode[] }[] = [];
        let exposedEarly = 0; // 속성접힘 경로에서 선노출한 속성 수

        type Origin = { parent: (BaseNode & ChildrenMixin) | null; index: number; x: number; y: number; autolayout: boolean };
        const captureOrigin = (n: SceneNode): Origin => {
          const parent = n.parent;
          const hasKids = !!parent && 'children' in parent;
          const idx = hasKids ? (parent as BaseNode & ChildrenMixin).children.indexOf(n) : -1;
          const al = !!parent && 'layoutMode' in parent && (parent as FrameNode).layoutMode !== 'NONE';
          return { parent: hasKids ? (parent as BaseNode & ChildrenMixin) : null, index: idx, x: n.x, y: n.y, autolayout: al };
        };
        const placeOnPage = (n: ComponentNode | ComponentSetNode): void => {
          page.appendChild(n);
          n.x = cursorX;
          n.y = 0;
          cursorX += n.width + 48;
        };
        // 한 그룹의 인스턴스를 원위치 복원(부모별 인덱스 오름차순 + 클램프). 깊은 그룹부터 즉시 복원해야
        // 바깥 그룹 컴포넌트화 시 내부 인스턴스가 이미 자리잡고 있다.
        const restore = (places: { inst: InstanceNode; o: Origin }[]): void => {
          places.sort((a, b) => {
            const pa = a.o.parent?.id ?? ''; const pb = b.o.parent?.id ?? '';
            return pa === pb ? a.o.index - b.o.index : pa < pb ? -1 : 1;
          });
          for (const { inst, o } of places) {
            if (!o.parent) { skipped++; continue; }
            try {
              const len = o.parent.children.length;
              o.parent.insertChild(Math.min(Math.max(0, o.index), len), inst);
              if (!o.autolayout) { inst.x = o.x; inst.y = o.y; }
            } catch (e) { skipped++; failures.push(`인스턴스 배치 실패: ${errText(e)}`); }
          }
        };
        // 단독 컴포넌트 1개를 페이지 이동 + 원위치 인스턴스 + 속성 노출 대상 등록(단독·결합불가·결합실패 3곳 공용).
        const placeSingle = (comp: ComponentNode, o: Origin, name: string): void => {
          try { comp.name = name; } catch { /* 이름 실패 무시 */ }
          placeOnPage(comp);
          singles.push(comp.name);
          containers.push({ container: comp, scopes: [comp] });
          try { restore([{ inst: comp.createInstance(), o }]); } catch (e) { failures.push(`인스턴스 실패(${comp.name}): ${errText(e)}`); }
        };

        // 역할 기반 이름 + 그룹 간 충돌 해소를 **루프 전에** 한 번에 정한다(순서와 1:1).
        const groupNames = resolveGroupNames(groups.map((g) => g.members));
        for (let gi = 0; gi < groups.length; gi++) {
          const g = groups[gi];
          const setName = groupNames[gi];
          // 단독(1개) — 컴포넌트화 + 원위치 인스턴스.
          if (g.members.length === 1) {
            const node = byId.get(g.members[0].id);
            if (!node) continue;
            const o = captureOrigin(node);
            try {
              const comp = figma.createComponentFromNode(node);
              registered++;
              placeSingle(comp, o, setName); // 단독·세트 동일 규칙
            } catch (e) {
              skipped++;
              failures.push(`단독 등록 실패(${g.members[0].name}): ${errText(e)}`);
            }
            continue;
          }

          // 텍스트/스왑/불리언만 다른 반복 → 단품 1개 + 속성 오버라이드 인스턴스(세트 금지).
          if (shouldCollapseToProperties(g.members)) {
            const live: SceneNode[] = [];
            for (const m of g.members) {
              const n = byId.get(m.id);
              if (n) live.push(n);
            }
            if (live.length < 2) {
              // 소실로 1개만 남으면 단독 경로와 동일.
              if (live[0]) {
                const o = captureOrigin(live[0]);
                try {
                  const comp = figma.createComponentFromNode(live[0]);
                  registered++;
                  placeSingle(comp, o, setName || pascalCase(live[0].name));
                } catch (e) {
                  skipped++;
                  failures.push(`속성접힘 등록 실패(${setName}): ${errText(e)}`);
                }
              }
              continue;
            }
            const structs = live.map(toStructNode);
            const plan = inferVaryingComponentProperties(structs);
            type Snap = { o: Origin; vals: Record<string, string | boolean> };
            const snapshots: Snap[] = [];
            const made: ComponentNode[] = [];
            const madeFromLive: number[] = [];
            for (let i = 0; i < live.length; i++) {
              const n = live[i];
              const snap: Snap = { o: captureOrigin(n), vals: propValuesFromNode(n, plan) };
              try {
                made.push(figma.createComponentFromNode(n));
                snapshots.push(snap);
                madeFromLive.push(i);
              } catch (e) {
                skipped++;
                failures.push(`속성접힘 컴포넌트화 실패(${n.name}): ${errText(e)}`);
              }
            }
            if (!made.length) continue;
            // 액션 슬롯이 있는 쪽을 마스터로 — optional 결손 멤버의 트리를 대표로 쓰면 BOOLEAN 경로가 사라짐.
            const preferLive = pickCollapseMasterIndex(structs);
            let masterMade = madeFromLive.indexOf(preferLive);
            if (masterMade < 0) masterMade = 0;
            const master = made[masterMade];
            for (let i = 0; i < made.length; i++) {
              if (i === masterMade) continue;
              try { made[i].remove(); } catch { /* 이미 제거됨 */ }
            }
            try { master.name = setName || pascalCase(live[preferLive]?.name ?? live[0].name); } catch { /* 이름 실패 무시 */ }
            placeOnPage(master);
            singles.push(master.name);
            registered++; // 남긴 단품 1개만 집계(중간 변환분은 제거)
            // 값이 다른 슬롯만 TEXT/SWAP/BOOLEAN으로 노출(공통 텍스트는 속성 제외).
            let collapsedExposed = 0;
            try {
              collapsedExposed = exposePropertiesFromPlan(master, [master], plan).length;
            } catch (e) {
              failures.push(`속성 노출 실패(${master.name}): ${errText(e)}`);
            }
            exposedEarly += collapsedExposed;
            const ids = propIdsByName(master);
            const places: { inst: InstanceNode; o: Origin }[] = [];
            for (const snap of snapshots) {
              try {
                const inst = master.createInstance();
                applyInstancePropValues(inst, ids, snap.vals);
                places.push({ inst, o: snap.o });
              } catch (e) {
                failures.push(`인스턴스 실패(${master.name}): ${errText(e)}`);
              }
            }
            restore(places);
            // 루프 끝 일괄 expose는 중복 방지 — 이미 노출했으므로 containers에 넣지 않음.
            continue;
          }

          // 2개+ → 각 멤버 컴포넌트화(원위치 기록) 후 세트 결합 → 원위치에 변형 인스턴스 복원.
          const variantById = new Map(deriveVariants(g.members).map((d) => [d.id, d.variant]));
          const made: { comp: ComponentNode; variant: string; o: Origin }[] = [];
          for (const m of g.members) {
            const node = byId.get(m.id);
            if (!node) continue;
            const o = captureOrigin(node);
            try {
              made.push({ comp: figma.createComponentFromNode(node), variant: variantById.get(m.id) ?? '', o });
              registered++;
            } catch (e) {
              skipped++;
              failures.push(`컴포넌트화 실패(${m.name}): ${errText(e)}`);
            }
          }
          if (made.length < 2) {
            // 결합 불가 → 단독으로 등록 + 원위치 인스턴스.
            for (const x of made) placeSingle(x.comp, x.o, setName);
            continue;
          }
          // 결합(핵심). 실패해도 컴포넌트가 소실되지 않게 **단독으로라도 등록**(반쪽 상태 방지).
          let set: ComponentSetNode;
          try {
            // combineAsVariants는 "부모와 같은 페이지" 제약 → **원본 페이지에서 결합 후** 컴포넌트 페이지로 이동.
            const home = pageOf(made[0].comp) ?? figma.currentPage;
            set = figma.combineAsVariants(made.map((x) => x.comp), home);
          } catch (e) {
            failures.push(`결합 실패(${setName}): ${errText(e)}`);
            for (const x of made) placeSingle(x.comp, x.o, setName);
            continue;
          }
          // 결합 성공 — 이름/이동/인스턴스는 **무조건** 수행(장식 단계 실패로 세트를 버리지 않음).
          set.name = setName;
          for (const x of made) if (x.variant) x.comp.name = x.variant; // 'Prop=value, ...'
          page.appendChild(set); // Components 페이지로 이동
          try { arrangeSet(set); } catch (e) { failures.push(`정렬 실패(${set.name}): ${errText(e)}`); } // 장식: 비치명
          set.x = cursorX;
          set.y = 0;
          cursorX += set.width + 48;
          sets++;
          containers.push({ container: set, scopes: made.map((x) => x.comp) });
          const places: { inst: InstanceNode; o: Origin }[] = [];
          for (const x of made) {
            try { places.push({ inst: x.comp.createInstance(), o: x.o }); } catch (e) { failures.push(`인스턴스 실패(${x.variant}): ${errText(e)}`); }
          }
          restore(places); // 이 그룹 인스턴스 즉시 복원(중첩 보존)
        }

        // 속성 자동 노출 — 등록한 각 컴포넌트/세트의 직속 레이어를 Text/Instance-swap/Boolean 속성으로.
        let exposed = exposedEarly;
        for (const c of containers) {
          try { exposed += exposeProperties(c.container, c.scopes).length; } catch (e) { failures.push(`속성 노출 실패: ${errText(e)}`); }
        }

        post({ type: 'COMPONENTS_RESULT', registered, skipped, sets, singles, exposed, missing: [], failures });
        if (registered || sets) commitUndo(figma); // UX2
        break;
      }
      case 'CLASSIFY_VARIANTS': {
        if (!requireComponents()) break;
        // 「컴포넌트 등록」과 동일한 **정확한 이름 기준**으로 기존 컴포넌트를 다시 묶는다.
        // 선택의 COMPONENT 중 아직 세트에 안 속한 것만(멱등). 같은 이름 2개+ → 세트, 1개 → 단독.
        const comps = selection().filter(
          (n): n is ComponentNode => n.type === 'COMPONENT' && n.parent?.type !== 'COMPONENT_SET',
        );
        const byId = new Map(comps.map((c) => [c.id, c]));
        const groups = groupByExactName(comps.map(toStructNode));
        let sets = 0;
        const missing: string[] = [];
        const singles: string[] = [];
        const failures: string[] = [];
        const groupNames = resolveGroupNames(groups.map((g) => g.members)); // 등록과 동일 규칙
        for (let gi = 0; gi < groups.length; gi++) {
          const g = groups[gi];
          const nodes = g.members.map((m) => byId.get(m.id)).filter((n): n is ComponentNode => !!n);
          if (nodes.length < 2) {
            if (nodes[0]) singles.push(nodes[0].name);
            continue;
          }
          const variantById = new Map(deriveVariants(g.members).map((d) => [d.id, d.variant]));
          try {
            const parent = nodes[0].parent ?? figma.currentPage;
            const set = figma.combineAsVariants(nodes, parent);
            set.name = groupNames[gi];
            for (const m of g.members) {
              const node = byId.get(m.id);
              const v = variantById.get(m.id);
              if (node && v) node.name = v; // 'Prop=value, ...'
            }
            try { arrangeSet(set); } catch (e) { failures.push(`정렬 실패(${set.name}): ${errText(e)}`); }
            const childNames = set.children.filter((c): c is ComponentNode => c.type === 'COMPONENT').map((c) => c.name);
            const miss = missingVariants(childNames);
            if (miss.length) missing.push(`${set.name}: ${miss.join(' / ')}`);
            sets++;
          } catch (e) {
            failures.push(`결합 실패(${groupNames[gi]}): ${errText(e)}`);
          }
        }
        post({ type: 'VARIANTS_RESULT', sets, missing, singles, failures });
        if (sets) commitUndo(figma); // UX2
        break;
      }
      case 'GENERATE_MISSING_VARIANTS': {
        if (!requireComponents()) break;
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
      case 'GET_VARIABLES': {
        post({ type: 'VARIABLES', vars: await collectVars() });
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
          post({ type: 'EDIT_VARIABLE_RESULT', id: msg.id, ok: false, error: errText(e) });
        }
        break;
      }
      case 'GET_VARIABLE_USAGE': {
        // 읽기 전용 — 삭제/리네임 전에 "이걸 지우면 뭐가 깨지는지"를 먼저 보여준다.
        const { nodes, capped } = await collectBoundNodes(msg.id);
        const aliasedBy = findAliasReferers(msg.id, await collectVars());
        post({ type: 'VARIABLE_USAGE', id: msg.id, nodes, aliasedBy, capped });
        break;
      }
      case 'GENERATE_DARK_MODE': {
        // 다크 Global을 새로 만드는 작업이라 토큰 생성과 같은 등급으로 잠근다.
        if (!requirePaid('tokens', '다크 테마 생성은 Paid 기능입니다.')) break;
        const r = await generateDarkMode(msg.collectionId, msg.fromModeId, msg.toModeId);
        post({ type: 'DARK_MODE_RESULT', ...r });
        if (r.created || r.realiased) {
          commitUndo(figma); // UX2: 다크 생성 전체를 단일 Undo로
          await postPrereq();
        }
        post({ type: 'VARIABLES', vars: await collectVars() }); // 편집기 목록 갱신
        break;
      }
      case 'SCAN_SIMILAR': {
        // 미리보기(읽기 전용)는 Free — 선택 프레임을 정렬해 가변 위치·마스터 추천만 보여준다.
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
      case 'COMPONENTIZE_SIMILAR': {
        if (!requirePaid('components', '닮은 프레임 컴포넌트화는 Paid 기능입니다. 스캔·미리보기는 무료입니다.')) break;
        const master = await figma.getNodeByIdAsync(msg.masterId);
        if (!master || (master.type !== 'FRAME' && master.type !== 'GROUP')) {
          post({ type: 'COMPONENTIZE_RESULT', master: '', properties: 0, instances: 0, images: 0, warnings: ['마스터 프레임을 찾을 수 없습니다.'] });
          break;
        }
        // 멤버 노드 수집(마스터 포함) → 정렬·컴포넌트화·인스턴스 교체는 similarApply에 위임.
        const memberNodes: SceneNode[] = [];
        for (const id of msg.frameIds) {
          const n = await figma.getNodeByIdAsync(id);
          if (n && 'type' in n) memberNodes.push(n as SceneNode);
        }
        if (memberNodes.length < 2) {
          post({ type: 'COMPONENTIZE_RESULT', master: '', properties: 0, instances: 0, images: 0, warnings: ['대상 프레임이 2개 미만입니다. 다시 스캔하세요.'] });
          break;
        }
        const r = await componentizeSimilar(master as SceneNode, memberNodes);
        post({ type: 'COMPONENTIZE_RESULT', master: r.master, properties: r.properties, instances: r.instances, images: r.images, warnings: r.warnings });
        if (r.instances) commitUndo(figma); // UX2: 컴포넌트화 전체를 단일 Undo로
        break;
      }
    }
  } catch (err) {
    // UX7: 실패한 작업 종류(op)도 함께 보내 UI가 해당 영역에 친절한 메시지를 띄운다.
    post({ type: 'ERROR', message: err instanceof Error ? err.message : String(err), op: msg?.type });
  }
};
