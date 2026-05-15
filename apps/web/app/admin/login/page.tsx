"use client";

import { useActionState, useState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { authenticateAdmin } from "@/app/lib/actions";
import { motion } from "framer-motion";
import Link from "next/link";
import { Mail, Lock, Loader2, Eye, EyeOff, AlertCircle, ArrowLeft, Shield } from "lucide-react";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full h-9 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold rounded-lg hover:from-amber-600 hover:to-orange-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_30px_rgba(245,158,11,0.5)] text-sm"
    >
      {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign In to Admin"}
    </button>
  );
}

export default function AdminLoginPage() {
  const [errorMessage, dispatch] = useActionState(authenticateAdmin, undefined);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  return (
    <div className="min-h-screen flex bg-[#050505] selection:bg-amber-500/30 selection:text-white">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[#000000]">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-600/10 via-transparent to-orange-600/10" />
        {/* Animated Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
        
        {/* Decorative Elements */}
        <div className="absolute top-10 left-10 w-20 h-20 border-t-2 border-l-2 border-white/10 rounded-tl-3xl" />
        <div className="absolute bottom-10 right-10 w-20 h-20 border-b-2 border-r-2 border-white/10 rounded-br-3xl" />
        
        <div className="relative z-10 flex flex-col justify-between p-16 w-full h-full">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold tracking-tighter text-white flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="w-3 h-3 bg-amber-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
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
          
          <div className="max-w-lg">
             <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-gray-300 text-xs font-mono mb-4 backdrop-blur-md">
                <Shield className="w-3 h-3 text-amber-500" />
                ADMIN_CONSOLE_V3.0
             </div>
            <blockquote className="text-2xl font-medium text-white leading-relaxed mb-5 tracking-tight">
              &quot;Secure administration. Monitor, manage, and optimize your AI gateway.&quot;
            </blockquote>
            <div className="flex items-center gap-4 p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm w-fit">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 p-[1px]">
                 <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
                    <Shield className="w-4 h-4 text-amber-500" />
                 </div>
              </div>
              <div>
                <p className="text-white font-bold text-sm">Admin Portal</p>
                <p className="text-gray-400 text-xs font-mono">RESTRICTED ACCESS</p>
              </div>
            </div>
          </div>
          
          <div className="flex justify-between items-end text-xs font-mono text-gray-600">
             <span>EST. 2026</span>
             <span>SECURE • AUDITED • MONITORED</span>
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative">
         {/* Mobile Background Texture */}
         <div className="absolute inset-0 lg:hidden bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.08),transparent_40%)]" />

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[400px] relative z-10"
        >
          {/* Mobile Logo */}
          <div className="lg:hidden mb-6 flex items-center justify-between">
            <Link href="/" className="text-xl font-bold text-white flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
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
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-5 h-5 text-amber-500" />
              <h1 className="text-2xl font-bold text-white tracking-tight">Admin Console</h1>
            </div>
            <p className="text-gray-400 text-sm">Restricted access for authorized administrators only.</p>
          
            <form action={dispatch} className="space-y-3.5 mt-5">
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-xs font-mono font-medium text-gray-400 uppercase">
                  Email Address
                </label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-amber-500 transition-colors" />
                  <input
                    ref={emailRef}
                    id="email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@company.com"
                    required
                    autoComplete="email"
                    className="w-full h-10 pl-10 pr-4 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-gray-600 focus:outline-none focus:border-amber-500 focus:bg-white/10 transition-all text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="text-xs font-mono font-medium text-gray-400 uppercase">
                  Password
                </label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-amber-500 transition-colors" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    autoComplete="current-password"
                    className="w-full h-10 pl-10 pr-10 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-gray-600 focus:outline-none focus:border-amber-500 focus:bg-white/10 transition-all text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {errorMessage && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-mono"
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {errorMessage}
                </motion.div>
              )}

              <SubmitButton />
            </form>
          </div>

          <p className="mt-5 text-center text-sm text-gray-500">
            Not an admin?{" "}
            <Link href="/login" className="text-amber-500 hover:text-amber-400 transition-colors font-medium">
              User Login
            </Link>
          </p>

          <div className="mt-6 pt-4 border-t border-white/5 text-center">
              <p className="text-[10px] text-gray-700 font-mono">
                RESTRICTED ACCESS • AUDIT LOGGED • UNAUTHORIZED ENTRY PROHIBITED
              </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
