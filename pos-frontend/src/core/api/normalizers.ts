import {
  Branch,
  Category,
  Empresa,
  EmpresaEstado,
  EmpresaPlanSummary,
  KitchenOrder,
  Product,
  SaasMetodoPago,
  SaasPlan,
  SaasPlanCodigo,
  SaasPlanFeatures,
  Supplier,
  User,
  UserRole,
} from '@/core/interfaces';
import { getPlanDescription, getPlanDisplayName } from '@/core/constants/saas-plan';

export function unwrapApiEnvelope(responseData: unknown): unknown {
  if (
    responseData &&
    typeof responseData === 'object' &&
    'data' in responseData &&
    ('success' in responseData || 'code' in responseData)
  ) {
    return (responseData as { data: unknown }).data;
  }
  return responseData;
}

export function extractList<T>(data: unknown, keys: string[]): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object') {
    for (const key of keys) {
      const value = (data as Record<string, unknown>)[key];
      if (Array.isArray(value)) return value as T[];
    }
  }
  return [];
}

export function extractEntity<T>(data: unknown, keys: string[]): T | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return (data as T) ?? null;
  }
  for (const key of keys) {
    if (key in (data as object)) {
      return (data as Record<string, T>)[key];
    }
  }
  return data as T;
}

/** Obtiene el id de un producto recién creado desde distintas formas de respuesta del BFF/core. */
export function extractCreatedProductId(responseData: unknown): string {
  const envelope = unwrapApiEnvelope(responseData);
  const product = extractEntity<Record<string, unknown>>(envelope, ['product']);

  if (product?.id) return String(product.id);

  if (envelope && typeof envelope === 'object' && 'id' in envelope) {
    return String((envelope as Record<string, unknown>).id ?? '');
  }

  return '';
}

export const normalizeRoleName = (roleName?: string): UserRole => {
  if (!roleName) return 'user';
  const normalized = roleName.toLowerCase();
  if (normalized.includes('comanda')) return 'comanda';
  if (normalized.includes('admin')) return 'admin';
  if (normalized.includes('auditor')) return 'auditor';
  if (normalized.includes('seller') || normalized.includes('vendedor')) return 'seller';
  return 'user';
};

export function normalizeUser(raw: Record<string, unknown>): User {
  const roleObj = raw.role as { name?: string } | undefined;
  const roleName = String(roleObj?.name ?? raw.roleName ?? 'user');

  return {
    id: String(raw.id ?? ''),
    email: String(raw.email ?? ''),
    name: String(raw.fullName ?? raw.name ?? ''),
    role: normalizeRoleName(roleName),
    branchId: raw.branchId ? String(raw.branchId) : undefined,
    whatsappPhone: (() => {
      const rawPhone = String(raw.whatsappPhone ?? raw.whatsapp_phone ?? '').replace(/\D/g, '');
      return rawPhone.length >= 8 ? rawPhone : null;
    })(),
    isActive: raw.isActive !== false,
    createdAt: String(raw.createdAt ?? new Date().toISOString()),
    updatedAt: String(raw.updatedAt ?? new Date().toISOString()),
  };
}

function readProductScalar(
  raw: Record<string, unknown>,
  camelKey: string,
  snakeKey: string
): unknown {
  const nested = raw.product as Record<string, unknown> | undefined;
  return (
    raw[camelKey] ??
    raw[snakeKey] ??
    nested?.[camelKey] ??
    nested?.[snakeKey] ??
    (raw.dataValues as Record<string, unknown> | undefined)?.[camelKey]
  );
}

