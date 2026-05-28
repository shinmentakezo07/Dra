import {
  pgTable,
  text,
  timestamp,
  date,
  uuid,
  integer,
  boolean,
  index,
  jsonb,
  bigint,
  bigserial,
  numeric,
  doublePrecision,
  primaryKey,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ============================================================================
// Core Tables
// ============================================================================

export const rateLimitTiers = pgTable(
  "rate_limit_tiers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull().unique(),
    rpm: integer("rpm").default(60).notNull(),
    tpm: integer("tpm").default(100000).notNull(),
    rpd: integer("rpd").default(1000000).notNull(),
    concurrent: integer("concurrent").default(10).notNull(),
    monthlyBudget: bigint("monthly_budget", { mode: "number" })
      .default(0)
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    nameIdx: index("idx_rate_limit_tiers_name").on(table.name),
  }),
);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    password: text("password"),
    role: text("role", { enum: ["user", "admin", "superadmin"] })
      .default("user")
      .notNull(),
    status: text("status").default("active").notNull(),
    tier: text("tier").notNull().default("free"),
    rateLimitTierId: uuid("rate_limit_tier_id").references(
      () => rateLimitTiers.id,
    ),
    rateLimitOverrides: jsonb("rate_limit_overrides").default("{}"),
    lastLoginIp: text("last_login_ip").default(""),
    lastLoginAt: timestamp("last_login_at"),
    notes: text("notes").default(""),
    tags: text("tags").array().default([]),
    suspendedBy: uuid("suspended_by"),
    metadata: jsonb("metadata").default("{}"),
    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    emailIdx: index("idx_users_email").on(table.email),
    statusIdx: index("idx_users_status").on(table.status),
    rateLimitTierIdx: index("idx_users_rate_limit_tier").on(
      table.rateLimitTierId,
    ),
    tagsIdx: index("idx_users_tags").using("gin", table.tags),
  }),
);

export const apiKeys = pgTable(
  "api_keys",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),
    name: text("name").notNull(),
    key: text("key").notNull().unique(),
    lastUsed: timestamp("last_used"),
    allowedModels: text("allowed_models").array(),
    allowedIps: text("allowed_ips").array(),
    maxTokensPerRequest: integer("max_tokens_per_request"),
    dailyRequestLimit: integer("daily_request_limit"),
    monthlyTokenLimit: integer("monthly_token_limit"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    revokedAt: timestamp("revoked_at"),
  },
  (table) => ({
    userIdIdx: index("api_keys_user_id_idx").on(table.userId),
    keyIdx: index("idx_api_keys_key").on(table.key),
  }),
);

export const apiLogs = pgTable(
  "api_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),
    apiKeyId: uuid("api_key_id").references(() => apiKeys.id),
    model: text("model").notNull(),
    provider: text("provider").notNull(),
    inputTokens: integer("input_tokens").notNull(),
    outputTokens: integer("output_tokens").notNull(),
    cost: integer("cost").notNull(),
    latency: integer("latency").notNull(),
    status: text("status", { enum: ["success", "error"] }).notNull(),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("api_logs_user_id_idx").on(table.userId),
    apiKeyIdIdx: index("api_logs_api_key_id_idx").on(table.apiKeyId),
    createdAtIdx: index("api_logs_created_at_idx").on(table.createdAt),
    modelIdx: index("api_logs_model_idx").on(table.model),
  }),
);

export const userCredits = pgTable(
  "user_credits",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull()
      .unique(),
    balance: integer("balance").default(0).notNull(),
    totalPurchased: integer("total_purchased").default(0).notNull(),
    totalSpent: integer("total_spent").default(0).notNull(),
    monthlyBudget: integer("monthly_budget"),
    dailyBudget: integer("daily_budget"),
    dailySpent: integer("daily_spent").default(0).notNull(),
    monthlySpent: integer("monthly_spent").default(0).notNull(),
    budgetResetAt: timestamp("budget_reset_at"),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("user_credits_user_id_idx").on(table.userId),
  }),
);

export const creditTransactions = pgTable(
  "credit_transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),
    amount: integer("amount").notNull(),
    type: text("type", {
      enum: ["purchase", "usage", "refund", "bonus"],
    }).notNull(),
    description: text("description").notNull(),
    relatedLogId: uuid("related_log_id").references(() => apiLogs.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("credit_transactions_user_id_idx").on(table.userId),
    createdAtIdx: index("credit_transactions_created_at_idx").on(
      table.createdAt,
    ),
  }),
);

// ============================================================================
// Conversations & Prompts
// ============================================================================

export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),
    title: text("title").default("New Conversation").notNull(),
    model: text("model").default("openai/gpt-4o").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("idx_conversations_user_id").on(table.userId),
    updatedAtIdx: index("idx_conversations_updated_at").on(table.updatedAt),
  }),
);

export const conversationMessages = pgTable(
  "conversation_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conversationId: uuid("conversation_id")
      .references(() => conversations.id)
      .notNull(),
    role: text("role").notNull(),
    content: text("content").notNull(),
    inputTokens: integer("input_tokens").default(0).notNull(),
    outputTokens: integer("output_tokens").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    conversationIdIdx: index("idx_conversation_messages_conv_id").on(
      table.conversationId,
    ),
    createdAtIdx: index("idx_conversation_messages_created_at").on(
      table.createdAt,
    ),
  }),
);

