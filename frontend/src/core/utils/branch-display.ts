const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Evita mostrar IDs técnicos de sucursal en la UI. */
export function sanitizeBranchDisplayLabel(
  label: string | undefined,
  fallback = 'Cargando…'
): string {
  const trimmed = label?.trim();
  if (!trimmed || UUID_RE.test(trimmed)) return fallback;
  return trimmed;
}
