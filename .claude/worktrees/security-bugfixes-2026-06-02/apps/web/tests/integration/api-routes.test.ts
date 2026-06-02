import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/auth", () => ({
  auth: vi.fn().mockResolvedValue(null),
}));

describe("API route proxy behavior", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("proxyToBackend generates x-request-id when missing", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ ok: true })));
    vi.stubGlobal("fetch", mockFetch);

    const { proxyToBackend } = await import("@/lib/api/proxy");

    const request = new Request("http://localhost:3000/api/models", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    await proxyToBackend(request, "/api/models");

    const callArgs = mockFetch.mock.calls[0];
    const fetchedRequest = callArgs[1] as Request;
    expect(fetchedRequest.headers.get("x-request-id")).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it("proxyToBackend forwards existing x-request-id", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ ok: true })));
    vi.stubGlobal("fetch", mockFetch);

    const { proxyToBackend } = await import("@/lib/api/proxy");

    const request = new Request("http://localhost:3000/api/models", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-request-id": "existing-id-123",
      },
    });

    await proxyToBackend(request, "/api/models");

    const callArgs = mockFetch.mock.calls[0];
    const fetchedRequest = callArgs[1] as Request;
    expect(fetchedRequest.headers.get("x-request-id")).toBe("existing-id-123");
  });

  it("proxyToBackend rejects unsupported Content-Type for POST", async () => {
    const { proxyToBackend } = await import("@/lib/api/proxy");

    const request = new Request("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: "hello",
    });

    const response = await proxyToBackend(request, "/api/chat");
    expect(response.status).toBe(415);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe("Unsupported Content-Type");
  });

  it("proxyToBackend allows application/json for POST", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ ok: true })));
    vi.stubGlobal("fetch", mockFetch);

    const { proxyToBackend } = await import("@/lib/api/proxy");

    const request = new Request("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "gpt-4o" }),
    });

    const response = await proxyToBackend(request, "/api/chat");
    expect(mockFetch).toHaveBeenCalled();
  });

  it("proxyToBackend uses BACKEND_URL from env", async () => {
    const originalUrl = process.env.BACKEND_URL;
    process.env.BACKEND_URL = "http://custom-backend:9090";

    const mockFetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ ok: true })));
    vi.stubGlobal("fetch", mockFetch);

    const { proxyToBackend } = await import("@/lib/api/proxy");

    const request = new Request("http://localhost:3000/api/models", {
      method: "GET",
    });

    await proxyToBackend(request, "/api/models");

    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs[0]).toContain("http://custom-backend:9090");

    process.env.BACKEND_URL = originalUrl;
  });
});

describe("API response helpers", () => {
  it("createResponse wraps data correctly", async () => {
    const { createResponse } = await import("@/lib/api/types");
    const result = createResponse({ id: 1 });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ id: 1 });
  });

  it("createErrorResponse wraps error correctly", async () => {
    const { createErrorResponse } = await import("@/lib/api/types");
    const result = createErrorResponse("fail");
    expect(result.success).toBe(false);
    expect(result.error).toBe("fail");
  });
});
