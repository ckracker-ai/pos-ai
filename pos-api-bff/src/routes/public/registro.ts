import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ApiCoreServicePlatformEmpresa } from '../../services/apiCoreServicePlatformEmpresa.js';
import { extractCoreError } from '../../utils/extractCoreError.js';
import { sendFail, sendOk } from '../../utils/response.js';

const registroSchema = z.object({
  rut: z.string().min(8).max(20),
  razonSocial: z.string().min(2).max(200),
  nombreFantasia: z.string().max(120).optional(),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(8).max(128),
  adminFullName: z.string().min(2).max(120).optional(),
  planCodigo: z.enum(['BASICO', 'ESTANDAR', 'FULL']).default('BASICO'),
  branchName: z.string().min(2).max(120).optional(),
});

/** Alta piloto self-service — crea empresa + sucursal + admin (sin pasarela aún). */
const publicRegistroRoutes = async (app: FastifyInstance) => {
  const core = new ApiCoreServicePlatformEmpresa();

  app.post('/registro', async (request, reply) => {
    const body = registroSchema.parse(request.body ?? {});

    try {
      const data = await core.create({
        rut: body.rut,
        razonSocial: body.razonSocial,
        nombreFantasia: body.nombreFantasia,
        adminEmail: body.adminEmail,
        adminPassword: body.adminPassword,
        adminFullName: body.adminFullName ?? 'Administrador',
        planCodigo: body.planCodigo,
        branchName: body.branchName ?? 'Sucursal Central',
        correoFacturacion: body.adminEmail,
        suscripcionOrigen: 'CHECKOUT',
      });
      return sendOk(reply, data, 201);
    } catch (e: unknown) {
      const err = e as { response?: { status?: number } };
      return sendFail(
        reply,
        extractCoreError(e, 'Failed to complete registration'),
        err.response?.status ?? 400
      );
    }
  });
};

export default publicRegistroRoutes;
