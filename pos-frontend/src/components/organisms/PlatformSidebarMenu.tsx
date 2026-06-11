'use client';

import { usePathname, useRouter } from 'next/navigation';
import { PosAiLogo } from '@/components/atoms/PosAiLogo';
import { APP_VERSION_LABEL } from '@/core/constants/version';
import { usePlatformAuthStore } from '@/core/context/platform-auth';

const NAV_ITEMS = [
  { href: '/platform/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/platform/empresas', label: 'Empresas', icon: '🏢' },
  { href: '/platform/whatsapp', label: 'Simular WSP', icon: '💬' },
  { href: '/platform/voice', label: 'Simular voz', icon: '🎙️' },
] as const;

function navButtonClass(isActive: boolean) {
  return `flex w-full min-h-[2.75rem] items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm transition ${
    isActive ? 'app-sidebar-nav-active' : 'app-sidebar-nav-idle'
  }`;
}

export function PlatformSidebarMenu({ onClose }: { onClose?: () => void } = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const platformUser = usePlatformAuthStore((s) => s.user);

  const navigate = (path: string) => {
    router.push(path);
    onClose?.();
  };

  return (
    <div className="app-sidebar flex h-full min-h-0 flex-col">
      <div className="flex-shrink-0 border-b border-white/10 p-4 sm:p-5">
        <div className="mb-3 flex h-10 items-center">
          <PosAiLogo height={40} width={56} className="brightness-0 invert opacity-95" />
        </div>
        <p className="text-xs uppercase tracking-widest text-brand-linen/80">Plataforma</p>
        <p className="mt-2 truncate text-sm font-semibold text-white">
          {platformUser?.name ?? 'Super-admin'}
        </p>
        <p className="mt-1 truncate text-xs text-white/55">{platformUser?.email}</p>
      </div>

      <nav className="min-h-0 flex-1 space-y-6 overflow-y-auto overflow-x-hidden p-4 sm:p-5">
        <div>
          <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-linen/60">
            Operación
          </p>
          <div className="space-y-1 rounded-2xl border border-white/10 bg-black/10 p-1.5">
            {NAV_ITEMS.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => navigate(item.href)}
                  className={navButtonClass(isActive)}
                >
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center text-base leading-none">
                    {item.icon}
                  </span>
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      <div className="flex-shrink-0 border-t border-white/10 p-4 text-center text-[10px] text-brand-linen/70">
        POS-AI {APP_VERSION_LABEL}
      </div>
    </div>
  );
}
