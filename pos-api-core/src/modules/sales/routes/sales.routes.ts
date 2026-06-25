import { Router, Response } from 'express';
import { QueryTypes, Transaction } from 'sequelize';
import { sendOk, sendFail } from '../../../middleware/globalErrorHandler';
import {
  authenticateToken,
  requireSeller,
  requireDeliveryOps,
  requireComanda,
  AuthenticatedRequest,
} from '../../../middleware/auth.middleware';
import { v4 as uuidv4 } from 'uuid';
import sequelize from '../../../config/database';
import Sale from '../models/Sale.model';
import SaleDetail from '../models/SaleDetail.model';
import Product from '../../catalog/models/Product.model';
import { getEffectiveEmpresaId } from '../../../utils/tenantScope';
import deliveryTrackingDelegate from '../../delivery/delegates/DeliveryTrackingDelegate';
import { parseDeliveryStatus } from '../../delivery/deliveryTransitions';

const router = Router();

const saleDetailsInclude = [
  {
    model: SaleDetail,
    as: 'details',
    include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'sku'] }],
  },
];

function mapSaleCreationError(error: unknown): { message: string; status: number } {
  const err = error as {
    name?: string;
    message?: string;
    errors?: Array<{ message?: string }>;
    parent?: { sqlMessage?: string; message?: string };
  };
  const sqlMsg = String(err.parent?.sqlMessage ?? err.parent?.message ?? '');
  const msg = String(err.message ?? '');
  const validationDetail = Array.isArray(err.errors)
    ? err.errors.map((e) => e.message).filter(Boolean).join('; ')
    : '';
  const combined = `${sqlMsg} ${msg} ${validationDetail}`.toLowerCase();
  const fallbackDetail = (validationDetail || sqlMsg || msg).trim();

  if (msg.startsWith('INSUFFICIENT_STOCK')) {
    return {
      message:
        'Stock insuficiente para uno o más productos. Reduzca la cantidad o reponga inventario en la sucursal.',
      status: 409,
    };
  }
  if (msg.startsWith('STOCK_RECORD_NOT_FOUND')) {
    return {
      message:
        'Uno o más productos no tienen stock en esta sucursal. Registre inventario antes de vender.',
      status: 404,
    };
  }
  if (msg.startsWith('PRODUCT_NOT_FOUND')) {
    return {
      message: 'Uno o más productos del carrito no existen. Actualice la página e intente nuevamente.',
      status: 404,
    };
  }
  if (msg.startsWith('SALE_NOT_PERSISTED')) {
    return {
      message: 'No se pudo registrar la venta. Intente nuevamente o contacte al administrador.',
      status: 500,
    };
  }

  if (err.name === 'SequelizeForeignKeyConstraintError' || combined.includes('foreign key constraint')) {
    if (combined.includes('product_id')) {
      return {
        message: 'Uno o más productos no son válidos. Verifique el catálogo e intente nuevamente.',
        status: 400,
      };
    }
    if (combined.includes('branch_id')) {
      return {
        message: 'La sucursal activa no es válida. Seleccione otra sucursal e intente de nuevo.',
        status: 400,
      };
    }
    if (combined.includes('seller_id')) {
      return {
        message: 'Su usuario no está habilitado para registrar ventas. Contacte al administrador.',
        status: 403,
      };
    }
    return {
      message:
        'No se pudo completar la venta. Verifique que los productos existan y tengan stock en la sucursal activa.',
      status: 400,
    };
  }

  if (combined.includes('cannot be null') || err.name === 'SequelizeValidationError') {
    return {
      message: 'Faltan datos obligatorios para registrar la venta. Revise el carrito e intente nuevamente.',
      status: 422,
    };
  }

  return {
    message:
      fallbackDetail ||
      'No se pudo registrar la venta. Intente nuevamente o contacte al administrador.',
    status: 400,
  };
}

