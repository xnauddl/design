/* ============================================================
   bind.ts — 토큰(변수)을 레이어 속성에 바인딩 (top-down)
   - 매칭은 resolved 값 기준, Component > Semantic > Global. 역할 별칭이 있으면 그것이 이기고,
     역할 없는 값은 Global 원시 변수에 붙는다(Semantic 거울 폐지 — variables.ts 참고).
   - 프레임 크기(Fixed)·여백(오토레이아웃)·반경·효과·텍스트 지원.
   ============================================================ */
import { rgbToHex } from './tokens';
import { collectionTiers } from './collectionRoles'; // 계층은 컬렉션 이름이 아니라 지정된 역할로
import { FIELD_SCOPE, FILL_SCOPES, STROKE_SCOPES, EFFECT_SCOPES } from './scopes'; // 용도 규칙
import type { BindCandidate, BindNode, BindSkip } from '../shared/messages';
import { gapSkip } from './extract'; // 쓰지 않는 간격 판정(사이 간격 자동 · 줄바꿈 아님) — 만들기와 같은 기준

interface VarEntry {
  variable: Variable;
  tier: number; // Component 3 > Semantic 2 > Global 1
  /** Global과 같은 이름의 Semantic 거울(createTokens의 1:1 미러) — 같은 tier의 역할 별칭보다 뒤. */
  mirror?: boolean;
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
  /** 상한(RESULT_CAP) 전 실제 후보 수 — 잘렸으면 UI가 알린다. */
  candidateTotal?: number;
  bound: number;
  skipped: number;
  flags: string[];
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
}

/**
 * 미리보기에 실어 보낼 스킵 레이어 상한.
 * 스킵은 노드마다 나므로(오토레이아웃 없음·매칭 없음…) 3천 레이어를 고르면 매칭이 20건이어도
 * 스킵이 수천 건 — 메시지도 트리도 '고른 것'에 비례해 부풀고 후보가 그 아래 묻힌다.
 * 사유별 총계(res.reasons)는 상한과 무관하게 전부 세므로 칩의 숫자는 진짜 수다.
 * 칩의 '레이어 선택'도 code 쪽 SELECT_CAP과 같은 200에서 잘리니 수를 맞춘다.
 */
const SKIP_PREVIEW_CAP = 200;
/** 결과/미리보기 트리에 실을 바인딩 후보 상한 — 수천 레이어 파일에서 UI 메시지가 터지지 않게. */
const RESULT_CAP = 600;

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

