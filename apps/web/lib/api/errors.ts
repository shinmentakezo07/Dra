export class ApiError extends Error {
  constructor(
    message: string,
    public status: number = 500,
    public code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = "Unauthorized") {
    super(message, 401, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = "Forbidden") {
    super(message, 403, "FORBIDDEN");
  }
}

export class BadRequestError extends ApiError {
  constructor(message = "Bad Request") {
    super(message, 400, "BAD_REQUEST");
  }
}

export class NotFoundError extends ApiError {
  constructor(message = "Not Found") {
    super(message, 404, "NOT_FOUND");
  }
}

export class RateLimitError extends ApiError {
  constructor(message = "Rate limit exceeded") {
    super(message, 429, "RATE_LIMITED");
  }
}

export class PaymentRequiredError extends ApiError {
  constructor(message = "Insufficient credits") {
    super(message, 402, "PAYMENT_REQUIRED");
  }
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "An unexpected error occurred";
}

export function getErrorStatus(error: unknown): number {
  if (error instanceof ApiError) return error.status;
  return 500;
}
