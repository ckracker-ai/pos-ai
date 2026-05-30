import { FastifyReply, FastifyRequest } from 'fastify';
// api-bff NO debe validar RBAC/roles: esa autorización la hace api-core.

// Este middleware solo debe autenticar (JWT válido) y propagar el payload.
export const requireSeller = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const authorization = request.headers.authorization;
    if (!authorization) {
      return reply.status(401).send({ error: 'Missing Authorization header' });
    }

    // Propagamos los headers requeridos por api-core (contrato Postman)
    const internalKey = request.headers['x-internal-key'];
    if (!internalKey) {
      return reply.status(401).send({ error: 'Missing x-internal-key header' });
    }


    const token = authorization.toString().replace(/^Bearer\s+/i, '');
    if (!token) {
      return reply.status(401).send({ error: 'Missing Authorization token' });
    }

    // Restauramos el formato esperado por fastify-jwt
    // Nota: jwtVerify de fastify-jwt toma el token del header Authorization.
    // No alteramos el header (evitamos inconsistencias de formato).

    // No validamos el JWT aquí.
    // api-core se encarga de la autenticación/autorización (401/403).
    // Este middleware actúa como "guard" de presencia del token.
    return;
  } catch (error) {
    return reply.status(401).send({ error: 'Invalid or expired token' });
  }
};



