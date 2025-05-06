import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { env } from '~/env'; // You may already have this imported elsewhere

// --- Helper functions ---

function isPREnvironment(origin: string | null, host: string): boolean {
  return (
    !!origin?.includes('-pr-') ||
    host.includes('-pr-')
  );
}

function isStagingEnvironment(host: string): boolean {
  return host.includes('polygon-staging');
}

function isProdEnvironment(host: string): boolean {
  return host === 'polygon.up.railway.app' || host.includes('polygon.up.railway.app');
}

function isLocalhost(host: string): boolean {
  return host.startsWith('localhost') || host.startsWith('127.');
}

// --- CORS logic ---

function getAllowOrigin(origin: string | null, requestedFrom: string | null, host: string): string {
  if (origin) return origin;
  if (requestedFrom) return requestedFrom;

  // Fallback based on environment
  if (isLocalhost(host)) return 'http://localhost:3000';
  if (isStagingEnvironment(host)) return 'https://polygon-staging.up.railway.app';
  if (isProdEnvironment(host)) return 'https://polygon.up.railway.app';

  // Last resort fallback (should rarely happen)
  return 'https://polygon-staging.up.railway.app';
}

function addCORSHeaders(response: NextResponse, allowOrigin: string): NextResponse {
  response.headers.set('Access-Control-Allow-Origin', allowOrigin);
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Forwarded-Origin, X-Requested-From');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours
  return response;
}

// --- Main middleware ---

export function middleware(request: NextRequest) {
  const origin = request.headers.get('origin');
  const url = request.nextUrl.pathname;
  const host = request.headers.get('host') ?? '';
  const requestedFrom = request.headers.get('x-requested-from');

  const allowOrigin = getAllowOrigin(origin, requestedFrom, host);

  // Handle OPTIONS requests (CORS preflight)
  if (request.method === 'OPTIONS') {
    return addCORSHeaders(new NextResponse(null, { status: 200 }), allowOrigin);
  }

  // --- API routes ---
  if (url.startsWith('/api/')) {
    // Special handling for Better Auth auth routes
    if (url.startsWith('/api/auth/')) {
      const isPR = isPREnvironment(origin, host);
      const isStaging = isStagingEnvironment(host);

      // If the request is from a PR trying to auth against staging, allow it
      if ((isPR && isStaging) || (requestedFrom?.includes('-pr-'))) {
        const response = NextResponse.next();
        return addCORSHeaders(response, allowOrigin);
      }
    }

    // Add CORS headers to all API responses
    const response = NextResponse.next();
    return addCORSHeaders(response, allowOrigin);
  }

  // --- Non-API routes ---
  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
