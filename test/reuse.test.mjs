/* [등록] 재사용 테스트 (IA v3 §4.7 "재사용", 2026-11-05 결정 A).
   순수 판정(재사용 키 · 키 맞추기 · 짝 맞추기)은 dist/pure.mjs, figma 적용 조각(값 옮기기 · 비동기 바꾸기 ·
   아이콘 등록부)은 dist/figma-lib.mjs의 목 테스트다. 실제 피그마 확인은 부록 A.5의 마지막 항목. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  structFingerprint,
  reuseKey,
  reuseNameKey,
  reusePlanFor,
  matchReuse,
  reusePairIssue,
  isHeadingCollapseGroup,
} from '../dist/pure.mjs';
import { copyOverridesAsync, replaceMemberAsync, createIconRegistry } from '../dist/figma-lib.mjs';

/* ---------- 재사용 키 (1번) ---------- */

const text = (id, name, characters, extra = {}) => ({ id, name, type: 'TEXT', characters, width: 40, height: 16, ...extra });
const vec = (id, vectorKey, extra = {}) => ({ id, name: 'icon', type: 'VECTOR', vectorKey, width: 16, height: 16, ...extra });
/** 버튼 모양: 가로 오토레이아웃 + 아이콘 + 라벨. */
function button(id, { name = 'Like Button', label = 'Like', icon = 'heart', w = 96, h = 32, fill = '#1155ff', pad = 8, photo, kids } = {}) {
  return {
    id, name, type: 'FRAME', layoutMode: 'HORIZONTAL', width: w, height: h, fillHex: fill,
    paddingTop: pad, paddingRight: pad, paddingBottom: pad, paddingLeft: pad, itemSpacing: 4,
    ...(photo ? { imageHash: photo } : {}),
    children: kids ?? [vec(`${id}v`, icon), text(`${id}t`, 'label', label)],
  };
}

test('재사용 키 — 글자 · 사진 해시 · 레이어 이름 · 안쪽 인스턴스 메인은 지문에 넣지 않는다', () => {
  const a = button('a', { label: 'Like', photo: 'h1' });
  const b = button('b', { label: 'Save', photo: 'h2', kids: [vec('bv', 'heart', { name: 'other' }), text('bt', 'caption', 'Save')] });
  assert.equal(structFingerprint(a, true), structFingerprint(b, true));
  const ia = { ...button('c'), children: [{ id: 'i1', name: 'Badge', type: 'INSTANCE', mainComponentKey: 'k1' }] };
  const ib = { ...button('d'), children: [{ id: 'i2', name: 'Pill', type: 'INSTANCE', mainComponentKey: 'k2', width: 99 }] };
  assert.equal(structFingerprint(ia, true), structFingerprint(ib, true), 'INSTANCE는 타입만 — 크기 · 메인 제외');
  assert.equal(reuseKey('single', a), reuseKey('single', b));
});

test('재사용 키 — 자식 수 · 타입 · 여백 · 채움 · 오토레이아웃 · 그림 종류 · 보이기가 다르면 다르다', () => {
  const base = structFingerprint(button('a'), false);
  const diffs = [
    button('b', { kids: [vec('bv', 'heart')] }), // 자식 수
    button('c', { kids: [text('c1', 'x', 'x'), text('c2', 'label', 'Like')] }), // 타입
    button('d', { pad: 12 }), // 여백
    button('e', { fill: '#ff0000' }), // 채움
    { ...button('f'), layoutMode: 'VERTICAL' }, // 방향
    button('g', { photo: 'h' }), // 그림 종류(사진)
    { ...button('h'), children: [{ ...vec('hv', 'heart'), visible: false }, text('ht', 'label', 'Like')] }, // 보이기
  ];
  for (const d of diffs) assert.notEqual(structFingerprint(d, false), base, d.id);
  // 이름이 `?`로 끝나는 레이어 · TEXT의 보이기는 넣지 않는다(접힘의 보이기 속성)
  const q = { ...button('q'), children: [{ ...vec('qv', 'heart', { name: 'icon?' }), visible: false }, text('qt', 'label', 'Like', { visible: false })] };
  const q2 = { ...button('q2'), children: [vec('q2v', 'heart', { name: 'icon?' }), text('q2t', 'label', 'Like')] };
  assert.equal(structFingerprint(q, false), structFingerprint(q2, false));
});

