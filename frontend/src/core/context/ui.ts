import { create } from 'zustand';
import {
  type ApiErrorContext,
  formatErrorForDisplay,
  getFriendlyApiError,
} from '@/core/api/api-error-messages';

export type ToastType = 'success' | 'error' | 'info';

export type ToastAction = {
  label: string;
  onClick: () => void | Promise<void>;
};

export type ToastItem = {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  durationMs: number;
  action?: ToastAction;
};

type UiState = {
  toasts: ToastItem[];
  pushToast: (toast: Omit<ToastItem, 'id'>) => string;
  removeToast: (id: string) => void;
};

export const useUiStore = create<UiState>((set) => ({
  toasts: [],
  pushToast: (toast) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
    return id;
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    })),
}));

export function notifySuccess(title: string, message?: string): string {
  return useUiStore.getState().pushToast({
    type: 'success',
    title,
    message,
    durationMs: 3500,
  });
}

export function notifyError(title: string, message?: string): string {
  return useUiStore.getState().pushToast({
    type: 'error',
    title,
    message,
    durationMs: 5000,
  });
}

export function notifyInfo(title: string, message?: string): string {
  return useUiStore.getState().pushToast({
    type: 'info',
    title,
    message,
    durationMs: 3200,
  });
}

/** Toast con acción Deshacer (ventana corta para revertir soft delete). */
export function notifyUndoAction(options: {
  title: string;
  message?: string;
  onUndo: () => void | Promise<void>;
  durationMs?: number;
}): string {
  return useUiStore.getState().pushToast({
    type: 'info',
    title: options.title,
    message: options.message ?? 'Puedes deshacer esta acción durante unos segundos.',
    durationMs: options.durationMs ?? 8000,
    action: {
      label: 'Deshacer',
      onClick: options.onUndo,
    },
  });
}

/** Toast + mensaje amigable según contexto de acción y código de error del API. */
export function notifyApiError(
  context: ApiErrorContext,
  error: unknown,
  options?: { toast?: boolean }
): FriendlyApiErrorResult {
  const friendly = getFriendlyApiError(error, context);
  const displayMessage = formatErrorForDisplay(friendly);
  if (options?.toast !== false) {
    notifyError(friendly.title, displayMessage);
  }
  return { friendly, displayMessage };
}

export type FriendlyApiErrorResult = {
  friendly: ReturnType<typeof getFriendlyApiError>;
  displayMessage: string;
};

