import { roundSaleQty } from './posSaleAssist';

const INCH_TO_MM = 25.4;

export type EquivalenceProduct = {
  name?: string | null;
  sku?: string | null;
  barcode?: string | null;
  category?: string | null;
  description?: string | null;
  variantSize?: string | null;
  variantColor?: string | null;
  packQty?: number | null;
  sizeMm?: number | null;
};

export function parseLengthQueryMm(query: string): number | null {
  const q = query.trim().toLowerCase().replace(',', '.');
  if (!q) return null;
  const inch = q.match(/(\d+(?:\.\d+)?)\s*(?:["”]|in(?:ch(?:es)?)?|pulg(?:ada)?s?)\b/);
  if (inch) return Number(inch[1]) * INCH_TO_MM;
  const mm = q.match(/(\d+(?:\.\d+)?)\s*mm\b/);
  if (mm) return Number(mm[1]);
  return null;
}

export function lengthsMatchMm(a: number, b: number, tol = 0.51): boolean {
  return Math.abs(a - b) <= tol;
}

export function mmToInchLabel(mm: number): string {
  const inches = Math.round((mm / INCH_TO_MM) * 100) / 100;
  return `${inches}"`;
}

export function expandEquivalenceTokens(query: string): string[] {
  const raw = query.trim().toLowerCase();
  if (!raw) return [];
  const tokens = new Set<string>([raw]);
  const mm = parseLengthQueryMm(query);
  if (mm != null) {
    const rounded = Math.round(mm * 10) / 10;
    tokens.add(`${rounded}mm`);
    tokens.add(`${Math.round(mm)}mm`);
    tokens.add(mmToInchLabel(mm).toLowerCase());
    tokens.add(`${mmToInchLabel(mm).replace('"', '')} pulg`);
  }
  if (/\bcajas?\b/.test(raw)) {
    tokens.add('caja');
    tokens.add('pack');
  }
  return [...tokens];
}

export function packUnitsForSaleQty(sellQty: number, packQty: number, sellAsPack: boolean): number {
  const pack = Number(packQty) > 0 ? Number(packQty) : 1;
  return roundSaleQty(sellAsPack ? sellQty * pack : sellQty);
}

export function productSearchHaystack(product: EquivalenceProduct): string {
  const pack = Number(product.packQty ?? 1);
  return [
    product.name,
    product.sku,
    product.barcode,
    product.category,
    product.description,
    product.variantSize,
    product.variantColor,
    product.sizeMm != null ? `${product.sizeMm}mm` : '',
    product.sizeMm != null ? mmToInchLabel(product.sizeMm) : '',
    pack > 1 ? `caja ${pack}` : '',
  ]
    .join(' ')
    .toLowerCase();
}

export function productMatchesEquivalenceSearch(product: EquivalenceProduct, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = productSearchHaystack(product);
  if (hay.includes(q)) return true;
  for (const token of expandEquivalenceTokens(query)) {
    if (token && hay.includes(token)) return true;
  }
  const qMm = parseLengthQueryMm(query);
  const sizeMm = Number(product.sizeMm);
  if (qMm != null && Number.isFinite(sizeMm) && sizeMm > 0 && lengthsMatchMm(qMm, sizeMm)) {
    return true;
  }
  return false;
}
