import { auth } from "@/auth";

export async function requireAuth(request: Request): Promise<Response | null> {
  const session = await auth();
  if (!session?.user) {
    return new Response(
      JSON.stringify({ success: false, error: "Authentication required" }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
  return null;
}

export async function requireAdmin(request: Request): Promise<Response | null> {
  const session = await auth();
  if (!session?.user) {
    return new Response(
      JSON.stringify({ success: false, error: "Authentication required" }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
  if (session.user.role !== "admin" && session.user.role !== "superadmin") {
    return new Response(
      JSON.stringify({ success: false, error: "Admin access required" }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
  return null;
}
