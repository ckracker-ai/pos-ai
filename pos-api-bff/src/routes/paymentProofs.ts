import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import config from '../config/index.js';
import { requireSeller } from '../middlewares/requireSeller.js';
import { requireCoreRequestContext } from '../utils/coreRequestContext.js';
import { sendFail, sendOk } from '../utils/response.js';
import { extractCoreError } from '../utils/extractCoreError.js';
import { ApiCoreServicePaymentProof } from '../services/apiCoreServicePaymentProof.js';

async function notifyClientWsp(phone: string, message: string): Promise<void> {
  try {
    await fetch(`${config.assistantApiBaseUrl}/internal/notify-client`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-key': config.internalApiKey,
      },
      body: JSON.stringify({ phone, message }),
    });
  } catch {
    /* notificación opcional */
  }
}

function unwrapNotifyPayload(raw: unknown): { clientPhone?: string; clientMessage?: string } {
  if (!raw || typeof raw !== 'object') return {};
  const envelope = raw as { data?: unknown };
  const inner = (envelope.data ?? raw) as { clientPhone?: string; clientMessage?: string };
  return inner;
}

const paymentProofRoutes = async (app: FastifyInstance) => {
  const core = new ApiCoreServicePaymentProof();

  app.post(
    '/payment-proofs/consolidate-duplicates',
    { preHandler: [requireSeller] },
    async (request, reply) => {
      const ctx = requireCoreRequestContext(reply, request);
      if (!ctx) return;

      try {
        const data = await core.consolidateDuplicates(ctx.token, ctx.internalKey, ctx.branchId);
        return sendOk(reply, data);
      } catch (e: unknown) {
        const err = e as { response?: { status?: number } };
        return sendFail(
          reply,
          extractCoreError(e, 'Failed to consolidate duplicate proofs'),
          err.response?.status ?? 500
        );
      }
    }
  );

  app.get('/payment-proofs', { preHandler: [requireSeller] }, async (request, reply) => {
    const ctx = requireCoreRequestContext(reply, request);
    if (!ctx) return;

    const status = String((request.query as { status?: string }).status ?? 'pending');

    try {
      const data = await core.listProofs(ctx.token, ctx.internalKey, ctx.branchId, status);
      return sendOk(reply, data);
    } catch (e: unknown) {
      const err = e as { response?: { status?: number } };
      return sendFail(reply, extractCoreError(e, 'Failed to list payment proofs'), err.response?.status ?? 500);
    }
  });

  app.get('/payment-proofs/:id/image', { preHandler: [requireSeller] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const ctx = requireCoreRequestContext(reply, request);
    if (!ctx) return;

    try {
      const data = await core.getProofImage(id, ctx.token, ctx.internalKey, ctx.branchId);
      return sendOk(reply, data);
    } catch (e: unknown) {
      const err = e as { response?: { status?: number } };
      return sendFail(reply, extractCoreError(e, 'Failed to load proof image'), err.response?.status ?? 500);
    }
  });

  app.post('/payment-proofs/:id/confirm', { preHandler: [requireSeller] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const ctx = requireCoreRequestContext(reply, request);
    if (!ctx) return;

    try {
      const data = await core.confirmProof(id, ctx.token, ctx.internalKey, ctx.branchId);
      const inner = unwrapNotifyPayload(data);
      if (inner.clientPhone && inner.clientMessage) {
        await notifyClientWsp(inner.clientPhone, inner.clientMessage);
      }
      return sendOk(reply, data);
    } catch (e: unknown) {
      const err = e as { response?: { status?: number } };
      return sendFail(reply, extractCoreError(e, 'Failed to confirm payment proof'), err.response?.status ?? 400);
    }
  });

  app.post('/payment-proofs/:id/reject', { preHandler: [requireSeller] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const ctx = requireCoreRequestContext(reply, request);
    if (!ctx) return;

    const body = z.object({ note: z.string().optional() }).parse(request.body ?? {});

    try {
      const data = await core.rejectProof(id, body.note, ctx.token, ctx.internalKey, ctx.branchId);
      const inner = unwrapNotifyPayload(data);
      if (inner.clientPhone && inner.clientMessage) {
        await notifyClientWsp(inner.clientPhone, inner.clientMessage);
      }
      return sendOk(reply, data);
    } catch (e: unknown) {
      const err = e as { response?: { status?: number } };
      return sendFail(reply, extractCoreError(e, 'Failed to reject payment proof'), err.response?.status ?? 400);
    }
  });
};

export default paymentProofRoutes;
