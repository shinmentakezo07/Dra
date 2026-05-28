import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSDK } from "./sdk";
import type {
  APIKey,
  APILog,
  AnalyticsData,
  UserCredits,
  CreditTransaction,
  PaginatedResult,
  Conversation,
  ConversationMessage,
  Prompt,
  Webhook,
  Organization,
  OrgMember,
  BatchJob,
  FileInfo,
  BudgetConfig,
  BudgetAlert,
  BudgetCap,
  NotificationEvent,
  ProviderHealthStatus,
  CircuitBreakerStatus,
  ProviderSummary,
  ModelInfo,
  PlatformStats,
} from "./sdk";

// ============================================================================
// API Keys
// ============================================================================

export function useKeys() {
  return useQuery<APIKey[]>({
    queryKey: ["keys"],
    queryFn: () => getSDK().listKeys(),
  });
}

export function useCreateKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string }) => getSDK().createKey(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["keys"] }),
  });
}

export function useDeleteKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => getSDK().deleteKey(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["keys"] }),
  });
}

export function useRevokeKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => getSDK().revokeKey(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["keys"] }),
  });
}

// ============================================================================
// Credits & Billing
// ============================================================================

export function useCredits() {
  return useQuery<UserCredits>({
    queryKey: ["credits"],
    queryFn: () => getSDK().getCredits(),
    refetchInterval: 30_000,
  });
}

export function usePurchaseCredits() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { amount: number }) => getSDK().purchaseCredits(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["credits"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

export function useBudget() {
  return useQuery<BudgetConfig>({
    queryKey: ["budget"],
    queryFn: () => getSDK().getBudget(),
  });
}

export function useSetBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<BudgetConfig>) => getSDK().setBudget(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["budget"] }),
  });
}

export function useBudgetAlerts() {
  return useQuery<BudgetAlert[]>({
    queryKey: ["budget-alerts"],
    queryFn: () => getSDK().listBudgetAlerts(),
  });
}

export function useCreateBudgetAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { thresholdPercent: number; alertType?: string }) =>
      getSDK().createBudgetAlert(data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["budget-alerts"] }),
  });
}

export function useDeleteBudgetAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => getSDK().deleteBudgetAlert(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["budget-alerts"] }),
  });
}

export function useBudgetCap() {
  return useQuery<BudgetCap>({
    queryKey: ["budget-cap"],
    queryFn: () => getSDK().getBudgetCap(),
  });
}

export function useCreateBudgetCap() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      hardLimit: number;
      softLimit?: number;
      actionOnExceed?: string;
    }) => getSDK().createBudgetCap(data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["budget-cap"] }),
  });
}

export function useUpdateBudgetCap() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      hardLimit: number;
      softLimit?: number;
      actionOnExceed?: string;
    }) => getSDK().updateBudgetCap(data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["budget-cap"] }),
  });
}

export function useDeleteBudgetCap() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => getSDK().deleteBudgetCap(),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["budget-cap"] }),
  });
}

export function useTransactions(page: number, limit: number) {
  return useQuery<PaginatedResult<CreditTransaction>>({
    queryKey: ["transactions", page, limit],
    queryFn: () => getSDK().listTransactions(page, limit),
    placeholderData: (previousData) => previousData,
  });
}

// ============================================================================
// Analytics & Logs
// ============================================================================

export function useAnalytics() {
  return useQuery<AnalyticsData>({
    queryKey: ["analytics"],
    queryFn: () => getSDK().getAnalytics(),
    refetchInterval: 30_000,
  });
}

export function useLogs(page: number, limit: number) {
  return useQuery<PaginatedResult<APILog>>({
    queryKey: ["logs", page, limit],
    queryFn: () => getSDK().listLogs(page, limit),
    placeholderData: (previousData) => previousData,
  });
}

// ============================================================================
// Models
// ============================================================================

export function useModels() {
  return useQuery<ModelInfo[]>({
    queryKey: ["models"],
    queryFn: () => getSDK().listModels(),
  });
}

// ============================================================================
// Conversations
// ============================================================================

export function useConversations(page?: number, limit?: number) {
  return useQuery<PaginatedResult<Conversation>>({
    queryKey: ["conversations", page, limit],
    queryFn: () => getSDK().listConversations(page, limit),
  });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; model: string }) =>
      getSDK().createConversation(data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["conversations"] }),
  });
}

