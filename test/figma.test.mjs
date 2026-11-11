/* figma 의존 모듈 테스트 — `npm test`가 build 후 dist/figma-lib.mjs를 불러온다.
   전역 `figma`를 목으로 주입해 extract·variables·bind·rename의 런타임 동작을 검증한다.
   순수 로직(tokens·naming)은 pure.test.mjs가 담당. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rgbToHex, hexToRgb, isKnownRole, nameTextStyles, clusterTextStyles } from '../dist/pure.mjs';
import {
  extractFromSelection,
  isIconOrAvatar,
  createTokens,
  createUsageRoles,
  assignNames,
  colorRoleBases,
  colorSlotKey,
  bgKindOf,
  backgroundOf,
  colorUse,
  paddingProp,
  radiusName,
  strokeName,
  isOldPluginName,
  previewCreateTokens,
  createSemanticAliases,
  prunePaletteColors,
  scanTextStyles,
  createSemanticTextStyles,
  renameTextRoleVars,
  planTsRename,
  applyTsRename,
  applyExistingTextStyles,
  planExistingTextStyles,
  applyTextStyleRows,
  applyRegisteredTextStyles,
  textStyleCandidateTest,
  bindSelection,
  bindSelectedItems,
  countUsage,
  deletedBindings,
  unbindDeleted,
  countDeleted,
  boundVariableIds,
  findUsers,
  renameSelection,
  writeRole,
  writeRoleFromName,
  generateDarkMode,
  ensureDarkMode,
  DARK_MODE_NAME,
  createIconRegistry,
  swapVectorSlots,
  transplantImageFills,
  applyVariableToNodes,
  isManualVar,
  createManualVariable,
  duplicateVariable,
  deleteVariable,
  VarNameError,
  VarGoneError,
} from '../dist/figma-lib.mjs';

/* ---------------- figma 전역 목 ---------------- */
function installFigma() {
  const collections = [];
  const variables = [];
  const textStyles = [];
  let seq = 0;
  const mixed = Symbol('figma.mixed');

  const createVariableCollection = (name) => {
    const col = {
      id: `col:${name}:${seq++}`,
      name,
      defaultModeId: `mode:${name}`,
      modes: [{ modeId: `mode:${name}`, name: 'Mode 1' }],
      _pd: {},
      getPluginData(k) {
        return this._pd[k] ?? '';
      },
      setPluginData(k, val) {
        this._pd[k] = val;
      },
      addMode(modeName) {
        const modeId = `mode:${name}:${modeName}:${seq++}`;
        this.modes.push({ modeId, name: modeName });
        return modeId;
      },
      // 실물 API와 같게 — 마지막 하나는 못 지운다(themeApply의 롤백이 이 실패를 삼킨다).
      removeMode(modeId) {
        if (this.modes.length <= 1) throw new Error('마지막 모드는 지울 수 없습니다');
        this.modes = this.modes.filter((m) => m.modeId !== modeId);
      },
      remove() {
        const i = collections.indexOf(this);
        if (i >= 0) collections.splice(i, 1);
      },
    };
    collections.push(col);
    return col;
  };
  const createVariable = (name, collection, type) => {
    const v = {
      id: `var:${seq++}`,
      name,
      variableCollectionId: collection.id,
      resolvedType: type,
      scopes: [],
      hiddenFromPublishing: false,
      description: '',
      codeSyntax: {},
      valuesByMode: {},
      _pd: {},
      setVariableCodeSyntax(platform, value) {
        this.codeSyntax = { ...this.codeSyntax, [platform]: value };
      },
      getPluginData(k) {
        return this._pd[k] ?? '';
      },
      setPluginData(k, val) {
        this._pd[k] = val;
      },
      setValueForMode(modeId, value) {
        this.valuesByMode[modeId] = value;
      },
      remove() {
        const i = variables.indexOf(this);
        if (i >= 0) variables.splice(i, 1);
      },
    };
    variables.push(v);
    return v;
  };

  // 색 변수의 첫 모드 값 alpha(별칭은 따라감) — 목 setBoundVariableFor*가 쓴다.
  const colorAlphaOf = (v) => {
    let cur = v;
    for (let i = 0; i < 12 && cur; i++) {
      const val = Object.values(cur.valuesByMode)[0];
      if (val && val.type === 'VARIABLE_ALIAS') cur = variables.find((x) => x.id === val.id);
      else return val && typeof val === 'object' && typeof val.a === 'number' ? val.a : undefined;
    }
    return undefined;
  };
  const figma = {
    mixed,
    variables: {
      getLocalVariableCollectionsAsync: async () => collections.slice(),
      getLocalVariablesAsync: async (type) =>
        type ? variables.filter((v) => v.resolvedType === type) : variables.slice(),
      createVariableCollection,
      createVariable,
      createVariableAlias: (v) => ({ type: 'VARIABLE_ALIAS', id: v.id }),
      getVariableByIdAsync: async (id) => variables.find((v) => v.id === id) ?? null,
      // v = null이면 연결을 뗀다(IA v4 연결 풀기).
      // 실제 피그마처럼 색 변수를 붙이면 칠 불투명도 · 그림자 alpha가 변수 값의 alpha로 바뀐다(ia-v3 §2.11 "색" 실험).
      setBoundVariableForPaint: (paint, field, v) => {
        const bv = { ...(paint.boundVariables ?? {}) };
        if (v) bv[field] = { type: 'VARIABLE_ALIAS', id: v.id }; else delete bv[field];
        const a = v && field === 'color' ? colorAlphaOf(v) : undefined;
        return { ...paint, ...(a != null && a !== (paint.opacity ?? 1) ? { opacity: a } : {}), boundVariables: bv };
      },
      setBoundVariableForEffect: (effect, field, v) => {
        const bv = { ...(effect.boundVariables ?? {}) };
        if (v) bv[field] = { type: 'VARIABLE_ALIAS', id: v.id }; else delete bv[field];
        const a = v && field === 'color' ? colorAlphaOf(v) : undefined;
        return { ...effect, ...(a != null && effect.color && a !== (effect.color.a ?? 1) ? { color: { ...effect.color, a } } : {}), boundVariables: bv };
      },
    },
    loadFontAsync: async () => {},
    createTextStyle: () => {
      const st = {
        id: `style:${seq++}`,
        type: 'TEXT',
        name: '',
        fontName: { family: '', style: '' },
        fontSize: 0,
        lineHeight: { unit: 'AUTO' },
        letterSpacing: { value: 0, unit: 'PIXELS' },
        boundVariables: {},
        setBoundVariable(field, v) {
          if (v == null) {
            delete this.boundVariables[field];
            return;
          }
          this.boundVariables[field] = { type: 'VARIABLE_ALIAS', id: v.id };
        },
      };
      textStyles.push(st);
      return st;
    },
    getLocalTextStylesAsync: async () => textStyles.slice(),
    getStyleByIdAsync: async (id) => textStyles.find((s) => s.id === id) ?? null,
    _state: { collections, variables, textStyles },
  };
  globalThis.figma = figma;
  return figma;
}

const findVar = (figma, colName, varName) => {
  const col = figma._state.collections.find((c) => c.name === colName);
  return figma._state.variables.find((v) => v.name === varName && v.variableCollectionId === col?.id);
};

/**
 * §2.12 — 레이어에는 Semantic 역할만 붙는다. 붙은 변수가 Semantic이면 그 별칭이 가리키는 변수 id,
 * 아니면 undefined(Global에 바로 붙었으면 실패하게).
 */
const roleTarget = (figma, id) => {
  const v = figma._state.variables.find((x) => x.id === id);
  if (!v) return undefined;
  const col = figma._state.collections.find((c) => c.id === v.variableCollectionId);
  if (col?.name !== 'Semantic') return undefined;
  const val = Object.values(v.valuesByMode)[0];
  return val && val.type === 'VARIABLE_ALIAS' ? val.id : undefined;
};
const varName = (figma, id) => figma._state.variables.find((x) => x.id === id)?.name;

/* 크기 테스트용 — 크기 변수는 아이콘 · 아바타 레이어만(§2.11 "크기는 아이콘 · 아바타만"). */
const vec = (id = 'vec') => ({ type: 'VECTOR', id, name: 'Vector', fills: [] });
const IMG = { type: 'IMAGE', imageHash: 'h', scaleMode: 'FILL', visible: true };

/* ================= extract.ts ================= */
test('extractFromSelection — 색/타이포/간격/크기/반경 수집 + dedup', () => {
  installFigma();
  const text = {
    type: 'TEXT',
    id: 't1',
    name: 'Label',
    fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, visible: true }],
    fontSize: 24,
    fontName: { family: 'Inter', style: 'Regular' },
    lineHeight: { unit: 'PERCENT', value: 150 },
    letterSpacing: { unit: 'PIXELS', value: 2 },
    characters: 'Hi',
  };
  const rect = {
    type: 'RECTANGLE',
    id: 'r1',
    name: 'Rect',
    fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, visible: true }], // 같은 검정 → dedup
    strokes: [{ type: 'SOLID', color: { r: 0, g: 0, b: 1 }, visible: true }],
    strokeWeight: 2,
    cornerRadius: 4,
  };
  const frame = {
    type: 'FRAME',
    id: 'f1',
    name: 'Frame',
    fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 }, visible: true }],
    opacity: 0.5,
    layoutMode: 'VERTICAL',
    itemSpacing: 16,
    paddingLeft: 8,
    paddingRight: 8,
    paddingTop: 0,
    paddingBottom: 0,
    layoutSizingHorizontal: 'FIXED',
    layoutSizingVertical: 'FIXED',
    width: 200,
    height: 100,
    cornerRadius: 8,
    children: [text, rect],
  };
  // 크기는 아이콘 · 아바타만 — 오토레이아웃 안의 24×24 아이콘
  const icon = {
    type: 'FRAME',
    id: 'ic1',
    name: 'Icon',
    layoutMode: 'NONE',
    layoutSizingHorizontal: 'FIXED',
    layoutSizingVertical: 'FIXED',
    width: 24,
    height: 24,
    children: [vec('ic1-v')],
    parent: frame,
  };
  frame.children.push(icon);

  const { tokens, warnings } = extractFromSelection([frame]);
  const byName = new Map(tokens.map((t) => [t.name, t]));

  assert.equal(warnings.length, 0);
  // 색상
  assert.equal(byName.get('color/ff0000')?.category, 'color');
  assert.equal(byName.get('color/000000')?.category, 'color');
  assert.equal(byName.get('color/0000ff')?.category, 'color');
  // 검정은 한 번만(dedup)
  assert.equal(tokens.filter((t) => t.name === 'color/000000').length, 1);
  // 타이포
  assert.equal(byName.get('font-size/24')?.category, 'fontSize');
  assert.equal(byName.get('font-family/Inter')?.category, 'fontFamily');
  assert.equal(byName.get('line-height/150'), undefined); // %행간은 변수 후보가 아니다(A안 — 텍스트 스타일이 보관)
  assert.equal(byName.get('letter-spacing/2')?.unit, 'px'); // px 정수 자간은 후보
  // 간격/크기/반경
  assert.equal(byName.get('spacing/16')?.category, 'gap');
  assert.equal(byName.get('spacing/8')?.category, 'gap');
  assert.equal(byName.get('size/24')?.category, 'size'); // 아이콘
  assert.equal(byName.get('size/200'), undefined); // 일반 프레임의 크기는 뽑지 않는다
  assert.equal(byName.get('size/100'), undefined);
  assert.equal(byName.get('radius/8')?.category, 'radius');
  assert.equal(byName.get('radius/4')?.category, 'radius');
  // 선 두께(border) — 보이는 선이 있을 때만
  assert.equal(byName.get('stroke-width/2')?.category, 'strokeWidth');
  assert.deepEqual(byName.get('stroke-width/2')?.sources, ['strokeWidth']);
  // 레이어 불투명도(<1)
  assert.equal(byName.get('opacity/0_5')?.category, 'opacity');
  assert.deepEqual(byName.get('opacity/0_5')?.sources, ['opacity']);
});

test('extractFromSelection — HUG/FILL 축의 크기는 토큰화하지 않음(Fixed만)', () => {
  installFigma();
  // 가로 FILL(부모 채움), 세로 HUG(콘텐츠 맞춤) — 둘 다 동적 크기라 size 토큰 제외.
  const fillHug = {
    type: 'FRAME',
    id: 'f-fh',
    name: 'FillHug',
    layoutMode: 'VERTICAL',
    layoutSizingHorizontal: 'FILL',
    layoutSizingVertical: 'HUG',
    width: 32,
    height: 32,
    itemSpacing: 0,
    paddingLeft: 0,
    paddingRight: 0,
    paddingTop: 0,
    paddingBottom: 0,
    children: [],
  };
  // 가로만 Fixed(24) · 세로 HUG(24) 아이콘 → 그 축의 크기(width)만 토큰화.
  const fixedW = {
    type: 'FRAME',
    id: 'f-fw',
    name: 'FixedW',
    layoutMode: 'VERTICAL',
    layoutSizingHorizontal: 'FIXED',
    layoutSizingVertical: 'HUG',
    width: 24,
    height: 24,
    itemSpacing: 0,
    paddingLeft: 0,
    paddingRight: 0,
    paddingTop: 0,
    paddingBottom: 0,
    children: [vec('fw-v')],
  };
  fillHug.children = [vec('fh-v')];

  const { tokens } = extractFromSelection([fillHug, fixedW]);
  const names = new Set(tokens.map((t) => t.name));
  // FILL/HUG 축의 값은 모두 제외
  assert.equal(names.has('size/32'), false); // 가로 FILL · 세로 HUG
  // Fixed 축만 수집
  assert.equal(names.has('size/24'), true); // 가로 FIXED
});

test('extractFromSelection — 자유 배치(오토레이아웃 밖) 프레임의 크기는 제외', () => {
  installFigma();
  // 오토레이아웃이 아닌 프레임은 Hug/Fill이 될 수 없어 layoutSizing*가 항상 'FIXED'다.
  // 화면 프레임·장식 박스가 통째로 토큰이 되지 않도록 맥락으로 걸러야 한다.
  const decor = {
    type: 'FRAME',
    id: 'f-decor',
    name: 'Decoration',
    layoutMode: 'NONE',
    layoutSizingHorizontal: 'FIXED',
    layoutSizingVertical: 'FIXED',
    width: 1440,
    height: 812,
    children: [],
  };
  // 자유 배치 아이콘도 마찬가지
  const freeIcon = {
    type: 'FRAME',
    id: 'f-free-icon',
    name: 'FreeIcon',
    layoutMode: 'NONE',
    layoutSizingHorizontal: 'FIXED',
    layoutSizingVertical: 'FIXED',
    width: 20,
    height: 20,
    children: [vec('free-v')],
  };
  // 부모가 오토레이아웃이면 Fixed는 디자이너의 선택이므로 수집한다.
  const child = {
    type: 'FRAME',
    id: 'f-child',
    name: 'Child',
    layoutMode: 'NONE',
    layoutSizingHorizontal: 'FIXED',
    layoutSizingVertical: 'FIXED',
    width: 48,
    height: 48,
    children: [vec('child-v')], // 아이콘
  };
  const auto = {
    type: 'FRAME',
    id: 'f-auto',
    name: 'Auto',
    layoutMode: 'HORIZONTAL',
    layoutSizingHorizontal: 'HUG',
    layoutSizingVertical: 'HUG',
    width: 60, // 정사각형이 아니라 아이콘 틀이 아님(가장 바깥 틀 규칙에 걸리지 않게)
    height: 48,
    itemSpacing: 0,
    paddingLeft: 0,
    paddingRight: 0,
    paddingTop: 0,
    paddingBottom: 0,
    children: [child],
  };
  child.parent = auto;

  const names = new Set(extractFromSelection([decor, freeIcon, auto]).tokens.map((t) => t.name));
  assert.equal(names.has('size/1440'), false); // 자유 배치 — 화면 크기
  assert.equal(names.has('size/812'), false);
  assert.equal(names.has('size/20'), false); // 자유 배치 아이콘
  assert.equal(names.has('size/48'), true); // 오토레이아웃 자식의 Fixed
});

test('extractFromSelection — 소수 크기는 토큰화하지 않음', () => {
  installFigma();
  const node = {
    type: 'FRAME',
    id: 'f-frac',
    name: 'Frac',
    layoutMode: 'VERTICAL',
    layoutSizingHorizontal: 'FIXED',
    layoutSizingVertical: 'FIXED',
    width: 23.5,
    height: 23.5,
    itemSpacing: 0,
    paddingLeft: 0,
    paddingRight: 0,
    paddingTop: 0,
    paddingBottom: 0,
    children: [vec('frac-v')], // 아이콘
  };
  const whole = { ...node, id: 'f-whole', name: 'Whole', width: 64, height: 64, children: [vec('whole-v')] };

  const names = new Set(extractFromSelection([node, whole]).tokens.map((t) => t.name));
  assert.equal(names.has('size/23_5'), false); // 자유 리사이즈 잔값
  assert.equal(names.has('size/64'), true);
});

test('extractFromSelection — 숨긴 레이어와 인스턴스 내부는 순회하지 않음', () => {
  installFigma();
  const hidden = {
    type: 'FRAME',
    id: 'f-hidden',
    name: 'Hidden',
    visible: false,
    fills: [{ type: 'SOLID', color: { r: 0, g: 1, b: 0 }, visible: true }], // #00ff00 — 나오면 안 됨
    layoutMode: 'VERTICAL',
    layoutSizingHorizontal: 'FIXED',
    layoutSizingVertical: 'FIXED',
    width: 32,
    height: 32,
    itemSpacing: 0,
    paddingLeft: 0,
    paddingRight: 0,
    paddingTop: 0,
    paddingBottom: 0,
    children: [vec('hidden-v')], // 아이콘이어도 숨기면 제외
  };
  const inner = {
    type: 'FRAME',
    id: 'f-inner',
    name: 'Inner',
    fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 1 }, visible: true }], // #0000ff — 인스턴스 내부라 제외
    cornerRadius: 13,
    layoutMode: 'NONE',
    children: [vec('inner-v')],
  };
  const instance = {
    type: 'INSTANCE',
    id: 'i1',
    name: 'Button',
    fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 }, visible: true }], // #ff0000 — 인스턴스 자체는 수집
    layoutMode: 'VERTICAL',
    layoutSizingHorizontal: 'FIXED',
    layoutSizingVertical: 'FIXED',
    width: 40,
    height: 40,
    itemSpacing: 0,
    paddingLeft: 0,
    paddingRight: 0,
    paddingTop: 0,
    paddingBottom: 0,
    children: [inner], // 안쪽이 벡터뿐 — 아이콘 인스턴스
  };

  const { tokens, warnings } = extractFromSelection([hidden, instance]);
  const names = new Set(tokens.map((t) => t.name));
  assert.equal(names.has('color/00ff00'), false); // 숨긴 레이어
  assert.equal(names.has('size/32'), false);
  assert.equal(names.has('color/0000ff'), false); // 인스턴스 내부
  assert.equal(names.has('radius/13'), false);
  assert.equal(names.has('color/ff0000'), true); // 인스턴스 자체 속성은 수집
  assert.equal(names.has('size/40'), true); // 인스턴스 자체 크기(아이콘)
  assert.equal(warnings.length, 0); // 스킵은 조용히 — 안내 문구 없음
});

test('extractFromSelection — count는 값을 쓰는 레이어 수(한 레이어의 중복 사용은 1)', () => {
  installFigma();
  // 한 레이어가 padding 4방향에 모두 16을 써도 1로 센다.
  const mk = (id, gap) => ({
    type: 'FRAME',
    id,
    name: id,
    fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 }, visible: true }],
    layoutMode: 'VERTICAL',
    itemSpacing: gap,
    paddingLeft: 16,
    paddingRight: 16,
    paddingTop: 16,
    paddingBottom: 16,
    layoutSizingHorizontal: 'HUG',
    layoutSizingVertical: 'HUG',
    children: [],
  });
  const a = mk('a', 16);
  const b = mk('b', 8); // 16은 패딩으로만, 8은 이 레이어에서만

  const byName = new Map(extractFromSelection([a, b]).tokens.map((t) => [t.name, t]));
  assert.equal(byName.get('spacing/16').count, 2); // 두 레이어 — 한 레이어의 padding 4회는 1
  assert.equal(byName.get('spacing/8').count, 1); // b에서만
  assert.equal(byName.get('color/ff0000').count, 2); // 같은 색을 쓰는 레이어 2개
});

test('extractFromSelection — 절대 배치 자식의 크기는 제외(오토레이아웃 흐름 밖)', () => {
  installFigma();
  // 부모가 오토레이아웃이어도 layoutPositioning:'ABSOLUTE'면 Hug/Fill을 고를 수 없어 항상 FIXED다.
  const badge = {
    type: 'FRAME',
    id: 'badge',
    name: 'Badge',
    layoutMode: 'NONE',
    layoutPositioning: 'ABSOLUTE',
    layoutSizingHorizontal: 'FIXED',
    layoutSizingVertical: 'FIXED',
    width: 16,
    height: 16,
    children: [vec('badge-v')], // 아이콘
  };
  const flow = {
    type: 'FRAME',
    id: 'flow',
    name: 'Flow',
    layoutMode: 'NONE',
    layoutSizingHorizontal: 'FIXED',
    layoutSizingVertical: 'FIXED',
    width: 48,
    height: 48,
    children: [vec('flow-v')], // 아이콘
  };
  const card = {
    type: 'FRAME',
    id: 'card',
    name: 'Card',
    layoutMode: 'VERTICAL',
    layoutSizingHorizontal: 'HUG',
    layoutSizingVertical: 'HUG',
    itemSpacing: 0,
    paddingLeft: 0,
    paddingRight: 0,
    paddingTop: 0,
    paddingBottom: 0,
    children: [badge, flow],
  };
  badge.parent = card;
  flow.parent = card;

  const names = new Set(extractFromSelection([card]).tokens.map((t) => t.name));
  assert.equal(names.has('size/16'), false); // 절대 배치 — 오토레이아웃 흐름 밖
  assert.equal(names.has('size/48'), true); // 흐름 안의 Fixed는 그대로
});

test('extractFromSelection — 숨긴 조상 안의 레이어를 직접 선택해도 제외', () => {
  installFigma();
  const inner = {
    type: 'FRAME',
    id: 'inner',
    name: 'Inner',
    fills: [{ type: 'SOLID', color: { r: 0, g: 1, b: 0 }, visible: true }], // #00ff00 — 나오면 안 됨
    layoutMode: 'VERTICAL',
    layoutSizingHorizontal: 'FIXED',
    layoutSizingVertical: 'FIXED',
    width: 77,
    height: 77,
    itemSpacing: 0,
    paddingLeft: 0,
    paddingRight: 0,
    paddingTop: 0,
    paddingBottom: 0,
    children: [],
  };
  inner.parent = { type: 'GROUP', id: 'hiddenGroup', visible: false, parent: null };

  const { tokens } = extractFromSelection([inner]);
  assert.equal(tokens.length, 0); // 자신은 visible=true지만 조상이 숨김
});

test('bindSelection — 숨긴 조상 안의 선택 루트는 바인딩하지 않음', async () => {
  installFigma();
  await createTokens([{ name: 'color/0066ff', category: 'color', sources: ['fill'], value: '#0066ff' }], 16);
  const node = {
    type: 'FRAME',
    id: 'n',
    name: 'n',
    fills: [{ type: 'SOLID', color: { r: 0, g: 0.4, b: 1 } }],
    layoutMode: 'NONE',
    setBoundVariable() {},
  };
  node.parent = { type: 'GROUP', id: 'g', visible: false, parent: null };

  const res = await bindSelection([node]);
  assert.equal(res.bound, 0);
  assert.ok(res.reasons.hidden >= 1);
  assert.equal(node.fills[0].boundVariables, undefined);
});

test('extractFromSelection — 그리드 오토레이아웃은 gridRowGap/gridColumnGap을 수집', () => {
  installFigma();
  // display:inline-grid; padding:12px 20px; row-gap:12px; column-gap:5px
  // 그리드 모드에서는 itemSpacing/counterAxisSpacing이 아니라 grid*Gap이 실제 간격이다.
  const grid = {
    type: 'FRAME',
    id: 'g1',
    name: 'Grid',
    layoutMode: 'GRID',
    gridRowGap: 12,
    gridColumnGap: 5,
    itemSpacing: 0, // 그리드에서는 무의미 — 읽어도 안 됨
    counterAxisSpacing: 0,
    paddingTop: 12,
    paddingBottom: 12,
    paddingLeft: 20,
    paddingRight: 20,
    layoutSizingHorizontal: 'HUG',
    layoutSizingVertical: 'HUG',
    children: [],
  };

  const names = new Set(extractFromSelection([grid]).tokens.map((t) => t.name));
  assert.equal(names.has('spacing/12'), true); // row-gap · 세로 패딩
  assert.equal(names.has('spacing/5'), true); // column-gap
  assert.equal(names.has('spacing/20'), true); // 가로 패딩
});

test('extractFromSelection — 그라디언트 채움은 토큰에 포함하지 않음(뽑은 게 있으면 조용히)', () => {
  installFigma();
  const node = {
    type: 'RECTANGLE',
    id: 'g1',
    name: 'Grad',
    fills: [
      { type: 'GRADIENT_LINEAR', visible: true },
      { type: 'SOLID', color: { r: 0, g: 0, b: 0 }, visible: true },
    ],
  };
  const { tokens, warnings } = extractFromSelection([node]);
  assert.equal(tokens.filter((t) => t.category === 'color').length, 1); // 그라디언트는 빠지고 솔리드만
  assert.equal(warnings.length, 0); // 성공한 추출에 스킵 경고를 얹지 않는다(114393d)
});

test('extractFromSelection — 빈손이면 지나친 이유를 말한다', () => {
  installFigma();
  // 그라디언트뿐이라 뽑을 게 없다. 여기서까지 조용하면 버튼이 고장 난 것처럼 보인다.
  const node = {
    type: 'RECTANGLE',
    id: 'g1',
    name: 'Grad',
    fills: [{ type: 'GRADIENT_LINEAR', visible: true }],
  };
  const { tokens, warnings } = extractFromSelection([node]);
  assert.equal(tokens.length, 0);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /그라디언트/);
});

test('extractFromSelection — 인스턴스 내부만 있으면 그 이유를 말한다', () => {
  installFigma();
  const node = {
    type: 'INSTANCE',
    id: 'i1',
    name: 'Card',
    children: [{ type: 'RECTANGLE', id: 'i1c', name: 'inner', fills: [] }],
  };
  const { tokens, warnings } = extractFromSelection([node]);
  assert.equal(tokens.length, 0);
  assert.match(warnings.join(' '), /인스턴스 안쪽/);
});

/* ================= variables.ts ================= */
test('createTokens — Global 리터럴 + scopes/hidden + px 환산 (Semantic 거울 없음)', async () => {
  const figma = installFigma();
  const summary = await createTokens(
    [
      { name: 'color/0066ff', category: 'color', sources: ['fill'], value: '#0066ff' },
      { name: 'line-height/150', category: 'lineHeight', sources: ['lineHeight'], value: 150, unit: 'percent' },
      { name: 'spacing/16', category: 'gap', sources: ['gap'], value: 16 },
    ],
    16,
  );

  // 토큰당 Global 1개(거울 없음). 색1 + 라인하이트1 + 간격1 = created 3
  // conversions: base(16px) 환산 대상은 비-px인 lineHeight(150%)뿐
  const { globalOf, skippedManualNames, ...counts } = summary;
  assert.deepEqual(counts, {
    created: 3,
    updated: 0,
    globals: 3,
    semantics: 0,
    conversions: [{ name: 'line-height/150', from: '150%', to: 24 }],
    skippedManual: 0,
  });
  assert.equal(skippedManualNames.size, 0);
  assert.equal(globalOf.size, 3); // 토큰 이름 → 만든 Global id(§2.13 13.6)

  // Global 색: 리터럴 + scope + hidden
  const gColor = findVar(figma, 'Global', 'color/0066ff');
  assert.equal(gColor.hiddenFromPublishing, true);
  assert.deepEqual(gColor.scopes, ['ALL_FILLS']);
  assert.equal(rgbToHex(gColor.valuesByMode['mode:Global']), '#0066ff');

  // Semantic 거울은 만들지 않는다 — 역할 별칭만 createSemanticAliases가 만든다.
  assert.equal(findVar(figma, 'Semantic', 'color/0066ff'), undefined);

  // #16: 비-px lineHeight는 px FLOAT 단일(value=24=16*150/100) + 원본 단위는 description
  const gLh = findVar(figma, 'Global', 'line-height/150');
  assert.equal(gLh.resolvedType, 'FLOAT');
  assert.equal(gLh.valuesByMode['mode:Global'], 24);
  assert.equal(gLh.description, '150%');
  assert.deepEqual(gLh.scopes, ['LINE_HEIGHT']); // FLOAT라 스코프 유지
  assert.equal(findVar(figma, 'Semantic', 'line-height/150'), undefined); // 거울 없음
  // 스냅샷(-px) 변수는 생성하지 않음
  assert.equal(findVar(figma, 'Global', 'line-height/150-percent-px'), undefined);
});

test('createTokens(#16) — letterSpacing(em)도 px FLOAT + description', async () => {
  const figma = installFigma();
  await createTokens(
    [{ name: 'letter-spacing/0_02', category: 'letterSpacing', sources: ['letterSpacing'], value: 0.02, unit: 'em' }],
    16,
  );
  const g = findVar(figma, 'Global', 'letter-spacing/0_02');
  assert.equal(g.resolvedType, 'FLOAT');
  assert.equal(g.valuesByMode['mode:Global'], 0.32); // 0.02*16
  assert.equal(g.description, '0.02em');
});

test('createTokens — 재실행 멱등(upsert): 두 번째는 모두 updated', async () => {
  const figma = installFigma();
  const tokens = [
    { name: 'color/0066ff', category: 'color', sources: ['fill'], value: '#0066ff' },
    { name: 'spacing/16', category: 'gap', sources: ['gap'], value: 16 },
  ];
  const first = await createTokens(tokens, 16);
  const beforeCount = figma._state.variables.length;
  const second = await createTokens(tokens, 16);
  const afterCount = figma._state.variables.length;

  assert.equal(first.created, 2);
  assert.deepEqual(
    { created: second.created, updated: second.updated },
    { created: 0, updated: 2 },
  );
  assert.equal(beforeCount, afterCount); // 변수 개수 불변 → 중복 생성 없음
});

test('createSemanticAliases — Global 참조 별칭 생성 + 누락 보고 + 멱등', async () => {
  const figma = installFigma();
  await createTokens(
    [
      { name: 'color/neutral/50', category: 'color', sources: ['fill'], value: '#fafafa' },
      { name: 'color/neutral/900', category: 'color', sources: ['fill'], value: '#1a1a1a' },
    ],
    16,
  );

  const map = {
    surface: 'color/neutral/50',
    text: 'color/neutral/900',
    'border/oops': 'color/neutral/999', // 없는 Global → 누락
  };
  const s1 = await createSemanticAliases(map);
  assert.equal(s1.aliased, 2);
  assert.equal(s1.created, 2);
  assert.deepEqual(s1.missing, ['color/neutral/999']);

  // Semantic 'surface'가 Global neutral/50을 별칭
  const gNeutral50 = findVar(figma, 'Global', 'color/neutral/50');
  const surface = findVar(figma, 'Semantic', 'surface');
  assert.equal(surface.valuesByMode['mode:Semantic'].type, 'VARIABLE_ALIAS');
  assert.equal(surface.valuesByMode['mode:Semantic'].id, gNeutral50.id);
  // 역할 기반 스코프: surface(background)→프레임·도형 채움, text→TEXT_FILL (원시 ALL_FILLS 상속 아님)
  assert.deepEqual(surface.scopes, ['FRAME_FILL', 'SHAPE_FILL']);
  assert.deepEqual(findVar(figma, 'Semantic', 'text').scopes, ['TEXT_FILL']);

  // 재실행 → 모두 updated, 변수 개수 불변
  const before = figma._state.variables.length;
  const s2 = await createSemanticAliases(map);
  assert.deepEqual({ created: s2.created, updated: s2.updated, aliased: s2.aliased }, { created: 0, updated: 2, aliased: 2 });
  assert.equal(figma._state.variables.length, before);
});

test('createSemanticAliases — Global 컬렉션 없으면 전부 누락', async () => {
  installFigma();
  const s = await createSemanticAliases({ surface: 'color/neutral/50' });
  assert.equal(s.aliased, 0);
  assert.deepEqual(s.missing, ['color/neutral/50']);
});

/* ================= bind.ts ================= */
test('bindSelection — 색/크기 바인딩, 미매칭 skip, 오토레이아웃 아님 플래그', async () => {
  const figma = installFigma();
  // Semantic 토큰 시드(별칭→Global 리터럴): 색 #0066ff, 크기 24(아이콘)
  await createTokens(
    [
      { name: 'color/0066ff', category: 'color', sources: ['fill'], value: '#0066ff' },
      { name: 'size/24', category: 'size', sources: ['size'], value: 24 },
    ],
    16,
  );

  const node = {
    type: 'FRAME',
    id: 'box',
    name: 'box',
    fills: [
      { type: 'SOLID', color: { r: 0, g: 0.4, b: 1 } }, // #0066ff → 매칭
      { type: 'SOLID', color: { r: 0, g: 1, b: 0 } }, // 미매칭 → skip
    ],
    layoutSizingHorizontal: 'FIXED',
    layoutSizingVertical: 'HUG',
    width: 24,
    height: 24,
    children: [vec()], // 아이콘 — 크기는 아이콘 · 아바타만
    layoutMode: 'NONE',
    parent: { type: 'FRAME', layoutMode: 'VERTICAL' }, // 부모가 오토레이아웃 → Fixed는 디자이너의 선택
    setBoundVariable(field, v) {
      (this._bound ??= {})[field] = v.id;
    },
  };

  const res = await bindSelection([node]);

  assert.equal(res.bound, 2); // 색 1 + width 1
  assert.equal(res.skipped, 1); // 미매칭 색 1
  assert.ok(res.reasons['no-autolayout'] >= 1); // 오토레이아웃 밖 여백·간격은 사유로만 남는다(flags 안내는 PR 4에서 지움)
  // 첫 채움에 변수 바인딩됨
  assert.equal(node.fills[0].boundVariables.color.type, 'VARIABLE_ALIAS');
  // width가 Semantic size 변수로 바인딩됨
  const sSize = findVar(figma, 'Global', 'size/24');
  assert.equal(roleTarget(figma, node._bound.width), sSize.id);
});

test('bindSelection — 이미 바인딩된 자리는 2회차 미리보기에 후보로 오르지 않음', async () => {
  installFigma();
  await createTokens(
    [
      { name: 'color/0066ff', category: 'color', sources: ['fill'], value: '#0066ff' },
      { name: 'size/24', category: 'size', sources: ['size'], value: 24 },
    ],
    16,
  );
  const node = {
    type: 'FRAME',
    id: 'box',
    name: 'box',
    fills: [{ type: 'SOLID', color: { r: 0, g: 0.4, b: 1 } }],
    layoutSizingHorizontal: 'FIXED',
    layoutSizingVertical: 'HUG',
    width: 24,
    height: 24,
    children: [vec()], // 아이콘
    layoutMode: 'NONE',
    parent: { type: 'FRAME', layoutMode: 'VERTICAL' },
    boundVariables: {},
    setBoundVariable(field, v) {
      this.boundVariables[field] = { type: 'VARIABLE_ALIAS', id: v.id }; // 실제 Figma와 같은 기록
    },
  };

  const first = await bindSelection([node]);
  assert.equal(first.bound, 2); // 색 1 + width 1

  // 바인딩 뒤에도 fills[0].color·width는 resolved 값 그대로다 — 값만 보면 다시 매칭된다.
  const second = await bindSelection([node], false);
  assert.equal(second.bound, 0);
  assert.equal(second.candidates.length, 0);
  assert.equal(second.reasons['already-bound'], 2); // 색 1 + width 1
  assert.equal(second.skipped, 0); // 실패가 아니므로 스킵 수는 늘지 않는다
  assert.ok(second.skips.some((s) => s.reason === 'already-bound')); // 칩에서 레이어로 이동 가능
});

/** 디자이너가 만든 Semantic 역할(Global 별칭) — 이미 붙은 역할은 바꾸지 않는다(§2.11 · §2.12 12.8). */
function designerRole(figma, name, global) {
  const col = figma._state.collections.find((c) => c.name === 'Semantic') ?? figma.variables.createVariableCollection('Semantic');
  const v = figma.variables.createVariable(name, col, global.resolvedType);
  v.scopes = ['ALL_SCOPES'];
  v.setValueForMode(col.defaultModeId, { type: 'VARIABLE_ALIAS', id: global.id });
  return v;
}

test('bindSelection — 이미 붙은 Semantic 역할은 같은 값의 상위 tier 변수로 덮어쓰지 않음', async () => {
  const figma = installFigma();
  await createTokens([{ name: 'color/0066ff', category: 'color', sources: ['fill'], value: '#0066ff' }], 16);
  const sColor = designerRole(figma, 'color/brand', findVar(figma, 'Global', 'color/0066ff'));
  // 같은 값의 Component tier 변수(매칭 우선순위가 더 높다) — 사용자가 고른 Semantic 바인딩을
  // 말없이 갈아치우면 안 된다.
  const comp = figma.variables.createVariableCollection('Component');
  const cv = figma.variables.createVariable('button/bg', comp, 'COLOR');
  cv.scopes = ['ALL_SCOPES'];
  cv.setValueForMode(comp.defaultModeId, { r: 0, g: 0.4, b: 1 });

  const node = {
    type: 'FRAME',
    id: 'box',
    name: 'box',
    fills: [
      {
        type: 'SOLID',
        color: { r: 0, g: 0.4, b: 1 },
        boundVariables: { color: { type: 'VARIABLE_ALIAS', id: sColor.id } },
      },
    ],
    layoutMode: 'NONE',
    setBoundVariable() {},
  };

  const res = await bindSelection([node]);
  assert.equal(res.bound, 0);
  assert.equal(node.fills[0].boundVariables.color.id, sColor.id); // 그대로 유지
  assert.equal(res.reasons['already-bound'], 1);
});

test('bindSelection — Global이 붙은 칠하기도 이미 연결됨 — 같은 값의 Component가 있어도 바꾸지 않는다(§2.12 12.8 결정 B)', async () => {
  const figma = installFigma();
  await createTokens([{ name: 'color/0066ff', category: 'color', sources: ['fill'], value: '#0066ff' }], 16);
  const g = findVar(figma, 'Global', 'color/0066ff');
  const comp = figma.variables.createVariableCollection('Component');
  const cv = figma.variables.createVariable('button/bg', comp, 'COLOR');
  cv.scopes = ['ALL_SCOPES'];
  cv.setValueForMode(comp.defaultModeId, { r: 0, g: 0.4, b: 1 });
  const node = {
    type: 'FRAME', id: 'box', name: 'box', layoutMode: 'NONE', setBoundVariable() {},
    fills: [{ type: 'SOLID', color: { r: 0, g: 0.4, b: 1 }, boundVariables: { color: { type: 'VARIABLE_ALIAS', id: g.id } } }],
  };
  const dry = await bindSelection([node], false);
  assert.equal(dry.candidates.length, 0);
  assert.equal(dry.reasons['already-bound'], 1);
  const res = await bindSelection([node]);
  assert.equal(res.bound, 0);
  assert.equal(node.fills[0].boundVariables.color.id, g.id);
});

test('bindSelection — 노드 레벨 fills 바인딩만 있어도 이미 바인딩으로 보호', async () => {
  // paint.boundVariables.color는 비어 있고 node.boundVariables.fills[i]만 있는 경우
  // (테마 적용·외부 도구가 남기는 형태). paint만 보면 열린 자리로 오인해 덮어쓴다.
  const figma = installFigma();
  await createTokens([{ name: 'color/0066ff', category: 'color', sources: ['fill'], value: '#0066ff' }], 16);
  const sColor = designerRole(figma, 'color/brand', findVar(figma, 'Global', 'color/0066ff'));
  const comp = figma.variables.createVariableCollection('Component');
  const cv = figma.variables.createVariable('button/bg', comp, 'COLOR');
  cv.scopes = ['ALL_SCOPES'];
  cv.setValueForMode(comp.defaultModeId, { r: 0, g: 0.4, b: 1 });

  const node = {
    type: 'FRAME',
    id: 'box',
    name: 'box',
    fills: [{ type: 'SOLID', color: { r: 0, g: 0.4, b: 1 } }], // paint 쪽 boundVariables 없음
    boundVariables: { fills: [{ type: 'VARIABLE_ALIAS', id: sColor.id }] },
    layoutMode: 'NONE',
    setBoundVariable() {},
  };

  const res = await bindSelection([node]);
  assert.equal(res.bound, 0);
  assert.equal(res.reasons['already-bound'], 1);
  assert.equal(node.boundVariables.fills[0].id, sColor.id); // 노드 레벨 유지
  assert.equal(node.fills[0].boundVariables, undefined); // paint는 여전히 비어 있음(덮어쓰지 않음)
});

test('bindSelection — 텍스트 일부 구간에만 변수가 붙어 있으면 속성 전체를 건너뜀(빈 구간을 채우지 않음)', async () => {
  const figma = installFigma();
  await createTokens([{ name: 'font-size/16', category: 'fontSize', sources: ['fontSize'], value: 16 }], 16);
  const sizeVar = findVar(figma, 'Global', 'font-size/16');

  // 원래 "Hi"(0..2)만 바인딩된 뒤 글자를 "Hi!!!"로 늘린 상태 — 꼬리 2..5는 비어 있다.
  const ranges = new Map(); // field → [{start,end,id}]
  ranges.set('fontSize', [{ start: 0, end: 2, id: sizeVar.id }]);

  const node = {
    type: 'TEXT',
    id: 't',
    name: 't',
    characters: 'Hi!!!',
    fontSize: 16,
    fontName: { family: 'Inter', style: 'Regular' },
    lineHeight: { unit: 'AUTO' },
    letterSpacing: { unit: 'PIXELS', value: 0 },
    fills: [],
    boundVariables: { fontSize: [{ type: 'VARIABLE_ALIAS', id: sizeVar.id }] }, // 비어 있지 않음(구 버그 트리거)
    getRangeBoundVariable(start, end, field) {
      const list = ranges.get(field) ?? [];
      const hits = list.filter((r) => r.start < end && r.end > start);
      if (!hits.length) return null;
      const cover = hits.length === 1 && hits[0].start <= start && hits[0].end >= end;
      if (!cover) return figma.mixed;
      // 구간 안 단일 변수
      const id = hits[0].id;
      if (hits.some((h) => h.id !== id)) return figma.mixed;
      return { type: 'VARIABLE_ALIAS', id };
    },
    setRangeBoundVariable(start, end, field, v) {
      const list = ranges.get(field) ?? [];
      list.push({ start, end, id: v.id });
      ranges.set(field, list);
      this.boundVariables[field] = list.map((r) => ({ type: 'VARIABLE_ALIAS', id: r.id }));
    },
  };

  const res = await bindSelection([node]);
  assert.equal(res.bound, 0);
  assert.equal(res.reasons['already-bound'], 1); // IA v3 §2.11 — 일부 구간 연결 = 이미 연결됨
  // 기존 0..2는 그대로, 꼬리 2..5도 채우지 않는다
  assert.deepEqual(ranges.get('fontSize').map((r) => [r.start, r.end, r.id]), [[0, 2, sizeVar.id]]);

  // 미리보기에도 후보로 오르지 않는다. boundVariables 배열이 비어 있어도 전 구간 조회가 mixed면 같다.
  node.boundVariables = {};
  const dry = await bindSelection([node], false);
  assert.equal(dry.candidates.length, 0);
  assert.equal(dry.reasons['already-bound'], 1);
});

test('bindSelection — "같은 값"만: 소수 둘째 자리까지 같으면 연결, 가까운 값에는 붙이지 않음', async () => {
  const figma = installFigma();
  await createTokens(
    [
      { name: 'size/8', category: 'size', sources: ['size'], value: 8 },
      { name: 'size/12', category: 'size', sources: ['size'], value: 12 },
    ],
    16,
  );
  const node = {
    type: 'FRAME',
    id: 'n',
    name: 'n',
    fills: [],
    layoutSizingHorizontal: 'FIXED',
    layoutSizingVertical: 'HUG',
    width: 11, // 12와 1 차이 — 허용오차가 없으므로 붙이지 않는다(레이어 값을 바꾸지 않는다)
    height: 11,
    children: [vec()], // 아이콘 — 크기는 아이콘 · 아바타만
    layoutMode: 'NONE',
    parent: { type: 'FRAME', layoutMode: 'VERTICAL' },
    setBoundVariable(field, v) {
      (this._bound ??= {})[field] = v.id;
    },
  };
  const r1 = await bindSelection([node]);
  assert.equal(node._bound, undefined);
  assert.equal(r1.reasons['no-match'], 1);

  // 11.996 → 소수 2자리 반올림 12.00 = 12 → 같은 값
  node.width = 11.996;
  node.height = 11.996; // 정사각형 유지
  await bindSelection([node]);
  const s12 = findVar(figma, 'Global', 'size/12');
  assert.equal(roleTarget(figma, node._bound.width), s12.id);

  // 12.01은 화면에 보이는 값이 달라 같은 값이 아니다
  const n2 = { ...node, id: 'n2', width: 12.01, height: 12.01, _bound: undefined };
  await bindSelection([n2]);
  assert.equal(n2._bound, undefined);
});

test('bindSelection — HUG/FILL 사유는 두 축 모두 집계', async () => {
  installFigma();
  await createTokens([{ name: 'size/32', category: 'size', sources: ['size'], value: 32 }], 16);
  // 가로 FILL · 세로 HUG — 두 축 모두 건너뛰었으니 사유도 2건이어야 한다.
  const node = {
    type: 'FRAME',
    id: 'n',
    name: 'n',
    fills: [],
    layoutMode: 'VERTICAL',
    layoutSizingHorizontal: 'FILL',
    layoutSizingVertical: 'HUG',
    width: 32,
    height: 32,
    children: [vec()], // 아이콘
    itemSpacing: 0,
    paddingLeft: 0,
    paddingRight: 0,
    paddingTop: 0,
    paddingBottom: 0,
    setBoundVariable() {},
  };

  const res = await bindSelection([node]);
  assert.equal(res.reasons['hug-fill'], 2); // 세로 축 사유가 빠지지 않는다
  assert.equal(res.bound, 0);
});

test('bindSelection — 소수 크기는 근처 정수 토큰에 스냅하지 않음(정확 일치만)', async () => {
  const figma = installFigma();
  await createTokens(
    [
      { name: 'size/24', category: 'size', sources: ['size'], value: 24 },
      { name: 'size/40', category: 'size', sources: ['size'], value: 40 },
    ],
    16,
  );
  const mk = (id, w) => ({
    type: 'FRAME',
    id,
    name: id,
    fills: [],
    layoutMode: 'VERTICAL',
    layoutSizingHorizontal: 'FIXED',
    layoutSizingVertical: 'HUG',
    width: w,
    height: w,
    children: [vec(`${id}-v`)], // 아이콘
    itemSpacing: 0,
    paddingLeft: 0,
    paddingRight: 0,
    paddingTop: 0,
    paddingBottom: 0,
    setBoundVariable(field, v) {
      (this._bound ??= {})[field] = v.id;
    },
  });

  // 23.5는 허용오차(1) 안에 size/24가 있지만, extract가 소수 size를 토큰으로 만들지 않으므로
  // 바인딩도 스냅하지 않는다 — 그러지 않으면 추출이 거부한 값을 바인딩이 되살리며 폭까지 바꾼다.
  const frac = mk('frac', 23.5);
  const res = await bindSelection([frac]);
  assert.equal(frac._bound, undefined);
  assert.equal(res.reasons['size-fraction'], 1); // 사유가 '매칭 없음'에 섞이지 않고 따로 집계된다

  // 정수 크기는 기존대로 허용오차 스냅이 동작한다.
  const near = mk('near', 39.5);
  await bindSelection([near]);
  assert.equal(near._bound, undefined); // 39.5도 소수 → 스냅 안 함
  const exact = mk('exact', 24);
  await bindSelection([exact]);
  assert.equal(roleTarget(figma, exact._bound.width), findVar(figma, 'Global', 'size/24').id);
});

test('bindSelection — 소수 크기라도 같은 값의 토큰이 있으면 바인딩', async () => {
  const figma = installFigma();
  await createTokens([{ name: 'size/23_5', category: 'size', sources: ['size'], value: 23.5 }], 16);
  const node = {
    type: 'FRAME',
    id: 'n',
    name: 'n',
    fills: [],
    layoutMode: 'VERTICAL',
    layoutSizingHorizontal: 'FIXED',
    layoutSizingVertical: 'HUG',
    width: 23.5,
    height: 23.5,
    children: [vec()], // 아이콘
    itemSpacing: 0,
    paddingLeft: 0,
    paddingRight: 0,
    paddingTop: 0,
    paddingBottom: 0,
    setBoundVariable(field, v) {
      (this._bound ??= {})[field] = v.id;
    },
  };

  await bindSelection([node]);
  assert.equal(roleTarget(figma, node._bound.width), findVar(figma, 'Global', 'size/23_5').id);
});

test('bindSelection — dry-run은 사유별 건너뛴 레이어를 노드×사유로 수집', async () => {
  installFigma();
  await createTokens([{ name: 'size/24', category: 'size', sources: ['size'], value: 24 }], 16);
  // 오토레이아웃 프레임 — padding 4방향이 모두 매칭 실패(GAP 변수 없음)지만 레이어는 1개다.
  const pad = {
    type: 'FRAME',
    id: 'pad',
    name: 'Padded',
    fills: [],
    layoutMode: 'VERTICAL',
    layoutSizingHorizontal: 'HUG',
    layoutSizingVertical: 'HUG',
    width: 24,
    height: 24,
    children: [vec('pad-v')], // 아이콘 — 크기 사유는 아이콘 · 아바타에서만
    itemSpacing: 7,
    paddingLeft: 7,
    paddingRight: 7,
    paddingTop: 7,
    paddingBottom: 7,
    setBoundVariable() {},
  };
  const free = {
    type: 'FRAME',
    id: 'free',
    name: 'Free',
    fills: [],
    layoutMode: 'NONE',
    layoutSizingHorizontal: 'FIXED',
    layoutSizingVertical: 'FIXED',
    width: 24,
    height: 24,
    children: [vec('free-v')], // 아이콘
    setBoundVariable() {},
  };
  // 아이콘 · 아바타가 아닌 카드 — 크기 사유를 내지 않는다
  const card = {
    type: 'FRAME',
    id: 'card',
    name: 'Card',
    fills: [],
    layoutMode: 'NONE',
    layoutSizingHorizontal: 'FIXED',
    layoutSizingVertical: 'FIXED',
    width: 356,
    height: 467,
    setBoundVariable() {},
  };

  const dry = await bindSelection([pad, free, card], false);

  const byReason = (r) => dry.skips.filter((s) => s.reason === r);
  // padding 5건이 모두 no-match지만 레이어는 1개 — 노드×사유로 중복 제거된다.
  assert.equal(byReason('no-match').length, 1);
  assert.equal(byReason('no-match')[0].nodeId, 'pad');
  assert.equal(byReason('no-match')[0].name, 'Padded');
  assert.ok(dry.reasons['no-match'] >= 5); // 건수는 속성 단위 그대로
  // 자유 배치·HUG/FILL도 각각 레이어와 함께 잡힌다(카드는 크기를 찾지 않으니 없다).
  assert.deepEqual(byReason('size-free-layout').map((s) => s.nodeId), ['free']);
  assert.deepEqual(byReason('hug-fill').map((s) => s.nodeId), ['pad']);
  assert.equal(byReason('hug-fill')[0].field, 'width'); // 첫 축의 필드가 남는다

  // 실제 적용(apply=true)에서도 사유 목록을 모은다(결과 트리의 사유 칩).
  const real = await bindSelection([pad, free], true);
  assert.ok(Array.isArray(real.skips)); // 적용 모드도 사유 목록을 싣는다(결과 트리의 사유 칩)
});

test('bindSelection — 스킵 목록·미리보기 트리는 고른 레이어 수가 아니라 상한에 묶인다', async () => {
  installFigma();
  await createTokens([{ name: 'size/24', category: 'size', sources: ['size'], value: 24 }], 16);
  // 매칭되는 레이어 1개 + 매칭 안 되는 자유배치 아이콘 500개(크기 사유는 아이콘 · 아바타에서만 난다).
  const hit = {
    type: 'FRAME', id: 'hit', name: 'Hit', fills: [], layoutMode: 'NONE',
    layoutSizingHorizontal: 'FIXED', layoutSizingVertical: 'FIXED', width: 24, height: 24, children: [vec('hit-v')],
    setBoundVariable() {},
  };
  const misses = Array.from({ length: 500 }, (_, i) => ({
    type: 'FRAME', id: `m${i}`, name: `Miss ${i}`, fills: [], layoutMode: 'NONE',
    layoutSizingHorizontal: 'FIXED', layoutSizingVertical: 'FIXED', width: 20, height: 20, children: [vec(`m${i}-v`)],
    setBoundVariable() {},
  }));

  const dry = await bindSelection([hit, ...misses], false);

  assert.ok(Object.values(dry.skipLayers).reduce((a, b) => a + b, 0) >= 500); // 실제 스킵 수(노드×사유)는 상한 전 그대로 보고
  assert.equal(dry.skips.length, 200); // 실어 보내는 목록은 상한까지
  assert.ok(dry.reasons['size-free-layout'] >= 500); // 사유 집계는 상한과 무관 — 칩 숫자는 진짜 수
  assert.ok(dry.skipLayers['size-free-layout'] >= 500 && dry.skipLayers['size-free-layout'] > dry.skips.length, '사유별 레이어 수는 상한 전 — 건너뛴 곳 목록의 "레이어 {n}개"(ia-v4 §4.2)');
  // 트리도 상한을 따른다 — 501개 레이어를 골랐어도 행은 상한(+후보)만큼만.
  assert.ok(dry.nodes.length <= 201);
  assert.ok(dry.nodes.some((n) => n.id === 'hit')); // 후보는 잘려 나가지 않는다
});

test('bindSelection — 스킵 상한을 사유별로 나눠 드문 사유도 레이어 목록을 지킨다', async () => {
  installFigma();
  await createTokens([
    { name: 'size/24', category: 'size', sources: ['size'], value: 24 },
    { name: 'spacing/12', category: 'gap', sources: ['gap'], value: 12 },
  ], 16);
  // 사유가 노드별로 갈려야 이 테스트가 뜻이 있다 — 한 노드가 두 사유를 다 내면 순회만으로
  // 자연히 섞여서, 앞에서 자르든 나눠 담든 결과가 같다.
  // 흔한 사유(매칭 없음) 400개가 먼저 순회되고, 드문 사유(HUG/FILL) 10개가 뒤에 온다.
  const common = Array.from({ length: 400 }, (_, i) => ({
    type: 'FRAME', id: `c${i}`, name: `NoMatch ${i}`, fills: [], layoutMode: 'VERTICAL',
    layoutSizingHorizontal: 'FIXED', layoutSizingVertical: 'FIXED', width: 24, height: 24, children: [vec(`c${i}-v`)],
    itemSpacing: 13, // 토큰 없는 간격 → no-match (아이콘 크기 24는 붙으므로 크기 사유는 안 난다)
    setBoundVariable() {},
  }));
  const rare = Array.from({ length: 10 }, (_, i) => ({
    type: 'FRAME', id: `r${i}`, name: `Hug ${i}`, fills: [], layoutMode: 'VERTICAL',
    layoutSizingHorizontal: 'HUG', layoutSizingVertical: 'HUG', width: 24, height: 24, children: [vec(`r${i}-v`)],
    itemSpacing: 12, // 토큰 있는 간격 → 붙는다. 남는 사유는 HUG/FILL뿐.
    setBoundVariable() {},
  }));

  const dry = await bindSelection([...common, ...rare], false);

  assert.equal(dry.skips.length, 200); // 상한은 그대로
  const reasonsInList = new Set(dry.skips.map((s) => s.reason));
  const reasonsCounted = Object.keys(dry.reasons).filter((k) => dry.reasons[k] > 0);
  // 사유가 하나뿐이면 이 테스트는 아무것도 안 지킨다 — 갈라지는지부터 확인한다.
  assert.ok(reasonsCounted.length >= 2, `사유가 ${reasonsCounted.length}종뿐이라 상한 분배를 검증할 수 없다`);
  // 집계에 잡힌 사유는 전부 목록에도 한 건 이상 남아야 한다 — 그래야 칩이 살아 있다.
  for (const r of reasonsCounted) assert.ok(reasonsInList.has(r), `사유 '${r}'의 레이어 목록이 비었다`);
});

test('bindSelection — 그리드 오토레이아웃의 row/column gap 바인딩', async () => {
  const figma = installFigma();
  await createTokens(
    [
      { name: 'spacing/12', category: 'gap', sources: ['gap'], value: 12 },
      { name: 'spacing/5', category: 'gap', sources: ['gap'], value: 5 },
    ],
    16,
  );
  const grid = {
    type: 'FRAME',
    id: 'g',
    name: 'g',
    fills: [],
    layoutMode: 'GRID',
    gridRowGap: 12,
    gridColumnGap: 5,
    paddingTop: 12,
    paddingBottom: 12,
    paddingLeft: 0,
    paddingRight: 0,
    layoutSizingHorizontal: 'HUG',
    layoutSizingVertical: 'HUG',
    setBoundVariable(field, v) {
      (this._bound ??= {})[field] = v.id;
    },
  };

  await bindSelection([grid]);
  const s12 = findVar(figma, 'Global', 'spacing/12');
  const s5 = findVar(figma, 'Global', 'spacing/5');
  assert.equal(roleTarget(figma, grid._bound.gridRowGap), s12.id);
  assert.equal(roleTarget(figma, grid._bound.gridColumnGap), s5.id);
  assert.equal(roleTarget(figma, grid._bound.paddingTop), s12.id); // 패딩은 모드와 무관하게 그대로
  assert.equal(grid._bound.itemSpacing, undefined); // 그리드에서는 시도하지 않음
});

test('bindSelection — 자유 배치 크기 제외 · 숨김/인스턴스 내부 미순회(extract.ts와 동일 기준)', async () => {
  const figma = installFigma();
  await createTokens(
    [
      { name: 'color/0066ff', category: 'color', sources: ['fill'], value: '#0066ff' },
      { name: 'size/24', category: 'size', sources: ['size'], value: 24 },
    ],
    16,
  );
  const blue = () => ({ type: 'SOLID', color: { r: 0, g: 0.4, b: 1 } }); // #0066ff → 매칭

  // 1) 자유 배치(오토레이아웃 밖) — layoutSizing*는 항상 FIXED지만 크기는 대상 아님. 색은 그대로 바인딩.
  const free = {
    type: 'FRAME',
    id: 'free',
    name: 'free',
    fills: [blue()],
    layoutMode: 'NONE',
    layoutSizingHorizontal: 'FIXED',
    layoutSizingVertical: 'FIXED',
    width: 24,
    height: 24,
    children: [vec('free-v')], // 아이콘이어도 자유 배치면 크기 제외
    setBoundVariable(field, v) {
      (this._bound ??= {})[field] = v.id;
    },
  };
  const r1 = await bindSelection([free]);
  assert.equal(r1.bound, 1); // 색 1건뿐
  assert.equal(free._bound, undefined); // width/height 미바인딩
  assert.ok(r1.reasons['size-free-layout'] >= 1);

  // 2) 숨긴 레이어 — 자신과 하위 모두 제외
  const hiddenChild = { type: 'FRAME', id: 'hc', name: 'hc', fills: [blue()], layoutMode: 'NONE', setBoundVariable() {} };
  const hidden = {
    type: 'FRAME',
    id: 'h',
    name: 'h',
    visible: false,
    fills: [blue()],
    layoutMode: 'NONE',
    layoutSizingHorizontal: 'HUG',
    layoutSizingVertical: 'HUG',
    children: [hiddenChild],
    setBoundVariable() {},
  };
  const r2 = await bindSelection([hidden]);
  assert.equal(r2.bound, 0);
  assert.ok(r2.reasons.hidden >= 1);
  assert.equal(hiddenChild.fills[0].boundVariables, undefined);

  // 3) 인스턴스 — 자체 속성만 바인딩하고 내부는 건드리지 않음(오버라이드 방지)
  const inner = { type: 'FRAME', id: 'in', name: 'in', fills: [blue()], layoutMode: 'NONE', children: [vec('in-v')], setBoundVariable() {} };
  const inst = {
    type: 'INSTANCE',
    id: 'i',
    name: 'i',
    fills: [blue()],
    layoutMode: 'VERTICAL',
    layoutSizingHorizontal: 'FIXED',
    layoutSizingVertical: 'HUG',
    width: 24,
    height: 24, // 안쪽이 벡터뿐 — 아이콘 인스턴스
    itemSpacing: 0,
    paddingLeft: 0,
    paddingRight: 0,
    paddingTop: 0,
    paddingBottom: 0,
    children: [inner],
    setBoundVariable(field, v) {
      (this._bound ??= {})[field] = v.id;
    },
  };
  const r3 = await bindSelection([inst]);
  const s24 = findVar(figma, 'Global', 'size/24');
  assert.equal(roleTarget(figma, inst._bound.width), s24.id); // 인스턴스 자체 크기는 바인딩
  assert.equal(inner.fills[0].boundVariables, undefined); // 내부는 미순회
  assert.ok(r3.reasons['instance-children'] >= 1);
});

test('bindSelection — 여백(padding/gap)은 GAP 변수에만 — size/line-height/letter-spacing 오매칭 방지', async () => {
  const figma = installFigma();
  // 값이 모두 24로 같은 네 변수: 간격(GAP)·크기(WIDTH_HEIGHT)·행간(LINE_HEIGHT)·자간(LETTER_SPACING)
  await createTokens(
    [
      { name: 'spacing/24', category: 'gap', sources: ['gap'], value: 24 },
      { name: 'size/24', category: 'size', sources: ['size'], value: 24 },
      { name: 'line-height/lg', category: 'lineHeight', sources: ['lineHeight'], value: 24, unit: 'px' },
      { name: 'letter-spacing/wide', category: 'letterSpacing', sources: ['letterSpacing'], value: 24, unit: 'px' },
    ],
    16,
  );
  const node = {
    type: 'FRAME',
    id: 'al',
    name: 'al',
    fills: [],
    layoutSizingHorizontal: 'HUG',
    layoutSizingVertical: 'HUG',
    layoutMode: 'HORIZONTAL',
    itemSpacing: 24,
    paddingLeft: 24,
    paddingRight: 0,
    paddingTop: 0,
    paddingBottom: 0,
    setBoundVariable(field, v) {
      (this._bound ??= {})[field] = v.id;
    },
  };

  const res = await bindSelection([node]);

  const gap = findVar(figma, 'Global', 'spacing/24');
  // itemSpacing·paddingLeft는 GAP 변수로만 연결(크기/행간/자간으로 새지 않음)
  assert.equal(roleTarget(figma, node._bound.itemSpacing), gap.id);
  assert.equal(roleTarget(figma, node._bound.paddingLeft), gap.id);
  assert.equal(res.bound, 2); // itemSpacing + paddingLeft (0짜리 padding 3개는 만들 수 없는 값 — 세지 않는다, §4.1 k ①)
  assert.equal(res.reasons['no-match'] ?? 0, 0);
});

test('bindSelection — 선 두께(strokeWeight)는 STROKE_FLOAT 변수에 바인딩(여백 변수로 안 샘)', async () => {
  const figma = installFigma();
  await createTokens(
    [
      { name: 'stroke-width/2', category: 'strokeWidth', sources: ['strokeWidth'], value: 2 },
      { name: 'spacing/2', category: 'gap', sources: ['gap'], value: 2 }, // 같은 값 2 — 오매칭 유혹
    ],
    16,
  );
  const node = {
    type: 'FRAME',
    id: 'bordered',
    name: 'bordered',
    fills: [],
    strokes: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, visible: true }],
    strokeWeight: 2,
    layoutSizingHorizontal: 'HUG',
    layoutSizingVertical: 'HUG',
    layoutMode: 'NONE',
    setBoundVariable(field, v) {
      (this._bound ??= {})[field] = v.id;
    },
  };

  const res = await bindSelection([node]);

  const sw = findVar(figma, 'Global', 'stroke-width/2');
  assert.equal(roleTarget(figma, node._bound.strokeWeight), sw.id); // STROKE_FLOAT 변수로 연결
  assert.equal(res.bound, 1);
});

test('bindSelection — 색상도 용도 스코프로 분리(stroke 전용 색은 fill에 안 붙음)', async () => {
  const figma = installFigma();
  await createTokens(
    [
      { name: 'color/aa0000', category: 'color', sources: ['fill'], value: '#aa0000' }, // ALL_FILLS
      { name: 'color/0000aa', category: 'color', sources: ['stroke'], value: '#0000aa' }, // STROKE_COLOR
    ],
    16,
  );
  const node = {
    type: 'FRAME',
    id: 'c',
    name: 'c',
    fills: [
      { type: 'SOLID', color: { r: 0.6667, g: 0, b: 0 } }, // #aa0000 → fill 변수
      { type: 'SOLID', color: { r: 0, g: 0, b: 0.6667 } }, // #0000aa = stroke 전용 색 → fill엔 안 붙어야
    ],
    strokes: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0.6667 }, visible: true }], // #0000aa → stroke 변수
    layoutSizingHorizontal: 'HUG',
    layoutSizingVertical: 'HUG',
    layoutMode: 'NONE',
  };

  const res = await bindSelection([node]);

  const fillVar = findVar(figma, 'Global', 'color/aa0000');
  const strokeVar = findVar(figma, 'Global', 'color/0000aa');
  assert.equal(roleTarget(figma, node.fills[0].boundVariables.color.id), fillVar.id); // fill 매칭
  assert.equal(node.fills[1].boundVariables, undefined); // stroke 전용 색은 fill에 안 붙음
  assert.equal(roleTarget(figma, node.strokes[0].boundVariables.color.id), strokeVar.id); // stroke 매칭
  assert.equal(res.bound, 2);
});

test('bindSelection — 반투명 칠하기 · 그림자는 hex · 투명도까지 같은 변수에만 붙고 레이어 값은 그대로(ia-v3 §2.11 "색")', async () => {
  const figma = installFigma();
  await createTokens(
    [
      { name: 'color/000000', category: 'color', sources: ['fill', 'stroke', 'effectColor'], value: '#000000' },
      { name: 'color/ffffff', category: 'color', sources: ['fill'], value: '#ffffff' },
      { name: 'color/000000-a8', category: 'color', sources: ['fill'], value: '#000000', alpha: 0.08 },
      { name: 'color/000000-a25', category: 'effectColor', sources: ['effectColor'], value: '#000000', alpha: 0.25 },
    ],
    16,
  );
  const node = {
    type: 'FRAME',
    id: 'tr',
    name: 'tr',
    fills: [
      { type: 'SOLID', color: { r: 1, g: 1, b: 1 } }, // 불투명 → 붙는다
      { type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity: 0.08 }, // 8% 검정 → 8% 변수
      { type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity: 0.5 }, // 50% 검정 → 같은 투명도 변수 없음
      { type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity: 0.004 }, // 투명도 0(반올림) → 찾지 않음
    ],
    strokes: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity: 0.12, visible: true }], // 12% → 같은 투명도 변수 없음
    effects: [
      { type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.25 }, offset: { x: 0, y: 2 }, radius: 4, visible: true }, // 25% → 25% 변수
      { type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 1 }, offset: { x: 0, y: 1 }, radius: 0, visible: true }, // 불투명 → 붙는다
      { type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0 }, offset: { x: 0, y: 1 }, radius: 0, visible: true }, // 투명도 0 → 찾지 않음
    ],
    layoutSizingHorizontal: 'HUG',
    layoutSizingVertical: 'HUG',
    layoutMode: 'NONE',
  };

  const res = await bindSelection([node]);

  const white = findVar(figma, 'Global', 'color/ffffff');
  const black = findVar(figma, 'Global', 'color/000000');
  const a8 = findVar(figma, 'Global', 'color/000000-a8');
  const a25 = findVar(figma, 'Global', 'color/000000-a25');
  assert.deepEqual(Object.values(a8.valuesByMode)[0], { r: 0, g: 0, b: 0, a: 0.08 }, 'Global은 RGBA');
  assert.equal(roleTarget(figma, node.fills[0].boundVariables.color.id), white.id);
  assert.equal(roleTarget(figma, node.fills[1].boundVariables.color.id), a8.id, '같은 투명도 → 반투명 Global을 가리키는 역할');
  assert.equal(node.fills[1].opacity, 0.08, '레이어 값 그대로(목도 변수 alpha를 칠 불투명도로 옮긴다)');
  assert.equal(node.fills[2].boundVariables, undefined, '다른 투명도 → 붙지 않음');
  assert.equal(node.fills[2].opacity, 0.5);
  assert.equal(node.fills[3].boundVariables, undefined, '투명도 0 → 찾지 않음');
  assert.equal(node.strokes[0].boundVariables, undefined);
  assert.equal(roleTarget(figma, node.effects[0].boundVariables.color.id), a25.id);
  assert.equal(node.effects[0].color.a, 0.25, '그림자 alpha 그대로');
  assert.equal(roleTarget(figma, node.effects[1].boundVariables.color.id), black.id);
  assert.equal(node.effects[1].color.a, 1);
  assert.equal(node.effects[2].boundVariables, undefined);
  assert.equal(res.bound, 4);
  assert.equal(res.reasons['translucent'], undefined, '사유 translucent는 없어짐');
  assert.equal(res.reasons['no-match'], 2, '50% 칠 · 12% 선 — 투명도 0은 세지 않음');
});

test('bindSelection — 찾기 미리보기: 반투명 후보는 currentAlpha · variableAlpha, 불투명이면 없음', async () => {
  installFigma();
  await createTokens(
    [
      { name: 'color/000000', category: 'color', sources: ['fill'], value: '#000000' },
      { name: 'color/000000-a8', category: 'color', sources: ['fill'], value: '#000000', alpha: 0.08 },
    ],
    16,
  );
  const node = {
    type: 'RECTANGLE', id: 'r', name: 'r',
    fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity: 0.08 }, { type: 'SOLID', color: { r: 0, g: 0, b: 0 } }],
  };
  const res = await bindSelection([node], false);
  const c = res.candidates.slice().sort((a, b) => a.index - b.index);
  assert.equal(c.length, 2);
  assert.equal(c[0].currentValue, '#000000');
  assert.equal(c[0].currentAlpha, 0.08);
  assert.equal(c[0].variableAlpha, 0.08);
  assert.equal('currentAlpha' in c[1], false);
  assert.equal('variableAlpha' in c[1], false);
  assert.notEqual(c[0].variableName, c[1].variableName, '값이 다르면 다른 역할');
});

test('bindSelection — 역할 별칭(text)이 같은 값의 Semantic 거울(color/gray/950)보다 먼저, 옛 이름(spacing/sm) 대신 쓰임 역할(§2.12)', async () => {
  const figma = installFigma();
  await createTokens(
    [
      { name: 'color/gray/950', category: 'color', sources: ['fill'], value: '#000000' },
      { name: 'spacing/8', category: 'gap', sources: ['gap'], value: 8 },
    ],
    16,
  );
  await createSemanticAliases({ text: 'color/gray/950', 'spacing/sm': 'spacing/8' });
  designerRole(figma, 'color/gray/950', findVar(figma, 'Global', 'color/gray/950')); // 예전 거울 — 역할로 치지 않는다
  // FRAME(간격) 안에 TEXT 자식(채움) — 칠하기 용도는 레이어 종류를 따른다(§2.11, QA #4 불합격 1).
  const label = {
    type: 'TEXT', id: 'label', name: 'label', characters: 'Hi', fontSize: 13, fontName: { family: 'X', style: 'R' },
    lineHeight: { unit: 'AUTO' }, letterSpacing: { unit: 'PERCENT', value: 0 },
    fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }],
    boundVariables: {}, setRangeBoundVariable() {},
  };
  const node = {
    type: 'FRAME',
    id: 'role',
    name: 'role',
    fills: [],
    layoutMode: 'VERTICAL',
    itemSpacing: 8,
    paddingLeft: 0, paddingRight: 0, paddingTop: 0, paddingBottom: 0,
    layoutSizingHorizontal: 'HUG',
    layoutSizingVertical: 'HUG',
    children: [label],
    boundVariables: {},
    setBoundVariable(field, v) { this.boundVariables[field] = { type: 'VARIABLE_ALIAS', id: v.id }; },
  };
  label.parent = node;
  await bindSelection([node]);
  assert.equal(label.fills[0].boundVariables.color.id, findVar(figma, 'Semantic', 'text').id);
  const gap = node.boundVariables.itemSpacing.id;
  assert.equal(varName(figma, gap), 'spacing/gap'); // 옛 고정 칸 이름(spacing/sm)은 순서 3에서 빠진다(12.7)
  assert.equal(roleTarget(figma, gap), findVar(figma, 'Global', 'spacing/8').id);
});

test('bindSelection — 지워진 변수를 가리키는 자리는 덮어쓰지 않고 "삭제된 변수에 연결됨"으로 건너뜀', async () => {
  const figma = installFigma();
  await createTokens([{ name: 'color/aa0000', category: 'color', sources: ['fill'], value: '#aa0000' }], 16);
  // 살아 있는 Semantic 역할에 붙인 자리 — 마지막 '이미 연결됨' 확인(§2.11 · §2.12 12.8).
  const live = designerRole(figma, 'color/danger', findVar(figma, 'Global', 'color/aa0000'));
  const node = {
    type: 'FRAME', id: 'dg', name: 'dg',
    // 컬렉션을 지운 뒤 남은 잔상: 존재하지 않는 변수 id를 가리킨다.
    fills: [{ type: 'SOLID', color: { r: 0.6667, g: 0, b: 0 }, boundVariables: { color: { type: 'VARIABLE_ALIAS', id: 'VariableID:deleted' } } }],
    boundVariables: { fills: [{ type: 'VARIABLE_ALIAS', id: 'VariableID:deleted' }] },
    layoutSizingHorizontal: 'HUG', layoutSizingVertical: 'HUG', layoutMode: 'NONE',
  };
  const res = await bindSelection([node], false);
  assert.equal(res.bound, 0);
  assert.equal(res.candidates.length, 0);
  assert.equal(res.reasons['deleted-var'], 1);
  assert.equal(res.reasons['already-bound'], undefined);
  assert.ok(res.skips.some((s) => s.reason === 'deleted-var' && s.nodeId === 'dg' && s.field === 'fills'));
  const res1 = await bindSelection([node]);
  assert.equal(res1.bound, 0);
  assert.equal(node.fills[0].boundVariables.color.id, 'VariableID:deleted'); // 그대로 둔다(다시 붙이는 일은 피그마에서)

  // 스칼라 필드·글자 필드도 같다
  const frame = {
    type: 'FRAME', id: 'dg2', name: 'dg2', fills: [], layoutMode: 'VERTICAL', layoutSizingHorizontal: 'HUG', layoutSizingVertical: 'HUG',
    itemSpacing: 8, paddingLeft: 0, paddingRight: 0, paddingTop: 0, paddingBottom: 0,
    boundVariables: { itemSpacing: { type: 'VARIABLE_ALIAS', id: 'VariableID:gone' } },
    setBoundVariable(field, v) { this.boundVariables[field] = { type: 'VARIABLE_ALIAS', id: v.id }; },
  };
  await createTokens([{ name: 'spacing/8', category: 'gap', sources: ['gap'], value: 8 }], 16);
  const r2 = await bindSelection([frame]);
  assert.equal(frame.boundVariables.itemSpacing.id, 'VariableID:gone');
  assert.equal(r2.reasons['deleted-var'], 1);

  // 살아 있는 변수에 붙어 있으면 '이미 연결됨'
  node.fills = [{ type: 'SOLID', color: { r: 0.6667, g: 0, b: 0 }, boundVariables: { color: { type: 'VARIABLE_ALIAS', id: live.id } } }];
  node.boundVariables = {};
  const res3 = await bindSelection([node]);
  assert.equal(res3.bound, 0);
  assert.equal(res3.reasons['already-bound'], 1);
});

test('bindSelection — 레이어 불투명도(opacity)는 OPACITY 변수에 정밀 바인딩', async () => {
  const figma = installFigma();
  await createTokens(
    [
      { name: 'opacity/0_5', category: 'opacity', sources: ['opacity'], value: 0.5 }, // OPACITY
      { name: 'size/0_5', category: 'size', sources: ['size'], value: 0.5 }, // WIDTH_HEIGHT — 같은 값, 오매칭 유혹
    ],
    16,
  );
  const node = {
    type: 'FRAME',
    id: 'op',
    name: 'op',
    fills: [],
    opacity: 0.5,
    layoutSizingHorizontal: 'HUG',
    layoutSizingVertical: 'HUG',
    layoutMode: 'NONE',
    setBoundVariable(field, v) {
      (this._bound ??= {})[field] = v.id;
    },
  };

  const res = await bindSelection([node]); // px 허용오차가 커도 opacity는 정밀 매칭

  const op = findVar(figma, 'Global', 'opacity/0_5');
  assert.equal(roleTarget(figma, node._bound.opacity), op.id); // OPACITY 변수로만 연결(size로 안 샘)
  assert.equal(res.bound, 1);
});

test('bindSelection — fontFamily(STRING)는 FONT_FAMILY 변수에 정확 일치 바인딩', async () => {
  const figma = installFigma();
  await createTokens([{ name: 'font-family/Inter', category: 'fontFamily', sources: ['fontFamily'], value: 'Inter' }], 16);
  const node = {
    type: 'TEXT',
    id: 'txt',
    name: 'txt',
    fills: [],
    fontName: { family: 'Inter', style: 'Regular' },
    fontSize: 16,
    lineHeight: { unit: 'AUTO' },
    letterSpacing: { unit: 'PIXELS', value: 0 },
    characters: 'Hello',
    boundVariables: {},
    setRangeBoundVariable(start, end, field, v) {
      this.boundVariables[field] = { type: 'VARIABLE_ALIAS', id: v.id };
    },
  };

  const res = await bindSelection([node]);

  const fam = findVar(figma, 'Global', 'font-family/Inter');
  assert.equal(roleTarget(figma, node.boundVariables.fontFamily.id), fam.id);
  assert.ok(res.bound >= 1);
});

test('bindSelection — dry-run(apply=false)은 변경 없이 동일 집계 + 사유', async () => {
  installFigma();
  await createTokens(
    [
      { name: 'color/0066ff', category: 'color', sources: ['fill'], value: '#0066ff' },
      { name: 'size/24', category: 'size', sources: ['size'], value: 24 },
    ],
    16,
  );
  const mk = () => ({
    type: 'FRAME',
    id: 'box',
    name: 'box',
    fills: [
      { type: 'SOLID', color: { r: 0, g: 0.4, b: 1 } }, // #0066ff → 매칭
      { type: 'SOLID', color: { r: 0, g: 1, b: 0 } }, // 미매칭 → skip(no-match)
    ],
    layoutSizingHorizontal: 'FIXED',
    layoutSizingVertical: 'HUG',
    width: 24,
    height: 24,
    children: [vec()], // 아이콘 — 크기는 아이콘 · 아바타만
    layoutMode: 'NONE', // → 사유 no-autolayout
    parent: { type: 'FRAME', layoutMode: 'VERTICAL' }, // 크기 바인딩은 오토레이아웃 맥락에서만
    setBoundVariable(field, v) {
      (this._bound ??= {})[field] = v.id;
    },
  });

  const node = mk();
  const dry = await bindSelection([node], false);
  assert.equal(dry.bound, 2); // 색1 + width1 예정
  assert.equal(dry.skipped, 1); // 미매칭 색1
  assert.equal(dry.reasons['no-match'], 1);
  assert.ok(dry.reasons['no-autolayout'] >= 1);
  // 변경 없음(dry-run): 채움 바인딩/노드 필드 미설정
  assert.equal(node.fills[0].boundVariables, undefined);
  assert.equal(node._bound, undefined);

  // 실제 적용은 동일 수치 + 변경 발생
  const node2 = mk();
  const real = await bindSelection([node2], true);
  assert.equal(real.bound, 2);
  assert.equal(real.skipped, 1);
  assert.equal(node2.fills[0].boundVariables.color.type, 'VARIABLE_ALIAS');
  // 적용 모드도 '어디에 어느 변수가 붙었나' 목록을 싣는다(결과 트리). 실제로 붙은 것만.
  assert.equal(real.candidates.length, 2);
  assert.ok(real.nodes.length >= 1);
});

test('bindSelection — dry-run 후보(#6) + 트리 노드(#13): 영향+조상, 필드/변수/인덱스', async () => {
  const figma = installFigma();
  await createTokens(
    [
      { name: 'color/0066ff', category: 'color', sources: ['fill'], value: '#0066ff' },
      { name: 'size/24', category: 'size', sources: ['size'], value: 24 },
    ],
    16,
  );
  // 루트(매칭 없음) → 자식(색+width 매칭). 조상은 맥락으로 보존돼야 한다.
  const child = {
    type: 'FRAME',
    id: 'child',
    name: 'child',
    fills: [
      { type: 'SOLID', color: { r: 0, g: 0.4, b: 1 } }, // #0066ff → 후보(fills,0)
      { type: 'SOLID', color: { r: 0, g: 1, b: 0 } }, // 미매칭
    ],
    layoutSizingHorizontal: 'FIXED',
    layoutSizingVertical: 'HUG',
    width: 24, // → 후보(width)
    height: 24,
    children: [vec()], // 아이콘 — 크기는 아이콘 · 아바타만
    layoutMode: 'NONE',
    setBoundVariable() {},
  };
  // 루트는 오토레이아웃 — 자식의 Fixed 크기가 바인딩 대상이 되려면 맥락이 필요하다.
  const root = { type: 'FRAME', id: 'root', name: 'root', fills: [], layoutMode: 'VERTICAL', layoutSizingHorizontal: 'HUG', layoutSizingVertical: 'HUG', itemSpacing: 0, paddingLeft: 0, paddingRight: 0, paddingTop: 0, paddingBottom: 0, children: [child], setBoundVariable() {} };
  child.parent = root;

  const dry = await bindSelection([root], false);

  // 후보 2건: fills[0] 색 + width
  assert.equal(dry.candidates.length, 2);
  const fillC = dry.candidates.find((c) => c.field === 'fills');
  assert.equal(fillC.nodeId, 'child');
  assert.equal(fillC.index, 0);
  assert.equal(fillC.currentValue, '#0066ff');
  // 역할 없는 색은 Global 대신 새 쓰임 역할(§2.12) — 프레임 채움 · 가장 많이 쓴 색 = background/default
  assert.equal(fillC.variableName, 'color/background/default');
  assert.equal(fillC.variableId, 'new:color/background/default');
  assert.equal(fillC.tier, 2);
  assert.deepEqual(fillC.newRole, { name: 'color/background/default', globalId: findVar(figma, 'Global', 'color/0066ff').id, scopes: ['FRAME_FILL', 'SHAPE_FILL'] });
  const widthC = dry.candidates.find((c) => c.field === 'width');
  assert.equal(widthC.variableName, 'size/icon');
  assert.equal(widthC.nodeId, 'child');
  assert.equal('distance' in widthC, false); // 허용오차가 없으므로 거리도 없다
  assert.equal(widthC.variableValue, '24');

  // 트리: 영향(child) + 조상(root)만, pre-order. 계층 복원.
  assert.deepEqual(dry.nodes.map((n) => n.id), ['root', 'child']);
  const byId = new Map(dry.nodes.map((n) => [n.id, n]));
  assert.equal(byId.get('root').parentId, null);
  assert.equal(byId.get('child').parentId, 'root');
  assert.equal(byId.get('child').depth, 1);
});

test('bindSelection — 건너뛴 레이어도 미리보기 트리에 남는다(사유 표시용)', async () => {
  installFigma();
  await createTokens([{ name: 'color/0066ff', category: 'color', sources: ['fill'], value: '#0066ff' }], 16);
  // 형제 둘: hit=매칭, miss=매칭 없음. miss는 후보가 0이라 예전 가지치기에선 트리에서 사라졌다.
  const mk = (id, g) => ({
    type: 'FRAME', id, name: id,
    fills: [{ type: 'SOLID', color: { r: 0, g: g, b: 1 } }],
    layoutSizingHorizontal: 'HUG', layoutSizingVertical: 'HUG', layoutMode: 'NONE',
    setBoundVariable() {},
  });
  const hit = mk('hit', 0.4); // #0066ff
  const miss = mk('miss', 1); // #00ffff → 매칭 없음
  const root = { type: 'FRAME', id: 'root', name: 'root', fills: [], layoutMode: 'VERTICAL', layoutSizingHorizontal: 'HUG', layoutSizingVertical: 'HUG', itemSpacing: 0, paddingLeft: 0, paddingRight: 0, paddingTop: 0, paddingBottom: 0, children: [hit, miss], setBoundVariable() {} };
  hit.parent = root;
  miss.parent = root;

  const dry = await bindSelection([root], false);

  assert.equal(dry.candidates.filter((c) => c.nodeId === 'miss').length, 0); // 후보 없음
  assert.ok(dry.skips.some((s) => s.nodeId === 'miss' && s.reason === 'no-match'));
  assert.ok(dry.nodes.some((n) => n.id === 'miss'), '건너뛴 레이어가 트리에서 빠지면 사유를 보여줄 자리가 없다');
  assert.deepEqual(dry.nodes.map((n) => n.id), ['root', 'hit', 'miss']); // pre-order 유지
});

test('bindSelection — 진행률 보고 + 취소(UX6)', async () => {
  installFigma();
  await createTokens([{ name: 'color/0066ff', category: 'color', sources: ['fill'], value: '#0066ff' }], 16);
  const mk = (id) => ({
    type: 'FRAME',
    id,
    name: id,
    fills: [{ type: 'SOLID', color: { r: 0, g: 0.4, b: 1 } }], // 매칭 → 노드당 1 바인딩
    layoutSizingHorizontal: 'HUG',
    layoutSizingVertical: 'HUG',
    layoutMode: 'NONE',
    setBoundVariable() {},
  });

  // 진행률: onProgress 호출, 마지막엔 total 도달
  const sel = Array.from({ length: 120 }, (_, i) => mk('n' + i));
  let lastDone = 0;
  let total = 0;
  const res = await bindSelection(sel, true, {
    onProgress: (d, t) => {
      lastDone = d;
      total = t;
    },
    yieldToEvents: () => Promise.resolve(),
  });
  assert.equal(total, 120);
  assert.equal(lastDone, 120);
  assert.equal(res.cancelled, undefined);
  assert.equal(res.bound, 120);

  // 취소: shouldCancel true → 첫 양보 지점(50)에서 중단, 처리한 만큼만 적용
  const sel2 = Array.from({ length: 120 }, (_, i) => mk('m' + i));
  const res2 = await bindSelection(sel2, true, {
    onProgress: () => {},
    shouldCancel: () => true,
    yieldToEvents: () => Promise.resolve(),
  });
  assert.equal(res2.cancelled, true);
  assert.equal(res2.bound, 50);
});

test('previewCreateTokens — 변수 생성 없이 생성/갱신 예정 집계', async () => {
  const figma = installFigma();
  const tokens = [
    { name: 'color/0066ff', category: 'color', sources: ['fill'], value: '#0066ff' },
    { name: 'size/200', category: 'size', sources: ['size'], value: 200 },
  ];
  // 컬렉션/변수 없는 초기 상태 — 모두 생성 예정.
  const before = figma._state.variables.length;
  const p = await previewCreateTokens(tokens, 16);
  assert.equal(figma._state.variables.length, before); // 미생성(읽기 전용)
  // 토큰 2개 → Global 2(거울 없음)
  assert.equal(p.globals, 2);
  assert.equal(p.semantics, 0);
  assert.equal(p.created, 2);
  assert.equal(p.updated, 0);

  // 실제 생성 후 다시 미리보기 → 모두 갱신 예정.
  await createTokens(tokens, 16);
  const p2 = await previewCreateTokens(tokens, 16);
  assert.equal(p2.created, 0);
  assert.equal(p2.updated, 2);
});

test('previewCreateTokens — base가 환산에 반영되고 실제 생성값과 일치', async () => {
  const figma = installFigma();
  const tokens = [
    { name: 'line-height/160', category: 'lineHeight', sources: ['lineHeight'], value: 160, unit: 'percent' },
    { name: 'letter-spacing/1-5', category: 'letterSpacing', sources: ['letterSpacing'], value: 1.5, unit: 'rem' },
    { name: 'size/200', category: 'size', sources: ['size'], value: 200 }, // 단위 없음 — 환산 대상 아님
  ];
  const p16 = await previewCreateTokens(tokens, 16);
  assert.deepEqual(p16.conversions, [
    { name: 'line-height/160', from: '160%', to: 25.6 },
    { name: 'letter-spacing/1-5', from: '1.5rem', to: 24 },
  ]);

  // base를 바꾸면 미리보기 환산도 따라 바뀐다(개수 집계는 그대로).
  const p20 = await previewCreateTokens(tokens, 20);
  assert.deepEqual(p20.conversions.map((c) => c.to), [32, 30]);
  assert.equal(p20.globals, p16.globals);
  assert.equal(p20.semantics, p16.semantics);

  // 미리보기 환산값 == 실제 생성된 Global 변수값(같은 규칙을 공유하는지 확인).
  const applied = await createTokens(tokens, 20);
  assert.deepEqual(applied.conversions.map((c) => c.to), [32, 30]);
  assert.equal(findVar(figma, 'Global', 'line-height/160').valuesByMode['mode:Global'], 32);
  assert.equal(findVar(figma, 'Global', 'letter-spacing/1-5').valuesByMode['mode:Global'], 30);
});

/* ================= rename.ts ================= */
test('renameSelection — 역할 기반·보존형·맥락 전파·형제 중복(숫자 없음)', async () => {
  const figma = installFigma();
  const col = figma.variables.createVariableCollection('Semantic');
  const tokenVar = figma.variables.createVariable('button/primary/background', col, 'COLOR');

  // 선택 루트(depth 0 컨테이너) → 보존하고 자식 맥락으로 사용.
  const bg = {
    type: 'RECTANGLE',
    id: 'bg',
    name: 'Rectangle 1',
    boundVariables: { fills: [{ type: 'VARIABLE_ALIAS', id: tokenVar.id }] },
    fills: [{ type: 'SOLID', visible: true }],
  };
  const icon1 = { type: 'VECTOR', id: 'ic1', name: 'Vector 2' };
  const icon2 = { type: 'VECTOR', id: 'ic2', name: 'Vector 3' };
  const txt = { type: 'TEXT', id: 'tx', name: 'KeepText', characters: 'x' };
  const inst = { type: 'INSTANCE', id: 'in', name: 'KeepInstance' };
  const bg2 = { type: 'RECTANGLE', id: 'bg2', name: 'Rectangle 9', fills: [{ type: 'SOLID', visible: true }] };

  const root = {
    type: 'FRAME',
    id: 'root',
    name: 'button', // 선택 루트 → 보존(자식 맥락 'button')
    children: [bg, icon1, icon2, txt, inst, bg2],
  };

  const { changes, applied } = await renameSelection([root], { apply: true, maxDepth: 3 });
  assert.equal(applied, true);

  const after = new Map(changes.map((c) => [c.id, c.after]));
  // 선택 루트 이름은 보존(변경 없음) → 자식 맥락 'button'
  assert.equal(after.has('root'), false);
  assert.equal(root.name, 'button');
  // 토큰 말단(background)이 역할 신호 → 토큰 경로 복사가 아니라 맥락(button)+역할
  assert.equal(after.get('bg'), 'button-background');
  // VECTOR → icon, 맥락 button. 형제가 같아도 숫자 안 붙음(Figma 중복 허용)
  assert.equal(after.get('ic1'), 'button-icon');
  assert.equal(after.get('ic2'), 'button-icon');
  // 토큰 없는 채움 사각형 → background, bg와 동일(중복 허용)
  assert.equal(after.get('bg2'), 'button-background');
  // 제외: Text·Instance는 변경 없음(이름 유지)
  assert.equal(after.has('tx'), false);
  assert.equal(after.has('in'), false);
  assert.equal(txt.name, 'KeepText');
  assert.equal(inst.name, 'KeepInstance');
});

test('renameSelection — nodes: 전체 서브트리 + 계층(depth/parentId) + 영향 노드만 after', async () => {
  installFigma();
  const icon = { type: 'VECTOR', id: 'ic', name: 'Vector 2' }; // 영향(→ icon)
  const keep = { type: 'TEXT', id: 'tx', name: 'KeepText', characters: 'x' }; // 보존(after 없음)
  const root = { type: 'FRAME', id: 'root', name: 'card', children: [icon, keep] }; // 선택 루트 → 보존

  const { nodes, changes } = await renameSelection([root], { apply: false, maxDepth: 3 });

  // 전체 서브트리(루트 + 자식 2)가 모두 트리에 담긴다.
  assert.deepEqual(nodes.map((n) => n.id).sort(), ['ic', 'root', 'tx']);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  // 계층: 루트 depth0·parentId null, 자식 depth1·parentId 'root'
  assert.equal(byId.get('root').depth, 0);
  assert.equal(byId.get('root').parentId, null);
  assert.equal(byId.get('ic').depth, 1);
  assert.equal(byId.get('ic').parentId, 'root');
  // 영향 노드만 after 보유(icon), 보존 노드(root·text)는 after 없음
  assert.equal(byId.get('ic').after, 'card-icon');
  assert.equal(byId.get('root').after, undefined);
  assert.equal(byId.get('tx').after, undefined);
  // name은 변경 전(before) — apply:false라 실제 이름 불변
  assert.equal(byId.get('ic').name, 'Vector 2');
  assert.equal(icon.name, 'Vector 2');
  // changes는 영향 노드만(=after 있는 노드 수와 일치)
  assert.equal(changes.length, nodes.filter((n) => n.after !== undefined).length);
});

test('renameSelection — 보존 노드는 사유(keep)를 싣고, 바뀌는 노드는 싣지 않는다', async () => {
  installFigma();
  const icon = { type: 'VECTOR', id: 'ic', name: 'Vector 2' }; // 영향 → keep 없음
  const text = { type: 'TEXT', id: 'tx', name: 'Label', characters: 'x' };
  const inst = { type: 'INSTANCE', id: 'in', name: 'Button', children: [{ type: 'VECTOR', id: 'deep', name: 'Vector 9' }] };
  const comp = { type: 'COMPONENT', id: 'cp', name: 'Chip' };
  const lock = { type: 'RECTANGLE', id: 'lk', name: 'Rectangle 3', locked: true };
  const root = { type: 'FRAME', id: 'root', name: 'Frame 1', children: [icon, text, inst, comp, lock] };

  const { nodes } = await renameSelection([root], { apply: false, maxDepth: 3 });
  const keepOf = new Map(nodes.map((n) => [n.id, n.keep]));

  assert.equal(keepOf.get('root'), 'root'); // 선택 루트 보존
  assert.equal(keepOf.get('tx'), 'text');
  assert.equal(keepOf.get('in'), 'instance');
  assert.equal(keepOf.get('cp'), 'component');
  assert.equal(keepOf.get('lk'), 'locked');
  assert.equal(keepOf.get('ic'), undefined); // 바뀌는 노드엔 사유가 없다
  assert.equal(keepOf.has('deep'), false); // 인스턴스 하위는 서브트리째 제외 — 행 자체가 없다
});

test('renameSelection — 선택 루트 컨테이너는 사람이 지은 이름이어도 보존(맥락 기준)', async () => {
  installFigma();
  const node = { type: 'FRAME', id: 'f', name: 'OriginalName', children: [] };
  const { changes } = await renameSelection([node], { apply: true, maxDepth: 3 });
  assert.equal(changes.length, 0); // 선택 루트(depth 0 컨테이너)는 보존
  assert.equal(node.name, 'OriginalName');
});

test('renameSelection — 정규화: 사람이 지은 하위 레이어 이름도 역할로 교체(뚜렷한 역할)', async () => {
  installFigma();
  const inner = { type: 'VECTOR', id: 'in', name: 'OriginalName' }; // 사람이 지은 이름
  // 선택 루트(보존) 아래의 사람이 지은 이름 → 보존하지 않고 역할(VECTOR → icon)로 교체.
  const root = { type: 'FRAME', id: 'root', name: 'Frame 0', children: [inner] };
  const { changes } = await renameSelection([root], { apply: true, maxDepth: 3 });
  const after = new Map(changes.map((c) => [c.id, c.after]));
  assert.equal(after.get('in'), 'icon'); // 'OriginalName'을 역할(icon)로 덮어씀
  assert.equal(inner.name, 'icon');
});

test('renameSelection — 토큰 신호로 맥락/역할 결정(조상 없음 → 토큰 접두사 폴백, 원시 토큰은 무시)', async () => {
  const figma = installFigma();
  const col = figma.variables.createVariableCollection('Semantic');
  const semantic = figma.variables.createVariable('button/primary/background', col, 'COLOR');
  const glob = figma.variables.createVariableCollection('Global');
  const primitive = figma.variables.createVariable('color/blue-500', glob, 'COLOR');

  // 단독 선택(조상 없음) + 시맨틱 토큰 → 토큰 접두사에서 깨끗한 1단계(button)가 맥락, leaf가 역할
  const a = {
    type: 'RECTANGLE',
    id: 'a',
    name: 'Rectangle 1',
    boundVariables: { fills: [{ type: 'VARIABLE_ALIAS', id: semantic.id }] },
    fills: [{ type: 'SOLID', visible: true }],
  };
  // 원시(Global) 토큰 → 이름 신호 없음 → 기하 폴백(채움 → background), 맥락 없음
  const b = {
    type: 'RECTANGLE',
    id: 'b',
    name: 'Rectangle 1',
    boundVariables: { fills: [{ type: 'VARIABLE_ALIAS', id: primitive.id }] },
    fills: [{ type: 'SOLID', visible: true }],
  };

  const { changes } = await renameSelection([a, b], { apply: true, maxDepth: 3 });
  const after = new Map(changes.map((c) => [c.id, c.after]));
  assert.equal(after.get('a'), 'button-background'); // button-primary → 1단계 button
  assert.equal(after.get('b'), 'background');
});

test('renameSelection — primaryToken은 먼저 만난 원시 토큰을 건너뛰고 뒤쪽 시맨틱 신호를 사용', async () => {
  const figma = installFigma();
  const glob = figma.variables.createVariableCollection('Global');
  const primitive = figma.variables.createVariable('color/blue-500', glob, 'COLOR');
  const sem = figma.variables.createVariableCollection('Semantic');
  const semantic = figma.variables.createVariable('card/media/image', sem, 'COLOR');

  const node = {
    type: 'RECTANGLE',
    id: 'r',
    name: 'Rectangle 1',
    boundVariables: {
      fills: [{ type: 'VARIABLE_ALIAS', id: primitive.id }],
      strokes: [{ type: 'VARIABLE_ALIAS', id: semantic.id }],
    },
    fills: [{ type: 'SOLID', visible: true }],
    strokes: [{ type: 'SOLID', visible: true }],
  };

  const { changes } = await renameSelection([node], { apply: true, maxDepth: 3 });
  assert.equal(changes[0].after, 'card-image');
});

test('renameSelection — maxDepth 입력 방어: 음수·소수·NaN은 안전한 정수 범위로 정규화', async () => {
  const figma = installFigma();
  const sem = figma.variables.createVariableCollection('Semantic');
  const semantic = figma.variables.createVariable('button/primary/background', sem, 'COLOR');
  const mk = (id) => ({
    type: 'RECTANGLE',
    id,
    name: 'Rectangle 1',
    boundVariables: { fills: [{ type: 'VARIABLE_ALIAS', id: semantic.id }] },
    fills: [{ type: 'SOLID', visible: true }],
  });

  const neg = mk('neg');
  const frac = mk('frac');
  const nan = mk('nan');
  const r1 = await renameSelection([neg], { apply: true, maxDepth: -3 });
  const r2 = await renameSelection([frac], { apply: true, maxDepth: 1.6 });
  const r3 = await renameSelection([nan], { apply: true, maxDepth: Number.NaN });

  assert.equal(r1.changes[0].after, 'background'); // 음수 → 1
  assert.equal(r2.changes[0].after, 'button-background'); // 1.6 → 2
  assert.equal(r3.changes[0].after, 'button-background'); // NaN → 기본 8
});

test('renameSelection — 구 리네임이 남긴 토큰 베낌 이름(color-121210)은 교체', async () => {
  const figma = installFigma();
  const glob = figma.variables.createVariableCollection('Global');
  const primitive = figma.variables.createVariable('color/121210', glob, 'COLOR');

  // 구 동작이 원시 토큰 경로를 베껴 만든 프레임 이름 → 보존하면 안 됨
  const frame = {
    type: 'FRAME',
    id: 'f',
    name: 'color-121210',
    fills: [{ type: 'SOLID', visible: true }],
    boundVariables: { fills: [{ type: 'VARIABLE_ALIAS', id: primitive.id }] },
    children: [],
  };
  // #7b: depth0 루트는 항상 보존되므로 대상 프레임을 루트 아래에 둔다.
  const root = { type: 'FRAME', id: 'root', name: 'Frame 0', children: [frame] };
  const { changes } = await renameSelection([root], { apply: true, maxDepth: 3 });
  const after = new Map(changes.map((c) => [c.id, c.after]));
  // 원시 토큰은 신호 없음 → 색만 채운 빈 프레임 → swatch, 'color-121210'에서 벗어남
  assert.equal(after.get('f'), 'swatch');
  assert.notEqual(frame.name, 'color-121210');
});

test('renameSelection — swatch 규칙: 색만 채운 빈 프레임 → swatch, 이미지 → image, 빈 → container', async () => {
  installFigma();
  const swatch = { type: 'FRAME', id: 's', name: 'Frame 1', fills: [{ type: 'SOLID', visible: true }], children: [] };
  const imageFrame = { type: 'FRAME', id: 'im', name: 'Frame 2', fills: [{ type: 'IMAGE', visible: true }], children: [] };
  const emptyFrame = { type: 'FRAME', id: 'e', name: 'Frame 3', children: [] };
  // #7b: 대상들을 루트(보존) 아래에 둬 역할 추론을 depth≥1에서 검증.
  const root = { type: 'FRAME', id: 'root', name: 'Frame 0', children: [swatch, imageFrame, emptyFrame] };
  const { changes } = await renameSelection([root], { apply: true, maxDepth: 3 });
  const after = new Map(changes.map((c) => [c.id, c.after]));
  assert.equal(after.get('s'), 'swatch'); // 색만 채운 빈 프레임 → swatch
  assert.equal(after.get('im'), 'image'); // 이미지 채움 → image
  assert.equal(after.get('e'), 'container'); // 빈 프레임 → container(맥락 없이 plain)
});

test('renameSelection — 색이 있어도 자식이 있으면 스와치가 아니라 컨테이너', async () => {
  installFigma();
  const card = {
    type: 'FRAME', id: 'card', name: 'Frame 1',
    fills: [{ type: 'SOLID', visible: true }],
    children: [
      { type: 'VECTOR', id: 'ci', name: 'Vector 1' },
      { type: 'VECTOR', id: 'ci2', name: 'Vector 2' },
    ],
  };
  // #7b: card를 루트(보존) 아래에 둬 depth≥1에서 역할 추론 검증.
  const root = { type: 'FRAME', id: 'root', name: 'Frame 0', children: [card] };
  const { changes } = await renameSelection([root], { apply: true, maxDepth: 3 });
  const after = new Map(changes.map((c) => [c.id, c.after]));
  assert.equal(after.get('card'), 'container'); // 색+자식 다수, 라운드/그림자 없음 → container(plain)
  assert.equal(after.get('ci'), 'icon'); // 부모가 일반 container → 맥락 접두사 안 붙임
});

test('renameSelection — 기하 신호: 얇은 막대→divider, 이미지 타원→avatar', async () => {
  installFigma();
  const divider = { type: 'RECTANGLE', id: 'd', name: 'Rectangle 1', width: 200, height: 1, fills: [{ type: 'SOLID', visible: true }] };
  const avatar = { type: 'ELLIPSE', id: 'av', name: 'Ellipse 1', width: 40, height: 40, fills: [{ type: 'IMAGE', visible: true }] };
  const { changes } = await renameSelection([divider, avatar], { apply: true, maxDepth: 3 });
  const after = new Map(changes.map((c) => [c.id, c.after]));
  assert.equal(after.get('d'), 'divider');
  assert.equal(after.get('av'), 'avatar');
});

test('renameSelection — 멱등: 한 번 정돈한 이름은 재실행에도 불변', async () => {
  installFigma();
  const icon1 = { type: 'VECTOR', id: 'ic1', name: 'Vector 1' };
  const icon2 = { type: 'VECTOR', id: 'ic2', name: 'Vector 2' };
  const root = { type: 'FRAME', id: 'root', name: 'card', children: [icon1, icon2] };

  await renameSelection([root], { apply: true, maxDepth: 3 });
  assert.equal(icon1.name, 'card-icon');
  assert.equal(icon2.name, 'card-icon'); // 숫자 없이 형제 중복 허용
  // 2회차: 역할명은 기본명이 아니므로 보존 → 변경 0
  const { changes } = await renameSelection([root], { apply: true, maxDepth: 3 });
  assert.equal(changes.length, 0);
});

test('renameSelection — apply:false면 미리보기만(노드 이름 불변)', async () => {
  installFigma();
  const node = { type: 'FRAME', id: 'f', name: 'Frame 1', children: [] };
  // #7b: depth0 루트는 보존이므로 대상을 루트 아래에 둔다(루트는 변경에 안 잡힘).
  const root = { type: 'FRAME', id: 'root', name: 'Frame 0', children: [node] };
  const { changes, applied } = await renameSelection([root], { apply: false, maxDepth: 3 });
  assert.equal(applied, false);
  assert.equal(changes.length, 1);
  assert.equal(changes[0].after, 'container');
  assert.equal(node.name, 'Frame 1'); // 적용 안 함
});

/** pluginData를 기억하는 목 노드(리네임의 역할 기록 검증용). */
const withPluginData = (node) => {
  const store = new Map();
  node.setPluginData = (k, v) => store.set(k, v);
  node.getPluginData = (k) => store.get(k) ?? '';
  return node;
};

test('renameSelection — 판정한 역할을 pluginData(dsRole)로 기록', async () => {
  installFigma();
  const icon = withPluginData({ type: 'VECTOR', id: 'v', name: 'Vector 1', width: 24, height: 24 });
  const thumb = withPluginData({
    type: 'RECTANGLE', id: 'r', name: 'Rectangle 1', width: 64, height: 64,
    fills: [{ type: 'IMAGE', visible: true, imageHash: 'x' }],
  });
  const text = withPluginData({ type: 'TEXT', id: 't', name: '제목', characters: '제목' });
  // 표면+라운드+자식 2개↑ → 루트라도 고신뢰 card로 교체된다.
  const card = withPluginData({
    type: 'FRAME', id: 'c', name: 'Frame 1', width: 300, height: 200, layoutMode: 'VERTICAL',
    cornerRadius: 12, fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 }, visible: true }],
    children: [icon, thumb, text],
  });
  await renameSelection([card], { apply: true, maxDepth: 3 });

  assert.equal(card.getPluginData('dsRole'), 'card');
  assert.equal(icon.getPluginData('dsRole'), 'icon');
  assert.equal(thumb.getPluginData('dsRole'), 'thumbnail'); // card 맥락 → thumbnail
  assert.equal(text.getPluginData('dsRole'), ''); // TEXT는 제외 대상 → 기록 없음
  // 이름과 역할이 함께 남아야 등록이 말단 일치 검사를 통과한다.
  assert.equal(thumb.name, 'card-thumbnail');
});

test('renameSelection — apply:false면 역할도 기록하지 않는다(미리보기 무해)', async () => {
  installFigma();
  const icon = withPluginData({ type: 'VECTOR', id: 'v', name: 'Vector 1', width: 24, height: 24 });
  const root = { type: 'FRAME', id: 'root', name: 'Frame 0', children: [icon] };
  await renameSelection([root], { apply: false, maxDepth: 3 });
  assert.equal(icon.getPluginData('dsRole'), '');
});

test('writeRole — 같은 값이면 다시 쓰지 않고 false를 돌려준다', () => {
  installFigma();
  let writes = 0;
  const node = withPluginData({ type: 'FRAME', id: 'f', name: 'Card', width: 100, height: 40 });
  const raw = node.setPluginData;
  node.setPluginData = (k, v) => { writes++; return raw(k, v); };

  assert.equal(writeRole(node, 'card'), true); // 처음엔 쓴다
  assert.equal(writes, 1);
  // RENAME_APPLY는 이름이 그대로인 노드에도 역할을 남기므로(멱등), 재실행이면 같은 값이
  // 다시 온다. 그때마다 쓰면 3천 레이어 서브트리에 3천 번을 도로 쓰고, 이름 변경이 0이라
  // commitUndo도 안 걸려 그 쓰기가 다음 작업의 undo에 접혀 들어간다.
  assert.equal(writeRole(node, 'card'), false);
  assert.equal(writes, 1); // 늘지 않았다
  assert.equal(node.getPluginData('dsRole'), 'card');

  assert.equal(writeRole(node, 'icon'), true); // 값이 실제로 바뀌면 쓴다
  assert.equal(writes, 2);
  assert.equal(node.getPluginData('dsRole'), 'icon');

  // writeRoleFromName도 같은 판단을 물려받는다(내부에서 writeRole을 부른다).
  assert.equal(writeRoleFromName(node, 'header-icon'), false); // 이미 icon
  assert.equal(writes, 2);
});

test('writeRoleFromName — RENAME_APPLY 경로: 이름 말단 역할을 dsRole로 기록', () => {
  installFigma();
  const icon = withPluginData({ type: 'VECTOR', id: 'v', name: 'Vector 1', width: 24, height: 24 });
  writeRoleFromName(icon, 'header-icon');
  assert.equal(icon.getPluginData('dsRole'), 'icon');

  const thumb = withPluginData({ type: 'RECTANGLE', id: 'r', name: 'Rectangle 1', width: 64, height: 64 });
  writeRoleFromName(thumb, 'card-thumbnail');
  assert.equal(thumb.getPluginData('dsRole'), 'thumbnail');

  // 알려진 역할이 아니면 기록하지 않음(사람 이름 보존).
  const custom = withPluginData({ type: 'FRAME', id: 'f', name: 'Hero Banner', width: 100, height: 40 });
  writeRoleFromName(custom, 'Hero Banner');
  assert.equal(custom.getPluginData('dsRole'), '');
});

test('renameSelection — pluginData API가 없는 노드에서도 안전(기록 실패가 리네임을 막지 않음)', async () => {
  installFigma();
  const icon = { type: 'VECTOR', id: 'v', name: 'Vector 1', width: 24, height: 24 };
  const broken = {
    type: 'VECTOR', id: 'v2', name: 'Vector 2', width: 24, height: 24,
    setPluginData() { throw new Error('pluginData 실패'); },
  };
  const root = { type: 'FRAME', id: 'root', name: 'Frame 0', children: [icon, broken] };
  const { changes } = await renameSelection([root], { apply: true, maxDepth: 3 });
  assert.equal(changes.length, 2);
  assert.equal(icon.name, 'icon');
  assert.equal(broken.name, 'icon');
});

test('renameSelection — 영역 추론: 페이지 세로 스택의 첫=header, 마지막=footer', async () => {
  installFigma();
  const page = {
    type: 'FRAME', id: 'page', name: 'Frame 1', layoutMode: 'VERTICAL',
    children: [
      { type: 'FRAME', id: 'hd', name: 'Frame 2', children: [{ type: 'VECTOR', id: 'hi', name: 'Vector 1' }] },
      { type: 'FRAME', id: 'mid', name: 'Frame 3', children: [] },
      { type: 'FRAME', id: 'ft', name: 'Frame 4', children: [{ type: 'VECTOR', id: 'fi', name: 'Vector 2' }] },
    ],
  };
  const { changes } = await renameSelection([page], { apply: true, maxDepth: 3 });
  const after = new Map(changes.map((c) => [c.id, c.after]));
  assert.equal(after.get('hd'), 'header'); // 첫 자식
  assert.equal(after.get('ft'), 'footer'); // 마지막 자식
  assert.equal(after.get('mid'), 'main'); // 3분할 가운데 → main(HTML 랜드마크)
  assert.equal(after.get('hi'), 'header-icon'); // header 맥락 전파
  assert.equal(after.get('fi'), 'footer-icon');
});

test('renameSelection — 영역 추론: [header, 본문] 2분할에서 키 큰 블록은 footer가 아니라 main, 그 자식은 section/footer', async () => {
  installFigma();
  // Flightin QA 파일 형태: 1440x4970 페이지 = header 80px + 본문 4890px(섹션 4 + 진짜 푸터).
  const sec = (id, h) => ({ type: 'FRAME', id, name: `Frame ${id}`, layoutMode: 'VERTICAL', width: 1440, height: h,
    children: [{ type: 'VECTOR', id: `${id}-v`, name: 'Vector' }] });
  const body = {
    type: 'FRAME', id: 'body', name: 'Frame 9', layoutMode: 'VERTICAL', width: 1440, height: 4890,
    children: [sec('hero', 700), sec('s2', 900), sec('s3', 900), sec('s4', 900), sec('ft', 312)],
  };
  const page = {
    type: 'FRAME', id: 'page', name: 'Frame 1', layoutMode: 'VERTICAL', width: 1440, height: 4970,
    children: [
      { type: 'FRAME', id: 'hd', name: 'Frame 2', width: 1440, height: 80, children: [{ type: 'VECTOR', id: 'hi', name: 'Vector 1' }] },
      body,
    ],
  };
  const { changes } = await renameSelection([page], { apply: true, maxDepth: 4 });
  const after = new Map(changes.map((c) => [c.id, c.after]));
  assert.equal(after.get('hd'), 'header');
  assert.equal(after.get('body'), 'main'); // 페이지 높이 98% → footer 아님
  assert.equal(after.get('hero'), 'hero'); // 본문 첫 블록은 header가 아니라 hero
  assert.equal(after.get('s2'), 'section');
  assert.equal(after.get('ft'), 'footer'); // 본문 마지막 작은 블록 = 진짜 푸터
  assert.equal(after.get('ft-v'), 'footer-icon');
  assert.equal(after.get('hero-v'), 'hero-icon'); // hero는 역할 어휘라 맥락으로 번진다(section은 일반 구조어라 안 번짐)
});

test('renameSelection — 헤더 안 logo/nav/actions + 본문 첫 블록 hero (Flightin 헤더 형태)', async () => {
  installFigma();
  const txt = (id, ch) => ({ type: 'TEXT', id, name: ch, characters: ch, width: 50, height: 20 });
  const header = {
    type: 'FRAME', id: 'hd', name: 'Frame 2', layoutMode: 'VERTICAL', width: 1440, height: 80,
    children: [{
      type: 'FRAME', id: 'row', name: 'Frame 5', layoutMode: 'NONE', width: 1240, height: 20, // 자유 배치 행
      children: [
        { type: 'FRAME', id: 'logo', name: 'Frame 6', layoutMode: 'GRID', width: 20, height: 20,
          children: [{ type: 'ELLIPSE', id: 'dot', name: 'Ellipse 1', width: 4, height: 4 }] },
        { type: 'FRAME', id: 'nav', name: 'Frame 7', layoutMode: 'HORIZONTAL', width: 300, height: 20,
          children: [txt('n1', 'About'), txt('n2', 'Services'), txt('n3', 'Offers')] },
        // QA#1 불합격: header > row > container(H) > 첫 자식 — 깊은 중첩의 첫 자리는 logo가 아니다.
        { type: 'FRAME', id: 'util', name: 'Frame 10', layoutMode: 'HORIZONTAL', width: 200, height: 20,
          children: [
            { type: 'FRAME', id: 'sup', name: 'Frame 11', layoutMode: 'HORIZONTAL', width: 60, height: 20,
              children: [txt('s1', 'Support'), { type: 'VECTOR', id: 'sv', name: 'Vector 3', width: 8, height: 8 }] },
            { type: 'FRAME', id: 'lang', name: 'Frame 12', layoutMode: 'HORIZONTAL', width: 80, height: 20,
              children: [{ type: 'VECTOR', id: 'lv', name: 'Vector 4', width: 8, height: 8 }, txt('l1', 'Language')] },
          ] },
        { type: 'FRAME', id: 'act', name: 'Frame 8', layoutMode: 'HORIZONTAL', width: 144, height: 20,
          children: [txt('a1', 'Sign In'), txt('a2', 'Sign Up')] },
      ],
    }],
  };
  const sec = (id, h) => ({ type: 'FRAME', id, name: `Frame ${id}`, layoutMode: 'VERTICAL', width: 1440, height: h,
    children: [{ type: 'VECTOR', id: `${id}-v`, name: 'Vector' }] });
  const body = { type: 'FRAME', id: 'body', name: 'Frame 9', layoutMode: 'VERTICAL', width: 1440, height: 4890,
    children: [sec('hero', 700), sec('s2', 900), sec('ft', 312)] };
  const page = { type: 'FRAME', id: 'page', name: 'Frame 1', layoutMode: 'VERTICAL', width: 1440, height: 4970, children: [header, body] };
  const { changes } = await renameSelection([page], { apply: true, maxDepth: 5 });
  const after = new Map(changes.map((c) => [c.id, c.after]));
  assert.equal(after.get('hd'), 'header');
  assert.equal(after.get('logo'), 'header-logo'); // 헤더 첫 자리의 작은 묶음
  assert.equal(after.get('nav'), 'header-nav'); // 헤더 안이면 깊이 3이어도 nav
  assert.equal(after.get('act'), 'header-actions'); // 마지막 자리의 텍스트 2개
  // 중첩 컨테이너(ctxDepth 2)의 첫·끝 자리는 logo/actions가 아니라 일반 구조어로 남는다.
  for (const id of ['util', 'sup', 'lang']) {
    assert.ok(['container', 'wrapper'].includes(after.get(id)), `${id} → ${after.get(id)}`);
  }
  assert.equal(after.get('hero'), 'hero'); // 본문 첫 블록
  assert.equal(after.get('s2'), 'section');
  assert.equal(after.get('ft'), 'footer');
});

test('renameSelection — 버튼 추론: 오토레이아웃+라운드+채움+텍스트 → button', async () => {
  installFigma();
  const btn = {
    type: 'FRAME', id: 'btn', name: 'Frame 1', layoutMode: 'HORIZONTAL',
    cornerRadius: 8, height: 40, fills: [{ type: 'SOLID', visible: true }],
    children: [
      { type: 'TEXT', id: 'bt', name: 'Label', characters: '확인' },
      { type: 'VECTOR', id: 'bi', name: 'Vector 1' },
    ],
  };
  // #7b: btn을 루트(보존) 아래에 둬 depth≥1에서 버튼 추론 검증.
  const root = { type: 'FRAME', id: 'root', name: 'Frame 0', children: [btn] };
  const { changes } = await renameSelection([root], { apply: true, maxDepth: 3 });
  const after = new Map(changes.map((c) => [c.id, c.after]));
  assert.equal(after.get('btn'), 'button'); // 구조로 버튼 인식
  assert.equal(after.has('bt'), false); // 텍스트는 불변
  assert.equal(after.get('bi'), 'button-icon'); // button 맥락 전파
});

test('renameSelection — 카드: 표면+라운드+자식 2개↑ → card', async () => {
  installFigma();
  const card = {
    type: 'FRAME', id: 'card', name: 'Frame 1',
    cornerRadius: 12, fills: [{ type: 'SOLID', visible: true }],
    children: [
      { type: 'VECTOR', id: 'c1', name: 'Vector 1' },
      { type: 'TEXT', id: 'c2', name: 'Title', characters: 'x' },
    ],
  };
  const root = { type: 'FRAME', id: 'root', name: 'Frame 0', children: [card] };
  const { changes } = await renameSelection([root], { apply: true, maxDepth: 3 });
  const after = new Map(changes.map((c) => [c.id, c.after]));
  assert.equal(after.get('card'), 'card'); // 둥근 표면 + 자식 다수 → card(container 아님)
});

test('renameSelection — 선택 루트라도 고신뢰 시멘틱(card)이면 역할명으로 교체', async () => {
  installFigma();
  const card = {
    type: 'FRAME', id: 'card', name: 'Frame 1',
    cornerRadius: 12, fills: [{ type: 'SOLID', visible: true }],
    children: [
      { type: 'VECTOR', id: 'c1', name: 'Vector 1' },
      { type: 'TEXT', id: 'c2', name: 'Title', characters: 'x' },
    ],
  };
  // 카드 프레임을 직접 선택(depth 0) — 일반 컨테이너면 보존이지만 카드는 교체.
  const { changes } = await renameSelection([card], { apply: true, maxDepth: 3 });
  const after = new Map(changes.map((c) => [c.id, c.after]));
  assert.equal(after.get('card'), 'card'); // 루트여도 카드면 교체
  assert.equal(card.name, 'card');
  assert.equal(after.get('c1'), 'card-icon'); // 맥락 card 전파
});

test('renameSelection — 선택 루트가 일반 컨테이너면 보존(고신뢰 시멘틱 아님)', async () => {
  installFigma();
  const root = {
    type: 'FRAME', id: 'page', name: 'Desktop',
    children: [
      { type: 'VECTOR', id: 'v1', name: 'Vector 1' },
      { type: 'VECTOR', id: 'v2', name: 'Vector 2' },
    ],
  };
  // 라운드·그림자·오토레이아웃 없는 일반 프레임 → card/list 아님 → 루트 보존.
  const { changes } = await renameSelection([root], { apply: true, maxDepth: 3 });
  const after = new Map(changes.map((c) => [c.id, c.after]));
  assert.equal(after.has('page'), false); // 일반 루트는 그대로
  assert.equal(root.name, 'Desktop');
  assert.equal(after.get('v1'), 'desktop-icon'); // 보존된 루트 'Desktop'이 자식 맥락으로
});

test('renameSelection — HTML 랜드마크 nav: 가로 링크행(텍스트 3개↑) → nav', async () => {
  installFigma();
  const nav = {
    type: 'FRAME', id: 'nav', name: 'Frame 1', layoutMode: 'HORIZONTAL', height: 48,
    children: [
      { type: 'TEXT', id: 'l1', name: 'Label', characters: '홈' },
      { type: 'TEXT', id: 'l2', name: 'Label', characters: '소개' },
      { type: 'TEXT', id: 'l3', name: 'Label', characters: '연락' },
    ],
  };
  const root = { type: 'FRAME', id: 'root', name: 'Frame 0', children: [nav] };
  const { changes } = await renameSelection([root], { apply: true, maxDepth: 3 });
  const after = new Map(changes.map((c) => [c.id, c.after]));
  assert.equal(after.get('nav'), 'nav'); // 가로 링크행 → nav(버튼/리스트보다 우선)
});

test('renameSelection — HTML 랜드마크 main: 세로 3분할 가운데 → main', async () => {
  installFigma();
  const page = {
    type: 'FRAME', id: 'page', name: 'Frame 1', layoutMode: 'VERTICAL',
    children: [
      { type: 'FRAME', id: 'hd', name: 'Frame 2', children: [{ type: 'VECTOR', id: 'hi', name: 'Vector 1' }] },
      { type: 'FRAME', id: 'mn', name: 'Frame 3', children: [{ type: 'VECTOR', id: 'mi', name: 'Vector 2' }] },
      { type: 'FRAME', id: 'ft', name: 'Frame 4', children: [{ type: 'VECTOR', id: 'fi', name: 'Vector 3' }] },
    ],
  };
  const { changes } = await renameSelection([page], { apply: true, maxDepth: 3 });
  const after = new Map(changes.map((c) => [c.id, c.after]));
  assert.equal(after.get('hd'), 'header');
  assert.equal(after.get('mn'), 'main'); // 가운데
  assert.equal(after.get('ft'), 'footer');
  assert.equal(after.get('mi'), 'icon'); // main은 광역 랜드마크(GENERIC_ROLES) — 맥락 접두사로 안 씀
});

test('renameSelection — HTML 랜드마크 figure: 이미지+캡션 → figure(카드 크롬 없을 때)', async () => {
  installFigma();
  const figure = {
    type: 'FRAME', id: 'fig', name: 'Frame 1',
    children: [
      { type: 'RECTANGLE', id: 'im', name: 'Rectangle 1', width: 200, height: 120, fills: [{ type: 'IMAGE', visible: true }] },
      { type: 'TEXT', id: 'cap', name: 'Caption', characters: '설명' },
    ],
  };
  const root = { type: 'FRAME', id: 'root', name: 'Frame 0', children: [figure] };
  const { changes } = await renameSelection([root], { apply: true, maxDepth: 3 });
  const after = new Map(changes.map((c) => [c.id, c.after]));
  assert.equal(after.get('fig'), 'figure'); // 이미지+캡션 → figure
  assert.equal(after.get('im'), 'figure-image'); // 맥락 figure 전파
});

test('renameSelection — HTML 랜드마크 aside: 페이지 가로 스플릿의 좁은 컬럼 → aside', async () => {
  installFigma();
  const side = { type: 'FRAME', id: 'side', name: 'Frame 2', width: 200, height: 900, children: [{ type: 'VECTOR', id: 'si', name: 'Vector 1' }] };
  const body = { type: 'FRAME', id: 'body', name: 'Frame 3', width: 1240, height: 900, children: [{ type: 'VECTOR', id: 'bi', name: 'Vector 2' }] };
  // 페이지 크롬(≥768×800)이어야 aside 게이트를 통과한다.
  const page = { type: 'FRAME', id: 'page', name: 'Desktop', layoutMode: 'HORIZONTAL', width: 1440, height: 900, children: [side, body] };
  const { changes } = await renameSelection([page], { apply: true, maxDepth: 3 });
  const after = new Map(changes.map((c) => [c.id, c.after]));
  assert.equal(after.get('side'), 'desktop-aside'); // 부모 폭 대비 200/1440 ≈ 0.14 ≤ 0.35 → aside
  assert.notEqual(after.get('body'), 'desktop-aside'); // 넓은 쪽은 aside 아님
});

test('renameSelection — aside: 납작한 툴바의 작은 자식은 aside 아님', async () => {
  installFigma();
  // 페이지 스플릿이 아니라 가로 툴바 — 로고·액션이 사이드바로 표기되면 안 된다.
  const logo = { type: 'FRAME', id: 'logo', name: 'Frame 2', width: 120, height: 64, children: [{ type: 'VECTOR', id: 'li', name: 'Vector 1' }] };
  const actions = { type: 'FRAME', id: 'act', name: 'Frame 3', width: 160, height: 64, children: [{ type: 'VECTOR', id: 'ai', name: 'Vector 2' }] };
  const bar = { type: 'FRAME', id: 'bar', name: 'Top Bar', layoutMode: 'HORIZONTAL', width: 1440, height: 64, children: [logo, actions] };
  const { changes } = await renameSelection([bar], { apply: true, maxDepth: 3 });
  const after = new Map(changes.map((c) => [c.id, c.after]));
  assert.notEqual(after.get('logo'), 'bar-aside');
  assert.notEqual(after.get('act'), 'bar-aside');
});

test('renameSelection — HTML 랜드마크 section: 페이지 중간 블록(3개 초과) → section', async () => {
  installFigma();
  const mk = (id, vid) => ({ type: 'FRAME', id, name: id, children: [{ type: 'VECTOR', id: vid, name: 'Vector' }] });
  const page = {
    type: 'FRAME', id: 'page', name: 'Frame 1', layoutMode: 'VERTICAL',
    children: [mk('hd', 'v0'), mk('s1', 'v1'), mk('s2', 'v2'), mk('s3', 'v3'), mk('ft', 'v4')],
  };
  const { changes } = await renameSelection([page], { apply: true, maxDepth: 3 });
  const after = new Map(changes.map((c) => [c.id, c.after]));
  assert.equal(after.get('hd'), 'header');
  assert.equal(after.get('ft'), 'footer');
  assert.equal(after.get('s1'), 'section'); // total>3 → 가운데 블록은 section
  assert.equal(after.get('s2'), 'section');
  assert.equal(after.get('s3'), 'section');
});

test('renameSelection — HTML 시맨틱 article: 피드(리스트) 안의 카드형 항목 → article', async () => {
  installFigma();
  const card = (id) => ({
    type: 'FRAME', id, name: 'Frame X', width: 300, height: 120,
    cornerRadius: 8, fills: [{ type: 'SOLID', visible: true }],
    children: [
      { type: 'TEXT', id: id + 't', name: 'Title', characters: '제목' },
      { type: 'VECTOR', id: id + 'i', name: 'Vector' },
    ],
  });
  const feed = {
    type: 'FRAME', id: 'feed', name: 'Frame 1', layoutMode: 'VERTICAL',
    children: [card('a1'), card('a2'), card('a3')],
  };
  const { changes } = await renameSelection([feed], { apply: true, maxDepth: 3 });
  const after = new Map(changes.map((c) => [c.id, c.after]));
  assert.equal(after.get('feed'), 'list'); // 반복 카드 컨테이너 → list
  assert.equal(after.get('a1'), 'list-article'); // 리스트 안 카드형 → article(맥락 list), item/header 아님
  assert.equal(after.get('a2'), 'list-article');
});

test('renameSelection — 카드 크롬이 있으면 figure보다 card 우선', async () => {
  installFigma();
  const card = {
    type: 'FRAME', id: 'card', name: 'Frame 1',
    cornerRadius: 12, fills: [{ type: 'SOLID', visible: true }],
    children: [
      { type: 'RECTANGLE', id: 'im', name: 'Rectangle 1', width: 200, height: 120, fills: [{ type: 'IMAGE', visible: true }] },
      { type: 'TEXT', id: 'cap', name: 'Caption', characters: '설명' },
    ],
  };
  const root = { type: 'FRAME', id: 'root', name: 'Frame 0', children: [card] };
  const { changes } = await renameSelection([root], { apply: true, maxDepth: 3 });
  const after = new Map(changes.map((c) => [c.id, c.after]));
  assert.equal(after.get('card'), 'card'); // 라운드+채움 → card(figure 아님)
});

test('renameSelection — 칩: 작은 알약형 버튼 → chip', async () => {
  installFigma();
  const chip = {
    type: 'FRAME', id: 'chip', name: 'Frame 1', layoutMode: 'HORIZONTAL',
    cornerRadius: 12, width: 60, height: 24, fills: [{ type: 'SOLID', visible: true }],
    children: [{ type: 'TEXT', id: 'ct', name: 'Label', characters: '태그' }],
  };
  const root = { type: 'FRAME', id: 'root', name: 'Frame 0', children: [chip] };
  const { changes } = await renameSelection([root], { apply: true, maxDepth: 3 });
  const after = new Map(changes.map((c) => [c.id, c.after]));
  assert.equal(after.get('chip'), 'chip'); // 높이 24 + 알약형 → chip(button 아님)
});

test('renameSelection — 리스트: 오토레이아웃+유사 반복 자식 3개↑ → list, 자식 → item', async () => {
  installFigma();
  const mkRow = (id) => ({
    type: 'FRAME', id, name: 'Frame X', width: 300, height: 48,
    children: [{ type: 'TEXT', id: id + 't', name: 't', characters: 'x' }],
  });
  const list = {
    type: 'FRAME', id: 'list', name: 'Frame 1', layoutMode: 'VERTICAL',
    children: [mkRow('r1'), mkRow('r2'), mkRow('r3')],
  };
  const root = { type: 'FRAME', id: 'root', name: 'Frame 0', children: [list] };
  const { changes } = await renameSelection([root], { apply: true, maxDepth: 3 });
  const after = new Map(changes.map((c) => [c.id, c.after]));
  assert.equal(after.get('list'), 'list'); // 반복 아이템 컨테이너 → list
  assert.equal(after.get('r1'), 'list-item'); // 리스트 직속 컨테이너 자식 → item(맥락 list)
});

test('renameSelection — 일반 레이아웃은 plain 역할명으로 정리하되 맥락은 자식에게 통과(card-image)', async () => {
  installFigma();
  const img = { type: 'RECTANGLE', id: 'img', name: 'Rectangle 1', width: 100, height: 100, fills: [{ type: 'IMAGE', visible: true }] };
  const wrapper = { type: 'FRAME', id: 'wrap', name: 'Frame 8', children: [img] }; // 단일 자식 → wrapper 폴백
  const card = {
    type: 'FRAME', id: 'card', name: 'Frame 1',
    cornerRadius: 12, fills: [{ type: 'SOLID', visible: true }],
    children: [wrapper, { type: 'TEXT', id: 'tt', name: 'Title', characters: 'x' }],
  };
  const root = { type: 'FRAME', id: 'root', name: 'Frame 0', children: [card] };
  const { changes } = await renameSelection([root], { apply: true, maxDepth: 3 });
  const after = new Map(changes.map((c) => [c.id, c.after]));
  assert.equal(after.get('card'), 'card'); // 카드는 정규화
  assert.equal(after.get('wrap'), 'wrapper'); // 'Frame 8' → 맥락 없는 plain wrapper
  assert.equal(after.get('img'), 'card-image'); // 맥락(card)이 wrapper를 통과해 손주에 전파
});

test('renameSelection — 필드: 세로 스택 라벨+입력박스 → field', async () => {
  installFigma();
  const field = {
    type: 'FRAME', id: 'field', name: 'Frame 1', layoutMode: 'VERTICAL',
    children: [
      { type: 'TEXT', id: 'lb', name: 'Label', characters: '이메일' },
      { type: 'RECTANGLE', id: 'box', name: 'Rectangle 1', width: 240, height: 40, strokes: [{ type: 'SOLID', visible: true }] },
    ],
  };
  const root = { type: 'FRAME', id: 'root', name: 'Frame 0', children: [field] };
  const { changes } = await renameSelection([root], { apply: true, maxDepth: 3 });
  const after = new Map(changes.map((c) => [c.id, c.after]));
  assert.equal(after.get('field'), 'field'); // 라벨+입력박스 세로 스택 → field
});

test('renameSelection — 스냅샷 토큰 베낌(line-height-150-percent-px)도 교체', async () => {
  installFigma();
  const frame = { type: 'FRAME', id: 'f', name: 'line-height-150-percent-px', children: [] };
  // #7b: depth0 루트는 보존이므로 대상을 루트 아래에 둔다.
  const root = { type: 'FRAME', id: 'root', name: 'Frame 0', children: [frame] };
  const { changes } = await renameSelection([root], { apply: true, maxDepth: 3 });
  const after = new Map(changes.map((c) => [c.id, c.after]));
  assert.equal(after.get('f'), 'container'); // percent-px echo → 그대로 두지 않고 container로 정리
  assert.notEqual(frame.name, 'line-height-150-percent-px');
});

test('renameSelection(#7b) — 선택 루트 컨테이너는 기본명이어도 보존, 자식은 정돈(맥락 누수 없음)', async () => {
  installFigma();
  const icon = { type: 'VECTOR', id: 'ic', name: 'Vector 1' };
  const root = { type: 'FRAME', id: 'root', name: 'Frame 1', children: [icon] }; // 기본명 루트
  const { changes } = await renameSelection([root], { apply: true, maxDepth: 3 });
  const after = new Map(changes.map((c) => [c.id, c.after]));
  assert.equal(after.has('root'), false); // depth0 루트는 기본명이어도 보존
  assert.equal(root.name, 'Frame 1');
  assert.equal(after.get('ic'), 'icon'); // 'Frame 1' 맥락이 'frame-icon'으로 새지 않음
});

test('renameSelection(#7b) — 인스턴스 서브트리는 통째 스킵(자식 미순회)', async () => {
  installFigma();
  const innerIcon = { type: 'VECTOR', id: 'inner', name: 'Vector 1' }; // 인스턴스 내부 → 불변
  const inst = { type: 'INSTANCE', id: 'inst', name: 'Button', children: [innerIcon] };
  const looseIcon = { type: 'VECTOR', id: 'loose', name: 'Vector 2' };
  const root = { type: 'FRAME', id: 'root', name: 'card', children: [inst, looseIcon] }; // 의미명 루트

  const { changes, nodes } = await renameSelection([root], { apply: true, maxDepth: 3 });
  const ids = new Set(changes.map((c) => c.id));
  assert.equal(ids.has('inner'), false); // 인스턴스 내부 미변경
  assert.equal(innerIcon.name, 'Vector 1');
  assert.equal(ids.has('loose'), true); // 인스턴스 밖은 정돈(card-icon)
  // 트리(nodes)에도 인스턴스 자식은 포함되지 않음(순회 중단), 인스턴스 자신은 맥락으로 표시
  assert.equal(nodes.some((n) => n.id === 'inner'), false);
  assert.equal(nodes.some((n) => n.id === 'inst'), true);
});

test('renameSelection — 입력: field 맥락의 입력 상자 → input', async () => {
  installFigma();
  const field = {
    type: 'FRAME', id: 'field', name: 'Frame 1', layoutMode: 'VERTICAL',
    children: [
      { type: 'TEXT', id: 'lb', name: 'Label', characters: '이메일' },
      { type: 'RECTANGLE', id: 'box', name: 'Rectangle 1', width: 240, height: 40, strokes: [{ type: 'SOLID', visible: true }] },
    ],
  };
  const root = { type: 'FRAME', id: 'root', name: 'Frame 0', children: [field] };
  const { changes } = await renameSelection([root], { apply: true, maxDepth: 3 });
  const after = new Map(changes.map((c) => [c.id, c.after]));
  assert.equal(after.get('field'), 'field');
  assert.equal(after.get('box'), 'field-input'); // 예전엔 border로 떨어지던 자리
});

test('renameSelection — 입력: 맥락 없는 테두리형 상자는 button 유지(아웃라인 버튼 보호)', async () => {
  installFigma();
  // 채움 없는 넓은 테두리 상자는 텍스트 입력과 아웃라인 버튼이 구조적으로 같다.
  // field 맥락이 없으면 button으로 둔다 — 세컨더리 버튼이 전부 input이 되는 쪽이 훨씬 나쁘다.
  const cancel = {
    type: 'FRAME', id: 'cancel', name: 'Frame 1', layoutMode: 'HORIZONTAL',
    cornerRadius: 24, width: 320, height: 48,
    strokes: [{ type: 'SOLID', visible: true }], // 채움 없이 외곽선만
    children: [{ type: 'TEXT', id: 'ct', name: 'Label', characters: '취소' }],
  };
  const root = { type: 'FRAME', id: 'root', name: 'Frame 0', children: [cancel] };
  const { changes } = await renameSelection([root], { apply: true, maxDepth: 3 });
  const after = new Map(changes.map((c) => [c.id, c.after]));
  assert.equal(after.get('cancel'), 'button');
});

test('renameSelection — 입력: 채움이 있으면 여전히 button(오검출 방지)', async () => {
  installFigma();
  const btn = {
    type: 'FRAME', id: 'btn', name: 'Frame 1', layoutMode: 'HORIZONTAL',
    cornerRadius: 6, width: 280, height: 44,
    fills: [{ type: 'SOLID', visible: true }],
    strokes: [{ type: 'SOLID', visible: true }],
    children: [{ type: 'TEXT', id: 't', name: 'Label', characters: '전송' }],
  };
  const root = { type: 'FRAME', id: 'root', name: 'Frame 0', children: [btn] };
  const { changes } = await renameSelection([root], { apply: true, maxDepth: 3 });
  const after = new Map(changes.map((c) => [c.id, c.after]));
  assert.equal(after.get('btn'), 'button');
});

test('renameSelection — 썸네일: 카드 맥락의 작은 이미지 → thumbnail, 큰 이미지는 image', async () => {
  installFigma();
  const mkCard = (id, imgId, w, h) => ({
    type: 'FRAME', id, name: 'Frame X', width: 320, height: 400,
    cornerRadius: 12, fills: [{ type: 'SOLID', visible: true }],
    children: [
      { type: 'RECTANGLE', id: imgId, name: 'Rectangle 1', width: w, height: h, fills: [{ type: 'IMAGE', visible: true }] },
      { type: 'TEXT', id: id + 't', name: 'Title', characters: '제목' },
    ],
  });
  const root = {
    type: 'FRAME', id: 'root', name: 'Frame 0',
    children: [mkCard('c1', 'small', 64, 64), mkCard('c2', 'big', 320, 240)],
  };
  const { changes } = await renameSelection([root], { apply: true, maxDepth: 3 });
  const after = new Map(changes.map((c) => [c.id, c.after]));
  assert.equal(after.get('small'), 'card-thumbnail'); // 64px 미리보기
  assert.equal(after.get('big'), 'card-image'); // 카드 폭을 채우는 전면 이미지는 image
});

test('renameSelection — 썸네일: 카드 맥락이 아니면 image 유지', async () => {
  installFigma();
  const img = { type: 'RECTANGLE', id: 'img', name: 'Rectangle 1', width: 64, height: 64, fills: [{ type: 'IMAGE', visible: true }] };
  const root = { type: 'FRAME', id: 'root', name: 'Desktop', children: [img] };
  const { changes } = await renameSelection([root], { apply: true, maxDepth: 3 });
  const after = new Map(changes.map((c) => [c.id, c.after]));
  assert.equal(after.get('img'), 'desktop-image'); // 카드/항목 맥락 없음 → thumbnail 아님
});

test('renameSelection — 오버레이/모달: 풀블리드 반투명 → overlay, 그 위 패널 → modal', async () => {
  installFigma();
  const scrim = {
    type: 'RECTANGLE', id: 'scrim', name: 'Rectangle 1', width: 1440, height: 900,
    fills: [{ type: 'SOLID', visible: true, opacity: 0.5 }],
  };
  const panel = {
    type: 'FRAME', id: 'panel', name: 'Frame 2', width: 480, height: 320,
    cornerRadius: 16, fills: [{ type: 'SOLID', visible: true }],
    children: [
      { type: 'TEXT', id: 'pt', name: 'Title', characters: '확인' },
      { type: 'VECTOR', id: 'pi', name: 'Vector 1' },
    ],
  };
  const page = { type: 'FRAME', id: 'page', name: 'Desktop', width: 1440, height: 900, children: [scrim, panel] };
  const { changes } = await renameSelection([page], { apply: true, maxDepth: 3 });
  const after = new Map(changes.map((c) => [c.id, c.after]));
  assert.equal(after.get('scrim'), 'desktop-overlay'); // 부모를 덮는 반투명 면
  assert.equal(after.get('panel'), 'desktop-modal'); // 오버레이 뒤 컨테이너 → card 아님
});

test('renameSelection — 모달: 배경막 뒤라도 전폭 header는 modal 아님', async () => {
  installFigma();
  const scrim = {
    type: 'RECTANGLE', id: 'scrim', name: 'Rectangle 1', width: 1440, height: 900,
    fills: [{ type: 'SOLID', visible: true, opacity: 0.5 }],
  };
  const header = {
    type: 'FRAME', id: 'hd', name: 'Frame 2', width: 1440, height: 72,
    fills: [{ type: 'SOLID', visible: true }],
    children: [{ type: 'VECTOR', id: 'hi', name: 'Vector 1' }],
  };
  const panel = {
    type: 'FRAME', id: 'panel', name: 'Frame 3', width: 480, height: 320,
    cornerRadius: 16, fills: [{ type: 'SOLID', visible: true }],
    children: [{ type: 'VECTOR', id: 'pi', name: 'Vector 2' }],
  };
  const page = { type: 'FRAME', id: 'page', name: 'Desktop', width: 1440, height: 900, children: [scrim, header, panel] };
  const { changes } = await renameSelection([page], { apply: true, maxDepth: 3 });
  const after = new Map(changes.map((c) => [c.id, c.after]));
  assert.equal(after.get('scrim'), 'desktop-overlay');
  assert.equal(after.get('panel'), 'desktop-modal'); // 인셋 패널만 modal
  assert.notEqual(after.get('hd'), 'desktop-modal'); // 전폭이라 패널 아님
});

test('renameSelection — 오버레이: 패널 없는 반투명 배경은 overlay 아님', async () => {
  installFigma();
  // 장식용 틴트 워시 — 위에 얹힌 패널이 없으면 배경막으로 보지 않는다.
  const wash = {
    type: 'RECTANGLE', id: 'wash', name: 'Rectangle 1', width: 1440, height: 900,
    fills: [{ type: 'SOLID', visible: true, opacity: 0.6 }],
  };
  const hero = {
    type: 'FRAME', id: 'hero', name: 'Frame 2', width: 1200, height: 700,
    fills: [{ type: 'SOLID', visible: true }],
    children: [{ type: 'VECTOR', id: 'hv', name: 'Vector 1' }],
  };
  const page = { type: 'FRAME', id: 'page', name: 'Desktop', width: 1440, height: 900, children: [wash] };
  const { changes } = await renameSelection([page], { apply: true, maxDepth: 3 });
  assert.equal(new Map(changes.map((c) => [c.id, c.after])).get('wash'), 'desktop-background');
  // 그라데이션 워시는 패널이 뒤따라도 배경막이 아니다(단색 스크림만 인정).
  const gradPage = {
    type: 'FRAME', id: 'gp', name: 'Desktop', width: 1440, height: 900,
    children: [{ ...wash, id: 'grad', fills: [{ type: 'GRADIENT_LINEAR', visible: true, opacity: 0.6 }] }, hero],
  };
  const r2 = await renameSelection([gradPage], { apply: true, maxDepth: 3 });
  const after2 = new Map(r2.changes.map((c) => [c.id, c.after]));
  assert.notEqual(after2.get('grad'), 'desktop-overlay');
  assert.notEqual(after2.get('hero'), 'desktop-modal');
});

test('renameSelection — 오버레이: 불투명한 풀블리드 면은 overlay 아님', async () => {
  installFigma();
  const bg = {
    type: 'RECTANGLE', id: 'bg', name: 'Rectangle 1', width: 1440, height: 900,
    fills: [{ type: 'SOLID', visible: true }], // 반투명 아님
  };
  const page = { type: 'FRAME', id: 'page', name: 'Desktop', width: 1440, height: 900, children: [bg] };
  const { changes } = await renameSelection([page], { apply: true, maxDepth: 3 });
  const after = new Map(changes.map((c) => [c.id, c.after]));
  assert.equal(after.get('bg'), 'desktop-background');
});

test('renameSelection — 프로그레스: 알약형 트랙 + 채움 바 → progress / indicator', async () => {
  installFigma();
  const bar = {
    type: 'FRAME', id: 'bar', name: 'Frame 1', width: 200, height: 8, cornerRadius: 4,
    fills: [{ type: 'SOLID', visible: true }],
    children: [
      { type: 'RECTANGLE', id: 'fillbar', name: 'Rectangle 1', width: 120, height: 8, fills: [{ type: 'SOLID', visible: true }] },
    ],
  };
  const root = { type: 'FRAME', id: 'root', name: 'Frame 0', children: [bar] };
  const { changes } = await renameSelection([root], { apply: true, maxDepth: 3 });
  const after = new Map(changes.map((c) => [c.id, c.after]));
  assert.equal(after.get('bar'), 'progress'); // card/wrapper 아님
  assert.equal(after.get('fillbar'), 'progress-indicator'); // 얇은 막대지만 divider 아님
});

test("renameSelection — 프로그레스: 'Progress' 이름의 섹션 아래 아무 색 자식이나 indicator가 되진 않음", async () => {
  installFigma();
  // 맥락만으로 indicator를 인정하면 여기 큰 사각형이 indicator가 된다 — 형태 조건으로 막는다.
  const box = { type: 'RECTANGLE', id: 'box', name: 'Rectangle 1', width: 200, height: 200, fills: [{ type: 'SOLID', visible: true }] };
  const root = { type: 'FRAME', id: 'root', name: 'Progress', children: [box] };
  const { changes } = await renameSelection([root], { apply: true, maxDepth: 3 });
  const after = new Map(changes.map((c) => [c.id, c.after]));
  assert.equal(after.get('box'), 'progress-background'); // indicator 아님
});

test('renameSelection — 상태: 아바타 곁 작은 원 → status', async () => {
  installFigma();
  const avatar = { type: 'ELLIPSE', id: 'av', name: 'Ellipse 1', width: 40, height: 40, fills: [{ type: 'IMAGE', visible: true }] };
  const dot = { type: 'ELLIPSE', id: 'dot', name: 'Ellipse 2', width: 10, height: 10, fills: [{ type: 'SOLID', visible: true }] };
  const root = { type: 'FRAME', id: 'root', name: 'Frame 0', children: [avatar, dot] };
  const { changes } = await renameSelection([root], { apply: true, maxDepth: 3 });
  const after = new Map(changes.map((c) => [c.id, c.after]));
  assert.equal(after.get('av'), 'avatar');
  assert.equal(after.get('dot'), 'status'); // 아바타 형제 없으면 background로 떨어질 자리
});

test('renameSelection — 상태: 아바타 형제가 없으면 status 아님', async () => {
  installFigma();
  const dot = { type: 'ELLIPSE', id: 'dot', name: 'Ellipse 1', width: 10, height: 10, fills: [{ type: 'SOLID', visible: true }] };
  const root = { type: 'FRAME', id: 'root', name: 'Frame 0', children: [dot] };
  const { changes } = await renameSelection([root], { apply: true, maxDepth: 3 });
  const after = new Map(changes.map((c) => [c.id, c.after]));
  assert.equal(after.get('dot'), 'background');
});

/* ---- 리뷰 회귀: 순회 범위 · 검출기 게이팅 (실제 치수를 가진 픽스처) ---- */

test('renameSelection — 메인 컴포넌트·컴포넌트 세트·잠긴 서브트리는 통째로 건드리지 않음', async () => {
  installFigma();
  const inner = { type: 'VECTOR', id: 'ci', name: 'LeadingIcon' };
  const comp = { type: 'COMPONENT', id: 'comp', name: 'Button/Primary', children: [inner] };
  const setKid = { type: 'VECTOR', id: 'csi', name: 'Vector 2' };
  const set = { type: 'COMPONENT_SET', id: 'set', name: 'Button', children: [setKid] };
  const lockedKid = { type: 'VECTOR', id: 'lk', name: 'Vector 1' };
  const locked = { type: 'FRAME', id: 'lock', name: 'Locked Group', locked: true, children: [lockedKid] };
  const root = { type: 'FRAME', id: 'root', name: 'card', children: [comp, set, locked] };
  const { changes, nodes } = await renameSelection([root], { apply: true, maxDepth: 3 });
  const ids = new Set(changes.map((c) => c.id));
  assert.equal(ids.has('ci'), false); // 메인 컴포넌트 내부 → 모든 인스턴스에 전파되므로 불가침
  assert.equal(inner.name, 'LeadingIcon');
  assert.equal(ids.has('csi'), false);
  assert.equal(setKid.name, 'Vector 2');
  assert.equal(ids.has('lk'), false);
  assert.equal(lockedKid.name, 'Vector 1');
  assert.equal(nodes.some((n) => n.id === 'ci'), false); // 순회 자체를 하지 않음
  assert.equal(nodes.some((n) => n.id === 'csi'), false);
  assert.equal(nodes.some((n) => n.id === 'lk'), false);
});

test('renameSelection — 페이지 섹션 스택은 list가 아니라 랜드마크로', async () => {
  installFigma();
  const mk = (id, h) => ({
    type: 'FRAME', id, name: `Frame ${id}`, width: 1440, height: h,
    children: [{ type: 'VECTOR', id: id + 'v', name: 'Vector' }],
  });
  const page = {
    type: 'FRAME', id: 'page', name: 'Desktop', width: 1440, height: 3400, layoutMode: 'VERTICAL',
    children: [mk('s1', 600), mk('s2', 700), mk('s3', 800), mk('s4', 650), mk('s5', 650)],
  };
  const { changes } = await renameSelection([page], { apply: true, maxDepth: 3 });
  const after = new Map(changes.map((c) => [c.id, c.after]));
  assert.equal(after.has('page'), false); // 선택 루트 이름 보존(list로 덮이지 않음)
  assert.equal(after.get('s1'), 'desktop-header'); // 보존된 루트가 맥락으로
  assert.equal(after.get('s5'), 'desktop-footer');
  assert.equal(after.get('s2'), 'desktop-section');
});

test('renameSelection — depth 1의 카드가 header/footer로 덮이지 않음', async () => {
  installFigma();
  const mkCard = (id, h) => ({
    type: 'FRAME', id, name: `Frame ${id}`, width: 360, height: h,
    cornerRadius: 12, fills: [{ type: 'SOLID', visible: true }],
    children: [
      { type: 'TEXT', id: id + 't', name: 'Title', characters: 'x' },
      { type: 'VECTOR', id: id + 'v', name: 'Vector' },
    ],
  });
  const dash = {
    type: 'FRAME', id: 'dash', name: 'Dashboard', layoutMode: 'VERTICAL', width: 360, height: 460,
    children: [mkCard('c1', 120), mkCard('c2', 300)],
  };
  const { changes } = await renameSelection([dash], { apply: true, maxDepth: 3 });
  const after = new Map(changes.map((c) => [c.id, c.after]));
  assert.equal(after.get('c1'), 'dashboard-card'); // 첫 자식이지만 header 아님
  assert.equal(after.get('c2'), 'dashboard-card'); // 마지막 자식이지만 footer 아님
});

test('renameSelection — 넓은 커버 이미지가 있어도 카드는 field가 아니라 card', async () => {
  installFigma();
  const card = {
    type: 'FRAME', id: 'card', name: 'Product Card', layoutMode: 'VERTICAL', width: 320, height: 400,
    cornerRadius: 12, fills: [{ type: 'SOLID', visible: true }],
    children: [
      { type: 'TEXT', id: 'tt', name: 'Title', characters: '제품' },
      { type: 'RECTANGLE', id: 'cover', name: 'Rectangle 1', width: 320, height: 160, fills: [{ type: 'IMAGE', visible: true }] },
    ],
  };
  const { changes } = await renameSelection([card], { apply: true, maxDepth: 3 });
  const after = new Map(changes.map((c) => [c.id, c.after]));
  assert.equal(after.get('card'), 'card'); // 2:1 커버 사진이 입력 상자로 오인되지 않음
  assert.equal(after.get('cover'), 'card-image'); // 전면 커버 → image(thumbnail 아님)
});

test('renameSelection — 반복 필드 3개인 폼도 field/input 사슬 유지', async () => {
  installFigma();
  const mkField = (id) => ({
    type: 'FRAME', id, name: `Field ${id}`, layoutMode: 'VERTICAL', width: 400, height: 70,
    children: [
      { type: 'TEXT', id: id + 'l', name: 'Label', characters: '라벨' },
      { type: 'RECTANGLE', id: id + 'i', name: 'Rectangle', width: 400, height: 44, strokes: [{ type: 'SOLID', visible: true }] },
    ],
  });
  const form = {
    type: 'FRAME', id: 'form', name: 'Signup Form', layoutMode: 'VERTICAL', width: 400, height: 240,
    children: [mkField('f1'), mkField('f2'), mkField('f3')],
  };
  const { changes } = await renameSelection([form], { apply: true, maxDepth: 3 });
  const after = new Map(changes.map((c) => [c.id, c.after]));
  assert.ok(after.get('f1').endsWith('field'), `field여야 하는데 ${after.get('f1')}`); // item 아님
  assert.equal(after.get('f1i'), 'field-input'); // border 아님
});

test('renameSelection — 숨긴 힌트·에러 줄이 있어도 field 유지', async () => {
  installFigma();
  const field = {
    type: 'FRAME', id: 'field', name: 'Email Field', layoutMode: 'VERTICAL', width: 240, height: 70,
    children: [
      { type: 'TEXT', id: 'lb', name: 'Label', characters: '이메일' },
      { type: 'RECTANGLE', id: 'box', name: 'Rectangle 1', width: 240, height: 40, strokes: [{ type: 'SOLID', visible: true }] },
      { type: 'TEXT', id: 'hint', name: 'Hint', characters: '힌트' },
      { type: 'TEXT', id: 'err', name: 'Error', characters: '에러', visible: false },
    ],
  };
  const root = { type: 'FRAME', id: 'root', name: 'Frame 0', children: [field] };
  const { changes } = await renameSelection([root], { apply: true, maxDepth: 3 });
  const after = new Map(changes.map((c) => [c.id, c.after]));
  assert.equal(after.get('field'), 'field');
  assert.equal(after.get('box'), 'field-input');
});

test('renameSelection — 랜드마크 슬롯은 숨김·TEXT 형제를 세지 않음', async () => {
  installFigma();
  const mk = (id) => ({
    type: 'FRAME', id, name: `Frame ${id}`, width: 1000, height: 200,
    children: [{ type: 'VECTOR', id: id + 'v', name: 'Vector' }],
  });
  const ghost = { type: 'FRAME', id: 'ghost', name: 'Frame G', visible: false, width: 1000, height: 10, children: [] };
  const page = {
    type: 'FRAME', id: 'page', name: 'Desktop', width: 1000, height: 900, layoutMode: 'VERTICAL',
    children: [ghost, mk('hd'), mk('mn'), mk('ft'), { type: 'TEXT', id: 'cp', name: 'c', characters: '© 2026' }],
  };
  const { changes } = await renameSelection([page], { apply: true, maxDepth: 3 });
  const after = new Map(changes.map((c) => [c.id, c.after]));
  assert.equal(after.get('hd'), 'desktop-header'); // 유령 프레임이 header 자리를 뺏지 않음
  assert.equal(after.get('mn'), 'desktop-main');
  assert.equal(after.get('ft'), 'desktop-footer'); // 뒤의 TEXT가 footer 자리를 삼키지 않음
});

test('renameSelection — 히어로 섹션 안에는 header/footer 랜드마크가 생기지 않음', async () => {
  installFigma();
  // depth는 선택 기준 상대값이라, 게이트가 없으면 Hero를 선택하는 순간 그 자식들이
  // 전부 depth 1 = 페이지 랜드마크 자리로 취급돼 마지막 자식이 hero-footer가 된다.
  const txt = (id, s) => ({ type: 'TEXT', id, name: 'Text', characters: s });
  const block = (id, h) => ({ type: 'FRAME', id, name: `Frame ${id}`, width: 1200, height: h, children: [txt(id + 't', '내용')] });
  const hero = {
    type: 'FRAME', id: 'hero', name: 'Hero', layoutMode: 'VERTICAL', width: 1200, height: 700,
    children: [block('b1', 120), block('b2', 300), block('b3', 80)],
  };
  const { changes } = await renameSelection([hero], { apply: true, maxDepth: 3 });
  const after = new Map(changes.map((c) => [c.id, c.after]));
  for (const id of ['b1', 'b2', 'b3']) {
    const name = after.get(id);
    assert.ok(
      !/-(header|footer|main|section)$/.test(name ?? ''),
      `히어로 자식 ${id}가 랜드마크(${name})가 됐다`,
    );
  }
});

test('renameSelection — 페이지는 이름이 역할 어휘가 아니고 화면 크기일 때만 랜드마크', async () => {
  installFigma();
  const block = (id, h) => ({
    type: 'FRAME', id, name: `Frame ${id}`, width: 1440, height: h,
    children: [{ type: 'VECTOR', id: id + 'v', name: 'Vector' }],
  });
  // 'Desktop'은 역할 어휘가 아니고 1440x2400은 페이지 크롬 → 랜드마크 인정.
  const page = {
    type: 'FRAME', id: 'page', name: 'Desktop', layoutMode: 'VERTICAL', width: 1440, height: 2400,
    children: [block('h', 80), block('m', 2000), block('f', 320)],
  };
  const { changes } = await renameSelection([page], { apply: true, maxDepth: 3 });
  const after = new Map(changes.map((c) => [c.id, c.after]));
  assert.equal(after.get('h'), 'desktop-header');
  assert.equal(after.get('m'), 'desktop-main');
  assert.equal(after.get('f'), 'desktop-footer');
});

test('renameSelection — 카드 가로 스플릿의 좁은 열은 aside 아님', async () => {
  installFigma();
  const side = { type: 'FRAME', id: 'side', name: 'Frame S', width: 200, height: 500, children: [{ type: 'VECTOR', id: 'sv', name: 'Vector' }] };
  const body = { type: 'FRAME', id: 'body', name: 'Frame B', width: 760, height: 500, children: [{ type: 'VECTOR', id: 'bv', name: 'Vector' }] };
  const card = {
    type: 'FRAME', id: 'card', name: 'Card', layoutMode: 'HORIZONTAL', width: 1000, height: 500,
    children: [side, body],
  };
  const { changes } = await renameSelection([card], { apply: true, maxDepth: 3 });
  const after = new Map(changes.map((c) => [c.id, c.after]));
  assert.notEqual(after.get('side'), 'card-aside');
  assert.ok(!/aside$/.test(after.get('side') ?? ''), `카드 자식이 aside(${after.get('side')})가 됐다`);
});

test('renameSelection — 시트·드로어·무명 좁은 패널에는 header/footer가 생기지 않음', async () => {
  installFigma();
  const block = (id, h, w) => ({
    type: 'FRAME', id, name: `Frame ${id}`, width: w, height: h,
    children: [{ type: 'VECTOR', id: id + 'v', name: 'Vector' }],
  });
  for (const name of ['Sheet', 'Drawer', 'Dialog', 'Popup']) {
    const root = {
      type: 'FRAME', id: 'r', name, layoutMode: 'VERTICAL', width: 400, height: 640,
      children: [block('t', 64, 400), block('b', 520, 400), block('f', 56, 400)],
    };
    const { changes } = await renameSelection([root], { apply: true, maxDepth: 3 });
    const after = new Map(changes.map((c) => [c.id, c.after]));
    for (const id of ['t', 'b', 'f']) {
      assert.ok(
        !/-(header|footer|main|section)$/.test(after.get(id) ?? ''),
        `${name} 자식 ${id}가 랜드마크(${after.get(id)})가 됐다`,
      );
    }
  }
  // 이름 없는 좁은 세로 패널도 형태 게이트로 막는다.
  const anon = {
    type: 'FRAME', id: 'r', name: 'Frame 9', layoutMode: 'VERTICAL', width: 400, height: 640,
    children: [block('t', 64, 400), block('b', 520, 400), block('f', 56, 400)],
  };
  const { changes } = await renameSelection([anon], { apply: true, maxDepth: 3 });
  const after = new Map(changes.map((c) => [c.id, c.after]));
  for (const id of ['t', 'b', 'f']) {
    assert.ok(!/-(header|footer|main|section)$/.test(after.get(id) ?? ''), `좁은 패널 자식 ${id}→${after.get(id)}`);
  }
});

test('renameSelection — 모바일 Home 화면은 세로 랜드마크 유지', async () => {
  installFigma();
  const block = (id, h) => ({
    type: 'FRAME', id, name: `Frame ${id}`, width: 390, height: h,
    children: [{ type: 'VECTOR', id: id + 'v', name: 'Vector' }],
  });
  const home = {
    type: 'FRAME', id: 'home', name: 'Home', layoutMode: 'VERTICAL', width: 390, height: 844,
    children: [block('h', 64), block('m', 700), block('f', 80)],
  };
  const { changes } = await renameSelection([home], { apply: true, maxDepth: 3 });
  const after = new Map(changes.map((c) => [c.id, c.after]));
  assert.equal(after.get('h'), 'home-header');
  assert.equal(after.get('m'), 'home-main');
  assert.equal(after.get('f'), 'home-footer');
});

test('renameSelection — 카드 안 통계 행은 nav가 아님', async () => {
  installFigma();
  const col = (id, t) => ({
    type: 'FRAME', id, name: `Frame ${id}`, width: 80, height: 48,
    children: [{ type: 'TEXT', id: id + 't', name: 'n', characters: t }],
  });
  const row = {
    type: 'FRAME', id: 'row', name: 'Frame R', layoutMode: 'HORIZONTAL', width: 300, height: 48,
    children: [col('a', '12'), col('b', '34'), col('c', '56')],
  };
  const card = {
    type: 'FRAME', id: 'card', name: 'Frame C', width: 320, height: 200, cornerRadius: 12,
    fills: [{ type: 'SOLID', visible: true }],
    children: [row, { type: 'TEXT', id: 'ct', name: 'Title', characters: 'x' }],
  };
  const root = { type: 'FRAME', id: 'root', name: 'Desktop', width: 1440, height: 900, children: [card] };
  const { changes } = await renameSelection([root], { apply: true, maxDepth: 3 });
  const after = new Map(changes.map((c) => [c.id, c.after]));
  assert.equal(after.get('card'), 'desktop-card');
  assert.notEqual(after.get('row'), 'card-nav'); // depth 2의 행은 페이지 랜드마크가 아님
});

test('renameSelection — nav의 링크 자식은 nav-item', async () => {
  installFigma();
  const link = (id) => ({
    type: 'FRAME', id, name: `Frame ${id}`, width: 80, height: 32,
    children: [{ type: 'TEXT', id: id + 't', name: 'l', characters: '링크' }],
  });
  const nav = {
    type: 'FRAME', id: 'nav', name: 'Frame N', layoutMode: 'HORIZONTAL', width: 600, height: 48,
    children: [link('l1'), link('l2'), link('l3')],
  };
  const page = { type: 'FRAME', id: 'page', name: 'Desktop', width: 1440, height: 900, children: [nav] };
  const { changes } = await renameSelection([page], { apply: true, maxDepth: 3 });
  const after = new Map(changes.map((c) => [c.id, c.after]));
  assert.equal(after.get('nav'), 'desktop-nav');
  assert.equal(after.get('l1'), 'nav-item'); // 의미 없는 wrapper가 아니라 nav-item(DS 표준 Nav Item)
});

test('renameSelection — 자식 역할은 부모에게 부여된 역할에서만 파생', async () => {
  installFigma();
  // 카드 크롬이 있어 card로 확정되지만, 구조만 보면 isListLike도 참인 프레임.
  // 구조를 재판정하면 자식이 item이 된다 — 확정 역할(card)에서만 파생해야 한다.
  const row = (id) => ({
    type: 'FRAME', id, name: `Frame ${id}`, width: 280, height: 48,
    children: [{ type: 'TEXT', id: id + 't', name: 't', characters: 'x' }],
  });
  const card = {
    type: 'FRAME', id: 'card', name: 'Frame C', layoutMode: 'VERTICAL', width: 320, height: 200,
    cornerRadius: 12, fills: [{ type: 'SOLID', visible: true }],
    children: [row('r1'), row('r2'), row('r3')],
  };
  const root = { type: 'FRAME', id: 'root', name: 'Desktop', width: 1440, height: 900, children: [card] };
  const { changes } = await renameSelection([root], { apply: true, maxDepth: 3 });
  const after = new Map(changes.map((c) => [c.id, c.after]));
  assert.equal(after.get('card'), 'desktop-card');
  assert.notEqual(after.get('r1'), 'card-item'); // 부여된 역할이 list가 아니므로 item 아님
});

test('renameSelection — 썸네일 판정은 통과 래퍼가 아니라 카드 기준으로', async () => {
  installFigma();
  const img = { type: 'RECTANGLE', id: 'img', name: 'Rectangle 1', width: 200, height: 150, fills: [{ type: 'IMAGE', visible: true }] };
  const hug = { type: 'FRAME', id: 'hug', name: 'Frame 8', width: 200, height: 150, children: [img] }; // 이미지를 hug하는 래퍼
  const card = {
    type: 'FRAME', id: 'card', name: 'Frame 1', width: 800, height: 600, cornerRadius: 12,
    fills: [{ type: 'SOLID', visible: true }],
    children: [hug, { type: 'TEXT', id: 'tt', name: 'Title', characters: 'x' }],
  };
  const { changes } = await renameSelection([card], { apply: true, maxDepth: 3 });
  const after = new Map(changes.map((c) => [c.id, c.after]));
  // 래퍼(200x150) 대비면 면적비 1.0이라 thumbnail이 안 되지만, 카드(800x600) 대비면 6% → thumbnail.
  assert.equal(after.get('img'), 'card-thumbnail');
});

test('renameSelection — 장식 액센트 바·프레임 구분선은 progress 아님', async () => {
  installFigma();
  const accent = {
    type: 'FRAME', id: 'acc', name: 'Frame 1', width: 40, height: 4, cornerRadius: 2,
    fills: [{ type: 'SOLID', visible: true }],
    children: [{ type: 'RECTANGLE', id: 'accf', name: 'Rectangle 1', width: 40, height: 4, fills: [{ type: 'SOLID', visible: true }] }],
  };
  const rule = {
    type: 'FRAME', id: 'rule', name: 'Frame 2', width: 400, height: 2, cornerRadius: 0,
    fills: [{ type: 'SOLID', visible: true }],
    children: [{ type: 'RECTANGLE', id: 'rulef', name: 'Rectangle 2', width: 400, height: 2, fills: [{ type: 'SOLID', visible: true }] }],
  };
  const root = { type: 'FRAME', id: 'root', name: 'Desktop', width: 1440, height: 900, children: [accent, rule] };
  const { changes } = await renameSelection([root], { apply: true, maxDepth: 3 });
  const after = new Map(changes.map((c) => [c.id, c.after]));
  assert.notEqual(after.get('acc'), 'desktop-progress'); // 채움 바가 트랙과 같은 폭 → 진행 표시 아님
  assert.notEqual(after.get('rule'), 'desktop-progress'); // 2px 트랙은 알약 검사가 공허해짐
});

test('renameSelection — 출력한 역할은 모두 어휘(ROLE_VOCAB) 안에 있다', async () => {
  installFigma();
  // 여러 역할을 한 씬에서 유도해 출력 이름의 말단 세그먼트를 어휘와 대조한다.
  const scene = {
    type: 'FRAME', id: 'page', name: 'Desktop', width: 1440, height: 900, layoutMode: 'VERTICAL',
    children: [
      { type: 'FRAME', id: 'hd', name: 'Frame 1', children: [{ type: 'VECTOR', id: 'v1', name: 'Vector' }] },
      {
        type: 'FRAME', id: 'card', name: 'Frame 2', width: 320, height: 400,
        cornerRadius: 12, fills: [{ type: 'SOLID', visible: true }],
        children: [
          { type: 'RECTANGLE', id: 'th', name: 'Rectangle 1', width: 64, height: 64, fills: [{ type: 'IMAGE', visible: true }] },
          { type: 'ELLIPSE', id: 'av', name: 'Ellipse 1', width: 40, height: 40, fills: [{ type: 'IMAGE', visible: true }] },
          { type: 'ELLIPSE', id: 'dot', name: 'Ellipse 2', width: 10, height: 10, fills: [{ type: 'SOLID', visible: true }] },
          { type: 'LINE', id: 'ln', name: 'Line 1' },
          { type: 'RECTANGLE', id: 'sq', name: 'Rectangle 2', width: 40, height: 40 },
        ],
      },
      {
        type: 'FRAME', id: 'pg', name: 'Frame 3', width: 200, height: 8, cornerRadius: 4,
        fills: [{ type: 'SOLID', visible: true }],
        children: [{ type: 'RECTANGLE', id: 'pgf', name: 'Rectangle 3', width: 120, height: 8, fills: [{ type: 'SOLID', visible: true }] }],
      },
      { type: 'FRAME', id: 'ft', name: 'Frame 4', children: [{ type: 'VECTOR', id: 'v2', name: 'Vector' }] },
    ],
  };
  const { changes } = await renameSelection([scene], { apply: true, maxDepth: 3 });
  assert.ok(changes.length > 8, '충분한 역할이 유도되어야 한다');
  for (const c of changes) {
    const role = c.after.split('-').pop();
    assert.ok(isKnownRole(role), `출력한 역할 '${role}'(${c.after})이 어휘에 없다`);
  }
  // shape는 실제로 출력되는 역할 — 어휘 누락 회귀 방지(채움·외곽선 없는 사각형).
  assert.ok(changes.some((c) => c.after.endsWith('shape')), 'shape가 출력되어야 한다');
});

/* ================= prunePaletteColors (팔레트 재적용 정리) ================= */
test('prunePaletteColors(#3) — 재생성 hue 패밀리 안에서만 정리(다른 패밀리·추출 hex 보존)', async () => {
  const figma = installFigma();
  // 이전 팔레트(blue 2스텝 + green) + 추출 hex 색 + 비색
  await createTokens(
    [
      { name: 'color/blue/500', category: 'color', sources: ['fill'], value: '#3366ff' },
      { name: 'color/blue/700', category: 'color', sources: ['fill'], value: '#1133aa' },
      { name: 'color/green/500', category: 'color', sources: ['fill'], value: '#22aa55' },
      { name: 'color/0066ff', category: 'color', sources: ['fill'], value: '#0066ff' }, // 추출 hex(2토막)
      { name: 'spacing/16', category: 'gap', sources: ['gap'], value: 16 },
    ],
    16,
  );
  // 새 팔레트가 blue/500만 → blue 패밀리의 다른 스텝(blue/700)만 정리. green·추출 hex·간격 보존.
  const keep = ['color/blue/500'];
  const removed = await prunePaletteColors(keep);

  assert.equal(removed, 1); // blue/700 의 Global(거울 없음)
  assert.ok(!findVar(figma, 'Global', 'color/blue/700'));
  assert.ok(findVar(figma, 'Global', 'color/blue/500')); // keep
  assert.ok(findVar(figma, 'Global', 'color/green/500')); // 다른 패밀리 보존
  assert.ok(findVar(figma, 'Global', 'color/0066ff')); // 추출 hex 보존
  assert.ok(findVar(figma, 'Global', 'spacing/16')); // 비색 보존
});

/* ================= textStyles.ts (Phase C) ================= */
test('scanTextStyles — TEXT 노드 시그니처 수집(+%행간 환산·mixed 스킵)', async () => {
  const figma = installFigma();
  const t1 = { type: 'TEXT', id: 't1', name: 'Title', fontSize: 32, fontName: { family: 'Inter', style: 'Bold' }, lineHeight: { unit: 'PIXELS', value: 40 }, letterSpacing: { unit: 'PIXELS', value: 0 }, characters: 'Hi', textStyleId: '' };
  const t2 = { type: 'TEXT', id: 't2', name: 'Body', fontSize: 16, fontName: { family: 'Inter', style: 'Regular' }, lineHeight: { unit: 'PERCENT', value: 150 }, letterSpacing: { unit: 'PIXELS', value: 0 }, characters: 'x', textStyleId: '' };
  const tMixed = { type: 'TEXT', id: 't3', name: 'Mixed', fontSize: figma.mixed, fontName: { family: 'Inter', style: 'Regular' }, lineHeight: { unit: 'AUTO' }, letterSpacing: { unit: 'PIXELS', value: 0 }, characters: 'y', textStyleId: '' };
  const frame = { type: 'FRAME', id: 'f', name: 'F', children: [t1, t2, tMixed] };

  const { samples, warnings } = await scanTextStyles([frame]);
  assert.equal(samples.length, 2); // mixed 제외
  assert.equal(samples.find((s) => s.fontSize === 16).lineHeight, 24); // 150% × 16
  assert.equal(samples.find((s) => s.fontSize === 32).style, 'Bold');
  assert.ok(warnings.length >= 1);
});

test('scanTextStyles — 세그먼트를 읽을 수 있어도 부분 서식 노드는 세지 않는다', async () => {
  // 두 적용 경로(applyTextStylesToSelection·createTextStyles)가 mixed 노드를 건너뛰므로,
  // 스캔이 가장 긴 세그먼트로 대표시켜 세면 ×N 배지와 '레이어 선택'이 손댈 수 없는 레이어를 가리킨다.
  const figma = installFigma();
  const plain = { type: 'TEXT', id: 'p1', name: 'Body', fontSize: 16, fontName: { family: 'Inter', style: 'Regular' }, lineHeight: { unit: 'PIXELS', value: 24 }, letterSpacing: { unit: 'PIXELS', value: 0 }, characters: 'aaa', textStyleId: '' };
  // 한 단어만 굵게 — 세그먼트 API는 멀쩡히 답하지만 노드 필드는 mixed.
  const partial = {
    type: 'TEXT', id: 'p2', name: 'Partial', fontSize: figma.mixed, fontName: figma.mixed,
    lineHeight: { unit: 'PIXELS', value: 24 }, letterSpacing: { unit: 'PIXELS', value: 0 }, characters: 'aaabb', textStyleId: '',
    getStyledTextSegments: () => [
      { start: 0, end: 3, fontSize: 16, fontName: { family: 'Inter', style: 'Regular' }, lineHeight: { unit: 'PIXELS', value: 24 }, letterSpacing: { unit: 'PIXELS', value: 0 } },
      { start: 3, end: 5, fontSize: 16, fontName: { family: 'Inter', style: 'Bold' }, lineHeight: { unit: 'PIXELS', value: 24 }, letterSpacing: { unit: 'PIXELS', value: 0 } },
    ],
  };
  const frame = { type: 'FRAME', id: 'f', name: 'F', children: [plain, partial] };

  const { samples, warnings } = await scanTextStyles([frame]);
  assert.equal(samples.length, 1);
  assert.equal(samples[0].id, 'p1');
  assert.ok(warnings.some((w) => w.includes('부분 서식')));

  const clusters = clusterTextStyles(samples);
  assert.equal(clusters.length, 1);
  assert.equal(clusters[0].count, 1); // ×2가 아니라 ×1 — 적용이 실제로 바꿀 수 있는 수
  assert.deepEqual(clusters[0].nodeIds, ['p1']);
});

test('scanTextStyles — 숨김 텍스트(visible=false)와 그 하위는 스캔하지 않음', async () => {
  installFigma();
  const visible = {
    type: 'TEXT', id: 'vis', name: 'Show', fontSize: 16, fontName: { family: 'Inter', style: 'Regular' },
    lineHeight: { unit: 'PIXELS', value: 24 }, letterSpacing: { unit: 'PIXELS', value: 0 }, characters: 'a', textStyleId: '',
  };
  const hidden = {
    type: 'TEXT', id: 'hid', name: 'Hide', visible: false, fontSize: 48, fontName: { family: 'Inter', style: 'Bold' },
    lineHeight: { unit: 'PIXELS', value: 56 }, letterSpacing: { unit: 'PIXELS', value: 0 }, characters: 'b', textStyleId: '',
  };
  const nestedHidden = {
    type: 'FRAME', id: 'wrap', name: 'HiddenWrap', visible: false,
    children: [{
      type: 'TEXT', id: 'nested', name: 'Nested', fontSize: 20, fontName: { family: 'Inter', style: 'Regular' },
      lineHeight: { unit: 'PIXELS', value: 28 }, letterSpacing: { unit: 'PIXELS', value: 0 }, characters: 'c', textStyleId: '',
    }],
  };
  const { samples } = await scanTextStyles([{ type: 'FRAME', id: 'f', name: 'F', children: [visible, hidden, nestedHidden] }]);
  assert.equal(samples.length, 1);
  assert.equal(samples[0].layerName, 'Show');
});

test('createSemanticTextStyles — 변수 보장 + 시맨틱 바인딩 + 멱등(화면은 안 건드림)', async () => {
  const figma = installFigma();
  const specs = [{ name: 'body', fontSize: 16, lineHeight: 24, letterSpacing: 0, family: 'Inter', style: 'Regular' }];

  const r = await createSemanticTextStyles(specs);
  assert.equal(r.created, 1);
  assert.equal(r.bound, 2); // fontSize + lineHeight
  // 등록은 라이브러리를 만드는 데까지 — 화면 연결은 「기존만 연결」 몫(결정 2026-08-06).
  assert.equal(r.applied, 0);
  assert.deepEqual(r.missing, []);

  // 시맨틱 변수(역할명) 생성 + 스타일 바인딩
  assert.ok(findVar(figma, 'Semantic', 'font-size/body'));
  assert.ok(findVar(figma, 'Semantic', 'line-height/body'));
  const style = figma._state.textStyles.find((s) => s.name === 'body');
  assert.equal(style.fontSize, 16);
  assert.ok(style.boundVariables.fontSize);
  assert.ok(style.boundVariables.lineHeight);

  // 멱등: 재실행 → updated(신규 0)
  const r2 = await createSemanticTextStyles(specs);
  assert.equal(r2.created, 0);
  assert.equal(r2.updated, 1);
  assert.equal(figma._state.textStyles.length, 1); // 중복 생성 없음
});

test('applyExistingTextStyles — 시그니처가 같은 기존 스타일에만 붙이고 미등록은 보고', async () => {
  const figma = installFigma();
  // 등록으로 라이브러리를 만든 뒤(생성만), 연결은 별도 호출이 한다 — 두 단계가 갈렸음을 그대로 확인.
  await createSemanticTextStyles([
    { name: 'body', fontSize: 16, lineHeight: 24, letterSpacing: 0, family: 'Inter', style: 'Regular' },
  ]);
  const style = figma._state.textStyles.find((s) => s.name === 'body');

  const mkText = (id, fontSize) => ({
    type: 'TEXT', id, name: id, fontSize, fontName: { family: 'Inter', style: 'Regular' },
    lineHeight: { unit: 'PIXELS', value: fontSize * 1.5 }, letterSpacing: { unit: 'PIXELS', value: 0 },
    characters: 'hi', visible: true,
    _styleId: null, async setTextStyleIdAsync(sid) { this._styleId = sid; },
  });
  const hit = mkText('n1', 16); // 등록된 시그니처
  const miss = mkText('n2', 40); // 라이브러리에 없는 크기

  const r = await applyExistingTextStyles([hit, miss]);
  assert.equal(r.applied, 1);
  assert.equal(hit._styleId, style.id);
  assert.equal(miss._styleId, null); // 없는 시그니처에 아무거나 붙이지 않는다
  assert.equal(figma._state.textStyles.length, 1); // 연결만 — 스타일을 새로 만들지 않는다
  assert.equal(r.skipped, 1);
  assert.equal(r.skipReasons.noStyle, 1);
});

test('applyExistingTextStyles — 추측 일치 없음: PIXELS 150을 150% 스타일에 붙이지 않는다(모양이 달라짐)', async () => {
  const figma = installFigma();
  // 단위만 PIXELS로 떨어진 150 — 스캔은 이걸 150%(=24px)로 읽어 스타일을 %로 등록한다.
  // 연결 쪽이 원값 150을 그대로 쓰면 키가 어긋나 방금 등록한 스타일을 '미등록'이라 보고했다.
  const node = {
    type: 'TEXT', id: 'n1', name: 'Raw', fontSize: 16, fontName: { family: 'Inter', style: 'Regular' },
    lineHeight: { unit: 'PIXELS', value: 150 }, letterSpacing: { unit: 'PIXELS', value: 0 },
    characters: 'hi', visible: true, textStyleId: '',
    _styleId: null, async setTextStyleIdAsync(sid) { this._styleId = sid; },
  };
  const { samples } = await scanTextStyles([node]);
  const s = samples[0];
  assert.equal(s.lineHeight, 24); // 150% × 16
  await createSemanticTextStyles([{
    name: 'body', fontSize: s.fontSize, lineHeight: s.lineHeight, lineHeightPercent: s.lineHeightPercent,
    letterSpacing: s.letterSpacing, family: s.family, style: s.style,
  }]);
  const style = figma._state.textStyles.find((x) => x.name === 'body');
  assert.deepEqual(style.lineHeight, { value: 150, unit: 'PERCENT' }); // %로 등록됨

  // 노드의 실제 줄 높이는 150px, 스타일은 24px(150%) — 숫자를 다른 단위로 읽어야만 맞으므로 건너뛴다(§4.6).
  const r = await applyExistingTextStyles([node]);
  assert.equal(r.applied, 0);
  assert.equal(node._styleId, null);
  assert.equal(r.skipReasons.noStyle, 1);

  // 단위만 다르고 실제 높이가 같으면 같다 — 24px 글자는 150% 스타일에 붙는다.
  const px24 = { ...node, id: 'n2', lineHeight: { unit: 'PIXELS', value: 24 }, _styleId: null, async setTextStyleIdAsync(sid) { this._styleId = sid; } };
  const r2 = await applyExistingTextStyles([px24]);
  assert.equal(r2.applied, 1);
  assert.equal(px24._styleId, style.id);
});

test('applyExistingTextStyles — 일부러 넓게 잡은 px 행간 스타일이 평범한 문단을 삼키지 않는다', async () => {
  const figma = installFigma();
  // 16pt / 200px — 편집 의도로 넓게 잡은 진짜 px 행간. 추측(sigLhPx)은 200/16=12.5배를
  // px로는 비현실적이라 보고 200%(=32px)로 뒤집는다. 그 추측을 스타일 쪽에도 걸면
  // 이 스타일이 16/32 시그니처를 차지해, 평범한 32px 문단이 여기 묶이고 행간이 200px로 뛴다.
  await createSemanticTextStyles([{
    name: 'hero', fontSize: 16, lineHeight: 200, letterSpacing: 0, family: 'Inter', style: 'Regular',
  }]);
  const hero = figma._state.textStyles.find((x) => x.name === 'hero');
  assert.deepEqual(hero.lineHeight, { value: 200, unit: 'PIXELS' });

  const para = {
    type: 'TEXT', id: 'p1', name: 'Para', fontSize: 16, fontName: { family: 'Inter', style: 'Regular' },
    lineHeight: { unit: 'PIXELS', value: 32 }, letterSpacing: { unit: 'PIXELS', value: 0 },
    characters: 'hi', visible: true, textStyleId: '',
    _styleId: null, async setTextStyleIdAsync(sid) { this._styleId = sid; },
  };
  const r = await applyExistingTextStyles([para]);
  assert.equal(para._styleId, null); // 캔버스를 건드리지 않는다
  assert.equal(r.applied, 0);
  assert.equal(r.skipReasons.noStyle, 1); // 대신 '같은 스타일 없음'으로 건너뜀

  // 같은 200px 문단은 제 스타일에 제대로 붙는다(원값끼리 만난다).
  const wide = { ...para, id: 'p2', lineHeight: { unit: 'PIXELS', value: 200 }, _styleId: null,
    async setTextStyleIdAsync(sid) { this._styleId = sid; } };
  const r2 = await applyExistingTextStyles([wide]);
  assert.equal(wide._styleId, hero.id);
  assert.equal(r2.applied, 1);
});

test('createSemanticTextStyles — 기존 역할로 rename은 충돌 보류(동명·시맨틱 보존)', async () => {
  const figma = installFigma();
  // body(16) · caption(13) 각각 등록
  await createSemanticTextStyles(
    [
      { name: 'body', fontSize: 16, lineHeight: 24, letterSpacing: 0, family: 'Inter', style: 'Regular' },
      { name: 'caption', fontSize: 13, lineHeight: 18, letterSpacing: 0, family: 'Inter', style: 'Regular' },
    ],
  );
  const bodySem = findVar(figma, 'Semantic', 'font-size/body');
  const bodyGlobalId = bodySem.valuesByMode['mode:Semantic'].id;
  const body = figma._state.textStyles.find((s) => s.name === 'body');
  const caption = figma._state.textStyles.find((s) => s.name === 'caption');
  assert.ok(body && caption);
  const bodyBound = body.boundVariables.fontSize.id;

  // caption → body: 대상 이름 점유 → rename 거부(동명 스타일·잘못된 바인딩 방지).
  const r = await createSemanticTextStyles(
    [{ name: 'body', fontSize: 13, lineHeight: 18, letterSpacing: 0, family: 'Inter', style: 'Regular', boundStyleId: caption.id }],
  );
  assert.equal(r.created, 0);
  assert.equal(r.updated, 0); // 충돌 스킵
  assert.ok(r.missing.some((m) => m.includes('이름 충돌')));
  assert.equal(caption.name, 'caption'); // 이름 유지
  assert.equal(caption.fontSize, 13);
  assert.equal(figma._state.textStyles.filter((s) => s.name === 'body').length, 1); // 동명 없음
  const bodySemAfter = findVar(figma, 'Semantic', 'font-size/body');
  assert.equal(bodySemAfter.valuesByMode['mode:Semantic'].id, bodyGlobalId);
  assert.equal(body.boundVariables.fontSize.id, bodyBound); // 기존 body 바인딩 불변
});

test('createSemanticTextStyles — 빈 이름으로 rename하면 시맨틱 별칭도 이동', async () => {
  const figma = installFigma();
  await createSemanticTextStyles(
    [{ name: 'caption', fontSize: 13, lineHeight: 18, letterSpacing: 0, family: 'Inter', style: 'Regular' }],
  );
  const caption = figma._state.textStyles.find((s) => s.name === 'caption');
  const oldSem = findVar(figma, 'Semantic', 'font-size/caption');
  const globalId = oldSem.valuesByMode['mode:Semantic'].id;

  const r = await createSemanticTextStyles(
    [{ name: 'display', fontSize: 13, lineHeight: 18, letterSpacing: 0, family: 'Inter', style: 'Regular', boundStyleId: caption.id }],
  );
  assert.equal(r.updated, 1);
  assert.equal(caption.name, 'display');
  assert.equal(caption.fontSize, 13); // rename: 타이포 보존
  assert.equal(findVar(figma, 'Semantic', 'font-size/caption'), undefined); // 옛 역할 이동됨
  const moved = findVar(figma, 'Semantic', 'font-size/display');
  assert.ok(moved);
  assert.equal(moved.valuesByMode['mode:Semantic'].id, globalId); // 같은 Global 별칭 유지
  assert.equal(caption.boundVariables.fontSize.id, moved.id);
});

test('createSemanticTextStyles — letterSpacing 0이면 기존 자간을 클리어', async () => {
  const figma = installFigma();
  await createSemanticTextStyles(
    [{ name: 'body', fontSize: 16, lineHeight: 24, letterSpacing: 2, family: 'Inter', style: 'Regular' }],
  );
  const body = figma._state.textStyles.find((s) => s.name === 'body');
  assert.equal(body.letterSpacing.value, 2);

  // stale 앵커 없이 동명 갱신 → 자간 0으로 클리어
  await createSemanticTextStyles(
    [{ name: 'body', fontSize: 16, lineHeight: 24, letterSpacing: 0, family: 'Inter', style: 'Regular' }],
  );
  assert.equal(body.letterSpacing.value, 0);
  assert.equal(body.letterSpacing.unit, 'PIXELS');
});

test('createSemanticTextStyles — stale boundStyleId는 rename 모드가 아님(타이포 기록)', async () => {
  const figma = installFigma();
  await createSemanticTextStyles(
    [{ name: 'body', fontSize: 16, lineHeight: 24, letterSpacing: 0, family: 'Inter', style: 'Regular' }],
  );
  const body = figma._state.textStyles.find((s) => s.name === 'body');
  // 존재하지 않는 id + 같은 이름 → 이름 폴백으로 body를 찾지만, stale 앵커라 타이포를 스펙으로 갱신해야 함.
  const r = await createSemanticTextStyles(
    [{ name: 'body', fontSize: 18, lineHeight: 28, letterSpacing: 0, family: 'Inter', style: 'Medium', boundStyleId: 'style:gone' }],
  );
  assert.equal(r.created, 0);
  assert.equal(r.updated, 1);
  assert.equal(body.fontSize, 18);
  assert.equal(body.fontName.style, 'Medium');
  assert.equal(body.lineHeight.value, 28);
});

/* ---------- 행간 %: 등록 단위 보존과 바인딩 생략 — 파일 끝에 모아 둠(동시 작업 브랜치 충돌 최소화) ---------- */

test('scanTextStyles — %행간은 px 환산과 원본 % 를 함께 싣는다', async () => {
  installFigma();
  const mk = (id, fontSize, lineHeight) => ({
    type: 'TEXT', id, name: id, fontSize, fontName: { family: 'Inter', style: 'Regular' },
    lineHeight, letterSpacing: { unit: 'PIXELS', value: 0 }, characters: 'x', textStyleId: '',
  });
  const { samples } = await scanTextStyles([{
    type: 'FRAME', id: 'f', name: 'F', children: [
      mk('pct', 16, { unit: 'PERCENT', value: 150 }),
      mk('px', 20, { unit: 'PIXELS', value: 29 }), // 145% — 흔한 행간 % 목록 밖
      mk('auto', 24, { unit: 'AUTO' }),
    ],
  }]);
  const pct = samples.find((s) => s.fontSize === 16);
  assert.equal(pct.lineHeight, 24); // 시그니처는 px 환산
  assert.equal(pct.lineHeightPercent, 150); // 원본은 별도 축으로 보존
  assert.equal(samples.find((s) => s.fontSize === 20).lineHeightPercent, 0);
  assert.equal(samples.find((s) => s.fontSize === 24).lineHeightPercent, 0); // AUTO
});

test('scanTextStyles — 폰트 대비 말이 되는 px 행간은 %로 오인하지 않는다', async () => {
  installFigma();
  const mk = (id, fontSize, value) => ({
    type: 'TEXT', id, name: id, fontSize, fontName: { family: 'Inter', style: 'Regular' },
    lineHeight: { unit: 'PIXELS', value }, letterSpacing: { unit: 'PIXELS', value: 0 },
    characters: 'x', textStyleId: '',
  });
  const { samples } = await scanTextStyles([{
    type: 'FRAME', id: 'f', name: 'F', children: [
      mk('display', 96, 104), // 1.08배 — 진짜 px 행간(104% = 99.84px로 줄던 값)
      mk('big', 48, 120), // 2.5배 — 진짜 px 행간(120% = 57.6px로 절반이 되던 값)
      mk('pctish', 16, 150), // 9.4배 — px로는 불가능 → 150% 의도로 읽는다
    ],
  }]);
  const at = (fs) => samples.find((s) => s.fontSize === fs);
  // 시그니처(px)가 입력값 그대로여야 한다 — 여기가 틀리면 화면 행간이 실제로 바뀐다.
  assert.equal(at(96).lineHeight, 104);
  assert.equal(at(96).lineHeightPercent, 0); // % 축도 안 붙는다
  assert.equal(at(48).lineHeight, 120);
  assert.equal(at(16).lineHeight, 24); // 150% → 24px
  assert.equal(at(16).lineHeightPercent, 150); // 이 경우만 % 의도
});

test('createSemanticTextStyles — %행간은 PERCENT로 등록하고 행간 바인딩은 생략(px 강제 회피)', async () => {
  const figma = installFigma();
  const r = await createSemanticTextStyles(
    [{ name: 'body', fontSize: 16, lineHeight: 24, lineHeightPercent: 150, letterSpacing: 0, family: 'Inter', style: 'Regular' }],
  );
  const style = figma._state.textStyles.find((s) => s.name === 'body');
  assert.deepEqual(style.lineHeight, { value: 150, unit: 'PERCENT' }); // %로 등록
  assert.ok(style.boundVariables.fontSize); // 크기는 그대로 바인딩
  assert.equal(style.boundVariables.lineHeight, undefined); // 행간만 미바인딩
  assert.equal(r.bound, 1); // fontSize 만
  assert.deepEqual(r.missing, []); // 의도된 미바인딩은 경고가 아니다
  assert.equal(r.notes.length, 1);
  assert.ok(r.notes[0].includes('150%'));

  // A안: %행간은 변수를 만들지 않는다(px 스냅샷·역할 별칭 모두 없음) — 스타일이 %를 보관한다.
  assert.equal(findVar(figma, 'Global', 'line-height/24'), undefined);
  assert.equal(findVar(figma, 'Semantic', 'line-height/body'), undefined);
});

test('createSemanticTextStyles — px 정수 행간만 변수·별칭이 되고 스타일에 바인딩된다(A안)', async () => {
  const figma = installFigma();
  const r = await createSemanticTextStyles(
    [
      { name: 'h1', fontSize: 24, lineHeight: 36, lineHeightPercent: 150, letterSpacing: 0, family: 'Inter', style: 'Bold' }, // % → 변수 없음
      { name: 'h2', fontSize: 20, lineHeight: 28, letterSpacing: 0, family: 'Inter', style: 'Bold' }, // px 정수 → 변수+바인딩
      { name: 'h3', fontSize: 13, lineHeight: 19.5, letterSpacing: 0, family: 'Inter', style: 'Bold' }, // px 소수 → 변수 없음, 누락 아님
    ],
  );
  assert.equal(findVar(figma, 'Global', 'line-height/36'), undefined);
  assert.equal(findVar(figma, 'Global', 'line-height/28').valuesByMode['mode:Global'], 28);
  assert.ok(findVar(figma, 'Semantic', 'line-height/h2'));
  assert.ok(figma._state.textStyles.find((s) => s.name === 'h2').boundVariables.lineHeight);
  assert.equal(findVar(figma, 'Global', 'line-height/19_5'), undefined);
  assert.deepEqual(r.missing, []);
});

test('createSemanticTextStyles — 기존 %스타일을 rename해도 %가 유지되고 바인딩되지 않는다', async () => {
  const figma = installFigma();
  await createSemanticTextStyles(
    [{ name: 'body', fontSize: 16, lineHeight: 24, lineHeightPercent: 150, letterSpacing: 0, family: 'Inter', style: 'Regular' }],
  );
  const style = figma._state.textStyles.find((s) => s.name === 'body');

  // 재스캔: 같은 스타일에 앵커된 채 이름만 바꿈
  const r = await createSemanticTextStyles(
    [{ name: 'text/base', fontSize: 16, lineHeight: 24, lineHeightPercent: 150, letterSpacing: 0, family: 'Inter', style: 'Regular', boundStyleId: style.id }],
  );
  assert.equal(style.name, 'text/base'); // rename 됨
  assert.deepEqual(style.lineHeight, { value: 150, unit: 'PERCENT' }); // 타이포 보존
  assert.equal(style.boundVariables.lineHeight, undefined); // 바인딩이 %를 px로 뭉개지 않았다
  assert.ok(r.notes.some((n) => n.includes('150%')));
});

test('createSemanticTextStyles — 같은 px 이름에 원본이 갈리면 px로 기록(다른 역할 내보내기 오염 방지)', async () => {
  const figma = installFigma();
  const r = await createSemanticTextStyles(
    [
      { name: 'body', fontSize: 16, lineHeight: 24, lineHeightPercent: 150, letterSpacing: 0, family: 'Inter', style: 'Regular' },
      { name: 'h2', fontSize: 24, lineHeight: 24, letterSpacing: 0, family: 'Inter', style: 'Bold' }, // 같은 24px, 원본은 px
    ],
  );
  // A안: 변수는 px 원본(h2)에서만 생기고 %(body)는 변수·설명을 남기지 않는다.
  const g = findVar(figma, 'Global', 'line-height/24');
  assert.equal(g.valuesByMode['mode:Global'], 24);
  assert.ok(!g.description);
  assert.ok(!r.notes.some((n) => n.includes('원본이 달라'))); // 충돌 자체가 없다
  assert.ok(findVar(figma, 'Semantic', 'line-height/h2'));
  assert.equal(findVar(figma, 'Semantic', 'line-height/body'), undefined);

  // 스타일 자체의 단위는 역할별로 각각 유지된다
  assert.deepEqual(figma._state.textStyles.find((s) => s.name === 'body').lineHeight, { value: 150, unit: 'PERCENT' });
  assert.deepEqual(figma._state.textStyles.find((s) => s.name === 'h2').lineHeight, { value: 24, unit: 'PIXELS' });
});

/* ---------- 자간 %: 행간과 동일 패턴(등록 단위 보존·바인딩 생략) ---------- */

test('scanTextStyles — %자간은 px 환산과 원본 % 를 함께 싣는다', async () => {
  installFigma();
  const mk = (id, fontSize, letterSpacing) => ({
    type: 'TEXT', id, name: id, fontSize, fontName: { family: 'Inter', style: 'Regular' },
    lineHeight: { unit: 'PIXELS', value: 24 }, letterSpacing, characters: 'x', textStyleId: '',
  });
  const { samples } = await scanTextStyles([{
    type: 'FRAME', id: 'f', name: 'F', children: [
      mk('pct', 16, { unit: 'PERCENT', value: 2 }),
      mk('neg', 16, { unit: 'PERCENT', value: -2 }),
      mk('px', 20, { unit: 'PIXELS', value: 0.41 }), // 2.05% — 정수 % 복구 대상 아님
    ],
  }]);
  const pct = samples.find((s) => s.letterSpacingPercent === 2);
  assert.equal(pct.letterSpacing, 0.32); // 2% × 16
  assert.equal(pct.letterSpacingPercent, 2);
  const neg = samples.find((s) => s.letterSpacingPercent === -2);
  assert.equal(neg.letterSpacing, -0.32);
  assert.equal(neg.letterSpacingPercent, -2);
  assert.equal(samples.find((s) => s.fontSize === 20).letterSpacingPercent, 0);
});

test('scanTextStyles — 스타일 없이 변수만 묶여 있어도 description %를 복구', async () => {
  const figma = installFigma();
  const global = figma.variables.createVariableCollection('Global');
  const g = figma.variables.createVariable('line-height/24', global, 'FLOAT');
  g.setValueForMode(global.defaultModeId, 24);
  g.description = '150%';
  const ls = figma.variables.createVariable('letter-spacing/-0_32', global, 'FLOAT');
  ls.setValueForMode(global.defaultModeId, -0.32);
  ls.description = '-2%';
  const node = {
    type: 'TEXT', id: 't1', name: 'Bound', fontSize: 16, fontName: { family: 'Inter', style: 'Regular' },
    // 바인딩 때문에 해석값은 px
    lineHeight: { unit: 'PIXELS', value: 24 },
    letterSpacing: { unit: 'PIXELS', value: -0.32 },
    characters: 'x', textStyleId: '',
    boundVariables: {
      lineHeight: [{ type: 'VARIABLE_ALIAS', id: g.id }],
      letterSpacing: [{ type: 'VARIABLE_ALIAS', id: ls.id }],
    },
  };
  const { samples } = await scanTextStyles([node]);
  assert.equal(samples[0].lineHeightPercent, 150);
  assert.equal(samples[0].letterSpacingPercent, -2);
});

test('scanTextStyles — 노드가 px로 보여도 연결된 % 스타일 정의를 우선한다', async () => {
  const figma = installFigma();
  const st = figma.createTextStyle();
  st.name = 'body';
  st.fontName = { family: 'Inter', style: 'Regular' };
  st.fontSize = 16;
  st.lineHeight = { value: 150, unit: 'PERCENT' };
  st.letterSpacing = { value: -2, unit: 'PERCENT' };
  // 노드는 해석된 px만 들고 있음(변수/표시 경로). 스타일 id로 연결.
  const node = {
    type: 'TEXT', id: 't1', name: 'Body', fontSize: 16, fontName: { family: 'Inter', style: 'Regular' },
    lineHeight: { unit: 'PIXELS', value: 24 }, letterSpacing: { unit: 'PIXELS', value: -0.32 },
    characters: 'x', textStyleId: st.id,
  };
  const { samples } = await scanTextStyles([node]);
  assert.equal(samples.length, 1);
  assert.equal(samples[0].lineHeightPercent, 150);
  assert.equal(samples[0].letterSpacingPercent, -2);
  assert.equal(samples[0].styleId, st.id);
});

test('scanTextStyles — 스타일 없는 텍스트도 PIXELS로 떨어진 % 행간 숫자를 복구', async () => {
  installFigma();
  const { samples } = await scanTextStyles([{
    type: 'TEXT', id: 't1', name: 'Raw', fontSize: 16, fontName: { family: 'Inter', style: 'Regular' },
    // Figma UI는 150%인데 단위만 PIXELS로 떨어지는 경우
    lineHeight: { unit: 'PIXELS', value: 150 },
    letterSpacing: { unit: 'PERCENT', value: -2 },
    characters: 'x', textStyleId: '',
  }]);
  assert.equal(samples[0].lineHeightPercent, 150);
  assert.equal(samples[0].lineHeight, 24); // 150% × 16
  assert.equal(samples[0].letterSpacingPercent, -2);
});

test('scanTextStyles — 흔한 비율(16→24=150%)이어도 px 행간은 px로 둔다', async () => {
  installFigma();
  // 24px 의도와 150% 의도는 이 값만으로 구분할 수 없다. %로 뒤집으면 등록 단위가 바뀌고
  // 행간 변수 바인딩이 생략돼, 같은 램프에서 24/32는 변수가 있고 24/36은 없는 상태가 된다.
  const { samples } = await scanTextStyles([{
    type: 'TEXT', id: 't1', name: 'PxRatio', fontSize: 16, fontName: { family: 'Inter', style: 'Regular' },
    lineHeight: { unit: 'PIXELS', value: 24 },
    letterSpacing: { unit: 'PIXELS', value: 1 },
    characters: 'x', textStyleId: '',
  }]);
  assert.equal(samples[0].lineHeightPercent, 0);
  assert.equal(samples[0].lineHeight, 24);
  assert.equal(samples[0].letterSpacingPercent, 0);
  assert.equal(samples[0].letterSpacing, 1);
});

test('createSemanticTextStyles — px 행간으로 스캔한 스타일은 행간 변수까지 연결한다', async () => {
  const figma = installFigma();
  const { samples } = await scanTextStyles([{
    type: 'TEXT', id: 't1', name: 'Body', fontSize: 16, fontName: { family: 'Inter', style: 'Regular' },
    lineHeight: { unit: 'PIXELS', value: 24 }, letterSpacing: { unit: 'PIXELS', value: 0 },
    characters: 'x', textStyleId: '',
  }]);
  const s = samples[0];
  const r = await createSemanticTextStyles([{
    name: 'body', fontSize: s.fontSize, lineHeight: s.lineHeight, lineHeightPercent: s.lineHeightPercent,
    letterSpacing: s.letterSpacing, family: s.family, style: s.style,
  }]);
  const style = figma._state.textStyles.find((x) => x.name === 'body');
  assert.equal(style.lineHeight.unit, 'PIXELS'); // %로 뒤집히지 않는다
  assert.equal(style.lineHeight.value, 24);
  assert.ok(style.boundVariables?.lineHeight, 'line-height 변수가 연결돼야 한다');
  assert.ok(!r.notes.some((n) => n.includes('연결 안 함'))); // %를 지키느라 변수를 안 붙인 알림이 없어야
});

test('scanTextStyles — 흔하지 않은 px 행간(23px)은 %로 오인하지 않는다', async () => {
  installFigma();
  const { samples } = await scanTextStyles([{
    type: 'TEXT', id: 't1', name: 'Odd', fontSize: 16, fontName: { family: 'Inter', style: 'Regular' },
    lineHeight: { unit: 'PIXELS', value: 23 },
    letterSpacing: { unit: 'PIXELS', value: 1 },
    characters: 'x', textStyleId: '',
  }]);
  assert.equal(samples[0].lineHeightPercent, 0);
  assert.equal(samples[0].lineHeight, 23);
});

test('scanTextStyles — 스타일 없는 환산 px 자간(-0.32)도 정수 %로 복구', async () => {
  installFigma();
  const { samples } = await scanTextStyles([{
    type: 'TEXT', id: 't1', name: 'Ls', fontSize: 16, fontName: { family: 'Inter', style: 'Regular' },
    lineHeight: { unit: 'PIXELS', value: 23 },
    letterSpacing: { unit: 'PIXELS', value: -0.32 },
    characters: 'x', textStyleId: '',
  }]);
  assert.equal(samples[0].letterSpacingPercent, -2);
  assert.equal(samples[0].letterSpacing, -0.32);
});

test('nameTextStyles — 앵커된 기존 % 스타일이면 노드가 px여도 스펙에 %를 싣는다', () => {
  const clusters = [{
    fontSize: 16, lineHeight: 24, lineHeightPercent: 0, letterSpacing: -0.32, letterSpacingPercent: 0,
    family: 'Inter', style: 'Regular', count: 1, sample: 'Body', styleIds: ['style:1'],
  }];
  const existing = [{
    id: 'style:1', name: 'body', fontSize: 16, lineHeight: 24, letterSpacing: -0.32,
    family: 'Inter', style: 'Regular', lineHeightPercent: 150, letterSpacingPercent: -2,
  }];
  const specs = nameTextStyles(clusters, existing);
  assert.equal(specs.length, 1);
  assert.equal(specs[0].boundStyleId, 'style:1');
  assert.equal(specs[0].lineHeightPercent, 150);
  assert.equal(specs[0].letterSpacingPercent, -2);
});

test('createSemanticTextStyles — %자간은 PERCENT로 등록하고 자간 바인딩은 생략', async () => {
  const figma = installFigma();
  const r = await createSemanticTextStyles(
    [{ name: 'body', fontSize: 16, lineHeight: 24, letterSpacing: 0.32, letterSpacingPercent: 2, family: 'Inter', style: 'Regular' }],
  );
  const style = figma._state.textStyles.find((s) => s.name === 'body');
  assert.deepEqual(style.letterSpacing, { value: 2, unit: 'PERCENT' });
  assert.ok(style.boundVariables.fontSize);
  assert.ok(style.boundVariables.lineHeight); // 행간은 px라 바인딩 유지
  assert.equal(style.boundVariables.letterSpacing, undefined);
  assert.equal(r.bound, 2); // fontSize + lineHeight
  assert.deepEqual(r.missing, []);
  assert.ok(r.notes.some((n) => n.includes('2%')));

  // A안: %자간은 변수를 만들지 않는다.
  assert.equal(findVar(figma, 'Global', 'letter-spacing/0_32'), undefined);
  assert.equal(findVar(figma, 'Semantic', 'letter-spacing/body'), undefined);
});

test('createSemanticTextStyles — 음수 %자간도 PERCENT로 등록·바인딩 생략', async () => {
  const figma = installFigma();
  const r = await createSemanticTextStyles(
    [{ name: 'tight', fontSize: 16, lineHeight: 24, letterSpacing: -0.32, letterSpacingPercent: -2, family: 'Inter', style: 'Regular' }],
  );
  const style = figma._state.textStyles.find((s) => s.name === 'tight');
  assert.deepEqual(style.letterSpacing, { value: -2, unit: 'PERCENT' });
  assert.equal(style.boundVariables.letterSpacing, undefined);
  assert.ok(r.notes.some((n) => n.includes('-2%')));
  assert.equal(findVar(figma, 'Global', 'letter-spacing/-0_32'), undefined); // A안: 변수 없음
});

test('createSemanticTextStyles — 기존 %자간 스타일을 rename해도 %가 유지되고 바인딩되지 않는다', async () => {
  const figma = installFigma();
  await createSemanticTextStyles(
    [{ name: 'body', fontSize: 16, lineHeight: 24, letterSpacing: 0.32, letterSpacingPercent: 2, family: 'Inter', style: 'Regular' }],
  );
  const style = figma._state.textStyles.find((s) => s.name === 'body');
  const r = await createSemanticTextStyles(
    [{ name: 'text/base', fontSize: 16, lineHeight: 24, letterSpacing: 0.32, letterSpacingPercent: 2, family: 'Inter', style: 'Regular', boundStyleId: style.id }],
  );
  assert.equal(style.name, 'text/base');
  assert.deepEqual(style.letterSpacing, { value: 2, unit: 'PERCENT' });
  assert.equal(style.boundVariables.letterSpacing, undefined);
  assert.ok(r.notes.some((n) => n.includes('2%')));
});

test('createSemanticTextStyles — 이미 변수가 묶인 스타일은 스캔 %가 와도 연결을 지킨다', async () => {
  const figma = installFigma();
  // 1차: % 없이 px 정수로 등록 → PIXELS + letterSpacing 변수 바인딩(A안: px 정수만 변수)
  await createSemanticTextStyles(
    [{ name: 'body', fontSize: 16, lineHeight: 24, letterSpacing: 1, family: 'Inter', style: 'Regular' }],
  );
  const style = figma._state.textStyles.find((s) => s.name === 'body');
  assert.deepEqual(style.letterSpacing, { value: 1, unit: 'PIXELS' });
  assert.ok(style.boundVariables.letterSpacing, '1차에 자간 변수 연결');

  // 2차: 같은 앵커 + 스캔이 %를 실어 옴. %는 px 값을 보고 세운 추측이고 바인딩은 사실이라,
  // 값을 안 바꾼 재등록이 연결을 끊어선 안 된다 — 교정을 미루고 notes로 알린다.
  const r = await createSemanticTextStyles(
    [{ name: 'body', fontSize: 16, lineHeight: 24, letterSpacing: 1, letterSpacingPercent: 6, family: 'Inter', style: 'Regular', boundStyleId: style.id }],
  );
  assert.deepEqual(style.letterSpacing, { value: 1, unit: 'PIXELS' }); // 그대로
  assert.ok(style.boundVariables.letterSpacing, '연결 유지');
  assert.ok(r.notes.some((n) => n.includes('자간 변수 연결을 지켰어요')));
});

test('createSemanticTextStyles — 묶인 변수가 없으면 스캔 %로 단위를 교정한다', async () => {
  const figma = installFigma();
  // 자간 역할 변수가 없으니 1차 등록에서 바인딩이 생기지 않는다.
  await createSemanticTextStyles(
    [{ name: 'solo', fontSize: 16, lineHeight: 24, letterSpacing: 0.32, family: 'Inter', style: 'Regular' }],
  );
  const style = figma._state.textStyles.find((s) => s.name === 'solo');
  style.boundVariables = {}; // 연결 없는 상태(사용자가 직접 만든 스타일)
  style.letterSpacing = { value: 0.32, unit: 'PIXELS' };

  await createSemanticTextStyles(
    [{ name: 'solo', fontSize: 16, lineHeight: 24, letterSpacing: 0.32, letterSpacingPercent: 2, family: 'Inter', style: 'Regular', boundStyleId: style.id }],
  );
  assert.deepEqual(style.letterSpacing, { value: 2, unit: 'PERCENT' }); // 잃을 게 없으면 교정
});

test('createSemanticTextStyles — 같은 px 자간 이름에 원본이 갈리면 px로 기록', async () => {
  const figma = installFigma();
  const r = await createSemanticTextStyles(
    [
      { name: 'body', fontSize: 16, lineHeight: 24, letterSpacing: 1, letterSpacingPercent: 6, family: 'Inter', style: 'Regular' }, // % → 변수 없음
      { name: 'label', fontSize: 32, lineHeight: 40, letterSpacing: 1, family: 'Inter', style: 'Bold' }, // 같은 1px, 원본은 px → 변수
    ],
  );
  const g = findVar(figma, 'Global', 'letter-spacing/1');
  assert.equal(g.valuesByMode['mode:Global'], 1);
  assert.ok(!g.description);
  assert.ok(!r.notes.some((n) => n.includes('원본이 달라'))); // A안: %는 변수를 안 만드니 충돌이 없다
  assert.ok(findVar(figma, 'Semantic', 'letter-spacing/label'));
  assert.equal(findVar(figma, 'Semantic', 'letter-spacing/body'), undefined);
  assert.deepEqual(figma._state.textStyles.find((s) => s.name === 'body').letterSpacing, { value: 6, unit: 'PERCENT' });
  assert.deepEqual(figma._state.textStyles.find((s) => s.name === 'label').letterSpacing, { value: 1, unit: 'PIXELS' });
});

/* ================= themeApply.ts ================= */
function darkFixture() {
  const figma = installFigma();
  const global = figma.variables.createVariableCollection('Global');
  const semantic = figma.variables.createVariableCollection('Semantic');
  const mkGlobal = (name, hex) => {
    const v = figma.variables.createVariable(name, global, 'COLOR');
    v.scopes = ['FRAME_FILL'];
    v.setValueForMode(global.defaultModeId, hexToRgb(hex));
    return v;
  };
  const mkSemantic = (name) => figma.variables.createVariable(name, semantic, 'COLOR');
  const gVal = (v) => rgbToHex(v.valuesByMode[global.defaultModeId]);
  return { figma, global, semantic, LIGHT: 'mode:light', DARK: 'mode:dark', mkGlobal, mkSemantic, gVal };
}

test('generateDarkMode — Global 별칭 Semantic만 dark/ 짝을 만들어 재별칭', async () => {
  const f = darkFixture();
  const white = f.mkGlobal('color/gray/0', '#ffffff');
  const surface = f.mkSemantic('surface');
  surface.setValueForMode(f.LIGHT, f.figma.variables.createVariableAlias(white));
  // 리터럴 Semantic(별칭 아님)은 3계층 규칙상 대상이 아님
  const brand = f.mkSemantic('brand');
  brand.setValueForMode(f.LIGHT, { r: 1, g: 0, b: 0 });

  const r = await generateDarkMode(f.semantic.id, f.LIGHT, f.DARK);
  assert.deepEqual(r, { created: 1, realiased: 1, skipped: 1 });

  const dark = findVar(f.figma, 'Global', 'dark/color/gray/0');
  assert.ok(dark, 'dark/ 짝 생성');
  // 흰 표면이 순수 검정이 아니라 다크 표면 대역으로 간다(붕괴 방지).
  assert.equal(f.gVal(dark), '#121212');
  assert.equal(dark.hiddenFromPublishing, true, '직접 사용 방지');
  assert.deepEqual(dark.scopes, white.scopes, '스코프 승계');
  assert.deepEqual(surface.valuesByMode[f.DARK], { type: 'VARIABLE_ALIAS', id: dark.id });
  assert.equal(f.gVal(white), '#ffffff', '원본 라이트 값 불변');
  assert.equal(brand.valuesByMode[f.DARK], undefined, '리터럴은 손대지 않음');
});

test('generateDarkMode — 출처가 이미 dark/면 원본을 덮어쓰지 않고 건너뛴다', async () => {
  const f = darkFixture();
  // 모드를 자유롭게 고를 수 있어 from=Dark가 가능하다. 이때 대상 이름이 출처 자신이라
  // 가드가 없으면 dark/ 프리미티브의 값을 밝은 값으로 덮어쓰고 자기 자신을 별칭한다.
  const darkGlobal = f.mkGlobal('dark/color/gray/0', '#121212');
  const surface = f.mkSemantic('surface');
  surface.setValueForMode(f.DARK, f.figma.variables.createVariableAlias(darkGlobal));

  const r = await generateDarkMode(f.semantic.id, f.DARK, f.LIGHT);
  assert.deepEqual(r, { created: 0, realiased: 0, skipped: 1 });
  assert.equal(findVar(f.figma, 'Global', 'dark/dark/color/gray/0'), undefined, 'dark/dark/ 미생성');
  assert.equal(f.gVal(darkGlobal), '#121212', '원본 값 불변');
  assert.equal(surface.valuesByMode[f.LIGHT], undefined, '자기 참조 별칭 미생성');
});

test('ensureDarkMode — 모드 1개면 Dark를 추가하고, 이미 있으면 재사용', () => {
  const figma = installFigma();
  const col = figma.variables.createVariableCollection('Semantic');
  assert.equal(col.modes.length, 1);
  const first = ensureDarkMode(col);
  assert.equal(first.created, true);
  assert.equal(DARK_MODE_NAME, 'Dark');
  assert.equal(col.modes.length, 2);
  assert.equal(col.modes[1].name, 'Dark');
  assert.equal(first.modeId, col.modes[1].modeId);

  const again = ensureDarkMode(col);
  assert.equal(again.created, false);
  assert.equal(again.modeId, first.modeId);
  assert.equal(col.modes.length, 2, '중복 Dark 미추가');

  // 대소문자만 다른 기존 모드도 재사용
  const col2 = figma.variables.createVariableCollection('Other');
  const id = col2.addMode('dark');
  const reused = ensureDarkMode(col2);
  assert.equal(reused.created, false);
  assert.equal(reused.modeId, id);
});

test('generateDarkMode — toModeId 생략 시 Dark 모드를 만든 뒤 채운다', async () => {
  const f = darkFixture();
  const lightId = f.semantic.defaultModeId;
  const white = f.mkGlobal('color/gray/0', '#ffffff');
  const surface = f.mkSemantic('surface');
  surface.setValueForMode(lightId, f.figma.variables.createVariableAlias(white));

  assert.equal(f.semantic.modes.length, 1);
  const r = await generateDarkMode(f.semantic.id, lightId);
  assert.equal(r.modeCreated, true);
  assert.equal(r.created, 1);
  assert.equal(r.realiased, 1);
  assert.equal(f.semantic.modes.length, 2);
  const darkMode = f.semantic.modes.find((m) => m.name === 'Dark');
  assert.ok(darkMode);
  const dark = findVar(f.figma, 'Global', 'dark/color/gray/0');
  assert.deepEqual(surface.valuesByMode[darkMode.modeId], { type: 'VARIABLE_ALIAS', id: dark.id });

  // 두 번째 실행은 모드를 다시 만들지 않는다
  const r2 = await generateDarkMode(f.semantic.id, lightId);
  assert.equal(r2.modeCreated, undefined);
  assert.equal(f.semantic.modes.length, 2);
});

test('generateDarkMode — 한 값도 못 채우면 만든 Dark 모드를 도로 걷는다', async () => {
  const f = darkFixture();
  const lightId = f.semantic.defaultModeId;
  // Global 별칭이 아니라 리터럴 색인 Semantic — generateDarkMode가 통째로 건너뛰는 경우.
  const surface = f.mkSemantic('surface');
  surface.setValueForMode(lightId, { r: 1, g: 1, b: 1 });

  assert.equal(f.semantic.modes.length, 1);
  const r = await generateDarkMode(f.semantic.id, lightId);
  assert.equal(r.realiased, 0);
  assert.equal(r.skipped, 1);
  // 빈 모드를 남기면 postPrereq가 '모드 2개 = 다크 있음'으로 읽어 준비 현황을 완료로 뒤집는다.
  assert.equal(f.semantic.modes.length, 1);
  assert.equal(r.modeCreated, undefined);
});

/* ================= artwork.ts (그림 슬롯 이식) ================= */
/** 최소 씬그래프 목 — clone은 실물처럼 **형제로** 끼운다(코드가 즉시 페이지로 옮기는지 본다). */
function sceneMock() {
  let seq = 0;
  const detach = (n) => {
    if (n.parent) n.parent.children.splice(n.parent.children.indexOf(n), 1);
    n.parent = null;
  };
  const mk = (props = {}) => {
    const n = {
      id: `n${seq++}`,
      name: 'node',
      type: 'FRAME',
      x: 0,
      y: 0,
      width: 16,
      height: 16,
      fills: [],
      parent: null,
      removed: false,
      ...props,
      children: [], // 스프레드 뒤에 새 배열로 — props.children을 그대로 쓰면 아래 appendChild가 같은 배열에 또 담는다
      appendChild(c) { detach(c); c.parent = this; this.children.push(c); },
      insertChild(i, c) { detach(c); c.parent = this; this.children.splice(i, 0, c); },
      resize(w, h) { this.width = w; this.height = h; },
      remove() { detach(this); this.removed = true; },
      clone() {
        const copy = mk({ ...this, id: `n${seq++}`, children: [], parent: null });
        for (const k of this.children) copy.appendChild(k.clone());
        if (this.parent) this.parent.appendChild(copy); // 실물: 같은 부모의 형제로 들어온다
        return copy;
      },
    };
    for (const c of props.children ?? []) n.appendChild(c);
    return n;
  };
  const page = mk({ name: 'Components', type: 'PAGE' });
  globalThis.figma = {
    createComponentFromNode(node) {
      node.type = 'COMPONENT';
      node.key = `key:${node.id}`;
      node.createInstance = function () {
        const inst = mk({ ...this, id: `n${seq++}`, type: 'INSTANCE', children: [], parent: null, mainComponent: this });
        for (const k of this.children) inst.appendChild(k.clone());
        page.appendChild(inst);
        return inst;
      };
      return node;
    },
  };
  return { mk, page };
}

test('createIconRegistry — 지문별 1개 · 복제본을 멤버 트리 밖으로 즉시 꺼낸다', () => {
  const { mk, page } = sceneMock();
  const placed = [];
  const failures = [];
  const reg = createIconRegistry({
    page,
    place: (c) => placed.push(c),
    uniqueName: (b) => (placed.length ? `${b}${placed.length + 1}` : b),
    onFailure: (m) => failures.push(m),
  });

  const heart = mk({ name: 'icon', type: 'VECTOR' });
  const star = mk({ name: 'icon', type: 'VECTOR' });
  const cardA = mk({ name: 'card', children: [heart, mk({ name: 'label', type: 'TEXT' })] });
  const cardB = mk({ name: 'card', children: [star, mk({ name: 'label', type: 'TEXT' })] });

  const a = reg.ensure('k1', heart, 'Icon');
  const b = reg.ensure('k2', star, 'Icon');
  const again = reg.ensure('k1', heart, 'Icon');

  assert.equal(reg.created(), 2); // 같은 지문은 다시 만들지 않는다
  assert.equal(again, a);
  assert.notEqual(a, b);
  assert.deepEqual(placed.map((c) => c.name), ['Icon', 'Icon2']);
  assert.equal(a.type, 'COMPONENT');
  // 복제본이 멤버 안에 남으면 뒤따르는 슬롯의 인덱스 경로가 어긋난다 — 자식 수는 그대로여야 한다.
  assert.equal(cardA.children.length, 2);
  assert.equal(cardB.children.length, 2);
  assert.equal(reg.get('k1'), a);
  assert.equal(reg.get('없는키'), null);
  assert.deepEqual(failures, []);
});

test('swapVectorSlots — 벡터 자리를 아이콘 인스턴스로(자리·이름·크기 유지)', () => {
  const { mk, page } = sceneMock();
  const reg = createIconRegistry({ page, place: () => {}, uniqueName: (b) => b, onFailure: () => {} });
  const icon = reg.ensure('k1', mk({ name: 'icon', type: 'VECTOR' }), 'Icon');

  const vector = mk({ name: 'icon-heart', type: 'VECTOR', width: 20, height: 20, x: 4, y: 6 });
  const master = mk({
    name: 'Chip',
    type: 'COMPONENT',
    layoutMode: 'NONE',
    children: [mk({ name: 'label', type: 'TEXT' }), vector, mk({ name: 'tail', type: 'TEXT' })],
  });

  const failures = swapVectorSlots(master, [{ layerName: 'icon-heart', layerPath: '1', icon }]);
  assert.deepEqual(failures, []);
  assert.equal(master.children.length, 3); // 자식 수 유지 → 다른 슬롯 경로가 살아 있다
  const slot = master.children[1];
  assert.equal(slot.type, 'INSTANCE');
  assert.equal(slot.mainComponent, icon);
  assert.equal(slot.name, 'icon-heart'); // 원래 레이어 이름 보존
  assert.deepEqual([slot.width, slot.height, slot.x, slot.y], [20, 20, 4, 6]);
  assert.equal(vector.removed, true);
  assert.deepEqual(master.children.map((c) => c.name), ['label', 'icon-heart', 'tail']);
});

test('swapVectorSlots — 아이콘을 못 만들었으면 원본을 그대로 둔다(사유 보고)', () => {
  const { mk } = sceneMock();
  const vector = mk({ name: 'icon', type: 'VECTOR' });
  const master = mk({ name: 'Chip', type: 'COMPONENT', children: [vector] });
  const failures = swapVectorSlots(master, [{ layerName: 'icon', layerPath: '0', icon: null }]);
  assert.equal(failures.length, 1);
  assert.match(failures[0], /아이콘 자리 교체 실패/);
  assert.equal(master.children[0], vector); // 그림을 잃지 않는다
  assert.equal(vector.removed, false);
});

test('transplantImageFills — 인스턴스의 같은 경로에 원본 사진 fill을 이식', () => {
  const { mk } = sceneMock();
  const photo = [{ type: 'IMAGE', imageHash: 'h2', visible: true }];
  const inst = mk({
    name: 'Card',
    type: 'INSTANCE',
    children: [mk({ name: 'body', children: [mk({ name: 'thumbnail', type: 'RECTANGLE', fills: [{ type: 'IMAGE', imageHash: 'h1' }] })] })],
  });

  const ok = transplantImageFills(inst, { '0/0': photo });
  assert.equal(ok.applied, 1);
  assert.deepEqual(ok.failures, []);
  assert.deepEqual(inst.children[0].children[0].fills, photo);

  // 자리를 못 찾으면 조용히 넘어가지 않고 사유를 남긴다(사진이 마스터 것으로 통일된 셈).
  const bad = transplantImageFills(inst, { '9/9': photo });
  assert.equal(bad.applied, 0);
  assert.equal(bad.failures.length, 1);
  assert.match(bad.failures[0], /사진 이식 실패/);
});

/* ================= 플러그인 컬렉션 · 사용자 컬렉션(§2.13, A.12) ================= */
const withRoot = (figma) => {
  const data = {};
  figma.root = { getPluginData: (k) => data[k] ?? '', setPluginData: (k, v) => { data[k] = v; } };
  return data;
};
const rgbOf = (hex) => ({ r: parseInt(hex.slice(1, 3), 16) / 255, g: parseInt(hex.slice(3, 5), 16) / 255, b: parseInt(hex.slice(5, 7), 16) / 255 });
const colorTok = (hex, use = 'color/background') => ({ name: `color/${hex.slice(1)}`, category: 'color', sources: ['fill'], value: hex, uses: [{ name: use, count: 1 }] });

test('플러그인 컬렉션 — 이름 Global(표시 없음)은 이어받아 표시를 달고 그 안에 만든다, 같은 이름 둘이면 첫 번째', async () => {
  const figma = installFigma();
  withRoot(figma);
  const g1 = figma.variables.createVariableCollection('Global');
  const g2 = figma.variables.createVariableCollection('Global');
  await createTokens([{ name: 'spacing/8', category: 'gap', sources: ['gap'], value: 8 }], 16);
  const v = figma._state.variables.find((x) => x.name === 'spacing/8');
  assert.equal(v.variableCollectionId, g1.id);
  assert.equal(g1._pd['dsl.owned'], 'global');
  assert.equal(g2._pd['dsl.owned'], undefined);
  assert.equal(figma._state.collections.length, 2); // 새로 만들지 않음
});

test('플러그인 컬렉션 — 이름을 Global로 바꾼 플러그인 Semantic은 이어받지 않고 새 Global을 만든다 · 예전 계층 지정은 무시', async () => {
  const figma = installFigma();
  const data = withRoot(figma);
  const ps = figma.variables.createVariableCollection('Global');
  ps.setPluginData('dsl.owned', 'semantic');
  const prim = figma.variables.createVariableCollection('Primitives');
  data['dsl.collectionRoles'] = JSON.stringify({ [prim.id]: 'global' }); // 예전 지정 — 읽지 않는다
  await createTokens([{ name: 'spacing/8', category: 'gap', sources: ['gap'], value: 8 }], 16);
  const v = figma._state.variables.find((x) => x.name === 'spacing/8');
  const col = figma._state.collections.find((c) => c.id === v.variableCollectionId);
  assert.notEqual(col.id, ps.id);
  assert.notEqual(col.id, prim.id);
  assert.equal(col.name, 'Global');
  assert.equal(col._pd['dsl.owned'], 'global');
});

test('만들기 — 쓰임이 있는 토큰은 같은 값 사용자 Global을 재사용(플러그인 Global 안 생김) · 역할은 플러그인 Semantic에서 사용자 Global을 가리킴 · reuseMap', async () => {
  const figma = installFigma();
  const data = withRoot(figma);
  const prim = figma.variables.createVariableCollection('Primitives');
  const blue = figma.variables.createVariable('blue/500', prim, 'COLOR');
  blue.scopes = ['ALL_SCOPES'];
  blue.setValueForMode(prim.defaultModeId, rgbOf('#0066ff'));
  const before = figma._state.variables.filter((v) => v.variableCollectionId === prim.id).length;
  const toks = [colorTok('#0066ff')];
  const s = await createTokens(toks, 16);
  assert.equal(s.created, 0);
  assert.equal(s.globals, 0); // 재사용은 세지 않는다
  assert.equal(s.globalOf.get('color/0066ff'), blue.id);
  assert.equal(figma._state.collections.some((c) => c.name === 'Global'), false);
  assert.equal(JSON.parse(data['dsl.reuseMap'])['color/0066ff'], blue.id);
  const roles = await createUsageRoles(toks, false, s.globalOf);
  assert.equal(roles, 1);
  const sem = figma._state.collections.find((c) => c._pd['dsl.owned'] === 'semantic');
  assert.ok(sem);
  const role = figma._state.variables.find((v) => v.variableCollectionId === sem.id);
  assert.deepEqual(role.valuesByMode[sem.defaultModeId], { type: 'VARIABLE_ALIAS', id: blue.id });
  // 사용자 컬렉션에 변수 · 모드가 늘지 않는다
  assert.equal(figma._state.variables.filter((v) => v.variableCollectionId === prim.id).length, before);
  assert.equal(prim.modes.length, 1);
  // 미리보기도 같은 판단 — 재사용은 생성 수에 넣지 않는다
  const pv = await previewCreateTokens(toks, 16);
  assert.equal(pv.created + pv.updated, 0);
});

test('만들기 — 쓰임이 없는 토큰(글자 등)은 같은 값 사용자 Global이 있어도 플러그인 Global에 만든다', async () => {
  const figma = installFigma();
  withRoot(figma);
  const prim = figma.variables.createVariableCollection('Primitives');
  const n = figma.variables.createVariable('size/16', prim, 'FLOAT');
  n.scopes = ['ALL_SCOPES'];
  n.setValueForMode(prim.defaultModeId, 16);
  const s = await createTokens([{ name: 'font-size/16', category: 'fontSize', sources: ['fontSize'], value: 16 }], 16);
  assert.equal(s.created, 1);
  assert.equal(findVar(figma, 'Global', 'font-size/16').variableCollectionId !== prim.id, true);
});

test('역할 매핑 표 — 이름은 직접 값 Global에서, 없으면 reuseMap(별칭으로 바뀐 항목은 버림) · 플러그인 Semantic에 만든다', async () => {
  const figma = installFigma();
  const data = withRoot(figma);
  const prim = figma.variables.createVariableCollection('Primitives');
  const blue = figma.variables.createVariable('blue/500', prim, 'COLOR');
  blue.scopes = ['ALL_SCOPES'];
  blue.setValueForMode(prim.defaultModeId, rgbOf('#0066ff'));
  const red = figma.variables.createVariable('red/500', prim, 'COLOR');
  red.setValueForMode(prim.defaultModeId, rgbOf('#ff0000'));
  for (let i = 0; i < 6; i++) figma.variables.createVariable(`x/${i}`, prim, 'FLOAT').setValueForMode(prim.defaultModeId, i);
  data['dsl.reuseMap'] = JSON.stringify({ 'color/0066ff': blue.id, 'color/ff0000': red.id });
  // red를 별칭으로 바꾸면 그 항목은 낡은 것 — 쓰지 않는다
  red.setValueForMode(prim.defaultModeId, { type: 'VARIABLE_ALIAS', id: blue.id });
  const r = await createSemanticAliases({ 'color/background/default': 'color/0066ff', 'color/text/default': 'color/ff0000', 'color/border/default': 'red/500' });
  assert.deepEqual(r.missing.sort(), ['color/ff0000', 'red/500']); // 별칭 변수는 이름이 같아도 쓰지 않는다
  const sem = figma._state.collections.find((c) => c._pd['dsl.owned'] === 'semantic');
  const made = figma._state.variables.find((v) => v.variableCollectionId === sem.id && v.name === 'color/background/default');
  assert.deepEqual(made.valuesByMode[sem.defaultModeId], { type: 'VARIABLE_ALIAS', id: blue.id });
});

test('연결 — 새 역할은 플러그인 Semantic에, 별칭 대상은 사용자 Global 먼저 · 플러그인 Global의 별칭 변수는 대상 아님', async () => {
  const figma = installFigma();
  withRoot(figma);
  const g = figma.variables.createVariableCollection('Global'); // 이어받을 플러그인 Global
  const shortcut = figma.variables.createVariable('a/shortcut', g, 'COLOR'); // 별칭 변수(이름 순 첫 번째)
  const pg = figma.variables.createVariable('b/blue', g, 'COLOR');
  pg.setValueForMode(g.defaultModeId, rgbOf('#aa0000'));
  shortcut.setValueForMode(g.defaultModeId, { type: 'VARIABLE_ALIAS', id: pg.id });
  const prim = figma.variables.createVariableCollection('Primitives');
  const up = figma.variables.createVariable('z/red', prim, 'COLOR');
  up.setValueForMode(prim.defaultModeId, rgbOf('#aa0000'));
  for (const v of [shortcut, pg, up]) v.scopes = ['ALL_SCOPES'];
  const node = {
    type: 'FRAME', id: 'n', name: 'n',
    fills: [{ type: 'SOLID', color: { r: 0.6667, g: 0, b: 0 } }],
    layoutMode: 'NONE', layoutSizingHorizontal: 'HUG', layoutSizingVertical: 'HUG',
    boundVariables: {}, setBoundVariable() {}, children: [],
  };
  const dry = await bindSelection([node], false);
  assert.equal(dry.candidates.length, 1);
  assert.equal(dry.candidates[0].newRole.globalId, up.id); // 사용자 Global 먼저
  // 사용자 Global이 없으면 플러그인 Global의 직접 값 변수(별칭 shortcut 아님)
  up.remove();
  const dry2 = await bindSelection([node], false);
  assert.equal(dry2.candidates[0].newRole.globalId, pg.id);
});

test('다크 — 플러그인 Semantic이 아니면 오류(바꾸지 않음) · 라이트 값은 사용자 Global의 기본 모드에서 읽고 dark/는 플러그인 Global에', async () => {
  const figma = installFigma();
  withRoot(figma);
  const prim = figma.variables.createVariableCollection('Primitives');
  const white = figma.variables.createVariable('gray/0', prim, 'COLOR');
  white.setValueForMode(prim.defaultModeId, rgbOf('#ffffff'));
  const tokens = figma.variables.createVariableCollection('Tokens'); // 사용자 Semantic
  const ut = figma.variables.createVariable('bg', tokens, 'COLOR');
  ut.setValueForMode(tokens.defaultModeId, { type: 'VARIABLE_ALIAS', id: white.id });
  const bad = await generateDarkMode(tokens.id);
  assert.ok(bad.error);
  assert.equal(tokens.modes.length, 1);
  const sem = figma.variables.createVariableCollection('Semantic'); // 이어받을 플러그인 Semantic
  const s1 = figma.variables.createVariable('color/background/default', sem, 'COLOR');
  s1.setValueForMode(sem.defaultModeId, { type: 'VARIABLE_ALIAS', id: white.id });
  const r = await generateDarkMode(sem.id);
  assert.equal(r.realiased, 1);
  const dark = figma._state.variables.find((v) => v.name === 'dark/gray/0');
  const dcol = figma._state.collections.find((c) => c.id === dark.variableCollectionId);
  assert.equal(dcol._pd['dsl.owned'], 'global');
  assert.notEqual(dcol.id, prim.id);
});

test('팔레트 정리 — 플러그인 컬렉션 안에서만 지운다(사용자 컬렉션의 같은 패밀리 색은 보존)', async () => {
  const figma = installFigma();
  withRoot(figma);
  const g = figma.variables.createVariableCollection('Global');
  const prim = figma.variables.createVariableCollection('Primitives');
  figma.variables.createVariable('color/blue/100', g, 'COLOR').setValueForMode(g.defaultModeId, rgbOf('#ddeeff'));
  figma.variables.createVariable('color/blue/100', prim, 'COLOR').setValueForMode(prim.defaultModeId, rgbOf('#ddeeff'));
  const removed = await prunePaletteColors(['color/blue/500']);
  assert.equal(removed, 1);
  assert.equal(figma._state.variables.filter((v) => v.variableCollectionId === prim.id).length, 1);
});

/* ---------- IA v3 §4.4: 변수 사용 수(보기 전용) — 인스턴스 안쪽 포함, 숨김 제외, 상한 없음 ---------- */
test('countUsage — 인스턴스 안쪽까지 세고 숨긴 레이어는 뺀다, 곳·레이어 수', async () => {
  const leaf = (id, varId, extra = {}) => ({ type: 'RECTANGLE', id, name: id, visible: true, fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, boundVariables: { color: { type: 'VARIABLE_ALIAS', id: varId } } }], boundVariables: {}, ...extra });
  const inst = { type: 'INSTANCE', id: 'i', name: 'i', visible: true, boundVariables: {}, children: [leaf('in1', 'vA')] };
  const hidden = { ...leaf('h', 'vA'), visible: false };
  const two = { ...leaf('two', 'vA'), boundVariables: { itemSpacing: { type: 'VARIABLE_ALIAS', id: 'vB' }, paddingLeft: { type: 'VARIABLE_ALIAS', id: 'vB' } } };
  const root = { type: 'FRAME', id: 'r', name: 'r', visible: true, boundVariables: {}, children: [inst, hidden, two], parent: null };
  const r = countUsage([root]);
  assert.deepEqual(r.usage.get('vA'), { places: 2, layers: 2 }); // in1(인스턴스 안쪽) + two, 숨긴 h 제외
  assert.deepEqual(r.usage.get('vB'), { places: 2, layers: 1 }); // 한 레이어의 두 자리
  assert.deepEqual(r.nodesById.get('vA').sort(), ['in1', 'two']);
  assert.equal(r.scanned, 4); // r, i, in1, two
});
test('countUsage · findUsers — 700곳도 상한 없이 센다', async () => {
  const kids = Array.from({ length: 700 }, (_, i) => ({ type: 'RECTANGLE', id: `n${i}`, name: `n${i}`, visible: true, fills: [], boundVariables: { width: { type: 'VARIABLE_ALIAS', id: 'vW' } } }));
  const root = { type: 'FRAME', id: 'r', name: 'r', visible: true, boundVariables: {}, children: kids, parent: null };
  assert.deepEqual(countUsage([root]).usage.get('vW'), { places: 700, layers: 700 });
  const f = findUsers([root], new Set(['vW', 'other']));
  assert.equal(f.nodes.length, 700);
  assert.equal(f.places, 700);
});

/* ---------- IA v4 §4.1 카드 3 — 삭제된 변수 연결 풀기 ---------- */
test('boundVariableIds — 글자 구간 배열은 모든 원소를 읽는다(IA v4 B.1)', () => {
  const t = { type: 'TEXT', id: 't', name: 't', visible: true, fills: [], boundVariables: { fontSize: [{ type: 'VARIABLE_ALIAS', id: 'vA' }, { type: 'VARIABLE_ALIAS', id: 'vDel' }] } };
  assert.deepEqual(boundVariableIds(t).sort(), ['vA', 'vDel']);
});
test('deletedBindings · countDeleted · unbindDeleted — 삭제된 자리만, 살아 있는 연결은 그대로', async () => {
  installFigma();
  const alias = (id) => ({ type: 'VARIABLE_ALIAS', id });
  const unboundFields = [];
  const ranges = [];
  const rect = {
    type: 'RECTANGLE', id: 'r1', name: 'r1', visible: true,
    fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, boundVariables: { color: alias('vDel') } }, { type: 'SOLID', color: { r: 1, g: 1, b: 1 }, boundVariables: { color: alias('vLive') } }],
    strokes: [],
    effects: [{ type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 1 }, boundVariables: { color: alias('vDel') } }],
    boundVariables: { width: alias('vDel'), height: alias('vLive'), layoutGrids: [alias('vDel')] },
    setBoundVariable(f, v) { if (v === null) { unboundFields.push(f); delete this.boundVariables[f]; } },
  };
  const text = {
    type: 'TEXT', id: 't1', name: 't1', visible: true, characters: 'abcd', fontName: { family: 'Inter', style: 'Regular' },
    fills: [], boundVariables: { fontSize: [alias('vLive'), alias('vDel')], textRangeFills: [alias('vDel')] },
    getRangeAllFontNames: () => [{ family: 'Inter', style: 'Regular' }],
    getStyledTextSegments: () => [{ start: 0, end: 2, boundVariables: { fontSize: alias('vLive') } }, { start: 2, end: 4, boundVariables: { fontSize: alias('vDel') } }],
    setRangeBoundVariable(s, e, f, v) { ranges.push([s, e, f, v]); },
    setBoundVariable() { throw new Error('구간 속성에 레이어 전체를 부르면 안 됨'); },
  };
  const hidden = { ...rect, id: 'h', visible: false };
  const root = { type: 'FRAME', id: 'root', name: 'root', visible: true, fills: [], boundVariables: {}, children: [rect, text, hidden], parent: null };
  const del = new Set(['vDel']);
  const places = deletedBindings(rect, del);
  assert.deepEqual(places.map((p) => p.kind).sort(), ['effect', 'field', 'paint']); // layoutGrids는 범위 밖
  assert.deepEqual(deletedBindings(text, del), [{ kind: 'range', field: 'fontSize', start: 2, end: 4 }]); // textRangeFills는 범위 밖
  assert.deepEqual(countDeleted([root], del), { count: 4, nodeIds: ['t1', 'r1'] }); // 숨긴 레이어 제외
  const r = await unbindDeleted([root], del);
  assert.deepEqual(r, { unbound: 4, failed: 0, failReasons: {} });
  assert.equal(rect.fills[0].boundVariables.color, undefined);
  assert.equal(rect.fills[1].boundVariables.color.id, 'vLive'); // 살아 있는 연결은 그대로
  assert.equal(rect.effects[0].boundVariables.color, undefined);
  assert.deepEqual(unboundFields, ['width']);
  assert.equal(rect.boundVariables.height.id, 'vLive');
  assert.deepEqual(ranges, [[2, 4, 'fontSize', null]]);
});

/* ================= IA v3 §2.11 — 레이어에 하는 일 ================= */
test('bindSelection — 색 "같은 값": 투명도 ≠ 1인 색 변수는 대상에서 빠지고 같은 색의 불투명 변수에 붙음', async () => {
  const figma = installFigma();
  await createTokens([{ name: 'color/000000', category: 'color', sources: ['fill'], value: '#000000' }], 16);
  const g = figma._state.collections.find((c) => c.name === 'Global');
  // 같은 #000000이지만 alpha 0.5 — 높은 tier여도 대상이 아니다.
  const comp = figma.variables.createVariableCollection('Component');
  const half = figma.variables.createVariable('scrim', comp, 'COLOR');
  half.scopes = ['ALL_SCOPES'];
  half.setValueForMode(comp.defaultModeId, { r: 0, g: 0, b: 0, a: 0.5 });
  const mk = (id) => ({ type: 'FRAME', id, name: id, fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }], layoutMode: 'NONE', setBoundVariable() {} });

  const a = mk('a');
  await bindSelection([a]);
  assert.equal(roleTarget(figma, a.fills[0].boundVariables.color.id), findVar(figma, 'Global', 'color/000000').id);

  // 불투명 변수가 없으면 '매칭 없음'
  findVar(figma, 'Global', 'color/000000').remove();
  const b = mk('b');
  const r = await bindSelection([b]);
  assert.equal(b.fills[0].boundVariables, undefined);
  assert.equal(r.reasons['no-match'], 1);
  assert.ok(g); // Global 컬렉션은 그대로
});

test('bindSelection — 스타일이 붙은 칠하기·선·효과·글자는 "스타일 사용 중"으로 건너뜀(mixed 포함)', async () => {
  const figma = installFigma();
  await createTokens(
    [
      { name: 'color/000000', category: 'color', sources: ['fill', 'stroke', 'effectColor'], value: '#000000' },
      { name: 'font-size/16', category: 'fontSize', sources: ['fontSize'], value: 16 },
    ],
    16,
  );
  const black = () => ({ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, visible: true });
  const frame = {
    type: 'FRAME', id: 'f', name: 'f', layoutMode: 'NONE',
    fills: [black()], fillStyleId: 'S:fill',
    strokes: [black()], strokeStyleId: '', // 스타일 없음 → 붙는다
    effects: [{ type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 1 }, visible: true }], effectStyleId: 'S:fx',
    setBoundVariable() {},
  };
  const text = {
    type: 'TEXT', id: 't', name: 't', characters: 'Hi', fontSize: 16, fontName: { family: 'Inter', style: 'Regular' },
    lineHeight: { unit: 'AUTO' }, letterSpacing: { unit: 'PERCENT', value: 0 },
    fills: [black()], fillStyleId: figma.mixed, textStyleId: 'S:text',
    setRangeBoundVariable() { throw new Error('붙이면 안 됨'); },
  };
  const dry = await bindSelection([frame, text], false);
  assert.deepEqual(dry.candidates.map((c) => `${c.nodeId}.${c.field}`), ['f.strokes']);
  assert.equal(dry.reasons.styled, 4); // f.fills · f.effects · t.fills(mixed) · t.fontSize
  assert.deepEqual(
    dry.skips.filter((s) => s.reason === 'styled').map((s) => s.nodeId).sort(),
    ['f', 't'],
  );
  await bindSelection([frame, text]);
  assert.equal(frame.fills[0].boundVariables, undefined);
  assert.equal(frame.effects[0].boundVariables, undefined);
  assert.ok(frame.strokes[0].boundVariables.color);
  assert.equal(text.fills[0].boundVariables, undefined);
});

/** 체크한 자리 연결용 노드 등록(getNodeByIdAsync). */
function registerNodes(figma, nodes) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  figma.getNodeByIdAsync = async (id) => byId.get(id) ?? null;
}

test('bindSelectedItems — 연결 직전 다시 확인: 붙음·삭제된 변수·스타일·값 변화·투명도 다름은 건너뛰고 사유로 돌려줌, 같은 투명도면 연결', async () => {
  const figma = installFigma();
  await createTokens(
    [
      { name: 'color/0066ff', category: 'color', sources: ['fill'], value: '#0066ff' },
      { name: 'color/0066ff-a50', category: 'color', sources: ['fill'], value: '#0066ff', alpha: 0.5 },
      { name: 'spacing/8', category: 'gap', sources: ['gap'], value: 8 },
      { name: 'font-size/16', category: 'fontSize', sources: ['fontSize'], value: 16 },
    ],
    16,
  );
  const blue = findVar(figma, 'Global', 'color/0066ff');
  const blue50 = findVar(figma, 'Global', 'color/0066ff-a50');
  const sp8 = findVar(figma, 'Global', 'spacing/8');
  const fs16 = findVar(figma, 'Global', 'font-size/16');
  const mkFrame = (id, extra = {}) => ({
    type: 'FRAME', id, name: id, layoutMode: 'VERTICAL', itemSpacing: 8,
    fills: [{ type: 'SOLID', color: { r: 0, g: 0.4, b: 1 } }],
    boundVariables: {},
    setBoundVariable(field, v) { this.boundVariables[field] = { type: 'VARIABLE_ALIAS', id: v.id }; },
    ...extra,
  });
  const ok = mkFrame('ok');
  const bound = mkFrame('bound', { boundVariables: { itemSpacing: { type: 'VARIABLE_ALIAS', id: sp8.id } } });
  const deleted = mkFrame('deleted', { boundVariables: { itemSpacing: { type: 'VARIABLE_ALIAS', id: 'VariableID:gone' } } });
  const styled = mkFrame('styled', { fillStyleId: 'S:1' });
  const changed = mkFrame('changed', { itemSpacing: 9, fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }] });
  const translucent = mkFrame('translucent', { fills: [{ type: 'SOLID', color: { r: 0, g: 0.4, b: 1 }, opacity: 0.5 }] });
  const half = mkFrame('half', { fills: [{ type: 'SOLID', color: { r: 0, g: 0.4, b: 1 }, opacity: 0.5 }] }); // 같은 투명도 변수 → 연결
  const zero = mkFrame('zero', { fills: [{ type: 'SOLID', color: { r: 0, g: 0.4, b: 1 }, opacity: 0.001 }] }); // 투명도 0으로 바뀜 → changed
  const ranges = [];
  const partial = {
    type: 'TEXT', id: 'partial', name: 'partial', characters: 'Hello', fontSize: 16, fontName: { family: 'Inter', style: 'Regular' },
    lineHeight: { unit: 'AUTO' }, letterSpacing: { unit: 'PIXELS', value: 0 }, fills: [], textStyleId: '',
    boundVariables: { fontSize: [{ type: 'VARIABLE_ALIAS', id: fs16.id }] }, // 앞 구간에만 붙음
    setRangeBoundVariable(s, e, f, v) { ranges.push([s, e, f, v.id]); },
  };
  const text = { ...partial, id: 'text', name: 'text', boundVariables: {} };
  registerNodes(figma, [ok, bound, deleted, styled, changed, translucent, half, zero, partial, text]);

  const items = [
    { nodeId: 'ok', field: 'fills', index: 0, variableId: blue.id },
    { nodeId: 'ok', field: 'itemSpacing', variableId: sp8.id },
    { nodeId: 'bound', field: 'itemSpacing', variableId: sp8.id },
    { nodeId: 'deleted', field: 'itemSpacing', variableId: sp8.id },
    { nodeId: 'styled', field: 'fills', index: 0, variableId: blue.id },
    { nodeId: 'changed', field: 'itemSpacing', variableId: sp8.id },
    { nodeId: 'changed', field: 'fills', index: 0, variableId: blue.id },
    { nodeId: 'changed', field: 'fills', index: 3, variableId: blue.id }, // 칠하기 자리가 없어짐
    { nodeId: 'translucent', field: 'fills', index: 0, variableId: blue.id }, // 50% 칠 + 불투명 변수 → changed
    { nodeId: 'half', field: 'fills', index: 0, variableId: blue50.id },
    { nodeId: 'zero', field: 'fills', index: 0, variableId: blue.id },
    { nodeId: 'partial', field: 'fontSize', variableId: fs16.id },
    { nodeId: 'text', field: 'fontSize', variableId: fs16.id },
    { nodeId: 'gone', field: 'width', variableId: sp8.id }, // 레이어가 없어짐
  ];
  const r = await bindSelectedItems(items);
  assert.equal(r.bound, 4); // ok.fills · ok.itemSpacing · half.fills · text.fontSize
  assert.deepEqual(r.reasons, { 'already-bound': 2, 'deleted-var': 1, styled: 1, changed: 6 });
  assert.equal(r.skipped, 10);
  assert.equal(half.fills[0].boundVariables.color.id, blue50.id);
  assert.equal(half.fills[0].opacity, 0.5, '레이어 값 그대로');
  assert.equal(zero.fills[0].boundVariables, undefined);
  assert.equal(ok.fills[0].boundVariables.color.id, blue.id);
  assert.equal(ok.boundVariables.itemSpacing.id, sp8.id);
  assert.equal(bound.boundVariables.itemSpacing.id, sp8.id);
  assert.equal(deleted.boundVariables.itemSpacing.id, 'VariableID:gone'); // 덮어쓰지 않음
  assert.equal(styled.fills[0].boundVariables, undefined);
  assert.equal(translucent.fills[0].boundVariables, undefined);
  assert.deepEqual(ranges, [[0, 5, 'fontSize', fs16.id]]); // 일부 구간이 붙은 글자는 채우지 않음
  // 칩용 레이어 목록 — 노드×사유, 필드 포함
  const keyed = r.skips.map((s) => `${s.nodeId}:${s.reason}`).sort();
  assert.deepEqual(keyed, ['bound:already-bound', 'changed:changed', 'deleted:deleted-var', 'partial:already-bound', 'styled:styled', 'translucent:changed', 'zero:changed']);
  assert.equal(r.skips.find((s) => s.nodeId === 'styled').field, 'fills');
});

test('bindSelectedItems — 숫자는 소수 둘째 자리까지 같으면 연결, 색 변수 투명도가 바뀌었으면 changed', async () => {
  const figma = installFigma();
  await createTokens(
    [
      { name: 'color/0066ff', category: 'color', sources: ['fill'], value: '#0066ff' },
      { name: 'spacing/16', category: 'gap', sources: ['gap'], value: 16 },
    ],
    16,
  );
  const blue = findVar(figma, 'Global', 'color/0066ff');
  const sp = findVar(figma, 'Global', 'spacing/16');
  const n = {
    type: 'FRAME', id: 'n', name: 'n', layoutMode: 'VERTICAL', itemSpacing: 15.9999, paddingLeft: 16.02,
    fills: [{ type: 'SOLID', color: { r: 0, g: 0.4, b: 1 } }], boundVariables: {},
    setBoundVariable(field, v) { this.boundVariables[field] = { type: 'VARIABLE_ALIAS', id: v.id }; },
  };
  registerNodes(figma, [n]);
  const g = figma._state.collections.find((c) => c.name === 'Global');
  blue.setValueForMode(g.defaultModeId, { r: 0, g: 0.4, b: 1, a: 0.8 }); // 미리보기 뒤 변수 투명도가 바뀜
  const r = await bindSelectedItems([
    { nodeId: 'n', field: 'itemSpacing', variableId: sp.id },
    { nodeId: 'n', field: 'paddingLeft', variableId: sp.id },
    { nodeId: 'n', field: 'fills', index: 0, variableId: blue.id },
  ]);
  assert.equal(r.bound, 1);
  assert.equal(n.boundVariables.itemSpacing.id, sp.id);
  assert.equal(n.boundVariables.paddingLeft, undefined);
  assert.equal(r.reasons.changed, 2);
});

/* ---- 찾기 · 연결의 수(§4.6, 2026-11-05) — 찾기는 상한 없이, 연결은 300곳씩 ---- */
async function linkFixture() {
  const figma = installFigma();
  await createTokens(
    [
      { name: 'color/0066ff', category: 'color', sources: ['fill'], value: '#0066ff' },
      { name: 'spacing/8', category: 'gap', sources: ['gap'], value: 8 },
      { name: 'spacing/16', category: 'gap', sources: ['gap'], value: 16 },
    ],
    16,
  );
  return { figma, blue: findVar(figma, 'Global', 'color/0066ff'), sp8: findVar(figma, 'Global', 'spacing/8'), sp16: findVar(figma, 'Global', 'spacing/16') };
}
const blueFill = () => ({ type: 'SOLID', color: { r: 0, g: 0.4, b: 1 } });
function gapFrame(id, extra = {}) {
  return {
    type: 'FRAME', id, name: id, layoutMode: 'VERTICAL', itemSpacing: 8, fills: [], boundVariables: {},
    setBoundVariable(field, v) { this.boundVariables[field] = { type: 'VARIABLE_ALIAS', id: v.id }; },
    ...extra,
  };
}

test('bindSelection dry-run — 후보 1,000곳을 상한 없이 전부 싣는다(candidateTotal 없음)', async () => {
  await linkFixture();
  const nodes = Array.from({ length: 1000 }, (_, i) => gapFrame(`g${i}`));
  const r = await bindSelection(nodes, false);
  assert.equal(r.candidates.length, 1000);
  assert.equal(r.candidates.filter((c) => c.field === 'itemSpacing').length, 1000);
  assert.equal('candidateTotal' in r, false);
  assert.equal(r.nodes.length, 1000); // 영향 레이어 전부
});

test('bindSelectedItems — 1,000곳을 300곳씩 연결하고 묶음마다 진행률(300 · 600 · 900 · 1000)', async () => {
  const { figma, sp8 } = await linkFixture();
  const nodes = Array.from({ length: 1000 }, (_, i) => gapFrame(`g${i}`));
  registerNodes(figma, nodes);
  const progress = [];
  let yields = 0;
  let written = 0;
  const r = await bindSelectedItems(
    nodes.map((n) => ({ nodeId: n.id, field: 'itemSpacing', variableId: sp8.id })),
    { onProgress: (done, total) => progress.push([done, total]), yieldToEvents: async () => { yields++; }, onBound: (n) => { written = n; } },
  );
  assert.equal(written, 1000); // 실제로 쓴 자리 수(code.ts가 예외 때 ⌘Z 묶음을 닫는 기준)
  assert.equal(r.bound, 1000);
  assert.equal(r.skipped, 0);
  assert.deepEqual(progress, [[300, 1000], [600, 1000], [900, 1000], [1000, 1000]]);
  assert.equal(yields, 4);
  assert.ok(nodes.every((n) => n.boundVariables.itemSpacing?.id === sp8.id));
});

test('bindSelectedItems — 묶음 경계(300 · 600 · 900)를 넘는 같은 레이어의 칠하기 두 자리가 둘 다 연결', async () => {
  const { figma, blue, sp8 } = await linkFixture();
  const fillers = Array.from({ length: 994 }, (_, i) => gapFrame(`g${i}`));
  const pairs = ['p1', 'p2', 'p3'].map((id) => gapFrame(id, { fills: [blueFill(), blueFill()] }));
  registerNodes(figma, [...fillers, ...pairs]);
  const items = fillers.map((n) => ({ nodeId: n.id, field: 'itemSpacing', variableId: sp8.id }));
  // index 0은 앞 묶음의 끝(299 · 599 · 899), index 1은 다음 묶음의 처음(300 · 600 · 900)
  pairs.forEach((p, k) => {
    const at = 300 * (k + 1) - 1;
    items.splice(at, 0, { nodeId: p.id, field: 'fills', index: 0, variableId: blue.id }, { nodeId: p.id, field: 'fills', index: 1, variableId: blue.id });
  });
  assert.equal(items.length, 1000);
  pairs.forEach((p, k) => {
    assert.equal(items[300 * (k + 1) - 1].nodeId, p.id);
    assert.equal(items[300 * (k + 1)].nodeId, p.id);
  });
  const r = await bindSelectedItems(items);
  assert.equal(r.bound, 1000);
  assert.equal(r.skipped, 0);
  for (const p of pairs) {
    assert.equal(p.fills[0].boundVariables?.color?.id, blue.id, `${p.id} index 0`);
    assert.equal(p.fills[1].boundVariables?.color?.id, blue.id, `${p.id} index 1`);
  }
});

test('bindSelectedItems — 묶음마다 다시 확인: 묶음 2에서 값이 바뀐 자리만 changed', async () => {
  const { figma, sp8, sp16 } = await linkFixture();
  const nodes = Array.from({ length: 600 }, (_, i) => gapFrame(`g${i}`, i % 2 ? { itemSpacing: 16 } : {}));
  registerNodes(figma, nodes);
  const items = nodes.map((n, i) => ({ nodeId: n.id, field: 'itemSpacing', variableId: i % 2 ? sp16.id : sp8.id }));
  const g = figma._state.collections.find((c) => c.name === 'Global');
  const r = await bindSelectedItems(items, {
    onProgress: (done) => {
      if (done !== 300) return;
      nodes[400].itemSpacing = 9; // 묶음 2의 레이어 값이 바뀜(spacing/8 자리)
      sp16.setValueForMode(g.defaultModeId, 20); // 묶음 2부터 spacing/16 값이 바뀜 — 묶음마다 새로 읽는다
    },
  });
  // 묶음 1: 300곳 전부 연결. 묶음 2: spacing/8 자리 150곳 중 1곳(g400) changed, spacing/16 자리 150곳 changed.
  assert.equal(r.bound, 300 + 149);
  assert.deepEqual(r.reasons, { changed: 151 });
  assert.equal(nodes[299].boundVariables.itemSpacing.id, sp16.id); // 묶음 1의 spacing/16은 연결됨
  assert.equal(nodes[301].boundVariables.itemSpacing, undefined);
  assert.equal(nodes[400].boundVariables.itemSpacing, undefined);
  assert.equal(nodes[402].boundVariables.itemSpacing.id, sp8.id);
});

test('bindSelectedItems — 칠하기 배열 쓰기가 실패하면 bound에 세지 않고 error로 건너뜀', async () => {
  const { figma, blue, sp8 } = await linkFixture();
  const ok = gapFrame('ok', { fills: [blueFill()] });
  const bad = gapFrame('bad');
  let fills = [blueFill(), blueFill()];
  Object.defineProperty(bad, 'fills', {
    get: () => fills,
    set: () => { throw new Error('쓰기 실패'); },
    enumerable: true,
  });
  registerNodes(figma, [ok, bad]);
  let written = 0;
  const r = await bindSelectedItems([
    { nodeId: 'ok', field: 'fills', index: 0, variableId: blue.id },
    { nodeId: 'bad', field: 'fills', index: 0, variableId: blue.id },
    { nodeId: 'bad', field: 'fills', index: 1, variableId: blue.id },
    { nodeId: 'bad', field: 'itemSpacing', variableId: sp8.id },
  ], { onBound: (n) => { written = n; } });
  assert.equal(r.bound, 2); // ok.fills · bad.itemSpacing
  assert.equal(written, 2); // 쓰기에 실패한 배열은 쓴 자리로 세지 않는다
  assert.deepEqual(r.reasons, { error: 2 });
  assert.equal(r.skipped, 2);
  assert.deepEqual(r.skips.map((s) => `${s.nodeId}:${s.reason}`), ['bad:error']);
  assert.equal(fills[0].boundVariables, undefined);
  assert.equal(ok.fills[0].boundVariables.color.id, blue.id);
});

test('applyExistingTextStyles — 이미 스타일 · 인스턴스 안쪽 · 섞인 서식은 건너뛰고 사유별로 센다 · 글자 변수는 떼고 붙인다(§2.3-6)', async () => {
  const figma = installFigma();
  await createSemanticTextStyles([{ name: 'body', fontSize: 16, lineHeight: 24, letterSpacing: 0, family: 'Inter', style: 'Regular' }]);
  const style = figma._state.textStyles.find((s) => s.name === 'body');
  const mk = (id, extra = {}) => ({
    type: 'TEXT', id, name: id, fontSize: 16, fontName: { family: 'Inter', style: 'Regular' },
    lineHeight: { unit: 'PIXELS', value: 24 }, letterSpacing: { unit: 'PIXELS', value: 0 },
    characters: 'hi', visible: true, textStyleId: '',
    _styleId: null, async setTextStyleIdAsync(sid) { this._styleId = sid; },
    ...extra,
  });
  const ok = mk('ok');
  const hasStyle = mk('hasStyle', { textStyleId: 'S:remote' });
  const mixedStyle = mk('mixedStyle', { textStyleId: figma.mixed });
  const boundVars = mk('boundVars', {
    boundVariables: { letterSpacing: [{ type: 'VARIABLE_ALIAS', id: 'VariableID:x' }] },
    setRangeBoundVariable(s, e, f, v) { if (v == null) delete this.boundVariables[f]; },
    setBoundVariable(f, v) { if (v == null) delete this.boundVariables[f]; },
  });
  const mixed = mk('mixed', { fontSize: figma.mixed });
  const inInst = mk('inInst');
  const inst = { type: 'INSTANCE', id: 'inst', name: 'inst', visible: true, children: [inInst] };
  const deepInInst = mk('deep');
  const instFrame = { type: 'FRAME', id: 'if', name: 'if', visible: true, children: [deepInInst] };
  const inst2 = { type: 'INSTANCE', id: 'inst2', name: 'inst2', visible: true, children: [instFrame] };
  instFrame.parent = inst2;
  deepInInst.parent = instFrame;
  const root = { type: 'FRAME', id: 'root', name: 'root', visible: true, children: [ok, hasStyle, mixedStyle, boundVars, mixed, inst] };

  // 인스턴스 안쪽 프레임을 직접 고른 경우도 안쪽으로 본다.
  const r = await applyExistingTextStyles([root, instFrame]);
  assert.equal(r.applied, 2);
  assert.equal(ok._styleId, style.id);
  assert.equal(boundVars._styleId, style.id); // 글자 변수가 붙은 글자도 붙는다 — 연결은 뗀다
  assert.equal(boundVars.boundVariables.letterSpacing, undefined);
  for (const n of [hasStyle, mixedStyle, mixed, inInst, deepInInst]) assert.equal(n._styleId, null, n.id);
  assert.deepEqual(r.skipReasons, { hasStyle: 2, noStyle: 0, ambiguous: 0, mixed: 1, instance: 2 });
  assert.equal(r.skipped, 5);
});

test('applyExistingTextStyles — 스타일의 모든 글자 속성(대소문자·밑줄·문단 간격·들여쓰기)이 같아야 붙고, 같은 모양 둘이면 모호', async () => {
  const figma = installFigma();
  await createSemanticTextStyles([{ name: 'label', fontSize: 12, lineHeight: 16, letterSpacing: 0, family: 'Inter', style: 'Medium' }]);
  const label = figma._state.textStyles.find((s) => s.name === 'label');
  label.textCase = 'UPPER';
  label.paragraphSpacing = 8;
  const mk = (id, extra = {}) => ({
    type: 'TEXT', id, name: id, fontSize: 12, fontName: { family: 'Inter', style: 'Medium' },
    lineHeight: { unit: 'PIXELS', value: 16 }, letterSpacing: { unit: 'PIXELS', value: 0 },
    textCase: 'UPPER', textDecoration: 'NONE', paragraphSpacing: 8, paragraphIndent: 0,
    characters: 'hi', visible: true, textStyleId: '',
    _styleId: null, async setTextStyleIdAsync(sid) { this._styleId = sid; },
    ...extra,
  });
  const same = mk('same');
  const lower = mk('lower', { textCase: 'ORIGINAL' }); // 대소문자만 다름
  const underline = mk('underline', { textDecoration: 'UNDERLINE' });
  const para = mk('para', { paragraphSpacing: 0 });
  const indent = mk('indent', { paragraphIndent: 4 });
  const r = await applyExistingTextStyles([same, lower, underline, para, indent]);
  assert.equal(r.applied, 1);
  assert.equal(same._styleId, label.id);
  assert.equal(r.skipReasons.noStyle, 4);

  // 같은 모양의 스타일이 하나 더 생기면 모호 → 건너뜀
  await createSemanticTextStyles([{ name: 'caps', fontSize: 12, lineHeight: 16, letterSpacing: 0, family: 'Inter', style: 'Medium' }]);
  const caps = figma._state.textStyles.find((s) => s.name === 'caps');
  caps.textCase = 'UPPER';
  caps.paragraphSpacing = 8;
  const again = mk('again');
  const r2 = await applyExistingTextStyles([again]);
  assert.equal(r2.applied, 0);
  assert.equal(r2.skipReasons.ambiguous, 1);
  assert.equal(again._styleId, null);
});

/* ---------- QA #3 불합격 1 — 사이 간격 자동(Space between) (§2.11) ---------- */

/** Space between 카드 줄: 피그마는 itemSpacing(33)을 쓰지 않는다. 변수를 붙이면 정렬이 MIN으로 바뀐다(목이 흉내). */
function spaceBetweenRow(extra = {}) {
  return {
    type: 'FRAME', id: 'row', name: 'Row', fills: [],
    layoutMode: 'HORIZONTAL', primaryAxisAlignItems: 'SPACE_BETWEEN', itemSpacing: 33,
    paddingLeft: 16, paddingRight: 16, paddingTop: 8, paddingBottom: 8,
    layoutSizingHorizontal: 'HUG', layoutSizingVertical: 'HUG',
    children: [], boundVariables: {},
    setBoundVariable(field, v) {
      this.boundVariables[field] = { type: 'VARIABLE_ALIAS', id: v.id };
      if (field === 'itemSpacing' && this.primaryAxisAlignItems === 'SPACE_BETWEEN') this.primaryAxisAlignItems = 'MIN';
    },
    ...extra,
  };
}

test('extractFromSelection — Space between의 itemSpacing은 토큰으로 뽑지 않는다(padding은 그대로)', () => {
  installFigma();
  const names = new Set(extractFromSelection([spaceBetweenRow()]).tokens.map((t) => t.name));
  assert.equal(names.has('spacing/33'), false, '피그마가 쓰지 않는 간격이 토큰이 됐다');
  assert.equal(names.has('spacing/16'), true);
  assert.equal(names.has('spacing/8'), true);
  // 같은 값이라도 Space between이 아니면 뽑는다(가드가 넓지 않은지)
  const plain = new Set(extractFromSelection([spaceBetweenRow({ primaryAxisAlignItems: 'MIN' })]).tokens.map((t) => t.name));
  assert.equal(plain.has('spacing/33'), true);
});

test('extractFromSelection — wrap의 줄 정렬이 Space between이면 counterAxisSpacing을 뽑지 않는다', () => {
  installFigma();
  const wrap = spaceBetweenRow({ primaryAxisAlignItems: 'MIN', itemSpacing: 12, layoutWrap: 'WRAP', counterAxisSpacing: 51, counterAxisAlignContent: 'SPACE_BETWEEN' });
  const names = new Set(extractFromSelection([wrap]).tokens.map((t) => t.name));
  assert.equal(names.has('spacing/51'), false);
  assert.equal(names.has('spacing/12'), true, '주 축 간격은 Space between이 아니라 그대로');
  const auto = new Set(extractFromSelection([{ ...wrap, counterAxisAlignContent: 'AUTO' }]).tokens.map((t) => t.name));
  assert.equal(auto.has('spacing/51'), true);
});

test('bindSelection — Space between 간격은 붙이지 않고 정렬도 그대로, 사유 space-between', async () => {
  const figma = installFigma();
  await createTokens(
    [
      { name: 'spacing/33', category: 'gap', sources: ['gap'], value: 33 }, // 예전 추출이 만든 쓰레기 토큰이 있어도
      { name: 'spacing/16', category: 'gap', sources: ['gap'], value: 16 },
    ],
    16,
  );
  const row = spaceBetweenRow();
  const dry = await bindSelection([row], false);
  assert.equal(dry.reasons['space-between'], 1);
  assert.ok(!dry.candidates.some((c) => c.field === 'itemSpacing'), '간격이 후보로 나오면 안 된다');
  assert.ok(dry.skips.some((s) => s.nodeId === 'row' && s.reason === 'space-between' && s.field === 'itemSpacing'), '칩에서 레이어로 이어져야 한다');

  const res = await bindSelection([row]);
  assert.equal(row.primaryAxisAlignItems, 'SPACE_BETWEEN', '정렬이 바뀌었다 — 레이어 값 변경(§2.11 위반)');
  assert.equal(row.boundVariables.itemSpacing, undefined);
  assert.equal(roleTarget(figma, row.boundVariables.paddingLeft.id), findVar(figma, 'Global', 'spacing/16').id, 'padding은 그대로 붙는다');
  assert.equal(res.reasons['space-between'], 1);
});

test('bindSelection — wrap 줄 정렬 Space between이면 counterAxisSpacing을 건너뛴다', async () => {
  const figma = installFigma();
  await createTokens([{ name: 'spacing/51', category: 'gap', sources: ['gap'], value: 51 }], 16);
  const wrap = spaceBetweenRow({ primaryAxisAlignItems: 'MIN', itemSpacing: 0, layoutWrap: 'WRAP', counterAxisSpacing: 51, counterAxisAlignContent: 'SPACE_BETWEEN' });
  const res = await bindSelection([wrap]);
  assert.equal(wrap.boundVariables.counterAxisSpacing, undefined);
  assert.equal(res.reasons['space-between'], 1);
  // 줄 정렬이 AUTO면 붙는다(가드가 넓지 않은지)
  const auto = spaceBetweenRow({ id: 'auto', primaryAxisAlignItems: 'MIN', itemSpacing: 0, layoutWrap: 'WRAP', counterAxisSpacing: 51, counterAxisAlignContent: 'AUTO' });
  await bindSelection([auto]);
  assert.equal(roleTarget(figma, auto.boundVariables.counterAxisSpacing.id), findVar(figma, 'Global', 'spacing/51').id);
});

test('bindSelectedItems — 찾은 뒤 Space between이 된 간격은 다시 확인에서 space-between으로 건너뜀', async () => {
  const figma = installFigma();
  await createTokens([{ name: 'spacing/33', category: 'gap', sources: ['gap'], value: 33 }], 16);
  const sp = findVar(figma, 'Global', 'spacing/33');
  const row = spaceBetweenRow();
  registerNodes(figma, [row]);
  const r = await bindSelectedItems([{ nodeId: 'row', field: 'itemSpacing', variableId: sp.id }]);
  assert.equal(r.bound, 0);
  assert.deepEqual(r.reasons, { 'space-between': 1 });
  assert.equal(r.skipped, 1);
  assert.equal(row.primaryAxisAlignItems, 'SPACE_BETWEEN');
  assert.equal(row.boundVariables.itemSpacing, undefined);
});

/* ---------- 줄바꿈 아님 — counterAxisSpacing은 WRAP일 때만 (§2.11, 2026-11-04 사용자 결정) ---------- */

test('extractFromSelection — 줄바꿈이 아니면 counterAxisSpacing을 뽑지 않는다', () => {
  installFigma();
  const row = spaceBetweenRow({ primaryAxisAlignItems: 'MIN', itemSpacing: 12, layoutWrap: 'NO_WRAP', counterAxisSpacing: 51, counterAxisAlignContent: 'AUTO' });
  const names = new Set(extractFromSelection([row]).tokens.map((t) => t.name));
  assert.equal(names.has('spacing/51'), false, '피그마가 쓰지 않는 줄 사이 간격이 토큰이 됐다');
  assert.equal(names.has('spacing/12'), true);
  // layoutWrap이 아예 없어도(옛 목·세로 오토레이아웃) 줄바꿈 아님
  const noProp = spaceBetweenRow({ primaryAxisAlignItems: 'MIN', itemSpacing: 12, counterAxisSpacing: 51 });
  assert.equal(new Set(extractFromSelection([noProp]).tokens.map((t) => t.name)).has('spacing/51'), false);
});

test('bindSelection — 줄바꿈이 아니면 counterAxisSpacing은 후보도 건너뜀도 아니다', async () => {
  const figma = installFigma();
  await createTokens([{ name: 'spacing/51', category: 'gap', sources: ['gap'], value: 51 }], 16);
  const row = spaceBetweenRow({ primaryAxisAlignItems: 'MIN', itemSpacing: 0, layoutWrap: 'NO_WRAP', counterAxisSpacing: 51, counterAxisAlignContent: 'SPACE_BETWEEN' });
  const dry = await bindSelection([row], false);
  assert.ok(!dry.candidates.some((c) => c.field === 'counterAxisSpacing'), '줄바꿈 아닌 줄 사이 간격이 후보로 나왔다');
  assert.ok(!dry.skips.some((s) => s.field === 'counterAxisSpacing'), '건너뜀으로 세지 않는다');
  assert.equal(dry.reasons['space-between'] ?? 0, 0, '줄바꿈 아님이 Space between보다 먼저');
  await bindSelection([row]);
  assert.equal(row.boundVariables.counterAxisSpacing, undefined);
  void figma;
});

test('bindSelectedItems — 찾은 뒤 줄바꿈이 꺼진 줄 사이 간격은 다시 확인에서 "그 사이 바뀜"', async () => {
  const figma = installFigma();
  await createTokens([{ name: 'spacing/51', category: 'gap', sources: ['gap'], value: 51 }], 16);
  const sp = findVar(figma, 'Global', 'spacing/51');
  const row = spaceBetweenRow({ primaryAxisAlignItems: 'MIN', itemSpacing: 0, layoutWrap: 'NO_WRAP', counterAxisSpacing: 51, counterAxisAlignContent: 'AUTO' });
  registerNodes(figma, [row]);
  const r = await bindSelectedItems([{ nodeId: 'row', field: 'counterAxisSpacing', variableId: sp.id }]);
  assert.equal(r.bound, 0);
  assert.deepEqual(r.reasons, { changed: 1 });
  assert.equal(row.boundVariables.counterAxisSpacing, undefined);
});

/* ---------- 선 두께는 정수만 (§2.11, 2026-11-04 사용자 결정 · QA #3 실기 ② 항목 5) ---------- */

function strokedFrame(id, w) {
  return {
    type: 'FRAME', id, name: id, fills: [],
    strokes: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, visible: true }],
    strokeWeight: w, layoutSizingHorizontal: 'HUG', layoutSizingVertical: 'HUG', layoutMode: 'NONE', children: [],
    setBoundVariable(field, v) { (this._bound ??= {})[field] = v.id; },
  };
}

test('extractFromSelection — 소수 선 두께(1.5)는 토큰이 없다, 정수(1·2)는 그대로', () => {
  installFigma();
  const names = new Set(extractFromSelection([strokedFrame('a', 1.5), strokedFrame('b', 1), strokedFrame('c', 2)]).tokens.map((t) => t.name));
  assert.equal(names.has('stroke-width/1_5'), false, 'stroke-width/1_5가 생겼다');
  assert.equal(names.has('stroke-width/1'), true);
  assert.equal(names.has('stroke-width/2'), true);
  assert.equal(names.has('stroke-width/0_5'), false);
});

test('bindSelection — 소수 선 두께는 이미 있는 1.5 변수에도, 가까운 정수에도 붙이지 않고 "소수 선 두께"로 건너뜀', async () => {
  const figma = installFigma();
  await createTokens(
    [
      { name: 'stroke-width/1_5', category: 'strokeWidth', sources: ['strokeWidth'], value: 1.5 }, // 예전에 만든 변수(지우지 않음)
      { name: 'stroke-width/2', category: 'strokeWidth', sources: ['strokeWidth'], value: 2 },
    ],
    16,
  );
  const node = strokedFrame('thin', 1.5);
  const dry = await bindSelection([node], false);
  assert.equal(dry.reasons.fraction, 1);
  assert.ok(dry.skips.some((s) => s.nodeId === 'thin' && s.reason === 'fraction' && s.field === 'strokeWeight'));
  const res = await bindSelection([node]);
  assert.equal(node._bound?.strokeWeight, undefined, '소수 두께에 변수가 붙었다');
  assert.equal(node.strokeWeight, 1.5, '값을 바꾸지 않는다');
  assert.equal(res.bound, 0);
  assert.ok(findVar(figma, 'Global', 'stroke-width/1_5'), '이미 있는 변수는 지우지 않는다');
});

test('bindSelection — 이미 1.5 변수에 붙은 선 두께는 Semantic · Global 모두 "소수 선 두께"가 아니라 "이미 연결됨"(§2.12 12.8)', async () => {
  const figma = installFigma();
  await createTokens([{ name: 'stroke-width/1_5', category: 'strokeWidth', sources: ['strokeWidth'], value: 1.5 }], 16);
  const v15 = findVar(figma, 'Global', 'stroke-width/1_5');
  const role15 = designerRole(figma, 'stroke-width/hairline', v15);
  const node = strokedFrame('bound15', 1.5);
  node.boundVariables = { strokeWeight: { type: 'VARIABLE_ALIAS', id: role15.id } };
  const dry = await bindSelection([node], false);
  assert.equal(dry.reasons['already-bound'], 1);
  assert.equal(dry.reasons.fraction ?? 0, 0);
  assert.ok(dry.skips.some((s) => s.nodeId === 'bound15' && s.reason === 'already-bound' && s.field === 'strokeWeight'));
  // Global에 붙은 소수 선 두께도 이미 연결됨(바꾸지 않는다 — 결정 B).
  const g = strokedFrame('global15', 1.5);
  g.boundVariables = { strokeWeight: { type: 'VARIABLE_ALIAS', id: v15.id } };
  const dry2 = await bindSelection([g], false);
  assert.equal(dry2.reasons['already-bound'], 1);
  assert.equal(dry2.reasons.fraction ?? 0, 0);
  assert.equal(dry2.candidates.length, 0);
});

test('bindSelection — strokeWeight를 붙인 뒤 피그마가 방향별(strokeTopWeight …)로 기록해도 "이미 연결됨"(다시 연결할 곳으로 세지 않음)', async () => {
  const figma = installFigma();
  await createTokens([{ name: 'stroke-width/1', category: 'strokeWidth', sources: ['strokeWidth'], value: 1 }], 16);
  const v1 = findVar(figma, 'Global', 'stroke-width/1');
  const role = designerRole(figma, 'stroke-width/card', v1);
  const node = strokedFrame('sides', 1);
  const alias = { type: 'VARIABLE_ALIAS', id: role.id };
  node.boundVariables = { strokeTopWeight: alias, strokeRightWeight: alias, strokeBottomWeight: alias, strokeLeftWeight: alias };
  const dry = await bindSelection([node], false);
  assert.equal(dry.candidates.length, 0);
  assert.equal(dry.reasons['already-bound'], 1);
});

/* ---------- 만들기가 뽑지 않는 값은 "새로 만들 값"(no-match)이 아니다 (IA v4 §4.1 k ①~③, 2026-11-10 실기 확인) ---------- */
const alFrame = (id, extra = {}) => ({
  type: 'FRAME', id, name: id, fills: [], strokes: [], layoutMode: 'VERTICAL', primaryAxisAlignItems: 'MIN', layoutWrap: 'NO_WRAP',
  itemSpacing: 8, counterAxisSpacing: 0, paddingLeft: 0, paddingRight: 0, paddingTop: 0, paddingBottom: 0,
  layoutSizingHorizontal: 'HUG', layoutSizingVertical: 'HUG', children: [], setBoundVariable(field, v) { (this._bound ??= {})[field] = v.id; }, ...extra,
});

test('k ① — 여백 0 네 방향은 no-match가 아니고 사유도 남기지 않는다', async () => {
  installFigma();
  await createTokens([{ name: 'spacing/8', category: 'gap', sources: ['gap'], value: 8 }], 16);
  const dry = await bindSelection([alFrame('z')], false);
  assert.equal(dry.reasons['no-match'] ?? 0, 0);
  assert.equal(dry.skips.length, 0);
  assert.equal(dry.candidates.length, 1); // itemSpacing 8만
});

test('k ① — 사용자가 만든 0 변수가 있으면 여백 0도 연결 후보', async () => {
  installFigma();
  await createTokens([{ name: 'spacing/0', category: 'gap', sources: ['gap'], value: 0 }, { name: 'spacing/8', category: 'gap', sources: ['gap'], value: 8 }], 16);
  const dry = await bindSelection([alFrame('z0')], false);
  assert.equal(dry.candidates.filter((c) => c.field.startsWith('padding')).length, 4);
});

test('k ① — 같은 값 변수가 별칭뿐(직접 값 Global 없음)인 0 여백은 버린다', async () => {
  const figma = installFigma();
  await createTokens([{ name: 'spacing/8', category: 'gap', sources: ['gap'], value: 8 }], 16);
  const col = figma.variables.createVariableCollection('Aliases');
  const g = figma.variables.createVariable('zero-src', col, 'FLOAT');
  g.setValueForMode(col.defaultModeId, 0);
  const a = figma.variables.createVariable('zero-alias', col, 'FLOAT');
  a.setValueForMode(col.defaultModeId, { type: 'VARIABLE_ALIAS', id: g.id });
  const dry = await bindSelection([alFrame('za')], false);
  assert.equal(dry.reasons['no-match'] ?? 0, 0);
});

test('k ① — 음수 간격은 버린다', async () => {
  installFigma();
  await createTokens([{ name: 'spacing/8', category: 'gap', sources: ['gap'], value: 8 }], 16);
  const dry = await bindSelection([alFrame('neg', { itemSpacing: -8 })], false);
  assert.equal(dry.reasons['no-match'] ?? 0, 0);
  assert.equal(dry.skips.length, 0);
});

test('k ② — 소수 여백 · 반경은 fraction(s), 4.004 여백은 만든 4 변수에 연결', async () => {
  installFigma();
  await createTokens([{ name: 'spacing/4', category: 'gap', sources: ['gap'], value: 4 }], 16);
  const dry = await bindSelection([alFrame('fr', { itemSpacing: 4.5, paddingLeft: 4.004, cornerRadius: 2.5, topLeftRadius: 2.5, topRightRadius: 2.5, bottomLeftRadius: 2.5, bottomRightRadius: 2.5 })], false);
  assert.equal(dry.reasons['no-match'] ?? 0, 0);
  assert.equal(dry.reasons.fraction, 5); // itemSpacing 4.5 + 모서리 4곳 2.5
  assert.ok(dry.candidates.some((c) => c.field === 'paddingLeft'));
});

test('k ① — 자간 0은 버리고, 스타일이 붙은 글자의 자간 0은 styled로도 세지 않는다', async () => {
  installFigma();
  await createTokens([{ name: 'font-size/16', category: 'fontSize', sources: ['fontSize'], value: 16 }], 16);
  const txt = (id, extra = {}) => ({
    type: 'TEXT', id, name: id, characters: 'Hi', fontName: { family: 'Inter', style: 'Regular' }, fontSize: 16,
    lineHeight: { unit: 'AUTO' }, letterSpacing: { unit: 'PIXELS', value: 0 }, fills: [], strokes: [],
    getRangeBoundVariable() { return null; }, setRangeBoundVariable() {}, ...extra,
  });
  const dry = await bindSelection([txt('t0')], false);
  assert.equal(dry.reasons['no-match'] ?? 0, 0);
  const styled = await bindSelection([txt('ts', { textStyleId: 'S:1' })], false);
  assert.equal(styled.reasons.styled, 1); // fontSize만
});

test('k ③ — 숨긴 칠은 찾지 않는다', async () => {
  installFigma();
  const node = { type: 'RECTANGLE', id: 'hid', name: 'hid', fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 }, visible: false }], strokes: [], setBoundVariable() {} };
  const dry = await bindSelection([node], false);
  assert.equal(dry.reasons['no-match'] ?? 0, 0);
  assert.equal(dry.candidates.length, 0);
});

/* ---------- 크기는 아이콘 · 아바타만 (§2.11, 2026-11-06 사용자 결정 · QA 대기 목록 1번) ---------- */

/** 오토레이아웃 부모 안의 FIXED 프레임 — 크기 판정 픽스처. */
function sizedFrame(id, w, h, extra = {}) {
  return {
    type: 'FRAME', id, name: id, fills: [], layoutMode: 'NONE',
    layoutSizingHorizontal: 'FIXED', layoutSizingVertical: 'FIXED', width: w, height: h,
    children: [],
    setBoundVariable(field, v) { (this._bound ??= {})[field] = v.id; },
    ...extra,
  };
}

/** 크기 판정 픽스처 한 벌 — 맞는 것(아이콘 · 아바타)과 아닌 것. */
function sizeFixtures() {
  const ok = {
    icon: sizedFrame('icon', 24, 24, { children: [vec('icon-v')] }),
    // 아이콘 래퍼 인스턴스 안에 벡터 컴포넌트 인스턴스(크기 조건은 보지 않음)
    iconInst: sizedFrame('iconInst', 20, 20, {
      type: 'INSTANCE',
      children: [{ type: 'INSTANCE', id: 'glyph', name: 'Glyph', width: 18, height: 16, fills: [], children: [vec('glyph-v')] }],
    }),
    // 40×40 원형(cornerRadius 20) 사진 FRAME
    avatar: sizedFrame('avatar', 40, 40, { cornerRadius: 20, fills: [IMG] }),
    // 정사각 틀 + 같은 크기 사진 ELLIPSE
    avatarEllipse: sizedFrame('avatarEllipse', 32, 32, {
      children: [{ type: 'ELLIPSE', id: 'photo', name: 'Photo', width: 32, height: 32, fills: [IMG] }],
    }),
  };
  const no = {
    screen: sizedFrame('screen', 1440, 1440),
    card: sizedFrame('card', 356, 467, { children: [vec('card-v')] }),
    textButton: sizedFrame('textButton', 48, 48, {
      children: [{ type: 'TEXT', id: 'label', name: 'Label', fills: [], characters: 'OK', fontSize: 14, fontName: { family: 'Inter', style: 'Regular' }, lineHeight: { unit: 'AUTO' }, letterSpacing: { unit: 'PIXELS', value: 0 } }],
    }),
    squarePhoto: sizedFrame('squarePhoto', 64, 64, { cornerRadius: 8, fills: [IMG] }), // 원이 아님
    icon72: sizedFrame('icon72', 72, 72, { children: [vec('icon72-v')] }), // 64 초과
  };
  const root = {
    type: 'FRAME', id: 'root', name: 'root', fills: [], layoutMode: 'VERTICAL',
    layoutSizingHorizontal: 'HUG', layoutSizingVertical: 'HUG',
    itemSpacing: 0, paddingLeft: 0, paddingRight: 0, paddingTop: 0, paddingBottom: 0,
    children: [...Object.values(ok), ...Object.values(no)],
    setBoundVariable() {},
  };
  for (const c of root.children) c.parent = root;
  return { ok, no, root };
}

/* ---------- 비율 고정 레이어의 크기는 한 자리 (ia-v3 §2.11 "비율 고정", 2026-11-10 실기 확인 · 실험) ---------- */
/** 오토레이아웃 부모 안의 20×20 아이콘 — setBoundVariable은 피그마처럼 비율이 잠겼으면 다른 축 연결을 지운다. */
function lockedIcon(id, extra = {}) {
  const icon = sizedFrame(id, 20, 20, {
    children: [vec(`${id}-v`)],
    constrainProportions: true,
    setBoundVariable(field, v) {
      this.boundVariables ??= {};
      const locked = this.constrainProportions === true || this.targetAspectRatio != null;
      if (locked && (field === 'width' || field === 'height')) delete this.boundVariables[field === 'width' ? 'height' : 'width'];
      this.boundVariables[field] = { type: 'VARIABLE_ALIAS', id: v.id };
    },
    ...extra,
  });
  const root = { type: 'FRAME', id: `${id}-root`, name: 'root', fills: [], layoutMode: 'HORIZONTAL', layoutSizingHorizontal: 'HUG', layoutSizingVertical: 'HUG', itemSpacing: 0, paddingLeft: 0, paddingRight: 0, paddingTop: 0, paddingBottom: 0, children: [icon], setBoundVariable() {} };
  icon.parent = root;
  return icon;
}
const sizeCands = (r) => r.candidates.filter((c) => c.field === 'width' || c.field === 'height').map((c) => c.field);

test('비율 고정 — 비어 있으면 가로만 후보(세로는 찾지도 세지도 않음)', async () => {
  installFigma();
  await createTokens([{ name: 'size/20', category: 'size', sources: ['size'], value: 20 }], 16);
  const dry = await bindSelection([lockedIcon('a')], false);
  assert.deepEqual(sizeCands(dry), ['width']);
});

test('비율 고정 — 가로만 연결돼 있으면 후보 0 · already-bound 1(세로를 다시 연결할 곳으로 세지 않음)', async () => {
  const figma = installFigma();
  await createTokens([{ name: 'size/20', category: 'size', sources: ['size'], value: 20 }], 16);
  const v = findVar(figma, 'Global', 'size/20');
  const n = lockedIcon('b', { boundVariables: { width: { type: 'VARIABLE_ALIAS', id: v.id } } });
  const dry = await bindSelection([n], false);
  assert.deepEqual(sizeCands(dry), []);
  assert.equal(dry.reasons['already-bound'], 1);
});

test('비율 고정 — 가로 HUG · 세로 FIXED면 세로 1개, 가로 HUG(연결됨)면 후보 0 · already-bound 1', async () => {
  const figma = installFigma();
  await createTokens([{ name: 'size/20', category: 'size', sources: ['size'], value: 20 }], 16);
  const dry = await bindSelection([lockedIcon('c', { layoutSizingHorizontal: 'HUG' })], false);
  assert.deepEqual(sizeCands(dry), ['height']);
  const v = findVar(figma, 'Global', 'size/20');
  const dry2 = await bindSelection([lockedIcon('c2', { layoutSizingHorizontal: 'HUG', boundVariables: { width: { type: 'VARIABLE_ALIAS', id: v.id } } })], false);
  assert.deepEqual(sizeCands(dry2), []);
  assert.equal(dry2.reasons['already-bound'], 1);
});

test('비율 고정 — 가로가 삭제된 변수에 연결돼 있으면 후보 0 · deleted-var 1', async () => {
  installFigma();
  await createTokens([{ name: 'size/20', category: 'size', sources: ['size'], value: 20 }], 16);
  const n = lockedIcon('d', { boundVariables: { width: { type: 'VARIABLE_ALIAS', id: 'VariableID:gone' } } });
  const dry = await bindSelection([n], false);
  assert.deepEqual(sizeCands(dry), []);
  assert.equal(dry.reasons['deleted-var'], 1);
});

test('비율 고정 — 잠김 꺼짐이면 두 축, targetAspectRatio로만 잠겨도 한 자리', async () => {
  installFigma();
  await createTokens([{ name: 'size/20', category: 'size', sources: ['size'], value: 20 }], 16);
  const off = await bindSelection([lockedIcon('e', { constrainProportions: false })], false);
  assert.deepEqual(sizeCands(off), ['width', 'height']);
  const tar = await bindSelection([lockedIcon('f', { constrainProportions: false, targetAspectRatio: { x: 1, y: 1 } })], false);
  assert.deepEqual(sizeCands(tar), ['width']);
});

test('비율 고정 — 연결 직전 다시 확인: width · height를 함께 보내면 width만 붙고 height는 changed', async () => {
  const figma = installFigma();
  await createTokens([{ name: 'size/20', category: 'size', sources: ['size'], value: 20 }], 16);
  const v = findVar(figma, 'Global', 'size/20');
  const n = lockedIcon('g');
  const known = new Map([[n.id, n]]);
  const r = await bindSelectedItems([{ nodeId: n.id, field: 'width', variableId: v.id }, { nodeId: n.id, field: 'height', variableId: v.id }], {}, known);
  assert.equal(r.bound, 1);
  assert.deepEqual(Object.keys(n.boundVariables), ['width']);
  assert.equal(r.reasons['already-bound'], 1); // 이미 연결이 먼저(방금 붙인 가로) — 세로를 붙여 가로를 풀지 않는다
  // 세로만 보내면(볼 축이 아님) changed
  const n2 = lockedIcon('g2');
  const r2 = await bindSelectedItems([{ nodeId: n2.id, field: 'height', variableId: v.id }], {}, new Map([[n2.id, n2]]));
  assert.equal(r2.bound, 0);
  assert.equal(r2.reasons.changed, 1);
});

test('isIconOrAvatar — 아이콘 · 아바타만 참', () => {
  const figma = installFigma();
  const { ok, no } = sizeFixtures();
  for (const [k, n] of Object.entries(ok)) assert.equal(isIconOrAvatar(n), true, `${k}가 아이콘 · 아바타로 판정되지 않았다`);
  for (const [k, n] of Object.entries(no)) assert.equal(isIconOrAvatar(n), false, `${k}가 아이콘 · 아바타로 판정됐다`);

  // 정사각형은 소수 둘째 자리로 반올림해 본다
  assert.equal(isIconOrAvatar(sizedFrame('r', 24.001, 23.999, { children: [vec()] })), true);
  assert.equal(isIconOrAvatar(sizedFrame('r2', 24, 23.9, { children: [vec()] })), false);
  assert.equal(isIconOrAvatar(sizedFrame('r64', 64, 64, { children: [vec()] })), true);
  // 대상 타입은 FRAME · COMPONENT · INSTANCE만
  assert.equal(isIconOrAvatar({ type: 'GROUP', id: 'g', width: 24, height: 24, children: [vec()] }), false);
  assert.equal(isIconOrAvatar({ type: 'ELLIPSE', id: 'e', width: 40, height: 40, fills: [IMG] }), false);
  // 아이콘: 벡터가 하나는 있어야 하고, GROUP · FRAME 안의 벡터도 센다
  assert.equal(isIconOrAvatar(sizedFrame('empty', 24, 24)), false);
  assert.equal(isIconOrAvatar(sizedFrame('rects', 24, 24, { children: [{ type: 'RECTANGLE', id: 'rc', fills: [] }] })), false);
  assert.equal(isIconOrAvatar(sizedFrame('grp', 24, 24, { children: [{ type: 'GROUP', id: 'gg', children: [{ type: 'RECTANGLE', id: 'bg', fills: [] }, vec()] }] })), true);
  // TEXT · 이미지 채움은 어디에도 없어야 한다(중첩 INSTANCE 안까지)
  assert.equal(isIconOrAvatar(sizedFrame('imgIn', 24, 24, { children: [vec(), { type: 'RECTANGLE', id: 'pic', fills: [IMG] }] })), false);
  assert.equal(
    isIconOrAvatar(sizedFrame('nestedText', 24, 24, { type: 'INSTANCE', children: [{ type: 'INSTANCE', id: 'in', fills: [], children: [vec(), { type: 'TEXT', id: 'tx', fills: [] }] }] })),
    false,
  );
  // 아바타 ①: 모서리가 서로 다르면 네 모서리 모두 절반 이상
  const mixedCorners = (bl) => sizedFrame('mx', 40, 40, { cornerRadius: figma.mixed, topLeftRadius: 20, topRightRadius: 20, bottomRightRadius: 20, bottomLeftRadius: bl, fills: [IMG] });
  assert.equal(isIconOrAvatar(mixedCorners(20)), true);
  assert.equal(isIconOrAvatar(mixedCorners(0)), false);
  // 아바타 ①: 이미지는 루트나 그 아래 두 단계 안
  const deep = (levels) => {
    let n = { type: 'RECTANGLE', id: 'img', fills: [IMG] };
    for (let i = 1; i < levels; i++) n = { type: 'FRAME', id: `w${i}`, fills: [], children: [n] };
    return sizedFrame('deep', 40, 40, { cornerRadius: 20, children: [n] });
  };
  assert.equal(isIconOrAvatar(deep(2)), true);
  assert.equal(isIconOrAvatar(deep(3)), false);
  // 아바타 ②: 같은 크기(±0.5) · 보이는 이미지 ELLIPSE
  const ell = (extra) => sizedFrame('el', 32, 32, { children: [{ type: 'ELLIPSE', id: 'p', width: 32, height: 32, fills: [IMG], ...extra }] });
  assert.equal(isIconOrAvatar(ell({ width: 31.5, height: 32.5 })), true);
  assert.equal(isIconOrAvatar(ell({ width: 28, height: 28 })), false);
  assert.equal(isIconOrAvatar(ell({ visible: false })), false);
  assert.equal(isIconOrAvatar(ell({ fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }] })), false);
});

test('extractFromSelection — 크기 토큰은 아이콘 · 아바타에서만(화면 · 카드 · 글자 버튼 · 사각 사진 · 72 아이콘 제외)', () => {
  installFigma();
  const { root } = sizeFixtures();
  const names = new Set(extractFromSelection([root]).tokens.filter((t) => t.category === 'size').map((t) => t.name));
  assert.deepEqual([...names].sort(), ['size/20', 'size/24', 'size/32', 'size/40']);
});

test('extractFromSelection — 아이콘이어도 HUG 축은 토큰으로 뽑지 않는다(FIXED 축만)', () => {
  installFigma();
  const { root, ok } = sizeFixtures();
  // 24 아이콘은 이 픽스처에 하나뿐이다 — 두 축이 모두 HUG면 size/24가 없어야 한다(축 하나라도 잘못 뽑으면 생긴다).
  ok.icon.layoutSizingHorizontal = 'HUG';
  ok.icon.layoutSizingVertical = 'HUG';
  assert.equal(extractFromSelection([root]).tokens.find((x) => x.name === 'size/24'), undefined);
});

test('bindSelection — 크기는 아이콘 · 아바타에만 붙고, 그 밖의 레이어는 찾지도 세지도 않음', async () => {
  const figma = installFigma();
  await createTokens(
    [20, 24, 32, 40, 48, 64, 72, 356, 467, 1440].map((v) => ({ name: `size/${v}`, category: 'size', sources: ['size'], value: v })),
    16,
  );
  const { ok, no, root } = sizeFixtures();
  ok.icon.layoutSizingVertical = 'HUG'; // 세로 HUG 축 → 사유 "HUG/FILL"
  const dry = await bindSelection([root], false);
  const sizeCands = dry.candidates.filter((c) => c.field === 'width' || c.field === 'height');
  const ids = (f) => sizeCands.filter((c) => c.field === f).map((c) => c.nodeId).sort();
  assert.deepEqual(ids('width'), ['avatar', 'avatarEllipse', 'icon', 'iconInst']);
  assert.deepEqual(ids('height'), ['avatar', 'avatarEllipse', 'iconInst']);
  const sizeReasons = ['hug-fill', 'size-free-layout', 'size-fraction'];
  const sizeSkips = dry.skips.filter((s) => sizeReasons.includes(s.reason));
  assert.deepEqual(sizeSkips.map((s) => [s.nodeId, s.reason, s.field]), [['icon', 'hug-fill', 'height']]);
  assert.equal(dry.reasons['hug-fill'], 1);
  // 매칭 없음에도 크기는 섞이지 않는다(그 밖의 레이어는 크기를 찾지 않음)
  for (const n of Object.values(no)) assert.ok(!dry.skips.some((s) => s.nodeId === n.id && (s.field === 'width' || s.field === 'height')));

  await bindSelection([root]);
  assert.equal(roleTarget(figma, ok.avatar._bound.width), findVar(figma, 'Global', 'size/40').id);
  assert.equal(roleTarget(figma, ok.avatarEllipse._bound.height), findVar(figma, 'Global', 'size/32').id);
  assert.equal(roleTarget(figma, ok.iconInst._bound.width), findVar(figma, 'Global', 'size/20').id);
  assert.equal(roleTarget(figma, ok.icon._bound.width), findVar(figma, 'Global', 'size/24').id);
  assert.equal(ok.icon._bound.height, undefined);
  for (const n of Object.values(no)) assert.equal(n._bound, undefined, `${n.id}에 크기 변수가 붙었다`);
});

test('bindSelectedItems — 찾은 뒤 아이콘 · 아바타가 아니게 된 레이어의 크기는 "그 사이 바뀜"', async () => {
  const figma = installFigma();
  await createTokens([{ name: 'size/24', category: 'size', sources: ['size'], value: 24 }], 16);
  const s24 = findVar(figma, 'Global', 'size/24');
  const { ok, root } = sizeFixtures();
  const keep = ok.icon;
  const broken = sizedFrame('broken', 24, 24, { children: [vec('b-v')], parent: root });
  for (const n of [keep, broken]) n.boundVariables = {};
  registerNodes(figma, [keep, broken]);
  // 찾은 뒤 글자를 넣었다
  broken.children.push({ type: 'TEXT', id: 'bt', name: 'T', fills: [] });
  const r = await bindSelectedItems([
    { nodeId: 'icon', field: 'width', variableId: s24.id },
    { nodeId: 'icon', field: 'height', variableId: s24.id },
    { nodeId: 'broken', field: 'width', variableId: s24.id },
    { nodeId: 'broken', field: 'height', variableId: s24.id },
  ]);
  assert.equal(r.bound, 2);
  assert.deepEqual(r.reasons, { changed: 2 });
  assert.equal(broken._bound, undefined);
  assert.equal(keep._bound.width, s24.id);
});

/* ---- 크기 대상: 가장 바깥 틀만 · 보이는 벡터 · 아바타 ① 보이는 이미지 (코드 리뷰 2026-11-06, §2.11) ---- */
function linkParents(n) {
  for (const c of n.children ?? []) {
    c.parent = n;
    linkParents(c);
  }
  return n;
}

test('isIconOrAvatar — 가장 바깥 틀만: 아이콘 안쪽 틀은 대상이 아니다(GROUP 조상은 건너뜀 · 아바타 조상은 제외 안 함)', () => {
  installFigma();
  // 24 › 20 틀 › 벡터
  const inner = sizedFrame('inner20', 20, 20, { children: [vec('iv')] });
  const outer = linkParents(sizedFrame('outer24', 24, 24, { children: [inner] }));
  assert.equal(isIconOrAvatar(outer), true);
  assert.equal(isIconOrAvatar(inner), false);
  // 24 › 20 › 16 세 겹 — 가운데가 바깥 규칙으로 빠져도 16은 여전히 대상 아님
  const deep16 = sizedFrame('deep16', 16, 16, { children: [vec('d16')] });
  const mid20 = sizedFrame('mid20', 20, 20, { children: [deep16] });
  linkParents(sizedFrame('top24', 24, 24, { children: [mid20] }));
  assert.equal(isIconOrAvatar(mid20), false);
  assert.equal(isIconOrAvatar(deep16), false);
  // 24 › GROUP › 16 틀 › 벡터 — 바깥 24가 아이콘이라 16은 아님
  const g16 = sizedFrame('g16', 16, 16, { children: [vec('g16v')] });
  linkParents(sizedFrame('gOuter', 24, 24, { children: [{ type: 'GROUP', id: 'grp', width: 20, height: 18, children: [g16] }] }));
  assert.equal(isIconOrAvatar(g16), false);
  // 24 GROUP › 20 틀 › 벡터 — GROUP은 조상 아이콘으로 치지 않는다
  const inGroup = sizedFrame('inGroup20', 20, 20, { children: [vec('ig')] });
  linkParents({ type: 'GROUP', id: 'g24', width: 24, height: 24, children: [inGroup] });
  assert.equal(isIconOrAvatar(inGroup), true);
  // 48 아이콘 버튼(배경 사각형 + 24 아이콘) — 바깥 48만
  const btnIcon = sizedFrame('btnIcon', 24, 24, { children: [vec('bi')] });
  const btn = linkParents(sizedFrame('btn48', 48, 48, { children: [{ type: 'RECTANGLE', id: 'bg', fills: [] }, btnIcon] }));
  assert.equal(isIconOrAvatar(btn), true);
  assert.equal(isIconOrAvatar(btnIcon), false);
  // 아바타 안 16 상태 아이콘 — 아바타 조상은 이 규칙에 들지 않음
  const badge = sizedFrame('badge16', 16, 16, { children: [vec('bv')] });
  const av = linkParents(sizedFrame('av48', 48, 48, { cornerRadius: 24, fills: [IMG], children: [badge] }));
  assert.equal(isIconOrAvatar(av), true);
  assert.equal(isIconOrAvatar(badge), true);
  // 조상은 페이지 바로 아래에서 멈춘다
  const top = sizedFrame('onPage', 24, 24, { children: [vec('op')] });
  top.parent = { type: 'PAGE', id: 'page', width: 24, height: 24, children: [top] };
  assert.equal(isIconOrAvatar(top), true);
});

test('isIconOrAvatar — 벡터 수는 보이는 것만, 숨긴 TEXT · 이미지는 계속 탈락', () => {
  installFigma();
  assert.equal(isIconOrAvatar(sizedFrame('hidVec', 40, 40, { children: [{ ...vec('hv'), visible: false }] })), false);
  // 숨긴 GROUP 아래 벡터도 세지 않는다
  assert.equal(
    isIconOrAvatar(sizedFrame('hidGrp', 24, 24, { children: [{ type: 'GROUP', id: 'hg', visible: false, children: [vec('hgv')] }] })),
    false,
  );
  // 보이는 벡터가 하나라도 있으면 아이콘
  assert.equal(isIconOrAvatar(sizedFrame('mixVec', 24, 24, { children: [vec('mv'), { ...vec('mh'), visible: false }] })), true);
  // 숨긴 TEXT · 숨긴 사진은 여전히 탈락
  assert.equal(isIconOrAvatar(sizedFrame('hidTxt', 24, 24, { children: [vec('ht'), { type: 'TEXT', id: 'tt', fills: [], visible: false }] })), false);
  assert.equal(
    isIconOrAvatar(sizedFrame('hidImg', 24, 24, { children: [vec('hi'), { type: 'RECTANGLE', id: 'ri', fills: [IMG], visible: false }] })),
    false,
  );
  // 루트 자신이 숨었어도 판정은 아래 레이어로(숨김의 기준점)
  assert.equal(isIconOrAvatar(sizedFrame('hidRoot', 24, 24, { visible: false, children: [vec('hr')] })), true);
});

test('isIconOrAvatar — 아바타 ①은 루트 채움 또는 보이는 레이어의 이미지만', () => {
  installFigma();
  const round48 = (extra) => sizedFrame('r48', 48, 48, { cornerRadius: 24, ...extra });
  assert.equal(isIconOrAvatar(round48({ children: [{ type: 'RECTANGLE', id: 'p', fills: [IMG], visible: false }] })), false);
  assert.equal(
    isIconOrAvatar(round48({ children: [{ type: 'FRAME', id: 'w', fills: [], visible: false, children: [{ type: 'RECTANGLE', id: 'p2', fills: [IMG] }] }] })),
    false,
  );
  assert.equal(isIconOrAvatar(round48({ children: [{ type: 'RECTANGLE', id: 'p3', fills: [IMG] }] })), true);
  assert.equal(isIconOrAvatar(round48({ fills: [IMG], visible: false })), true); // 루트 채움은 숨김과 무관
});

test('extract · bind — 24 › 20 틀에서 크기는 바깥 24만(안쪽은 토큰 · 후보 · 크기 사유 없음), 안쪽만 골라도 없음', async () => {
  const figma = installFigma();
  const inner = sizedFrame('inner20', 20, 20, { children: [vec('iv')] });
  const outer = sizedFrame('outer24', 24, 24, { layoutMode: 'VERTICAL', itemSpacing: 0, paddingLeft: 2, paddingRight: 2, paddingTop: 2, paddingBottom: 2, children: [inner] });
  const root = linkParents({
    type: 'FRAME', id: 'root', name: 'root', fills: [], layoutMode: 'VERTICAL',
    layoutSizingHorizontal: 'HUG', layoutSizingVertical: 'HUG',
    itemSpacing: 0, paddingLeft: 0, paddingRight: 0, paddingTop: 0, paddingBottom: 0,
    children: [outer], setBoundVariable() {},
  });
  const sizes = (sel) => extractFromSelection(sel).tokens.filter((t) => t.category === 'size').map((t) => t.name).sort();
  assert.deepEqual(sizes([root]), ['size/24']);
  assert.deepEqual(sizes([inner]), []);

  await createTokens([20, 24].map((v) => ({ name: `size/${v}`, category: 'size', sources: ['size'], value: v })), 16);
  const dry = await bindSelection([root], false);
  const sizeIds = dry.candidates.filter((c) => c.field === 'width' || c.field === 'height').map((c) => c.nodeId);
  assert.deepEqual([...new Set(sizeIds)], ['outer24']);
  assert.ok(!dry.skips.some((s) => s.nodeId === 'inner20' && ['hug-fill', 'size-free-layout', 'size-fraction'].includes(s.reason)));
  const dryInner = await bindSelection([inner], false);
  assert.ok(!dryInner.candidates.some((c) => c.field === 'width' || c.field === 'height'));
  void figma;
});

test('bindSelectedItems — 찾은 뒤 아이콘 틀로 감싸진 아이콘의 크기는 "그 사이 바뀜"', async () => {
  const figma = installFigma();
  await createTokens([{ name: 'size/24', category: 'size', sources: ['size'], value: 24 }], 16);
  const s24 = findVar(figma, 'Global', 'size/24');
  const { ok } = sizeFixtures();
  const icon = ok.icon;
  icon.boundVariables = {};
  registerNodes(figma, [icon]);
  // 찾은 뒤 28 아이콘 틀로 감쌌다
  const wrap = sizedFrame('wrap28', 28, 28, { children: [icon] });
  icon.parent = wrap;
  const r = await bindSelectedItems([{ nodeId: 'icon', field: 'width', variableId: s24.id }]);
  assert.equal(r.bound, 0);
  assert.deepEqual(r.reasons, { changed: 1 });
});

/* ---------- Semantic 역할 자동 생성 (§2.12) · 칠하기 용도 (§2.11, QA #4 불합격 1) ---------- */

test('usageRoles — 쓰임 이름 · 색 쓰임 · 번호 · 옛 이름(순수)', () => {
  assert.equal(paddingProp('paddingLeft', { left: 8, right: 8, top: 8, bottom: 8 }), 'padding');
  assert.equal(paddingProp('paddingLeft', { left: 16, right: 16, top: 8, bottom: 8 }), 'padding-x');
  assert.equal(paddingProp('paddingTop', { left: 16, right: 16, top: 8, bottom: 8 }), 'padding-y');
  assert.equal(paddingProp('paddingTop', { left: 16, right: 16, top: 8, bottom: 4 }), 'padding-top');
  assert.equal(radiusName('topLeftRadius', 'card', [8, 8, 8, 8]), 'radius/card');
  assert.equal(radiusName('topLeftRadius', undefined, [8, 8, 0, 0]), 'radius/default'); // 연결되는(>0) 모서리끼리만 비교
  assert.equal(radiusName('topLeftRadius', 'card', [8, 8, 4, 4]), 'radius/card-top-left');
  assert.equal(strokeName('strokeWeight', 'input', [0, 0, 0, 0]), 'stroke-width/input');
  assert.equal(strokeName('strokeBottomWeight', undefined, [0, 0, 2, 1]), 'stroke-width/bottom');
  assert.equal(colorUse('TEXT', 'fills', false), 'text');
  assert.equal(colorUse('VECTOR', 'strokes', false), 'icon');
  assert.equal(colorUse('RECTANGLE', 'fills', true), 'icon');
  assert.equal(colorUse('FRAME', 'fills', true), 'background'); // 프레임류는 아이콘 틀이어도 background
  assert.equal(colorUse('FRAME', 'strokes', false), 'border');
  assert.equal(colorUse('FRAME', 'effects', false), 'shadow');
  // 번호: 곳 수 순 · 같은 값 재사용 · 다른 값이면 다음 번호
  const names = assignNames(
    [
      { base: 'spacing/gap', value: '24', count: 1 },
      { base: 'spacing/gap', value: '52', count: 4 },
      { base: 'spacing/gap', value: '10', count: 1 },
      { base: 'radius/card', value: '8', count: 1 },
    ],
    new Map([['radius/card', '8'], ['spacing/gap', '12']]),
  );
  assert.equal(names.get('spacing/gap\u000052'), 'spacing/gap-2'); // 번호 없는 이름은 다른 값(12)이 차지
  assert.equal(names.get('spacing/gap\u000010'), 'spacing/gap-3'); // 같은 곳 수면 값 오름차순
  assert.equal(names.get('spacing/gap\u000024'), 'spacing/gap-4');
  assert.equal(names.get('radius/card\u00008'), 'radius/card'); // 같은 값이 있으면 재사용
  assert.equal(isOldPluginName('spacing/md'), true);
  assert.equal(isOldPluginName('color/text/default'), true);
  assert.equal(isOldPluginName('spacing/card/gap'), false);
});

test('colorRoleBases — default · subtle · strong · brand · inverse 합친 판정(기준 극단 · 반대 극단 · 배경 유채 또는 같은 쪽)', () => {
  const k = colorSlotKey;
  const b = colorRoleBases(
    [
      { hex: '#111111', count: 9 }, // 가장 많이 씀 → default(어두운 극단 기준)
      { hex: '#6b7280', count: 3 }, // L 0.55 — 회색 보조 글자 → subtle(반대쪽 극단 아님)
      { hex: '#ffffff', count: 3, bg: 'chroma' }, // 파란 버튼 위 흰 글자 → inverse
      { hex: '#ffffff', count: 2, bg: 'dark' }, // 어두운 바 위 흰 글자 → inverse
      { hex: '#ffffff', count: 1, bg: 'light' }, // 밝은 회색 카드 위 흰 글자 → subtle(배경이 기준과 반대쪽)
      { hex: '#ffffff', count: 1 }, // 배경 모름(이미지 · 채움 없음) → subtle
      { hex: '#000000', count: 1 }, // 기준보다 어두움 → strong
      { hex: '#0066ff', count: 2 }, // 유채 → brand
    ],
    undefined,
    'text',
  );
  assert.equal(b.get(k('#111111')), 'default');
  assert.equal(b.get(k('#6b7280')), 'subtle');
  assert.equal(b.get(k('#ffffff', 'chroma')), 'inverse');
  assert.equal(b.get(k('#ffffff', 'dark')), 'inverse');
  assert.equal(b.get(k('#ffffff', 'light')), 'subtle');
  assert.equal(b.get(k('#ffffff')), 'subtle');
  assert.equal(b.get(k('#000000')), 'strong');
  assert.equal(b.get(k('#0066ff')), 'brand');
  // 기준색은 hex별 곳 수 합 — 흰색이 7곳으로 가장 많아도 파일에 color/text/default(#000)가 있으면 그것이 기준
  const f = colorRoleBases([{ hex: '#ffffff', count: 7, bg: 'dark' }, { hex: '#ffffff', count: 2, bg: 'light' }, { hex: '#000000', count: 1 }], '#000000', 'text');
  assert.equal(f.get(k('#ffffff', 'dark')), 'inverse');
  assert.equal(f.get(k('#ffffff', 'light')), 'subtle');
  assert.equal(f.get(k('#000000')), 'default');
  // 회색 기준(#7A7A7A, L 0.58 — 극단 아님): 연회색 바 위 검정 아이콘 → strong(inverse 없음)
  const g = colorRoleBases([{ hex: '#7a7a7a', count: 5 }, { hex: '#000000', count: 2, bg: 'light' }], undefined, 'icon');
  assert.equal(g.get(k('#000000', 'light')), 'strong');
  // 흰 기준: #555(L 0.45)는 strong, 밝은 배경 위 #111은 inverse
  const w = colorRoleBases([{ hex: '#555555', count: 1 }, { hex: '#111111', count: 1, bg: 'light' }], '#ffffff', 'text');
  assert.equal(w.get(k('#555555')), 'strong');
  assert.equal(w.get(k('#111111', 'light')), 'inverse');
  // background · shadow에는 inverse가 없다
  const bg = colorRoleBases([{ hex: '#111111', count: 3 }, { hex: '#ffffff', count: 1, bg: 'dark' }], undefined, 'background');
  assert.equal(bg.get(k('#ffffff', 'dark')), 'subtle');
  // 배경 종류
  assert.equal(bgKindOf('#3d5fdb'), 'chroma');
  assert.equal(bgKindOf('#2edcf3'), 'chroma');
  assert.equal(bgKindOf('#f3f3f3'), 'light');
  assert.equal(bgKindOf('#222222'), 'dark');
});

/** 실기 파일과 같은 모양 — 옛 Semantic 색 4개(background/default = 흰색 FRAME_FILL · SHAPE_FILL, text/default = 검정). */
async function legacyColorFile(figma) {
  await createTokens(
    [
      { name: 'color/gray/0', category: 'color', sources: ['fill'], value: '#ffffff' },
      { name: 'color/gray/1000', category: 'color', sources: ['fill'], value: '#000000' },
    ],
    16,
  );
  await createSemanticAliases({ 'color/background/default': 'color/gray/0', 'color/text/default': 'color/gray/1000' });
}

const textNode = (id, hex, extra = {}) => ({
  type: 'TEXT', id, name: id, characters: 'Hi', fontSize: 13, fontName: { family: 'X', style: 'R' },
  lineHeight: { unit: 'AUTO' }, letterSpacing: { unit: 'PERCENT', value: 0 },
  fills: [{ type: 'SOLID', color: hexToRgb(hex) }], boundVariables: {}, setRangeBoundVariable() {}, ...extra,
});

test('칠하기 용도는 레이어 종류(QA #4 불합격 1) — 흰 글자는 배경 역할이 아니라 color/text/inverse, 흰 프레임은 background/default', async () => {
  const figma = installFigma();
  await legacyColorFile(figma);
  const white = textNode('contact', '#ffffff');
  const body = textNode('body', '#000000');
  // 흰 글자는 파란 버튼(프레임 자신의 채움) 위 — 배경이 유채색이라 inverse(12.4 합친 판정)
  const button = { type: 'FRAME', id: 'button', name: 'button', layoutMode: 'NONE', fills: [{ type: 'SOLID', color: hexToRgb('#3d5fdb') }], children: [white], setBoundVariable() {} };
  const panel = { type: 'FRAME', id: 'panel', name: 'panel', layoutMode: 'NONE', fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }], children: [button, body], setBoundVariable() {} };
  white.parent = button;
  button.parent = panel;
  body.parent = panel;
  const dry = await bindSelection([panel], false);
  const fillOf = (id) => dry.candidates.find((c) => c.nodeId === id && c.field === 'fills');
  assert.equal(fillOf('panel').variableName, 'color/background/default');
  assert.equal(fillOf('body').variableName, 'color/text/default'); // 옛 색 이름도 순서 2에서는 쓴다(12.7)
  assert.equal(fillOf('contact').variableName, 'color/text/inverse');
  assert.equal(fillOf('contact').newRoleGlobalName, 'color/gray/0');
  await bindSelection([panel]);
  const inv = findVar(figma, 'Semantic', 'color/text/inverse');
  assert.equal(white.fills[0].boundVariables.color.id, inv.id);
  assert.deepEqual(inv.scopes, ['TEXT_FILL']);
  assert.equal(inv.getPluginData('dsl.autoRole'), '1');
  assert.equal(roleTarget(figma, inv.id), findVar(figma, 'Global', 'color/gray/0').id);
});

test('보는 순서 1 → 3 → 2 → 4 — 같은 값이면 디자이너 변수가 쓰임 이름 역할보다 먼저, 이름 순', async () => {
  const figma = installFigma();
  await createTokens([{ name: 'spacing/16', category: 'gap', sources: ['gap'], value: 16 }], 16);
  const g = findVar(figma, 'Global', 'spacing/16');
  const auto = designerRole(figma, 'spacing/gap', g);
  auto.setPluginData('dsl.autoRole', '1'); // 플러그인이 만든 쓰임 역할
  const zed = designerRole(figma, 'spacing/zed', g);
  const alpha = designerRole(figma, 'spacing/alpha', g);
  const frame = {
    type: 'FRAME', id: 'f', name: 'f', fills: [], layoutMode: 'VERTICAL', itemSpacing: 16, paddingLeft: 0, paddingRight: 0, paddingTop: 0, paddingBottom: 0,
    layoutSizingHorizontal: 'HUG', layoutSizingVertical: 'HUG', setBoundVariable() {},
  };
  const dry = await bindSelection([frame], false);
  assert.equal(dry.candidates[0].variableId, alpha.id); // 디자이너 변수(이름 순 첫 번째)
  void zed;
  // 디자이너 변수가 없으면 쓰임 이름 역할(순서 2)
  alpha.remove();
  zed.remove();
  const dry2 = await bindSelection([frame], false);
  assert.equal(dry2.candidates[0].variableId, auto.id);
});

test('새 역할 — 한 번의 찾기에서 번호는 곳 수 순, 모든 모드에 별칭, 역할을 만들면 다시 쓴다', async () => {
  const figma = installFigma();
  await createTokens(
    [
      { name: 'spacing/52', category: 'gap', sources: ['gap'], value: 52 },
      { name: 'spacing/10', category: 'gap', sources: ['gap'], value: 10 },
    ],
    16,
  );
  const sem = figma._state.collections.find((c) => c.name === 'Semantic') ?? figma.variables.createVariableCollection('Semantic');
  sem.addMode('Dark'); // 다크 단계가 만든 모드 — 새 역할은 모든 모드에 같은 Global 별칭(12.6)
  const mk = (id, gap) => ({
    type: 'FRAME', id, name: id, fills: [], layoutMode: 'VERTICAL', itemSpacing: gap, paddingLeft: 0, paddingRight: 0, paddingTop: 0, paddingBottom: 0,
    layoutSizingHorizontal: 'HUG', layoutSizingVertical: 'HUG', boundVariables: {},
    setBoundVariable(field, v) { this.boundVariables[field] = { type: 'VARIABLE_ALIAS', id: v.id }; },
  });
  const frames = [mk('a', 52), mk('b', 52), mk('c', 10)];
  const dry = await bindSelection(frames, false);
  const nameOf = (id) => dry.candidates.find((c) => c.nodeId === id).variableName;
  assert.equal(nameOf('a'), 'spacing/gap'); // 52가 두 곳 — 번호 없는 이름
  assert.equal(nameOf('c'), 'spacing/gap-2');
  const r = await bindSelection(frames);
  assert.equal(r.newRoles, 2);
  const v = findVar(figma, 'Semantic', 'spacing/gap');
  assert.equal(frames[1].boundVariables.itemSpacing.id, v.id); // 같은 이름은 한 번만 만든다
  assert.equal(Object.keys(v.valuesByMode).length, 2); // 기본 + Dark 모드 모두 별칭
  for (const val of Object.values(v.valuesByMode)) assert.equal(val.id, findVar(figma, 'Global', 'spacing/52').id);
  // 다음 찾기는 만든 역할을 쓴다(새로 만들지 않음)
  frames.push(mk('d', 52));
  const dry3 = await bindSelection([frames[3]], false);
  assert.equal(dry3.candidates[0].variableId, v.id);
});

test('createUsageRoles — 만들기는 쓰임마다 역할, 같은 값이면 재사용, 다른 값이면 다음 번호(덮어쓰지 않음)', async () => {
  const figma = installFigma();
  const tokens = [
    { name: 'spacing/24', category: 'gap', sources: ['gap'], value: 24, uses: [{ name: 'spacing/card/gap', count: 3 }] },
    { name: 'spacing/16', category: 'gap', sources: ['gap'], value: 16, uses: [{ name: 'spacing/card/gap', count: 1 }, { name: 'spacing/padding', count: 2 }] },
    { name: 'color/111111', category: 'color', sources: ['fill'], value: '#111111', uses: [{ name: 'color/text', count: 5 }] },
    { name: 'color/ffffff', category: 'color', sources: ['fill'], value: '#ffffff', uses: [{ name: 'color/text', count: 1, bg: 'dark' }] },
  ];
  await createTokens(tokens, 16);
  assert.equal(await createUsageRoles(tokens, true), 5); // 미리보기는 세기만
  assert.equal(findVar(figma, 'Semantic', 'spacing/card/gap'), undefined);
  assert.equal(await createUsageRoles(tokens), 5);
  assert.equal(roleTarget(figma, findVar(figma, 'Semantic', 'spacing/card/gap').id), findVar(figma, 'Global', 'spacing/24').id);
  assert.equal(roleTarget(figma, findVar(figma, 'Semantic', 'spacing/card/gap-2').id), findVar(figma, 'Global', 'spacing/16').id);
  assert.ok(findVar(figma, 'Semantic', 'spacing/padding'));
  assert.ok(findVar(figma, 'Semantic', 'color/text/default'));
  assert.ok(findVar(figma, 'Semantic', 'color/text/inverse'));
  // 다시 돌려도 같은 값은 재사용 — 새로 만들지 않고 값도 그대로
  assert.equal(await createUsageRoles(tokens), 0);
  // 다른 선택에서 card/gap의 최빈값이 32로 바뀌어도 기존 역할은 덮지 않고 다음 번호
  await createTokens([{ name: 'spacing/32', category: 'gap', sources: ['gap'], value: 32 }], 16);
  assert.equal(await createUsageRoles([{ name: 'spacing/32', category: 'gap', sources: ['gap'], value: 32, uses: [{ name: 'spacing/card/gap', count: 9 }] }]), 1);
  assert.equal(roleTarget(figma, findVar(figma, 'Semantic', 'spacing/card/gap').id), findVar(figma, 'Global', 'spacing/24').id);
  assert.ok(findVar(figma, 'Semantic', 'spacing/card/gap-3'));
});

test('extractFromSelection — 쓰임 목록(uses)을 모은다, 격자 정리로 옮긴 값은 쓰임을 버린다', () => {
  installFigma();
  const label = textNode('t', '#111111');
  const card = {
    type: 'FRAME', id: 'card', name: 'card', fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }], layoutMode: 'VERTICAL',
    itemSpacing: 24, paddingLeft: 16, paddingRight: 16, paddingTop: 16, paddingBottom: 16, layoutSizingHorizontal: 'HUG', layoutSizingVertical: 'HUG',
    children: [label],
  };
  label.parent = card;
  const { tokens } = extractFromSelection([card], (n) => (n.id === 'card' ? 'card' : undefined));
  const by = (name) => tokens.find((x) => x.name === name);
  assert.deepEqual(by('spacing/24').uses, [{ name: 'spacing/card/gap', count: 1 }]);
  assert.deepEqual(by('spacing/16').uses, [{ name: 'spacing/card/padding', count: 4 }]);
  assert.deepEqual(by('color/ffffff').uses, [{ name: 'color/background', count: 1 }]);
  assert.deepEqual(by('color/111111').uses, [{ name: 'color/text', count: 1, bg: 'light' }]); // 흰 카드 위 글자 — 배경 종류를 함께 센다(12.4)
});

/* ---------- A.10 (2026-11-06 실기 뒤): 용도가 틀린 연결 바꾸기 · 크기 연결 풀기 · inverse 합친 판정 · 옛 단계 이름 ---------- */

test('이미 붙은 연결(12.8 결정 B) — 흰 글자에 붙은 background/default(용도 틀림)도 바꾸지 않는다', async () => {
  const figma = installFigma();
  await legacyColorFile(figma);
  const bgDefault = findVar(figma, 'Semantic', 'color/background/default');
  const white = textNode('contact', '#ffffff', { fills: [{ type: 'SOLID', color: hexToRgb('#ffffff'), boundVariables: { color: { type: 'VARIABLE_ALIAS', id: bgDefault.id } } }] });
  const button = { type: 'FRAME', id: 'button', name: 'button', layoutMode: 'NONE', fills: [{ type: 'SOLID', color: hexToRgb('#e68e6c') }], children: [white], setBoundVariable() {} };
  white.parent = button;
  const dry = await bindSelection([button], false);
  assert.equal(dry.candidates.find((x) => x.nodeId === 'contact'), undefined);
  assert.ok(dry.reasons['already-bound'] >= 1);
  await bindSelection([button]);
  assert.equal(white.fills[0].boundVariables.color.id, bgDefault.id);
  assert.equal(findVar(figma, 'Semantic', 'color/text/inverse'), undefined);
});

test('이미 붙은 연결(12.8 결정 B) — 카드 width에 붙은 Global은 그대로(후보 없음 · 건너뜀으로도 안 셈)', async () => {
  const figma = installFigma();
  await createTokens([{ name: 'size/1440', category: 'size', sources: ['size'], value: 1440 }], 16);
  const g = findVar(figma, 'Global', 'size/1440');
  const label = textNode('label', '#000000');
  const card = {
    type: 'FRAME', id: 'card', name: 'card', fills: [], layoutMode: 'VERTICAL', itemSpacing: 0, paddingLeft: 0, paddingRight: 0, paddingTop: 0, paddingBottom: 0,
    width: 1440, height: 300, layoutSizingHorizontal: 'FIXED', layoutSizingVertical: 'HUG', children: [label],
    boundVariables: { width: { type: 'VARIABLE_ALIAS', id: g.id } }, setBoundVariable() {},
  };
  label.parent = card;
  const dry = await bindSelection([card], false);
  assert.equal(dry.candidates.find((x) => x.field === 'width'), undefined);
  assert.ok(!dry.skips.some((x) => x.nodeId === 'card' && x.field === 'width'));
  assert.equal(card.boundVariables.width.id, g.id);
});

test('카드 크기 — Semantic이 붙어 있어도 건드리지 않는다(찾지도 세지도 않음)', async () => {
  const figma = installFigma();
  await createTokens([{ name: 'size/1440', category: 'size', sources: ['size'], value: 1440 }], 16);
  const role = designerRole(figma, 'size/page', findVar(figma, 'Global', 'size/1440'));
  const label = textNode('label', '#000000');
  const card = {
    type: 'FRAME', id: 'card', name: 'card', fills: [], layoutMode: 'NONE', width: 1440, height: 300, children: [label],
    boundVariables: { width: { type: 'VARIABLE_ALIAS', id: role.id } }, setBoundVariable() {},
  };
  label.parent = card;
  const dry = await bindSelection([card], false);
  assert.equal(dry.candidates.find((x) => x.field === 'width'), undefined);
});

test('backgroundOf — 조상 첫 보이는 채움(불투명 SOLID만), 이미지 · 반투명 · 없음은 모름, 자기 채움은 보지 않음', () => {
  installFigma();
  const leaf = textNode('t', '#ffffff');
  const mid = { type: 'FRAME', id: 'mid', fills: [{ type: 'SOLID', color: hexToRgb('#000000'), visible: false }], children: [leaf] };
  const top = { type: 'FRAME', id: 'top', fills: [{ type: 'SOLID', color: hexToRgb('#ffffff') }, { type: 'SOLID', color: hexToRgb('#3d5fdb') }], children: [mid] };
  leaf.parent = mid;
  mid.parent = top;
  top.parent = { type: 'PAGE' };
  assert.equal(backgroundOf(leaf), '#3d5fdb'); // 숨긴 칠하기는 건너뛰고, 맨 위(배열 끝) 칠하기
  top.fills = [{ type: 'IMAGE', scaleMode: 'FILL' }];
  assert.equal(backgroundOf(leaf), undefined);
  top.fills = [{ type: 'SOLID', color: hexToRgb('#3d5fdb'), opacity: 0.5 }];
  assert.equal(backgroundOf(leaf), undefined);
  top.fills = [];
  assert.equal(backgroundOf(leaf), undefined); // 페이지까지 채움 없음
});

test('extractFromSelection — 같은 흰 글자가 버튼 위 · 카드 위에 있으면 배경 종류별로 따로 세고, 만들기는 inverse · subtle 두 역할', async () => {
  const figma = installFigma();
  const onButton = textNode('a', '#ffffff');
  const onCard = textNode('b', '#ffffff');
  const dark = textNode('c', '#111111');
  const dark2 = textNode('d', '#111111');
  const button = { type: 'FRAME', id: 'btn', name: 'btn', layoutMode: 'NONE', fills: [{ type: 'SOLID', color: hexToRgb('#3d5fdb') }], children: [onButton] };
  const card = { type: 'FRAME', id: 'card', name: 'card', layoutMode: 'NONE', fills: [{ type: 'SOLID', color: hexToRgb('#e9e9e9') }], children: [onCard, dark, dark2] };
  const root = { type: 'FRAME', id: 'root', name: 'root', layoutMode: 'NONE', fills: [], children: [button, card] };
  onButton.parent = button;
  onCard.parent = card;
  dark.parent = card;
  dark2.parent = card;
  button.parent = root;
  card.parent = root;
  const { tokens } = extractFromSelection([root]);
  const white = tokens.find((x) => x.name === 'color/ffffff');
  assert.deepEqual(white.uses, [{ name: 'color/text', count: 1, bg: 'chroma' }, { name: 'color/text', count: 1, bg: 'light' }]);
  await createTokens(tokens, 16);
  await createUsageRoles(tokens);
  const inv = findVar(figma, 'Semantic', 'color/text/inverse');
  const sub = findVar(figma, 'Semantic', 'color/text/subtle');
  assert.ok(inv && sub);
  assert.equal(roleTarget(figma, inv.id), roleTarget(figma, sub.id)); // 같은 Global 별칭
  assert.ok(findVar(figma, 'Semantic', 'color/text/default')); // #111(2곳)이 기준
});

test('옛 단계 이름(12.7) — size · 칸 밖 · -N 변형도 순서 3에서 빼고 쓰임 역할을 만든다', async () => {
  for (const n of ['size/md', 'spacing/4xl-2', 'size/4xl-20', 'radius/full', 'radius/3xl', 'stroke-width/thin', 'spacing/none']) assert.equal(isOldPluginName(n), true, n);
  for (const n of ['size/icon', 'size/avatar', 'spacing/gap-2', 'radius/default', 'stroke-width/default', 'spacing/card/gap', 'radius/button']) assert.equal(isOldPluginName(n), false, n);
  const figma = installFigma();
  await createTokens([{ name: 'spacing/16', category: 'gap', sources: ['gap'], value: 16 }], 16);
  const g = findVar(figma, 'Global', 'spacing/16');
  designerRole(figma, 'spacing/4xl-2', g);
  const frame = {
    type: 'FRAME', id: 'f', name: 'f', fills: [], layoutMode: 'VERTICAL', itemSpacing: 16, paddingLeft: 0, paddingRight: 0, paddingTop: 0, paddingBottom: 0,
    layoutSizingHorizontal: 'HUG', layoutSizingVertical: 'HUG', setBoundVariable() {},
  };
  const dry = await bindSelection([frame], false);
  assert.equal(dry.candidates[0].variableName, 'spacing/gap');
  assert.ok(dry.candidates[0].newRole);
});

test('이미 붙은 연결(12.8 결정 B) — 아이콘의 HUG 축에 붙은 Global은 hug-fill, FIXED 축에 붙은 Global은 이미 연결됨', async () => {
  const figma = installFigma();
  await createTokens([{ name: 'size/24', category: 'size', sources: ['size'], value: 24 }], 16);
  const g = findVar(figma, 'Global', 'size/24');
  const vec = { type: 'VECTOR', id: 'v', name: 'v', visible: true, fills: [], strokes: [{ type: 'SOLID', color: hexToRgb('#000000') }], strokeWeight: 1.5 };
  const icon = {
    type: 'FRAME', id: 'icon', name: 'icon', fills: [], layoutMode: 'NONE', width: 24, height: 24, layoutSizingHorizontal: 'FIXED', layoutSizingVertical: 'HUG',
    children: [vec], boundVariables: { width: { type: 'VARIABLE_ALIAS', id: g.id }, height: { type: 'VARIABLE_ALIAS', id: g.id } }, setBoundVariable() {},
  };
  vec.parent = icon;
  const row = { type: 'FRAME', id: 'row', name: 'row', fills: [], layoutMode: 'HORIZONTAL', itemSpacing: 0, paddingLeft: 0, paddingRight: 0, paddingTop: 0, paddingBottom: 0, children: [icon], setBoundVariable() {} };
  icon.parent = row;
  const dry = await bindSelection([row], false);
  assert.equal(dry.candidates.filter((c) => c.nodeId === 'icon').length, 0);
  assert.ok(dry.skips.some((x) => x.nodeId === 'icon' && x.reason === 'hug-fill'));
  assert.ok(dry.skips.some((x) => x.nodeId === 'icon' && x.reason === 'already-bound'));
});

test('planExistingTextStyles · applyTextStyleRows — 스타일 줄 미리보기(쓰지 않음) · 켠 줄만 연결 · 그 사이 스타일이 붙으면 건너뜀', async () => {
  const figma = installFigma();
  await createSemanticTextStyles([
    { name: 'body', fontSize: 16, lineHeight: 24, letterSpacing: 0, family: 'Inter', style: 'Regular' },
    { name: 'title', fontSize: 24, lineHeight: 36, letterSpacing: 0, family: 'Inter', style: 'Regular' },
  ]);
  const body = figma._state.textStyles.find((s) => s.name === 'body');
  const title = figma._state.textStyles.find((s) => s.name === 'title');
  const mkText = (id, fontSize) => ({
    type: 'TEXT', id, name: id, fontSize, fontName: { family: 'Inter', style: 'Regular' },
    lineHeight: { unit: 'PIXELS', value: fontSize * 1.5 }, letterSpacing: { unit: 'PIXELS', value: 0 },
    characters: 'hi', visible: true, textStyleId: '',
    _styleId: null, async setTextStyleIdAsync(sid) { this._styleId = sid; this.textStyleId = sid; },
  });
  const a = mkText('a', 16), b = mkText('b', 16), c = mkText('c', 24), d = mkText('d', 40);
  const plan = await planExistingTextStyles([a, b, c, d]);
  assert.deepEqual(plan.rows.map((r) => [r.name, r.nodeIds]).sort(), [['body', ['a', 'b']], ['title', ['c']]]);
  assert.equal(plan.skipReasons.noStyle, 1);
  assert.equal(a._styleId, null, '미리보기는 쓰지 않는다');
  registerNodes(figma, [a, b, c, d]);
  // 그 사이 b에 스타일이 붙었다 → 건너뜀. title 줄은 끔(보내지 않음).
  b.textStyleId = title.id;
  const r = await applyTextStyleRows([{ styleId: body.id, nodeIds: ['a', 'b'] }]);
  assert.equal(r.applied, 1);
  assert.equal(a._styleId, body.id);
  assert.equal(b._styleId, null);
  assert.equal(c._styleId, null, '끈 줄은 붙이지 않는다');
  assert.equal(r.skipped, 1);
  assert.equal(r.skipReasons.hasStyle, 1);
});

/* ================= 클릭 연결 · 새 변수 · 복제 · 삭제(IA v4 §4.7 · §4.9, B.3) ================= */
const solid = (hex, extra = {}) => ({ type: 'SOLID', color: hexToRgb(hex), ...extra });
const GRAD = { type: 'GRADIENT_LINEAR', gradientStops: [], gradientTransform: [[1, 0, 0], [0, 1, 0]] };
const SHADOW = { type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.25 }, offset: { x: 0, y: 2 }, radius: 4, visible: true, blendMode: 'NORMAL' };
/** 연결을 기록하는 노드 목. setBoundVariable(field, v) → boundVariables[field] = alias. */
function node(type, extra = {}) {
  const n = {
    type, id: `${type}:${Math.random().toString(36).slice(2, 7)}`, name: type, boundVariables: {},
    setBoundVariable(field, v) { this.boundVariables[field] = { type: 'VARIABLE_ALIAS', id: v.id }; },
    ...extra,
  };
  return n;
}
const frame = (extra = {}) => node('FRAME', { fills: [], strokes: [], effects: [], opacity: 1, width: 10, height: 10, strokeWeight: 0, strokeTopWeight: 0, strokeRightWeight: 0, strokeBottomWeight: 0, strokeLeftWeight: 0, topLeftRadius: 0, topRightRadius: 0, bottomLeftRadius: 0, bottomRightRadius: 0, layoutMode: 'NONE', itemSpacing: 0, counterAxisSpacing: 0, paddingTop: 0, paddingRight: 0, paddingBottom: 0, paddingLeft: 0, ...extra });
const rect = (extra = {}) => node('RECTANGLE', { fills: [], strokes: [], effects: [], opacity: 1, width: 10, height: 10, strokeWeight: 0, topLeftRadius: 0, topRightRadius: 0, bottomLeftRadius: 0, bottomRightRadius: 0, ...extra });
const ellipse = (extra = {}) => node('ELLIPSE', { fills: [], strokes: [], effects: [], opacity: 1, width: 10, height: 10, strokeWeight: 0, ...extra });
function text(chars = 'Hi', extra = {}) {
  return node('TEXT', {
    characters: chars, fontName: { family: 'Inter', style: 'Bold' }, fontSize: 13, fills: [solid('#000000')], strokes: [], effects: [], opacity: 1, width: 10, height: 10, strokeWeight: 0,
    ranges: [],
    getRangeAllFontNames() { return [{ family: 'Inter', style: 'Bold' }, { family: 'Inter', style: 'Regular' }]; },
    setRangeBoundVariable(start, end, field, v) { this.ranges.push({ start, end, field, id: v.id }); },
    ...extra,
  });
}
function mkVar(figma, name, type, scopes, value, colName = 'Tokens') {
  let col = figma._state.collections.find((c) => c.name === colName);
  if (!col) col = figma.variables.createVariableCollection(colName);
  const v = figma.variables.createVariable(name, col, type);
  if (scopes) v.scopes = scopes;
  else v.scopes = ['ALL_SCOPES'];
  if (value !== undefined) v.setValueForMode(col.defaultModeId, value);
  return v;
}
const bound = (paint) => paint?.boundVariables?.color?.id;

test('클릭 연결 색 — 맨 위 보이는 단색에, 숨긴 단색은 건너뛰고, 단색이 없으면 맨 위에 새 단색', async () => {
  const figma = installFigma();
  const v = mkVar(figma, 'color/brand', 'COLOR', null, hexToRgb('#3366ff'));
  const a = frame({ fills: [solid('#111111'), solid('#222222')] });
  const b = frame({ fills: [solid('#111111'), solid('#222222', { visible: false })] });
  const c = frame({ fills: [GRAD] });
  const d = frame({ fills: [] });
  const r = await applyVariableToNodes([a, b, c, d], v);
  assert.deepEqual(r, { applied: 4, skipped: 0, skipReasons: {} });
  assert.equal(bound(a.fills[1]), v.id);
  assert.equal(bound(a.fills[0]), undefined);
  assert.equal(bound(b.fills[0]), v.id, '숨긴 단색 아래의 보이는 단색');
  assert.equal(c.fills.length, 2);
  assert.equal(c.fills[0].type, 'GRADIENT_LINEAR', '그라디언트는 그대로');
  assert.equal(bound(c.fills[1]), v.id, '새 단색은 맨 위(배열 끝)');
  assert.equal(d.fills.length, 1);
  assert.equal(bound(d.fills[0]), v.id);
});

test('클릭 연결 색 — 글자 레이어는 글자 색, 구간마다 다르면 글자 전체를 단색 하나로 · 그룹은 건너뜀', async () => {
  const figma = installFigma();
  const v = mkVar(figma, 'color/text', 'COLOR', null, hexToRgb('#000000'));
  const t1 = text();
  const t2 = text('Mixed', { fills: figma.mixed });
  const g = node('GROUP', {});
  const r = await applyVariableToNodes([t1, t2, g], v);
  assert.equal(r.applied, 2);
  assert.deepEqual(r.skipReasons, { 'no-prop': 1 });
  assert.equal(bound(t1.fills[0]), v.id);
  assert.equal(Array.isArray(t2.fills), true);
  assert.equal(t2.fills.length, 1);
  assert.equal(bound(t2.fills[0]), v.id);
});

test('클릭 연결 색 — 채움 용도는 레이어 종류(글자 TEXT_FILL · 프레임 FRAME_FILL · 도형 SHAPE_FILL), 막히면 다음 속성(보이는 것만)', async () => {
  const figma = installFigma();
  const v = mkVar(figma, 'color/x', 'COLOR', ['FRAME_FILL', 'STROKE_COLOR'], hexToRgb('#ff0000'));
  const f = frame({ fills: [solid('#ffffff')] });
  const shapeNoStroke = rect({ fills: [solid('#ffffff')] });
  const shapeStroke = rect({ fills: [solid('#ffffff')], strokes: [solid('#cccccc')] });
  const t = text('Hi', { strokes: [] });
  const r = await applyVariableToNodes([f, shapeNoStroke, shapeStroke, t], v);
  assert.equal(r.applied, 2);
  assert.equal(r.skipped, 2);
  assert.deepEqual(r.skipReasons, { 'no-stroke': 2 }, '넘어간 선에는 새로 만들지 않는다');
  assert.equal(bound(f.fills[0]), v.id);
  assert.equal(bound(shapeNoStroke.fills[0]), undefined);
  assert.equal(shapeNoStroke.strokes.length, 0);
  assert.equal(bound(shapeStroke.strokes[0]), v.id);
  assert.equal(bound(shapeStroke.fills[0]), undefined);
  // ALL_FILLS는 셋 다
  const all = mkVar(figma, 'color/all', 'COLOR', ['ALL_FILLS'], hexToRgb('#00ff00'));
  const r2 = await applyVariableToNodes([rect({ fills: [solid('#fff000')] }), text(), frame({ fills: [solid('#fff000')] })], all);
  assert.equal(r2.applied, 3);
});

test('클릭 연결 — 빈 용도([])는 모든 레이어 no-scope, 그림자만 허용이면 그림자(없으면 no-shadow)', async () => {
  const figma = installFigma();
  const none = mkVar(figma, 'color/none', 'COLOR', [], hexToRgb('#ff0000'));
  const r = await applyVariableToNodes([frame({ fills: [solid('#ffffff')] }), text()], none);
  assert.deepEqual(r, { applied: 0, skipped: 2, skipReasons: { 'no-scope': 2 } });
  const sh = mkVar(figma, 'color/shadow', 'COLOR', ['EFFECT_COLOR'], { r: 0, g: 0, b: 0, a: 0.3 });
  const withShadow = frame({ effects: [SHADOW] });
  const without = frame();
  const r2 = await applyVariableToNodes([withShadow, without], sh);
  assert.deepEqual(r2, { applied: 1, skipped: 1, skipReasons: { 'no-shadow': 1 } });
  assert.equal(withShadow.effects[0].boundVariables.color.id, sh.id);
  // target도 용도 확인(no-scope)
  const r3 = await applyVariableToNodes([frame()], none, 'stroke');
  assert.deepEqual(r3.skipReasons, { 'no-scope': 1 });
});

test('클릭 연결 — 기존 연결을 바꾸고, Global 변수도 붙인다 · 숨긴 · 잠긴 선택 레이어도 한다', async () => {
  const figma = installFigma();
  const a = mkVar(figma, 'color/gray/100', 'COLOR', ['ALL_SCOPES'], hexToRgb('#eeeeee'), 'Global');
  const b = mkVar(figma, 'color/gray/900', 'COLOR', ['ALL_SCOPES'], hexToRgb('#111111'), 'Global');
  const f = frame({ visible: false, locked: true, fills: [figma.variables.setBoundVariableForPaint(solid('#eeeeee'), 'color', a)] });
  const r = await applyVariableToNodes([f], b);
  assert.equal(r.applied, 1);
  assert.equal(bound(f.fills[0]), b.id);
});

test('클릭 연결 target — 그 속성만: 선은 1px 안쪽 단색을 만들고, 그림자가 없으면 건너뜀(다른 속성으로 가지 않음)', async () => {
  const figma = installFigma();
  const v = mkVar(figma, 'color/border', 'COLOR', ['ALL_FILLS', 'STROKE_COLOR', 'EFFECT_COLOR'], hexToRgb('#cccccc'));
  const f = frame({ fills: [solid('#ffffff')], strokeWeight: 0 });
  const r = await applyVariableToNodes([f], v, 'stroke');
  assert.equal(r.applied, 1);
  assert.equal(f.strokes.length, 1);
  assert.equal(bound(f.strokes[0]), v.id);
  assert.equal(f.strokeWeight, 1);
  assert.equal(f.strokeAlign, 'INSIDE');
  assert.equal(bound(f.fills[0]), undefined, '채움은 그대로');
  const g = frame({ fills: [solid('#ffffff')] });
  const r2 = await applyVariableToNodes([g], v, 'shadow');
  assert.deepEqual(r2, { applied: 0, skipped: 1, skipReasons: { 'no-shadow': 1 } });
  assert.equal(bound(g.fills[0]), undefined);
  // 글자 색 target은 글자 레이어만
  const r3 = await applyVariableToNodes([frame({ fills: [solid('#ffffff')] }), text()], v, 'text');
  assert.deepEqual(r3, { applied: 1, skipped: 1, skipReasons: { 'no-prop': 1 } });
});

test('클릭 연결 간격 — 이름 끝 마디로 속성, 오토 레이아웃만 · 사용자 Component 이름(button/padding-x) · 용도로 판정(4)', async () => {
  const figma = installFigma();
  const al = () => frame({ layoutMode: 'HORIZONTAL' });
  const sp = mkVar(figma, 'spacing/16', 'FLOAT', ['GAP'], 16);
  const a = al();
  const none = frame();
  const grid = frame({ layoutMode: 'GRID' });
  const r = await applyVariableToNodes([a, none, grid], sp);
  assert.deepEqual(r, { applied: 1, skipped: 2, skipReasons: { 'not-autolayout': 2 } });
  assert.deepEqual(Object.keys(a.boundVariables), ['itemSpacing']);

  const px = mkVar(figma, 'button/padding-x', 'FLOAT', ['GAP'], 12, 'Component');
  const b = al();
  await applyVariableToNodes([b], px);
  assert.deepEqual(Object.keys(b.boundVariables).sort(), ['paddingLeft', 'paddingRight']);

  const pad = mkVar(figma, 'card/padding', 'FLOAT', ['ALL_SCOPES'], 8);
  const c = al();
  await applyVariableToNodes([c], pad);
  assert.deepEqual(Object.keys(c.boundVariables).sort(), ['paddingBottom', 'paddingLeft', 'paddingRight', 'paddingTop']);

  const rowGap = mkVar(figma, 'grid/row-gap', 'FLOAT', ['GAP'], 4);
  const wrap = frame({ layoutMode: 'HORIZONTAL', layoutWrap: 'WRAP' });
  const nowrap = al();
  await applyVariableToNodes([wrap, nowrap], rowGap);
  assert.deepEqual(Object.keys(wrap.boundVariables), ['counterAxisSpacing']);
  assert.deepEqual(Object.keys(nowrap.boundVariables), ['itemSpacing']);

  // 이름으로 못 정하면 용도(판정 4) — GAP 하나면 간격
  const byScope = mkVar(figma, 'misc/foo', 'FLOAT', ['GAP'], 4);
  const d = al();
  await applyVariableToNodes([d], byScope);
  assert.deepEqual(Object.keys(d.boundVariables), ['itemSpacing']);

  // target padding-top
  const e = al();
  await applyVariableToNodes([e], sp, 'padding-top');
  assert.deepEqual(Object.keys(e.boundVariables), ['paddingTop']);
  // 용도가 GAP을 막으면 no-scope
  const off = mkVar(figma, 'spacing/x', 'FLOAT', ['CORNER_RADIUS'], 4);
  const r2 = await applyVariableToNodes([al()], off);
  assert.deepEqual(r2.skipReasons, { 'no-scope': 1 });
});

test('클릭 연결 반경 · 크기 · 선 두께 · 투명도', async () => {
  const figma = installFigma();
  const rad = mkVar(figma, 'radius/8', 'FLOAT', ['CORNER_RADIUS'], 8);
  const f = frame();
  const el = ellipse();
  const r = await applyVariableToNodes([f, el, text()], rad);
  assert.deepEqual(r, { applied: 1, skipped: 2, skipReasons: { 'no-prop': 2 } });
  assert.deepEqual(Object.keys(f.boundVariables).sort(), ['bottomLeftRadius', 'bottomRightRadius', 'topLeftRadius', 'topRightRadius']);
  const tl = mkVar(figma, 'card/radius-top-left', 'FLOAT', ['CORNER_RADIUS'], 8);
  const f2 = frame();
  await applyVariableToNodes([f2], tl);
  assert.deepEqual(Object.keys(f2.boundVariables), ['topLeftRadius']);
  const f3 = frame();
  await applyVariableToNodes([f3], rad, 'radius-br');
  assert.deepEqual(Object.keys(f3.boundVariables), ['bottomRightRadius']);

  const size = mkVar(figma, 'size/24', 'FLOAT', ['WIDTH_HEIGHT'], 24);
  const hug = frame({ layoutSizingHorizontal: 'HUG', layoutSizingVertical: 'FILL' });
  const g = node('GROUP', { width: 10, height: 10 });
  const r2 = await applyVariableToNodes([hug, g, text()], size);
  assert.deepEqual(r2, { applied: 1, skipped: 2, skipReasons: { 'no-prop': 2 } });
  assert.equal(hug.layoutSizingHorizontal, 'FIXED');
  assert.equal(hug.layoutSizingVertical, 'FIXED');
  assert.deepEqual(Object.keys(hug.boundVariables).sort(), ['height', 'width']);
  const w = mkVar(figma, 'icon/width', 'FLOAT', ['WIDTH_HEIGHT'], 24);
  const fw = frame({ layoutSizingHorizontal: 'FIXED', layoutSizingVertical: 'HUG' });
  await applyVariableToNodes([fw], w);
  assert.deepEqual(Object.keys(fw.boundVariables), ['width']);
  assert.equal(fw.layoutSizingVertical, 'HUG', '안 붙인 축은 그대로');

  const sw = mkVar(figma, 'stroke-width/1', 'FLOAT', ['STROKE_FLOAT'], 1);
  const stroked = frame({ strokes: [solid('#000000')], strokeWeight: 1 });
  const bare = frame();
  const r3 = await applyVariableToNodes([stroked, bare], sw);
  assert.deepEqual(r3, { applied: 1, skipped: 1, skipReasons: { 'no-stroke': 1 } });
  assert.deepEqual(Object.keys(stroked.boundVariables), ['strokeWeight']);
  const top = mkVar(figma, 'divider/stroke-width-top', 'FLOAT', ['STROKE_FLOAT'], 1);
  const s2 = frame({ strokes: [solid('#000000')], strokeWeight: 1 });
  await applyVariableToNodes([s2], top);
  assert.deepEqual(Object.keys(s2.boundVariables), ['strokeTopWeight']);

  const op = mkVar(figma, 'opacity/50', 'FLOAT', ['OPACITY'], 0.5);
  const o = rect();
  await applyVariableToNodes([o], op);
  assert.deepEqual(Object.keys(o.boundVariables), ['opacity']);
});

test('클릭 연결 글자 — 그 글자 속성, 모든 구간 글꼴을 먼저 불러옴 · 빈 글자 · 글꼴에 같은 스타일이 없으면 건너뜀', async () => {
  const figma = installFigma();
  const loaded = [];
  figma.loadFontAsync = async (f) => {
    if (f.family === 'Nope') throw new Error('no font');
    loaded.push(`${f.family}/${f.style}`);
  };
  const fs = mkVar(figma, 'font-size/14', 'FLOAT', ['FONT_SIZE'], 14);
  const t = text();
  const r = await applyVariableToNodes([t, text(''), frame()], fs);
  assert.deepEqual(r, { applied: 1, skipped: 2, skipReasons: { 'empty-text': 1, 'no-prop': 1 } });
  assert.deepEqual(t.ranges, [{ start: 0, end: 2, field: 'fontSize', id: fs.id }]);
  assert.deepEqual(loaded, ['Inter/Bold', 'Inter/Regular']);

  const lh = mkVar(figma, 'body/line-height', 'FLOAT', ['LINE_HEIGHT'], 20, 'Component');
  const t2 = text();
  await applyVariableToNodes([t2], lh);
  assert.equal(t2.ranges[0].field, 'lineHeight');

  const famOk = mkVar(figma, 'font-family/body', 'STRING', ['FONT_FAMILY'], 'Pretendard');
  const famBad = mkVar(figma, 'font-family/nope', 'STRING', ['FONT_FAMILY'], 'Nope');
  const t3 = text();
  const t4 = text();
  const r3 = await applyVariableToNodes([t3], famOk);
  const r4 = await applyVariableToNodes([t4], famBad);
  assert.equal(r3.applied, 1);
  assert.ok(loaded.includes('Pretendard/Bold') && loaded.includes('Pretendard/Regular'));
  assert.deepEqual(r4, { applied: 0, skipped: 1, skipReasons: { font: 1 } });
  assert.deepEqual(t4.ranges, []);
});

test('클릭 연결 — 종류를 못 정한 변수(참거짓 · 이름 · 용도로도 모름)는 붙이지 않는다(other-kind)', async () => {
  const figma = installFigma();
  const b = mkVar(figma, 'flag/on', 'BOOLEAN', ['ALL_SCOPES'], true);
  const n = mkVar(figma, 'misc/value', 'FLOAT', ['ALL_SCOPES'], 3);
  const f = frame({ layoutMode: 'HORIZONTAL' });
  assert.deepEqual(await applyVariableToNodes([f, rect()], b), { applied: 0, skipped: 2, skipReasons: { 'other-kind': 2 } });
  assert.deepEqual(await applyVariableToNodes([f], n), { applied: 0, skipped: 1, skipReasons: { 'other-kind': 1 } });
  assert.deepEqual(f.boundVariables, {});
  // 판정 3: 끝 마디로 — 사용자 Component 이름 `button/radius`
  const cr = mkVar(figma, 'button/radius', 'FLOAT', ['ALL_SCOPES'], 6, 'Component');
  const g = frame();
  assert.equal((await applyVariableToNodes([g], cr)).applied, 1);
  assert.ok(g.boundVariables.topLeftRadius);
});

test('새 변수 — 로컬 컬렉션 없으면 사용자 컬렉션 Variables(플러그인 표시 없음) · 값은 기본 모드 · 용도 · dsl.manual', async () => {
  const figma = installFigma();
  const { variable, newCollection } = await createManualVariable({ name: 'spacing/4', varType: 'FLOAT', values: { '*': { kind: 'number', value: 4 } }, scopes: ['GAP'] });
  assert.equal(newCollection, true);
  const col = figma._state.collections.find((c) => c.id === variable.variableCollectionId);
  assert.equal(col.name, 'Variables');
  assert.equal(col.getPluginData('dsl.owned'), '');
  assert.equal(variable.valuesByMode[col.defaultModeId], 4);
  assert.deepEqual(variable.scopes, ['GAP']);
  assert.equal(variable.getPluginData('dsl.manual'), '1');
  assert.equal(isManualVar(variable), true);

  // 모드 둘 — 비운 모드는 기본 모드 값, 별칭도
  const two = figma.variables.createVariableCollection('Theme');
  const dark = two.addMode('Dark');
  const { variable: c } = await createManualVariable({
    collectionId: two.id, name: 'color/bg', varType: 'COLOR',
    values: { [two.defaultModeId]: { kind: 'color', hex: '#ffffff', alpha: 1 } },
  });
  assert.deepEqual(c.valuesByMode[dark], c.valuesByMode[two.defaultModeId]);
  assert.deepEqual(c.scopes, [], '용도를 안 주면 건드리지 않는다');
  const { variable: al } = await createManualVariable({
    collectionId: two.id, name: 'color/fg', varType: 'COLOR',
    values: { [two.defaultModeId]: { kind: 'alias', targetId: c.id }, [dark]: { kind: 'color', hex: '#000000', alpha: 0.5 } },
  });
  assert.deepEqual(al.valuesByMode[two.defaultModeId], { type: 'VARIABLE_ALIAS', id: c.id });
  assert.equal(al.valuesByMode[dark].a, 0.5);

  // 이름 거절 — VarNameError, 새로 만든 Variables는 걷는다
  const before = figma._state.collections.length;
  const orig = figma.variables.createVariable;
  figma.variables.createVariable = () => { throw new Error('invalid name'); };
  await assert.rejects(createManualVariable({ name: 'bad.', varType: 'FLOAT', values: { '*': { kind: 'number', value: 1 } } }), (e) => e instanceof VarNameError && /invalid name/.test(e.message));
  figma.variables.createVariable = orig;
  assert.equal(figma._state.collections.length, before);
  // 없는 컬렉션
  await assert.rejects(createManualVariable({ collectionId: 'col:gone', name: 'x', varType: 'FLOAT', values: { '*': { kind: 'number', value: 1 } } }), VarGoneError);
});

test('복제 — 같은 컬렉션 · 이름 -copy/-copy-2 · 값(별칭) · 용도 · 설명 · 게시 숨김 · 코드 문법 복사, autoRole 대신 dsl.manual', async () => {
  const figma = installFigma();
  const col = figma.variables.createVariableCollection('Semantic');
  const dark = col.addMode('Dark');
  const g = mkVar(figma, 'color/gray/0', 'COLOR', ['ALL_FILLS'], hexToRgb('#ffffff'), 'Global');
  const src = figma.variables.createVariable('color/background/default', col, 'COLOR');
  src.setValueForMode(col.defaultModeId, { type: 'VARIABLE_ALIAS', id: g.id });
  src.setValueForMode(dark, { r: 0, g: 0, b: 0, a: 1 });
  src.scopes = ['FRAME_FILL'];
  src.description = '배경';
  src.hiddenFromPublishing = true;
  src.setVariableCodeSyntax('WEB', 'var(--bg)');
  src.setPluginData('dsl.autoRole', '1');
  figma.variables.createVariable('Color/background/default-copy', col, 'COLOR'); // 대소문자가 다르면 겹치지 않는다

  const a = await duplicateVariable(src.id);
  assert.equal(a.name, 'color/background/default-copy');
  assert.equal(a.variableCollectionId, col.id);
  assert.deepEqual(a.valuesByMode[col.defaultModeId], { type: 'VARIABLE_ALIAS', id: g.id });
  assert.deepEqual(a.valuesByMode[dark], { r: 0, g: 0, b: 0, a: 1 });
  assert.deepEqual(a.scopes, ['FRAME_FILL']);
  assert.notEqual(a.scopes, src.scopes, '배열은 새로');
  assert.equal(a.description, '배경');
  assert.equal(a.hiddenFromPublishing, true);
  assert.deepEqual(a.codeSyntax, { WEB: 'var(--bg)' });
  assert.equal(a.getPluginData('dsl.autoRole'), '');
  assert.equal(a.getPluginData('dsl.manual'), '1');
  const b = await duplicateVariable(src.id);
  assert.equal(b.name, 'color/background/default-copy-2');
  await assert.rejects(duplicateVariable('var:gone'), VarGoneError);
});

test('삭제 — 변수를 지우고, 다시 지우면 VarGoneError', async () => {
  const figma = installFigma();
  const v = mkVar(figma, 'spacing/8', 'FLOAT', ['GAP'], 8);
  assert.equal(await deleteVariable(v.id), 'spacing/8');
  assert.equal(figma._state.variables.includes(v), false);
  await assert.rejects(deleteVariable(v.id), VarGoneError);
});

test('직접 만든 변수 지키기 — createTokens: 같은 값이면 그 변수를 Global로 재사용, 다르면 건너뜀(skippedManual) · 값은 그대로', async () => {
  const figma = installFigma();
  const gcol = figma.variables.createVariableCollection('Global');
  const same = figma.variables.createVariable('color/ff0000', gcol, 'COLOR');
  same.setValueForMode(gcol.defaultModeId, { r: 1, g: 0, b: 0, a: 1 });
  same.setPluginData('dsl.manual', '1');
  same.scopes = ['STROKE_COLOR'];
  const diff = figma.variables.createVariable('color/00ff00', gcol, 'COLOR');
  diff.setValueForMode(gcol.defaultModeId, { r: 0, g: 0, b: 1, a: 1 });
  diff.setPluginData('dsl.manual', '1');
  const toks = [colorTok('#ff0000'), colorTok('#00ff00'), colorTok('#0000ff')];
  const pv = await previewCreateTokens(toks, 16);
  assert.equal(pv.skippedManual, 1);
  assert.equal(pv.created, 1);
  const s = await createTokens(toks, 16);
  assert.equal(s.skippedManual, 1);
  assert.deepEqual([...s.skippedManualNames], ['color/00ff00']);
  assert.equal(s.created, 1);
  assert.equal(s.globalOf.get('color/ff0000'), same.id);
  assert.equal(s.globalOf.has('color/00ff00'), false);
  assert.deepEqual(same.scopes, ['STROKE_COLOR'], '용도 · 값을 덮어쓰지 않는다');
  assert.equal(same.hiddenFromPublishing, false);
  assert.deepEqual(diff.valuesByMode[gcol.defaultModeId], { r: 0, g: 0, b: 1, a: 1 });
  assert.equal(figma._state.variables.filter((v) => v.name === 'color/00ff00').length, 1, '다른 이름으로 새로 만들지 않는다');
  // 쓰임 역할: 건너뛴 토큰은 빼고 — 재사용한 manual은 별칭 대상으로
  const roles = await createUsageRoles(toks.filter((x) => !s.skippedManualNames.has(x.name)), false, s.globalOf);
  assert.equal(roles >= 1, true);
  const sem = figma._state.variables.filter((v) => figma._state.collections.find((c) => c.id === v.variableCollectionId)?.name === 'Semantic');
  const targets = sem.map((v) => Object.values(v.valuesByMode)[0].id);
  assert.ok(targets.includes(same.id));
  assert.equal(targets.includes(diff.id), false);
});

test('직접 만든 변수 지키기 — prunePaletteColors는 지우지 않고, createSemanticAliases는 덮어쓰지 않고 건너뜀으로 센다', async () => {
  const figma = installFigma();
  await createTokens([
    { name: 'color/blue/500', category: 'color', sources: ['fill'], value: '#3366ff' },
    { name: 'color/blue/600', category: 'color', sources: ['fill'], value: '#2255ee' },
  ], 16);
  const gcol = figma._state.collections.find((c) => c.name === 'Global');
  const manual = figma.variables.createVariable('color/blue/700', gcol, 'COLOR');
  manual.setValueForMode(gcol.defaultModeId, hexToRgb('#1144dd'));
  manual.setPluginData('dsl.manual', '1');
  const removed = await prunePaletteColors(['color/blue/500']);
  assert.equal(removed, 1, 'blue/600만 지움');
  assert.ok(figma._state.variables.includes(manual));

  await createSemanticAliases({ 'color/background/brand': 'color/blue/500' });
  const scol = figma._state.collections.find((c) => c.name === 'Semantic');
  const role = findVar(figma, 'Semantic', 'color/background/brand');
  role.setPluginData('dsl.manual', '1');
  role.setValueForMode(scol.defaultModeId, hexToRgb('#000000'));
  const s = await createSemanticAliases({ 'color/background/brand': 'color/blue/500' });
  assert.equal(s.skippedManual, 1);
  assert.equal(s.aliased, 0);
  assert.equal(rgbToHex(role.valuesByMode[scol.defaultModeId]), '#000000');
});

test('직접 만든 변수 지키기 — 다크: manual Semantic은 다시 걸지 않고, manual dark/ Global은 덮어쓰거나 새로 만들지 않는다 · 두 번 돌려도 변수 수 같음', async () => {
  const f = darkFixture();
  f.global.setPluginData('dsl.owned', 'global');
  f.semantic.setPluginData('dsl.owned', 'semantic');
  const white = f.mkGlobal('color/gray/0', '#ffffff');
  const black = f.mkGlobal('color/gray/1000', '#000000');
  const myDark = f.mkGlobal('dark/color/gray/0', '#ff00ff');
  myDark.setPluginData('dsl.manual', '1');
  const surface = f.mkSemantic('surface');
  surface.setValueForMode(f.LIGHT, f.figma.variables.createVariableAlias(white));
  const fg = f.mkSemantic('fg');
  fg.setValueForMode(f.LIGHT, f.figma.variables.createVariableAlias(black));
  const mine = f.mkSemantic('mine');
  mine.setValueForMode(f.LIGHT, f.figma.variables.createVariableAlias(black));
  mine.setPluginData('dsl.manual', '1');

  const r1 = await generateDarkMode(f.semantic.id, f.LIGHT, f.DARK);
  assert.deepEqual(r1, { created: 1, realiased: 1, skipped: 2 });
  const count = f.figma._state.variables.length;
  assert.equal(f.gVal(myDark), '#ff00ff', 'manual dark/ 값 그대로');
  assert.equal(surface.valuesByMode[f.DARK], undefined, '그 역할의 Dark 값은 지금대로');
  assert.equal(mine.valuesByMode[f.DARK], undefined);
  assert.equal(f.figma._state.variables.filter((v) => v.name.startsWith('dark/color/gray/0')).length, 1);
  const r2 = await generateDarkMode(f.semantic.id, f.LIGHT, f.DARK);
  assert.deepEqual(r2, { created: 0, realiased: 1, skipped: 2 });
  assert.equal(f.figma._state.variables.length, count);
});

/* ================= B.4 — 텍스트 스타일 A+C · 바로 연결 · 만들기 미리보기 · reqId (IA v4 §2.3-6 · §4.3) ================= */
/** 스타일 연결 · 변수 연결 풀기를 기록하는 글자 목. ranges: 구간 연결 풀기 기록. */
function tsText(id, fontSize, extra = {}) {
  return {
    type: 'TEXT', id, name: id, visible: true, characters: 'Hello', fills: [],
    fontSize, fontName: { family: 'Inter', style: 'Regular' },
    lineHeight: { unit: 'PIXELS', value: fontSize * 1.5 }, letterSpacing: { unit: 'PIXELS', value: 0 },
    textStyleId: '', boundVariables: {}, unbound: [],
    getRangeAllFontNames() { return [this.fontName]; },
    getRangeBoundVariable() { return null; },
    setBoundVariable(f, v) { if (v == null) { this.unbound.push(`node:${f}`); delete this.boundVariables[f]; } else this.boundVariables[f] = { type: 'VARIABLE_ALIAS', id: v.id }; },
    setRangeBoundVariable(st, en, f, v) { if (v == null) { this.unbound.push(`range:${f}:${st}-${en}`); delete this.boundVariables[f]; } },
    async setTextStyleIdAsync(sid) { this.textStyleId = sid; },
    ...extra,
  };
}
const BODY = { name: 'body', fontSize: 16, lineHeight: 24, letterSpacing: 0, family: 'Inter', style: 'Regular' };
const TITLE = { name: 'title', fontSize: 24, lineHeight: 36, letterSpacing: 0, family: 'Inter', style: 'Regular' };
const alias = (id) => ({ type: 'VARIABLE_ALIAS', id });

test('텍스트 스타일 규칙 C — 글자 변수(전체 · 구간)가 붙은 글자도 후보 · 붙일 때 8가지 연결을 모두 떼고 붙임 · 값이 다르면 건너뜀', async () => {
  const figma = installFigma();
  await createSemanticTextStyles([BODY]);
  const body = figma._state.textStyles.find((s) => s.name === 'body');
  const bound = tsText('bound', 16, {
    boundVariables: { fontSize: [alias('v1')], fontFamily: alias('v2'), paragraphSpacing: [alias('v3')], fontWeight: [alias('v4')] },
  });
  const off = tsText('off', 17, { boundVariables: { fontSize: [alias('v1')] } });
  const plan = await planExistingTextStyles([bound, off]);
  assert.deepEqual(plan.rows.map((r) => [r.name, r.nodeIds]), [['body', ['bound']]]);
  assert.equal(plan.skipReasons.noStyle, 1);
  assert.equal('boundVars' in plan.skipReasons, false, 'boundVars 사유는 없다');
  registerNodes(figma, [bound, off]);
  const r = await applyTextStyleRows([{ styleId: body.id, nodeIds: ['bound', 'off'] }]);
  assert.equal(r.applied, 1);
  assert.equal(bound.textStyleId, body.id);
  assert.deepEqual(bound.boundVariables, {}, '스타일이 정하는 글자 속성 연결은 모두 뗀다');
  assert.ok(bound.unbound.includes('range:fontSize:0-5'), '구간 연결은 구간으로 뗀다');
  assert.ok(bound.unbound.includes('range:paragraphSpacing:0-5'));
  assert.ok(bound.unbound.includes('node:fontFamily'));
  assert.equal(off.textStyleId, '', '값이 다르면 붙이지 않는다');
  assert.deepEqual(off.boundVariables, { fontSize: [alias('v1')] }, '건너뛴 글자의 연결은 그대로');
});

test('createSemanticTextStyles — 글꼴: 값이 같은 Global STRING 변수(플러그인 Global 먼저 · 이름 순)를 스타일에 붙인다, 없으면 붙이지 않는다', async () => {
  // 없음 → 붙이지 않음(새로 만들지 않음)
  let figma = installFigma();
  await createSemanticTextStyles([BODY]);
  let st = figma._state.textStyles.find((s) => s.name === 'body');
  assert.equal(st.boundVariables.fontFamily, undefined);
  assert.equal(figma._state.variables.some((v) => v.resolvedType === 'STRING'), false);

  // 사용자 Global(값만 있는 컬렉션)에만 있음 → 그것. 이름 순.
  figma = installFigma();
  const prim = figma.variables.createVariableCollection('Primitives');
  const zz = figma.variables.createVariable('zz/inter', prim, 'STRING');
  zz.setValueForMode(prim.defaultModeId, 'Inter');
  const aa = figma.variables.createVariable('aa/inter', prim, 'STRING');
  aa.setValueForMode(prim.defaultModeId, 'Inter');
  const other = figma.variables.createVariable('a/roboto', prim, 'STRING');
  other.setValueForMode(prim.defaultModeId, 'Roboto');
  const r = await createSemanticTextStyles([BODY]);
  st = figma._state.textStyles.find((s) => s.name === 'body');
  assert.equal(st.boundVariables.fontFamily.id, aa.id);
  assert.deepEqual(r.styleIds, [st.id]);

  // 플러그인 Global에도 있으면 플러그인 Global 먼저
  await createTokens([{ name: 'font-family/Inter', category: 'fontFamily', sources: ['fontFamily'], value: 'Inter' }], 16);
  const mine = findVar(figma, 'Global', 'font-family/Inter');
  assert.ok(mine);
  await createSemanticTextStyles([BODY]);
  assert.equal(st.boundVariables.fontFamily.id, mine.id);
});

test('applyRegisteredTextStyles — 방금 등록한 스타일만 붙임(글자 변수는 뗌) · 값이 같은 글자만 셈 · 이미 그 스타일이면 세지 않음', async () => {
  const figma = installFigma();
  await createSemanticTextStyles([TITLE]); // 다른 기존 스타일
  const title = figma._state.textStyles.find((s) => s.name === 'title');
  const r0 = await createSemanticTextStyles([BODY]);
  const body = figma._state.textStyles.find((s) => s.name === 'body');
  assert.deepEqual(r0.styleIds, [body.id]);
  const plain = tsText('plain', 16);
  const withVars = tsText('withVars', 16, { boundVariables: { lineHeight: [alias('v')] } });
  const already = tsText('already', 16, { textStyleId: body.id });
  const otherStyle = tsText('otherStyle', 16, { textStyleId: 'S:remote' });
  const titleText = tsText('titleText', 24); // 다른 기존 스타일에 맞음 — 건드리지도 세지도 않음
  const mixedText = tsText('mixedText', 16, { fontSize: figma.mixed }); // 범위 밖
  const notSame = tsText('notSame', 15); // 범위 밖
  const inInst = tsText('inInst', 16);
  const instTitle = tsText('instTitle', 24);
  const inst = { type: 'INSTANCE', id: 'inst', name: 'inst', visible: true, children: [inInst, instTitle] };
  const root = { type: 'FRAME', id: 'root', name: 'root', visible: true, children: [plain, withVars, already, otherStyle, titleText, mixedText, notSame, inst] };
  registerNodes(figma, [plain, withVars, already, otherStyle, titleText, mixedText, notSame, inInst, instTitle]);
  const r = await applyRegisteredTextStyles([root], r0.styleIds);
  assert.equal(r.applied, 2);
  assert.equal(plain.textStyleId, body.id);
  assert.equal(withVars.textStyleId, body.id);
  assert.deepEqual(withVars.boundVariables, {});
  assert.equal(titleText.textStyleId, '', '다른 기존 스타일 글자는 건드리지 않는다');
  assert.equal(inInst.textStyleId, '');
  assert.deepEqual(r.applyReasons, { hasStyle: 1, instance: 1, ambiguous: 0 });
  assert.equal(r.applySkipped, 2);
  assert.equal(title.id !== body.id, true);

  // 같은 모양 스타일이 둘이면 모호
  const dup = figma.createTextStyle();
  Object.assign(dup, { name: 'body-copy', fontName: { family: 'Inter', style: 'Regular' }, fontSize: 16, lineHeight: { value: 24, unit: 'PIXELS' }, letterSpacing: { value: 0, unit: 'PIXELS' } });
  const amb = tsText('amb', 16);
  registerNodes(figma, [amb]);
  const r2 = await applyRegisteredTextStyles([amb], [body.id]);
  assert.equal(r2.applied, 0);
  assert.deepEqual(r2.applyReasons, { hasStyle: 0, instance: 0, ambiguous: 1 });
  assert.equal(r2.applySkipped, 1);
});

test('createUsageRoles · previewCreateTokens — tokenStates(new · update · reuse · manual · 같은 값 직접 만든 변수는 reuse) · roleRows(길이 = 역할 수)', async () => {
  const figma = installFigma();
  withRoot(figma);
  const gcol = figma.variables.createVariableCollection('Global');
  const same = figma.variables.createVariable('color/ff0000', gcol, 'COLOR');
  same.setValueForMode(gcol.defaultModeId, { r: 1, g: 0, b: 0, a: 1 });
  same.setPluginData('dsl.manual', '1');
  const diff = figma.variables.createVariable('color/00ff00', gcol, 'COLOR');
  diff.setValueForMode(gcol.defaultModeId, { r: 0, g: 0, b: 1, a: 1 });
  diff.setPluginData('dsl.manual', '1');
  await createTokens([{ name: 'spacing/8', category: 'gap', sources: ['gap'], value: 8 }], 16);
  const prim = figma.variables.createVariableCollection('Primitives');
  const blue = figma.variables.createVariable('blue/500', prim, 'COLOR');
  blue.scopes = ['ALL_SCOPES'];
  blue.setValueForMode(prim.defaultModeId, rgbOf('#0066ff'));
  const toks = [
    colorTok('#0066ff', 'color/text'), // 사용자 Global 재사용
    colorTok('#ff0000', 'color/border'), // 같은 이름 · 같은 값 직접 만든 변수
    colorTok('#00ff00', 'color/icon'), // 같은 이름 · 값 다름 → manual
    { name: 'spacing/8', category: 'gap', sources: ['gap'], value: 8, uses: [{ name: 'spacing/card/gap', count: 2 }] }, // 있음 → update
    { name: 'spacing/12', category: 'gap', sources: ['gap'], value: 12, uses: [{ name: 'spacing/padding', count: 1 }] }, // 새로
  ];
  const s = await previewCreateTokens(toks, 16);
  assert.deepEqual(Object.fromEntries(s.tokenStates), {
    'color/0066ff': { state: 'reuse', varName: 'blue/500' },
    'color/ff0000': { state: 'reuse', varName: 'color/ff0000' },
    'color/00ff00': { state: 'manual' },
    'spacing/8': { state: 'update' },
    'spacing/12': { state: 'new' },
  });
  assert.equal(s.created + s.updated, 2);
  const rows = [];
  const roleToks = toks.filter((x) => !s.skippedManualNames.has(x.name));
  const roles = await createUsageRoles(roleToks, true, s.globalOf, rows);
  assert.equal(rows.length, roles);
  const byToken = Object.fromEntries(rows.map((r) => [r.token, r]));
  assert.equal(byToken['color/0066ff'].global, 'blue/500', 'globalOf의 변수 이름');
  assert.equal(byToken['spacing/12'].global, 'spacing/12', '없으면 토큰 이름');
  assert.equal(byToken['spacing/12'].name, 'spacing/padding');
  assert.equal(byToken['color/00ff00'], undefined, '건너뛴 직접 만든 변수의 역할은 없다');
  // 실제 만들기에는 rowsOut을 채우지 않는다
  const rows2 = [];
  await createUsageRoles(roleToks, false, s.globalOf, rows2);
  assert.equal(rows2.length, 0);
});

test('bindSelection skipTextStyleNode — 텍스트 스타일 후보 글자의 글자 자리는 찾지 않는다(그 밖의 글자는 그대로)', async () => {
  const figma = installFigma();
  await createSemanticTextStyles([BODY]);
  const styled = tsText('styledCand', 16); // body와 값이 같음 → 후보
  const notCand = tsText('notCand', 16, { lineHeight: { unit: 'PIXELS', value: 20 } }); // 값이 다름 → 후보 아님
  const root = { type: 'FRAME', id: 'root', name: 'root', visible: true, fills: [], children: [styled, notCand] };
  styled.parent = root;
  notCand.parent = root;
  const base = await bindSelection([root], false);
  assert.ok(base.candidates.some((c) => c.nodeId === 'styledCand' && c.field === 'fontSize'));
  const skipTextStyleNode = await textStyleCandidateTest();
  assert.equal(skipTextStyleNode(styled), true);
  assert.equal(skipTextStyleNode(notCand), false);
  const r = await bindSelection([root], false, {}, { skipTextStyleNode });
  assert.equal(r.candidates.some((c) => c.nodeId === 'styledCand'), false);
  assert.ok(r.candidates.some((c) => c.nodeId === 'notCand' && c.field === 'fontSize'));
});

/* ---------- code.ts 메시지 처리(플러그인을 개발 빌드로 묶어 목 figma 위에서 돌린다) ---------- */
let pluginSrc;
async function loadPlugin(figma) {
  if (!pluginSrc) {
    const esbuild = await import('esbuild');
    const { fileURLToPath } = await import('node:url');
    const entry = fileURLToPath(new URL('../src/code.ts', import.meta.url));
    const out = await esbuild.build({ entryPoints: [entry], bundle: true, write: false, format: 'iife', target: 'es2017', logLevel: 'silent', define: { __DEV__: 'true', __html__: '""' } });
    pluginSrc = out.outputFiles[0].text;
  }
  const posted = [];
  const store = {};
  Object.assign(figma, {
    showUI() {},
    on() {},
    commitUndo() { figma._undo = (figma._undo ?? 0) + 1; },
    clientStorage: { getAsync: async (k) => store[k], setAsync: async (k, v) => { store[k] = v; }, deleteAsync: async (k) => { delete store[k]; } },
    ui: { postMessage: (m) => posted.push(m), onmessage: null },
    currentPage: { id: 'page', selection: [] },
    root: { children: [], getPluginData: () => '', setPluginData() {}, findAllWithCriteria: () => [] },
  });
  if (!figma.getNodeByIdAsync) figma.getNodeByIdAsync = async () => null;
  new Function(pluginSrc)();
  await new Promise((r) => setTimeout(r, 0));
  const send = async (m) => { posted.length = 0; await figma.ui.onmessage(m); return posted.slice(); };
  await send({ type: 'SET_LICENSE', tier: 'paid' });
  return { send, posted };
}
const ofType = (msgs, type) => msgs.filter((m) => m.type === type);

test('code.ts — reqId를 돌려준다: EXTRACT · CREATE_TOKENS(미리보기 · 실제) · RENAME · RENAME_APPLY, 없으면 싣지 않는다', async () => {
  const figma = installFigma();
  const p = await loadPlugin(figma);
  const fr = { type: 'FRAME', id: 'f', name: 'Frame 1', visible: true, fills: [], children: [], parent: { type: 'PAGE' }, setPluginData() {}, getPluginData: () => '' };
  registerNodes(figma, [fr]);
  let out = await p.send({ type: 'EXTRACT', nodeIds: ['f'], reqId: 7 });
  assert.equal(ofType(out, 'EXTRACT_RESULT')[0].reqId, 7);
  out = await p.send({ type: 'EXTRACT', nodeIds: ['f'] });
  assert.equal('reqId' in ofType(out, 'EXTRACT_RESULT')[0], false);
  const toks = [{ name: 'spacing/12', category: 'gap', sources: ['gap'], value: 12, uses: [{ name: 'spacing/padding', count: 1 }] }];
  out = await p.send({ type: 'CREATE_TOKENS', tokens: toks, base: 16, preview: true, reqId: 8 });
  let cr = ofType(out, 'CREATE_RESULT')[0];
  assert.equal(cr.reqId, 8);
  assert.deepEqual(cr.tokenStates, { 'spacing/12': { state: 'new' } });
  assert.deepEqual(cr.roleRows, [{ name: 'spacing/padding', global: 'spacing/12', token: 'spacing/12' }]);
  assert.equal(cr.roleRows.length, cr.roles);
  out = await p.send({ type: 'CREATE_TOKENS', tokens: toks, base: 16, reqId: 9 });
  cr = ofType(out, 'CREATE_RESULT')[0];
  assert.equal(cr.reqId, 9);
  assert.equal(cr.tokenStates, undefined, '실제 만들기에는 싣지 않는다');
  assert.equal(cr.roleRows, undefined);
  out = await p.send({ type: 'RENAME', apply: false, maxDepth: 8, nodeIds: ['f'], reqId: 10 });
  assert.equal(ofType(out, 'RENAME_RESULT')[0].reqId, 10);
  out = await p.send({ type: 'RENAME_APPLY', items: [{ id: 'f', before: 'Frame 1', after: 'card' }], reqId: 11 });
  const rr = ofType(out, 'RENAME_RESULT')[0];
  assert.equal(rr.reqId, 11);
  assert.equal(rr.applied, true);
});

test('code.ts — CREATE_TOKENS 미리보기: 값 다른 직접 만든 변수는 manual · 그 역할은 roleRows에 없다', async () => {
  const figma = installFigma();
  const p = await loadPlugin(figma);
  const gcol = figma.variables.createVariableCollection('Global');
  const diff = figma.variables.createVariable('color/00ff00', gcol, 'COLOR');
  diff.setValueForMode(gcol.defaultModeId, { r: 0, g: 0, b: 1, a: 1 });
  diff.setPluginData('dsl.manual', '1');
  const out = await p.send({ type: 'CREATE_TOKENS', tokens: [colorTok('#00ff00', 'color/icon'), colorTok('#123456', 'color/text')], base: 16, preview: true, reqId: 1 });
  const cr = ofType(out, 'CREATE_RESULT')[0];
  assert.equal(cr.tokenStates['color/00ff00'].state, 'manual');
  assert.equal(cr.tokenStates['color/123456'].state, 'new');
  assert.equal(cr.roleRows.length, cr.roles);
  assert.equal(cr.roleRows.some((r) => r.token === 'color/00ff00'), false);
});

test('code.ts — SCAN_TEXT_STYLES: reqId 스캔은 기준 nodeIds를 읽고 lastTextSamples를 덮어쓰지 않는다 · existing은 두 스캔 모두', async () => {
  const figma = installFigma();
  const p = await loadPlugin(figma);
  await createSemanticTextStyles([TITLE]);
  const small = tsText('small', 16);
  const big = tsText('big', 40, { parent: { type: 'PAGE' } }); // resolveRoots는 붙어 있는 노드만
  figma.currentPage.selection = [small];
  registerNodes(figma, [small, big]);
  let out = await p.send({ type: 'SCAN_TEXT_STYLES' }); // 지금 선택(16px)
  let c = ofType(out, 'TEXT_STYLE_CANDIDATES')[0];
  assert.deepEqual(c.styles.map((s) => s.fontSize), [16]);
  assert.equal(c.reqId, undefined);
  assert.deepEqual(c.existing, [{ name: 'title', sig: '24|36|0|Inter|Regular' }], 'reqId 없는 스캔도 existing을 싣는다(기본 램프 예약 — docs/text-style-krds.md §6)');
  out = await p.send({ type: 'SCAN_TEXT_STYLES', nodeIds: ['big'], reqId: 3 });
  c = ofType(out, 'TEXT_STYLE_CANDIDATES')[0];
  assert.equal(c.reqId, 3);
  assert.deepEqual(c.styles.map((s) => s.fontSize), [40]);
  assert.deepEqual(c.existing, [{ name: 'title', sig: '24|36|0|Inter|Regular' }]);
  // 「왼쪽 글자로 이름 채우기」는 reqId 없는 마지막 스캔(16px)을 쓴다
  out = await p.send({ type: 'NAME_TEXT_STYLES_BY_ROW' });
  c = ofType(out, 'TEXT_STYLE_CANDIDATES')[0];
  assert.deepEqual(c.styles.map((s) => s.fontSize), [16]);
});

test('code.ts — CREATE_TEXT_STYLES applyTo: 등록 + 방금 스타일만 붙임 · applied/applySkipped/applyReasons · reqId · ⌘Z 한 번', async () => {
  const figma = installFigma();
  const p = await loadPlugin(figma);
  const t1 = tsText('t1', 16, { boundVariables: { fontSize: [alias('v')] } });
  const t2 = tsText('t2', 16, { textStyleId: 'S:remote' });
  const t3 = tsText('t3', 24);
  const root = { type: 'FRAME', id: 'root', name: 'root', visible: true, children: [t1, t2, t3], parent: { type: 'PAGE' } };
  registerNodes(figma, [root, t1, t2, t3]);
  figma._undo = 0;
  let out = await p.send({ type: 'CREATE_TEXT_STYLES', styles: [BODY], applyTo: ['root'], reqId: 5 });
  const res = ofType(out, 'TEXT_STYLES_RESULT')[0];
  const body = figma._state.textStyles.find((s) => s.name === 'body');
  assert.equal(res.reqId, 5);
  assert.equal(res.created, 1);
  assert.equal(res.applied, 1);
  assert.equal(res.applySkipped, 1);
  assert.deepEqual(res.applyReasons, { hasStyle: 1, instance: 0, ambiguous: 0 });
  assert.equal(t1.textStyleId, body.id);
  assert.deepEqual(t1.boundVariables, {});
  assert.equal(t3.textStyleId, '');
  assert.equal(figma._undo, 1, '등록과 적용이 ⌘Z 한 번');
  // applyTo 없으면 결과에 applied 없음
  out = await p.send({ type: 'CREATE_TEXT_STYLES', styles: [TITLE] });
  const res2 = ofType(out, 'TEXT_STYLES_RESULT')[0];
  assert.equal(res2.applied, undefined);
  assert.equal(res2.reqId, undefined);
  assert.equal(t3.textStyleId, '');
});

test('code.ts — APPLY skipTextStyleNodes: 실제 연결에서 텍스트 스타일 후보 글자의 글자 자리는 붙이지 않는다', async () => {
  const figma = installFigma();
  const p = await loadPlugin(figma);
  await createSemanticTextStyles([BODY]);
  const styled = tsText('styledCand', 16);
  const notCand = tsText('notCand', 16, { lineHeight: { unit: 'PIXELS', value: 20 } });
  const root = { type: 'FRAME', id: 'root', name: 'root', visible: true, fills: [], children: [styled, notCand], parent: { type: 'PAGE' } };
  styled.parent = root;
  notCand.parent = root;
  const ranges = [];
  for (const t of [styled, notCand]) t.setRangeBoundVariable = function (st, en, f, v) { if (v) { ranges.push(`${this.id}:${f}`); this.boundVariables[f] = [alias(v.id)]; } };
  registerNodes(figma, [root, styled, notCand]);
  const out = await p.send({ type: 'APPLY', preview: false, nodeIds: ['root'], reqId: 4, skipTextStyleNodes: true });
  assert.equal(ofType(out, 'APPLY_RESULT')[0].reqId, 4);
  assert.equal(ranges.some((x) => x.startsWith('styledCand:')), false);
  assert.ok(ranges.includes('notCand:fontSize'));
});

/* ---- 반투명 색 토큰(ia-v3 §2.11 "반투명 색 토큰", ia-v4 B.7) ---- */
test('extractFromSelection — 반투명 칠하기 · 그림자는 불투명 색과 다른 토큰(-a{%} · alpha), 투명도 0은 버림', () => {
  installFigma();
  const rect = {
    type: 'RECTANGLE', id: 'r', name: 'Rect',
    fills: [
      { type: 'SOLID', color: { r: 0, g: 0, b: 0 } },
      { type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity: 0.08 },
      { type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity: 0.125 }, // 0.13 → -a13
      { type: 'SOLID', color: { r: 1, g: 0, b: 0 }, opacity: 0.004 }, // 투명도 0 → 버림
    ],
    effects: [
      { type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.25 }, offset: { x: 0, y: 2 }, radius: 4, spread: 0, visible: true },
      { type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 1, a: 0 }, offset: { x: 0, y: 3 }, radius: 6, spread: 0, visible: true }, // 투명도 0 → 그림자째 버림
    ],
  };
  const { tokens, warnings } = extractFromSelection([rect]);
  const colors = tokens.filter((t) => t.category === 'color' || t.category === 'effectColor').map((t) => ({ name: t.name, category: t.category, value: t.value, ...(t.alpha != null ? { alpha: t.alpha } : {}) }));
  assert.deepEqual(colors.sort((a, b) => a.name.localeCompare(b.name)), [
    { name: 'color/000000', category: 'color', value: '#000000' },
    { name: 'color/000000-a13', category: 'color', value: '#000000', alpha: 0.13 },
    { name: 'color/000000-a25', category: 'effectColor', value: '#000000', alpha: 0.25 },
    { name: 'color/000000-a8', category: 'color', value: '#000000', alpha: 0.08 },
  ]);
  assert.equal(tokens.some((t) => t.value === '#ff0000' || t.value === '#0000ff'), false, '투명도 0 색은 토큰 없음');
  assert.equal(tokens.some((t) => t.name === 'shadow-y/3' || t.name === 'shadow-blur/6'), false, '투명도 0 그림자는 숨긴 효과처럼');
  assert.equal(warnings.length, 0, '사유 없음');
});

test('mergeSameNameTokens — 반투명 토큰의 alpha는 그대로', async () => {
  const { mergeSameNameTokens } = await import('../dist/pure.mjs');
  const out = mergeSameNameTokens([
    { name: 'color/gray/1000-a8', category: 'color', sources: ['fill'], value: '#000000', alpha: 0.08, count: 2 },
    { name: 'color/gray/1000-a8', category: 'effectColor', sources: ['effectColor'], value: '#000000', alpha: 0.08, count: 1 },
    { name: 'color/gray/1000', category: 'color', sources: ['fill'], value: '#000000', count: 5 },
  ]);
  assert.equal(out.length, 2);
  assert.equal(out[0].alpha, 0.08);
  assert.deepEqual(out[0].sources, ['fill', 'effectColor']);
  assert.equal('alpha' in out[1], false);
});

test('createTokens · previewCreateTokens — 반투명 Global은 RGBA, 재사용 · 직접 만든 변수 비교는 hex와 투명도', async () => {
  const figma = installFigma();
  const ucol = figma.variables.createVariableCollection('Brand');
  // 사용자 Global(계층 1 판정용 — 직접 값만) — 같은 hex · 다른 투명도는 재사용하지 않는다
  const u = figma.variables.createVariable('black', ucol, 'COLOR');
  u.scopes = ['ALL_SCOPES'];
  u.setValueForMode(ucol.defaultModeId, { r: 0, g: 0, b: 0, a: 1 });
  const tokens = [
    { name: 'color/000000-a8', category: 'color', sources: ['fill'], value: '#000000', alpha: 0.08, uses: [{ name: 'color/border', count: 1 }] },
    { name: 'color/000000', category: 'color', sources: ['fill'], value: '#000000', uses: [{ name: 'color/border', count: 3 }] },
  ];
  const pv = await previewCreateTokens(tokens, 16);
  assert.deepEqual(pv.tokenStates.get('color/000000'), { state: 'reuse', varName: 'black' });
  assert.deepEqual(pv.tokenStates.get('color/000000-a8'), { state: 'new' }, '투명도가 다르면 재사용하지 않음');
  const s = await createTokens(tokens, 16);
  const g = findVar(figma, 'Global', 'color/000000-a8');
  assert.deepEqual(Object.values(g.valuesByMode)[0], { r: 0, g: 0, b: 0, a: 0.08 });
  assert.equal(s.globalOf.get('color/000000'), u.id);
  // 같은 이름의 직접 만든 변수: 투명도까지 같으면 재사용, 다르면 건너뜀
  const f2 = installFigma();
  const gcol = f2.variables.createVariableCollection('Global');
  f2.variables.createVariableCollection('Semantic');
  const same = f2.variables.createVariable('color/000000-a8', gcol, 'COLOR');
  same.setValueForMode(gcol.defaultModeId, { r: 0, g: 0, b: 0, a: 0.0801 });
  same.setPluginData('dsl.manual', '1');
  const diff = f2.variables.createVariable('color/000000-a25', gcol, 'COLOR');
  diff.setValueForMode(gcol.defaultModeId, { r: 0, g: 0, b: 0, a: 1 });
  diff.setPluginData('dsl.manual', '1');
  const s2 = await createTokens([
    { name: 'color/000000-a8', category: 'color', sources: ['fill'], value: '#000000', alpha: 0.08 },
    { name: 'color/000000-a25', category: 'color', sources: ['fill'], value: '#000000', alpha: 0.25 },
  ], 16);
  assert.equal(s2.globalOf.get('color/000000-a8'), same.id, '소수 둘째 자리까지 같으면 같은 값');
  assert.deepEqual([...s2.skippedManualNames], ['color/000000-a25']);
});

test('createUsageRoles — 같은 hex · 다른 투명도는 같은 밝기 이름에 번호(default · default-2), 별칭은 반투명 Global', async () => {
  const figma = installFigma();
  const tokens = [
    { name: 'color/000000', category: 'color', sources: ['stroke'], value: '#000000', uses: [{ name: 'color/border', count: 30 }] },
    { name: 'color/000000-a8', category: 'color', sources: ['stroke'], value: '#000000', alpha: 0.08, uses: [{ name: 'color/border', count: 12 }] },
  ];
  const s = await createTokens(tokens, 16);
  const rows = [];
  assert.equal(await createUsageRoles(tokens, true, s.globalOf, rows), 2);
  assert.deepEqual(rows.map((r) => [r.name, r.token]).sort(), [['color/border/default', 'color/000000'], ['color/border/default-2', 'color/000000-a8']]);
  assert.equal(await createUsageRoles(tokens, false, s.globalOf), 2);
  assert.equal(roleTarget(figma, findVar(figma, 'Semantic', 'color/border/default').id), findVar(figma, 'Global', 'color/000000').id);
  assert.equal(roleTarget(figma, findVar(figma, 'Semantic', 'color/border/default-2').id), findVar(figma, 'Global', 'color/000000-a8').id);
  assert.equal(await createUsageRoles(tokens, false, s.globalOf), 0, '다시 돌리면 같은 값 재사용');
});

test('bindSelection — 새 역할도 같은 hex · 다른 투명도는 default · default-2(곳 수 많은 쪽이 번호 없음)', async () => {
  const figma = installFigma();
  await createTokens(
    [
      { name: 'color/000000', category: 'color', sources: ['stroke'], value: '#000000' },
      { name: 'color/000000-a8', category: 'color', sources: ['stroke'], value: '#000000', alpha: 0.08 },
    ],
    16,
  );
  const mk = (id, opacity) => ({ type: 'RECTANGLE', id, name: id, strokes: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, ...(opacity != null ? { opacity } : {}) }] });
  const nodes = [mk('a'), mk('b'), mk('c'), mk('t1', 0.08), mk('t2', 0.08)];
  const dry = await bindSelection(nodes, false);
  const nameOf = (id) => dry.candidates.find((c) => c.nodeId === id).variableName;
  assert.equal(nameOf('a'), 'color/border/default');
  assert.equal(nameOf('t1'), 'color/border/default-2');
  await bindSelection(nodes);
  assert.equal(roleTarget(figma, nodes[3].strokes[0].boundVariables.color.id), findVar(figma, 'Global', 'color/000000-a8').id);
  assert.equal(nodes[3].strokes[0].opacity, 0.08);
  // 다음 찾기는 만든 반투명 역할을 쓴다
  const again = await bindSelection([mk('t3', 0.08)], false);
  assert.equal(again.candidates[0].variableName, 'color/border/default-2');
});

test('colorSlotKey · colorRoleBases — 키는 투명도까지, 밝기는 hex로만', () => {
  assert.equal(colorSlotKey('#000000'), '#000000');
  assert.equal(colorSlotKey('#000000', 'light', 0.08), '#000000@0.08|light');
  assert.equal(colorSlotKey('#000000', undefined, 1), '#000000');
  const b = colorRoleBases([{ hex: '#000000', count: 30 }, { hex: '#000000', count: 12, alpha: 0.08 }, { hex: '#777777', count: 1, alpha: 0.5 }], undefined, 'border');
  assert.equal(b.get('#000000'), 'default');
  assert.equal(b.get('#000000@0.08'), 'default');
  assert.equal(b.get('#777777@0.5'), 'subtle');
  assert.equal(colorRoleBases([{ hex: '#ffffff', count: 1 }], '#000000@0.08', 'border').get('#ffffff'), 'subtle', '기준이 색 값 키여도 hex만 본다');
});

test('generateDarkMode — 다크 짝은 밝기만 바꾸고 투명도는 그대로', async () => {
  const f = darkFixture();
  const g = f.figma.variables.createVariable('color/gray/0-a8', f.global, 'COLOR');
  g.scopes = ['FRAME_FILL'];
  g.setValueForMode(f.global.defaultModeId, { r: 1, g: 1, b: 1, a: 0.08 });
  const s = f.mkSemantic('overlay');
  s.setValueForMode(f.LIGHT, f.figma.variables.createVariableAlias(g));
  const r = await generateDarkMode(f.semantic.id, f.LIGHT, f.DARK);
  assert.equal(r.realiased, 1);
  const dark = findVar(f.figma, 'Global', 'dark/color/gray/0-a8');
  const val = dark.valuesByMode[f.global.defaultModeId];
  assert.equal(val.a, 0.08);
  assert.equal(rgbToHex(val), '#121212');
});

test('code.ts — EXPORT: 투명도가 1이 아닌 색은 #rrggbbaa, 1이면 #rrggbb', async () => {
  const figma = installFigma();
  const p = await loadPlugin(figma);
  await createTokens(
    [
      { name: 'color/000000', category: 'color', sources: ['fill'], value: '#000000' },
      { name: 'color/000000-a8', category: 'color', sources: ['fill'], value: '#000000', alpha: 0.08 },
    ],
    16,
  );
  const out = await p.send({ type: 'EXPORT', format: 'w3c', fontSizeUnit: 'px', base: 16 });
  const content = ofType(out, 'EXPORT_RESULT')[0].content;
  assert.ok(content.includes('"#00000014"'), content);
  assert.ok(content.includes('"#000000"'));
});

test('createSemanticTextStyles — 다시 실행(앵커)은 지금 글꼴을 불러온 뒤 쓴다 · 못 불러오면 값 · 연결만 건너뜀 · 없는 글꼴의 새 스타일은 안 생김 (IA v4 §4.3 "글꼴")', async () => {
  const figma = installFigma();
  const body = { name: 'body', fontSize: 16, lineHeight: 24, letterSpacing: 0, family: 'Inter', style: 'Regular' };
  await createSemanticTextStyles([body]);
  const st = figma._state.textStyles.find((s) => s.name === 'body');
  // 지금 글꼴이 없는 앵커 스타일 두 개(이름 같음 · 이름 바뀜)
  const gone = figma.createTextStyle();
  gone.name = 'title';
  gone.fontName = { family: 'Gone', style: 'Bold' };
  const gone2 = figma.createTextStyle();
  gone2.name = 'old-caption';
  gone2.fontName = { family: 'Gone', style: 'Light' };
  // 실제 피그마처럼: 불러온 글꼴을 기억하고, 안 불러온 글꼴의 스타일에 값 쓰기(이름 제외)는 던진다
  const loaded = new Set();
  figma.loadFontAsync = async (f) => {
    if (f.family === 'Gone' || f.family === 'Nope') throw new Error('no font');
    loaded.add(`${f.family}/${f.style}`);
  };
  for (const s of figma._state.textStyles) {
    const bind = s.setBoundVariable.bind(s);
    s.setBoundVariable = (field, v) => {
      if (!loaded.has(`${s.fontName.family}/${s.fontName.style}`)) throw new Error(`Cannot write to style with unloaded font. Font "${s.fontName.family} ${s.fontName.style}" has not been loaded`);
      bind(field, v);
    };
  }
  const r = await createSemanticTextStyles([
    { ...body, boundStyleId: st.id },
    { name: 'title', fontSize: 32, lineHeight: 40, letterSpacing: 0, family: 'Gone', style: 'Bold', boundStyleId: gone.id },
    { name: 'caption', fontSize: 12, lineHeight: 16, letterSpacing: 0, family: 'Gone', style: 'Light', boundStyleId: gone2.id },
    { name: 'display', fontSize: 48, lineHeight: 56, letterSpacing: 0, family: 'Nope', style: 'Bold' },
  ]);
  assert.equal(r.updated, 1, '앵커 body는 글꼴을 불러와 갱신 — 전에는 여기서 던져 단계가 멈췄다');
  assert.ok(loaded.has('Inter/Regular'));
  assert.ok(r.styleIds.includes(st.id) && !r.styleIds.includes(gone.id) && !r.styleIds.includes(gone2.id), '글꼴을 못 불러온 앵커는 styleIds에 없음');
  assert.ok(r.missing.includes("title: 글꼴 'Gone Bold'을 불러오지 못해 값 · 변수 연결을 건너뛰었어요"), r.missing.join(' | '));
  assert.ok(r.missing.includes("caption: 글꼴 'Gone Light'을 불러오지 못해 값 · 변수 연결을 건너뛰었어요"), r.missing.join(' | '));
  assert.equal(gone2.name, 'caption', '이름이 다르면 이름만 바꿈');
  assert.deepEqual(gone.boundVariables, {}, '값 · 연결은 건너뜀');
  assert.ok(r.missing.includes("display: 폰트 'Nope' 없음"));
  assert.equal(figma._state.textStyles.some((s) => s.name === 'display'), false, '없는 글꼴의 새 스타일은 생기지 않음');
});

test('createSemanticTextStyles — 스타일 하나의 도중 오류는 그 행만 건너뛰고(missError) 다음 행은 갱신 · 변수 없음은 missVar 글', async () => {
  const figma = installFigma();
  const a = { name: 'a', fontSize: 16, lineHeight: 24, letterSpacing: 0, family: 'Inter', style: 'Regular' };
  const b = { name: 'b', fontSize: 20, lineHeight: 28, letterSpacing: 0, family: 'Inter', style: 'Regular' };
  await createSemanticTextStyles([a, b]);
  const sa = figma._state.textStyles.find((s) => s.name === 'a');
  sa.setBoundVariable = () => { throw new Error('boom'); };
  const r = await createSemanticTextStyles([a, b]);
  assert.equal(r.updated, 1, 'b는 갱신');
  assert.ok(!r.styleIds.includes(sa.id));
  assert.ok(r.missing.some((m) => m.startsWith('a: 끝까지 만들지 못했어요(일부 값만 들어갔을 수 있어요) — ')), r.missing.join(' | '));
  assert.equal(figma._state.textStyles.filter((s) => s.name === 'a').length, 1, '같은 이름을 또 만들지 않음');
  // 변수 없음 — 날것 경로 대신 missVar 글
  const v = findVar(figma, 'Semantic', 'line-height/b');
  figma._state.variables.splice(figma._state.variables.indexOf(v), 1);
  const sb = figma._state.textStyles.find((s) => s.name === 'b');
  const r2 = await createSemanticTextStyles([{ ...b, boundStyleId: sb.id }]);
  assert.ok(r2.missing.every((m) => !/^(font-size|line-height|letter-spacing)\//.test(m)), r2.missing.join(' | '));
});

/* ================= [이름 다시 짓기] · 역할 변수 · 등록 경로 되돌림 · UI 역할(docs/text-style-krds.md §3.2-1 · §5) ================= */
/** 값이 있는 로컬 텍스트 스타일(줄 높이 px). */
function mkTs(figma, name, fontSize, style = 'Regular', lh = fontSize * 1.5) {
  const st = figma.createTextStyle();
  st.name = name;
  st.fontName = { family: 'Inter', style };
  st.fontSize = fontSize;
  st.lineHeight = { unit: 'PIXELS', value: lh };
  return st;
}
const tsSigOf = (st) => `${st.fontSize}|${st.lineHeight.value}|0|Inter|${st.fontName.style}`;
const tsItem = (st, to) => ({ id: st.id, from: st.name, to, sig: tsSigOf(st) });
/** 이름 쓰기를 기록하고, 쓸 때마다 로컬 스타일 이름이 겹치지 않는지 본다. guard(n, cur)가 던지면 그 쓰기는 실패. */
function watchNames(figma, guard = () => {}) {
  const log = [];
  let dup = null;
  for (const st of figma._state.textStyles) {
    let name = st.name;
    Object.defineProperty(st, 'name', {
      configurable: true,
      get: () => name,
      set: (n) => {
        guard(st, n, name);
        name = n;
        log.push([st.id, n]);
        const names = figma._state.textStyles.map((x) => x.name);
        if (new Set(names).size !== names.length && !dup) dup = names.slice();
      },
    });
  }
  return { log, dup: () => dup };
}
const byStatus = (r) => Object.fromEntries(r.results.map((x) => [x.id, x.status]));

test('applyTsRename — 연쇄 A→B · B→C · 맞바꿈 X↔Y: 임시 이름 2단계라 같은 이름이 잠깐도 둘 생기지 않는다', async () => {
  const figma = installFigma();
  const a = mkTs(figma, 'a', 16);
  const b = mkTs(figma, 'b', 17);
  const x = mkTs(figma, 'x', 18);
  const y = mkTs(figma, 'y', 19);
  const w = watchNames(figma);
  const r = await applyTsRename([tsItem(a, 'b'), tsItem(b, 'c'), tsItem(x, 'y'), tsItem(y, 'x')]);
  assert.equal(r.renamed, 4);
  assert.equal(r.skipped, 0);
  assert.deepEqual([a.name, b.name, x.name, y.name], ['b', 'c', 'y', 'x']);
  assert.equal(w.dup(), null, '이름이 겹친 순간이 없음');
  assert.ok(w.log.some(([id, n]) => id === a.id && n === `__dsl_tmp_${a.id}`), '1단계 임시 이름');
  assert.deepEqual(r.results.find((q) => q.id === a.id), { id: a.id, status: 'renamed', name: 'b' });
});

test('applyTsRename — 최종 이름 집합 고정점: 남는 이름과 겹치면 name-taken, 빠진 항목의 이름을 원하던 항목도 함께 빠진다', async () => {
  const figma = installFigma();
  const p = mkTs(figma, 'p', 16);
  const q = mkTs(figma, 'q', 17);
  mkTs(figma, 'z', 18); // 후보 아님
  const r1 = mkTs(figma, 'r', 19);
  const k1 = mkTs(figma, 'k1', 20);
  const k2 = mkTs(figma, 'k2', 21);
  const r = await applyTsRename([tsItem(p, 'z'), tsItem(q, 'p'), tsItem(r1, 's'), tsItem(k1, 'same'), tsItem(k2, 'same')]);
  const st = byStatus(r);
  assert.equal(st[p.id], 'name-taken');
  assert.equal(st[q.id], 'name-taken', 'p가 빠져 이름 p가 남으므로');
  assert.equal(st[k1.id], 'name-taken');
  assert.equal(st[k2.id], 'name-taken', '같은 to를 원하는 후보 둘은 함께 빠진다');
  assert.equal(st[r1.id], 'renamed');
  assert.deepEqual([p.name, q.name, r1.name], ['p', 'q', 's']);
  assert.equal(r.renamed, 1);
  assert.equal(r.skipped, 4);
  assert.deepEqual(r.skipReasons, { 'name-taken': 4 });
});

test('applyTsRename — 다시 확인: 그 사이 이름이 바뀜(없어진 스타일 포함) · 값이 바뀜은 건너뛴다', async () => {
  const figma = installFigma();
  const a = mkTs(figma, 'a', 16);
  const b = mkTs(figma, 'b', 17);
  const c = mkTs(figma, 'c', 18);
  const ia = tsItem(a, 'a2');
  const ib = tsItem(b, 'b2');
  a.name = 'a-moved';
  b.fontSize = 20;
  const r = await applyTsRename([ia, ib, tsItem(c, 'c2'), { id: 'style:gone', from: 'g', to: 'g2', sig: 'x' }]);
  assert.deepEqual(byStatus(r), { [a.id]: 'renamed-meanwhile', [b.id]: 'value-changed', [c.id]: 'renamed', 'style:gone': 'renamed-meanwhile' });
  assert.deepEqual(r.skipReasons, { 'renamed-meanwhile': 2, 'value-changed': 1 });
  assert.deepEqual([a.name, b.name, c.name], ['a-moved', 'b', 'c2']);
  assert.equal(r.results.find((x) => x.id === 'style:gone').name, '');
});

test('applyTsRename — 오류는 되돌리고(error) 그 이름을 원하던 항목도 연쇄로 되돌린다(error-chain) · 되돌리지 못하면 error-stuck · 되돌린 스타일의 역할 변수는 그대로', async () => {
  const figma = installFigma();
  const spec = (name, fontSize) => ({ name, fontSize, lineHeight: fontSize * 1.5, letterSpacing: 0, family: 'Inter', style: 'Regular' });
  await createSemanticTextStyles([spec('a', 16), spec('b', 18), spec('d', 20), spec('g', 22), spec('f', 24)]);
  const [a, b, d, g, f] = ['a', 'b', 'd', 'g', 'f'].map((n) => figma._state.textStyles.find((s) => s.name === n));
  watchNames(figma, (st, n, cur) => {
    if (st === b && n === 'c') throw new Error('boom'); // 2단계 오류
    if (st === f && n.startsWith('__dsl_tmp_')) throw new Error('boom'); // 1단계 오류 — 이름은 그대로
    if (st === g && (n === 'h' || (n === 'g' && cur !== 'g'))) throw new Error('boom'); // 되돌림도 실패
  });
  const r = await applyTsRename([tsItem(a, 'b'), tsItem(b, 'c'), tsItem(d, 'e'), tsItem(g, 'h'), tsItem(f, 'f2')]);
  assert.deepEqual(byStatus(r), { [a.id]: 'error-chain', [b.id]: 'error', [d.id]: 'renamed', [g.id]: 'error-stuck', [f.id]: 'error' });
  assert.deepEqual([a.name, b.name, d.name, f.name], ['a', 'b', 'e', 'f']);
  assert.equal(g.name, `__dsl_tmp_${g.id}`);
  assert.equal(r.results.find((x) => x.id === g.id).name, `__dsl_tmp_${g.id}`, '결과에 지금 이름');
  // 역할 변수: 바뀐 d만
  assert.ok(findVar(figma, 'Semantic', 'font-size/e'));
  assert.ok(findVar(figma, 'Semantic', 'font-size/a') && findVar(figma, 'Semantic', 'font-size/b') && findVar(figma, 'Semantic', 'font-size/g'));
  assert.equal(r.roleVarsRenamed, 2, 'd의 font-size · line-height');
});

test('applyTsRename — 역할 변수도 함께: Semantic만 · 사용자 컬렉션 · 직접 만든 변수는 그대로 · 겹치면 roleVarsTaken', async () => {
  const figma = installFigma();
  const spec = (name, fontSize) => ({ name, fontSize, lineHeight: fontSize * 1.5, letterSpacing: 0, family: 'Inter', style: 'Regular' });
  await createSemanticTextStyles([spec('a', 16), spec('b', 18), spec('c', 20)]);
  const [a, b, c] = ['a', 'b', 'c'].map((n) => figma._state.textStyles.find((s) => s.name === n));
  const sem = figma._state.collections.find((x) => x.name === 'Semantic');
  const user = figma.variables.createVariableCollection('Variables');
  const userVar = figma.variables.createVariable('font-size/a', user, 'FLOAT');
  findVar(figma, 'Semantic', 'line-height/b').setPluginData('dsl.manual', '1');
  figma.variables.createVariable('font-size/c2', sem, 'FLOAT'); // 최종 집합 밖의 다른 변수
  const fsA = findVar(figma, 'Semantic', 'font-size/a');
  const r = await applyTsRename([tsItem(a, 'heading/large'), tsItem(b, 'body/medium'), tsItem(c, 'c2')]);
  assert.equal(r.renamed, 3);
  assert.equal(fsA.name, 'font-size/heading/large', '같은 변수(연결 유지)의 이름만');
  assert.equal(a.boundVariables.fontSize.id, fsA.id);
  assert.ok(findVar(figma, 'Semantic', 'line-height/heading/large'));
  assert.ok(findVar(figma, 'Semantic', 'font-size/body/medium'));
  assert.ok(findVar(figma, 'Semantic', 'line-height/b'), '직접 만든 변수는 그대로');
  assert.equal(userVar.name, 'font-size/a', '사용자 컬렉션은 그대로');
  assert.ok(findVar(figma, 'Semantic', 'font-size/c'), '겹친 변수는 옛 이름으로 남음');
  assert.ok(findVar(figma, 'Semantic', 'line-height/c2'));
  assert.equal(r.roleVarsRenamed, 4);
  assert.equal(r.roleVarsTaken, 1);
  assert.equal(r.roleVarsError, 0);
  assert.deepEqual(r.roleVarsStuck, []);
});

test('applyTsRename — 값을 쓰지 않는다: 글꼴을 못 불러오고 값 쓰기가 막혀도 이름은 바뀐다', async () => {
  const figma = installFigma();
  await createSemanticTextStyles([{ name: 'a', fontSize: 16, lineHeight: 24, letterSpacing: 0, family: 'Inter', style: 'Regular' }]);
  const a = figma._state.textStyles[0];
  const item = tsItem(a, 'body/medium');
  figma.loadFontAsync = async () => { throw new Error('loadFontAsync called'); };
  for (const f of ['fontName', 'fontSize', 'lineHeight', 'letterSpacing']) {
    const val = a[f];
    Object.defineProperty(a, f, { configurable: true, get: () => val, set: () => { throw new Error(`write ${f}`); } });
  }
  a.setBoundVariable = () => { throw new Error('setBoundVariable called'); };
  for (const v of figma._state.variables) v.setValueForMode = () => { throw new Error('setValueForMode called'); };
  const r = await applyTsRename([item]);
  assert.equal(r.renamed, 1);
  assert.equal(a.name, 'body/medium');
  assert.equal(r.roleVarsRenamed, 2);
  assert.equal(r.roleVarsError, 0);
});

test('renameTextRoleVars — onlyIds · 바꿀 변수 오류는 되돌리고 error · 되돌리지 못한 변수는 stuck', async () => {
  const figma = installFigma();
  await createSemanticTextStyles([{ name: 'a', fontSize: 16, lineHeight: 24, letterSpacing: 0, family: 'Inter', style: 'Regular' }]);
  const fs = findVar(figma, 'Semantic', 'font-size/a');
  const lh = findVar(figma, 'Semantic', 'line-height/a');
  let r = await renameTextRoleVars([{ from: 'a', to: 'b' }], { onlyIds: new Set([fs.id]) });
  assert.equal(r.renamed, 1);
  assert.deepEqual(r.moved, [{ id: fs.id, pair: 0 }]);
  assert.deepEqual([fs.name, lh.name], ['font-size/b', 'line-height/a']);
  // lh: 2단계에서 실패 + 되돌림(from)도 실패 → stuck
  let name = lh.name;
  Object.defineProperty(lh, 'name', { configurable: true, get: () => name, set: (n) => { if (n === 'line-height/c' || (n === 'line-height/a' && name !== n)) throw new Error('boom'); name = n; } });
  r = await renameTextRoleVars([{ from: 'b', to: 'c' }, { from: 'a', to: 'c' }]);
  assert.equal(fs.name, 'font-size/c');
  assert.equal(r.renamed, 1);
  assert.equal(r.error, 1);
  assert.ok(r.stuck[0].startsWith('__dsl_tmp_'), r.stuck.join());
});

test('createSemanticTextStyles — 등록 경로 되돌림: 0단계에서 바꾼 역할 변수를 스타일 이름이 안 바뀌면 되돌린다 · 되돌리지 못하면 missRoleStuck', async () => {
  const figma = installFigma();
  const spec = { name: 'a', fontSize: 16, lineHeight: 24, letterSpacing: 0, family: 'Inter', style: 'Regular' };
  await createSemanticTextStyles([spec]);
  const st = figma._state.textStyles[0];
  watchNames(figma, (_s, n) => { if (n === 'heading/large') throw new Error('boom'); });
  const r = await createSemanticTextStyles([{ ...spec, name: 'heading/large', boundStyleId: st.id }]);
  assert.equal(st.name, 'a');
  assert.ok(r.missing.some((m) => m.startsWith('heading/large: 끝까지 만들지 못했어요')), r.missing.join(' | '));
  assert.ok(findVar(figma, 'Semantic', 'font-size/a') && findVar(figma, 'Semantic', 'line-height/a'), '변수 이름 되돌림');
  assert.equal(findVar(figma, 'Semantic', 'line-height/heading/large'), undefined);
  assert.equal(r.missing.some((m) => m.includes('변수 이름을 되돌리지 못했어요')), false);
  // 되돌림도 실패 — 변수 이름이 남으면 알린다
  const lh = findVar(figma, 'Semantic', 'line-height/a');
  let name = lh.name;
  Object.defineProperty(lh, 'name', { configurable: true, get: () => name, set: (n) => { if (n === 'line-height/a' && name !== n) throw new Error('boom'); name = n; } });
  const r2 = await createSemanticTextStyles([{ ...spec, name: 'heading/large', boundStyleId: st.id }]);
  // 되돌림 자체가 실패하면 그 되돌림의 2단계 되돌림이 변수를 0단계 뒤 이름(새 이름)으로 돌려 둔다 — 그 지금 이름을 알린다.
  assert.ok(r2.missing.includes('a: Semantic 변수 이름을 되돌리지 못했어요 — line-height/heading/large'), r2.missing.join(' | '));
  assert.ok(findVar(figma, 'Semantic', 'font-size/a'), '되돌린 변수는 돌아옴');
});

test('createSemanticTextStyles — 등록 경로: 직접 만든 역할 변수는 앵커 rename에서 옮기지 않는다(동작 변경)', async () => {
  const figma = installFigma();
  const spec = { name: 'a', fontSize: 16, lineHeight: 24, letterSpacing: 0, family: 'Inter', style: 'Regular' };
  await createSemanticTextStyles([spec]);
  const st = figma._state.textStyles[0];
  const fs = findVar(figma, 'Semantic', 'font-size/a');
  fs.setPluginData('dsl.manual', '1');
  const r = await createSemanticTextStyles([{ ...spec, name: 'body/medium', boundStyleId: st.id }]);
  assert.equal(st.name, 'body/medium');
  assert.equal(fs.name, 'font-size/a', '직접 만든 변수는 그대로');
  assert.ok(findVar(figma, 'Semantic', 'line-height/body/medium'), '플러그인 변수는 옮김');
  assert.equal(r.updated, 1);
});

test('scanTextStyles — uiRole: 부모부터 올라가 처음 역할이 있는 조상에서 멈춘다(인스턴스 경계는 넘고, 구조 역할은 지나친다)', async () => {
  installFigma();
  const node = (type, id, role, children = []) => {
    const n = { type, id, name: id, visible: true, children, getPluginData: (k) => (k === 'dsRole' && role ? role : '') };
    for (const c of children) c.parent = n;
    return n;
  };
  const text = (id, role) => ({ ...tsText(id, 16), getPluginData: (k) => (k === 'dsRole' && role ? role : '') });
  const t1 = text('inBtn');
  const t2 = text('inCard');
  const t3 = text('selfRole', 'button');
  const t4 = text('inChip');
  const page = { type: 'PAGE', id: 'page', getPluginData: () => '' };
  const btn = node('FRAME', 'btn', 'button', [node('FRAME', 'inner', 'container', [node('INSTANCE', 'inst', undefined, [t1])])]);
  const outer = node('FRAME', 'outer', 'button', [node('FRAME', 'card', 'card', [t2]), t3, node('FRAME', 'chip', 'chip', [t4])]);
  btn.parent = page;
  outer.parent = page;
  const { samples } = await scanTextStyles([btn, outer]);
  const ui = Object.fromEntries(samples.map((s) => [s.id, s.uiRole]));
  assert.deepEqual(ui, { inBtn: true, inCard: false, selfRole: true, inChip: true });
});

test('planTsRename — 로컬 스타일 전부에 KRDS 이름 · 바뀌는 줄만 · sig', async () => {
  const figma = installFigma();
  const h1 = mkTs(figma, 'h1', 32, 'Bold');
  const body = mkTs(figma, 'body', 17);
  mkTs(figma, 'body/small', 15);
  const odd = mkTs(figma, 'odd', 26.7, 'Bold', 40.05);
  figma.loadFontAsync = async () => { throw new Error('loadFontAsync called'); };
  const rows = await planTsRename();
  const by = Object.fromEntries(rows.map((r) => [r.from, r]));
  assert.deepEqual(Object.keys(by).sort(), ['body', 'h1', 'odd'], '이름이 같은 body/small은 없음');
  assert.deepEqual(by.h1, { id: h1.id, from: 'h1', to: 'heading/large', sig: '32|48|0|Inter|Bold' });
  assert.equal(by.body.to, 'body/medium');
  assert.equal(by.body.sig, tsSigOf(body));
  assert.equal(by.odd.to, 'heading/medium');
  assert.equal(odd.name, 'odd', '읽기만');
});

test('code.ts — SCAN_TS_RENAME → TS_RENAME_PLAN · APPLY_TS_RENAME → TS_RENAMED + ⌘Z 한 번 + 준비 상태 · 무료는 잠김', async () => {
  const figma = installFigma();
  const p = await loadPlugin(figma);
  const h1 = mkTs(figma, 'h1', 32, 'Bold');
  let out = await p.send({ type: 'SCAN_TS_RENAME', reqId: 4 });
  const plan = ofType(out, 'TS_RENAME_PLAN')[0];
  assert.equal(plan.reqId, 4);
  assert.deepEqual(plan.rows.map((r) => [r.from, r.to]), [['h1', 'heading/large']]);
  figma._undo = 0;
  out = await p.send({ type: 'APPLY_TS_RENAME', reqId: 5, items: plan.rows.map(({ id, from, to, sig }) => ({ id, from, to, sig })) });
  const res = ofType(out, 'TS_RENAMED')[0];
  assert.deepEqual(res, { type: 'TS_RENAMED', reqId: 5, results: [{ id: h1.id, status: 'renamed', name: 'heading/large' }], renamed: 1, skipped: 0, skipReasons: {}, roleVarsRenamed: 0, roleVarsTaken: 0, roleVarsError: 0, roleVarsStuck: [] });
  assert.equal(figma._undo, 1);
  assert.equal(ofType(out, 'PREREQ_STATE').length, 1);
  await p.send({ type: 'SET_LICENSE', tier: 'free' });
  out = await p.send({ type: 'SCAN_TS_RENAME', reqId: 6 });
  assert.equal(ofType(out, 'TS_RENAME_PLAN').length, 0);
  assert.equal(ofType(out, 'PREMIUM_REQUIRED')[0]?.feature, 'textStyles');
  out = await p.send({ type: 'APPLY_TS_RENAME', reqId: 7, items: [] });
  assert.equal(ofType(out, 'TS_RENAMED').length, 0);
});
