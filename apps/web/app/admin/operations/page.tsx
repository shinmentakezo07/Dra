'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getAdminSDK } from '@/lib/api/admin-sdk'
import { Loader2, Search, Filter, Download, RefreshCw, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react'
import AdminPageHeader from '../AdminPageHeader'

interface CacheStats {
  entries: number
  size: string
  hitRate: number
}

interface WebhookLogEntry {
  id: string
  event: string
  status: number
  duration: number
  createdAt: string
}

export default function AdminOperationsPage() {
  const { data: cacheStats, isLoading: cacheLoading } = useQuery({
    queryKey: ['admin', 'operations', 'cache-stats'],
    queryFn: () => getAdminSDK().cacheStats() as Promise<CacheStats>,
  })

  const { data: webhookLogs, isLoading: webhookLoading } = useQuery({
    queryKey: ['admin', 'operations', 'webhook-logs'],
    queryFn: () => getAdminSDK().listWebhookLogs() as Promise<{ data: WebhookLogEntry[] } | WebhookLogEntry[]>,
  })

  const [clearing, setClearing] = useState(false)

  const handleClearCache = async () => {
    setClearing(true)
    try {
      await getAdminSDK().clearCache()
    } finally {
      setClearing(false)
    }
  }

  const isLoading = cacheLoading || webhookLoading

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  const logs: WebhookLogEntry[] = Array.isArray(webhookLogs) ? webhookLogs : (webhookLogs?.data ?? [])

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Operations</h1>
        <p className="mt-1 text-sm text-white/50">Cache management, webhooks, and tracing</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          <h2 className="mb-4 text-lg font-semibold text-white">Cache Stats</h2>
          {cacheStats ? (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-white/50">Entries</p>
                <p className="mt-1 text-2xl font-bold text-white">{cacheStats.entries.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-white/50">Size</p>
                <p className="mt-1 text-2xl font-bold text-white">{cacheStats.size}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-white/50">Hit Rate</p>
                <p className="mt-1 text-2xl font-bold text-green-400">{(cacheStats.hitRate * 100).toFixed(1)}%</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-white/40">Cache stats unavailable</p>
          )}

          <h2 className="mb-3 mt-6 text-lg font-semibold text-white">Cache Control</h2>
          <button onClick={handleClearCache} disabled={clearing}
            className="inline-flex items-center gap-2 rounded-lg bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/20 disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${clearing ? 'animate-spin' : ''}`} />
            {clearing ? 'Clearing...' : 'Clear Cache'}
          </button>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          <h2 className="mb-4 text-lg font-semibold text-white">Webhook Deliveries</h2>
          {!logs || logs.length === 0 ? (
            <div className="flex min-h-[200px] items-center justify-center">
              <div className="text-center">
                <Info className="mx-auto h-8 w-8 text-white/20" />
                <p className="mt-2 text-sm text-white/30">No webhook deliveries yet</p>
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-white/10">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.02]">
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-white/40">Event</th>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-white/40">Status</th>
                    <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-white/40">Duration</th>
                    <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-white/40">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {logs.slice(0, 10).map((log: WebhookLogEntry) => (
                    <tr key={log.id} className="text-sm transition-colors hover:bg-white/[0.04]">
                      <td className="whitespace-nowrap px-3 py-2 font-medium text-white">{log.event}</td>
                      <td className="whitespace-nowrap px-3 py-2">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                          log.status < 400 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                        }`}>
                          {log.status < 400 ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                          {log.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right text-white/60">{log.duration}ms</td>
                      <td className="whitespace-nowrap px-3 py-2 text-right text-white/40">
                        {new Date(log.createdAt).toLocaleString('en-US', {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
