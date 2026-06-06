import { ApiCoreBaseService } from './apiCoreBaseService.js';
import {
  categoryTreeCacheKey,
  getCategoryTreeCached,
  invalidateCategoryTreeCache,
  setCategoryTreeCached,
} from '../cache/categoryTreeCache.js';

export class ApiCoreServiceCategory extends ApiCoreBaseService {
  async listCatalogCategories(token: string, internalKey: string, branchId: string) {
    const response = await this.client.get('/catalog/categories', {
      headers: this.authHeaders(token, internalKey, branchId),
    });
    return response.data;
  }

  async getCatalogCategoryTree(
    token: string,
    internalKey: string,
    branchId: string,
    activeOnly = false
  ) {
    const key = categoryTreeCacheKey(token, branchId, activeOnly);
    const cached = getCategoryTreeCached(key);
    if (cached != null) return cached;

    const response = await this.client.get('/catalog/categories/tree', {
      headers: this.authHeaders(token, internalKey, branchId),
      params: activeOnly ? { activeOnly: 'true' } : undefined,
    });
    setCategoryTreeCached(key, response.data);
    return response.data;
  }

  static invalidateTreeCache(): void {
    invalidateCategoryTreeCache();
  }

  async getCatalogCategoryLeaves(token: string, internalKey: string, branchId: string) {
    const response = await this.client.get('/catalog/categories/leaves', {
      headers: this.authHeaders(token, internalKey, branchId),
    });
    return response.data;
  }

  async createCatalogCategory(
    input: {
      name?: string;
      description?: string | null;
      parentId?: string | null;
      slug?: string | null;
    },
    token: string,
    internalKey: string,
    branchId: string
  ) {
    const response = await this.client.post('/catalog/categories', input, {
      headers: this.authHeaders(token, internalKey, branchId),
    });
    invalidateCategoryTreeCache();
    return response.data;
  }

  async updateCatalogCategory(
    categoryId: string,
    input: {
      name?: string;
      description?: string | null;
      parentId?: string | null;
      slug?: string | null;
      isActive?: boolean;
    },
    token: string,
    internalKey: string,
    branchId: string
  ) {
    const response = await this.client.patch(`/catalog/categories/${categoryId}`, input, {
      headers: this.authHeaders(token, internalKey, branchId),
    });
    invalidateCategoryTreeCache();
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
    invalidateCategoryTreeCache();
    return response.data;
  }

  async deleteCatalogCategory(categoryId: string, token: string, internalKey: string, branchId: string) {
    const response = await this.client.delete(`/catalog/categories/${categoryId}`, {
      headers: this.authHeaders(token, internalKey, branchId),
    });
    invalidateCategoryTreeCache();
    return response.data;
  }
}
