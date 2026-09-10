export type RubroCodigo =
  | 'GASTRONOMIA'
  | 'MINIMARKET'
  | 'FERRETERIA'
  | 'ROPA'
  | 'MAYORISTA';

export type RubroCapabilities = {
  kitchen: boolean;
  delivery: boolean;
  barcode: boolean;
  bulkWeight: boolean;
  unitEquivalence: boolean;
  variants: boolean;
  wholesale: boolean;
  credit: boolean;
};

export type RubroPack = {
  codigo: RubroCodigo;
  label: string;
  hint: string;
  capabilities: RubroCapabilities;
};

const ALL_ON: RubroCapabilities = {
  kitchen: true,
  delivery: true,
  barcode: true,
  bulkWeight: true,
  unitEquivalence: true,
  variants: true,
  wholesale: true,
  credit: true,
};

export const RUBRO_PACKS: readonly RubroPack[] = [
  {
    codigo: 'GASTRONOMIA',
    label: 'Gastronomía / local de comida',
    hint: 'Caja, cocina, envíos y menú QR.',
    capabilities: {
      kitchen: true,
      delivery: true,
      barcode: false,
      bulkWeight: false,
      unitEquivalence: false,
      variants: true,
      wholesale: false,
      credit: false,
    },
  },
  {
    codigo: 'MINIMARKET',
    label: 'Minimarket / almacén',
    hint: 'Cobro rápido, código de barras y venta a granel.',
    capabilities: {
      kitchen: false,
      delivery: true,
      barcode: true,
      bulkWeight: true,
      unitEquivalence: false,
      variants: false,
      wholesale: false,
      credit: false,
    },
  },
  {
    codigo: 'FERRETERIA',
    label: 'Ferretería',
    hint: 'Equivalencias de unidades y cotizaciones.',
    capabilities: {
      kitchen: false,
      delivery: false,
      barcode: true,
      bulkWeight: true,
      unitEquivalence: true,
      variants: false,
      wholesale: false,
      credit: false,
    },
  },
  {
    codigo: 'ROPA',
    label: 'Ropa y accesorios',
    hint: 'Variantes talla/color y stock por celda.',
    capabilities: {
      kitchen: false,
      delivery: true,
      barcode: true,
      bulkWeight: false,
      unitEquivalence: false,
      variants: true,
      wholesale: false,
      credit: false,
    },
  },
  {
    codigo: 'MAYORISTA',
    label: 'Distribuidora / mayorista',
    hint: 'Precios por volumen, clientes y crédito.',
    capabilities: {
      kitchen: false,
      delivery: true,
      barcode: true,
      bulkWeight: false,
      unitEquivalence: true,
      variants: false,
      wholesale: true,
      credit: true,
    },
  },
];

const ALIASES: Record<string, RubroCodigo> = {
  gastronomia: 'GASTRONOMIA',
  gastronomía: 'GASTRONOMIA',
  comida: 'GASTRONOMIA',
  restaurant: 'GASTRONOMIA',
  restaurante: 'GASTRONOMIA',
  empanada: 'GASTRONOMIA',
  cafe: 'GASTRONOMIA',
  café: 'GASTRONOMIA',
  pub: 'GASTRONOMIA',
  bar: 'GASTRONOMIA',
  bistro: 'GASTRONOMIA',
  pasteleria: 'GASTRONOMIA',
  pastelería: 'GASTRONOMIA',
  minimarket: 'MINIMARKET',
  almacén: 'MINIMARKET',
  almacen: 'MINIMARKET',
  botillería: 'MINIMARKET',
  ferreteria: 'FERRETERIA',
  ferretería: 'FERRETERIA',
  muebleria: 'FERRETERIA',
  mueblería: 'FERRETERIA',
  muebles: 'FERRETERIA',
  ropa: 'ROPA',
  boutique: 'ROPA',
  vestuario: 'ROPA',
  mayorista: 'MAYORISTA',
  distribuidora: 'MAYORISTA',
  mayor: 'MAYORISTA',
};

export function normalizeRubroCodigo(raw?: string | null): RubroCodigo | null {
  const t = String(raw ?? '').trim();
  if (!t) return null;
  const upper = t.toUpperCase();
  if (RUBRO_PACKS.some((p) => p.codigo === upper)) return upper as RubroCodigo;
  const aliased = ALIASES[t.toLowerCase()];
  if (aliased) return aliased;
  for (const [alias, codigo] of Object.entries(ALIASES)) {
    if (t.toLowerCase().includes(alias)) return codigo;
  }
  return null;
}

export function getRubroPack(raw?: string | null): RubroPack {
  const codigo = normalizeRubroCodigo(raw) ?? 'GASTRONOMIA';
  return RUBRO_PACKS.find((p) => p.codigo === codigo) ?? RUBRO_PACKS[0];
}

/** Sin rubro o texto libre no reconocido: gastronomía (Costa Azul y locales actuales). */
export function resolveRubroCapabilities(raw?: string | null): RubroCapabilities {
  if (!String(raw ?? '').trim()) return getRubroPack('GASTRONOMIA').capabilities;
  const codigo = normalizeRubroCodigo(raw);
  if (!codigo) return ALL_ON;
  return getRubroPack(codigo).capabilities;
}

export function isRubroPackSelected(raw?: string | null): boolean {
  return normalizeRubroCodigo(raw) != null;
}

const MODULE_RUBRO_CAP: Partial<Record<string, keyof RubroCapabilities>> = {
  comandas: 'kitchen',
  delivery: 'delivery',
  clientes: 'wholesale',
};

export function isRubroModuleEnabled(moduleKey: string, rubroNegocio?: string | null): boolean {
  const cap = MODULE_RUBRO_CAP[moduleKey];
  if (!cap) return true;
  return resolveRubroCapabilities(rubroNegocio)[cap] === true;
}

export function isWeightUnit(unit?: string | null): boolean {
  const u = String(unit ?? '').trim().toLowerCase();
  return ['kg', 'kilo', 'kilos', 'g', 'gr', 'gramo', 'gramos', 'lt', 'l', 'litro', 'litros'].includes(
    u
  );
}
