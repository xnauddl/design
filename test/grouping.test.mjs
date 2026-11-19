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
  gateComponentCandidates,
  isAutoNamedCandidate,
  isDefaultName,
  isTabName,
  planTabGroup,
  tabCellMatches,
  tabBarRootMatches,
  isTabItemRow,
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
  const pick = (t) => t && { style: t.style, selected: t.selected, selectedColor: t.selectedColor, unselectedTextColor: t.unselectedTextColor, wide: t.wide };
  assert.deepEqual(pick(tabInfo(menu())), { style: 'Text', selected: 0, selectedColor: '#000000', unselectedTextColor: '#7a7a7a', wide: false });
  assert.deepEqual(pick(tabInfo(pill())), { style: 'Pill', selected: 1, selectedColor: '#3d5fdb', unselectedTextColor: '#a3a3a3', wide: false });
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

/* ---------- 6-1b 탭 판정 — 엄격한 구조, 또는 이름 + 넓힌 구조(ia-v3 A.19 · §4.7 "묶기" 1번) ---------- */

test('isTabName — kebab 낱말 tab · tabs · tabbar …, 또는 글자 탭', () => {
  for (const n of ['Tab', 'tabs', 'TabBar', 'category-tabs', '탭바', '상단 탭', 'Tab 2', 'tabs-1', 'tablist']) assert.equal(isTabName(n), true, n);
  for (const n of ['table', 'stable', 'nav', 'card', 'Tab2', 'tabs1', '']) assert.equal(isTabName(n), false, n);
});

test('엄격한 구조 — 이름 없이 탭(nav 메뉴 · card 알약 · 자동 이름 Frame 3)', () => {
  assert.equal(tabInfo({ ...menu(), name: 'Frame 3' })?.wide, false);
  assert.equal(tabInfo(pill())?.style, 'Pill');
  assert.equal(tabInfo(menu(), { wide: false })?.selected, 0, '엄격한 구조는 wide: false에서도 탭');
});

/** 넓힌 구조 — 글자 색은 모두 같고 굵기 · 밑줄로 선택을 표시한 글자 칸 줄. */
const weightRow = (name, n = 3, sel = 0, extra = (i) => (i === sel ? { fontWeight: 700 } : { fontWeight: 400 })) => ({
  id: `w-${name}`, name, type: 'FRAME', layoutMode: 'HORIZONTAL', width: 300, height: 20,
  children: ['Home', 'Trips', 'Deals', 'My'].slice(0, n).map((c, i) => text(`w-${name}-${i}`, c, '#111111', extra(i))),
});
/** 틀 칸 — 막대(마지막 자식 · 아래 끝 · 폭 절반 이상) 유무로 선택 표시. */
const barCell = (id, label, bar, o = {}) => ({
  id, name: 'cell', type: 'FRAME', layoutMode: 'VERTICAL', width: 80, height: 40, fills: [],
  children: [text(`${id}t`, label, '#111111'), ...(bar ? [{ id: `${id}b`, name: 'bar', type: 'RECTANGLE', width: 80, height: 2, y: 38, fillHex: '#2563eb', fills: visible, ...o }] : [])],
});
const barRow = (name, n = 3, sel = 0) => ({ id: `b-${name}`, name, type: 'FRAME', layoutMode: 'HORIZONTAL', width: 300, height: 40,
  children: ['One', 'Two', 'Three'].slice(0, n).map((l, i) => barCell(`b-${name}-${i}`, l, i === sel)) });

