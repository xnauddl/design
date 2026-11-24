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
  splitFamilies,
  familyMissingVariants,
  radiusLabel,
} from '../dist/pure.mjs';

const visible = [{ visible: true, type: 'SOLID' }];
const text = (id, characters, fillHex = '#000000', extra = {}) => ({ id, name: characters, type: 'TEXT', characters, fillHex, width: 40, height: 20, fills: visible, ...extra });
const noAncestors = () => false;

/* ---------- 탭 판정 (1번) ---------- */

const menu = (id = 'menu', active = 0) => ({
  id, name: 'nav', type: 'FRAME', layoutMode: 'HORIZONTAL', width: 440, height: 20,
  children: ['About', 'Services', 'Offers', 'Seats', 'Destination '].map((c, i) => text(`${id}-${i}`, c, i === active ? '#000000' : '#7a7a7a')),
});
/** 이름에 tabs가 있는 글자 메뉴 — 글자 칸 줄은 이름이 있어야 탭(2026-11-23 C-D19). */
const tmenu = (id = 'menu', active = 0) => ({ ...menu(id, active), name: 'tabs' });
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

test('탭 판정 — 메뉴형(글자 칸 · 이름 tabs) · 알약형(틀 칸)은 탭, 버튼 · 내비 · 카드보다 먼저 · 이름 없는 글자 메뉴는 nav(C-D19)', () => {
  const pick = (t) => t && { style: t.style, selected: t.selected, selectedColor: t.selectedColor, unselectedTextColor: t.unselectedTextColor, wide: t.wide };
  assert.deepEqual(pick(tabInfo(tmenu())), { style: 'Text', selected: 0, selectedColor: '#000000', unselectedTextColor: '#7a7a7a', wide: false });
  assert.deepEqual(pick(tabInfo(pill())), { style: 'Pill', selected: 1, selectedColor: '#3d5fdb', unselectedTextColor: '#a3a3a3', wide: false });
  assert.equal(highConfidenceComponentRole(tmenu()), 'tab');
  assert.equal(highConfidenceComponentRole(pill()), 'tab');
  assert.equal(tabInfo(menu()), null, '이름 nav인 글자 메뉴는 탭이 아니다(C-D19)');
  assert.equal(tabInfo({ ...menu(), name: 'items' }), null);
  assert.equal(highConfidenceComponentRole(menu()), 'nav');
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

test('엄격한 구조 — 틀 칸은 이름 없이 탭(card 알약 · 자동 이름 Frame 3), 글자 칸은 이름이 있어야(C-D19)', () => {
  assert.equal(tabInfo({ ...pill(), name: 'Frame 3' })?.wide, false);
  assert.equal(tabInfo(pill())?.style, 'Pill');
  assert.equal(tabInfo({ ...menu(), name: 'Frame 3' }), null, '자동 이름 글자 메뉴는 탭 아님');
  assert.equal(tabInfo(tmenu(), { wide: false })?.selected, 0, '이름 있는 엄격한 글자 칸은 wide: false에서도 탭');
  assert.equal(tabInfo(menu(), { wide: false }), null, '이름 조건은 wide와 상관없이');
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
  assert.equal(highConfidenceComponentRole(tmenu(), { wideTab: false }), 'tab');
  assert.notEqual(highConfidenceComponentRole(menu(), { wideTab: false }), 'tab', '이름 없는 글자 메뉴(C-D19)');
});

/* ---------- 탭 그룹 (2번) ---------- */

test('탭 그룹 — Style마다 한 그룹(C-D20), Tab Item(State) · Tab Bar 컴포넌트, 이름 -{Style}(둘 이상 · 겹침 — C-D27)', () => {
  const groups = planRegisterGroups([tmenu(), pill()], noAncestors);
  assert.deepEqual(groups.map((g) => g.key), ['role:tab:Text', 'role:tab:Pill']);
  assert.deepEqual(groups.map((g) => g.tab.items.map((x) => x.variant)), [['State=Selected', 'State=Default'], ['State=Selected', 'State=Default']]);
  assert.deepEqual(groups.map((g) => g.tab.items.map((x) => x.cell.id)), [['menu-0', 'menu-1'], ['pill-1', 'pill-0']]);
  assert.deepEqual(groups.map((g) => g.subfamilies.map((s) => s.props)), [[{}], [{}]]);
  assert.deepEqual(resolvePlanNames(groups), ['Tab Bar-Text', 'Tab Bar-Pill']);
  assert.deepEqual(groups.map((g) => g.tab.itemName), ['Tab Item-Text', 'Tab Item-Pill']);
  const one = planRegisterGroups([pill()], noAncestors);
  assert.deepEqual(resolvePlanNames(one), ['Tab Bar']);
  assert.equal(one[0].tab.itemName, 'Tab Item');
  assert.deepEqual(resolvePlanNames(one, ['Tab Item', 'Tab Bar']), ['Tab Bar-Pill'], '이미 있으면 숫자 대신 -{Style}');
  assert.equal(one[0].tab.itemName, 'Tab Item-Pill');
  assert.deepEqual(resolvePlanNames(one, ['Tab Bar']), ['Tab Bar-Pill'], '하나만 있어도 둘 다 -{Style}');
  assert.equal(one[0].tab.itemName, 'Tab Item-Pill');
  assert.deepEqual(resolvePlanNames(one, ['Tab Item', 'Tab Item-Pill', 'Tab Bar-Pill']), ['Tab Bar-Pill 2']);
  assert.equal(one[0].tab.itemName, 'Tab Item-Pill 2');
  // 이름 없는 글자 메뉴(nav)는 탭 그룹에 안 든다 — 일반 구조어(C-D2)라 이름 그룹도 없다
  assert.deepEqual(planRegisterGroups([menu(), pill()], noAncestors).map((g) => g.key), ['role:tab:Pill']);
});

test('탭 — 선택 위치만 다른 같은 Style 바는 대표 하나 + Tab Bar 인스턴스 대상(Selected · Color 축 없음)', () => {
  const g = planRegisterGroups([tmenu('a', 0), tmenu('b', 2)], noAncestors)[0];
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
  const groups = planRegisterGroups([hero, card, tmenu()], noAncestors);
  const of = (id) => groups.find((g) => g.members.some((m) => m.id === id));
  assert.equal(defaultOnFor(of('h'), hero), true);
  assert.equal(defaultOnFor(of('menu'), tmenu()), true);
  // 이름 없는 글자 메뉴(C-D19) — 탭이 아니라 nav 단독 후보, 꺼짐
  const items = { ...menu('it'), name: 'items' };
  const g2 = planRegisterGroups([items], noAncestors);
  assert.equal(g2[0].tab, undefined);
  assert.equal(defaultOnFor(g2[0], items), false);
  assert.equal(defaultOnFor(of('c'), card), false);
  // 일반 구조어 이름(`item`)의 버튼은 그룹에 들지 않아 끔
  assert.equal(defaultOnFor(undefined, { ...hero, name: 'item' }), false);
});

test('재사용 계획 — 탭 그룹은 Tab Item · Tab Bar 키, 세트는 소가족 마스터 키를 멤버에 나눠 준다', () => {
  const tabs = planRegisterGroups([tmenu('a', 0), tmenu('b', 0), pill()], noAncestors)[0];
  const plan = reusePlanFor(tabs);
  assert.equal(plan.kind, 'tab');
  assert.equal(plan.itemKeys.length, 2, 'Style 그룹 하나(Text)');
  assert.ok(plan.itemKeys.every((k) => k.startsWith('variant:role:tab-item:')));
  assert.equal(plan.barKeys.length, 1);
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

test('채움 없는 멤버(C-D8) — 같은 테두리 · 모서리의 버튼: Color=none · Color=blue, Variant 없음 · 선만 있는 버튼은 C-D21로 다른 가족(C-D28 Style)', () => {
  const btn = (id, fill) => ({ id, name: 'cta', type: 'FRAME', layoutMode: 'HORIZONTAL', width: 80, height: 40, cornerRadius: 8, strokes: visible,
    ...(fill ? { fillHex: fill, fills: visible } : {}), children: [text(`${id}t`, 'Go', '#111111')] });
  const g = planRegisterGroups([btn('a', null), btn('b', '#2563eb')], noAncestors);
  assert.equal(g.length, 1);
  assert.deepEqual(g[0].subfamilies.map((s) => s.props), [{ Color: 'none' }, { Color: 'blue' }]);
  // 채움 버튼(선 없음) ↔ 선만 있는 버튼 — 가족 둘 → 버튼 한 세트 Style
  const solo = (id, fill) => ({ id, name: 'cta', type: 'FRAME', layoutMode: 'HORIZONTAL', width: 80, height: 40, cornerRadius: 8,
    ...(fill ? { fillHex: fill, fills: visible } : { strokes: visible }), children: [text(`${id}t`, 'Go', '#111111')] });
  const m = planRegisterGroups([solo('c', null), solo('d', '#2563eb')], noAncestors);
  assert.equal(m.length, 1);
  assert.equal(m[0].mixed, true);
  assert.deepEqual(m[0].subfamilies.map((s) => s.props), [{ Style: 'Outline' }, { Style: 'Filled' }]);
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

test('Size 축 — 여백 · 간격 차(C-D16) · 실기 버튼 셋(C-D21 · C-D28 · C-D29) → 가족 둘 · 한 세트 Radius × Size × Style', () => {
  const b = (id, fill, pt, pl, w, h, label, textHex, r) => ({ id, name: 'button', type: 'FRAME', layoutMode: 'HORIZONTAL', width: w, height: h, cornerRadius: r,
    paddingTop: pt, paddingBottom: pt, paddingLeft: pl, paddingRight: pl, itemSpacing: 8, counterAxisSpacing: 0,
    ...(fill ? { fillHex: fill, fills: visible } : { fills: [], strokes: visible }), children: [text(`${id}t`, label, textHex)] });
  const ms = [b('1', '#3D5FDB', 12, 32, 126, 44, 'Contact', '#FFFFFF', 20), b('2', null, 12, 32, 135, 47, 'View All', '#3D5FDB', 24), b('3', '#3D5FDB', 13, 24, 180, 48, 'Subscribe Now', '#FFFFFF', 20)];
  assert.deepEqual(splitFamilies(ms).map((f) => f.map((m) => m.id)), [['1', '3'], ['2']], '가족 나누기(안쪽) — 테두리 · 모서리');
  const g = planRegisterGroups(ms, noAncestors);
  assert.equal(g.length, 1);
  assert.deepEqual(g[0].subfamilies.map((s) => s.props), [
    { Size: 'md', Style: 'Filled', Radius: '20' }, { Size: 'lg', Style: 'Filled', Radius: '20' }, { Style: 'Outline', Radius: 'full', Size: 'default' }]);
  // 같은 모서리(C-D16 처음 수치 — 모두 8)면 Radius 없이 Style만, 채움 버튼 가족 안 Size
  const same = planRegisterGroups(ms.map((m) => ({ ...m, cornerRadius: 8 })), noAncestors)[0];
  assert.deepEqual(same.subfamilies.map((s) => s.props), [{ Size: 'md', Style: 'Filled' }, { Size: 'lg', Style: 'Filled' }, { Style: 'Outline', Size: 'default' }]);
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
  id, name: 'tabs', type: 'FRAME', layoutMode: 'HORIZONTAL', width: 400, height: 20, ...extra,
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

test('⑤ planTabGroup — 메뉴형 바 3(칸 5 · 5 · 4) + 알약형 1 → Style 그룹 둘(C-D20) · 둘째 칸 5 바는 Tab Bar 인스턴스 · 칸 4 바는 칸만', () => {
  const plan = planTabGroup([menuN('m1', 5), menuN('m2', 5, 1), menuN('m3', 4)]);
  assert.equal(plan.items.length, 2);
  assert.deepEqual(plan.styles.map((s) => [s.style, s.rep.id]), [['Text', 'm1']]);
  assert.deepEqual(plan.bars.map((b) => [b.bar.id, b.rep, b.asBar]), [['m1', true, false], ['m2', false, true], ['m3', false, false]]);
  assert.equal(plan.bars[2].sameCount, false);
  const gs = planRegisterGroups([menuN('m1', 5), menuN('m2', 5, 1), menuN('m3', 4), pill()], noAncestors);
  assert.deepEqual(gs.map((g) => [g.key, g.subfamilies.map((s) => [s.members[0].id, s.props])]), [['role:tab:Text', [['m1', {}]]], ['role:tab:Pill', [['pill', {}]]]]);
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
  assert.equal(tabBarRootMatches(menuN('a', 5), menuN('b', 5, 0, { strokes: visible })), false, '바 루트 테두리(C-D21 rootEdge)');
  assert.equal(tabBarRootMatches(menuN('a', 5), menuN('b', 5, 0, { cornerRadius: 8 })), false, '바 루트 모서리');
  assert.equal(tabCellMatches(c(), c({ cornerRadius: 24 })), false, '칸 모서리(C-D21)');
});

test('C-D32 tabCellMatches — 원본 칸의 아이콘 자리가 아이콘 인스턴스(iconMain)여도 날 벡터 · 아이콘 프레임 칸과 맞다(아이콘 차) · 아이콘이 아닌 인스턴스는 가른다', () => {
  const cell = (icon) => ({ id: 'c', name: 'cell', type: 'FRAME', layoutMode: 'HORIZONTAL', width: 80, height: 40, cornerRadius: 20, fillHex: '#3d5fdb', fills: visible,
    paddingLeft: 16, paddingRight: 16, children: [icon, text('ct', 'Home', '#ffffff')] });
  const vec = (key) => ({ id: 'v', name: 'Vector', type: 'VECTOR', width: 12, height: 12, vectorKey: key });
  const inst = (o) => ({ id: 'i', name: 'Vector', type: 'INSTANCE', width: 12, height: 12, mainComponentKey: 'k1', ...o });
  assert.equal(tabCellMatches(cell(inst({ iconMain: true })), cell(vec('b'))), true, '아이콘 인스턴스 ↔ 날 벡터(그림 다름)');
  assert.equal(tabCellMatches(cell(inst({ iconMain: true })), cell({ id: 'f', name: 'icon', type: 'FRAME', width: 16, height: 16, iconFrame: true, vectorKey: 'f:1', children: [] })), true, '↔ 아이콘 프레임');
  assert.equal(tabCellMatches(cell(inst({})), cell(vec('b'))), false, '아이콘이 아닌 인스턴스 ↔ 날 벡터');
  assert.equal(tabCellMatches(cell(inst({ iconMain: true })), cell({ ...vec('b'), visible: false })), false, '보이기가 다르면 가른다');
});

test('⑨ resolvePlanNames — Tab Item · Tab Bar, 문서에 있으면 -{Style}(C-D27), 이름 그룹 "Tab"과 같이 있어도 겹치지 않음', () => {
  const tabNamed = (id) => ({ id, name: 'Tab', type: 'FRAME', layoutMode: 'HORIZONTAL', width: 80, height: 32, cornerRadius: 4, fillHex: '#ffffff', fills: visible, children: [text(`${id}t`, 'Go')] });
  const groups = planRegisterGroups([tabNamed('x'), menuN('m', 5)], noAncestors);
  const names = resolvePlanNames(groups);
  assert.deepEqual(names.sort(), ['Tab', 'Tab Bar']);
  assert.equal(groups.find((g) => g.tab).tab.itemName, 'Tab Item');
  const again = planRegisterGroups([menuN('m', 5)], noAncestors);
  assert.deepEqual(resolvePlanNames(again, ['Tab Item', 'Tab Bar', 'Tab Bar-Text']), ['Tab Bar-Text 2']);
  assert.equal(again[0].tab.itemName, 'Tab Item-Text');
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

/* ---------- A.27 버튼 · 칩 한 세트(C-D28) · Radius(C-D29) · 이어 붙인 Color(C-D30) · 같은 가족 안 빈 변형(C-D31) ---------- */

const strokeOn = [{ visible: true, type: 'SOLID' }];
/** `DSL 등록 품질` 실기 수치 — 앱 다운로드(자식 3 · 화살표 숨김) · Contact · View All · Subscribe Now. */
const appBtn = (id) => ({ id, name: 'button', type: 'FRAME', layoutMode: 'HORIZONTAL', width: 76, height: 30, cornerRadius: 4, fills: [], strokes: strokeOn,
  paddingTop: 6, paddingRight: 8, paddingBottom: 8, paddingLeft: 8, itemSpacing: 2,
  children: [{ id: `${id}a`, name: 'arrow_left', type: 'FRAME', width: 13, height: 13, visible: false, children: [] }, text(`${id}t`, '앱다운로드', '#000000'), { id: `${id}b`, name: 'arro_right', type: 'FRAME', width: 13, height: 13, visible: false, children: [] }] });
const solidBtn = (id, label, w, h, pt, pl, r) => ({ id, name: 'button', type: 'FRAME', layoutMode: 'HORIZONTAL', width: w, height: h, cornerRadius: r, fillHex: '#3d5fdb', fills: visible,
  paddingTop: pt, paddingBottom: pt, paddingLeft: pl, paddingRight: pl, itemSpacing: 10, children: [text(`${id}t`, label, '#ffffff')] });
const outlineBtn = (id, label, w, h, r) => ({ id, name: 'button', type: 'FRAME', layoutMode: 'HORIZONTAL', width: w, height: h, cornerRadius: r, fills: [], strokes: strokeOn,
  paddingTop: 12, paddingBottom: 12, paddingLeft: 32, paddingRight: 32, itemSpacing: 10, children: [text(`${id}t`, label, '#000000')] });
const flightinButtons = () => [appBtn('a1'), appBtn('a2'), solidBtn('c', 'Contact', 126, 44, 12, 32, 20), outlineBtn('v', 'View All', 135, 47, 24), solidBtn('s', 'Subscribe Now', 180, 48, 13, 24, 20)];

test('C-D28 · C-D29 — 실기 버튼 넷 → 한 세트 변형 4: Radius 4 · 20 · full, Style Outline · Filled, 없는 축 default, 빈 변형 0(C-D31)', () => {
  const ms = flightinButtons();
  assert.deepEqual(splitFamilies(ms).map((f) => f.map((m) => m.id)), [['a1', 'a2'], ['c', 's'], ['v']]);
  const gs = planRegisterGroups(ms, noAncestors);
  assert.equal(gs.length, 1);
  const g = gs[0];
  assert.equal(g.mixed, true);
  assert.equal(g.typeIndex, undefined);
  assert.deepEqual(g.subfamilies.map((sf) => [sf.members.map((m) => m.id), sf.props]), [
    [['a1', 'a2'], { Radius: '4', Size: 'default', Style: 'Outline' }],
    [['c'], { Radius: '20', Size: 'md', Style: 'Filled' }],
    [['s'], { Radius: '20', Size: 'lg', Style: 'Filled' }],
    [['v'], { Radius: 'full', Size: 'default', Style: 'Outline' }],
  ]);
  assert.deepEqual(resolvePlanNames(gs), ['Button']);
  assert.deepEqual(familyMissingVariants(g), [], '가족끼리 섞은 조합(속성 곱이면 14)은 세지 않는다');
  assert.equal(defaultOnFor(g, ms[3]), true);
  // 재사용 계획 — 멤버마다 소가족 마스터의 변형 키, 서로 다른 키 4
  const plan = reusePlanFor(g);
  assert.equal(plan.kind, 'variant');
  assert.equal(new Set(plan.keys).size, 4);
});

test('C-D29 — Radius 값: 숫자 · full(높이 절반 이상) · 섞인 모서리 네 값 · 0, 표시 값이 같고 구조만 다르면 Style -2', () => {
  assert.equal(radiusLabel({ cornerRadius: 4, height: 30 }), '4');
  assert.equal(radiusLabel({ cornerRadius: 20, height: 44 }), '20');
  assert.equal(radiusLabel({ cornerRadius: 24, height: 47 }), 'full');
  assert.equal(radiusLabel({ cornerRadius: Symbol('mixed'), topLeftRadius: 8, topRightRadius: 8, bottomRightRadius: 0, bottomLeftRadius: 0, height: 40 }), '8-8-0-0');
  assert.equal(radiusLabel({ cornerRadius: 0, height: 2 }), '0');
  // 칠 · 선 · 모서리가 같고 자식 수만 다른 두 버튼 → Style Outline · Outline-2(Radius 없음)
  const one = outlineBtn('x', 'Go', 80, 40, 8);
  const two = { ...outlineBtn('y', 'Go', 80, 40, 8), children: [text('y1', 'Go', '#000000'), text('y2', '>', '#000000')] };
  const g = planRegisterGroups([one, two], noAncestors)[0];
  assert.deepEqual(g.subfamilies.map((sf) => sf.props), [{ Style: 'Outline' }, { Style: 'Outline-2' }]);
  // 모서리 숫자는 달라도 둘 다 full → 표시 값이 같아 -2
  const p1 = outlineBtn('p', 'Go', 80, 40, 20);
  const p2 = outlineBtn('q', 'Go', 80, 40, 100);
  const g2 = planRegisterGroups([p1, p2], noAncestors)[0];
  assert.deepEqual(g2.subfamilies.map((sf) => sf.props), [{ Style: 'Outline' }, { Style: 'Outline-2' }]);
});

test('C-D21 — 섞인 모서리는 네 값을 견준다 · 날 벡터의 선 · 모서리는 보지 않는다', () => {
  const mixedCard = (id, br) => ({ id, name: 'promo', type: 'FRAME', width: 200, height: 100, fillHex: '#ffffff', fills: visible, cornerRadius: Symbol('mixed'),
    topLeftRadius: 8, topRightRadius: 8, bottomRightRadius: br, bottomLeftRadius: 0, children: [text(`${id}t`, 'A'), text(`${id}u`, 'B')] });
  assert.equal(splitFamilies([mixedCard('a', 0), mixedCard('b', 0)]).length, 1);
  assert.equal(splitFamilies([mixedCard('a', 0), mixedCard('b', 8)]).length, 2);
  const withVec = (id, stroke) => ({ id, name: 'promo', type: 'FRAME', width: 200, height: 100, fillHex: '#ffffff', fills: visible, cornerRadius: 8,
    children: [text(`${id}t`, 'A'), { id: `${id}v`, name: 'line', type: 'LINE', width: 100, height: 0, vectorKey: 'l', ...(stroke ? { strokes: strokeOn } : {}) }] });
  assert.equal(splitFamilies([withVec('a', true), withVec('b', false)]).length, 1);
});

test('C-D30 — 버튼 그룹은 함께 바뀜에 걸려도 나누지 않고 이어 붙인 Color · 카드 그룹은 지금처럼 나뉨 · 배경 같고 글자만 다르면 글자색 축', () => {
  const b = (id, bg, fg) => ({ id, name: 'cta', type: 'FRAME', layoutMode: 'HORIZONTAL', width: 80, height: 40, cornerRadius: 8, fillHex: bg, fills: visible, children: [text(`${id}t`, 'Go', fg)] });
  const ms = [b('a', '#3d5fdb', '#ffffff'), b('b', '#3d5fdb', '#7a7a7a'), b('c', '#f97316', '#ffffff')];
  const g = planRegisterGroups(ms, noAncestors);
  assert.equal(g.length, 1);
  assert.equal(g[0].families, undefined, '구조 가족 하나 — 함께 바뀜으로 나누지 않음');
  assert.equal(g[0].subfamilies.length, 3);
  assert.equal(g[0].subfamilies[0].props.Color, 'indigo-gray-0', '배경 이름 · 글자 이름(흰색은 gray-0)');
  assert.ok(g[0].subfamilies[1].props.Color.startsWith('indigo-gray-'));
  assert.ok(g[0].subfamilies[2].props.Color.endsWith('-gray-0') && !g[0].subfamilies[2].props.Color.startsWith('indigo'));
  // 같은 수치의 카드 그룹 — 지금처럼 가족 셋
  const card = (id, bg, fg) => ({ id, name: 'promo', type: 'FRAME', width: 200, height: 100, cornerRadius: 8, fillHex: bg, fills: visible, children: [text(`${id}t`, 'A', fg), text(`${id}u`, 'B', fg)] });
  assert.equal(planRegisterGroups([card('a', '#3d5fdb', '#ffffff'), card('b', '#3d5fdb', '#7a7a7a'), card('c', '#f97316', '#ffffff')], noAncestors).length, 3);
  // 배경만 같고 글자색만 다름 — 검사에 걸리지 않아 글자색 Color 축
  const g2 = planRegisterGroups([b('x', '#3d5fdb', '#ffffff'), b('y', '#3d5fdb', '#7a7a7a')], noAncestors)[0];
  assert.ok(g2.subfamilies.every((sf) => !String(sf.props.Color).startsWith('indigo')), JSON.stringify(g2.subfamilies.map((sf) => sf.props)));
});

test('C-D31 — 같은 가족 안 빈칸만: 채움 버튼 가족 Color 2 × Size 2에 하나 빠짐 → 그 하나, Variant는 곱하지 않음, 세트가 아니면 빈 목록', () => {
  const b = (id, bg, w, pad) => ({ id, name: 'cta', type: 'FRAME', layoutMode: 'HORIZONTAL', width: w, height: 40, cornerRadius: 8, fillHex: bg, fills: visible,
    paddingLeft: pad, paddingRight: pad, children: [text(`${id}t`, 'Go', '#ffffff')] });
  const g = planRegisterGroups([b('a', '#3d5fdb', 80, 8), b('b', '#3d5fdb', 120, 16), b('c', '#f97316', 80, 8)], noAncestors)[0];
  const miss = familyMissingVariants(g);
  assert.equal(miss.length, 1);
  assert.ok(miss[0].includes('Size=lg'), miss[0]);
  assert.deepEqual(familyMissingVariants({ key: 'k', members: [], nameGroupSize: 2, nameMembers: [], subfamilies: [{ members: [], master: 0, props: { Size: 'md', Variant: '1' } }, { members: [], master: 0, props: { Size: 'lg', Variant: '2' } }] }), []);
  assert.deepEqual(familyMissingVariants({ key: 'k', members: [], nameGroupSize: 1, nameMembers: [], subfamilies: [{ members: [], master: 0, props: {} }] }), []);
});
