import { Op, Sequelize } from 'sequelize';
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
import Empresa from '../../tenant/models/Empresa.model';
import suscripcionDelegate from '../../saas/delegates/SuscripcionDelegate';
import tenantPurgeDelegate from '../../tenant/delegates/TenantPurgeDelegate';
import {
  isDeletionConfirmationPhraseValid,
  TENANT_DELETION_ROLLBACK_HOURS,
} from '../constants/dataSubject';
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

export type DeletionRequestSummary = {
  requestId: string;
  status: string;
  scheduledPurgeAt: string;
  rollbackHours: number;
  canCancel: boolean;
  initiatedByPlatform: boolean;
};

function addHours(base: Date, hours: number): Date {
  const d = new Date(base);
  d.setHours(d.getHours() + hours);
  return d;
}

function toIso(d: Date | null | undefined): string | null {
  if (!d) return null;
  return d instanceof Date ? d.toISOString() : String(d);
}

class DataSubjectDelegate {
  private assertTenantScope(empresaId: string, tenantEmpresaId: string): Result<true> {
    if (empresaId !== tenantEmpresaId) return fail('EMPRESA_ACCESS_DENIED');
    return ok(true);
  }

  private toDeletionSummary(row: DataSubjectRequest): DeletionRequestSummary {
    const scheduled = row.getDataValue('scheduledPurgeAt') as Date | null;
    const rawStatus = String(row.getDataValue('status') ?? '');
    const cancelled = row.getDataValue('cancelledAt') as Date | null;
    const status =
      rawStatus === 'PENDING' && scheduled && !cancelled ? 'SCHEDULED' : rawStatus;
    const canCancel =
      (rawStatus === 'SCHEDULED' || rawStatus === 'PENDING') &&
      !cancelled &&
      Boolean(scheduled && new Date() < scheduled);

    return {
      requestId: String(row.getDataValue('id') ?? row.id),
      status,
      scheduledPurgeAt: toIso(scheduled) ?? '',
      rollbackHours: TENANT_DELETION_ROLLBACK_HOURS,
      canCancel,
      initiatedByPlatform: Boolean(row.getDataValue('initiatedByPlatform')),
    };
  }

  /** Tickets DELETE antiguos (PENDING sin fecha) → SCHEDULED con rollback desde created_at. */
  private async reconcileLegacyDeletionRequests(): Promise<number> {
    const [affected] = await DataSubjectRequest.update(
      {
        status: 'SCHEDULED',
        scheduledPurgeAt: Sequelize.literal(
          `DATE_ADD(created_at, INTERVAL ${TENANT_DELETION_ROLLBACK_HOURS} HOUR)`
        ),
      },
      {
        where: {
          requestType: 'DELETE',
          status: 'PENDING',
          scheduledPurgeAt: null,
          cancelledAt: null,
        },
      }
    );
    return affected;
  }