async function deductBranchStock(
  productId: string,
  branchId: string,
  quantity: number,
  transaction: Transaction
): Promise<void> {
  const rows = await sequelize.query<{ id: string; quantity: number }>(
    `SELECT id, quantity
     FROM inventory_stock
     WHERE product_id = :productId AND branch_id = :branchId
     FOR UPDATE`,
    {
      replacements: { productId, branchId },
      type: QueryTypes.SELECT,
      transaction,
    }
  );

  const row = rows[0];
  if (!row) {
    throw new Error(`STOCK_RECORD_NOT_FOUND:${productId}`);
  }

  const currentQty = Number(row.quantity ?? 0);
  const nextQty = currentQty - quantity;

  if (!Number.isFinite(nextQty) || nextQty < 0) {
    throw new Error(`INSUFFICIENT_STOCK: available ${currentQty}, requested ${quantity}`);
  }

  await sequelize.query(
    `UPDATE inventory_stock
     SET quantity = :nextQty, updated_at = NOW()
     WHERE id = :id`,
    {
      replacements: { nextQty, id: row.id },
      type: QueryTypes.UPDATE,
      transaction,
    }
  );
}

// All sales routes require authentication
router.use(authenticateToken);

// Sales - Vendedor can list/view for their branch
router.get('/sales', requireComanda, async (req: AuthenticatedRequest, res) => {
  try {
    const sales = await Sale.findAll({
      where: { empresaId: getEffectiveEmpresaId(req), branchId: req.user!.branchId },
      include: [
        {
          model: SaleDetail,
          as: 'details',
          include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'sku'] }],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    return sendOk(res, { sales });
  } catch {
    return sendFail(res, 'ERROR_FETCHING_SALES', 500);
  }
});

// GET /sales/:id  (scoped by branch)
router.get('/sales/:id', requireComanda, async (req: AuthenticatedRequest, res) => {
  try {
    const sale = await Sale.findOne({
      where: {
        id: req.params.id,
        empresaId: getEffectiveEmpresaId(req),
        branchId: req.user!.branchId,
      },
      include: [...saleDetailsInclude],
    });

    if (!sale) return sendFail(res, 'SALE_NOT_FOUND', 404);

    return sendOk(res, { sale });
  } catch {
    return sendFail(res, 'ERROR_FETCHING_SALE', 500);
  }
});

// GET /sales/:userId/:branchId (scoped by seller unless you explicitly allow cross-branch)
router.get('/sales/user/:userId/branch/:branchId', requireComanda, async (req: AuthenticatedRequest, res) => {
  try {
    const { userId } = req.params;
    const { branchId } = req.params;

    // enforce branch isolation for this API
    if (String(branchId) !== String(req.user!.branchId)) {
      return sendFail(res, 'SALE_NOT_FOUND', 404);
    }

    const sales = await Sale.findAll({
      where: { empresaId: getEffectiveEmpresaId(req), sellerId: userId, branchId },
      include: [...saleDetailsInclude],
      order: [['createdAt', 'DESC']],
    });

    return sendOk(res, { sales });
  } catch {
    return sendFail(res, 'ERROR_FETCHING_SALES', 500);
  }
});

// GET /sales/:id/user/:userId/branch/:branchId (scoped)
router.get('/sales/:id/user/:userId/branch/:branchId', requireComanda, async (req: AuthenticatedRequest, res) => {
  try {
    const { id, userId, branchId } = req.params;

    if (String(branchId) !== String(req.user!.branchId)) {
      return sendFail(res, 'SALE_NOT_FOUND', 404);
    }

    const sale = await Sale.findOne({
      where: { id, empresaId: getEffectiveEmpresaId(req), sellerId: userId, branchId },
      include: [...saleDetailsInclude],
    });

    if (!sale) return sendFail(res, 'SALE_NOT_FOUND', 404);

    return sendOk(res, { sale });
  } catch {
    return sendFail(res, 'ERROR_FETCHING_SALE', 500);
  }
});

const createSaleWithDetails = async (req: AuthenticatedRequest, res: Response) => {
  const transaction = await sequelize.transaction();
  try {
    const body = (req.body ?? {}) as {
      total?: number;
      discount?: number;
      status?: 'PENDING' | 'COMPLETED' | 'CANCELLED';
      requiresDelivery?: boolean;
      deliveryCustomerName?: string;
      deliveryPhone?: string;
      deliveryAddress?: string;
      deliveryAmount?: number;
      notes?: string;
      details?: Array<{
        productId: string;
        quantity: number;
        unitPrice?: number;
        subtotal?: number;
      }>;
    };

    const details = Array.isArray(body.details) ? body.details : [];
    const requiresDelivery = Boolean(body.requiresDelivery);
    const deliveryCustomerName = String(body.deliveryCustomerName ?? '').trim();
    const deliveryPhone = String(body.deliveryPhone ?? '').trim();
    const deliveryAddress = String(body.deliveryAddress ?? '').trim();
    const deliveryAmount = Number(body.deliveryAmount ?? 0);

    if (requiresDelivery) {
      if (!deliveryCustomerName || !deliveryPhone || !deliveryAddress) {
        return sendFail(
          res,
          'DELIVERY_REQUIRED_FIELDS: nombre cliente, teléfono y dirección son obligatorios.',
          422
        );
      }
      if (!Number.isFinite(deliveryAmount) || deliveryAmount < 0) {
        return sendFail(res, 'DELIVERY_AMOUNT_INVALID', 422);
      }
    }

    const saleId = uuidv4();
    const branchId = req.user!.branchId;
    const sellerId = req.user!.userId;
    const empresaId = getEffectiveEmpresaId(req);

    await Sale.create(
      {
        id: saleId,
        total: Number(body.total ?? 0),
        discount: Number(body.discount ?? 0),
        status: body.status ?? 'PENDING',
        requiresDelivery,
        deliveryCustomerName: requiresDelivery ? deliveryCustomerName : null,
        deliveryPhone: requiresDelivery ? deliveryPhone : null,
        deliveryAddress: requiresDelivery ? deliveryAddress : null,
        deliveryAmount: requiresDelivery ? deliveryAmount : 0,
        notes: body.notes ?? null,
        empresaId,
        branchId,
        sellerId,
      },
      { transaction }
    );

    const saleExists = await Sale.findByPk(saleId, { transaction });
    if (!saleExists) {
      throw new Error('SALE_NOT_PERSISTED');
    }

    for (const line of details) {
      const productId = String(line.productId ?? '').trim();
      if (!productId) {
        throw new Error('PRODUCT_NOT_FOUND:empty');
      }

      const product = await Product.findOne({
        where: { id: productId, empresaId },
        transaction,
      });
      if (!product) {
        throw new Error(`PRODUCT_NOT_FOUND:${productId}`);
      }

      const quantity = Number(line.quantity);
      const unitPrice = Number(line.unitPrice ?? 0);

      await SaleDetail.create(
        {
          id: uuidv4(),
          saleId,
          productId,
          quantity,
          unitPrice,
          subtotal: Number(line.subtotal ?? quantity * unitPrice),
        },
        { transaction }
      );

      await deductBranchStock(productId, branchId, quantity, transaction);
    }

    if (requiresDelivery) {
      const seeded = await deliveryTrackingDelegate.seedCreatedForSale(
        saleId,
        empresaId,
        branchId,
        sellerId,
        transaction
      );
      if (!seeded.success) throw new Error(seeded.error);
    }

    await transaction.commit();

    try {
      const fullSale = await Sale.findOne({
        where: { id: saleId, empresaId, branchId },
        include: [...saleDetailsInclude],
      });
      if (fullSale) {
        return sendOk(res, { sale: fullSale }, 201);
      }
    } catch (reloadError) {
      console.error('[Sales] sale created but reload failed', reloadError);
    }

    const sale = await Sale.findByPk(saleId);
    return sendOk(res, { sale }, 201);
  } catch (e: unknown) {
    await transaction.rollback();
    console.error('[Sales] createSaleWithDetails failed', e);
    const mapped = mapSaleCreationError(e);
    const message =
      mapped.message?.trim() ||
      'No se pudo registrar la venta. Intente nuevamente o contacte al administrador.';
    return sendFail(res, message, mapped.status);
  }
};

// POST /sales  (create sale)
router.post('/sales', requireSeller, createSaleWithDetails);

// POST /salesAction (alias required by spec)
router.post('/salesAction', requireSeller, createSaleWithDetails);

// PATCH /sales/:id (partial update, scoped) — cocina (COMANDA) marca entregado
router.patch('/sales/:id', requireComanda, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;

    const [updated] = await Sale.update(req.body, {
      where: { id, empresaId: getEffectiveEmpresaId(req), branchId: req.user!.branchId },
    });

    if (!updated) return sendFail(res, 'SALE_NOT_FOUND', 404);

    const sale = await Sale.findOne({
      where: { id, empresaId: getEffectiveEmpresaId(req), branchId: req.user!.branchId },
      include: [...saleDetailsInclude],
    });

    if (!sale) return sendFail(res, 'SALE_NOT_FOUND', 404);

    return sendOk(res, { sale });
  } catch (err) {
    console.error('[Sales] ERROR_UPDATING_SALE', err);
    return sendFail(res, 'ERROR_UPDATING_SALE', 400);
  }
});

