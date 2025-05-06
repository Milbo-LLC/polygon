import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "~/server/auth";
import { NextResponse } from "next/server";
import { type NextRequest } from "next/server";

// Function to extract domain from origin
function getDomain(origin: string): string {
  try {
    return new URL(origin).hostname;
  } catch {
    return origin;
  }
}

// Function to check if origin is from a PR environment
function isPREnvironment(origin: string | null): boolean {
  if (!origin) return false;
  const domain = getDomain(origin);
  return domain.includes('polygon-polygon-pr-') || domain.includes('polygon-pr-');
}

// Add CORS headers to a response
function addCORSHeaders(response: Response, origin: string | null): Response {
  const newHeaders = new Headers(response.headers);
  newHeaders.set('Access-Control-Allow-Origin', origin ?? '*');
  newHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  newHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Forwarded-Origin, X-Requested-From');
  newHeaders.set('Access-Control-Allow-Credentials', 'true');
  
  // Create a new response with the same status, body, but updated headers
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

// Create handlers with custom config
const handlers = toNextJsHandler(auth);
export const { GET } = handlers;

// Custom POST handler to add CORS headers
export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  const requestedFrom = request.headers.get('x-requested-from');
  const isPR = isPREnvironment(origin) || isPREnvironment(requestedFrom);
  
  console.log('Auth POST request from origin:', origin);
  if (requestedFrom) {
    console.log('With X-Requested-From header:', requestedFrom);
  }
  
  // Get the response from the auth handler
  const response = await handlers.POST(request);
  
  // For PR environments or cross-origin requests, ensure CORS headers
  if (isPR) {
    console.log('Adding CORS headers to auth POST response for PR environment');
    return addCORSHeaders(response, origin ?? requestedFrom ?? '*');
  }
  
  return response;
}

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS(request: NextRequest) {
  // Get the origin from the request headers
  const origin = request.headers.get('origin') ?? '*';
  const requestedFrom = request.headers.get('x-requested-from') ?? origin;
  const isPR = isPREnvironment(origin) || isPREnvironment(requestedFrom);
  
  console.log('Auth route handling OPTIONS request from origin:', origin);
  if (requestedFrom !== origin) {
    console.log('Request includes X-Requested-From header:', requestedFrom);
  }
  
  if (isPR) {
    console.log('Request is from PR environment - ensuring proper CORS headers');
  }
  
  const response = new NextResponse(null, { 
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-Forwarded-Origin, X-Requested-From',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400',
    }
  });
  
  console.log('Auth route OPTIONS response headers:', Object.fromEntries([...response.headers.entries()]));
  
  return response;
} 