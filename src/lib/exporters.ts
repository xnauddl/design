/* ============================================================
   exporters.ts — 디자인 토큰(변수) → 코드 내보내기 (순수)
   형식: W3C DTCG JSON · CSS 커스텀 프로퍼티. 형식은 호출 시 택1.
   값/별칭/단위 처리만 담당. figma 변수 읽기는 code.ts.
   ============================================================ */
import { ResolvedType } from './tokens';
import { kebab } from './naming';
import { t } from './i18n';

export type ExportFormat = 'w3c' | 'css';

export type TokenKind =
  | 'color'
  | 'fontSize'
  | 'spacing'
  | 'radius'
  | 'size'
  | 'strokeWidth'
  | 'effectFloat'
  | 'lineHeight'
  | 'letterSpacing'
  | 'fontFamily'
  | 'fontWeight'
  | 'opacity'
  | 'other';

export interface ExportToken {
  /** 슬래시 경로 이름. 예: 'color/primary/500', 'surface'. */
  name: string;
  collection: 'Global' | 'Semantic';
  type: ResolvedType;
  kind: TokenKind;
  /** Global 리터럴. COLOR=#hex, FLOAT=px 숫자, STRING=문자("Inter"). */
  value?: string | number;
  /** Semantic 별칭 대상 토큰 이름. */
  aliasOf?: string;
  /** #16: 원본 단위 표기(Variable.description). lineHeight/letterSpacing 출력 시 px보다 우선("160%"). */
  description?: string;
}

/**
 * 텍스트 스타일 — 행간·자간 %의 집(변수는 px 정수만, A안). 내보내기는 %를 **그대로** 낸다:
 * W3C는 `typography` 복합 토큰(lineHeight "150%", letterSpacing "2%"), CSS는 속성별 커스텀 프로퍼티.
 */
export interface ExportTextStyle {
  /** 스타일 이름(슬래시 경로 가능: 'body', 'heading/h1'). */
  name: string;
  fontFamily: string;
  /** Figma 스타일 문자열("Semi Bold Italic") 또는 숫자. */
  fontStyle: string | number;
  fontSize: number;
  lineHeight: { unit: 'percent' | 'px' | 'auto'; value: number };
  letterSpacing: { unit: 'percent' | 'px'; value: number };
}

export interface ExportOptions {
  format: ExportFormat;
  /** 폰트 크기를 px/rem 중 선택. */
  fontSizeUnit: 'px' | 'rem';
  /** rem 환산 기준 px. */
  base: number;
}

/* ---------- 폰트 weight/style(이탤릭) 분리 ---------- */
const WEIGHT_NAMES: Record<string, number> = {
  thin: 100,
  hairline: 100,
  extralight: 200,
  ultralight: 200,
  light: 300,
  regular: 400,
  normal: 400,
  medium: 500,
  semibold: 600,
  demibold: 600,
  bold: 700,
  extrabold: 800,
  ultrabold: 800,
  black: 900,
  heavy: 900,
};

/** 숫자(400) 또는 스타일 문자열("Semi Bold Italic") → { weight, italic }. */
export function splitWeightStyle(value: string | number): { weight: number; italic: boolean } {
  if (typeof value === 'number') return { weight: value, italic: false };
  const s = String(value);
  const italic = /italic|oblique/i.test(s);
  const cleaned = s.replace(/italic|oblique/gi, '').replace(/[\s_-]/g, '').toLowerCase();
  const weight = WEIGHT_NAMES[cleaned] ?? (Number(cleaned) || 400);
  return { weight, italic };
}

/* ---------- 치수 표현 ---------- */
/** FLOAT(px) 토큰 값을 형식 문자열로. fontSize만 rem 옵션 적용, 나머지 px. */
function dimension(token: ExportToken, opts: ExportOptions): string {
  const n = Number(token.value);
  if (token.kind === 'fontSize' && opts.fontSizeUnit === 'rem') {
    const r = n / opts.base;
    return `${Number(r.toFixed(4))}rem`;
  }
  return `${n}px`;
}

/** 토큰의 리터럴 값을 CSS 문자열로(별칭 제외). */
function cssLiteral(token: ExportToken, opts: ExportOptions): string {
  switch (token.kind) {
    case 'color':
      return String(token.value);
    case 'fontFamily':
      return String(token.value);
    case 'opacity':
      return String(token.value);
    case 'lineHeight':
    case 'letterSpacing':
      // #16: 원본 단위(description, "160%")가 있으면 우선, 없으면 px.
      return token.description ?? `${Number(token.value)}px`;
    case 'fontWeight':
      return String(splitWeightStyle(token.value as string | number).weight);
    case 'fontSize':
    case 'spacing':
    case 'radius':
    case 'size':
    case 'strokeWidth':
    case 'effectFloat':
      return dimension(token, opts);
    default:
      return String(token.value);
  }
}

