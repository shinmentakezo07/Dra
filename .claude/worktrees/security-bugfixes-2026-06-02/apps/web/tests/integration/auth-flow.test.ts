import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("Auth flow integration", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("OAuth backend token handling", () => {
    it("does not call the removed public backend OAuth mint endpoint", async () => {
      const authPath = fileURLToPath(new URL("../../auth.ts", import.meta.url));
      const source = await readFile(authPath, "utf8");

      expect(source).not.toContain("/auth/oauth");
      expect(source).not.toContain("backendOAuth");
    });
  });

  describe("SDK configuration", () => {
    it("configureSDK sets baseUrl", async () => {
      const { configureSDK, getSDK } = await import("@/lib/api/sdk");

      configureSDK({ baseUrl: "http://test-backend:8080" });
      const sdk = getSDK();

      expect(sdk).toBeDefined();
    });

    it("getSDK returns configured instance", async () => {
      const { configureSDK, getSDK } = await import("@/lib/api/sdk");

      configureSDK({ baseUrl: "http://test-backend:8080" });
      const sdk1 = getSDK();
      const sdk2 = getSDK();

      expect(sdk1).toBe(sdk2);
    });
  });

  describe("Error class hierarchy", () => {
    it("ApiError has correct status and code", async () => {
      const { ApiError } = await import("@/lib/api/errors");
      const err = new ApiError("test", 400, "BAD");
      expect(err.message).toBe("test");
      expect(err.status).toBe(400);
      expect(err.code).toBe("BAD");
    });

    it("UnauthorizedError extends ApiError with 401", async () => {
      const { UnauthorizedError, ApiError } = await import("@/lib/api/errors");
      const err = new UnauthorizedError();
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(401);
      expect(err.code).toBe("UNAUTHORIZED");
    });

    it("ForbiddenError extends ApiError with 403", async () => {
      const { ForbiddenError } = await import("@/lib/api/errors");
      const err = new ForbiddenError();
      expect(err.status).toBe(403);
      expect(err.code).toBe("FORBIDDEN");
    });

    it("NotFoundError extends ApiError with 404", async () => {
      const { NotFoundError } = await import("@/lib/api/errors");
      const err = new NotFoundError();
      expect(err.status).toBe(404);
      expect(err.code).toBe("NOT_FOUND");
    });

    it("RateLimitError extends ApiError with 429", async () => {
      const { RateLimitError } = await import("@/lib/api/errors");
      const err = new RateLimitError();
      expect(err.status).toBe(429);
      expect(err.code).toBe("RATE_LIMITED");
    });

    it("PaymentRequiredError extends ApiError with 402", async () => {
      const { PaymentRequiredError } = await import("@/lib/api/errors");
      const err = new PaymentRequiredError();
      expect(err.status).toBe(402);
      expect(err.code).toBe("PAYMENT_REQUIRED");
    });
  });

  describe("Error helpers", () => {
    it("getErrorMessage extracts message from ApiError", async () => {
      const { getErrorMessage, ApiError } = await import("@/lib/api/errors");
      expect(getErrorMessage(new ApiError("custom", 500))).toBe("custom");
    });

    it("getErrorMessage extracts message from generic Error", async () => {
      const { getErrorMessage } = await import("@/lib/api/errors");
      expect(getErrorMessage(new Error("generic"))).toBe("generic");
    });

    it("getErrorMessage returns default for unknown", async () => {
      const { getErrorMessage } = await import("@/lib/api/errors");
      expect(getErrorMessage("string error")).toBe(
        "An unexpected error occurred",
      );
    });

    it("getErrorStatus returns status from ApiError", async () => {
      const { getErrorStatus, ApiError } = await import("@/lib/api/errors");
      expect(getErrorStatus(new ApiError("test", 404))).toBe(404);
    });

    it("getErrorStatus returns 500 for non-ApiError", async () => {
      const { getErrorStatus } = await import("@/lib/api/errors");
      expect(getErrorStatus(new Error("generic"))).toBe(500);
    });
  });

  describe("Auth utility functions", () => {
    it("parsePagination works with auth-related pagination", async () => {
      const { parsePagination } = await import("@/lib/api/types");
      const params = new URLSearchParams("page=1&limit=10");
      const result = parsePagination(params);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });
  });
});
