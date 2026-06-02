import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

/**
 * These tests verify that the frontend dashboard components are wired to
 * real API calls and do not contain mock data or simulated responses.
 * If any component still uses hardcoded mock data, these tests will fail.
 */

describe("Frontend-Backend Wiring Verification", () => {
  const dashboardDir = path.resolve(__dirname, "../app/dashboard");

  it("has no mock data arrays in dashboard client components", () => {
    const clientFiles = [
      "keys/KeysClient.tsx",
      "logs/LogsClient.tsx",
      "analytics/AnalyticsClient.tsx",
      "DashboardOverviewClient.tsx",
    ];

    for (const file of clientFiles) {
      const content = fs.readFileSync(path.join(dashboardDir, file), "utf-8");

      // Reject hardcoded mock arrays
      expect(content).not.toMatch(/mock\w+\s*=/i);
      expect(content).not.toMatch(/const\s+mock/i);

      // Must import from SDK
      expect(content).toMatch(/from\s+"@\/lib\/api\/sdk"/);

      // Must use getSDK() for API calls
      expect(content).toMatch(/getSDK\(\)/);
    }
  });

  it("has no TODO/FIXME comments about wiring", () => {
    const appDir = path.resolve(__dirname, "../app");
    const files = walkTsxFiles(appDir);

    for (const file of files) {
      const content = fs.readFileSync(file, "utf-8");
      const lines = content.split("\n");

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (/TODO.*wire|FIXME.*wire|TODO.*mock|FIXME.*mock/i.test(line)) {
          expect.fail(`Found wiring TODO in ${file}:${i + 1}: ${line.trim()}`);
        }
      }
    }
  });

  it("SDK exports all required types and methods", () => {
    const sdkPath = path.resolve(__dirname, "../lib/api/sdk.ts");
    const content = fs.readFileSync(sdkPath, "utf-8");

    const requiredExports = [
      "DraSDK",
      "configureSDK",
      "getSDK",
      "User",
      "APIKey",
      "APILog",
      "UserCredits",
      "CreditTransaction",
      "ModelInfo",
      "AnalyticsData",
      "PaginatedResult",
    ];

    for (const name of requiredExports) {
      const exportPattern = new RegExp(
        `export (interface|class|function|type).*\\b${name}\\b|export \\{[^}]*\\b${name}\\b[^}]*\\}`,
      );
      expect(content).toMatch(exportPattern);
    }
  });

  it("API route files proxy to backend", () => {
    const apiDir = path.resolve(__dirname, "../app/api");
    const routeFiles = findRouteFiles(apiDir);

    for (const file of routeFiles) {
      const content = fs.readFileSync(file, "utf-8");
      const relPath = path.relative(apiDir, file);

      // Skip NextAuth routes — they handle their own auth
      if (relPath.includes("auth/")) continue;

      // Each route should either proxy to backend or use backend SDK
      const proxies =
        content.includes("proxyToBackend") || content.includes("getSDK()");
      const forwards =
        content.includes("fetch(") || content.includes("BACKEND_URL");

      if (!proxies && !forwards) {
        expect.fail(`API route ${relPath} does not appear to proxy to backend`);
      }
    }
  });

  it("chat route converts SSE to Vercel Data Stream", () => {
    const chatRoute = path.resolve(__dirname, "../app/api/chat/route.ts");
    const content = fs.readFileSync(chatRoute, "utf-8");

    expect(content).toMatch(/encodeDataStream/);
    expect(content).toMatch(/encodeStreamFinish/);
    expect(content).toMatch(/0:/);
    expect(content).toMatch(/e:\{\}/);
  });

  it("protected API routes verify auth before proxying", () => {
    const apiDir = path.resolve(__dirname, "../app/api");
    const routeFiles = findRouteFiles(apiDir);

    for (const file of routeFiles) {
      const content = fs.readFileSync(file, "utf-8");
      const relPath = path.relative(apiDir, file);

      // Skip NextAuth and chat routes — they handle auth differently
      if (relPath.includes("auth/")) continue;
      if (relPath.includes("chat/")) continue;

      const hasAuthCheck =
        content.includes("requireAuth") || content.includes("requireAdmin");
      if (!hasAuthCheck) {
        expect.fail(
          `API route ${relPath} missing auth check (requireAuth/requireAdmin)`,
        );
      }
    }
  });
});

function walkTsxFiles(dir: string): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (
      entry.isDirectory() &&
      entry.name !== "node_modules" &&
      entry.name !== ".next"
    ) {
      results.push(...walkTsxFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".tsx")) {
      results.push(fullPath);
    }
  }
  return results;
}

function findRouteFiles(dir: string): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findRouteFiles(fullPath));
    } else if (entry.isFile() && entry.name === "route.ts") {
      results.push(fullPath);
    }
  }
  return results;
}
