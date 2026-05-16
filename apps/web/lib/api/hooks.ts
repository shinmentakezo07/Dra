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
} from "./sdk";

const sdk = getSDK();

// ============================================================================
// API Keys
// ============================================================================

export function useKeys() {
  return useQuery<APIKey[]>({
    queryKey: ["keys"],
    queryFn: () => sdk.listKeys(),
  });
}

export function useCreateKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string }) => sdk.createKey(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["keys"] }),
  });
}

export function useDeleteKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => sdk.deleteKey(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["keys"] }),
  });
}

export function useRevokeKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => sdk.revokeKey(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["keys"] }),
  });
}

// ============================================================================
// Credits & Billing
// ============================================================================

export function useCredits() {
  return useQuery<UserCredits>({
    queryKey: ["credits"],
    queryFn: () => sdk.getCredits(),
    refetchInterval: 30_000,
  });
}

export function usePurchaseCredits() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { amount: number }) => sdk.purchaseCredits(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["credits", "transactions"] }),
  });
}

export function useBudget() {
  return useQuery<BudgetConfig>({
    queryKey: ["budget"],
    queryFn: () => sdk.getBudget(),
  });
}

export function useSetBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<BudgetConfig>) => sdk.setBudget(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["budget"] }),
  });
}

export function useBudgetAlerts() {
  return useQuery<BudgetAlert[]>({
    queryKey: ["budget-alerts"],
    queryFn: () => sdk.listBudgetAlerts(),
  });
}

export function useCreateBudgetAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { thresholdPercent: number; alertType?: string }) => sdk.createBudgetAlert(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["budget-alerts"] }),
  });
}

export function useDeleteBudgetAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => sdk.deleteBudgetAlert(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["budget-alerts"] }),
  });
}

export function useBudgetCap() {
  return useQuery<BudgetCap>({
    queryKey: ["budget-cap"],
    queryFn: () => sdk.getBudgetCap(),
  });
}

export function useCreateBudgetCap() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { hardLimit: number; softLimit?: number; actionOnExceed?: string }) =>
      sdk.createBudgetCap(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["budget-cap"] }),
  });
}

export function useUpdateBudgetCap() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { hardLimit: number; softLimit?: number; actionOnExceed?: string }) =>
      sdk.updateBudgetCap(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["budget-cap"] }),
  });
}

export function useDeleteBudgetCap() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => sdk.deleteBudgetCap(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["budget-cap"] }),
  });
}

export function useTransactions(page: number, limit: number) {
  return useQuery<PaginatedResult<CreditTransaction>>({
    queryKey: ["transactions", page, limit],
    queryFn: () => sdk.listTransactions(page, limit),
    placeholderData: (previousData) => previousData,
  });
}

// ============================================================================
// Analytics & Logs
// ============================================================================

export function useAnalytics() {
  return useQuery<AnalyticsData>({
    queryKey: ["analytics"],
    queryFn: () => sdk.getAnalytics(),
    refetchInterval: 30_000,
  });
}

export function useLogs(page: number, limit: number) {
  return useQuery<PaginatedResult<APILog>>({
    queryKey: ["logs", page, limit],
    queryFn: () => sdk.listLogs(page, limit),
    placeholderData: (previousData) => previousData,
  });
}

// ============================================================================
// Conversations
// ============================================================================

export function useConversations(page?: number, limit?: number) {
  return useQuery<PaginatedResult<Conversation>>({
    queryKey: ["conversations", page, limit],
    queryFn: () => sdk.listConversations(page, limit),
  });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; model: string }) => sdk.createConversation(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["conversations"] }),
  });
}

export function useConversation(id: string) {
  return useQuery<Conversation>({
    queryKey: ["conversation", id],
    queryFn: () => sdk.getConversation(id),
    enabled: !!id,
  });
}

export function useDeleteConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => sdk.deleteConversation(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["conversations"] }),
  });
}

export function useAddMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, data }: { conversationId: string; data: { role: string; content: string } }) =>
      sdk.addMessage(conversationId, data),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["conversation", vars.conversationId] });
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
    queryFn: () => sdk.listPrompts(),
  });
}