export function useConversation(id: string) {
  return useQuery<Conversation>({
    queryKey: ["conversation", id],
    queryFn: () => getSDK().getConversation(id),
    enabled: !!id,
  });
}

export function useDeleteConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => getSDK().deleteConversation(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["conversations"] }),
  });
}

export function useAddMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      conversationId,
      data,
    }: {
      conversationId: string;
      data: { role: string; content: string };
    }) => getSDK().addMessage(conversationId, data),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({
        queryKey: ["conversation", vars.conversationId],
      });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

// ============================================================================
// Prompts
// ============================================================================

export function usePrompts() {
  return useQuery<Prompt[]>({
    queryKey: ["prompts"],
    queryFn: () => getSDK().listPrompts(),
  });
}

export function useCreatePrompt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      content: string;
      description?: string;
      template?: boolean;
    }) => getSDK().createPrompt(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["prompts"] }),
  });
}

export function usePrompt(name: string) {
  return useQuery<Prompt>({
    queryKey: ["prompt", name],
    queryFn: () => getSDK().getPrompt(name),
    enabled: !!name,
  });
}

export function useRenderPrompt() {
  return useMutation({
    mutationFn: ({
      name,
      variables,
    }: {
      name: string;
      variables: Record<string, string>;
    }) => getSDK().renderPrompt(name, variables),
  });
}

export function useDeletePrompt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => getSDK().deletePrompt(name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["prompts"] }),
  });
}

// ============================================================================
// Webhooks
// ============================================================================

export function useWebhooks() {
  return useQuery<Webhook[]>({
    queryKey: ["webhooks"],
    queryFn: () => getSDK().listWebhooks(),
  });
}

export function useCreateWebhook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; url: string; events: string[] }) =>
      getSDK().createWebhook(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["webhooks"] }),
  });
}

export function useUpdateWebhook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Webhook> }) =>
      getSDK().updateWebhook(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["webhooks"] }),
  });
}

export function useDeleteWebhook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => getSDK().deleteWebhook(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["webhooks"] }),
  });
}

// ============================================================================
// Organizations
// ============================================================================

export function useOrganizations() {
  return useQuery<Organization[]>({
    queryKey: ["organizations"],
    queryFn: () => getSDK().listOrganizations(),
  });
}

export function useCreateOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string }) => getSDK().createOrganization(data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["organizations"] }),
  });
}

export function useOrganization(id: string) {
  return useQuery<Organization>({
    queryKey: ["organization", id],
    queryFn: () => getSDK().getOrganization(id),
    enabled: !!id,
  });
}

export function useInviteMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      orgId,
      data,
    }: {
      orgId: string;
      data: { email: string; role?: string };
    }) => getSDK().inviteMember(orgId, data),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({
        queryKey: ["organization", vars.orgId, "members"],
      });
    },
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, userId }: { orgId: string; userId: string }) =>
      getSDK().removeMember(orgId, userId),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({
        queryKey: ["organization", vars.orgId, "members"],
      });
    },
  });
}

export function useOrgMembers(orgId: string) {
  return useQuery<OrgMember[]>({
    queryKey: ["organization", orgId, "members"],
    queryFn: () => getSDK().listMembers(orgId),
    enabled: !!orgId,
  });
}

export function useAcceptInvite() {
  return useMutation({
    mutationFn: (data: { token: string }) => getSDK().acceptInvite(data),
  });
}

// ============================================================================
// Batch Jobs
// ============================================================================

export function useSubmitBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      requests: Array<{
        model: string;
        messages: { role: string; content: string }[];
      }>;
    }) => getSDK().submitBatch(data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["batch-jobs"] }),
  });
}

export function useBatchJob(id: string) {
  return useQuery<BatchJob>({
    queryKey: ["batch-job", id],
    queryFn: () => getSDK().getBatchJob(id),
    enabled: !!id,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.status === "pending" || data?.status === "processing") {
        return 5_000;
      }
      return false;
    },
  });
}

// ============================================================================
// Files
// ============================================================================

export function useFiles() {
  return useQuery<FileInfo[]>({
    queryKey: ["files"],
    queryFn: () => getSDK().listFiles(),
  });
}

