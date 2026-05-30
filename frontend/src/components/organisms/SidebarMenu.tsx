'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import type { UserRole } from '@/core/interfaces';
import { APP_VERSION_LABEL } from '@/core/constants/version';
import {
  getCatalogModulesForRole,
  getNavSectionsForRole,
  getRoleLabel,
  resolveUserRole,
} from '@/core/config/role-access';

function NavIcon({ children }: { children: string }) {
  return (
    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center text-base leading-none" aria-hidden>
      {children}
    </span>
  );
}

function navButtonClass(isActive: boolean) {
  return `flex w-full min-h-[2.75rem] items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm transition ${
    isActive ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-300 hover:bg-slate-900/80'
  }`;
}

export function SidebarMenu({ onClose }: { onClose?: () => void } = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const currentRole = resolveUserRole(user?.role);

  const navSections = useMemo(() => getNavSectionsForRole(currentRole), [currentRole]);
  const catalogItems = useMemo(() => getCatalogModulesForRole(currentRole), [currentRole]);
  const isCatalogRoute = catalogItems.some((item) => pathname.startsWith(item.path));
  const [catalogOpen, setCatalogOpen] = useState(isCatalogRoute);

  useEffect(() => {
    if (isCatalogRoute) setCatalogOpen(true);
  }, [isCatalogRoute]);

  const navigate = (path: string) => {
    router.push(path);
    onClose?.();
  };

  if (!user) {
    return (
      <div className="flex h-full min-h-0 flex-col bg-slate-950 p-4 sm:p-5">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
          <p className="text-xs uppercase tracking-widest text-slate-500">Sesión</p>
          <p className="mt-3 text-sm font-semibold text-white">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-950 text-slate-100">
      <div className="flex-shrink-0 border-b border-slate-800/80 p-4 sm:p-5">
        <p className="text-xs uppercase tracking-widest text-slate-500">Sesión</p>
        <p className="mt-2 truncate text-sm font-semibold text-white">{user.name}</p>
        <p className="text-xs text-slate-400">{getRoleLabel(currentRole)}</p>
        <p className="mt-1 truncate text-xs text-slate-500">{user.email}</p>
      </div>

      <nav className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 sm:p-5 space-y-6">
        {navSections.map((group) => (
          <div key={group.id}>
            <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              {group.label}
            </p>
            <div className="space-y-1 rounded-2xl border border-slate-800/80 bg-slate-900/50 p-1.5">
              {group.catalogItems.length > 0 && (
                <div>
                  <button
                    type="button"
                    onClick={() => setCatalogOpen((open) => !open)}
                    className={`${navButtonClass(isCatalogRoute)} justify-between`}
                    aria-expanded={catalogOpen}
                  >
                    <span className="flex items-center gap-3">
                      <NavIcon>📚</NavIcon>
                      <span className="font-medium">Catálogo</span>
                    </span>
                    <span
                      className={`text-slate-400 transition-transform ${catalogOpen ? 'rotate-180' : ''}`}
                      aria-hidden
                    >
                      ▾
                    </span>
                  </button>
                  {catalogOpen && (
                    <div className="ml-3 mt-1 space-y-0.5 border-l border-slate-700/80 pl-2">
                      {group.catalogItems.map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => navigate(item.path)}
                          className={navButtonClass(pathname === item.path)}
                        >
                          <NavIcon>{item.icon}</NavIcon>
                          <span>{item.title}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {group.items.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => navigate(item.path)}
                  className={navButtonClass(pathname === item.path)}
                >
                  <NavIcon>{item.icon}</NavIcon>
                  <span className="font-medium">{item.title}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="flex-shrink-0 border-t border-slate-800/80 p-4 sm:p-5">
        <p className="text-[10px] uppercase tracking-widest text-slate-600">SVM ERP</p>
        <p className="mt-1 text-xs text-slate-500">{APP_VERSION_LABEL}</p>
      </div>
    </div>
  );
}
