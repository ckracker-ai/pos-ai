export type Result<T> =  | { ok: true; data: T; statusCode?: number }
  | { ok: false; error: string; statusCode: number };

export const ok = <T>(payload: { data: T; statusCode?: number }) => ({ ok: true as const, ...payload });
export const err = (message: string, statusCode = 500) => ({ ok: false as const, error: message, statusCode });
