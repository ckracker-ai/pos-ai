'use client';

import { useEffect } from 'react';
import { useUiStore } from '@/store/ui';

const styleByType: Record<string, string> = {
  success: 'border-emerald-200/90 bg-white text-brand-ink shadow-lg shadow-brand-olive/10',
  error: 'border-rose-200 bg-white text-brand-ink shadow-lg shadow-rose-900/5',
  info: 'border-sky-200 bg-white text-brand-ink shadow-lg shadow-sky-900/5',
};

export function ToastViewport() {
  const toasts = useUiStore((s) => s.toasts);
  const removeToast = useUiStore((s) => s.removeToast);

  useEffect(() => {
    const timers = toasts.map((toast) =>
      window.setTimeout(() => removeToast(toast.id), toast.durationMs)
    );
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [toasts, removeToast]);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[80] flex w-full max-w-sm flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto rounded-2xl border px-4 py-3 shadow-xl backdrop-blur ${styleByType[toast.type]}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">{toast.title}</p>
              {toast.message ? (
                <p className="mt-1 text-xs leading-relaxed text-brand-ink-muted">{toast.message}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="rounded-lg px-2 py-1 text-xs text-brand-ink-muted hover:bg-brand-vainilla hover:text-brand-ink"
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>
          {toast.action ? (
            <button
              type="button"
              onClick={async () => {
                try {
                  await toast.action?.onClick();
                  removeToast(toast.id);
                } catch {
                  /* el llamador muestra el error */
                }
              }}
              className="mt-3 rounded-xl border border-brand-linen bg-brand-vainilla px-3 py-1.5 text-xs font-semibold text-brand-olive hover:bg-brand-linen/40"
            >
              {toast.action.label}
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}