export function normalizeProduct(raw: Record<string, unknown>, stock = 0): Product {
  const category = raw.category as { id?: string; name?: string } | undefined;
  const categoryName =
    typeof raw.category === 'string' ? raw.category : String(category?.name ?? '');
  const categoryIdRaw = readProductScalar(raw, 'categoryId', 'category_id') ?? category?.id;
  const categoryId =
    categoryIdRaw != null && categoryIdRaw !== '' ? String(categoryIdRaw) : undefined;
  const supplier = raw.supplier as { id?: string } | undefined;
  const supplierIdRaw =
    readProductScalar(raw, 'supplierId', 'supplier_id') ?? supplier?.id;
  const supplierId =
    supplierIdRaw != null && supplierIdRaw !== '' ? String(supplierIdRaw) : undefined;

  const embeddedStock = readProductScalar(raw, 'stock', 'stock');
  const resolvedStock =
    embeddedStock !== undefined &&
    embeddedStock !== null &&
    typeof embeddedStock !== 'object'
      ? Number(embeddedStock)
      : stock;

  const minStockRaw = readProductScalar(raw, 'minStock', 'min_stock');
  const resolvedMinStock =
    minStockRaw !== undefined && minStockRaw !== null ? Number(minStockRaw) : 0;

  const priceRaw = readProductScalar(raw, 'price', 'price');
  const isActiveRaw = readProductScalar(raw, 'isActive', 'is_active');

  return {
    id: String(raw.id ?? (raw.product as { id?: string } | undefined)?.id ?? ''),
    name: String(readProductScalar(raw, 'name', 'name') ?? ''),
    description: String(readProductScalar(raw, 'description', 'description') ?? ''),
    price: Number(priceRaw ?? 0),
    cost: Number(readProductScalar(raw, 'cost', 'cost') ?? 0),
    stock: resolvedStock,
    sku: String(readProductScalar(raw, 'sku', 'sku') ?? ''),
    category: categoryName,
    categoryId,
    supplierId,
    isActive: isActiveRaw !== false && isActiveRaw !== 0 && isActiveRaw !== '0',
    inBranch: Boolean(
      raw.stockRecordId ??
        raw.stock_record_id ??
        raw.stockId ??
        raw.stock_id ??
        ((raw.inBranch === true || raw.in_branch === true) ||
          resolvedStock > 0 ||
          resolvedMinStock > 0)
    ),
    stockRecordId:
      raw.stockRecordId != null
        ? String(raw.stockRecordId)
        : raw.stock_record_id != null
          ? String(raw.stock_record_id)
          : raw.stockId != null
            ? String(raw.stockId)
            : raw.stock_id != null
              ? String(raw.stock_id)
              : undefined,
    minStock: resolvedMinStock,
    createdAt: String(
      readProductScalar(raw, 'createdAt', 'created_at') ?? new Date().toISOString()
    ),
    updatedAt: String(
      readProductScalar(raw, 'updatedAt', 'updated_at') ?? new Date().toISOString()
    ),
  };
}

export function normalizeBranch(raw: Record<string, unknown>): Branch {
  const comunaNombre = String(raw.comunaNombre ?? raw.comuna_nombre ?? '');
  const regionNombre = String(raw.regionNombre ?? raw.region_nombre ?? '');
  const cityFallback = comunaNombre
    ? regionNombre
      ? `${comunaNombre}, ${regionNombre}`
      : comunaNombre
    : String(raw.city ?? '');
  return {
    id: String(raw.id ?? ''),
    name: String(raw.name ?? ''),
    code: String(raw.code ?? ''),
    address: String(raw.address ?? ''),
    city: cityFallback,
    comunaId: raw.comunaId != null ? String(raw.comunaId) : raw.comuna_id != null ? String(raw.comuna_id) : null,
    codigoPostal:
      raw.codigoPostal != null
        ? String(raw.codigoPostal)
        : raw.codigo_postal != null
          ? String(raw.codigo_postal)
          : null,
    comunaNombre: comunaNombre || null,
    regionId:
      raw.regionId != null
        ? String(raw.regionId)
        : raw.region_id != null
          ? String(raw.region_id)
          : null,
    regionNombre: regionNombre || null,
    phone: String(raw.phone ?? ''),
    isActive: raw.isActive !== false && raw.is_active !== false,
  };
}

