'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { canRenewSubscription } from '@/core/config/plan-access';
import { buildEmpresaSetupSteps, empresaSetupProgress } from '@/core/config/empresa-setup';
import { notifyEmpresaUpdated } from '@/core/hooks/useTenantEmpresa';
import { RUBRO_PACKS, getRubroPack, isRubroPackSelected } from '@/core/config/rubro-packs';
import { getRubroAiPack, suggestRubroFromBusinessText } from '@/core/pos/rubro-ai';
import { useBranchStore } from '@/store/branch';
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
  rubroNegocio: string;
  aiBusinessDescription: string;
  aiSynonymLines: string;
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
  rubroNegocio: '',
  aiBusinessDescription: '',
  aiSynonymLines: '',
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
    rubroNegocio: empresa.rubroNegocio ?? '',
    aiBusinessDescription: empresa.aiGlossary?.businessDescription ?? '',
    aiSynonymLines: (empresa.aiGlossary?.synonyms ?? []).map((s) => `${s.from} = ${s.to}`).join('\n'),
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
  if (trim(form.rubroNegocio) !== (original.rubroNegocio ?? '')) {
    payload.rubroNegocio = trim(form.rubroNegocio) || null;
  }
  const nextGlossary = {
    businessDescription: trim(form.aiBusinessDescription),
    synonyms: form.aiSynonymLines
      .split('\n')
      .map((line) => line.split('=').map((p) => p.trim()))
      .filter((parts) => parts.length >= 2 && parts[0] && parts[1])
      .map((parts) => ({ from: parts[0], to: parts.slice(1).join(' = ') })),
  };
  const prevG = original.aiGlossary ?? { businessDescription: '', synonyms: [] };
  const glossaryChanged =
    nextGlossary.businessDescription !== (prevG.businessDescription ?? '') ||
    JSON.stringify(nextGlossary.synonyms) !== JSON.stringify(prevG.synonyms ?? []);
  if (glossaryChanged) {
    payload.aiGlossary = nextGlossary;
  }

  return payload;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="mb-1 block text-sm font-medium text-brand-ink">{children}</label>;
}

const inputClass =
  'w-full rounded-lg border border-brand-linen bg-white px-3 py-2 text-sm text-brand-ink outline-none focus:border-brand-olive focus:ring-2 focus:ring-brand-olive/20 read-only:bg-brand-vanilla/80 read-only:text-brand-ink-muted';

