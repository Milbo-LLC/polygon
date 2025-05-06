import { cache } from "react";
import { headers } from "next/headers";
import { authConfig } from "./config";
import { type Session } from "~/types/auth";

// Export the auth instance for use in API routes
export const auth = authConfig;

// Create a cached version of getSession for server components
export const getSession = cache(async () => {
  const incomingHeaders = await headers();

  console.log("🔎 Incoming cookies:", incomingHeaders.get("cookie"));
  console.log("🔎 X-Forwarded-Origin:", incomingHeaders.get("x-forwarded-origin"));
  console.log("🔎 X-Requested-From:", incomingHeaders.get("x-requested-from"));
  console.log("🔎 Host:", incomingHeaders.get("host"));

  return auth.api.getSession({
    headers: incomingHeaders
  }) as Promise<Session | null>;
});

// Export a simple function to get the user session
export async function getUserSession() {
  console.log("Calling getUserSession...");
  const incomingHeaders = await headers();
  console.log("Incoming cookies:", incomingHeaders.get("cookie"));
  const startTime = Date.now();
  
  try {
    const session = await getSession();
    const endTime = Date.now();
    
    console.log(`Session retrieved in ${endTime - startTime}ms`, {
      present: !!session,
      userId: session?.user?.id,
      // Access the activeOrganizationId safely
      activeOrgId: session?.user?.activeOrganizationId,
    });
    
    console.log("Session:", session);
    return session;
  } catch (error) {
    console.error("Error retrieving session:", error);
    return null;
  }
}