export function useCreatePrompt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; content: string; description?: string; template?: boolean }) =>
      sdk.createPrompt(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["prompts"] }),
  });
}

export function usePrompt(name: string) {
  return useQuery<Prompt>({
    queryKey: ["prompt", name],
    queryFn: () => sdk.getPrompt(name),
    enabled: !!name,
  });
}

export function useRenderPrompt() {
  return useMutation({
    mutationFn: ({ name, variables }: { name: string; variables: Record<string, string> }) =>
      sdk.renderPrompt(name, variables),
  });
}

export function useDeletePrompt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => sdk.deletePrompt(name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["prompts"] }),
  });
}

// ============================================================================
// Webhooks
// ============================================================================

export function useWebhooks() {
  return useQuery<Webhook[]>({
    queryKey: ["webhooks"],
    queryFn: () => sdk.listWebhooks(),
  });
}

export function useCreateWebhook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; url: string; events: string[] }) => sdk.createWebhook(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["webhooks"] }),
  });
}

export function useUpdateWebhook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Webhook> }) => sdk.updateWebhook(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["webhooks"] }),
  });
}

export function useDeleteWebhook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => sdk.deleteWebhook(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["webhooks"] }),
  });
}

// ============================================================================
// Organizations
// ============================================================================

export function useOrganizations() {
  return useQuery<Organization[]>({
    queryKey: ["organizations"],
    queryFn: () => sdk.listOrganizations(),
  });
}

export function useCreateOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string }) => sdk.createOrganization(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["organizations"] }),
  });
}

export function useOrganization(id: string) {
  return useQuery<Organization>({
    queryKey: ["organization", id],
    queryFn: () => sdk.getOrganization(id),
    enabled: !!id,
  });
}

export function useInviteMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, data }: { orgId: string; data: { email: string; role?: string } }) =>
      sdk.inviteMember(orgId, data),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["organization", vars.orgId, "members"] });
    },
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, userId }: { orgId: string; userId: string }) => sdk.removeMember(orgId, userId),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["organization", vars.orgId, "members"] });
    },
  });
}

export function useOrgMembers(orgId: string) {
  return useQuery<OrgMember[]>({
    queryKey: ["organization", orgId, "members"],
    queryFn: () => sdk.listMembers(orgId),
    enabled: !!orgId,
  });
}

export function useAcceptInvite() {
  return useMutation({
    mutationFn: (data: { token: string }) => sdk.acceptInvite(data),
  });
}

// ============================================================================
// Batch Jobs
// ============================================================================

export function useSubmitBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { requests: Array<{ model: string; messages: { role: string; content: string }[] }> }) =>
      sdk.submitBatch(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["batch-jobs"] }),
  });
}

export function useBatchJob(id: string) {
  return useQuery<BatchJob>({
    queryKey: ["batch-job", id],
    queryFn: () => sdk.getBatchJob(id),
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
    queryFn: () => sdk.listFiles(),
  });
}

export function useUploadFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, name }: { file: File | Blob; name?: string }) => sdk.uploadFile(file, name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["files"] }),
  });
}

// ============================================================================
// Embeddings
// ============================================================================

export function useEmbed() {
  return useMutation({
    mutationFn: (data: { model: string; input: string[] }) => sdk.embed(data),
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
      const stream = sdk.notificationsStream();
      // Collect initial burst then stop; for real-time UI, use the stream directly
      const timeout = setTimeout(() => stream.return?.(), 2_000);
      try {
        for await (const event of stream) {
          events.push(event);
          if (events.length >= 20) break;
        }
      } catch {
        // Stream closed
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
    queryFn: () => sdk.adminProviderHealth(),
    refetchInterval: 30_000,
  });
}

export function usePublicProviderHealth() {
  return useQuery<ProviderSummary[]>({
    queryKey: ["public-provider-health"],
    queryFn: () => sdk.providerHealth(),
    refetchInterval: 30_000,
  });
}

export function useCircuitBreakers() {
  return useQuery<CircuitBreakerStatus[]>({
    queryKey: ["circuit-breakers"],
    queryFn: () => sdk.adminCircuitBreakers(),
    refetchInterval: 30_000,
  });
}
