"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";
import {
  Mail,
  MessageSquare,
  Send,
  Sparkles,
  Building2,
  LifeBuoy,
  Bug,
  Newspaper,
  Check,
  ArrowUpRight,
  PhoneCall,
} from "lucide-react";
import { PageContainer } from "@/components/shared/PageContainer";
import { PageHero } from "@/components/shared/PageHero";
import { SiteFooter } from "@/components/shared/SiteFooter";
import { cn } from "@/lib/utils";

const topics = [
  { id: "sales", label: "Sales & pricing", icon: Building2, desc: "Volume plans, custom contracts, marketplace billing." },
  { id: "support", label: "Technical support", icon: LifeBuoy, desc: "API issues, integration help, debugging." },
  { id: "security", label: "Security disclosure", icon: Mail, desc: "Coordinated disclosure, BAA requests, audit logs." },
  { id: "press", label: "Press & media", icon: Newspaper, desc: "Interviews, briefings, brand assets." },
  { id: "partnerships", label: "Partnerships", icon: MessageSquare, desc: "Integrations, resellers, ecosystem." },
  { id: "bug", label: "Bug report", icon: Bug, desc: "Reproducible bugs, regressions, hallucinations." },
];

const offices = [
  { city: "San Francisco", addr: "548 Market St, Suite 91834", role: "HQ" },
  { city: "Berlin", addr: "Friedrichstraße 76, 10117", role: "EMEA" },
  { city: "Lagos", addr: "1B Bishop Aboyade Cole, Victoria Island", role: "Engineering hub" },
];

