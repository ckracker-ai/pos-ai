'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/core/api/api-client';
import { extractEntity, extractList, normalizeCategory, unwrapApiEnvelope } from '@/core/api/normalizers';
import { Category } from '@/core/interfaces';
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

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>('active');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
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
  const [form, setForm] = useState({ name: '', description: '' });
  const isActionLocked = isSaving || confirmModal.open;

  const loadCategories = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await api.getCategories();
      const rows = extractList<Record<string, unknown>>(unwrapApiEnvelope(response.data), ['categories']);
      setCategories(rows.map((row) => normalizeCategory(row)));
    } catch (error) {
      const { displayMessage } = notifyApiError('categories.list', error, { toast: false });
      setErrorMessage(displayMessage);
      setSuccessMessage(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const filtered = useMemo(
    () =>
      filterByStatusAndSearch(categories, statusFilter, searchTerm, (c, q) =>
        [c.name, c.description].join(' ').toLowerCase().includes(q)
      ),
    [categories, statusFilter, searchTerm]
  );

  const activeCount = useMemo(() => categories.filter((c) => c.isActive).length, [categories]);

  const openCreate = () => {
    setEditing(null);
    setErrorMessage(null);
    setSuccessMessage(null);
    setForm({ name: '', description: '' });
    setShowModal(true);
  };

  const openEdit = (category: Category) => {
    setEditing(category);
    setErrorMessage(null);
    setSuccessMessage(null);
    setForm({ name: category.name, description: category.description ?? '' });
    setShowModal(true);
  };

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

  const handleSave = async () => {
    if (!form.name.trim()) return;
    try {
      setSuccessMessage(null);
      if (editing) {
        await api.updateCategory(editing.id, {
          name: form.name.trim(),
          description: form.description || null,
        });
      } else {
        await api.createCategory({
          name: form.name.trim(),
          description: form.description || null,
        });
      }
      setShowModal(false);
      await loadCategories();
      const successText = editing ? 'Categoría actualizada correctamente' : 'Categoría creada correctamente';
      setErrorMessage(null);
      setSuccessMessage(successText);
      notifySuccess(successText);
    } catch (error) {
      const { displayMessage } = notifyApiError('categories.save', error);
      setErrorMessage(displayMessage);
      setSuccessMessage(null);
    }
  };

  const handleDeactivate = async (category: Category) => {
    const previous = category;
    setCategories((cur) =>
      cur.map((c) => (c.id === category.id ? { ...c, isActive: false } : c))
    );
    try {
      await api.deleteCategory(category.id);
      setErrorMessage(null);
      setSuccessMessage(null);
      notifyUndoAction({
        title: 'Categoría desactivada',
        message: `"${category.name}" — usa Deshacer si fue un error.`,
        onUndo: async () => {
          await api.restoreCategory(category.id);
          setCategories((cur) =>
            cur.map((c) => (c.id === category.id ? { ...c, isActive: true } : c))
          );
          notifySuccess('Categoría restaurada');
        },
      });
    } catch (error) {
      setCategories((cur) =>
        cur.map((c) => (c.id === category.id ? previous : c))
      );
      const { displayMessage } = notifyApiError('categories.delete', error);
      setErrorMessage(displayMessage);
    }
  };

  const handleRestore = async (category: Category) => {
    try {
      const response = await api.restoreCategory(category.id);
      const row = extractEntity<Record<string, unknown>>(unwrapApiEnvelope(response.data), [
        'category',
      ]);
      const restored = row ? normalizeCategory(row) : { ...category, isActive: true };
      setCategories((cur) => cur.map((c) => (c.id === category.id ? restored : c)));
      setErrorMessage(null);
      notifySuccess('Categoría restaurada');
    } catch (error) {
      notifyApiError('categories.restore', error);
    }
  };

  return (
    <DashboardLayout sidebar={<SidebarMenu />} header={<Navbar />}>
      <AppPageContent>
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Catálogo</p>
              <h1 className="mt-3 text-3xl font-semibold text-white">Categorías de productos</h1>
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
              {isLoading && <p className="mt-3 text-sm text-slate-500">Cargando categorías...</p>}
            </div>
            <button
              onClick={openCreate}
              disabled={isActionLocked}
              className="rounded-3xl bg-sky-600 px-6 py-3 text-sm font-semibold text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              + Nueva categoría
            </button>
          </div>

          <section className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex flex-wrap gap-3">
                <span className="rounded-full bg-slate-800 px-4 py-2 text-sm text-slate-300">
                  Total: {categories.length}
                </span>
                <span className="rounded-full bg-slate-800 px-4 py-2 text-sm text-slate-300">
                  Activas: {activeCount}
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
                placeholder="Buscar categoría"
                items={categories}
                searchKeys={['name', 'description']}
                onSearch={setSearchTerm}
                onSelect={() => undefined}
                renderItem={(c) => <span>{c.name}</span>}
              />
            </div>

            <div className="overflow-x-auto rounded-3xl border border-slate-800">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-950/80 text-slate-400">
                  <tr>
                    <th className="px-6 py-4">Nombre</th>
                    <th className="px-6 py-4">Descripción</th>
                    <th className="px-6 py-4">Estado</th>
                    <th className="px-6 py-4">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-900">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                        No hay categorías registradas.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((category) => (
                      <tr key={category.id} className="hover:bg-slate-950/80">
                        <td className="px-6 py-5 font-semibold text-white">{category.name}</td>
                        <td className="px-6 py-5 text-slate-300">{category.description || '—'}</td>
                        <td className="px-6 py-5">
                          <StatusBadge active={category.isActive} />
                        </td>
                        <td className="px-6 py-5">
                          <TableActions
                            disabled={isActionLocked}
                            isInactive={!category.isActive}
                            onEdit={() => openEdit(category)}
                            onRestore={() => handleRestore(category)}
                            onDelete={() =>
                              askConfirmation(
                                'Desactivar categoría',
                                'La categoría quedará inactiva. Podrás restaurarla desde el filtro Inactivos o con Deshacer.',
                                'Desactivar',
                                'danger',
                                () => handleDeactivate(category)
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="w-full max-w-lg rounded-[2rem] border border-slate-800 bg-slate-950 p-8">
            <h2 className="text-xl font-semibold text-white">
              {editing ? 'Modificar categoría' : 'Nueva categoría'}
            </h2>
            <div className="mt-6 space-y-4">
              <label className="block text-sm text-slate-300">
                Nombre
                <input
                  value={form.name}
                  onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))}
                  className="mt-2 w-full rounded-3xl border border-slate-800 bg-slate-900 px-4 py-3 text-white"
                />
              </label>
              <label className="block text-sm text-slate-300">
                Descripción
                <input
                  value={form.description}
                  onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))}
                  className="mt-2 w-full rounded-3xl border border-slate-800 bg-slate-900 px-4 py-3 text-white"
                />
              </label>
            </div>
            <div className="mt-8 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                disabled={isActionLocked}
                className="rounded-3xl border border-slate-700 px-5 py-2 text-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={() =>
                  askConfirmation(
                    editing ? 'Guardar cambios' : 'Crear categoría',
                    editing
                      ? '¿Confirmas la modificación de esta categoría?'
                      : '¿Confirmas la creación de esta categoría?',
                    editing ? 'Guardar cambios' : 'Crear',
                    'primary',
                    handleSave
                  )
                }
                disabled={isActionLocked}
                className="rounded-3xl bg-sky-600 px-5 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
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
