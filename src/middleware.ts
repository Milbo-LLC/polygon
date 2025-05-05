import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Helper to check if request is from a PR environment
function isPREnvironment(origin: string | null, host: string): boolean {
  return (
    !!origin?.includes('polygon-polygon-pr-') || 
    !!origin?.includes('polygon-pr-') ||
    host.includes('polygon-polygon-pr-') ||
    host.includes('polygon-pr-')
  );
}

// Helper to check if a host is a staging environment
function isStagingEnvironment(host: string): boolean {
  return host.includes('polygon-staging');
}

// Add CORS headers to response with appropriate values
function addCORSHeaders(response: NextResponse, origin: string | null): NextResponse {
  // If origin is null, allow all origins
  const allowOrigin = origin ?? '*';
  
  response.headers.set('Access-Control-Allow-Origin', allowOrigin);
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Forwarded-Origin, X-Requested-From');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours
  
  return response;
}

export function middleware(request: NextRequest) {
  const origin = request.headers.get('origin');
  const url = request.nextUrl.pathname;
  const host = request.headers.get('host') ?? '';
  const requestedFrom = request.headers.get('x-requested-from');
  
  // Always handle OPTIONS requests first - critical for CORS
  if (request.method === 'OPTIONS') {
    return addCORSHeaders(new NextResponse(null, { status: 200 }), origin);
  }
  
  // Handle API routes
  if (url.startsWith('/api/')) {
    // Special handling for authentication-related endpoints
    if (url.startsWith('/api/auth/')) {
      const isPR = isPREnvironment(origin, host);
      const isStaging = isStagingEnvironment(host);
      
      // Special case: PR environment requesting auth from staging
      if ((isPR && isStaging) || (requestedFrom?.includes('polygon-polygon-pr-'))) {
        const response = NextResponse.next();
        return addCORSHeaders(response, origin ?? requestedFrom);
      }
    }
    
    // Add CORS headers to all API responses
    const response = NextResponse.next();
    return addCORSHeaders(response, origin);
  }
  
  // For all other routes, just continue
  return NextResponse.next();
}

// Only match API routes
export const config = {
  matcher: ['/api/:path*'],
}; 