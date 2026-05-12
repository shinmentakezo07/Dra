import { describe, it, expect, vi, beforeEach } from "vitest";
import { DraSDK, configureSDK, getSDK } from "@/lib/api/sdk";
import { ApiError, UnauthorizedError, ForbiddenError, NotFoundError, BadRequestError, RateLimitError, PaymentRequiredError } from "@/lib/api/errors";

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("DraSDK", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    configureSDK({ baseUrl: "http://localhost:3000" });
  });

  describe("health", () => {
    it("returns health data on success", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ success: true, data: { status: "ok", version: "1.0.0" } }),
      });

      const sdk = new DraSDK({ baseUrl: "http://localhost:3000" });
      const result = await sdk.health();
      expect(result.status).toBe("ok");
    });
  });

  describe("auth", () => {
    it("signs up a user", async () => {
      const user = { id: "1", name: "Alice", email: "alice@example.com", role: "user", createdAt: "2024-01-01" };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ success: true, data: user }),
      });

      const sdk = new DraSDK({ baseUrl: "http://localhost:3000" });
      const result = await sdk.signup({ name: "Alice", email: "alice@example.com", password: "password123" });
      expect(result.email).toBe("alice@example.com");
    });

    it("logs in a user", async () => {
      const user = { id: "1", name: "Alice", email: "alice@example.com", role: "user", createdAt: "2024-01-01" };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ success: true, data: { user, token: "jwt-token-123" } }),
      });

      const sdk = new DraSDK({ baseUrl: "http://localhost:3000" });
      const result = await sdk.login({ email: "alice@example.com", password: "password123" });
      expect(result.user.email).toBe("alice@example.com");
      expect(result.token).toBe("jwt-token-123");
    });

    it("throws UnauthorizedError on 401", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ success: false, error: "Unauthorized" }),
      });

      const sdk = new DraSDK({ baseUrl: "http://localhost:3000" });
      await expect(sdk.me()).rejects.toThrow(UnauthorizedError);
    });

    it("updates profile", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ success: true, data: { updated: true } }),
      });

      const sdk = new DraSDK({ baseUrl: "http://localhost:3000" });
      const result = await sdk.updateProfile({ name: "Alice Updated", email: "alice@example.com" });
      expect(result.updated).toBe(true);
    });

    it("changes password", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ success: true, data: { updated: true } }),
      });

      const sdk = new DraSDK({ baseUrl: "http://localhost:3000" });
      const result = await sdk.changePassword({ currentPassword: "old", newPassword: "newpass123" });
      expect(result.updated).toBe(true);
    });
  });

  describe("api keys", () => {
    it("lists keys", async () => {
      const keys = [{ id: "1", userId: "u1", name: "Production", key: "dra_xxx", createdAt: "2024-01-01" }];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ success: true, data: keys }),
      });

      const sdk = new DraSDK({ baseUrl: "http://localhost:3000" });
      const result = await sdk.listKeys();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Production");
    });

    it("creates a key", async () => {
      const key = { id: "1", userId: "u1", name: "New Key", key: "dra_yyy", createdAt: "2024-01-01" };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ success: true, data: key }),
      });

      const sdk = new DraSDK({ baseUrl: "http://localhost:3000" });
      const result = await sdk.createKey({ name: "New Key" });
      expect(result.key).toBe("dra_yyy");
    });

    it("deletes a key", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ success: true, data: { deleted: true } }),
      });

      const sdk = new DraSDK({ baseUrl: "http://localhost:3000" });
      const result = await sdk.deleteKey("1");
      expect(result.deleted).toBe(true);
    });

    it("revokes a key", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ success: true, data: { revoked: true } }),
      });

      const sdk = new DraSDK({ baseUrl: "http://localhost:3000" });
      const result = await sdk.revokeKey("1");
      expect(result.revoked).toBe(true);
    });
  });

  describe("credits", () => {
    it("gets credits balance", async () => {
      const credits = { id: "1", userId: "u1", balance: 5000, totalPurchased: 10000, totalSpent: 5000, updatedAt: "2024-01-01" };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ success: true, data: credits }),
      });

      const sdk = new DraSDK({ baseUrl: "http://localhost:3000" });
      const result = await sdk.getCredits();
      expect(result.balance).toBe(5000);
    });

    it("purchases credits", async () => {
      const tx = { id: "1", userId: "u1", amount: 5000, type: "purchase", description: "Purchase", createdAt: "2024-01-01" };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ success: true, data: tx }),
      });

      const sdk = new DraSDK({ baseUrl: "http://localhost:3000" });
      const result = await sdk.purchaseCredits({ amount: 5000 });
      expect(result.amount).toBe(5000);
    });
  });

  describe("logs", () => {
    it("lists logs with pagination", async () => {
      const logs = [
        { id: "1", userId: "u1", model: "gpt-4", provider: "OpenAI", inputTokens: 100, outputTokens: 50, cost: 1000, latency: 500, status: "success", createdAt: "2024-01-01" },
      ];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ success: true, data: logs, meta: { total: 1, page: 1, limit: 20, totalPages: 1 } }),
      });

      const sdk = new DraSDK({ baseUrl: "http://localhost:3000" });
      const result = await sdk.listLogs(1, 20);
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
    });
  });

  describe("analytics", () => {
    it("gets analytics", async () => {
      const analytics = {
        summary: { totalRequests: 10, successRequests: 9, errorRequests: 1 },
        recentLogs: [],
        modelBreakdown: [{ model: "gpt-4", count: 10, totalCost: 10000 }],
        dailyUsage: [{ date: "2024-01-01", requests: 10, cost: 10000, tokens: 1000 }],
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ success: true, data: analytics }),
      });

      const sdk = new DraSDK({ baseUrl: "http://localhost:3000" });
      const result = await sdk.getAnalytics();
      expect(result.summary.totalRequests).toBe(10);
    });
  });

  describe("models", () => {
    it("lists models", async () => {
      const models = [{ id: "gpt-4", name: "GPT-4", provider: "OpenAI", inputPricePer1k: 0.01, outputPricePer1k: 0.03, contextWindow: "8K", description: "GPT-4", capabilities: ["text"] }];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ success: true, data: models }),
      });

      const sdk = new DraSDK({ baseUrl: "http://localhost:3000" });
      const result = await sdk.listModels();
      expect(result).toHaveLength(1);
    });
  });

  describe("error mapping", () => {
    it("maps 400 to BadRequestError", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ success: false, error: "Bad request" }),
      });

      const sdk = new DraSDK({ baseUrl: "http://localhost:3000" });
      await expect(sdk.me()).rejects.toThrow(BadRequestError);
    });

    it("maps 403 to ForbiddenError", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ success: false, error: "Forbidden" }),
      });

      const sdk = new DraSDK({ baseUrl: "http://localhost:3000" });
      await expect(sdk.me()).rejects.toThrow(ForbiddenError);
    });

    it("maps 404 to NotFoundError", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ success: false, error: "Not found" }),
      });

      const sdk = new DraSDK({ baseUrl: "http://localhost:3000" });
      await expect(sdk.me()).rejects.toThrow(NotFoundError);
    });

    it("maps 429 to RateLimitError", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ success: false, error: "Rate limited" }),
      });

      const sdk = new DraSDK({ baseUrl: "http://localhost:3000" });
      await expect(sdk.me()).rejects.toThrow(RateLimitError);
    });

    it("maps 402 to PaymentRequiredError", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 402,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ success: false, error: "No credits" }),
      });

      const sdk = new DraSDK({ baseUrl: "http://localhost:3000" });
      await expect(sdk.me()).rejects.toThrow(PaymentRequiredError);
    });
  });

  describe("configureSDK / getSDK", () => {
    it("shares the default instance", () => {
      configureSDK({ baseUrl: "http://test" });
      const sdk = getSDK();
      expect(sdk).toBeDefined();
    });
  });
});
