import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { SettingsForm } from "./SettingsForm";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login");
  }

  const user = await db.query.users.findFirst({
    where: eq(users.email, session.user.email),
  });

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Account Settings</h1>
        <p className="text-gray-400">Manage your profile and security preferences.</p>
      </div>
      
      <SettingsForm user={user} />
    </div>
  );
}
