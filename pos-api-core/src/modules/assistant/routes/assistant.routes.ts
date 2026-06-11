import { Router } from 'express';
import { sendOk, sendFail } from '../../../middleware/globalErrorHandler';
import assistantDelegate, { normalizePhoneE164 } from '../delegates/AssistantDelegate';
import { territoryDelegate } from '../../territory/delegates/TerritoryDelegate';
import { loadAssistantPlan, AssistantRequest } from '../middleware/assistantContext';
const router = Router();

const mapError = (error: string): number => {
  if (error.startsWith('VALIDATION_ERROR') || error === 'TRANSFER_PROFILE_INCOMPLETE') return 422;
  if (
    error === 'ASSISTANT_BINDING_NOT_FOUND' ||
    error === 'BRANCH_NOT_FOUND' ||
    error === 'PENDING_ORDER_NOT_FOUND'
  ) {
    return 404;
  }
  if (
    error.startsWith('ASSISTANT_PLAN_REQUIRED') ||
    error.startsWith('ASSISTANT_VOICE_PLAN_REQUIRED') ||
    error === 'INSUFFICIENT_STOCK'
  ) {
    return 403;
  }
  if (error === 'INSUFFICIENT_STOCK') return 409;
  if (error === 'SALE_NOT_ONLINE_PAYMENT' || error === 'SALE_ALREADY_CLOSED') return 409;
  if (error === 'CART_LOCKED_FOR_PAYMENT' || error === 'PENDING_ORDER_EXISTS_USE_APPEND') return 409;
  if (error === 'CART_BRANCH_MISMATCH') return 409;
  return 400;
};

router.get('/resolve', async (req, res) => {
  const phone = String(req.query.phone ?? '');
  const channel = String(req.query.channel ?? 'WHATSAPP').toUpperCase() as 'WHATSAPP' | 'VOZ';
  const result = await assistantDelegate.resolveByPhone(phone, channel);
  if (result.success) return sendOk(res, { context: result.value });
  return sendFail(res, result.error, mapError(result.error));
});

router.patch('/bindings/:id/session-branch', async (req, res) => {
  const branchId = req.body?.branchId ?? null;
  const result = await assistantDelegate.setSessionBranch(req.params.id, branchId);
  if (result.success) return sendOk(res, { updated: true, branchId });
  return sendFail(res, result.error, mapError(result.error));
});

router.use(loadAssistantPlan);

router.get('/branches', async (req: AssistantRequest, res) => {
  const result = await assistantDelegate.listBranches(req.assistantEmpresaId!);
  if (result.success) return sendOk(res, { sucursales: result.value });
  return sendFail(res, result.error, mapError(result.error));
});

router.get('/stock/:branchId/:productId', async (req: AssistantRequest, res) => {
  const result = await assistantDelegate.getStock(
    req.assistantEmpresaId!,
    req.params.productId,
    req.params.branchId
  );
  if (result.success) return sendOk(res, result.value);
  return sendFail(res, result.error, mapError(result.error));
});

router.get('/stock-other/:productId', async (req: AssistantRequest, res) => {
  const exclude = req.query.excludeBranchId ? String(req.query.excludeBranchId) : undefined;
  const result = await assistantDelegate.stockInOtherBranches(
    req.assistantEmpresaId!,
    req.params.productId,
    exclude
  );
  if (result.success) return sendOk(res, { sucursales: result.value });
  return sendFail(res, result.error, mapError(result.error));
});

router.get('/catalog/categories-summary', async (req: AssistantRequest, res) => {
  const result = await assistantDelegate.getCategoryCatalogSummary(req.assistantEmpresaId!);
  if (result.success) return sendOk(res, result.value);
  return sendFail(res, result.error, mapError(result.error));
});

router.get('/territory/comunas/search', async (req: AssistantRequest, res) => {
  const q = String(req.query.q ?? '');
  const limit = Number(req.query.limit ?? 8);
  const result = await territoryDelegate.searchComunas(q, limit);
  if (!result.success) return sendFail(res, result.error, 400);
  return sendOk(res, result.data);
});

