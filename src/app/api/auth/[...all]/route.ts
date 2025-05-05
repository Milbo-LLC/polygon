import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "~/server/auth";
import { NextResponse } from "next/server";
import { type NextRequest } from "next/server";

export const { POST, GET } = toNextJsHandler(auth);

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS(request: NextRequest) {
  // Get the origin from the request headers
  const origin = request.headers.get('origin') ?? '*';
  
  console.log('Auth route handling OPTIONS request from origin:', origin);
  
  const response = new NextResponse(null, { 
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Max-Age': '86400',
      'Access-Control-Allow-Credentials': 'true',
    }
  });
  
  console.log('Auth route OPTIONS response headers:', Object.fromEntries([...response.headers.entries()]));
  
  return response;
} 