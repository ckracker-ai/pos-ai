'use client';

import { usePathname } from 'next/navigation';
import { AppProviders } from '../AppProviders';
import { PlatformGuard } from '@/components/organisms/PlatformGuard';
import { PlatformShell } from '@/components/organisms/PlatformShell';

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === '/platform/login';

  return (
    <AppProviders>
      <PlatformGuard>
        {isLogin ? children : <PlatformShell>{children}</PlatformShell>}
      </PlatformGuard>
    </AppProviders>
  );
}