export function useUploadFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, name }: { file: File | Blob; name?: string }) =>
      getSDK().uploadFile(file, name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["files"] }),
  });
}

// ============================================================================
// Embeddings
// ============================================================================

export function useEmbed() {
  return useMutation({
    mutationFn: (data: { model: string; input: string[] }) =>
      getSDK().embed(data),
  });
}

// ============================================================================
// Notifications (SSE)
// ============================================================================

export function useNotificationsStream(enabled: boolean = true) {
  return useQuery<NotificationEvent[]>({
    queryKey: ["notifications"],
    queryFn: async () => {
      const events: NotificationEvent[] = [];
      const stream = getSDK().notificationsStream();
      // Collect initial burst then stop; for real-time UI, use the stream directly
      const timeout = setTimeout(() => stream.return?.(), 2_000);
      try {
        for await (const event of stream) {
          events.push(event);
          if (events.length >= 20) break;
        }
      } catch (err) {
        // Log auth errors so they aren't silently swallowed
        if (
          err instanceof Error &&
          (err.message.includes("401") ||
            err.message.includes("403") ||
            err.message.includes("Unauthorized"))
        ) {
          console.error("[useNotificationsStream] Auth error:", err.message);
        }
      } finally {
        clearTimeout(timeout);
      }
      return events;
    },
    enabled,
    refetchInterval: false,
    staleTime: Infinity,
  });
}

// ============================================================================
// Provider Health
// ============================================================================

export function useProviderHealth() {
  return useQuery<ProviderHealthStatus[]>({
    queryKey: ["provider-health"],
    queryFn: () => getSDK().adminProviderHealth(),
    refetchInterval: 30_000,
  });
}

export function usePublicProviderHealth() {
  return useQuery<ProviderSummary[]>({
    queryKey: ["public-provider-health"],
    queryFn: () => getSDK().providerHealth(),
    refetchInterval: 30_000,
  });
}

export function useCircuitBreakers() {
  return useQuery<CircuitBreakerStatus[]>({
    queryKey: ["circuit-breakers"],
    queryFn: () => getSDK().adminCircuitBreakers(),
    refetchInterval: 30_000,
  });
}

// ============================================================================
// Admin
// ============================================================================

export function useAdminStats() {
  return useQuery<PlatformStats>({
    queryKey: ["admin-stats"],
    queryFn: () => getSDK().adminStats(),
    refetchInterval: 30_000,
  });
}

export function useAdminUsers(page: number, limit: number = 10) {
  return useQuery({
    queryKey: ["admin-users", page, limit],
    queryFn: () => getSDK().adminListUsers(page, limit),
    placeholderData: (previousData) => previousData,
  });
}

export function useAdminDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => getSDK().adminDeleteUser(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
  });
}

// ============================================================================
// Promo Codes
// ============================================================================

export function useRedeemPromoCode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => getSDK().redeemPromoCode(code),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["credits", "transactions"] }),
  });
}

// ============================================================================
// File Deletion
// ============================================================================

export function useDeleteFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => getSDK().deleteFile(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["files"] }),
  });
}

// ============================================================================
// Batch Jobs — List & Cancel
// ============================================================================

export function useBatchJobs() {
  return useQuery<BatchJob[]>({
    queryKey: ["batch-jobs"],
    queryFn: () => getSDK().listBatchJobs(),
  });
}

export function useCancelBatchJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => getSDK().cancelBatchJob(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["batch-jobs"] }),
  });
}

// ============================================================================
// API Key Update
// ============================================================================

export function useUpdateKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: {
        name?: string;
        allowedModels?: string[];
        allowedIPs?: string[];
        maxTokensPerRequest?: number;
      };
    }) => getSDK().updateKey(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["keys"] }),
  });
}

// ============================================================================
// Conversation Title
// ============================================================================

export function useUpdateConversationTitle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      getSDK().updateConversationTitle(id, title),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["conversation", vars.id] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

// ============================================================================
// Webhook Deliveries
// ============================================================================

export function useWebhookDeliveries(webhookId: string) {
  return useQuery({
    queryKey: ["webhook-deliveries", webhookId],
    queryFn: () => getSDK().listWebhookDeliveries(webhookId),
    enabled: !!webhookId,
  });
}

