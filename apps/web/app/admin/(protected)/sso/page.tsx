'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getAdminSDK } from '@/lib/api/admin-sdk'
import { Loader2, Search, Filter, Download, RefreshCw, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react'
import type { SSOConfig } from '@/types/admin'

import AdminPageHeader from "../../AdminPageHeader";
function maskClientId(clientId: string): string {
  if (clientId.length <= 8) return clientId.slice(0, 4) + '****'
  return clientId.slice(0, 8) + '****' + clientId.slice(-4)
}

export default function AdminSSOPage() {
  const { data: configs, isLoading, error } = useQuery<SSOConfig[]>({
    queryKey: ['admin', 'sso'],
    queryFn: () => getAdminSDK().listSSOConfigs(),
  })

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-red-400">{error instanceof Error ? error.message : 'Failed to load SSO configs'}</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">SSO Configuration</h1>
        <p className="mt-1 text-sm text-white/50">Single sign-on provider settings</p>
      </div>

      {!configs || configs.length === 0 ? (
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <Info className="mx-auto h-12 w-12 text-white/20" />
            <p className="mt-4 text-lg font-medium text-white/40">No SSO providers configured</p>
            <p className="mt-1 text-sm text-white/30">Add an SSO provider to enable single sign-on for your organization</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {configs.map((cfg) => (
            <div key={cfg.id} className="rounded-xl border border-white/10 bg-white/5 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-semibold text-white">{cfg.label}</h3>
                  <span className="mt-0.5 inline-block rounded-md bg-white/5 px-2 py-0.5 text-xs font-medium text-white/50">
                    {cfg.provider}
                  </span>
                </div>
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  cfg.isActive ? 'bg-green-500/10 text-green-400' : 'bg-gray-500/10 text-gray-400'
                }`}>
                  {cfg.isActive ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                  {cfg.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/40">Issuer</span>
                  <span className="text-white/80">{cfg.issuer}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40">Client ID</span>
                  <span className="font-mono text-white/60">{maskClientId(cfg.clientId)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40">Default Role</span>
                  <span className="text-white/80">{cfg.defaultRole}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40">Auto Provision</span>
                  <span className={cfg.autoProvision ? 'text-green-400' : 'text-white/40'}>{cfg.autoProvision ? 'Enabled' : 'Disabled'}</span>
                </div>
              </div>

              {cfg.allowedDomains.length > 0 && (
                <div className="mt-3">
                  <p className="mb-1 text-xs text-white/40">Allowed Domains</p>
                  <div className="flex flex-wrap gap-1">
                    {cfg.allowedDomains.map((domain) => (
                      <span key={domain} className="rounded-md bg-blue-500/10 px-2 py-0.5 text-xs text-blue-400">{domain}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
