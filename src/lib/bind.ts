/* ============================================================
   bind.ts — 토큰(변수)을 레이어 속성에 바인딩 (top-down)
   - 매칭은 resolved 값 기준, Component > Semantic 우선. Global 직접 바인딩 제외.
   - 프레임 크기(Fixed)·여백(오토레이아웃)·반경·효과·텍스트 지원.
   ============================================================ */
import { rgbToHex } from './tokens';
import { GLOBAL, SEMANTIC, COMPONENT } from './variables';
import type { BindCandidate, BindNode, BindSkip } from '../shared/messages';

interface VarEntry {
  variable: Variable;
  tier: number; // Component 3 > Semantic 2 > Global 1
  type: VariableResolvedDataType;
  scopes: readonly VariableScope[]; // 용도 스코프 — 필드와 안 맞는 변수 오매칭 차단
  colorHex?: string;
  num?: number;
  str?: string;
}

const TIER: Record<string, number> = { [COMPONENT]: 3, [SEMANTIC]: 2, [GLOBAL]: 1 };

/**
 * 바인딩 대상 필드 → 요구 변수 스코프. 변수 `scopes`가 이 스코프(또는 `ALL_SCOPES`)를
 * 포함할 때만 매칭한다. 여백(GAP)이 line-height/letter-spacing(LINE_HEIGHT/LETTER_SPACING)
 * 변수에 값만 비슷하다고 잘못 연결되는 오매칭을 막는다. (Figma의 GAP 스코프는 gap+padding 공용.)
 */
const FIELD_SCOPE: Record<string, VariableScope> = {
  width: 'WIDTH_HEIGHT',
  height: 'WIDTH_HEIGHT',
  itemSpacing: 'GAP',
  counterAxisSpacing: 'GAP',
  gridRowGap: 'GAP',
  gridColumnGap: 'GAP',
  paddingLeft: 'GAP',
  paddingRight: 'GAP',
  paddingTop: 'GAP',
  paddingBottom: 'GAP',
  topLeftRadius: 'CORNER_RADIUS',
  topRightRadius: 'CORNER_RADIUS',
  bottomLeftRadius: 'CORNER_RADIUS',
  bottomRightRadius: 'CORNER_RADIUS',
  strokeWeight: 'STROKE_FLOAT',
  strokeTopWeight: 'STROKE_FLOAT',
  strokeRightWeight: 'STROKE_FLOAT',
  strokeBottomWeight: 'STROKE_FLOAT',
  strokeLeftWeight: 'STROKE_FLOAT',
  fontSize: 'FONT_SIZE',
  lineHeight: 'LINE_HEIGHT',
  letterSpacing: 'LETTER_SPACING',
  opacity: 'OPACITY',
};

/** 불투명도는 0~1 범위라 px 허용오차 대신 정밀 매칭(추출 시 소수 2자리 반올림 대응). */
const OPACITY_TOL = 0.005;