export const prompts = pgTable(
  "prompts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    version: integer("version").default(1).notNull(),
    template: text("template").notNull(),
    model: text("model"),
    config: jsonb("config"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    nameIdx: index("idx_prompts_name").on(table.name),
    nameVersionUnique: uniqueIndex("idx_prompts_name_version").on(
      table.name,
      table.version,
    ),
  }),
);

// ============================================================================
// Webhooks
// ============================================================================

export const webhooks = pgTable(
  "webhooks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),
    url: text("url").notNull(),
    secret: text("secret"),
    events: text("events").array().default([]).notNull(),
    headers: jsonb("headers"),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("idx_webhooks_user_id").on(table.userId),
  }),
);

export const webhookDeliveries = pgTable(
  "webhook_deliveries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    webhookId: uuid("webhook_id")
      .references(() => webhooks.id)
      .notNull(),
    eventType: text("event_type").notNull(),
    payload: jsonb("payload").notNull(),
    statusCode: integer("status_code"),
    error: text("error"),
    attempts: integer("attempts").default(0).notNull(),
    maxAttempts: integer("max_attempts").default(5).notNull(),
    status: text("status", { enum: ["pending", "delivered", "failed"] })
      .default("pending")
      .notNull(),
    deliveredAt: timestamp("delivered_at"),
    nextRetryAt: timestamp("next_retry_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    webhookIdIdx: index("idx_webhook_deliveries_webhook_id").on(
      table.webhookId,
    ),
    eventTypeIdx: index("idx_webhook_deliveries_event_type").on(
      table.eventType,
    ),
    createdAtIdx: index("idx_webhook_deliveries_created_at").on(
      table.createdAt,
    ),
    statusIdx: index("idx_webhook_deliveries_status").on(table.status),
    nextRetryIdx: index("idx_webhook_deliveries_next_retry").on(
      table.nextRetryAt,
    ),
  }),
);

export const webhookDeliveryLogs = pgTable("webhook_delivery_logs", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  webhookId: uuid("webhook_id")
    .references(() => webhooks.id)
    .notNull(),
  eventType: text("event_type").notNull(),
  payload: jsonb("payload"),
  responseStatus: integer("response_status"),
  durationMs: integer("duration_ms").default(0).notNull(),
  success: boolean("success").default(false).notNull(),
  attempt: integer("attempt").default(1).notNull(),
  idempotencyKey: text("idempotency_key"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const webhookTests = pgTable("webhook_tests", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventType: text("event_type").notNull(),
  samplePayload: jsonb("sample_payload").default("{}"),
  targetUrl: text("target_url").notNull(),
  responseStatus: integer("response_status"),
  createdBy: uuid("created_by")
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ============================================================================
// Organizations
// ============================================================================

export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    ownerId: uuid("owner_id")
      .references(() => users.id)
      .notNull(),
    plan: text("plan").default("free").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    ownerIdIdx: index("idx_organizations_owner_id").on(table.ownerId),
  }),
);

export const orgMembers = pgTable(
  "org_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .references(() => organizations.id)
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),
    role: text("role").default("member").notNull(),
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
  },
  (table) => ({
    orgIdIdx: index("idx_org_members_org_id").on(table.orgId),
    userIdIdx: index("idx_org_members_user_id").on(table.userId),
    orgUserUnique: uniqueIndex("idx_org_members_org_user").on(
      table.orgId,
      table.userId,
    ),
  }),
);

export const invites = pgTable(
  "invites",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .references(() => organizations.id)
      .notNull(),
    email: text("email").notNull(),
    role: text("role").default("member").notNull(),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    orgIdIdx: index("idx_invites_org_id").on(table.orgId),
    tokenIdx: index("idx_invites_token").on(table.token),
  }),
);

// ============================================================================
// Files & Billing
// ============================================================================

export const files = pgTable(
  "files",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),
    filename: text("filename").notNull(),
    mimeType: text("mime_type").notNull(),
    size: bigint("size", { mode: "number" }).default(0).notNull(),
    storageKey: text("storage_key").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("idx_files_user_id").on(table.userId),
    createdAtIdx: index("idx_files_created_at").on(table.createdAt),
  }),
);

export const stripeCustomers = pgTable(
  "stripe_customers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull()
      .unique(),
    stripeCustomerId: text("stripe_customer_id").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("idx_stripe_customers_user_id").on(table.userId),
  }),
);

export const stripeInvoices = pgTable(
  "stripe_invoices",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),
    stripeInvoiceId: text("stripe_invoice_id").notNull(),
    amount: integer("amount").notNull(),
    status: text("status").default("pending").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("idx_stripe_invoices_user_id").on(table.userId),
  }),
);

// ============================================================================
// Password Resets
// ============================================================================

export const passwordResets = pgTable(
  "password_resets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull(),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    tokenIdx: index("idx_password_resets_token").on(table.token),
    emailIdx: index("idx_password_resets_email").on(table.email),
  }),
);

// ============================================================================
// Batch Jobs
// ============================================================================

export const batchJobs = pgTable(
  "batch_jobs",
  {
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),
    status: text("status").default("pending").notNull(),
    items: jsonb("items").default("[]").notNull(),
    results: jsonb("results").default("[]").notNull(),
    error: text("error"),
    progress: integer("progress").default(0).notNull(),
    total: integer("total").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    startedAt: timestamp("started_at"),
    endedAt: timestamp("ended_at"),
  },
  (table) => ({
    userIdIdx: index("idx_batch_jobs_user_id").on(table.userId),
    statusIdx: index("idx_batch_jobs_status").on(table.status),
  }),
);

// ============================================================================
// Providers
// ============================================================================

