'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth';

// Rutas públicas que no requieren autenticación
const PUBLIC_ROUTES = ['/login', '/'];
const COMANDA_ONLY_ROUTES = ['/comandas'];
const COMANDA_RESTRICTED_ROUTES = ['/pos', '/users', '/products', '/branches', '/suppliers', '/mermas', '/categories', '/reportes'];
const USER_MAINTENANCE_ROUTES = ['/users'];
const PRODUCT_MAINTENANCE_ROUTES = ['/products', '/suppliers', '/categories'];
const BRANCH_MAINTENANCE_ROUTES = ['/branches'];

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, hydrate, user } = useAuthStore();
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Hidratar el store desde localStorage
    hydrate();
    setIsHydrated(true);
  }, [hydrate]);

  useEffect(() => {
    if (!isHydrated) return;

    const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

    // Si es ruta pública, permitir acceso
    if (isPublicRoute) {
      return;
    }

    // Si no está autenticado y no es ruta pública, redirigir a login.
    // Para evitar bucles/redirects múltiples, usamos replace y además marcamos un flag temporal.
    if (!isAuthenticated) {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('auth-redirecting', '1');
      }
      router.replace('/login');
      return;
    }



    // Rol comanda: solo dashboard + comandas
    if (user?.role === 'comanda' && COMANDA_RESTRICTED_ROUTES.some((route) => pathname.startsWith(route))) {
      router.push('/dashboard');
      return;
    }
    if (user?.role !== 'comanda' && COMANDA_ONLY_ROUTES.some((route) => pathname.startsWith(route))) {
      // admin/auditor/seller también pueden ver comandas, los demás no
      if (!['admin', 'auditor', 'seller'].includes(user?.role || '')) {
        router.push('/dashboard');
        return;
      }
    }

    // Solo admin y auditor pueden acceder al mantenedor de usuarios
    if (!['admin', 'auditor'].includes(user?.role || '') && USER_MAINTENANCE_ROUTES.some((route) => pathname.startsWith(route))) {
      router.push('/dashboard');
      return;
    }

    // Solo admin y auditor pueden acceder a catálogo (productos/categorías/proveedores)
    if (!['admin', 'auditor'].includes(user?.role || '') && PRODUCT_MAINTENANCE_ROUTES.some((route) => pathname.startsWith(route))) {
      router.push('/dashboard');
      return;
    }

    // Solo admin y auditor pueden acceder a sucursales
    if (!['admin', 'auditor'].includes(user?.role || '') && BRANCH_MAINTENANCE_ROUTES.some((route) => pathname.startsWith(route))) {
      router.push('/dashboard');
      return;
    }
  }, [isHydrated, isAuthenticated, pathname, router, user]);

  // Mostrar loading mientras se hidrata
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
