'use client';

import { useCallback, useEffect, useRef } from 'react';

type Props = {
  message: string | null;
  /** Incrementar al mostrar un aviso nuevo (reinicia el temporizador aunque el texto sea igual). */
  messageKey: number;
  type: 'success' | 'error';
  onDismiss: () => void;
  durationMs?: number;
};

const DEFAULT_DURATION: Record<Props['type'], number> = {
  success: 4500,
  error: 6500,
};

export function PosActionAlert({ message, messageKey, type, onDismiss, durationMs }: Props) {
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;

  const dismiss = useCallback(() => {
    dismissRef.current();
  }, []);

  useEffect(() => {
    if (!message) return;
    const ms = durationMs ?? DEFAULT_DURATION[type];
    const timer = window.setTimeout(dismiss, ms);
    return () => window.clearTimeout(timer);
  }, [message, messageKey, type, durationMs, dismiss]);

  if (!message) return null;

  const isSuccess = type === 'success';

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="pointer-events-none fixed inset-x-3 bottom-4 z-[90] flex justify-center sm:inset-x-auto sm:right-4 sm:bottom-6 sm:justify-end"
    >
      <div
        className={`pos-action-alert-enter pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl border px-4 py-3 shadow-lg sm:max-w-sm ${
          isSuccess
            ? 'border-emerald-400/60 bg-emerald-50 text-emerald-950'
            : 'border-rose-400/60 bg-rose-50 text-rose-950'
        }`}
      >
        <span
          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
            isSuccess ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
          }`}
          aria-hidden
        >
          {isSuccess ? '✓' : '!'}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{isSuccess ? 'Listo' : 'Atención'}</p>
          <p className="mt-0.5 text-sm leading-snug">{message}</p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold opacity-60 transition hover:opacity-100"
          aria-label="Cerrar aviso"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
