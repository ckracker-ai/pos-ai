import { ApiCoreBaseService } from './apiCoreBaseService.js';

export class ApiCoreServiceInventory extends ApiCoreBaseService {
  async getInventoryByBranch(branchId: string, token: string, internalKey: string) {
    const response = await this.client.get(`/inventory/branch/${branchId}`, {
      headers: this.authHeaders(token, internalKey, branchId),
    });
    return response.data;
  }

  async getInventoryByBranchProduct(
    branchId: string,
    productId: string,
    token: string,
    internalKey: string
  ) {
    const response = await this.client.get(`/inventory/branch/${branchId}/product/${productId}`, {
      headers: this.authHeaders(token, internalKey, branchId),
    });
    return response.data;
  }

  async upsertStock(
    input: { productId: string; quantity: number; minStock?: number },
    token: string,
    internalKey: string,
    branchId: string
  ) {
    const response = await this.client.patch(
      '/inventory/stock',
      {
        productId: input.productId,
        quantity: input.quantity,
        minStock: input.minStock ?? 0,
      },
      {
        headers: this.authHeaders(token, internalKey, branchId),
      }
    );
    return response.data;
  }

  async addProductToBranch(
    branchId: string,
    input: { productId: string; quantity: number; minStock?: number },
    token: string,
    internalKey: string
  ) {
    const response = await this.client.post(
      `/inventory/branch/${branchId}/stock`,
      {
        productId: input.productId,
        quantity: input.quantity,
        minStock: input.minStock ?? 0,
      },
      {
        headers: this.authHeaders(token, internalKey, branchId),
      }
    );
    return response.data;
  }

  async adjustStock(
    input: { productId: string; delta: number },
    token: string,
    internalKey: string,
    branchId: string
  ) {
    const response = await this.client.patch(
      '/inventory/stock/adjust',
      { productId: input.productId, delta: input.delta },
      {
        headers: this.authHeaders(token, internalKey, branchId),
      }
    );
    return response.data;
  }

  async getLowStock(branchId: string, token: string, internalKey?: string) {
    const response = await this.client.get(`/inventory/branch/${branchId}/low-stock`, {
      headers: this.flexibleHeaders(token, internalKey),
    });
    return response.data;
  }
}