test('재사용 키 — 정확 지문은 크기 · 벡터 그림으로 갈리고, 접힘 지문은 갈리지 않는다', () => {
  const a = button('a');
  const wide = button('b', { w: 120 });
  const star = button('c', { icon: 'star' });
  assert.notEqual(structFingerprint(a, true), structFingerprint(wide, true));
  assert.notEqual(structFingerprint(a, true), structFingerprint(star, true));
  assert.equal(structFingerprint(a, false), structFingerprint(wide, false));
  assert.equal(structFingerprint(a, false), structFingerprint(star, false));
  // TEXT 크기는 정확 지문에도 넣지 않는다(카피 길이)
  const longText = button('d', { kids: [vec('dv', 'heart'), text('dt', 'label', 'Like it', { width: 80 })] });
  assert.equal(structFingerprint(a, true), structFingerprint(longText, true));
});

test('재사용 키 — 이름 키가 다르면 다르다(대소문자 · 여백만 관대)', () => {
  const like = button('a', { name: 'like-button' });
  const share = button('b', { name: 'share-button' });
  assert.notEqual(reuseKey('single', like), reuseKey('single', share));
  assert.equal(reuseKey('single', button('c', { name: 'Like  Button ' })), reuseKey('single', button('d', { name: 'like button' })));
  assert.equal(reuseNameKey(' Card  (Large) '), 'card (large)');
  assert.match(reuseKey('variant', like), /^variant:like-button:/);
});

test('reusePlanFor — 단독 · 접힘(마스터 키) · 세트(멤버마다) · heading 접힘은 제외', () => {
  const one = reusePlanFor([button('a')]);
  assert.equal(one.kind, 'single');
  const coll = reusePlanFor([button('a', { label: 'Like' }), button('b', { label: 'Save' })]);
  assert.equal(coll.kind, 'collapse');
  assert.equal(coll.keys.length, 1);
  assert.match(coll.keys[0], /^collapse:/);
  const set = reusePlanFor([button('a', { fill: '#111111' }), button('b', { fill: '#222222' })]);
  assert.equal(set.kind, 'variant');
  assert.equal(set.keys.length, 2);
  // heading 접힘 그룹(액션 유무만 다름) — 재사용하지 않는다
  const txt = (id, name = 'Label') => ({ id, name, type: 'TEXT', characters: name });
  const num = { id: 'num', name: 'Num', type: 'FRAME', layoutMode: 'HORIZONTAL', width: 80, height: 24, children: [txt('nl', 'Label'), txt('c1', 'count'), txt('c2', 'count')] };
  const h1 = { id: 'h1', name: 'heading', type: 'FRAME', layoutMode: 'HORIZONTAL', width: 800, height: 40, children: [txt('t1'), num] };
  const h2 = { id: 'h2', name: 'heading', type: 'FRAME', layoutMode: 'HORIZONTAL', width: 800, height: 40, children: [txt('t2'), { id: 'bg', name: 'buttonGroup', type: 'INSTANCE' }, { ...num, id: 'num2' }] };
  assert.equal(isHeadingCollapseGroup([h1, h2]), true);
  assert.equal(reusePlanFor([h1, h2]), null);
  assert.equal(reusePlanFor([h1]).kind, 'single', 'heading이어도 단독은 다른 그룹과 같다');
});

/* ---------- 키 맞추기 (3번) ---------- */

test('matchReuse — 정확히 하나일 때만, 세트는 모두 같은 세트', () => {
  const plan = { kind: 'single', keys: ['single:x:1'] };
  assert.deepEqual(matchReuse(plan, [{ id: 'c1', key: 'single:x:1', setId: null }], 1), { ids: ['c1'], keepKey: true });
  assert.deepEqual(matchReuse(plan, [], 1), { ids: null, keepKey: true }, '후보 없음 — 새로 만들고 키를 남긴다');
  assert.deepEqual(matchReuse(plan, [{ id: 'c1', key: 'single:x:1', setId: null }, { id: 'c2', key: 'single:x:1', setId: null }], 1), { ids: null, keepKey: false }, '둘 이상(복제) — 키를 남기지 않는다');
  const coll = { kind: 'collapse', keys: ['collapse:x:1'] };
  assert.deepEqual(matchReuse(coll, [{ id: 'm', key: 'collapse:x:1', setId: null }], 3).ids, ['m', 'm', 'm']);
  assert.equal(matchReuse(coll, [{ id: 'm', key: 'single:x:1', setId: null }], 3).ids, null, '종류가 다르면 새로 만든다');
  const v = { kind: 'variant', keys: ['variant:x:1', 'variant:x:2'] };
  const vs = [
    { id: 'v1', key: 'variant:x:1', setId: 'S' },
    { id: 'v2', key: 'variant:x:2', setId: 'S' },
    { id: 'v3', key: 'variant:x:3', setId: 'S' }, // 사용자가 더한 변형 — 멤버가 일부여도 된다
  ];
  assert.deepEqual(matchReuse(v, vs, 2).ids, ['v1', 'v2']);
  assert.equal(matchReuse(v, [vs[0], { ...vs[1], setId: 'T' }], 2).ids, null, '다른 세트');
  assert.equal(matchReuse(v, [vs[0]], 2).ids, null, '한 멤버라도 없으면');
  assert.equal(matchReuse(v, [{ ...vs[0], setId: null }, { ...vs[1], setId: null }], 2).ids, null, '세트 밖 변형');
});

