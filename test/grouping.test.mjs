/* [등록] 묶기 규칙 테스트 (IA v3 §4.7 "묶기", 2026-11-05 사용자 결정 · QA #3 관찰 5).
   실데이터(원본 `Flightin website`)의 모양을 그대로 옮긴 픽스처로 탭 판정 · 구조 가족 · 안쪽 색 Color 축 ·
   아이콘 프레임 · 이름(`{기본}-Type{n}`) · 기본 체크를 본다. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  tabInfo,
  highConfidenceComponentRole,
  planRegisterGroups,
  resolvePlanNames,
  defaultOnFor,
  reusePlanFor,
  structFingerprint,
  scanComponentCandidates,
} from '../dist/pure.mjs';

const visible = [{ visible: true, type: 'SOLID' }];
const text = (id, characters, fillHex = '#000000', extra = {}) => ({ id, name: characters, type: 'TEXT', characters, fillHex, width: 40, height: 20, fills: visible, ...extra });
const noAncestors = () => false;

/* ---------- 탭 판정 (1번) ---------- */

const menu = (id = 'menu', active = 0) => ({
  id, name: 'nav', type: 'FRAME', layoutMode: 'HORIZONTAL', width: 440, height: 20,
  children: ['About', 'Services', 'Offers', 'Seats', 'Destination '].map((c, i) => text(`${id}-${i}`, c, i === active ? '#000000' : '#7a7a7a')),
});
const cell = (id, label, selected) => ({
  id, name: selected ? 'button' : 'wrapper', type: 'FRAME', layoutMode: 'HORIZONTAL', width: 128, height: 47, cornerRadius: 24,
  ...(selected ? { fillHex: '#3d5fdb', fills: visible } : { fills: [] }),
  children: [text(`${id}t`, label, selected ? '#ffffff' : '#a3a3a3')],
});
const pill = (id = 'pill', active = 1, fill = '#3d5fdb') => ({
  id, name: 'card', type: 'FRAME', layoutMode: 'HORIZONTAL', width: 462, height: 71, cornerRadius: 32, fillHex: '#f4f9fa', fills: visible,
  children: ['Economy', 'Business Class', 'Fast Class'].map((l, i) => {
    const c = cell(`${id}-${i}`, l, i === active);
    return i === active ? { ...c, fillHex: fill } : c;
  }),
});

test('탭 판정 — 메뉴형(글자 칸) · 알약형(틀 칸)은 탭, 버튼 · 내비 · 카드보다 먼저', () => {
  assert.deepEqual(tabInfo(menu()), { style: 'Text', selected: 0, selectedColor: '#000000', unselectedTextColor: '#7a7a7a' });
  assert.deepEqual(tabInfo(pill()), { style: 'Pill', selected: 1, selectedColor: '#3d5fdb', unselectedTextColor: '#a3a3a3' });
  assert.equal(highConfidenceComponentRole(menu()), 'tab');
  assert.equal(highConfidenceComponentRole(pill()), 'tab');
});

test('탭 아님 — 2칸 · 선택 칸 0개 · 2개 · 섞인 색 · 긴 글자 · INSTANCE 칸 · 이메일 입력', () => {
  const two = { ...menu(), children: menu().children.slice(0, 2) };
  assert.equal(tabInfo(two), null);
  const none = { ...menu(), children: menu().children.map((c) => ({ ...c, fillHex: '#7a7a7a' })) };
  assert.equal(tabInfo(none), null);
  const twoSel = { ...menu(), children: menu().children.map((c, i) => ({ ...c, fillHex: i < 2 ? '#000000' : '#7a7a7a' })) };
  assert.equal(tabInfo(twoSel), null);
  const mixed = { ...menu(), children: menu().children.map((c, i) => (i === 3 ? { ...c, fillHex: null } : c)) };
  assert.equal(tabInfo(mixed), null);
  const long = { ...menu(), children: menu().children.map((c, i) => (i === 1 ? { ...c, characters: 'A very long menu label over 24' } : c)) };
  assert.equal(tabInfo(long), null);
  const inst = { ...pill(), children: pill().children.map((c, i) => (i === 1 ? { ...c, type: 'INSTANCE', children: [] } : c)) };
  assert.equal(tabInfo(inst), null);
  // 이메일 입력: 오토레이아웃 없음 · 칸 2개(버튼 + 글자)
  const email = { id: 'mail', name: 'card', type: 'FRAME', width: 660, height: 80, cornerRadius: 36, fillHex: '#ffffff', fills: visible,
    children: [cell('mb', 'Subscribe Now', true), text('mt', 'Enter your E-mail address', '#7a7a7a')] };
  assert.equal(tabInfo(email), null);
});

