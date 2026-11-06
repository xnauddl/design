/* ============================================================
   bind.ts — 토큰(변수)을 레이어 속성에 바인딩 (top-down)
   - 레이어에는 역할(Component · Semantic)만 붙인다(§2.12). 같은 값의 역할이 없으면 쓰임 이름으로
     새 Semantic 역할을 만들어(같은 값 Global의 별칭) 붙인다. 이미 붙은 연결은 바꾸지도 풀지도 않는다(§2.12 12.8).
   - 프레임 크기(Fixed)·여백(오토레이아웃)·반경·효과·텍스트 지원.
   ============================================================ */
import { rgbToHex, scopeForSemanticRole, scopesForType, type ScopeName, type ResolvedType } from './tokens';
import { collectionTiers, ensureCollection } from './collectionRoles'; // 계층은 컬렉션 이름이 아니라 지정된 역할로
import { FIELD_SCOPE, STROKE_SCOPES, EFFECT_SCOPES, fillScopesFor } from './scopes'; // 용도 규칙
import type { BindCandidate, BindNode, BindSkip, NewRoleRef } from '../shared/messages';
import { backgroundOf, gapSkip, isIconOrAvatar, inAutoLayoutFlow, iconOrAvatarKind, isInsideIconFrame } from './extract'; // 쓰지 않는 간격 판정(사이 간격 자동 · 줄바꿈 아님) · 크기 대상 판정(아이콘 · 아바타 · 오토레이아웃 흐름) — 만들기와 같은 기준
import { ROLE_KEY, isKnownRole } from './naming';
import {
  AUTO_ROLE_KEY,
  assignNames,
  bgKindOf,
  colorRoleBases,
  colorSlotKey,
  colorUse,
  composeName,
  isOldPluginName,
  paddingProp,
  pickOwner,
  radiusName,
  simpleNumericName,
  strokeName,
  textUsageName,
  valueKey,
  type BgKind,
  type ColorUse as ColorUseName,
  type Padding,
} from './usageRoles'; // 쓰임 이름 역할(§2.12)

interface VarEntry {
  variable: Variable;
  tier: number; // Component 3 > Semantic 2 > Global 1
  /** Global과 같은 이름의 Semantic 거울(예전 createTokens의 1:1 미러) — 역할로 치지 않는다(§2.12 12.7). */
  mirror?: boolean;
  /** 플러그인이 만든 쓰임 역할(`dsl.autoRole`) — 순서 3 "디자이너가 만든 것"에서 뺀다. */
  auto?: boolean;
  type: VariableResolvedDataType;
  scopes: readonly VariableScope[]; // 용도 스코프 — 필드와 안 맞는 변수 오매칭 차단
  colorHex?: string;
  num?: number;
  str?: string;
}

/**
 * "같은 값"(IA v3 §2.11) — 숫자는 소수 둘째 자리까지 같으면 같다(화면에 보이는 값).
 * 허용오차는 없앴다: 레이어 값을 바꾸는 연결은 하지 않는다.
 */
export const round2 = (n: number): number => Math.round(n * 100) / 100;
export function sameNumber(a: number, b: number): boolean {
  return round2(a) === round2(b);
}

export interface BindResult {
  bound: number;
  skipped: number;
  /** UX3: 스킵/건너뜀 사유별 집계(키→건수). 예: { 'no-match': 2, 'hug-fill': 3 }. */
  reasons: Record<string, number>;
  /** UX6: 사용자가 취소해 중단되었는가(이미 처리한 만큼은 유지). */
  cancelled?: boolean;
  /** #6: dry-run(apply=false)일 때만 — 노드별 매칭 후보. */
  candidates?: BindCandidate[];
  /** #13: dry-run일 때만 — 미리보기 트리 맥락(영향 노드 + 조상 체인). */
  nodes?: BindNode[];
  /** dry-run일 때만 — 사유별로 건너뛴 레이어(노드×사유 중복 제거, SKIP_PREVIEW_CAP까지). */
  skips?: BindSkip[];
  /** dry-run일 때만 — 상한 적용 전 실제 스킵 레이어 수(잘렸는지 알리려고). */
  skipTotal?: number;
  /** 적용 모드 — 새로 만든 역할 수(§2.12). */
  newRoles?: number;
}

/**
 * 미리보기에 실어 보낼 스킵 레이어 상한.
 * 스킵은 노드마다 나므로(오토레이아웃 없음·매칭 없음…) 3천 레이어를 고르면 매칭이 20건이어도
 * 스킵이 수천 건 — 메시지도 트리도 '고른 것'에 비례해 부풀고 후보가 그 아래 묻힌다.
 * 사유별 총계(res.reasons)는 상한과 무관하게 전부 세므로 칩의 숫자는 진짜 수다.
 * 칩의 '레이어 선택'도 code 쪽 SELECT_CAP과 같은 200에서 잘리니 수를 맞춘다.
 */
const SKIP_PREVIEW_CAP = 200;

/**
 * 상한을 사유별로 고르게 나눈다.
 *
 * 앞에서 그냥 자르면 순회 순서상 흔한 사유(트리 위쪽의 `오토레이아웃 없음`)가 예산을 다 먹는다.
 * 그런데 칩의 숫자는 res.reasons가 상한과 무관하게 전수로 세므로, 화면에는 클릭되는
 * `오토레이아웃 없음 2400 ›` 옆에 죽은 평문 `매칭 없음 180`이 나란히 뜬다 — 정작 사용자가
 * 고쳐야 할 180개로는 점프할 수 없다. 사유를 돌아가며 한 개씩 담아 채우면, 드문 사유는
 * 제 몫을 통째로 지키고 흔한 사유만 잘린다(사유 안에서는 순회 순서 유지).
 */
function capSkipsByReason(skips: BindSkip[], cap: number): BindSkip[] {
  if (skips.length <= cap) return skips;
  const byReason = new Map<string, BindSkip[]>();
  for (const s of skips) {
    const list = byReason.get(s.reason);
    if (list) list.push(s);
    else byReason.set(s.reason, [s]);
  }
  const queues = [...byReason.values()];
  const out: BindSkip[] = [];
  for (let i = 0; out.length < cap; i++) {
    let progressed = false;
    for (const q of queues) {
      if (i >= q.length) continue;
      out.push(q[i]);
      progressed = true;
      if (out.length === cap) break;
    }
    if (!progressed) break; // 모든 큐가 바닥
  }
  return out;
}

/** dry-run 미리보기 수집물(apply 시에는 null). */
interface Preview {
  candidates: BindCandidate[];
  /** 방문한 모든 노드(나중에 영향+조상으로 가지치기). */
  nodeIndex: BindNode[];
  /** 건너뛴 레이어 — 사유 칩에서 캔버스 선택으로 이어주기 위한 목록. */
  skips: BindSkip[];
  /** `nodeId|reason` — 같은 노드·사유가 여러 속성에서 나도 1건으로 남긴다(padding 4건 → 1건). */
  skipSeen: Set<string>;
}

/**
 * 미리보기 트리를 영향 노드 + 그 조상 체인으로 가지치기(pre-order 보존).
 * 건너뛴 레이어도 남긴다 — 미리보기에서 "왜 이건 안 붙었나"를 목록 자리에서 답해야 한다.
 * 단 `skips`는 이미 SKIP_PREVIEW_CAP으로 잘린 목록이라 트리도 그만큼에서 멈춘다.
 */
function pruneToAffected(nodeIndex: BindNode[], candidates: BindCandidate[], skips: BindSkip[]): BindNode[] {
  const byId = new Map(nodeIndex.map((n) => [n.id, n]));
  const seeds = [...candidates.map((c) => c.nodeId), ...skips.map((s) => s.nodeId)];
  const keep = new Set<string>(seeds);
  for (const id of seeds) {
    let p = byId.get(id)?.parentId ?? null;
    while (p && !keep.has(p)) {
      keep.add(p);
      p = byId.get(p)?.parentId ?? null;
    }
  }
  return nodeIndex.filter((n) => keep.has(n.id));
}

/** UX6: 진행률 보고·취소·이벤트 루프 양보 훅. */
export interface BindHooks {
  onProgress?: (done: number, total: number) => void;
  shouldCancel?: () => boolean;
  /** 주기적으로 매크로태스크에 양보(취소 메시지 수신/진행률 반영용). */
  yieldToEvents?: () => Promise<void>;
}

interface Progress {
  done: number;
  total: number;
  every: number;
}

/* ---------- 이미 바인딩된 자리 보호 ---------- */
/**
 * 변수가 붙은 뒤에도 Figma는 `p.color`·`node.width`·`node.fontSize`를 **resolved 값 그대로**
 * 돌려준다. 값만 보고 매칭하면 (1) 두 번째 미리보기에 이미 끝난 건이 다시 후보로 올라
 * 남은 작업량을 알 수 없고, (2) 사용자가 직접 고른 변수도 같은 값의 상위 tier 변수로
 * 말없이 교체된다. 그래서 이미 바인딩된 자리는 값이 맞아도 건드리지 않는다.
 */
