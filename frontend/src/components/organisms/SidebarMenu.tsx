'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import type { UserRole } from '@/core/interfaces';

type NavItem = {
  label: string;
  path: string;
  icon: string;
  allowed: UserRole[];
};

type CatalogItem = {
  label: string;
  path: string;
  icon: string;
};

const catalogItems: CatalogItem[] = [
  { label: 'Productos', path: '/products', icon: '📦' },
  { label: 'Proveedores', path: '/suppliers', icon: '🚚' },
  { label: 'Categorías', path: '/categories', icon: '🏷️' },
];

const catalogAllowed: UserRole[] = ['admin', 'auditor'];

const navigationGroups: Array<{
  section: string;
  items: NavItem[];
}> = [
  {
    section: 'Navegación',
    items: [
      { label: 'Dashboard', path: '/dashboard', icon: '🏠', allowed: ['admin', 'auditor', 'seller', 'comanda'] },
      { label: 'Punto de Venta', path: '/pos', icon: '🛒', allowed: ['admin', 'auditor', 'seller'] },
      { label: 'Comandas', path: '/comandas', icon: '👨‍🍳', allowed: ['admin', 'auditor', 'seller', 'comanda'] },
      { label: 'Reportes', path: '/reportes', icon: '📈', allowed: ['admin', 'auditor', 'seller'] },
      { label: 'Ayuda', path: '/manual', icon: '❓', allowed: ['admin', 'auditor', 'seller', 'comanda', 'user'] },
    ],
  },
  {
    section: 'Mantenedores',
    items: [
      { label: 'Usuarios', path: '/users', icon: '👥', allowed: ['admin', 'auditor'] },
      { label: 'Mermas', path: '/mermas', icon: '🧾', allowed: ['admin', 'auditor', 'seller'] },
      { label: 'Sucursales', path: '/branches', icon: '🏪', allowed: ['admin', 'auditor'] },
    ],
  },
];

const roleLabels: Record<string, string> = {
  admin: 'Administrador',
  seller: 'Vendedor',
  auditor: 'Auditor',
  comanda: 'Comanda',
  user: 'Usuario',
};

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
  const currentRole = (user?.role || 'user') as UserRole;

  const showCatalog = catalogAllowed.includes(currentRole);
  const isCatalogRoute = catalogItems.some((item) => pathname.startsWith(item.path));
  const [catalogOpen, setCatalogOpen] = useState(isCatalogRoute);

  useEffect(() => {
    if (isCatalogRoute) setCatalogOpen(true);
  }, [isCatalogRoute]);

  const visibleCatalogItems = useMemo(
    () => (showCatalog ? catalogItems : []),
    [showCatalog]
  );

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
        <p className="text-xs text-slate-400">{roleLabels[currentRole]}</p>
        <p className="mt-1 truncate text-xs text-slate-500">{user.email}</p>
      </div>

      <nav className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 sm:p-5 space-y-6">
        {navigationGroups.map((group) => {
          const visibleItems = group.items.filter((item) => item.allowed.includes(currentRole));
          const showCatalogInGroup = group.section === 'Mantenedores' && visibleCatalogItems.length > 0;

          if (visibleItems.length === 0 && !showCatalogInGroup) return null;

          return (
            <div key={group.section}>
              <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                {group.section}
              </p>
              <div className="space-y-1 rounded-2xl border border-slate-800/80 bg-slate-900/50 p-1.5">
                {group.section === 'Mantenedores' && showCatalogInGroup && (
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
                        {visibleCatalogItems.map((item) => {
                          const isActive = pathname === item.path;
                          return (
                            <button
                              key={item.path}
                              type="button"
                              onClick={() => navigate(item.path)}
                              className={navButtonClass(isActive)}
                            >
                              <NavIcon>{item.icon}</NavIcon>
                              <span>{item.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {visibleItems.map((item) => {
                  const isActive = pathname === item.path;
                  return (
                    <button
                      key={`${item.path}-${item.label}`}
                      type="button"
                      onClick={() => navigate(item.path)}
                      className={navButtonClass(isActive)}
                    >
                      <NavIcon>{item.icon}</NavIcon>
                      <span className="font-medium">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>
    </div>
  );
}
