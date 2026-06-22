/* ============================================================
   bind.ts — 토큰(변수)을 레이어 속성에 바인딩 (top-down)
   - 매칭은 resolved 값 기준, Component > Semantic 우선. Global 직접 바인딩 제외.
   - 프레임 크기(Fixed)·여백(오토레이아웃)·반경·효과·텍스트 지원.
   ============================================================ */
import { rgbToHex } from './tokens';
import { GLOBAL, SEMANTIC, COMPONENT } from './variables';
import type { BindCandidate, BindNode } from '../shared/messages';

interface VarEntry {
  variable: Variable;
  tier: number; // Component 3 > Semantic 2 > Global 1
  type: VariableResolvedDataType;
  colorHex?: string;
  num?: number;
  str?: string;
}

const TIER: Record<string, number> = { [COMPONENT]: 3, [SEMANTIC]: 2, [GLOBAL]: 1 };

export interface BindResult {
  bound: number;
  skipped: number;
  flags: string[];
  /** UX3: 스킵/건너뜀 사유별 집계(키→건수). 예: { 'no-match': 2, 'hug-fill': 3 }. */
  reasons: Record<string, number>;
  /** 사용량 한도로 일부만 적용되었는가(Free 티어). */
  limited?: boolean;
  /** UX6: 사용자가 취소해 중단되었는가(이미 처리한 만큼은 유지). */
  cancelled?: boolean;
  /** #6: dry-run(apply=false)일 때만 — 노드별 매칭 후보. */
  candidates?: BindCandidate[];
  /** #13: dry-run일 때만 — 미리보기 트리 맥락(영향 노드 + 조상 체인). */
  nodes?: BindNode[];
}

/** dry-run 미리보기 수집물(apply 시에는 null). */
interface Preview {
  candidates: BindCandidate[];
  /** 방문한 모든 노드(나중에 영향+조상으로 가지치기). */
  nodeIndex: BindNode[];
}

function addColorCand(preview: Preview | null, node: SceneNode, field: string, index: number, hex: string, e: VarEntry): void {
  preview?.candidates.push({ nodeId: node.id, field, index, currentValue: hex, variableId: e.variable.id, variableName: e.variable.name, tier: e.tier });
}
function addFloatCand(preview: Preview | null, node: SceneNode, field: string, value: number, e: VarEntry): void {
  preview?.candidates.push({ nodeId: node.id, field, currentValue: String(value), variableId: e.variable.id, variableName: e.variable.name, tier: e.tier, distance: e.num != null ? Math.abs(e.num - value) : undefined });
}

