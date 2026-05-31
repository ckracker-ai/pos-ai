'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { platformFetch, usePlatformAuthStore } from '@/core/context/platform-auth';
import { Empresa, EmpresaEstado } from '@/core/interfaces';
import { normalizeEmpresa, unwrapApiEnvelope } from '@/core/api/normalizers';

const ESTADO_LABELS: Record<EmpresaEstado, string> = {
  ACTIVO: 'Activa',
  SUSPENDIDO: 'Suspendida',
  PENDIENTE_ONBOARDING: 'Pendiente',
};

const ESTADO_STYLES: Record<EmpresaEstado, string> = {
  ACTIVO: 'bg-emerald-500/10 text-emerald-300',
  SUSPENDIDO: 'bg-rose-500/10 text-rose-300',
  PENDIENTE_ONBOARDING: 'bg-amber-500/10 text-amber-300',
};

type ApiEnvelope<T> = { success: boolean; data: T; error: string | null; code: number };

export default function PlatformEmpresasPage() {
  const router = useRouter();
  const logout = usePlatformAuthStore((s) => s.logout);
  const platformUser = usePlatformAuthStore((s) => s.user);

  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    rut: '',
    razonSocial: '',
    nombreFantasia: '',
    branchName: 'Sucursal Central',
    adminEmail: '',
    adminPassword: '',
    adminFullName: '',
  });

  const loadEmpresas = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await platformFetch<ApiEnvelope<{ empresas: Record<string, unknown>[] }>>(
        'platform/empresas'
      );
      const data = unwrapApiEnvelope(res) as { empresas?: Record<string, unknown>[] };
      const rows = Array.isArray(data?.empresas) ? data.empresas : [];
      setEmpresas(rows.map((r) => normalizeEmpresa(r)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar empresas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEmpresas();
  }, [loadEmpresas]);

  const handleSuspend = async (id: string) => {
    if (!confirm('Suspender esta empresa? Los usuarios no podran iniciar sesion.')) return;
    try {
      await platformFetch(`platform/empresas/${id}/suspend`, { method: 'POST', body: '{}' });
      await loadEmpresas();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error');
    }
  };

  const handleActivate = async (id: string) => {
    try {
      await platformFetch(`platform/empresas/${id}/activate`, { method: 'POST', body: '{}' });
      await loadEmpresas();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error');
    }
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body: Record<string, string> = {
        rut: form.rut.trim(),
        razonSocial: form.razonSocial.trim(),
        nombreFantasia: form.nombreFantasia.trim() || form.razonSocial.trim(),
        branchName: form.branchName.trim() || 'Sucursal Central',
      };
      if (form.adminEmail.trim()) {
        body.adminEmail = form.adminEmail.trim();
        body.adminPassword = form.adminPassword;
        body.adminFullName = form.adminFullName.trim() || 'Administrador';
      }
      await platformFetch('platform/empresas', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      setShowCreate(false);
      setForm({
        rut: '',
        razonSocial: '',
        nombreFantasia: '',
        branchName: 'Sucursal Central',
        adminEmail: '',
        adminPassword: '',
        adminFullName: '',
      });
      await loadEmpresas();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al crear empresa');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900 px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">Plataforma POS-AI</h1>
            <p className="text-xs text-slate-400">{platformUser?.email}</p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium hover:bg-indigo-700"
            >
              Nueva empresa
            </button>
            <button
              type="button"
              onClick={() => {
                logout();
                router.replace('/platform/login');
              }}
              className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm hover:bg-slate-800"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {error && (
          <p className="mb-4 rounded-lg bg-rose-500/10 px-4 py-2 text-sm text-rose-200">{error}</p>
        )}

        {loading ? (
          <p className="text-slate-400">Cargando empresas...</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-900 text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-3">Empresa</th>
                  <th className="px-4 py-3">RUT</th>
                  <th className="px-4 py-3">Slug</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {empresas.map((e) => (
                  <tr key={e.id} className="border-t border-slate-800">
                    <td className="px-4 py-3">
                      <div className="font-medium">{e.nombreFantasia ?? e.razonSocial}</div>
                      <div className="text-xs text-slate-500">{e.razonSocial}</div>
                    </td>
                    <td className="px-4 py-3">{e.rutEmpresa}</td>
                    <td className="px-4 py-3">{e.slug}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${ESTADO_STYLES[e.estado]}`}
                      >
                        {ESTADO_LABELS[e.estado]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {e.estado === 'ACTIVO' ? (
                        <button
                          type="button"
                          onClick={() => handleSuspend(e.id)}
                          className="text-rose-400 hover:underline"
                        >
                          Suspender
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleActivate(e.id)}
                          className="text-emerald-400 hover:underline"
                        >
                          Activar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {empresas.length === 0 && (
              <p className="px-4 py-8 text-center text-slate-500">No hay empresas registradas.</p>
            )}
          </div>
        )}
      </main>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-6">
            <h2 className="text-lg font-bold">Alta de empresa (tenant)</h2>
            <form onSubmit={handleCreate} className="mt-4 space-y-3">
              <input
                placeholder="RUT (ej. 76.123.456-7)"
                value={form.rut}
                onChange={(ev) => setForm({ ...form, rut: ev.target.value })}
                className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
                required
              />
              <input
                placeholder="Razon social *"
                value={form.razonSocial}
                onChange={(ev) => setForm({ ...form, razonSocial: ev.target.value })}
                className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
                required
              />
              <input
                placeholder="Nombre fantasia"
                value={form.nombreFantasia}
                onChange={(ev) => setForm({ ...form, nombreFantasia: ev.target.value })}
                className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
              />
              <input
                placeholder="Nombre sucursal central"
                value={form.branchName}
                onChange={(ev) => setForm({ ...form, branchName: ev.target.value })}
                className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
              />
              <hr className="border-slate-700" />
              <p className="text-xs text-slate-400">Admin inicial (opcional — deja ACTIVO)</p>
              <input
                placeholder="Email admin"
                type="email"
                value={form.adminEmail}
                onChange={(ev) => setForm({ ...form, adminEmail: ev.target.value })}
                className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
              />
              <input
                placeholder="Password admin (min 8)"
                type="password"
                value={form.adminPassword}
                onChange={(ev) => setForm({ ...form, adminPassword: ev.target.value })}
                className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="rounded border border-slate-600 px-3 py-1.5 text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded bg-indigo-600 px-3 py-1.5 text-sm font-medium disabled:opacity-50"
                >
                  {saving ? 'Creando...' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
