/* 순수 로직 단위 테스트 — `npm test`가 build 후 dist/pure.mjs를 불러온다.
   시스템화 마법사의 단계 계획(planWizard)·완료 요약(summarize) 검증. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WIZARD_STEPS, planWizard, summarize } from '../dist/pure.mjs';

const ALL_ON = { semantics: true, contrast: true, componentize: true };
const ALL_OFF = { semantics: false, contrast: false, componentize: false };
const PRO_MAP = { isPaid: true, hasSemanticMap: true };

/** 헬퍼: 계획에서 실제 실행되는 단계 id 목록. */
const runIds = (plan) => plan.filter((p) => p.run).map((p) => p.step.id);
/** 헬퍼: 특정 단계 항목. */
const item = (plan, id) => plan.find((p) => p.step.id === id);

test('WIZARD_STEPS — 순서와 필수/선택 분류', () => {
  assert.deepEqual(
    WIZARD_STEPS.map((s) => s.id),
    ['extract', 'create', 'semantics', 'bind', 'rename', 'contrast', 'componentize'],
  );
  // 필수: 추출·생성·바인딩·리네임. 선택: 시맨틱·대비·컴포넌트화.
  const required = WIZARD_STEPS.filter((s) => !s.optional).map((s) => s.id);
  assert.deepEqual(required, ['extract', 'create', 'bind', 'rename']);
  const optional = WIZARD_STEPS.filter((s) => s.optional).map((s) => s.id);
  assert.deepEqual(optional, ['semantics', 'contrast', 'componentize']);
  // 바인딩이 리네임보다 앞(토큰 경로명 의존).
  const ids = WIZARD_STEPS.map((s) => s.id);
  assert.ok(ids.indexOf('bind') < ids.indexOf('rename'));
});

test('planWizard — 모든 옵션 ON + Pro + 매핑 있음 → 전 단계 실행', () => {
  const plan = planWizard(ALL_ON, PRO_MAP);
  assert.deepEqual(runIds(plan), ['extract', 'create', 'semantics', 'bind', 'rename', 'contrast', 'componentize']);
});

test('planWizard — 모든 선택 OFF → 필수 4단계만', () => {
  const plan = planWizard(ALL_OFF, PRO_MAP);
  assert.deepEqual(runIds(plan), ['extract', 'create', 'bind', 'rename']);
  assert.equal(item(plan, 'semantics').skipReason, 'wizard.skip.optionOff');
  assert.equal(item(plan, 'contrast').skipReason, 'wizard.skip.optionOff');
  assert.equal(item(plan, 'componentize').skipReason, 'wizard.skip.optionOff');
});

test('planWizard — 시맨틱 옵션 ON이지만 매핑 없음 → 건너뜀', () => {
  const plan = planWizard(ALL_ON, { isPaid: true, hasSemanticMap: false });
  assert.equal(item(plan, 'semantics').run, false);
  assert.equal(item(plan, 'semantics').skipReason, 'wizard.skip.noMapping');
  assert.ok(!runIds(plan).includes('semantics'));
});

test('planWizard — 컴포넌트화 옵션 ON이지만 비Paid → Paid 전용으로 건너뜀', () => {
  const plan = planWizard(ALL_ON, { isPaid: false, hasSemanticMap: true });
  assert.equal(item(plan, 'componentize').run, false);
  assert.equal(item(plan, 'componentize').skipReason, 'wizard.skip.paid');
  // 필수 단계와 다른 선택 단계는 영향 없음.
  assert.ok(runIds(plan).includes('contrast'));
});

test('summarize — 집계가 있는 항목만 표시', () => {
  assert.equal(
    summarize({ created: 12, bound: 30, renamed: 8, contrastChecked: 10, contrastFailed: 2, components: 3 }),
    '토큰 12 · 바인딩 30 · 리네임 8 · 대비 8/10 통과 · 컴포넌트 3',
  );
});

test('summarize — 대비 미달 0이면 전부 통과 표기', () => {
  assert.equal(summarize({ contrastChecked: 5, contrastFailed: 0 }), '대비 5/5 통과');
});

test('summarize — 컴포넌트 0은 생략, 빈 집계는 안내 문구', () => {
  assert.equal(summarize({ created: 4, components: 0 }), '토큰 4');
  assert.equal(summarize({}), '완료된 작업이 없습니다');
});
