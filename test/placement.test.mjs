/* 인스턴스 자리 잡기 테스트 (IA v3 §4.7 "인스턴스 자리", QA #3 불합격 3).
   `npm test`가 build 후 dist/figma-lib.mjs를 불러온다.

   목은 피그마의 두 동작을 흉내 낸다 — 이게 QA #3 실패의 원인이었다.
   1. 자식이 0개가 된 GROUP은 바로 지워진다(remove로 빠지든, 다른 부모로 옮겨지든).
   2. GROUP 자식의 x·y는 그룹 밖 가장 가까운 프레임 기준이다. createInstance()는 현재 페이지 맨 위(0,0)에 놓는다.
   실제 피그마가 아니라 목이다 — 실기 확인은 부록 A.5의 마지막 항목. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { captureOrigin, placeAtOrigin, releaseOrigin, fillOrigin, componentizeSimilar, swapVectorSlots, componentizeResultMessage, applyInstancePropValues, propIdsByName, tallyFill } from '../dist/figma-lib.mjs';

let seq = 0;
const SELF_DELETING = new Set(['GROUP', 'BOOLEAN_OPERATION']);

function detach(n) {
  const p = n.parent;
  if (!p || !p.children) return;
  const j = p.children.indexOf(n);
  if (j >= 0) p.children.splice(j, 1);
  n.parent = null;
  // 피그마: 빈 그룹은 스스로 지워진다.
  if (SELF_DELETING.has(p.type) && p.children.length === 0) p.remove();
}

/** 좌표 기준 부모 — 그룹은 좌표계를 만들지 않으므로 건너뛴다. */
function coordParent(n) {
  let p = n.parent;
  while (p && SELF_DELETING.has(p.type)) p = p.parent;
  return p;
}

function mk(type, props = {}, kids) {
  const n = {
    id: `${type.toLowerCase()}:${seq++}`, type, name: props.name ?? type, x: 0, y: 0, width: 10, height: 10,
    parent: null, removed: false, ...props,
    remove() {
      if (this.removed) return;
      // 피그마: 지운 노드의 자손도 모두 removed
      const mark = (x) => { x.removed = true; for (const c of x.children ?? []) mark(c); };
      mark(this);
      detach(this);
    },
  };
  Object.defineProperty(n, 'absoluteTransform', {
    get() {
      const cp = coordParent(this);
      const base = cp && cp.type !== 'PAGE' ? cp.absoluteTransform : [[1, 0, 0], [0, 1, 0]];
      return [[1, 0, base[0][2] + this.x], [0, 1, base[1][2] + this.y]];
    },
  });
  if (kids) {
    n.children = [];
    n.insertChild = function (i, c) {
      if (this.removed) throw new Error(`The node with id "${this.id}" does not exist`);
      detach(c);
      c.parent = this;
      this.children.splice(Math.min(i, this.children.length), 0, c);
    };
    n.appendChild = function (c) { this.insertChild(this.children.length, c); };
    for (const c of kids) n.appendChild(c);
  }
  return n;
}

function count(n) {
  return 1 + (n.children ?? []).reduce((s, c) => s + count(c), 0);
}
function all(n, out = []) {
  out.push(n);
  for (const c of n.children ?? []) all(c, out);
  return out;
}
const absXY = (n) => [n.absoluteTransform[0][2], n.absoluteTransform[1][2]];

/** 전역 figma 목 — 컴포넌트화는 노드를 그 자리에서 컴포넌트로 바꾼다(피그마와 같게). */
function installFigma(page) {
  seq = 0;
  const created = [];
  globalThis.figma = {
    currentPage: page,
    createRectangle() {
      const r = mk('RECTANGLE', { fills: [{ type: 'SOLID' }], strokes: [], resize(w, h) { this.width = w; this.height = h; } });
      page.appendChild(r);
      return r;
    },
    createComponentFromNode(node) {
      node.type = 'COMPONENT';
      node.props = [];
      node.addComponentProperty = function (pname, ptype, def) { const id = `${pname}#${seq++}`; this.props.push({ id, pname, ptype, def }); return id; };
      node.createInstance = function () {
        const clone = (c) => {
          const o = mk(c.type, { name: c.name, x: c.x, y: c.y, width: c.width, height: c.height, characters: c.characters, componentPropertyReferences: {} });
          if (c.children) { o.children = c.children.map(clone); for (const k of o.children) k.parent = o; }
          return o;
        };
        const i = mk('INSTANCE', {
          name: this.name, width: this.width, height: this.height, applied: {}, mainId: this.id,
          constraints: { horizontal: 'MIN', vertical: 'MIN' },
          resize(w, h) { this.width = w; this.height = h; },
          setProperties(p) { Object.assign(this.applied, p); },
          // 피그마: 떼어 내면 같은 자리의 보통 프레임이 된다(목은 그 자리에서 종류만 바꾼다).
          detachInstance() { this.type = 'FRAME'; return this; },
        });
        if (this.children) { i.children = this.children.map(clone); for (const k of i.children) k.parent = i; }
        page.appendChild(i); // 피그마: 새 인스턴스는 현재 페이지 맨 위(0,0)
        created.push(i);
        return i;
      };
      return node;
    },
    _created: created,
  };
  return globalThis.figma;
}

