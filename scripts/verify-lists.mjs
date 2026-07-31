/**
 * 목록 스크롤 영역 회귀 검증 — 반쪽 행이 다시 생기지 않는지 헤드리스로 확인한다.
 *
 * 플러그인 UI는 Figma 안에서 도는 패널이라 typecheck·빌드만으로는 레이아웃을 못 본다.
 * 다만 빌드 산출물 `dist/ui.html`은 JS가 인라인돼 **standalone 브라우저로도 렌더**되고,
 * 백엔드(code.ts) 없이도 `postMessage`로 잠금 해제와 데이터 주입이 둘 다 되므로
 * 실제 렌더 결과를 그대로 잴 수 있다.
 *
 * 사용: node scripts/verify-lists.mjs [--list <id>|all] [--count 70] [--width 420] [--shots <dir>]
 *
 * --width는 패널 폭 — 좁을수록 행이 감싸지거나 넘쳐 높이가 불균일해진다(스냅의 전제가 깨진다).
 * 기본 420px 외에 패널 최소 폭(360px)에서도 돌려야 감쌈 회귀를 잡는다.
 */
import pw from 'playwright'; // CommonJS 패키지라 named export가 안 된다
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { mkdirSync, existsSync } from 'node:fs';

const { chromium } = pw;
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const UI = join(ROOT, 'dist', 'ui.html');

if (!existsSync(UI)) {
  console.error(`dist/ui.html 없음 — 먼저 \`npm run build\`. (${UI})`);
  process.exit(2);
}
// 색 시드는 UI가 쓰는 분류기 그대로 골라야 한다(아래 fakeColors 주석 참고).
// 정적 import는 위 안내보다 먼저 평가돼 dist가 없을 때 원인 모를 예외가 되므로 동적으로 읽는다.
const { classifyColor } = await import(pathToFileURL(join(ROOT, 'dist', 'pure.mjs')).href);

/* ---------- 시드 데이터 ---------- */

/** 색 외 토큰 n개 — `#tokenList`는 색을 걸러내므로(색은 ‘색 정리’ 표 담당) 비-색만 만든다. */
function fakeTokens(n) {
  const cats = ['gap', 'size', 'radius', 'fontSize', 'strokeWidth', 'lineHeight'];
  return Array.from({ length: n }, (_, i) => ({
    name: `${cats[i % cats.length]}/step-${String(i + 1).padStart(3, '0')}`,
    category: cats[i % cats.length],
    sources: ['itemSpacing'],
    value: 4 + i,
  }));
}

/** HSL(0–360, 0–1, 0–1) → #rrggbb. 색상값을 격자로 훑으려고 쓰는 최소 변환. */
function hslHex(h, s, l) {
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    return l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
  };
  const to = (v) => Math.round(v * 255).toString(16).padStart(2, '0');
  return `#${to(f(0))}${to(f(8))}${to(f(4))}`;
}

/**
 * 색 토큰 n개 — **hue/step 버킷이 서로 다른** 색만 고른다.
 *
 * EXTRACT_RESULT 핸들러는 시드 직후 huefyTokenColors(색 → `color/{hue}/{step}` 이름)와
 * tidyColors(같은 base 이름끼리 N:1 병합)를 돌린다. 색상값을 아무렇게나 70개 넣으면
 * 같은 버킷으로 몰려 몇 개로 병합되고, 그러면 하네스의 ‘총 N개’ 단언이 시드 수와 어긋난다.
 * 그래서 UI가 쓰는 분류기(classifyColor) 그대로 버킷을 세어 중복을 건너뛴다.
 * 버킷 상한은 hue 9종+gray × step 11단 = 110개.
 */
