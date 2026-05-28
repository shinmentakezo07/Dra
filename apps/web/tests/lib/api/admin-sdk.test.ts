import { describe, it, expect, vi, beforeEach } from "vitest";
import { AdminSDK, getAdminSDK } from "@/lib/api/admin-sdk";
import * as sdkModule from "@/lib/api/sdk";

// Mock the SDK module
vi.mock("@/lib/api/sdk", () => ({
  getSDK: vi.fn(),
}));

const mockSDK = {
  adminDashboardStats: vi.fn(),
  adminListUsers: vi.fn(),
  adminGetUser: vi.fn(),
  adminUpdateUserStatus: vi.fn(),
  adminUpdateUserRole: vi.fn(),
  adminDeleteUser: vi.fn(),
  adminBulkSuspendUsers: vi.fn(),
  adminListProviders: vi.fn(),
  adminGetProvider: vi.fn(),
  adminCreateProvider: vi.fn(),
  adminUpdateProvider: vi.fn(),
  adminUpdateProviderStatus: vi.fn(),
  adminListProviderKeys: vi.fn(),
  adminAddProviderKey: vi.fn(),
  adminDeleteProviderKey: vi.fn(),
  adminReorderProviderKeys: vi.fn(),
  adminFetchModels: vi.fn(),
  adminDeleteProvider: vi.fn(),
  adminListModels: vi.fn(),
  adminCreateModel: vi.fn(),
  adminUpdateModel: vi.fn(),
  adminUpdateModelStatus: vi.fn(),
  adminDeleteModel: vi.fn(),
  adminListAliases: vi.fn(),
  adminCreateAlias: vi.fn(),
  adminUpdateAlias: vi.fn(),
  adminDeleteAlias: vi.fn(),
  adminAdjustCredits: vi.fn(),
  adminListTransactions: vi.fn(),
  adminRevenueSummary: vi.fn(),
  adminListAdjustments: vi.fn(),
  adminListSettings: vi.fn(),
  adminUpdateSetting: vi.fn(),
  adminListFeatureFlags: vi.fn(),
  adminCreateFeatureFlag: vi.fn(),
  adminTogglePromoStatus: vi.fn(),
  adminToggleFeatureFlag: vi.fn(),
  adminListSuspicious: vi.fn(),
  adminReviewSuspicious: vi.fn(),
  adminListIPEntries: vi.fn(),
  adminAddIPEntry: vi.fn(),
  adminRemoveIPEntry: vi.fn(),
  adminStartImpersonation: vi.fn(),
  adminStopImpersonation: vi.fn(),
  adminListAuditLogs: vi.fn(),
  adminListAnnouncements: vi.fn(),
  adminCreateAnnouncement: vi.fn(),
  adminListPromoCodes: vi.fn(),
  adminCreatePromoCode: vi.fn(),
  adminListPromoRedemptions: vi.fn(),
  adminListGroups: vi.fn(),
  adminCreateGroup: vi.fn(),
  adminListScheduledReports: vi.fn(),
  adminListChangelog: vi.fn(),
  adminCreateChangelog: vi.fn(),
  adminPublishChangelog: vi.fn(),
  adminListSSOConfigs: vi.fn(),
  adminListAdminUsers: vi.fn(),
  adminCreateAdminUser: vi.fn(),
  adminRemoveAdmin: vi.fn(),
  adminListUserKeys: vi.fn(),
  adminListUserUsage: vi.fn(),
  adminListIPAccessLogs: vi.fn(),
  adminCostOptimizations: vi.fn(),
  adminCostForecast: vi.fn(),
  adminCacheStats: vi.fn(),
  adminListWebhookLogs: vi.fn(),
  adminClearCache: vi.fn(),
  adminListMessages: vi.fn(),
  adminCreateMessage: vi.fn(),
  adminDeleteMessage: vi.fn(),
  adminGetMessage: vi.fn(),
  adminGetMessageStats: vi.fn(),
  adminGetModel: vi.fn(),
  adminUsageDaily: vi.fn(),
  adminCreatePromoCodeCustom: vi.fn(),
  adminListPermissions: vi.fn(),
  adminListRoles: vi.fn(),
  adminGetRolePermissions: vi.fn(),
  adminAddRolePermission: vi.fn(),
  adminRemoveRolePermission: vi.fn(),
  adminListRateLimitTiers: vi.fn(),
  adminUpdateTierLimits: vi.fn(),
  adminSetUserTier: vi.fn(),
  adminListPlugins: vi.fn(),
  adminCreatePlugin: vi.fn(),
  adminGetPlugin: vi.fn(),
  adminTogglePlugin: vi.fn(),
  adminDeletePlugin: vi.fn(),
  adminCostBreakdown: vi.fn(),
  adminRetryWebhook: vi.fn(),
};

