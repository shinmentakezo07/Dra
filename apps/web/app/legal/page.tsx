"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Scale,
  Shield,
  Cookie,
  Globe,
  FileText,
  Mail,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";
import { PageContainer } from "@/components/shared/PageContainer";
import { PageHero } from "@/components/shared/PageHero";
import { SiteFooter } from "@/components/shared/SiteFooter";
import { cn } from "@/lib/utils";

const sections = [
  { id: "terms", label: "Terms of Service", icon: FileText },
  { id: "privacy", label: "Privacy Policy", icon: Shield },
  { id: "cookies", label: "Cookies", icon: Cookie },
  { id: "dpa", label: "Data Processing", icon: Globe },
  { id: "acceptable-use", label: "Acceptable Use", icon: Scale },
];

const tocContainer = "sticky top-24 self-start max-h-[calc(100vh-7rem)] overflow-y-auto pr-4";

export default function LegalPage() {
  return (
    <PageContainer>
      <div className="max-w-[1180px] mx-auto px-6 sm:px-10">
        <PageHero
          eyebrow="Legal"
          title="The fine"
          italic="print"
          description="Plain-language summaries of the legal terms that govern your use of Yapapa. We aim for transparency over legalese — but the official documents below are the source of truth."
          icon={Scale}
          primaryCta={{ label: "Email legal team", href: "mailto:legal@yapapa.com", icon: Mail }}
          secondaryCta={{ label: "Talk to security", href: "/contact?topic=security" }}
        />

        {/* Layout: sticky TOC + content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* TOC */}
          <aside className="lg:col-span-3">
            <div className={tocContainer}>
              <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/30 mb-4">
                On this page
              </p>
              <nav className="space-y-1.5">
                {sections.map((s) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    className="group flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-white/55 hover:text-white hover:bg-white/[0.04] transition-all duration-200"
                  >
                    <s.icon className="w-3.5 h-3.5 text-white/30 group-hover:text-indigo-200 transition-colors" />
                    {s.label}
                  </a>
                ))}
              </nav>
              <div className="mt-8 p-4 rounded-2xl border border-white/[0.07] bg-gradient-to-br from-indigo-500/[0.04] to-transparent">
                <p className="text-[11px] text-white/55 leading-[1.65] mb-2">
                  Need a signed copy, redlined terms, or a custom DPA?
                </p>
                <a
                  href="mailto:legal@yapapa.com"
                  className="text-[12px] text-indigo-200 hover:text-indigo-100 flex items-center gap-1"
                >
                  legal@yapapa.com
                  <ArrowUpRight className="w-3 h-3" />
                </a>
              </div>
            </div>
          </aside>

          {/* Content */}
          <div className="lg:col-span-9 space-y-16 sm:space-y-20 pb-12">
            {/* Terms */}
            <section id="terms" className="scroll-mt-24">
              <LegalHeader
                icon={FileText}
                label="Terms of Service"
                updated="May 1, 2026"
                version="v2.4"
              />
              <p className="text-[15px] text-white/60 leading-[1.85] mb-6">
                By using Yapapa you agree to these terms. We try to keep them
                short, clear, and fair. The summaries below are for convenience
                — the binding terms are the official documents linked at the
                bottom of this section.
              </p>
              <LegalSubSection title="1. Account & access">
                <p>
                  You must be 18 or older and legally able to enter a contract.
                  You&apos;re responsible for your account credentials and for
                  all activity that occurs under your API keys. Rotate keys
                  immediately if you suspect compromise.
                </p>
              </LegalSubSection>
              <LegalSubSection title="2. Acceptable use">
                <p>
                  You may not use the service for illegal activity, to generate
                  harmful content, to violate the rights of others, or in ways
                  that violate our providers&apos; terms. We may suspend
                  accounts that breach this policy, with notice when feasible.
                </p>
              </LegalSubSection>
              <LegalSubSection title="3. Billing & credits">
                <p>
                  Credits are non-refundable except where required by law. We
                  charge for tokens processed, not for uptime or failed
                  requests. We will never auto-renew a paid plan without your
                  consent.
                </p>
              </LegalSubSection>
              <LegalSubSection title="4. Service availability">
                <p>
                  We target 99.99% uptime on Enterprise and 99.95% on Standard.
                  SLA credits are issued automatically; see the SLA addendum
                  for the exact calculation.
                </p>
              </LegalSubSection>
              <LegalSubSection title="5. Termination">
                <p>
                  You may close your account at any time. We may suspend or
                  terminate accounts that breach these terms, with 30 days
                  notice except in cases of immediate harm.
                </p>
              </LegalSubSection>
              <LegalSubSection title="6. Disclaimers & liability">
                <p>
                  The service is provided &quot;as is&quot; without warranties
                  of any kind. To the maximum extent permitted by law, our
                  aggregate liability is capped at fees paid in the prior 12
                  months.
                </p>
              </LegalSubSection>
            </section>

            {/* Privacy */}
            <section id="privacy" className="scroll-mt-24">
              <LegalHeader
                icon={Shield}
                label="Privacy Policy"
                updated="May 1, 2026"
                version="v1.8"
              />
              <p className="text-[15px] text-white/60 leading-[1.85] mb-6">
                We collect the minimum data needed to run a reliable LLM
                gateway. We never sell customer data, never train models on
                your prompts, and never share API keys with anyone — including
                our model providers.
              </p>
              <LegalSubSection title="What we collect">
                <ul className="list-disc pl-5 space-y-1.5 marker:text-indigo-300/60">
                  <li>Account info: name, email, billing details</li>
                  <li>Usage metadata: request counts, tokens, latency, status codes</li>
                  <li>Request payloads: stored only when you opt in to logging</li>
                  <li>Support conversations you initiate with us</li>
                </ul>
              </LegalSubSection>
              <LegalSubSection title="What we never collect">
                <ul className="list-disc pl-5 space-y-1.5 marker:text-rose-300/60">
                  <li>API keys in plaintext past the moment of creation</li>
                  <li>Customer conversation content unless explicitly enabled</li>
                  <li>Personal data beyond what&apos;s listed above</li>
                </ul>
              </LegalSubSection>
              <LegalSubSection title="Data residency">
                <p>
                  Customers can choose US, EU, or AP region for their data.
                  Enterprise customers may also deploy a fully self-hosted
                  instance that never leaves their own cloud.
                </p>
              </LegalSubSection>
              <LegalSubSection title="Your rights">
                <p>
                  You can export, correct, or delete your data at any time from
                  the dashboard. GDPR, CCPA, and LGPD requests are honored
                  within 30 days. Email privacy@yapapa.com.
                </p>
              </LegalSubSection>
            </section>

            {/* Cookies */}
            <section id="cookies" className="scroll-mt-24">
              <LegalHeader
                icon={Cookie}
                label="Cookies"
                updated="May 1, 2026"
                version="v1.2"
              />
              <p className="text-[15px] text-white/60 leading-[1.85] mb-6">
                We use a small number of cookies — only what&apos;s needed to
                keep you signed in, remember your preferences, and measure
                aggregate usage. No advertising, no third-party trackers.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
                {[
                  { name: "session", purpose: "Authentication", duration: "Session", required: true },
                  { name: "csrf", purpose: "Security", duration: "Session", required: true },
                  { name: "prefs", purpose: "UI preferences", duration: "1 year", required: false },
                  { name: "_analytics", purpose: "Aggregate usage", duration: "90 days", required: false },
                ].map((c) => (
                  <div
                    key={c.name}
                    className="p-4 rounded-xl border border-white/[0.06] bg-gradient-to-br from-white/[0.02] to-transparent"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <code className="text-[12.5px] font-mono text-indigo-200/90">{c.name}</code>
                      {c.required && (
                        <span className="text-[9px] font-mono uppercase tracking-[0.15em] text-white/40 border border-white/[0.08] px-1.5 py-0.5 rounded">
                          Required
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] text-white/55 leading-[1.6]">{c.purpose}</p>
                    <p className="text-[10.5px] font-mono text-white/30 mt-1.5">Duration: {c.duration}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* DPA */}
            <section id="dpa" className="scroll-mt-24">
              <LegalHeader
                icon={Globe}
                label="Data Processing Addendum"
                updated="April 1, 2026"
                version="v1.4"
              />
              <p className="text-[15px] text-white/60 leading-[1.85] mb-6">
                Yapapa acts as a data processor for customer content processed
                through the API. Our Data Processing Addendum (DPA) is
                automatically incorporated into your terms if you&apos;re a
                paying customer.
              </p>
              <LegalSubSection title="Sub-processors">
                <p>
                  We use a small list of vetted sub-processors. Changes are
                  notified at least 30 days in advance. Customers can object to
                  new sub-processors and terminate without penalty.
                </p>
              </LegalSubSection>
              <LegalSubSection title="International transfers">
                <p>
                  Data transferred outside the EEA is protected by Standard
                  Contractual Clauses (SCCs) and our EU-US Data Privacy
                  Framework certification.
                </p>
              </LegalSubSection>
              <LegalSubSection title="Security measures">
                <p>
                  Encryption in transit (TLS 1.3) and at rest (AES-256).
                  Annual third-party penetration tests. SOC 2 Type II report
                  available under NDA.
                </p>
              </LegalSubSection>
            </section>

            {/* Acceptable use */}
            <section id="acceptable-use" className="scroll-mt-24">
              <LegalHeader
                icon={Scale}
                label="Acceptable Use Policy"
                updated="March 15, 2026"
                version="v1.1"
              />
              <p className="text-[15px] text-white/60 leading-[1.85] mb-6">
                The following activities are prohibited. We enforce this policy
                with automated filters, manual review, and customer reports.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
                {[
                  "Generating illegal content",
                  "Harassment or threats",
                  "Spam or unsolicited bulk messaging",
                  "Disinformation campaigns",
                  "Generating malware or exploits",
                  "Bypassing safety filters",
                  "Reverse engineering model weights",
                  "Violating provider-specific terms",
                ].map((rule) => (
                  <div
                    key={rule}
                    className="flex items-center gap-2.5 p-3.5 rounded-xl border border-white/[0.06] bg-gradient-to-br from-white/[0.02] to-transparent"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-300/70 flex-shrink-0" />
                    <span className="text-[13px] text-white/65">{rule}</span>
                  </div>
                ))}
              </div>
              <p className="text-[13px] text-white/45 mt-6 leading-[1.7]">
                Suspected violations can be reported to{" "}
                <a
                  href="mailto:abuse@yapapa.com"
                  className="text-indigo-200/80 hover:text-indigo-100"
                >
                  abuse@yapapa.com
                </a>
                . We acknowledge all reports within 24 hours.
              </p>
            </section>

            {/* Bottom contact */}
            <section className="rounded-2xl border border-white/[0.07] bg-gradient-to-br from-white/[0.02] to-transparent p-7">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl border border-indigo-500/20 bg-indigo-500/[0.06] flex items-center justify-center flex-shrink-0">
                  <Mail className="w-5 h-5 text-indigo-200" />
                </div>
                <div>
                  <h3 className="text-[16px] font-semibold text-white mb-1.5">
                    Still have questions?
                  </h3>
                  <p className="text-[13px] text-white/55 leading-[1.7] mb-3">
                    Our legal team is small but responsive. Most messages get a
                    human reply within 24 hours.
                  </p>
                  <a
                    href="mailto:legal@yapapa.com"
                    className="text-[13px] text-indigo-200/80 hover:text-indigo-100 flex items-center gap-1"
                  >
                    legal@yapapa.com
                    <ArrowUpRight className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
      <SiteFooter />
    </PageContainer>
  );
}

function LegalHeader({
  icon: Icon,
  label,
  updated,
  version,
}: {
  icon: typeof FileText;
  label: string;
  updated: string;
  version: string;
}) {
  return (
    <header className="mb-8">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-11 h-11 rounded-xl border border-indigo-500/20 bg-indigo-500/[0.06] flex items-center justify-center">
          <Icon className="w-5 h-5 text-indigo-200" />
        </div>
        <div>
          <h2 className="text-[24px] sm:text-[30px] font-semibold tracking-[-0.03em] text-white leading-tight">
            {label}
          </h2>
          <div className="flex items-center gap-2 mt-1 text-[11px] font-mono text-white/40">
            <span>Updated {updated}</span>
            <span className="text-white/15">·</span>
            <span>Version {version}</span>
          </div>
        </div>
      </div>
      <div className="h-px bg-gradient-to-r from-indigo-500/20 via-white/[0.05] to-transparent" />
    </header>
  );
}

function LegalSubSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-7">
      <h3 className="text-[15px] font-semibold text-white/90 mb-3 tracking-[-0.01em]">
        {title}
      </h3>
      <div className="text-[14px] text-white/60 leading-[1.85] space-y-3">
        {children}
      </div>
    </div>
  );
}
