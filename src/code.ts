/* ============================================================
   code.ts — 샌드박스 엔트리 & 메시지 라우터 (모든 figma.* 호출 지점)
   ============================================================ */
import type { UiToCode, CodeToUi, RenameChange, VarInfo, VarMode, VarUpdateError, RoleRow, TokenState } from './shared/messages';
import { post } from './shared/messages';
import { t } from './lib/i18n'; // 화면에 보이는 문구는 i18n 한 곳에서(PR 4) — 플러그인 쪽도 같은 표를 쓴다
import { extractFromSelection } from './lib/extract';
import { createTokens, previewCreateTokens, createUsageRoles, createSemanticAliases, scanTextStyles, scanExistingTextStyles, createSemanticTextStyles, applyTextStyleRows, planExistingTextStyles, applyRegisteredTextStyles, textStyleCandidateTest, dropRemoteClusters, prunePaletteColors, editValueToFigma, createManualVariable, duplicateVariable, deleteVariable, VarNameError, VarGoneError } from './lib/variables';
import { applyVariableToNodes } from './lib/applyVar';
import { clusterTextStyles, nameTextStyles, nameTextStylesWithRowLabels, splitDecimalClusters, tsSig, anchorOfFor } from './lib/textStyles';
import type { TextSample } from './lib/textStyles';
import { bindSelection, bindSelectedItems, collectLocalMains, countDeleted, countUsage, findUsers, readVarInfos, unbindDeleted, type LocalMains } from './lib/bind';
import { userRadiusKeys } from './lib/sameValue';
import { deleteUnusedVariables, scanUnusedVariables } from './lib/unusedVars'; // 안 쓰는 변수 찾기(docs/unused-vars.md)
import { collectionTiers, collectionTierInfo, ownedCollection, ownedCollections, ownedIds } from './lib/collectionRoles';
import { renameSelection, writeRole, writeRoleFromName, writeNameKey, writeKept } from './lib/rename';
// ResolvedType·ScopeName은 변수 편집기(toValueCell)와 함께 걷혔다 — origin/main은 그 자리를
// 건드리지 않았으므로 import만 이쪽(삭제본)을 따른다.
import { rgbToHex, exportColorHex } from './lib/tokens';
import { ExportCollectionInput, ExportModeValue, ExportTextStyle, ExportVarInput, TokenKind, exportClashes, exportGlobalDupes, exportTokens, resolveExportModes, resolveExportTokens } from './lib/exporters';
import { generateDarkMode, darkPrereq, darkChangedBeforeError } from './lib/themeApply';
import { Tier, Feature, isTier } from './lib/entitlements';
import { LicenseCache, LicenseStatus, evaluateLicense, cacheFromVerify, normalizeLicenseCache, isVerifyErrCode } from './lib/license';
import { PURCHASE_URL, PORTAL_URL } from './lib/licenseConfig';
import { commitUndo } from './lib/undo';
import { UI_SIZE_KEY, UI_WIDTH, normalizeUiSize, uiHeight, uiWidth } from './lib/uiSize';
import type { VarCell, VarCollection, VarRow, VarType, LibraryVar } from './lib/varTable';
import { sameCell } from './lib/varTable';

/* IA v3: 창은 560 × 510 고정(2026-11-06 가로 400 → 480, 2026-11-12 V2 480 → 560), [—]로 최소화(140 × 104, 펼치기 버튼만). 높이 전환(660 ↔ 860)과 넓은 창(760)은 없앴다.
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
let unusedCancel = false; // 안 쓰는 변수 읽기 · 다시 확인 취소(docs/unused-vars.md §5 — bindCancel과 따로)
let bindFindTurn = 0; // 찾기(preview) 요청 차례(IA v4 §7) — 더 새 찾기가 있을 때만 앞 찾기를 버린다
/** 찾기 · 연결 요청 줄(IA v4 §7) — 앞 요청이 끝나야 다음이 돈다. 겹쳐 깨어나지 않는다. */
let bindChain: Promise<void> = Promise.resolve();
function acquireBind(): Promise<() => void> {
  const prev = bindChain;
  let release: () => void = () => {};
  bindChain = new Promise<void>((res) => (release = res));
  return prev.then(() => release);
}
/** 실제 연결(APPLY preview 아님 · APPLY_SELECTED)이 도는 중 — 찾기가 이것을 취소하지 않는다. */
let bindLinkRunning = false;
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
/**
 * 목록 기준 + 인스턴스의 메인 컴포넌트(ia-v3 §2.11 11번) — 추출 · 텍스트 스타일 세 길이 함께 쓴다.
 * roots: 목록 기준(메인 루트 안에 든 것은 메인 쪽이 덮으므로 뺀다) + 메인 단위 루트. unitOf: 메인 안 레이어 id → 메인 단위 id.
 */
async function withLocalMains(sel: readonly SceneNode[]): Promise<{ mains: LocalMains; roots: SceneNode[]; unitOf: Map<string, string> }> {
  const mains = await collectLocalMains(sel);
  const unitRoots = mains.units.flatMap((u) => u.roots);
  if (!unitRoots.length) return { mains, roots: [...sel], unitOf: new Map() };
  const rootIds = new Set(unitRoots.map((r) => r.id));
  const insideUnit = (n: BaseNode): boolean => {
    for (let p: BaseNode | null = n; p; p = p.parent) if (rootIds.has(p.id)) return true;
    return false;
  };
  const unitOf = new Map<string, string>();
  for (const u of mains.units) {
    const stack: SceneNode[] = [...u.roots];
    while (stack.length) {
      const n = stack.pop() as SceneNode;
      if (!unitOf.has(n.id)) unitOf.set(n.id, u.id);
      if ('children' in n) for (const c of (n as ChildrenMixin).children as readonly SceneNode[]) stack.push(c);
    }
  }
  return { mains, roots: [...sel.filter((r) => !insideUnit(r)), ...unitRoots], unitOf };
}
/** 글자 id들의 서로 다른 메인 단위 id(처음 나온 순서). */
const unitsOfIds = (ids: readonly string[] | undefined, unitOf: ReadonlyMap<string, string>): string[] => {
  const out: string[] = [];
  for (const id of ids ?? []) {
    const u = unitOf.get(id);
    if (u && !out.includes(u)) out.push(u);
  }
  return out;
};

const isPaid = (): boolean => currentTier() === 'paid';

