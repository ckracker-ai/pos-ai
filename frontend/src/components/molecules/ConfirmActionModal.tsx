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
      ? 'bg-rose-600 hover:bg-rose-500'
      : 'bg-sky-600 hover:bg-sky-500';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 p-4">
      <div className="w-full max-w-md rounded-[2rem] border border-slate-800 bg-slate-950 p-7 shadow-2xl">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <p className="mt-3 text-sm text-slate-300">{message}</p>

        <div className="mt-8 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className="rounded-3xl border border-slate-700 px-5 py-2 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isProcessing}
            className={`rounded-3xl px-5 py-2 text-sm font-semibold text-white disabled:opacity-50 ${confirmClasses}`}
          >
            {isProcessing ? 'Procesando…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

