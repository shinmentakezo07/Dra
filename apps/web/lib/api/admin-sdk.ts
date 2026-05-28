import { getSDK } from "./sdk";
import type {
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
  DashboardStats,
  AuditLog,
  IPListEntry,
  IPAccessLog,
  SuspiciousActivity,
  ImpersonationSession,
  Announcement,
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
} from "@/types/admin";

type AdminMessage = {
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
};

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class AdminSDK {
  private api = getSDK();

  async getDashboard(): Promise<DashboardStats> {
    return this.api.adminDashboardStats();
  }

  async listUsers(params?: {
    query?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResult<AdminUserDetail>> {
    return this.api.adminListUsers(
      params?.page,
      params?.limit,
    ) as unknown as PaginatedResult<AdminUserDetail>;
  }

  async getUser(id: string): Promise<AdminUserDetail> {
    return this.api.adminGetUser(id) as unknown as AdminUserDetail;
  }

  async updateUserStatus(
    id: string,
    status: string,
    reason?: string,
  ): Promise<void> {
    await this.api.adminUpdateUserStatus(id, status);
  }

  async updateUserRole(id: string, role: string): Promise<void> {
    await this.api.adminUpdateUserRole(id, role);
  }

  async deleteUser(id: string): Promise<void> {
    await this.api.adminDeleteUser(id);
  }

  async bulkSuspendUsers(userIds: string[], reason: string): Promise<void> {
    await this.api.adminBulkSuspendUsers(userIds, reason);
  }

  async listProviders(): Promise<Provider[]> {
    return this.api.adminListProviders();
  }

  async getProvider(id: string): Promise<Provider> {
    return this.api.adminGetProvider(id);
  }

  async createProvider(
    data: Partial<Provider> & { apiKey?: string },
  ): Promise<Provider> {
    return this.api.adminCreateProvider(
      data as Parameters<typeof this.api.adminCreateProvider>[0],
    );
  }

  async updateProvider(data: Partial<Provider>): Promise<void> {
    await this.api.adminUpdateProvider(data.id!, data);
  }

  async updateProviderStatus(id: string, status: string): Promise<void> {
    await this.api.adminUpdateProviderStatus(id, status);
  }

  async listProviderKeys(providerId: string): Promise<ProviderKey[]> {
    return this.api.adminListProviderKeys(providerId);
  }

  async createProviderKey(
    providerId: string,
    data: { label: string; key: string; strategy?: string; weight?: number },
  ): Promise<ProviderKey> {
    return this.api.adminAddProviderKey(
      providerId,
      data,
    ) as unknown as ProviderKey;
  }

  async deleteProviderKey(providerId: string, keyId: string): Promise<void> {
    await this.api.adminDeleteProviderKey(providerId, keyId);
  }

  async reorderProviderKeys(
    providerId: string,
    keyIds: string[],
  ): Promise<void> {
    await this.api.adminReorderProviderKeys(providerId, keyIds);
  }

  async fetchModels(
    baseUrl: string,
    apiKey: string,
  ): Promise<{
    models: { id: string; object?: string; owned_by?: string }[];
    total: number;
  }> {
    return this.api.adminFetchModels({ baseUrl, apiKey });
  }

  async deleteProvider(id: string): Promise<void> {
    await this.api.adminDeleteProvider(id);
  }

  async listModels(status?: string): Promise<ModelRegistry[]> {
    return this.api.adminListModels(status);
  }

  async createModel(data: Partial<ModelRegistry>): Promise<ModelRegistry> {
    return this.api.adminCreateModel(data);
  }

  async updateModel(id: string, data: Partial<ModelRegistry>): Promise<void> {
    await this.api.adminUpdateModel(id, data);
  }

  async updateModelStatus(id: string, status: string): Promise<void> {
    await this.api.adminUpdateModelStatus(id, status);
  }

  async deleteModel(id: string): Promise<void> {
    await this.api.adminDeleteModel(id);
  }

  async listAliases(): Promise<ModelAlias[]> {
    return this.api.adminListAliases();
  }

  async createAlias(data: Partial<ModelAlias>): Promise<ModelAlias> {
    return this.api.adminCreateAlias(data);
  }

  async updateAlias(id: string, data: Partial<ModelAlias>): Promise<void> {
    await this.api.adminUpdateAlias(id, data);
  }

  async deleteAlias(id: string): Promise<void> {
    await this.api.adminDeleteAlias(id);
  }

  async adjustCredits(
    userId: string,
    amount: number,
    reason: string,
  ): Promise<CreditAdjustment> {
    return this.api.adminAdjustCredits(userId, amount, reason);
  }

  async listTransactions(params?: {
    userId?: string;
    model?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResult<UsageRecord>> {
    return this.api.adminListTransactions(
      params as Record<string, string | number | undefined>,
    ) as unknown as PaginatedResult<UsageRecord>;
  }

  async revenueSummary(from?: string, to?: string): Promise<unknown[]> {
    return this.api.adminRevenueSummary(from, to);
  }

  async listAdjustments(
    userId: string,
    page?: number,
    limit?: number,
  ): Promise<PaginatedResult<CreditAdjustment>> {
    return this.api.adminListAdjustments(
      userId,
      page,
      limit,
    ) as unknown as PaginatedResult<CreditAdjustment>;
  }

  async listSettings(group?: string): Promise<SystemSetting[]> {
    return this.api.adminListSettings(group);
  }

  async updateSetting(key: string, value: unknown): Promise<void> {
    await this.api.adminUpdateSetting(key, value);
  }

  async listFeatureFlags(): Promise<FeatureFlag[]> {
    return this.api.adminListFeatureFlags();
  }

  async createFeatureFlag(data: Partial<FeatureFlag>): Promise<FeatureFlag> {
    return this.api.adminCreateFeatureFlag(data);
  }

  async togglePromoStatus(id: string, isActive: boolean): Promise<void> {
    await this.api.adminTogglePromoStatus(id, isActive);
  }

  async toggleFeatureFlag(id: string, enabled: boolean): Promise<void> {
    await this.api.adminToggleFeatureFlag(id, enabled);
  }

  async listSuspicious(params?: {
    category?: string;
    severity?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResult<SuspiciousActivity>> {
    return this.api.adminListSuspicious(
      params as Record<string, string | number | undefined>,
    ) as unknown as PaginatedResult<SuspiciousActivity>;
  }

  async reviewSuspicious(id: number, action: string): Promise<void> {
    await this.api.adminReviewSuspicious(id, action);
  }

  async listIPEntries(action?: string): Promise<IPListEntry[]> {
    return this.api.adminListIPEntries(action);
  }

  async addIPEntry(data: Partial<IPListEntry>): Promise<void> {
    await this.api.adminAddIPEntry(data);
  }

  async removeIPEntry(id: string): Promise<void> {
    await this.api.adminRemoveIPEntry(id);
  }

  async startImpersonation(
    userId: string,
    reason: string,
  ): Promise<ImpersonationSession> {
    return this.api.adminStartImpersonation(userId, { reason });
  }

  async stopImpersonation(id: string): Promise<void> {
    await this.api.adminStopImpersonation(id);
  }

  async listAuditLogs(params?: {
    actorId?: string;
    action?: string;
    targetType?: string;
    severity?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResult<AuditLog>> {
    return this.api.adminListAuditLogs(
      params as Record<string, string | number | undefined>,
    ) as unknown as PaginatedResult<AuditLog>;
  }

  async listAnnouncements(): Promise<Announcement[]> {
    return this.api.adminListAnnouncements();
  }

  async createAnnouncement(data: Partial<Announcement>): Promise<Announcement> {
    return this.api.adminCreateAnnouncement(data);
  }

  async listPromoCodes(): Promise<PromoCode[]> {
    return this.api.adminListPromoCodes();
  }

  async createPromoCode(data: Partial<PromoCode>): Promise<PromoCode> {
    return this.api.adminCreatePromoCode(data);
  }

  async getPromoRedemptions(promoId: string): Promise<PromoRedemption[]> {
    return this.api.adminListPromoRedemptions(promoId);
  }

  async listGroups(): Promise<UserGroup[]> {
    return this.api.adminListGroups();
  }

  async createGroup(data: Partial<UserGroup>): Promise<UserGroup> {
    return this.api.adminCreateGroup(data);
  }

  async listReports(): Promise<ScheduledReport[]> {
    return this.api.adminListScheduledReports();
  }

  async listChangelog(drafts?: boolean): Promise<ChangelogEntry[]> {
    return this.api.adminListChangelog(drafts);
  }

  async createChangelog(
    data: Partial<ChangelogEntry>,
  ): Promise<ChangelogEntry> {
    return this.api.adminCreateChangelog(data);
  }

  async publishChangelog(id: string): Promise<void> {
    await this.api.adminPublishChangelog(id);
  }

  async listSSOConfigs(): Promise<SSOConfig[]> {
    return this.api.adminListSSOConfigs();
  }

  async listAdminUsers(): Promise<{ userId: string; role: string }[]> {
    return this.api.adminListAdminUsers();
  }

  async createAdminUser(userId: string, role: string): Promise<void> {
    await this.api.adminCreateAdminUser(userId, role);
  }

  async removeAdmin(id: string): Promise<void> {
    await this.api.adminRemoveAdmin(id);
  }

  async listUserKeys(userId: string): Promise<unknown[]> {
    return this.api.adminListUserKeys(userId) as unknown as unknown[];
  }

  async listUserUsage(userId: string): Promise<UsageRecord[]> {
    return this.api.adminListUserUsage(userId) as unknown as UsageRecord[];
  }

  async listIPAccessLogs(params?: {
    limit?: number;
  }): Promise<PaginatedResult<IPAccessLog>> {
    return this.api.adminListIPAccessLogs(
      params as Record<string, string | number | undefined>,
    ) as unknown as PaginatedResult<IPAccessLog>;
  }

  async costOptimizations(): Promise<unknown[]> {
    return this.api.adminCostOptimizations();
  }

  async costForecast(): Promise<unknown> {
    return this.api.adminCostForecast();
  }

  async cacheStats(): Promise<unknown> {
    return this.api.adminCacheStats();
  }

  async listWebhookLogs(): Promise<unknown> {
    return this.api.adminListWebhookLogs();
  }

  async clearCache(): Promise<void> {
    await this.api.adminClearCache();
  }

  // Admin Messages
  async listMessages(
    page?: number,
    limit?: number,
  ): Promise<PaginatedResult<AdminMessage>> {
    return this.api.adminListMessages(
      page,
      limit,
    ) as unknown as PaginatedResult<AdminMessage>;
  }

  async createMessage(data: {
    title: string;
    body: string;
    priority?: string;
    targetType: string;
    targetIds?: string[];
    expiresAt?: string;
  }): Promise<{ id: string }> {
    return this.api.adminCreateMessage(data);
  }

  async deleteMessage(id: string): Promise<void> {
    await this.api.adminDeleteMessage(id);
  }

  async getMessage(id: string): Promise<AdminMessage> {
    return this.api.adminGetMessage(id);
  }

  async getMessageStats(id: string): Promise<MessageStats> {
    return this.api.adminGetMessageStats(id);
  }

  // Models — Get single
  async getModel(id: string): Promise<ModelRegistry> {
    return this.api.adminGetModel(id);
  }

  // Billing — Usage Daily
  async listUsageDaily(params?: {
    from?: string;
    to?: string;
    groupBy?: string;
  }): Promise<UsageDaily[]> {
    return this.api.adminUsageDaily(
      params as Record<string, string | number | undefined>,
    );
  }

  // Promos — Custom code
  async createCustomPromoCode(data: Partial<PromoCode>): Promise<PromoCode> {
    return this.api.adminCreatePromoCodeCustom(data);
  }

  // RBAC
  async listPermissions(): Promise<RBACPermission[]> {
    return this.api.adminListPermissions();
  }

  async listRoles(): Promise<RBACRole[]> {
    return this.api.adminListRoles();
  }

  async getRolePermissions(role: string): Promise<string[]> {
    return this.api.adminGetRolePermissions(role);
  }

  async addRolePermission(role: string, permissionName: string): Promise<void> {
    await this.api.adminAddRolePermission(role, permissionName);
  }

  async removeRolePermission(role: string, permission: string): Promise<void> {
    await this.api.adminRemoveRolePermission(role, permission);
  }

  async updateUserRoleByRBAC(userId: string, role: string): Promise<void> {
    await this.api.adminUpdateUserRole(userId, role);
  }

  // Rate Limits
  async listTiers(): Promise<RateLimitTier[]> {
    return this.api.adminListRateLimitTiers();
  }

  async updateTierLimits(
    tier: string,
    data: {
      rpm?: number;
      daily?: number;
      monthly?: number;
      maxTokens?: number;
    },
  ): Promise<void> {
    await this.api.adminUpdateTierLimits(tier, data);
  }

  async setUserTier(userId: string, tier: string): Promise<void> {
    await this.api.adminSetUserTier(userId, tier);
  }

  // Provider Plugins
  async listPlugins(): Promise<ProviderPlugin[]> {
    return this.api.adminListPlugins();
  }

  async createPlugin(data: Partial<ProviderPlugin>): Promise<ProviderPlugin> {
    return this.api.adminCreatePlugin(data);
  }

  async getPlugin(id: string): Promise<ProviderPlugin> {
    return this.api.adminGetPlugin(id);
  }

  async togglePlugin(id: string, active: boolean): Promise<void> {
    await this.api.adminTogglePlugin(id, active);
  }

  async deletePlugin(id: string): Promise<void> {
    await this.api.adminDeletePlugin(id);
  }

  // Cost Breakdown
  async costBreakdown(): Promise<CostBreakdown> {
    return this.api.adminCostBreakdown();
  }

  // Webhook Retry
  async retryWebhook(id: string): Promise<void> {
    await this.api.adminRetryWebhook(id);
  }
}

let adminSDKInstance: AdminSDK | null = null;

export function getAdminSDK(): AdminSDK {
  if (!adminSDKInstance) {
    adminSDKInstance = new AdminSDK();
  }
  return adminSDKInstance;
}
