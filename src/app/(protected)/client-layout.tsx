"use client";

import "~/styles/globals.css";
import { Sidebar, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarHeader, SidebarTrigger, SidebarProvider, SidebarRail } from "~/components/ui/sidebar";
import { useAtom } from "jotai";
import { Home } from "lucide-react";
import { TooltipTrigger, TooltipContent } from "~/components/ui/tooltip";
import { Tooltip } from "~/components/ui/tooltip";
import { Small } from "~/components/ui/typography";
import { Badge } from "~/components/ui/badge";
import { sidebarCollapsedAtom } from "./_atoms";
import { ProfileMenu } from "~/components/nav-bar/profile-menu";
import { PropsWithChildren, useEffect } from "react";
import { FEATURE_FLAGS } from "~/constants/app";
import { usePostHog } from "posthog-js/react";
import { useRouter } from "next/navigation";


export function ClientLayout({ 
  children
}: PropsWithChildren) {
  const [sidebarCollapsed, setSidebarCollapsed] = useAtom(sidebarCollapsedAtom);
  const posthog = usePostHog();
  const router = useRouter();

  const items = [
    {
      title: "Home",
      url: "/projects",
      icon: Home,
    },
  ]

  const betaAccessEnabled = posthog.isFeatureEnabled(FEATURE_FLAGS.BetaAccess);

  useEffect(() => {
    if (!betaAccessEnabled) {
      router.push('/wait-list')
    }
  }, [betaAccessEnabled, router])

  if (!betaAccessEnabled) return null;
  
  return (
    <div className="flex max-h-screen h-screen">
      <div>
        <SidebarProvider 
          open={!sidebarCollapsed}
          onOpenChange={(open) => setSidebarCollapsed(!open)}
        >
          <Sidebar
            collapsible="icon"
          >
            
            <SidebarHeader className="flex flex-row border-b items-center justify-between">
                
              {!sidebarCollapsed && 
                <div className="flex items-center gap-2">
                  <ProfileMenu />
                </div>
              }
              <Tooltip>
                <TooltipTrigger asChild>
                  <SidebarTrigger />
                </TooltipTrigger>
                <TooltipContent>
                  <div className="flex gap-2">
                    {
                      sidebarCollapsed ? (
                        <Small>Expand sidebar</Small>
                      ) : (
                        <Small>Collapse sidebar</Small>
                      )
                    }
                    <Badge variant="outline" className="px-1">⌘ .</Badge>
                  </div>
                </TooltipContent>
              </Tooltip>
            </SidebarHeader>
            <SidebarMenu className="flex flex-col gap-2 p-1.5">
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
            <SidebarRail />
          </Sidebar>
        </SidebarProvider>
      </div>
      <div className="flex flex-col w-full h-full">
        {children}
      </div>
    </div>
  );
}