function fakeColors(n) {
  const seen = new Set();
  const out = [];
  // 밝기 바깥 · hue 안쪽 순회 — 한 단(step) 안에서 여러 hue를 먼저 채워 목록이 골고루 섞인다.
  // 채도는 4단으로 훑는다. 무채(gray)와 고채도만으로는 아주 밝은 단(red/50 등)에 닿지 못해
  // 버킷이 109개에서 멈춘다 — 중간 채도가 있어야 110개가 다 나온다.
  for (let l = 2; l <= 98 && out.length < n; l += 2) {
    for (let h = 0; h < 360 && out.length < n; h += 5) {
      for (const s of [0, 0.2, 0.5, 0.9]) {
        if (out.length >= n) break;
        const value = hslHex(h, s, l / 100);
        const c = classifyColor(value);
        const bucket = `${c.family}/${c.step}`;
        if (seen.has(bucket)) continue;
        seen.add(bucket);
        // 이름은 huefy가 어차피 덮어쓴다 — 추출 결과와 같은 hex 이름 형태만 맞춰 둔다.
        out.push({ name: `color/${value.slice(1)}`, category: 'color', sources: ['fills'], value });
      }
    }
  }
  if (out.length < n) throw new Error(`고유 hue/step 버킷이 ${out.length}개뿐 — --count를 낮추세요(최대 110)`);
  return out;
}

/**
 * 대비 실패 n건. `#contrastList`는 `pass:false`만 그리므로 전부 실패로 만든다.
 * 행 높이가 고르게 유지되는지가 이 목록의 관건이라, 높이를 흔드는 조합을 일부러 섞는다:
 * 보정 버튼 0·1·2개, 긴 레이어명(감싸짐 유발), ‘큰글자’ 접미사.
 */
function fakeContrastFindings(n) {
  return Array.from({ length: n }, (_, i) => {
    const kind = i % 3; // 0: 버튼 2개 · 1: 버튼 1개 · 2: 버튼 없음
    const long = i % 5 === 0; // 폭을 넘기는 긴 이름
    return {
      id: `node-${i}`,
      name: long ? `Page/Section/Card ${i} / 아주 긴 레이어 이름 텍스트 ${i}` : `Text ${i}`,
      fg: '#8a8a8a',
      bg: '#ffffff',
      bgId: kind === 0 ? `bg-${i}` : undefined,
      ratio: 2.5 + (i % 17) / 10,
      required: 4.5,
      large: i % 4 === 0,
      pass: false,
      suggestedFg: kind === 2 ? undefined : '#4a4a4a',
      suggestedBg: kind === 0 ? '#f2f2f2' : undefined,
    };
  });
}

/** 리네임 미리보기 노드 n개 — 전부 `after` 보유(영향 노드)라 맥락 숨김에도 n행이 그대로 보인다. */
function fakeRenameNodes(n) {
  return Array.from({ length: n }, (_, i) => ({
    id: `r${i}`,
    name: `Rectangle ${i + 1}`,
    type: 'FRAME',
    depth: 1,
    parentId: null,
    after: `card/item-${String(i + 1).padStart(3, '0')}`,
  }));
}

/**
 * 바인딩 미리보기 — 트리 한 행이 노드 헤더 **또는** 후보라, 노드당 (헤더 1 + 후보 1)로 2행씩 만든다.
 * 후보가 없는 노드는 header:false라 맥락 숨김에 걸려 아예 안 그려지므로, 홀수는 마지막 노드에
 * 후보를 하나 더 붙여 맞춘다(노드를 하나 더 두면 그 노드가 사라져 행 수가 안 맞는다).
 */
function fakeBind(n) {
  const k = Math.floor(n / 2); // n<2는 표현 못 하지만, 상한을 넘길 만큼(십수 행) 줘야 검사가 성립한다
  const nodes = [];
  const candidates = [];
  for (let i = 0; i < k; i++) {
    const id = `bn${i}`;
    nodes.push({ id, name: `Frame ${String(i + 1).padStart(3, '0')}`, type: 'FRAME', depth: 1, parentId: null });
    candidates.push({ nodeId: id, field: 'itemSpacing', currentValue: String(4 + i), variableId: `v${i}`, variableName: `gap/${i}`, tier: 2 });
  }
  if (n % 2 && k) candidates.push({ nodeId: `bn${k - 1}`, field: 'paddingLeft', currentValue: '8', variableId: 'vx', variableName: 'space/8', tier: 2 });
  return { nodes, candidates };
}

