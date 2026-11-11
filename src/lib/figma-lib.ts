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
  planTsRename,
  applyTsRename,
  applyExistingTextStyles,
  planExistingTextStyles,
  applyTextStyleRows,
  applyRegisteredTextStyles,
  textStyleCandidateTest,
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
export type { CreateSummary, SemanticSummary, TextScanResult, TextStyleResult, ApplyTextStylesResult, ApplyRegisteredResult, RoleVarRenameResult, TsRenameResult } from './variables';
export { bindSelection, bindSelectedItems, countUsage, findUsers, boundVariableIds, deletedBindings, unbindDeleted, countDeleted } from './bind';
export { assignNames, bgKindOf, colorRoleBases, colorSlotKey, colorUse, paddingProp, radiusName, strokeName, isOldPluginName } from './usageRoles';
export type { BindResult } from './bind';
export { renameSelection, writeRole, writeRoleFromName } from './rename';
export type { RenameOutcome } from './rename';
export { createIconRegistry, swapVectorSlots, transplantImageFills, applyInstancePropValues, propIdsByName, nodeAtPath, joinPath, shapePrefix, memberFitIssue, replaceMember, replaceMemberAsync, copyOverridesAsync, snapshotOverrides, restoreOverrides } from './artwork';
export type { IconRegistry, VectorSlot, MemberResult, CopyDeps } from './artwork';
export { scanSimilar, componentizeSimilar, componentizeResultMessage } from './similarApply';
export { captureOrigin, placeAtOrigin, releaseOrigin, fillOrigin, tallyFill } from './placement';
export type { Origin, FillResult, FillTally, Sizing } from './placement';
export type { ComponentizeResult } from './similarApply';
export { generateDarkMode, ensureDarkMode, findModeByName, DARK_MODE_NAME } from './themeApply';
export type { DarkModeResult } from './themeApply';
export { applyVariableToNodes, SKIP_REASONS } from './applyVar';
export type { ApplyVarResult, SkipReason } from './applyVar';
