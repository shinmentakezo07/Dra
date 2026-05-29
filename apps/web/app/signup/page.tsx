"use client";

import { useActionState, useState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { signup, authenticateSocial, type State } from "@/app/lib/actions";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useMotionTemplate,
} from "framer-motion";
import Link from "next/link";
import {
  Mail,
  Lock,
  User,
  Loader2,
  Eye,
  EyeOff,
  Check,
  ArrowRight,
  Terminal as TerminalIcon,
  Sparkles,
} from "lucide-react";

/* ─── Glitch Text ─── */
function GlitchText({ text, className }: { text: string; className?: string }) {
  return (
    <div className={`glitch-wrapper inline-block ${className ?? ""}`}>
      <span className="glitch relative inline-block text-white" data-text={text}>
        {text}
      </span>
    </div>
  );
}

/* ─── Typewriter ─── */
function TypewriterText({ text, delay = 0, className }: { text: string; delay?: number; className?: string }) {
  return (
    <motion.span
      initial="hidden"
      animate="visible"
      variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.03, delayChildren: delay } } }}
      className={`inline-block ${className ?? ""}`}
    >
      {Array.from(text).map((letter, i) => (
        <motion.span
          key={i}
          variants={{
            visible: { opacity: 1, y: 0, transition: { type: "spring" as const, damping: 12, stiffness: 200 } },
            hidden: { opacity: 0, y: 20, transition: { type: "spring" as const, damping: 12, stiffness: 200 } },
          }}
          className="inline-block whitespace-pre"
        >
          {letter}
        </motion.span>
      ))}
    </motion.span>
  );
}

/* ─── HUD Overlay ─── */
function HUDOverlay() {
  return (
    <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
      <div className="absolute top-10 left-10 w-16 h-16 border-l-2 border-t-2 border-white/10 rounded-tl-2xl" />
      <div className="absolute top-10 right-10 w-16 h-16 border-r-2 border-t-2 border-white/10 rounded-tr-2xl" />
      <div className="absolute bottom-10 left-10 w-16 h-16 border-l-2 border-b-2 border-white/10 rounded-bl-2xl" />
      <div className="absolute bottom-10 right-10 w-16 h-16 border-r-2 border-b-2 border-white/10 rounded-br-2xl" />
      <div className="absolute top-1/3 left-8 w-[1px] h-24 bg-gradient-to-b from-transparent via-white/20 to-transparent hidden lg:block" />
      <div className="absolute bottom-1/3 right-8 w-[1px] h-24 bg-gradient-to-b from-transparent via-white/20 to-transparent hidden lg:block" />
      <div className="absolute top-12 right-28 text-[10px] font-mono text-white/20 hidden lg:block tracking-widest">REG.V.3.0 // SECURE</div>
      <div className="absolute bottom-12 left-28 text-[10px] font-mono text-white/20 hidden lg:block tracking-widest">SESSION: ACTIVE</div>
    </div>
  );
}

/* ─── Dynamic Spotlight ─── */
function DynamicSpotlight() {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  useEffect(() => {
    const h = ({ clientX, clientY }: { clientX: number; clientY: number }) => { mouseX.set(clientX); mouseY.set(clientY); };
    window.addEventListener("mousemove", h);
    return () => window.removeEventListener("mousemove", h);
  }, [mouseX, mouseY]);
  return (
    <motion.div
      className="absolute inset-0 opacity-40 pointer-events-none"
      style={{ background: useMotionTemplate`radial-gradient(800px circle at ${mouseX}px ${mouseY}px, rgba(59, 130, 246, 0.08), transparent 80%)` }}
    />
  );
}

/* ─── Moving Grid ─── */
function MovingGrid() {
  return (
    <div className="absolute inset-0 perspective-1000 pointer-events-none">
      <motion.div
        animate={{ backgroundPosition: ["0px 0px", "0px 40px"] }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 opacity-[0.15] transform-gpu rotate-x-12 scale-150 origin-top"
        style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)", backgroundSize: "40px 40px" }}
      />
    </div>
  );
}

