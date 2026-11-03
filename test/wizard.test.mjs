/* 순수 로직 단위 테스트 — `npm test`가 build 후 dist/pure.mjs를 불러온다.
   시스템화 마법사의 단계 계획(planWizard)·완료 요약(summarize) 검증. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WIZARD_STEPS, planWizard, summarize, pickDarkTarget } from '../dist/pure.mjs';

const ALL_ON = { semantics: true, dark: true, textStyles: true, componentize: true };
const ALL_OFF = { semantics: false, dark: false, textStyles: false, componentize: false };
const PAID_MAP = { isPaid: true, hasSemanticMap: true };

/** 헬퍼: 계획에서 실제 실행되는 단계 id 목록. */
const runIds = (plan) => plan.filter((p) => p.run).map((p) => p.step.id);
/** 헬퍼: 특정 단계 항목. */
const item = (plan, id) => plan.find((p) => p.step.id === id);

test('WIZARD_STEPS — 순서와 필수/선택 분류', () => {
  assert.deepEqual(
    WIZARD_STEPS.map((s) => s.id),
    ['extract', 'create', 'semantics', 'dark', 'textStyles', 'bind', 'rename', 'componentize'],
  );
  // 필수: 추출·생성·바인딩·리네임. 선택: 시맨틱·다크·텍스트 스타일·컴포넌트화.
  const required = WIZARD_STEPS.filter((s) => !s.optional).map((s) => s.id);
  assert.deepEqual(required, ['extract', 'create', 'bind', 'rename']);
  const optional = WIZARD_STEPS.filter((s) => s.optional).map((s) => s.id);
  assert.deepEqual(optional, ['semantics', 'dark', 'textStyles', 'componentize']);
  // Paid 단계 — 변수·스타일·컴포넌트를 '만드는' 단계. Free 경계(ROADMAP §5)와 같아야 한다.
  const paid = WIZARD_STEPS.filter((s) => s.paid).map((s) => s.id);
  assert.deepEqual(paid, ['create', 'semantics', 'dark', 'textStyles', 'componentize']);
  // 바인딩이 리네임보다 앞(토큰 경로명 의존).
  const ids = WIZARD_STEPS.map((s) => s.id);
  assert.ok(ids.indexOf('bind') < ids.indexOf('rename'));
  // 다크는 시맨틱 뒤 — Global 별칭이 있어야 채울 대상이 생긴다.
  assert.ok(ids.indexOf('semantics') < ids.indexOf('dark'));
  // 만드는 단계는 모두 토큰 생성 뒤.
  assert.ok(ids.indexOf('create') < ids.indexOf('dark'));
  assert.ok(ids.indexOf('create') < ids.indexOf('textStyles'));
});

test('planWizard — 모든 옵션 ON + Paid + 매핑 있음 → 전 단계 실행', () => {
  const plan = planWizard(ALL_ON, PAID_MAP);
  assert.deepEqual(runIds(plan), ['extract', 'create', 'semantics', 'dark', 'textStyles', 'bind', 'rename', 'componentize']);
});

test('planWizard — 다크·텍스트 스타일은 옵션으로만 돈다(기본 꺼짐 상태)', () => {
  const plan = planWizard({ ...ALL_OFF, semantics: true }, PAID_MAP);
  assert.equal(item(plan, 'dark').run, false);
  assert.equal(item(plan, 'dark').skipReason, 'wizard.skip.optionOff');
  assert.equal(item(plan, 'textStyles').run, false);
  assert.equal(item(plan, 'textStyles').skipReason, 'wizard.skip.optionOff');
});

test('planWizard — 모든 선택 OFF → 필수 4단계만', () => {
  const plan = planWizard(ALL_OFF, PAID_MAP);
  assert.deepEqual(runIds(plan), ['extract', 'create', 'bind', 'rename']);
  assert.equal(item(plan, 'semantics').skipReason, 'wizard.skip.optionOff');
  assert.equal(item(plan, 'componentize').skipReason, 'wizard.skip.optionOff');
});

test('planWizard — 시맨틱 옵션 ON이지만 매핑 없음 → 건너뜀', () => {
  const plan = planWizard(ALL_ON, { isPaid: true, hasSemanticMap: false });
  assert.equal(item(plan, 'semantics').run, false);
  assert.equal(item(plan, 'semantics').skipReason, 'wizard.skip.noMapping');
  assert.ok(!runIds(plan).includes('semantics'));
});

