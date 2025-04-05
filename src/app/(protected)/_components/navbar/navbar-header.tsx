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
                <Avatar className="size-6" variant="squared">
                  <AvatarImage src={organization?.logoUrl ?? ''} alt="Organization logo" />
                  <AvatarFallback>
                    <UserIcon className="size-4" />
                  </AvatarFallback>
                </Avatar>
                <P>{organization?.name}</P>
              </div>
            }
            {/* Empty div to maintain spacing where the trigger would be */}
            <div className="w-8 h-8"></div>
          </SidebarHeader>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="start" className="w-72 mx-1">
          <div className="px-2 py-1.5 text-sm flex items-center gap-2">
            <Avatar className="size-6">
              <AvatarImage src={user?.image ?? ''} alt="User avatar" />
              <AvatarFallback>
                {user?.name?.substring(0, 2).toUpperCase() ?? user?.email?.substring(0, 2).toUpperCase() ?? 'U'}
              </AvatarFallback>
            </Avatar>
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
                    <div className="flex items-center">
                      <Avatar className="mr-2 size-5" variant="squared">
                        <AvatarImage src={workspace.logoUrl ?? ''} alt={`${workspace.name} logo`} />
                        <AvatarFallback className="text-xs">
                          {workspace.name?.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
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