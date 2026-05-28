import { ApiResponse } from "./types";
import type {
  Provider,
  ProviderKey,
  ModelRegistry,
  ModelAlias,
  CreditAdjustment,
  UsageRecord,
  UsageDaily,
  SystemSetting,
  FeatureFlag,
  AuditLog,
  IPListEntry,
  IPAccessLog,
  SuspiciousActivity,
  ImpersonationSession,
  Announcement,
  UserAnnouncement,
  PromoCode,
  PromoRedemption,
  UserGroup,
  ScheduledReport,
  ChangelogEntry,
  SSOConfig,
  ProviderPlugin,
  RateLimitTier,
  RBACPermission,
  RBACRole,
  CostBreakdown,
  DashboardStats,
  MessageStats,
} from "@/types/admin";
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
  monthlyBudget?: number;
  dailyBudget?: number;
  dailySpent: number;
  monthlySpent: number;
  budgetResetAt?: string;
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

export interface BudgetConfig {
  id: string;
  userId: string;
  monthlyLimit: number;
  dailyLimit: number;
  notifyAtPercent: number;
  updatedAt: string;
}

export interface BudgetAlert {
  id: string;
  userId: string;
  thresholdPercent: number;
  alertType: string;
  isActive: boolean;
  createdAt: string;
}

export interface BudgetCap {
  id: string;
  userId: string;
  hardLimit: number;
  softLimit?: number;
  actionOnExceed: string;
  isActive: boolean;
  createdAt: string;
}

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  model: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationMessage {
  id: string;
  conversationId: string;
  role: string;
  content: string;
  createdAt: string;
}

export interface Prompt {
  name: string;
  content: string;
  description?: string;
  template: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Webhook {
  id: string;
  userId: string;
  url: string;
  secret?: string;
  events: string[];
  headers?: Record<string, string>;
  active: boolean;
  createdAt: string;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  eventType: string;
  statusCode?: number;
  error?: string;
  attempts: number;
  maxAttempts: number;
  status: string;
  deliveredAt?: string;
  nextRetryAt?: string;
  createdAt: string;
}

export interface Organization {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrgMember {
  userId: string;
  name: string;
  email: string;
  role: string;
}

export interface BatchJob {
  id: string;
  userId: string;
  status: string;
  items?: unknown;
  results?: unknown;
  error?: string;
  progress: number;
  total: number;
  createdAt: string;
  startedAt?: string;
  endedAt?: string;
}

export interface FileInfo {
  id: string;
  userId: string;
  name: string;
  size: number;
  mimeType: string;
  createdAt: string;
}

export interface EmbeddingResponse {
  model: string;
  embeddings: number[][];
  usage: {
    promptTokens: number;
    totalTokens: number;
  };
}

export interface NotificationEvent {
  type: string;
  title?: string;
  message?: string;
  read?: boolean;
  payload?: {
    type?: string;
    title?: string;
    body?: string;
    message?: string;
    id?: string;
    priority?: string;
  };
  time?: string;
}

export interface CircuitBreakerStatus {
  provider: string;
  state: string;
  failureCount: number;
  lastFailure?: string;
}

export interface ProviderHealthStatus {
  provider: string;
  healthy: boolean;
  latency: number;
  lastCheck: string;
}

export interface ProviderSummary {
  provider: string;
  status: string;
  models: number;
}

export interface Comparison {
  id: string;
  userId: string;
  modelA: string;
  modelB: string;
  prompt: string;
  resultA?: string;
  resultB?: string;
  latencyA?: number;
  latencyB?: number;
  costA?: number;
  costB?: number;
  tokensA?: number;
  tokensB?: number;
  status: string;
  createdAt: string;
}

export interface FineTuningJob {
  id: string;
  userId: string;
  baseModel: string;
  datasetId?: string;
  status: "queued" | "running" | "completed" | "failed";
  resultModelId?: string;
  hyperparams?: unknown;
  progress: number;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
}

export interface FineTuningDataset {
  id: string;
  userId: string;
  filename: string;
  mimeType?: string;
  size: number;
  storageKey: string;
  format: string;
  createdAt: string;
}

export interface ExportJob {
  id: string;
  userId: string;
  type: string;
  format: string;
  status: "pending" | "processing" | "completed" | "failed";
  filePath?: string;
  createdAt: string;
  completedAt?: string;
}

export interface AdminMessage {
  id: string;
  title: string;
  body: string;
  priority: string;
  targetType: string;
  targetIds: string[];
  sentBy: string;
  senderEmail: string;
  sentAt: string;
  expiresAt?: string;
  createdAt: string;
  readCount: number;
}

export interface UserMessage {
  id: string;
  title: string;
  body: string;
  priority: string;
  senderEmail: string;
  sentAt: string;
  expiresAt?: string;
  isRead: boolean;
}

// SDK configuration
export interface DraSDKConfig {
  baseUrl?: string;
  apiKey?: string;
  timeout?: number;
  retries?: number;
}

// RateLimitInfo from response headers.
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
}

class DraSDK {
  private baseUrl: string;
  private apiKey?: string;
  private timeout: number;
  private retries: number;
  private _requestCounter: number = 0;
  private _lastRequestId: string = "";
  private _lastRateLimit: RateLimitInfo = { limit: 0, remaining: 0, reset: 0 };

  constructor(config: DraSDKConfig = {}) {
    this.baseUrl = config.baseUrl || "";
    this.apiKey = config.apiKey;
    this.timeout = config.timeout || 30000;
    this.retries = config.retries ?? 2;
  }

