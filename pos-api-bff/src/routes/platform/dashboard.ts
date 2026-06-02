import { FastifyInstance } from 'fastify';
import { requirePlatformAuth } from '../../middlewares/requirePlatformAuth.js';
import { extractCoreError } from '../../utils/extractCoreError.js';
import { sendFail, sendOk } from '../../utils/response.js';

const platformDashboardRoutes = async (app: FastifyInstance) => {
  const core = new (
    await import('../../services/apiCoreServicePlatformEmpresa.js')
  ).ApiCoreServicePlatformEmpresa();

  app.addHook('preHandler', requirePlatformAuth);

  app.get('/dashboard', async (_request, reply) => {
    try {
      const data = await core.getDashboard();
      return sendOk(reply, data);
    } catch (e: unknown) {
      const err = e as { response?: { status?: number } };
      return sendFail(
        reply,
        extractCoreError(e, 'Failed to load platform dashboard'),
        err.response?.status ?? 500
      );
    }
  });
};

export default platformDashboardRoutes;
