/* 트리 목록(IA v4 §2.7)의 순수 계산 · 용어 통일(§2.4) — `npm test`가 build 후 dist/pure.mjs를 불러온다. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { headState, headToggleTarget, mergeSameNameTokens, buildRenameTree, STRINGS } from '../dist/pure.mjs';

test('headState — 모두 켬 · 일부 · 모두 끔, 잠긴 줄은 빼고 정한다', () => {
  assert.equal(headState([{ on: true }, { on: true }]), true);
  assert.equal(headState([{ on: true }, { on: false }]), 'mixed');
  assert.equal(headState([{ on: false }, { on: false }]), false);
  // 잠긴 줄(직접 만든 변수)은 꺼져 있어도 판정에서 빠진다.
  assert.equal(headState([{ on: true }, { on: false, locked: true }]), true);
  // 바꿀 수 있는 줄이 없으면 null(끔 모습 · 잠금).
  assert.equal(headState([{ on: false, locked: true }]), null);
  assert.equal(headState([]), null);
});

test('headToggleTarget — 켬 · 일부 → 모두 끔, 끔 → 모두 켬', () => {
  assert.equal(headToggleTarget(true), false);
  assert.equal(headToggleTarget('mixed'), false);
  assert.equal(headToggleTarget(false), true);
});

test('mergeSameNameTokens — 같은 이름은 한 토큰: color · sources 합집합 · uses 더함 · count 큰 쪽', () => {
  const out = mergeSameNameTokens([
    { name: 'gray/950', category: 'color', value: '#101828', sources: ['fills'], count: 5, uses: [{ name: 'color/text', count: 3 }] },
    { name: 'spacing/8', category: 'gap', value: 8, sources: ['itemSpacing'], count: 2 },
    { name: 'gray/950', category: 'effectColor', value: '#101828', sources: ['effects'], count: 3, uses: [{ name: 'color/text', count: 2 }, { name: 'color/shadow', count: 1 }] },
  ]);
  assert.equal(out.length, 2);
  assert.equal(out[0].name, 'gray/950');
  assert.equal(out[0].category, 'color');
  assert.deepEqual(out[0].sources, ['fills', 'effects']);
  assert.equal(out[0].count, 5);
  assert.deepEqual(out[0].uses, [{ name: 'color/text', count: 5 }, { name: 'color/shadow', count: 1 }]);
  assert.equal(out[1].name, 'spacing/8');
});

test('buildRenameTree — 바꿀 줄과 그 조상만, 이름 그대로인 조상은 머리, 깊이는 루트 0부터', () => {
  const nodes = [
    { id: 'r', name: 'Product card', depth: 1, parentId: null },
    { id: 'a', name: 'Frame 12', depth: 2, parentId: 'r', after: 'card-header' },
    { id: 'a1', name: 'Ellipse 2', depth: 3, parentId: 'a', after: 'avatar' },
    { id: 'k', name: 'Keep', depth: 2, parentId: 'r' }, // 아래에 바꿀 줄 없음 → 빠짐
    { id: 'k1', name: 'Text', depth: 3, parentId: 'k' },
    { id: 'p', name: 'Price', depth: 2, parentId: 'r' },
    { id: 'p1', name: 'Frame 9', depth: 3, parentId: 'p', after: 'price-row' },
  ];
  const roots = buildRenameTree(nodes);
  assert.equal(roots.length, 1);
  const r = roots[0];
  assert.equal(r.kind, 'head');
  assert.equal(r.level, 0);
  assert.deepEqual(r.descendants, ['a', 'a1', 'p1']);
  assert.deepEqual(r.children.map((c) => c.id), ['a', 'p']);
  assert.equal(r.children[0].kind, 'row');
  assert.deepEqual(r.children[0].children.map((c) => c.id), ['a1']);
  assert.equal(r.children[1].kind, 'head');
  assert.equal(r.children[1].level, 1);
  assert.deepEqual(buildRenameTree([{ id: 'x', name: 'x', depth: 0, parentId: null }]), []);
});

test('용어 — 화면 문구에 Semantic 변수 뜻의 "역할"이 남지 않음(§2.4, 텍스트 스타일 이름의 역할은 예외)', () => {
  const allowed = new Set(['textStyle.noteLhPx', 'textStyle.noteLsPx']);
  const left = Object.entries(STRINGS).filter(([k, v]) => typeof v === 'string' && v.includes('역할') && !allowed.has(k)).map(([k]) => k);
  assert.deepEqual(left, []);
});
