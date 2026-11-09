/* ============================================================
   collectionRoles.ts — 플러그인 컬렉션 · 계층 판정 (figma 의존). 판정 규칙은 tiers.ts(순수).
   §2.13: 플러그인이 자동으로 만드는 변수는 플러그인 컬렉션(표시 `dsl.owned`)에만 넣는다.
   사용자 컬렉션은 고치지 않되, 내용으로 판단한 계층에서 찾아 쓴다.
   예전 계층 지정(figma.root `dsl.collectionRoles`)은 읽지도 쓰지도 지우지도 않는다(13.3).
   ============================================================ */
import { CANONICAL_NAME, TIER_NUM, judgeUserTier, pickOwned, type OwnedRole, type TierInfo, type TierSample } from './tiers';

export const OWNED_KEY = 'dsl.owned';

/** 컬렉션의 플러그인 표시('' = 없음). 목 환경에서 API가 없으면 ''. */
export function ownedMarker(c: VariableCollection): string {
  try {
    const fn = (c as unknown as { getPluginData?: (k: string) => string }).getPluginData;
    return typeof fn === 'function' ? fn.call(c, OWNED_KEY) || '' : '';
  } catch {
    return '';
  }
}

/** 플러그인 컬렉션 둘(읽기만 — 표시를 달지 않는다). */
export function ownedCollections(cols: readonly VariableCollection[]): Record<OwnedRole, VariableCollection | undefined> {
  return pickOwned(cols, ownedMarker);
}

/** 그 역할의 플러그인 컬렉션(없으면 undefined). 읽기 전용. */
export function ownedCollection(cols: readonly VariableCollection[], role: OwnedRole): VariableCollection | undefined {
  return ownedCollections(cols)[role];
}

/** 쓰기 직전에 부른다 — 이어받은 컬렉션에 표시를 달고, 없으면 `Global` · `Semantic`으로 만들어 표시를 단다(13.2-3). */
export function ensureOwnedCollection(cols: readonly VariableCollection[], role: OwnedRole): VariableCollection {
  const found = ownedCollection(cols, role);
  const col = found ?? figma.variables.createVariableCollection(CANONICAL_NAME[role]);
  if (ownedMarker(col) !== role) {
    try {
      (col as unknown as { setPluginData?: (k: string, v: string) => void }).setPluginData?.(OWNED_KEY, role);
    } catch {
      /* 표시를 못 달아도 이번 쓰기는 이 컬렉션에 한다 */
    }
  }
  return col;
}

/** 변수 → 판단용 요약(기본 모드 값이 별칭인가, 대상 컬렉션). */
function samplesByCollection(cols: readonly VariableCollection[], vars: readonly Variable[]): Map<string, TierSample[]> {
  const modeOf = new Map(cols.map((c) => [c.id, c.defaultModeId]));
  const colOfVar = new Map(vars.map((v) => [v.id, v.variableCollectionId]));
  const out = new Map<string, TierSample[]>();
  for (const v of vars) {
    const raw = v.valuesByMode?.[modeOf.get(v.variableCollectionId) ?? ''];
    const isAlias = !!raw && typeof raw === 'object' && (raw as VariableAlias).type === 'VARIABLE_ALIAS';
    const s: TierSample = isAlias ? { alias: true, targetCollection: colOfVar.get((raw as VariableAlias).id) ?? null } : { alias: false };
    const arr = out.get(v.variableCollectionId);
    if (arr) arr.push(s);
    else out.set(v.variableCollectionId, [s]);
  }
  return out;
}

/** 컬렉션 id → 계층 번호와 근거(13.4). 플러그인 컬렉션은 그 역할, 사용자 컬렉션은 13.3 판단. */
export function collectionTierInfo(cols: readonly VariableCollection[], vars: readonly Variable[]): Map<string, TierInfo> {
  const owned = ownedCollections(cols);
  const samples = samplesByCollection(cols, vars);
  const out = new Map<string, TierInfo>();
  for (const c of cols) {
    const role = owned.global === c ? 'global' : owned.semantic === c ? 'semantic' : null;
    out.set(c.id, role ? { tier: TIER_NUM[role], why: { kind: 'owned' } } : judgeUserTier(c.name, c.id, samples.get(c.id) ?? []));
  }
  return out;
}

/** 컬렉션 id → 계층 번호(0 = 계층 아님). */
export function collectionTiers(cols: readonly VariableCollection[], vars: readonly Variable[]): Map<string, number> {
  return new Map([...collectionTierInfo(cols, vars)].map(([id, i]) => [id, i.tier]));
}

/** 플러그인 컬렉션 id 모음(사용자 컬렉션 먼저 정렬 등에). */
export function ownedIds(cols: readonly VariableCollection[]): Set<string> {
  const o = ownedCollections(cols);
  return new Set([o.global?.id, o.semantic?.id].filter((x): x is string => !!x));
}
