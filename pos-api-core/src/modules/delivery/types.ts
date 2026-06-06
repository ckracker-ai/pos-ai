export const DELIVERY_STATUSES = [
  'CREATED',
  'ASSIGNED',
  'ON_ROUTE',
  'DELIVERED',
  'FAILED',
] as const;

export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

export const TERMINAL_DELIVERY_STATUSES: DeliveryStatus[] = ['DELIVERED', 'FAILED'];