test('matchReuse — "정확히 하나"는 짝 맞추기를 통과한 후보 중에서 센다', () => {
  const plan = { kind: 'single', keys: ['single:card:1'] };
  // 옛 Card(사용자가 고쳐 구조가 바뀜 — 통과 못 함) + Card2(지난번 새로 만든 것 — 통과)
  const comps = [{ id: 'Card', key: 'single:card:1', setId: null }, { id: 'Card2', key: 'single:card:1', setId: null }];
  assert.deepEqual(matchReuse(plan, comps, 1, (k, id) => id === 'Card2'), { ids: ['Card2'], keepKey: true });
  // 통과 0 → 새로 만들고 키를 남긴다(다음엔 통과하는 새 것 하나)
  assert.deepEqual(matchReuse(plan, comps, 1, () => false), { ids: null, keepKey: true });
  // 통과 2개 → 재사용하지 않고 키도 남기지 않는다
  assert.deepEqual(matchReuse(plan, comps, 1, () => true), { ids: null, keepKey: false });
  // 접힘: 모든 멤버와 짝이 맞아야 그 후보를 센다
  const coll = { kind: 'collapse', keys: ['collapse:x:1'] };
  assert.deepEqual(matchReuse(coll, [{ id: 'm', key: 'collapse:x:1', setId: null }], 2, (k) => k === 0), { ids: null, keepKey: true });
  // 세트: 멤버마다 통과 후보를 센다 — 한 멤버라도 둘 이상이면 키를 남기지 않는다
  const v = { kind: 'variant', keys: ['variant:x:1', 'variant:x:2'] };
  const vs = [
    { id: 'old1', key: 'variant:x:1', setId: 'S' }, { id: 'old2', key: 'variant:x:2', setId: 'S' },
    { id: 'new1', key: 'variant:x:1', setId: 'T' }, { id: 'new2', key: 'variant:x:2', setId: 'T' },
  ];
  assert.deepEqual(matchReuse(v, vs, 2, (k, id) => id.startsWith('new')), { ids: ['new1', 'new2'], keepKey: true });
  assert.deepEqual(matchReuse(v, vs, 2, (k, id) => k === 0 || id === 'new2'), { ids: null, keepKey: false });
});

/* ---------- 짝 맞추기 검사 (3번) ---------- */

test('reusePairIssue — 자식 구성 · 한쪽만 인스턴스 · 날 벡터 그림', () => {
  const comp = (kids) => ({ id: 'B', name: 'Card', type: 'COMPONENT', children: kids });
  const A = { id: 'A', name: 'Card', type: 'FRAME', children: [text('a1', 't', 'x'), { id: 'a2', name: 'badge', type: 'FRAME', children: [] }, vec('a3', 'k1')] };
  // 기존: 배지가 이미 인스턴스(1회차 안쪽 그룹) — A의 배지는 이번 [등록]의 다른 그룹 멤버라 인스턴스로 본다
  const B = comp([text('b1', 't', 'y'), { id: 'b2', name: 'Badge', type: 'INSTANCE' }, vec('b3', 'k1')]);
  assert.equal(reusePairIssue(A, B, new Set(['a2'])), null);
  assert.equal(reusePairIssue(A, B, new Set()), '1', '안쪽 그룹이 인스턴스가 되지 못하면 걸린다(바꾸기 직전 다시 맞추기)');
  // 자식 수 · 타입
  assert.equal(reusePairIssue(A, comp([text('b1', 't', 'y'), { id: 'b2', type: 'INSTANCE', name: 'B' }]), new Set(['a2'])), '/');
  assert.equal(reusePairIssue(A, comp([vec('bx', 'k1'), { id: 'b2', type: 'INSTANCE', name: 'B' }, vec('b3', 'k1')]), new Set(['a2'])), '0');
  // 날 벡터 그림이 다르면 걸린다(인스턴스 안 날 벡터는 고칠 수 없다)
  assert.equal(reusePairIssue(A, comp([text('b1', 't', 'y'), { id: 'b2', type: 'INSTANCE', name: 'B' }, vec('b3', 'k2')]), new Set(['a2'])), '2');
  // 예외: A 날 벡터 ↔ B 아이콘 컴포넌트의 인스턴스(1회차 접힘의 아이콘 자리 교체)
  const Bicon = comp([text('b1', 't', 'y'), { id: 'b2', type: 'INSTANCE', name: 'B' }, { id: 'b3', type: 'INSTANCE', name: 'icon' }]);
  assert.equal(reusePairIssue(A, Bicon, new Set(['a2']), new Set(['b3'])), null);
  assert.equal(reusePairIssue(A, Bicon, new Set(['a2']), new Set()), '2', '아이콘이 아닌 인스턴스면 걸린다');
});