export const providers = pgTable(
  "providers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull().unique(),
    displayName: text("display_name").notNull(),
    providerType: text("provider_type").default("openai").notNull(),
    baseUrl: text("base_url").notNull(),
    status: text("status").default("active").notNull(),
    priority: integer("priority").default(0).notNull(),
    timeoutMs: integer("timeout_ms").default(30000).notNull(),
    circuitBreakerEnabled: boolean("circuit_breaker_enabled")
      .default(true)
      .notNull(),
    circuitBreakerThreshold: integer("circuit_breaker_threshold")
      .default(5)
      .notNull(),
    circuitBreakerRecoveryMs: integer("circuit_breaker_recovery_ms")
      .default(30000)
      .notNull(),
    circuitBreakerHalfOpenMax: integer("circuit_breaker_half_open_max")
      .default(3)
      .notNull(),
    maxRetries: integer("max_retries").default(3).notNull(),
    rateLimitRpm: integer("rate_limit_rpm").default(0).notNull(),
    rateLimitTpm: integer("rate_limit_tpm").default(0).notNull(),
    metadata: jsonb("metadata").default("{}"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    statusIdx: index("idx_providers_status").on(table.status),
    typeIdx: index("idx_providers_type").on(table.providerType),
    priorityIdx: index("idx_providers_priority").on(table.priority),
  }),
);

export const providerKeys = pgTable(
  "provider_keys",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    providerId: uuid("provider_id")
      .references(() => providers.id)
      .notNull(),
    label: text("label").default("").notNull(),
    keyPrefix: text("key_prefix").default("").notNull(),
    keyHash: text("key_hash").notNull(),
    keyLastFour: text("key_last_four").default("").notNull(),
    strategy: text("strategy").default("round-robin").notNull(),
    weight: integer("weight").default(1).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    fillCurrent: integer("fill_current").default(0).notNull(),
    rpmLimit: integer("rpm_limit").default(0).notNull(),
    tpmLimit: integer("tpm_limit").default(0).notNull(),
    monthlyQuota: bigint("monthly_quota", { mode: "number" })
      .default(0)
      .notNull(),
    monthlyUsed: bigint("monthly_used", { mode: "number" })
      .default(0)
      .notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    usageCount: bigint("usage_count", { mode: "number" }).default(0).notNull(),
    totalTokens: bigint("total_tokens", { mode: "number" })
      .default(0)
      .notNull(),
    lastUsedAt: timestamp("last_used_at"),
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    providerIdIdx: index("idx_provider_keys_provider_id").on(table.providerId),
    activeIdx: index("idx_provider_keys_active").on(
      table.providerId,
      table.isActive,
    ),
    strategyIdx: index("idx_provider_keys_strategy").on(table.strategy),
    sortOrderIdx: index("idx_provider_keys_sort_order").on(
      table.providerId,
      table.sortOrder,
    ),
  }),
);

export const providerKeyUsageLogs = pgTable(
  "provider_key_usage_logs",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    keyId: uuid("key_id")
      .references(() => providerKeys.id)
      .notNull(),
    providerId: uuid("provider_id")
      .references(() => providers.id)
      .notNull(),
    requestId: text("request_id").notNull(),
    userId: text("user_id").default("").notNull(),
    model: text("model").default("").notNull(),
    tokens: integer("tokens").default(0).notNull(),
    durationMs: integer("duration_ms").default(0).notNull(),
    statusCode: integer("status_code").default(0).notNull(),
    error: text("error").default("").notNull(),
    cost: integer("cost").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    requestIdCreatedAtIdx: uniqueIndex("idx_pk_usage_request_id").on(
      table.requestId,
      table.createdAt,
    ),
    keyIdIdx: index("idx_pk_usage_key_id").on(table.keyId),
    providerIdIdx: index("idx_pk_usage_provider_id").on(table.providerId),
  }),
);

export const providerHealthChecks = pgTable(
  "provider_health_checks",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    providerId: uuid("provider_id")
      .references(() => providers.id)
      .notNull(),
    status: text("status").notNull(),
    latencyMs: integer("latency_ms").default(0).notNull(),
    error: text("error").default(""),
    checkedAt: timestamp("checked_at").defaultNow().notNull(),
  },
  (table) => ({
    providerIdx: index("idx_provider_health_provider").on(
      table.providerId,
      table.checkedAt,
    ),
  }),
);

// ============================================================================
// Model Registry
// ============================================================================

export const modelRegistry = pgTable(
  "model_registry",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    modelId: text("model_id").notNull().unique(),
    providerId: uuid("provider_id")
      .references(() => providers.id)
      .notNull(),
    displayName: text("display_name").notNull(),
    description: text("description").default(""),
    contextWindow: integer("context_window").default(4096).notNull(),
    maxOutput: integer("max_output").default(4096).notNull(),
    inputPricePer1k: numeric("input_price_per_1k", { precision: 12, scale: 8 })
      .default("0")
      .notNull(),
    outputPricePer1k: numeric("output_price_per_1k", {
      precision: 12,
      scale: 8,
    })
      .default("0")
      .notNull(),
    capabilities: text("capabilities").array().default([]),
    supportsVision: boolean("supports_vision").default(false).notNull(),
    supportsTools: boolean("supports_tools").default(false).notNull(),
    supportsThinking: boolean("supports_thinking").default(false).notNull(),
    status: text("status").default("active").notNull(),
    sunsetDate: timestamp("sunset_date"),
    replacementModelId: uuid("replacement_model_id"),
    metadata: jsonb("metadata").default("{}"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    modelIdIdx: index("idx_model_registry_model_id").on(table.modelId),
    providerIdx: index("idx_model_registry_provider").on(table.providerId),
    statusIdx: index("idx_model_registry_status").on(table.status),
  }),
);

