/* ============================================================
   applyVar.ts — 클릭 연결(IA v4 §4.7): 변수 하나를 선택한 레이어에 붙인다.
   속성 고르기: 종류의 속성 목록(앞이 기본) 가운데 ① 용도가 허용하고 ② 그 레이어에 있는 첫 속성.
   "있다" — 기본 속성은 필드가 있으면(없는 단색 채움 · 선은 만든다), 다음 속성은 보이는 것이 이미 있을 때만.
   target("다른 곳에 연결")이 있으면 그 속성만 — 없으면 건너뛴다(다른 속성으로 가지 않는다).
   applied · skipped = 레이어 수. 사유 코드는 SKIP_REASONS.
   ============================================================ */
import { varKind, targetAllowed, type ApplyTarget, type VarKind, APPLY_TARGETS } from './varKind';
import { fillScopesFor } from './scopes';

/**
 * 건너뜀 사유 코드.
 * - no-scope: 변수 용도가 허용하는 속성이 없음
 * - no-prop: 그 속성(필드)이 없는 레이어(그룹의 채움 · 글자의 크기 · 원의 반경 · 글자가 아닌 레이어의 글자 속성 등)
 * - not-autolayout: 간격 · 여백인데 오토 레이아웃(가로 · 세로)이 아님
 * - no-stroke: 선 두께인데 보이는 선이 없음
 * - no-shadow: 그림자 색인데 그림자가 없음
 * - font: 글꼴을 불러오지 못함 · 바꿀 글꼴에 같은 스타일이 없음
 * - empty-text: 빈 글자
 * - other-kind: 종류를 정하지 못한 변수(붙일 속성을 정할 수 없음)
 * - error: 피그마가 거절함
 */
export const SKIP_REASONS = ['no-scope', 'no-prop', 'not-autolayout', 'no-stroke', 'no-shadow', 'font', 'empty-text', 'other-kind', 'error'] as const;
export type SkipReason = (typeof SKIP_REASONS)[number];

export interface ApplyVarResult {
  applied: number;
  skipped: number;
  skipReasons: Record<string, number>;
}

type AnyNode = SceneNode & Record<string, unknown>;

/** 속성 하나. scopeOk = 용도가 허용하나, check = 붙일 수 있나(null = 됨, 아니면 사유), run = 붙인다. */
interface Prop {
  scopeOk(scopes: readonly string[], node: SceneNode): boolean;
  check(node: SceneNode, create: boolean): SkipReason | null;
  run(node: SceneNode, v: Variable, create: boolean): Promise<SkipReason | null>;
}

const allows = (scopes: readonly string[], need: readonly string[]): boolean => scopes.includes('ALL_SCOPES') || need.some((s) => scopes.includes(s));

/* ---------- 페인트 ---------- */
type PaintLike = { type?: string; visible?: boolean };
const visibleSolidIdx = (list: unknown): number => {
  if (!Array.isArray(list)) return -1;
  for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i] as PaintLike;
    if (p && p.type === 'SOLID' && p.visible !== false) return i;
  }
  return -1;
};
const hasVisible = (list: unknown): boolean => Array.isArray(list) && list.some((p: PaintLike) => p && p.visible !== false);
const newSolid = (): SolidPaint => ({ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity: 1, visible: true, blendMode: 'NORMAL' } as SolidPaint);

async function detachStyle(node: SceneNode, field: 'fillStyleId' | 'strokeStyleId' | 'effectStyleId'): Promise<void> {
  const n = node as AnyNode;
  if (!(field in n) || !n[field] || typeof n[field] !== 'string') return;
  const setter = `set${field[0].toUpperCase()}${field.slice(1)}Async` as string;
  try {
    const fn = n[setter];
    if (typeof fn === 'function') await (fn as (id: string) => Promise<void>).call(n, '');
    else n[field] = '';
  } catch {
    /* 못 끊어도 페인트를 쓰면 피그마가 끊는다 */
  }
}

