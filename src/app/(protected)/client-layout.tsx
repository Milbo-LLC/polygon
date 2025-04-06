"use client";

import "~/styles/globals.css";
import { type PropsWithChildren, useEffect } from "react";
import { FEATURE_FLAGS } from "~/constants/app";
import { usePostHog } from "posthog-js/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { OrganizationProvider } from "~/providers/organization-provider";
import { useSession } from "next-auth/react";
import Navbar from "./_components/navbar";
import { AUTH_REDIRECT_PATH_SIGNED_OUT } from "~/constants/links";

// Updated to catch all settings routes
const ROUTES_WITHOUT_NAVBAR = [
  "/settings",
  "/workspaces"
]

export function ClientLayout({ 
  children
}: PropsWithChildren) {
  const { data: session, status } = useSession();
  const posthog = usePostHog();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // Get code from URL
  const invitationCode = searchParams.get('code');
  
  const betaAccessEnabled = posthog.isFeatureEnabled(FEATURE_FLAGS.BetaAccess);
  
  // Check if current path should have navbar
  const showNavbar = !ROUTES_WITHOUT_NAVBAR.some(route => pathname.startsWith(route));
  
  // Check if we're on the invitations page with a valid code
  const isInvitationPage = pathname.startsWith('/invitations');

  // Handle authentication/redirect logic
  useEffect(() => {
    if (status !== 'loading' && !session) {
      // Store the current URL (with invitation code) for after login
      if (invitationCode) {
        const callbackUrl = `/invitations?code=${invitationCode}`;
        router.push(`${AUTH_REDIRECT_PATH_SIGNED_OUT}?callbackUrl=${encodeURIComponent(callbackUrl)}`);
      } else {
        router.push(AUTH_REDIRECT_PATH_SIGNED_OUT);
      }
    }
  }, [session, status, router, invitationCode]);
  
  // Handle beta access check
  useEffect(() => {
    // Skip the beta access check and redirect for invitation pages with codes
    if (!betaAccessEnabled && !(isInvitationPage && !!invitationCode)) {
      router.push('/wait-list')
    }
  }, [betaAccessEnabled, router, isInvitationPage, invitationCode])

  // Don't render anything during beta check, except for invitation pages with codes
  if (!betaAccessEnabled && !(isInvitationPage && !!invitationCode)) return null;
  
  return (
    <OrganizationProvider userId={session?.user?.id}>
      <div className="flex max-h-screen h-screen">
        {showNavbar && (
          <div>
            <Navbar />
          </div>
        )}
        <div className="flex flex-col w-full h-full">
          {children}
        </div>
      </div>
    </OrganizationProvider>
  );
}