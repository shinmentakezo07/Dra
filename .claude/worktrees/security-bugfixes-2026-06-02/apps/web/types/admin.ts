// Admin types matching Go backend domain/admin.go

export type AdminRole = "superadmin" | "admin" | "support" | "analyst";
export type ProviderStatus =
  | "active"
  | "inactive"
  | "maintenance"
  | "deprecated";
export type ProviderKeyStrategy =
  | "round-robin"
  | "fill-first"
  | "weighted"
  | "latency-optimized"
  | "quota-aware";
export type ModelStatus =
  | "active"
  | "beta"
  | "deprecated"
  | "sunset"
  | "disabled";
export type UserStatus = "active" | "suspended" | "disabled" | "deleted";
export type AuditSeverity = "info" | "warning" | "error" | "critical";
export type AuditAction = string;

export interface AdminUser {
  userId: string;
  role: AdminRole;
  permissions: string[];
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUserDetail {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  lastLoginAt?: string;
  lastLoginIp?: string;
  notes?: string;
  tags?: string[];
}

export interface Provider {
  id: string;
  name: string;
  displayName: string;
  providerType: string;
  baseUrl: string;
  status: ProviderStatus;
  priority: number;
  timeoutMs: number;
  circuitBreakerEnabled: boolean;
  circuitBreakerThreshold: number;
  circuitBreakerRecoveryMs: number;
  circuitBreakerHalfOpenMax: number;
  maxRetries: number;
  rateLimitRpm: number;
  rateLimitTpm: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ProviderKey {
  id: string;
  providerId: string;
  label: string;
  keyPrefix: string;
  keyLastFour: string;
  strategy: ProviderKeyStrategy;
  weight: number;
  sortOrder: number;
  fillCurrent: number;
  rpmLimit: number;
  tpmLimit: number;
  monthlyQuota: number;
  monthlyUsed: number;
  isActive: boolean;
  usageCount: number;
  totalTokens: number;
  lastUsedAt?: string;
  expiresAt?: string;
  createdAt: string;
}

export interface ModelRegistry {
  id: string;
  modelId: string;
  providerId: string;
  displayName: string;
  description: string;
  contextWindow: number;
  maxOutput: number;
  inputPricePer1k: number;
  outputPricePer1k: number;
  capabilities: string[];
  supportsVision: boolean;
  supportsTools: boolean;
  supportsThinking: boolean;
  status: ModelStatus;
  sunsetDate?: string;
  replacementModelId?: string;
  metadata?: Record<string, unknown>;
  modelGroup?: string;
  fallbackModels?: string[];
  credentialName?: string;
  routingWeight: number;
  isWildcard: boolean;
  createdAt: string;
}

export interface ModelAlias {
  id: string;
  alias: string;
  targetModelId: string;
  preferredProviderId?: string;
  preferredKeyId?: string;
  rpmOverride: number;
  tpmOverride: number;
  monthlyBudget: number;
  allowedUserIds: string[];
  isActive: boolean;
  createdAt: string;
}

export interface CreditAdjustment {
  id: string;
  userId: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  reason: string;
  adminId: string;
  referenceId?: string;
  createdAt: string;
}

export interface UsageRecord {
  id: number;
  userId: string;
  apiKeyId?: string;
  providerId?: string;
  requestId: string;
  model: string;
  tokens: number;
  cost: number;
  durationMs: number;
  statusCode: number;
  error?: string;
  ipAddress?: string;
  createdAt: string;
}

export interface UsageDaily {
  date: string;
  userId: string;
  providerId?: string;
  modelId: string;
  apiKeyId?: string;
  requestCount: number;
  tokens: number;
  cost: number;
  errors: number;
  latencyP50Ms: number;
  latencyP95Ms: number;
  latencyP99Ms: number;
}

export interface SystemSetting {
  key: string;
  value: unknown;
  type: string;
  description: string;
  groupName: string;
  isEncrypted: boolean;
  updatedAt: string;
}

export interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  targetedUserIds?: string[];
  targetedTierIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: number;
  actorId: string;
  actorEmail: string;
  action: string;
  targetType: string;
  targetId: string;
  changes?: Array<{ field: string; old: unknown; new: unknown }>;
  ipAddress?: string;
  severity: AuditSeverity;
  createdAt: string;
}

export interface DashboardStats {
  users: {
    total: number;
    activeToday: number;
    newToday: number;
    suspended: number;
  };
  requests: {
    totalToday: number;
    totalMonth: number;
    avgLatencyMs: number;
  };
  tokens: {
    inputToday: number;
    outputToday: number;
  };
  revenue: {
    todayCents: number;
    monthCents: number;
  };
  providers: {
    total: number;
    healthy: number;
    degraded: number;
    down: number;
  };
}

export interface IPListEntry {
  id: string;
  ipOrCidr: string;
  action: string;
  scope: string;
  scopeId?: string;
  reason?: string;
  expiresAt?: string;
  createdAt: string;
}

export interface IPAccessLog {
  id: number;
  ipAddress: string;
  userId?: string;
  apiKeyId?: string;
  method: string;
  path: string;
  userAgent?: string;
  country?: string;
  isProxy: boolean;
  blocked: boolean;
  rateLimited: boolean;
  createdAt: string;
}

export interface SuspiciousActivity {
  id: number;
  category: string;
  severity: string;
  userId?: string;
  apiKeyId?: string;
  ip?: string;
  details?: Record<string, unknown>;
  autoBlocked: boolean;
  reviewed: boolean;
  resolved: boolean;
  createdAt: string;
}

export interface ImpersonationSession {
  id: string;
  adminId: string;
  targetUserId: string;
  reason: string;
  startedAt: string;
  endedAt?: string;
}

export interface PromoCode {
  id: string;
  code: string;
  type: string;
  value: number;
  maxUses: number;
  currentUses: number;
  minPurchase: number;
  expiresAt?: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
}

export interface PromoRedemption {
  id: string;
  promoId: string;
  userId: string;
  discount: number;
  creditsAwarded: number;
  redeemedAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  priority: string;
  targetType: string;
  targetIds?: string[];
  startsAt: string;
  endsAt?: string;
  showInApp: boolean;
  sendEmail: boolean;
  createdBy: string;
  createdAt: string;
}

export interface UserAnnouncement {
  id: string;
  title: string;
  body: string;
  priority: string;
  startDate: string;
  endDate?: string;
  createdAt: string;
}

export interface UserGroup {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  createdAt: string;
}

export interface ScheduledReport {
  id: string;
  name: string;
  frequency: string;
  format: string;
  sections: string[];
  recipients: string[];
  nextSendAt?: string;
  lastSentAt?: string;
  isActive: boolean;
  createdAt: string;
}

export interface ChangelogEntry {
  id: string;
  title: string;
  body: string;
  version: string;
  type: string;
  publishedAt?: string;
  isDraft: boolean;
  createdBy: string;
  createdAt: string;
}

export interface SSOConfig {
  id: string;
  provider: string;
  label: string;
  issuer: string;
  clientId: string;
  allowedDomains: string[];
  autoProvision: boolean;
  defaultRole: string;
  isActive: boolean;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type { ApiResponse } from "@/lib/api/types";

export interface ProviderPlugin {
  id: string;
  name: string;
  type: string;
  baseUrl: string;
  apiKeyEnv?: string;
  modelListEndpoint: string;
  chatEndpoint: string;
  embeddingEndpoint: string;
  headers?: Record<string, string>;
  isActive: boolean;
  createdAt: string;
}

export interface RateLimitTier {
  id: string;
  name: string;
  rpm: number;
  daily: number;
  monthly: number;
  maxTokens: number;
}

export interface RBACPermission {
  id: string;
  name: string;
  description: string;
  category: string;
}

export interface RBACRole {
  name: string;
  description: string;
  permissions: string[];
}

export interface MessageStats {
  totalTargets: number;
  readCount: number;
  unreadCount: number;
}

export interface CostBreakdown {
  byModel: Array<{ name: string; count: number; totalCents: number }>;
  byUser: unknown[];
  byProvider: unknown[];
}
