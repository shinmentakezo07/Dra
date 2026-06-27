"use client";

import { useActionState, useState, useEffect, useCallback } from "react";
import { useFormStatus } from "react-dom";
import { authenticateAdmin } from "@/app/lib/actions";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import Link from "next/link";
import {
  Mail,
  Lock,
  Loader2,
  Eye,
  EyeOff,
  AlertCircle,
  Shield,
  ChevronRight,
  Terminal,
  KeyRound,
  Activity,
  Fingerprint,
} from "lucide-react";

/* ────────────────────────────── ATMOSPHERIC BACKGROUND ────────────────────────────── */

function GrainOverlay() {
  return (
    <div
      className="fixed inset-0 pointer-events-none opacity-[0.015] mix-blend-overlay"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        backgroundRepeat: "repeat",
        backgroundSize: "128px 128px",
      }}
    />
  );
}

function FloatingParticle({ index }: { index: number }) {
  const duration = 10 + index * 2;
  const delay = index * 0.6;
  const x = 5 + ((index * 13) % 90);
  const size = 1.5 + (index % 4) * 0.4;

  return (
    <motion.div
      className="absolute rounded-full"
      style={{
        width: size,
        height: size,
        left: `${x}%`,
        bottom: "-10%",
        background:
          index % 3 === 0
            ? "rgba(59,130,246,0.3)"
            : index % 3 === 1
              ? "rgba(139,92,246,0.25)"
              : "rgba(168,85,247,0.2)",
        boxShadow: `0 0 ${size * 6}px ${
          index % 3 === 0
            ? "rgba(59,130,246,0.12)"
            : index % 3 === 1
              ? "rgba(139,92,246,0.1)"
              : "rgba(168,85,247,0.1)"
        }`,
      }}
      animate={{
        y: [0, -120, -240, -360, -480],
        x: [0, (index % 2 === 0 ? 1 : -1) * 15, 0],
        opacity: [0, 0.6, 0.4, 0.2, 0],
      }}
      transition={{
        duration,
        repeat: Infinity,
        delay,
        ease: "linear",
      }}
    />
  );
}

