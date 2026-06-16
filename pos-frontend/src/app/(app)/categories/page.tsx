'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/core/api/api-client';
import {
  extractEntity,
  flattenCategoryTree,
  normalizeCategory,
  normalizeCategoryTreeNode,
  unwrapApiEnvelope,
} from '@/core/api/normalizers';
import { Category } from '@/core/interfaces';
import { AppPageContent } from '@/components/molecules/AppPageContent';
import { AppPageHeader } from '@/components/molecules/AppPageHeader';
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

function levelLabel(depth?: number): string {
  if (depth === 0 || depth === undefined) return 'Principal';
  if (depth === 1) return 'Subcategoría';
  return `Nivel ${(depth ?? 0) + 1}`;
}

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
  const [form, setForm] = useState({ name: '', description: '', parentId: '' });
  const isActionLocked = isSaving || confirmModal.open;

  const loadCategories = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await api.getCategoryTree();
      const envelope = unwrapApiEnvelope(response.data) as { tree?: unknown[] };
      const tree = Array.isArray(envelope?.tree)
        ? envelope.tree
            .filter((n): n is Record<string, unknown> => Boolean(n) && typeof n === 'object')
            .map((n) => normalizeCategoryTreeNode(n))
        : [];
      setCategories(flattenCategoryTree(tree));
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

  const rootCategories = useMemo(
    () => categories.filter((c) => !c.parentId && c.isActive),
    [categories]
  );

  const filtered = useMemo(
    () =>
      filterByStatusAndSearch(categories, statusFilter, searchTerm, (c, q) =>
        [c.name, c.description, c.slug, c.parentName].join(' ').toLowerCase().includes(q)
      ),
    [categories, statusFilter, searchTerm]
  );

  const activeCount = useMemo(() => categories.filter((c) => c.isActive).length, [categories]);
  const rootCount = useMemo(() => categories.filter((c) => !c.parentId).length, [categories]);
  const subCount = useMemo(() => categories.filter((c) => c.parentId).length, [categories]);

  const openCreate = (parentId = '') => {
    setEditing(null);
    setErrorMessage(null);
    setSuccessMessage(null);
    setForm({ name: '', description: '', parentId });
    setShowModal(true);
  };

  const openEdit = (category: Category) => {
    setEditing(category);
    setErrorMessage(null);
    setSuccessMessage(null);
    setForm({
      name: category.name,
      description: category.description ?? '',
      parentId: category.parentId ?? '',
    });
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
    const parentId = form.parentId.trim() || null;
    try {
      setSuccessMessage(null);
      if (editing) {
        await api.updateCategory(editing.id, {
          name: form.name.trim(),
          description: form.description || null,
          parentId,
        });
      } else {
        await api.createCategory({
          name: form.name.trim(),
          description: form.description || null,
          parentId,
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
      await loadCategories();
      notifyUndoAction({
        title: 'Categoría desactivada',
        message: `"${category.name}" — usa Deshacer si fue un error.`,
        onUndo: async () => {
          await api.restoreCategory(category.id);
          await loadCategories();
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
      if (row) normalizeCategory(row);
      await loadCategories();
      setErrorMessage(null);
      notifySuccess('Categoría restaurada');
    } catch (error) {
      notifyApiError('categories.restore', error);
    }
  };

  const editingHasChildren =
    editing != null && categories.some((c) => c.parentId === editing.id && c.isActive);

  return (
    <DashboardLayout sidebar={<SidebarMenu />} header={<Navbar />}>
      <AppPageContent>
          <AppPageHeader
            kicker="Catálogo"
            title="Categorías y subcategorías"
            description="Crea categorías principales (Pizzas, Sushi) y subcategorías bajo cada una. Los productos se asignan a subcategorías sin hijos."
            actions={
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => openCreate('')}
                  disabled={isActionLocked}
                  className="app-btn-primary rounded-3xl px-6 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
                >
                  + Categoría principal
                </button>
                <button
                  type="button"
                  onClick={() => openCreate(rootCategories[0]?.id ?? '')}
                  disabled={isActionLocked || rootCategories.length === 0}
                  className="app-btn-secondary rounded-3xl px-6 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
                  title={
                    rootCategories.length === 0
                      ? 'Crea primero una categoría principal'
                      : 'Abre el formulario con padre preseleccionado'
                  }
                >
                  + Subcategoría
                </button>
              </div>
            }
          />
          {errorMessage && <p className="mb-4 app-alert-error">{errorMessage}</p>}
          {successMessage && <p className="mb-4 app-alert-success">{successMessage}</p>}
          {isLoading && <p className="mb-4 text-sm text-brand-ink-muted">Cargando categorías...</p>}

          <section className="app-card rounded-3xl p-6">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex flex-wrap gap-3">
                <span className="rounded-full border border-[rgba(74,83,60,0.25)] bg-[rgba(74,83,60,0.08)] px-4 py-2 text-sm text-[#4A533C]">
                  Total: {categories.length}
                </span>
                <span className="rounded-full border border-[rgba(74,83,60,0.25)] bg-[rgba(74,83,60,0.08)] px-4 py-2 text-sm text-[#4A533C]">
                  Principales: {rootCount}
                </span>
                <span className="rounded-full border border-[rgba(74,83,60,0.25)] bg-[rgba(74,83,60,0.08)] px-4 py-2 text-sm text-[#4A533C]">
                  Subcategorías: {subCount}
                </span>
                <span className="rounded-full border border-[rgba(74,83,60,0.25)] bg-[rgba(74,83,60,0.08)] px-4 py-2 text-sm text-[#4A533C]">
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
                searchKeys={['name', 'description', 'slug', 'parentName']}
                onSearch={setSearchTerm}
                onSelect={() => undefined}
                renderItem={(c) => (
                  <span>
                    {c.parentName ? `${c.parentName} → ` : ''}
                    {c.name}
                  </span>
                )}
              />
            </div>

            <div className="app-table-wrap overflow-x-auto">
              <table className="app-table min-w-full text-left text-sm">
                <thead>
                  <tr>
                    <th className="px-6 py-4">Nombre</th>
                    <th className="px-6 py-4">Nivel</th>
                    <th className="px-6 py-4">Slug</th>
                    <th className="px-6 py-4">Descripción</th>
                    <th className="px-6 py-4">Estado</th>
                    <th className="px-6 py-4">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-[#6b7280]">
                        No hay categorías registradas.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((category) => (
                      <tr key={category.id}>
                        <td className="px-6 py-5 font-semibold text-[#3D4532]">
                          <span style={{ paddingLeft: `${(category.depth ?? 0) * 20}px` }}>
                            {(category.depth ?? 0) > 0 ? '↳ ' : ''}
                            {category.name}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-[#5c6650]">{levelLabel(category.depth)}</td>
                        <td className="px-6 py-5 font-mono text-xs text-[#6b7280]">
                          {category.slug ?? '—'}
                        </td>
                        <td className="px-6 py-5 text-[#5c6650]">{category.description || '—'}</td>
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
                                category.parentId
                                  ? 'La subcategoría quedará inactiva.'
                                  : 'La categoría principal y sus subcategorías activas quedarán inactivas.',
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
        <div className="app-modal-overlay">
          <div className="app-modal-panel w-full max-w-lg rounded-[2rem] p-8">
            <h2 className="text-xl font-semibold text-[#3D4532]">
              {editing ? 'Modificar categoría' : form.parentId ? 'Nueva subcategoría' : 'Nueva categoría principal'}
            </h2>
            <div className="mt-6 space-y-4">
              <label className="block text-sm text-[#5c6650]">
                Categoría padre
                <select
                  value={form.parentId}
                  onChange={(e) => setForm((c) => ({ ...c, parentId: e.target.value }))}
                  disabled={!!editing && (editing.depth ?? 0) > 0 && editingHasChildren}
                  className="app-select mt-2"
                >
                  <option value="">— Principal (sin padre) —</option>
                  {rootCategories
                    .filter((r) => !editing || r.id !== editing.id)
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                </select>
                {editingHasChildren && (
                  <span className="mt-1 block text-xs text-amber-800">
                    Esta categoría tiene subcategorías activas; no puede convertirse en subcategoría.
                  </span>
                )}
              </label>
              <label className="block text-sm text-[#5c6650]">
                Nombre
                <input
                  value={form.name}
                  onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))}
                  className="app-input mt-2 w-full rounded-3xl px-4 py-3"
                />
                {form.parentId && !editing && (
                  <span className="mt-1 block text-xs text-brand-ink-muted">
                    Puedes repetir nombres como Carne o Pollo en otra familia (ej. Sandwich y
                    Hamburguesas).
                  </span>
                )}
              </label>
              <label className="block text-sm text-[#5c6650]">
                Descripción
                <input
                  value={form.description}
                  onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))}
                  className="app-input mt-2 w-full rounded-3xl px-4 py-3"
                />
              </label>
              {editing?.slug && (
                <p className="text-xs text-[#6b7280]">
                  Slug: <span className="font-mono">{editing.slug}</span> (se actualiza al cambiar el nombre)
                </p>
              )}
            </div>
            <div className="mt-8 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                disabled={isActionLocked}
                className="app-btn-secondary rounded-3xl px-5 py-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
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
                className="app-btn-primary rounded-3xl px-5 py-2 font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
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