// DELETE /sales/:id (scoped)
router.delete('/sales/:id', requireSeller, async (req: AuthenticatedRequest, res) => {
  try {
    const deleted = await Sale.destroy({
      where: {
        id: req.params.id,
        empresaId: getEffectiveEmpresaId(req),
        branchId: req.user!.branchId,
      },
    });

    if (!deleted) return sendFail(res, 'SALE_NOT_FOUND', 404);

    return sendOk(res, { deleted: true });
  } catch {
    return sendFail(res, 'ERROR_DELETING_SALE', 400);
  }
});

router.get('/deliveries/drivers', requireDeliveryOps, async (req: AuthenticatedRequest, res) => {
  const roleName = String(req.user!.roleName ?? '').toUpperCase();
  if (roleName === 'DELIVERY') {
    return sendFail(res, 'FORBIDDEN', 403);
  }
  const result = await deliveryTrackingDelegate.listDrivers(
    getEffectiveEmpresaId(req),
    req.user!.branchId
  );
  if (!result.success) return sendFail(res, result.error, 400);
  return sendOk(res, { drivers: result.value });
});

router.get('/deliveries/pending', requireDeliveryOps, async (req: AuthenticatedRequest, res) => {
  const roleName = String(req.user!.roleName ?? '').toUpperCase();
  const driverUserId = roleName === 'DELIVERY' ? req.user!.userId : null;
  const result = await deliveryTrackingDelegate.listPending(
    getEffectiveEmpresaId(req),
    req.user!.branchId,
    { driverUserId }
  );
  if (!result.success) return sendFail(res, result.error, 400);
  return sendOk(res, { deliveries: result.value });
});

