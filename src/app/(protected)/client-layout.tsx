"use client";

import "~/styles/globals.css";
import { Sidebar, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarHeader, SidebarTrigger, SidebarProvider, SidebarRail } from "~/components/ui/sidebar";
import { useAtom } from "jotai";
import { Home } from "lucide-react";
import { TooltipTrigger, TooltipContent } from "~/components/ui/tooltip";
import { Tooltip } from "~/components/ui/tooltip";
import { Small } from "~/components/ui/typography";
import { Badge } from "~/components/ui/badge";
import { sidebarCollapsedAtom } from "./atoms";
import { ProfileMenu } from "~/components/nav-bar/profile-menu";
import { type PropsWithChildren, useEffect } from "react";
import { FEATURE_FLAGS } from "~/constants/app";
import { usePostHog } from "posthog-js/react";
import { useRouter } from "next/navigation";
import { OrganizationProvider } from "~/providers/organization-provider";
import { useSession } from "next-auth/react";
import Navbar from "./_components/navbar";
export function ClientLayout({ 
  children
}: PropsWithChildren) {
  const { data: session } = useSession();
  const posthog = usePostHog();
  const router = useRouter();

  const betaAccessEnabled = posthog.isFeatureEnabled(FEATURE_FLAGS.BetaAccess);

  useEffect(() => {
    if (!betaAccessEnabled) {
      router.push('/wait-list')
    }
  }, [betaAccessEnabled, router])

  if (!betaAccessEnabled) return null;
  
  return (
    <OrganizationProvider userId={session?.user?.id}>
      <div className="flex max-h-screen h-screen">
        <div>
          <Navbar />
        </div>
        <div className="flex flex-col w-full h-full">
          {children}
        </div>
      </div>
    </OrganizationProvider>
  );
}