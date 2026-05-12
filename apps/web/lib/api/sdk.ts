import { ApiResponse } from "./types";
import {
  ApiError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  BadRequestError,
  RateLimitError,
  PaymentRequiredError,
} from "./errors";

// Domain types matching Go backend
export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface APIKey {
  id: string;
  userId: string;
  name: string;
  key?: string;
  lastUsed?: string;
  createdAt: string;
  revokedAt?: string;
}

export interface APILog {
  id: string;
  userId: string;
  apiKeyId?: string;
  model: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  latency: number;
  status: string;
  errorMessage?: string;
  createdAt: string;
}

export interface UserCredits {
  id: string;
  userId: string;
  balance: number;
  totalPurchased: number;
  totalSpent: number;
  updatedAt: string;
}

export interface CreditTransaction {
  id: string;
  userId: string;
  amount: number;
  type: string;
  description: string;
  relatedLogId?: string;
  createdAt: string;
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  inputPricePer1k: number;
  outputPricePer1k: number;
  contextWindow: number;
  description: string;
  capabilities: string[];
}

export interface ChatMessage {
  role: string;
  content: string;
}

export interface ChatCompletionChunk {
  choices: Array<{
    delta: { content?: string };
    finish_reason?: string;
  }>;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AnalyticsData {
  summary: {
    totalRequests: number;
    successRequests: number;
    errorRequests: number;
  };
  recentLogs: APILog[];
  modelBreakdown: Array<{ model: string; count: number; totalCost: number }>;
  dailyUsage: Array<{
    date: string;
    requests: number;
    cost: number;
    tokens: number;
  }>;
}

export interface PlatformStats {
  users: { total: number };
  apiKeys: { total: number };
  logs: { total: number; success: number; error: number };
  credits: {
    totalBalance: number;
    totalPurchased: number;
    totalSpent: number;
  };
  recentActivity: APILog[];
}

// SDK configuration
export interface DraSDKConfig {
  baseUrl?: string;
  apiKey?: string;
  timeout?: number;
  retries?: number;
}

class DraSDK {
  private baseUrl: string;
  private apiKey?: string;
  private timeout: number;
  private retries: number;

  constructor(config: DraSDKConfig = {}) {
    this.baseUrl = config.baseUrl || "";
    this.apiKey = config.apiKey;
    this.timeout = config.timeout || 30000;
    this.retries = config.retries ?? 2;
  }

  setApiKey(key: string) {
    this.apiKey = key;
  }

  private headers(): HeadersInit {
    const h: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.apiKey) {
      h["x-api-key"] = this.apiKey;
    }
    return h;
  }

