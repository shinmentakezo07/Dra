import { auth } from "@/auth";
import { redirect } from "next/navigation";
import DashboardOverviewClient from "./DashboardOverviewClient";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return <DashboardOverviewClient />;
}