/** 채움(글자면 글자 색). 맨 위 보이는 단색에, 없으면 맨 위에 새 단색을 만들어. 글자 색이 구간마다 다르면 전체를 단색 하나로. */
function fillProp(textOnly: boolean): Prop {
  return {
    scopeOk: (scopes, node) => allows(scopes, fillScopesFor(node.type)),
    check(node, create) {
      if (textOnly ? node.type !== 'TEXT' : node.type === 'TEXT') return 'no-prop';
      if (node.type === 'GROUP' || node.type === 'SLICE' || !('fills' in node)) return 'no-prop';
      if (create) return null;
      const fills = (node as AnyNode).fills;
      return visibleSolidIdx(fills) >= 0 ? null : 'no-prop';
    },
    async run(node, v) {
      const n = node as AnyNode;
      await detachStyle(node, 'fillStyleId');
      const fills = n.fills;
      if (!Array.isArray(fills)) {
        // 글자 구간마다 채움이 다름(figma.mixed) — 글자 전체를 단색 하나로.
        n.fills = [figma.variables.setBoundVariableForPaint(newSolid(), 'color', v)];
        return null;
      }
      const arr = (fills as Paint[]).slice();
      const i = visibleSolidIdx(arr);
      if (i >= 0) arr[i] = figma.variables.setBoundVariableForPaint(arr[i] as SolidPaint, 'color', v);
      else arr.push(figma.variables.setBoundVariableForPaint(newSolid(), 'color', v));
      n.fills = arr;
      return null;
    },
  };
}

/** 선 색. 보이는 단색 선에, 보이는 선이 없으면 1px 안쪽 단색 선을 만든다. */
const strokeColorProp: Prop = {
  scopeOk: (scopes) => allows(scopes, ['STROKE_COLOR']),
  check(node, create) {
    if (node.type === 'GROUP' || node.type === 'SLICE' || !('strokes' in node)) return 'no-prop';
    if (create) return null;
    return visibleSolidIdx((node as AnyNode).strokes) >= 0 ? null : 'no-stroke';
  },
  async run(node, v) {
    const n = node as AnyNode;
    await detachStyle(node, 'strokeStyleId');
    const strokes = Array.isArray(n.strokes) ? (n.strokes as Paint[]).slice() : [];
    const hadVisible = hasVisible(strokes);
    const i = visibleSolidIdx(strokes);
    if (i >= 0) strokes[i] = figma.variables.setBoundVariableForPaint(strokes[i] as SolidPaint, 'color', v);
    else strokes.push(figma.variables.setBoundVariableForPaint(newSolid(), 'color', v));
    n.strokes = strokes;
    if (!hadVisible) {
      try {
        n.strokeWeight = 1;
        n.strokeAlign = 'INSIDE';
      } catch {
        /* 글자 등 안쪽 선을 못 받는 레이어 — 선은 붙었다 */
      }
    }
    return null;
  },
};

/** 그림자 색 — 보이는 그림자(맨 위)에만. 만들지 않는다. */
const shadowProp: Prop = {
  scopeOk: (scopes) => allows(scopes, ['EFFECT_COLOR']),
  check(node) {
    if (!('effects' in node)) return 'no-shadow';
    return shadowIdx((node as AnyNode).effects) >= 0 ? null : 'no-shadow';
  },
  async run(node, v) {
    const n = node as AnyNode;
    await detachStyle(node, 'effectStyleId');
    const effs = (n.effects as Effect[]).slice();
    const i = shadowIdx(effs);
    effs[i] = figma.variables.setBoundVariableForEffect(effs[i], 'color', v);
    n.effects = effs;
    return null;
  },
};
function shadowIdx(list: unknown): number {
  if (!Array.isArray(list)) return -1;
  for (let i = list.length - 1; i >= 0; i--) {
    const e = list[i] as { type?: string; visible?: boolean };
    if (e && (e.type === 'DROP_SHADOW' || e.type === 'INNER_SHADOW') && e.visible !== false) return i;
  }
  return -1;
}

/* ---------- 숫자 필드 ---------- */
function bindFields(node: SceneNode, fields: readonly string[], v: Variable): void {
  const n = node as unknown as { setBoundVariable: (f: string, x: Variable) => void };
  for (const f of fields) n.setBoundVariable(f, v);
}

