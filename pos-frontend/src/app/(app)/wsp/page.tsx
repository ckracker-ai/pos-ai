'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { api } from '@/core/api/api-client';
import { unwrapApiEnvelope } from '@/core/api/normalizers';
import { useBranchStore } from '@/store/branch';
import { AppPageContent } from '@/components/molecules/AppPageContent';
import { AppPageHeader } from '@/components/molecules/AppPageHeader';
import { DashboardLayout } from '@/components/molecules/DashboardLayout';
import { SidebarMenu } from '@/components/organisms/SidebarMenu';
import { Navbar } from '@/components/organisms/Navbar';
import { notifyApiError, notifySuccess } from '@/store/ui';
import { WspMenuHelpPanel } from '@/components/molecules/WspMenuHelpPanel';

function downloadQrPng(dataUrl: string, slug: string) {
  const anchor = document.createElement('a');
  anchor.href = dataUrl;
  anchor.download = `menu-qr-${slug || 'sucursal'}.png`;
  anchor.click();
}

type MenuProduct = {
  id: string;
  productId: string;
  name: string;
  description: string | null;
  price: number;
  isFeatured: boolean;
};

type MenuCategory = {
  id: string;
  name: string;
  description: string | null;
  products: MenuProduct[];
};

type VirtualMenu = {
  id: string;
  branchId: string;
  branchName: string;
  title: string;
  subtitle: string | null;
  publicSlug: string;
  isEnabled: boolean;
  categories: MenuCategory[];
};

type MenuQr = {
  publicUrl: string;
  publicSlug: string;
  qrDataUrl: string;
};

