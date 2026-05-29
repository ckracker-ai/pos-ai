import { ApiCoreBaseService } from './apiCoreBaseService.js';

export class ApiCoreServiceShrinkage extends ApiCoreBaseService {
  async listShrinkage(token: string, internalKey: string, branchId: string) {
    const response = await this.client.get('/shrinkage/shrinkage', {
      headers: this.authHeaders(token, internalKey, branchId),
    });
    return response.data;
  }

  async listShrinkageByStatus(status: string, token: string, internalKey: string, branchId: string) {
    const response = await this.client.get(`/shrinkage/shrinkage/${status}`, {
      headers: this.authHeaders(token, internalKey, branchId),
    });
    return response.data;
  }

  async registerShrinkage(
    payload: {
      branchId: string;
      reason: string;
      details: Array<{ productId: string; quantity: number }>;
    },
    token: string,
    internalKey: string
  ) {
    const response = await this.client.post('/shrinkage/shrinkage', payload, {
      headers: this.authHeaders(token, internalKey, payload.branchId),
    });
    return response.data;
  }

  async registerShrinkageAction(
    payload: {
      branchId: string;
      reason: string;
      details: Array<{ productId: string; quantity: number }>;
    },
    token: string,
    internalKey: string
  ) {
    const response = await this.client.post('/shrinkage/shrinkageAction', payload, {
      headers: this.authHeaders(token, internalKey, payload.branchId),
    });
    return response.data;
  }

  async getShrinkageById(shrinkageId: string, token: string, internalKey: string, branchId: string) {
    const response = await this.client.get(`/shrinkage/shrinkage/${shrinkageId}`, {
      headers: this.authHeaders(token, internalKey, branchId),
    });
    return response.data;
  }

  async patchShrinkage(
    shrinkageId: string,
    payload: Record<string, unknown>,
    token: string,
    internalKey: string,
    branchId: string
  ) {
    const response = await this.client.patch(`/shrinkage/shrinkage/${shrinkageId}`, payload, {
      headers: this.authHeaders(token, internalKey, branchId),
    });
    return response.data;
  }

  async deleteShrinkage(shrinkageId: string, token: string, internalKey: string, branchId: string) {
    const response = await this.client.delete(`/shrinkage/shrinkage/${shrinkageId}`, {
      headers: this.authHeaders(token, internalKey, branchId),
    });
    return response.data;
  }

  async approveShrinkage(shrinkageId: string, token: string, internalKey: string, branchId: string) {
    const response = await this.client.post(
      `/shrinkage/shrinkage/${shrinkageId}/approve`,
      {},
      { headers: this.authHeaders(token, internalKey, branchId) }
    );
    return response.data;
  }

  async rejectShrinkage(
    shrinkageId: string,
    rejectionNote: string | undefined,
    token: string,
    internalKey: string,
    branchId: string
  ) {
    const response = await this.client.post(
      `/shrinkage/shrinkage/${shrinkageId}/reject`,
      { rejectionNote },
      { headers: this.authHeaders(token, internalKey, branchId) }
    );
    return response.data;
  }
}