const isAutoLayout = (node: SceneNode): boolean => {
  const m = (node as AnyNode).layoutMode;
  return m === 'HORIZONTAL' || m === 'VERTICAL';
};

/** 간격 · 여백 — 오토 레이아웃(가로 · 세로)만. fields가 함수면 레이어마다 정한다(row-gap의 줄바꿈). */
function gapProp(fields: (node: SceneNode) => readonly string[]): Prop {
  return {
    scopeOk: (scopes) => allows(scopes, ['GAP']),
    check: (node) => (isAutoLayout(node) ? null : 'not-autolayout'),
    async run(node, v) {
      bindFields(node, fields(node), v);
      return null;
    },
  };
}

const CORNER_FIELD: Record<string, string> = { 'top-left': 'topLeftRadius', 'top-right': 'topRightRadius', 'bottom-left': 'bottomLeftRadius', 'bottom-right': 'bottomRightRadius' };
const ALL_CORNERS = ['topLeftRadius', 'topRightRadius', 'bottomRightRadius', 'bottomLeftRadius'];
function radiusProp(fields: readonly string[]): Prop {
  return {
    scopeOk: (scopes) => allows(scopes, ['CORNER_RADIUS']),
    check: (node) => (node.type !== 'TEXT' && 'topLeftRadius' in node ? null : 'no-prop'),
    async run(node, v) {
      bindFields(node, fields, v);
      return null;
    },
  };
}

function sizeProp(fields: readonly ('width' | 'height')[]): Prop {
  return {
    scopeOk: (scopes) => allows(scopes, ['WIDTH_HEIGHT']),
    check: (node) => (node.type === 'TEXT' || node.type === 'GROUP' || !('width' in node) ? 'no-prop' : null),
    async run(node, v) {
      const n = node as AnyNode;
      // HUG · FILL 축은 FIXED가 된다(받아들임).
      for (const f of fields) {
        const key = f === 'width' ? 'layoutSizingHorizontal' : 'layoutSizingVertical';
        if (key in n && (n[key] === 'HUG' || n[key] === 'FILL')) {
          try {
            n[key] = 'FIXED';
          } catch {
            /* 못 바꾸면 피그마가 연결하며 정한다 */
          }
        }
      }
      bindFields(node, fields, v);
      return null;
    },
  };
}

const SIDE_WEIGHT: Record<string, string> = { top: 'strokeTopWeight', right: 'strokeRightWeight', bottom: 'strokeBottomWeight', left: 'strokeLeftWeight' };
function strokeWeightProp(field: string): Prop {
  return {
    scopeOk: (scopes) => allows(scopes, ['STROKE_FLOAT']),
    check(node) {
      if (!(field in node)) return 'no-prop';
      return hasVisible((node as AnyNode).strokes) ? null : 'no-stroke';
    },
    async run(node, v) {
      bindFields(node, [field], v);
      return null;
    },
  };
}

const opacityProp: Prop = {
  scopeOk: (scopes) => allows(scopes, ['OPACITY']),
  check: (node) => ('opacity' in node ? null : 'no-prop'),
  async run(node, v) {
    bindFields(node, ['opacity'], v);
    return null;
  },
};

/* ---------- 글자 ---------- */
const TEXT_FIELD_SCOPE: Record<string, string> = { fontSize: 'FONT_SIZE', lineHeight: 'LINE_HEIGHT', letterSpacing: 'LETTER_SPACING', fontFamily: 'FONT_FAMILY' };

