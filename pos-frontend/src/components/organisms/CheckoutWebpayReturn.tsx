'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { PosAiLogo } from '@/components/atoms/PosAiLogo';
import { posProxyPath } from '@/core/constants/api-path';

export function CheckoutWebpayReturn() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenWs = searchParams.get('token_ws') ?? '';
  const [error, setError] = useState('');

  useEffect(() => {
    if (!tokenWs) {
      setError('Falta token_ws de Transbank.');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(posProxyPath('public/checkout/webpay-commit'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token_ws: tokenWs }),
        });
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok || !json.success) {
          setError(String(json.error ?? 'Transbank no autorizó el pago'));
          return;
        }
        const inner = (json.data as { data?: { empresa?: { id?: string } } })?.data;
        const empresaId = String(inner?.empresa?.id ?? '');
        const q = empresaId ? `?paid=1&empresaId=${encodeURIComponent(empresaId)}` : '?paid=1';
        router.replace(`/login${q}`);
      } catch {
        if (!cancelled) setError('Error al confirmar con Transbank.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tokenWs, router]);

  return (
    <div className="login-card max-w-md mx-auto rounded-2xl bg-white/95 p-8 text-center">
      <Link href="/" className="inline-block mb-4">
        <PosAiLogo width={140} />
      </Link>
      {error ? (
        <>
          <p className="text-sm text-red-800">{error}</p>
          <Link href="/checkout" className="mt-4 inline-block text-brand-olive font-medium hover:underline">
            Volver al checkout
          </Link>
        </>
      ) : (
        <p className="text-brand-ink-muted">Confirmando pago con Transbank Webpay…</p>
      )}
    </div>
  );
}