/** QA #3 파일의 아이콘 모양: Card(FRAME) > icon(FRAME) > GROUP > VECTOR×3. */
function iconFixture() {
  const page = mk('PAGE', { name: 'Page 1' }, []);
  const v = [
    mk('VECTOR', { name: 'Vector', x: 12, y: 12, width: 8, height: 8 }),
    mk('VECTOR', { name: 'Vector', x: 14, y: 16, width: 4, height: 4 }),
    mk('VECTOR', { name: 'Vector', x: 18, y: 12, width: 2, height: 9 }),
  ];
  const group = mk('GROUP', { name: 'Group', x: 12, y: 12, width: 8, height: 9 }, v);
  const icon = mk('FRAME', { name: 'tabler:world', x: 20, y: 30, width: 32, height: 32 }, [group]);
  const card = mk('FRAME', { name: 'Card', x: 100, y: 200, width: 300, height: 120 }, [icon]);
  page.appendChild(card);
  return { page, card, icon, group, v };
}

/**
 * [등록]과 같은 순서를 밟는다: 자리 기록 → 컴포넌트화(그 자리에서) → Components 페이지로 이동 →
 * 인스턴스 만들기(페이지 맨 위) → 원래 자리로.
 */
function registerLike(nodes, componentsPage, { capture = true } = {}) {
  const origins = [];
  const comps = [];
  for (const n of nodes) {
    origins.push(capture ? captureOrigin(n) : null);
    comps.push(figma.createComponentFromNode(n));
  }
  for (const c of comps) componentsPage.appendChild(c); // 세트 결합 · placeOnPage
  return comps.map((c, i) => {
    const inst = c.createInstance();
    return { inst, ok: origins[i] ? placeAtOrigin(inst, origins[i]) : false, origin: origins[i] };
  });
}

test('목 확인 — 표지 없이 그룹의 벡터를 모두 옮기면 그룹이 지워진다(QA #3 재현)', () => {
  const { page, icon, group, v } = iconFixture();
  installFigma(page);
  const componentsPage = mk('PAGE', { name: 'Components' }, []);
  registerLike(v, componentsPage, { capture: false });
  assert.equal(group.removed, true, '빈 그룹이 지워져야 재현된다');
  assert.equal(icon.children.length, 0);
  // 예전 코드: 옮기지 못한 인스턴스가 createInstance() 자리(페이지 맨 위)에 남는다
  assert.equal(page.children.filter((n) => n.type === 'INSTANCE').length, 3);
});

test('자리 잡기 — FRAME > GROUP > VECTOR×3을 등록 순서로 바꿔도 그룹·순서·위치가 그대로', () => {
  const { page, card, icon, group, v } = iconFixture();
  installFigma(page);
  const componentsPage = mk('PAGE', { name: 'Components' }, []);
  const before = { root: page.children.length, nodes: count(page), xy: v.map((n) => [n.x, n.y]), abs: v.map(absXY) };

  const placed = registerLike(v, componentsPage);

  assert.ok(placed.every((p) => p.ok), '모두 제자리에 들어가야 한다');
  assert.equal(group.removed, false, '그룹이 지워지면 안 된다');
  assert.equal(group.parent, icon, '그룹은 아이콘 프레임 안에 그대로');
  assert.deepEqual(group.children.map((n) => n.type), ['INSTANCE', 'INSTANCE', 'INSTANCE'], '표지가 남지 않고 인스턴스 3개');
  assert.deepEqual(group.children, placed.map((p) => p.inst), '원래 순서 그대로');
  assert.deepEqual(group.children.map((n) => [n.x, n.y]), before.xy, '같은 x·y');
  assert.deepEqual(group.children.map(absXY), before.abs, '같은 절대 위치');
  assert.deepEqual(page.children, [card], '페이지 맨 위에는 원래 프레임만');
  assert.equal(page.children.length, before.root, '페이지 맨 위 자식 수 그대로');
  assert.equal(count(page), before.nodes, '노드 수 그대로(벡터 3 → 인스턴스 3)');
  assert.equal(all(page).filter((n) => n.name === '__dsl_anchor').length, 0, '표지 0');
});

