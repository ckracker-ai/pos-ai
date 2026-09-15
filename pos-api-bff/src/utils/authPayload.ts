/** Extrae { token, user } de un envelope Core o de un objeto plano. */
export function takeLoginSecrets(payload: unknown): {
  token: string;
  user: Record<string, unknown>;
  envelope: Record<string, unknown> | null;
} | null {
  if (!payload || typeof payload !== 'object') return null;
  const root = payload as Record<string, unknown>;
  const inner =
    root.data && typeof root.data === 'object' ? (root.data as Record<string, unknown>) : root;
  const token = typeof inner.token === 'string' ? inner.token : '';
  const user =
    inner.user && typeof inner.user === 'object' ? (inner.user as Record<string, unknown>) : null;
  if (!token || !user) return null;
  return { token, user, envelope: root.data ? root : null };
}

export function omitTokenFromPayload(payload: unknown): unknown {
  if (!payload || typeof payload !== 'object') return payload;
  const root = payload as Record<string, unknown>;
  if (root.data && typeof root.data === 'object') {
    const data = { ...(root.data as Record<string, unknown>) };
    delete data.token;
    data.session = true;
    return { ...root, data };
  }
  const copy = { ...root };
  delete copy.token;
  copy.session = true;
  return copy;
}
