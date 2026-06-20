import { ApiCoreBaseService } from './apiCoreBaseService.js';

export class ApiCoreServiceVirtualMenu extends ApiCoreBaseService {
  async getPublicMenu(slug: string) {
    const response = await this.client.get(`/virtual-menu/public/${encodeURIComponent(slug)}`, {
      headers: this.platformHeaders(),
    });
    return response.data;
  }

  async getMenuByBranch(branchId: string, token: string, internalKey: string) {
    const response = await this.client.get(`/virtual-menu/branch/${branchId}`, {
      headers: this.flexibleHeaders(token, internalKey),
    });
    return response.data;
  }

  async updateMenu(
    branchId: string,
    body: { title?: string; subtitle?: string | null; isEnabled?: boolean },
    token: string,
    internalKey: string
  ) {
    const response = await this.client.patch(`/virtual-menu/branch/${branchId}`, body, {
      headers: this.flexibleHeaders(token, internalKey),
    });
    return response.data;
  }

  async syncFromCatalog(branchId: string, token: string, internalKey: string) {
    const response = await this.client.post(
      `/virtual-menu/branch/${branchId}/sync-catalog`,
      {},
      { headers: this.flexibleHeaders(token, internalKey) }
    );
    return response.data;
  }

  async upsertCategory(
    branchId: string,
    body: Record<string, unknown>,
    token: string,
    internalKey: string
  ) {
    const response = await this.client.post(`/virtual-menu/branch/${branchId}/categories`, body, {
      headers: this.flexibleHeaders(token, internalKey),
    });
    return response.data;
  }

  async upsertProduct(
    branchId: string,
    body: Record<string, unknown>,
    token: string,
    internalKey: string
  ) {
    const response = await this.client.post(`/virtual-menu/branch/${branchId}/products`, body, {
      headers: this.flexibleHeaders(token, internalKey),
    });
    return response.data;
  }
}
