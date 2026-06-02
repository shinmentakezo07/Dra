// NOTE: This is a best-effort in-memory rate limiter.
// In serverless environments (e.g., Vercel), each function instance has its own
// memory, so this limiter only applies within a single instance. For production
// serverless deployments, use a Redis-backed rate limiter (e.g., @upstash/ratelimit)
// for accurate cross-instance rate limiting.

import { RateLimitError } from "./errors";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 60; // 60 req/min for authenticated
const MAX_ANONYMOUS_REQUESTS = 10; // 10 req/min for anonymous

function cleanup() {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) {
      store.delete(key);
    }
  }
}

// Run cleanup every 5 minutes
setInterval(cleanup, 5 * 60 * 1000);

export function checkRateLimit(
  identifier: string,
  isAuthenticated: boolean,
): void {
  const now = Date.now();
  const maxRequests = isAuthenticated
    ? MAX_REQUESTS_PER_WINDOW
    : MAX_ANONYMOUS_REQUESTS;

  const entry = store.get(identifier);

  if (!entry || entry.resetAt < now) {
    store.set(identifier, {
      count: 1,
      resetAt: now + WINDOW_MS,
    });
    return;
  }

  if (entry.count >= maxRequests) {
    throw new RateLimitError();
  }

  entry.count++;
}

export function getRateLimitInfo(
  identifier: string,
): { remaining: number; resetAt: number } | null {
  const entry = store.get(identifier);
  if (!entry) return null;
  const maxRequests = MAX_REQUESTS_PER_WINDOW;
  return {
    remaining: Math.max(0, maxRequests - entry.count),
    resetAt: entry.resetAt,
  };
}
