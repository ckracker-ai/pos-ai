import type { FastifyInstance, FastifyRequest } from 'fastify';
import config from '../config/index.js';
import { buildSession, runAgent } from '../agent/runAgent.js';
import { isMetaSendConfigured, sendWhatsAppText } from '../meta/sendMessage.js';
import { verifyMetaWebhookSignature } from '../meta/verifySignature.js';
import {
  handlePaymentProofImage,
  handlePaymentProofTextClaim,
  isPaymentClaimText,
} from './handlePaymentProof.js';
import { parseIncomingMessage } from './parseIncoming.js';

type RequestWithRawBody = FastifyRequest & { rawBody?: Buffer };

const sessions = new Map<string, Awaited<ReturnType<typeof buildSession>>>();

export async function whatsappRoutes(app: FastifyInstance) {
  await app.register(async (scope) => {
    scope.addContentTypeParser(
      'application/json',
      { parseAs: 'buffer' },
      (req, body, done) => {
        try {
          (req as RequestWithRawBody).rawBody = body as Buffer;
          done(null, JSON.parse((body as Buffer).toString('utf8')));
        } catch (err) {
          done(err as Error, undefined);
        }
      }
    );

    scope.get('/webhooks/whatsapp', async (req, reply) => {
      const q = req.query as Record<string, string>;
      const mode = String(q['hub.mode'] ?? '');
      const token = String(q['hub.verify_token'] ?? '');
      const challenge = String(q['hub.challenge'] ?? '');
      if (mode === 'subscribe' && token === config.whatsappVerifyToken) {
        return reply.status(200).send(challenge);
      }
      return reply.status(403).send('Forbidden');
    });

    scope.post('/webhooks/whatsapp', async (req, reply) => {
      const rawBody = (req as RequestWithRawBody).rawBody;
      if (config.metaAppSecret.trim() && rawBody) {
        const sig = req.headers['x-hub-signature-256'];
        const header = Array.isArray(sig) ? sig[0] : sig;
        if (!verifyMetaWebhookSignature(rawBody, header, config.metaAppSecret)) {
          return reply.status(403).send({ success: false, error: 'INVALID_SIGNATURE' });
        }
      }

      const body = req.body as Record<string, unknown>;
      const incoming = parseIncomingMessage(body);

      if (!incoming) {
        return reply.send({ success: true, skipped: true });
      }

      const from = incoming.from;
      const channel = incoming.channel;

      const replyToUser = async (message: string) => {
        if (channel === 'meta') {
          if (!isMetaSendConfigured()) {
            req.log.warn(
              'Meta webhook: falta WHATSAPP_ACCESS_TOKEN o WHATSAPP_PHONE_NUMBER_ID; respuesta no enviada al cliente'
            );
            return reply.send({ success: true, sentViaMeta: false, skipped: true });
          }
          await sendWhatsAppText(from, message);
          return reply.send({ success: true, sentViaMeta: true });
        }
        return reply.send({ success: true, to: from, reply: message, sentViaMeta: false });
      };

      try {
        if (
          incoming.kind === 'image' ||
          incoming.kind === 'image-dev' ||
          incoming.kind === 'document'
        ) {
          const text = await handlePaymentProofImage(incoming);
          return replyToUser(text);
        }

        if (isPaymentClaimText(incoming.text)) {
          const text = await handlePaymentProofTextClaim(from, incoming.text);
          return replyToUser(text);
        }

        let session = sessions.get(from);
        const stale =
          !session?.context?.empresaId ||
          session.context.empresaId === 'undefined' ||
          session.context.bindingId === 'undefined';
        if (!session || stale) {
          session = await buildSession(from);
          sessions.set(from, session);
        }

        const agentReply = await runAgent(session, incoming.text);
        return replyToUser(agentReply.text);
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Error';

        if (message.includes('ASSISTANT_PLAN_REQUIRED')) {
          return replyToUser(
            'Este negocio no tiene plan Estándar (asistente WhatsApp). Contacta al comercio.'
          );
        }
        if (message.includes('ASSISTANT_BINDING_NOT_FOUND')) {
          return replyToUser(
            'Número no registrado en POS-AI. Contacta al comercio para activar el canal.'
          );
        }

        req.log.error({ err: e, from }, 'whatsapp webhook error');

        if (channel === 'meta' && isMetaSendConfigured()) {
          try {
            await sendWhatsAppText(
              from,
              'Disculpa, hubo un problema técnico. Intenta de nuevo en unos minutos.'
            );
          } catch {
            /* ignore */
          }
          return reply.status(200).send({ success: false, error: message });
        }

        return reply.status(500).send({ success: false, error: message });
      }
    });
  });
}
