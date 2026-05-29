'use client';

import { Navbar } from '@/components/organisms/Navbar';
import { Dashboard } from '@/components/organisms/Dashboard';
import { SidebarMenu } from '@/components/organisms/SidebarMenu';
import { DashboardLayout } from '@/components/molecules/DashboardLayout';

export default function DashboardPage() {
  return (
    <DashboardLayout sidebar={<SidebarMenu />} header={<Navbar />}>
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
        <Dashboard />
      </div>
    </DashboardLayout>
  );
}
