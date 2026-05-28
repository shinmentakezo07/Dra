import { proxyToBackend } from "@/lib/api/proxy";
import { requireAdmin } from "@/lib/api/require-auth";
import { NextRequest } from "next/server";

const ADMIN_PATHS = [
  "/api/admin/dashboard",
  "/api/admin/dashboard/realtime",
  "/api/admin/users",
  "/api/admin/users/bulk/suspend",
  "/api/admin/users/export",
  "/api/admin/stats",
  "/api/admin/circuit-breakers",
  "/api/admin/provider-health",
  "/api/admin/providers",
  "/api/admin/providers/reorder",
  "/api/admin/providers/maintenance",
  "/api/admin/models",
  "/api/admin/models/bulk-import",
  "/api/admin/models/aliases",
  "/api/admin/models/routing-rules",
  "/api/admin/billing/summary",
  "/api/admin/billing/revenue",
  "/api/admin/billing/transactions",
  "/api/admin/billing/adjustments",
  "/api/admin/billing/top-spenders",
  "/api/admin/billing/dashboard",
  "/api/admin/settings",
  "/api/admin/settings/features",
  "/api/admin/logs",
  "/api/admin/logs/errors",
  "/api/admin/logs/ip-access",
  "/api/admin/logs/suspicious",
  "/api/admin/analytics",
  "/api/admin/audit",
  "/api/admin/audit/export",
  "/api/admin/audit/stats",
  "/api/admin/admins",
  "/api/admin/admins/roles",
  "/api/admin/security",
  "/api/admin/security/impersonate",
  "/api/admin/security/ip-lists",
  "/api/admin/cost",
  "/api/admin/cost/optimizations",
  "/api/admin/cost/forecast",
  "/api/admin/cost/breakdown",
  "/api/admin/cost/ab-tests",
  "/api/admin/cost/benchmarks",
  "/api/admin/operations",
  "/api/admin/operations/cache/flush",
  "/api/admin/operations/webhook-logs",
  "/api/admin/operations/traces",
  "/api/admin/operations/conversations",
  "/api/admin/operations/files",
  "/api/admin/bulk",
  "/api/admin/organizations",
  "/api/admin/messages",
  "/api/admin/announcements",
  "/api/admin/promo-codes",
  "/api/admin/sso",
  "/api/admin/sso/providers",
  "/api/admin/reports",
  "/api/admin/changelog",
  "/api/admin/ip",
  "/api/admin/groups",
  "/api/admin/webhooks/logs",
  "/api/admin/cache/stats",
  "/api/admin/feature-flags",
  "/api/admin/promos",
];

function matchPath(requestPath: string): string | null {
  const url = new URL(requestPath);
  const path = url.pathname;

  // Try exact match first
  for (const p of ADMIN_PATHS) {
    if (path === p) return p;
  }

  // Try prefix match for dynamic routes: /api/admin/users/{id}, /api/admin/providers/{id}, etc.
  // /api/admin/users/{id}/keys, /api/admin/users/{id}/usage, etc.
  const prefixes = [
    "/api/admin/dashboard/",
    "/api/admin/users/",
    "/api/admin/providers/",
    "/api/admin/models/",
    "/api/admin/billing/",
    "/api/admin/settings/",
    "/api/admin/logs/",
    "/api/admin/analytics/",
    "/api/admin/audit/",
    "/api/admin/admins/",
    "/api/admin/security/",
    "/api/admin/cost/",
    "/api/admin/operations/",
    "/api/admin/bulk/",
    "/api/admin/organizations/",
    "/api/admin/messages/",
    "/api/admin/announcements/",
    "/api/admin/promo-codes/",
    "/api/admin/sso/",
    "/api/admin/reports/",
    "/api/admin/changelog/",
    "/api/admin/ip/",
    "/api/admin/groups/",
    "/api/admin/webhooks/",
    "/api/admin/cache/",
    "/api/admin/feature-flags/",
    "/api/admin/promos/",
  ];

  for (const prefix of prefixes) {
    if (path.startsWith(prefix))
      return "/api/admin" + path.slice("/api/admin".length);
  }

  return null;
}

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;
  const backendPath = matchPath(request.url);
  if (!backendPath)
    return Response.json(
      { success: false, error: "Admin endpoint not found" },
      { status: 404 },
    );
  return proxyToBackend(request, backendPath);
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;
  const backendPath = matchPath(request.url);
  if (!backendPath)
    return Response.json(
      { success: false, error: "Admin endpoint not found" },
      { status: 404 },
    );
  return proxyToBackend(request, backendPath);
}

export async function PUT(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;
  const backendPath = matchPath(request.url);
  if (!backendPath)
    return Response.json(
      { success: false, error: "Admin endpoint not found" },
      { status: 404 },
    );
  return proxyToBackend(request, backendPath);
}

export async function DELETE(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;
  const backendPath = matchPath(request.url);
  if (!backendPath)
    return Response.json(
      { success: false, error: "Admin endpoint not found" },
      { status: 404 },
    );
  return proxyToBackend(request, backendPath);
}

export async function PATCH(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;
  const backendPath = matchPath(request.url);
  if (!backendPath)
    return Response.json(
      { success: false, error: "Admin endpoint not found" },
      { status: 404 },
    );
  return proxyToBackend(request, backendPath);
}