export const modelAliases = pgTable(
  "model_aliases",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    alias: text("alias").notNull().unique(),
    targetModelId: uuid("target_model_id")
      .references(() => modelRegistry.id)
      .notNull(),
    preferredProviderId: uuid("preferred_provider_id").references(
      () => providers.id,
    ),
    preferredKeyId: uuid("preferred_key_id").references(() => providerKeys.id),
    rpmOverride: integer("rpm_override").default(0).notNull(),
    tpmOverride: integer("tpm_override").default(0).notNull(),
    monthlyBudget: bigint("monthly_budget", { mode: "number" })
      .default(0)
      .notNull(),
    allowedUserIds: text("allowed_user_ids").array().default([]),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    aliasIdx: index("idx_model_aliases_alias").on(table.alias),
    activeIdx: index("idx_model_aliases_active").on(table.isActive),
  }),
);

// ============================================================================
// Credit Adjustments (Admin)
// ============================================================================

export const creditAdjustments = pgTable(
  "credit_adjustments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),
    amount: integer("amount").notNull(),
    balanceBefore: integer("balance_before").default(0).notNull(),
    balanceAfter: integer("balance_after").default(0).notNull(),
    reason: text("reason").notNull(),
    adminId: uuid("admin_id")
      .references(() => users.id)
      .notNull(),
    referenceId: text("reference_id").default(""),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("idx_credit_adjustments_user").on(
      table.userId,
      table.createdAt,
    ),
  }),
);

// ============================================================================
// Usage Records
// ============================================================================

export const usageRecords = pgTable(
  "usage_records",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    // NOTE: userId is text (not UUID FK) for flexibility with non-UUID auth providers
    userId: text("user_id").notNull(),
    apiKeyId: text("api_key_id").default(""),
    providerId: uuid("provider_id").references(() => providers.id),
    requestId: text("request_id").notNull(),
    model: text("model").default("").notNull(),
    tokens: integer("tokens").default(0).notNull(),
    cost: integer("cost").default(0).notNull(),
    durationMs: integer("duration_ms").default(0).notNull(),
    statusCode: integer("status_code").default(0).notNull(),
    error: text("error").default(""),
    ipAddress: text("ip_address").default(""),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    requestIdCreatedAtIdx: uniqueIndex("idx_usage_records_request_id").on(
      table.requestId,
      table.createdAt,
    ),
    userIdx: index("idx_usage_records_user").on(table.userId, table.createdAt),
    providerIdx: index("idx_usage_records_provider").on(
      table.providerId,
      table.createdAt,
    ),
  }),
);

export const usageDaily = pgTable(
  "usage_daily",
  {
    date: date("date").notNull(),
    userId: text("user_id").default("").notNull(),
    providerId: uuid("provider_id"),
    modelId: text("model_id").default("").notNull(),
    apiKeyId: text("api_key_id").default("").notNull(),
    requestCount: integer("request_count").default(0).notNull(),
    tokens: bigint("tokens", { mode: "number" }).default(0).notNull(),
    cost: integer("cost").default(0).notNull(),
    errors: integer("errors").default(0).notNull(),
    latencyP50Ms: integer("latency_p50_ms").default(0).notNull(),
    latencyP95Ms: integer("latency_p95_ms").default(0).notNull(),
    latencyP99Ms: integer("latency_p99_ms").default(0).notNull(),
  },
  (table) => ({
    primaryKey: primaryKey({
      columns: [table.date, table.userId, table.modelId, table.apiKeyId],
    }),
  }),
);

// ============================================================================
// Admin & System
// ============================================================================

export const adminUsers = pgTable(
  "admin_users",
  {
    userId: uuid("user_id")
      .references(() => users.id)
      .primaryKey(),
    role: text("role").default("admin").notNull(),
    permissions: text("permissions").array().default([]),
    isActive: boolean("is_active").default(true).notNull(),
    createdBy: uuid("created_by")
      .references(() => users.id)
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    roleIdx: index("idx_admin_users_role").on(table.role),
    activeIdx: index("idx_admin_users_active").on(table.isActive),
  }),
);

export const adminRolePermissions = pgTable("admin_role_permissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  role: text("role").notNull().unique(),
  permissions: text("permissions").array().default([]).notNull(),
});

export const adminImpersonations = pgTable("admin_impersonations", {
  id: uuid("id").defaultRandom().primaryKey(),
  adminId: uuid("admin_id")
    .references(() => users.id)
    .notNull(),
  targetUserId: uuid("target_user_id")
    .references(() => users.id)
    .notNull(),
  reason: text("reason").default("").notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at"),
});

export const adminSessions = pgTable(
  "admin_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),
    tokenHash: text("token_hash").default("").notNull(),
    ipAddress: text("ip_address").default("").notNull(),
    userAgent: text("user_agent").default("").notNull(),
    status: text("status").default("active").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at"),
    revokedBy: uuid("revoked_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("idx_admin_sessions_user_id").on(
      table.userId,
      table.createdAt,
    ),
    statusIdx: index("idx_admin_sessions_status").on(
      table.status,
      table.expiresAt,
    ),
    tokenHashIdx: index("idx_admin_sessions_token_hash").on(table.tokenHash),
  }),
);

