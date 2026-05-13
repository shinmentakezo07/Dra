"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Header } from "@/components/Header";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { X, Home, BookOpen, Code2, Trophy, LogIn, UserPlus, Zap, ArrowRight, Settings, LogOut } from "lucide-react";
import { signOutAction } from "@/app/lib/actions";

interface MenuItem {
  label: string;
  href: string;
  icon: any;
  authRequired?: boolean;
}

export function MainLayout({ children, user }: { children: React.ReactNode, user?: any }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  
  // Check if we're on a dashboard route, auth route, or playground (full-screen)
  const isDashboardRoute = pathname?.startsWith('/dashboard');
  const isAuthRoute = pathname === '/login' || pathname === '/signup' || pathname === '/forgot-password';
  const isFullScreenRoute = pathname === '/playground';
  const isAdminRoute = pathname?.startsWith('/admin');

  const menuItems = [
    { label: 'Playground', href: '/playground', icon: Code2 },
    { label: 'Docs', href: '/docs', icon: BookOpen },
    { label: 'Dashboard', href: '/dashboard', icon: Trophy, authRequired: true },
  ];

  const sidebarVariants = {
    closed: { x: "-100%", opacity: 0 },
    open: { 
      x: 0, 
      opacity: 1,
      transition: { 
        type: "spring" as const, 
        stiffness: 300, 
        damping: 30,
        staggerChildren: 0.05,
        delayChildren: 0.1
      } 
    }
  };

  const itemVariants = {
    closed: { x: -20, opacity: 0 },
    open: { x: 0, opacity: 1 }
  };

  return (
    <div className="min-h-screen bg-background font-sans antialiased selection:bg-primary/30" suppressHydrationWarning>
        {!isDashboardRoute && !isAuthRoute && !isFullScreenRoute && !isAdminRoute && <Header onMenuClick={() => setSidebarOpen(true)} user={user} />}
        
        <AnimatePresence>
          {sidebarOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSidebarOpen(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60] md:hidden"
              />
              
              {/* Sidebar Panel */}
              <motion.div
                initial="closed"
                animate="open"
                exit="closed"
                variants={sidebarVariants}
                className="fixed top-0 bottom-0 left-0 w-[85%] max-w-[320px] bg-[#050505]/95 backdrop-blur-2xl border-r border-white/10 z-[70] md:hidden shadow-2xl flex flex-col"
              >
                {/* Sidebar Header */}
                <div className="p-5 flex items-center justify-between border-b border-white/5">
                  <Link href="/" onClick={() => setSidebarOpen(false)} className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 shadow-lg shadow-blue-500/20">
                        <Zap className="h-4 w-4 text-white fill-white" />
                    </div>
                    <span className="font-bold text-lg tracking-tight text-white">Yapapa</span>
                  </Link>
                  <button 
                    onClick={() => setSidebarOpen(false)}
                    className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Sidebar Content */}
                <div className="flex-1 overflow-y-auto py-6 px-4 space-y-6 hero-scroll">
                  <nav className="space-y-1">
                    <motion.div variants={itemVariants}>
                      <Link
                          href="/"
                          onClick={() => setSidebarOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-300 hover:text-[#3b82f6] hover:bg-[#3b82f6]/10 rounded-xl transition-colors border border-transparent hover:border-[#3b82f6]/20"
                      >
                          <Home className="w-5 h-5" />
                          Home
                      </Link>
                    </motion.div>
                    
                    <motion.div variants={itemVariants} className="pt-4 pb-2 px-4">
                        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                            <span className="w-1 h-1 rounded-full bg-[#3b82f6] shadow-[0_0_5px_#3b82f6]"></span>
                            Quick Access
                        </div>
                    </motion.div>
                    
                    {menuItems.filter(item => !item.authRequired || user).map((item) => (
                        <motion.div key={item.label} variants={itemVariants}>
                            <Link
                                href={item.href}
                                onClick={() => setSidebarOpen(false)}
                                className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-300 hover:text-[#3b82f6] hover:bg-[#3b82f6]/10 rounded-xl transition-colors border border-transparent hover:border-[#3b82f6]/20 group"
                            >
                                <item.icon className="w-5 h-5 text-gray-500 group-hover:text-[#3b82f6] transition-colors" />
                                {item.label}
                                <ArrowRight className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all text-[#3b82f6]" />
                            </Link>
                        </motion.div>
                    ))}
                  </nav>
                </div>

                {/* Sidebar Footer */}
                <div className="p-5 border-t border-[#3b82f6]/10 bg-[#3b82f6]/5">
                  {!user ? (
                    <div className="grid grid-cols-2 gap-3">
                        <Link 
                            href="/login"
                            onClick={() => setSidebarOpen(false)}
                            className="flex items-center justify-center gap-2 py-3 rounded-xl border border-[#3b82f6]/20 bg-[#3b82f6]/5 text-sm font-medium text-white hover:bg-[#3b82f6]/10 hover:border-[#3b82f6]/50 transition-colors"
                        >
                            <LogIn className="w-4 h-4" />
                            Log in
                        </Link>
                        <Link
                            href="/signup"
                            onClick={() => setSidebarOpen(false)}
                            className="flex items-center justify-center gap-2 py-3 rounded-xl bg-[#3b82f6]/10 border border-[#3b82f6]/20 text-[#3b82f6] text-sm font-medium hover:bg-[#3b82f6]/20 hover:border-[#3b82f6]/50 hover:shadow-[0_0_15px_rgba(59,130,246,0.2)] transition-all"
                        >
                            <UserPlus className="w-4 h-4" />
                            Sign up
                        </Link>
                    </div>
                  ) : (
                     <div className="space-y-3">
                         <div className="flex items-center gap-3 px-2 p-3 rounded-xl bg-[#3b82f6]/5 border border-[#3b82f6]/20">
                            <div className="relative w-10 h-10 rounded-full flex items-center justify-center overflow-hidden border border-[#3b82f6]/30">
                                <div className="absolute inset-0 bg-[#3b82f6]/20 animate-pulse" />
                                <span className="relative z-10 text-sm font-bold text-[#3b82f6] text-shadow-neon">
                                    {user.name ? user.name[0].toUpperCase() : "U"}
                                </span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-white truncate group-hover:text-[#3b82f6] transition-colors">{user.name}</p>
                                <p className="text-xs text-gray-500 truncate">{user.email}</p>
                            </div>
                         </div>
                         <Link
                            href="/dashboard/settings"
                            onClick={() => setSidebarOpen(false)}
                            className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-medium text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                         >
                             <Settings className="w-3.5 h-3.5" />
                             Settings
                         </Link>
                         <button 
                            onClick={() => {
                                setSidebarOpen(false);
                                signOutAction();
                            }}
                            className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                         >
                             <LogOut className="w-3.5 h-3.5" />
                             Sign Out
                         </button>
                     </div>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <div className={`flex ${isDashboardRoute || isAuthRoute || isFullScreenRoute ? '' : 'pt-20'}`}>
            <main className="flex-1 w-full min-w-0">
                {children}
            </main>
        </div>
    </div>
  );
}
