import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSDK } from "./sdk";
import type { APIKey, APILog, AnalyticsData, UserCredits, CreditTransaction, PaginatedResult } from "./sdk";

const sdk = getSDK();

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

export function useCredits() {
  return useQuery<UserCredits>({
    queryKey: ["credits"],
    queryFn: () => sdk.getCredits(),
  });
}

export function useAnalytics() {
  return useQuery<AnalyticsData>({
    queryKey: ["analytics"],
    queryFn: () => sdk.getAnalytics(),
  });
}

export function useLogs(page: number, limit: number) {
  return useQuery<PaginatedResult<APILog>>({
    queryKey: ["logs", page, limit],
    queryFn: () => sdk.listLogs(page, limit),
    placeholderData: (previousData) => previousData,
  });
}

export function useTransactions(page: number, limit: number) {
  return useQuery<PaginatedResult<CreditTransaction>>({
    queryKey: ["transactions", page, limit],
    queryFn: () => sdk.listTransactions(page, limit),
    placeholderData: (previousData) => previousData,
  });
}
