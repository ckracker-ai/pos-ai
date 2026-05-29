import { ApiCoreBaseService } from './apiCoreBaseService.js';

export class ApiCoreServiceProduct extends ApiCoreBaseService {
  async getProduct(productId: string, token: string, internalKey?: string, branchId?: string) {
    const response = await this.client.get(`/products/${productId}`, {
      headers: this.flexibleHeaders(token, internalKey, branchId),
    });
    return response.data;
  }

  async listCatalogProducts(token: string, internalKey: string, branchId: string) {
    const response = await this.client.get('/catalog/products', {
      headers: this.authHeaders(token, internalKey, branchId),
    });
    return response.data;
  }

  async createCatalogProduct(
    input: {
      name: string;
      sku: string;
      categoryId: string;
      supplierId: string;
      price: number;
      description?: string;
      unit?: string;
      initialStock?: number;
      minStock?: number;
    },
    token: string,
    internalKey: string,
    branchId: string
  ) {
    const response = await this.client.post('/catalog/products', input, {
      headers: this.authHeaders(token, internalKey, branchId),
    });
    return response.data;
  }

  async listCatalogProductsByBranch(branchId: string, token: string, internalKey: string) {
    const response = await this.client.get(`/catalog/products/by-branch/${branchId}`, {
      headers: this.authHeaders(token, internalKey, branchId),
    });
    return response.data;
  }

  async updateCatalogProductName(
    productId: string,
    input: { name: string },
    token: string,
    internalKey: string,
    branchId: string
  ) {
    const response = await this.client.put(`/catalog/products/${productId}`, input, {
      headers: this.authHeaders(token, internalKey, branchId),
    });
    return response.data;
  }

  async deleteCatalogProduct(productId: string, token: string, internalKey: string, branchId: string) {
    // El core expone DELETE bajo /catalog/product/:id (singular).
    const response = await this.client.delete(`/catalog/product/${productId}`, {
      headers: this.authHeaders(token, internalKey, branchId),
    });
    return response.data;
  }
}
