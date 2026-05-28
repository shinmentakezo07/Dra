import { proxyToBackend } from "@/lib/api/proxy";
import { requireAuth } from "@/lib/api/require-auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const authError = await requireAuth(request);
  if (authError) return authError;
  const { name } = await params;
  return proxyToBackend(request, `/api/prompts/${encodeURIComponent(name)}`);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const authError = await requireAuth(request);
  if (authError) return authError;
  const { name } = await params;
  return proxyToBackend(request, `/api/prompts/${encodeURIComponent(name)}`);
}
