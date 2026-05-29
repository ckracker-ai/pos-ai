import { ApiCoreServiceAuth } from './apiCoreServiceAuth.js';
import { ok, err } from '../utils/result.js';

export class AuthService {
  private coreApi = new ApiCoreServiceAuth();

  async register(fullName: string, email: string, password: string, roleId: string, branchId: string) {
    try {
      const response = await this.coreApi.register(fullName, email, password, roleId, branchId);
      return ok({ data: response });
    } catch (error: any) {
      const statusCode = error.response?.status || 502;
      const message = error.response?.data?.error || 'Registration failed';
      return err(message, statusCode);
    }
  }

  async login(email: string, password: string) {
    try {
      const response = await this.coreApi.login(email, password);
      return ok({ data: response });
    } catch (error: any) {
      const statusCode = error.response?.status || 502;
      const message = error.response?.data?.error || 'Login failed';
      return err(message, statusCode);
    }
  }

  async getUser(userId: string, token: string, internalKey: string, branchId: string) {
    try {
      const response = await this.coreApi.getUser(userId, token, internalKey, branchId);
      return ok({ data: response });
    } catch (error: any) {
      const statusCode = error.response?.status || 502;
      const message = error.response?.data?.error || 'Failed to fetch user';
      return err(message, statusCode);
    }
  }
}
