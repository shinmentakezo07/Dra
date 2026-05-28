import { proxyToBackend } from "@/lib/api/proxy";
import { requireAdmin } from "@/lib/api/require-auth";

export async function GET(request: Request) {
  const authError = await requireAdmin(request);
  if (authError) return authError;
  return proxyToBackend(request, "/api/admin/users");
}