/* ---------- CSS 내보내기 ---------- */
const cssVar = (name: string): string => `--${kebab(name)}`;
/** 변수 이름 → CSS 변수명(내보내기와 같은 규칙). 변수 관리의 ‘CSS 변수명 복사’가 쓴다. */
export function cssVarName(name: string): string {
  return cssVar(name);
}

/** 한 변수의 CSS 줄(italic 굵기면 짝 줄 `-style: italic`이 바로 아래). */
function tokenCssLines(t: ExportToken, opts: ExportOptions): string[] {
  if (t.aliasOf) return [`  ${cssVar(t.name)}: var(${cssVar(t.aliasOf)});`];
  const out = [`  ${cssVar(t.name)}: ${cssLiteral(t, opts)};`];
  if (t.kind === 'fontWeight' && splitWeightStyle(t.value as string | number).italic) {
    out.push(`  ${cssVar(t.name)}-style: italic;`);
  }
  return out;
}

/*
 * CSS 파일 모양(ia-v3 §4.4 "CSS 파일 모양" — 2026-11-20 사용자 결정):
 * 계층 먼저(GLOBAL → SEMANTIC → TEXT STYLES 블록마다 `:root`), 블록 안은 종류 묶음,
 * 묶음 안은 Figma 이름 `localeCompare` 순. 빈 묶음 · 빈 블록은 주석까지 생략.
 * 머리 주석은 코드 상수(번역하지 않음 — 내보낸 파일은 코드).
 */
const CSS_RULE = '='.repeat(74);
const cssBlockHead = (title: string): string[] => [`/* ${CSS_RULE}`, `   ${title}`, `   ${CSS_RULE} */`];
const CSS_HEAD = {
  Global: 'GLOBAL (Primitive) — raw values. Do not use directly in components.',
  Semantic: 'SEMANTIC — UI roles mapped to Global. Use these in components.',
  textStyles: 'TEXT STYLES',
} as const;

/** 종류 묶음 순서(사용자 예시 · 시안 순서 — 화면 종류 순서와 일부러 다름, ia-v4 §2.7). */
const CSS_GROUP_ORDER = ['Color', 'Typography', 'Spacing', 'Radius', 'Size', 'Stroke', 'Opacity', 'Other'] as const;
type CssGroup = (typeof CSS_GROUP_ORDER)[number];

/** 종류 → 묶음. `Record`라서 종류가 늘면 여기를 채우지 않는 한 타입 검사가 실패한다(CSS에서 조용히 빠지지 않게). */
const CSS_GROUP_OF: Record<TokenKind, CssGroup> = {
  color: 'Color',
  fontSize: 'Typography',
  lineHeight: 'Typography',
  letterSpacing: 'Typography',
  fontFamily: 'Typography',
  fontWeight: 'Typography',
  spacing: 'Spacing',
  radius: 'Radius',
  size: 'Size',
  strokeWidth: 'Stroke',
  opacity: 'Opacity',
  effectFloat: 'Other',
  other: 'Other',
};

/** 이름순 — 코드 단위 비교(실행 환경의 언어 설정과 무관하게 늘 같은 순서). */
const byName = <T extends { name: string }>(a: T, b: T): number => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);

/** 한 계층의 블록 — 변수가 없으면 null. */
function tierBlock(tokens: readonly ExportToken[], tier: 'Global' | 'Semantic', opts: ExportOptions): string[] | null {
  const mine = tokens.filter((t) => t.collection === tier);
  if (!mine.length) return null;
  const body: string[] = [];
  for (const g of CSS_GROUP_ORDER) {
    const inGroup = mine.filter((t) => (CSS_GROUP_OF[t.kind] ?? 'Other') === g).sort(byName);
    if (!inGroup.length) continue;
    if (body.length) body.push('');
    body.push(`  /* ${g} */`);
    for (const t of inGroup) body.push(...tokenCssLines(t, opts));
  }
  return [...cssBlockHead(CSS_HEAD[tier]), ':root {', ...body, '}'];
}