  setApiKey(key: string) {
    this.apiKey = key;
  }

  lastRequestId(): string {
    return this._lastRequestId;
  }

  lastRateLimitInfo(): RateLimitInfo {
    return { ...this._lastRateLimit };
  }

  private extractResponseHeaders(res: Response) {
    this._lastRequestId = res.headers.get("x-request-id") || "";
    const limit = res.headers.get("x-ratelimit-limit");
    const remaining = res.headers.get("x-ratelimit-remaining");
    const reset = res.headers.get("x-ratelimit-reset");
    if (limit) this._lastRateLimit.limit = parseInt(limit, 10) || 0;
    if (remaining) this._lastRateLimit.remaining = parseInt(remaining, 10) || 0;
    if (reset) this._lastRateLimit.reset = parseInt(reset, 10) || 0;
  }

  private headers(): HeadersInit {
    // Use counter-based IDs to avoid UUID collisions and enable tracing
    const requestId = `req-${++this._requestCounter}-${Date.now()}`;
    const h: Record<string, string> = {
      "Content-Type": "application/json",
      "x-request-id": requestId,
    };
    if (this.apiKey) {
      h["x-api-key"] = this.apiKey;
    }
    return h;
  }

  private async fetchWithTimeout(
    url: string,
    init: RequestInit,
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

  public async request<T>(
    method: string,
    path: string,
    body?: unknown,
    query?: Record<string, string | number | undefined>,
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
        this.extractResponseHeaders(res);

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
          throw this.mapError(res.status, json.error || res.statusText);
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
        // Don't retry non-idempotent methods unless it's a rate limit (429)
        const isIdempotent = method === "GET" || method === "HEAD";
        if (!isIdempotent && !(err instanceof ApiError && err.status === 429)) {
          throw err;
        }
        if (attempt < this.retries) {
          await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 500));
        }
      }
    }
    throw lastError || new ApiError("Request failed");
  }

  public async paginatedRequest<T>(
    path: string,
    query: { page?: number; limit?: number } = {},
  ): Promise<PaginatedResult<T>> {
    let url = `${this.baseUrl}${path}`;
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined) params.set(k, String(v));
    }
    const qs = params.toString();
    if (qs) url += `?${qs}`;

    const init: RequestInit = {
      method: "GET",
      headers: this.headers(),
      credentials: "include",
    };

    let lastError: Error | undefined;
    for (let attempt = 0; attempt <= this.retries; attempt++) {
      try {
        const res = await this.fetchWithTimeout(url, init);
        this.extractResponseHeaders(res);

        const contentType = res.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) {
          if (!res.ok) {
            const text = await res.text();
            throw this.mapError(res.status, text || res.statusText);
          }
          return res as unknown as PaginatedResult<T>;
        }

        let json: ApiResponse<T[]>;
        try {
          json = (await res.json()) as ApiResponse<T[]>;
        } catch {
          throw this.mapError(res.status, "Invalid JSON response");
        }
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
      } catch (err) {
        lastError = err as Error;
        if (err instanceof ApiError) {
          if (err.status < 500 && err.status !== 429) {
            throw err;
          }
        }
        if (err instanceof DOMException && err.name === "AbortError") {
          throw new ApiError("Request timeout", 408);
        }
        if (attempt < this.retries) {
          await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 500));
        }
      }
    }
    throw lastError || new ApiError("Request failed");
  }

  // Health
  health() {
    return this.request<{ status: string; version: string }>("GET", "/health");
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
    return this.request<{ updated: boolean }>("PUT", "/api/auth/profile", data);
  }

  changePassword(data: { currentPassword: string; newPassword: string }) {
    return this.request<{ updated: boolean }>(
      "PUT",
      "/api/auth/password",
      data,
    );
  }

  logout() {
    return this.request<{ logged_out: boolean }>("POST", "/api/auth/logout");
  }

  deleteAccount() {
    return this.request<{ deleted: boolean }>("DELETE", "/api/account");
  }

  getMyPermissions() {
    return this.request<string[]>("GET", "/api/permissions/me");
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
      `/api/keys/${encodeURIComponent(id)}`,
    );
  }

  revokeKey(id: string) {
    return this.request<{ revoked: boolean }>(
      "POST",
      `/api/keys/${encodeURIComponent(id)}/revoke`,
    );
  }

  updateKey(
    id: string,
    data: {
      name?: string;
      allowedModels?: string[];
      allowedIPs?: string[];
      maxTokensPerRequest?: number;
    },
  ) {
    return this.request<{ updated: boolean }>(
      "PUT",
      `/api/keys/${encodeURIComponent(id)}`,
      data,
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
      data,
    );
  }

  // Transactions
  listTransactions(page?: number, limit?: number) {
    return this.paginatedRequest<CreditTransaction>("/api/transactions", {
      page,
      limit,
    });
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
    this.extractResponseHeaders(res);

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
              // Skip malformed JSON chunks
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
      `/api/admin/users/${encodeURIComponent(id)}`,
    );
  }

  adminStats() {
    return this.request<PlatformStats>("GET", "/api/admin/stats");
  }

  // Auth — Extended

  oauthLogin(data: { provider: string; code: string }) {
    return this.request<AuthResponse>("POST", "/api/auth/oauth", data);
  }

  forgotPassword(data: { email: string }) {
    return this.request<{ sent: boolean }>(
      "POST",
      "/api/auth/forgot-password",
      data,
    );
  }

  resetPassword(data: { token: string; newPassword: string }) {
    return this.request<{ updated: boolean }>(
      "POST",
      "/api/auth/reset-password",
      data,
    );
  }

  // Budget

  getBudget() {
    return this.request<BudgetConfig>("GET", "/api/credits/budget");
  }

  setBudget(data: Partial<BudgetConfig>) {
    return this.request<BudgetConfig>("PUT", "/api/credits/budget", data);
  }

  // Budget Alerts & Caps

  listBudgetAlerts() {
    return this.request<BudgetAlert[]>("GET", "/api/budget/alerts");
  }

  createBudgetAlert(data: { thresholdPercent: number; alertType?: string }) {
    return this.request<BudgetAlert>("POST", "/api/budget/alerts", data);
  }

  deleteBudgetAlert(id: string) {
    return this.request<{ deleted: boolean }>(
      "DELETE",
      `/api/budget/alerts/${encodeURIComponent(id)}`,
    );
  }

  getBudgetCap() {
    return this.request<BudgetCap>("GET", "/api/budget/cap");
  }

  createBudgetCap(data: {
    hardLimit: number;
    softLimit?: number;
    actionOnExceed?: string;
  }) {
    return this.request<BudgetCap>("POST", "/api/budget/cap", data);
  }

  updateBudgetCap(data: {
    hardLimit: number;
    softLimit?: number;
    actionOnExceed?: string;
  }) {
    return this.request<BudgetCap>("PUT", "/api/budget/cap", data);
  }

  deleteBudgetCap() {
    return this.request<{ deleted: boolean }>("DELETE", "/api/budget/cap");
  }

  // Conversations

  listConversations(page?: number, limit?: number) {
    return this.paginatedRequest<Conversation>("/api/conversations", {
      page,
      limit,
    });
  }

  createConversation(data: { title: string; model: string }) {
    return this.request<Conversation>("POST", "/api/conversations", data);
  }

  getConversation(id: string) {
    return this.request<Conversation>(
      "GET",
      `/api/conversations/${encodeURIComponent(id)}`,
    );
  }

  deleteConversation(id: string) {
    return this.request<{ deleted: boolean }>(
      "DELETE",
      `/api/conversations/${encodeURIComponent(id)}`,
    );
  }

  addMessage(conversationId: string, data: { role: string; content: string }) {
    return this.request<ConversationMessage>(
      "POST",
      `/api/conversations/${encodeURIComponent(conversationId)}/messages`,
      data,
    );
  }

  updateConversationTitle(id: string, title: string) {
    return this.request<{ updated: boolean }>(
      "PUT",
      `/api/conversations/${encodeURIComponent(id)}/title`,
      { title },
    );
  }

  // Prompts

  listPrompts() {
    return this.request<Prompt[]>("GET", "/api/prompts");
  }

  createPrompt(data: {
    name: string;
    content: string;
    description?: string;
    template?: boolean;
  }) {
    return this.request<Prompt>("POST", "/api/prompts", data);
  }

  getPrompt(name: string) {
    return this.request<Prompt>(
      "GET",
      `/api/prompts/${encodeURIComponent(name)}`,
    );
  }

  renderPrompt(name: string, variables: Record<string, string>) {
    return this.request<{ rendered: string }>(
      "POST",
      `/api/prompts/${encodeURIComponent(name)}/render`,
      { variables },
    );
  }

  deletePrompt(name: string) {
    return this.request<{ deleted: boolean }>(
      "DELETE",
      `/api/prompts/${encodeURIComponent(name)}`,
    );
  }

  // Webhooks

  listWebhooks() {
    return this.request<Webhook[]>("GET", "/api/webhooks");
  }

  createWebhook(data: {
    url: string;
    secret?: string;
    events: string[];
    headers?: Record<string, string>;
  }) {
    return this.request<Webhook>("POST", "/api/webhooks", data);
  }

  getWebhook(id: string) {
    return this.request<Webhook>(
      "GET",
      `/api/webhooks/${encodeURIComponent(id)}`,
    );
  }

  updateWebhook(id: string, data: Partial<Webhook>) {
    return this.request<Webhook>(
      "PUT",
      `/api/webhooks/${encodeURIComponent(id)}`,
      data,
    );
  }

  deleteWebhook(id: string) {
    return this.request<{ deleted: boolean }>(
      "DELETE",
      `/api/webhooks/${encodeURIComponent(id)}`,
    );
  }

  listWebhookDeliveries(webhookId: string) {
    return this.request<WebhookDelivery[]>(
      "GET",
      `/api/webhooks/${encodeURIComponent(webhookId)}/deliveries`,
    );
  }

  // Organizations

  listOrganizations() {
    return this.request<Organization[]>("GET", "/api/organizations");
  }

  createOrganization(data: { name: string }) {
    return this.request<Organization>("POST", "/api/organizations", data);
  }

  getOrganization(id: string) {
    return this.request<Organization>(
      "GET",
      `/api/organizations/${encodeURIComponent(id)}`,
    );
  }

  inviteMember(orgId: string, data: { email: string; role?: string }) {
    return this.request<{ invited: boolean }>(
      "POST",
      `/api/organizations/${encodeURIComponent(orgId)}/invite`,
      data,
    );
  }

  removeMember(orgId: string, userId: string) {
    return this.request<{ removed: boolean }>(
      "DELETE",
      `/api/organizations/${encodeURIComponent(orgId)}/members/${encodeURIComponent(userId)}`,
    );
  }

  listMembers(orgId: string) {
    return this.request<OrgMember[]>(
      "GET",
      `/api/organizations/${encodeURIComponent(orgId)}/members`,
    );
  }

  acceptInvite(data: { token: string }) {
    return this.request<{ accepted: boolean }>(
      "POST",
      "/api/invites/accept",
      data,
    );
  }

  // Batch

  submitBatch(data: {
    requests: Array<{ model: string; messages: ChatMessage[] }>;
  }) {
    return this.request<BatchJob>("POST", "/api/batch", data);
  }

  getBatchJob(id: string) {
    return this.request<BatchJob>(
      "GET",
      `/api/batch/${encodeURIComponent(id)}`,
    );
  }

  listBatchJobs() {
    return this.request<BatchJob[]>("GET", "/api/batch");
  }

  cancelBatchJob(id: string) {
    return this.request<{ cancelled: boolean }>(
      "DELETE",
      `/api/batch/${encodeURIComponent(id)}`,
    );
  }

  // Files

  private async uploadFormData(
    path: string,
    formData: FormData,
  ): Promise<Response> {
    // Don't set Content-Type for FormData — the runtime (browser or Node.js 20+)
    // sets it automatically with the correct multipart boundary.
    const headers: Record<string, string> = {};
    if (this.apiKey) {
      headers["x-api-key"] = this.apiKey;
    }
    // In Node.js <21, native FormData may not auto-set Content-Type.
    // Detect if boundary is missing and set it manually.
    if (typeof FormData !== "undefined" && typeof Request !== "undefined") {
      try {
        const test = new Request("http://localhost", {
          method: "POST",
          body: formData,
        });
        const ct = test.headers.get("content-type");
        if (ct) {
          headers["content-type"] = ct;
        }
      } catch {
        // Fall through — let fetch() handle it
      }
    }
    return this.fetchWithTimeout(`${this.baseUrl}${path}`, {
      method: "POST",
      headers,
      credentials: "include",
      body: formData,
    });
  }

  async uploadFile(file: File | Blob, name?: string): Promise<FileInfo> {
    const formData = new FormData();
    if (name) {
      formData.append("name", name);
    }
    formData.append("file", file);
    const res = await this.uploadFormData("/api/files/upload", formData);
    this.extractResponseHeaders(res);
    const json = (await res.json()) as ApiResponse<FileInfo>;
    if (!res.ok || !json.success) {
      throw this.mapError(res.status, json.error || res.statusText);
    }
    return json.data as FileInfo;
  }

  listFiles() {
    return this.request<FileInfo[]>("GET", "/api/files");
  }

  // Embeddings

  embed(data: { model: string; input: string[] }) {
    return this.request<EmbeddingResponse>("POST", "/api/embeddings", data);
  }

  // Validate

  validate(data: { schema: unknown; data: unknown }) {
    return this.request<{ valid: boolean; errors?: string[] }>(
      "POST",
      "/api/validate",
      data,
    );
  }

  // Notifications

  async *notificationsStream(): AsyncGenerator<
    NotificationEvent,
    void,
    unknown
  > {
    const url = `${this.baseUrl}/api/notifications/stream`;
    const res = await this.fetchWithTimeout(url, {
      method: "GET",
      headers: this.headers(),
      credentials: "include",
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
            try {
              const parsed = JSON.parse(payload) as NotificationEvent;
              yield parsed;
            } catch {
              // Skip malformed JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  // OpenAI-Compatible Proxy

  openaiChatCompletions(body: unknown) {
    return this.request<unknown>("POST", "/v1/chat/completions", body);
  }

  openaiEmbeddings(body: unknown) {
    return this.request<unknown>("POST", "/v1/embeddings", body);
  }

  openaiListModels() {
    return this.request<unknown>("GET", "/v1/models");
  }

  // Admin — Extended

  adminCircuitBreakers() {
    return this.request<CircuitBreakerStatus[]>(
      "GET",
      "/api/admin/circuit-breakers",
    );
  }

  adminProviderHealth() {
    return this.request<ProviderHealthStatus[]>(
      "GET",
      "/api/admin/provider-health",
    );
  }

  // Admin Messages

  adminListMessages(page?: number, limit?: number) {
    return this.paginatedRequest<AdminMessage>("/api/admin/messages", {
      page,
      limit,
    });
  }

  adminCreateMessage(data: {
    title: string;
    body: string;
    priority?: string;
    targetType: string;
    targetIds?: string[];
    expiresAt?: string;
  }) {
    return this.request<AdminMessage>("POST", "/api/admin/messages", data);
  }

  adminGetMessage(id: string) {
    return this.request<AdminMessage>(
      "GET",
      `/api/admin/messages/${encodeURIComponent(id)}`,
    );
  }

  adminGetMessageStats(id: string) {
    return this.request<MessageStats>(
      "GET",
      `/api/admin/messages/${encodeURIComponent(id)}/stats`,
    );
  }

  adminUpdateMessage(
    id: string,
    data: Partial<{
      title: string;
      body: string;
      priority: string;
      targetType: string;
      targetIds: string[];
      expiresAt: string;
    }>,
  ) {
    return this.request<AdminMessage>(
      "PUT",
      `/api/admin/messages/${encodeURIComponent(id)}`,
      data,
    );
  }

  adminDeleteMessage(id: string) {
    return this.request<{ deleted: boolean }>(
      "DELETE",
      `/api/admin/messages/${encodeURIComponent(id)}`,
    );
  }

  // User Messages (Inbox)

  getUserMessages() {
    return this.request<UserMessage[]>("GET", "/api/messages");
  }

  getUserMessageUnreadCount() {
    return this.request<{ unread: number }>(
      "GET",
      "/api/messages/unread-count",
    );
  }

  markMessageRead(id: string) {
    return this.request<{ marked: boolean }>(
      "POST",
      `/api/messages/${encodeURIComponent(id)}/read`,
    );
  }

  markAllMessagesRead() {
    return this.request<{ marked: number }>("POST", "/api/messages/read-all");
  }

  // User Announcements

  getUserAnnouncements() {
    return this.request<UserAnnouncement[]>("GET", "/api/announcements");
  }

  // Comparisons

  listComparisons(page?: number, limit?: number) {
    return this.paginatedRequest<Comparison>("/api/comparisons", {
      page,
      limit,
    });
  }

  createComparison(data: { modelA: string; modelB: string; prompt: string }) {
    return this.request<Comparison>("POST", "/api/comparisons", data);
  }

  getComparison(id: string) {
    return this.request<Comparison>(
      "GET",
      `/api/comparisons/${encodeURIComponent(id)}`,
    );
  }

  deleteComparison(id: string) {
    return this.request<{ deleted: boolean }>(
      "DELETE",
      `/api/comparisons/${encodeURIComponent(id)}`,
    );
  }

  // Fine-tuning

  listFineTuningJobs(page?: number, limit?: number) {
    return this.paginatedRequest<FineTuningJob>("/api/fine-tuning/jobs", {
      page,
      limit,
    });
  }

  getFineTuningJob(jobId: string) {
    return this.request<FineTuningJob>(
      "GET",
      `/api/fine-tuning/jobs/${encodeURIComponent(jobId)}`,
    );
  }

  createFineTuningJob(data: {
    baseModel: string;
    datasetId: string;
    hyperparams?: unknown;
  }) {
    return this.request<FineTuningJob>("POST", "/api/fine-tuning/jobs", data);
  }

  listFineTuningDatasets() {
    return this.request<FineTuningDataset[]>(
      "GET",
      "/api/fine-tuning/datasets",
    );
  }

  createFineTuningDataset(data: { filename: string; format: string }) {
    return this.request<FineTuningDataset>(
      "POST",
      "/api/fine-tuning/datasets",
      data,
    );
  }

  deleteFineTuningDataset(id: string) {
    return this.request<{ deleted: boolean }>(
      "DELETE",
      `/api/fine-tuning/datasets/${encodeURIComponent(id)}`,
    );
  }

  // Exports

  listExportJobs(page?: number, limit?: number) {
    return this.paginatedRequest<ExportJob>("/api/exports", { page, limit });
  }

  createExportJob(data: {
    type: string;
    format: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    return this.request<ExportJob>("POST", "/api/exports", data);
  }

  getExportJob(id: string) {
    return this.request<ExportJob>(
      "GET",
      `/api/exports/${encodeURIComponent(id)}`,
    );
  }

  downloadExport(id: string): Promise<Response> {
    return this.fetchWithTimeout(
      `${this.baseUrl}/api/exports/${encodeURIComponent(id)}/download`,
      {
        method: "GET",
        headers: this.headers(),
        credentials: "include",
      },
    );
  }

  // Promo Codes

  redeemPromoCode(code: string) {
    return this.request<{ success: boolean; credits: number }>(
      "POST",
      "/api/promos/redeem",
      { code },
    );
  }

  // Admin — Extended

  adminDashboard() {
    return this.request<PlatformStats>("GET", "/api/admin/dashboard");
  }

  adminGetUser(id: string) {
    return this.request<User>(
      "GET",
      `/api/admin/users/${encodeURIComponent(id)}`,
    );
  }

  adminUpdateUserStatus(id: string, status: string) {
    return this.request<{ updated: boolean }>(
      "PUT",
      `/api/admin/users/${encodeURIComponent(id)}/status`,
      { status },
    );
  }

  adminUpdateUserRole(id: string, role: string) {
    return this.request<{ updated: boolean }>(
      "PUT",
      `/api/admin/users/${encodeURIComponent(id)}/role`,
      { role },
    );
  }

  adminStartImpersonation(id: string, data?: { reason?: string }) {
    return this.request<ImpersonationSession>(
      "POST",
      `/api/admin/users/${encodeURIComponent(id)}/impersonate`,
      data,
    );
  }

  adminStopImpersonation(sessionId: string) {
    return this.request<{ ended: boolean }>(
      "POST",
      `/api/admin/impersonations/${encodeURIComponent(sessionId)}/stop`,
    );
  }

  adminBulkSuspendUsers(userIds: string[], reason?: string) {
    return this.request<{ suspended: number }>(
      "POST",
      "/api/admin/users/bulk/suspend",
      { userIds, reason },
    );
  }

  adminListUserKeys(userId: string) {
    return this.request<APIKey[]>(
      "GET",
      `/api/admin/users/${encodeURIComponent(userId)}/keys`,
    );
  }

  adminListUserUsage(userId: string) {
    return this.request<AnalyticsData>(
      "GET",
      `/api/admin/users/${encodeURIComponent(userId)}/usage`,
    );
  }

  adminListProviders() {
    return this.request<ProviderSummary[]>("GET", "/api/admin/providers");
  }

  adminCreateProvider(data: {
    name: string;
    displayName?: string;
    providerType?: string;
    baseUrl: string;
    apiKey?: string;
    models?: Array<{
      modelId: string;
      displayName: string;
      description?: string;
      contextWindow?: number;
      inputPricePer1k?: number;
      outputPricePer1k?: number;
      capabilities?: string[];
    }>;
  }) {
    return this.request<{ id: string; name: string }>(
      "POST",
      "/api/admin/providers",
      data,
    );
  }

  adminFetchModels(data: { baseUrl: string; apiKey?: string }) {
    return this.request<{
      models: Array<{ id: string; object?: string; owned_by?: string }>;
      total: number;
    }>("POST", "/api/admin/providers/fetch-models", data);
  }

  adminAddProviderKey(
    providerId: string,
    data: { label: string; key: string; strategy?: string; weight?: number },
  ) {
    return this.request<{ id: string }>(
      "POST",
      `/api/admin/providers/${encodeURIComponent(providerId)}/keys`,
      data,
    );
  }

  adminGetProvider(id: string) {
    return this.request<Provider>(
      "GET",
      `/api/admin/providers/${encodeURIComponent(id)}`,
    );
  }

  adminUpdateProvider(id: string, data: Partial<Provider>) {
    return this.request<{ status: string }>(
      "PUT",
      `/api/admin/providers/${encodeURIComponent(id)}`,
      data,
    );
  }

  adminUpdateProviderStatus(id: string, status: string) {
    return this.request<{ status: string }>(
      "PUT",
      `/api/admin/providers/${encodeURIComponent(id)}/status`,
      { status },
    );
  }

  adminListProviderKeys(providerId: string) {
    return this.request<ProviderKey[]>(
      "GET",
      `/api/admin/providers/${encodeURIComponent(providerId)}/keys`,
    );
  }

  adminDeleteProviderKey(providerId: string, keyId: string) {
    return this.request<{ status: string }>(
      "DELETE",
      `/api/admin/providers/${encodeURIComponent(providerId)}/keys/${encodeURIComponent(keyId)}`,
    );
  }

  adminReorderProviderKeys(providerId: string, keyIds: string[]) {
    return this.request<{ status: string }>(
      "PUT",
      `/api/admin/providers/${encodeURIComponent(providerId)}/keys/reorder`,
      { keyIds },
    );
  }

  adminDeleteProvider(id: string) {
    return this.request<{ status: string }>(
      "DELETE",
      `/api/admin/providers/${encodeURIComponent(id)}`,
    );
  }

  // Admin — Models

  adminListModels(status?: string) {
    return this.request<ModelRegistry[]>(
      "GET",
      "/api/admin/models",
      undefined,
      status ? { status } : undefined,
    );
  }

  adminCreateModel(data: Partial<ModelRegistry>) {
    return this.request<ModelRegistry>("POST", "/api/admin/models", data);
  }

  adminGetModel(id: string) {
    return this.request<ModelRegistry>(
      "GET",
      `/api/admin/models/${encodeURIComponent(id)}`,
    );
  }

  adminUpdateModel(id: string, data: Partial<ModelRegistry>) {
    return this.request<{ status: string }>(
      "PUT",
      `/api/admin/models/${encodeURIComponent(id)}`,
      data,
    );
  }

  adminUpdateModelStatus(id: string, status: string) {
    return this.request<{ status: string }>(
      "PUT",
      `/api/admin/models/${encodeURIComponent(id)}/status`,
      { status },
    );
  }

  adminDeleteModel(id: string) {
    return this.request<{ status: string }>(
      "DELETE",
      `/api/admin/models/${encodeURIComponent(id)}`,
    );
  }

  // Admin — Aliases

  adminListAliases() {
    return this.request<ModelAlias[]>("GET", "/api/admin/aliases");
  }

  adminCreateAlias(data: Partial<ModelAlias>) {
    return this.request<ModelAlias>("POST", "/api/admin/aliases", data);
  }

  adminUpdateAlias(id: string, data: Partial<ModelAlias>) {
    return this.request<{ status: string }>(
      "PUT",
      `/api/admin/aliases/${encodeURIComponent(id)}`,
      data,
    );
  }

  adminDeleteAlias(id: string) {
    return this.request<{ status: string }>(
      "DELETE",
      `/api/admin/aliases/${encodeURIComponent(id)}`,
    );
  }

  // Admin — Billing

  adminRevenueSummary(from?: string, to?: string) {
    return this.request<unknown[]>(
      "GET",
      "/api/admin/billing/summary",
      undefined,
      { from, to } as Record<string, string | number | undefined>,
    );
  }

  adminListTransactions(params?: Record<string, string | number | undefined>) {
    return this.paginatedRequest<UsageRecord>(
      "/api/admin/billing/transactions",
      params as { page?: number; limit?: number },
    );
  }

  adminAdjustCredits(userId: string, amount: number, reason: string) {
    return this.request<CreditAdjustment>(
      "POST",
      "/api/admin/billing/credits/adjust",
      { userId, amount, reason },
    );
  }

  adminUsageDaily(params?: Record<string, string | number | undefined>) {
    return this.request<UsageDaily[]>(
      "GET",
      "/api/admin/billing/usage-daily",
      undefined,
      params,
    );
  }

  adminListAdjustments(userId: string, page?: number, limit?: number) {
    return this.paginatedRequest<CreditAdjustment>(
      `/api/admin/users/${encodeURIComponent(userId)}/adjustments`,
      { page, limit },
    );
  }

  // Admin — Settings & Feature Flags

  adminListSettings(group?: string) {
    return this.request<SystemSetting[]>(
      "GET",
      "/api/admin/settings",
      undefined,
      group ? { group } : undefined,
    );
  }

  adminUpdateSetting(key: string, value: unknown) {
    return this.request<{ updated: boolean }>(
      "PUT",
      `/api/admin/settings/${encodeURIComponent(key)}`,
      { value },
    );
  }

  adminListFeatureFlags() {
    return this.request<FeatureFlag[]>("GET", "/api/admin/feature-flags");
  }

  adminCreateFeatureFlag(data: Partial<FeatureFlag>) {
    return this.request<FeatureFlag>("POST", "/api/admin/feature-flags", data);
  }

  adminToggleFeatureFlag(id: string, enabled: boolean) {
    return this.request<{ updated: boolean }>(
      "PUT",
      `/api/admin/feature-flags/${encodeURIComponent(id)}`,
      { enabled },
    );
  }

  // Admin — Security

  adminListSuspicious(params?: Record<string, string | number | undefined>) {
    return this.paginatedRequest<SuspiciousActivity>(
      "/api/admin/security/suspicious",
      params as { page?: number; limit?: number },
    );
  }

  adminReviewSuspicious(id: number, action: string) {
    return this.request<{ reviewed: boolean }>(
      "PUT",
      `/api/admin/security/suspicious/${id}`,
      { action },
    );
  }

  adminListIPEntries(action?: string) {
    return this.request<IPListEntry[]>(
      "GET",
      "/api/admin/ip",
      undefined,
      action ? { action } : undefined,
    );
  }

  adminAddIPEntry(data: Partial<IPListEntry>) {
    return this.request<{ created: boolean }>("POST", "/api/admin/ip", data);
  }

  adminRemoveIPEntry(id: string) {
    return this.request<{ deleted: boolean }>(
      "DELETE",
      `/api/admin/ip/${encodeURIComponent(id)}`,
    );
  }

  adminListIPAccessLogs(params?: Record<string, string | number | undefined>) {
    return this.paginatedRequest<IPAccessLog>(
      "/api/admin/logs/ip-access",
      params as { page?: number; limit?: number },
    );
  }

  // Admin — Audit & Announcements

  adminListAuditLogs(params?: Record<string, string | number | undefined>) {
    return this.paginatedRequest<AuditLog>(
      "/api/admin/audit",
      params as { page?: number; limit?: number },
    );
  }

  adminListAnnouncements() {
    return this.request<Announcement[]>("GET", "/api/admin/announcements");
  }

  adminCreateAnnouncement(data: Partial<Announcement>) {
    return this.request<Announcement>("POST", "/api/admin/announcements", data);
  }

  // Admin — Promo Codes

  adminListPromoCodes() {
    return this.request<PromoCode[]>("GET", "/api/admin/promos");
  }

  adminCreatePromoCode(data: Partial<PromoCode>) {
    return this.request<PromoCode>("POST", "/api/admin/promos", data);
  }

  adminCreatePromoCodeCustom(data: Partial<PromoCode>) {
    return this.request<PromoCode>("POST", "/api/admin/promos/custom", data);
  }

  adminTogglePromoStatus(id: string, isActive: boolean) {
    return this.request<{ isActive: boolean }>(
      "PUT",
      `/api/admin/promos/${encodeURIComponent(id)}/toggle`,
      { isActive },
    );
  }

  adminListPromoRedemptions(promoId: string) {
    return this.request<PromoRedemption[]>(
      "GET",
      `/api/admin/promos/${encodeURIComponent(promoId)}/redemptions`,
    );
  }

  // Admin — Groups, Reports, Changelog

  adminListGroups() {
    return this.request<UserGroup[]>("GET", "/api/admin/groups");
  }

  adminCreateGroup(data: Partial<UserGroup>) {
    return this.request<UserGroup>("POST", "/api/admin/groups", data);
  }

  adminListScheduledReports() {
    return this.request<ScheduledReport[]>("GET", "/api/admin/reports");
  }

  adminListChangelog(drafts?: boolean) {
    return this.request<ChangelogEntry[]>(
      "GET",
      "/api/admin/changelog",
      undefined,
      drafts !== undefined ? { drafts: String(drafts) } : undefined,
    );
  }

  adminCreateChangelog(data: Partial<ChangelogEntry>) {
    return this.request<ChangelogEntry>("POST", "/api/admin/changelog", data);
  }

  adminPublishChangelog(id: string) {
    return this.request<{ published: boolean }>(
      "POST",
      `/api/admin/changelog/${encodeURIComponent(id)}/publish`,
    );
  }

  // Admin — Admin Users & SSO

  adminListAdminUsers() {
    return this.request<{ userId: string; role: string }[]>(
      "GET",
      "/api/admin/admins",
    );
  }

  adminCreateAdminUser(userId: string, role: string) {
    return this.request<{ status: string }>("POST", "/api/admin/admins", {
      userId,
      role,
    });
  }

  adminRemoveAdmin(id: string) {
    return this.request<{ removed: boolean }>(
      "DELETE",
      `/api/admin/admins/${encodeURIComponent(id)}`,
    );
  }

  adminListSSOConfigs() {
    return this.request<SSOConfig[]>("GET", "/api/admin/sso");
  }

  // Admin — Cost, Cache, Webhooks

  adminCostOptimizations() {
    return this.request<unknown[]>("GET", "/api/admin/cost/optimizations");
  }

  adminCostForecast() {
    return this.request<unknown>("GET", "/api/admin/cost/forecast");
  }

  adminCostBreakdown() {
    return this.request<CostBreakdown>("GET", "/api/admin/cost/breakdown");
  }

  adminCacheStats() {
    return this.request<unknown>("GET", "/api/admin/cache/stats");
  }

  adminClearCache() {
    return this.request<{ cleared: boolean }>("POST", "/api/admin/cache/clear");
  }

  adminListWebhookLogs() {
    return this.request<unknown>("GET", "/api/admin/webhooks/logs");
  }

  adminRetryWebhook(id: string) {
    return this.request<{ status: string }>(
      "POST",
      `/api/admin/webhooks/${encodeURIComponent(id)}/retry`,
    );
  }

  // Admin — RBAC

  adminListPermissions() {
    return this.request<RBACPermission[]>("GET", "/api/admin/rbac/permissions");
  }

  adminListRoles() {
    return this.request<RBACRole[]>("GET", "/api/admin/rbac/roles");
  }

  adminGetRolePermissions(role: string) {
    return this.request<string[]>(
      "GET",
      `/api/admin/rbac/roles/${encodeURIComponent(role)}/permissions`,
    );
  }

  adminAddRolePermission(role: string, permissionName: string) {
    return this.request<{ added: boolean }>(
      "POST",
      `/api/admin/rbac/roles/${encodeURIComponent(role)}/permissions`,
      { permissionName },
    );
  }

  adminRemoveRolePermission(role: string, permission: string) {
    return this.request<{ removed: boolean }>(
      "DELETE",
      `/api/admin/rbac/roles/${encodeURIComponent(role)}/permissions/${encodeURIComponent(permission)}`,
    );
  }

  // Admin — Rate Limits

  adminListRateLimitTiers() {
    return this.request<RateLimitTier[]>("GET", "/api/admin/rate-limits/tiers");
  }

  adminUpdateTierLimits(
    tier: string,
    data: {
      rpm?: number;
      daily?: number;
      monthly?: number;
      maxTokens?: number;
    },
  ) {
    return this.request<{ updated: boolean }>(
      "PUT",
      `/api/admin/rate-limits/tiers/${encodeURIComponent(tier)}`,
      data,
    );
  }

  adminSetUserTier(userId: string, tier: string) {
    return this.request<{ updated: boolean }>(
      "PUT",
      `/api/admin/users/${encodeURIComponent(userId)}/tier`,
      { tier },
    );
  }

  // Admin — Provider Plugins

  adminListPlugins() {
    return this.request<ProviderPlugin[]>("GET", "/api/admin/plugins");
  }

  adminCreatePlugin(data: Partial<ProviderPlugin>) {
    return this.request<ProviderPlugin>("POST", "/api/admin/plugins", data);
  }

  adminGetPlugin(id: string) {
    return this.request<ProviderPlugin>(
      "GET",
      `/api/admin/plugins/${encodeURIComponent(id)}`,
    );
  }

  adminTogglePlugin(id: string, active: boolean) {
    return this.request<{ updated: boolean }>(
      "PUT",
      `/api/admin/plugins/${encodeURIComponent(id)}/toggle`,
      { active },
    );
  }

  adminDeletePlugin(id: string) {
    return this.request<{ deleted: boolean }>(
      "DELETE",
      `/api/admin/plugins/${encodeURIComponent(id)}`,
    );
  }

  // Admin — Dashboard Stats

  adminDashboardStats() {
    return this.request<DashboardStats>("GET", "/api/admin/dashboard");
  }

  // Auth — Admin Login

  adminLogin(data: { email: string; password: string }) {
    return this.request<AuthResponse>("POST", "/api/auth/admin-login", data);
  }

  // Anthropic-Compatible Proxy

  anthropicMessages(body: unknown) {
    return this.request<unknown>("POST", "/v1/messages", body);
  }

  // Files — Delete

  deleteFile(id: string) {
    return this.request<{ deleted: boolean }>(
      "DELETE",
      `/api/files/${encodeURIComponent(id)}`,
    );
  }

  // Public Health

  providerHealth() {
    return this.request<ProviderSummary[]>("GET", "/health/providers");
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

// Re-export admin types for convenience
export type {
  AdminRole,
  ProviderStatus,
  ProviderKeyStrategy,
  ModelStatus,
  UserStatus,
  AuditSeverity,
  AdminUser,
  AdminUserDetail,
  Provider,
  ProviderKey,
  ModelRegistry,
  ModelAlias,
  CreditAdjustment,
  UsageRecord,
  UsageDaily,
  SystemSetting,
  FeatureFlag,
  AuditLog,
  IPListEntry,
  IPAccessLog,
  SuspiciousActivity,
  ImpersonationSession,
  Announcement,
  UserAnnouncement,
  PromoCode,
  PromoRedemption,
  UserGroup,
  ScheduledReport,
  ChangelogEntry,
  SSOConfig,
  ProviderPlugin,
  RateLimitTier,
  RBACPermission,
  RBACRole,
  MessageStats,
  CostBreakdown,
  DashboardStats,
} from "@/types/admin";