/** 컴포넌트 등록 후보 n개 — 전부 eligible(세트/단독 배지 행)이라 n행. 비대상은 맥락이라 안 보인다. */
function fakeCompNodes(n) {
  return Array.from({ length: n }, (_, i) => ({
    id: `c${i}`,
    name: `button ${i + 1}`,
    type: 'FRAME',
    depth: 1,
    parentId: null,
    eligible: true,
    ...(i % 5 === 0 ? { single: `Card${i}` } : { group: 'Button', variant: `Size=md, State=${i}` }),
  }));
}

/** 텍스트 스타일 후보 n개 — 스캔 결과(locked 행)와 같은 모양. 시그니처가 겹치면 안 되므로 크기를 흩뜨린다. */
function fakeTextStyles(n) {
  const roles = ['display', 'title', 'heading', 'body', 'caption', 'label'];
  return Array.from({ length: n }, (_, i) => ({
    name: `${roles[i % roles.length]}/${String(i + 1).padStart(2, '0')}`,
    fontSize: 10 + (i % 40),
    lineHeight: 16 + (i % 40),
    letterSpacing: (i % 5) * 0.1,
    family: 'Inter',
    style: i % 3 === 0 ? 'Bold' : 'Regular',
    // 절반은 이미 등록된 스타일(파랑) — 행 높이가 같은지도 함께 본다.
    ...(i % 2 ? { boundStyleId: `S:${i}` } : {}),
  }));
}

/* ---------- 목록 배선 ----------
   새 목록을 채택하면 여기에 항목 하나만 추가한다. setup()은 그 목록이 실제로
   행을 그리게 만드는 최소 조작(시드 + ‘펼침’ 버튼 클릭)만 담당한다. */
