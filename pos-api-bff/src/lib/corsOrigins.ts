function splitOrigins(raw: string): string[] {
  return raw
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);
}

export function resolveCorsOrigins(): Set<string> {
  const origins = new Set<string>(splitOrigins(process.env.CORS_ORIGINS ?? ''));
  const frontend = (process.env.FRONTEND_PUBLIC_URL ?? 'http://localhost:8010').replace(/\/$/, '');
  if (frontend) origins.add(frontend);

  origins.add('https://pos-ai.cl');
  origins.add('https://www.pos-ai.cl');

  if (process.env.NODE_ENV !== 'production') {
    origins.add('http://localhost:8010');
    origins.add('http://127.0.0.1:8010');
  }

  return origins;
}
