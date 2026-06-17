// Layout molecules for dashboard structure
'use client';

import React, { ReactNode, useState, useEffect, useRef } from 'react';
import { useBranchStore } from '@/store/branch';
import { ActiveBranchBar } from '@/components/molecules/ActiveBranchBar';
import { SupportSessionBanner } from '@/components/molecules/SupportSessionBanner';
import { TenantSubscriptionBanner } from '@/components/molecules/TenantSubscriptionBanner';

interface DashboardLayoutProps {
  children: ReactNode;
  sidebar?: ReactNode;
  header?: ReactNode;
  /** Consola plataforma: no hay sucursal tenant activa */
  hideBranchBar?: boolean;
}

export function DashboardLayout({
  children,
  sidebar,
  header,
  hideBranchBar = false,
}: DashboardLayoutProps) {
  const branchId = useBranchStore((s) => s.selectedBranchId);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen((v) => !v);
  const closeSidebar = () => setIsSidebarOpen(false);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (isSidebarOpen) {
      closeButtonRef.current?.focus();
    }
  }, [isSidebarOpen]);

  // If header is a valid React element, inject `onToggleSidebar` so Navbar
  // can open the mobile drawer.
  let headerNode: ReactNode = header;
  if (header && React.isValidElement(header)) {
    headerNode = React.cloneElement(header as React.ReactElement, { onToggleSidebar: toggleSidebar });
  }
  return (
    <div className="flex h-screen bg-background">
      {sidebar && (
        <aside className="app-sidebar hidden md:flex md:w-72 md:flex-shrink-0 overflow-hidden border-r border-brand-linen/30">
          <div className="h-full w-full min-h-0">{sidebar}</div>
        </aside>
      )}

      {/* Mobile drawer overlay (always rendered to allow smooth transitions) */}
      {sidebar && (
        <div
          id="mobile-sidebar"
          className={`fixed inset-0 z-40 md:hidden ${isSidebarOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
          aria-hidden={!isSidebarOpen}
          style={{ visibility: isSidebarOpen ? 'visible' : 'hidden' }}
        >
          <div
            className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0'}`}
            onClick={closeSidebar}
          />
          <div
            className={`app-sidebar absolute left-0 top-0 bottom-0 flex w-[min(100%,20rem)] flex-col shadow-xl transform transition-transform duration-300 ${
              isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            <div className="flex flex-shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
              <div className="text-base font-semibold text-brand-linen">Menú</div>
              <button
                ref={closeButtonRef}
                onClick={closeSidebar}
                aria-label="Cerrar menú"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-brand-linen hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-brand-linen/50"
              >
                ✕
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">
              {React.isValidElement(sidebar)
                ? React.cloneElement(sidebar as React.ReactElement, { onClose: closeSidebar })
                : sidebar}
            </div>
          </div>
        </div>
      )}
      <div className="flex-1 flex flex-col overflow-hidden">
        {header && (
          <header className="border-b border-brand-linen/60 bg-white shadow-sm">
            {headerNode}
            {!hideBranchBar ? <SupportSessionBanner /> : null}
            {!hideBranchBar ? <TenantSubscriptionBanner /> : null}
            {!hideBranchBar ? <ActiveBranchBar /> : null}
          </header>
        )}
        <main key={branchId} className="app-surface-page flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

interface CardProps {
  children: ReactNode;
  className?: string;
  header?: ReactNode;
}

export function Card({ children, className = '', header }: CardProps) {
  return (
    <div className={`rounded-lg border border-border bg-card p-6 ${className}`}>
      {header && (
        <div className="mb-4 border-b border-border pb-4">
          {header}
        </div>
      )}
      {children}
    </div>
  );
}
