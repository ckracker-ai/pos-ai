import { QueryTypes, Transaction, Op } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import sequelize from '../../../config/database';
import AssistantChannelBinding from '../models/AssistantChannelBinding.model';
import Empresa from '../../tenant/models/Empresa.model';
import SaasPlan from '../../saas/models/SaasPlan.model';
import Branch from '../../branch/models/Branch.model';
import Product from '../../catalog/models/Product.model';
import Category from '../../catalog/models/Category.model';
import categoryDelegate from '../../catalog/delegates/CategoryDelegate';
import {
  matchCategoryIdsByQuery,
  normalizeCatalogQuery,
  formatCompactCategoryCatalog,
} from '../../catalog/utils/categorySearch';
import User from '../../auth/models/User.model';
import Role from '../../auth/models/Role.model';
import Sale from '../../sales/models/Sale.model';
import SaleDetail from '../../sales/models/SaleDetail.model';
import AssistantPaymentProof from '../models/AssistantPaymentProof.model';
import inventoryDelegate from '../../inventory/delegates/InventoryDelegate';
import { Result, ok, fail } from '../../../types/result';
import type { SaasPlanFeatures } from '../../saas/constants/planCodes';
import {
  buildTransferProfileFromEmpresa,
  formatTransferPaymentMessage,
  isTransferProfileComplete,
  type TransferProfile,
} from '../../tenant/utils/transferProfile';

function parsePlanFeatures(raw: unknown): SaasPlanFeatures {
  const base: SaasPlanFeatures = {
    modulosCore: true,
    assistantWhatsapp: false,
    assistantVoz: false,
    pagosOnline: false,
  };
  if (!raw || typeof raw !== 'object') return base;
  const o = raw as Record<string, unknown>;
  const truthy = (v: unknown) => v === true || v === 1 || v === 'true' || v === '1';
  return {
    modulosCore: o.modulosCore !== false,
    assistantWhatsapp: truthy(o.assistantWhatsapp) || truthy(o.assistant_whatsapp),
    assistantVoz: truthy(o.assistantVoz) || truthy(o.assistant_voz),
    pagosOnline: truthy(o.pagosOnline) || truthy(o.pagos_online),
  };
}

export function normalizePhoneE164(raw: string): string {
  return raw.replace(/\D/g, '').replace(/^0+/, '');
}

export type { TransferProfile };

export type AssistantContext = {
  bindingId: string;
  empresaId: string;
  empresaNombre: string;
  channel: string;
  phone: string;
  sessionBranchId: string | null;
  defaultBranchId: string | null;
  features: SaasPlanFeatures;
  planCodigo: string;
  transferProfile: TransferProfile | null;
};

class AssistantDelegate {
  async resolveByPhone(phone: string, channel: 'WHATSAPP' | 'VOZ' = 'WHATSAPP'): Promise<Result<AssistantContext>> {
    const externalId = normalizePhoneE164(phone);
    if (!externalId) return fail('VALIDATION_ERROR: invalid phone');

    const binding = await AssistantChannelBinding.findOne({
      where: { externalId, channel, isActive: true },
    });
    if (!binding) return fail('ASSISTANT_BINDING_NOT_FOUND');

    const empresa = await Empresa.findByPk(String(binding.getDataValue('empresaId') ?? binding.empresaId));
    if (!empresa) return fail('EMPRESA_NOT_FOUND');

    const estadoTributario = String(empresa.getDataValue('estadoTributario') ?? 'FORMAL');
    if (estadoTributario !== 'FORMAL' && channel === 'WHATSAPP') {
      return fail('TRIBUTARIO_FORMAL_REQUIRED: formaliza tu negocio antes de WhatsApp IA');
    }

    const plan = await SaasPlan.findByPk(String(empresa.getDataValue('planId') ?? empresa.planId));
    if (!plan) return fail('PLAN_NOT_FOUND');
    const features = parsePlanFeatures(plan.getDataValue('features'));
    const codigo = String(plan.getDataValue('codigo') ?? '').toUpperCase();
    const whatsappOk =
      features.assistantWhatsapp || codigo === 'ESTANDAR' || codigo === 'FULL';
    if (!whatsappOk && channel === 'WHATSAPP') {
      return fail('ASSISTANT_PLAN_REQUIRED');
    }

    const voiceOk = features.assistantVoz || codigo === 'FULL';
    if (!voiceOk && channel === 'VOZ') {
      return fail('ASSISTANT_VOICE_PLAN_REQUIRED');
    }

    return ok({
      bindingId: String(binding.getDataValue('id') ?? ''),
      empresaId: String(binding.getDataValue('empresaId') ?? ''),
      empresaNombre: String(
        empresa.getDataValue('nombreFantasia') ?? empresa.getDataValue('razonSocial') ?? ''
      ),
      channel,
      phone: externalId,
      sessionBranchId: binding.getDataValue('sessionBranchId') ?? null,
      defaultBranchId: binding.getDataValue('defaultBranchId') ?? null,
      features,
      planCodigo: String(plan.getDataValue('codigo') ?? ''),
      transferProfile: buildTransferProfileFromEmpresa(empresa),
    });
  }

  async setSessionBranch(bindingId: string, branchId: string | null): Promise<Result<void>> {
    const binding = await AssistantChannelBinding.findByPk(bindingId);
    if (!binding) return fail('ASSISTANT_BINDING_NOT_FOUND');
    await binding.update({ sessionBranchId: branchId });
    return ok(undefined);
  }

  async listBranches(empresaId: string): Promise<Result<Record<string, unknown>[]>> {
    const rows = await Branch.findAll({
      where: { empresaId, isActive: true },
      order: [['name', 'ASC']],
    });
    return ok(
      rows.map((b) => ({
        id: String(b.getDataValue('id') ?? ''),
        name: String(b.getDataValue('name') ?? ''),
        address: b.getDataValue('address') ?? null,
        phone: b.getDataValue('phone') ?? null,
      }))
    );
  }

  async getStock(
    empresaId: string,
    productId: string,
    branchId: string
  ): Promise<Result<Record<string, unknown>>> {
    const result = await inventoryDelegate.getOne(empresaId, productId, branchId);
    if (!result.success) return result;
    const s = result.value;
    return ok({
      producto_id: s.productId,
      sucursal_id: s.branchId,
      cantidad: s.quantity,
      precio: s.product?.price ?? 0,
      producto_nombre: s.product?.name ?? '',
      sku: s.product?.sku ?? '',
    });
  }

  async stockInOtherBranches(
    empresaId: string,
    productId: string,
    excludeBranchId?: string
  ): Promise<Result<Record<string, unknown>[]>> {
    const rows = await sequelize.query<Record<string, unknown>>(
      `SELECT s.branch_id, s.quantity, b.name AS branch_name, p.price AS product_price
       FROM inventory_stock s
       INNER JOIN branches b ON b.id = s.branch_id AND b.empresa_id = :empresaId
       INNER JOIN products p ON p.id = s.product_id AND p.empresa_id = :empresaId
       WHERE s.empresa_id = :empresaId
         AND s.product_id = :productId
         AND s.quantity > 0
         ${excludeBranchId ? 'AND s.branch_id <> :excludeBranchId' : ''}
       ORDER BY s.quantity DESC`,
      {
        replacements: { empresaId, productId, excludeBranchId },
        type: QueryTypes.SELECT,
      }
    );
    return ok(
      rows.map((r) => ({
        sucursal_id: String(r.branch_id),
        sucursal_nombre: String(r.branch_name ?? ''),
        cantidad: Number(r.quantity ?? 0),
        precio: Number(r.product_price ?? 0),
      }))
    );
  }

