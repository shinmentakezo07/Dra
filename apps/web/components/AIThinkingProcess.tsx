"use client";

import { motion } from "framer-motion";
import { Brain, Sparkles, GitBranch, Terminal } from "lucide-react";

export const AIThinkingProcess = ({ steps }: { steps: { title: string; status: 'pending' | 'active' | 'completed' }[] }) => {
  return (
    <div className="space-y-4 p-4 rounded-lg bg-black/20 border border-white/5">
      <div className="flex items-center gap-2 text-xs font-mono text-violet-400 mb-3 uppercase tracking-wider">
        <Brain className="w-3 h-3" />
        Neural Processing
      </div>
      <div className="space-y-3">
        {steps.map((step, idx) => (
          <div key={idx} className="flex items-start gap-3">
            <div className="relative mt-1">
              <div className={`w-2 h-2 rounded-full ${
                step.status === 'completed' ? 'bg-green-500' :
                step.status === 'active' ? 'bg-violet-500 animate-pulse' :
                'bg-gray-700'
              }`} />
              {idx !== steps.length - 1 && (
                <div className="absolute top-2 left-[3px] w-[1px] h-full bg-white/5" />
              )}
            </div>
            <div className="flex-1">
              <p className={`text-xs font-mono ${
                step.status === 'active' ? 'text-white' : 
                step.status === 'completed' ? 'text-gray-400' : 
                'text-gray-600'
              }`}>
                {step.title}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
