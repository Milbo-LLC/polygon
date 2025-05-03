import { NextRequest, NextResponse } from "next/server";
import { getUserSession } from "~/server/auth";

export async function GET(req: NextRequest) {
  try {
    // Get the current session
    const session = await getUserSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: "No session found" },
        { status: 401 }
      );
    }

    // Get the redirect URL from the query parameters
    const { searchParams } = new URL(req.url);
    const redirect = searchParams.get("redirect") || "/";

    // Force a complete session refresh from the database
    const response = NextResponse.redirect(new URL(redirect, req.url));

    // Clear any session cache cookies
    // This is Better Auth specific - adjust if needed for your cookie names
    const cookieName = "ba.session.cache";
    response.cookies.delete(cookieName);

    return response;
  } catch (error) {
    console.error("Error refreshing session:", error);
    return NextResponse.json(
      { error: "Failed to refresh session" },
      { status: 500 }
    );
  }
} 