/** Validación RUT chileno (módulo 11) — mismo criterio que pos-api-core. */

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

export function parseRut(raw: string): { rutEmpresa: string; valid: boolean } | null {
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

  const valid = validateRutDv(rutNumero, dv);
  const formattedBody = rutNumero.toLocaleString('es-CL');
  return { rutEmpresa: `${formattedBody}-${dv}`, valid };
}

export function formatRutInput(value: string): string {
  const cleaned = value.replace(/[^\dKk]/g, '').toUpperCase();
  if (cleaned.length <= 1) return cleaned;
  const dv = cleaned.slice(-1);
  const body = cleaned.slice(0, -1);
  if (body.length <= 3) return `${body}-${dv}`;
  const reversed = body.split('').reverse();
  const parts: string[] = [];
  for (let i = 0; i < reversed.length; i += 3) {
    parts.push(reversed.slice(i, i + 3).reverse().join(''));
  }
  return `${parts.reverse().join('.')}-${dv}`;
}
