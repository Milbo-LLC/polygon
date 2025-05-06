import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function isStagingEnvironment(host: string): boolean {
  return host.includes('polygon-staging');
}

function isProdEnvironment(host: string): boolean {
  return host === 'polygon.up.railway.app' || host.includes('polygon.up.railway.app');
}

function isLocalhost(host: string): boolean {
  return host.startsWith('localhost') || host.startsWith('127.');
}

function getAllowOrigin(origin: string | null, requestedFrom: string | null, host: string): string | null {
  if (origin) return origin;
  if (requestedFrom) return requestedFrom;
  if (isLocalhost(host)) return 'http://localhost:3000';
  if (isStagingEnvironment(host)) return 'https://polygon-staging.up.railway.app';
  if (isProdEnvironment(host)) return 'https://polygon.up.railway.app';
  return null;
}

function addCORSHeaders(response: NextResponse, allowOrigin: string | null): NextResponse {
  if (allowOrigin) {
    response.headers.set('Access-Control-Allow-Origin', allowOrigin);
  }
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Forwarded-Origin, X-Requested-From');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Max-Age', '86400');
  return response;
}

export function middleware(request: NextRequest) {
  const origin = request.headers.get('origin');
  const url = request.nextUrl.pathname;
  const host = request.headers.get('host') ?? '';
  const requestedFrom = request.headers.get('x-requested-from');

  const allowOrigin = getAllowOrigin(origin, requestedFrom, host);

  if (request.method === 'OPTIONS') {
    return addCORSHeaders(new NextResponse(null, { status: 200 }), allowOrigin);
  }

  if (url.startsWith('/api/')) {
    const response = NextResponse.next();
    return addCORSHeaders(response, allowOrigin);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