const LISTS = {
  tokenList: {
    label: '토큰 생성 미리보기',
    tab: 'tabbtn-tokens',
    row: '.tk',
    more: 'tokenListMore',
    count: 'tokenListCount',
    expand: 'btnTokenListExpand',
    async setup(page, n) {
      await seed(page, { type: 'EXTRACT_RESULT', tokens: fakeTokens(n), selection: 1, warnings: [] });
      await page.click('#btnCreate'); // previewRevealed=true → 색 외 목록 렌더
    },
  },
  colorTable: {
    label: '추출 · 색 정리 표',
    tab: 'tabbtn-tokens',
    row: '.crow',
    more: 'colorTableMore',
    count: 'colorTableCount',
    expand: 'btnColorTableExpand',
    async setup(page, n) {
      // 백엔드가 없어 클릭만으로는 데이터가 안 온다 — colorRevealed를 켜고(추출 버튼의 역할)
      // 결과는 직접 주입한다. 순서가 바뀌면 표가 잠긴 채로 남는다.
      await page.click('#btnExtract');
      await seed(page, { type: 'EXTRACT_RESULT', tokens: fakeColors(n), selection: 1, warnings: [] });
    },
  },
  variantReport: {
    label: '컴포넌트 등록/분류 리포트',
    tab: 'tabbtn-apply',
    row: '.vr-row',
    more: 'variantReportMore',
    count: 'variantReportCount',
    expand: 'btnVariantReportExpand',
    async setup(page, n) {
      // 세 메시지 중 GENERATE_RESULT만 머리줄이 없어 `줄 수 == 시드 수`가 되고,
      // 하네스의 ‘총 N개 == 시드 N’ 검사와 그대로 맞는다(다른 둘은 머리줄이 한 줄씩 더 붙는다).
      await seed(page, {
        type: 'GENERATE_RESULT',
        generated: n,
        sets: 1,
        combos: Array.from({ length: n }, (_, i) => `Type=Primary, Size=M, State=state-${String(i + 1).padStart(3, '0')}`),
      });
    },
  },
  contrastList: {
    label: '명도 대비 점검 결과',
    tab: 'tabbtn-apply',
    row: '.cfind',
    more: 'contrastListMore',
    count: 'contrastListCount',
    expand: 'btnContrastListExpand',
    // 이 목록만 행 높이 균일성을 따로 본다 — 감쌈·보정 버튼 유무로 높이가 흔들렸던 곳이라
    // 반쪽 행이 0건이어도 원인이 되살아났는지 바로 보이게 한다.
    uniformRows: true,
    // 마법사(‘시작’ 탭)의 대비 점검이 이 목록을 채운다 — 결과가 숨은 탭에 그려지는 실제 경로.
    hiddenFrom: 'tabbtn-wizard',
    async setup(page, n) {
      // 결과 메시지만 넣으면 된다 — 검사 버튼은 백엔드(code.ts)가 있어야 응답이 온다.
      await seed(page, {
        type: 'CONTRAST_RESULT',
        level: 'AA',
        checked: n,
        passed: 0,
        failed: n,
        findings: fakeContrastFindings(n),
        skipped: {},
      });
    },
  },
  // 선택형 미리보기 트리 3종 — 셋 다 code(백엔드) 응답 한 방으로 렌더되므로 버튼 클릭이 필요 없다.
  bindTree: {
    label: '바인딩 미리보기 트리',
    tab: 'tabbtn-apply',
    row: '.tree-row',
    more: 'bindTreeMore',
    count: 'bindTreeCount',
    expand: 'btnBindTreeExpand',
    async setup(page, n) {
      const { nodes, candidates } = fakeBind(n);
      await seed(page, { type: 'APPLY_RESULT', bound: candidates.length, skipped: 0, flags: [], reasons: {}, preview: true, candidates, nodes });
    },
  },
  diff: {
    label: '리네임 미리보기 트리',
    tab: 'tabbtn-apply',
    row: '.tree-row',
    more: 'diffMore',
    count: 'diffCount',
    expand: 'btnDiffExpand',
    async setup(page, n) {
      await seed(page, { type: 'RENAME_RESULT', applied: false, changes: [], nodes: fakeRenameNodes(n) });
    },
  },
  compTree: {
    label: '컴포넌트 등록 후보 트리',
    tab: 'tabbtn-apply',
    row: '.tree-row',
    more: 'compTreeMore',
    count: 'compTreeCount',
    expand: 'btnCompTreeExpand',
    async setup(page, n) {
      await seed(page, { type: 'COMPONENT_CANDIDATES', nodes: fakeCompNodes(n) });
    },
  },
  tsRows: {
    label: '텍스트 스타일 표',
    tab: 'tabbtn-tokens',
    // 마운트는 표를 감싼 래퍼다 — 표 박스 자체는 스크롤 컨테이너가 못 된다.
    mount: 'tsList',
    row: 'tbody tr',
    more: 'tsListMore',
    count: 'tsListCount',
    expand: 'btnTsListExpand',
    // 고정 헤더가 스크롤포트 상단을 덮는다 → 그 아래만 ‘실제로 보이는 영역’이다.
    // 이 보정 없이는 헤더에 반쯤 가린 행을 검사가 통째로 놓친다(기하학적으로는 뷰포트 안이라).
    // 셀렉터는 thead가 아니라 th다 — sticky가 걸린 건 셀이고, thead 박스는 그대로 스크롤을
    // 따라 올라간다(측정해 보면 스크롤 후 thead.top이 음수, th는 스크롤포트 상단 고정).
    stickyHead: '#tsTable thead th',
    async setup(page, n) {
      await seed(page, { type: 'TEXT_STYLE_CANDIDATES', styles: fakeTextStyles(n), warnings: [] });
    },
  },
};