export default function EmpresasPage() {
  const router = useRouter();
  const currentUser = useAuthStore((state) => state.user);
  const canManageEmpresa = getRoleProfile(currentUser?.role).canManageEmpresa;
  const branchId = useBranchStore((s) => s.selectedBranchId);

  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [form, setForm] = useState<EmpresaForm>(emptyForm());
  const [activeTab, setActiveTab] = useState<EmpresaTab>('general');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [wspMenuEnabled, setWspMenuEnabled] = useState<boolean | null>(null);
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

  const setupSteps = useMemo(
    () => (empresa ? buildEmpresaSetupSteps(empresa, { wspMenuEnabled }) : []),
    [empresa, wspMenuEnabled]
  );
  const setupProgress = empresaSetupProgress(setupSteps);

  const openSetupStep = (tab: EmpresaTab, href?: string) => {
    if (href) {
      router.push(href);
      return;
    }
    const nextTab = tab === 'formalizar' && !showFormalizarTab ? 'general' : tab;
    setActiveTab(nextTab);
    setShowAdvanced(true);
  };

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
      const whatsapp = normalized.plan?.features?.assistantWhatsapp === true;
      if (whatsapp && branchId) {
        try {
          const menuRes = await api.getWspMenu(branchId);
          const menuData = unwrapApiEnvelope(menuRes.data ?? menuRes) as {
            menu?: { isEnabled?: boolean };
          };
          setWspMenuEnabled(menuData.menu?.isEnabled === true);
        } catch {
          setWspMenuEnabled(false);
        }
      } else {
        setWspMenuEnabled(null);
      }
    } catch (error) {
      const { displayMessage } = notifyApiError('empresas.load', error, { toast: false });
      setErrorMessage(displayMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEmpresa();
  }, [branchId]);

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
      notifyEmpresaUpdated();
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
            description="Completa la guía para operar: datos, transferencia y plan. La edición por pestañas queda para ajustes finos."
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
                {setupSteps.length > 0 ? (
                  <div className="border-b border-brand-linen/60 p-4 sm:p-6">
                    <p className="text-xs font-semibold uppercase tracking-wide text-brand-olive">
                      Listo para operar
                    </p>
                    <p className="mt-1 text-sm text-brand-ink">
                      {setupProgress.done} de {setupProgress.total} pasos completos
                    </p>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-brand-linen/50">
                      <div
                        className="h-full rounded-full bg-brand-olive"
                        style={{
                          width: `${Math.round((setupProgress.done / Math.max(setupProgress.total, 1)) * 100)}%`,
                        }}
                      />
                    </div>
                    <ul className="mt-4 space-y-2">
                      {setupSteps.map((step) => (
                        <li key={step.id}>
                          <button
                            type="button"
                            onClick={() => openSetupStep(step.tab, step.href)}
                            className="flex w-full items-start gap-3 rounded-xl border border-brand-linen/70 bg-white px-3 py-3 text-left hover:border-brand-olive/40"
                          >
                            <span
                              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                                step.done
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-brand-surface text-brand-ink-muted'
                              }`}
                            >
                              {step.done ? 'OK' : ''}
                            </span>
                            <span>
                              <span className="block text-sm font-semibold text-brand-ink">{step.title}</span>
                              <span className="mt-0.5 block text-xs text-brand-ink-muted">{step.hint}</span>
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      onClick={() => setShowAdvanced((v) => !v)}
                      className="mt-4 text-sm font-medium text-brand-olive underline-offset-2 hover:underline"
                    >
                      {showAdvanced ? 'Ocultar edición avanzada' : 'Edición avanzada (pestañas)'}
                    </button>
                  </div>
                ) : null}

                {showAdvanced ? (
                  <>
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
                        <FieldLabel>Tipo de negocio (rubro)</FieldLabel>
                        <p className="mb-3 text-sm text-brand-ink-muted">
                          Condiciona cocina, envíos y caja (código de barras / granel). Costa Azul y locales de
                          comida quedan en gastronomía. Café, pub y bar = gastronomía; mueblería ≈ ferretería.
                        </p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {RUBRO_PACKS.map((pack) => {
                            const selected = getRubroPack(form.rubroNegocio).codigo === pack.codigo &&
                              isRubroPackSelected(form.rubroNegocio);
                            const fallbackGastro =
                              !isRubroPackSelected(form.rubroNegocio) && pack.codigo === 'GASTRONOMIA';
                            const active = selected || fallbackGastro;
                            return (
                              <button
                                key={pack.codigo}
                                type="button"
                                disabled={!canManageEmpresa}
                                onClick={() => handleFieldChange('rubroNegocio', pack.codigo)}
                                className={`rounded-2xl border px-3 py-3 text-left text-sm ${
                                  active
                                    ? 'border-brand-olive bg-brand-olive/10 text-brand-ink'
                                    : 'border-brand-linen bg-white text-brand-ink'
                                }`}
                              >
                                <span className="font-semibold">{pack.label}</span>
                                <span className="mt-1 block text-xs text-brand-ink-muted">{pack.hint}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div>
                        <FieldLabel>Cómo describes tu negocio (IA)</FieldLabel>
                        <p className="mb-2 text-sm text-brand-ink-muted">
                          El pack de rubro trae un diccionario. Aquí puedes decir «tengo un café» o agregar
                          sinónimos propios (una línea: <span className="font-mono">cortado = cafe</span>).
                        </p>
                        <textarea
                          value={form.aiBusinessDescription}
                          onChange={(e) => handleFieldChange('aiBusinessDescription', e.target.value)}
                          readOnly={!canManageEmpresa}
                          rows={2}
                          className={inputClass}
                          placeholder="Ej: café de barrio; mueblería con despacho de living"
                        />
                        {canManageEmpresa ? (
                          <button
                            type="button"
                            className="mt-2 text-sm text-brand-olive underline"
                            onClick={() => {
                              const suggested = suggestRubroFromBusinessText(form.aiBusinessDescription);
                              if (suggested) handleFieldChange('rubroNegocio', suggested);
                            }}
                          >
                            Sugerir pack según la descripción
                          </button>
                        ) : null}
                        <p className="mt-3 text-xs font-semibold text-brand-ink">
                          Prompt del pack: {getRubroAiPack(form.rubroNegocio).promptHint}
                        </p>
                        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-brand-ink-muted">
                          Sinónimos del tenant (encima del pack)
                        </p>
                        <textarea
                          value={form.aiSynonymLines}
                          onChange={(e) => handleFieldChange('aiSynonymLines', e.target.value)}
                          readOnly={!canManageEmpresa}
                          rows={4}
                          className={inputClass}
                          placeholder={'living = sofa\ncortado = cafe'}
                        />
                        <p className="mt-3 text-xs text-brand-ink-muted">
                          Frases de prueba del pack:{' '}
                          {getRubroAiPack(form.rubroNegocio).utterances.join(' · ')}
                        </p>
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
                          <span className="text-brand-ink-muted"> / mes + IVA</span>
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
                        <div className="mt-4 space-y-1 text-sm text-brand-ink">
                          <p>
                            Estado suscripción:{' '}
                            <strong>{empresa.suscripcion.estado ?? '—'}</strong>
                          </p>
                          {empresa.suscripcion.proximoCobroEn ? (
                            <p className="text-brand-ink-muted">
                              Próximo cobro: {empresa.suscripcion.proximoCobroEn}
                            </p>
                          ) : null}
                          {empresa.suscripcion.graceHasta ? (
                            <p className="text-amber-800">
                              Gracia hasta: {empresa.suscripcion.graceHasta}
                            </p>
                          ) : null}
                        </div>
                      )}
                      {canRenewSubscription(empresa) && empresa.id ? (
                        <div className="mt-5">
                          <Link
                            href={`/checkout?empresaId=${encodeURIComponent(empresa.id)}`}
                            className="inline-flex items-center rounded-lg bg-brand-olive px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-olive/90"
                          >
                            Renovar suscripción
                          </Link>
                        </div>
                      ) : (
                        <p className="mt-4 text-xs text-brand-ink-muted">
                          Para cambiar de plan contacta a soporte POS-AI.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {canManageEmpresa &&
                  showAdvanced &&
                  activeTab !== 'plan' &&
                  activeTab !== 'privacidad' && (
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
                  </>
                ) : null}
              </form>
            ) : (
              <p className="p-6 text-sm text-brand-ink-muted">No hay datos de empresa disponibles.</p>
            )}
          </div>
      </AppPageContent>
    </DashboardLayout>
  );
}
