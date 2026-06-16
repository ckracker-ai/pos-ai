'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { readSupportSessionFromToken } from '@/core/context/auth';
import { useAuthStore } from '@/store/auth';

function formatExpiry(date: Date): string {
  return date.toLocaleString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return 'expirada';
  const totalMin = Math.ceil(ms / 60_000);
  if (totalMin < 60) return `${totalMin} min`;
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  return mins > 0 ? `${hours} h ${mins} min` : `${hours} h`;
}

export function SupportSessionBanner() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const logout = useAuthStore((s) => s.logout);
  const userEmail = useAuthStore((s) => s.user?.email);
  const [now, setNow] = useState(() => Date.now());

  const session = useMemo(() => readSupportSessionFromToken(token), [token]);

  useEffect(() => {
    if (!session.active) return;
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, [session.active]);

  if (!session.active) return null;

  const email = session.email ?? userEmail ?? 'administrador';
  const remaining =
    session.expiresAt != null ? formatRemaining(session.expiresAt.getTime() - now) : null;
  const expiryLabel =
    session.expiresAt != null ? formatExpiry(session.expiresAt) : '2 horas';

  const handleEndSession = () => {
    logout();
    router.replace('/login');
  };

  return (
    <div
      role="status"
      className="border-b border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-950 sm:px-6"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p>
          <span className="font-semibold">Sesión de soporte POS-AI.</span>{' '}
          Estás operando en este tenant como{' '}
          <span className="font-medium text-amber-900">{email}</span>
          {remaining ? (
            <>
              {' '}
              · expira en <span className="font-medium">{remaining}</span> ({expiryLabel})
            </>
          ) : (
            <> · válida hasta {expiryLabel}</>
          )}
          . Las acciones quedan registradas como soporte de plataforma.
        </p>
        <button
          type="button"
          onClick={handleEndSession}
          className="shrink-0 self-start rounded-lg border border-amber-700 bg-white px-3 py-1.5 text-xs font-semibold text-amber-950 transition hover:bg-amber-100 sm:self-center"
        >
          Cerrar sesión de soporte
        </button>
      </div>
    </div>
  );
}
