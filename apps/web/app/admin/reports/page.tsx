'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getAdminSDK } from '@/lib/api/admin-sdk'
import { Loader2, Search, Filter, Download, RefreshCw, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react'
import type { ScheduledReport } from '@/types/admin'

import AdminPageHeader from "../AdminPageHeader";
export default function AdminReportsPage() {
  const { data: reports, isLoading, error } = useQuery<ScheduledReport[]>({
    queryKey: ['admin', 'reports'],
    queryFn: () => getAdminSDK().listReports(),
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
        <p className="text-red-400">{error instanceof Error ? error.message : 'Failed to load reports'}</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Scheduled Reports</h1>
        <p className="mt-1 text-sm text-white/50">Automated report scheduling and delivery</p>
      </div>

      {!reports || reports.length === 0 ? (
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <Info className="mx-auto h-12 w-12 text-white/20" />
            <p className="mt-4 text-lg font-medium text-white/40">No scheduled reports</p>
            <p className="mt-1 text-sm text-white/30">Create your first scheduled report to automate data delivery</p>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/10">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">Frequency</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">Format</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">Recipients</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">Next Send</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">Last Sent</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-white/40">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {reports.map((report: ScheduledReport) => (
                <tr key={report.id} className="text-sm transition-colors hover:bg-white/[0.04]">
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-white">{report.name}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className="rounded-md bg-white/5 px-2 py-0.5 text-xs font-medium text-white/60 capitalize">{report.frequency}</span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-white/60 uppercase">{report.format}</td>
                  <td className="max-w-[200px] truncate px-4 py-3 text-white/60">{report.recipients.join(', ')}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-white/40">
                    {report.nextSendAt ? new Date(report.nextSendAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-white/40">
                    {report.lastSentAt ? new Date(report.lastSentAt).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      report.isActive ? 'bg-green-500/10 text-green-400' : 'bg-gray-500/10 text-gray-400'
                    }`}>
                      {report.isActive ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      {report.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
