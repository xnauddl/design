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
  scanTextStyles,
  createSemanticTextStyles,
  prunePaletteColors,
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
  // 색상 — 팔레트와 동일한 color/{family}/{step} 체계(OKLCH 분류)
  assert.equal(byName.get('color/red/400')?.category, 'color'); // #ff0000
  assert.equal(byName.get('color/neutral/950')?.category, 'color'); // #000000
  assert.equal(byName.get('color/blue/600')?.category, 'color'); // #0000ff
  // 검정은 한 번만(dedup)
  assert.equal(tokens.filter((t) => t.name === 'color/neutral/950').length, 1);
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

test('extractFromSelection — 그림자색은 채움색과 이름 분리(P1) + 불투명도 백분율(P3)', () => {
  installFigma();
  const rect = {
    type: 'RECTANGLE',
    id: 's1',
    name: 'Shadowed',
    // 채움 검정 + 50% 불투명
    fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, visible: true, opacity: 0.5 }],
    // 그림자도 같은 검정 — 옛 동작에선 이름이 'color/000000'으로 겹쳐 Global 변수 1개로 합쳐졌다
    // 수치는 서로 달라야 값 기준 dedup(category|value|unit)으로 합쳐지지 않음
    effects: [
      { type: 'DROP_SHADOW', visible: true, color: { r: 0, g: 0, b: 0 }, radius: 4, spread: 1, offset: { x: 3, y: 2 } },
    ],
  };

  const { tokens } = extractFromSelection([rect]);
  const byName = new Map(tokens.map((t) => [t.name, t]));

  // 채움색과 그림자색이 서로 다른 이름 → upsert 충돌/스코프 덮어쓰기 없음
  assert.equal(byName.get('color/neutral/950')?.category, 'color'); // 채움 #000000
  assert.equal(byName.get('shadow/color/000000')?.category, 'effectColor'); // 그림자색은 hex 유지
  assert.notEqual('color/neutral/950', 'shadow/color/000000');
  // P2: 그림자 수치는 'shadow/' 계층
  assert.equal(byName.get('shadow/blur/4')?.category, 'effectFloat');
  assert.equal(byName.get('shadow/spread/1')?.category, 'effectFloat');
  assert.equal(byName.get('shadow/x/3')?.category, 'effectFloat');
  assert.equal(byName.get('shadow/y/2')?.category, 'effectFloat');
  // P3: 불투명도 0.5 → 'opacity/50'(값은 그대로 0.5)
  assert.equal(byName.get('opacity/50')?.value, 0.5);
});