  async getCategoryCatalogSummary(empresaId: string): Promise<Result<{ resumen: string; familias: string[] }>> {
    const treeResult = await categoryDelegate.getTree(empresaId, true);
    if (!treeResult.success) return treeResult;
    const resumen = formatCompactCategoryCatalog(treeResult.value);
    const familias = treeResult.value.filter((n) => n.isActive).map((n) => n.slug);
    return ok({ resumen, familias });
  }

  async searchProducts(
    empresaId: string,
    query: string,
    branchId?: string
  ): Promise<Result<Record<string, unknown>[]>> {
    const q = query.trim();
    const needle = normalizeCatalogQuery(q);

    const flatResult = await categoryDelegate.listFlat(empresaId);
    if (!flatResult.success) return flatResult;
    const categoryIds = needle ? matchCategoryIdsByQuery(flatResult.value, q) : new Set<string>();

    if (needle.length < 2 && categoryIds.size === 0) {
      return fail('VALIDATION_ERROR: query too short');
    }

    const byId = new Map(flatResult.value.map((c) => [c.id, c]));

    const products = await Product.findAll({
      where: { empresaId, isActive: true },
      include: [{ model: Category, as: 'category', attributes: ['id', 'name', 'slug', 'parentId'] }],
      order: [['name', 'ASC']],
      limit: 80,
    });

    const filtered = products.filter((p) => {
      const name = normalizeCatalogQuery(String(p.getDataValue('name') ?? ''));
      const sku = normalizeCatalogQuery(String(p.getDataValue('sku') ?? ''));
      const categoryId = String(p.getDataValue('categoryId') ?? '');
      const nameMatch = needle.length >= 2 && (name.includes(needle) || sku.includes(needle));
      const categoryMatch = categoryIds.size > 0 && categoryIds.has(categoryId);
      return nameMatch || categoryMatch;
    });

    const out: Record<string, unknown>[] = [];
    for (const p of filtered.slice(0, 8)) {
      const productId = String(p.getDataValue('id') ?? '');
      const plain = p.get({ plain: true }) as {
        category?: { id?: string; name?: string; slug?: string; parentId?: string | null };
      };
      const catId = plain.category?.id ? String(plain.category.id) : '';
      const leaf = catId ? byId.get(catId) : undefined;
      const parent = leaf?.parentId ? byId.get(leaf.parentId) : undefined;
      const categoriaLabel = parent ? `${parent.name} › ${leaf?.name ?? ''}` : leaf?.name ?? '';

      let cantidad = 0;
      let precio = Number(p.getDataValue('price') ?? 0);
      if (branchId) {
        const stock = await inventoryDelegate.getOne(empresaId, productId, branchId);
        if (stock.success) {
          cantidad = stock.value.quantity;
          precio = stock.value.product?.price ?? precio;
        }
      }
      out.push({
        producto_id: productId,
        nombre: p.getDataValue('name'),
        sku: p.getDataValue('sku'),
        precio,
        cantidad_en_sucursal: branchId ? cantidad : null,
        categoria: categoriaLabel || undefined,
        categoria_slug: leaf?.slug ?? undefined,
      });
    }
    return ok(out);
  }

  private async resolveSellerId(empresaId: string): Promise<string | null> {
    const adminRole = await Role.findOne({ where: { name: 'ADMIN' } });
    if (!adminRole) return null;
    const user = await User.findOne({
      where: { empresaId, roleId: adminRole.getDataValue('id'), isActive: true },
      order: [['createdAt', 'ASC']],
    });
    return user ? String(user.getDataValue('id') ?? '') : null;
  }

  async createOrder(input: {
    empresaId: string;
    branchId: string;
    clienteTelefono: string;
    items: Array<{ productId: string; quantity: number }>;
    metodoPago: string;
  }): Promise<Result<{ pedido_id: string; total: number; status: string }>> {
    const branch = await Branch.findOne({ where: { id: input.branchId, empresaId: input.empresaId } });
    if (!branch) return fail('BRANCH_NOT_FOUND');

    const openCart = await this.findPendingOrderByPhone(input.empresaId, input.clienteTelefono);
    if (openCart.success && openCart.value.awaiting_customer_confirm) {
      return fail('PENDING_ORDER_EXISTS_USE_APPEND');
    }

    const sellerId = await this.resolveSellerId(input.empresaId);
    if (!sellerId) return fail('ASSISTANT_SELLER_NOT_FOUND');

    const transaction = await sequelize.transaction();
    try {
      let total = 0;
      const saleId = uuidv4();
      const details: Array<{
        id: string;
        saleId: string;
        productId: string;
        quantity: number;
        unitPrice: number;
        subtotal: number;
      }> = [];

      for (const item of input.items) {
        const qty = Number(item.quantity);
        if (!Number.isFinite(qty) || qty <= 0) {
          await transaction.rollback();
          return fail('VALIDATION_ERROR: invalid quantity');
        }

        const stockResult = await inventoryDelegate.getOne(
          input.empresaId,
          item.productId,
          input.branchId
        );
        if (!stockResult.success) {
          await transaction.rollback();
          return stockResult;
        }
        if (stockResult.value.quantity < qty) {
          await transaction.rollback();
          return fail('INSUFFICIENT_STOCK');
        }

        const unitPrice = Number(stockResult.value.product?.price ?? 0);
        const subtotal = unitPrice * qty;
        total += subtotal;
        details.push({
          id: uuidv4(),
          saleId,
          productId: item.productId,
          quantity: qty,
          unitPrice,
          subtotal,
        });

        await this.deductStock(item.productId, input.branchId, input.empresaId, qty, transaction);
      }

      await Sale.create(
        {
          id: saleId,
          empresaId: input.empresaId,
          branchId: input.branchId,
          sellerId,
          total,
          discount: 0,
          status: 'PENDING',
          notes: `Pedido asistente WSP · ${input.clienteTelefono} · pago: ${input.metodoPago} · espera_confirmacion`,
        },
        { transaction }
      );

      for (const d of details) {
        await SaleDetail.create(d, { transaction });
      }

      await transaction.commit();
      return ok({ pedido_id: saleId, total, status: 'PENDING' });
    } catch (e) {
      await transaction.rollback();
      if (e instanceof Error && e.message === 'INSUFFICIENT_STOCK') {
        return fail('INSUFFICIENT_STOCK');
      }
      throw e;
    }
  }

