'use client';

import { useEffect, useState } from 'react';
import { posProxyPath } from '@/core/constants/api-path';

type Purpose = 'registro' | 'password_reset';

export function EmailVerificationCode({
  email,
  purpose,
  code,
  onCodeChange,
  disabled,
}: {
  email: string;
  purpose: Purpose;
  code: string;
  onCodeChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [hint, setHint] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [cooldown]);

  const send = async () => {
    setError('');
    setHint('');
    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Ingresa un correo válido antes de enviar el código.');
      return;
    }
    setSending(true);
    try {
      const res = await fetch(posProxyPath('public/otp/request'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed, purpose }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.status === 429 || String(json.error ?? '').includes('OTP_COOLDOWN')) {
        setError('Espera un minuto antes de pedir otro código.');
        setCooldown(60);
        return;
      }
      if (!res.ok) {
        setError('No se pudo enviar el código. Intenta de nuevo.');
        return;
      }
      setHint('Te enviamos un código de 6 dígitos. Revisa tu bandeja (caduca en 10 minutos).');
      setCooldown(60);
    } catch {
      setError('No se pudo conectar con el servidor.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end gap-2">
        <label className="min-w-[10rem] flex-1 text-sm font-medium text-brand-ink">
          Código de verificación *
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            className="mt-2 w-full rounded-lg border border-brand-linen bg-white px-4 py-2.5 tracking-[0.4em] text-center text-lg font-semibold text-brand-ink outline-none focus:border-brand-olive focus:ring-2 focus:ring-brand-olive/25"
            value={code}
            onChange={(e) => onCodeChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="••••••"
            disabled={disabled}
          />
        </label>
        <button
          type="button"
          onClick={() => void send()}
          disabled={disabled || sending || cooldown > 0}
          className="mb-0.5 rounded-lg border border-brand-olive/40 px-3 py-2.5 text-sm font-semibold text-brand-olive hover:bg-brand-olive/10 disabled:opacity-50"
        >
          {sending ? 'Enviando…' : cooldown > 0 ? `Reenviar (${cooldown}s)` : 'Enviar código'}
        </button>
      </div>
      {hint ? <p className="text-xs text-brand-ink-muted">{hint}</p> : null}
      {error ? <p className="text-xs text-red-700">{error}</p> : null}
    </div>
  );
}
