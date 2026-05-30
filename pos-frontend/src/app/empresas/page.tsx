'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/core/api/api-client';
import { extractEntity, normalizeEmpresa, unwrapApiEnvelope } from '@/core/api/normalizers';
import { Empresa, EmpresaEstado, UpdateEmpresaInput } from '@/core/interfaces';
import { DashboardLayout } from '@/components/molecules/DashboardLayout';
import { SidebarMenu } from '@/components/organisms/SidebarMenu';
import { Navbar } from '@/components/organisms/Navbar';
import { useAuthStore } from '@/core/context/auth';
import { getRoleProfile } from '@/core/config/role-access';
import { notifyApiError, notifySuccess } from '@/store/ui';

const ESTADO_LABELS: Record<EmpresaEstado, string> = {
  ACTIVO: 'Activa',
  SUSPENDIDO: 'Suspendida',
  PENDIENTE_ONBOARDING: 'Pendiente onboarding',
};

const ESTADO_STYLES: Record<EmpresaEstado, string> = {
  ACTIVO: 'bg-emerald-500/10 text-emerald-300',
  SUSPENDIDO: 'bg-rose-500/10 text-rose-300',
  PENDIENTE_ONBOARDING: 'bg-amber-500/10 text-amber-300',
};

type EmpresaForm = {
  razonSocial: string;
  nombreFantasia: string;
  giroSii: string;
  direccionComercial: string;
  correoFacturacion: string;
  urlLogo: string;
  slug: string;
};

const emptyForm = (): EmpresaForm => ({
  razonSocial: '',
  nombreFantasia: '',
  giroSii: '',
  direccionComercial: '',
  correoFacturacion: '',
  urlLogo: '',
  slug: '',
});

function empresaToForm(empresa: Empresa): EmpresaForm {
  return {
    razonSocial: empresa.razonSocial,
    nombreFantasia: empresa.nombreFantasia ?? '',
    giroSii: empresa.giroSii ?? '',
    direccionComercial: empresa.direccionComercial ?? '',
    correoFacturacion: empresa.correoFacturacion ?? '',
    urlLogo: empresa.urlLogo ?? '',
    slug: empresa.slug,
  };
}

function buildPatchPayload(form: EmpresaForm, original: Empresa): UpdateEmpresaInput {
  const payload: UpdateEmpresaInput = {};
  const trim = (v: string) => v.trim();

  if (trim(form.razonSocial) !== original.razonSocial) {
    payload.razonSocial = trim(form.razonSocial);
  }
  if (trim(form.nombreFantasia) !== (original.nombreFantasia ?? '')) {
    payload.nombreFantasia = trim(form.nombreFantasia) || null;
  }
  if (trim(form.giroSii) !== (original.giroSii ?? '')) {
    payload.giroSii = trim(form.giroSii) || null;
  }
  if (trim(form.direccionComercial) !== (original.direccionComercial ?? '')) {
    payload.direccionComercial = trim(form.direccionComercial) || null;
  }
  if (trim(form.correoFacturacion) !== (original.correoFacturacion ?? '')) {
    payload.correoFacturacion = trim(form.correoFacturacion) || null;
  }
  if (trim(form.urlLogo) !== (original.urlLogo ?? '')) {
    payload.urlLogo = trim(form.urlLogo) || null;
  }
  if (trim(form.slug) !== original.slug) {
    payload.slug = trim(form.slug);
  }

  return payload;
}

