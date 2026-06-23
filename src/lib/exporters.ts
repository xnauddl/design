/* ============================================================
   exporters.ts — 디자인 토큰(변수) → 코드 내보내기 (순수)
   형식: W3C DTCG JSON · CSS 커스텀 프로퍼티. 형식은 호출 시 택1.
   값/별칭/단위 처리만 담당. figma 변수 읽기는 code.ts.
   ============================================================ */
import { ResolvedType } from './tokens';
import { kebab } from './naming';

export type ExportFormat = 'w3c' | 'css';

export type TokenKind =
  | 'color'
  | 'fontSize'
  | 'spacing'
  | 'radius'
  | 'size'
  | 'strokeWidth'
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
      return dimension(token, opts);
    default:
      return String(token.value);
  }
}

/* ---------- CSS 내보내기 ---------- */
const cssVar = (name: string): string => `--${kebab(name)}`;

function toCss(tokens: ExportToken[], opts: ExportOptions): string {
  const lines: string[] = [':root {'];
  for (const t of tokens) {
    if (t.aliasOf) {
      lines.push(`  ${cssVar(t.name)}: var(${cssVar(t.aliasOf)});`);
    } else {
      lines.push(`  ${cssVar(t.name)}: ${cssLiteral(t, opts)};`);
      // italic이면 동반 font-style 변수
      if (t.kind === 'fontWeight' && splitWeightStyle(t.value as string | number).italic) {
        lines.push(`  ${cssVar(t.name)}-style: italic;`);
      }
    }
  }
  lines.push('}');
  return lines.join('\n');
}

/* ---------- W3C DTCG JSON 내보내기 ---------- */
const W3C_TYPE: Partial<Record<TokenKind, string>> = {
  color: 'color',
  fontSize: 'dimension',
  spacing: 'dimension',
  radius: 'dimension',
  size: 'dimension',
  strokeWidth: 'dimension',
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

/** 형식에 따라 토큰을 코드 문자열로 내보낸다. */
export function exportTokens(tokens: ExportToken[], opts: ExportOptions): string {
  const list = dedupeByName(tokens);
  return opts.format === 'css' ? toCss(list, opts) : toW3C(list, opts);
}
