/* ============================================================
   a11y.ts — UX8: 접근성 헬퍼(순수). 키보드 탭 내비게이션의 인덱스 계산.
   ============================================================ */

/** ARIA 탭 패턴: 키 입력 → 다음 탭 인덱스. 내비게이션 키가 아니면 -1.
   좌우/상하 화살표는 순환, Home/End는 처음/끝. */
export function nextTabIndex(key: string, current: number, count: number): number {
  if (count <= 0) return -1;
  switch (key) {
    case 'ArrowRight':
    case 'ArrowDown':
      return (current + 1) % count;
    case 'ArrowLeft':
    case 'ArrowUp':
      return (current - 1 + count) % count;
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    default:
      return -1;
  }
}
