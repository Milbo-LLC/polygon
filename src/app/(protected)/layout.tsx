import { redirect } from "next/navigation";
import { getUserSession } from "~/lib/auth";
import { ClientLayout } from "./client-layout";
import { AUTH_REDIRECT_PATH_SIGNED_OUT } from "~/constants/links";
import { type PropsWithChildren } from "react";

export const metadata = {
  title: "Polygon",
  description: "Polygon is an AI-first collaborative web-based CAD tool",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default async function ProtectedLayout({children}: PropsWithChildren) {
  
  const session = await getUserSession();

  if (!session) {
    redirect(AUTH_REDIRECT_PATH_SIGNED_OUT);
  }
  
  return <ClientLayout>{children}</ClientLayout>;
}