const EMPRESA_ESTADOS: EmpresaEstado[] = ['ACTIVO', 'SUSPENDIDO', 'PENDIENTE_ONBOARDING'];
const SAAS_PLAN_CODIGOS: SaasPlanCodigo[] = ['BASICO', 'ESTANDAR', 'FULL'];
const SAAS_METODOS_PAGO: SaasMetodoPago[] = [
  'TRANSFERENCIA',
  'WEBPAY',
  'MERCADO_PAGO',
  'FLOW',
  'MIXTO',
];

function normalizeMetodoPago(raw: unknown): SaasMetodoPago {
  const value = String(raw ?? 'TRANSFERENCIA').toUpperCase();
  return SAAS_METODOS_PAGO.includes(value as SaasMetodoPago)
    ? (value as SaasMetodoPago)
    : 'TRANSFERENCIA';
}

function normalizePlanValor(raw: Record<string, unknown>): number {
  const v = raw.valor ?? raw.precioReferenciaClp ?? raw.precio_referencia_clp ?? 0;
  return Number(v);
}

function normalizePlanActivo(raw: Record<string, unknown>): boolean {
  if (raw.activo === true || raw.activo === 'true') return true;
  if (raw.activo === false || raw.activo === 'false') return false;
  return raw.isActive === true || raw.is_active === 1 || raw.is_active === true;
}

function normalizePlanFeatures(raw: unknown): SaasPlanFeatures {
  if (!raw || typeof raw !== 'object') {
    return {
      modulosCore: true,
      assistantWhatsapp: false,
      assistantVoz: false,
      pagosOnline: false,
    };
  }
  const o = raw as Record<string, unknown>;
  return {
    modulosCore: o.modulosCore !== false,
    assistantWhatsapp: o.assistantWhatsapp === true,
    assistantVoz: o.assistantVoz === true,
    pagosOnline: o.pagosOnline === true,
  };
}

function normalizeEmpresaPlan(raw: Record<string, unknown>): EmpresaPlanSummary {
  const planRaw = (raw.plan as Record<string, unknown> | undefined) ?? {};
  const codigoRaw = String(planRaw.codigo ?? raw.planCodigo ?? 'BASICO').toUpperCase();
  const codigo = SAAS_PLAN_CODIGOS.includes(codigoRaw as SaasPlanCodigo)
    ? (codigoRaw as SaasPlanCodigo)
    : 'BASICO';

  const nombreRaw = String(planRaw.nombre ?? codigo);
  const descripcionRaw = planRaw.descripcion != null ? String(planRaw.descripcion) : null;

  return {
    id: String(planRaw.id ?? raw.planId ?? ''),
    codigo,
    nombre: getPlanDisplayName({ codigo, nombre: nombreRaw }),
    descripcion: getPlanDescription(codigo, descripcionRaw),
    valor: normalizePlanValor(planRaw),
    metodoPago: normalizeMetodoPago(planRaw.metodoPago ?? planRaw.metodo_pago),
    activo: normalizePlanActivo(planRaw),
    maxSucursales: Number(planRaw.maxSucursales ?? planRaw.max_sucursales ?? 1),
    maxUsuarios: Number(planRaw.maxUsuarios ?? planRaw.max_usuarios ?? 5),
    features: normalizePlanFeatures(planRaw.features),
  };
}

export function normalizeSaasPlan(raw: Record<string, unknown>): SaasPlan {
  const codigoRaw = String(raw.codigo ?? 'BASICO').toUpperCase();
  const codigo = SAAS_PLAN_CODIGOS.includes(codigoRaw as SaasPlanCodigo)
    ? (codigoRaw as SaasPlanCodigo)
    : 'BASICO';
  const nombreRaw = String(raw.nombre ?? codigo);
  const descripcionRaw = raw.descripcion != null ? String(raw.descripcion) : null;

  return {
    id: String(raw.id ?? ''),
    codigo,
    nombre: getPlanDisplayName({ codigo, nombre: nombreRaw }),
    descripcion: getPlanDescription(codigo, descripcionRaw),
    valor: normalizePlanValor(raw),
    metodoPago: normalizeMetodoPago(raw.metodoPago ?? raw.metodo_pago),
    activo: normalizePlanActivo(raw),
    maxSucursales: Number(raw.maxSucursales ?? raw.max_sucursales ?? 1),
    maxUsuarios: Number(raw.maxUsuarios ?? raw.max_usuarios ?? 5),
    features: normalizePlanFeatures(raw.features),
    orden: Number(raw.orden ?? 0),
  };
}

