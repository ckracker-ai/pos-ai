import config from '../config/index.js';
import { ApiCoreBaseService } from './apiCoreBaseService.js';

export type PlatformLoginUser = {
  id: string;
  email: string;
  fullName: string;
  roleName: string;
};

export class ApiCoreServicePlatformAuth extends ApiCoreBaseService {
  async login(email: string, password: string): Promise<PlatformLoginUser> {
    const response = await this.client.post(
      '/platform/auth/login',
      { email, password },
      {
        headers: { 'Content-Type': 'application/json' },
        validateStatus: () => true,
      }
    );

    const body = response.data as {
      success?: boolean;
      data?: { user?: PlatformLoginUser };
      error?: string;
    };

    if (response.status !== 200 || !body.success || !body.data?.user) {
      throw new Error(body.error ?? 'INVALID_CREDENTIALS');
    }

    return body.data.user;
  }

  /** Fallback dev cuando aún no hay fila en platform_users (migración pendiente). */
  loginWithEnvFallback(email: string, password: string): PlatformLoginUser | null {
    if (
      email.trim().toLowerCase() === config.platformAdminEmail.trim().toLowerCase() &&
      password === config.platformAdminPassword
    ) {
      return {
        id: 'platform-env',
        email: config.platformAdminEmail,
        fullName: 'Platform Admin',
        roleName: 'PLATFORM_ADMIN',
      };
    }
    return null;
  }
}
