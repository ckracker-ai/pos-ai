export const SAAS_METODOS_PAGO = [
  'TRANSFERENCIA',
  'WEBPAY',
  'MERCADO_PAGO',
  'FLOW',
  'MIXTO',
] as const;

export type SaasMetodoPago = (typeof SAAS_METODOS_PAGO)[number];

export const DEFAULT_SAAS_METODO_PAGO: SaasMetodoPago = 'TRANSFERENCIA';

export function isSaasMetodoPago(value: string): value is SaasMetodoPago {
  return (SAAS_METODOS_PAGO as readonly string[]).includes(value);
}