/* ---------- 구동 ---------- */

/** 백엔드(code.ts) 없이 UI에 메시지를 넣는다 — ui.ts는 event.data.pluginMessage를 읽는다. */
async function seed(page, pluginMessage) {
  await page.evaluate((m) => window.postMessage({ pluginMessage: m }, '*'), pluginMessage);
  await page.waitForTimeout(60);
}

/** 유료 잠금 해제 — 미리보기 버튼들이 PAID_FIELDS라 Free면 disabled라 클릭이 안 된다. */
async function unlock(page) {
  await seed(page, { type: 'LICENSE_STATUS', tier: 'paid', source: 'dev', unlimited: true });
}

/**
 * 스크롤포트에 **걸쳐 있는** 행을 센다.
 * 완전히 위/아래로 벗어난 행은 정상(가려진 행)이고, 경계에 걸친 행이 곧 반쪽 행이다.
 * 세로 클리핑은 border 안쪽(padding box)에서 일어나므로 clientTop/clientHeight로 잰다.
 *
 * stickyHead가 있는 목록(표)은 상단을 고정 헤더가 덮으므로 기하학적 뷰포트와 ‘보이는 영역’이
 * 다르다. 헤더에 반쯤 가린 행도 사용자에겐 똑같이 반쪽 행이라, 그만큼 위를 잘라내고 잰다.
 * 단 ‘헤더 높이만큼’이 아니라 **헤더가 실제로 있는 자리**로 잘라야 한다. 높이를 그냥 빼면
 * 고정이 풀린 경우(셀렉터가 어긋나 sticky 규칙이 안 붙는 등)에도 검사가 상단 한 줄을 스스로
 * 눈감아, 진짜 잘린 행을 못 본다. 고정돼 있으면 두 식은 같고, 풀리면 이 식만 옳다.
 */
async function partialRows(page, mount, row, stickyHead) {
  return page.evaluate(({ mount, row, stickyHead }) => {
    const box = document.getElementById(mount);
    const br = box.getBoundingClientRect();
    const head = stickyHead ? box.querySelector(stickyHead) : null;
    const portTop = br.top + box.clientTop;
    const top = head ? Math.max(portTop, head.getBoundingClientRect().bottom) : portTop;
    const bottom = portTop + box.clientHeight;
    const EPS = 1.0; // 서브픽셀 반올림 허용
    const bad = [];
    for (const el of box.querySelectorAll(row)) {
      const r = el.getBoundingClientRect();
      if (r.height === 0) continue;
      const above = r.bottom <= top + EPS;
      const below = r.top >= bottom - EPS;
      const inside = r.top >= top - EPS && r.bottom <= bottom + EPS;
      if (!above && !below && !inside) {
        bad.push({ text: (el.textContent || '').trim().slice(0, 40), top: +r.top.toFixed(2), bottom: +r.bottom.toFixed(2) });
      }
    }
    return { bad, viewport: { top: +top.toFixed(2), bottom: +bottom.toFixed(2) } };
  }, { mount, row, stickyHead });
}

/**
 * 결과가 **다른 탭이 열려 있는 동안** 도착한 경우. 비활성 탭은 display:none이라 행이
 * 높이 0으로 측정되고 layoutList가 조용히 bail한다 — 탭을 열어도 재계산이 없으면 반쪽 행과
 * 빈 개수 줄이 그대로 남는다. 실제 경로다(마법사의 대비 점검이 ‘적용’ 탭 목록을 채운다).
 * 시드가 postMessage만으로 되는 목록에서만 켠다(버튼 클릭은 숨은 탭에서 안 된다).
 */
async function seedFromHiddenTab(page, spec, count) {
  await page.click(`#${spec.hiddenFrom}`);
  await unlock(page);
  await spec.setup(page, count);
  await page.waitForTimeout(200);
  await page.click(`#${spec.tab}`);
}

