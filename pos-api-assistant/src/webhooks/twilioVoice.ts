import type { FastifyInstance, FastifyRequest } from 'fastify';
import config from '../config/index.js';
import { buildSession, runAgent } from '../agent/runAgent.js';
import {
  voiceBindingMissing,
  voicePlanRequired,
} from '../agent/voiceMessages.js';
import { verifyTwilioSignature } from '../telephony/verifyTwilio.js';
import { getAssistantSession, setAssistantSession } from '../session/store.js';

function twimlSay(message: string, gather = true): string {
  const escaped = message
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  const gatherBlock = gather
    ? `<Gather input="speech" language="es-CL" speechTimeout="auto" action="/webhooks/twilio/voice/gather" method="POST">
         <Say language="es-CL">${escaped}</Say>
       </Gather>`
    : `<Say language="es-CL">${escaped}</Say>`;
  return `<?xml version="1.0" encoding="UTF-8"?><Response>${gatherBlock}</Response>`;
}

function callerFromTwilio(req: FastifyRequest): string {
  const body = (req.body ?? {}) as Record<string, string>;
  return String(body.From ?? body.Caller ?? '').replace(/\D/g, '');
}

function speechFromTwilio(req: FastifyRequest): string {
  const body = (req.body ?? {}) as Record<string, string>;
  return String(body.SpeechResult ?? body.speech ?? '').trim();
}

async function handleSpeech(
  req: FastifyRequest,
  reply: { header: (k: string, v: string) => void; status: (n: number) => { send: (b: string) => void } }
) {
  if (!verifyTwilioSignature(req)) {
    return reply.status(403).send(twimlSay('No autorizado.', false));
  }

  const from = callerFromTwilio(req);
  const text = speechFromTwilio(req);

  if (!from) {
    return reply.status(422).send(twimlSay('No pude identificar tu número.', false));
  }

  reply.header('Content-Type', 'text/xml');

  if (!text) {
    return reply.status(200).send(twimlSay('No te escuché bien. Repite por favor.'));
  }

  try {
    let session = await getAssistantSession('VOZ', from);
    if (!session) {
      session = await buildSession(from, 'VOZ');
      await setAssistantSession('VOZ', from, session);
    }
    const agentReply = await runAgent(session, text);
    await setAssistantSession('VOZ', from, session);
    return reply.status(200).send(twimlSay(agentReply.text));
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Error';
    if (message.includes('ASSISTANT_VOICE_PLAN_REQUIRED')) {
      return reply.status(200).send(twimlSay(voicePlanRequired(), false));
    }
    if (message.includes('ASSISTANT_BINDING_NOT_FOUND')) {
      return reply.status(200).send(twimlSay(voiceBindingMissing(), false));
    }
    req.log.error({ err: e, from }, 'twilio voice error');
    return reply.status(200).send(twimlSay('Hubo un problema técnico. Intenta más tarde.', false));
  }
}

export async function twilioVoiceRoutes(app: FastifyInstance) {
  await app.register(async (scope) => {
    scope.addContentTypeParser(
      'application/x-www-form-urlencoded',
      { parseAs: 'string' },
      (_req, body, done) => {
        try {
          const params = new URLSearchParams(String(body));
          const parsed: Record<string, string> = {};
          for (const [k, v] of params.entries()) parsed[k] = v;
          done(null, parsed);
        } catch (err) {
          done(err as Error, undefined);
        }
      }
    );

    scope.post('/webhooks/twilio/voice', async (req, reply) => {
      if (!config.twilioAuthToken.trim()) {
        return reply.status(503).send(twimlSay('Telefonía no configurada.', false));
      }
      reply.header('Content-Type', 'text/xml');
      const greeting = twimlSay(
        'Hola, soy el asistente de ventas. Di sucursales para elegir local, o buscar y el producto.',
        true
      );
      return reply.status(200).send(greeting);
    });

    scope.post('/webhooks/twilio/voice/gather', async (req, reply) => {
      return handleSpeech(req, reply);
    });
  });
}