/** 변수 값(이 레이어에서 해석한 값, 별칭은 따라간다). 못 읽으면 undefined. */
async function valueFor(v: Variable, node: SceneNode): Promise<VariableValue | undefined> {
  try {
    const fn = (v as unknown as { resolveForConsumer?: (n: SceneNode) => { value: VariableValue } }).resolveForConsumer;
    if (typeof fn === 'function') return fn.call(v, node).value;
  } catch {
    /* 아래로 */
  }
  let cur: Variable | null = v;
  for (let i = 0; i < 12 && cur; i++) {
    const raw: VariableValue | undefined = Object.values(cur.valuesByMode ?? {})[0];
    if (raw && typeof raw === 'object' && (raw as VariableAlias).type === 'VARIABLE_ALIAS') {
      cur = await figma.variables.getVariableByIdAsync((raw as VariableAlias).id).catch(() => null);
    } else return raw;
  }
  return undefined;
}

function textProp(field: string): Prop {
  return {
    scopeOk: (scopes) => allows(scopes, [TEXT_FIELD_SCOPE[field]]),
    check(node) {
      if (node.type !== 'TEXT') return 'no-prop';
      return (node as TextNode).characters.length ? null : 'empty-text';
    },
    async run(node, v) {
      const tn = node as TextNode;
      const len = tn.characters.length;
      let fonts: FontName[];
      try {
        fonts = typeof tn.getRangeAllFontNames === 'function' ? tn.getRangeAllFontNames(0, len) : [tn.fontName as FontName];
        for (const f of fonts) await figma.loadFontAsync(f);
      } catch {
        return 'font';
      }
      if (field === 'fontFamily') {
        const family = await valueFor(v, node);
        if (typeof family !== 'string') return 'font';
        try {
          for (const f of fonts) await figma.loadFontAsync({ family, style: f.style });
        } catch {
          return 'font'; // 같은 스타일이 그 글꼴에 없음
        }
      }
      tn.setRangeBoundVariable(0, len, field as VariableBindableTextField, v);
      return null;
    },
  };
}

/* ---------- 속성 목록 ---------- */
const DIRS = ['top', 'right', 'bottom', 'left'];
const PADDING: Record<string, readonly string[]> = {
  padding: ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'],
  'padding-x': ['paddingLeft', 'paddingRight'],
  'padding-y': ['paddingTop', 'paddingBottom'],
  'padding-top': ['paddingTop'],
  'padding-right': ['paddingRight'],
  'padding-bottom': ['paddingBottom'],
  'padding-left': ['paddingLeft'],
};
const wraps = (node: SceneNode): boolean => (node as AnyNode).layoutWrap === 'WRAP';

function lastSeg(name: string): string {
  const segs = name.split('/').map((s) => s.trim().toLowerCase());
  return segs[segs.length - 1] ?? '';
}

/** 글자 속성 — 이름 끝 마디 · 첫 마디, 없으면 용도(종류 판정 4). */
function textFieldOf(name: string, scopes: readonly string[]): string | null {
  const segs = name.split('/').map((s) => s.trim().toLowerCase());
  const byName: Record<string, string> = { 'font-size': 'fontSize', 'line-height': 'lineHeight', 'letter-spacing': 'letterSpacing', 'font-family': 'fontFamily' };
  for (const s of [segs[segs.length - 1], segs[0]]) if (s && byName[s]) return byName[s];
  const byScope: Record<string, string> = { FONT_SIZE: 'fontSize', LINE_HEIGHT: 'lineHeight', LETTER_SPACING: 'letterSpacing', FONT_FAMILY: 'fontFamily' };
  for (const s of scopes) if (byScope[s]) return byScope[s];
  return null;
}

/** 종류의 속성 목록(앞이 기본). 레이어 종류에 따라 다를 수 있어 노드를 받는다. */
function propsFor(kind: VarKind, v: Variable, node: SceneNode): Prop[] {
  const last = lastSeg(v.name);
  switch (kind) {
    case 'color':
      return [fillProp(node.type === 'TEXT'), strokeColorProp, shadowProp];
    case 'gap': {
      if (PADDING[last]) {
        const f = PADDING[last];
        return [gapProp(() => f)];
      }
      if (last === 'row-gap') return [gapProp((n) => [wraps(n) ? 'counterAxisSpacing' : 'itemSpacing'])];
      return [gapProp(() => ['itemSpacing'])];
    }
    case 'radius': {
      const corner = Object.keys(CORNER_FIELD).find((c) => last === `radius-${c}`);
      return [radiusProp(corner ? [CORNER_FIELD[corner]] : ALL_CORNERS)];
    }
    case 'size':
      return [sizeProp(last === 'width' ? ['width'] : last === 'height' ? ['height'] : ['width', 'height'])];
    case 'stroke': {
      const dir = DIRS.find((d) => last.endsWith(`-${d}`));
      return [strokeWeightProp(dir ? SIDE_WEIGHT[dir] : 'strokeWeight')];
    }
    case 'opacity':
      return [opacityProp];
    case 'text': {
      const f = textFieldOf(v.name, v.scopes ?? []);
      return f ? [textProp(f)] : [];
    }
    default:
      return [];
  }
}

