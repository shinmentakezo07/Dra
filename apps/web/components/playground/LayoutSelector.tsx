"use client";

import { Layout, Columns, Maximize2 } from "lucide-react";
import { useState } from "react";

export type LayoutMode = "vertical" | "horizontal" | "editor-focus" | "terminal-focus";

interface LayoutSelectorProps {
  currentLayout: LayoutMode;
  onLayoutChange: (layout: LayoutMode) => void;
}

export default function LayoutSelector({ currentLayout, onLayoutChange }: LayoutSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const layouts: { value: LayoutMode; label: string; icon: any; description: string }[] = [
    { value: "vertical", label: "Vertical Split", icon: Columns, description: "Side by side" },
    { value: "horizontal", label: "Horizontal Split", icon: Layout, description: "Top and bottom" },
    { value: "editor-focus", label: "Editor Focus", icon: Maximize2, description: "Maximize editor" },
    { value: "terminal-focus", label: "Terminal Focus", icon: Maximize2, description: "Maximize terminal" }
  ];

  const currentLayoutData = layouts.find(l => l.value === currentLayout) || layouts[0];
  const Icon = currentLayoutData.icon;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-sm"
        title="Change Layout"
      >
        <Icon className="w-4 h-4" />
        <span className="hidden sm:inline">Layout</span>
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-64 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-2xl overflow-hidden z-50">
            {layouts.map((layout) => {
              const LayoutIcon = layout.icon;
              return (
                <button
                  key={layout.value}
                  onClick={() => {
                    onLayoutChange(layout.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-white/10 transition-colors text-left ${
                    currentLayout === layout.value ? 'bg-white/5 border-l-2 border-primary' : ''
                  }`}
                >
                  <LayoutIcon className={`w-4 h-4 mt-0.5 ${currentLayout === layout.value ? 'text-primary' : 'text-gray-400'}`} />
                  <div className="flex-1">
                    <div className={`text-sm font-medium ${currentLayout === layout.value ? 'text-primary' : 'text-white'}`}>
                      {layout.label}
                    </div>
                    <div className="text-xs text-gray-500">{layout.description}</div>
                  </div>
                  {currentLayout === layout.value && (
                    <div className="w-2 h-2 rounded-full bg-primary mt-1" />
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
