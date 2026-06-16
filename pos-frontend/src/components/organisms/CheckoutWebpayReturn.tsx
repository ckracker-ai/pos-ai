'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { PosAiLogo } from '@/components/atoms/PosAiLogo';
import { posProxyPath } from '@/core/constants/api-path';

type WebpayCommitPayload = {
  duplicate?: boolean;
  status?: string;
  data?: {
    empresa?: { id?: string };
    suscripcion?: unknown;
  };
};

function extractEmpresaId(payload: WebpayCommitPayload | null | undefined): string {
  if (!payload?.data?.empresa?.id) return '';
  return String(payload.data.empresa.id);
}

function mapWebpayReturnError(error: string): string {
  if (error.includes('WEBPAY_NOT_AUTHORIZED')) {
    return 'Transbank no autorizó el pago. Puedes reintentar desde el checkout.';
  }
  if (error.includes('WEBPAY_COMMIT_FAILED')) {
    return 'No se pudo confirmar con Transbank. Si ya pagaste, espera unos segundos e intenta iniciar sesión.';
  }
  if (error.includes('SUBSCRIPTION_ALREADY_ACTIVE')) {
    return 'Tu suscripción ya está activa. Puedes iniciar sesión.';
  }
  return error;
}

export function CheckoutWebpayReturn() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenWs = searchParams.get('token_ws') ?? '';
  const [error, setError] = useState('');
  const [rejected, setRejected] = useState(false);

  useEffect(() => {
    if (!tokenWs) {
      setError('Falta token_ws de Transbank. Si cancelaste el pago, vuelve al checkout.');
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

        const payload = (json.data ?? json) as WebpayCommitPayload;
        const status = String(payload?.status ?? '').toUpperCase();

        if (!res.ok || !json.success) {
          const msg = mapWebpayReturnError(String(json.error ?? 'Transbank no autorizó el pago'));
          setRejected(true);
          setError(msg);
          return;
        }

        if (status === 'REJECTED' || status === 'CANCELLED' || status === 'EXPIRED') {
          setRejected(true);
          setError(
            status === 'EXPIRED'
              ? 'La sesión de pago expiró. Vuelve al checkout e intenta de nuevo.'
              : 'El pago no fue autorizado. Puedes reintentar desde el checkout.'
          );
          return;
        }

        const empresaId = extractEmpresaId(payload);
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
          <p className={`text-sm ${rejected ? 'text-brand-ink' : 'text-red-800'}`}>{error}</p>
          <Link
            href="/checkout"
            className="mt-4 inline-block text-brand-olive font-medium hover:underline"
          >
            Volver al checkout
          </Link>
        </>
      ) : (
        <p className="text-brand-ink-muted">Confirmando pago con Transbank Webpay…</p>
      )}
    </div>
  );
}
