"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Activity,
  CheckCircle2,
  AlertCircle,
  Clock,
  Server,
  Database,
  Cpu,
  Globe,
  Webhook,
  Zap,
  Layers,
  ArrowUpRight,
  RotateCw,
} from "lucide-react";
import { PageContainer } from "@/components/shared/PageContainer";
import { PageHero } from "@/components/shared/PageHero";
import { SiteFooter } from "@/components/shared/SiteFooter";
import { cn } from "@/lib/utils";

type StatusLevel = "operational" | "degraded" | "outage" | "maintenance";

const statusConfig: Record<
  StatusLevel,
  { label: string; color: string; bg: string; border: string; dot: string; ring: string }
> = {
  operational: {
    label: "Operational",
    color: "text-emerald-200",
    bg: "bg-emerald-500/[0.08]",
    border: "border-emerald-500/20",
    dot: "bg-emerald-400",
    ring: "ring-emerald-500/30",
  },
  degraded: {
    label: "Degraded",
    color: "text-amber-200",
    bg: "bg-amber-500/[0.08]",
    border: "border-amber-500/20",
    dot: "bg-amber-400",
    ring: "ring-amber-500/30",
  },
  outage: {
    label: "Outage",
    color: "text-rose-200",
    bg: "bg-rose-500/[0.08]",
    border: "border-rose-500/20",
    dot: "bg-rose-400",
    ring: "ring-rose-500/30",
  },
  maintenance: {
    label: "Maintenance",
    color: "text-sky-200",
    bg: "bg-sky-500/[0.08]",
    border: "border-sky-500/20",
    dot: "bg-sky-400",
    ring: "ring-sky-500/30",
  },
};

interface SystemComponent {
  name: string;
  status: StatusLevel;
  description: string;
  uptime: string;
  icon: typeof Server;
}

const systems: SystemComponent[] = [
  { name: "API Gateway", status: "operational", description: "Edge routing, auth, quota enforcement", uptime: "99.998%", icon: Globe },
  { name: "Chat Completions", status: "operational", description: "OpenAI-compatible /v1/chat/completions", uptime: "99.992%", icon: Zap },
  { name: "Embeddings", status: "operational", description: "Vector generation and semantic cache", uptime: "99.987%", icon: Database },
  { name: "Provider Routing", status: "operational", description: "Multi-vendor failover and key rotation", uptime: "99.999%", icon: Cpu },
  { name: "Streaming (SSE)", status: "operational", description: "Server-sent event delivery", uptime: "99.995%", icon: Activity },
  { name: "Batch API", status: "operational", description: "Async job submission and polling", uptime: "99.989%", icon: Layers },
  { name: "Webhooks Delivery", status: "degraded", description: "Outbound event delivery and DLQ", uptime: "99.851%", icon: Webhook },
  { name: "Dashboard & Console", status: "operational", description: "Web app at app.yapapa.com", uptime: "99.972%", icon: Server },
];

interface Incident {
  date: string;
  title: string;
  status: "resolved" | "monitoring" | "identified";
  duration: string;
  affected: string[];
  updates: Array<{ time: string; message: string }>;
}

