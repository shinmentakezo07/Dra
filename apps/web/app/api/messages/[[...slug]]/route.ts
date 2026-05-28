import { proxyToBackend } from "@/lib/api/proxy";
import { requireAuth } from "@/lib/api/require-auth";
import { NextRequest } from "next/server";

function getSlugPath(params: { slug?: string[] }): string {
  return params.slug?.length
    ? params.slug.map(encodeURIComponent).join("/")
    : "";
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug?: string[] }> },
) {
  const authError = await requireAuth(request);
  if (authError) return authError;
  const { slug } = await params;
  const slugPath = getSlugPath({ slug });
  return proxyToBackend(request, `/api/messages/${slugPath}`);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug?: string[] }> },
) {
  const authError = await requireAuth(request);
  if (authError) return authError;
  const { slug } = await params;
  const slugPath = getSlugPath({ slug });
  return proxyToBackend(request, `/api/messages/${slugPath}`);
}