test('자리 잡기 — 그룹 안 일부만 바꿔도(다른 형제가 남음) 위치 그대로, 표지 없음', () => {
  const { page, group, v } = iconFixture();
  installFigma(page);
  const componentsPage = mk('PAGE', { name: 'Components' }, []);
  const [p] = registerLike([v[1]], componentsPage);
  assert.equal(p.ok, true);
  assert.deepEqual(group.children.map((n) => n.type), ['VECTOR', 'INSTANCE', 'VECTOR']);
  assert.deepEqual([p.inst.x, p.inst.y], [14, 16]);
  assert.equal(all(page).filter((n) => n.name === '__dsl_anchor').length, 0);
});

test('자리 잡기 — FRAME > VECTOR 직속도 그대로 동작', () => {
  const page = mk('PAGE', {}, []);
  const vec = mk('VECTOR', { name: 'Vector', x: 4, y: 6, width: 16, height: 16 });
  const icon = mk('FRAME', { name: 'octicon:people-16', x: 50, y: 60, width: 24, height: 24 }, [vec]);
  page.appendChild(icon);
  installFigma(page);
  const componentsPage = mk('PAGE', {}, []);
  const [p] = registerLike([vec], componentsPage);
  assert.equal(p.ok, true);
  assert.deepEqual(icon.children, [p.inst]);
  assert.deepEqual([p.inst.x, p.inst.y], [4, 6]);
  assert.deepEqual(absXY(p.inst), [54, 66]);
  assert.deepEqual(page.children, [icon]);
});

test('자리 잡기 — 부모가 사라지면 인스턴스를 지우고 페이지 맨 위에 남기지 않는다', () => {
  const { page, card, icon, v } = iconFixture();
  installFigma(page);
  const o = captureOrigin(v[0]);
  icon.remove(); // 그 사이 부모째 사라짐(플러그인 밖 조작 등)
  const comp = figma.createComponentFromNode(v[0]);
  const inst = comp.createInstance();
  assert.equal(placeAtOrigin(inst, o), false);
  assert.equal(inst.removed, true, '못 둔 인스턴스는 지운다');
  assert.deepEqual(page.children, [card], '페이지 맨 위에 인스턴스·표지가 없다');
  assert.equal(o.anchor, null);
});

test('자리 잡기 — releaseOrigin은 표지만 치우고 원본은 그대로(컴포넌트화 실패 경로)', () => {
  const { page, group, v } = iconFixture();
  installFigma(page);
  const o = captureOrigin(v[2]);
  assert.equal(group.children.length, 4, '표지가 원본 앞에 들어간다');
  assert.equal(group.children[2].name, '__dsl_anchor');
  releaseOrigin(o);
  releaseOrigin(o); // 두 번 불러도 된다
  assert.deepEqual(group.children, v);
});

test('자리 잡기 — 오토레이아웃 부모는 x·y를 쓰지 않고, 절대 배치 자식은 절대 배치 + x·y', () => {
  const page = mk('PAGE', {}, []);
  const a = mk('FRAME', { name: 'A', x: 0, y: 0 });
  const b = mk('FRAME', { name: 'B', x: 5, y: 7, layoutPositioning: 'ABSOLUTE' });
  const list = mk('FRAME', { name: 'List', layoutMode: 'VERTICAL' }, [a, b]);
  page.appendChild(list);
  installFigma(page);
  const oa = captureOrigin(a);
  const ob = captureOrigin(b);
  const ia = figma.createComponentFromNode(mk('FRAME')).createInstance();
  const ib = figma.createComponentFromNode(mk('FRAME')).createInstance();
  ib.layoutPositioning = 'AUTO';
  a.remove();
  b.remove();
  assert.equal(placeAtOrigin(ia, oa), true);
  assert.equal(placeAtOrigin(ib, ob), true);
  assert.deepEqual(list.children, [ia, ib]);
  assert.deepEqual([ia.x, ia.y], [0, 0], '레이아웃이 정한다');
  assert.equal(ib.layoutPositioning, 'ABSOLUTE');
  assert.deepEqual([ib.x, ib.y], [5, 7]);
});

