'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { APP_VERSION_LABEL } from '@/core/constants/version';
import {
  getNavSectionsForRole,
  resolveUserRole,
  type NavCluster,
  type NavSection,
} from '@/core/config/role-access';
import { useTenantEmpresa } from '@/core/hooks/useTenantEmpresa';
import { NavGlyph } from '@/components/atoms/NavGlyph';

function navButtonClass(isActive: boolean) {
  return `flex w-full min-h-[2.75rem] items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm transition ${
    isActive ? 'app-sidebar-nav-active' : 'app-sidebar-nav-idle'
  }`;
}

function pathMatches(pathname: string, path: string) {
  return pathname === path || pathname.startsWith(`${path}/`);
}

function clusterIsActive(pathname: string, cluster: NavCluster) {
  return cluster.items.some((item) => pathMatches(pathname, item.path));
}

function NavRow({
  icon,
  label,
  active,
  onClick,
  trailing,
  expanded,
}: {
  icon: string;
  label: string;
  active: boolean;
  onClick: () => void;
  trailing?: ReactNode;
  expanded?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${navButtonClass(active)} justify-between`}
      aria-expanded={expanded}
    >
      <span className="flex min-w-0 items-center gap-3">
        <NavGlyph name={icon} />
        <span className="truncate font-medium">{label}</span>
      </span>
      {trailing}
    </button>
  );
}

export function SidebarMenu({ onClose }: { onClose?: () => void } = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const { empresa } = useTenantEmpresa();
  const currentRole = resolveUserRole(user?.role);
  const plan = empresa?.plan ?? null;

  const navSections = useMemo(
    () => getNavSectionsForRole(currentRole, plan, empresa?.rubroNegocio),
    [currentRole, plan, empresa?.rubroNegocio]
  );

  const [openClusters, setOpenClusters] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setOpenClusters((prev) => {
      const next = { ...prev };
      for (const section of navSections) {
        for (const cluster of section.clusters) {
          if (clusterIsActive(pathname, cluster)) next[cluster.id] = true;
        }
      }
      return next;
    });
  }, [pathname, navSections]);

  const navigate = (path: string) => {
    router.push(path);
    onClose?.();
  };

  const toggleCluster = (id: string) => {
    setOpenClusters((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const renderSection = (group: NavSection) => (
    <div key={group.id}>
      <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-linen/60">
        {group.label}
      </p>
      <div className="space-y-1 rounded-2xl border border-white/10 bg-black/10 p-1.5">
        {group.items.map((item) => (
          <NavRow
            key={item.key}
            icon={item.icon}
            label={item.title}
            active={pathMatches(pathname, item.path)}
            onClick={() => navigate(item.path)}
          />
        ))}
        {group.clusters.map((cluster) => {
          const open = Boolean(openClusters[cluster.id]);
          const active = clusterIsActive(pathname, cluster);
          return (
            <div key={cluster.id}>
              <NavRow
                icon={cluster.icon}
                label={cluster.label}
                active={active}
                expanded={open}
                onClick={() => toggleCluster(cluster.id)}
                trailing={
                  <span
                    className={`text-brand-linen/70 transition-transform ${open ? 'rotate-180' : ''}`}
                    aria-hidden
                  >
                    <NavGlyph name="chevron" className="h-4 w-4" />
                  </span>
                }
              />
              {open ? (
                <div className="ml-3 mt-1 space-y-0.5 border-l border-white/15 pl-2">
                  {cluster.items.map((item) => (
                    <NavRow
                      key={item.key}
                      icon={item.icon}
                      label={item.title}
                      active={pathMatches(pathname, item.path)}
                      onClick={() => navigate(item.path)}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );

  if (!user) {
    return (
      <div className="app-sidebar flex h-full min-h-0 flex-col p-4 sm:p-5">
        <p className="text-sm text-brand-linen/80">Cargando menú…</p>
      </div>
    );
  }

  return (
    <div className="app-sidebar flex h-full min-h-0 flex-col">
      <nav className="min-h-0 flex-1 space-y-6 overflow-y-auto overflow-x-hidden p-4 sm:p-5">
        {navSections.map(renderSection)}
      </nav>

      <div className="flex-shrink-0 border-t border-white/10 p-4 sm:p-5">
        <p className="text-[10px] uppercase tracking-widest text-brand-linen/50">POS-AI</p>
        <p className="mt-1 text-xs text-white/50">{APP_VERSION_LABEL}</p>
      </div>
    </div>
  );
}
