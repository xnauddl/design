/* ============================================================
   undo.ts — UX2: 한 작업의 변경을 단일 Undo 스텝으로 묶기
   Figma는 기본적으로 플러그인 변경을 undo 히스토리에 커밋하지 않는다.
   각 쓰기 작업 끝에서 commitUndo()를 호출하면, 그 작업의 변경 전체가
   하나의 undo 그룹이 되고 다음 작업과 분리된다.
   ============================================================ */
export interface UndoCapable {
  commitUndo?: () => void;
}

/** 현재까지의 변경을 단일 Undo 스텝으로 커밋(미지원 환경에선 무시). */
export function commitUndo(f: UndoCapable): void {
  if (typeof f.commitUndo === 'function') f.commitUndo();
}
