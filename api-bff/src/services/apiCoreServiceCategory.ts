import { ApiCoreBaseService } from './apiCoreBaseService.js';

export class ApiCoreServiceCategory extends ApiCoreBaseService {
  async listCatalogCategories(token: string, internalKey: string, branchId: string) {
    const response = await this.client.get('/catalog/categories', {
      headers: this.authHeaders(token, internalKey, branchId),
    });
    return response.data;
  }

  async createCatalogCategory(
    input: { name?: string; description?: string },
    token: string,
    internalKey: string,
    branchId: string
  ) {
    const response = await this.client.post('/catalog/categories', input, {
      headers: this.authHeaders(token, internalKey, branchId),
    });
    return response.data;
  }

  async updateCatalogCategory(
    categoryId: string,
    input: { name?: string; description?: string | null; isActive?: boolean },
    token: string,
    internalKey: string,
    branchId: string
  ) {
    const response = await this.client.patch(`/catalog/categories/${categoryId}`, input, {
      headers: this.authHeaders(token, internalKey, branchId),
    });
    return response.data;
  }

  async restoreCatalogCategory(
    categoryId: string,
    token: string,
    internalKey: string,
    branchId: string
  ) {
    const response = await this.client.post(
      `/catalog/categories/${categoryId}/restore`,
      {},
      { headers: this.authHeaders(token, internalKey, branchId) }
    );
    return response.data;
  }

  async deleteCatalogCategory(categoryId: string, token: string, internalKey: string, branchId: string) {
    const response = await this.client.delete(`/catalog/categories/${categoryId}`, {
      headers: this.authHeaders(token, internalKey, branchId),
    });
    return response.data;
  }
}
