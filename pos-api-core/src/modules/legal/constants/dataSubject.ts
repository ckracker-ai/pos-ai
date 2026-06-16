/** Frase exacta que el admin debe escribir para confirmar eliminación del tenant. */
export const TENANT_DELETION_CONFIRMATION_PHRASE = 'confirmar eliminacion empresa';

/** Horas de rollback antes de ejecutar la eliminación programada. */
export const TENANT_DELETION_ROLLBACK_HOURS = Math.max(
  1,
  Number.parseInt(process.env.TENANT_DELETION_ROLLBACK_HOURS ?? '24', 10) || 24
);

export function normalizeDeletionConfirmationPhrase(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, ' ');
}

export function isDeletionConfirmationPhraseValid(value: string | null | undefined): boolean {
  if (!value?.trim()) return false;
  return (
    normalizeDeletionConfirmationPhrase(value) ===
    normalizeDeletionConfirmationPhrase(TENANT_DELETION_CONFIRMATION_PHRASE)
  );
}
