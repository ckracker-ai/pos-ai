import type { User } from '@/core/interfaces';
import { useAuthStore } from '@/core/context/auth';
import { useBranchStore } from '@/store/branch';

export type SupportHandoffPayload = {
  user: User;
  branchId?: string;
};

export function applySupportHandoff(payload: SupportHandoffPayload): void {
  useAuthStore.getState().setUser(payload.user);
  if (payload.branchId) {
    useBranchStore.getState().setSelectedBranchId(payload.branchId);
  } else if (payload.user.branchId) {
    useBranchStore.getState().setSelectedBranchId(payload.user.branchId);
  }
}

export function consumeSupportHandoff(_handoffId: string): boolean {
  return false;
}

export function openSupportPlaceholderTab(): Window | null {
  const tab = window.open('about:blank', '_blank');
  if (!tab) return null;
  try {
    tab.document.title = 'POS-AI — sesión de soporte';
    tab.document.body.innerHTML =
      '<p style="font-family:system-ui,sans-serif;padding:2rem;color:#3d4a2c">Iniciando sesión de soporte…</p>';
  } catch {
    // Cross-origin guard if the document is not writable yet.
  }
  return tab;
}

export function navigateSupportTab(tab: Window): void {
  tab.location.href = '/dashboard';
}

export function closeSupportTab(tab: Window | null): void {
  try {
    tab?.close();
  } catch {
    // ignore
  }
}
