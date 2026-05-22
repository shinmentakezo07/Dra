"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { authenticateAdmin } from "@/app/lib/actions";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Mail, Lock, Loader2, Eye, EyeOff, AlertCircle,
  ArrowLeft, Shield, ChevronRight, Terminal, KeyRound
} from "lucide-react";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="relative w-full h-11 bg-gradient-to-r from-blue-500 to-violet-600 text-white font-semibold rounded-xl hover:from-blue-400 hover:to-violet-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 text-sm overflow-hidden group"
    >
      <span className="absolute inset-0 w-full h-full bg-[linear-gradient(110deg,transparent_30%,rgba(255,255,255,0.15)_50%,transparent_70%)] bg-[length:200%_100%] group-hover:animate-shimmer" />
      {pending ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <>
          <KeyRound className="w-4 h-4" />
          <span>Access Admin Console</span>
        </>
      )}
    </button>
  );
}

function FloatingParticle({ index }: { index: number }) {
  const duration = 8 + index * 1.5;
  const delay = index * 0.8;
  const x = 10 + (index * 7) % 90;
  const size = 1.5 + (index % 3) * 0.5;

  return (
    <motion.div
      className="absolute rounded-full bg-blue-500/20"
      style={{
        width: size,
        height: size,
        left: `${x}%`,
        boxShadow: `0 0 ${size * 4}px rgba(59,130,246,0.15)`,
      }}
      animate={{
        y: [0, -30, -60, -30, 0],
        opacity: [0.2, 0.5, 0.3, 0.5, 0.2],
      }}
      transition={{
        duration,
        repeat: Infinity,
        delay,
        ease: "easeInOut",
      }}
    />
  );
}

function AnimatedGrid() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-blue-500/5 blur-[100px]" />
      <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-violet-500/5 blur-[100px]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-purple-600/3 blur-[120px]" />

      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      {Array.from({ length: 8 }).map((_, i) => (
        <FloatingParticle key={i} index={i} />
      ))}
    </div>
  );
}

function StatusIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-mono"
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
      </span>
      SYSTEM ONLINE — ENCRYPTED CONNECTION
    </motion.div>
  );
}

