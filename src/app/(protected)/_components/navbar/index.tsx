import { Sidebar, SidebarRail, SidebarProvider } from "~/components/ui/sidebar";
import { useAtom } from "jotai";
import { sidebarCollapsedAtom } from "../../atoms";
import NavbarHeader from "./navbar-header";
import NavbarContent from "./navbar-content";

export default function Navbar() {
  const [sidebarCollapsed, setSidebarCollapsed] = useAtom(sidebarCollapsedAtom);

  
  
  return (
    <SidebarProvider
      open={!sidebarCollapsed}
      onOpenChange={(open) => setSidebarCollapsed(!open)}
    >
      <Sidebar
        collapsible="icon"
      >
        <NavbarHeader />
        <NavbarContent />
        <SidebarRail />
      </Sidebar>
    </SidebarProvider>
  )
}