test('탭의 칸은 후보가 아니다 — 선택 칸이 버튼처럼 보여도', () => {
  const root = { id: 'r', name: 'root', type: 'FRAME', width: 1000, height: 500, children: [pill()] };
  const cands = scanComponentCandidates([root]);
  assert.ok(cands.some((c) => c.id === 'pill' && c.eligible));
  assert.ok(!cands.some((c) => c.id.startsWith('pill-')));
});

/* ---------- 탭 그룹 (2번) ---------- */

test('탭 그룹 — 이름과 상관없이 한 세트, Style=Text · Pill, 이름 Tab', () => {
  const groups = planRegisterGroups([menu(), pill()], noAncestors);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].key, 'role:tab');
  assert.equal(groups[0].subfamilies.length, 2);
  assert.deepEqual(groups[0].subfamilies.map((s) => s.props), [{ Style: 'Text' }, { Style: 'Pill' }]); // Style이 다르면 Selected 없음
  assert.deepEqual(resolvePlanNames(groups), ['Tab']);
  assert.deepEqual(resolvePlanNames(groups, ['Tab']), ['Tab2']);
});

test('탭 — 선택 위치만 다르면 Selected 축, 테마 색만 다르면 Color 축, 같으면 접힘', () => {
  const sel = planRegisterGroups([menu('a', 0), menu('b', 2)], noAncestors)[0];
  assert.deepEqual(sel.subfamilies.map((s) => s.props), [{ Selected: '1' }, { Selected: '3' }]);
  const theme = planRegisterGroups([pill('a', 1, '#3d5fdb'), pill('b', 1, '#e0362c')], noAncestors)[0];
  assert.equal(theme.subfamilies.length, 2);
  assert.ok(theme.subfamilies.every((s) => 'Color' in s.props));
  assert.ok(!theme.subfamilies.some((s) => 'Selected' in s.props));
  const same = planRegisterGroups([menu('a', 0), menu('b', 0)], noAncestors)[0];
  assert.equal(same.subfamilies.length, 1);
});

/* ---------- 구조 가족 · 안쪽 색 (4 · 5번) ---------- */

const vec = (id, key, w = 46, h = 45, fill = null) => ({ id, name: 'Vector', type: 'VECTOR', vectorKey: key, width: w, height: h, fillHex: fill });
/** 3기능 카드 — 아이콘 뒤 동그라미 색 · 아이콘 프레임(벡터 수 다름)만 다르고 글자. */
const feature = (id, badge, iconKey, title) => ({
  id, name: 'article', type: 'FRAME', width: 356, height: 467, fillHex: '#f4f9fa', fills: visible,
  children: [
    { id: `${id}-b`, name: 'Frame 31', type: 'FRAME', width: 133, height: 133, fillHex: badge, fills: visible,
      children: [{ id: `${id}-i`, name: 'icon', type: 'FRAME', width: 56, height: 56, iconFrame: true, vectorKey: iconKey, children: [] }] },
    { id: `${id}-t`, name: 'Frame 32', type: 'FRAME', layoutMode: 'VERTICAL', width: 271, height: 143,
      children: [text(`${id}-h`, title), text(`${id}-p`, `${title} body`, '#7a7a7a')] },
  ],
});
/** 여행자 카드 — 사진 · 이름만 다름. */
const traveler = (id, name, photo) => ({
  id, name: 'article', type: 'FRAME', width: 280, height: 360, cornerRadius: 120,
  children: [
    { id: `${id}-p`, name: 'photo', type: 'RECTANGLE', width: 280, height: 420, imageHash: photo },
    { id: `${id}-f`, name: 'Frame 40', type: 'FRAME', width: 280, height: 150,
      children: [
        { id: `${id}-a`, name: 'Ellipse', type: 'ELLIPSE', width: 60, height: 60, imageHash: `${photo}-a` },
        vec(`${id}-v`, 'exclude', 280, 120),
        { id: `${id}-n`, name: 'Frame 41', type: 'FRAME', layoutMode: 'VERTICAL', width: 86, height: 38,
          children: [text(`${id}-n1`, name), text(`${id}-n2`, `@${name}`)] },
      ] },
  ],
});

