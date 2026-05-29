import { Branch, Category, KitchenOrder, Product, Supplier, User, UserRole } from '@/core/interfaces';

export function unwrapApiEnvelope(responseData: unknown): unknown {
  if (
    responseData &&
    typeof responseData === 'object' &&
    'data' in responseData &&
    ('success' in responseData || 'code' in responseData)
  ) {
    return (responseData as { data: unknown }).data;
  }
  return responseData;
}

export function extractList<T>(data: unknown, keys: string[]): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object') {
    for (const key of keys) {
      const value = (data as Record<string, unknown>)[key];
      if (Array.isArray(value)) return value as T[];
    }
  }
  return [];
}

export function extractEntity<T>(data: unknown, keys: string[]): T | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return (data as T) ?? null;
  }
  for (const key of keys) {
    if (key in (data as object)) {
      return (data as Record<string, T>)[key];
    }
  }
  return data as T;
}

/** Obtiene el id de un producto recién creado desde distintas formas de respuesta del BFF/core. */
export function extractCreatedProductId(responseData: unknown): string {
  const envelope = unwrapApiEnvelope(responseData);
  const product = extractEntity<Record<string, unknown>>(envelope, ['product']);

  if (product?.id) return String(product.id);

  if (envelope && typeof envelope === 'object' && 'id' in envelope) {
    return String((envelope as Record<string, unknown>).id ?? '');
  }

  return '';
}

export const normalizeRoleName = (roleName?: string): UserRole => {
  if (!roleName) return 'user';
  const normalized = roleName.toLowerCase();
  if (normalized.includes('comanda')) return 'comanda';
  if (normalized.includes('admin')) return 'admin';
  if (normalized.includes('auditor')) return 'auditor';
  if (normalized.includes('seller') || normalized.includes('vendedor')) return 'seller';
  return 'user';
};

export function normalizeUser(raw: Record<string, unknown>): User {
  const roleObj = raw.role as { name?: string } | undefined;
  const roleName = String(roleObj?.name ?? raw.roleName ?? 'user');

  return {
    id: String(raw.id ?? ''),
    email: String(raw.email ?? ''),
    name: String(raw.fullName ?? raw.name ?? ''),
    role: normalizeRoleName(roleName),
    branchId: raw.branchId ? String(raw.branchId) : undefined,
    isActive: raw.isActive !== false,
    createdAt: String(raw.createdAt ?? new Date().toISOString()),
    updatedAt: String(raw.updatedAt ?? new Date().toISOString()),
  };
}

function readProductScalar(
  raw: Record<string, unknown>,
  camelKey: string,
  snakeKey: string
): unknown {
  const nested = raw.product as Record<string, unknown> | undefined;
  return (
    raw[camelKey] ??
    raw[snakeKey] ??
    nested?.[camelKey] ??
    nested?.[snakeKey] ??
    (raw.dataValues as Record<string, unknown> | undefined)?.[camelKey]
  );
}

export function normalizeProduct(raw: Record<string, unknown>, stock = 0): Product {
  const category = raw.category as { name?: string } | undefined;
  const categoryName =
    typeof raw.category === 'string' ? raw.category : String(category?.name ?? '');

  const embeddedStock = readProductScalar(raw, 'stock', 'stock');
  const resolvedStock =
    embeddedStock !== undefined &&
    embeddedStock !== null &&
    typeof embeddedStock !== 'object'
      ? Number(embeddedStock)
      : stock;

  const minStockRaw = readProductScalar(raw, 'minStock', 'min_stock');
  const resolvedMinStock =
    minStockRaw !== undefined && minStockRaw !== null ? Number(minStockRaw) : 0;

  const priceRaw = readProductScalar(raw, 'price', 'price');
  const isActiveRaw = readProductScalar(raw, 'isActive', 'is_active');

  return {
    id: String(raw.id ?? (raw.product as { id?: string } | undefined)?.id ?? ''),
    name: String(readProductScalar(raw, 'name', 'name') ?? ''),
    description: String(readProductScalar(raw, 'description', 'description') ?? ''),
    price: Number(priceRaw ?? 0),
    cost: Number(readProductScalar(raw, 'cost', 'cost') ?? 0),
    stock: resolvedStock,
    sku: String(readProductScalar(raw, 'sku', 'sku') ?? ''),
    category: categoryName,
    isActive: isActiveRaw !== false && isActiveRaw !== 0 && isActiveRaw !== '0',
    inBranch: Boolean(
      raw.stockRecordId ??
        raw.stock_record_id ??
        raw.stockId ??
        raw.stock_id ??
        ((raw.inBranch === true || raw.in_branch === true) ||
          resolvedStock > 0 ||
          resolvedMinStock > 0)
    ),
    stockRecordId:
      raw.stockRecordId != null
        ? String(raw.stockRecordId)
        : raw.stock_record_id != null
          ? String(raw.stock_record_id)
          : raw.stockId != null
            ? String(raw.stockId)
            : raw.stock_id != null
              ? String(raw.stock_id)
              : undefined,
    minStock: resolvedMinStock,
    createdAt: String(
      readProductScalar(raw, 'createdAt', 'created_at') ?? new Date().toISOString()
    ),
    updatedAt: String(
      readProductScalar(raw, 'updatedAt', 'updated_at') ?? new Date().toISOString()
    ),
  };
}

