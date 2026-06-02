import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getFriendlyApiError } from '@/core/api/api-error-messages';
import { posProxyPath } from '@/core/constants/api-path';

interface PlatformLoginRequest {
  email: string;
  password: string;
}

interface PlatformUser {
  id: string;
  email: string;
  name: string;
  roleName: string;
}

interface PlatformAuthStore {
  user: PlatformUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: PlatformLoginRequest) => Promise<void>;
  logout: () => void;
  hydrate: () => void;
}

const getBffBaseUrl = () => (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/$/, '');

export const usePlatformAuthStore = create<PlatformAuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (credentials) => {
        set({ isLoading: true, error: null });
        try {
          const url = `${getBffBaseUrl()}${posProxyPath('platform/auth/login')}`;
          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials),
          });
          const payload = await response.json();
          if (!response.ok || !payload.success) {
            throw new Error(payload.error ?? 'INVALID_CREDENTIALS');
          }
          const token = String(payload.data?.token ?? '');
          const apiUser = payload.data?.user ?? {};
          set({
            token,
            isAuthenticated: true,
            user: {
              id: String(apiUser.id ?? 'platform'),
              email: String(apiUser.email ?? credentials.email),
              name: String(apiUser.fullName ?? 'Platform Admin'),
              roleName: 'PLATFORM_ADMIN',
            },
            isLoading: false,
            error: null,
          });
        } catch (e) {
          const message = getFriendlyApiError(e, 'auth.login').message;
          set({
            isLoading: false,
            error: message,
            isAuthenticated: false,
            token: null,
            user: null,
          });
          throw new Error(message);
        }
      },

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false, error: null });
      },

      hydrate: () => {
        const state = usePlatformAuthStore.getState();
        set({ isAuthenticated: Boolean(state.token) });
      },
    }),
    { name: 'pos-platform-auth' }
  )
);

export async function platformFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = usePlatformAuthStore.getState().token;
  if (!token) throw new Error('PLATFORM_SESSION_REQUIRED');

  const url = `${getBffBaseUrl()}${posProxyPath(path)}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  });

  const payload = (await response.json()) as {
    success?: boolean;
    error?: string | null;
    message?: string;
    code?: number;
  };
  if (!response.ok || payload.success === false) {
    const detail =
      (typeof payload.error === 'string' && payload.error.trim()) ||
      (typeof payload.message === 'string' && payload.message.trim()) ||
      `HTTP ${response.status}`;
    if (response.status === 404 && /not found/i.test(detail)) {
      throw new Error(
        'Ruta no encontrada en el BFF (404). Reconstruye servicios: docker compose build pos-api-bff pos-api-core pos-api-assistant && docker compose up -d'
      );
    }
    throw new Error(detail);
  }
  return payload as T;
}