test('같은 이름이라도 구조가 다르면 가족으로 나눈다 — 3기능 카드 · 여행자 카드 → Article-Type1 · Type2', () => {
  const nodes = [
    feature('f1', '#5576ee', 'k-cal', 'Book & relax'),
    feature('f2', '#e68e6c', 'k-safe', 'Smart checklist'),
    feature('f3', '#2edcf3', 'k-pig', 'Save more'),
    traveler('t1', 'John', 'p1'), traveler('t2', 'Emma', 'p2'), traveler('t3', 'Liam', 'p3'), traveler('t4', 'Olivia', 'p4'),
  ];
  const groups = planRegisterGroups(nodes, noAncestors);
  assert.equal(groups.length, 2);
  assert.deepEqual(groups.map((g) => g.typeIndex), [1, 2]);
  assert.deepEqual(resolvePlanNames(groups), ['Article-Type1', 'Article-Type2']);
  // 3기능 카드: 동그라미 색으로 Color 3, 아이콘 · 글자는 속성
  const f = groups[0];
  assert.equal(f.subfamilies.length, 3);
  assert.deepEqual(f.subfamilies.map((s) => Object.keys(s.props)), [['Color'], ['Color'], ['Color']]);
  assert.equal(new Set(f.subfamilies.map((s) => s.props.Color)).size, 3);
  // 여행자 카드: 접힘(소가족 하나 · 멤버 4)
  assert.equal(groups[1].subfamilies.length, 1);
  assert.equal(groups[1].members.length, 4);
});

test('구조가 다른 4개(같은 이름) → 가족 4 → List-Type1~4, 반복 이름이라 기본 체크', () => {
  const mk = (id, kids, layout) => ({ id, name: 'travel-list', type: 'FRAME', layoutMode: layout, width: 400, height: 100, children: kids });
  const nodes = [
    mk('l1', [text('a', 'x')], 'HORIZONTAL'),
    mk('l2', [text('b', 'x'), text('c', 'y')], 'VERTICAL'),
    mk('l3', [{ id: 'd', name: 'f', type: 'FRAME', width: 10, height: 10, children: [] }], 'HORIZONTAL'),
    mk('l4', [{ id: 'e', name: 'r', type: 'RECTANGLE', width: 10, height: 10 }], 'HORIZONTAL'),
  ];
  const groups = planRegisterGroups(nodes, noAncestors);
  assert.equal(groups.length, 4);
  assert.ok(resolvePlanNames(groups).every((n, i) => n.endsWith(`-Type${i + 1}`)));
  assert.ok(groups.every((g) => defaultOnFor(g, g.members[0])));
  // 이미 있는 이름과 겹치면 `-2`
  const taken = resolvePlanNames(groups)[0];
  assert.equal(resolvePlanNames(groups, [taken])[0], `${taken}-2`);
});

test('여백 · 루트 채움만 다른 같은 이름 버튼은 한 가족(지금의 Size · Color 세트)', () => {
  const btn = (id, w, fill, pad) => ({ id, name: 'cta', type: 'FRAME', layoutMode: 'HORIZONTAL', width: w, height: 40, fillHex: fill, fills: visible, cornerRadius: 8,
    paddingLeft: pad, paddingRight: pad, children: [text(`${id}t`, 'Go', '#ffffff')] });
  const size = planRegisterGroups([btn('a', 80, '#111111', 8), btn('b', 120, '#111111', 16)], noAncestors);
  assert.equal(size.length, 1);
  assert.equal(size[0].subfamilies.length, 2);
  assert.ok(size[0].subfamilies.every((s) => 'Size' in s.props));
  const color = planRegisterGroups([btn('a', 80, '#111111', 8), btn('b', 80, '#ff0000', 8)], noAncestors);
  assert.equal(color.length, 1);
  assert.ok(color[0].subfamilies.every((s) => 'Color' in s.props));
});

