import type { SaasPlanCodigo } from '../constants/planCodes';

export const PLAN_DISPLAY_NAMES: Record<SaasPlanCodigo, string> = {
  BASICO: 'POS-AI Básico',
  ESTANDAR: 'POS-AI Estándar',
  FULL: 'POS-AI Full',
};

export const PLAN_DESCRIPTIONS: Record<SaasPlanCodigo, string> = {
  BASICO: 'ERP operativo para PYME: POS, catálogo, comandas, reportes y mantenedores.',
  ESTANDAR: 'Básico + asistente IA WhatsApp conectado al inventario y ventas.',
  FULL: 'Estándar + asistente voz/teléfono + cobro con medios de pago online.',
};

/** Detecta texto corrupto por charset (ej. B??sico, Est??ndar). */
export function isBrokenUtf8Text(text: string | null | undefined): boolean {
  const t = String(text ?? '').trim();
  if (!t) return true;
  if (t.includes('\uFFFD')) return true;
  if (t.includes('?')) return true;
  return false;
}

export function getPlanDisplayName(
  codigo: SaasPlanCodigo,
  nombre: string | null | undefined
): string {
  const n = String(nombre ?? '').trim();
  if (isBrokenUtf8Text(n)) return PLAN_DISPLAY_NAMES[codigo] ?? codigo;
  return n || (PLAN_DISPLAY_NAMES[codigo] ?? codigo);
}

export function getPlanDescription(
  codigo: SaasPlanCodigo,
  descripcion: string | null | undefined
): string | null {
  const d = String(descripcion ?? '').trim();
  if (isBrokenUtf8Text(d)) return PLAN_DESCRIPTIONS[codigo] ?? null;
  return d || (PLAN_DESCRIPTIONS[codigo] ?? null);
}
