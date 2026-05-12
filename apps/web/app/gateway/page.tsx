import { auth } from "@/auth";
import { redirect } from "next/navigation";
import GatewayDashboard from "@/components/GatewayDashboard";

export default async function GatewayPage() {
  const session = await auth();
  
  if (!session?.user) {
    redirect("/login");
  }

  return <GatewayDashboard user={session.user} />;
}
