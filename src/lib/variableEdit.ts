/* ============================================================
   variableEdit.ts — 변수 속성 편집의 순수 검증·표시 헬퍼 (figma 의존 없음 → node --test)
   값 파싱/표시/이름 검증을 분리해 code.ts(쓰기)와 ui.ts(입력)가 공유한다.
   ============================================================ */
import { ResolvedType, ScopeName, hexToRgb, rgbToHex, scopesForType } from './tokens';

/** 파싱된 변수 값(모드에 setValueForMode로 그대로 넣을 수 있는 형태). */
export type ParsedVarValue = string | number | boolean | { r: number; g: number; b: number };

export type ParseResult =
  | { ok: true; value: ParsedVarValue }
  | { ok: false; error: string };

/**
 * 입력 문자열을 변수 타입에 맞는 값으로 파싱·검증.
 * COLOR=#hex(→RGB 0~1), FLOAT=유한 숫자, STRING=비어있지 않은 문자, BOOLEAN=true/false.
 * 잘못된 입력은 사용자용 한국어 메시지와 함께 거부.
 */
export function parseVarValue(type: ResolvedType, input: string): ParseResult {
  const s = input.trim();
  switch (type) {
    case 'COLOR': {
      if (!/^#?[0-9a-f]{6}$/i.test(s)) return { ok: false, error: '색은 #RRGGBB 형식이어야 합니다.' };
      return { ok: true, value: hexToRgb(s) };
    }
    case 'FLOAT': {
      const n = Number(s);
      if (s === '' || !Number.isFinite(n)) return { ok: false, error: '숫자를 입력하세요.' };
      return { ok: true, value: n };
    }
    case 'STRING': {
      if (s === '') return { ok: false, error: '빈 문자열은 허용되지 않습니다.' };
      return { ok: true, value: s };
    }
    case 'BOOLEAN': {
      const v = s.toLowerCase();
      if (v === 'true') return { ok: true, value: true };
      if (v === 'false') return { ok: true, value: false };
      return { ok: false, error: 'true 또는 false를 입력하세요.' };
    }
  }
}

/** 변수 값(리터럴)을 입력칸 표시 문자열로. COLOR=hex, 그 외=문자열화. */
export function displayVarValue(type: ResolvedType, value: unknown): string {
  if (type === 'COLOR' && value && typeof value === 'object' && 'r' in (value as Record<string, unknown>)) {
    return rgbToHex(value as { r: number; g: number; b: number });
  }
  return String(value);
}

/**
 * 변수 이름 검증 — 빈 이름·같은 컬렉션 내 중복 거부.
 * `existing`은 같은 컬렉션의 다른 변수 이름들(자기 이름 제외). 문제없으면 null.
 */
export function validateVarName(name: string, existing: readonly string[]): string | null {
  const n = name.trim();
  if (!n) return '이름을 입력하세요.';
  if (existing.includes(n)) return '같은 컬렉션에 같은 이름의 변수가 있습니다.';
  return null;
}

/**
 * 스코프 목록을 변수 타입에 유효한 것만 남기고 중복 제거(편집 적용 전 정제).
 * tokens.ts의 scopesForType를 재사용하되 중복도 함께 제거한다.
 */
export function sanitizeScopes(scopes: ScopeName[], type: ResolvedType): ScopeName[] {
  return [...new Set(scopesForType(scopes, type))];
}

/**
 * 별칭 재지정 가능 여부 — 자기 자신을 가리키면 거부(직접 순환).
 * 깊은 순환(A→B→A)은 code.ts에서 전체 그래프로 판정한다(여기선 자기참조만 순수 차단).
 */
export function aliasSelfReference(sourceId: string, targetId: string): boolean {
  return sourceId === targetId;
}

/** findAliasReferers 입력용 최소 구조(messages.VarInfo와 구조적으로 호환, 결합 회피). */
interface AliasCellLike {
  kind: 'literal' | 'alias';
  aliasId?: string;
}
interface VarLike {
  id: string;
  name: string;
  values: Record<string, AliasCellLike>;
}

/**
 * varId를 (어느 모드에서든) 별칭으로 참조하는 변수들 — 삭제/리네임 영향 분석(R2-C).
 * 자기 자신은 제외. 순수 함수라 node --test로 검증.
 */
export function findAliasReferers(varId: string, vars: readonly VarLike[]): { id: string; name: string }[] {
  const out: { id: string; name: string }[] = [];
  for (const v of vars) {
    if (v.id === varId) continue;
    for (const cell of Object.values(v.values)) {
      if (cell.kind === 'alias' && cell.aliasId === varId) {
        out.push({ id: v.id, name: v.name });
        break;
      }
    }
  }
  return out;
}

/** 3계층 별칭 허용 — Semantic→Global, Component→Semantic|Global. Global은 별칭 불가. */
export function aliasTargetCollectionOk(
  sourceCollection: string,
  targetCollection: string,
): boolean {
  if (sourceCollection === 'Global') return false;
  if (sourceCollection === 'Semantic') return targetCollection === 'Global';
  if (sourceCollection === 'Component') return targetCollection === 'Semantic' || targetCollection === 'Global';
  return false;
}

/**
 * 신규 변수 생성 입력 검증(순수).
 * Global=리터럴 필수·별칭 금지 / Semantic·Component=별칭 필수·리터럴 금지.
 */
export function validateCreateVariable(input: {
  collection: string;
  name: string;
  existingNames: readonly string[];
  hasLiteral: boolean;
  hasAlias: boolean;
  aliasTargetCollection?: string;
}): string | null {
  const nameErr = validateVarName(input.name, input.existingNames);
  if (nameErr) return nameErr;
  if (input.collection === 'Global') {
    if (input.hasAlias) return 'Global은 리터럴만 허용합니다(별칭 불가).';
    if (!input.hasLiteral) return 'Global에는 리터럴 값이 필요합니다.';
    return null;
  }
  if (input.collection === 'Semantic' || input.collection === 'Component') {
    if (input.hasLiteral) return `${input.collection}은 별칭만 허용합니다(리터럴 불가).`;
    if (!input.hasAlias) return `${input.collection}에는 Global(또는 Semantic) 별칭이 필요합니다.`;
    if (input.aliasTargetCollection && !aliasTargetCollectionOk(input.collection, input.aliasTargetCollection)) {
      return `${input.collection}은 ${input.collection === 'Semantic' ? 'Global' : 'Semantic/Global'}만 별칭할 수 있습니다.`;
    }
    return null;
  }
  return '편집 대상이 아닌 컬렉션입니다.';
}

/** 이름 첫 토막으로 그룹 — `color/blue/500`→`color`, `cta-background-color`→이름 자체. */
export function groupKeyForVarName(name: string): string {
  const i = name.indexOf('/');
  return i <= 0 ? name : name.slice(0, i);
}

/** 변수 목록을 그룹 키 오름차순 → 이름 오름차순으로 묶기. */
export function groupVarsByPath<T extends { name: string }>(vars: readonly T[]): Array<{ group: string; items: T[] }> {
  const map = new Map<string, T[]>();
  for (const v of vars) {
    const g = groupKeyForVarName(v.name);
    const list = map.get(g);
    if (list) list.push(v);
    else map.set(g, [v]);
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([group, items]) => ({ group, items: [...items].sort((a, b) => a.name.localeCompare(b.name)) }));
}