function InputField({
  id,
  label,
  type,
  value,
  onChange,
  placeholder,
  autoComplete,
  icon: Icon,
  error,
  autoFocus,
  showToggle,
  onToggleShow,
  isVisible,
}: {
  id: string;
  label: string;
  type: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  autoComplete: string;
  icon: React.ElementType;
  error?: string;
  autoFocus?: boolean;
  showToggle?: boolean;
  onToggleShow?: () => void;
  isVisible?: boolean;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-[11px] font-mono font-medium text-gray-400 uppercase tracking-widest flex items-center gap-2">
        <span className="w-1 h-1 rounded-full bg-blue-500/60" />
        {label}
      </label>
      <div className="relative group">
        <div className={`absolute inset-0 rounded-xl transition-all duration-300 ${
          focused ? "bg-blue-500/10 blur-sm" : "bg-transparent"
        }`} />
        <div className={`relative flex items-center border rounded-xl transition-all duration-300 ${
          focused
            ? "border-blue-500/50 bg-white/10 shadow-[0_0_15px_rgba(59,130,246,0.08)]"
            : "border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.06] hover:border-white/[0.12]"
        } ${error ? "border-red-500/50 bg-red-500/5" : ""}`}>
          <Icon className={`absolute left-3.5 w-4 h-4 transition-colors duration-300 ${
            focused ? "text-blue-400" : error ? "text-red-400" : "text-gray-500"
          }`} />
          <input
            id={id}
            name={id}
            type={showToggle && isVisible ? "text" : type}
            value={value}
            onChange={onChange}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={placeholder}
            required
            autoFocus={autoFocus}
            minLength={type === "password" ? 6 : undefined}
            autoComplete={autoComplete}
            className="w-full h-11 pl-10 pr-10 bg-transparent text-white placeholder:text-gray-600 focus:outline-none text-sm"
          />
          {showToggle && (
            <button
              type="button"
              onClick={onToggleShow}
              tabIndex={-1}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors p-0.5"
              aria-label={isVisible ? "Hide password" : "Show password"}
            >
              {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  const [errorMessage, dispatch] = useActionState(authenticateAdmin, undefined);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");

  return (
    <div className="min-h-screen flex bg-[#030303] selection:bg-violet-500/30 selection:text-white">
      {/* Fixed background */}
      <div className="fixed inset-0 -z-10">
        <AnimatedGrid />
      </div>

      {/* Left Panel — Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/[0.04] via-transparent to-violet-600/[0.04]" />

        <div className="relative z-10 flex flex-col justify-between p-14 w-full h-full">
          {/* Top */}
          <div className="flex items-center justify-between">
            <Link href="/" className="group flex items-center gap-3">
              <div className="relative">
                <div className="w-8 h-8 rounded-xl overflow-hidden shadow-lg shadow-blue-500/30">
                  <img
                    src="/admin-logo.jpg"
                    alt="Yapapa"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute -inset-1 rounded-xl bg-blue-500/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">
                Yapapa
              </span>
            </Link>
            <Link
              href="/"
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] hover:border-white/[0.12] transition-all duration-200 text-white/70 hover:text-white text-sm font-medium group"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
              <span>Back to site</span>
            </Link>
          </div>

          {/* Center */}
          <div className="max-w-md">
            <StatusIndicator />
            <div className="mt-8 space-y-2">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-6 w-[2px] bg-gradient-to-b from-blue-500 to-transparent rounded-full" />
                <span className="text-[11px] font-mono text-blue-500/70 uppercase tracking-[0.2em]">
                  Administration
                </span>
              </div>
              <h2 className="text-3xl font-bold text-white leading-tight tracking-tight">
                Secure command<br />
                <span className="bg-gradient-to-r from-blue-300 via-violet-400 to-purple-400 bg-clip-text text-transparent">center</span>
              </h2>
              <p className="text-gray-500 text-sm leading-relaxed max-w-sm mt-3">
                Monitor traffic, manage API keys, oversee provider routing, and control your AI gateway infrastructure.
              </p>
            </div>

            {/* Feature list */}
            <div className="mt-10 space-y-3">
              {[
                { icon: Activity, label: "Real-time traffic monitoring", sub: "Live request & usage analytics" },
                { icon: KeyRound, label: "API key management", sub: "Create, rotate, and revoke credentials" },
                { icon: Shield, label: "Role-based access control", sub: "Granular permissions per admin" },
              ].map((item, i) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="flex items-start gap-3 group cursor-default"
                >
                  <div className="mt-0.5 w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center group-hover:bg-blue-500/10 group-hover:border-blue-500/20 transition-all duration-200">
                    <item.icon className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-400 transition-colors duration-200" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">{item.label}</p>
                    <p className="text-gray-600 text-xs">{item.sub}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Bottom */}
          <div className="flex justify-between items-end text-[11px] font-mono text-gray-700">
            <span>&copy; 2026 YAPAPA</span>
            <div className="flex items-center gap-4">
              <span className="hover:text-gray-500 transition-colors cursor-default">ENCRYPTED</span>
              <span className="w-1 h-1 rounded-full bg-gray-800" />
              <span className="hover:text-gray-500 transition-colors cursor-default">AUDITED</span>
              <span className="w-1 h-1 rounded-full bg-gray-800" />
              <span className="hover:text-gray-500 transition-colors cursor-default">MONITORED</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative">
        <div className="absolute inset-0 lg:hidden bg-gradient-to-br from-blue-600/[0.06] via-transparent to-transparent" />

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[420px] relative z-10"
        >
          {/* Mobile header */}
          <div className="lg:hidden mb-8">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg overflow-hidden shadow-lg shadow-blue-500/20">
                  <img
                    src="/admin-logo.jpg"
                    alt="Yapapa"
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="text-lg font-bold text-white">Yapapa</span>
              </Link>
              <Link
                href="/"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] transition-all text-white/60 hover:text-white text-xs font-medium"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Home</span>
              </Link>
            </div>
          </div>

          {/* Card */}
          <div className="relative">
            {/* Card glow */}
            <div className="absolute -inset-[2px] rounded-2xl bg-gradient-to-b from-blue-500/20 via-transparent to-violet-500/10 opacity-60 blur-sm" />

            <div className="relative rounded-2xl bg-[#0e0e0e] border border-white/[0.06] backdrop-blur-xl overflow-hidden">
              <div className="absolute top-0 left-8 right-8 h-[1px] bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />

              <div className="p-8">
                {/* Header */}
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-9 h-9 rounded-xl overflow-hidden shadow-lg shadow-blue-500/20 flex-shrink-0">
                    <img
                      src="/admin-logo.jpg"
                      alt="Yapapa"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold text-white tracking-tight">Admin Console</h1>
                    <p className="text-[11px] text-gray-500 font-mono">RESTRICTED ACCESS</p>
                  </div>
                </div>

                <div className="mt-2 h-px bg-gradient-to-r from-white/[0.06] to-transparent" />

                <form action={dispatch} className="space-y-4 mt-6">
                  <InputField
                    id="email"
                    label="Email Address"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@company.com"
                    autoComplete="email"
                    icon={Mail}
                    autoFocus
                    error={errorMessage ? " " : undefined}
                  />

                  <InputField
                    id="password"
                    label="Password"
                    type="password"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    icon={Lock}
                    showToggle
                    isVisible={showPassword}
                    onToggleShow={() => setShowPassword(!showPassword)}
                    error={errorMessage ? " " : undefined}
                  />

                  {/* Error */}
                  <AnimatePresence>
                    {errorMessage && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                        animate={{ opacity: 1, height: "auto", marginTop: 16 }}
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        className="flex items-start gap-2.5 p-3 rounded-lg bg-red-500/10 border border-red-500/20"
                      >
                        <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-red-400 text-sm font-medium">Authentication Failed</p>
                          <p className="text-red-400/60 text-xs mt-0.5">{errorMessage}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="pt-1">
                    <SubmitButton />
                  </div>
                </form>
              </div>

              <div className="h-[2px] bg-gradient-to-r from-blue-500/40 via-violet-500/40 to-purple-500/40" />
            </div>
          </div>

          {/* Footer links */}
          <div className="mt-6 space-y-3">
            <p className="text-center text-sm text-gray-600">
              Not an administrator?{" "}
              <Link href="/login" className="text-blue-500 hover:text-blue-400 transition-colors font-medium inline-flex items-center gap-1 group">
                User portal
                <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </p>
            <div className="pt-4 border-t border-white/[0.04] text-center">
              <p className="text-[10px] text-gray-800 font-mono tracking-wider">
                <Terminal className="w-3 h-3 inline mr-1 -mt-0.5" />
                RESTRICTED ACCESS • AUDIT LOGGED • UNAUTHORIZED ENTRY PROHIBITED
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function Activity(props: Record<string, unknown>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}
