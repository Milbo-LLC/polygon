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
  
  console.log(`Middleware processing ${request.method} request to ${url} from origin: ${origin}, on host: ${host}`);
  if (requestedFrom) {
    console.log(`Request includes X-Requested-From header: ${requestedFrom}`);
  }
  
  // Skip handling for static assets and add proper CORS headers
  if (url.startsWith('/_next/') || url.includes('.') || url.includes('favicon')) {
    console.log('Static asset request detected, adding CORS headers');
    const response = NextResponse.next();
    return addCORSHeaders(response, origin);
  }

  // Check environment types
  const isPR = isPREnvironment(origin, host);
  const isStaging = isStagingEnvironment(host);
  
  if (isPR) {
    console.log('PR environment detected');
  }
  
  if (isStaging) {
    console.log('Staging environment detected');
  }

  // Handle auth and API routes with special attention
  if (url.startsWith('/api/')) {
    console.log('Handling API request');
    
    // Always handle OPTIONS requests first - critical for CORS
    if (request.method === 'OPTIONS') {
      console.log('Handling OPTIONS preflight request');
      return addCORSHeaders(new NextResponse(null, { status: 200 }), origin);
    }
    
    // Special handling for authentication-related endpoints
    if (url.startsWith('/api/auth/')) {
      console.log('Auth API request detected');
      
      // Special case: PR environment requesting auth from staging
      if ((isPR && isStaging) || (requestedFrom?.includes('polygon-polygon-pr-'))) {
        console.log('Cross-origin auth request from PR to staging detected - ensuring CORS headers');
        const response = NextResponse.next();
        return addCORSHeaders(response, origin ?? requestedFrom);
      }
    }
    
    // Add CORS headers to all API responses
    console.log('Adding CORS headers to API response');
    const response = NextResponse.next();
    return addCORSHeaders(response, origin);
  }
  
  // For all other routes, just continue
  return NextResponse.next();
}

// Match API routes, static assets, and auth routes
export const config = {
  matcher: ['/api/:path*', '/_next/:path*', '/favicon.ico'],
}; 