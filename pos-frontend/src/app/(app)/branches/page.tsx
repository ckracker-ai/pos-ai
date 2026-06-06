'use client';



import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '@/core/context/auth';
import { api } from '@/core/api/api-client';
import { extractList, extractEntity, normalizeBranch, normalizeUser, unwrapApiEnvelope } from '@/core/api/normalizers';
import { Branch, TerritoryComuna, TerritoryRegion } from '@/core/interfaces';
import { AppPageContent } from '@/components/molecules/AppPageContent';
import { DashboardLayout } from '@/components/molecules/DashboardLayout';
import { SidebarMenu } from '@/components/organisms/SidebarMenu';
import { Navbar } from '@/components/organisms/Navbar';
import { SearchInput } from '@/components/molecules/SearchInput';
import { StatusBadge } from '@/components/atoms/StatusBadge';
import { TableActions } from '@/components/molecules/TableActions';
import { ConfirmActionModal } from '@/components/molecules/ConfirmActionModal';
import { StatusFilterSelect, StatusFilterValue } from '@/components/molecules/StatusFilterSelect';
import { filterByStatusAndSearch } from '@/core/utils/soft-delete';
import { notifyApiError, notifySuccess, notifyUndoAction } from '@/store/ui';
import { getRoleProfile } from '@/core/config/role-access';

