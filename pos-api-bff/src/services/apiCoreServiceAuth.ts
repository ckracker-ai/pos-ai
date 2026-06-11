import { ApiCoreBaseService } from './apiCoreBaseService.js';

export class ApiCoreServiceAuth extends ApiCoreBaseService {
  async login(input: {
    email: string;
    password: string;
    legalAcceptance?: {
      termsVersion: string;
      privacyVersion: string;
      accepted: true;
    };
  }) {
    const response = await this.client.post('/auth/login', input, {
      headers: this.publicHeaders(),
    });
    return response.data;
  }

  async register(input: {
    fullName: string;
    email: string;
    password: string;
    roleId: string;
    branchId: string;
    whatsappPhone?: string | null;
  }) {
    const response = await this.client.post('/auth/register', input, {
      headers: this.publicHeaders(),
    });
    return response.data;
  }

  async getUser(userId: string, token: string, internalKey: string, branchId: string) {
    const response = await this.client.get(`/auth/users/${userId}`, {
      headers: this.authHeaders(token, internalKey, branchId),
    });
    return response.data;
  }

  async updateUser(
    userId: string,
    input: { fullName: string; email: string; roleId: string; whatsappPhone?: string | null },
    token: string,
    internalKey: string,
    branchId: string
  ) {
    const response = await this.client.put(`/auth/users/${userId}`, input, {
      headers: this.authHeaders(token, internalKey, branchId),
    });
    return response.data;
  }

  async deleteUser(userId: string, token: string, internalKey: string, branchId: string) {
    const response = await this.client.delete(`/auth/users/${userId}`, {
      headers: this.authHeaders(token, internalKey, branchId),
    });
    return response.data;
  }

  async restoreUser(userId: string, token: string, internalKey: string, branchId: string) {
    const response = await this.client.patch(
      `/auth/users/${userId}/restore`,
      {},
      { headers: this.authHeaders(token, internalKey, branchId) }
    );
    return response.data;
  }

  async resetUserPassword(
    userId: string,
    password: string,
    token: string,
    internalKey: string,
    branchId: string
  ) {
    const response = await this.client.patch(
      `/auth/users/${userId}/password`,
      { password },
      { headers: this.authHeaders(token, internalKey, branchId) }
    );
    return response.data;
  }

  async listUsers(token: string, internalKey: string, branchId: string) {
    const response = await this.client.get('/auth/users', {
      headers: this.authHeaders(token, internalKey, branchId),
    });
    return response.data;
  }

  async listRoles(token: string, internalKey: string, branchId: string) {
    const response = await this.client.get('/auth/roles', {
      headers: this.authHeaders(token, internalKey, branchId),
    });
    return response.data;
  }
}
