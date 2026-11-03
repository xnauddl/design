/* ============================================================
   collectionRoles.ts — 파일에 저장된 컬렉션 역할 지정을 읽고 쓴다 (figma 의존)
   판정 규칙은 tiers.ts(순수). 저장 위치는 figma.root pluginData — 같은 파일을 여는
   모든 사람이 같은 지정을 쓴다(clientStorage는 사용자별이라 부적합).
   읽기는 동기라 기존 async 흐름을 바꾸지 않고 `cols.find(c => c.name === …)` 자리를 대체한다.
   ============================================================ */
import { parseRoleMap, pickCollection, tierOfCollection, roleOfCollection, type RoleMap, type TierRole } from './tiers';

export const ROLE_MAP_KEY = 'dsl.collectionRoles';

/** 현재 파일의 역할 맵. root가 없는 목 환경·오류는 빈 맵(= 정확한 이름 규칙). */
export function readRoleMap(): RoleMap {
  try {
    const root = (figma as unknown as { root?: { getPluginData?: (k: string) => string } }).root;
    return parseRoleMap(root?.getPluginData?.(ROLE_MAP_KEY));
  } catch {
    return {};
  }
}

export function writeRoleMap(map: RoleMap): void {
  figma.root.setPluginData(ROLE_MAP_KEY, JSON.stringify(map));
}

/** 역할을 맡은 컬렉션(없으면 undefined). */
export function findCollection(cols: readonly VariableCollection[], role: TierRole): VariableCollection | undefined {
  return pickCollection(cols, readRoleMap(), role);
}

/** 역할을 맡은 컬렉션, 없으면 정해진 이름으로 새로 만든다. */
export function ensureCollection(cols: readonly VariableCollection[], role: TierRole, name: string): VariableCollection {
  return findCollection(cols, role) ?? figma.variables.createVariableCollection(name);
}

/** 컬렉션 id → 계층 번호(0=계층 아님). 한 번 읽은 맵으로 여러 컬렉션을 판정할 때. */
export function collectionTiers(cols: readonly VariableCollection[]): Map<string, number> {
  const map = readRoleMap();
  return new Map(cols.map((c) => [c.id, tierOfCollection(c, map)]));
}

export function collectionRole(col: VariableCollection): TierRole | null {
  return roleOfCollection(col, readRoleMap());
}