/**
 * 지금 살아 있는 변수 id — 로컬 전부 + 선택에서 참조된 라이브러리 변수(비동기로 확인).
 * 컬렉션을 지운 뒤에도 레이어의 바인딩 참조는 남는다(잔상). 그걸 '이미 연결됨'으로 보면
 * 변수를 다시 만들어도 영영 재연결이 안 된다 — QA에서 컬렉션 삭제 → 재실행 시 802건 중 25건만 붙은 원인.
 */
let liveVarIds: Set<string> = new Set();

function isAlias(x: unknown): boolean {
  return !!x && typeof x === 'object' && (x as VariableAlias).type === 'VARIABLE_ALIAS';
}
/** 별칭이면서 그 변수가 아직 존재하는가(지워진 변수의 잔상은 '연결 안 됨'). */
function isLiveAlias(x: unknown): boolean {
  return isAlias(x) && liveVarIds.has((x as VariableAlias).id);
}

/** 선택 안의 모든 바인딩 id를 모아 살아 있는지 확인(로컬은 인덱스, 그 외는 라이브러리 조회). */
async function collectLiveVarIds(selection: readonly SceneNode[], local: ReadonlySet<string>, deep = true): Promise<Set<string>> {
  const seen = new Set<string>();
  const stack: SceneNode[] = selection.slice();
  const take = (raw: unknown): void => {
    if (!raw) return;
    for (const a of Array.isArray(raw) ? raw : [raw]) if (isAlias(a)) seen.add((a as VariableAlias).id);
  };
  while (stack.length) {
    const n = stack.pop() as SceneNode;
    const bv = (n as { boundVariables?: Record<string, unknown> }).boundVariables;
    if (bv) for (const v of Object.values(bv)) take(v);
    for (const key of ['fills', 'strokes'] as const) {
      const ps = (n as unknown as Record<string, unknown>)[key];
      if (Array.isArray(ps)) for (const p of ps) take((p as { boundVariables?: { color?: unknown } }).boundVariables?.color);
    }
    const ef = (n as { effects?: readonly Effect[] }).effects;
    if (Array.isArray(ef)) for (const e of ef) take((e as { boundVariables?: { color?: unknown } }).boundVariables?.color);
    if (deep && 'children' in n) for (const c of n.children) stack.push(c);
  }
  const live = new Set<string>(local);
  for (const id of seen) {
    if (live.has(id)) continue;
    try {
      if (await figma.variables.getVariableByIdAsync(id)) live.add(id); // 라이브러리(원격) 변수
    } catch {
      /* 없음 — 잔상 */
    }
  }
  return live;
}

/**
 * 자리 하나의 연결 상태(IA v3 §2.11).
 * - 'none': 붙은 변수 없음 → 연결 대상
 * - 'bound': 살아 있는 변수가 붙음 → "이미 연결됨"
 * - 'deleted': 지워졌거나 찾을 수 없는 변수를 가리킴 → "삭제된 변수에 연결됨"(덮어쓰지 않는다 —
 *   다시 붙이는 일은 피그마에서, §4.4 "삭제된 변수에 연결된 곳")
 */
export type SlotState = 'none' | 'bound' | 'deleted';

/** 별칭 목록의 상태 — 하나라도 지워진 변수면 'deleted', 아니면 하나라도 있으면 'bound'. */
function aliasesState(list: readonly unknown[]): SlotState {
  const aliases = list.filter(isAlias);
  if (!aliases.length) return 'none';
  return aliases.some((a) => !isLiveAlias(a)) ? 'deleted' : 'bound';
}

function nodeFieldState(node: SceneNode, field: string): SlotState {
  const bv = (node as unknown as { boundVariables?: Record<string, unknown> }).boundVariables;
  const entry = bv?.[field];
  if (!entry) return 'none';
  return aliasesState(Array.isArray(entry) ? entry : [entry]);
}

/**
 * paint·effect 자신(`boundVariables.color`) **또는** 노드 쪽
 * `boundVariables.fills|strokes|effects[index]`의 색 연결 상태.
 * Figma는 setBoundVariableForPaint로 붙인 뒤 둘 다 채우지만, 테마 적용·외부 도구는
 * 노드 배열만 남기는 경우가 있어 한쪽만 보면 이미 연결된 자리를 다시 덮는다.
 */
function colorState(
  x: Paint | Effect,
  node: SceneNode,
  field: 'fills' | 'strokes' | 'effects',
  index: number,
): SlotState {
  const own = (x as { boundVariables?: { color?: unknown } }).boundVariables?.color;
  const bv = (node as unknown as { boundVariables?: Record<string, unknown> }).boundVariables;
  const arr = bv?.[field];
  return aliasesState([own, Array.isArray(arr) ? arr[index] : undefined]);
}

/**
 * 텍스트 range 필드의 연결 상태. 일부 구간에만 붙어 있어도 속성 전체를 'bound'로 본다 —
 * 빈 구간을 채우지 않는다(§2.11 "글자는 일부 구간에만 붙어 있어도 그 속성 전체를 건너뛴다").
 * `boundVariables[field]`는 구간들에 붙은 별칭 배열이다. 그게 비어 있는 환경을 위해
 * 전 구간 조회(`getRangeBoundVariable`)도 본다(mixed = 일부 구간 연결).
 */
function textFieldState(node: TextNode, field: VariableBindableTextField): SlotState {
  const fromBv = nodeFieldState(node, field);
  if (fromBv !== 'none') return fromBv;
  const len = node.characters.length;
  const getRange = (
    node as TextNode & {
      getRangeBoundVariable?: (start: number, end: number, f: VariableBindableTextField) => VariableAlias | null | typeof figma.mixed;
    }
  ).getRangeBoundVariable;
  if (len === 0 || typeof getRange !== 'function') return 'none';
  const full = getRange.call(node, 0, len, field);
  if (full === figma.mixed) return 'bound';
  return aliasesState([full]);
}

/** 스타일이 붙어 있는가(빈 문자열 = 없음, mixed = 일부 구간에 있음 → 붙은 것으로). */
function hasStyleId(node: SceneNode, key: 'fillStyleId' | 'strokeStyleId' | 'effectStyleId' | 'textStyleId'): boolean {
  const v = (node as unknown as Record<string, unknown>)[key];
  if (v === figma.mixed) return true;
  return typeof v === 'string' && v !== '';
}

/** 텍스트 range 필드(글자 구간에 붙는 변수 자리). */
const TEXT_RANGE_FIELDS = ['fontSize', 'lineHeight', 'letterSpacing', 'fontFamily'] as const;

/** 색 칠하기 필드 → 그 필드를 덮는 스타일 id 키. */
const STYLE_KEY_OF = { fills: 'fillStyleId', strokes: 'strokeStyleId', effects: 'effectStyleId' } as const;

/** 상태 → 사유 키(연결 대상이면 null). */
function stateReason(s: SlotState): 'already-bound' | 'deleted-var' | null {
  return s === 'bound' ? 'already-bound' : s === 'deleted' ? 'deleted-var' : null;
}

/** 조상까지 실제로 보이는가 — extract.ts와 같은 기준(숨긴 그룹 안의 레이어를 직접 고른 경우). */
function isEffectivelyVisible(node: SceneNode): boolean {
  let p: BaseNode | null = node;
  while (p) {
    if ('visible' in p && (p as SceneNode).visible === false) return false;
    p = p.parent;
  }
  return true;
}

/** 선택 하위 전체 노드 수(진행률 분모). 처리 없이 셈만. */
function countNodes(sel: readonly SceneNode[]): number {
  let n = 0;
  const stack: SceneNode[] = sel.slice();
  while (stack.length) {
    const x = stack.pop() as SceneNode;
    // walk가 건너뛰는 노드는 분모에서도 빼야 진행률이 100%로 끝난다.
    if (x.visible === false) continue;
    n++;
    if (x.type === 'INSTANCE') continue;
    if ('children' in x) for (const c of (x as SceneNode & ChildrenMixin).children) stack.push(c as SceneNode);
  }
  return n;
}

/**
 * 사유 1건 집계(스킵 카운트는 증가시키지 않는 '건너뜀' 사유에도 사용).
 * dry-run이면 어느 레이어였는지도 남긴다 — 숫자만으로는 원인 레이어를 찾을 수 없다.
 */
function note(res: BindResult, key: string, node?: SceneNode, preview?: Preview | null, field?: string): void {
  res.reasons[key] = (res.reasons[key] ?? 0) + 1;
  if (!node || !preview) return;
  const k = `${node.id}|${key}`;
  if (preview.skipSeen.has(k)) return;
  preview.skipSeen.add(k);
  preview.skips.push({ nodeId: node.id, name: node.name, type: node.type, reason: key, field });
}
/** 매칭 실패 등 실제 스킵 — skipped++ 와 사유 집계를 함께. */
function skip(res: BindResult, key: string, node?: SceneNode, preview?: Preview | null, field?: string): void {
  res.skipped++;
  note(res, key, node, preview, field);
}

/** 찾기 · 연결 옵션 — 주인(레이어 역할) 판정은 부르는 쪽이 구조 색인으로 넘길 수 있다(§2.12 12.3). */
export interface BindOptions {
  /** 레이어의 주인 역할. 없으면 이름 정리가 남긴 역할(`dsRole`)만 본다. */
  ownerOf?: (node: SceneNode) => string | undefined;
}

