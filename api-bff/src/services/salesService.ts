import { ApiCoreServiceProduct } from './apiCoreServiceProduct.js';
import { ApiCoreServiceSales } from './apiCoreServiceSales.js';
import { ok, err } from '../utils/result.js';

const ACCESS_CONTROL_ROLE = 'auditor';

export class SalesService {
  private salesCore = new ApiCoreServiceSales();
  private productCore = new ApiCoreServiceProduct();

  async validateStock(
    branchId: string,
    productId: string,
    quantity: number,
    token: string,
    internalKey: string
  ) {
    try {
      const response = await this.salesCore.validateStock(
        branchId,
        productId,
        quantity,
        token,
        internalKey
      );
      return ok({ data: response.available });
    } catch {
      return err('Stock validation failed', 502);
    }
  }

  async createSale(
    branchId: string,
    user: { id: string; roles: string[] },
    input: { productId: string; quantity: number; customerId: string; paymentMethod: string },
    token: string,
    internalKey: string
  ) {
    if (!user.roles.includes(ACCESS_CONTROL_ROLE)) {
      return err('User does not have permission to create sales', 403);
    }

    try {
      const stockValidation = await this.salesCore.validateStock(
        branchId,
        input.productId,
        input.quantity,
        token,
        internalKey
      );
      if (!stockValidation.available) {
        return err('Insufficient stock for requested branch', 400);
      }

      const product = await this.productCore.getProduct(input.productId, token, internalKey, branchId);
      const salePayload = {
        branchId,
        productId: input.productId,
        quantity: input.quantity,
        customerId: input.customerId,
        paymentMethod: input.paymentMethod,
        unitPrice: product.price,
        productName: product.name,
        createdBy: user.id,
      };

      const sale = await this.salesCore.createSale(salePayload, token, internalKey, branchId);

      return ok({ data: sale });
    } catch {
      return err('Sale creation failed', 502);
    }
  }
}
