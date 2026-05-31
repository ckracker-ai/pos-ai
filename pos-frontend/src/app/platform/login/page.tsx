'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePlatformAuthStore } from '@/core/context/platform-auth';

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
      router.replace('/platform/empresas');
    } catch {
      // error in store
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
        <h1 className="text-xl font-bold text-white">POS-AI Plataforma</h1>
        <p className="mt-1 text-sm text-slate-400">Super-admin — gestion de empresas tenant</p>
        <p className="mt-3 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-xs text-indigo-200">
          Dev: <strong>platform@pos-ai.local</strong> / <strong>PlatformAdmin2026!</strong>
          <br />
          (No uses este usuario en el login de sucursal /login)
        </p>

        {error && (
          <p className="mt-4 rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm text-slate-300">Correo</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-300">Contrasena</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white"
              required
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {isLoading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-500">
          <a href="/login" className="text-indigo-400 hover:underline">
            Login tenant (sucursal / POS)
          </a>
        </p>
      </div>
    </div>
  );
}
