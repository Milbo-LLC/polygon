"use client";

import "~/styles/globals.css";
import { type PropsWithChildren, useEffect } from "react";
import { FEATURE_FLAGS } from "~/constants/app";
import { usePostHog } from "posthog-js/react";
import { usePathname, useRouter } from "next/navigation";
import { OrganizationProvider } from "~/providers/organization-provider";
import { useSession } from "next-auth/react";
import Navbar from "./_components/navbar";

// Updated to catch all settings routes
const ROUTES_WITHOUT_NAVBAR = [
  "/settings"
]

export function ClientLayout({ 
  children
}: PropsWithChildren) {
  const { data: session } = useSession();
  const posthog = usePostHog();
  const router = useRouter();
  const pathname = usePathname();

  const betaAccessEnabled = posthog.isFeatureEnabled(FEATURE_FLAGS.BetaAccess);
  
  // Check if current path should have navbar
  const showNavbar = !ROUTES_WITHOUT_NAVBAR.some(route => pathname.startsWith(route));

  useEffect(() => {
    if (!betaAccessEnabled) {
      router.push('/wait-list')
    }
  }, [betaAccessEnabled, router])

  if (!betaAccessEnabled) return null;
  
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