// ============================================================================
// User Messages (Inbox)
// ============================================================================

export function useUserMessages() {
  return useQuery({
    queryKey: ["user-messages"],
    queryFn: () => getSDK().getUserMessages(),
  });
}

export function useUserMessageUnreadCount() {
  return useQuery<{ unread: number }>({
    queryKey: ["user-messages-unread"],
    queryFn: () => getSDK().getUserMessageUnreadCount(),
    refetchInterval: 30_000,
  });
}

export function useMarkMessageRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => getSDK().markMessageRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-messages"] });
      queryClient.invalidateQueries({ queryKey: ["user-messages-unread"] });
    },
  });
}

export function useMarkAllMessagesRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => getSDK().markAllMessagesRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-messages"] });
      queryClient.invalidateQueries({ queryKey: ["user-messages-unread"] });
    },
  });
}

// ============================================================================
// User Announcements
// ============================================================================

export function useUserAnnouncements() {
  return useQuery({
    queryKey: ["user-announcements"],
    queryFn: () => getSDK().getUserAnnouncements(),
    refetchInterval: 60_000,
  });
}

// ============================================================================
// Comparisons
// ============================================================================

export function useComparisons(page?: number, limit?: number) {
  return useQuery({
    queryKey: ["comparisons", page, limit],
    queryFn: () => getSDK().listComparisons(page, limit),
  });
}

export function useCreateComparison() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { modelA: string; modelB: string; prompt: string }) =>
      getSDK().createComparison(data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["comparisons"] }),
  });
}

export function useComparison(id: string) {
  return useQuery({
    queryKey: ["comparison", id],
    queryFn: () => getSDK().getComparison(id),
    enabled: !!id,
  });
}

export function useDeleteComparison() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => getSDK().deleteComparison(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["comparisons"] }),
  });
}

// ============================================================================
// Fine-Tuning
// ============================================================================

export function useFineTuningJobs(page?: number, limit?: number) {
  return useQuery({
    queryKey: ["fine-tuning-jobs", page, limit],
    queryFn: () => getSDK().listFineTuningJobs(page, limit),
  });
}

export function useFineTuningJob(jobId: string) {
  return useQuery({
    queryKey: ["fine-tuning-job", jobId],
    queryFn: () => getSDK().getFineTuningJob(jobId),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.status === "queued" || data?.status === "running") return 5_000;
      return false;
    },
  });
}

export function useCreateFineTuningJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      baseModel: string;
      datasetId: string;
      hyperparams?: unknown;
    }) => getSDK().createFineTuningJob(data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["fine-tuning-jobs"] }),
  });
}

export function useFineTuningDatasets() {
  return useQuery({
    queryKey: ["fine-tuning-datasets"],
    queryFn: () => getSDK().listFineTuningDatasets(),
  });
}

export function useCreateFineTuningDataset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { filename: string; format: string }) =>
      getSDK().createFineTuningDataset(data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["fine-tuning-datasets"] }),
  });
}

export function useDeleteFineTuningDataset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => getSDK().deleteFineTuningDataset(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["fine-tuning-datasets"] }),
  });
}

// ============================================================================
// Exports
// ============================================================================

export function useExportJobs(page?: number, limit?: number) {
  return useQuery({
    queryKey: ["export-jobs", page, limit],
    queryFn: () => getSDK().listExportJobs(page, limit),
  });
}

export function useCreateExportJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      type: string;
      format: string;
      dateFrom?: string;
      dateTo?: string;
    }) => getSDK().createExportJob(data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["export-jobs"] }),
  });
}

export function useExportJob(id: string) {
  return useQuery({
    queryKey: ["export-job", id],
    queryFn: () => getSDK().getExportJob(id),
    enabled: !!id,
  });
}

// ============================================================================
// Account
// ============================================================================

export function useDeleteAccount() {
  return useMutation({
    mutationFn: () => getSDK().deleteAccount(),
  });
}

// ============================================================================
// Permissions
// ============================================================================

export function useMyPermissions() {
  return useQuery<string[]>({
    queryKey: ["my-permissions"],
    queryFn: () => getSDK().getMyPermissions(),
  });
}
