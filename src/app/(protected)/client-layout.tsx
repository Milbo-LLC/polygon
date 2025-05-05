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
import { useApiErrorHandler } from "~/providers/api-error-handler";

// Helper to check if in PR environment
const isPREnvironment = (): boolean => {
  if (typeof window !== 'undefined') {
    const host = window.location.host;
    return host.includes('polygon-polygon-pr-') || host.includes('polygon-pr-');
  }
  return false;
};

// Helper to get full auth URL for redirects
const getAuthRedirectUrl = (path: string, params?: Record<string, string>): string => {
  let redirectUrl = path;
  
  // Add any params
  if (params && Object.keys(params).length > 0) {
    redirectUrl += `?${new URLSearchParams(params).toString()}`;
  }
  
  return redirectUrl;
};

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
  const { handleError } = useApiErrorHandler();
  
  // Check session and redirect if needed
  useEffect(() => {
    if (isPending) {
      setIsLoading(true);
      return;
    }
    
    // Check if current path should have navbar
    const showNavbar = !ROUTES_WITHOUT_NAVBAR.some(route => pathname.startsWith(route));
    setShouldShowNavbar(showNavbar);
    
    // Get invitation code if any
    const invitationCode = searchParams.get('code');
    const isInvitationPage = pathname.startsWith('/invitations');
    
    // Check beta access
    const betaAccessEnabled = posthog.isFeatureEnabled(FEATURE_FLAGS.BetaAccess);
    
    // Handle authentication redirects
    if (!session) {
      // Prepare redirect parameters
      const redirectParams: Record<string, string> = {};
      
      if (invitationCode) {
        redirectParams.callbackUrl = `/invitations?code=${invitationCode}`;
      }
      
      // Build the redirect URL
      const redirectUrl = getAuthRedirectUrl(AUTH_REDIRECT_PATH_SIGNED_OUT, redirectParams);
      
      // Redirect immediately
      window.location.href = redirectUrl;
      return;
    }
    
    // Handle beta access check for authenticated users
    if (!betaAccessEnabled && !(isInvitationPage && !!invitationCode)) {
      router.push('/wait-list');
      return;
    }
    
    // Set user ID and organization ID
    const user = session.user as SessionUser | undefined;
    if (user?.id) {
      setUserId(user.id);
    } else {
      handleError(new Error("Authentication error: No user ID found"));
      
      // Build the redirect URL
      const redirectUrl = getAuthRedirectUrl(AUTH_REDIRECT_PATH_SIGNED_OUT);
      
      window.location.href = redirectUrl;
      return;
    }
    
    // Only stop loading if we have a valid user and no redirects are needed
    setIsLoading(false);
  }, [session, isPending, pathname, searchParams, router, posthog, handleError]);

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