/* ============================================================
   code.ts — 샌드박스 엔트리 & 메시지 라우터 (모든 figma.* 호출 지점)
   ============================================================ */
import type { UiToCode, CodeToUi, RenameChange, VarInfo, VarMode, CollectionRoleInfo, VarUpdateError } from './shared/messages';
import { post } from './shared/messages';
import { t } from './lib/i18n'; // 화면에 보이는 문구는 i18n 한 곳에서(PR 4) — 플러그인 쪽도 같은 표를 쓴다
import { extractFromSelection } from './lib/extract';
import { createTokens, previewCreateTokens, createUsageRoles, createSemanticAliases, scanTextStyles, scanExistingTextStyles, createSemanticTextStyles, applyExistingTextStyles, prunePaletteColors } from './lib/variables';
import { clusterTextStyles, nameTextStyles, nameTextStylesWithRowLabels } from './lib/textStyles';
import type { TextSample } from './lib/textStyles';
import { bindSelection, bindSelectedItems, countUsage, findUsers } from './lib/bind';
import { collectionTiers, readRoleMap, writeRoleMap } from './lib/collectionRoles';
import { assignRole, roleOfCollection, guessRole } from './lib/tiers';
import { renameSelection, writeRole, writeRoleFromName } from './lib/rename';
// ResolvedType·ScopeName은 변수 편집기(toValueCell)와 함께 걷혔다 — origin/main은 그 자리를
// 건드리지 않았으므로 import만 이쪽(삭제본)을 따른다.
import { rgbToHex, hexToRgb } from './lib/tokens';
import { pascalCase, ROLE_KEY, isKnownRole } from './lib/naming';
import { ExportToken, ExportTextStyle, TokenKind, exportTokens } from './lib/exporters';
import { tabInfo, highConfidenceComponentRole } from './lib/componentLike';
import { pickOwner } from './lib/usageRoles';
import { createIconRegistry, swapVectorSlots, transplantImageFills, applyInstancePropValues, propIdsByName, nodeAtPath, joinPath, shapePrefix, replaceMember, replaceMemberAsync, copyOverridesAsync, snapshotOverrides, restoreOverrides, type OverrideSnap } from './lib/artwork';
import { captureOrigin as captureOriginAt, fillOrigin, tallyFill, releaseOrigin, type Origin } from './lib/placement';
import { missingVariants, variantGrid, inferComponentProperties, inferVaryingComponentProperties, scanComponentCandidates, groupByExactName, deriveVariants, resolveGroupNames, componentEligible, pickCollapseMasterIndex, propValuesFromStruct, inferVaryingImageSlots, reusePlanFor, matchReuse, formatVariant, planRegisterGroups, resolvePlanNames, defaultOnFor, type PlanGroup, reusePairIssue, reusePairGrade, reuseKey, isHeadingCollapseGroup, REUSE_KEY, ICON_KEY } from './lib/components';
import type { CompPropType, StructNode, StructGroup, CompPropPlan, ReuseCandidate } from './lib/components';
import { scanSimilar, componentizeSimilar, componentizeResultMessage } from './lib/similarApply';
import { generateDarkMode } from './lib/themeApply';
import { Tier, Feature, isTier } from './lib/entitlements';
import { LicenseCache, LicenseStatus, evaluateLicense, cacheFromVerify, normalizeLicenseCache, isVerifyErrCode } from './lib/license';
import { PURCHASE_URL, PORTAL_URL } from './lib/licenseConfig';
import { commitUndo } from './lib/undo';
import { UI_SIZE_KEY, UI_WIDTH, normalizeUiSize, uiHeight, uiWidth } from './lib/uiSize';
import type { VarCell, VarCollection, VarRow, VarType, LibraryVar } from './lib/varTable';
import { sameCell } from './lib/varTable';

/* IA v3: 창은 400 × 510 고정, [—]로 최소화(140 × 104, 펼치기 버튼만). 높이 전환(660 ↔ 860)과 넓은 창(760)은 없앴다.
   최소화는 기억하지 않는다 — 다시 열면 늘 펼친 크기다. 긴 목록은 패널 body가 스크롤한다(#18). */
figma.showUI(__html__, { width: UI_WIDTH, height: uiHeight('default'), themeColors: true });
// 예전 높이 전환이 남긴 저장값('large')은 더 이상 쓰지 않는다 — 지워 둔다.
figma.clientStorage.deleteAsync(UI_SIZE_KEY).catch(() => {});

const selection = () => figma.currentPage.selection;

/* ---------- 라이선스/티어 ----------
   M1: 개발용 강제 티어 토글 · M2: 외부 키 캐시/grace · M2.1: 서명(JWT) 검증 ·
   M2.2: 네트워크+서명 검증은 UI 아이프레임(WebCrypto 가용)에서 수행하고
   결과(LICENSE_VERIFIED)만 받아 캐시·적용한다. 여기서는 fetch/crypto를 직접 하지 않는다. */
const DEV_TIER_KEY = 'dsl.devTier';
const CACHE_KEY = 'dsl.licenseCache';
// #19: 기준 크기·리네임 맥락 깊이는 설정 탭에서만 바꾸고 이 파일에 기억한다(입력을 단계에 두지 않으므로).
const SETTINGS_KEY = 'dsl.settings';
// grid=만들기가 값을 맞추는 간격. 허용오차는 없앴다(IA v3 §4.8, 2026-11-03) — 연결은 언제나
// "같은 값"만 찾는다. 예전 버전이 저장한 `tolerance` 필드는 읽지도 쓰지도 않는다.
const SETTINGS_DEFAULT = { base: 16, maxDepth: 8, grid: 8 };

let devTier: Tier = 'free'; // 개발용 강제 티어(검증 키가 없을 때만 적용)
let cache: LicenseCache | null = null; // 검증된 라이선스 캐시(우선)
let bindCancel = false; // UX6: 진행 중 바인딩 취소 플래그
// 마지막 스캔의 원본 표본 — 「왼쪽 글자로 이름 채우기」가 다시 훑지 않고 이름만 다시 매기게 한다.
// 다시 훑으면 그 사이 선택이 바뀐 경우 표에 보이는 것과 다른 결과가 조용히 나온다.
let lastTextSamples: TextSample[] = [];

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
function requirePaid(feature: Feature): boolean {
  if (isPaid()) return true;
  post({ type: 'PREMIUM_REQUIRED', feature });
  return false;
}

interface LicenseNote { text: string; kind: 'ok' | 'warn'; tip?: string }

function postLicense(note?: LicenseNote): void {
  const e = effective();
  post({
    type: 'LICENSE_STATUS',
    tier: e.tier,
    unlimited: e.tier === 'paid', // Free/Paid 2티어 — 유료면 모든 기능 해금
    source: e.source,
    status: e.status,
    expiresAt: e.expiresAt,
    note: note?.text,
    noteKind: note?.kind,
    noteTip: note?.tip,
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
    // 계층은 컬렉션 이름이 아니라 지정된 역할로(Primitives→Global 등, tiers.ts).
    const tiers = collectionTiers(cols);
    const globalIds = new Set(cols.filter((c) => tiers.get(c.id) === 1).map((c) => c.id));
    // 거울 폐지 후 바인딩 대상은 3계층 전부 — 역할 없는 값은 Global에 붙는다(bind.ts).
    const bindableIds = new Set(cols.filter((c) => (tiers.get(c.id) ?? 0) > 0).map((c) => c.id));
    const vars = await figma.variables.getLocalVariablesAsync();
    const globals = vars.filter((v) => globalIds.has(v.variableCollectionId));
    const hasColorVars = globals.some((v) => v.resolvedType === 'COLOR');
    const hasScaleVars = globals.some((v) => v.resolvedType !== 'COLOR'); // 간격·크기·폰트
    const hasGlobal = globals.length > 0;
    const hasBindable = vars.some((v) => bindableIds.has(v.variableCollectionId));
    // 다크는 '모드가 둘 이상인 **바인딩 대상** 컬렉션'이 있으면 이미 만든 것으로 본다.
    // 문서 전체로 보면 Breakpoint(Desktop/Mobile) 같은 무관한 컬렉션 하나가 다크 단계를
    // 「완료」로 만들어, 다크 테마가 없는 파일에서 사용자가 그 단계를 건너뛴다.
    const semanticIds = new Set(cols.filter((c) => (tiers.get(c.id) ?? 0) >= 2).map((c) => c.id));
    const hasDarkMode = cols.some((c) => semanticIds.has(c.id) && c.modes.length > 1);
    const hasTextStyles = (await figma.getLocalTextStylesAsync()).length > 0; // 타이포 단계 「기존만 연결」 전제
    const hasSemanticRoles = vars.some((v) => semanticIds.has(v.variableCollectionId)); // 역할 별칭 존재 = 역할 매핑 완료
    // '이미 변수가 있다'를 먼저 알리는 안내용 개수 — 계층 안/밖을 나눠 센다(밖이면 연결에 못 쓴다).
    const tierVarList = vars.filter((v) => bindableIds.has(v.variableCollectionId));
    const tierVars = tierVarList.length;
    const tierColorVars = tierVarList.filter((v) => v.resolvedType === 'COLOR').length;
    const otherVars = vars.length - tierVars;
    post({ type: 'PREREQ_STATE', hasColorVars, hasScaleVars, hasGlobal, hasBindable, hasDarkMode, hasTextStyles, hasSemanticRoles, tierVars, tierColorVars, otherVars });
  } catch {
    /* 저장소 접근 실패 시 보고 생략(UI는 마지막 상태 유지) */
  }
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

/* ---------- 변수 목록(다크 테마 생성의 컬렉션·모드 선택용) ---------- */

// 3계층(이름 또는 지정된 역할)만 목록 대상 — 계층이 아닌 컬렉션은 다루지 않는다.
function toVarInfo(v: Variable, col: VariableCollection, tier: number): VarInfo {
  const modes: VarMode[] = col.modes.map((m) => ({ modeId: m.modeId, name: m.name }));
  return { id: v.id, name: v.name, collectionId: col.id, collection: col.name, tier, modes };
}

/** 설정 탭 '컬렉션 계층' 목록 — 로컬 컬렉션 전부(계층 아닌 것도 지정할 수 있게). */
async function collectionRoleInfos(): Promise<CollectionRoleInfo[]> {
  const cols = await figma.variables.getLocalVariableCollectionsAsync();
  const map = readRoleMap();
  const count = new Map<string, number>();
  for (const v of await figma.variables.getLocalVariablesAsync()) count.set(v.variableCollectionId, (count.get(v.variableCollectionId) ?? 0) + 1);
  return cols.map((c) => ({ id: c.id, name: c.name, vars: count.get(c.id) ?? 0, set: map[c.id] ?? null, role: roleOfCollection(c, map), guess: guessRole(c.name) }));
}

/**
 * 변수 표의 값 한 칸 — 변수 표를 만들 때와 고치기의 base 비교(§4.4 고치기 2단계)가 같은 변환을 쓴다.
 * 색은 #RRGGBB(6자리) + 투명도(1/255 단위 반올림, 1이면 생략). 숫자는 소수 셋째 자리 반올림 글자.
 * aliasInfo: 별칭 대상의 이름(로컬이 아니면 remote, 못 읽으면 name null = 삭제된 변수).
 */
function tableCell(raw: VariableValue | undefined, aliasInfo: (id: string) => { name: string | null; remote: boolean }): VarCell | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw === 'object' && 'type' in raw && (raw as VariableAlias).type === 'VARIABLE_ALIAS') {
    const id = (raw as VariableAlias).id;
    const info = aliasInfo(id);
    if (info.name !== null && !info.remote) return { kind: 'alias', aliasId: id, aliasName: info.name };
    return { kind: 'alias', aliasId: id, aliasName: info.name ?? t('edit.deletedTarget'), remote: info.name ? true : undefined };
  }
  if (typeof raw === 'object' && 'r' in raw) {
    const a = 'a' in raw && typeof (raw as RGBA).a === 'number' ? Math.round((raw as RGBA).a * 255) / 255 : 1;
    return a < 1 ? { kind: 'color', hex: rgbToHex(raw as RGB), alpha: a } : { kind: 'color', hex: rgbToHex(raw as RGB) };
  }
  if (typeof raw === 'number') return { kind: 'number', text: String(Math.round(raw * 1000) / 1000) };
  if (typeof raw === 'boolean') return { kind: 'bool', text: raw ? 'true' : 'false' };
  return { kind: 'string', text: String(raw) };
}

