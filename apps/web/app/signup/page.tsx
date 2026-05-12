"use client";

import { useActionState, useState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { signup, authenticateSocial, type State } from "@/app/lib/actions";
import { motion } from "framer-motion";
import Link from "next/link";
import { Mail, Lock, User, Loader2, Eye, EyeOff, Check, X, ArrowLeft, Home } from "lucide-react";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full h-9 bg-gradient-to-r from-blue-500 to-violet-600 text-white font-bold rounded-lg hover:from-blue-600 hover:to-violet-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] text-sm"
    >
      {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Account"}
    </button>
  );
}

function SocialButton({ icon, label, provider }: { icon: React.ReactNode; label: string; provider: string }) {
  return (
    <form action={async () => { await authenticateSocial(provider) }} className="flex-1">
        <button
        type="submit"
        className="w-full h-9 flex items-center justify-center gap-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-xs font-medium text-gray-300"
        >
        {icon}
        {label}
        </button>
    </form>
  );
}

function PasswordStrength({ password }: { password: string }) {
  const requirements = [
    { label: "At least 6 characters", met: password.length >= 6 },
    { label: "Contains a number", met: /\d/.test(password) },
    { label: "Contains uppercase", met: /[A-Z]/.test(password) },
  ];

  if (!password) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      className="mt-1 space-y-0.5"
    >
      {requirements.map((req, i) => (
        <div key={i} className="flex items-center gap-1.5 text-[10px]">
          {req.met ? (
            <Check className="w-2.5 h-2.5 text-blue-500" />
          ) : (
            <X className="w-2.5 h-2.5 text-gray-500" />
          )}
          <span className={req.met ? "text-blue-400" : "text-gray-500"}>
            {req.label}
          </span>
        </div>
      ))}
    </motion.div>
  );
}

export default function SignupPage() {
  const initialState: State = { message: null, errors: {} };
  const [state, dispatch] = useActionState(signup, initialState);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  return (
    <div className="min-h-screen flex bg-[#050505] selection:bg-emerald-500/30 selection:text-white">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[#000000]">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-transparent to-cyan-600/10" />
         {/* Animated Grid */}
         <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
        
         {/* Decorative Elements */}
        <div className="absolute top-10 left-10 w-20 h-20 border-t-2 border-l-2 border-white/10 rounded-tl-3xl" />
        <div className="absolute bottom-10 right-10 w-20 h-20 border-b-2 border-r-2 border-white/10 rounded-br-3xl" />

        <div className="relative z-10 flex flex-col justify-between p-16 w-full h-full">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold tracking-tighter text-white flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="w-3 h-3 bg-white rounded-full animate-pulse shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
              Yapapa
            </Link>
            <Link
              href="/"
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-white text-sm font-medium group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span>Home</span>
            </Link>
          </div>
          
          <div className="max-w-md">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-gray-300 text-xs font-mono mb-4 backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse shadow-[0_0_8px_rgba(255,255,255,0.6)]" />
                API_GATEWAY_REGISTRATION
             </div>
            <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">
              Access 100+ AI models <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-400">through one API.</span>
            </h2>
            <p className="text-gray-400 text-base mb-5 font-light">
              Join thousands of developers building with transparent, pay-per-token pricing.
            </p>
            
            <div className="space-y-2.5 font-mono text-sm">
              {[
                "Instant API key generation",
                "Access to GPT-4, Claude, Gemini & more",
                "Real-time usage analytics",
                "Pay only for what you use"
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-3 group">
                  <div className="w-4 h-4 rounded bg-white/10 border border-white/20 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                    <Check className="w-2.5 h-2.5 text-white" />
                  </div>
                  <span className="text-gray-400 group-hover:text-gray-200 transition-colors text-xs">{feature}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex items-center gap-4 p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm w-fit">
            <div className="flex -space-x-2">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="w-6 h-6 rounded-full border-2 border-black bg-gradient-to-br from-gray-700 to-gray-900"
                />
              ))}
            </div>
            <p className="text-gray-400 text-[10px] font-mono">
              <span className="text-white font-bold">50,000+</span> DEVELOPERS BUILDING
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative">
        {/* Mobile Background Texture */}
         <div className="absolute inset-0 lg:hidden bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.08),transparent_40%)]" />

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[400px] relative z-10"
        >
          {/* Mobile Logo */}
          <div className="lg:hidden mb-6 flex items-center justify-between">
            <Link href="/" className="text-xl font-bold text-white flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
              Yapapa
            </Link>
            <Link
              href="/"
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-white text-xs font-medium group"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
              <span>Home</span>
            </Link>
          </div>

          <div className="mb-6 p-6 rounded-2xl bg-[#0A0A0A] border border-white/10">
            <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">Create Account</h1>
            <p className="text-gray-400 text-sm">Get your API key and start building.</p>
          

          {/* Social Login */}
          <div className="grid grid-cols-2 gap-3 mb-5 mt-5">
            <SocialButton 
              provider="github"
              icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>} 
              label="GitHub" 
            />
            <SocialButton 
              provider="google"
              icon={<svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>} 
              label="Google" 
            />
          </div>

          <div className="relative mb-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
             <div className="relative flex justify-center text-xs uppercase tracking-widest font-mono">
              <span className="px-4 bg-[#050505] text-gray-600">Or continue with email</span>
            </div>
          </div>

          <form action={dispatch} className="space-y-3.5">
            <div className="space-y-1.5">
              <label htmlFor="name" className="text-xs font-mono font-medium text-gray-400 uppercase">
                Full Name
              </label>
              <div className="relative group">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-blue-500 transition-colors" />
                <input
                  ref={nameRef}
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Your full name"
                  required
                  autoComplete="name"
                  className="w-full h-10 pl-10 pr-4 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500 focus:bg-white/10 transition-all text-sm"
                />
              </div>
              {state.errors?.name && (
                <p className="text-xs text-red-400 font-mono">{state.errors.name}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-mono font-medium text-gray-400 uppercase">
                Email Address
              </label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-blue-500 transition-colors" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="your.email@company.com"
                  required
                  autoComplete="email"
                  className="w-full h-10 pl-10 pr-4 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500 focus:bg-white/10 transition-all text-sm"
                />
              </div>
              {state.errors?.email && (
                <p className="text-xs text-red-400 font-mono">{state.errors.email}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-mono font-medium text-gray-400 uppercase">
                Password
              </label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-blue-500 transition-colors" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="w-full h-10 pl-10 pr-10 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500 focus:bg-white/10 transition-all text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <PasswordStrength password={password} />
              {state.errors?.password && (
                <p className="text-xs text-red-400 font-mono">{state.errors.password}</p>
              )}
            </div>

            {state.message && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className={`p-3 rounded-lg text-sm font-mono ${
                  state.message.includes("Success")
                    ? "bg-white/10 border border-white/20 text-white"
                    : "bg-red-500/10 border border-red-500/20 text-red-400"
                }`}
              >
                {state.message}
              </motion.div>
            )}

            <SubmitButton />
          </form>
          </div>

          <p className="mt-5 text-center text-sm text-gray-500">
            Already have an account?{" "}
            <Link href="/login" className="text-blue-500 hover:text-blue-400 transition-colors font-medium">
              Sign in
            </Link>
          </p>

          <div className="mt-6 pt-4 border-t border-white/5 text-center">
              <p className="text-[10px] text-gray-700 font-mono">
                SECURE API GATEWAY • 256-BIT ENCRYPTION • SOC 2 COMPLIANT
              </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
