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
  title: LANDING_BRAND.tagline,
  description: LANDING_BRAND.shortPitch,
  openGraph: {
    title: LANDING_BRAND.tagline,
    description: LANDING_BRAND.shortPitch,
    type: 'website',
    locale: 'es_CL',
    images: [{ url: LANDING_BRAND.ogImage, alt: LANDING_BRAND.tagline }],
  },
  twitter: {
    card: 'summary_large_image',
    title: LANDING_BRAND.tagline,
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