  /** Suma ítems al pedido WSP abierto (antes de *confirmar* del cliente). */
  async appendItemsToPendingOrder(input: {
    empresaId: string;
    branchId: string;
    clienteTelefono: string;
    items: Array<{ productId: string; quantity: number }>;
  }): Promise<
    Result<{
      pedido_id: string;
      total: number;
      added: Array<{ nombre: string; quantity: number; subtotal: number }>;
    }>
  > {
    const pending = await this.findPendingOrderByPhone(input.empresaId, input.clienteTelefono);
    if (!pending.success) return pending;
    if (!pending.value.awaiting_customer_confirm) {
      return fail('CART_LOCKED_FOR_PAYMENT');
    }
    if (pending.value.branch_id !== input.branchId) {
      return fail('CART_BRANCH_MISMATCH');
    }

    const saleId = pending.value.pedido_id;
    const transaction = await sequelize.transaction();
    const added: Array<{ nombre: string; quantity: number; subtotal: number }> = [];

    try {
      for (const item of input.items) {
        const qty = Number(item.quantity);
        if (!Number.isFinite(qty) || qty <= 0) {
          await transaction.rollback();
          return fail('VALIDATION_ERROR: invalid quantity');
        }

        const stockResult = await inventoryDelegate.getOne(
          input.empresaId,
          item.productId,
          input.branchId
        );
        if (!stockResult.success) {
          await transaction.rollback();
          return stockResult;
        }
        if (stockResult.value.quantity < qty) {
          await transaction.rollback();
          return fail('INSUFFICIENT_STOCK');
        }

        const unitPrice = Number(stockResult.value.product?.price ?? 0);
        const productName = String(stockResult.value.product?.name ?? 'Producto');
        const subtotal = unitPrice * qty;

        const existingLine = await SaleDetail.findOne({
          where: { saleId, productId: item.productId },
          transaction,
          lock: transaction.LOCK.UPDATE,
        });

        if (existingLine) {
          const prevQty = Number(existingLine.getDataValue('quantity') ?? 0);
          const newQty = prevQty + qty;
          const newSub = unitPrice * newQty;
          await existingLine.update(
            { quantity: newQty, unitPrice, subtotal: newSub },
            { transaction }
          );
          added.push({ nombre: productName, quantity: qty, subtotal });
        } else {
          await SaleDetail.create(
            {
              id: uuidv4(),
              saleId,
              productId: item.productId,
              quantity: qty,
              unitPrice,
              subtotal,
            },
            { transaction }
          );
          added.push({ nombre: productName, quantity: qty, subtotal });
        }

        await this.deductStock(item.productId, input.branchId, input.empresaId, qty, transaction);
      }

      const detailRows = await SaleDetail.findAll({ where: { saleId }, transaction });
      let total = 0;
      for (const row of detailRows) {
        total += Number(row.getDataValue('subtotal') ?? 0);
      }

      await Sale.update({ total }, { where: { id: saleId, empresaId: input.empresaId }, transaction });
      await transaction.commit();

      return ok({ pedido_id: saleId, total, added });
    } catch (e) {
      await transaction.rollback();
      if (e instanceof Error && e.message === 'INSUFFICIENT_STOCK') {
        return fail('INSUFFICIENT_STOCK');
      }
      throw e;
    }
  }

  private async deductStock(
    productId: string,
    branchId: string,
    empresaId: string,
    quantity: number,
    transaction: Transaction
  ): Promise<void> {
    const rows = (await sequelize.query(
      `SELECT quantity FROM inventory_stock
       WHERE product_id = :productId AND branch_id = :branchId AND empresa_id = :empresaId
       FOR UPDATE`,
      {
        replacements: { productId, branchId, empresaId },
        transaction,
        type: QueryTypes.SELECT,
      }
    )) as Record<string, unknown>[];
    const current = Number(rows[0]?.quantity ?? 0);
    if (current < quantity) throw new Error('INSUFFICIENT_STOCK');
    await sequelize.query(
      `UPDATE inventory_stock SET quantity = quantity - :quantity, updated_at = NOW()
       WHERE product_id = :productId AND branch_id = :branchId AND empresa_id = :empresaId`,
      { replacements: { productId, branchId, empresaId, quantity }, transaction }
    );
  }

  private async mapBindingsWithEmpresaNames(
    rows: AssistantChannelBinding[],
    extra?: (b: AssistantChannelBinding) => Record<string, unknown>
  ): Promise<Record<string, unknown>[]> {
    const empresaIds = [
      ...new Set(rows.map((b) => String(b.getDataValue('empresaId') ?? '')).filter(Boolean)),
    ];
    const empresas =
      empresaIds.length > 0
        ? await Empresa.findAll({
            where: { id: empresaIds },
            attributes: ['id', 'nombreFantasia', 'razonSocial'],
          })
        : [];
    const nameById = new Map(
      empresas.map((e) => {
        const id = String(e.getDataValue('id') ?? '');
        const label =
          String(e.getDataValue('nombreFantasia') || e.getDataValue('razonSocial') || '').trim() ||
          'Sin nombre';
        return [id, label] as const;
      })
    );

    return rows.map((b) => {
      const empresaId = String(b.getDataValue('empresaId') ?? '');
      return {
        id: String(b.getDataValue('id') ?? ''),
        empresaId,
        empresaNombre: nameById.get(empresaId) ?? 'Sin nombre',
        channel: String(b.getDataValue('channel') ?? ''),
        externalId: String(b.getDataValue('externalId') ?? ''),
        defaultBranchId: b.getDataValue('defaultBranchId') ?? null,
        sessionBranchId: b.getDataValue('sessionBranchId') ?? null,
        ...(extra ? extra(b) : {}),
      };
    });
  }

  async listAllBindings(): Promise<Result<Record<string, unknown>[]>> {
    const rows = await AssistantChannelBinding.findAll({
      where: { isActive: true },
      order: [['createdAt', 'DESC']],
    });
    return ok(await this.mapBindingsWithEmpresaNames(rows));
  }

  async listBindingsForEmpresa(empresaId: string): Promise<Result<Record<string, unknown>[]>> {
    const rows = await AssistantChannelBinding.findAll({
      where: { empresaId },
      order: [['createdAt', 'DESC']],
    });
    return ok(
      await this.mapBindingsWithEmpresaNames(rows, (b) => ({
        isActive: Boolean(b.getDataValue('isActive')),
      }))
    );
  }

