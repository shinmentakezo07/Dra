import { getSDK } from "./sdk";
import type {
  AdminUserDetail, Provider, ProviderKey, ModelRegistry, ModelAlias,
  CreditAdjustment, UsageRecord, SystemSetting, FeatureFlag,
  DashboardStats, AuditLog, IPListEntry, IPAccessLog, SuspiciousActivity,
  ImpersonationSession, Announcement, PromoCode, PromoRedemption,
  UserGroup, ScheduledReport, ChangelogEntry, SSOConfig,
} from "@/types/admin";

interface ApiMeta {
  total: number; page: number; limit: number; totalPages: number;
}

export interface PaginatedResult<T> {
  data: T[]; total: number; page: number; limit: number; totalPages: number;
}

export class AdminSDK {
  private api = getSDK();

  private async paginated<T>(
    path: string,
    query?: Record<string, string | number | undefined>,
  ): Promise<PaginatedResult<T>> {
    const res = await this.api.request<{ data: T[]; meta?: ApiMeta }>("GET", path, undefined, query);
    return {
      data: res.data ?? [],
      total: res.meta?.total ?? 0,
      page: res.meta?.page ?? 1,
      limit: res.meta?.limit ?? 20,
      totalPages: res.meta?.totalPages ?? 1,
    };
  }

  async getDashboard(): Promise<DashboardStats> {
    return this.api.request<DashboardStats>("GET", "/api/admin/dashboard");
  }

  async listUsers(params?: { query?: string; status?: string; page?: number; limit?: number }): Promise<PaginatedResult<AdminUserDetail>> {
    return this.paginated<AdminUserDetail>("/api/admin/users", params as Record<string, string | number | undefined>);
  }

  async getUser(id: string): Promise<AdminUserDetail> {
    return this.api.request<AdminUserDetail>("GET", `/api/admin/users/${id}`);
  }

  async updateUserStatus(id: string, status: string, reason?: string): Promise<void> {
    await this.api.request<{ updated: boolean }>("PUT", `/api/admin/users/${id}/status`, { status, reason });
  }

  async updateUserRole(id: string, role: string): Promise<void> {
    await this.api.request<{ updated: boolean }>("PUT", `/api/admin/users/${id}/role`, { role });
  }

  async deleteUser(id: string): Promise<void> {
    await this.api.request<{ deleted: boolean }>("DELETE", `/api/admin/users/${id}`);
  }

  async bulkSuspendUsers(userIds: string[], reason: string): Promise<void> {
    await this.api.request<{ suspended: number }>("POST", "/api/admin/users/bulk/suspend", { userIds, reason });
  }

  async listProviders(): Promise<Provider[]> {
    return this.api.request<Provider[]>("GET", "/api/admin/providers");
  }

  async getProvider(id: string): Promise<Provider> {
    return this.api.request<Provider>("GET", `/api/admin/providers/${id}`);
  }

  async createProvider(data: Partial<Provider>): Promise<Provider> {
    return this.api.request<Provider>("POST", "/api/admin/providers", data);
  }

  async updateProvider(data: Partial<Provider>): Promise<void> {
    await this.api.request<{ status: string }>("PUT", `/api/admin/providers/${data.id}`, data);
  }

  async updateProviderStatus(id: string, status: string): Promise<void> {
    await this.api.request<{ status: string }>("PUT", `/api/admin/providers/${id}/status`, { status });
  }

  async listProviderKeys(providerId: string): Promise<ProviderKey[]> {
    return this.api.request<ProviderKey[]>("GET", `/api/admin/providers/${providerId}/keys`);
  }

  async createProviderKey(providerId: string, data: Partial<ProviderKey>): Promise<ProviderKey> {
    return this.api.request<ProviderKey>("POST", `/api/admin/providers/${providerId}/keys`, data);
  }

  async deleteProviderKey(providerId: string, keyId: string): Promise<void> {
    await this.api.request<{ status: string }>("DELETE", `/api/admin/providers/${providerId}/keys/${keyId}`);
  }

  async reorderProviderKeys(providerId: string, keyIds: string[]): Promise<void> {
    await this.api.request<{ status: string }>("PUT", `/api/admin/providers/${providerId}/keys/reorder`, { keyIds });
  }