/** 이름 정리가 남긴 역할(`dsRole`) — 어휘 안 · 구조 폴백이 아니면(§2.12 12.3 ①). */
export function dsRoleOwner(node: SceneNode): string | undefined {
  const fn = (node as { getPluginData?: (key: string) => string }).getPluginData;
  let role: string | undefined;
  try {
    role = typeof fn === 'function' ? fn.call(node, ROLE_KEY) || undefined : undefined;
  } catch {
    role = undefined;
  }
  return pickOwner(role, undefined, isKnownRole);
}

export async function bindSelection(
  selection: readonly SceneNode[],
  apply = true, // UX1: false면 dry-run(미리보기) — 변경 없이 동일 집계만.
  hooks: BindHooks = {}, // UX6: 진행률·취소.
  opts: BindOptions = {},
): Promise<BindResult> {
  const index = await buildIndex();
  liveVarIds = await collectLiveVarIds(selection, new Set((await figma.variables.getLocalVariablesAsync()).map((v) => v.id)));
  const res: BindResult = { bound: 0, skipped: 0, reasons: {} };
  const prog: Progress = { done: 0, total: hooks.onProgress ? countNodes(selection) : 0, every: 50 };
  // 적용 모드에서도 "어느 레이어에 어느 변수가 붙었나" 목록을 모은다(결과 트리). dry-run과 같은 수집기 —
  // 후보는 상한 없이 전부 싣는다(§4.6 "찾기 · 연결의 수").
  const preview: Preview = { candidates: [], nodeIndex: [], skips: [], skipSeen: new Set() };
  const ownerCache = new Map<SceneNode, string | undefined>();
  const ownerOf = opts.ownerOf ?? dsRoleOwner;
  const ctx: Ctx = {
    index,
    res,
    preview,
    slots: [],
    owner: (n) => {
      if (!ownerCache.has(n)) ownerCache.set(n, ownerOf(n));
      return ownerCache.get(n);
    },
  };
  for (const node of selection) {
    // 선택 루트가 숨긴 그룹 안이면 walk의 자체 visible 검사로는 못 거른다(루트 자신은 보임).
    if (!isEffectivelyVisible(node)) {
      note(res, 'hidden', node, preview);
      continue;
    }
    await walk(node, ctx, hooks, prog, 0, null);
    if (res.cancelled) break;
  }
  resolveSlots(ctx); // 자리마다 붙일 변수(또는 새 역할)를 고른다 — 색 밝기 · 번호는 찾기 전체를 보고 정한다(§2.12)
  if (apply && preview.candidates.length) {
    // 적용 모드도 같은 규칙 — 찾은 후보를 연결 경로(bindSelectedItems)로 붙인다(§2.12 12.9).
    const known = new Map<string, SceneNode>();
    for (const s of ctx.slots) known.set(s.node.id, s.node);
    const r = await bindSelectedItems(
      preview.candidates.map((c) => ({ nodeId: c.nodeId, field: c.field, index: c.index, variableId: c.variableId, newRole: c.newRole })),
      {},
      known, // 찾기에서 본 레이어 그대로(다시 찾지 않는다)
    );
    res.bound = r.bound;
    res.skipped += r.skipped;
    for (const [k, v] of Object.entries(r.reasons)) res.reasons[k] = (res.reasons[k] ?? 0) + v;
    res.newRoles = r.newRoles;
    // 결과 트리에는 실제로 만든 역할의 id를 싣는다.
    for (const c of preview.candidates) {
      const id = c.newRole ? r.createdIds[c.newRole.name] : undefined;
      if (id) c.variableId = id;
    }
  }
  {
    res.candidates = preview.candidates;
    // 트리 씨앗의 스킵은 잘린 목록으로 — 트리 크기가 '고른 레이어 수'가 아니라 '보낼 스킵 수'에 묶인다.
    const skips = capSkipsByReason(preview.skips, SKIP_PREVIEW_CAP);
    res.nodes = pruneToAffected(preview.nodeIndex, res.candidates, skips);
    res.skips = skips;
    res.skipTotal = preview.skips.length;
  }
  hooks.onProgress?.(prog.done, prog.total); // 최종 진행률(100%)
  return res;
}

/* ---------- 변수 인덱스(resolved 값 + tier) ---------- */
interface VarIndexAll {
  entries: VarEntry[];
  /** Semantic(계층 2) 이름 → 값 키(값을 못 읽으면 '') — 새 역할 번호가 이미 있는 이름을 피하게. */
  semNames: Map<string, string>;
  byId: Map<string, VarEntry>;
}

async function buildIndex(): Promise<VarIndexAll> {
  const cols = await figma.variables.getLocalVariableCollectionsAsync();
  const modeOf = new Map(cols.map((c) => [c.id, c.defaultModeId]));
  const tierOf = collectionTiers(cols);
  const vars = await figma.variables.getLocalVariablesAsync();
  // 예전 파일에 남은 Semantic 거울(Global과 같은 이름) — 역할로 치지 않는다(§2.12 12.7).
  const globalNames = new Set(vars.filter((v) => tierOf.get(v.variableCollectionId) === 1).map((v) => v.name));
  const entries: VarEntry[] = [];
  const semNames = new Map<string, string>();
  for (const v of vars) {
    const tier = tierOf.get(v.variableCollectionId) ?? 0;
    if (tier < 1) continue; // Global/Semantic/Component 3계층만(다른 컬렉션 제외)
    const val = await resolveValue(v, modeOf);
    if (tier === 2) semNames.set(v.name, '');
    if (val == null) continue;
    const e: VarEntry = { variable: v, tier, type: v.resolvedType, scopes: v.scopes ?? ['ALL_SCOPES'] };
    if (tier === 2 && globalNames.has(v.name)) e.mirror = true;
    if (tier === 2 && readAutoRole(v)) e.auto = true;
    // 투명도가 1이 아닌 색 변수는 연결 대상에서 뺀다(§2.11) — 붙이면 칠하기 불투명도가 변수 값으로 바뀐다.
    if (v.resolvedType === 'COLOR' && isRGB(val)) {
      if (isOpaqueColorValue(val)) e.colorHex = rgbToHex(val);
    } else if (v.resolvedType === 'FLOAT' && typeof val === 'number') e.num = val;
    else if (v.resolvedType === 'STRING' && typeof val === 'string') e.str = val;
    if (tier === 2) semNames.set(v.name, entryKey(e));
    entries.push(e);
  }
  // 높은 tier 우선(Component의 "지금 순서"는 이 정렬 안의 피그마 순서).
  entries.sort((a, b) => b.tier - a.tier);
  return { entries, semNames, byId: new Map(entries.map((e) => [e.variable.id, e])) };
}

/** 변수에 플러그인 표시(`dsl.autoRole`)가 있나 — 목 변수는 API가 없을 수 있다. */
function readAutoRole(v: Variable): boolean {
  const fn = (v as unknown as { getPluginData?: (k: string) => string }).getPluginData;
  try {
    return typeof fn === 'function' && fn.call(v, AUTO_ROLE_KEY) === '1';
  } catch {
    return false;
  }
}

/** 변수의 값 키(번호 비교용). */
function entryKey(e: VarEntry): string {
  if (e.colorHex) return valueKey(e.colorHex);
  if (e.num != null) return valueKey(e.num);
  if (e.str != null) return valueKey(e.str);
  return '';
}

async function resolveValue(
  v: Variable,
  modeOf: Map<string, string>,
): Promise<VariableValue | undefined> {
  let cur: Variable | null = v;
  for (let i = 0; i < 12 && cur; i++) {
    const mode = modeOf.get(cur.variableCollectionId);
    const val = mode ? cur.valuesByMode[mode] : undefined;
    if (val && typeof val === 'object' && 'type' in val && (val as VariableAlias).type === 'VARIABLE_ALIAS') {
      cur = await figma.variables.getVariableByIdAsync((val as VariableAlias).id);
    } else {
      return val;
    }
  }
  return undefined;
}

/** 색 변수 값이 불투명한가(RGB이거나 alpha가 1). */
function isOpaqueColorValue(v: RGB | RGBA): boolean {
  const a = (v as RGBA).a;
  return typeof a !== 'number' || a === 1;
}

/** 페인트가 반투명인가(opacity<1). 변수 alpha가 페인트 불투명도를 덮어쓰므로 바인딩 제외 기준. */
function isTranslucentPaint(p: SolidPaint): boolean {
  return typeof p.opacity === 'number' && p.opacity < 1;
}
/** 그림자 색의 alpha<1 인가(effect color는 RGBA). */
function isTranslucentEffectColor(e: DropShadowEffect | InnerShadowEffect): boolean {
  const a = (e.color as RGBA).a;
  return typeof a === 'number' && a < 1;
}

function isRGB(v: VariableValue): v is RGB | RGBA {
  return typeof v === 'object' && v !== null && 'r' in v && 'g' in v && 'b' in v;
}

