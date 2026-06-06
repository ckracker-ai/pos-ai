import { validateRutDv } from './rutChile';
import Empresa from '../modules/tenant/models/Empresa.model';
import type { ParsedRut } from './rutChile';

/** Rango reservado para placeholders de negocios sin RUT (no colisiona con RUT reales típicos). */
export const INFORMAL_RUT_BASE = 990_000_000;

export function computeRutDv(rutNumero: number): string {
  let sum = 0;
  let multiplier = 2;
  let n = rutNumero;

  while (n > 0) {
    sum += (n % 10) * multiplier;
    n = Math.floor(n / 10);
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const remainder = 11 - (sum % 11);
  if (remainder === 11) return '0';
  if (remainder === 10) return 'K';
  return String(remainder);
}

export function isInformalRutNumero(rutNumero: number): boolean {
  return rutNumero >= INFORMAL_RUT_BASE;
}

export function formatRutEmpresa(rutNumero: number, rutDv: string): string {
  return `${rutNumero.toLocaleString('es-CL')}-${rutDv}`;
}

/** Asigna un RUT interno único para empresas INFORMAL (satisfaces uq_empresas_rut). */
export async function allocateInformalRutPlaceholder(): Promise<ParsedRut> {
  const count = await Empresa.count({
    where: {},
  });

  for (let attempt = 0; attempt < 50; attempt++) {
    const rutNumero = INFORMAL_RUT_BASE + count + attempt + 1;
    const rutDv = computeRutDv(rutNumero);
    if (!validateRutDv(rutNumero, rutDv)) continue;

    const existing = await Empresa.findOne({ where: { rutNumero, rutDv } });
    if (existing) continue;

    return {
      rutNumero,
      rutDv,
      rutEmpresa: formatRutEmpresa(rutNumero, rutDv),
    };
  }

  throw new Error('INFORMAL_RUT_ALLOCATION_FAILED');
}
