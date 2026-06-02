import { proxyToBackend } from "@/lib/api/proxy";
import { requireAuth } from "@/lib/api/require-auth";

export async function POST(request: Request) {
  const authError = await requireAuth(request);
  if (authError) return authError;
  return proxyToBackend(request, "/api/promos/redeem");
}
