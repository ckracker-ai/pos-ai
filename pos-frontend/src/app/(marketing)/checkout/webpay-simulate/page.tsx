import { Suspense } from 'react';
import { LoginShell } from '@/components/organisms/LoginShell';
import { CheckoutWebpaySimulate } from '@/components/organisms/CheckoutWebpaySimulate';

export const metadata = {
  title: 'Webpay simulador — POS-AI',
};

export default function WebpaySimulatePage() {
  return (
    <LoginShell>
      <Suspense
        fallback={
          <div className="mx-auto max-w-md rounded-2xl border border-brand-linen bg-white/95 p-8 text-center">
            Cargando simulador Webpay…
          </div>
        }
      >
        <CheckoutWebpaySimulate />
      </Suspense>
    </LoginShell>
  );
}