test('넓힌 구조 — 굵기 · 밑줄 · 칸 안 막대 3칸 줄과 막대 2칸 줄은 이름이 tabs일 때만 탭', () => {
  const w = tabInfo(weightRow('tabs', 3, 1));
  assert.equal(w?.selected, 1);
  assert.equal(w?.wide, true);
  assert.equal(w?.style, 'Text');
  assert.equal(tabInfo(weightRow('nav', 3, 1)), null);
  assert.equal(tabInfo(weightRow('menu-list', 3, 1)), null);
  const u = weightRow('tabs', 3, 2, (i) => (i === 2 ? { textDecoration: 'UNDERLINE' } : {}));
  assert.equal(tabInfo(u)?.selected, 2);
  const b3 = tabInfo(barRow('tabs', 3, 0));
  assert.equal(b3?.selected, 0);
  assert.equal(b3?.style, 'Box');
  assert.ok(b3.cellLooks[0].endsWith('|b') && !b3.cellLooks[1].endsWith('|b'));
  assert.equal(tabInfo(barRow('tabs', 2, 1))?.selected, 1, '막대 표지 2칸');
  assert.equal(tabInfo(barRow('menu', 2, 1)), null);
  assert.equal(tabInfo({ ...barRow('Tab2', 3, 0) }), null, '숫자가 붙은 낱말은 이름 조건 거짓(한계)');
});

test('넓힌 구조 2칸 — 색만 다르면 아님 · 채움 유무 · 선 유무만 다르면 탭 · 섞인 굵기 아님 · 위쪽 LINE은 그림', () => {
  const two = (a, b) => ({ id: 'two', name: 'tabs', type: 'FRAME', layoutMode: 'HORIZONTAL', width: 200, height: 40, children: [a, b] });
  const fc = (id, o = {}, textHex = '#111111') => ({ id, name: 'cell', type: 'FRAME', layoutMode: 'HORIZONTAL', width: 80, height: 40, fills: [], ...o, children: [text(`${id}t`, id, textHex)] });
  assert.equal(tabInfo(two(fc('a', {}, '#111111'), fc('b', {}, '#7a7a7a'))), null, '글자 색만 다름');
  assert.equal(tabInfo(two(fc('a', { fillHex: '#eeeeee', fills: visible }), fc('b', { fillHex: '#dddddd', fills: visible }))), null, '채움 색만 다름');
  assert.equal(tabInfo(two(fc('a'), fc('b', { fillHex: '#eeeeee', fills: visible })))?.selected, 1, '채움 있는 칸');
  assert.equal(tabInfo(two(fc('a', { strokes: visible }), fc('b')))?.selected, 0, '선 있는 칸(테두리 탭)');
  const mixed = weightRow('tabs', 3, 0, (i) => (i === 0 ? { fontWeight: Symbol('mixed') } : { fontWeight: 400 }));
  assert.equal(tabInfo(mixed), null, '섞인 굵기');
  const topLine = (id, line) => ({ ...fc(id), layoutMode: 'VERTICAL', children: [...(line ? [{ id: `${id}l`, name: 'line', type: 'LINE', width: 80, height: 0, y: 0 }] : []), text(`${id}t`, id, '#111111')] });
  assert.equal(tabInfo(two(topLine('a', true), topLine('b', false))), null, '위쪽 LINE은 막대가 아니라 그림 — 표지 없음');
});

test('쓰임 이름(⑫) — 넓힌 구조 tabs 줄은 wideTab: false에서 tab이 아님, 엄격한 구조 메뉴는 tab', () => {
  assert.equal(highConfidenceComponentRole(weightRow('tabs', 3, 1)), 'tab');
  assert.notEqual(highConfidenceComponentRole(weightRow('tabs', 3, 1), { wideTab: false }), 'tab');
  assert.equal(highConfidenceComponentRole(menu(), { wideTab: false }), 'tab');
});

/* ---------- 탭 그룹 (2번) ---------- */

