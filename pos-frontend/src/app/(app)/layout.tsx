'use client';

import { AppProviders } from '../AppProviders';
import { RouteGuard } from '@/components/organisms/RouteGuard';

/** ERP tenant — requiere sesión. Marketing (`/`, `/registro`) no usa este layout. */
export default function TenantAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProviders>
      <RouteGuard>{children}</RouteGuard>
    </AppProviders>
  );
}