function toCss(tokens: ExportToken[], opts: ExportOptions, textStyles: readonly ExportTextStyle[]): string {
  const blocks: string[][] = [];
  for (const tier of ['Global', 'Semantic'] as const) {
    const b = tierBlock(tokens, tier, opts);
    if (b) blocks.push(b);
  }
  if (textStyles.length) {
    const sorted = [...textStyles].sort(byName);
    blocks.push([...cssBlockHead(CSS_HEAD.textStyles), ':root {', ...textStylesToCss(sorted, opts), '}']);
  }
  if (!blocks.length) return ':root {\n}'; // 껍데기 — 저장 전에 exportHasTokens가 거른다
  return blocks.map((b) => b.join('\n')).join('\n\n');
}

/* ---------- W3C DTCG JSON 내보내기 ---------- */
const W3C_TYPE: Partial<Record<TokenKind, string>> = {
  color: 'color',
  fontSize: 'dimension',
  spacing: 'dimension',
  radius: 'dimension',
  size: 'dimension',
  strokeWidth: 'dimension',
  effectFloat: 'dimension',
  fontFamily: 'fontFamily',
  fontWeight: 'fontWeight',
  opacity: 'number',
  lineHeight: 'lineHeight', // 비표준(DTCG 미정의) — 단위 보존 위해 문자열 값
  letterSpacing: 'letterSpacing', // 비표준
};

/** 별칭 대상 이름 → W3C 참조 `{a.b.c}`. */
const w3cRef = (name: string): string => `{${name.split('/').filter(Boolean).join('.')}}`;

function w3cValue(token: ExportToken, opts: ExportOptions): string | number {
  if (token.aliasOf) return w3cRef(token.aliasOf);
  switch (token.kind) {
    case 'color':
    case 'fontFamily':
      return String(token.value);
    case 'lineHeight':
    case 'letterSpacing':
      return token.description ?? `${Number(token.value)}px`; // #16: 원본 단위 우선
    case 'opacity':
      return Number(token.value);
    case 'fontWeight':
      return splitWeightStyle(token.value as string | number).weight;
    case 'fontSize':
    case 'spacing':
    case 'radius':
    case 'size':
    case 'strokeWidth':
    case 'effectFloat':
      return dimension(token, opts);
    default:
      return token.value ?? '';
  }
}

interface W3CLeaf {
  $type?: string;
  $value: string | number;
}
type W3CNode = { [key: string]: W3CNode | W3CLeaf };

function toW3C(tokens: ExportToken[], opts: ExportOptions): string {
  const root: W3CNode = {};
  for (const t of tokens) {
    const segs = t.name.split('/').filter(Boolean);
    let node = root;
    for (let i = 0; i < segs.length - 1; i++) {
      const key = segs[i];
      if (!node[key] || '$value' in node[key]) node[key] = (node[key] as W3CNode) ?? {};
      node = node[key] as W3CNode;
    }
    const leaf: W3CLeaf = { $value: w3cValue(t, opts) };
    const ty = W3C_TYPE[t.kind];
    if (ty) leaf.$type = ty;
    node[segs[segs.length - 1]] = leaf;

    // italic 동반 토큰(비표준 fontStyle)
    if (!t.aliasOf && t.kind === 'fontWeight' && splitWeightStyle(t.value as string | number).italic) {
      node[`${segs[segs.length - 1]}-style`] = { $type: 'fontStyle', $value: 'italic' };
    }
  }
  return JSON.stringify(root, null, 2);
}

/**
 * 이름 중복 제거 — Semantic은 Global의 1:1 미러(동일 이름)라 그대로 두면
 * 충돌/자기참조가 생긴다. 같은 이름이면 Global(리터럴) 우선, Semantic 미러는 버린다.
 * 이름이 고유한 시맨틱 역할(primary·surface·space/md 등)은 유지된다.
 */
function dedupeByName(tokens: ExportToken[]): ExportToken[] {
  const seen = new Map<string, ExportToken>();
  for (const t of tokens) {
    const prev = seen.get(t.name);
    if (!prev || (prev.collection === 'Semantic' && t.collection === 'Global')) seen.set(t.name, t);
  }
  return [...seen.values()];
}

/* ---------- 별칭 풀기 · 같은 이름 알림 (ia-v3 §4.4 · A.23) ---------- */

