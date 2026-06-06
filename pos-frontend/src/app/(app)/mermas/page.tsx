'use client';

import { useEffect, useMemo, useState } from 'react';
import { api, ApiError } from '@/core/api/api-client';
import {
  extractList,
  fetchProductsForBranch,
  normalizeShrinkage,
  ShrinkageRecord,
  unwrapApiEnvelope,
} from '@/core/api/normalizers';
import { Product } from '@/core/interfaces';
import { useBranchStore } from '@/store/branch';
import { useAuthStore } from '@/store/auth';
import { getRoleProfile } from '@/core/config/role-access';
import { AppPageContent } from '@/components/molecules/AppPageContent';
import { DashboardLayout } from '@/components/molecules/DashboardLayout';
import { SidebarMenu } from '@/components/organisms/SidebarMenu';
import { Navbar } from '@/components/organisms/Navbar';
import { StatusBadge } from '@/components/atoms/StatusBadge';
import { ConfirmActionModal } from '@/components/molecules/ConfirmActionModal';
import { notifyApiError, notifySuccess } from '@/store/ui';
import {
  applyDigitsOnlyInput,
  INVALID_NUMERIC_INPUT_MESSAGE,
  parsePositiveInt,
} from '@/core/utils/numeric-input';

function shrinkageStatusLabel(status: string) {
  if (status === 'PENDING') return 'Pendiente';
  if (status === 'APPROVED') return 'Aprobada';
  if (status === 'REJECTED') return 'Rechazada';
  return status;
}

