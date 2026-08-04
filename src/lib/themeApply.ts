/* ============================================================
   themeApply.ts — 다크 모드 자동 채움 (figma 의존 → 목으로 테스트)
   값 변환 자체는 순수 themeGen.ts가 맡고, 여기서는 변수 그래프를 읽고 쓴다.
   (similar.ts ↔ similarApply.ts와 같은 분리)
   ============================================================ */
import { rgbToHex, hexToRgb } from './tokens';
import { GLOBAL } from './variables';
import { darkValueForLight, darkGlobalName, isDarkGlobalName } from './themeGen';

export interface DarkModeResult {
  /** 새로 만든 `dark/…` Global 프리미티브 수. */
  created: number;
  /** 다크 모드 값을 다시 별칭한 Semantic 변수 수. */
  realiased: number;
  /** 건너뛴 Semantic 변수 수(리터럴 값·출처 소실·이미 다크 짝). */
  skipped: number;
}

function isVariableAlias(raw: unknown): raw is VariableAlias {
  return !!raw && typeof raw === 'object' && 'type' in raw && (raw as VariableAlias).type === 'VARIABLE_ALIAS';
}

/**
 * 라이트 모드 Semantic 색을 다크 모드로 자동 채움. Semantic이 Global 별칭인 것만 대상이며
 * (3계층 규칙 — 리터럴 Semantic은 건너뜀), 대응하는 `dark/…` Global을 만들어 그 별칭으로 건다.
 */
export async function generateDarkMode(collectionId: string, fromModeId: string, toModeId: string): Promise<DarkModeResult> {
  let created = 0;
  let realiased = 0;
  let skipped = 0;
  const cols = await figma.variables.getLocalVariableCollectionsAsync();
  const semanticCol = cols.find((c) => c.id === collectionId);
  if (!semanticCol) return { created, realiased, skipped };
  const globalCol = cols.find((c) => c.name === GLOBAL) ?? figma.variables.createVariableCollection(GLOBAL);
  const gMode = globalCol.defaultModeId;
  const allVars = await figma.variables.getLocalVariablesAsync();
  const byId = new Map(allVars.map((v) => [v.id, v]));
  const globalByName = new Map(allVars.filter((v) => v.variableCollectionId === globalCol.id).map((v) => [v.name, v]));

  for (const v of allVars) {
    if (v.variableCollectionId !== semanticCol.id || v.resolvedType !== 'COLOR') continue;
    const fromRaw = v.valuesByMode[fromModeId];
    if (!isVariableAlias(fromRaw)) {
      skipped++;
      continue;
    }
    const lightGlobal = byId.get(fromRaw.id);
    const lightRaw = lightGlobal?.valuesByMode[gMode];
    if (!lightGlobal || !(lightRaw && typeof lightRaw === 'object' && 'r' in lightRaw)) {
      skipped++;
      continue;
    }
    // 출처가 이미 다크 짝(`dark/…`)이면 대상 이름이 자기 자신이라 원본 값을 덮어쓴다.
    // 모드를 자유롭게 고를 수 있어 from=Dark가 가능하므로 건너뛴다(파괴 방지).
    if (isDarkGlobalName(lightGlobal.name)) {
      skipped++;
      continue;
    }
    const darkHex = darkValueForLight(rgbToHex(lightRaw as RGB));
    const dname = darkGlobalName(lightGlobal.name);
    let dark = globalByName.get(dname);
    if (!dark) {
      dark = figma.variables.createVariable(dname, globalCol, 'COLOR');
      dark.scopes = lightGlobal.scopes;
      dark.hiddenFromPublishing = true; // 직접 사용 방지(3계층 규칙)
      globalByName.set(dname, dark);
      created++;
    }
    dark.setValueForMode(gMode, hexToRgb(darkHex));
    v.setValueForMode(toModeId, figma.variables.createVariableAlias(dark));
    realiased++;
  }
  return { created, realiased, skipped };
}