function normalizeSuscripcion(raw: Record<string, unknown> | null | undefined) {
  if (!raw || typeof raw !== 'object') return null;
  const estadoRaw = String(raw.estado ?? 'PILOTO').toUpperCase();
  const estados = ['ACTIVA', 'GRACIA', 'VENCIDA', 'CANCELADA', 'PILOTO'] as const;
  return {
    id: String(raw.id ?? ''),
    estado: estados.includes(estadoRaw as (typeof estados)[number])
      ? (estadoRaw as (typeof estados)[number])
      : 'PILOTO',
    origen: String(raw.origen ?? 'PLATAFORMA'),
    periodo: String(raw.periodo ?? 'MENSUAL'),
    inicioEn: String(raw.inicioEn ?? raw.inicio_en ?? ''),
    proximoCobroEn:
      raw.proximoCobroEn != null
        ? String(raw.proximoCobroEn)
        : raw.proximo_cobro_en != null
          ? String(raw.proximo_cobro_en)
          : null,
    venceEn:
      raw.venceEn != null ? String(raw.venceEn) : raw.vence_en != null ? String(raw.vence_en) : null,
    graceHasta:
      raw.graceHasta != null
        ? String(raw.graceHasta)
        : raw.grace_hasta != null
          ? String(raw.grace_hasta)
          : null,
    notas: raw.notas != null ? String(raw.notas) : null,
  };
}

export function normalizeEmpresa(raw: Record<string, unknown>): Empresa {
  const estadoRaw = String(raw.estado ?? 'ACTIVO').toUpperCase();
  const estado = EMPRESA_ESTADOS.includes(estadoRaw as EmpresaEstado)
    ? (estadoRaw as EmpresaEstado)
    : 'ACTIVO';

  return {
    id: String(raw.id ?? ''),
    rutEmpresa: String(raw.rutEmpresa ?? raw.rut_empresa ?? ''),
    razonSocial: String(raw.razonSocial ?? raw.razon_social ?? ''),
    nombreFantasia: raw.nombreFantasia != null ? String(raw.nombreFantasia) : null,
    giroSii: raw.giroSii != null ? String(raw.giroSii) : null,
    direccionComercial:
      raw.direccionComercial != null ? String(raw.direccionComercial) : null,
    correoFacturacion:
      raw.correoFacturacion != null ? String(raw.correoFacturacion) : null,
    urlLogo: raw.urlLogo != null ? String(raw.urlLogo) : null,
    slug: String(raw.slug ?? ''),
    estado,
    estadoTributario: (() => {
      const t = String(raw.estadoTributario ?? raw.estado_tributario ?? 'FORMAL').toUpperCase();
      return t === 'INFORMAL' || t === 'EN_TRAMITE' || t === 'FORMAL' ? t : 'FORMAL';
    })() as import('@/core/interfaces').EmpresaEstadoTributario,
    rubroNegocio:
      raw.rubroNegocio != null
        ? String(raw.rubroNegocio)
        : raw.rubro_negocio != null
          ? String(raw.rubro_negocio)
          : null,
    telefonoNegocio:
      raw.telefonoNegocio != null
        ? String(raw.telefonoNegocio)
        : raw.telefono_negocio != null
          ? String(raw.telefono_negocio)
          : null,
    formalizacionProgreso: (raw.formalizacionProgreso ?? raw.formalizacion_progreso ?? null) as
      | import('@/core/interfaces').FormalizacionProgreso
      | null,
    formalizacionPorcentaje: Number(raw.formalizacionPorcentaje ?? raw.formalizacion_porcentaje ?? 0),
    esNegocioEnMarcha:
      raw.esNegocioEnMarcha != null
        ? Boolean(raw.esNegocioEnMarcha)
        : String(raw.estadoTributario ?? raw.estado_tributario ?? 'FORMAL').toUpperCase() !== 'FORMAL',
    planId: String(raw.planId ?? raw.plan_id ?? ''),
    plan: normalizeEmpresaPlan(raw),
    assistantAdminPhone:
      raw.assistantAdminPhone != null
        ? String(raw.assistantAdminPhone)
        : raw.assistant_admin_phone != null
          ? String(raw.assistant_admin_phone)
          : null,
    transferBankName:
      raw.transferBankName != null
        ? String(raw.transferBankName)
        : raw.transfer_bank_name != null
          ? String(raw.transfer_bank_name)
          : null,
    transferAccountType:
      raw.transferAccountType != null
        ? String(raw.transferAccountType)
        : raw.transfer_account_type != null
          ? String(raw.transfer_account_type)
          : null,
    transferAccount:
      raw.transferAccount != null
        ? String(raw.transferAccount)
        : raw.transfer_account != null
          ? String(raw.transfer_account)
          : null,
    transferHolderName:
      raw.transferHolderName != null
        ? String(raw.transferHolderName)
        : raw.transfer_holder_name != null
          ? String(raw.transfer_holder_name)
          : null,
    transferRut:
      raw.transferRut != null
        ? String(raw.transferRut)
        : raw.transfer_rut != null
          ? String(raw.transfer_rut)
          : null,
    suscripcion: normalizeSuscripcion(
      (raw.suscripcion as Record<string, unknown> | undefined) ??
        (raw.subscription as Record<string, unknown> | undefined)
    ),
    createdAt: String(raw.createdAt ?? new Date().toISOString()),
    updatedAt: String(raw.updatedAt ?? new Date().toISOString()),
  };
}

