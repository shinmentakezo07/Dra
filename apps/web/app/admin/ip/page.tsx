'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getAdminSDK } from '@/lib/api/admin-sdk'
import { Loader2, Search, Filter, Download, RefreshCw, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react'
import type { IPListEntry, IPAccessLog } from '@/types/admin'

const TABS = ['IP Lists', 'Access Logs'] as const

function ActionBadge({ action }: { action: string }) {
  const styles: Record<string, string> = {
    allow: 'bg-green-500/10 text-green-400',
    block: 'bg-red-500/10 text-red-400',
    challenge: 'bg-yellow-500/10 text-yellow-400',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[action] ?? 'bg-gray-500/10 text-gray-400'}`}>
      {action}
    </span>
  )
}

export default function AdminIPPage() {
  const [activeTab, setActiveTab] = useState<string>('IP Lists')

  const { data: ipEntries, isLoading: entriesLoading } = useQuery<IPListEntry[]>({
    queryKey: ['admin', 'ip', 'entries'],
    queryFn: () => getAdminSDK().listIPEntries(),
    enabled: activeTab === 'IP Lists',
  })

  const { data: accessLogs, isLoading: logsLoading } = useQuery({
    queryKey: ['admin', 'ip', 'access-logs', { limit: 20 }],
    queryFn: () => getAdminSDK().listIPAccessLogs({ limit: 20 }),
    enabled: activeTab === 'Access Logs',
  })

  const isLoading = activeTab === 'IP Lists' ? entriesLoading : logsLoading

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">IP Management</h1>
        <p className="mt-1 text-sm text-white/50">IP allow/block lists and access logs</p>
      </div>

      <div className="mb-6 flex gap-1 rounded-lg border border-white/10 bg-white/[0.02] p-1">
        {TABS.map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'
            }`}>
            {tab}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex min-h-[400px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : activeTab === 'IP Lists' ? (
        <div className="overflow-hidden rounded-xl border border-white/10">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">IP/CIDR</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">Action</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">Reason</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-white/40">Expires</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {(!ipEntries || ipEntries.length === 0) ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-sm text-white/30">No IP entries configured</td>
                </tr>
              ) : (
                ipEntries.map((entry: IPListEntry) => (
                  <tr key={entry.id} className="text-sm transition-colors hover:bg-white/[0.04]">
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-white">{entry.ipOrCidr}</td>
                    <td className="whitespace-nowrap px-4 py-3"><ActionBadge action={entry.action} /></td>
                    <td className="whitespace-nowrap px-4 py-3 text-white/60">{entry.reason ?? '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-white/40">
                      {entry.expiresAt ? new Date(entry.expiresAt).toLocaleDateString() : 'Never'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/10">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">IP</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">Method</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">Path</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">Country</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">Blocked</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-white/40">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {(!accessLogs?.data || accessLogs.data.length === 0) ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-white/30">No access logs recorded</td>
                </tr>
              ) : (
                (accessLogs.data as IPAccessLog[]).map((log: IPAccessLog) => (
                  <tr key={log.id} className="text-sm transition-colors hover:bg-white/[0.04]">
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-white">{log.ipAddress}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-white/80">{log.method}</td>
                    <td className="max-w-[200px] truncate px-4 py-3 text-white/60">{log.path}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-white/60">{log.country ?? '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {log.blocked ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-medium text-red-400">
                          <XCircle className="h-3 w-3" /> Blocked
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-400">
                          <CheckCircle className="h-3 w-3" /> Allowed
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-white/40">
                      {new Date(log.createdAt).toLocaleString('en-US', {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
