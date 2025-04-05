import { HomeIcon } from "lucide-react";
import { SidebarMenu, SidebarMenuItem } from "~/components/ui/sidebar";
import { SidebarMenuButton } from "~/components/ui/sidebar";

export default function NavbarContent() {
  const items = [
    {
      title: "Home",
      url: "/projects",
      icon: HomeIcon,
    },
  ]
  
  return (
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
  );
}