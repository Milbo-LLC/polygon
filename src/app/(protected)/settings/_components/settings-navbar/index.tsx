import { Sidebar, SidebarProvider } from "~/components/ui/sidebar";
import NavbarHeader from "./settings-navbar-header";
import NavbarContent from "./settings-navbar-content";

export default function Navbar() {
  return (
    <SidebarProvider>
      <Sidebar>
        <NavbarHeader />
        <NavbarContent />
      </Sidebar>
    </SidebarProvider>
  );
}