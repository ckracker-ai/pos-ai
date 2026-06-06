import { ApiCoreBaseService } from './apiCoreBaseService.js';

export class ApiCoreServiceSales extends ApiCoreBaseService {
  async listSales(token: string, internalKey: string, branchId: string) {
    const response = await this.client.get('/sales/sales', {
      headers: this.authHeaders(token, internalKey, branchId),
    });
    return response.data;
  }

  async getSaleById(saleId: string, token: string, internalKey: string, branchId: string) {
    const response = await this.client.get(`/sales/sales/${saleId}`, {
      headers: this.authHeaders(token, internalKey, branchId),
    });
    return response.data;
  }

  async listSalesByUserAndBranch(userId: string, branchId: string, token: string, internalKey: string) {
    const response = await this.client.get(`/sales/sales/user/${userId}/branch/${branchId}`, {
      headers: this.authHeaders(token, internalKey, branchId),
    });
    return response.data;
  }

  async getSaleByIdUserBranch(
    saleId: string,
    userId: string,
    branchId: string,
    token: string,
    internalKey: string
  ) {
    const response = await this.client.get(
      `/sales/sales/${saleId}/user/${userId}/branch/${branchId}`,
      { headers: this.authHeaders(token, internalKey, branchId) }
    );
    return response.data;
  }

  async createSale(payload: Record<string, unknown>, token: string, internalKey: string, branchId: string) {
    const response = await this.client.post('/sales/sales', payload, {
      headers: this.authHeaders(token, internalKey, branchId),
    });
    return response.data;
  }

  async createSaleAction(payload: Record<string, unknown>, token: string, internalKey: string, branchId: string) {
    const response = await this.client.post('/sales/salesAction', payload, {
      headers: this.authHeaders(token, internalKey, branchId),
    });
    return response.data;
  }

  async patchSale(
    saleId: string,
    payload: Record<string, unknown>,
    token: string,
    internalKey: string,
    branchId: string
  ) {
    const response = await this.client.patch(`/sales/sales/${saleId}`, payload, {
      headers: this.authHeaders(token, internalKey, branchId),
    });
    return response.data;
  }

  async deleteSale(saleId: string, token: string, internalKey: string, branchId: string) {
    const response = await this.client.delete(`/sales/sales/${saleId}`, {
      headers: this.authHeaders(token, internalKey, branchId),
    });
    return response.data;
  }

  async listPendingDeliveries(token: string, internalKey: string, branchId: string) {
    const response = await this.client.get('/sales/deliveries/pending', {
      headers: this.authHeaders(token, internalKey, branchId),
    });
    return response.data;
  }

  async patchDeliveryStatus(
    saleId: string,
    payload: { status: string; note?: string | null },
    token: string,
    internalKey: string,
    branchId: string
  ) {
    const response = await this.client.patch(`/sales/sales/${saleId}/delivery-status`, payload, {
      headers: this.authHeaders(token, internalKey, branchId),
    });
    return response.data;
  }

  async getDeliveryTimeline(saleId: string, token: string, internalKey: string, branchId: string) {
    const response = await this.client.get(`/sales/sales/${saleId}/delivery-timeline`, {
      headers: this.authHeaders(token, internalKey, branchId),
    });
    return response.data;
  }

  async validateStock(
    branchId: string,
    productId: string,
    quantity: number,
    token: string,
    internalKey: string
  ) {
    const response = await this.client.post(
      '/inventory/validate',
      { branchId, productId, quantity },
      { headers: this.authHeaders(token, internalKey, branchId) }
    );
    return response.data;
  }
}
