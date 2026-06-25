'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { api } from '@/core/api/api-client';
import {
  extractList,
  normalizeBranch,
  normalizeRoleName,
  normalizeUser,
  unwrapApiEnvelope,
} from '@/core/api/normalizers';
import { Branch, RoleOption, User } from '@/core/interfaces';
import { Navbar } from '@/components/organisms/Navbar';
import { SidebarMenu } from '@/components/organisms/SidebarMenu';
import { AppPageContent } from '@/components/molecules/AppPageContent';
import { AppPageHeader } from '@/components/molecules/AppPageHeader';
import { DashboardLayout } from '@/components/molecules/DashboardLayout';
import { StatusBadge } from '@/components/atoms/StatusBadge';
import { TableActions } from '@/components/molecules/TableActions';
import { ConfirmActionModal } from '@/components/molecules/ConfirmActionModal';
import { ResetPasswordModal } from '@/components/molecules/ResetPasswordModal';
import {
  StatusFilterSelect,
  StatusFilterValue,
  matchesStatusFilter,
} from '@/components/molecules/StatusFilterSelect';
import { notifyApiError, notifySuccess, notifyUndoAction } from '@/store/ui';
import { getRoleProfile } from '@/core/config/role-access';

type UserRow = User & { branchName: string; roleId: string };

const roleLabels: Record<string, string> = {
  admin: 'Administrador',
  seller: 'Vendedor',
  auditor: 'Auditor',
  comanda: 'Comanda',
  delivery: 'Repartidor',
  user: 'Usuario',
};

