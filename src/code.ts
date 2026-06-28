/* ============================================================
   code.ts — 샌드박스 엔트리 & 메시지 라우터 (모든 figma.* 호출 지점)
   ============================================================ */
import type { UiToCode, RenameChange } from './shared/messages';
import { post } from './shared/messages';
import { extractFromSelection } from './lib/extract';
import { createTokens, previewCreateTokens, createSemanticAliases, scanTextStyles, createSemanticTextStyles, prunePaletteColors, GLOBAL, SEMANTIC, COMPONENT } from './lib/variables';
import { clusterTextStyles, nameTextStyles } from './lib/textStyles';
import { bindSelection } from './lib/bind';
import { renameSelection } from './lib/rename';
import { rgbToHex, hexToRgb } from './lib/tokens';
import { pascalCase } from './lib/naming';
import { ExportToken, TokenKind, exportTokens } from './lib/exporters';
import { missingVariants, variantGrid, inferComponentProperties, scanComponentCandidates, groupByExactName, deriveVariants, commonBaseName } from './lib/components';
import type { CompPropType, StructNode } from './lib/components';
import { checkContrast, type ContrastSample } from './lib/contrast';
import { Tier, isTier, hasEntitlement, limitsForTier, clampCount } from './lib/entitlements';
import { LicenseCache, LicenseStatus, evaluateLicense, cacheFromVerify } from './lib/license';
import { Preset, upsertPreset } from './lib/presets';
import { commitUndo } from './lib/undo';

// #14: 기본 창을 키우고(트리·편집표 수용) 사용자 리사이즈를 허용. 마지막 크기는 clientStorage에 기억.
const UI_SIZE_KEY = 'dsl.uiSize';
const UI_MIN = { w: 360, h: 480 };
const UI_MAX = { w: 900, h: 1200 };
const UI_DEFAULT = { w: 460, h: 660 };
const clampSize = (w: number, h: number) => ({
  w: Math.round(Math.min(UI_MAX.w, Math.max(UI_MIN.w, w))),
  h: Math.round(Math.min(UI_MAX.h, Math.max(UI_MIN.h, h))),
});

figma.showUI(__html__, { width: UI_DEFAULT.w, height: UI_DEFAULT.h, themeColors: true });

// 저장된 창 크기 복원(있으면).
figma.clientStorage.getAsync(UI_SIZE_KEY).then((s) => {
  const v = s as { w?: number; h?: number } | undefined;
  if (v && typeof v.w === 'number' && typeof v.h === 'number') {
    const c = clampSize(v.w, v.h);
    figma.ui.resize(c.w, c.h);
  }
}).catch(() => {});

const selection = () => figma.currentPage.selection;

/* ---------- 라이선스/티어 ----------
   M1: 개발용 강제 티어 토글 · M2: 외부 키 캐시/grace · M2.1: 서명(JWT) 검증 ·
   M2.2: 네트워크+서명 검증은 UI 아이프레임(WebCrypto 가용)에서 수행하고
   결과(LICENSE_VERIFIED)만 받아 캐시·적용한다. 여기서는 fetch/crypto를 직접 하지 않는다. */
const DEV_TIER_KEY = 'dsl.devTier';
const CACHE_KEY = 'dsl.licenseCache';
const PRESETS_KEY = 'dsl.presets';

let devTier: Tier = 'free'; // 개발용 강제 티어(검증 키가 없을 때만 적용)
let cache: LicenseCache | null = null; // 검증된 라이선스 캐시(우선)
let presets: Preset[] = []; // M3(Team): 공유 프리셋
let bindCancel = false; // UX6: 진행 중 바인딩 취소 플래그

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
    // 손상/구형 캐시 방어: 모든 필드 형식을 확인(특히 key는 REQUEST_VERIFY에서 사용).
    if (c && typeof c.key === 'string' && isTier(c.tier) && typeof c.expiresAt === 'number' && typeof c.lastVerified === 'number') cache = c;
    const ps = await figma.clientStorage.getAsync(PRESETS_KEY);
    if (Array.isArray(ps)) presets = ps as Preset[];
  } catch {
    /* 저장소 접근 실패 시 free 유지 */
  }
}

/**
 * #11: 단계 전제 상태를 UI에 보고 — Global 변수 존재(시맨틱 매핑 가능) ·
 * 바인딩 가능 변수(Semantic/Component) 존재(바인딩 가능). 전제 미충족 카드는
 * UI가 비활성+안내로 가드한다. 토큰/시맨틱 변경 후·시작 시·요청 시 호출.
 */
async function postPrereq(): Promise<void> {
  try {
    const cols = await figma.variables.getLocalVariableCollectionsAsync();
    const globalIds = new Set(cols.filter((c) => c.name === GLOBAL).map((c) => c.id));
    const bindableIds = new Set(cols.filter((c) => c.name === SEMANTIC || c.name === COMPONENT).map((c) => c.id));
    const vars = await figma.variables.getLocalVariablesAsync();
    const hasGlobal = vars.some((v) => globalIds.has(v.variableCollectionId));
    const hasBindable = vars.some((v) => bindableIds.has(v.variableCollectionId));
    post({ type: 'PREREQ_STATE', hasGlobal, hasBindable });
  } catch {
    /* 저장소 접근 실패 시 보고 생략(UI는 마지막 상태 유지) */
  }
}

/** Team 전용 게이트: 아니면 PREMIUM_REQUIRED 안내 후 false. */
function requireTeam(): boolean {
  if (hasEntitlement(currentTier(), 'teamPresets')) return true;
  post({ type: 'PREMIUM_REQUIRED', feature: 'teamPresets', message: '팀 공유 프리셋/이력은 Team 요금제 기능입니다.' });
  return false;
}

/** 베리언트 세트를 속성 기반 2D 그리드로 정렬하고 자식에 맞게 리사이즈. */
function arrangeSet(set: ComponentSetNode): void {
  const children = set.children.filter((c): c is ComponentNode => c.type === 'COMPONENT');
  if (!children.length) return;
  const cellW = Math.max(...children.map((c) => c.width));
  const cellH = Math.max(...children.map((c) => c.height));
  const gap = 16;
  const pad = 16;
  const pos = new Map(variantGrid(children.map((c) => c.name)).map((g) => [g.name, g]));
  let maxCol = 0;
  let maxRow = 0;
  for (const c of children) {
    const g = pos.get(c.name);
    if (!g) continue;
    c.x = pad + g.col * (cellW + gap);
    c.y = pad + g.row * (cellH + gap);
    maxCol = Math.max(maxCol, g.col);
    maxRow = Math.max(maxRow, g.row);
  }
  set.resizeWithoutConstraints(pad * 2 + (maxCol + 1) * cellW + maxCol * gap, pad * 2 + (maxRow + 1) * cellH + maxRow * gap);
}

