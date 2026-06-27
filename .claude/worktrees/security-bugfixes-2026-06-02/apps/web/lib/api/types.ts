export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface PaginatedRequest {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export function createResponse<T>(
  data: T,
  meta?: ApiResponse<T>["meta"],
): ApiResponse<T> {
  return { success: true, data, meta };
}

export function createErrorResponse(error: string): ApiResponse {
  return { success: false, error };
}

export function parsePagination(searchParams: URLSearchParams): {
  page: number;
  limit: number;
} {
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("limit") || "20", 10)),
  );
  return { page, limit };
}
