import { create } from 'zustand';
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
  hydrate: () => Promise<void>;
}

const getBffBaseUrl = () => (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/$/, '');

const credentialsInit = (init: RequestInit = {}): RequestInit => ({
  ...init,
  credentials: 'include',
});

const clearLegacyPlatformStorage = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('pos-platform-auth');
};

const mapPlatformUser = (apiUser: Record<string, unknown>, fallbackEmail: string): PlatformUser => ({
  id: String(apiUser.id ?? 'platform'),
  email: String(apiUser.email ?? fallbackEmail),
  name: String(apiUser.fullName ?? apiUser.name ?? 'Platform Admin'),
  roleName: 'PLATFORM_ADMIN',
});

export const usePlatformAuthStore = create<PlatformAuthStore>()((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      const url = `${getBffBaseUrl()}${posProxyPath('platform/auth/login')}`;
      const response = await fetch(
        url,
        credentialsInit({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(credentials),
        })
      );
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? 'INVALID_CREDENTIALS');
      }
      const apiUser = payload.data?.user ?? {};
      clearLegacyPlatformStorage();
      set({
        token: null,
        isAuthenticated: true,
        user: mapPlatformUser(apiUser, credentials.email),
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
    void fetch(
      `${getBffBaseUrl()}${posProxyPath('platform/auth/logout')}`,
      credentialsInit({ method: 'POST' })
    );
    set({ user: null, token: null, isAuthenticated: false, error: null });
    clearLegacyPlatformStorage();
  },

  hydrate: async () => {
    clearLegacyPlatformStorage();
    try {
      const response = await fetch(
        `${getBffBaseUrl()}${posProxyPath('platform/auth/session')}`,
        credentialsInit({ method: 'GET' })
      );
      const payload = await response.json();
      if (!response.ok || !payload.success || !payload.data?.user) {
        set({ user: null, token: null, isAuthenticated: false });
        return;
      }
      set({
        token: null,
        isAuthenticated: true,
        user: mapPlatformUser(payload.data.user as Record<string, unknown>, ''),
      });
    } catch {
      set({ user: null, token: null, isAuthenticated: false });
    }
  },
}));

export async function platformFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${getBffBaseUrl()}${posProxyPath(path)}`;
  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
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
