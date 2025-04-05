import { Large } from "~/components/ui/typography";
import { SidebarHeader } from "~/components/ui/sidebar";
import { useRouter } from 'next/navigation';
import {
  ArrowLeftIcon,
} from 'lucide-react';


const SettingsNavbarHeader = () => {
  const router = useRouter();
  
  return (
    <SidebarHeader className="border-b">
      <div className="flex flex-row items-center gap-2">
        <ArrowLeftIcon onClick={() => router.push('/')} className="size-4 cursor-pointer" />
        <Large>Settings</Large>
      </div>
    </SidebarHeader>
  );
};

export default SettingsNavbarHeader;