export default function ContactPage() {
  const [selectedTopic, setSelectedTopic] = useState("sales");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 4000);
  }

  return (
    <PageContainer>
      <div className="max-w-[1080px] mx-auto px-6 sm:px-10">
        <PageHero
          eyebrow="Contact"
          title="Talk to a"
          italic="human"
          description="Real engineers answer the inbox. We respond to every message, usually within 24 hours, and we publish a redacted version of interesting ones on the blog."
          icon={Mail}
        />

        {/* Topic selector + form */}
        <section className="mb-20 sm:mb-24 grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5">
            <h2 className="text-[20px] sm:text-[24px] font-semibold tracking-[-0.025em] text-white mb-2">
              Pick a topic
            </h2>
            <p className="text-[13px] text-white/45 leading-relaxed mb-6">
              Routes your message to the right team. We don&apos;t use it for
              spam, ever.
            </p>
            <div className="space-y-2">
              {topics.map((t) => {
                const active = selectedTopic === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTopic(t.id)}
                    className={cn(
                      "w-full text-left p-4 rounded-2xl border transition-all duration-200 flex items-start gap-3",
                      active
                        ? "border-indigo-500/30 bg-indigo-500/[0.06] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]"
                        : "border-white/[0.06] bg-white/[0.015] hover:border-white/[0.1] hover:bg-white/[0.03]",
                    )}
                  >
                    <div
                      className={cn(
                        "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 border transition-all",
                        active
                          ? "border-indigo-500/30 bg-indigo-500/[0.08]"
                          : "border-white/[0.06] bg-white/[0.02]",
                      )}
                    >
                      <t.icon
                        className={cn(
                          "w-4 h-4",
                          active ? "text-indigo-200" : "text-white/45",
                        )}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "text-[14px] font-semibold transition-colors",
                          active ? "text-white" : "text-white/75",
                        )}
                      >
                        {t.label}
                      </p>
                      <p className="text-[12px] text-white/40 mt-0.5">{t.desc}</p>
                    </div>
                    {active && (
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-300 shadow-[0_0_8px_rgba(165,180,252,0.7)] mt-1.5 flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form */}
          <div className="lg:col-span-7">
            <motion.form
              onSubmit={handleSubmit}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="relative p-6 sm:p-8 rounded-2xl border border-white/[0.07] bg-gradient-to-br from-white/[0.025] to-transparent overflow-hidden"
            >
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
              <div className="absolute -top-32 -right-32 w-72 h-72 rounded-full bg-indigo-500/[0.06] blur-3xl pointer-events-none" />

              {submitted ? (
                <div className="relative py-16 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 220, damping: 16 }}
                    className="w-16 h-16 mx-auto mb-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.08] flex items-center justify-center"
                  >
                    <Check className="w-7 h-7 text-emerald-200" />
                  </motion.div>
                  <h3 className="text-[22px] font-semibold text-white mb-2">
                    Message received
                  </h3>
                  <p className="text-[14px] text-white/55 max-w-sm mx-auto leading-[1.7]">
                    Thanks for reaching out. We&apos;ll get back to you within
                    24 hours, usually faster.
                  </p>
                </div>
              ) : (
                <div className="relative space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Full name" name="name" placeholder="Mira Vance" />
                    <Field label="Work email" name="email" type="email" placeholder="mira@company.com" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Company" name="company" placeholder="Acme Inc." />
                    <Field label="Role" name="role" placeholder="Head of Engineering" />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono uppercase tracking-[0.18em] text-white/35 block mb-2">
                      Estimated monthly volume
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {["< 1M tokens", "1-10M", "10-100M", "100M+"].map((v, i) => (
                        <label
                          key={v}
                          className="cursor-pointer flex items-center justify-center gap-1.5 p-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02] text-[12px] text-white/65 hover:border-indigo-500/25 hover:bg-indigo-500/[0.04] transition-all has-[:checked]:border-indigo-500/40 has-[:checked]:bg-indigo-500/[0.08] has-[:checked]:text-white"
                        >
                          <input
                            type="radio"
                            name="volume"
                            value={v}
                            defaultChecked={i === 1}
                            className="sr-only"
                          />
                          {v}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-mono uppercase tracking-[0.18em] text-white/35 block mb-2">
                      Message
                    </label>
                    <textarea
                      name="message"
                      rows={5}
                      required
                      placeholder="Tell us what you're building and what you need help with..."
                      className="w-full bg-white/[0.025] border border-white/[0.08] rounded-xl px-4 py-3 text-[13px] text-white/85 placeholder:text-white/25 outline-none focus:border-indigo-500/30 focus:bg-indigo-500/[0.04] transition-all duration-200 resize-none"
                    />
                  </div>

                  <div className="flex items-start gap-2.5 pt-1">
                    <input
                      type="checkbox"
                      id="agree"
                      className="mt-0.5 w-3.5 h-3.5 rounded border-white/20 bg-white/[0.04] text-indigo-500 focus:ring-indigo-500/30"
                    />
                    <label
                      htmlFor="agree"
                      className="text-[12px] text-white/45 leading-[1.6] cursor-pointer"
                    >
                      I agree to Yapapa&apos;s{" "}
                      <Link href="/legal#privacy" className="text-indigo-200/80 hover:text-indigo-100">
                        privacy policy
                      </Link>
                      . We never share contact details with third parties.
                    </label>
                  </div>

                  <button
                    type="submit"
                    className="group w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-gradient-to-br from-indigo-500/20 via-indigo-500/12 to-violet-500/10 border border-indigo-500/25 text-[14px] font-medium text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_8px_24px_-8px_rgba(99,102,241,0.4)] hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_12px_32px_-8px_rgba(99,102,241,0.55)] transition-all duration-300"
                  >
                    Send message
                    <Send className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              )}
            </motion.form>
          </div>
        </section>

        {/* Alternate channels */}
        <section className="mb-20 sm:mb-24 grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {[
            {
              icon: Mail,
              title: "Email",
              primary: "hello@yapapa.com",
              secondary: "Replies within 24h",
              href: "mailto:hello@yapapa.com",
            },
            {
              icon: MessageSquare,
              title: "Community Discord",
              primary: "discord.gg/yapapa",
              secondary: "Open source & dev help",
              href: "https://discord.gg/yapapa",
            },
            {
              icon: function GithubIcon() {
                return (
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.009-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 1.753.986A6.028 6.028 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404.912-1.255 1.753-.986 1.753-.986.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                  </svg>
                );
              },
              title: "GitHub Issues",
              primary: "github.com/yapapa",
              secondary: "Bug reports & RFCs",
              href: "https://github.com/shinmentakezo07/owsiwa",
            },
          ].map((c, i) => (
            <motion.a
              key={c.title}
              href={c.href}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              className="group block p-5 rounded-2xl border border-white/[0.07] bg-gradient-to-br from-white/[0.025] to-transparent hover:border-indigo-500/25 hover:from-indigo-500/[0.04] transition-all duration-300"
            >
              <div className="w-10 h-10 rounded-lg border border-white/[0.06] bg-white/[0.02] group-hover:border-indigo-500/25 group-hover:bg-indigo-500/[0.06] flex items-center justify-center mb-4 transition-all">
                <c.icon className="w-4 h-4 text-white/45 group-hover:text-indigo-200 transition-colors" />
              </div>
              <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-white/30 mb-1.5">
                {c.title}
              </p>
              <p className="text-[15px] font-semibold text-white/90 group-hover:text-white tracking-tight">
                {c.primary}
              </p>
              <p className="text-[12px] text-white/40 mt-1">{c.secondary}</p>
            </motion.a>
          ))}
        </section>

        {/* Offices */}
        <section className="mb-16">
          <header className="flex items-center gap-3 mb-7">
            <div className="w-9 h-9 rounded-xl border border-indigo-500/15 bg-indigo-500/[0.06] flex items-center justify-center">
              <Building2 className="w-4 h-4 text-indigo-200" />
            </div>
            <h2 className="text-[20px] sm:text-[24px] font-semibold tracking-[-0.025em] text-white">
              Offices
            </h2>
            <div className="h-px flex-1 bg-gradient-to-r from-indigo-500/15 via-white/[0.05] to-transparent" />
            <span className="text-[9px] font-mono text-white/25 tracking-[0.18em]">
              {offices.length} LOCATIONS · 8+ REMOTE
            </span>
          </header>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {offices.map((o, i) => (
              <motion.div
                key={o.city}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="p-5 rounded-2xl border border-white/[0.07] bg-gradient-to-br from-white/[0.025] to-transparent"
              >
                <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-indigo-200/70 mb-2">
                  {o.role}
                </p>
                <h3 className="text-[16px] font-semibold text-white/90 mb-1.5">
                  {o.city}
                </h3>
                <p className="text-[12.5px] text-white/50 leading-[1.65] font-mono">
                  {o.addr}
                </p>
              </motion.div>
            ))}
          </div>
        </section>
      </div>
      <SiteFooter />
    </PageContainer>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-[10px] font-mono uppercase tracking-[0.18em] text-white/35 block mb-2">
        {label}
      </label>
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        className="w-full bg-white/[0.025] border border-white/[0.08] rounded-xl px-4 py-3 text-[13px] text-white/85 placeholder:text-white/25 outline-none focus:border-indigo-500/30 focus:bg-indigo-500/[0.04] transition-all duration-200"
      />
    </div>
  );
}
