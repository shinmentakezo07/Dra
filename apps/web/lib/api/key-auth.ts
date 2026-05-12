import { db } from "@/db";
import { apiKeys, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { UnauthorizedError, ForbiddenError } from "./errors";

export interface ApiKeyAuthResult {
  userId: string;
  email: string;
  name: string;
  role: string;
  apiKeyId: string;
}

export async function authenticateApiKey(request: Request): Promise<ApiKeyAuthResult | null> {
  const apiKey = request.headers.get("x-api-key");
  if (!apiKey) return null;

  const keyRecord = await db.query.apiKeys.findFirst({
    where: eq(apiKeys.key, apiKey),
    with: {
      user: true,
    },
  });

  if (!keyRecord || keyRecord.revokedAt) {
    throw new UnauthorizedError("Invalid or revoked API key");
  }

  // Update last used
  await db.update(apiKeys)
    .set({ lastUsed: new Date() })
    .where(eq(apiKeys.id, keyRecord.id));

  return {
    userId: keyRecord.user.id,
    email: keyRecord.user.email,
    name: keyRecord.user.name,
    role: keyRecord.user.role,
    apiKeyId: keyRecord.id,
  };
}

export async function requireApiKeyAuth(request: Request): Promise<ApiKeyAuthResult> {
  const result = await authenticateApiKey(request);
  if (!result) {
    throw new UnauthorizedError("API key required. Pass x-api-key header.");
  }
  return result;
}

export function requireAdmin(auth: ApiKeyAuthResult): void {
  if (auth.role !== "admin") {
    throw new ForbiddenError("Admin access required");
  }
}