function scopeOk(scopes: readonly VariableScope[], allowed: readonly VariableScope[]): boolean {
  return scopes.includes('ALL_SCOPES') || allowed.some((s) => scopes.includes(s));
}

/* ---------- 찾기: 자리 모으기 → 역할 고르기 (§2.12) ---------- */

/** 연결할 자리 하나 — 값 · 용도 · 쓰임이 정해지면 resolveSlots가 변수(또는 새 역할)를 고른다. */
interface Slot {
  node: SceneNode;
  field: string;
  index?: number;
  kind: 'num' | 'color' | 'text';
  /** 숫자 · 글꼴 이름 · 색(소문자 #rrggbb). */
  value: number | string;
  /** 표시용 현재 값. */
  display: string;
  allowed: readonly VariableScope[];
  /** 숫자 · 글자: 쓰임 이름(12.3). 색: 쓰임(12.4). */
  usage: string;
  /** 색: 배경 종류(12.4 inverse 판정 — text · icon · border만). */
  bg?: BgKind;
  noMatchReason: string;
}

interface Ctx {
  index: VarIndexAll;
  res: BindResult;
  preview: Preview;
  slots: Slot[];
  owner: (n: SceneNode) => string | undefined;
}

/** 값 · 용도가 맞는 변수들(12.2 전제). */
function sameValueEntries(ctx: Ctx, s: Slot): VarEntry[] {
  return ctx.index.entries.filter((e) => {
    if (!scopeOk(e.scopes, s.allowed)) return false;
    if (s.kind === 'color') return e.colorHex === s.value;
    if (typeof s.value === 'number') return e.num != null && sameNumber(e.num, s.value);
    return e.str != null && e.str === s.value;
  });
}

const byName = (a: VarEntry, b: VarEntry): number => (a.variable.name < b.variable.name ? -1 : a.variable.name > b.variable.name ? 1 : 0);
const nameRe = (base: string): RegExp => new RegExp(`^${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:-\\d+)?$`);

/** 순서 1 → 3(디자이너 변수) — 숫자 · 색. 글자는 1만. */
function pickDesigned(cands: VarEntry[], kind: Slot['kind']): VarEntry | null {
  const comp = cands.find((e) => e.tier === 3);
  if (comp) return comp;
  if (kind === 'text') return null;
  return cands.filter((e) => e.tier === 2 && !e.auto && !e.mirror && !isOldPluginName(e.variable.name)).sort(byName)[0] ?? null;
}

interface Pending {
  slot: Slot;
  base: string;
  global: VarEntry | null;
}

/**
 * 자리마다 붙일 변수를 고른다(§2.12 12.2 보는 순서 1 → 3 → 2 → 4, 글자 1 → 2 → 4).
 * 새 역할의 색 밝기 이름(12.4)과 번호(12.5)는 찾기 전체를 보고 정한다.
 */
function resolveSlots(ctx: Ctx): void {
  const { res, preview } = ctx;
  const pending: Pending[] = [];
  const colorLeft: { slot: Slot; cands: VarEntry[] }[] = [];
  const emit = (s: Slot, e: VarEntry): void => {
    res.bound++;
    preview.candidates.push(candOf(s, e.variable.id, e.variable.name, e.tier, entryDisplay(e, s)));
  };
  const globalFor = (cands: VarEntry[]): VarEntry | null => {
    return cands.filter((e) => e.tier === 1).sort(byName)[0] ?? null;
  };
  for (const s of ctx.slots) {
    const cands = sameValueEntries(ctx, s);
    const d = pickDesigned(cands, s.kind);
    if (d) {
      emit(s, d);
      continue;
    }
    if (s.kind === 'color') {
      colorLeft.push({ slot: s, cands });
      continue;
    }
    // 순서 2 — 숫자: 쓰임 이름(+ -n), 글자: 같은 그룹 아무 이름(거울 제외).
    const group = s.usage.split('/')[0];
    const re = nameRe(s.usage);
    const two = cands
      .filter((e) => e.tier === 2 && (s.kind === 'text' ? !e.mirror && e.variable.name.startsWith(`${group}/`) : re.test(e.variable.name)))
      .sort(byName)[0];
    if (two) {
      emit(s, two);
      continue;
    }
    pending.push({ slot: s, base: s.usage, global: globalFor(cands) });
  }

  // 색: 남은 자리를 쓰임별로 모아 밝기 이름을 한 번에 정한다(12.4 처리 순서 ②~④).
  const byUse = new Map<string, { slot: Slot; cands: VarEntry[] }[]>();
  for (const x of colorLeft) {
    const arr = byUse.get(x.slot.usage);
    if (arr) arr.push(x);
    else byUse.set(x.slot.usage, [x]);
  }
  for (const [use, list] of byUse) {
    // 입력 = (hex · 배경 종류 · 곳 수). inverse 여부는 기준색을 정한 뒤 함수 안에서 판정한다(12.4).
    const counts = new Map<string, { hex: string; count: number; bg?: BgKind }>();
    for (const x of list) {
      const k = colorSlotKey(x.slot.value as string, x.slot.bg);
      const c = counts.get(k);
      if (c) c.count++;
      else counts.set(k, { hex: x.slot.value as string, count: 1, bg: x.slot.bg });
    }
    const def = ctx.index.entries.find((e) => e.tier === 2 && e.variable.name === `color/${use}/default` && e.colorHex);
    const bases = colorRoleBases([...counts.values()], def?.colorHex, use);
    for (const x of list) {
      const base = `color/${use}/${bases.get(colorSlotKey(x.slot.value as string, x.slot.bg)) ?? 'default'}`;
      const re = nameRe(base);
      const two = x.cands.filter((e) => e.tier === 2 && re.test(e.variable.name)).sort(byName)[0];
      if (two) {
        emit(x.slot, two);
        continue;
      }
      pending.push({ slot: x.slot, base, global: globalFor(x.cands) });
    }
  }

  // 순서 4 — 새 역할. 이름 번호는 한꺼번에(곳 수 순).
  const live = pending.filter((p) => {
    if (p.global) return true;
    skip(res, p.slot.noMatchReason, p.slot.node, preview, p.slot.field);
    return false;
  });
  const names = assignNames(
    live.map((p) => ({ base: p.base, value: valueKey(p.slot.value), count: 1 })),
    ctx.index.semNames,
  );
  const roleOf = new Map<string, NewRoleSpec>(); // 이름 → 역할(처음 본 Global)
  for (const p of live) {
    const name = names.get(`${p.base}\u0000${valueKey(p.slot.value)}`) ?? p.base;
    let spec = roleOf.get(name);
    if (!spec) {
      const g = p.global as VarEntry;
      const scopes = (scopeForSemanticRole(name) ?? (g.scopes as string[])) as string[];
      spec = { name, globalId: g.variable.id, scopes, globalName: g.variable.name };
      roleOf.set(name, spec);
    }
    res.bound++;
    const g = p.global as VarEntry;
    preview.candidates.push({
      ...candOf(p.slot, `new:${name}`, name, 2, entryDisplay(g, p.slot)),
      newRole: { name: spec.name, globalId: spec.globalId, scopes: spec.scopes },
      newRoleGlobalName: spec.globalName,
    });
  }
}

interface NewRoleSpec {
  name: string;
  globalId: string;
  scopes: string[];
  globalName: string;
}

function candOf(s: Slot, variableId: string, variableName: string, tier: number, variableValue: string): BindCandidate {
  return {
    nodeId: s.node.id,
    field: s.field,
    ...(s.index != null ? { index: s.index } : {}),
    currentValue: s.display,
    variableId,
    variableName,
    tier,
    variableValue,
  };
}

function entryDisplay(e: VarEntry, s: Slot): string {
  if (e.colorHex) return e.colorHex;
  if (e.num != null) return String(round2(e.num));
  return e.str ?? s.display;
}

/** 숫자 필드의 허용 용도. */
const numAllowed = (field: string): readonly VariableScope[] => {
  const scope = FIELD_SCOPE[field];
  return scope ? [scope] : ['ALL_SCOPES'];
};

/* ---------- 노드 순회 ---------- */
async function walk(
  node: SceneNode,
  ctx: Ctx,
  hooks: BindHooks,
  prog: Progress,
  depth: number,
  parentId: string | null,
): Promise<void> {
  const { res, preview } = ctx;
  if (res.cancelled) return;
  // 숨긴 레이어는 화면에 없는 값이라 하위까지 통째로 제외 — extract.ts와 동일 기준.
  if (node.visible === false) {
    note(res, 'hidden', node, preview);
    return;
  }
  // 미리보기 트리(#13)용: 방문한 모든 노드를 기록(나중에 영향+조상으로 가지치기).
  preview.nodeIndex.push({ id: node.id, name: node.name, type: node.type, depth, parentId });
  bindPaints(node, ctx);
  bindFrame(node, ctx);
  bindRadius(node, ctx);
  bindStroke(node, ctx);
  bindOpacity(node, ctx);
  bindEffects(node, ctx);
  await bindText(node, ctx);
  // UX6: 주기적으로 진행률 보고 + 이벤트 루프 양보(취소 메시지 수신 가능) + 취소 확인.
  prog.done++;
  if (hooks.onProgress && prog.done % prog.every === 0) {
    hooks.onProgress(prog.done, prog.total);
    if (hooks.yieldToEvents) await hooks.yieldToEvents();
    if (hooks.shouldCancel?.()) {
      res.cancelled = true;
      return;
    }
  }
  // 인스턴스 내부에 바인딩하면 인스턴스 오버라이드가 되어 마스터를 고쳐도 따라오지 않는다 —
  // 인스턴스 자체 속성까지만 처리하고 하위로는 내려가지 않는다(extract.ts와 동일 기준).
  if (node.type === 'INSTANCE') {
    if (node.children.length) {
      note(res, 'instance-children', node, preview);
    }
    return;
  }
  if ('children' in node)
    for (const c of node.children) {
      await walk(c, ctx, hooks, prog, depth + 1, node.id);
      if (res.cancelled) return;
    }
}

