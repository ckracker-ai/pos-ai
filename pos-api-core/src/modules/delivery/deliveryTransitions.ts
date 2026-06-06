import type { DeliveryStatus } from './types.js';

const ALLOWED: Record<DeliveryStatus, DeliveryStatus[]> = {
  CREATED: ['ASSIGNED', 'FAILED'],
  ASSIGNED: ['ON_ROUTE', 'FAILED'],
  ON_ROUTE: ['DELIVERED', 'FAILED'],
  DELIVERED: [],
  FAILED: [],
};

export function canTransitionDelivery(from: DeliveryStatus, to: DeliveryStatus): boolean {
  return ALLOWED[from]?.includes(to) ?? false;
}

export function parseDeliveryStatus(raw: unknown): DeliveryStatus | null {
  const s = String(raw ?? '').trim().toUpperCase();
  if (s === 'CREATED' || s === 'ASSIGNED' || s === 'ON_ROUTE' || s === 'DELIVERED' || s === 'FAILED') {
    return s;
  }
  return null;
}
