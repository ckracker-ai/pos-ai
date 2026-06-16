'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/core/api/api-client';
import { extractEntity, normalizeEmpresa, unwrapApiEnvelope } from '@/core/api/normalizers';
import { Empresa, EmpresaEstado, UpdateEmpresaInput } from '@/core/interfaces';
import { formatPlanValor, getPlanDisplayName, METODO_PAGO_LABELS } from '@/core/constants/saas-plan';
import { AppPageContent } from '@/components/molecules/AppPageContent';
import { AppPageHeader } from '@/components/molecules/AppPageHeader';
import { DashboardLayout } from '@/components/molecules/DashboardLayout';
import { TabList } from '@/components/molecules/TabList';
import { SidebarMenu } from '@/components/organisms/SidebarMenu';
import { Navbar } from '@/components/organisms/Navbar';
import { useAuthStore } from '@/core/context/auth';
import { getRoleProfile } from '@/core/config/role-access';
import { notifyApiError, notifySuccess } from '@/store/ui';
import { EmpresaFormalizarPanel } from '@/components/molecules/EmpresaFormalizarPanel';
import { EmpresaPrivacidadPanel } from '@/components/molecules/EmpresaPrivacidadPanel';
import { WspTransferPreview } from '@/components/molecules/WspTransferPreview';

const ESTADO_LABELS: Record<EmpresaEstado, string> = {
  ACTIVO: 'Activa',
  SUSPENDIDO: 'Suspendida',
  PENDIENTE_ONBOARDING: 'Pendiente onboarding',
};

const ESTADO_STYLES: Record<EmpresaEstado, string> = {
  ACTIVO: 'bg-emerald-100 text-emerald-800',
  SUSPENDIDO: 'bg-rose-100 text-rose-800',
  PENDIENTE_ONBOARDING: 'bg-amber-100 text-amber-900',
};

const ACCOUNT_TYPES = ['Cuenta vista', 'Cuenta corriente', 'Cuenta RUT', 'Cuenta ahorro'] as const;

type EmpresaTab = 'general' | 'formalizar' | 'facturacion' | 'transferencia' | 'plan' | 'privacidad';

type EmpresaForm = {
  razonSocial: string;
  nombreFantasia: string;
  giroSii: string;
  direccionComercial: string;
  correoFacturacion: string;
  urlLogo: string;
  slug: string;
  transferBankName: string;
  transferAccountType: string;
  transferAccount: string;
  transferHolderName: string;
  transferRut: string;
};

