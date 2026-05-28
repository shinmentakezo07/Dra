"use client";

import Link from "next/link";
import {
  motion,
  useScroll,
  useTransform,
  useMotionValue,
  useMotionTemplate,
  AnimatePresence,
} from "framer-motion";
import {
  ArrowRight,
  Play,
  CheckCircle,
  Activity,
  Sparkles,
  Cpu,
  Globe,
  Zap,
  Layers,
  X,
  Terminal as TerminalIcon,
  Command,
  Hash,
} from "lucide-react";
import { useRef, useEffect, useState } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// --- Utils ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Icons ---
const ReactIcon = (props: any) => (
  <svg viewBox="-10.5 -9.45 21 18.9" fill="currentColor" {...props}>
    <circle cx="0" cy="0" r="2" fill="currentColor" />
    <g stroke="currentColor" strokeWidth="1" fill="none">
      <ellipse rx="10" ry="4.5" />
      <ellipse rx="10" ry="4.5" transform="rotate(60)" />
      <ellipse rx="10" ry="4.5" transform="rotate(120)" />
    </g>
  </svg>
);

const JavaScriptIcon = (props: any) => (
  <svg viewBox="0 0 48 48" fill="currentColor" {...props}>
    <path d="M0 0h48v48H0z" fill="transparent" />
    <path d="M6 6h36v36H6z" fill="currentColor" fillOpacity="0.1" />
    <text
      x="24"
      y="34"
      fontFamily="monospace"
      fontSize="24"
      fontWeight="bold"
      fill="currentColor"
      textAnchor="middle"
    >
      JS
    </text>
  </svg>
);

const TypeScriptIcon = (props: any) => (
  <svg viewBox="0 0 48 48" fill="currentColor" {...props}>
    <path d="M0 0h48v48H0z" fill="transparent" />
    <path d="M6 6h36v36H6z" fill="currentColor" fillOpacity="0.1" />
    <text
      x="24"
      y="34"
      fontFamily="monospace"
      fontSize="24"
      fontWeight="bold"
      fill="currentColor"
      textAnchor="middle"
    >
      TS
    </text>
  </svg>
);

const PythonIcon = (props: any) => (
  <svg viewBox="0 0 48 48" fill="currentColor" {...props}>
    <path
      d="M24 2C14 2 14 10 14 10h10v4h-14c-6 0-6 10-6 10s0 10 6 10h4v-4h-4v-6h12v6h-4v4h10c6 0 6-10 6-10s0-10-6-10h-4v4h4v6h-12v-6h4v-4h-10c-6 0-6-10-6-10z"
      fill="currentColor"
      fillOpacity="0.2"
    />
    <text
      x="24"
      y="34"
      fontFamily="monospace"
      fontSize="24"
      fontWeight="bold"
      fill="currentColor"
      textAnchor="middle"
    >
      PY
    </text>
  </svg>
);

const HtmlIcon = (props: any) => (
  <svg viewBox="0 0 48 48" fill="currentColor" {...props}>
    <path d="M8 4h32l-4 36-12 4-12-4z" fill="currentColor" fillOpacity="0.1" />
    <text
      x="24"
      y="34"
      fontFamily="monospace"
      fontSize="18"
      fontWeight="bold"
      fill="currentColor"
      textAnchor="middle"
    >
      HTML
    </text>
  </svg>
);

const CssIcon = (props: any) => (
  <svg viewBox="0 0 48 48" fill="currentColor" {...props}>
    <path d="M8 4h32l-4 36-12 4-12-4z" fill="currentColor" fillOpacity="0.1" />
    <text
      x="24"
      y="34"
      fontFamily="monospace"
      fontSize="18"
      fontWeight="bold"
      fill="currentColor"
      textAnchor="middle"
    >
      CSS
    </text>
  </svg>
);

