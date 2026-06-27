"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  ArrowUpRight,
  Building2,
  Lock,
  Server,
  Globe,
  Users,
  Shield,
  Check,
  Cpu,
  Database,
  Webhook,
  Layers,
  Gauge,
  Clock,
  PhoneCall,
  Activity,
} from "lucide-react";
import { PageContainer } from "@/components/shared/PageContainer";
import { PageHero } from "@/components/shared/PageHero";
import { SiteFooter } from "@/components/shared/SiteFooter";
import { FeatureCard, PageSection } from "@/components/shared/PageContainer";
import { cn } from "@/lib/utils";

const features = [
  {
    icon: Server,
    title: "Dedicated infrastructure",
    description:
      "Single-tenant clusters with reserved capacity. No noisy neighbors, no throttled keys, no shared limits.",
  },
  {
    icon: Lock,
    title: "SOC 2 Type II, HIPAA-ready",
    description:
      "Audited annually by an independent third party. BAA available. Customer-managed keys via AWS KMS or GCP KMS.",
  },
  {
    icon: Globe,
    title: "Self-hosted or VPC",
    description:
      "Run the gateway inside your own cloud account. Air-gapped deployments available for regulated industries.",
  },
  {
    icon: Gauge,
    title: "Volume pricing & committed spend",
    description:
      "Annual commits with up to 40% discount. Custom rate-limit tiers. Reserved throughput for mission-critical paths.",
  },
  {
    icon: Users,
    title: "SSO, SCIM, and audit logs",
    description:
      "Okta, Azure AD, Google Workspace. Automated user provisioning. Every auth, key, and billing event streamed to your SIEM.",
  },
  {
    icon: PhoneCall,
    title: "24/7 dedicated support",
    description:
      "Named technical account manager. 99.99% SLA with 4-hour P1 response. Direct Slack and on-call escalation.",
  },
];

const sla = [
  { label: "API uptime", value: "99.99%" },
  { label: "P1 response", value: "< 4 hours" },
  { label: "Streaming latency p95", value: "< 800ms" },
  { label: "Provider failover", value: "< 30s" },
];

const industries = [
  "Financial services",
  "Healthcare",
  "Legal",
  "Government",
  "Insurance",
  "Defense",
  "Education",
  "Pharmaceuticals",
];

const customers = [
  { name: "Aurora Capital", sector: "Finance" },
  { name: "Helix Health", sector: "Healthcare" },
  { name: "Tessera Legal", sector: "Legal" },
  { name: "Meridian Insurance", sector: "Insurance" },
  { name: "Borealis Defense", sector: "Defense" },
  { name: "Quantum Education", sector: "Education" },
];

const faqs = [
  {
    q: "Can we self-host the gateway?",
    a: "Yes. The entire Yapapa stack is deployable inside your own AWS, GCP, or Azure account. We support air-gapped installs and provide a Helm chart with all dependencies. Your data never leaves your VPC.",
  },
  {
    q: "Do you sign BAAs and DPAs?",
    a: "Yes — we sign BAAs for HIPAA workloads, DPAs for GDPR, and custom data-residency agreements. Enterprise contracts include EU and US data-isolation options.",
  },
  {
    q: "What’s the procurement process?",
    a: "Most enterprise customers close in 2-4 weeks. We support annual or multi-year commits, custom payment terms, and procurement through AWS Marketplace, GCP Marketplace, and Azure Marketplace.",
  },
  {
    q: "Do you support on-prem and air-gapped?",
    a: "Yes. We have a hardened offline build that updates via signed bundles. Used by defense, healthcare, and government customers operating in disconnected environments.",
  },
];

