'use client';

import { useSession } from '~/server/auth/client';
import { TooltipProvider } from '~/components/ui/tooltip';
import { TRPCReactProvider } from '~/trpc/react';
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";
import { usePostHog } from 'posthog-js/react';
import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { ThemeProvider } from '~/providers/theme-provider';
import { ApiErrorProvider } from '~/providers/api-error-handler';
import { AUTH_REDIRECT_PATH_SIGNED_OUT } from '~/constants/links';

const isPREnvironment = (): boolean => {
  if (typeof window !== 'undefined') {
    const host = window.location.host;
    return host.includes('polygon-polygon-pr-') || host.includes('polygon-pr-');
  }
  return false;
};

function SessionChecker() {
  const { data: session, isPending } = useSession();
  const pathname = usePathname();
  const isAuthRoute = pathname?.startsWith('/login') || pathname?.startsWith('/signup');

  useEffect(() => {
    if (!isPending && !session && !isAuthRoute && !isPREnvironment()) {
      console.log('Root provider: No active session detected, redirecting...');
      window.location.href = AUTH_REDIRECT_PATH_SIGNED_OUT;
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
    });
  }, []);

  return (
    <PHProvider client={posthog}>
      <SuspendedPostHogPageView />
      {children}
    </PHProvider>
  );
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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const posthog = usePostHog();

  useEffect(() => {
    if (pathname && posthog) {
      let url = window.origin + pathname;
      if (searchParams.toString()) {
        url = url + "?" + searchParams.toString();
      }
      posthog.capture('$pageview', { '$current_url': url });
    }
  }, [pathname, searchParams, posthog]);

  return null;
}

function SuspendedPostHogPageView() {
  return <Suspense fallback={null}><PostHogPageView /></Suspense>;
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
