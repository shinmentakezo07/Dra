"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Editor from "@monaco-editor/react";
import { 
  Play, 
  Trash2, 
  Terminal as TerminalIcon,
  Loader2,
  Globe,
  Copy,
  Check,
  Download,
  RotateCcw,
  Maximize2,
  Minimize2,
  Clock,
  ChevronDown,
  Save,
  Upload,
  Share2,
  BookOpen,
  Settings,
  Palette,
  Layout,
  Sparkles,
  Zap,
  Code2,
  FileText,
  Star,
  BarChart3,
  Moon,
  Sun,
  Monitor,
  Columns,
  X
} from "lucide-react";
import Terminal from "./Terminal";
import { Terminal as XTerminal } from "@xterm/xterm";
import { Icons } from "../icons";
import ThemeSelector, { EditorTheme } from "./ThemeSelector";
import LayoutSelector, { LayoutMode } from "./LayoutSelector";
import SnippetsModal from "./SnippetsModal";
import { CodeSnippet } from "./CodeSnippets";
import ShareModal from "./ShareModal";
import PerformanceMetrics from "./PerformanceMetrics";
import { saveSession, loadSession, hasSession, AutoSaver } from "@/lib/playground-storage";

const LANGUAGES = {
  python: {
    name: "Python",
    pistonParams: { language: "python", version: "3.10.0" },
    defaultCode: `# Python Playground
def greet(name):
    print(f"Hello, {name}!")

greet("World")

# Calculate fibonacci
def fib(n):
    if n <= 1: return n
    return fib(n-1) + fib(n-2)

print(f"Fibonacci(10) = {fib(10)}")`,
    icon: <Icons.python className="w-5 h-5" />,
    mode: "python"
  },
  javascript: {
    name: "JavaScript",
    pistonParams: { language: "javascript", version: "18.15.0" },
    defaultCode: `// JavaScript Playground
console.log("Hello from Node.js!");

const numbers = [1, 2, 3, 4, 5];
const doubled = numbers.map(n => n * 2);
console.log("Doubled:", doubled);

// Async example
const delay = ms => new Promise(r => setTimeout(r, ms));
(async () => {
    console.log("Starting...");
    await delay(100);
    console.log("Done!");
})();`,
    icon: <Icons.javascript className="w-5 h-5" />,
    mode: "javascript"
  },
  typescript: {
    name: "TypeScript",
    pistonParams: { language: "typescript", version: "5.0.3" },
    defaultCode: `// TypeScript Playground
interface User {
    name: string;
    age: number;
}

function greet(user: User): string {
    return \`Hello, \${user.name}! You are \${user.age} years old.\`;
}

const user: User = { name: "Alice", age: 30 };
console.log(greet(user));`,
    icon: <Icons.typescript className="w-5 h-5" />,
    mode: "typescript"
  },
  html: {
    name: "HTML/CSS",
    pistonParams: null,
    defaultCode: `<!DOCTYPE html>
<html>
<head>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: system-ui, sans-serif; 
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }
    .card {
      background: rgba(255,255,255,0.1);
      backdrop-filter: blur(10px);
      border-radius: 16px;
      padding: 32px;
      text-align: center;
      border: 1px solid rgba(255,255,255,0.2);
    }
    h1 { margin-bottom: 16px; }
    button {
      padding: 12px 24px;
      background: #6366f1;
      border: none;
      border-radius: 8px;
      color: white;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s, background 0.2s;
    }
    button:hover { background: #4f46e5; transform: scale(1.05); }
  </style>
</head>
<body>
  <div class="card">
    <h1>Hello World!</h1>
    <p>Edit this code and click Run to see changes.</p>
    <br>
    <button onclick="alert('It works!')">Click Me</button>
  </div>
</body>
</html>`,
    icon: <Icons.html className="w-5 h-5" />,
    mode: "html"
  },
  c: {
    name: "C",
    pistonParams: { language: "c", version: "10.2.0" },
    defaultCode: `#include <stdio.h>

int factorial(int n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}

int main() {
    printf("Hello from C!\\n");
    printf("Factorial of 5 = %d\\n", factorial(5));
    return 0;
}`,
    icon: <Icons.c className="w-5 h-5" />,
    mode: "c"
  },
  cpp: {
    name: "C++",
    pistonParams: { language: "cpp", version: "10.2.0" },
    defaultCode: `#include <iostream>
#include <vector>
#include <algorithm>

int main() {
    std::cout << "Hello from C++!" << std::endl;
    
    std::vector<int> nums = {5, 2, 8, 1, 9};
    std::sort(nums.begin(), nums.end());
    
    std::cout << "Sorted: ";
    for (int n : nums) std::cout << n << " ";
    std::cout << std::endl;
    
    return 0;
}`,
    icon: <Icons.cpp className="w-5 h-5" />,
    mode: "cpp"
  },
  go: {
    name: "Go",
    pistonParams: { language: "go", version: "1.16.2" },
    defaultCode: `package main

import (
    "fmt"
    "strings"
)

func main() {
    fmt.Println("Hello from Go!")
    
    words := []string{"Hello", "Go", "World"}
    result := strings.Join(words, " ")
    fmt.Println(result)
}`,
    icon: <Icons.go className="w-5 h-5" />,
    mode: "go"
  },
  rust: {
    name: "Rust",
    pistonParams: { language: "rust", version: "1.68.2" },
    defaultCode: `fn main() {
    println!("Hello from Rust!");
    
    let numbers: Vec<i32> = (1..=5).collect();
    let sum: i32 = numbers.iter().sum();
    
    println!("Sum of 1-5: {}", sum);
}`,
    icon: <Icons.rust className="w-5 h-5" />,
    mode: "rust"
  },
  java: {
    name: "Java",
    pistonParams: { language: "java", version: "15.0.2" },
    defaultCode: `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello from Java!");
        
        int[] nums = {1, 2, 3, 4, 5};
        int sum = 0;
        for (int n : nums) sum += n;
        
        System.out.println("Sum: " + sum);
    }
}`,
    icon: <Icons.java className="w-5 h-5" />,
    mode: "java"
  }
};

