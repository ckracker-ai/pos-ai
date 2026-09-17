import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const MARKETING_PATHS = new Set(['/', '/login', '/registro', '/checkout', '/recuperar-contrasena']);

/** Evita que rutas públicas hereden redirecciones legacy; no envía a /login. */
export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (MARKETING_PATHS.has(path) || path.startsWith('/platform')) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logo).*)'],
};
