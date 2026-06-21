/* ============================================================
   code.ts — 샌드박스 엔트리 & 메시지 라우터 (모든 figma.* 호출 지점)
   ============================================================ */
import type { UiToCode } from './shared/messages';
import { post } from './shared/messages';
import { extractFromSelection } from './lib/extract';
import { createTokens, createSemanticAliases } from './lib/variables';
import { bindSelection } from './lib/bind';
import { renameSelection } from './lib/rename';
import { Tier, isTier, hasEntitlement, limitsForTier, clampCount } from './lib/entitlements';

figma.showUI(__html__, { width: 400, height: 600, themeColors: true });

const selection = () => figma.currentPage.selection;

/* ---------- 라이선스/티어 (M1: 개발용 토글, 결제 없음) ---------- */
const LICENSE_KEY = 'dsl.license';
let tier: Tier = 'free';

async function loadLicense(): Promise<void> {
  try {
    const v = (await figma.clientStorage.getAsync(LICENSE_KEY)) as { tier?: unknown } | undefined;
    if (v && isTier(v.tier)) tier = v.tier;
  } catch {
    /* 저장소 접근 실패 시 free 유지 */
  }
}

function postLicense(): void {
  post({ type: 'LICENSE_STATUS', tier, unlimited: hasEntitlement(tier, 'unlimited') });
}

loadLicense().then(postLicense);

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
        // Free 사용량 한도: 초과분은 적용하지 않음(비파괴) + 업그레이드 안내.
        const limit = limitsForTier(tier).tokens;
        const c = clampCount(msg.tokens.length, limit);
        const s = await createTokens(msg.tokens.slice(0, c.allowed), msg.base);
        let summary = `Global ${s.globals}개 · Semantic ${s.semantics}개 (생성 ${s.created} / 갱신 ${s.updated})`;
        if (c.limited) summary += ` · ⚠ ${msg.tokens.length}개 중 ${c.allowed}개만 적용(Free 한도 ${limit}) — 업그레이드 필요`;
        post({ type: 'CREATE_RESULT', created: s.created, updated: s.updated, summary, limited: c.limited });
        break;
      }
      case 'APPLY': {
        const lim = limitsForTier(tier);
        const r = await bindSelection(selection(), msg.tolerance, { maxNodes: lim.nodes, maxBindings: lim.bindings });
        post({ type: 'APPLY_RESULT', bound: r.bound, skipped: r.skipped, flags: r.flags, limited: !!r.limited });
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
      case 'GET_LICENSE': {
        postLicense();
        break;
      }
      case 'SET_LICENSE': {
        tier = msg.tier;
        try {
          await figma.clientStorage.setAsync(LICENSE_KEY, { tier });
        } catch {
          /* 저장 실패해도 세션 동안은 적용 */
        }
        postLicense();
        break;
      }
    }
  } catch (err) {
    post({ type: 'ERROR', message: err instanceof Error ? err.message : String(err) });
  }
};
