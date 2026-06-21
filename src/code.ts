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
import { LicenseCache, LicenseStatus, evaluateLicense, cacheFromVerify } from './lib/license';

figma.showUI(__html__, { width: 400, height: 600, themeColors: true });

const selection = () => figma.currentPage.selection;

/* ---------- 라이선스/티어 ----------
   M1: 개발용 강제 티어 토글 · M2: 외부 키 캐시/grace · M2.1: 서명(JWT) 검증 ·
   M2.2: 네트워크+서명 검증은 UI 아이프레임(WebCrypto 가용)에서 수행하고
   결과(LICENSE_VERIFIED)만 받아 캐시·적용한다. 여기서는 fetch/crypto를 직접 하지 않는다. */
const DEV_TIER_KEY = 'dsl.devTier';
const CACHE_KEY = 'dsl.licenseCache';

let devTier: Tier = 'free'; // 개발용 강제 티어(검증 키가 없을 때만 적용)
let cache: LicenseCache | null = null; // 검증된 라이선스 캐시(우선)

function effective(): {
  tier: Tier;
  source: 'key' | 'dev' | 'none';
  status?: LicenseStatus;
  expiresAt?: number;
} {
  if (cache) {
    const ev = evaluateLicense(cache, Date.now());
    return { tier: ev.tier, source: 'key', status: ev.status, expiresAt: cache.expiresAt };
  }
  if (devTier !== 'free') return { tier: devTier, source: 'dev' };
  return { tier: 'free', source: 'none' };
}

const currentTier = (): Tier => effective().tier;

function postLicense(note?: string): void {
  const e = effective();
  post({
    type: 'LICENSE_STATUS',
    tier: e.tier,
    unlimited: hasEntitlement(e.tier, 'unlimited'),
    source: e.source,
    status: e.status,
    expiresAt: e.expiresAt,
    note,
  });
}

async function loadLicense(): Promise<void> {
  try {
    const dt = await figma.clientStorage.getAsync(DEV_TIER_KEY);
    if (isTier(dt)) devTier = dt;
    const c = (await figma.clientStorage.getAsync(CACHE_KEY)) as LicenseCache | undefined;
    if (c && isTier(c.tier) && typeof c.expiresAt === 'number') cache = c;
  } catch {
    /* 저장소 접근 실패 시 free 유지 */
  }
}

loadLicense().then(() => {
  postLicense();
  // 캐시가 오래됐으면 UI에 백그라운드 재검증 요청(WebCrypto는 UI에서).
  if (cache && evaluateLicense(cache, Date.now()).stale) post({ type: 'REQUEST_VERIFY', key: cache.key });
});

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
        const limit = limitsForTier(currentTier()).tokens;
        const c = clampCount(msg.tokens.length, limit);
        const s = await createTokens(msg.tokens.slice(0, c.allowed), msg.base);
        let summary = `Global ${s.globals}개 · Semantic ${s.semantics}개 (생성 ${s.created} / 갱신 ${s.updated})`;
        if (c.limited) summary += ` · ⚠ ${msg.tokens.length}개 중 ${c.allowed}개만 적용(Free 한도 ${limit}) — 업그레이드 필요`;
        post({ type: 'CREATE_RESULT', created: s.created, updated: s.updated, summary, limited: c.limited });
        break;
      }
      case 'APPLY': {
        const lim = limitsForTier(currentTier());
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
        devTier = msg.tier;
        try {
          await figma.clientStorage.setAsync(DEV_TIER_KEY, devTier);
        } catch {
          /* 저장 실패해도 세션 동안은 적용 */
        }
        postLicense();
        break;
      }
      case 'LICENSE_VERIFIED': {
        // UI가 수행한 검증 결과를 받아 캐시·적용(부수효과만 여기서).
        if (msg.result.ok) {
          cache = cacheFromVerify(msg.key, msg.result, Date.now());
          try {
            await figma.clientStorage.setAsync(CACHE_KEY, cache);
          } catch {
            /* 저장 실패해도 세션 동안은 적용 */
          }
          postLicense('라이선스 적용됨');
        } else if (msg.result.offline) {
          // 오프라인 — 기존 캐시(grace) 유지, 변경 없음.
          postLicense(
            cache
              ? '오프라인 — 캐시된 라이선스로 동작(grace).'
              : '오프라인 — 키를 확인할 수 없습니다.',
          );
        } else {
          postLicense(`검증 실패: ${msg.result.error}`);
        }
        break;
      }
      case 'CLEAR_LICENSE': {
        cache = null;
        try {
          await figma.clientStorage.deleteAsync(CACHE_KEY);
        } catch {
          /* 무시 */
        }
        postLicense('라이선스 키 제거됨');
        break;
      }
    }
  } catch (err) {
    post({ type: 'ERROR', message: err instanceof Error ? err.message : String(err) });
  }
};
