/* figma 의존 모듈 배럴 — node --test가 dist/figma-lib.mjs로 불러온다.
   런타임에서 전역 `figma`를 참조하므로, 테스트는 import 전에 globalThis.figma 목을 설치한다. */
export { backgroundOf, extractFromSelection, isIconOrAvatar } from './extract';
export type { ExtractResult } from './extract';
export {
  createTokens,
  previewCreateTokens,
  createUsageRoles,
  createSemanticAliases,
  scanTextStyles,
  scanExistingTextStyles,
  createSemanticTextStyles,
  renameTextRoleVars,
  applyExistingTextStyles,
  planExistingTextStyles,
  applyTextStyleRows,
  applyRegisteredTextStyles,
  textStyleCandidateTest,
  dropRemoteClusters,
  creationOrder,
  prunePaletteColors,
  isManualVar,
  createManualVariable,
  duplicateVariable,
  deleteVariable,
  editValueToFigma,
  VarNameError,
  VarGoneError,
  USER_COLLECTION_NAME,
  GLOBAL,
  SEMANTIC,
  COMPONENT,
} from './variables';
export type { CreateSummary, SemanticSummary, TextScanResult, TextStyleResult, ApplyTextStylesResult, ApplyRegisteredResult, RoleVarRenameResult } from './variables';
export { judgeUnused, collectAliasIds, scanUnusedVariables, deleteUnusedVariables } from './unusedVars';
export { bindSelection, collectLocalMains, createRole, bindSelectedItems, countUsage, findUsers, boundVariableIds, deletedBindings, unbindDeleted, countDeleted, mergeScopes, readVarInfos } from './bind';
export { assignNames, bgKindOf, byFamilyOrder, colorRoleBases, colorRoleRef, colorSlotKey, colorUse, familyRe, nameKindOf, paddingProp, radiusName, strokeName, isOldPluginName, pickOwner } from './usageRoles';
export type { BindResult } from './bind';
export { renameSelection, writeRole, writeRoleFromName, stripRootPrefix, nameHintRole } from './rename';
export type { RenameOutcome } from './rename';
export { generateDarkMode, ensureDarkMode, findModeByName, oldDarkMode, countDarkUnfilled, darkPrereq, readDarkFill, hex8, darkChangedBeforeError, DARK_MODE_NAME, DARK_FILL_KEY } from './themeApply';
export type { DarkMigrated, DarkFillEntry, DarkFillRecord } from './themeApply';
export type { DarkModeResult } from './themeApply';
export { applyVariableToNodes, SKIP_REASONS } from './applyVar';
export type { ApplyVarResult, SkipReason } from './applyVar';
