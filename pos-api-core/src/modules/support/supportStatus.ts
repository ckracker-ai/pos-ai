export const SUPPORT_STATUSES = ['ABIERTO', 'ESPERANDO_CLIENTE', 'ESPERANDO_SOPORTE', 'RESUELTO'] as const;
export type SupportCaseStatus = (typeof SUPPORT_STATUSES)[number];

export const SUPPORT_ORIGINS = ['TENANT', 'PLATFORM', 'SIGNAL', 'COPILOT'] as const;
export type SupportCaseOrigin = (typeof SUPPORT_ORIGINS)[number];

export const SUPPORT_SEVERITIES = ['BAJA', 'MEDIA', 'ALTA'] as const;
export type SupportSeverity = (typeof SUPPORT_SEVERITIES)[number];

export const SUPPORT_AUTHORS = ['USER', 'PLATFORM', 'SYSTEM', 'COPILOT'] as const;
export type SupportAuthorKind = (typeof SUPPORT_AUTHORS)[number];

export function statusAfterMessage(
  current: SupportCaseStatus,
  authorKind: SupportAuthorKind
): SupportCaseStatus {
  if (current === 'RESUELTO') return 'ABIERTO';
  if (authorKind === 'PLATFORM' || authorKind === 'COPILOT') return 'ESPERANDO_CLIENTE';
  if (authorKind === 'USER') return 'ESPERANDO_SOPORTE';
  return current;
}
