import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import config from '../../config/index.js';
import { sendFail, sendOk } from '../../utils/response.js';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const platformAuthRoutes = async (app: FastifyInstance) => {
  app.post('/login', async (request, reply) => {
    const body = loginSchema.parse(request.body);

    if (
      body.email !== config.platformAdminEmail ||
      body.password !== config.platformAdminPassword
    ) {
      return sendFail(reply, 'INVALID_CREDENTIALS', 401);
    }

    const token = await reply.jwtSign({
      userId: 'platform',
      roles: ['PLATFORM_ADMIN'],
    });

    return sendOk(reply, {
      token,
      user: {
        id: 'platform',
        email: body.email,
        fullName: 'Platform Admin',
        roleName: 'PLATFORM_ADMIN',
      },
    });
  });
};

export default platformAuthRoutes;
