import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const origin = request.headers.get('origin');
  const url = request.nextUrl.pathname;
  const host = request.headers.get('host') ?? '';
  
  console.log(`Middleware processing ${request.method} request to ${url} from origin: ${origin}, on host: ${host}`);
  
  // Handle CORS for API routes
  if (url.startsWith('/api/')) {
    // Check if this is a staging server and the request is from a PR environment
    const isStagingHost = host.includes('polygon-staging');
    const isRequestFromPR = origin?.includes('polygon-polygon-pr-') ?? origin?.includes('polygon-pr-');
    
    // We need to explicitly allow the PR environment to access the staging API
    // This handles the specific error case you're encountering
    const shouldAllowCORS = isStagingHost && isRequestFromPR;
    
    if (shouldAllowCORS) {
      console.log('Explicitly allowing CORS for PR environment accessing staging API');
    }
    
    // Handle OPTIONS request for preflight (most important for CORS issues)
    if (request.method === 'OPTIONS') {
      console.log('Handling OPTIONS preflight request');
      
      const response = new NextResponse(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': origin ?? '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
          'Access-Control-Max-Age': '86400',
          'Access-Control-Allow-Credentials': 'true',
        },
      });
      
      console.log('Response headers:', Object.fromEntries([...response.headers.entries()]));
      return response;
    }
    
    console.log('Handling regular API request');
    const response = NextResponse.next();
    
    // Add CORS headers to all API responses
    response.headers.set('Access-Control-Allow-Origin', origin ?? '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    
    console.log('Response headers:', Object.fromEntries([...response.headers.entries()]));
    return response;
  }
  
  return NextResponse.next();
}

// Match all API routes
export const config = {
  matcher: '/api/:path*',
}; 