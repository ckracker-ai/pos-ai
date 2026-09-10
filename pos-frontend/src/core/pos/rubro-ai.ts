import type { RubroCodigo } from '@/core/config/rubro-packs';
import { getRubroPack, normalizeRubroCodigo } from '@/core/config/rubro-packs';
import { interpretPosCartClient, type PosAiStockItem } from '@/core/pos/posAiRulesClient';

export type GlossaryPair = { from: string; to: string };

export type TenantAiGlossary = {
  businessDescription: string;
  synonyms: GlossaryPair[];
};

export type RubroAiPack = {
  codigo: RubroCodigo;
  promptHint: string;
  synonyms: GlossaryPair[];
  /** Frases de QA del pack (IA-2). */
  utterances: string[];
};

const PACKS: Record<RubroCodigo, RubroAiPack> = {
  GASTRONOMIA: {
    codigo: 'GASTRONOMIA',
    promptHint:
      'Local de comida: café, pub, bar o restaurante. Comandas, variantes (pollo/carne, familiar) y no inventar platos. Ignora «sin tomate».',
    synonyms: [
      { from: 'cortado', to: 'cafe' },
      { from: 'cola', to: 'bebida' },
      { from: 'hamburger', to: 'hamburguesa' },
    ],
    utterances: [
      'agrega una empanada de pino',
      'agrega 2 cafe tradicional',
      'agrega hamburguesa italiana de carne',
      'agrega pizza pepperonni familiar',
      'quita empanada de pino',
      'deja 3 cafe tradicional',
      'buscar pizza',
      'vaciar carrito',
      'ayuda',
      'agrega producto agotado',
    ],
  },
  MINIMARKET: {
    codigo: 'MINIMARKET',
    promptHint: 'Almacén: cobro rápido, SKU/barcode y packs (coca 1.5, pan).',
    synonyms: [
      { from: 'coca', to: 'coca cola' },
      { from: 'bebida 1.5', to: 'coca cola' },
      { from: 'pan hallulla', to: 'pan' },
    ],
    utterances: [
      'agrega tres pan',
      'agrega una coca cola',
      'agrega 2 pan',
      'buscar coca',
      'quita pan',
      'vaciar carrito',
      'ayuda',
      'agrega producto agotado',
      'agrega pan y coca cola',
      'deja 1 pan',
    ],
  },
  FERRETERIA: {
    codigo: 'FERRETERIA',
    promptHint: 'Ferretería o mueblería de piso: medidas (pulgada/mm), cajas y cotización. No cocina.',
    synonyms: [
      { from: 'pulgada', to: 'pulgadas' },
      { from: 'tornillo', to: 'clavo' },
      { from: 'living', to: 'sofa' },
    ],
    utterances: [
      'agrega clavo',
      'buscar clavo 2 pulgadas',
      'agrega 2 clavo',
      'buscar sofa',
      'quita clavo',
      'vaciar carrito',
      'ayuda',
      'agrega producto agotado',
      'agrega clavo y sofa',
      'deja 1 clavo',
    ],
  },
  ROPA: {
    codigo: 'ROPA',
    promptHint: 'Ropa: talla y color. No cobres combinación sin stock.',
    synonyms: [
      { from: 'polera negra m', to: 'polera negra M' },
      { from: 'polera m negra', to: 'polera negra M' },
    ],
    utterances: [
      'agrega polera negra M',
      'agrega polera blanca S',
      'buscar polera',
      'quita polera negra M',
      'vaciar carrito',
      'ayuda',
      'agrega producto agotado',
      'deja 1 polera negra M',
      'agrega 2 polera blanca S',
      'buscar polera negra',
    ],
  },
  MAYORISTA: {
    codigo: 'MAYORISTA',
    promptHint: 'Mayorista: cantidad, cajas y cliente/crédito. El precio de tramo lo aplica la caja, no inventes descuento.',
    synonyms: [
      { from: 'caja de 12', to: 'coca cola' },
      { from: 'pack', to: 'caja' },
    ],
    utterances: [
      'agrega coca cola',
      'agrega 12 coca cola',
      'buscar coca',
      'quita coca cola',
      'vaciar carrito',
      'ayuda',
      'agrega producto agotado',
      'deja 6 coca cola',
      'agrega 2 coca cola',
      'agrega coca cola y pan',
    ],
  },
};

export function emptyTenantGlossary(): TenantAiGlossary {
  return { businessDescription: '', synonyms: [] };
}

export function parseTenantAiGlossary(raw: unknown): TenantAiGlossary {
  const empty = emptyTenantGlossary();
  if (raw == null || raw === '') return empty;
  let obj: Record<string, unknown> = {};
  if (typeof raw === 'string') {
    try {
      obj = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return { ...empty, businessDescription: raw.slice(0, 500) };
    }
  } else if (typeof raw === 'object') {
    obj = raw as Record<string, unknown>;
  } else {
    return empty;
  }
  const synonyms = Array.isArray(obj.synonyms)
    ? (obj.synonyms as Array<Record<string, unknown>>)
        .map((row) => ({
          from: String(row.from ?? '').trim(),
          to: String(row.to ?? '').trim(),
        }))
        .filter((row) => row.from && row.to)
        .slice(0, 20)
    : [];
  return {
    businessDescription: String(obj.businessDescription ?? obj.descripcion ?? '').trim().slice(0, 500),
    synonyms,
  };
}

