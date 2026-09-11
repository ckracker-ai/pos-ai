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

  async getShrinkageReport(
    token: string,
    internalKey: string,
    branchId: string,
    options?: { global?: boolean; status?: string; limit?: number }
  ) {
    const response = await this.client.get('/reports/shrinkage', {
      headers: this.authHeaders(token, internalKey, branchId),
      params: {
        global: options?.global ? 'true' : undefined,
        status: options?.status ?? 'ALL',
        limit: options?.limit ?? 300,
      },
    });
    return response.data;
  }

  async getHotSkus(
    token: string,
    internalKey: string,
    branchId: string,
    options?: { hour?: number }
  ) {
    const response = await this.client.get('/reports/hot-skus', {
      headers: this.authHeaders(token, internalKey, branchId),
      params: options?.hour != null ? { hour: options.hour } : undefined,
    });
    return response.data;
  }

  async getReorderDraft(
    token: string,
    internalKey: string,
    branchId: string,
    options?: { global?: boolean; limit?: number }
  ) {
    const response = await this.client.get('/reports/reorder-draft', {
      headers: this.authHeaders(token, internalKey, branchId),
      params: {
        global: options?.global ? 'true' : undefined,
        limit: options?.limit ?? 20,
      },
    });
    return response.data;
  }
}
