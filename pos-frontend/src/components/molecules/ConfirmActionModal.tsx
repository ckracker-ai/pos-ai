'use client';

type ConfirmActionModalProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'primary' | 'danger';
  isProcessing?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmActionModal({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'primary',
  isProcessing = false,
  onCancel,
  onConfirm,
}: ConfirmActionModalProps) {
  if (!open) return null;

  const confirmClasses =
    variant === 'danger'
      ? 'app-btn-danger'
      : 'app-btn-primary';

  return (
    <div className="app-modal-overlay !z-[70]">
      <div className="app-modal-panel w-full max-w-md rounded-[2rem] p-7 shadow-2xl">
        <h3 className="text-lg font-semibold text-[#3D4532]">{title}</h3>
        <p className="mt-3 text-sm text-brand-ink-muted">{message}</p>

        <div className="mt-8 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className="app-btn-secondary rounded-3xl px-5 py-2 text-sm disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isProcessing}
            className={`rounded-3xl px-5 py-2 text-sm font-semibold disabled:opacity-50 ${confirmClasses}`}
          >
            {isProcessing ? 'Procesando…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

