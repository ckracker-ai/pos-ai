import type { FastifyInstance } from 'fastify';
import { ApiCoreServiceLegal } from '../../services/apiCoreServiceLegal.js';
import { extractCoreError } from '../../utils/extractCoreError.js';
import { sendFail, sendOk } from '../../utils/response.js';

const publicLegalRoutes = async (app: FastifyInstance) => {
  const core = new ApiCoreServiceLegal();

  app.get('/legal/sla/current', async (request, reply) => {
    const locale = String((request.query as { locale?: string })?.locale ?? 'es-CL');
    try {
      const response = await core.getCurrentSlaDocument(locale);
      return sendOk(reply, response);
    } catch (e: unknown) {
      const err = e as { response?: { status?: number } };
      return sendFail(
        reply,
        extractCoreError(e, 'Failed to load SLA document'),
        err.response?.status ?? 500
      );
    }
  });

  app.get('/legal/current', async (request, reply) => {
    const locale = String((request.query as { locale?: string })?.locale ?? 'es-CL');
    try {
      const data = await core.getCurrentDocuments(locale);
      return sendOk(reply, data);
    } catch (e: unknown) {
      const err = e as { response?: { status?: number } };
      return sendFail(
        reply,
        extractCoreError(e, 'Failed to load legal documents'),
        err.response?.status ?? 500
      );
    }
  });
};

export default publicLegalRoutes;
