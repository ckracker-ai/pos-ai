import type { Metadata } from 'next';
import { LandingPage } from '@/components/organisms/LandingPage';
import { fetchPublicPlanes } from '@/core/api/public-planes';
import {
  buildLandingPlansFromApi,
  FALLBACK_LANDING_PLANS,
} from '@/core/constants/landing-plans';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Preview landing — POS-AI',
  description: 'Vista previa del layout anterior: imagen en hero y video en sección media.',
  robots: { index: false, follow: false },
};

export default async function LandingPreviewPage() {
  const apiPlanes = await fetchPublicPlanes();
  const plans =
    apiPlanes && apiPlanes.length > 0
      ? buildLandingPlansFromApi(apiPlanes)
      : FALLBACK_LANDING_PLANS;

  return (
    <LandingPage plans={plans} mediaLayout="default" showPreviewBanner />
  );
}
