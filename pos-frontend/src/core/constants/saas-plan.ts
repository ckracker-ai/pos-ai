import type { SaasMetodoPago, SaasPlan, SaasPlanCodigo } from '@/core/interfaces';

export const PLAN_DISPLAY_NAMES: Record<SaasPlanCodigo, string> = {
  BASICO: 'POS-AI Básico',
  ESTANDAR: 'POS-AI Estándar',
  FULL: 'POS-AI Full',
};

/** Nombre legible del plan (corrige encoding roto desde BD, ej. B??sico). */
export function getPlanDisplayName(plan: Pick<SaasPlan, 'codigo' | 'nombre'>): string {
  const nombre = plan.nombre?.trim() ?? '';
  if (!nombre || nombre.includes('?') || nombre.includes('\uFFFD')) {
    return PLAN_DISPLAY_NAMES[plan.codigo] ?? (nombre || plan.codigo);
  }
  return nombre;
}

export const METODO_PAGO_LABELS: Record<SaasMetodoPago, string> = {
  TRANSFERENCIA: 'Transferencia',
  WEBPAY: 'Webpay',
  MERCADO_PAGO: 'Mercado Pago',
  FLOW: 'Flow',
  MIXTO: 'Varios medios',
};

export function formatPlanValor(valor: number): string {
  return `$${valor.toLocaleString('es-CL')}/mes + IVA`;
}
