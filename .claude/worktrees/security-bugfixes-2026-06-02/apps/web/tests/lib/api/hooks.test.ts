import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("Hook-SDK wiring verification", () => {
  const hooksFile = path.resolve(__dirname, "../../../lib/api/hooks.ts");
  const sdkFile = path.resolve(__dirname, "../../../lib/api/sdk.ts");
  const hooksContent = fs.readFileSync(hooksFile, "utf-8");
  const sdkContent = fs.readFileSync(sdkFile, "utf-8");

  const queryHooks = [
    { hook: "useKeys", method: "listKeys" },
    { hook: "useCredits", method: "getCredits" },
    { hook: "useBudget", method: "getBudget" },
    { hook: "useTransactions", method: "listTransactions" },
    { hook: "useAnalytics", method: "getAnalytics" },
    { hook: "useLogs", method: "listLogs" },
    { hook: "useModels", method: "listModels" },
    { hook: "useConversations", method: "listConversations" },
    { hook: "useConversation", method: "getConversation" },
    { hook: "usePrompts", method: "listPrompts" },
    { hook: "usePrompt", method: "getPrompt" },
    { hook: "useWebhooks", method: "listWebhooks" },
    { hook: "useOrganizations", method: "listOrganizations" },
    { hook: "useOrganization", method: "getOrganization" },
    { hook: "useOrgMembers", method: "listMembers" },
    { hook: "useBatchJob", method: "getBatchJob" },
    { hook: "useFiles", method: "listFiles" },
    { hook: "useProviderHealth", method: "adminProviderHealth" },
    { hook: "usePublicProviderHealth", method: "providerHealth" },
    { hook: "useCircuitBreakers", method: "adminCircuitBreakers" },
    { hook: "useBudgetAlerts", method: "listBudgetAlerts" },
    { hook: "useBudgetCap", method: "getBudgetCap" },
  ];

  const mutationHooks = [
    { hook: "useCreateKey", method: "createKey" },
    { hook: "useDeleteKey", method: "deleteKey" },
    { hook: "useRevokeKey", method: "revokeKey" },
    { hook: "usePurchaseCredits", method: "purchaseCredits" },
    { hook: "useSetBudget", method: "setBudget" },
    { hook: "useCreateConversation", method: "createConversation" },
    { hook: "useDeleteConversation", method: "deleteConversation" },
    { hook: "useAddMessage", method: "addMessage" },
    { hook: "useCreatePrompt", method: "createPrompt" },
    { hook: "useDeletePrompt", method: "deletePrompt" },
    { hook: "useRenderPrompt", method: "renderPrompt" },
    { hook: "useCreateWebhook", method: "createWebhook" },
    { hook: "useUpdateWebhook", method: "updateWebhook" },
    { hook: "useDeleteWebhook", method: "deleteWebhook" },
    { hook: "useCreateOrganization", method: "createOrganization" },
    { hook: "useInviteMember", method: "inviteMember" },
    { hook: "useRemoveMember", method: "removeMember" },
    { hook: "useAcceptInvite", method: "acceptInvite" },
    { hook: "useSubmitBatch", method: "submitBatch" },
    { hook: "useUploadFile", method: "uploadFile" },
    { hook: "useEmbed", method: "embed" },
    { hook: "useCreateBudgetAlert", method: "createBudgetAlert" },
    { hook: "useDeleteBudgetAlert", method: "deleteBudgetAlert" },
    { hook: "useCreateBudgetCap", method: "createBudgetCap" },
    { hook: "useUpdateBudgetCap", method: "updateBudgetCap" },
    { hook: "useDeleteBudgetCap", method: "deleteBudgetCap" },
  ];

  it("all query hooks call their corresponding SDK methods", () => {
    for (const { hook, method } of queryHooks) {
      expect(hooksContent).toContain(method);
      expect(sdkContent).toMatch(new RegExp(`\\b${method}\\b`));
    }
  });

  it("all mutation hooks call their corresponding SDK methods", () => {
    for (const { hook, method } of mutationHooks) {
      expect(hooksContent).toContain(method);
      expect(sdkContent).toMatch(new RegExp(`\\b${method}\\b`));
    }
  });

  it("hooks file imports getSDK from sdk module", () => {
    expect(hooksContent).toMatch(/import.*getSDK.*from.*["']\.\/sdk["']/);
  });

  it("hooks file calls getSDK() at module level", () => {
    expect(hooksContent).toMatch(/const\s+sdk\s*=\s*getSDK\(\)/);
  });

  it("no hardcoded mock data in hooks", () => {
    const lines = hooksContent.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/const\s+mock/i.test(line) && !line.trim().startsWith("//")) {
        expect.fail(
          `Found mock data in hooks.ts at line ${i + 1}: ${line.trim()}`,
        );
      }
    }
  });

  it("useNotificationsStream uses sdk.notificationsStream", () => {
    expect(hooksContent).toContain("notificationsStream");
    expect(sdkContent).toMatch(/\bnotificationsStream\b/);
  });
});
