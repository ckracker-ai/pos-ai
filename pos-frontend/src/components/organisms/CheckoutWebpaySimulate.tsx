'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { PosAiLogo } from '@/components/atoms/PosAiLogo';
import { posProxyPath } from '@/core/constants/api-path';

export function CheckoutWebpaySimulate() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleApprove = async () => {
    if (!token) {
      setError('Sesión Webpay inválida.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const res = await fetch(posProxyPath('public/checkout/sandbox-complete'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(String(json.error ?? 'Pago no autorizado'));
        return;
      }
      const inner = (json.data as { data?: { empresa?: { id?: string } } })?.data;
      const empresaId = String(inner?.empresa?.id ?? '');
      const q = empresaId ? `?paid=1&empresaId=${encodeURIComponent(empresaId)}` : '?paid=1';
      router.replace(`/login${q}`);
    } catch {
      setError('Error de conexión.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-card max-w-md mx-auto rounded-2xl bg-white/95 p-8">
      <div className="mb-6 flex flex-col items-center text-center">
        <Link href="/">
          <PosAiLogo width={140} className="mb-3" />
        </Link>
        <h1 className="text-lg font-semibold text-brand-olive">Webpay Plus — simulador</h1>
        <p className="mt-1 text-sm text-brand-ink-muted">
          Entorno de integración POS-AI (sin cargo real)
        </p>
      </div>
      <div className="rounded-xl border border-brand-olive/20 bg-brand-olive/5 px-4 py-3 text-sm text-brand-ink">
        <p>Confirma el pago simulado con el token de sesión emitido al crear la transacción.</p>
        <p className="mt-2 text-xs text-brand-ink-muted">
          Con credenciales Transbank (`WEBPAY_MODE=integration`) este paso se omite y el retorno es
          automático.
        </p>
      </div>
      {error ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        disabled={busy || !token}
        onClick={handleApprove}
        className="mt-6 w-full rounded-lg bg-brand-olive py-3 text-sm font-semibold text-white transition hover:bg-[#3d4532] disabled:opacity-60"
      >
        {busy ? 'Autorizando…' : 'Simular pago aprobado (TBK)'}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => router.back()}
        className="mt-3 w-full rounded-lg border border-brand-linen py-3 text-sm font-semibold text-brand-ink hover:bg-brand-surface"
      >
        Cancelar
      </button>
    </div>
  );
}