const emptyForm = (): EmpresaForm => ({
  razonSocial: '',
  nombreFantasia: '',
  giroSii: '',
  direccionComercial: '',
  correoFacturacion: '',
  urlLogo: '',
  slug: '',
  transferBankName: '',
  transferAccountType: 'Cuenta vista',
  transferAccount: '',
  transferHolderName: '',
  transferRut: '',
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
    transferBankName: empresa.transferBankName ?? '',
    transferAccountType: empresa.transferAccountType ?? 'Cuenta vista',
    transferAccount: empresa.transferAccount ?? '',
    transferHolderName: empresa.transferHolderName ?? '',
    transferRut: empresa.transferRut ?? '',
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
  if (trim(form.transferBankName) !== (original.transferBankName ?? '')) {
    payload.transferBankName = trim(form.transferBankName) || null;
  }
  if (trim(form.transferAccountType) !== (original.transferAccountType ?? 'Cuenta vista')) {
    payload.transferAccountType = trim(form.transferAccountType) || null;
  }
  if (trim(form.transferAccount) !== (original.transferAccount ?? '')) {
    payload.transferAccount = trim(form.transferAccount) || null;
  }
  if (trim(form.transferHolderName) !== (original.transferHolderName ?? '')) {
    payload.transferHolderName = trim(form.transferHolderName) || null;
  }
  if (trim(form.transferRut) !== (original.transferRut ?? '')) {
    payload.transferRut = trim(form.transferRut) || null;
  }

  return payload;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="mb-1 block text-sm font-medium text-brand-ink">{children}</label>;
}

const inputClass =
  'w-full rounded-lg border border-brand-linen bg-white px-3 py-2 text-sm text-brand-ink outline-none focus:border-brand-olive focus:ring-2 focus:ring-brand-olive/20 read-only:bg-brand-vanilla/80 read-only:text-brand-ink-muted';

export default function EmpresasPage() {
  const currentUser = useAuthStore((state) => state.user);
  const canManageEmpresa = getRoleProfile(currentUser?.role).canManageEmpresa;

  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [form, setForm] = useState<EmpresaForm>(emptyForm());
  const [activeTab, setActiveTab] = useState<EmpresaTab>('general');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSensitiveTransfer, setShowSensitiveTransfer] = useState(false);

  const isDirty = useMemo(() => {
    if (!empresa) return false;
    return JSON.stringify(form) !== JSON.stringify(empresaToForm(empresa));
  }, [empresa, form]);

  const hasWhatsappPlan = empresa?.plan?.features?.assistantWhatsapp === true;
  const showFormalizarTab = empresa?.estadoTributario !== 'FORMAL';

  const empresaTabs = useMemo((): { id: EmpresaTab; label: string }[] => {
    const tabs: { id: EmpresaTab; label: string }[] = [
      { id: 'general', label: 'Datos generales' },
    ];
    if (showFormalizarTab) {
      tabs.push({ id: 'formalizar', label: 'Formalizar negocio' });
    }
    tabs.push(
      { id: 'facturacion', label: 'Facturación y marca' },
      { id: 'transferencia', label: 'Transferencia (IA)' },
      { id: 'plan', label: 'Plan y suscripción' }
    );
    if (canManageEmpresa) {
      tabs.push({ id: 'privacidad', label: 'Privacidad y datos' });
    }
    return tabs;
  }, [showFormalizarTab, canManageEmpresa]);

  const transferComplete = useMemo(() => {
    return (
      form.transferBankName.trim() &&
      form.transferAccount.trim() &&
      form.transferHolderName.trim() &&
      form.transferRut.trim()
    );
  }, [form]);

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
    setShowSensitiveTransfer(false);
  };

  const handleSave = async () => {
    if (!empresa || !canManageEmpresa) return;
    if (!form.razonSocial.trim()) {
      setErrorMessage('La razón social es obligatoria.');
      setActiveTab('general');
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
        setShowSensitiveTransfer(false);
      } else {
        await loadEmpresa();
      }
      notifySuccess('Empresa actualizada', 'Los datos se guardaron correctamente.');
    } catch (error) {
      const { displayMessage } = notifyApiError('empresas.save', error, { toast: true });
      setErrorMessage(displayMessage);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout sidebar={<SidebarMenu />} header={<Navbar />}>
      <AppPageContent narrow>
          <AppPageHeader
            title="Perfil de empresa"
            description="Organiza la información por sección. Los datos de transferencia alimentan al asistente IA para validar comprobantes de pago."
          />

          {errorMessage && (
            <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {errorMessage}
            </div>
          )}

          {!canManageEmpresa && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Solo lectura: tu rol puede consultar el perfil pero no modificarlo.
            </div>
          )}

          <div className="app-card rounded-xl">
            {isLoading ? (
              <p className="p-6 text-sm text-brand-ink-muted">Cargando perfil…</p>
            ) : empresa ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleSave();
                }}
              >
                <div className="border-b border-brand-linen/60 p-4 sm:p-6">
                  <TabList tabs={empresaTabs} active={activeTab} onChange={setActiveTab} />
                </div>

                <div className="space-y-6 p-4 sm:p-6">
                  {activeTab === 'general' && (
                    <>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <FieldLabel>RUT</FieldLabel>
                          <input
                            type="text"
                            value={
                              empresa.esNegocioEnMarcha
                                ? 'Sin RUT — negocio en marcha'
                                : empresa.rutEmpresa
                            }
                            readOnly
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <FieldLabel>Estado</FieldLabel>
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
                        <FieldLabel>Razón social *</FieldLabel>
                        <input
                          type="text"
                          value={form.razonSocial}
                          onChange={(e) => handleFieldChange('razonSocial', e.target.value)}
                          readOnly={!canManageEmpresa}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <FieldLabel>Nombre fantasía</FieldLabel>
                        <input
                          type="text"
                          value={form.nombreFantasia}
                          onChange={(e) => handleFieldChange('nombreFantasia', e.target.value)}
                          readOnly={!canManageEmpresa}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <FieldLabel>Giro SII</FieldLabel>
                        <input
                          type="text"
                          value={form.giroSii}
                          onChange={(e) => handleFieldChange('giroSii', e.target.value)}
                          readOnly={!canManageEmpresa}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <FieldLabel>Dirección comercial</FieldLabel>
                        <input
                          type="text"
                          value={form.direccionComercial}
                          onChange={(e) => handleFieldChange('direccionComercial', e.target.value)}
                          readOnly={!canManageEmpresa}
                          className={inputClass}
                        />
                      </div>
                    </>
                  )}

                  {activeTab === 'formalizar' && empresa && (
                    <EmpresaFormalizarPanel
                      empresa={empresa}
                      canManage={canManageEmpresa}
                      onUpdated={(next) => {
                        setEmpresa(next);
                        setForm(empresaToForm(next));
                        if (next.estadoTributario === 'FORMAL') {
                          setActiveTab('general');
                        }
                      }}
                    />
                  )}

                  {activeTab === 'facturacion' && (
                    <>
                      <div>
                        <FieldLabel>Correo facturación</FieldLabel>
                        <input
                          type="email"
                          value={form.correoFacturacion}
                          onChange={(e) => handleFieldChange('correoFacturacion', e.target.value)}
                          readOnly={!canManageEmpresa}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <FieldLabel>Slug (URL interna)</FieldLabel>
                        <input
                          type="text"
                          value={form.slug}
                          onChange={(e) => handleFieldChange('slug', e.target.value)}
                          readOnly={!canManageEmpresa}
                          className={inputClass}
                        />
                        <p className="mt-1 text-xs text-brand-ink-muted">
                          Identificador único de tu tenant. Lo gestiona tu equipo administrador.
                        </p>
                      </div>
                      <div>
                        <FieldLabel>URL logo</FieldLabel>
                        <input
                          type="url"
                          value={form.urlLogo}
                          onChange={(e) => handleFieldChange('urlLogo', e.target.value)}
                          readOnly={!canManageEmpresa}
                          placeholder="https://…"
                          className={inputClass}
                        />
                      </div>
                    </>
                  )}

                  {activeTab === 'transferencia' && (
                    <>
                      <div className="rounded-lg border border-brand-olive/25 bg-brand-olive/5 p-4">
                        <p className="text-sm font-medium text-brand-ink">Perfil para validación IA</p>
                        <p className="mt-1 text-xs text-brand-ink-muted">
                          Cuando un cliente envía un comprobante por WhatsApp, el asistente compara banco,
                          cuenta, titular y RUT contra estos datos. Mantén la información al día.
                        </p>
                        {!hasWhatsappPlan && (
                          <p className="mt-2 text-xs text-amber-800">
                            Tu plan actual no incluye asistente WhatsApp; puedes dejar los datos listos
                            para cuando actives Estándar o Full.
                          </p>
                        )}
                        {hasWhatsappPlan && !transferComplete && (
                          <p className="mt-2 text-xs text-amber-800">
                            Completa todos los campos para que la IA pueda validar comprobantes con
                            confianza.
                          </p>
                        )}
                        <div className="mt-3">
                          <button
                            type="button"
                            onClick={() => setShowSensitiveTransfer((v) => !v)}
                            className="rounded-md border border-brand-linen bg-white px-3 py-1.5 text-xs font-medium text-brand-ink hover:bg-brand-vanilla"
                          >
                            {showSensitiveTransfer ? 'Ocultar datos sensibles' : 'Ver datos sensibles'}
                          </button>
                        </div>
                        <p className="mt-2 text-xs text-brand-ink-muted">
                          Plataforma POS-AI edita los mismos campos en Empresas → canal WhatsApp.
                        </p>
                      </div>
                      <WspTransferPreview fields={form} className="mb-2" />
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <FieldLabel>Banco</FieldLabel>
                          <input
                            type="text"
                            value={form.transferBankName}
                            onChange={(e) => handleFieldChange('transferBankName', e.target.value)}
                            readOnly={!canManageEmpresa}
                            placeholder="BancoEstado, BCI, Santander…"
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <FieldLabel>Tipo de cuenta</FieldLabel>
                          <select
                            value={form.transferAccountType}
                            onChange={(e) => handleFieldChange('transferAccountType', e.target.value)}
                            disabled={!canManageEmpresa}
                            className={inputClass}
                          >
                            {ACCOUNT_TYPES.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <FieldLabel>Número de cuenta</FieldLabel>
                          <input
                            type={showSensitiveTransfer ? 'text' : 'password'}
                            value={form.transferAccount}
                            onChange={(e) => handleFieldChange('transferAccount', e.target.value)}
                            readOnly={!canManageEmpresa}
                            placeholder="12345678"
                            className={`${inputClass} font-mono`}
                          />
                        </div>
                        <div>
                          <FieldLabel>RUT titular</FieldLabel>
                          <input
                            type={showSensitiveTransfer ? 'text' : 'password'}
                            value={form.transferRut}
                            onChange={(e) => handleFieldChange('transferRut', e.target.value)}
                            readOnly={!canManageEmpresa}
                            placeholder="76.123.456-7"
                            className={`${inputClass} font-mono`}
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <FieldLabel>Titular de la cuenta</FieldLabel>
                          <input
                            type={showSensitiveTransfer ? 'text' : 'password'}
                            value={form.transferHolderName}
                            onChange={(e) => handleFieldChange('transferHolderName', e.target.value)}
                            readOnly={!canManageEmpresa}
                            placeholder="Razón social o nombre fantasía"
                            className={inputClass}
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {activeTab === 'privacidad' && empresa && canManageEmpresa && (
                    <EmpresaPrivacidadPanel empresaId={empresa.id} />
                  )}

                  {activeTab === 'plan' && (
                    <div className="rounded-lg border border-brand-olive/20 bg-brand-vanilla/50 p-5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-brand-olive">
                        Plan contratado
                      </p>
                      <p className="mt-2 text-xl font-bold text-brand-ink">
                        {empresa.plan ? getPlanDisplayName(empresa.plan) : '—'}
                      </p>
                      <p className="mt-2 text-sm text-brand-ink-muted">
                        {empresa.plan?.descripcion ?? 'Sin descripción'}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-4 text-sm text-brand-ink">
                        <span>
                          Valor:{' '}
                          <strong>
                            {empresa.plan?.valor != null ? formatPlanValor(empresa.plan.valor) : '—'}
                          </strong>
                        </span>
                        <span>
                          Pago:{' '}
                          <strong>
                            {empresa.plan?.metodoPago
                              ? METODO_PAGO_LABELS[empresa.plan.metodoPago]
                              : '—'}
                          </strong>
                        </span>
                        {hasWhatsappPlan && (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                            Asistente WhatsApp activo
                          </span>
                        )}
                      </div>
                      {empresa.suscripcion && (
                        <p className="mt-4 text-xs text-brand-ink-muted">
                          Suscripción: {empresa.suscripcion.estado ?? '—'}
                          {empresa.suscripcion.proximoCobroEn
                            ? ` · Próximo cobro ${empresa.suscripcion.proximoCobroEn}`
                            : ''}
                        </p>
                      )}
                      <p className="mt-4 text-xs text-brand-ink-muted">
                        Para cambiar de plan contacta a soporte POS-AI o usa el checkout de renovación
                        cuando esté disponible en tu cuenta.
                      </p>
                    </div>
                  )}
                </div>

                {canManageEmpresa && activeTab !== 'plan' && activeTab !== 'privacidad' && (
                  <div className="flex flex-wrap gap-3 border-t border-brand-linen/60 px-4 py-4 sm:px-6">
                    <button
                      type="submit"
                      disabled={isSaving || !isDirty}
                      className="app-btn-primary disabled:cursor-not-allowed"
                    >
                      {isSaving ? 'Guardando…' : 'Guardar cambios'}
                    </button>
                    <button
                      type="button"
                      onClick={handleReset}
                      disabled={isSaving || !isDirty}
                      className="app-btn-secondary disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Descartar
                    </button>
                  </div>
                )}
              </form>
            ) : (
              <p className="p-6 text-sm text-brand-ink-muted">No hay datos de empresa disponibles.</p>
            )}
          </div>
      </AppPageContent>
    </DashboardLayout>
  );
}
