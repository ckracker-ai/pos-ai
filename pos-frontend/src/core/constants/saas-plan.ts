import type { SaasMetodoPago, SaasPlan, SaasPlanCodigo } from '@/core/interfaces';

export const PLAN_DISPLAY_NAMES: Record<SaasPlanCodigo, string> = {
  BASICO: 'POS-AI Básico',
  ESTANDAR: 'POS-AI Estándar',
  FULL: 'POS-AI Full',
};

export const PLAN_DESCRIPTIONS: Record<SaasPlanCodigo, string> = {
  BASICO: '1 sucursal, 3 usuarios (Admin, Vendedor, Comanda). ERP operativo sin IA.',
  ESTANDAR: 'Hasta 3 sucursales, 6 usuarios + asistente IA WhatsApp.',
  FULL: 'Estándar + IA telefónica + pasarela online (con RUT formalizado).',
};

function isBrokenUtf8Text(text: string | null | undefined): boolean {
  const t = String(text ?? '').trim();
  if (!t) return true;
  if (t.includes('\uFFFD') || t.includes('?')) return true;
  return false;
}

/** Nombre legible del plan (corrige encoding roto desde BD, ej. B??sico). */
export function getPlanDisplayName(plan: Pick<SaasPlan, 'codigo' | 'nombre'>): string {
  const nombre = plan.nombre?.trim() ?? '';
  if (isBrokenUtf8Text(nombre)) {
    return PLAN_DISPLAY_NAMES[plan.codigo] ?? (nombre || plan.codigo);
  }
  return nombre || (PLAN_DISPLAY_NAMES[plan.codigo] ?? plan.codigo);
}

export function getPlanDescription(
  codigo: SaasPlanCodigo,
  descripcion: string | null | undefined
): string | null {
  const d = String(descripcion ?? '').trim();
  if (isBrokenUtf8Text(d)) return PLAN_DESCRIPTIONS[codigo] ?? null;
  return d || (PLAN_DESCRIPTIONS[codigo] ?? null);
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
