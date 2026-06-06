import type { Metadata } from 'next';
import { LandingPage } from '@/components/organisms/LandingPage';
import { fetchPublicPlanes } from '@/core/api/public-planes';
import { LANDING_BRAND } from '@/core/constants/landing-content';
import {
  buildLandingPlansFromApi,
  FALLBACK_LANDING_PLANS,
} from '@/core/constants/landing-plans';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'POS-AI — Punto de venta inteligente para PYMEs',
  description: LANDING_BRAND.shortPitch,
  openGraph: {
    title: 'POS-AI — Punto de venta inteligente',
    description: LANDING_BRAND.shortPitch,
    type: 'website',
    locale: 'es_CL',
    images: [{ url: LANDING_BRAND.ogImage, alt: 'POS-AI logo' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'POS-AI — Punto de venta inteligente',
    description: LANDING_BRAND.shortPitch,
    images: [LANDING_BRAND.ogImage],
  },
};

export default async function Home() {
  const apiPlanes = await fetchPublicPlanes();
  const plans =
    apiPlanes && apiPlanes.length > 0
      ? buildLandingPlansFromApi(apiPlanes)
      : FALLBACK_LANDING_PLANS;

  return <LandingPage plans={plans} />;
}