export function normalizeSupplier(raw: Record<string, unknown>): Supplier {
  return {
    id: String(raw.id ?? ''),
    name: String(raw.name ?? ''),
    contactEmail: raw.contactEmail ? String(raw.contactEmail) : undefined,
    contactPhone: raw.contactPhone ? String(raw.contactPhone) : undefined,
    address: raw.address ? String(raw.address) : undefined,
    isActive: raw.isActive !== false,
    createdAt: String(raw.createdAt ?? new Date().toISOString()),
    updatedAt: String(raw.updatedAt ?? new Date().toISOString()),
  };
}

export function normalizeCategory(raw: Record<string, unknown>): Category {
  const parentIdRaw = raw.parentId ?? raw.parent_id;
  return {
    id: String(raw.id ?? ''),
    name: String(raw.name ?? ''),
    slug: raw.slug != null ? String(raw.slug) : undefined,
    description: raw.description ? String(raw.description) : undefined,
    parentId: parentIdRaw != null && parentIdRaw !== '' ? String(parentIdRaw) : null,
    parentName:
      raw.parentName != null
        ? String(raw.parentName)
        : raw.parent_name != null
          ? String(raw.parent_name)
          : null,
    isActive: raw.isActive !== false && raw.is_active !== false,
    createdAt: String(raw.createdAt ?? raw.created_at ?? new Date().toISOString()),
    updatedAt: String(raw.updatedAt ?? raw.updated_at ?? new Date().toISOString()),
  };
}

export type CategoryTreeNode = Category & { children?: CategoryTreeNode[] };

export function normalizeCategoryTreeNode(raw: Record<string, unknown>): CategoryTreeNode {
  const childrenRaw = raw.children;
  const children = Array.isArray(childrenRaw)
    ? childrenRaw
        .filter((c): c is Record<string, unknown> => Boolean(c) && typeof c === 'object')
        .map((c) => normalizeCategoryTreeNode(c))
    : [];
  return { ...normalizeCategory(raw), children };
}

