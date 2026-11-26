// 컴포넌트 공용 — 요소 만들기. 문구는 부르는 쪽이 t()로 넘긴다(컴포넌트 안에 문구 없음 — design-system §6.7).
export function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}
export type Size = 'sm' | 'md' | 'lg';
/** 크기 클래스 — md는 클래스를 붙이지 않는다(기본). */
export const sizeCls = (base: string, size?: Size): string => (size && size !== 'md' ? ` ${base}--${size}` : '');
let uid = 0;
export const nextId = (p: string): string => `${p}-${++uid}`;