export default function BranchesPage() {
  const currentUser = useAuthStore((state) => state.user);
  const canManageBranches = getRoleProfile(currentUser?.role).canManageBranches;
  const [branches, setBranches] = useState<Branch[]>([]);
  const [activeUsersByBranch, setActiveUsersByBranch] = useState<Map<string, number>>(new Map());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>('active');
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
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
  const [regions, setRegions] = useState<TerritoryRegion[]>([]);
  const [comunas, setComunas] = useState<TerritoryComuna[]>([]);
  const [form, setForm] = useState({
    name: '',
    code: '',
    regionId: '',
    comunaId: '',
    codigoPostal: '',
    address: '',
    phone: '',
  });
  const isActionLocked = isConfirming || confirmModal.open;

  const filteredBranches = useMemo(
    () =>
      filterByStatusAndSearch(branches, statusFilter, searchTerm, (branch, q) =>
        [branch.name, branch.code, branch.city, branch.address, branch.phone]
          .join(' ')
          .toLowerCase()
          .includes(q)
      ),
    [branches, statusFilter, searchTerm]
  );

  const activeCount = useMemo(() => branches.filter((b) => b.isActive).length, [branches]);
  const inactiveCount = useMemo(() => branches.filter((b) => !b.isActive).length, [branches]);

  const handleInputChange = (field: string, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  useEffect(() => {
    const loadBranches = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const [branchesRes, usersRes] = await Promise.all([api.getBranches(), api.getUsers()]);
        const rows = extractList<Record<string, unknown>>(unwrapApiEnvelope(branchesRes.data), ['branches']);
        setBranches(rows.map((row) => normalizeBranch(row)));

        const userRows = extractList<Record<string, unknown>>(unwrapApiEnvelope(usersRes.data), ['users']);
        const counts = new Map<string, number>();
        for (const row of userRows) {
          const user = normalizeUser(row);
          if (user.isActive && user.branchId) {
            counts.set(user.branchId, (counts.get(user.branchId) ?? 0) + 1);
          }
        }
        setActiveUsersByBranch(counts);
      } catch (error) {
        const { displayMessage } = notifyApiError('branches.list', error, { toast: false });
        setErrorMessage(displayMessage);
        setSuccessMessage(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadBranches();
  }, []);

  useEffect(() => {
    const loadRegions = async () => {
      try {
        const res = await api.getTerritoryRegions();
        const rows = extractList<Record<string, unknown>>(unwrapApiEnvelope(res.data), ['regions']);
        setRegions(
          rows.map((r) => ({
            codigoCut: String(r.codigoCut ?? r.codigo_cut ?? ''),
            nombre: String(r.nombre ?? ''),
            sigla: String(r.sigla ?? ''),
          }))
        );
      } catch {
        setRegions([]);
        setErrorMessage('No se pudieron cargar las regiones CUT. Recarga e intenta nuevamente.');
        setSuccessMessage(null);
      }
    };
    void loadRegions();
  }, []);

  useEffect(() => {
    if (!form.regionId) {
      setComunas([]);
      return;
    }
    const loadComunas = async () => {
      try {
        const res = await api.getTerritoryComunas(form.regionId);
        const rows = extractList<Record<string, unknown>>(unwrapApiEnvelope(res.data), ['comunas']);
        setComunas(
          rows.map((c) => ({
            codigoCut: String(c.codigoCut ?? c.codigo_cut ?? ''),
            nombre: String(c.nombre ?? ''),
            regionId: String(c.regionId ?? c.region_id ?? form.regionId),
            regionNombre: c.regionNombre != null ? String(c.regionNombre) : null,
          }))
        );
      } catch {
        setComunas([]);
        setErrorMessage('No se pudieron cargar las comunas para la región seleccionada.');
        setSuccessMessage(null);
      }
    };
    void loadComunas();
  }, [form.regionId]);

  const handleSaveBranch = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const missing: string[] = [];
    const name = form.name.trim();
    const address = form.address.trim();
    const codigoPostal = form.codigoPostal.trim();

    if (!name) missing.push('Nombre de sucursal');
    if (!form.regionId) missing.push('Región (CUT)');
    if (!form.comunaId) missing.push('Comuna');
    if (!codigoPostal) missing.push('Código postal (7 dígitos)');
    else if (!/^\d{7}$/.test(codigoPostal)) missing.push('Código postal (7 dígitos)');
    if (!address) missing.push('Dirección');

    if (missing.length) {
      setErrorMessage(`Completa los datos requeridos: ${missing.join(', ')}.`);
      return;
    }

    if (regions.length === 0) {
      setErrorMessage('Las regiones CUT no están cargadas. Selecciona nuevamente la región y reintenta.');
      return;
    }

    const payload = {
      name,
      address,
      phone: form.phone.trim() || undefined,
      comunaId: form.comunaId,
      codigoPostal,
    };

    try {
      setSuccessMessage(null);
      if (editingBranch) {
        await api.updateBranch(editingBranch.id, payload);
      } else {
        await api.createBranch({ ...payload, code: form.code.trim() || undefined });
      }

      const response = await api.getBranches();
      const rows = extractList<Record<string, unknown>>(unwrapApiEnvelope(response.data), ['branches']);
      setBranches(rows.map((row) => normalizeBranch(row)));

      setShowModal(false);
      setEditingBranch(null);
      setErrorMessage(null);
      setForm({
        name: '',
        code: '',
        regionId: '',
        comunaId: '',
        codigoPostal: '',
        address: '',
        phone: '',
      });
      const successText = editingBranch ? 'Sucursal actualizada correctamente' : 'Sucursal creada correctamente';
      setSuccessMessage(successText);
      notifySuccess(successText);
    } catch (error) {
      const { displayMessage } = notifyApiError('branches.save', error);
      setErrorMessage(displayMessage);
      setSuccessMessage(null);
    }
  };

  const handleDeactivateBranch = async (branch: Branch) => {
    const previous = branch;
    setBranches((current) =>
      current.map((b) => (b.id === branch.id ? { ...b, isActive: false } : b))
    );
    try {
      await api.deleteBranch(branch.id);
      setErrorMessage(null);
      setSuccessMessage(null);
      notifyUndoAction({
        title: 'Sucursal desactivada',
        message: `"${branch.name}" ya no aparecerá en ventas. Las ventas históricas se conservan.`,
        onUndo: async () => {
          await api.restoreBranch(branch.id);
          setBranches((current) =>
            current.map((b) => (b.id === branch.id ? { ...b, isActive: true } : b))
          );
          notifySuccess('Sucursal restaurada');
        },
      });
    } catch (error) {
      setBranches((current) => current.map((b) => (b.id === branch.id ? previous : b)));
      const { displayMessage } = notifyApiError('branches.delete', error);
      setErrorMessage(displayMessage);
    }
  };

  const handleRestoreBranch = async (branch: Branch) => {
    try {
      const response = await api.restoreBranch(branch.id);
      const row = extractEntity<Record<string, unknown>>(unwrapApiEnvelope(response.data), ['branch']);
      const restored = row ? normalizeBranch(row) : { ...branch, isActive: true };
      setBranches((current) => current.map((b) => (b.id === branch.id ? restored : b)));
      setErrorMessage(null);
      notifySuccess('Sucursal restaurada');
    } catch (error) {
      notifyApiError('branches.restore', error);
    }
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
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
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="app-eyebrow">Sucursales</p>
              <h1 className="mt-3 text-3xl font-semibold text-[#3D4532]">Mantenedor de sucursales</h1>
              <p className="mt-2 max-w-2xl text-brand-ink-muted/80">
                {canManageBranches
                  ? 'Administra sucursales fijas y puestos temporales (eventos). Usa Desactivar cuando una sucursal cierra: deja de aparecer en ventas nuevas, pero ventas, inventario y reportes históricos se conservan. Restaura desde el filtro Inactivos.'
                  : 'Consulta sucursales para auditoría. Solo el administrador puede crear, editar o desactivar locales.'}
              </p>
              {!canManageBranches && (
                <p className="mt-2 text-sm text-amber-300/90">
                  Modo solo lectura: puedes cambiar la sucursal activa en el encabezado, no desde aquí.
                </p>
              )}
              {currentUser && (
                <p className="mt-3 text-sm text-brand-ink-muted">Sesión iniciada como: {currentUser.name}</p>
              )}
              {errorMessage && (
                <p className="mt-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                  {errorMessage}
                </p>
              )}
              {successMessage && (
                <p className="mt-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                  {successMessage}
                </p>
              )}
              {isLoading && <p className="mt-3 text-sm text-brand-ink-muted">Cargando sucursales desde BFF...</p>}
            </div>
            {canManageBranches && (
              <button
                onClick={() => {
                  setEditingBranch(null);
                  setForm({
        name: '',
        code: '',
        regionId: '',
        comunaId: '',
        codigoPostal: '',
        address: '',
        phone: '',
      });
                  setErrorMessage(null);
                  setSuccessMessage(null);
                  setShowModal(true);
                }}
                disabled={isActionLocked}
                className="app-btn-primary inline-flex items-center justify-center rounded-3xl px-6 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
              >
                + Nueva sucursal
              </button>
            )}
          </div>

          <div className="grid w-full grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,0.9fr)]">
            <section className="app-card rounded-3xl p-6 shadow-lg">
              <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-[#3D4532]">Sucursales</h2>
                  <p className="text-sm text-brand-ink-muted">
                    Busca por nombre, código o ciudad. Activas: {activeCount} · Inactivas: {inactiveCount}
                  </p>
                </div>
                <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-center">
                  <StatusFilterSelect value={statusFilter} onChange={setStatusFilter} />
                  <div className="w-full md:w-80">
                  <SearchInput
                    placeholder="Buscar sucursal"
                    items={branches}
                    searchKeys={['name', 'code', 'city', 'address', 'phone']}
                    onSearch={handleSearch}
                    onSelect={(branch) => setSelectedBranch(branch)}
                    renderItem={(branch) => (
                      <div>
                        <span className="font-medium">{branch.name}</span>
                        <div className="text-xs text-brand-ink-muted/80">{branch.city} · {branch.code}</div>
                      </div>
                    )}
                  />
                  </div>
                </div>
              </div>

              {selectedBranch && (
                <div className="mb-6 rounded-3xl border border-[rgba(209,199,189,0.75)] bg-[rgba(74,83,60,0.06)] p-4">
                  <p className="text-sm text-brand-ink-muted">Sucursal seleccionada</p>
                  <h3 className="mt-2 text-lg font-semibold text-[#3D4532]">{selectedBranch.name}</h3>
                  <p className="text-sm text-brand-ink-muted">{selectedBranch.city} · {selectedBranch.phone}</p>
                </div>
              )}

              <div className="app-table-wrap overflow-x-auto">
                <table className="app-table min-w-full text-left text-sm">
                  <thead>
                    <tr>
                      <th className="px-6 py-4">Sucursal</th>
                      <th className="px-6 py-4">Código</th>
                      <th className="px-6 py-4">Comuna / CP</th>
                      <th className="px-6 py-4">Teléfono</th>
                      <th className="px-6 py-4">Estado</th>
                      <th className="px-6 py-4">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBranches.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-brand-ink-muted">
                          No se encontraron sucursales.
                        </td>
                      </tr>
                    ) : (
                      filteredBranches.map((branch) => (
                        <tr key={branch.id} className="transition">
                          <td className="px-6 py-5">
                            <p className="font-semibold text-[#3D4532]">{branch.name}</p>
                            <p className="text-xs text-brand-ink-muted">{branch.address}</p>
                          </td>
                          <td className="px-6 py-5 text-brand-ink-muted">{branch.code}</td>
                          <td className="px-6 py-5 text-brand-ink-muted">
                            {branch.comunaNombre ?? branch.city}
                            {branch.codigoPostal ? (
                              <span className="block text-xs text-brand-ink-muted">CP {branch.codigoPostal}</span>
                            ) : null}
                          </td>
                          <td className="px-6 py-5 text-brand-ink-muted">{branch.phone}</td>
                          <td className="px-6 py-5">
                            <StatusBadge active={branch.isActive} />
                          </td>
                          <td className="px-6 py-5">
                            <TableActions
                              disabled={isActionLocked}
                              isInactive={!branch.isActive}
                              onEdit={
                                canManageBranches
                                  ? () => {
                                setSelectedBranch(branch);
                                setEditingBranch(branch);
                                setForm({
                                  name: branch.name,
                                  code: branch.code,
                                  regionId: branch.regionId ?? '',
                                  comunaId: branch.comunaId ?? '',
                                  codigoPostal: branch.codigoPostal ?? '',
                                  address: branch.address,
                                  phone: branch.phone,
                                });
                                setErrorMessage(null);
                                setSuccessMessage(null);
                                setShowModal(true);
                              }
                                  : undefined
                              }
                              onDelete={
                                canManageBranches
                                  ? () => {
                                const assignedUsers = activeUsersByBranch.get(branch.id) ?? 0;
                                const userNote =
                                  assignedUsers > 0
                                    ? ` Hay ${assignedUsers} usuario(s) activo(s) asignado(s); podrás reasignarlos desde Usuarios.`
                                    : '';
                                askConfirmation(
                                  'Desactivar sucursal',
                                  `¿Desactivar "${branch.name}"? No aparecerá en el selector de ventas. El historial de ventas e inventario se conserva.${userNote}`,
                                  'Desactivar',
                                  'danger',
                                  () => handleDeactivateBranch(branch)
                                );
                              }
                                  : undefined
                              }
                              onRestore={
                                canManageBranches ? () => handleRestoreBranch(branch) : undefined
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

            <aside className="space-y-6">
              <div className="app-card rounded-3xl p-6 shadow-lg">
                <p className="text-sm uppercase tracking-[0.28em] text-brand-ink-muted">Notas</p>
                <p className="mt-4 text-brand-ink-muted text-sm leading-6">
                  Desactivar no elimina datos. Sirve para sucursales cerradas o puestos de evento que ya
                  terminaron. Los registros inactivos quedan disponibles en reportes y auditoría.
                </p>
              </div>

              <div className="app-card rounded-3xl p-6 shadow-lg">
                <p className="text-sm uppercase tracking-[0.28em] text-brand-ink-muted">Resumen rápido</p>
                <div className="mt-4 space-y-3 text-brand-ink-muted">
                  <div className="rounded-3xl border border-[rgba(209,199,189,0.75)] bg-[rgba(74,83,60,0.06)] p-4">
                    <p className="text-sm">Sucursales totales</p>
                    <p className="mt-1 text-2xl font-semibold text-[#3D4532]">{branches.length}</p>
                  </div>
                  <div className="rounded-3xl border border-[rgba(209,199,189,0.75)] bg-[rgba(74,83,60,0.06)] p-4">
                    <p className="text-sm">Sucursales mostradas</p>
                    <p className="mt-1 text-2xl font-semibold text-[#3D4532]">{filteredBranches.length}</p>
                  </div>
                </div>
              </div>
            </aside>
          </div>
      </AppPageContent>

      {showModal && (
        <div className="app-modal-overlay">
          <div className="app-modal-panel w-full max-w-2xl rounded-[2rem] p-8 shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-brand-ink-muted">
                  {editingBranch ? 'Modificar Sucursal' : 'Nueva Sucursal'}
                </p>
                <h2 className="mt-3 text-2xl font-semibold text-[#3D4532]">
                  {editingBranch ? 'Actualizar sucursal' : 'Agregar nueva sucursal'}
                </h2>
              </div>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingBranch(null);
                }}
                className="rounded-full border border-[rgba(209,199,189,0.75)] bg-[rgba(74,83,60,0.06)] px-4 py-2 text-brand-ink-muted hover:bg-[rgba(74,83,60,0.12)] transition"
              >
                ✕
              </button>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <label className="block text-sm text-brand-ink-muted">
                Nombre de sucursal
                <input
                  value={form.name}
                  onChange={(event) => handleInputChange('name', event.target.value)}
                  className="app-input mt-2 w-full rounded-3xl px-4 py-3"
                />
              </label>
              <label className="block text-sm text-brand-ink-muted">
                Código
                <input
                  value={form.code}
                  onChange={(event) => handleInputChange('code', event.target.value)}
                  className="app-input mt-2 w-full rounded-3xl px-4 py-3"
                />
              </label>
              <label className="block text-sm text-brand-ink-muted">
                Región (CUT)
                <select
                  value={form.regionId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      regionId: event.target.value,
                      comunaId: '',
                    }))
                  }
                  className="app-select mt-2 w-full rounded-3xl px-4 py-3"
                >
                  <option value="">Selecciona región</option>
                  {regions.map((r) => (
                    <option key={r.codigoCut} value={r.codigoCut}>
                      {r.nombre}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm text-brand-ink-muted">
                Comuna
                <select
                  value={form.comunaId}
                  onChange={(event) => handleInputChange('comunaId', event.target.value)}
                  disabled={!form.regionId}
                  className="app-select mt-2 w-full rounded-3xl px-4 py-3 disabled:opacity-50"
                >
                  <option value="">Selecciona comuna</option>
                  {comunas.map((c) => (
                    <option key={c.codigoCut} value={c.codigoCut}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm text-brand-ink-muted">
                Código postal (7 dígitos)
                <input
                  value={form.codigoPostal}
                  onChange={(event) =>
                    handleInputChange('codigoPostal', event.target.value.replace(/\D/g, '').slice(0, 7))
                  }
                  placeholder="Ej. 9160000"
                  className="app-input mt-2 w-full rounded-3xl px-4 py-3"
                />
              </label>
              <label className="block text-sm text-brand-ink-muted">
                Teléfono
                <input
                  value={form.phone}
                  onChange={(event) => handleInputChange('phone', event.target.value)}
                  className="app-input mt-2 w-full rounded-3xl px-4 py-3"
                />
              </label>
              <label className="block text-sm text-brand-ink-muted md:col-span-2">
                Dirección
                <input
                  value={form.address}
                  onChange={(event) => handleInputChange('address', event.target.value)}
                  className="app-input mt-2 w-full rounded-3xl px-4 py-3"
                />
              </label>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingBranch(null);
                }}
                disabled={isActionLocked}
                className="app-btn-secondary rounded-3xl px-6 py-3 text-sm transition disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={() =>
                  askConfirmation(
                    editingBranch ? 'Guardar cambios de sucursal' : 'Crear sucursal',
                    editingBranch
                      ? '¿Confirmas la modificación de esta sucursal?'
                      : '¿Confirmas la creación de esta sucursal?',
                    editingBranch ? 'Guardar cambios' : 'Crear sucursal',
                    'primary',
                    handleSaveBranch
                  )
                }
                disabled={isActionLocked}
                className="app-btn-primary rounded-3xl px-6 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
              >
                {editingBranch ? 'Guardar cambios' : 'Guardar sucursal'}
              </button>
            </div>
          </div>
        </div>
      )}
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