function addColorCand(preview: Preview | null, node: SceneNode, field: string, index: number, hex: string, e: VarEntry): void {
  preview?.candidates.push({ nodeId: node.id, field, index, currentValue: hex, variableId: e.variable.id, variableName: e.variable.name, tier: e.tier, variableValue: hex });
}
function addFloatCand(preview: Preview | null, node: SceneNode, field: string, value: number, e: VarEntry): void {
  preview?.candidates.push({ nodeId: node.id, field, currentValue: String(value), variableId: e.variable.id, variableName: e.variable.name, tier: e.tier, ...(e.num != null ? { variableValue: String(round2(e.num)) } : {}) });
}
function addStrCand(preview: Preview | null, node: SceneNode, field: string, value: string, e: VarEntry): void {
  preview?.candidates.push({ nodeId: node.id, field, currentValue: value, variableId: e.variable.id, variableName: e.variable.name, tier: e.tier, variableValue: value });
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

export async function bindSelection(
  selection: readonly SceneNode[],
  apply = true, // UX1: false면 dry-run(미리보기) — 변경 없이 동일 집계만.
  hooks: BindHooks = {}, // UX6: 진행률·취소.
): Promise<BindResult> {
  const entries = await buildIndex();
  liveVarIds = await collectLiveVarIds(selection, new Set((await figma.variables.getLocalVariablesAsync()).map((v) => v.id)));
  const res: BindResult = { bound: 0, skipped: 0, flags: [], reasons: {} };
  const flagSet = new Set<string>();
  const prog: Progress = { done: 0, total: hooks.onProgress ? countNodes(selection) : 0, every: 50 };
  // 적용 모드에서도 "어느 레이어에 어느 변수가 붙었나" 목록을 모은다(결과 트리). dry-run과 같은 수집기 —
  // 차이는 실제로 setBoundVariable을 부르느냐뿐. 목록은 RESULT_CAP에서 멈춘다(대형 파일 보호).
  const preview: Preview = { candidates: [], nodeIndex: [], skips: [], skipSeen: new Set() };
  for (const node of selection) {
    // 선택 루트가 숨긴 그룹 안이면 walk의 자체 visible 검사로는 못 거른다(루트 자신은 보임).
    if (!isEffectivelyVisible(node)) {
      flagSet.add('숨긴 레이어는 바인딩에서 제외했습니다.');
      note(res, 'hidden', node, preview);
      continue;
    }
    await walk(node, entries, res, flagSet, apply, hooks, prog, preview, 0, null);
    if (res.cancelled) break;
  }
  res.flags = [...flagSet];
  {
    res.candidateTotal = preview.candidates.length;
    res.candidates = preview.candidates.slice(0, RESULT_CAP);
    // 트리 씨앗도 잘린 목록으로 — 트리 크기가 '고른 레이어 수'가 아니라 '보낼 스킵 수'에 묶인다.
    const skips = capSkipsByReason(preview.skips, SKIP_PREVIEW_CAP);
    res.nodes = pruneToAffected(preview.nodeIndex, res.candidates, skips);
    res.skips = skips;
    res.skipTotal = preview.skips.length;
  }
  hooks.onProgress?.(prog.done, prog.total); // 최종 진행률(100%)
  return res;
}

/* ---------- 변수 인덱스(resolved 값 + tier) ---------- */
async function buildIndex(): Promise<VarEntry[]> {
  const cols = await figma.variables.getLocalVariableCollectionsAsync();
  const modeOf = new Map(cols.map((c) => [c.id, c.defaultModeId]));
  const tierOf = collectionTiers(cols);
  const vars = await figma.variables.getLocalVariablesAsync();
  // 예전 파일에 남은 Semantic 거울(Global과 같은 이름)은 역할 별칭보다 뒤로 — 같은 tier라
  // 생성 순서로 거울이 이기면 역할을 매핑해도 레이어가 거울 이름에 붙는다.
  const globalNames = new Set(
    vars.filter((v) => tierOf.get(v.variableCollectionId) === 1).map((v) => v.name),
  );
  const entries: VarEntry[] = [];
  for (const v of vars) {
    const tier = tierOf.get(v.variableCollectionId) ?? 0;
    if (tier < 1) continue; // Global/Semantic/Component 3계층만(다른 컬렉션 제외)
    const val = await resolveValue(v, modeOf);
    if (val == null) continue;
    const e: VarEntry = { variable: v, tier, type: v.resolvedType, scopes: v.scopes ?? ['ALL_SCOPES'] };
    if (tier === 2 && globalNames.has(v.name)) e.mirror = true;
    // 투명도가 1이 아닌 색 변수는 연결 대상에서 뺀다(§2.11) — 붙이면 칠하기 불투명도가 변수 값으로 바뀐다.
    // 그 색의 칠하기는 같은 색의 다른 불투명 변수에 붙거나 '매칭 없음'이 된다.
    if (v.resolvedType === 'COLOR' && isRGB(val)) {
      if (isOpaqueColorValue(val)) e.colorHex = rgbToHex(val);
    } else if (v.resolvedType === 'FLOAT' && typeof val === 'number') e.num = val;
    else if (v.resolvedType === 'STRING' && typeof val === 'string') e.str = val;
    entries.push(e);
  }
  // 높은 tier 우선, 같은 tier면 역할 별칭이 거울보다 먼저(matchColor는 첫 일치를 고른다).
  entries.sort((a, b) => b.tier - a.tier || Number(a.mirror ?? false) - Number(b.mirror ?? false));
  return entries;
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

function colorScopeOk(e: VarEntry, allowed: readonly VariableScope[]): boolean {
  return e.scopes.includes('ALL_SCOPES') || allowed.some((s) => e.scopes.includes(s));
}

function matchColor(entries: VarEntry[], hex: string, allowed: readonly VariableScope[]): VarEntry | null {
  // 용도(스코프) 일치 + 화면의 #RRGGBB가 같음. stroke 전용 색이 fill에, effect 색이 fill에 붙는 오매칭 방지.
  for (const e of entries) if (e.colorHex === hex && colorScopeOk(e, allowed)) return e;
  return null;
}
function matchFloat(entries: VarEntry[], value: number, scope?: VariableScope): VarEntry | null {
  let best: VarEntry | null = null;
  let bestDist = Infinity;
  for (const e of entries) {
    if (e.num == null) continue;
    // 용도(스코프) 불일치 변수는 제외 — 여백이 line-height/letter-spacing 등에 붙는 오매칭 방지.
    if (scope && !e.scopes.includes('ALL_SCOPES') && !e.scopes.includes(scope)) continue;
    if (!sameNumber(e.num, value)) continue; // "같은 값"만(§2.11)
    const dist = Math.abs(e.num - value);
    // 같은 값 안에서는 더 가까운 값 우선, 동률이면 높은 tier, 같은 tier면 역할 별칭(거울 아님) 우선.
    if (dist < bestDist || (dist === bestDist && best !== null && (best.tier < e.tier || (best.tier === e.tier && best.mirror && !e.mirror)))) {
      best = e;
      bestDist = dist;
    }
  }
  return best;
}

function matchString(entries: VarEntry[], str: string, scope: VariableScope): VarEntry | null {
  // STRING 변수는 정확 일치 + 용도(스코프). fontFamily가 다른 STRING에 붙는 오매칭 방지.
  for (const e of entries) {
    if (e.str !== str) continue;
    if (!e.scopes.includes('ALL_SCOPES') && !e.scopes.includes(scope)) continue;
    return e;
  }
  return null;
}

/* ---------- 노드 순회 바인딩 ---------- */
async function walk(
  node: SceneNode,
  entries: VarEntry[],
  res: BindResult,
  flags: Set<string>,
  apply: boolean,
  hooks: BindHooks,
  prog: Progress,
  preview: Preview | null,
  depth: number,
  parentId: string | null,
): Promise<void> {
  if (res.cancelled) return;
  // 숨긴 레이어는 화면에 없는 값이라 하위까지 통째로 제외 — extract.ts와 동일 기준.
  if (node.visible === false) {
    flags.add('숨긴 레이어는 바인딩에서 제외했습니다.');
    note(res, 'hidden', node, preview);
    return;
  }
  // 미리보기 트리(#13)용: 방문한 모든 노드를 기록(나중에 영향+조상으로 가지치기).
  preview?.nodeIndex.push({ id: node.id, name: node.name, type: node.type, depth, parentId });
  bindPaints(node, entries, res, apply, preview);
  bindFrame(node, entries, res, flags, apply, preview);
  bindRadius(node, entries, res, apply, preview);
  bindStroke(node, entries, res, apply, preview);
  bindOpacity(node, entries, res, apply, preview);
  bindEffects(node, entries, res, apply, preview);
  await bindText(node, entries, res, apply, preview);
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
      flags.add('인스턴스 내부는 오버라이드가 되므로 건너뛰었습니다 — 컴포넌트 원본에서 바인딩하세요.');
      note(res, 'instance-children', node, preview);
    }
    return;
  }
  if ('children' in node)
    for (const c of node.children) {
      await walk(c, entries, res, flags, apply, hooks, prog, preview, depth + 1, node.id);
      if (res.cancelled) return;
    }
}

