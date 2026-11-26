// 디자인 토큰 원본(tokens.json, DTCG 형식) → CSS 변수 줄 — docs/design-system.md §2.2.
// build.mjs가 ui.html의 `/* @design-tokens */` 자리에 넣고, test/design-tokens.test.mjs가 같은 함수로 이름 · 참조를 확인한다.
// 이름: JSON 경로를 `-`로 이은 `--그룹-키`. 참조 `{그룹.키}`는 값을 복사하지 않고 `var(--그룹-키)`로 바꾼다.

/** 토큰 하나 = `$value`가 있는 객체. 그룹은 `$`로 시작하지 않는 키를 가진 객체. */
export function flattenTokens(json) {
  const out = [];
  const walk = (node, path) => {
    if (node && typeof node === 'object' && '$value' in node) {
      out.push({ path, name: `--${path.join('-')}`, ...node });
      return;
    }
    for (const [k, v] of Object.entries(node)) {
      if (k.startsWith('$')) continue;
      walk(v, [...path, k]);
    }
  };
  walk(json, []);
  return out;
}

/** `{그룹.키}` → `var(--그룹-키)`. */
export const refToVar = (s) => String(s).replace(/\{([^}]+)\}/g, (_, p) => `var(--${p.split('.').join('-')})`);

/** 참조 목록 — `{a.b}` → `--a-b`. */
export const refsOf = (v) => {
  if (v && typeof v === 'object') return Object.values(v).flatMap(refsOf);
  return [...String(v).matchAll(/\{([^}]+)\}/g)].map((m) => `--${m[1].split('.').join('-')}`);
};

/** 글자 묶음 값 → CSS `font` 한 줄. */
function typographyToFont(v) {
  return [v.fontWeight, `${v.fontSize}/${v.lineHeight}`, v.fontFamily].map(refToVar).join(' ');
}

export function tokenValueToCss(t) {
  if (t.$type === 'typography' && typeof t.$value === 'object') return typographyToFont(t.$value);
  return refToVar(t.$value);
}

/** `:root` 안에 넣을 줄들(들여쓰기 6칸 — ui.html 모양에 맞춤). */
export function tokensToCss(json, indent = '      ') {
  return flattenTokens(json)
    .map((t) => `${indent}${t.name}: ${tokenValueToCss(t)};`)
    .join('\n');
}
