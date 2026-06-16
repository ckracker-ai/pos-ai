'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePlatformAuthStore } from '@/core/context/platform-auth';
import { PosAiLogo } from '@/components/atoms/PosAiLogo';
import { LoginShell } from '@/components/organisms/LoginShell';

export default function PlatformLoginPage() {
  const router = useRouter();
  const login = usePlatformAuthStore((s) => s.login);
  const isLoading = usePlatformAuthStore((s) => s.isLoading);
  const error = usePlatformAuthStore((s) => s.error);

  const [email, setEmail] = useState('platform@pos-ai.local');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await login({ email, password });
      router.replace('/platform/dashboard');
    } catch {
      // error in store
    }
  };

  const inputClass =
    'w-full rounded-lg border border-brand-linen bg-white px-3 py-2.5 text-brand-ink outline-none transition focus:border-brand-olive focus:ring-2 focus:ring-brand-olive/25';

  return (
    <LoginShell>
      <div className="w-full max-w-md">
        <div className="login-card rounded-2xl bg-white/95 p-8 backdrop-blur-sm">
          <div className="mb-6 flex flex-col items-center text-center">
            <PosAiLogo width={200} priority className="mb-3" />
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-olive">Plataforma</p>
            <h1 className="mt-2 font-serif text-xl font-semibold text-brand-ink">Consola super-admin</h1>
            <p className="mt-1 text-sm text-brand-ink-muted">Gestión de empresas tenant</p>
          </div>

          <p className="rounded-lg border border-brand-linen bg-brand-surface/80 px-3 py-2 text-xs text-brand-ink-muted">
            Dev: <strong className="text-brand-ink">platform@pos-ai.local</strong> /{' '}
            <strong className="text-brand-ink">PlatformAdmin2026!</strong>
            <br />
            (No uses este usuario en el login de sucursal /login)
          </p>

          {error && (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-brand-ink">Correo</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-brand-ink">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
                required
                autoComplete="current-password"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-lg bg-brand-olive py-2.5 text-sm font-semibold text-white transition hover:bg-[#3d4532] disabled:opacity-60"
            >
              {isLoading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-brand-ink-muted">
            <a href="/" className="font-medium text-brand-olive hover:underline">
              Volver al inicio
            </a>
            <span className="mx-2 text-brand-linen">·</span>
            <a href="/login" className="font-medium text-brand-olive hover:underline">
              Login tenant
            </a>
          </p>
        </div>
      </div>
    </LoginShell>
  );
}
