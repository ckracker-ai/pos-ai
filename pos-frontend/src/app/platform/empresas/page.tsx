'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { platformFetch } from '@/core/context/platform-auth';
import { PlatformPageHeader } from '@/components/molecules/PlatformPageHeader';
import { Empresa, EmpresaEstado, SaasMetodoPago, SaasPlan, SaasPlanCodigo } from '@/core/interfaces';
import { normalizeEmpresa, normalizeSaasPlan, unwrapApiEnvelope } from '@/core/api/normalizers';
import {
  formatPlanValor,
  getPlanDisplayName,
  METODO_PAGO_LABELS,
  PLAN_DISPLAY_NAMES,
} from '@/core/constants/saas-plan';

const ESTADO_LABELS: Record<EmpresaEstado, string> = {
  ACTIVO: 'Activa',
  SUSPENDIDO: 'Suspendida',
  PENDIENTE_ONBOARDING: 'Pendiente',
};

const ESTADO_STYLES: Record<EmpresaEstado, string> = {
  ACTIVO: 'bg-emerald-100 text-emerald-800',
  SUSPENDIDO: 'bg-rose-100 text-rose-800',
  PENDIENTE_ONBOARDING: 'bg-amber-100 text-amber-900',
};

const SUB_ESTADO_STYLES: Record<string, string> = {
  PILOTO: 'bg-sky-100 text-sky-800',
  ACTIVA: 'bg-emerald-100 text-emerald-800',
  GRACIA: 'bg-amber-100 text-amber-900',
  VENCIDA: 'bg-rose-100 text-rose-800',
  CANCELADA: 'bg-slate-200 text-slate-600',
};

function formatSubDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('es-CL');
  } catch {
    return '—';
  }
}

type ApiEnvelope<T> = { success: boolean; data: T; error: string | null; code: number };

type AssistantBindingRow = {
  id: string;
  empresaId: string;
  channel: string;
  externalId: string;
};

