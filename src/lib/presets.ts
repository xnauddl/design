/* ============================================================
   presets.ts — 팀 공유 프리셋(재사용 설정 묶음) 직렬화/검증 (순수)
   M3(Team): base·tolerance·maxDepth·시맨틱 매핑을 한 묶음으로 저장/공유(JSON).
   저장은 clientStorage(code), 팀 공유는 JSON 내보내기/가져오기. 게이팅은 Team.
   ============================================================ */

export interface Preset {
  name: string;
  /** rem 환산 기준 px. */
  base: number;
  /** 바인딩 허용오차. */
  tolerance: number;
  /** 리네임 맥락 최대 단계. */
  maxDepth: number;
  /** 시맨틱 역할 → Global 변수 이름. */
  semanticMap: Record<string, string>;
}

export const PRESET_VERSION = 1;

/** 프리셋 → 공유용 JSON 문자열(버전 포함). */
export function serializePreset(p: Preset): string {
  return JSON.stringify({ v: PRESET_VERSION, ...p }, null, 2);
}

const num = (v: unknown, d: number): number => (typeof v === 'number' && isFinite(v) ? v : d);

/** JSON 문자열 → 검증·정규화된 프리셋. 누락/오류는 기본값 또는 에러. */
export function parsePreset(text: string): { ok: true; preset: Preset } | { ok: false; error: string } {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'JSON 파싱 실패' };
  }
  if (!raw || typeof raw !== 'object') return { ok: false, error: '프리셋 객체가 아님' };
  const o = raw as Record<string, unknown>;
  const name = typeof o.name === 'string' ? o.name.trim() : '';
  if (!name) return { ok: false, error: 'name이 비어 있음' };

  const semanticMap: Record<string, string> = {};
  if (o.semanticMap && typeof o.semanticMap === 'object') {
    for (const [k, val] of Object.entries(o.semanticMap as Record<string, unknown>)) {
      if (typeof val === 'string') semanticMap[k] = val;
    }
  }
  return {
    ok: true,
    preset: {
      name,
      base: num(o.base, 16),
      tolerance: num(o.tolerance, 0.5),
      maxDepth: Math.max(1, Math.round(num(o.maxDepth, 3))),
      semanticMap,
    },
  };
}

/** 이름을 키로 upsert(최신이 앞). 같은 이름은 교체. */
export function upsertPreset(list: Preset[], p: Preset): Preset[] {
  return [p, ...list.filter((x) => x.name !== p.name)];
}

/** 시맨틱 매핑 텍스트(`역할 = 변수`) ↔ 객체 변환(UI 입력 호환). */
export function semanticMapToText(map: Record<string, string>): string {
  return Object.entries(map)
    .map(([role, global]) => `${role} = ${global}`)
    .join('\n');
}

export function textToSemanticMap(text: string): Record<string, string> {
  const map: Record<string, string> = {};
  for (const line of text.split('\n')) {
    const m = /^\s*([^=]+?)\s*=\s*(.+?)\s*$/.exec(line);
    if (m) map[m[1]] = m[2];
  }
  return map;
}
