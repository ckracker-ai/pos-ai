import crypto from 'node:crypto';
import type { FastifyRequest } from 'fastify';
import config from '../config/index.js';

export function verifyTwilioSignature(req: FastifyRequest): boolean {
  const token = config.twilioAuthToken.trim();
  if (!token) return false;

  const signature = req.headers['x-twilio-signature'];
  if (!signature || Array.isArray(signature)) return false;

  const proto = String(req.headers['x-forwarded-proto'] ?? 'https');
  const host = String(req.headers['x-forwarded-host'] ?? req.headers.host ?? '');
  const url = `${proto}://${host}${req.url}`;

  const body = req.body as Record<string, string> | undefined;
  if (!body || typeof body !== 'object') return false;

  const keys = Object.keys(body).sort();
  let data = url;
  for (const key of keys) {
    data += key + body[key];
  }

  const expected = crypto.createHmac('sha1', token).update(data, 'utf8').digest('base64');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}