export default function PlatformEmpresasPage() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [planes, setPlanes] = useState<SaasPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SaasPlan | null>(null);
  const [planForm, setPlanForm] = useState({
    descripcion: '',
    valor: 0,
    metodoPago: 'TRANSFERENCIA' as SaasMetodoPago,
    activo: true,
  });
  const [savingPlan, setSavingPlan] = useState(false);
  const [wspBindings, setWspBindings] = useState<Record<string, string>>({});
  const [wspEmpresaId, setWspEmpresaId] = useState('');
  const [wspPhone, setWspPhone] = useState('');
  const [wspAdminPhone, setWspAdminPhone] = useState('');
  const [transferBankName, setTransferBankName] = useState('');
  const [transferAccountType, setTransferAccountType] = useState('Cuenta vista');
  const [transferAccount, setTransferAccount] = useState('');
  const [transferHolderName, setTransferHolderName] = useState('');
  const [transferRut, setTransferRut] = useState('');
  const [savingWsp, setSavingWsp] = useState(false);
  const wspFormEmpresaRef = useRef<string>('');

  const [form, setForm] = useState({
    rut: '',
    razonSocial: '',
    nombreFantasia: '',
    branchName: 'Sucursal Central',
    adminEmail: '',
    adminPassword: '',
    adminFullName: '',
    planCodigo: 'BASICO' as SaasPlanCodigo,
  });

  const loadPlanes = useCallback(async () => {
    try {
      const res = await platformFetch<ApiEnvelope<{ planes: Record<string, unknown>[] }>>(
        'platform/planes/catalog'
      );
      const data = unwrapApiEnvelope(res) as { planes?: Record<string, unknown>[] };
      const rows = Array.isArray(data?.planes) ? data.planes : [];
      setPlanes(rows.map((r) => normalizeSaasPlan(r)));
    } catch {
      setPlanes([]);
    }
  }, []);

  const planesActivos = planes.filter((p) => p.activo);

  const openEditPlan = (plan: SaasPlan) => {
    setEditingPlan(plan);
    setPlanForm({
      descripcion: plan.descripcion ?? '',
      valor: plan.valor,
      metodoPago: plan.metodoPago,
      activo: plan.activo,
    });
  };

  const handleSavePlan = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;
    setSavingPlan(true);
    try {
      await platformFetch(`platform/planes/${editingPlan.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          descripcion: planForm.descripcion.trim() || null,
          valor: planForm.valor,
          metodoPago: planForm.metodoPago,
          activo: planForm.activo,
        }),
      });
      setEditingPlan(null);
      await loadPlanes();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al guardar plan');
    } finally {
      setSavingPlan(false);
    }
  };

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

  const loadWspBindings = useCallback(async () => {
    try {
      const res = await platformFetch<ApiEnvelope<{ bindings: AssistantBindingRow[] }>>(
        'platform/empresas/assistant-bindings'
      );
      const data = unwrapApiEnvelope(res) as { bindings?: AssistantBindingRow[] };
      const map: Record<string, string> = {};
      for (const b of data.bindings ?? []) {
        if (b.channel === 'WHATSAPP') map[b.empresaId] = b.externalId;
      }
      setWspBindings(map);
    } catch {
      setWspBindings({});
    }
  }, []);

  useEffect(() => {
    void loadPlanes();
    loadEmpresas();
    void loadWspBindings();
  }, [loadEmpresas, loadPlanes, loadWspBindings]);

  /** Solo al cambiar de empresa en el select — no pisar el teléfono mientras escribes. */
  useEffect(() => {
    if (!wspEmpresaId) {
      wspFormEmpresaRef.current = '';
      setWspPhone('');
      setWspAdminPhone('');
      setTransferBankName('');
      setTransferAccountType('Cuenta vista');
      setTransferAccount('');
      setTransferHolderName('');
      setTransferRut('');
      return;
    }
    if (wspFormEmpresaRef.current === wspEmpresaId) return;
    wspFormEmpresaRef.current = wspEmpresaId;

    const e = empresas.find((row) => row.id === wspEmpresaId);
    setWspPhone(wspBindings[wspEmpresaId] ?? '');
    if (!e) return;
    setWspAdminPhone(e.assistantAdminPhone?.replace(/\D/g, '') ?? '');
    setTransferBankName(e.transferBankName ?? '');
    setTransferAccountType(e.transferAccountType ?? 'Cuenta vista');
    setTransferAccount(e.transferAccount ?? '');
    setTransferHolderName(e.transferHolderName ?? e.nombreFantasia ?? e.razonSocial ?? '');
    setTransferRut(e.transferRut ?? e.rutEmpresa ?? '');
  }, [wspEmpresaId, empresas, wspBindings]);

  const handleSaveWsp = async (e: FormEvent) => {
    e.preventDefault();
    const clientPhone = wspPhone.replace(/\D/g, '');
    if (!wspEmpresaId || clientPhone.length < 8) {
      alert('Selecciona empresa y teléfono cliente válido (mín. 8 dígitos)');
      return;
    }
    const empresa = empresas.find((row) => row.id === wspEmpresaId);
    const adminPhone = wspAdminPhone.replace(/\D/g, '') || null;
    const transferPayload = {
      transferBankName: transferBankName.trim() || null,
      transferAccountType: transferAccountType.trim() || null,
      transferAccount: transferAccount.trim() || null,
      transferHolderName: transferHolderName.trim() || null,
      transferRut: transferRut.trim() || null,
    };
    const empresaPatch: Record<string, string | null> = {};
    if (adminPhone !== (empresa?.assistantAdminPhone?.replace(/\D/g, '') || null)) {
      empresaPatch.assistantAdminPhone = adminPhone;
    }
    if (transferPayload.transferBankName !== (empresa?.transferBankName?.trim() || null)) {
      empresaPatch.transferBankName = transferPayload.transferBankName;
    }
    if (transferPayload.transferAccountType !== (empresa?.transferAccountType?.trim() || null)) {
      empresaPatch.transferAccountType = transferPayload.transferAccountType;
    }
    if (transferPayload.transferAccount !== (empresa?.transferAccount?.trim() || null)) {
      empresaPatch.transferAccount = transferPayload.transferAccount;
    }
    if (transferPayload.transferHolderName !== (empresa?.transferHolderName?.trim() || null)) {
      empresaPatch.transferHolderName = transferPayload.transferHolderName;
    }
    if (transferPayload.transferRut !== (empresa?.transferRut?.trim() || null)) {
      empresaPatch.transferRut = transferPayload.transferRut;
    }

    setSavingWsp(true);
    try {
      if (Object.keys(empresaPatch).length > 0) {
        await platformFetch(`platform/empresas/${wspEmpresaId}`, {
          method: 'PATCH',
          body: JSON.stringify(empresaPatch),
        });
      }
      await platformFetch(`platform/empresas/${wspEmpresaId}/assistant-bindings`, {
        method: 'POST',
        body: JSON.stringify({
          externalId: clientPhone,
          adminNotifyPhone: adminPhone,
        }),
      });
      await loadWspBindings();
      await loadEmpresas();
      alert('Canal WhatsApp guardado. Prueba en /platform/whatsapp con el mismo teléfono.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al registrar WhatsApp';
      const friendly = msg.includes('no fields to update')
        ? 'Los datos de transferencia ya estaban guardados. Si solo cambiaste el teléfono cliente, vuelve a guardar tras reconstruir core/bff (docker compose build).'
        : msg;
      alert(friendly);
    } finally {
      setSavingWsp(false);
    }
  };

  const handleSuspend = async (id: string) => {
    if (!confirm('Suspender esta empresa? Los usuarios no podran iniciar sesion.')) return;
    try {
      await platformFetch(`platform/empresas/${id}/suspend`, { method: 'POST', body: '{}' });
      await loadEmpresas();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error');
    }
  };

  const handlePlanChange = async (empresaId: string, planCodigo: SaasPlanCodigo) => {
    try {
      await platformFetch(`platform/empresas/${empresaId}`, {
        method: 'PATCH',
        body: JSON.stringify({ planCodigo }),
      });
      await loadEmpresas();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al cambiar plan');
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

  const patchSuscripcion = async (
    empresaId: string,
    payload: { extendDays?: number; graceDays?: number }
  ) => {
    try {
      await platformFetch(`platform/empresas/${empresaId}/suscripcion`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      await loadEmpresas();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al actualizar suscripción');
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
        planCodigo: form.planCodigo,
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
        planCodigo: 'BASICO',
      });
      await loadEmpresas();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al crear empresa');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PlatformPageHeader
        title="Empresas tenant"
        description="Alta de tenants, planes SaaS, bindings WhatsApp y datos de transferencia."
        actions={
          <button type="button" onClick={() => setShowCreate(true)} className="app-btn-primary">
            Nueva empresa
          </button>
        }
      />
        {error && (
          <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-800">
            {error}
          </p>
        )}

        {loading ? (
          <p className="text-brand-ink-muted">Cargando empresas…</p>
        ) : (
          <div className="app-table-wrap">
            <table className="app-table">
              <thead>
                <tr>
                  <th className="px-4 py-3">Empresa</th>
                  <th className="px-4 py-3">RUT</th>
                  <th className="px-4 py-3">Slug</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Valor</th>
                  <th className="px-4 py-3">WhatsApp</th>
                  <th className="px-4 py-3">Suscripción</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {empresas.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <div className="font-medium text-brand-ink">{e.nombreFantasia ?? e.razonSocial}</div>
                      <div className="text-xs text-brand-ink-muted">{e.razonSocial}</div>
                    </td>
                    <td>{e.rutEmpresa}</td>
                    <td className="font-mono text-xs">{e.slug}</td>
                    <td>
                      <select
                        value={e.plan?.codigo ?? 'BASICO'}
                        onChange={(ev) =>
                          handlePlanChange(e.id, ev.target.value as SaasPlanCodigo)
                        }
                        className="app-select max-w-[10rem] py-1 text-xs"
                      >
                        {(planesActivos.length > 0
                          ? planesActivos
                          : [{ codigo: e.plan?.codigo ?? 'BASICO', nombre: e.plan?.nombre ?? 'Plan', activo: true } as SaasPlan]
                        ).map((p) => (
                          <option key={p.codigo} value={p.codigo}>
                            {p.nombre}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-brand-ink-muted">
                        {e.plan?.metodoPago ? METODO_PAGO_LABELS[e.plan.metodoPago] : ''}
                      </p>
                    </td>
                    <td className="text-xs">
                      {e.plan?.valor != null ? formatPlanValor(e.plan.valor) : '—'}
                    </td>
                    <td className="font-mono text-xs text-brand-ink-muted">
                      {wspBindings[e.id] ? `+${wspBindings[e.id]}` : '—'}
                    </td>
                    <td className="text-xs">
                      {e.suscripcion ? (
                        <>
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 font-semibold ${
                              SUB_ESTADO_STYLES[e.suscripcion.estado] ?? 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {e.suscripcion.estado}
                          </span>
                          <p className="mt-1 text-brand-ink-muted">
                            Vence {formatSubDate(e.suscripcion.venceEn)}
                          </p>
                        </>
                      ) : (
                        <span className="text-brand-ink-muted">Sin registro</span>
                      )}
                    </td>
                    <td>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${ESTADO_STYLES[e.estado]}`}
                      >
                        {ESTADO_LABELS[e.estado]}
                      </span>
                    </td>
                    <td className="text-right">
                      <div className="flex flex-col items-end gap-1">
                        <button
                          type="button"
                          onClick={() => void patchSuscripcion(e.id, { extendDays: 30 })}
                          className="text-xs font-medium text-sky-700 hover:underline"
                        >
                          +30d piloto
                        </button>
                        <button
                          type="button"
                          onClick={() => void patchSuscripcion(e.id, { graceDays: 7 })}
                          className="text-xs font-medium text-amber-800 hover:underline"
                        >
                          +7d gracia
                        </button>
                        {e.estado === 'ACTIVO' ? (
                          <button
                            type="button"
                            onClick={() => handleSuspend(e.id)}
                            className="text-xs font-medium text-rose-700 hover:underline"
                          >
                            Suspender
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleActivate(e.id)}
                            className="text-xs font-medium text-emerald-700 hover:underline"
                          >
                            Activar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {empresas.length === 0 && (
              <p className="px-4 py-8 text-center text-brand-ink-muted">No hay empresas registradas.</p>
            )}
          </div>
        )}

        <section className="app-card mt-10 rounded-2xl p-6">
          <h2 className="text-base font-semibold text-brand-ink">Canal WhatsApp (plan Estándar / Full)</h2>
          <p className="mt-1 text-xs text-brand-ink-muted">
            Cliente WSP, admin validación y datos de transferencia (la IA compara comprobantes contra
            estos datos).
          </p>
          <form onSubmit={handleSaveWsp} className="mt-4 space-y-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[200px] flex-1">
                <label className="mb-1 block text-xs font-medium text-brand-ink-muted">Empresa</label>
                <select
                  value={wspEmpresaId}
                  onChange={(ev) => setWspEmpresaId(ev.target.value)}
                  className="app-select"
                >
                  <option value="">Seleccionar…</option>
                  {empresas.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nombreFantasia ?? e.razonSocial} ({e.plan?.codigo ?? 'BASICO'})
                    </option>
                  ))}
                </select>
              </div>
              <div className="min-w-[180px] flex-1">
                <label className="mb-1 block text-xs font-medium text-brand-ink-muted">
                  Teléfono cliente (sin +){' '}
                  {wspBindings[wspEmpresaId] ? (
                    <span className="text-brand-olive">· registrado: {wspBindings[wspEmpresaId]}</span>
                  ) : null}
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={wspPhone}
                  onChange={(ev) => setWspPhone(ev.target.value.replace(/[^\d]/g, ''))}
                  placeholder="56900000001"
                  className="app-input app-input-mono text-base"
                />
                <p className="mt-1 text-[11px] text-brand-ink-muted">
                  Editable. Al guardar se actualiza el binding WSP de esta empresa (mismo número que en
                  /platform/whatsapp).
                </p>
              </div>
              <div className="min-w-[180px] flex-1">
                <label className="mb-1 block text-xs font-medium text-brand-ink-muted">
                  WSP admin validación (sin +)
                </label>
                <input
                  type="tel"
                  value={wspAdminPhone}
                  onChange={(ev) => setWspAdminPhone(ev.target.value)}
                  placeholder="56900000002"
                  className="app-input app-input-mono"
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-brand-ink-muted">Banco</label>
                <input
                  type="text"
                  value={transferBankName}
                  onChange={(ev) => setTransferBankName(ev.target.value)}
                  placeholder="BancoEstado"
                  className="app-input"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-brand-ink-muted">Tipo cuenta</label>
                <select
                  value={transferAccountType}
                  onChange={(ev) => setTransferAccountType(ev.target.value)}
                  className="app-select"
                >
                  <option value="Cuenta vista">Cuenta vista</option>
                  <option value="Cuenta corriente">Cuenta corriente</option>
                  <option value="Cuenta RUT">Cuenta RUT</option>
                  <option value="Cuenta ahorro">Cuenta ahorro</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-brand-ink-muted">N° cuenta</label>
                <input
                  type="text"
                  value={transferAccount}
                  onChange={(ev) => setTransferAccount(ev.target.value)}
                  placeholder="12345678"
                  className="app-input app-input-mono"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-brand-ink-muted">Titular</label>
                <input
                  type="text"
                  value={transferHolderName}
                  onChange={(ev) => setTransferHolderName(ev.target.value)}
                  placeholder="Razón social o nombre fantasía"
                  className="app-input"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-brand-ink-muted">RUT titular</label>
                <input
                  type="text"
                  value={transferRut}
                  onChange={(ev) => setTransferRut(ev.target.value)}
                  placeholder="76.123.456-7"
                  className="app-input app-input-mono"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={savingWsp}
              className="app-btn-primary disabled:opacity-50"
            >
              {savingWsp ? 'Guardando…' : 'Guardar canal y datos transferencia'}
            </button>
          </form>
        </section>

        <section className="mt-10">
          <h2 className="text-base font-semibold text-brand-ink">Catálogo de planes SaaS</h2>
          <p className="mt-1 text-xs text-brand-ink-muted">
            Valor mensual de referencia (CLP), descripción, método de pago y estado activo/inactivo.
          </p>
          <div className="app-table-wrap mt-4">
            <table className="app-table">
              <thead>
                <tr>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Valor</th>
                  <th className="px-4 py-3">Descripción</th>
                  <th className="px-4 py-3">Método de pago</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody>
                {planes.map((p) => (
                  <tr key={p.id}>
                    <td className="font-medium">{getPlanDisplayName(p)}</td>
                    <td>{formatPlanValor(p.valor)}</td>
                    <td className="max-w-xs text-xs text-brand-ink-muted">{p.descripcion}</td>
                    <td>{METODO_PAGO_LABELS[p.metodoPago]}</td>
                    <td>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                          p.activo ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {p.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="text-right">
                      <button
                        type="button"
                        onClick={() => openEditPlan(p)}
                        className="text-sm font-medium text-brand-olive hover:underline"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

      {editingPlan && (
        <div className="app-modal-overlay">
          <div className="app-modal-panel max-w-lg">
            <h2 className="text-lg font-semibold text-brand-ink">Editar plan — {editingPlan.nombre}</h2>
            <form onSubmit={handleSavePlan} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-brand-ink-muted">
                  Valor mensual (CLP, sin IVA)
                </label>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={planForm.valor}
                  onChange={(ev) =>
                    setPlanForm({ ...planForm, valor: Number(ev.target.value) || 0 })
                  }
                  className="app-input mt-1"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-brand-ink-muted">Descripción</label>
                <textarea
                  value={planForm.descripcion}
                  onChange={(ev) => setPlanForm({ ...planForm, descripcion: ev.target.value })}
                  rows={3}
                  className="app-textarea mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-brand-ink-muted">Método de pago</label>
                <select
                  value={planForm.metodoPago}
                  onChange={(ev) =>
                    setPlanForm({
                      ...planForm,
                      metodoPago: ev.target.value as SaasMetodoPago,
                    })
                  }
                  className="app-select mt-1"
                >
                  {Object.entries(METODO_PAGO_LABELS).map(([code, label]) => (
                    <option key={code} value={code}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm text-brand-ink">
                <input
                  type="checkbox"
                  checked={planForm.activo}
                  onChange={(ev) => setPlanForm({ ...planForm, activo: ev.target.checked })}
                />
                Plan activo (visible para nuevas empresas)
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingPlan(null)}
                  className="app-btn-secondary"
                >
                  Cancelar
                </button>
                <button type="submit" disabled={savingPlan} className="app-btn-primary">
                  {savingPlan ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="app-modal-overlay">
          <div className="app-modal-panel max-w-lg">
            <h2 className="text-lg font-semibold text-brand-ink">Alta de empresa (tenant)</h2>
            <form onSubmit={handleCreate} className="mt-4 space-y-3">
              <input
                placeholder="RUT (ej. 76.123.456-7)"
                value={form.rut}
                onChange={(ev) => setForm({ ...form, rut: ev.target.value })}
                className="app-input"
                required
              />
              <input
                placeholder="Razon social *"
                value={form.razonSocial}
                onChange={(ev) => setForm({ ...form, razonSocial: ev.target.value })}
                className="app-input"
                required
              />
              <input
                placeholder="Nombre fantasia"
                value={form.nombreFantasia}
                onChange={(ev) => setForm({ ...form, nombreFantasia: ev.target.value })}
                className="app-input"
              />
              <input
                placeholder="Nombre sucursal central"
                value={form.branchName}
                onChange={(ev) => setForm({ ...form, branchName: ev.target.value })}
                className="app-input"
              />
              <label className="block text-xs font-medium text-brand-ink-muted">Plan SaaS</label>
              <select
                value={form.planCodigo}
                onChange={(ev) =>
                  setForm({ ...form, planCodigo: ev.target.value as SaasPlanCodigo })
                }
                className="app-select"
              >
                {planesActivos.map((p) => (
                  <option key={p.id} value={p.codigo}>
                    {getPlanDisplayName(p)} — {formatPlanValor(p.valor)}
                  </option>
                ))}
                {planes.length === 0 &&
                  (Object.entries(PLAN_DISPLAY_NAMES) as [SaasPlanCodigo, string][]).map(
                    ([codigo, nombre]) => (
                      <option key={codigo} value={codigo}>
                        {nombre}
                      </option>
                    )
                  )}
              </select>
              <hr className="border-brand-linen" />
              <p className="text-xs text-brand-ink-muted">Admin inicial (opcional — deja ACTIVO)</p>
              <input
                placeholder="Email admin"
                type="email"
                value={form.adminEmail}
                onChange={(ev) => setForm({ ...form, adminEmail: ev.target.value })}
                className="app-input"
              />
              <input
                placeholder="Password admin (min 8)"
                type="password"
                value={form.adminPassword}
                onChange={(ev) => setForm({ ...form, adminPassword: ev.target.value })}
                className="app-input"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="app-btn-secondary">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="app-btn-primary">
                  {saving ? 'Creando...' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
