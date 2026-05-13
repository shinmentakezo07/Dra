import { auth } from "@/auth"
import { redirect } from "next/navigation"
import AdminSidebar from "./AdminSidebar"
import AdminTopBar from "./AdminTopBar"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  if (session.user.role !== "admin") {
    redirect("/dashboard")
  }

  return (
    <div className="flex h-screen bg-[#000000]">
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminTopBar />
        <main className="flex-1 overflow-y-auto">
          <div className="p-8 max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  )
}
