'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { PosAiLogo } from '@/components/atoms/PosAiLogo';
import { posProxyPath } from '@/core/constants/api-path';
import { unwrapApiEnvelope } from '@/core/api/normalizers';
import { CHILE_IVA_LABEL } from '@/core/constants/tax';
import type { PublicLegalCurrent } from '@/core/api/public-legal';

type CheckoutData = {
  empresaId: string;
  razonSocial: string;
  planCodigo: string;
  planNombre: string;
  netoClp: number;
  ivaClp: number;
  totalClp: number;
  suscripcionEstado: string;
  canPay: boolean;
};

function formatClp(n: number): string {
  return `$${n.toLocaleString('es-CL')}`;
}

type CheckoutFormProps = {
  legal: PublicLegalCurrent | null;
};

function mapCheckoutError(error: string): string {
  if (error.includes('LEGAL_VERSION_MISMATCH')) {
    return 'Los términos legales se actualizaron. Recarga la página y acepta de nuevo.';
  }
  if (error.includes('TERMS_NOT_ACCEPTED')) {
    return 'Debes aceptar los Términos de Servicio y la Política de Privacidad.';
  }
  return error;
}

export function CheckoutForm({ legal }: CheckoutFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const empresaId = searchParams.get('empresaId') ?? '';

  const [checkout, setCheckout] = useState<CheckoutData | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState('');
  const [paid, setPaid] = useState(false);
  const [acceptedLegal, setAcceptedLegal] = useState(false);

  const loadCheckout = useCallback(async () => {
    if (!empresaId) {
      setError('Falta el identificador de empresa. Regístrate de nuevo o contacta soporte.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(posProxyPath(`public/checkout/${empresaId}`));
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(String(json.error ?? 'No se pudo cargar el checkout'));
        return;
      }
      const data = unwrapApiEnvelope(json) as { checkout?: CheckoutData };
      const row = data.checkout;
      if (!row) {
        setError('Respuesta de checkout inválida');
        return;
      }
      setCheckout(row);
      if (!row.canPay) {
        setPaid(true);
      }
    } catch {
      setError('No se pudo conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  useEffect(() => {
    loadCheckout();
  }, [loadCheckout]);

  const buildLegalAcceptance = () => {
    if (!legal || !acceptedLegal) return null;
    return {
      termsVersion: legal.terms.version,
      privacyVersion: legal.privacy.version,
      accepted: true as const,
    };
  };

  const handlePasarelaSandbox = async () => {
    if (!checkout?.canPay) return;
    const legalAcceptance = buildLegalAcceptance();
    if (!legalAcceptance) {
      setError('Debes aceptar los Términos de Servicio y la Política de Privacidad.');
      return;
    }
    setRedirecting(true);
    setError('');
    try {
      const res = await fetch(posProxyPath('public/checkout/create-session'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empresaId: checkout.empresaId,
          provider: 'WEBPAY',
          legalAcceptance,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(mapCheckoutError(String(json.error ?? 'No se pudo iniciar la pasarela')));
        return;
      }
      const session = (json.data as { session?: { redirectUrl?: string } })?.session;
      const url = session?.redirectUrl;
      if (!url) {
        setError('Sesión de pago sin URL de retorno');
        return;
      }
      window.location.href = url;
    } catch {
      setError('Error al conectar con la pasarela sandbox.');
    } finally {
      setRedirecting(false);
    }
  };

  const handleSimulatePay = async () => {
    if (!checkout?.canPay) return;
    const legalAcceptance = buildLegalAcceptance();
    if (!legalAcceptance) {
      setError('Debes aceptar los Términos de Servicio y la Política de Privacidad.');
      return;
    }
    setPaying(true);
    setError('');
    try {
      const res = await fetch(posProxyPath('public/checkout/confirm'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empresaId: checkout.empresaId,
          provider: 'SANDBOX',
          reference: `sandbox-${Date.now()}`,
          legalAcceptance,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(mapCheckoutError(String(json.error ?? 'Pago no confirmado')));
        return;
      }
      setPaid(true);
      router.push(`/login?paid=1&empresaId=${encodeURIComponent(checkout.empresaId)}`);
    } catch {
      setError('Error al procesar el pago simulado.');
    } finally {
      setPaying(false);
    }
  };

  if (!empresaId) {
    return (
      <div className="login-card max-w-md mx-auto rounded-2xl bg-white/95 p-8 text-center">
        <p className="text-brand-ink-muted">{error}</p>
        <Link href="/registro" className="mt-4 inline-block text-brand-olive font-medium hover:underline">
          Ir a registro
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="login-card rounded-2xl bg-white/95 p-8 backdrop-blur-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <Link href="/">
            <PosAiLogo width={160} priority className="mb-3" />
          </Link>
          <h1 className="text-lg font-semibold text-brand-olive">Pago de suscripción</h1>
          <p className="mt-1 text-sm text-brand-ink-muted">Sandbox Webpay — sin cargo real en desarrollo</p>
        </div>

        {loading ? (
          <p className="text-center text-brand-ink-muted">Cargando…</p>
        ) : checkout ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-brand-linen bg-brand-surface/50 px-4 py-3 text-sm">
              <p className="font-medium text-brand-ink">{checkout.razonSocial}</p>
              <p className="text-brand-ink-muted">
                Plan {checkout.planNombre}{' '}
                <span className="text-xs">({checkout.planCodigo})</span>
              </p>
              <p className="mt-2 text-xs text-brand-ink-muted">
                Estado suscripción: <strong>{checkout.suscripcionEstado}</strong>
              </p>
            </div>

            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-brand-ink-muted">Neto mensual</dt>
                <dd className="font-medium text-brand-ink">{formatClp(checkout.netoClp)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-brand-ink-muted">{CHILE_IVA_LABEL}</dt>
                <dd className="font-medium text-brand-ink">{formatClp(checkout.ivaClp)}</dd>
              </div>
              <div className="flex justify-between border-t border-brand-linen pt-2 text-base">
                <dt className="font-semibold text-brand-ink">Total a pagar</dt>
                <dd className="font-semibold text-brand-olive">{formatClp(checkout.totalClp)}</dd>
              </div>
            </dl>

            {paid && !checkout.canPay ? (
              <p className="rounded-lg border border-brand-olive/30 bg-brand-olive/10 px-3 py-2 text-sm text-brand-ink">
                Esta suscripción ya está activa. Puedes iniciar sesión.
              </p>
            ) : null}

            {error ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {error}
              </p>
            ) : null}

            {checkout.canPay ? (
              <>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-brand-linen/80 bg-brand-surface/30 px-4 py-3 text-sm text-brand-ink">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded border-brand-linen accent-brand-olive"
                    checked={acceptedLegal}
                    onChange={(e) => setAcceptedLegal(e.target.checked)}
                    disabled={!legal}
                    required
                  />
                  <span>
                    He leído y acepto los{' '}
                    <Link
                      href="/legal/terminos"
                      target="_blank"
                      className="font-medium text-brand-olive hover:underline"
                    >
                      Términos de Servicio
                    </Link>{' '}
                    y la{' '}
                    <Link
                      href="/legal/privacidad"
                      target="_blank"
                      className="font-medium text-brand-olive hover:underline"
                    >
                      Política de Privacidad
                    </Link>
                    {legal ? (
                      <span className="block text-xs text-brand-ink-muted">
                        Versión {legal.terms.version} / {legal.privacy.version}
                      </span>
                    ) : (
                      <span className="block text-xs text-amber-800">Cargando documentos legales…</span>
                    )}
                  </span>
                </label>

                <button
                  type="button"
                  disabled={redirecting || paying || !legal || !acceptedLegal}
                  onClick={handlePasarelaSandbox}
                  className="w-full rounded-lg bg-brand-olive py-3 text-sm font-semibold text-white transition hover:bg-[#3d4532] disabled:opacity-60"
                >
                  {redirecting ? 'Redirigiendo a Webpay…' : 'Pagar con Webpay (sandbox)'}
                </button>
                <button
                  type="button"
                  disabled={paying || redirecting || !legal || !acceptedLegal}
                  onClick={handleSimulatePay}
                  className="w-full rounded-lg border border-brand-olive py-3 text-sm font-semibold text-brand-olive transition hover:bg-brand-surface disabled:opacity-60"
                >
                  {paying ? 'Procesando…' : 'Simular pago directo (sin redirect)'}
                </button>
              </>
            ) : null}

            <Link
              href={`/login?registered=1&empresaId=${encodeURIComponent(empresaId)}`}
              className="block w-full rounded-lg border border-brand-linen py-3 text-center text-sm font-semibold text-brand-ink transition hover:border-brand-olive hover:bg-brand-surface"
            >
              {checkout.canPay ? 'Omitir y usar piloto gratis' : 'Iniciar sesión'}
            </Link>
          </div>
        ) : (
          <p className="text-center text-brand-ink-muted">{error || 'Sin datos'}</p>
        )}

        <p className="mt-6 text-center text-xs text-brand-ink-muted">
          <Link href="/" className="text-brand-olive hover:underline">
            Volver al inicio
          </Link>
        </p>
      </div>
    </div>
  );
}
