'use client';

import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import { LogOutIcon, UserIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useSession } from 'next-auth/react';

export const ProfileMenu = () => {
  const router = useRouter();

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
  };

  const { data } = useSession();
  const user = data?.user;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar className="cursor-pointer hover:opacity-80 size-6">
          <AvatarImage src={user?.image ?? ''} alt="User avatar" />
          <AvatarFallback>
            <UserIcon className="size-4" />
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[182px]">
        <div className="px-2 py-1.5 text-sm">
          <div className="font-medium">{user?.email}</div>
        </div>
        <div>
          {/* {PROFILE_MENU_LINKS.map((item) => (
            <DropdownMenuItem
              key={item.label}
              onClick={() => router.push(item.route)}
              className={
                item.route && pathname === item.route ? 'bg-accent' : ''
              }
            >
              {item.icon}
              {item.label}
            </DropdownMenuItem>
          ))} */}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOutIcon className="mr-2 size-4 text-primary" />
          sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
