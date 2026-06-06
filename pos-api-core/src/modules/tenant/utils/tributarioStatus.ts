import type { SaasPlanCodigo } from '../../saas/constants/planCodes';

export type EmpresaEstadoTributario = 'INFORMAL' | 'EN_TRAMITE' | 'FORMAL';

export type FormalizacionProgreso = {
  diagnostico?: 'ocasional' | 'sustento' | null;
  pasos?: {
    sii?: boolean;
    municipalidad?: boolean;
    cuentaBancaria?: boolean;
    capturaRut?: boolean;
  };
};

export function parseFormalizacionProgreso(raw: unknown): FormalizacionProgreso {
  if (!raw || typeof raw !== 'object') return {};
  const o = raw as Record<string, unknown>;
  const pasosRaw = o.pasos;
  const pasos =
    pasosRaw && typeof pasosRaw === 'object'
      ? {
          sii: Boolean((pasosRaw as Record<string, unknown>).sii),
          municipalidad: Boolean((pasosRaw as Record<string, unknown>).municipalidad),
          cuentaBancaria: Boolean((pasosRaw as Record<string, unknown>).cuentaBancaria),
          capturaRut: Boolean((pasosRaw as Record<string, unknown>).capturaRut),
        }
      : undefined;
  const diag = o.diagnostico;
  const diagnostico =
    diag === 'ocasional' || diag === 'sustento' ? diag : null;
  return { diagnostico, pasos };
}

export function isEmpresaFormal(estado: EmpresaEstadoTributario | string | null | undefined): boolean {
  return String(estado ?? 'FORMAL').toUpperCase() === 'FORMAL';
}

export function planRequiresFormal(codigo: SaasPlanCodigo | string): boolean {
  const c = String(codigo).toUpperCase();
  return c === 'ESTANDAR' || c === 'FULL';
}

export function formalizacionProgressPercent(progreso: FormalizacionProgreso): number {
  const pasos = progreso.pasos ?? {};
  const keys = ['sii', 'municipalidad', 'cuentaBancaria', 'capturaRut'] as const;
  const done = keys.filter((k) => pasos[k]).length;
  const diag = progreso.diagnostico ? 1 : 0;
  return Math.round(((done + diag) / (keys.length + 1)) * 100);
}
