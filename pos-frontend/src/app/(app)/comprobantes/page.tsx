'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, getApiErrorMessage } from '@/core/api/api-client';
import {
  extractList,
  normalizePaymentProof,
  PaymentProofRecord,
  unwrapApiEnvelope,
} from '@/core/api/normalizers';
import { useBranchStore } from '@/store/branch';
import { AppPageContent } from '@/components/molecules/AppPageContent';
import { DashboardLayout } from '@/components/molecules/DashboardLayout';
import { SidebarMenu } from '@/components/organisms/SidebarMenu';
import { Navbar } from '@/components/organisms/Navbar';
import { ConfirmActionModal } from '@/components/molecules/ConfirmActionModal';
import { notifyApiError, notifySuccess } from '@/store/ui';
const VARIANT_LABELS: Record<string, string> = {
  TRANSFER_OK: 'Monto y destinatario OK',
  TRANSFER_AMOUNT_MISMATCH: 'Monto distinto',
  TRANSFER_PARTIAL: 'Pago parcial',
  TRANSFER_OVERPAY: 'Sobrepago',
  WRONG_RECIPIENT: 'Destinatario incorrecto',
  AMOUNT_OK_RECIPIENT_UNCLEAR: 'Destinatario ilegible',
  NOT_PAYMENT: 'No es comprobante',
  UNCLEAR: 'Imagen borrosa',
  NO_AMOUNT: 'Sin monto',
};

function formatClp(value: number): string {
  return `$${Math.round(value).toLocaleString('es-CL')}`;
}

function variantLabel(code: string | null): string {
  if (!code) return '—';
  return VARIANT_LABELS[code] ?? code;
}

function proofSummaryLine(summary: string | null): string {
  if (!summary) return '';
  const first = summary.split('\n')[0] ?? '';
  return first.replace(/^\[[A-Z_]+\]\s*/, '');
}

const SALE_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pedido pendiente de pago',
  COMPLETED: 'Pedido completado',
  CANCELLED: 'Pedido cancelado',
};

function saleStatusLabel(status: string): string {
  return SALE_STATUS_LABELS[status] ?? (status ? `Pedido: ${status}` : 'Estado de pedido no disponible');
}

function isSaleClosedForProof(saleStatus: string): boolean {
  return saleStatus === 'COMPLETED' || saleStatus === 'CANCELLED';
}

