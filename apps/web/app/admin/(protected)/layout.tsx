import { auth } from "@/auth"
import { redirect } from "next/navigation"
import AdminSidebar from "../AdminSidebar"
import AdminTopBar from "../AdminTopBar"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect("/admin/login")
  }

  if (session.user.role !== "admin") {
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen bg-[var(--admin-bg)] relative z-0">
      <AdminSidebar />
      <div className="pl-[260px] flex flex-col min-h-screen transition-all duration-300">
        <AdminTopBar />
        <main className="flex-1 overflow-y-auto admin-scroll">
          <div className="p-8 max-w-[1400px] mx-auto">{children}</div>
        </main>
      </div>
    </div>
  )
}
