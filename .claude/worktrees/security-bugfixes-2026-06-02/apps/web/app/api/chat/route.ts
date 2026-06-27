import { auth } from "@/auth";
import { requireAuth } from "@/lib/api/require-auth";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { RateLimitError } from "@/lib/api/errors";

export const runtime = "nodejs";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080";

function encodeDataStream(text: string): string {
  // Vercel AI SDK Data Stream format: 0:"text"
  return `0:${JSON.stringify(text)}\n`;
}

function encodeStreamFinish(): string {
  return "e:{}\n";
}

export async function POST(request: Request) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const session = await auth();
  const userId = session?.user?.id || session?.user?.email || "anonymous";
  const isAuthenticated = !!session?.user;

  try {
    checkRateLimit(String(userId), isAuthenticated);
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

  let body: unknown;
  try {
    body = await request.json();
  } catch (err) {
    if (err instanceof SyntaxError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid JSON in request body",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }
    throw err;
  }

  // Forward auth cookies and API key headers to Go backend
  const headers = new Headers();
  headers.set("Content-Type", "application/json");

  const cookie = request.headers.get("cookie");
  if (cookie) headers.set("Cookie", cookie);

  const apiKey = request.headers.get("x-api-key");
  if (apiKey) headers.set("x-api-key", apiKey);

  const authHeader = request.headers.get("authorization");
  if (authHeader) headers.set("Authorization", authHeader);

  // Inject backend Bearer token from NextAuth session if no explicit auth header
  if (!authHeader) {
    try {
      const backendToken = (session?.user as Record<string, unknown>)
        ?.backendToken as string | undefined;
      if (backendToken) {
        headers.set("Authorization", `Bearer ${backendToken}`);
      }
    } catch {
      // Session might not be available; fall back to cookie auth
    }
  }

  const backendRes = await fetch(`${BACKEND_URL}/api/chat`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!backendRes.ok || !backendRes.body) {
    // Log backend error details server-side; never leak to client
    const errorText = await backendRes.text();
    console.error("[chat] Backend error:", backendRes.status, errorText);
    return new Response(
      JSON.stringify({ success: false, error: "Chat request failed" }),
      {
        status: backendRes.status,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  // Convert OpenAI SSE from Go backend to Vercel AI SDK Data Stream
  const reader = backendRes.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const stream = new ReadableStream({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data: ")) continue;

            const payload = trimmed.slice(6);
            if (payload === "[DONE]") {
              controller.enqueue(
                new TextEncoder().encode(encodeStreamFinish()),
              );
              controller.close();
              return;
            }

            try {
              const chunk = JSON.parse(payload);
              const delta = chunk.choices?.[0]?.delta;
              const content = delta?.content;
              if (typeof content === "string" && content.length > 0) {
                controller.enqueue(
                  new TextEncoder().encode(encodeDataStream(content)),
                );
              }
            } catch {
              // Ignore malformed JSON chunks
            }
          }
        }

        controller.enqueue(new TextEncoder().encode(encodeStreamFinish()));
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },

    cancel() {
      reader.cancel();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
