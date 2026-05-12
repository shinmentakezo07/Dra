import { auth } from "@/auth";
import { redirect } from "next/navigation";
import KeysClient from "./KeysClient";

export default async function KeysPage() {
  const session = await auth();
  
  if (!session?.user) {
    redirect("/login");
  }

  return <KeysClient />;
}