function bindPaints(node: SceneNode, entries: VarEntry[], res: BindResult, apply: boolean, preview: Preview | null): void {
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
    const allowed = key === 'fills' ? FILL_SCOPES : STROKE_SCOPES;
    let changed = false;
    const next = paints.map((p, i) => {
      if (p.type !== 'SOLID') return p;
      const st = stateReason(colorState(p, node, key, i));
      if (st) {
        note(res, st, node, preview, key);
        return p;
      }
      // 반투명 페인트(opacity<1)는 연결하지 않는다 — 색 변수가 붙으면 Figma가 페인트 불투명도를
      // 변수의 alpha로 덮어써, 8% 검정 테두리가 100% 검정으로 바뀐다.
      if (isTranslucentPaint(p)) {
        skip(res, 'translucent', node, preview, key);
        return p;
      }
      const hex = rgbToHex(p.color);
      const e = matchColor(entries, hex, allowed);
      if (!e) {
        skip(res, 'no-match', node, preview, key);
        return p;
      }
      res.bound++;
      addColorCand(preview, node, key, i, hex, e);
      if (!apply) return p;
      changed = true;
      return figma.variables.setBoundVariableForPaint(p, 'color', e.variable);
    });
    if (changed && apply) (node as unknown as Record<string, Paint[]>)[key] = next;
  }
}