/** 무료와 Semantic 컬렉션(IA v4 §4.9 · F2 · F10) — 무료면 플러그인 Semantic 컬렉션(`ownedCollection(…, 'semantic')`)에
    새 변수를 만들거나 그 안의 변수를 복제하지 못한다. 별칭 비율로 Semantic 계층인 사용자 컬렉션은 막지 않는다. */
async function paidSemanticTarget(collectionId: string | undefined): Promise<boolean> {
  if (isPaid() || !collectionId) return false;
  const cols = await figma.variables.getLocalVariableCollectionsAsync();
  return ownedCollection(cols, 'semantic')?.id === collectionId;
}

/** Paid 게이트: 아니면 PREMIUM_REQUIRED 안내 후 false. (미리보기/탐색은 호출 전에 허용)
 *  reqId: 거절된 요청의 reqId — 답에 그대로 싣는다(ia-v4 §4.11 T-P28 — UI가 그 작업만 끝낸다). */
function requirePaid(feature: Feature, reqId?: number): boolean {
  if (isPaid()) return true;
  post({ type: 'PREMIUM_REQUIRED', feature, ...(reqId != null ? { reqId } : {}) });
  return false;
}

interface LicenseNote { text: string; kind: 'ok' | 'warn'; tip?: string }

function postLicense(note?: LicenseNote, reqId?: number): void {
  const e = effective();
  post({
    ...(reqId != null ? { reqId } : {}), // GET_LICENSE · SET_LICENSE에 답할 때만(T-P29 ②)
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
async function postPrereq(reqId?: number): Promise<void> {
  try {
    const cols = await figma.variables.getLocalVariableCollectionsAsync();
    const vars = await figma.variables.getLocalVariablesAsync();
    // 계층: 플러그인 컬렉션은 그 역할, 사용자 컬렉션은 내용으로 판단(§2.13 13.3 · 13.4).
    const tiers = collectionTiers(cols, vars);
    const globalIds = new Set(cols.filter((c) => tiers.get(c.id) === 1).map((c) => c.id));
    // 거울 폐지 후 바인딩 대상은 3계층 전부 — 역할 없는 값은 Global에 붙는다(bind.ts).
    const bindableIds = new Set(cols.filter((c) => (tiers.get(c.id) ?? 0) > 0).map((c) => c.id));
    const globals = vars.filter((v) => globalIds.has(v.variableCollectionId));
    const hasGlobal = globals.length > 0;
    // Dark 값이 없는 색 수 · 옛 구조(Semantic에 Dark 모드) 여부(ia-v3 13.7 D-T1) — 다크 화면 알림 띠가 읽는다.
    const { darkUnfilled, darkOld, darkOldManual } = darkPrereq(cols, vars);
    // '이미 변수가 있다'를 먼저 알리는 안내용 개수 — 계층 안/밖을 나눠 센다(밖이면 연결에 못 쓴다).
    const tierVarList = vars.filter((v) => bindableIds.has(v.variableCollectionId));
    const tierVars = tierVarList.length;
    const tierColorVars = tierVarList.filter((v) => v.resolvedType === 'COLOR').length;
    const otherVars = vars.length - tierVars;
    post({ ...(reqId != null ? { reqId } : {}), type: 'PREREQ_STATE', hasGlobal, tierVars, tierColorVars, otherVars, darkUnfilled, darkOld, darkOldManual });
  } catch {
    /* 저장소 접근 실패 시 보고 생략(UI는 마지막 상태 유지) */
  }
}

/** 예외에서 사람이 읽을 메시지 추출(진단 노출용). */
function errText(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/* ---------- 변수 목록(다크 테마 생성의 컬렉션·모드 선택용) ---------- */

// 3계층(이름 또는 지정된 역할)만 목록 대상 — 계층이 아닌 컬렉션은 다루지 않는다.
function toVarInfo(v: Variable, col: VariableCollection, tier: number, owned?: 'global' | 'semantic'): VarInfo {
  const modes: VarMode[] = col.modes.map((m) => ({ modeId: m.modeId, name: m.name }));
  return { id: v.id, name: v.name, collectionId: col.id, collection: col.name, tier, ...(owned ? { owned } : {}), modes };
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
  const all = await figma.variables.getLocalVariablesAsync();
  const tierInfo = collectionTierInfo(cols, all);
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
        remoteName.set(id, rv?.remote ? rv.name : null); // 로컬 목록에 없고 원격도 아니면 지운 로컬 변수(피그마가 지운 변수도 id로 돌려준다)
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
  const collections: VarCollection[] = cols.map((c) => ({
    id: c.id,
    name: c.name,
    tier: tierInfo.get(c.id)?.tier ?? 0,
    modes: c.modes.map((m) => ({ modeId: m.modeId, name: m.name })),
    defaultModeId: c.defaultModeId,
    tierWhy: tierInfo.get(c.id)?.why,
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
      v.setValueForMode(modeId, await editValueToFigma(ev));
      applied.push(modeId);
    } catch (e) {
      return done(applied, { code: 'value', modeId, message: errText(e) });
    }
  }
  done(applied);
}

/**
 * 새 변수 · 복제 · 삭제(IA v4 §4.9). 실패는 ERROR{op, reqId, code?} — 이름 거절 'name' · 유료(무료의 플러그인 Semantic 컬렉션 — F2) 'paid' · 지워짐 'deleted'.
 * 성공하면 ⌘Z 한 번(commitUndo) 뒤 준비 상태를 다시 보낸다.
 */
async function manualVariableOp(msg: Extract<UiToCode, { type: 'CREATE_VARIABLE' | 'DUPLICATE_VARIABLE' | 'DELETE_VARIABLE' }>): Promise<void> {
  const fail = (message: string, code?: 'name' | 'paid' | 'deleted'): void =>
    post({ type: 'ERROR', message, op: msg.type, reqId: msg.reqId, ...(code ? { code } : {}) });
  try {
    if (msg.type === 'DELETE_VARIABLE') {
      await deleteVariable(msg.id);
      commitUndo(figma);
      post({ type: 'VARIABLE_DELETED', reqId: msg.reqId, id: msg.id });
    } else {
      if (msg.type === 'CREATE_VARIABLE') {
        if (await paidSemanticTarget(msg.collectionId)) return fail('semantic collection is paid', 'paid');
        const { variable } = await createManualVariable({ collectionId: msg.collectionId, name: msg.name, varType: msg.varType, values: msg.values, scopes: msg.scopes });
        commitUndo(figma);
        post({ type: 'VARIABLE_CREATED', reqId: msg.reqId, id: variable.id });
      } else {
        const src = await figma.variables.getVariableByIdAsync(msg.id);
        if (src && (await paidSemanticTarget(src.variableCollectionId))) return fail('semantic collection is paid', 'paid');
        const nv = await duplicateVariable(msg.id);
        commitUndo(figma);
        post({ type: 'VARIABLE_DUPLICATED', reqId: msg.reqId, newId: nv.id });
      }
    }
  } catch (e) {
    if (e instanceof VarNameError) return fail(e.message, 'name');
    if (e instanceof VarGoneError) return fail(e.message, 'deleted');
    return fail(errText(e));
  }
  await postPrereq();
}

/** 이 범위에서 쓰는 변수 중 삭제된 것(로컬도 라이브러리도 아닌 id). */
async function deletedVarIds(roots: readonly SceneNode[]): Promise<Set<string>> {
  const { usage } = countUsage(roots);
  const local = new Set((await figma.variables.getLocalVariablesAsync()).map((v) => v.id));
  const out = new Set<string>();
  for (const id of usage.keys()) {
    if (local.has(id)) continue;
    const v = await figma.variables.getVariableByIdAsync(id).catch(() => null);
    if (!v?.remote) out.add(id); // 지운 로컬 변수도 id로 읽히므로 원격(라이브러리)만 살아 있다고 본다
  }
  return out;
}

/**
 * 변수 사용 조회(IA v4 §4.1 카드 2 · 3) — 직접 연결만. 로컬이 아닌 id를 라이브러리 / 삭제됨으로 가른다.
 * 간접(별칭이 가리키는 변수)은 세지 않는다 — 별칭 사슬을 따라가지 않는다.
 * 삭제된 변수 자리 수는 연결 풀기와 같은 자리(deletedBindings)로 센다.
 */
async function collectUsage(nodeIds: readonly string[] | undefined): Promise<Omit<Extract<CodeToUi, { type: 'USAGE_RESULT' }>, 'type' | 'reqId'>> {
  const roots = await resolveRoots(nodeIds);
  const { usage, scanned } = countUsage(roots);
  const local = new Set((await figma.variables.getLocalVariablesAsync()).map((v) => v.id));
  const out: Record<string, { places: number; layers: number }> = {};
  const libraryVars: LibraryVar[] = [];
  const deletedIds = new Set<string>();
  for (const [id, u] of usage) {
    if (local.has(id)) { out[id] = u; continue; }
    const v = await figma.variables.getVariableByIdAsync(id).catch(() => null);
    if (!v?.remote) { deletedIds.add(id); continue; } // 지운 로컬 변수도 id로 읽힌다 — 원격만 라이브러리
    out[id] = u;
    const col = await figma.variables.getVariableCollectionByIdAsync(v.variableCollectionId).catch(() => null);
    const modeId = col?.defaultModeId ?? Object.keys(v.valuesByMode)[0];
    libraryVars.push({ id: v.id, name: v.name, collection: col?.name ?? '', type: v.resolvedType as VarType, value: await libCell(modeId ? v.valuesByMode[modeId] : undefined), aliasTargets: [], scopes: [...(v.scopes ?? [])] });
  }
  return { usage: out, libraryVars, deleted: countDeleted(roots, deletedIds), scanned };
}

async function collectVars(): Promise<VarInfo[]> {
  const cols = await figma.variables.getLocalVariableCollectionsAsync();
  const colById = new Map(cols.map((c) => [c.id, c]));
  const vars = await figma.variables.getLocalVariablesAsync();
  const tiers = collectionTiers(cols, vars);
  const owned = ownedCollections(cols);
  const out: VarInfo[] = [];
  for (const v of vars) {
    const col = colById.get(v.variableCollectionId);
    const tier = col ? tiers.get(col.id) ?? 0 : 0;
    if (!col || !tier) continue;
    out.push(toVarInfo(v, col, tier, owned.global === col ? 'global' : owned.semantic === col ? 'semantic' : undefined));
  }
  out.sort((a, b) => a.collection.localeCompare(b.collection) || a.name.localeCompare(b.name));
  return out;
}

/** Paid 게이트(텍스트 스타일): 아니면 PREMIUM_REQUIRED 안내 후 false. */
function requireTextStyles(reqId?: number): boolean {
  return requirePaid('textStyles', reqId);
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
  // 선택 표시줄 문구(§4.1)와 목록 기준 비교(PR 2)용 — 첫 레이어 이름과 선택 노드 ID.
  const firstName = sel[0]?.name ?? '';
  const ids = sel.map((n) => n.id);
  post({ type: 'SELECTION_STATE', count: sel.length, scanned, bindable, capped, selfSelect, firstName, ids });
  selfSelect = false;
}
figma.on('selectionchange', postSelection);

/** 요청에 답하는 메시지가 아닌 알림 — reqId를 싣지 않는다(ia-v4 B.19a). 작업 뒤 밀어 보내는 PREREQ_STATE · VARIABLES는 모듈 post로 보낸다. */
const NOTICE_TYPES: ReadonlySet<CodeToUi['type']> = new Set<CodeToUi['type']>(['PROGRESS', 'SELECTION_STATE', 'REQUEST_VERIFY', 'REQUEST_DEACTIVATE']);

figma.ui.onmessage = async (msg: UiToCode) => {
  // 이 요청에 답하는 메시지는 그 reqId를 싣는다(ia-v4 §4.11 T-P29 ②) — 알림(진행률 · 선택 · 검증 요청)은 빼고.
  const rid = msg.reqId;
  const reply = (m: CodeToUi): void => post(rid != null && m.reqId == null && !NOTICE_TYPES.has(m.type) ? ({ ...m, reqId: rid } as CodeToUi) : m);
  try {
    switch (msg.type) {
      case 'EXTRACT': {
        const sel = await resolveRoots(msg.nodeIds);
        // 인스턴스의 메인 컴포넌트 안 값도 뽑는다(ia-v3 §2.11 11번) — 메인을 더한 인스턴스는 "인스턴스 안쪽" 건너뜀을 남기지 않는다.
        const wm = await withLocalMains(sel);
        // 연결 찾기와 같은 자리 판정(ia-v4 §2.9 S2-P2 · S2-P7): 알약 반경 판정 집합(찾기 색인과 같은 변수 읽기) · 메인을 따르는 인스턴스 루트 자리 ·
        // 텍스트 스타일 후보 글자. 값을 직접 고르기도 같은 처리라 함께 바뀐다.
        const { tokens, warnings } = extractFromSelection(wm.roots, new Set(wm.mains.mainOf.keys()), {
          userRadiusKeys: userRadiusKeys((await readVarInfos()).infos),
          mainOf: wm.mains.mainOf,
          textStyleNode: await textStyleCandidateTest(wm.roots),
        }); // 쓰임 이름은 주인을 쓰지 않는다(§2.12 12.12 N-D1)
        reply({ type: 'EXTRACT_RESULT', tokens, warnings, selection: sel.length, ...(msg.reqId != null ? { reqId: msg.reqId } : {}) });
        break;
      }
      case 'CREATE_TOKENS': {
        // 실제 변수 생성 중 Semantic까지 만드는 것만 Paid(미리보기는 비파괴 읽기라 허용). globalOnly(무료 규칙 — Global만,
        // `createUsageRoles`를 돌리지 않음)는 무료도 통과한다(IA v4 §4.3 "무료 — 무료 규칙 PR 뒤" · F1 · F4 · F8).
        if (!msg.preview && !msg.globalOnly && !requirePaid('tokens', msg.reqId)) break;
        // UX1: preview면 변수를 만들지 않고 예정 수만 집계. base는 값 환산에 쓰이므로 양쪽 다 전달.
        const s = msg.preview ? await previewCreateTokens(msg.tokens, msg.base) : await createTokens(msg.tokens, msg.base);
        // 쓰임 역할 — Global을 만든 직후 같은 처리 · 같은 ⌘Z 안에서(§2.12 12.10). 미리보기는 만들 수만 센다.
        // 같은 이름의 직접 만든 변수라 건너뛴 토큰은 그 토큰을 가리킬 역할도 만들지 않는다(§4.9).
        const roleTokens = s.skippedManual ? msg.tokens.filter((x) => !s.skippedManualNames.has(x.name)) : msg.tokens;
        const roleRows: RoleRow[] = [];
        const roles = msg.globalOnly ? 0 : await createUsageRoles(roleTokens, !!msg.preview, s.globalOf, msg.preview ? roleRows : undefined, s.finalName);
        // 팔레트 재적용(replacePalette): 이번 팔레트에 없는 이전 팔레트 색 변수 정리(사용자 변수 보존).
        // 무료는 Global 안에서만 지운다(Semantic을 건드리지 않음 — ia-v4 §4.3a "브랜드 팔레트 무료").
        const pruned = !msg.preview && msg.replacePalette ? await prunePaletteColors(msg.tokens.map((t) => t.name), { globalOnly: !isPaid() }) : 0;
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
        if (s.skippedManual) summary += t('create.sumManual', { n: s.skippedManual });
        // 미리보기는 토큰별 상태 · Semantic 줄을 함께 싣는다(IA v4 §4.3 — 만들기 화면의 상태 태그 · Semantic 묶음).
        const tokenStates: Record<string, TokenState> | undefined = msg.preview && s.tokenStates ? Object.fromEntries(s.tokenStates) : undefined;
        reply({
          type: 'CREATE_RESULT',
          created: s.created,
          updated: s.updated,
          summary,
          preview: msg.preview,
          roles,
          ...(s.skippedManual ? { skippedManual: s.skippedManual } : {}),
          ...(msg.reqId != null ? { reqId: msg.reqId } : {}),
          ...(msg.preview ? { tokenStates: tokenStates ?? {}, roleRows } : {}),
        });
        if (!msg.preview) {
          commitUndo(figma); // UX2: 토큰 생성 전체를 단일 Undo로
          await postPrereq(); // #11: 토큰 생성 → 시맨틱/바인딩 전제 충족 갱신
        }
        break;
      }
      case 'APPLY': {
        // 찾기는 한 번에 하나(IA v4 §7) — 앞 찾기를 멈추고 끝날 때까지 기다린다.
        // liveVarIds · bindCancel이 모듈 전역이라 겹쳐 돌면 판정과 취소가 틀어진다.
        // 실제 연결(preview 아님 · APPLY_SELECTED)은 취소하지 않고 끝나길 기다린다(마법사 연결 — §4.3).
        // 차례는 찾기(preview)끼리만 비교한다 — 연결이 끼어들어도 마지막 찾기는 버리지 않는다(응답이 늘 온다).
        const myTurn = msg.preview ? ++bindFindTurn : bindFindTurn;
        if (!bindLinkRunning) bindCancel = true; // 돌던 찾기를 멈춘다(실제 연결은 멈추지 않는다)
        const release = await acquireBind();
        if (msg.preview && myTurn !== bindFindTurn) { release(); break; } // 기다리는 사이 더 새 요청이 왔다 — 이 찾기는 버린다(UI도 reqId로 버림). 실제 연결은 버리지 않는다
        bindCancel = false; // UX6: 새 작업 시작 시 취소 플래그 초기화
        bindLinkRunning = !msg.preview;
        try {
        // UX1: preview면 dry-run(바인딩 없이 집계). UX3: 사유별 스킵(reasons). UX6: 진행률·취소.
        const sel = await resolveRoots(msg.nodeIds);
        const r = await bindSelection(
          sel,
          !msg.preview,
          {
            onProgress: (done, total) => reply({ type: 'PROGRESS', op: 'bind', done, total }),
            shouldCancel: () => bindCancel,
            yieldToEvents: () => new Promise<void>((resolve) => setTimeout(resolve, 0)),
          },
          {
            // 만들기 실행의 연결(IA v4 §4.3) — 텍스트 스타일 후보 글자의 글자 자리는 붙이지 않는다(실제 연결만).
            ...(msg.skipTextStyleNodes && !msg.preview ? { skipTextStyleNode: await textStyleCandidateTest((await withLocalMains(sel)).roots) } : {}), // 원격 목록 범위 = 미리보기와 같은 루트(B.40)
            // 무료 자동 연결은 새 Semantic을 만들지 않는다 — 찾기 · 실제 연결 · 카드 1의 m이 같은 규칙(IA v4 §2.3-7 · F6).
            ...(isPaid() ? {} : { noNewRoles: true }),
            // 만들기 실행의 연결 단계 — 켠 줄의 값만(IA v4 §4.3 B.35 ①)
            ...(msg.only && !msg.preview ? { only: msg.only } : {}),
            // 꺼진 줄의 값 — 거름에서 버린 자리 가운데 이것과 맞는 자리만 make-off로 센다(IA v4 §4.3 B.36)
            ...(msg.only && msg.off?.length && !msg.preview ? { off: msg.off } : {}),
          },
        );
        reply({
          type: 'APPLY_RESULT',
          bound: r.bound,
          skipped: r.skipped,
          reasons: r.reasons,
          preview: msg.preview,
          cancelled: r.cancelled,
          candidates: r.candidates, // #6: 미리보기 후보(dry-run만)
          nodes: r.nodes, // #13: 미리보기 트리 맥락
          skips: r.skips, // 사유별 건너뛴 레이어(늘 · 상한까지)
          skipLayers: r.skipLayers, // 사유별 레이어 수(상한 전) — 건너뛴 곳 목록의 "레이어 {n}개"(미리보기에서 쓴다)
          reqId: msg.reqId, // UI가 낡은 응답을 가려낸다
          newRoles: r.newRoles,
          counts: r.counts as Record<string, Record<string, number>> | undefined, // 사유 × 종류(카드 숫자, IA v4 §4.1)
          ...(r.mains ? { mains: r.mains } : {}), // 함께 걸은 선택 밖 메인 컴포넌트 단위(ia-v3 §2.11 11번)
          ...(r.mainsBound ? { mainsBound: r.mainsBound } : {}),
          ...(r.make ? { make: r.make } : {}), // 새로 만들 값(ia-v4 §2.9 S2-P7 — 카드의 n · q)
        });
        if (!msg.preview) {
          commitUndo(figma); // UX2: 바인딩(취소 시 부분 포함)을 단일 Undo로
          selfSelect = true; // 선택이 바뀐 게 아니다 — UI가 방금 그린 결과 트리를 지우지 않게
          postSelection(); // 선택 상태 갱신(선택은 그대로라 selectionchange가 안 온다)
        }
        } finally {
          bindLinkRunning = false;
          release();
        }
        break;
      }
      case 'UNBIND_DELETED': {
        // 삭제된 변수 연결 풀기(IA v4 §4.1 카드 3) — 세기와 같은 자리(deletedBindings)만.
        const roots = await resolveRoots(msg.nodeIds);
        const deletedIds = await deletedVarIds(roots);
        const r = await unbindDeleted(roots, deletedIds);
        if (r.unbound) commitUndo(figma);
        reply({ type: 'DELETED_UNBOUND', reqId: msg.reqId, ...r });
        if (r.unbound) await postPrereq();
        break;
      }
      case 'SCAN_USAGE': {
        // 변수 목록의 사용 수(보기 전용) — 연결 카드의 미리보기·결과와 무관하다.
        reply({ type: 'USAGE_RESULT', reqId: msg.reqId, ...(await collectUsage(msg.nodeIds)) });
        break;
      }
      case 'FIND_VAR_USERS': {
        const r = findUsers(await resolveRoots(msg.nodeIds), new Set(msg.varIds));
        reply({ type: 'VAR_USERS', reqId: msg.reqId, layers: r.nodes.slice(0, msg.limit).map((n) => ({ id: n.id, name: n.name })), totalLayers: r.nodes.length, places: r.places });
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
        reply({ type: 'SELECT_RESULT', found: pick.length, requested: r.nodes.length, capped: r.nodes.length > SELECT_CAP });
        break;
      }
      case 'CANCEL': {
        if (msg.op === 'unused') {
          unusedCancel = true; // 안 쓰는 변수 읽기 · 확인만 — 찾기(bindCancel)는 건드리지 않는다(docs/unused-vars.md §5)
          break;
        }
        if (bindLinkRunning) break; // 실제 연결은 취소하지 않는다(IA v4 §4.3 — 마법사 연결)
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
        reply({ type: 'SELECT_RESULT', found: onPage.length, requested: msg.ids.length, capped: msg.ids.length > SELECT_CAP });
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
        // 찾기와 겹쳐 돌지 않게(IA v4 §7) — 돌던 찾기를 멈추고 끝나길 기다린 뒤 연결한다.
        if (!bindLinkRunning) bindCancel = true;
        const releaseLink = await acquireBind();
        bindCancel = false;
        bindLinkRunning = true;
        try {
          // 텍스트 스타일이 먼저(IA v4 §4.2) — 켠 스타일 줄의 글자에 스타일을 붙인 뒤 변수 자리를 연결한다. 한 번의 ⌘Z.
          const ts = msg.textStyles?.length ? await applyTextStyleRows(msg.textStyles) : null;
          if (ts?.applied) written += ts.applied;
          const r = await bindSelectedItems(msg.items, {
            onProgress: (done, total) => reply({ type: 'PROGRESS', op: 'link', done, total }),
            yieldToEvents: () => new Promise<void>((resolve) => setTimeout(resolve, 0)),
            onBound: (n) => { written = (ts?.applied ?? 0) + n; },
            onCreated: (n) => { made = n; },
          });
          // 붙인 메인 단위(ia-v3 §2.11 11번) — 변수 자리 ∪ 스타일을 붙인 글자(textStyles[].mainIds, nodeIds와 같은 순서)
          const mainsBound = [...r.mainsBound];
          if (ts?.appliedIds?.length && msg.textStyles) {
            const mainOfText = new Map<string, string>();
            for (const row of msg.textStyles) row.nodeIds.forEach((id, i) => { const m = row.mainIds?.[i]; if (m) mainOfText.set(id, m); });
            for (const id of ts.appliedIds) { const m = mainOfText.get(id); if (m && !mainsBound.includes(m)) mainsBound.push(m); }
          }
          reply({ type: 'APPLY_RESULT', bound: r.bound, skipped: r.skipped, reasons: r.reasons, skips: r.skips, reqId: msg.reqId, newRoles: r.newRoles, ...(ts ? { textStylesApplied: ts.applied, textStylesSkipped: ts.skipped } : {}), ...(mainsBound.length ? { mainsBound } : {}) });
          // 역할을 하나라도 만들었으면 아무것도 붙이지 못했어도 묶음을 닫는다 — 연결 한 번 = ⌘Z 한 번(§2.12 12.9).
          if (r.bound || r.newRoles || ts?.applied) {
            commitUndo(figma); // UX2: 선택 바인딩 전체(마지막 묶음 뒤 한 번)를 단일 Undo로
            committed = true;
            selfSelect = true;
            postSelection();
          }
        } finally {
          if ((written > 0 || made > 0) && !committed) commitUndo(figma);
          bindLinkRunning = false;
          releaseLink();
        }
        break;
      }
      case 'RENAME': {
        const r = await renameSelection(await resolveRoots(msg.nodeIds), { apply: msg.apply, maxDepth: msg.maxDepth });
        reply({ type: 'RENAME_RESULT', changes: r.changes, nodes: r.nodes, applied: r.applied, ...(msg.reqId != null ? { reqId: msg.reqId } : {}) });
        if (r.applied && r.changes.length) {
          commitUndo(figma); // UX2: 리네임 전체를 단일 Undo로
        }
        if (r.applied) {
          selfSelect = true;
          postSelection(); // 선택 상태 갱신(선택은 그대로라 selectionchange가 안 온다)
        }
        break;
      }
      case 'RENAME_APPLY': {
        // #7: 미리보기 트리에서 체크한 항목만 직접 적용(재계산 없이 id→after 그대로).
        // 이름과 함께 dsRole도 기록 — 이름 정리 자신과 텍스트 스타일 label 판정(`dsRoleOwner`)이 읽는다.
        const changes: RenameChange[] = [];
        let roleWrites = 0; // 이름은 그대로면서 역할만 새로 기록된 노드 수(undo 묶음 판단용)
        for (const { id, before: expectedBefore, after, role, nameKey, kept } of msg.items) {
          const node = await figma.getNodeByIdAsync(id);
          if (!node || !('name' in node)) continue; // 소실 노드는 graceful skip
          const before = node.name;
          if (before !== expectedBefore) continue; // 미리보기 이후 이름이 바뀐 노드는 stale 적용 방지
          if (before !== after) node.name = after;
          // 이름만 바꾸면 역할 기록이 남지 않는다 — 마법사 경로(renameSelection)는
          // 이미 남기므로 판넬 경로도 같이 남긴다.
          // **이름이 그대로인 노드에도** 기록한다(멱등) — 옛 리네임 결과·손으로 지은 이름에
          // 역할을 채워 넣는 유일한 경로다. 다만 '바뀐 것'으로 세지는 않는다.
          // 두 브랜치가 같은 구멍을 다르게 막았다 — 둘 다 남긴다. 미리보기가 이미 역할을
          // 정해 보냈으면(role) 그 값을 그대로 쓰고, 없을 때만 origin/main의 이름 기반
          // 추론으로 물러선다. 이름에서 뽑는 쪽은 알려진 역할 토큰으로 끝나는 이름만
          // 건지므로, 앞의 경로를 이걸로 대체하면 그 외 이름의 역할이 도로 안 남는다.
          if (role ? writeRole(node as SceneNode, role) : writeRoleFromName(node as SceneNode, after)) {
            roleWrites++;
          }
          // 떼기 전 이름(ia-v4 §4.4) — 있으면 기록, 없으면 지운다. 바뀌었으면 역할 기록처럼 센다(undo 묶음).
          if (writeNameKey(node as SceneNode, nameKey ?? null)) roleWrites++;
          // 지킨 이름 표시(ia-v4 §4.4 "S-2b 이름 보존" SC-D51) — 사람 이름을 지킨 항목이면 지금 이름을, 아니면 지운다. 바뀌었으면 센다(undo 묶음).
          if (writeKept(node as SceneNode, kept ? after : null)) roleWrites++;
          // node.name은 위(before !== after)에서 이미 썼다 — origin/main이 여기 둔 대입은
          // 그 줄과 겹쳐서 걷는다.
          if (before === after) continue;
          changes.push({ id, before, after });
        }
        reply({ type: 'RENAME_RESULT', changes, nodes: [], applied: true, ...(msg.reqId != null ? { reqId: msg.reqId } : {}) });
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
        if (!requirePaid('semantics', msg.reqId)) break;
        const s = await createSemanticAliases(msg.map);
        reply({ type: 'SEMANTICS_RESULT', created: s.created, updated: s.updated, aliased: s.aliased, missing: s.missing, ...(s.skippedManual ? { skippedManual: s.skippedManual } : {}) });
        commitUndo(figma); // UX2: 시맨틱 별칭 생성을 단일 Undo로
        await postPrereq(); // #11: 시맨틱 별칭(바인딩 가능 변수) 생성 → 전제 갱신
        break;
      }
      case 'SCAN_TEXT_STYLES': {
        // 스캔(미리보기)도 Paid — 등록이 Paid라 스캔만 열어두면 막다른 길(ROADMAP §5).
        // 마법사의 텍스트 스타일 단계도 Paid 전용이라 Free 마법사는 여기 오지 않는다.
        if (!requirePaid('textStyles', msg.reqId)) break;
        // 이름은 언제나 KRDS 규칙(heading/large… — docs/text-style-krds.md) — 행 라벨은 아래 NAME_TEXT_STYLES_BY_ROW가 덧입힌다.
        // nodeIds: 목록 기준(없으면 지금 선택). make 스캔은 만들기 화면의 후보 읽기 — 「왼쪽 글자로 이름 채우기」가
        // 쓸 표본(lastTextSamples)을 덮어쓰지 않는다(IA v4 §4.3 — 8a 뒤 reqId는 모든 요청에 실려 make로 가린다, B.19a). existing은 모든 스캔에.
        // ① 후보 읽기 — 인스턴스의 메인 컴포넌트 안 글자도 표본으로(ia-v3 §2.11 11번)
        const scanRoots = (await withLocalMains(await resolveRoots(msg.nodeIds))).roots;
        const { samples, warnings, nodeById } = await scanTextStyles(scanRoots);
        if (!msg.make) lastTextSamples = samples;
        const existing = await scanExistingTextStyles();
        // 앵커 없는 소수 크기 군집은 이름 짓기에서 빼 흐린 줄로(§2.11 11번 "글자 크기도 정수만")
        const { rest, decimalRows } = splitDecimalClusters(clusterTextStyles(samples), existing);
        // 만들기 탭(make) — 원격 스타일과 같은 묶음은 후보에서 뺀다(IA v4 §4.2 B.40 RT-D5). 타이포 화면 스캔은 그대로.
        const anchorOf = anchorOfFor(existing);
        const kept = msg.make && nodeById ? await dropRemoteClusters(rest, nodeById, scanRoots, (c) => anchorOf(c) !== undefined) : rest;
        const styles = nameTextStyles(kept, existing);
        // existing은 모든 스캔에 싣는다 — 이름 겹침 잠금 · 기본 램프(rampToSpecs)의 예약 이름(docs/text-style-krds.md §6).
        const existingSigs = existing.map((e) => ({ name: e.name, sig: tsSig(e) }));
        reply({ type: 'TEXT_STYLE_CANDIDATES', styles, decimalRows, warnings, existing: existingSigs });
        break;
      }
      case 'NAME_TEXT_STYLES_BY_ROW': {
        if (!requirePaid('textStyles', msg.reqId)) break; // 스캔 후속 — 스캔과 같은 등급
        // 방금 스캔한 표본을 그대로 다시 이름 짓는다(캔버스 재탐색 없음) — 사용자가 보고 있는 표와
        // 같은 입력이어야 결과가 예측 가능하다. 등록된 스타일은 그 사이 바뀔 수 있어 새로 읽는다.
        // 빈 후보를 돌려보내면 UI가 '텍스트를 못 찾음'으로 읽고 기본 램프로 표를 덮는다 — 오류로 알린다.
        if (!lastTextSamples.length) {
          reply({ type: 'ERROR', message: t('textStyle.needScan'), op: 'NAME_TEXT_STYLES_BY_ROW' });
          break;
        }
        const existing = await scanExistingTextStyles();
        const r = nameTextStylesWithRowLabels(lastTextSamples, existing);
        reply({ type: 'TEXT_STYLE_CANDIDATES', styles: r.styles, decimalRows: r.decimalRows, warnings: [], labeled: r.labeled, fallback: r.fallback });
        break;
      }
      case 'CREATE_TEXT_STYLES': {
        if (!requireTextStyles(msg.reqId)) break;
        const r = await createSemanticTextStyles(msg.styles);
        // 바로 연결(IA v4 §4.3 "타이포 등록") — 방금 등록 · 갱신한 스타일만 그 루트들의 글자에 붙인다. 같은 메시지라 ⌘Z 한 번.
        // ② 바로 연결 — 메인 안 글자에도 붙이고, 붙인 글자의 메인 단위를 mainsApplied로(ia-v3 §2.11 11번)
        const wm = msg.applyTo ? await withLocalMains(await resolveRoots(msg.applyTo)) : null;
        const ap = wm ? await applyRegisteredTextStyles(wm.roots, r.styleIds) : null;
        const mainsApplied = wm && ap ? unitsOfIds(ap.appliedIds, wm.unitOf) : [];
        reply({
          type: 'TEXT_STYLES_RESULT',
          created: r.created,
          updated: r.updated,
          bound: r.bound,
          missing: r.missing,
          notes: r.notes,
          ...(msg.reqId != null ? { reqId: msg.reqId } : {}),
          ...(ap ? { applied: ap.applied, applySkipped: ap.applySkipped, applyReasons: ap.applyReasons } : {}),
          ...(mainsApplied.length ? { mainsApplied } : {}),
        });
        commitUndo(figma); // UX2: 변수+스타일 생성(+ 바로 연결)을 단일 Undo로
        await postPrereq(); // 스타일·시맨틱 변수 생성 반영 → 「기존만 연결」 등 전제 게이트 갱신
        break;
      }
      case 'PREVIEW_TEXT_STYLES': {
        // 기존 스타일 연결 미리보기(IA v4 §4.2) — 쓰지 않는다.
        // ③ 연결 화면 — 메인 안 글자도 줄에, 글자마다 메인 단위 id(c를 셀 때 — ia-v3 §2.11 11번)
        const wm = await withLocalMains(await resolveRoots(msg.nodeIds));
        const r = await planExistingTextStyles(wm.roots);
        const rows = wm.unitOf.size ? r.rows.map((row) => ({ ...row, mainIds: row.nodeIds.map((id) => wm.unitOf.get(id) ?? null) })) : r.rows;
        reply({ type: 'TEXT_STYLES_PREVIEW', reqId: msg.reqId, rows, skipReasons: r.skipReasons });
        break;
      }
      case 'GET_COLLECTIONS': {
        const cols = await figma.variables.getLocalVariableCollectionsAsync();
        reply({ type: 'COLLECTIONS', collections: cols.map((c) => ({ id: c.id, name: c.name })) });
        postSelection(); // UI 초기화 시점 — 현재 선택 상태도 함께 전송(UX5).
        break;
      }
      case 'GET_PREREQ': {
        await postPrereq(msg.reqId); // #11: 단계 전제 상태(시작·탭 전환 시) — GET_PREREQ에 답하므로 reqId
        break;
      }
      case 'GET_LICENSE': {
        postLicense(undefined, msg.reqId);
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
        postLicense(undefined, msg.reqId);
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
              reply({ type: 'REQUEST_DEACTIVATE', key: prev.key, instanceId: prev.instanceId });
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
          reply({ type: 'REQUEST_DEACTIVATE', key: cache.key, instanceId: cache.instanceId });
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
        const vars = await figma.variables.getLocalVariablesAsync();
        const tiers = collectionTiers(cols, vars);
        // 같은 이름은 내보내기에서 앞의 것 하나만 남는다(dedupeByName) — 같은 계층 안에서는 사용자 컬렉션 먼저 · 목록 순(§2.13 13.5).
        const owned = ownedIds(cols);
        const colIdx = new Map(cols.map((c, i) => [c.id, i]));
        const rank = (id: string): number => (owned.has(id) ? 1e6 : 0) + (colIdx.get(id) ?? 0);
        // 로컬 변수 전부(내보내지 않는 것도 — 별칭 사슬을 따라가려고), 값은 그 컬렉션의 기본 모드(ia-v3 §4.4 "별칭 대상이 내보내지 않는 변수일 때").
        const inputs: ExportVarInput[] = [];
        for (const v of [...vars].sort((a, b) => rank(a.variableCollectionId) - rank(b.variableCollectionId))) {
          const col = colById.get(v.variableCollectionId);
          if (!col) continue;
          // 한 모드 값 → 별칭 대상 id 또는 값(색은 투명도가 있으면 #rrggbbaa — 변수 탭과 같은 기준, ia-v3 §2.11)
          const read = (raw: VariableValue | undefined): ExportModeValue => {
            if (raw && typeof raw === 'object' && 'type' in raw && (raw as VariableAlias).type === 'VARIABLE_ALIAS') return { alias: (raw as VariableAlias).id };
            if (v.resolvedType === 'COLOR' && raw && typeof raw === 'object' && 'r' in raw) return { value: exportColorHex(raw as RGBA) };
            return { value: raw as string | number | boolean };
          };
          const inp: ExportVarInput = { id: v.id, name: v.name, tier: tiers.get(col.id) ?? 0, type: v.resolvedType, kind: kindOf(v), collectionId: col.id, collectionName: col.name, ...read(v.valuesByMode[col.defaultModeId]) };
          if (v.description) inp.description = v.description; // #16: 원본 단위("160%") 내보내기 우선
          // 기본이 아닌 모드 값 — 모드 블록(ia-v3 §4.4 "모드 블록")
          const others = col.modes.filter((m) => m.modeId !== col.defaultModeId);
          if (others.length) inp.modeValues = Object.fromEntries(others.map((m) => [m.modeId, read(v.valuesByMode[m.modeId])]));
          inputs.push(inp);
        }
        const tokens = resolveExportTokens(inputs); // 내보내는 계층(1 · 2)만, 별칭은 남는 변수를 가리키거나 값으로 풂
        const modeCols: ExportCollectionInput[] = [...cols]
          .sort((a, b) => rank(a.id) - rank(b.id)) // 13.5 순서 — 모드 블록 머리 이름의 "첫 컬렉션"
          .map((c) => ({ id: c.id, tier: tiers.get(c.id) ?? 0, defaultModeId: c.defaultModeId, modes: c.modes }));
        const modes = resolveExportModes(inputs, modeCols);
        // 이름순은 코드 단위 비교(언어 설정 무관 — exporters.ts와 같은 기준). W3C 키 순서를 정하고, CSS는 exporters가 묶음마다 다시 정렬한다.
        // 같은 이름끼리는 안정 정렬이라 13.5 순서(위 rank)가 남는다 — dedupe가 그 첫 것을 쓴다.
        tokens.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
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
        styles.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0)); // 코드 단위 비교(위와 같은 기준)
        const content = exportTokens(tokens, {
          format: msg.format,
          fontSizeUnit: msg.fontSizeUnit,
          base: msg.base,
        }, styles, modes);
        // 같은 이름 Global끼리 — 앞의 것만 냈음을 알린다(ia-v3 §4.4 "같은 이름 Global끼리")
        const dupes = exportGlobalDupes(inputs);
        reply({ type: 'EXPORT_RESULT', format: msg.format, content, clashes: exportClashes(tokens, modes), globalDupes: dupes.names, ...(dupes.from !== undefined ? { globalDupesFrom: dupes.from } : {}) });
        break;
      }
      case 'GET_VAR_TABLE': {
        reply({ type: 'VAR_TABLE', ...(await collectVarTable()) });
        break;
      }
      case 'UPDATE_VARIABLE': {
        await updateVariable(msg);
        break;
      }
      case 'APPLY_VARIABLE': {
        // 클릭 연결(IA v4 §4.7) — 지금 선택의 레이어만, ⌘Z 한 번.
        const v = await figma.variables.getVariableByIdAsync(msg.id).catch(() => null);
        if (!v) {
          reply({ type: 'ERROR', message: 'variable not found', op: msg.type, reqId: msg.reqId, code: 'deleted' });
          break;
        }
        const r = await applyVariableToNodes(selection().slice(), v, msg.target);
        if (r.applied) commitUndo(figma);
        reply({ type: 'VARIABLE_APPLIED', reqId: msg.reqId, applied: r.applied, skipped: r.skipped, skipReasons: r.skipReasons, name: v.name });
        break;
      }
      case 'CREATE_VARIABLE':
      case 'DUPLICATE_VARIABLE':
      case 'DELETE_VARIABLE': {
        await manualVariableOp(msg);
        break;
      }
      case 'SCAN_UNUSED_VARS': {
        unusedCancel = false; // 남은 플래그가 이 요청을 멈추지 않게
        const r = await scanUnusedVariables({ onProgress: (done, total) => reply({ type: 'PROGRESS', op: 'unused', done, total }), cancelled: () => unusedCancel });
        reply({ type: 'UNUSED_VARS', reqId: msg.reqId, items: r.items, pages: r.pages, layers: r.layers, ...(r.cancelled ? { cancelled: true as const } : {}) });
        break;
      }
      case 'DELETE_VARIABLES': {
        unusedCancel = false;
        const r = await deleteUnusedVariables(msg.ids, { onProgress: (done, total) => reply({ type: 'PROGRESS', op: 'unused-delete', done, total }), cancelled: () => unusedCancel });
        if (r.deleted > 0) commitUndo(figma); // 지운 것이 있을 때만 ⌘Z 한 번
        reply({ type: 'VARIABLES_DELETED', reqId: msg.reqId, deleted: r.deleted, skipped: r.skipped, failed: r.failed, ...(r.cancelled ? { cancelled: true as const } : {}) });
        if (r.deleted > 0) await postPrereq();
        break;
      }
      case 'SET_UI_SIZE': {
        // 최소화/펼치기만 — 저장하지 않는다.
        const mode = normalizeUiSize(msg.mode);
        figma.ui.resize(uiWidth(mode), uiHeight(mode));
        reply({ type: 'UI_SIZE', mode });
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
        reply({ type: 'SETTINGS', base: s.base, maxDepth: s.maxDepth, grid: s.grid });
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
        reply({ type: 'VARIABLES', vars: await collectVars() });
        break;
      }
      case 'GENERATE_DARK_MODE': {
        // 다크 값을 새로 쓰는 작업이라 토큰 생성과 같은 등급으로 잠근다.
        if (!requirePaid('tokens', msg.reqId)) break;
        // 대상 · 모드는 플러그인이 정한다(플러그인 Global · 기본 모드 → Dark — ia-v3 13.7).
        let res;
        try {
          res = await generateDarkMode(msg.migrate === true);
        } catch (e) {
          // 옮기기 + 채우기 중간에 예외 — 바꾼 것이 있으면 한 묶음으로(⌘Z 한 번) 커밋한 뒤 ERROR.
          if (darkChangedBeforeError(e)) {
            commitUndo(figma);
            await postPrereq();
            post({ type: 'VARIABLES', vars: await collectVars() }); // 성공 때처럼 목록 갱신(모드가 바뀌었을 수 있다)
          }
          throw e;
        }
        const { changed, ...r } = res;
        reply({ type: 'DARK_MODE_RESULT', ...r });
        if (changed) {
          commitUndo(figma); // UX2: 옮기기 + 모드 추가 + 채움 전체를 단일 Undo로
          await postPrereq();
        }
        if (!r.needMigrate) post({ type: 'VARIABLES', vars: await collectVars() }); // 모드가 바뀌었을 수 있으니 목록 갱신
        break;
      }
    }
  } catch (err) {
    // UX7: 실패한 작업 종류(op)도 함께 보내 UI가 해당 영역에 친절한 메시지를 띄운다.
    reply({ type: 'ERROR', message: err instanceof Error ? err.message : String(err), op: msg?.type, reqId: (msg as { reqId?: number } | undefined)?.reqId });
  }
};
