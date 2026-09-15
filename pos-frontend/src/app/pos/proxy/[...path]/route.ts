import { NextRequest, NextResponse } from 'next/server';
import { POS_PROXY_PREFIX } from '@/core/constants/api-path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function bffBase(): string {
  return (process.env.BFF_INTERNAL_URL || 'http://127.0.0.1:2020').replace(/\/$/, '');
}

async function proxyToBff(req: NextRequest, pathParts: string[]) {
  const path = pathParts.join('/');
  const target = `${bffBase()}${POS_PROXY_PREFIX}/${path}${req.nextUrl.search}`;
  const headers = new Headers();
  req.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (lower === 'host' || lower === 'connection' || lower === 'content-length') return;
    headers.set(key, value);
  });

  const method = req.method.toUpperCase();
  const hasBody = method !== 'GET' && method !== 'HEAD';
  const upstream = await fetch(target, {
    method,
    headers,
    body: hasBody ? await req.arrayBuffer() : undefined,
    redirect: 'manual',
  });

  const outHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (
      lower === 'transfer-encoding' ||
      lower === 'content-encoding' ||
      lower === 'connection' ||
      lower === 'set-cookie'
    ) {
      return;
    }
    outHeaders.append(key, value);
  });

  const setCookies =
    typeof upstream.headers.getSetCookie === 'function' ? upstream.headers.getSetCookie() : [];
  for (const cookie of setCookies) {
    outHeaders.append('set-cookie', cookie);
  }

  return new NextResponse(upstream.body, { status: upstream.status, headers: outHeaders });
}

type RouteCtx = { params: Promise<{ path: string[] }> | { path: string[] } };

async function handle(req: NextRequest, ctx: RouteCtx) {
  const params = await Promise.resolve(ctx.params);
  return proxyToBff(req, params.path ?? []);
}

export async function GET(req: NextRequest, ctx: RouteCtx) {
  return handle(req, ctx);
}
export async function POST(req: NextRequest, ctx: RouteCtx) {
  return handle(req, ctx);
}
export async function PUT(req: NextRequest, ctx: RouteCtx) {
  return handle(req, ctx);
}
export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  return handle(req, ctx);
}
export async function DELETE(req: NextRequest, ctx: RouteCtx) {
  return handle(req, ctx);
}
export async function OPTIONS(req: NextRequest, ctx: RouteCtx) {
  return handle(req, ctx);
}
export async function HEAD(req: NextRequest, ctx: RouteCtx) {
  return handle(req, ctx);
}