test('안쪽 여백만 다르면 소가족을 가른다(재사용 접힘 지문과 같은 기준)', () => {
  const card = (id, innerPad, label) => ({ id, name: 'promo', type: 'FRAME', width: 200, height: 100, fillHex: '#ffffff', fills: visible, cornerRadius: 8,
    children: [{ id: `${id}-in`, name: 'in', type: 'FRAME', layoutMode: 'VERTICAL', paddingTop: innerPad, width: 180, height: 80, children: [text(`${id}t`, label)] }, text(`${id}x`, 'x')] });
  const g = planRegisterGroups([card('a', 4, 'A'), card('b', 4, 'B'), card('c', 12, 'C')], noAncestors)[0];
  assert.deepEqual(g.subfamilies.map((s) => s.members.length), [2, 1]);
});

/* ---------- 아이콘 프레임 (3번) ---------- */

test('아이콘 프레임 — 지문이 다르면 아이콘 차(접힘), 지문은 아이콘 지문 하나', () => {
  const b = (id, key) => ({ id, name: 'icon-button', type: 'FRAME', layoutMode: 'HORIZONTAL', width: 100, height: 40, cornerRadius: 8, fillHex: '#111111', fills: visible,
    children: [{ id: `${id}-i`, name: 'ic', type: 'FRAME', width: 24, height: 24, iconFrame: true, vectorKey: key, children: [] }, text(`${id}t`, 'Go', '#ffffff')] });
  const g = planRegisterGroups([b('a', 'f:1'), b('b', 'f:2')], noAncestors)[0];
  assert.equal(g.subfamilies.length, 1); // 아이콘만 다름 → 접힘
  assert.notEqual(structFingerprint(b('a', 'f:1'), true), structFingerprint(b('b', 'f:2'), true));
  assert.equal(structFingerprint(b('a', 'f:1'), false), structFingerprint(b('b', 'f:2'), false));
});

/* ---------- 기본 체크 · 재사용 계획 (6 · 7번) ---------- */

test('기본 체크 — 단독 버튼 · 탭은 켬, 단독 카드는 끔', () => {
  const hero = { id: 'h', name: 'hero-button', type: 'FRAME', layoutMode: 'HORIZONTAL', width: 126, height: 44, cornerRadius: 20, fillHex: '#3d5fdb', fills: visible, children: [text('ht', 'Contact', '#ffffff')] };
  const card = { id: 'c', name: 'promo', type: 'FRAME', width: 300, height: 200, cornerRadius: 8, fillHex: '#fff', fills: visible, children: [text('c1', 'a'), text('c2', 'b')] };
  const groups = planRegisterGroups([hero, card, menu()], noAncestors);
  const of = (id) => groups.find((g) => g.members.some((m) => m.id === id));
  assert.equal(defaultOnFor(of('h'), hero), true);
  assert.equal(defaultOnFor(of('menu'), menu()), true);
  assert.equal(defaultOnFor(of('c'), card), false);
  // 일반 구조어 이름(`item`)의 버튼은 그룹에 들지 않아 끔
  assert.equal(defaultOnFor(undefined, { ...hero, name: 'item' }), false);
});

test('재사용 계획 — 탭 그룹은 이름 키 role:tab, 세트는 소가족 마스터 키를 멤버에 나눠 준다', () => {
  const tabs = planRegisterGroups([menu('a', 0), menu('b', 0), pill()], noAncestors)[0];
  const plan = reusePlanFor(tabs);
  assert.equal(plan.kind, 'variant');
  assert.equal(plan.keys.length, 3);
  assert.ok(plan.keys.every((k) => k.startsWith('variant:role:tab:')));
  assert.equal(plan.keys[0], plan.keys[1]); // 같은 소가족 → 같은 변형
  assert.notEqual(plan.keys[0], plan.keys[2]);
});

test('재사용 정확 지문 — 글자 색만 다른 변형 · 선택 위치만 다른 글자 탭은 키가 다르다', () => {
  const b = (id, color) => ({ id, name: 'btn', type: 'FRAME', layoutMode: 'HORIZONTAL', width: 80, height: 32, cornerRadius: 4, fillHex: '#ffffff', fills: visible,
    children: [text(`${id}t`, 'Go', color)] });
  const g = planRegisterGroups([b('a', '#ff0000'), b('c', '#0000ff')], noAncestors)[0];
  assert.equal(g.subfamilies.length, 2);
  const keys = reusePlanFor(g).keys;
  assert.notEqual(keys[0], keys[1]);
  const t = planRegisterGroups([menu('m1', 0), menu('m2', 1)], noAncestors)[0];
  const tk = reusePlanFor(t).keys;
  assert.notEqual(tk[0], tk[1]);
});