test('planWizard — Free면 만드는 단계(생성·시맨틱·컴포넌트화)를 전부 건너뛴다', () => {
  const plan = planWizard(ALL_ON, { isPaid: false, hasSemanticMap: true });
  for (const id of ['create', 'semantics', 'dark', 'textStyles', 'componentize']) {
    assert.equal(item(plan, id).run, false, id);
    assert.equal(item(plan, id).skipReason, 'wizard.skip.paid', id);
  }
  // Free도 완주해야 하는 단계 — 추출·바인딩·리네임(기존 변수에 붙이고 이름만 정돈).
  assert.deepEqual(runIds(plan), ['extract', 'bind', 'rename']);
});

test('planWizard — Free라도 끄고 시작한 선택 단계는 Paid가 아니라 옵션 꺼짐', () => {
  // UI가 skipReason='wizard.skip.paid'인 단계에 자물쇠 칩을 그린다 — 안 켠 단계까지 'Paid 전용'으로
  // 적으면 살 생각도 없던 기능이 잠금으로 세어져 파이프가 자물쇠로 뒤덮인다.
  const plan = planWizard(ALL_OFF, { isPaid: false, hasSemanticMap: true });
  assert.equal(item(plan, 'semantics').skipReason, 'wizard.skip.optionOff');
  assert.equal(item(plan, 'componentize').skipReason, 'wizard.skip.optionOff');
  // 필수 단계인 '생성'은 끌 수 없으므로 그대로 Paid — 자물쇠 칩은 이것 하나만 뜬다.
  assert.equal(item(plan, 'create').skipReason, 'wizard.skip.paid');
  assert.deepEqual(runIds(plan), ['extract', 'bind', 'rename']);
});

test('summarize — 집계가 있는 항목만 표시', () => {
  assert.equal(
    summarize({ created: 12, bound: 30, renamed: 8, components: 3 }),
    '토큰 12 · 연결 30 · 이름 8 · 컴포넌트 3',
  );
});

test('summarize — 컴포넌트 0은 생략, 빈 집계는 안내 문구', () => {
  assert.equal(summarize({ created: 4, components: 0 }), '토큰 4');
  assert.equal(summarize({}), '완료된 작업이 없습니다');
});

test('summarize — 다크·텍스트 스타일은 0이면 생략(안 돈 단계와 구분)', () => {
  assert.equal(summarize({ created: 4, darkFilled: 9, textStyles: 5, bound: 12 }), '토큰 4 · 다크 9 · 텍스트 스타일 5 · 연결 12');
  assert.equal(summarize({ created: 4, darkFilled: 0, textStyles: 0 }), '토큰 4');
});

test('pickDarkTarget — Semantic 우선 · 출처는 Dark가 아닌 모드 · Dark 있으면 대상으로', () => {
  const light = { modeId: 'm1', name: 'Light' };
  const dark = { modeId: 'm2', name: 'Dark' };
  const vars = [
    { collectionId: 'g', collection: 'Global', modes: [{ modeId: 'g1', name: 'Mode 1' }] },
    { collectionId: 's', collection: 'Semantic', modes: [light, dark] },
  ];
  assert.deepEqual(pickDarkTarget(vars), { collectionId: 's', fromModeId: 'm1', toModeId: 'm2' });

  // Dark가 없으면 대상 모드를 생략한다 — 플러그인이 addMode('Dark')로 만든다.
  const noDark = [{ collectionId: 's', collection: 'Semantic', modes: [light] }];
  assert.deepEqual(pickDarkTarget(noDark), { collectionId: 's', fromModeId: 'm1' });

  // 모드가 Dark 하나뿐이면 채울 출처가 없다.
  assert.equal(pickDarkTarget([{ collectionId: 's', collection: 'Semantic', modes: [dark] }]), null);
  // 모드가 있는 컬렉션이 아예 없으면 null.
  assert.equal(pickDarkTarget([{ collectionId: 'g', collection: 'Global', modes: [] }]), null);
  assert.equal(pickDarkTarget([]), null);
});
