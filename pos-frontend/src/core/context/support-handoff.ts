import type { User } from '@/core/interfaces';
import { useAuthStore } from '@/core/context/auth';
import { useBranchStore } from '@/store/branch';

const HANDOFF_PREFIX = 'pos-support-handoff:';
const HANDOFF_TTL_MS = 2 * 60 * 1000;

/** HTTP (sin HTTPS) no expone crypto.randomUUID — fallback para EC2 por IP. */
function createHandoffId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `h-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export type SupportHandoffPayload = {
  token: string;
  user: User;
  branchId?: string;
  exp: number;
};

export function stashSupportHandoff(payload: Omit<SupportHandoffPayload, 'exp'>): string {
  const id = createHandoffId();
  const record: SupportHandoffPayload = { ...payload, exp: Date.now() + HANDOFF_TTL_MS };
  localStorage.setItem(`${HANDOFF_PREFIX}${id}`, JSON.stringify(record));
  return id;
}

export function consumeSupportHandoff(handoffId: string): boolean {
  const key = `${HANDOFF_PREFIX}${handoffId}`;
  const raw = localStorage.getItem(key);
  localStorage.removeItem(key);
  if (!raw) return false;

  let record: SupportHandoffPayload;
  try {
    record = JSON.parse(raw) as SupportHandoffPayload;
  } catch {
    return false;
  }

  if (!record.token || !record.user || record.exp < Date.now()) {
    return false;
  }

  useAuthStore.getState().setToken(record.token);
  useAuthStore.getState().setUser(record.user);
  if (record.branchId) {
    useBranchStore.getState().setSelectedBranchId(record.branchId);
  } else if (record.user.branchId) {
    useBranchStore.getState().setSelectedBranchId(record.user.branchId);
  }
  return true;
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

export function navigateSupportTab(tab: Window, handoffId: string): void {
  tab.location.href = `/dashboard?support=${encodeURIComponent(handoffId)}`;
}

export function closeSupportTab(tab: Window | null): void {
  try {
    tab?.close();
  } catch {
    // ignore
  }
}
