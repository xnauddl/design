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
import {
  LicenseCache,
  LicenseStatus,
  evaluateLicense,
  parseVerifyResponse,
  cacheFromVerify,
} from './lib/license';

figma.showUI(__html__, { width: 400, height: 600, themeColors: true });

const selection = () => figma.currentPage.selection;

/* ---------- 라이선스/티어 (M1 개발용 토글 + M2 외부 키 검증) ---------- */
const DEV_TIER_KEY = 'dsl.devTier';
const CACHE_KEY = 'dsl.licenseCache';
/** 검증 서버(자리표시 — 미배포). manifest.networkAccess.allowedDomains와 일치해야 함. */
const VERIFY_URL = 'https://license.example.com/verify';

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

/** 키 검증: 서버 호출 → 성공 시 캐시 저장. 실패/오프라인은 기존 캐시(grace)로 폴백. */
async function verifyKey(key: string): Promise<void> {
  try {
    const resp = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, pluginId: 'design-system-linker' }),
    });
    const parsed = parseVerifyResponse(await resp.json());
    if (parsed.ok) {
      cache = cacheFromVerify(key, parsed, Date.now());
      await figma.clientStorage.setAsync(CACHE_KEY, cache);
      postLicense('라이선스 적용됨');
    } else {
      postLicense(`검증 실패: ${parsed.error}`);
    }
  } catch {
    // 네트워크 실패(오프라인) → 캐시가 있으면 grace로 유지
    postLicense(
      cache
        ? '검증 서버 연결 실패(오프라인) — 캐시된 라이선스로 동작(grace).'
        : '검증 서버 연결 실패(오프라인) — 키를 확인할 수 없습니다.',
    );
  }
}

loadLicense().then(() => {
  postLicense();
  // 캐시가 오래됐으면 백그라운드 재검증(가능 시)
  if (cache && evaluateLicense(cache, Date.now()).stale) void verifyKey(cache.key);
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
      case 'SET_LICENSE_KEY': {
        await verifyKey(msg.key.trim());
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
