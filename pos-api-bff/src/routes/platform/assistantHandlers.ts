import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import config from '../../config/index.js';
import { extractCoreError } from '../../utils/extractCoreError.js';
import { sendFail, sendOk } from '../../utils/response.js';
import { ApiCoreServicePlatformEmpresa } from '../../services/apiCoreServicePlatformEmpresa.js';

const simulateSchema = z
  .object({
    from: z.string().min(8),
    text: z.string().optional(),
    imageBase64: z.string().min(100).optional(),
    mimeType: z.string().max(80).optional(),
    caption: z.string().max(500).optional(),
  })
  .refine((d) => Boolean(d.text?.trim()) || Boolean(d.imageBase64), {
    message: 'text or imageBase64 required',
  });

export async function handleListBindings(_request: FastifyRequest, reply: FastifyReply) {
  const core = new ApiCoreServicePlatformEmpresa();
  try {
    const data = await core.listAssistantBindings();
    return sendOk(reply, data);
  } catch (e: unknown) {
    const err = e as { response?: { status?: number } };
    return sendFail(
      reply,
      extractCoreError(e, 'Failed to list assistant bindings'),
      err.response?.status ?? 500
    );
  }
}

export async function handleListBranches(request: FastifyRequest, reply: FastifyReply) {
  const { empresaId } = request.params as { empresaId: string };
  const core = new ApiCoreServicePlatformEmpresa();
  try {
    const data = await core.listBranchesForEmpresa(empresaId);
    return sendOk(reply, data);
  } catch (e: unknown) {
    const err = e as { response?: { status?: number } };
    return sendFail(
      reply,
      extractCoreError(e, 'Failed to list branches'),
      err.response?.status ?? 500
    );
  }
}

export async function handleSessionBranch(request: FastifyRequest, reply: FastifyReply) {
  const { bindingId } = request.params as { bindingId: string };
  const body = z
    .object({
      branchId: z
        .union([z.string().uuid(), z.literal(''), z.null()])
        .transform((v) => (v === '' ? null : v)),
    })
    .parse(request.body ?? {});
  const core = new ApiCoreServicePlatformEmpresa();
  try {
    const data = await core.setBindingSessionBranch(bindingId, body.branchId);
    return sendOk(reply, data);
  } catch (e: unknown) {
    const err = e as { response?: { status?: number } };
    return sendFail(
      reply,
      extractCoreError(e, 'Failed to set session branch'),
      err.response?.status ?? 500
    );
  }
}

export async function handleSimulate(request: FastifyRequest, reply: FastifyReply) {
  const body = simulateSchema.parse(request.body);
  const from = body.from.replace(/\D/g, '');
  const payload: Record<string, string> = { from };
  if (body.imageBase64) {
    payload.imageBase64 = body.imageBase64;
    if (body.mimeType) payload.mimeType = body.mimeType;
    if (body.caption?.trim()) payload.caption = body.caption.trim();
  } else {
    payload.text = String(body.text ?? '').trim();
  }

  try {
    const res = await fetch(`${config.assistantApiBaseUrl}/webhooks/whatsapp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const assistantBody = (await res.json()) as {
      success?: boolean;
      reply?: string;
      error?: string;
      message?: string;
      to?: string;
    };

    if (!res.ok) {
      const detail =
        assistantBody.error ??
        assistantBody.message ??
        (res.status === 404
          ? 'pos-api-assistant no expone /webhooks/whatsapp (reconstruye el contenedor assistant)'
          : 'Assistant service error');
      return sendFail(reply, detail, res.status);
    }

    return sendOk(reply, {
      to: assistantBody.to ?? from,
      reply: assistantBody.reply ?? '',
      skipped: Boolean((assistantBody as { skipped?: boolean }).skipped),
      success: assistantBody.success !== false,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Assistant unreachable';
    return sendFail(
      reply,
      `No se pudo contactar pos-api-assistant (${config.assistantApiBaseUrl}). ${message}`,
      503
    );
  }
}

/** Rutas bajo /platform/assistant (prefijo assistant). */
export async function registerPlatformAssistantRoutes(app: FastifyInstance) {
  app.get('/bindings', handleListBindings);
  app.get('/empresas/:empresaId/branches', handleListBranches);
  app.patch('/bindings/:bindingId/session-branch', handleSessionBranch);
  app.post('/simulate', handleSimulate);
}

/** Rutas equivalentes bajo /platform/empresas (compat. BFF sin rebuild de assistant.js). */
export function registerPlatformAssistantEmpresaRoutes(app: FastifyInstance) {
  app.get('/assistant-bindings', handleListBindings);
  app.get('/:empresaId/branches', handleListBranches);
  app.patch('/assistant-bindings/:bindingId/session-branch', handleSessionBranch);
  app.post('/assistant/simulate', handleSimulate);
}
