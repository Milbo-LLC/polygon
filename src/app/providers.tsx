'use client';

import { useSession } from '~/server/auth/client';
import { TooltipProvider } from '~/components/ui/tooltip';
import { TRPCReactProvider } from '~/trpc/react';

import { usePathname, useSearchParams } from "next/navigation"
import { useEffect, Suspense } from "react"
import { usePostHog } from 'posthog-js/react'
import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { ThemeProvider } from '~/providers/theme-provider';
import { ApiErrorProvider } from '~/providers/api-error-handler';
import { AUTH_REDIRECT_PATH_SIGNED_OUT } from '~/constants/links';

// Helper to check if in PR environment
const isPREnvironment = (): boolean => {
  if (typeof window !== 'undefined') {
    const host = window.location.host;
    return host.includes('polygon-polygon-pr-') || host.includes('polygon-pr-');
  }
  return false;
};

// Helper to get the auth redirect URL for the current environment
const getAuthRedirectUrl = (): string => {
  // Base redirect URL
  const baseUrl = AUTH_REDIRECT_PATH_SIGNED_OUT;
  
  // For PR environments, we need to add the callback URL parameter to return to the PR environment
  if (isPREnvironment() && typeof window !== 'undefined') {
    // Get the current PR environment URL as the callback
    const prOrigin = window.location.origin;
    const callbackUrl = encodeURIComponent(`${prOrigin}/projects`);
    
    // Add it to the redirect URL
    return `${baseUrl}?callbackUrl=${callbackUrl}`;
  }
  
  return baseUrl;
};

function SessionChecker() {
  const { data: session, isPending } = useSession();
  const pathname = usePathname();
  
  // Skip check for auth routes
  const isAuthRoute = pathname?.startsWith('/login') || pathname?.startsWith('/signup');
  
  useEffect(() => {
    if (!isPending && !session && !isAuthRoute) {
      console.log('Root provider: No active session detected, redirecting immediately');
      
      // Get the appropriate redirect URL for the current environment
      const redirectUrl = getAuthRedirectUrl();
      
      window.location.href = redirectUrl;
    }
  }, [session, isPending, isAuthRoute]);
  
  return null;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
      person_profiles: 'identified_only',
      capture_pageview: false
    })
  }, [])

  return (
    <PHProvider client={posthog}>
      <SuspendedPostHogPageView />
      {children}
    </PHProvider>
  )
}

function PostHogIdentifier() {
  const { data: session } = useSession();

  useEffect(() => {
    if (session?.user?.email) {
      posthog.identify(session.user.email, {
        name: session.user.name,
        email: session.user.email,
      });
    }
  }, [session?.user?.email, session?.user?.name]);

  return null;
}

function PostHogPageView() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const posthog = usePostHog()

  useEffect(() => {
    if (pathname && posthog) {
      let url = window.origin + pathname
      if (searchParams.toString()) {
        url = url + "?" + searchParams.toString();
      }

      posthog.capture('$pageview', { '$current_url': url })
    }
  }, [pathname, searchParams, posthog])

  return null
}

function SuspendedPostHogPageView() {
  return (
    <Suspense fallback={null}>
      <PostHogPageView />
    </Suspense>
  )
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TRPCReactProvider>
      <ApiErrorProvider>
        <SessionChecker />
        <PostHogProvider>
          <PostHogIdentifier />
          <ThemeProvider>
            <TooltipProvider>{children}</TooltipProvider>
          </ThemeProvider>
        </PostHogProvider>
      </ApiErrorProvider>
    </TRPCReactProvider>
  );
}