export default function WspMenuPage() {
  const branchId = useBranchStore((s) => s.selectedBranchId);
  const branchName = useBranchStore((s) => s.activeBranchLabel);

  const [menu, setMenu] = useState<VirtualMenu | null>(null);
  const [qr, setQr] = useState<MenuQr | null>(null);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [isEnabled, setIsEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const loadMenu = useCallback(async () => {
    if (!branchId) return;
    setLoading(true);
    try {
      const res = await api.getWspMenu(branchId);
      const data = unwrapApiEnvelope(res) as { menu?: VirtualMenu; qr?: MenuQr };
      const nextMenu = data.menu ?? null;
      setMenu(nextMenu);
      setQr(data.qr ?? null);
      if (nextMenu) {
        setTitle(nextMenu.title);
        setSubtitle(nextMenu.subtitle ?? '');
        setIsEnabled(nextMenu.isEnabled);
      }
    } catch (e) {
      notifyApiError('wsp.menu.load', e);
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    void loadMenu();
  }, [loadMenu]);

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    if (!branchId) return;
    setSaving(true);
    try {
      const res = await api.updateWspMenu(branchId, {
        title: title.trim() || undefined,
        subtitle: subtitle.trim() || null,
        isEnabled,
      });
      const data = unwrapApiEnvelope(res) as { menu?: VirtualMenu; qr?: MenuQr };
      setMenu(data.menu ?? null);
      setQr(data.qr ?? null);
      notifySuccess(isEnabled ? 'Menú virtual activado' : 'Configuración guardada');
    } catch (e) {
      notifyApiError('wsp.menu.save', e);
    } finally {
      setSaving(false);
    }
  };

  const handleSync = async () => {
    if (!branchId) return;
    setSyncing(true);
    try {
      const res = await api.syncWspMenuCatalog(branchId);
      const data = unwrapApiEnvelope(res) as { menu?: VirtualMenu; qr?: MenuQr };
      setMenu(data.menu ?? null);
      setQr(data.qr ?? null);
      notifySuccess('Menú sincronizado desde tu catálogo');
    } catch (e) {
      notifyApiError('wsp.menu.sync', e);
    } finally {
      setSyncing(false);
    }
  };

  const productCount =
    menu?.categories.reduce((acc, cat) => acc + (cat.products?.length ?? 0), 0) ?? 0;

  return (
    <DashboardLayout sidebar={<SidebarMenu />} header={<Navbar />}>
      <AppPageContent>
        <AppPageHeader
          title="WhatsApp y menú QR"
          description="Publica una carta móvil por sucursal. Tus clientes escanean el código y ven tus platos al instante."
          meta={
            branchName ? (
              <span>
                Sucursal activa: <strong>{branchName}</strong>
              </span>
            ) : (
              <span className="text-amber-800">Selecciona una sucursal en la barra superior para configurar el menú.</span>
            )
          }
        />

        <WspMenuHelpPanel />

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="app-card rounded-2xl p-6">
            <h2 className="text-base font-semibold text-brand-ink">Configuración del menú</h2>
            <p className="mt-1 text-sm text-brand-ink-muted">
              Primero sincroniza tu catálogo, luego activa el menú y comparte el QR en mesas o vitrina.
            </p>

            {loading ? (
              <p className="mt-6 text-sm text-brand-ink-muted">Cargando menú…</p>
            ) : (
              <form onSubmit={handleSave} className="mt-5 space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-brand-ink-muted">Título del menú</label>
                  <input
                    className="app-input"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Menú Costa Azul"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-brand-ink-muted">Subtítulo</label>
                  <input
                    className="app-input"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    placeholder="Comida casera y empanadas"
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-brand-ink">
                  <input
                    type="checkbox"
                    checked={isEnabled}
                    onChange={(e) => setIsEnabled(e.target.checked)}
                    className="h-4 w-4 rounded border-brand-linen text-brand-olive focus:ring-brand-olive/30"
                  />
                  Menú virtual activo (visible al escanear el QR)
                </label>

                <div className="flex flex-wrap gap-2 pt-2">
                  <button type="submit" className="app-btn-primary" disabled={saving || !branchId}>
                    {saving ? 'Guardando…' : 'Guardar'}
                  </button>
                  <button
                    type="button"
                    className="app-btn-secondary"
                    onClick={() => void handleSync()}
                    disabled={syncing || !branchId}
                  >
                    {syncing ? 'Sincronizando…' : 'Sincronizar desde catálogo'}
                  </button>
                </div>
              </form>
            )}

            {menu ? (
              <div className="mt-6 rounded-xl border border-brand-linen/80 bg-brand-vainilla/40 p-4 text-sm text-brand-ink-muted">
                <p>
                  <span className="font-medium text-brand-ink">{productCount}</span> platos en{' '}
                  <span className="font-medium text-brand-ink">{menu.categories.length}</span> categorías.
                </p>
                {menu.categories.length > 0 ? (
                  <ul className="mt-3 space-y-2">
                    {menu.categories.map((cat) => (
                      <li key={cat.id} className="rounded-lg border border-brand-linen/60 bg-white px-3 py-2">
                        <span className="font-medium text-brand-ink">{cat.name}</span>
                        <span className="text-brand-ink-muted"> · {cat.products.length} platos</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2">Aún no hay categorías. Usa «Sincronizar desde catálogo».</p>
                )}
              </div>
            ) : null}
          </section>

          <section className="app-card rounded-2xl p-6">
            <h2 className="text-base font-semibold text-brand-ink">Código QR de tu sucursal</h2>
            <p className="mt-1 text-sm text-brand-ink-muted">
              Imprímelo en A5 o muéstralo en pantalla. Cada sucursal tiene su propio enlace.
            </p>

            {qr ? (
              <div className="mt-5 flex flex-col items-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qr.qrDataUrl}
                  alt="Código QR menú virtual"
                  className="h-56 w-56 rounded-xl border border-brand-linen bg-white p-3 shadow-sm"
                />
                <p className="mt-4 break-all text-center font-mono text-xs text-brand-olive">{qr.publicUrl}</p>
                <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    className="app-btn-secondary text-sm"
                    onClick={() => downloadQrPng(qr.qrDataUrl, qr.publicSlug)}
                  >
                    Descargar QR (PNG)
                  </button>
                  <a
                    href={qr.publicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-brand-olive hover:underline"
                  >
                    Abrir menú en el celular →
                  </a>
                </div>
              </div>
            ) : (
              <p className="mt-6 text-sm text-brand-ink-muted">
                Guarda la configuración para generar el QR automáticamente.
              </p>
            )}
          </section>
        </div>
      </AppPageContent>
    </DashboardLayout>
  );
}