async function verify(page, id, spec, count, shots, hidden = false) {
  const fails = [];
  const ok = (cond, msg) => { if (!cond) fails.push(`${hidden ? '[숨은 탭에서 시드] ' : ''}${msg}`); };
  const shot = hidden ? `${id}-hidden` : id; // 시나리오끼리 스크린샷을 덮어쓰지 않게
  const mount = spec.mount ?? id; // 목록 이름과 마운트 요소가 다를 수 있다(표는 래퍼가 마운트)

  await page.goto(`file://${UI}`);
  if (hidden) {
    await seedFromHiddenTab(page, spec, count);
  } else {
    await page.click(`#${spec.tab}`);
    await unlock(page);
    await spec.setup(page, count);
  }
  await page.waitForTimeout(200); // renderChunked의 rAF 청크 + onDone 레이아웃 대기

  const state = await page.evaluate(({ mount, more, countId }) => {
    const box = document.getElementById(mount);
    return {
      classes: [...box.classList],
      capped: getComputedStyle(box).maxHeight !== 'none',
      moreShown: getComputedStyle(document.getElementById(more)).display !== 'none',
      countText: document.getElementById(countId).textContent,
    };
  }, { mount, more: spec.more, countId: spec.count });

  // class="list-region"을 빠뜨리면 CSS가 안 붙어 상한 자체가 없다 — 계산된 max-height로 잡는다.
  ok(state.capped, 'max-height가 none — 마운트에 class="list-region"이 있는지 확인');
  ok(state.classes.includes('framed'), `.framed 없음 (classes=${state.classes.join(',')})`);
  ok(state.classes.includes('scrolls'), `.scrolls 없음 (classes=${state.classes.join(',')})`);
  ok(state.moreShown, '‘더 보기’ 줄이 숨겨져 있음 — 상한에 안 걸렸거나 배선 누락');
  const m = /총 (\d+)개 중 (\d+)개 표시/.exec(state.countText || '');
  ok(!!m, `개수 문구 형식 불일치: ${JSON.stringify(state.countText)}`);
  if (m) ok(Number(m[1]) === count, `총 개수 ${m[1]} ≠ 시드 ${count}`);

  // layoutList는 rows[0] 높이 하나로 몇 행이 들어가는지 계산한다 → 행 높이가 제각각이면
  // 스냅 자체가 성립하지 않는다. 원인을 결과(반쪽 행)보다 먼저 짚으려고 별도로 잰다.
  if (spec.uniformRows) {
    const heights = await page.evaluate(({ mount, row }) => {
      const seen = new Map();
      for (const el of document.getElementById(mount).querySelectorAll(row)) {
        const h = +el.getBoundingClientRect().height.toFixed(2);
        if (!seen.has(h)) seen.set(h, (el.textContent || '').trim().slice(0, 40));
      }
      return [...seen].map(([h, text]) => ({ h, text }));
    }, { mount: id, row: spec.row });
    ok(heights.length === 1, `행 높이가 ${heights.length}종 — 정수배 스냅의 전제가 깨짐: ` +
      JSON.stringify(heights.slice(0, 4)));
  }

  // 스크롤 위치별 반쪽 행 검사 — 높이 스냅만으로는 맨 위에서만 온전하다.
  for (const frac of [0, 0.25, 0.5, 0.75, 1]) {
    await page.evaluate(({ mount, frac }) => {
      const box = document.getElementById(mount);
      box.scrollTop = frac * (box.scrollHeight - box.clientHeight);
    }, { mount, frac });
    await page.waitForTimeout(150); // scroll-snap 정착
    const { bad, viewport } = await partialRows(page, mount, spec.row, spec.stickyHead);
    ok(bad.length === 0, `스크롤 ${Math.round(frac * 100)}%: 반쪽 행 ${bad.length}건 ` +
      `(뷰포트 ${viewport.top}~${viewport.bottom}, 예: ${JSON.stringify(bad[0] || null)})`);
    if (shots) await page.screenshot({ path: join(shots, `${shot}-${Math.round(frac * 100)}.png`) });
  }

  // ‘모두 펼치기’ — 상한 해제 후 전부 보이는지.
  // 개수 줄이 숨어 있으면 여기서 30초를 기다리다 예외로 튀고, 그 위에서 모은 실패 메시지가
  // 통째로 사라진다(정작 원인은 그쪽에 있다) → 짧게 끊고 실패로 기록만 한다.
  try {
    await page.click(`#${spec.expand}`, { timeout: 3000 });
  } catch {
    ok(false, `‘모두 펼치기’ 버튼을 못 누름 — #${spec.more} 줄이 숨겨져 있는지 확인`);
  }
  await page.waitForTimeout(150);
  const expanded = await page.evaluate(({ mount, countId, row }) => {
    const box = document.getElementById(mount);
    return {
      classes: [...box.classList],
      rows: box.querySelectorAll(row).length,
      countText: document.getElementById(countId).textContent,
    };
  }, { mount, countId: spec.count, row: spec.row });
  ok(expanded.classes.includes('expanded'), '펼치기 후 .expanded 없음');
  ok(expanded.rows === count, `펼친 뒤 행 ${expanded.rows} ≠ ${count}`);
  ok(/모두 표시/.test(expanded.countText || ''), `펼친 뒤 문구 불일치: ${JSON.stringify(expanded.countText)}`);
  if (shots) await page.screenshot({ path: join(shots, `${shot}-expanded.png`), fullPage: true });

  return fails.filter(Boolean);
}