/** "다른 곳에 연결"의 속성 하나(만들 수 있는 것은 만든다). 그 종류에 없는 target이면 null. */
function propForTarget(kind: VarKind, target: ApplyTarget): Prop | null {
  if (!(APPLY_TARGETS[kind] ?? []).includes(target)) return null;
  switch (target) {
    case 'fill': return fillProp(false);
    case 'text': return fillProp(true);
    case 'stroke': return strokeColorProp;
    case 'shadow': return shadowProp;
    case 'gap': return gapProp(() => ['itemSpacing']);
    case 'radius': return radiusProp(ALL_CORNERS);
    case 'radius-tl': return radiusProp(['topLeftRadius']);
    case 'radius-tr': return radiusProp(['topRightRadius']);
    case 'radius-bl': return radiusProp(['bottomLeftRadius']);
    case 'radius-br': return radiusProp(['bottomRightRadius']);
    default: return PADDING[target] ? gapProp(() => PADDING[target]) : null;
  }
}

/**
 * 클릭 연결(§4.7). 선택한 레이어만(자식 아님) · 숨긴 · 잠긴 레이어도 한다.
 * 부르는 쪽이 성공이면 commitUndo를 한 번 부른다.
 */
export async function applyVariableToNodes(nodes: readonly SceneNode[], variable: Variable, target?: ApplyTarget): Promise<ApplyVarResult> {
  const res: ApplyVarResult = { applied: 0, skipped: 0, skipReasons: {} };
  const skip = (r: SkipReason): void => {
    res.skipped++;
    res.skipReasons[r] = (res.skipReasons[r] ?? 0) + 1;
  };
  const scopes = (variable.scopes ?? []) as readonly string[];
  const kind = varKind({ name: variable.name, type: variable.resolvedType, scopes });
  for (const node of nodes) {
    try {
      if (kind === 'other') {
        skip('other-kind');
        continue;
      }
      if (target) {
        const p = propForTarget(kind, target);
        if (!p) {
          skip('no-prop');
          continue;
        }
        if (!targetAllowed(scopes, target)) {
          skip('no-scope');
          continue;
        }
        // 속성이 없는 레이어가 먼저(글자 색을 프레임에), 그다음 레이어 종류의 채움 용도(§4.7).
        const why = p.check(node, true);
        if (why) {
          skip(why);
          continue;
        }
        if (!p.scopeOk(scopes, node)) {
          skip('no-scope');
          continue;
        }
        const r = await p.run(node, variable, true);
        if (r) skip(r);
        else res.applied++;
        continue;
      }
      const list = propsFor(kind, variable, node);
      let firstWhy: SkipReason | null = null;
      let chosen: { p: Prop; create: boolean } | null = null;
      for (let i = 0; i < list.length; i++) {
        const p = list[i];
        if (!p.scopeOk(scopes, node)) continue;
        const create = i === 0; // 새로 만드는 것은 기본 속성뿐
        const why = p.check(node, create);
        if (!why) {
          chosen = { p, create };
          break;
        }
        firstWhy ??= why;
      }
      if (!chosen) {
        skip(firstWhy ?? 'no-scope');
        continue;
      }
      const r = await chosen.p.run(node, variable, chosen.create);
      if (r) skip(r);
      else res.applied++;
    } catch {
      skip('error');
    }
  }
  return res;
}
