/** Normaliza texto para búsqueda STT (sin tildes, minúsculas). */
export function normalizeSearchText(input: string): string {
  return input
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

export function isValidCodigoPostal(value: string): boolean {
  return /^\d{7}$/.test(String(value ?? '').trim());
}
