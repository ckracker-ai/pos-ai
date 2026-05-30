import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { POS_PROXY_PREFIX } from '@/core/constants/api-path';

export async function POST(request: NextRequest) {
  const authUrl =
    process.env.AUTH_URL ||
    process.env.BFF_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_AUTH_URL ||
    'http://localhost:2020';
  const loginUrl = authUrl.includes(`${POS_PROXY_PREFIX}/auth/login`)
    ? authUrl
    : `${authUrl.replace(/\/$/, '')}${POS_PROXY_PREFIX}/auth/login`;
  const branchId = process.env.NEXT_PUBLIC_DEFAULT_BRANCH_ID || '1';

  try {
    const body = await request.text();

    const backendResponse = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Branch-ID': branchId,
      },
      body,
    });

    const responseText = await backendResponse.text();
    const responseHeaders = new Headers();
    const contentType = backendResponse.headers.get('content-type');
    if (contentType) {
      responseHeaders.set('Content-Type', contentType);
    }

    return new NextResponse(responseText, {
      status: backendResponse.status,
      headers: responseHeaders,
    });
  } catch (error: unknown) {
    console.error('Auth proxy error:', error);

    const message = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        success: false,
        error: `No se pudo conectar al servicio de autenticación. Verifica que el backend esté en ${loginUrl}. (${message})`,
      },
      { status: 502 }
    );
  }
}
