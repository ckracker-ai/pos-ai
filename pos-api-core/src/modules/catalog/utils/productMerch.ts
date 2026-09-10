export type ProductMerchFields = {
  barcode?: string | null;
  parentProductId?: string | null;
  variantSize?: string | null;
  variantColor?: string | null;
  packQty?: number;
  sizeMm?: number | null;
  priceTiers?: Array<{ minQty: number; unitPrice: number }>;
};

function readString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  return value.trim();
}

function readNullableString(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function readProductMerchFromBody(body: Record<string, unknown> | undefined): ProductMerchFields {
  const merch: ProductMerchFields = {};
  if (!body) return merch;

  if (body.barcode !== undefined) {
    merch.barcode = readNullableString(body.barcode);
  }
  if (body.parentProductId !== undefined || body.parent_product_id !== undefined) {
    merch.parentProductId = readNullableString(body.parentProductId ?? body.parent_product_id);
  }
  if (body.variantSize !== undefined || body.variant_size !== undefined) {
    merch.variantSize = readNullableString(body.variantSize ?? body.variant_size);
  }
  if (body.variantColor !== undefined || body.variant_color !== undefined) {
    merch.variantColor = readNullableString(body.variantColor ?? body.variant_color);
  }
  if (body.packQty !== undefined || body.pack_qty !== undefined) {
    const packQty = Number(body.packQty ?? body.pack_qty);
    merch.packQty = Number.isFinite(packQty) && packQty > 0 ? packQty : 1;
  }
  if (body.sizeMm !== undefined || body.size_mm !== undefined) {
    const raw = body.sizeMm ?? body.size_mm;
    if (raw === null || raw === '') {
      merch.sizeMm = null;
    } else {
      const sizeMm = Number(raw);
      merch.sizeMm = Number.isFinite(sizeMm) && sizeMm > 0 ? sizeMm : null;
    }
  }

  const barcodeAlias = readString(body.barcode);
  if (barcodeAlias !== undefined && merch.barcode === undefined) {
    merch.barcode = barcodeAlias || null;
  }

  if (body.priceTiers !== undefined) {
    if (!Array.isArray(body.priceTiers)) {
      merch.priceTiers = [];
    } else {
      merch.priceTiers = body.priceTiers.map((row) => {
        const item = (row ?? {}) as { minQty?: unknown; min_qty?: unknown; unitPrice?: unknown; unit_price?: unknown };
        return {
          minQty: Number(item.minQty ?? item.min_qty),
          unitPrice: Number(item.unitPrice ?? item.unit_price),
        };
      });
    }
  }

  return merch;
}
