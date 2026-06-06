import type { NormalizedPaymentWebhook, PaymentKind, PaymentWebhookStatus } from './types.js';

const APPROVED = new Set(['APPROVED', 'PAID', 'paid', 'approved', 'APPROVED']);

function normalizeStatus(raw: unknown): PaymentWebhookStatus {
  const s = String(raw ?? 'APPROVED').trim().toUpperCase();
  if (s === 'REJECTED' || s === 'FAILED' || s === 'CANCELLED') return 'REJECTED';
  if (s === 'PENDING') return 'PENDING';
  if (APPROVED.has(String(raw ?? '').trim()) || APPROVED.has(s)) return 'APPROVED';
  return 'APPROVED';
}

function pickKind(metadata: Record<string, unknown>, fallback?: string): PaymentKind | null {
  const k = String(metadata.kind ?? fallback ?? '')
    .trim()
    .toUpperCase();
  if (k === 'SAAS_SUB' || k === 'SALE_WSP') return k;
  return null;
}

/** Acepta contrato unificado v1.8 o payloads legacy BFF/assistant. */
export function parsePaymentWebhookBody(
  body: Record<string, unknown>
): { ok: true; value: NormalizedPaymentWebhook } | { ok: false; error: string } {
  const metadata =
    body.metadata && typeof body.metadata === 'object'
      ? (body.metadata as Record<string, unknown>)
      : {};

  const empresaId = String(
    metadata.empresaId ?? metadata.empresa_id ?? body.empresa_id ?? body.empresaId ?? ''
  ).trim();

  const pedidoIdRaw = metadata.pedidoId ?? metadata.pedido_id ?? body.sale_id ?? body.saleId ?? null;
  const pedidoId = pedidoIdRaw != null && String(pedidoIdRaw).trim() ? String(pedidoIdRaw).trim() : null;

  const provider = String(body.provider ?? 'SANDBOX').trim();
  const externalId = String(
    body.externalId ?? body.external_id ?? body.reference ?? ''
  ).trim();

  const kind =
    pickKind(metadata) ??
    (pedidoId ? 'SALE_WSP' : body.empresa_id || body.empresaId ? 'SAAS_SUB' : null);

  if (!empresaId) return { ok: false, error: 'VALIDATION_ERROR: empresaId required' };
  if (!provider) return { ok: false, error: 'VALIDATION_ERROR: provider required' };
  if (!externalId) return { ok: false, error: 'VALIDATION_ERROR: externalId/reference required' };
  if (!kind) return { ok: false, error: 'VALIDATION_ERROR: metadata.kind or sale_id required' };
  if (kind === 'SALE_WSP' && !pedidoId) {
    return { ok: false, error: 'VALIDATION_ERROR: pedidoId required for SALE_WSP' };
  }

  const amount = Number(body.amount ?? 0);
  const currency = String(body.currency ?? 'CLP').trim().toUpperCase() || 'CLP';

  return {
    ok: true,
    value: {
      provider,
      externalId,
      status: normalizeStatus(body.status),
      amount: Number.isFinite(amount) && amount >= 0 ? Math.round(amount) : 0,
      currency,
      kind,
      empresaId,
      pedidoId,
    },
  };
}
