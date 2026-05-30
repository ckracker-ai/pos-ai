import { ApiCoreBaseService } from './apiCoreBaseService.js';

export class ApiCoreServiceBranch extends ApiCoreBaseService {
  async listBranches(token: string, internalKey?: string, branchId?: string) {
    const response = await this.client.get('/branch', {
      headers: this.flexibleHeaders(token, internalKey, branchId),
    });
    return response.data;
  }

  async getBranchById(branchId: string, token: string, internalKey?: string, requestBranchId?: string) {
    const response = await this.client.get(`/branch/${branchId}`, {
      headers: this.flexibleHeaders(token, internalKey, requestBranchId),
    });
    return response.data;
  }

  async createBranch(
    input: { name: string; address?: string },
    token: string,
    internalKey?: string,
    branchId?: string
  ) {
    const response = await this.client.post('/branch', input, {
      headers: this.flexibleHeaders(token, internalKey, branchId),
    });
    return response.data;
  }

  async updateBranch(
    targetBranchId: string,
    input: {
      name?: string;
      address?: string;
      phone?: string;
      isActive?: boolean;
    },
    token: string,
    internalKey?: string,
    branchId?: string
  ) {
    const response = await this.client.patch(`/branch/${targetBranchId}`, input, {
      headers: this.flexibleHeaders(token, internalKey, branchId),
    });
    return response.data;
  }

  async deleteBranch(targetBranchId: string, token: string, internalKey?: string, branchId?: string) {
    const response = await this.client.delete(`/branch/${targetBranchId}`, {
      headers: this.flexibleHeaders(token, internalKey, branchId),
    });
    return response.data;
  }

  async restoreBranch(targetBranchId: string, token: string, internalKey?: string, branchId?: string) {
    const response = await this.client.post(
      `/branch/${targetBranchId}/restore`,
      {},
      {
        headers: this.flexibleHeaders(token, internalKey, branchId),
      }
    );
    return response.data;
  }
}
