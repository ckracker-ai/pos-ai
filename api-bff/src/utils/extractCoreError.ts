/** Mensaje de error legible desde respuesta axios del api-core o errores locales. */
export function extractCoreError(error: unknown, fallback: string): string {
  const err = error as {
    response?: { data?: { error?: unknown; message?: unknown } };
    issues?: Array<{ message?: string }>;
    message?: string;
  };

  const fromCore = err.response?.data?.error;
  if (typeof fromCore === 'string' && fromCore.trim()) {
    return fromCore.trim();
  }

  const fromCoreMessage = err.response?.data?.message;
  if (typeof fromCoreMessage === 'string' && fromCoreMessage.trim()) {
    return fromCoreMessage.trim();
  }

  const zodMsg = err.issues?.[0]?.message;
  if (typeof zodMsg === 'string' && zodMsg.trim()) {
    return zodMsg.trim();
  }

  if (typeof err.message === 'string' && err.message.trim()) {
    return err.message.trim();
  }

  return fallback;
}