function AtmosphericBackground() {
  return (
    <div
      className="fixed inset-0 overflow-hidden pointer-events-none"
      style={{ zIndex: 0 }}
    >
      {/* Deep gradient orbs */}
      <div
        className="absolute -top-[30%] -right-[15%] w-[800px] h-[800px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(59,130,246,0.06) 0%, rgba(59,130,246,0.02) 40%, transparent 70%)",
        }}
      />
      <div
        className="absolute -bottom-[25%] -left-[15%] w-[700px] h-[700px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(124,58,237,0.05) 0%, rgba(124,58,237,0.015) 40%, transparent 70%)",
        }}
      />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] rounded-full"
        style={{
          background:
            "radial-gradient(ellipse, rgba(168,85,247,0.025) 0%, transparent 60%)",
        }}
      />

      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)`,
          backgroundSize: "80px 80px",
          maskImage:
            "radial-gradient(ellipse 70% 60% at 50% 50%, black 30%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 70% 60% at 50% 50%, black 30%, transparent 100%)",
        }}
      />

      {/* Floating particles */}
      {Array.from({ length: 12 }).map((_, i) => (
        <FloatingParticle key={i} index={i} />
      ))}
    </div>
  );
}

/* ────────────────────────────── STATUS & DECORATION ────────────────────────────── */

function StatusIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.5 }}
      className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-emerald-500/[0.15] backdrop-blur-sm"
      style={{
        background:
          "linear-gradient(135deg, rgba(16,185,129,0.06), rgba(16,185,129,0.02))",
      }}
    >
      <span className="relative flex h-[7px] w-[7px]">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
        <span className="relative inline-flex rounded-full h-[7px] w-[7px] bg-emerald-400" />
      </span>
      <span className="text-[11px] font-mono font-medium text-emerald-400/80 tracking-wide">
        SYSTEM ONLINE &mdash; ENCRYPTED
      </span>
    </motion.div>
  );
}

function HorizontalDivider({ className = "" }: { className?: string }) {
  return (
    <div
      className={`h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent ${className}`}
    />
  );
}

/* ────────────────────────────── INPUT FIELD ────────────────────────────── */

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
  const [capsLock, setCapsLock] = useState(false);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (type === "password") {
        setCapsLock(e.getModifierState("CapsLock"));
      }
    },
    [type],
  );

  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className="flex items-center gap-2 text-[11px] font-mono font-medium uppercase tracking-[0.12em] text-gray-400"
      >
        <span
          className={`w-[3px] h-[3px] rounded-full transition-colors duration-300 ${
            focused ? "bg-blue-400" : error ? "bg-red-400/60" : "bg-white/20"
          }`}
        />
        {label}
      </label>

      <div className="relative">
        {/* Ambient focus glow */}
        <AnimatePresence>
          {focused && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="absolute -inset-[1px] rounded-xl bg-blue-500/[0.06] blur-[6px]"
            />
          )}
        </AnimatePresence>

        <div
          className={`relative flex items-center rounded-xl border transition-all duration-250 ${
            focused
              ? "border-blue-500/40 bg-white/[0.06] shadow-[0_0_20px_-4px_rgba(59,130,246,0.12)]"
              : error
                ? "border-red-500/40 bg-red-500/[0.03]"
                : "border-white/[0.07] bg-white/[0.03] hover:bg-white/[0.05] hover:border-white/[0.1]"
          }`}
        >
          {/* Left icon */}
          <div className="flex items-center justify-center w-10 pl-3.5">
            <Icon
              className={`w-[15px] h-[15px] transition-colors duration-250 ${
                focused
                  ? "text-blue-400"
                  : error
                    ? "text-red-400/70"
                    : "text-gray-500/70"
              }`}
            />
          </div>

          <input
            id={id}
            name={id}
            type={showToggle && isVisible ? "text" : type}
            value={value}
            onChange={onChange}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            required
            autoFocus={autoFocus}
            minLength={type === "password" ? 6 : undefined}
            autoComplete={autoComplete}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-error` : undefined}
            className="w-full h-12 pr-10 bg-transparent text-white text-[14px] placeholder:text-gray-600/70 focus:outline-none"
          />

          {/* Right: password toggle */}
          {showToggle && (
            <button
              type="button"
              onClick={onToggleShow}
              tabIndex={-1}
              className="flex items-center justify-center w-10 pr-3 text-gray-500/60 hover:text-gray-300 transition-colors"
              aria-label={isVisible ? "Hide password" : "Show password"}
            >
              {isVisible ? (
                <EyeOff className="w-[15px] h-[15px]" />
              ) : (
                <Eye className="w-[15px] h-[15px]" />
              )}
            </button>
          )}

          {/* Bottom accent line */}
          <div
            className={`absolute bottom-0 left-3 right-3 h-[1px] transition-all duration-300 ${
              focused
                ? "bg-gradient-to-r from-transparent via-blue-500/40 to-transparent"
                : "bg-transparent"
            }`}
          />
        </div>

        {/* Caps lock warning */}
        <AnimatePresence>
          {capsLock && type === "password" && focused && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="mt-1.5 text-[11px] font-mono text-amber-400/70 pl-1"
            >
              Caps Lock is on
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ────────────────────────────── SUBMIT BUTTON ────────────────────────────── */

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="relative w-full h-12 rounded-xl overflow-hidden text-white font-semibold text-[14px] disabled:opacity-50 disabled:cursor-not-allowed group/btn transition-shadow duration-300 hover:shadow-[0_8px_30px_-6px_rgba(59,130,246,0.4)] shadow-[0_4px_20px_-4px_rgba(59,130,246,0.25)]"
      style={{
        background:
          "linear-gradient(135deg, #3b82f6 0%, #7c3aed 50%, #6d28d9 100%)",
      }}
    >
      {/* Shimmer layer */}
      <span className="absolute inset-0 bg-[linear-gradient(110deg,transparent_25%,rgba(255,255,255,0.12)_50%,transparent_75%)] bg-[length:250%_100%] group-hover/btn:animate-shimmer opacity-0 group-hover/btn:opacity-100 transition-opacity" />

      {/* Top highlight */}
      <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      {/* Corner brackets */}
      <span className="absolute top-0 left-0 w-2.5 h-2.5 border-t border-l border-white/30 rounded-tl" />
      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b border-r border-white/30 rounded-br" />

      <span className="relative flex items-center justify-center gap-2.5">
        {pending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            <Fingerprint className="w-4 h-4" />
            <span>Access Admin Console</span>
          </>
        )}
      </span>
    </button>
  );
}

