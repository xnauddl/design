/* figma 의존 모듈 배럴 — node --test가 dist/figma-lib.mjs로 불러온다.
   런타임에서 전역 `figma`를 참조하므로, 테스트는 import 전에 globalThis.figma 목을 설치한다. */
export { extractFromSelection } from './extract';
export type { ExtractResult } from './extract';
export { createTokens, createSemanticAliases, GLOBAL, SEMANTIC, COMPONENT } from './variables';
export type { CreateSummary, SemanticSummary } from './variables';
export { bindSelection } from './bind';
export type { BindResult } from './bind';
export { renameSelection } from './rename';
export type { RenameOutcome } from './rename';