test('묶기 — 그룹 안 닮은 프레임: 인스턴스가 같은 그룹·같은 자리, 그룹·페이지 맨 위 그대로', async () => {
  const page = mk('PAGE', {}, []);
  const txt = (name, characters) => mk('TEXT', { name, characters, componentPropertyReferences: {} });
  const A = mk('FRAME', { name: 'Card', x: 10, y: 20, width: 100, height: 80 }, [txt('Title', 'A'), txt('Desc', 'same')]);
  const B = mk('FRAME', { name: 'Card', x: 130, y: 20, width: 100, height: 80 }, [txt('Title', 'B'), txt('Desc', 'same')]);
  const group = mk('GROUP', { name: 'Cards', x: 10, y: 20 }, [A, B]);
  const screen = mk('FRAME', { name: 'Screen', x: 500, y: 0, width: 400, height: 400 }, [group]);
  page.appendChild(screen);
  installFigma(page);
  const before = { nodes: count(page), absB: absXY(B) };

  const r = await componentizeSimilar(A, [A, B]);

  assert.equal(r.instances, 1);
  assert.deepEqual(r.placeFailed, []);
  assert.equal(B.removed, true);
  assert.equal(group.removed, false, '그룹이 남아야 한다');
  const inst = figma._created[0];
  assert.deepEqual(group.children, [A, inst], '마스터 그 자리 + B 자리에 인스턴스');
  assert.deepEqual([inst.x, inst.y], [130, 20]);
  assert.deepEqual(absXY(inst), before.absB);
  assert.deepEqual(page.children, [screen], '페이지 맨 위 그대로');
  assert.equal(count(page), before.nodes, '노드 수 그대로');
});

test('묶기 — 넣기 실패면 인스턴스를 지우고 원본을 그대로 둔다(페이지 맨 위 대체 없음)', async () => {
  const page = mk('PAGE', {}, []);
  const txt = (name, characters) => mk('TEXT', { name, characters, componentPropertyReferences: {} });
  const A = mk('FRAME', { name: 'Card', x: 0, y: 0 }, [txt('Title', 'A')]);
  const B = mk('FRAME', { name: 'Other', x: 50, y: 0 }, [txt('Title', 'B')]);
  const box = mk('FRAME', { name: 'Box' }, [A, B]);
  page.appendChild(box);
  installFigma(page);
  box.insertChild = () => { throw new Error('잠긴 부모'); }; // 넣기 실패

  const r = await componentizeSimilar(A, [A, B]);

  assert.equal(r.instances, 0);
  assert.deepEqual(r.placeFailed, ['Other']);
  assert.ok(r.warnings.some((w) => w.startsWith('Other: 제자리')));
  assert.equal(B.removed, false, '원본을 지키기');
  assert.deepEqual(box.children, [A, B]);
  assert.deepEqual(page.children, [box], '페이지 맨 위에 인스턴스가 남지 않는다');
});

/* ---------- 코드 대조 검토 뒤 (2026-11-04) — 실패 경로 · 크기 규칙 · 복사본 ---------- */

const anchors = (root) => all(root).filter((n) => n.name === '__dsl_anchor');

/** 넣기를 거절하는 부모 — types에 든 종류의 자식을 받지 않는다(불리언 연산이 인스턴스를 거절하는 경우 등). */
function rejecting(parent, types) {
  const orig = parent.insertChild;
  parent.insertChild = function (i, c) {
    if (types.includes(c.type)) throw new Error(`${c.type}는 받지 않음`);
    return orig.call(this, i, c);
  };
}

