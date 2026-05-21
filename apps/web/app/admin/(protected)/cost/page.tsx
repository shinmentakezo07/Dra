'use client'

import { useQuery } from '@tanstack/react-query'
import { getAdminSDK } from '@/lib/api/admin-sdk'
import { Info, TrendingUp } from 'lucide-react'
import AdminPageHeader from '../../AdminPageHeader'
import { cn } from '@/lib/utils'

interface CostForecast {
  currentMonth: number
  forecast: number
  previousMonth: number
}

interface OptimizationSuggestion {
  id: string
  title: string
  description: string
  potentialSavings: number
  impact: 'high' | 'medium' | 'low'
}

export default function AdminCostPage() {
  const { data: optimizations, isLoading: optLoading } = useQuery({
    queryKey: ['admin', 'cost', 'optimizations'],
    queryFn: () => getAdminSDK().costOptimizations() as Promise<OptimizationSuggestion[]>,
  })

  const { data: forecast, isLoading: forecastLoading } = useQuery({
    queryKey: ['admin', 'cost', 'forecast'],
    queryFn: () => getAdminSDK().costForecast() as Promise<CostForecast>,
  })

  const isLoading = optLoading || forecastLoading

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="relative w-10 h-10">
          <div className="absolute inset-0 rounded-full border border-[var(--admin-border)]" />
          <div className="absolute inset-0 rounded-full border-t-indigo-400/60 border-2 border-transparent animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <AdminPageHeader title="Cost Intelligence" subtitle="Usage analysis and cost optimization">
      {/* Forecast Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="admin-card p-6">
          <p className="admin-label mb-2">Current Month Spend</p>
          <p className="admin-stat-value">
            ${forecast ? (forecast.currentMonth / 100).toFixed(2) : '—'}
          </p>
        </div>
        <div className="admin-card p-6 border-amber-500/10">
          <div className="flex items-center gap-2 mb-2">
            <p className="admin-label">Forecasted Total</p>
            <TrendingUp className="w-3 h-3 text-amber-400/50" />
          </div>
          <p className="admin-stat-value text-amber-400">
            ${forecast ? (forecast.forecast / 100).toFixed(2) : '—'}
          </p>
        </div>
        <div className="admin-card p-6">
          <p className="admin-label mb-2">Previous Month</p>
          <p className="admin-stat-value">
            ${forecast ? (forecast.previousMonth / 100).toFixed(2) : '—'}
          </p>
        </div>
      </div>

      {/* Optimization Suggestions */}
      <div>
        <h2 className="text-[15px] font-semibold text-[var(--admin-text)] mb-4">Optimization Suggestions</h2>
        {!optimizations || optimizations.length === 0 ? (
          <div className="admin-card flex min-h-[200px] items-center justify-center">
            <div className="text-center">
              <Info className="mx-auto h-7 w-7 text-[var(--admin-text-dim)]" />
              <p className="mt-2 text-[12px] text-[var(--admin-text-dim)]">No optimization suggestions available</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {optimizations.map((opt) => (
              <div key={opt.id} className="admin-card p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-medium text-[var(--admin-text)] text-[14px]">{opt.title}</h3>
                    <p className="mt-1 text-[12px] text-[var(--admin-text-muted)] leading-relaxed">{opt.description}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span className={cn(
                      "admin-badge",
                      opt.impact === 'high' ? 'text-emerald-400 bg-emerald-500/8 border border-emerald-500/15'
                        : opt.impact === 'medium' ? 'text-amber-400 bg-amber-500/8 border border-amber-500/15'
                        : 'text-indigo-400 bg-indigo-500/8 border border-indigo-500/15',
                    )}>
                      {opt.impact} impact
                    </span>
                    <span className="text-[12px] font-medium text-emerald-400">
                      Save ${(opt.potentialSavings / 100).toFixed(2)}/mo
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminPageHeader>
  )
}
