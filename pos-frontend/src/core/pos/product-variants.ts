export type VariantProduct = {
  id: string;
  parentProductId?: string | null;
  variantSize?: string | null;
  variantColor?: string | null;
  stock?: number | null;
};

export function normalizeAxis(value?: string | null): string {
  return String(value ?? '').trim();
}

export function variantParentId<T extends VariantProduct>(product: T, catalog: T[]): string | null {
  const explicit = normalizeAxis(product.parentProductId);
  if (explicit) return explicit;
  const hasChildren = catalog.some((p) => p.parentProductId === product.id);
  if (hasChildren) return product.id;
  return null;
}

export function getVariantFamily<T extends VariantProduct>(catalog: T[], product: T): T[] {
  const parentId = variantParentId(product, catalog);
  if (!parentId) {
    const size = normalizeAxis(product.variantSize);
    const color = normalizeAxis(product.variantColor);
    return size || color ? [product] : [];
  }
  return catalog.filter((p) => p.id === parentId || p.parentProductId === parentId);
}

export function uniqueAxes(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const key = normalizeAxis(value);
    if (!key || seen.has(key.toLowerCase())) continue;
    seen.add(key.toLowerCase());
    out.push(key);
  }
  return out;
}

export type VariantMatrix<T extends VariantProduct> = {
  parentId: string;
  sizes: string[];
  colors: string[];
  cell: (size: string, color: string) => T | undefined;
};

export function buildVariantMatrix<T extends VariantProduct>(
  catalog: T[],
  product: T
): VariantMatrix<T> | null {
  const family = getVariantFamily(catalog, product);
  const variants = family.filter(
    (p) => normalizeAxis(p.variantSize) || normalizeAxis(p.variantColor)
  );
  if (variants.length === 0) return null;
  const parentId = variantParentId(product, catalog) ?? product.id;
  const sizes = uniqueAxes(variants.map((p) => p.variantSize));
  const colors = uniqueAxes(variants.map((p) => p.variantColor));
  const sizeKeys = sizes.length > 0 ? sizes : ['—'];
  const colorKeys = colors.length > 0 ? colors : ['—'];

  return {
    parentId,
    sizes: sizeKeys,
    colors: colorKeys,
    cell: (size, color) =>
      variants.find((p) => {
        const pSize = normalizeAxis(p.variantSize) || '—';
        const pColor = normalizeAxis(p.variantColor) || '—';
        return pSize === size && pColor === color;
      }),
  };
}

export function canSellVariantCell(stock?: number | null): boolean {
  return Number(stock ?? 0) > 0;
}