type LanguageKey = keyof typeof LANGUAGES;

interface ExecutionResult {
  language: string;
  timestamp: Date;
  success: boolean;
  executionTime?: number;
}

export default function PlaygroundMain() {
  const [activeLang, setActiveLang] = useState<LanguageKey>("python");
  const [code, setCode] = useState(LANGUAGES["python"].defaultCode);
  const [isRunning, setIsRunning] = useState(false);
  const [iframeSrc, setIframeSrc] = useState("");
  const [mobileTab, setMobileTab] = useState<"editor" | "output">("editor");
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [executionHistory, setExecutionHistory] = useState<ExecutionResult[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  
  // New enhanced features
  const [editorTheme, setEditorTheme] = useState<EditorTheme>("vs-dark");
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("vertical");
  const [showSnippets, setShowSnippets] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [executionTimeMs, setExecutionTimeMs] = useState(0);
  
  const terminalRef = useRef<XTerminal | null>(null);
  const codeCache = useRef<Record<string, string>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const autoSaverRef = useRef<AutoSaver | null>(null);

  useEffect(() => {
    setIsMounted(true);
    
    // Load saved session on mount
    const savedSession = loadSession();
    if (savedSession && hasSession()) {
      const langKey = Object.keys(LANGUAGES).find(
        key => LANGUAGES[key as LanguageKey].name === savedSession.language
      ) as LanguageKey;
      
      if (langKey) {
        setActiveLang(langKey);
        setCode(savedSession.code);
        codeCache.current[langKey] = savedSession.code;
      }
    }
    
    // Initialize auto-saver
    autoSaverRef.current = new AutoSaver(() => {
      saveSession({
        language: LANGUAGES[activeLang].name,
        code,
        timestamp: Date.now()
      });
      setLastSaved(new Date());
    });
    
    return () => {
      autoSaverRef.current?.cancel();
    };
  }, []);
  
  // Auto-save on code change
  useEffect(() => {
    if (isMounted && code) {
      autoSaverRef.current?.schedule();
    }
  }, [code, isMounted, activeLang]);

  const handleLangChange = (lang: LanguageKey) => {
    codeCache.current[activeLang] = code;
    setActiveLang(lang);
    setCode(codeCache.current[lang] || LANGUAGES[lang].defaultCode);
    setIframeSrc("");
    setExecutionTimeMs(0);
    
    if (terminalRef.current) {
      terminalRef.current.reset();
      terminalRef.current.writeln('');
      terminalRef.current.writeln(`\x1b[1;36m→ Language switched to ${LANGUAGES[lang].name}\x1b[0m`);
      terminalRef.current.writeln(`\x1b[90mReady to execute. Press Run or Ctrl+Enter.\x1b[0m`);
      terminalRef.current.writeln('');
    }
  };

  const copyCode = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadCode = useCallback(() => {
    const extensions: Record<LanguageKey, string> = {
      python: 'py', javascript: 'js', typescript: 'ts', html: 'html',
      c: 'c', cpp: 'cpp', go: 'go', rust: 'rs', java: 'java'
    };
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `code.${extensions[activeLang]}`;
    a.click();
    URL.revokeObjectURL(url);
  }, [code, activeLang]);

  const resetCode = () => {
    setCode(LANGUAGES[activeLang].defaultCode);
    codeCache.current[activeLang] = LANGUAGES[activeLang].defaultCode;
    setExecutionTimeMs(0);
    setIframeSrc("");
    if (terminalRef.current) {
      terminalRef.current.reset();
      terminalRef.current.writeln('');
      terminalRef.current.writeln(`\x1b[1;33m↺ Code reset to default template\x1b[0m`);
      terminalRef.current.writeln(`\x1b[90mReady to execute.\x1b[0m`);
      terminalRef.current.writeln('');
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };
  
  const handleSnippetSelect = (snippet: CodeSnippet) => {
    setCode(snippet.code);
    codeCache.current[activeLang] = snippet.code;
  };

  const runCode = useCallback(async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    setMobileTab("output");
    const currentLang = LANGUAGES[activeLang];
    const startTime = Date.now();

    if (activeLang === "html") {
      setIframeSrc(code);
      setIsRunning(false);
      setExecutionHistory(prev => [...prev.slice(-9), {
        language: currentLang.name,
        timestamp: new Date(),
        success: true,
        executionTime: Date.now() - startTime
      }]);
      return;
    }

    // Wait a bit for terminal to be ready
    await new Promise(resolve => setTimeout(resolve, 100));

    if (terminalRef.current) {
      terminalRef.current.reset();
      terminalRef.current.writeln(`\x1b[1;33m⚡ Running ${currentLang.name}...\x1b[0m`);
      terminalRef.current.writeln('');
    } else {
      console.warn('Terminal not ready yet');
    }

    try {
      const response = await fetch("https://emkc.org/api/v2/piston/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: currentLang.pistonParams?.language,
          version: currentLang.pistonParams?.version,
          files: [{ content: code }]
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      const executionTime = Date.now() - startTime;
      setExecutionTimeMs(executionTime);
      
      if (terminalRef.current) {
        if (result.run) {
          const stdout = result.run.stdout || "";
          const stderr = result.run.stderr || "";
          
          if (stdout) {
            // Write output line by line with proper formatting
            const lines = stdout.split('\n');
            lines.forEach((line: string, index: number) => {
              if (terminalRef.current) {
                terminalRef.current.write(line);
                if (index < lines.length - 1) {
                  terminalRef.current.write('\r\n');
                }
              }
            });
          }
          
          if (stderr) {
            terminalRef.current.writeln('');
            terminalRef.current.writeln(`\x1b[1;31m${stderr.replace(/\n/g, '\r\n')}\x1b[0m`);
          }
          
          const exitCode = result.run.code;
          const statusColor = exitCode === 0 ? '32' : '31';
          const statusIcon = exitCode === 0 ? '✓' : '✗';
          
          terminalRef.current.writeln('');
          terminalRef.current.writeln('');
          terminalRef.current.writeln(`\x1b[1;${statusColor}m${statusIcon} Exit Code: ${exitCode}\x1b[0m \x1b[90m(Execution time: ${executionTime}ms)\x1b[0m`);
          
          setExecutionHistory(prev => [...prev.slice(-9), {
            language: currentLang.name,
            timestamp: new Date(),
            success: exitCode === 0,
            executionTime
          }]);
        } else {
          terminalRef.current.writeln(`\x1b[1;31m✗ Execution failed\x1b[0m`);
          if (result.message) {
            terminalRef.current.writeln(`\x1b[90m${result.message}\x1b[0m`);
          }
          console.error('Piston API error:', result);
        }
      } else {
        console.error('Terminal not available to display output');
      }
    } catch (error) {
      console.error('Code execution error:', error);
      if (terminalRef.current) {
        terminalRef.current.writeln('');
        terminalRef.current.writeln(`\x1b[1;31m✗ Error: ${error instanceof Error ? error.message : String(error)}\x1b[0m`);
        terminalRef.current.writeln(`\x1b[90mPlease check your internet connection or try again.\x1b[0m`);
      }
    } finally {
      setIsRunning(false);
    }
  }, [code, activeLang, isRunning]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        runCode();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        downloadCode();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [runCode, downloadCode]);

  if (!isMounted) return null;

  return (
    <>
      {/* Modals */}
      <SnippetsModal
        isOpen={showSnippets}
        onClose={() => setShowSnippets(false)}
        currentLanguage={LANGUAGES[activeLang].mode}
        onSelectSnippet={handleSnippetSelect}
      />
      <ShareModal
        isOpen={showShare}
        onClose={() => setShowShare(false)}
        code={code}
        language={LANGUAGES[activeLang].name}
      />
      
      <div 
        ref={containerRef}
        className="flex flex-col md:flex-row h-[calc(100vh-240px)] md:h-[calc(100vh-220px)] bg-[#0e0e0e] overflow-hidden rounded-2xl border border-white/10 relative shadow-2xl"
      >
      {/* Language Sidebar - Dark theme */}
      <div className="w-full md:w-20 bg-[#0A0A0A] border-b md:border-b-0 md:border-r border-white/10 flex flex-row md:flex-col items-center py-4 md:py-5 gap-3 z-10 overflow-x-auto px-3 md:px-0">
        {Object.entries(LANGUAGES).map(([key, lang]) => (
          <button
            key={key}
            onClick={() => handleLangChange(key as LanguageKey)}
            className={`relative p-3 rounded-xl transition-all shrink-0 ${
              activeLang === key 
                ? "bg-gradient-to-br from-blue-500 to-violet-600 text-white shadow-lg shadow-blue-500/30" 
                : "text-gray-500 hover:text-white hover:bg-white/10"
            }`}
            title={lang.name}
          >
            {lang.icon}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Dark Toolbar */}
        <div className="h-14 bg-[#0A0A0A] border-b border-white/10 flex items-center justify-between px-5 shrink-0">
          <div className="flex items-center gap-3">
            {/* Window Controls */}
            <div className="flex items-center gap-2 mr-4">
              <div className="w-3 h-3 rounded-full bg-red-500/50 hover:bg-red-500 transition-colors" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/50 hover:bg-yellow-500 transition-colors" />
              <div className="w-3 h-3 rounded-full bg-green-500/50 hover:bg-green-500 transition-colors" />
            </div>
            
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
              {LANGUAGES[activeLang].icon}
              <span className="text-sm font-semibold text-white">
                {LANGUAGES[activeLang].name}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Dark Tab Switcher */}
            <div className="flex md:hidden bg-white/5 border border-white/10 rounded-lg p-1 mr-2">
              <button
                onClick={() => setMobileTab("editor")}
                className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  mobileTab === "editor" ? "bg-gradient-to-r from-blue-500 to-violet-600 text-white shadow-sm" : "text-gray-400 hover:text-white"
                }`}
              >
                Code
              </button>
              <button
                onClick={() => setMobileTab("output")}
                className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  mobileTab === "output" ? "bg-gradient-to-r from-blue-500 to-violet-600 text-white shadow-sm" : "text-gray-400 hover:text-white"
                }`}
              >
                Output
              </button>
            </div>

            {/* New Feature Buttons */}
            <button 
              onClick={() => setShowSnippets(true)} 
              className="p-2 text-gray-500 hover:text-white hover:bg-white/10 rounded-lg transition-all hidden md:block" 
              title="Code Snippets"
            >
              <BookOpen className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setShowShare(true)} 
              className="p-2 text-gray-500 hover:text-white hover:bg-white/10 rounded-lg transition-all hidden sm:block" 
              title="Share Code"
            >
              <Share2 className="w-4 h-4" />
            </button>
            
            {/* Theme Selector */}
            <div className="hidden md:block">
              <ThemeSelector currentTheme={editorTheme} onThemeChange={setEditorTheme} />
            </div>
            
            {/* Layout Selector */}
            <div className="hidden lg:block">
              <LayoutSelector currentLayout={layoutMode} onLayoutChange={setLayoutMode} />
            </div>

            <div className="w-px h-6 bg-white/20 mx-2 hidden sm:block" />

            {/* Dark Action Buttons */}
            <button onClick={copyCode} className="p-2 text-gray-500 hover:text-white hover:bg-white/10 rounded-lg transition-all" title="Copy code">
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </button>
            <button onClick={downloadCode} className="p-2 text-gray-500 hover:text-white hover:bg-white/10 rounded-lg transition-all hidden sm:block" title="Download">
              <Download className="w-4 h-4" />
            </button>
            <button onClick={resetCode} className="p-2 text-gray-500 hover:text-white hover:bg-white/10 rounded-lg transition-all" title="Reset code">
              <RotateCcw className="w-4 h-4" />
            </button>
            <button onClick={toggleFullscreen} className="p-2 text-gray-500 hover:text-white hover:bg-white/10 rounded-lg transition-all hidden md:block" title="Fullscreen">
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            
            {/* History Dropdown */}
            <div className="relative hidden sm:block">
              <button 
                onClick={() => setShowHistory(!showHistory)}
                className="p-2 text-gray-500 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                title="History"
              >
                <Clock className="w-4 h-4" />
              </button>
              {showHistory && executionHistory.length > 0 && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-[#1a1a1a] border border-white/20 rounded-xl shadow-2xl z-50 py-2 backdrop-blur-xl">
                  <div className="px-3 py-2 border-b border-white/10 mb-1">
                    <span className="text-xs font-semibold text-gray-400 uppercase">Execution History</span>
                  </div>
                  {executionHistory.slice().reverse().map((item, i) => (
                    <div key={i} className="px-3 py-2 text-xs flex items-center justify-between hover:bg-white/5 transition-colors">
                      <span className="text-gray-300 font-medium">{item.language}</span>
                      <span className={`font-semibold ${item.success ? "text-green-400" : "text-red-400"}`}>
                        {item.executionTime}ms
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="w-px h-6 bg-white/20 mx-2 hidden sm:block" />
            
            {/* Cyber Run Button */}
            <button 
              onClick={runCode}
              disabled={isRunning}
              className="relative group/btn flex items-center gap-2 px-6 py-2 text-white text-sm font-bold font-mono tracking-wider rounded-lg transition-all disabled:opacity-50 overflow-hidden uppercase"
            >
              {/* Background */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-violet-600 group-hover/btn:from-blue-600 group-hover/btn:to-violet-700 transition-all duration-300 shadow-[0_0_20px_rgba(59,130,246,0.3)] group-hover/btn:shadow-[0_0_30px_rgba(59,130,246,0.5)]" />
              
              {/* Shine Effect */}
              <div className="absolute inset-0 opacity-0 group-hover/btn:opacity-20 bg-gradient-to-r from-transparent via-white to-transparent -skew-x-12 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700 ease-in-out" />
              
              <div className="relative z-10 flex items-center gap-2">
                {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                <span className="hidden sm:inline">Run</span>
              </div>
            </button>
          </div>
        </div>

        {/* Workspace */}
        <div className={`flex-1 flex overflow-hidden ${
          layoutMode === 'horizontal' ? 'flex-col' : 
          layoutMode === 'vertical' ? 'flex-col lg:flex-row' :
          layoutMode === 'editor-focus' ? 'flex-col lg:flex-row' :
          'flex-col lg:flex-row'
        }`}>
          {/* Editor - Dark theme */}
          <div className={`relative min-h-0 border-b lg:border-b-0 lg:border-r border-white/10 bg-[#050505]
            ${layoutMode === 'editor-focus' ? 'flex-[3]' : 
              layoutMode === 'terminal-focus' ? 'flex-[1]' :
              activeLang === 'html' ? 'lg:w-1/2' : 'lg:w-3/5'}
            ${mobileTab === 'editor' ? 'flex' : 'hidden lg:flex'}
            ${layoutMode === 'horizontal' ? 'border-b border-r-0' : ''}
          `}>
            <Editor
              height="100%"
              language={LANGUAGES[activeLang].mode}
              value={code}
              onChange={(val) => setCode(val || "")}
              theme={editorTheme}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                fontFamily: "'JetBrains Mono', 'Fira Code', 'Monaco', monospace",
                lineHeight: 1.6,
                padding: { top: 16 },
                scrollBeyondLastLine: false,
                smoothScrolling: true,
                cursorBlinking: "smooth",
                cursorSmoothCaretAnimation: "on",
                renderLineHighlight: "line",
                bracketPairColorization: { enabled: true },
                guides: { bracketPairs: true },
                wordWrap: "on",
              }}
            />
            {/* Keyboard shortcut hint */}
            <div className="absolute bottom-3 right-3 px-3 py-1.5 bg-black/80 backdrop-blur-sm rounded-lg text-[10px] text-gray-400 border border-white/10 hidden lg:block font-mono">
              Ctrl + Enter to run
            </div>
          </div>

          {/* Output / Preview - Dark theme */}
          <div className={`bg-[#0A0A0A] flex flex-col 
            ${layoutMode === 'terminal-focus' ? 'flex-[3]' : 
              layoutMode === 'editor-focus' ? 'flex-[1]' :
              activeLang === 'html' ? 'lg:w-1/2' : 'lg:w-2/5'}
            ${mobileTab === 'output' ? 'flex' : 'hidden lg:flex'}
          `}>
            {activeLang === 'html' ? (
              <div className="flex-1 bg-white w-full h-full relative">
                {iframeSrc ? (
                  <iframe 
                    srcDoc={iframeSrc}
                    className="w-full h-full border-none"
                    sandbox="allow-scripts allow-modals"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#0A0A0A]">
                    <div className="text-center text-gray-500">
                      <Globe className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">Click Run to preview</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="h-12 bg-[#0A0A0A] flex items-center justify-between px-4 border-b border-white/10 shrink-0">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                    <TerminalIcon className="w-4 h-4 text-green-400" />
                    <span className="text-xs font-semibold text-white">Output</span>
                  </div>
                  <button 
                    onClick={() => terminalRef.current?.clear()}
                    className="p-2 hover:bg-white/10 rounded-lg transition-all"
                    title="Clear"
                  >
                    <Trash2 className="w-4 h-4 text-gray-500 hover:text-white" />
                  </button>
                </div>
                <div className="flex-1 relative min-h-0">
                  <Terminal onMount={(term) => { terminalRef.current = term; }} />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Performance Metrics & Status Bar */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <PerformanceMetrics 
          executionTime={executionTimeMs} 
          linesOfCode={code.split('\n').length}
        />
        
        {lastSaved && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-400">
            <Save className="w-3 h-3" />
            <span>Auto-saved {new Date(lastSaved).toLocaleTimeString()}</span>
          </div>
        )}
      </div>
    </div>
    </>
  );
}