export const systemSettings = pgTable(
  "system_settings",
  {
    key: text("key").primaryKey(),
    value: jsonb("value").notNull(),
    type: text("type").default("string").notNull(),
    description: text("description").default(""),
    groupName: text("group_name").default("general"),
    isEncrypted: boolean("is_encrypted").default(false).notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    groupIdx: index("idx_system_settings_group").on(table.groupName),
  }),
);

export const featureFlags = pgTable(
  "feature_flags",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    key: text("key").notNull().unique(),
    name: text("name").notNull(),
    description: text("description").default(""),
    enabled: boolean("enabled").default(false).notNull(),
    targetedUserIds: text("targeted_user_ids").array().default([]),
    targetedTierIds: uuid("targeted_tier_ids").array().default([]),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    keyIdx: index("idx_feature_flags_key").on(table.key),
    enabledIdx: index("idx_feature_flags_enabled").on(table.enabled),
  }),
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    actorId: text("actor_id").notNull(),
    actorEmail: text("actor_email").default("").notNull(),
    action: text("action").notNull(),
    targetType: text("target_type").default("").notNull(),
    targetId: text("target_id").default("").notNull(),
    changes: jsonb("changes").default("{}"),
    ipAddress: text("ip_address").default(""),
    severity: text("severity").default("info").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    actorIdx: index("idx_audit_logs_actor").on(table.actorId, table.createdAt),
    actionIdx: index("idx_audit_logs_action").on(table.action, table.createdAt),
  }),
);

// ============================================================================
// Security (IP Lists, Access Logs, Suspicious Activities)
// ============================================================================

export const ipLists = pgTable(
  "ip_lists",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ipOrCidr: text("ip_or_cidr").notNull(),
    action: text("action").notNull(),
    scope: text("scope").default("global").notNull(),
    scopeId: text("scope_id").default(""),
    reason: text("reason").default(""),
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    actionIdx: index("idx_ip_lists_action").on(table.action),
    scopeIdx: index("idx_ip_lists_scope").on(table.scope, table.scopeId),
  }),
);

export const ipAccessLogs = pgTable(
  "ip_access_logs",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    ipAddress: text("ip_address").notNull(),
    userId: text("user_id").default(""),
    apiKeyId: text("api_key_id").default(""),
    method: text("method").default("").notNull(),
    path: text("path").default("").notNull(),
    userAgent: text("user_agent").default(""),
    country: text("country").default(""),
    isProxy: boolean("is_proxy").default(false).notNull(),
    blocked: boolean("blocked").default(false).notNull(),
    rateLimited: boolean("rate_limited").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    ipIdx: index("idx_ip_access_ip").on(table.ipAddress, table.createdAt),
    blockedIdx: index("idx_ip_access_blocked").on(
      table.blocked,
      table.createdAt,
    ),
  }),
);

export const suspiciousActivities = pgTable(
  "suspicious_activities",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    category: text("category").notNull(),
    severity: text("severity").default("medium").notNull(),
    userId: text("user_id").default(""),
    apiKeyId: text("api_key_id").default(""),
    ip: text("ip").default(""),
    details: jsonb("details").default("{}"),
    autoBlocked: boolean("auto_blocked").default(false).notNull(),
    reviewed: boolean("reviewed").default(false).notNull(),
    resolved: boolean("resolved").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    categoryIdx: index("idx_suspicious_category").on(
      table.category,
      table.createdAt,
    ),
    userIdx: index("idx_suspicious_user").on(table.userId),
    reviewedIdx: index("idx_suspicious_reviewed").on(
      table.reviewed,
      table.resolved,
    ),
  }),
);

// ============================================================================
// Announcements
// ============================================================================

export const announcements = pgTable("announcements", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  priority: text("priority").default("normal").notNull(),
  targetType: text("target_type").default("all").notNull(),
  targetIds: text("target_ids").array().default([]),
  startsAt: timestamp("starts_at").defaultNow().notNull(),
  endsAt: timestamp("ends_at"),
  showInApp: boolean("show_in_app").default(true).notNull(),
  sendEmail: boolean("send_email").default(false).notNull(),
  createdBy: uuid("created_by")
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================================================
// Admin Messages
// ============================================================================

export const adminMessages = pgTable(
  "admin_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    priority: text("priority").default("normal").notNull(),
    // Targeting: who receives this message
    targetType: text("target_type").default("all").notNull(), // all | user | tier | group
    targetIds: text("target_ids").array().default([]), // user IDs or tier names
    // Metadata
    sentBy: uuid("sent_by")
      .references(() => users.id)
      .notNull(),
    sentAt: timestamp("sent_at").defaultNow().notNull(),
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    sentByIdx: index("idx_admin_messages_sent_by").on(table.sentBy),
    targetTypeIdx: index("idx_admin_messages_target_type").on(table.targetType),
    sentAtIdx: index("idx_admin_messages_sent_at").on(table.sentAt),
  }),
);

export const adminMessageReads = pgTable(
  "admin_message_reads",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    messageId: uuid("message_id")
      .references(() => adminMessages.id)
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),
    readAt: timestamp("read_at").defaultNow().notNull(),
  },
  (table) => ({
    messageIdIdx: index("idx_admin_message_reads_message").on(table.messageId),
    userIdx: index("idx_admin_message_reads_user").on(table.userId),
    messageUserUnique: uniqueIndex("idx_admin_message_reads_unique").on(
      table.messageId,
      table.userId,
    ),
  }),
);

// ============================================================================
// Promo Codes
// ============================================================================

