import { v4 as uuidv4 } from 'uuid';
import User from '../../auth/models/User.model';
import Role from '../../auth/models/Role.model';
import Branch from '../../branch/models/Branch.model';
import Category from '../../catalog/models/Category.model';
import Product from '../../catalog/models/Product.model';
import Sale from '../../sales/models/Sale.model';
import LegalAcceptance from '../models/LegalAcceptance.model';
import DataSubjectRequest, {
  type DataSubjectRequestType,
} from '../models/DataSubjectRequest.model';
import empresaDelegate from '../../tenant/delegates/EmpresaDelegate';
import { Result, ok, fail } from '../../../types/result';

export type TenantDataExport = {
  exportedAt: string;
  format: 'json';
  empresa: Record<string, unknown>;
  branches: Array<Record<string, unknown>>;
  users: Array<Record<string, unknown>>;
  categories: Array<Record<string, unknown>>;
  products: Array<Record<string, unknown>>;
  salesSummary: { total: number; recent: Array<Record<string, unknown>> };
  legalAcceptances: Array<Record<string, unknown>>;
};

class DataSubjectDelegate {
  private assertTenantScope(empresaId: string, tenantEmpresaId: string): Result<true> {
    if (empresaId !== tenantEmpresaId) return fail('EMPRESA_ACCESS_DENIED');
    return ok(true);
  }

  async exportTenantData(
    empresaId: string,
    tenantEmpresaId: string
  ): Promise<Result<TenantDataExport>> {
    const scope = this.assertTenantScope(empresaId, tenantEmpresaId);
    if (!scope.success) return scope;

    const empresaResult = await empresaDelegate.findById(empresaId, tenantEmpresaId);
    if (!empresaResult.success) return empresaResult;

    const branches = await Branch.findAll({
      where: { empresaId },
      attributes: ['id', 'name', 'address', 'comunaId', 'postalCode', 'isActive', 'createdAt'],
    });

    const users = await User.findAll({
      where: { empresaId },
      attributes: ['id', 'fullName', 'email', 'roleId', 'branchId', 'isActive', 'whatsappPhone', 'createdAt'],
      include: [{ model: Role, as: 'role', attributes: ['name'] }],
    });

    const categories = await Category.findAll({
      where: { empresaId },
      attributes: ['id', 'name', 'slug', 'parentId', 'isActive', 'createdAt'],
      limit: 500,
    });

    const products = await Product.findAll({
      where: { empresaId },
      attributes: ['id', 'name', 'sku', 'price', 'categoryId', 'isActive', 'createdAt'],
      limit: 2000,
    });

    const salesTotal = await Sale.count({ where: { empresaId } });
    const recentSales = await Sale.findAll({
      where: { empresaId },
      attributes: [
        'id',
        'branchId',
        'sellerId',
        'total',
        'discount',
        'status',
        'requiresDelivery',
        'deliveryStatus',
        'createdAt',
      ],
      order: [['createdAt', 'DESC']],
      limit: 100,
    });

    const acceptances = await LegalAcceptance.findAll({
      where: { empresaId },
      attributes: [
        'id',
        'userId',
        'documentVersion',
        'acceptanceChannel',
        'acceptedAt',
      ],
      order: [['acceptedAt', 'DESC']],
      limit: 50,
    });

    const empresa = { ...(empresaResult.value as unknown as Record<string, unknown>) };
    delete empresa.transferAccount;
    delete empresa.transferRut;
    delete empresa.transferHolderName;
    delete empresa.transferBankName;

    return ok({
      exportedAt: new Date().toISOString(),
      format: 'json',
      empresa,
      branches: branches.map((b) => b.toJSON()),
      users: users.map((u) => {
        const row = u.toJSON() as Record<string, unknown>;
        delete row.password;
        return row;
      }),
      categories: categories.map((c) => c.toJSON()),
      products: products.map((p) => p.toJSON()),
      salesSummary: {
        total: salesTotal,
        recent: recentSales.map((s) => s.toJSON()),
      },
      legalAcceptances: acceptances.map((a) => a.toJSON()),
    });
  }

  async createDeletionRequest(input: {
    empresaId: string;
    tenantEmpresaId: string;
    requestedBy: string;
    notes?: string | null;
  }): Promise<Result<{ requestId: string; status: string }>> {
    const scope = this.assertTenantScope(input.empresaId, input.tenantEmpresaId);
    if (!scope.success) return scope;

    const pending = await DataSubjectRequest.findOne({
      where: {
        empresaId: input.empresaId,
        requestType: 'DELETE',
        status: ['PENDING', 'IN_PROGRESS'],
      },
    });
    if (pending) return fail('DATA_DELETION_REQUEST_ALREADY_OPEN');

    const id = uuidv4();
    await DataSubjectRequest.create({
      id,
      empresaId: input.empresaId,
      requestType: 'DELETE' as DataSubjectRequestType,
      status: 'PENDING',
      requestedBy: input.requestedBy,
      notes: input.notes?.slice(0, 2000) ?? null,
      completedAt: null,
    });

    return ok({ requestId: id, status: 'PENDING' });
  }
}

const dataSubjectDelegate = new DataSubjectDelegate();
export default dataSubjectDelegate;