function bindFrame(
  node: SceneNode,
  entries: VarEntry[],
  res: BindResult,
  flags: Set<string>,
  apply: boolean,
  preview: Preview | null,
): void {
  if (node.type !== 'FRAME' && node.type !== 'COMPONENT' && node.type !== 'INSTANCE') return;

  // 크기: 오토레이아웃 맥락(자신 또는 부모)에서 Fixed인 축만 — extract.ts의 수집 기준과 동일.
  // 자유 배치 프레임은 Hug/Fill이 될 수 없어 layoutSizing*가 항상 'FIXED'라, 이 게이트가 없으면
  // 화면 프레임·장식 박스의 width/height까지 크기 변수에 붙는다.
  const parent = node.parent;
  // 절대 배치 자식은 오토레이아웃 흐름 밖이라 Hug/Fill을 고를 수 없고 항상 FIXED다 —
  // 부모가 오토레이아웃이어도 '디자이너가 Fixed를 선택했다'가 성립하지 않는다.
  const absolute = 'layoutPositioning' in node && (node as FrameNode).layoutPositioning === 'ABSOLUTE';
  const inAutoLayout =
    !absolute &&
    (node.layoutMode !== 'NONE' ||
      (parent != null && 'layoutMode' in parent && (parent as FrameNode).layoutMode !== 'NONE'));
  if (inAutoLayout) {
    /**
     * 축 하나를 처리 — 두 축이 같은 규칙을 쓰도록 한 곳에 모은다.
     * 소수 크기에 같은 값의 토큰이 없으면 사유를 'size-fraction'으로 따로 남긴다
     * (extract가 소수 size를 토큰으로 만들지 않으므로 '매칭 없음'과 원인이 다르다).
     */
    const bindAxis = (sizing: 'FIXED' | 'HUG' | 'FILL', field: 'width' | 'height', v: number): void => {
      if (sizing !== 'FIXED') {
        flags.add('일부 크기는 HUG/FILL이라 width/height 바인딩을 건너뜀(Fixed 필요).');
        note(res, 'hug-fill', node, preview, field);
        return;
      }
      const fraction = Math.abs(v - Math.round(v)) >= 0.005; // extract의 소수 2자리 반올림과 같은 판정
      tryBind(node, field, v, entries, res, apply, preview, fraction ? 'size-fraction' : undefined);
    };
    bindAxis(node.layoutSizingHorizontal, 'width', node.width);
    bindAxis(node.layoutSizingVertical, 'height', node.height);
  } else {
    flags.add('자유 배치(오토레이아웃 밖) 프레임은 크기 바인딩에서 제외했습니다.');
    note(res, 'size-free-layout', node, preview);
  }

  // 여백/간격: 오토레이아웃에만
  if (node.layoutMode === 'NONE') {
    flags.add('오토레이아웃이 아닌 프레임은 padding/gap 바인딩 불가.');
    note(res, 'no-autolayout', node, preview);
    return;
  }
  if (node.layoutMode === 'GRID') {
    // 그리드 모드의 간격은 gridRowGap/gridColumnGap(extract.ts와 동일 기준).
    tryBind(node, 'gridRowGap', node.gridRowGap, entries, res, apply, preview);
    tryBind(node, 'gridColumnGap', node.gridColumnGap, entries, res, apply, preview);
  } else {
    // 사이 간격 자동(Space between)이면 간격 값은 피그마가 쓰지 않는다 — 붙이면 정렬이 MIN으로 바뀌어
    // 레이어 모양이 바뀐다(§2.11 "사이 간격 자동", QA #3 불합격 1). 사유만 남기고 건너뛴다.
    // 줄바꿈이 아니면 줄 사이 간격은 이 레이어에 없는 값이다 — 찾지도 세지도 않는다(§2.11 "줄바꿈이 아님").
    for (const f of ['itemSpacing', 'counterAxisSpacing'] as const) {
      const v = node[f];
      if (typeof v !== 'number') continue;
      const skip = gapSkip(node, f);
      if (skip === 'no-wrap') continue;
      if (skip === 'space-between') note(res, 'space-between', node, preview, f);
      else tryBind(node, f, v, entries, res, apply, preview);
    }
  }
  tryBind(node, 'paddingLeft', node.paddingLeft, entries, res, apply, preview);
  tryBind(node, 'paddingRight', node.paddingRight, entries, res, apply, preview);
  tryBind(node, 'paddingTop', node.paddingTop, entries, res, apply, preview);
  tryBind(node, 'paddingBottom', node.paddingBottom, entries, res, apply, preview);
}

function bindRadius(node: SceneNode, entries: VarEntry[], res: BindResult, apply: boolean, preview: Preview | null): void {
  if (!('cornerRadius' in node)) return;
  const r = (node as { cornerRadius: number | typeof figma.mixed }).cornerRadius;
  const corners = ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius'] as const;
  if (r !== figma.mixed && typeof r === 'number' && r > 0) {
    for (const c of corners) tryBind(node, c, r, entries, res, apply, preview);
  } else if (r === figma.mixed) {
    for (const c of corners) {
      const cv = (node as unknown as Record<string, number>)[c];
      if (typeof cv === 'number' && cv > 0) tryBind(node, c, cv, entries, res, apply, preview);
    }
  }
}

function bindOpacity(node: SceneNode, entries: VarEntry[], res: BindResult, apply: boolean, preview: Preview | null): void {
  if (!('opacity' in node)) return;
  const o = (node as { opacity: number }).opacity;
  if (typeof o !== 'number' || o >= 1 || o <= 0) return; // 1/0은 바인딩 대상 아님
  tryBind(node, 'opacity', o, entries, res, apply, preview);
}

