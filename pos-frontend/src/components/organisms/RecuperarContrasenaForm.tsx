'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PosAiLogo } from '@/components/atoms/PosAiLogo';
import { EmailVerificationCode } from '@/components/molecules/EmailVerificationCode';
import { posProxyPath } from '@/core/constants/api-path';

export function RecuperarContrasenaForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Ingresa un correo válido.');
      return;
    }
    if (!/^\d{6}$/.test(code)) {
      setError('Ingresa el código de 6 dígitos que te enviamos.');
      return;
    }
    if (password.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(posProxyPath('public/password/reset'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed, code, password }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) {
        const raw = String(json.error ?? '');
        if (raw.includes('EMAIL_OTP')) {
          setError('El código no es válido o ya expiró. Solicita uno nuevo.');
          return;
        }
        setError('No se pudo restablecer la contraseña. Revisa el código e inténtalo de nuevo.');
        return;
      }
      router.push('/login?reset=1');
    } catch {
      setError('No se pudo conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'mt-2 w-full rounded-lg border border-brand-linen bg-white px-4 py-2.5 text-brand-ink outline-none focus:border-brand-olive focus:ring-2 focus:ring-brand-olive/25';

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="login-card rounded-2xl bg-white/95 p-8 backdrop-blur-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <PosAiLogo width={200} priority className="mb-3" />
          <h1 className="font-serif text-xl font-semibold text-brand-ink">Recuperar contraseña</h1>
          <p className="mt-2 text-sm text-brand-ink-muted">
            Te enviamos un código de 6 dígitos al correo de tu cuenta. Caduca en 10 minutos.
          </p>
        </div>

        {error ? (
          <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm font-medium text-brand-ink">
            Correo electrónico
            <input
              type="email"
              className={inputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </label>

          <EmailVerificationCode
            email={email}
            purpose="password_reset"
            code={code}
            onCodeChange={setCode}
            disabled={loading}
          />

          <label className="block text-sm font-medium text-brand-ink">
            Nueva contraseña
            <input
              type="password"
              className={inputClass}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              autoComplete="new-password"
              required
            />
          </label>
          <label className="block text-sm font-medium text-brand-ink">
            Confirmar contraseña
            <input
              type="password"
              className={inputClass}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              minLength={8}
              autoComplete="new-password"
              required
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-brand-olive py-2.5 text-sm font-semibold text-white hover:bg-[#3d4532] disabled:opacity-60"
          >
            {loading ? 'Guardando…' : 'Restablecer contraseña'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-brand-ink-muted">
          <Link href="/login" className="font-medium text-brand-olive hover:underline">
            Volver al inicio de sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
