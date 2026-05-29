import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { UsersService } from '../services/usersService.js';
import { requireCoreRequestContext } from '../utils/coreRequestContext.js';

const createUserSchema = z.object({
  fullName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  roleId: z.string().min(1),
  branchId: z.string().min(1),
});

const updateUserSchema = z.object({
  fullName: z.string().min(1),
  email: z.string().email(),
  roleId: z.string().min(1),
});

const usersRoutes = async (app: FastifyInstance) => {
  const usersService = new UsersService();

  app.get('/health', async () => ({ status: 'users route ok' }));

  app.get('/', async (request, reply) => {
    const ctx = requireCoreRequestContext(reply, request);
    if (!ctx) return;

    const result = await usersService.listUsers(ctx.token, ctx.internalKey, ctx.branchId);

    if (!result.ok) return reply.status(result.statusCode).send({ error: result.error });
    return reply.send({ users: result.data });
  });

  app.post('/', async (request, reply) => {
    const ctx = requireCoreRequestContext(reply, request);
    if (!ctx) return;

    const body = createUserSchema.parse(request.body);
    const result = await usersService.createUser(
      body.fullName,
      body.email,
      body.password,
      body.roleId,
      body.branchId,
      ctx.token,
      ctx.internalKey,
      ctx.branchId
    );

    if (!result.ok) return reply.status(result.statusCode).send({ error: result.error });
    return reply.send({ user: result.data });
  });

  app.put('/:id', async (request, reply) => {
    const ctx = requireCoreRequestContext(reply, request);
    if (!ctx) return;

    const { id } = request.params as { id: string };
    const body = updateUserSchema.parse(request.body);

    const result = await usersService.updateUser(
      id,
      body.fullName,
      body.email,
      body.roleId,
      ctx.token,
      ctx.internalKey,
      ctx.branchId
    );

    if (!result.ok) return reply.status(result.statusCode).send({ error: result.error });
    return reply.send({ user: result.data });
  });

  app.delete('/:id', async (request, reply) => {
    const ctx = requireCoreRequestContext(reply, request);
    if (!ctx) return;

    const { id } = request.params as { id: string };

    const result = await usersService.deleteUser(id, ctx.token, ctx.internalKey, ctx.branchId);

    if (!result.ok) return reply.status(result.statusCode).send({ error: result.error });
    return reply.send({ ok: true, result: result.data });
  });
};

export default usersRoutes;