export function flattenCategoryTree(
  nodes: CategoryTreeNode[],
  depth = 0,
  parentName: string | null = null
): Category[] {
  const out: Category[] = [];
  for (const node of nodes) {
    const { children, ...rest } = node;
    out.push({
      ...rest,
      depth,
      parentName: parentName ?? rest.parentName ?? null,
    });
    if (children?.length) {
      out.push(...flattenCategoryTree(children, depth + 1, rest.name));
    }
  }
  return out;
}

export function mergeProductsWithInventory(
  products: Product[],
  inventory: Array<Record<string, unknown>>
): Product[] {
  const stockByProduct = new Map<string, number>();
  const minStockByProduct = new Map<string, number>();
  const stockRecordIdByProduct = new Map<string, string>();

  for (const item of inventory) {
    const productId = String(item.productId ?? (item.product as { id?: string })?.id ?? '');
    const recordId = item.id != null ? String(item.id) : '';
    if (!productId || !recordId) continue;
    stockByProduct.set(productId, Number(item.quantity ?? item.stock ?? 0));
    const minStockRaw = item.minStock ?? item.min_stock ?? 0;
    minStockByProduct.set(productId, Number(minStockRaw ?? 0));
    stockRecordIdByProduct.set(productId, recordId);
  }

  return products.map((product) => {
    const hasCatalogBranchStock =
      Boolean(product.stockRecordId) ||
      product.inBranch === true ||
      Number(product.stock ?? 0) > 0 ||
      Number(product.minStock ?? 0) > 0;

    // El catálogo por sucursal ya trae stock/minStock; no pisar con merge de inventario.
    if (hasCatalogBranchStock) return product;

    const recordId = stockRecordIdByProduct.get(product.id);
    const quantity = stockByProduct.get(product.id);
    if (!recordId || quantity === undefined) return product;

    return {
      ...product,
      stock: quantity,
      minStock: minStockByProduct.get(product.id) ?? product.minStock ?? 0,
      inBranch: true,
      stockRecordId: recordId,
    };
  });
}

export interface ShrinkageRecord {
  id: string;
  productId: string;
  productName?: string;
  branchId: string;
  quantity: number;
  reason: string;
  status: string;
  createdAt: string;
}

export function normalizeShrinkage(raw: Record<string, unknown>): ShrinkageRecord {
  const product = raw.product as { name?: string } | undefined;
  return {
    id: String(raw.id ?? raw.shrinkage_id ?? raw.shrinkageId ?? ''),
    productId: String(raw.productId ?? ''),
    productName: product?.name ? String(product.name) : undefined,
    branchId: String(raw.branchId ?? ''),
    quantity: Number(raw.quantity ?? 0),
    reason: String(raw.reason ?? ''),
    status: String(raw.status ?? 'PENDING'),
    createdAt: String(raw.createdAt ?? new Date().toISOString()),
  };
}

export interface PaymentProofRecord {
  id: string;
  saleId: string;
  clientPhone: string;
  expectedTotal: number;
  detectedAmount: number | null;
  aiMatch: boolean;
  visionSummary: string | null;
  variant: string | null;
  status: string;
  createdAt: string;
  saleStatus: string;
  saleNotes: string | null;
  branchName: string;
  hasImage: boolean;
  items: Array<{ productName: string; quantity: number; subtotal: number }>;
}

export function normalizePaymentProof(raw: Record<string, unknown>): PaymentProofRecord {
  const itemsRaw = Array.isArray(raw.items) ? raw.items : [];
  return {
    id: String(raw.id ?? ''),
    saleId: String(raw.saleId ?? raw.sale_id ?? ''),
    clientPhone: String(raw.clientPhone ?? raw.client_phone ?? ''),
    expectedTotal: Number(raw.expectedTotal ?? raw.expected_total ?? 0),
    detectedAmount:
      raw.detectedAmount != null || raw.detected_amount != null
        ? Number(raw.detectedAmount ?? raw.detected_amount)
        : null,
    aiMatch: raw.aiMatch === true || raw.ai_match === true || raw.ai_match === 1,
    visionSummary:
      raw.visionSummary != null
        ? String(raw.visionSummary)
        : raw.vision_summary != null
          ? String(raw.vision_summary)
          : null,
    variant: raw.variant != null ? String(raw.variant) : null,
    status: String(raw.status ?? 'RECEIVED'),
    createdAt: String(raw.createdAt ?? raw.created_at ?? new Date().toISOString()),
    saleStatus: String(raw.saleStatus ?? raw.sale_status ?? '')
      .trim()
      .toUpperCase(),
    saleNotes: raw.saleNotes != null ? String(raw.saleNotes) : null,
    branchName: String(raw.branchName ?? raw.branch_name ?? ''),
    hasImage: raw.hasImage === true || raw.has_image === true || raw.has_image === 1,
    items: itemsRaw.map((line) => {
      const row = line as Record<string, unknown>;
      return {
        productName: String(row.productName ?? row.product_name ?? 'Producto'),
        quantity: Number(row.quantity ?? 0),
        subtotal: Number(row.subtotal ?? 0),
      };
    }),
  };
}