  async upsertWhatsappBinding(input: {
    empresaId: string;
    externalId: string;
    defaultBranchId?: string | null;
    adminNotifyPhone?: string | null;
  }): Promise<Result<Record<string, unknown>>> {
    const phone = normalizePhoneE164(input.externalId);
    if (!phone) return fail('VALIDATION_ERROR: invalid phone');

    const empresa = await Empresa.findByPk(input.empresaId);
    if (!empresa) return fail('EMPRESA_NOT_FOUND');

    const plan = await SaasPlan.findByPk(String(empresa.getDataValue('planId') ?? ''));
    if (!plan) return fail('PLAN_NOT_FOUND');
    const codigo = String(plan.getDataValue('codigo') ?? '').toUpperCase();
    const features = parsePlanFeatures(plan.getDataValue('features'));
    const whatsappOk =
      features.assistantWhatsapp || codigo === 'ESTANDAR' || codigo === 'FULL';
    if (!whatsappOk) return fail('ASSISTANT_PLAN_REQUIRED');

    const phoneTaken = await AssistantChannelBinding.findOne({
      where: { channel: 'WHATSAPP', externalId: phone, isActive: true },
    });
    const phoneTakenEmpresaId = phoneTaken
      ? String(phoneTaken.getDataValue('empresaId') ?? '')
      : '';
    if (phoneTaken && phoneTakenEmpresaId !== input.empresaId) {
      return fail('ASSISTANT_PHONE_IN_USE');
    }

    let defaultBranchId = input.defaultBranchId ?? null;
    if (defaultBranchId) {
      const branch = await Branch.findOne({
        where: { id: defaultBranchId, empresaId: input.empresaId, isActive: true },
      });
      if (!branch) return fail('BRANCH_NOT_FOUND');
    } else {
      const first = await Branch.findOne({
        where: { empresaId: input.empresaId, isActive: true },
        order: [['createdAt', 'ASC']],
      });
      defaultBranchId = first ? String(first.getDataValue('id') ?? '') : null;
    }

    const existingForEmpresa = await AssistantChannelBinding.findOne({
      where: { empresaId: input.empresaId, channel: 'WHATSAPP', isActive: true },
      order: [['updatedAt', 'DESC']],
    });

    let created = false;
    if (existingForEmpresa) {
      await existingForEmpresa.update({
        externalId: phone,
        defaultBranchId,
        isActive: true,
      });
    } else {
      created = true;
      await AssistantChannelBinding.create({
        id: uuidv4(),
        empresaId: input.empresaId,
        channel: 'WHATSAPP',
        externalId: phone,
        defaultBranchId,
        sessionBranchId: null,
        isActive: true,
      });
    }

    if (input.adminNotifyPhone !== undefined) {
      const adminPhone = input.adminNotifyPhone
        ? normalizePhoneE164(input.adminNotifyPhone)
        : null;
      await Empresa.update(
        { assistantAdminPhone: adminPhone },
        { where: { id: input.empresaId } }
      );
    }

    const binding = await AssistantChannelBinding.findOne({
      where: { channel: 'WHATSAPP', externalId: phone, empresaId: input.empresaId },
    });

    return ok({
      id: String(binding?.getDataValue('id') ?? ''),
      externalId: phone,
      defaultBranchId,
      adminNotifyPhone: input.adminNotifyPhone ?? null,
      created,
    });
  }

  async upsertVoiceBinding(input: {
    empresaId: string;
    externalId: string;
    defaultBranchId?: string | null;
  }): Promise<Result<Record<string, unknown>>> {
    const phone = normalizePhoneE164(input.externalId);
    if (!phone) return fail('VALIDATION_ERROR: invalid phone');

    const empresa = await Empresa.findByPk(input.empresaId);
    if (!empresa) return fail('EMPRESA_NOT_FOUND');

    const plan = await SaasPlan.findByPk(String(empresa.getDataValue('planId') ?? ''));
    if (!plan) return fail('PLAN_NOT_FOUND');
    const codigo = String(plan.getDataValue('codigo') ?? '').toUpperCase();
    const features = parsePlanFeatures(plan.getDataValue('features'));
    const voiceOk = features.assistantVoz || codigo === 'FULL';
    if (!voiceOk) return fail('ASSISTANT_VOICE_PLAN_REQUIRED');

    const phoneTaken = await AssistantChannelBinding.findOne({
      where: { channel: 'VOZ', externalId: phone, isActive: true },
    });
    const phoneTakenEmpresaId = phoneTaken
      ? String(phoneTaken.getDataValue('empresaId') ?? '')
      : '';
    if (phoneTaken && phoneTakenEmpresaId !== input.empresaId) {
      return fail('ASSISTANT_PHONE_IN_USE');
    }

    let defaultBranchId = input.defaultBranchId ?? null;
    if (defaultBranchId) {
      const branch = await Branch.findOne({
        where: { id: defaultBranchId, empresaId: input.empresaId, isActive: true },
      });
      if (!branch) return fail('BRANCH_NOT_FOUND');
    } else {
      const first = await Branch.findOne({
        where: { empresaId: input.empresaId, isActive: true },
        order: [['createdAt', 'ASC']],
      });
      defaultBranchId = first ? String(first.getDataValue('id') ?? '') : null;
    }

    const existingForEmpresa = await AssistantChannelBinding.findOne({
      where: { empresaId: input.empresaId, channel: 'VOZ', isActive: true },
      order: [['updatedAt', 'DESC']],
    });

    let created = false;
    if (existingForEmpresa) {
      await existingForEmpresa.update({
        externalId: phone,
        defaultBranchId,
        isActive: true,
      });
    } else {
      created = true;
      await AssistantChannelBinding.create({
        id: uuidv4(),
        empresaId: input.empresaId,
        channel: 'VOZ',
        externalId: phone,
        defaultBranchId,
        sessionBranchId: null,
        isActive: true,
      });
    }

    const binding = await AssistantChannelBinding.findOne({
      where: { channel: 'VOZ', externalId: phone, empresaId: input.empresaId },
    });

    return ok({
      id: String(binding?.getDataValue('id') ?? ''),
      externalId: phone,
      defaultBranchId,
      channel: 'VOZ',
      created,
    });
  }

  async buildPaymentMessageForEmpresa(
    empresaId: string,
    pedidoId: string,
    total: number,
    features: SaasPlanFeatures
  ): Promise<Result<{ mensaje: string; metodo: string }>> {
    const empresa = await Empresa.findByPk(empresaId);
    const shortId = pedidoId.slice(0, 8);
    const totalFmt = Math.round(total).toLocaleString('es-CL');

    if (features.pagosOnline) {
      const base = (process.env.PAYMENT_LINK_BASE_URL ?? 'https://pay.pos-ai.local/p').replace(/\/$/, '');
      return ok({
        metodo: 'WEBPAY',
        mensaje:
          `Pedido #${shortId}\n` +
          `Total: $${totalFmt}\n\n` +
          `💳 Paga en línea (Plan Full):\n${base}/${pedidoId}\n\n` +
          `El pedido se confirma al aprobar el pago.`,
      });
    }

    if (!empresa) return fail('EMPRESA_NOT_FOUND');

    const profile = buildTransferProfileFromEmpresa(empresa);
    if (!isTransferProfileComplete(profile)) {
      return fail('TRANSFER_PROFILE_INCOMPLETE');
    }

    return ok({
      metodo: 'TRANSFERENCIA',
      mensaje: formatTransferPaymentMessage(pedidoId, total, profile!),
    });
  }

  private saleAwaitingCustomerConfirm(notes: string): boolean {
    return notes.includes('espera_confirmacion');
  }

