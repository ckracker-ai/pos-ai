import { unwrapApiEnvelope } from '@/core/api/normalizers';
import { posProxyPath } from '@/core/constants/api-path';

const BFF_INTERNAL = (process.env.BFF_INTERNAL_URL || 'http://127.0.0.1:2020').replace(/\/$/, '');

export type PublicLegalDocument = {
  id: string;
  version: string;
  title: string;
  contentMd: string;
  contentHash: string;
  effectiveAt: string;
};

export type PublicLegalCurrent = {
  locale: string;
  terms: PublicLegalDocument;
  privacy: PublicLegalDocument;
};

export async function fetchPublicLegalCurrent(
  locale = 'es-CL'
): Promise<PublicLegalCurrent | null> {
  try {
    const url = `${BFF_INTERNAL}${posProxyPath(`public/legal/current?locale=${encodeURIComponent(locale)}`)}`;
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    const json = await res.json();
    const data = unwrapApiEnvelope(json) as PublicLegalCurrent;
    if (!data?.terms?.version || !data?.privacy?.version) return null;
    return data;
  } catch {
    return null;
  }
}
