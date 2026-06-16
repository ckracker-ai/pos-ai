import { create } from 'zustand';
import { persist } from 'zustand/middleware';
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

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (credentials: LoginRequest) => Promise<void>;
  register: (payload: RegisterRequest) => Promise<void>;
  logout: () => void;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  clearError: () => void;
  hydrate: () => void;
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

type AuthTokenPayload = {
  branchId?: string;
  email?: string;
  supportSession?: boolean;
  exp?: number;
};

const readTokenPayload = (token: string): AuthTokenPayload | null => {
  try {
    const segment = token.split('.')[1];
    if (!segment) return null;
    return JSON.parse(atob(segment)) as AuthTokenPayload;
  } catch {
    return null;
  }
};

const readBranchIdFromToken = (token: string): string | undefined => {
  const payload = readTokenPayload(token);
  return payload?.branchId?.trim() || undefined;
};

export type SupportSessionInfo = {
  active: boolean;
  email?: string;
  expiresAt?: Date;
};

export const readSupportSessionFromToken = (token: string | null): SupportSessionInfo => {
  if (!token) return { active: false };
  const payload = readTokenPayload(token);
  if (!payload?.supportSession) return { active: false };
  return {
    active: true,
    email: payload.email?.trim() || undefined,
    expiresAt: payload.exp ? new Date(payload.exp * 1000) : undefined,
  };
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (credentials: LoginRequest) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`${getBffBaseUrl()}${posProxyPath('auth/login')}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(credentials),
          });

          const payload = await parseJsonResponse(response);
          console.info('Login response:', payload);

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

          const authData = payload.data;
          if (!authData.user || !authData.token) {
            throw new Error('La respuesta de autenticacion no incluyo usuario o token.');
          }

          const tokenBranchId = readBranchIdFromToken(String(authData.token ?? ''));
          const normalizedUser = normalizeAuthUser(authData.user, credentials.email);
          if (!normalizedUser.branchId && tokenBranchId) {
            normalizedUser.branchId = tokenBranchId;
          }
          set({
            user: normalizedUser,
            token: authData.token,
            isAuthenticated: true,
            isLoading: false,
          });
          const canSwitchBranch = getRoleProfile(normalizedUser.role).canSwitchBranch;
          const effectiveBranchId = normalizedUser.branchId ?? tokenBranchId;
          if (effectiveBranchId && !canSwitchBranch) {
            useBranchStore.getState().setSelectedBranchId(effectiveBranchId);
          }
        } catch (error) {
          if (
            error instanceof Error &&
            (error as Error & { code?: string }).code === 'LEGAL_REAUTH_REQUIRED'
          ) {
            set({ isLoading: false, isAuthenticated: false });
            throw error;
          }
          console.error('Login error:', error);
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
          const response = await fetch(`${getBffBaseUrl()}${posProxyPath('auth/register')}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Branch-ID': branchId,
            },
            body: JSON.stringify(payload),
          });

          const data = await parseJsonResponse(response);
          console.info('Register response:', data);

          if (!response.ok || data.success === false) {
            throw new Error(data.message || data.error || 'No se pudo registrar el usuario.');
          }

          set({ isLoading: false });
        } catch (error) {
          console.error('Register error:', error);
          const errorMessage =
            (error instanceof Error && error.message) ||
            'Error al registrar usuario.';
          set({ error: errorMessage, isLoading: false });
          throw new Error(errorMessage);
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
        });
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth-store');
        }
      },

      setUser: (user: User | null) => {
        set({ user, isAuthenticated: user !== null });
      },

      setToken: (token: string | null) => {
        set({ token });
      },

      clearError: () => {
        set({ error: null });
      },

      hydrate: () => {
        const { token, user } = get();

        // Si no hay token o no hay usuario, no estamos autenticados.
        if (!token || !user) {
          set({ token: token ?? null, user: user ?? null, isAuthenticated: false });
          return;
        }

        // Si existe token pero el usuario no cuadra (inconsistencia típica al expirar), limpiamos.
        // Nota: aquí no validamos firma/exp por simplicidad; el backend validará en requests.
        // Lo importante es evitar quedarnos en isAuthenticated=true con state incompleto.
        const tokenBranchId = readBranchIdFromToken(token);
        const branchId = user.branchId ?? tokenBranchId;
        const userWithBranch =
          branchId && !user.branchId ? { ...user, branchId } : user;

        const canSwitchBranch = getRoleProfile(userWithBranch.role).canSwitchBranch;
        if (branchId && !canSwitchBranch) {
          useBranchStore.getState().setSelectedBranchId(branchId);
        }
        set({
          user: userWithBranch,
          isAuthenticated: true,
        });
      },
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