function bindStroke(node: SceneNode, entries: VarEntry[], res: BindResult, apply: boolean, preview: Preview | null): void {
  if (!('strokes' in node) || !('strokeWeight' in node)) return;
  // 보이는 선이 있을 때만 두께 바인딩(선 없는 노드의 strokeWeight는 무의미).
  const strokes = (node as { strokes: readonly Paint[] | typeof figma.mixed }).strokes;
  if (strokes === figma.mixed || !Array.isArray(strokes) || !strokes.some((p) => p.visible !== false)) return;
  const w = (node as { strokeWeight: number | typeof figma.mixed }).strokeWeight;
  // 선 두께는 정수만(§2.11, 2026-11-04) — 소수 두께는 정수 변수에 당겨 붙이지 않고 "소수 선 두께"로 건너뛴다.
  // 이미 있는 소수 변수(stroke-width/1_5 등)에도 붙이지 않는다.
  const one = (field: 'strokeWeight' | 'strokeTopWeight' | 'strokeRightWeight' | 'strokeBottomWeight' | 'strokeLeftWeight', v: number): void => {
    if (!(v > 0)) return;
    // 이미 붙은 것(소수 변수 stroke-width/1_5 포함)은 소수 판정보다 먼저 — "이미 연결됨" · "삭제된 변수"(§4.6).
    const st = stateReason(nodeFieldState(node, field));
    if (st) { note(res, st, node, preview, field); return; }
    if (Math.abs(v - Math.round(v)) >= 0.005) { note(res, 'fraction', node, preview, field); return; }
    tryBind(node, field, v, entries, res, apply, preview);
  };
  if (w !== figma.mixed && typeof w === 'number') {
    one('strokeWeight', w);
    return;
  }
  // 변별 두께(상/우/하/좌)
  for (const side of ['strokeTopWeight', 'strokeRightWeight', 'strokeBottomWeight', 'strokeLeftWeight'] as const) {
    const sv = (node as unknown as Record<string, number>)[side];
    if (typeof sv === 'number') one(side, sv);
  }
}

function bindEffects(node: SceneNode, entries: VarEntry[], res: BindResult, apply: boolean, preview: Preview | null): void {
  if (!('effects' in node)) return;
  const effects = (node as { effects: readonly Effect[] }).effects;
  if (!effects.some((e) => e.type === 'DROP_SHADOW' || e.type === 'INNER_SHADOW')) return;
  // 효과 스타일이 붙은 효과는 건너뛴다(스타일 사용 중).
  if (hasStyleId(node, 'effectStyleId')) {
    note(res, 'styled', node, preview, 'effects');
    return;
  }
  let changed = false;
  const next = effects.map((e, i) => {
    if (e.type !== 'DROP_SHADOW' && e.type !== 'INNER_SHADOW') return e;
    const st = stateReason(colorState(e, node, 'effects', i));
    if (st) {
      note(res, st, node, preview, 'effects');
      return e;
    }
    // 그림자 색은 RGBA다 — 25% 그림자를 alpha 1 변수에 붙이면 100% 검정 그림자가 된다(위 페인트와 같은 이유).
    if (isTranslucentEffectColor(e)) {
      skip(res, 'translucent', node, preview, 'effects');
      return e;
    }
    const hex = rgbToHex(e.color);
    const ent = matchColor(entries, hex, EFFECT_SCOPES);
    if (!ent) {
      skip(res, 'no-match', node, preview, 'effects');
      return e;
    }
    res.bound++;
    addColorCand(preview, node, 'effects', i, hex, ent);
    if (!apply) return e;
    changed = true;
    return figma.variables.setBoundVariableForEffect(e, 'color', ent.variable);
  });
  if (changed && apply) (node as unknown as { effects: readonly Effect[] }).effects = next;
}