  async confirmCustomerPendingOrder(
    empresaId: string,
    clientPhone: string,
    features: SaasPlanFeatures
  ): Promise<Result<{ pedido_id: string; total: number; mensaje: string; metodo: string }>> {
    const pending = await this.findPendingOrderByPhone(empresaId, clientPhone);
    if (!pending.success) return pending;

    const sale = await Sale.findOne({
      where: { id: pending.value.pedido_id, empresaId, status: 'PENDING' },
    });
    if (!sale) return fail('PENDING_ORDER_NOT_FOUND');

    const notes = String(sale.getDataValue('notes') ?? '');
    if (this.saleAwaitingCustomerConfirm(notes)) {
      const cleaned = notes
        .replace(/\s*·\s*espera_confirmacion/g, '')
        .replace(/espera_confirmacion/g, '')
        .trim();
      await sale.update({ notes: cleaned });
    }

    const pay = await this.buildPaymentMessageForEmpresa(
      empresaId,
      pending.value.pedido_id,
      pending.value.total,
      features
    );
    if (!pay.success) return pay;

    return ok({
      pedido_id: pending.value.pedido_id,
      total: pending.value.total,
      mensaje: pay.value.mensaje,
      metodo: pay.value.metodo,
    });
  }

  async findPendingOrderByPhone(
    empresaId: string,
    clientPhone: string
  ): Promise<
    Result<{
      pedido_id: string;
      total: number;
      branch_id: string;
      branch_name: string;
      awaiting_customer_confirm: boolean;
    }>
  > {
    const phone = normalizePhoneE164(clientPhone);
    const sales = await Sale.findAll({
      where: { empresaId, status: 'PENDING' },
      order: [['createdAt', 'DESC']],
      limit: 30,
    });

    const sale = sales.find((s) => {
      const notes = String(s.getDataValue('notes') ?? '');
      return notes.includes(phone);
    });

    if (!sale) return fail('PENDING_ORDER_NOT_FOUND');

    const branchId = String(sale.getDataValue('branchId') ?? '');
    const branch = await Branch.findByPk(branchId);
    const notes = String(sale.getDataValue('notes') ?? '');
    return ok({
      pedido_id: String(sale.getDataValue('id') ?? ''),
      total: Number(sale.getDataValue('total') ?? 0),
      branch_id: branchId,
      branch_name: String(branch?.getDataValue('name') ?? 'Sucursal'),
      awaiting_customer_confirm: this.saleAwaitingCustomerConfirm(notes),
    });
  }

  async findPendingOrderDetails(
    empresaId: string,
    clientPhone: string
  ): Promise<
    Result<{
      pedido_id: string;
      total: number;
      branch_id: string;
      branch_name: string;
      items: Array<{ nombre: string; quantity: number; unit_price: number; subtotal: number }>;
    }>
  > {
    const pending = await this.findPendingOrderByPhone(empresaId, clientPhone);
    if (!pending.success) return pending;

    const details = await SaleDetail.findAll({
      where: { saleId: pending.value.pedido_id },
    });
    const items: Array<{ nombre: string; quantity: number; unit_price: number; subtotal: number }> =
      [];
    for (const line of details) {
      const productId = String(line.getDataValue('productId') ?? '');
      const product = productId ? await Product.findByPk(productId) : null;
      items.push({
        nombre: String(product?.getDataValue('name') ?? 'Producto'),
        quantity: Number(line.getDataValue('quantity') ?? 0),
        unit_price: Number(line.getDataValue('unitPrice') ?? 0),
        subtotal: Number(line.getDataValue('subtotal') ?? 0),
      });
    }

    return ok({ ...pending.value, items });
  }

