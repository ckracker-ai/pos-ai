import { ApiCoreBaseService } from './apiCoreBaseService.js';

export class ApiCoreServiceSupplier extends ApiCoreBaseService {
  async listSuppliers(token: string, internalKey: string, branchId: string) {
    const response = await this.client.get('/catalog/suppliers', {
      headers: this.authHeaders(token, internalKey, branchId),
    });
    return response.data;
  }

  async createSupplier(
    input: { name: string; contactEmail?: string | null; contactPhone?: string | null; address?: string | null },
    token: string,
    internalKey: string,
    branchId: string
  ) {
    const response = await this.client.post('/catalog/suppliers', input, {
      headers: this.authHeaders(token, internalKey, branchId),
    });
    return response.data;
  }

  async updateSupplier(
    supplierId: string,
    input: {
      name?: string;
      contactEmail?: string | null;
      contactPhone?: string | null;
      address?: string | null;
      isActive?: boolean;
    },
    token: string,
    internalKey: string,
    branchId: string
  ) {
    const response = await this.client.patch(`/catalog/suppliers/${supplierId}`, input, {
      headers: this.authHeaders(token, internalKey, branchId),
    });
    return response.data;
  }

  async restoreSupplier(supplierId: string, token: string, internalKey: string, branchId: string) {
    const response = await this.client.post(
      `/catalog/suppliers/${supplierId}/restore`,
      {},
      { headers: this.authHeaders(token, internalKey, branchId) }
    );
    return response.data;
  }

  async deleteSupplier(supplierId: string, token: string, internalKey: string, branchId: string) {
    const response = await this.client.delete(`/catalog/suppliers/${supplierId}`, {
      headers: this.authHeaders(token, internalKey, branchId),
    });
    return response.data;
  }
}
