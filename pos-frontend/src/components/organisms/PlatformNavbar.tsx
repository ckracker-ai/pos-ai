'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { PosAiLogo } from '@/components/atoms/PosAiLogo';
import { usePlatformAuthStore } from '@/core/context/platform-auth';

export function PlatformNavbar({ onToggleSidebar }: { onToggleSidebar?: () => void }) {
  const router = useRouter();
  const platformUser = usePlatformAuthStore((s) => s.user);
  const logout = usePlatformAuthStore((s) => s.logout);
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.replace('/platform/login');
  };

  return (
    <nav className="bg-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => onToggleSidebar?.()}
            aria-label="Abrir menú"
            aria-controls="mobile-sidebar"
            className="mr-3 inline-flex items-center justify-center rounded-md p-2 text-brand-ink transition hover:bg-brand-surface focus:outline-none focus:ring-2 focus:ring-brand-olive/40 md:hidden"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <Link
            href="/platform/dashboard"
            aria-label="POS-AI plataforma"
            className="flex h-10 w-12 shrink-0 items-center justify-center overflow-hidden sm:h-11 sm:w-14"
          >
            <PosAiLogo height={64} width={58} />
          </Link>
          <span className="ml-2 hidden text-sm font-medium text-brand-ink-muted sm:inline">
            Consola plataforma
          </span>
        </div>

        <div className="relative flex items-center">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-brand-ink transition hover:bg-brand-surface"
          >
            <span className="hidden max-w-[12rem] truncate sm:inline">
              {platformUser?.email ?? 'Super-admin'}
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-olive text-xs font-semibold text-white">
              {(platformUser?.email?.[0] ?? 'P').toUpperCase()}
            </span>
          </button>
          {isOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} aria-hidden />
              <div className="absolute right-0 top-full z-20 mt-2 w-56 rounded-xl border border-brand-linen bg-white py-1 shadow-lg">
                <p className="border-b border-brand-linen/60 px-4 py-2 text-xs text-brand-ink-muted">
                  Super-administrador
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    handleLogout();
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-rose-700 hover:bg-rose-50"
                >
                  Cerrar sesión
                </button>
                <Link
                  href="/"
                  onClick={() => setIsOpen(false)}
                  className="block px-4 py-2 text-sm text-brand-ink hover:bg-brand-surface"
                >
                  Sitio público
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