function bindPaints(node: SceneNode, ctx: Ctx): void {
  const { res, preview } = ctx;
  for (const key of ['fills', 'strokes'] as const) {
    if (!(key in node)) continue;
    const paints = (node as unknown as Record<string, Paint[] | typeof figma.mixed>)[key];
    if (paints === figma.mixed || !Array.isArray(paints)) continue;
    if (!paints.some((p) => p.type === 'SOLID')) continue;
    // 색 스타일이 붙은 칠하기·선은 건너뛴다 — 변수를 붙이면 스타일 연결이 끊긴다(§2.11 "스타일 사용 중").
    if (hasStyleId(node, STYLE_KEY_OF[key])) {
      note(res, 'styled', node, preview, key);
      continue;
    }
    // 칠하기 용도는 레이어 종류를 따른다(§2.11, QA #4 불합격 1).
    const allowed = key === 'fills' ? fillScopesFor(node.type) : STROKE_SCOPES;
    let use: ColorUseName | undefined;
    let bg: BgKind | undefined | null = null; // null = 아직 안 봄
    paints.forEach((p, i) => {
      if (p.type !== 'SOLID') return;
      const st = stateReason(colorState(p, node, key, i));
      if (st) {
        note(res, st, node, preview, key);
        return;
      }
      // 반투명 페인트(opacity<1)는 연결하지 않는다 — 색 변수가 붙으면 Figma가 페인트 불투명도를
      // 변수의 alpha로 덮어써, 8% 검정 테두리가 100% 검정으로 바뀐다.
      if (isTranslucentPaint(p)) {
        skip(res, 'translucent', node, preview, key);
        return;
      }
      const hex = rgbToHex(p.color);
      use ??= colorUse(node.type, key, isInsideIconFrame(node));
      if (bg === null) {
        // 배경 종류는 inverse가 있는 쓰임(text · icon · border)만 본다(12.4).
        const bgHex = use === 'text' || use === 'icon' || use === 'border' ? backgroundOf(node) : undefined;
        bg = bgHex ? bgKindOf(bgHex) : undefined;
      }
      ctx.slots.push({ node, field: key, index: i, kind: 'color', value: hex, display: hex, allowed, usage: use, ...(bg ? { bg } : {}), noMatchReason: 'no-match' });
    });
  }
}

function bindFrame(node: SceneNode, ctx: Ctx): void {
  const { res, preview } = ctx;
  if (node.type !== 'FRAME' && node.type !== 'COMPONENT' && node.type !== 'INSTANCE') return;

  // 크기: 아이콘 · 아바타 레이어만(§2.11 "크기는 아이콘 · 아바타만", extract.ts의 수집 기준과 같은 함수).
  // 아니면 찾지도 않고 건너뜀으로도 세지 않는다 — 카드 · 화면 프레임마다 크기 칩이 생기지 않게.
  const kind = iconOrAvatarKind(node);
  if (kind) {
    // 오토레이아웃 맥락에서 Fixed인 축만 — 만들기(collectSize)와 같은 판정(inAutoLayoutFlow).
    if (inAutoLayoutFlow(node)) {
      /**
       * 축 하나를 처리 — 두 축이 같은 규칙을 쓰도록 한 곳에 모은다.
       * 소수 크기에 같은 값의 토큰이 없으면 사유를 'size-fraction'으로 따로 남긴다
       * (extract가 아이콘 · 아바타의 소수 size도 토큰으로 만들지 않으므로 '매칭 없음'과 원인이 다르다).
       */
      const bindAxis = (sizing: 'FIXED' | 'HUG' | 'FILL', field: 'width' | 'height', v: number): void => {
        if (sizing !== 'FIXED') {
          note(res, 'hug-fill', node, preview, field);
          return;
        }
        const fraction = Math.abs(v - Math.round(v)) >= 0.005; // extract의 소수 2자리 반올림과 같은 판정
        tryBind(ctx, node, field, v, `size/${kind}`, fraction ? 'size-fraction' : undefined);
      };
      bindAxis(node.layoutSizingHorizontal, 'width', node.width);
      bindAxis(node.layoutSizingVertical, 'height', node.height);
    } else {
      note(res, 'size-free-layout', node, preview);
    }
  }

  // 여백/간격: 오토레이아웃에만
  if (node.layoutMode === 'NONE') {
    note(res, 'no-autolayout', node, preview);
    return;
  }
  const owner = ctx.owner(node);
  if (node.layoutMode === 'GRID') {
    // 그리드 모드의 간격은 gridRowGap/gridColumnGap(extract.ts와 동일 기준).
    tryBind(ctx, node, 'gridRowGap', node.gridRowGap, simpleNumericName('gridRowGap', owner) as string);
    tryBind(ctx, node, 'gridColumnGap', node.gridColumnGap, simpleNumericName('gridColumnGap', owner) as string);
  } else {
    // 사이 간격 자동(Space between)이면 간격 값은 피그마가 쓰지 않는다 — 붙이면 정렬이 MIN으로 바뀌어
    // 레이어 모양이 바뀐다(§2.11 "사이 간격 자동", QA #3 불합격 1). 사유만 남기고 건너뛴다.
    // 줄바꿈이 아니면 줄 사이 간격은 이 레이어에 없는 값이다 — 찾지도 세지도 않는다(§2.11 "줄바꿈이 아님").
    for (const f of ['itemSpacing', 'counterAxisSpacing'] as const) {
      const v = node[f];
      if (typeof v !== 'number') continue;
      const gs = gapSkip(node, f);
      if (gs === 'no-wrap') continue;
      if (gs === 'space-between') note(res, 'space-between', node, preview, f);
      else tryBind(ctx, node, f, v, simpleNumericName(f, owner) as string);
    }
  }
  const pad: Padding = { left: node.paddingLeft, right: node.paddingRight, top: node.paddingTop, bottom: node.paddingBottom };
  for (const f of ['paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom'] as const) {
    tryBind(ctx, node, f, node[f], composeName('spacing', owner, paddingProp(f, pad)));
  }
}

function bindRadius(node: SceneNode, ctx: Ctx): void {
  if (!('cornerRadius' in node)) return;
  const r = (node as { cornerRadius: number | typeof figma.mixed }).cornerRadius;
  const corners = ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius'] as const;
  const values = corners.map((c) => (r !== figma.mixed && typeof r === 'number' ? r : Number((node as unknown as Record<string, number>)[c]) || 0));
  if (r !== figma.mixed && !(typeof r === 'number' && r > 0)) return;
  const owner = ctx.owner(node);
  corners.forEach((c, i) => {
    if (values[i] > 0) tryBind(ctx, node, c, values[i], radiusName(c, owner, values));
  });
}

function bindOpacity(node: SceneNode, ctx: Ctx): void {
  if (!('opacity' in node)) return;
  const o = (node as { opacity: number }).opacity;
  if (typeof o !== 'number' || o >= 1 || o <= 0) return; // 1/0은 바인딩 대상 아님
  tryBind(ctx, node, 'opacity', o, simpleNumericName('opacity', ctx.owner(node)) as string);
}

function bindStroke(node: SceneNode, ctx: Ctx): void {
  const { res, preview } = ctx;
  if (!('strokes' in node) || !('strokeWeight' in node)) return;
  // 보이는 선이 있을 때만 두께 바인딩(선 없는 노드의 strokeWeight는 무의미).
  const strokes = (node as { strokes: readonly Paint[] | typeof figma.mixed }).strokes;
  if (strokes === figma.mixed || !Array.isArray(strokes) || !strokes.some((p) => p.visible !== false)) return;
  const w = (node as { strokeWeight: number | typeof figma.mixed }).strokeWeight;
  const sides = ['strokeTopWeight', 'strokeRightWeight', 'strokeBottomWeight', 'strokeLeftWeight'] as const;
  const sideValues = sides.map((sd) => Number((node as unknown as Record<string, number>)[sd]) || 0);
  const owner = ctx.owner(node);
  // 선 두께는 정수만(§2.11, 2026-11-04) — 소수 두께는 정수 변수에 당겨 붙이지 않고 "소수 선 두께"로 건너뛴다.
  const one = (field: 'strokeWeight' | (typeof sides)[number], v: number): void => {
    if (!(v > 0)) return;
    // 이미 붙은 것은 소수 판정보다 먼저(§2.11 — 이미 붙은 연결은 바꾸지 않는다, §2.12 12.8).
    const st = stateReason(nodeFieldState(node, field));
    if (st) { note(res, st, node, preview, field); return; }
    if (Math.abs(v - Math.round(v)) >= 0.005) { note(res, 'fraction', node, preview, field); return; }
    tryBind(ctx, node, field, v, strokeName(field, owner, sideValues));
  };
  if (w !== figma.mixed && typeof w === 'number') {
    one('strokeWeight', w);
    return;
  }
  // 변별 두께(상/우/하/좌)
  sides.forEach((sd, i) => one(sd, sideValues[i]));
}

