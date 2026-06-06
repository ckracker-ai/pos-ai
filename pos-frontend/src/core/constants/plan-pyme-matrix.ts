import type { SaasPlanCodigo } from '@/core/interfaces';

/** Límites acordados PYME (2026-06) — alinear con saas_planes en BD. */
export const PLAN_PYME_LIMITS: Record<
  SaasPlanCodigo,
  { maxSucursales: number; maxUsuarios: number; maxEmpresas: number }
> = {
  BASICO: { maxEmpresas: 1, maxSucursales: 1, maxUsuarios: 3 },
  ESTANDAR: { maxEmpresas: 1, maxSucursales: 3, maxUsuarios: 6 },
  FULL: { maxEmpresas: 1, maxSucursales: 3, maxUsuarios: 6 },
};

export const PLAN_PYME_COPY: Record<
  SaasPlanCodigo,
  { sucursalesLine: string; usuariosLine: string; rolesLine: string }
> = {
  BASICO: {
    sucursalesLine: '1 empresa · 1 sucursal',
    usuariosLine: '3 usuarios incluidos',
    rolesLine: 'Admin, Vendedor y Comanda',
  },
  ESTANDAR: {
    sucursalesLine: '1 empresa · hasta 3 sucursales',
    usuariosLine: '6 usuarios incluidos',
    rolesLine: 'Admin, Auditor, Vendedor y Comanda (1 por sucursal)',
  },
  FULL: {
    sucursalesLine: '1 empresa · hasta 3 sucursales',
    usuariosLine: '6 usuarios incluidos',
    rolesLine: 'Admin, Auditor, Vendedor y Comanda (1 por sucursal)',
  },
};