const recentIncidents: Incident[] = [
  {
    date: "2026-05-30",
    title: "Elevated webhook delivery latency",
    status: "resolved",
    duration: "47 min",
    affected: ["Webhooks Delivery"],
    updates: [
      { time: "14:23 UTC", message: "Investigating elevated webhook delivery latency in the us-east-1 region." },
      { time: "14:38 UTC", message: "Identified a backlog in the retry worker. Scaling workers and increasing concurrency." },
      { time: "14:51 UTC", message: "Backlog cleared. Webhook latency returned to baseline. Monitoring." },
      { time: "15:10 UTC", message: "Resolved. No data loss. Postmortem will be published within 48 hours." },
    ],
  },
  {
    date: "2026-05-18",
    title: "Brief streaming interruption in EU region",
    status: "resolved",
    duration: "12 min",
    affected: ["Streaming (SSE)", "Provider Routing"],
    updates: [
      { time: "09:14 UTC", message: "Some EU customers may see SSE connections drop. Investigating." },
      { time: "09:21 UTC", message: "Identified — load balancer health check misfire in eu-west-1. Failing over." },
      { time: "09:26 UTC", message: "Resolved. Failover complete and healthy." },
    ],
  },
  {
    date: "2026-05-04",
    title: "Anthropic provider partial degradation",
    status: "resolved",
    duration: "1h 12min",
    affected: ["Chat Completions", "Provider Routing"],
    updates: [
      { time: "16:45 UTC", message: "Anthropic upstream reports elevated 529 errors. Failing over to secondary keys." },
      { time: "17:12 UTC", message: "Anthropic upstream has recovered. Returning to normal routing distribution." },
      { time: "17:57 UTC", message: "All Anthropic requests succeeded post-failover. Resolving incident." },
    ],
  },
];

function UptimeBar({ days = 90 }: { days?: number }) {
  // Simulated 90-day bar with mostly green, one yellow dip
  const bars = Array.from({ length: days }, (_, i) => {
    if (i === 78) return "amber";
    if (i === 56 || i === 57) return "amber";
    return "ok";
  });
  return (
    <div className="flex items-end gap-[2px] h-7">
      {bars.map((b, i) => (
        <div
          key={i}
          className={cn(
            "flex-1 rounded-[1px]",
            b === "ok" ? "bg-emerald-500/60" : "bg-amber-500/80",
          )}
          style={{ height: b === "ok" ? "60%" : "100%" }}
        />
      ))}
    </div>
  );
}

