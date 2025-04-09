import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";
import { SidebarTrigger } from "~/components/ui/sidebar";
import { P, Small } from "~/components/ui/typography";
import { SidebarHeader } from "~/components/ui/sidebar";
import { Badge } from "~/components/ui/badge";
import { useAtomValue } from "jotai";
import { sidebarCollapsedAtom } from "../../atoms";
import { useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar';
import { 
  LogOutIcon, 
  UserIcon, 
  PlusIcon, 
  Building2Icon,
  CheckIcon 
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import { useOrganizationContext } from "~/providers/organization-provider";
import { useMemo } from 'react';
import { getGradientFromId } from "~/lib/utils";
import Image from "next/image";

// Define menu items structure for better maintainability
type MenuItem = {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
};

export default function NavbarHeader() {
  const { organization, organizations, handleOrgSwitch } = useOrganizationContext();
  const sidebarCollapsed = useAtomValue(sidebarCollapsedAtom);
  const router = useRouter();
  const { data } = useSession();
  const user = data?.user;
  
  // Create workspace items dynamically from user organizations
  const workspaceItems = useMemo(() => {
    return organizations?.map(org => ({
      id: org.organization?.id,
      name: org.organization?.name,
      logoUrl: org.organization?.logoUrl,
      role: org.role,
      isActive: org.organization?.id === organization?.id
    })) ?? [];
  }, [organizations, organization?.id]);
  
  // Define menu options in a structured way for easier maintenance
  const menuOptions: Record<string, MenuItem[]> = {
    workspaces: [
      {
        label: "New Workspace",
        icon: <PlusIcon className="mr-2 size-4 text-primary" />,
        onClick: () => router.push('/workspaces/new'),
      },
    ],
    settings: [
      {
        label: "Account Settings",
        icon: <UserIcon className="mr-2 size-4 text-primary" />,
        onClick: () => router.push('/settings/account'),
      },
      {
        label: "Workspace Settings",
        icon: <Building2Icon className="mr-2 size-4 text-primary" />,
        onClick: () => router.push('/settings/workspace'),
        disabled: !organization,
      },
    ],
    account: [
      {
        label: "Sign Out",
        icon: <LogOutIcon className="mr-2 size-4 text-primary" />,
        onClick: () => {
          void (async () => {
            await signOut();
            router.push('/login');
          })();
        },
      },
    ],
  };
  
  return (
    <div className="relative">
      {/* The main dropdown for the entire header */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarHeader className="flex flex-row border-b items-center justify-between cursor-pointer hover:bg-accent/10 px-2.5">
            {!sidebarCollapsed &&
              <div className="flex gap-2 items-center">
                <div
                  style={{
                    background: organization?.logoUrl ? 'transparent' : getGradientFromId(organization?.id ?? ''),
                  }}
                  className="relative size-6 rounded"
                >
                  {organization?.logoUrl && (
                    <Image
                      src={organization?.logoUrl}
                      alt={`${organization?.name ?? 'Organization'} logo`}
                      className="size-full object-cover rounded"
                      fill
                    />
                  )}
                </div>
                <P>{organization?.name}</P>
              </div>
            }
            {/* Empty div to maintain spacing where the trigger would be */}
            <div className="w-8 h-8"></div>
          </SidebarHeader>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="start" className="w-72 mx-1">
          <div className="px-2 py-1.5 text-sm flex items-center gap-2">
            <div
              style={{
                background: user?.image ? 'transparent' : getGradientFromId(user?.id ?? ''),
              }}
              className="relative size-6 rounded-full"
            >
              {user?.image && (
                <Image
                  src={user?.image ?? ''}
                  alt={`${user?.name ?? 'User'} avatar`}
                  className="size-full object-cover rounded-full"
                  fill
                />
              )}
            </div>
            <div className="font-medium">{user?.email}</div>
          </div>
          
          <DropdownMenuSeparator />
          
          {/* Workspaces Section */}
          <DropdownMenuGroup>
            <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
            

            {workspaceItems.length > 0 ? (
              <>
                {workspaceItems.map((workspace) => (
                  <DropdownMenuItem 
                    key={workspace.id} 
                    onClick={async () => await handleOrgSwitch(workspace.id ?? '')}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        style={{
                          background: workspace?.logoUrl ? 'transparent' : getGradientFromId(workspace?.id ?? ''),
                        }}
                        className="relative size-5 rounded"
                      >
                        {workspace?.logoUrl && (
                          <Image
                            src={workspace?.logoUrl}
                            alt={`${workspace?.name ?? 'Workspace'} logo`}
                            className="size-full object-cover rounded"
                            fill
                          />
                        )}
                      </div>
                      <span>{workspace.name}</span>
                    </div>
                    {workspace.isActive && <CheckIcon className="size-4 text-primary" />}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
              </>
            ) : null}
            
            {/* New Workspace button */}
            {menuOptions.workspaces?.map((item) => (
              <DropdownMenuItem 
                key={item.label} 
                onClick={item.onClick}
                disabled={item.disabled}
              >
                {item.icon}
                {item.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
          
          <DropdownMenuSeparator />
          
          {/* Settings Section */}
          <DropdownMenuGroup>
            <DropdownMenuLabel>Settings</DropdownMenuLabel>
            {menuOptions.settings?.map((item) => (
              <DropdownMenuItem 
                key={item.label} 
                onClick={item.onClick}
                disabled={item.disabled}
              >
                {item.icon}
                {item.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
          
          <DropdownMenuSeparator />
          
          {/* Account Section */}
          {menuOptions.account?.map((item) => (
            <DropdownMenuItem 
              key={item.label} 
              onClick={item.onClick}
              disabled={item.disabled}
            >
              {item.icon}
              {item.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      
      {/* Absolutely positioned trigger that sits on top of the dropdown trigger */}
      <div className="absolute top-2.5 right-2.5" onClick={(e) => e.stopPropagation()}>
        <Tooltip>
          <TooltipTrigger asChild>
            <SidebarTrigger />
          </TooltipTrigger>
          <TooltipContent side="right">
            <div className="flex gap-2">
              {sidebarCollapsed ? (
                <Small>Expand sidebar</Small>
              ) : (
                <Small>Collapse sidebar</Small>
              )}
              <Badge variant="outline" className="px-1">⌘ .</Badge>
            </div>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}