export default function EmpresasPage() {
  const currentUser = useAuthStore((state) => state.user);
  const canManageEmpresa = getRoleProfile(currentUser?.role).canManageEmpresa;

  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [form, setForm] = useState<EmpresaForm>(emptyForm());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const isDirty = useMemo(() => {
    if (!empresa) return false;
    return JSON.stringify(form) !== JSON.stringify(empresaToForm(empresa));
  }, [empresa, form]);

  const loadEmpresa = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await api.getEmpresaMe();
      const raw = extractEntity<Record<string, unknown>>(unwrapApiEnvelope(response.data), ['empresa']);
      if (!raw) throw new Error('EMPRESA_NOT_FOUND');
      const normalized = normalizeEmpresa(raw);
      setEmpresa(normalized);
      setForm(empresaToForm(normalized));
    } catch (error) {
      const { displayMessage } = notifyApiError('empresas.load', error, { toast: false });
      setErrorMessage(displayMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEmpresa();
  }, []);

  const handleFieldChange = (field: keyof EmpresaForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleReset = () => {
    if (empresa) setForm(empresaToForm(empresa));
  };

  const handleSave = async () => {
    if (!empresa || !canManageEmpresa) return;
    if (!form.razonSocial.trim()) {
      setErrorMessage('La razón social es obligatoria.');
      return;
    }

    const payload = buildPatchPayload(form, empresa);
    if (Object.keys(payload).length === 0) {
      notifySuccess('Sin cambios', 'No hay datos nuevos para guardar.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    try {
      const response = await api.updateEmpresa(empresa.id, payload);
      const raw = extractEntity<Record<string, unknown>>(unwrapApiEnvelope(response.data), ['empresa']);
      if (raw) {
        const normalized = normalizeEmpresa(raw);
        setEmpresa(normalized);
        setForm(empresaToForm(normalized));
      } else {
        await loadEmpresa();
      }
      notifySuccess('Empresa actualizada', 'Los datos comerciales se guardaron correctamente.');
    } catch (error) {
      const { displayMessage } = notifyApiError('empresas.save', error, { toast: true });
      setErrorMessage(displayMessage);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout sidebar={<SidebarMenu />} header={<Navbar />}>
      <div className="min-h-screen bg-gray-50 p-4 dark:bg-slate-950 md:p-8">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Perfil de empresa</h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Datos comerciales y de facturación de tu organización. El RUT y el estado los gestiona la
              plataforma.
            </p>
          </div>

          {errorMessage && (
            <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {errorMessage}
            </div>
          )}

          {!canManageEmpresa && (
            <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              Solo lectura: tu rol puede consultar el perfil pero no modificarlo.
            </div>
          )}

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            {isLoading ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Cargando perfil…</p>
            ) : empresa ? (
              <form
                className="space-y-5"
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleSave();
                }}
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
                      RUT
                    </label>
                    <input
                      type="text"
                      value={empresa.rutEmpresa}
                      readOnly
                      className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-300"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
                      Estado
                    </label>
                    <div className="flex h-[42px] items-center">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${ESTADO_STYLES[empresa.estado]}`}
                      >
                        {ESTADO_LABELS[empresa.estado]}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                    Razón social *
                  </label>
                  <input
                    type="text"
                    value={form.razonSocial}
                    onChange={(e) => handleFieldChange('razonSocial', e.target.value)}
                    readOnly={!canManageEmpresa}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                    Nombre fantasía
                  </label>
                  <input
                    type="text"
                    value={form.nombreFantasia}
                    onChange={(e) => handleFieldChange('nombreFantasia', e.target.value)}
                    readOnly={!canManageEmpresa}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                    Giro SII
                  </label>
                  <input
                    type="text"
                    value={form.giroSii}
                    onChange={(e) => handleFieldChange('giroSii', e.target.value)}
                    readOnly={!canManageEmpresa}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                    Dirección comercial
                  </label>
                  <input
                    type="text"
                    value={form.direccionComercial}
                    onChange={(e) => handleFieldChange('direccionComercial', e.target.value)}
                    readOnly={!canManageEmpresa}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                      Correo facturación
                    </label>
                    <input
                      type="email"
                      value={form.correoFacturacion}
                      onChange={(e) => handleFieldChange('correoFacturacion', e.target.value)}
                      readOnly={!canManageEmpresa}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                      Slug (URL interna)
                    </label>
                    <input
                      type="text"
                      value={form.slug}
                      onChange={(e) => handleFieldChange('slug', e.target.value)}
                      readOnly={!canManageEmpresa}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                    URL logo
                  </label>
                  <input
                    type="url"
                    value={form.urlLogo}
                    onChange={(e) => handleFieldChange('urlLogo', e.target.value)}
                    readOnly={!canManageEmpresa}
                    placeholder="https://…"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                {canManageEmpresa && (
                  <div className="flex flex-wrap gap-3 border-t border-gray-200 pt-5 dark:border-slate-800">
                    <button
                      type="submit"
                      disabled={isSaving || !isDirty}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isSaving ? 'Guardando…' : 'Guardar cambios'}
                    </button>
                    <button
                      type="button"
                      onClick={handleReset}
                      disabled={isSaving || !isDirty}
                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:text-gray-200 dark:hover:bg-slate-800"
                    >
                      Descartar
                    </button>
                  </div>
                )}
              </form>
            ) : (
              <p className="text-sm text-gray-500">No hay datos de empresa disponibles.</p>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