const JavaIcon = (props: any) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path
      d="M4.5 18.5C4.5 18.5 7.5 21 12 21C16.5 21 19.5 18.5 19.5 18.5"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M6.5 15.5C6.5 15.5 8.5 17 12 17C15.5 17 17.5 15.5 17.5 15.5"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M12 3V12"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

const CppIcon = (props: any) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path
      d="M6 8L2 12L6 16M18 8L22 12L18 16M14.5 4L9.5 20"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <text x="18" y="22" fontSize="10" fontWeight="bold" fill="currentColor">
      ++
    </text>
  </svg>
);

const RustIcon = (props: any) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
    <path d="M12 6V18M6 12H18" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

const GoIcon = (props: any) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <text
      x="12"
      y="16"
      fontSize="14"
      fontWeight="bold"
      fill="currentColor"
      textAnchor="middle"
    >
      GO
    </text>
  </svg>
);

const RubyIcon = (props: any) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path
      d="M6 3L2 9L12 21L22 9L18 3H6Z"
      stroke="currentColor"
      strokeWidth="1.5"
      fill="none"
    />
  </svg>
);

const SwiftIcon = (props: any) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path
      d="M4 4C8 4 8 10 14 10C20 10 21 5 21 5C21 5 20 14 15 17C10 20 4 18 4 18"
      stroke="currentColor"
      strokeWidth="1.5"
      fill="none"
    />
  </svg>
);

const PhpIcon = (props: any) => (
  <svg viewBox="0 0 48 48" fill="currentColor" {...props}>
    <text
      x="24"
      y="30"
      fontFamily="monospace"
      fontSize="16"
      fontWeight="bold"
      fill="currentColor"
      textAnchor="middle"
    >
      PHP
    </text>
  </svg>
);

const DockerIcon = (props: any) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path
      d="M2 14H5V11H2V14ZM6 14H9V11H6V14ZM10 14H13V11H10V14ZM14 14H17V11H14V14ZM6 10H9V7H6V10ZM10 10H13V7H10V10ZM14 10H17V7H14V10ZM10 6H13V3H10V6Z"
      fill="currentColor"
    />
    <path
      d="M2 16H22C22 16 21 21 12 21C3 21 2 16 2 16Z"
      fill="currentColor"
      fillOpacity="0.3"
    />
  </svg>
);

const GitIcon = (props: any) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <circle cx="6" cy="6" r="2" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="6" cy="18" r="2" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="18" cy="12" r="2" stroke="currentColor" strokeWidth="1.5" />
    <path d="M6 8V16M6 12H10L18 12" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

// --- Components ---

// Glitch Text Component
const GlitchText = ({
  text,
  className,
}: {
  text: string;
  className?: string;
}) => {
  return (
    <div className={cn("glitch-wrapper inline-block", className)}>
      <span
        className="glitch relative inline-block text-white"
        data-text={text}
      >
        {text}
      </span>
    </div>
  );
};

// HUD Overlay Component
const HUDOverlay = () => {
  return (
    <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Corner Brackets */}
      <div className="absolute top-10 left-10 w-16 h-16 border-l-2 border-t-2 border-white/10 rounded-tl-2xl" />
      <div className="absolute top-10 right-10 w-16 h-16 border-r-2 border-t-2 border-white/10 rounded-tr-2xl" />
      <div className="absolute bottom-10 left-10 w-16 h-16 border-l-2 border-b-2 border-white/10 rounded-bl-2xl" />
      <div className="absolute bottom-10 right-10 w-16 h-16 border-r-2 border-b-2 border-white/10 rounded-br-2xl" />

      {/* Random Data Lines */}
      <div className="absolute top-1/3 left-8 w-[1px] h-24 bg-gradient-to-b from-transparent via-white/20 to-transparent hidden lg:block" />
      <div className="absolute bottom-1/3 right-8 w-[1px] h-24 bg-gradient-to-b from-transparent via-white/20 to-transparent hidden lg:block" />

      {/* Decorative Text */}
      <div className="absolute top-12 right-28 text-[10px] font-mono text-white/20 hidden lg:block tracking-widest">
        SYS.V.2.04 // CONNECTED
      </div>
      <div className="absolute bottom-12 left-28 text-[10px] font-mono text-white/20 hidden lg:block tracking-widest">
        COORDS: 45.124 / 99.002
      </div>
    </div>
  );
};

