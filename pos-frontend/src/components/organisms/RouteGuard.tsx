'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { canAccessPath } from '@/core/config/role-access';

const PUBLIC_ROUTES = ['/login'];

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

    if (pathname.startsWith('/platform')) return;

    if (PUBLIC_ROUTES.includes(pathname)) return;

    if (!isAuthenticated) {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('auth-redirecting', '1');
      }
      router.replace('/login');
      return;
    }

    if (!canAccessPath(user?.role, pathname)) {
      router.push('/dashboard');
    }
  }, [isHydrated, isAuthenticated, pathname, router, user?.role]);

  if (!isHydrated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-slate-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Cargando...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