export default function EnterprisePage() {
  return (
    <PageContainer>
      <div className="max-w-[1080px] mx-auto px-6 sm:px-10">
        <PageHero
          eyebrow="Enterprise"
          title="Production AI for"
          italic="serious teams"
          description="Dedicated infrastructure, audit-grade compliance, and the support you need to run mission-critical AI workloads. Yapapa Enterprise is the layer trusted by finance, healthcare, defense, and Fortune 500 engineering teams."
          icon={Building2}
          primaryCta={{ label: "Talk to Sales", href: "/contact?topic=enterprise", icon: PhoneCall }}
          secondaryCta={{ label: "Read Security Whitepaper", href: "/docs/security" }}
          stats={[
            { value: "99.99%", label: "SLA" },
            { value: "SOC 2", label: "Type II" },
            { value: "8", label: "Regions" },
            { value: "24/7", label: "Support" },
          ]}
        />

        {/* Logos placeholder (customer mentions) */}
        <section className="mb-20 sm:mb-24">
          <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/30 text-center mb-7">
            Trusted by teams that can&apos;t afford downtime
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {customers.map((c, i) => (
              <motion.div
                key={c.name}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.04 }}
                className="px-4 py-5 rounded-xl border border-white/[0.06] bg-gradient-to-br from-white/[0.02] to-transparent text-center"
              >
                <p className="text-[13px] font-semibold text-white/70 tracking-tight">
                  {c.name}
                </p>
                <p className="text-[10px] font-mono text-white/25 mt-1 uppercase tracking-wide">
                  {c.sector}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Features */}
        <PageSection
          id="features"
          icon={Shield}
          eyebrow="What you get"
          title="Built for"
          italic="production"
          description="Every feature you need to run AI at scale, with the controls and compliance your security team will actually approve."
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {features.map((f, i) => (
              <FeatureCard
                key={f.title}
                icon={f.icon}
                title={f.title}
                description={f.description}
                delay={i * 0.04}
              />
            ))}
          </div>
        </PageSection>

        {/* SLA */}
        <PageSection
          id="sla"
          icon={Activity}
          eyebrow="SLA & Performance"
          title="Numbers we put in"
          italic="writing"
        >
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-px overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.04]">
            {sla.map((s) => (
              <div
                key={s.label}
                className="bg-[#06060a] px-5 py-6 hover:bg-indigo-500/[0.04] transition-colors duration-300"
              >
                <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/30 mb-2">
                  {s.label}
                </div>
                <div className="text-[28px] sm:text-[32px] font-semibold tracking-[-0.04em] text-white/95 font-display">
                  {s.value}
                </div>
              </div>
            ))}
          </div>
          <p className="text-[12px] text-white/35 mt-5 max-w-2xl">
            SLA credits are issued automatically when targets are missed.
            Detailed latency and error metrics are available in the dashboard
            and via the StatsD/Prometheus endpoint.
          </p>
        </PageSection>

        {/* Industries */}
        <PageSection
          id="industries"
          icon={Layers}
          eyebrow="Where we operate"
          title="Industries we"
          italic="serve"
        >
          <div className="flex flex-wrap gap-2">
            {industries.map((ind) => (
              <span
                key={ind}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-white/[0.06] bg-gradient-to-br from-white/[0.025] to-transparent text-[13px] text-white/65 hover:border-indigo-500/25 hover:text-white transition-all duration-200"
              >
                <Check className="w-3 h-3 text-indigo-200/70" />
                {ind}
              </span>
            ))}
          </div>
        </PageSection>

        {/* FAQ */}
        <PageSection
          id="faq"
          icon={Clock}
          eyebrow="Procurement"
          title="Frequently"
          italic="asked"
        >
          <div className="space-y-3 max-w-3xl">
            {faqs.map((faq, i) => (
              <motion.details
                key={i}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.4, delay: i * 0.04 }}
                className="group rounded-2xl border border-white/[0.07] bg-gradient-to-br from-white/[0.02] to-transparent overflow-hidden hover:border-indigo-500/20 transition-all duration-300"
              >
                <summary className="cursor-pointer p-5 list-none flex items-center justify-between gap-4">
                  <h3 className="text-[14.5px] font-medium text-white/85 group-hover:text-white transition-colors">
                    {faq.q}
                  </h3>
                  <span className="text-white/30 group-hover:text-indigo-200 transition-colors text-xl leading-none flex-shrink-0 group-open:rotate-45 transition-transform duration-300">
                    +
                  </span>
                </summary>
                <div className="px-5 pb-5 -mt-1">
                  <p className="text-[13.5px] text-white/55 leading-[1.8] border-t border-white/[0.05] pt-4">
                    {faq.a}
                  </p>
                </div>
              </motion.details>
            ))}
          </div>
        </PageSection>

        {/* Bottom CTA */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative mt-12 mb-8 rounded-2xl overflow-hidden border border-indigo-500/20 bg-gradient-to-br from-indigo-500/[0.08] via-violet-500/[0.04] to-transparent p-8 sm:p-12"
        >
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
          <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-indigo-500/[0.12] blur-3xl pointer-events-none" />
          <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="text-[26px] sm:text-[34px] font-semibold tracking-[-0.03em] text-white mb-3">
                Ready to talk{" "}
                <span className="font-display italic font-normal text-indigo-200/95">
                  scale
                </span>
                ?
              </h3>
              <p className="text-[14px] text-white/55 max-w-md leading-[1.7]">
                Our solutions team will design a deployment that fits your
                security and compliance needs. Most calls are booked within 24
                hours.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Link
                href="/contact?topic=enterprise"
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-br from-indigo-500/20 via-indigo-500/12 to-violet-500/10 border border-indigo-500/25 text-[13px] font-medium text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_12px_32px_-8px_rgba(99,102,241,0.55)] transition-all duration-300"
              >
                Talk to Sales
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/docs/security"
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[13px] font-medium text-white/75 hover:bg-white/[0.08] hover:text-white transition-all duration-300"
              >
                Security Whitepaper
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </motion.section>
      </div>
      <SiteFooter />
    </PageContainer>
  );
}
