'use client';

import { useState } from 'react';
import { api } from '@/core/api/api-client';
import { unwrapApiEnvelope } from '@/core/api/normalizers';
import { notifyApiError, notifySuccess } from '@/store/ui';

type Props = {
  empresaId: string;
};

export function EmpresaPrivacidadPanel({ empresaId }: Props) {
  const [exporting, setExporting] = useState(false);
  const [deletionNotes, setDeletionNotes] = useState('');
  const [requestingDeletion, setRequestingDeletion] = useState(false);

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

  const handleDeletionRequest = async () => {
    setRequestingDeletion(true);
    try {
      const res = await api.createEmpresaDataDeletionRequest(empresaId, {
        notes: deletionNotes.trim() || undefined,
      });
      const data = unwrapApiEnvelope(res.data) as { requestId?: string };
      notifySuccess(
        'Solicitud registrada',
        data.requestId
          ? `Ticket ${data.requestId.slice(0, 8)}… — soporte contactará en hasta 10 días hábiles.`
          : 'Soporte revisará tu solicitud de eliminación.'
      );
      setDeletionNotes('');
    } catch (error) {
      notifyApiError('empresas.privacidad', error);
    } finally {
      setRequestingDeletion(false);
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
        <h3 className="text-sm font-semibold text-amber-950">Solicitud de eliminación</h3>
        <p className="mt-2 text-sm text-amber-900/90">
          Crea un ticket para cancelación/eliminación de datos del tenant. No borra la cuenta de
          inmediato; el equipo valida retención legal (ventas, pagos) antes del purge.
        </p>
        <textarea
          className="mt-3 w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-brand-ink outline-none focus:border-brand-olive focus:ring-2 focus:ring-brand-olive/20"
          rows={3}
          placeholder="Motivo o alcance (opcional)"
          value={deletionNotes}
          onChange={(e) => setDeletionNotes(e.target.value)}
        />
        <button
          type="button"
          onClick={handleDeletionRequest}
          disabled={requestingDeletion}
          className="mt-3 rounded-lg border border-amber-700 bg-white px-4 py-2 text-sm font-semibold text-amber-950 transition hover:bg-amber-100 disabled:opacity-60"
        >
          {requestingDeletion ? 'Enviando…' : 'Solicitar eliminación de datos'}
        </button>
      </div>

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