  async listModels(status?: string): Promise<ModelRegistry[]> {
    return this.api.request<ModelRegistry[]>("GET", "/api/admin/models", undefined, status ? { status } : undefined);
  }

  async createModel(data: Partial<ModelRegistry>): Promise<ModelRegistry> {
    return this.api.request<ModelRegistry>("POST", "/api/admin/models", data);
  }

  async updateModelStatus(id: string, status: string): Promise<void> {
    await this.api.request<{ status: string }>("PUT", `/api/admin/models/${id}/status`, { status });
  }

  async listAliases(): Promise<ModelAlias[]> {
    return this.api.request<ModelAlias[]>("GET", "/api/admin/aliases");
  }

  async createAlias(data: Partial<ModelAlias>): Promise<ModelAlias> {
    return this.api.request<ModelAlias>("POST", "/api/admin/aliases", data);
  }

  async deleteAlias(id: string): Promise<void> {
    await this.api.request<{ status: string }>("DELETE", `/api/admin/aliases/${id}`);
  }

  async adjustCredits(userId: string, amount: number, reason: string): Promise<CreditAdjustment> {
    return this.api.request<CreditAdjustment>("POST", "/api/admin/billing/credits/adjust", { userId, amount, reason });
  }

  async listTransactions(params?: { userId?: string; model?: string; page?: number; limit?: number }): Promise<PaginatedResult<UsageRecord>> {
    return this.paginated<UsageRecord>("/api/admin/billing/transactions", params as Record<string, string | number | undefined>);
  }

  async revenueSummary(from?: string, to?: string): Promise<unknown[]> {
    return this.api.request<unknown[]>("GET", "/api/admin/billing/summary", undefined, { from, to });
  }

  async listAdjustments(userId: string, page?: number, limit?: number): Promise<PaginatedResult<CreditAdjustment>> {
    return this.paginated<CreditAdjustment>(`/api/admin/users/${userId}/adjustments`, { page, limit } as Record<string, string | number | undefined>);
  }

  async listSettings(group?: string): Promise<SystemSetting[]> {
    return this.api.request<SystemSetting[]>("GET", "/api/admin/settings", undefined, group ? { group } : undefined);
  }

  async updateSetting(key: string, value: unknown): Promise<void> {
    await this.api.request<{ updated: boolean }>("PUT", `/api/admin/settings/${key}`, { value });
  }

  async listFeatureFlags(): Promise<FeatureFlag[]> {
    return this.api.request<FeatureFlag[]>("GET", "/api/admin/feature-flags");
  }

  async createFeatureFlag(data: Partial<FeatureFlag>): Promise<FeatureFlag> {
    return this.api.request<FeatureFlag>("POST", "/api/admin/feature-flags", data);
  }

  async toggleFeatureFlag(id: string, enabled: boolean): Promise<void> {
    await this.api.request<{ updated: boolean }>("PUT", `/api/admin/feature-flags/${id}`, { enabled });
  }

  async listSuspicious(params?: { category?: string; severity?: string; page?: number; limit?: number }): Promise<PaginatedResult<SuspiciousActivity>> {
    return this.paginated<SuspiciousActivity>("/api/admin/security/suspicious", params as Record<string, string | number | undefined>);
  }

  async reviewSuspicious(id: number, action: string): Promise<void> {
    await this.api.request<{ reviewed: boolean }>("PUT", `/api/admin/security/suspicious/${id}`, { action });
  }

  async listIPEntries(action?: string): Promise<IPListEntry[]> {
    return this.api.request<IPListEntry[]>("GET", "/api/admin/ip", undefined, action ? { action } : undefined);
  }

  async addIPEntry(data: Partial<IPListEntry>): Promise<void> {
    await this.api.request<{ created: boolean }>("POST", "/api/admin/ip", data);
  }

  async removeIPEntry(id: string): Promise<void> {
    await this.api.request<{ deleted: boolean }>("DELETE", `/api/admin/ip/${id}`);
  }

  async startImpersonation(userId: string, reason: string): Promise<ImpersonationSession> {
    return this.api.request<ImpersonationSession>("POST", `/api/admin/users/${userId}/impersonate`, { reason });
  }

  async stopImpersonation(id: string): Promise<void> {
    await this.api.request<{ ended: boolean }>("POST", `/api/admin/impersonations/${id}/stop`);
  }