export const promoCodes = pgTable(
  "promo_codes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: text("code").notNull().unique(),
    type: text("type").notNull(),
    value: integer("value").default(0).notNull(),
    maxUses: integer("max_uses").default(0).notNull(),
    currentUses: integer("current_uses").default(0).notNull(),
    minPurchase: integer("min_purchase").default(0).notNull(),
    expiresAt: timestamp("expires_at"),
    isActive: boolean("is_active").default(true).notNull(),
    createdBy: uuid("created_by")
      .references(() => users.id)
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    activeIdx: index("idx_promo_codes_active").on(
      table.isActive,
      table.expiresAt,
    ),
  }),
);

export const promoRedemptions = pgTable(
  "promo_redemptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    promoId: uuid("promo_id")
      .references(() => promoCodes.id)
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),
    discount: integer("discount").default(0).notNull(),
    creditsAwarded: integer("credits_awarded").default(0).notNull(),
    redeemedAt: timestamp("redeemed_at").defaultNow().notNull(),
  },
  (table) => ({
    promoUserUnique: uniqueIndex("idx_promo_redemptions_unique").on(
      table.promoId,
      table.userId,
    ),
  }),
);

// ============================================================================
// SSO
// ============================================================================

export const ssoConfigs = pgTable("sso_configs", {
  id: uuid("id").defaultRandom().primaryKey(),
  provider: text("provider").notNull().unique(),
  label: text("label").notNull(),
  issuer: text("issuer").notNull(),
  clientId: text("client_id").notNull(),
  clientSecret: text("client_secret").default("").notNull(),
  allowedDomains: text("allowed_domains").array().default([]),
  autoProvision: boolean("auto_provision").default(false).notNull(),
  defaultRole: text("default_role").default("user").notNull(),
  metadata: jsonb("metadata").default("{}"),
  isActive: boolean("is_active").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================================================
// User Groups
// ============================================================================

export const userGroups = pgTable("user_groups", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description").default(""),
  createdBy: uuid("created_by")
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const userGroupMembers = pgTable(
  "user_group_members",
  {
    groupId: uuid("group_id")
      .references(() => userGroups.id)
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),
  },
  (table) => ({
    primaryKey: primaryKey({ columns: [table.groupId, table.userId] }),
  }),
);

export const groupPolicies = pgTable("group_policies", {
  id: uuid("id").defaultRandom().primaryKey(),
  groupId: uuid("group_id")
    .references(() => userGroups.id)
    .notNull(),
  policyType: text("policy_type").notNull(),
  settings: jsonb("settings").default("{}").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ============================================================================
// Scheduled Reports
// ============================================================================

export const scheduledReports = pgTable("scheduled_reports", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  frequency: text("frequency").notNull(),
  format: text("format").default("json").notNull(),
  sections: text("sections").array().default([]).notNull(),
  recipients: text("recipients").array().default([]).notNull(),
  nextSendAt: timestamp("next_send_at"),
  lastSentAt: timestamp("last_sent_at"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================================================
// API Changelog
// ============================================================================

export const apiChangelog = pgTable("api_changelog", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  version: text("version").default("").notNull(),
  type: text("type").notNull(),
  publishedAt: timestamp("published_at"),
  isDraft: boolean("is_draft").default(true).notNull(),
  createdBy: uuid("created_by")
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================================================
// Usage Alerts
// ============================================================================

export const usageAlerts = pgTable("usage_alerts", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  scope: text("scope").default("user").notNull(),
  metric: text("metric").notNull(),
  threshold: doublePrecision("threshold").default(0).notNull(),
  windowMinutes: integer("window_minutes").default(60).notNull(),
  channels: text("channels").array().default(["email"]).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  cooldownMinutes: integer("cooldown_minutes").default(1440).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================================================
// Cost Optimizations
// ============================================================================

export const costOptimizations = pgTable("cost_optimizations", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  description: text("description").default(""),
  estimatedSavings: integer("estimated_savings").default(0).notNull(),
  userId: text("user_id").default(""),
  applied: boolean("applied").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ============================================================================
// Model Routing Rules
// ============================================================================

export const modelRoutingRules = pgTable("model_routing_rules", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  priority: integer("priority").default(0).notNull(),
  conditions: jsonb("conditions").default("{}").notNull(),
  actions: jsonb("actions").default("{}").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================================================
// Usage Forecasts
// ============================================================================

export const usageForecasts = pgTable("usage_forecasts", {
  id: uuid("id").defaultRandom().primaryKey(),
  forecastDate: date("forecast_date").notNull(),
  predictedTokens: bigint("predicted_tokens", { mode: "number" })
    .default(0)
    .notNull(),
  predictedCost: integer("predicted_cost").default(0).notNull(),
  confidence: doublePrecision("confidence").default(0.5).notNull(),
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
});

// ============================================================================
// Provider A/B Tests
// ============================================================================

export const providerAbTests = pgTable("provider_ab_tests", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  providerA: uuid("provider_a")
    .references(() => providers.id)
    .notNull(),
  providerB: uuid("provider_b")
    .references(() => providers.id)
    .notNull(),
  trafficPercent: integer("traffic_percent").default(50).notNull(),
  status: text("status").default("running").notNull(),
  criteria: jsonb("criteria").default("{}"),
  winner: uuid("winner").references(() => providers.id),
  createdBy: uuid("created_by")
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================================================
// Provider SLA
// ============================================================================

export const providerSla = pgTable(
  "provider_sla",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    providerId: uuid("provider_id")
      .references(() => providers.id)
      .notNull(),
    date: date("date").notNull(),
    uptime: doublePrecision("uptime").default(100).notNull(),
    latencyAvgMs: doublePrecision("latency_avg_ms").default(0).notNull(),
    errorRate: doublePrecision("error_rate").default(0).notNull(),
  },
  (table) => ({
    providerDateUnique: uniqueIndex("idx_provider_sla_unique").on(
      table.providerId,
      table.date,
    ),
  }),
);

// ============================================================================
// Data Exports
// ============================================================================

export const dataExports = pgTable("data_exports", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  requestedBy: uuid("requested_by")
    .references(() => users.id)
    .notNull(),
  reason: text("reason").default(""),
  format: text("format").default("json").notNull(),
  status: text("status").default("pending").notNull(),
  filePath: text("file_path").default(""),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

// ============================================================================
// Request Traces
// ============================================================================

export const requestTraces = pgTable("request_traces", {
  id: uuid("id").defaultRandom().primaryKey(),
  requestId: text("request_id").notNull().unique(),
  traceData: jsonb("trace_data").default("{}").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ============================================================================
// Model Benchmarks
// ============================================================================

export const modelBenchmarks = pgTable("model_benchmarks", {
  id: uuid("id").defaultRandom().primaryKey(),
  promptHash: text("prompt_hash").notNull(),
  promptText: text("prompt_text").notNull(),
  results: jsonb("results").default("{}").notNull(),
  createdBy: uuid("created_by")
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ============================================================================
// Provider Maintenance Windows
// ============================================================================

export const providerMaintenanceWindows = pgTable(
  "provider_maintenance_windows",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    providerId: uuid("provider_id")
      .references(() => providers.id)
      .notNull(),
    title: text("title").notNull(),
    description: text("description").default(""),
    startsAt: timestamp("starts_at").notNull(),
    endsAt: timestamp("ends_at").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
);

// ============================================================================
// Cache Stats
// ============================================================================

export const cacheStats = pgTable("cache_stats", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  providerId: uuid("provider_id").references(() => providers.id),
  model: text("model").default("").notNull(),
  hits: bigint("hits", { mode: "number" }).default(0).notNull(),
  misses: bigint("misses", { mode: "number" }).default(0).notNull(),
  hitRate: doublePrecision("hit_rate").default(0).notNull(),
  sizeBytes: bigint("size_bytes", { mode: "number" }).default(0).notNull(),
  recordedAt: timestamp("recorded_at").defaultNow().notNull(),
});

// ============================================================================
// Budget Alerts & Caps
// ============================================================================

export const budgetAlerts = pgTable(
  "budget_alerts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),
    thresholdPercent: integer("threshold_percent").notNull(),
    alertType: text("alert_type").notNull().default("email"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("idx_budget_alerts_user").on(table.userId, table.isActive),
  }),
);

export const budgetCaps = pgTable(
  "budget_caps",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),
    hardLimit: integer("hard_limit").notNull(),
    softLimit: integer("soft_limit"),
    actionOnExceed: text("action_on_exceed").notNull().default("block"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("idx_budget_caps_user").on(table.userId, table.isActive),
    userIdUnique: uniqueIndex("idx_budget_caps_user_unique").on(table.userId),
  }),
);

// ============================================================================
// A/B Model Comparison
// ============================================================================

export const abComparisons = pgTable(
  "ab_comparisons",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),
    modelA: text("model_a").notNull(),
    modelB: text("model_b").notNull(),
    prompt: text("prompt").notNull(),
    resultA: text("result_a"),
    resultB: text("result_b"),
    latencyA: integer("latency_a"),
    latencyB: integer("latency_b"),
    costA: integer("cost_a"),
    costB: integer("cost_b"),
    tokensA: integer("tokens_a"),
    tokensB: integer("tokens_b"),
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("idx_ab_comparisons_user").on(table.userId, table.createdAt),
    statusIdx: index("idx_ab_comparisons_status").on(table.status),
  }),
);

// ============================================================================
// Fine-Tuning
// ============================================================================

export const fineTuningDatasets = pgTable(
  "fine_tuning_datasets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),
    filename: text("filename").notNull(),
    mimeType: text("mime_type"),
    size: bigint("size", { mode: "number" }).notNull(),
    storageKey: text("storage_key").notNull(),
    format: text("format").notNull().default("jsonl"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("idx_ft_datasets_user").on(table.userId, table.createdAt),
  }),
);

export const fineTuningJobs = pgTable(
  "fine_tuning_jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),
    baseModel: text("base_model").notNull(),
    datasetId: uuid("dataset_id").references(() => fineTuningDatasets.id),
    status: text("status").notNull().default("pending"),
    resultModelId: uuid("result_model_id"),
    hyperparams: jsonb("hyperparams"),
    progress: integer("progress").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    startedAt: timestamp("started_at"),
    finishedAt: timestamp("finished_at"),
  },
  (table) => ({
    userIdx: index("idx_ft_jobs_user").on(table.userId, table.createdAt),
    statusIdx: index("idx_ft_jobs_status").on(table.status),
  }),
);

// ============================================================================
// Provider Plugins
// ============================================================================

export const providerPlugins = pgTable(
  "provider_plugins",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull().unique(),
    type: text("type").notNull().default("custom"),
    baseUrl: text("base_url").notNull(),
    apiKeyEnv: text("api_key_env"),
    modelListEndpoint: text("model_list_endpoint").default("/v1/models"),
    chatEndpoint: text("chat_endpoint").default("/v1/chat/completions"),
    embeddingEndpoint: text("embedding_endpoint").default("/v1/embeddings"),
    headers: jsonb("headers"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    activeIdx: index("idx_provider_plugins_active").on(table.isActive),
  }),
);

// ============================================================================
// Export Jobs
// ============================================================================

export const exportJobs = pgTable(
  "export_jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),
    type: text("type").notNull(),
    format: text("format").notNull().default("csv"),
    status: text("status").notNull().default("pending"),
    filePath: text("file_path"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    completedAt: timestamp("completed_at"),
  },
  (table) => ({
    userIdx: index("idx_export_jobs_user").on(table.userId, table.createdAt),
    statusIdx: index("idx_export_jobs_status").on(table.status),
  }),
);

// ============================================================================
// Relations
// ============================================================================

export const usersRelations = relations(users, ({ one, many }) => ({
  apiKeys: many(apiKeys),
  apiLogs: many(apiLogs),
  userCredits: one(userCredits),
  creditTransactions: many(creditTransactions),
  conversations: many(conversations),
  webhooks: many(webhooks),
  organizations: many(organizations, { relationName: "ownedOrganizations" }),
  orgMemberships: many(orgMembers),
  files: many(files),
  stripeCustomers: one(stripeCustomers),
  stripeInvoices: many(stripeInvoices),
  batchJobs: many(batchJobs),
}));

export const apiKeysRelations = relations(apiKeys, ({ one, many }) => ({
  user: one(users, {
    fields: [apiKeys.userId],
    references: [users.id],
  }),
  logs: many(apiLogs),
}));

export const apiLogsRelations = relations(apiLogs, ({ one }) => ({
  user: one(users, {
    fields: [apiLogs.userId],
    references: [users.id],
  }),
  apiKey: one(apiKeys, {
    fields: [apiLogs.apiKeyId],
    references: [apiKeys.id],
  }),
}));

export const userCreditsRelations = relations(userCredits, ({ one }) => ({
  user: one(users, {
    fields: [userCredits.userId],
    references: [users.id],
  }),
}));

export const creditTransactionsRelations = relations(
  creditTransactions,
  ({ one }) => ({
    user: one(users, {
      fields: [creditTransactions.userId],
      references: [users.id],
    }),
    relatedLog: one(apiLogs, {
      fields: [creditTransactions.relatedLogId],
      references: [apiLogs.id],
    }),
  }),
);

export const conversationsRelations = relations(
  conversations,
  ({ one, many }) => ({
    user: one(users, {
      fields: [conversations.userId],
      references: [users.id],
    }),
    messages: many(conversationMessages),
  }),
);

export const conversationMessagesRelations = relations(
  conversationMessages,
  ({ one }) => ({
    conversation: one(conversations, {
      fields: [conversationMessages.conversationId],
      references: [conversations.id],
    }),
  }),
);

export const organizationsRelations = relations(
  organizations,
  ({ one, many }) => ({
    owner: one(users, {
      fields: [organizations.ownerId],
      references: [users.id],
    }),
    members: many(orgMembers),
    invites: many(invites),
  }),
);

export const orgMembersRelations = relations(orgMembers, ({ one }) => ({
  organization: one(organizations, {
    fields: [orgMembers.orgId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [orgMembers.userId],
    references: [users.id],
  }),
}));

export const invitesRelations = relations(invites, ({ one }) => ({
  organization: one(organizations, {
    fields: [invites.orgId],
    references: [organizations.id],
  }),
}));

export const webhooksRelations = relations(webhooks, ({ one, many }) => ({
  user: one(users, {
    fields: [webhooks.userId],
    references: [users.id],
  }),
  deliveries: many(webhookDeliveries),
}));

export const webhookDeliveriesRelations = relations(
  webhookDeliveries,
  ({ one }) => ({
    webhook: one(webhooks, {
      fields: [webhookDeliveries.webhookId],
      references: [webhooks.id],
    }),
  }),
);

export const filesRelations = relations(files, ({ one }) => ({
  user: one(users, {
    fields: [files.userId],
    references: [users.id],
  }),
}));

export const batchJobsRelations = relations(batchJobs, ({ one }) => ({
  user: one(users, {
    fields: [batchJobs.userId],
    references: [users.id],
  }),
}));

export const providersRelations = relations(providers, ({ many }) => ({
  keys: many(providerKeys),
  models: many(modelRegistry),
}));

export const providerKeysRelations = relations(providerKeys, ({ one }) => ({
  provider: one(providers, {
    fields: [providerKeys.providerId],
    references: [providers.id],
  }),
}));

export const modelRegistryRelations = relations(modelRegistry, ({ one }) => ({
  provider: one(providers, {
    fields: [modelRegistry.providerId],
    references: [providers.id],
  }),
}));

export const stripeCustomersRelations = relations(
  stripeCustomers,
  ({ one }) => ({
    user: one(users, {
      fields: [stripeCustomers.userId],
      references: [users.id],
    }),
  }),
);

export const stripeInvoicesRelations = relations(stripeInvoices, ({ one }) => ({
  user: one(users, {
    fields: [stripeInvoices.userId],
    references: [users.id],
  }),
}));

// ============================================================================
// Token Blacklist (Server-side Logout)
// ============================================================================

export const tokenBlacklist = pgTable(
  "token_blacklist",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tokenHash: text("token_hash").notNull().unique(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    tokenHashIdx: index("idx_token_blacklist_hash").on(table.tokenHash),
    expiresIdx: index("idx_token_blacklist_expires").on(table.expiresAt),
  }),
);
