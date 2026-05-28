import { auth } from "@/auth";
import DashboardLayoutClient from "./dashboard-layout-client";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const isAdmin = session?.user?.role === "admin";

  return (
    <DashboardLayoutClient isAdmin={isAdmin} user={session?.user ?? null}>
      {children}
    </DashboardLayoutClient>
  );
}
