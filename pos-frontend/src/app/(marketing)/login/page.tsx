'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { LoginForm } from '@/components/organisms/LoginForm';
import { LoginShell } from '@/components/organisms/LoginShell';

function LoginRegisteredBanner() {
  const searchParams = useSearchParams();
  const paid = searchParams.get('paid') === '1';
  const registered = searchParams.get('registered') === '1';
  if (!paid && !registered) return null;
  const email = searchParams.get('email');
  return (
    <div className="mx-auto mb-4 max-w-md rounded-xl border border-brand-olive/30 bg-brand-olive/10 px-4 py-3 text-center text-sm text-brand-ink">
      {paid ? (
        <>
          <strong>Pago confirmado.</strong> Tu suscripción está activa — inicia sesión.
        </>
      ) : (
        <>
          <strong>¡Registro exitoso!</strong> Inicia sesión con tu correo
          {email ? (
            <>
              {' '}
              <span className="font-medium">{email}</span>
            </>
          ) : null}
          . Puedes pagar después desde checkout.
        </>
      )}
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('auth-redirecting');
    }

    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  return (
    <LoginShell>
      <Suspense fallback={null}>
        <LoginRegisteredBanner />
      </Suspense>
      <LoginForm />
    </LoginShell>
  );
}