router.post('/territory/resolve', async (req: AssistantRequest, res) => {
  const body = req.body as { comunaText?: string; codigoPostal?: string; comunaId?: string };
  let comunaText = body.comunaText;
  if (body.comunaId && !comunaText) {
    comunaText = body.comunaId;
  }
  const result = await territoryDelegate.resolveLocation({
    comunaText,
    codigoPostal: body.codigoPostal,
    empresaId: req.assistantEmpresaId!,
  });
  if (!result.success) {
    if (result.error === 'INVALID_POSTAL_CODE') {
      return sendFail(res, 'Código postal debe tener 7 dígitos', 422);
    }
    return sendFail(res, result.error, 400);
  }
  return sendOk(res, result.data);
});

router.get('/products/search', async (req: AssistantRequest, res) => {
  const q = String(req.query.q ?? '');
  const branchId = req.query.branchId ? String(req.query.branchId) : undefined;
  const result = await assistantDelegate.searchProducts(req.assistantEmpresaId!, q, branchId);
  if (result.success) return sendOk(res, { productos: result.value });
  return sendFail(res, result.error, mapError(result.error));
});

router.post('/orders', async (req: AssistantRequest, res) => {
  const body = req.body ?? {};
  const rawItems = Array.isArray(body.items) ? body.items : [];
  const items = rawItems.map((it: Record<string, unknown>) => ({
    productId: String(it.productId ?? it.producto_id ?? ''),
    quantity: Number(it.quantity ?? it.cantidad ?? 0),
  }));

  const result = await assistantDelegate.createOrder({
    empresaId: req.assistantEmpresaId!,
    branchId: String(body.sucursal_id ?? body.branchId ?? ''),
    clienteTelefono: normalizePhoneE164(String(body.cliente_telefono ?? body.clienteTelefono ?? '')),
    items,
    metodoPago: String(body.metodo_pago ?? body.metodoPago ?? 'TRANSFERENCIA'),
  });
  if (result.success) return sendOk(res, result.value, 201);
  return sendFail(res, result.error, mapError(result.error));
});

router.post('/orders/:pedidoId/payment-wsp', async (req: AssistantRequest, res) => {
  const total = Number(req.body?.total ?? 0);
  const features = req.assistantFeatures ?? {
    modulosCore: true,
    assistantWhatsapp: true,
    assistantVoz: false,
    pagosOnline: false,
  };
  const result = await assistantDelegate.buildPaymentMessageForEmpresa(
    req.assistantEmpresaId!,
    req.params.pedidoId,
    total,
    features
  );
  if (result.success) {
    return sendOk(res, {
      mensaje: result.value.mensaje,
      pedido_id: req.params.pedidoId,
      metodo: result.value.metodo,
    });
  }
  return sendFail(res, result.error, mapError(result.error));
});

router.get('/orders/pending', async (req: AssistantRequest, res) => {
  const phone = String(req.query.phone ?? '');
  const result = await assistantDelegate.findPendingOrderByPhone(req.assistantEmpresaId!, phone);
  if (result.success) return sendOk(res, { pedido: result.value });
  return sendFail(res, result.error, mapError(result.error));
});

router.get('/orders/pending/details', async (req: AssistantRequest, res) => {
  const phone = String(req.query.phone ?? '');
  const result = await assistantDelegate.findPendingOrderDetails(req.assistantEmpresaId!, phone);
  if (result.success) return sendOk(res, { pedido: result.value });
  return sendFail(res, result.error, mapError(result.error));
});

