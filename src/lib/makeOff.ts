/**
 * 끈 값은 연결도 안 함(IA v4 §4.3 "연결 단계의 규칙" — 2026-11-24 사용자 결정, B.35).
 * 만들기 화면 Global 탭 줄(토큰)과 연결 자리(bind.ts Slot)를 같은 값 키 `{종류}|{값}`로 잇는다.
 */
import { colorKey, type DraftToken, type TokenCategory } from './tokens';

const round2 = (n: number): number => Math.round(n * 100) / 100;

/** 연결 자리 필드 → 토큰 종류. 표에 없는 필드는 키가 없다(빼지 않음). */
const FIELD_CATEGORY: Readonly<Record<string, TokenCategory>> = {
  fills: 'color',
  strokes: 'color',
  effects: 'effectColor',
  itemSpacing: 'gap',
  counterAxisSpacing: 'gap',
  paddingLeft: 'gap',
  paddingRight: 'gap',
  paddingTop: 'gap',
  paddingBottom: 'gap',
  gridRowGap: 'gap',
  gridColumnGap: 'gap',
  topLeftRadius: 'radius',
  topRightRadius: 'radius',
  bottomLeftRadius: 'radius',
  bottomRightRadius: 'radius',
  cornerRadius: 'radius',
  strokeWeight: 'strokeWidth',
  strokeTopWeight: 'strokeWidth',
  strokeRightWeight: 'strokeWidth',
  strokeBottomWeight: 'strokeWidth',
  strokeLeftWeight: 'strokeWidth',
  width: 'size',
  height: 'size',
  opacity: 'opacity',
  fontSize: 'fontSize',
  lineHeight: 'lineHeight',
  letterSpacing: 'letterSpacing',
  fontFamily: 'fontFamily',
  fontWeight: 'fontWeight',
};

const valuePart = (category: TokenCategory, value: string | number, alpha?: number): string => {
  if (category === 'color' || category === 'effectColor') return colorKey(String(value), alpha);
  return typeof value === 'number' ? String(round2(value)) : value;
};

/** 만들기 줄(토큰)의 값 키. */
export function tokenOffKey(tk: Pick<DraftToken, 'category' | 'value' | 'alpha'>): string {
  return `${tk.category}|${valuePart(tk.category, tk.value, tk.alpha)}`;
}

/**
 * 연결 자리의 값 키 — 색 자리의 `value`는 이미 색 값 키(`colorKey`)다. 알약 반경 자리는 9999(`pill`).
 * 종류를 정할 수 없는 필드면 null.
 */
export function slotOffKey(field: string, kind: 'num' | 'color' | 'text', value: number | string, pill?: number): string | null {
  const category = FIELD_CATEGORY[field];
  if (!category) return null;
  if (kind === 'color') return `${category}|${String(value)}`;
  const v = pill != null ? pill : value;
  return `${category}|${typeof v === 'number' ? String(round2(v)) : v}`;
}
