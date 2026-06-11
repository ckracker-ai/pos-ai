'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { platformFetch } from '@/core/context/platform-auth';
import { PlatformPageHeader } from '@/components/molecules/PlatformPageHeader';
import { Empresa, EmpresaEstado, SaasPlanCodigo } from '@/core/interfaces';
import { normalizeEmpresa, unwrapApiEnvelope } from '@/core/api/normalizers';
import { formatPlanValor, getPlanDisplayName } from '@/core/constants/saas-plan';

type ApiEnvelope<T> = { success: boolean; data: T; error: string | null; code: number };

type TabId = 'general' | 'usuarios' | 'sucursales' | 'suscripcion';

type PlatformTenantUser = {
  id: string;
  fullName: string;
  email: string;
  roleId: string;
  roleName: string;
  branchId: string;
  branchName: string | null;
  isActive: boolean;
  whatsappPhone: string | null;
  legalCurrent: boolean;
  createdAt: string;
  updatedAt: string;
};

type PlatformTenantBranch = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  comunaNombre: string | null;
  regionNombre: string | null;
  isActive: boolean;
  userCount: number;
  createdAt: string;
};

type CheckoutSummary = {
  empresaId: string;
  razonSocial: string;
  planCodigo: string;
  planNombre: string;
  netoClp: number;
  ivaClp: number;
  totalClp: number;
  suscripcionEstado: string;
  canPay: boolean;
};

const ESTADO_LABELS: Record<EmpresaEstado, string> = {
  ACTIVO: 'Activa',
  SUSPENDIDO: 'Suspendida',
  PENDIENTE_ONBOARDING: 'Pendiente',
};

const TABS: { id: TabId; label: string }[] = [
  { id: 'general', label: 'General' },
  { id: 'usuarios', label: 'Usuarios' },
  { id: 'sucursales', label: 'Sucursales' },
  { id: 'suscripcion', label: 'Suscripción' },
];

const ROLE_OPTIONS = ['ADMIN', 'AUDITOR', 'SELLER', 'COMANDA'] as const;

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('es-CL');
  } catch {
    return '—';
  }
}

function mapOpsError(error: string): string {
  if (error.includes('EMAIL_TAKEN')) return 'Ese correo ya está registrado en este tenant.';
  if (error.includes('PLAN_LIMIT_')) return 'Límite de usuarios del plan alcanzado.';
  if (error.includes('USER_NOT_FOUND')) return 'Usuario no encontrado.';
  if (error.includes('VALIDATION_ERROR')) return 'Revisa los datos (contraseña mín. 8 caracteres).';
  if (error.includes('PLAN_LIMIT_BRANCHES')) return 'Límite de sucursales activas del plan alcanzado.';
  if (error.includes('BRANCH_NOT_FOUND')) return 'Sucursal no encontrada.';
  if (error.includes('LEGAL_')) return 'Error en documentos legales — revisa migraciones S7.';
  return error;
}

