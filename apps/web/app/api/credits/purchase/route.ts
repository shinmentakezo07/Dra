import { proxyToBackend } from "@/lib/api/proxy";
import { requireAuth } from "@/lib/api/require-auth";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { RateLimitError } from "@/lib/api/errors";
import { auth } from "@/auth";

export async function POST(request: Request) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const session = await auth();
  const userId = session?.user?.id || session?.user?.email || "anonymous";
  try {
    checkRateLimit(String(userId), true);
  } catch (err) {
    if (err instanceof RateLimitError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Rate limit exceeded. Please slow down.",
        }),
        { status: 429, headers: { "Content-Type": "application/json" } },
      );
    }
    throw err;
  }

  return proxyToBackend(request, "/api/credits/purchase");
}
