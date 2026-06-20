/* ============================================================
   code.ts — 샌드박스 엔트리 & 메시지 라우터 (모든 figma.* 호출 지점)
   ============================================================ */
import type { UiToCode } from './shared/messages';
import { post } from './shared/messages';
import { extractFromSelection } from './lib/extract';
import { createTokens, createSemanticAliases } from './lib/variables';
import { bindSelection } from './lib/bind';
import { renameSelection } from './lib/rename';

figma.showUI(__html__, { width: 400, height: 600, themeColors: true });

const selection = () => figma.currentPage.selection;

figma.ui.onmessage = async (msg: UiToCode) => {
  try {
    switch (msg.type) {
      case 'EXTRACT': {
        const sel = selection();
        const { tokens, warnings } = extractFromSelection(sel);
        post({ type: 'EXTRACT_RESULT', tokens, warnings, selection: sel.length });
        break;
      }
      case 'CREATE_TOKENS': {
        const s = await createTokens(msg.tokens, msg.base);
        const summary = `Global ${s.globals}개 · Semantic ${s.semantics}개 (생성 ${s.created} / 갱신 ${s.updated})`;
        post({ type: 'CREATE_RESULT', created: s.created, updated: s.updated, summary });
        break;
      }
      case 'APPLY': {
        const r = await bindSelection(selection(), msg.tolerance);
        post({ type: 'APPLY_RESULT', bound: r.bound, skipped: r.skipped, flags: r.flags });
        break;
      }
      case 'RENAME': {
        const r = await renameSelection(selection(), { apply: msg.apply, maxDepth: msg.maxDepth });
        post({ type: 'RENAME_RESULT', changes: r.changes, applied: r.applied });
        break;
      }
      case 'CREATE_SEMANTICS': {
        const s = await createSemanticAliases(msg.map);
        post({ type: 'SEMANTICS_RESULT', created: s.created, updated: s.updated, aliased: s.aliased, missing: s.missing });
        break;
      }
      case 'GET_COLLECTIONS': {
        const cols = await figma.variables.getLocalVariableCollectionsAsync();
        post({ type: 'COLLECTIONS', collections: cols.map((c) => ({ id: c.id, name: c.name })) });
        break;
      }
    }
  } catch (err) {
    post({ type: 'ERROR', message: err instanceof Error ? err.message : String(err) });
  }
};