/** 변수 관리 표 — 로컬 컬렉션·변수 전부(계층 아닌 것도 — 관리 대상은 파일의 변수 전체다). */
async function collectVarTable(): Promise<{ collections: VarCollection[]; vars: VarRow[] }> {
  const cols = await figma.variables.getLocalVariableCollectionsAsync();
  const tiers = collectionTiers(cols);
  const all = await figma.variables.getLocalVariablesAsync();
  const nameById = new Map(all.map((v) => [v.id, v.name]));
  const colById = new Map(cols.map((c) => [c.id, c]));
  // 로컬에 없는 별칭 대상은 라이브러리 변수일 수 있다 — 이름을 실제로 읽는다(§12.1, 91/91 검증).
  const remoteName = new Map<string, string | null>();
  for (const v of all) {
    for (const raw of Object.values(v.valuesByMode)) {
      if (raw && typeof raw === 'object' && 'type' in raw && (raw as VariableAlias).type === 'VARIABLE_ALIAS') {
        const id = (raw as VariableAlias).id;
        if (nameById.has(id) || remoteName.has(id)) continue;
        const rv = await figma.variables.getVariableByIdAsync(id).catch(() => null);
        remoteName.set(id, rv ? rv.name : null);
      }
    }
  }
  const cell = (raw: VariableValue | undefined): VarCell | undefined =>
    tableCell(raw, (id) => {
      const local = nameById.get(id);
      if (local !== undefined) return { name: local, remote: false };
      const rn = remoteName.get(id);
      return { name: rn ?? null, remote: !!rn };
    });
  const vars: VarRow[] = [];
  for (const v of all) {
    const col = colById.get(v.variableCollectionId);
    if (!col) continue;
    const values: Record<string, VarCell> = {};
    for (const m of col.modes) {
      const c = cell(v.valuesByMode[m.modeId]);
      if (c) values[m.modeId] = c;
    }
    vars.push({ id: v.id, name: v.name, collectionId: col.id, type: v.resolvedType as VarType, values, scopes: [...(v.scopes ?? [])], description: v.description ?? '' });
  }
  const roleMap = readRoleMap();
  const collections: VarCollection[] = cols.map((c) => ({
    id: c.id,
    name: c.name,
    tier: tiers.get(c.id) ?? 0,
    modes: c.modes.map((m) => ({ modeId: m.modeId, name: m.name })),
    defaultModeId: c.defaultModeId,
    tierSet: roleMap[c.id] ?? null,
  }));
  return { collections, vars };
}

/** 목록 기준 노드 id → 지금 있는 노드(지워진 것은 뺀다). 비었으면 지금 선택. */
async function resolveRoots(nodeIds: readonly string[] | undefined): Promise<SceneNode[]> {
  if (!nodeIds || !nodeIds.length) return selection().slice();
  const out: SceneNode[] = [];
  for (const id of nodeIds) {
    const n = await figma.getNodeByIdAsync(id).catch(() => null);
    if (n && n.type !== 'PAGE' && n.type !== 'DOCUMENT' && (n as SceneNode).parent) out.push(n as SceneNode);
  }
  return out;
}

/** 값 한 칸(라이브러리 변수용 · 고치기 base 비교) — 별칭이면 대상을 읽는다. 변수 표와 같은 변환(tableCell). */
async function libCell(raw: VariableValue | undefined): Promise<VarCell | undefined> {
  let info: { name: string | null; remote: boolean } = { name: null, remote: false };
  if (raw && typeof raw === 'object' && 'type' in raw && (raw as VariableAlias).type === 'VARIABLE_ALIAS') {
    const t = await figma.variables.getVariableByIdAsync((raw as VariableAlias).id).catch(() => null);
    info = { name: t ? t.name : null, remote: !!t?.remote };
  }
  return tableCell(raw, () => info);
}

/**
 * 변수 고치기(§4.4 고치기 · PR 3.5) — 1 변수 확인 → 2 base 비교(변수 표와 같은 변환) → 3 이름 → 값(첫 실패에서 멈춤)
 * → 4 하나라도 바꿨으면 commitUndo → 5 VARIABLE_UPDATED. 변수 표는 보내지 않는다(UI가 다시 읽는다).
 */
async function updateVariable(msg: Extract<UiToCode, { type: 'UPDATE_VARIABLE' }>): Promise<void> {
  const done = (applied: string[], error?: VarUpdateError): void => {
    if (applied.length) commitUndo(figma);
    post({ type: 'VARIABLE_UPDATED', reqId: msg.reqId, ok: !error, applied, error });
  };
  const v = await figma.variables.getVariableByIdAsync(msg.id).catch(() => null);
  if (!v || v.remote) return done([], { code: 'deleted' });
  // 2 — 지금 이름과 고친 모드의 값이 base와 같아야 한다(팝업이 열린 동안 피그마에서 바뀐 것은 저장할 때 알린다).
  if (v.name !== msg.base.name) return done([], { code: 'conflict' });
  for (const [modeId, b] of Object.entries(msg.base.values)) {
    const now = await libCell(v.valuesByMode[modeId]);
    if (!sameCell(now, b)) return done([], { code: 'conflict' });
  }
  // 3 — 이름 → 값. 중간에 실패하면 멈추고 이미 바뀐 것과 사유를 돌려준다.
  const applied: string[] = [];
  if (msg.name !== undefined && msg.name !== v.name) {
    try {
      v.name = msg.name;
      applied.push('name');
    } catch (e) {
      return done(applied, { code: 'name', message: errText(e) });
    }
  }
  for (const [modeId, ev] of Object.entries(msg.values ?? {})) {
    try {
      let value: VariableValue;
      if (ev.kind === 'color') value = { ...hexToRgb(ev.hex), a: Math.max(0, Math.min(1, ev.alpha)) };
      else if (ev.kind === 'number') value = ev.value;
      else if (ev.kind === 'string') value = ev.text;
      else if (ev.kind === 'bool') value = ev.value;
      else {
        const target = await figma.variables.getVariableByIdAsync(ev.targetId).catch(() => null);
        if (!target) throw new Error('alias target not found');
        value = figma.variables.createVariableAlias(target);
      }
      v.setValueForMode(modeId, value);
      applied.push(modeId);
    } catch (e) {
      return done(applied, { code: 'value', modeId, message: errText(e) });
    }
  }
  done(applied);
}

/**
 * 변수 사용 조회(IA v3 §4.4) — 로컬이 아닌 id를 라이브러리 / 삭제됨으로 가른다.
 * 라이브러리 변수는 별칭 사슬을 5단계까지 따라가 함께 돌려준다(간접 사용 판정용).
 */
async function collectUsage(nodeIds: readonly string[] | undefined): Promise<Omit<Extract<CodeToUi, { type: 'USAGE_RESULT' }>, 'type' | 'reqId'>> {
  const roots = await resolveRoots(nodeIds);
  const { usage, nodesById, scanned } = countUsage(roots);
  const local = new Set((await figma.variables.getLocalVariablesAsync()).map((v) => v.id));
  const out: Record<string, { places: number; layers: number }> = {};
  const libraryVars: LibraryVar[] = [];
  const libSeen = new Set<string>();
  let deletedCount = 0;
  const deletedNodes = new Set<string>();
  const addLibrary = async (id: string, depth: number): Promise<boolean> => {
    if (libSeen.has(id)) return true;
    const v = await figma.variables.getVariableByIdAsync(id).catch(() => null);
    if (!v) return false;
    libSeen.add(id);
    const col = await figma.variables.getVariableCollectionByIdAsync(v.variableCollectionId).catch(() => null);
    const modeId = col?.defaultModeId ?? Object.keys(v.valuesByMode)[0];
    const aliasTargets: string[] = [];
    for (const raw of Object.values(v.valuesByMode)) {
      if (raw && typeof raw === 'object' && 'type' in raw && (raw as VariableAlias).type === 'VARIABLE_ALIAS') aliasTargets.push((raw as VariableAlias).id);
    }
    libraryVars.push({ id: v.id, name: v.name, collection: col?.name ?? '', type: v.resolvedType as VarType, value: await libCell(modeId ? v.valuesByMode[modeId] : undefined), aliasTargets });
    if (depth < 5) for (const t of aliasTargets) if (!local.has(t)) await addLibrary(t, depth + 1);
    return true;
  };
  for (const [id, u] of usage) {
    if (local.has(id)) { out[id] = u; continue; }
    if (await addLibrary(id, 1)) { out[id] = u; continue; }
    deletedCount += u.places;
    for (const n of nodesById.get(id) ?? []) deletedNodes.add(n);
  }
  // 로컬 변수가 가리키는 라이브러리 변수도 간접 사용 판정에 필요하다 — 직접 쓰는 로컬 변수의 별칭 사슬.
  const localVars = await figma.variables.getLocalVariablesAsync();
  for (const v of localVars) {
    if (!out[v.id]) continue;
    for (const raw of Object.values(v.valuesByMode)) {
      if (raw && typeof raw === 'object' && 'type' in raw && (raw as VariableAlias).type === 'VARIABLE_ALIAS') {
        const t = (raw as VariableAlias).id;
        if (!local.has(t)) await addLibrary(t, 2);
      }
    }
  }
  return { usage: out, libraryVars, deleted: { count: deletedCount, nodeIds: [...deletedNodes] }, scanned };
}

async function collectVars(): Promise<VarInfo[]> {
  const cols = await figma.variables.getLocalVariableCollectionsAsync();
  const colById = new Map(cols.map((c) => [c.id, c]));
  const tiers = collectionTiers(cols);
  const vars = await figma.variables.getLocalVariablesAsync();
  const out: VarInfo[] = [];
  for (const v of vars) {
    const col = colById.get(v.variableCollectionId);
    const tier = col ? tiers.get(col.id) ?? 0 : 0;
    if (!col || !tier) continue;
    out.push(toVarInfo(v, col, tier));
  }
  out.sort((a, b) => a.collection.localeCompare(b.collection) || a.name.localeCompare(b.name));
  return out;
}

/** 노드가 속한 페이지(없으면 null) — 부모를 PAGE까지 거슬러 올라간다. */
function pageOf(node: BaseNode): PageNode | null {
  let n: BaseNode | null = node;
  while (n && n.type !== 'PAGE') n = n.parent;
  return n && n.type === 'PAGE' ? n : null;
}

/** Paid 게이트(컴포넌트/베리언트): 아니면 PREMIUM_REQUIRED 안내 후 false. */
function requireComponents(): boolean {
  return requirePaid('components');
}

/** Paid 게이트(텍스트 스타일): 아니면 PREMIUM_REQUIRED 안내 후 false. */
function requireTextStyles(): boolean {
  return requirePaid('textStyles');
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
/** 노드 필드 또는 fills/strokes/effects 페인트에 변수 바인딩이 하나라도 있는가. */
function hasAnyBinding(n: SceneNode): boolean {
  const bv = (n as { boundVariables?: Record<string, unknown> }).boundVariables;
  if (bv && Object.keys(bv).length) return true;
  for (const key of ['fills', 'strokes'] as const) {
    const ps = (n as unknown as Record<string, unknown>)[key];
    if (Array.isArray(ps) && ps.some((p) => !!(p as { boundVariables?: { color?: unknown } }).boundVariables?.color)) return true;
  }
  return false;
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
  let bound = 0; // 변수가 하나라도 붙은 레이어(준비 현황 '변수 연결 완료')
  let renamed = 0; // 이름 정리가 역할을 기록한 레이어(준비 현황 '이름 정리 완료')
  let capped = false;
  // 베리언트 분류·누락 조합 생성이 실제로 잡는 것과 같은 기준(최상위 선택만).
  // 분류는 세트에 안 속한 낱개 COMPONENT를, 생성은 COMPONENT_SET을 대상으로 한다.
  const comps = sel.filter((n) => n.type === 'COMPONENT' && n.parent?.type !== 'COMPONENT_SET').length;
  const sets = sel.filter((n) => n.type === 'COMPONENT_SET').length;
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
    if (hasAnyBinding(n)) bound++;
    if (readRole(n)) renamed++;
    if (n.type === 'INSTANCE') continue; // 인스턴스 내부는 바인딩 대상이 아니다
    if ('children' in n) for (const c of (n as SceneNode & ChildrenMixin).children) stack.push(c as SceneNode);
  }
  // 선택 표시줄 문구(§4.1)와 목록 기준 비교(PR 2)용 — 첫 레이어 이름과 선택 노드 ID.
  const firstName = sel[0]?.name ?? '';
  const ids = sel.map((n) => n.id);
  post({ type: 'SELECTION_STATE', count: sel.length, scanned, bindable, capped, comps, sets, selfSelect, bound, renamed, firstName, ids });
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

/**
 * 문서에 이미 있는 컴포넌트·세트 이름 — 이름 충돌 해소가 지난 실행분까지 보게 한다.
 * 실패하면 빈 목록(충돌 해소가 이번 묶음 안에서만 되는, 예전 동작으로 안전하게 후퇴).
 *
 * **이번에 이름을 정할 노드는 반드시 빼야 한다**(`exclude`) — 「베리언트 분류」의 대상은
 * 이미 문서에 있는 COMPONENT라, 안 빼면 자기 이름과 충돌한 것으로 읽혀 `Button` → `Button2`가
 * 되고 다시 누를 때마다 숫자가 올라간다.
 */
async function existingComponentNames(exclude?: ReadonlySet<string>): Promise<string[]> {
  try {
    await figma.loadAllPagesAsync();
    return figma.root
      .findAllWithCriteria({ types: ['COMPONENT', 'COMPONENT_SET'] })
      .filter((n) => !exclude?.has(n.id))
      .map((n) => n.name);
  } catch {
    return [];
  }
}

/** 페인트 배열 → 판정에 필요한 필드만. figma.mixed(symbol)는 그대로 넘겨 판정이 구분하게 둔다. */
function paintsOf(v: unknown): readonly { visible?: boolean; type?: string; opacity?: number }[] | symbol | undefined {
  if (typeof v === 'symbol') return v; // figma.mixed
  if (!Array.isArray(v)) return undefined;
  return (v as readonly { visible?: boolean; type?: string; opacity?: number }[]).map((p) => ({
    visible: p.visible,
    type: p.type,
    opacity: p.opacity,
  }));
}

/** 첫 visible IMAGE 채움의 해시. 이미지가 없으면 undefined(= 사진 슬롯이 아님). */
function imageHashOf(node: SceneNode): string | undefined {
  const fills = (node as { fills?: unknown }).fills;
  if (!Array.isArray(fills)) return undefined;
  const img = fills.find((p) => (p as Paint).type === 'IMAGE' && (p as Paint).visible !== false) as ImagePaint | undefined;
  if (!img) return undefined;
  return img.imageHash ?? '';
}

/** 문자열 지문(FNV-1a 32bit) — 경로 데이터를 그대로 트리에 싣지 않으려고 해시로 줄인다. */
function fnv1a(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36);
}