/** 내보내기 입력 — 로컬 변수 하나(내보내지 않는 것도 — 별칭 사슬을 따라가려고). 값은 그 변수 컬렉션의 기본 모드. */
export interface ExportVarInput {
  id: string;
  name: string;
  /** 13.4 계층 번호 — 1 Global · 2 Semantic만 내보낸다(0 · 3은 남지 않는 변수). */
  tier: number;
  type: ResolvedType;
  kind: TokenKind;
  description?: string;
  /** 기본 모드 값이 별칭이면 대상 변수 id. */
  alias?: string;
  /** 별칭이 아니면 값(색은 이미 `#rrggbb[aa]`). */
  value?: string | number | boolean;
}

/** 원래 변수를 포함해 읽는 상한(연결 쪽 `bind.ts` `resolveValue`와 같다). */
const ALIAS_READ_LIMIT = 12;

/**
 * 변수 목록(13.5 순서 — 사용자 컬렉션 먼저 · 목록 순) → 내보낼 토큰(dedupe 전).
 * ⓪ 사슬이 실제 값에 닿지 않는 변수(없는 대상 · 순환 · 12번 초과)를 빼고 → 남는 변수를 정하고 →
 * ① 남는 변수를 만나면 그 이름을 가리키고 ② 아니면 값까지 따라가 값을 낸다.
 * 이름 · 계층 · 종류는 원래 변수, 설명은 ①이면 원래 · ②면 값을 준 변수.
 */
export function resolveExportTokens(vars: readonly ExportVarInput[]): ExportToken[] {
  const byId = new Map(vars.map((v) => [v.id, v]));
  const reachesValue = (v: ExportVarInput): boolean => {
    const seen = new Set([v.id]);
    let cur = v;
    for (let reads = 1; cur.alias !== undefined; reads++) {
      if (reads >= ALIAS_READ_LIMIT) return false;
      const next = byId.get(cur.alias);
      if (!next || seen.has(next.id)) return false;
      seen.add(next.id);
      cur = next;
    }
    return true;
  };
  const ok = vars.filter((v) => (v.tier === 1 || v.tier === 2) && reachesValue(v));
  // 남는 변수 — dedupeByName과 같은 규칙(같은 이름이면 Global, 같은 계층이면 앞의 것)
  const winner = new Map<string, ExportVarInput>();
  for (const v of ok) {
    const prev = winner.get(v.name);
    if (!prev || (prev.tier === 2 && v.tier === 1)) winner.set(v.name, v);
  }
  const survivors = new Set([...winner.values()].map((v) => v.id));
  return ok.map((v) => {
    const tok: ExportToken = { name: v.name, collection: v.tier === 1 ? 'Global' : 'Semantic', type: v.type, kind: v.kind };
    let cur = v;
    while (cur.alias !== undefined) {
      const next = byId.get(cur.alias) as ExportVarInput; // ⓪에서 닿는 것을 확인함
      if (survivors.has(next.id)) {
        tok.aliasOf = next.name; // ①
        if (v.description) tok.description = v.description;
        return tok;
      }
      cur = next;
    }
    tok.value = cur.value as string | number; // ② (참거짓도 그대로)
    if (cur.description) tok.description = cur.description;
    return tok;
  });
}

/**
 * Global과 이름이 같은데 거울이 아닌 Semantic이 있는 이름(중복 없음 · 코드 단위 이름순).
 * 거울: ⓐ 자기 이름을 가리키는 별칭 ⓑ 둘 다 별칭이면 같은 대상, 둘 다 값이면 값 · 설명 · 종류가 같음.
 * 견줄 Global은 남는 것(앞의 것). 같은 계층 안 겹침은 세지 않는다.
 */
