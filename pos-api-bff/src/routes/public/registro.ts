import type { FastifyInstance } from 'fastify';

import { z } from 'zod';

import { ApiCoreServicePlatformEmpresa } from '../../services/apiCoreServicePlatformEmpresa.js';

import { ApiCoreServiceLegal } from '../../services/apiCoreServiceLegal.js';

import { extractCoreError } from '../../utils/extractCoreError.js';

import { sendFail, sendOk } from '../../utils/response.js';



const legalAcceptanceSchema = z.object({

  termsVersion: z.string().min(1),

  privacyVersion: z.string().min(1),

  accepted: z.literal(true),

});



const registroFormalSchema = z.object({

  modoRegistro: z.literal('FORMAL').optional().default('FORMAL'),

  rut: z.string().min(8).max(20),

  razonSocial: z.string().min(2).max(200),

  nombreFantasia: z.string().max(120).optional(),

  giroSii: z.string().min(2).max(200).optional(),

  rubroNegocio: z.string().min(2).max(120).optional(),

  telefonoNegocio: z.string().min(8).max(32).optional(),

  adminEmail: z.string().email(),

  adminPassword: z.string().min(8).max(128),

  adminFullName: z.string().min(2).max(120).optional(),

  planCodigo: z.enum(['BASICO', 'ESTANDAR', 'FULL']).default('BASICO'),

  branchName: z.string().min(2).max(120).optional(),

  legalAcceptance: legalAcceptanceSchema,

});



const registroInformalSchema = z.object({

  modoRegistro: z.literal('INFORMAL'),

  razonSocial: z.string().min(2).max(200),

  nombreFantasia: z.string().max(120).optional(),

  rubroNegocio: z.string().min(2).max(120).optional(),

  telefonoNegocio: z.string().min(8).max(32).optional(),

  adminEmail: z.string().email(),

  adminPassword: z.string().min(8).max(128),

  adminFullName: z.string().min(2).max(120).optional(),

  branchName: z.string().min(2).max(120).optional(),

  legalAcceptance: legalAcceptanceSchema,

});



const registroSchema = z.union([registroInformalSchema, registroFormalSchema]);



/** Alta piloto self-service — crea empresa + sucursal + admin (sin pasarela aún). */

const publicRegistroRoutes = async (app: FastifyInstance) => {

  const core = new ApiCoreServicePlatformEmpresa();

  const legalCore = new ApiCoreServiceLegal();



  app.post('/registro', async (request, reply) => {

    const body = registroSchema.parse(request.body ?? {});



    try {

      const isInformal = body.modoRegistro === 'INFORMAL';

      const data = await core.create({

        modoRegistro: isInformal ? 'INFORMAL' : 'FORMAL',

        rut: isInformal ? undefined : body.rut,

        razonSocial: body.razonSocial,

        nombreFantasia: body.nombreFantasia,

        giroSii: isInformal ? undefined : body.giroSii,

        rubroNegocio: body.rubroNegocio,

        telefonoNegocio: body.telefonoNegocio,

        adminEmail: body.adminEmail,

        adminPassword: body.adminPassword,

        adminFullName: body.adminFullName ?? 'Administrador',

        planCodigo: isInformal ? 'BASICO' : body.planCodigo,

        branchName: body.branchName ?? 'Sucursal Central',

        correoFacturacion: body.adminEmail,

        suscripcionOrigen: 'CHECKOUT',

      });



      const envelope = data as {

        data?: {

          empresa?: { id?: string };

          adminUserId?: string;

        };

      };

      const payload =
        envelope.data ?? (data as { empresa?: { id?: string }; adminUserId?: string });
      const empresaId = payload?.empresa?.id ?? null;
      const adminUserId = payload?.adminUserId ?? null;



      try {

        await legalCore.recordAcceptances({

          userId: adminUserId,

          empresaId,

          termsVersion: body.legalAcceptance.termsVersion,

          privacyVersion: body.legalAcceptance.privacyVersion,

          ipAddress: request.ip,

          userAgent: String(request.headers['user-agent'] ?? ''),

          channel: 'REGISTRO',

        });

      } catch (legalErr: unknown) {

        const err = legalErr as { response?: { status?: number } };

        return sendFail(

          reply,

          extractCoreError(legalErr, 'Failed to record legal acceptance'),

          err.response?.status ?? 409

        );

      }



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


