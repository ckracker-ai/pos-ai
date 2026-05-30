/** Utilidades RUT chileno (validación módulo 11). */

export interface ParsedRut {
  rutNumero: number;
  rutDv: string;
  rutEmpresa: string;
}

export function parseRut(raw: string): ParsedRut | null {
  const cleaned = String(raw ?? '')
    .trim()
    .toUpperCase()
    .replace(/\./g, '')
    .replace(/-/g, '');

  if (!cleaned || cleaned.length < 2) return null;

  const dv = cleaned.slice(-1);
  const body = cleaned.slice(0, -1).replace(/^0+/, '') || '0';
  const rutNumero = Number(body);

  if (!Number.isFinite(rutNumero) || rutNumero <= 0) return null;
  if (!/^[0-9K]$/.test(dv)) return null;
  if (!validateRutDv(rutNumero, dv)) return null;

  const formattedBody = rutNumero.toLocaleString('es-CL');
  return {
    rutNumero,
    rutDv: dv,
    rutEmpresa: `${formattedBody}-${dv}`,
  };
}

export function validateRutDv(rutNumero: number, dv: string): boolean {
  let sum = 0;
  let multiplier = 2;
  let n = rutNumero;

  while (n > 0) {
    sum += (n % 10) * multiplier;
    n = Math.floor(n / 10);
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const remainder = 11 - (sum % 11);
  const expected =
    remainder === 11 ? '0' : remainder === 10 ? 'K' : String(remainder);

  return expected === dv.toUpperCase();
}