export function parseKitchenOrderReference(notes?: string, createdAt?: string): {
  displayReference: string;
  customerNotes?: string;
} {
  const rawNotes = notes?.trim();
  if (rawNotes) {
    const saleMatch = rawNotes.match(/Venta\s+#(\S+)(?:\s*\(([^)]+)\))?/i);
    if (saleMatch) {
      const payment = saleMatch[2]?.trim();
      const displayReference = payment
        ? `Venta #${saleMatch[1]} (${payment})`
        : `Venta #${saleMatch[1]}`;
      const customerNotes = rawNotes
        .split(/\s*•\s*/)
        .map((part) => part.trim())
        .filter((part) => part && !/^Venta\s+#/i.test(part))
        .join(' • ')
        .trim();
      return {
        displayReference,
        customerNotes: customerNotes || undefined,
      };
    }
    return { displayReference: rawNotes, customerNotes: undefined };
  }

  if (createdAt) {
    const when = new Date(createdAt).toLocaleString('es-CO', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
    return { displayReference: `Pedido ${when}` };
  }

  return { displayReference: 'Pedido' };
}

export function normalizeKitchenOrder(
  raw: Record<string, unknown>,
  productNames: Map<string, string>
): KitchenOrder {
  const detailsRaw =
    (raw.details as Array<Record<string, unknown>> | undefined) ??
    (raw.SaleDetails as Array<Record<string, unknown>> | undefined) ??
    [];

  const items = detailsRaw.map((line) => {
    const product = line.product as { id?: string; name?: string } | undefined;
    const productId = String(line.productId ?? product?.id ?? '');
    return {
      id: String(line.id ?? productId),
      productId,
      productName: String(
        product?.name ?? productNames.get(productId) ?? `Producto ${productId.slice(0, 8)}`
      ),
      quantity: Number(line.quantity ?? 0),
    };
  });

  const notes = raw.notes ? String(raw.notes) : undefined;
  const createdAt = String(raw.createdAt ?? new Date().toISOString());
  const { displayReference, customerNotes } = parseKitchenOrderReference(notes, createdAt);

  return {
    id: String(raw.id ?? ''),
    status: String(raw.status ?? 'PENDING'),
    notes,
    displayReference,
    customerNotes,
    createdAt,
    items,
  };
}

export async function fetchProductsForBranch(
  branchId: string,
  getProducts: () => Promise<{ data: unknown }>,
  getInventory?: (id: string) => Promise<{ data: unknown }>
): Promise<Product[]> {
  const productsRes = await getProducts();
  const envelope = unwrapApiEnvelope(productsRes.data);
  const productRows = extractList<Record<string, unknown>>(envelope, ['products']);
  const products = productRows.map((row) => normalizeProduct(row));

  if (!getInventory) {
    return products;
  }

  try {
    const inventoryRes = await getInventory(branchId);
    const inventory = extractList<Record<string, unknown>>(
      unwrapApiEnvelope(inventoryRes.data),
      ['inventory', 'stock', 'items']
    );
    if (inventory.length === 0) return products;
    return mergeProductsWithInventory(products, inventory);
  } catch {
    return products;
  }
}
