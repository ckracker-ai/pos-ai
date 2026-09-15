import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { sendFail, sendOk } from '../../utils/response.js';
import { ApiCoreServicePlatformAuth } from '../../services/apiCoreServicePlatformAuth.js';
import config from '../../config/index.js';
import { clearSession, establishSession, ttlFromJwt } from '../../lib/sessionCookie.js';
import { publicSessionView } from '../../middlewares/sessionAuth.js';
import { loginRateLimitRoute } from '../../lib/rateLimit.js';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const platformAuthRoutes = async (app: FastifyInstance) => {
  const coreAuth = new ApiCoreServicePlatformAuth();

  app.post('/login', loginRateLimitRoute, async (request, reply) => {
    const body = loginSchema.parse(request.body);

    let user = null as {
      id: string;
      email: string;
      fullName: string;
      roleName: string;
    } | null;

    try {
      user = await coreAuth.login(body.email, body.password);
    } catch {
      user = coreAuth.loginWithEnvFallback(body.email, body.password);
    }

    if (!user) {
      return sendFail(reply, 'INVALID_CREDENTIALS', 401);
    }

    const token = await reply.jwtSign({
      userId: user.id,
      roles: ['PLATFORM_ADMIN'],
    });

    const userPayload = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      roleName: 'PLATFORM_ADMIN',
    };

    const ttl = ttlFromJwt(token, config.sessionTtlSec);
    const okSession = await establishSession(
      reply,
      {
        kind: 'platform',
        accessToken: token,
        user: userPayload,
      },
      ttl
    );
    if (!okSession) {
      return sendFail(reply, 'SESSION_STORE_UNAVAILABLE', 503);
    }

    return sendOk(reply, {
      session: true,
      user: userPayload,
    });
  });

  app.get('/session', async (request, reply) => {
    if (!request.authSession || request.authSession.kind !== 'platform') {
      return sendFail(reply, 'UNAUTHENTICATED', 401);
    }
    return sendOk(reply, publicSessionView(request.authSession));
  });

  app.post('/logout', async (request, reply) => {
    await clearSession(request, reply, 'platform');
    return sendOk(reply, { loggedOut: true });
  });
};

export default platformAuthRoutes;
