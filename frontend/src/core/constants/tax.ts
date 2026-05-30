/** IVA vigente en Chile (19%). */
export const CHILE_IVA_RATE = 0.19;

export const CHILE_IVA_PERCENT = 19;

/** Etiqueta para UI del POS y comprobantes. */
export const CHILE_IVA_LABEL = `IVA (${CHILE_IVA_PERCENT}%)`;

/** Monto de IVA sobre un subtotal neto (precios sin IVA). */
export function calculateIvaFromNet(netSubtotal: number): number {
  return Math.round(netSubtotal * CHILE_IVA_RATE);
}

/** Total bruto = neto + IVA. */
export function calculateTotalWithIva(netSubtotal: number): number {
  return netSubtotal + calculateIvaFromNet(netSubtotal);
}
