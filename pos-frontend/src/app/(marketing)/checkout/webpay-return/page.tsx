import { Suspense } from 'react';
import { LoginShell } from '@/components/organisms/LoginShell';
import { CheckoutWebpayReturn } from '@/components/organisms/CheckoutWebpayReturn';

export const metadata = {
  title: 'Retorno Webpay — POS-AI',
};

export default function WebpayReturnPage() {
  return (
    <LoginShell>
      <Suspense
        fallback={
          <div className="mx-auto max-w-md rounded-2xl border border-brand-linen bg-white/95 p-8 text-center">
            Procesando retorno Webpay…
          </div>
        }
      >
        <CheckoutWebpayReturn />
      </Suspense>
    </LoginShell>
  );
}
