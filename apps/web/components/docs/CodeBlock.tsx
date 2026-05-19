"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { CheckCircle, Copy } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Syntax Highlighting Helpers                                        */
/* ------------------------------------------------------------------ */

export function highlightJson(code: string): JSX.Element {
  // Basic JSON/keyword highlighting via regex
  const parts: JSX.Element[] = [];
  const regex = /("(?:[^"\\]|\\.)*")\s*:|("(?:[^"\\]|\\.)*")|(\btrue\b|\bfalse\b|\bnull\b)|(\b\d+\.?\d*\b)|(\/\/.*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(code)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={key++}>{code.slice(lastIndex, match.index)}</span>);
    }
    if (match[1]) {
      // key
      parts.push(<span key={key++} className="text-sky-300">{match[1]}</span>);
      parts.push(<span key={key++}>:</span>);
    } else if (match[2]) {
      parts.push(<span key={key++} className="text-amber-200/90">{match[2]}</span>);
    } else if (match[3]) {
      parts.push(<span key={key++} className="text-purple-300">{match[3]}</span>);
    } else if (match[4]) {
      parts.push(<span key={key++} className="text-emerald-300">{match[4]}</span>);
    } else if (match[5]) {
      parts.push(<span key={key++} className="text-white/20 italic">{match[5]}</span>);
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < code.length) {
    parts.push(<span key={key++}>{code.slice(lastIndex)}</span>);
  }
  return <>{parts}</>;
}

export function highlightBash(code: string): JSX.Element {
  // Basic bash highlighting
  const parts: JSX.Element[] = [];
  const regex = /(^|\s)(curl|echo|export|cd|mkdir|npm|node|python|go)(?=\s|$)|("(?:[^"\\]|\\.)*")|(-[a-zA-Z]|--[a-zA-Z-]+)|((?:https?:\/\/|localhost)\S*)/gm;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(code)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={key++}>{code.slice(lastIndex, match.index)}</span>);
    }
    if (match[2]) {
      parts.push(<span key={key++} className="text-green-300 font-semibold">{match[2]}</span>);
    } else if (match[3]) {
      parts.push(<span key={key++} className="text-amber-200/90">{match[3]}</span>);
    } else if (match[4]) {
      parts.push(<span key={key++} className="text-blue-300">{match[4]}</span>);
    } else if (match[5]) {
      parts.push(<span key={key++} className="text-cyan-300 underline underline-offset-2 decoration-white/10">{match[5]}</span>);
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < code.length) {
    parts.push(<span key={key++}>{code.slice(lastIndex)}</span>);
  }
  return <>{parts}</>;
}

export function highlightPython(code: string): JSX.Element {
  const parts: JSX.Element[] = [];
  const regex = /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(\b(def|import|from|class|return|if|else|elif|for|while|print|try|except|as|with|in|not|and|or|True|False|None)\b)|(#.*)|(\b\d+\.?\d*\b)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(code)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={key++}>{code.slice(lastIndex, match.index)}</span>);
    }
    if (match[1]) {
      parts.push(<span key={key++} className="text-amber-200/90">{match[1]}</span>);
    } else if (match[2]) {
      parts.push(<span key={key++} className="text-purple-300 font-semibold">{match[2]}</span>);
    } else if (match[4]) {
      parts.push(<span key={key++} className="text-white/20 italic">{match[4]}</span>);
    } else if (match[5]) {
      parts.push(<span key={key++} className="text-emerald-300">{match[5]}</span>);
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < code.length) {
    parts.push(<span key={key++}>{code.slice(lastIndex)}</span>);
  }
  return <>{parts}</>;
}

export function highlightGo(code: string): JSX.Element {
  const parts: JSX.Element[] = [];
  const regex = /("(?:[^"\\]|\\.)*"|`[^`]*`)|(\b(func|package|import|return|if|else|for|range|var|type|struct|interface|map|chan|go|defer|select|case|switch|break|continue|nil|true|false|err|error|string|int|bool|float64|any)\b)|(\/\/.*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(code)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={key++}>{code.slice(lastIndex, match.index)}</span>);
    }
    if (match[1]) {
      parts.push(<span key={key++} className="text-amber-200/90">{match[1]}</span>);
    } else if (match[2]) {
      parts.push(<span key={key++} className="text-purple-300 font-semibold">{match[2]}</span>);
    } else if (match[4]) {
      parts.push(<span key={key++} className="text-white/20 italic">{match[4]}</span>);
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < code.length) {
    parts.push(<span key={key++}>{code.slice(lastIndex)}</span>);
  }
  return <>{parts}</>;
}

