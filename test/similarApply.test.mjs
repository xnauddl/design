/* figma 적용 통합 테스트 — `npm test`가 build 후 dist/figma-lib.mjs를 불러온다.
   전역 figma 목으로 닮은 프레임 컴포넌트화의 런타임 동작(컴포넌트 생성·속성 노출·
   인스턴스 오버라이드 교체)을 실제 호출 경로로 검증한다(실제 Figma 미실행 환경 대체). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scanSimilar, componentizeSimilar } from '../dist/figma-lib.mjs';

let seq = 0;
const txt = (id, name, characters) => ({ id, name, type: 'TEXT', characters, componentPropertyReferences: {} });
const inst = (id, name, key) => ({
  id, name, type: 'INSTANCE', componentPropertyReferences: {},
  getMainComponentAsync: async () => ({ key, id: `mc:${key}` }),
});

/** 같은 구조 카드: Image(INSTANCE) + Title/Desc(TEXT). */
function card(id, { title, imgKey }, parent) {
  return {
    id, name: 'Card', type: 'FRAME', x: 1, y: 2, width: 100, height: 80, parent, removed: false,
    children: [inst(`${id}:img`, 'Image', imgKey), txt(`${id}:title`, 'Title', title), txt(`${id}:desc`, 'Desc', 'same')],
    remove() { this.removed = true; },
  };
}

/** 전역 figma 목 — createComponentFromNode가 자식을 보존한 컴포넌트(속성/인스턴스 메서드)를 반환. */
function installFigma() {
  seq = 0;
  const comps = [];
  const created = [];
  globalThis.figma = {
    createComponentFromNode(node) {
      node.consumed = true;
      const comp = {
        id: `comp:${seq++}`, name: node.name, type: 'COMPONENT', children: node.children, props: [],
        addComponentProperty(pname, ptype, def) { const id = `${pname}#${seq++}`; this.props.push({ id, pname, ptype, def }); return id; },
        createInstance() {
          const i = { id: `inst:${seq++}`, type: 'INSTANCE', x: 0, y: 0, parent: null, applied: {},
            resize() {}, setProperties(p) { Object.assign(this.applied, p); }, remove() {} };
          created.push(i);
          return i;
        },
      };
      comps.push(comp);
      return comp;
    },
    _comps: comps,
    _created: created,
  };
  return globalThis.figma;
}

test('scanSimilar — 동일 구조 묶고 가변 위치·마스터 추천(목)', async () => {
  installFigma();
  const page = { appendChild() {} };
  const a = card('A', { title: 'A', imgKey: 'k1' }, page);
  const b = card('B', { title: 'B', imgKey: 'k2' }, page);
  const c = card('C', { title: 'C', imgKey: 'k3' }, page);
  const odd = { id: 'odd', name: 'Other', type: 'FRAME', children: [txt('odd:t', 'Title', 'Z')] };

  const r = await scanSimilar([a, b, c, odd]);
  assert.deepEqual(r.memberIds, ['A', 'B', 'C']);
  assert.equal(r.recommendedMasterId, 'A');
  assert.deepEqual(r.varying.map((v) => `${v.path}:${v.type}`).sort(), ['Image:INSTANCE_SWAP', 'Title:TEXT']);
  assert.deepEqual(r.excluded, [{ id: 'odd', name: 'Other', reason: '구조 불일치' }]);
});

test('componentizeSimilar — 컴포넌트 생성·속성 노출·인스턴스 오버라이드 교체(목)', async () => {
  const figma = installFigma();
  const page = { appended: [], appendChild(n) { n.parent = this; this.appended.push(n); } };
  const a = card('A', { title: 'A', imgKey: 'k1' }, page); // 마스터
  const b = card('B', { title: 'B', imgKey: 'k2' }, page);
  const c = card('C', { title: 'C', imgKey: 'k3' }, page);

  const r = await componentizeSimilar(a, [a, b, c]);

  // 결과 집계
  assert.equal(r.properties, 2); // Title(TEXT) + Image(INSTANCE_SWAP)
  assert.equal(r.instances, 2); // 마스터 제외 2개
  assert.deepEqual(r.warnings, []);

  // 마스터 → 컴포넌트(소비), 자식에 속성 참조 연결
  assert.equal(a.consumed, true);
  assert.equal(a.removed, false); // 마스터는 제거 아님(컴포넌트가 됨)
  const comp = figma._comps[0];
  // 기본값 = 마스터 콘텐츠
  const titleProp = comp.props.find((p) => p.pname === 'title');
  const imageProp = comp.props.find((p) => p.pname === 'image');
  assert.deepEqual([titleProp.ptype, titleProp.def], ['TEXT', 'A']);
  assert.deepEqual([imageProp.ptype, imageProp.def], ['INSTANCE_SWAP', 'k1']);
  // 레이어 연결(characters/mainComponent → 속성 id)
  const masterTitle = a.children.find((ch) => ch.name === 'Title');
  const masterImage = a.children.find((ch) => ch.name === 'Image');
  assert.equal(masterTitle.componentPropertyReferences.characters, titleProp.id);
  assert.equal(masterImage.componentPropertyReferences.mainComponent, imageProp.id);

  // 나머지 멤버 제거 + 인스턴스 2개 생성(각자 콘텐츠 오버라이드)
  assert.equal(b.removed, true);
  assert.equal(c.removed, true);
  assert.equal(figma._created.length, 2);
  const appliedValues = figma._created.map((i) => Object.values(i.applied).sort());
  assert.deepEqual(appliedValues, [['B', 'k2'].sort(), ['C', 'k3'].sort()]);
  // 인스턴스가 원래 위치로 배치되고 부모에 삽입됨
  assert.equal(figma._created[0].x, 1);
  assert.equal(page.appended.length, 2);
});

test('componentizeSimilar — 이미지 fill은 속성 아님 + 경고(목)', async () => {
  const figma = installFigma();
  const page = { appendChild(n) { n.parent = this; } };
  const imgCard = (id, title) => ({
    id, name: 'Card', type: 'FRAME', x: 0, y: 0, width: 50, height: 50, parent: page, removed: false,
    children: [{ id: `${id}:pic`, name: 'Photo', type: 'RECTANGLE', fills: [{ type: 'IMAGE', visible: true }] }, txt(`${id}:t`, 'Title', title)],
    remove() { this.removed = true; },
  });
  const m = imgCard('1', 'A');
  const r = await componentizeSimilar(m, [m, imgCard('2', 'B')]);

  assert.equal(r.properties, 1); // Title만 속성(이미지 fill 제외)
  assert.equal(r.instances, 1);
  assert.equal(r.warnings.length, 1);
  assert.match(r.warnings[0], /Photo/);
  // 인스턴스 오버라이드는 텍스트만
  assert.deepEqual(Object.values(figma._created[0].applied), ['B']);
});