/** Un pedido = una tarjeta visible (el comprobante más reciente). */
function dedupeProofsBySale(rows: PaymentProofRecord[]): PaymentProofRecord[] {
  const bySale = new Map<string, PaymentProofRecord>();
  for (const row of rows) {
    const prev = bySale.get(row.saleId);
    if (!prev || new Date(row.createdAt).getTime() > new Date(prev.createdAt).getTime()) {
      bySale.set(row.saleId, row);
    }
  }
  return [...bySale.values()].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export default function ComprobantesPage() {
  const branchId = useBranchStore((s) => s.selectedBranchId);
  const activeBranchName = useBranchStore((s) => s.activeBranchLabel);

  const [proofs, setProofs] = useState<PaymentProofRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [rejectModal, setRejectModal] = useState<{ open: boolean; proofId: string; note: string }>({
    open: false,
    proofId: '',
    note: '',
  });
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    proof: PaymentProofRecord | null;
  }>({ open: false, proof: null });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<{
    proofId: string;
    dataUrl: string;
  } | null>(null);
  const [imageLoadingId, setImageLoadingId] = useState<string | null>(null);

  const loadProofs = useCallback(async () => {
    if (!branchId) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      if (!showAll) {
        try {
          const cleanRes = await api.consolidatePaymentProofDuplicates();
          const clean = unwrapApiEnvelope(cleanRes.data) as { removedProofs?: number };
          if ((clean.removedProofs ?? 0) > 0) {
            notifySuccess(
              `Se eliminaron ${clean.removedProofs} comprobante(s) duplicado(s) y sus imágenes repetidas.`
            );
          }
        } catch {
          /* listado también consolida en servidor */
        }
      }
      const res = await api.getPaymentProofs(showAll ? 'all' : 'pending');
      const data = unwrapApiEnvelope(res.data) as { proofs?: Record<string, unknown>[] };
      const rows = extractList<Record<string, unknown>>(data, ['proofs']);
      setProofs(rows.map((r) => normalizePaymentProof(r)));
    } catch (err) {
      setErrorMessage(getApiErrorMessage(err, 'comprobantes.list'));
      setProofs([]);
    } finally {
      setLoading(false);
    }
  }, [branchId, showAll]);

  useEffect(() => {
    void loadProofs();
  }, [loadProofs]);

  const visibleProofs = useMemo(
    () => (showAll ? proofs : dedupeProofsBySale(proofs)),
    [proofs, showAll]
  );

  const handleConfirm = async (proof: PaymentProofRecord) => {
    setBusyId(proof.id);
    try {
      await api.confirmPaymentProof(proof.id);
      notifySuccess('Pago confirmado. Pedido completado y cliente notificado por WSP.');
      setConfirmModal({ open: false, proof: null });
      await loadProofs();
    } catch (err) {
      notifyApiError('comprobantes.confirm', err);
    } finally {
      setBusyId(null);
    }
  };

  const openProofImage = async (proofId: string) => {
    setImageLoadingId(proofId);
    try {
      const res = await api.getPaymentProofImage(proofId);
      const data = unwrapApiEnvelope(res.data) as {
        mimeType?: string;
        imageBase64?: string;
        mime_type?: string;
        image_base64?: string;
      };
      const mime = String(data.mimeType ?? data.mime_type ?? 'image/jpeg');
      const b64 = String(data.imageBase64 ?? data.image_base64 ?? '');
      if (!b64) {
        notifyApiError('comprobantes.list', new Error('Sin imagen almacenada'));
        return;
      }
      setImagePreview({ proofId, dataUrl: `data:${mime};base64,${b64}` });
    } catch (err) {
      notifyApiError('comprobantes.list', err);
    } finally {
      setImageLoadingId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectModal.proofId) return;
    const proof = proofs.find((p) => p.id === rejectModal.proofId);
    const archivingStale = proof != null && isSaleClosedForProof(proof.saleStatus);
    setBusyId(rejectModal.proofId);
    try {
      await api.rejectPaymentProof(rejectModal.proofId, {
        note: rejectModal.note.trim() || undefined,
      });
      notifySuccess(
        archivingStale
          ? 'Registro archivado. Ya no aparecerá en pendientes.'
          : 'Comprobante rechazado. Stock liberado y cliente notificado.'
      );
      setRejectModal({ open: false, proofId: '', note: '' });
      await loadProofs();
    } catch (err) {
      notifyApiError('comprobantes.reject', err);
    } finally {
      setBusyId(null);
    }
  };

  const openDismissModal = (proofId: string) => {
    setRejectModal({ open: true, proofId, note: 'Registro antiguo descartado' });
  };

  return (
    <DashboardLayout sidebar={<SidebarMenu />} header={<Navbar />}>
      <AppPageContent>
        <header>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-olive">
            Plan Estándar · WhatsApp
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-brand-ink">Comprobantes de transferencia</h1>
          <p className="mt-2 max-w-2xl text-sm text-brand-ink-muted">
            Valida pagos enviados por clientes por WhatsApp en{' '}
            <strong className="text-brand-ink">{activeBranchName ?? 'tu sucursal'}</strong>.
            Al confirmar, el pedido pasa a completado; al rechazar, se cancela y se libera stock. Los
            registros antiguos sin botones suelen ser duplicados o pedidos ya cerrados: actívalos en{' '}
            <strong className="text-brand-ink">historial</strong> y usa <strong>Descartar</strong>.
          </p>
        </header>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-brand-ink-muted">
            <input
              type="checkbox"
              checked={showAll}
              onChange={(ev) => setShowAll(ev.target.checked)}
              className="rounded border-brand-linen text-brand-olive focus:ring-brand-olive/30"
            />
            Mostrar historial (no solo pendientes)
          </label>
          <button type="button" onClick={() => void loadProofs()} className="app-btn-secondary">
            Actualizar
          </button>
          {!showAll && (
            <button
              type="button"
              onClick={async () => {
                try {
                  const cleanRes = await api.consolidatePaymentProofDuplicates();
                  const clean = unwrapApiEnvelope(cleanRes.data) as { removedProofs?: number };
                  notifySuccess(
                    clean.removedProofs
                      ? `Eliminados ${clean.removedProofs} duplicado(s) con imagen.`
                      : 'No había duplicados en esta sucursal.'
                  );
                  await loadProofs();
                } catch (err) {
                  notifyApiError('comprobantes.list', err);
                }
              }}
              className="app-btn-secondary"
            >
              Limpiar duplicados
            </button>
          )}
        </div>

        {!branchId && (
          <p className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Selecciona una sucursal en la barra superior.
          </p>
        )}

        {errorMessage && (
          <p className="mt-6 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {errorMessage}
          </p>
        )}

        {loading && <p className="mt-6 text-brand-ink-muted">Cargando comprobantes…</p>}

        {!loading && branchId && visibleProofs.length === 0 && (
          <p className="mt-8 text-brand-ink-muted">
            No hay comprobantes {showAll ? '' : 'pendientes '}en esta sucursal.
          </p>
        )}

        <div className="mt-6 space-y-4">
          {visibleProofs.map((proof) => {
            const proofAwaitingReview = ['RECEIVED', 'NOTIFIED_ADMIN'].includes(proof.status);
            const saleClosed = isSaleClosedForProof(proof.saleStatus);
            const canConfirmOrReject = proofAwaitingReview && !saleClosed;
            const canDismissStale = proofAwaitingReview && saleClosed;
            return (
              <article key={proof.id} className="app-card rounded-xl p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-mono text-sm text-brand-ink-muted">
                      Pedido #{proof.saleId.slice(0, 8)} · +{proof.clientPhone}
                    </p>
                    <p className="mt-1 text-lg font-semibold text-brand-ink">
                      Esperado {formatClp(proof.expectedTotal)}
                      {proof.detectedAmount != null && (
                        <span className="ml-2 text-base font-normal text-brand-ink-muted">
                          · Detectado {formatClp(proof.detectedAmount)}
                        </span>
                      )}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <span
                        className={`rounded-full px-2 py-0.5 font-medium ${
                          proof.aiMatch
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-900'
                        }`}
                      >
                        IA: {proof.aiMatch ? 'coincide' : 'revisar'}
                      </span>
                      {proof.variant && (
                        <span className="rounded-full bg-brand-linen/60 px-2 py-0.5 text-brand-ink">
                          {variantLabel(proof.variant)}
                        </span>
                      )}
                      <span className="rounded-full bg-brand-vanilla px-2 py-0.5 text-brand-ink-muted">
                        {proof.status}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 ${
                          saleClosed
                            ? 'bg-slate-200 text-slate-700'
                            : 'bg-brand-olive/15 text-brand-olive'
                        }`}
                      >
                        {saleStatusLabel(proof.saleStatus || 'PENDING')}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {proof.hasImage && (
                      <button
                        type="button"
                        disabled={imageLoadingId === proof.id}
                        onClick={() => void openProofImage(proof.id)}
                        className="app-btn-secondary disabled:opacity-50"
                      >
                        {imageLoadingId === proof.id ? 'Cargando…' : 'Ver comprobante'}
                      </button>
                    )}
                  {canConfirmOrReject && (
                    <>
                      <button
                        type="button"
                        disabled={busyId === proof.id}
                        onClick={() => setConfirmModal({ open: true, proof })}
                        className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
                      >
                        Confirmar pago
                      </button>
                      <button
                        type="button"
                        disabled={busyId === proof.id}
                        onClick={() =>
                          setRejectModal({ open: true, proofId: proof.id, note: '' })
                        }
                        className="rounded-lg border border-rose-300 px-4 py-2 text-sm text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                      >
                        Rechazar
                      </button>
                    </>
                  )}
                  {canDismissStale && (
                    <button
                      type="button"
                      disabled={busyId === proof.id}
                      onClick={() => openDismissModal(proof.id)}
                      className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Descartar
                    </button>
                  )}
                  </div>
                </div>

                <ul className="mt-4 text-sm text-brand-ink-muted">
                  {proof.items.map((item, idx) => (
                    <li key={`${proof.id}-${idx}`}>
                      {item.quantity}× {item.productName} — {formatClp(item.subtotal)}
                    </li>
                  ))}
                </ul>

                {proofSummaryLine(proof.visionSummary) && (
                  <p className="mt-3 text-xs text-brand-ink-muted">
                    {proofSummaryLine(proof.visionSummary)}
                  </p>
                )}

                {canDismissStale && (
                  <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
                    Registro antiguo: el pedido ya no está pendiente de pago. Usa{' '}
                    <strong>Descartar</strong> para quitarlo de la bandeja.
                  </p>
                )}

                <p className="mt-2 text-xs text-brand-ink-muted/80">
                  {new Date(proof.createdAt).toLocaleString('es-CL')}
                </p>
              </article>
            );
          })}
        </div>
      </AppPageContent>

      <ConfirmActionModal
        open={confirmModal.open}
        title="Confirmar pago"
        message={
          confirmModal.proof
            ? `¿Confirmar pago del pedido #${confirmModal.proof.saleId.slice(0, 8)} por ${formatClp(confirmModal.proof.expectedTotal)}? El cliente recibirá un mensaje por WhatsApp.`
            : ''
        }
        confirmLabel="Confirmar"
        variant="primary"
        isProcessing={busyId != null}
        onConfirm={() => {
          if (confirmModal.proof) void handleConfirm(confirmModal.proof);
        }}
        onCancel={() => setConfirmModal({ open: false, proof: null })}
      />

      {rejectModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-ink/40 p-4">
          <div className="app-panel w-full max-w-md p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-brand-ink">
              {proofs.find((p) => p.id === rejectModal.proofId) &&
              !isSaleClosedForProof(proofs.find((p) => p.id === rejectModal.proofId)!.saleStatus)
                ? 'Rechazar comprobante'
                : 'Descartar registro'}
            </h2>
            <p className="mt-2 text-sm text-brand-ink-muted">
              {proofs.find((p) => p.id === rejectModal.proofId) &&
              !isSaleClosedForProof(proofs.find((p) => p.id === rejectModal.proofId)!.saleStatus)
                ? 'El pedido se cancelará y el stock reservado volverá al inventario.'
                : 'Solo se archiva este comprobante; el pedido ya estaba cerrado.'}
            </p>
            <textarea
              value={rejectModal.note}
              onChange={(ev) => setRejectModal((s) => ({ ...s, note: ev.target.value }))}
              placeholder="Motivo (opcional)"
              rows={3}
              className="mt-4 w-full rounded-lg border border-brand-linen bg-white px-3 py-2 text-sm text-brand-ink outline-none focus:border-brand-olive focus:ring-2 focus:ring-brand-olive/20"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectModal({ open: false, proofId: '', note: '' })}
                className="app-btn-secondary"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={busyId != null}
                onClick={() => void handleReject()}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-500 disabled:opacity-50"
              >
                Rechazar
              </button>
            </div>
          </div>
        </div>
      )}

      {imagePreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-brand-ink/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="app-panel max-h-[90vh] max-w-3xl overflow-auto p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm text-brand-ink-muted">
                Comprobante · pedido #{imagePreview.proofId.slice(0, 8)}
              </p>
              <button type="button" onClick={() => setImagePreview(null)} className="app-btn-secondary">
                Cerrar
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imagePreview.dataUrl}
              alt="Comprobante de transferencia"
              className="mx-auto max-h-[75vh] w-auto rounded-lg border border-brand-linen"
            />
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
