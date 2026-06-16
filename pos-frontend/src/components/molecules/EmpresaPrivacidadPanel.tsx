'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/core/api/api-client';
import { unwrapApiEnvelope } from '@/core/api/normalizers';
import { notifyApiError, notifySuccess } from '@/store/ui';
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
};

export function EmpresaPrivacidadPanel({ empresaId }: Props) {
  const [exporting, setExporting] = useState(false);
  const [deletion, setDeletion] = useState<DeletionStatus | null>(null);
  const [loadingDeletion, setLoadingDeletion] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [requestingDeletion, setRequestingDeletion] = useState(false);

  const loadDeletionStatus = useCallback(async () => {
    setLoadingDeletion(true);
    try {
      const res = await api.getEmpresaDataDeletionStatus(empresaId);
      const data = unwrapApiEnvelope(res.data) as { deletion?: DeletionStatus | null };
      setDeletion(data.deletion ?? null);
    } catch (error) {
      notifyApiError('empresas.privacidad', error);
    } finally {
      setLoadingDeletion(false);
    }
  }, [empresaId]);

  useEffect(() => {
    void loadDeletionStatus();
  }, [loadDeletionStatus]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await api.getEmpresaDataExport(empresaId);
      const data = unwrapApiEnvelope(res.data) as { export?: Record<string, unknown> };
      const payload = data.export ?? data;
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `pos-ai-export-${empresaId.slice(0, 8)}-${Date.now()}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      notifySuccess('Exportación descargada', 'Paquete JSON con datos operativos del negocio.');
    } catch (error) {
      notifyApiError('empresas.privacidad', error);
    } finally {
      setExporting(false);
    }
  };

  const handleDeletionConfirm = async (input: { confirmationPhrase: string; notes: string }) => {
    setRequestingDeletion(true);
    try {
      const res = await api.createEmpresaDataDeletionRequest(empresaId, {
        confirmationPhrase: input.confirmationPhrase,
        notes: input.notes || undefined,
      });
      const data = unwrapApiEnvelope(res.data) as DeletionStatus;
      const purgeAt = data.scheduledPurgeAt
        ? new Date(data.scheduledPurgeAt).toLocaleString('es-CL')
        : '24 h';
      notifySuccess(
        'Eliminación programada',
        `Puedes cancelar hasta ${purgeAt}. Pasado ese plazo se suspenderá la cuenta.`
      );
      setModalOpen(false);
      await loadDeletionStatus();
    } catch (error) {
      notifyApiError('empresas.privacidad', error);
    } finally {
      setRequestingDeletion(false);
    }
  };

  const handleCancelDeletion = async () => {
    if (!deletion?.canCancel) return;
    if (!confirm('¿Cancelar la eliminación programada de los datos de tu empresa?')) return;
    setRequestingDeletion(true);
    try {
      await api.cancelEmpresaDataDeletionRequest(empresaId, { requestId: deletion.requestId });
      notifySuccess('Eliminación cancelada', 'Tu empresa sigue activa con normalidad.');
      await loadDeletionStatus();
    } catch (error) {
      notifyApiError('empresas.privacidad', error);
    } finally {
      setRequestingDeletion(false);
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
      <div className="rounded-xl border border-brand-linen bg-brand-surface/40 p-5">
        <h3 className="text-sm font-semibold text-brand-ink">Portabilidad de datos</h3>
        <p className="mt-2 text-sm text-brand-ink-muted">
          Descarga un archivo JSON con perfil de empresa, sucursales, usuarios (sin contraseñas),
          catálogo, resumen de ventas y aceptaciones legales registradas.
        </p>
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className="app-btn-primary mt-4 disabled:opacity-60"
        >
          {exporting ? 'Generando…' : 'Exportar datos (JSON)'}
        </button>
      </div>

      <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 p-5">
        <h3 className="text-sm font-semibold text-amber-950">Eliminación de datos</h3>
        <p className="mt-2 text-sm text-amber-900/90">
          Si deseas eliminar todos los datos de la empresa, puedes programarlo aquí. Tendrás{' '}
          <strong className="font-semibold">24 horas</strong> para cancelar antes de que se suspenda la
          cuenta y se cancele la suscripción.
        </p>

        {loadingDeletion ? (
          <p className="mt-3 text-sm text-brand-ink-muted">Cargando estado…</p>
        ) : deletion &&
          (deletion.status === 'SCHEDULED' ||
            deletion.status === 'PENDING' ||
            deletion.status === 'IN_PROGRESS') ? (
          <div className="mt-4 rounded-lg border border-amber-300 bg-white/80 p-4 text-sm">
            <p className="font-semibold text-amber-950">
              {deletion.status === 'IN_PROGRESS'
                ? 'Eliminación en ejecución'
                : 'Eliminación programada'}
            </p>
            <p className="mt-1 text-amber-900/90">
              {deletion.status === 'IN_PROGRESS'
                ? 'Suspendiendo empresa y cancelando suscripción…'
                : `Fecha de ejecución: ${formatDate(deletion.scheduledPurgeAt)}`}
              {deletion.initiatedByPlatform ? ' · solicitada por soporte plataforma' : ''}
            </p>
            {deletion.canCancel ? (
              <button
                type="button"
                onClick={() => void handleCancelDeletion()}
                disabled={requestingDeletion}
                className="mt-3 rounded-lg border border-amber-700 bg-white px-4 py-2 text-sm font-semibold text-amber-950 transition hover:bg-amber-100 disabled:opacity-60"
              >
                {requestingDeletion ? 'Cancelando…' : 'Cancelar eliminación'}
              </button>
            ) : (
              <p className="mt-2 text-xs text-amber-800">El plazo de cancelación ya venció.</p>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="mt-4 rounded-lg border border-amber-700 bg-white px-4 py-2 text-sm font-semibold text-amber-950 transition hover:bg-amber-100"
          >
            Solicitar eliminación de datos
          </button>
        )}
      </div>

      <TenantDataDeletionModal
        open={modalOpen}
        rollbackHours={deletion?.rollbackHours ?? 24}
        isProcessing={requestingDeletion}
        onCancel={() => setModalOpen(false)}
        onConfirm={(input) => void handleDeletionConfirm(input)}
      />

      <p className="text-xs text-brand-ink-muted">
        Más información en{' '}
        <a href="/legal/privacidad" target="_blank" className="text-brand-olive hover:underline">
          Política de Privacidad
        </a>{' '}
        y{' '}
        <a href="/legal/sla" target="_blank" className="text-brand-olive hover:underline">
          SLA
        </a>
        .
      </p>
    </div>
  );
}
