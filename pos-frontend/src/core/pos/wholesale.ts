export type PriceTier = {
  minQty: number;
  unitPrice: number;
};

export function normalizePriceTiers(tiers: PriceTier[] | null | undefined): PriceTier[] {
  return (tiers ?? [])
    .map((t) => ({
      minQty: Number(t.minQty),
      unitPrice: Number(t.unitPrice),
    }))
    .filter((t) => Number.isFinite(t.minQty) && t.minQty > 0 && Number.isFinite(t.unitPrice) && t.unitPrice > 0)
    .sort((a, b) => a.minQty - b.minQty);
}

/** Precio de lista salvo que la cantidad alcance un tramo mayor. */
export function priceForQty(basePrice: number, qty: number, tiers?: PriceTier[] | null): number {
  const base = Number(basePrice);
  const q = Number(qty);
  if (!Number.isFinite(base) || !Number.isFinite(q) || q <= 0) return Number.isFinite(base) ? base : 0;
  const applicable = normalizePriceTiers(tiers)
    .filter((t) => q + 1e-9 >= t.minQty)
    .pop();
  return applicable ? applicable.unitPrice : base;
}

export type CreditCustomer = {
  creditLimit: number;
  creditUsed: number;
  isOverdue: boolean;
};

export function creditAllowsSale(
  customer: CreditCustomer | null | undefined,
  saleTotal: number,
  onCredit: boolean
): { ok: true } | { ok: false; reason: 'overdue' | 'limit' | 'no_customer' } {
  if (!onCredit) return { ok: true };
  if (!customer) return { ok: false, reason: 'no_customer' };
  if (customer.isOverdue) return { ok: false, reason: 'overdue' };
  const limit = Number(customer.creditLimit ?? 0);
  const used = Number(customer.creditUsed ?? 0);
  const total = Number(saleTotal);
  if (!Number.isFinite(total) || total < 0) return { ok: false, reason: 'limit' };
  if (used + total > limit + 0.009) return { ok: false, reason: 'limit' };
  return { ok: true };
}

export function creditBlockMessage(reason: 'overdue' | 'limit' | 'no_customer'): string {
  if (reason === 'overdue') return 'Este cliente tiene mora. El crédito está bloqueado.';
  if (reason === 'limit') return 'La venta supera el cupo de crédito del cliente.';
  return 'Selecciona un cliente para vender a crédito o aplicar precio mayorista.';
}
