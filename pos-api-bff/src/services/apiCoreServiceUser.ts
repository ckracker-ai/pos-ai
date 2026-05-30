import { ApiCoreBaseService } from './apiCoreBaseService.js';

export class ApiCoreServiceUser extends ApiCoreBaseService {
  async listUsers(token: string, internalKey: string, branchId: string) {
    const response = await this.client.get('/auth/users', {
      headers: this.authHeaders(token, internalKey, branchId),
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
    input: { fullName: string; email: string; roleId: string },
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
}
