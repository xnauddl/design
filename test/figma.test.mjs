/* figma 의존 모듈 테스트 — `npm test`가 build 후 dist/figma-lib.mjs를 불러온다.
   전역 `figma`를 목으로 주입해 extract·variables·bind·rename의 런타임 동작을 검증한다.
   순수 로직(tokens·naming)은 pure.test.mjs가 담당. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rgbToHex } from '../dist/pure.mjs';
import {
  extractFromSelection,
  createTokens,
  createSemanticAliases,
  bindSelection,
  renameSelection,
} from '../dist/figma-lib.mjs';

/* ---------------- figma 전역 목 ---------------- */
function installFigma() {
  const collections = [];
  const variables = [];
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
    _state: { collections, variables },
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

  // 색(G+S)=2 + 라인하이트(G STRING + G px + S px미러 + S STRING)=4 + 간격(G+S)=2 = created 8
  assert.deepEqual(summary, { created: 8, updated: 0, globals: 4, semantics: 4 });

  // Global 색: 리터럴 + scope + hidden
  const gColor = findVar(figma, 'Global', 'color/0066ff');
  assert.equal(gColor.hiddenFromPublishing, true);
  assert.deepEqual(gColor.scopes, ['ALL_FILLS']);
  assert.equal(rgbToHex(gColor.valuesByMode['mode:Global']), '#0066ff');

  // Semantic 색: 리터럴 금지 → 별칭만
  const sColor = findVar(figma, 'Semantic', 'color/0066ff');
  assert.equal(sColor.valuesByMode['mode:Semantic'].type, 'VARIABLE_ALIAS');
  assert.equal(sColor.valuesByMode['mode:Semantic'].id, gColor.id);

  // 비-px lineHeight: Global은 STRING '150%', px 스냅샷 FLOAT 24(이름에 단위 포함)
  const gLh = findVar(figma, 'Global', 'line-height/150');
  assert.equal(gLh.resolvedType, 'STRING');
  assert.equal(gLh.valuesByMode['mode:Global'], '150%');
  // STRING엔 LINE_HEIGHT(FLOAT 전용) 스코프를 못 줌 → 필터되어 빈 배열 (실 Figma 거부 방지)
  assert.deepEqual(gLh.scopes, []);
  const gLhPx = findVar(figma, 'Global', 'line-height/150-percent-px');
  assert.equal(gLhPx.resolvedType, 'FLOAT');
  assert.equal(gLhPx.valuesByMode['mode:Global'], 24);
  // px 스냅샷(FLOAT)은 LINE_HEIGHT 스코프 유지
  assert.deepEqual(gLhPx.scopes, ['LINE_HEIGHT']);
  // px 스냅샷은 Semantic 미러(별칭)도 있어 바인딩 가능
  const sLhPx = findVar(figma, 'Semantic', 'line-height/150-percent-px');
  assert.equal(sLhPx.resolvedType, 'FLOAT');
  assert.equal(sLhPx.valuesByMode['mode:Semantic'].type, 'VARIABLE_ALIAS');
  assert.equal(sLhPx.valuesByMode['mode:Semantic'].id, gLhPx.id);
});

test('createTokens — px 스냅샷 이름에 단위 포함(percent vs em 값 충돌 없음)', async () => {
  const figma = installFigma();
  await createTokens(
    [
      { name: 'line-height/150', category: 'lineHeight', sources: ['lineHeight'], value: 150, unit: 'percent' },
      { name: 'line-height/150-em', category: 'lineHeight', sources: ['lineHeight'], value: 150, unit: 'em' },
    ],
    16,
  );
  const pct = findVar(figma, 'Global', 'line-height/150-percent-px');
  const em = findVar(figma, 'Global', 'line-height/150-em-px');
  assert.equal(pct.valuesByMode['mode:Global'], 24); // 16*150/100
  assert.equal(em.valuesByMode['mode:Global'], 2400); // 150*16
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

/* ================= rename.ts ================= */
test('renameSelection — 토큰명/역할명/제외규칙/형제 dedup', async () => {
  const figma = installFigma();
  const col = figma.variables.createVariableCollection('Semantic');
  const tokenVar = figma.variables.createVariable('button/primary/background', col, 'COLOR');

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
    name: 'Root',
    children: [bg, icon1, icon2, txt, inst, bg2],
  };

  const { changes, applied } = await renameSelection([root], { apply: true, maxDepth: 3 });
  assert.equal(applied, true);

  const after = new Map(changes.map((c) => [c.id, c.after]));
  // 루트 FRAME → role 'container'
  assert.equal(after.get('root'), 'container');
  // 토큰 보유 → 변수 전체 경로
  assert.equal(after.get('bg'), 'button-primary-background');
  // 역할명 + 상위 맥락 + 형제 dedup
  assert.equal(after.get('ic1'), 'container-icon');
  assert.equal(after.get('ic2'), 'container-icon-2');
  // 토큰 없는 채움 사각형 → background
  assert.equal(after.get('bg2'), 'container-background');
  // 제외: Text·Instance는 변경 없음(이름 유지)
  assert.equal(after.has('tx'), false);
  assert.equal(after.has('in'), false);
  assert.equal(txt.name, 'KeepText');
  assert.equal(inst.name, 'KeepInstance');
});

test('renameSelection — apply:false면 미리보기만(노드 이름 불변)', async () => {
  installFigma();
  const node = { type: 'FRAME', id: 'f', name: 'OriginalName', children: [] };
  const { changes, applied } = await renameSelection([node], { apply: false, maxDepth: 3 });
  assert.equal(applied, false);
  assert.equal(changes.length, 1);
  assert.equal(changes[0].after, 'container');
  assert.equal(node.name, 'OriginalName'); // 적용 안 함
});
