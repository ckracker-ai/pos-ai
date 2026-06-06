'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/core/api/api-client';
import { extractList, extractEntity, normalizeSupplier, unwrapApiEnvelope } from '@/core/api/normalizers';
import { Supplier } from '@/core/interfaces';
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

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>('active');
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [isSaving, setIsSaving] = useState(false);
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
  const [form, setForm] = useState({
    name: '',
    contactEmail: '',
    contactPhone: '',
    address: '',
  });
  const isActionLocked = isSaving || confirmModal.open;

  const loadSuppliers = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await api.getSuppliers();
      const rows = extractList<Record<string, unknown>>(unwrapApiEnvelope(response.data), ['suppliers']);
      setSuppliers(rows.map((row) => normalizeSupplier(row)));
    } catch (error) {
      const { displayMessage } = notifyApiError('suppliers.list', error, { toast: false });
      setErrorMessage(displayMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  const filtered = useMemo(
    () =>
      filterByStatusAndSearch(suppliers, statusFilter, searchTerm, (s, q) =>
        [s.name, s.contactEmail, s.contactPhone, s.address].join(' ').toLowerCase().includes(q)
      ),
    [suppliers, statusFilter, searchTerm]
  );

  const activeCount = useMemo(() => suppliers.filter((s) => s.isActive).length, [suppliers]);

  const askConfirmation = (
    title: string,
    message: string,
    confirmLabel: string,
    variant: 'primary' | 'danger',
    action: () => Promise<void>
  ) => {
    setConfirmModal({ open: true, title, message, confirmLabel, variant, action });
  };

  const handleConfirmAction = async () => {
    if (!confirmModal.action) return;
    try {
      setIsSaving(true);
      await confirmModal.action();
    } finally {
      setIsSaving(false);
      setConfirmModal((m) => ({ ...m, open: false, action: null }));
    }
  };

  const handleSaveSupplier = async () => {
    if (!form.name.trim()) return;
    try {
      setSuccessMessage(null);
      if (editingSupplier) {
        const response = await api.updateSupplier(editingSupplier.id, {
          name: form.name.trim(),
          contactEmail: form.contactEmail || null,
          contactPhone: form.contactPhone || null,
          address: form.address || null,
        });
        const updated = extractEntity<Record<string, unknown>>(unwrapApiEnvelope(response.data), ['supplier']);
        if (updated) {
          const normalized = normalizeSupplier(updated);
          setSuppliers((cur) => cur.map((s) => (s.id === normalized.id ? normalized : s)));
        } else {
          await loadSuppliers();
        }
      } else {
        const response = await api.createSupplier({
          name: form.name.trim(),
          contactEmail: form.contactEmail || null,
          contactPhone: form.contactPhone || null,
          address: form.address || null,
        });
        const created = extractEntity<Record<string, unknown>>(unwrapApiEnvelope(response.data), ['supplier']);
        if (created) {
          setSuppliers((cur) => [normalizeSupplier(created), ...cur]);
        } else {
          await loadSuppliers();
        }
      }
      setShowModal(false);
      setEditingSupplier(null);
      setForm({ name: '', contactEmail: '', contactPhone: '', address: '' });
      const successText = editingSupplier ? 'Proveedor actualizado correctamente' : 'Proveedor creado correctamente';
      setErrorMessage(null);
      setSuccessMessage(successText);
      notifySuccess(successText);
    } catch (error) {
      const { displayMessage } = notifyApiError('suppliers.save', error);
      setErrorMessage(displayMessage);
      setSuccessMessage(null);
    }
  };

  const openCreate = () => {
    setEditingSupplier(null);
    setErrorMessage(null);
    setSuccessMessage(null);
    setForm({ name: '', contactEmail: '', contactPhone: '', address: '' });
    setShowModal(true);
  };

  const openEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setErrorMessage(null);
    setSuccessMessage(null);
    setForm({
      name: supplier.name ?? '',
      contactEmail: supplier.contactEmail ?? '',
      contactPhone: supplier.contactPhone ?? '',
      address: supplier.address ?? '',
    });
    setShowModal(true);
  };

  const handleDeactivate = async (supplier: Supplier) => {
    const previous = supplier;
    setSuppliers((cur) =>
      cur.map((s) => (s.id === supplier.id ? { ...s, isActive: false } : s))
    );
    try {
      await api.deleteSupplier(supplier.id);
      setErrorMessage(null);
      setSuccessMessage(null);
      notifyUndoAction({
        title: 'Proveedor desactivado',
        message: `"${supplier.name}" — usa Deshacer si fue un error.`,
        onUndo: async () => {
          await api.restoreSupplier(supplier.id);
          setSuppliers((cur) =>
            cur.map((s) => (s.id === supplier.id ? { ...s, isActive: true } : s))
          );
          notifySuccess('Proveedor restaurado');
        },
      });
    } catch (error) {
      setSuppliers((cur) => cur.map((s) => (s.id === supplier.id ? previous : s)));
      const { displayMessage } = notifyApiError('suppliers.delete', error);
      setErrorMessage(displayMessage);
    }
  };

  const handleRestore = async (supplier: Supplier) => {
    try {
      const response = await api.restoreSupplier(supplier.id);
      const row = extractEntity<Record<string, unknown>>(unwrapApiEnvelope(response.data), [
        'supplier',
      ]);
      const restored = row ? normalizeSupplier(row) : { ...supplier, isActive: true };
      setSuppliers((cur) => cur.map((s) => (s.id === supplier.id ? restored : s)));
      setErrorMessage(null);
      notifySuccess('Proveedor restaurado');
    } catch (error) {
      notifyApiError('suppliers.restore', error);
    }
  };

  return (
    <DashboardLayout sidebar={<SidebarMenu />} header={<Navbar />}>
      <AppPageContent>
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="app-eyebrow">Proveedores</p>
              <h1 className="mt-3 text-3xl font-semibold text-[#3D4532]">Mantenedor de proveedores</h1>
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
              {isLoading && <p className="mt-3 text-sm text-brand-ink-muted">Cargando proveedores...</p>}
            </div>
            <button
              onClick={openCreate}
              disabled={isActionLocked}
              className="app-btn-primary rounded-3xl px-6 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
            >
              + Nuevo proveedor
            </button>
          </div>

          <section className="app-card rounded-3xl p-6">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex flex-wrap gap-3">
                <span className="rounded-full border border-[rgba(74,83,60,0.25)] bg-[rgba(74,83,60,0.08)] px-4 py-2 text-sm text-[#4A533C]">
                  Total: {suppliers.length}
                </span>
                <span className="rounded-full border border-[rgba(74,83,60,0.25)] bg-[rgba(74,83,60,0.08)] px-4 py-2 text-sm text-[#4A533C]">
                  Activos: {activeCount}
                </span>
              </div>
              <StatusFilterSelect
                value={statusFilter}
                onChange={setStatusFilter}
                disabled={isActionLocked}
              />
            </div>
            <div className="mb-6 w-full md:w-80">
              <SearchInput
                placeholder="Buscar proveedor"
                items={suppliers}
                searchKeys={['name', 'contactEmail', 'contactPhone']}
                onSearch={setSearchTerm}
                onSelect={() => undefined}
                renderItem={(s) => <span>{s.name}</span>}
              />
            </div>

            <div className="app-table-wrap">
              <table className="app-table min-w-full text-left text-sm">
                <thead>
                  <tr>
                    <th className="px-6 py-4">Nombre</th>
                    <th className="px-6 py-4">Email</th>
                    <th className="px-6 py-4">Teléfono</th>
                    <th className="px-6 py-4">Dirección</th>
                    <th className="px-6 py-4">Estado</th>
                    <th className="px-6 py-4">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-brand-ink-muted">
                        No hay proveedores registrados.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((supplier) => (
                      <tr key={supplier.id}>
                        <td className="px-6 py-5 font-semibold text-[#3D4532]">{supplier.name}</td>
                        <td className="px-6 py-5 text-brand-ink-muted">{supplier.contactEmail || '—'}</td>
                        <td className="px-6 py-5 text-brand-ink-muted">{supplier.contactPhone || '—'}</td>
                        <td className="px-6 py-5 text-brand-ink-muted">{supplier.address || '—'}</td>
                        <td className="px-6 py-5">
                          <StatusBadge active={supplier.isActive} />
                        </td>
                        <td className="px-6 py-5">
                          <TableActions
                            disabled={isActionLocked}
                            isInactive={!supplier.isActive}
                            onEdit={() => openEdit(supplier)}
                            onRestore={() => handleRestore(supplier)}
                            onDelete={() =>
                              askConfirmation(
                                'Desactivar proveedor',
                                'El proveedor quedará inactivo. Podrás restaurarlo desde el filtro Inactivos o con Deshacer.',
                                'Desactivar',
                                'danger',
                                () => handleDeactivate(supplier)
                              )
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
          <div className="app-modal-panel w-full max-w-lg rounded-[2rem] p-8">
            <h2 className="text-xl font-semibold text-[#3D4532]">
              {editingSupplier ? 'Modificar proveedor' : 'Nuevo proveedor'}
            </h2>
            <div className="mt-6 space-y-4">
              {(['name', 'contactEmail', 'contactPhone', 'address'] as const).map((field) => (
                <label key={field} className="block text-sm text-brand-ink-muted">
                  {field === 'name' ? 'Nombre' : field === 'contactEmail' ? 'Email' : field === 'contactPhone' ? 'Teléfono' : 'Dirección'}
                  <input
                    value={form[field]}
                    onChange={(e) => setForm((c) => ({ ...c, [field]: e.target.value }))}
                    className="app-input mt-2 w-full rounded-3xl px-4 py-3"
                  />
                </label>
              ))}
            </div>
            <div className="mt-8 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                disabled={isActionLocked}
                className="app-btn-secondary rounded-3xl px-5 py-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={() =>
                  askConfirmation(
                    editingSupplier ? 'Guardar cambios' : 'Crear proveedor',
                    editingSupplier
                      ? '¿Confirmas la modificación de este proveedor?'
                      : '¿Confirmas la creación de este proveedor?',
                    editingSupplier ? 'Guardar cambios' : 'Crear',
                    'primary',
                    handleSaveSupplier
                  )
                }
                disabled={isActionLocked}
                className="app-btn-primary rounded-3xl px-5 py-2 font-semibold disabled:cursor-not-allowed disabled:opacity-50"
              >
                Guardar
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
        isProcessing={isSaving}
        onCancel={() => setConfirmModal((m) => ({ ...m, open: false, action: null }))}
        onConfirm={handleConfirmAction}
      />
    </DashboardLayout>
  );
}