export default function StatusPage() {
  const allOperational = systems.every((s) => s.status === "operational");

  return (
    <PageContainer>
      <div className="max-w-[960px] mx-auto px-6 sm:px-10">
        <PageHero
          eyebrow="System Status"
          title="Built to stay"
          italic="online"
          description="Real-time and historical availability for every Yapapa service. We publish incidents, postmortems, and uptime metrics — no hide-and-seek."
          icon={Activity}
          primaryCta={{ label: "Subscribe to Updates", href: "/changelog" }}
          secondaryCta={{ label: "View Changelog", href: "/changelog" }}
        />

        {/* Big status banner */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mb-16 sm:mb-20"
        >
          <div
            className={cn(
              "relative overflow-hidden rounded-2xl border p-8 sm:p-10",
              allOperational
                ? "border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.06] via-transparent to-transparent"
                : "border-amber-500/20 bg-gradient-to-br from-amber-500/[0.06] via-transparent to-transparent",
            )}
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            <div
              className={cn(
                "absolute -top-20 -right-20 w-72 h-72 rounded-full blur-3xl pointer-events-none",
                allOperational ? "bg-emerald-500/[0.12]" : "bg-amber-500/[0.12]",
              )}
            />
            <div className="relative flex flex-wrap items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <motion.span
                    className="relative flex h-3 w-3"
                    aria-hidden
                  >
                    <span
                      className={cn(
                        "absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping",
                        allOperational ? "bg-emerald-400" : "bg-amber-400",
                      )}
                    />
                    <span
                      className={cn(
                        "relative inline-flex rounded-full h-3 w-3",
                        allOperational ? "bg-emerald-300" : "bg-amber-300",
                      )}
                    />
                  </motion.span>
                  <span
                    className={cn(
                      "text-[10px] font-mono font-semibold uppercase tracking-[0.22em]",
                      allOperational ? "text-emerald-200" : "text-amber-200",
                    )}
                  >
                    Live
                  </span>
                </div>
                <h2 className="text-[26px] sm:text-[34px] font-semibold tracking-[-0.03em] text-white">
                  {allOperational
                    ? "All systems operational"
                    : "Some systems are experiencing issues"}
                </h2>
                <p className="text-[14px] text-white/55 mt-2 max-w-lg leading-relaxed">
                  {allOperational
                    ? "Every service is responding within SLO. Last checked 30 seconds ago."
                    : "We are aware of degraded webhook delivery and are working to restore full service."}
                </p>
              </div>
              <div className="flex items-center gap-2 text-[11px] font-mono text-white/35">
                <RotateCw className="w-3 h-3" />
                Auto-refresh 30s
              </div>
            </div>
          </div>
        </motion.section>

        {/* Components grid */}
        <section className="mb-20 sm:mb-24">
          <header className="flex items-center gap-3 mb-7">
            <div className="w-9 h-9 rounded-xl border border-indigo-500/15 bg-indigo-500/[0.06] flex items-center justify-center">
              <Server className="w-4 h-4 text-indigo-200" />
            </div>
            <h2 className="text-[20px] sm:text-[24px] font-semibold tracking-[-0.025em] text-white">
              Services
            </h2>
            <div className="h-px flex-1 bg-gradient-to-r from-indigo-500/15 via-white/[0.05] to-transparent" />
            <span className="text-[9px] font-mono text-white/25 tracking-[0.18em]">
              {systems.length} COMPONENTS
            </span>
          </header>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {systems.map((sys, i) => {
              const cfg = statusConfig[sys.status];
              return (
                <motion.div
                  key={sys.name}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.5, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
                  className="relative p-5 rounded-2xl border border-white/[0.07] bg-gradient-to-br from-white/[0.025] to-transparent hover:border-indigo-500/20 transition-all duration-300"
                >
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-9 h-9 rounded-lg border border-white/[0.06] bg-white/[0.02] flex items-center justify-center flex-shrink-0">
                      <sys.icon className="w-4 h-4 text-white/45" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-[14px] font-semibold text-white/85">
                        {sys.name}
                      </h3>
                      <p className="text-[11.5px] text-white/40 mt-0.5">
                        {sys.description}
                      </p>
                    </div>
                    <div
                      className={cn(
                        "flex items-center gap-1.5 px-2 py-1 rounded-md border text-[10px] font-mono font-semibold uppercase tracking-[0.12em]",
                        cfg.bg,
                        cfg.border,
                        cfg.color,
                      )}
                    >
                      <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
                      {cfg.label}
                    </div>
                  </div>

                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-white/30 mb-1">
                        90-day uptime
                      </div>
                      <div className="text-[20px] font-semibold text-white/90 tracking-tight tabular-nums">
                        {sys.uptime}
                      </div>
                    </div>
                    <div className="flex-1 max-w-[180px]">
                      <UptimeBar />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* Recent incidents */}
        <section className="mb-20 sm:mb-24">
          <header className="flex items-center gap-3 mb-7">
            <div className="w-9 h-9 rounded-xl border border-indigo-500/15 bg-indigo-500/[0.06] flex items-center justify-center">
              <Clock className="w-4 h-4 text-indigo-200" />
            </div>
            <h2 className="text-[20px] sm:text-[24px] font-semibold tracking-[-0.025em] text-white">
              Recent incidents
            </h2>
            <div className="h-px flex-1 bg-gradient-to-r from-indigo-500/15 via-white/[0.05] to-transparent" />
            <Link
              href="/changelog"
              className="text-[11px] font-mono text-white/30 hover:text-indigo-200 transition-colors flex items-center gap-1"
            >
              All updates <ArrowUpRight className="w-2.5 h-2.5" />
            </Link>
          </header>

          <div className="space-y-3">
            {recentIncidents.map((incident, idx) => (
              <motion.details
                key={idx}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: idx * 0.05, ease: [0.22, 1, 0.36, 1] }}
                className="group rounded-2xl border border-white/[0.07] bg-gradient-to-br from-white/[0.02] to-transparent overflow-hidden hover:border-indigo-500/20 transition-all duration-300"
              >
                <summary className="cursor-pointer p-5 list-none flex items-center gap-4">
                  <div
                    className={cn(
                      "flex items-center justify-center w-9 h-9 rounded-lg border flex-shrink-0",
                      incident.status === "resolved"
                        ? "border-emerald-500/20 bg-emerald-500/[0.08]"
                        : incident.status === "monitoring"
                        ? "border-sky-500/20 bg-sky-500/[0.08]"
                        : "border-amber-500/20 bg-amber-500/[0.08]",
                    )}
                  >
                    {incident.status === "resolved" ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-200" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[14px] font-semibold text-white/85">
                      {incident.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="text-[11px] font-mono text-white/30">
                        {incident.date}
                      </span>
                      <span className="text-white/10">·</span>
                      <span className="text-[11px] font-mono text-white/40">
                        Resolved in {incident.duration}
                      </span>
                    </div>
                  </div>
                  <div
                    className={cn(
                      "text-[10px] font-mono font-semibold uppercase tracking-[0.12em] px-2 py-1 rounded-md border",
                      incident.status === "resolved"
                        ? "bg-emerald-500/[0.08] text-emerald-200 border-emerald-500/20"
                        : "bg-amber-500/[0.08] text-amber-200 border-amber-500/20",
                    )}
                  >
                    {incident.status}
                  </div>
                </summary>

                <div className="px-5 pb-5 space-y-3 border-t border-white/[0.05] pt-4">
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-white/30 mb-2">
                      Affected systems
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {incident.affected.map((a) => (
                        <span
                          key={a}
                          className="inline-flex items-center px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/[0.06] text-[11px] text-white/55 font-mono"
                        >
                          {a}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-white/30 mb-3">
                      Timeline
                    </div>
                    <ol className="space-y-2.5 relative pl-6">
                      <div className="absolute left-2 top-2 bottom-2 w-px bg-white/[0.06]" />
                      {incident.updates.map((u, i) => (
                        <li key={i} className="relative">
                          <div className="absolute -left-[18px] top-1.5 w-1.5 h-1.5 rounded-full bg-indigo-300/70 shadow-[0_0_6px_rgba(99,102,241,0.5)]" />
                          <div className="text-[10px] font-mono text-indigo-200/60 mb-0.5">
                            {u.time}
                          </div>
                          <p className="text-[12.5px] text-white/60 leading-[1.7]">
                            {u.message}
                          </p>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              </motion.details>
            ))}
          </div>
        </section>

        {/* Historical uptime */}
        <section className="mb-16">
          <header className="flex items-center gap-3 mb-7">
            <div className="w-9 h-9 rounded-xl border border-indigo-500/15 bg-indigo-500/[0.06] flex items-center justify-center">
              <Activity className="w-4 h-4 text-indigo-200" />
            </div>
            <h2 className="text-[20px] sm:text-[24px] font-semibold tracking-[-0.025em] text-white">
              90-day uptime
            </h2>
            <div className="h-px flex-1 bg-gradient-to-r from-indigo-500/15 via-white/[0.05] to-transparent" />
          </header>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { label: "API Gateway", uptime: "99.998%" },
              { label: "Chat Completions", uptime: "99.992%" },
              { label: "Provider Routing", uptime: "99.999%" },
            ].map((row) => (
              <div
                key={row.label}
                className="p-5 rounded-2xl border border-white/[0.07] bg-gradient-to-br from-white/[0.025] to-transparent"
              >
                <div className="text-[11px] font-mono text-white/40 mb-2">{row.label}</div>
                <div className="text-[24px] font-semibold text-white/95 tracking-tight tabular-nums mb-3">
                  {row.uptime}
                </div>
                <UptimeBar />
              </div>
            ))}
          </div>
        </section>
      </div>
      <SiteFooter />
    </PageContainer>
  );
}
