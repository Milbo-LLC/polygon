import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Function to determine if the origin is from a Railway environment
const isRailwayOrigin = (origin: string | null): boolean => {
  if (!origin) return false;
  return origin.includes('.up.railway.app');
};

export function middleware(request: NextRequest) {
  const origin = request.headers.get('origin');
  
  // Determine the API path we want to apply CORS to
  const authApiRegex = /^\/api\/auth.*/;
  const isAuthApiRoute = authApiRegex.test(request.nextUrl.pathname);
  
  // Only apply special CORS headers to the auth API routes
  if (isAuthApiRoute) {
    // Handle OPTIONS request for preflight
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': origin || '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
          'Access-Control-Max-Age': '86400',
          'Access-Control-Allow-Credentials': 'true',
        },
      });
    }
    
    const response = NextResponse.next();
    
    // Add CORS headers to all auth API responses
    response.headers.set('Access-Control-Allow-Origin', origin || '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    
    return response;
  }
  
  return NextResponse.next();
}

// Match all API auth routes
export const config = {
  matcher: '/api/auth/:path*',
}; 