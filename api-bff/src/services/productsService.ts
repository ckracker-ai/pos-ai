import { ApiCoreServiceInventory } from './apiCoreServiceInventory.js';
import { ApiCoreServiceProduct } from './apiCoreServiceProduct.js';
import { ApiCoreServiceShrinkage } from './apiCoreServiceShrinkage.js';
import { ok, err } from '../utils/result.js';

export class ProductsService {
  private inventoryCore = new ApiCoreServiceInventory();
  private productCore = new ApiCoreServiceProduct();
  private shrinkageCore = new ApiCoreServiceShrinkage();

  async getInventoryByBranch(branchId: string, token: string, internalKey: string) {
    try {
      const data = await this.inventoryCore.getInventoryByBranch(branchId, token, internalKey);
      return ok({ data });
    } catch (error: any) {
      const statusCode = error?.response?.status ?? 502;
      const message = error?.response?.data?.error ?? 'Failed to fetch inventory';
      return err(message, statusCode);
    }
  }

  async listCatalogProducts(token: string, internalKey: string, branchId: string) {
    try {
      const data = await this.productCore.listCatalogProducts(token, internalKey, branchId);
      return ok({ data });
    } catch (error: any) {
      const statusCode = error?.response?.status ?? 502;
      const message = error?.response?.data?.error ?? 'Failed to fetch catalog products';
      return err(message, statusCode);
    }
  }

  async createCatalogProduct(
    input: { name: string; sku: string; categoryId: string; supplierId: string; price: number },
    token: string,
    internalKey: string,
    branchId: string
  ) {
    try {
      const data = await this.productCore.createCatalogProduct(input, token, internalKey, branchId);
      return ok({ data });
    } catch (error: any) {
      const statusCode = error?.response?.status ?? 502;
      const message = error?.response?.data?.error ?? 'Failed to create catalog product';
      return err(message, statusCode);
    }
  }

  async updateCatalogProductName(
    productId: string,
    name: string,
    token: string,
    internalKey: string,
    branchId: string
  ) {
    try {
      const data = await this.productCore.updateCatalogProductName(
        productId,
        { name },
        token,
        internalKey,
        branchId
      );
      return ok({ data });
    } catch (error: any) {
      const statusCode = error?.response?.status ?? 502;
      const message = error?.response?.data?.error ?? 'Failed to update catalog product';
      return err(message, statusCode);
    }
  }

  async listShrinkage(token: string, internalKey: string, branchId: string) {
    try {
      const data = await this.shrinkageCore.listShrinkage(token, internalKey, branchId);
      return ok({ data });
    } catch (error: any) {
      const statusCode = error?.response?.status ?? 502;
      const message = error?.response?.data?.error ?? 'Failed to fetch shrinkages';
      return err(message, statusCode);
    }
  }

  async getShrinkageById(shrinkageId: string, token: string, internalKey: string, branchId: string) {
    try {
      const data = await this.shrinkageCore.getShrinkageById(shrinkageId, token, internalKey, branchId);
      return ok({ data });
    } catch (error: any) {
      const statusCode = error?.response?.status ?? 502;
      const message = error?.response?.data?.error ?? 'Failed to fetch shrinkage';
      return err(message, statusCode);
    }
  }

  async registerShrinkage(
    branchId: string,
    reason: string,
    details: Array<{ productId: string; quantity: number }>,
    token: string,
    internalKey: string
  ) {
    try {
      const data = await this.shrinkageCore.registerShrinkage({ branchId, reason, details }, token, internalKey);
      return ok({ data });
    } catch (error: any) {
      const statusCode = error?.response?.status ?? 502;
      const message = error?.response?.data?.error ?? 'Failed to register shrinkage';
      return err(message, statusCode);
    }
  }
}
