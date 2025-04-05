import { 
  UserIcon, 
  BrushIcon, 
  Settings2Icon, 
  UsersIcon,
} from "lucide-react";
import { SidebarMenu, SidebarMenuItem, SidebarGroupLabel } from "~/components/ui/sidebar";
import { SidebarMenuButton } from "~/components/ui/sidebar";
import { useRouter, usePathname } from "next/navigation";
import { useOrganizationContext } from "~/providers/organization-provider";
import { Muted, Tiny } from "~/components/ui/typography";
import { cn } from "~/lib/utils";

type MenuItem = {
  label: string;
  icon: React.ReactNode;
  path: string;
  disabled?: boolean;
};

type Section = {
  id: string;
  label: string;
  items: MenuItem[];
  requiresOrg?: boolean;
};

export default function SettingsNavbarContent() {
  const router = useRouter();
  const pathname = usePathname();
  const { organization } = useOrganizationContext();
  
  const sections: Section[] = [
    {
      id: 'account',
      label: 'Account',
      items: [
        {
          label: "Profile",
          icon: <UserIcon className="size-4" />,
          path: '/settings/account',
        },
        {
          label: "Appearance",
          icon: <BrushIcon className="size-4" />,
          path: '/settings/appearance',
        },
      ]
    },
    {
      id: 'workspace',
      label: 'Workspace',
      requiresOrg: true,
      items: [
        {
          label: "General",
          icon: <Settings2Icon className="size-4" />,
          path: '/settings/workspace',
          disabled: !organization,
        },
        {
          label: "Members",
          icon: <UsersIcon className="size-4" />,
          path: '/settings/members',
          disabled: !organization,
        },
      ]
    },
  ];
  
  // Handle navigation
  const navigateTo = (path: string) => {
    router.push(path);
  };
  
  return (
    <SidebarMenu className="flex flex-col p-2">
      {sections.map((section) => {
        if (section.requiresOrg && !organization) {
          return null;
        }
        
        return (
          <div key={section.id} className="flex flex-col">
            <SidebarGroupLabel className="uppercase">
              <Muted>
                <Tiny>{section.label}</Tiny>
              </Muted>
            </SidebarGroupLabel>
            <div className="flex flex-col">
              {section.items.map((item) => {
                const isActive = pathname === item.path;
                return (
                  <SidebarMenuItem key={item.label}>
                    <SidebarMenuButton 
                      onClick={() => navigateTo(item.path)}
                      disabled={item.disabled}
                      isActive={isActive}
                    >
                      <div className="flex flex-row items-center gap-2">
                        <div className={cn(isActive ? "text-primary" : "text-muted-foreground")}>
                          {item.icon}
                        </div>
                        <span>{item.label}</span>
                      </div>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </div>
          </div>
        );
      })}
    </SidebarMenu>
  );
}

