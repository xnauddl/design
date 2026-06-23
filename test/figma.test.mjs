/* figma 의존 모듈 테스트 — `npm test`가 build 후 dist/figma-lib.mjs를 불러온다.
   전역 `figma`를 목으로 주입해 extract·variables·bind·rename의 런타임 동작을 검증한다.
   순수 로직(tokens·naming)은 pure.test.mjs가 담당. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rgbToHex } from '../dist/pure.mjs';
import {
  extractFromSelection,
  createTokens,
  previewCreateTokens,
  createSemanticAliases,
  prunePaletteColors,
  scanTextStyles,
  createSemanticTextStyles,
  bindSelection,
  renameSelection,
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
      valuesByMode: {},
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
      setBoundVariableForPaint: (paint, field, v) => ({
        ...paint,
        boundVariables: { ...(paint.boundVariables ?? {}), [field]: { type: 'VARIABLE_ALIAS', id: v.id } },
      }),
      setBoundVariableForEffect: (effect, field, v) => ({
        ...effect,
        boundVariables: { ...(effect.boundVariables ?? {}), [field]: { type: 'VARIABLE_ALIAS', id: v.id } },
      }),
    },
    loadFontAsync: async () => {},
    createTextStyle: () => {
      const st = {
        id: `style:${seq++}`,
        name: '',
        fontName: { family: '', style: '' },
        fontSize: 0,
        lineHeight: { unit: 'AUTO' },
        letterSpacing: { value: 0, unit: 'PIXELS' },
        boundVariables: {},
        setBoundVariable(field, v) {
          this.boundVariables[field] = { type: 'VARIABLE_ALIAS', id: v.id };
        },
      };
      textStyles.push(st);
      return st;
    },
    getLocalTextStylesAsync: async () => textStyles.slice(),
    _state: { collections, variables, textStyles },
  };
  globalThis.figma = figma;
  return figma;
}

const findVar = (figma, colName, varName) => {
  const col = figma._state.collections.find((c) => c.name === colName);
  return figma._state.variables.find((v) => v.name === varName && v.variableCollectionId === col?.id);
};

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
    layoutMode: 'VERTICAL',
    itemSpacing: 16,
    paddingLeft: 8,
    paddingRight: 8,
    paddingTop: 0,
    paddingBottom: 0,
    width: 200,
    height: 100,
    cornerRadius: 8,
    children: [text, rect],
  };

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
  assert.deepEqual(
    { v: byName.get('line-height/150')?.value, u: byName.get('line-height/150')?.unit },
    { v: 150, u: 'percent' },
  );
  assert.equal(byName.get('letter-spacing/2')?.unit, 'px');
  // 간격/크기/반경
  assert.equal(byName.get('spacing/16')?.category, 'gap');
  assert.equal(byName.get('spacing/8')?.category, 'gap');
  assert.equal(byName.get('size/200')?.category, 'size');
  assert.equal(byName.get('size/100')?.category, 'size');
  assert.equal(byName.get('radius/8')?.category, 'radius');
  assert.equal(byName.get('radius/4')?.category, 'radius');
  // 선 두께(border) — 보이는 선이 있을 때만
  assert.equal(byName.get('stroke-width/2')?.category, 'strokeWidth');
  assert.deepEqual(byName.get('stroke-width/2')?.sources, ['strokeWidth']);
});

test('extractFromSelection — 그라디언트 채움은 경고', () => {
  installFigma();
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

/* ================= variables.ts ================= */
test('createTokens — Global 리터럴 + Semantic 별칭 + scopes/hidden + px 스냅샷', async () => {
  const figma = installFigma();
  const summary = await createTokens(
    [
      { name: 'color/0066ff', category: 'color', sources: ['fill'], value: '#0066ff' },
      { name: 'line-height/150', category: 'lineHeight', sources: ['lineHeight'], value: 150, unit: 'percent' },
      { name: 'spacing/16', category: 'gap', sources: ['gap'], value: 16 },
    ],
    16,
  );

  // #16: 토큰당 G+S 1쌍(스냅샷 없음). 색2 + 라인하이트2 + 간격2 = created 6
  assert.deepEqual(summary, { created: 6, updated: 0, globals: 3, semantics: 3 });

  // Global 색: 리터럴 + scope + hidden
  const gColor = findVar(figma, 'Global', 'color/0066ff');
  assert.equal(gColor.hiddenFromPublishing, true);
  assert.deepEqual(gColor.scopes, ['ALL_FILLS']);
  assert.equal(rgbToHex(gColor.valuesByMode['mode:Global']), '#0066ff');

  // Semantic 색: 리터럴 금지 → 별칭만
  const sColor = findVar(figma, 'Semantic', 'color/0066ff');
  assert.equal(sColor.valuesByMode['mode:Semantic'].type, 'VARIABLE_ALIAS');
  assert.equal(sColor.valuesByMode['mode:Semantic'].id, gColor.id);

  // #16: 비-px lineHeight는 px FLOAT 단일(value=24=16*150/100) + 원본 단위는 description
  const gLh = findVar(figma, 'Global', 'line-height/150');
  assert.equal(gLh.resolvedType, 'FLOAT');
  assert.equal(gLh.valuesByMode['mode:Global'], 24);
  assert.equal(gLh.description, '150%');
  assert.deepEqual(gLh.scopes, ['LINE_HEIGHT']); // FLOAT라 스코프 유지
  // Semantic 미러(별칭)
  const sLh = findVar(figma, 'Semantic', 'line-height/150');
  assert.equal(sLh.resolvedType, 'FLOAT');
  assert.equal(sLh.valuesByMode['mode:Semantic'].type, 'VARIABLE_ALIAS');
  assert.equal(sLh.valuesByMode['mode:Semantic'].id, gLh.id);
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

  assert.equal(first.created, 4);
  assert.deepEqual(
    { created: second.created, updated: second.updated },
    { created: 0, updated: 4 },
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
  // 역할 기반 스코프: surface→FRAME_FILL, text→TEXT_FILL (원시 ALL_FILLS 상속 아님)
  assert.deepEqual(surface.scopes, ['FRAME_FILL']);
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
  // Semantic 토큰 시드(별칭→Global 리터럴): 색 #0066ff, 크기 200
  await createTokens(
    [
      { name: 'color/0066ff', category: 'color', sources: ['fill'], value: '#0066ff' },
      { name: 'size/200', category: 'size', sources: ['size'], value: 200 },
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
    width: 200,
    height: 50,
    layoutMode: 'NONE',
    setBoundVariable(field, v) {
      (this._bound ??= {})[field] = v.id;
    },
  };

  const res = await bindSelection([node], 0.5);

  assert.equal(res.bound, 2); // 색 1 + width 1
  assert.equal(res.skipped, 1); // 미매칭 색 1
  assert.ok(res.flags.some((f) => /오토레이아웃/.test(f)));
  // 첫 채움에 변수 바인딩됨
  assert.equal(node.fills[0].boundVariables.color.type, 'VARIABLE_ALIAS');
  // width가 Semantic size 변수로 바인딩됨
  const sSize = findVar(figma, 'Semantic', 'size/200');
  assert.equal(node._bound.width, sSize.id);
});

test('bindSelection — 허용오차 내 동률은 가장 가까운 값으로 바인딩', async () => {
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
    width: 11, // 8(차이3) vs 12(차이1) → 12가 더 가까움
    height: 50,
    layoutMode: 'NONE',
    setBoundVariable(field, v) {
      (this._bound ??= {})[field] = v.id;
    },
  };
  await bindSelection([node], 4);
  const s12 = findVar(figma, 'Semantic', 'size/12');
  assert.equal(node._bound.width, s12.id);
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

  const res = await bindSelection([node], 0.5);

  const gap = findVar(figma, 'Semantic', 'spacing/24');
  // itemSpacing·paddingLeft는 GAP 변수로만 연결(크기/행간/자간으로 새지 않음)
  assert.equal(node._bound.itemSpacing, gap.id);
  assert.equal(node._bound.paddingLeft, gap.id);
  assert.equal(res.bound, 2); // itemSpacing + paddingLeft (0짜리 padding 3개는 no-match)
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

  const res = await bindSelection([node], 0.5);

  const sw = findVar(figma, 'Semantic', 'stroke-width/2');
  assert.equal(node._bound.strokeWeight, sw.id); // STROKE_FLOAT 변수로 연결
  assert.equal(res.bound, 1);
});

test('bindSelection — 사용량 한도(maxNodes) 초과 시 부분 적용 + limited', async () => {
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
  const res = await bindSelection([mk('a'), mk('b'), mk('c')], 0.5, { maxNodes: 2 });
  assert.equal(res.limited, true);
  assert.equal(res.bound, 2); // 노드 2개만 처리

  // 한도 미지정(무제한)이면 limited 없음
  const res2 = await bindSelection([mk('d'), mk('e')], 0.5);
  assert.equal(res2.limited, undefined);
  assert.equal(res2.bound, 2);
});

test('bindSelection — dry-run(apply=false)은 변경 없이 동일 집계 + 사유', async () => {
  installFigma();
  await createTokens(
    [
      { name: 'color/0066ff', category: 'color', sources: ['fill'], value: '#0066ff' },
      { name: 'size/200', category: 'size', sources: ['size'], value: 200 },
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
    width: 200,
    height: 50,
    layoutMode: 'NONE', // → 사유 no-autolayout
    setBoundVariable(field, v) {
      (this._bound ??= {})[field] = v.id;
    },
  });

  const node = mk();
  const dry = await bindSelection([node], 0.5, {}, false);
  assert.equal(dry.bound, 2); // 색1 + width1 예정
  assert.equal(dry.skipped, 1); // 미매칭 색1
  assert.equal(dry.reasons['no-match'], 1);
  assert.ok(dry.reasons['no-autolayout'] >= 1);
  // 변경 없음(dry-run): 채움 바인딩/노드 필드 미설정
  assert.equal(node.fills[0].boundVariables, undefined);
  assert.equal(node._bound, undefined);

  // 실제 적용은 동일 수치 + 변경 발생
  const node2 = mk();
  const real = await bindSelection([node2], 0.5, {}, true);
  assert.equal(real.bound, 2);
  assert.equal(real.skipped, 1);
  assert.equal(node2.fills[0].boundVariables.color.type, 'VARIABLE_ALIAS');
  // apply=true(실제)에서는 미리보기 후보/노드를 수집하지 않음
  assert.equal(real.candidates, undefined);
  assert.equal(real.nodes, undefined);
});

test('bindSelection — dry-run 후보(#6) + 트리 노드(#13): 영향+조상, 필드/변수/인덱스', async () => {
  const figma = installFigma();
  await createTokens(
    [
      { name: 'color/0066ff', category: 'color', sources: ['fill'], value: '#0066ff' },
      { name: 'size/200', category: 'size', sources: ['size'], value: 200 },
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
    width: 200, // → 후보(width)
    height: 50,
    layoutMode: 'NONE',
    setBoundVariable() {},
  };
  const root = { type: 'FRAME', id: 'root', name: 'root', fills: [], layoutMode: 'NONE', layoutSizingHorizontal: 'HUG', layoutSizingVertical: 'HUG', children: [child], setBoundVariable() {} };

  const dry = await bindSelection([root], 0.5, {}, false);

  // 후보 2건: fills[0] 색 + width
  assert.equal(dry.candidates.length, 2);
  const fillC = dry.candidates.find((c) => c.field === 'fills');
  assert.equal(fillC.nodeId, 'child');
  assert.equal(fillC.index, 0);
  assert.equal(fillC.currentValue, '#0066ff');
  assert.equal(fillC.variableName, 'color/0066ff');
  assert.ok(fillC.tier >= 2);
  const widthC = dry.candidates.find((c) => c.field === 'width');
  assert.equal(widthC.nodeId, 'child');
  assert.equal(widthC.distance, 0); // 정확 매칭

  // 트리: 영향(child) + 조상(root)만, pre-order. 계층 복원.
  assert.deepEqual(dry.nodes.map((n) => n.id), ['root', 'child']);
  const byId = new Map(dry.nodes.map((n) => [n.id, n]));
  assert.equal(byId.get('root').parentId, null);
  assert.equal(byId.get('child').parentId, 'root');
  assert.equal(byId.get('child').depth, 1);
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
  const res = await bindSelection(sel, 0.5, {}, true, {
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
  const res2 = await bindSelection(sel2, 0.5, {}, true, {
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
  const p = await previewCreateTokens(tokens);
  assert.equal(figma._state.variables.length, before); // 미생성(읽기 전용)
  // 토큰 2개 → Global 2 + Semantic 2
  assert.equal(p.globals, 2);
  assert.equal(p.semantics, 2);
  assert.equal(p.created, 4);
  assert.equal(p.updated, 0);

  // 실제 생성 후 다시 미리보기 → 모두 갱신 예정.
  await createTokens(tokens, 16);
  const p2 = await previewCreateTokens(tokens);
  assert.equal(p2.created, 0);
  assert.equal(p2.updated, 4);
});

/* ================= rename.ts ================= */
test('renameSelection — 역할 기반·보존형·맥락 전파·형제 중복(숫자 없음)', async () => {
  const figma = installFigma();
  const col = figma.variables.createVariableCollection('Semantic');
  const tokenVar = figma.variables.createVariable('button/primary/background', col, 'COLOR');

  // 의미 있는 이름 → 보존하고 자식 맥락으로 사용.
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
    name: 'button', // 사람이 지은 이름 → 보존
    children: [bg, icon1, icon2, txt, inst, bg2],
  };

  const { changes, applied } = await renameSelection([root], { apply: true, maxDepth: 3 });
  assert.equal(applied, true);

  const after = new Map(changes.map((c) => [c.id, c.after]));
  // 의미 있는 루트 이름은 보존(변경 없음) → 자식 맥락 'button'
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
  const root = { type: 'FRAME', id: 'root', name: 'card', children: [icon, keep] }; // 의미명 → 보존

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

test('renameSelection — 의미 있는 이름은 보존(교체 안 함)', async () => {
  installFigma();
  const node = { type: 'FRAME', id: 'f', name: 'OriginalName', children: [] };
  const { changes } = await renameSelection([node], { apply: true, maxDepth: 3 });
  assert.equal(changes.length, 0); // 기본명이 아니므로 보존
  assert.equal(node.name, 'OriginalName');
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
  assert.equal(after.get('e'), 'container'); // 빈 프레임 → container
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
  assert.equal(after.get('card'), 'container'); // 색+자식 다수 → container(스와치 아님)
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
  assert.equal(after.get('mid'), 'container'); // 가운데는 영역 추론 안 함
  assert.equal(after.get('hi'), 'header-icon'); // header 맥락 전파
  assert.equal(after.get('fi'), 'footer-icon');
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

test('renameSelection — 스냅샷 토큰 베낌(line-height-150-percent-px)도 교체', async () => {
  installFigma();
  const frame = { type: 'FRAME', id: 'f', name: 'line-height-150-percent-px', children: [] };
  // #7b: depth0 루트는 보존이므로 대상을 루트 아래에 둔다.
  const root = { type: 'FRAME', id: 'root', name: 'Frame 0', children: [frame] };
  const { changes } = await renameSelection([root], { apply: true, maxDepth: 3 });
  const after = new Map(changes.map((c) => [c.id, c.after]));
  assert.equal(after.get('f'), 'container'); // percent-px echo → 보존 안 하고 역할로 교체
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

  assert.equal(removed, 2); // blue/700 의 Global+Semantic
  assert.ok(!findVar(figma, 'Global', 'color/blue/700'));
  assert.ok(findVar(figma, 'Global', 'color/blue/500')); // keep
  assert.ok(findVar(figma, 'Global', 'color/green/500')); // 다른 패밀리 보존
  assert.ok(findVar(figma, 'Global', 'color/0066ff')); // 추출 hex 보존
  assert.ok(findVar(figma, 'Global', 'spacing/16')); // 비색 보존
});

/* ================= textStyles.ts (Phase C) ================= */
test('scanTextStyles — TEXT 노드 시그니처 수집(+%행간 환산·mixed 스킵)', () => {
  const figma = installFigma();
  const t1 = { type: 'TEXT', id: 't1', name: 'Title', fontSize: 32, fontName: { family: 'Inter', style: 'Bold' }, lineHeight: { unit: 'PIXELS', value: 40 }, letterSpacing: { unit: 'PIXELS', value: 0 }, characters: 'Hi' };
  const t2 = { type: 'TEXT', id: 't2', name: 'Body', fontSize: 16, fontName: { family: 'Inter', style: 'Regular' }, lineHeight: { unit: 'PERCENT', value: 150 }, letterSpacing: { unit: 'PIXELS', value: 0 }, characters: 'x' };
  const tMixed = { type: 'TEXT', id: 't3', name: 'Mixed', fontSize: figma.mixed, fontName: { family: 'Inter', style: 'Regular' }, lineHeight: { unit: 'AUTO' }, letterSpacing: { unit: 'PIXELS', value: 0 }, characters: 'y' };
  const frame = { type: 'FRAME', id: 'f', name: 'F', children: [t1, t2, tMixed] };

  const { samples, warnings } = scanTextStyles([frame]);
  assert.equal(samples.length, 2); // mixed 제외
  assert.equal(samples.find((s) => s.fontSize === 16).lineHeight, 24); // 150% × 16
  assert.equal(samples.find((s) => s.fontSize === 32).style, 'Bold');
  assert.ok(warnings.length >= 1);
});

test('createSemanticTextStyles — 변수 보장 + 시맨틱 바인딩 + 적용 + 멱등', async () => {
  const figma = installFigma();
  const specs = [{ name: 'body', fontSize: 16, lineHeight: 24, letterSpacing: 0, family: 'Inter', style: 'Regular' }];
  const node = {
    type: 'TEXT', id: 'n1', name: 'b', fontSize: 16, fontName: { family: 'Inter', style: 'Regular' },
    lineHeight: { unit: 'PIXELS', value: 24 }, letterSpacing: { unit: 'PIXELS', value: 0 }, characters: 'hi',
    _styleId: null, async setTextStyleIdAsync(id) { this._styleId = id; },
  };

  const r = await createSemanticTextStyles(specs, true, [node]);
  assert.equal(r.created, 1);
  assert.equal(r.bound, 2); // fontSize + lineHeight
  assert.equal(r.applied, 1);
  assert.deepEqual(r.missing, []);

  // 시맨틱 변수(역할명) 생성 + 스타일 바인딩
  assert.ok(findVar(figma, 'Semantic', 'font-size/body'));
  assert.ok(findVar(figma, 'Semantic', 'line-height/body'));
  const style = figma._state.textStyles.find((s) => s.name === 'body');
  assert.equal(style.fontSize, 16);
  assert.ok(style.boundVariables.fontSize);
  assert.ok(style.boundVariables.lineHeight);
  assert.equal(node._styleId, style.id); // 원본 적용됨

  // 멱등: 재실행 → updated(신규 0)
  const r2 = await createSemanticTextStyles(specs, false, []);
  assert.equal(r2.created, 0);
  assert.equal(r2.updated, 1);
  assert.equal(figma._state.textStyles.length, 1); // 중복 생성 없음
});
