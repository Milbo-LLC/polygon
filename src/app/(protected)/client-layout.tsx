"use client";

import "~/styles/globals.css";
import { type PropsWithChildren, Suspense, useEffect, useState } from "react";
import { FEATURE_FLAGS } from "~/constants/app";
import { usePostHog } from "posthog-js/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { OrganizationProvider } from "~/providers/organization-provider";
import { useSession } from "~/server/auth/client";
import Navbar from "./_components/navbar";
import { AUTH_REDIRECT_PATH_SIGNED_OUT } from "~/constants/links";
import { type SessionUser } from "~/types/auth";

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
  
  const { data: session, isPending } = useSession();
  const posthog = usePostHog();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
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
    if (!isPending) {
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
        const user = session.user as SessionUser | undefined;
        if (user?.id) {
          console.log('Setting user ID and organization ID', user.id, user.activeOrganizationId);
          setUserId(user.id);
        }
        
        // We're done loading
        setIsLoading(false);
      }
    }
  }, [session, isPending, pathname, searchParams, router, posthog ]);

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