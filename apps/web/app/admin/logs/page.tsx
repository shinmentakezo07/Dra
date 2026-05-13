'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getAdminSDK } from '@/lib/api/admin-sdk'
import { Loader2, Search, Filter, Download, RefreshCw, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react'
import type { UsageRecord } from '@/types/admin'

import AdminPageHeader from "../AdminPageHeader";
function StatusBadge({ statusCode }: { statusCode: number }) {
  const isSuccess = statusCode < 400
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
      isSuccess ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
    }`}>
      {isSuccess ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
      {statusCode}
    </span>
  )
}

export default function AdminLogsPage() {
  const [page, setPage] = useState(1)

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'logs', { page }],
    queryFn: () => getAdminSDK().listTransactions({ limit: 20, page }),
  })

  const logs = data?.data ?? []
  const totalPages = data?.totalPages ?? 1

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
        <p className="text-red-400">{error instanceof Error ? error.message : 'Failed to load logs'}</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Request Logs</h1>
        <p className="mt-1 text-sm text-white/50">API request history and error monitoring</p>
      </div>

      {logs.length === 0 ? (
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <Info className="mx-auto h-12 w-12 text-white/20" />
            <p className="mt-4 text-lg font-medium text-white/40">No request logs found</p>
            <p className="mt-1 text-sm text-white/30">API requests will appear here once users start using the platform</p>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/10">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">Timestamp</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">Model</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">Provider</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-white/40">Cost</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-white/40">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {logs.map((log: UsageRecord) => (
                <tr key={log.id} className="text-sm transition-colors hover:bg-white/[0.04]">
                  <td className="whitespace-nowrap px-4 py-3 text-white/60">
                    {new Date(log.createdAt).toLocaleString('en-US', {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                    })}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-white">{log.userId.slice(0, 8)}...</td>
                  <td className="whitespace-nowrap px-4 py-3 text-white/80">{log.model}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-white/60">{log.providerId ?? '—'}</td>
                  <td className="whitespace-nowrap px-4 py-3"><StatusBadge statusCode={log.statusCode} /></td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-white/80">${(log.cost / 100).toFixed(4)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-white/60">{log.durationMs}ms</td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-white/5 px-4 py-3">
              <p className="text-sm text-white/40">Page {page} of {totalPages}</p>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/60 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30">
                  Previous
                </button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/60 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30">
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
