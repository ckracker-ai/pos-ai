import { ApiCoreBaseService } from './apiCoreBaseService.js';

export class ApiCoreServiceWholesale extends ApiCoreBaseService {
  async listCustomers(token: string, internalKey: string, branchId: string) {
    const response = await this.client.get('/wholesale/customers', {
      headers: this.authHeaders(token, internalKey, branchId),
    });
    return response.data;
  }

  async createCustomer(input: Record<string, unknown>, token: string, internalKey: string, branchId: string) {
    const response = await this.client.post('/wholesale/customers', input, {
      headers: this.authHeaders(token, internalKey, branchId),
    });
    return response.data;
  }

  async updateCustomer(
    id: string,
    input: Record<string, unknown>,
    token: string,
    internalKey: string,
    branchId: string
  ) {
    const response = await this.client.put(`/wholesale/customers/${id}`, input, {
      headers: this.authHeaders(token, internalKey, branchId),
    });
    return response.data;
  }
}
