/** Rutas accesibles sin sesión tenant (marketing + auth). */
export const PUBLIC_APP_EXACT = ['/', '/login', '/registro', '/checkout'] as const;

export const PUBLIC_APP_PREFIXES = ['/platform', '/checkout'] as const;

export function isPublicAppPath(pathname: string | null | undefined): boolean {
  // Durante hidratación Next a veces devuelve null o '' en la raíz — no redirigir al login.
  if (pathname == null || pathname === '') return true;

  const p = pathname.split('?')[0].replace(/\/$/, '') || '/';
  if (p === '/') return true;
  if ((PUBLIC_APP_EXACT as readonly string[]).includes(p)) return true;
  return PUBLIC_APP_PREFIXES.some((prefix) => p.startsWith(prefix));
}
