import type { FastifyInstance } from 'fastify';
import { buildSession, runAgent } from '../agent/runAgent.js';
import {
  voiceBindingMissing,
  voicePaymentRedirect,
  voicePlanRequired,
} from '../agent/voiceMessages.js';
import { isPaymentClaimText } from './handlePaymentProof.js';
import { getAssistantSession, setAssistantSession } from '../session/store.js';
import type { Session } from '../agent/runAgent.js';

function isStaleAssistantSession(session: Session | null): boolean {
  return (
    !session?.context?.empresaId ||
    session.context.empresaId === 'undefined' ||
    session.context.bindingId === 'undefined'
  );
}

type VoiceDevBody = {
  from?: string;
  text?: string;
  speech?: string;
};

function extractUtterance(body: VoiceDevBody): { from: string; text: string } | null {
  const from = String(body.from ?? '').replace(/\D/g, '');
  const text = String(body.text ?? body.speech ?? '').trim();
  if (!from || from.length < 8 || !text) return null;
  return { from, text };
}

export async function voiceRoutes(app: FastifyInstance) {
  app.post('/webhooks/voice', async (req, reply) => {
    const body = (req.body ?? {}) as VoiceDevBody;
    const incoming = extractUtterance(body);

    if (!incoming) {
      return reply.status(422).send({ success: false, error: 'from and text/speech required' });
    }

    const { from, text } = incoming;

    try {
      if (isPaymentClaimText(text)) {
        return reply.send({
          success: true,
          to: from,
          reply: voicePaymentRedirect(),
          channel: 'VOZ',
        });
      }

      let session = await getAssistantSession('VOZ', from);
      if (!session || isStaleAssistantSession(session)) {
        session = await buildSession(from, 'VOZ');
        await setAssistantSession('VOZ', from, session);
      }

      const agentReply = await runAgent(session, text);
      await setAssistantSession('VOZ', from, session);
      return reply.send({
        success: true,
        to: from,
        reply: agentReply.text,
        channel: 'VOZ',
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Error';

      if (message.includes('ASSISTANT_VOICE_PLAN_REQUIRED')) {
        return reply.send({
          success: true,
          to: from,
          reply: voicePlanRequired(),
          channel: 'VOZ',
        });
      }
      if (message.includes('ASSISTANT_BINDING_NOT_FOUND')) {
        return reply.send({
          success: true,
          to: from,
          reply: voiceBindingMissing(),
          channel: 'VOZ',
        });
      }

      req.log.error({ err: e, from }, 'voice webhook error');
      return reply.status(500).send({ success: false, error: message });
    }
  });
}