export function normalizeBranch(raw: Record<string, unknown>): Branch {
  return {
    id: String(raw.id ?? ''),
    name: String(raw.name ?? ''),
    code: String(raw.code ?? ''),
    address: String(raw.address ?? ''),
    city: String(raw.city ?? ''),
    phone: String(raw.phone ?? ''),
    isActive: raw.isActive !== false,
  };
}

export function normalizeSupplier(raw: Record<string, unknown>): Supplier {
  return {
    id: String(raw.id ?? ''),
    name: String(raw.name ?? ''),
    contactEmail: raw.contactEmail ? String(raw.contactEmail) : undefined,
    contactPhone: raw.contactPhone ? String(raw.contactPhone) : undefined,
    address: raw.address ? String(raw.address) : undefined,
    isActive: raw.isActive !== false,
    createdAt: String(raw.createdAt ?? new Date().toISOString()),
    updatedAt: String(raw.updatedAt ?? new Date().toISOString()),
  };
}

export function normalizeCategory(raw: Record<string, unknown>): Category {
  return {
    id: String(raw.id ?? ''),
    name: String(raw.name ?? ''),
    description: raw.description ? String(raw.description) : undefined,
    isActive: raw.isActive !== false,
    createdAt: String(raw.createdAt ?? new Date().toISOString()),
    updatedAt: String(raw.updatedAt ?? new Date().toISOString()),
  };
}

export function mergeProductsWithInventory(
  products: Product[],
  inventory: Array<Record<string, unknown>>
): Product[] {
  const stockByProduct = new Map<string, number>();
  const minStockByProduct = new Map<string, number>();
  const stockRecordIdByProduct = new Map<string, string>();

  for (const item of inventory) {
    const productId = String(item.productId ?? (item.product as { id?: string })?.id ?? '');
    const recordId = item.id != null ? String(item.id) : '';
    if (!productId || !recordId) continue;
    stockByProduct.set(productId, Number(item.quantity ?? item.stock ?? 0));
    const minStockRaw = item.minStock ?? item.min_stock ?? 0;
    minStockByProduct.set(productId, Number(minStockRaw ?? 0));
    stockRecordIdByProduct.set(productId, recordId);
  }

  return products.map((product) => {
    const hasCatalogBranchStock =
      Boolean(product.stockRecordId) ||
      product.inBranch === true ||
      Number(product.stock ?? 0) > 0 ||
      Number(product.minStock ?? 0) > 0;

    // El catálogo por sucursal ya trae stock/minStock; no pisar con merge de inventario.
    if (hasCatalogBranchStock) return product;

    const recordId = stockRecordIdByProduct.get(product.id);
    const quantity = stockByProduct.get(product.id);
    if (!recordId || quantity === undefined) return product;

    return {
      ...product,
      stock: quantity,
      minStock: minStockByProduct.get(product.id) ?? product.minStock ?? 0,
      inBranch: true,
      stockRecordId: recordId,
    };
  });
}

export interface ShrinkageRecord {
  id: string;
  productId: string;
  productName?: string;
  branchId: string;
  quantity: number;
  reason: string;
  status: string;
  createdAt: string;
}

export function normalizeShrinkage(raw: Record<string, unknown>): ShrinkageRecord {
  const product = raw.product as { name?: string } | undefined;
  return {
    id: String(raw.id ?? ''),
    productId: String(raw.productId ?? ''),
    productName: product?.name ? String(product.name) : undefined,
    branchId: String(raw.branchId ?? ''),
    quantity: Number(raw.quantity ?? 0),
    reason: String(raw.reason ?? ''),
    status: String(raw.status ?? 'PENDING'),
    createdAt: String(raw.createdAt ?? new Date().toISOString()),
  };
}

export function normalizeKitchenOrder(
  raw: Record<string, unknown>,
  productNames: Map<string, string>
): KitchenOrder {
  const detailsRaw =
    (raw.details as Array<Record<string, unknown>> | undefined) ??
    (raw.SaleDetails as Array<Record<string, unknown>> | undefined) ??
    [];

  const items = detailsRaw.map((line) => {
    const product = line.product as { id?: string; name?: string } | undefined;
    const productId = String(line.productId ?? product?.id ?? '');
    return {
      id: String(line.id ?? productId),
      productId,
      productName: String(
        product?.name ?? productNames.get(productId) ?? `Producto ${productId.slice(0, 8)}`
      ),
      quantity: Number(line.quantity ?? 0),
    };
  });

  return {
    id: String(raw.id ?? ''),
    status: String(raw.status ?? 'PENDING'),
    notes: raw.notes ? String(raw.notes) : undefined,
    createdAt: String(raw.createdAt ?? new Date().toISOString()),
    items,
  };
}

export async function fetchProductsForBranch(
  branchId: string,
  getProducts: () => Promise<{ data: unknown }>,
  getInventory?: (id: string) => Promise<{ data: unknown }>
): Promise<Product[]> {
  const productsRes = await getProducts();
  const envelope = unwrapApiEnvelope(productsRes.data);
  const productRows = extractList<Record<string, unknown>>(envelope, ['products']);
  const products = productRows.map((row) => normalizeProduct(row));

  if (!getInventory) {
    return products;
  }

  try {
    const inventoryRes = await getInventory(branchId);
    const inventory = extractList<Record<string, unknown>>(
      unwrapApiEnvelope(inventoryRes.data),
      ['inventory', 'stock', 'items']
    );
    if (inventory.length === 0) return products;
    return mergeProductsWithInventory(products, inventory);
  } catch {
    return products;
  }
}
