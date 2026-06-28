/* 순수 로직 단위 테스트 — `npm test`가 build 후 dist/pure.mjs를 불러온다.
   닮은 프레임 컴포넌트화: 평탄화·구조 시그니처·정렬/가변/추천·속성계획·오버라이드. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  flattenFrame,
  frameShapeSignature,
  alignFrames,
  planContentProperties,
  overridesForFrame,
} from '../dist/pure.mjs';

/** 카드 프레임 픽스처: Image(INSTANCE) + Title/Desc(TEXT). */
const card = (id, { title, desc, imgKey }) => ({
  id,
  name: 'Card',
  type: 'FRAME',
  children: [
    { id: `${id}:img`, name: 'Image', type: 'INSTANCE', componentKey: imgKey },
    { id: `${id}:title`, name: 'Title', type: 'TEXT', characters: title },
    { id: `${id}:desc`, name: 'Desc', type: 'TEXT', characters: desc },
  ],
});

test('flattenFrame — 루트 기준 경로 + 동일 이름 형제 #n 구분', () => {
  const frame = {
    id: 'f', name: 'Card', type: 'FRAME',
    children: [
      { id: 'a', name: 'Row', type: 'FRAME', children: [{ id: 'a1', name: 'Label', type: 'TEXT', characters: 'x' }] },
      { id: 'b', name: 'Row', type: 'FRAME', children: [{ id: 'b1', name: 'Label', type: 'TEXT', characters: 'y' }] },
    ],
  };
  const paths = flattenFrame(frame).map((e) => e.path);
  assert.deepEqual(paths, ['Row', 'Row/Label', 'Row#2', 'Row#2/Label']);
  // 루트는 제외, 콘텐츠 보존
  const label2 = flattenFrame(frame).find((e) => e.path === 'Row#2/Label');
  assert.equal(label2.characters, 'y');
});

test('frameShapeSignature — 콘텐츠 무관·구조 동일이면 일치', () => {
  const a = card('1', { title: 'A', desc: 'd', imgKey: 'k1' });
  const b = card('2', { title: 'B', desc: 'e', imgKey: 'k2' });
  assert.equal(frameShapeSignature(a), frameShapeSignature(b)); // 콘텐츠만 다름 → 같은 구조
  const c = { id: '3', name: 'Card', type: 'FRAME', children: [{ id: '3t', name: 'Title', type: 'TEXT', characters: 'C' }] };
  assert.notEqual(frameShapeSignature(a), frameShapeSignature(c)); // 레이어 수 다름
});

test('alignFrames — 동일 구조 묶고 다른 구조 제외 + 가변 위치 산출', () => {
  const c1 = card('1', { title: 'A', desc: 'same', imgKey: 'k1' });
  const c2 = card('2', { title: 'B', desc: 'same', imgKey: 'k2' });
  const c3 = card('3', { title: 'C', desc: 'same', imgKey: 'k3' });
  const odd = { id: '9', name: 'Other', type: 'FRAME', children: [{ id: '9t', name: 'Title', type: 'TEXT', characters: 'Z' }] };

  const r = alignFrames([c1, c2, c3, odd]);
  assert.deepEqual(r.memberIds, ['1', '2', '3']);
  assert.deepEqual(r.excluded, [{ id: '9', name: 'Other', reason: '구조 불일치' }]);
  // Title(다름)·Image(다름)은 가변, Desc(동일)는 가변 아님
  const varyPaths = r.varying.map((v) => `${v.path}:${v.type}`).sort();
  assert.deepEqual(varyPaths, ['Image:INSTANCE_SWAP', 'Title:TEXT']);
  assert.equal(r.imageWarnings.length, 0); // 이미지는 INSTANCE(교체 가능) → 경고 아님
});

test('alignFrames — 완전성 점수로 마스터 추천(빈 텍스트 페널티)', () => {
  const full1 = card('1', { title: 'A', desc: 'd', imgKey: 'k1' });
  const empty = card('2', { title: '', desc: 'd', imgKey: 'k2' }); // 빈 제목 → 낮은 점수
  const full3 = card('3', { title: 'C', desc: 'd', imgKey: 'k3' });
  const r = alignFrames([empty, full1, full3]);
  // 추천은 빈 레이어 없는 full(입력 순서상 full1='1' 먼저)
  assert.equal(r.recommendedMasterId, '1');
  assert.equal(r.metas[0].id, '1'); // 메타는 점수 내림차순
  const m2 = r.metas.find((m) => m.id === '2');
  assert.equal(m2.emptyLayers, 1);
  assert.equal(m2.textFilled, 1); // desc만 채워짐
});

test('alignFrames — 이미지 fill은 경고만(교체 불가)', () => {
  const withImg = (id, t) => ({
    id, name: 'Card', type: 'FRAME',
    children: [
      { id: `${id}:pic`, name: 'Photo', type: 'RECTANGLE', hasImageFill: true },
      { id: `${id}:t`, name: 'Title', type: 'TEXT', characters: t },
    ],
  });
  const r = alignFrames([withImg('1', 'A'), withImg('2', 'B')]);
  assert.deepEqual(r.imageWarnings, ['Photo']);
  // 이미지 fill은 가변 후보 아님(컴포넌트 속성 불가), Title만 가변
  assert.deepEqual(r.varying.map((v) => v.path), ['Title']);
});

test('alignFrames — 2개 미만/동일 구조 부족이면 멤버 없음', () => {
  assert.deepEqual(alignFrames([card('1', { title: 'A', desc: 'd', imgKey: 'k' })]).memberIds, []);
  const a = card('1', { title: 'A', desc: 'd', imgKey: 'k1' });
  const b = { id: '2', name: 'X', type: 'FRAME', children: [{ id: '2t', name: 'T', type: 'TEXT', characters: 'B' }] };
  const r = alignFrames([a, b]); // 서로 구조 다름 → 최대 그룹 크기 1
  assert.deepEqual(r.memberIds, []);
  assert.equal(r.excluded.length, 2);
});

test('planContentProperties — 가변→속성, 이름 충돌 -2 회피', () => {
  const plan = planContentProperties([
    { path: 'Title', type: 'TEXT' },
    { path: 'Image', type: 'INSTANCE_SWAP' },
    { path: 'Header/Title', type: 'TEXT' }, // leafName 'title' 충돌
  ]);
  assert.deepEqual(plan.map((p) => p.propName), ['title', 'image', 'title-2']);
  assert.equal(plan[0].field, 'characters');
  assert.equal(plan[1].field, 'mainComponent');
  assert.equal(plan[1].type, 'INSTANCE_SWAP');
});

test('overridesForFrame — 경로별 콘텐츠 값 매핑(빈 값 생략)', () => {
  const c1 = card('1', { title: 'Hello', desc: 'd', imgKey: 'kA' });
  const plan = planContentProperties([
    { path: 'Title', type: 'TEXT' },
    { path: 'Image', type: 'INSTANCE_SWAP' },
  ]);
  assert.deepEqual(overridesForFrame(flattenFrame(c1), plan), { title: 'Hello', image: 'kA' });

  const blank = card('2', { title: '', desc: 'd', imgKey: 'kB' });
  // 빈 텍스트는 오버라이드 생략(마스터 기본값 유지), 이미지는 유지
  assert.deepEqual(overridesForFrame(flattenFrame(blank), plan), { image: 'kB' });
});
