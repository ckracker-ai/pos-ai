import { create } from 'zustand';
import { LoginLegalReauthBundle, LoginRequest, User, UserRole } from '@/core/interfaces';
import { getFriendlyApiError } from '@/core/api/api-error-messages';
import { getRoleProfile } from '@/core/config/role-access';
import { posProxyPath } from '@/core/constants/api-path';
import { useBranchStore } from '@/store/branch';

interface RegisterRequest extends LoginRequest {
  name?: string;
  fullName?: string;
  role?: UserRole;
  branchId?: string;
}

export type SupportSessionInfo = {
  active: boolean;
  email?: string;
  expiresAt?: Date;
};

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  supportSession: SupportSessionInfo;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (payload: RegisterRequest) => Promise<void>;
  logout: () => void;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  clearError: () => void;
  hydrate: () => Promise<void>;
}

const getBffBaseUrl = () =>
  (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/$/, '');

const normalizeRoleName = (roleName?: string): UserRole => {
  if (!roleName) return 'user';
  const normalized = roleName.toLowerCase();
  if (normalized.includes('comanda')) return 'comanda';
  if (normalized.includes('admin')) return 'admin';
  if (normalized.includes('auditor')) return 'auditor';
  if (normalized.includes('seller') || normalized.includes('vendedor')) return 'seller';
  return 'user';
};

const normalizeAuthUser = (
  apiUser: Record<string, unknown>,
  fallbackEmail: string
): User => ({
  id: String(apiUser.id || ''),
  email: String(apiUser.email || fallbackEmail),
  name: String(apiUser.fullName || apiUser.name || apiUser.roleName || 'Usuario'),
  role: normalizeRoleName(String(apiUser.roleName || apiUser.role || 'user')),
  branchId: apiUser.branchId ? String(apiUser.branchId) : undefined,
  isActive: apiUser.isActive !== false,
  createdAt: String(apiUser.createdAt || new Date().toISOString()),
  updatedAt: String(apiUser.updatedAt || new Date().toISOString()),
});

const parseJsonResponse = async (response: Response) => {
  const text = await response.text();
  return text ? JSON.parse(text) : {};
};

const credentialsInit = (init: RequestInit = {}): RequestInit => ({
  ...init,
  credentials: 'include',
});

const applySessionUser = (normalizedUser: User) => {
  const canSwitchBranch = getRoleProfile(normalizedUser.role).canSwitchBranch;
  if (normalizedUser.branchId && !canSwitchBranch) {
    useBranchStore.getState().setSelectedBranchId(normalizedUser.branchId);
  }
};

const supportFromPayload = (payload: Record<string, unknown>, user?: User | null): SupportSessionInfo => {
  if (!payload.supportSession) return { active: false };
  const expiresAtRaw = payload.supportExpiresAt;
  return {
    active: true,
    email: user?.email,
    expiresAt: typeof expiresAtRaw === 'string' ? new Date(expiresAtRaw) : undefined,
  };
};

const clearLegacyAuthStorage = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('auth-store');
};

export const readSupportSessionFromToken = (_token: string | null): SupportSessionInfo => {
  return useAuthStore.getState().supportSession;
};

export const useAuthStore = create<AuthStore>()((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  supportSession: { active: false },

  login: async (credentials: LoginRequest) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(
        `${getBffBaseUrl()}${posProxyPath('auth/login')}`,
        credentialsInit({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(credentials),
        })
      );

      const payload = await parseJsonResponse(response);

      if (!response.ok || payload.success === false) {
        const apiErr = String(payload.error || payload.message || 'INVALID_CREDENTIALS');
        if (
          credentials.email.trim().toLowerCase() === 'platform@pos-ai.local' ||
          credentials.email.trim().toLowerCase().includes('platform@')
        ) {
          throw new Error(
            'Estas credenciales son de super-admin plataforma. Usa http://localhost:8010/platform/login'
          );
        }
        if (apiErr === 'LEGAL_REAUTH_REQUIRED' && payload.data) {
          const legalErr = new Error('LEGAL_REAUTH_REQUIRED') as Error & {
            code: 'LEGAL_REAUTH_REQUIRED';
            legal: LoginLegalReauthBundle;
          };
          legalErr.code = 'LEGAL_REAUTH_REQUIRED';
          legalErr.legal = payload.data as LoginLegalReauthBundle;
          throw legalErr;
        }
        throw new Error(apiErr);
      }

      const authData = payload.data ?? {};
      if (!authData.user) {
        throw new Error('La respuesta de autenticacion no incluyo usuario.');
      }

      const normalizedUser = normalizeAuthUser(authData.user, credentials.email);
      applySessionUser(normalizedUser);
      clearLegacyAuthStorage();
      set({
        user: normalizedUser,
        token: null,
        isAuthenticated: true,
        isLoading: false,
        supportSession: supportFromPayload(authData, normalizedUser),
      });
    } catch (error) {
      if (
        error instanceof Error &&
        (error as Error & { code?: string }).code === 'LEGAL_REAUTH_REQUIRED'
      ) {
        set({ isLoading: false, isAuthenticated: false });
        throw error;
      }
      const errorMessage = getFriendlyApiError(error, 'auth.login').message;
      set({
        error: errorMessage,
        isLoading: false,
        isAuthenticated: false,
      });
      throw new Error(errorMessage);
    }
  },

  register: async (payload: RegisterRequest) => {
    set({ isLoading: true, error: null });
    try {
      const branchId = payload.branchId || process.env.NEXT_PUBLIC_DEFAULT_BRANCH_ID || '1';
      const response = await fetch(
        `${getBffBaseUrl()}${posProxyPath('auth/register')}`,
        credentialsInit({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Branch-ID': branchId,
          },
          body: JSON.stringify(payload),
        })
      );

      const data = await parseJsonResponse(response);

      if (!response.ok || data.success === false) {
        throw new Error(data.message || data.error || 'No se pudo registrar el usuario.');
      }

      set({ isLoading: false });
    } catch (error) {
      const errorMessage =
        (error instanceof Error && error.message) || 'Error al registrar usuario.';
      set({ error: errorMessage, isLoading: false });
      throw new Error(errorMessage);
    }
  },

  logout: () => {
    void fetch(`${getBffBaseUrl()}${posProxyPath('auth/logout')}`, credentialsInit({ method: 'POST' }));
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      error: null,
      supportSession: { active: false },
    });
    clearLegacyAuthStorage();
  },

  setUser: (user: User | null) => {
    set({ user, isAuthenticated: user !== null });
  },

  setToken: (_token: string | null) => {
    set({ token: null });
  },

  clearError: () => {
    set({ error: null });
  },

  hydrate: async () => {
    clearLegacyAuthStorage();
    try {
      const response = await fetch(
        `${getBffBaseUrl()}${posProxyPath('auth/session')}`,
        credentialsInit({ method: 'GET' })
      );
      const payload = await parseJsonResponse(response);
      if (!response.ok || payload.success === false || !payload.data?.user) {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          supportSession: { active: false },
        });
        return;
      }
      const session = payload.data as Record<string, unknown>;
      const normalizedUser = normalizeAuthUser(
        session.user as Record<string, unknown>,
        String((session.user as Record<string, unknown>)?.email ?? '')
      );
      applySessionUser(normalizedUser);
      set({
        user: normalizedUser,
        token: null,
        isAuthenticated: true,
        supportSession: supportFromPayload(session, normalizedUser),
      });
    } catch {
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        supportSession: { active: false },
      });
    }
  },
}));