test('날 벡터 ↔ 아이콘 프레임은 아이콘 차 — 한 가족으로 접힌다', () => {
  const b = (id, icon) => ({ id, name: 'chip-btn', type: 'FRAME', layoutMode: 'HORIZONTAL', width: 100, height: 40, cornerRadius: 8, fillHex: '#111111', fills: visible,
    children: [icon, text(`${id}t`, 'Go', '#ffffff')] });
  const g = planRegisterGroups([
    b('a', { id: 'ai', name: 'v', type: 'VECTOR', vectorKey: 'v1', width: 24, height: 24 }),
    b('b', { id: 'bi', name: 'ic', type: 'FRAME', width: 24, height: 24, iconFrame: true, vectorKey: 'f:9', children: [] }),
  ], noAncestors);
  assert.equal(g.length, 1);
  assert.equal(g[0].subfamilies.length, 1);
});

test('탭 칸 — 그라데이션 칸 · 원 하나뿐인 자식은 탭 아님', () => {
  const grad = { ...pill(), children: pill().children.map((c, i) => (i === 1 ? { ...c, fillHex: null } : c)) };
  assert.equal(tabInfo(grad), null);
  const dot = { ...pill(), children: pill().children.map((c) => ({ ...c, children: [...c.children, { id: `${c.id}d`, name: 'dot', type: 'ELLIPSE', width: 6, height: 6 }] })) };
  assert.equal(tabInfo(dot), null);
});

test('아이콘 프레임 보이기 차 → 가족과 함께 재사용 키도 갈린다 · 탭 Size는 그 묶음에만', () => {
  const c = (id, hidden) => ({ id, name: 'card', type: 'FRAME', width: 200, height: 100, cornerRadius: 8, fillHex: '#ffffff', fills: visible,
    children: [{ id: `${id}-i`, name: 'ic', type: 'FRAME', width: 24, height: 24, iconFrame: true, vectorKey: 'f:1', visible: !hidden, children: [] }, text(`${id}t`, id)] });
  const g = planRegisterGroups([c('a', false), c('b', false), c('d', true), c('e', true)], noAncestors);
  assert.equal(g.length, 2);
  assert.notEqual(reusePlanFor(g[0]).keys[0], reusePlanFor(g[1]).keys[0]);
  const small = { ...pill('p1'), width: 400, height: 60 };
  const big = { ...pill('p2'), width: 500, height: 71 };
  const t = planRegisterGroups([menu(), small, big], noAncestors)[0];
  const props = t.subfamilies.map((s) => s.props);
  assert.equal(props[0].Size, 'default'); // 메뉴(다른 Style)에는 붙지 않는다
  assert.notEqual(props[1].Size, props[2].Size);
});

/* ---------- Components 정리 PR (ia-v3 A.15 — C-D1 · C-D8 · C-D9 · C-D10 · C-D11) ---------- */

/** 글자 칸 메뉴 — 선택 칸 글자 색 · 선택 안 된 칸 글자 색 · 루트 채움을 고른다. */
const menuC = (id, sel, unsel, rootFill = null, active = 0) => ({
  id, name: 'nav', type: 'FRAME', layoutMode: 'HORIZONTAL', width: 440, height: 20,
  ...(rootFill ? { fillHex: rootFill, fills: visible } : {}),
  children: ['About', 'Services', 'Offers', 'Seats'].map((c, i) => text(`${id}-${i}`, c, i === active ? sel : unsel)),
});
const colors = (g) => g.subfamilies.map((s) => s.props.Color);

test('탭 Color(C-D1) — 루트가 기준은 같은 가족 · Style 안에서만: 다른 가족 탭의 루트 채움이 달라도 알약 색 유지', () => {
  const g = planRegisterGroups([pill('a', 1, '#3d5fdb'), pill('b', 1, '#e0362c'), menuC('m', '#000000', '#7a7a7a', '#ffffff')], noAncestors)[0];
  assert.equal(g.subfamilies.length, 3, '알약 둘이 한 소가족으로 접히지 않는다');
  const [a, b] = g.subfamilies.filter((s) => s.props.Style === 'Pill');
  assert.equal(a.props.Color, 'indigo');
  assert.equal(b.props.Color, 'red');
  assert.ok(!g.subfamilies.some((s) => 'Variant' in s.props));
});