test('extractFromSelection — 같은 family/step 버킷 충돌은 결정적 접미사(-2)', () => {
  installFigma();
  // 두 파랑은 모두 color/blue/500으로 분류됨 → 이름 충돌 → 뒤(큰 hex)에 -2
  const a = {
    type: 'RECTANGLE', id: 'a', name: 'A',
    fills: [{ type: 'SOLID', color: { r: 51 / 255, g: 102 / 255, b: 1 }, visible: true }], // #3366ff
  };
  const b = {
    type: 'RECTANGLE', id: 'b', name: 'B',
    fills: [{ type: 'SOLID', color: { r: 58 / 255, g: 107 / 255, b: 1 }, visible: true }], // #3a6bff
  };
  const { tokens } = extractFromSelection([a, b]);
  const names = tokens.filter((t) => t.category === 'color').map((t) => t.name).sort();

  assert.deepEqual(names, ['color/blue/500', 'color/blue/500-2']);
  // 두 색 모두 보존(값 손실 없음) — 서로 다른 변수
  assert.equal(tokens.filter((t) => t.category === 'color').length, 2);
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
test('renameSelection — HTML 태그·보존형·형제 중복(숫자 없음)', async () => {
  const figma = installFigma();
  const col = figma.variables.createVariableCollection('Semantic');
  const tokenVar = figma.variables.createVariable('button/primary/background', col, 'COLOR');

  const bg = {
    type: 'RECTANGLE', id: 'bg', name: 'Rectangle 1',
    boundVariables: { fills: [{ type: 'VARIABLE_ALIAS', id: tokenVar.id }] },
    fills: [{ type: 'SOLID', visible: true }],
  };
  const icon1 = { type: 'VECTOR', id: 'ic1', name: 'Vector 2' };
  const icon2 = { type: 'VECTOR', id: 'ic2', name: 'Vector 3' };
  const txt = { type: 'TEXT', id: 'tx', name: 'KeepText', characters: 'x' };
  const inst = { type: 'INSTANCE', id: 'in', name: 'KeepInstance' };
  const bg2 = { type: 'RECTANGLE', id: 'bg2', name: 'Rectangle 9', fills: [{ type: 'SOLID', visible: true }] };
  const root = { type: 'FRAME', id: 'root', name: 'button', children: [bg, icon1, icon2, txt, inst, bg2] };

  const { changes, applied } = await renameSelection([root], { apply: true, maxDepth: 3 });
  assert.equal(applied, true);
  const after = new Map(changes.map((c) => [c.id, c.after]));
  // 사람이 지은 이름은 보존(변경 없음)
  assert.equal(after.has('root'), false);
  assert.equal(root.name, 'button');
  // 토큰 말단(background) 신호 → box. 맥락 접두사 없는 단일 태그.
  assert.equal(after.get('bg'), 'box');
  // VECTOR → svg. 형제가 같아도 숫자 안 붙음(Figma 중복 허용)
  assert.equal(after.get('ic1'), 'svg');
  assert.equal(after.get('ic2'), 'svg');
  // 토큰 없는 채움 사각형 → box
  assert.equal(after.get('bg2'), 'box');
  // 제외: Text·Instance 불변
  assert.equal(after.has('tx'), false);
  assert.equal(after.has('in'), false);
  assert.equal(txt.name, 'KeepText');
  assert.equal(inst.name, 'KeepInstance');
});

test('renameSelection — 의미 있는 이름은 보존(교체 안 함)', async () => {
  installFigma();
  const node = { type: 'FRAME', id: 'f', name: 'OriginalName', children: [] };
  const { changes } = await renameSelection([node], { apply: true, maxDepth: 3 });
  assert.equal(changes.length, 0);
  assert.equal(node.name, 'OriginalName');
});

test('renameSelection — 토큰/원시 신호: background 토큰·단색 사각형 모두 box', async () => {
  const figma = installFigma();
  const col = figma.variables.createVariableCollection('Semantic');
  const semantic = figma.variables.createVariable('button/primary/background', col, 'COLOR');
  const glob = figma.variables.createVariableCollection('Global');
  const primitive = figma.variables.createVariable('color/blue-500', glob, 'COLOR');

  const a = { type: 'RECTANGLE', id: 'a', name: 'Rectangle 1',
    boundVariables: { fills: [{ type: 'VARIABLE_ALIAS', id: semantic.id }] }, fills: [{ type: 'SOLID', visible: true }] };
  const b = { type: 'RECTANGLE', id: 'b', name: 'Rectangle 1',
    boundVariables: { fills: [{ type: 'VARIABLE_ALIAS', id: primitive.id }] }, fills: [{ type: 'SOLID', visible: true }] };

  const { changes } = await renameSelection([a, b], { apply: true, maxDepth: 3 });
  const after = new Map(changes.map((c) => [c.id, c.after]));
  assert.equal(after.get('a'), 'box'); // 토큰 background → box
  assert.equal(after.get('b'), 'box'); // 원시 토큰 무시 → 단색 사각형 → box
});

test('renameSelection — 구 리네임 토큰 베낌 이름(color-121210)은 교체 → box', async () => {
  const figma = installFigma();
  const glob = figma.variables.createVariableCollection('Global');
  const primitive = figma.variables.createVariable('color/121210', glob, 'COLOR');
  const frame = { type: 'FRAME', id: 'f', name: 'color-121210', fills: [{ type: 'SOLID', visible: true }],
    boundVariables: { fills: [{ type: 'VARIABLE_ALIAS', id: primitive.id }] }, children: [] };
  const { changes } = await renameSelection([frame], { apply: true, maxDepth: 3 });
  const after = new Map(changes.map((c) => [c.id, c.after]));
  assert.equal(after.get('f'), 'box'); // 색만 채운 빈 프레임 → box
  assert.notEqual(frame.name, 'color-121210');
});

test('renameSelection — 빈 프레임: 색→box, 이미지→img, 빈→wrap', async () => {
  installFigma();
  const swatch = { type: 'FRAME', id: 's', name: 'Frame 1', fills: [{ type: 'SOLID', visible: true }], children: [] };
  const imageFrame = { type: 'FRAME', id: 'im', name: 'Frame 2', fills: [{ type: 'IMAGE', visible: true }], children: [] };
  const emptyFrame = { type: 'FRAME', id: 'e', name: 'Frame 3', children: [] };
  const { changes } = await renameSelection([swatch, imageFrame, emptyFrame], { apply: true, maxDepth: 3 });
  const after = new Map(changes.map((c) => [c.id, c.after]));
  assert.equal(after.get('s'), 'box'); // 색만 채운 빈 프레임 → box
  assert.equal(after.get('im'), 'img'); // 이미지 채움 → img
  assert.equal(after.get('e'), 'wrap'); // 빈 프레임 → 깊이0 wrap
});

test('renameSelection — 라운드 없는 채움 프레임은 box 아님(레이아웃 → wrap)', async () => {
  installFigma();
  const card = { type: 'FRAME', id: 'card', name: 'Frame 1', fills: [{ type: 'SOLID', visible: true }],
    children: [{ type: 'VECTOR', id: 'ci', name: 'Vector 1' }, { type: 'VECTOR', id: 'ci2', name: 'Vector 2' }] };
  const { changes } = await renameSelection([card], { apply: true, maxDepth: 3 });
  const after = new Map(changes.map((c) => [c.id, c.after]));
  assert.equal(after.get('card'), 'wrap'); // 모서리 없는 채움 프레임 → 레이아웃(wrap)
  assert.equal(after.get('ci'), 'svg'); // VECTOR → svg
});

test('renameSelection — 라운드 박스(채움+모서리) → box', async () => {
  installFigma();
  const box = { type: 'FRAME', id: 'bx', name: 'Frame 1', cornerRadius: 12, fills: [{ type: 'SOLID', visible: true }],
    children: [{ type: 'VECTOR', id: 'bi', name: 'Vector 1' }, { type: 'VECTOR', id: 'bi2', name: 'Vector 2' }] };
  const { changes } = await renameSelection([box], { apply: true, maxDepth: 3 });
  assert.equal(new Map(changes.map((c) => [c.id, c.after])).get('bx'), 'box');
});

test('renameSelection — 기하 신호: 얇은 막대→hr, 이미지 타원→img, 선→hr', async () => {
  installFigma();
  const divider = { type: 'RECTANGLE', id: 'd', name: 'Rectangle 1', width: 200, height: 1, fills: [{ type: 'SOLID', visible: true }] };
  const avatar = { type: 'ELLIPSE', id: 'av', name: 'Ellipse 1', width: 40, height: 40, fills: [{ type: 'IMAGE', visible: true }] };
  const line = { type: 'LINE', id: 'ln', name: 'Line 1', width: 100, height: 0 };
  const { changes } = await renameSelection([divider, avatar, line], { apply: true, maxDepth: 3 });
  const after = new Map(changes.map((c) => [c.id, c.after]));
  assert.equal(after.get('d'), 'hr');
  assert.equal(after.get('av'), 'img');
  assert.equal(after.get('ln'), 'hr');
});

test('renameSelection — 멱등: 한 번 정돈한 이름은 재실행에도 불변', async () => {
  installFigma();
  const icon1 = { type: 'VECTOR', id: 'ic1', name: 'Vector 1' };
  const icon2 = { type: 'VECTOR', id: 'ic2', name: 'Vector 2' };
  const root = { type: 'FRAME', id: 'root', name: 'card', children: [icon1, icon2] };
  await renameSelection([root], { apply: true, maxDepth: 3 });
  assert.equal(icon1.name, 'svg');
  assert.equal(icon2.name, 'svg'); // 숫자 없이 형제 중복 허용
  const { changes } = await renameSelection([root], { apply: true, maxDepth: 3 });
  assert.equal(changes.length, 0); // 태그명은 기본명 아님 → 보존
});

test('renameSelection — apply:false면 미리보기만(노드 이름 불변)', async () => {
  installFigma();
  const node = { type: 'FRAME', id: 'f', name: 'Frame 1', children: [] };
  const { changes, applied } = await renameSelection([node], { apply: false, maxDepth: 3 });
  assert.equal(applied, false);
  assert.equal(changes.length, 1);
  assert.equal(changes[0].after, 'wrap'); // 빈 프레임 → wrap
  assert.equal(node.name, 'Frame 1');
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
  assert.equal(after.get('mid'), 'container'); // 가운데: 영역 아님 → 깊이1(page=wrap 아래)
  assert.equal(after.get('hi'), 'svg'); // header(시맨틱) 아래 → 깊이 리셋, VECTOR→svg
  assert.equal(after.get('fi'), 'svg');
});

test('renameSelection — 제네릭 깊이 사다리: header 아래 wrap→container→content(숫자 없음)', async () => {
  installFigma();
  const deep3 = { type: 'FRAME', id: 'd3', name: 'Frame', children: [
    { type: 'VECTOR', id: 'v3a', name: 'Vector' }, { type: 'VECTOR', id: 'v3b', name: 'Vector' }] };
  const deep2 = { type: 'FRAME', id: 'd2', name: 'Frame', children: [deep3, { type: 'VECTOR', id: 'x2', name: 'Vector' }] };
  const deep1 = { type: 'FRAME', id: 'd1', name: 'Frame', children: [deep2, { type: 'VECTOR', id: 'x1', name: 'Vector' }] };
  const header = { type: 'FRAME', id: 'hd', name: 'Frame', children: [deep1, { type: 'VECTOR', id: 'hx', name: 'Vector' }] };
  const footer = { type: 'FRAME', id: 'ft', name: 'Frame', children: [] };
  const page = { type: 'FRAME', id: 'page', name: 'Frame', layoutMode: 'VERTICAL', children: [header, footer] };
  const { changes } = await renameSelection([page], { apply: true, maxDepth: 3 });
  const after = new Map(changes.map((c) => [c.id, c.after]));
  assert.equal(after.get('hd'), 'header'); // 영역(시맨틱) → 자식 깊이 리셋
  assert.equal(after.get('d1'), 'wrap'); // 깊이0
  assert.equal(after.get('d2'), 'container'); // 깊이1
  assert.equal(after.get('d3'), 'content'); // 깊이2 (이후 inner)
  assert.equal(after.get('hx'), 'svg');
});

test('renameSelection — 제네릭 깊이 사다리(시맨틱 조상 없음): wrap→container', async () => {
  installFigma();
  const inner = { type: 'FRAME', id: 'in', name: 'Frame', children: [
    { type: 'VECTOR', id: 'iv1', name: 'Vector' }, { type: 'VECTOR', id: 'iv2', name: 'Vector' }] };
  const root = { type: 'FRAME', id: 'rt', name: 'Frame', children: [inner, { type: 'VECTOR', id: 'rv', name: 'Vector' }] };
  const { changes } = await renameSelection([root], { apply: true, maxDepth: 3 });
  const after = new Map(changes.map((c) => [c.id, c.after]));
  assert.equal(after.get('rt'), 'wrap'); // 깊이0
  assert.equal(after.get('in'), 'container'); // 깊이1
});

test('renameSelection — 목록 추론: 동일 시그니처 형제 ≥3 → ul, 자식 → li', async () => {
  installFigma();
  const mkItem = (id) => ({ type: 'FRAME', id, name: 'Frame', children: [
    { type: 'TEXT', id: id + 't', name: 'T', characters: 'x' }, { type: 'VECTOR', id: id + 'v', name: 'Vector' }] });
  const list = { type: 'FRAME', id: 'list', name: 'Frame 1', layoutMode: 'VERTICAL',
    children: [mkItem('a'), mkItem('b'), mkItem('c')] };
  const { changes } = await renameSelection([list], { apply: true, maxDepth: 3 });
  const after = new Map(changes.map((c) => [c.id, c.after]));
  assert.equal(after.get('list'), 'ul');
  assert.equal(after.get('a'), 'li');
  assert.equal(after.get('b'), 'li');
  assert.equal(after.get('c'), 'li');
  assert.equal(after.get('cv'), 'svg'); // li(시맨틱) 아래 → svg
});

test('renameSelection — 그림 추론: 이미지+캡션 → figure', async () => {
  installFigma();
  const fig = { type: 'FRAME', id: 'fig', name: 'Frame 1', children: [
    { type: 'RECTANGLE', id: 'pic', name: 'Rectangle 1', fills: [{ type: 'IMAGE', visible: true }] },
    { type: 'TEXT', id: 'cap', name: 'Caption', characters: '사진 설명' }] };
  const { changes } = await renameSelection([fig], { apply: true, maxDepth: 3 });
  const after = new Map(changes.map((c) => [c.id, c.after]));
  assert.equal(after.get('fig'), 'figure');
  assert.equal(after.get('pic'), 'img'); // figure 안 이미지
  assert.equal(after.has('cap'), false); // 캡션 텍스트 보존
});

test('renameSelection — 스크롤 신호: overflowDirection → scroll', async () => {
  installFigma();
  const sc = { type: 'FRAME', id: 'sc', name: 'Frame 1', overflowDirection: 'VERTICAL',
    children: [{ type: 'VECTOR', id: 'sv', name: 'Vector 1' }, { type: 'VECTOR', id: 'sv2', name: 'Vector 2' }] };
  const { changes } = await renameSelection([sc], { apply: true, maxDepth: 3 });
  assert.equal(new Map(changes.map((c) => [c.id, c.after])).get('sc'), 'scroll');
});

test('renameSelection — 버튼 추론: 오토레이아웃+라운드+채움+텍스트 → button', async () => {
  installFigma();
  const btn = { type: 'FRAME', id: 'btn', name: 'Frame 1', layoutMode: 'HORIZONTAL',
    cornerRadius: 8, height: 40, fills: [{ type: 'SOLID', visible: true }],
    children: [{ type: 'TEXT', id: 'bt', name: 'Label', characters: '확인' }, { type: 'VECTOR', id: 'bi', name: 'Vector 1' }] };
  const { changes } = await renameSelection([btn], { apply: true, maxDepth: 3 });
  const after = new Map(changes.map((c) => [c.id, c.after]));
  assert.equal(after.get('btn'), 'button');
  assert.equal(after.has('bt'), false);
  assert.equal(after.get('bi'), 'svg'); // button(시맨틱) 아래 → svg
});

test('renameSelection — 스냅샷 토큰 베낌(line-height-150-percent-px)도 교체 → wrap', async () => {
  installFigma();
  const frame = { type: 'FRAME', id: 'f', name: 'line-height-150-percent-px', children: [] };
  const { changes } = await renameSelection([frame], { apply: true, maxDepth: 3 });
  const after = new Map(changes.map((c) => [c.id, c.after]));
  assert.equal(after.get('f'), 'wrap'); // echo → 빈 프레임 → wrap
  assert.notEqual(frame.name, 'line-height-150-percent-px');
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

/* ================= prunePaletteColors (팔레트 재적용 정리) ================= */
test('prunePaletteColors — keep에 없는 팔레트 색만 삭제(사용자 변수 보존)', async () => {
  const figma = installFigma();
  // 이전 팔레트(사각=accent-1·2·3) + 사용자 커스텀 색 + 비색
  await createTokens(
    [
      { name: 'color/accent-1/500', category: 'color', sources: ['fill'], value: '#111111' },
      { name: 'color/accent-2/500', category: 'color', sources: ['fill'], value: '#222222' },
      { name: 'color/accent-3/500', category: 'color', sources: ['fill'], value: '#333333' },
      { name: 'color/secondary/500', category: 'color', sources: ['fill'], value: '#444444' },
      { name: 'color/brandish/500', category: 'color', sources: ['fill'], value: '#555555' }, // 사용자 색(팔레트 패밀리 아님)
      { name: 'spacing/16', category: 'gap', sources: ['gap'], value: 16 },
    ],
    16,
  );
  // 새 팔레트(보색=accent-1만) 재적용 → accent-2·3 정리, accent-1·secondary·사용자색·간격 보존
  const keep = ['color/accent-1/500', 'color/secondary/500'];
  const removed = await prunePaletteColors(keep);

  assert.equal(removed, 4); // Global+Semantic 각각 accent-2, accent-3 = 4개
  assert.ok(!findVar(figma, 'Global', 'color/accent-2/500'));
  assert.ok(!findVar(figma, 'Global', 'color/accent-3/500'));
  assert.ok(findVar(figma, 'Global', 'color/accent-1/500')); // keep
  assert.ok(findVar(figma, 'Global', 'color/secondary/500')); // keep
  assert.ok(findVar(figma, 'Global', 'color/brandish/500')); // 사용자 색 보존
  assert.ok(findVar(figma, 'Global', 'spacing/16')); // 비색 보존
});