test('표지 — 만든 뒤 그룹에 넣다 실패하면 표지를 지운다(페이지 맨 위에 남기지 않음)', () => {
  const { page, card, group, v } = iconFixture();
  installFigma(page);
  rejecting(group, ['RECTANGLE']);
  const o = captureOrigin(v[0]);
  assert.equal(o.anchor, null);
  assert.deepEqual(page.children, [card], '표지가 페이지 맨 위에 남았다');
  assert.equal(anchors(page).length, 0);
  assert.deepEqual(group.children, v, '그룹은 그대로');
});

test('표지 — 크기·위치를 그룹에 넣기 전에 정한다', () => {
  const { page, group, v } = iconFixture();
  installFigma(page);
  const seen = [];
  const orig = group.insertChild;
  group.insertChild = function (i, c) {
    if (c.type === 'RECTANGLE') seen.push({ x: c.x, y: c.y, w: c.width, h: c.height, fills: c.fills });
    return orig.call(this, i, c);
  };
  const o = captureOrigin(v[2]);
  assert.deepEqual(seen, [{ x: 18, y: 12, w: 2, h: 9, fills: [] }]);
  releaseOrigin(o);
});

test('표지 — [묶기]·아이콘 자리 교체(anchor: false)와 불리언 연산 부모에는 넣지 않는다', () => {
  const { page, group, v } = iconFixture();
  installFigma(page);
  const o = captureOrigin(v[0], { anchor: false });
  assert.equal(o.anchor, null);
  assert.deepEqual(group.children, v);
  const a = mk('VECTOR', { name: 'A', x: 1, y: 1 });
  const b = mk('VECTOR', { name: 'B', x: 3, y: 3 });
  const bool = mk('BOOLEAN_OPERATION', { name: 'Union' }, [a, b]);
  const frame = mk('FRAME', { name: 'F', x: 10, y: 10 }, [bool]);
  page.appendChild(frame);
  const ob = captureOrigin(a);
  assert.equal(ob.anchor, null, '표지 사각형이 불리언 모양에 더해진다');
  assert.deepEqual(bool.children, [a, b]);
});

test('크기 규칙 — FILL·늘이기·맞춤·최소·최대를 이어받고, 거절된 하나만 건너뛴다(D1)', () => {
  const page = mk('PAGE', {}, []);
  const a = mk('FRAME', {
    name: 'A', layoutSizingHorizontal: 'FILL', layoutSizingVertical: 'HUG', layoutGrow: 1, layoutAlign: 'STRETCH',
    minWidth: 40, maxWidth: 400, minHeight: null, maxHeight: 200,
  });
  const list = mk('FRAME', { name: 'List', layoutMode: 'VERTICAL' }, [a]);
  page.appendChild(list);
  installFigma(page);
  const o = captureOrigin(a);
  a.remove();
  const inst = figma.createComponentFromNode(mk('FRAME')).createInstance();
  Object.assign(inst, { layoutSizingHorizontal: 'FIXED', layoutGrow: 0, layoutAlign: 'INHERIT', minWidth: null, maxWidth: null, minHeight: null, maxHeight: null });
  // 오토레이아웃이 아닌 마스터의 인스턴스는 HUG를 받지 않는다(피그마가 던짐)
  let vertical = 'FIXED';
  Object.defineProperty(inst, 'layoutSizingVertical', {
    get: () => vertical,
    set: (val) => { if (val === 'HUG') throw new Error('HUG 불가'); vertical = val; },
    enumerable: true, configurable: true,
  });
  assert.equal(placeAtOrigin(inst, o), true);
  assert.deepEqual(list.children, [inst]);
  assert.equal(inst.layoutSizingHorizontal, 'FILL');
  assert.equal(inst.layoutSizingVertical, 'FIXED', '거절된 HUG는 건너뛴다');
  assert.equal(inst.layoutGrow, 1);
  assert.equal(inst.layoutAlign, 'STRETCH');
  assert.deepEqual([inst.minWidth, inst.maxWidth, inst.minHeight, inst.maxHeight], [40, 400, null, 200], '나머지는 계속 이어받는다');
});