test('탭 그룹 — 이름과 상관없이 한 그룹, Tab Item(Style × State) · Tab Bar(Style), 이름 Tab Item · Tab Bar', () => {
  const groups = planRegisterGroups([menu(), pill()], noAncestors);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].key, 'role:tab');
  const tab = groups[0].tab;
  assert.deepEqual(tab.items.map((x) => x.variant), ['State=Selected, Style=Text', 'State=Default, Style=Text', 'State=Selected, Style=Pill', 'State=Default, Style=Pill']);
  assert.deepEqual(tab.items.map((x) => x.cell.id), ['menu-0', 'menu-1', 'pill-1', 'pill-0']);
  assert.deepEqual(groups[0].subfamilies.map((s) => s.props), [{ Style: 'Text' }, { Style: 'Pill' }]);
  assert.deepEqual(resolvePlanNames(groups), ['Tab Bar']);
  assert.equal(tab.itemName, 'Tab Item');
  assert.deepEqual(resolvePlanNames(groups, ['Tab Item', 'Tab Bar']), ['Tab Bar 2']);
  assert.equal(tab.itemName, 'Tab Item 2');
});

test('탭 — 선택 위치만 다른 같은 Style 바는 대표 하나 + Tab Bar 인스턴스 대상(Selected · Color 축 없음)', () => {
  const g = planRegisterGroups([menu('a', 0), menu('b', 2)], noAncestors)[0];
  assert.equal(g.subfamilies.length, 1);
  assert.deepEqual(g.subfamilies[0].props, {}, 'Style 하나 → Tab Bar는 컴포넌트 하나');
  assert.deepEqual(g.tab.bars.map((b) => [b.rep, b.asBar]), [[true, false], [false, true]]);
  assert.deepEqual(g.tab.bars[1].states, ['Default', 'Default', 'Selected', 'Default', 'Default']);
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

test('재사용 계획 — 탭 그룹은 Tab Item · Tab Bar 키, 세트는 소가족 마스터 키를 멤버에 나눠 준다', () => {
  const tabs = planRegisterGroups([menu('a', 0), menu('b', 0), pill()], noAncestors)[0];
  const plan = reusePlanFor(tabs);
  assert.equal(plan.kind, 'tab');
  assert.equal(plan.itemKeys.length, 4);
  assert.ok(plan.itemKeys.every((k) => k.startsWith('variant:role:tab-item:')));
  assert.equal(plan.barKeys.length, 2);
  assert.ok(plan.barKeys.every((k) => k.startsWith('variant:role:tab-bar:')));
  assert.notEqual(plan.itemKeys[0], plan.itemKeys[1]);
});

test('재사용 정확 지문 — 글자 색만 다른 변형은 키가 다르다', () => {
  const b = (id, color) => ({ id, name: 'btn', type: 'FRAME', layoutMode: 'HORIZONTAL', width: 80, height: 32, cornerRadius: 4, fillHex: '#ffffff', fills: visible,
    children: [text(`${id}t`, 'Go', color)] });
  const g = planRegisterGroups([b('a', '#ff0000'), b('c', '#0000ff')], noAncestors)[0];
  assert.equal(g.subfamilies.length, 2);
  const keys = reusePlanFor(g).keys;
  assert.notEqual(keys[0], keys[1]);
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

test('아이콘 프레임 보이기 차 → 가족과 함께 재사용 키도 갈린다', () => {
  const c = (id, hidden) => ({ id, name: 'card', type: 'FRAME', width: 200, height: 100, cornerRadius: 8, fillHex: '#ffffff', fills: visible,
    children: [{ id: `${id}-i`, name: 'ic', type: 'FRAME', width: 24, height: 24, iconFrame: true, vectorKey: 'f:1', visible: !hidden, children: [] }, text(`${id}t`, id)] });
  const g = planRegisterGroups([c('a', false), c('b', false), c('d', true), c('e', true)], noAncestors);
  assert.equal(g.length, 2);
  assert.notEqual(reusePlanFor(g[0]).keys[0], reusePlanFor(g[1]).keys[0]);
});

/* ---------- Components 정리 PR (ia-v3 A.15 — C-D8 · 탭 Color 규칙 C-D1 · C-D9 – C-D11은 6-1b에서 없앰) ---------- */

test('채움 없는 멤버(C-D8) — 버튼: Color=none · Color=blue, Variant 없음', () => {
  const btn = (id, fill) => ({ id, name: 'cta', type: 'FRAME', layoutMode: 'HORIZONTAL', width: 80, height: 40, cornerRadius: 8,
    ...(fill ? { fillHex: fill, fills: visible } : { strokes: visible }), children: [text(`${id}t`, 'Go', '#111111')] });
  const g = planRegisterGroups([btn('a', null), btn('b', '#2563eb')], noAncestors);
  assert.equal(g.length, 1);
  assert.deepEqual(g[0].subfamilies.map((s) => s.props), [{ Color: 'none' }, { Color: 'blue' }]);
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

/* ---------- 실기 확인 뒤 더함(2026-11-18 C-D15 · C-D16 — ia-v3 A.15) ---------- */

test('isDefaultName(C-D15) — 번호 앞 빈칸 없는 꼴 · 도형 연산 · copy는 자동 이름, 소문자 · 구조어 · 사람 이름은 아님', () => {
  for (const n of ['Frame23', 'Exclude', 'Exclude 2', 'Union', 'Frame 12 copy']) assert.equal(isDefaultName(n), true, n);
  for (const n of ['frame', 'container', 'Button']) assert.equal(isDefaultName(n), false, n);
});

const chipLike = (id, name, fill) => ({ id, name, type: 'FRAME', layoutMode: 'HORIZONTAL', width: 64, height: 28, cornerRadius: 14, fillHex: fill, fills: visible,
  paddingLeft: 12, paddingRight: 12, children: [text(`${id}t`, 'Tag', '#ffffff')] });
const btnLike = (id, name = 'button') => ({ id, name, type: 'FRAME', layoutMode: 'HORIZONTAL', width: 120, height: 44, cornerRadius: 8, fillHex: '#3d5fdb', fills: visible,
  paddingLeft: 32, paddingRight: 32, paddingTop: 12, paddingBottom: 12, children: [text(`${id}t`, 'Contact', '#ffffff')] });

test('자동 이름 후보 제외(C-D15) — 배지 Frame23 셋 · Exclude는 표시만, 후보는 button 하나', () => {
  const badges = [chipLike('a', 'Frame23', '#3d5fdb'), chipLike('b', 'Frame23', '#e0362c'), chipLike('c', 'Frame23', '#14b8a6')];
  const ex = { id: 'x', name: 'Exclude', type: 'BOOLEAN_OPERATION', role: 'icon', width: 24, height: 24 };
  assert.ok(badges.every((b) => highConfidenceComponentRole(b) != null), '배지는 구조로는 후보');
  const out = scanComponentCandidates([...badges, ex, btnLike('btn')]);
  assert.deepEqual(out.filter((c) => c.eligible).map((c) => c.id), ['btn']);
  assert.deepEqual(out.filter((c) => c.autoNamed).map((c) => c.id), ['a', 'b', 'c', 'x']);
  assert.equal(out.length, 5);
});

test('자동 이름(C-D15) — 구조로 후보가 아닌 자동 이름 FRAME 안의 button은 후보 · 탭 · 구조어 · 단일 루트는 표시 없음', () => {
  const wrap = { id: 'w', name: 'Frame 7', type: 'FRAME', width: 600, height: 300, children: [btnLike('in')] };
  const o1 = scanComponentCandidates([wrap, btnLike('other')]);
  assert.ok(o1.find((c) => c.id === 'in')?.eligible);
  const w = o1.find((c) => c.id === 'w');
  assert.ok(w && !w.eligible && !w.autoNamed, '흐린 맥락 줄 · 표시 없음');
  const tab = { ...pill('t5'), name: 'Frame 5' };
  const o2 = scanComponentCandidates([tab, btnLike('b2')]);
  assert.ok(o2.find((c) => c.id === 't5')?.eligible && !o2.find((c) => c.id === 't5')?.autoNamed, '탭은 자동 이름이어도 후보');
  const cont = { ...btnLike('ct'), name: 'container' };
  const o3 = scanComponentCandidates([cont, btnLike('b3')]);
  assert.ok(o3.find((c) => c.id === 'ct')?.eligible && !o3.find((c) => c.id === 'ct')?.autoNamed, 'C-D2 구조어는 트리에 그대로');
  const root = { id: 'r3', name: 'Frame 3', type: 'FRAME', width: 900, height: 600, children: [btnLike('b4')] };
  const o4 = scanComponentCandidates([root]);
  assert.ok(!o4.find((c) => c.id === 'r3')?.autoNamed, '컨테이너 루트는 표시 없음');
});

test('자동 이름 셈(C-D15 · code.ts 셈 순서) — 숨은 조상 아래는 세지 않고, 센 뒤 가지치기 · 표시 지움', () => {
  const holder = { id: 'h', name: 'Frame 9', type: 'FRAME', width: 600, height: 300, children: [chipLike('in1', 'Frame23', '#3d5fdb'), btnLike('ok')] };
  const cands = scanComponentCandidates([chipLike('a', 'Frame23', '#3d5fdb'), chipLike('hid', 'Frame23', '#e0362c'), holder]);
  const r = gateComponentCandidates(cands, (id) => id !== 'hid');
  assert.equal(r.autoNamed, 2, 'a · in1 (숨은 hid는 빼고)');
  assert.deepEqual(r.nodes.map((c) => c.id), ['h', 'ok'], '표시 레이어는 트리에서 빠지고 안쪽 후보의 조상만 맥락 줄');
  assert.ok(r.nodes.every((c) => !('autoNamed' in c)), '레이어별 표시는 지움');
});

test('Size 축 — 여백 · 간격 차(C-D16): 실기 버튼 셋 → Color=indigo, Size=md · Color=none, Size=md · Color=indigo, Size=lg', () => {
  const b = (id, fill, pt, pl, w, h, label, textHex) => ({ id, name: 'button', type: 'FRAME', layoutMode: 'HORIZONTAL', width: w, height: h, cornerRadius: 8,
    paddingTop: pt, paddingBottom: pt, paddingLeft: pl, paddingRight: pl, itemSpacing: 8, counterAxisSpacing: 0,
    ...(fill ? { fillHex: fill, fills: visible } : { fills: [], strokes: visible }), children: [text(`${id}t`, label, textHex)] });
  const g = planRegisterGroups([b('1', '#3D5FDB', 12, 32, 126, 44, 'Contact', '#FFFFFF'), b('2', null, 12, 32, 135, 47, 'View All', '#3D5FDB'), b('3', '#3D5FDB', 13, 24, 180, 48, 'Subscribe Now', '#FFFFFF')], noAncestors);
  assert.equal(g.length, 1);
  assert.deepEqual(g[0].subfamilies.map((s) => s.props), [{ Color: 'indigo', Size: 'md' }, { Color: 'none', Size: 'md' }, { Color: 'indigo', Size: 'lg' }]);
});

test('Size 축(C-D16) — 크기만 다른 버튼은 넓이 순위 그대로 · 간격만 다른 칩 둘(글자 다름) → md · lg', () => {
  const btn = (id, w) => ({ id, name: 'cta', type: 'FRAME', layoutMode: 'HORIZONTAL', width: w, height: 40, fillHex: '#111111', fills: visible, cornerRadius: 8, children: [text(`${id}t`, 'Go', '#ffffff')] });
  const s1 = planRegisterGroups([btn('a', 120), btn('b', 80)], noAncestors)[0];
  assert.deepEqual(s1.subfamilies.map((s) => s.props), [{ Size: 'lg' }, { Size: 'md' }]);
  const chip = (id, gap, label) => ({ ...chipLike(id, 'tag', '#eeeeee'), itemSpacing: gap, children: [text(`${id}t`, label, '#111111'), text(`${id}u`, 'x', '#111111')] });
  const s2 = planRegisterGroups([chip('a', 4, 'One'), chip('b', 8, 'Two')], noAncestors)[0];
  assert.deepEqual(s2.subfamilies.map((s) => s.props), [{ Size: 'md' }, { Size: 'lg' }]);
});

test('[등록] 게이트(C-D15 — 스캔 없는 [등록] · nodeIds) — Frame23 배지 셋은 걸러져 세트가 되지 않음 · 탭은 통과', () => {
  const badges = [chipLike('a', 'Frame23', '#3d5fdb'), chipLike('b', 'Frame23', '#e0362c'), chipLike('c', 'Frame23', '#14b8a6')];
  const valid = badges.filter((n) => !isAutoNamedCandidate(n));
  assert.equal(valid.length, 0);
  assert.equal(planRegisterGroups(valid, noAncestors).length, 0, '세트 없음');
  assert.equal(isAutoNamedCandidate({ ...pill('t'), name: 'Frame 5' }), false);
});

/* ---------- 6-1b Tab Item · Tab Bar 계획 · C-D18 · 다시 찾기(ia-v3 A.19 6번) ---------- */

/** 메뉴형 바 — 칸 수 · 선택 위치 · 이름. */
const menuN = (id, n, active = 0, extra = {}) => ({
  id, name: 'nav', type: 'FRAME', layoutMode: 'HORIZONTAL', width: 400, height: 20, ...extra,
  children: ['About', 'Services', 'Offers', 'Seats', 'Destination'].slice(0, n).map((c, i) => text(`${id}-${i}`, c, i === active ? '#000000' : '#7a7a7a')),
});

test('④ 이름만 맞고 구조가 안 맞는 tab-bar(선택 칸 둘)는 이름 그룹 tab-bar', () => {
  const twoSel = (id) => ({ ...menuN(id, 4), name: 'tab-bar', children: menuN(id, 4).children.map((c, i) => ({ ...c, fillHex: i < 2 ? '#000000' : '#7a7a7a' })) });
  assert.equal(tabInfo(twoSel('x')), null);
  const g = planRegisterGroups([twoSel('x'), twoSel('y')], noAncestors);
  assert.equal(g.length, 1);
  assert.equal(g[0].key, 'tab-bar');
  assert.equal(g[0].tab, undefined);
});

test('⑤ planTabGroup — 메뉴형 바 3(칸 5 · 5 · 4) + 알약형 1 → Tab Item 변형 4 · Tab Bar 변형 2 · 둘째 칸 5 바는 Tab Bar 인스턴스 · 칸 4 바는 칸만', () => {
  const plan = planTabGroup([menuN('m1', 5), menuN('m2', 5, 1), menuN('m3', 4), pill()]);
  assert.equal(plan.items.length, 4);
  assert.deepEqual(plan.styles.map((s) => [s.style, s.rep.id]), [['Text', 'm1'], ['Pill', 'pill']]);
  assert.deepEqual(plan.bars.map((b) => [b.bar.id, b.rep, b.asBar]), [['m1', true, false], ['m2', false, true], ['m3', false, false], ['pill', true, false]]);
  assert.equal(plan.bars[2].sameCount, false);
  const g = planRegisterGroups([menuN('m1', 5), menuN('m2', 5, 1), menuN('m3', 4), pill()], noAncestors)[0];
  assert.deepEqual(g.subfamilies.map((s) => [s.members[0].id, s.props]), [['m1', { Style: 'Text' }], ['pill', { Style: 'Pill' }]]);
});

test('⑥ 칸 수 동률(4 · 5 · 4 · 5) → 문서 순 첫 바의 칸 수 4 · ⑦ Style 하나 → Tab Bar props 빔', () => {
  const plan = planTabGroup([menuN('a', 4), menuN('b', 5), menuN('c', 4), menuN('d', 5)]);
  assert.equal(plan.styles[0].rep.id, 'a');
  assert.deepEqual(plan.bars.map((b) => b.asBar), [false, false, true, false]);
  const g = planRegisterGroups([menuN('a', 4), menuN('b', 5)], noAncestors)[0];
  assert.deepEqual(g.subfamilies.map((s) => s.props), [{}]);
});

test('⑧ tabCellMatches — 글자 · 폭만 다르면 참, 테마 색 · 패딩 · 굵기가 다르면 거짓 · tabBarRootMatches — 루트 채움 · 여백은 거짓, 폭만 다르면 참', () => {
  const c = (o = {}, t = {}) => ({ id: 'c', name: 'cell', type: 'FRAME', layoutMode: 'HORIZONTAL', width: 80, height: 40, cornerRadius: 20, fillHex: '#3d5fdb', fills: visible,
    paddingLeft: 16, paddingRight: 16, ...o, children: [text('ct', 'Economy', '#ffffff', t)] });
  assert.equal(tabCellMatches(c(), c({ width: 120 }, { characters: 'Business Class', width: 90 })), true);
  assert.equal(tabCellMatches(c(), c({ fillHex: '#e0362c' })), false, '테마 색');
  assert.equal(tabCellMatches(c(), c({ paddingLeft: 24 })), false, '패딩');
  assert.equal(tabCellMatches(c(), c({}, { fontWeight: 700 })), false, '굵기');
  assert.equal(tabCellMatches(text('a', 'One', '#111111'), text('b', 'Two', '#111111', { width: 60 })), true, '글자 칸 — 글자 · 폭');
  assert.equal(tabCellMatches(text('a', 'One', '#111111'), text('b', 'One', '#ff0000')), false, '글자 칸 — 색');
  assert.equal(tabBarRootMatches(menuN('a', 5), menuN('b', 5, 2, { width: 500 })), true);
  assert.equal(tabBarRootMatches(menuN('a', 5), menuN('b', 5, 0, { fillHex: '#111111', fills: visible })), false);
  assert.equal(tabBarRootMatches(menuN('a', 5), menuN('b', 5, 0, { paddingLeft: 8 })), false);
  assert.equal(tabBarRootMatches(menuN('a', 5), menuN('b', 4)), false);
});

test('⑨ resolvePlanNames — Tab Item · Tab Bar, 문서에 있으면 2, 이름 그룹 "Tab"과 같이 있어도 겹치지 않음', () => {
  const tabNamed = (id) => ({ id, name: 'Tab', type: 'FRAME', layoutMode: 'HORIZONTAL', width: 80, height: 32, cornerRadius: 4, fillHex: '#ffffff', fills: visible, children: [text(`${id}t`, 'Go')] });
  const groups = planRegisterGroups([tabNamed('x'), menuN('m', 5)], noAncestors);
  const names = resolvePlanNames(groups);
  assert.deepEqual(names.sort(), ['Tab', 'Tab Bar']);
  assert.equal(groups.find((g) => g.tab).tab.itemName, 'Tab Item');
  const again = planRegisterGroups([menuN('m', 5)], noAncestors);
  assert.deepEqual(resolvePlanNames(again, ['Tab Item', 'Tab Bar', 'Tab Bar 2']), ['Tab Bar 3']);
  assert.equal(again[0].tab.itemName, 'Tab Item 2');
});

/** 목록 — 같은 이름 · 자식 5개 인스턴스. */
const list = (id, kids) => ({ id, name: 'bk-list', type: 'FRAME', layoutMode: 'HORIZONTAL', width: 900, height: 200, children: kids });
const inst = (id, fam, o = {}) => ({ id, name: 'item', type: 'INSTANCE', width: 160, height: 200, mainFamilyKey: fam, mainComponentKey: `${fam}:${o.v ?? 1}`, mainInSet: true, children: [], ...o });
const five = (p, fam, o) => Array.from({ length: 5 }, (_, i) => inst(`${p}${i}`, fam, o));

test('⑩ C-D18 — 다른 컴포넌트 가족을 담은 같은 이름 목록은 가족 2(-Type1 · -Type2)', () => {
  const g = planRegisterGroups([list('k1', five('a', 'card')), list('k2', five('b', 'tabcell'))], noAncestors);
  assert.equal(g.length, 2);
  assert.deepEqual(resolvePlanNames(g), ['List-Type1', 'List-Type2']); // 기본 이름은 맥락을 뗀 이름(실기 파일은 BkList)
  // 같은 세트의 다른 변형 → 한 가족(내용 차)
  assert.equal(planRegisterGroups([list('k1', five('a', 'card', { v: 1 })), list('k2', five('b', 'card', { v: 2 }))], noAncestors).length, 1);
  // 둘 다 아이콘 → 한 가족 · 한쪽만 아이콘 → 가름
  assert.equal(planRegisterGroups([list('k1', five('a', 'i1', { iconMain: true })), list('k2', five('b', 'i2', { iconMain: true }))], noAncestors).length, 1);
  assert.equal(planRegisterGroups([list('k1', five('a', 'i1', { iconMain: true })), list('k2', five('b', 'i2'))], noAncestors).length, 2);
  // 메인을 모르면 한 가족
  assert.equal(planRegisterGroups([list('k1', five('a', undefined)), list('k2', five('b', 'x'))], noAncestors).length, 1);
});

test('⑩ C-D18 예외 ② — 구조가 같은 단독 메인(Badge 1 · Badge 2, 색만 다름)은 한 가족, 구조가 다르면 가름', () => {
  const main = (id, fill, n = 1) => ({ id, name: 'Badge', type: 'COMPONENT', layoutMode: 'HORIZONTAL', width: 40, height: 20, fillHex: fill, fills: visible,
    children: Array.from({ length: n }, (_, i) => text(`${id}t${i}`, 'New', '#ffffff')) });
  const b = (p, fam, m) => five(p, fam, { mainInSet: false, mainStruct: m });
  assert.equal(planRegisterGroups([list('k1', b('a', 'B1', main('m1', '#ff0000'))), list('k2', b('b', 'B2', main('m2', '#0000ff')))], noAncestors).length, 1);
  assert.equal(planRegisterGroups([list('k1', b('a', 'B1', main('m1', '#ff0000'))), list('k2', b('b', 'B2', main('m2', '#ff0000', 2)))], noAncestors).length, 2);
});

test('⑪ isTabItemRow — 칸이 모두 Tab Item 인스턴스인 가로 줄은 후보 아님 · 안으로 내려가지 않음 · 하나라도 다르면 지금 처리', () => {
  const ti = (id) => ({ id, name: 'Tab Item', type: 'INSTANCE', width: 60, height: 20, tabItemMain: true, children: [] });
  const row = { id: 'row', name: 'nav', type: 'FRAME', layoutMode: 'HORIZONTAL', width: 300, height: 20, children: [ti('r0'), ti('r1'), ti('r2'), ti('r3')] };
  assert.equal(isTabItemRow(row), true);
  const root = { id: 'root', name: 'page', type: 'FRAME', width: 900, height: 600, children: [row, btnLike('b')] };
  const out = scanComponentCandidates([root]);
  assert.ok(!out.some((c) => c.id === 'row' && c.eligible));
  assert.ok(!out.some((c) => c.id.startsWith('r') && c.id !== 'root' && c.eligible));
  const mixed = { ...row, children: [...row.children.slice(0, 3), { ...ti('r3'), tabItemMain: false }] };
  assert.equal(isTabItemRow(mixed), false);
});