test('탭 Color(C-D1) — 선택 안 된 칸 글자 색만 다른 메뉴 → Color=gray-500 · gray-0', () => {
  const g = planRegisterGroups([menuC('a', '#000000', '#7a7a7a'), menuC('b', '#000000', '#ffffff')], noAncestors)[0];
  assert.deepEqual(colors(g), ['gray-500', 'gray-0']);
});

test('탭 Color(C-D9) — 두 색이 함께 갈리는 메뉴 → `{앞}-{뒤}` (Color=blue-gray-500)', () => {
  const g = planRegisterGroups([menuC('a', '#2563eb', '#7a7a7a'), menuC('b', '#000000', '#ffffff')], noAncestors)[0];
  assert.deepEqual(colors(g), ['blue-gray-500', 'gray-1000-gray-0']);
});

test('탭 Color(C-D11) — 한 묶음은 두 색이, 다른 묶음은 앞 색만 갈리면 두 묶음 모두 `{앞}-{뒤}`', () => {
  // 묶음 1: 선택 1 메뉴 둘(두 색 함께), 묶음 2: 선택 3 메뉴 둘(앞 색만)
  const g = planRegisterGroups([
    menuC('a', '#2563eb', '#7a7a7a', null, 0), menuC('b', '#000000', '#ffffff', null, 0),
    menuC('c', '#2563eb', '#7a7a7a', null, 2), menuC('d', '#e0362c', '#7a7a7a', null, 2),
  ], noAncestors)[0];
  assert.equal(g.subfamilies.length, 4);
  // 같은 색 쌍은 같은 값, 묶음 2(앞 색만 갈림)도 뒤 색을 붙인다
  assert.deepEqual(colors(g), ['blue-gray-500', 'gray-1000-gray-0', 'blue-gray-500', 'red-gray-500']);
  assert.ok(g.subfamilies.every((s) => 'Selected' in s.props));
});

test('탭 Color(C-D8 · C-D10) — 채움 없는 탭이 섞이면 `none` 자리(Color=none-gray-500)', () => {
  const p = (id, root, unsel) => ({ ...pill(id, 1, '#3d5fdb'), ...(root ? { fillHex: root, fills: visible } : { fillHex: undefined, fills: [] }),
    children: pill(id, 1, '#3d5fdb').children.map((c, i) => (i === 1 ? c : { ...c, children: [text(`${c.id}t`, c.children[0].characters, unsel)] })) });
  const g = planRegisterGroups([p('a', null, '#7a7a7a'), p('b', '#2563eb', '#ffffff')], noAncestors)[0];
  assert.deepEqual(colors(g), ['none-gray-500', 'blue-gray-0']);
});

test('탭 Color(C-D10) — 색 쌍이 달라도 이름이 같아지면 값 전체에 `-2`', () => {
  const g = planRegisterGroups([menuC('a', '#2563eb', '#7a7a7a'), menuC('b', '#1e40af', '#6b7280'), menuC('c', '#000000', '#ffffff')], noAncestors)[0];
  assert.deepEqual(colors(g), ['blue-gray-500', 'blue-gray-500-2', 'gray-1000-gray-0']);
});

test('채움 없는 멤버(C-D8) — 버튼: Color=none · Color=blue, Variant 없음 / 루트가 기준인 탭: Color=none', () => {
  const btn = (id, fill) => ({ id, name: 'cta', type: 'FRAME', layoutMode: 'HORIZONTAL', width: 80, height: 40, cornerRadius: 8,
    ...(fill ? { fillHex: fill, fills: visible } : { strokes: visible }), children: [text(`${id}t`, 'Go', '#111111')] });
  const g = planRegisterGroups([btn('a', null), btn('b', '#2563eb')], noAncestors);
  assert.equal(g.length, 1);
  assert.deepEqual(g[0].subfamilies.map((s) => s.props), [{ Color: 'none' }, { Color: 'blue' }]);
  const p = (id, root) => ({ ...pill(id, 1, '#3d5fdb'), ...(root ? { fillHex: root, fills: visible } : { fillHex: undefined, fills: [] }) });
  const t = planRegisterGroups([p('a', null), p('b', '#ffffff')], noAncestors)[0];
  assert.deepEqual(colors(t), ['none', 'gray-0']);
  assert.ok(!t.subfamilies.some((s) => 'Variant' in s.props));
});

