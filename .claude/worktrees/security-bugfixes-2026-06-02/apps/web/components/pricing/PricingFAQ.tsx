"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HelpCircle,
  Mail,
  ArrowRight,
  ChevronDown,
  Coins,
  Zap,
  CreditCard,
  ListFilter,
} from "lucide-react";
import { pricingFAQ } from "@/lib/pricing-data";

const FAQ_CATEGORIES = [
  { label: "All", filter: null, icon: ListFilter },
  { label: "Credits", filter: "credits", icon: Coins },
  { label: "Models", filter: "models", icon: Zap },
  { label: "Billing", filter: "billing", icon: CreditCard },
];

const FAQ_WITH_CATEGORIES = pricingFAQ.map((item) => {
  const q = item.question.toLowerCase();
  let category = "billing";
  if (
    q.includes("credit") ||
    q.includes("expire") ||
    q.includes("free tier") ||
    q.includes("run out")
  )
    category = "credits";
  else if (q.includes("model") || q.includes("switch")) category = "models";
  return { ...item, category };
});

function FAQItem({
  item,
  index,
}: {
  item: (typeof pricingFAQ)[0] & { category: string };
  index: number;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{
        delay: index * 0.07,
        duration: 0.5,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <motion.div
        animate={isOpen ? { scale: 1.005 } : { scale: 1 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="relative rounded-2xl overflow-hidden"
      >
        <div
          className={`absolute inset-0 rounded-2xl transition-opacity duration-500 ${
            isOpen ? "opacity-100" : "opacity-0"
          }`}
          style={{
            padding: "1px",
            background:
              "linear-gradient(135deg, rgba(139,92,246,0.5), rgba(236,72,153,0.3), rgba(139,92,246,0.1))",
            WebkitMask:
              "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            WebkitMaskComposite: "xor",
            maskComposite: "exclude",
          }}
        />

        <div
          className={`relative rounded-2xl backdrop-blur-xl border transition-all duration-500 ${
            isOpen
              ? "bg-violet-500/[0.06] border-violet-500/20 shadow-[0_0_40px_-12px_rgba(139,92,246,0.15)]"
              : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.1]"
          }`}
        >
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="w-full text-left flex items-center gap-4 p-5 md:p-6 cursor-pointer"
            aria-expanded={isOpen}
          >
            <span
              className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold font-mono transition-all duration-500 ${
                isOpen
                  ? "bg-gradient-to-br from-violet-500/30 to-fuchsia-500/20 text-violet-300 shadow-[0_0_12px_-4px_rgba(139,92,246,0.4)]"
                  : "bg-white/[0.04] text-gray-600"
              }`}
            >
              {String(index + 1).padStart(2, "0")}
            </span>

            <span className="flex-1 text-[15px] font-medium text-gray-200 leading-snug">
              {item.question}
            </span>

            <motion.div
              animate={{ rotate: isOpen ? 180 : 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-300 ${
                isOpen ? "bg-violet-500/15" : "bg-white/[0.04]"
              }`}
            >
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </motion.div>
          </button>

          <AnimatePresence initial={false}>
            {isOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="px-5 md:px-6 pb-6 pt-0">
                  <div className="ml-13 pl-5 border-l-2 border-violet-500/30">
                    <p className="text-sm text-gray-400/90 leading-relaxed max-w-lg">
                      {item.answer}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function PricingFAQ() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filtered = activeCategory
    ? FAQ_WITH_CATEGORIES.filter((item) => item.category === activeCategory)
    : FAQ_WITH_CATEGORIES;

  return (
    <section className="relative w-full py-24 md:py-32 px-4 bg-[#000000] overflow-hidden">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{
            x: [0, 60, -30, 0],
            y: [0, -40, 30, 0],
            scale: [1, 1.15, 0.95, 1],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-violet-600/[0.06] rounded-full blur-[120px]"
        />
        <motion.div
          animate={{
            x: [0, -50, 40, 0],
            y: [0, 50, -20, 0],
            scale: [1, 1.1, 0.9, 1],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-fuchsia-600/[0.04] rounded-full blur-[100px]"
        />
        <motion.div
          animate={{
            x: [0, 30, -20, 0],
            y: [0, -20, 40, 0],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/[0.03] rounded-full blur-[140px]"
        />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12 md:mb-16">
          <div>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-violet-500/10 to-fuchsia-500/5 border border-violet-500/20 backdrop-blur-sm mb-5"
            >
              <HelpCircle className="w-3.5 h-3.5 text-violet-400" />
              <span className="text-[10px] font-mono font-bold tracking-[0.2em] uppercase text-violet-300">
                FAQ
              </span>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.1]"
            >
              Got{" "}
              <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
                questions?
              </span>
              <br />
              <span className="text-gray-500 text-3xl md:text-4xl lg:text-5xl">
                We've got answers.
              </span>
            </motion.h2>
          </div>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 }}
            className="text-sm text-gray-500 max-w-xs md:text-right md:pb-2"
          >
            Everything you need to know about pricing, credits, and models.
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-2 mb-10 flex-wrap"
        >
          {FAQ_CATEGORIES.map((cat) => {
            const isActive = cat.filter === activeCategory;
            const Icon = cat.icon;
            return (
              <motion.button
                key={cat.label}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setActiveCategory(cat.filter)}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium transition-all duration-300 cursor-pointer ${
                  isActive
                    ? "bg-gradient-to-r from-violet-500/20 to-fuchsia-500/10 text-violet-200 border border-violet-500/30 shadow-[0_0_20px_-6px_rgba(139,92,246,0.3)]"
                    : "bg-white/[0.02] text-gray-500 border border-white/[0.06] hover:text-gray-300 hover:border-white/[0.12] hover:bg-white/[0.04]"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {cat.label}
              </motion.button>
            );
          })}
        </motion.div>

        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          <div className="flex-1 space-y-3">
            <AnimatePresence mode="popLayout">
              {filtered.map((item, i) => (
                <FAQItem key={item.question} item={item} index={i} />
              ))}
            </AnimatePresence>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="lg:w-72 lg:shrink-0"
          >
            <div className="lg:sticky lg:top-8">
              <div className="relative rounded-2xl overflow-hidden">
                <div
                  className="absolute inset-0 rounded-2xl"
                  style={{
                    padding: "1px",
                    background:
                      "linear-gradient(180deg, rgba(139,92,246,0.3), rgba(236,72,153,0.1), rgba(139,92,246,0.05))",
                    WebkitMask:
                      "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                    WebkitMaskComposite: "xor",
                    maskComposite: "exclude",
                  }}
                />
                <div className="relative rounded-2xl backdrop-blur-xl bg-white/[0.02] border border-white/[0.06] p-6">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/10 flex items-center justify-center mb-4">
                    <Mail className="w-5 h-5 text-violet-400" />
                  </div>
                  <h3 className="text-base font-semibold text-white mb-2">
                    Still have questions?
                  </h3>
                  <p className="text-sm text-gray-500 leading-relaxed mb-5">
                    Can't find what you're looking for? Our team is here to
                    help.
                  </p>
                  <a
                    href="mailto:support@yapapa.dev"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-medium cursor-pointer hover:from-violet-500 hover:to-fuchsia-500 transition-all duration-300 shadow-[0_0_20px_-6px_rgba(139,92,246,0.4)] hover:shadow-[0_0_30px_-6px_rgba(139,92,246,0.5)]"
                  >
                    Contact support
                    <ArrowRight className="w-4 h-4" />
                  </a>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 lg:grid-cols-1 gap-3">
                <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4">
                  <p className="text-2xl font-bold text-white mb-0.5">100+</p>
                  <p className="text-xs text-gray-500">Models available</p>
                </div>
                <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4">
                  <p className="text-2xl font-bold text-white mb-0.5">$0.001</p>
                  <p className="text-xs text-gray-500">Starting per credit</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
