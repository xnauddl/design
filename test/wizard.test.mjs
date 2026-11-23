/* 순수 로직 단위 테스트 — `npm test`가 build 후 dist/pure.mjs를 불러온다.
   만들기 화면 실행(IA v4 §4.3)의 단계 계획(planMake) · 다크 대상 · 다 됨 문구(makeDoneText). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAKE_STEP_ORDER, planMake, makeDoneText, makeCreatedText } from '../dist/pure.mjs';

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

test('planMake — 무료도 만들기(Global만) · 다크 · 텍스트 스타일은 없음 (무료 규칙 F4)', () => {
  assert.deepEqual(planMake({ ...BASE, isPaid: false, dark: true, rename: true }), ['create', 'bind', 'rename']);
  assert.deepEqual(planMake({ ...BASE, isPaid: false, link: false }), ['create']);
  assert.deepEqual(planMake({ ...BASE, isPaid: false, globalsOn: 0, link: false }), []);
});

test('makeDoneText — 한 단계씩 이어 붙이고, 하지 않은 부분은 뺀다', () => {
  assert.equal(makeDoneText({ created: { g: 24, r: 18, m: 0 }, bound: 97 }, { isPaid: true, linkOff: false }), 'Global 24개 · Semantic 18개 · 97곳 연결');
  assert.equal(
    makeDoneText({ created: { g: 24, r: 18, m: 2 }, darkFilled: 5, styles: { s: 3, a: 18 }, bound: 0, renamed: 6 }, { isPaid: true, linkOff: false }),
    'Global 24개 · Semantic 18개 · 다크 5개 · 텍스트 스타일 3개(글자 18개) · 0곳 연결 · 이름 6개 정리 · 직접 만든 변수라 건너뜀 2',
  );
  assert.equal(makeDoneText({ styles: { s: 3, a: 0 } }, { isPaid: true, linkOff: true }), '텍스트 스타일 3개 · 연결은 아직 안 했어요');
});

test('makeDoneText — 무료는 만들기 부분 "Global {g}개" · 무료 꼬리 없음 (무료 규칙 F4)', () => {
  assert.equal(makeDoneText({ created: { g: 12, r: 4, m: 0 }, bound: 85 }, { isPaid: false, linkOff: false }), 'Global 12개 · 85곳 연결');
  assert.equal(makeDoneText({ bound: 4, renamed: 2 }, { isPaid: false, linkOff: false }), '4곳 연결 · 이름 2개 정리');
  assert.equal(makeDoneText({ renamed: 2 }, { isPaid: false, linkOff: true }), '이름 2개 정리 · 연결은 아직 안 했어요');
  assert.equal(makeCreatedText({ g: 3, r: 1 }, false), 'Global 3개');
  assert.equal(makeCreatedText({ g: 3, r: 1 }, true), 'Global 3개 · Semantic 1개');
});

test('makeDoneText — 텍스트 스타일 알림은 "텍스트 스타일 {s}개" 바로 뒤 "알림 {k}개" (IA v4 §4.3 "글꼴")', () => {
  assert.equal(
    makeDoneText({ styles: { s: 2, a: 0, missing: ['a', 'b'] }, bound: 3 }, { isPaid: true, linkOff: false }),
    '텍스트 스타일 2개 · 알림 2개 · 3곳 연결',
  );
  assert.equal(makeDoneText({ styles: { s: 1, a: 0, missing: [] } }, { isPaid: true, linkOff: false }), '텍스트 스타일 1개');
});

test('A.18 결정 B — makeDoneText에 메인 컴포넌트 부분이 없다(메인 수는 카드 1 ✓ 아래 줄만)', () => {
  const s = makeDoneText({ created: { g: 2, r: 1, m: 0 }, styles: { s: 1, a: 3 }, bound: 5, mainsBound: ['a', 'b'] }, { isPaid: true, linkOff: false });
  assert.ok(!s.includes('메인'), s);
});
