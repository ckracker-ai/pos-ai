import type { SuscripcionEstado } from '../models/EmpresaSuscripcion.model';

export type ExpiryTransition = 'none' | 'grace' | 'vencida';

export type ExpiryTransitionResult = {
  transition: ExpiryTransition;
  nextEstado?: SuscripcionEstado;
  nextGraceHasta?: Date | null;
};

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

/** Reglas puras: vence_en pasado → GRACIA → VENCIDA. */
export function computeExpiryTransition(input: {
  now: Date;
  venceEn: Date | null;
  estado: SuscripcionEstado;
  graceHasta: Date | null;
  graceDays: number;
}): ExpiryTransitionResult {
  const { now, venceEn, estado, graceHasta, graceDays } = input;

  if (!venceEn || now <= venceEn) return { transition: 'none' };
  if (estado === 'CANCELADA' || estado === 'VENCIDA') return { transition: 'none' };

  if (estado === 'ACTIVA' || estado === 'PILOTO') {
    if (!graceHasta) {
      return {
        transition: 'grace',
        nextEstado: 'GRACIA',
        nextGraceHasta: addDays(now, graceDays),
      };
    }
    if (now <= graceHasta) {
      return { transition: 'none', nextEstado: 'GRACIA' };
    }
    return { transition: 'vencida', nextEstado: 'VENCIDA', nextGraceHasta: null };
  }

  if (estado === 'GRACIA') {
    if (graceHasta && now <= graceHasta) return { transition: 'none' };
    return { transition: 'vencida', nextEstado: 'VENCIDA', nextGraceHasta: null };
  }

  return { transition: 'none' };
}