// Cyber Button
const CyberButton = ({
  children,
  className,
  onClick,
  primary = false,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  primary?: boolean;
}) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative group px-8 py-4 font-mono text-sm font-bold tracking-wider overflow-hidden",
        "clip-path-slant transition-all duration-300",
        primary ? "text-black" : "text-white",
        className,
      )}
    >
      {/* Background & Borders */}
      <div
        className={cn(
          "absolute inset-0 transition-all duration-300",
          primary
            ? "bg-white group-hover:bg-cyan-400"
            : "bg-white/5 border border-white/10 group-hover:border-white/30 group-hover:bg-white/10",
        )}
      />

      {/* Shine Effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-20 bg-gradient-to-r from-transparent via-white to-transparent -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />

      {/* Content */}
      <div className="relative z-10 flex items-center justify-center gap-2">
        {children}
      </div>

      {/* Corner Accents */}
      <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-current opacity-50" />
      <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-current opacity-50" />
    </button>
  );
};

// --- Typewriter ---
function TypewriterText({
  text,
  delay = 0,
  className,
}: {
  text: string;
  delay?: number;
  className?: string;
}) {
  const letters = Array.from(text);

  const container = {
    hidden: { opacity: 0 },
    visible: (i = 1) => ({
      opacity: 1,
      transition: { staggerChildren: 0.03, delayChildren: delay },
    }),
  };

  const child = {
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring" as const, damping: 12, stiffness: 200 },
    },
    hidden: {
      opacity: 0,
      y: 20,
      transition: { type: "spring" as const, damping: 12, stiffness: 200 },
    },
  };

  return (
    <motion.span
      variants={container}
      initial="hidden"
      animate="visible"
      className={`inline-block ${className}`}
    >
      {letters.map((letter, index) => (
        <motion.span
          variants={child}
          key={index}
          className="inline-block whitespace-pre"
        >
          {letter}
        </motion.span>
      ))}
    </motion.span>
  );
}

// --- Interactive Terminal ---
const codeSnippets = [
  {
    id: "curl",
    name: "curl-request.sh",
    language: "bash",
    icon: TerminalIcon,
    color: "text-green-400",
    code: `curl https://api.shinmen-takzo.ai/v1/chat/completions \\\n  -H "Authorization: Bearer sk-stz-..." \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "model": "gpt-4",\n    "messages": [\n      {"role": "user", "content": "Hello!"}\n    ]\n  }'\n\n# Response: 200 OK\n# Routed to: openai/gpt-4\n# Latency: 847ms`,
  },
  {
    id: "py",
    name: "openai-client.py",
    language: "python",
    icon: PythonIcon,
    color: "text-yellow-400",
    code: `from openai import OpenAI\n\nclient = OpenAI(\n    base_url="https://api.shinmen-takzo.ai/v1",\n    api_key="sk-stz-..."\n)\n\nresponse = client.chat.completions.create(\n    model="claude-opus-4",\n    messages=[{"role": "user", "content": "Hi"}]\n)\n\nprint(response.choices[0].message.content)`,
  },
  {
    id: "ts",
    name: "streaming.ts",
    language: "typescript",
    icon: TypeScriptIcon,
    color: "text-blue-400",
    code: `import OpenAI from 'openai';\n\nconst client = new OpenAI({\n  baseURL: 'https://api.shinmen-takzo.ai/v1',\n  apiKey: process.env.STZ_API_KEY\n});\n\nconst stream = await client.chat.completions.create({\n  model: 'gemini-2.0-flash',\n  messages: [{ role: 'user', content: 'Hello' }],\n  stream: true\n});\n\nfor await (const chunk of stream) {\n  process.stdout.write(chunk.choices[0]?.delta?.content || '');\n}`,
  },
];