/* ---------- 값 옮기기 · 비동기 바꾸기 (5번) — 목 ---------- */

/** 목 트리. 컴포넌트는 make()로 자식을 새로 만든다. 인스턴스의 setProperties는 묶인 레이어(자기 레이어)를 찾아 값을 넣는다. */
function world() {
  let seq = 0;
  const comps = new Map();
  const parentize = (n) => { for (const c of n.children ?? []) { c.parent = n; parentize(c); } return n; };
  const node = (type, name, props = {}, children) => {
    const n = { id: `${type[0]}${seq++}`, type, name, visible: true, removed: false, parent: null, componentPropertyReferences: null, width: 10, height: 10, ...props };
    if (children) { n.children = children; parentize(n); }
    n.remove = function () {
      this.removed = true;
      const p = this.parent;
      if (p?.children) p.children.splice(p.children.indexOf(this), 1);
      this.parent = null;
    };
    return n;
  };
  const txt = (name, chars, refs = null) => {
    const n = node('TEXT', name, { _c: chars, fontName: { family: 'Inter', style: 'Bold' }, componentPropertyReferences: refs });
    Object.defineProperty(n, 'characters', { get() { return this._c; }, set(v) { if (!this.loaded) throw new Error('font not loaded'); this._c = v; }, enumerable: true });
    n.getRangeAllFontNames = () => [n.fontName];
    return n;
  };
  const comp = (id, make) => { const c = { id, type: 'COMPONENT', name: id, make }; comps.set(id, c); return c; };
  const ownLayers = (n, out = []) => { for (const c of n.children ?? []) { out.push(c); if (c.type !== 'INSTANCE') ownLayers(c, out); } return out; };
  const inst = (name, main, refs = null) => {
    const i = node('INSTANCE', name, { _main: main, componentPropertyReferences: refs, calls: [] }, main.make());
    i.swapComponent = function (c) { this._main = c; this.children = c.make(); parentize(this); };
    i.setProperties = function (p) {
      this.calls.push(p);
      for (const [k, v] of Object.entries(p)) {
        const target = ownLayers(this).find((l) => l.componentPropertyReferences && Object.values(l.componentPropertyReferences).includes(k));
        if (!target) throw new Error(`no prop ${k}`);
        const field = Object.keys(target.componentPropertyReferences).find((f) => target.componentPropertyReferences[f] === k);
        if (field === 'mainComponent') target.swapComponent(comps.get(v));
        else if (field === 'characters') target.characters = v;
        else target[field] = v;
      }
    };
    return i;
  };
  return { node, txt, comp, inst, comps, mainOf: async (n) => n._main };
}

