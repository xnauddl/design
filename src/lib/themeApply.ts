/* ============================================================
   themeApply.ts — 다크 모드 자동 채움 (figma 의존 → 목으로 테스트)
   값 변환 자체는 순수 themeGen.ts가 맡고, 여기서는 변수 그래프를 읽고 쓴다.
   (similar.ts ↔ similarApply.ts와 같은 분리)
   ============================================================ */
import { rgbToHex, hexToRgb } from './tokens';
import { GLOBAL } from './variables';
import { darkValueForLight, darkGlobalName, isDarkGlobalName } from './themeGen';

/** Semantic(대상) 컬렉션에 만들/재사용할 다크 모드 표시 이름. */
export const DARK_MODE_NAME = 'Dark';

export interface DarkModeResult {
  /** 새로 만든 `dark/…` Global 프리미티브 수. */
  created: number;
  /** 다크 모드 값을 다시 별칭한 Semantic 변수 수. */
  realiased: number;
  /** 건너뛴 Semantic 변수 수(리터럴 값·출처 소실·이미 다크 짝). */
  skipped: number;
  /** `Dark` 모드를 이번 실행에서 새로 추가했는지. */
  modeCreated?: boolean;
  /** 모드 추가·채움 실패 사유(플랜 한도 등). */
  error?: string;
}

function isVariableAlias(raw: unknown): raw is VariableAlias {
  return !!raw && typeof raw === 'object' && 'type' in raw && (raw as VariableAlias).type === 'VARIABLE_ALIAS';
}

/** 모드 이름 대소문자 무시 검색. */
export function findModeByName(
  modes: ReadonlyArray<{ modeId: string; name: string }>,
  name: string,
): { modeId: string; name: string } | undefined {
  const key = name.toLowerCase();
  return modes.find((m) => m.name.toLowerCase() === key);
}

/**
 * 대상 컬렉션에 `Dark` 모드가 있으면 재사용, 없으면 `addMode('Dark')`.
 * Figma 플랜 한도 등으로 실패하면 예외를 그대로 던진다(호출측에서 error로 담음).
 */
export function ensureDarkMode(collection: VariableCollection): { modeId: string; created: boolean } {
  const existing = findModeByName(collection.modes, DARK_MODE_NAME);
  if (existing) return { modeId: existing.modeId, created: false };
  const modeId = collection.addMode(DARK_MODE_NAME);
  return { modeId, created: true };
}

/**
 * 라이트 모드 Semantic 색을 다크 모드로 자동 채움. Semantic이 Global 별칭인 것만 대상이며
 * (3계층 규칙 — 리터럴 Semantic은 건너뜀), 대응하는 `dark/…` Global을 만들어 그 별칭으로 건다.
 *
 * `toModeId`가 없으면(또는 빈 문자열) `Dark` 모드를 ensure한 뒤 그쪽으로 채운다.
 * `fromModeId`가 없으면 컬렉션 기본 모드를 쓴다(단, 기본이 Dark면 다른 모드를 고름).
 */
export async function generateDarkMode(
  collectionId: string,
  fromModeId?: string,
  toModeId?: string,
): Promise<DarkModeResult> {
  let created = 0;
  let realiased = 0;
  let skipped = 0;
  const cols = await figma.variables.getLocalVariableCollectionsAsync();
  const semanticCol = cols.find((c) => c.id === collectionId);
  if (!semanticCol) return { created, realiased, skipped, error: '컬렉션을 찾을 수 없어요.' };

  let modeCreated = false;
  let to = toModeId;
  if (!to) {
    try {
      const ensured = ensureDarkMode(semanticCol);
      to = ensured.modeId;
      modeCreated = ensured.created;
    } catch (e) {
      const why = e instanceof Error ? e.message : String(e);
      return {
        created: 0,
        realiased: 0,
        skipped: 0,
        error: `Dark 모드를 추가하지 못했어요 — ${why || '플랜에서 모드를 더 만들 수 없을 수 있어요.'}`,
      };
    }
  }

  let from = fromModeId;
  if (!from) {
    // 기본 모드가 Dark면(이미 Dark만 있거나 기본이 Dark인 경우) 다른 모드를 출처로.
    const def = semanticCol.defaultModeId;
    from = def === to
      ? (semanticCol.modes.find((m) => m.modeId !== to)?.modeId ?? def)
      : def;
  }
  if (from === to) {
    return {
      created: 0,
      realiased: 0,
      skipped: 0,
      ...(modeCreated ? { modeCreated: true } : {}),
      error: '라이트와 다크가 같은 모드예요. 다른 라이트 모드를 고르세요.',
    };
  }

  const globalCol = cols.find((c) => c.name === GLOBAL) ?? figma.variables.createVariableCollection(GLOBAL);
  const gMode = globalCol.defaultModeId;
  const allVars = await figma.variables.getLocalVariablesAsync();
  const byId = new Map(allVars.map((v) => [v.id, v]));
  const globalByName = new Map(allVars.filter((v) => v.variableCollectionId === globalCol.id).map((v) => [v.name, v]));

  for (const v of allVars) {
    if (v.variableCollectionId !== semanticCol.id || v.resolvedType !== 'COLOR') continue;
    const fromRaw = v.valuesByMode[from];
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
    v.setValueForMode(to, figma.variables.createVariableAlias(dark));
    realiased++;
  }
  return { created, realiased, skipped, ...(modeCreated ? { modeCreated: true } : {}) };
}
