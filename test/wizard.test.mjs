/* 순수 로직 단위 테스트 — `npm test`가 build 후 dist/pure.mjs를 불러온다.
   만들기 화면 실행(IA v4 §4.3)의 단계 계획(planMake) · 다크 대상 · 다 됨 문구(makeDoneText). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAKE_STEP_ORDER, planMake, makeDoneText, pickDarkTarget } from '../dist/pure.mjs';

const BASE = { isPaid: true, globalsOn: 5, stylesOn: 2, link: true, rename: false, dark: false };

test('MAKE_STEP_ORDER — 만들기 → 다크 → 텍스트 스타일 → 연결 → 이름 정리', () => {
  assert.deepEqual([...MAKE_STEP_ORDER], ['create', 'dark', 'textStyles', 'bind', 'rename']);
});

test('planMake — 유료 · 옵션대로, 텍스트 스타일은 연결보다 먼저', () => {
  assert.deepEqual(planMake({ ...BASE, rename: true, dark: true }), ['create', 'dark', 'textStyles', 'bind', 'rename']);
  assert.deepEqual(planMake(BASE), ['create', 'textStyles', 'bind']);
  assert.deepEqual(planMake({ ...BASE, link: false }), ['create', 'textStyles']);
});

test('planMake — 켠 Global 0개면 만들기 없음, 켠 스타일 0개면 텍스트 스타일 없음', () => {
  assert.deepEqual(planMake({ ...BASE, globalsOn: 0 }), ['textStyles', 'bind']);
  assert.deepEqual(planMake({ ...BASE, stylesOn: 0 }), ['create', 'bind']);
  assert.deepEqual(planMake({ ...BASE, globalsOn: 0, stylesOn: 0, link: false }), []);
});

test('planMake — 무료는 연결 · 이름 정리만', () => {
  assert.deepEqual(planMake({ ...BASE, isPaid: false, dark: true, rename: true }), ['bind', 'rename']);
  assert.deepEqual(planMake({ ...BASE, isPaid: false, link: false }), []);
});

test('pickDarkTarget — 플러그인 Semantic만(§2.13 13.7) · 출처는 Dark가 아닌 모드 · Dark 있으면 대상으로', () => {
  const light = { modeId: 'm1', name: 'Light' };
  const dark = { modeId: 'm2', name: 'Dark' };
  const vars = [
    { collectionId: 'g', collection: 'Global', owned: 'global', modes: [{ modeId: 'g1', name: 'Mode 1' }] },
    { collectionId: 'u', collection: 'Tokens', tier: 2, modes: [light, dark] }, // 사용자 Semantic — 대상 아님
    { collectionId: 's', collection: 'Semantic', owned: 'semantic', modes: [light, dark] },
  ];
  assert.deepEqual(pickDarkTarget(vars), { collectionId: 's', fromModeId: 'm1', toModeId: 'm2' });
  // 플러그인 Semantic이 없으면 건너뛴다(사용자 Semantic이 있어도)
  assert.equal(pickDarkTarget([vars[1]]), null);

  // Dark가 없으면 대상 모드를 생략한다 — 플러그인이 addMode('Dark')로 만든다.
  const noDark = [{ collectionId: 's', collection: 'Semantic', owned: 'semantic', modes: [light] }];
  assert.deepEqual(pickDarkTarget(noDark), { collectionId: 's', fromModeId: 'm1' });

  // 모드가 Dark 하나뿐이면 채울 출처가 없다.
  assert.equal(pickDarkTarget([{ collectionId: 's', collection: 'Semantic', owned: 'semantic', modes: [dark] }]), null);
  // 모드가 있는 컬렉션이 아예 없으면 null.
  assert.equal(pickDarkTarget([{ collectionId: 'g', collection: 'Global', modes: [] }]), null);
  assert.equal(pickDarkTarget([]), null);
});

test('makeDoneText — 한 단계씩 이어 붙이고, 하지 않은 부분은 뺀다', () => {
  assert.equal(makeDoneText({ created: { g: 24, r: 18, m: 0 }, bound: 97 }, { isPaid: true, linkOff: false }), 'Global 24개 · Semantic 18개 · 97곳 연결');
  assert.equal(
    makeDoneText({ created: { g: 24, r: 18, m: 2 }, darkFilled: 5, styles: { s: 3, a: 18 }, bound: 0, renamed: 6 }, { isPaid: true, linkOff: false }),
    'Global 24개 · Semantic 18개 · 다크 5개 · 텍스트 스타일 3개(글자 18개) · 0곳 연결 · 이름 6개 정리 · 직접 만든 변수라 건너뜀 2',
  );
  assert.equal(makeDoneText({ styles: { s: 3, a: 0 } }, { isPaid: true, linkOff: true }), '텍스트 스타일 3개 · 연결은 아직 안 했어요');
});

test('makeDoneText — 무료 꼬리', () => {
  assert.equal(makeDoneText({ bound: 4, renamed: 2 }, { isPaid: false, linkOff: false }), '4곳 연결 · 이름 2개 정리 · 변수는 만들지 않았어요');
  assert.equal(makeDoneText({ renamed: 2 }, { isPaid: false, linkOff: true }), '이름 2개 정리 · 변수는 만들지 않았어요 · 연결은 아직 안 했어요');
});

test('makeDoneText — 텍스트 스타일 알림은 "텍스트 스타일 {s}개" 바로 뒤 "알림 {k}개" (IA v4 §4.3 "글꼴")', () => {
  assert.equal(
    makeDoneText({ styles: { s: 2, a: 0, missing: ['a', 'b'] }, bound: 3 }, { isPaid: true, linkOff: false }),
    '텍스트 스타일 2개 · 알림 2개 · 3곳 연결',
  );
  assert.equal(makeDoneText({ styles: { s: 1, a: 0, missing: [] } }, { isPaid: true, linkOff: false }), '텍스트 스타일 1개');
});
