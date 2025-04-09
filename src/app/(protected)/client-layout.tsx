"use client";

import "~/styles/globals.css";
import { type PropsWithChildren, Suspense, useEffect, useState } from "react";
import { FEATURE_FLAGS } from "~/constants/app";
import { usePostHog } from "posthog-js/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { OrganizationProvider } from "~/providers/organization-provider";
import { useSession } from "next-auth/react";
import Navbar from "./_components/navbar";
import { AUTH_REDIRECT_PATH_SIGNED_OUT } from "~/constants/links";
import { useSetAtom } from "jotai";
import { activeOrganizationIdAtom } from "~/app/(protected)/atoms";

// Updated to catch all settings routes
const ROUTES_WITHOUT_NAVBAR = [
  "/settings",
  "/workspaces"
];

function ClientLayoutContent({ children }: PropsWithChildren) {
  // State to control what's rendered
  const [isLoading, setIsLoading] = useState(true);
  const [shouldShowNavbar, setShouldShowNavbar] = useState(false);
  const [userId, setUserId] = useState<string | undefined>(undefined);
  
  const { data: session, status } = useSession();
  const posthog = usePostHog();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const setActiveOrganizationId = useSetAtom(activeOrganizationIdAtom);
  
  // Do all checks in useEffect to avoid hydration mismatch
  useEffect(() => {
    // Check if current path should have navbar
    const showNavbar = !ROUTES_WITHOUT_NAVBAR.some(route => pathname.startsWith(route));
    setShouldShowNavbar(showNavbar);
    
    // Get invitation code if any
    const invitationCode = searchParams.get('code');
    const isInvitationPage = pathname.startsWith('/invitations');
    
    // Check beta access
    const betaAccessEnabled = posthog.isFeatureEnabled(FEATURE_FLAGS.BetaAccess);
    
    // Handle authentication redirects
    if (status !== 'loading') {
      if (!session) {
        // Redirect unauthenticated users
        if (invitationCode) {
          const callbackUrl = `/invitations?code=${invitationCode}`;
          router.push(`${AUTH_REDIRECT_PATH_SIGNED_OUT}?callbackUrl=${encodeURIComponent(callbackUrl)}`);
        } else {
          router.push(AUTH_REDIRECT_PATH_SIGNED_OUT);
        }
      } else {
        // Handle beta access check for authenticated users
        if (!betaAccessEnabled && !(isInvitationPage && !!invitationCode)) {
          router.push('/wait-list');
        }
        
        // Set user ID and organization ID
        if (session.user?.id) {
          setUserId(session.user.id);
          
          // Get the first organization from the session if available
          const firstOrgId = session.user.organizations?.[0]?.id;
          
          // Set organization ID only if not already set
          setActiveOrganizationId((currentOrgId) => {
            if (currentOrgId) return currentOrgId;
            return firstOrgId || session.user.id;
          });
        }
        
        // We're done loading
        setIsLoading(false);
      }
    }
  }, [session, status, pathname, searchParams, router, posthog, setActiveOrganizationId]);

  // Always render the same initial structure for both server and client
  // Only change what's shown based on state that's updated in useEffect
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen w-full">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <OrganizationProvider userId={userId}>
      <div className="flex max-h-screen h-screen">
        {shouldShowNavbar && (
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

export function ClientLayout({ children }: PropsWithChildren) {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen w-full">
        <p>Loading...</p>
      </div>
    }>
      <ClientLayoutContent>
        {children}
      </ClientLayoutContent>
    </Suspense>
  );
}