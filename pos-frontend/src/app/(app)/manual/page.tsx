'use client';

import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/molecules/DashboardLayout';
import { AppPageHeader } from '@/components/molecules/AppPageHeader';
import { Navbar } from '@/components/organisms/Navbar';
import { SidebarMenu } from '@/components/organisms/SidebarMenu';
import { useAuthStore } from '@/store/auth';
import { APP_VERSION_LABEL } from '@/core/constants/version';
import { WSP_MENU_HELP_EXAMPLE } from '@/components/molecules/WspMenuHelpPanel';
import { getApiClient, unwrapApiData } from '@/core/api/api-client';
import { posProxyPath } from '@/core/constants/api-path';

type ManualRole = 'admin' | 'auditor' | 'seller' | 'comanda' | 'all';

type ManualSection = {
  id: string;
  title: string;
  hint: string;
  allowed: ManualRole[];
  bullets: string[];
};

const DEFAULT_SECTION_BY_ROLE: Record<string, string> = {
  admin: 'rol-admin',
  auditor: 'rol-auditor',
  seller: 'rol-seller',
  comanda: 'comandas',
  user: 'inicio',
};

function roleLabel(role: string | undefined): string {
  const labels: Record<string, string> = {
    admin: 'Administrador',
    auditor: 'Auditor',
    seller: 'Vendedor',
    comanda: 'Comanda',
    user: 'Usuario',
  };
  return labels[role ?? 'user'] ?? (role ?? 'Usuario');
}

export default function ManualPage() {
  const user = useAuthStore((s) => s.user);
  const currentRole = (user?.role ?? 'user') as ManualRole | 'user';
  const [sections, setSections] = useState<ManualSection[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string>('inicio');
  const [roleDefaultApplied, setRoleDefaultApplied] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const res = await getApiClient().get(posProxyPath('support/manual'));
        const data = unwrapApiData<{ sections?: ManualSection[] }>(res.data);
        setSections(Array.isArray(data?.sections) ? data.sections : []);
      } catch {
        setLoadError('No se pudo cargar el manual.');
      }
    })();
  }, []);

  const visibleSections = useMemo(() => sections, [sections]);

  useEffect(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash.replace(/^#/, '') : '';
    if (hash && visibleSections.some((s) => s.id === hash)) {
      setSelectedSectionId(hash);
      setRoleDefaultApplied(true);
      return;
    }
    if (roleDefaultApplied || currentRole === 'user' || visibleSections.length === 0) return;
    const defaultId = DEFAULT_SECTION_BY_ROLE[currentRole];
    if (defaultId && visibleSections.some((s) => s.id === defaultId)) {
      setSelectedSectionId(defaultId);
    }
    setRoleDefaultApplied(true);
  }, [currentRole, visibleSections, roleDefaultApplied]);

  useEffect(() => {
    if (!visibleSections.some((s) => s.id === selectedSectionId)) {
      setSelectedSectionId(visibleSections[0]?.id ?? 'inicio');
    }
  }, [visibleSections, selectedSectionId]);

  const selected =
    visibleSections.find((section) => section.id === selectedSectionId) ?? visibleSections[0];

  const pickSection = (id: string) => {
    setSelectedSectionId(id);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `/manual#${id}`);
    }
  };

  return (
    <DashboardLayout sidebar={<SidebarMenu />} header={<Navbar />}>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="app-card mb-6 rounded-3xl p-6">
          <AppPageHeader
            kicker="Centro de ayuda"
            title="Manual operativo por rol"
            description={
              <>
                Perfil activo: <span className="font-semibold text-brand-ink">{roleLabel(user?.role)}</span>.
                Solo ves secciones aplicables a tu rol. Versión: {APP_VERSION_LABEL}.
              </>
            }
          />
        </div>

        {loadError ? <p className="mb-4 text-sm text-red-700">{loadError}</p> : null}

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <aside className="app-card rounded-3xl p-4">
            <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-[0.2em] text-brand-ink-muted">
              Secciones ({visibleSections.length})
            </p>
            <div className="space-y-1">
              {visibleSections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => pickSection(section.id)}
                  className={`w-full rounded-xl px-3 py-2 text-left text-sm transition ${
                    selected?.id === section.id
                      ? 'bg-[rgba(74,83,60,0.12)] font-medium text-[#3D4532]'
                      : 'text-brand-ink-muted hover:bg-brand-surface/80'
                  }`}
                >
                  {section.title}
                </button>
              ))}
            </div>
          </aside>

          <section className="app-card rounded-3xl p-6 lg:col-span-2">
            {selected ? (
              <>
                <h2 className="text-xl font-semibold text-[#3D4532]">{selected.title}</h2>
                <p className="mt-1 text-sm text-brand-ink-muted">{selected.hint}</p>
                <ul className="mt-4 space-y-2">
                  {selected.bullets.map((item) => (
                    <li
                      key={item}
                      className="rounded-xl border border-[rgba(209,199,189,0.75)] bg-brand-surface/50 px-3 py-2 text-sm text-brand-ink"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
                {selected.id === 'wsp-menu-qr' ? (
                  <div className="mt-5 rounded-xl border border-brand-olive/20 bg-brand-olive/5 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-brand-olive">
                      Ejemplo práctico
                    </p>
                    <p className="mt-2 text-sm italic leading-relaxed text-brand-ink">
                      {WSP_MENU_HELP_EXAMPLE}
                    </p>
                  </div>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-brand-ink-muted">
                {loadError ? loadError : 'No hay secciones disponibles para este perfil.'}
              </p>
            )}
          </section>
        </div>
      </main>
    </DashboardLayout>
  );
}
