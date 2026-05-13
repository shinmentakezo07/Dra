'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAdminSDK } from '@/lib/api/admin-sdk'
import { Gift, RefreshCw, Check, X, Loader2, Copy, Tag } from 'lucide-react'
import { motion } from 'framer-motion'
import type { PromoCode } from '@/types/admin'

function generateCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 10; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export default function AdminPromosPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [random, setRandom] = useState(true)
  const [customCode, setCustomCode] = useState('')
  const [genCode, setGenCode] = useState(generateCode)
  const [promoType, setPromoType] = useState('credits')
  const [value, setValue] = useState(1000)
  const [maxUses, setMaxUses] = useState(100)
  const [expires, setExpires] = useState('')
  const [copied, setCopied] = useState('')

  const { data: promos, isLoading } = useQuery({
    queryKey: ['admin', 'promos'],
    queryFn: () => getAdminSDK().listPromoCodes(),
  })

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => getAdminSDK().createPromoCode(data as Partial<PromoCode>),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'promos'] }); setShowForm(false) },
  })

  const handleCreate = () => {
    const code = random ? genCode : customCode
    if (!code || value <= 0) return
    createMutation.mutate({
      code, type: promoType, value, maxUses,
      expiresAt: expires || undefined,
      random: true,
    } as unknown as Partial<PromoCode>)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Promo Codes</h1>
          <p className="text-sm text-white/30 mt-1 font-mono">Create and manage promotional codes</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-[14px] bg-blue-500/10 text-blue-400 text-sm font-medium hover:bg-blue-500/20 ring-1 ring-blue-500/20 transition-all duration-200 flex items-center gap-2"
        >
          <Tag className="w-4 h-4" />
          {showForm ? 'Cancel' : 'New Code'}
        </button>
      </div>

      {showForm && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[24px] bg-black/40 backdrop-blur-xl border border-white/[0.05] p-6 space-y-4"
        >
          <h2 className="text-sm font-bold text-white tracking-tight">Create Promo Code</h2>

          <div className="flex items-center gap-3">
            <button onClick={() => setRandom(true)} className={`px-4 py-2 rounded-[12px] text-xs font-mono font-bold tracking-wider transition-all duration-200 ${random ? 'bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20' : 'text-white/30 hover:text-white/50'}`}>Random Generate</button>
            <button onClick={() => setRandom(false)} className={`px-4 py-2 rounded-[12px] text-xs font-mono font-bold tracking-wider transition-all duration-200 ${!random ? 'bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20' : 'text-white/30 hover:text-white/50'}`}>Custom Code</button>
          </div>

          {random ? (
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-black/60 border border-white/[0.05] rounded-[14px] px-4 py-3 font-mono text-lg tracking-[0.3em] text-blue-400 font-bold select-all">
                {genCode}
              </div>
              <button onClick={() => setGenCode(generateCode)} className="p-3 rounded-[12px] hover:bg-white/[0.03] text-white/30 hover:text-white/60 transition-all">
                <RefreshCw className="w-4 h-4" />
              </button>
              <button onClick={() => { navigator.clipboard.writeText(genCode); setCopied(genCode); setTimeout(() => setCopied(''), 1500) }} className="p-3 rounded-[12px] hover:bg-white/[0.03] text-white/30 hover:text-white/60 transition-all">
                {copied === genCode ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          ) : (
            <input
              type="text"
              value={customCode}
              onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
              placeholder="ENTER CUSTOM CODE"
              className="w-full bg-black/60 border border-white/[0.05] rounded-[14px] px-4 py-3 font-mono tracking-widest text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500/30"
            />
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[10px] font-mono font-bold tracking-wider text-white/30 mb-1.5">Type</label>
              <select value={promoType} onChange={(e) => setPromoType(e.target.value)} className="w-full bg-black/60 border border-white/[0.05] rounded-[12px] px-3 py-2.5 text-sm text-white/70 focus:outline-none focus:border-blue-500/30">
                <option value="credits">Credits</option>
                <option value="percentage">Percentage</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-mono font-bold tracking-wider text-white/30 mb-1.5">Value</label>
              <input type="number" value={value} onChange={(e) => setValue(Number(e.target.value))} className="w-full bg-black/60 border border-white/[0.05] rounded-[12px] px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/30" />
            </div>
            <div>
              <label className="block text-[10px] font-mono font-bold tracking-wider text-white/30 mb-1.5">Max Uses</label>
              <input type="number" value={maxUses} onChange={(e) => setMaxUses(Number(e.target.value))} className="w-full bg-black/60 border border-white/[0.05] rounded-[12px] px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/30" />
            </div>
            <div>
              <label className="block text-[10px] font-mono font-bold tracking-wider text-white/30 mb-1.5">Expires</label>
              <input type="date" value={expires} onChange={(e) => setExpires(e.target.value)} className="w-full bg-black/60 border border-white/[0.05] rounded-[12px] px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/30" />
            </div>
          </div>

          <button onClick={handleCreate} disabled={createMutation.isPending} className="px-6 py-2.5 rounded-[14px] bg-blue-500/10 text-blue-400 text-sm font-medium hover:bg-blue-500/20 ring-1 ring-blue-500/20 transition-all duration-200 disabled:opacity-30 flex items-center gap-2">
            {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Create Promo Code
          </button>
        </motion.div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 text-blue-400 animate-spin" /></div>
      ) : !promos || promos.length === 0 ? (
        <div className="rounded-[24px] bg-black/40 backdrop-blur-xl border border-white/[0.05] p-12 text-center">
          <Gift className="w-8 h-8 text-white/10 mx-auto mb-3" />
          <p className="text-sm text-white/20">No promo codes yet</p>
        </div>
      ) : (
        <div className="rounded-[24px] bg-black/40 backdrop-blur-xl border border-white/[0.05] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.05]">
                {['Code', 'Type', 'Value', 'Uses', 'Expires', 'Status', ''].map(h => (
                  <th key={h} className="px-5 py-4 text-[10px] font-mono font-bold tracking-[0.15em] uppercase text-white/30 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {promos.map((p, i) => (
                <motion.tr key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: i * 0.03 } }} className="hover:bg-white/[0.015] transition-colors">
                  <td className="px-5 py-3.5">
                    <span className="font-mono text-sm font-bold text-blue-400/80 tracking-wider">{p.code}</span>
                  </td>
                  <td className="px-5 py-3.5 text-xs font-mono text-white/30 uppercase">{p.type}</td>
                  <td className="px-5 py-3.5 text-sm text-white/70 font-medium">{p.value.toLocaleString()}</td>
                  <td className="px-5 py-3.5 text-xs text-white/40">{p.currentUses}/{p.maxUses}</td>
                  <td className="px-5 py-3.5 text-xs text-white/30 font-mono">{p.expiresAt ? new Date(p.expiresAt).toLocaleDateString() : '—'}</td>
                  <td className="px-5 py-3.5">
                    <span className={`text-[9px] font-mono font-bold tracking-wider uppercase rounded-full px-2.5 py-1 ${p.isActive ? 'text-green-400 bg-green-500/10' : 'text-red-400 bg-red-500/10'}`}>
                      {p.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button className="rounded-[10px] p-2 text-white/20 hover:bg-white/[0.03] hover:text-blue-400/70 transition-all duration-200">
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
