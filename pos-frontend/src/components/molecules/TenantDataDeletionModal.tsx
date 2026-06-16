'use client';

import { FormEvent, useEffect, useState } from 'react';

export const TENANT_DELETION_CONFIRMATION_PHRASE = 'confirmar eliminacion empresa';

function normalizePhrase(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, ' ');
}

type Props = {
  open: boolean;
  rollbackHours?: number;
  initiatedByPlatform?: boolean;
  isProcessing?: boolean;
  onCancel: () => void;
  onConfirm: (input: { confirmationPhrase: string; notes: string }) => void;
};

export function TenantDataDeletionModal({
  open,
  rollbackHours = 24,
  initiatedByPlatform = false,
  isProcessing = false,
  onCancel,
  onConfirm,
}: Props) {
  const [phrase, setPhrase] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!open) {
      setPhrase('');
      setNotes('');
    }
  }, [open]);

  if (!open) return null;

  const phraseOk =
    normalizePhrase(phrase) === normalizePhrase(TENANT_DELETION_CONFIRMATION_PHRASE);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!phraseOk || isProcessing) return;
    onConfirm({ confirmationPhrase: phrase.trim(), notes: notes.trim() });
  };

  return (
    <div className="app-modal-overlay !z-[70]">
      <form
        onSubmit={handleSubmit}
        className="app-modal-panel w-full max-w-lg rounded-[2rem] p-7 shadow-2xl"
      >
        <h3 className="text-lg font-semibold text-rose-950">Eliminar todos los datos de la empresa</h3>
        <p className="mt-3 text-sm text-brand-ink-muted">
          {initiatedByPlatform
            ? 'Como super-admin estás programando la eliminación de este tenant.'
            : 'Esta acción programa la eliminación de todos los datos operativos de tu empresa en POS-AI.'}{' '}
          Tendrás <strong className="font-semibold text-brand-ink">{rollbackHours} horas</strong> para
          cancelar antes de que se ejecute la suspensión y cancelación de suscripción.
        </p>
        <p className="mt-3 rounded-lg border border-amber-200/80 bg-amber-50/70 px-3 py-2 text-sm text-amber-950">
          ¿Deseas eliminar todos los datos de la empresa? Escribe exactamente la frase de confirmación
          (sin tildes ni mayúsculas):
        </p>
        <p className="mt-2 rounded-md bg-brand-surface/80 px-3 py-2 font-mono text-sm text-brand-ink">
          {TENANT_DELETION_CONFIRMATION_PHRASE}
        </p>
        <label className="mt-4 block text-xs font-medium text-brand-ink-muted">
          Frase de confirmación
          <input
            type="text"
            autoComplete="off"
            spellCheck={false}
            value={phrase}
            onChange={(e) => setPhrase(e.target.value)}
            placeholder={TENANT_DELETION_CONFIRMATION_PHRASE}
            className="mt-1 w-full rounded-lg border border-brand-linen bg-white px-3 py-2 text-sm text-brand-ink outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-200"
          />
        </label>
        <label className="mt-3 block text-xs font-medium text-brand-ink-muted">
          Motivo o alcance (opcional)
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-1 w-full rounded-lg border border-brand-linen bg-white px-3 py-2 text-sm text-brand-ink outline-none focus:border-brand-olive focus:ring-2 focus:ring-brand-olive/20"
          />
        </label>
        <div className="mt-8 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className="app-btn-secondary rounded-3xl px-5 py-2 text-sm disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!phraseOk || isProcessing}
            className="app-btn-danger rounded-3xl px-5 py-2 text-sm font-semibold disabled:opacity-50"
          >
            {isProcessing ? 'Programando…' : 'Programar eliminación'}
          </button>
        </div>
      </form>
    </div>
  );
}