router.post('/orders/pending/items', async (req: AssistantRequest, res) => {
  const body = req.body ?? {};
  const phone = normalizePhoneE164(String(body.cliente_telefono ?? body.clienteTelefono ?? req.query.phone ?? ''));
  const rawItems = Array.isArray(body.items) ? body.items : [];
  const items = rawItems.map((it: Record<string, unknown>) => ({
    productId: String(it.productId ?? it.producto_id ?? ''),
    quantity: Number(it.quantity ?? it.cantidad ?? 0),
  }));

  const result = await assistantDelegate.appendItemsToPendingOrder({
    empresaId: req.assistantEmpresaId!,
    branchId: String(body.sucursal_id ?? body.branchId ?? ''),
    clienteTelefono: phone,
    items,
  });
  if (result.success) return sendOk(res, result.value);
  return sendFail(res, result.error, mapError(result.error));
});

router.post('/orders/pending/cancel', async (req: AssistantRequest, res) => {
  const phone = String(req.query.phone ?? req.body?.phone ?? '');
  const result = await assistantDelegate.cancelPendingOrderByPhone(req.assistantEmpresaId!, phone);
  if (result.success) return sendOk(res, { pedido: result.value });
  return sendFail(res, result.error, mapError(result.error));
});

router.post('/orders/pending/confirm', async (req: AssistantRequest, res) => {
  const phone = String(req.query.phone ?? req.body?.phone ?? '');
  const features = req.assistantFeatures ?? {
    modulosCore: true,
    assistantWhatsapp: true,
    assistantVoz: false,
    pagosOnline: false,
  };
  const result = await assistantDelegate.confirmCustomerPendingOrder(
    req.assistantEmpresaId!,
    phone,
    features
  );
  if (result.success) return sendOk(res, { pedido: result.value });
  return sendFail(res, result.error, mapError(result.error));
});

router.post('/orders/:pedidoId/confirm-online-payment', async (req: AssistantRequest, res) => {
  const features = req.assistantFeatures ?? {
    modulosCore: true,
    assistantWhatsapp: true,
    assistantVoz: false,
    pagosOnline: false,
  };
  if (!features.pagosOnline) {
    return sendFail(res, 'ASSISTANT_PLAN_REQUIRED: Full plan with pagosOnline', 403);
  }

  const body = req.body ?? {};
  const result = await assistantDelegate.confirmOnlinePayment(
    req.assistantEmpresaId!,
    req.params.pedidoId,
    {
      provider: body.provider != null ? String(body.provider) : undefined,
      reference: body.reference != null ? String(body.reference) : undefined,
    }
  );
  if (result.success) {
    return sendOk(res, {
      sale_id: result.value.saleId,
      client_phone: result.value.clientPhone,
      client_message: result.value.clientMessage,
    });
  }
  return sendFail(res, result.error, mapError(result.error));
});

router.post('/payment-proofs', async (req: AssistantRequest, res) => {
  const body = req.body ?? {};
  const result = await assistantDelegate.registerPaymentProof({
    empresaId: req.assistantEmpresaId!,
    saleId: String(body.sale_id ?? body.saleId ?? ''),
    branchId: String(body.branch_id ?? body.branchId ?? ''),
    clientPhone: normalizePhoneE164(String(body.client_phone ?? body.clientPhone ?? '')),
    expectedTotal: Number(body.expected_total ?? body.expectedTotal ?? 0),
    detectedAmount:
      body.detected_amount != null || body.detectedAmount != null
        ? Number(body.detected_amount ?? body.detectedAmount)
        : null,
    aiMatch: Boolean(body.ai_match ?? body.aiMatch),
    visionSummary: String(body.vision_summary ?? body.visionSummary ?? ''),
    proofImageMime:
      body.proof_image_mime != null || body.proofImageMime != null
        ? String(body.proof_image_mime ?? body.proofImageMime)
        : null,
    proofImageBase64:
      body.proof_image_base64 != null || body.proofImageBase64 != null
        ? String(body.proof_image_base64 ?? body.proofImageBase64)
        : null,
  });
  if (result.success) return sendOk(res, result.value, 201);
  return sendFail(res, result.error, mapError(result.error));
});

export default router;