export default function UsersPage() {
  const currentUser = useAuthStore((state) => state.user);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [passwordModal, setPasswordModal] = useState<{ open: boolean; user: UserRow | null }>({
    open: false,
    user: null,
  });
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    variant: 'primary' | 'danger';
    action: null | (() => Promise<void>);
  }>({
    open: false,
    title: '',
    message: '',
    confirmLabel: 'Confirmar',
    variant: 'primary',
    action: null,
  });
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>('active');
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    roleId: '',
    branchId: '',
    whatsappPhone: '',
    isActive: true,
  });
  const isActionLocked = isConfirming || confirmModal.open || passwordModal.open;

  const branchNameById = useMemo(
    () => new Map(branches.map((b) => [b.id, b.name])),
    [branches]
  );

  const assignableBranches = useMemo(() => branches.filter((b) => b.isActive), [branches]);

  const activeUserCount = useMemo(() => users.filter((user) => user.isActive).length, [users]);
  const inactiveUserCount = useMemo(() => users.filter((user) => !user.isActive).length, [users]);
  const roleProfile = getRoleProfile(currentUser?.role);
  const canManageUserLifecycle = roleProfile.canManageUsers;
  const activeAdminCount = useMemo(
    () => users.filter((user) => user.isActive && user.role === 'admin').length,
    [users]
  );

  const filteredUsers = useMemo(
    () => users.filter((user) => matchesStatusFilter(user.isActive, statusFilter)),
    [users, statusFilter]
  );

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const [usersRes, branchesRes, rolesRes] = await Promise.all([
          api.getUsers(),
          api.getBranches(),
          api.getRoles(),
        ]);

        const branchRows = extractList<Record<string, unknown>>(
          unwrapApiEnvelope(branchesRes.data),
          ['branches']
        );
        const loadedBranches = branchRows.map((row) => normalizeBranch(row));
        setBranches(loadedBranches);

        const roleRows = extractList<Record<string, unknown>>(unwrapApiEnvelope(rolesRes.data), ['roles']);
        const loadedRoles = roleRows.map((row) => ({
          id: String(row.id),
          name: String(row.name),
        }));
        setRoles(loadedRoles);

        const branchMap = new Map(loadedBranches.map((b) => [b.id, b.name]));
        const roleNameById = new Map(loadedRoles.map((r) => [r.id, r.name]));
        const userRows = extractList<Record<string, unknown>>(unwrapApiEnvelope(usersRes.data), ['users']);
        setUsers(
          userRows.map((row) => {
            const roleId = String((row as any).roleId ?? '');
            const roleName = roleNameById.get(roleId);
            const user = normalizeUser(row);
            return {
              ...user,
              roleId,
              role: normalizeRoleName(roleName),
              branchName: branchMap.get(user.branchId ?? '') ?? 'Sin sucursal',
            };
          })
        );

        if (loadedRoles[0]) {
          setForm((c) => ({
            ...c,
            roleId: c.roleId || loadedRoles[0].id,
            branchId: c.branchId || loadedBranches[0]?.id || '',
          }));
        }
      } catch (error) {
        const { displayMessage } = notifyApiError('users.list', error, { toast: false });
        setErrorMessage(displayMessage);
        setSuccessMessage(null);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, []);

  useEffect(() => {
    setUsers((current) =>
      current.map((user) => ({
        ...user,
        branchName: branchNameById.get(user.branchId ?? '') ?? 'Sin sucursal',
      }))
    );
  }, [branchNameById]);

  const handleSave = async () => {
    if (!form.name || !form.email || !form.roleId) return;

    try {
      setSuccessMessage(null);
      if (editingUser) {
        await api.updateUser(editingUser.id, {
          fullName: form.name,
          email: form.email,
          roleId: form.roleId,
          isActive: form.isActive,
          whatsappPhone: form.whatsappPhone.trim() || null,
        });
      } else {
        if (!form.password || !form.branchId) return;
        await api.register({
          fullName: form.name,
          email: form.email,
          password: form.password,
          roleId: form.roleId,
          branchId: form.branchId,
          isActive: form.isActive,
          whatsappPhone: form.whatsappPhone.trim() || null,
        });
      }

      const response = await api.getUsers();
      const userRows = extractList<Record<string, unknown>>(unwrapApiEnvelope(response.data), ['users']);
      const roleNameById = new Map(roles.map((r) => [r.id, r.name]));

      setUsers(
        userRows.map((row) => {
          const user = normalizeUser(row);
          const roleId = String((row as any).roleId ?? '');
          const roleName = roleNameById.get(roleId);
          return {
            ...user,
            roleId,
            role: normalizeRoleName(roleName),
            branchName: branchNameById.get(user.branchId ?? '') ?? 'Sin sucursal',
          };
        })
      );

      setShowModal(false);
      setEditingUser(null);
      setForm({
        name: '',
        email: '',
        password: '',
        roleId: roles[0]?.id ?? '',
        branchId: assignableBranches[0]?.id ?? '',
        whatsappPhone: '',
        isActive: true,
      });
      setErrorMessage(null);
      const successText = editingUser ? 'Usuario actualizado correctamente' : 'Usuario creado correctamente';
      setSuccessMessage(successText);
      notifySuccess(successText);
    } catch (error) {
      const { displayMessage } = notifyApiError('users.save', error);
      setErrorMessage(displayMessage);
      setSuccessMessage(null);
    }
  };

  const handleDeactivate = async (user: UserRow) => {
    if (user.id === currentUser?.id) {
      setErrorMessage('No puedes desactivar tu propia cuenta mientras estás conectado.');
      return;
    }
    if (user.role === 'admin' && user.isActive && activeAdminCount <= 1) {
      setErrorMessage('Debe quedar al menos un administrador activo en el sistema.');
      return;
    }

    const previous = user;
    setUsers((current) =>
      current.map((row) => (row.id === user.id ? { ...row, isActive: false } : row))
    );
    try {
      await api.deleteUser(user.id);
      setErrorMessage(null);
      setSuccessMessage(null);
      notifyUndoAction({
        title: 'Usuario desactivado',
        message: `${user.name} ya no podrá iniciar sesión. El historial de ventas y reportes se conserva. Filtra por Inactivos para restaurar.`,
        onUndo: async () => {
          await api.restoreUser(user.id);
          setUsers((current) =>
            current.map((row) => (row.id === user.id ? { ...row, isActive: true } : row))
          );
          notifySuccess('Usuario restaurado');
        },
      });
    } catch (error) {
      setUsers((current) =>
        current.map((row) => (row.id === user.id ? previous : row))
      );
      const { displayMessage } = notifyApiError('users.delete', error);
      setErrorMessage(displayMessage);
    }
  };

  const handleRestore = async (user: UserRow) => {
    try {
      await api.restoreUser(user.id);
      setUsers((current) =>
        current.map((row) => (row.id === user.id ? { ...row, isActive: true } : row))
      );
      setErrorMessage(null);
      notifySuccess('Usuario restaurado');
    } catch (error) {
      notifyApiError('users.restore', error);
    }
  };

  const handleResetPassword = async (password: string) => {
    if (!passwordModal.user) return;

    try {
      setIsResettingPassword(true);
      await api.resetUserPassword(passwordModal.user.id, password);
      setErrorMessage(null);
      const successText = `Contraseña restablecida para ${passwordModal.user.email}`;
      setSuccessMessage(successText);
      notifySuccess(successText);
      setPasswordModal({ open: false, user: null });
    } catch (error) {
      const { displayMessage } = notifyApiError('users.resetPassword', error);
      setErrorMessage(displayMessage);
      setSuccessMessage(null);
      throw error;
    } finally {
      setIsResettingPassword(false);
    }
  };

  const askConfirmation = (
    title: string,
    message: string,
    confirmLabel: string,
    variant: 'primary' | 'danger',
    action: () => Promise<void>
  ) => setConfirmModal({ open: true, title, message, confirmLabel, variant, action });

  const handleConfirmAction = async () => {
    if (!confirmModal.action) return;
    try {
      setIsConfirming(true);
      await confirmModal.action();
    } finally {
      setIsConfirming(false);
      setConfirmModal((m) => ({ ...m, open: false, action: null }));
    }
  };

  return (
    <DashboardLayout sidebar={<SidebarMenu />} header={<Navbar />}>
      <AppPageContent>
          <AppPageHeader
            kicker="Usuarios"
            title="Mantenedor de usuarios"
            description="Desactiva a quien ya no trabaja en la empresa con el botón Desactivar en cada fila. No se borra el registro: ventas y reportes históricos conservan su nombre. Usa el filtro Inactivos para ver o restaurar cuentas."
            meta={
              <>
                {!canManageUserLifecycle && (
                  <p className="text-amber-800">
                    Modo consulta: solo el administrador puede crear, editar, desactivar o restaurar usuarios.
                  </p>
                )}
                {currentUser ? (
                  <p>
                    Sesión: {currentUser.name} ({roleLabels[currentUser.role] ?? currentUser.role})
                  </p>
                ) : null}
              </>
            }
            actions={
              canManageUserLifecycle ? (
                <button
                  onClick={() => {
                    setEditingUser(null);
                    setForm({
                      name: '',
                      email: '',
                      password: '',
                      roleId: roles[0]?.id ?? '',
                      branchId: assignableBranches[0]?.id ?? '',
                      whatsappPhone: '',
                      isActive: true,
                    });
                    setErrorMessage(null);
                    setSuccessMessage(null);
                    setShowModal(true);
                  }}
                  disabled={isActionLocked}
                  className="app-btn-primary inline-flex items-center justify-center rounded-3xl px-6 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
                >
                  + Nuevo Usuario
                </button>
              ) : undefined
            }
          />
          {errorMessage && <p className="mb-4 app-alert-error">{errorMessage}</p>}
          {successMessage && <p className="mb-4 app-alert-success">{successMessage}</p>}
          {isLoading && <p className="mb-4 text-sm text-brand-ink-muted">Cargando usuarios desde BFF...</p>}

          <section className="app-card rounded-3xl p-6 shadow-lg">
            <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex flex-wrap gap-3">
                <span className="rounded-full border border-[rgba(74,83,60,0.25)] bg-[rgba(74,83,60,0.08)] px-4 py-2 text-sm text-[#4A533C]">
                  Total: {users.length}
                </span>
                <span className="rounded-full border border-[rgba(74,83,60,0.25)] bg-[rgba(74,83,60,0.08)] px-4 py-2 text-sm text-[#4A533C]">
                  Activos: {activeUserCount}
                </span>
                <span className="rounded-full border border-[rgba(74,83,60,0.25)] bg-[rgba(74,83,60,0.08)] px-4 py-2 text-sm text-[#4A533C]">
                  Inactivos: {inactiveUserCount}
                </span>
              </div>
              <StatusFilterSelect
                value={statusFilter}
                onChange={setStatusFilter}
                disabled={isActionLocked}
              />
            </div>

            <div className="app-table-wrap overflow-x-auto">
              <table className="app-table min-w-full text-left text-sm">
                <thead>
                  <tr>
                    <th className="px-6 py-4">Usuario</th>
                    <th className="px-6 py-4">Rol</th>
                    <th className="px-6 py-4">Sucursal</th>
                    <th className="px-6 py-4">WSP alertas</th>
                    <th className="px-6 py-4">Estado</th>
                    <th className="px-6 py-4">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {!isLoading && filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-brand-ink-muted">
                        No hay usuarios con el filtro seleccionado.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user.id} className="transition">
                        <td className="px-6 py-5">
                          <p className="font-semibold text-[#3D4532]">{user.name}</p>
                          <p className="text-xs text-brand-ink-muted">{user.email}</p>
                        </td>
                        <td className="px-6 py-5">
                          <span className="inline-flex rounded-full border border-[rgba(74,83,60,0.2)] bg-[rgba(74,83,60,0.08)] px-3 py-1 text-xs uppercase tracking-[0.2em] text-[#4A533C]">
                            {roleLabels[user.role] ?? user.role}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-brand-ink-muted">{user.branchName}</td>
                        <td className="px-6 py-5 font-mono text-xs text-brand-ink-muted/80">
                          {user.whatsappPhone ? `+${user.whatsappPhone}` : '—'}
                        </td>
                        <td className="px-6 py-5">
                          <StatusBadge active={user.isActive} />
                        </td>
                        <td className="px-6 py-5">
                          {canManageUserLifecycle && user.isActive && (
                            <button
                              type="button"
                              disabled={isActionLocked}
                              onClick={() => {
                                setPasswordModal({ open: true, user });
                                setErrorMessage(null);
                                setSuccessMessage(null);
                              }}
                              className="mb-2 rounded-full border border-[rgba(176,138,76,0.5)] bg-[rgba(176,138,76,0.08)] px-3 py-1 text-xs font-semibold text-[#8C6A2B] hover:bg-[rgba(176,138,76,0.14)] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Reset clave
                            </button>
                          )}
                          <TableActions
                            disabled={isActionLocked}
                            isInactive={!user.isActive}
                            onEdit={
                              canManageUserLifecycle
                                ? () => {
                              setEditingUser(user);
                              setForm({
                                name: user.name,
                                email: user.email,
                                password: '',
                                roleId: user.roleId,
                                branchId: user.branchId ?? '',
                                whatsappPhone: user.whatsappPhone ?? '',
                                isActive: user.isActive,
                              });
                              setShowModal(true);
                            }
                                : undefined
                            }
                            onRestore={
                              canManageUserLifecycle ? () => handleRestore(user) : undefined
                            }
                            onDelete={
                              canManageUserLifecycle &&
                              user.id !== currentUser?.id &&
                              !(user.role === 'admin' && user.isActive && activeAdminCount <= 1)
                                ? () =>
                                    askConfirmation(
                                      'Desactivar usuario',
                                      `¿Desactivar a "${user.name}"? No podrá iniciar sesión. Su historial en ventas y reportes se conserva. Puedes restaurarlo desde Inactivos.`,
                                      'Desactivar',
                                      'danger',
                                      () => handleDeactivate(user)
                                    )
                                : undefined
                            }
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
      </AppPageContent>

      {showModal && (
        <div className="app-modal-overlay">
          <div className="app-modal-panel w-full max-w-2xl rounded-[2rem] p-8 shadow-2xl">
            <h2 className="text-2xl font-semibold text-[#3D4532]">
              {editingUser ? 'Modificar usuario' : 'Nuevo usuario'}
            </h2>
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <label className="block text-sm text-brand-ink-muted">
                Nombre completo
                <input
                  value={form.name}
                  onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))}
                  className="app-input mt-2 w-full rounded-3xl px-4 py-3"
                />
              </label>
              <label className="block text-sm text-brand-ink-muted">
                Correo
                <input
                  value={form.email}
                  onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))}
                  className="app-input mt-2 w-full rounded-3xl px-4 py-3"
                />
              </label>
              {!editingUser && (
                <label className="block text-sm text-brand-ink-muted md:col-span-2">
                  Contraseña
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm((c) => ({ ...c, password: e.target.value }))}
                    className="app-input mt-2 w-full rounded-3xl px-4 py-3"
                  />
                </label>
              )}
              <label className="block text-sm text-brand-ink-muted">
                Rol
                <select
                  value={form.roleId}
                  onChange={(e) => setForm((c) => ({ ...c, roleId: e.target.value }))}
                  className="app-select mt-2 w-full rounded-3xl px-4 py-3"
                >
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm text-brand-ink-muted md:col-span-2">
                WhatsApp alertas comprobante
                <input
                  type="tel"
                  value={form.whatsappPhone}
                  onChange={(e) => setForm((c) => ({ ...c, whatsappPhone: e.target.value }))}
                  placeholder="56900000003 (E.164 sin +)"
                  className="app-input app-input-mono mt-2 w-full rounded-3xl px-4 py-3"
                />
                <span className="mt-1 block text-xs text-brand-ink-muted">
                  Vendedor o admin de sucursal: recibe aviso cuando llega un comprobante por WSP.
                </span>
              </label>
              <label className="block text-sm text-brand-ink-muted">
                Sucursal {editingUser ? '(solo lectura)' : ''}
                <select
                  value={form.branchId}
                  onChange={(e) => setForm((c) => ({ ...c, branchId: e.target.value }))}
                  disabled={!!editingUser}
                  className="app-select mt-2 w-full rounded-3xl px-4 py-3"
                >
                  {assignableBranches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-3 rounded-2xl border border-[rgba(74,83,60,0.22)] bg-[rgba(74,83,60,0.06)] px-4 py-3 text-sm text-[#3D4532] md:col-span-2">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((c) => ({ ...c, isActive: e.target.checked }))}
                  className="h-4 w-4 rounded border-[rgba(74,83,60,0.3)] bg-white text-[#4A533C]"
                />
                Usuario activo
              </label>
            </div>
            <div className="mt-8 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="app-btn-secondary rounded-3xl px-6 py-3">
                Cancelar
              </button>
              <button
                onClick={() =>
                  askConfirmation(
                    editingUser ? 'Guardar cambios de usuario' : 'Crear usuario',
                    editingUser
                      ? '¿Confirmas la modificación de este usuario?'
                      : '¿Confirmas la creación de este usuario?',
                    editingUser ? 'Guardar cambios' : 'Crear',
                    'primary',
                    handleSave
                  )
                }
                disabled={isActionLocked}
                className="app-btn-primary rounded-3xl px-6 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
      <ResetPasswordModal
        open={passwordModal.open}
        userEmail={passwordModal.user?.email}
        isProcessing={isResettingPassword}
        onCancel={() => setPasswordModal({ open: false, user: null })}
        onSubmit={handleResetPassword}
      />
      <ConfirmActionModal
        open={confirmModal.open}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel={confirmModal.confirmLabel}
        variant={confirmModal.variant}
        isProcessing={isConfirming}
        onCancel={() => setConfirmModal((m) => ({ ...m, open: false, action: null }))}
        onConfirm={handleConfirmAction}
      />
    </DashboardLayout>
  );
}