/** 벡터류 도형의 그림 지문 — fill/stroke geometry의 경로 데이터. 도형이 아니면 undefined. */
function vectorKeyOf(node: SceneNode): string | undefined {
  if (!VECTOR_TYPES.has(node.type)) return undefined;
  try {
    const g = node as unknown as { fillGeometry?: readonly { data?: string }[]; strokeGeometry?: readonly { data?: string }[] };
    const parts: string[] = [];
    for (const p of g.fillGeometry ?? []) parts.push(p.data ?? '');
    for (const p of g.strokeGeometry ?? []) parts.push(p.data ?? '');
    // 기하를 못 읽으면 크기라도 지문에 넣는다 — 빈 문자열끼리 같다고 보면 다른 그림이 합쳐진다.
    return parts.length ? fnv1a(parts.join('|')) : `?${Math.round((node as LayoutMixin).width)}x${Math.round((node as LayoutMixin).height)}`;
  } catch {
    return undefined;
  }
}

const VECTOR_TYPES = new Set(['VECTOR', 'BOOLEAN_OPERATION', 'STAR', 'POLYGON', 'LINE']);

/**
 * 아이콘 프레임의 아이콘 지문(§4.7 "묶기" 3번). 아이콘 프레임이 아니면 undefined.
 * 아이콘 프레임 = FRAME · GROUP, 가로 · 세로 96 이하, 자손에 벡터 1개 이상, 자손이 벡터 · ELLIPSE · RECTANGLE과
 * 그것을 담은 GROUP · FRAME뿐(TEXT · 이미지 채움 · 인스턴스 없음).
 * 지문 = 프레임 자신의 (가로 · 세로 · 채움) + 자손마다 순서대로 (타입 · 벡터면 그림 지문, 아니면 가로 · 세로) · 채움.
 */
function iconFrameKeyOf(node: SceneNode): string | undefined {
  if (node.type !== 'FRAME' && node.type !== 'GROUP') return undefined;
  const size = (n: SceneNode): string => `${Math.round((n as LayoutMixin).width * 100) / 100}x${Math.round((n as LayoutMixin).height * 100) / 100}`;
  if ((node as LayoutMixin).width > 96 || (node as LayoutMixin).height > 96) return undefined;
  if (imageHashOf(node) !== undefined) return undefined;
  const parts: string[] = [`${size(node)}:${solidFillHex(node) ?? ''}`];
  let vectors = 0;
  const walk = (n: SceneNode): boolean => {
    const kids = 'children' in n ? (n.children as readonly SceneNode[]) : [];
    for (const c of kids) {
      if (imageHashOf(c) !== undefined) return false;
      if (VECTOR_TYPES.has(c.type)) {
        vectors++;
        parts.push(`${c.type}:${vectorKeyOf(c) ?? ''}:${solidFillHex(c) ?? ''}`);
      } else if (c.type === 'ELLIPSE' || c.type === 'RECTANGLE') {
        parts.push(`${c.type}:${size(c)}:${solidFillHex(c) ?? ''}`);
      } else if (c.type === 'GROUP' || c.type === 'FRAME') {
        parts.push(`${c.type}:${size(c)}:${solidFillHex(c) ?? ''}[`);
        if (!walk(c)) return false;
        parts.push(']');
      } else {
        return false; // TEXT · INSTANCE · 그 밖
      }
    }
    return true;
  };
  if (!walk(node) || vectors === 0) return undefined;
  return `f:${fnv1a(parts.join('|'))}`;
}

/** 그림 지문 — 날 벡터는 경로 지문, 아이콘 프레임은 아이콘 지문(아이콘 등록부 · 값 옮기기가 쓴다). */
function artKeyOf(node: SceneNode): string | undefined {
  return vectorKeyOf(node) ?? iconFrameKeyOf(node);
}

/**
 * figma 노드 → 구조 비교용 StructNode(재귀). 여백·크기·대표 색·텍스트/스왑·역할을 읽어 순수 그룹화에 넘김.
 * 루트가 아닌 아이콘 프레임은 자식을 비우고 `vectorKey`에 아이콘 지문을 실어 그림 하나로 넘긴다(§4.7 "묶기" 3번).
 */
function toStructNode(node: SceneNode, isRoot = true): StructNode {
  const a = node as unknown as Record<string, unknown>;
  const num = (v: unknown): number | undefined => (typeof v === 'number' ? v : undefined);
  const kids = 'children' in node ? (node.children as readonly SceneNode[]) : [];
  let characters: string | undefined;
  let mainComponentKey: string | null | undefined;
  if (node.type === 'TEXT') {
    try { characters = node.characters; } catch { characters = ''; }
  }
  const iconKey = isRoot ? undefined : iconFrameKeyOf(node);
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
    imageHash: imageHashOf(node),
    vectorKey: vectorKeyOf(node),
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
    // 고신뢰 역할 판정(카드·figure·button…)이 읽는 값들 — 여기서 빼면 `componentEligible`이
    // 채움도 모서리도 그림자도 없는 노드를 보게 되어 카드형 프레임이 후보에서 통째로 사라진다.
    // 페인트/이펙트는 판정에 필요한 필드만 얕게 복사한다(원본 배열은 트리 전체로 무겁다).
    cornerRadius: a.cornerRadius as number | symbol | undefined,
    topLeftRadius: num(a.topLeftRadius),
    opacity: num(a.opacity),
    gridRowCount: num(a.gridRowCount),
    gridColumnCount: num(a.gridColumnCount),
    fills: paintsOf(a.fills),
    strokes: paintsOf(a.strokes),
    effects: Array.isArray(a.effects)
      ? (a.effects as readonly { visible?: boolean; type?: string }[]).map((e) => ({ visible: e.visible, type: e.type }))
      : undefined,
    characters,
    mainComponentKey,
    role: readRole(node),
    ...(iconKey ? { iconFrame: true, vectorKey: iconKey } : {}),
    // INSTANCE 안은 자식 컴포넌트 소관 — 접힘 비교·속성 노출과 동일하게 펼치지 않음. 아이콘 프레임도 그림 하나.
    children: node.type === 'INSTANCE' || iconKey ? [] : kids.map((k) => toStructNode(k, false)),
  };
}

/**
 * 쓰임 이름의 주인(§2.12 12.3) — ① 이름 정리 역할(`dsRole`, 어휘 안 · 구조 폴백 아님) ② 고신뢰 판정 ③ 없음.
 * 고신뢰 판정 입력(StructNode)은 처음 물을 때 선택 루트마다 한 번 만든다.
 */
function bindOwnerOf(roots: readonly SceneNode[]): (node: SceneNode) => string | undefined {
  let idx: Map<string, StructNode> | null = null;
  return (node) => {
    const role = readRole(node);
    idx ??= structIndex(roots);
    const s = idx.get(node.id);
    return pickOwner(role, s ? highConfidenceComponentRole(s) : null, isKnownRole);
  };
}