export default function MermasPage() {
  const branchId = useBranchStore((s) => s.selectedBranchId);
  const activeBranchName = useBranchStore((s) => s.activeBranchLabel);
  const user = useAuthStore((s) => s.user);
  const canApprove = getRoleProfile(user?.role).canApproveShrinkages;

  const [mermas, setMermas] = useState<ShrinkageRecord[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [rejectModal, setRejectModal] = useState<{ open: boolean; shrinkageId: string; note: string }>({
    open: false,
    shrinkageId: '',
    note: '',
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
  const [form, setForm] = useState({ reason: '', productId: '', quantity: '1' });
  const [quantityError, setQuantityError] = useState<string | null>(null);

  const productNameById = useMemo(
    () => new Map(products.map((p) => [p.id, p.name])),
    [products]
  );

  const productsInBranch = useMemo(
    () => products.filter((p) => p.inBranch !== false && (p.stock ?? 0) > 0),
    [products]
  );

  const selectedProduct = products.find((p) => p.id === form.productId);
  const parsedQuantity = parsePositiveInt(form.quantity);
  const canRegister =
    Boolean(form.reason.trim()) &&
    Boolean(form.productId) &&
    parsedQuantity !== null &&
    productsInBranch.length > 0;

  const validateQuantityField = (raw: string) => {
    const { value, hadInvalid } = applyDigitsOnlyInput(raw);
    if (hadInvalid) {
      setQuantityError(INVALID_NUMERIC_INPUT_MESSAGE);
      return value === '' ? '' : value;
    }
    if (!value || value === '0') {
      setQuantityError('La cantidad debe ser un número mayor a 0.');
      return value;
    }
    setQuantityError(null);
    return value;
  };

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [shrinkageRes, catalog] = await Promise.all([
        api.getShrinkage(),
        fetchProductsForBranch(
          branchId,
          () => api.getProductsByBranch(branchId),
          (id) => api.getInventoryByBranch(id)
        ),
      ]);
      const rows = extractList<Record<string, unknown>>(unwrapApiEnvelope(shrinkageRes.data), ['shrinkages']);
      setMermas(rows.map((row) => normalizeShrinkage(row)));
      setProducts(catalog);

      const eligible = catalog.filter((p) => p.inBranch !== false && (p.stock ?? 0) > 0);
      if (eligible.length > 0) {
        setForm((c) => ({ ...c, productId: c.productId || eligible[0].id }));
      }
    } catch (error) {
      const { displayMessage } = notifyApiError('mermas.list', error, { toast: false });
      setErrorMessage(displayMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [branchId]);

  const handleSubmit = async () => {
    if (!form.reason.trim() || !form.productId) return;

    const quantity = parsePositiveInt(form.quantity);
    if (quantity === null) {
      setQuantityError('La cantidad debe ser un número mayor a 0.');
      return;
    }

    if (selectedProduct && quantity > (selectedProduct.stock ?? 0)) {
      setErrorMessage(
        `La cantidad no puede superar el stock disponible (${selectedProduct.stock ?? 0}).`
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await api.createShrinkage({
        productId: form.productId,
        quantity,
        reason: form.reason.trim(),
      });
      setShowModal(false);
      setForm({ reason: '', productId: productsInBranch[0]?.id ?? '', quantity: '1' });
      setQuantityError(null);
      setSuccessMessage(
        'Merma registrada en estado pendiente. Un administrador debe aprobarla para descontar el inventario.'
      );
      notifySuccess('Merma registrada', 'Se creó en estado pendiente.');
      await loadData();
    } catch (error) {
      const { displayMessage } = notifyApiError('mermas.create', error);
      setErrorMessage(displayMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async (id: string) => {
    const row = mermas.find((m) => m.id === id);
    if (row && row.quantity <= 0) {
      setErrorMessage('No se puede aprobar una merma con cantidad 0. Recházala para descartarla.');
      return;
    }

    try {
      await api.approveShrinkage(id);
      setSuccessMessage('Merma aprobada. El stock fue descontado de la sucursal.');
      notifySuccess('Merma aprobada', 'El stock fue descontado de inventario.');
      await loadData();
    } catch (error) {
      const { displayMessage } = notifyApiError('mermas.approve', error);
      setErrorMessage(displayMessage);
    }
  };

  const rejectShrinkageRequest = async (id: string, note: string) => {
    try {
      await api.rejectShrinkage(id, { rejectionNote: note || undefined });
    } catch (error) {
      const status = error instanceof ApiError ? error.status : undefined;
      if (status === 404 || status === 405) {
        await api.updateShrinkage(id, {
          status: 'REJECTED',
          rejectionNote: note || undefined,
        });
        return;
      }
      throw error;
    }
  };

  const handleReject = async (id: string, note: string) => {
    if (!id.trim()) {
      setErrorMessage('No se pudo identificar la merma. Recarga la página e inténtalo de nuevo.');
      return;
    }
    try {
      await rejectShrinkageRequest(id, note);
      setSuccessMessage('Merma rechazada. No se modificó el inventario.');
      notifySuccess('Merma rechazada', 'No se modificó el inventario.');
      await loadData();
    } catch (error) {
      const { displayMessage } = notifyApiError('mermas.reject', error);
      setErrorMessage(displayMessage);
    }
  };

  const requestRegister = () => {
    if (!canRegister || parsedQuantity === null) {
      setQuantityError('La cantidad debe ser un número mayor a 0.');
      return;
    }
    if (selectedProduct && parsedQuantity > (selectedProduct.stock ?? 0)) {
      setErrorMessage(
        `La cantidad no puede superar el stock disponible (${selectedProduct.stock ?? 0}).`
      );
      return;
    }
    askConfirmation(
      'Registrar merma',
      '¿Confirmas el registro de esta merma en estado pendiente?',
      'Registrar',
      'primary',
      handleSubmit
    );
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
              <p className="app-eyebrow">Mermas</p>
              <h1 className="app-heading-page">Registro de mermas</h1>
              <p className="mt-2 app-text-muted">Sucursal activa: {activeBranchName}</p>
              <p className="mt-1 text-sm text-[#6b7280]">
                Las mermas quedan pendientes hasta que un administrador las apruebe y descuente stock.
              </p>
              {errorMessage && <p className="mt-3 app-alert-error">{errorMessage}</p>}
              {successMessage && (
                <p className="mt-3 rounded-2xl border border-[rgba(74,83,60,0.25)] bg-[rgba(74,83,60,0.1)] px-4 py-3 text-sm text-[#4A533C]">
                  {successMessage}
                </p>
              )}
              {isLoading && <p className="mt-3 text-sm text-[#6b7280]">Cargando mermas...</p>}
            </div>
            <button
              onClick={() => {
                setErrorMessage(null);
                setQuantityError(null);
                setForm((c) => ({ ...c, quantity: '1' }));
                setShowModal(true);
              }}
              className="app-btn-primary rounded-3xl px-6 py-3 text-sm font-semibold"
            >
              + Registrar merma
            </button>
          </div>

          <div className="app-table-wrap overflow-x-auto">
            <table className="app-table min-w-full text-left text-sm">
              <thead>
                <tr>
                  <th className="px-6 py-4">Fecha</th>
                  <th className="px-6 py-4">Producto</th>
                  <th className="px-6 py-4">Cantidad</th>
                  <th className="px-6 py-4">Motivo</th>
                  <th className="px-6 py-4">Estado</th>
                  {canApprove && <th className="px-6 py-4">Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {mermas.length === 0 ? (
                  <tr>
                    <td colSpan={canApprove ? 6 : 5} className="px-6 py-8 text-center text-brand-ink-muted">
                      No hay mermas registradas.
                    </td>
                  </tr>
                ) : (
                  mermas.map((m) => (
                    <tr key={m.id}>
                      <td className="px-6 py-5 text-brand-ink-muted">
                        {new Date(m.createdAt).toLocaleString('es-CO')}
                      </td>
                      <td className="px-6 py-5 text-[#3D4532]">
                        {m.productName ?? productNameById.get(m.productId) ?? 'Producto desconocido'}
                      </td>
                      <td className="px-6 py-5 text-brand-ink-muted">
                        {m.quantity > 0 ? m.quantity : <span className="text-rose-300">0 (inválida)</span>}
                      </td>
                      <td className="px-6 py-5 text-brand-ink-muted">{m.reason}</td>
                      <td className="px-6 py-5">
                        <StatusBadge
                          active={m.status === 'APPROVED'}
                          activeLabel="Aprobada"
                          inactiveLabel={shrinkageStatusLabel(m.status)}
                        />
                      </td>
                      {canApprove && (
                        <td className="px-6 py-5">
                          {m.status === 'PENDING' ? (
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                disabled={m.quantity <= 0}
                                title={m.quantity <= 0 ? 'Cantidad inválida: rechaza esta merma' : undefined}
                                onClick={() =>
                                  askConfirmation(
                                    'Aprobar merma',
                                    '¿Confirma que el producto está defectuoso y debe descontarse del inventario?',
                                    'Aprobar',
                                    'primary',
                                    () => handleApprove(m.id)
                                  )
                                }
                                className="rounded-2xl border border-[rgba(74,83,60,0.26)] bg-[#4A533C] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#3D4532] disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                Aprobar
                              </button>
                              <button
                                type="button"
                                onClick={() => setRejectModal({ open: true, shrinkageId: m.id, note: '' })}
                                className="rounded-2xl border border-[rgba(176,138,76,0.45)] px-3 py-1.5 text-xs text-[#8C6A2B] hover:bg-[rgba(176,138,76,0.1)]"
                              >
                                Rechazar
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-brand-ink-muted">—</span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
      </AppPageContent>

      {showModal && (
        <div className="app-modal-overlay">
          <div className="app-modal-panel w-full max-w-lg rounded-[2rem] p-8">
            <h2 className="text-xl font-semibold text-[#3D4532]">Nueva merma</h2>
            <p className="mt-2 text-sm text-brand-ink-muted">
              El inventario no se descuenta hasta la aprobación del administrador.
            </p>
            <div className="mt-6 space-y-4">
              <label className="block text-sm text-brand-ink-muted">
                Motivo
                <input
                  value={form.reason}
                  onChange={(e) => setForm((c) => ({ ...c, reason: e.target.value }))}
                  className="app-input mt-2 w-full rounded-3xl px-4 py-3"
                  placeholder="Producto defectuoso, vencido, etc."
                />
              </label>
              <label className="block text-sm text-brand-ink-muted">
                Producto
                <select
                  value={form.productId}
                  onChange={(e) => setForm((c) => ({ ...c, productId: e.target.value }))}
                  className="app-select mt-2 w-full rounded-3xl px-4 py-3"
                >
                  {productsInBranch.length === 0 ? (
                    <option value="">Sin productos con stock en sucursal</option>
                  ) : (
                    productsInBranch.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku}) — stock: {p.stock}
                      </option>
                    ))
                  )}
                </select>
              </label>
              <label className="block text-sm text-brand-ink-muted">
                Cantidad a dar de baja
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={form.quantity}
                  onChange={(e) => {
                    const next = validateQuantityField(e.target.value);
                    setForm((c) => ({ ...c, quantity: next === '' ? '' : next }));
                  }}
                  className={`mt-2 w-full rounded-3xl border bg-white px-4 py-3 text-[#3D4532] ${
                    quantityError
                      ? 'border-rose-500/60 focus:border-rose-400'
                      : 'border-[rgba(209,199,189,0.9)] focus:border-[#4A533C]'
                  } outline-none`}
                />
                {quantityError && (
                  <p className="mt-2 text-xs text-rose-300">{quantityError}</p>
                )}
                {selectedProduct && (
                  <p className="mt-1 text-xs text-brand-ink-muted">
                    Disponible en sucursal: {selectedProduct.stock ?? 0}
                  </p>
                )}
              </label>
            </div>
            <div className="mt-8 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                disabled={isSubmitting}
                className="app-btn-secondary rounded-3xl px-5 py-2 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={requestRegister}
                disabled={isSubmitting || !canRegister}
                className="app-btn-primary rounded-3xl px-5 py-2 font-semibold disabled:opacity-50"
              >
                {isSubmitting ? 'Registrando…' : 'Registrar pendiente'}
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
      {rejectModal.open && (
        <div className="app-modal-overlay !z-[70]">
          <div className="app-modal-panel w-full max-w-lg rounded-[2rem] p-8">
            <h3 className="text-xl font-semibold text-[#3D4532]">Rechazar merma</h3>
            <p className="mt-2 text-sm text-brand-ink-muted">Puedes registrar un motivo de rechazo (opcional).</p>
            <label className="mt-5 block text-sm text-brand-ink-muted">
              Motivo
              <textarea
                value={rejectModal.note}
                onChange={(e) => setRejectModal((r) => ({ ...r, note: e.target.value }))}
                className="app-textarea mt-2 min-h-[110px] w-full rounded-2xl px-3 py-2"
                placeholder="Ej: evidencia insuficiente, cantidad inconsistente, etc."
              />
            </label>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setRejectModal({ open: false, shrinkageId: '', note: '' })}
                className="app-btn-secondary rounded-3xl px-5 py-2"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  const { shrinkageId, note } = rejectModal;
                  setRejectModal({ open: false, shrinkageId: '', note: '' });
                  await handleReject(shrinkageId, note.trim());
                }}
                className="app-btn-danger rounded-3xl px-5 py-2 font-semibold"
              >
                Confirmar rechazo
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