async function bindText(node: SceneNode, entries: VarEntry[], res: BindResult, apply: boolean, preview: Preview | null): Promise<void> {
  if (node.type !== 'TEXT') return;
  if (node.fontName === figma.mixed) return;
  // 텍스트 스타일이 붙은 글자는 글자 속성을 건너뛴다(스타일 사용 중) — 속성 단위로 센다.
  if (hasStyleId(node, 'textStyleId')) {
    // 스타일이 없었다면 시도했을 자리만 센다(px 아닌 줄 높이·자간, 같은 글꼴 변수가 없는 글꼴은 원래 대상이 아님).
    if (node.fontSize !== figma.mixed) note(res, 'styled', node, preview, 'fontSize');
    if (node.lineHeight !== figma.mixed && node.lineHeight.unit === 'PIXELS') note(res, 'styled', node, preview, 'lineHeight');
    if (node.letterSpacing !== figma.mixed && node.letterSpacing.unit === 'PIXELS') note(res, 'styled', node, preview, 'letterSpacing');
    if (matchString(entries, node.fontName.family, 'FONT_FAMILY')) note(res, 'styled', node, preview, 'fontFamily');
    return;
  }
  try {
    await figma.loadFontAsync(node.fontName); // 텍스트 속성 변경 전 폰트 로드 필수(미리보기에서도 가용성 확인)
  } catch {
    note(res, 'font', node, preview);
    return;
  }
  if (node.fontSize !== figma.mixed) tryBindText(node, 'fontSize', node.fontSize, entries, res, apply, preview);
  // lineHeight/letterSpacing은 노드 단위가 px일 때만 직접 바인딩(비-px 노드는 변수 바인딩 불가)
  if (node.lineHeight !== figma.mixed && node.lineHeight.unit === 'PIXELS') {
    tryBindText(node, 'lineHeight', node.lineHeight.value, entries, res, apply, preview);
  }
  if (node.letterSpacing !== figma.mixed && node.letterSpacing.unit === 'PIXELS') {
    tryBindText(node, 'letterSpacing', node.letterSpacing.value, entries, res, apply, preview);
  }
  // fontFamily — STRING 변수(FONT_FAMILY)에 정확 일치 바인딩.
  if (node.characters.length === 0) return;
  const st = stateReason(textFieldState(node, 'fontFamily'));
  if (st) {
    note(res, st, node, preview, 'fontFamily');
    return;
  }
  const fe = matchString(entries, node.fontName.family, 'FONT_FAMILY');
  if (!fe) return;
  if (!apply) {
    res.bound++;
    addStrCand(preview, node, 'fontFamily', node.fontName.family, fe);
    return;
  }
  try {
    node.setRangeBoundVariable(0, node.characters.length, 'fontFamily', fe.variable);
    res.bound++;
    addStrCand(preview, node, 'fontFamily', node.fontName.family, fe); // 결과 트리(실제로 붙은 것만)
  } catch {
    skip(res, 'error', node, preview, 'fontFamily');
  }
}

function tryBindText(
  node: TextNode,
  field: VariableBindableTextField,
  value: number,
  entries: VarEntry[],
  res: BindResult,
  apply: boolean,
  preview: Preview | null,
): void {
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
  const e = matchFloat(entries, value, FIELD_SCOPE[field]);
  if (!e) {
    skip(res, 'no-match', node, preview, field);
    return;
  }
  if (!apply) {
    res.bound++;
    addFloatCand(preview, node, field, value, e);
    return;
  }
  try {
    node.setRangeBoundVariable(0, node.characters.length, field, e.variable);
    res.bound++;
    addFloatCand(preview, node, field, value, e); // 결과 트리(실제로 붙은 것만)
  } catch {
    skip(res, 'error', node, preview, field);
  }
}

function tryBind(
  node: SceneNode,
  field: VariableBindableNodeField,
  value: number,
  entries: VarEntry[],
  res: BindResult,
  apply: boolean,
  preview: Preview | null,
  /** 매칭 실패 사유 키 — 호출자가 좁힌 조건으로 실패했을 때 그 이유를 남긴다. */
  noMatchReason = 'no-match',
): void {
  const st = stateReason(nodeFieldState(node, field));
  if (st) {
    note(res, st, node, preview, field);
    return;
  }
  const e = matchFloat(entries, value, FIELD_SCOPE[field]);
  if (!e) {
    skip(res, noMatchReason, node, preview, field);
    return;
  }
  if (!apply) {
    res.bound++;
    addFloatCand(preview, node, field, value, e);
    return;
  }
  try {
    (node as unknown as { setBoundVariable: (f: VariableBindableNodeField, x: Variable) => void }).setBoundVariable(field, e.variable);
    res.bound++;
    addFloatCand(preview, node, field, value, e); // 결과 트리(실제로 붙은 것만)
  } catch {
    skip(res, 'error', node, preview, field);
  }
}

/* ---------- 체크한 자리 연결(APPLY_SELECTED) — 연결 직전 다시 확인(§4.6 "찾는 범위") ---------- */

/** 체크한 자리 한 건(미리보기 후보에서 온 것). */
export interface SelectedBindItem {
  nodeId: string;
  field: string;
  index?: number;
  variableId: string;
}

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
 * - 'error': 연결 호출이 실패함
 */
