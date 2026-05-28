import { describe, it, expect, vi, beforeEach } from "vitest";
import { DraSDK, configureSDK, getSDK } from "@/lib/api/sdk";
import {
  ApiError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  BadRequestError,
  RateLimitError,
  PaymentRequiredError,
} from "@/lib/api/errors";

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
        json: async () => ({
          success: true,
          data: { status: "ok", version: "1.0.0" },
        }),
      });

      const sdk = new DraSDK({ baseUrl: "http://localhost:3000" });
      const result = await sdk.health();
      expect(result.status).toBe("ok");
    });
  });

  describe("auth", () => {
    it("signs up a user", async () => {
      const user = {
        id: "1",
        name: "Alice",
        email: "alice@example.com",
        role: "user",
        createdAt: "2024-01-01",
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ success: true, data: user }),
      });

      const sdk = new DraSDK({ baseUrl: "http://localhost:3000" });
      const result = await sdk.signup({
        name: "Alice",
        email: "alice@example.com",
        password: "password123",
      });
      expect(result.email).toBe("alice@example.com");
    });

    it("logs in a user", async () => {
      const user = {
        id: "1",
        name: "Alice",
        email: "alice@example.com",
        role: "user",
        createdAt: "2024-01-01",
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({
          success: true,
          data: { user, token: "jwt-token-123" },
        }),
      });

      const sdk = new DraSDK({ baseUrl: "http://localhost:3000" });
      const result = await sdk.login({
        email: "alice@example.com",
        password: "password123",
      });
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
      const result = await sdk.updateProfile({
        name: "Alice Updated",
        email: "alice@example.com",
      });
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
      const result = await sdk.changePassword({
        currentPassword: "old",
        newPassword: "newpass123",
      });
      expect(result.updated).toBe(true);
    });
  });

  describe("api keys", () => {
    it("lists keys", async () => {
      const keys = [
        {
          id: "1",
          userId: "u1",
          name: "Production",
          key: "dra_xxx",
          createdAt: "2024-01-01",
        },
      ];
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
      const key = {
        id: "1",
        userId: "u1",
        name: "New Key",
        key: "dra_yyy",
        createdAt: "2024-01-01",
      };
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
      const credits = {
        id: "1",
        userId: "u1",
        balance: 5000,
        totalPurchased: 10000,
        totalSpent: 5000,
        updatedAt: "2024-01-01",
      };
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
      const tx = {
        id: "1",
        userId: "u1",
        amount: 5000,
        type: "purchase",
        description: "Purchase",
        createdAt: "2024-01-01",
      };
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
        {
          id: "1",
          userId: "u1",
          model: "gpt-4",
          provider: "OpenAI",
          inputTokens: 100,
          outputTokens: 50,
          cost: 1000,
          latency: 500,
          status: "success",
          createdAt: "2024-01-01",
        },
      ];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({
          success: true,
          data: logs,
          meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
        }),
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
        dailyUsage: [
          { date: "2024-01-01", requests: 10, cost: 10000, tokens: 1000 },
        ],
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
      const models = [
        {
          id: "gpt-4",
          name: "GPT-4",
          provider: "OpenAI",
          inputPricePer1k: 0.01,
          outputPricePer1k: 0.03,
          contextWindow: "8K",
          description: "GPT-4",
          capabilities: ["text"],
        },
      ];
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

      const sdk = new DraSDK({ baseUrl: "http://localhost:3000", retries: 0 });
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

  describe("integration: request headers", () => {
    it("extracts x-request-id and rate limit headers", async () => {
      const headers = new Headers({
        "content-type": "application/json",
        "x-request-id": "req-test-001",
        "x-ratelimit-limit": "100",
        "x-ratelimit-remaining": "95",
        "x-ratelimit-reset": "1700000000",
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers,
        json: async () => ({
          success: true,
          data: { status: "ok", version: "1.0.0" },
        }),
      });

      const sdk = new DraSDK({ baseUrl: "http://localhost:3000", retries: 0 });
      await sdk.health();
      expect(sdk.lastRequestId()).toBe("req-test-001");
      const rl = sdk.lastRateLimitInfo();
      expect(rl.limit).toBe(100);
      expect(rl.remaining).toBe(95);
      expect(rl.reset).toBe(1700000000);
    });

    it("extracts headers on error responses", async () => {
      const headers = new Headers({
        "content-type": "application/json",
        "x-request-id": "req-error-002",
        "x-ratelimit-remaining": "0",
      });
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers,
        json: async () => ({ success: false, error: "Rate limited" }),
      });

      const sdk = new DraSDK({ baseUrl: "http://localhost:3000", retries: 0 });
      await expect(sdk.me()).rejects.toThrow(RateLimitError);
      expect(sdk.lastRequestId()).toBe("req-error-002");
      expect(sdk.lastRateLimitInfo().remaining).toBe(0);
    });
  });

  describe("auth extended", () => {
    it("oauth login", async () => {
      const user = {
        id: "1",
        name: "Alice",
        email: "alice@example.com",
        role: "user",
        createdAt: "2024-01-01",
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({
          success: true,
          data: { user, token: "oauth-token" },
        }),
      });

      const sdk = new DraSDK({ baseUrl: "http://localhost:3000" });
      const result = await sdk.oauthLogin({
        provider: "github",
        code: "auth-code",
      });
      expect(result.token).toBe("oauth-token");
    });

    it("forgot password", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ success: true, data: { sent: true } }),
      });

      const sdk = new DraSDK({ baseUrl: "http://localhost:3000" });
      const result = await sdk.forgotPassword({ email: "alice@example.com" });
      expect(result.sent).toBe(true);
    });

    it("reset password", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ success: true, data: { updated: true } }),
      });

      const sdk = new DraSDK({ baseUrl: "http://localhost:3000" });
      const result = await sdk.resetPassword({
        token: "reset-token",
        newPassword: "newpass123",
      });
      expect(result.updated).toBe(true);
    });
  });

  describe("budget", () => {
    it("gets budget config", async () => {
      const budget = {
        id: "1",
        userId: "u1",
        monthlyLimit: 1000,
        dailyLimit: 50,
        notifyAtPercent: 80,
        updatedAt: "2024-01-01",
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ success: true, data: budget }),
      });

      const sdk = new DraSDK({ baseUrl: "http://localhost:3000" });
      const result = await sdk.getBudget();
      expect(result.monthlyLimit).toBe(1000);
    });

    it("sets budget config", async () => {
      const budget = {
        id: "1",
        userId: "u1",
        monthlyLimit: 2000,
        dailyLimit: 100,
        notifyAtPercent: 90,
        updatedAt: "2024-01-01",
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ success: true, data: budget }),
      });

      const sdk = new DraSDK({ baseUrl: "http://localhost:3000" });
      const result = await sdk.setBudget({ monthlyLimit: 2000 });
      expect(result.monthlyLimit).toBe(2000);
    });
  });

  describe("conversations", () => {
    it("lists conversations", async () => {
      const conversations = [
        {
          id: "c1",
          userId: "u1",
          title: "Test",
          model: "gpt-4",
          createdAt: "2024-01-01",
          updatedAt: "2024-01-01",
        },
      ];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({
          success: true,
          data: conversations,
          meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
        }),
      });

      const sdk = new DraSDK({ baseUrl: "http://localhost:3000" });
      const result = await sdk.listConversations(1, 20);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].title).toBe("Test");
    });

    it("creates a conversation", async () => {
      const conversation = {
        id: "c1",
        userId: "u1",
        title: "New Chat",
        model: "gpt-4",
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ success: true, data: conversation }),
      });

      const sdk = new DraSDK({ baseUrl: "http://localhost:3000" });
      const result = await sdk.createConversation({
        title: "New Chat",
        model: "gpt-4",
      });
      expect(result.title).toBe("New Chat");
    });

    it("gets a conversation", async () => {
      const conversation = {
        id: "c1",
        userId: "u1",
        title: "Chat",
        model: "gpt-4",
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ success: true, data: conversation }),
      });

      const sdk = new DraSDK({ baseUrl: "http://localhost:3000" });
      const result = await sdk.getConversation("c1");
      expect(result.id).toBe("c1");
    });

    it("deletes a conversation", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ success: true, data: { deleted: true } }),
      });

      const sdk = new DraSDK({ baseUrl: "http://localhost:3000" });
      const result = await sdk.deleteConversation("c1");
      expect(result.deleted).toBe(true);
    });

    it("adds a message", async () => {
      const message = {
        id: "m1",
        conversationId: "c1",
        role: "user",
        content: "Hello",
        createdAt: "2024-01-01",
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ success: true, data: message }),
      });

      const sdk = new DraSDK({ baseUrl: "http://localhost:3000" });
      const result = await sdk.addMessage("c1", {
        role: "user",
        content: "Hello",
      });
      expect(result.content).toBe("Hello");
    });
  });

  describe("prompts", () => {
    it("lists prompts", async () => {
      const prompts = [
        {
          name: "greeting",
          content: "Hello {{name}}",
          template: true,
          createdAt: "2024-01-01",
          updatedAt: "2024-01-01",
        },
      ];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ success: true, data: prompts }),
      });

      const sdk = new DraSDK({ baseUrl: "http://localhost:3000" });
      const result = await sdk.listPrompts();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("greeting");
    });

    it("creates a prompt", async () => {
      const prompt = {
        name: "greeting",
        content: "Hello",
        description: "A greeting prompt",
        template: false,
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ success: true, data: prompt }),
      });

      const sdk = new DraSDK({ baseUrl: "http://localhost:3000" });
      const result = await sdk.createPrompt({
        name: "greeting",
        content: "Hello",
        description: "A greeting prompt",
      });
      expect(result.name).toBe("greeting");
    });

    it("gets a prompt", async () => {
      const prompt = {
        name: "greeting",
        content: "Hello",
        template: false,
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ success: true, data: prompt }),
      });

      const sdk = new DraSDK({ baseUrl: "http://localhost:3000" });
      const result = await sdk.getPrompt("greeting");
      expect(result.name).toBe("greeting");
    });

    it("renders a prompt", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({
          success: true,
          data: { rendered: "Hello Alice" },
        }),
      });

      const sdk = new DraSDK({ baseUrl: "http://localhost:3000" });
      const result = await sdk.renderPrompt("greeting", { name: "Alice" });
      expect(result.rendered).toBe("Hello Alice");
    });

    it("deletes a prompt", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ success: true, data: { deleted: true } }),
      });

      const sdk = new DraSDK({ baseUrl: "http://localhost:3000" });
      const result = await sdk.deletePrompt("greeting");
      expect(result.deleted).toBe(true);
    });
  });

  describe("webhooks", () => {
    it("lists webhooks", async () => {
      const webhooks = [
        {
          id: "w1",
          userId: "u1",
          name: "My Hook",
          url: "https://example.com/hook",
          events: ["log.created"],
          active: true,
          createdAt: "2024-01-01",
          updatedAt: "2024-01-01",
        },
      ];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ success: true, data: webhooks }),
      });

      const sdk = new DraSDK({ baseUrl: "http://localhost:3000" });
      const result = await sdk.listWebhooks();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("My Hook");
    });

    it("creates a webhook", async () => {
      const webhook = {
        id: "w1",
        userId: "u1",
        name: "My Hook",
        url: "https://example.com/hook",
        events: ["log.created"],
        active: true,
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ success: true, data: webhook }),
      });

      const sdk = new DraSDK({ baseUrl: "http://localhost:3000" });
      const result = await sdk.createWebhook({
        name: "My Hook",
        url: "https://example.com/hook",
        events: ["log.created"],
      });
      expect(result.url).toBe("https://example.com/hook");
    });

    it("gets a webhook", async () => {
      const webhook = {
        id: "w1",
        userId: "u1",
        name: "My Hook",
        url: "https://example.com/hook",
        events: ["log.created"],
        active: true,
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ success: true, data: webhook }),
      });

      const sdk = new DraSDK({ baseUrl: "http://localhost:3000" });
      const result = await sdk.getWebhook("w1");
      expect(result.id).toBe("w1");
    });

    it("updates a webhook", async () => {
      const webhook = {
        id: "w1",
        userId: "u1",
        name: "Updated Hook",
        url: "https://example.com/hook",
        events: ["log.created"],
        active: true,
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ success: true, data: webhook }),
      });

      const sdk = new DraSDK({ baseUrl: "http://localhost:3000" });
      const result = await sdk.updateWebhook("w1", { name: "Updated Hook" });
      expect(result.name).toBe("Updated Hook");
    });

    it("deletes a webhook", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ success: true, data: { deleted: true } }),
      });

      const sdk = new DraSDK({ baseUrl: "http://localhost:3000" });
      const result = await sdk.deleteWebhook("w1");
      expect(result.deleted).toBe(true);
    });
  });

  describe("organizations", () => {
    it("lists organizations", async () => {
      const orgs = [
        {
          id: "o1",
          name: "Acme",
          ownerId: "u1",
          createdAt: "2024-01-01",
          updatedAt: "2024-01-01",
        },
      ];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ success: true, data: orgs }),
      });

      const sdk = new DraSDK({ baseUrl: "http://localhost:3000" });
      const result = await sdk.listOrganizations();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Acme");
    });

    it("creates an organization", async () => {
      const org = {
        id: "o1",
        name: "Acme",
        ownerId: "u1",
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ success: true, data: org }),
      });

      const sdk = new DraSDK({ baseUrl: "http://localhost:3000" });
      const result = await sdk.createOrganization({ name: "Acme" });
      expect(result.name).toBe("Acme");
    });

    it("gets an organization", async () => {
      const org = {
        id: "o1",
        name: "Acme",
        ownerId: "u1",
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ success: true, data: org }),
      });

      const sdk = new DraSDK({ baseUrl: "http://localhost:3000" });
      const result = await sdk.getOrganization("o1");
      expect(result.id).toBe("o1");
    });

    it("invites a member", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ success: true, data: { invited: true } }),
      });

      const sdk = new DraSDK({ baseUrl: "http://localhost:3000" });
      const result = await sdk.inviteMember("o1", {
        email: "bob@example.com",
        role: "member",
      });
      expect(result.invited).toBe(true);
    });

    it("removes a member", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ success: true, data: { removed: true } }),
      });

      const sdk = new DraSDK({ baseUrl: "http://localhost:3000" });
      const result = await sdk.removeMember("o1", "u2");
      expect(result.removed).toBe(true);
    });

    it("lists members", async () => {
      const members = [
        { userId: "u2", name: "Bob", email: "bob@example.com", role: "member" },
      ];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ success: true, data: members }),
      });

      const sdk = new DraSDK({ baseUrl: "http://localhost:3000" });
      const result = await sdk.listMembers("o1");
      expect(result).toHaveLength(1);
      expect(result[0].email).toBe("bob@example.com");
    });

    it("accepts an invite", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ success: true, data: { accepted: true } }),
      });

      const sdk = new DraSDK({ baseUrl: "http://localhost:3000" });
      const result = await sdk.acceptInvite({ token: "invite-token" });
      expect(result.accepted).toBe(true);
    });
  });

  describe("batch", () => {
    it("submits a batch job", async () => {
      const job = {
        id: "b1",
        userId: "u1",
        status: "pending" as const,
        total: 2,
        completed: 0,
        failed: 0,
        createdAt: "2024-01-01",
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ success: true, data: job }),
      });

      const sdk = new DraSDK({ baseUrl: "http://localhost:3000" });
      const result = await sdk.submitBatch({
        requests: [
          { model: "gpt-4", messages: [{ role: "user", content: "Hello" }] },
        ],
      });
      expect(result.status).toBe("pending");
    });

    it("gets a batch job", async () => {
      const job = {
        id: "b1",
        userId: "u1",
        status: "completed" as const,
        total: 2,
        completed: 2,
        failed: 0,
        createdAt: "2024-01-01",
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ success: true, data: job }),
      });

      const sdk = new DraSDK({ baseUrl: "http://localhost:3000" });
      const result = await sdk.getBatchJob("b1");
      expect(result.completed).toBe(2);
    });
  });

  describe("files", () => {
    it("uploads a file", async () => {
      const fileInfo = {
        id: "f1",
        userId: "u1",
        name: "test.txt",
        size: 1024,
        mimeType: "text/plain",
        createdAt: "2024-01-01",
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ success: true, data: fileInfo }),
      });

      const sdk = new DraSDK({ baseUrl: "http://localhost:3000" });
      const blob = new Blob(["test content"], { type: "text/plain" });
      const result = await sdk.uploadFile(blob, "test.txt");
      expect(result.name).toBe("test.txt");
    });

    it("lists files", async () => {
      const files = [
        {
          id: "f1",
          userId: "u1",
          name: "test.txt",
          size: 1024,
          mimeType: "text/plain",
          createdAt: "2024-01-01",
        },
      ];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ success: true, data: files }),
      });

      const sdk = new DraSDK({ baseUrl: "http://localhost:3000" });
      const result = await sdk.listFiles();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("test.txt");
    });
  });

  describe("embeddings", () => {
    it("returns embeddings", async () => {
      const response = {
        model: "text-embedding-3",
        embeddings: [[0.1, 0.2, 0.3]],
        usage: { promptTokens: 10, totalTokens: 10 },
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ success: true, data: response }),
      });

      const sdk = new DraSDK({ baseUrl: "http://localhost:3000" });
      const result = await sdk.embed({
        model: "text-embedding-3",
        input: ["hello"],
      });
      expect(result.embeddings).toHaveLength(1);
    });
  });

  describe("validate", () => {
    it("returns valid result", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ success: true, data: { valid: true } }),
      });

      const sdk = new DraSDK({ baseUrl: "http://localhost:3000" });
      const result = await sdk.validate({
        schema: { type: "object" },
        data: { name: "Alice" },
      });
      expect(result.valid).toBe(true);
    });

    it("returns invalid with errors", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({
          success: true,
          data: { valid: false, errors: ["name is required"] },
        }),
      });

      const sdk = new DraSDK({ baseUrl: "http://localhost:3000" });
      const result = await sdk.validate({
        schema: { type: "object" },
        data: {},
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("name is required");
    });
  });

  describe("openai proxy", () => {
    it("chat completions", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({
          success: true,
          data: { id: "chat-1", choices: [{ message: { content: "Hi" } }] },
        }),
      });

      const sdk = new DraSDK({ baseUrl: "http://localhost:3000" });
      const result = await sdk.openaiChatCompletions({
        model: "gpt-4",
        messages: [{ role: "user", content: "Hello" }],
      });
      expect(result).toBeDefined();
    });

    it("embeddings", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({
          success: true,
          data: { data: [{ embedding: [0.1] }] },
        }),
      });

      const sdk = new DraSDK({ baseUrl: "http://localhost:3000" });
      const result = await sdk.openaiEmbeddings({
        model: "text-embedding-3",
        input: "hello",
      });
      expect(result).toBeDefined();
    });

    it("list models", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({
          success: true,
          data: { data: [{ id: "gpt-4" }] },
        }),
      });

      const sdk = new DraSDK({ baseUrl: "http://localhost:3000" });
      const result = await sdk.openaiListModels();
      expect(result).toBeDefined();
    });
  });

  describe("admin extended", () => {
    it("circuit breakers", async () => {
      const breakers = [
        { provider: "openai", state: "closed", failureCount: 0 },
      ];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ success: true, data: breakers }),
      });

      const sdk = new DraSDK({ baseUrl: "http://localhost:3000" });
      const result = await sdk.adminCircuitBreakers();
      expect(result[0].provider).toBe("openai");
    });

    it("provider health", async () => {
      const health = [
        {
          provider: "openai",
          healthy: true,
          latency: 120,
          lastCheck: "2024-01-01",
        },
      ];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ success: true, data: health }),
      });

      const sdk = new DraSDK({ baseUrl: "http://localhost:3000" });
      const result = await sdk.adminProviderHealth();
      expect(result[0].healthy).toBe(true);
    });
  });

  describe("public health", () => {
    it("provider health summary", async () => {
      const summary = [{ provider: "openai", status: "healthy", models: 10 }];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ success: true, data: summary }),
      });

      const sdk = new DraSDK({ baseUrl: "http://localhost:3000" });
      const result = await sdk.providerHealth();
      expect(result[0].models).toBe(10);
    });
  });

  describe("integration: authenticated auth flow", () => {
    it("login → me → api keys", async () => {
      // Login
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({
          "content-type": "application/json",
          "x-request-id": "login-1",
        }),
        json: async () => ({
          success: true,
          data: {
            user: {
              id: "u1",
              name: "Alice",
              email: "alice@example.com",
              role: "user",
              createdAt: "2024-01-01",
            },
            token: "jwt-test",
          },
        }),
      });
      // Me
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({
          "content-type": "application/json",
          "x-request-id": "me-1",
        }),
        json: async () => ({
          success: true,
          data: {
            id: "u1",
            name: "Alice",
            email: "alice@example.com",
            role: "user",
            createdAt: "2024-01-01",
          },
        }),
      });
      // List keys
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({
          "content-type": "application/json",
          "x-request-id": "keys-1",
        }),
        json: async () => ({
          success: true,
          data: [
            {
              id: "k1",
              userId: "u1",
              name: "Production",
              key: "dra-test",
              createdAt: "2024-01-01",
            },
          ],
        }),
      });

      const sdk = new DraSDK({
        baseUrl: "http://localhost:3000",
        apiKey: "test-key",
        retries: 0,
      });

      const auth = await sdk.login({
        email: "alice@example.com",
        password: "pass",
      });
      expect(auth.user.email).toBe("alice@example.com");
      expect(sdk.lastRequestId()).toBe("login-1");

      const user = await sdk.me();
      expect(user.email).toBe("alice@example.com");
      expect(sdk.lastRequestId()).toBe("me-1");

      const keys = await sdk.listKeys();
      expect(keys).toHaveLength(1);
      expect(keys[0].name).toBe("Production");
      expect(sdk.lastRequestId()).toBe("keys-1");
    });
  });
});
