import type { SaasPlan, SaasPlanCodigo } from '@/core/interfaces';
import { PLAN_PYME_COPY } from './plan-pyme-matrix';
import { formatPlanValor } from './saas-plan';

export type LandingPlan = {
  codigo: SaasPlanCodigo;
  nombre: string;
  tagline: string;
  valor: number;
  valorLabel: string;
  sucursales: string;
  usuarios: string;
  roles: string;
  features: string[];
  destacado?: boolean;
};

const MARKETING: Record<
  SaasPlanCodigo,
  Omit<LandingPlan, 'codigo' | 'valor' | 'valorLabel' | 'sucursales' | 'usuarios' | 'roles'>
> = {
  BASICO: {
    nombre: 'Básico',
    tagline: 'Un local ordenado: caja, cocina y stock en un solo lugar',
    features: [
      'Punto de venta, comandas y catálogo',
      'Reportes, mermas y perfil de empresa',
      'Roles: Admin, Vendedor y Comanda',
    ],
  },
  ESTANDAR: {
    nombre: 'Estándar',
    tagline: 'Hasta 3 sucursales con WhatsApp IA conectado a tu inventario',
    destacado: true,
    features: [
      'Todo lo del plan Básico',
      'Admin, Auditor, Vendedor y Comanda por sucursal',
      'Asistente IA WhatsApp (pedidos y comprobantes)',
      'Notificaciones a vendedor y admin',
    ],
  },
  FULL: {
    nombre: 'Full',
    tagline: 'Vende y cobra en todos los canales — con RUT formalizado',
    features: [
      'Todo lo del plan Estándar',
      'Asistente IA telefónica (roadmap)',
      'Pasarela de pago online por empresa (automatizable)',
      'Cobro al cliente final desde WhatsApp / POS',
    ],
  },
};

export function buildLandingPlansFromApi(planes: SaasPlan[]): LandingPlan[] {
  const order: SaasPlanCodigo[] = ['BASICO', 'ESTANDAR', 'FULL'];
  const byCodigo = new Map(planes.map((p) => [p.codigo, p]));

  return order
    .filter((codigo) => byCodigo.has(codigo))
    .map((codigo) => {
      const api = byCodigo.get(codigo)!;
      const m = MARKETING[codigo];
      const copy = PLAN_PYME_COPY[codigo];
      const fallback = FALLBACK_LANDING_PLANS.find((p) => p.codigo === codigo)!;
      const valor = api.valor > 0 ? api.valor : fallback.valor;
      return {
        codigo,
        nombre: api.nombre?.replace(/^POS-AI\s+/i, '') || m.nombre,
        tagline: api.descripcion?.trim() || m.tagline,
        valor,
        valorLabel: formatPlanValor(valor),
        sucursales: copy.sucursalesLine,
        usuarios: copy.usuariosLine,
        roles: copy.rolesLine,
        features: m.features,
        destacado: m.destacado,
      };
    });
}

/** Fallback si el BFF no responde (offline / dev sin Docker). */
export const FALLBACK_LANDING_PLANS: LandingPlan[] = (['BASICO', 'ESTANDAR', 'FULL'] as SaasPlanCodigo[]).map(
  (codigo) => {
    const m = MARKETING[codigo];
    const copy = PLAN_PYME_COPY[codigo];
    const valor = codigo === 'BASICO' ? 24990 : codigo === 'ESTANDAR' ? 44990 : 69990;
    return {
      codigo,
      ...m,
      valor,
      valorLabel: formatPlanValor(valor),
      sucursales: copy.sucursalesLine,
      usuarios: copy.usuariosLine,
      roles: copy.rolesLine,
    };
  }
);

export const LANDING_PLANS = FALLBACK_LANDING_PLANS;

export const LANDING_MODULES = [
  { title: 'Punto de venta', desc: 'Ventas, carrito, comprobante e IVA en caja.' },
  { title: 'Catálogo', desc: 'Productos, categorías y proveedores al día.' },
  { title: 'Comandas', desc: 'Cocina y pedidos en vivo, sin papel suelto.' },
  { title: 'Reportes', desc: 'Ventas, mermas y exportación para decisiones.' },
  { title: 'Multi-sucursal', desc: 'Varios locales con la misma verdad de stock.' },
  { title: 'Seguridad', desc: 'Roles, auditoría y acceso por sucursal.' },
] as const;
