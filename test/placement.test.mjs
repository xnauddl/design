/* 인스턴스 자리 잡기 테스트 (IA v3 §4.7 "인스턴스 자리", QA #3 불합격 3).
   `npm test`가 build 후 dist/figma-lib.mjs를 불러온다.

   목은 피그마의 두 동작을 흉내 낸다 — 이게 QA #3 실패의 원인이었다.
   1. 자식이 0개가 된 GROUP은 바로 지워진다(remove로 빠지든, 다른 부모로 옮겨지든).
   2. GROUP 자식의 x·y는 그룹 밖 가장 가까운 프레임 기준이다. createInstance()는 현재 페이지 맨 위(0,0)에 놓는다.
   실제 피그마가 아니라 목이다 — 실기 확인은 부록 A.5의 마지막 항목. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { captureOrigin, placeAtOrigin, releaseOrigin, componentizeSimilar } from '../dist/figma-lib.mjs';

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
          resize(w, h) { this.width = w; this.height = h; },
          setProperties(p) { Object.assign(this.applied, p); },
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
