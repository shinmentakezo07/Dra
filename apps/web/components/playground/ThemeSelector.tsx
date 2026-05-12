"use client";

import { Moon, Sun, Monitor, Sparkles } from "lucide-react";
import { useState } from "react";

export type EditorTheme = "vs-dark" | "vs-light" | "hc-black";

interface ThemeSelectorProps {
  currentTheme: EditorTheme;
  onThemeChange: (theme: EditorTheme) => void;
}

export default function ThemeSelector({ currentTheme, onThemeChange }: ThemeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const themes: { value: EditorTheme; label: string; icon: any }[] = [
    { value: "vs-dark", label: "Dark", icon: Moon },
    { value: "vs-light", label: "Light", icon: Sun },
    { value: "hc-black", label: "High Contrast", icon: Sparkles }
  ];

  const currentThemeData = themes.find(t => t.value === currentTheme) || themes[0];
  const Icon = currentThemeData.icon;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-sm"
        title="Change Theme"
      >
        <Icon className="w-4 h-4" />
        <span className="hidden sm:inline">{currentThemeData.label}</span>
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-48 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-2xl overflow-hidden z-50">
            {themes.map((theme) => {
              const ThemeIcon = theme.icon;
              return (
                <button
                  key={theme.value}
                  onClick={() => {
                    onThemeChange(theme.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/10 transition-colors text-left ${
                    currentTheme === theme.value ? 'bg-white/5 text-primary' : 'text-gray-300'
                  }`}
                >
                  <ThemeIcon className="w-4 h-4" />
                  <span className="text-sm">{theme.label}</span>
                  {currentTheme === theme.value && (
                    <div className="ml-auto w-2 h-2 rounded-full bg-primary" />
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