/** 등록한 메인 컴포넌트를 모아둘 'Components' 페이지(없으면 생성·있으면 재사용). */
async function ensureComponentsPage(): Promise<PageNode> {
  await figma.loadAllPagesAsync(); // dynamic-page: 타 페이지 접근/이동 전 로드 필수
  const found = figma.root.children.find((p) => p.name === COMPONENTS_PAGE);
  if (found) return found;
  const page = figma.createPage();
  page.name = COMPONENTS_PAGE;
  return page;
}
const COMPONENTS_PAGE = 'Components';

/** 페이지에서 기존 노드들 오른쪽 빈 자리의 시작 x(겹침 방지). */
function pageStartX(page: PageNode): number {
  const ch = page.children;
  return ch.length ? Math.max(...ch.map((n) => n.x + n.width)) + 48 : 0;
}

/** 예외에서 사람이 읽을 메시지 추출(진단 노출용). */
function errText(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** 노드가 속한 페이지(없으면 null) — 부모를 PAGE까지 거슬러 올라간다. */
function pageOf(node: BaseNode): PageNode | null {
  let n: BaseNode | null = node;
  while (n && n.type !== 'PAGE') n = n.parent;
  return n && n.type === 'PAGE' ? n : null;
}

/** Pro 이상 게이트(컴포넌트/베리언트): 아니면 PREMIUM_REQUIRED 안내 후 false. */
function requirePro(): boolean {
  if (hasEntitlement(currentTier(), 'components')) return true;
  post({ type: 'PREMIUM_REQUIRED', feature: 'components', message: '컴포넌트 등록·베리언트 분류는 Pro 요금제 기능입니다.' });
  return false;
}

/** #6: 텍스트 범위 바인딩 필드(나머지는 노드 스칼라 필드). */
const TEXT_BIND_FIELDS = new Set(['fontSize', 'lineHeight', 'letterSpacing', 'fontFamily']);

/**
 * #6: 미리보기에서 체크한 후보 1건을 재매칭 없이 그대로 바인딩한다.
 * 노드/변수 소실·미스매치는 false(graceful skip). 성공 시 true.
 */
async function applySelectedBinding(item: { nodeId: string; field: string; index?: number; variableId: string }): Promise<boolean> {
  const node = await figma.getNodeByIdAsync(item.nodeId);
  if (!node || !('type' in node)) return false;
  const variable = await figma.variables.getVariableByIdAsync(item.variableId);
  if (!variable) return false;
  const sn = node as SceneNode;
  try {
    if (item.field === 'fills' || item.field === 'strokes') {
      if (!(item.field in sn)) return false;
      const paints = (sn as unknown as Record<string, Paint[] | typeof figma.mixed>)[item.field];
      if (paints === figma.mixed || !Array.isArray(paints)) return false;
      const i = item.index ?? 0;
      const p = paints[i];
      if (!p || p.type !== 'SOLID') return false;
      const arr = paints.slice();
      arr[i] = figma.variables.setBoundVariableForPaint(p, 'color', variable);
      (sn as unknown as Record<string, Paint[]>)[item.field] = arr;
      return true;
    }
    if (item.field === 'effects') {
      if (!('effects' in sn)) return false;
      const effects = (sn as unknown as { effects: readonly Effect[] }).effects;
      const i = item.index ?? 0;
      const e = effects[i];
      if (!e || (e.type !== 'DROP_SHADOW' && e.type !== 'INNER_SHADOW')) return false;
      const arr = effects.slice();
      arr[i] = figma.variables.setBoundVariableForEffect(e, 'color', variable);
      (sn as unknown as { effects: readonly Effect[] }).effects = arr;
      return true;
    }
    if (TEXT_BIND_FIELDS.has(item.field)) {
      if (sn.type !== 'TEXT' || sn.fontName === figma.mixed) return false;
      await figma.loadFontAsync(sn.fontName);
      const len = sn.characters.length;
      if (len === 0) return false;
      sn.setRangeBoundVariable(0, len, item.field as VariableBindableTextField, variable);
      return true;
    }
    // 스칼라 노드 필드(width/height/padding…/cornerRadius…)
    (sn as unknown as { setBoundVariable: (f: VariableBindableNodeField, x: Variable) => void }).setBoundVariable(item.field as VariableBindableNodeField, variable);
    return true;
  } catch {
    return false;
  }
}

/** Pro 이상 게이트(텍스트 스타일): 아니면 PREMIUM_REQUIRED 안내 후 false. */
function requireTextStyles(): boolean {
  if (hasEntitlement(currentTier(), 'components')) return true;
  post({ type: 'PREMIUM_REQUIRED', feature: 'textStyles', message: '텍스트 스타일 등록은 Pro 요금제 기능입니다.' });
  return false;
}

async function savePresets(): Promise<void> {
  try {
    await figma.clientStorage.setAsync(PRESETS_KEY, presets);
  } catch {
    /* 무시 */
  }
}

/** 변수 → 내보내기 kind 분류(scope 우선, 이름 폴백 — STRING line-height 등 scope 비어있음 대비). */
function kindOf(v: Variable): TokenKind {
  if (v.resolvedType === 'COLOR') return 'color';
  const sc = v.scopes;
  if (sc.includes('FONT_SIZE')) return 'fontSize';
  if (sc.includes('GAP')) return 'spacing';
  if (sc.includes('CORNER_RADIUS')) return 'radius';
  if (sc.includes('WIDTH_HEIGHT')) return 'size';
  if (sc.includes('STROKE_FLOAT')) return 'strokeWidth';
  if (sc.includes('LINE_HEIGHT')) return 'lineHeight';
  if (sc.includes('LETTER_SPACING')) return 'letterSpacing';
  if (sc.includes('OPACITY')) return 'opacity';
  if (sc.includes('EFFECT_FLOAT')) return 'effectFloat';
  if (sc.includes('FONT_WEIGHT')) return 'fontWeight';
  if (sc.includes('FONT_FAMILY')) return 'fontFamily';
  const n = v.name;
  if (n.startsWith('line-height')) return 'lineHeight';
  if (n.startsWith('letter-spacing')) return 'letterSpacing';
  if (n.startsWith('font-size')) return 'fontSize';
  if (n.startsWith('spacing')) return 'spacing';
  if (n.startsWith('radius')) return 'radius';
  if (n.startsWith('stroke-width')) return 'strokeWidth';
  if (n.startsWith('shadow-') || n.startsWith('blur')) return 'effectFloat';
  if (n.startsWith('size')) return 'size';
  if (n.includes('font') && n.includes('weight')) return 'fontWeight';
  if (n.includes('font') && n.includes('family')) return 'fontFamily';
  if (n.includes('opacity')) return 'opacity';
  return 'other';
}

loadLicense().then(() => {
  postLicense();
  // 캐시가 오래됐으면 UI에 백그라운드 재검증 요청(WebCrypto는 UI에서).
  if (cache && evaluateLicense(cache, Date.now()).stale) post({ type: 'REQUEST_VERIFY', key: cache.key });
});

/* ---------- UX5: 실시간 선택 동기화 ----------
   선택이 바뀔 때마다 선택 수·하위 요소 수·바인딩 후보 수를 UI에 알린다.
   대규모 선택에서도 안전하도록 스캔을 상한(SCAN_CAP)으로 제한한다. */
const SCAN_CAP = 1500;
function isBindableCandidate(n: SceneNode): boolean {
  const fills = (n as { fills?: unknown }).fills;
  const hasFills = Array.isArray(fills) && fills.some((p) => (p as Paint).type === 'SOLID' && (p as Paint).visible !== false);
  const strokes = (n as { strokes?: unknown }).strokes;
  const hasStrokes = Array.isArray(strokes) && strokes.length > 0;
  const r = (n as { cornerRadius?: unknown }).cornerRadius;
  const hasRadius = typeof r === 'number' && r > 0;
  const hasFont = typeof (n as { fontSize?: unknown }).fontSize === 'number';
  const lm = (n as { layoutMode?: string }).layoutMode;
  const hasGap = !!lm && lm !== 'NONE' && typeof (n as { itemSpacing?: number }).itemSpacing === 'number';
  return hasFills || hasStrokes || hasRadius || hasFont || hasGap;
}
function postSelection(): void {
  const sel = selection();
  let scanned = 0;
  let bindable = 0;
  let capped = false;
  const stack: SceneNode[] = sel.slice();
  while (stack.length) {
    if (scanned >= SCAN_CAP) {
      capped = true;
      break;
    }
    const n = stack.pop() as SceneNode;
    scanned++;
    if (isBindableCandidate(n)) bindable++;
    if ('children' in n) for (const c of (n as SceneNode & ChildrenMixin).children) stack.push(c as SceneNode);
  }
  post({ type: 'SELECTION_STATE', count: sel.length, scanned, bindable, capped });
}
figma.on('selectionchange', postSelection);

/* ---------- 명도 대비 점검(읽기 전용) ----------
   선택 하위의 텍스트 노드마다 글자색(첫 단색 채움)과 유효 배경(가장 가까운 상위
   단색 채움)을 뽑아 ContrastSample로 만든다. 판정은 순수 모듈(contrast.ts)에 위임.
   한계: 부분 투명·겹친 형제·범위별 혼합색은 다루지 않고 사유별로 건너뛴다. */
const CONTRAST_SCAN_CAP = 2000;

/** 노드의 첫 '보이는 단색' 채움 hex. 없거나 혼합(mixed)이면 null. */
function solidFillHex(node: SceneNode): string | null {
  const fills = (node as { fills?: readonly Paint[] | typeof figma.mixed }).fills;
  if (!Array.isArray(fills)) return null; // figma.mixed 또는 fills 없음
  for (const p of fills) {
    if (p.type === 'SOLID' && p.visible !== false && (p.opacity ?? 1) > 0) return rgbToHex(p.color);
  }
  return null;
}

/** figma 노드 → 구조 비교용 StructNode(재귀). 여백·크기·대표 색을 읽어 순수 그룹화에 넘김. */
function toStructNode(node: SceneNode): StructNode {
  const a = node as unknown as Record<string, unknown>;
  const num = (v: unknown): number | undefined => (typeof v === 'number' ? v : undefined);
  const kids = 'children' in node ? (node.children as readonly SceneNode[]) : [];
  return {
    id: node.id,
    name: node.name,
    type: node.type,
    locked: node.locked,
    width: num(a.width),
    height: num(a.height),
    paddingTop: num(a.paddingTop),
    paddingRight: num(a.paddingRight),
    paddingBottom: num(a.paddingBottom),
    paddingLeft: num(a.paddingLeft),
    itemSpacing: num(a.itemSpacing),
    counterAxisSpacing: num(a.counterAxisSpacing),
    layoutMode: typeof a.layoutMode === 'string' ? a.layoutMode : undefined,
    fillHex: solidFillHex(node),
    children: kids.map(toStructNode),
  };
}

/**
 * 컴포넌트/세트의 **직속 레이어**를 컴포넌트 속성으로 노출(등록에 자동 통합).
 * `inferComponentProperties` 규칙: TEXT→Text · INSTANCE→Instance-swap · 이름 `?`→Boolean(가시성).
 * **인스턴스 내부로는 진입하지 않는다** — 중첩 컴포넌트(예: 카드 안 image-wrapper 인스턴스)는
 * 그 자체를 swap 후보로만 보고, 내부 텍스트는 해당 자식 컴포넌트가 노출(속성 폭발 방지).
 * 세트는 모든 변형의 동명 레이어에 참조 연결. 반환: 노출된 `속성명:타입` 목록.
 */
function exposeProperties(container: ComponentNode | ComponentSetNode, scopes: readonly ComponentNode[]): string[] {
  const ownLayers = (root: ComponentNode): SceneNode[] => {
    const out: SceneNode[] = [];
    const walk = (n: SceneNode): void => {
      if (n !== root) out.push(n);
      if (n.type === 'INSTANCE') return; // 인스턴스 내부 = 그 컴포넌트 소관
      if ('children' in n) for (const c of n.children as readonly SceneNode[]) walk(c);
    };
    walk(root);
    return out;
  };
  const defaultFor = (target: SceneNode, type: CompPropType): string | boolean => {
    if (type === 'TEXT') return target.type === 'TEXT' ? target.characters : '';
    if (type === 'BOOLEAN') return target.visible;
    return target.type === 'INSTANCE' && target.mainComponent ? target.mainComponent.key || target.mainComponent.id : '';
  };
  const scopeLayers = scopes.map((s) => ownLayers(s));
  const repLayers = scopeLayers[0];
  if (!repLayers) return [];
  const out: string[] = [];
  const plan = inferComponentProperties(repLayers.map((l) => ({ name: l.name, type: l.type })));
  for (const p of plan) {
    const repTarget = repLayers.find((l) => l.name === p.layerName);
    if (!repTarget) continue;
    try {
      const id = container.addComponentProperty(p.propName, p.type, defaultFor(repTarget, p.type));
      for (const layers of scopeLayers) {
        const target = layers.find((l) => l.name === p.layerName);
        if (!target) continue; // 해당 레이어 없는 변형은 스킵
        const refs = { ...(target.componentPropertyReferences ?? {}) };
        refs[p.field] = id;
        target.componentPropertyReferences = refs;
      }
      out.push(`${p.propName}:${p.type}`);
    } catch {
      /* 속성 추가/연결 실패(예: 미발행 INSTANCE_SWAP) 스킵 */
    }
  }
  return out;
}

/** 텍스트 위로 올라가며 가장 가까운 상위의 단색 배경(hex + 노드 id). 없으면 null. */
function effectiveBg(node: SceneNode): { hex: string; id: string } | null {
  let cur: BaseNode | null = node.parent;
  while (cur && cur.type !== 'PAGE' && cur.type !== 'DOCUMENT') {
    const hex = solidFillHex(cur as SceneNode);
    if (hex) return { hex, id: cur.id };
    cur = cur.parent;
  }
  return null;
}

function collectContrastSamples(sel: readonly SceneNode[]): { samples: ContrastSample[]; skipped: Record<string, number> } {
  const samples: ContrastSample[] = [];
  const skipped: Record<string, number> = {};
  const note = (k: string): void => {
    skipped[k] = (skipped[k] ?? 0) + 1;
  };
  const stack: SceneNode[] = sel.slice();
  let scanned = 0;
  while (stack.length) {
    if (scanned >= CONTRAST_SCAN_CAP) {
      note('capped');
      break;
    }
    const n = stack.pop() as SceneNode;
    scanned++;
    if (n.type === 'TEXT' && n.visible) {
      const fg = solidFillHex(n);
      if (!fg) note('no-fill'); // 단색 글자색 없음(혼합/이미지/그라데이션 등)
      else {
        const bg = effectiveBg(n);
        if (!bg) note('no-bg'); // 상위에 단색 배경이 없음
        else {
          const fontSize = typeof n.fontSize === 'number' ? n.fontSize : 16; // 혼합이면 보수적 기본값
          const bold = typeof n.fontWeight === 'number' ? n.fontWeight >= 700 : false;
          samples.push({ id: n.id, name: n.name, fg, bg: bg.hex, bgId: bg.id, fontSize, bold });
        }
      }
    }
    if ('children' in n) for (const c of (n as SceneNode & ChildrenMixin).children) stack.push(c as SceneNode);
  }
  return { samples, skipped };
}

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
        const slice = msg.tokens.slice(0, c.allowed);
        // UX1: preview면 변수를 만들지 않고 예정 수만 집계.
        const s = msg.preview ? await previewCreateTokens(slice) : await createTokens(slice, msg.base);
        // 팔레트 재적용(replacePalette): 이번 팔레트에 없는 이전 팔레트 색 변수 정리(사용자 변수 보존).
        const pruned = !msg.preview && msg.replacePalette ? await prunePaletteColors(msg.tokens.map((t) => t.name)) : 0;
        let summary = `Global ${s.globals}개 · Semantic ${s.semantics}개 (생성 ${s.created} / 갱신 ${s.updated})`;
        if (pruned) summary += ` · 이전 색 ${pruned}개 정리`;
        if (c.limited) summary += ` · ⚠ ${msg.tokens.length}개 중 ${c.allowed}개만 적용(Free 한도 ${limit}) — 업그레이드 필요`;
        post({ type: 'CREATE_RESULT', created: s.created, updated: s.updated, summary, limited: c.limited, preview: msg.preview });
        if (!msg.preview) {
          commitUndo(figma); // UX2: 토큰 생성 전체를 단일 Undo로
          await postPrereq(); // #11: 토큰 생성 → 시맨틱/바인딩 전제 충족 갱신
        }
        break;
      }
      case 'APPLY': {
        const lim = limitsForTier(currentTier());
        bindCancel = false; // UX6: 새 작업 시작 시 취소 플래그 초기화
        // UX1: preview면 dry-run(바인딩 없이 집계). UX3: 사유별 스킵(reasons). UX6: 진행률·취소.
        const r = await bindSelection(
          selection(),
          msg.tolerance,
          { maxNodes: lim.nodes, maxBindings: lim.bindings },
          !msg.preview,
          {
            onProgress: (done, total) => post({ type: 'PROGRESS', op: 'bind', done, total }),
            shouldCancel: () => bindCancel,
            yieldToEvents: () => new Promise<void>((resolve) => setTimeout(resolve, 0)),
          },
        );
        post({
          type: 'APPLY_RESULT',
          bound: r.bound,
          skipped: r.skipped,
          flags: r.flags,
          reasons: r.reasons,
          limited: !!r.limited,
          preview: msg.preview,
          cancelled: r.cancelled,
          candidates: r.candidates, // #6: 미리보기 후보(dry-run만)
          nodes: r.nodes, // #13: 미리보기 트리 맥락
        });
        if (!msg.preview) {
          commitUndo(figma); // UX2: 바인딩(취소 시 부분 포함)을 단일 Undo로
        }
        break;
      }
      case 'CANCEL': {
        bindCancel = true; // UX6: 다음 양보 지점에서 중단
        break;
      }
      case 'APPLY_SELECTED': {
        // #6: 미리보기 트리에서 체크한 후보만 재매칭 없이 그대로 바인딩(WYSIWYG).
        let bound = 0;
        let skipped = 0;
        for (const item of msg.items) {
          if (await applySelectedBinding(item)) bound++;
          else skipped++; // 노드/변수 소실·실패는 graceful skip
        }
        post({ type: 'APPLY_RESULT', bound, skipped, flags: [], reasons: {} });
        if (bound) {
          commitUndo(figma); // UX2: 선택 바인딩 전체를 단일 Undo로
        }
        break;
      }
      case 'RENAME': {
        const r = await renameSelection(selection(), { apply: msg.apply, maxDepth: msg.maxDepth });
        post({ type: 'RENAME_RESULT', changes: r.changes, nodes: r.nodes, applied: r.applied });
        if (r.applied && r.changes.length) {
          commitUndo(figma); // UX2: 리네임 전체를 단일 Undo로
        }
        break;
      }
      case 'RENAME_APPLY': {
        // #7: 미리보기 트리에서 체크한 항목만 직접 적용(재계산 없이 id→after 그대로).
        const changes: RenameChange[] = [];
        for (const { id, after } of msg.items) {
          const node = await figma.getNodeByIdAsync(id);
          if (!node || !('name' in node)) continue; // 소실 노드는 graceful skip
          const before = node.name;
          if (before === after) continue;
          node.name = after;
          changes.push({ id, before, after });
        }
        post({ type: 'RENAME_RESULT', changes, nodes: [], applied: true });
        if (changes.length) {
          commitUndo(figma); // UX2: 선택 리네임 전체를 단일 Undo로
        }
        break;
      }
      case 'CREATE_SEMANTICS': {
        const s = await createSemanticAliases(msg.map);
        post({ type: 'SEMANTICS_RESULT', created: s.created, updated: s.updated, aliased: s.aliased, missing: s.missing });
        commitUndo(figma); // UX2: 시맨틱 별칭 생성을 단일 Undo로
        await postPrereq(); // #11: 시맨틱 별칭(바인딩 가능 변수) 생성 → 전제 갱신
        break;
      }
      case 'SCAN_TEXT_STYLES': {
        // 미리보기(읽기 전용)는 무게이팅 — 후보를 보여주고 등록 단계에서 게이팅.
        const { samples, warnings } = scanTextStyles(selection());
        const styles = nameTextStyles(clusterTextStyles(samples));
        post({ type: 'TEXT_STYLE_CANDIDATES', styles, warnings });
        break;
      }
      case 'CREATE_TEXT_STYLES': {
        if (!requireTextStyles()) break;
        const r = await createSemanticTextStyles(msg.styles, msg.apply, selection());
        post({ type: 'TEXT_STYLES_RESULT', created: r.created, updated: r.updated, bound: r.bound, applied: r.applied, missing: r.missing });
        commitUndo(figma); // UX2: 변수+스타일 생성을 단일 Undo로
        break;
      }
      case 'GET_COLLECTIONS': {
        const cols = await figma.variables.getLocalVariableCollectionsAsync();
        post({ type: 'COLLECTIONS', collections: cols.map((c) => ({ id: c.id, name: c.name })) });
        postSelection(); // UI 초기화 시점 — 현재 선택 상태도 함께 전송(UX5).
        break;
      }
      case 'GET_PREREQ': {
        await postPrereq(); // #11: 단계 전제 상태(시작·탭 전환 시)
        break;
      }
      case 'GET_GLOBAL_COLORS': {
        // #10: 기존 Global 색 변수(리터럴 COLOR)를 이름+hex로 수집 → 재방문 시맨틱 매핑 추천.
        const cols = await figma.variables.getLocalVariableCollectionsAsync();
        const globalCol = cols.find((c) => c.name === GLOBAL);
        const colors: { name: string; hex: string }[] = [];
        if (globalCol) {
          const mode = globalCol.defaultModeId;
          for (const v of await figma.variables.getLocalVariablesAsync()) {
            if (v.variableCollectionId !== globalCol.id || v.resolvedType !== 'COLOR') continue;
            const raw = v.valuesByMode[mode];
            if (raw && typeof raw === 'object' && 'r' in raw) colors.push({ name: v.name, hex: rgbToHex(raw as RGB) });
          }
        }
        post({ type: 'GLOBAL_COLORS', colors });
        break;
      }
      case 'RESIZE': {
        // #14: 드래그 중엔 즉시 리사이즈, commit(드롭) 시 크기 저장.
        const c = clampSize(msg.width, msg.height);
        figma.ui.resize(c.w, c.h);
        if (msg.commit) void figma.clientStorage.setAsync(UI_SIZE_KEY, { w: c.w, h: c.h }).catch(() => {});
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
      case 'GET_PRESETS': {
        if (!requireTeam()) break;
        post({ type: 'PRESETS', presets });
        break;
      }
      case 'SAVE_PRESET': {
        if (!requireTeam()) break;
        presets = upsertPreset(presets, msg.preset);
        await savePresets();
        post({ type: 'PRESETS', presets });
        break;
      }
      case 'DELETE_PRESET': {
        if (!requireTeam()) break;
        presets = presets.filter((p) => p.name !== msg.name);
        await savePresets();
        post({ type: 'PRESETS', presets });
        break;
      }
      case 'EXPORT': {
        // 모든 디자인 시스템 변수(Global+Semantic)를 코드로 내보내기. (현재 Free; 추후 게이팅 가능)
        const cols = await figma.variables.getLocalVariableCollectionsAsync();
        const colById = new Map(cols.map((c) => [c.id, c]));
        const vars = await figma.variables.getLocalVariablesAsync();
        const nameById = new Map(vars.map((v) => [v.id, v.name]));
        const tokens: ExportToken[] = [];
        for (const v of vars) {
          const col = colById.get(v.variableCollectionId);
          if (!col || (col.name !== GLOBAL && col.name !== SEMANTIC)) continue;
          const raw = v.valuesByMode[col.defaultModeId];
          const t: ExportToken = {
            name: v.name,
            collection: col.name as 'Global' | 'Semantic',
            type: v.resolvedType,
            kind: kindOf(v),
          };
          if (v.description) t.description = v.description; // #16: 원본 단위("160%") 내보내기 우선
          if (raw && typeof raw === 'object' && 'type' in raw && (raw as VariableAlias).type === 'VARIABLE_ALIAS') {
            const target = nameById.get((raw as VariableAlias).id);
            if (!target) continue; // 대상 불명 → 스킵
            t.aliasOf = target;
          } else if (v.resolvedType === 'COLOR' && raw && typeof raw === 'object' && 'r' in raw) {
            t.value = rgbToHex(raw as RGB);
          } else {
            t.value = raw as string | number;
          }
          tokens.push(t);
        }
        tokens.sort((a, b) => a.name.localeCompare(b.name));
        const content = exportTokens(tokens, {
          format: msg.format,
          fontSizeUnit: msg.fontSizeUnit,
          base: msg.base,
        });
        post({ type: 'EXPORT_RESULT', format: msg.format, content });
        break;
      }
      case 'SCAN_COMPONENT_CANDIDATES': {
        if (!requirePro()) break;
        const roots = selection();
        const candidates = scanComponentCandidates(roots);
        // 라이브 노드 인덱스(서브트리 전체) — 후보 id → 실제 노드.
        const liveById = new Map<string, SceneNode>();
        const index = (n: SceneNode): void => {
          liveById.set(n.id, n);
          if ('children' in n) for (const c of n.children as readonly SceneNode[]) index(c);
        };
        for (const r of roots) index(r);
        // **전체 eligible 후보**를 정확한 이름으로 묶어 미리보기 라벨 주입(깊이 무관).
        // 같은 이름의 조상/자손이 함께면 조상 제외(등록과 동일 규칙). 반복(2개+) → group+variant(자동체크),
        // 단독(1개) → single(PascalCase). 이게 "묶임" 여부를 등록 전에 그대로 보여준다.
        const eligibleNodes = candidates
          .filter((c) => c.eligible)
          .map((c) => liveById.get(c.id))
          .filter((n): n is SceneNode => !!n);
        const isAncestor = (a: SceneNode, b: SceneNode): boolean => {
          let p: BaseNode | null = b.parent;
          while (p) { if (p.id === a.id) return true; p = p.parent; }
          return false;
        };
        const groups = groupByExactName(eligibleNodes.map(toStructNode)).map((g) => {
          const live = g.members.map((m) => liveById.get(m.id)).filter((n): n is SceneNode => !!n);
          const members = g.members.filter((m) => {
            const node = liveById.get(m.id);
            return node ? !live.some((o) => o.id !== node.id && isAncestor(node, o)) : false;
          });
          return { members };
        });
        const preview = new Map<string, { group?: string; variant?: string; single?: string }>();
        for (const g of groups) {
          if (g.members.length < 2) {
            if (g.members[0]) preview.set(g.members[0].id, { single: pascalCase(g.members[0].name) });
            continue;
          }
          const base = commonBaseName(g.members.map((m) => m.name));
          for (const d of deriveVariants(g.members)) preview.set(d.id, { group: base, variant: d.variant });
        }
        const nodes = candidates.map((c) => {
          const p = preview.get(c.id);
          return p ? { ...c, ...p } : c;
        });
        post({ type: 'COMPONENT_CANDIDATES', nodes });
        break;
      }
      case 'REGISTER_COMPONENTS': {
        if (!requirePro()) break;
        await figma.loadAllPagesAsync(); // dynamic-page: 컴포넌트 페이지 이동 전 로드
        let registered = 0;
        let skipped = 0;
        // 후보 필터: FRAME/GROUP · 미잠금(인스턴스/컴포넌트 타입은 자동 제외). **이름 게이트 없음** —
        // 실제 파일은 container/wrapper 같은 임의 이름이 흔해 명사 사전 게이트가 진짜 컴포넌트를 버린다.
        const eligible = (n: SceneNode): boolean => (n.type === 'FRAME' || n.type === 'GROUP') && !n.locked;
        // 대상 결정: 트리에서 체크한 nodeIds, 없으면(스캔 없이 등록) 선택 서브트리를 **재귀**로 모아
        // **반복 이름(2회+)만** 묶는다(단독 잡음 제외).
        let targets: SceneNode[];
        let setsOnly = false;
        if (msg.nodeIds && msg.nodeIds.length) {
          targets = [];
          for (const id of msg.nodeIds) {
            const n = await figma.getNodeByIdAsync(id);
            if (n && 'type' in n) targets.push(n as SceneNode);
            else skipped++; // 소실 노드 graceful skip
          }
        } else {
          const roots = [...selection()];
          const single = roots.length === 1;
          const collected: SceneNode[] = [];
          const walk = (n: SceneNode, depth: number): void => {
            const isContainerRoot = single && depth === 0; // 컨테이너 자신 제외
            if (!isContainerRoot && eligible(n)) collected.push(n);
            if ('children' in n) for (const c of n.children as readonly SceneNode[]) walk(c, depth + 1);
          };
          for (const r of roots) walk(r, 0);
          targets = collected;
          setsOnly = true;
        }
        const valid: SceneNode[] = [];
        for (const n of targets) {
          if (eligible(n)) valid.push(n);
          else skipped++;
        }
        const byId = new Map(valid.map((n) => [n.id, n]));

        // 정확한 이름 기준 그룹화. 같은 이름의 **조상/자손이 함께 선택**되면 조상을 제외한다
        // (같은 세트에 조상·자손을 함께 넣으면 결합이 깨짐 — 잎 쪽을 등록 단위로).
        const isAncestor = (a: SceneNode, b: SceneNode): boolean => {
          let p: BaseNode | null = b.parent;
          while (p) { if (p.id === a.id) return true; p = p.parent; }
          return false;
        };
        let groups = groupByExactName(valid.map(toStructNode)).map((g) => {
          const live = g.members.map((m) => byId.get(m.id)).filter((n): n is SceneNode => !!n);
          const members = g.members.filter((m) => {
            const node = byId.get(m.id);
            return node ? !live.some((o) => o.id !== node.id && isAncestor(node, o)) : false;
          });
          return { key: g.key, members };
        });
        if (setsOnly) groups = groups.filter((g) => g.members.length >= 2); // 폴백: 반복만
        if (!groups.length) {
          post({ type: 'COMPONENTS_RESULT', registered: 0, skipped, sets: 0, singles: [], missing: [], failures: [] });
          break;
        }

        // **깊은 그룹부터** 처리 — 내부 반복(예: Like Button)이 먼저 세트/인스턴스가 된 뒤 바깥
        // (Artwork Card)을 컴포넌트화하면 그 안에 내부 인스턴스가 들어가 **중첩이 보존**된다(각 단계 모두).
        const docDepth = (n: SceneNode): number => {
          let d = 0;
          let p: BaseNode | null = n.parent;
          while (p && p.type !== 'PAGE' && p.type !== 'DOCUMENT') { d++; p = p.parent; }
          return d;
        };
        const groupDepth = (g: { members: { id: string }[] }): number => {
          let max = 0;
          for (const m of g.members) { const node = byId.get(m.id); if (node) max = Math.max(max, docDepth(node)); }
          return max;
        };
        groups = [...groups].sort((a, b) => groupDepth(b) - groupDepth(a));

        const page = await ensureComponentsPage();
        let cursorX = pageStartX(page);
        let sets = 0;
        const singles: string[] = [];
        const failures: string[] = []; // 조용히 삼키던 실패를 UI로 노출(진단)
        // 등록으로 만든 컴포넌트/세트 — 루프 후 **속성 자동 노출**(옛 '속성 노출' 버튼 통합).
        const containers: { container: ComponentNode | ComponentSetNode; scopes: ComponentNode[] }[] = [];

        type Origin = { parent: (BaseNode & ChildrenMixin) | null; index: number; x: number; y: number; autolayout: boolean };
        const captureOrigin = (n: SceneNode): Origin => {
          const parent = n.parent;
          const hasKids = !!parent && 'children' in parent;
          const idx = hasKids ? (parent as BaseNode & ChildrenMixin).children.indexOf(n) : -1;
          const al = !!parent && 'layoutMode' in parent && (parent as FrameNode).layoutMode !== 'NONE';
          return { parent: hasKids ? (parent as BaseNode & ChildrenMixin) : null, index: idx, x: n.x, y: n.y, autolayout: al };
        };
        const placeOnPage = (n: ComponentNode | ComponentSetNode): void => {
          page.appendChild(n);
          n.x = cursorX;
          n.y = 0;
          cursorX += n.width + 48;
        };
        // 한 그룹의 인스턴스를 원위치 복원(부모별 인덱스 오름차순 + 클램프). 깊은 그룹부터 즉시 복원해야
        // 바깥 그룹 컴포넌트화 시 내부 인스턴스가 이미 자리잡고 있다.
        const restore = (places: { inst: InstanceNode; o: Origin }[]): void => {
          places.sort((a, b) => {
            const pa = a.o.parent?.id ?? ''; const pb = b.o.parent?.id ?? '';
            return pa === pb ? a.o.index - b.o.index : pa < pb ? -1 : 1;
          });
          for (const { inst, o } of places) {
            if (!o.parent) { skipped++; continue; }
            try {
              const len = o.parent.children.length;
              o.parent.insertChild(Math.min(Math.max(0, o.index), len), inst);
              if (!o.autolayout) { inst.x = o.x; inst.y = o.y; }
            } catch (e) { skipped++; failures.push(`인스턴스 배치 실패: ${errText(e)}`); }
          }
        };

        for (const g of groups) {
          const setName = commonBaseName(g.members.map((m) => m.name)); // 정확한 이름 → PascalCase
          // 단독(1개) — 컴포넌트화 + 원위치 인스턴스.
          if (g.members.length === 1) {
            const node = byId.get(g.members[0].id);
            if (!node) continue;
            const o = captureOrigin(node);
            try {
              const comp = figma.createComponentFromNode(node);
              comp.name = pascalCase(g.members[0].name);
              placeOnPage(comp);
              singles.push(comp.name);
              registered++;
              containers.push({ container: comp, scopes: [comp] });
              restore([{ inst: comp.createInstance(), o }]);
            } catch (e) {
              skipped++;
              failures.push(`단독 등록 실패(${g.members[0].name}): ${errText(e)}`);
            }
            continue;
          }
          // 2개+ → 각 멤버 컴포넌트화(원위치 기록) 후 세트 결합 → 원위치에 변형 인스턴스 복원.
          const variantById = new Map(deriveVariants(g.members).map((d) => [d.id, d.variant]));
          const made: { comp: ComponentNode; variant: string; o: Origin }[] = [];
          for (const m of g.members) {
            const node = byId.get(m.id);
            if (!node) continue;
            const o = captureOrigin(node);
            try {
              made.push({ comp: figma.createComponentFromNode(node), variant: variantById.get(m.id) ?? '', o });
              registered++;
            } catch (e) {
              skipped++;
              failures.push(`컴포넌트화 실패(${m.name}): ${errText(e)}`);
            }
          }
          if (made.length < 2) {
            // 결합 불가 → 단독으로 등록 + 원위치 인스턴스.
            for (const x of made) {
              try { x.comp.name = setName; } catch { /* 이름 실패 무시 */ }
              placeOnPage(x.comp);
              singles.push(x.comp.name);
              containers.push({ container: x.comp, scopes: [x.comp] });
              restore([{ inst: x.comp.createInstance(), o: x.o }]);
            }
            continue;
          }
          // 결합(핵심). 실패해도 컴포넌트가 소실되지 않게 **단독으로라도 등록**(반쪽 상태 방지).
          let set: ComponentSetNode;
          try {
            // combineAsVariants는 "부모와 같은 페이지" 제약 → **원본 페이지에서 결합 후** 컴포넌트 페이지로 이동.
            const home = pageOf(made[0].comp) ?? figma.currentPage;
            set = figma.combineAsVariants(made.map((x) => x.comp), home);
          } catch (e) {
            failures.push(`결합 실패(${setName}): ${errText(e)}`);
            for (const x of made) {
              try { x.comp.name = setName; } catch { /* 이름 실패 무시 */ }
              placeOnPage(x.comp);
              singles.push(x.comp.name);
              containers.push({ container: x.comp, scopes: [x.comp] });
              try { restore([{ inst: x.comp.createInstance(), o: x.o }]); } catch (ie) { failures.push(`인스턴스 실패: ${errText(ie)}`); }
            }
            continue;
          }
          // 결합 성공 — 이름/이동/인스턴스는 **무조건** 수행(장식 단계 실패로 세트를 버리지 않음).
          set.name = setName;
          for (const x of made) if (x.variant) x.comp.name = x.variant; // 'Prop=value, ...'
          page.appendChild(set); // Components 페이지로 이동
          try { arrangeSet(set); } catch (e) { failures.push(`정렬 실패(${set.name}): ${errText(e)}`); } // 장식: 비치명
          set.x = cursorX;
          set.y = 0;
          cursorX += set.width + 48;
          sets++;
          containers.push({ container: set, scopes: made.map((x) => x.comp) });
          const places: { inst: InstanceNode; o: Origin }[] = [];
          for (const x of made) {
            try { places.push({ inst: x.comp.createInstance(), o: x.o }); } catch (e) { failures.push(`인스턴스 실패(${x.variant}): ${errText(e)}`); }
          }
          restore(places); // 이 그룹 인스턴스 즉시 복원(중첩 보존)
        }

        // 속성 자동 노출 — 등록한 각 컴포넌트/세트의 직속 레이어를 Text/Instance-swap/Boolean 속성으로.
        let exposed = 0;
        for (const c of containers) {
          try { exposed += exposeProperties(c.container, c.scopes).length; } catch (e) { failures.push(`속성 노출 실패: ${errText(e)}`); }
        }

        post({ type: 'COMPONENTS_RESULT', registered, skipped, sets, singles, exposed, missing: [], failures });
        if (registered || sets) commitUndo(figma); // UX2
        break;
      }
      case 'CLASSIFY_VARIANTS': {
        if (!requirePro()) break;
        // 「컴포넌트 등록」과 동일한 **정확한 이름 기준**으로 기존 컴포넌트를 다시 묶는다.
        // 선택의 COMPONENT 중 아직 세트에 안 속한 것만(멱등). 같은 이름 2개+ → 세트, 1개 → 단독.
        const comps = selection().filter(
          (n): n is ComponentNode => n.type === 'COMPONENT' && n.parent?.type !== 'COMPONENT_SET',
        );
        const byId = new Map(comps.map((c) => [c.id, c]));
        const groups = groupByExactName(comps.map(toStructNode));
        let sets = 0;
        const missing: string[] = [];
        const singles: string[] = [];
        const failures: string[] = [];
        for (const g of groups) {
          const nodes = g.members.map((m) => byId.get(m.id)).filter((n): n is ComponentNode => !!n);
          if (nodes.length < 2) {
            if (nodes[0]) singles.push(nodes[0].name);
            continue;
          }
          const variantById = new Map(deriveVariants(g.members).map((d) => [d.id, d.variant]));
          try {
            const parent = nodes[0].parent ?? figma.currentPage;
            const set = figma.combineAsVariants(nodes, parent);
            set.name = commonBaseName(g.members.map((m) => m.name));
            for (const m of g.members) {
              const node = byId.get(m.id);
              const v = variantById.get(m.id);
              if (node && v) node.name = v; // 'Prop=value, ...'
            }
            try { arrangeSet(set); } catch (e) { failures.push(`정렬 실패(${set.name}): ${errText(e)}`); }
            const childNames = set.children.filter((c): c is ComponentNode => c.type === 'COMPONENT').map((c) => c.name);
            const miss = missingVariants(childNames);
            if (miss.length) missing.push(`${set.name}: ${miss.join(' / ')}`);
            sets++;
          } catch (e) {
            failures.push(`결합 실패(${commonBaseName(g.members.map((m) => m.name))}): ${errText(e)}`);
          }
        }
        post({ type: 'VARIANTS_RESULT', sets, missing, singles, failures });
        if (sets) commitUndo(figma); // UX2
        break;
      }
      case 'GENERATE_MISSING_VARIANTS': {
        if (!requirePro()) break;
        const sets = selection().filter((n): n is ComponentSetNode => n.type === 'COMPONENT_SET');
        let generated = 0;
        const combos: string[] = [];
        for (const set of sets) {
          const children = set.children.filter((c): c is ComponentNode => c.type === 'COMPONENT');
          if (!children.length) continue;
          const missing = missingVariants(children.map((c) => c.name));
          const src = children[0];
          for (const combo of missing) {
            try {
              const clone = src.clone();
              clone.name = combo; // 빠진 prop=value 조합
              set.appendChild(clone);
              generated++;
              combos.push(`${set.name}: ${combo}`);
            } catch {
              /* 클론 실패 시 스킵 */
            }
          }
          if (missing.length) arrangeSet(set); // 추가 후 그리드 정렬 + 리사이즈
        }
        post({ type: 'GENERATE_RESULT', generated, sets: sets.length, combos });
        if (generated) commitUndo(figma); // UX2
        break;
      }
      case 'CHECK_CONTRAST': {
        // 읽기 전용 감사 — 쓰기/Undo/이력 없음. 추출은 figma, 판정은 순수 모듈.
        const { samples, skipped } = collectContrastSamples(selection());
        const report = checkContrast(samples, msg.level);
        post({
          type: 'CONTRAST_RESULT',
          level: report.level,
          checked: report.checked,
          passed: report.passed,
          failed: report.failed,
          findings: report.findings,
          skipped,
        });
        break;
      }
      case 'APPLY_CONTRAST_FIX': {
        // #2: 보정색을 대상 노드(텍스트=글자색 / 배경=배경 노드)의 첫 단색 채움에 적용.
        const node = await figma.getNodeByIdAsync(msg.nodeId);
        if (node && 'fills' in node) {
          const fills = (node as { fills?: readonly Paint[] | typeof figma.mixed }).fills;
          if (Array.isArray(fills)) {
            const i = fills.findIndex((p) => p.type === 'SOLID' && p.visible !== false && (p.opacity ?? 1) > 0);
            if (i >= 0) {
              const next = fills.slice();
              next[i] = { ...(next[i] as SolidPaint), color: hexToRgb(msg.hex) };
              (node as unknown as { fills: Paint[] }).fills = next;
              commitUndo(figma); // UX2: 보정 적용을 단일 Undo로
            }
          }
        }
        break;
      }
    }
  } catch (err) {
    // UX7: 실패한 작업 종류(op)도 함께 보내 UI가 해당 영역에 친절한 메시지를 띄운다.
    post({ type: 'ERROR', message: err instanceof Error ? err.message : String(err), op: msg?.type });
  }
};