test('재사용 — 배지 01 · 02 · 03이 든 카드: 재사용 인스턴스에서 배지가 각자 제 것(메인 · 글자)', async () => {
  const w = world();
  const fontLoaded = [];
  // 이번 [등록]이 먼저 만든 안쪽 배지 세트(변형 01 · 02 · 03) — 안쪽 그룹을 먼저 처리했다(4번)
  const badge = ['01', '02', '03'].map((c) => w.comp(`badge-${c}`, () => [w.txt('Label', c)]));
  // 1회차 카드 컴포넌트: 제목은 Title 속성, 배지는 인스턴스 바꾸기 속성(기본 01)
  const card = w.comp('card', () => [w.txt('Title', 'Book & relax', { characters: 'Title#1:1' }), w.inst('Badge', badge[0], { mainComponent: 'Badge#1:9' })]);
  // 지금 멤버: 카드 3장 — 안쪽 배지는 이미 이번 세트의 인스턴스, 셋째 배지는 글자를 직접 덮어썼다
  const members = [0, 1, 2].map((k) => w.node('FRAME', 'Card', {}, [w.txt('Title', `Card ${k + 1}`), w.inst('Badge', badge[k])]));
  members[2].children[1].children[0]._c = '03★';
  const results = [];
  for (const m of members) {
    const b = w.inst('Card', card);
    const texts = [];
    const collect = (n) => { if (n.type === 'TEXT') texts.push(n); for (const c of n.children ?? []) collect(c); };
    const failed = await copyOverridesAsync(m, b, '', {
      mainOf: w.mainOf,
      loadFont: async (f) => { fontLoaded.push(f.style); collect(b); for (const t of texts) t.loaded = true; },
      iconFor: () => null,
    });
    assert.deepEqual(failed, []);
    results.push(b);
  }
  assert.deepEqual(results.map((b) => b.children[0].characters), ['Card 1', 'Card 2', 'Card 3'], '제목은 조상(카드) 인스턴스의 속성으로');
  assert.deepEqual(results.map((b) => b.children[1]._main.id), ['badge-01', 'badge-02', 'badge-03'], '배지 메인은 카드의 인스턴스 바꾸기 속성으로');
  assert.deepEqual(results.map((b) => b.children[1].children[0].characters), ['01', '02', '03★'], '안으로 내려가 직접 덮어쓴 글자까지');
  assert.deepEqual(results[0].calls, [{ 'Title#1:1': 'Card 1' }], '배지 01은 이미 같은 메인 — 바꾸지 않는다');
  assert.deepEqual(results[1].calls, [{ 'Title#1:1': 'Card 2' }, { 'Badge#1:9': 'badge-02' }]);
  assert.ok(fontLoaded.length >= 4, '글자를 넣기 전에 B 쪽 글꼴을 불러온다');
});

test('재사용 — 보이기 · 사진 · 아이콘(날 벡터 ↔ 아이콘 인스턴스) · 못 넣은 값', async () => {
  const w = world();
  const heart = w.comp('icon-heart', () => [w.node('VECTOR', 'Vector')]);
  const star = w.comp('icon-star', () => [w.node('VECTOR', 'Vector')]);
  const master = w.comp('chip', () => [
    w.inst('icon', heart, { mainComponent: 'Icon#2:1' }),
    w.node('RECTANGLE', 'photo', { fills: [{ type: 'IMAGE', imageHash: 'h1', visible: true }] }),
    w.node('FRAME', 'dot?', { componentPropertyReferences: { visible: 'Dot#2:2' } }, []),
    w.txt('Lock', 'x'),
  ]);
  const A = w.node('FRAME', 'Chip', {}, [
    w.node('VECTOR', 'icon-star'),
    w.node('RECTANGLE', 'photo', { fills: [{ type: 'IMAGE', imageHash: 'h2', visible: true }] }),
    w.node('FRAME', 'dot?', { visible: false }, []),
    w.txt('Lock', 'y'),
  ]);
  const B = w.inst('Chip', master);
  const failed = await copyOverridesAsync(A, B, '', {
    mainOf: w.mainOf,
    loadFont: async () => { throw new Error('no font'); },
    iconFor: (v) => (v.name === 'icon-star' ? star : null),
  });
  assert.equal(B.children[0]._main.id, 'icon-star', 'A 그림의 아이콘으로');
  assert.equal(B.children[1].fills[0].imageHash, 'h2', '사진은 채움 전체를 옮긴다');
  assert.equal(B.children[2].visible, false, '묶인 보이기는 속성으로');
  assert.deepEqual(failed, ['Lock'], '글꼴을 못 불러온 글자는 못 넣은 것으로');
  assert.equal(B.children[3].characters, 'x');
});

