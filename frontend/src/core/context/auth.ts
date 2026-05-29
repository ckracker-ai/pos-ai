import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { LoginRequest, User, UserRole } from '@/core/interfaces';
import { getFriendlyApiError } from '@/core/api/api-error-messages';
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
  (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000').replace(/\/$/, '');

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

const readBranchIdFromToken = (token: string): string | undefined => {
  try {
    const segment = token.split('.')[1];
    if (!segment) return undefined;
    const payload = JSON.parse(atob(segment)) as { branchId?: string };
    return payload.branchId?.trim() || undefined;
  } catch {
    return undefined;
  }
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
          const response = await fetch(`${getBffBaseUrl()}/api/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(credentials),
          });

          const payload = await parseJsonResponse(response);
          console.info('Login response:', payload);

          if (!response.ok || payload.success === false) {
            const apiErr = payload.error || payload.message || 'INVALID_CREDENTIALS';
            throw new Error(String(apiErr));
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
          const canSwitchBranch = ['admin', 'auditor'].includes(normalizedUser.role);
          const effectiveBranchId = normalizedUser.branchId ?? tokenBranchId;
          if (effectiveBranchId && !canSwitchBranch) {
            useBranchStore.getState().setSelectedBranchId(effectiveBranchId);
          }
        } catch (error) {
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
          const response = await fetch(`${getBffBaseUrl()}/api/auth/register`, {
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

        const canSwitchBranch = ['admin', 'auditor'].includes(userWithBranch.role);
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
