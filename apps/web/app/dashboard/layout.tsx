import { auth } from "@/auth";
import DashboardLayoutClient from "./dashboard-layout-client";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const isAdmin = (session?.user as any)?.role === "admin";

  return <DashboardLayoutClient isAdmin={isAdmin}>{children}</DashboardLayoutClient>;
}
