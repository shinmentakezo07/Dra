import { motion } from "framer-motion";
import { Search, Home, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505] px-4">
      {/* Animated Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px] opacity-30" />
      
      {/* Glowing Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px]" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 max-w-2xl w-full text-center"
      >
        {/* 404 Display */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <div className="relative inline-block">
            <h1 className="text-[150px] md:text-[200px] font-black text-white leading-none tracking-tighter">
              404
            </h1>
            <div className="absolute inset-0 text-[150px] md:text-[200px] font-black leading-none tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-blue-500 opacity-70 blur-[2px]">
              404
            </div>
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mb-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-gray-300 text-xs font-mono mb-6">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            ERROR.404_PAGE_NOT_FOUND
          </div>
          
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">
            Page Not Found
          </h2>
          
          <p className="text-gray-400 text-lg mb-8 max-w-md mx-auto">
            The page you're looking for doesn't exist or has been moved to another location.
          </p>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white text-black font-medium hover:bg-gray-100 transition-all shadow-lg hover:shadow-xl"
          >
            <Home className="w-4 h-4" />
            Go Home
          </Link>
          
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-medium hover:bg-white/10 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
        </motion.div>
        
        {/* Decorative Elements */}
        <div className="mt-16 grid grid-cols-3 gap-4 max-w-md mx-auto opacity-20">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-1 bg-gradient-to-r from-transparent via-white to-transparent rounded-full"
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