  private async fetchWithTimeout(
    url: string,
    init: RequestInit
  ): Promise<Response> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), this.timeout);
    try {
      const res = await fetch(url, { ...init, signal: controller.signal });
      return res;
    } finally {
      clearTimeout(id);
    }
  }

  private mapError(status: number, message: string): ApiError {
    switch (status) {
      case 400:
        return new BadRequestError(message);
      case 401:
        return new UnauthorizedError(message);
      case 403:
        return new ForbiddenError(message);
      case 404:
        return new NotFoundError(message);
      case 402:
        return new PaymentRequiredError(message);
      case 429:
        return new RateLimitError(message);
      default:
        return new ApiError(message, status);
    }
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    query?: Record<string, string | number | undefined>
  ): Promise<T> {
    let url = `${this.baseUrl}${path}`;
    if (query) {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined) params.set(k, String(v));
      }
      const qs = params.toString();
      if (qs) url += `?${qs}`;
    }

    const init: RequestInit = {
      method,
      headers: this.headers(),
      credentials: "include",
    };

    if (body !== undefined) {
      init.body = JSON.stringify(body);
    }

    let lastError: Error | undefined;
    for (let attempt = 0; attempt <= this.retries; attempt++) {
      try {
        const res = await this.fetchWithTimeout(url, init);

        // For non-JSON responses (like SSE streams), return raw response
        const contentType = res.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) {
          if (!res.ok) {
            const text = await res.text();
            throw this.mapError(res.status, text || res.statusText);
          }
          return res as unknown as T;
        }

        const json = (await res.json()) as ApiResponse<T>;

        if (!res.ok || !json.success) {
          throw this.mapError(
            res.status,
            json.error || res.statusText
          );
        }

        return json.data as T;
      } catch (err) {
        lastError = err as Error;
        // Don't retry on client errors (4xx) except 429
        if (err instanceof ApiError) {
          if (err.status < 500 && err.status !== 429) {
            throw err;
          }
        }
        // Don't retry on abort
        if (err instanceof DOMException && err.name === "AbortError") {
          throw new ApiError("Request timeout", 408);
        }
        if (attempt < this.retries) {
          await new Promise((r) =>
            setTimeout(r, Math.pow(2, attempt) * 500)
          );
        }
      }
    }
    throw lastError || new ApiError("Request failed");
  }

  private async paginatedRequest<T>(
    path: string,
    query: { page?: number; limit?: number } = {}
  ): Promise<PaginatedResult<T>> {
    let url = `${this.baseUrl}${path}`;
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined) params.set(k, String(v));
    }
    const qs = params.toString();
    if (qs) url += `?${qs}`;

    const res = await this.fetchWithTimeout(url, {
      method: "GET",
      headers: this.headers(),
      credentials: "include",
    });

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      if (!res.ok) {
        const text = await res.text();
        throw this.mapError(res.status, text || res.statusText);
      }
      return res as unknown as PaginatedResult<T>;
    }

    const json = (await res.json()) as ApiResponse<T[]>;
    if (!res.ok || !json.success) {
      throw this.mapError(res.status, json.error || res.statusText);
    }

    return {
      data: (json.data ?? []) as T[],
      total: json.meta?.total ?? 0,
      page: json.meta?.page ?? 1,
      limit: json.meta?.limit ?? 20,
      totalPages: json.meta?.totalPages ?? 1,
    };
  }

  // Health
  health() {
    return this.request<{ status: string; version: string }>(
      "GET",
      "/health"
    );
  }

  // Auth
  signup(data: { name: string; email: string; password: string }) {
    return this.request<User>("POST", "/api/auth/signup", data);
  }

  login(data: { email: string; password: string }) {
    return this.request<AuthResponse>("POST", "/api/auth/login", data);
  }

  me() {
    return this.request<User>("GET", "/api/auth/me");
  }

  updateProfile(data: { name: string; email: string }) {
    return this.request<{ updated: boolean }>(
      "PUT",
      "/api/auth/profile",
      data
    );
  }

  changePassword(data: {
    currentPassword: string;
    newPassword: string;
  }) {
    return this.request<{ updated: boolean }>(
      "PUT",
      "/api/auth/password",
      data
    );
  }

  // API Keys
  listKeys() {
    return this.request<APIKey[]>("GET", "/api/keys");
  }

  createKey(data: { name: string }) {
    return this.request<APIKey>("POST", "/api/keys", data);
  }

  deleteKey(id: string) {
    return this.request<{ deleted: boolean }>(
      "DELETE",
      `/api/keys/${encodeURIComponent(id)}`
    );
  }

  revokeKey(id: string) {
    return this.request<{ revoked: boolean }>(
      "POST",
      `/api/keys/${encodeURIComponent(id)}/revoke`
    );
  }

  // Credits
  getCredits() {
    return this.request<UserCredits>("GET", "/api/credits");
  }

  purchaseCredits(data: { amount: number; description?: string }) {
    return this.request<CreditTransaction>(
      "POST",
      "/api/credits/purchase",
      data
    );
  }

  // Transactions
  listTransactions(page?: number, limit?: number) {
    return this.paginatedRequest<CreditTransaction>(
      "/api/transactions",
      { page, limit }
    );
  }

  // Logs
  listLogs(page?: number, limit?: number) {
    return this.paginatedRequest<APILog>("/api/logs", {
      page,
      limit,
    });
  }

  // Analytics
  getAnalytics() {
    return this.request<AnalyticsData>("GET", "/api/analytics");
  }

  // Models
  listModels() {
    return this.request<ModelInfo[]>("GET", "/api/models");
  }

  // Chat (non-streaming)
  chat(data: { model: string; messages: ChatMessage[] }) {
    return this.request<ChatCompletionChunk>("POST", "/api/chat", data);
  }

  // Chat streaming with parsed SSE chunks
  async *chatStream(data: {
    model: string;
    messages: ChatMessage[];
  }): AsyncGenerator<string, void, unknown> {
    const url = `${this.baseUrl}/api/chat`;
    const res = await this.fetchWithTimeout(url, {
      method: "POST",
      headers: this.headers(),
      credentials: "include",
      body: JSON.stringify(data),
    });

    if (!res.ok || !res.body) {
      const text = await res.text();
      throw this.mapError(res.status, text || res.statusText);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const payload = line.slice(6);
            if (payload === "[DONE]") return;
            try {
              const parsed = JSON.parse(payload) as ChatCompletionChunk;
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                yield content;
              }
            } catch {
              // If not valid JSON, yield raw payload
              yield payload;
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  // Admin
  adminListUsers(page?: number, limit?: number) {
    return this.paginatedRequest<User>("/api/admin/users", {
      page,
      limit,
    });
  }

  adminDeleteUser(id: string) {
    return this.request<{ deleted: boolean }>(
      "DELETE",
      `/api/admin/users/${encodeURIComponent(id)}`
    );
  }

  adminStats() {
    return this.request<PlatformStats>("GET", "/api/admin/stats");
  }
}

// Singleton instance for convenience
let defaultSDK = new DraSDK();

export function configureSDK(config: DraSDKConfig) {
  defaultSDK = new DraSDK(config);
}

export function getSDK() {
  return defaultSDK;
}

export { DraSDK };
