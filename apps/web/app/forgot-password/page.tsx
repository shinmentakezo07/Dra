"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { forgotPassword } from "@/app/lib/actions";
import { motion } from "framer-motion";
import Link from "next/link";
import { Mail, Loader2, ArrowLeft, CheckCircle } from "lucide-react";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full h-11 bg-white text-black font-medium rounded-lg hover:bg-gray-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
    >
      {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send Reset Link"}
    </button>
  );
}

export default function ForgotPasswordPage() {
  const [state, dispatch] = useActionState(forgotPassword, undefined);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505] px-4 selection:bg-violet-500/30 selection:text-white">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px] pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-br from-violet-600/5 via-transparent to-blue-600/5 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <Link href="/login" className="inline-flex items-center text-gray-400 hover:text-white mb-8 transition-colors text-sm font-mono group">
          <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          BACK_TO_LOGIN
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-3 tracking-tight">Reset Password</h1>
          <p className="text-gray-400">Enter your email to receive a password reset link.</p>
        </div>

        {state?.message && (
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3"
            >
                <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-emerald-400">{state.message}</p>
            </motion.div>
        )}

        <form action={dispatch} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="email" className="text-xs font-mono font-medium text-gray-400 uppercase">
              Email Address
            </label>
            <div className="relative group">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-violet-400 transition-colors" />
              <input
                id="email"
                name="email"
                type="email"
                placeholder="NAME@COMPANY.COM"
                required
                autoComplete="email"
                className="w-full h-12 pl-10 pr-4 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-gray-600 focus:outline-none focus:border-violet-500/50 focus:bg-white/10 transition-all text-sm font-mono"
              />
            </div>
          </div>

          <SubmitButton />
        </form>
      </motion.div>
    </div>
  );
}