export interface BindResult {
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
  preview?.candidates.push({ nodeId: node.id, field, index, currentValue: hex, variableId: e.variable.id, variableName: e.variable.name, tier: e.tier });
}
function addFloatCand(preview: Preview | null, node: SceneNode, field: string, value: number, e: VarEntry): void {
  preview?.candidates.push({ nodeId: node.id, field, currentValue: String(value), variableId: e.variable.id, variableName: e.variable.name, tier: e.tier, distance: e.num != null ? Math.abs(e.num - value) : undefined });
}
function addStrCand(preview: Preview | null, node: SceneNode, field: string, value: string, e: VarEntry): void {
  preview?.candidates.push({ nodeId: node.id, field, currentValue: value, variableId: e.variable.id, variableName: e.variable.name, tier: e.tier });
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
  tolerance: number,
  apply = true, // UX1: false면 dry-run(미리보기) — 변경 없이 동일 집계만.
  hooks: BindHooks = {}, // UX6: 진행률·취소.
): Promise<BindResult> {
  const entries = await buildIndex();
  const res: BindResult = { bound: 0, skipped: 0, flags: [], reasons: {} };
  const flagSet = new Set<string>();
  const prog: Progress = { done: 0, total: hooks.onProgress ? countNodes(selection) : 0, every: 50 };
  const preview: Preview | null = apply ? null : { candidates: [], nodeIndex: [], skips: [], skipSeen: new Set() };
  for (const node of selection) {
    // 선택 루트가 숨긴 그룹 안이면 walk의 자체 visible 검사로는 못 거른다(루트 자신은 보임).
    if (!isEffectivelyVisible(node)) {
      flagSet.add('숨긴 레이어는 바인딩에서 제외했습니다.');
      note(res, 'hidden', node, preview);
      continue;
    }
    await walk(node, entries, tolerance, res, flagSet, apply, hooks, prog, preview, 0, null);
    if (res.cancelled) break;
  }
  res.flags = [...flagSet];
  if (preview) {
    res.candidates = preview.candidates;
    // 트리 씨앗도 잘린 목록으로 — 트리 크기가 '고른 레이어 수'가 아니라 '보낼 스킵 수'에 묶인다.
    const skips = preview.skips.slice(0, SKIP_PREVIEW_CAP);
    res.nodes = pruneToAffected(preview.nodeIndex, preview.candidates, skips);
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
  const tierOf = new Map(cols.map((c) => [c.id, TIER[c.name] ?? 0]));
  const vars = await figma.variables.getLocalVariablesAsync();
  const entries: VarEntry[] = [];
  for (const v of vars) {
    const tier = tierOf.get(v.variableCollectionId) ?? 0;
    if (tier < 2) continue; // Component/Semantic만 바인딩 대상
    const val = await resolveValue(v, modeOf);
    if (val == null) continue;
    const e: VarEntry = { variable: v, tier, type: v.resolvedType, scopes: v.scopes ?? ['ALL_SCOPES'] };
    if (v.resolvedType === 'COLOR' && isRGB(val)) e.colorHex = rgbToHex(val);
    else if (v.resolvedType === 'FLOAT' && typeof val === 'number') e.num = val;
    else if (v.resolvedType === 'STRING' && typeof val === 'string') e.str = val;
    entries.push(e);
  }
  // 높은 tier 우선
  entries.sort((a, b) => b.tier - a.tier);
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

function isRGB(v: VariableValue): v is RGB | RGBA {
  return typeof v === 'object' && v !== null && 'r' in v && 'g' in v && 'b' in v;
}

/** 색상 필드별 허용 스코프 — 변수 scopes가 이 중 하나(또는 ALL_SCOPES)를 포함해야 매칭. */
const FILL_SCOPES: readonly VariableScope[] = ['ALL_FILLS', 'FRAME_FILL', 'SHAPE_FILL', 'TEXT_FILL'];
const STROKE_SCOPES: readonly VariableScope[] = ['STROKE_COLOR'];
const EFFECT_SCOPES: readonly VariableScope[] = ['EFFECT_COLOR'];

function colorScopeOk(e: VarEntry, allowed: readonly VariableScope[]): boolean {
  return e.scopes.includes('ALL_SCOPES') || allowed.some((s) => e.scopes.includes(s));
}

function matchColor(entries: VarEntry[], hex: string, allowed: readonly VariableScope[]): VarEntry | null {
  // 용도(스코프) 일치 + 정확한 hex. stroke 전용 색이 fill에, effect 색이 fill에 붙는 오매칭 방지.
  for (const e of entries) if (e.colorHex === hex && colorScopeOk(e, allowed)) return e;
  return null;
}
function matchFloat(entries: VarEntry[], value: number, tol: number, scope?: VariableScope): VarEntry | null {
  let best: VarEntry | null = null;
  let bestDist = Infinity;
  for (const e of entries) {
    if (e.num == null) continue;
    // 용도(스코프) 불일치 변수는 제외 — 여백이 line-height/letter-spacing 등에 붙는 오매칭 방지.
    if (scope && !e.scopes.includes('ALL_SCOPES') && !e.scopes.includes(scope)) continue;
    const dist = Math.abs(e.num - value);
    if (dist > tol) continue;
    // 가장 가까운 값 우선, 동률이면 높은 tier 우선.
    if (dist < bestDist || (dist === bestDist && best !== null && best.tier < e.tier)) {
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
  tol: number,
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
  bindFrame(node, entries, tol, res, flags, apply, preview);
  bindRadius(node, entries, tol, res, apply, preview);
  bindStroke(node, entries, tol, res, apply, preview);
  bindOpacity(node, entries, tol, res, apply, preview);
  bindEffects(node, entries, res, apply, preview);
  await bindText(node, entries, tol, res, apply, preview);
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
      await walk(c, entries, tol, res, flags, apply, hooks, prog, preview, depth + 1, node.id);
      if (res.cancelled) return;
    }
}

function bindPaints(node: SceneNode, entries: VarEntry[], res: BindResult, apply: boolean, preview: Preview | null): void {
  for (const key of ['fills', 'strokes'] as const) {
    if (!(key in node)) continue;
    const paints = (node as unknown as Record<string, Paint[] | typeof figma.mixed>)[key];
    if (paints === figma.mixed || !Array.isArray(paints)) continue;
    const allowed = key === 'fills' ? FILL_SCOPES : STROKE_SCOPES;
    let changed = false;
    const next = paints.map((p, i) => {
      if (p.type !== 'SOLID') return p;
      const hex = rgbToHex(p.color);
      const e = matchColor(entries, hex, allowed);
      if (!e) {
        skip(res, 'no-match', node, preview, key);
        return p;
      }
      res.bound++;
      if (!apply) {
        addColorCand(preview, node, key, i, hex, e);
        return p;
      }
      changed = true;
      return figma.variables.setBoundVariableForPaint(p, 'color', e.variable);
    });
    if (changed && apply) (node as unknown as Record<string, Paint[]>)[key] = next;
  }
}

function bindFrame(
  node: SceneNode,
  entries: VarEntry[],
  tol: number,
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
     * 축 하나를 처리 — 두 축이 같은 규칙을 쓰도록 한 곳에 모은다(세로 축만 사유 집계가
     * 빠져 HUG/FILL 건수가 실제보다 적게 보이던 문제).
     *
     * 소수 크기는 **정확히 같은 값의 토큰에만** 붙인다. extract가 소수 size를 토큰으로
     * 만들지 않으므로(자유 리사이즈 잔값), 허용오차로 343.5를 size/344에 스냅하면
     * 추출이 거부한 값을 바인딩이 되살리면서 지오메트리까지 바꾸게 된다. 반대로 같은 값의
     * 토큰이 이미 있다면 붙이는 게 맞으므로 허용오차만 0으로 좁힌다.
     */
    const bindAxis = (sizing: 'FIXED' | 'HUG' | 'FILL', field: 'width' | 'height', v: number): void => {
      if (sizing !== 'FIXED') {
        flags.add('일부 크기는 HUG/FILL이라 width/height 바인딩을 건너뜀(Fixed 필요).');
        note(res, 'hug-fill', node, preview, field);
        return;
      }
      const fraction = Math.abs(v - Math.round(v)) >= 0.005; // extract의 소수 2자리 반올림과 같은 판정
      tryBind(node, field, v, entries, fraction ? 0 : tol, res, apply, preview, fraction ? 'size-fraction' : undefined);
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
    tryBind(node, 'gridRowGap', node.gridRowGap, entries, tol, res, apply, preview);
    tryBind(node, 'gridColumnGap', node.gridColumnGap, entries, tol, res, apply, preview);
  } else {
    tryBind(node, 'itemSpacing', node.itemSpacing, entries, tol, res, apply, preview);
    if (typeof node.counterAxisSpacing === 'number') tryBind(node, 'counterAxisSpacing', node.counterAxisSpacing, entries, tol, res, apply, preview);
  }
  tryBind(node, 'paddingLeft', node.paddingLeft, entries, tol, res, apply, preview);
  tryBind(node, 'paddingRight', node.paddingRight, entries, tol, res, apply, preview);
  tryBind(node, 'paddingTop', node.paddingTop, entries, tol, res, apply, preview);
  tryBind(node, 'paddingBottom', node.paddingBottom, entries, tol, res, apply, preview);
}

function bindRadius(node: SceneNode, entries: VarEntry[], tol: number, res: BindResult, apply: boolean, preview: Preview | null): void {
  if (!('cornerRadius' in node)) return;
  const r = (node as { cornerRadius: number | typeof figma.mixed }).cornerRadius;
  const corners = ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius'] as const;
  if (r !== figma.mixed && typeof r === 'number' && r > 0) {
    for (const c of corners) tryBind(node, c, r, entries, tol, res, apply, preview);
  } else if (r === figma.mixed) {
    for (const c of corners) {
      const cv = (node as unknown as Record<string, number>)[c];
      if (typeof cv === 'number' && cv > 0) tryBind(node, c, cv, entries, tol, res, apply, preview);
    }
  }
}

function bindOpacity(node: SceneNode, entries: VarEntry[], tol: number, res: BindResult, apply: boolean, preview: Preview | null): void {
  if (!('opacity' in node)) return;
  const o = (node as { opacity: number }).opacity;
  if (typeof o !== 'number' || o >= 1 || o <= 0) return; // 1/0은 바인딩 대상 아님
  // 0~1 범위라 px 허용오차를 쓰지 않고 정밀(OPACITY_TOL) 매칭.
  tryBind(node, 'opacity', o, entries, Math.min(tol, OPACITY_TOL), res, apply, preview);
}

function bindStroke(node: SceneNode, entries: VarEntry[], tol: number, res: BindResult, apply: boolean, preview: Preview | null): void {
  if (!('strokes' in node) || !('strokeWeight' in node)) return;
  // 보이는 선이 있을 때만 두께 바인딩(선 없는 노드의 strokeWeight는 무의미).
  const strokes = (node as { strokes: readonly Paint[] | typeof figma.mixed }).strokes;
  if (strokes === figma.mixed || !Array.isArray(strokes) || !strokes.some((p) => p.visible !== false)) return;
  const w = (node as { strokeWeight: number | typeof figma.mixed }).strokeWeight;
  if (w !== figma.mixed && typeof w === 'number') {
    if (w > 0) tryBind(node, 'strokeWeight', w, entries, tol, res, apply, preview);
    return;
  }
  // 변별 두께(상/우/하/좌)
  for (const side of ['strokeTopWeight', 'strokeRightWeight', 'strokeBottomWeight', 'strokeLeftWeight'] as const) {
    const sv = (node as unknown as Record<string, number>)[side];
    if (typeof sv === 'number' && sv > 0) tryBind(node, side, sv, entries, tol, res, apply, preview);
  }
}

function bindEffects(node: SceneNode, entries: VarEntry[], res: BindResult, apply: boolean, preview: Preview | null): void {
  if (!('effects' in node)) return;
  let changed = false;
  const next = (node as { effects: readonly Effect[] }).effects.map((e, i) => {
    if (e.type !== 'DROP_SHADOW' && e.type !== 'INNER_SHADOW') return e;
    const hex = rgbToHex(e.color);
    const ent = matchColor(entries, hex, EFFECT_SCOPES);
    if (!ent) {
      skip(res, 'no-match', node, preview, 'effects');
      return e;
    }
    res.bound++;
    if (!apply) {
      addColorCand(preview, node, 'effects', i, hex, ent);
      return e;
    }
    changed = true;
    return figma.variables.setBoundVariableForEffect(e, 'color', ent.variable);
  });
  if (changed && apply) (node as unknown as { effects: readonly Effect[] }).effects = next;
}

async function bindText(node: SceneNode, entries: VarEntry[], tol: number, res: BindResult, apply: boolean, preview: Preview | null): Promise<void> {
  if (node.type !== 'TEXT') return;
  if (node.fontName === figma.mixed) return;
  try {
    await figma.loadFontAsync(node.fontName); // 텍스트 속성 변경 전 폰트 로드 필수(미리보기에서도 가용성 확인)
  } catch {
    note(res, 'font', node, preview);
    return;
  }
  if (node.fontSize !== figma.mixed) tryBindText(node, 'fontSize', node.fontSize, entries, tol, res, apply, preview);
  // lineHeight/letterSpacing은 노드 단위가 px일 때만 직접 바인딩(비-px 노드는 변수 바인딩 불가)
  if (node.lineHeight !== figma.mixed && node.lineHeight.unit === 'PIXELS') {
    tryBindText(node, 'lineHeight', node.lineHeight.value, entries, tol, res, apply, preview);
  }
  if (node.letterSpacing !== figma.mixed && node.letterSpacing.unit === 'PIXELS') {
    tryBindText(node, 'letterSpacing', node.letterSpacing.value, entries, tol, res, apply, preview);
  }
  // fontFamily — STRING 변수(FONT_FAMILY)에 정확 일치 바인딩.
  const fe = matchString(entries, node.fontName.family, 'FONT_FAMILY');
  if (fe && node.characters.length > 0) {
    if (!apply) {
      res.bound++;
      addStrCand(preview, node, 'fontFamily', node.fontName.family, fe);
    } else {
      try {
        node.setRangeBoundVariable(0, node.characters.length, 'fontFamily', fe.variable);
        res.bound++;
      } catch {
        skip(res, 'error', node, preview, 'fontFamily');
      }
    }
  }
}

function tryBindText(
  node: TextNode,
  field: VariableBindableTextField,
  value: number,
  entries: VarEntry[],
  tol: number,
  res: BindResult,
  apply: boolean,
  preview: Preview | null,
): void {
  const e = matchFloat(entries, value, tol, FIELD_SCOPE[field]);
  const len = node.characters.length;
  if (len === 0) {
    skip(res, 'empty-text', node, preview, field);
    return;
  }
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
    node.setRangeBoundVariable(0, len, field, e.variable);
    res.bound++;
  } catch {
    skip(res, 'error', node, preview, field);
  }
}

function tryBind(
  node: SceneNode,
  field: VariableBindableNodeField,
  value: number,
  entries: VarEntry[],
  tol: number,
  res: BindResult,
  apply: boolean,
  preview: Preview | null,
  /** 매칭 실패 사유 키 — 호출자가 좁힌 조건으로 실패했을 때 그 이유를 남긴다. */
  noMatchReason = 'no-match',
): void {
  const e = matchFloat(entries, value, tol, FIELD_SCOPE[field]);
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
  } catch {
    skip(res, 'error', node, preview, field);
  }
}