export async function bindSelectedItems(items: readonly SelectedBindItem[]): Promise<SelectedBindResult> {
  const res: BindResult = { bound: 0, skipped: 0, flags: [], reasons: {} };
  const preview: Preview = { candidates: [], nodeIndex: [], skips: [], skipSeen: new Set() };
  const cols = await figma.variables.getLocalVariableCollectionsAsync();
  const modeOf = new Map(cols.map((c) => [c.id, c.defaultModeId]));
  const localIds = new Set((await figma.variables.getLocalVariablesAsync()).map((v) => v.id));

  // 노드를 한 번씩만 찾고, 살아 있는 변수 집합은 그 노드들(하위 제외)로 만든다.
  const nodes = new Map<string, SceneNode | null>();
  for (const it of items) {
    if (nodes.has(it.nodeId)) continue;
    const n = await figma.getNodeByIdAsync(it.nodeId);
    nodes.set(it.nodeId, n && 'type' in n && n.type !== 'PAGE' && n.type !== 'DOCUMENT' ? (n as SceneNode) : null);
  }
  const roots = [...nodes.values()].filter((n): n is SceneNode => !!n);
  liveVarIds = await collectLiveVarIds(roots, localIds, false);

  const valueCache = new Map<string, { variable: Variable; value: VariableValue | undefined } | null>();
  const variableOf = async (id: string) => {
    if (valueCache.has(id)) return valueCache.get(id) ?? null;
    const v = await figma.variables.getVariableByIdAsync(id);
    const entry = v ? { variable: v, value: await resolveValue(v, modeOf) } : null;
    valueCache.set(id, entry);
    return entry;
  };

  const changedPaints = new Map<SceneNode, Map<'fills' | 'strokes' | 'effects', (Paint | Effect)[]>>();
  const fail = (key: string, node: SceneNode | null, field: string): void => {
    if (node) skip(res, key, node, preview, field);
    else {
      res.skipped++;
      res.reasons[key] = (res.reasons[key] ?? 0) + 1;
    }
  };

  for (const it of items) {
    const node = nodes.get(it.nodeId) ?? null;
    const vv = await variableOf(it.variableId);
    if (!node || !vv) {
      fail('changed', node, it.field);
      continue;
    }
    const { variable, value } = vv;
    try {
      if (it.field === 'fills' || it.field === 'strokes' || it.field === 'effects') {
        const key = it.field;
        if (hasStyleId(node, STYLE_KEY_OF[key])) {
          fail('styled', node, key);
          continue;
        }
        const pending = changedPaints.get(node)?.get(key);
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
        if (translucent || variable.resolvedType !== 'COLOR' || !value || !isRGB(value) || !isOpaqueColorValue(value) || rgbToHex(value) !== hex) {
          fail('changed', node, key);
          continue;
        }
        const arr = list.slice();
        arr[i] =
          key === 'effects'
            ? figma.variables.setBoundVariableForEffect(x as Effect, 'color', variable)
            : figma.variables.setBoundVariableForPaint(x as SolidPaint, 'color', variable);
        let m = changedPaints.get(node);
        if (!m) changedPaints.set(node, (m = new Map()));
        m.set(key, arr);
        res.bound++;
        continue;
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
        node.setRangeBoundVariable(0, node.characters.length, field, variable);
        res.bound++;
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
      (node as unknown as { setBoundVariable: (f: VariableBindableNodeField, x: Variable) => void }).setBoundVariable(it.field as VariableBindableNodeField, variable);
      res.bound++;
    } catch {
      fail('error', node, it.field);
    }
  }
  for (const [node, m] of changedPaints) {
    for (const [key, arr] of m) {
      try {
        (node as unknown as Record<string, unknown>)[key] = arr;
      } catch {
        /* 배열 쓰기 실패 — 이미 센 bound는 되돌릴 수 없어 그대로 둔다(드묾) */
      }
    }
  }
  const skips = capSkipsByReason(preview.skips, SKIP_PREVIEW_CAP);
  return { bound: res.bound, skipped: res.skipped, reasons: res.reasons, skips, skipTotal: preview.skips.length };
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


/* ---------- 연결 현황 스캔(읽기 전용) ---------- */
/**
 * 선택 안에서 **이미 붙어 있는** 변수 바인딩을 읽어 결과 트리와 같은 모양으로 돌려준다.
 * 플러그인을 닫았다 열어도 파일에 남은 상태를 그대로 보여 주기 위한 것(Tokens Studio Inspect와
 * 같은 "상태 조회" — 실행 기록이 아니다). 변수 해석은 하지 않고 이름만 붙인다. 상한 RESULT_CAP.
 */
export interface BindingsScan {
  candidates: BindCandidate[];
  nodes: BindNode[];
  /** 상한 전 실제 건수. */
  total: number;
  /** 바인딩이 하나라도 있는 레이어 수. */
  boundNodes: number;
}

export async function scanBindings(selection: readonly SceneNode[]): Promise<BindingsScan> {
  const vars = await figma.variables.getLocalVariablesAsync();
  const cols = await figma.variables.getLocalVariableCollectionsAsync();
  const tierOf = collectionTiers(cols);
  const byId = new Map(vars.map((v) => [v.id, v]));
  const nameOf = (id: string): { name: string; tier: number } => {
    const v = byId.get(id);
    return v ? { name: v.name, tier: tierOf.get(v.variableCollectionId) ?? 0 } : { name: '(삭제된 변수)', tier: 0 };
  };
  const candidates: BindCandidate[] = [];
  const nodeIndex: BindNode[] = [];
  let total = 0;
  let boundNodes = 0;
  const push = (c: BindCandidate): void => {
    total++;
    if (candidates.length < RESULT_CAP) candidates.push(c);
  };
  const aliasId = (raw: unknown): string | undefined => {
    if (!raw) return undefined;
    const a = Array.isArray(raw) ? raw[0] : raw;
    return a && typeof a === 'object' && 'id' in a ? (a as VariableAlias).id : undefined;
  };
  const walkNode = (node: SceneNode, depth: number, parentId: string | null): void => {
    if (node.visible === false) return;
    nodeIndex.push({ id: node.id, name: node.name, type: node.type, depth, parentId });
    let any = false;
    // 페인트·효과 색
    for (const key of ['fills', 'strokes'] as const) {
      const ps = (node as unknown as Record<string, unknown>)[key];
      if (!Array.isArray(ps)) continue;
      ps.forEach((p, i) => {
        const id = (p as { boundVariables?: { color?: VariableAlias } }).boundVariables?.color?.id;
        if (!id) return;
        const v = nameOf(id);
        const hex = (p as SolidPaint).type === 'SOLID' ? rgbToHex((p as SolidPaint).color) : '';
        push({ nodeId: node.id, field: key, index: i, currentValue: hex, variableId: id, variableName: v.name, tier: v.tier });
        any = true;
      });
    }
    const effects = (node as { effects?: readonly Effect[] }).effects;
    if (Array.isArray(effects)) {
      effects.forEach((e, i) => {
        const id = (e as { boundVariables?: { color?: VariableAlias } }).boundVariables?.color?.id;
        if (!id) return;
        const v = nameOf(id);
        push({ nodeId: node.id, field: 'effects', index: i, currentValue: 'color' in e ? rgbToHex((e as DropShadowEffect).color) : '', variableId: id, variableName: v.name, tier: v.tier });
        any = true;
      });
    }
    // 노드 스칼라 필드 + 텍스트 구간 필드
    const bv = (node as { boundVariables?: Record<string, unknown> }).boundVariables ?? {};
    for (const [field, raw] of Object.entries(bv)) {
      if (field === 'fills' || field === 'strokes' || field === 'effects' || field === 'componentProperties' || field === 'textRangeFills') continue;
      const id = aliasId(raw);
      if (!id) continue;
      const v = nameOf(id);
      const cur = (node as unknown as Record<string, unknown>)[field];
      let currentValue = '';
      if (typeof cur === 'number') currentValue = String(Math.round(cur * 100) / 100);
      else if (field === 'fontFamily' && typeof (node as TextNode).fontName === 'object' && (node as TextNode).fontName !== figma.mixed) currentValue = ((node as TextNode).fontName as FontName).family;
      else if ((TEXT_RANGE_FIELDS as readonly string[]).includes(field) && cur && typeof cur === 'object' && 'value' in (cur as object)) currentValue = String((cur as { value: number }).value);
      push({ nodeId: node.id, field, currentValue, variableId: id, variableName: v.name, tier: v.tier });
      any = true;
    }
    if (any) boundNodes++;
    if (node.type === 'INSTANCE') return; // 인스턴스 내부는 메인 컴포넌트의 몫
    if ('children' in node) for (const c of node.children) walkNode(c, depth + 1, node.id);
  };
  for (const n of selection) if (isEffectivelyVisible(n)) walkNode(n, 0, null);
  return { candidates, nodes: pruneToAffected(nodeIndex, candidates, []), total, boundNodes };
}

/* ---------- 변수 사용 조회(IA v3 §4.4 — 보기 전용) ----------
   연결 작업과 범위가 다르다: 인스턴스 안쪽 레이어도 센다(보기 전용, 재검토 ⑥). 숨긴 레이어는 세지 않는다.
   상한이 없다 — 숫자만 모으고 후보 목록을 만들지 않으므로 600개 결과 상한(RESULT_CAP)과 무관하다. */

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