describe("AdminSDK", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(sdkModule.getSDK).mockReturnValue(
      mockSDK as unknown as ReturnType<typeof sdkModule.getSDK>,
    );
  });

  describe("getDashboard", () => {
    it("delegates to adminDashboardStats", async () => {
      const stats = { totalUsers: 100, activeUsers: 50 };
      mockSDK.adminDashboardStats.mockResolvedValueOnce(stats);
      const sdk = new AdminSDK();
      const result = await sdk.getDashboard();
      expect(result).toEqual(stats);
      expect(mockSDK.adminDashboardStats).toHaveBeenCalledTimes(1);
    });
  });

  describe("listUsers", () => {
    it("delegates to adminListUsers with pagination", async () => {
      mockSDK.adminListUsers.mockResolvedValueOnce({
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      });
      const sdk = new AdminSDK();
      const result = await sdk.listUsers({ page: 2, limit: 10 });
      expect(mockSDK.adminListUsers).toHaveBeenCalledWith(2, 10);
    });

    it("handles undefined params", async () => {
      mockSDK.adminListUsers.mockResolvedValueOnce({
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      });
      const sdk = new AdminSDK();
      await sdk.listUsers();
      expect(mockSDK.adminListUsers).toHaveBeenCalledWith(undefined, undefined);
    });
  });

  describe("getUser", () => {
    it("delegates to adminGetUser", async () => {
      const user = { id: "1", email: "test@example.com" };
      mockSDK.adminGetUser.mockResolvedValueOnce(user);
      const sdk = new AdminSDK();
      const result = await sdk.getUser("1");
      expect(result).toEqual(user);
      expect(mockSDK.adminGetUser).toHaveBeenCalledWith("1");
    });
  });

  describe("updateUserStatus", () => {
    it("delegates to adminUpdateUserStatus", async () => {
      mockSDK.adminUpdateUserStatus.mockResolvedValueOnce(undefined);
      const sdk = new AdminSDK();
      await sdk.updateUserStatus("1", "suspended", "abuse");
      expect(mockSDK.adminUpdateUserStatus).toHaveBeenCalledWith(
        "1",
        "suspended",
      );
    });
  });

  describe("deleteUser", () => {
    it("delegates to adminDeleteUser", async () => {
      mockSDK.adminDeleteUser.mockResolvedValueOnce(undefined);
      const sdk = new AdminSDK();
      await sdk.deleteUser("1");
      expect(mockSDK.adminDeleteUser).toHaveBeenCalledWith("1");
    });
  });

  describe("adjustCredits", () => {
    it("delegates to adminAdjustCredits", async () => {
      const adjustment = { id: "1", amount: 100 };
      mockSDK.adminAdjustCredits.mockResolvedValueOnce(adjustment);
      const sdk = new AdminSDK();
      const result = await sdk.adjustCredits("1", 100, "bonus");
      expect(result).toEqual(adjustment);
      expect(mockSDK.adminAdjustCredits).toHaveBeenCalledWith(
        "1",
        100,
        "bonus",
      );
    });
  });

  describe("listProviders", () => {
    it("delegates to adminListProviders", async () => {
      const providers = [{ id: "1", name: "OpenAI" }];
      mockSDK.adminListProviders.mockResolvedValueOnce(providers);
      const sdk = new AdminSDK();
      const result = await sdk.listProviders();
      expect(result).toEqual(providers);
    });
  });

  describe("listModels", () => {
    it("delegates to adminListModels with optional status", async () => {
      mockSDK.adminListModels.mockResolvedValueOnce([]);
      const sdk = new AdminSDK();
      await sdk.listModels("active");
      expect(mockSDK.adminListModels).toHaveBeenCalledWith("active");
    });
  });

  describe("clearCache", () => {
    it("delegates to adminClearCache", async () => {
      mockSDK.adminClearCache.mockResolvedValueOnce(undefined);
      const sdk = new AdminSDK();
      await sdk.clearCache();
      expect(mockSDK.adminClearCache).toHaveBeenCalled();
    });
  });

  describe("getAdminSDK singleton", () => {
    it("returns the same instance on repeated calls", () => {
      const sdk1 = getAdminSDK();
      const sdk2 = getAdminSDK();
      expect(sdk1).toBe(sdk2);
    });

    it("returns an AdminSDK instance", () => {
      const sdk = getAdminSDK();
      expect(sdk).toBeInstanceOf(AdminSDK);
    });
  });

  describe("RBAC methods", () => {
    it("listPermissions delegates correctly", async () => {
      mockSDK.adminListPermissions.mockResolvedValueOnce([]);
      const sdk = new AdminSDK();
      await sdk.listPermissions();
      expect(mockSDK.adminListPermissions).toHaveBeenCalled();
    });

    it("listRoles delegates correctly", async () => {
      mockSDK.adminListRoles.mockResolvedValueOnce([]);
      const sdk = new AdminSDK();
      await sdk.listRoles();
      expect(mockSDK.adminListRoles).toHaveBeenCalled();
    });

    it("addRolePermission delegates correctly", async () => {
      mockSDK.adminAddRolePermission.mockResolvedValueOnce(undefined);
      const sdk = new AdminSDK();
      await sdk.addRolePermission("admin", "users:write");
      expect(mockSDK.adminAddRolePermission).toHaveBeenCalledWith(
        "admin",
        "users:write",
      );
    });
  });

  describe("Rate Limit methods", () => {
    it("listTiers delegates correctly", async () => {
      mockSDK.adminListRateLimitTiers.mockResolvedValueOnce([]);
      const sdk = new AdminSDK();
      await sdk.listTiers();
      expect(mockSDK.adminListRateLimitTiers).toHaveBeenCalled();
    });

    it("setUserTier delegates correctly", async () => {
      mockSDK.adminSetUserTier.mockResolvedValueOnce(undefined);
      const sdk = new AdminSDK();
      await sdk.setUserTier("user-1", "pro");
      expect(mockSDK.adminSetUserTier).toHaveBeenCalledWith("user-1", "pro");
    });
  });

  describe("Message methods", () => {
    it("listMessages delegates correctly", async () => {
      mockSDK.adminListMessages.mockResolvedValueOnce({
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      });
      const sdk = new AdminSDK();
      await sdk.listMessages(1, 20);
      expect(mockSDK.adminListMessages).toHaveBeenCalledWith(1, 20);
    });

    it("createMessage delegates correctly", async () => {
      mockSDK.adminCreateMessage.mockResolvedValueOnce({ id: "1" });
      const sdk = new AdminSDK();
      const result = await sdk.createMessage({
        title: "Hello",
        body: "World",
        targetType: "all",
      });
      expect(result).toEqual({ id: "1" });
      expect(mockSDK.adminCreateMessage).toHaveBeenCalledWith({
        title: "Hello",
        body: "World",
        targetType: "all",
      });
    });
  });
});
