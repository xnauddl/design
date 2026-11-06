/* ============================================================
   bindGroups.ts — 연결 후보를 변수별로 묶는다(IA v3 §4.6, 순수 · figma 의존 없음)
   레이어 트리로 늘어놓으면 "어떤 변수가 어디에 연결되나"가 안 읽힌다(2026-11-03 실기 확인).
   - 묶음 = 변수 하나. 그 아래 자리 줄 = 레이어 하나의 속성(네 방향 여백은 한 줄).
   - "곳" = 연결할 자리 하나(후보 하나). 묶은 줄은 k곳.
   ============================================================ */
import { groupBindLines, type BindItem } from './bindDisplay';

/** 묶는 데 필요한 후보 필드(BindCandidate의 부분집합). */
export interface GroupCand extends BindItem {
  nodeId: string;
  /** 변수 값(표시용). 없으면 정확히 같은 후보의 현재 값으로 대신한다. */
  variableValue?: string;
  /** 새 역할(§2.12) — 연결할 때 만든다. 가리킬 Global 이름. */
  newRole?: unknown;
  newRoleGlobalName?: string;
  /** 바꾸는 자리의 원래 변수 이름(Global 또는 용도가 틀린 역할). */
  fromVariableName?: string;
  /** 크기 연결 풀기(§2.12 12.8a). */
  unbind?: boolean;
}

/** 자리 줄 — 레이어 하나에서 같은 변수에 묶인 속성(들). */
export interface PlaceLine {
  nodeId: string;
  /** 속성 라벨 키(`field.<label>`의 뒷부분). */
  label: string;
  fields: string[];
  /** 이 줄이 묶은 후보 키. 길이 = 곳 수. */
  keys: string[];
  currentValue: string;
  /** Global에서 바꾸는 자리면 그 Global 이름(자리 줄 "· {Global}에서", §4.6). */
  from?: string;
}

/** 변수 묶음. */
export interface VarGroup {
  variableId: string;
  variableName: string;
  variableValue: string;
  /** 곳 수(= keys.length). */
  count: number;
  keys: string[];
  lines: PlaceLine[];
  /** 새 역할이면 가리킬 Global 이름(§2.12 — 카드 칩 "새" 표시 · 툴팁). */
  newRoleOf?: string;
  /** 바꾸는 자리 수(풀기 제외). */
  swaps: number;
  /** 크기 연결 풀기 카드(§4.6 "크기 연결 풀기 표시") — 변수 이름은 풀 Global. */
  unbind?: boolean;
}

/** 후보 키 — 같은 곳 = 같은 레이어 · 같은 속성 · 같은 변수(§4.6 ⑧). */
export function placeKey(c: { nodeId: string; field: string; index?: number; variableId: string }): string {
  return `${c.nodeId}|${c.field}|${c.index ?? ''}|${c.variableId}`;
}

/**
 * 후보를 변수별 묶음으로. 순서: 곳 수가 많은 변수부터, 같으면 변수 이름 순.
 * 묶음 안의 자리 줄은 들어온 순서(레이어 트리 순서)를 지킨다.
 */
export function groupByVariable(cands: readonly GroupCand[]): VarGroup[] {
  const byVar = new Map<string, GroupCand[]>();
  for (const c of cands) {
    const arr = byVar.get(c.variableId);
    if (arr) arr.push(c);
    else byVar.set(c.variableId, [c]);
  }
  const groups: VarGroup[] = [];
  for (const [variableId, list] of byVar) {
    // 레이어별로 모은 뒤 네 방향 여백 등을 한 줄로(첫 등장 순서 유지).
    const byNode = new Map<string, GroupCand[]>();
    for (const c of list) {
      const arr = byNode.get(c.nodeId);
      if (arr) arr.push(c);
      else byNode.set(c.nodeId, [c]);
    }
    const lines: PlaceLine[] = [];
    for (const [nodeId, items] of byNode) {
      for (const l of groupBindLines(items)) {
        const its = l.items as GroupCand[];
        lines.push({
          nodeId,
          label: l.label,
          fields: l.fields,
          keys: its.map((x) => placeKey({ ...x, nodeId })),
          currentValue: l.currentValue,
          // 풀기 카드의 자리 줄에는 "…에서" 꼬리를 붙이지 않는다(칩이 이미 말한다).
          ...(its.find((x) => x.fromVariableName && !x.unbind)?.fromVariableName ? { from: its.find((x) => x.fromVariableName && !x.unbind)?.fromVariableName } : {}),
        });
      }
    }
    const variableValue = list.find((c) => c.variableValue != null)?.variableValue ?? list[0].currentValue;
    const keys = lines.flatMap((l) => l.keys);
    const nr = list.find((c) => c.newRole);
    const swaps = list.filter((c) => c.fromVariableName && !c.unbind).length;
    const unbind = list.some((c) => c.unbind);
    groups.push({ variableId, variableName: list[0].variableName, variableValue, count: keys.length, keys, lines, swaps, ...(nr ? { newRoleOf: nr.newRoleGlobalName ?? '' } : {}), ...(unbind ? { unbind: true } : {}) });
  }
  groups.sort((a, b) => b.count - a.count || a.variableName.localeCompare(b.variableName));
  return groups;
}

