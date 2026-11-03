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
  distance?: number;
  /** 변수 값(표시용). 없으면 정확히 같은 후보의 현재 값으로 대신한다. */
  variableValue?: string;
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
  /** 허용오차 안에서만 같으면 차이(0보다 클 때만). */
  distance?: number;
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
        const d = Math.max(...its.map((x) => x.distance ?? 0));
        lines.push({
          nodeId,
          label: l.label,
          fields: l.fields,
          keys: its.map((x) => placeKey({ ...x, nodeId })),
          currentValue: l.currentValue,
          ...(d > 0 ? { distance: d } : {}),
        });
      }
    }
    const exact = list.find((c) => !c.distance);
    const variableValue = list.find((c) => c.variableValue != null)?.variableValue ?? (exact ?? list[0]).currentValue;
    const keys = lines.flatMap((l) => l.keys);
    groups.push({ variableId, variableName: list[0].variableName, variableValue, count: keys.length, keys, lines });
  }
  groups.sort((a, b) => b.count - a.count || a.variableName.localeCompare(b.variableName));
  return groups;
}

/**
 * 조용한 재계산(§4.6 ⑧)의 체크 이어받기.
 * - 같은 곳은 체크 상태를 그대로.
 * - 새로 생긴 곳: 그 변수의 기존 곳이 있었고 모두 체크 풀림이면 체크하지 않는다. 그 밖(새 묶음 포함)은 체크.
 * 반환: 새 체크 집합과 추가·제외 곳 수.
 */
export function carryChecks(
  prev: readonly GroupCand[],
  prevChecked: ReadonlySet<string>,
  next: readonly GroupCand[],
): { checked: Set<string>; added: number; removed: number } {
  const prevKeys = new Set(prev.map(placeKey));
  const anyChecked = new Map<string, boolean>(); // 변수 → 기존 곳 중 체크된 게 있나
  for (const c of prev) {
    const on = prevChecked.has(placeKey(c));
    anyChecked.set(c.variableId, (anyChecked.get(c.variableId) ?? false) || on);
  }
  const checked = new Set<string>();
  const nextKeys = new Set<string>();
  let added = 0;
  for (const c of next) {
    const k = placeKey(c);
    nextKeys.add(k);
    if (prevKeys.has(k)) {
      if (prevChecked.has(k)) checked.add(k);
      continue;
    }
    added++;
    if (anyChecked.get(c.variableId) !== false) checked.add(k);
  }
  let removed = 0;
  for (const k of prevKeys) if (!nextKeys.has(k)) removed++;
  return { checked, added, removed };
}