/** 미리보기 트리를 영향 노드 + 그 조상 체인으로 가지치기(pre-order 보존). */
function pruneToAffected(nodeIndex: BindNode[], candidates: BindCandidate[]): BindNode[] {
  const byId = new Map(nodeIndex.map((n) => [n.id, n]));
  const keep = new Set<string>(candidates.map((c) => c.nodeId));
  for (const c of candidates) {
    let p = byId.get(c.nodeId)?.parentId ?? null;
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

/** 선택 하위 전체 노드 수(진행률 분모). 처리 없이 셈만. */
function countNodes(sel: readonly SceneNode[]): number {
  let n = 0;
  const stack: SceneNode[] = sel.slice();
  while (stack.length) {
    const x = stack.pop() as SceneNode;
    n++;
    if ('children' in x) for (const c of (x as SceneNode & ChildrenMixin).children) stack.push(c as SceneNode);
  }
  return n;
}

/** 사유 1건 집계(스킵 카운트는 증가시키지 않는 '건너뜀' 사유에도 사용). */
function note(res: BindResult, key: string): void {
  res.reasons[key] = (res.reasons[key] ?? 0) + 1;
}
/** 매칭 실패 등 실제 스킵 — skipped++ 와 사유 집계를 함께. */
function skip(res: BindResult, key: string): void {
  res.skipped++;
  note(res, key);
}

/** 1회 실행 사용량 한도(미지정 시 무제한). */
export interface BindLimits {
  maxNodes?: number;
  maxBindings?: number;
}

interface Budget {
  nodes: number;
  maxBindings: number;
  limited: boolean;
}

export async function bindSelection(
  selection: readonly SceneNode[],
  tolerance: number,
  limits: BindLimits = {},
  apply = true, // UX1: false면 dry-run(미리보기) — 변경 없이 동일 집계만.
  hooks: BindHooks = {}, // UX6: 진행률·취소.
): Promise<BindResult> {
  const entries = await buildIndex();
  const res: BindResult = { bound: 0, skipped: 0, flags: [], reasons: {} };
  const flagSet = new Set<string>();
  const budget: Budget = {
    nodes: limits.maxNodes ?? Infinity,
    maxBindings: limits.maxBindings ?? Infinity,
    limited: false,
  };
  const prog: Progress = { done: 0, total: hooks.onProgress ? countNodes(selection) : 0, every: 50 };
  const preview: Preview | null = apply ? null : { candidates: [], nodeIndex: [] };
  for (const node of selection) {
    await walk(node, entries, tolerance, res, flagSet, budget, apply, hooks, prog, preview, 0, null);
    if (res.cancelled) break;
  }
  if (budget.limited) res.limited = true;
  res.flags = [...flagSet];
  if (preview) {
    res.candidates = preview.candidates;
    res.nodes = pruneToAffected(preview.nodeIndex, preview.candidates);
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
    const e: VarEntry = { variable: v, tier, type: v.resolvedType };
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

function matchColor(entries: VarEntry[], hex: string): VarEntry | null {
  for (const e of entries) if (e.colorHex === hex) return e;
  return null;
}
function matchFloat(entries: VarEntry[], value: number, tol: number): VarEntry | null {
  let best: VarEntry | null = null;
  let bestDist = Infinity;
  for (const e of entries) {
    if (e.num == null) continue;
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

/* ---------- 노드 순회 바인딩 ---------- */
async function walk(
  node: SceneNode,
  entries: VarEntry[],
  tol: number,
  res: BindResult,
  flags: Set<string>,
  budget: Budget,
  apply: boolean,
  hooks: BindHooks,
  prog: Progress,
  preview: Preview | null,
  depth: number,
  parentId: string | null,
): Promise<void> {
  if (res.cancelled) return;
  // 사용량 한도(노드 수 / 누적 바인딩 수) 초과 시 비파괴 중단 — 처리한 만큼만 적용.
  if (budget.nodes <= 0 || res.bound >= budget.maxBindings) {
    budget.limited = true;
    return;
  }
  budget.nodes--;
  // 미리보기 트리(#13)용: 방문한 모든 노드를 기록(나중에 영향+조상으로 가지치기).
  preview?.nodeIndex.push({ id: node.id, name: node.name, type: node.type, depth, parentId });
  bindPaints(node, entries, res, apply, preview);
  bindFrame(node, entries, tol, res, flags, apply, preview);
  bindRadius(node, entries, tol, res, apply, preview);
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
  if ('children' in node)
    for (const c of node.children) {
      await walk(c, entries, tol, res, flags, budget, apply, hooks, prog, preview, depth + 1, node.id);
      if (res.cancelled) return;
    }
}

function bindPaints(node: SceneNode, entries: VarEntry[], res: BindResult, apply: boolean, preview: Preview | null): void {
  for (const key of ['fills', 'strokes'] as const) {
    if (!(key in node)) continue;
    const paints = (node as unknown as Record<string, Paint[] | typeof figma.mixed>)[key];
    if (paints === figma.mixed || !Array.isArray(paints)) continue;
    let changed = false;
    const next = paints.map((p, i) => {
      if (p.type !== 'SOLID') return p;
      const hex = rgbToHex(p.color);
      const e = matchColor(entries, hex);
      if (!e) {
        skip(res, 'no-match');
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

  // 크기: Fixed일 때만
  if (node.layoutSizingHorizontal === 'FIXED') tryBind(node, 'width', node.width, entries, tol, res, apply, preview);
  else if (node.layoutSizingHorizontal === 'HUG' || node.layoutSizingHorizontal === 'FILL') {
    flags.add('일부 크기는 HUG/FILL이라 width/height 바인딩을 건너뜀(Fixed 필요).');
    note(res, 'hug-fill');
  }
  if (node.layoutSizingVertical === 'FIXED') tryBind(node, 'height', node.height, entries, tol, res, apply, preview);

  // 여백/간격: 오토레이아웃에만
  if (node.layoutMode === 'NONE') {
    flags.add('오토레이아웃이 아닌 프레임은 padding/gap 바인딩 불가.');
    note(res, 'no-autolayout');
    return;
  }
  tryBind(node, 'itemSpacing', node.itemSpacing, entries, tol, res, apply, preview);
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

function bindEffects(node: SceneNode, entries: VarEntry[], res: BindResult, apply: boolean, preview: Preview | null): void {
  if (!('effects' in node)) return;
  let changed = false;
  const next = (node as { effects: readonly Effect[] }).effects.map((e, i) => {
    if (e.type !== 'DROP_SHADOW' && e.type !== 'INNER_SHADOW') return e;
    const hex = rgbToHex(e.color);
    const ent = matchColor(entries, hex);
    if (!ent) {
      skip(res, 'no-match');
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
    note(res, 'font');
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
  const e = matchFloat(entries, value, tol);
  const len = node.characters.length;
  if (len === 0) {
    skip(res, 'empty-text');
    return;
  }
  if (!e) {
    skip(res, 'no-match');
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
    skip(res, 'error');
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
): void {
  const e = matchFloat(entries, value, tol);
  if (!e) {
    skip(res, 'no-match');
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
    skip(res, 'error');
  }
}
