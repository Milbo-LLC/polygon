"use client";

import { type PropsWithChildren } from "react";
import SettingsNavbar from "./_components/settings-navbar";

export default function SettingsLayout({ children }: PropsWithChildren) {
  return (
    <div className="flex h-full w-full">
      <div>
        <SettingsNavbar />
      </div>
      <div className="flex flex-col w-full h-full overflow-auto">
        {children}
      </div>
    </div>
  );
}