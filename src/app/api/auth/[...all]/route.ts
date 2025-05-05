import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "~/server/auth";
import { NextResponse } from "next/server";

export const { POST, GET } = toNextJsHandler(auth);

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS() {
  const response = new NextResponse(null, { status: 200 });
  
  return response;
} 