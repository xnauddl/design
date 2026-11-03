/* ============================================================
   bindDisplay.ts — 연결(바인딩) 목록을 사람이 읽는 말로 (순수, figma 의존 없음)
   목록이 `paddingLeft 24 → spacing/lg`, `paddingRight 24 → spacing/lg`처럼 API 필드명을
   한 줄씩 늘어놓으면 '무엇이 무엇에 연결됐는지'가 안 읽힌다. 여기서
   - 필드를 디자인 말(채움 색·좌우 여백·모서리…)의 i18n 키로 바꾸고
   - 같은 레이어에서 같은 변수에 묶인 네 방향 여백·모서리·선 두께를 한 줄로 합친다.
   ============================================================ */

const PADDING = ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'] as const;
const RADIUS = ['topLeftRadius', 'topRightRadius', 'bottomRightRadius', 'bottomLeftRadius'] as const;
const STROKE_SIDES = ['strokeTopWeight', 'strokeRightWeight', 'strokeBottomWeight', 'strokeLeftWeight'] as const;

type Family = 'padding' | 'radius' | 'strokeSides';
function familyOf(field: string): Family | null {
  if ((PADDING as readonly string[]).includes(field)) return 'padding';
  if ((RADIUS as readonly string[]).includes(field)) return 'radius';
  if ((STROKE_SIDES as readonly string[]).includes(field)) return 'strokeSides';
  return null;
}

/** 한 레이어의 연결 한 건(BindCandidate에서 필요한 것만). */
export interface BindItem {
  field: string;
  index?: number;
  variableId: string;
  variableName: string;
  currentValue: string;
}

/** 화면 한 줄 = 같은 변수에 묶인 필드 묶음. label은 i18n 키 `field.<label>`의 뒷부분. */
export interface BindLine {
  label: string;
  /** 합쳐진 원래 필드들 — 툴팁(원래 이름)과 체크·교체 대상에 쓴다. */
  fields: string[];
  /** 합쳐진 원래 항목 — 체크 키 계산용. */
  items: BindItem[];
  variableId: string;
  variableName: string;
  currentValue: string;
}

/** 묶음의 라벨 키 — 네 방향이 다 같으면 '여백', 좌우/위아래면 그 말, 한 방향이면 그 방향. */
function familyLabel(fam: Family, fields: string[]): string {
  const has = (f: string) => fields.includes(f);
  if (fam === 'padding') {
    if (fields.length === 4) return 'padding';
    if (fields.length === 2 && has('paddingLeft') && has('paddingRight')) return 'paddingX';
    if (fields.length === 2 && has('paddingTop') && has('paddingBottom')) return 'paddingY';
    if (fields.length === 1) return fields[0];
    return 'paddingSome';
  }
  if (fam === 'radius') return fields.length === 4 ? 'radius' : fields.length === 1 ? fields[0] : 'radiusSome';
  return fields.length === 4 ? 'strokeWeight' : fields.length === 1 ? fields[0] : 'strokeSome';
}

/**
 * 한 레이어의 연결들을 화면 줄로. 순서는 들어온 순서(첫 등장 기준)를 지킨다.
 * 같은 가족(여백·모서리·선 두께) + 같은 변수만 합친다 — 왼쪽 여백만 다른 변수면 따로 남는다.
 */
export function groupBindLines(items: readonly BindItem[]): BindLine[] {
  const lines: BindLine[] = [];
  const byKey = new Map<string, BindLine>();
  for (const it of items) {
    const fam = familyOf(it.field);
    const key = fam ? `${fam}|${it.variableId}` : `${it.field}|${it.index ?? 0}|${it.variableId}`;
    const hit = byKey.get(key);
    if (hit) {
      hit.fields.push(it.field);
      hit.items.push(it);
      continue;
    }
    const line: BindLine = { label: '', fields: [it.field], items: [it], variableId: it.variableId, variableName: it.variableName, currentValue: it.currentValue };
    byKey.set(key, line);
    lines.push(line);
  }
  for (const l of lines) {
    const fam = familyOf(l.fields[0]);
    l.label = fam ? familyLabel(fam, l.fields) : l.fields[0];
  }
  return lines;
}

/** '#rrggbb' 같은 색 값인가(견본을 그릴지). */
export function isHexColor(v: string): boolean {
  return /^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(v.trim());
}