/* ────────────────────────────── LEFT PANEL (BRANDING) ────────────────────────────── */

function BrandingPanel() {
  const features = [
    {
      icon: Activity,
      label: "Real-time traffic monitoring",
      sub: "Live request & usage analytics",
    },
    {
      icon: KeyRound,
      label: "API key management",
      sub: "Create, rotate, and revoke credentials",
    },
    {
      icon: Shield,
      label: "Role-based access control",
      sub: "Granular permissions per admin",
    },
  ];

  return (
    <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden">
      {/* Panel gradient wash */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, rgba(59,130,246,0.03) 0%, transparent 40%, rgba(124,58,237,0.02) 100%)",
        }}
      />

      {/* Right edge fade */}
      <div className="absolute right-0 inset-y-0 w-32 bg-gradient-to-l from-[#030303] to-transparent z-10" />

      <div className="relative z-10 flex flex-col justify-between p-12 lg:p-16 w-full">
        {/* Top: Logo */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          <Link href="/" className="group inline-flex items-center gap-3.5">
            <div className="relative">
              <div className="w-9 h-9 rounded-xl overflow-hidden ring-1 ring-white/[0.08] shadow-lg shadow-blue-500/20">
                <img
                  src="/admin-logo.jpg"
                  alt="Yapapa"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -inset-1.5 rounded-xl bg-blue-500/15 blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-400" />
            </div>
            <span className="text-[22px] font-bold tracking-tight text-white">
              Yapapa
            </span>
          </Link>
        </motion.div>

        {/* Center: Hero */}
        <div className="max-w-lg">
          <StatusIndicator />

          <div className="mt-10">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-7 w-[2px] bg-gradient-to-b from-blue-500 to-blue-500/0 rounded-full" />
              <span className="text-[11px] font-mono text-blue-400/60 uppercase tracking-[0.2em] font-medium">
                Administration
              </span>
            </div>

            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.2,
                duration: 0.6,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="text-[2.5rem] font-bold text-white leading-[1.15] tracking-[-0.02em] text-balance"
            >
              Secure command
              <br />
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage:
                    "linear-gradient(135deg, #93c5fd 0%, #a78bfa 40%, #c084fc 100%)",
                }}
              >
                center
              </span>
            </motion.h2>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35, duration: 0.5 }}
              className="mt-4 text-gray-500 text-[15px] leading-relaxed max-w-md"
            >
              Monitor traffic, manage API keys, oversee provider routing, and
              control your AI gateway infrastructure.
            </motion.p>
          </div>

          {/* Feature cards */}
          <div className="mt-12 space-y-2.5">
            {features.map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  delay: 0.4 + i * 0.08,
                  duration: 0.5,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="group flex items-start gap-4 p-3 -ml-3 rounded-xl cursor-default hover:bg-white/[0.02] transition-colors duration-200"
              >
                <div className="mt-0.5 w-8 h-8 rounded-lg bg-white/[0.03] border border-white/[0.05] flex items-center justify-center group-hover:bg-blue-500/[0.08] group-hover:border-blue-500/[0.15] transition-all duration-200 flex-shrink-0">
                  <item.icon className="w-3.5 h-3.5 text-gray-500 group-hover:text-blue-400 transition-colors duration-200" />
                </div>
                <div>
                  <p className="text-white/90 text-[13px] font-medium leading-tight">
                    {item.label}
                  </p>
                  <p className="text-gray-600 text-[12px] mt-0.5">{item.sub}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Bottom: Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex justify-between items-end text-[10px] font-mono text-gray-700 tracking-wide"
        >
          <span>&copy; 2026 YAPAPA</span>
          <div className="flex items-center gap-3">
            {["ENCRYPTED", "AUDITED", "MONITORED"].map((word, i) => (
              <span key={word} className="flex items-center gap-3">
                {i > 0 && <span className="w-1 h-1 rounded-full bg-gray-800" />}
                <span className="hover:text-gray-500 transition-colors cursor-default">
                  {word}
                </span>
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

/* ────────────────────────────── LOGIN CARD ────────────────────────────── */

function LoginCard() {
  const [errorMessage, dispatch] = useActionState(authenticateAdmin, undefined);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const reduce = useReducedMotion();

  // Cmd/Ctrl+Enter to submit
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        const form = document.querySelector("form");
        if (form) form.requestSubmit();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: reduce ? 0 : 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0.1 : 0.55, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-[420px] relative z-10"
    >
      {/* Mobile logo */}
      <div className="lg:hidden mb-6">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl overflow-hidden ring-1 ring-white/[0.06] shadow-lg shadow-blue-500/15">
            <img
              src="/admin-logo.jpg"
              alt="Yapapa"
              className="w-full h-full object-cover"
            />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">
            Yapapa
          </span>
        </Link>
      </div>

      {/* Card wrapper with glow — concentric radius: 32px → 28px */}
      <div className="relative group/card">
        {/* Outer glow */}
        <div
          className="absolute -inset-[1px] rounded-[32px] opacity-40 blur-[2px] group-hover/card:opacity-60 transition-opacity duration-500"
          style={{
            background:
              "linear-gradient(160deg, rgba(59,130,246,0.25) 0%, rgba(59,130,246,0.06) 30%, transparent 50%, rgba(124,58,237,0.1) 80%, rgba(124,58,237,0.2) 100%)",
          }}
        />

        {/* Glass card outer — 32px radius */}
        <div className="glass-card rounded-[32px] p-1 relative overflow-hidden">
          {/* Hover gradient glow */}
          <div className="absolute inset-0 opacity-0 group-hover/card:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-blue-500/[0.08] via-violet-500/[0.04] to-fuchsia-500/[0.06]" />

          {/* HUD corner brackets */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-6 left-6 w-10 h-10 border-l border-t border-white/[0.08] rounded-tl-lg" />
            <div className="absolute top-6 right-6 w-10 h-10 border-r border-t border-white/[0.08] rounded-tr-lg" />
            <div className="absolute bottom-6 left-6 w-10 h-10 border-l border-b border-white/[0.08] rounded-bl-lg" />
            <div className="absolute bottom-6 right-6 w-10 h-10 border-r border-b border-white/[0.08] rounded-br-lg" />
          </div>

          {/* Inner content — 28px radius */}
          <div
            className="relative rounded-[28px] border border-white/[0.04] overflow-hidden"
            style={{ background: "rgba(10,10,10,0.97)" }}
          >
          {/* Top accent bar */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />

          {/* Card content */}
          <div className="p-6 sm:p-8">
            {/* Header */}
            <div className="flex items-center gap-3.5 mb-1">
              <div className="relative w-11 h-11 rounded-xl overflow-hidden ring-1 ring-white/[0.08] shadow-lg shadow-blue-500/20 flex-shrink-0 group-hover:shadow-blue-500/30 transition-shadow duration-500">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-violet-500/10" />
                <img
                  src="/admin-logo.jpg"
                  alt="Yapapa"
                  className="relative w-full h-full object-cover"
                />
              </div>
              <div>
                <h1 className="text-[18px] font-bold text-white tracking-tight leading-tight">
                  Admin Console
                </h1>
                <motion.div
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25, duration: 0.4 }}
                  className="inline-flex items-center gap-1.5 mt-0.5 px-2.5 py-0.5 rounded-full border border-red-500/20 bg-red-500/[0.06]"
                >
                  <div className="w-1 h-1 rounded-full bg-red-400 animate-pulse" />
                  <span className="text-[9px] font-mono font-bold text-red-400/80 tracking-[0.12em] uppercase">
                    Restricted Access
                  </span>
                </motion.div>
              </div>
            </div>

            <HorizontalDivider className="my-4" />

            {/* Form */}
            <form action={dispatch} className="space-y-4">
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
                placeholder="Enter your password"
                autoComplete="current-password"
                icon={Lock}
                showToggle
                isVisible={showPassword}
                onToggleShow={() => setShowPassword(!showPassword)}
                error={errorMessage ? " " : undefined}
              />

              {/* Error message */}
              <AnimatePresence>
                {errorMessage && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: "auto", marginTop: 16 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-start gap-3 p-3.5 rounded-xl border border-red-500/[0.15]"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(239,68,68,0.06), rgba(239,68,68,0.02))",
                    }}
                    role="alert"
                  >
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-red-400 text-[13px] font-medium">
                        Authentication Failed
                      </p>
                      <p className="text-red-400/50 text-[12px] mt-0.5">
                        {errorMessage}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="pt-2">
                <SubmitButton />
              </div>

              {/* Security indicator */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.4 }}
                className="flex items-center justify-center gap-3 mt-3"
              >
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-emerald-500/10 bg-emerald-500/[0.03]">
                  <div className="w-1 h-1 rounded-full bg-emerald-400" />
                  <span className="text-[10px] font-mono text-emerald-400/60 tracking-[0.06em]">
                    TLS 1.3
                  </span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-blue-500/10 bg-blue-500/[0.03]">
                  <div className="w-1 h-1 rounded-full bg-blue-400" />
                  <span className="text-[10px] font-mono text-blue-400/60 tracking-[0.06em]">
                    AES-256
                  </span>
                </div>
              </motion.div>

              {/* Keyboard shortcut hint */}
              <p className="text-center text-[11px] text-gray-600 font-mono mt-3">
                <kbd className="px-1.5 py-0.5 rounded border border-white/[0.06] bg-white/[0.03] text-gray-500 text-[10px]">
                  &#8984;
                </kbd>
                {" + "}
                <kbd className="px-1.5 py-0.5 rounded border border-white/[0.06] bg-white/[0.03] text-gray-500 text-[10px]">
                  Enter
                </kbd>
                {" to submit"}
              </p>
            </form>
          </div>

          {/* Bottom accent */}
          <div
            className="h-[2px]"
            style={{
              background:
                "linear-gradient(90deg, rgba(59,130,246,0.3), rgba(124,58,237,0.3), rgba(168,85,247,0.2))",
            }}
          />
        </div>
      </div>
    </div>

      {/* Footer */}
      <div className="mt-5 space-y-3">
        <p className="text-center text-[14px] text-gray-500">
          Not an administrator?{" "}
          <Link
            href="/login"
            className="text-blue-400 hover:text-blue-300 font-medium inline-flex items-center gap-1 group transition-colors"
          >
            User portal
            <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </p>

        <div className="pt-4 border-t border-white/[0.03]">
          <p className="text-center text-[10px] text-gray-700 font-mono tracking-[0.08em] flex items-center justify-center gap-1.5">
            <Terminal className="w-3 h-3 opacity-50" />
            RESTRICTED &bull; AUDIT LOGGED &bull; UNAUTHORIZED ENTRY PROHIBITED
          </p>
        </div>
      </div>
    </motion.div>
  );
}

/* ────────────────────────────── PAGE ────────────────────────────── */

export default function AdminLoginPage() {
  return (
    <div
      className="h-screen overflow-hidden flex bg-[#030303] selection:bg-violet-500/30 selection:text-white"
      style={{ position: "fixed", inset: 0, zIndex: 50 }}
    >
      <GrainOverlay />
      <AtmosphericBackground />

      <BrandingPanel />

      {/* Right: Login form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-12 relative overflow-y-auto">
        {/* Mobile gradient */}
        <div
          className="absolute inset-0 lg:hidden pointer-events-none"
          style={{
            background:
              "linear-gradient(135deg, rgba(59,130,246,0.04) 0%, transparent 60%)",
          }}
        />

        <LoginCard />
      </div>
    </div>
  );
}
