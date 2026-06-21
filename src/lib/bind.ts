/* ============================================================
   bind.ts — 토큰(변수)을 레이어 속성에 바인딩 (top-down)
   - 매칭은 resolved 값 기준, Component > Semantic 우선. Global 직접 바인딩 제외.
   - 프레임 크기(Fixed)·여백(오토레이아웃)·반경·효과·텍스트 지원.
   ============================================================ */
import { rgbToHex } from './tokens';
import { GLOBAL, SEMANTIC, COMPONENT } from './variables';

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
): Promise<BindResult> {
  const entries = await buildIndex();
  const res: BindResult = { bound: 0, skipped: 0, flags: [], reasons: {} };
  const flagSet = new Set<string>();
  const budget: Budget = {
    nodes: limits.maxNodes ?? Infinity,
    maxBindings: limits.maxBindings ?? Infinity,
    limited: false,
  };
  for (const node of selection) await walk(node, entries, tolerance, res, flagSet, budget, apply);
  if (budget.limited) res.limited = true;
  res.flags = [...flagSet];
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

function matchColor(entries: VarEntry[], hex: string): Variable | null {
  for (const e of entries) if (e.colorHex === hex) return e.variable;
  return null;
}
function matchFloat(entries: VarEntry[], value: number, tol: number): Variable | null {
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
  return best ? best.variable : null;
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
): Promise<void> {
  // 사용량 한도(노드 수 / 누적 바인딩 수) 초과 시 비파괴 중단 — 처리한 만큼만 적용.
  if (budget.nodes <= 0 || res.bound >= budget.maxBindings) {
    budget.limited = true;
    return;
  }
  budget.nodes--;
  bindPaints(node, entries, res, apply);
  bindFrame(node, entries, tol, res, flags, apply);
  bindRadius(node, entries, tol, res, apply);
  bindEffects(node, entries, res, apply);
  await bindText(node, entries, tol, res, apply);
  if ('children' in node) for (const c of node.children) await walk(c, entries, tol, res, flags, budget, apply);
}

function bindPaints(node: SceneNode, entries: VarEntry[], res: BindResult, apply: boolean): void {
  for (const key of ['fills', 'strokes'] as const) {
    if (!(key in node)) continue;
    const paints = (node as unknown as Record<string, Paint[] | typeof figma.mixed>)[key];
    if (paints === figma.mixed || !Array.isArray(paints)) continue;
    let changed = false;
    const next = paints.map((p) => {
      if (p.type !== 'SOLID') return p;
      const v = matchColor(entries, rgbToHex(p.color));
      if (!v) {
        skip(res, 'no-match');
        return p;
      }
      changed = true;
      res.bound++;
      return apply ? figma.variables.setBoundVariableForPaint(p, 'color', v) : p;
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
): void {
  if (node.type !== 'FRAME' && node.type !== 'COMPONENT' && node.type !== 'INSTANCE') return;

  // 크기: Fixed일 때만
  if (node.layoutSizingHorizontal === 'FIXED') tryBind(node, 'width', node.width, entries, tol, res, apply);
  else if (node.layoutSizingHorizontal === 'HUG' || node.layoutSizingHorizontal === 'FILL') {
    flags.add('일부 크기는 HUG/FILL이라 width/height 바인딩을 건너뜀(Fixed 필요).');
    note(res, 'hug-fill');
  }
  if (node.layoutSizingVertical === 'FIXED') tryBind(node, 'height', node.height, entries, tol, res, apply);

  // 여백/간격: 오토레이아웃에만
  if (node.layoutMode === 'NONE') {
    flags.add('오토레이아웃이 아닌 프레임은 padding/gap 바인딩 불가.');
    note(res, 'no-autolayout');
    return;
  }
  tryBind(node, 'itemSpacing', node.itemSpacing, entries, tol, res, apply);
  tryBind(node, 'paddingLeft', node.paddingLeft, entries, tol, res, apply);
  tryBind(node, 'paddingRight', node.paddingRight, entries, tol, res, apply);
  tryBind(node, 'paddingTop', node.paddingTop, entries, tol, res, apply);
  tryBind(node, 'paddingBottom', node.paddingBottom, entries, tol, res, apply);
}

function bindRadius(node: SceneNode, entries: VarEntry[], tol: number, res: BindResult, apply: boolean): void {
  if (!('cornerRadius' in node)) return;
  const r = (node as { cornerRadius: number | typeof figma.mixed }).cornerRadius;
  const corners = ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius'] as const;
  if (r !== figma.mixed && typeof r === 'number' && r > 0) {
    for (const c of corners) tryBind(node, c, r, entries, tol, res, apply);
  } else if (r === figma.mixed) {
    for (const c of corners) {
      const cv = (node as unknown as Record<string, number>)[c];
      if (typeof cv === 'number' && cv > 0) tryBind(node, c, cv, entries, tol, res, apply);
    }
  }
}

function bindEffects(node: SceneNode, entries: VarEntry[], res: BindResult, apply: boolean): void {
  if (!('effects' in node)) return;
  let changed = false;
  const next = (node as { effects: readonly Effect[] }).effects.map((e) => {
    if (e.type !== 'DROP_SHADOW' && e.type !== 'INNER_SHADOW') return e;
    const v = matchColor(entries, rgbToHex(e.color));
    if (!v) {
      skip(res, 'no-match');
      return e;
    }
    changed = true;
    res.bound++;
    return apply ? figma.variables.setBoundVariableForEffect(e, 'color', v) : e;
  });
  if (changed && apply) (node as unknown as { effects: readonly Effect[] }).effects = next;
}

async function bindText(node: SceneNode, entries: VarEntry[], tol: number, res: BindResult, apply: boolean): Promise<void> {
  if (node.type !== 'TEXT') return;
  if (node.fontName === figma.mixed) return;
  try {
    await figma.loadFontAsync(node.fontName); // 텍스트 속성 변경 전 폰트 로드 필수(미리보기에서도 가용성 확인)
  } catch {
    note(res, 'font');
    return;
  }
  if (node.fontSize !== figma.mixed) tryBindText(node, 'fontSize', node.fontSize, entries, tol, res, apply);
  // lineHeight/letterSpacing은 px일 때만 직접 바인딩(비-px는 STRING 토큰만 보존)
  if (node.lineHeight !== figma.mixed && node.lineHeight.unit === 'PIXELS') {
    tryBindText(node, 'lineHeight', node.lineHeight.value, entries, tol, res, apply);
  }
  if (node.letterSpacing !== figma.mixed && node.letterSpacing.unit === 'PIXELS') {
    tryBindText(node, 'letterSpacing', node.letterSpacing.value, entries, tol, res, apply);
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
): void {
  const v = matchFloat(entries, value, tol);
  const len = node.characters.length;
  if (len === 0) {
    skip(res, 'empty-text');
    return;
  }
  if (!v) {
    skip(res, 'no-match');
    return;
  }
  if (!apply) {
    res.bound++;
    return;
  }
  try {
    node.setRangeBoundVariable(0, len, field, v);
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
): void {
  const v = matchFloat(entries, value, tol);
  if (!v) {
    skip(res, 'no-match');
    return;
  }
  if (!apply) {
    res.bound++;
    return;
  }
  try {
    (node as unknown as { setBoundVariable: (f: VariableBindableNodeField, x: Variable) => void }).setBoundVariable(field, v);
    res.bound++;
  } catch {
    skip(res, 'error');
  }
}
