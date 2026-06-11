'use client';

import { DashboardLayout } from '@/components/molecules/DashboardLayout';
import { AppPageContent } from '@/components/molecules/AppPageContent';
import { PlatformNavbar } from '@/components/organisms/PlatformNavbar';
import { PlatformSidebarMenu } from '@/components/organisms/PlatformSidebarMenu';

type PlatformShellProps = {
  children: React.ReactNode;
};

/** Layout de consola plataforma — mismo shell visual que el ERP tenant. */
export function PlatformShell({ children }: PlatformShellProps) {
  return (
    <DashboardLayout
      sidebar={<PlatformSidebarMenu />}
      header={<PlatformNavbar />}
      hideBranchBar
    >
      <AppPageContent>{children}</AppPageContent>
    </DashboardLayout>
  );
}
