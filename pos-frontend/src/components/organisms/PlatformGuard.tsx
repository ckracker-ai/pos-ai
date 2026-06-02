'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { usePlatformAuthStore } from '@/core/context/platform-auth';

const PUBLIC = ['/platform/login'];

export function PlatformGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, hydrate } = usePlatformAuthStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    hydrate();
    setReady(true);
  }, [hydrate]);

  useEffect(() => {
    if (!ready) return;
    if (PUBLIC.includes(pathname)) return;
    if (!isAuthenticated) router.replace('/platform/login');
  }, [ready, isAuthenticated, pathname, router]);

  if (!ready) {
    return (
      <div className="app-surface-page flex min-h-screen items-center justify-center text-brand-ink-muted">
        Cargando...
      </div>
    );
  }

  if (!PUBLIC.includes(pathname) && !isAuthenticated) return null;

  return <>{children}</>;
}
