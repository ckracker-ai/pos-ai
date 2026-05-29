import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { BranchesService } from '../services/branchesService.js';

// Nota: En la colección pegada de api-core no aparecen endpoints explícitos de "sucursales".
// Para no inventar contrato, aquí se deja el router como TODO/placeholder para CRUD de sucursales.

const createBranchSchema = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
});

const updateBranchSchema = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
});

const branchesRoutes = async (app: FastifyInstance) => {
  const branchesService = new BranchesService();

  app.get('/health', async () => ({ status: 'branches route ok' }));

  app.get('/', async (request, reply) => {
    const token = (request.headers.authorization ?? '').toString().replace('Bearer ', '');
    const result = await branchesService.listBranches(token);
    if (!result.ok) return reply.status(result.statusCode).send({ error: result.error });
    return reply.send({ branches: (result as any).data });
  });

  app.post('/', async (request, reply) => {
    const token = (request.headers.authorization ?? '').toString().replace('Bearer ', '');
    const body = createBranchSchema.parse(request.body);

    const result = await branchesService.createBranch(body, token);
    if (!result.ok) return reply.status(result.statusCode).send({ error: result.error });
    return reply.send({ branch: (result as any).data });
  });

  app.put('/:id', async (request, reply) => {
    const token = (request.headers.authorization ?? '').toString().replace('Bearer ', '');
    const { id } = request.params as { id: string };
    const body = updateBranchSchema.parse(request.body);

    const result = await branchesService.updateBranch(id, body, token);
    if (!result.ok) return reply.status(result.statusCode).send({ error: result.error });
    return reply.send({ branch: (result as any).data });
  });

  app.delete('/:id', async (request, reply) => {
    const token = (request.headers.authorization ?? '').toString().replace('Bearer ', '');
    const { id } = request.params as { id: string };

    const result = await branchesService.deleteBranch(id, token);
    if (!result.ok) return reply.status(result.statusCode).send({ error: result.error });
    return reply.send({ ok: true, result: (result as any).data });
  });
};

export default branchesRoutes;

