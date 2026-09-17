import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { loginRateLimitRoute } from '../../lib/rateLimit.js';
import { ApiCoreServiceAuth } from '../../services/apiCoreServiceAuth.js';
import { extractCoreError } from '../../utils/extractCoreError.js';
import { sendFail, sendOk } from '../../utils/response.js';

const requestSchema = z.object({
  email: z.string().email().max(254),
  purpose: z.enum(['registro', 'password_reset']),
});

const resetSchema = z.object({
  email: z.string().email().max(254),
  code: z.string().regex(/^\d{6}$/),
  password: z.string().min(8).max(128),
});

const publicOtpRoutes = async (app: FastifyInstance) => {
  const authCore = new ApiCoreServiceAuth();

  app.post('/otp/request', loginRateLimitRoute, async (request, reply) => {
    const body = requestSchema.parse(request.body ?? {});
    try {
      const data = await authCore.requestEmailOtp(body);
      return sendOk(reply, data);
    } catch (e: unknown) {
      const err = e as { response?: { status?: number } };
      return sendFail(reply, extractCoreError(e, 'Failed to send verification code'), err.response?.status ?? 400);
    }
  });

  app.post('/password/reset', loginRateLimitRoute, async (request, reply) => {
    const body = resetSchema.parse(request.body ?? {});
    try {
      const data = await authCore.resetPasswordWithOtp(body);
      return sendOk(reply, data);
    } catch (e: unknown) {
      const err = e as { response?: { status?: number } };
      return sendFail(reply, extractCoreError(e, 'Failed to reset password'), err.response?.status ?? 400);
    }
  });
};

export default publicOtpRoutes;