export function highlightJS(code: string): JSX.Element {
  const parts: JSX.Element[] = [];
  const regex = /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b(const|let|var|function|async|await|return|import|from|export|default|if|else|for|of|in|try|catch|throw|new|class|extends|this|typeof|instanceof|true|false|null|undefined|Promise|console|fetch)\b)|(\/\/.*)|(\b\d+\.?\d*\b)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(code)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={key++}>{code.slice(lastIndex, match.index)}</span>);
    }
    if (match[1]) {
      parts.push(<span key={key++} className="text-amber-200/90">{match[1]}</span>);
    } else if (match[2]) {
      parts.push(<span key={key++} className="text-purple-300 font-semibold">{match[2]}</span>);
    } else if (match[4]) {
      parts.push(<span key={key++} className="text-white/20 italic">{match[4]}</span>);
    } else if (match[5]) {
      parts.push(<span key={key++} className="text-emerald-300">{match[5]}</span>);
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < code.length) {
    parts.push(<span key={key++}>{code.slice(lastIndex)}</span>);
  }
  return <>{parts}</>;
}

export function getHighlighted(code: string, lang: string): JSX.Element | string {
  if (lang === "json" || lang === "bash" || lang === "curl") {
    if (lang === "bash") return highlightBash(code);
    if (lang === "curl") return highlightBash(code);
    return highlightJson(code);
  }
  if (lang === "javascript" || lang === "js") return highlightJS(code);
  if (lang === "python") return highlightPython(code);
  if (lang === "go") return highlightGo(code);
  return code;
}

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type Lang = "curl" | "js" | "python" | "go";

export interface CodeExample {
  curl: string;
  js: string;
  python: string;
  go: string;
}

export interface CodeBlockProps {
  code?: string;
  language?: string;
  examples?: CodeExample;
  title?: string;
}

/* ------------------------------------------------------------------ */
/*  Code Block with Language Tabs + Line Numbers                       */
/* ------------------------------------------------------------------ */

export const CodeBlock = ({
  code,
  language = "bash",
  examples,
  title,
}: CodeBlockProps) => {
  const [copied, setCopied] = useState(false);
  const [activeLang, setActiveLang] = useState<Lang>("curl");

  const displayCode =
    examples ? examples[activeLang] : code ?? "";

  const handleCopy = () => {
    navigator.clipboard.writeText(displayCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const langLabels: Record<Lang, string> = {
    curl: "cURL",
    js: "JavaScript",
    python: "Python",
    go: "Go",
  };

  const langMap: Record<string, string> = {
    curl: "curl",
    js: "javascript",
    python: "python",
    go: "go",
  };

  const lines = displayCode.split("\n");
  const lineNumWidth = String(lines.length).length;

  const highlightedCode = (() => {
    const langKey = examples ? langMap[activeLang] : language;
    return getHighlighted(displayCode, langKey);
  })();

  return (
    <motion.div
      layout
      className="relative group rounded-2xl overflow-hidden"
    >
      <div
        className="absolute inset-0 rounded-2xl opacity-60 group-hover:opacity-80 transition-opacity duration-500"
        style={{
          padding: "1px",
          background: "linear-gradient(135deg, rgba(139,92,246,0.3), rgba(236,72,153,0.15), rgba(139,92,246,0.05))",
          WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
        }}
      />

      <div className="relative rounded-2xl backdrop-blur-xl bg-[#0a0a0a]/80 border border-white/[0.06] overflow-hidden shadow-[0_8px_32px_-8px_rgba(0,0,0,0.4)] transition-all duration-300 group-hover:border-white/[0.1] group-hover:shadow-[0_8px_40px_-8px_rgba(139,92,246,0.1)]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.04] bg-white/[0.015]">
          <div className="flex items-center gap-2">
            {examples ? (
              (Object.keys(examples) as Lang[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setActiveLang(lang)}
                  className={`relative text-xs font-mono font-medium px-3 py-1.5 rounded-lg transition-all duration-200 cursor-pointer ${
                    activeLang === lang
                      ? "text-violet-300 bg-violet-500/10 shadow-sm"
                      : "text-white/35 hover:text-white/60 hover:bg-white/[0.03]"
                  }`}
                >
                  {activeLang === lang && (
                    <motion.div
                      layoutId="langTab"
                      className="absolute inset-0 rounded-lg bg-violet-500/10"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">{langLabels[lang]}</span>
                </button>
              ))
            ) : (
              <span className="text-xs font-mono font-medium text-white/30 uppercase tracking-wider">
                {language}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {title && (
              <span className="text-[11px] text-white/20 font-mono hidden sm:block">{title}</span>
            )}
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-[11px] font-mono text-white/40 hover:text-white/70 transition-all duration-200 cursor-pointer"
            >
              {copied ? (
                <motion.span
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  className="flex items-center gap-1.5"
                >
                  <CheckCircle className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </motion.span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </span>
              )}
            </button>
          </div>
        </div>
        {/* Code with line numbers */}
        <div className="flex">
          {/* Line numbers */}
          <div
            className="flex-shrink-0 text-right pr-4 pl-4 py-5 select-none font-mono text-[13px] leading-relaxed text-white/[0.08] border-r border-white/[0.03]"
            style={{ minWidth: `${lineNumWidth + 2}ch` }}
          >
            {lines.map((_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>
          {/* Code content */}
          <pre className="flex-1 p-5 overflow-x-auto font-mono text-[13px] leading-relaxed">
            <code className="text-green-400/85">
              {typeof highlightedCode === "string" ? displayCode : highlightedCode}
            </code>
          </pre>
        </div>
      </div>
    </motion.div>
  );
};
