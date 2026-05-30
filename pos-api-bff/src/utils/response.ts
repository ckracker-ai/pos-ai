import { FastifyReply } from 'fastify';

export const sendOk = <T>(reply: FastifyReply, data: T, statusCode = 200) => {
  // api-bff debe entregar exactamente la respuesta del api-core.
  // Si el core ya viene envuelto con { success, data, error, code }, entonces no volver a envolver.
  const maybeCoreWrapped = data as any;
  const isWrapped =
    maybeCoreWrapped &&
    typeof maybeCoreWrapped === 'object' &&
    'success' in maybeCoreWrapped &&
    'data' in maybeCoreWrapped &&
    'error' in maybeCoreWrapped &&
    'code' in maybeCoreWrapped;

  if (isWrapped) {
    return reply.status(statusCode).send(maybeCoreWrapped);
  }

  return reply.status(statusCode).send({
    success: true,
    data,
    error: null,
    code: statusCode,
  });
};


export const sendFail = (
  reply: FastifyReply,
  error: string,
  code = 500,
  statusCode = code
) => {
  return reply.status(statusCode).send({
    success: false,
    data: null,
    error,
    code,
  });
};

