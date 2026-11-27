/* 순수 로직 단위 테스트 — `npm test`가 build 후 dist/pure.mjs를 불러온다.
   만들기 화면 실행(IA v4 §4.3)의 단계 계획(planMake) · 다크 대상 · 다 됨 문구(makeDoneText). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAKE_STEP_ORDER, planMake, makeDoneText, makeCreatedText, hasDarkTarget, darkResultText } from '../dist/pure.mjs';

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

test('hasDarkTarget — 플러그인 Global이 있으면 참(모드는 고르지 않음 — ia-v3 13.7 D-T1)', () => {
  const light = { modeId: 'm1', name: 'Light' };
  const dark = { modeId: 'm2', name: 'Dark' };
  assert.equal(hasDarkTarget([{ collectionId: 'g', collection: 'Global', owned: 'global', modes: [{ modeId: 'g1', name: 'Mode 1' }] }]), true);
  // 플러그인 Semantic · 사용자 컬렉션만 있으면 거짓(모드가 있어도)
  assert.equal(hasDarkTarget([
    { collectionId: 's', collection: 'Semantic', owned: 'semantic', modes: [light, dark] },
    { collectionId: 'u', collection: 'Primitives', tier: 1, modes: [light] },
  ]), false);
  assert.equal(hasDarkTarget([]), false);
});

test('darkResultText — 채움 · 그대로 둠 · 이미 채움 · 대상 없음', () => {
  assert.deepEqual(darkResultText({ filled: 32, kept: 3, targets: 40 }), { text: 'Global 색 32개의 Dark 칸을 채웠어요 · 직접 고친 색 3개는 그대로 뒀어요', cls: 'ok' });
  assert.deepEqual(darkResultText({ filled: 5, kept: 0, targets: 5, modeCreated: true }), { text: '다크 모드 추가 · Global 색 5개의 Dark 칸을 채웠어요', cls: 'ok' });
  assert.deepEqual(darkResultText({ filled: 0, kept: 0, targets: 5 }), { text: 'Dark 칸이 모두 채워져 있어요', cls: 'ok' });
  assert.deepEqual(darkResultText({ filled: 0, kept: 2, targets: 5 }), { text: 'Dark 칸이 모두 채워져 있어요 · 직접 고친 색 2개는 그대로 뒀어요', cls: 'ok' });
  assert.deepEqual(darkResultText({ filled: 0, kept: 0, targets: 0 }), { text: '채울 색이 없어요 — 플러그인 Global에 값을 넣은 색 변수가 필요해요', cls: 'warn' });
});

test('darkResultText — 옮기기 줄(0 부분 생략) · 툴팁 묶음 · c > 0이면 warn · 대상 0이어도 옮기기 줄', () => {
  const m = (o) => ({ moved: 0, split: 0, failed: 0, splitNames: [], failedNames: [], removedDark: 0, ...o });
  const r = darkResultText({ filled: 14, kept: 0, targets: 32, modeCreated: true, migrated: m({ moved: 18, split: 2, failed: 2, splitNames: ['color/gray/100', 'color/blue/500'], failedNames: ['text/brand', 'border/focus'], removedDark: 24 }) });
  assert.equal(r.text, '다크 구조를 옮겼어요(옮긴 색 18개 · 값이 갈린 색 2개 · 옮기지 못한 역할 2개) · 다크 모드 추가 · Global 색 14개의 Dark 칸을 채웠어요');
  assert.equal(r.cls, 'warn');
  assert.equal(r.tip, '값이 갈린 색 — 가장 많이 쓴 값으로 옮겼어요:\ncolor/gray/100\ncolor/blue/500\n\n옮기지 못한 역할 — Dark에서 바뀌지 않아요:\ntext/brand\nborder/focus\n\n지운 dark/ 색 24개');
  // b · c 0 → 그 부분 생략 · 툴팁은 있는 묶음만 · ok
  const r2 = darkResultText({ filled: 0, kept: 0, targets: 4, migrated: m({ moved: 4, removedDark: 3 }) });
  assert.deepEqual(r2, { text: '다크 구조를 옮겼어요(옮긴 색 4개) · Dark 칸이 모두 채워져 있어요', cls: 'ok', tip: '지운 dark/ 색 3개' });
  // 옮긴 색 0 · 모두 실패 · 대상 0 → 옮기기 줄이 붙은 nothing, warn
  const r3 = darkResultText({ filled: 0, kept: 0, targets: 0, migrated: m({ failed: 1, failedNames: ['bg'] }) });
  assert.equal(r3.text, '다크 구조를 옮겼어요(옮긴 색 0개 · 옮기지 못한 역할 1개) · 채울 색이 없어요 — 플러그인 Global에 값을 넣은 색 변수가 필요해요');
  assert.equal(r3.cls, 'warn');
  assert.equal(r3.tip, '옮기지 못한 역할 — Dark에서 바뀌지 않아요:\nbg');
  // 툴팁 없음이면 tip 필드 없음
  assert.equal('tip' in darkResultText({ filled: 1, kept: 0, targets: 1, migrated: m({ moved: 1 }) }), false);
});

test('makeDoneText — 한 단계씩 이어 붙이고, 하지 않은 부분은 뺀다', () => {
  assert.equal(makeDoneText({ created: { g: 24, r: 18, m: 0 }, bound: 97 }, { isPaid: true, linkOff: false }), 'Global 24개 · Semantic 18개를 만들고 97곳에 연결했어요');
  assert.equal(
    makeDoneText({ created: { g: 24, r: 18, m: 2 }, darkFilled: 5, styles: { s: 3, a: 18 }, bound: 0, renamed: 6 }, { isPaid: true, linkOff: false }),
    'Global 24개 · Semantic 18개를 만들었어요 · 다크 5개 · 텍스트 스타일 3개(글자 18개) · 변수를 연결한 곳은 없어요 · 이름 6개 정리 · 직접 만든 변수라 건너뜀 2',
  );
  assert.equal(makeDoneText({ styles: { s: 3, a: 0 } }, { isPaid: true, linkOff: true }), '텍스트 스타일 3개 · 연결은 아직 안 했어요');
});

test('makeDoneText — 무료는 만들기 부분 "Global {g}개" · 무료 꼬리 없음 (무료 규칙 F4)', () => {
  assert.equal(makeDoneText({ created: { g: 12, r: 4, m: 0 }, bound: 85 }, { isPaid: false, linkOff: false }), 'Global 변수 12개를 만들고 85곳에 연결했어요');
  assert.equal(makeDoneText({ bound: 4, renamed: 2 }, { isPaid: false, linkOff: false }), '4곳에 연결했어요 · 이름 2개 정리');
  assert.equal(makeDoneText({ renamed: 2 }, { isPaid: false, linkOff: true }), '이름 2개 정리 · 연결은 아직 안 했어요');
  assert.equal(makeCreatedText({ g: 3, r: 1 }, false), 'Global 3개');
  assert.equal(makeCreatedText({ g: 3, r: 1 }, true), 'Global 3개 · Semantic 1개');
});

test('makeDoneText — 텍스트 스타일 알림은 "텍스트 스타일 {s}개" 바로 뒤 "알림 {k}개" (IA v4 §4.3 "글꼴")', () => {
  assert.equal(
    makeDoneText({ styles: { s: 2, a: 0, missing: ['a', 'b'] }, bound: 3 }, { isPaid: true, linkOff: false }),
    '3곳에 연결했어요 · 텍스트 스타일 2개 · 알림 2개',
  );
  assert.equal(makeDoneText({ styles: { s: 1, a: 0, missing: [] } }, { isPaid: true, linkOff: false }), '텍스트 스타일 1개');
});

test('A.18 결정 B — makeDoneText에 메인 컴포넌트 부분이 없다(메인 수는 카드 1 ✓ 아래 줄만)', () => {
  const s = makeDoneText({ created: { g: 2, r: 1, m: 0 }, styles: { s: 1, a: 3 }, bound: 5, mainsBound: ['a', 'b'] }, { isPaid: true, linkOff: false });
  assert.ok(!s.includes('메인'), s);
});

test('makeDoneText — B.35 연결 부분: n > 0 꼬리 · n = 0 · t > 0 독립 · 건너뜀 · 돌린 0 · 0은 "0곳 연결"', () => {
  const o = { isPaid: true, linkOff: false };
  assert.equal(makeDoneText({ created: { g: 1, r: 1, m: 0 }, bound: 15, tsBound: 9 }, o), 'Global 1개 · Semantic 1개를 만들고 15곳 · Text Style 9곳에 연결했어요');
  assert.equal(makeDoneText({ created: { g: 1, r: 1, m: 0 }, bound: 0, tsBound: 9 }, o), 'Global 1개 · Semantic 1개를 만들고 Text Style 9곳에 연결했어요');
  assert.equal(makeDoneText({ created: { g: 1, r: 1, m: 0 }, tsBound: 9 }, o), 'Global 1개 · Semantic 1개를 만들고 Text Style 9곳에 연결했어요'); // 변수 연결 건너뜀
  assert.equal(makeDoneText({ created: { g: 1, r: 1, m: 0 }, bound: 0 }, o), 'Global 1개 · Semantic 1개를 만들었어요 · 변수를 연결한 곳은 없어요');
  assert.equal(makeDoneText({ created: { g: 1, r: 1, m: 0 } }, o), 'Global 1개 · Semantic 1개를 만들었어요'); // 건너뜀 · 스타일 0
});

// S-2(ia-v4 §2.9 "결과 문장") — 만든 것이 없으면 만들기 부분을 뺀다: g = 0 · r = 0이면 빼고, g = 0 · r > 0이면 "Semantic {r}개", 무료 g = 0이면 뺀다.
test('DS-3b S3-D16 makeDoneText — 문장형 예 표(ia-v4 §4.1b) 10줄', () => {
  const P = { isPaid: true, linkOff: false };
  const F = { isPaid: false, linkOff: false };
  assert.equal(makeDoneText({ created: { g: 5, r: 0, m: 0 }, bound: 97 }, F), 'Global 변수 5개를 만들고 97곳에 연결했어요');
  assert.equal(makeDoneText({ created: { g: 24, r: 18, m: 0 }, bound: 97, styles: { s: 2, a: 0 }, renamed: 3 }, P), 'Global 24개 · Semantic 18개를 만들고 97곳에 연결했어요 · 텍스트 스타일 2개 · 이름 3개 정리');
  assert.equal(makeDoneText({ created: { g: 0, r: 4, m: 0 }, bound: 12 }, P), 'Semantic 변수 4개를 만들고 12곳에 연결했어요');
  assert.equal(makeDoneText({ created: { g: 1, r: 1, m: 0 }, bound: 15, tsBound: 9 }, P), 'Global 1개 · Semantic 1개를 만들고 15곳 · Text Style 9곳에 연결했어요');
  assert.equal(makeDoneText({ created: { g: 1, r: 1, m: 0 }, bound: 0, tsBound: 9 }, P), 'Global 1개 · Semantic 1개를 만들고 Text Style 9곳에 연결했어요');
  assert.equal(makeDoneText({ created: { g: 1, r: 1, m: 0 }, bound: 0 }, P), 'Global 1개 · Semantic 1개를 만들었어요 · 변수를 연결한 곳은 없어요');
  assert.equal(makeDoneText({ created: { g: 5, r: 0, m: 0 } }, { isPaid: false, linkOff: true }), 'Global 변수 5개를 만들었어요 · 연결은 아직 안 했어요');
  assert.equal(makeDoneText({ bound: 4, renamed: 2 }, F), '4곳에 연결했어요 · 이름 2개 정리');
  assert.equal(makeDoneText({ created: { g: 24, r: 18, m: 2 }, darkFilled: 5, styles: { s: 3, a: 18, missing: ['x'] }, bound: 0, renamed: 6 }, P), 'Global 24개 · Semantic 18개를 만들었어요 · 다크 5개 · 텍스트 스타일 3개(글자 18개) · 알림 1개 · 변수를 연결한 곳은 없어요 · 이름 6개 정리 · 직접 만든 변수라 건너뜀 2');
  assert.equal(makeDoneText({ styles: { s: 3, a: 0 } }, { isPaid: true, linkOff: true }), '텍스트 스타일 3개 · 연결은 아직 안 했어요');
});

test('S-2 makeDoneText · makeCreatedText — g = 0이면 만들기 부분을 빼거나 "Semantic {r}개"만', () => {
  const paid = { isPaid: true, linkOff: false };
  const free = { isPaid: false, linkOff: false };
  assert.equal(makeDoneText({ created: { g: 0, r: 1, m: 0 }, bound: 3 }, paid), 'Semantic 변수 1개를 만들고 3곳에 연결했어요'); // 예 (나) 유료
  assert.equal(makeDoneText({ created: { g: 0, r: 1, m: 0 }, bound: 3 }, free), '3곳에 연결했어요'); // 예 (나) 무료
  assert.equal(makeDoneText({ created: { g: 0, r: 0, m: 0 }, bound: 2 }, paid), '2곳에 연결했어요'); // 예 (다)
  assert.equal(makeDoneText({ created: { g: 2, r: 2, m: 0 }, bound: 5 }, paid), 'Global 2개 · Semantic 2개를 만들고 5곳에 연결했어요'); // 예 (가)
  assert.equal(makeDoneText({ created: { g: 2, r: 0, m: 0 }, bound: 5 }, paid), 'Global 변수 2개를 만들고 5곳에 연결했어요'); // 유료 r = 0은 무료와 같은 글(S3-D16)
  assert.equal(makeCreatedText({ g: 0, r: 0 }, true), '');
  assert.equal(makeCreatedText({ g: 0, r: 3 }, true), 'Semantic 3개');
  assert.equal(makeCreatedText({ g: 0, r: 3 }, false), '');
  // 직접 만든 변수라 건너뛴 수는 만들기 부분이 빠져도 남는다
  assert.equal(makeDoneText({ created: { g: 0, r: 0, m: 1 }, bound: 1 }, paid), '1곳에 연결했어요 · 직접 만든 변수라 건너뜀 1');
});

test('makeDoneText — Global에서 바꾼 자리는 머리 문장 바로 뒤 · 나머지 부분 맨 앞(다크 앞) "Global 연결 {k}곳은 Semantic으로 바꿨어요" (ia-v4 §2.9a — SC-D58)', () => {
  assert.equal(
    makeDoneText({ created: { g: 2, r: 1, m: 0 }, bound: 5, swapped: 3, darkFilled: 2 }, { isPaid: true, linkOff: false }),
    'Global 2개 · Semantic 1개를 만들고 5곳에 연결했어요 · Global 연결 3곳은 Semantic으로 바꿨어요 · 다크 2개',
  );
  assert.equal(makeDoneText({ bound: 4, swapped: 0 }, { isPaid: true, linkOff: false }), makeDoneText({ bound: 4 }, { isPaid: true, linkOff: false }), 'k = 0이면 없음');
});