function bindEffects(node: SceneNode, ctx: Ctx): void {
  const { res, preview } = ctx;
  if (!('effects' in node)) return;
  const effects = (node as { effects: readonly Effect[] }).effects;
  if (!effects.some((e) => e.type === 'DROP_SHADOW' || e.type === 'INNER_SHADOW')) return;
  // 효과 스타일이 붙은 효과는 건너뛴다(스타일 사용 중).
  if (hasStyleId(node, 'effectStyleId')) {
    note(res, 'styled', node, preview, 'effects');
    return;
  }
  effects.forEach((e, i) => {
    if (e.type !== 'DROP_SHADOW' && e.type !== 'INNER_SHADOW') return;
    const st = stateReason(colorState(e, node, 'effects', i));
    if (st) {
      note(res, st, node, preview, 'effects');
      return;
    }
    // 그림자 색은 RGBA다 — 25% 그림자를 alpha 1 변수에 붙이면 100% 검정 그림자가 된다(위 페인트와 같은 이유).
    if (isTranslucentEffectColor(e)) {
      skip(res, 'translucent', node, preview, 'effects');
      return;
    }
    const hex = rgbToHex(e.color);
    ctx.slots.push({ node, field: 'effects', index: i, kind: 'color', value: hex, display: hex, allowed: EFFECT_SCOPES, usage: 'shadow', noMatchReason: 'no-match' });
  });
}

async function bindText(node: SceneNode, ctx: Ctx): Promise<void> {
  const { res, preview } = ctx;
  if (node.type !== 'TEXT') return;
  if (node.fontName === figma.mixed) return;
  // 텍스트 스타일이 붙은 글자는 글자 속성을 건너뛴다(스타일 사용 중) — 속성 단위로 센다.
  if (hasStyleId(node, 'textStyleId')) {
    // 스타일이 없었다면 시도했을 자리만 센다(px 아닌 줄 높이·자간, 같은 글꼴 변수가 없는 글꼴은 원래 대상이 아님).
    if (node.fontSize !== figma.mixed) note(res, 'styled', node, preview, 'fontSize');
    if (node.lineHeight !== figma.mixed && node.lineHeight.unit === 'PIXELS') note(res, 'styled', node, preview, 'lineHeight');
    if (node.letterSpacing !== figma.mixed && node.letterSpacing.unit === 'PIXELS') note(res, 'styled', node, preview, 'letterSpacing');
    const fam = node.fontName.family;
    if (ctx.index.entries.some((e) => e.str === fam && scopeOk(e.scopes, ['FONT_FAMILY']))) note(res, 'styled', node, preview, 'fontFamily');
    return;
  }
  try {
    await figma.loadFontAsync(node.fontName); // 텍스트 속성 변경 전 폰트 로드 필수(미리보기에서도 가용성 확인)
  } catch {
    note(res, 'font', node, preview);
    return;
  }
  if (node.fontSize !== figma.mixed) tryBindText(ctx, node, 'fontSize', node.fontSize);
  // lineHeight/letterSpacing은 노드 단위가 px일 때만 직접 바인딩(비-px 노드는 변수 바인딩 불가)
  if (node.lineHeight !== figma.mixed && node.lineHeight.unit === 'PIXELS') tryBindText(ctx, node, 'lineHeight', node.lineHeight.value);
  if (node.letterSpacing !== figma.mixed && node.letterSpacing.unit === 'PIXELS') tryBindText(ctx, node, 'letterSpacing', node.letterSpacing.value);
  // fontFamily — STRING 변수(FONT_FAMILY)에 정확 일치. 같은 글꼴의 변수가 아예 없으면 지금처럼 세지 않는다.
  if (node.characters.length === 0) return;
  const fam = node.fontName.family;
  const st = stateReason(textFieldState(node, 'fontFamily'));
  if (st) {
    note(res, st, node, preview, 'fontFamily');
    return;
  }
  if (!ctx.index.entries.some((e) => e.str === fam && scopeOk(e.scopes, ['FONT_FAMILY']))) return;
  ctx.slots.push({ node, field: 'fontFamily', kind: 'text', value: fam, display: fam, allowed: ['FONT_FAMILY'], usage: textUsageName('fontFamily') as string, noMatchReason: 'no-match' });
}

function tryBindText(ctx: Ctx, node: TextNode, field: VariableBindableTextField, value: number): void {
  const { res, preview } = ctx;
  if (node.characters.length === 0) {
    skip(res, 'empty-text', node, preview, field);
    return;
  }
  // 일부 구간에만 붙어 있어도 속성 전체를 건너뛴다 — 빈 구간을 채우지 않는다(§2.11).
  const st = stateReason(textFieldState(node, field));
  if (st) {
    note(res, st, node, preview, field);
    return;
  }
  ctx.slots.push({ node, field, kind: 'text', value, display: String(value), allowed: [FIELD_SCOPE[field] as VariableScope], usage: textUsageName(field) as string, noMatchReason: 'no-match' });
}

function tryBind(
  ctx: Ctx,
  node: SceneNode,
  field: VariableBindableNodeField,
  value: number,
  usage: string,
  /** 매칭 실패 사유 키 — 호출자가 좁힌 조건으로 실패했을 때 그 이유를 남긴다. */
  noMatchReason = 'no-match',
): void {
  const allowed = numAllowed(field);
  const st = stateReason(nodeFieldState(node, field));
  if (st) {
    note(ctx.res, st, node, ctx.preview, field);
    return;
  }
  ctx.slots.push({ node, field, kind: 'num', value, display: String(value), allowed, usage, noMatchReason });
}

/* ---------- 체크한 자리 연결(APPLY_SELECTED) — 연결 직전 다시 확인(§4.6 "찾는 범위") ---------- */

/** 체크한 자리 한 건(미리보기 후보에서 온 것). */
export interface SelectedBindItem {
  nodeId: string;
  field: string;
  index?: number;
  variableId: string;
  /** 새 역할(§2.12 12.9) — 이 자리가 다시 확인을 통과하면 만든다(같은 이름은 한 번). */
  newRole?: NewRoleRef;
}

/** 연결 진행률 · 양보 훅(§4.6 "찾기 · 연결의 수"). 묶음이 끝날 때마다 부른다. */
export interface SelectedBindHooks {
  /** done = 처리한 자리 수(건너뛴 자리 포함), total = 받은 items 수. */
  onProgress?: (done: number, total: number) => void;
  /** 진행 메시지가 UI에 닿도록 한 번 양보한다(code.ts: setTimeout 0). */
  yieldToEvents?: () => Promise<void>;
  /** 실제로 쓴 자리 수(누적)가 늘 때마다 — 중간에 예외가 나도 code.ts가 ⌘Z 묶음을 닫을지 안다. */
  onBound?: (bound: number) => void;
  /** 새 역할을 만들 때마다(누적 수) — 아무것도 못 붙여도 역할을 만들었으면 ⌘Z 묶음을 닫는다(§2.12 12.9). */
  onCreated?: (created: number) => void;
}

/** 연결 묶음 크기 — 한 번에 setBoundVariable을 이만큼 부르고 양보한다(제안값, 실기 뒤 바꿀 수 있음). */
export const LINK_CHUNK = 300;

export interface SelectedBindResult {
  bound: number;
  /** 다시 확인에서 건너뛴 자리 수(속성 단위) — reasons 합과 같다. */
  skipped: number;
  /** 사유별 자리 수: 'already-bound' · 'deleted-var' · 'styled' · 'space-between' · 'changed' · 'error'. */
  reasons: Record<string, number>;
  /** 사유별 건너뛴 레이어(노드×사유 중복 제거, SKIP_PREVIEW_CAP까지). */
  skips: BindSkip[];
  /** 상한 전 실제 스킵 레이어 수. */
  skipTotal: number;
  /** 새로 만든 역할 수(§2.12). */
  newRoles: number;
  /** 만든 역할 이름 → 변수 id. */
  createdIds: Record<string, string>;
}

