import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getDocsBaseUrl } from "@/lib/docs-config";

describe("getDocsBaseUrl", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns NEXT_PUBLIC_DOCS_BASE_URL when set", async () => {
    process.env.NEXT_PUBLIC_DOCS_BASE_URL = "https://docs.example.com";
    const { getDocsBaseUrl: fn } = await import("@/lib/docs-config");
    expect(fn()).toBe("https://docs.example.com");
  });

  it("falls back to NEXT_PUBLIC_BACKEND_URL when DOCS_BASE_URL is not set", async () => {
    delete process.env.NEXT_PUBLIC_DOCS_BASE_URL;
    process.env.NEXT_PUBLIC_BACKEND_URL = "https://api.example.com";
    const { getDocsBaseUrl: fn } = await import("@/lib/docs-config");
    expect(fn()).toBe("https://api.example.com");
  });

  it("prefers DOCS_BASE_URL over BACKEND_URL", async () => {
    process.env.NEXT_PUBLIC_DOCS_BASE_URL = "https://docs.example.com";
    process.env.NEXT_PUBLIC_BACKEND_URL = "https://api.example.com";
    const { getDocsBaseUrl: fn } = await import("@/lib/docs-config");
    expect(fn()).toBe("https://docs.example.com");
  });

  it("defaults to localhost:8080 when no env vars are set", async () => {
    delete process.env.NEXT_PUBLIC_DOCS_BASE_URL;
    delete process.env.NEXT_PUBLIC_BACKEND_URL;
    const { getDocsBaseUrl: fn } = await import("@/lib/docs-config");
    expect(fn()).toBe("http://localhost:8080");
  });
});
