import { proxyToBackend } from "@/lib/api/proxy";
import { requireAuth } from "@/lib/api/require-auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await requireAuth(request);
  if (authError) return authError;
  const { id } = await params;
  return proxyToBackend(
    request,
    `/api/organizations/${encodeURIComponent(id)}/invite`,
  );
}
