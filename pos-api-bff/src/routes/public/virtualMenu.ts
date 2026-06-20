import type { FastifyInstance } from 'fastify';
import { virtualMenuService } from '../../services/virtualMenuService.js';

const publicVirtualMenuRoutes = async (app: FastifyInstance) => {
  app.get('/menu/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const result = await virtualMenuService.getPublicMenu(slug);

    if (!result.ok) {
      return reply.status(result.statusCode).send({ success: false, error: result.error, data: null });
    }

    return reply.send({ success: true, data: result.data, error: null });
  });
};

export default publicVirtualMenuRoutes;
