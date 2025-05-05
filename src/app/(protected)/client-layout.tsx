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
  // For PR environments, we need to construct the right URL to the staging auth server
  if (isPREnvironment()) {
    // Get the PR environment origin for the callback
    const prOrigin = typeof window !== 'undefined' ? window.location.origin : '';
    
    // Base redirect path
    let redirectUrl = path;
    
    // Add callback URL parameter if needed
    if (params?.callbackUrl) {
      // Ensure the callback URL is absolute with the PR origin
      const callbackUrl = params.callbackUrl.startsWith('http') 
        ? params.callbackUrl 
        : `${prOrigin}${params.callbackUrl.startsWith('/') ? '' : '/'}${params.callbackUrl}`;
      
      redirectUrl += `?callbackUrl=${encodeURIComponent(callbackUrl)}`;
      
      // Remove from params since we've handled it
      const { callbackUrl: _callbackUrl, ...restParams } = params;
      params = restParams;
    }
    
    // Add any remaining params
    if (params && Object.keys(params).length > 0) {
      const separator = redirectUrl.includes('?') ? '&' : '?';
      redirectUrl += separator + new URLSearchParams(params).toString();
    }
    
    console.log(`PR environment redirect to: ${redirectUrl}`);
    return redirectUrl;
  }
  
  // For non-PR environments, just return the path with params if any
  if (params && Object.keys(params).length > 0) {
    return `${path}?${new URLSearchParams(params).toString()}`;
  }
  
  return path;
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
  
  // Immediately check for session on client-side to avoid any delay
  useEffect(() => {
    if (!isPending && !session) {
      console.log('No active session detected, redirecting immediately');
      
      // Get invitation code if present for the redirect
      const invitationCode = searchParams.get('code');
      const redirectParams: Record<string, string> = {};
      
      if (invitationCode) {
        redirectParams.callbackUrl = `/invitations?code=${invitationCode}`;
      }
      
      // Build the redirect URL
      const redirectUrl = getAuthRedirectUrl(AUTH_REDIRECT_PATH_SIGNED_OUT, redirectParams);
      
      // Use direct window location for more immediate redirect
      window.location.href = redirectUrl;
      return;
    }
  }, [session, isPending, searchParams]);
  
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
      console.log('No active session, redirecting to login page');
      
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
      console.log('Setting user ID and organization ID', user.id, user.activeOrganizationId);
      setUserId(user.id);
    } else {
      console.log('No user ID found in session, redirecting to login');
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