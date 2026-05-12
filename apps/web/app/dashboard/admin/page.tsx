import { auth } from "@/auth";
import { redirect } from "next/navigation";
import AdminDashboardClient from "./admin-dashboard-client";

export default async function AdminDashboardPage() {
  const session = await auth();
  if ((session?.user as any)?.role !== "admin") {
    redirect("/dashboard");
  }
  return <AdminDashboardClient />;
}
