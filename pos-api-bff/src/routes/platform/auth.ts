import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { sendFail, sendOk } from '../../utils/response.js';
import { ApiCoreServicePlatformAuth } from '../../services/apiCoreServicePlatformAuth.js';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const platformAuthRoutes = async (app: FastifyInstance) => {
  const coreAuth = new ApiCoreServicePlatformAuth();

  app.post('/login', async (request, reply) => {
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

    return sendOk(reply, {
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        roleName: 'PLATFORM_ADMIN',
      },
    });
  });
};

export default platformAuthRoutes;
