import { ClientLayout } from "./client-layout";

export const metadata = {
  title: "Polygon",
  description: "Polygon is an AI-first collaborative web-based CAD tool",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ClientLayout>{children}</ClientLayout>;
}