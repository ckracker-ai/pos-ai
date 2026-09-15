import type { RequestHandler } from 'express';
import rateLimit from 'express-rate-limit';

const GLOBAL_MAX = Math.max(1, Number(process.env.RATE_LIMIT_GLOBAL_MAX ?? 100) || 100);
const LOGIN_MAX = Math.max(1, Number(process.env.RATE_LIMIT_LOGIN_MAX ?? 5) || 5);

const tooMany: RequestHandler = (_req, res) => {
  res.status(429).json({ success: false, data: null, error: 'TOO_MANY_REQUESTS', code: 429 });
};

export const globalRateLimiter = rateLimit({
  windowMs: 60_000,
  max: GLOBAL_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/health',
  handler: tooMany,
});

export const loginRateLimiter = rateLimit({
  windowMs: 60_000,
  max: LOGIN_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    return `login:${req.ip}:${email}`;
  },
  handler: tooMany,
});