test('replaceMemberAsync — 기다린 인스턴스를 멤버 자리에(같은 순서), 멤버는 지운다 · 만들기 실패면 원본 그대로', async () => {
  const w = world();
  const mk = (name) => w.node('FRAME', name, { x: 0, y: 0, width: 50, height: 20, resize(a, b) { this.width = a; this.height = b; } });
  const a = mk('A'); const m = mk('M'); const z = mk('Z');
  const row = w.node('FRAME', 'Row', { layoutMode: 'NONE' }, [a, m, z]);
  row.insertChild = function (i, c) { if (c.parent?.children) c.parent.children.splice(c.parent.children.indexOf(c), 1); c.parent = this; this.children.splice(i, 0, c); };
  row.appendChild = function (c) { this.insertChild(this.children.length, c); };
  const inst = mk('I'); inst.type = 'INSTANCE'; inst.width = 40;
  const r = await replaceMemberAsync(m, async () => { await Promise.resolve(); return inst; }, '');
  assert.equal(r.result, 'replaced');
  assert.deepEqual(row.children.map((c) => c.name), ['A', 'I', 'Z']);
  assert.equal(inst.width, 50, '멤버 크기로');
  assert.equal(m.removed, true);
  const r2 = await replaceMemberAsync(z, async () => { throw new Error('boom'); }, '');
  assert.equal(r2.result, 'placeFailed');
  assert.deepEqual(row.children.map((c) => c.name), ['A', 'I', 'Z']);
});

/* ---------- 아이콘 등록부 (2번) ---------- */

test('createIconRegistry — 문서의 같은 dsl.icon 아이콘을 먼저 쓰고, 새로 만든 것에는 dsl.icon을 남긴다', () => {
  const data = new Map();
  const page = { children: [], appendChild(c) { this.children.push(c); c.parent = this; } };
  globalThis.figma = {
    createComponentFromNode(n) {
      n.type = 'COMPONENT';
      n.setPluginData = (k, v) => data.set(`${n.id}:${k}`, v);
      return n;
    },
  };
  const old = { id: 'old', type: 'COMPONENT', name: 'IconHeart', removed: false };
  const placed = [];
  const reg = createIconRegistry({
    page,
    place: (c) => placed.push(c),
    uniqueName: (b) => b,
    onFailure: () => {},
    existing: (k) => (k === 'heart' ? old : null),
  });
  const vector = (id) => ({ id, type: 'VECTOR', name: 'icon', clone() { return { id: `${id}-c`, type: 'VECTOR', name: 'icon' }; } });
  assert.equal(reg.ensure('heart', vector('v1'), 'Icon'), old);
  assert.equal(reg.get('heart'), old);
  const made = reg.ensure('star', vector('v2'), 'Icon');
  assert.notEqual(made, old);
  assert.equal(reg.created(), 1, '새로 만든 아이콘만 센다');
  assert.equal(data.get('v2-c:dsl.icon'), 'star');
  assert.deepEqual(placed, [made]);
  delete globalThis.figma;
});

test('createIconRegistry.discard — 이번에 만든 아이콘만 지우고 등록부 · 만든 수에서 뺀다(재사용 멤버가 원본으로 남을 때)', () => {
  const page = { children: [], appendChild(c) { this.children.push(c); c.parent = this; } };
  globalThis.figma = {
    createComponentFromNode(n) {
      n.type = 'COMPONENT';
      n.removed = false;
      n.setPluginData = () => {};
      n.remove = function () { this.removed = true; page.children.splice(page.children.indexOf(this), 1); };
      return n;
    },
  };
  const old = { id: 'old', type: 'COMPONENT', name: 'IconHeart', removed: false, remove() { this.removed = true; } };
  const reg = createIconRegistry({ page, place: () => {}, uniqueName: (b) => b, onFailure: () => {}, existing: (k) => (k === 'heart' ? old : null) });
  const vector = (id) => ({ id, type: 'VECTOR', name: 'icon', clone() { return { id: `${id}-c`, type: 'VECTOR', name: 'icon' }; } });
  const star = reg.ensure('star', vector('v1'), 'Icon'); // 실패할 멤버를 위해 새로 만든 아이콘
  const bolt = reg.ensure('bolt', vector('v2'), 'Icon'); // 다른 멤버가 쓰는 아이콘
  reg.ensure('heart', vector('v3'), 'Icon'); // 문서에 있던 아이콘
  assert.equal(reg.created(), 2);
  assert.equal(reg.discard('star'), true);
  assert.equal(star.removed, true);
  assert.equal(reg.get('star'), null, '등록부에서 빠진다');
  assert.equal(reg.created(), 1, '결과 줄 "아이콘 n"에서도 빠진다');
  assert.equal(reg.discard('heart'), false, '문서에 있던 아이콘은 지우지 않는다');
  assert.equal(old.removed, false);
  assert.equal(bolt.removed, false);
  assert.deepEqual(page.children, [bolt]);
  // 다시 필요하면 새로 만든다
  assert.notEqual(reg.ensure('star', vector('v4'), 'Icon'), star);
  assert.equal(reg.created(), 2);
  delete globalThis.figma;
});