test('제약 — 오토레이아웃 안 절대 배치 자식은 제약도 이어받는다', () => {
  const page = mk('PAGE', {}, []);
  const c = { horizontal: 'MAX', vertical: 'CENTER' };
  const b = mk('FRAME', { name: 'Badge', x: 5, y: 7, layoutPositioning: 'ABSOLUTE', constraints: c });
  const list = mk('FRAME', { name: 'List', layoutMode: 'HORIZONTAL' }, [b]);
  page.appendChild(list);
  installFigma(page);
  const o = captureOrigin(b);
  b.remove();
  const inst = figma.createComponentFromNode(mk('FRAME')).createInstance();
  inst.constraints = { horizontal: 'MIN', vertical: 'MIN' };
  inst.layoutPositioning = 'AUTO';
  assert.equal(placeAtOrigin(inst, o), true);
  assert.equal(inst.layoutPositioning, 'ABSOLUTE');
  assert.deepEqual(inst.constraints, c);
});

test('복사본(D2) — 부모가 인스턴스를 받지 않으면 떼어 낸 보통 프레임으로 같은 자리를 채운다', () => {
  const { page, card, group, v } = iconFixture();
  installFigma(page);
  const componentsPage = mk('PAGE', { name: 'Components' }, []);
  rejecting(group, ['INSTANCE']);
  const before = v.map(absXY);
  const origins = v.map((n) => captureOrigin(n));
  const comps = v.map((n) => figma.createComponentFromNode(n));
  for (const c of comps) componentsPage.appendChild(c);
  const results = comps.map((c, i) => fillOrigin(() => c.createInstance(), origins[i]));
  assert.deepEqual(results, ['copy', 'copy', 'copy']);
  assert.equal(group.removed, false, '복사본을 넣을 때까지 표지가 그룹을 지킨다');
  assert.deepEqual(group.children.map((n) => n.type), ['FRAME', 'FRAME', 'FRAME']);
  assert.deepEqual(group.children.map((n) => n.name), ['Vector', 'Vector', 'Vector'], '이름은 원본 레이어 이름');
  assert.deepEqual(group.children.map(absXY), before, '같은 절대 위치');
  assert.deepEqual(page.children, [card], '페이지 맨 위에 인스턴스·복사본·표지가 없다');
  assert.equal(anchors(page).length, 0);
});

test('복사본(D2) — 프레임도 받지 않으면 하나뿐인 자식(벡터)만 넣는다', () => {
  const page = mk('PAGE', {}, []);
  const a = mk('VECTOR', { name: 'Star', x: 2, y: 3, width: 6, height: 6 });
  const b = mk('VECTOR', { name: 'B', x: 0, y: 0 });
  const bool = mk('BOOLEAN_OPERATION', { name: 'Union' }, [a, b]);
  const frame = mk('FRAME', { name: 'F', x: 10, y: 10 }, [bool]);
  page.appendChild(frame);
  installFigma(page);
  rejecting(bool, ['INSTANCE', 'FRAME']);
  const o = captureOrigin(a);
  // createComponentFromNode(벡터)는 벡터를 감싼 컴포넌트를 만든다 — 목: 벡터 하나를 자식으로 가진 컴포넌트
  const comp = figma.createComponentFromNode(mk('FRAME', { name: 'Star', width: 6, height: 6 }, [mk('VECTOR', { name: 'Vector', width: 6, height: 6 })]));
  a.remove();
  const why = [];
  assert.equal(fillOrigin(() => comp.createInstance(), o, (w) => why.push(w)), 'copy');
  assert.deepEqual(bool.children.map((n) => [n.type, n.name]), [['VECTOR', 'Star'], ['VECTOR', 'B']]);
  assert.deepEqual(absXY(bool.children[0]), [12, 13]);
  assert.deepEqual(page.children, [frame], '꺼내고 남은 프레임도 지운다');
  assert.ok(why.some((w) => w.includes('넣지 못했어요')));
});

test('빈 자리 — 부모가 없어졌으면 인스턴스·복사본 모두 지우고 failed', () => {
  const { page, card, icon, v } = iconFixture();
  installFigma(page);
  const o = captureOrigin(v[0]);
  icon.remove();
  const comp = figma.createComponentFromNode(v[0]);
  assert.equal(fillOrigin(() => comp.createInstance(), o), 'failed');
  assert.deepEqual(page.children, [card], '페이지 맨 위에 아무것도 남지 않는다');
  assert.equal(o.anchor, null);
});

test('빈 자리 — 인스턴스를 만들 수 없으면(make가 던짐) failed, 표지 정리', () => {
  const { page, card, group, v } = iconFixture();
  installFigma(page);
  const o = captureOrigin(v[1]);
  const why = [];
  const r = fillOrigin(() => { throw new Error('잠김'); }, o, (w) => why.push(w));
  assert.equal(r, 'failed');
  assert.ok(why[0].includes('인스턴스를 만들지 못했어요'));
  assert.equal(anchors(page).length, 0);
  assert.deepEqual(group.children, v);
  assert.deepEqual(page.children, [card]);
});

