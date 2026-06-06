import { Suspense } from 'react';
import { LoginShell } from '@/components/organisms/LoginShell';
import { CheckoutReturnHandler } from '@/components/organisms/CheckoutReturnHandler';

export const metadata = {
  title: 'Confirmando pago — POS-AI',
};

export default function CheckoutReturnPage() {
  return (
    <LoginShell>
      <Suspense
        fallback={
          <div className="mx-auto max-w-md rounded-2xl border border-brand-linen bg-white/95 p-8 text-center text-brand-ink-muted">
            Confirmando pago…
          </div>
        }
      >
        <CheckoutReturnHandler />
      </Suspense>
    </LoginShell>
  );
}
