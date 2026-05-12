import { proxyToBackend } from "@/lib/api/proxy";
import { requireAuth } from "@/lib/api/require-auth";

export async function PUT(request: Request) {
  const authError = await requireAuth(request);
  if (authError) return authError;
  return proxyToBackend(request, "/auth/password");
}
