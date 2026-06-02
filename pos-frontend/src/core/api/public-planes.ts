import { normalizeSaasPlan, unwrapApiEnvelope } from '@/core/api/normalizers';
import type { SaasPlan } from '@/core/interfaces';
import { posProxyPath } from '@/core/constants/api-path';

const BFF_INTERNAL = (process.env.BFF_INTERNAL_URL || 'http://127.0.0.1:2020').replace(/\/$/, '');

export async function fetchPublicPlanes(): Promise<SaasPlan[] | null> {
  const url = `${BFF_INTERNAL}${posProxyPath('public/planes')}`;
  try {
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    const json = await res.json();
    const data = unwrapApiEnvelope(json) as { planes?: unknown[] };
    const rows = Array.isArray(data.planes) ? data.planes : [];
    return rows.map((r) => normalizeSaasPlan(r as Record<string, unknown>));
  } catch {
    return null;
  }
}