  async cancelPendingOrderByPhone(
    empresaId: string,
    clientPhone: string
  ): Promise<Result<{ pedido_id: string; total: number }>> {
    const pending = await this.findPendingOrderByPhone(empresaId, clientPhone);
    if (!pending.success) return pending;

    const transaction = await sequelize.transaction();
    try {
      const sale = await Sale.findOne({
        where: { id: pending.value.pedido_id, empresaId, status: 'PENDING' },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!sale) {
        await transaction.rollback();
        return fail('PENDING_ORDER_NOT_FOUND');
      }

      const branchId = String(sale.getDataValue('branchId') ?? '');
      const saleNotes = String(sale.getDataValue('notes') ?? '');
      await sale.update(
        {
          status: 'CANCELLED',
          notes: `${saleNotes} · cancelado por cliente WSP`.trim(),
        },
        { transaction }
      );
      await this.restoreSaleStock(pending.value.pedido_id, branchId, empresaId, transaction);
      await transaction.commit();

      return ok({
        pedido_id: pending.value.pedido_id,
        total: pending.value.total,
      });
    } catch (e) {
      await transaction.rollback();
      throw e;
    }
  }

  /**
   * Un solo destinatario WSP para comprobantes: teléfono admin del comercio o primer admin de sucursal.
   * Evita re-spam a todos los vendedores (S0 A5).
   */
  async resolveAdminNotifyTargetForProof(
    empresaId: string,
    branchId: string
  ): Promise<Result<Array<{ phone: string; label: string }>>> {
    const empresa = await Empresa.findByPk(empresaId);
    const empresaAdminPhone = normalizePhoneE164(
      String(empresa?.getDataValue('assistantAdminPhone') ?? '')
    );
    if (empresaAdminPhone.length >= 8) {
      return ok([{ phone: empresaAdminPhone, label: 'Admin comercio' }]);
    }

    const adminRole = await Role.findOne({ where: { name: 'ADMIN' } });
    if (!adminRole) return ok([]);

    const adminUser = await User.findOne({
      where: {
        empresaId,
        branchId,
        isActive: true,
        roleId: adminRole.getDataValue('id'),
      },
      order: [['createdAt', 'ASC']],
    });
    const branchAdminPhone = normalizePhoneE164(
      String(adminUser?.getDataValue('whatsappPhone') ?? '')
    );
    if (branchAdminPhone.length >= 8) {
      return ok([
        {
          phone: branchAdminPhone,
          label: String(adminUser?.getDataValue('fullName') ?? 'Administrador'),
        },
      ]);
    }

    return ok([]);
  }

  async resolveNotifyTargets(
    empresaId: string,
    branchId: string
  ): Promise<Result<Array<{ phone: string; label: string }>>> {
    const targets: Array<{ phone: string; label: string }> = [];
    const seen = new Set<string>();

    const sellerRole = await Role.findOne({ where: { name: 'SELLER' } });
    const adminRole = await Role.findOne({ where: { name: 'ADMIN' } });
    const roleIds = [sellerRole?.getDataValue('id'), adminRole?.getDataValue('id')].filter(Boolean) as string[];

    if (roleIds.length > 0) {
      const staff = await User.findAll({
        where: { empresaId, branchId, isActive: true, roleId: roleIds },
        order: [['createdAt', 'ASC']],
        limit: 8,
      });
      for (const u of staff) {
        const phone = normalizePhoneE164(String(u.getDataValue('whatsappPhone') ?? ''));
        if (phone.length >= 8 && !seen.has(phone)) {
          seen.add(phone);
          targets.push({
            phone,
            label: String(u.getDataValue('fullName') ?? 'Vendedor sucursal'),
          });
        }
      }
    }

    const empresa = await Empresa.findByPk(empresaId);
    const adminPhone = normalizePhoneE164(String(empresa?.getDataValue('assistantAdminPhone') ?? ''));
    if (adminPhone.length >= 8 && !seen.has(adminPhone)) {
      targets.push({ phone: adminPhone, label: 'Admin comercio' });
    }

    return ok(targets);
  }

  private static readonly MAX_PROOF_IMAGE_BASE64_LEN = 1_800_000;

  /** Deja un solo comprobante activo por pedido; borra el resto (libera imágenes en BD). */
  private async retainSingleActivePaymentProof(
    empresaId: string,
    saleId: string,
    keepProofId: string,
    transaction?: Transaction
  ): Promise<number> {
    return AssistantPaymentProof.destroy({
      where: {
        empresaId,
        saleId,
        id: { [Op.ne]: keepProofId },
        status: { [Op.in]: ['RECEIVED', 'NOTIFIED_ADMIN'] },
      },
      transaction,
    });
  }

  /**
   * Elimina comprobantes duplicados (mismo pedido, estado pendiente de revisión).
   * Conserva el más reciente por `created_at`.
   */
  async consolidateDuplicatePaymentProofsForBranch(
    empresaId: string,
    branchId: string
  ): Promise<Result<{ removedProofs: number }>> {
    const cleaned = await this.cleanupPaymentProofsForBranch(empresaId, branchId);
    if (!cleaned.success) return cleaned;
    return ok({ removedProofs: cleaned.value.removedProofs });
  }

  /**
   * Limpieza demo/operativa: quita duplicados activos por pedido y archiva comprobantes
   * pendientes cuyo pedido ya no está PENDING (o no existe en la sucursal).
   */
  async cleanupPaymentProofsForBranch(
    empresaId: string,
    branchId: string
  ): Promise<Result<{ removedProofs: number; archivedStale: number }>> {
    const sales = await Sale.findAll({
      where: { empresaId, branchId },
      attributes: ['id'],
    });
    let removedProofs = 0;
    for (const sale of sales) {
      const saleId = String(sale.getDataValue('id') ?? '');
      if (!saleId) continue;
      const active = await AssistantPaymentProof.findAll({
        where: {
          empresaId,
          saleId,
          status: { [Op.in]: ['RECEIVED', 'NOTIFIED_ADMIN'] },
        },
        order: [['createdAt', 'DESC']],
      });
      if (active.length <= 1) continue;
      const keepId = String(active[0]!.getDataValue('id') ?? '');
      if (!keepId) continue;
      removedProofs += await this.retainSingleActivePaymentProof(empresaId, saleId, keepId);
    }

    const pendingActive = await AssistantPaymentProof.findAll({
      where: {
        empresaId,
        status: { [Op.in]: ['RECEIVED', 'NOTIFIED_ADMIN'] },
      },
    });

    let archivedStale = 0;
    for (const proof of pendingActive) {
      const saleId = String(proof.getDataValue('saleId') ?? '');
      const sale = saleId
        ? await Sale.findOne({ where: { id: saleId, empresaId, branchId } })
        : null;
      const saleStatus = sale ? String(sale.getDataValue('status') ?? '') : '';
      if (sale && saleStatus === 'PENDING') continue;

      const prevSummary = String(proof.getDataValue('visionSummary') ?? '');
      const archiveLine = !sale
        ? '[ARCHIVED] Pedido no encontrado o fuera de sucursal'
        : '[ARCHIVED] Pedido ya cerrado (limpieza automática)';

      await proof.update({
        status: 'REJECTED',
        visionSummary: prevSummary ? `${prevSummary}\n${archiveLine}` : archiveLine,
      });
      archivedStale += 1;
    }

    return ok({ removedProofs, archivedStale });
  }

  async registerPaymentProof(input: {
    empresaId: string;
    saleId: string;
    branchId: string;
    clientPhone: string;
    expectedTotal: number;
    detectedAmount: number | null;
    aiMatch: boolean;
    visionSummary: string;
    proofImageMime?: string | null;
    proofImageBase64?: string | null;
  }): Promise<
    Result<{
      proof_id: string;
      notify_targets: Array<{ phone: string; label: string }>;
      is_update?: boolean;
      admin_notify_suppressed?: boolean;
      removed_duplicates?: number;
    }>
  > {
    const sale = await Sale.findOne({
      where: { id: input.saleId, empresaId: input.empresaId, status: 'PENDING' },
    });
    if (!sale) return fail('PENDING_ORDER_NOT_FOUND');

    let proofImageMime: string | null = null;
    let proofImageData: string | null = null;
    const rawB64 = input.proofImageBase64?.trim() ?? '';
    if (rawB64) {
      if (rawB64.length > AssistantDelegate.MAX_PROOF_IMAGE_BASE64_LEN) {
        return fail('VALIDATION_ERROR: proof image too large');
      }
      proofImageData = rawB64;
      proofImageMime = input.proofImageMime?.trim() || 'image/jpeg';
    }

    const existing = await AssistantPaymentProof.findOne({
      where: {
        empresaId: input.empresaId,
        saleId: input.saleId,
        status: { [Op.in]: ['RECEIVED', 'NOTIFIED_ADMIN'] },
      },
      order: [['createdAt', 'DESC']],
    });

    const targetsResult = await this.resolveAdminNotifyTargetForProof(
      input.empresaId,
      input.branchId
    );
    const notifyTargets = targetsResult.success ? targetsResult.value : [];

    if (existing) {
      const proofId = String(existing.getDataValue('id') ?? '');
      const wasAlreadyNotified =
        String(existing.getDataValue('status') ?? '') === 'NOTIFIED_ADMIN';
      const shouldNotifyAdmin = !wasAlreadyNotified && notifyTargets.length > 0;

      await existing.update({
        clientPhone: normalizePhoneE164(input.clientPhone),
        expectedTotal: input.expectedTotal,
        detectedAmount: input.detectedAmount,
        aiMatch: input.aiMatch,
        visionSummary: input.visionSummary,
        proofImageMime,
        proofImageData,
        status: wasAlreadyNotified || shouldNotifyAdmin ? 'NOTIFIED_ADMIN' : 'RECEIVED',
      });
      const removedDuplicates = await this.retainSingleActivePaymentProof(
        input.empresaId,
        input.saleId,
        proofId
      );
      return ok({
        proof_id: proofId,
        notify_targets: shouldNotifyAdmin ? notifyTargets : [],
        is_update: true,
        admin_notify_suppressed: wasAlreadyNotified,
        removed_duplicates: removedDuplicates,
      });
    }

    const proofId = uuidv4();
    await AssistantPaymentProof.create({
      id: proofId,
      empresaId: input.empresaId,
      saleId: input.saleId,
      clientPhone: normalizePhoneE164(input.clientPhone),
      expectedTotal: input.expectedTotal,
      detectedAmount: input.detectedAmount,
      aiMatch: input.aiMatch,
      visionSummary: input.visionSummary,
      proofImageMime,
      proofImageData,
      status: 'RECEIVED',
    });

    if (notifyTargets.length > 0) {
      await AssistantPaymentProof.update(
        { status: 'NOTIFIED_ADMIN' },
        { where: { id: proofId } }
      );
    }

    const removedDuplicates = await this.retainSingleActivePaymentProof(
      input.empresaId,
      input.saleId,
      proofId
    );

    return ok({
      proof_id: proofId,
      notify_targets: notifyTargets,
      is_update: false,
      removed_duplicates: removedDuplicates,
    });
  }

  private parseProofVariant(summary: string | null | undefined): string | null {
    if (!summary) return null;
    const match = summary.match(/^\[([A-Z_]+)\]/);
    return match ? match[1] : null;
  }

  private async restoreSaleStock(
    saleId: string,
    branchId: string,
    empresaId: string,
    transaction: Transaction
  ): Promise<void> {
    const details = await SaleDetail.findAll({ where: { saleId }, transaction });
    for (const line of details) {
      const productId = String(line.getDataValue('productId') ?? '');
      const quantity = Number(line.getDataValue('quantity') ?? 0);
      if (!productId || quantity <= 0) continue;
      await sequelize.query(
        `UPDATE inventory_stock
         SET quantity = quantity + :quantity, updated_at = NOW()
         WHERE product_id = :productId AND branch_id = :branchId AND empresa_id = :empresaId`,
        {
          replacements: { productId, branchId, empresaId, quantity },
          transaction,
        }
      );
    }
  }

  async listPaymentProofsForBranch(
    empresaId: string,
    branchId: string,
    statusFilter: string
  ): Promise<
    Result<
      Array<{
        id: string;
        saleId: string;
        clientPhone: string;
        expectedTotal: number;
        detectedAmount: number | null;
        aiMatch: boolean;
        visionSummary: string | null;
        hasImage: boolean;
        variant: string | null;
        status: string;
        createdAt: string;
        saleStatus: string;
        saleNotes: string | null;
        branchName: string;
        items: Array<{ productName: string; quantity: number; subtotal: number }>;
      }>
    >
  > {
    const pendingOnly = statusFilter !== 'all';
    if (pendingOnly) {
      await this.consolidateDuplicatePaymentProofsForBranch(empresaId, branchId);
    }
    const proofs = await AssistantPaymentProof.findAll({
      where: {
        empresaId,
        ...(pendingOnly
          ? { status: { [Op.in]: ['RECEIVED', 'NOTIFIED_ADMIN'] as const } }
          : {}),
      },
      order: [['createdAt', 'DESC']],
      limit: 100,
    });

    const branch = await Branch.findByPk(branchId);
    const branchName = String(branch?.getDataValue('name') ?? 'Sucursal');
    const rows: Array<{
      id: string;
      saleId: string;
      clientPhone: string;
      expectedTotal: number;
      detectedAmount: number | null;
      aiMatch: boolean;
      visionSummary: string | null;
      hasImage: boolean;
      variant: string | null;
      status: string;
      createdAt: string;
      saleStatus: string;
      saleNotes: string | null;
      branchName: string;
      items: Array<{ productName: string; quantity: number; subtotal: number }>;
    }> = [];

    for (const proof of proofs) {
      const sale = await Sale.findOne({
        where: { id: String(proof.getDataValue('saleId') ?? ''), empresaId, branchId },
        include: [
          {
            model: SaleDetail,
            as: 'details',
            include: [{ model: Product, as: 'product', attributes: ['name'] }],
          },
        ],
      });
      if (!sale) continue;

      const saleStatus = String(sale.getDataValue('status') ?? '');
      if (pendingOnly && saleStatus !== 'PENDING') continue;

      const details = (sale.get('details') as SaleDetail[] | undefined) ?? [];
      rows.push({
        id: String(proof.getDataValue('id') ?? ''),
        saleId: String(proof.getDataValue('saleId') ?? ''),
        clientPhone: String(proof.getDataValue('clientPhone') ?? ''),
        expectedTotal: Number(proof.getDataValue('expectedTotal') ?? 0),
        detectedAmount:
          proof.getDataValue('detectedAmount') != null
            ? Number(proof.getDataValue('detectedAmount'))
            : null,
        aiMatch: Boolean(proof.getDataValue('aiMatch')),
        visionSummary: (proof.getDataValue('visionSummary') as string | null) ?? null,
        hasImage: Boolean(proof.getDataValue('proofImageData')),
        variant: this.parseProofVariant(proof.getDataValue('visionSummary') as string | null),
        status: String(proof.getDataValue('status') ?? ''),
        createdAt: String(proof.getDataValue('createdAt') ?? new Date().toISOString()),
        saleStatus,
        saleNotes: (sale.getDataValue('notes') as string | null) ?? null,
        branchName,
        items: details.map((d) => {
          const product = d.get('product') as Product | undefined;
          return {
            productName: String(product?.getDataValue('name') ?? 'Producto'),
            quantity: Number(d.getDataValue('quantity') ?? 0),
            subtotal: Number(d.getDataValue('subtotal') ?? 0),
          };
        }),
      });
    }

    const deduped = pendingOnly ? this.dedupePaymentProofRowsBySale(rows) : rows;
    return ok(deduped);
  }

  /** En pendientes, un pedido = un comprobante visible (el más reciente). */
  private dedupePaymentProofRowsBySale<
    T extends { saleId: string; createdAt: string },
  >(rows: T[]): T[] {
    const bySale = new Map<string, T>();
    for (const row of rows) {
      const prev = bySale.get(row.saleId);
      if (!prev || new Date(row.createdAt).getTime() > new Date(prev.createdAt).getTime()) {
        bySale.set(row.saleId, row);
      }
    }
    return [...bySale.values()].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getPaymentProofImage(
    empresaId: string,
    proofId: string,
    branchId: string
  ): Promise<Result<{ mimeType: string; imageBase64: string }>> {
    const proof = await AssistantPaymentProof.findOne({
      where: { id: proofId, empresaId },
    });
    if (!proof) return fail('PAYMENT_PROOF_NOT_FOUND');

    const sale = await Sale.findOne({
      where: { id: String(proof.getDataValue('saleId') ?? ''), empresaId, branchId },
    });
    if (!sale) return fail('PAYMENT_PROOF_BRANCH_MISMATCH');

    const data = String(proof.getDataValue('proofImageData') ?? '').trim();
    if (!data) return fail('PAYMENT_PROOF_IMAGE_NOT_FOUND');

    return ok({
      mimeType: String(proof.getDataValue('proofImageMime') ?? 'image/jpeg'),
      imageBase64: data,
    });
  }

  async confirmPaymentProof(
    empresaId: string,
    proofId: string,
    branchId: string,
    _userId: string
  ): Promise<
    Result<{
      proofId: string;
      saleId: string;
      clientPhone: string;
      clientMessage: string;
    }>
  > {
    const transaction = await sequelize.transaction();
    try {
      const proof = await AssistantPaymentProof.findOne({
        where: { id: proofId, empresaId },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!proof) {
        await transaction.rollback();
        return fail('PAYMENT_PROOF_NOT_FOUND');
      }

      const sale = await Sale.findOne({
        where: { id: String(proof.getDataValue('saleId') ?? ''), empresaId, branchId },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!sale) {
        await transaction.rollback();
        return fail('PAYMENT_PROOF_BRANCH_MISMATCH');
      }

      const proofStatus = String(proof.getDataValue('status') ?? '');
      if (!['RECEIVED', 'NOTIFIED_ADMIN'].includes(proofStatus)) {
        await transaction.rollback();
        return fail('PAYMENT_PROOF_ALREADY_REVIEWED');
      }

      const saleStatus = String(sale.getDataValue('status') ?? '');
      if (saleStatus !== 'PENDING') {
        await transaction.rollback();
        return fail('SALE_ALREADY_CLOSED');
      }

      await proof.update({ status: 'ADMIN_CONFIRMED' }, { transaction });
      await sale.update({ status: 'COMPLETED' }, { transaction });
      await transaction.commit();

      const empresa = await Empresa.findByPk(empresaId);
      const nombre = String(
        empresa?.getDataValue('nombreFantasia') ?? empresa?.getDataValue('razonSocial') ?? 'el local'
      );
      const shortId = String(sale.getDataValue('id') ?? '').slice(0, 8);

      return ok({
        proofId,
        saleId: String(sale.getDataValue('id') ?? ''),
        clientPhone: String(proof.getDataValue('clientPhone') ?? ''),
        clientMessage:
          `✅ Tu pago fue confirmado.\n` +
          `Pedido #${shortId}\n` +
          `Gracias por comprar en ${nombre}.`,
      });
    } catch (e) {
      await transaction.rollback();
      throw e;
    }
  }

  async rejectPaymentProof(
    empresaId: string,
    proofId: string,
    branchId: string,
    _userId: string,
    note: string | null
  ): Promise<
    Result<{
      proofId: string;
      saleId: string;
      clientPhone: string;
      clientMessage: string;
    }>
  > {
    const transaction = await sequelize.transaction();
    try {
      const proof = await AssistantPaymentProof.findOne({
        where: { id: proofId, empresaId },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!proof) {
        await transaction.rollback();
        return fail('PAYMENT_PROOF_NOT_FOUND');
      }

      const sale = await Sale.findOne({
        where: { id: String(proof.getDataValue('saleId') ?? ''), empresaId, branchId },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!sale) {
        await transaction.rollback();
        return fail('PAYMENT_PROOF_BRANCH_MISMATCH');
      }

      const proofStatus = String(proof.getDataValue('status') ?? '');
      if (!['RECEIVED', 'NOTIFIED_ADMIN'].includes(proofStatus)) {
        await transaction.rollback();
        return fail('PAYMENT_PROOF_ALREADY_REVIEWED');
      }

      const saleStatus = String(sale.getDataValue('status') ?? '');
      const prevSummary = String(proof.getDataValue('visionSummary') ?? '');
      const rejectLine = note ? `[REJECTED] ${note}` : '[REJECTED]';

      if (saleStatus !== 'PENDING') {
        const archiveLine = note ? `[ARCHIVED] ${note}` : '[ARCHIVED] Pedido ya cerrado';
        await proof.update(
          {
            status: 'REJECTED',
            visionSummary: prevSummary ? `${prevSummary}\n${archiveLine}` : archiveLine,
          },
          { transaction }
        );
        await transaction.commit();
        return ok({
          proofId,
          saleId: String(sale.getDataValue('id') ?? ''),
          clientPhone: String(proof.getDataValue('clientPhone') ?? ''),
          clientMessage: '',
        });
      }

      await proof.update(
        {
          status: 'REJECTED',
          visionSummary: prevSummary ? `${prevSummary}\n${rejectLine}` : rejectLine,
        },
        { transaction }
      );

      const saleNotes = String(sale.getDataValue('notes') ?? '');
      await sale.update(
        {
          status: 'CANCELLED',
          notes: `${saleNotes} · comprobante rechazado`.trim(),
        },
        { transaction }
      );

      await this.restoreSaleStock(String(sale.getDataValue('id') ?? ''), branchId, empresaId, transaction);
      await transaction.commit();

      const shortId = String(sale.getDataValue('id') ?? '').slice(0, 8);
      const reason = note ? `\nMotivo: ${note}` : '';

      return ok({
        proofId,
        saleId: String(sale.getDataValue('id') ?? ''),
        clientPhone: String(proof.getDataValue('clientPhone') ?? ''),
        clientMessage:
          `No pudimos validar tu comprobante para el pedido #${shortId}.${reason}\n` +
          `Contacta al local o envía una nueva captura con monto y destinatario visibles.`,
      });
    } catch (e) {
      await transaction.rollback();
      throw e;
    }
  }

  private extractClientPhoneFromSaleNotes(notes: string): string {
    const parts = notes.split('·').map((s) => s.trim());
    if (parts.length >= 2) {
      const candidate = normalizePhoneE164(parts[1]);
      if (candidate.length >= 8) return candidate;
    }
    const match = notes.match(/(\d{8,15})/);
    return match ? normalizePhoneE164(match[1]) : '';
  }

  async confirmOnlinePayment(
    empresaId: string,
    saleId: string,
    input?: { provider?: string; reference?: string }
  ): Promise<
    Result<{
      saleId: string;
      clientPhone: string;
      clientMessage: string;
    }>
  > {
    const transaction = await sequelize.transaction();
    try {
      const sale = await Sale.findOne({
        where: { id: saleId, empresaId },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!sale) {
        await transaction.rollback();
        return fail('PENDING_ORDER_NOT_FOUND');
      }

      const saleStatus = String(sale.getDataValue('status') ?? '');
      if (saleStatus !== 'PENDING') {
        await transaction.rollback();
        return fail('SALE_ALREADY_CLOSED');
      }

      const notes = String(sale.getDataValue('notes') ?? '');
      if (!/pago:\s*(WEBPAY|MERCADO|FLOW|ONLINE)/i.test(notes)) {
        await transaction.rollback();
        return fail('SALE_NOT_ONLINE_PAYMENT');
      }

      const clientPhone = this.extractClientPhoneFromSaleNotes(notes);
      const provider = input?.provider?.trim() || 'pasarela';
      const refLine = input?.reference?.trim() ? ` · ref ${input.reference.trim()}` : '';

      await sale.update(
        {
          status: 'COMPLETED',
          notes: `${notes} · pago online confirmado (${provider})${refLine}`.trim(),
        },
        { transaction }
      );
      await transaction.commit();

      const empresa = await Empresa.findByPk(empresaId);
      const nombre = String(
        empresa?.getDataValue('nombreFantasia') ?? empresa?.getDataValue('razonSocial') ?? 'el local'
      );
      const shortId = saleId.slice(0, 8);

      return ok({
        saleId,
        clientPhone,
        clientMessage:
          `✅ Pago recibido en línea.\n` +
          `Pedido #${shortId}\n` +
          `Gracias por comprar en ${nombre}.`,
      });
    } catch (e) {
      await transaction.rollback();
      throw e;
    }
  }
}

export default new AssistantDelegate();