test('`-Type{n}` 기본 이름 — 겹칠 때만 맥락을 되살리고 숫자는 `-Type{n}` 뒤 `-k`로만', () => {
  const mk = (id, name, two) => ({ id, name, type: 'FRAME', layoutMode: two ? 'VERTICAL' : 'HORIZONTAL', width: 400, height: 100,
    children: two ? [text(`${id}a`, 'x'), text(`${id}b`, 'y')] : [text(`${id}a`, 'x')] });
  const both = planRegisterGroups([mk('a1', 'article-list', false), mk('a2', 'article-list', true), mk('p1', 'profile-list', false), mk('p2', 'profile-list', true)], noAncestors);
  assert.deepEqual(resolvePlanNames(both), ['ArticleList-Type1', 'ArticleList-Type2', 'ProfileList-Type1', 'ProfileList-Type2']);
  const one = planRegisterGroups([mk('a1', 'article-list', false), mk('a2', 'article-list', true)], noAncestors);
  assert.deepEqual(resolvePlanNames(one), ['List-Type1', 'List-Type2']);
  assert.deepEqual(resolvePlanNames(one, ['List-Type1']), ['List-Type1-2', 'List-Type2']);
});

test('아이콘 프레임을 직접 여럿 골라도 후보가 아니다 — 96 이하 아이콘 배지 여럿 → 후보 0', () => {
  const badge = (id) => ({ id, name: 'badge', type: 'FRAME', width: 48, height: 48, cornerRadius: 24, fillHex: '#5576ee', fills: visible,
    children: [{ id: `${id}e`, name: 'Ellipse', type: 'ELLIPSE', width: 40, height: 40 }, vec(`${id}v`, 'k', 24, 24)] });
  assert.equal(highConfidenceComponentRole(badge('x')), 'card', '아이콘 배지는 card 조건도 만족한다');
  const cands = scanComponentCandidates([badge('a'), badge('b'), badge('c')]);
  assert.equal(cands.filter((c) => c.eligible).length, 0);
});

test('단위 보충 — Box 탭(선으로 선택 표시) → Style=Box · 막대 레이어로 밑줄을 그린 탭은 탭 아님 · 단독 칩 defaultOn', () => {
  const boxCell = (id, label, selected) => ({ id, name: 'cell', type: 'FRAME', layoutMode: 'HORIZONTAL', width: 100, height: 40,
    ...(selected ? { strokes: visible } : {}), fills: [], children: [text(`${id}t`, label, '#111111')] });
  const box = { id: 'box', name: 'seg', type: 'FRAME', layoutMode: 'HORIZONTAL', width: 300, height: 40,
    children: ['One', 'Two', 'Three'].map((l, i) => boxCell(`box-${i}`, l, i === 0)) };
  assert.equal(tabInfo(box)?.style, 'Box');
  const fillBox = { ...box, children: ['One', 'Two', 'Three'].map((l, i) => ({ ...boxCell(`fb-${i}`, l, false), ...(i === 1 ? { fillHex: '#eeeeee', fills: visible } : {}) })) };
  assert.equal(tabInfo(fillBox)?.style, 'Box', '모서리 없는 채움으로 선택 표시');
  // 칸과 따로 놓인 막대 레이어로 밑줄 — 칸 모양이 모두 같아 선택 칸이 없다
  const bar = { id: 'bar', name: 'tabs', type: 'FRAME', layoutMode: 'HORIZONTAL', width: 300, height: 40,
    children: [...['One', 'Two', 'Three'].map((l, i) => boxCell(`bar-${i}`, l, false)), { id: 'bar-u', name: 'underline', type: 'RECTANGLE', width: 100, height: 2, fillHex: '#2563eb', fills: visible }] };
  assert.equal(tabInfo(bar), null);
  const chip = { id: 'chip', name: 'chip', type: 'FRAME', layoutMode: 'HORIZONTAL', width: 64, height: 28, cornerRadius: 14, fillHex: '#eeeeee', fills: visible,
    paddingLeft: 12, paddingRight: 12, children: [text('chipt', 'Tag', '#111111')] };
  assert.equal(highConfidenceComponentRole(chip), 'chip');
  const g = planRegisterGroups([chip], noAncestors)[0];
  assert.equal(defaultOnFor(g, chip), true);
});
