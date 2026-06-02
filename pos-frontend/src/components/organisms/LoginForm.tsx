'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { LoginRequest } from '@/core/interfaces';
import { PosAiLogo } from '@/components/atoms/PosAiLogo';

export function LoginForm() {
  const router = useRouter();
  const { login, isLoading, error, clearError } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    clearError();

    if (!email || !password) {
      setLocalError('Por favor completa todos los campos');
      return;
    }

    try {
      await login({ email, password } as LoginRequest);
      router.push('/dashboard');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setLocalError(err.message);
      } else {
        setLocalError('Error al iniciar sesión.');
      }
    }
  };

  const inputClass =
    'mt-2 w-full rounded-lg border border-brand-linen bg-white px-4 py-2.5 text-brand-ink placeholder-brand-ink-muted/60 outline-none transition focus:border-brand-olive focus:ring-2 focus:ring-brand-olive/25';

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="login-card rounded-2xl bg-white/95 p-8 backdrop-blur-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <PosAiLogo width={220} priority className="mb-4" />
          <p className="text-sm text-brand-ink-muted">Punto de venta Inteligente</p>
          <p className="mt-1 text-xs text-brand-ink-muted/80">Ingresa a tu cuenta</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {(error || localError) && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error || localError}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-brand-ink">
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              className={inputClass}
              disabled={isLoading}
              autoComplete="email"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-brand-ink">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={inputClass}
              disabled={isLoading}
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-brand-olive py-2.5 px-4 font-semibold text-white transition hover:bg-[#3d4532] disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-brand-olive/40 focus:ring-offset-2"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="h-5 w-5 animate-spin text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Iniciando sesión...
              </span>
            ) : (
              'Iniciar sesión'
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-brand-ink-muted">
          <a href="/" className="font-medium text-brand-olive underline-offset-2 hover:underline">
            Volver al inicio
          </a>
          <span className="mx-2 text-brand-linen">·</span>
          <a
            href="/platform/login"
            className="font-medium text-brand-olive underline-offset-2 hover:underline"
          >
            Acceso plataforma
          </a>
          <br />
          <span className="mt-2 inline-block text-xs">Tenant demo: admin@empanadascostaazul.cl</span>
        </p>
      </div>
    </div>
  );
}
