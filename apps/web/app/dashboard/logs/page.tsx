import { auth } from "@/auth";
import { redirect } from "next/navigation";
import LogsClient from "./LogsClient";

export default async function LogsPage() {
  const session = await auth();
  
  if (!session?.user) {
    redirect("/login");
  }

  return <LogsClient />;
}