/**
 * 미리보기에서 체크한 자리를 연결한다. 미리보기와 연결 사이에 피그마에서 바뀐 곳이 있을 수 있어
 * 각 자리를 **다시 확인**하고, 그 사이 붙었거나(일부 구간 포함) 스타일이 생겼거나 값이 달라진 곳은
 * 연결하지 않고 사유로 센다(§2.11 · §4.6).
 * - 'already-bound': 살아 있는 변수가 붙음(글자는 어느 구간이든)
 * - 'deleted-var': 지워진 변수를 가리킴
 * - 'styled': 해당 칠하기·선·효과·글자에 스타일이 붙음
 * - 'space-between': 간격 필드인데 그 사이 정렬이 Space between(사이 간격 자동)이 됨
 * - 'changed': 값이 변수 값과 더는 같지 않음, 칠하기 자리가 없어짐·반투명이 됨, 레이어·변수가 없어짐
 * - 'error': 연결 호출이 실패함, 묶음 끝 칠하기·선·효과 배열 쓰기가 실패함
 */
export async function bindSelectedItems(
  items: readonly SelectedBindItem[],
  hooks: SelectedBindHooks = {},
  /** 이미 아는 레이어(적용 모드) — 있으면 id로 다시 찾지 않는다. */
  known?: ReadonlyMap<string, SceneNode>,
): Promise<SelectedBindResult> {
  const res: BindResult = { bound: 0, skipped: 0, reasons: {} };
  const preview: Preview = { candidates: [], nodeIndex: [], skips: [], skipSeen: new Set() };
  const fail = (key: string, node: SceneNode | null, field: string): void => {
    if (node) skip(res, key, node, preview, field);
    else {
      res.skipped++;
      res.reasons[key] = (res.reasons[key] ?? 0) + 1;
    }
  };
  // 새 역할은 이 연결 안에서 이름마다 한 번 만든다(§2.12 12.9).
  const created = new Map<string, Variable>();
  const createdIds: Record<string, string> = {};
  const ensureRole = async (spec: NewRoleRef, global: Variable): Promise<Variable> => {
    const have = created.get(spec.name);
    if (have) return have;
    const v = await createRole(spec, global);
    created.set(spec.name, v);
    createdIds[spec.name] = v.id;
    hooks.onCreated?.(created.size);
    return v;
  };

  // 300곳씩 묶어 처리한다(§4.6 "찾기 · 연결의 수"). 묶음마다 레이어·변수 값을 새로 읽고, 배열 쓰기도
  // 그 묶음 끝에 마친다 — 창을 닫아도 마지막으로 끝난 묶음까지는 온전히 연결된 채로 남는다.
  for (let start = 0; start < items.length; start += LINK_CHUNK) {
    const chunk = items.slice(start, start + LINK_CHUNK);
    const cols = await figma.variables.getLocalVariableCollectionsAsync();
    const modeOf = new Map(cols.map((c) => [c.id, c.defaultModeId]));
    const localIds = new Set((await figma.variables.getLocalVariablesAsync()).map((v) => v.id));

    // 노드를 한 번씩만 찾고, 살아 있는 변수 집합은 그 노드들(하위 제외)로 만든다.
    const nodes = new Map<string, SceneNode | null>();
    for (const it of chunk) {
      if (nodes.has(it.nodeId)) continue;
      const k = known?.get(it.nodeId);
      if (k) {
        nodes.set(it.nodeId, k);
        continue;
      }
      const n = await figma.getNodeByIdAsync(it.nodeId);
      nodes.set(it.nodeId, n && 'type' in n && n.type !== 'PAGE' && n.type !== 'DOCUMENT' ? (n as SceneNode) : null);
    }
    const roots = [...nodes.values()].filter((n): n is SceneNode => !!n);
    liveVarIds = await collectLiveVarIds(roots, localIds, false);

    // 변수 값은 묶음마다 새로 읽는다 — 그 사이 피그마에서 바뀐 값으로 다시 확인하려고.
    const valueCache = new Map<string, { variable: Variable; value: VariableValue | undefined } | null>();
    const variableOf = async (id: string) => {
      if (valueCache.has(id)) return valueCache.get(id) ?? null;
      const v = await figma.variables.getVariableByIdAsync(id);
      const entry = v ? { variable: v, value: await resolveValue(v, modeOf) } : null;
      valueCache.set(id, entry);
      return entry;
    };

    // 크기 대상 판정(하위를 훑는다)은 레이어마다 한 번 — 가로 · 세로 두 자리가 같은 결과를 쓴다.
    const sizeTargetCache = new Map<SceneNode, boolean>();
    const isSizeTarget = (n: SceneNode): boolean => {
      let v = sizeTargetCache.get(n);
      if (v === undefined) sizeTargetCache.set(n, (v = isIconOrAvatar(n)));
      return v;
    };

    // 칠하기·선·효과는 레이어×속성마다 새 배열을 모았다가 묶음 끝에 한 번 쓴다. fields = 그 배열에 연결한 자리 수.
    const changedPaints = new Map<SceneNode, Map<'fills' | 'strokes' | 'effects', { arr: (Paint | Effect)[]; fields: number }>>();

    for (const it of chunk) {
      const node = nodes.get(it.nodeId) ?? null;
      // 새 역할은 아직 없으므로 가리킬 Global의 값으로 다시 확인한다.
      const vv = await variableOf(it.newRole ? it.newRole.globalId : it.variableId);
      if (!node || !vv) {
        fail('changed', node, it.field);
        continue;
      }
      const { value } = vv;
      const scopesOf = (): readonly VariableScope[] => (it.newRole ? (it.newRole.scopes as VariableScope[]) : vv.variable.scopes ?? ['ALL_SCOPES']);
      const target = async (): Promise<Variable> => (it.newRole ? ensureRole(it.newRole, vv.variable) : vv.variable);
      try {
        if (it.field === 'fills' || it.field === 'strokes' || it.field === 'effects') {
          const key = it.field;
          if (hasStyleId(node, STYLE_KEY_OF[key])) {
            fail('styled', node, key);
            continue;
          }
          const pending = changedPaints.get(node)?.get(key)?.arr;
          const list = pending ?? ((node as unknown as Record<string, unknown>)[key] as (Paint | Effect)[] | typeof figma.mixed | undefined);
          const i = it.index ?? 0;
          const x = Array.isArray(list) ? list[i] : undefined;
          const isColorItem = !!x && (key === 'effects' ? x.type === 'DROP_SHADOW' || x.type === 'INNER_SHADOW' : x.type === 'SOLID');
          if (!Array.isArray(list) || !x || !isColorItem) {
            fail('changed', node, key);
            continue;
          }
          const st = stateReason(colorState(x, node, key, i));
          if (st) {
            fail(st, node, key);
            continue;
          }
          const translucent = key === 'effects' ? isTranslucentEffectColor(x as DropShadowEffect) : isTranslucentPaint(x as SolidPaint);
          const hex = rgbToHex((x as SolidPaint | DropShadowEffect).color);
          const allowed = key === 'fills' ? fillScopesFor(node.type) : key === 'strokes' ? STROKE_SCOPES : EFFECT_SCOPES;
          if (translucent || vv.variable.resolvedType !== 'COLOR' || !value || !isRGB(value) || !isOpaqueColorValue(value) || rgbToHex(value) !== hex || !scopeOk(scopesOf(), allowed)) {
            fail('changed', node, key); // 값 · 용도가 그 사이 달라짐(칠하기 용도는 레이어 종류 — §2.11)
            continue;
          }
          const variable = await target();
          const arr = list.slice();
          arr[i] =
            key === 'effects'
              ? figma.variables.setBoundVariableForEffect(x as Effect, 'color', variable)
              : figma.variables.setBoundVariableForPaint(x as SolidPaint, 'color', variable);
          let m = changedPaints.get(node);
          if (!m) changedPaints.set(node, (m = new Map()));
          const w = m.get(key);
          if (w) {
            w.arr = arr;
            w.fields++;
          } else m.set(key, { arr, fields: 1 });
          continue; // bound는 묶음 끝 배열 쓰기가 성공해야 센다
        }
        if ((TEXT_RANGE_FIELDS as readonly string[]).includes(it.field)) {
          const field = it.field as VariableBindableTextField;
          if (node.type !== 'TEXT') {
            fail('changed', node, field);
            continue;
          }
          if (hasStyleId(node, 'textStyleId')) {
            fail('styled', node, field);
            continue;
          }
          const st = stateReason(textFieldState(node, field));
          if (st) {
            fail(st, node, field);
            continue;
          }
          if (node.characters.length === 0 || node.fontName === figma.mixed || !textValueEqual(node, field, value)) {
            fail('changed', node, field);
            continue;
          }
          await figma.loadFontAsync(node.fontName);
          node.setRangeBoundVariable(0, node.characters.length, field, await target());
          res.bound++;
          hooks.onBound?.(res.bound);
          continue;
        }
        // 스칼라 노드 필드(width/height/padding…/cornerRadius…/opacity)
        // 찾은 뒤 정렬이 Space between으로 바뀐 간격 — 붙이면 정렬이 바뀌므로 건너뛴다(§4.6 다시 확인).
        // 찾은 뒤 줄바꿈이 꺼진 줄 사이 간격은 "그 사이 바뀜"(§2.11 "줄바꿈이 아님").
        const gap = gapSkip(node, it.field);
        if (gap) {
          fail(gap === 'no-wrap' ? 'changed' : 'space-between', node, it.field);
          continue;
        }
        // 찾은 뒤 아이콘 · 아바타가 아니게 된 레이어(글자를 넣는 등)의 크기는 "그 사이 바뀜"(§2.11).
        if ((it.field === 'width' || it.field === 'height') && !isSizeTarget(node)) {
          fail('changed', node, it.field);
          continue;
        }
        const st = stateReason(nodeFieldState(node, it.field));
        if (st) {
          fail(st, node, it.field);
          continue;
        }
        const cur = (node as unknown as Record<string, unknown>)[it.field];
        if (typeof cur !== 'number' || typeof value !== 'number' || !sameNumber(cur, value)) {
          fail('changed', node, it.field);
          continue;
        }
        (node as unknown as { setBoundVariable: (f: VariableBindableNodeField, x: Variable) => void }).setBoundVariable(it.field as VariableBindableNodeField, await target());
        res.bound++;
        hooks.onBound?.(res.bound);
      } catch {
        fail('error', node, it.field);
      }
    }
    for (const [node, m] of changedPaints) {
      for (const [key, w] of m) {
        try {
          (node as unknown as Record<string, unknown>)[key] = w.arr;
          res.bound += w.fields;
          hooks.onBound?.(res.bound);
        } catch {
          // 배열 쓰기 실패 — 그 배열에 연결한 자리는 연결되지 않았다.
          for (let k = 0; k < w.fields; k++) fail('error', node, key);
        }
      }
    }
    changedPaints.clear();

    const done = Math.min(start + LINK_CHUNK, items.length);
    hooks.onProgress?.(done, items.length);
    if (hooks.yieldToEvents) await hooks.yieldToEvents();
  }
  const skips = capSkipsByReason(preview.skips, SKIP_PREVIEW_CAP);
  return { bound: res.bound, skipped: res.skipped, reasons: res.reasons, skips, skipTotal: preview.skips.length, newRoles: created.size, createdIds };
}

