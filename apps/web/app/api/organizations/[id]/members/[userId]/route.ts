import { proxyToBackend } from "@/lib/api/proxy";
import { requireAuth } from "@/lib/api/require-auth";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> },
) {
  const authError = await requireAuth(request);
  if (authError) return authError;
  const { id, userId } = await params;
  return proxyToBackend(
    request,
    `/api/organizations/${encodeURIComponent(id)}/members/${encodeURIComponent(userId)}`,
  );
}
