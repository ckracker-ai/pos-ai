import type { SaasPlan, SaasPlanCodigo } from '@/core/interfaces';
import { formatPlanValor } from './saas-plan';

export type LandingPlan = {
  codigo: SaasPlanCodigo;
  nombre: string;
  tagline: string;
  valor: number;
  valorLabel: string;
  sucursales: string;
  usuarios: string;
  features: string[];
  destacado?: boolean;
};

const MARKETING: Record<
  SaasPlanCodigo,
  Omit<LandingPlan, 'codigo' | 'valor' | 'valorLabel' | 'sucursales' | 'usuarios'>
> = {
  BASICO: {
    nombre: 'Básico',
    tagline: 'Opera tu negocio en tienda con un solo sistema',
    features: [
      'Punto de venta y comandas',
      'Catálogo, proveedores y categorías',
      'Reportes, mermas y multi-sucursal base',
      'Usuarios, roles y perfil de empresa',
    ],
  },
  ESTANDAR: {
    nombre: 'Estándar',
    tagline: 'WhatsApp conectado a tu caja e inventario',
    destacado: true,
    features: [
      'Todo lo del plan Básico',
      'Asistente IA por WhatsApp',
      'Pedidos, transferencia y comprobantes',
      'Notificaciones a vendedor y admin',
    ],
  },
  FULL: {
    nombre: 'Full',
    tagline: 'Vende y cobra desde cualquier canal',
    features: [
      'Todo lo del plan Estándar',
      'Asistente voz / teléfono (roadmap)',
      'Medios de pago online integrados',
      'Operación omnicanal unificada',
    ],
  },
};

function sucursalesLabel(max: number): string {
  return max <= 1 ? '1 sucursal' : `Hasta ${max} sucursales`;
}

function usuariosLabel(max: number): string {
  return `Hasta ${max} usuarios`;
}

export function buildLandingPlansFromApi(planes: SaasPlan[]): LandingPlan[] {
  const order: SaasPlanCodigo[] = ['BASICO', 'ESTANDAR', 'FULL'];
  const byCodigo = new Map(planes.map((p) => [p.codigo, p]));

  return order
    .filter((codigo) => byCodigo.has(codigo))
    .map((codigo) => {
      const api = byCodigo.get(codigo)!;
      const m = MARKETING[codigo];
      const valor = api.valor > 0 ? api.valor : FALLBACK_LANDING_PLANS.find((p) => p.codigo === codigo)!.valor;
      return {
        codigo,
        nombre: api.nombre?.replace(/^POS-AI\s+/i, '') || m.nombre,
        tagline: api.descripcion?.trim() || m.tagline,
        valor,
        valorLabel: formatPlanValor(valor),
        sucursales: sucursalesLabel(api.maxSucursales),
        usuarios: usuariosLabel(api.maxUsuarios),
        features: m.features,
        destacado: m.destacado,
      };
    });
}

/** Fallback si el BFF no responde (offline / dev sin Docker). */
export const FALLBACK_LANDING_PLANS: LandingPlan[] = (['BASICO', 'ESTANDAR', 'FULL'] as SaasPlanCodigo[]).map(
  (codigo) => {
    const m = MARKETING[codigo];
    const valor = codigo === 'BASICO' ? 24990 : codigo === 'ESTANDAR' ? 44990 : 69990;
    const maxSuc = codigo === 'BASICO' ? 1 : codigo === 'ESTANDAR' ? 3 : 5;
    const maxUsr = codigo === 'BASICO' ? 5 : codigo === 'ESTANDAR' ? 10 : 15;
    return {
      codigo,
      ...m,
      valor,
      valorLabel: formatPlanValor(valor),
      sucursales: sucursalesLabel(maxSuc),
      usuarios: usuariosLabel(maxUsr),
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
