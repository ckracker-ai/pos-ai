import { ApiCoreBaseService } from './apiCoreBaseService.js';

export class ApiCoreServiceReports extends ApiCoreBaseService {
  async getDashboard(
    token: string,
    internalKey: string,
    branchId: string,
    options?: { global?: boolean; days?: number }
  ) {
    const response = await this.client.get('/reports/dashboard', {
      headers: this.authHeaders(token, internalKey, branchId),
      params: {
        global: options?.global ? 'true' : undefined,
        days: options?.days ?? 30,
      },
    });
    return response.data;
  }

  async getSalesReport(
    token: string,
    internalKey: string,
    branchId: string,
    options?: { global?: boolean; limit?: number }
  ) {
    const response = await this.client.get('/reports/sales', {
      headers: this.authHeaders(token, internalKey, branchId),
      params: {
        global: options?.global ? 'true' : undefined,
        limit: options?.limit ?? 200,
      },
    });
    return response.data;
  }

  async getInventoryReport(
    token: string,
    internalKey: string,
    branchId: string,
    options?: { global?: boolean }
  ) {
    const response = await this.client.get('/reports/inventory', {
      headers: this.authHeaders(token, internalKey, branchId),
      params: { global: options?.global ? 'true' : undefined },
    });
    return response.data;
  }
}
