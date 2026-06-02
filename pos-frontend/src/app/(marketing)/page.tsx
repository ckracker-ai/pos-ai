import { LandingPage } from '@/components/organisms/LandingPage';
import { fetchPublicPlanes } from '@/core/api/public-planes';
import {
  buildLandingPlansFromApi,
  FALLBACK_LANDING_PLANS,
} from '@/core/constants/landing-plans';

export const revalidate = 300;

export default async function Home() {
  const apiPlanes = await fetchPublicPlanes();
  const plans =
    apiPlanes && apiPlanes.length > 0
      ? buildLandingPlansFromApi(apiPlanes)
      : FALLBACK_LANDING_PLANS;

  return <LandingPage plans={plans} />;
}