  async listAuditLogs(params?: { actorId?: string; action?: string; targetType?: string; severity?: string; page?: number; limit?: number }): Promise<PaginatedResult<AuditLog>> {
    return this.paginated<AuditLog>("/api/admin/audit", params as Record<string, string | number | undefined>);
  }

  async listAnnouncements(): Promise<Announcement[]> {
    return this.api.request<Announcement[]>("GET", "/api/admin/announcements");
  }

  async createAnnouncement(data: Partial<Announcement>): Promise<Announcement> {
    return this.api.request<Announcement>("POST", "/api/admin/announcements", data);
  }

  async listPromoCodes(): Promise<PromoCode[]> {
    return this.api.request<PromoCode[]>("GET", "/api/admin/promos");
  }

  async createPromoCode(data: Partial<PromoCode>): Promise<PromoCode> {
    return this.api.request<PromoCode>("POST", "/api/admin/promos", data);
  }

  async getPromoRedemptions(promoId: string): Promise<PromoRedemption[]> {
    return this.api.request<PromoRedemption[]>("GET", `/api/admin/promos/${promoId}/redemptions`);
  }

  async listGroups(): Promise<UserGroup[]> {
    return this.api.request<UserGroup[]>("GET", "/api/admin/groups");
  }

  async createGroup(data: Partial<UserGroup>): Promise<UserGroup> {
    return this.api.request<UserGroup>("POST", "/api/admin/groups", data);
  }

  async listReports(): Promise<ScheduledReport[]> {
    return this.api.request<ScheduledReport[]>("GET", "/api/admin/reports");
  }

  async listChangelog(drafts?: boolean): Promise<ChangelogEntry[]> {
    return this.api.request<ChangelogEntry[]>("GET", "/api/admin/changelog", undefined, drafts !== undefined ? { drafts: String(drafts) } : undefined);
  }

  async createChangelog(data: Partial<ChangelogEntry>): Promise<ChangelogEntry> {
    return this.api.request<ChangelogEntry>("POST", "/api/admin/changelog", data);
  }

  async publishChangelog(id: string): Promise<void> {
    await this.api.request<{ published: boolean }>("POST", `/api/admin/changelog/${id}/publish`);
  }

  async listSSOConfigs(): Promise<SSOConfig[]> {
    return this.api.request<SSOConfig[]>("GET", "/api/admin/sso");
  }

  async listAdminUsers(): Promise<{ userId: string; role: string }[]> {
    return this.api.request<{ userId: string; role: string }[]>("GET", "/api/admin/admins");
  }

  async createAdminUser(userId: string, role: string): Promise<void> {
    await this.api.request<{ status: string }>("POST", "/api/admin/admins", { userId, role });
  }

  async removeAdmin(id: string): Promise<void> {
    await this.api.request<{ removed: boolean }>("DELETE", `/api/admin/admins/${id}`);
  }

  async listUserKeys(userId: string): Promise<unknown[]> {
    return this.api.request<unknown[]>("GET", `/api/admin/users/${userId}/keys`);
  }

  async listUserUsage(userId: string): Promise<UsageRecord[]> {
    return this.api.request<UsageRecord[]>("GET", `/api/admin/users/${userId}/usage`);
  }

  async listIPAccessLogs(params?: { limit?: number }): Promise<PaginatedResult<IPAccessLog>> {
    return this.paginated<IPAccessLog>("/api/admin/ip/logs", params as Record<string, string | number | undefined>);
  }

  async costOptimizations(): Promise<unknown[]> {
    return this.api.request<unknown[]>("GET", "/api/admin/cost/optimizations");
  }

  async costForecast(): Promise<unknown> {
    return this.api.request<unknown>("GET", "/api/admin/cost/forecast");
  }

  async cacheStats(): Promise<unknown> {
    return this.api.request<unknown>("GET", "/api/admin/cache/stats");
  }

  async listWebhookLogs(): Promise<unknown> {
    return this.api.request<unknown>("GET", "/api/admin/webhooks/logs");
  }

  async clearCache(): Promise<void> {
    await this.api.request<{ cleared: boolean }>("POST", "/api/admin/cache/clear");
  }
}

let adminSDKInstance: AdminSDK | null = null;

export function getAdminSDK(): AdminSDK {
  if (!adminSDKInstance) {
    adminSDKInstance = new AdminSDK();
  }
  return adminSDKInstance;
}