/* ─── Cyber Button ─── */
function CyberButton({ children, className, primary = false, type = "button", disabled = false }: {
  children: React.ReactNode; className?: string; primary?: boolean; type?: "button" | "submit"; disabled?: boolean;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={`relative group px-8 py-4 font-mono text-sm font-bold tracking-wider overflow-hidden clip-path-slant transition-all duration-300 ${primary ? "text-black" : "text-white"} ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className ?? ""}`}
    >
      <div className={`absolute inset-0 transition-all duration-300 ${primary ? "bg-white group-hover:bg-cyan-400" : "bg-white/5 border border-white/10 group-hover:border-white/30 group-hover:bg-white/10"}`} />
      <div className="absolute inset-0 opacity-0 group-hover:opacity-20 bg-gradient-to-r from-transparent via-white to-transparent -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
      <div className="relative z-10 flex items-center justify-center gap-2">{children}</div>
      <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-current opacity-50" />
      <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-current opacity-50" />
    </button>
  );
}

/* ─── Terminal Input (terminal-styled form field) ─── */
function TerminalInput({
  id, name, type = "text", placeholder, required, autoComplete, value, onChange, icon: Icon, error, minLength, inputRef,
}: {
  id: string; name: string; type?: string; placeholder: string; required?: boolean; autoComplete?: string;
  value?: string; onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  icon: React.ElementType; error?: string[]; minLength?: number;
  inputRef?: React.Ref<HTMLInputElement>;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="space-y-1">
      <div className={`relative flex items-center gap-0 rounded-lg border transition-all duration-200 ${
        focused ? "border-blue-500/40 bg-white/[0.04] shadow-[0_0_0_3px_rgba(59,130,246,0.06)]" : "border-white/[0.06] bg-white/[0.02]"
      } ${error ? "border-red-500/40" : ""}`}>
        {/* Terminal prompt prefix */}
        <div className="flex items-center gap-2 pl-3.5 pr-0 shrink-0">
          <Icon className={`w-3.5 h-3.5 transition-colors duration-200 ${focused ? "text-blue-400" : "text-gray-600"}`} />
          <span className={`text-[10px] font-mono font-bold transition-colors duration-200 ${focused ? "text-blue-400" : "text-gray-600"}`}>
            {id === "name" ? "name" : id === "email" ? "mail" : "pass"}
          </span>
          <span className={`text-[10px] font-mono transition-colors duration-200 ${focused ? "text-blue-400" : "text-gray-700"}`}>{">"}</span>
        </div>
        <input
          ref={inputRef}
          id={id}
          name={name}
          type={type}
          placeholder={placeholder}
          required={required}
          autoComplete={autoComplete}
          value={value}
          onChange={onChange}
          minLength={minLength}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="flex-1 h-11 pr-4 py-0 bg-transparent text-white text-sm placeholder:text-gray-700 focus:outline-none font-mono"
        />
      </div>
      <AnimatePresence>
        {error && (
          <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-[11px] text-red-400 font-mono pl-1">
            {error[0]}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Password Strength ─── */
function PasswordStrength({ password }: { password: string }) {
  const reqs = [
    { label: "6+ chars", met: password.length >= 6 },
    { label: "number", met: /\d/.test(password) },
    { label: "uppercase", met: /[A-Z]/.test(password) },
  ];
  const met = reqs.filter((r) => r.met).length;
  if (!password) return null;
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="mt-1.5 space-y-1">
        <div className="flex gap-1">{[0, 1, 2].map((i) => (
          <div key={i} className={`h-[2px] flex-1 rounded-full transition-colors duration-300 ${i < met ? (met === 3 ? "bg-emerald-500" : "bg-blue-500") : "bg-white/[0.06]"}`} />
        ))}</div>
        <div className="flex items-center gap-3">
          {reqs.map((r, i) => (
            <span key={i} className={`flex items-center gap-1 text-[10px] font-mono ${r.met ? "text-emerald-400" : "text-gray-600"}`}>
              {r.met ? <Check className="w-2.5 h-2.5" /> : <span className="w-2.5 h-2.5 rounded-full border border-white/10 inline-block" />}
              {r.label}
            </span>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ─── Registration Terminal ─── */
function RegistrationTerminal() {
  const [code, setCode] = useState("");
  const [typing, setTyping] = useState(true);
  const src = `curl -X POST https://api.yapapa.ai/v1/auth/register \\\n  -H "Content-Type: application/json" \\\n  -d '{ "name": "You", "email": "you@co.ai" }'\n\n# 201 Created\n# API Key: sk_live_••••••••••••\n# Status: Ready to build`;
  useEffect(() => {
    let i = 0;
    const t = setInterval(() => { setCode(src.substring(0, i)); i++; if (i > src.length) { clearInterval(t); setTyping(false); } }, 18);
    return () => clearInterval(t);
  }, []);
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.8, duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className="relative mt-10">
      <div className="absolute -inset-6 bg-gradient-to-r from-blue-600/15 via-violet-600/15 to-emerald-600/15 rounded-2xl blur-2xl" />
      <div className="relative bg-[#060606] border border-white/[0.06] rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.04] bg-white/[0.01]">
          <div className="flex gap-1.5"><div className="w-2 h-2 rounded-full bg-[#FF5F56]/60" /><div className="w-2 h-2 rounded-full bg-[#FFBD2E]/60" /><div className="w-2 h-2 rounded-full bg-[#27C93F]/60" /></div>
          <span className="text-[9px] font-mono text-white/20">register.sh</span>
        </div>
        <div className="p-3 font-mono text-[11px] leading-relaxed bg-[#040404] min-h-[140px] relative">
          <div className="absolute left-0 top-3 bottom-3 w-8 flex flex-col items-end pr-2 text-white/[0.06] select-none text-[9px] border-r border-white/[0.03]">
            {Array.from({ length: 10 }).map((_, i) => <div key={i}>{i + 1}</div>)}
          </div>
          <div className="pl-6">
            <pre className="text-green-300/80"><code>{code}</code>{typing && <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 0.8 }} className="inline-block w-1.5 h-3 bg-blue-500 align-middle ml-0.5" />}</pre>
          </div>
        </div>
        <div className="px-3 py-1 border-t border-white/[0.04] bg-white/[0.01] flex items-center justify-between text-[9px] font-mono text-white/20">
          <span>bash</span>
          <div className="flex items-center gap-1.5"><div className={`w-1.5 h-1.5 rounded-full ${typing ? "bg-yellow-500 animate-pulse" : "bg-emerald-500"}`} /><span>{typing ? "TYPING" : "READY"}</span></div>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Submit Button ─── */
function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <CyberButton type="submit" primary disabled={pending} className="w-full">
      {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>Claim your key</span><ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" /></>}
    </CyberButton>
  );
}

/* ─── Social Button ─── */
function SocialButton({ icon, label, provider }: { icon: React.ReactNode; label: string; provider: string }) {
  return (
    <form action={async () => { await authenticateSocial(provider); }} className="flex-1">
      <button type="submit" className="w-full h-11 flex items-center justify-center gap-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/20 transition-all duration-200 text-sm font-medium text-gray-300">
        {icon}{label}
      </button>
    </form>
  );
}

/* ─── Animated Counter ─── */
function AnimatedStat({ value, label, delay }: { value: string; label: string; delay: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.4 }} className="text-center">
      <div className="text-2xl lg:text-3xl font-bold text-white tracking-tight font-mono">{value}</div>
      <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mt-0.5">{label}</div>
    </motion.div>
  );
}

/* ═══ MAIN ═══ */
export default function SignupPage() {
  const initialState: State = { message: null, errors: {} };
  const [state, dispatch] = useActionState(signup, initialState);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);
  useEffect(() => { nameRef.current?.focus(); }, []);

  return (
    <div className="min-h-screen bg-[#050505] selection:bg-primary/30 selection:text-white relative overflow-hidden">
      <DynamicSpotlight />
      <MovingGrid />
      <HUDOverlay />

      {/* ─── Full-screen asymmetric layout ─── */}
      <div className="relative z-10 min-h-screen flex flex-col lg:flex-row">

        {/* LEFT: Editorial brand column (45%) */}
        <div className="lg:w-[45%] flex flex-col justify-between p-8 lg:p-12 lg:py-16 relative">
          {/* Logo */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Link href="/" className="inline-flex items-center gap-2.5 text-white hover:opacity-80 transition-opacity w-fit">
              <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.6)] animate-pulse" />
              <span className="text-lg font-bold tracking-tighter">Yapapa</span>
            </Link>
          </motion.div>

          {/* Headline block — editorial, not centered */}
          <div className="flex-1 flex flex-col justify-center py-12 lg:py-0 max-w-md">
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }} className="inline-flex items-center gap-2 px-2.5 py-1 mb-6 rounded bg-white/5 border border-white/10 w-fit">
              <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[9px] font-mono font-bold"><Sparkles className="w-2.5 h-2.5" />NEW</div>
              <span className="text-[11px] font-mono text-gray-400">Pay-per-use pricing now live</span>
            </motion.div>

            <h2 className="text-5xl lg:text-[4.5rem] font-bold tracking-tighter leading-[0.85] text-white mb-6">
              <TypewriterText text="Universal" delay={0.3} /><br />
              <GlitchText text="LLM GATEWAY" className="text-5xl lg:text-[4.5rem] font-black" />
            </h2>

            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }} className="text-base text-gray-400 leading-relaxed mb-8 max-w-sm">
              Access 100+ AI models through one unified API. <span className="text-white font-medium">Pay per token</span>, <span className="text-white font-medium">transparent pricing</span>, zero subscriptions.
            </motion.p>

            {/* Stats row — not cards, just numbers */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }} className="flex gap-8 mb-8">
              <AnimatedStat value="100+" label="Models" delay={1.5} />
              <AnimatedStat value="50K+" label="Developers" delay={1.6} />
              <AnimatedStat value="99.9%" label="Uptime" delay={1.7} />
            </motion.div>

            {/* Inline timeline — not identical cards */}
            <div className="space-y-0 relative">
              {/* Vertical connector line */}
              <div className="absolute left-[11px] top-3 bottom-3 w-[1px] bg-gradient-to-b from-emerald-500/30 via-blue-500/30 to-violet-500/30" />

              {[
                { step: "01", label: "Register", detail: "30 seconds, no credit card", color: "text-emerald-400", dot: "bg-emerald-500" },
                { step: "02", label: "Get API key", detail: "Instant dashboard provisioning", color: "text-blue-400", dot: "bg-blue-500" },
                { step: "03", label: "Ship", detail: "Drop-in OpenAI replacement", color: "text-violet-400", dot: "bg-violet-500" },
              ].map((item, i) => (
                <motion.div
                  key={item.step}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.8 + i * 0.12, ease: [0.16, 1, 0.3, 1] }}
                  className="flex items-center gap-4 py-2.5 relative"
                >
                  <div className={`w-[22px] h-[22px] rounded-full ${item.dot}/20 border border-white/10 flex items-center justify-center shrink-0 z-10 bg-[#050505]`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${item.dot}`} />
                  </div>
                  <div>
                    <span className={`text-[10px] font-mono font-bold tracking-widest ${item.color}`}>{item.step}</span>
                    <div className="text-sm text-white font-medium leading-tight">{item.label}</div>
                    <div className="text-[11px] text-gray-500">{item.detail}</div>
                  </div>
                </motion.div>
              ))}
            </div>

            <RegistrationTerminal />
          </div>

          {/* Bottom trust line */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.2 }} className="text-[10px] font-mono text-gray-700 tracking-wider mt-8 lg:mt-0">
            SOC 2 • 256-BIT ENCRYPTED • ZERO LOGS
          </motion.div>
        </div>

        {/* CENTER: Vertical separator with glow */}
        <div className="hidden lg:block relative w-px">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/[0.06] to-transparent" />
          <div className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 w-1 h-32 bg-gradient-to-b from-blue-500/20 via-violet-500/20 to-transparent rounded-full blur-sm" />
        </div>

        {/* RIGHT: Form column (55%) — no card wrapper */}
        <div className="flex-1 flex items-center justify-center p-8 lg:p-12 relative">
          {/* Mobile-only logo */}
          <div className="lg:hidden absolute top-8 left-8">
            <Link href="/" className="inline-flex items-center gap-2 text-white">
              <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.6)]" />
              <span className="text-lg font-bold tracking-tighter">Yapapa</span>
            </Link>
          </div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5, ease: [0.16, 1, 0.3, 1] }} className="w-full max-w-[440px]">
            {/* Form header — editorial, not card-style */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-transparent border border-blue-500/20 flex items-center justify-center">
                  <span className="text-[10px] font-mono font-bold text-blue-400">01</span>
                </div>
                <span className="text-[10px] font-mono font-bold tracking-widest text-blue-400">STEP 01</span>
              </div>
              <h1 className="text-3xl font-bold text-white tracking-tight">Create Account</h1>
              <p className="text-gray-400 text-sm mt-1">Get your API key in under a minute.</p>
            </div>

            {/* Social buttons */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <SocialButton provider="github" icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg>} label="GitHub" />
              <SocialButton provider="google" icon={<svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>} label="Google" />
            </div>

            {/* Divider */}
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/[0.06]" /></div>
              <div className="relative flex justify-center"><span className="px-3 bg-[#050505] text-[10px] text-gray-600 font-mono tracking-widest">OR USE EMAIL</span></div>
            </div>

            {/* Form — terminal-styled inputs, no card wrapper */}
            <form action={dispatch} className="space-y-3">
              <TerminalInput id="name" name="name" placeholder="Jane Smith" required autoComplete="name" icon={User} error={state.errors?.name} inputRef={nameRef} />
              <TerminalInput id="email" name="email" type="email" placeholder="jane@company.com" required autoComplete="email" icon={Mail} error={state.errors?.email} />
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="password" className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Password</label>
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-[10px] font-mono text-gray-600 hover:text-gray-400 transition-colors flex items-center gap-1" aria-label={showPassword ? "Hide password" : "Show password"}>
                    {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showPassword ? "HIDE" : "SHOW"}</span>
                  </button>
                </div>
                <TerminalInput id="password" name="password" type={showPassword ? "text" : "password"} placeholder="Create a strong password" required autoComplete="new-password" icon={Lock} error={state.errors?.password} minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
                <PasswordStrength password={password} />
              </div>

              <AnimatePresence>
                {state.message && (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={`p-3 rounded-lg text-sm font-mono ${state.message.includes("Success") ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border border-red-500/20 text-red-400"}`}>
                    {state.message}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="pt-2">
                <SubmitButton />
              </div>
            </form>

            {/* Footer — below form, not in a card */}
            <div className="mt-6 flex items-center justify-between">
              <p className="text-[13px] text-gray-500">
                Have an account?{" "}
                <Link href="/login" className="text-blue-400 hover:text-blue-300 transition-colors font-medium">Sign in</Link>
              </p>
              <p className="text-[9px] font-mono text-gray-700 tracking-wider">SECURE • ENCRYPTED</p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
