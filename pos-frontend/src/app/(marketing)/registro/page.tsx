import { Suspense } from 'react';
import { LoginShell } from '@/components/organisms/LoginShell';
import { RegistroForm } from '@/components/organisms/RegistroForm';
import { fetchPublicPlanes } from '@/core/api/public-planes';
import { fetchPublicLegalCurrent } from '@/core/api/public-legal';
import {
  buildLandingPlansFromApi,
  FALLBACK_LANDING_PLANS,
} from '@/core/constants/landing-plans';

export const metadata = {
  title: 'Registro — POS-AI',
  description: 'Alta piloto de tu negocio en POS-AI',
};

function RegistroFallback() {
  return (
    <div className="w-full max-w-lg mx-auto rounded-2xl border border-brand-linen bg-white/95 p-8 text-center text-brand-ink-muted">
      Cargando formulario…
    </div>
  );
}

export default async function RegistroPage() {
  const [apiPlanes, legal] = await Promise.all([fetchPublicPlanes(), fetchPublicLegalCurrent()]);
  const plans =
    apiPlanes && apiPlanes.length > 0
      ? buildLandingPlansFromApi(apiPlanes)
      : FALLBACK_LANDING_PLANS;

  return (
    <LoginShell>
      <Suspense fallback={<RegistroFallback />}>
        <RegistroForm plans={plans} legal={legal} />
      </Suspense>
    </LoginShell>
  );
}
