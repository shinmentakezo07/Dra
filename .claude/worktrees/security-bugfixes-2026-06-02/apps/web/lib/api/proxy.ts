import { auth } from "@/auth";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080";

const MAX_BODY_SIZE = 10 * 1024 * 1024; // 10MB

export async function proxyToBackend(
  request: Request,
  path: string,
): Promise<Response> {
  const url = new URL(path, BACKEND_URL);

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (key.toLowerCase() !== "host") {
      headers.set(key, value);
    }
  });

  // Generate or forward request ID for distributed tracing
  let requestId = request.headers.get("x-request-id");
  if (!requestId) {
    requestId = crypto.randomUUID();
  }
  headers.set("x-request-id", requestId);

  // Explicitly forward cookies if present
  const cookie = request.headers.get("cookie");
  if (cookie) {
    headers.set("cookie", cookie);
  }

  // Inject backend Bearer token from NextAuth session
  try {
    const session = await auth();
    const backendToken = session?.user?.backendToken;
    if (backendToken) {
      headers.set("Authorization", `Bearer ${backendToken}`);
    }
  } catch {
    // Session might not be available in some contexts; fall back to cookie auth
  }

  // Validate Content-Type for POST/PUT/PATCH
  if (
    request.method === "POST" ||
    request.method === "PUT" ||
    request.method === "PATCH"
  ) {
    const ct = headers.get("content-type") || "";
    if (
      !ct.startsWith("application/json") &&
      !ct.startsWith("multipart/form-data")
    ) {
      return Response.json(
        { success: false, error: "Unsupported Content-Type" },
        { status: 415 },
      );
    }
  }

  // Enforce body size limit
  const contentLength = parseInt(
    request.headers.get("content-length") || "0",
    10,
  );
  if (contentLength > MAX_BODY_SIZE) {
    return Response.json(
      { success: false, error: "Request body too large" },
      { status: 413 },
    );
  }

  const body =
    request.method !== "GET" && request.method !== "HEAD"
      ? await request.arrayBuffer()
      : undefined;

  try {
    const response = await fetch(url.toString(), {
      method: request.method,
      headers,
      body,
      credentials: "include",
      // duplex is required for streaming fetch but not in standard types
      duplex: "half",
    });

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.error("[proxyToBackend]", err);
    }
    return Response.json(
      { success: false, error: "Backend service unavailable" },
      { status: 503 },
    );
  }
}
