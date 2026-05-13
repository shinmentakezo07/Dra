'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getAdminSDK } from '@/lib/api/admin-sdk'
import { Loader2, Search, Filter, Download, RefreshCw, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react'
import AdminPageHeader from '../AdminPageHeader'

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
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Cost Intelligence</h1>
        <p className="mt-1 text-sm text-white/50">Usage analysis and cost optimization</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-wider text-white/50">Current Month Spend</p>
          <p className="mt-2 text-3xl font-bold text-white">
            ${forecast ? (forecast.currentMonth / 100).toFixed(2) : '—'}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-wider text-white/50">Forecasted Total</p>
          <p className="mt-2 text-3xl font-bold text-yellow-400">
            ${forecast ? (forecast.forecast / 100).toFixed(2) : '—'}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-wider text-white/50">Previous Month</p>
          <p className="mt-2 text-3xl font-bold text-white">
            ${forecast ? (forecast.previousMonth / 100).toFixed(2) : '—'}
          </p>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-white">Optimization Suggestions</h2>
        {!optimizations || optimizations.length === 0 ? (
          <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-white/10 bg-white/5">
            <div className="text-center">
              <Info className="mx-auto h-8 w-8 text-white/20" />
              <p className="mt-2 text-sm text-white/30">No optimization suggestions available</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {optimizations.map((opt) => (
              <div key={opt.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-white">{opt.title}</h3>
                    <p className="mt-1 text-sm text-white/50">{opt.description}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                      opt.impact === 'high' ? 'bg-green-500/10 text-green-400'
                        : opt.impact === 'medium' ? 'bg-yellow-500/10 text-yellow-400'
                        : 'bg-blue-500/10 text-blue-400'
                    }`}>
                      {opt.impact} impact
                    </span>
                    <span className="text-sm font-medium text-green-400">
                      Save ${(opt.potentialSavings / 100).toFixed(2)}/mo
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
