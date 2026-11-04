/* ============================================================
   errors.ts — UX7: 원시 오류를 '사람이 읽는 메시지 + 복구 행동'으로
   변환(순수). figma/네트워크 예외 문자열을 패턴 매칭해 안내한다.
   ============================================================ */
import { t } from './i18n';
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
    return { message: t('err.font'), action: t('err.fontAction'), retryable: true };

  if (/invalid scope|scope/.test(s))
    return { message: t('err.scope'), action: t('err.scopeAction'), retryable: true };

  if (/incompatible|property value/.test(s))
    return { message: t('err.prop'), action: t('err.propAction'), retryable: false };

  if (/read[- ]?only|permission|not allowed|cannot edit/.test(s))
    return { message: t('err.readonly'), action: t('err.readonlyAction'), retryable: false };

  if (/network|fetch|timeout|offline/.test(s))
    return { message: t('err.network'), action: t('err.networkAction'), retryable: true };

  if (/storage|quota|exceeded/.test(s))
    return { message: t('err.storage'), action: t('err.storageAction'), retryable: true };

  // 알 수 없는 오류 — 원문을 함께 보여 추적 가능하게.
  return { message: raw || t('err.unknown'), action: t('err.unknownAction'), retryable: true };
}
