import { redirect } from "next/navigation";
import { ClientLayout } from "./client-layout";
import { AUTH_REDIRECT_PATH_SIGNED_OUT } from "~/constants/links";
import { type PropsWithChildren } from "react";
import { headers } from "next/headers";
import { getUserSession } from "~/lib/auth";

export const metadata = {
  title: "Polygon",
  description: "Polygon is an AI-first collaborative web-based CAD tool",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default async function ProtectedLayout({children}: PropsWithChildren) {
  const session = await getUserSession();
  
  // Get the current URL to check if it's an invitation page with a code
  const headersList = await headers();
  const url = headersList.get('x-url') || headersList.get('referer') || '';
  const isInvitationPage = url.includes('/invitations');
  const hasInvitationCode = url.includes('code=');

  // Allow access to invitation page with code even without authentication
  if (!session && !(isInvitationPage && hasInvitationCode)) {
    redirect(AUTH_REDIRECT_PATH_SIGNED_OUT);
  }
  
  return <ClientLayout>{children}</ClientLayout>;
}