test('아이콘 자리 교체 — 넣기 실패면 인스턴스를 지우고 벡터를 그대로 둔다(페이지 맨 위에 남기지 않음)', () => {
  const page = mk('PAGE', {}, []);
  const vec = mk('VECTOR', { name: 'icon', x: 4, y: 4, width: 16, height: 16 });
  const master = mk('FRAME', { name: 'Button' }, [mk('TEXT', { name: 'Label' }), vec]);
  page.appendChild(master);
  installFigma(page);
  const icon = figma.createComponentFromNode(mk('VECTOR', { name: 'Star' }));
  rejecting(master, ['INSTANCE']);
  const failures = swapVectorSlots(master, [{ layerName: 'icon', layerPath: '1', icon }]);
  assert.equal(failures.length, 1);
  assert.ok(failures[0].startsWith('아이콘 자리 교체 실패(icon)'));
  assert.deepEqual(master.children.map((n) => n.type), ['TEXT', 'VECTOR'], '벡터 그대로');
  assert.deepEqual(page.children, [master], '페이지 맨 위에 인스턴스가 남지 않는다');
});

test('아이콘 자리 교체 — 같은 순서·위치·제약을 이어받고 벡터를 지운다', () => {
  const page = mk('PAGE', {}, []);
  const c = { horizontal: 'CENTER', vertical: 'MAX' };
  const vec = mk('VECTOR', { name: 'icon', x: 4, y: 6, width: 16, height: 16, constraints: c });
  const master = mk('FRAME', { name: 'Button' }, [mk('TEXT', { name: 'Label' }), vec]);
  page.appendChild(master);
  installFigma(page);
  const icon = figma.createComponentFromNode(mk('VECTOR', { name: 'Star' }));
  const failures = swapVectorSlots(master, [{ layerName: 'icon', layerPath: '1', icon }]);
  assert.deepEqual(failures, []);
  const inst = master.children[1];
  assert.equal(inst.type, 'INSTANCE');
  assert.equal(inst.name, 'icon');
  assert.deepEqual([inst.x, inst.y, inst.width, inst.height], [4, 6, 16, 16]);
  assert.deepEqual(inst.constraints, c);
  assert.equal(vec.removed, true);
  assert.equal(anchors(page).length, 0);
  assert.deepEqual(page.children, [master]);
});

/* ---------- 검토 2회차 (2026-11-04) ---------- */

test('[묶기] 결과 메시지 — 결과의 필드를 빠짐없이 싣는다(placeFailed 포함)', async () => {
  const page = mk('PAGE', {}, []);
  const txt = (name, characters) => mk('TEXT', { name, characters, componentPropertyReferences: {} });
  const A = mk('FRAME', { name: 'Card', x: 0, y: 0 }, [txt('Title', 'A')]);
  const B = mk('FRAME', { name: 'Other', x: 50, y: 0 }, [txt('Title', 'B')]);
  const box = mk('FRAME', { name: 'Box' }, [A, B]);
  page.appendChild(box);
  installFigma(page);
  box.insertChild = () => { throw new Error('잠긴 부모'); };
  const r = await componentizeSimilar(A, [A, B]);
  const m = componentizeResultMessage(r);
  assert.equal(m.type, 'COMPONENTIZE_RESULT');
  assert.deepEqual(m.placeFailed, ['Other'], 'placeFailed가 실려야 꼬리·⚠가 동작한다');
  for (const k of Object.keys(r)) assert.ok(k in m, `결과 필드 ${k}가 메시지에 없다`);
  assert.ok(r.warnings.every((w) => !/습니다|합니다/.test(w)), '해요체');
});