  private async findOpenDeletion(empresaId: string): Promise<DataSubjectRequest | null> {
    return DataSubjectRequest.findOne({
      where: {
        empresaId,
        requestType: 'DELETE',
        status: { [Op.in]: ['PENDING', 'SCHEDULED', 'IN_PROGRESS'] },
      },
      order: [['createdAt', 'DESC']],
    });
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
      attributes: ['id', 'userId', 'documentVersion', 'acceptanceChannel', 'acceptedAt'],
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

  async getDeletionStatus(
    empresaId: string,
    tenantEmpresaId?: string
  ): Promise<Result<{ deletion: DeletionRequestSummary | null }>> {
    if (tenantEmpresaId) {
      const scope = this.assertTenantScope(empresaId, tenantEmpresaId);
      if (!scope.success) return scope;
    }

    const open = await this.findOpenDeletion(empresaId);
    if (!open) return ok({ deletion: null });
    return ok({ deletion: this.toDeletionSummary(open) });
  }

  async createDeletionRequest(input: {
    empresaId: string;
    tenantEmpresaId?: string;
    requestedBy?: string | null;
    confirmationPhrase: string;
    notes?: string | null;
    initiatedByPlatform?: boolean;
  }): Promise<Result<DeletionRequestSummary>> {
    if (input.tenantEmpresaId) {
      const scope = this.assertTenantScope(input.empresaId, input.tenantEmpresaId);
      if (!scope.success) return scope;
    }

    if (!isDeletionConfirmationPhraseValid(input.confirmationPhrase)) {
      return fail('DELETION_CONFIRMATION_MISMATCH');
    }

    const empresa = await Empresa.findByPk(input.empresaId, { attributes: ['id'] });
    if (!empresa) return fail('EMPRESA_NOT_FOUND');

    const pending = await this.findOpenDeletion(input.empresaId);
    if (pending) return fail('DATA_DELETION_REQUEST_ALREADY_OPEN');

    const now = new Date();
    const scheduledPurgeAt = addHours(now, TENANT_DELETION_ROLLBACK_HOURS);
    const id = uuidv4();

    const row = await DataSubjectRequest.create({
      id,
      empresaId: input.empresaId,
      requestType: 'DELETE' as DataSubjectRequestType,
      status: 'SCHEDULED',
      requestedBy: input.requestedBy ?? null,
      notes: input.notes?.slice(0, 2000) ?? null,
      scheduledPurgeAt,
      cancelledAt: null,
      initiatedByPlatform: Boolean(input.initiatedByPlatform),
      completedAt: null,
    });

    return ok(this.toDeletionSummary(row));
  }

  async cancelDeletionRequest(input: {
    empresaId: string;
    tenantEmpresaId?: string;
    requestId?: string;
  }): Promise<Result<DeletionRequestSummary>> {
    if (input.tenantEmpresaId) {
      const scope = this.assertTenantScope(input.empresaId, input.tenantEmpresaId);
      if (!scope.success) return scope;
    }

    const row = input.requestId
      ? await DataSubjectRequest.findOne({
          where: { id: input.requestId, empresaId: input.empresaId, requestType: 'DELETE' },
        })
      : await this.findOpenDeletion(input.empresaId);

    if (!row) return fail('DATA_DELETION_REQUEST_NOT_FOUND');
    const rowStatus = String(row.getDataValue('status'));
    if (rowStatus !== 'SCHEDULED' && rowStatus !== 'PENDING') {
      return fail('DATA_DELETION_REQUEST_NOT_CANCELLABLE');
    }

    const scheduled = row.getDataValue('scheduledPurgeAt') as Date | null;
    if (!scheduled || new Date() >= scheduled) {
      return fail('DATA_DELETION_ROLLBACK_EXPIRED');
    }

    await row.update({
      status: 'CANCELLED',
      cancelledAt: new Date(),
    });

    return ok(this.toDeletionSummary(row));
  }

  private async executeScheduledDeletion(row: DataSubjectRequest): Promise<void> {
    const empresaId = String(row.getDataValue('empresaId') ?? '');
    await row.update({ status: 'IN_PROGRESS' });

    const suspended = await empresaDelegate.suspendPlatform(empresaId);
    if (!suspended.success) {
      throw new Error(suspended.error);
    }

    const cancelled = await suscripcionDelegate.cancel(
      empresaId,
      'Eliminación programada de datos del tenant'
    );
    const subNote =
      cancelled.success || cancelled.error === 'SUBSCRIPTION_NOT_FOUND'
        ? cancelled.success
          ? 'suscripción cancelada'
          : 'sin suscripción activa'
        : null;
    if (!subNote) {
      throw new Error(cancelled.error);
    }

    const purged = await tenantPurgeDelegate.purgeEmpresa(empresaId);
    if (!purged.success) {
      throw new Error(purged.error);
    }

    await row.update({
      status: 'COMPLETED',
      completedAt: new Date(),
      notes: [
        String(row.getDataValue('notes') ?? '').trim(),
        `[${new Date().toISOString()}] Tenant suspendido; ${subNote}. Purge físico ejecutado (empresa y datos relacionados eliminados).`,
      ]
        .filter(Boolean)
        .join('\n'),
    });
  }

  async processScheduledDeletions(): Promise<
    Result<{ reconciled: number; scanned: number; executed: number; skipped: number }>
  > {
    const reconciled = await this.reconcileLegacyDeletionRequests();
    const now = new Date();
    const due = await DataSubjectRequest.findAll({
      where: {
        requestType: 'DELETE',
        status: { [Op.in]: ['SCHEDULED', 'PENDING'] },
        scheduledPurgeAt: { [Op.lte]: now },
        cancelledAt: null,
      },
      limit: 50,
    });

    let executed = 0;
    let skipped = 0;

    for (const row of due) {
      try {
        await this.executeScheduledDeletion(row);
        executed += 1;
      } catch (err) {
        skipped += 1;
        const empresaId = String(row.getDataValue('empresaId') ?? '');
        console.warn(
          `[DATA_SUBJECT] executeScheduledDeletion error empresa=${empresaId} request=${row.id}:`,
          err
        );
        try {
          await row.update({
            status: 'SCHEDULED',
            notes: [
              String(row.getDataValue('notes') ?? '').trim(),
              `[${new Date().toISOString()}] Error al ejecutar: ${err instanceof Error ? err.message : String(err)}`,
            ]
              .filter(Boolean)
              .join('\n'),
          });
        } catch (revertErr) {
          console.warn('[DATA_SUBJECT] could not revert IN_PROGRESS row:', revertErr);
        }
      }
    }

    if (reconciled > 0 || due.length > 0) {
      console.info(
        `[DATA_SUBJECT] processScheduledDeletions reconciled=${reconciled} scanned=${due.length} executed=${executed} skipped=${skipped}`
      );
    }

    return ok({ reconciled, scanned: due.length, executed, skipped });
  }
}

const dataSubjectDelegate = new DataSubjectDelegate();
export default dataSubjectDelegate;
