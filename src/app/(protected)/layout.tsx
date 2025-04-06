import { redirect } from "next/navigation";
import { ClientLayout } from "./client-layout";
import { AUTH_REDIRECT_PATH_SIGNED_OUT } from "~/constants/links";
import { getUserSession } from "~/lib/auth";

export const metadata = {
  title: "Polygon",
  description: "Polygon is an AI-first collaborative web-based CAD tool",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default async function ProtectedLayout({
  children,
  searchParams,
}: {
  children: React.ReactNode;
  searchParams?: Record<string, string | string[]>;
}) {
  const session = await getUserSession();
  
  // If the user is not authenticated
  if (!session) {
    // Check if there's an invitation code in the URL
    const invitationCode = searchParams?.code;
    
    if (invitationCode) {
      // Get the code value (handles both string and array cases)
      const code = typeof invitationCode === 'string' 
        ? invitationCode 
        : Array.isArray(invitationCode) ? invitationCode[0] : '';
      
      if (code) {
        // Include the invitation code in the callback URL
        const callbackUrl = `/invitations?code=${code}`;
        redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
      }
    }
    
    // Default redirect for unauthenticated users
    redirect(AUTH_REDIRECT_PATH_SIGNED_OUT);
  }
  
  return <ClientLayout>{children}</ClientLayout>;
}