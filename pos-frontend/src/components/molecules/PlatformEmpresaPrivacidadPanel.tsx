'use client';

import { useCallback, useEffect, useState } from 'react';
import { platformFetch } from '@/core/context/platform-auth';
import { unwrapApiEnvelope } from '@/core/api/normalizers';
import { TenantDataDeletionModal } from '@/components/molecules/TenantDataDeletionModal';

type DeletionStatus = {
  requestId: string;
  status: string;
  scheduledPurgeAt: string;
  rollbackHours: number;
  canCancel: boolean;
  initiatedByPlatform: boolean;
};

type Props = {
  empresaId: string;
  onMessage?: (msg: string | null, isError?: boolean) => void;
};

export function PlatformEmpresaPrivacidadPanel({ empresaId, onMessage }: Props) {
  const [deletion, setDeletion] = useState<DeletionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [processing, setProcessing] = useState(false);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await platformFetch<{ deletion: DeletionStatus | null }>(
        `platform/empresas/${empresaId}/data-deletion-status`
      );
      const data = unwrapApiEnvelope(res) as { deletion?: DeletionStatus | null };
      setDeletion(data.deletion ?? null);
    } catch (err) {
      onMessage?.(err instanceof Error ? err.message : 'No se pudo cargar el estado', true);
    } finally {
      setLoading(false);
    }
  }, [empresaId, onMessage]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const handleConfirm = async (input: { confirmationPhrase: string; notes: string }) => {
    setProcessing(true);
    try {
      await platformFetch(`platform/empresas/${empresaId}/data-deletion-request`, {
        method: 'POST',
        body: JSON.stringify({
          confirmationPhrase: input.confirmationPhrase,
          notes: input.notes || undefined,
        }),
      });
      setModalOpen(false);
      onMessage?.('Eliminación programada. El tenant tiene 24 h para cancelar (si aplica).');
      await loadStatus();
    } catch (err) {
      onMessage?.(err instanceof Error ? err.message : 'No se pudo programar la eliminación', true);
    } finally {
      setProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (!deletion?.canCancel) return;
    if (!confirm('¿Cancelar la eliminación programada de este tenant?')) return;
    setProcessing(true);
    try {
      await platformFetch(`platform/empresas/${empresaId}/data-deletion-cancel`, {
        method: 'POST',
        body: JSON.stringify({ requestId: deletion.requestId }),
      });
      onMessage?.('Eliminación cancelada.');
      await loadStatus();
    } catch (err) {
      onMessage?.(err instanceof Error ? err.message : 'No se pudo cancelar', true);
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('es-CL');
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 p-5">
        <h3 className="text-sm font-semibold text-amber-950">Eliminación de datos (plataforma)</h3>
        <p className="mt-2 text-sm text-amber-900/90">
          Programa la eliminación del tenant con ventana de rollback de 24 horas. Al vencer el plazo se
          suspende la empresa y se cancela la suscripción.
        </p>

        {loading ? (
          <p className="mt-4 text-sm text-brand-ink-muted">Cargando estado…</p>
        ) : deletion &&
          (deletion.status === 'SCHEDULED' ||
            deletion.status === 'PENDING' ||
            deletion.status === 'IN_PROGRESS') ? (
          <div className="mt-4 rounded-lg border border-amber-300 bg-white/80 p-4 text-sm">
            <p className="font-semibold text-amber-950">
              {deletion.status === 'IN_PROGRESS' ? 'Eliminación en ejecución' : 'Eliminación programada'}
            </p>
            <p className="mt-1 text-amber-900/90">
              {deletion.status === 'IN_PROGRESS'
                ? 'Suspendiendo empresa y cancelando suscripción…'
                : `Ejecución estimada: ${formatDate(deletion.scheduledPurgeAt)}`}
              {deletion.initiatedByPlatform ? ' · iniciada por plataforma' : ''}
            </p>
            {deletion.canCancel ? (
              <button
                type="button"
                onClick={() => void handleCancel()}
                disabled={processing}
                className="mt-3 rounded-lg border border-amber-700 bg-white px-4 py-2 text-sm font-semibold text-amber-950 hover:bg-amber-100 disabled:opacity-60"
              >
                {processing ? 'Cancelando…' : 'Cancelar eliminación'}
              </button>
            ) : null}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="mt-4 rounded-lg border border-amber-700 bg-white px-4 py-2 text-sm font-semibold text-amber-950 transition hover:bg-amber-100"
          >
            Programar eliminación de datos
          </button>
        )}
      </div>

      <TenantDataDeletionModal
        open={modalOpen}
        rollbackHours={deletion?.rollbackHours ?? 24}
        initiatedByPlatform
        isProcessing={processing}
        onCancel={() => setModalOpen(false)}
        onConfirm={(input) => void handleConfirm(input)}
      />
    </div>
  );
}
