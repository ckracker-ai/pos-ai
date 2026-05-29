type StockProduct = { name: string; sku: string; price: number };

export type NormalizedStockRecord = {
  id: string;
  productId: string;
  branchId: string;
  quantity: number;
  minStock: number;
  product?: StockProduct;
};

function readValue(row: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
}

function normalizeStockRow(
  row: Record<string, unknown>,
  fallbackBranchId: string
): NormalizedStockRecord {
  const nestedProduct = row.product;
  const productFromNested =
    nestedProduct &&
    typeof nestedProduct === 'object' &&
    !Array.isArray(nestedProduct) &&
    readValue(nestedProduct as Record<string, unknown>, 'name')
      ? {
          name: String(readValue(nestedProduct as Record<string, unknown>, 'name') ?? ''),
          sku: String(readValue(nestedProduct as Record<string, unknown>, 'sku', 'product_sku') ?? ''),
          price: Number(readValue(nestedProduct as Record<string, unknown>, 'price', 'product_price') ?? 0),
        }
      : undefined;

  const productName = readValue(row, 'product_name', 'productName');
  const productFromFlat = productName
    ? {
        name: String(productName),
        sku: String(readValue(row, 'product_sku', 'productSku', 'sku') ?? ''),
        price: Number(readValue(row, 'product_price', 'productPrice', 'price') ?? 0),
      }
    : undefined;

  return {
    id: String(readValue(row, 'id') ?? ''),
    productId: String(readValue(row, 'product_id', 'productId') ?? ''),
    branchId: String(readValue(row, 'branch_id', 'branchId') ?? fallbackBranchId),
    quantity: Number(readValue(row, 'quantity') ?? 0),
    minStock: Number(readValue(row, 'min_stock', 'minStock') ?? 0),
    ...(productFromNested ? { product: productFromNested } : productFromFlat ? { product: productFromFlat } : {}),
  };
}

export function normalizeInventoryListPayload(
  corePayload: unknown,
  fallbackBranchId: string
): { inventory: NormalizedStockRecord[] } {
  const envelope = corePayload as { data?: unknown } | null;
  const data = envelope?.data ?? corePayload;

  const rows = Array.isArray(data)
    ? data
    : data && typeof data === 'object' && Array.isArray((data as { inventory?: unknown[] }).inventory)
      ? ((data as { inventory: unknown[] }).inventory ?? [])
      : [];

  return {
    inventory: rows
      .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === 'object')
      .map((row) => normalizeStockRow(row, fallbackBranchId)),
  };
}

export function normalizeInventorySinglePayload(
  corePayload: unknown,
  fallbackBranchId: string
): { stock: NormalizedStockRecord } {
  const envelope = corePayload as { data?: unknown } | null;
  const data = envelope?.data ?? corePayload;
  const row =
    data && typeof data === 'object' && 'stock' in (data as object)
      ? (data as { stock: Record<string, unknown> }).stock
      : (data as Record<string, unknown>);

  return { stock: normalizeStockRow(row, fallbackBranchId) };
}
