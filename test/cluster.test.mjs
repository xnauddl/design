/* 색 정리(ΔE 군집) 순수 로직 테스트 — build 후 dist/pure.mjs를 불러온다.
   결정론(입력 순서 무관)·임계값·대표 선정을 검증. figma 의존 없음. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clusterColors, colorDistance, TIDY_TOL } from '../dist/pure.mjs';

test('colorDistance: 동일 색=0, 대칭', () => {
  assert.equal(colorDistance('#3366ff', '#3366ff'), 0);
  assert.ok(Math.abs(colorDistance('#3366ff', '#3367ff') - colorDistance('#3367ff', '#3366ff')) < 1e-12);
});

test('clusterColors: 거의 같은 색은 한 군집으로 병합', () => {
  const cls = clusterColors(['#3366ff', '#3366fe', '#3367ff']);
  assert.equal(cls.length, 1);
  assert.equal(cls[0].members.length, 3);
});

test('clusterColors: 뚜렷이 다른 hue는 각자 군집', () => {
  const cls = clusterColors(['#ff0000', '#00ff00', '#0000ff']);
  assert.equal(cls.length, 3);
  for (const c of cls) assert.equal(c.members.length, 1);
});

test('clusterColors: 입력 순서가 달라도 결과 동일(결정론)', () => {
  const a = clusterColors(['#3366ff', '#ff0000', '#3366fe', '#00ff00']);
  const b = clusterColors(['#00ff00', '#3366fe', '#ff0000', '#3366ff']);
  const norm = (cls) =>
    cls
      .map((c) => ({ rep: c.rep, members: [...c.members].sort() }))
      .sort((x, y) => x.rep.localeCompare(y.rep));
  assert.deepEqual(norm(a), norm(b));
});

test('clusterColors: 중복 hex는 dedup되어 한 멤버', () => {
  const cls = clusterColors(['#3366ff', '#3366ff', '#3366ff']);
  assert.equal(cls.length, 1);
  assert.deepEqual(cls[0].members, ['#3366ff']);
});

test('clusterColors: 대표(rep)는 항상 군집 멤버 중 하나', () => {
  const cls = clusterColors(['#3366ff', '#3366fe', '#3367ff', '#ff0000']);
  for (const c of cls) assert.ok(c.members.includes(c.rep));
});

test('TIDY_TOL: 양수 임계값 export', () => {
  assert.ok(typeof TIDY_TOL === 'number' && TIDY_TOL > 0);
});
