/** Diccionario de rubro para voz/WSP (misma idea que POS S12). */

export type GlossaryPair = { from: string; to: string };

export type TenantGlossary = {
  businessDescription?: string;
  synonyms?: GlossaryPair[];
};

const PACK_SYNONYMS: Record<string, GlossaryPair[]> = {
  GASTRONOMIA: [
    { from: 'cortado', to: 'cafe' },
    { from: 'cola', to: 'bebida' },
    { from: 'hamburger', to: 'hamburguesa' },
  ],
  MINIMARKET: [
    { from: 'coca', to: 'coca cola' },
    { from: 'pan hallulla', to: 'pan' },
  ],
  FERRETERIA: [
    { from: 'pulgada', to: 'pulgadas' },
    { from: 'living', to: 'sofa' },
  ],
  ROPA: [{ from: 'polera m negra', to: 'polera negra M' }],
  MAYORISTA: [{ from: 'caja de 12', to: 'coca cola' }],
};

const PACK_HINT: Record<string, string> = {
  GASTRONOMIA: 'Local de comida: café, pub, bar o restaurante. No inventes platos.',
  MINIMARKET: 'Almacén: cobro rápido y packs.',
  FERRETERIA: 'Ferretería o mueblería: medidas y cotización. No cocina.',
  ROPA: 'Ropa: talla y color. No vendas combinación sin stock.',
  MAYORISTA: 'Mayorista: cantidades y cajas. No inventes descuento.',
};

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function normalizeRubroKey(raw?: string | null): string {
  const t = String(raw ?? '').trim().toUpperCase();
  if (PACK_SYNONYMS[t]) return t;
  const lower = String(raw ?? '').toLowerCase();
  if (/(cafe|café|pub|bar|restaurant|empanada|comida)/.test(lower)) return 'GASTRONOMIA';
  if (/(muebl|ferret)/.test(lower)) return 'FERRETERIA';
  if (/(ropa|boutique)/.test(lower)) return 'ROPA';
  if (/(mayor|distrib)/.test(lower)) return 'MAYORISTA';
  if (/(minimarket|almacen|almacén)/.test(lower)) return 'MINIMARKET';
  return 'GASTRONOMIA';
}

export function mergeRubroSynonyms(rubro?: string | null, tenant?: TenantGlossary | null): GlossaryPair[] {
  const pack = PACK_SYNONYMS[normalizeRubroKey(rubro)] ?? PACK_SYNONYMS.GASTRONOMIA;
  const extra = Array.isArray(tenant?.synonyms) ? tenant!.synonyms! : [];
  return [...pack, ...extra.filter((s) => s.from?.trim() && s.to?.trim())];
}

export function applySynonyms(text: string, pairs: GlossaryPair[]): string {
  if (!text.trim() || pairs.length === 0) return text;
  const byFrom = new Map<string, string>();
  for (const p of pairs) {
    const from = String(p.from ?? '').trim();
    const to = String(p.to ?? '').trim();
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

export function rubroPromptHint(rubro?: string | null, tenant?: TenantGlossary | null): string {
  const key = normalizeRubroKey(rubro);
  const desc = String(tenant?.businessDescription ?? '').trim();
  const pack = PACK_HINT[key] ?? PACK_HINT.GASTRONOMIA;
  return desc ? `${pack} El negocio se describe: ${desc.slice(0, 200)}.` : pack;
}

const SEARCH_TERM: Record<string, string> = {
  FERRETERIA: 'tornillo',
  MINIMARKET: 'bebida',
  ROPA: 'polera',
  MAYORISTA: 'caja',
  GASTRONOMIA: 'cafe',
};

/** Ejemplo de búsqueda del catálogo (nunca un SKU de otro rubro). */
export function catalogSearchTerm(rubro?: string | null): string {
  if (!String(rubro ?? '').trim()) return 'producto';
  return SEARCH_TERM[normalizeRubroKey(rubro)] ?? 'producto';
}

export function buscarExample(rubro?: string | null): string {
  return `buscar ${catalogSearchTerm(rubro)}`;
}

export function parseTenantGlossary(raw: unknown): TenantGlossary | null {
  if (raw == null || raw === '') return null;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as TenantGlossary;
    } catch {
      return { businessDescription: raw.slice(0, 200) };
    }
  }
  if (typeof raw === 'object') return raw as TenantGlossary;
  return null;
}