export function serializeTenantAiGlossary(g: TenantAiGlossary): string {
  return JSON.stringify({
    businessDescription: g.businessDescription.trim().slice(0, 500),
    synonyms: g.synonyms.filter((s) => s.from.trim() && s.to.trim()).slice(0, 20),
  });
}

export function getRubroAiPack(rubro?: string | null): RubroAiPack {
  const codigo = normalizeRubroCodigo(rubro) ?? 'GASTRONOMIA';
  return PACKS[codigo] ?? PACKS.GASTRONOMIA;
}

export function mergeGlossary(rubro?: string | null, tenant?: TenantAiGlossary | null): GlossaryPair[] {
  const pack = getRubroAiPack(rubro);
  const extra = tenant?.synonyms ?? [];
  return [...pack.synonyms, ...extra];
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Aplica sinónimos (pack + tenant). El tenant gana si hay el mismo `from`. */
export function applySynonyms(text: string, pairs: GlossaryPair[]): string {
  if (!text.trim() || pairs.length === 0) return text;
  const byFrom = new Map<string, string>();
  for (const p of pairs) {
    const from = p.from.trim();
    const to = p.to.trim();
    if (!from || !to) continue;
    byFrom.set(from.toLowerCase(), to);
  }
  const sorted = [...byFrom.entries()].sort((a, b) => b[0].length - a[0].length);
  let out = text;
  for (const [from, to] of sorted) {
    const re = new RegExp(`(?:^|\\s)${escapeRegExp(from)}(?=\\s|$)`, 'gi');
    out = out.replace(re, (m) => (m.startsWith(' ') ? ` ${to}` : to));
  }
  return out;
}

export function suggestRubroFromBusinessText(text: string): RubroCodigo | null {
  return normalizeRubroCodigo(text);
}

export type PackSimRow = {
  phrase: string;
  soldZeroStock: boolean;
  intent: string;
};

export function fixtureStocksForPack(codigo: RubroCodigo): PosAiStockItem[] {
  const agotado: PosAiStockItem = {
    id: 'agotado',
    nombre: 'producto agotado',
    sku: 'OUT',
    precio: 1000,
    stock_actual: 0,
  };
  const common = [agotado];
  if (codigo === 'GASTRONOMIA') {
    return [
      ...common,
      { id: 'pino', nombre: 'empanada de pino', sku: 'EP', precio: 2000, stock_actual: 10, categoria: 'Empanadas' },
      { id: 'cafe', nombre: 'cafe tradicional', sku: 'CT', precio: 1500, stock_actual: 10, categoria: 'Bebidas' },
      {
        id: 'hamb',
        nombre: 'hamburguesa italiana de carne',
        sku: 'HI',
        precio: 5000,
        stock_actual: 5,
        categoria: 'Hamburguesas Carne',
      },
      {
        id: 'pizza',
        nombre: 'pizza pepperonni familiar',
        sku: 'PF',
        precio: 12000,
        stock_actual: 4,
        categoria: 'Pizzas Familiar',
      },
    ];
  }
  if (codigo === 'MINIMARKET' || codigo === 'MAYORISTA') {
    return [
      ...common,
      { id: 'pan', nombre: 'pan', sku: 'PAN', precio: 500, stock_actual: 20 },
      { id: 'coca', nombre: 'coca cola', sku: 'COCA', precio: 1500, stock_actual: 30 },
    ];
  }
  if (codigo === 'FERRETERIA') {
    return [
      ...common,
      { id: 'clavo', nombre: 'clavo', sku: 'CL-50', precio: 100, stock_actual: 50 },
      { id: 'sofa', nombre: 'sofa', sku: 'SF-3', precio: 250000, stock_actual: 3 },
    ];
  }
  return [
    ...common,
    { id: 'pm', nombre: 'polera negra M', sku: 'PN-M', precio: 8000, stock_actual: 4 },
    { id: 'ps', nombre: 'polera blanca S', sku: 'PB-S', precio: 8000, stock_actual: 4 },
  ];
}

/** IA-2: 10 frases del pack; falla si alguna ADD usa stock 0. */
export function runRubroPackSimulator(
  codigo: RubroCodigo,
  tenant?: TenantAiGlossary | null
): PackSimRow[] {
  const pack = getRubroAiPack(codigo);
  const stocks = fixtureStocksForPack(codigo);
  const pairs = mergeGlossary(codigo, tenant);
  const zeroIds = new Set(stocks.filter((s) => s.stock_actual <= 0).map((s) => s.id));
  return pack.utterances.slice(0, 10).map((phrase) => {
    const expanded = applySynonyms(phrase, pairs);
    const result = interpretPosCartClient({ userText: expanded, stocks, cart: [] });
    const soldZeroStock = result.actions.some(
      (a) => a.action === 'ADD' && zeroIds.has(a.product_id)
    );
    return { phrase, soldZeroStock, intent: result.intent };
  });
}

export function packSimulatorSoldZero(codigo: RubroCodigo, tenant?: TenantAiGlossary | null): boolean {
  return runRubroPackSimulator(codigo, tenant).some((row) => row.soldZeroStock);
}

export function rubroPackLabel(rubro?: string | null): string {
  return getRubroPack(rubro).label;
}