/**
 * 쓰임 역할 하나를 만든다(§2.12 12.5 · 12.6). Semantic 컬렉션(없으면 만듦)에 같은 이름이 있으면:
 * 같은 Global을 가리키면 그것을 쓰고, 다른 값이면 다음 번호. 모든 모드에 같은 Global 별칭, 용도는 쓰임에서,
 * 플러그인 표시를 남긴다. 이미 있는 역할의 값은 바꾸지 않는다.
 */
export async function createRole(spec: NewRoleRef, global: Variable): Promise<Variable> {
  const cols = await figma.variables.getLocalVariableCollectionsAsync();
  const col = ensureCollection(cols, 'semantic', 'Semantic');
  const inCol = (await figma.variables.getLocalVariablesAsync()).filter((v) => v.variableCollectionId === col.id);
  const pointsAtGlobal = (v: Variable): boolean =>
    v.resolvedType === global.resolvedType &&
    col.modes.every((m) => {
      const val = v.valuesByMode[m.modeId];
      return !!val && typeof val === 'object' && (val as VariableAlias).type === 'VARIABLE_ALIAS' && (val as VariableAlias).id === global.id;
    });
  const re = new RegExp(`^${spec.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:-\\d+)?$`);
  const same = inCol.filter((v) => re.test(v.name) && pointsAtGlobal(v)).sort((a, b) => a.name.length - b.name.length || (a.name < b.name ? -1 : 1))[0];
  if (same) return same;
  const names = new Set(inCol.map((v) => v.name));
  let name = spec.name;
  for (let i = 2; names.has(name); i++) name = `${spec.name}-${i}`;
  const v = figma.variables.createVariable(name, col, global.resolvedType);
  for (const m of col.modes) v.setValueForMode(m.modeId, figma.variables.createVariableAlias(global));
  const scopes = scopesForType(spec.scopes as ScopeName[], global.resolvedType as ResolvedType);
  if (scopes.length) v.scopes = scopes as VariableScope[];
  try {
    (v as unknown as { setPluginData?: (k: string, val: string) => void }).setPluginData?.(AUTO_ROLE_KEY, '1');
  } catch {
    /* 표시를 못 남겨도 역할은 쓴다 */
  }
  return v;
}

/** 글자 속성 값이 변수 값과 "같은 값"인가(연결 직전 확인). */
function textValueEqual(node: TextNode, field: VariableBindableTextField, value: VariableValue | undefined): boolean {
  if (field === 'fontFamily') return node.fontName !== figma.mixed && typeof value === 'string' && node.fontName.family === value;
  if (typeof value !== 'number') return false;
  if (field === 'fontSize') return node.fontSize !== figma.mixed && sameNumber(node.fontSize, value);
  if (field === 'lineHeight') {
    const lh = node.lineHeight;
    return lh !== figma.mixed && lh.unit === 'PIXELS' && sameNumber(lh.value, value);
  }
  if (field === 'letterSpacing') {
    const ls = node.letterSpacing;
    return ls !== figma.mixed && ls.unit === 'PIXELS' && sameNumber(ls.value, value);
  }
  return false;
}


/* ---------- 변수 사용 조회(IA v3 §4.4 — 보기 전용) ----------
   연결 작업과 범위가 다르다: 인스턴스 안쪽 레이어도 센다(보기 전용, 재검토 ⑥). 숨긴 레이어는 세지 않는다.
   상한이 없다 — 숫자만 모으고 후보 목록을 만들지 않는다. */

/** 한 레이어에 연결된 변수 id들(속성 자리마다 하나 — 같은 변수가 두 자리면 두 번). */
export function boundVariableIds(node: SceneNode): string[] {
  const out: string[] = [];
  const aliasId = (raw: unknown): string | undefined => {
    if (!raw) return undefined;
    const a = Array.isArray(raw) ? raw[0] : raw;
    return a && typeof a === 'object' && 'id' in a ? (a as VariableAlias).id : undefined;
  };
  for (const key of ['fills', 'strokes'] as const) {
    const ps = (node as unknown as Record<string, unknown>)[key];
    if (!Array.isArray(ps)) continue;
    for (const p of ps) {
      const id = (p as { boundVariables?: { color?: VariableAlias } }).boundVariables?.color?.id;
      if (id) out.push(id);
    }
  }
  const effects = (node as { effects?: readonly Effect[] }).effects;
  if (Array.isArray(effects)) {
    for (const e of effects) {
      const id = (e as { boundVariables?: { color?: VariableAlias } }).boundVariables?.color?.id;
      if (id) out.push(id);
    }
  }
  const bv = (node as { boundVariables?: Record<string, unknown> }).boundVariables ?? {};
  for (const [field, raw] of Object.entries(bv)) {
    if (field === 'fills' || field === 'strokes' || field === 'effects' || field === 'componentProperties' || field === 'textRangeFills') continue;
    const id = aliasId(raw);
    if (id) out.push(id);
  }
  return out;
}

/** 보이는 레이어를 인스턴스 안쪽까지 돈다. 루트가 숨겨져 있으면 건너뛴다. */
export function walkVisibleDeep(roots: readonly SceneNode[], visit: (node: SceneNode) => void): number {
  let scanned = 0;
  const stack: SceneNode[] = [];
  for (const r of roots) if (isEffectivelyVisible(r)) stack.push(r);
  while (stack.length) {
    const n = stack.pop() as SceneNode;
    if (n.visible === false) continue;
    scanned++;
    visit(n);
    if ('children' in n) for (const c of (n as SceneNode & ChildrenMixin).children) stack.push(c as SceneNode);
  }
  return scanned;
}

export interface UsageCount {
  /** 연결된 속성 자리 수("곳") */
  places: number;
  /** 그 변수를 쓰는 레이어 수 */
  layers: number;
}

/** 루트들 안의 변수 사용 수(변수 id → 곳·레이어). 어떤 변수인지(로컬/라이브러리/삭제)는 부르는 쪽이 가린다. */
export function countUsage(roots: readonly SceneNode[]): { usage: Map<string, UsageCount>; nodesById: Map<string, string[]>; scanned: number } {
  const usage = new Map<string, UsageCount>();
  const nodesById = new Map<string, string[]>();
  const scanned = walkVisibleDeep(roots, (n) => {
    const ids = boundVariableIds(n);
    if (!ids.length) return;
    const seen = new Set<string>();
    for (const id of ids) {
      const u = usage.get(id) ?? { places: 0, layers: 0 };
      u.places++;
      if (!seen.has(id)) {
        u.layers++;
        seen.add(id);
        const list = nodesById.get(id) ?? [];
        list.push(n.id);
        nodesById.set(id, list);
      }
      usage.set(id, u);
    }
  });
  return { usage, nodesById, scanned };
}

/** 주어진 변수들 중 하나라도 쓰는 레이어(인스턴스 안쪽 포함) — 사용 레이어 선택·상세 "쓰인 곳". */
export function findUsers(roots: readonly SceneNode[], varIds: ReadonlySet<string>): { nodes: SceneNode[]; places: number } {
  const nodes: SceneNode[] = [];
  let places = 0;
  walkVisibleDeep(roots, (n) => {
    const hits = boundVariableIds(n).filter((id) => varIds.has(id)).length;
    if (!hits) return;
    places += hits;
    nodes.push(n);
  });
  return { nodes, places };
}

