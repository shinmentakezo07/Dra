"use client";

import { motion } from "framer-motion";
import { Lock, Shield, Activity, Globe } from "lucide-react";
import { Section } from "@/components/docs/Section";

export default function SecurityPage() {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}
    >
      <Section id="security" icon={Lock} title="Security">
        <p>
          Security is built into every layer of Yapapa. All data in transit is encrypted via TLS. API keys are hashed using bcrypt before storage.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          {[
            { title: "Encryption in Transit", desc: "TLS 1.3 for all API endpoints", icon: Lock },
            { title: "Key Hashing", desc: "bcrypt hashing for all stored API keys", icon: Shield },
            { title: "Rate Limiting", desc: "Per-user sliding window rate limits", icon: Activity },
            { title: "CORS Protection", desc: "Strict CORS policy with allowed origins", icon: Globe },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-3 p-4 rounded-xl bg-white/[0.01] border border-white/[0.05]">
              <item.icon className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-white font-semibold text-sm">{item.title}</h3>
                <p className="text-xs text-white/30 mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </motion.div>
  );
}
