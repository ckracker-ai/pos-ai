import { Suspense } from 'react';
import { LoginShell } from '@/components/organisms/LoginShell';
import { CheckoutForm } from '@/components/organisms/CheckoutForm';

export const metadata = {
  title: 'Checkout — POS-AI',
  description: 'Pago de suscripción POS-AI (sandbox)',
};

export default function CheckoutPage() {
  return (
    <LoginShell>
      <Suspense
        fallback={
          <div className="mx-auto max-w-md rounded-2xl border border-brand-linen bg-white/95 p-8 text-center text-brand-ink-muted">
            Cargando checkout…
          </div>
        }
      >
        <CheckoutForm />
      </Suspense>
    </LoginShell>
  );
}
