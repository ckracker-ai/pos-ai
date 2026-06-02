'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { useState } from 'react';
import { BranchSelector } from '@/components/molecules/BranchSelector';
import { PosAiLogo } from '@/components/atoms/PosAiLogo';

export function Navbar({ onToggleSidebar }: { onToggleSidebar?: () => void }) {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: 'Administrador',
      seller: 'Vendedor',
      auditor: 'Auditor',
      comanda: 'Comanda',
      user: 'Usuario',
    };
    return labels[role] || role;
  };

  return (
    <nav className="bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 gap-3">
          {/* Mobile toggle + Logo */}
          <div className="flex items-center">
            <button
              onClick={() => onToggleSidebar?.()}
              aria-label="Abrir menú"
              aria-controls="mobile-sidebar"
              className="mr-3 inline-flex items-center justify-center rounded-md p-2 text-brand-ink transition hover:bg-brand-surface focus:outline-none focus:ring-2 focus:ring-brand-olive/40 md:hidden"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <Link
              href="/dashboard"
              aria-label="POS-AI inicio"
              className="flex h-10 w-12 shrink-0 items-center justify-center overflow-hidden sm:h-11 sm:w-14"
            >
              <PosAiLogo height={64} width={58} />
            </Link>
          </div>

          <BranchSelector />

          <div className="flex items-center relative ml-2 sm:ml-4">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center space-x-2 rounded-md px-3 py-2 text-brand-ink transition hover:bg-brand-surface"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-olive font-semibold text-white">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <span className="hidden sm:inline-block">{user?.name}</span>
              <svg
                className={`w-4 h-4 transition transform ${isOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
              <div className="absolute right-0 top-16 mt-2 w-48 rounded-lg border border-brand-linen/60 bg-white py-1 shadow-lg">
                <div className="border-b border-brand-linen/40 px-4 py-2">
                  <p className="text-sm font-semibold text-brand-ink">{user?.name}</p>
                  <p className="text-xs text-brand-ink-muted">{getRoleLabel(user?.role || '')}</p>
                  <p className="text-xs text-brand-ink-muted">{user?.email}</p>
                </div>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    router.push('/manual');
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-brand-olive transition hover:bg-brand-surface"
                >
                  ❓ Ayuda y manual
                </button>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    handleLogout();
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 transition hover:bg-red-50"
                >
                  Cerrar Sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