export function exportClashes(tokens: readonly ExportToken[]): string[] {
  const globalOf = new Map<string, ExportToken>();
  for (const tk of tokens) if (tk.collection === 'Global' && !globalOf.has(tk.name)) globalOf.set(tk.name, tk);
  const out = new Set<string>();
  for (const s of tokens) {
    if (s.collection !== 'Semantic') continue;
    const g = globalOf.get(s.name);
    if (!g) continue;
    const mirror =
      s.aliasOf === s.name ||
      (s.aliasOf !== undefined && g.aliasOf !== undefined
        ? s.aliasOf === g.aliasOf
        : s.aliasOf === undefined && g.aliasOf === undefined && s.value === g.value && s.description === g.description && s.kind === g.kind);
    if (!mirror) out.add(s.name);
  }
  return [...out].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

/** 내보내기 팝업 상태 줄의 겹침 꼬리(`export.clash`) — 이름은 앞 3개, 넘치면 `list.usesMore`. 겹침이 없으면 ''. */
export function exportClashNotice(clashes: readonly string[]): string {
  if (!clashes.length) return '';
  const shown = clashes.slice(0, 3).join(', ');
  const rest = clashes.length - 3;
  const names = rest > 0 ? `${shown} ${t('list.usesMore', { n: rest })}` : shown;
  return t('export.clash', { n: clashes.length, names });
}

/* ---------- 텍스트 스타일(typography) ---------- */
const TYPO_PREFIX = 'typography';
const pct = (n: number): string => `${Number(n.toFixed(2))}%`;
const lineHeightStr = (lh: ExportTextStyle['lineHeight']): string =>
  lh.unit === 'auto' ? 'normal' : lh.unit === 'percent' ? pct(lh.value) : `${Number(lh.value.toFixed(2))}px`;
const letterSpacingStr = (ls: ExportTextStyle['letterSpacing']): string =>
  ls.unit === 'percent' ? pct(ls.value) : `${Number(ls.value.toFixed(2))}px`;
const fontSizeStr = (px: number, opts: ExportOptions): string =>
  opts.fontSizeUnit === 'rem' ? `${Number((px / opts.base).toFixed(4))}rem` : `${px}px`;

function textStylesToCss(styles: readonly ExportTextStyle[], opts: ExportOptions): string[] {
  const lines: string[] = [];
  for (const st of styles) {
    const base = cssVar(`${TYPO_PREFIX}/${st.name}`);
    const { weight, italic } = splitWeightStyle(st.fontStyle);
    lines.push(`  ${base}-font-family: ${st.fontFamily};`);
    lines.push(`  ${base}-font-size: ${fontSizeStr(st.fontSize, opts)};`);
    lines.push(`  ${base}-font-weight: ${weight};`);
    if (italic) lines.push(`  ${base}-font-style: italic;`);
    lines.push(`  ${base}-line-height: ${lineHeightStr(st.lineHeight)};`);
    lines.push(`  ${base}-letter-spacing: ${letterSpacingStr(st.letterSpacing)};`);
  }
  return lines;
}

function textStylesToW3C(styles: readonly ExportTextStyle[], opts: ExportOptions, root: W3CNode): void {
  for (const st of styles) {
    const segs = [TYPO_PREFIX, ...st.name.split('/').filter(Boolean)];
    let node = root;
    for (let i = 0; i < segs.length - 1; i++) {
      const key = segs[i];
      if (!node[key] || '$value' in node[key]) node[key] = (node[key] as W3CNode) ?? {};
      node = node[key] as W3CNode;
    }
    const { weight, italic } = splitWeightStyle(st.fontStyle);
    const value: Record<string, string | number> = {
      fontFamily: st.fontFamily,
      fontSize: fontSizeStr(st.fontSize, opts),
      fontWeight: weight,
      lineHeight: lineHeightStr(st.lineHeight), // DTCG는 number(배율)를 권하지만 원본 %를 그대로 보존(2026-10-28 결정)
      letterSpacing: letterSpacingStr(st.letterSpacing),
    };
    if (italic) value.fontStyle = 'italic';
    node[segs[segs.length - 1]] = { $type: 'typography', $value: value as unknown as string };
  }
}

/** 형식에 따라 토큰(+텍스트 스타일)을 코드 문자열로 내보낸다. */
export function exportTokens(tokens: ExportToken[], opts: ExportOptions, textStyles: readonly ExportTextStyle[] = []): string {
  const list = dedupeByName(tokens);
  if (opts.format === 'css') return toCss(list, opts, textStyles);
  const root = JSON.parse(toW3C(list, opts)) as W3CNode;
  textStylesToW3C(textStyles, opts, root);
  return JSON.stringify(root, null, 2);
}

/**
 * 내보낸 문자열에 토큰이 하나라도 담겼는가. 대상 변수가 없으면 형식별 껍데기
 * (`{}` · `:root {\n}`)만 나오는데, 그걸 파일로 저장하면 "내보냈다"는 신호만 남고
 * 내용은 비어 있다. 저장 전에 이걸로 거른다.
 */
export function exportHasTokens(content: string, format: ExportFormat): boolean {
  if (format === 'css') return /--[\w-]+\s*:/.test(content);
  try {
    const root: unknown = JSON.parse(content);
    return !!root && typeof root === 'object' && Object.keys(root as object).length > 0;
  } catch {
    return false;
  }
}
