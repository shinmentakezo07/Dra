"use client";

import { Loader2 } from "lucide-react";
import { getAdminSDK } from "@/lib/api/admin-sdk";

export default function AdminSSOPage() {
  void getAdminSDK;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">SSO Configuration</h1>
        <p className="mt-1 text-sm text-white/50">Single sign-on provider settings</p>
      </div>

      <div className="flex flex-col items-center justify-center min-h-[300px] rounded-xl border border-white/5 bg-white/5">
        <div className="rounded-full bg-blue-500/10 p-4 mb-4">
          <Loader2 className="h-8 w-8 text-blue-400" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">SSO configuration coming soon</h3>
        <p className="text-sm text-white/50 max-w-md text-center">
          Single sign-on configuration will be available here. You'll be able to
          configure SAML, OIDC, and other SSO providers for your organization.
        </p>
      </div>
    </div>
  );
}
