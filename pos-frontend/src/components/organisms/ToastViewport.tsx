'use client';

import { useEffect } from 'react';
import { useUiStore } from '@/store/ui';

const styleByType: Record<string, string> = {
  success:
    'border-emerald-500/50 bg-slate-900 text-emerald-100 shadow-lg shadow-black/30',
  error: 'border-rose-500/60 bg-slate-900 text-rose-50 shadow-lg shadow-black/30',
  info: 'border-sky-500/50 bg-slate-900 text-sky-100 shadow-lg shadow-black/30',
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
                <p className="mt-1 text-xs leading-relaxed text-slate-300">{toast.message}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-white/10 hover:text-slate-200"
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
              className="mt-3 rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/20"
            >
              {toast.action.label}
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}

