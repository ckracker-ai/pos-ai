'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { canAccessPath } from '@/core/config/role-access';

/** Solo envuelve rutas en `app/(app)/*` — marketing y platform tienen layout propio. */
export function RouteGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, hydrate, user } = useAuthStore();
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    hydrate();
    setIsHydrated(true);
  }, [hydrate]);

  useEffect(() => {
    if (!isHydrated) return;

    if (!isAuthenticated) {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('auth-redirecting', '1');
      }
      router.replace('/login');
      return;
    }

    if (pathname && !canAccessPath(user?.role, pathname)) {
      router.push('/dashboard');
    }
  }, [isHydrated, isAuthenticated, pathname, router, user?.role]);

  if (!isHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-surface">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-brand-olive" />
          <p className="text-brand-ink-muted">Cargando...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