/** 선택 루트마다 StructNode를 한 번 만들고 노드 id로 찾는다(§4.7 "묶기" — 하위마다 새로 만들지 않는다). */
function structIndex(roots: readonly SceneNode[]): Map<string, StructNode> {
  const out = new Map<string, StructNode>();
  const add = (n: StructNode): void => { out.set(n.id, n); for (const c of n.children ?? []) add(c); };
  for (const r of roots) add(toStructNode(r));
  return out;
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

/** StructNode 트리에서 인덱스 경로의 그림 지문(`vectorKey`)을 읽는다. 없으면 null. */
function structAtPathVectorKey(root: StructNode, path: string): string | null {
  let cur: StructNode | undefined = root;
  for (const seg of path.split('/').filter(Boolean)) {
    const kids: readonly StructNode[] = cur?.children ?? [];
    cur = kids[Number(seg)];
    if (!cur) return null;
  }
  return cur?.vectorKey ?? null;
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

/**
 * 등록/스캔 공통: 실효 보임 + componentEligible. 판정은 StructNode로 한다(§4.7 "묶기" — 탭 판정이 글자 · 색을 읽는다).
 * `index`(선택 루트마다 한 번 만든 StructNode)에 있으면 그것을, 없으면 그 노드만 새로 만든다.
 */
function sceneComponentEligible(n: SceneNode, index?: ReadonlyMap<string, StructNode>): boolean {
  if (!isEffectivelyVisible(n)) return false;
  return componentEligible(index?.get(n.id) ?? toStructNode(n));
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
 * 등록용 묶기 계획(§4.7 "묶기") — 이름 그룹 · 탭 그룹 → 구조 가족 → 소가족. 같은 그룹 안의 조상 · 자손은 자손만 남긴다.
 * SCAN 미리보기와 REGISTER가 **동일 규칙**을 쓰도록 한 곳에 둔다. 멤버 StructNode는 멤버마다 루트로 만든다
 * (루트 자신은 아이콘 프레임으로 접지 않는다 — 아이콘 멤버의 그림 차를 속성으로 담기 위해).
 */
function groupForRegister(nodes: readonly SceneNode[], index?: ReadonlyMap<string, StructNode>): PlanGroup[] {
  // 후보는 아이콘 프레임이 아니므로(3번) 선택 루트로 만든 StructNode를 그대로 써도 루트로 만든 것과 같다.
  const structs = nodes.map((n) => index?.get(n.id) ?? toStructNode(n));
  const desc = new Map<string, Set<string>>();
  const descOf = (a: StructNode): Set<string> => {
    let d = desc.get(a.id);
    if (!d) {
      d = new Set<string>();
      const walk = (n: StructNode): void => { for (const c of n.children ?? []) { d!.add(c.id); walk(c); } };
      walk(a);
      desc.set(a.id, d);
    }
    return d;
  };
  return planRegisterGroups(structs, (a, b) => descOf(a).has(b.id));
}

/**
 * **내부(자손) 그룹 먼저** — 위상 정렬. 내부 반복이 먼저 세트/인스턴스가 된 뒤 바깥을 컴포넌트화해야
 * 중첩이 보존된다. "다른 남은 그룹을 자기 안에 포함하지 않는(=가장 안쪽인) 그룹"부터 출력한다.
 * 깊이만으로 정렬하면 한 그룹의 멤버가 여러 깊이에 걸칠 때 어긋날 수 있어, 실제 포함관계로 정렬한다.
 * 사이클(이론상)·동순위는 문서 깊이 내림차순으로 폴백.
 */
function orderInnerFirst<G extends StructGroup>(groups: readonly G[], byId: Map<string, SceneNode>): G[] {
  const liveOf = (g: G): SceneNode[] => g.members.map((m) => byId.get(m.id)).filter((n): n is SceneNode => !!n);
  const docDepth = (n: SceneNode): number => {
    let d = 0;
    let p: BaseNode | null = n.parent;
    while (p && p.type !== 'PAGE' && p.type !== 'DOCUMENT') { d++; p = p.parent; }
    return d;
  };
  const groupDepth = (g: G): number => Math.max(0, ...liveOf(g).map(docDepth));
  // x가 남은 다른 그룹 y를 자기 안에 포함하면(=y가 x보다 안쪽) x는 아직 출력 불가.
  const containsRemaining = (x: G, rest: readonly G[]): boolean =>
    rest.some((y) => y !== x && liveOf(y).some((b) => liveOf(x).some((a) => a.id !== b.id && isAncestorOf(a, b))));
  const remaining = [...groups].sort((a, b) => groupDepth(b) - groupDepth(a)); // 깊이 폴백(사이클/동순위)
  const out: G[] = [];
  while (remaining.length) {
    let idx = remaining.findIndex((x) => !containsRemaining(x, remaining));
    if (idx < 0) idx = 0; // 사이클 폴백: 가장 깊은 것
    out.push(remaining.splice(idx, 1)[0]);
  }
  return out;
}

/* ---------- [등록] 재사용 (§4.7 "재사용", 2026-11-05 결정 A) ---------- */

/** 재사용할 그룹 — 멤버마다 쓸 기존 컴포넌트(멤버 순서), 결과 줄 이름(세트면 세트 이름), 트리에 보일 이름(멤버마다). */
type ReuseHit = { comps: ComponentNode[]; name: string; shown: string[]; iconIds: Set<string>[] };

/** 기존 컴포넌트를 찾을 앞붙이 — 감싼 도형이면 그 자식부터(§4.7 "인스턴스 자리" 8번 "경로 맞추기"). */
function reuseRootOf(comp: ComponentNode, memberType: string): { root: SceneNode; prefix: string } {
  const prefix = shapePrefix(comp, memberType);
  return { root: (prefix ? nodeAtPath(comp, prefix) : null) ?? comp, prefix };
}

/** B 안 인스턴스(인스턴스 안은 내려가지 않는다) 중 메인이 아이콘 컴포넌트(`dsl.icon`)인 것의 id — 동기 메인 읽기는 dynamic-page에서 비어 있을 수 있다. */
async function iconInstanceIds(root: SceneNode): Promise<Set<string>> {
  const out = new Set<string>();
  const walk = async (n: SceneNode): Promise<void> => {
    if (n !== root && n.type === 'INSTANCE') {
      try {
        const main = await n.getMainComponentAsync();
        if (main && main.getPluginData(ICON_KEY)) out.add(n.id);
      } catch { /* 메인을 못 구하면 아이콘이 아니라고 본다 */ }
      return;
    }
    if ('children' in n) for (const c of n.children as readonly SceneNode[]) await walk(c);
  };
  await walk(root);
  return out;
}

/** 실효 숨김이 아닌, 재사용 키가 있는 로컬 COMPONENT(모든 페이지). `exclude`는 이번 대상 자신. */
async function reuseCandidates(exclude: ReadonlySet<string>): Promise<{ list: ReuseCandidate[]; byId: Map<string, ComponentNode> }> {
  const byId = new Map<string, ComponentNode>();
  const list: ReuseCandidate[] = [];
  try {
    await figma.loadAllPagesAsync();
    const comps = figma.root.findAllWithCriteria({ types: ['COMPONENT'], pluginData: { keys: [REUSE_KEY] } });
    for (const c of comps) {
      if (exclude.has(c.id) || !isEffectivelyVisible(c)) continue;
      const key = c.getPluginData(REUSE_KEY);
      if (!key) continue;
      byId.set(c.id, c);
      list.push({ id: c.id, key, setId: c.parent?.type === 'COMPONENT_SET' ? c.parent.id : null });
    }
  } catch { /* 못 찾으면 재사용하지 않는다(지금처럼 새로 만든다) */ }
  return { list, byId };
}

/** 그룹 하나의 판정 — hit: 재사용할 때만. keepKey: 새로 만들 때 키를 남기나(짝이 맞는 후보가 둘 이상이면 false). */
type ReuseDecision = { hit: ReuseHit | null; keepKey: boolean };

/**
 * 그룹마다 재사용 판정(§4.7 "재사용" 3번) — 키가 같은 후보마다 짝 맞추기 검사를 하고, 통과한 후보 중
 * "정확히 하나"를 센다(`matchReuse`). 미리보기 · [등록]이 같은 함수를 쓴다.
 * `groups`는 루프 전 스냅샷(그 멤버 StructNode로 키를 계산한다).
 * `asInstance`는 A 쪽 "이번 실행 뒤의 모습" — 이번 [등록]의 그룹 멤버(인스턴스가 된다). [등록]은 체크한 그룹 전체,
 * 미리보기는 기본 체크 상태(세트 · 접힘 그룹 — 멤버 2개+)의 멤버(7번).
 */
async function decideReuse(groups: readonly PlanGroup[], exclude: ReadonlySet<string>, asInstance: ReadonlySet<string>): Promise<ReuseDecision[]> {
  const { list, byId } = await reuseCandidates(exclude);
  if (!list.length) return groups.map(() => ({ hit: null, keepKey: true }));
  const out: ReuseDecision[] = [];
  // 같은 기존 컴포넌트를 멤버마다 다시 읽지 않는다(소가족 멤버는 같은 변형 키를 나눠 쓴다).
  const rootCache = new Map<string, { struct: StructNode; icons: Set<string> }>();
  for (const g of groups) {
    let hit: ReuseHit | null = null;
    let keepKey = true;
    try {
      const plan = reusePlanFor(g);
      if (plan) {
        // 키가 같은 후보마다 멤버별 짝 맞추기(비동기 — 아이콘 메인을 구한다)를 먼저 해 둔다.
        const pass = new Map<string, 'strict' | 'loose' | 'fail'>(); // `${k}|${compId}` — 엄격 · 예외 통과 · 걸림
        const icons = new Map<string, Set<string>>(); // 같은 키
        for (let k = 0; k < g.members.length; k++) {
          const key = plan.kind === 'variant' ? plan.keys[k] : plan.keys[0];
          for (const c of list) {
            if (c.key !== key) continue;
            const comp = byId.get(c.id);
            if (!comp) { pass.set(`${k}|${c.id}`, 'fail'); continue; }
            const { root } = reuseRootOf(comp, g.members[k].type);
            const ck = `${c.id}|${root.id}`;
            let cached = rootCache.get(ck);
            if (!cached) { cached = { struct: toStructNode(root), icons: await iconInstanceIds(root) }; rootCache.set(ck, cached); }
            icons.set(`${k}|${c.id}`, cached.icons);
            pass.set(`${k}|${c.id}`, reusePairGrade(g.members[k], cached.struct, asInstance, cached.icons));
          }
        }
        const m = matchReuse(plan, list, g.members.length, (k, id) => pass.get(`${k}|${id}`) ?? 'fail');
        keepKey = m.keepKey;
        const comps = m.ids ? m.ids.map((id) => byId.get(id)).filter((c): c is ComponentNode => !!c) : [];
        if (m.ids && comps.length === g.members.length) {
          const set = plan.kind === 'variant' && comps[0].parent?.type === 'COMPONENT_SET' ? comps[0].parent : null;
          hit = {
            comps,
            iconIds: m.ids.map((id, k) => icons.get(`${k}|${id}`) ?? new Set<string>()),
            name: set ? set.name : comps[0].name,
            shown: comps.map((c) => (set ? `${set.name} · ${c.name}` : c.name)),
          };
        }
      }
    } catch {
      hit = null; // 판정 실패 — 새로 만든다
      keepKey = true;
    }
    out.push({ hit, keepKey });
  }
  return out;
}

figma.ui.onmessage = async (msg: UiToCode) => {
  try {
    switch (msg.type) {
      case 'EXTRACT': {
        const sel = selection();
        const { tokens, warnings } = extractFromSelection(sel, bindOwnerOf(sel)); // 쓰임 이름의 주인(§2.12 12.3)
        post({ type: 'EXTRACT_RESULT', tokens, warnings, selection: sel.length });
        break;
      }
      case 'CREATE_TOKENS': {
        // 실제 변수 생성만 Paid(미리보기는 비파괴 읽기라 백엔드는 허용 — UI가 무료 티어에서 버튼을 잠근다).
        if (!msg.preview && !requirePaid('tokens')) break;
        // UX1: preview면 변수를 만들지 않고 예정 수만 집계. base는 값 환산에 쓰이므로 양쪽 다 전달.
        const s = msg.preview ? await previewCreateTokens(msg.tokens, msg.base) : await createTokens(msg.tokens, msg.base);
        // 쓰임 역할 — Global을 만든 직후 같은 처리 · 같은 ⌘Z 안에서(§2.12 12.10). 미리보기는 만들 수만 센다.
        const roles = await createUsageRoles(msg.tokens, !!msg.preview);
        // 팔레트 재적용(replacePalette): 이번 팔레트에 없는 이전 팔레트 색 변수 정리(사용자 변수 보존).
        const pruned = !msg.preview && msg.replacePalette ? await prunePaletteColors(msg.tokens.map((t) => t.name)) : 0;
        let summary = t('create.sumGlobals', { n: s.globals, c: s.created, u: s.updated });
        if (roles) summary += t('create.sumRoles', { n: roles });
        if (pruned) summary += t('create.sumPruned', { n: pruned });
        // base 반영 — 비-px 값이 실제로 얼마가 되는지 요약에 노출. base를 바꾸면 이 줄이 바뀐다.
        if (s.conversions.length) {
          const px = (n: number): string => String(Math.round(n * 100) / 100);
          const ex = s.conversions.slice(0, 2).map((c) => `${c.from}→${px(c.to)}px`).join(', ');
          const morePart = s.conversions.length > 2 ? t('create.sumBaseMore') : '';
          summary += t('create.sumBase', { base: msg.base, n: s.conversions.length, examples: ex, morePart });
        }
        post({ type: 'CREATE_RESULT', created: s.created, updated: s.updated, summary, preview: msg.preview, roles });
        if (!msg.preview) {
          commitUndo(figma); // UX2: 토큰 생성 전체를 단일 Undo로
          await postPrereq(); // #11: 토큰 생성 → 시맨틱/바인딩 전제 충족 갱신
        }
        break;
      }
      case 'APPLY': {
        bindCancel = false; // UX6: 새 작업 시작 시 취소 플래그 초기화
        // UX1: preview면 dry-run(바인딩 없이 집계). UX3: 사유별 스킵(reasons). UX6: 진행률·취소.
        const sel = selection();
        const r = await bindSelection(
          sel,
          !msg.preview,
          {
            onProgress: (done, total) => post({ type: 'PROGRESS', op: 'bind', done, total }),
            shouldCancel: () => bindCancel,
            yieldToEvents: () => new Promise<void>((resolve) => setTimeout(resolve, 0)),
          },
          { ownerOf: bindOwnerOf(sel) }, // 쓰임 이름의 주인 — 이름 정리 역할 → 고신뢰 판정(§2.12 12.3)
        );
        post({
          type: 'APPLY_RESULT',
          bound: r.bound,
          skipped: r.skipped,
          reasons: r.reasons,
          preview: msg.preview,
          cancelled: r.cancelled,
          candidates: r.candidates, // #6: 미리보기 후보(dry-run만)
          nodes: r.nodes, // #13: 미리보기 트리 맥락
          skips: r.skips, // 사유별 건너뛴 레이어(dry-run만 · 상한까지)
          skipTotal: r.skipTotal, // 상한 전 실제 수 — 잘렸으면 UI가 알린다
          reqId: msg.reqId, // UI가 낡은 응답을 가려낸다
          newRoles: r.newRoles,
          swapped: r.swapped,
        });
        if (!msg.preview) {
          commitUndo(figma); // UX2: 바인딩(취소 시 부분 포함)을 단일 Undo로
          selfSelect = true; // 선택이 바뀐 게 아니다 — UI가 방금 그린 결과 트리를 지우지 않게
          postSelection(); // 준비 현황 '변수 연결 완료' 판정 갱신(선택은 그대로라 selectionchange가 안 온다)
        }
        break;
      }
      case 'SCAN_USAGE': {
        // 변수 목록의 사용 수(보기 전용) — 연결 카드의 미리보기·결과와 무관하다.
        post({ type: 'USAGE_RESULT', reqId: msg.reqId, ...(await collectUsage(msg.nodeIds)) });
        break;
      }
      case 'FIND_VAR_USERS': {
        const r = findUsers(await resolveRoots(msg.nodeIds), new Set(msg.varIds));
        post({ type: 'VAR_USERS', reqId: msg.reqId, layers: r.nodes.slice(0, msg.limit).map((n) => ({ id: n.id, name: n.name })), totalLayers: r.nodes.length, places: r.places });
        break;
      }
      case 'SELECT_VAR_USERS': {
        // 그때 새로 찾아서 고른다 — 선택은 최대 200개(SELECT_CAP).
        const r = findUsers(await resolveRoots(msg.nodeIds), new Set(msg.varIds));
        const pick = r.nodes.slice(0, SELECT_CAP);
        if (pick.length) {
          const cur = figma.currentPage.selection;
          if (pick.length !== cur.length || pick.some((n, i) => cur[i] !== n)) selfSelect = true;
          figma.currentPage.selection = pick;
          figma.viewport.scrollAndZoomIntoView(pick);
        }
        post({ type: 'SELECT_RESULT', found: pick.length, requested: r.nodes.length, capped: r.nodes.length > SELECT_CAP });
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
        // #6: 체크한 후보만 연결 — 연결 직전 자리마다 다시 확인해, 그 사이 붙었거나(일부 구간 포함)
        // 스타일이 생겼거나 값이 달라진 곳은 건너뛰고 사유로 돌려준다(IA v3 §4.6 "찾는 범위" · "연결 후").
        // 300곳씩 묶어 연결하고 묶음마다 진행률을 보낸다(§4.6 "찾기 · 연결의 수"). [취소]는 없다.
        // 중간에 예외가 나도 이미 쓴 자리가 있으면 ⌘Z 한 번으로 풀리게 finally에서 묶음을 닫는다(오류는 맨 끝 catch가 보낸다).
        let written = 0;
        let made = 0;
        let committed = false;
        try {
          const r = await bindSelectedItems(msg.items, {
            onProgress: (done, total) => post({ type: 'PROGRESS', op: 'link', done, total }),
            yieldToEvents: () => new Promise<void>((resolve) => setTimeout(resolve, 0)),
            onBound: (n) => { written = n; },
            onCreated: (n) => { made = n; },
          });
          post({ type: 'APPLY_RESULT', bound: r.bound, skipped: r.skipped, reasons: r.reasons, skips: r.skips, skipTotal: r.skipTotal, reqId: msg.reqId, newRoles: r.newRoles, swapped: r.swapped });
          // 역할을 하나라도 만들었으면 아무것도 붙이지 못했어도 묶음을 닫는다 — 연결 한 번 = ⌘Z 한 번(§2.12 12.9).
          if (r.bound || r.newRoles) {
            commitUndo(figma); // UX2: 선택 바인딩 전체(마지막 묶음 뒤 한 번)를 단일 Undo로
            committed = true;
            selfSelect = true;
            postSelection();
          }
        } finally {
          if ((written > 0 || made > 0) && !committed) commitUndo(figma);
        }
        break;
      }
      case 'RENAME': {
        const r = await renameSelection(selection(), { apply: msg.apply, maxDepth: msg.maxDepth });
        post({ type: 'RENAME_RESULT', changes: r.changes, nodes: r.nodes, applied: r.applied });
        if (r.applied && r.changes.length) {
          commitUndo(figma); // UX2: 리네임 전체를 단일 Undo로
        }
        if (r.applied) {
          selfSelect = true;
          postSelection(); // 준비 현황 '이름 정리 완료' 판정 갱신
        }
        break;
      }
      case 'RENAME_APPLY': {
        // #7: 미리보기 트리에서 체크한 항목만 직접 적용(재계산 없이 id→after 그대로).
        // 이름과 함께 dsRole도 기록 — 말단 후보 자격·등록 머리명사가 readRole에 의존한다.
        const changes: RenameChange[] = [];
        let roleWrites = 0; // 이름은 그대로면서 역할만 새로 기록된 노드 수(undo 묶음 판단용)
        for (const { id, before: expectedBefore, after, role } of msg.items) {
          const node = await figma.getNodeByIdAsync(id);
          if (!node || !('name' in node)) continue; // 소실 노드는 graceful skip
          const before = node.name;
          if (before !== expectedBefore) continue; // 미리보기 이후 이름이 바뀐 노드는 stale 적용 방지
          if (before !== after) node.name = after;
          // 이름만 바꾸면 등록이 읽을 역할이 남지 않는다 — 마법사 경로(renameSelection)는
          // 이미 남기는데 판넬 경로만 빠져 있어, 말단 등록 후보와 머리명사 규칙이
          // 판넬로 리네임한 사람에게는 통째로 죽어 있었다.
          // **이름이 그대로인 노드에도** 기록한다(멱등) — 옛 리네임 결과·손으로 지은 이름에
          // 역할을 채워 넣는 유일한 경로다. 다만 '바뀐 것'으로 세지는 않는다.
          // 두 브랜치가 같은 구멍을 다르게 막았다 — 둘 다 남긴다. 미리보기가 이미 역할을
          // 정해 보냈으면(role) 그 값을 그대로 쓰고, 없을 때만 origin/main의 이름 기반
          // 추론으로 물러선다. 이름에서 뽑는 쪽은 알려진 역할 토큰으로 끝나는 이름만
          // 건지므로, 앞의 경로를 이걸로 대체하면 그 외 이름의 역할이 도로 안 남는다.
          if (role ? writeRole(node as SceneNode, role) : writeRoleFromName(node as SceneNode, after)) {
            roleWrites++;
          }
          // node.name은 위(before !== after)에서 이미 썼다 — origin/main이 여기 둔 대입은
          // 그 줄과 겹쳐서 걷는다.
          if (before === after) continue;
          changes.push({ id, before, after });
        }
        post({ type: 'RENAME_RESULT', changes, nodes: [], applied: true });
        selfSelect = true;
        postSelection();
        // 이름이 하나도 안 바뀌어도 역할을 새로 기록했으면 커밋한다. 안 하면 그 pluginData
        // 쓰기가 다음에 undo를 커밋하는 **무관한 작업**의 묶음에 접혀 들어가, 그 작업을
        // 되돌릴 때 역할 기록까지 조용히 함께 revert된다.
        if (changes.length || roleWrites) {
          commitUndo(figma); // UX2: 선택 리네임 전체를 단일 Undo로
        }
        break;
      }
      case 'CREATE_SEMANTICS': {
        if (!requirePaid('semantics')) break;
        const s = await createSemanticAliases(msg.map);
        post({ type: 'SEMANTICS_RESULT', created: s.created, updated: s.updated, aliased: s.aliased, missing: s.missing });
        commitUndo(figma); // UX2: 시맨틱 별칭 생성을 단일 Undo로
        await postPrereq(); // #11: 시맨틱 별칭(바인딩 가능 변수) 생성 → 전제 갱신
        break;
      }
      case 'SCAN_TEXT_STYLES': {
        // 스캔(미리보기)도 Paid — 등록이 Paid라 스캔만 열어두면 막다른 길(ROADMAP §5).
        // 마법사의 텍스트 스타일 단계도 Paid 전용이라 Free 마법사는 여기 오지 않는다.
        if (!requirePaid('textStyles')) break;
        // 이름은 언제나 크기 순(display/h1…) — 행 라벨은 아래 NAME_TEXT_STYLES_BY_ROW가 덧입힌다.
        const { samples, warnings } = await scanTextStyles(selection());
        lastTextSamples = samples;
        const existing = await scanExistingTextStyles();
        const styles = nameTextStyles(clusterTextStyles(samples), existing);
        post({ type: 'TEXT_STYLE_CANDIDATES', styles, warnings });
        break;
      }
      case 'NAME_TEXT_STYLES_BY_ROW': {
        if (!requirePaid('textStyles')) break; // 스캔 후속 — 스캔과 같은 등급
        // 방금 스캔한 표본을 그대로 다시 이름 짓는다(캔버스 재탐색 없음) — 사용자가 보고 있는 표와
        // 같은 입력이어야 결과가 예측 가능하다. 등록된 스타일은 그 사이 바뀔 수 있어 새로 읽는다.
        // 빈 후보를 돌려보내면 UI가 '텍스트를 못 찾음'으로 읽고 기본 램프로 표를 덮는다 — 오류로 알린다.
        if (!lastTextSamples.length) {
          post({ type: 'ERROR', message: t('textStyle.needScan'), op: 'NAME_TEXT_STYLES_BY_ROW' });
          break;
        }
        const existing = await scanExistingTextStyles();
        const r = nameTextStylesWithRowLabels(lastTextSamples, existing);
        post({ type: 'TEXT_STYLE_CANDIDATES', styles: r.styles, warnings: [], labeled: r.labeled, fallback: r.fallback });
        break;
      }
      case 'CREATE_TEXT_STYLES': {
        if (!requireTextStyles()) break;
        const r = await createSemanticTextStyles(msg.styles);
        post({ type: 'TEXT_STYLES_RESULT', created: r.created, updated: r.updated, bound: r.bound, missing: r.missing, notes: r.notes });
        commitUndo(figma); // UX2: 변수+스타일 생성을 단일 Undo로
        await postPrereq(); // 스타일·시맨틱 변수 생성 반영 → 「기존만 연결」 등 전제 게이트 갱신
        break;
      }
      case 'APPLY_TEXT_STYLES': {
        // 적용만(생성 없음, 무료 — IA v3 §4.6): 선택 텍스트를 시그니처가 같은 기존 스타일에 연결.
        const r = await applyExistingTextStyles(selection());
        post({ type: 'TEXT_STYLES_APPLIED', applied: r.applied, skipped: r.skipped, skipReasons: r.skipReasons });
        commitUndo(figma);
        break;
      }
      case 'GET_COLLECTIONS': {
        const cols = await figma.variables.getLocalVariableCollectionsAsync();
        post({ type: 'COLLECTIONS', collections: cols.map((c) => ({ id: c.id, name: c.name })) });
        postSelection(); // UI 초기화 시점 — 현재 선택 상태도 함께 전송(UX5).
        break;
      }
      case 'GET_COLLECTION_ROLES': {
        post({ type: 'COLLECTION_ROLES', collections: await collectionRoleInfos() });
        break;
      }
      case 'SET_COLLECTION_ROLE': {
        // 컬렉션 계층 지정(Free — 기존 변수를 다루는 일). 파일 pluginData라 같은 파일을 여는 모두에게 적용.
        writeRoleMap(assignRole(readRoleMap(), msg.collectionId, msg.role));
        post({ type: 'COLLECTION_ROLES', collections: await collectionRoleInfos() });
        await postPrereq(); // 계층이 바뀌면 '토큰 있음/바인딩 대상 있음' 판정도 바뀐다
        post({ type: 'VARIABLES', vars: await collectVars() });
        break;
      }
      case 'GET_PREREQ': {
        await postPrereq(); // #11: 단계 전제 상태(시작·탭 전환 시)
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
          postLicense({ text: t('license.noteApplied'), kind: 'ok' });
        } else if (msg.result.offline) {
          // 오프라인 — 기존 캐시(grace) 유지, 변경 없음.
          postLicense({ text: t(cache ? 'license.noteGrace' : 'license.noteOffline'), kind: 'warn' });
        } else {
          // 알려진 서버 사유면 해요체 문구, 아니면 한 줄 + 원문 툴팁(결정 5-(b)). 머리말은 붙이지 않는다.
          const { code, error } = msg.result;
          postLicense({
            text: isVerifyErrCode(code) ? t(`license.err.server.${code}`) : t('license.verifyFailed'),
            kind: 'warn',
            tip: error || undefined,
          });
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
        postLicense({ text: t('license.noteCleared'), kind: 'ok' });
        break;
      }
      case 'OPEN_LICENSE_LINK': {
        // URL은 여기서만 해석 — UI가 임의 주소를 넘길 수 없게 한다.
        figma.openExternal(msg.target === 'purchase' ? PURCHASE_URL : PORTAL_URL);
        break;
      }
      case 'EXPORT': {
        // 모든 디자인 시스템 변수(Global+Semantic)를 코드로 내보내기. (현재 Free; 추후 게이팅 가능)
        const cols = await figma.variables.getLocalVariableCollectionsAsync();
        const colById = new Map(cols.map((c) => [c.id, c]));
        const tiers = collectionTiers(cols);
        const vars = await figma.variables.getLocalVariablesAsync();
        const nameById = new Map(vars.map((v) => [v.id, v.name]));
        const tokens: ExportToken[] = [];
        for (const v of vars) {
          const col = colById.get(v.variableCollectionId);
          const tier = col ? tiers.get(col.id) : 0;
          if (!col || (tier !== 1 && tier !== 2)) continue; // 내보내기는 Global·Semantic 계층(이름 무관)
          const raw = v.valuesByMode[col.defaultModeId];
          const t: ExportToken = {
            name: v.name,
            collection: tier === 1 ? 'Global' : 'Semantic', // 출력 그룹은 계층 이름(컬렉션 실제 이름과 무관)
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
        // 텍스트 스타일도 함께 — 행간·자간 %는 변수가 아니라 스타일에 있다(A안). %는 그대로 낸다.
        const styles: ExportTextStyle[] = (await figma.getLocalTextStylesAsync()).map((st) => ({
          name: st.name,
          fontFamily: st.fontName.family,
          fontStyle: st.fontName.style,
          fontSize: st.fontSize,
          lineHeight:
            st.lineHeight.unit === 'AUTO'
              ? { unit: 'auto', value: 0 }
              : { unit: st.lineHeight.unit === 'PERCENT' ? 'percent' : 'px', value: st.lineHeight.value },
          letterSpacing: { unit: st.letterSpacing.unit === 'PERCENT' ? 'percent' : 'px', value: st.letterSpacing.value },
        }));
        styles.sort((a, b) => a.name.localeCompare(b.name));
        const content = exportTokens(tokens, {
          format: msg.format,
          fontSizeUnit: msg.fontSizeUnit,
          base: msg.base,
        }, styles);
        post({ type: 'EXPORT_RESULT', format: msg.format, content });
        break;
      }
      case 'SCAN_COMPONENT_CANDIDATES': {
        if (!requireComponents()) break;
        // 숨긴 조상 아래 노드는 선택 루트여도 제외(실효 비가시).
        const roots = selection().filter(isEffectivelyVisible);
        // StructNode로 매핑해 넘긴다 — 말단 등록 자격이 `dsRole`에 달려 있다.
        // toStructNode가 인스턴스 내부를 펼치지 않으므로 스캔 범위는 그대로다.
        const rootStructs = roots.map((n) => toStructNode(n));
        const candidates = scanComponentCandidates(rootStructs);
        // 선택 루트마다 한 번 만든 StructNode를 id로 찾는다(§4.7 "묶기").
        const scanIndex = new Map<string, StructNode>();
        const addIdx = (n: StructNode): void => { scanIndex.set(n.id, n); for (const c of n.children ?? []) addIdx(c); };
        for (const r of rootStructs) addIdx(r);
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
          const groups = groupForRegister(eligibleNodes, scanIndex);
          // 등록과 **같은 함수**로 이름을 정한다 — 문서 순서의 계획 그룹으로 한 번(§4.7 "묶기" 4번).
          // 문서에 이미 있는 컴포넌트 이름도 함께 넘겨 충돌 해소 결과까지 등록과 일치시킨다.
          // (후보 자신은 제외 — 이미 COMPONENT인 말단이 후보면 자기 이름과 충돌해 숫자가 붙는다.)
          const groupNames = resolvePlanNames(groups, await existingComponentNames(new Set(eligibleNodes.map((n) => n.id))));
          // 기본 체크(§4.7 "묶기" 6번) — 재사용 미리보기의 "기본 체크 상태"도 같은 값(§4.7 "재사용" 7번).
          const defaultChecked = new Set<string>();
          for (const g of groups) for (const m of g.members) if (defaultOnFor(g, m)) defaultChecked.add(m.id);
          const reuseHits = (await decideReuse(groups, new Set(eligibleNodes.map((n) => n.id)), defaultChecked)).map((d) => d.hit);
          const preview = new Map<string, { group?: string; variant?: string; single?: string; propsOnly?: boolean; reuse?: { name: string }; defaultOn?: boolean }>();
          groups.forEach((g, gi) => {
            const name = groupNames[gi];
            const on = (id: string) => defaultChecked.has(id);
            if (g.subfamilies.length === 1) {
              if (g.members.length === 1) preview.set(g.members[0].id, { single: name, defaultOn: on(g.members[0].id) });
              else for (const m of g.members) preview.set(m.id, { single: name, propsOnly: true, defaultOn: on(m.id) });
              return;
            }
            for (const sf of g.subfamilies) {
              const variant = formatVariant(sf.props);
              for (const m of sf.members) preview.set(m.id, { group: name, variant, defaultOn: on(m.id) });
            }
          });
          // [재사용] 배지 + 기존 컴포넌트 이름(세트면 "{세트} · {변형}") — 종류 라벨 위에 얹는다(기본 체크는 종류대로).
          // 트리는 reuse가 있으면 종류 배지 대신 [재사용]을 보이고, 숫자 접미사 이름은 보이지도 보내지도 않는다.
          groups.forEach((g, gi) => {
            const hit = reuseHits[gi];
            if (!hit) return;
            g.members.forEach((m, k) => preview.set(m.id, { ...(preview.get(m.id) ?? {}), reuse: { name: hit.shown[k] } }));
          });
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
        // 판정은 StructNode로 — 선택 루트마다 한 번 만들어 노드 id로 찾는다(§4.7 "묶기").
        const sIndex = structIndex(selection());
        const eligible = (n: SceneNode): boolean => sceneComponentEligible(n, sIndex);
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
            // 탭의 칸은 후보가 아니다(§4.7 "묶기" 1번).
            const st = sIndex.get(n.id);
            if (st && tabInfo(st) != null) return;
            // 아이콘 프레임과 그 안은 후보가 아니다(§4.7 "묶기" 3번) — 스캔과 같은 범위.
            if (st?.iconFrame) return;
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

        // 묶기 계획(SCAN과 공유). 폴백(스캔 없이 등록)은 반복만 — 가족 단위(탭 그룹은 그룹 전체, §4.7 "묶기").
        let groups = groupForRegister(valid, sIndex);
        if (setsOnly) groups = groups.filter((g) => g.members.length >= 2);
        // 이름은 **문서 순서**로 루프 전에 한 번 정한다(§4.7 "묶기" 4번) — 안쪽 먼저 정렬 뒤에도 이 이름을 쓴다.
        // 등록 대상 자신은 '기존 이름'에서 제외(스캔 미리보기와 같은 규칙).
        const existingNames = await existingComponentNames(new Set(valid.map((n) => n.id)));
        const nameByGroup = new Map<PlanGroup, string>();
        resolvePlanNames(groups, existingNames).forEach((nm, i) => nameByGroup.set(groups[i], nm));
        if (!groups.length) {
          post({ type: 'COMPONENTS_RESULT', registered: 0, skipped, sets: 0, singles: [], missing: [], failures: [] });
          break;
        }
        // **내부(자손) 그룹 먼저** — 내부 반복이 먼저 세트/인스턴스가 된 뒤 바깥을 컴포넌트화해야
        // 그 안에 내부 인스턴스가 들어가 중첩이 보존된다(각 단계 모두). 실제 포함관계로 위상 정렬.
        groups = orderInnerFirst(groups, byId);
        // 재사용 판정 — 루프 **전** 스냅샷(그룹 멤버의 StructNode)으로 한 번(§4.7 "재사용" 1·3번).
        // 체크한 그룹만 받아 다시 판정한다(7번) — 미리보기와 답이 다를 수 있다.
        const checkedMembers = new Set<string>();
        for (const g of groups) for (const m of g.members) checkedMembers.add(m.id);
        const reuseDecisions = await decideReuse(groups, new Set(valid.map((n) => n.id)), checkedMembers);
        const reuseHits = reuseDecisions.map((d) => d.hit);
        /** 루프 전 스냅샷 — 키를 남길 때도 이것으로 계산한다(루프 안에서는 안쪽이 이미 인스턴스다). */
        const structById = new Map<string, StructNode>();
        for (const g of groups) for (const m of g.members) structById.set(m.id, m);
        /** 만든 컴포넌트에 재사용 키를 남긴다 — 실제로 만든 종류대로(2번). 못 남기면 다음에 새로 만들 뿐. */
        // 짝이 맞는 기존 후보가 둘 이상이던 그룹은 새로 만들되 키를 남기지 않는다(3번) — 그 그룹 멤버 id.
        const noKeyMembers = new Set<string>();
        groups.forEach((g, gi) => { if (!reuseDecisions[gi].keepKey) for (const m of g.members) noKeyMembers.add(m.id); });
        const groupKeyOf = new Map<string, string>();
        for (const g of groups) for (const m of g.members) groupKeyOf.set(m.id, g.key);
        const markReuse = (comp: ComponentNode, kind: 'single' | 'collapse' | 'variant', memberId: string): void => {
          const m = structById.get(memberId);
          // 이름 키는 그룹 키(탭은 `role:tab`, §4.7 "묶기" 7번).
          const key = m && !noKeyMembers.has(memberId) ? reuseKey(kind, m, groupKeyOf.get(memberId)) : '';
          try { comp.setPluginData(REUSE_KEY, key); } catch { /* 무시 */ }
        };
        // 문서에 이미 있는 아이콘 컴포넌트(그림 지문 `dsl.icon`) — 등록부가 먼저 찾아 쓴다(2번).
        const existingIcons = new Map<string, ComponentNode>();
        try {
          for (const c of figma.root.findAllWithCriteria({ types: ['COMPONENT'], pluginData: { keys: [ICON_KEY] } })) {
            const k = c.getPluginData(ICON_KEY);
            if (k && !existingIcons.has(k)) existingIcons.set(k, c);
          }
        } catch { /* 못 찾으면 새로 만든다 */ }
        const reused: string[] = []; // 재사용한 기존 컴포넌트 이름(그룹마다 하나, 세트는 세트 이름)
        const reuseKept: string[] = []; // 바꾸기 직전 다시 맞추기에 걸려 원본을 둔 멤버 이름

        const page = await ensureComponentsPage();
        let cursorX = pageStartX(page);
        let sets = 0;
        const singles: string[] = [];
        const failures: string[] = []; // 조용히 삼키던 실패를 UI로 노출(진단)
        // 등록으로 만든 컴포넌트/세트 — 루프 후 **속성 자동 노출**(옛 '속성 노출' 버튼 통합).
        const containers: { container: ComponentNode | ComponentSetNode; scopes: ComponentNode[] }[] = [];
        let exposedEarly = 0; // 속성접힘 경로에서 선노출한 속성 수

        // 원본 자리(§4.7 "인스턴스 자리"). 그룹 부모면 표지를 넣어 그룹을 지킨다 — 원본이 컴포넌트가 되어
        // 옮겨지는 순간 빈 그룹을 피그마가 지우면 인스턴스를 둘 곳이 없어진다(QA #3 불합격 3).
        // 만든 기록은 모두 모아 두고 끝에서 표지를 정리한다(실패 경로에서 표지가 남지 않게).
        const origins: Origin[] = [];
        const placeFailed: string[] = []; // 복사본도 못 둬 비운 자리의 원본 이름(결과 줄 · §4.7 5번)
        const placeCloned: string[] = []; // 인스턴스를 못 넣어 복사본으로 채운 자리의 원본 이름(§4.7 5번)
        const propFailed: string[] = []; // 속성 값·사진을 못 넣어 마스터 값으로 남은 멤버 이름(§4.7 6번)
        const fillKept: string[] = []; // 사진·크기 검사에 걸려 묶지 않고 원본을 둔 멤버 이름(§4.7 8번)
        const captureOrigin = (n: SceneNode): Origin => {
          const o = captureOriginAt(n);
          origins.push(o);
          return o;
        };
        const placeOnPage = (n: ComponentNode | ComponentSetNode): void => {
          page.appendChild(n);
          n.x = cursorX;
          n.y = 0;
          cursorX += n.width + 48;
        };
        // 한 그룹의 원본 자리를 채운다(부모별 인덱스 오름차순 + 클램프). 깊은 그룹부터 즉시 채워야
        // 바깥 그룹 컴포넌트화 시 내부 인스턴스가 이미 자리잡고 있다.
        // 자리마다 인스턴스 → 복사본 → 빈 자리(§4.7 5번). 인스턴스 만들기 실패와 넣기 실패를 같은 길로 센다.
        // 자리 결과는 건너뜀(skipped)에 넣지 않는다 — 원본은 이미 컴포넌트로 등록됐다(§4.7 6번).
        type Place = { o: Origin; make: () => InstanceNode; label: string };
        const restore = (places: Place[]): void => {
          places.sort((a, b) => {
            const pa = a.o.parent?.id ?? ''; const pb = b.o.parent?.id ?? '';
            return pa === pb ? a.o.index - b.o.index : pa < pb ? -1 : 1;
          });
          for (const { o, make, label } of places) {
            const why: string[] = [];
            // 이 자리를 채우며 make()가 propFailed에 넣은 항목은 before 뒤에 붙는다(§4.7 6번).
            const before = propFailed.length;
            const r = fillOrigin(make, o, (w) => why.push(w));
            // 복사본 · 빈 자리 목록에 넣는다. 빈 자리면 속성 값 꼬리에서는 뺀다(§4.7 6번).
            tallyFill({ placeCloned, placeFailed, propFailed }, r, o.name, before);
            if (r === 'instance') continue;
            const causePart = why.length ? t('component.fail.cause', { why: why.join(' · ') }) : '';
            if (r === 'copy') failures.push(t('component.fail.copyPlaced', { label, name: o.name, causePart }));
            else failures.push(t('component.fail.nothingPlaced', { label, name: o.name, causePart }));
          }
        };
        // 맨 끝 속성 노출은 세트 변형의 값(글자 · 안쪽 인스턴스 · 보이기)을 기본값으로 바꾼다. 노출 전에 만든
        // 인스턴스가 따라가지 않게, 이번 [등록]이 만든 자리 인스턴스와 컴포넌트를 모아 두고 노출 직전에
        // 그 안 모든 인스턴스의 값을 적어, 노출 뒤 되돌린다(§4.7 9번).
        const keepRoots: { node: SceneNode; name: string }[] = [];
        const instanceOf = (comp: ComponentNode, name: string) => (): InstanceNode => {
          const inst = comp.createInstance();
          keepRoots.push({ node: inst, name });
          return inst;
        };
        // 단독 컴포넌트 1개를 페이지 이동 + 원위치 인스턴스 + 속성 노출 대상 등록(단독·결합불가·결합실패 3곳 공용).
        const placeSingle = (comp: ComponentNode, o: Origin, name: string): void => {
          try { comp.name = name; } catch { /* 이름 실패 무시 */ }
          placeOnPage(comp);
          singles.push(comp.name);
          containers.push({ container: comp, scopes: [comp] });
          restore([{ o, make: instanceOf(comp, o.name), label: comp.name }]);
        };

        // 이름은 정렬 전에 정했다(위) — 순서와 1:1로 옮긴다.
        const resolved = groups.map((g) => nameByGroup.get(g) ?? '');

        /* 아이콘(날 벡터) 컴포넌트 — 그림이 다른 슬롯은 인스턴스 안에서 경로를 못 고치므로,
           그림마다 컴포넌트를 만들고 그 자리를 인스턴스로 바꿔 INSTANCE_SWAP으로 담는다.
           지문(vectorKey) 기준으로 문서 전체에서 한 번만 만든다(그룹이 달라도 같은 아이콘은 하나). */
        const takenNames = new Set<string>([...existingNames, ...resolved]);
        const iconRegistry = createIconRegistry({
          page,
          place: placeOnPage,
          uniqueName: (base) => {
            const b = pascalCase(base) || 'Icon';
            let n = b;
            let i = 2;
            while (takenNames.has(n)) n = `${b}${i++}`;
            takenNames.add(n);
            return n;
          },
          onFailure: (m) => failures.push(m),
          existing: (key) => existingIcons.get(key) ?? null,
        });
        // 트리가 보여 준 이름이 있으면 그것이 최종이다 — 충돌 해소는 **후보 전체**를 봐야
        // 같은 답이 나오는데 여기는 체크한 것만 받는다. 다시 풀면 `ProfileAvatar`로 보여 주고
        // `Avatar`로 등록하는 어긋남이 생긴다(미리보기 없는 폴백 경로만 여기서 정한다).
        const shownNames = msg.names ?? {};
        const groupNames = groups.map((g, gi) => {
          const shown = g.members.map((m) => shownNames[m.id]).find((n) => !!n);
          return shown ?? resolved[gi];
        });
        // try/finally — 예상 밖 예외로 빠져나가도 그룹을 지키던 표지는 남기지 않는다.
        try {
          for (let gi = 0; gi < groups.length; gi++) {
            const g = groups[gi];
            const setName = groupNames[gi];
            // 재사용(§4.7 "재사용" 5번) — 새로 만들지 않고 멤버마다 기존 컴포넌트의 인스턴스로 바꾼다.
            // 멤버는 컴포넌트로 바꾸지 않는다 — 넣고 나서 지운다. 기존 컴포넌트 자체는 바꾸지 않는다.
            const hit = reuseHits[gi];
            if (hit) {
              let any = false;
              for (let k = 0; k < g.members.length; k++) {
                const node = byId.get(g.members[k].id);
                if (!node || node.removed) { skipped++; continue; }
                const comp = hit.comps[k];
                const name = node.name;
                const { root, prefix } = reuseRootOf(comp, g.members[k].type);
                // 바꾸기 직전 다시 맞추기 — 안쪽 그룹이 실제로 인스턴스가 되지 못했을 수 있다(3번). 지금 멤버 트리로.
                if (reusePairIssue(toStructNode(node), toStructNode(root), new Set(), hit.iconIds[k])) {
                  reuseKept.push(name);
                  failures.push(t('component.fail.reuseShape', { name }));
                  continue;
                }
                let noted = false;
                // 이 멤버를 위해 이번 실행에 새로 만든 아이콘 — 멤버가 원본으로 남으면 지운다(5번 "아이콘 정리").
                const newIcons: string[] = [];
                const make = async (): Promise<InstanceNode> => {
                  const inst = comp.createInstance();
                  try {
                    keepRoots.push({ node: inst, name }); // 9번 값 지키기의 기록 대상
                    const bad = await copyOverridesAsync(node, inst, prefix, {
                      mainOf: (n) => n.getMainComponentAsync(),
                      loadFont: (f) => figma.loadFontAsync(f),
                      isIcon: (n) => iconFrameKeyOf(n) !== undefined,
                      iconFor: (v) => {
                        const key = artKeyOf(v);
                        if (!key) return null;
                        const had = iconRegistry.get(key); // 이미 있던 것(이번에 만든 것 · 문서에 있던 것)
                        const icon = iconRegistry.ensure(key, v, v.name);
                        if (icon && !had && !newIcons.includes(key)) newIcons.push(key);
                        return icon;
                      },
                    });
                    if (!noted) {
                      noted = true;
                      for (const p of bad) failures.push(t('component.fail.propValue', { name, prop: p }));
                      if (bad.length) propFailed.push(name);
                    }
                    return inst;
                  } catch (e) {
                    try { if (!inst.removed) inst.remove(); } catch { /* 이미 사라짐 */ }
                    throw e;
                  }
                };
                const before = propFailed.length;
                const r = await replaceMemberAsync(node, make, prefix);
                if (r.result === 'replaced') { any = true; continue; }
                if (propFailed.length > before) propFailed.splice(before); // 원본 그대로 — 따질 속성 값이 없다
                // 이 멤버만 쓰려고 새로 만든 아이콘은 지운다 — 만든 순간 다른 멤버는 아직 쓰지 않았다(쓰던 것은 had로 빠진다).
                // 결과 줄 "아이콘 n"에서도 빠진다(등록부의 만든 수).
                for (const key of newIcons) iconRegistry.discard(key);
                if (r.result === 'mismatch') {
                  fillKept.push(name);
                  failures.push(t('component.fail.fillKept', { name, causePart: t('component.fail.cause', { why: r.why ?? '' }) }));
                } else {
                  placeFailed.push(name);
                  failures.push(t('component.fail.memberKept', { name, causePart: r.why ? t('component.fail.cause', { why: r.why }) : '' }));
                }
              }
              // 재사용한 그룹 = 멤버가 하나라도 인스턴스로 바뀐 그룹(6번). registered · sets · 단일에 세지 않는다.
              if (any) reused.push(hit.name);
              continue;
            }
            // 단독(1개) — 컴포넌트화 + 원위치 인스턴스.
            if (g.members.length === 1) {
              const node = byId.get(g.members[0].id);
              if (!node) continue;
              const o = captureOrigin(node);
              try {
                const comp = figma.createComponentFromNode(node);
                registered++;
                markReuse(comp, 'single', g.members[0].id);
                placeSingle(comp, o, setName); // 단독·세트 동일 규칙
              } catch (e) {
                releaseOrigin(o); // 원본이 그 자리에 그대로 — 표지만 치운다
                skipped++;
                failures.push(t('component.fail.single', { name: g.members[0].name, error: errText(e) }));
              }
              continue;
            }

            // 소가족 하나(텍스트/스왑/불리언 · 그림만 다른 반복) → 단품 1개 + 속성 오버라이드 인스턴스(세트 금지, §4.7 "묶기" 5번).
            // 아이콘을 못 만들어 접지 못하면 아래 세트 경로로 — 그때는 멤버마다 변형(지금 규칙).
            let subfamilies = g.subfamilies;
            if (subfamilies.length === 1) {
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
                    markReuse(comp, 'single', live[0].id);
                    placeSingle(comp, o, setName || pascalCase(live[0].name));
                  } catch (e) {
                    releaseOrigin(o);
                    skipped++;
                    failures.push(t('component.fail.propsRegister', { set: setName, error: errText(e) }));
                  }
                }
                continue;
              }
              const structs = live.map((n) => toStructNode(n));
              const plan = inferVaryingComponentProperties(structs);
              // 사진이 다른 슬롯 — 컴포넌트 속성이 아니라 인스턴스 fill 오버라이드로 이식한다.
              const imageSlots = inferVaryingImageSlots(structs);
              // 날 벡터 슬롯 — 아래에서 아이콘 컴포넌트를 만들고 마스터 자리를 인스턴스로 바꾼다.
              const vectorPlans = plan.filter((p) => p.fromVector && p.layerPath != null);
              /** 멤버 원본의 사진 fill(경로별) — 멤버 노드가 사라지기 전에 떠 둔다. */
              const imagesOf = (root: SceneNode): Record<string, readonly Paint[]> => {
                const out: Record<string, readonly Paint[]> = {};
                for (const s of imageSlots) {
                  const n = nodeAtPath(root, s.layerPath);
                  const f = n && 'fills' in n ? (n as GeometryMixin).fills : null;
                  if (Array.isArray(f)) out[s.layerPath] = f as readonly Paint[];
                }
                return out;
              };
              // 아이콘 컴포넌트는 멤버를 바꾸기 **전에** 만든다 — 마스터가 아닌 멤버는 인스턴스로 바뀌면
              // 지워지고, 그때 그 안의 그림도 함께 사라진다.
              // 하나라도 못 만들면 접지 않는다 — 멤버를 지운 뒤엔 그 그림을 되살릴 수 없다.
              let iconsReady = true;
              for (let i = 0; i < live.length; i++) {
                for (const p of vectorPlans) {
                  const node = nodeAtPath(live[i], p.layerPath!);
                  const key = structAtPathVectorKey(structs[i], p.layerPath!);
                  const icon = node && key ? iconRegistry.ensure(key, node, p.layerName) : null;
                  if (!icon) iconsReady = false;
                }
              }
              if (!iconsReady) {
                // 세트로 남긴다(아래 경로) — 멤버가 그대로라 그림도 그대로다. 멤버마다 변형(지금 규칙).
                failures.push(t('component.fail.iconFallback', { set: setName }));
                const dv = new Map(deriveVariants(g.members).map((d) => [d.id, d.props]));
                subfamilies = g.members.map((m) => ({ members: [m], master: 0, props: { ...(dv.get(m.id) ?? {}) } }));
              } else {
                // 마스터 하나만 컴포넌트로 바꾼다. 나머지 멤버는 바꾸지 않고, 인스턴스를 만들어 사진·크기를
                // 검사한 뒤 넣고 나서 지운다 — 검사에 걸리면 원본을 손대지 않고 그대로 둔다(§4.7 3·8번).
                // (예전: 멤버를 모두 컴포넌트로 바꾼 뒤 마스터 아닌 것을 지워, 사진·크기를 못 지키면 되돌릴 수 없었다.)
                type Snap = { n: SceneNode; vals: Record<string, string | boolean>; images: Record<string, readonly Paint[]> };
                const snaps: Snap[] = live.map((n) => ({ n, vals: propValuesFromNode(n, plan), images: imagesOf(n) }));
                // 액션 슬롯이 있는 쪽을 마스터로 — optional 결손 멤버의 트리를 대표로 쓰면 BOOLEAN 경로가 사라짐.
                const preferLive = pickCollapseMasterIndex(structs);
                const masterSnap = snaps[preferLive] ?? snaps[0];
                const masterOrigin = captureOrigin(masterSnap.n);
                let master: ComponentNode;
                try {
                  master = figma.createComponentFromNode(masterSnap.n);
                } catch (e) {
                  releaseOrigin(masterOrigin);
                  skipped++;
                  failures.push(t('component.fail.propsComponentize', { name: masterSnap.n.name, error: errText(e) }));
                  continue;
                }
                try { master.name = setName || pascalCase(masterSnap.n.name); } catch { /* 이름 실패 무시 */ }
                // heading 접힘 그룹은 재사용하지 않는다 — 키를 남기지 않는다(1번).
                if (isHeadingCollapseGroup(g.members)) { try { master.setPluginData(REUSE_KEY, ''); } catch { /* 무시 */ } }
                else markReuse(master, 'collapse', masterSnap.n.id);
                // 도형 멤버는 컴포넌트가 감싼다 — 원본 경로 앞에 붙일 것(§4.7 8번 "경로 맞추기").
                const prefix = shapePrefix(master, structs[preferLive]?.type ?? '');
                placeOnPage(master);
                keepRoots.push({ node: master, name: master.name });
                singles.push(master.name);
                registered++; // 남긴 단품 1개만 집계
                // 마스터의 날 벡터 자리를 아이콘 인스턴스로 교체 — INSTANCE_SWAP은 대상이
                // 인스턴스일 때만 붙으므로 **속성 노출보다 먼저** 한다. 먼저 끼우고 뒤에 지워
                // 인덱스 경로가 흔들리지 않게 한다(자식 수가 잠깐도 줄지 않는다).
                failures.push(
                  ...swapVectorSlots(
                    master,
                    vectorPlans.map((p) => ({
                      layerName: p.layerName,
                      layerPath: joinPath(prefix, p.layerPath!),
                      icon: iconRegistry.get(String(masterSnap.vals[p.propName] ?? '')),
                    })),
                  ),
                );
                // 값이 다른 슬롯만 TEXT/SWAP/BOOLEAN으로 노출(공통 텍스트는 속성 제외).
                let collapsedExposed = 0;
                try {
                  collapsedExposed = exposePropertiesFromPlan(master, [master], plan).length;
                } catch (e) {
                  failures.push(t('component.fail.expose', { name: master.name, error: errText(e) }));
                }
                exposedEarly += collapsedExposed;
                const ids = propIdsByName(master);
                /** 이 멤버의 인스턴스 — 속성 값·사진까지. 못 넣은 속성·사진은 마스터 값으로 두고 알린다(§4.7 6번). */
                const makerFor = (snap: Snap, name: string): (() => InstanceNode) => {
                  // 벡터 슬롯의 값은 그림 지문이다 — 방금 만든 아이콘 컴포넌트 key로 옮겨 적는다.
                  const vals = { ...snap.vals };
                  for (const p of vectorPlans) {
                    const icon = iconRegistry.get(String(vals[p.propName] ?? ''));
                    if (icon) vals[p.propName] = icon.key || icon.id;
                    else delete vals[p.propName]; // 못 만든 그림은 마스터 것 그대로(빈 값으로 덮지 않는다)
                  }
                  // 사진 경로를 마스터 경로로(감싼 도형이면 앞붙이)
                  const images: Record<string, readonly Paint[]> = {};
                  for (const [path, paints] of Object.entries(snap.images)) images[joinPath(prefix, path)] = paints;
                  let noted = false; // 속성 값·사진 실패는 멤버마다 한 번만(복사본을 다시 만들 때 겹치지 않게)
                  return (): InstanceNode => {
                    let inst: InstanceNode | null = null;
                    try {
                      inst = master.createInstance();
                      keepRoots.push({ node: inst, name });
                      const badProps = applyInstancePropValues(inst, ids, vals);
                      // 사진은 속성이 아니라 fill 오버라이드 — 멤버 원본 채움 전체(해시·scaleMode·imageTransform)를 이식한다.
                      const img = transplantImageFills(inst, images).failures;
                      if (!noted) {
                        noted = true;
                        for (const p of badProps) failures.push(t('component.fail.propValue', { name, prop: p }));
                        failures.push(...img.map((f) => `${name}: ${f}`));
                        if (badProps.length || img.length) propFailed.push(name);
                      }
                      return inst;
                    } catch (e) {
                      // 예상 밖 예외면 만든 인스턴스를 지우고 던진다(어디에도 남기지 않는다).
                      if (inst) { try { if (!inst.removed) inst.remove(); } catch { /* 이미 사라짐 */ } }
                      throw e;
                    }
                  };
                };
                // 마스터 자리 — 원본이 Components 페이지로 옮겨졌으므로 인스턴스 → 복사본 → 빈 자리(5번).
                restore([{ o: masterOrigin, make: makerFor(masterSnap, masterOrigin.name), label: master.name }]);
                // 나머지 멤버 — 검사 뒤 넣고 나서 지운다. 걸리면 원본 그대로(8번), 못 넣으면 원본 그대로(5번).
                for (const snap of snaps) {
                  if (snap === masterSnap) continue;
                  const name = snap.n.name;
                  const before = propFailed.length;
                  const r = replaceMember(snap.n, makerFor(snap, name), prefix);
                  if (r.result === 'replaced') continue;
                  // 묶지 않은 멤버는 속성 값 꼬리에서 뺀다 — 원본이 그대로라 따질 속성 값이 없다.
                  if (propFailed.length > before) propFailed.splice(before);
                  if (r.result === 'mismatch') {
                    fillKept.push(name);
                    failures.push(t('component.fail.fillKept', { name, causePart: t('component.fail.cause', { why: r.why ?? '' }) }));
                  } else {
                    placeFailed.push(name);
                    failures.push(t('component.fail.memberKept', { name, causePart: r.why ? t('component.fail.cause', { why: r.why }) : '' }));
                  }
                }
                // 루프 끝 일괄 expose는 중복 방지 — 이미 노출했으므로 containers에 넣지 않음.
                continue;
              }
            }

            // 세트(§4.7 "묶기" 5번 5단계) — 소가족마다 마스터 하나를 변형으로 만든다. 순서: ① 마스터 고르기
            // ② 마스터의 그림 자리(날 벡터 · 아이콘 프레임)를 아이콘 인스턴스로 ③ 세트로 합치기(접힘 속성 노출은 따로 없음)
            // ④ 마스터 자리 · 나머지 멤버 자리에 그 소가족 변형의 인스턴스 ⑤ 멤버 값을 레이어에 직접 적기 → 9번 기록 → 노출 → 되돌리기.
            // 지금 트리로 계획한다 — 안쪽 그룹이 이미 인스턴스가 됐을 수 있다(루프 전 스냅샷은 그 안을 펼쳐 둔다).
            const liveStruct = new Map<string, StructNode>();
            for (const m of g.members) { const n = byId.get(m.id); if (n && !n.removed) liveStruct.set(m.id, toStructNode(n)); }
            const vectorPlans = inferVaryingComponentProperties([...liveStruct.values()])
              .filter((p) => p.fromVector && p.layerPath != null);
            type Made = { comp: ComponentNode; variant: string; o: Origin; id: string; sf: (typeof subfamilies)[number]; type: string };
            const made: Made[] = [];
            for (const sf of subfamilies) {
              const head = sf.members[sf.master] ?? sf.members[0];
              const node = byId.get(head.id);
              if (!node) continue;
              // 아이콘 컴포넌트는 마스터를 컴포넌트로 바꾸기 **전에** 만든다(원본 그림을 복제한다).
              const icons = vectorPlans.map((p) => {
                const at = nodeAtPath(node, p.layerPath!);
                const live = liveStruct.get(head.id);
                const key = live ? structAtPathVectorKey(live, p.layerPath!) : null;
                return at && key ? iconRegistry.ensure(key, at, p.layerName) : null;
              });
              const o = captureOrigin(node);
              try {
                const comp = figma.createComponentFromNode(node);
                registered++;
                if (vectorPlans.length) {
                  const prefix = shapePrefix(comp, head.type);
                  failures.push(...swapVectorSlots(comp, vectorPlans
                    .map((p, k) => ({ layerName: p.layerName, layerPath: joinPath(prefix, p.layerPath!), icon: icons[k] }))
                    .filter((x) => !!x.icon)));
                }
                made.push({ comp, variant: formatVariant(sf.props), o, id: head.id, sf, type: head.type });
              } catch (e) {
                releaseOrigin(o);
                skipped++;
                failures.push(t('component.fail.componentize', { name: head.name, error: errText(e) }));
                // 마스터가 없으니 소가족의 나머지 멤버도 원본 그대로 — 조용히 두지 않고 알린다(§4.7 "인스턴스 자리" 5번 꼬리).
                sf.members.forEach((m, k) => {
                  if (k === sf.master) return;
                  placeFailed.push(m.name);
                  failures.push(t('component.fail.memberKept', { name: m.name, causePart: '' }));
                });
              }
            }
            /** 소가족의 나머지 멤버 → 그 변형의 인스턴스(넣고 나서 지운다 — "인스턴스 자리" 3번), 값은 레이어에 직접(⑤). */
            const placeExtras = async (x: Made): Promise<void> => {
              for (let k = 0; k < x.sf.members.length; k++) {
                if (k === x.sf.master) continue;
                const node = byId.get(x.sf.members[k].id);
                if (!node || node.removed) { skipped++; continue; }
                const name = node.name;
                const prefix = shapePrefix(x.comp, x.type);
                const make = async (): Promise<InstanceNode> => {
                  const inst = x.comp.createInstance();
                  try {
                    keepRoots.push({ node: inst, name }); // 9번 값 지키기의 기록 대상
                    const bad = await copyOverridesAsync(node, inst, prefix, {
                      mainOf: (n) => n.getMainComponentAsync(),
                      loadFont: (f) => figma.loadFontAsync(f),
                      isIcon: (n) => iconFrameKeyOf(n) !== undefined,
                      iconFor: (v) => {
                        const key = artKeyOf(v);
                        return key ? iconRegistry.ensure(key, v, v.name) : null;
                      },
                    });
                    for (const p of bad) failures.push(t('component.fail.propValue', { name, prop: p }));
                    if (bad.length) propFailed.push(name);
                    return inst;
                  } catch (e) {
                    try { if (!inst.removed) inst.remove(); } catch { /* 이미 사라짐 */ }
                    throw e;
                  }
                };
                const before = propFailed.length;
                const r = await replaceMemberAsync(node, make, prefix);
                if (r.result === 'replaced') continue;
                if (propFailed.length > before) propFailed.splice(before); // 원본 그대로 — 따질 속성 값이 없다
                if (r.result === 'mismatch') {
                  fillKept.push(name);
                  failures.push(t('component.fail.fillKept', { name, causePart: t('component.fail.cause', { why: r.why ?? '' }) }));
                } else {
                  placeFailed.push(name);
                  failures.push(t('component.fail.memberKept', { name, causePart: r.why ? t('component.fail.cause', { why: r.why }) : '' }));
                }
              }
            };
            if (made.length < 2) {
              // 결합 불가 → 단독으로 등록 + 원위치 인스턴스. 소가족 나머지 멤버도 그 단독의 인스턴스로.
              for (const x of made) { markReuse(x.comp, 'single', x.id); placeSingle(x.comp, x.o, setName); await placeExtras(x); }
              continue;
            }
            // 결합(핵심). 실패해도 컴포넌트가 소실되지 않게 **단독으로라도 등록**(반쪽 상태 방지).
            let set: ComponentSetNode;
            try {
              // combineAsVariants는 "부모와 같은 페이지" 제약 → **원본 페이지에서 결합 후** 컴포넌트 페이지로 이동.
              const home = pageOf(made[0].comp) ?? figma.currentPage;
              set = figma.combineAsVariants(made.map((x) => x.comp), home);
            } catch (e) {
              failures.push(t('component.fail.combine', { set: setName, error: errText(e) }));
              for (const x of made) { markReuse(x.comp, 'single', x.id); placeSingle(x.comp, x.o, setName); await placeExtras(x); }
              continue;
            }
            // 결합 성공 — 이름/이동/인스턴스는 **무조건** 수행(장식 단계 실패로 세트를 버리지 않음).
            set.name = setName;
            for (const x of made) if (x.variant) x.comp.name = x.variant; // 'Prop=value, ...'
            for (const x of made) markReuse(x.comp, 'variant', x.id); // 세트 자신에는 남기지 않는다
            page.appendChild(set); // Components 페이지로 이동
            try { arrangeSet(set); } catch (e) { failures.push(t('component.fail.arrange', { set: set.name, error: errText(e) })); } // 장식: 비치명
            set.x = cursorX;
            set.y = 0;
            cursorX += set.width + 48;
            sets++;
            containers.push({ container: set, scopes: made.map((x) => x.comp) });
            restore(made.map((x) => ({ o: x.o, make: instanceOf(x.comp, x.o.name), label: x.variant || set.name })));
            // ↑ 이 그룹 자리를 즉시 채운다(중첩 보존). 소가족의 나머지 멤버도 지금(노출 전에).
            for (const x of made) await placeExtras(x);
          }
        } finally {
          // 어느 경로에서든 남은 표지를 치운다(원본이 제자리에 남은 경우·예상 밖 중단). 이미 치운 것은 지나간다.
          for (const o of origins) releaseOrigin(o);
        }

        // 노출 직전 기록(§4.7 9번) — 등록한 컴포넌트·세트 안과 자리 인스턴스(자신 포함)의 모든 인스턴스.
        // 복사본으로 떼어졌거나 지워진 자리는 지나간다(떼어 낸 인스턴스는 removed다).
        for (const c of containers) keepRoots.push({ node: c.container, name: c.container.name });
        const mainOf = (n: InstanceNode) => n.getMainComponentAsync();
        const keepSnaps: OverrideSnap[] = [];
        const seen = new Set<string>();
        for (let k = 0; k < keepRoots.length; k++) {
          const { node } = keepRoots[k];
          if (node.removed) continue;
          // 같은 인스턴스가 두 뿌리에 걸리면(자리 인스턴스가 다른 컴포넌트 안에 든 경우) 먼저 들어온 자리만 남긴다 — 한 번만 센다.
          try { for (const sn of await snapshotOverrides(node, k, mainOf)) if (!seen.has(sn.instId)) { seen.add(sn.instId); keepSnaps.push(sn); } } catch { /* 읽기 실패 — 지킬 것이 없다 */ }
        }

        // 속성 자동 노출 — 등록한 각 컴포넌트/세트의 직속 레이어를 Text/Instance-swap/Boolean 속성으로.
        let exposed = exposedEarly;
        for (const c of containers) {
          try { exposed += exposeProperties(c.container, c.scopes).length; } catch (e) { failures.push(t('component.fail.exposeAll', { error: errText(e) })); }
        }
        // 노출로 기본값이 된 값을 되돌린다. 못 넣은 것은 자리마다 한 번 "속성 값을 못 넣은" 꼬리에(6번과 같다).
        const keepFailed = await restoreOverrides(keepSnaps, (id) => figma.getNodeByIdAsync(id), mainOf, (f) => figma.loadFontAsync(f));
        for (const [k, props] of keepFailed) {
          const name = keepRoots[k].name;
          for (const prop of props) failures.push(t('component.fail.propValue', { name, prop }));
          propFailed.push(name);
        }

        post({ type: 'COMPONENTS_RESULT', registered, skipped, sets, singles, exposed, icons: iconRegistry.created(), missing: [], failures, placeFailed, placeCloned, propFailed, fillKept, reused, reuseKept });
        if (registered || sets || reused.length) commitUndo(figma); // UX2 — 재사용만이어도 ⌘Z 한 번(§4.7 "재사용" 6번)
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
        const groups = groupByExactName(comps.map((n) => toStructNode(n)));
        let sets = 0;
        const missing: string[] = [];
        const singles: string[] = [];
        const failures: string[] = [];
        // 분류 대상 자신은 문서의 '기존 이름'에서 뺀다 — 안 그러면 자기와 충돌해 세트가 `Button2`가 된다.
        const groupNames = resolveGroupNames(
          groups.map((g) => g.members),
          await existingComponentNames(new Set(comps.map((c) => c.id))),
        ); // 등록과 동일 규칙
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
            try { arrangeSet(set); } catch (e) { failures.push(t('component.fail.arrange', { set: set.name, error: errText(e) })); }
            const childNames = set.children.filter((c): c is ComponentNode => c.type === 'COMPONENT').map((c) => c.name);
            const miss = missingVariants(childNames);
            if (miss.length) missing.push(`${set.name}: ${miss.join(' / ')}`);
            sets++;
          } catch (e) {
            failures.push(t('component.fail.combine', { set: groupNames[gi], error: errText(e) }));
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
      case 'GET_VAR_TABLE': {
        post({ type: 'VAR_TABLE', ...(await collectVarTable()) });
        break;
      }
      case 'UPDATE_VARIABLE': {
        await updateVariable(msg);
        break;
      }
      case 'SET_UI_SIZE': {
        // 최소화/펼치기만 — 저장하지 않는다.
        const mode = normalizeUiSize(msg.mode);
        figma.ui.resize(uiWidth(mode), uiHeight(mode));
        post({ type: 'UI_SIZE', mode });
        break;
      }
      case 'GET_SETTINGS': {
        let s = SETTINGS_DEFAULT;
        try {
          const raw = await figma.clientStorage.getAsync(SETTINGS_KEY);
          if (raw && typeof raw === 'object') {
            const o = raw as Record<string, unknown>;
            s = {
              base: typeof o.base === 'number' && isFinite(o.base) && o.base > 0 ? o.base : SETTINGS_DEFAULT.base,
              maxDepth: typeof o.maxDepth === 'number' && isFinite(o.maxDepth) && o.maxDepth >= 1 ? Math.round(o.maxDepth) : SETTINGS_DEFAULT.maxDepth,
              grid: typeof o.grid === 'number' && isFinite(o.grid) && o.grid >= 1 ? Math.round(o.grid) : SETTINGS_DEFAULT.grid,
            };
          }
        } catch {
          /* 저장소 접근 실패 → 기본값 */
        }
        post({ type: 'SETTINGS', base: s.base, maxDepth: s.maxDepth, grid: s.grid });
        break;
      }
      case 'SET_SETTINGS': {
        try {
          await figma.clientStorage.setAsync(SETTINGS_KEY, { base: msg.base, maxDepth: msg.maxDepth, grid: msg.grid });
        } catch {
          /* 보관 실패해도 이번 세션 동작에는 영향 없음 */
        }
        break;
      }
      case 'GET_VARIABLES': {
        post({ type: 'VARIABLES', vars: await collectVars() });
        break;
      }
      case 'GENERATE_DARK_MODE': {
        // 다크 Global을 새로 만드는 작업이라 토큰 생성과 같은 등급으로 잠근다.
        if (!requirePaid('tokens')) break;
        // toModeId 생략 시 themeApply가 Dark 모드를 ensure(없으면 addMode('Dark')).
        const r = await generateDarkMode(msg.collectionId, msg.fromModeId, msg.toModeId);
        post({ type: 'DARK_MODE_RESULT', ...r });
        if (r.created || r.realiased || r.modeCreated) {
          commitUndo(figma); // UX2: 모드 추가+채움 전체를 단일 Undo로
          await postPrereq();
        }
        post({ type: 'VARIABLES', vars: await collectVars() }); // 모드가 늘었을 수 있으니 목록 갱신
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
        if (!requirePaid('components')) break;
        const master = await figma.getNodeByIdAsync(msg.masterId);
        if (!master || (master.type !== 'FRAME' && master.type !== 'GROUP')) {
          post({ type: 'COMPONENTIZE_RESULT', master: '', properties: 0, instances: 0, images: 0, warnings: [t('similar.noMaster')], placeFailed: [] });
          break;
        }
        // 멤버 노드 수집(마스터 포함) → 정렬·컴포넌트화·인스턴스 교체는 similarApply에 위임.
        const memberNodes: SceneNode[] = [];
        for (const id of msg.frameIds) {
          const n = await figma.getNodeByIdAsync(id);
          if (n && 'type' in n) memberNodes.push(n as SceneNode);
        }
        if (memberNodes.length < 2) {
          post({ type: 'COMPONENTIZE_RESULT', master: '', properties: 0, instances: 0, images: 0, warnings: [t('similar.tooFew')], placeFailed: [] });
          break;
        }
        const r = await componentizeSimilar(master as SceneNode, memberNodes);
        // 결과의 모든 필드를 싣는다(placeFailed가 빠지면 결과 줄 꼬리·⚠가 동작하지 않는다 — §4.7 5번).
        post(componentizeResultMessage(r));
        if (r.instances) commitUndo(figma); // UX2: 컴포넌트화 전체를 단일 Undo로
        break;
      }
    }
  } catch (err) {
    // UX7: 실패한 작업 종류(op)도 함께 보내 UI가 해당 영역에 친절한 메시지를 띄운다.
    post({ type: 'ERROR', message: err instanceof Error ? err.message : String(err), op: msg?.type });
  }
};
