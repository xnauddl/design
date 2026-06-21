/* ============================================================
   errors.ts — UX7: 원시 오류를 '사람이 읽는 메시지 + 복구 행동'으로
   변환(순수). figma/네트워크 예외 문자열을 패턴 매칭해 안내한다.
   ============================================================ */
export interface FriendlyError {
  /** 사람이 읽는 설명. */
  message: string;
  /** 복구 행동 제안(있으면). */
  action?: string;
  /** 같은 동작 재시도로 해결될 여지가 있는가('다시 시도' 노출 여부). */
  retryable: boolean;
}

/** 원시 오류 메시지 → 친절한 오류. 알 수 없으면 원문을 보존(추적 가능). */
export function explainError(raw: string): FriendlyError {
  const s = (raw || '').toLowerCase();

  if (/font|loadfontasync|has not been loaded/.test(s))
    return { message: '글꼴을 불러오지 못했습니다.', action: '해당 폰트를 설치/활성화한 뒤 다시 시도하세요.', retryable: true };

  if (/invalid scope|scope/.test(s))
    return { message: '변수 스코프가 호환되지 않습니다.', action: '‘토큰 생성/갱신’을 다시 실행해 스코프를 갱신하세요.', retryable: true };

  if (/incompatible|property value/.test(s))
    return { message: '속성 값이 호환되지 않습니다(예: 미발행 컴포넌트).', action: '컴포넌트를 발행하거나 대상 레이어를 확인하세요.', retryable: false };

  if (/read[- ]?only|permission|not allowed|cannot edit/.test(s))
    return { message: '편집 권한이 없거나 읽기 전용 파일입니다.', action: '편집 가능한 파일에서 다시 시도하세요.', retryable: false };

  if (/network|fetch|timeout|offline/.test(s))
    return { message: '네트워크 오류가 발생했습니다.', action: '연결을 확인하고 다시 시도하세요.', retryable: true };

  if (/storage|quota|exceeded/.test(s))
    return { message: '로컬 저장소 접근에 실패했습니다.', action: '잠시 후 다시 시도하세요.', retryable: true };

  // 알 수 없는 오류 — 원문을 함께 보여 추적 가능하게.
  return { message: raw || '알 수 없는 오류', action: '선택을 확인하고 다시 시도하세요.', retryable: true };
}
