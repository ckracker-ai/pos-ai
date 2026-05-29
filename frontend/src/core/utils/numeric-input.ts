/** Solo dígitos (stock, cantidades enteras). Elimina $, -, espacios, etc. */
export function sanitizeDigitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

export const INVALID_NUMERIC_INPUT_MESSAGE =
  'No se pueden ingresar valores negativos ni símbolos como $.';

export function hasInvalidNumericChars(value: string): boolean {
  return /-/.test(value) || /\$/.test(value) || /[a-zA-Z]/.test(value);
}

/** Sanitiza a dígitos e indica si el usuario intentó caracteres no permitidos. */
export function applyDigitsOnlyInput(raw: string): { value: string; hadInvalid: boolean } {
  return {
    value: sanitizeDigitsOnly(raw),
    hadInvalid: hasInvalidNumericChars(raw),
  };
}

/** Sanitiza decimal e indica si el usuario intentó caracteres no permitidos. */
export function applyDecimalInput(raw: string): { value: string; hadInvalid: boolean } {
  return {
    value: sanitizeDecimalInput(raw),
    hadInvalid: hasInvalidNumericChars(raw),
  };
}

/** Decimal positivo: dígitos y un separador (. o ,). Elimina $, -, etc. */
export function sanitizeDecimalInput(value: string): string {
  const raw = value.replace(/[^\d.,]/g, '').replace(/,/g, '.');
  const dot = raw.indexOf('.');
  if (dot === -1) return raw;
  return raw.slice(0, dot + 1) + raw.slice(dot + 1).replace(/\./g, '');
}

export function parseNonNegativeInt(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) return null;
  return n;
}

export function parsePositiveInt(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 1 || !Number.isInteger(n)) return null;
  return n;
}

export function parsePositiveDecimal(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed.replace(/,/g, '.'));
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

/** Entero >= min (default 1). Para inputs controlados mientras se escribe. */
export function coercePositiveIntInput(value: string, min = 1): number {
  const digits = sanitizeDigitsOnly(value);
  if (!digits) return min;
  const n = parseInt(digits, 10);
  if (!Number.isFinite(n) || n < min) return min;
  return n;
}