function InteractiveTerminal() {
  const [activeTab, setActiveTab] = useState(0);
  const [isTyping, setIsTyping] = useState(true);
  const [displayedCode, setDisplayedCode] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    setIsTyping(true);
    setDisplayedCode("");
    setShowSuccess(false);
    let i = 0;
    const code = codeSnippets[activeTab].code;

    const interval = setInterval(() => {
      setDisplayedCode(code.substring(0, i));
      i++;
      if (i > code.length) {
        clearInterval(interval);
        setIsTyping(false);
        setTimeout(() => setShowSuccess(true), 500);
      }
    }, 20);

    return () => clearInterval(interval);
  }, [activeTab]);

  const ActiveIcon = codeSnippets[activeTab].icon;

  return (
    <div className="relative group perspective-1000 w-full max-w-lg mx-auto lg:mr-0 lg:ml-auto z-20">
      {/* Ambient Glow Behind */}
      <div className="absolute -inset-10 bg-gradient-to-r from-blue-600/30 via-purple-600/30 to-pink-600/30 rounded-[40px] blur-3xl opacity-40 group-hover:opacity-60 transition duration-1000 animate-pulse-slow"></div>

      <motion.div
        initial={{ rotateY: 15, rotateX: 5 }}
        whileHover={{ rotateY: 0, rotateX: 0 }}
        transition={{ type: "spring" as const, stiffness: 50 }}
        className="relative h-[420px] flex flex-col bg-[#0A0A0A]/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden ring-1 ring-white/5 transform-style-3d group-hover:border-white/20"
      >
        {/* Top Bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-black/40">
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-[#FF5F56]" />
            <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
            <div className="w-3 h-3 rounded-full bg-[#27C93F]" />
          </div>
          <div className="flex items-center gap-2 text-[10px] font-mono text-white/30">
            <TerminalIcon className="w-3 h-3" />
            <span>bash — 80x24</span>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="flex items-center px-2 bg-black/20 overflow-x-auto scrollbar-hide">
          {codeSnippets.map((snippet, index) => (
            <button
              key={snippet.id}
              onClick={() => setActiveTab(index)}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-mono transition-all relative ${
                activeTab === index
                  ? "text-white bg-white/5 border-t-2 border-primary"
                  : "text-muted-foreground hover:text-white hover:bg-white/5 border-t-2 border-transparent"
              }`}
            >
              <snippet.icon className="w-3 h-3" />
              {snippet.name}
            </button>
          ))}
        </div>

        {/* Code Area */}
        <div className="flex-1 p-6 font-mono text-sm leading-relaxed overflow-hidden relative bg-[#050505]">
          {/* Line Numbers */}
          <div className="absolute left-0 top-6 bottom-0 w-12 flex flex-col items-end pr-4 text-white/10 select-none text-xs leading-relaxed border-r border-white/5 bg-white/[0.01]">
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>

          <div className="pl-10 relative z-10">
            <pre
              className={`language-${codeSnippets[activeTab].language} ${codeSnippets[activeTab].color}`}
            >
              <code>{displayedCode}</code>
              {isTyping && (
                <motion.span
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ repeat: Infinity, duration: 0.8 }}
                  className="inline-block w-2 h-4 bg-primary align-middle ml-1 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                />
              )}
            </pre>
          </div>
        </div>

        {/* Status Bar */}
        <div className="px-4 py-1.5 border-t border-white/5 bg-black/40 flex items-center justify-between text-[10px] font-mono text-muted-foreground">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <GitIcon className="w-3 h-3" />
              <span>main*</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ActiveIcon className="w-3 h-3" />
              {codeSnippets[activeTab].language}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${isTyping ? "bg-yellow-500 animate-pulse" : "bg-green-500 shadow-[0_0_5px_#22c55e]"}`}
            />
            {isTyping ? "BUILDING..." : "READY"}
          </div>
        </div>

        {/* Floating Success Badge */}
        <AnimatePresence>
          {showSuccess && (
            <motion.div
              initial={{ scale: 0, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="absolute bottom-12 right-6 px-4 py-2 bg-green-900/80 border border-green-500/30 rounded backdrop-blur-md flex items-center gap-3 text-green-100 text-xs font-mono shadow-[0_0_20px_rgba(34,197,94,0.2)]"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-50"></div>
                <CheckCircle className="w-4 h-4 text-green-400 relative z-10" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold">BUILD SUCCESSFUL</span>
                <span className="text-[9px] opacity-70">Time: 1.42s</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Decorative Floating Elements */}
      <motion.div
        animate={{ y: [-10, 10, -10], rotate: [0, 10, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-6 -right-6 z-30 hidden md:block"
      >
        <div className="bg-black/80 p-3 rounded border border-white/10 shadow-2xl backdrop-blur-md">
          <Activity className="w-5 h-5 text-blue-400" />
        </div>
      </motion.div>

      <motion.div
        animate={{ y: [10, -10, 10], rotate: [0, -10, 0] }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1,
        }}
        className="absolute bottom-10 -left-6 z-30 hidden md:block"
      >
        <div className="bg-black/80 p-3 rounded border border-white/10 shadow-2xl backdrop-blur-md">
          <Command className="w-5 h-5 text-pink-400" />
        </div>
      </motion.div>
    </div>
  );
}

// --- Floating Logos Background ---
function FloatingLogos() {
  const icons = [
    {
      Icon: ReactIcon,
      color: "text-blue-400",
      size: 50,
      top: "10%",
      left: "5%",
      delay: 0,
    },
    {
      Icon: TypeScriptIcon,
      color: "text-blue-600",
      size: 45,
      top: "20%",
      right: "8%",
      delay: 1.5,
    },
    {
      Icon: JavaScriptIcon,
      color: "text-yellow-400",
      size: 50,
      top: "60%",
      left: "8%",
      delay: 3,
    },
    {
      Icon: PythonIcon,
      color: "text-green-500",
      size: 60,
      bottom: "15%",
      right: "12%",
      delay: 2,
    },
    {
      Icon: HtmlIcon,
      color: "text-orange-500",
      size: 40,
      top: "12%",
      right: "35%",
      delay: 4,
    },
    {
      Icon: CssIcon,
      color: "text-blue-300",
      size: 45,
      bottom: "25%",
      left: "15%",
      delay: 2.5,
    },
    {
      Icon: JavaIcon,
      color: "text-red-500",
      size: 50,
      top: "40%",
      left: "25%",
      delay: 1,
    },
    {
      Icon: CppIcon,
      color: "text-blue-500",
      size: 45,
      bottom: "40%",
      right: "25%",
      delay: 3.5,
    },
    {
      Icon: RustIcon,
      color: "text-orange-600",
      size: 40,
      top: "30%",
      left: "60%",
      delay: 0.5,
    },
    {
      Icon: GoIcon,
      color: "text-cyan-400",
      size: 55,
      bottom: "10%",
      left: "40%",
      delay: 2.2,
    },
    {
      Icon: RubyIcon,
      color: "text-red-600",
      size: 40,
      top: "80%",
      right: "5%",
      delay: 4.5,
    },
    {
      Icon: SwiftIcon,
      color: "text-orange-400",
      size: 45,
      top: "5%",
      left: "40%",
      delay: 1.8,
    },
    {
      Icon: PhpIcon,
      color: "text-indigo-400",
      size: 50,
      bottom: "50%",
      left: "5%",
      delay: 3.2,
    },
    {
      Icon: DockerIcon,
      color: "text-blue-500",
      size: 55,
      top: "50%",
      right: "45%",
      delay: 2.8,
    },
    {
      Icon: GitIcon,
      color: "text-red-500",
      size: 40,
      top: "15%",
      left: "80%",
      delay: 1.2,
    },
  ];

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {icons.map((item, i) => (
        <motion.div
          key={i}
          className={`absolute ${item.color} opacity-[0.05] blur-[0px] hover:opacity-30 hover:blur-0 transition-all duration-500`}
          style={{
            top: item.top,
            left: item.left,
            right: item.right,
            bottom: item.bottom,
            width: item.size,
            height: item.size,
          }}
          initial={{ y: 0, rotate: 0 }}
          animate={{
            y: [0, -30, 0],
            rotate: [0, 10, -10, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 8 + Math.random() * 6,
            repeat: Infinity,
            ease: "easeInOut",
            delay: item.delay,
          }}
        >
          <item.Icon className="w-full h-full" />
        </motion.div>
      ))}
    </div>
  );
}

// --- New Background Effect ---
function HeroBackground() {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  useEffect(() => {
    function handleMouseMove({
      clientX,
      clientY,
    }: {
      clientX: number;
      clientY: number;
    }) {
      mouseX.set(clientX);
      mouseY.set(clientY);
    }

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none bg-[#050505]">
      {/* Moving Grid */}
      <div className="absolute inset-0 perspective-1000">
        <motion.div
          animate={{ backgroundPosition: ["0px 0px", "0px 40px"] }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 bg-grid-white opacity-[0.15] transform-gpu rotate-x-12 scale-150 origin-top"
        />
      </div>

      {/* Dynamic Spotlights */}
      <motion.div
        className="absolute inset-0 opacity-40"
        style={{
          background: useMotionTemplate`
                        radial-gradient(
                            800px circle at ${mouseX}px ${mouseY}px,
                            rgba(59, 130, 246, 0.08),
                            transparent 80%
                        )
                    `,
        }}
      />

      {/* Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#000_100%)]" />

      {/* Floating Icons */}
      <FloatingLogos />
    </div>
  );
}

// --- Video Modal ---
function VideoModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/90 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative w-full max-w-5xl aspect-video bg-[#0A0A0A] rounded-2xl overflow-hidden border border-white/10 shadow-2xl"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white/70 hover:text-white hover:bg-white/20 transition-all z-10"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Placeholder Video Interface */}
            <div className="absolute inset-0 flex items-center justify-center bg-grid-white/[0.02]">
              <div className="text-center space-y-4">
                <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mx-auto ring-1 ring-white/10 relative group cursor-pointer hover:bg-white/10 transition-all">
                  <Play className="w-10 h-10 text-white/50 ml-1 group-hover:scale-110 transition-transform" />
                  <div className="absolute inset-0 rounded-full border border-white/20 animate-ping opacity-20" />
                </div>
                <p className="text-muted-foreground font-mono text-sm tracking-widest">
                  PREVIEW_V2.0.mp4
                </p>
              </div>
            </div>

            {/* Mock Progress Bar */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
              <motion.div
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 30, ease: "linear" }}
                className="h-full bg-primary"
              />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// --- Live Ticker ---
const updates = [
  "User @alex_dev just completed Python Basics",
  "New Badge Earned: Neural Architect",
  "500+ users currently online",
  "@sarah_codes deployed a new project",
  "Server capacity upgraded to 99.9%",
];

function LiveTicker() {
  const [index, setIndex] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % updates.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  if (!mounted) return null;

  return (
    <div className="fixed top-24 right-4 lg:right-8 z-40 pointer-events-none hidden sm:block">
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="px-3 py-1.5 rounded bg-[#0A0A0A]/80 backdrop-blur-md border border-white/10 flex items-center gap-2 text-xs font-mono text-muted-foreground shadow-lg"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          {updates[index]}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// === MAIN HERO COMPONENT ===
export function Hero() {
  const targetRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["start start", "end start"],
  });
  const [isVideoOpen, setIsVideoOpen] = useState(false);

  const y = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
    <>
      <VideoModal isOpen={isVideoOpen} onClose={() => setIsVideoOpen(false)} />
      <LiveTicker />

      <section
        ref={targetRef}
        className="w-full min-h-screen flex items-center relative px-4 pt-20 overflow-hidden bg-[#050505]"
      >
        <HeroBackground />
        <HUDOverlay />

        {/* Mobile Terminal Background */}
        <div className="absolute inset-0 z-0 flex items-center justify-center opacity-10 lg:hidden pointer-events-none">
          <div className="w-full max-w-[90%] scale-75 sm:scale-90">
            <InteractiveTerminal />
          </div>
        </div>

        {/* Hero Content */}
        <div className="max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-12 lg:gap-24 items-center relative z-10">
          {/* Left Content */}
          <motion.div
            style={{ opacity, y }}
            className="flex flex-col items-center lg:items-start text-center lg:text-left space-y-8"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="group inline-flex items-center gap-3 px-3 py-1.5 rounded bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all cursor-default hover:border-primary/50"
            >
              <div className="flex items-center gap-2 px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold">
                <Sparkles className="w-3 h-3" />
                NEW
              </div>
              <span className="text-xs font-mono text-gray-400 tracking-wide group-hover:text-white transition-colors">
                Pay-per-use pricing now live
              </span>
            </motion.div>

            {/* Animated Headline */}
            <div className="space-y-2">
              <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tighter leading-[0.9] text-white">
                <TypewriterText text="Universal" delay={0.3} /> <br />
                <GlitchText
                  text="LLM GATEWAY"
                  className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black"
                />
              </h1>
            </div>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 }}
              className="text-lg md:text-xl text-muted-foreground max-w-xl font-light leading-relaxed"
            >
              Access 100+ AI models through one unified API.
              <span className="text-white font-medium"> Pay per token</span>,
              <span className="text-white font-medium">
                {" "}
                transparent pricing
              </span>
              , and
              <span className="text-white font-medium">
                {" "}
                zero subscriptions
              </span>
              .
            </motion.p>

            {/* Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.4 }}
              className="flex flex-col sm:flex-row gap-6 w-full sm:w-auto pt-4"
            >
              <Link href="/signup" className="w-full sm:w-auto">
                <CyberButton primary className="w-full sm:w-auto">
                  Get API Key <ArrowRight className="w-4 h-4" />
                </CyberButton>
              </Link>

              <CyberButton
                onClick={() => setIsVideoOpen(true)}
                className="w-full sm:w-auto"
              >
                <Play className="w-4 h-4" /> View Demo
              </CyberButton>
            </motion.div>

            {/* Tech Stack / Trust */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.6 }}
              className="pt-12 flex flex-col sm:flex-row items-center gap-6 text-muted-foreground text-sm border-t border-white/5 w-full"
            >
              <span className="uppercase tracking-widest text-[10px] font-mono opacity-50">
                POWERED BY
              </span>
              <div className="flex gap-8 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
                {[Cpu, Globe, Zap, Layers].map((Icon, i) => (
                  <motion.div
                    key={i}
                    whileHover={{ scale: 1.2, color: "#fff" }}
                  >
                    <Icon className="w-6 h-6" />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>

          {/* Right Content (3D Graphic) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 1, type: "spring" as const }}
            className="relative hidden lg:block"
          >
            <InteractiveTerminal />
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: 1 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-muted-foreground/30"
        >
          <span className="text-[10px] font-mono uppercase tracking-widest">
            SCROLL_DOWN
          </span>
          <motion.div
            animate={{ height: [20, 40, 20], opacity: [0.2, 0.8, 0.2] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="w-[1px] bg-white"
          />
        </motion.div>
      </section>
    </>
  );
}
