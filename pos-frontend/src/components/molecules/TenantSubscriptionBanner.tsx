'use client';

import Link from 'next/link';
import { useTenantEmpresa } from '@/core/hooks/useTenantEmpresa';
import { getSubscriptionAlert } from '@/core/config/plan-access';

const TONE_STYLES = {
  info: 'border-sky-200 bg-sky-50 text-sky-950',
  warning: 'border-amber-300 bg-amber-50 text-amber-950',
  danger: 'border-rose-200 bg-rose-50 text-rose-950',
} as const;

export function TenantSubscriptionBanner() {
  const { empresa } = useTenantEmpresa();
  const alert = getSubscriptionAlert(empresa);

  if (!alert) return null;

  const checkoutHref = empresa?.id ? `/checkout?empresaId=${encodeURIComponent(empresa.id)}` : '/checkout';

  return (
    <div
      role="status"
      className={`border-b px-4 py-2.5 text-sm sm:px-6 ${TONE_STYLES[alert.tone]}`}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold">{alert.title}</p>
          <p className="mt-0.5 text-sm opacity-90">{alert.message}</p>
        </div>
        {alert.showCheckout && empresa?.id ? (
          <Link
            href={checkoutHref}
            className="inline-flex shrink-0 items-center justify-center rounded-lg border border-current/30 bg-white/60 px-3 py-1.5 text-sm font-semibold transition hover:bg-white/90"
          >
            Renovar suscripción
          </Link>
        ) : null}
      </div>
    </div>
  );
}
