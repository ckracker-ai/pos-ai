import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/** Raíz del sitio → login super-admin plataforma. */
export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/platform/login', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/'],
};
