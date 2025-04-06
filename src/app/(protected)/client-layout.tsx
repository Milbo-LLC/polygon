"use client";

import "~/styles/globals.css";
import { type PropsWithChildren, useEffect } from "react";
import { FEATURE_FLAGS } from "~/constants/app";
import { usePostHog } from "posthog-js/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { OrganizationProvider } from "~/providers/organization-provider";
import { useSession } from "next-auth/react";
import Navbar from "./_components/navbar";
import { useAtomValue } from 'jotai';
import { pendingInvitationCodeAtom } from './atoms';

// Updated to catch all settings routes
const ROUTES_WITHOUT_NAVBAR = [
  "/settings",
  "/workspaces"
]

export function ClientLayout({ 
  children
}: PropsWithChildren) {
  const { data: session } = useSession();
  const posthog = usePostHog();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pendingInvitationCode = useAtomValue(pendingInvitationCodeAtom);
  
  // Get code from URL
  const invitationCode = searchParams.get('code');
  
  const betaAccessEnabled = posthog.isFeatureEnabled(FEATURE_FLAGS.BetaAccess);
  
  // Check if current path should have navbar
  const showNavbar = !ROUTES_WITHOUT_NAVBAR.some(route => pathname.startsWith(route));
  
  // Check if we're on the invitations page with a valid code
  const isInvitationPage = pathname.startsWith('/invitations');
  const hasInvitationCode = !!invitationCode || !!pendingInvitationCode;

  useEffect(() => {
    // Skip the beta access check and redirect for invitation pages with codes
    if (!betaAccessEnabled && !(isInvitationPage && hasInvitationCode)) {
      router.push('/wait-list')
    }
  }, [betaAccessEnabled, router, isInvitationPage, hasInvitationCode])

  // Don't render anything during beta check, except for invitation pages with codes
  if (!betaAccessEnabled && !(isInvitationPage && hasInvitationCode)) return null;
  
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