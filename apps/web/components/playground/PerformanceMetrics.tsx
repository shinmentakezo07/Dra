"use client";

import { BarChart3, Clock, Zap, Activity } from "lucide-react";
import { useEffect, useState } from "react";

interface PerformanceMetricsProps {
  executionTime?: number;
  memoryUsage?: number;
  linesOfCode?: number;
}

export default function PerformanceMetrics({ 
  executionTime = 0, 
  memoryUsage = 0,
  linesOfCode = 0 
}: PerformanceMetricsProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (executionTime > 0) {
      setIsVisible(true);
    }
  }, [executionTime]);

  if (!isVisible) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-white/5 border border-white/10 rounded-lg">
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-blue-400" />
        <div>
          <div className="text-xs text-gray-500">Execution Time</div>
          <div className="text-sm font-mono font-bold text-white">
            {executionTime.toFixed(2)}ms
          </div>
        </div>
      </div>

      <div className="w-px h-8 bg-white/10" />

      <div className="flex items-center gap-2">
        <Activity className="w-4 h-4 text-green-400" />
        <div>
          <div className="text-xs text-gray-500">Lines</div>
          <div className="text-sm font-mono font-bold text-white">
            {linesOfCode}
          </div>
        </div>
      </div>

      <div className="w-px h-8 bg-white/10" />

      <div className="flex items-center gap-2">
        <Zap className="w-4 h-4 text-yellow-400" />
        <div>
          <div className="text-xs text-gray-500">Status</div>
          <div className="text-sm font-bold text-green-400">
            Ready
          </div>
        </div>
      </div>
    </div>
  );
}
