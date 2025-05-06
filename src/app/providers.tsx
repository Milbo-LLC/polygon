'use client';

import { useSession } from '~/server/auth/client';
import { TooltipProvider } from '~/components/ui/tooltip';
import { TRPCReactProvider } from '~/trpc/react';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { useEffect, Suspense } from 'react';
import { usePostHog } from 'posthog-js/react';
import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { ThemeProvider } from '~/providers/theme-provider';
import { ApiErrorProvider } from '~/providers/api-error-handler';
import { AUTH_REDIRECT_PATH_SIGNED_OUT } from '~/constants/links';

function SessionChecker() {
  const { data: session, isPending } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (isPending) return; // still loading session
    
    console.log("SessionChecker running with pathname:", pathname);
    
    const isLoginPage = pathname === '/login' || pathname === AUTH_REDIRECT_PATH_SIGNED_OUT;
    const isSignupPage = pathname?.startsWith('/signup');
    const isAuthApiRoute = pathname?.startsWith('/api/auth');
    const authRoute = isLoginPage || isSignupPage || isAuthApiRoute;
    
    console.log("Is auth route?", authRoute);

    if (!session && !authRoute) {
      if (pathname !== AUTH_REDIRECT_PATH_SIGNED_OUT) {
        console.log('No session, redirecting to login...');
        router.replace(AUTH_REDIRECT_PATH_SIGNED_OUT);
      }
    }
  }, [session, isPending, pathname, router]);

  return null;
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
  const posthogClient = usePostHog();

  useEffect(() => {
    if (pathname && posthogClient) {
      let url = window.origin + pathname;
      if (searchParams.toString()) {
        url = url + "?" + searchParams.toString();
      }
      posthogClient.capture('$pageview', { '$current_url': url });
    }
  }, [pathname, searchParams, posthogClient]);

  return null;
}

function SuspendedPostHogPageView() {
  return <Suspense fallback={null}><PostHogPageView /></Suspense>;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
      person_profiles: 'identified_only',
      capture_pageview: false,
    });
  }, []);

  return (
    <PHProvider client={posthog}>
      <SuspendedPostHogPageView />
      {children}
    </PHProvider>
  );
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