/**
 * 조용한 재계산(§4.6 ⑧)의 체크 이어받기 — 체크는 변수 단위다.
 * - 전에 있던 변수는 체크 상태를 그대로(그 변수의 새 곳도 같은 상태).
 * - 새로 생긴 변수는 체크.
 * 추가·제외는 곳 단위(같은 곳 = 레이어 · 속성 · 변수)로 센다.
 */
export function carryChecks(
  prev: readonly GroupCand[],
  prevChecked: ReadonlySet<string>,
  next: readonly GroupCand[],
): { checked: Set<string>; added: number; removed: number } {
  const prevKeys = new Set(prev.map(placeKey));
  const varOn = new Map<string, boolean>(); // 변수 → 전에 체크돼 있었나
  for (const c of prev) varOn.set(c.variableId, (varOn.get(c.variableId) ?? false) || prevChecked.has(placeKey(c)));
  const checked = new Set<string>();
  const nextKeys = new Set<string>();
  let added = 0;
  for (const c of next) {
    const k = placeKey(c);
    nextKeys.add(k);
    if (!prevKeys.has(k)) added++;
    if (varOn.get(c.variableId) ?? true) checked.add(k);
  }
  let removed = 0;
  for (const k of prevKeys) if (!nextKeys.has(k)) removed++;
  return { checked, added, removed };
}

/**
 * 자리 줄의 속성 아이콘(§4.6 표) — 연결 코드가 다루는 필드 전부. 표에 없는 새 필드는 "·".
 */
export function fieldIcon(field: string): string {
  if (field === 'fills') return '▣';
  if (field === 'strokes') return '▢';
  if (field === 'effects') return '◐';
  if (field === 'opacity') return '◑';
  if (field === 'strokeWeight' || /^stroke(Top|Right|Bottom|Left)Weight$/.test(field)) return '┃';
  if (field === 'cornerRadius' || /^(topLeft|topRight|bottomRight|bottomLeft)Radius$/.test(field)) return '◰';
  if (/^padding(Top|Right|Bottom|Left)$/.test(field) || ['itemSpacing', 'counterAxisSpacing', 'gridRowGap', 'gridColumnGap'].includes(field)) return '⇔';
  if (/^(width|height|minWidth|maxWidth|minHeight|maxHeight)$/.test(field)) return '↔';
  if (['fontSize', 'lineHeight', 'letterSpacing', 'fontFamily', 'fontWeight', 'fontStyle', 'paragraphSpacing', 'paragraphIndent'].includes(field)) return 'T';
  return '·';
}

/** 찾기 전 빈 상태의 예시 한 줄(§4.6) — 값(기본 모드)과 변수 전체 경로. */
export interface BindExample {
  value: string;
  name: string;
}
interface ExCol { id: string; tier: number; modes: { modeId: string }[]; defaultModeId?: string }
type ExCell = { kind: string; hex?: string; alpha?: number; text?: string; aliasId?: string };
interface ExVar { id: string; name: string; collectionId: string; type: string; values: Record<string, ExCell> }

/**
 * 찾기 전 예시 — 계층이 지정된 로컬 컬렉션을 사이드바 순서(Component → Semantic → Global, 같으면 피그마 순서)로
 * 훑어 첫 색 변수와 첫 숫자 변수. 값은 그 컬렉션 기본 모드(별칭이면 로컬 대상을 따라 최대 5단계).
 * 값을 못 읽는 변수(라이브러리 별칭 등)와 투명도가 1이 아닌 색은 건너뛴다. 없으면 그 종류는 빠진다.
 */
export function bindExamples(cols: readonly ExCol[], vars: readonly ExVar[]): { color?: BindExample; number?: BindExample } {
  const rank = (t: number): number => (t === 3 ? 0 : t === 2 ? 1 : 2);
  const tiered = cols.map((c, i) => ({ c, i })).filter((x) => x.c.tier > 0)
    .sort((a, b) => rank(a.c.tier) - rank(b.c.tier) || a.i - b.i).map((x) => x.c);
  const colById = new Map(cols.map((c) => [c.id, c]));
  const varById = new Map(vars.map((v) => [v.id, v]));
  const defaultCell = (v: ExVar): ExCell | undefined => {
    const col = colById.get(v.collectionId);
    const mode = col?.defaultModeId ?? col?.modes[0]?.modeId ?? '';
    return v.values[mode];
  };
  const resolve = (v: ExVar): ExCell | undefined => {
    let cell = defaultCell(v);
    for (let depth = 0; cell && cell.kind === 'alias' && depth < 5; depth++) {
      const next = cell.aliasId ? varById.get(cell.aliasId) : undefined;
      cell = next ? defaultCell(next) : undefined;
    }
    return cell && cell.kind !== 'alias' ? cell : undefined;
  };
  const out: { color?: BindExample; number?: BindExample } = {};
  for (const col of tiered) {
    for (const v of vars) {
      if (v.collectionId !== col.id) continue;
      if (!out.color && v.type === 'COLOR') {
        const cell = resolve(v);
        // 투명도가 1이 아닌 색 변수는 연결 대상이 아니다(§2.11) — 예시로도 고르지 않는다.
        if (cell?.kind === 'color' && cell.hex && (cell.alpha ?? 1) === 1) out.color = { value: cell.hex.slice(0, 7).toUpperCase(), name: v.name };
      } else if (!out.number && v.type === 'FLOAT') {
        const cell = resolve(v);
        if (cell?.kind === 'number' && cell.text != null) out.number = { value: cell.text, name: v.name };
      }
      if (out.color && out.number) return out;
    }
  }
  return out;
}
