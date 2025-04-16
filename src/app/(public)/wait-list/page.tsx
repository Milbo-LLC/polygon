'use client';

import { Button } from "~/components/ui/button";
import { H3, P } from "~/components/ui/typography";
import { useSession } from 'next-auth/react';
import { AUTH_REDIRECT_PATH_SIGN_UP } from "~/constants/links";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardContent } from "~/components/ui/card";
import { usePostHog } from "posthog-js/react";
import { FEATURE_FLAGS } from "~/constants/app";
import { useEffect } from "react";
import WaitListScene from "./components/waitlist-scene";
import { useHandleSignout } from "~/hooks/use-handle-signout";

export default function WaitListPage() {
  const router = useRouter();
  const posthog = usePostHog();

  const { handleSignout } = useHandleSignout();

  const { data: session, status } = useSession();
  const betaAccessEnabled = posthog.isFeatureEnabled(FEATURE_FLAGS.BetaAccess);

  useEffect(() => {
    if (betaAccessEnabled) {
      router.push('/projects')
    }
  }, [betaAccessEnabled, router])

  const handleSignUp = () => {
    router.push(AUTH_REDIRECT_PATH_SIGN_UP);
  };

  if (status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center h-screen w-screen">
        <P>Loading...</P>
      </div>
    );
  }

  if (session) {
    return (
      <div className="flex flex-col p-4 gap-4 items-center justify-center h-screen w-screen">
        <WaitListScene />
        <H3>You have been added to the wait list</H3>
        <P className="text-sm text-muted-foreground">
          We&apos;ll notify you when you have access to the app.
        </P>
        <Button onClick={handleSignout}>Logout</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen w-screen">
      <Card className="w-full max-w-md">
        <CardHeader>
          <H3>Join the wait list</H3>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <P className="text-sm text-muted-foreground">
            We are currently in beta and giving limited access to the app. Sign up to join the wait list, and we&apos;ll notify you when you have access.
          </P>
          <div className="flex w-full justify-center">
            <Button onClick={handleSignUp}>Sign up</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}