/* ---------- main ---------- */

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const which = arg('--list', 'all');
const count = Number(arg('--count', '70'));
// 값 없이 `--width`만 주면 NaN이 그대로 viewport로 들어가 브라우저가 이상하게 뜬다 → 기본값으로.
const width = Number(arg('--width', '420')) || 420;
const shots = arg('--shots', '');

// --count가 숫자가 아니면 시드가 조용히 0개가 되고(Array.from({length: NaN}) → []),
// 원인 대신 ‘.framed 없음’ 같은 엉뚱한 단언 실패로 끝난다 → 여기서 잡는다.
if (!Number.isInteger(count) || count < 1) {
  console.error(`--count는 1 이상의 정수여야 합니다: ${JSON.stringify(arg('--count', ''))}`);
  process.exit(2);
}

if (shots) mkdirSync(shots, { recursive: true });

const ids = which === 'all' ? Object.keys(LISTS) : [which];
for (const id of ids) {
  if (!LISTS[id]) {
    console.error(`알 수 없는 목록: ${id} (있는 것: ${Object.keys(LISTS).join(', ')})`);
    process.exit(2);
  }
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height: 900 } }); // 플러그인 패널 폭
let failed = 0;
for (const id of ids) {
  const spec = LISTS[id];
  // hiddenFrom이 있으면 ‘숨은 탭에서 시드’ 시나리오를 한 번 더 — 같은 기준을 그대로 적용한다.
  const scenarios = spec.hiddenFrom ? [false, true] : [false];
  const fails = [];
  for (const hidden of scenarios) {
    try {
      fails.push(...await verify(page, id, spec, count, shots, hidden));
    } catch (e) {
      fails.push(`${hidden ? '[숨은 탭에서 시드] ' : ''}예외: ${e.message}`);
    }
  }
  if (fails.length) {
    failed++;
    console.error(`✗ ${id} (${spec.label})`);
    for (const f of fails) console.error(`   · ${f}`);
  } else {
    console.log(`✓ ${id} (${spec.label}) — ${count}개 · 폭 ${width}px · 시나리오 ${scenarios.length}종, ` +
      '5개 스크롤 위치에서 반쪽 행 0건');
  }
}
await browser.close();
process.exit(failed ? 1 : 0);
