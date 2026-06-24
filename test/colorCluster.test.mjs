/* colorCluster.ts — ΔE 색 군집 단위 테스트 (npm test가 build 후 dist/pure.mjs 로드). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_DELTA_E,
  deltaEOK,
  clusterColorsByDeltaE,
  clusterSummary,
  clusterColorTokens,
} from '../dist/pure.mjs';

test('DEFAULT_DELTA_E — 기본 허용오차 8 고정', () => {
  assert.equal(DEFAULT_DELTA_E, 8);
});

test('deltaEOK — 동일색=0, 비슷한 색은 작고 다른 색은 큼', () => {
  assert.equal(deltaEOK('#3366ff', '#3366ff'), 0);
  // 거의 동일한 파랑(채널 1~2 차이) → 매우 작음
  assert.ok(deltaEOK('#3366ff', '#3466fe') < DEFAULT_DELTA_E);
  // 파랑 ↔ 빨강 → 크게 다름
  assert.ok(deltaEOK('#3366ff', '#e11d1d') > 20);
  // 대칭성
  assert.equal(deltaEOK('#3366ff', '#e11d1d'), deltaEOK('#e11d1d', '#3366ff'));
});

test('clusterColorsByDeltaE — 비슷한 색 묶고 단색은 유지', () => {
  const colors = [
    { name: 'blue-a', hex: '#3366ff' },
    { name: 'blue-b', hex: '#3466fe' },
    { name: 'blue-c', hex: '#3265ff' },
    { name: 'gray', hex: '#888888' },
    { name: 'red', hex: '#e11d1d' },
  ];
  const clusters = clusterColorsByDeltaE(colors);
  assert.equal(clusters.length, 3); // blue 군집 1 + gray + red

  const blue = clusters.find((c) => c.members.length > 1);
  assert.equal(blue.members.length, 3);
  assert.equal(blue.isSingleton, false);
  // 대표색은 세 파랑 중 하나
  assert.ok(['blue-a', 'blue-b', 'blue-c'].includes(blue.representative.name));

  const singles = clusters.filter((c) => c.isSingleton).map((c) => c.representative.name).sort();
  assert.deepEqual(singles, ['gray', 'red']);
});

test('clusterColorsByDeltaE — 대표색은 채도 최고색', () => {
  // 채도가 뚜렷이 다른 두 비슷한 파랑 → 더 선명한 쪽이 대표
  const clusters = clusterColorsByDeltaE([
    { name: 'dull', hex: '#5b6b99' }, // 흐린 파랑
    { name: 'vivid', hex: '#3366ff' }, // 선명한 파랑
  ], 30);
  assert.equal(clusters.length, 1);
  assert.equal(clusters[0].representative.name, 'vivid');
});

test('clusterColorsByDeltaE — tolerance 0이면 병합 없음', () => {
  const colors = [
    { name: 'b1', hex: '#3366ff' },
    { name: 'b2', hex: '#3466fe' },
  ];
  assert.equal(clusterColorsByDeltaE(colors, 0).length, 2);
});

test('clusterColorsByDeltaE — 빈 입력 → 빈 배열', () => {
  assert.deepEqual(clusterColorsByDeltaE([]), []);
});

test('clusterSummary — N색 → M 대표색 · K색 병합', () => {
  const clusters = clusterColorsByDeltaE([
    { name: 'blue-a', hex: '#3366ff' },
    { name: 'blue-b', hex: '#3466fe' },
    { name: 'blue-c', hex: '#3265ff' },
    { name: 'gray', hex: '#888888' },
    { name: 'red', hex: '#e11d1d' },
  ]);
  const s = clusterSummary(clusters);
  assert.equal(s.total, 5);
  assert.equal(s.representatives, 3);
  assert.equal(s.merged, 2); // 5색 - 3 대표색
  assert.equal(s.singletons, 2);
});

test('clusterColorTokens — 색 토큰만 군집 + 병합 맵(비대표→대표)', () => {
  const tokens = [
    { name: 'color/3366ff', category: 'color', sources: ['fill'], value: '#3366ff' },
    { name: 'color/3466fe', category: 'color', sources: ['fill'], value: '#3466fe' },
    { name: 'spacing/8', category: 'gap', sources: ['gap'], value: 8 }, // 색 아님 → 무시
  ];
  const { clusters, merges } = clusterColorTokens(tokens);
  assert.equal(clusters.length, 1); // 두 파랑은 한 군집
  const rep = clusters[0].representative.name;
  const merged = Object.keys(merges);
  assert.equal(merged.length, 1); // 대표 1, 병합 1
  assert.equal(merges[merged[0]], rep); // 비대표 → 대표 지시
  assert.ok(!('spacing/8' in merges)); // 수치 토큰은 군집 대상 아님
});
