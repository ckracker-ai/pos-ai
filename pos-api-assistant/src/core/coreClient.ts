import config from '../config/index.js';

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  error: string | null;
};

async function coreFetch<T>(
  path: string,
  options: { method?: string; empresaId?: string; body?: unknown } = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-internal-key': config.internalApiKey,
  };
  if (options.empresaId) headers['x-empresa-id'] = options.empresaId;

  const res = await fetch(`${config.coreBaseUrl}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const json = (await res.json()) as ApiEnvelope<T>;
  if (!res.ok || !json.success) {
    throw new Error(json.error ?? `Core error ${res.status}`);
  }
  return json.data;
}

export type AssistantContext = {
  bindingId: string;
  empresaId: string;
  empresaNombre: string;
  phone: string;
  sessionBranchId: string | null;
  defaultBranchId: string | null;
  planCodigo: string;
  features: {
    modulosCore: boolean;
    assistantWhatsapp: boolean;
    assistantVoz: boolean;
    pagosOnline: boolean;
  };
  transferProfile: {
    bankName: string | null;
    accountType: string | null;
    accountNumber: string | null;
    holderName: string | null;
    holderRut: string | null;
  } | null;
};

export const coreClient = {
  resolvePhone(phone: string) {
    return coreFetch<{ context: AssistantContext }>(
      `/assistant/resolve?phone=${encodeURIComponent(phone)}&channel=WHATSAPP`
    ).then((d) => d.context);
  },

  setSessionBranch(bindingId: string, branchId: string | null) {
    return coreFetch(`/assistant/bindings/${bindingId}/session-branch`, {
      method: 'PATCH',
      body: { branchId },
    });
  },

  listBranches(empresaId: string) {
    return coreFetch<{ sucursales: Array<{ id: string; name: string; address: string | null }> }>(
      '/assistant/branches',
      { empresaId }
    ).then((d) => d.sucursales);
  },

  getStock(empresaId: string, branchId: string, productId: string) {
    return coreFetch<Record<string, unknown>>(
      `/assistant/stock/${branchId}/${productId}`,
      { empresaId }
    );
  },

  stockOther(empresaId: string, productId: string, excludeBranchId?: string) {
    const q = excludeBranchId ? `?excludeBranchId=${excludeBranchId}` : '';
    return coreFetch<{ sucursales: Record<string, unknown>[] }>(
      `/assistant/stock-other/${productId}${q}`,
      { empresaId }
    ).then((d) => d.sucursales);
  },

  searchProducts(empresaId: string, q: string, branchId?: string) {
    const params = new URLSearchParams({ q });
    if (branchId) params.set('branchId', branchId);
    return coreFetch<{ productos: Record<string, unknown>[] }>(
      `/assistant/products/search?${params}`,
      { empresaId }
    ).then((d) => d.productos);
  },

  createOrder(
    empresaId: string,
    payload: {
      sucursal_id: string;
      cliente_telefono: string;
      items: Array<{ productId: string; quantity: number }>;
      metodo_pago: string;
    }
  ) {
    return coreFetch<{ pedido_id: string; total: number; status: string }>('/assistant/orders', {
      method: 'POST',
      empresaId,
      body: payload,
    });
  },

  paymentMessage(empresaId: string, pedidoId: string, total: number) {
    return coreFetch<{ mensaje: string; metodo: string }>(`/assistant/orders/${pedidoId}/payment-wsp`, {
      method: 'POST',
      empresaId,
      body: { total },
    });
  },

  findPendingOrder(empresaId: string, phone: string) {
    return coreFetch<{
      pedido: {
        pedido_id: string;
        total: number;
        branch_id: string;
        branch_name: string;
        awaiting_customer_confirm: boolean;
      };
    }>(`/assistant/orders/pending?phone=${encodeURIComponent(phone)}`, { empresaId }).then(
      (d) => d.pedido
    );
  },

  confirmPendingOrder(empresaId: string, phone: string) {
    return coreFetch<{
      pedido: { pedido_id: string; total: number; mensaje: string; metodo: string };
    }>(`/assistant/orders/pending/confirm?phone=${encodeURIComponent(phone)}`, {
      method: 'POST',
      empresaId,
      body: {},
    }).then((d) => d.pedido);
  },

  findPendingOrderDetails(empresaId: string, phone: string) {
    return coreFetch<{
      pedido: {
        pedido_id: string;
        total: number;
        branch_id: string;
        branch_name: string;
        awaiting_customer_confirm: boolean;
        items: Array<{ nombre: string; quantity: number; unit_price: number; subtotal: number }>;
      };
    }>(`/assistant/orders/pending/details?phone=${encodeURIComponent(phone)}`, { empresaId }).then(
      (d) => d.pedido
    );
  },

  cancelPendingOrder(empresaId: string, phone: string) {
    return coreFetch<{ pedido: { pedido_id: string; total: number } }>(
      `/assistant/orders/pending/cancel?phone=${encodeURIComponent(phone)}`,
      { method: 'POST', empresaId, body: {} }
    ).then((d) => d.pedido);
  },

  registerPaymentProof(
    empresaId: string,
    payload: {
      sale_id: string;
      branch_id: string;
      client_phone: string;
      expected_total: number;
      detected_amount: number | null;
      ai_match: boolean;
      vision_summary: string;
      proof_image_mime?: string;
      proof_image_base64?: string;
    }
  ) {
    return coreFetch<{
      proof_id: string;
      notify_targets: Array<{ phone: string; label: string }>;
      is_update?: boolean;
    }>('/assistant/payment-proofs', {
      method: 'POST',
      empresaId,
      body: payload,
    });
  },

  confirmOnlinePayment(
    empresaId: string,
    saleId: string,
    payload?: { provider?: string; reference?: string }
  ) {
    return coreFetch<{
      sale_id: string;
      client_phone: string;
      client_message: string;
    }>(`/assistant/orders/${saleId}/confirm-online-payment`, {
      method: 'POST',
      empresaId,
      body: payload ?? {},
    });
  },
};