test('속성 값 넣기 — 한 번에 실패하면 속성마다, 거절된 이름만 돌려주고 나머지는 넣는다', () => {
  const applied = {};
  const inst = {
    setProperties(p) {
      if ('bad#2' in p) throw new Error('거절');
      Object.assign(applied, p);
    },
  };
  const ids = new Map([['Title', 'title#1'], ['Icon', 'bad#2'], ['Show', 'show#3']]);
  const failed = applyInstancePropValues(inst, ids, { Title: 'B', Icon: 'k', Show: false, Gone: 'x' });
  assert.deepEqual(failed.sort(), ['Gone', 'Icon'], 'id 없는 속성 · 거절된 속성');
  assert.deepEqual(applied, { 'title#1': 'B', 'show#3': false }, '나머지는 넣는다');
  // 모두 받으면 빈 목록
  assert.deepEqual(applyInstancePropValues({ setProperties() {} }, ids, { Title: 'C' }), []);
});

/* ---------- 검토 3회차 (2026-11-04) ---------- */

/** 피그마 실제 모양: 키는 "이름#id"(베리언트는 이름만), 값에는 name이 없다. */
const REAL_DEFS = {
  'Title#12:3': { type: 'TEXT', defaultValue: 'A' },
  'Icon#12:4': { type: 'INSTANCE_SWAP', defaultValue: '1:2' },
  'Show badge#12:5': { type: 'BOOLEAN', defaultValue: true },
  Size: { type: 'VARIANT', defaultValue: 'md', variantOptions: ['sm', 'md'] },
};

test('속성 이름 → id — 정의 키 "이름#id"에서 이름을 뽑는다(값에 name 없음), 베리언트 키는 그대로', () => {
  const ids = propIdsByName({ componentPropertyDefinitions: REAL_DEFS });
  assert.deepEqual([...ids.entries()], [
    ['Title', 'Title#12:3'], ['Icon', 'Icon#12:4'], ['Show badge', 'Show badge#12:5'], ['Size', 'Size'],
  ]);
  assert.equal(propIdsByName({ componentPropertyDefinitions: null }).size, 0);
  assert.equal(propIdsByName({ get componentPropertyDefinitions() { throw new Error('읽기 실패'); } }).size, 0);
});

test('속성 접힘 값 넣기 — 실제 모양 정의에서 모든 값이 이어지고 실패 0', () => {
  const ids = propIdsByName({ componentPropertyDefinitions: REAL_DEFS });
  const applied = {};
  const inst = { setProperties(p) { for (const k of Object.keys(p)) if (!(k in REAL_DEFS)) throw new Error(`없는 속성 ${k}`); Object.assign(applied, p); } };
  const failed = applyInstancePropValues(inst, ids, { Title: 'B', Icon: '9:9', 'Show badge': false });
  assert.deepEqual(failed, [], '예전 코드(def.name)는 Map이 비어 모든 속성이 실패로 잡혔다');
  assert.deepEqual(applied, { 'Title#12:3': 'B', 'Icon#12:4': '9:9', 'Show badge#12:5': false });
});

test('자리 결과 세기 — 빈 자리로 끝난 멤버는 그 자리가 넣은 propFailed 항목만 빼고 placeFailed만', () => {
  const t = { placeCloned: [], placeFailed: [], propFailed: ['Row'] };
  let before = t.propFailed.length;
  tallyFill(t, 'copy', 'Card', before);
  // 빈 자리로 끝난 자리가 속성 실패도 기록했다면 그 항목만 빠진다
  before = t.propFailed.length;
  t.propFailed.push('Card');
  tallyFill(t, 'failed', 'Card', before);
  assert.deepEqual(t.placeCloned, ['Card']);
  assert.deepEqual(t.placeFailed, ['Card']);
  assert.deepEqual(t.propFailed, ['Row']);
});

test('자리 결과 세기 — 같은 이름 두 멤버: 한쪽만 속성 실패, 다른 쪽은 빈 자리면 속성 실패 항목이 남는다', () => {
  const t = { placeCloned: [], placeFailed: [], propFailed: [] };
  // 멤버 1 "Card": 인스턴스는 들어갔지만 속성 값을 못 넣음
  let before = t.propFailed.length;
  t.propFailed.push('Card'); // make()가 기록
  tallyFill(t, 'instance', 'Card', before);
  // 멤버 2 "Card": 속성은 다 넣었지만 빈 자리로 끝남(propFailed에 넣은 것 없음)
  before = t.propFailed.length;
  tallyFill(t, 'failed', 'Card', before);
  assert.deepEqual(t.propFailed, ['Card'], '이름으로 빼면 멤버 1의 항목이 사라진다');
  assert.deepEqual(t.placeFailed, ['Card']);
});