router.patch('/sales/:id/delivery-status', requireDeliveryOps, async (req: AuthenticatedRequest, res) => {
  const body = (req.body ?? {}) as { status?: string; note?: string; assignedDriverId?: string | null };
  const status = parseDeliveryStatus(body.status);
  if (!status) return sendFail(res, 'VALIDATION_ERROR: status required', 422);

  const roleName = String(req.user!.roleName ?? '').toUpperCase();
  const result = await deliveryTrackingDelegate.advanceStatus({
    saleId: req.params.id,
    empresaId: getEffectiveEmpresaId(req),
    branchId: req.user!.branchId,
    status,
    note: body.note ?? null,
    userId: req.user!.userId,
    assignedDriverId:
      roleName === 'DELIVERY' ? undefined : (body.assignedDriverId ?? null),
  });
  if (!result.success) {
    const code = result.error.startsWith('SALE_NOT_FOUND')
      ? 404
      : result.error.startsWith('VALIDATION_ERROR') || result.error.startsWith('DRIVER_NOT_FOUND')
        ? 422
        : 400;
    return sendFail(res, result.error, code);
  }
  return sendOk(res, {
    deliveryStatus: result.value.deliveryStatus,
    event: result.value.event,
  });
});

router.get('/sales/:id/delivery-timeline', requireDeliveryOps, async (req: AuthenticatedRequest, res) => {
  const result = await deliveryTrackingDelegate.getTimeline(
    req.params.id,
    getEffectiveEmpresaId(req),
    req.user!.branchId
  );
  if (!result.success) return sendFail(res, result.error, 404);
  return sendOk(res, result.value);
});

export default router;