export default function PlatformEmpresaDetailPage() {
  const params = useParams();
  const router = useRouter();
  const empresaId = String(params.id ?? '');

  const [tab, setTab] = useState<TabId>('general');
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [users, setUsers] = useState<PlatformTenantUser[]>([]);
  const [branches, setBranches] = useState<PlatformTenantBranch[]>([]);
  const [checkout, setCheckout] = useState<CheckoutSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [opsError, setOpsError] = useState<string | null>(null);
  const [opsOk, setOpsOk] = useState<string | null>(null);

  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetting, setResetting] = useState(false);

  const [showCreateUser, setShowCreateUser] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [newUser, setNewUser] = useState({
    fullName: '',
    email: '',
    password: '',
    roleCodigo: 'ADMIN' as (typeof ROLE_OPTIONS)[number],
  });

  const [confirmingPay, setConfirmingPay] = useState(false);
  const [legalBusyUserId, setLegalBusyUserId] = useState<string | null>(null);

  const [showCreateBranch, setShowCreateBranch] = useState(false);
  const [creatingBranch, setCreatingBranch] = useState(false);
  const [newBranch, setNewBranch] = useState({ name: '', address: '', phone: '' });
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
  const [branchDraft, setBranchDraft] = useState({ name: '', address: '', phone: '' });
  const [savingBranch, setSavingBranch] = useState(false);

  const loadEmpresa = useCallback(async () => {
    const res = await platformFetch<ApiEnvelope<{ empresa: Record<string, unknown> }>>(
      `platform/empresas/${empresaId}`
    );
    const data = unwrapApiEnvelope(res) as { empresa?: Record<string, unknown> };
    setEmpresa(normalizeEmpresa(data.empresa ?? {}));
  }, [empresaId]);

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const res = await platformFetch<ApiEnvelope<{ users: PlatformTenantUser[] }>>(
        `platform/empresas/${empresaId}/users`
      );
      const data = unwrapApiEnvelope(res) as { users?: PlatformTenantUser[] };
      setUsers(Array.isArray(data.users) ? data.users : []);
    } catch (e) {
      setOpsError(e instanceof Error ? e.message : 'Error al cargar usuarios');
    } finally {
      setLoadingUsers(false);
    }
  }, [empresaId]);

  const loadCheckout = useCallback(async () => {
    try {
      const res = await platformFetch<ApiEnvelope<{ checkout: CheckoutSummary }>>(
        `platform/empresas/${empresaId}/checkout`
      );
      const data = unwrapApiEnvelope(res) as { checkout?: CheckoutSummary };
      setCheckout(data.checkout ?? null);
    } catch {
      setCheckout(null);
    }
  }, [empresaId]);

  useEffect(() => {
    if (!empresaId) return;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        await loadEmpresa();
        await loadCheckout();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error al cargar empresa');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [empresaId, loadEmpresa, loadCheckout]);

  const loadBranches = useCallback(async () => {
    setLoadingBranches(true);
    try {
      const res = await platformFetch<ApiEnvelope<{ sucursales: PlatformTenantBranch[] }>>(
        `platform/empresas/${empresaId}/branches`
      );
      const data = unwrapApiEnvelope(res) as { sucursales?: PlatformTenantBranch[] };
      setBranches(Array.isArray(data.sucursales) ? data.sucursales : []);
    } catch (e) {
      setOpsError(e instanceof Error ? e.message : 'Error al cargar sucursales');
    } finally {
      setLoadingBranches(false);
    }
  }, [empresaId]);

  useEffect(() => {
    if (tab === 'usuarios' && empresaId) void loadUsers();
  }, [tab, empresaId, loadUsers]);

  useEffect(() => {
    if (tab === 'sucursales' && empresaId) void loadBranches();
  }, [tab, empresaId, loadBranches]);

  const flashOk = (msg: string) => {
    setOpsOk(msg);
    setOpsError(null);
    setTimeout(() => setOpsOk(null), 5000);
  };

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!resetUserId || resetPassword.trim().length < 8) {
      setOpsError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    setResetting(true);
    setOpsError(null);
    try {
      await platformFetch(`platform/empresas/${empresaId}/users/${resetUserId}/password`, {
        method: 'PATCH',
        body: JSON.stringify({ password: resetPassword.trim() }),
      });
      setResetUserId(null);
      setResetPassword('');
      flashOk('Contraseña actualizada. Comunícala al administrador por canal seguro.');
      await loadUsers();
    } catch (err) {
      setOpsError(mapOpsError(err instanceof Error ? err.message : 'Error al resetear'));
    } finally {
      setResetting(false);
    }
  };

  const handleCreateUser = async (e: FormEvent) => {
    e.preventDefault();
    setCreatingUser(true);
    setOpsError(null);
    try {
      await platformFetch(`platform/empresas/${empresaId}/users`, {
        method: 'POST',
        body: JSON.stringify({
          fullName: newUser.fullName.trim(),
          email: newUser.email.trim(),
          password: newUser.password,
          roleCodigo: newUser.roleCodigo,
        }),
      });
      setShowCreateUser(false);
      setNewUser({ fullName: '', email: '', password: '', roleCodigo: 'ADMIN' });
      flashOk('Usuario creado. Entrega credenciales al tenant por canal seguro.');
      await loadUsers();
    } catch (err) {
      setOpsError(mapOpsError(err instanceof Error ? err.message : 'Error al crear usuario'));
    } finally {
      setCreatingUser(false);
    }
  };

  const patchSuscripcion = async (payload: { extendDays?: number; graceDays?: number }) => {
    setOpsError(null);
    try {
      await platformFetch(`platform/empresas/${empresaId}/suscripcion`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      flashOk('Suscripción actualizada.');
      await loadEmpresa();
      await loadCheckout();
    } catch (err) {
      setOpsError(err instanceof Error ? err.message : 'Error al actualizar suscripción');
    }
  };

  const handleLegalReset = async (userId: string) => {
    if (!confirm('¿Forzar re-aceptación legal en el próximo login?')) return;
    setLegalBusyUserId(userId);
    setOpsError(null);
    try {
      await platformFetch(`platform/empresas/${empresaId}/users/${userId}/legal-reset`, {
        method: 'POST',
        body: '{}',
      });
      flashOk('Aceptaciones legales eliminadas — el usuario verá el gate al iniciar sesión.');
      await loadUsers();
    } catch (err) {
      setOpsError(mapOpsError(err instanceof Error ? err.message : 'Error legal'));
    } finally {
      setLegalBusyUserId(null);
    }
  };

  const handleLegalGrant = async (userId: string) => {
    if (!confirm('¿Registrar aceptación de términos vigentes en nombre del usuario (soporte)?')) return;
    setLegalBusyUserId(userId);
    setOpsError(null);
    try {
      await platformFetch(`platform/empresas/${empresaId}/users/${userId}/legal-grant`, {
        method: 'POST',
        body: '{}',
      });
      flashOk('Términos vigentes registrados — el usuario puede iniciar sesión sin gate.');
      await loadUsers();
    } catch (err) {
      setOpsError(mapOpsError(err instanceof Error ? err.message : 'Error legal'));
    } finally {
      setLegalBusyUserId(null);
    }
  };

  const handleCreateBranch = async (e: FormEvent) => {
    e.preventDefault();
    setCreatingBranch(true);
    setOpsError(null);
    try {
      await platformFetch(`platform/empresas/${empresaId}/branches`, {
        method: 'POST',
        body: JSON.stringify({
          name: newBranch.name.trim(),
          address: newBranch.address.trim() || undefined,
          phone: newBranch.phone.trim() || undefined,
        }),
      });
      setShowCreateBranch(false);
      setNewBranch({ name: '', address: '', phone: '' });
      flashOk('Sucursal creada.');
      await loadBranches();
    } catch (err) {
      setOpsError(mapOpsError(err instanceof Error ? err.message : 'Error al crear sucursal'));
    } finally {
      setCreatingBranch(false);
    }
  };

  const startEditBranch = (b: PlatformTenantBranch) => {
    setEditingBranchId(b.id);
    setBranchDraft({
      name: b.name,
      address: b.address ?? '',
      phone: b.phone ?? '',
    });
    setOpsError(null);
  };

  const handleSaveBranch = async (branchId: string) => {
    setSavingBranch(true);
    setOpsError(null);
    try {
      await platformFetch(`platform/empresas/${empresaId}/branches/${branchId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: branchDraft.name.trim(),
          address: branchDraft.address.trim() || null,
          phone: branchDraft.phone.trim() || null,
        }),
      });
      setEditingBranchId(null);
      flashOk('Sucursal actualizada.');
      await loadBranches();
    } catch (err) {
      setOpsError(mapOpsError(err instanceof Error ? err.message : 'Error al guardar sucursal'));
    } finally {
      setSavingBranch(false);
    }
  };

  const handleToggleBranch = async (b: PlatformTenantBranch) => {
    const next = !b.isActive;
    const msg = next
      ? '¿Reactivar esta sucursal?'
      : '¿Desactivar esta sucursal? Los usuarios asignados conservan el vínculo.';
    if (!confirm(msg)) return;
    setOpsError(null);
    try {
      await platformFetch(`platform/empresas/${empresaId}/branches/${b.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: next }),
      });
      flashOk(next ? 'Sucursal activada.' : 'Sucursal desactivada.');
      await loadBranches();
    } catch (err) {
      setOpsError(mapOpsError(err instanceof Error ? err.message : 'Error al cambiar estado'));
    }
  };

  const handleConfirmSandboxPay = async () => {
    if (!confirm('¿Activar suscripción con pago sandbox manual?')) return;
    setConfirmingPay(true);
    setOpsError(null);
    try {
      await platformFetch(`platform/empresas/${empresaId}/checkout/confirm-payment`, {
        method: 'POST',
        body: JSON.stringify({
          provider: 'SANDBOX',
          reference: `platform-${Date.now()}`,
        }),
      });
      flashOk('Pago sandbox confirmado — suscripción activa.');
      await loadEmpresa();
      await loadCheckout();
    } catch (err) {
      setOpsError(err instanceof Error ? err.message : 'Error al confirmar pago');
    } finally {
      setConfirmingPay(false);
    }
  };

  const handleLifecycle = async (action: 'suspend' | 'activate') => {
    const msg =
      action === 'suspend'
        ? '¿Suspender esta empresa? Los usuarios no podrán iniciar sesión.'
        : '¿Activar esta empresa?';
    if (!confirm(msg)) return;
    setOpsError(null);
    try {
      await platformFetch(`platform/empresas/${empresaId}/${action}`, {
        method: 'POST',
        body: '{}',
      });
      flashOk(action === 'suspend' ? 'Empresa suspendida.' : 'Empresa activada.');
      await loadEmpresa();
    } catch (err) {
      setOpsError(err instanceof Error ? err.message : 'Error');
    }
  };

  const checkoutUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/checkout?empresaId=${empresaId}`
      : `/checkout?empresaId=${empresaId}`;

  if (loading) {
    return <p className="text-brand-ink-muted">Cargando tenant…</p>;
  }

  if (error || !empresa) {
    return (
      <div>
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-800">
          {error ?? 'Empresa no encontrada'}
        </p>
        <Link href="/platform/empresas" className="mt-4 inline-block text-sm text-brand-olive hover:underline">
          ← Volver al listado
        </Link>
      </div>
    );
  }

  return (
    <>
      <PlatformPageHeader
        title={empresa.nombreFantasia ?? empresa.razonSocial}
        description={`Operaciones de soporte — ${empresa.razonSocial} · ${empresa.rutEmpresa}`}
        actions={
          <Link href="/platform/empresas" className="app-btn-secondary text-sm">
            ← Empresas
          </Link>
        }
      />

      {opsOk ? (
        <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          {opsOk}
        </p>
      ) : null}
      {opsError ? (
        <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-800">
          {opsError}
        </p>
      ) : null}

      <nav className="mb-6 flex gap-1 rounded-xl border border-brand-linen/80 bg-brand-surface/40 p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
              tab === t.id ? 'bg-brand-olive text-white shadow-sm' : 'text-brand-ink-muted hover:bg-white/80'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === 'general' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="app-card rounded-2xl p-6">
            <h2 className="text-base font-semibold text-brand-ink">Datos del tenant</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-brand-ink-muted">ID</dt>
                <dd className="font-mono text-xs">{empresa.id}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-brand-ink-muted">Slug</dt>
                <dd className="font-mono">{empresa.slug}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-brand-ink-muted">Estado empresa</dt>
                <dd>{ESTADO_LABELS[empresa.estado]}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-brand-ink-muted">Plan</dt>
                <dd>
                  {empresa.plan ? getPlanDisplayName(empresa.plan) : '—'}{' '}
                  {empresa.plan?.valor != null ? `(${formatPlanValor(empresa.plan.valor)})` : ''}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-brand-ink-muted">Correo facturación</dt>
                <dd>{empresa.correoFacturacion ?? '—'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-brand-ink-muted">Creada</dt>
                <dd>{formatDate(empresa.createdAt)}</dd>
              </div>
            </dl>
            <div className="mt-6 flex flex-wrap gap-2">
              {empresa.estado === 'ACTIVO' ? (
                <button
                  type="button"
                  onClick={() => void handleLifecycle('suspend')}
                  className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-medium text-rose-800 hover:bg-rose-50"
                >
                  Suspender empresa
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleLifecycle('activate')}
                  className="rounded-lg border border-emerald-200 px-3 py-2 text-xs font-medium text-emerald-800 hover:bg-emerald-50"
                >
                  Activar empresa
                </button>
              )}
            </div>
          </section>

          <section className="app-card rounded-2xl p-6">
            <h2 className="text-base font-semibold text-brand-ink">Accesos rápidos</h2>
            <p className="mt-2 text-xs text-brand-ink-muted">
              Enlace público de checkout para que el tenant complete el pago piloto.
            </p>
            <div className="mt-4 rounded-lg border border-brand-linen bg-brand-vanilla/40 p-3">
              <p className="break-all font-mono text-xs text-brand-ink">{checkoutUrl}</p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(checkoutUrl);
                  flashOk('Enlace de checkout copiado.');
                }}
                className="app-btn-secondary text-xs"
              >
                Copiar checkout
              </button>
              <button
                type="button"
                onClick={() => router.push(`/checkout?empresaId=${empresaId}`)}
                className="app-btn-secondary text-xs"
              >
                Abrir checkout
              </button>
              <button
                type="button"
                onClick={() => setTab('usuarios')}
                className="app-btn-primary text-xs"
              >
                Ver usuarios
              </button>
            </div>
          </section>
        </div>
      )}

      {tab === 'usuarios' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-brand-ink-muted">
              Usuarios del tenant — contraseña, login gate legal y admin de rescate.
            </p>
            <button
              type="button"
              onClick={() => setShowCreateUser((v) => !v)}
              className="app-btn-primary text-sm"
            >
              {showCreateUser ? 'Cancelar' : 'Crear usuario'}
            </button>
          </div>

          {showCreateUser && (
            <form onSubmit={handleCreateUser} className="app-card space-y-4 rounded-2xl p-6">
              <h3 className="font-semibold text-brand-ink">Nuevo usuario (soporte)</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-brand-ink-muted">Nombre</label>
                  <input
                    className="app-input"
                    value={newUser.fullName}
                    onChange={(ev) => setNewUser((s) => ({ ...s, fullName: ev.target.value }))}
                    required
                    placeholder="Administrador rescate"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-brand-ink-muted">Correo</label>
                  <input
                    type="email"
                    className="app-input"
                    value={newUser.email}
                    onChange={(ev) => setNewUser((s) => ({ ...s, email: ev.target.value }))}
                    required
                    placeholder="rescate@negocio.cl"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-brand-ink-muted">Contraseña</label>
                  <input
                    type="password"
                    className="app-input"
                    value={newUser.password}
                    onChange={(ev) => setNewUser((s) => ({ ...s, password: ev.target.value }))}
                    required
                    minLength={8}
                    placeholder="Mín. 8 caracteres"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-brand-ink-muted">Rol</label>
                  <select
                    className="app-select"
                    value={newUser.roleCodigo}
                    onChange={(ev) =>
                      setNewUser((s) => ({
                        ...s,
                        roleCodigo: ev.target.value as (typeof ROLE_OPTIONS)[number],
                      }))
                    }
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <button type="submit" disabled={creatingUser} className="app-btn-primary disabled:opacity-50">
                {creatingUser ? 'Creando…' : 'Crear usuario'}
              </button>
            </form>
          )}

          {loadingUsers ? (
            <p className="text-brand-ink-muted">Cargando usuarios…</p>
          ) : (
            <div className="app-table-wrap">
              <table className="app-table">
                <thead>
                  <tr>
                    <th className="px-4 py-3">Usuario</th>
                    <th className="px-4 py-3">Rol</th>
                    <th className="px-4 py-3">Sucursal</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Legal</th>
                    <th className="px-4 py-3 text-right">Soporte</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <div className="font-medium text-brand-ink">{u.fullName}</div>
                        <div className="font-mono text-xs text-brand-ink-muted">{u.email}</div>
                      </td>
                      <td className="text-xs">{u.roleName}</td>
                      <td className="text-xs">{u.branchName ?? '—'}</td>
                      <td>
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                            u.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {u.isActive ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                            u.legalCurrent
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-900'
                          }`}
                        >
                          {u.legalCurrent ? 'Al día' : 'Re-auth'}
                        </span>
                        <div className="mt-1 flex flex-col gap-0.5">
                          <button
                            type="button"
                            disabled={legalBusyUserId === u.id}
                            onClick={() => void handleLegalGrant(u.id)}
                            className="text-left text-[10px] font-medium text-brand-olive hover:underline disabled:opacity-50"
                          >
                            Marcar aceptado
                          </button>
                          <button
                            type="button"
                            disabled={legalBusyUserId === u.id}
                            onClick={() => void handleLegalReset(u.id)}
                            className="text-left text-[10px] font-medium text-amber-800 hover:underline disabled:opacity-50"
                          >
                            Forzar re-auth
                          </button>
                        </div>
                      </td>
                      <td className="text-right">
                        {resetUserId === u.id ? (
                          <form onSubmit={handleResetPassword} className="inline-flex items-center gap-2">
                            <input
                              type="password"
                              className="app-input max-w-[10rem] py-1 text-xs"
                              value={resetPassword}
                              onChange={(ev) => setResetPassword(ev.target.value)}
                              placeholder="Nueva clave"
                              minLength={8}
                              required
                              autoFocus
                            />
                            <button
                              type="submit"
                              disabled={resetting}
                              className="text-xs font-medium text-brand-olive hover:underline disabled:opacity-50"
                            >
                              {resetting ? '…' : 'Guardar'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setResetUserId(null);
                                setResetPassword('');
                              }}
                              className="text-xs text-brand-ink-muted hover:underline"
                            >
                              Cancelar
                            </button>
                          </form>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setResetUserId(u.id);
                              setResetPassword('');
                              setOpsError(null);
                            }}
                            className="text-xs font-medium text-sky-700 hover:underline"
                          >
                            Reset contraseña
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.length === 0 && (
                <p className="px-4 py-8 text-center text-brand-ink-muted">Sin usuarios en este tenant.</p>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'sucursales' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-brand-ink-muted">
              Sucursales del tenant — incluye inactivas. Límite según plan:{' '}
              <span className="font-medium text-brand-ink">
                {empresa.plan?.maxSucursales ?? '—'} activa(s)
              </span>
            </p>
            <button
              type="button"
              onClick={() => setShowCreateBranch((v) => !v)}
              className="app-btn-primary text-sm"
            >
              {showCreateBranch ? 'Cancelar' : 'Nueva sucursal'}
            </button>
          </div>

          {showCreateBranch && (
            <form onSubmit={handleCreateBranch} className="app-card space-y-4 rounded-2xl p-6">
              <h3 className="font-semibold text-brand-ink">Alta rápida (soporte)</h3>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-brand-ink-muted">Nombre *</label>
                  <input
                    className="app-input"
                    value={newBranch.name}
                    onChange={(ev) => setNewBranch((s) => ({ ...s, name: ev.target.value }))}
                    required
                    placeholder="Sucursal Norte"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-brand-ink-muted">Dirección</label>
                  <input
                    className="app-input"
                    value={newBranch.address}
                    onChange={(ev) => setNewBranch((s) => ({ ...s, address: ev.target.value }))}
                    placeholder="Por definir"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-brand-ink-muted">Teléfono</label>
                  <input
                    className="app-input"
                    value={newBranch.phone}
                    onChange={(ev) => setNewBranch((s) => ({ ...s, phone: ev.target.value }))}
                    placeholder="+56 9 …"
                  />
                </div>
              </div>
              <button type="submit" disabled={creatingBranch} className="app-btn-primary disabled:opacity-50">
                {creatingBranch ? 'Creando…' : 'Crear sucursal'}
              </button>
            </form>
          )}

          {loadingBranches ? (
            <p className="text-brand-ink-muted">Cargando sucursales…</p>
          ) : (
            <div className="app-table-wrap">
              <table className="app-table">
                <thead>
                  <tr>
                    <th className="px-4 py-3">Sucursal</th>
                    <th className="px-4 py-3">Territorio</th>
                    <th className="px-4 py-3">Usuarios</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {branches.map((b) => (
                    <tr key={b.id}>
                      <td>
                        {editingBranchId === b.id ? (
                          <div className="space-y-2">
                            <input
                              className="app-input py-1 text-xs"
                              value={branchDraft.name}
                              onChange={(ev) =>
                                setBranchDraft((s) => ({ ...s, name: ev.target.value }))
                              }
                            />
                            <input
                              className="app-input py-1 text-xs"
                              value={branchDraft.address}
                              onChange={(ev) =>
                                setBranchDraft((s) => ({ ...s, address: ev.target.value }))
                              }
                              placeholder="Dirección"
                            />
                            <input
                              className="app-input py-1 text-xs"
                              value={branchDraft.phone}
                              onChange={(ev) =>
                                setBranchDraft((s) => ({ ...s, phone: ev.target.value }))
                              }
                              placeholder="Teléfono"
                            />
                          </div>
                        ) : (
                          <>
                            <div className="font-medium text-brand-ink">{b.name}</div>
                            <div className="text-xs text-brand-ink-muted">{b.address ?? '—'}</div>
                            {b.phone ? (
                              <div className="text-xs text-brand-ink-muted">{b.phone}</div>
                            ) : null}
                          </>
                        )}
                      </td>
                      <td className="text-xs text-brand-ink-muted">
                        {b.comunaNombre ?? '—'}
                        {b.regionNombre ? ` · ${b.regionNombre}` : ''}
                      </td>
                      <td className="text-xs">{b.userCount}</td>
                      <td>
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                            b.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {b.isActive ? 'Activa' : 'Inactiva'}
                        </span>
                      </td>
                      <td className="text-right">
                        {editingBranchId === b.id ? (
                          <div className="flex flex-col items-end gap-1">
                            <button
                              type="button"
                              disabled={savingBranch}
                              onClick={() => void handleSaveBranch(b.id)}
                              className="text-xs font-medium text-brand-olive hover:underline disabled:opacity-50"
                            >
                              {savingBranch ? '…' : 'Guardar'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingBranchId(null)}
                              className="text-xs text-brand-ink-muted hover:underline"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-end gap-1">
                            <button
                              type="button"
                              onClick={() => startEditBranch(b)}
                              className="text-xs font-medium text-sky-700 hover:underline"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleToggleBranch(b)}
                              className="text-xs font-medium text-amber-800 hover:underline"
                            >
                              {b.isActive ? 'Desactivar' : 'Activar'}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {branches.length === 0 && (
                <p className="px-4 py-8 text-center text-brand-ink-muted">Sin sucursales en este tenant.</p>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'suscripcion' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="app-card rounded-2xl p-6">
            <h2 className="text-base font-semibold text-brand-ink">Estado de suscripción</h2>
            {empresa.suscripcion ? (
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-brand-ink-muted">Estado</dt>
                  <dd className="font-semibold">{empresa.suscripcion.estado}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-brand-ink-muted">Origen</dt>
                  <dd>{empresa.suscripcion.origen}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-brand-ink-muted">Vence</dt>
                  <dd>{formatDate(empresa.suscripcion.venceEn)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-brand-ink-muted">Próximo cobro</dt>
                  <dd>{formatDate(empresa.suscripcion.proximoCobroEn)}</dd>
                </div>
                {empresa.suscripcion.notas ? (
                  <div>
                    <dt className="text-brand-ink-muted">Notas</dt>
                    <dd className="mt-1 text-xs">{empresa.suscripcion.notas}</dd>
                  </div>
                ) : null}
              </dl>
            ) : (
              <p className="mt-4 text-sm text-brand-ink-muted">Sin registro de suscripción.</p>
            )}

            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void patchSuscripcion({ extendDays: 30 })}
                className="rounded-lg border border-sky-200 px-3 py-2 text-xs font-medium text-sky-800 hover:bg-sky-50"
              >
                +30 días piloto
              </button>
              <button
                type="button"
                onClick={() => void patchSuscripcion({ graceDays: 7 })}
                className="rounded-lg border border-amber-200 px-3 py-2 text-xs font-medium text-amber-900 hover:bg-amber-50"
              >
                +7 días gracia
              </button>
            </div>
          </section>

          <section className="app-card rounded-2xl p-6">
            <h2 className="text-base font-semibold text-brand-ink">Pago y checkout</h2>
            {checkout ? (
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-brand-ink-muted">Puede pagar</dt>
                  <dd>{checkout.canPay ? 'Sí' : 'No (ya activa o no aplica)'}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-brand-ink-muted">Total CLP</dt>
                  <dd className="font-semibold">${checkout.totalClp.toLocaleString('es-CL')}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-brand-ink-muted">Plan</dt>
                  <dd>
                    {checkout.planNombre} ({checkout.planCodigo as SaasPlanCodigo})
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="mt-4 text-sm text-brand-ink-muted">No se pudo cargar resumen de checkout.</p>
            )}

            <div className="mt-6 space-y-2">
              <button
                type="button"
                disabled={confirmingPay || checkout?.canPay === false}
                onClick={() => void handleConfirmSandboxPay()}
                className="app-btn-primary w-full text-sm disabled:opacity-50"
              >
                {confirmingPay ? 'Procesando…' : 'Confirmar pago sandbox (manual)'}
              </button>
              <p className="text-[11px] text-brand-ink-muted">
                Equivale a «Simular pago directo» del checkout público. Útil si Webpay falla en desarrollo.
              </p>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
